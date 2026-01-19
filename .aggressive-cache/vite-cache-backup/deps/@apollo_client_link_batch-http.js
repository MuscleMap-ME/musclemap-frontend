import {
  ClientAwarenessLink,
  checkFetcher,
  defaultPrinter,
  fallbackHttpConfig,
  parseAndCheckHttpResponse,
  selectHttpOptionsAndBodyInternal,
  selectURI
} from "./chunk-AT3QSBN7.js";
import "./chunk-LSOS6EAY.js";
import {
  ApolloLink,
  EMPTY,
  Observable,
  __DEV__,
  compact,
  filterOperationVariables,
  maybe,
  throwError
} from "./chunk-ST4AGMGU.js";
import "./chunk-QJSJWK6O.js";
import {
  __publicField
} from "./chunk-EWTE5DHJ.js";

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/link/batch/batching.js
var OperationBatcher = class {
  constructor({ batchDebounce, batchInterval, batchMax, batchHandler, batchKey }) {
    // Queue on which the QueryBatcher will operate on a per-tick basis.
    __publicField(this, "batchesByKey", /* @__PURE__ */ new Map());
    __publicField(this, "scheduledBatchTimerByKey", /* @__PURE__ */ new Map());
    __publicField(this, "batchDebounce");
    __publicField(this, "batchInterval");
    __publicField(this, "batchMax");
    //This function is called to the queries in the queue to the server.
    __publicField(this, "batchHandler");
    __publicField(this, "batchKey");
    this.batchDebounce = batchDebounce;
    this.batchInterval = batchInterval;
    this.batchMax = batchMax || 0;
    this.batchHandler = batchHandler;
    this.batchKey = batchKey || (() => "");
  }
  enqueueRequest(request) {
    const requestCopy = {
      ...request,
      next: [],
      error: [],
      complete: [],
      subscribers: /* @__PURE__ */ new Set()
    };
    const key = this.batchKey(request.operation);
    if (!requestCopy.observable) {
      requestCopy.observable = new Observable((observer) => {
        let batch = this.batchesByKey.get(key);
        if (!batch)
          this.batchesByKey.set(key, batch = /* @__PURE__ */ new Set());
        const isFirstEnqueuedRequest = batch.size === 0;
        const isFirstSubscriber = requestCopy.subscribers.size === 0;
        requestCopy.subscribers.add(observer);
        if (isFirstSubscriber) {
          batch.add(requestCopy);
        }
        if (observer.next) {
          requestCopy.next.push(observer.next.bind(observer));
        }
        if (observer.error) {
          requestCopy.error.push(observer.error.bind(observer));
        }
        if (observer.complete) {
          requestCopy.complete.push(observer.complete.bind(observer));
        }
        if (isFirstEnqueuedRequest || this.batchDebounce) {
          this.scheduleQueueConsumption(key);
        }
        if (batch.size === this.batchMax) {
          this.consumeQueue(key);
        }
        return () => {
          var _a;
          if (requestCopy.subscribers.delete(observer) && requestCopy.subscribers.size < 1) {
            if (batch.delete(requestCopy) && batch.size < 1) {
              this.consumeQueue(key);
              (_a = batch.subscription) == null ? void 0 : _a.unsubscribe();
            }
          }
        };
      });
    }
    return requestCopy.observable;
  }
  // Consumes the queue.
  // Returns a list of promises (one for each query).
  consumeQueue(key = "") {
    const batch = this.batchesByKey.get(key);
    this.batchesByKey.delete(key);
    if (!batch || !batch.size) {
      return;
    }
    const operations = [];
    const forwards = [];
    const observables = [];
    const nexts = [];
    const errors = [];
    const completes = [];
    batch.forEach((request) => {
      operations.push(request.operation);
      forwards.push(request.forward);
      observables.push(request.observable);
      nexts.push(request.next);
      errors.push(request.error);
      completes.push(request.complete);
    });
    const batchedObservable = this.batchHandler(operations, forwards);
    const onError = (error) => {
      errors.forEach((rejecters) => {
        if (rejecters) {
          rejecters.forEach((e) => e(error));
        }
      });
    };
    batch.subscription = batchedObservable.subscribe({
      next: (results) => {
        if (!Array.isArray(results)) {
          results = [results];
        }
        if (nexts.length !== results.length) {
          const error = new Error(`server returned results with length ${results.length}, expected length of ${nexts.length}`);
          error.result = results;
          return onError(error);
        }
        results.forEach((result, index) => {
          if (nexts[index]) {
            nexts[index].forEach((next) => next(result));
          }
        });
      },
      error: onError,
      complete: () => {
        completes.forEach((complete) => {
          if (complete) {
            complete.forEach((c) => c());
          }
        });
      }
    });
    return observables;
  }
  scheduleQueueConsumption(key) {
    clearTimeout(this.scheduledBatchTimerByKey.get(key));
    this.scheduledBatchTimerByKey.set(key, setTimeout(() => {
      this.consumeQueue(key);
      this.scheduledBatchTimerByKey.delete(key);
    }, this.batchInterval));
  }
};

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/link/batch/batchLink.js
var BatchLink = class extends ApolloLink {
  constructor(options) {
    super();
    __publicField(this, "batcher");
    const { batchDebounce, batchInterval = 10, batchMax = 0, batchHandler = () => EMPTY, batchKey = () => "" } = options || {};
    this.batcher = new OperationBatcher({
      batchDebounce,
      batchInterval,
      batchMax,
      batchHandler,
      batchKey
    });
  }
  request(operation, forward) {
    return this.batcher.enqueueRequest({ operation, forward });
  }
};

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/link/batch-http/BaseBatchHttpLink.js
var backupFetch = maybe(() => fetch);
var BaseBatchHttpLink = class extends ApolloLink {
  constructor(options = {}) {
    super();
    __publicField(this, "batchDebounce");
    __publicField(this, "batchInterval");
    __publicField(this, "batchMax");
    __publicField(this, "batcher");
    let {
      uri = "/graphql",
      // use default global fetch if nothing is passed in
      fetch: preferredFetch,
      print = defaultPrinter,
      includeExtensions,
      preserveHeaderCase,
      batchInterval,
      batchDebounce,
      batchMax,
      batchKey,
      includeUnusedVariables = false,
      ...requestOptions
    } = options;
    if (__DEV__) {
      checkFetcher(preferredFetch || backupFetch);
    }
    const linkConfig = {
      http: compact({ includeExtensions, preserveHeaderCase }),
      options: requestOptions.fetchOptions,
      credentials: requestOptions.credentials,
      headers: requestOptions.headers
    };
    this.batchDebounce = batchDebounce;
    this.batchInterval = batchInterval || 10;
    this.batchMax = batchMax || 10;
    const batchHandler = (operations) => {
      const chosenURI = selectURI(operations[0], uri);
      const context = operations[0].getContext();
      const contextConfig = {
        http: context.http,
        options: context.fetchOptions,
        credentials: context.credentials,
        headers: context.headers
      };
      const optsAndBody = operations.map((operation) => {
        const result = selectHttpOptionsAndBodyInternal(operation, print, fallbackHttpConfig, linkConfig, contextConfig);
        if (result.body.variables && !includeUnusedVariables) {
          result.body.variables = filterOperationVariables(result.body.variables, operation.query);
        }
        return result;
      });
      const loadedBody = optsAndBody.map(({ body }) => body);
      const options2 = optsAndBody[0].options;
      if (options2.method === "GET") {
        return throwError(() => new Error("apollo-link-batch-http does not support GET requests"));
      }
      try {
        options2.body = JSON.stringify(loadedBody);
      } catch (parseError) {
        return throwError(() => parseError);
      }
      let controller;
      if (!options2.signal && typeof AbortController !== "undefined") {
        controller = new AbortController();
        options2.signal = controller.signal;
      }
      return new Observable((observer) => {
        const currentFetch = preferredFetch || maybe(() => fetch) || backupFetch;
        currentFetch(chosenURI, options2).then((response) => {
          operations.forEach((operation) => operation.setContext({ response }));
          return response;
        }).then(parseAndCheckHttpResponse(operations)).then((result) => {
          controller = void 0;
          observer.next(result);
          observer.complete();
          return result;
        }).catch((err) => {
          controller = void 0;
          observer.error(err);
        });
        return () => {
          if (controller)
            controller.abort();
        };
      });
    };
    batchKey = batchKey || ((operation) => {
      const context = operation.getContext();
      const contextConfig = {
        http: context.http,
        options: context.fetchOptions,
        credentials: context.credentials,
        headers: context.headers
      };
      return selectURI(operation, uri) + JSON.stringify(contextConfig);
    });
    this.batcher = new BatchLink({
      batchDebounce: this.batchDebounce,
      batchInterval: this.batchInterval,
      batchMax: this.batchMax,
      batchKey,
      batchHandler
    });
  }
  request(operation, forward) {
    return this.batcher.request(operation, forward);
  }
};

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/link/batch-http/batchHttpLink.js
var BatchHttpLink = class extends ApolloLink {
  constructor(options = {}) {
    const { left, right, request } = ApolloLink.from([
      new ClientAwarenessLink(options),
      new BaseBatchHttpLink(options)
    ]);
    super(request);
    Object.assign(this, { left, right });
  }
};
export {
  BaseBatchHttpLink,
  BatchHttpLink
};
//# sourceMappingURL=@apollo_client_link_batch-http.js.map
