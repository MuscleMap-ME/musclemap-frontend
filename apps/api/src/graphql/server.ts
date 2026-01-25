/**
 * Apollo Server Setup
 *
 * Configures Apollo Server 4 with Fastify integration and all optimizations:
 * - Query depth limiting
 * - Query complexity limiting with X-Query-Complexity header
 * - Response caching
 * - DataLoader integration
 * - Stroustrup/Knuth principles: type safety, zero-overhead abstraction, measurement
 */

import { ApolloServer, type ApolloServerPlugin } from '@apollo/server';
import { fastifyApolloDrainPlugin } from '@as-integrations/fastify';
import { makeExecutableSchema } from '@graphql-tools/schema';
import depthLimit from 'graphql-depth-limit';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { presenceTypeDefs } from './presence.resolvers';
// Activity Log feature (in development - files moved to drafts/)
// import { activityLogTypeDefs } from './activity-log.schema';
// import { activityLogResolvers } from './activity-log.resolvers';
import { createLoaders, createExtendedLoaders, type Loaders, type ExtendedLoaders } from './loaders';
import { createComplexityLimitRule, analyzeComplexity, getComplexityLimit } from './complexity';
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

  /**
   * Query complexity (calculated during execution).
   * Used for X-Query-Complexity header.
   */
  complexity?: number;

  /**
   * Maximum allowed complexity for this request.
   */
  maxComplexity?: number;
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
    typeDefs: [typeDefs, presenceTypeDefs],
    resolvers: [resolvers],
  });

  // Create server plugins
  const plugins: ApolloServerPlugin<GraphQLContext>[] = [];

  // Add drain plugin for graceful shutdown
  if (fastify) {
    plugins.push(fastifyApolloDrainPlugin(fastify));
  }

  // Add complexity tracking plugin (Knuth principle: measure, don't guess)
  plugins.push({
    async requestDidStart() {
      return {
        async didResolveOperation({ request, document, contextValue, schema: resolvedSchema }) {
          // Calculate complexity for this operation
          const result = analyzeComplexity(
            resolvedSchema,
            document,
            request.variables || {},
            request.operationName || undefined
          );

          // Store in context for header response
          contextValue.complexity = result.complexity;
          contextValue.maxComplexity = result.maxAllowed;

          // Log high complexity queries for monitoring
          if (result.complexity > result.maxAllowed * 0.7) {
            log.warn({
              operationName: request.operationName,
              complexity: result.complexity,
              maxAllowed: result.maxAllowed,
              breakdown: result.breakdown,
            }, 'High complexity query');
          }
        },
      };
    },
  });

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
    careerStandards: baseExtendedLoaders.careerStandards,
    // User-scoped loaders - create with userId if available
    conversationUnreadCount: user
      ? baseExtendedLoaders.conversationUnreadCount(user.userId)
      : baseExtendedLoaders.conversationUnreadCount(''),
    exerciseStats: user
      ? baseExtendedLoaders.exerciseStats(user.userId)
      : baseExtendedLoaders.exerciseStats(''),
    careerReadiness: user
      ? baseExtendedLoaders.careerReadiness(user.userId)
      : baseExtendedLoaders.careerReadiness(''),
    collectionSetDetails: user
      ? baseExtendedLoaders.collectionSetDetails(user.userId)
      : baseExtendedLoaders.collectionSetDetails(''),
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

      // Add X-Query-Complexity header (Knuth principle: measure, don't guess)
      if (context.complexity !== undefined) {
        reply.header('X-Query-Complexity', context.complexity.toString());
        reply.header('X-Query-Complexity-Max', (context.maxComplexity || 500).toString());
      }

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

      // Add X-Query-Complexity header
      if (context.complexity !== undefined) {
        reply.header('X-Query-Complexity', context.complexity.toString());
        reply.header('X-Query-Complexity-Max', (context.maxComplexity || 500).toString());
      }

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
