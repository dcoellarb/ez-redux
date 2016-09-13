import { findAndInitializeEntityConfig, initializeEntityConfig } from './initializer'; 

export const serializeParseObject = (config, entityConfig, parseObject) => {
  const serializedObject = {};
  Object.keys(parseObject.attributes).map((prop) => {
    if (parseObject.attributes[prop].constructor.name === 'ParseObject' || 
      parseObject.attributes[prop].constructor.name === 'ParseObjectSubclass'){
      const subEntity = entityConfig.mapPointersToFields.find(e => e.field === prop);
      if (subEntity) {
        const subEntityConfig = findAndInitializeEntityConfig(config, subEntity.entity);
        if (subEntityConfig) {
          serializedObject[prop] = serializeParseObject(config, subEntityConfig, parseObject.attributes[prop]);
        } else {
          throw `No entity config found for pointer:${prop}`;
        }
      } else {
        throw `No entity found for pointer:${prop}`;
      }
    
    }else if(parseObject.attributes[prop] instanceof Array){
      serializedObject[prop] = parseObject.attributes[prop].map((item) => {
        if (item.constructor && (item.constructor.name === 'ParseObject' || 
          item.constructor.name === 'ParseObjectSubclass')) {

          const subEntity = entityConfig.mapArraysToFields.find(e => e.field === prop);
          if (subEntity) {
            const subEntityConfig = findAndInitializeEntityConfig(config, subEntity.entity);
            if (subEntityConfig) {
              return serializeParseObject(config, subEntityConfig, item);
            } else {
              throw `No entity config found for array:${prop}`;
            }
          } else {
            throw `No entity config found for array:${prop}`;
          }
        } else {
          return item;
        }
      });
    }else if(entityConfig.nonStoredFields.indexOf(prop) === -1) {
      serializedObject[prop] = parseObject.attributes[prop];
    }
  });
  serializedObject.id = parseObject.id;
  serializedObject.object = parseObject;
  return serializedObject;
}
export const deserializeParseObject = (config, entityConfig, serializedObject) => { 
  if (!serializedObject.object) {
    serializedObject.object = api(entityConfig.name).create();
  }
  Object.keys(serializedObject).map((prop) => {
    if (entityConfig.nonStoredFields.indexOf(prop) === -1) {
      if (!serializedObject[prop]){
        serializedObject.object.unset(prop);
      } else if (serializedObject[prop].object) {
        serializedObject.object.set(prop, serializedObject[prop].object);
      } else if(serializedObject[prop] instanceof Array) {
        const subEntity = entityConfig.mapArraysToFields.find(e => e.field === prop);
        if (subEntity) {
          const subEntityConfig = initializeEntityConfig(config, subEntity.entity);
          if (subEntityConfig) {
            serializedObject.object.set(prop,serializedObject[prop]
              .map((item) => {
                return deserializeParseObject(config, subEntityConfig, item);
              })
            );              
          } else {
            throw `Missing entity configuration for: ${subEntity.entity}`;
          }
        } else {
          serializedObject.object.set(prop, serializedObject[prop])
        }
      } else {
        serializedObject.object.set(prop,serializedObject[prop]);          
      }
    }
  }); 
  return serializedObject.object;
}
export const updateSerializedObject = (config, entityConfig, serializedObject, updates) => {
  const newObject = Object.assign({},serializedObject,updates);
  if (newObject.object) {
    newObject.object = deserializeParseObject(config, entityConfig, newObject)   
    serializedObject.object = undefined;      
  }
  return newObject;
}