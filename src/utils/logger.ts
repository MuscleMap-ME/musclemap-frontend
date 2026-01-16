// Frontend Logger - sends events to backend for unified logging
import { getToken } from '../store/authStore';

const LOG_ENDPOINT = '/api/trace/frontend-log';

class FrontendLogger {
  constructor() {
    this.queue = [];
    this.flushInterval = 5000;
    this.sessionId = this.generateSessionId();
    this.setupErrorHandlers();
    this.startFlushTimer();
  }

  generateSessionId() {
    return 'fs_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  setupErrorHandlers() {
    // Catch unhandled errors
    window.onerror = (message, source, lineno, colno, error) => {
      this.error('unhandled_error', {
        message,
        source,
        lineno,
        colno,
        stack: error?.stack
      });
      return false;
    };

    // Catch unhandled promise rejections
    window.onunhandledrejection = (event) => {
      this.error('unhandled_rejection', {
        reason: event.reason?.message || String(event.reason),
        stack: event.reason?.stack
      });
    };

    // Log page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.event('visibility_change', { hidden: document.hidden });
    });

    // Log before unload
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });
  }

  getContext() {
    return {
      sessionId: this.sessionId,
      url: window.location.pathname,
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      timestamp: new Date().toISOString(),
      userId: this.getUserId()
    };
  }

  getUserId() {
    try {
      const token = getToken();
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.id;
      }
    } catch (err) {
      console.error('Failed to parse user ID from token:', err);
    }
    return null;
  }

  log(level, type, data = {}) {
    const entry = {
      level,
      type,
      data,
      ...this.getContext()
    };
    this.queue.push(entry);
    
    // Immediate flush for errors
    if (level === 'error') {
      this.flush();
    }
    
    // Console output in development
    if (process.env.NODE_ENV !== 'production') {
      const style = {
        error: 'color: #f87171',
        warn: 'color: #fbbf24',
        info: 'color: #60a5fa',
        debug: 'color: #9ca3af'
      }[level] || 'color: #fff';
      console.log(`%c[${level.toUpperCase()}] ${type}`, style, data);
    }
  }

  // Public methods
  error(type, data) { this.log('error', type, data); }
  warn(type, data) { this.log('warn', type, data); }
  info(type, data) { this.log('info', type, data); }
  debug(type, data) { this.log('debug', type, data); }
  
  // Track user events
  event(type, data) { this.log('info', type, data); }
  
  // Track page views
  pageView(page, data = {}) {
    this.log('info', 'page_view', { page, ...data });
  }

  // Track user actions
  action(action, data = {}) {
    this.log('info', 'user_action', { action, ...data });
  }

  // Track API calls
  apiCall(method, url, duration, status, error = null) {
    this.log(error ? 'error' : 'info', 'api_call', {
      method,
      url,
      duration,
      status,
      error
    });
  }

  // Track performance
  performance(metric, value, data = {}) {
    this.log('info', 'performance', { metric, value, ...data });
  }

  // Track component renders
  componentMount(component) {
    this.log('debug', 'component_mount', { component });
  }

  componentError(component, error) {
    this.log('error', 'component_error', {
      component,
      message: error.message,
      stack: error.stack
    });
  }

  startFlushTimer() {
    setInterval(() => this.flush(), this.flushInterval);
  }

  async flush(sync = false) {
    if (this.queue.length === 0) return;

    const entries = [...this.queue];
    this.queue = [];

    const token = getToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const body = JSON.stringify({ entries });

    if (sync && navigator.sendBeacon) {
      // Use sendBeacon for unload events
      navigator.sendBeacon(LOG_ENDPOINT, body);
    } else {
      try {
        const resp = await fetch(LOG_ENDPOINT, {
          method: 'POST',
          headers,
          body,
          keepalive: true
        });

        // If the endpoint doesn't exist (404/410), drop logs so we don't grow memory forever.
        if (resp.status === 404 || resp.status === 410) {
          this.queue = [];
          return;
        }

        // If rate-limited or transient server errors, re-queue.
        if (!resp.ok && (resp.status === 429 || resp.status >= 500)) {
          this.queue.unshift(...entries);
        }
      } catch (_err) {
        // Re-queue on network failure
        this.queue.unshift(...entries);
      }
    }
  }
}

// Singleton instance
const logger = new FrontendLogger();

// API wrapper with logging
export const fetchWithLogging = async (url, options = {}) => {
  const start = performance.now();
  try {
    const response = await fetch(url, options);
    const duration = Math.round(performance.now() - start);
    logger.apiCall(options.method || 'GET', url, duration, response.status);
    return response;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.apiCall(options.method || 'GET', url, duration, 0, error.message);
    throw error;
  }
};

export default logger;
