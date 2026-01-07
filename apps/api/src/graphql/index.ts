/**
 * GraphQL Module Exports
 *
 * Main entry point for the GraphQL layer.
 */

// Schema
export { typeDefs } from './schema';
export { resolvers } from './resolvers';

// Server setup
export {
  createGraphQLServer,
  createContext,
  registerGraphQLRoutes,
  createSubscriptionHandler,
  getApolloServer,
  type GraphQLContext,
} from './server';

// DataLoaders
export {
  createLoaders,
  loaderRegistry,
  type Loaders,
} from './loaders';

// Caching
export {
  getGraphQLCache,
  cacheManager,
  CacheInvalidation,
} from './cache';

// Persisted Queries
export {
  getAPQManager,
  apqManager,
  type APQRequest,
  type APQResult,
} from './persisted-queries';
