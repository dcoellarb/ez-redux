/// Helper functions
const findItemIndex = (collection, item) => {
  let index = collection.indexOf(item);
  if (index < 0) {
    const foundItem = collection.find(i => i.id === item.id);
    index = collection.indexOf(foundItem);
  }
  return index;
};

// Reducer
const defaultState = { list: [], edit: {}, edits: [] };
export default (
  entity,
  state,
  action
) => {
  switch (action.type) {
    // List reducers
    case `SET_${entity.toUpperCase()}S`: {
      return Object.assign({}, state, { list: action.items });
    }
    case `ADD_${entity.toUpperCase()}`: {
      return Object.assign({}, state, { list: [...state.list, action.item] });
    }
    case `REPLACE_${entity.toUpperCase()}`: {
      const index = findItemIndex(state.list, action.item);
      if (index >= 0) {
        return Object.assign({}, state, { list: [
          ...state.list.slice(0, index),
          action.replacement,
          ...state.list.slice(index + 1)
        ] });
      }

      return [...state, action.replacement];
    }
    case `REMOVE_${entity.toUpperCase()}`: {
      const index = findItemIndex(state.list, action.item);
      return Object.assign({}, state, { list: [
        ...state.list.slice(0, index),
        ...state.list.slice(index + 1)
      ] });
    }

    // Edit reducers
    case `SET_EDIT_${entity.toUpperCase()}`: {
      return Object.assign({}, state, { edit: action.item });
    }
    case `CHANGE_${entity.toUpperCase()}`: {
      return Object.assign({}, state, {
        edit: Object.assign({}, state.edit, action.updatedData)
      });
    }
    case `ADD_${entity.toUpperCase()}_ITEM`: {
      const newState = Object.assign({}, state);
      if (state.edit[action.field]) {
        newState.edit[action.field] = [...state.edit[action.field], action.subItem];
      } else {
        newState.edit[action.field] = [action.subItem];
      }
      return newState;
    }
    case `REMOVE_${entity.toUpperCase()}_ITEM`: {
      const indexSubItem = findItemIndex(state.edit[action.field], action.subItem);
      const newState = Object.assign({}, state);
      newState.edit[action.field] = [
        ...state.edit[action.field].splice(0, indexSubItem),
        ...state.edit[action.field].slice(indexSubItem + 1)
      ];
      return newState;
    }

    // Edits reducers
    case `SET_EDIT_${entity.toUpperCase()}_ITEM`: {
      const editSubItem = state.edits.find(e => e.field === action.field);
      const index = state.edits.indexOf(editSubItem);
      const newEditSubItem = Object.assign({}, editSubItem, {
        data: action.subItem
      });
      return Object.assign({}, state, {
        edits: [
          ...state.edits.slice(0, index),
          newEditSubItem,
          ...state.edits.slice(index + 1)
        ]
      });
    }
    case `CHANGE_${entity.toUpperCase()}_ITEM`: {
      const editSubItem = state.edits.find(e => e.field === action.field);
      const index = state.edits.indexOf(editSubItem);
      const newEditSubItem = Object.assign({}, editSubItem, {
        data: Object.assign({}, editSubItem.data, action.updatedData)
      });
      return Object.assign({}, state, {
        edits: [
          ...state.edits.slice(0, index),
          newEditSubItem,
          ...state.edits.slice(index + 1)
        ]
      });
    }
    // Intial state
    default: {
      return Object.assign({}, defaultState, state);
    }
  }
};

// Selectors
export const getItems = (state) => (
  state.list
);
export const getEdit = (state) => (
  state.edit
);
export const getEditItem = (field, state) => (
  state.edits.find(e => e.field === field).data
);
