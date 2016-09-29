import Rx from 'rxjs';

const getIncludes = (prefix, includes) => {
  let list = [];
  includes.forEach(include => {
    const includeWithPrefix = prefix ? `${prefix}.${include.field}` : include.field;
    list.push(includeWithPrefix);
    if (include.includes) {
      list = [...list, ...getIncludes(includeWithPrefix, include.includes)];
    }
  });
  return list;
};

const getParams = { filters: [], includes: [], relations: [] };
export default (parse) => {
  const Parse = parse;
  return (entity) => ({
    create: () => {
      const Entity = Parse.Object.extend(entity);
      return new Entity();
    },
    getAll: (params = {}) => {
      const queryParams = Object.assign({}, getParams, params);
      const ParseObject = Parse.Object.extend(entity);
      const query = new Parse.Query(ParseObject);
      if (queryParams.includes) {
        getIncludes(undefined, queryParams.includes).forEach((include) => {
          query.include(include);
        });
      }
      queryParams.filters.forEach(filter => {
        query.equalTo(filter.field, filter.value);
      });
      return Rx.Observable.fromPromise(query.find());
    },
    get: (id, params = {}) => {
      const queryParams = Object.assign({}, getParams, params);
      const ParseObject = Parse.Object.extend(entity);
      const query = new Parse.Query(ParseObject);
      queryParams.includes.forEach(include => {
        query.include(include);
      });
      return Rx.Observable.fromPromise(query.get(id));
    },
    getRelation: (parseObject, field) => {
      const relation = parseObject.relation(field);
      const query = relation.query();
      return Rx.Observable.fromPromise(query.find());
    },
    save: (parseObject) => Rx.Observable.fromPromise(parseObject.save())
  });
};
