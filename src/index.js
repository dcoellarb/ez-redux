import apiEnvChooser from './api';
import getActions from './actions';
import reducer from './reducer';
import * as selectors from './reducer';
import middlewareEnvChooser from './middleware';

export default (env) => {
  const api = apiEnvChooser(env);
  const middleware = middlewareEnvChooser(env);
  return { api, getActions, reducer, selectors, middleware };
};
