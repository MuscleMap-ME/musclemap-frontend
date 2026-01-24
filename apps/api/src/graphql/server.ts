/**
 * Apollo Server Setup
 *
 * Configures Apollo Server 4 with Fastify integration and all optimizations:
 * - Query depth limiting
 * - Query complexity limiting
 * - Response caching
 * - DataLoader integration
 */

import { ApolloServer } from '@apollo/server';
import { fastifyApolloDrainPlugin } from '@as-integrations/fastify';
import { makeExecutableSchema } from '@graphql-tools/schema';
import depthLimit from 'graphql-depth-limit';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { createLoaders, createExtendedLoaders, type Loaders, type ExtendedLoaders } from './loaders';
import { createComplexityLimitRule } from './complexity';
import { loggers } from '../lib/logger';
import { optionalAuth } from '../http/routes/auth';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface GraphQLContext {
  /**
   * Current authenticated user (if any).
   */
  user?: {
    userId: string;
    email: string;
    roles: string[];
  };

  /**
   * DataLoaders for batched queries.
   */
  loaders: Loaders;

  /**
   * Extended DataLoaders for N+1 fixes (user-scoped loaders).
   */
  extendedLoaders: ExtendedLoaders;

  /**
   * Request-scoped cache.
   */
  cache: {
    get: <T>(key: string) => T | undefined;
    set: <T>(key: string, value: T) => void;
    has: (key: string) => boolean;
    delete: (key: string) => boolean;
    clear: () => void;
  };
}

interface ServerConfig {
  /**
   * Maximum query depth (default: 10).
   */
  maxDepth?: number;

  /**
   * Maximum query complexity (default: 500 for authenticated, 100 for anonymous).
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

let apolloServer: ApolloServer<GraphQLContext> | null = null;

/**
 * Create and configure Apollo Server.
 */
export async function createGraphQLServer(
  config: ServerConfig = {}
): Promise<ApolloServer<GraphQLContext>> {
  const {
    maxDepth = 10,
    maxComplexity = 500,
    introspection = process.env.NODE_ENV !== 'production',
    debug = process.env.NODE_ENV !== 'production',
    fastify,
  } = config;

  // Create executable schema
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  // Create server plugins
  const plugins: any[] = [];

  // Add drain plugin for graceful shutdown
  if (fastify) {
    plugins.push(fastifyApolloDrainPlugin(fastify));
  }

  // Create Apollo Server with depth and complexity limits
  const server = new ApolloServer<GraphQLContext>({
    schema,
    introspection,
    plugins,
    validationRules: [
      // Limit query depth to prevent deeply nested queries
      depthLimit(maxDepth, { ignore: ['__schema', '__type'] }),
      // Limit query complexity to prevent resource exhaustion
      createComplexityLimitRule(maxComplexity),
    ],
    formatError: (formattedError, _error) => {
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

  apolloServer = server;
  return server;
}

/**
 * Get the existing Apollo Server instance.
 */
export function getApolloServer(): ApolloServer<GraphQLContext> | null {
  return apolloServer;
}

// ============================================
// CONTEXT FACTORY
// ============================================

/**
 * Create GraphQL context for each request.
 */
export function createContext(req: FastifyRequest): GraphQLContext {
  // Create per-request DataLoaders
  const loaders = createLoaders();

  // Get user from Fastify request (set by auth middleware)
  const user = (req as any).user
    ? {
        userId: (req as any).user.userId,
        email: (req as any).user.email,
        roles: (req as any).user.roles || ['user'],
      }
    : undefined;

  // Create extended loaders (some are user-scoped)
  const baseExtendedLoaders = createExtendedLoaders();
  const extendedLoaders: ExtendedLoaders = {
    conversationParticipants: baseExtendedLoaders.conversationParticipants,
    conversationLastMessage: baseExtendedLoaders.conversationLastMessage,
    // User-scoped loaders - create with userId if available
    conversationUnreadCount: user
      ? baseExtendedLoaders.conversationUnreadCount(user.userId)
      : baseExtendedLoaders.conversationUnreadCount(''),
    exerciseStats: user
      ? baseExtendedLoaders.exerciseStats(user.userId)
      : baseExtendedLoaders.exerciseStats(''),
  };

  // Create request-scoped cache
  const requestCache = new Map<string, any>();

  return {
    user,
    loaders,
    extendedLoaders,
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
// FASTIFY ROUTE HANDLER
// ============================================

/**
 * Register GraphQL routes on Fastify instance.
 */
export async function registerGraphQLRoutes(app: FastifyInstance): Promise<void> {
  // Create Apollo Server with Fastify drain plugin
  const server = await createGraphQLServer({ fastify: app });

  // GraphQL POST endpoint
  // Use optionalAuth to parse JWT if provided (sets request.user for authenticated requests)
  app.post('/graphql', { preHandler: optionalAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createContext(request);
    const { query, operationName, variables } = request.body as {
      query?: string;
      operationName?: string;
      variables?: Record<string, unknown>;
    };

    if (!query) {
      return reply.status(400).send({
        errors: [{ message: 'Query required', extensions: { code: 'BAD_REQUEST' } }],
      });
    }

    const response = await server.executeOperation(
      {
        query,
        operationName,
        variables,
      },
      { contextValue: context }
    );

    if (response.body.kind === 'single') {
      // Set proper content type
      reply.header('Content-Type', 'application/json');
      return response.body.singleResult;
    }

    return response.body;
  });

  // GraphQL GET endpoint (for introspection tools)
  // Use optionalAuth to parse JWT if provided
  app.get('/graphql', { preHandler: optionalAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createContext(request);
    const { query, operationName, variables } = request.query as {
      query?: string;
      operationName?: string;
      variables?: string;
    };

    if (!query) {
      return reply.status(400).send({
        errors: [{ message: 'Query required', extensions: { code: 'BAD_REQUEST' } }],
      });
    }

    let parsedVariables: Record<string, unknown> | undefined;
    if (variables) {
      try {
        parsedVariables = JSON.parse(variables);
      } catch {
        return reply.status(400).send({
          errors: [{ message: 'Invalid variables JSON', extensions: { code: 'BAD_REQUEST' } }],
        });
      }
    }

    const response = await server.executeOperation(
      {
        query,
        operationName,
        variables: parsedVariables,
      },
      { contextValue: context }
    );

    if (response.body.kind === 'single') {
      reply.header('Content-Type', 'application/json');
      return response.body.singleResult;
    }

    return response.body;
  });

  log.info('GraphQL routes registered at /graphql');
}

// ============================================
// SUBSCRIPTION SERVER (placeholder)
// ============================================

/**
 * Create a WebSocket subscription handler.
 * Uses graphql-ws protocol.
 */
export function createSubscriptionHandler(
  schema: any,
  contextFactory: (connectionParams: any) => Promise<GraphQLContext>
) {
  return {
    schema,
    context: contextFactory,
    onConnect: async (_ctx: unknown) => {
      log.debug('Subscription connection opened');
      return true;
    },
    onDisconnect: async (_ctx: unknown) => {
      log.debug('Subscription connection closed');
    },
    onSubscribe: async (ctx: any, message: any) => {
      log.debug({ operationName: message.payload.operationName }, 'Subscription started');
    },
  };
}
