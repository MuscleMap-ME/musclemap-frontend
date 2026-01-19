#!/usr/bin/env npx tsx
/**
 * Uptime Monitor
 *
 * Monitors site availability and sends alerts when issues are detected.
 * Can run as a cron job or continuous daemon.
 *
 * Usage:
 *   npx tsx scripts/deployment/uptime-monitor.ts [options]
 *
 * Options:
 *   --daemon          Run continuously (checks every minute)
 *   --interval MS     Check interval in ms (default: 60000)
 *   --slack URL       Slack webhook URL for alerts
 *   --verbose         Show detailed output
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// ============================================
// CONFIGURATION
// ============================================

const args = process.argv.slice(2);

function getArg(name: string, defaultValue: string): string {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1];
  }
  return defaultValue;
}

const DAEMON_MODE = args.includes('--daemon');
const VERBOSE = args.includes('--verbose');
const CHECK_INTERVAL = parseInt(getArg('interval', '60000'));
const SLACK_WEBHOOK = getArg('slack', process.env.SLACK_WEBHOOK_URL || '');

const STATUS_FILE = '/tmp/musclemap-uptime.json';
const HISTORY_FILE = '/tmp/musclemap-uptime-history.json';

// ============================================
// TYPES
// ============================================

interface EndpointConfig {
  url: string;
  name: string;
  method?: 'GET' | 'POST';
  body?: string;
  headers?: Record<string, string>;
  expectedStatus?: number;
  timeout?: number;
  critical?: boolean;
}

interface CheckResult {
  url: string;
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  statusCode?: number;
  error?: string;
  timestamp: string;
}

interface StatusEntry {
  url: string;
  name: string;
  lastCheck: string;
  status: 'up' | 'down' | 'degraded';
  downSince?: string;
  upSince?: string;
  lastError?: string;
  responseTime: number;
  consecutiveFailures: number;
}

// ============================================
// ENDPOINTS TO MONITOR
// ============================================

const ENDPOINTS: EndpointConfig[] = [
  {
    url: 'https://musclemap.me/health',
    name: 'API Health',
    critical: true,
    timeout: 10000,
  },
  {
    url: 'https://musclemap.me/',
    name: 'Homepage',
    critical: true,
    timeout: 15000,
  },
  {
    url: 'https://musclemap.me/api/graphql',
    name: 'GraphQL',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ __typename }' }),
    expectedStatus: 200,
    critical: true,
    timeout: 10000,
  },
  {
    url: 'https://musclemap.me/login',
    name: 'Login Page',
    critical: false,
    timeout: 15000,
  },
];

// ============================================
// STATE MANAGEMENT
// ============================================

let status: Map<string, StatusEntry> = new Map();
let history: CheckResult[] = [];

function loadStatus(): void {
  if (existsSync(STATUS_FILE)) {
    try {
      const data = JSON.parse(readFileSync(STATUS_FILE, 'utf-8'));
      status = new Map(data.map((e: StatusEntry) => [e.url, e]));
    } catch {
      status = new Map();
    }
  }

  if (existsSync(HISTORY_FILE)) {
    try {
      history = JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
    } catch {
      history = [];
    }
  }
}

function saveStatus(): void {
  const dir = dirname(STATUS_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(STATUS_FILE, JSON.stringify(Array.from(status.values()), null, 2));

  // Keep last 24 hours of history (1440 checks at 1/min)
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  history = history.filter((h) => new Date(h.timestamp).getTime() > oneDayAgo);
  writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

// ============================================
// CHECK FUNCTIONS
// ============================================

async function checkEndpoint(endpoint: EndpointConfig): Promise<CheckResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      endpoint.timeout || 10000
    );

    const response = await fetch(endpoint.url, {
      method: endpoint.method || 'GET',
      headers: endpoint.headers,
      body: endpoint.body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseTime = Date.now() - startTime;
    const expectedStatus = endpoint.expectedStatus || 200;

    if (response.status !== expectedStatus) {
      return {
        url: endpoint.url,
        name: endpoint.name,
        status: 'down',
        responseTime,
        statusCode: response.status,
        error: `Expected ${expectedStatus}, got ${response.status}`,
        timestamp,
      };
    }

    // Check for degraded performance (>2s response)
    if (responseTime > 2000) {
      return {
        url: endpoint.url,
        name: endpoint.name,
        status: 'degraded',
        responseTime,
        statusCode: response.status,
        timestamp,
      };
    }

    return {
      url: endpoint.url,
      name: endpoint.name,
      status: 'up',
      responseTime,
      statusCode: response.status,
      timestamp,
    };
  } catch (error) {
    return {
      url: endpoint.url,
      name: endpoint.name,
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
      timestamp,
    };
  }
}

// ============================================
// ALERTING
// ============================================

async function sendAlert(message: string, results: CheckResult[]): Promise<void> {
  console.error(`\n🚨 ALERT: ${message}\n`);

  for (const result of results) {
    console.error(`  ${result.status === 'down' ? '❌' : '⚠️'} ${result.name}: ${result.error || result.status}`);
  }

  // Send to Slack if configured
  if (SLACK_WEBHOOK) {
    try {
      const payload = {
        text: `🚨 *MuscleMap Alert*: ${message}`,
        attachments: results.map((r) => ({
          color: r.status === 'down' ? 'danger' : 'warning',
          fields: [
            { title: 'Endpoint', value: r.name, short: true },
            { title: 'Status', value: r.status, short: true },
            { title: 'Response Time', value: `${r.responseTime}ms`, short: true },
            { title: 'Error', value: r.error || 'N/A', short: true },
          ],
        })),
      };

      await fetch(SLACK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('Failed to send Slack alert:', e);
    }
  }
}

async function sendRecoveryNotice(endpoint: StatusEntry): Promise<void> {
  const downDuration = endpoint.downSince
    ? Date.now() - new Date(endpoint.downSince).getTime()
    : 0;
  const durationStr = formatDuration(downDuration);

  console.log(`\n✅ RECOVERED: ${endpoint.name} is back up (was down for ${durationStr})\n`);

  if (SLACK_WEBHOOK) {
    try {
      await fetch(SLACK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `✅ *MuscleMap Recovery*: ${endpoint.name} is back up\nDowntime: ${durationStr}`,
        }),
      });
    } catch (e) {
      console.error('Failed to send recovery notice:', e);
    }
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// ============================================
// MAIN CHECK LOOP
// ============================================

async function runChecks(): Promise<void> {
  const results: CheckResult[] = [];

  for (const endpoint of ENDPOINTS) {
    const result = await checkEndpoint(endpoint);
    results.push(result);
    history.push(result);

    // Update status
    const prev = status.get(endpoint.url);
    const current: StatusEntry = {
      url: endpoint.url,
      name: endpoint.name,
      lastCheck: result.timestamp,
      status: result.status,
      responseTime: result.responseTime,
      lastError: result.error,
      consecutiveFailures: 0,
      upSince: prev?.upSince,
      downSince: prev?.downSince,
    };

    if (result.status === 'down') {
      current.consecutiveFailures = (prev?.consecutiveFailures || 0) + 1;
      if (!prev?.downSince || prev.status !== 'down') {
        current.downSince = result.timestamp;
      } else {
        current.downSince = prev.downSince;
      }
      current.upSince = undefined;
    } else {
      current.consecutiveFailures = 0;
      if (!prev?.upSince || prev.status === 'down') {
        current.upSince = result.timestamp;

        // Send recovery notice if was down
        if (prev?.status === 'down' && prev.downSince) {
          await sendRecoveryNotice(prev);
        }
      } else {
        current.upSince = prev.upSince;
      }
      current.downSince = undefined;
    }

    status.set(endpoint.url, current);
  }

  // Save status
  saveStatus();

  // Check for critical failures
  const criticalFailures = results.filter(
    (r) =>
      r.status === 'down' &&
      ENDPOINTS.find((e) => e.url === r.url)?.critical
  );

  if (criticalFailures.length > 0) {
    // Check if this is a new incident (consecutive failures > 1)
    const newIncident = criticalFailures.some((r) => {
      const entry = status.get(r.url);
      return entry && entry.consecutiveFailures === 2; // Alert on second failure
    });

    if (newIncident) {
      await sendAlert('Critical endpoints are DOWN', criticalFailures);
    }
  }

  // Check for degraded performance
  const degraded = results.filter((r) => r.status === 'degraded');
  if (degraded.length > 0) {
    const entry = status.get(degraded[0].url);
    if (entry && entry.consecutiveFailures === 3) {
      // Alert after 3 consecutive degraded checks
      await sendAlert('Endpoints experiencing degraded performance', degraded);
    }
  }

  // Log results
  if (VERBOSE || !DAEMON_MODE) {
    console.log(`\n[${new Date().toISOString()}] Uptime Check Results:`);
    console.log('─'.repeat(60));

    for (const result of results) {
      const icon =
        result.status === 'up'
          ? '✅'
          : result.status === 'degraded'
          ? '⚠️'
          : '❌';
      const time = `${result.responseTime}ms`.padStart(6);
      console.log(`${icon} ${result.name.padEnd(20)} ${time} ${result.error || ''}`);
    }
  }
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  console.log('🔍 MuscleMap Uptime Monitor');
  console.log('═'.repeat(40));
  console.log(`Mode: ${DAEMON_MODE ? 'Daemon' : 'Single check'}`);
  console.log(`Endpoints: ${ENDPOINTS.length}`);
  console.log(`Interval: ${CHECK_INTERVAL}ms`);
  console.log(`Slack alerts: ${SLACK_WEBHOOK ? 'Enabled' : 'Disabled'}`);
  console.log('');

  loadStatus();

  if (DAEMON_MODE) {
    console.log('Starting continuous monitoring...\n');

    // Initial check
    await runChecks();

    // Schedule periodic checks
    setInterval(runChecks, CHECK_INTERVAL);

    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\nShutting down uptime monitor...');
      saveStatus();
      process.exit(0);
    });
  } else {
    // Single check
    await runChecks();

    // Exit with error if any critical endpoint is down
    const anyDown = Array.from(status.values()).some(
      (s) =>
        s.status === 'down' &&
        ENDPOINTS.find((e) => e.url === s.url)?.critical
    );

    process.exit(anyDown ? 1 : 0);
  }
}

main().catch((error) => {
  console.error('Uptime monitor error:', error);
  process.exit(1);
});
