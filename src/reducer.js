/// Helper functions
const findItemIndex = (collection, item) => {
  let index = collection.indexOf(item)
  if (index < 0) {
    const foundItem = collection.find(i => i.id === item.id);
    index = collection.indexOf(foundItem);
  }
  return index
}

// Reducer
const initialState = [];
export default (
  entity,
  state = initialState,
  action
) => {
  switch (action.type) {
    case `GET_${entity.toUpperCase()}S`: {
      return action.items;
    }    
    case `CREATE_${entity.toUpperCase()}`: {
      return [...state, action.item];
    }
    case `REPLACE_${entity.toUpperCase()}`: {
      const index = findItemIndex(state, action.item);
      if (index >= 0){
        return [
          ...state.slice(0, index),
           action.replacement,
          ...state.slice(index + 1)
        ]        
      } else {
        return [...state, action.replacement]
      }
    }
    case `DELETE_${entity.toUpperCase()}`: {
      const index = findItemIndex(state,action.item);
      return [
        ...state.slice(0, index),
        ...state.slice(index + 1)
      ]
    }
    
    case `CREATE_${entity.toUpperCase()}_ITEM`: {
      const indexItem = findItemIndex(state,action.item);      
      const replaceItem = Object.assign({}, state[indexItem]);
      replaceItem[action.meta.field] = [
        ...state[indexItem][action.meta.field],
        action.subItem
      ]
      console.dir(replaceItem);
      return [
        ...state.slice(0, indexItem),
        replaceItem,
        ...state.slice(indexItem + 1)
      ]
    }
    case `REPLACE_${entity.toUpperCase()}_ITEM`: {
      const indexItem = findItemIndex(state, action.item);
      const indexSubItem = findItemIndex(action.item[action.meta.field], action.subItem);
      const replaceItem = Object.assign({}, state[indexItem]);
      replaceItem[action.meta.field] = [
        ...state[indexItem][action.meta.field].slice(0, indexSubItem),
        action.replacement,
        ...state[indexItem][action.meta.field].slice(indexSubItem + 1)
      ]
      return [
        ...state.slice(0, indexItem),
        replaceItem,
        ...state.slice(indexItem + 1)
      ]
    }
    case `DELETE_${entity.toUpperCase()}_ITEM`: {
      const indexItem = findItemIndex(state, action.item);
      const indexSubItem = findItemIndex(action.item[action.meta.field], action.subItem);
      const replaceItem = Object.assign({}, state[indexItem]);
      replaceItem[action.meta.field] = [
        ...state[indexItem][action.meta.field].slice(0, indexSubItem),
        ...state[indexItem][action.meta.field].slice(indexSubItem + 1)
      ]
      return [
        ...state.slice(0, indexItem),
        replaceItem,
        ...state.slice(indexItem + 1)
      ]
    }
    // Intial state
    default: {
      return false;
    }
  }
}

// Selectors
export const getItems = (state) => {
  return state;
}
