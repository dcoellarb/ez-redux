const ignoredFields = ['object', 'errors', 'warnings'];
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
export const initializeEntityConfig = (foundConfig) => {
  const entityConfig = Object.assign(defaultEntityConfig, foundConfig);
  entityConfig.nonStoredFields = [...entityConfig.nonStoredFields, ...ignoredFields];
  return entityConfig;
};
export const findAndInitializeEntityConfig = (config, entity) => {
  const foundConfig = config.find(e => e.name === entity);
  if (!foundConfig) {
    return foundConfig;
  }
  return initializeEntityConfig(foundConfig);
};
