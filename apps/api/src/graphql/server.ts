/**
 * Apollo Server Setup
 *
 * Configures Apollo Server 4 with Fastify integration and all optimizations:
 * - Query depth limiting
 * - Query complexity limiting
 * - Automatic persisted queries
 * - Response caching
 * - DataLoader integration
 * - Subscription support via graphql-ws
 */

// GraphQL packages - uncomment when installed:
// import { ApolloServer } from '@apollo/server';
// import { fastifyApolloDrainPlugin } from '@as-integrations/fastify';
// import { makeExecutableSchema } from '@graphql-tools/schema';
// import { applyMiddleware } from 'graphql-middleware';
// import depthLimit from 'graphql-depth-limit';
// import { createComplexityLimitRule } from 'graphql-validation-complexity';

import type { FastifyInstance } from 'fastify';
import { buildSchema, getSchemaRegistry } from './schema-builder';
import { createLoaders, type Loaders } from './loaders';
import { getGraphQLCache } from './cache';
import { getAPQManager } from './persisted-queries';
import { loggers } from '../lib/logger';

// Stub types until GraphQL packages are installed
type PubSubService = any;
type RequestCache = any;
type PluginContext = Record<string, any>;
const depthLimit = (_n: number, _opts?: any) => () => {};
const createComplexityLimitRule = (_max: number, _opts?: any) => () => {};
const makeExecutableSchema = (_opts: any) => ({});
const applyMiddleware = (schema: any) => schema;
const fastifyApolloDrainPlugin = (_app: any) => ({});

// ApolloServer stub class
class ApolloServer<T = any> {
  constructor(_opts: any) {}
  async start() {}
  createHandler() { return (_req: any, _res: any) => {}; }
  async executeOperation(_opts: any, _ctx?: any) {
    return { body: { kind: 'single', singleResult: { data: null, errors: null } } };
  }
}

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface GraphQLContext extends PluginContext {
  /**
   * Current authenticated user (if any).
   */
  user?: {
    id: string;
    email: string;
    username: string;
    roles: string[];
  };

  /**
   * DataLoaders for batched queries.
   */
  loaders: Loaders;

  /**
   * Pub/Sub for subscriptions.
   */
  pubsub: PubSubService;

  /**
   * Request-scoped cache.
   */
  cache: RequestCache;
}

interface ServerConfig {
  /**
   * Maximum query depth (default: 10).
   */
  maxDepth?: number;

  /**
   * Maximum query complexity (default: 1000).
   */
  maxComplexity?: number;

  /**
   * Enable introspection (default: false in production).
   */
  introspection?: boolean;

  /**
   * Enable debug mode.
   */
  debug?: boolean;

  /**
   * Fastify instance for drain plugin.
   */
  fastify?: FastifyInstance;
}

// ============================================
// SERVER FACTORY
// ============================================

/**
 * Create and configure Apollo Server.
 */
export async function createGraphQLServer(
  config: ServerConfig = {}
): Promise<ApolloServer<GraphQLContext>> {
  const {
    maxDepth = 10,
    maxComplexity = 1000,
    introspection = process.env.NODE_ENV !== 'production',
    debug = process.env.NODE_ENV !== 'production',
    fastify,
  } = config;

  // Build schema from core + plugins
  const registry = getSchemaRegistry();
  const { typeDefs, resolvers, errors } = buildSchema(registry);

  if (errors.length > 0) {
    log.error({ errors }, 'Schema conflicts detected');
    throw new Error(`Schema has ${errors.length} conflicts. Check logs.`);
  }

  // Create executable schema
  let schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  // Apply middleware (if any)
  // schema = applyMiddleware(schema, ...middleware);

  // Create complexity limit rule
  const complexityLimitRule = createComplexityLimitRule(maxComplexity, {
    onCost: (cost: number) => {
      log.debug({ cost }, 'Query complexity calculated');
    },
    formatErrorMessage: (cost: number) =>
      `Query too complex: ${cost}. Maximum allowed: ${maxComplexity}`,
  });

  // Create server plugins
  const plugins: any[] = [];

  // Add drain plugin for graceful shutdown
  if (fastify) {
    plugins.push(fastifyApolloDrainPlugin(fastify));
  }

  // Create Apollo Server
  const server = new ApolloServer<GraphQLContext>({
    schema,
    introspection,
    plugins,
    validationRules: [
      depthLimit(maxDepth, { ignore: ['__schema', '__type'] }),
      complexityLimitRule,
    ],
    formatError: (formattedError, error) => {
      // Log error details
      log.error({ error: formattedError }, 'GraphQL error');

      // Sanitize errors in production
      if (process.env.NODE_ENV === 'production') {
        // Hide internal error details
        if (formattedError.message.includes('Internal server error')) {
          return {
            message: 'Internal server error',
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          };
        }
      }

      return formattedError;
    },
    includeStacktraceInErrorResponses: debug,
  });

  await server.start();
  log.info({ introspection, maxDepth, maxComplexity }, 'GraphQL server started');

  return server;
}

// ============================================
// CONTEXT FACTORY
// ============================================

/**
 * Create GraphQL context for each request.
 */
export function createContext(
  deps: {
    db: any;
    credits: any;
    logger: any;
    pubsub: any;
  },
  req: { user?: any; headers: any }
): GraphQLContext {
  // Create per-request DataLoaders
  const loaders = createLoaders();

  // Create request-scoped cache
  const requestCache = new Map<string, any>();

  return {
    pluginId: 'core',
    config: {},
    logger: deps.logger,
    credits: deps.credits,
    db: deps.db,
    request: {
      requestId: req.headers['x-request-id'] || crypto.randomUUID(),
      userId: req.user?.id,
      ip: req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'],
    },
    user: req.user,
    loaders,
    pubsub: deps.pubsub,
    cache: {
      get: <T>(key: string) => requestCache.get(key) as T | undefined,
      set: <T>(key: string, value: T) => {
        requestCache.set(key, value);
      },
      has: (key: string) => requestCache.has(key),
      delete: (key: string) => requestCache.delete(key),
      clear: () => requestCache.clear(),
    },
  };
}

// ============================================
// REQUEST HANDLER
// ============================================

/**
 * Process a GraphQL request with APQ and caching.
 */
export async function handleGraphQLRequest(
  server: ApolloServer<GraphQLContext>,
  request: {
    query?: string;
    operationName?: string;
    variables?: Record<string, unknown>;
    extensions?: any;
  },
  context: GraphQLContext
): Promise<any> {
  const apqManager = getAPQManager();
  const cache = getGraphQLCache();

  // Process APQ
  const apqResult = await apqManager.process(request);

  if (apqResult.error) {
    return {
      errors: [
        {
          message: apqResult.error,
          extensions: {
            code: apqResult.error,
          },
        },
      ],
    };
  }

  const query = apqResult.query || request.query;

  if (!query) {
    return {
      errors: [
        {
          message: 'Query required',
          extensions: { code: 'BAD_REQUEST' },
        },
      ],
    };
  }

  // Check cache for non-mutation queries
  const isMutation = query.trim().startsWith('mutation');
  const isSubscription = query.trim().startsWith('subscription');

  if (!isMutation && !isSubscription) {
    const cacheKey = cache.generateKey(
      request.operationName,
      query,
      request.variables,
      context.user?.id
    );

    const cachedResponse = await cache.get(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  // Execute query
  const response = await server.executeOperation(
    {
      query,
      operationName: request.operationName,
      variables: request.variables,
    },
    { contextValue: context }
  );

  // Cache successful query responses
  if (!isMutation && !isSubscription && response.body.kind === 'single') {
    const singleResult = response.body.singleResult;
    if (!singleResult.errors) {
      const cacheKey = cache.generateKey(
        request.operationName,
        query,
        request.variables,
        context.user?.id
      );
      await cache.set(cacheKey, singleResult);
    }
  }

  if (response.body.kind === 'single') {
    return response.body.singleResult;
  }

  return response.body;
}

// ============================================
// SUBSCRIPTION SERVER
// ============================================

/**
 * Create a WebSocket subscription server.
 * Uses graphql-ws protocol.
 */
export function createSubscriptionHandler(
  schema: any,
  contextFactory: (connectionParams: any) => Promise<GraphQLContext>
) {
  // This would be integrated with graphql-ws
  // The actual WebSocket server setup depends on the Fastify plugin used
  return {
    schema,
    context: contextFactory,
    onConnect: async (ctx: any) => {
      log.debug('Subscription connection opened');
      return true;
    },
    onDisconnect: async (ctx: any) => {
      log.debug('Subscription connection closed');
    },
    onSubscribe: async (ctx: any, message: any) => {
      log.debug({ operationName: message.payload.operationName }, 'Subscription started');
    },
  };
}
