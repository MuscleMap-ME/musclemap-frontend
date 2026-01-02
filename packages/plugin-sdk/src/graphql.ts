/**
 * @musclemap/plugin-sdk - GraphQL Plugin API
 *
 * Extends the plugin system with GraphQL capabilities:
 * - Schema extensions via SDL
 * - Custom resolvers
 * - Subscriptions
 * - DataLoader integration
 */

import type { PluginContext, PluginLogger } from './backend';

// ============================================
// GRAPHQL TYPES (inline to avoid heavy deps)
// ============================================

/**
 * GraphQL type definitions as SDL string.
 */
export type TypeDefs = string;

/**
 * Resolver function signature.
 */
export type ResolverFn<TParent = unknown, TArgs = Record<string, unknown>, TResult = unknown> = (
  parent: TParent,
  args: TArgs,
  context: GraphQLPluginContext,
  info: unknown
) => TResult | Promise<TResult>;

/**
 * Resolver map for a single type.
 */
export interface TypeResolvers {
  [fieldName: string]: ResolverFn;
}

/**
 * Complete resolver map.
 */
export interface Resolvers {
  Query?: TypeResolvers;
  Mutation?: TypeResolvers;
  Subscription?: SubscriptionResolvers;
  [typeName: string]: TypeResolvers | SubscriptionResolvers | undefined;
}

/**
 * Subscription resolver with subscribe and resolve functions.
 */
export interface SubscriptionResolver {
  subscribe: ResolverFn;
  resolve?: ResolverFn;
}

export interface SubscriptionResolvers {
  [fieldName: string]: SubscriptionResolver;
}

// ============================================
// GRAPHQL PLUGIN CONTEXT
// ============================================

/**
 * Extended context available in GraphQL resolvers.
 */
export interface GraphQLPluginContext extends PluginContext {
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
   * DataLoader for batching queries.
   */
  loaders: DataLoaderRegistry;

  /**
   * Pub/Sub for subscriptions.
   */
  pubsub: PubSubService;

  /**
   * Request-scoped cache.
   */
  cache: RequestCache;
}

/**
 * DataLoader registry for batched loading.
 */
export interface DataLoaderRegistry {
  /**
   * Get or create a DataLoader for a given key.
   */
  get<K, V>(
    name: string,
    batchFn: (keys: readonly K[]) => Promise<(V | Error)[]>
  ): DataLoader<K, V>;
}

/**
 * Simple DataLoader interface.
 */
export interface DataLoader<K, V> {
  load(key: K): Promise<V>;
  loadMany(keys: K[]): Promise<(V | Error)[]>;
  clear(key: K): void;
  clearAll(): void;
  prime(key: K, value: V): void;
}

/**
 * Pub/Sub service for subscriptions.
 */
export interface PubSubService {
  /**
   * Publish an event to a topic.
   */
  publish(topic: string, payload: unknown): Promise<void>;

  /**
   * Subscribe to a topic. Returns an async iterator.
   */
  subscribe(topic: string): AsyncIterator<unknown>;

  /**
   * Subscribe with filtering.
   */
  asyncIterator<T>(
    triggers: string | string[],
    options?: { filter?: (payload: T) => boolean | Promise<boolean> }
  ): AsyncIterator<T>;
}

/**
 * Request-scoped cache.
 */
export interface RequestCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
}

// ============================================
// GRAPHQL PLUGIN REGISTRATION
// ============================================

/**
 * GraphQL schema extension from a plugin.
 */
export interface GraphQLSchemaExtension {
  /**
   * Unique name for this extension.
   */
  name: string;

  /**
   * SDL type definitions to merge into the schema.
   * Can extend existing types or add new ones.
   *
   * @example
   * ```graphql
   * extend type Query {
   *   leaderboard(limit: Int): [LeaderboardEntry!]!
   * }
   *
   * type LeaderboardEntry {
   *   rank: Int!
   *   user: User!
   *   score: Float!
   * }
   * ```
   */
  typeDefs: TypeDefs;

  /**
   * Resolvers for the extended types.
   */
  resolvers: Resolvers;

  /**
   * Directives provided by this extension.
   */
  directives?: GraphQLDirective[];
}

/**
 * Custom GraphQL directive.
 */
export interface GraphQLDirective {
  name: string;
  description?: string;
  locations: DirectiveLocation[];
  args?: Record<string, { type: string; defaultValue?: unknown }>;
  transformer: (schema: unknown) => unknown;
}

export type DirectiveLocation =
  | 'QUERY'
  | 'MUTATION'
  | 'SUBSCRIPTION'
  | 'FIELD'
  | 'FIELD_DEFINITION'
  | 'OBJECT'
  | 'INTERFACE'
  | 'UNION'
  | 'ENUM'
  | 'INPUT_OBJECT';

/**
 * GraphQL plugin registration.
 */
export interface GraphQLPluginRegistration {
  /**
   * Schema extensions to merge.
   */
  schema?: GraphQLSchemaExtension;

  /**
   * Subscription topics this plugin provides.
   */
  subscriptionTopics?: string[];

  /**
   * Middleware to run before resolvers.
   */
  middleware?: GraphQLMiddleware[];

  /**
   * Field-level authorization rules.
   */
  fieldAuthorization?: FieldAuthorizationRule[];
}

/**
 * GraphQL middleware function.
 */
export type GraphQLMiddleware = (
  resolve: ResolverFn,
  parent: unknown,
  args: Record<string, unknown>,
  context: GraphQLPluginContext,
  info: unknown
) => Promise<unknown>;

/**
 * Field-level authorization rule.
 */
export interface FieldAuthorizationRule {
  /**
   * Type.Field pattern (e.g., "User.email", "Query.*")
   */
  pattern: string;

  /**
   * Required permission or custom check.
   */
  check: string | ((context: GraphQLPluginContext, args: unknown) => boolean | Promise<boolean>);
}

// ============================================
// GRAPHQL PLUGIN ENTRY
// ============================================

/**
 * Full plugin entry with GraphQL support.
 */
export interface GraphQLPluginEntry {
  /**
   * REST routes (legacy).
   */
  rest?: {
    registerRoutes(router: unknown): void;
  };

  /**
   * GraphQL extensions.
   */
  graphql?: GraphQLPluginRegistration;

  /**
   * Lifecycle hooks.
   */
  hooks?: {
    onServerStart?(ctx: PluginContext): Promise<void>;
    onShutdown?(ctx: PluginContext): Promise<void>;
  };
}

export type GraphQLPluginFactory = (ctx: PluginContext) => GraphQLPluginEntry | Promise<GraphQLPluginEntry>;

/**
 * Define a GraphQL-enabled plugin.
 */
export function defineGraphQLPlugin(factory: GraphQLPluginFactory): GraphQLPluginFactory {
  return factory;
}

// ============================================
// SUBSCRIPTION HELPERS
// ============================================

/**
 * Standard subscription topics in MuscleMap.
 */
export const SubscriptionTopics = {
  WORKOUT_COMPLETED: 'WORKOUT_COMPLETED',
  COMPETITION_UPDATE: 'COMPETITION_UPDATE',
  COMMUNITY_ACTIVITY: 'COMMUNITY_ACTIVITY',
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
  PRESENCE_CHANGED: 'PRESENCE_CHANGED',
  CREDITS_CHANGED: 'CREDITS_CHANGED',
} as const;

export type SubscriptionTopic = (typeof SubscriptionTopics)[keyof typeof SubscriptionTopics];

/**
 * Create a filtered subscription resolver.
 */
export function withFilter<T>(
  asyncIteratorFn: (
    rootValue: unknown,
    args: Record<string, unknown>,
    context: GraphQLPluginContext
  ) => AsyncIterator<T>,
  filterFn: (
    payload: T,
    args: Record<string, unknown>,
    context: GraphQLPluginContext
  ) => boolean | Promise<boolean>
): SubscriptionResolver {
  return {
    subscribe: async (parent, args, context, info) => {
      const asyncIterator = asyncIteratorFn(parent, args, context);

      return {
        async next() {
          while (true) {
            const { value, done } = await asyncIterator.next();
            if (done) return { value: undefined, done: true };

            const shouldInclude = await filterFn(value, args, context);
            if (shouldInclude) {
              return { value, done: false };
            }
          }
        },
        return() {
          if (typeof asyncIterator.return === 'function') {
            return asyncIterator.return();
          }
          return Promise.resolve({ value: undefined, done: true });
        },
        throw(error: Error) {
          if (typeof asyncIterator.throw === 'function') {
            return asyncIterator.throw(error);
          }
          return Promise.reject(error);
        },
        [Symbol.asyncIterator]() {
          return this;
        },
      };
    },
    resolve: (payload) => payload,
  };
}

// ============================================
// RESOLVER HELPERS
// ============================================

/**
 * Wrap a resolver with authentication check.
 */
export function authenticated<T extends ResolverFn>(resolver: T): T {
  return ((parent, args, context, info) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }
    return resolver(parent, args, context, info);
  }) as T;
}

/**
 * Wrap a resolver with permission check.
 */
export function authorized<T extends ResolverFn>(permission: string, resolver: T): T {
  return ((parent, args, context, info) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }
    if (!context.user.roles.includes('admin') && !hasPermission(context.user.roles, permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
    return resolver(parent, args, context, info);
  }) as T;
}

function hasPermission(roles: string[], permission: string): boolean {
  // Simple role-based check - actual implementation in core
  return roles.includes(permission) || roles.includes('admin');
}

/**
 * Wrap a resolver with credit charge.
 */
export function withCreditCharge<T extends ResolverFn>(
  action: string,
  cost: number,
  resolver: T
): T {
  return (async (parent, args, context, info) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }

    const idempotencyKey = `${context.request?.requestId || Date.now()}-${action}`;
    const result = await context.credits.charge({
      userId: context.user.id,
      action,
      cost,
      idempotencyKey,
    });

    if (!result.success) {
      throw new Error(result.error || 'Insufficient credits');
    }

    return resolver(parent, args, context, info);
  }) as T;
}
