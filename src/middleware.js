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

    // List actions
    const getAll = () => {
      next({
        type: `SET_${action.meta.entity.toUpperCase()}S_STATUS`,
        status: 'loadingList'
      });
      const suscription = api(action.meta.entity)
        .getAll(action.meta.params)
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
            if (action.meta.params && action.meta.params.includes) {
              action.meta.params.includes.forEach(include => {
                let isPointer = false;
                let isArrayObject = false;
                let subEntity = entityConfig.mapPointersToFields.find(e => e.field === include);
                if (subEntity) {
                  isPointer = true;
                } else {
                  subEntity = entityConfig.mapArraysToFields.find(e => e.field === include);
                  if (subEntity) {
                    isArrayObject = true;
                  }
                }

                if (isPointer || isArrayObject) {
                  serializedItems.forEach((item) => {
                    if (isPointer) {
                      next({
                        type: `SET_${subEntity.entity.toUpperCase()}`,
                        item: item[include]
                      });
                    } else {
                      next({
                        type: `SET_${subEntity.entity.toUpperCase()}`,
                        items: item[include]
                      });
                    }
                  });
                }
              });
            }
          },
          (error) => {
            console.dir(error);
          },
          () => {}
        );

      return suscription;
    };
    const getRelation = () => {
      next({
        type: `SET_${action.meta.entity.toUpperCase()}S_STATUS`,
        status: 'loadingRelation'
      });
      const suscription = api(action.meta.entity)
        .getRelation(action.item.object, action.meta.relation)
        .subscribe(
          (related) => {
            const entityConfig = initializeEntityConfig(config, action.meta.entity);
            const subEntity = entityConfig.mapRealtionsToFields.find(e => e.field === action.meta.relation);
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
                  item: updateSerializedObject(config, entityConfig, action.item, updatedData)
                });

                // Update pointer in their reducer
                next({
                  type: `SET_${subEntity.entity.toUpperCase()}`,
                  items: serializedRelated
                });
              } else {
                throw `No entity config found for relation:${action.meta.relation}`;
              }
            } else {
              throw `No entity config found for relation:${action.meta.relation}`;
            }
          },
          (error) => {
            console.dir(error);
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

      next({
        type: `SET_${action.meta.entity.toUpperCase()}S_STATUS`,
        status: 'saving'
      });
      const deserializedObject = deserializeParseObject(
        config,
        entityConfig,
        action.item
      );
      const subscriber = api(entityConfig.name)
        .save(deserializedObject)
        .subscribe(
          (result) => {
            entityConfig = initializeEntityConfig(config, action.meta.entity);
            next(Object.assign({}, action, {
              type: `SET_${entityConfig.name.toUpperCase()}`,
              item: serializeParseObject(config, entityConfig, result)
            }));
          },
          (error) => {
            console.dir(error);
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
        return getAll();
      }
      case 'getRelation': {
        return getRelation();
      }
      case 'save': {
        return save();
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
