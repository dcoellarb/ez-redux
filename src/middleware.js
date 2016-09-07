import Parse from 'parse-env-chooser';
import api from './api';
import validate from './helpers/validator'; 
import { findAndInitializeEntityConfig, initializeEntityConfig } from './helpers/initializer'; 
import { serializeParseObject, deserializeParseObject, updateSerializedObject } from './helpers/serializer'; 

const defaultEntityConfig = {
  name: '',
  mapArraysToFields: [],
  mapPointersToFields: [],
  mapRealtionsToFields: [],
  nonStoredFields: [],
  validate: () => ({
    errors: [],
    warnings: []
  })
};
export default (config = []) => store => next => action => {
  if (!action.meta) {
    return next(action)
  }

  const foundConfig = config.find(e => e.name === action.meta.entity);
  if (!foundConfig) {
    return next(action);
  }
  const entityConfig = initializeEntityConfig(foundConfig)

  const getAll = () => {
    const suscription = api(entityConfig.name)
      .getAll({ includes: ["items"] })
      .subscribe(
        (items) => {
          next(Object.assign({},action,{
            items: items.map((item) =>
              serializeParseObject(config, entityConfig, item)
            )
          }));
        },
        (error) => {      
          console.dir(error)
        },
        () => {}
      );

    return suscription;
  }
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
              throw `No entity config found for relation:${action.meta.relation}` 
            }
          } else {
            throw `No entity config found for relation:${action.meta.relation}` 
          }          
          next(Object.assign({}, action, {
            replacement: updateSerializedObject(config, entityConfig, action.item, updatedData)
          }));
        },
        (error) => {      
          console.dir(error)
        },
        () => {}
      );

    return suscription;    
  }
  const create = () => {
    return next(Object.assign({}, action, { item: action.meta.defaults }));
  }
  const createItem = () => {
    return next(Object.assign({}, action, { subItem: action.meta.defaults }));
  }
  const change = () => {
    const updatedData = validate(entityConfig, action.item, action.meta.updatedData);
    return next(Object.assign({}, action, {
      replacement: updateSerializedObject(config, entityConfig, action.item,updatedData)
    }));
  }
  const changeItem = () => {
    let updatedData = action.meta.updatedData;
    const subEntity = entityConfig.mapArraysToFields.find(e => e.field === action.meta.field);
    if (subEntity) {
      const subEntityConfig = findAndInitializeEntityConfig(config, subEntity.entity);
      if (subEntityConfig) {
        updatedData = validate(subEntityConfig, action.subItem, action.meta.updatedData);
        return next(Object.assign({}, action, {
          replacement: updateSerializedObject(config, subEntityConfig, action.subItem,updatedData)
        }));
      } else {
        throw `Missing entity configuration for: ${subEntity.entity}`;
      }
    } else {
      return next(Object.assign({}, action, {
        replacement: Object.assign({}, action.subItem, updatedData)
      }));      
    }
  }
  const save = () => {
    const updatedData = validate(entityConfig, action.item);
    if (updatedData && updatedData.errors.length > 0){
      return next(Object.assign({}, action, {
        replacement: updateSerializedObject(config, entityConfig, action.item, updatedData)
      }));
    } else {
      const updatedObject = updateSerializedObject(config, entityConfig, action.item, action.meta.updatedData);
      const deserializedObject = deserializeParseObject(
        config,
        entityConfig,
        updatedObject
      );
      console.dir(deserializedObject);
      api(entityConfig.name)
        .save(deserializedObject)
        .subscribe(
          (result) => {
            next(Object.assign({},action,{
              replacement: serializeParseObject(config, entityConfig, result)
            }));            
          },
          (error) => {      
            console.dir(error);
          },
          () => {}
        );                      
    }
  }
  const saveItem = () => {
    const subEntity = entityConfig.mapArraysToFields.find(e => e.field === action.meta.field);
    if (subEntity){
      const subEntityConfig = findAndInitializeEntityConfig(config, subEntity.entity);
      if (subEntityConfig) {
        const updatedData = validate(subEntityConfig, action.subItem);
        if (updatedData && updatedData.errors.length > 0){
          return next(Object.assign({}, action, {
            replacement: updateSerializedObject(config, subEntityConfig, action.subItem, updatedData)
          }));         
        } else {
          return next(Object.assign({}, action, {
            replacement: updateSerializedObject(config, subEntityConfig, action.subItem, action.meta.updatedData)
          }));         
        }            
      } else {
        throw `Missing entity configuration for: ${subEntity.entity}`;
      }
    } else {
      return next(Object.assign({}, action, {
        replacement: Object.assign({}, action.subItem, action.meta.updatedData)
      })); 
    }       
  }
  const deleteItem = () => {
    return next(Object.assign({}, action));
  }

  switch(action.meta.action) {
    case 'getAll': {
      return getAll();
    }
    case 'getRelation': {
      return getRelation();  
    }
    case 'create': {
      return create();
    }
    case 'createItem': {
      return createItem();
    }
    case 'change': {
      return change();
    }
    case 'changeItem': {
      return changeItem();
    }
    case 'save': {
      return save();
    }
    case 'saveItem': {
      return saveItem();  
    }
    case 'deleteItem': {
      return deleteItem();  
    }
  }
}
