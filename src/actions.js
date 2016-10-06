export default (entity) => {
  const entityActions = {
    // List actions
    getAll: (params) => ({
      type: `GET_${entity.toUpperCase()}S`,
      meta: { entity, action: 'getAll', params },
      items: []
    }),
    getRelation: (item, relation) => ({
      type: `GET_${entity.toUpperCase()}_RELATION`,
      meta: { entity, action: 'getRelation', relation },
      item
    }),
    save: (item) => ({
      type: `SAVE_${entity.toUpperCase()}`,
      meta: { entity, action: 'save' },
      item
    }),
    addRelation: (item, relation, relatedItem) => ({
      type: `SAVE_${entity.toUpperCase()}`,
      meta: { entity, action: 'addRelation', relation, relatedItem },
      item
    }),
    removeRelation: (item, relation, relatedItem) => ({
      type: `SAVE_${entity.toUpperCase()}`,
      meta: { entity, action: 'removeRelation', relation, relatedItem },
      item
    }),
    delete: (item) => ({
      type: `REMOVE_${entity.toUpperCase()}`,
      item
    }),

    // Edit actions
    setEdit: (item) => ({
      type: `SET_EDIT_${entity.toUpperCase()}`,
      item
    }),
    change: (item, updatedData) => ({
      type: `CHANGE_${entity.toUpperCase()}`,
      meta: { entity, action: 'change', updatedData },
      item
    }),
    addItem: (field, subItem) => ({
      type: `ADD_${entity.toUpperCase()}_ITEM`,
      meta: { entity, action: 'addItem', field },
      subItem
    }),
    removeItem: (field, subItem) => ({
      type: `REMOVE_${entity.toUpperCase()}_ITEM`,
      field,
      subItem
    }),

    // Edits actions
    setEditItem: (field, subItem) => ({
      type: `SET_EDIT_${entity.toUpperCase()}_ITEM`,
      field,
      subItem
    }),
    changeItem: (field, subItem, updatedData) => ({
      type: `CHANGE_${entity.toUpperCase()}_ITEM`,
      meta: { entity, action: 'changeItem', field, updatedData },
      subItem
    })
  };

  return entityActions;
};
