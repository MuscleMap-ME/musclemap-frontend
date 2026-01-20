/**
 * Production Error Tracking System
 *
 * Tracks errors in production, detects error spikes, and can trigger alerts.
 * Provides insights into error patterns and frequency.
 */

import { FastifyRequest } from 'fastify';

// ============================================
// TYPES
// ============================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorEvent {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  stack?: string;
  url?: string;
  method?: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  fingerprint: string;
}

export interface ErrorStats {
  total: number;
  lastHour: number;
  last24Hours: number;
  bySeverity: Record<ErrorSeverity, number>;
  byType: Record<string, number>;
  topErrors: Array<{ fingerprint: string; count: number; lastSeen: string; message: string }>;
}

// ============================================
// CONFIGURATION
// ============================================

const MAX_ERRORS = 1000; // Keep last 1000 errors
const ERROR_SPIKE_THRESHOLD = 10; // Errors per minute to trigger alert
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between alerts

// ============================================
// STATE
// ============================================

const errors: ErrorEvent[] = [];
const errorCounts: Map<string, number> = new Map(); // fingerprint -> count
let lastAlertTime = 0;

// Alert handlers (can be configured externally)
type AlertHandler = (message: string, errors: ErrorEvent[]) => Promise<void> | void;
const alertHandlers: AlertHandler[] = [];

// ============================================
// UTILITIES
// ============================================

function generateId(): string {
  return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateFingerprint(error: Error, url?: string): string {
  // Create a fingerprint from error type, message pattern, and URL
  const messagePattern = error.message
    .replace(/[0-9]+/g, 'N') // Replace numbers
    .replace(/[a-f0-9]{8,}/gi, 'HASH') // Replace hashes
    .substring(0, 100);

  return `${error.name}:${messagePattern}:${url || 'unknown'}`;
}

function classifyError(error: Error): ErrorSeverity {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Critical errors - system-level failures
  if (
    message.includes('database') ||
    message.includes('connection refused') ||
    message.includes('econnrefused') ||
    message.includes('out of memory') ||
    message.includes('fatal')
  ) {
    return 'critical';
  }

  // High severity - auth and security issues
  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('jwt') ||
    message.includes('token') ||
    message.includes('permission')
  ) {
    return 'high';
  }

  // Medium severity - business logic errors
  if (
    name.includes('validation') ||
    message.includes('invalid') ||
    message.includes('not found') ||
    message.includes('conflict')
  ) {
    return 'medium';
  }

  // Low severity - expected errors
  if (
    message.includes('timeout') ||
    message.includes('rate limit') ||
    message.includes('cancelled')
  ) {
    return 'low';
  }

  return 'medium';
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Track an error event
 */
export function trackError(
  error: Error,
  request?: FastifyRequest,
  context?: Record<string, unknown>
): ErrorEvent {
  const fingerprint = generateFingerprint(error, request?.url);

  const event: ErrorEvent = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    type: error.name,
    message: error.message,
    stack: error.stack,
    url: request?.url,
    method: request?.method,
    userId: (request as unknown as { user?: { id?: string } })?.user?.id,
    userAgent: request?.headers['user-agent'],
    ip: request?.ip,
    severity: classifyError(error),
    context,
    fingerprint,
  };

  // Add to errors list
  errors.unshift(event);

  // Trim to max size
  if (errors.length > MAX_ERRORS) {
    errors.pop();
  }

  // Update count for this fingerprint
  const count = (errorCounts.get(fingerprint) || 0) + 1;
  errorCounts.set(fingerprint, count);

  // Check for error spike
  checkErrorSpike();

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ErrorTracker] ${event.severity.toUpperCase()}: ${event.message}`);
  }

  return event;
}

/**
 * Check if there's an error spike and trigger alerts if needed
 */
function checkErrorSpike(): void {
  const oneMinuteAgo = Date.now() - 60 * 1000;
  const recentErrors = errors.filter(
    (e) => new Date(e.timestamp).getTime() > oneMinuteAgo
  );

  if (
    recentErrors.length >= ERROR_SPIKE_THRESHOLD &&
    Date.now() - lastAlertTime > ALERT_COOLDOWN_MS
  ) {
    lastAlertTime = Date.now();
    triggerAlert(recentErrors.length, recentErrors);
  }
}

/**
 * Trigger an alert to all registered handlers
 */
async function triggerAlert(errorCount: number, recentErrors: ErrorEvent[]): Promise<void> {
  const message = `🚨 ERROR SPIKE: ${errorCount} errors in the last minute`;

  console.error(message);

  // Group by fingerprint for summary
  const grouped = new Map<string, ErrorEvent[]>();
  for (const error of recentErrors) {
    const existing = grouped.get(error.fingerprint) || [];
    existing.push(error);
    grouped.set(error.fingerprint, existing);
  }

  console.error('Error breakdown:');
  for (const [_fingerprint, errs] of grouped) {
    console.error(`  - ${errs.length}x: ${errs[0].message.substring(0, 100)}`);
  }

  // Call all registered alert handlers
  for (const handler of alertHandlers) {
    try {
      await handler(message, recentErrors);
    } catch (e) {
      console.error('Alert handler failed:', e);
    }
  }
}

/**
 * Register an alert handler (e.g., Slack, PagerDuty, email)
 */
export function registerAlertHandler(handler: AlertHandler): void {
  alertHandlers.push(handler);
}

/**
 * Get error statistics
 */
export function getErrorStats(): ErrorStats {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const lastHourErrors = errors.filter(
    (e) => new Date(e.timestamp).getTime() > oneHourAgo
  );
  const lastDayErrors = errors.filter(
    (e) => new Date(e.timestamp).getTime() > oneDayAgo
  );

  // Count by severity
  const bySeverity: Record<ErrorSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  for (const error of lastHourErrors) {
    bySeverity[error.severity]++;
  }

  // Count by type
  const byType: Record<string, number> = {};
  for (const error of lastHourErrors) {
    byType[error.type] = (byType[error.type] || 0) + 1;
  }

  // Get top errors by fingerprint
  const fingerprintCounts = new Map<string, { count: number; lastSeen: string; message: string }>();
  for (const error of lastHourErrors) {
    const existing = fingerprintCounts.get(error.fingerprint);
    if (!existing || new Date(error.timestamp) > new Date(existing.lastSeen)) {
      fingerprintCounts.set(error.fingerprint, {
        count: (existing?.count || 0) + 1,
        lastSeen: error.timestamp,
        message: error.message,
      });
    } else {
      existing.count++;
    }
  }

  const topErrors = Array.from(fingerprintCounts.entries())
    .map(([fingerprint, data]) => ({ fingerprint, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total: errors.length,
    lastHour: lastHourErrors.length,
    last24Hours: lastDayErrors.length,
    bySeverity,
    byType,
    topErrors,
  };
}

/**
 * Get recent errors
 */
export function getRecentErrors(limit = 50, severity?: ErrorSeverity): ErrorEvent[] {
  let filtered = errors;

  if (severity) {
    filtered = errors.filter((e) => e.severity === severity);
  }

  return filtered.slice(0, limit);
}

/**
 * Clear all tracked errors (for testing)
 */
export function clearErrors(): void {
  errors.length = 0;
  errorCounts.clear();
}

// ============================================
// ALERT HANDLER EXAMPLES
// ============================================

/**
 * Slack webhook alert handler
 */
export function createSlackAlertHandler(webhookUrl: string): AlertHandler {
  return async (message: string, recentErrors: ErrorEvent[]) => {
    const criticalCount = recentErrors.filter((e) => e.severity === 'critical').length;
    const highCount = recentErrors.filter((e) => e.severity === 'high').length;

    const payload = {
      text: message,
      attachments: [
        {
          color: criticalCount > 0 ? 'danger' : highCount > 0 ? 'warning' : '#36a64f',
          fields: [
            {
              title: 'Severity Breakdown',
              value: `Critical: ${criticalCount}, High: ${highCount}, Other: ${recentErrors.length - criticalCount - highCount}`,
              short: true,
            },
            {
              title: 'Time',
              value: new Date().toISOString(),
              short: true,
            },
          ],
        },
      ],
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  };
}

/**
 * Console alert handler (default)
 */
export const consoleAlertHandler: AlertHandler = (message: string, recentErrors: ErrorEvent[]) => {
  console.error('\n' + '='.repeat(60));
  console.error(message);
  console.error('='.repeat(60));

  const grouped = new Map<string, number>();
  for (const error of recentErrors) {
    grouped.set(error.fingerprint, (grouped.get(error.fingerprint) || 0) + 1);
  }

  for (const [fingerprint, count] of grouped) {
    const sample = recentErrors.find((e) => e.fingerprint === fingerprint);
    console.error(`  ${count}x: ${sample?.message.substring(0, 80)}`);
  }

  console.error('='.repeat(60) + '\n');
};

// Register console handler by default
registerAlertHandler(consoleAlertHandler);
