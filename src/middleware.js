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
              items: serializedItems
            });

            // Update pointer in their reducers
            if (items.length > 0 && action.meta.params && (action.meta.params.includes || action.meta.params.relations)) {
              const params = Object.assign({}, { includes: [], relations: [] }, action.meta.params);
              [
                ...params.includes.map((i) => i.field),
                ...params.relations.map((r) => r.field)
              ].forEach((include, index, array) => {
                let isPointer = false;
                let isArrayObject = false;
                let isRelation = false;
                let subEntity = entityConfig.mapPointersToFields.find(e => e.field === include);
                let subEntityConfig;
                if (subEntity) {
                  isPointer = true;
                } else {
                  subEntity = entityConfig.mapArraysToFields.find(e => e.field === include);
                  if (subEntity) {
                    isArrayObject = true;
                  } else {
                    subEntity = entityConfig.mapRelationsToFields.find(e => e.field === include);
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
                        item: item[include]
                      });
                      const paramInclude = action.meta.params.includes.find(pi => pi.field === include);
                      if (paramInclude && paramInclude.includes && paramInclude.includes.length > 0) {
                        setInnerPointers(subEntity.entity, paramInclude.includes, item[include]);
                      }
                    } else if (isArrayObject) {
                      next({
                        type: `SET_${subEntity.entity.toUpperCase()}S`,
                        items: item[include]
                      });
                    } else {
                      api(action.meta.entity)
                        .getRelation(item.object, include)
                        .subscribe(
                          (subItems) => {
                            const serializedSubitems = subItems.map((subItem) =>
                              serializeParseObject(config, subEntityConfig, subItem)
                            );

                            // Update item with relations
                            const updatedItem = Object.assign({}, item);
                            updatedItem[include] = Object.assign({}, updatedItem[include], {
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
                              observer.onNext();
                              observer.onComplete();
                            }
                          },
                          (error) => {
                            console.dir(error);
                            setStatus('');
                            observer.onError(error);
                          },
                          () => {}
                        );
                    }
                  });
                } else {
                  setStatus('');
                  observer.onNext();
                  observer.onComplete();
                }
              });
              if (!action.meta.params.relations || action.meta.params.relations.length === 0) {
                setStatus('');
                observer.onNext();
                observer.onComplete();
              }
            } else {
              setStatus('');
              observer.onNext();
              observer.onComplete();
            }
          },
          (error) => {
            setStatus('');
            observer.onError(error);
          },
          () => {}
        );

      // return suscription;
    };
    const getRelation = () => {
      setStatus('loadingRelation');
      const suscription = api(action.meta.entity)
        .getRelation(action.item.object, action.meta.relation)
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
              } else {
                throw `No entity config found for relation:${action.meta.relation}`;
                setStatus('');
              }
            } else {
              throw `No entity config found for relation:${action.meta.relation}`;
              setStatus('');
            }
          },
          (error) => {
            console.dir(error);
            setStatus('');
          },
          () => {}
        );

      return suscription;
    };
    const save = () => {
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

            // Maintain exiting relations
            if (entityConfig.mapRelationsToFields) {
              entityConfig.mapRelationsToFields.forEach(r => {
                if (updatedItem[r.field]) {
                  updatedItem[r.field].relations = action.item[r.field].relations;                  
                } else {
                  updatedItem[r.field] = {
                    relations: []
                  };
                }
              });
            }

            next(Object.assign({}, action, {
              type: `SET_${entityConfig.name.toUpperCase()}S`,
              item: updatedItem
            }));
            setStatus('');
          },
          (error) => {
            console.dir(error);
            setStatus('');
          },
          () => {}
        );
      return subscriber;
    };
    const addRelation = () => {
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
            updatedItem[action.meta.relation].relations = [...action.item[action.meta.relation].relations, action.meta.relatedItem];

            next(Object.assign({}, action, {
              type: `SET_${entityConfig.name.toUpperCase()}S`,
              item: updatedItem
            }));
            setStatus('');
          },
          (error) => {
            console.dir(error);
            setStatus('');
          },
          () => {}
        );
      return subscriber;
    };
    const removeRelation = () => {
      let entityConfig = initializeEntityConfig(config, action.meta.entity);

      const relation = action.item.object.relation(action.meta.relation);
      relation.remove(action.meta.relatedItem.object);

      setStatus('saving');
      const subscriber = api(entityConfig.name)
        .save(action.item.object)
        .subscribe(
          (result) => {
            entityConfig = initializeEntityConfig(config, action.meta.entity);

            const currentItem = action.item[action.meta.relation].relations.find(r => r.id === action.meta.relatedItem.id);
            const index = action.item[action.meta.relation].relations.indexOf(currentItem);
            const updatedItem = serializeParseObject(config, entityConfig, result);
            updatedItem[action.meta.relation].relations = [
              ...action.item[action.meta.relation].relations.slice(0, index),
              ...action.item[action.meta.relation].relations.slice(index + 1)
            ];

            next(Object.assign({}, action, {
              type: `SET_${entityConfig.name.toUpperCase()}S`,
              item: updatedItem
            }));
            setStatus('');
          },
          (error) => {
            console.dir(error);
            setStatus('');
          },
          () => {}
        );
      return subscriber;
    };

    // Edit actions
    const change = () => {
      const entityConfig = initializeEntityConfig(config, action.meta.entity);
      const updatedData = validate(entityConfig, action.item, action.meta.updatedData);
      return next({
        type: `CHANGE_${action.meta.entity.toUpperCase()}_EDIT`,
        updatedData
      });
    };
    const addItem = () => {
      const entityConfig = initializeEntityConfig(config, action.meta.entity);
      const subEntity = entityConfig.mapArraysToFields.find(e => e.field === action.meta.field);
      if (subEntity) {
        const subEntityConfig = initializeEntityConfig(config, subEntity.entity);
        if (subEntityConfig) {
          const updatedData = validate(subEntityConfig, action.subItem);
          if (updatedData && updatedData.errors.length > 0) {
            return next(Object.assign({}, action, {
              type: `CHANGE_${entityConfig.name.toUpperCase()}_ITEM`,
              field: action.meta.field,
              updatedData
            }));
          }

          return next(Object.assign({}, action, {
            type: `ADD_${entityConfig.name.toUpperCase()}_ITEM`,
            field: action.meta.field
          }));
        }
        throw `Missing entity configuration for: ${subEntity.entity}`;
      }

      const updatedData = validate(entityConfig, action.subItem);
      if (updatedData && updatedData.errors.length > 0) {
        return next(Object.assign({}, action, {
          type: `CHANGE_${entityConfig.name.toUpperCase()}_ITEM`,
          field: action.meta.field,
          updatedData
        }));
      }
      return next(Object.assign({}, action, {
        type: `ADD_${entityConfig.name.toUpperCase()}_ITEM`,
        field: action.meta.field
      }));
    };

    // Edits actions
    const changeItem = () => {
      const entityConfig = initializeEntityConfig(config, action.meta.entity);
      let updatedData = action.meta.updatedData;
      const subEntity = entityConfig.mapArraysToFields.find(e => e.field === action.meta.field);
      if (subEntity) {
        const subEntityConfig = initializeEntityConfig(config, subEntity.entity);
        if (subEntityConfig) {
          updatedData = validate(subEntityConfig, action.subItem, action.meta.updatedData);
          return next(Object.assign({}, action, {
            field: action.meta.field,
            updatedData
          }));
        }
        throw `Missing entity configuration for: ${subEntity.entity}`;
      }

      updatedData = validate(entityConfig, action.subItem, action.meta.updatedData);
      if (updatedData && updatedData.errors.length > 0) {
        return next(Object.assign({}, action, {
          field: action.meta.field,
          updatedData
        }));
      }
      return next(Object.assign({}, action, {
        field: action.meta.field,
        updatedData
      }));
    };

    switch (action.meta.action) {
      case 'getAll': {
        return Rx.Observable.create(observer => getAll(observer));
      }
      case 'getRelation': {
        return getRelation();
      }
      case 'save': {
        return save();
      }
      case 'addRelation': {
        return addRelation();
      }
      case 'removeRelation': {
        return removeRelation();
      }
      case 'change': {
        return change();
      }
      case 'addItem': {
        return addItem();
      }
      case 'changeItem': {
        return changeItem();
      }
      default: {
        return next(action);
      }
    }
  };
};
