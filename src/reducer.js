/// Helper functions
const findItemIndex = (collection, item) => {
  const foundItem = collection.find(i => i.id === item.id);
  return collection.indexOf(foundItem);
};

const replactItem = (stateList, item) => {
  let list = [...stateList];
  const index = findItemIndex(list, item);
  if (index >= 0) {
    list = [
      ...list.slice(0, index),
      item, // This code did not work for unseting props: Object.assign({}, list[index], item),
      ...list.slice(index + 1)
    ];
  } else {
    list = [...list, item];
  }
  return list;
};

// Reducer
const defaultState = { list: [], edit: undefined, edits: [], status: { message: '', count: 0 } };
export default (
  entity,
  state,
  action
) => {
  switch (action.type) {
    // Status reducers
    case `SET_${entity.toUpperCase()}S_STATUS`: {
      let message = action.status;
      if (state.status.message !== '' && action.status === '') {
        message = state.status.message;
      }
      return Object.assign({}, state, {
        status: {
          message,
          count: action.status !== '' ? state.status.count + 1 : state.status.count - 1
        }
      });
    }

    // List reducers
    case `SET_${entity.toUpperCase()}S`: {
      let list = [...state.list];
      if (action.items) {
        action.items.forEach((item) => { list = replactItem(list, item); });
      }
      if (action.item) {
        list = replactItem(state.list, action.item);
      }
      return Object.assign({}, state, {
        list
      });
    }
    case `REMOVE_${entity.toUpperCase()}`: {
      const index = findItemIndex(state.list, action.item);
      return Object.assign({}, state, { list: [
        ...state.list.slice(0, index),
        ...state.list.slice(index + 1)
      ] });
    }

    // Edit reducers
    case `SET_${entity.toUpperCase()}_EDIT`: {
      return Object.assign({}, state, { edit: action.item });
    }
    case `CHANGE_${entity.toUpperCase()}_EDIT`: {
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
        ...state.edit[action.field].slice(0, indexSubItem),
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
