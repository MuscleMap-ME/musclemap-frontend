/**
 * Web Vitals Tracking
 *
 * Monitors Core Web Vitals (LCP, FID, CLS, INP, TTFB) for performance tracking.
 * Sends metrics to analytics endpoint in production, logs to console in development.
 */
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

const VITALS_ENDPOINT = '/api/vitals';

/**
 * Send metrics to analytics endpoint
 * Uses sendBeacon for reliability during page unload
 */
function sendToAnalytics(metric) {
  const body = JSON.stringify({
    metric: metric.name,
    value: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta),
    rating: metric.rating, // 'good', 'needs-improvement', or 'poor'
    id: metric.id,
    navigationType: metric.navigationType,
    page: window.location.pathname,
    timestamp: Date.now(),
    // Include attribution data if available
    ...(metric.attribution && {
      attribution: {
        element: metric.attribution.element,
        largestShiftTarget: metric.attribution.largestShiftTarget,
        largestShiftTime: metric.attribution.largestShiftTime,
      },
    }),
  });

  // Use sendBeacon for reliability during page unload
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(VITALS_ENDPOINT, blob);
  } else {
    // Fallback for browsers without sendBeacon
    fetch(VITALS_ENDPOINT, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {
      // Silently fail - don't break the app for analytics
    });
  }
}

/**
 * Console logging for development
 */
function logToConsole(metric) {
  const rating = {
    good: '\x1b[32m', // green
    'needs-improvement': '\x1b[33m', // yellow
    poor: '\x1b[31m', // red
  }[metric.rating] || '';
  const reset = '\x1b[0m';

  console.log(
    `[Web Vitals] ${metric.name}: ${rating}${metric.value.toFixed(2)}${reset} (${metric.rating})`
  );
}

/**
 * Report Web Vitals to analytics endpoint
 * Call this in main.jsx for production builds
 */
export function reportWebVitals() {
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

/**
 * Log Web Vitals to console
 * Call this in main.jsx for development builds
 */
export function logWebVitals() {
  onCLS(logToConsole);
  onINP(logToConsole);
  onLCP(logToConsole);
  onFCP(logToConsole);
  onTTFB(logToConsole);
}

/**
 * Get current performance metrics
 * Useful for displaying in a dashboard or debug panel
 */
export function getPerformanceMetrics() {
  const metrics = {};

  if (typeof window !== 'undefined' && window.performance) {
    const timing = performance.getEntriesByType('navigation')[0];
    if (timing) {
      metrics.domComplete = timing.domComplete;
      metrics.loadEventEnd = timing.loadEventEnd;
      metrics.domInteractive = timing.domInteractive;
      metrics.responseStart = timing.responseStart;
    }

    // Get paint timings
    const paintEntries = performance.getEntriesByType('paint');
    paintEntries.forEach((entry) => {
      if (entry.name === 'first-paint') {
        metrics.firstPaint = entry.startTime;
      } else if (entry.name === 'first-contentful-paint') {
        metrics.firstContentfulPaint = entry.startTime;
      }
    });
  }

  return metrics;
}

export default {
  reportWebVitals,
  logWebVitals,
  getPerformanceMetrics,
};
