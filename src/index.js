import apiEnvChooser from './api';
import getActions from './actions';
import reducer from './reducer';
import * as selectors from './reducer';
import middlewareEnvChooser from './middleware';
import * as serializer from './helpers/serializer';
import * as initializer from './helpers/initializer';

export default (parse) => {
  const api = apiEnvChooser(parse);
  const middleware = middlewareEnvChooser(parse);
  return { api, getActions, reducer, selectors, middleware, serializer, initializer };
};
