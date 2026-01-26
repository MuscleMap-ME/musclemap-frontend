/**
 * Response Formatter
 *
 * Optimizes GraphQL responses for bandwidth reduction by:
 * - Removing null values from objects
 * - Removing empty arrays where appropriate
 * - Removing undefined properties
 *
 * Phase 8 of MASTER-IMPLEMENTATION-PLAN
 *
 * Expected bandwidth savings: 10-30% for typical responses
 * with many optional fields.
 */

import { loggers } from './logger';

const log = loggers.api;

export interface FilterOptions {
  /** Remove null values (default: true) */
  removeNulls?: boolean;
  /** Remove empty arrays (default: false - arrays might be meaningful as empty) */
  removeEmptyArrays?: boolean;
  /** Remove empty objects (default: false) */
  removeEmptyObjects?: boolean;
  /** Fields to always preserve even if null/empty */
  preserveFields?: string[];
  /** Maximum depth to process (default: 50 - prevent stack overflow) */
  maxDepth?: number;
}

const DEFAULT_OPTIONS: FilterOptions = {
  removeNulls: true,
  removeEmptyArrays: false,
  removeEmptyObjects: false,
  preserveFields: [],
  maxDepth: 50,
};

/**
 * Recursively filters null/undefined values from an object or array.
 *
 * GraphQL responses often contain many null fields for optional data.
 * Removing these reduces response size without losing information
 * (clients can check for field presence vs null check).
 *
 * @param data - The data to filter
 * @param options - Filtering options
 * @returns Filtered data
 */
export function filterNullValues<T>(data: T, options: FilterOptions = {}): T {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const preserveSet = new Set(opts.preserveFields);

  function filter(value: unknown, depth: number): unknown {
    // Prevent stack overflow on deeply nested objects
    if (depth > (opts.maxDepth || 50)) {
      log.warn({ depth }, 'Response filter hit max depth - returning unfiltered');
      return value;
    }

    // Handle null/undefined
    if (value === null || value === undefined) {
      return opts.removeNulls ? undefined : value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      const filtered = value
        .map((item) => filter(item, depth + 1))
        .filter((item) => item !== undefined);

      if (opts.removeEmptyArrays && filtered.length === 0) {
        return undefined;
      }

      return filtered;
    }

    // Handle Date objects (keep as-is)
    if (value instanceof Date) {
      return value;
    }

    // Handle plain objects
    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};
      let hasKeys = false;

      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        // Always preserve certain fields
        if (preserveSet.has(key)) {
          result[key] = val;
          hasKeys = true;
          continue;
        }

        // Recursively filter
        const filtered = filter(val, depth + 1);

        // Only include non-undefined values
        if (filtered !== undefined) {
          result[key] = filtered;
          hasKeys = true;
        }
      }

      if (opts.removeEmptyObjects && !hasKeys) {
        return undefined;
      }

      return result;
    }

    // Primitives pass through
    return value;
  }

  return filter(data, 0) as T;
}

/**
 * Filters a GraphQL response, preserving the response structure.
 *
 * GraphQL responses have a specific structure:
 * { data: {...}, errors: [...], extensions: {...} }
 *
 * This function only filters the `data` portion, preserving
 * errors and extensions as-is.
 *
 * @param response - GraphQL response object
 * @param options - Filtering options
 * @returns Filtered response
 */
export function filterGraphQLResponse<T extends { data?: unknown; errors?: unknown[]; extensions?: unknown }>(
  response: T,
  options: FilterOptions = {}
): T {
  // Don't filter if there are errors (might lose context)
  if (response.errors && response.errors.length > 0) {
    return response;
  }

  // Only filter the data portion
  if (response.data !== undefined) {
    const filteredData = filterNullValues(response.data, options);

    return {
      ...response,
      data: filteredData,
    };
  }

  return response;
}

/**
 * Calculate the size reduction from filtering.
 * Useful for metrics and monitoring.
 *
 * @param original - Original data
 * @param filtered - Filtered data
 * @returns Size reduction info
 */
export function calculateSizeReduction(
  original: unknown,
  filtered: unknown
): { originalSize: number; filteredSize: number; reduction: number; reductionPercent: string } {
  const originalStr = JSON.stringify(original);
  const filteredStr = JSON.stringify(filtered);

  const originalSize = originalStr?.length || 0;
  const filteredSize = filteredStr?.length || 0;
  const reduction = originalSize - filteredSize;
  const reductionPercent = originalSize > 0
    ? ((reduction / originalSize) * 100).toFixed(1)
    : '0.0';

  return {
    originalSize,
    filteredSize,
    reduction,
    reductionPercent: `${reductionPercent}%`,
  };
}

/**
 * Middleware-style response formatter for Apollo Server.
 *
 * Use in willSendResponse hook:
 * ```
 * willSendResponse({ response }) {
 *   formatResponse(response);
 * }
 * ```
 */
export function formatResponse(response: {
  body: { kind: string; singleResult?: { data?: unknown; errors?: unknown[] } };
}): void {
  if (response.body.kind === 'single' && response.body.singleResult) {
    const result = response.body.singleResult;

    // Only filter if no errors
    if (!result.errors || result.errors.length === 0) {
      if (result.data !== undefined) {
        result.data = filterNullValues(result.data);
      }
    }
  }
}

export default {
  filterNullValues,
  filterGraphQLResponse,
  calculateSizeReduction,
  formatResponse,
};
