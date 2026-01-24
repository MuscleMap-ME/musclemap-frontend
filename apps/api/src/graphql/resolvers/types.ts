/**
 * Shared Types for GraphQL Resolvers
 *
 * All resolver modules should import types from here.
 */

import type { Loaders } from '../loaders';

/**
 * GraphQL Context
 * Available in all resolvers
 */
export interface Context {
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
   * CRITICAL: Use these instead of direct queries to avoid N+1 problems.
   */
  loaders: Loaders;

  /**
   * Request-scoped cache.
   * Use for caching expensive computations within a single request.
   */
  cache: {
    get: <T>(key: string) => T | undefined;
    set: <T>(key: string, value: T) => void;
    has: (key: string) => boolean;
    delete: (key: string) => boolean;
    clear: () => void;
  };
}

/**
 * Pagination arguments (keyset-based)
 */
export interface PaginationArgs {
  /** Cursor for pagination (base64 encoded) */
  cursor?: string;
  /** Number of items to return (default: 50, max: 100) */
  limit?: number;
  /** Sort direction */
  direction?: 'ASC' | 'DESC';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
    totalCount?: number;
  };
}

/**
 * Common filter arguments
 */
export interface DateRangeFilter {
  startDate?: Date | string;
  endDate?: Date | string;
}

/**
 * Auth helper result
 */
export interface AuthResult {
  userId: string;
  email: string;
  roles: string[];
  isAdmin: boolean;
}

/**
 * Resolver function type
 */
export type ResolverFn<TResult, TParent = unknown, TArgs = unknown> = (
  parent: TParent,
  args: TArgs,
  context: Context,
  info: unknown
) => Promise<TResult> | TResult;

/**
 * Resolver map type
 */
export type ResolverMap = {
  [key: string]: ResolverFn<unknown> | { [key: string]: ResolverFn<unknown> };
};
