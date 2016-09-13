import Parse from 'parse-env-chooser';
import api from './api';
import validate from './helpers/validator';
import { findAndInitializeEntityConfig, initializeEntityConfig } from './helpers/initializer'; 
import {
  serializeParseObject,
  deserializeParseObject,
  updateSerializedObject
} from './helpers/serializer';

export default (config = []) => store => next => action => {
  if (!action.meta) {
    return next(action);
  }

  const foundConfig = config.find(e => e.name === action.meta.entity);
  if (!foundConfig) {
    return next(action);
  }
  const entityConfig = initializeEntityConfig(foundConfig);

  // List actions
  const getAll = () => {
    const suscription = api(entityConfig.name)
      .getAll(action.meta.params)
      .subscribe(
        (items) => {
          next(Object.assign({}, action, {
            items: items.map((item) =>
              serializeParseObject(config, entityConfig, item)
            )
          }));
        },
        (error) => {
          console.dir(error);
        },
        () => {}
      );

    return suscription;
  };
  const getRelation = () => {
    const suscription = api(entityConfig.name)
      .getRelation(action.item.object, action.meta.relation)
      .subscribe(
        (related) => {
          const updatedData = {};
          const subEntity = entityConfig.mapRealtionsToFields.find(e => e.field === action.meta.relation);
          if (subEntity) {
            const subEntityConfig = findAndInitializeEntityConfig(config, subEntity.entity);
            if (subEntityConfig) {
              updatedData[action.meta.relation] = related.map(r => serializeParseObject(config, subEntityConfig, r))
            } else {
              throw `No entity config found for relation:${action.meta.relation}`;
            }
          } else {
            throw `No entity config found for relation:${action.meta.relation}`;
          }
          next(Object.assign({}, action, {
            replacement: updateSerializedObject(config, entityConfig, action.item, updatedData)
          }));
        },
        (error) => {
          console.dir(error);
        },
        () => {}
      );

    return suscription;
  };
  const save = () => {
    const updatedData = validate(entityConfig, action.item);
    if (updatedData && updatedData.errors.length > 0) {
      return next(Object.assign({}, action, {
        type: `CHANGE_${entityConfig.name.toUpperCase()}`,
        updatedData
      }));
    }
    const deserializedObject = deserializeParseObject(
      config,
      entityConfig,
      action.item
    );
    const subscriber = api(entityConfig.name)
      .save(deserializedObject)
      .subscribe(
        (result) => {
          if (action.item.id) {
            next(Object.assign({}, action, {
              type: `REPLACE_${entityConfig.name.toUpperCase()}`,
              item: action.item,
              replacement: serializeParseObject(config, entityConfig, result)
            }));
          } else {
            next(Object.assign({}, action, {
              type: `ADD_${entityConfig.name.toUpperCase()}`,
              item: serializeParseObject(config, entityConfig, result)
            }));
          }
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
    const updatedData = validate(entityConfig, action.item, action.meta.updatedData);
    return next(Object.assign({}, action, {
      updatedData
    }));
  };
  const addItem = () => {
    const subEntity = entityConfig.mapArraysToFields.find(e => e.field === action.meta.field);
    if (subEntity) {
      const subEntityConfig = findAndInitializeEntityConfig(config, subEntity.entity);
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
    let updatedData = action.meta.updatedData;
    const subEntity = entityConfig.mapArraysToFields.find(e => e.field === action.meta.field);
    if (subEntity) {
      const subEntityConfig = findAndInitializeEntityConfig(config, subEntity.entity);
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
