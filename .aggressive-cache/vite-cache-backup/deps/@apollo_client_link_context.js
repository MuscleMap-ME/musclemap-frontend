import {
  ApolloLink,
  Observable
} from "./chunk-ST4AGMGU.js";
import "./chunk-QJSJWK6O.js";
import "./chunk-EWTE5DHJ.js";

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/link/context/index.js
function setContext(setter) {
  return new SetContextLink((prevContext, operation) => setter(operation, prevContext));
}
var SetContextLink = class extends ApolloLink {
  constructor(setter) {
    super((operation, forward) => {
      const { ...request } = operation;
      Object.defineProperty(request, "client", {
        enumerable: false,
        value: operation.client
      });
      return new Observable((observer) => {
        let closed = false;
        Promise.resolve(request).then((req) => setter(operation.getContext(), req)).then(operation.setContext).then(() => {
          if (!closed) {
            forward(operation).subscribe(observer);
          }
        }).catch(observer.error.bind(observer));
        return () => {
          closed = true;
        };
      });
    });
  }
};
export {
  SetContextLink,
  setContext
};
//# sourceMappingURL=@apollo_client_link_context.js.map
