/**
 * Resolver Utilities
 *
 * Common patterns and helpers for GraphQL resolvers.
 * These utilities reduce code duplication and ensure consistent
 * error handling, authentication, and pagination.
 */

import { GraphQLError } from 'graphql';
import { queryOne, queryAll } from '../../db/client';
import type { Loaders } from '../loaders';

// Re-export types from the types module
export type { Context, PaginationArgs, AuthResult, ResolverFn, ResolverMap } from './types';

// Import Context for use in this file
import type { Context, PaginationArgs } from './types';

export interface KeysetCursor {
  createdAt: string;
  id: string;
}

// ============================================
// AUTHENTICATION HELPERS
// ============================================

/**
 * Require authentication - throws if not authenticated
 */
export function requireAuth(context: Context): { userId: string; email: string; roles: string[] } {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user;
}

/**
 * Get optional user info - returns null if not authenticated
 */
export function optionalAuth(context: Context): { userId: string; email: string; roles: string[] } | null {
  return context.user || null;
}

/**
 * Require specific role(s)
 */
export function requireRole(context: Context, ...roles: string[]): { userId: string; email: string; roles: string[] } {
  const user = requireAuth(context);
  const hasRole = roles.some(role => user.roles.includes(role));
  if (!hasRole) {
    throw new GraphQLError(`Requires one of roles: ${roles.join(', ')}`, {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  return user;
}

/**
 * Require admin role
 */
export function requireAdmin(context: Context): { userId: string; email: string; roles: string[] } {
  return requireRole(context, 'admin');
}

// ============================================
// PAGINATION HELPERS
// ============================================

/**
 * Validate and normalize limit
 */
export function normalizeLimit(limit?: number, defaultLimit = 50, maxLimit = 100): number {
  if (!limit || limit < 1) return defaultLimit;
  return Math.min(limit, maxLimit);
}

/**
 * Parse keyset cursor (format: "timestamp:id")
 */
export function parseKeysetCursor(cursor?: string): KeysetCursor | null {
  if (!cursor) return null;
  const [createdAt, id] = cursor.split(':');
  if (!createdAt || !id) return null;
  return { createdAt, id };
}

/**
 * Generate keyset cursor from item
 */
export function generateKeysetCursor(item: { created_at: Date | string; id: string }): string {
  const createdAt = item.created_at instanceof Date
    ? item.created_at.toISOString()
    : item.created_at;
  return `${createdAt}:${item.id}`;
}

/**
 * Build keyset WHERE clause for pagination
 * Uses (created_at, id) for deterministic ordering
 */
export function buildKeysetWhere(cursor: KeysetCursor | null, paramOffset = 0): {
  clause: string;
  params: unknown[];
} {
  if (!cursor) {
    return { clause: '', params: [] };
  }

  return {
    clause: `AND (created_at, id) < ($${paramOffset + 1}::timestamptz, $${paramOffset + 2})`,
    params: [cursor.createdAt, cursor.id],
  };
}

// ============================================
// QUERY HELPERS
// ============================================

/**
 * Execute authenticated single-row query
 */
export async function queryOneAuth<T>(
  context: Context,
  sql: string,
  extraParams: unknown[] = [],
  transform?: (row: T) => unknown
): Promise<unknown> {
  const { userId } = requireAuth(context);
  const row = await queryOne<T>(sql, [userId, ...extraParams]);
  if (!row) return null;
  return transform ? transform(row) : row;
}

/**
 * Execute authenticated list query with pagination
 */
export async function queryListAuth<T>(
  context: Context,
  sql: string,
  args: PaginationArgs = {},
  extraParams: unknown[] = [],
  transform?: (row: T) => unknown
): Promise<unknown[]> {
  const { userId } = requireAuth(context);
  const limit = normalizeLimit(args.limit);
  const cursor = parseKeysetCursor(args.cursor);
  const keyset = buildKeysetWhere(cursor, extraParams.length + 1);

  // Replace {KEYSET} placeholder in SQL
  const finalSql = sql.replace('{KEYSET}', keyset.clause);
  const params = [userId, ...extraParams, ...keyset.params, limit];

  const rows = await queryAll<T>(finalSql, params);
  return transform ? rows.map(transform) : rows;
}

/**
 * Execute public list query (no auth required)
 */
export async function queryListPublic<T>(
  sql: string,
  args: PaginationArgs = {},
  extraParams: unknown[] = [],
  transform?: (row: T) => unknown
): Promise<unknown[]> {
  const limit = normalizeLimit(args.limit);
  const rows = await queryAll<T>(sql, [...extraParams, limit]);
  return transform ? rows.map(transform) : rows;
}

// ============================================
// DATALOADER HELPERS
// ============================================

/**
 * Load single entity via DataLoader
 */
export async function loadOne<T>(
  context: Context,
  loaderName: keyof Loaders,
  id: string
): Promise<T | null> {
  const loader = context.loaders[loaderName];
  if (!loader) {
    throw new Error(`DataLoader '${loaderName}' not found`);
  }
  return loader.load(id) as Promise<T | null>;
}

/**
 * Load multiple entities via DataLoader
 */
export async function loadMany<T>(
  context: Context,
  loaderName: keyof Loaders,
  ids: string[]
): Promise<(T | null)[]> {
  const loader = context.loaders[loaderName];
  if (!loader) {
    throw new Error(`DataLoader '${loaderName}' not found`);
  }
  return loader.loadMany(ids) as Promise<(T | null)[]>;
}

// ============================================
// ERROR HELPERS
// ============================================

/**
 * Throw a not found error
 */
export function notFound(entity: string, id?: string): never {
  throw new GraphQLError(
    id ? `${entity} with id '${id}' not found` : `${entity} not found`,
    { extensions: { code: 'NOT_FOUND' } }
  );
}

/**
 * Throw a forbidden error
 */
export function forbidden(message = 'Access denied'): never {
  throw new GraphQLError(message, {
    extensions: { code: 'FORBIDDEN' },
  });
}

/**
 * Throw a bad input error
 */
export function badInput(message: string): never {
  throw new GraphQLError(message, {
    extensions: { code: 'BAD_USER_INPUT' },
  });
}

/**
 * Throw a conflict error (duplicate resource)
 */
export function conflict(message: string): never {
  throw new GraphQLError(message, {
    extensions: { code: 'CONFLICT' },
  });
}

// ============================================
// TRANSFORMATION HELPERS
// ============================================

/**
 * Convert snake_case database row to camelCase
 */
export function toCamelCase<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

/**
 * Standard row transformer for common patterns
 */
export function transformRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...toCamelCase(row),
    // Handle common date fields
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate UUID format
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Require valid UUID
 */
export function requireValidId(id: string, fieldName = 'id'): string {
  if (!isValidUUID(id)) {
    badInput(`Invalid ${fieldName} format`);
  }
  return id;
}
