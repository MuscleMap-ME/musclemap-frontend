/**
 * GraphQL Tracing Plugin for Apollo Server
 *
 * Automatically traces all GraphQL operations:
 * - Creates a trace for each request
 * - Records root span for the operation
 * - Optionally traces individual field resolutions
 * - Captures errors and adds them to the trace
 */

import type { ApolloServerPlugin, GraphQLRequestListener, BaseContext } from '@apollo/server';
import type { GraphQLContext } from './server';
import {
  startSpan,
  endSpan,
  setSpanAttributes,
  addSpanEvent,
  insertTrace,
  updateTrace,
  generateTraceId,
  generateSpanId,
  runWithTraceContextAsync,
  type TraceContext,
} from '../lib/tracing';
import { loggers } from '../lib/logger';

const log = loggers.core.child({ module: 'graphql-tracing' });

// Environment flag to control tracing
const TRACING_ENABLED = process.env.DISABLE_GRAPHQL_TRACING !== 'true';

// Flag to control field-level tracing (more verbose but useful for debugging)
const TRACE_FIELDS = process.env.TRACE_GRAPHQL_FIELDS === 'true';

/**
 * Create the tracing plugin for Apollo Server.
 */
export function createTracingPlugin(): ApolloServerPlugin<GraphQLContext> {
  if (!TRACING_ENABLED) {
    log.info('GraphQL tracing disabled via DISABLE_GRAPHQL_TRACING');
    return {
      async requestDidStart() {
        return {};
      },
    };
  }

  return {
    async requestDidStart({ request, contextValue }): Promise<GraphQLRequestListener<GraphQLContext>> {
      // Extract or generate trace context from headers
      const headers = request.http?.headers;
      const traceId = headers?.get('x-trace-id') || generateTraceId();
      const parentSpanId = headers?.get('x-parent-span-id') || headers?.get('x-span-id');
      const sessionId = headers?.get('x-session-id');

      const rootSpanId = generateSpanId();
      const operationName = request.operationName || 'UnnamedOperation';
      const startedAt = Date.now();

      // Create trace context for this request
      const traceContext: TraceContext = {
        traceId,
        spanId: rootSpanId,
        parentSpanId,
        userId: contextValue.user?.userId,
        sessionId: sessionId || undefined,
      };

      // Attach trace context to GraphQL context
      (contextValue as any).traceContext = traceContext;

      // Create trace record in database
      try {
        insertTrace({
          id: traceId,
          userId: contextValue.user?.userId,
          sessionId: sessionId || undefined,
          rootOperation: `graphql:${operationName}`,
          startedAt,
          metadata: {
            userAgent: headers?.get('user-agent') || undefined,
            referer: headers?.get('referer') || undefined,
          },
        });
      } catch (e) {
        log.error({ error: e }, 'Failed to create trace record');
      }

      // Start the root span for this GraphQL operation
      const graphqlSpanId = startSpan(
        `graphql:${operationName}`,
        'graphql',
        'api',
        {
          operationName,
          variables: sanitizeVariables(request.variables),
        }
      );

      let operationType: string | undefined;
      let hasErrors = false;

      return {
        async didResolveOperation({ operation }) {
          // Record the operation type (query/mutation/subscription)
          if (operation) {
            operationType = operation.operation;
            setSpanAttributes(graphqlSpanId, {
              operationType: operation.operation,
            });

            addSpanEvent(graphqlSpanId, 'operation_resolved', {
              operationType: operation.operation,
              selectionCount: operation.selectionSet.selections.length,
            });
          }
        },

        async executionDidStart() {
          // Return execution hooks
          return {
            willResolveField({ info }) {
              // Only trace fields if explicitly enabled (performance impact)
              if (!TRACE_FIELDS) return;

              // Skip scalar fields (only trace complex types and lists)
              const returnTypeName = info.returnType.toString().replace(/[!\[\]]/g, '');
              const isScalar = ['String', 'Int', 'Float', 'Boolean', 'ID', 'Date', 'DateTime', 'JSON'].includes(returnTypeName);
              if (isScalar) return;

              const fieldSpanId = startSpan(
                `field:${info.parentType.name}.${info.fieldName}`,
                'graphql',
                'api',
                {
                  fieldName: info.fieldName,
                  parentType: info.parentType.name,
                  returnType: info.returnType.toString(),
                }
              );

              return (error) => {
                endSpan(fieldSpanId, error || undefined);
              };
            },
          };
        },

        async didEncounterErrors({ errors }) {
          hasErrors = true;

          // Add error events to the span
          for (const error of errors) {
            addSpanEvent(graphqlSpanId, 'graphql_error', {
              message: error.message,
              path: error.path?.join('.'),
              code: (error.extensions as any)?.code,
            });
          }

          // Update trace with error info
          try {
            const stacktrace = errors[0]?.extensions?.stacktrace;
            updateTrace(traceId, {
              status: 'error',
              errorMessage: errors.map(e => e.message).join('; '),
              errorStack: Array.isArray(stacktrace) ? stacktrace.join('\n') : undefined,
            });
          } catch (e) {
            log.error({ error: e }, 'Failed to update trace with errors');
          }
        },

        async willSendResponse({ response }) {
          const endedAt = Date.now();
          const durationMs = endedAt - startedAt;

          // End the root span
          endSpan(graphqlSpanId, hasErrors ? new Error('GraphQL errors occurred') : undefined);

          // Update trace with completion info
          try {
            updateTrace(traceId, {
              endedAt,
              durationMs,
              status: hasErrors ? 'error' : 'completed',
            });
          } catch (e) {
            log.error({ error: e }, 'Failed to complete trace');
          }

          // Log slow queries for monitoring
          if (durationMs > 1000) {
            log.warn({
              traceId,
              operationName,
              operationType,
              durationMs,
              userId: contextValue.user?.userId,
            }, 'Slow GraphQL operation');
          }
        },
      };
    },
  };
}

/**
 * Sanitize GraphQL variables for storage.
 * Removes sensitive data and truncates large values.
 */
function sanitizeVariables(variables?: Record<string, unknown> | null): Record<string, unknown> | undefined {
  if (!variables) return undefined;

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(variables)) {
    // Skip sensitive keys
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('key') ||
        lowerKey.includes('credential')) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Truncate large strings
    if (typeof value === 'string' && value.length > 200) {
      sanitized[key] = value.substring(0, 200) + '... [truncated]';
      continue;
    }

    // Truncate large arrays
    if (Array.isArray(value) && value.length > 10) {
      sanitized[key] = `[Array of ${value.length} items]`;
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Get trace context from GraphQL context.
 * Useful in resolvers for creating child spans.
 */
export function getTraceContextFromGraphQL(context: GraphQLContext): TraceContext | undefined {
  return (context as any).traceContext;
}

/**
 * Helper to run a function with trace context from GraphQL.
 * Use this in resolvers to propagate trace context to database calls.
 */
export async function withGraphQLTrace<T>(
  context: GraphQLContext,
  fn: () => Promise<T>
): Promise<T> {
  const traceContext = getTraceContextFromGraphQL(context);
  if (!traceContext) {
    return fn();
  }
  return runWithTraceContextAsync(traceContext, fn);
}
