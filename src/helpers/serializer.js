import apiEnvChooser from './../api';
import { initializeEntityConfig } from './initializer';

export const serializeParseObject = (config, entityConfig, parseObject) => {
  const serializedObject = {};
  Object.keys(parseObject.attributes).map((prop) => {
    if (parseObject.attributes[prop]) {
      if (parseObject.attributes[prop].className) {
        const subEntity = entityConfig.mapPointersToFields.find(e => e.field === prop);
        if (subEntity) {
          const subEntityConfig = initializeEntityConfig(config, subEntity.entity);
          if (subEntityConfig) {
            serializedObject[prop] = serializeParseObject(config, subEntityConfig, parseObject.attributes[prop]);
          } else {
            throw `No entity config found for pointer:${prop}`;
          }
        } else {
          throw `No entity found for pointer:${prop}`;
        }
      } else if (parseObject.attributes[prop].targetClassName) {
        serializedObject[prop] = {
          relation: parseObject.attributes[prop],
          relations: []
        };
      } else if (parseObject.attributes[prop].latitude && parseObject.attributes[prop].longitude) {
        serializedObject[prop] = {
          latitude: parseObject.attributes[prop].latitude,
          longitude: parseObject.attributes[prop].longitude
        };
      } else if (parseObject.attributes[prop] instanceof Array) {
        serializedObject[prop] = parseObject.attributes[prop].map((item) => {
          if (item.constructor && (item.constructor.name === 'ParseObject' ||
            item.constructor.name === 'ParseObjectSubclass')) {

            const subEntity = entityConfig.mapArraysToFields.find(e => e.field === prop);
            if (subEntity) {
              const subEntityConfig = initializeEntityConfig(config, subEntity.entity);
              if (subEntityConfig) {
                return serializeParseObject(config, subEntityConfig, item);
              }
              throw `No entity config found for array:${prop}`;
            } else {
              throw `No entity config found for array:${prop}`;
            }
          } else {
            return item;
          }
        });
      } else if (entityConfig.nonStoredFields.indexOf(prop) === -1) {
        serializedObject[prop] = parseObject.attributes[prop];
      }
    }
  });
  serializedObject.id = parseObject.id;
  serializedObject.object = parseObject;
  return serializedObject;
};

export const deserializeParseObject = (config, entityConfig, serializedObject, parse) => { 
  if (!serializedObject.object) {
    serializedObject.object = apiEnvChooser(parse)(entityConfig.name).create();
  }
  Object.keys(serializedObject).map((prop) => {
    if (entityConfig.nonStoredFields.indexOf(prop) === -1) {
      if (!serializedObject[prop]) {
        serializedObject.object.unset(prop);
      } else if (serializedObject[prop].object) {
        serializedObject.object.set(prop, serializedObject[prop].object);
      } else if (serializedObject[prop].latitude || serializedObject[prop].longitude) {
        serializedObject.object.set(prop, new parse.GeoPoint(serializedObject[prop].latitude, serializedObject[prop].longitude));
      } else if (serializedObject[prop].relation) {
        serializedObject.object.set(prop, serializedObject[prop].relation);
      } else if (serializedObject[prop] instanceof Array) {
        const subEntity = entityConfig.mapArraysToFields.find(e => e.field === prop);
        if (subEntity) {
          const subEntityConfig = initializeEntityConfig(config, subEntity.entity);
          if (subEntityConfig) {
            serializedObject.object.set(prop, serializedObject[prop]
              .map((item) => {
                return deserializeParseObject(config, subEntityConfig, item);
              })
            );
          } else {
            throw `Missing entity configuration for: ${subEntity.entity}`;
          }
        } else {
          serializedObject.object.set(prop, serializedObject[prop]);
        }
      } else {
        serializedObject.object.set(prop,serializedObject[prop]);
      }
    }
  });
  return serializedObject.object;
};
export const updateSerializedObject = (config, entityConfig, serializedObject, updates, parse) => {
  const newObject = Object.assign({}, serializedObject, updates);
  if (newObject.object) {
    newObject.object = deserializeParseObject(config, entityConfig, newObject, parse);
    serializedObject.object = undefined;
  }
  return newObject;
};
