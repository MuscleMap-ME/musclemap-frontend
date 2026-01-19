import {
  PROTOCOL_ERRORS_SYMBOL,
  graphQLResultHasProtocolErrors,
  toErrorLike
} from "./chunk-LSOS6EAY.js";
import {
  ApolloLink,
  Observable
} from "./chunk-ST4AGMGU.js";
import "./chunk-QJSJWK6O.js";
import {
  __publicField
} from "./chunk-EWTE5DHJ.js";

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/link/retry/delayFunction.js
function buildDelayFunction(delayOptions) {
  const { initial = 300, jitter = true, max = Infinity } = delayOptions || {};
  const baseDelay = jitter ? initial : initial / 2;
  return function delayFunction(count) {
    let delay = Math.min(max, baseDelay * 2 ** count);
    if (jitter) {
      delay = Math.random() * delay;
    }
    return delay;
  };
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/link/retry/retryFunction.js
function buildRetryFunction(retryOptions) {
  const { retryIf, max = 5 } = retryOptions || {};
  return function retryFunction(count, operation, error) {
    if (count >= max)
      return false;
    return retryIf ? retryIf(error, operation) : !!error;
  };
}

// node_modules/.pnpm/@apollo+client@4.0.11_graphql-ws@6.0.6_@fastify+websocket@11.2.0_graphql@16.12.0_ws@8.1_e28c7a85d7e4e0cec9354ae39436a7fe/node_modules/@apollo/client/link/retry/retryLink.js
var RetryableOperation = class {
  constructor(observer, operation, forward, delayFor, retryIf) {
    __publicField(this, "observer");
    __publicField(this, "operation");
    __publicField(this, "forward");
    __publicField(this, "delayFor");
    __publicField(this, "retryIf");
    __publicField(this, "retryCount", 0);
    __publicField(this, "currentSubscription", null);
    __publicField(this, "timerId");
    __publicField(this, "onError", async (error, onContinue) => {
      this.retryCount += 1;
      const errorLike = toErrorLike(error);
      const shouldRetry = await this.retryIf(this.retryCount, this.operation, errorLike);
      if (shouldRetry) {
        this.scheduleRetry(this.delayFor(this.retryCount, this.operation, errorLike));
        return;
      }
      onContinue();
    });
    this.observer = observer;
    this.operation = operation;
    this.forward = forward;
    this.delayFor = delayFor;
    this.retryIf = retryIf;
    this.try();
  }
  /**
   * Stop retrying for the operation, and cancel any in-progress requests.
   */
  cancel() {
    if (this.currentSubscription) {
      this.currentSubscription.unsubscribe();
    }
    clearTimeout(this.timerId);
    this.timerId = void 0;
    this.currentSubscription = null;
  }
  try() {
    this.currentSubscription = this.forward(this.operation).subscribe({
      next: (result) => {
        var _a;
        if (graphQLResultHasProtocolErrors(result)) {
          this.onError(result.extensions[PROTOCOL_ERRORS_SYMBOL], () => (
            // Pretend like we never encountered this error and move the result
            // along for Apollo Client core to handle this error.
            this.observer.next(result)
          ));
          (_a = this.currentSubscription) == null ? void 0 : _a.unsubscribe();
          return;
        }
        this.observer.next(result);
      },
      error: (error) => this.onError(error, () => this.observer.error(error)),
      complete: this.observer.complete.bind(this.observer)
    });
  }
  scheduleRetry(delay) {
    if (this.timerId) {
      throw new Error(`RetryLink BUG! Encountered overlapping retries`);
    }
    this.timerId = setTimeout(() => {
      this.timerId = void 0;
      this.try();
    }, delay);
  }
};
var RetryLink = class extends ApolloLink {
  constructor(options) {
    super();
    __publicField(this, "delayFor");
    __publicField(this, "retryIf");
    const { attempts, delay } = options || {};
    this.delayFor = typeof delay === "function" ? delay : buildDelayFunction(delay);
    this.retryIf = typeof attempts === "function" ? attempts : buildRetryFunction(attempts);
  }
  request(operation, forward) {
    return new Observable((observer) => {
      const retryable = new RetryableOperation(observer, operation, forward, this.delayFor, this.retryIf);
      return () => {
        retryable.cancel();
      };
    });
  }
};
export {
  RetryLink
};
//# sourceMappingURL=@apollo_client_link_retry.js.map
