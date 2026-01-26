/**
 * Trace Context Provider
 *
 * Provides distributed tracing context to the React component tree.
 * Automatically traces page navigations and provides hooks for
 * tracing user interactions.
 */

import React, { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  createRootTrace,
  getCurrentTrace,
  traceNavigation,
  traceInteraction,
  startSpan,
  endSpan,
  addSpanAttributes,
  flushSpans,
  type TraceContext as TraceContextType,
} from '../lib/tracing';

// ============================================
// TYPES
// ============================================

interface TraceContextValue {
  /**
   * Get the current trace context.
   */
  getTrace: () => TraceContextType | null;

  /**
   * Create a new root trace (for starting a new user journey).
   */
  createTrace: () => TraceContextType;

  /**
   * Start a span for tracking an operation.
   * Returns the span ID for later ending.
   */
  startSpan: (
    operationName: string,
    operationType: 'graphql' | 'navigation' | 'interaction' | 'api',
    attributes?: Record<string, unknown>
  ) => string;

  /**
   * End a span.
   */
  endSpan: (spanId: string, error?: Error) => void;

  /**
   * Add attributes to a span.
   */
  addSpanAttributes: (spanId: string, attributes: Record<string, unknown>) => void;

  /**
   * Trace a user interaction (click, input, etc.).
   */
  traceInteraction: (action: string, target: string, attributes?: Record<string, unknown>) => string;

  /**
   * Flush all pending spans to the backend.
   */
  flush: () => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

const TraceContext = createContext<TraceContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface TraceProviderProps {
  children: React.ReactNode;
}

export function TraceProvider({ children }: TraceProviderProps): React.ReactElement {
  const location = useLocation();

  // Track page navigations
  useEffect(() => {
    traceNavigation(location.pathname, {
      search: location.search,
      hash: location.hash,
    });
  }, [location]);

  // Create context value
  const value = useMemo<TraceContextValue>(
    () => ({
      getTrace: getCurrentTrace,
      createTrace: createRootTrace,
      startSpan,
      endSpan,
      addSpanAttributes,
      traceInteraction,
      flush: flushSpans,
    }),
    []
  );

  return <TraceContext.Provider value={value}>{children}</TraceContext.Provider>;
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to access the trace context.
 */
export function useTraceContext(): TraceContextValue {
  const context = useContext(TraceContext);
  if (!context) {
    // Return a no-op implementation if used outside provider
    // This allows components to work even if tracing is not set up
    return {
      getTrace: () => null,
      createTrace: () => ({ traceId: '', spanId: '', sessionId: '' }),
      startSpan: () => '',
      endSpan: () => {},
      addSpanAttributes: () => {},
      traceInteraction: () => '',
      flush: async () => {},
    };
  }
  return context;
}

/**
 * Hook to trace a user action.
 * Returns a function that traces the action and executes the callback.
 */
export function useTracedAction<T extends (...args: any[]) => any>(
  actionName: string,
  callback: T,
  attributes?: Record<string, unknown>
): T {
  const trace = useTraceContext();

  return useCallback(
    ((...args: Parameters<T>) => {
      const spanId = trace.traceInteraction('action', actionName, {
        ...attributes,
        args: args.length > 0 ? args : undefined,
      });

      try {
        const result = callback(...args);

        // Handle promises
        if (result instanceof Promise) {
          return result
            .then((value) => {
              trace.endSpan(spanId);
              return value;
            })
            .catch((error) => {
              trace.endSpan(spanId, error);
              throw error;
            });
        }

        trace.endSpan(spanId);
        return result;
      } catch (error) {
        trace.endSpan(spanId, error as Error);
        throw error;
      }
    }) as T,
    [trace, actionName, callback, attributes]
  );
}

/**
 * Hook to trace a button click.
 */
export function useTracedClick(
  buttonName: string,
  onClick?: () => void,
  attributes?: Record<string, unknown>
): () => void {
  const trace = useTraceContext();

  return useCallback(() => {
    const spanId = trace.traceInteraction('click', buttonName, attributes);

    try {
      onClick?.();
      trace.endSpan(spanId);
    } catch (error) {
      trace.endSpan(spanId, error as Error);
      throw error;
    }
  }, [trace, buttonName, onClick, attributes]);
}

/**
 * Hook to trace form submissions.
 */
export function useTracedSubmit(
  formName: string,
  onSubmit?: (event: React.FormEvent) => void | Promise<void>,
  attributes?: Record<string, unknown>
): (event: React.FormEvent) => void {
  const trace = useTraceContext();

  return useCallback(
    async (event: React.FormEvent) => {
      const spanId = trace.traceInteraction('submit', formName, attributes);

      try {
        if (onSubmit) {
          const result = onSubmit(event);
          if (result instanceof Promise) {
            await result;
          }
        }
        trace.endSpan(spanId);
      } catch (error) {
        trace.endSpan(spanId, error as Error);
        throw error;
      }
    },
    [trace, formName, onSubmit, attributes]
  );
}

// ============================================
// EXPORT
// ============================================

export { TraceContext };
