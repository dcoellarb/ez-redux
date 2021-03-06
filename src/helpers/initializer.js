const ignoredFields = ['object', 'errors', 'warnings'];
const defaultEntityConfig = {
  name: '',
  mapArraysToFields: [],
  mapPointersToFields: [],
  mapRelationsToFields: [],
  nonStoredFields: [],
  validate: () => ({
    errors: [],
    warnings: []
  })
};

export const initializeEntityConfig = (config, entity) => {
  const foundConfig = config.find(e => e.name === entity);
  if (!foundConfig) {
    return foundConfig;
  }

  const entityConfig = Object.assign({}, defaultEntityConfig, foundConfig);
  entityConfig.nonStoredFields = [...entityConfig.nonStoredFields, ...ignoredFields];
  return entityConfig;
};
