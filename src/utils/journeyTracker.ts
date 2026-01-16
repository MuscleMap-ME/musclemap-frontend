/**
 * User Journey Tracker
 *
 * Tracks user journeys through the app for debugging and analytics.
 * Automatically captures:
 * - Page navigations
 * - User interactions
 * - API calls
 * - Errors
 */

const API_BASE = '/api/monitoring';

class JourneyTracker {
  constructor() {
    this.sessionId = null;
    this.journeyStarted = false;
    this.pendingSteps = [];
    this.enabled = true;
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Start tracking a journey
   */
  async start(userId = null, metadata = {}) {
    if (!this.enabled || this.journeyStarted) return;

    this.sessionId = this.generateSessionId();
    this.journeyStarted = true;

    try {
      await fetch(`${API_BASE}/journey/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          userId,
          metadata: {
            ...metadata,
            userAgent: navigator.userAgent,
            language: navigator.language,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            referrer: document.referrer,
            startUrl: window.location.href,
          },
        }),
      });

      // Flush any pending steps
      for (const step of this.pendingSteps) {
        await this.addStep(step);
      }
      this.pendingSteps = [];
    } catch (error) {
      console.debug('[JourneyTracker] Failed to start journey:', error);
    }
  }

  /**
   * Add a step to the journey
   */
  async addStep(step) {
    if (!this.enabled) return;

    if (!this.journeyStarted) {
      this.pendingSteps.push(step);
      return;
    }

    try {
      await fetch(`${API_BASE}/journey/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          ...step,
        }),
      });
    } catch (error) {
      console.debug('[JourneyTracker] Failed to add step:', error);
    }
  }

  /**
   * Track a navigation event
   */
  trackNavigation(path, name = null) {
    this.addStep({
      type: 'navigation',
      name: name || `Navigate to ${path}`,
      path,
      details: {
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Track a user interaction
   */
  trackInteraction(name, details = {}) {
    this.addStep({
      type: 'interaction',
      name,
      details: {
        ...details,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Track an API call
   */
  trackAPICall(method, endpoint, duration, status) {
    this.addStep({
      type: 'api_call',
      name: `${method} ${endpoint}`,
      path: endpoint,
      duration,
      details: {
        status,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Track a component render
   */
  trackRender(componentName, duration = null) {
    this.addStep({
      type: 'render',
      name: `Render ${componentName}`,
      duration,
      details: {
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Record an error
   */
  async recordError(error, type = 'js_error', context = {}) {
    if (!this.enabled) return;

    const errorData = {
      type,
      message: error.message || String(error),
      stack: error.stack,
      context: {
        ...context,
        path: window.location.pathname,
        timestamp: Date.now(),
      },
    };

    // Add to journey if active
    if (this.journeyStarted) {
      try {
        await fetch(`${API_BASE}/journey/error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.sessionId,
            ...errorData,
          }),
        });
      } catch (e) {
        console.debug('[JourneyTracker] Failed to record journey error:', e);
      }
    }

    // Also track in global error tracking
    try {
      await fetch(`${API_BASE}/errors/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...errorData,
          sessionId: this.sessionId,
          userAgent: navigator.userAgent,
        }),
      });
    } catch (e) {
      console.debug('[JourneyTracker] Failed to track error:', e);
    }
  }

  /**
   * End the journey
   */
  async end() {
    if (!this.enabled || !this.journeyStarted) return;

    try {
      await fetch(`${API_BASE}/journey/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
        }),
      });
    } catch (error) {
      console.debug('[JourneyTracker] Failed to end journey:', error);
    }

    this.journeyStarted = false;
    this.sessionId = null;
  }

  /**
   * Enable/disable tracking
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled && this.journeyStarted) {
      this.end();
    }
  }

  /**
   * Get current session ID
   */
  getSessionId() {
    return this.sessionId;
  }
}

// Singleton instance
export const journeyTracker = new JourneyTracker();

// Auto-setup global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    journeyTracker.recordError(event.error || new Error(event.message), 'js_error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    journeyTracker.recordError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      'js_error',
      { type: 'unhandledrejection' }
    );
  });

  // Track page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      journeyTracker.trackInteraction('Page hidden');
    } else {
      journeyTracker.trackInteraction('Page visible');
    }
  });

  // End journey when page unloads
  window.addEventListener('beforeunload', () => {
    journeyTracker.end();
  });
}

export default journeyTracker;
