/**
 * Action Executor
 * Executes test actions (HTTP requests, GraphQL, control flow, etc.)
 */

import type {
  Action,
  ActionResult,
  ActionParams,
  TestContext,
} from './types.js';

// ============================================================================
// HTTP Client
// ============================================================================

interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
}

async function httpRequest(
  method: string,
  url: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
    timeout?: number;
  }
): Promise<HttpResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    };

    if (options.body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);

    // Parse response headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Parse response body
    let data: unknown;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers,
      data,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// Action Executors
// ============================================================================

type ActionExecutor = (
  params: ActionParams,
  ctx: TestContext
) => Promise<ActionResult>;

const executors: Record<string, ActionExecutor> = {
  /**
   * Execute HTTP request
   */
  http_request: async (params, ctx) => {
    const startTime = Date.now();

    try {
      const { method = 'GET', path, body, headers = {}, expectedStatus } = params;

      if (!path) {
        throw new Error('HTTP request requires a path');
      }

      const url = `${ctx.baseUrl}${path}`;

      // Add auth token if available
      const requestHeaders: Record<string, string> = { ...headers };
      if (ctx.token && !requestHeaders['Authorization']) {
        requestHeaders['Authorization'] = `Bearer ${ctx.token}`;
      }

      const response = await httpRequest(method, url, {
        body,
        headers: requestHeaders,
        timeout: ctx.currentStep?.timeout || 30000,
      });

      // Check expected status
      let success = true;
      if (expectedStatus !== undefined) {
        const statuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
        success = statuses.includes(response.status);
      }

      return {
        action: { type: 'http_request', name: `${method} ${path}`, params },
        success,
        data: response,
        statusCode: response.status,
        headers: response.headers,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        action: { type: 'http_request', name: `HTTP ${params.method || 'GET'} ${params.path}`, params },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
      };
    }
  },

  /**
   * Execute GraphQL query
   */
  graphql_query: async (params, ctx) => {
    const startTime = Date.now();

    try {
      const { query, variables } = params;

      if (!query) {
        throw new Error('GraphQL query requires a query string');
      }

      const url = `${ctx.baseUrl}/graphql`;

      const headers: Record<string, string> = {};
      if (ctx.token) {
        headers['Authorization'] = `Bearer ${ctx.token}`;
      }

      const response = await httpRequest('POST', url, {
        body: { query, variables },
        headers,
        timeout: ctx.currentStep?.timeout || 30000,
      });

      const responseData = response.data as { data?: unknown; errors?: unknown[] };
      const hasErrors = responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0;

      return {
        action: { type: 'graphql_query', name: 'GraphQL Query', params },
        success: response.status === 200 && !hasErrors,
        data: responseData,
        statusCode: response.status,
        headers: response.headers,
        duration: Date.now() - startTime,
        error: hasErrors ? new Error(JSON.stringify(responseData.errors)) : undefined,
      };
    } catch (error) {
      return {
        action: { type: 'graphql_query', name: 'GraphQL Query', params },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
      };
    }
  },

  /**
   * Execute GraphQL mutation
   */
  graphql_mutation: async (params, ctx) => {
    const startTime = Date.now();

    try {
      const { mutation, variables } = params;

      if (!mutation) {
        throw new Error('GraphQL mutation requires a mutation string');
      }

      const url = `${ctx.baseUrl}/graphql`;

      const headers: Record<string, string> = {};
      if (ctx.token) {
        headers['Authorization'] = `Bearer ${ctx.token}`;
      }

      const response = await httpRequest('POST', url, {
        body: { query: mutation, variables },
        headers,
        timeout: ctx.currentStep?.timeout || 30000,
      });

      const responseData = response.data as { data?: unknown; errors?: unknown[] };
      const hasErrors = responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0;

      return {
        action: { type: 'graphql_mutation', name: 'GraphQL Mutation', params },
        success: response.status === 200 && !hasErrors,
        data: responseData,
        statusCode: response.status,
        headers: response.headers,
        duration: Date.now() - startTime,
        error: hasErrors ? new Error(JSON.stringify(responseData.errors)) : undefined,
      };
    } catch (error) {
      return {
        action: { type: 'graphql_mutation', name: 'GraphQL Mutation', params },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
      };
    }
  },

  /**
   * Wait/delay action
   */
  wait: async (params) => {
    const startTime = Date.now();
    const delay = params.delay || 1000;

    await new Promise((resolve) => setTimeout(resolve, delay));

    return {
      action: { type: 'wait', name: `Wait ${delay}ms`, params },
      success: true,
      duration: Date.now() - startTime,
    };
  },

  /**
   * Set a context variable
   */
  set_variable: async (params, ctx) => {
    const startTime = Date.now();

    try {
      const { variable, value } = params;

      if (!variable) {
        throw new Error('set_variable requires a variable name');
      }

      const resolvedValue = typeof value === 'function' ? await value(ctx) : value;
      ctx.variables.set(variable, resolvedValue);

      return {
        action: { type: 'set_variable', name: `Set ${variable}`, params },
        success: true,
        data: { [variable]: resolvedValue },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        action: { type: 'set_variable', name: `Set ${params.variable}`, params },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
      };
    }
  },

  /**
   * Log message
   */
  log: async (params, ctx) => {
    const startTime = Date.now();
    const { message, level = 'info' } = params;

    if (ctx.verbose) {
      const prefix = {
        debug: '\x1b[90m[DEBUG]\x1b[0m',
        info: '\x1b[34m[INFO]\x1b[0m',
        warn: '\x1b[33m[WARN]\x1b[0m',
        error: '\x1b[31m[ERROR]\x1b[0m',
      }[level];

      console.log(`${prefix} ${message}`);
    }

    return {
      action: { type: 'log', name: `Log: ${message?.slice(0, 30)}...`, params },
      success: true,
      duration: Date.now() - startTime,
    };
  },

  /**
   * Conditional execution
   */
  conditional: async (params, ctx) => {
    const startTime = Date.now();

    try {
      const { condition, actions } = params;

      if (!condition) {
        throw new Error('conditional requires a condition function');
      }

      const shouldRun = await condition(ctx);

      if (shouldRun && actions && actions.length > 0) {
        const results: ActionResult[] = [];
        for (const action of actions) {
          const result = await executeAction(action, ctx);
          results.push(result);
          if (!result.success) break;
        }
        return {
          action: { type: 'conditional', name: 'Conditional', params },
          success: results.every((r) => r.success),
          data: { ran: true, results },
          duration: Date.now() - startTime,
        };
      }

      return {
        action: { type: 'conditional', name: 'Conditional', params },
        success: true,
        data: { ran: false },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        action: { type: 'conditional', name: 'Conditional', params },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
      };
    }
  },

  /**
   * Loop execution
   */
  loop: async (params, ctx) => {
    const startTime = Date.now();

    try {
      const { iterations = 1, actions, delay = 0 } = params;

      if (!actions || actions.length === 0) {
        throw new Error('loop requires actions');
      }

      const allResults: ActionResult[][] = [];

      for (let i = 0; i < iterations; i++) {
        ctx.variables.set('_loopIndex', i);
        const iterationResults: ActionResult[] = [];

        for (const action of actions) {
          const result = await executeAction(action, ctx);
          iterationResults.push(result);
          if (!result.success) break;
        }

        allResults.push(iterationResults);

        if (delay > 0 && i < iterations - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      const success = allResults.every((ir) => ir.every((r) => r.success));

      return {
        action: { type: 'loop', name: `Loop ${iterations}x`, params },
        success,
        data: { iterations: allResults.length, results: allResults },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        action: { type: 'loop', name: 'Loop', params },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
      };
    }
  },

  /**
   * Parallel execution
   */
  parallel: async (params, ctx) => {
    const startTime = Date.now();

    try {
      const { actions } = params;

      if (!actions || actions.length === 0) {
        throw new Error('parallel requires actions');
      }

      const results = await Promise.all(
        actions.map((action) => executeAction(action, ctx))
      );

      const success = results.every((r) => r.success);

      return {
        action: { type: 'parallel', name: `Parallel ${actions.length} actions`, params },
        success,
        data: { results },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        action: { type: 'parallel', name: 'Parallel', params },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
      };
    }
  },
};

// ============================================================================
// Main Executor
// ============================================================================

/**
 * Execute a single action
 */
export async function executeAction(
  action: Action,
  ctx: TestContext
): Promise<ActionResult> {
  const executor = executors[action.type];

  if (!executor) {
    return {
      action,
      success: false,
      error: new Error(`Unknown action type: ${action.type}`),
      duration: 0,
    };
  }

  return executor(action.params, ctx);
}

/**
 * Execute multiple actions sequentially
 */
export async function executeActions(
  actions: Action[],
  ctx: TestContext
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];

  for (const action of actions) {
    const result = await executeAction(action, ctx);
    results.push(result);

    // Stop on failure unless explicitly continuing
    if (!result.success) {
      break;
    }
  }

  return results;
}

/**
 * Execute actions in parallel
 */
export async function executeActionsParallel(
  actions: Action[],
  ctx: TestContext
): Promise<ActionResult[]> {
  return Promise.all(actions.map((action) => executeAction(action, ctx)));
}

// ============================================================================
// Action Builders
// ============================================================================

/**
 * Build HTTP request action
 */
export function httpAction(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  path: string,
  options: {
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    expectedStatus?: number | number[];
  } = {}
): Action {
  return {
    type: 'http_request',
    name: `${method} ${path}`,
    params: {
      method,
      path,
      body: options.body,
      headers: options.headers,
      expectedStatus: options.expectedStatus,
    },
  };
}

/**
 * Build GraphQL query action
 */
export function graphqlQuery(
  query: string,
  variables?: Record<string, unknown>
): Action {
  return {
    type: 'graphql_query',
    name: 'GraphQL Query',
    params: { query, variables },
  };
}

/**
 * Build GraphQL mutation action
 */
export function graphqlMutation(
  mutation: string,
  variables?: Record<string, unknown>
): Action {
  return {
    type: 'graphql_mutation',
    name: 'GraphQL Mutation',
    params: { mutation, variables },
  };
}

/**
 * Build wait action
 */
export function wait(ms: number): Action {
  return {
    type: 'wait',
    name: `Wait ${ms}ms`,
    params: { delay: ms },
  };
}

/**
 * Build set variable action
 */
export function setVar(
  variable: string,
  value: unknown | ((ctx: TestContext) => unknown | Promise<unknown>)
): Action {
  return {
    type: 'set_variable',
    name: `Set ${variable}`,
    params: { variable, value },
  };
}

/**
 * Build log action
 */
export function log(message: string, level: 'debug' | 'info' | 'warn' | 'error' = 'info'): Action {
  return {
    type: 'log',
    name: `Log: ${message.slice(0, 20)}...`,
    params: { message, level },
  };
}

/**
 * Build conditional action
 */
export function when(
  condition: (ctx: TestContext) => boolean | Promise<boolean>,
  actions: Action[]
): Action {
  return {
    type: 'conditional',
    name: 'Conditional',
    params: { condition, actions },
  };
}

/**
 * Build loop action
 */
export function loop(iterations: number, actions: Action[], delay = 0): Action {
  return {
    type: 'loop',
    name: `Loop ${iterations}x`,
    params: { iterations, actions, delay },
  };
}

/**
 * Build parallel action
 */
export function parallel(actions: Action[]): Action {
  return {
    type: 'parallel',
    name: `Parallel ${actions.length}`,
    params: { actions },
  };
}

// ============================================================================
// Response Extractors
// ============================================================================

/**
 * Extract value from action result
 */
export function extractFromResult(
  result: ActionResult,
  path: string
): unknown {
  if (!result.data) return undefined;

  const parts = path.split('.');
  let current: unknown = result.data;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Extract token from login response
 */
export function extractToken(result: ActionResult): string | undefined {
  const data = result.data as { data?: { token?: string }; token?: string };
  return data?.data?.token || data?.token;
}

/**
 * Extract user ID from response
 */
export function extractUserId(result: ActionResult): string | undefined {
  const data = result.data as { data?: { id?: string; userId?: string; user?: { id?: string } } };
  return data?.data?.id || data?.data?.userId || data?.data?.user?.id;
}
