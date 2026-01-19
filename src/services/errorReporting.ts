/**
 * Error Reporting Service
 *
 * Sends frontend errors to the backend for tracking, analysis, and auto-healing.
 * The backend will:
 * 1. Log the error with full context
 * 2. Detect patterns and recurring issues
 * 3. Trigger auto-healing workflows if applicable
 * 4. Notify the development team of critical issues
 *
 * This service is designed to be resilient - error reporting failures
 * should never break the user experience.
 */

import { getToken } from '../store/authStore';

const ERROR_REPORT_ENDPOINT = '/api/errors/report';

export interface ErrorReport {
  /** Error category (network, chunk, runtime, etc.) */
  type: string;
  /** Error message */
  message: string;
  /** Stack trace (if available) */
  stack?: string;
  /** Component name where error occurred */
  componentName?: string;
  /** HTTP status code (if applicable) */
  httpStatus?: number;
  /** URL where error occurred */
  url: string;
  /** User agent string */
  userAgent: string;
  /** ISO timestamp */
  timestamp: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

export interface ErrorReportResponse {
  /** Unique error report ID */
  id: string;
  /** Whether this is a known issue */
  isKnownIssue: boolean;
  /** Status message */
  message: string;
  /** Auto-healing status if applicable */
  autoHealing?: {
    triggered: boolean;
    action?: string;
  };
}

/**
 * Batch queue for error reports (for resilience)
 */
const errorQueue: ErrorReport[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 2000; // 2 seconds
const MAX_QUEUE_SIZE = 10;

/**
 * Report an error to the backend
 * @returns Error report response with ID, or null if reporting failed
 */
export async function reportError(
  report: ErrorReport
): Promise<ErrorReportResponse | null> {
  try {
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(ERROR_REPORT_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(report),
      // Short timeout - don't block user experience
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      // Log but don't throw - error reporting should be silent
      console.warn('Error report failed:', response.status);

      // Queue for retry if it's a transient failure
      if (response.status >= 500 || response.status === 429) {
        queueErrorReport(report);
      }

      return null;
    }

    const data = await response.json();
    return data.data as ErrorReportResponse;
  } catch (err) {
    // Network failure - queue for retry
    console.warn('Failed to send error report:', err);
    queueErrorReport(report);
    return null;
  }
}

/**
 * Queue an error report for later retry
 */
function queueErrorReport(report: ErrorReport): void {
  // Deduplicate by message (don't spam the same error)
  const isDuplicate = errorQueue.some(
    (r) => r.message === report.message && r.url === report.url
  );

  if (!isDuplicate) {
    errorQueue.push(report);

    // Trim queue if too large
    if (errorQueue.length > MAX_QUEUE_SIZE) {
      errorQueue.shift();
    }
  }

  // Schedule flush
  scheduleFlush();
}

/**
 * Schedule a queue flush
 */
function scheduleFlush(): void {
  if (flushTimeout) return;

  flushTimeout = setTimeout(() => {
    flushErrorQueue();
    flushTimeout = null;
  }, FLUSH_INTERVAL);
}

/**
 * Flush the error queue to the backend
 */
async function flushErrorQueue(): Promise<void> {
  if (errorQueue.length === 0) return;

  const reports = [...errorQueue];
  errorQueue.length = 0; // Clear queue

  try {
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Use sendBeacon for reliability (works even during page unload)
    if (navigator.sendBeacon) {
      const blob = new Blob(
        [JSON.stringify({ errors: reports })],
        { type: 'application/json' }
      );
      navigator.sendBeacon(`${ERROR_REPORT_ENDPOINT}/batch`, blob);
    } else {
      // Fallback to fetch
      await fetch(`${ERROR_REPORT_ENDPOINT}/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ errors: reports }),
        keepalive: true,
      });
    }
  } catch {
    // Re-queue on failure (will eventually be dropped if keeps failing)
    reports.forEach((r) => errorQueue.push(r));
  }
}

/**
 * Flush queue on page unload
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (flushTimeout) {
      clearTimeout(flushTimeout);
    }
    flushErrorQueue();
  });

  // Also flush when page becomes hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && errorQueue.length > 0) {
      flushErrorQueue();
    }
  });
}

/**
 * Report a JavaScript error with full context
 */
export function reportJSError(
  error: Error,
  componentName?: string,
  context?: Record<string, unknown>
): Promise<ErrorReportResponse | null> {
  return reportError({
    type: 'runtime',
    message: error.message,
    stack: error.stack,
    componentName,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    context: {
      ...context,
      errorName: error.name,
    },
  });
}

/**
 * Report an API/network error
 */
export function reportAPIError(
  url: string,
  method: string,
  status: number,
  message: string,
  context?: Record<string, unknown>
): Promise<ErrorReportResponse | null> {
  return reportError({
    type: status >= 500 ? 'server' : 'api',
    message: `${method} ${url}: ${message}`,
    httpStatus: status,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    context: {
      ...context,
      requestUrl: url,
      requestMethod: method,
    },
  });
}

/**
 * Report a chunk loading error
 */
export function reportChunkError(
  chunkName: string,
  error: Error,
  context?: Record<string, unknown>
): Promise<ErrorReportResponse | null> {
  return reportError({
    type: 'chunk',
    message: `Failed to load chunk: ${chunkName}`,
    stack: error.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    context: {
      ...context,
      chunkName,
      errorMessage: error.message,
    },
  });
}

/**
 * Report a network/offline error
 */
export function reportNetworkError(
  operation: string,
  context?: Record<string, unknown>
): Promise<ErrorReportResponse | null> {
  return reportError({
    type: 'network',
    message: `Network error during: ${operation}`,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    context: {
      ...context,
      operation,
      online: navigator.onLine,
    },
  });
}

export default {
  reportError,
  reportJSError,
  reportAPIError,
  reportChunkError,
  reportNetworkError,
};
