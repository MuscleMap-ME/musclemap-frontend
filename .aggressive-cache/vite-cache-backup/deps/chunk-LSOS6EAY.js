import {
  __publicField
} from "./chunk-EWTE5DHJ.js";

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/errors/utils.js
function isBranded(error, name) {
  return typeof error === "object" && error !== null && error[Symbol.for("apollo.error")] === name;
}
function brand(error) {
  Object.defineProperty(error, Symbol.for("apollo.error"), {
    value: error.name,
    enumerable: false,
    writable: false,
    configurable: false
  });
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/errors/CombinedProtocolErrors.js
function defaultFormatMessage(errors) {
  return errors.map((e) => e.message || "Error message not found.").join("\n");
}
var _CombinedProtocolErrors = class _CombinedProtocolErrors extends Error {
  constructor(protocolErrors) {
    super(_CombinedProtocolErrors.formatMessage(protocolErrors, {
      defaultFormatMessage
    }));
    /**
    * The raw list of errors returned by the top-level `errors` field in the
    * multipart HTTP subscription response.
    */
    __publicField(this, "errors");
    this.name = "CombinedProtocolErrors";
    this.errors = protocolErrors;
    brand(this);
    Object.setPrototypeOf(this, _CombinedProtocolErrors.prototype);
  }
  /**
   * A method that determines whether an error is a `CombinedProtocolErrors`
   * object. This method enables TypeScript to narrow the error type.
   *
   * @example
   *
   * ```ts
   * if (CombinedProtocolErrors.is(error)) {
   *   // TypeScript now knows `error` is a CombinedProtocolErrors object
   *   console.log(error.errors);
   * }
   * ```
   */
  static is(error) {
    return isBranded(error, "CombinedProtocolErrors");
  }
};
/**
* A function that formats the error message used for the error's `message`
* property. Override this method to provide your own formatting.
* 
* @remarks
* 
* The `formatMessage` function is called by the `CombinedProtocolErrors`
* constructor to provide a formatted message as the `message` property of the
* `CombinedProtocolErrors` object. Follow the ["Providing a custom message
* formatter"](https://www.apollographql.com/docs/react/api/errors/CombinedProtocolErrors#providing-a-custom-message-formatter) guide to learn how to modify the message format.
* 
* @param errors - The array of GraphQL errors returned from the server in the
* `errors` field of the response.
* @param options - Additional context that could be useful when formatting
* the message.
*/
__publicField(_CombinedProtocolErrors, "formatMessage", defaultFormatMessage);
var CombinedProtocolErrors = _CombinedProtocolErrors;

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/errors/UnconventionalError.js
var UnconventionalError = class _UnconventionalError extends Error {
  /**
   * A method that determines whether an error is an `UnconventionalError`
   * object. This method enables TypeScript to narrow the error type.
   *
   * @example
   *
   * ```ts
   * if (UnconventionalError.is(error)) {
   *   // TypeScript now knows `error` is a UnconventionalError object
   *   console.log("What caused this?", error.cause);
   * }
   * ```
   */
  static is(error) {
    return isBranded(error, "UnconventionalError");
  }
  constructor(errorType) {
    super("An error of unexpected shape occurred.", { cause: errorType });
    this.name = "UnconventionalError";
    brand(this);
    Object.setPrototypeOf(this, _UnconventionalError.prototype);
  }
};

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/errors/CombinedGraphQLErrors.js
function defaultFormatMessage2(errors) {
  return errors.filter((e) => e).map((e) => e.message || "Error message not found.").join("\n");
}
var _CombinedGraphQLErrors = class _CombinedGraphQLErrors extends Error {
  constructor(result, errors = result.errors || []) {
    super(_CombinedGraphQLErrors.formatMessage(errors, {
      result,
      defaultFormatMessage: defaultFormatMessage2
    }));
    /**
    * The raw list of GraphQL errors returned by the `errors` field in the GraphQL response.
    */
    __publicField(this, "errors");
    /**
    * Partial data returned in the `data` field of the GraphQL response.
    */
    __publicField(this, "data");
    /**
    * Extensions returned by the `extensions` field in the GraphQL response.
    */
    __publicField(this, "extensions");
    this.errors = errors;
    this.data = result.data;
    this.extensions = result.extensions;
    this.name = "CombinedGraphQLErrors";
    brand(this);
    Object.setPrototypeOf(this, _CombinedGraphQLErrors.prototype);
  }
  /**
  * A method that determines whether an error is a `CombinedGraphQLErrors`
  * object. This method enables TypeScript to narrow the error type.
  * 
  * @example
  * 
  * ```ts
  * if (CombinedGraphQLErrors.is(error)) {
  *   // TypeScript now knows `error` is a `CombinedGraphQLErrors` object
  *   console.log(error.errors);
  * }
  * ```
  */
  static is(error) {
    return isBranded(error, "CombinedGraphQLErrors");
  }
};
/**
* A function that formats the error message used for the error's `message`
* property. Override this method to provide your own formatting.
* 
* @remarks
* 
* The `formatMessage` function is called by the `CombinedGraphQLErrors`
* constructor to provide a formatted message as the `message` property of the
* `CombinedGraphQLErrors` object. Follow the ["Providing a custom message
* formatter"](https://www.apollographql.com/docs/react/api/errors/CombinedGraphQLErrors#providing-a-custom-message-formatter) guide to learn how to modify the message format.
* 
* @param errors - The array of GraphQL errors returned from the server in
* the `errors` field of the response.
* @param options - Additional context that could be useful when formatting
* the message.
*/
__publicField(_CombinedGraphQLErrors, "formatMessage", defaultFormatMessage2);
var CombinedGraphQLErrors = _CombinedGraphQLErrors;

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/errors/LinkError.js
var registry = /* @__PURE__ */ new WeakSet();
function registerLinkError(error) {
  registry.add(error);
}
var LinkError = {
  /**
   * A method that determines whether an error originated from the link chain.
   * `is` does not provide any type narrowing.
   *
   * @example
   *
   * ```ts
   * if (LinkError.is(error)) {
   *   // The error originated from the link chain
   *   console.log("Got network error:", error.message);
   * }
   * ```
   */
  is: (error) => registry.has(error)
};

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/errors/LocalStateError.js
var LocalStateError = class _LocalStateError extends Error {
  constructor(message, options = {}) {
    super(message, { cause: options.sourceError });
    /**
    * The path to the field that caused the error.
    */
    __publicField(this, "path");
    this.name = "LocalStateError";
    this.path = options.path;
    brand(this);
    Object.setPrototypeOf(this, _LocalStateError.prototype);
  }
  /**
   * A method that determines whether an error is a `LocalStateError`
   * object. This method enables TypeScript to narrow the error type.
   *
   * @example
   *
   * ```ts
   * if (LocalStateError.is(error)) {
   *   // TypeScript now knows `error` is a LocalStateError object
   *   console.log(error.path);
   * }
   * ```
   */
  static is(error) {
    return isBranded(error, "LocalStateError");
  }
};

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/errors/ServerError.js
var ServerError = class _ServerError extends Error {
  constructor(message, options) {
    super(message);
    /**
    * The raw [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) object provided by the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
    */
    __publicField(this, "response");
    /**
    * The status code returned by the server in the response. This is provided as
    * a shortcut for `response.status`.
    */
    __publicField(this, "statusCode");
    /**
    * The raw response body text.
    */
    __publicField(this, "bodyText");
    this.name = "ServerError";
    this.response = options.response;
    this.statusCode = options.response.status;
    this.bodyText = options.bodyText;
    brand(this);
    Object.setPrototypeOf(this, _ServerError.prototype);
  }
  /**
   * A method that determines whether an error is a `ServerError` object. This
   * method enables TypeScript to narrow the error type.
   *
   * @example
   *
   * ```ts
   * if (ServerError.is(error)) {
   *   // TypeScript now knows `error` is a ServerError object
   *   console.log(error.errors);
   * }
   * ```
   */
  static is(error) {
    return isBranded(error, "ServerError");
  }
};

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/errors/ServerParseError.js
var ServerParseError = class _ServerParseError extends Error {
  constructor(originalParseError, options) {
    super(originalParseError instanceof Error ? originalParseError.message : "Could not parse server response", { cause: originalParseError });
    /**
    * The raw [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) object provided by the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
    */
    __publicField(this, "response");
    /**
    * The status code returned by the server in the response. This is provided
    * as a shortcut for `response.status`.
    */
    __publicField(this, "statusCode");
    /**
    * The raw response body text.
    */
    __publicField(this, "bodyText");
    this.name = "ServerParseError";
    this.response = options.response;
    this.statusCode = options.response.status;
    this.bodyText = options.bodyText;
    brand(this);
    Object.setPrototypeOf(this, _ServerParseError.prototype);
  }
  /**
   * A method that determines whether an error is a `ServerParseError`
   * object. This method enables TypeScript to narrow the error type.
   *
   * @example
   *
   * ```ts
   * if (ServerParseError.is(error)) {
   *   // TypeScript now knows `error` is a ServerParseError object
   *   console.log(error.statusCode);
   * }
   * ```
   */
  static is(error) {
    return isBranded(error, "ServerParseError");
  }
};

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/errors/isErrorLike.js
function isErrorLike(error) {
  return error !== null && typeof error === "object" && typeof error.message === "string" && typeof error.name === "string" && (typeof error.stack === "string" || typeof error.stack === "undefined");
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/errors/index.js
var PROTOCOL_ERRORS_SYMBOL = Symbol();
function graphQLResultHasProtocolErrors(result) {
  if ("extensions" in result) {
    return CombinedProtocolErrors.is(result.extensions[PROTOCOL_ERRORS_SYMBOL]);
  }
  return false;
}
function toErrorLike(error) {
  if (isErrorLike(error)) {
    return error;
  }
  if (typeof error === "string") {
    return new Error(error, { cause: error });
  }
  return new UnconventionalError(error);
}

export {
  CombinedProtocolErrors,
  UnconventionalError,
  CombinedGraphQLErrors,
  registerLinkError,
  LinkError,
  LocalStateError,
  ServerError,
  ServerParseError,
  PROTOCOL_ERRORS_SYMBOL,
  graphQLResultHasProtocolErrors,
  toErrorLike
};
//# sourceMappingURL=chunk-LSOS6EAY.js.map
