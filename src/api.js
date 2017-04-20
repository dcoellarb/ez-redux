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

const applyFilter = (query, filter, Parse, entity) => {
  if (filter.filters) {
    let innerQuery = new Parse.Query(filter.entity);
    filter.filters.forEach(f => {
      innerQuery = applyFilter(innerQuery, f, Parse, filter.entity);
    });
    query.matchesQuery(filter.field, innerQuery);
  } else if (filter.orValues) {
    const ParseObject = Parse.Object.extend(entity);
    const orQueries = [];
    filter.orValues.forEach(orValue => {
      const orQuery = new Parse.Query(ParseObject);
      orQuery.equalTo(filter.field, orValue);
      orQueries.push(orQuery);
    });
    query._orQuery(orQueries);
  } else {
    query.equalTo(filter.field, filter.value);
  }
  return query;
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
      let query = new Parse.Query(ParseObject);
      if (queryParams.includes && queryParams.includes.length > 0) {
        getIncludes(undefined, queryParams.includes).forEach((include) => {
          query.include(include);
        });
      }
      queryParams.filters.forEach(filter => {
        query = applyFilter(query, filter, Parse, entity);
      });
      return Rx.Observable.fromPromise(query.find());
    },
    get: (id, params = {}) => {
      const queryParams = Object.assign({}, getParams, params);
      const ParseObject = Parse.Object.extend(entity);
      const query = new Parse.Query(ParseObject);
      if (queryParams.includes && queryParams.includes.length > 0) {
        getIncludes(undefined, queryParams.includes).forEach((include) => {
          query.include(include);
        });
      }
      return Rx.Observable.fromPromise(query.get(id));
    },
    getRelation: (parseObject, field, params) => {
      let observable = Rx.Observable.fromPromise(Promise.resolve([]));
      const value = parseObject.get(field);
      if (value && value instanceof Parse.Relation) {
        const relation = parseObject.relation(field);
        const query = relation.query();
        const queryParams = Object.assign({}, getParams, params);
        if (queryParams.includes && queryParams.includes.length > 0) {
          getIncludes(undefined, queryParams.includes).forEach((include) => {
            query.include(include);
          });
        }
        observable = Rx.Observable.fromPromise(query.find());
      }
      return observable;
    },
    save: (parseObject) => Rx.Observable.fromPromise(parseObject.save()),
    delete: (parseObject) => Rx.Observable.fromPromise(parseObject.destroy())
  });
};
