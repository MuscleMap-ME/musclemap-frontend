import {
  DocumentTransform,
  Slot,
  addTypenameToDocument,
  dep,
  isNetworkRequestInFlight,
  isReference,
  print,
  wrap
} from "./chunk-AT3QSBN7.js";
import {
  CombinedGraphQLErrors,
  PROTOCOL_ERRORS_SYMBOL,
  graphQLResultHasProtocolErrors,
  registerLinkError,
  toErrorLike
} from "./chunk-LSOS6EAY.js";
import {
  AutoCleanedWeakCache,
  BehaviorSubject,
  DeepMerger,
  EMPTY,
  Observable,
  Subject,
  Trie,
  WeakCache,
  __DEV__,
  __assign,
  argumentsObjectFromField,
  cacheSizes,
  canonicalStringify,
  catchError,
  checkDocument,
  cloneDeep,
  compact,
  concat,
  createFragmentMap,
  equal,
  equalByQuery,
  execute,
  filter,
  filterMap,
  finalize,
  from,
  getApolloCacheMemoryInternals,
  getApolloClientMemoryInternals,
  getDefaultValues,
  getFragmentDefinition,
  getFragmentDefinitions,
  getFragmentFromSelection,
  getFragmentQueryDocument,
  getInMemoryCacheMemoryInternals,
  getMainDefinition,
  getOperationDefinition,
  getOperationName,
  getQueryDefinition,
  getStoreKeyName,
  graphQLResultHasError,
  hasDirectives,
  hasForcedResolvers,
  invariant,
  isArray,
  isDocumentNode,
  isField,
  isNonEmptyArray,
  isNonNullObject,
  lastValueFrom,
  makeReference,
  makeUniqueId,
  map,
  materialize,
  maybeDeepFreeze,
  mergeDeepArray,
  mergeMap,
  mergeOptions,
  newInvariantError,
  of,
  preventUnhandledRejection,
  removeDirectivesFromDocument,
  removeMaskedFragmentSpreads,
  resultKeyNameFromField,
  share,
  shareReplay,
  shouldInclude,
  storeKeyNameFromField,
  stringifyForDisplay,
  tap,
  throwError,
  toQueryResult,
  variablesUnknownSymbol,
  version
} from "./chunk-ST4AGMGU.js";
import {
  BREAK,
  Kind,
  OperationTypeNode,
  parse,
  visit
} from "./chunk-QJSJWK6O.js";
import {
  __publicField
} from "./chunk-EWTE5DHJ.js";

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/incremental/handlers/notImplemented.js
var NotImplementedHandler = class {
  constructor() {
    // This code path can never be reached, so we won't implement it.
    __publicField(this, "startRequest");
  }
  isIncrementalResult(_) {
    return false;
  }
  prepareRequest(request) {
    invariant(!hasDirectives(["defer"], request.query), 64);
    return request;
  }
  extractErrors() {
  }
};

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/cache/core/cache.js
var ApolloCache = class {
  constructor() {
    __publicField(this, "assumeImmutableResults", false);
    // Make sure we compute the same (===) fragment query document every
    // time we receive the same fragment in readFragment.
    __publicField(this, "getFragmentDoc", wrap(getFragmentQueryDocument, {
      max: cacheSizes["cache.fragmentQueryDocuments"] || 1e3,
      cache: WeakCache
    }));
  }
  // Function used to lookup a fragment when a fragment definition is not part
  // of the GraphQL document. This is useful for caches, such as InMemoryCache,
  // that register fragments ahead of time so they can be referenced by name.
  lookupFragment(fragmentName) {
    return null;
  }
  // Transactional API
  // The batch method is intended to replace/subsume both performTransaction
  // and recordOptimisticTransaction, but performTransaction came first, so we
  // provide a default batch implementation that's just another way of calling
  // performTransaction. Subclasses of ApolloCache (such as InMemoryCache) can
  // override the batch method to do more interesting things with its options.
  batch(options) {
    const optimisticId = typeof options.optimistic === "string" ? options.optimistic : options.optimistic === false ? null : void 0;
    let updateResult;
    this.performTransaction(() => updateResult = options.update(this), optimisticId);
    return updateResult;
  }
  recordOptimisticTransaction(transaction, optimisticId) {
    this.performTransaction(transaction, optimisticId);
  }
  // Optional API
  // Called once per input document, allowing the cache to make static changes
  // to the query, such as adding __typename fields.
  transformDocument(document) {
    return document;
  }
  // Called before each ApolloLink request, allowing the cache to make dynamic
  // changes to the query, such as filling in missing fragment definitions.
  transformForLink(document) {
    return document;
  }
  identify(object) {
    return;
  }
  gc() {
    return [];
  }
  modify(options) {
    return false;
  }
  readQuery(options, optimistic = !!options.optimistic) {
    return this.read({
      ...options,
      rootId: options.id || "ROOT_QUERY",
      optimistic
    });
  }
  /**
  * Watches the cache store of the fragment according to the options specified
  * and returns an `Observable`. We can subscribe to this
  * `Observable` and receive updated results through an
  * observer when the cache store changes.
  * 
  * You must pass in a GraphQL document with a single fragment or a document
  * with multiple fragments that represent what you are reading. If you pass
  * in a document with multiple fragments then you must also specify a
  * `fragmentName`.
  * 
  * @since 3.10.0
  * @param options - An object of type `WatchFragmentOptions` that allows
  * the cache to identify the fragment and optionally specify whether to react
  * to optimistic updates.
  */
  watchFragment(options) {
    const { fragment, fragmentName, from: from3, optimistic = true, ...otherOptions } = options;
    const query = this.getFragmentDoc(fragment, fragmentName);
    const id = typeof from3 === "undefined" || typeof from3 === "string" ? from3 : this.identify(from3);
    if (__DEV__) {
      const actualFragmentName = fragmentName || getFragmentDefinition(fragment).name.value;
      if (!id) {
        __DEV__ && invariant.warn(110, actualFragmentName);
      }
    }
    const diffOptions = {
      ...otherOptions,
      returnPartialData: true,
      id,
      query,
      optimistic
    };
    let latestDiff;
    return new Observable((observer) => {
      return this.watch({
        ...diffOptions,
        immediate: true,
        callback: (diff) => {
          let data = diff.result;
          if (data === null) {
            data = {};
          }
          if (
            // Always ensure we deliver the first result
            latestDiff && equalByQuery(query, { data: latestDiff.result }, { data }, options.variables)
          ) {
            return;
          }
          const result = {
            data,
            dataState: diff.complete ? "complete" : "partial",
            complete: !!diff.complete
          };
          if (diff.missing) {
            result.missing = diff.missing.missing;
          }
          latestDiff = { ...diff, result: data };
          observer.next(result);
        }
      });
    });
  }
  readFragment(options, optimistic = !!options.optimistic) {
    return this.read({
      ...options,
      query: this.getFragmentDoc(options.fragment, options.fragmentName),
      rootId: options.id,
      optimistic
    });
  }
  writeQuery({ id, data, ...options }) {
    return this.write(Object.assign(options, {
      dataId: id || "ROOT_QUERY",
      result: data
    }));
  }
  writeFragment({ id, data, fragment, fragmentName, ...options }) {
    return this.write(Object.assign(options, {
      query: this.getFragmentDoc(fragment, fragmentName),
      dataId: id,
      result: data
    }));
  }
  updateQuery(options, update) {
    return this.batch({
      update(cache) {
        const value = cache.readQuery(options);
        const data = update(value);
        if (data === void 0 || data === null)
          return value;
        cache.writeQuery({ ...options, data });
        return data;
      }
    });
  }
  updateFragment(options, update) {
    return this.batch({
      update(cache) {
        const value = cache.readFragment(options);
        const data = update(value);
        if (data === void 0 || data === null)
          return value;
        cache.writeFragment({ ...options, data });
        return data;
      }
    });
  }
};
if (__DEV__) {
  ApolloCache.prototype.getMemoryInternals = getApolloCacheMemoryInternals;
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/cache/core/types/common.js
var MissingFieldError = class _MissingFieldError extends Error {
  constructor(message, path, query, variables) {
    super(message);
    __publicField(this, "message");
    __publicField(this, "path");
    __publicField(this, "query");
    __publicField(this, "variables");
    __publicField(this, "missing");
    this.message = message;
    this.path = path;
    this.query = query;
    this.variables = variables;
    this.name = "MissingFieldError";
    if (Array.isArray(this.path)) {
      this.missing = this.message;
      for (let i = this.path.length - 1; i >= 0; --i) {
        this.missing = { [this.path[i]]: this.missing };
      }
    } else {
      this.missing = this.path;
    }
    this.__proto__ = _MissingFieldError.prototype;
  }
};

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/cache/inmemory/helpers.js
var { hasOwnProperty: hasOwn } = Object.prototype;
function defaultDataIdFromObject({ __typename, id, _id }, context) {
  if (typeof __typename === "string") {
    if (context) {
      context.keyObject = id != null ? { id } : _id != null ? { _id } : void 0;
    }
    if (id == null && _id != null) {
      id = _id;
    }
    if (id != null) {
      return `${__typename}:${typeof id === "number" || typeof id === "string" ? id : JSON.stringify(id)}`;
    }
  }
}
var defaultConfig = {
  dataIdFromObject: defaultDataIdFromObject,
  resultCaching: true
};
function normalizeConfig(config) {
  return compact(defaultConfig, config);
}
function getTypenameFromStoreObject(store, objectOrReference) {
  return isReference(objectOrReference) ? store.get(objectOrReference.__ref, "__typename") : objectOrReference && objectOrReference.__typename;
}
var TypeOrFieldNameRegExp = /^[_a-z][_0-9a-z]*/i;
function fieldNameFromStoreName(storeFieldName) {
  const match = storeFieldName.match(TypeOrFieldNameRegExp);
  return match ? match[0] : storeFieldName;
}
function selectionSetMatchesResult(selectionSet, result, variables) {
  if (isNonNullObject(result)) {
    return isArray(result) ? result.every((item) => selectionSetMatchesResult(selectionSet, item, variables)) : selectionSet.selections.every((field) => {
      if (isField(field) && shouldInclude(field, variables)) {
        const key = resultKeyNameFromField(field);
        return hasOwn.call(result, key) && (!field.selectionSet || selectionSetMatchesResult(field.selectionSet, result[key], variables));
      }
      return true;
    });
  }
  return false;
}
function storeValueIsStoreObject(value) {
  return isNonNullObject(value) && !isReference(value) && !isArray(value);
}
function makeProcessedFieldsMerger() {
  return new DeepMerger();
}
function extractFragmentContext(document, fragments) {
  const fragmentMap = createFragmentMap(getFragmentDefinitions(document));
  return {
    fragmentMap,
    lookupFragment(name) {
      let def = fragmentMap[name];
      if (!def && fragments) {
        def = fragments.lookup(name);
      }
      return def || null;
    }
  };
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/cache/inmemory/entityStore.js
var DELETE = {};
var delModifier = () => DELETE;
var INVALIDATE = {};
var EntityStore = class {
  constructor(policies, group) {
    __publicField(this, "policies");
    __publicField(this, "group");
    __publicField(this, "data", {});
    // Maps root entity IDs to the number of times they have been retained, minus
    // the number of times they have been released. Retained entities keep other
    // entities they reference (even indirectly) from being garbage collected.
    __publicField(this, "rootIds", {});
    // Lazily tracks { __ref: <dataId> } strings contained by this.data[dataId].
    __publicField(this, "refs", {});
    // Bound function that can be passed around to provide easy access to fields
    // of Reference objects as well as ordinary objects.
    __publicField(this, "getFieldValue", (objectOrReference, storeFieldName) => maybeDeepFreeze(isReference(objectOrReference) ? this.get(objectOrReference.__ref, storeFieldName) : objectOrReference && objectOrReference[storeFieldName]));
    // Returns true for non-normalized StoreObjects and non-dangling
    // References, indicating that readField(name, objOrRef) has a chance of
    // working. Useful for filtering out dangling references from lists.
    __publicField(this, "canRead", (objOrRef) => {
      return isReference(objOrRef) ? this.has(objOrRef.__ref) : typeof objOrRef === "object";
    });
    // Bound function that converts an id or an object with a __typename and
    // primary key fields to a Reference object. If called with a Reference object,
    // that same Reference object is returned. Pass true for mergeIntoStore to persist
    // an object into the store.
    __publicField(this, "toReference", (objOrIdOrRef, mergeIntoStore) => {
      if (typeof objOrIdOrRef === "string") {
        return makeReference(objOrIdOrRef);
      }
      if (isReference(objOrIdOrRef)) {
        return objOrIdOrRef;
      }
      const [id] = this.policies.identify(objOrIdOrRef);
      if (id) {
        const ref = makeReference(id);
        if (mergeIntoStore) {
          this.merge(id, objOrIdOrRef);
        }
        return ref;
      }
    });
    this.policies = policies;
    this.group = group;
  }
  // Although the EntityStore class is abstract, it contains concrete
  // implementations of the various NormalizedCache interface methods that
  // are inherited by the Root and Layer subclasses.
  toObject() {
    return { ...this.data };
  }
  has(dataId) {
    return this.lookup(dataId, true) !== void 0;
  }
  get(dataId, fieldName) {
    this.group.depend(dataId, fieldName);
    if (hasOwn.call(this.data, dataId)) {
      const storeObject = this.data[dataId];
      if (storeObject && hasOwn.call(storeObject, fieldName)) {
        return storeObject[fieldName];
      }
    }
    if (fieldName === "__typename" && hasOwn.call(this.policies.rootTypenamesById, dataId)) {
      return this.policies.rootTypenamesById[dataId];
    }
    if (this instanceof Layer) {
      return this.parent.get(dataId, fieldName);
    }
  }
  lookup(dataId, dependOnExistence) {
    if (dependOnExistence)
      this.group.depend(dataId, "__exists");
    if (hasOwn.call(this.data, dataId)) {
      return this.data[dataId];
    }
    if (this instanceof Layer) {
      return this.parent.lookup(dataId, dependOnExistence);
    }
    if (this.policies.rootTypenamesById[dataId]) {
      return {};
    }
  }
  merge(older, newer) {
    let dataId;
    if (isReference(older))
      older = older.__ref;
    if (isReference(newer))
      newer = newer.__ref;
    const existing = typeof older === "string" ? this.lookup(dataId = older) : older;
    const incoming = typeof newer === "string" ? this.lookup(dataId = newer) : newer;
    if (!incoming)
      return;
    invariant(typeof dataId === "string", 96);
    const merged = new DeepMerger(storeObjectReconciler).merge(existing, incoming);
    this.data[dataId] = merged;
    if (merged !== existing) {
      delete this.refs[dataId];
      if (this.group.caching) {
        const fieldsToDirty = {};
        if (!existing)
          fieldsToDirty.__exists = 1;
        Object.keys(incoming).forEach((storeFieldName) => {
          if (!existing || existing[storeFieldName] !== merged[storeFieldName]) {
            fieldsToDirty[storeFieldName] = 1;
            const fieldName = fieldNameFromStoreName(storeFieldName);
            if (fieldName !== storeFieldName && !this.policies.hasKeyArgs(merged.__typename, fieldName)) {
              fieldsToDirty[fieldName] = 1;
            }
            if (merged[storeFieldName] === void 0 && !(this instanceof Layer)) {
              delete merged[storeFieldName];
            }
          }
        });
        if (fieldsToDirty.__typename && !(existing && existing.__typename) && // Since we return default root __typename strings
        // automatically from store.get, we don't need to dirty the
        // ROOT_QUERY.__typename field if merged.__typename is equal
        // to the default string (usually "Query").
        this.policies.rootTypenamesById[dataId] === merged.__typename) {
          delete fieldsToDirty.__typename;
        }
        Object.keys(fieldsToDirty).forEach((fieldName) => this.group.dirty(dataId, fieldName));
      }
    }
  }
  modify(dataId, fields, exact) {
    const storeObject = this.lookup(dataId);
    if (storeObject) {
      const changedFields = {};
      let needToMerge = false;
      let allDeleted = true;
      const sharedDetails = {
        DELETE,
        INVALIDATE,
        isReference,
        toReference: this.toReference,
        canRead: this.canRead,
        readField: (fieldNameOrOptions, from3) => this.policies.readField(typeof fieldNameOrOptions === "string" ? {
          fieldName: fieldNameOrOptions,
          from: from3 || makeReference(dataId)
        } : fieldNameOrOptions, { store: this })
      };
      Object.keys(storeObject).forEach((storeFieldName) => {
        const fieldName = fieldNameFromStoreName(storeFieldName);
        let fieldValue = storeObject[storeFieldName];
        if (fieldValue === void 0)
          return;
        const modify = typeof fields === "function" ? fields : fields[storeFieldName] || (exact ? void 0 : fields[fieldName]);
        if (modify) {
          let newValue = modify === delModifier ? DELETE : modify(maybeDeepFreeze(fieldValue), {
            ...sharedDetails,
            fieldName,
            storeFieldName,
            storage: this.getStorage(dataId, storeFieldName)
          });
          if (newValue === INVALIDATE) {
            this.group.dirty(dataId, storeFieldName);
          } else {
            if (newValue === DELETE)
              newValue = void 0;
            if (newValue !== fieldValue) {
              changedFields[storeFieldName] = newValue;
              needToMerge = true;
              fieldValue = newValue;
              if (__DEV__) {
                const checkReference = (ref) => {
                  if (this.lookup(ref.__ref) === void 0) {
                    __DEV__ && invariant.warn(97, ref);
                    return true;
                  }
                };
                if (isReference(newValue)) {
                  checkReference(newValue);
                } else if (Array.isArray(newValue)) {
                  let seenReference = false;
                  let someNonReference;
                  for (const value of newValue) {
                    if (isReference(value)) {
                      seenReference = true;
                      if (checkReference(value))
                        break;
                    } else {
                      if (typeof value === "object" && !!value) {
                        const [id] = this.policies.identify(value);
                        if (id) {
                          someNonReference = value;
                        }
                      }
                    }
                    if (seenReference && someNonReference !== void 0) {
                      __DEV__ && invariant.warn(98, someNonReference);
                      break;
                    }
                  }
                }
              }
            }
          }
        }
        if (fieldValue !== void 0) {
          allDeleted = false;
        }
      });
      if (needToMerge) {
        this.merge(dataId, changedFields);
        if (allDeleted) {
          if (this instanceof Layer) {
            this.data[dataId] = void 0;
          } else {
            delete this.data[dataId];
          }
          this.group.dirty(dataId, "__exists");
        }
        return true;
      }
    }
    return false;
  }
  // If called with only one argument, removes the entire entity
  // identified by dataId. If called with a fieldName as well, removes all
  // fields of that entity whose names match fieldName according to the
  // fieldNameFromStoreName helper function. If called with a fieldName
  // and variables, removes all fields of that entity whose names match fieldName
  // and whose arguments when cached exactly match the variables passed.
  delete(dataId, fieldName, args) {
    const storeObject = this.lookup(dataId);
    if (storeObject) {
      const typename = this.getFieldValue(storeObject, "__typename");
      const storeFieldName = fieldName && args ? this.policies.getStoreFieldName({ typename, fieldName, args }) : fieldName;
      return this.modify(dataId, storeFieldName ? {
        [storeFieldName]: delModifier
      } : delModifier, !!args);
    }
    return false;
  }
  evict(options, limit) {
    let evicted = false;
    if (options.id) {
      if (hasOwn.call(this.data, options.id)) {
        evicted = this.delete(options.id, options.fieldName, options.args);
      }
      if (this instanceof Layer && this !== limit) {
        evicted = this.parent.evict(options, limit) || evicted;
      }
      if (options.fieldName || evicted) {
        this.group.dirty(options.id, options.fieldName || "__exists");
      }
    }
    return evicted;
  }
  clear() {
    this.replace(null);
  }
  extract() {
    const obj = this.toObject();
    const extraRootIds = [];
    this.getRootIdSet().forEach((id) => {
      if (!hasOwn.call(this.policies.rootTypenamesById, id)) {
        extraRootIds.push(id);
      }
    });
    if (extraRootIds.length) {
      obj.__META = { extraRootIds: extraRootIds.sort() };
    }
    return obj;
  }
  replace(newData) {
    Object.keys(this.data).forEach((dataId) => {
      if (!(newData && hasOwn.call(newData, dataId))) {
        this.delete(dataId);
      }
    });
    if (newData) {
      const { __META, ...rest } = newData;
      Object.keys(rest).forEach((dataId) => {
        this.merge(dataId, rest[dataId]);
      });
      if (__META) {
        __META.extraRootIds.forEach(this.retain, this);
      }
    }
  }
  retain(rootId) {
    return this.rootIds[rootId] = (this.rootIds[rootId] || 0) + 1;
  }
  release(rootId) {
    if (this.rootIds[rootId] > 0) {
      const count = --this.rootIds[rootId];
      if (!count)
        delete this.rootIds[rootId];
      return count;
    }
    return 0;
  }
  // Return a Set<string> of all the ID strings that have been retained by
  // this layer/root *and* any layers/roots beneath it.
  getRootIdSet(ids = /* @__PURE__ */ new Set()) {
    Object.keys(this.rootIds).forEach(ids.add, ids);
    if (this instanceof Layer) {
      this.parent.getRootIdSet(ids);
    } else {
      Object.keys(this.policies.rootTypenamesById).forEach(ids.add, ids);
    }
    return ids;
  }
  // The goal of garbage collection is to remove IDs from the Root layer of the
  // store that are no longer reachable starting from any IDs that have been
  // explicitly retained (see retain and release, above). Returns an array of
  // dataId strings that were removed from the store.
  gc() {
    const ids = this.getRootIdSet();
    const snapshot = this.toObject();
    ids.forEach((id) => {
      if (hasOwn.call(snapshot, id)) {
        Object.keys(this.findChildRefIds(id)).forEach(ids.add, ids);
        delete snapshot[id];
      }
    });
    const idsToRemove = Object.keys(snapshot);
    if (idsToRemove.length) {
      let root = this;
      while (root instanceof Layer)
        root = root.parent;
      idsToRemove.forEach((id) => root.delete(id));
    }
    return idsToRemove;
  }
  findChildRefIds(dataId) {
    if (!hasOwn.call(this.refs, dataId)) {
      const found = this.refs[dataId] = {};
      const root = this.data[dataId];
      if (!root)
        return found;
      const workSet = /* @__PURE__ */ new Set([root]);
      workSet.forEach((obj) => {
        if (isReference(obj)) {
          found[obj.__ref] = true;
        }
        if (isNonNullObject(obj)) {
          Object.keys(obj).forEach((key) => {
            const child = obj[key];
            if (isNonNullObject(child)) {
              workSet.add(child);
            }
          });
        }
      });
    }
    return this.refs[dataId];
  }
  makeCacheKey() {
    return this.group.keyMaker.lookupArray(arguments);
  }
  get supportsResultCaching() {
    return this.group.caching;
  }
};
var CacheGroup = class {
  constructor(caching, parent = null) {
    __publicField(this, "caching");
    __publicField(this, "parent");
    __publicField(this, "d", null);
    // Used by the EntityStore#makeCacheKey method to compute cache keys
    // specific to this CacheGroup.
    __publicField(this, "keyMaker");
    this.caching = caching;
    this.parent = parent;
    this.resetCaching();
  }
  resetCaching() {
    this.d = this.caching ? dep() : null;
    this.keyMaker = new Trie();
  }
  depend(dataId, storeFieldName) {
    if (this.d) {
      this.d(makeDepKey(dataId, storeFieldName));
      const fieldName = fieldNameFromStoreName(storeFieldName);
      if (fieldName !== storeFieldName) {
        this.d(makeDepKey(dataId, fieldName));
      }
      if (this.parent) {
        this.parent.depend(dataId, storeFieldName);
      }
    }
  }
  dirty(dataId, storeFieldName) {
    if (this.d) {
      this.d.dirty(
        makeDepKey(dataId, storeFieldName),
        // When storeFieldName === "__exists", that means the entity identified
        // by dataId has either disappeared from the cache or was newly added,
        // so the result caching system would do well to "forget everything it
        // knows" about that object. To achieve that kind of invalidation, we
        // not only dirty the associated result cache entry, but also remove it
        // completely from the dependency graph. For the optimism implementation
        // details, see https://github.com/benjamn/optimism/pull/195.
        storeFieldName === "__exists" ? "forget" : "setDirty"
      );
    }
  }
};
function makeDepKey(dataId, storeFieldName) {
  return storeFieldName + "#" + dataId;
}
function maybeDependOnExistenceOfEntity(store, entityId) {
  if (supportsResultCaching(store)) {
    store.group.depend(entityId, "__exists");
  }
}
var Root = class extends EntityStore {
  constructor({ policies, resultCaching = true, seed }) {
    super(policies, new CacheGroup(resultCaching));
    __publicField(this, "stump", new Stump(this));
    __publicField(this, "storageTrie", new Trie());
    if (seed)
      this.replace(seed);
  }
  addLayer(layerId, replay) {
    return this.stump.addLayer(layerId, replay);
  }
  removeLayer() {
    return this;
  }
  getStorage() {
    return this.storageTrie.lookupArray(arguments);
  }
};
EntityStore.Root = Root;
var Layer = class _Layer extends EntityStore {
  constructor(id, parent, replay, group) {
    super(parent.policies, group);
    __publicField(this, "id");
    __publicField(this, "parent");
    __publicField(this, "replay");
    __publicField(this, "group");
    this.id = id;
    this.parent = parent;
    this.replay = replay;
    this.group = group;
    replay(this);
  }
  addLayer(layerId, replay) {
    return new _Layer(layerId, this, replay, this.group);
  }
  removeLayer(layerId) {
    const parent = this.parent.removeLayer(layerId);
    if (layerId === this.id) {
      if (this.group.caching) {
        Object.keys(this.data).forEach((dataId) => {
          const ownStoreObject = this.data[dataId];
          const parentStoreObject = parent["lookup"](dataId);
          if (!parentStoreObject) {
            this.delete(dataId);
          } else if (!ownStoreObject) {
            this.group.dirty(dataId, "__exists");
            Object.keys(parentStoreObject).forEach((storeFieldName) => {
              this.group.dirty(dataId, storeFieldName);
            });
          } else if (ownStoreObject !== parentStoreObject) {
            Object.keys(ownStoreObject).forEach((storeFieldName) => {
              if (!equal(ownStoreObject[storeFieldName], parentStoreObject[storeFieldName])) {
                this.group.dirty(dataId, storeFieldName);
              }
            });
          }
        });
      }
      return parent;
    }
    if (parent === this.parent)
      return this;
    return parent.addLayer(this.id, this.replay);
  }
  toObject() {
    return {
      ...this.parent.toObject(),
      ...this.data
    };
  }
  findChildRefIds(dataId) {
    const fromParent = this.parent.findChildRefIds(dataId);
    return hasOwn.call(this.data, dataId) ? {
      ...fromParent,
      ...super.findChildRefIds(dataId)
    } : fromParent;
  }
  getStorage(...args) {
    let p = this.parent;
    while (p.parent)
      p = p.parent;
    return p.getStorage(...args);
  }
};
var Stump = class extends Layer {
  constructor(root) {
    super("EntityStore.Stump", root, () => {
    }, new CacheGroup(root.group.caching, root.group));
  }
  removeLayer() {
    return this;
  }
  merge(older, newer) {
    return this.parent.merge(older, newer);
  }
};
function storeObjectReconciler(existingObject, incomingObject, property) {
  const existingValue = existingObject[property];
  const incomingValue = incomingObject[property];
  return equal(existingValue, incomingValue) ? existingValue : incomingValue;
}
function supportsResultCaching(store) {
  return !!(store && store.supportsResultCaching);
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/masking/utils.js
var disableWarningsSlot = new Slot();
function getFragmentMaskMode(fragment) {
  var _a2, _b;
  const directive = (_a2 = fragment.directives) == null ? void 0 : _a2.find(({ name }) => name.value === "unmask");
  if (!directive) {
    return "mask";
  }
  const modeArg = (_b = directive.arguments) == null ? void 0 : _b.find(({ name }) => name.value === "mode");
  if (__DEV__) {
    if (modeArg) {
      if (modeArg.value.kind === Kind.VARIABLE) {
        __DEV__ && invariant.warn(44);
      } else if (modeArg.value.kind !== Kind.STRING) {
        __DEV__ && invariant.warn(45);
      } else if (modeArg.value.value !== "migrate") {
        __DEV__ && invariant.warn(46, modeArg.value.value);
      }
    }
  }
  if (modeArg && "value" in modeArg.value && modeArg.value.value === "migrate") {
    return "migrate";
  }
  return "unmask";
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/masking/maskDefinition.js
function maskDefinition(data, selectionSet, context) {
  return disableWarningsSlot.withValue(true, () => {
    const masked = maskSelectionSet(data, selectionSet, context, false);
    if (Object.isFrozen(data)) {
      maybeDeepFreeze(masked);
    }
    return masked;
  });
}
function getMutableTarget(data, mutableTargets) {
  if (mutableTargets.has(data)) {
    return mutableTargets.get(data);
  }
  const mutableTarget = Array.isArray(data) ? [] : {};
  mutableTargets.set(data, mutableTarget);
  return mutableTarget;
}
function maskSelectionSet(data, selectionSet, context, migration, path) {
  var _a2;
  const { knownChanged } = context;
  const memo = getMutableTarget(data, context.mutableTargets);
  if (Array.isArray(data)) {
    for (const [index, item] of Array.from(data.entries())) {
      if (item === null) {
        memo[index] = null;
        continue;
      }
      const masked = maskSelectionSet(item, selectionSet, context, migration, __DEV__ ? `${path || ""}[${index}]` : void 0);
      if (knownChanged.has(masked)) {
        knownChanged.add(memo);
      }
      memo[index] = masked;
    }
    return knownChanged.has(memo) ? memo : data;
  }
  for (const selection of selectionSet.selections) {
    let value;
    if (migration) {
      knownChanged.add(memo);
    }
    if (selection.kind === Kind.FIELD) {
      const keyName = resultKeyNameFromField(selection);
      const childSelectionSet = selection.selectionSet;
      value = memo[keyName] || data[keyName];
      if (value === void 0) {
        continue;
      }
      if (childSelectionSet && value !== null) {
        const masked = maskSelectionSet(data[keyName], childSelectionSet, context, migration, __DEV__ ? `${path || ""}.${keyName}` : void 0);
        if (knownChanged.has(masked)) {
          value = masked;
        }
      }
      if (!__DEV__) {
        memo[keyName] = value;
      }
      if (__DEV__) {
        if (migration && keyName !== "__typename" && // either the field is not present in the memo object
        // or it has a `get` descriptor, not a `value` descriptor
        // => it is a warning accessor and we can overwrite it
        // with another accessor
        !((_a2 = Object.getOwnPropertyDescriptor(memo, keyName)) == null ? void 0 : _a2.value)) {
          Object.defineProperty(memo, keyName, getAccessorWarningDescriptor(keyName, value, path || "", context.operationName, context.operationType));
        } else {
          delete memo[keyName];
          memo[keyName] = value;
        }
      }
    }
    if (selection.kind === Kind.INLINE_FRAGMENT && (!selection.typeCondition || context.cache.fragmentMatches(selection, data.__typename))) {
      value = maskSelectionSet(data, selection.selectionSet, context, migration, path);
    }
    if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const fragmentName = selection.name.value;
      const fragment = context.fragmentMap[fragmentName] || (context.fragmentMap[fragmentName] = context.cache.lookupFragment(fragmentName));
      invariant(fragment, 39, fragmentName);
      const mode = getFragmentMaskMode(selection);
      if (mode !== "mask") {
        value = maskSelectionSet(data, fragment.selectionSet, context, mode === "migrate", path);
      }
    }
    if (knownChanged.has(value)) {
      knownChanged.add(memo);
    }
  }
  if ("__typename" in data && !("__typename" in memo)) {
    memo.__typename = data.__typename;
  }
  if (Object.keys(memo).length !== Object.keys(data).length) {
    knownChanged.add(memo);
  }
  return knownChanged.has(memo) ? memo : data;
}
function getAccessorWarningDescriptor(fieldName, value, path, operationName, operationType) {
  let getValue = () => {
    if (disableWarningsSlot.getValue()) {
      return value;
    }
    __DEV__ && invariant.warn(40, operationName ? `${operationType} '${operationName}'` : `anonymous ${operationType}`, `${path}.${fieldName}`.replace(/^\./, ""));
    getValue = () => value;
    return value;
  };
  return {
    get() {
      return getValue();
    },
    set(newValue) {
      getValue = () => newValue;
    },
    enumerable: true,
    configurable: true
  };
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/masking/maskFragment.js
function maskFragment(data, document, cache, fragmentName) {
  const fragments = document.definitions.filter((node) => node.kind === Kind.FRAGMENT_DEFINITION);
  if (typeof fragmentName === "undefined") {
    invariant(fragments.length === 1, 41, fragments.length);
    fragmentName = fragments[0].name.value;
  }
  const fragment = fragments.find((fragment2) => fragment2.name.value === fragmentName);
  invariant(!!fragment, 42, fragmentName);
  if (data == null) {
    return data;
  }
  if (equal(data, {})) {
    return data;
  }
  return maskDefinition(data, fragment.selectionSet, {
    operationType: "fragment",
    operationName: fragment.name.value,
    fragmentMap: createFragmentMap(getFragmentDefinitions(document)),
    cache,
    mutableTargets: /* @__PURE__ */ new WeakMap(),
    knownChanged: /* @__PURE__ */ new WeakSet()
  });
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/masking/maskOperation.js
function maskOperation(data, document, cache) {
  var _a2;
  const definition = getOperationDefinition(document);
  invariant(definition, 43);
  if (data == null) {
    return data;
  }
  return maskDefinition(data, definition.selectionSet, {
    operationType: definition.operation,
    operationName: (_a2 = definition.name) == null ? void 0 : _a2.value,
    fragmentMap: createFragmentMap(getFragmentDefinitions(document)),
    cache,
    mutableTargets: /* @__PURE__ */ new WeakMap(),
    knownChanged: /* @__PURE__ */ new WeakSet()
  });
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/cache/inmemory/key-extractor.js
var specifierInfoCache = {};
function lookupSpecifierInfo(spec) {
  const cacheKey = JSON.stringify(spec);
  return specifierInfoCache[cacheKey] || (specifierInfoCache[cacheKey] = {});
}
function keyFieldsFnFromSpecifier(specifier) {
  const info = lookupSpecifierInfo(specifier);
  return info.keyFieldsFn || (info.keyFieldsFn = (object, context) => {
    const extract = (from3, key) => context.readField(key, from3);
    const keyObject = context.keyObject = collectSpecifierPaths(specifier, (schemaKeyPath) => {
      let extracted = extractKeyPath(
        context.storeObject,
        schemaKeyPath,
        // Using context.readField to extract paths from context.storeObject
        // allows the extraction to see through Reference objects and respect
        // custom read functions.
        extract
      );
      if (extracted === void 0 && object !== context.storeObject && hasOwn.call(object, schemaKeyPath[0])) {
        extracted = extractKeyPath(object, schemaKeyPath, extractKey);
      }
      invariant(extracted !== void 0, 99, schemaKeyPath.join("."), object);
      return extracted;
    });
    return `${context.typename}:${JSON.stringify(keyObject)}`;
  });
}
function keyArgsFnFromSpecifier(specifier) {
  const info = lookupSpecifierInfo(specifier);
  return info.keyArgsFn || (info.keyArgsFn = (args, { field, variables, fieldName }) => {
    const collected = collectSpecifierPaths(specifier, (keyPath) => {
      const firstKey = keyPath[0];
      const firstChar = firstKey.charAt(0);
      if (firstChar === "@") {
        if (field && isNonEmptyArray(field.directives)) {
          const directiveName = firstKey.slice(1);
          const d = field.directives.find((d2) => d2.name.value === directiveName);
          const directiveArgs = d && argumentsObjectFromField(d, variables);
          return directiveArgs && extractKeyPath(
            directiveArgs,
            // If keyPath.length === 1, this code calls extractKeyPath with an
            // empty path, which works because it uses directiveArgs as the
            // extracted value.
            keyPath.slice(1)
          );
        }
        return;
      }
      if (firstChar === "$") {
        const variableName = firstKey.slice(1);
        if (variables && hasOwn.call(variables, variableName)) {
          const varKeyPath = keyPath.slice(0);
          varKeyPath[0] = variableName;
          return extractKeyPath(variables, varKeyPath);
        }
        return;
      }
      if (args) {
        return extractKeyPath(args, keyPath);
      }
    });
    const suffix = JSON.stringify(collected);
    if (args || suffix !== "{}") {
      fieldName += ":" + suffix;
    }
    return fieldName;
  });
}
function collectSpecifierPaths(specifier, extractor) {
  const merger = new DeepMerger();
  return getSpecifierPaths(specifier).reduce((collected, path) => {
    let toMerge = extractor(path);
    if (toMerge !== void 0) {
      for (let i = path.length - 1; i >= 0; --i) {
        toMerge = { [path[i]]: toMerge };
      }
      collected = merger.merge(collected, toMerge);
    }
    return collected;
  }, {});
}
function getSpecifierPaths(spec) {
  const info = lookupSpecifierInfo(spec);
  if (!info.paths) {
    const paths = info.paths = [];
    const currentPath = [];
    spec.forEach((s, i) => {
      if (isArray(s)) {
        getSpecifierPaths(s).forEach((p) => paths.push(currentPath.concat(p)));
        currentPath.length = 0;
      } else {
        currentPath.push(s);
        if (!isArray(spec[i + 1])) {
          paths.push(currentPath.slice(0));
          currentPath.length = 0;
        }
      }
    });
  }
  return info.paths;
}
function extractKey(object, key) {
  return object[key];
}
function extractKeyPath(object, path, extract) {
  extract = extract || extractKey;
  return normalize(path.reduce(function reducer(obj, key) {
    return isArray(obj) ? obj.map((child) => reducer(child, key)) : obj && extract(obj, key);
  }, object));
}
function normalize(value) {
  if (isNonNullObject(value)) {
    if (isArray(value)) {
      return value.map(normalize);
    }
    return collectSpecifierPaths(Object.keys(value).sort(), (path) => extractKeyPath(value, path));
  }
  return value;
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/cache/inmemory/reactiveVars.js
var cacheSlot = new Slot();
var cacheInfoMap = /* @__PURE__ */ new WeakMap();
function getCacheInfo(cache) {
  let info = cacheInfoMap.get(cache);
  if (!info) {
    cacheInfoMap.set(cache, info = {
      vars: /* @__PURE__ */ new Set(),
      dep: dep()
    });
  }
  return info;
}
function forgetCache(cache) {
  getCacheInfo(cache).vars.forEach((rv) => rv.forgetCache(cache));
}
function recallCache(cache) {
  getCacheInfo(cache).vars.forEach((rv) => rv.attachCache(cache));
}
function makeVar(value) {
  const caches = /* @__PURE__ */ new Set();
  const listeners = /* @__PURE__ */ new Set();
  const rv = function(newValue) {
    if (arguments.length > 0) {
      if (value !== newValue) {
        value = newValue;
        caches.forEach((cache) => {
          getCacheInfo(cache).dep.dirty(rv);
          broadcast(cache);
        });
        const oldListeners = Array.from(listeners);
        listeners.clear();
        oldListeners.forEach((listener) => listener(value));
      }
    } else {
      const cache = cacheSlot.getValue();
      if (cache) {
        attach(cache);
        getCacheInfo(cache).dep(rv);
      }
    }
    return value;
  };
  rv.onNextChange = (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const attach = rv.attachCache = (cache) => {
    caches.add(cache);
    getCacheInfo(cache).vars.add(rv);
    return rv;
  };
  rv.forgetCache = (cache) => caches.delete(cache);
  return rv;
}
function broadcast(cache) {
  if (cache.broadcastWatches) {
    cache.broadcastWatches();
  }
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/cache/inmemory/policies.js
function argsFromFieldSpecifier(spec) {
  return spec.args !== void 0 ? spec.args : spec.field ? argumentsObjectFromField(spec.field, spec.variables) : null;
}
var nullKeyFieldsFn = () => void 0;
var simpleKeyArgsFn = (_args, context) => context.fieldName;
var mergeTrueFn = (existing, incoming, { mergeObjects }) => mergeObjects(existing, incoming);
var mergeFalseFn = (_, incoming) => incoming;
var Policies = class {
  constructor(config) {
    __publicField(this, "config");
    __publicField(this, "typePolicies", {});
    __publicField(this, "toBeAdded", {});
    // Map from subtype names to sets of supertype names. Note that this
    // representation inverts the structure of possibleTypes (whose keys are
    // supertypes and whose values are arrays of subtypes) because it tends
    // to be much more efficient to search upwards than downwards.
    __publicField(this, "supertypeMap", /* @__PURE__ */ new Map());
    // Any fuzzy subtypes specified by possibleTypes will be converted to
    // RegExp objects and recorded here. Every key of this map can also be
    // found in supertypeMap. In many cases this Map will be empty, which
    // means no fuzzy subtype checking will happen in fragmentMatches.
    __publicField(this, "fuzzySubtypes", /* @__PURE__ */ new Map());
    __publicField(this, "cache");
    __publicField(this, "rootIdsByTypename", {});
    __publicField(this, "rootTypenamesById", {});
    __publicField(this, "usingPossibleTypes", false);
    this.config = config;
    this.config = {
      dataIdFromObject: defaultDataIdFromObject,
      ...config
    };
    this.cache = this.config.cache;
    this.setRootTypename("Query");
    this.setRootTypename("Mutation");
    this.setRootTypename("Subscription");
    if (config.possibleTypes) {
      this.addPossibleTypes(config.possibleTypes);
    }
    if (config.typePolicies) {
      this.addTypePolicies(config.typePolicies);
    }
  }
  identify(object, partialContext) {
    var _a2;
    const policies = this;
    const typename = partialContext && (partialContext.typename || ((_a2 = partialContext.storeObject) == null ? void 0 : _a2.__typename)) || object.__typename;
    if (typename === this.rootTypenamesById.ROOT_QUERY) {
      return ["ROOT_QUERY"];
    }
    const storeObject = partialContext && partialContext.storeObject || object;
    const context = {
      ...partialContext,
      typename,
      storeObject,
      readField: partialContext && partialContext.readField || ((...args) => {
        const options = normalizeReadFieldOptions(args, storeObject);
        return policies.readField(options, {
          store: policies.cache["data"],
          variables: options.variables
        });
      })
    };
    let id;
    const policy = typename && this.getTypePolicy(typename);
    let keyFn = policy && policy.keyFn || this.config.dataIdFromObject;
    disableWarningsSlot.withValue(true, () => {
      while (keyFn) {
        const specifierOrId = keyFn({ ...object, ...storeObject }, context);
        if (isArray(specifierOrId)) {
          keyFn = keyFieldsFnFromSpecifier(specifierOrId);
        } else {
          id = specifierOrId;
          break;
        }
      }
    });
    id = id ? String(id) : void 0;
    return context.keyObject ? [id, context.keyObject] : [id];
  }
  addTypePolicies(typePolicies) {
    Object.keys(typePolicies).forEach((typename) => {
      const { queryType, mutationType, subscriptionType, ...incoming } = typePolicies[typename];
      if (queryType)
        this.setRootTypename("Query", typename);
      if (mutationType)
        this.setRootTypename("Mutation", typename);
      if (subscriptionType)
        this.setRootTypename("Subscription", typename);
      if (hasOwn.call(this.toBeAdded, typename)) {
        this.toBeAdded[typename].push(incoming);
      } else {
        this.toBeAdded[typename] = [incoming];
      }
    });
  }
  updateTypePolicy(typename, incoming, existingFieldPolicies) {
    const existing = this.getTypePolicy(typename);
    const { keyFields, fields } = incoming;
    function setMerge(existing2, merge) {
      existing2.merge = typeof merge === "function" ? merge : merge === true ? mergeTrueFn : merge === false ? mergeFalseFn : existing2.merge;
    }
    setMerge(existing, incoming.merge);
    existing.keyFn = // Pass false to disable normalization for this typename.
    keyFields === false ? nullKeyFieldsFn : isArray(keyFields) ? keyFieldsFnFromSpecifier(keyFields) : typeof keyFields === "function" ? keyFields : existing.keyFn;
    if (fields) {
      Object.keys(fields).forEach((fieldName) => {
        let existing2 = existingFieldPolicies[fieldName];
        if (!existing2 || (existing2 == null ? void 0 : existing2.typename) !== typename) {
          existing2 = existingFieldPolicies[fieldName] = { typename };
        }
        const incoming2 = fields[fieldName];
        if (typeof incoming2 === "function") {
          existing2.read = incoming2;
        } else {
          const { keyArgs, read, merge } = incoming2;
          existing2.keyFn = // Pass false to disable argument-based differentiation of
          // field identities.
          keyArgs === false ? simpleKeyArgsFn : isArray(keyArgs) ? keyArgsFnFromSpecifier(keyArgs) : typeof keyArgs === "function" ? keyArgs : existing2.keyFn;
          if (typeof read === "function") {
            existing2.read = read;
          }
          setMerge(existing2, merge);
        }
        if (existing2.read && existing2.merge) {
          existing2.keyFn = existing2.keyFn || simpleKeyArgsFn;
        }
      });
    }
  }
  setRootTypename(which, typename = which) {
    const rootId = "ROOT_" + which.toUpperCase();
    const old = this.rootTypenamesById[rootId];
    if (typename !== old) {
      invariant(!old || old === which, 100, which);
      if (old)
        delete this.rootIdsByTypename[old];
      this.rootIdsByTypename[typename] = rootId;
      this.rootTypenamesById[rootId] = typename;
    }
  }
  addPossibleTypes(possibleTypes) {
    this.usingPossibleTypes = true;
    Object.keys(possibleTypes).forEach((supertype) => {
      this.getSupertypeSet(supertype, true);
      possibleTypes[supertype].forEach((subtype) => {
        this.getSupertypeSet(subtype, true).add(supertype);
        const match = subtype.match(TypeOrFieldNameRegExp);
        if (!match || match[0] !== subtype) {
          this.fuzzySubtypes.set(subtype, new RegExp(subtype));
        }
      });
    });
  }
  getTypePolicy(typename) {
    if (!hasOwn.call(this.typePolicies, typename)) {
      const policy = this.typePolicies[typename] = {};
      policy.fields = {};
      let supertypes = this.supertypeMap.get(typename);
      if (!supertypes && this.fuzzySubtypes.size) {
        supertypes = this.getSupertypeSet(typename, true);
        this.fuzzySubtypes.forEach((regExp, fuzzy) => {
          if (regExp.test(typename)) {
            const fuzzySupertypes = this.supertypeMap.get(fuzzy);
            if (fuzzySupertypes) {
              fuzzySupertypes.forEach((supertype) => supertypes.add(supertype));
            }
          }
        });
      }
      if (supertypes && supertypes.size) {
        supertypes.forEach((supertype) => {
          const { fields, ...rest } = this.getTypePolicy(supertype);
          Object.assign(policy, rest);
          Object.assign(policy.fields, fields);
        });
      }
    }
    const inbox = this.toBeAdded[typename];
    if (inbox && inbox.length) {
      inbox.splice(0).forEach((policy) => {
        this.updateTypePolicy(typename, policy, this.typePolicies[typename].fields);
      });
    }
    return this.typePolicies[typename];
  }
  getFieldPolicy(typename, fieldName) {
    if (typename) {
      return this.getTypePolicy(typename).fields[fieldName];
    }
  }
  getSupertypeSet(subtype, createIfMissing) {
    let supertypeSet = this.supertypeMap.get(subtype);
    if (!supertypeSet && createIfMissing) {
      this.supertypeMap.set(subtype, supertypeSet = /* @__PURE__ */ new Set());
    }
    return supertypeSet;
  }
  fragmentMatches(fragment, typename, result, variables) {
    if (!fragment.typeCondition)
      return true;
    if (!typename)
      return false;
    const supertype = fragment.typeCondition.name.value;
    if (typename === supertype)
      return true;
    if (this.usingPossibleTypes && this.supertypeMap.has(supertype)) {
      const typenameSupertypeSet = this.getSupertypeSet(typename, true);
      const workQueue = [typenameSupertypeSet];
      const maybeEnqueue = (subtype) => {
        const supertypeSet = this.getSupertypeSet(subtype, false);
        if (supertypeSet && supertypeSet.size && workQueue.indexOf(supertypeSet) < 0) {
          workQueue.push(supertypeSet);
        }
      };
      let needToCheckFuzzySubtypes = !!(result && this.fuzzySubtypes.size);
      let checkingFuzzySubtypes = false;
      for (let i = 0; i < workQueue.length; ++i) {
        const supertypeSet = workQueue[i];
        if (supertypeSet.has(supertype)) {
          if (!typenameSupertypeSet.has(supertype)) {
            if (checkingFuzzySubtypes) {
              __DEV__ && invariant.warn(101, typename, supertype);
            }
            typenameSupertypeSet.add(supertype);
          }
          return true;
        }
        supertypeSet.forEach(maybeEnqueue);
        if (needToCheckFuzzySubtypes && // Start checking fuzzy subtypes only after exhausting all
        // non-fuzzy subtypes (after the final iteration of the loop).
        i === workQueue.length - 1 && // We could wait to compare fragment.selectionSet to result
        // after we verify the supertype, but this check is often less
        // expensive than that search, and we will have to do the
        // comparison anyway whenever we find a potential match.
        selectionSetMatchesResult(fragment.selectionSet, result, variables)) {
          needToCheckFuzzySubtypes = false;
          checkingFuzzySubtypes = true;
          this.fuzzySubtypes.forEach((regExp, fuzzyString) => {
            const match = typename.match(regExp);
            if (match && match[0] === typename) {
              maybeEnqueue(fuzzyString);
            }
          });
        }
      }
    }
    return false;
  }
  hasKeyArgs(typename, fieldName) {
    const policy = this.getFieldPolicy(typename, fieldName);
    return !!(policy && policy.keyFn);
  }
  getStoreFieldName(fieldSpec) {
    const { typename, fieldName } = fieldSpec;
    const policy = this.getFieldPolicy(typename, fieldName);
    let storeFieldName;
    let keyFn = policy && policy.keyFn;
    if (keyFn && typename) {
      const context = {
        typename,
        fieldName,
        field: fieldSpec.field || null,
        variables: fieldSpec.variables
      };
      const args = argsFromFieldSpecifier(fieldSpec);
      while (keyFn) {
        const specifierOrString = keyFn(args, context);
        if (isArray(specifierOrString)) {
          keyFn = keyArgsFnFromSpecifier(specifierOrString);
        } else {
          storeFieldName = specifierOrString || fieldName;
          break;
        }
      }
    }
    if (storeFieldName === void 0) {
      storeFieldName = fieldSpec.field ? storeKeyNameFromField(fieldSpec.field, fieldSpec.variables) : getStoreKeyName(fieldName, argsFromFieldSpecifier(fieldSpec));
    }
    if (storeFieldName === false) {
      return fieldName;
    }
    return fieldName === fieldNameFromStoreName(storeFieldName) ? storeFieldName : fieldName + ":" + storeFieldName;
  }
  readField(options, context) {
    const objectOrReference = options.from;
    if (!objectOrReference)
      return;
    const nameOrField = options.field || options.fieldName;
    if (!nameOrField)
      return;
    if (options.typename === void 0) {
      const typename = context.store.getFieldValue(objectOrReference, "__typename");
      if (typename)
        options.typename = typename;
    }
    const storeFieldName = this.getStoreFieldName(options);
    const fieldName = fieldNameFromStoreName(storeFieldName);
    const existing = context.store.getFieldValue(objectOrReference, storeFieldName);
    const policy = this.getFieldPolicy(options.typename, fieldName);
    const read = policy && policy.read;
    if (read) {
      const readOptions = makeFieldFunctionOptions(this, objectOrReference, options, context, context.store.getStorage(isReference(objectOrReference) ? objectOrReference.__ref : objectOrReference, storeFieldName));
      return cacheSlot.withValue(this.cache, read, [
        existing,
        readOptions
      ]);
    }
    return existing;
  }
  getReadFunction(typename, fieldName) {
    const policy = this.getFieldPolicy(typename, fieldName);
    return policy && policy.read;
  }
  getMergeFunction(parentTypename, fieldName, childTypename) {
    let policy = this.getFieldPolicy(parentTypename, fieldName);
    let merge = policy && policy.merge;
    if (!merge && childTypename) {
      policy = this.getTypePolicy(childTypename);
      merge = policy && policy.merge;
    }
    return merge;
  }
  runMergeFunction(existing, incoming, { field, typename, merge }, context, storage) {
    if (merge === mergeTrueFn) {
      return makeMergeObjectsFunction(context.store)(existing, incoming);
    }
    if (merge === mergeFalseFn) {
      return incoming;
    }
    if (context.overwrite) {
      existing = void 0;
    }
    return merge(existing, incoming, makeFieldFunctionOptions(
      this,
      // Unlike options.readField for read functions, we do not fall
      // back to the current object if no foreignObjOrRef is provided,
      // because it's not clear what the current object should be for
      // merge functions: the (possibly undefined) existing object, or
      // the incoming object? If you think your merge function needs
      // to read sibling fields in order to produce a new value for
      // the current field, you might want to rethink your strategy,
      // because that's a recipe for making merge behavior sensitive
      // to the order in which fields are written into the cache.
      // However, readField(name, ref) is useful for merge functions
      // that need to deduplicate child objects and references.
      void 0,
      {
        typename,
        fieldName: field.name.value,
        field,
        variables: context.variables
      },
      context,
      storage || {}
    ));
  }
};
function makeFieldFunctionOptions(policies, objectOrReference, fieldSpec, context, storage) {
  const storeFieldName = policies.getStoreFieldName(fieldSpec);
  const fieldName = fieldNameFromStoreName(storeFieldName);
  const variables = fieldSpec.variables || context.variables;
  const { toReference, canRead } = context.store;
  return {
    args: argsFromFieldSpecifier(fieldSpec),
    field: fieldSpec.field || null,
    fieldName,
    storeFieldName,
    variables,
    isReference,
    toReference,
    storage,
    cache: policies.cache,
    canRead,
    readField(...args) {
      return policies.readField(normalizeReadFieldOptions(args, objectOrReference, variables), context);
    },
    mergeObjects: makeMergeObjectsFunction(context.store)
  };
}
function normalizeReadFieldOptions(readFieldArgs, objectOrReference, variables) {
  const { 0: fieldNameOrOptions, 1: from3, length: argc } = readFieldArgs;
  let options;
  if (typeof fieldNameOrOptions === "string") {
    options = {
      fieldName: fieldNameOrOptions,
      // Default to objectOrReference only when no second argument was
      // passed for the from parameter, not when undefined is explicitly
      // passed as the second argument.
      from: argc > 1 ? from3 : objectOrReference
    };
  } else {
    options = { ...fieldNameOrOptions };
    if (!hasOwn.call(options, "from")) {
      options.from = objectOrReference;
    }
  }
  if (__DEV__ && options.from === void 0) {
    __DEV__ && invariant.warn(102, stringifyForDisplay(Array.from(readFieldArgs)));
  }
  if (void 0 === options.variables) {
    options.variables = variables;
  }
  return options;
}
function makeMergeObjectsFunction(store) {
  return function mergeObjects(existing, incoming) {
    if (isArray(existing) || isArray(incoming)) {
      throw newInvariantError(103);
    }
    if (isNonNullObject(existing) && isNonNullObject(incoming)) {
      const eType = store.getFieldValue(existing, "__typename");
      const iType = store.getFieldValue(incoming, "__typename");
      const typesDiffer = eType && iType && eType !== iType;
      if (typesDiffer) {
        return incoming;
      }
      if (isReference(existing) && storeValueIsStoreObject(incoming)) {
        store.merge(existing.__ref, incoming);
        return existing;
      }
      if (storeValueIsStoreObject(existing) && isReference(incoming)) {
        store.merge(existing, incoming.__ref);
        return incoming;
      }
      if (storeValueIsStoreObject(existing) && storeValueIsStoreObject(incoming)) {
        return { ...existing, ...incoming };
      }
    }
    return incoming;
  };
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/cache/inmemory/readFromStore.js
function execSelectionSetKeyArgs(options) {
  return [options.selectionSet, options.objectOrReference, options.context];
}
var StoreReader = class {
  constructor(config) {
    // cached version of executeSelectionSet
    __publicField(this, "executeSelectionSet");
    // cached version of executeSubSelectedArray
    __publicField(this, "executeSubSelectedArray");
    __publicField(this, "config");
    __publicField(this, "knownResults", /* @__PURE__ */ new WeakMap());
    this.config = config;
    this.executeSelectionSet = wrap((options) => {
      const peekArgs = execSelectionSetKeyArgs(options);
      const other = this.executeSelectionSet.peek(...peekArgs);
      if (other) {
        return other;
      }
      maybeDependOnExistenceOfEntity(options.context.store, options.enclosingRef.__ref);
      return this.execSelectionSetImpl(options);
    }, {
      max: cacheSizes["inMemoryCache.executeSelectionSet"] || 5e4,
      keyArgs: execSelectionSetKeyArgs,
      // Note that the parameters of makeCacheKey are determined by the
      // array returned by keyArgs.
      makeCacheKey(selectionSet, parent, context) {
        if (supportsResultCaching(context.store)) {
          return context.store.makeCacheKey(selectionSet, isReference(parent) ? parent.__ref : parent, context.varString);
        }
      }
    });
    this.executeSubSelectedArray = wrap((options) => {
      maybeDependOnExistenceOfEntity(options.context.store, options.enclosingRef.__ref);
      return this.execSubSelectedArrayImpl(options);
    }, {
      max: cacheSizes["inMemoryCache.executeSubSelectedArray"] || 1e4,
      makeCacheKey({ field, array, context }) {
        if (supportsResultCaching(context.store)) {
          return context.store.makeCacheKey(field, array, context.varString);
        }
      }
    });
  }
  /**
   * Given a store and a query, return as much of the result as possible and
   * identify if any data was missing from the store.
   */
  diffQueryAgainstStore({ store, query, rootId = "ROOT_QUERY", variables, returnPartialData = true }) {
    const policies = this.config.cache.policies;
    variables = {
      ...getDefaultValues(getQueryDefinition(query)),
      ...variables
    };
    const rootRef = makeReference(rootId);
    const execResult = this.executeSelectionSet({
      selectionSet: getMainDefinition(query).selectionSet,
      objectOrReference: rootRef,
      enclosingRef: rootRef,
      context: {
        store,
        query,
        policies,
        variables,
        varString: canonicalStringify(variables),
        ...extractFragmentContext(query, this.config.fragments)
      }
    });
    let missing;
    if (execResult.missing) {
      missing = new MissingFieldError(firstMissing(execResult.missing), execResult.missing, query, variables);
    }
    const complete = !missing;
    const { result } = execResult;
    return {
      result: complete || returnPartialData ? Object.keys(result).length === 0 ? null : result : null,
      complete,
      missing
    };
  }
  isFresh(result, parent, selectionSet, context) {
    if (supportsResultCaching(context.store) && this.knownResults.get(result) === selectionSet) {
      const latest = this.executeSelectionSet.peek(selectionSet, parent, context);
      if (latest && result === latest.result) {
        return true;
      }
    }
    return false;
  }
  // Uncached version of executeSelectionSet.
  execSelectionSetImpl({ selectionSet, objectOrReference, enclosingRef, context }) {
    if (isReference(objectOrReference) && !context.policies.rootTypenamesById[objectOrReference.__ref] && !context.store.has(objectOrReference.__ref)) {
      return {
        result: {},
        missing: `Dangling reference to missing ${objectOrReference.__ref} object`
      };
    }
    const { variables, policies, store } = context;
    const typename = store.getFieldValue(objectOrReference, "__typename");
    const objectsToMerge = [];
    let missing;
    const missingMerger = new DeepMerger();
    if (typeof typename === "string" && !policies.rootIdsByTypename[typename]) {
      objectsToMerge.push({ __typename: typename });
    }
    function handleMissing(result2, resultName) {
      if (result2.missing) {
        missing = missingMerger.merge(missing, {
          [resultName]: result2.missing
        });
      }
      return result2.result;
    }
    const workSet = new Set(selectionSet.selections);
    workSet.forEach((selection) => {
      if (!shouldInclude(selection, variables))
        return;
      if (isField(selection)) {
        let fieldValue = policies.readField({
          fieldName: selection.name.value,
          field: selection,
          variables: context.variables,
          from: objectOrReference
        }, context);
        const resultName = resultKeyNameFromField(selection);
        if (fieldValue === void 0) {
          if (!addTypenameToDocument.added(selection)) {
            missing = missingMerger.merge(missing, {
              [resultName]: `Can't find field '${selection.name.value}' on ${isReference(objectOrReference) ? objectOrReference.__ref + " object" : "object " + JSON.stringify(objectOrReference, null, 2)}`
            });
          }
        } else if (isArray(fieldValue)) {
          if (fieldValue.length > 0) {
            fieldValue = handleMissing(this.executeSubSelectedArray({
              field: selection,
              array: fieldValue,
              enclosingRef,
              context
            }), resultName);
          }
        } else if (!selection.selectionSet) {
        } else if (fieldValue != null) {
          fieldValue = handleMissing(this.executeSelectionSet({
            selectionSet: selection.selectionSet,
            objectOrReference: fieldValue,
            enclosingRef: isReference(fieldValue) ? fieldValue : enclosingRef,
            context
          }), resultName);
        }
        if (fieldValue !== void 0) {
          objectsToMerge.push({ [resultName]: fieldValue });
        }
      } else {
        const fragment = getFragmentFromSelection(selection, context.lookupFragment);
        if (!fragment && selection.kind === Kind.FRAGMENT_SPREAD) {
          throw newInvariantError(104, selection.name.value);
        }
        if (fragment && policies.fragmentMatches(fragment, typename)) {
          fragment.selectionSet.selections.forEach(workSet.add, workSet);
        }
      }
    });
    const result = mergeDeepArray(objectsToMerge);
    const finalResult = { result, missing };
    const frozen = maybeDeepFreeze(finalResult);
    if (frozen.result) {
      this.knownResults.set(frozen.result, selectionSet);
    }
    return frozen;
  }
  // Uncached version of executeSubSelectedArray.
  execSubSelectedArrayImpl({ field, array, enclosingRef, context }) {
    let missing;
    let missingMerger = new DeepMerger();
    function handleMissing(childResult, i) {
      if (childResult.missing) {
        missing = missingMerger.merge(missing, { [i]: childResult.missing });
      }
      return childResult.result;
    }
    if (field.selectionSet) {
      array = array.filter(context.store.canRead);
    }
    array = array.map((item, i) => {
      if (item === null) {
        return null;
      }
      if (isArray(item)) {
        return handleMissing(this.executeSubSelectedArray({
          field,
          array: item,
          enclosingRef,
          context
        }), i);
      }
      if (field.selectionSet) {
        return handleMissing(this.executeSelectionSet({
          selectionSet: field.selectionSet,
          objectOrReference: item,
          enclosingRef: isReference(item) ? item : enclosingRef,
          context
        }), i);
      }
      if (__DEV__) {
        assertSelectionSetForIdValue(context.store, field, item);
      }
      return item;
    });
    return {
      result: array,
      missing
    };
  }
};
function firstMissing(tree) {
  try {
    JSON.stringify(tree, (_, value) => {
      if (typeof value === "string")
        throw value;
      return value;
    });
  } catch (result) {
    return result;
  }
}
function assertSelectionSetForIdValue(store, field, fieldValue) {
  if (!field.selectionSet) {
    const workSet = /* @__PURE__ */ new Set([fieldValue]);
    workSet.forEach((value) => {
      if (isNonNullObject(value)) {
        invariant(
          !isReference(value),
          105,
          getTypenameFromStoreObject(store, value),
          field.name.value
        );
        Object.values(value).forEach(workSet.add, workSet);
      }
    });
  }
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/cache/inmemory/writeToStore.js
function getContextFlavor(context, clientOnly, deferred) {
  const key = `${clientOnly}${deferred}`;
  let flavored = context.flavors.get(key);
  if (!flavored) {
    context.flavors.set(key, flavored = context.clientOnly === clientOnly && context.deferred === deferred ? context : {
      ...context,
      clientOnly,
      deferred
    });
  }
  return flavored;
}
var StoreWriter = class {
  constructor(cache, reader, fragments) {
    __publicField(this, "cache");
    __publicField(this, "reader");
    __publicField(this, "fragments");
    this.cache = cache;
    this.reader = reader;
    this.fragments = fragments;
  }
  writeToStore(store, { query, result, dataId, variables, overwrite }) {
    const operationDefinition = getOperationDefinition(query);
    const merger = makeProcessedFieldsMerger();
    variables = {
      ...getDefaultValues(operationDefinition),
      ...variables
    };
    const context = {
      store,
      written: {},
      merge(existing, incoming) {
        return merger.merge(existing, incoming);
      },
      variables,
      varString: canonicalStringify(variables),
      ...extractFragmentContext(query, this.fragments),
      overwrite: !!overwrite,
      incomingById: /* @__PURE__ */ new Map(),
      clientOnly: false,
      deferred: false,
      flavors: /* @__PURE__ */ new Map()
    };
    const ref = this.processSelectionSet({
      result: result || {},
      dataId,
      selectionSet: operationDefinition.selectionSet,
      mergeTree: { map: /* @__PURE__ */ new Map() },
      context
    });
    if (!isReference(ref)) {
      throw newInvariantError(106, result);
    }
    context.incomingById.forEach(({ storeObject, mergeTree, fieldNodeSet }, dataId2) => {
      const entityRef = makeReference(dataId2);
      if (mergeTree && mergeTree.map.size) {
        const applied = this.applyMerges(mergeTree, entityRef, storeObject, context);
        if (isReference(applied)) {
          return;
        }
        storeObject = applied;
      }
      if (__DEV__ && !context.overwrite) {
        const fieldsWithSelectionSets = {};
        fieldNodeSet.forEach((field) => {
          if (field.selectionSet) {
            fieldsWithSelectionSets[field.name.value] = true;
          }
        });
        const hasSelectionSet = (storeFieldName) => fieldsWithSelectionSets[fieldNameFromStoreName(storeFieldName)] === true;
        const hasMergeFunction = (storeFieldName) => {
          const childTree = mergeTree && mergeTree.map.get(storeFieldName);
          return Boolean(childTree && childTree.info && childTree.info.merge);
        };
        Object.keys(storeObject).forEach((storeFieldName) => {
          if (hasSelectionSet(storeFieldName) && !hasMergeFunction(storeFieldName)) {
            warnAboutDataLoss(entityRef, storeObject, storeFieldName, context.store);
          }
        });
      }
      store.merge(dataId2, storeObject);
    });
    store.retain(ref.__ref);
    return ref;
  }
  processSelectionSet({
    dataId,
    result,
    selectionSet,
    context,
    // This object allows processSelectionSet to report useful information
    // to its callers without explicitly returning that information.
    mergeTree
  }) {
    const { policies } = this.cache;
    let incoming = {};
    const typename = dataId && policies.rootTypenamesById[dataId] || getTypenameFromResult(result, selectionSet, context.fragmentMap) || dataId && context.store.get(dataId, "__typename");
    if ("string" === typeof typename) {
      incoming.__typename = typename;
    }
    const readField = (...args) => {
      const options = normalizeReadFieldOptions(args, incoming, context.variables);
      if (isReference(options.from)) {
        const info = context.incomingById.get(options.from.__ref);
        if (info) {
          const result2 = policies.readField({
            ...options,
            from: info.storeObject
          }, context);
          if (result2 !== void 0) {
            return result2;
          }
        }
      }
      return policies.readField(options, context);
    };
    const fieldNodeSet = /* @__PURE__ */ new Set();
    this.flattenFields(
      selectionSet,
      result,
      // This WriteContext will be the default context value for fields returned
      // by the flattenFields method, but some fields may be assigned a modified
      // context, depending on the presence of @client and other directives.
      context,
      typename
    ).forEach((context2, field) => {
      const resultFieldKey = resultKeyNameFromField(field);
      const value = result[resultFieldKey];
      fieldNodeSet.add(field);
      if (value !== void 0) {
        const storeFieldName = policies.getStoreFieldName({
          typename,
          fieldName: field.name.value,
          field,
          variables: context2.variables
        });
        const childTree = getChildMergeTree(mergeTree, storeFieldName);
        let incomingValue = this.processFieldValue(
          value,
          field,
          // Reset context.clientOnly and context.deferred to their default
          // values before processing nested selection sets.
          field.selectionSet ? getContextFlavor(context2, false, false) : context2,
          childTree
        );
        let childTypename;
        if (field.selectionSet && (isReference(incomingValue) || storeValueIsStoreObject(incomingValue))) {
          childTypename = readField("__typename", incomingValue);
        }
        const merge = policies.getMergeFunction(typename, field.name.value, childTypename);
        if (merge) {
          childTree.info = {
            // TODO Check compatibility against any existing childTree.field?
            field,
            typename,
            merge
          };
        } else {
          maybeRecycleChildMergeTree(mergeTree, storeFieldName);
        }
        incoming = context2.merge(incoming, {
          [storeFieldName]: incomingValue
        });
      } else if (__DEV__ && !context2.clientOnly && !context2.deferred && !addTypenameToDocument.added(field) && // If the field has a read function, it may be a synthetic field or
      // provide a default value, so its absence from the written data should
      // not be cause for alarm.
      !policies.getReadFunction(typename, field.name.value)) {
        invariant.error(107, resultKeyNameFromField(field), result);
      }
    });
    try {
      const [id, keyObject] = policies.identify(result, {
        typename,
        selectionSet,
        fragmentMap: context.fragmentMap,
        storeObject: incoming,
        readField
      });
      dataId = dataId || id;
      if (keyObject) {
        incoming = context.merge(incoming, keyObject);
      }
    } catch (e) {
      if (!dataId)
        throw e;
    }
    if ("string" === typeof dataId) {
      const dataRef = makeReference(dataId);
      const sets = context.written[dataId] || (context.written[dataId] = []);
      if (sets.indexOf(selectionSet) >= 0)
        return dataRef;
      sets.push(selectionSet);
      if (this.reader && this.reader.isFresh(result, dataRef, selectionSet, context)) {
        return dataRef;
      }
      const previous = context.incomingById.get(dataId);
      if (previous) {
        previous.storeObject = context.merge(previous.storeObject, incoming);
        previous.mergeTree = mergeMergeTrees(previous.mergeTree, mergeTree);
        fieldNodeSet.forEach((field) => previous.fieldNodeSet.add(field));
      } else {
        context.incomingById.set(dataId, {
          storeObject: incoming,
          // Save a reference to mergeTree only if it is not empty, because
          // empty MergeTrees may be recycled by maybeRecycleChildMergeTree and
          // reused for entirely different parts of the result tree.
          mergeTree: mergeTreeIsEmpty(mergeTree) ? void 0 : mergeTree,
          fieldNodeSet
        });
      }
      return dataRef;
    }
    return incoming;
  }
  processFieldValue(value, field, context, mergeTree) {
    if (!field.selectionSet || value === null) {
      return __DEV__ ? cloneDeep(value) : value;
    }
    if (isArray(value)) {
      return value.map((item, i) => {
        const value2 = this.processFieldValue(item, field, context, getChildMergeTree(mergeTree, i));
        maybeRecycleChildMergeTree(mergeTree, i);
        return value2;
      });
    }
    return this.processSelectionSet({
      result: value,
      selectionSet: field.selectionSet,
      context,
      mergeTree
    });
  }
  // Implements https://spec.graphql.org/draft/#sec-Field-Collection, but with
  // some additions for tracking @client and @defer directives.
  flattenFields(selectionSet, result, context, typename = getTypenameFromResult(result, selectionSet, context.fragmentMap)) {
    const fieldMap = /* @__PURE__ */ new Map();
    const { policies } = this.cache;
    const limitingTrie = new Trie(false);
    (function flatten(selectionSet2, inheritedContext) {
      const visitedNode = limitingTrie.lookup(
        selectionSet2,
        // Because we take inheritedClientOnly and inheritedDeferred into
        // consideration here (in addition to selectionSet), it's possible for
        // the same selection set to be flattened more than once, if it appears
        // in the query with different @client and/or @directive configurations.
        inheritedContext.clientOnly,
        inheritedContext.deferred
      );
      if (visitedNode.visited)
        return;
      visitedNode.visited = true;
      selectionSet2.selections.forEach((selection) => {
        if (!shouldInclude(selection, context.variables))
          return;
        let { clientOnly, deferred } = inheritedContext;
        if (
          // Since the presence of @client or @defer on this field can only
          // cause clientOnly or deferred to become true, we can skip the
          // forEach loop if both clientOnly and deferred are already true.
          !(clientOnly && deferred) && isNonEmptyArray(selection.directives)
        ) {
          selection.directives.forEach((dir) => {
            const name = dir.name.value;
            if (name === "client")
              clientOnly = true;
            if (name === "defer") {
              const args = argumentsObjectFromField(dir, context.variables);
              if (!args || args.if !== false) {
                deferred = true;
              }
            }
          });
        }
        if (isField(selection)) {
          const existing = fieldMap.get(selection);
          if (existing) {
            clientOnly = clientOnly && existing.clientOnly;
            deferred = deferred && existing.deferred;
          }
          fieldMap.set(selection, getContextFlavor(context, clientOnly, deferred));
        } else {
          const fragment = getFragmentFromSelection(selection, context.lookupFragment);
          if (!fragment && selection.kind === Kind.FRAGMENT_SPREAD) {
            throw newInvariantError(108, selection.name.value);
          }
          if (fragment && policies.fragmentMatches(fragment, typename, result, context.variables)) {
            flatten(fragment.selectionSet, getContextFlavor(context, clientOnly, deferred));
          }
        }
      });
    })(selectionSet, context);
    return fieldMap;
  }
  applyMerges(mergeTree, existing, incoming, context, getStorageArgs) {
    if (mergeTree.map.size && !isReference(incoming)) {
      const e = (
        // Items in the same position in different arrays are not
        // necessarily related to each other, so when incoming is an array
        // we process its elements as if there was no existing data.
        !isArray(incoming) && // Likewise, existing must be either a Reference or a StoreObject
        // in order for its fields to be safe to merge with the fields of
        // the incoming object.
        (isReference(existing) || storeValueIsStoreObject(existing)) ? existing : void 0
      );
      const i = incoming;
      if (e && !getStorageArgs) {
        getStorageArgs = [isReference(e) ? e.__ref : e];
      }
      let changedFields;
      const getValue = (from3, name) => {
        return isArray(from3) ? typeof name === "number" ? from3[name] : void 0 : context.store.getFieldValue(from3, String(name));
      };
      mergeTree.map.forEach((childTree, storeFieldName) => {
        const eVal = getValue(e, storeFieldName);
        const iVal = getValue(i, storeFieldName);
        if (void 0 === iVal)
          return;
        if (getStorageArgs) {
          getStorageArgs.push(storeFieldName);
        }
        const aVal = this.applyMerges(childTree, eVal, iVal, context, getStorageArgs);
        if (aVal !== iVal) {
          changedFields = changedFields || /* @__PURE__ */ new Map();
          changedFields.set(storeFieldName, aVal);
        }
        if (getStorageArgs) {
          invariant(getStorageArgs.pop() === storeFieldName);
        }
      });
      if (changedFields) {
        incoming = isArray(i) ? i.slice(0) : { ...i };
        changedFields.forEach((value, name) => {
          incoming[name] = value;
        });
      }
    }
    if (mergeTree.info) {
      return this.cache.policies.runMergeFunction(existing, incoming, mergeTree.info, context, getStorageArgs && context.store.getStorage(...getStorageArgs));
    }
    return incoming;
  }
};
var emptyMergeTreePool = [];
function getChildMergeTree({ map: map2 }, name) {
  if (!map2.has(name)) {
    map2.set(name, emptyMergeTreePool.pop() || { map: /* @__PURE__ */ new Map() });
  }
  return map2.get(name);
}
function mergeMergeTrees(left, right) {
  if (left === right || !right || mergeTreeIsEmpty(right))
    return left;
  if (!left || mergeTreeIsEmpty(left))
    return right;
  const info = left.info && right.info ? {
    ...left.info,
    ...right.info
  } : left.info || right.info;
  const needToMergeMaps = left.map.size && right.map.size;
  const map2 = needToMergeMaps ? /* @__PURE__ */ new Map() : left.map.size ? left.map : right.map;
  const merged = { info, map: map2 };
  if (needToMergeMaps) {
    const remainingRightKeys = new Set(right.map.keys());
    left.map.forEach((leftTree, key) => {
      merged.map.set(key, mergeMergeTrees(leftTree, right.map.get(key)));
      remainingRightKeys.delete(key);
    });
    remainingRightKeys.forEach((key) => {
      merged.map.set(key, mergeMergeTrees(right.map.get(key), left.map.get(key)));
    });
  }
  return merged;
}
function mergeTreeIsEmpty(tree) {
  return !tree || !(tree.info || tree.map.size);
}
function maybeRecycleChildMergeTree({ map: map2 }, name) {
  const childTree = map2.get(name);
  if (childTree && mergeTreeIsEmpty(childTree)) {
    emptyMergeTreePool.push(childTree);
    map2.delete(name);
  }
}
var warnings = /* @__PURE__ */ new Set();
function warnAboutDataLoss(existingRef, incomingObj, storeFieldName, store) {
  const getChild = (objOrRef) => {
    const child = store.getFieldValue(objOrRef, storeFieldName);
    return typeof child === "object" && child;
  };
  const existing = getChild(existingRef);
  if (!existing)
    return;
  const incoming = getChild(incomingObj);
  if (!incoming)
    return;
  if (isReference(existing))
    return;
  if (equal(existing, incoming))
    return;
  if (Object.keys(existing).every((key) => store.getFieldValue(incoming, key) !== void 0)) {
    return;
  }
  const parentType = store.getFieldValue(existingRef, "__typename") || store.getFieldValue(incomingObj, "__typename");
  const fieldName = fieldNameFromStoreName(storeFieldName);
  const typeDotName = `${parentType}.${fieldName}`;
  if (warnings.has(typeDotName))
    return;
  warnings.add(typeDotName);
  const childTypenames = [];
  if (!isArray(existing) && !isArray(incoming)) {
    [existing, incoming].forEach((child) => {
      const typename = store.getFieldValue(child, "__typename");
      if (typeof typename === "string" && !childTypenames.includes(typename)) {
        childTypenames.push(typename);
      }
    });
  }
  __DEV__ && invariant.warn(109, fieldName, parentType, childTypenames.length ? "either ensure all objects of type " + childTypenames.join(" and ") + " have an ID or a custom merge function, or " : "", typeDotName, { ...existing }, { ...incoming });
}
function getTypenameFromResult(result, selectionSet, fragmentMap) {
  let fragments;
  for (const selection of selectionSet.selections) {
    if (isField(selection)) {
      if (selection.name.value === "__typename") {
        return result[resultKeyNameFromField(selection)];
      }
    } else if (fragments) {
      fragments.push(selection);
    } else {
      fragments = [selection];
    }
  }
  if (typeof result.__typename === "string") {
    return result.__typename;
  }
  if (fragments) {
    for (const selection of fragments) {
      const typename = getTypenameFromResult(result, getFragmentFromSelection(selection, fragmentMap).selectionSet, fragmentMap);
      if (typeof typename === "string") {
        return typename;
      }
    }
  }
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/cache/inmemory/inMemoryCache.js
var InMemoryCache = class extends ApolloCache {
  constructor(config = {}) {
    super();
    __publicField(this, "data");
    __publicField(this, "optimisticData");
    __publicField(this, "config");
    __publicField(this, "watches", /* @__PURE__ */ new Set());
    __publicField(this, "storeReader");
    __publicField(this, "storeWriter");
    __publicField(this, "addTypenameTransform", new DocumentTransform(addTypenameToDocument));
    __publicField(this, "maybeBroadcastWatch");
    // Override the default value, since InMemoryCache result objects are frozen
    // in development and expected to remain logically immutable in production.
    __publicField(this, "assumeImmutableResults", true);
    // Dynamically imported code can augment existing typePolicies or
    // possibleTypes by calling cache.policies.addTypePolicies or
    // cache.policies.addPossibletypes.
    __publicField(this, "policies");
    __publicField(this, "makeVar", makeVar);
    __publicField(this, "txCount", 0);
    this.config = normalizeConfig(config);
    this.policies = new Policies({
      cache: this,
      dataIdFromObject: this.config.dataIdFromObject,
      possibleTypes: this.config.possibleTypes,
      typePolicies: this.config.typePolicies
    });
    this.init();
  }
  init() {
    const rootStore = this.data = new EntityStore.Root({
      policies: this.policies,
      resultCaching: this.config.resultCaching
    });
    this.optimisticData = rootStore.stump;
    this.resetResultCache();
  }
  resetResultCache() {
    const { fragments } = this.config;
    this.addTypenameTransform.resetCache();
    fragments == null ? void 0 : fragments.resetCaches();
    this.storeWriter = new StoreWriter(this, this.storeReader = new StoreReader({ cache: this, fragments }), fragments);
    this.maybeBroadcastWatch = wrap((c, options) => {
      return this.broadcastWatch(c, options);
    }, {
      max: cacheSizes["inMemoryCache.maybeBroadcastWatch"] || 5e3,
      makeCacheKey: (c) => {
        const store = c.optimistic ? this.optimisticData : this.data;
        if (supportsResultCaching(store)) {
          const { optimistic, id, variables } = c;
          return store.makeCacheKey(
            c.query,
            // Different watches can have the same query, optimistic
            // status, rootId, and variables, but if their callbacks are
            // different, the (identical) result needs to be delivered to
            // each distinct callback. The easiest way to achieve that
            // separation is to include c.callback in the cache key for
            // maybeBroadcastWatch calls. See issue #5733.
            c.callback,
            canonicalStringify({ optimistic, id, variables })
          );
        }
      }
    });
    (/* @__PURE__ */ new Set([this.data.group, this.optimisticData.group])).forEach((group) => group.resetCaching());
  }
  restore(data) {
    this.init();
    if (data)
      this.data.replace(data);
    return this;
  }
  extract(optimistic = false) {
    return (optimistic ? this.optimisticData : this.data).extract();
  }
  read(options) {
    const {
      // Since read returns data or null, without any additional metadata
      // about whether/where there might have been missing fields, the
      // default behavior cannot be returnPartialData = true (like it is
      // for the diff method), since defaulting to true would violate the
      // integrity of the T in the return type. However, partial data may
      // be useful in some cases, so returnPartialData:true may be
      // specified explicitly.
      returnPartialData = false
    } = options;
    return this.storeReader.diffQueryAgainstStore({
      ...options,
      store: options.optimistic ? this.optimisticData : this.data,
      config: this.config,
      returnPartialData
    }).result;
  }
  write(options) {
    try {
      ++this.txCount;
      return this.storeWriter.writeToStore(this.data, options);
    } finally {
      if (!--this.txCount && options.broadcast !== false) {
        this.broadcastWatches();
      }
    }
  }
  modify(options) {
    if (hasOwn.call(options, "id") && !options.id) {
      return false;
    }
    const store = options.optimistic ? this.optimisticData : this.data;
    try {
      ++this.txCount;
      return store.modify(options.id || "ROOT_QUERY", options.fields, false);
    } finally {
      if (!--this.txCount && options.broadcast !== false) {
        this.broadcastWatches();
      }
    }
  }
  diff(options) {
    return this.storeReader.diffQueryAgainstStore({
      ...options,
      store: options.optimistic ? this.optimisticData : this.data,
      rootId: options.id || "ROOT_QUERY",
      config: this.config
    });
  }
  watch(watch) {
    if (!this.watches.size) {
      recallCache(this);
    }
    this.watches.add(watch);
    if (watch.immediate) {
      this.maybeBroadcastWatch(watch);
    }
    return () => {
      if (this.watches.delete(watch) && !this.watches.size) {
        forgetCache(this);
      }
      this.maybeBroadcastWatch.forget(watch);
    };
  }
  gc(options) {
    canonicalStringify.reset();
    print.reset();
    const ids = this.optimisticData.gc();
    if (options && !this.txCount && options.resetResultCache) {
      this.resetResultCache();
    }
    return ids;
  }
  // Call this method to ensure the given root ID remains in the cache after
  // garbage collection, along with its transitive child entities. Note that
  // the cache automatically retains all directly written entities. By default,
  // the retainment persists after optimistic updates are removed. Pass true
  // for the optimistic argument if you would prefer for the retainment to be
  // discarded when the top-most optimistic layer is removed. Returns the
  // resulting (non-negative) retainment count.
  retain(rootId, optimistic) {
    return (optimistic ? this.optimisticData : this.data).retain(rootId);
  }
  // Call this method to undo the effect of the retain method, above. Once the
  // retainment count falls to zero, the given ID will no longer be preserved
  // during garbage collection, though it may still be preserved by other safe
  // entities that refer to it. Returns the resulting (non-negative) retainment
  // count, in case that's useful.
  release(rootId, optimistic) {
    return (optimistic ? this.optimisticData : this.data).release(rootId);
  }
  // Returns the canonical ID for a given StoreObject, obeying typePolicies
  // and keyFields (and dataIdFromObject, if you still use that). At minimum,
  // the object must contain a __typename and any primary key fields required
  // to identify entities of that type. If you pass a query result object, be
  // sure that none of the primary key fields have been renamed by aliasing.
  // If you pass a Reference object, its __ref ID string will be returned.
  identify(object) {
    if (isReference(object))
      return object.__ref;
    try {
      return this.policies.identify(object)[0];
    } catch (e) {
      __DEV__ && invariant.warn(e);
    }
  }
  evict(options) {
    if (!options.id) {
      if (hasOwn.call(options, "id")) {
        return false;
      }
      options = { ...options, id: "ROOT_QUERY" };
    }
    try {
      ++this.txCount;
      return this.optimisticData.evict(options, this.data);
    } finally {
      if (!--this.txCount && options.broadcast !== false) {
        this.broadcastWatches();
      }
    }
  }
  reset(options) {
    this.init();
    canonicalStringify.reset();
    if (options && options.discardWatches) {
      this.watches.forEach((watch) => this.maybeBroadcastWatch.forget(watch));
      this.watches.clear();
      forgetCache(this);
    } else {
      this.broadcastWatches();
    }
    return Promise.resolve();
  }
  removeOptimistic(idToRemove) {
    const newOptimisticData = this.optimisticData.removeLayer(idToRemove);
    if (newOptimisticData !== this.optimisticData) {
      this.optimisticData = newOptimisticData;
      this.broadcastWatches();
    }
  }
  batch(options) {
    const { update, optimistic = true, removeOptimistic, onWatchUpdated } = options;
    let updateResult;
    const perform = (layer) => {
      const { data, optimisticData } = this;
      ++this.txCount;
      if (layer) {
        this.data = this.optimisticData = layer;
      }
      try {
        return updateResult = update(this);
      } finally {
        --this.txCount;
        this.data = data;
        this.optimisticData = optimisticData;
      }
    };
    const alreadyDirty = /* @__PURE__ */ new Set();
    if (onWatchUpdated && !this.txCount) {
      this.broadcastWatches({
        ...options,
        onWatchUpdated(watch) {
          alreadyDirty.add(watch);
          return false;
        }
      });
    }
    if (typeof optimistic === "string") {
      this.optimisticData = this.optimisticData.addLayer(optimistic, perform);
    } else if (optimistic === false) {
      perform(this.data);
    } else {
      perform();
    }
    if (typeof removeOptimistic === "string") {
      this.optimisticData = this.optimisticData.removeLayer(removeOptimistic);
    }
    if (onWatchUpdated && alreadyDirty.size) {
      this.broadcastWatches({
        ...options,
        onWatchUpdated(watch, diff) {
          const result = onWatchUpdated.call(this, watch, diff);
          if (result !== false) {
            alreadyDirty.delete(watch);
          }
          return result;
        }
      });
      if (alreadyDirty.size) {
        alreadyDirty.forEach((watch) => this.maybeBroadcastWatch.dirty(watch));
      }
    } else {
      this.broadcastWatches(options);
    }
    return updateResult;
  }
  performTransaction(update, optimisticId) {
    return this.batch({
      update,
      optimistic: optimisticId || optimisticId !== null
    });
  }
  transformDocument(document) {
    return this.addTypenameTransform.transformDocument(this.addFragmentsToDocument(document));
  }
  fragmentMatches(fragment, typename) {
    return this.policies.fragmentMatches(fragment, typename);
  }
  lookupFragment(fragmentName) {
    var _a2;
    return ((_a2 = this.config.fragments) == null ? void 0 : _a2.lookup(fragmentName)) || null;
  }
  broadcastWatches(options) {
    if (!this.txCount) {
      this.watches.forEach((c) => this.maybeBroadcastWatch(c, options));
    }
  }
  addFragmentsToDocument(document) {
    const { fragments } = this.config;
    return fragments ? fragments.transform(document) : document;
  }
  // This method is wrapped by maybeBroadcastWatch, which is called by
  // broadcastWatches, so that we compute and broadcast results only when
  // the data that would be broadcast might have changed. It would be
  // simpler to check for changes after recomputing a result but before
  // broadcasting it, but this wrapping approach allows us to skip both
  // the recomputation and the broadcast, in most cases.
  broadcastWatch(c, options) {
    const { lastDiff } = c;
    const diff = this.diff(c);
    if (options) {
      if (c.optimistic && typeof options.optimistic === "string") {
        diff.fromOptimisticTransaction = true;
      }
      if (options.onWatchUpdated && options.onWatchUpdated.call(this, c, diff, lastDiff) === false) {
        return;
      }
    }
    if (!lastDiff || !equal(lastDiff.result, diff.result)) {
      c.callback(c.lastDiff = diff, lastDiff);
    }
  }
};
if (__DEV__) {
  InMemoryCache.prototype.getMemoryInternals = getInMemoryCacheMemoryInternals;
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/core/networkStatus.js
var NetworkStatus;
(function(NetworkStatus2) {
  NetworkStatus2[NetworkStatus2["loading"] = 1] = "loading";
  NetworkStatus2[NetworkStatus2["setVariables"] = 2] = "setVariables";
  NetworkStatus2[NetworkStatus2["fetchMore"] = 3] = "fetchMore";
  NetworkStatus2[NetworkStatus2["refetch"] = 4] = "refetch";
  NetworkStatus2[NetworkStatus2["poll"] = 6] = "poll";
  NetworkStatus2[NetworkStatus2["ready"] = 7] = "ready";
  NetworkStatus2[NetworkStatus2["error"] = 8] = "error";
  NetworkStatus2[NetworkStatus2["streaming"] = 9] = "streaming";
})(NetworkStatus || (NetworkStatus = {}));

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/core/ObservableQuery.js
var { assign, hasOwnProperty } = Object;
var uninitialized = {
  loading: true,
  networkStatus: NetworkStatus.loading,
  data: void 0,
  dataState: "empty",
  partial: true
};
var empty = {
  loading: false,
  networkStatus: NetworkStatus.ready,
  data: void 0,
  dataState: "empty",
  partial: true
};
var _a;
_a = Symbol.observable;
var ObservableQuery = class {
  constructor({ queryManager, options, transformedQuery = queryManager.transform(options.query) }) {
    __publicField(this, "options");
    __publicField(this, "queryName");
    __publicField(this, "variablesUnknown", false);
    /**
    * @internal will be read and written from `QueryInfo`
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    __publicField(this, "_lastWrite");
    __publicField(this, "unsubscribeFromCache");
    __publicField(this, "input");
    __publicField(this, "subject");
    __publicField(this, "isTornDown");
    __publicField(this, "queryManager");
    __publicField(this, "subscriptions", /* @__PURE__ */ new Set());
    /**
     * If an `ObservableQuery` is created with a `network-only` fetch policy,
     * it should actually start receiving cache updates, but not before it has
     * received the first result from the network.
     */
    __publicField(this, "waitForNetworkResult");
    __publicField(this, "lastQuery");
    __publicField(this, "linkSubscription");
    __publicField(this, "pollingInfo");
    // We can't use Observable['subscribe'] here as the type as it conflicts with
    // the ability to infer T from Subscribable<T>. This limits the surface area
    // to the non-deprecated signature which works properly with type inference.
    /**
     * Subscribes to the `ObservableQuery`.
     * @param observerOrNext - Either an RxJS `Observer` with some or all callback methods,
     * or the `next` handler that is called for each value emitted from the subscribed Observable.
     * @returns A subscription reference to the registered handlers.
     */
    __publicField(this, "subscribe");
    /**
     * Used to stitch together functional operators into a chain.
     *
     * @example
     *
     * ```ts
     * import { filter, map } from 'rxjs';
     *
     * observableQuery
     *   .pipe(
     *     filter(...),
     *     map(...),
     *   )
     *   .subscribe(x => console.log(x));
     * ```
     *
     * @returns The Observable result of all the operators having been called
     * in the order they were passed in.
     */
    __publicField(this, "pipe");
    __publicField(this, _a);
    __publicField(this, "@@observable");
    __publicField(this, "stableLastResult");
    // Turns polling on or off based on this.options.pollInterval.
    __publicField(this, "didWarnCacheOnlyPolling", false);
    __publicField(this, "dirty", false);
    __publicField(this, "notifyTimeout");
    __publicField(this, "activeOperations", /* @__PURE__ */ new Set());
    __publicField(this, "operator", filterMap((notification) => {
      const { query, variables, meta } = notification;
      if (notification.source === "setResult") {
        return { query, variables, result: notification.value, meta };
      }
      if (notification.kind === "C" || !isEqualQuery(notification, this)) {
        return;
      }
      let result;
      const previous = this.subject.getValue();
      if (notification.source === "cache") {
        result = notification.value;
        if (result.networkStatus === NetworkStatus.ready && result.partial && (!this.options.returnPartialData || previous.result.networkStatus === NetworkStatus.error) && this.options.fetchPolicy !== "cache-only") {
          return;
        }
      } else if (notification.source === "network") {
        if (this.waitForNetworkResult) {
          this.waitForNetworkResult = false;
          this.resubscribeCache();
        }
        result = notification.kind === "E" ? {
          ...isEqualQuery(previous, notification) ? previous.result : { data: void 0, dataState: "empty", partial: true },
          error: notification.error,
          networkStatus: NetworkStatus.error,
          loading: false
        } : notification.value;
        if (notification.kind === "E" && result.dataState === "streaming") {
          result.dataState = "complete";
        }
        if (result.error) {
          meta.shouldEmit = 1;
        }
      } else if (notification.source === "newNetworkStatus") {
        const baseResult = isEqualQuery(previous, notification) ? previous.result : this.getInitialResult(meta.fetchPolicy);
        const { resetError } = notification.value;
        const error = resetError ? void 0 : baseResult.error;
        const networkStatus = error ? NetworkStatus.error : NetworkStatus.ready;
        result = {
          ...baseResult,
          error,
          networkStatus
        };
      }
      invariant(result);
      if (!result.error)
        delete result.error;
      result.networkStatus = this.calculateNetworkStatus(result.networkStatus);
      result.loading = isNetworkRequestInFlight(result.networkStatus);
      result = this.maskResult(result);
      return { query, variables, result, meta };
    }));
    this.queryManager = queryManager;
    this.waitForNetworkResult = options.fetchPolicy === "network-only";
    this.isTornDown = false;
    this.subscribeToMore = this.subscribeToMore.bind(this);
    this.maskResult = this.maskResult.bind(this);
    const { watchQuery: { fetchPolicy: defaultFetchPolicy = "cache-first" } = {} } = queryManager.defaultOptions;
    const {
      fetchPolicy = defaultFetchPolicy,
      // Make sure we don't store "standby" as the initialFetchPolicy.
      initialFetchPolicy = fetchPolicy === "standby" ? defaultFetchPolicy : fetchPolicy
    } = options;
    if (options[variablesUnknownSymbol]) {
      invariant(fetchPolicy === "standby", 77);
      this.variablesUnknown = true;
    }
    this.lastQuery = transformedQuery;
    this.options = {
      ...options,
      // Remember the initial options.fetchPolicy so we can revert back to this
      // policy when variables change. This information can also be specified
      // (or overridden) by providing options.initialFetchPolicy explicitly.
      initialFetchPolicy,
      // This ensures this.options.fetchPolicy always has a string value, in
      // case options.fetchPolicy was not provided.
      fetchPolicy,
      variables: this.getVariablesWithDefaults(options.variables)
    };
    this.initializeObservablesQueue();
    this["@@observable"] = () => this;
    if (Symbol.observable) {
      this[Symbol.observable] = () => this;
    }
    const opDef = getOperationDefinition(this.query);
    this.queryName = opDef && opDef.name && opDef.name.value;
  }
  // The `query` computed property will always reflect the document transformed
  // by the last run query. `this.options.query` will always reflect the raw
  // untransformed query to ensure document transforms with runtime conditionals
  // are run on the original document.
  get query() {
    return this.lastQuery;
  }
  /**
   * An object containing the variables that were provided for the query.
   */
  get variables() {
    return this.options.variables;
  }
  get networkStatus() {
    return this.subject.getValue().result.networkStatus;
  }
  initializeObservablesQueue() {
    this.subject = new BehaviorSubject({
      query: this.query,
      variables: this.variables,
      result: uninitialized,
      meta: {}
    });
    const observable = this.subject.pipe(tap({
      subscribe: () => {
        if (!this.subject.observed) {
          this.reobserve();
          setTimeout(() => this.updatePolling());
        }
      },
      unsubscribe: () => {
        if (!this.subject.observed) {
          this.tearDownQuery();
        }
      }
    }), filterMap(({ query, variables, result: current, meta }, context) => {
      const { shouldEmit } = meta;
      if (current === uninitialized) {
        context.previous = void 0;
        context.previousVariables = void 0;
      }
      if (this.options.fetchPolicy === "standby" || shouldEmit === 2)
        return;
      if (shouldEmit === 1)
        return emit();
      const { previous, previousVariables } = context;
      if (previous) {
        const documentInfo = this.queryManager.getDocumentInfo(query);
        const dataMasking = this.queryManager.dataMasking;
        const maskedQuery = dataMasking ? documentInfo.nonReactiveQuery : query;
        const resultIsEqual = dataMasking || documentInfo.hasNonreactiveDirective ? equalByQuery(maskedQuery, previous, current, variables) : equal(previous, current);
        if (resultIsEqual && equal(previousVariables, variables)) {
          return;
        }
      }
      if (shouldEmit === 3 && (!this.options.notifyOnNetworkStatusChange || equal(previous, current))) {
        return;
      }
      return emit();
      function emit() {
        context.previous = current;
        context.previousVariables = variables;
        return current;
      }
    }, () => ({})));
    this.pipe = observable.pipe.bind(observable);
    this.subscribe = observable.subscribe.bind(observable);
    this.input = new Subject();
    this.input.complete = () => {
    };
    this.input.pipe(this.operator).subscribe(this.subject);
  }
  /**
  * @internal
  * 
  * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
  */
  getCacheDiff({ optimistic = true } = {}) {
    return this.queryManager.cache.diff({
      query: this.query,
      variables: this.variables,
      returnPartialData: true,
      optimistic
    });
  }
  getInitialResult(initialFetchPolicy) {
    const fetchPolicy = this.queryManager.prioritizeCacheValues ? "cache-first" : initialFetchPolicy || this.options.fetchPolicy;
    const cacheResult = () => {
      const diff = this.getCacheDiff();
      const data = this.options.returnPartialData || diff.complete ? diff.result ?? void 0 : void 0;
      return this.maskResult({
        data,
        dataState: diff.complete ? "complete" : data === void 0 ? "empty" : "partial",
        loading: !diff.complete,
        networkStatus: diff.complete ? NetworkStatus.ready : NetworkStatus.loading,
        partial: !diff.complete
      });
    };
    switch (fetchPolicy) {
      case "cache-only": {
        return {
          ...cacheResult(),
          loading: false,
          networkStatus: NetworkStatus.ready
        };
      }
      case "cache-first":
        return cacheResult();
      case "cache-and-network":
        return {
          ...cacheResult(),
          loading: true,
          networkStatus: NetworkStatus.loading
        };
      case "standby":
        return empty;
      default:
        return uninitialized;
    }
  }
  resubscribeCache() {
    var _a2;
    const { variables, fetchPolicy } = this.options;
    const query = this.query;
    const shouldUnsubscribe = fetchPolicy === "standby" || fetchPolicy === "no-cache" || this.waitForNetworkResult;
    const shouldResubscribe = !isEqualQuery({ query, variables }, this.unsubscribeFromCache) && !this.waitForNetworkResult;
    if (shouldUnsubscribe || shouldResubscribe) {
      (_a2 = this.unsubscribeFromCache) == null ? void 0 : _a2.call(this);
    }
    if (shouldUnsubscribe || !shouldResubscribe) {
      return;
    }
    const watch = {
      query,
      variables,
      optimistic: true,
      watcher: this,
      callback: (diff) => {
        const info = this.queryManager.getDocumentInfo(query);
        if (info.hasClientExports || info.hasForcedResolvers) {
          watch.lastDiff = void 0;
        }
        if (watch.lastOwnDiff === diff) {
          return;
        }
        const { result: previousResult } = this.subject.getValue();
        if (!diff.complete && // If we are trying to deliver an incomplete cache result, we avoid
        // reporting it if the query has errored, otherwise we let the broadcast try
        // and repair the partial result by refetching the query. This check avoids
        // a situation where a query that errors and another succeeds with
        // overlapping data does not report the partial data result to the errored
        // query.
        //
        // See https://github.com/apollographql/apollo-client/issues/11400 for more
        // information on this issue.
        (previousResult.error || // Prevent to schedule a notify directly after the `ObservableQuery`
        // has been `reset` (which will set the `previousResult` to `uninitialized` or `empty`)
        // as in those cases, `resetCache` will manually call `refetch` with more intentional timing.
        previousResult === uninitialized || previousResult === empty)) {
          return;
        }
        if (!equal(previousResult.data, diff.result)) {
          this.scheduleNotify();
        }
      }
    };
    const cancelWatch = this.queryManager.cache.watch(watch);
    this.unsubscribeFromCache = Object.assign(() => {
      this.unsubscribeFromCache = void 0;
      cancelWatch();
    }, { query, variables });
  }
  getCurrentResult() {
    const { result: current } = this.subject.getValue();
    let value = (
      // if the `current` result is in an error state, we will always return that
      // error state, even if we have no observers
      current.networkStatus === NetworkStatus.error || // if we have observers, we are watching the cache and
      // this.subject.getValue() will always be up to date
      this.hasObservers() || // if we are using a `no-cache` fetch policy in which case this
      // `ObservableQuery` cannot have been updated from the outside - in
      // that case, we prefer to keep the current value
      this.options.fetchPolicy === "no-cache" ? current : this.getInitialResult()
    );
    if (value === uninitialized) {
      value = this.getInitialResult();
    }
    if (!equal(this.stableLastResult, value)) {
      this.stableLastResult = value;
    }
    return this.stableLastResult;
  }
  /**
   * Update the variables of this observable query, and fetch the new results.
   * This method should be preferred over `setVariables` in most use cases.
   *
   * Returns a `ResultPromise` with an additional `.retain()` method. Calling
   * `.retain()` keeps the network operation running even if the `ObservableQuery`
   * no longer requires the result.
   *
   * Note: `refetch()` guarantees that a value will be emitted from the
   * observable, even if the result is deep equal to the previous value.
   *
   * @param variables - The new set of variables. If there are missing variables,
   * the previous values of those variables will be used.
   */
  refetch(variables) {
    var _a2;
    const { fetchPolicy } = this.options;
    const reobserveOptions = {
      // Always disable polling for refetches.
      pollInterval: 0
    };
    if (fetchPolicy === "no-cache") {
      reobserveOptions.fetchPolicy = "no-cache";
    } else {
      reobserveOptions.fetchPolicy = "network-only";
    }
    if (__DEV__ && variables && hasOwnProperty.call(variables, "variables")) {
      const queryDef = getQueryDefinition(this.query);
      const vars = queryDef.variableDefinitions;
      if (!vars || !vars.some((v) => v.variable.name.value === "variables")) {
        __DEV__ && invariant.warn(78, variables, ((_a2 = queryDef.name) == null ? void 0 : _a2.value) || queryDef);
      }
    }
    if (variables && !equal(this.variables, variables)) {
      reobserveOptions.variables = this.options.variables = this.getVariablesWithDefaults({ ...this.variables, ...variables });
    }
    this._lastWrite = void 0;
    return this._reobserve(reobserveOptions, {
      newNetworkStatus: NetworkStatus.refetch
    });
  }
  fetchMore({ query, variables, context, errorPolicy, updateQuery }) {
    invariant(
      this.options.fetchPolicy !== "cache-only",
      79,
      getOperationName(this.query, "(anonymous)")
    );
    const combinedOptions = {
      ...compact(this.options, { errorPolicy: "none" }, {
        query,
        context,
        errorPolicy
      }),
      variables: query ? variables : {
        ...this.variables,
        ...variables
      },
      // The fetchMore request goes immediately to the network and does
      // not automatically write its result to the cache (hence no-cache
      // instead of network-only), because we allow the caller of
      // fetchMore to provide an updateQuery callback that determines how
      // the data gets written to the cache.
      fetchPolicy: "no-cache",
      notifyOnNetworkStatusChange: this.options.notifyOnNetworkStatusChange
    };
    combinedOptions.query = this.transformDocument(combinedOptions.query);
    this.lastQuery = query ? this.transformDocument(this.options.query) : combinedOptions.query;
    let wasUpdated = false;
    const isCached = this.options.fetchPolicy !== "no-cache";
    if (!isCached) {
      invariant(updateQuery, 80);
    }
    const { finalize: finalize2, pushNotification } = this.pushOperation(NetworkStatus.fetchMore);
    pushNotification({
      source: "newNetworkStatus",
      kind: "N",
      value: {}
    }, {
      shouldEmit: 3
      /* EmitBehavior.networkStatusChange */
    });
    return this.queryManager.fetchQuery(combinedOptions, NetworkStatus.fetchMore).then((fetchMoreResult) => {
      finalize2();
      if (isCached) {
        const lastDiff = this.getCacheDiff();
        this.queryManager.cache.batch({
          update: (cache) => {
            if (updateQuery) {
              cache.updateQuery({
                query: this.query,
                variables: this.variables,
                returnPartialData: true,
                optimistic: false
              }, (previous) => updateQuery(previous, {
                fetchMoreResult: fetchMoreResult.data,
                variables: combinedOptions.variables
              }));
            } else {
              cache.writeQuery({
                query: combinedOptions.query,
                variables: combinedOptions.variables,
                data: fetchMoreResult.data
              });
            }
          },
          onWatchUpdated: (watch, diff) => {
            if (watch.watcher === this && !equal(diff.result, lastDiff.result)) {
              wasUpdated = true;
            }
          }
        });
      } else {
        const lastResult = this.getCurrentResult();
        const data = updateQuery(lastResult.data, {
          fetchMoreResult: fetchMoreResult.data,
          variables: combinedOptions.variables
        });
        pushNotification({
          kind: "N",
          value: {
            ...lastResult,
            networkStatus: NetworkStatus.ready,
            // will be overwritten anyways, just here for types sake
            loading: false,
            data,
            dataState: lastResult.dataState === "streaming" ? "streaming" : "complete"
          },
          source: "network"
        });
      }
      return this.maskResult(fetchMoreResult);
    }).finally(() => {
      finalize2();
      if (isCached && !wasUpdated) {
        pushNotification({
          kind: "N",
          source: "newNetworkStatus",
          value: {}
        }, {
          shouldEmit: 1
          /* EmitBehavior.force */
        });
      }
    });
  }
  // XXX the subscription variables are separate from the query variables.
  // if you want to update subscription variables, right now you have to do that separately,
  // and you can only do it by stopping the subscription and then subscribing again with new variables.
  /**
   * A function that enables you to execute a [subscription](https://www.apollographql.com/docs/react/data/subscriptions/), usually to subscribe to specific fields that were included in the query.
   *
   * This function returns _another_ function that you can call to terminate the subscription.
   */
  subscribeToMore(options) {
    const subscription = this.queryManager.startGraphQLSubscription({
      query: options.document,
      variables: options.variables,
      context: options.context
    }).subscribe({
      next: (subscriptionData) => {
        const { updateQuery, onError } = options;
        const { error } = subscriptionData;
        if (error) {
          if (onError) {
            onError(error);
          } else {
            invariant.error(81, error);
          }
          return;
        }
        if (updateQuery) {
          this.updateQuery((previous, updateOptions) => updateQuery(previous, {
            subscriptionData,
            ...updateOptions
          }));
        }
      }
    });
    this.subscriptions.add(subscription);
    return () => {
      if (this.subscriptions.delete(subscription)) {
        subscription.unsubscribe();
      }
    };
  }
  /**
  * @internal
  * 
  * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
  */
  applyOptions(newOptions) {
    const mergedOptions = compact(this.options, newOptions || {});
    assign(this.options, mergedOptions);
    this.updatePolling();
  }
  /**
   * Update the variables of this observable query, and fetch the new results
   * if they've changed. Most users should prefer `refetch` instead of
   * `setVariables` in order to to be properly notified of results even when
   * they come from the cache.
   *
   * Note: `setVariables()` guarantees that a value will be emitted from the
   * observable, even if the result is deeply equal to the previous value.
   *
   * Note: the promise will resolve with the last emitted result
   * when either the variables match the current variables or there
   * are no subscribers to the query.
   *
   * @param variables - The new set of variables. If there are missing variables,
   * the previous values of those variables will be used.
   */
  async setVariables(variables) {
    variables = this.getVariablesWithDefaults(variables);
    if (equal(this.variables, variables)) {
      return toQueryResult(this.getCurrentResult());
    }
    this.options.variables = variables;
    if (!this.hasObservers()) {
      return toQueryResult(this.getCurrentResult());
    }
    return this._reobserve({
      // Reset options.fetchPolicy to its original value.
      fetchPolicy: this.options.initialFetchPolicy,
      variables
    }, { newNetworkStatus: NetworkStatus.setVariables });
  }
  /**
   * A function that enables you to update the query's cached result without executing a followup GraphQL operation.
   *
   * See [using updateQuery and updateFragment](https://www.apollographql.com/docs/react/caching/cache-interaction/#using-updatequery-and-updatefragment) for additional information.
   */
  updateQuery(mapFn) {
    const { queryManager } = this;
    const { result, complete } = this.getCacheDiff({ optimistic: false });
    const newResult = mapFn(result, {
      variables: this.variables,
      complete: !!complete,
      previousData: result
    });
    if (newResult) {
      queryManager.cache.writeQuery({
        query: this.options.query,
        data: newResult,
        variables: this.variables
      });
      queryManager.broadcastQueries();
    }
  }
  /**
   * A function that instructs the query to begin re-executing at a specified interval (in milliseconds).
   */
  startPolling(pollInterval) {
    this.options.pollInterval = pollInterval;
    this.updatePolling();
  }
  /**
   * A function that instructs the query to stop polling after a previous call to `startPolling`.
   */
  stopPolling() {
    this.options.pollInterval = 0;
    this.updatePolling();
  }
  // Update options.fetchPolicy according to options.nextFetchPolicy.
  applyNextFetchPolicy(reason, options) {
    if (options.nextFetchPolicy) {
      const { fetchPolicy = "cache-first", initialFetchPolicy = fetchPolicy } = options;
      if (fetchPolicy === "standby") {
      } else if (typeof options.nextFetchPolicy === "function") {
        options.fetchPolicy = options.nextFetchPolicy.call(options, fetchPolicy, { reason, options, observable: this, initialFetchPolicy });
      } else if (reason === "variables-changed") {
        options.fetchPolicy = initialFetchPolicy;
      } else {
        options.fetchPolicy = options.nextFetchPolicy;
      }
    }
    return options.fetchPolicy;
  }
  fetch(options, networkStatus, fetchQuery, operator) {
    const initialFetchPolicy = this.options.fetchPolicy;
    options.context ?? (options.context = {});
    let synchronouslyEmitted = false;
    const onCacheHit = () => {
      synchronouslyEmitted = true;
    };
    const fetchQueryOperator = (
      // we cannot use `tap` here, since it allows only for a "before subscription"
      // hook with `subscribe` and we care for "directly before and after subscription"
      (source) => new Observable((subscriber) => {
        try {
          return source.subscribe({
            next(value) {
              synchronouslyEmitted = true;
              subscriber.next(value);
            },
            error: (error) => subscriber.error(error),
            complete: () => subscriber.complete()
          });
        } finally {
          if (!synchronouslyEmitted) {
            operation.override = networkStatus;
            this.input.next({
              kind: "N",
              source: "newNetworkStatus",
              value: {
                resetError: true
              },
              query,
              variables,
              meta: {
                shouldEmit: 3,
                /*
                 * The moment this notification is emitted, `nextFetchPolicy`
                 * might already have switched from a `network-only` to a
                 * `cache-something` policy, so we want to ensure that the
                 * loading state emit doesn't accidentally read from the cache
                 * in those cases.
                 */
                fetchPolicy: initialFetchPolicy
              }
            });
          }
        }
      })
    );
    let { observable, fromLink } = this.queryManager.fetchObservableWithInfo(options, {
      networkStatus,
      query: fetchQuery,
      onCacheHit,
      fetchQueryOperator,
      observableQuery: this
    });
    const { query, variables } = this;
    const operation = {
      abort: () => {
        subscription.unsubscribe();
      },
      query,
      variables
    };
    this.activeOperations.add(operation);
    let forceFirstValueEmit = networkStatus == NetworkStatus.refetch || networkStatus == NetworkStatus.setVariables;
    observable = observable.pipe(operator, share());
    const subscription = observable.pipe(tap({
      next: (notification) => {
        if (notification.source === "newNetworkStatus" || notification.kind === "N" && notification.value.loading) {
          operation.override = networkStatus;
        } else {
          delete operation.override;
        }
      },
      finalize: () => this.activeOperations.delete(operation)
    })).subscribe({
      next: (value) => {
        const meta = {};
        if (forceFirstValueEmit && value.kind === "N" && "loading" in value.value && !value.value.loading) {
          forceFirstValueEmit = false;
          meta.shouldEmit = 1;
        }
        this.input.next({ ...value, query, variables, meta });
      }
    });
    return { fromLink, subscription, observable };
  }
  updatePolling() {
    if (this.queryManager.ssrMode) {
      return;
    }
    const { pollingInfo, options: { fetchPolicy, pollInterval } } = this;
    if (!pollInterval || !this.hasObservers() || fetchPolicy === "cache-only") {
      if (__DEV__) {
        if (!this.didWarnCacheOnlyPolling && pollInterval && fetchPolicy === "cache-only") {
          __DEV__ && invariant.warn(82, getOperationName(this.query, "(anonymous)"));
          this.didWarnCacheOnlyPolling = true;
        }
      }
      this.cancelPolling();
      return;
    }
    if ((pollingInfo == null ? void 0 : pollingInfo.interval) === pollInterval) {
      return;
    }
    const info = pollingInfo || (this.pollingInfo = {});
    info.interval = pollInterval;
    const maybeFetch = () => {
      var _a2, _b;
      if (this.pollingInfo) {
        if (!isNetworkRequestInFlight(this.networkStatus) && !((_b = (_a2 = this.options).skipPollAttempt) == null ? void 0 : _b.call(_a2))) {
          this._reobserve({
            // Most fetchPolicy options don't make sense to use in a polling context, as
            // users wouldn't want to be polling the cache directly. However, network-only and
            // no-cache are both useful for when the user wants to control whether or not the
            // polled results are written to the cache.
            fetchPolicy: this.options.initialFetchPolicy === "no-cache" ? "no-cache" : "network-only"
          }, {
            newNetworkStatus: NetworkStatus.poll
          }).then(poll, poll);
        } else {
          poll();
        }
      }
    };
    const poll = () => {
      const info2 = this.pollingInfo;
      if (info2) {
        clearTimeout(info2.timeout);
        info2.timeout = setTimeout(maybeFetch, info2.interval);
      }
    };
    poll();
  }
  // This differs from stopPolling in that it does not set pollInterval to 0
  cancelPolling() {
    if (this.pollingInfo) {
      clearTimeout(this.pollingInfo.timeout);
      delete this.pollingInfo;
    }
  }
  /**
   * Reevaluate the query, optionally against new options. New options will be
   * merged with the current options when given.
   *
   * Note: `variables` can be reset back to their defaults (typically empty) by calling `reobserve` with
   * `variables: undefined`.
   */
  reobserve(newOptions) {
    return this._reobserve(newOptions);
  }
  _reobserve(newOptions, internalOptions) {
    this.isTornDown = false;
    let { newNetworkStatus } = internalOptions || {};
    this.queryManager.obsQueries.add(this);
    const useDisposableObservable = (
      // Refetching uses a disposable Observable to allow refetches using different
      // options, without permanently altering the options of the
      // original ObservableQuery.
      newNetworkStatus === NetworkStatus.refetch || // Polling uses a disposable Observable so the polling options (which force
      // fetchPolicy to be "network-only" or "no-cache") won't override the original options.
      newNetworkStatus === NetworkStatus.poll
    );
    const oldVariables = this.variables;
    const oldFetchPolicy = this.options.fetchPolicy;
    const mergedOptions = compact(this.options, newOptions || {});
    this.variablesUnknown && (this.variablesUnknown = mergedOptions.fetchPolicy === "standby");
    const options = useDisposableObservable ? (
      // Disposable Observable fetches receive a shallow copy of this.options
      // (merged with newOptions), leaving this.options unmodified.
      mergedOptions
    ) : assign(this.options, mergedOptions);
    const query = this.transformDocument(options.query);
    this.lastQuery = query;
    if (newOptions && "variables" in newOptions) {
      options.variables = this.getVariablesWithDefaults(newOptions.variables);
    }
    if (!useDisposableObservable) {
      this.updatePolling();
      if (newOptions && newOptions.variables && !equal(newOptions.variables, oldVariables) && // Don't mess with the fetchPolicy if it's currently "standby".
      options.fetchPolicy !== "standby" && // If we're changing the fetchPolicy anyway, don't try to change it here
      // using applyNextFetchPolicy. The explicit options.fetchPolicy wins.
      (options.fetchPolicy === oldFetchPolicy || // A `nextFetchPolicy` function has even higher priority, though,
      // so in that case `applyNextFetchPolicy` must be called.
      typeof options.nextFetchPolicy === "function")) {
        this.applyNextFetchPolicy("variables-changed", options);
        if (newNetworkStatus === void 0) {
          newNetworkStatus = NetworkStatus.setVariables;
        }
      }
    }
    const oldNetworkStatus = this.networkStatus;
    if (!newNetworkStatus) {
      newNetworkStatus = NetworkStatus.loading;
      if (oldNetworkStatus !== NetworkStatus.loading && (newOptions == null ? void 0 : newOptions.variables) && !equal(newOptions.variables, oldVariables)) {
        newNetworkStatus = NetworkStatus.setVariables;
      }
      if (options.fetchPolicy === "standby") {
        newNetworkStatus = NetworkStatus.ready;
      }
    }
    if (options.fetchPolicy === "standby") {
      this.cancelPolling();
    }
    this.resubscribeCache();
    const { promise, operator: promiseOperator } = getTrackingOperatorPromise(
      (value) => {
        switch (value.kind) {
          case "E":
            throw value.error;
          case "N":
            if (value.source !== "newNetworkStatus" && !value.value.loading)
              return value.value;
        }
      },
      // This default value should only be used when using a `fetchPolicy` of
      // `standby` since that fetch policy completes without emitting a
      // result. Since we are converting this to a QueryResult type, we
      // omit the extra fields from ApolloQueryResult in the default value.
      options.fetchPolicy === "standby" ? { data: void 0 } : void 0
    );
    const { subscription, observable, fromLink } = this.fetch(options, newNetworkStatus, query, promiseOperator);
    if (!useDisposableObservable && (fromLink || !this.linkSubscription)) {
      if (this.linkSubscription) {
        this.linkSubscription.unsubscribe();
      }
      this.linkSubscription = subscription;
    }
    const ret = Object.assign(preventUnhandledRejection(promise.then((result) => toQueryResult(this.maskResult(result))).finally(() => {
      if (!this.hasObservers() && this.activeOperations.size === 0) {
        this.tearDownQuery();
      }
    })), {
      retain: () => {
        const subscription2 = observable.subscribe({});
        const unsubscribe = () => subscription2.unsubscribe();
        promise.then(unsubscribe, unsubscribe);
        return ret;
      }
    });
    return ret;
  }
  hasObservers() {
    return this.subject.observed;
  }
  /**
   * Tears down the `ObservableQuery` and stops all active operations by sending a `complete` notification.
   */
  stop() {
    this.subject.complete();
    this.initializeObservablesQueue();
    this.tearDownQuery();
  }
  tearDownQuery() {
    var _a2;
    if (this.isTornDown)
      return;
    this.resetNotifications();
    (_a2 = this.unsubscribeFromCache) == null ? void 0 : _a2.call(this);
    if (this.linkSubscription) {
      this.linkSubscription.unsubscribe();
      delete this.linkSubscription;
    }
    this.stopPolling();
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
    this.queryManager.obsQueries.delete(this);
    this.isTornDown = true;
    this.abortActiveOperations();
    this._lastWrite = void 0;
  }
  transformDocument(document) {
    return this.queryManager.transform(document);
  }
  maskResult(result) {
    const masked = this.queryManager.maskOperation({
      document: this.query,
      data: result.data,
      fetchPolicy: this.options.fetchPolicy,
      cause: this
    });
    return masked === result.data ? result : { ...result, data: masked };
  }
  /**
  * @internal
  * 
  * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
  */
  resetNotifications() {
    if (this.notifyTimeout) {
      clearTimeout(this.notifyTimeout);
      this.notifyTimeout = void 0;
    }
    this.dirty = false;
  }
  /**
  * @internal
  * 
  * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
  */
  scheduleNotify() {
    if (this.dirty)
      return;
    this.dirty = true;
    if (!this.notifyTimeout) {
      this.notifyTimeout = setTimeout(() => this.notify(true), 0);
    }
  }
  /**
  * @internal
  * 
  * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
  */
  notify(scheduled = false) {
    if (!scheduled) {
      const info = this.queryManager.getDocumentInfo(this.query);
      if (info.hasClientExports || info.hasForcedResolvers) {
        return;
      }
    }
    const { dirty } = this;
    this.resetNotifications();
    if (dirty && (this.options.fetchPolicy == "cache-only" || this.options.fetchPolicy == "cache-and-network" || !this.activeOperations.size)) {
      const diff = this.getCacheDiff();
      if (
        // `fromOptimisticTransaction` is not available through the `cache.diff`
        // code path, so we need to check it this way
        equal(diff.result, this.getCacheDiff({ optimistic: false }).result)
      ) {
        this.reobserveCacheFirst();
      } else {
        this.input.next({
          kind: "N",
          value: {
            data: diff.result,
            dataState: diff.complete ? "complete" : diff.result ? "partial" : "empty",
            networkStatus: NetworkStatus.ready,
            loading: false,
            error: void 0,
            partial: !diff.complete
          },
          source: "cache",
          query: this.query,
          variables: this.variables,
          meta: {}
        });
      }
    }
  }
  pushOperation(networkStatus) {
    let aborted = false;
    const { query, variables } = this;
    const finalize2 = () => {
      this.activeOperations.delete(operation);
    };
    const operation = {
      override: networkStatus,
      abort: () => {
        aborted = true;
        finalize2();
      },
      query,
      variables
    };
    this.activeOperations.add(operation);
    return {
      finalize: finalize2,
      pushNotification: (notification, additionalMeta) => {
        if (!aborted) {
          this.input.next({
            ...notification,
            query,
            variables,
            meta: { ...additionalMeta }
          });
        }
      }
    };
  }
  calculateNetworkStatus(baseNetworkStatus) {
    if (baseNetworkStatus === NetworkStatus.streaming) {
      return baseNetworkStatus;
    }
    const operation = Array.from(this.activeOperations.values()).reverse().find((operation2) => isEqualQuery(operation2, this) && operation2.override !== void 0);
    return (operation == null ? void 0 : operation.override) ?? baseNetworkStatus;
  }
  abortActiveOperations() {
    this.activeOperations.forEach((operation) => operation.abort());
  }
  /**
  * @internal
  * Called from `clearStore`.
  *
  * - resets the query to its initial state
  * - cancels all active operations and their subscriptions
  * 
  * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
  */
  reset() {
    const resetToEmpty = this.options.fetchPolicy === "cache-only";
    this.setResult(resetToEmpty ? empty : uninitialized, {
      shouldEmit: resetToEmpty ? 1 : 2
    });
    this.abortActiveOperations();
  }
  /**
  * @internal
  * 
  * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
  */
  setResult(result, additionalMeta) {
    this.input.next({
      source: "setResult",
      kind: "N",
      value: result,
      query: this.query,
      variables: this.variables,
      meta: { ...additionalMeta }
    });
  }
  // Reobserve with fetchPolicy effectively set to "cache-first", triggering
  // delivery of any new data from the cache, possibly falling back to the network
  // if any cache data are missing. This allows _complete_ cache results to be
  // delivered without also kicking off unnecessary network requests when
  // this.options.fetchPolicy is "cache-and-network" or "network-only". When
  // this.options.fetchPolicy is any other policy ("cache-first", "cache-only",
  // "standby", or "no-cache"), we call this.reobserve() as usual.
  reobserveCacheFirst() {
    const { fetchPolicy, nextFetchPolicy } = this.options;
    if (fetchPolicy === "cache-and-network" || fetchPolicy === "network-only") {
      this.reobserve({
        fetchPolicy: "cache-first",
        // Use a temporary nextFetchPolicy function that replaces itself with the
        // previous nextFetchPolicy value and returns the original fetchPolicy.
        nextFetchPolicy(currentFetchPolicy, context) {
          this.nextFetchPolicy = nextFetchPolicy;
          if (typeof this.nextFetchPolicy === "function") {
            return this.nextFetchPolicy(currentFetchPolicy, context);
          }
          return fetchPolicy;
        }
      });
    } else {
      this.reobserve();
    }
  }
  getVariablesWithDefaults(variables) {
    return this.queryManager.getVariables(this.query, variables);
  }
};
function logMissingFieldErrors(missing) {
  if (__DEV__ && missing) {
    __DEV__ && invariant.debug(83, missing);
  }
}
function isEqualQuery(a, b) {
  return !!(a && b && a.query === b.query && equal(a.variables, b.variables));
}
function getTrackingOperatorPromise(filterMapCb, defaultValue) {
  let lastValue = defaultValue, resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const operator = tap({
    next(value) {
      try {
        const newValue = filterMapCb(value);
        if (newValue !== void 0) {
          lastValue = newValue;
        }
      } catch (error) {
        reject(error);
      }
    },
    finalize: () => {
      if (lastValue) {
        resolve(lastValue);
      } else {
        const message = "The operation was aborted.";
        const name = "AbortError";
        reject(typeof DOMException !== "undefined" ? new DOMException(message, name) : Object.assign(new Error(message), { name }));
      }
    }
  });
  return { promise, operator };
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/core/QueryInfo.js
var IGNORE = {};
var destructiveMethodCounts = /* @__PURE__ */ new WeakMap();
function wrapDestructiveCacheMethod(cache, methodName) {
  const original = cache[methodName];
  if (typeof original === "function") {
    cache[methodName] = function() {
      destructiveMethodCounts.set(
        cache,
        // The %1e15 allows the count to wrap around to 0 safely every
        // quadrillion evictions, so there's no risk of overflow. To be
        // clear, this is more of a pedantic principle than something
        // that matters in any conceivable practical scenario.
        (destructiveMethodCounts.get(cache) + 1) % 1e15
      );
      return original.apply(this, arguments);
    };
  }
}
var queryInfoIds = /* @__PURE__ */ new WeakMap();
var QueryInfo = class {
  constructor(queryManager, observableQuery) {
    // TODO remove soon - this should be able to be handled by cancelling old operations before starting new ones
    __publicField(this, "lastRequestId", 1);
    __publicField(this, "cache");
    __publicField(this, "queryManager");
    __publicField(this, "id");
    __publicField(this, "observableQuery");
    __publicField(this, "incremental");
    /**
    * @internal
    * For feud-preventing behaviour, `lastWrite` should be shared by all `QueryInfo` instances of an `ObservableQuery`.
    * In the case of a standalone `QueryInfo`, we will keep a local version.
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    __publicField(this, "_lastWrite");
    const cache = this.cache = queryManager.cache;
    const id = (queryInfoIds.get(queryManager) || 0) + 1;
    queryInfoIds.set(queryManager, id);
    this.id = id + "";
    this.observableQuery = observableQuery;
    this.queryManager = queryManager;
    if (!destructiveMethodCounts.has(cache)) {
      destructiveMethodCounts.set(cache, 0);
      wrapDestructiveCacheMethod(cache, "evict");
      wrapDestructiveCacheMethod(cache, "modify");
      wrapDestructiveCacheMethod(cache, "reset");
    }
  }
  get lastWrite() {
    return (this.observableQuery || this)._lastWrite;
  }
  set lastWrite(value) {
    (this.observableQuery || this)._lastWrite = value;
  }
  resetLastWrite() {
    this.lastWrite = void 0;
  }
  shouldWrite(result, variables) {
    const { lastWrite } = this;
    return !(lastWrite && // If cache.evict has been called since the last time we wrote this
    // data into the cache, there's a chance writing this result into
    // the cache will repair what was evicted.
    lastWrite.dmCount === destructiveMethodCounts.get(this.cache) && equal(variables, lastWrite.variables) && equal(result.data, lastWrite.result.data));
  }
  get hasNext() {
    return this.incremental ? this.incremental.hasNext : false;
  }
  maybeHandleIncrementalResult(cacheData, incoming, query) {
    const { incrementalHandler } = this.queryManager;
    if (incrementalHandler.isIncrementalResult(incoming)) {
      this.incremental || (this.incremental = incrementalHandler.startRequest({
        query
      }));
      return this.incremental.handle(cacheData, incoming);
    }
    return incoming;
  }
  markQueryResult(incoming, { document: query, variables, errorPolicy, cacheWriteBehavior }) {
    var _a2;
    const diffOptions = {
      query,
      variables,
      returnPartialData: true,
      optimistic: true
    };
    (_a2 = this.observableQuery) == null ? void 0 : _a2["resetNotifications"]();
    const skipCache = cacheWriteBehavior === 0;
    const lastDiff = skipCache ? void 0 : this.cache.diff(diffOptions);
    let result = this.maybeHandleIncrementalResult(lastDiff == null ? void 0 : lastDiff.result, incoming, query);
    if (skipCache) {
      return result;
    }
    if (shouldWriteResult(result, errorPolicy)) {
      this.cache.batch({
        onWatchUpdated: (watch, diff) => {
          if (watch.watcher === this.observableQuery) {
            watch.lastOwnDiff = diff;
          }
        },
        update: (cache) => {
          if (this.shouldWrite(result, variables)) {
            cache.writeQuery({
              query,
              data: result.data,
              variables,
              overwrite: cacheWriteBehavior === 1
            });
            this.lastWrite = {
              result,
              variables,
              dmCount: destructiveMethodCounts.get(this.cache)
            };
          } else {
            if (lastDiff && lastDiff.complete) {
              result = { ...result, data: lastDiff.result };
              return;
            }
          }
          const diff = cache.diff(diffOptions);
          if (diff.complete) {
            result = { ...result, data: diff.result };
          }
        }
      });
    } else {
      this.lastWrite = void 0;
    }
    return result;
  }
  markMutationResult(incoming, mutation, cache = this.cache) {
    const cacheWrites = [];
    const skipCache = mutation.cacheWriteBehavior === 0;
    let result = this.maybeHandleIncrementalResult(skipCache ? void 0 : cache.diff({
      id: "ROOT_MUTATION",
      // The cache complains if passed a mutation where it expects a
      // query, so we transform mutations and subscriptions to queries
      // (only once, thanks to this.transformCache).
      query: this.queryManager.getDocumentInfo(mutation.document).asQuery,
      variables: mutation.variables,
      optimistic: false,
      returnPartialData: true
    }).result, incoming, mutation.document);
    if (mutation.errorPolicy === "ignore") {
      result = { ...result, errors: [] };
    }
    if (graphQLResultHasError(result) && mutation.errorPolicy === "none") {
      return Promise.resolve(result);
    }
    const getResultWithDataState = () => ({
      ...result,
      dataState: this.hasNext ? "streaming" : "complete"
    });
    if (!skipCache && shouldWriteResult(result, mutation.errorPolicy)) {
      cacheWrites.push({
        result: result.data,
        dataId: "ROOT_MUTATION",
        query: mutation.document,
        variables: mutation.variables
      });
      const { updateQueries } = mutation;
      if (updateQueries) {
        this.queryManager.getObservableQueries("all").forEach((observableQuery) => {
          const queryName = observableQuery && observableQuery.queryName;
          if (!queryName || !Object.hasOwnProperty.call(updateQueries, queryName)) {
            return;
          }
          const updater = updateQueries[queryName];
          const { query: document, variables } = observableQuery;
          const { result: currentQueryResult, complete } = observableQuery.getCacheDiff({ optimistic: false });
          if (complete && currentQueryResult) {
            const nextQueryResult = updater(currentQueryResult, {
              mutationResult: getResultWithDataState(),
              queryName: document && getOperationName(document) || void 0,
              queryVariables: variables
            });
            if (nextQueryResult) {
              cacheWrites.push({
                result: nextQueryResult,
                dataId: "ROOT_QUERY",
                query: document,
                variables
              });
            }
          }
        });
      }
    }
    let refetchQueries = mutation.refetchQueries;
    if (typeof refetchQueries === "function") {
      refetchQueries = refetchQueries(getResultWithDataState());
    }
    if (cacheWrites.length > 0 || (refetchQueries || "").length > 0 || mutation.update || mutation.onQueryUpdated || mutation.removeOptimistic) {
      const results = [];
      this.queryManager.refetchQueries({
        updateCache: (cache2) => {
          if (!skipCache) {
            cacheWrites.forEach((write) => cache2.write(write));
          }
          const { update } = mutation;
          if (update) {
            if (!skipCache) {
              const diff = cache2.diff({
                id: "ROOT_MUTATION",
                // The cache complains if passed a mutation where it expects a
                // query, so we transform mutations and subscriptions to queries
                // (only once, thanks to this.transformCache).
                query: this.queryManager.getDocumentInfo(mutation.document).asQuery,
                variables: mutation.variables,
                optimistic: false,
                returnPartialData: true
              });
              if (diff.complete) {
                result = {
                  ...result,
                  data: diff.result
                };
              }
            }
            if (!this.hasNext) {
              update(cache2, result, {
                context: mutation.context,
                variables: mutation.variables
              });
            }
          }
          if (!skipCache && !mutation.keepRootFields && !this.hasNext) {
            cache2.modify({
              id: "ROOT_MUTATION",
              fields(value, { fieldName, DELETE: DELETE2 }) {
                return fieldName === "__typename" ? value : DELETE2;
              }
            });
          }
        },
        include: refetchQueries,
        // Write the final mutation.result to the root layer of the cache.
        optimistic: false,
        // Remove the corresponding optimistic layer at the same time as we
        // write the final non-optimistic result.
        removeOptimistic: mutation.removeOptimistic,
        // Let the caller of client.mutate optionally determine the refetching
        // behavior for watched queries after the mutation.update function runs.
        // If no onQueryUpdated function was provided for this mutation, pass
        // null instead of undefined to disable the default refetching behavior.
        onQueryUpdated: mutation.onQueryUpdated || null
      }).forEach((result2) => results.push(result2));
      if (mutation.awaitRefetchQueries || mutation.onQueryUpdated) {
        return Promise.all(results).then(() => result);
      }
    }
    return Promise.resolve(result);
  }
  markMutationOptimistic(optimisticResponse, mutation) {
    const data = typeof optimisticResponse === "function" ? optimisticResponse(mutation.variables, { IGNORE }) : optimisticResponse;
    if (data === IGNORE) {
      return false;
    }
    this.cache.recordOptimisticTransaction((cache) => {
      try {
        this.markMutationResult({ data }, mutation, cache);
      } catch (error) {
        invariant.error(error);
      }
    }, this.id);
    return true;
  }
  markSubscriptionResult(result, { document, variables, errorPolicy, cacheWriteBehavior }) {
    if (cacheWriteBehavior !== 0) {
      if (shouldWriteResult(result, errorPolicy)) {
        this.cache.write({
          query: document,
          result: result.data,
          dataId: "ROOT_SUBSCRIPTION",
          variables
        });
      }
      this.queryManager.broadcastQueries();
    }
  }
};
function shouldWriteResult(result, errorPolicy = "none") {
  const ignoreErrors = errorPolicy === "ignore" || errorPolicy === "all";
  let writeWithErrors = !graphQLResultHasError(result);
  if (!writeWithErrors && ignoreErrors && result.data) {
    writeWithErrors = true;
  }
  return writeWithErrors;
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/core/QueryManager.js
var QueryManager = class {
  constructor(options) {
    __publicField(this, "defaultOptions");
    __publicField(this, "client");
    /**
     * The options that were passed to the ApolloClient constructor.
     */
    __publicField(this, "clientOptions");
    __publicField(this, "assumeImmutableResults");
    __publicField(this, "documentTransform");
    __publicField(this, "ssrMode");
    __publicField(this, "defaultContext");
    __publicField(this, "dataMasking");
    __publicField(this, "incrementalHandler");
    __publicField(this, "localState");
    __publicField(this, "queryDeduplication");
    /**
     * Whether to prioritize cache values over network results when
     * `fetchObservableWithInfo` is called.
     * This will essentially turn a `"network-only"` or `"cache-and-network"`
     * fetchPolicy into a `"cache-first"` fetchPolicy, but without influencing
     * the `fetchPolicy` of the `ObservableQuery`.
     *
     * This can e.g. be used to prioritize the cache during the first render after
     * SSR.
     */
    __publicField(this, "prioritizeCacheValues", false);
    __publicField(this, "onBroadcast");
    __publicField(this, "mutationStore");
    /**
     * All ObservableQueries that currently have at least one subscriber.
     */
    __publicField(this, "obsQueries", /* @__PURE__ */ new Set());
    // Maps from queryInfo.id strings to Promise rejection functions for
    // currently active queries and fetches.
    // Use protected instead of private field so
    // @apollo/experimental-nextjs-app-support can access type info.
    __publicField(this, "fetchCancelFns", /* @__PURE__ */ new Map());
    __publicField(this, "transformCache", new AutoCleanedWeakCache(
      cacheSizes["queryManager.getDocumentInfo"] || 2e3
      /* defaultCacheSizes["queryManager.getDocumentInfo"] */
    ));
    __publicField(this, "requestIdCounter", 1);
    // Use protected instead of private field so
    // @apollo/experimental-nextjs-app-support can access type info.
    __publicField(this, "inFlightLinkObservables", new Trie(false));
    __publicField(this, "noCacheWarningsByCause", /* @__PURE__ */ new WeakSet());
    const defaultDocumentTransform = new DocumentTransform(
      (document) => this.cache.transformDocument(document),
      // Allow the apollo cache to manage its own transform caches
      { cache: false }
    );
    this.client = options.client;
    this.defaultOptions = options.defaultOptions;
    this.queryDeduplication = options.queryDeduplication;
    this.clientOptions = options.clientOptions;
    this.ssrMode = options.ssrMode;
    this.assumeImmutableResults = options.assumeImmutableResults;
    this.dataMasking = options.dataMasking;
    this.localState = options.localState;
    this.incrementalHandler = options.incrementalHandler;
    const documentTransform = options.documentTransform;
    this.documentTransform = documentTransform ? defaultDocumentTransform.concat(documentTransform).concat(defaultDocumentTransform) : defaultDocumentTransform;
    this.defaultContext = options.defaultContext || {};
    if (this.onBroadcast = options.onBroadcast) {
      this.mutationStore = {};
    }
  }
  get link() {
    return this.client.link;
  }
  get cache() {
    return this.client.cache;
  }
  /**
   * Call this method to terminate any active query processes, making it safe
   * to dispose of this QueryManager instance.
   */
  stop() {
    this.obsQueries.forEach((oq) => oq.stop());
    this.cancelPendingFetches(newInvariantError(84));
  }
  cancelPendingFetches(error) {
    this.fetchCancelFns.forEach((cancel) => cancel(error));
    this.fetchCancelFns.clear();
  }
  async mutate({ mutation, variables, optimisticResponse, updateQueries, refetchQueries = [], awaitRefetchQueries = false, update: updateWithProxyFn, onQueryUpdated, fetchPolicy, errorPolicy, keepRootFields, context }) {
    const queryInfo = new QueryInfo(this);
    mutation = this.cache.transformForLink(this.transform(mutation));
    const { hasClientExports } = this.getDocumentInfo(mutation);
    variables = this.getVariables(mutation, variables);
    if (hasClientExports) {
      if (__DEV__) {
        invariant(this.localState, 85, getOperationName(mutation, "(anonymous)"));
      }
      variables = await this.localState.getExportedVariables({
        client: this.client,
        document: mutation,
        variables,
        context
      });
    }
    const mutationStoreValue = this.mutationStore && (this.mutationStore[queryInfo.id] = {
      mutation,
      variables,
      loading: true,
      error: null
    });
    const isOptimistic = optimisticResponse && queryInfo.markMutationOptimistic(optimisticResponse, {
      document: mutation,
      variables,
      cacheWriteBehavior: fetchPolicy === "no-cache" ? 0 : 2,
      errorPolicy,
      context,
      updateQueries,
      update: updateWithProxyFn,
      keepRootFields
    });
    this.broadcastQueries();
    return new Promise((resolve, reject) => {
      const cause = {};
      return this.getObservableFromLink(mutation, {
        ...context,
        optimisticResponse: isOptimistic ? optimisticResponse : void 0
      }, variables, {}, false).observable.pipe(validateDidEmitValue(), mergeMap((result) => {
        const storeResult = { ...result };
        return from(queryInfo.markMutationResult(storeResult, {
          document: mutation,
          variables,
          cacheWriteBehavior: fetchPolicy === "no-cache" ? 0 : 2,
          errorPolicy,
          context,
          update: updateWithProxyFn,
          updateQueries,
          awaitRefetchQueries,
          refetchQueries,
          removeOptimistic: isOptimistic ? queryInfo.id : void 0,
          onQueryUpdated,
          keepRootFields
        }));
      })).pipe(map((storeResult) => {
        const hasErrors = graphQLResultHasError(storeResult);
        if (hasErrors && errorPolicy === "none") {
          throw new CombinedGraphQLErrors(storeResult);
        }
        if (mutationStoreValue) {
          mutationStoreValue.loading = false;
          mutationStoreValue.error = null;
        }
        return storeResult;
      })).subscribe({
        next: (storeResult) => {
          this.broadcastQueries();
          if (!queryInfo.hasNext) {
            const result = {
              data: this.maskOperation({
                document: mutation,
                data: storeResult.data,
                fetchPolicy,
                cause
              })
            };
            if (graphQLResultHasError(storeResult)) {
              result.error = new CombinedGraphQLErrors(storeResult);
            }
            if (Object.keys(storeResult.extensions || {}).length) {
              result.extensions = storeResult.extensions;
            }
            resolve(result);
          }
        },
        error: (error) => {
          if (mutationStoreValue) {
            mutationStoreValue.loading = false;
            mutationStoreValue.error = error;
          }
          if (isOptimistic) {
            this.cache.removeOptimistic(queryInfo.id);
          }
          this.broadcastQueries();
          if (errorPolicy === "ignore") {
            return resolve({ data: void 0 });
          }
          if (errorPolicy === "all") {
            return resolve({ data: void 0, error });
          }
          reject(error);
        }
      });
    });
  }
  fetchQuery(options, networkStatus) {
    checkDocument(options.query, OperationTypeNode.QUERY);
    return (async () => lastValueFrom(this.fetchObservableWithInfo(options, {
      networkStatus
    }).observable.pipe(filterMap((value) => {
      switch (value.kind) {
        case "E":
          throw value.error;
        case "N": {
          if (value.source !== "newNetworkStatus")
            return toQueryResult(value.value);
        }
      }
    })), {
      // This default is needed when a `standby` fetch policy is used to avoid
      // an EmptyError from rejecting this promise.
      defaultValue: { data: void 0 }
    }))();
  }
  transform(document) {
    return this.documentTransform.transformDocument(document);
  }
  getDocumentInfo(document) {
    const { transformCache } = this;
    if (!transformCache.has(document)) {
      const operationDefinition = getOperationDefinition(document);
      const cacheEntry = {
        // TODO These three calls (hasClientExports, shouldForceResolvers, and
        // usesNonreactiveDirective) are performing independent full traversals
        // of the transformed document. We should consider merging these
        // traversals into a single pass in the future, though the work is
        // cached after the first time.
        hasClientExports: hasDirectives(["client", "export"], document, true),
        hasForcedResolvers: hasForcedResolvers(document),
        hasNonreactiveDirective: hasDirectives(["nonreactive"], document),
        hasIncrementalDirective: hasDirectives(["defer"], document),
        nonReactiveQuery: addNonReactiveToNamedFragments(document),
        clientQuery: hasDirectives(["client"], document) ? document : null,
        serverQuery: removeDirectivesFromDocument([
          { name: "client", remove: true },
          { name: "connection" },
          { name: "nonreactive" },
          { name: "unmask" }
        ], document),
        operationType: operationDefinition == null ? void 0 : operationDefinition.operation,
        defaultVars: getDefaultValues(operationDefinition),
        // Transform any mutation or subscription operations to query operations
        // so we can read/write them from/to the cache.
        asQuery: {
          ...document,
          definitions: document.definitions.map((def) => {
            if (def.kind === "OperationDefinition" && def.operation !== "query") {
              return { ...def, operation: "query" };
            }
            return def;
          })
        }
      };
      transformCache.set(document, cacheEntry);
    }
    const entry = transformCache.get(document);
    if (entry.violation) {
      throw entry.violation;
    }
    return entry;
  }
  getVariables(document, variables) {
    const defaultVars = this.getDocumentInfo(document).defaultVars;
    const varsWithDefaults = Object.entries(variables ?? {}).map(([key, value]) => [key, value === void 0 ? defaultVars[key] : value]);
    return {
      ...defaultVars,
      ...Object.fromEntries(varsWithDefaults)
    };
  }
  watchQuery(options) {
    checkDocument(options.query, OperationTypeNode.QUERY);
    const query = this.transform(options.query);
    options = {
      ...options,
      variables: this.getVariables(query, options.variables)
    };
    if (typeof options.notifyOnNetworkStatusChange === "undefined") {
      options.notifyOnNetworkStatusChange = true;
    }
    const observable = new ObservableQuery({
      queryManager: this,
      options,
      transformedQuery: query
    });
    return observable;
  }
  query(options) {
    const query = this.transform(options.query);
    return this.fetchQuery({
      ...options,
      query
    }).then((value) => ({
      ...value,
      data: this.maskOperation({
        document: query,
        data: value == null ? void 0 : value.data,
        fetchPolicy: options.fetchPolicy
      })
    }));
  }
  generateRequestId() {
    return this.requestIdCounter++;
  }
  clearStore(options = {
    discardWatches: true
  }) {
    this.cancelPendingFetches(newInvariantError(86));
    this.obsQueries.forEach((observableQuery) => {
      observableQuery.reset();
    });
    if (this.mutationStore) {
      this.mutationStore = {};
    }
    return this.cache.reset(options);
  }
  getObservableQueries(include = "active") {
    const queries = /* @__PURE__ */ new Set();
    const queryNames = /* @__PURE__ */ new Map();
    const queryNamesAndQueryStrings = /* @__PURE__ */ new Map();
    const legacyQueryOptions = /* @__PURE__ */ new Set();
    if (Array.isArray(include)) {
      include.forEach((desc) => {
        if (typeof desc === "string") {
          queryNames.set(desc, desc);
          queryNamesAndQueryStrings.set(desc, false);
        } else if (isDocumentNode(desc)) {
          const queryString = print(this.transform(desc));
          queryNames.set(queryString, getOperationName(desc));
          queryNamesAndQueryStrings.set(queryString, false);
        } else if (isNonNullObject(desc) && desc.query) {
          legacyQueryOptions.add(desc);
        }
      });
    }
    this.obsQueries.forEach((oq) => {
      const document = print(this.transform(oq.options.query));
      if (include === "all") {
        queries.add(oq);
        return;
      }
      const { queryName, options: { fetchPolicy } } = oq;
      if (include === "active" && fetchPolicy === "standby") {
        return;
      }
      if (include === "active" || queryName && queryNamesAndQueryStrings.has(queryName) || document && queryNamesAndQueryStrings.has(document)) {
        queries.add(oq);
        if (queryName)
          queryNamesAndQueryStrings.set(queryName, true);
        if (document)
          queryNamesAndQueryStrings.set(document, true);
      }
    });
    if (legacyQueryOptions.size) {
      legacyQueryOptions.forEach((options) => {
        const oq = new ObservableQuery({
          queryManager: this,
          options: {
            ...options,
            fetchPolicy: "network-only"
          }
        });
        queries.add(oq);
      });
    }
    if (__DEV__ && queryNamesAndQueryStrings.size) {
      queryNamesAndQueryStrings.forEach((included, nameOrQueryString) => {
        if (!included) {
          const queryName = queryNames.get(nameOrQueryString);
          if (queryName) {
            __DEV__ && invariant.warn(87, queryName);
          } else {
            __DEV__ && invariant.warn(88);
          }
        }
      });
    }
    return queries;
  }
  refetchObservableQueries(includeStandby = false) {
    const observableQueryPromises = [];
    this.getObservableQueries(includeStandby ? "all" : "active").forEach((observableQuery) => {
      const { fetchPolicy } = observableQuery.options;
      if ((includeStandby || fetchPolicy !== "standby") && fetchPolicy !== "cache-only") {
        observableQueryPromises.push(observableQuery.refetch());
      }
    });
    this.broadcastQueries();
    return Promise.all(observableQueryPromises);
  }
  startGraphQLSubscription(options) {
    let { query, variables } = options;
    const { fetchPolicy, errorPolicy = "none", context = {}, extensions = {} } = options;
    checkDocument(query, OperationTypeNode.SUBSCRIPTION);
    query = this.transform(query);
    variables = this.getVariables(query, variables);
    let restart;
    if (__DEV__) {
      invariant(
        !this.getDocumentInfo(query).hasClientExports || this.localState,
        89,
        getOperationName(query, "(anonymous)")
      );
    }
    const observable = (this.getDocumentInfo(query).hasClientExports ? from(this.localState.getExportedVariables({
      client: this.client,
      document: query,
      variables,
      context
    })) : of(variables)).pipe(mergeMap((variables2) => {
      const { observable: observable2, restart: res } = this.getObservableFromLink(query, context, variables2, extensions);
      const queryInfo = new QueryInfo(this);
      restart = res;
      return observable2.pipe(map((rawResult) => {
        queryInfo.markSubscriptionResult(rawResult, {
          document: query,
          variables: variables2,
          errorPolicy,
          cacheWriteBehavior: fetchPolicy === "no-cache" ? 0 : 2
        });
        const result = {
          data: rawResult.data ?? void 0
        };
        if (graphQLResultHasError(rawResult)) {
          result.error = new CombinedGraphQLErrors(rawResult);
        } else if (graphQLResultHasProtocolErrors(rawResult)) {
          result.error = rawResult.extensions[PROTOCOL_ERRORS_SYMBOL];
          delete rawResult.extensions[PROTOCOL_ERRORS_SYMBOL];
        }
        if (rawResult.extensions && Object.keys(rawResult.extensions).length) {
          result.extensions = rawResult.extensions;
        }
        if (result.error && errorPolicy === "none") {
          result.data = void 0;
        }
        if (errorPolicy === "ignore") {
          delete result.error;
        }
        return result;
      }), catchError((error) => {
        if (errorPolicy === "ignore") {
          return of({
            data: void 0
          });
        }
        return of({ data: void 0, error });
      }), filter((result) => !!(result.data || result.error)));
    }));
    return Object.assign(observable, { restart: () => restart == null ? void 0 : restart() });
  }
  broadcastQueries() {
    if (this.onBroadcast)
      this.onBroadcast();
    this.obsQueries.forEach((observableQuery) => observableQuery.notify());
  }
  getObservableFromLink(query, context, variables, extensions, deduplication = (context == null ? void 0 : context.queryDeduplication) ?? this.queryDeduplication) {
    let entry = {};
    const { serverQuery, clientQuery, operationType, hasIncrementalDirective } = this.getDocumentInfo(query);
    const operationName = getOperationName(query);
    const executeContext = {
      client: this.client
    };
    if (serverQuery) {
      const { inFlightLinkObservables, link } = this;
      try {
        let withRestart = function(source) {
          return new Observable((observer) => {
            function subscribe() {
              return source.subscribe({
                next: observer.next.bind(observer),
                complete: observer.complete.bind(observer),
                error: observer.error.bind(observer)
              });
            }
            let subscription = subscribe();
            entry.restart || (entry.restart = () => {
              subscription.unsubscribe();
              subscription = subscribe();
            });
            return () => {
              subscription.unsubscribe();
              entry.restart = void 0;
            };
          });
        };
        const operation = this.incrementalHandler.prepareRequest({
          query: serverQuery,
          variables,
          context: {
            ...this.defaultContext,
            ...context,
            queryDeduplication: deduplication
          },
          extensions
        });
        context = operation.context;
        if (deduplication) {
          const printedServerQuery = print(serverQuery);
          const varJson = canonicalStringify(variables);
          entry = inFlightLinkObservables.lookup(printedServerQuery, varJson);
          if (!entry.observable) {
            entry.observable = execute(link, operation, executeContext).pipe(
              withRestart,
              finalize(() => {
                if (inFlightLinkObservables.peek(printedServerQuery, varJson) === entry) {
                  inFlightLinkObservables.remove(printedServerQuery, varJson);
                }
              }),
              // We don't want to replay the last emitted value for
              // subscriptions and instead opt to wait to receive updates until
              // the subscription emits new values.
              operationType === OperationTypeNode.SUBSCRIPTION ? share() : shareReplay({ refCount: true })
            );
          }
        } else {
          entry.observable = execute(link, operation, executeContext).pipe(withRestart);
        }
      } catch (error) {
        entry.observable = throwError(() => error);
      }
    } else {
      entry.observable = of({ data: {} });
    }
    if (clientQuery) {
      const { operation } = getOperationDefinition(query);
      if (__DEV__) {
        invariant(
          this.localState,
          90,
          operation[0].toUpperCase() + operation.slice(1),
          operationName ?? "(anonymous)"
        );
      }
      invariant(
        !hasIncrementalDirective,
        91,
        operation[0].toUpperCase() + operation.slice(1),
        operationName ?? "(anonymous)"
      );
      entry.observable = entry.observable.pipe(mergeMap((result) => {
        return from(this.localState.execute({
          client: this.client,
          document: clientQuery,
          remoteResult: result,
          context,
          variables
        }));
      }));
    }
    return {
      restart: () => {
        var _a2;
        return (_a2 = entry.restart) == null ? void 0 : _a2.call(entry);
      },
      observable: entry.observable.pipe(catchError((error) => {
        error = toErrorLike(error);
        registerLinkError(error);
        throw error;
      }))
    };
  }
  getResultsFromLink(options, { queryInfo, cacheWriteBehavior, observableQuery }) {
    const requestId = queryInfo.lastRequestId = this.generateRequestId();
    const { errorPolicy } = options;
    const linkDocument = this.cache.transformForLink(options.query);
    return this.getObservableFromLink(linkDocument, options.context, options.variables).observable.pipe(map((incoming) => {
      const result = queryInfo.markQueryResult(incoming, {
        ...options,
        document: linkDocument,
        cacheWriteBehavior
      });
      const hasErrors = graphQLResultHasError(result);
      if (hasErrors && errorPolicy === "none") {
        queryInfo.resetLastWrite();
        observableQuery == null ? void 0 : observableQuery["resetNotifications"]();
        throw new CombinedGraphQLErrors(result);
      }
      const aqr = {
        data: result.data,
        ...queryInfo.hasNext ? {
          loading: true,
          networkStatus: NetworkStatus.streaming,
          dataState: "streaming",
          partial: true
        } : {
          dataState: result.data ? "complete" : "empty",
          loading: false,
          networkStatus: NetworkStatus.ready,
          partial: !result.data
        }
      };
      if (hasErrors) {
        if (errorPolicy === "none") {
          aqr.data = void 0;
          aqr.dataState = "empty";
        }
        if (errorPolicy !== "ignore") {
          aqr.error = new CombinedGraphQLErrors(result);
          if (aqr.dataState !== "streaming") {
            aqr.networkStatus = NetworkStatus.error;
          }
        }
      }
      return aqr;
    }), catchError((error) => {
      if (requestId >= queryInfo.lastRequestId && errorPolicy === "none") {
        queryInfo.resetLastWrite();
        observableQuery == null ? void 0 : observableQuery["resetNotifications"]();
        throw error;
      }
      const aqr = {
        data: void 0,
        dataState: "empty",
        loading: false,
        networkStatus: NetworkStatus.ready,
        partial: true
      };
      if (errorPolicy !== "ignore") {
        aqr.error = error;
        aqr.networkStatus = NetworkStatus.error;
      }
      return of(aqr);
    }));
  }
  fetchObservableWithInfo(options, {
    // The initial networkStatus for this fetch, most often
    // NetworkStatus.loading, but also possibly fetchMore, poll, refetch,
    // or setVariables.
    networkStatus = NetworkStatus.loading,
    query = options.query,
    fetchQueryOperator = (x) => x,
    onCacheHit = () => {
    },
    observableQuery
  }) {
    const variables = this.getVariables(query, options.variables);
    const defaults = this.defaultOptions.watchQuery;
    let { fetchPolicy = defaults && defaults.fetchPolicy || "cache-first", errorPolicy = defaults && defaults.errorPolicy || "none", returnPartialData = false, notifyOnNetworkStatusChange = true, context = {} } = options;
    if (this.prioritizeCacheValues && (fetchPolicy === "network-only" || fetchPolicy === "cache-and-network")) {
      fetchPolicy = "cache-first";
    }
    const normalized = Object.assign({}, options, {
      query,
      variables,
      fetchPolicy,
      errorPolicy,
      returnPartialData,
      notifyOnNetworkStatusChange,
      context
    });
    const queryInfo = new QueryInfo(this, observableQuery);
    const fromVariables = (variables2) => {
      normalized.variables = variables2;
      const cacheWriteBehavior = fetchPolicy === "no-cache" ? 0 : networkStatus === NetworkStatus.refetch && normalized.refetchWritePolicy !== "merge" ? 1 : 2;
      const observableWithInfo = this.fetchQueryByPolicy(normalized, { queryInfo, cacheWriteBehavior, onCacheHit, observableQuery });
      observableWithInfo.observable = observableWithInfo.observable.pipe(fetchQueryOperator);
      if (
        // If we're in standby, postpone advancing options.fetchPolicy using
        // applyNextFetchPolicy.
        normalized.fetchPolicy !== "standby"
      ) {
        observableQuery == null ? void 0 : observableQuery["applyNextFetchPolicy"]("after-fetch", options);
      }
      return observableWithInfo;
    };
    const cleanupCancelFn = () => {
      this.fetchCancelFns.delete(queryInfo.id);
    };
    this.fetchCancelFns.set(queryInfo.id, (error) => {
      fetchCancelSubject.next({
        kind: "E",
        error,
        source: "network"
      });
    });
    const fetchCancelSubject = new Subject();
    let observable, containsDataFromLink;
    if (this.getDocumentInfo(normalized.query).hasClientExports) {
      if (__DEV__) {
        invariant(this.localState, 92, getOperationName(normalized.query, "(anonymous)"));
      }
      observable = from(this.localState.getExportedVariables({
        client: this.client,
        document: normalized.query,
        variables: normalized.variables,
        context: normalized.context
      })).pipe(mergeMap((variables2) => fromVariables(variables2).observable));
      containsDataFromLink = true;
    } else {
      const sourcesWithInfo = fromVariables(normalized.variables);
      containsDataFromLink = sourcesWithInfo.fromLink;
      observable = sourcesWithInfo.observable;
    }
    return {
      // Merge `observable` with `fetchCancelSubject`, in a way that completing or
      // erroring either of them will complete the merged obserable.
      observable: new Observable((observer) => {
        observer.add(cleanupCancelFn);
        observable.subscribe(observer);
        fetchCancelSubject.subscribe(observer);
      }).pipe(share()),
      fromLink: containsDataFromLink
    };
  }
  refetchQueries({ updateCache, include, optimistic = false, removeOptimistic = optimistic ? makeUniqueId("refetchQueries") : void 0, onQueryUpdated }) {
    const includedQueriesByOq = /* @__PURE__ */ new Map();
    if (include) {
      this.getObservableQueries(include).forEach((oq) => {
        if (oq.options.fetchPolicy === "cache-only" || oq["variablesUnknown"]) {
          return;
        }
        const current = oq.getCurrentResult();
        includedQueriesByOq.set(oq, {
          oq,
          lastDiff: {
            result: current == null ? void 0 : current.data,
            complete: !(current == null ? void 0 : current.partial)
          }
        });
      });
    }
    const results = /* @__PURE__ */ new Map();
    if (updateCache) {
      const handled = /* @__PURE__ */ new Set();
      this.cache.batch({
        update: updateCache,
        // Since you can perform any combination of cache reads and/or writes in
        // the cache.batch update function, its optimistic option can be either
        // a boolean or a string, representing three distinct modes of
        // operation:
        //
        // * false: read/write only the root layer
        // * true: read/write the topmost layer
        // * string: read/write a fresh optimistic layer with that ID string
        //
        // When typeof optimistic === "string", a new optimistic layer will be
        // temporarily created within cache.batch with that string as its ID. If
        // we then pass that same string as the removeOptimistic option, we can
        // make cache.batch immediately remove the optimistic layer after
        // running the updateCache function, triggering only one broadcast.
        //
        // However, the refetchQueries method accepts only true or false for its
        // optimistic option (not string). We interpret true to mean a temporary
        // optimistic layer should be created, to allow efficiently rolling back
        // the effect of the updateCache function, which involves passing a
        // string instead of true as the optimistic option to cache.batch, when
        // refetchQueries receives optimistic: true.
        //
        // In other words, we are deliberately not supporting the use case of
        // writing to an *existing* optimistic layer (using the refetchQueries
        // updateCache function), since that would potentially interfere with
        // other optimistic updates in progress. Instead, you can read/write
        // only the root layer by passing optimistic: false to refetchQueries,
        // or you can read/write a brand new optimistic layer that will be
        // automatically removed by passing optimistic: true.
        optimistic: optimistic && removeOptimistic || false,
        // The removeOptimistic option can also be provided by itself, even if
        // optimistic === false, to remove some previously-added optimistic
        // layer safely and efficiently, like we do in markMutationResult.
        //
        // If an explicit removeOptimistic string is provided with optimistic:
        // true, the removeOptimistic string will determine the ID of the
        // temporary optimistic layer, in case that ever matters.
        removeOptimistic,
        onWatchUpdated(watch, diff, lastDiff) {
          const oq = watch.watcher;
          if (oq instanceof ObservableQuery && !handled.has(oq)) {
            handled.add(oq);
            if (onQueryUpdated) {
              includedQueriesByOq.delete(oq);
              let result = onQueryUpdated(oq, diff, lastDiff);
              if (result === true) {
                result = oq.refetch().retain(
                  /* create a persistent subscription on the query */
                );
              }
              if (result !== false) {
                results.set(oq, result);
              }
              return result;
            }
            if (onQueryUpdated !== null && oq.options.fetchPolicy !== "cache-only") {
              includedQueriesByOq.set(oq, { oq, lastDiff, diff });
            }
          }
        }
      });
    }
    if (includedQueriesByOq.size) {
      includedQueriesByOq.forEach(({ oq, lastDiff, diff }) => {
        let result;
        if (onQueryUpdated) {
          if (!diff) {
            diff = oq.getCacheDiff();
          }
          result = onQueryUpdated(oq, diff, lastDiff);
        }
        if (!onQueryUpdated || result === true) {
          result = oq.refetch().retain(
            /* create a persistent subscription on the query */
          );
        }
        if (result !== false) {
          results.set(oq, result);
        }
      });
    }
    if (removeOptimistic) {
      this.cache.removeOptimistic(removeOptimistic);
    }
    return results;
  }
  maskOperation(options) {
    var _a2;
    const { document, data } = options;
    if (__DEV__) {
      const { fetchPolicy, cause = {} } = options;
      const operationType = (_a2 = getOperationDefinition(document)) == null ? void 0 : _a2.operation;
      if (this.dataMasking && fetchPolicy === "no-cache" && !isFullyUnmaskedOperation(document) && !this.noCacheWarningsByCause.has(cause)) {
        this.noCacheWarningsByCause.add(cause);
        __DEV__ && invariant.warn(93, getOperationName(document, `Unnamed ${operationType ?? "operation"}`));
      }
    }
    return this.dataMasking ? maskOperation(data, document, this.cache) : data;
  }
  maskFragment(options) {
    const { data, fragment, fragmentName } = options;
    return this.dataMasking ? maskFragment(data, fragment, this.cache, fragmentName) : data;
  }
  fetchQueryByPolicy({ query, variables, fetchPolicy, errorPolicy, returnPartialData, context }, { cacheWriteBehavior, onCacheHit, queryInfo, observableQuery }) {
    const readCache = () => this.cache.diff({
      query,
      variables,
      returnPartialData: true,
      optimistic: true
    });
    const resultsFromCache = (diff, networkStatus) => {
      const data = diff.result;
      if (__DEV__ && !returnPartialData && data !== null) {
        logMissingFieldErrors(diff.missing);
      }
      const toResult = (data2) => {
        if (!diff.complete && !returnPartialData) {
          data2 = void 0;
        }
        return {
          // TODO: Handle partial data
          data: data2,
          dataState: diff.complete ? "complete" : data2 ? "partial" : "empty",
          loading: isNetworkRequestInFlight(networkStatus),
          networkStatus,
          partial: !diff.complete
        };
      };
      const fromData = (data2) => {
        return of({
          kind: "N",
          value: toResult(data2),
          source: "cache"
        });
      };
      if (
        // Don't attempt to run forced resolvers if we have incomplete cache
        // data and partial isn't allowed since this result would get set to
        // `undefined` anyways in `toResult`.
        (diff.complete || returnPartialData) && this.getDocumentInfo(query).hasForcedResolvers
      ) {
        if (__DEV__) {
          invariant(this.localState, 94, getOperationName(query, "(anonymous)"));
        }
        onCacheHit();
        return from(this.localState.execute({
          client: this.client,
          document: query,
          remoteResult: data ? { data } : void 0,
          context,
          variables,
          onlyRunForcedResolvers: true,
          returnPartialData: true
        }).then((resolved) => ({
          kind: "N",
          value: toResult(resolved.data || void 0),
          source: "cache"
        })));
      }
      if (errorPolicy === "none" && networkStatus === NetworkStatus.refetch && diff.missing) {
        return fromData(void 0);
      }
      return fromData(data || void 0);
    };
    const resultsFromLink = () => this.getResultsFromLink({
      query,
      variables,
      context,
      fetchPolicy,
      errorPolicy
    }, {
      cacheWriteBehavior,
      queryInfo,
      observableQuery
    }).pipe(validateDidEmitValue(), materialize(), map((result) => ({
      ...result,
      source: "network"
    })));
    switch (fetchPolicy) {
      default:
      case "cache-first": {
        const diff = readCache();
        if (diff.complete) {
          return {
            fromLink: false,
            observable: resultsFromCache(diff, NetworkStatus.ready)
          };
        }
        if (returnPartialData) {
          return {
            fromLink: true,
            observable: concat(resultsFromCache(diff, NetworkStatus.loading), resultsFromLink())
          };
        }
        return { fromLink: true, observable: resultsFromLink() };
      }
      case "cache-and-network": {
        const diff = readCache();
        if (diff.complete || returnPartialData) {
          return {
            fromLink: true,
            observable: concat(resultsFromCache(diff, NetworkStatus.loading), resultsFromLink())
          };
        }
        return { fromLink: true, observable: resultsFromLink() };
      }
      case "cache-only":
        return {
          fromLink: false,
          observable: concat(resultsFromCache(readCache(), NetworkStatus.ready))
        };
      case "network-only":
        return { fromLink: true, observable: resultsFromLink() };
      case "no-cache":
        return { fromLink: true, observable: resultsFromLink() };
      case "standby":
        return { fromLink: false, observable: EMPTY };
    }
  }
};
function validateDidEmitValue() {
  let didEmitValue = false;
  return tap({
    next() {
      didEmitValue = true;
    },
    complete() {
      invariant(didEmitValue, 95);
    }
  });
}
function isFullyUnmaskedOperation(document) {
  let isUnmasked = true;
  visit(document, {
    FragmentSpread: (node) => {
      isUnmasked = !!node.directives && node.directives.some((directive) => directive.name.value === "unmask");
      if (!isUnmasked) {
        return BREAK;
      }
    }
  });
  return isUnmasked;
}
function addNonReactiveToNamedFragments(document) {
  return visit(document, {
    FragmentSpread: (node) => {
      var _a2;
      if ((_a2 = node.directives) == null ? void 0 : _a2.some((directive) => directive.name.value === "unmask")) {
        return;
      }
      return {
        ...node,
        directives: [
          ...node.directives || [],
          {
            kind: Kind.DIRECTIVE,
            name: { kind: Kind.NAME, value: "nonreactive" }
          }
        ]
      };
    }
  });
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/core/ApolloClient.js
var hasSuggestedDevtools = false;
var ApolloClient = class {
  /**
   * Constructs an instance of `ApolloClient`.
   *
   * @example
   *
   * ```js
   * import { ApolloClient, InMemoryCache } from "@apollo/client";
   *
   * const cache = new InMemoryCache();
   *
   * const client = new ApolloClient({
   *   // Provide required constructor fields
   *   cache: cache,
   *   uri: "http://localhost:4000/",
   *
   *   // Provide some optional constructor fields
   *   name: "react-web-client",
   *   version: "1.3",
   *   queryDeduplication: false,
   *   defaultOptions: {
   *     watchQuery: {
   *       fetchPolicy: "cache-and-network",
   *     },
   *   },
   * });
   * ```
   */
  constructor(options) {
    __publicField(this, "link");
    __publicField(this, "cache");
    /**
     * @deprecated `disableNetworkFetches` has been renamed to `prioritizeCacheValues`.
     */
    __publicField(this, "disableNetworkFetches");
    __publicField(this, "version");
    __publicField(this, "queryDeduplication");
    __publicField(this, "defaultOptions");
    __publicField(this, "devtoolsConfig");
    __publicField(this, "queryManager");
    __publicField(this, "devToolsHookCb");
    __publicField(this, "resetStoreCallbacks", []);
    __publicField(this, "clearStoreCallbacks", []);
    /**
     * Refetches all of your active queries.
     *
     * `reFetchObservableQueries()` is useful if you want to bring the client back to proper state in case of a network outage
     *
     * It is important to remember that `reFetchObservableQueries()` _will_ refetch any active
     * queries. This means that any components that might be mounted will execute
     * their queries again using your network interface. If you do not want to
     * re-execute any queries then you should make sure to stop watching any
     * active queries.
     * Takes optional parameter `includeStandby` which will include queries in standby-mode when refetching.
     *
     * Note: `cache-only` queries are not refetched by this function.
     *
     * @deprecated Please use `refetchObservableQueries` instead.
     */
    __publicField(this, "reFetchObservableQueries");
    __publicField(this, "maskedFragmentTransform", new DocumentTransform(removeMaskedFragmentSpreads));
    if (__DEV__) {
      invariant(options.cache, 65);
      invariant(options.link, 66);
    }
    const { cache, documentTransform, ssrMode = false, ssrForceFetchDelay = 0, queryDeduplication = true, defaultOptions, defaultContext, assumeImmutableResults = cache.assumeImmutableResults, localState, devtools, dataMasking, link, incrementalHandler = new NotImplementedHandler() } = options;
    this.link = link;
    this.cache = cache;
    this.queryDeduplication = queryDeduplication;
    this.defaultOptions = defaultOptions || {};
    this.devtoolsConfig = {
      ...devtools,
      enabled: (devtools == null ? void 0 : devtools.enabled) ?? __DEV__
    };
    this.watchQuery = this.watchQuery.bind(this);
    this.query = this.query.bind(this);
    this.mutate = this.mutate.bind(this);
    this.watchFragment = this.watchFragment.bind(this);
    this.resetStore = this.resetStore.bind(this);
    this.reFetchObservableQueries = this.refetchObservableQueries = this.refetchObservableQueries.bind(this);
    this.version = version;
    this.queryManager = new QueryManager({
      client: this,
      defaultOptions: this.defaultOptions,
      defaultContext,
      documentTransform,
      queryDeduplication,
      ssrMode,
      dataMasking: !!dataMasking,
      clientOptions: options,
      incrementalHandler,
      assumeImmutableResults,
      onBroadcast: this.devtoolsConfig.enabled ? () => {
        if (this.devToolsHookCb) {
          this.devToolsHookCb();
        }
      } : void 0,
      localState
    });
    this.prioritizeCacheValues = ssrMode || ssrForceFetchDelay > 0;
    if (ssrForceFetchDelay) {
      setTimeout(() => {
        this.prioritizeCacheValues = false;
      }, ssrForceFetchDelay);
    }
    if (this.devtoolsConfig.enabled)
      this.connectToDevTools();
  }
  set prioritizeCacheValues(value) {
    this.queryManager.prioritizeCacheValues = value;
  }
  /**
   * Whether to prioritize cache values over network results when `query` or `watchQuery` is called.
   * This will essentially turn a `"network-only"` or `"cache-and-network"` fetchPolicy into a `"cache-first"` fetchPolicy,
   * but without influencing the `fetchPolicy` of the created `ObservableQuery` long-term.
   *
   * This can e.g. be used to prioritize the cache during the first render after SSR.
   */
  get prioritizeCacheValues() {
    return this.queryManager.prioritizeCacheValues;
  }
  connectToDevTools() {
    if (typeof window === "undefined") {
      return;
    }
    const windowWithDevTools = window;
    const devtoolsSymbol = Symbol.for("apollo.devtools");
    (windowWithDevTools[devtoolsSymbol] = windowWithDevTools[devtoolsSymbol] || []).push(this);
    windowWithDevTools.__APOLLO_CLIENT__ = this;
    if (!hasSuggestedDevtools && __DEV__) {
      hasSuggestedDevtools = true;
      if (window.document && window.top === window.self && /^(https?|file):$/.test(window.location.protocol)) {
        setTimeout(() => {
          if (!window.__APOLLO_DEVTOOLS_GLOBAL_HOOK__) {
            const nav = window.navigator;
            const ua = nav && nav.userAgent;
            let url;
            if (typeof ua === "string") {
              if (ua.indexOf("Chrome/") > -1) {
                url = "https://chrome.google.com/webstore/detail/apollo-client-developer-t/jdkknkkbebbapilgoeccciglkfbmbnfm";
              } else if (ua.indexOf("Firefox/") > -1) {
                url = "https://addons.mozilla.org/en-US/firefox/addon/apollo-developer-tools/";
              }
            }
            if (url) {
              __DEV__ && invariant.log("Download the Apollo DevTools for a better development experience: %s", url);
            }
          }
        }, 1e4);
      }
    }
  }
  /**
   * The `DocumentTransform` used to modify GraphQL documents before a request
   * is made. If a custom `DocumentTransform` is not provided, this will be the
   * default document transform.
   */
  get documentTransform() {
    return this.queryManager.documentTransform;
  }
  /**
   * The configured `LocalState` instance used to enable the use of `@client`
   * fields.
   */
  get localState() {
    return this.queryManager.localState;
  }
  set localState(localState) {
    this.queryManager.localState = localState;
  }
  /**
   * Call this method to terminate any active client processes, making it safe
   * to dispose of this `ApolloClient` instance.
   *
   * This method performs aggressive cleanup to prevent memory leaks:
   *
   * - Unsubscribes all active `ObservableQuery` instances by emitting a `completed` event
   * - Rejects all currently running queries with "QueryManager stopped while query was in flight"
   * - Removes all queryRefs from the suspense cache
   */
  stop() {
    this.queryManager.stop();
  }
  /**
   * This watches the cache store of the query according to the options specified and
   * returns an `ObservableQuery`. We can subscribe to this `ObservableQuery` and
   * receive updated results through an observer when the cache store changes.
   *
   * Note that this method is not an implementation of GraphQL subscriptions. Rather,
   * it uses Apollo's store in order to reactively deliver updates to your query results.
   *
   * For example, suppose you call watchQuery on a GraphQL query that fetches a person's
   * first and last name and this person has a particular object identifier, provided by
   * `cache.identify`. Later, a different query fetches that same person's
   * first and last name and the first name has now changed. Then, any observers associated
   * with the results of the first query will be updated with a new result object.
   *
   * Note that if the cache does not change, the subscriber will _not_ be notified.
   *
   * See [here](https://medium.com/apollo-stack/the-concepts-of-graphql-bc68bd819be3#.3mb0cbcmc) for
   * a description of store reactivity.
   */
  watchQuery(options) {
    if (this.defaultOptions.watchQuery) {
      options = mergeOptions(this.defaultOptions.watchQuery, options);
    }
    return this.queryManager.watchQuery(options);
  }
  /**
   * This resolves a single query according to the options specified and
   * returns a `Promise` which is either resolved with the resulting data
   * or rejected with an error.
   *
   * @param options - An object of type `QueryOptions` that allows us to
   * describe how this query should be treated e.g. whether it should hit the
   * server at all or just resolve from the cache, etc.
   */
  query(options) {
    if (this.defaultOptions.query) {
      options = mergeOptions(this.defaultOptions.query, options);
    }
    if (__DEV__) {
      invariant(options.fetchPolicy !== "cache-and-network", 67);
      invariant(options.fetchPolicy !== "standby", 68);
      invariant(options.query, 69);
      invariant(options.query.kind === "Document", 70);
      invariant(!options.returnPartialData, 71);
      invariant(!options.pollInterval, 72);
      invariant(!options.notifyOnNetworkStatusChange, 73);
    }
    return this.queryManager.query(options);
  }
  /**
   * This resolves a single mutation according to the options specified and returns a
   * Promise which is either resolved with the resulting data or rejected with an
   * error. In some cases both `data` and `errors` might be undefined, for example
   * when `errorPolicy` is set to `'ignore'`.
   *
   * It takes options as an object with the following keys and values:
   */
  mutate(options) {
    const optionsWithDefaults = mergeOptions(compact({
      fetchPolicy: "network-only",
      errorPolicy: "none"
    }, this.defaultOptions.mutate), options);
    if (__DEV__) {
      invariant(optionsWithDefaults.mutation, 74);
      invariant(optionsWithDefaults.fetchPolicy === "network-only" || optionsWithDefaults.fetchPolicy === "no-cache", 75);
    }
    checkDocument(optionsWithDefaults.mutation, OperationTypeNode.MUTATION);
    return this.queryManager.mutate(optionsWithDefaults);
  }
  /**
   * This subscribes to a graphql subscription according to the options specified and returns an
   * `Observable` which either emits received data or an error.
   */
  subscribe(options) {
    const cause = {};
    const observable = this.queryManager.startGraphQLSubscription(options);
    const mapped = observable.pipe(map((result) => ({
      ...result,
      data: this.queryManager.maskOperation({
        document: options.query,
        data: result.data,
        fetchPolicy: options.fetchPolicy,
        cause
      })
    })));
    return Object.assign(mapped, { restart: observable.restart });
  }
  readQuery(options, optimistic = false) {
    return this.cache.readQuery({ ...options, query: this.transform(options.query) }, optimistic);
  }
  /**
   * Watches the cache store of the fragment according to the options specified
   * and returns an `Observable`. We can subscribe to this
   * `Observable` and receive updated results through an
   * observer when the cache store changes.
   *
   * You must pass in a GraphQL document with a single fragment or a document
   * with multiple fragments that represent what you are reading. If you pass
   * in a document with multiple fragments then you must also specify a
   * `fragmentName`.
   *
   * @since 3.10.0
   * @param options - An object of type `WatchFragmentOptions` that allows
   * the cache to identify the fragment and optionally specify whether to react
   * to optimistic updates.
   */
  watchFragment(options) {
    const dataMasking = this.queryManager.dataMasking;
    return this.cache.watchFragment({
      ...options,
      fragment: this.transform(options.fragment, dataMasking)
    }).pipe(map((result) => {
      if (__DEV__) {
        if (dataMasking) {
          const data = this.queryManager.maskFragment({
            ...options,
            data: result.data
          });
          return { ...result, data };
        }
      }
      return result;
    }));
  }
  readFragment(options, optimistic = false) {
    return this.cache.readFragment({ ...options, fragment: this.transform(options.fragment) }, optimistic);
  }
  /**
   * Writes some data in the shape of the provided GraphQL query directly to
   * the store. This method will start at the root query. To start at a
   * specific id returned by `cache.identify` then use `writeFragment`.
   */
  writeQuery(options) {
    const ref = this.cache.writeQuery(options);
    if (options.broadcast !== false) {
      this.queryManager.broadcastQueries();
    }
    return ref;
  }
  /**
   * Writes some data in the shape of the provided GraphQL fragment directly to
   * the store. This method will write to a GraphQL fragment from any arbitrary
   * id that is currently cached, unlike `writeQuery` which will only write
   * from the root query.
   *
   * You must pass in a GraphQL document with a single fragment or a document
   * with multiple fragments that represent what you are writing. If you pass
   * in a document with multiple fragments then you must also specify a
   * `fragmentName`.
   */
  writeFragment(options) {
    const ref = this.cache.writeFragment(options);
    if (options.broadcast !== false) {
      this.queryManager.broadcastQueries();
    }
    return ref;
  }
  __actionHookForDevTools(cb) {
    this.devToolsHookCb = cb;
  }
  __requestRaw(request) {
    return execute(this.link, request, { client: this });
  }
  /**
   * Resets your entire store by clearing out your cache and then re-executing
   * all of your active queries. This makes it so that you may guarantee that
   * there is no data left in your store from a time before you called this
   * method.
   *
   * `resetStore()` is useful when your user just logged out. You’ve removed the
   * user session, and you now want to make sure that any references to data you
   * might have fetched while the user session was active is gone.
   *
   * It is important to remember that `resetStore()` _will_ refetch any active
   * queries. This means that any components that might be mounted will execute
   * their queries again using your network interface. If you do not want to
   * re-execute any queries then you should make sure to stop watching any
   * active queries.
   */
  resetStore() {
    return Promise.resolve().then(() => this.queryManager.clearStore({
      discardWatches: false
    })).then(() => Promise.all(this.resetStoreCallbacks.map((fn) => fn()))).then(() => this.refetchObservableQueries());
  }
  /**
   * Remove all data from the store. Unlike `resetStore`, `clearStore` will
   * not refetch any active queries.
   */
  clearStore() {
    return Promise.resolve().then(() => this.queryManager.clearStore({
      discardWatches: true
    })).then(() => Promise.all(this.clearStoreCallbacks.map((fn) => fn())));
  }
  /**
   * Allows callbacks to be registered that are executed when the store is
   * reset. `onResetStore` returns an unsubscribe function that can be used
   * to remove registered callbacks.
   */
  onResetStore(cb) {
    this.resetStoreCallbacks.push(cb);
    return () => {
      this.resetStoreCallbacks = this.resetStoreCallbacks.filter((c) => c !== cb);
    };
  }
  /**
   * Allows callbacks to be registered that are executed when the store is
   * cleared. `onClearStore` returns an unsubscribe function that can be used
   * to remove registered callbacks.
   */
  onClearStore(cb) {
    this.clearStoreCallbacks.push(cb);
    return () => {
      this.clearStoreCallbacks = this.clearStoreCallbacks.filter((c) => c !== cb);
    };
  }
  /**
   * Refetches all of your active queries.
   *
   * `refetchObservableQueries()` is useful if you want to bring the client back to proper state in case of a network outage
   *
   * It is important to remember that `refetchObservableQueries()` _will_ refetch any active
   * queries. This means that any components that might be mounted will execute
   * their queries again using your network interface. If you do not want to
   * re-execute any queries then you should make sure to stop watching any
   * active queries.
   * Takes optional parameter `includeStandby` which will include queries in standby-mode when refetching.
   *
   * Note: `cache-only` queries are not refetched by this function.
   */
  refetchObservableQueries(includeStandby) {
    return this.queryManager.refetchObservableQueries(includeStandby);
  }
  /**
   * Refetches specified active queries. Similar to "refetchObservableQueries()" but with a specific list of queries.
   *
   * `refetchQueries()` is useful for use cases to imperatively refresh a selection of queries.
   *
   * It is important to remember that `refetchQueries()` _will_ refetch specified active
   * queries. This means that any components that might be mounted will execute
   * their queries again using your network interface. If you do not want to
   * re-execute any queries then you should make sure to stop watching any
   * active queries.
   */
  refetchQueries(options) {
    const map2 = this.queryManager.refetchQueries(options);
    const queries = [];
    const results = [];
    map2.forEach((result2, obsQuery) => {
      queries.push(obsQuery);
      results.push(result2);
    });
    const result = Promise.all(results);
    result.queries = queries;
    result.results = results;
    result.catch((error) => {
      __DEV__ && invariant.debug(76, error);
    });
    return result;
  }
  /**
   * Get all currently active `ObservableQuery` objects, in a `Set`.
   *
   * An "active" query is one that has observers and a `fetchPolicy` other than
   * "standby" or "cache-only".
   *
   * You can include all `ObservableQuery` objects (including the inactive ones)
   * by passing "all" instead of "active", or you can include just a subset of
   * active queries by passing an array of query names or DocumentNode objects.
   *
   * Note: This method only returns queries that have active subscribers. Queries
   * without subscribers are not tracked by the client.
   */
  getObservableQueries(include = "active") {
    return this.queryManager.getObservableQueries(include);
  }
  /**
   * Exposes the cache's complete state, in a serializable format for later restoration.
   *
   * @remarks
   *
   * This can be useful for debugging in order to inspect the full state of the
   * cache.
   *
   * @param optimistic - Determines whether the result contains data from the
   * optimistic layer
   */
  extract(optimistic) {
    return this.cache.extract(optimistic);
  }
  /**
   * Replaces existing state in the cache (if any) with the values expressed by
   * `serializedState`.
   *
   * Called when hydrating a cache (server side rendering, or offline storage),
   * and also (potentially) during hot reloads.
   */
  restore(serializedState) {
    return this.cache.restore(serializedState);
  }
  /**
   * Define a new ApolloLink (or link chain) that Apollo Client will use.
   */
  setLink(newLink) {
    this.link = newLink;
  }
  get defaultContext() {
    return this.queryManager.defaultContext;
  }
  transform(document, dataMasking = false) {
    const transformed = this.queryManager.transform(document);
    return dataMasking ? this.maskedFragmentTransform.transformDocument(transformed) : transformed;
  }
};
if (__DEV__) {
  ApolloClient.prototype.getMemoryInternals = getApolloClientMemoryInternals;
}

// node_modules/.pnpm/graphql-tag@2.12.6_graphql@16.12.0/node_modules/graphql-tag/lib/index.js
var docCache = /* @__PURE__ */ new Map();
var fragmentSourceMap = /* @__PURE__ */ new Map();
var printFragmentWarnings = true;
var experimentalFragmentVariables = false;
function normalize2(string) {
  return string.replace(/[\s,]+/g, " ").trim();
}
function cacheKeyFromLoc(loc) {
  return normalize2(loc.source.body.substring(loc.start, loc.end));
}
function processFragments(ast) {
  var seenKeys = /* @__PURE__ */ new Set();
  var definitions = [];
  ast.definitions.forEach(function(fragmentDefinition) {
    if (fragmentDefinition.kind === "FragmentDefinition") {
      var fragmentName = fragmentDefinition.name.value;
      var sourceKey = cacheKeyFromLoc(fragmentDefinition.loc);
      var sourceKeySet = fragmentSourceMap.get(fragmentName);
      if (sourceKeySet && !sourceKeySet.has(sourceKey)) {
        if (printFragmentWarnings) {
          console.warn("Warning: fragment with name " + fragmentName + " already exists.\ngraphql-tag enforces all fragment names across your application to be unique; read more about\nthis in the docs: http://dev.apollodata.com/core/fragments.html#unique-names");
        }
      } else if (!sourceKeySet) {
        fragmentSourceMap.set(fragmentName, sourceKeySet = /* @__PURE__ */ new Set());
      }
      sourceKeySet.add(sourceKey);
      if (!seenKeys.has(sourceKey)) {
        seenKeys.add(sourceKey);
        definitions.push(fragmentDefinition);
      }
    } else {
      definitions.push(fragmentDefinition);
    }
  });
  return __assign(__assign({}, ast), { definitions });
}
function stripLoc(doc) {
  var workSet = new Set(doc.definitions);
  workSet.forEach(function(node) {
    if (node.loc)
      delete node.loc;
    Object.keys(node).forEach(function(key) {
      var value = node[key];
      if (value && typeof value === "object") {
        workSet.add(value);
      }
    });
  });
  var loc = doc.loc;
  if (loc) {
    delete loc.startToken;
    delete loc.endToken;
  }
  return doc;
}
function parseDocument(source) {
  var cacheKey = normalize2(source);
  if (!docCache.has(cacheKey)) {
    var parsed = parse(source, {
      experimentalFragmentVariables,
      allowLegacyFragmentVariables: experimentalFragmentVariables
    });
    if (!parsed || parsed.kind !== "Document") {
      throw new Error("Not a valid GraphQL document.");
    }
    docCache.set(cacheKey, stripLoc(processFragments(parsed)));
  }
  return docCache.get(cacheKey);
}
function gql(literals) {
  var args = [];
  for (var _i = 1; _i < arguments.length; _i++) {
    args[_i - 1] = arguments[_i];
  }
  if (typeof literals === "string") {
    literals = [literals];
  }
  var result = literals[0];
  args.forEach(function(arg, i) {
    if (arg && arg.kind === "Document") {
      result += arg.loc.source.body;
    } else {
      result += arg;
    }
    result += literals[i + 1];
  });
  return parseDocument(result);
}
function resetCaches() {
  docCache.clear();
  fragmentSourceMap.clear();
}
function disableFragmentWarnings() {
  printFragmentWarnings = false;
}
function enableExperimentalFragmentVariables() {
  experimentalFragmentVariables = true;
}
function disableExperimentalFragmentVariables() {
  experimentalFragmentVariables = false;
}
var extras = {
  gql,
  resetCaches,
  disableFragmentWarnings,
  enableExperimentalFragmentVariables,
  disableExperimentalFragmentVariables
};
(function(gql_1) {
  gql_1.gql = extras.gql, gql_1.resetCaches = extras.resetCaches, gql_1.disableFragmentWarnings = extras.disableFragmentWarnings, gql_1.enableExperimentalFragmentVariables = extras.enableExperimentalFragmentVariables, gql_1.disableExperimentalFragmentVariables = extras.disableExperimentalFragmentVariables;
})(gql || (gql = {}));
gql["default"] = gql;

export {
  ApolloCache,
  MissingFieldError,
  defaultDataIdFromObject,
  makeVar,
  InMemoryCache,
  NetworkStatus,
  ObservableQuery,
  ApolloClient,
  gql,
  resetCaches,
  disableFragmentWarnings,
  enableExperimentalFragmentVariables,
  disableExperimentalFragmentVariables
};
//# sourceMappingURL=chunk-4TE4AOGQ.js.map
