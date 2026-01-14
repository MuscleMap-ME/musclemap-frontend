/**
 * API Response Helpers
 *
 * Standardized response format for all API endpoints.
 * See: docs/CODING-STYLE-GUIDE.md Section 5.3
 */

import type { FastifyReply } from 'fastify';

/**
 * Pagination metadata for cursor-based (keyset) pagination
 */
export interface PaginationMeta {
  cursor?: string;
  hasMore: boolean;
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  pagination?: PaginationMeta;
  timestamp?: string;
}

/**
 * Standard success response structure
 */
export interface SuccessResponse<T> {
  data: T;
  meta?: ResponseMeta;
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
}

/**
 * Create a standardized success response
 *
 * @example
 * ```typescript
 * return reply.send(successResponse(user));
 * return reply.send(successResponse(workout, { timestamp: new Date().toISOString() }));
 * ```
 */
export function successResponse<T>(data: T, meta?: ResponseMeta): SuccessResponse<T> {
  return {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Create a standardized paginated response
 *
 * @example
 * ```typescript
 * const workouts = await getWorkouts(userId, cursor, limit);
 * const lastItem = workouts[workouts.length - 1];
 * return reply.send(paginatedResponse(
 *   workouts,
 *   lastItem?.id,
 *   workouts.length === limit
 * ));
 * ```
 */
export function paginatedResponse<T>(
  data: T[],
  cursor?: string,
  hasMore: boolean = false
): SuccessResponse<T[]> {
  return {
    data,
    meta: {
      pagination: {
        cursor,
        hasMore,
      },
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create a standardized error response
 *
 * @example
 * ```typescript
 * return reply.status(404).send(errorResponse('NOT_FOUND', 'User not found', 404));
 * return reply.status(400).send(errorResponse('VALIDATION_ERROR', 'Invalid email', 400, validationErrors));
 * ```
 */
export function errorResponse(
  code: string,
  message: string,
  statusCode: number,
  details?: unknown
): ErrorResponse {
  return {
    error: {
      code,
      message,
      statusCode,
      ...(details !== undefined && { details }),
    },
  };
}

/**
 * Send a success response helper
 * Shorthand for `reply.send(successResponse(data))`
 */
export function sendSuccess<T>(reply: FastifyReply, data: T, meta?: ResponseMeta) {
  return reply.send(successResponse(data, meta));
}

/**
 * Send a paginated response helper
 */
export function sendPaginated<T>(
  reply: FastifyReply,
  data: T[],
  cursor?: string,
  hasMore: boolean = false
) {
  return reply.send(paginatedResponse(data, cursor, hasMore));
}

/**
 * Send an error response helper
 */
export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
) {
  return reply.status(statusCode).send(errorResponse(code, message, statusCode, details));
}

// Common error shortcuts
export const errors = {
  notFound: (resource: string) => errorResponse('NOT_FOUND', `${resource} not found`, 404),
  forbidden: (message = 'Access denied') => errorResponse('FORBIDDEN', message, 403),
  unauthorized: (message = 'Authentication required') => errorResponse('UNAUTHORIZED', message, 401),
  badRequest: (message: string, details?: unknown) => errorResponse('BAD_REQUEST', message, 400, details),
  validation: (message: string, details?: unknown) => errorResponse('VALIDATION_ERROR', message, 400, details),
  conflict: (message: string) => errorResponse('CONFLICT', message, 409),
  rateLimited: (retryAfter: number) => errorResponse('RATE_LIMITED', 'Rate limit exceeded', 429, { retryAfter }),
  internal: (message = 'An unexpected error occurred') => errorResponse('INTERNAL_ERROR', message, 500),
} as const;
