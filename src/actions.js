export default (entity) => {
  const entityActions = {
    // List actions
    getAll: (params) => ({
      type: `SET_${entity.toUpperCase()}S`,
      meta: { entity, action: 'getAll', params },
      items: []
    }),
    getRelation: (item, relation) => ({
      type: `SET_${entity.toUpperCase()}`,
      meta: { entity, action: 'getRelation', relation },
      item
    }),
    save: (item) => ({
      meta: { entity, action: 'save' },
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
