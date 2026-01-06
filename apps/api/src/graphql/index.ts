/**
 * GraphQL Module Exports
 *
 * Main entry point for the GraphQL layer.
 */

// Schema building
export {
  SchemaRegistry,
  getSchemaRegistry,
  resetSchemaRegistry,
  buildSchema,
  CORE_TYPE_DEFS,
  CORE_RESOLVERS,
} from './schema-builder';

// Server setup
export {
  createGraphQLServer,
  createContext,
  handleGraphQLRequest,
  createSubscriptionHandler,
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
