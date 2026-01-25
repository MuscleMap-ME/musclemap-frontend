/**
 * QA Session Logger
 *
 * Comprehensive frontend event capture for passive QA testing.
 * Captures errors, warnings, interactions, and performance data
 * and batches them to the server for later analysis via GraphQL.
 *
 * Usage:
 * - Start: Visit any page with ?qa=start
 * - Stop: Visit any page with ?qa=end or call qaSession.end()
 * - Events are automatically batched and sent every 5 seconds
 *
 * Designed to work in hostile environments (Brave Shields, iOS Lockdown Mode)
 * Uses GraphQL mutation for consistency with the rest of the app.
 */

import { getUserId } from '../store/authStore';

const GRAPHQL_ENDPOINT = '/api/graphql';
const BATCH_INTERVAL = 5000; // 5 seconds
const MAX_QUEUE_SIZE = 100;

// GraphQL mutation for logging QA events
const LOG_QA_EVENTS_MUTATION = `
  mutation LogQAEvents($input: QALogInput!) {
    logQAEvents(input: $input) {
      success
      count
      sessionId
    }
  }
`;

export interface QAEvent {
  event_type: string;
  event_data: Record<string, unknown>;
  url: string;
  timestamp: string;
}

interface QASession {
  id: string;
  startedAt: string;
  isActive: boolean;
}

// Session state
let currentSession: QASession | null = null;
let eventQueue: QAEvent[] = [];
let batchInterval: ReturnType<typeof setInterval> | null = null;
let originalConsoleError: typeof console.error | null = null;
let originalConsoleWarn: typeof console.warn | null = null;

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `qa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get current URL safely
 */
function getCurrentUrl(): string {
  try {
    return window.location.href;
  } catch {
    return 'unknown';
  }
}

/**
 * Get user agent safely
 */
function getUserAgent(): string {
  try {
    return navigator.userAgent;
  } catch {
    return 'unknown';
  }
}

/**
 * Log a QA event
 */
export function logQAEvent(eventType: string, eventData: Record<string, unknown>): void {
  if (!currentSession?.isActive) return;

  const event: QAEvent = {
    event_type: eventType,
    event_data: eventData,
    url: getCurrentUrl(),
    timestamp: new Date().toISOString(),
  };

  eventQueue.push(event);

  // Trim queue if too large
  if (eventQueue.length > MAX_QUEUE_SIZE) {
    eventQueue = eventQueue.slice(-MAX_QUEUE_SIZE);
  }
}

/**
 * Flush events to server via GraphQL mutation
 */
async function flushEvents(): Promise<void> {
  if (!currentSession?.isActive || eventQueue.length === 0) return;

  const events = [...eventQueue];
  eventQueue = [];

  // Transform events to GraphQL input format
  const graphqlPayload = {
    query: LOG_QA_EVENTS_MUTATION,
    variables: {
      input: {
        sessionId: currentSession.id,
        userAgent: getUserAgent(),
        events: events.map((e) => ({
          eventType: e.event_type,
          eventData: e.event_data,
          url: e.url,
          timestamp: e.timestamp,
        })),
      },
    },
  };

  try {
    // Use sendBeacon for reliability (works during page unload)
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(graphqlPayload)], { type: 'application/json' });
      const sent = navigator.sendBeacon(GRAPHQL_ENDPOINT, blob);
      if (!sent) {
        // Fallback to fetch if sendBeacon fails
        await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(graphqlPayload),
          keepalive: true,
        });
      }
    } else {
      // Fallback for browsers without sendBeacon
      await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graphqlPayload),
        keepalive: true,
      });
    }
  } catch (err) {
    // Re-queue events on failure (they'll be sent next batch)
    eventQueue = [...events, ...eventQueue].slice(-MAX_QUEUE_SIZE);
    console.debug('[QA] Failed to flush events:', err);
  }
}

/**
 * Set up global error handlers
 */
function setupErrorHandlers(): void {
  // Capture uncaught errors
  window.onerror = (message, source, lineno, colno, error) => {
    logQAEvent('js_error', {
      message: String(message),
      source,
      lineno,
      colno,
      stack: error?.stack,
      name: error?.name,
    });
    return false; // Don't prevent default handling
  };

  // Capture unhandled promise rejections
  window.onunhandledrejection = (event) => {
    const reason = event.reason;
    logQAEvent('promise_rejection', {
      message: reason?.message || String(reason),
      stack: reason?.stack,
      name: reason?.name,
    });
  };

  // Intercept console.error
  originalConsoleError = console.error;
  console.error = (...args) => {
    logQAEvent('console_error', {
      message: args.map(a => {
        try {
          return typeof a === 'object' ? JSON.stringify(a) : String(a);
        } catch {
          return String(a);
        }
      }).join(' '),
      args: args.map(a => {
        try {
          if (a instanceof Error) {
            return { message: a.message, stack: a.stack, name: a.name };
          }
          return typeof a === 'object' ? JSON.stringify(a).substring(0, 500) : String(a);
        } catch {
          return String(a);
        }
      }),
    });
    originalConsoleError?.apply(console, args);
  };

  // Intercept console.warn
  originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    logQAEvent('console_warn', {
      message: args.map(a => {
        try {
          return typeof a === 'object' ? JSON.stringify(a) : String(a);
        } catch {
          return String(a);
        }
      }).join(' '),
    });
    originalConsoleWarn?.apply(console, args);
  };
}

/**
 * Restore original console methods
 */
function restoreConsole(): void {
  if (originalConsoleError) {
    console.error = originalConsoleError;
    originalConsoleError = null;
  }
  if (originalConsoleWarn) {
    console.warn = originalConsoleWarn;
    originalConsoleWarn = null;
  }
}

/**
 * Set up navigation tracking
 */
function setupNavigationTracking(): void {
  let lastUrl = getCurrentUrl();
  let lastNavigationTime = Date.now();

  // Track history changes
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    const newUrl = getCurrentUrl();
    const loadTime = Date.now() - lastNavigationTime;

    logQAEvent('navigation', {
      from: lastUrl,
      to: newUrl,
      loadTime,
      method: 'pushState',
    });

    lastUrl = newUrl;
    lastNavigationTime = Date.now();
    return result;
  };

  // Track popstate (back/forward buttons)
  window.addEventListener('popstate', () => {
    const newUrl = getCurrentUrl();
    const loadTime = Date.now() - lastNavigationTime;

    logQAEvent('navigation', {
      from: lastUrl,
      to: newUrl,
      loadTime,
      method: 'popstate',
    });

    lastUrl = newUrl;
    lastNavigationTime = Date.now();
  });
}

/**
 * Set up interaction tracking
 */
function setupInteractionTracking(): void {
  // Track clicks on interactive elements
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (!target) return;

    // Only log clicks on buttons, links, and interactive elements
    const isInteractive = target.matches('button, a, [role="button"], input[type="submit"], [data-qa-track]');
    const interactiveParent = target.closest('button, a, [role="button"], input[type="submit"], [data-qa-track]');

    if (isInteractive || interactiveParent) {
      const element = (isInteractive ? target : interactiveParent) as HTMLElement;
      logQAEvent('interaction', {
        element: element.tagName.toLowerCase(),
        text: element.textContent?.substring(0, 100)?.trim(),
        id: element.id || undefined,
        className: element.className || undefined,
        href: (element as HTMLAnchorElement).href || undefined,
        type: (element as HTMLButtonElement).type || undefined,
      });
    }
  }, { passive: true });

  // Track form submissions
  document.addEventListener('submit', (event) => {
    const form = event.target as HTMLFormElement;
    if (!form) return;

    logQAEvent('form_submit', {
      action: form.action,
      method: form.method,
      id: form.id || undefined,
      name: form.name || undefined,
    });
  }, { passive: true });
}

/**
 * Set up image error tracking
 */
function setupImageErrorTracking(): void {
  document.addEventListener('error', (event) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      logQAEvent('image_error', {
        src: img.src,
        alt: img.alt,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      });
    }
  }, { capture: true, passive: true });
}

/**
 * Set up performance tracking
 */
function setupPerformanceTracking(): void {
  // Track long page loads
  window.addEventListener('load', () => {
    setTimeout(() => {
      try {
        const perfEntries = performance.getEntriesByType('navigation');
        if (perfEntries.length > 0) {
          const navEntry = perfEntries[0] as PerformanceNavigationTiming;
          const loadTime = navEntry.loadEventEnd - navEntry.startTime;

          if (loadTime > 2000) {
            logQAEvent('slow_page_load', {
              loadTime,
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.startTime,
              domInteractive: navEntry.domInteractive - navEntry.startTime,
              url: getCurrentUrl(),
            });
          }
        }
      } catch {
        // Performance API might not be available
      }
    }, 0);
  });

  // Track long tasks (>50ms)
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 100) { // Only log tasks > 100ms
            logQAEvent('long_task', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name,
            });
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      // longtask might not be supported
    }
  }
}

/**
 * Set up fetch interceptor for network errors
 */
function setupNetworkTracking(): void {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const startTime = Date.now();
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;

    try {
      const response = await originalFetch.apply(this, args);
      const duration = Date.now() - startTime;

      // Log slow requests
      if (duration > 3000) {
        logQAEvent('slow_request', {
          url,
          duration,
          status: response.status,
          method: (args[1] as RequestInit)?.method || 'GET',
        });
      }

      // Log failed requests (excluding expected 401s)
      if (!response.ok && response.status !== 401) {
        logQAEvent('network_error', {
          url,
          status: response.status,
          statusText: response.statusText,
          method: (args[1] as RequestInit)?.method || 'GET',
          duration,
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      logQAEvent('network_error', {
        url,
        error: (error as Error).message,
        method: (args[1] as RequestInit)?.method || 'GET',
        duration,
        isOffline: !navigator.onLine,
      });
      throw error;
    }
  };
}

/**
 * Start a QA session
 */
export function startQASession(): string {
  if (currentSession?.isActive) {
    console.log('[QA] Session already active:', currentSession.id);
    return currentSession.id;
  }

  currentSession = {
    id: generateSessionId(),
    startedAt: new Date().toISOString(),
    isActive: true,
  };

  // Set up all trackers
  setupErrorHandlers();
  setupNavigationTracking();
  setupInteractionTracking();
  setupImageErrorTracking();
  setupPerformanceTracking();
  setupNetworkTracking();

  // Start batch flush interval
  batchInterval = setInterval(flushEvents, BATCH_INTERVAL);

  // Flush on page unload
  window.addEventListener('beforeunload', flushEvents);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flushEvents();
  });

  // Store session ID in sessionStorage for persistence across page loads
  try {
    sessionStorage.setItem('qa_session_id', currentSession.id);
    sessionStorage.setItem('qa_session_started', currentSession.startedAt);
  } catch {
    // sessionStorage might be blocked
  }

  // Log session start
  logQAEvent('session_start', {
    sessionId: currentSession.id,
    userAgent: getUserAgent(),
    screenWidth: window.screen?.width,
    screenHeight: window.screen?.height,
    devicePixelRatio: window.devicePixelRatio,
    online: navigator.onLine,
    language: navigator.language,
  });

  console.log('[QA] Session started:', currentSession.id);
  return currentSession.id;
}

/**
 * End the current QA session
 */
export function endQASession(): void {
  if (!currentSession?.isActive) {
    console.log('[QA] No active session to end');
    return;
  }

  // Log session end
  logQAEvent('session_end', {
    sessionId: currentSession.id,
    duration: Date.now() - new Date(currentSession.startedAt).getTime(),
    totalEvents: eventQueue.length,
  });

  // Final flush
  flushEvents();

  // Clean up
  if (batchInterval) {
    clearInterval(batchInterval);
    batchInterval = null;
  }

  restoreConsole();

  // Clear session storage
  try {
    sessionStorage.removeItem('qa_session_id');
    sessionStorage.removeItem('qa_session_started');
  } catch {
    // sessionStorage might be blocked
  }

  console.log('[QA] Session ended:', currentSession.id);
  currentSession = { ...currentSession, isActive: false };
}

/**
 * Check if a QA session is active
 */
export function isQASessionActive(): boolean {
  return currentSession?.isActive ?? false;
}

/**
 * Get current session ID
 */
export function getQASessionId(): string | null {
  return currentSession?.id ?? null;
}

/**
 * Resume session from storage (call on page load)
 */
export function resumeQASessionIfActive(): void {
  try {
    const storedId = sessionStorage.getItem('qa_session_id');
    const storedStarted = sessionStorage.getItem('qa_session_started');

    if (storedId && storedStarted) {
      currentSession = {
        id: storedId,
        startedAt: storedStarted,
        isActive: true,
      };

      // Re-setup all trackers
      setupErrorHandlers();
      setupNavigationTracking();
      setupInteractionTracking();
      setupImageErrorTracking();
      setupPerformanceTracking();
      setupNetworkTracking();

      // Restart batch interval
      batchInterval = setInterval(flushEvents, BATCH_INTERVAL);

      console.log('[QA] Resumed session:', currentSession.id);

      // Log page load in resumed session
      logQAEvent('page_load', {
        url: getCurrentUrl(),
        referrer: document.referrer,
      });
    }
  } catch {
    // sessionStorage might be blocked
  }
}

/**
 * Initialize QA logger - call this on app startup
 * Checks URL params for ?qa=start or ?qa=end
 */
export function initQALogger(): void {
  if (typeof window === 'undefined') return;

  try {
    const params = new URLSearchParams(window.location.search);
    const qaParam = params.get('qa');

    if (qaParam === 'start') {
      startQASession();
      // Remove qa param from URL to avoid restarting on refresh
      params.delete('qa');
      const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      history.replaceState({}, '', newUrl);
    } else if (qaParam === 'end') {
      endQASession();
      params.delete('qa');
      const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      history.replaceState({}, '', newUrl);
    } else {
      // Check for existing session
      resumeQASessionIfActive();
    }
  } catch {
    // URL parsing might fail in some environments
  }
}

// Export for Apollo Client error link integration
export function logGraphQLError(
  operationName: string,
  operationType: string,
  errors: Array<{ message: string; path?: string[]; extensions?: Record<string, unknown> }>
): void {
  if (!currentSession?.isActive) return;

  for (const error of errors) {
    logQAEvent('graphql_error', {
      operation: operationName,
      operationType,
      message: error.message,
      path: error.path,
      extensions: error.extensions,
    });
  }
}

// Export for SafeMotion fallback tracking
export function logAnimationFallback(component: string, reason: string): void {
  logQAEvent('animation_fallback', {
    component,
    reason,
  });
}

export default {
  init: initQALogger,
  start: startQASession,
  end: endQASession,
  isActive: isQASessionActive,
  getSessionId: getQASessionId,
  log: logQAEvent,
  logGraphQLError,
  logAnimationFallback,
};
