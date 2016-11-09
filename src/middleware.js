import Rx from 'rxjs';
import apiEnvChooser from './api';
import validate from './helpers/validator';
import { initializeEntityConfig } from './helpers/initializer';
import {
  serializeParseObject,
  deserializeParseObject,
  updateSerializedObject
} from './helpers/serializer';

export default (parse) => {
  const api = apiEnvChooser(parse);
  return (config = []) => store => next => action => {
    if (!action.meta) {
      return next(action);
    }

    const foundConfig = config.find(e => e.name === action.meta.entity);
    if (!foundConfig) {
      return next(action);
    }

    // Set nested includes pointers
    const setInnerPointers = (entity, includes, item) => {
      const entityConfig = initializeEntityConfig(config, entity);
      includes.forEach((include) => {
        const subEntity = entityConfig.mapPointersToFields.find(e => e.field === include.field);
        if (subEntity) {
          next({
            type: `SET_${subEntity.entity.toUpperCase()}S`,
            item: item[include.field]
          });
          if (include.includes && include.includes.length > 0) {
            setInnerPointers(subEntity.entity, include.includes, item[include.field]);
          }
        } else {
          console.log(`error mapPointToField not found for: ${include.field} in ${entity}`);
        }
      });
    };

    // status actions
    const setStatus = (status) => {
      next({
        type: `SET_${action.meta.entity.toUpperCase()}S_STATUS`,
        status
      });
    };

    // List actions
    const getAll = (observer) => {
      setStatus('loadingList');
      api(action.meta.entity)
        .getAll(action.meta.params)   // Get all api
        .subscribe(
          (items) => {
            const entityConfig = initializeEntityConfig(config, action.meta.entity);
            // Sent items to reducer
            const serializedItems = items.map((item) =>
              serializeParseObject(config, entityConfig, item)
            );
            next({
              type: `SET_${action.meta.entity.toUpperCase()}S`,
              items: serializedItems,
              clear: action.meta.clear
            });

            // Update pointer in their reducers
            if (items.length > 0 && action.meta.params && (action.meta.params.includes || action.meta.params.relations)) {
              const params = Object.assign({}, { includes: [], relations: [] }, action.meta.params);
              [
                ...params.includes,
                ...params.relations
              ]
              .forEach((include, index, array) => {
                let isPointer = false;
                let isArrayObject = false;
                let isRelation = false;
                let subEntity = entityConfig.mapPointersToFields.find(e => e.field === include.field);
                let subEntityConfig;
                if (subEntity) {
                  isPointer = true;
                } else {
                  subEntity = entityConfig.mapArraysToFields.find(e => e.field === include.field);
                  if (subEntity) {
                    isArrayObject = true;
                  } else {
                    subEntity = entityConfig.mapRelationsToFields.find(e => e.field === include.field);
                    if (subEntity) {
                      subEntityConfig = initializeEntityConfig(config, subEntity.entity);
                      isRelation = true;
                    }
                  }
                }

                if (isPointer || isArrayObject || isRelation) {
                  serializedItems.forEach((item, i, a) => {
                    if (isPointer) {
                      next({
                        type: `SET_${subEntity.entity.toUpperCase()}S`,
                        item: item[include.field]
                      });
                      const paramInclude = action.meta.params.includes.find(pi => pi.field === include);
                      if (paramInclude && paramInclude.includes && paramInclude.includes.length > 0) {
                        setInnerPointers(subEntity.entity, paramInclude.includes, item[include]);
                      }
                    } else if (isArrayObject) {
                      next({
                        type: `SET_${subEntity.entity.toUpperCase()}S`,
                        items: item[include.field]
                      });
                    } else {
                      api(action.meta.entity)
                        .getRelation(item.object, include.field, { includes: include.includes })
                        .subscribe(
                          (subItems) => {
                            const serializedSubitems = subItems.map((subItem) =>
                              serializeParseObject(config, subEntityConfig, subItem)
                            );

                            // Update item with relations
                            const updatedItem = Object.assign({}, item);
                            updatedItem[include.field] = Object.assign({}, updatedItem[include.field], {
                              relations: serializedSubitems
                            });
                            next({
                              type: `SET_${action.meta.entity.toUpperCase()}S`,
                              item: updatedItem
                            });

                            // Update relations in their reducer
                            next({
                              type: `SET_${subEntity.entity.toUpperCase()}S`,
                              items: serializedSubitems
                            });
                            
                            if (index === array.length - 1 && i === a.length - 1) {
                              setStatus('');
                              observer.next(serializedItems);
                              observer.complete();
                            }
                          },
                          (error) => {
                            console.dir(error);
                            setStatus('');
                            observer.error(error);
                          },
                          () => {}
                        );
                    }
                  });
                } else {
                  setStatus('');
                  observer.next(serializedItems);
                  observer.complete();
                }
              });
              if (!action.meta.params.relations || action.meta.params.relations.length === 0) {
                setStatus('');
                observer.next(serializedItems);
                observer.complete();
              }
            } else {
              setStatus('');
              observer.next(serializedItems);
              observer.complete();
            }
          },
          (error) => {
            setStatus('');
            observer.error(error);
          },
          () => {}
        );

      // return suscription;
    };
    const getRelation = (observer) => {
      setStatus('loadingRelation');
      const suscription = api(action.meta.entity)
        .getRelation(action.item.object, action.meta.relation, action.meta.params)
        .subscribe(
          (related) => {
            const entityConfig = initializeEntityConfig(config, action.meta.entity);
            const subEntity = entityConfig.mapRelationsToFields.find(e => e.field === action.meta.relation);
            if (subEntity) {
              const subEntityConfig = initializeEntityConfig(config, subEntity.entity);
              if (subEntityConfig) {
                // Update item with relations
                const serializedRelated = related.map(r => serializeParseObject(config, subEntityConfig, r));
                const updatedData = {};
                updatedData[action.meta.relation] = Object.assign({}, action.item[action.meta.relation], {
                  relations: serializedRelated
                });
                next({
                  type: `SET_${action.meta.entity.toUpperCase()}S`,
                  item: updateSerializedObject(config, entityConfig, action.item, updatedData, parse)
                });

                // Update pointer in their reducer
                next({
                  type: `SET_${subEntity.entity.toUpperCase()}S`,
                  items: serializedRelated
                });

                setStatus('');
                observer.next(serializedRelated);
                observer.complete();
              } else {
                setStatus('');
                observer.error({message: `No entity config found for relation:${action.meta.relation}`});
              }
            } else {
              setStatus('');
              observer.error({message: `No entity config found for relation:${action.meta.relation}`});
            }
          },
          (error) => {
            console.dir(error);
            setStatus('');
            observer.error(error);
          },
          () => {}
        );

      return suscription;
    };
    const save = (observer) => {
      let entityConfig = initializeEntityConfig(config, action.meta.entity);
      const updatedData = validate(entityConfig, action.item);
      if (updatedData && updatedData.errors.length > 0) {
        return next({
          type: `CHANGE_${entityConfig.name.toUpperCase()}`,
          updatedData
        });
      }

      setStatus('saving');
      const deserializedObject = deserializeParseObject(
        config,
        entityConfig,
        action.item,
        parse
      );
      const subscriber = api(entityConfig.name)
        .save(deserializedObject)
        .subscribe(
          (result) => {
            entityConfig = initializeEntityConfig(config, action.meta.entity);
            const updatedItem = serializeParseObject(config, entityConfig, result);

            next(Object.assign({}, action, {
              type: `SET_${entityConfig.name.toUpperCase()}S`,
              item: updatedItem,
              relations: entityConfig.mapRelationsToFields
            }));
            setStatus('');
            observer.next(updatedItem);
            observer.complete();
          },
          (error) => {
            setStatus('');
            observer.error(error);
          },
          () => {}
        );
      return subscriber;
    };
    const addRelation = (observer) => {
      let entityConfig = initializeEntityConfig(config, action.meta.entity);

      const relation = action.item.object.relation(action.meta.relation);
      relation.add(action.meta.relatedItem.object);

      setStatus('saving');
      const subscriber = api(entityConfig.name)
        .save(action.item.object)
        .subscribe(
          (result) => {
            entityConfig = initializeEntityConfig(config, action.meta.entity);

            const updatedItem = serializeParseObject(config, entityConfig, result);            
            
            // Add relation in reducer
            next(Object.assign({}, action, {
              type: `ADD_${entityConfig.name.toUpperCase()}_RELATION`,
              item: updatedItem,
              relation: action.meta.relation,
              relatedItem: action.meta.relatedItem
            }));

            setStatus('');
            observer.next(updatedItem);
            observer.complete();
          },
          (error) => {
            console.dir(error);
            setStatus('');
            observer.error(error);
          },
          () => {}
        );
      return subscriber;
    };
    const removeRelation = (observer) => {
      let entityConfig = initializeEntityConfig(config, action.meta.entity);

      const relation = action.item.object.relation(action.meta.relation);
      relation.remove(action.meta.relatedItem.object);

      setStatus('saving');
      const subscriber = api(entityConfig.name)
        .save(action.item.object)
        .subscribe(
          (result) => {
            entityConfig = initializeEntityConfig(config, action.meta.entity);
            const updatedItem = serializeParseObject(config, entityConfig, result);
            // Remove relation in reducer
            next(Object.assign({}, action, {
              type: `REMOVE_${entityConfig.name.toUpperCase()}_RELATION`,
              item: updatedItem,
              relation: action.meta.relation,
              relatedItem: action.meta.relatedItem
            }));
            setStatus('');
            observer.next(updatedItem);
            observer.complete();
          },
          (error) => {
            setStatus('');
            observer.error(error);
          },
          () => {}
        );
      return subscriber;
    };
    const deleteItem = (observer) => {
      let entityConfig = initializeEntityConfig(config, action.meta.entity);
      const subscriber = api(entityConfig.name)
      .delete(action.item.object)
      .subscribe(
        (result) => {
          next(action);
          observer.next(action.item);
          observer.complete();
        },
        (error) => {
          observer.error(error);
        },
        () => {}
      );
      return subscriber;
    };

    // Edit actions
    const change = (observer) => {
      const entityConfig = initializeEntityConfig(config, action.meta.entity);
      const updatedData = validate(entityConfig, action.item, action.meta.updatedData);
      next({
        type: `CHANGE_${action.meta.entity.toUpperCase()}_EDIT`,
        updatedData
      });
      observer.next(updatedData);
      observer.complete();
    };
    const addItem = (observer) => {
      const entityConfig = initializeEntityConfig(config, action.meta.entity);
      const subEntity = entityConfig.mapArraysToFields.find(e => e.field === action.meta.field);
      if (subEntity) {
        const subEntityConfig = initializeEntityConfig(config, subEntity.entity);
        if (subEntityConfig) {
          const updatedData = validate(subEntityConfig, action.subItem);
          if (updatedData && updatedData.errors.length > 0) {
            next(Object.assign({}, action, {
              type: `CHANGE_${entityConfig.name.toUpperCase()}_ITEM`,
              field: action.meta.field,
              updatedData
            }));
            observer.next(updatedData);
            observer.complete();
          } else {
            next(Object.assign({}, action, {
              type: `ADD_${entityConfig.name.toUpperCase()}_ITEM`,
              field: action.meta.field
            }));
            observer.next();
            observer.complete();
          }
        } else {
          observer.error({ message: `Missing entity configuration for: ${subEntity.entity}` });
        }
      } else {
        const updatedData = validate(entityConfig, action.subItem);
        if (updatedData && updatedData.errors.length > 0) {
          next(Object.assign({}, action, {
            type: `CHANGE_${entityConfig.name.toUpperCase()}_ITEM`,
            field: action.meta.field,
            updatedData
          }));
          observer.next(updatedData);
          observer.complete();
        } else {
          next(Object.assign({}, action, {
            type: `ADD_${entityConfig.name.toUpperCase()}_ITEM`,
            field: action.meta.field
          }));
          observer.next();
          observer.complete();
        }
      }
    };

    // Edits actions
    const changeItem = (observer) => {
      const entityConfig = initializeEntityConfig(config, action.meta.entity);
      let updatedData = action.meta.updatedData;
      const subEntity = entityConfig.mapArraysToFields.find(e => e.field === action.meta.field);
      if (subEntity) {
        const subEntityConfig = initializeEntityConfig(config, subEntity.entity);
        if (subEntityConfig) {
          updatedData = validate(subEntityConfig, action.subItem, action.meta.updatedData);
          next(Object.assign({}, action, {
            field: action.meta.field,
            updatedData
          }));
          observer.next(updatedData);
          observer.complete();
        } else {
          observer.error({ message: `Missing entity configuration for: ${subEntity.entity}` });
        }
      } else {
        updatedData = validate(entityConfig, action.subItem, action.meta.updatedData);
        if (updatedData && updatedData.errors.length > 0) {
          next(Object.assign({}, action, {
            field: action.meta.field,
            updatedData
          }));
          observer.next(updatedData);
          observer.complete();
        } else {
          next(Object.assign({}, action, {
            field: action.meta.field,
            updatedData
          }));
          observer.next(updatedData);
          observer.complete();
        }
      }
    };

    switch (action.meta.action) {
      case 'getAll': {
        return Rx.Observable.create(observer => getAll(observer));
      }
      case 'getRelation': {
        return Rx.Observable.create(observer => getRelation(observer));
      }
      case 'save': {
        return Rx.Observable.create(observer => save(observer));
      }
      case 'addRelation': {
        return Rx.Observable.create(observer => addRelation(observer));
      }
      case 'removeRelation': {
        return Rx.Observable.create(observer => removeRelation(observer));
      }
      case 'delete': {
        return Rx.Observable.create(observer => deleteItem(observer));
      }
      case 'change': {
        return Rx.Observable.create(observer => change(observer));
      }
      case 'addItem': {
        return Rx.Observable.create(observer => addItem(observer));
      }
      case 'changeItem': {
        return Rx.Observable.create(observer => changeItem(observer));
      }
      default: {
        return next(action);
      }
    }
  };
};
