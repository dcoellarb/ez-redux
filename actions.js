export default (entity) => {  
  const entityActions = {
    getAll: () => ({
      type: `GET_${entity.toUpperCase()}S`,
      meta: {entity, action: 'getAll'},
      items: []
    }),
    getRelation: (item, relation) => ({
      type: `REPLACE_${entity.toUpperCase()}`,
      meta: {entity, action: 'getRelation', relation},
      item,
      replacement: Object.assign({},item)
    }),    
    create: (defaults) => ({
      type: `CREATE_${entity.toUpperCase()}`,
      meta: {entity, action: 'create', defaults},
      item: {}
    }),
    change: (item, updatedData) => ({
      type: `REPLACE_${entity.toUpperCase()}`,
      meta: {entity, action: 'change', updatedData},
      item,
      replacement: Object.assign({},item)
    }),
    delete: (item) => ({
      type: `DELETE_${entity.toUpperCase()}`,
      item
    }),
    save: (item, updatedData) => ({
      type: `REPLACE_${entity.toUpperCase()}`,
      meta: {entity, action: 'save', updatedData},
      item,
      replacement: Object.assign({},item)
    }),

    //Arrays fields
    createItem: (item, field, defaults) => ({
      type: `CREATE_${entity.toUpperCase()}_ITEM`,
      meta: {entity, action: 'createItem', field, defaults},
      item,
      subItem: {}
    }),
    changeItem: (item, field, subItem, updatedData) => ({
      type: `REPLACE_${entity.toUpperCase()}_ITEM`,
      meta: {entity, action: 'changeItem', field, updatedData},
      item,
      subItem,
      replacement: Object.assign({},item)
    }),
    deleteItem: (item, field, subItem) => ({
      type: `DELETE_${entity.toUpperCase()}_ITEM`,
      meta: {entity, action: 'deleteItem', field},
      item,
      subItem
    }),
    saveItem: (item, field, subItem, updatedData) => ({
      type: `REPLACE_${entity.toUpperCase()}_ITEM`,
      meta: {entity, action: 'saveItem', field, updatedData},
      item,
      subItem,
      replacement: Object.assign({},item)
    }),
  };

  return entityActions;
};
