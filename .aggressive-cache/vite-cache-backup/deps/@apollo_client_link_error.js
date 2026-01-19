import {
  CombinedGraphQLErrors,
  PROTOCOL_ERRORS_SYMBOL,
  graphQLResultHasProtocolErrors,
  toErrorLike
} from "./chunk-LSOS6EAY.js";
import {
  ApolloLink,
  Observable
} from "./chunk-ST4AGMGU.js";
import "./chunk-QJSJWK6O.js";
import "./chunk-EWTE5DHJ.js";

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/link/error/index.js
function onError(errorHandler) {
  return new ErrorLink(errorHandler);
}
var ErrorLink = class extends ApolloLink {
  constructor(errorHandler) {
    super((operation, forward) => {
      return new Observable((observer) => {
        let sub;
        let retriedSub;
        let retriedResult;
        try {
          sub = forward(operation).subscribe({
            next: (result) => {
              const handler = operation.client["queryManager"].incrementalHandler;
              const errors = handler.isIncrementalResult(result) ? handler.extractErrors(result) : result.errors;
              if (errors) {
                retriedResult = errorHandler({
                  error: new CombinedGraphQLErrors(result, errors),
                  result,
                  operation,
                  forward
                });
              } else if (graphQLResultHasProtocolErrors(result)) {
                retriedResult = errorHandler({
                  error: result.extensions[PROTOCOL_ERRORS_SYMBOL],
                  result,
                  operation,
                  forward
                });
              }
              retriedSub = retriedResult == null ? void 0 : retriedResult.subscribe(observer);
              if (!retriedSub) {
                observer.next(result);
              }
            },
            error: (error) => {
              retriedResult = errorHandler({
                operation,
                error: toErrorLike(error),
                forward
              });
              retriedSub = retriedResult == null ? void 0 : retriedResult.subscribe(observer);
              if (!retriedSub) {
                observer.error(error);
              }
            },
            complete: () => {
              if (!retriedResult) {
                observer.complete();
              }
            }
          });
        } catch (e) {
          errorHandler({ error: toErrorLike(e), operation, forward });
          observer.error(e);
        }
        return () => {
          if (sub)
            sub.unsubscribe();
          if (retriedSub)
            retriedSub.unsubscribe();
        };
      });
    });
  }
};
export {
  ErrorLink,
  onError
};
//# sourceMappingURL=@apollo_client_link_error.js.map
