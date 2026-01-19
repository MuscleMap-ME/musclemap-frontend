#!/usr/bin/env npx tsx
/**
 * Post-Deploy Validation Suite
 *
 * Comprehensive validation that runs automatically after every production deployment.
 * Checks API health, page rendering, critical user journeys, and performance.
 *
 * Usage:
 *   npx tsx scripts/deployment/post-deploy-validation.ts [options]
 *
 * Options:
 *   --base-url URL     Target URL (default: https://musclemap.me)
 *   --timeout MS       Request timeout in ms (default: 10000)
 *   --verbose          Show detailed output
 *   --json             Output JSON results
 *   --fail-fast        Stop on first critical failure
 */

import { performance } from 'perf_hooks';

// ============================================
// CONFIGURATION
// ============================================

const args = process.argv.slice(2);

function getArg(name: string, defaultValue: string): string {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
}

const BASE_URL = getArg('base-url', 'https://musclemap.me');
const TIMEOUT = parseInt(getArg('timeout', '10000'));
const VERBOSE = args.includes('--verbose');
const JSON_OUTPUT = args.includes('--json');
const FAIL_FAST = args.includes('--fail-fast');

// ============================================
// TYPES
// ============================================

interface ValidationResult {
  name: string;
  category: string;
  passed: boolean;
  duration: number;
  critical: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

interface ValidationSummary {
  timestamp: string;
  baseUrl: string;
  totalDuration: number;
  results: ValidationResult[];
  passed: number;
  failed: number;
  criticalFailed: number;
  overallStatus: 'SUCCESS' | 'WARNING' | 'FAILURE';
}

// ============================================
// UTILITIES
// ============================================

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  if (!JSON_OUTPUT) {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

const results: ValidationResult[] = [];

async function validate(
  name: string,
  category: string,
  critical: boolean,
  fn: () => Promise<{ passed: boolean; error?: string; details?: Record<string, unknown> }>
): Promise<ValidationResult> {
  const start = performance.now();

  try {
    const { passed, error, details } = await fn();
    const result: ValidationResult = {
      name,
      category,
      passed,
      duration: Math.round(performance.now() - start),
      critical,
      error,
      details,
    };
    results.push(result);

    // Log result
    const icon = passed ? '✅' : critical ? '❌' : '⚠️';
    const colorKey = passed ? 'green' : critical ? 'red' : 'yellow';
    log(`  ${icon} ${name} (${result.duration}ms)`, colorKey as keyof typeof colors);

    if (!passed && error && VERBOSE) {
      log(`     └─ ${error}`, 'dim');
    }

    if (FAIL_FAST && !passed && critical) {
      throw new Error(`Critical validation failed: ${name}`);
    }

    return result;
  } catch (e) {
    const result: ValidationResult = {
      name,
      category,
      passed: false,
      duration: Math.round(performance.now() - start),
      critical,
      error: e instanceof Error ? e.message : String(e),
    };
    results.push(result);

    log(`  ❌ ${name} (${result.duration}ms)`, 'red');
    if (VERBOSE) {
      log(`     └─ ${result.error}`, 'dim');
    }

    if (FAIL_FAST && critical) {
      throw e;
    }

    return result;
  }
}

// ============================================
// API HEALTH CHECKS
// ============================================

async function validateApiHealth() {
  return validate('API Health Endpoint', 'api', true, async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/health`);
    const data = await res.json();

    const dbOk =
      data.database === 'connected' ||
      data.database === true ||
      data.status === 'healthy';
    const redisOk =
      data.redis === 'connected' ||
      data.redis === true ||
      data.redis === undefined;

    return {
      passed: res.ok && dbOk,
      error: !res.ok
        ? `HTTP ${res.status}`
        : !dbOk
        ? 'Database unhealthy'
        : !redisOk
        ? 'Redis unhealthy'
        : undefined,
      details: { status: res.status, data },
    };
  });
}

async function validateGraphQL() {
  return validate('GraphQL Introspection', 'api', true, async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '{ __schema { types { name } } }',
      }),
    });
    const data = await res.json();

    const hasTypes = data.data?.__schema?.types?.length > 0;

    return {
      passed: res.ok && hasTypes && !data.errors,
      error: data.errors?.[0]?.message || (!hasTypes ? 'No types returned' : undefined),
      details: { typeCount: data.data?.__schema?.types?.length },
    };
  });
}

async function validateGraphQLQuery() {
  return validate('GraphQL Query Execution', 'api', true, async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '{ exercises(limit: 1) { id name } }',
      }),
    });
    const data = await res.json();

    return {
      passed: res.ok && !data.errors && data.data?.exercises !== undefined,
      error: data.errors?.[0]?.message,
      details: { hasData: !!data.data?.exercises },
    };
  });
}

// ============================================
// PAGE RENDERING CHECKS
// ============================================

async function validatePage(name: string, path: string, critical: boolean) {
  return validate(`Page: ${name}`, 'frontend', critical, async () => {
    const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
      headers: {
        'User-Agent': 'MuscleMap-Validation/1.0',
        Accept: 'text/html',
      },
    });
    const html = await res.text();

    const hasRoot = html.includes('id="root"');
    const hasJs = html.includes('.js');
    const hasContent = html.length > 1000;
    const hasError =
      html.includes('ChunkLoadError') ||
      html.includes('Something went wrong') ||
      html.includes('500 Internal Server Error');

    return {
      passed: res.ok && hasRoot && hasJs && hasContent && !hasError,
      error: !res.ok
        ? `HTTP ${res.status}`
        : !hasRoot
        ? 'Missing React root'
        : !hasJs
        ? 'Missing JS bundle'
        : !hasContent
        ? 'Page too short'
        : hasError
        ? 'Error detected in HTML'
        : undefined,
      details: {
        status: res.status,
        contentLength: html.length,
        hasRoot,
        hasJs,
      },
    };
  });
}

// ============================================
// ASSET CHECKS
// ============================================

async function validateAssets() {
  return validate('Static Assets', 'frontend', true, async () => {
    // Fetch homepage to get asset URLs
    const res = await fetchWithTimeout(`${BASE_URL}/`);
    const html = await res.text();

    // Extract JS bundle URLs
    const jsMatches = [...html.matchAll(/src=["']([^"']*\.js)["']/gi)];
    const jsUrls = jsMatches.map((m) => m[1]).slice(0, 3);

    // Extract CSS URLs
    const cssMatches = [...html.matchAll(/href=["']([^"']*\.css)["']/gi)];
    const cssUrls = cssMatches.map((m) => m[1]).slice(0, 2);

    const assetUrls = [...jsUrls, ...cssUrls];
    const failedAssets: string[] = [];

    for (const url of assetUrls) {
      const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
      try {
        const assetRes = await fetchWithTimeout(fullUrl, { method: 'HEAD' });
        if (!assetRes.ok) {
          failedAssets.push(url);
        }
      } catch {
        failedAssets.push(url);
      }
    }

    return {
      passed: failedAssets.length === 0,
      error:
        failedAssets.length > 0
          ? `Failed to load: ${failedAssets.join(', ')}`
          : undefined,
      details: {
        totalAssets: assetUrls.length,
        failedAssets,
      },
    };
  });
}

// ============================================
// PERFORMANCE CHECKS
// ============================================

async function validatePerformance() {
  return validate('Response Time', 'performance', false, async () => {
    // Measure API response time
    const apiStart = performance.now();
    await fetchWithTimeout(`${BASE_URL}/health`);
    const apiTime = Math.round(performance.now() - apiStart);

    // Measure page load time
    const pageStart = performance.now();
    await fetchWithTimeout(`${BASE_URL}/`);
    const pageTime = Math.round(performance.now() - pageStart);

    const apiOk = apiTime < 500;
    const pageOk = pageTime < 2000;

    return {
      passed: apiOk && pageOk,
      error: !apiOk
        ? `API too slow: ${apiTime}ms > 500ms`
        : !pageOk
        ? `Page too slow: ${pageTime}ms > 2000ms`
        : undefined,
      details: {
        apiResponseTime: apiTime,
        pageLoadTime: pageTime,
        thresholds: { api: 500, page: 2000 },
      },
    };
  });
}

// ============================================
// USER JOURNEY CHECKS
// ============================================

async function validateUserJourney() {
  return validate('Critical User Journey', 'journey', true, async () => {
    // Test: Anonymous user can view exercises
    const exercisesRes = await fetchWithTimeout(`${BASE_URL}/api/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '{ exercises(limit: 5) { id name muscleGroups } }',
      }),
    });
    const exercisesData = await exercisesRes.json();

    if (!exercisesData.data?.exercises?.length) {
      return { passed: false, error: 'Cannot fetch exercises' };
    }

    // Test: Can access login page
    const loginRes = await fetchWithTimeout(`${BASE_URL}/login`);
    if (!loginRes.ok) {
      return { passed: false, error: 'Cannot access login page' };
    }

    // Test: Can access public profile page
    const profileRes = await fetchWithTimeout(`${BASE_URL}/profile`);
    if (!profileRes.ok && profileRes.status !== 401) {
      return { passed: false, error: 'Profile page error' };
    }

    return {
      passed: true,
      details: {
        exercisesCount: exercisesData.data.exercises.length,
        loginAccessible: loginRes.ok,
      },
    };
  });
}

// ============================================
// SECURITY CHECKS
// ============================================

async function validateSecurityHeaders() {
  return validate('Security Headers', 'security', false, async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/`);

    const headers = {
      'strict-transport-security': res.headers.get('strict-transport-security'),
      'x-content-type-options': res.headers.get('x-content-type-options'),
      'x-frame-options': res.headers.get('x-frame-options'),
    };

    const hasHSTS = !!headers['strict-transport-security'];
    const hasNoSniff = headers['x-content-type-options'] === 'nosniff';
    const hasFrameOptions = !!headers['x-frame-options'];

    const issues: string[] = [];
    if (!hasHSTS) issues.push('Missing HSTS');
    if (!hasNoSniff) issues.push('Missing X-Content-Type-Options');
    if (!hasFrameOptions) issues.push('Missing X-Frame-Options');

    return {
      passed: issues.length === 0,
      error: issues.length > 0 ? issues.join(', ') : undefined,
      details: headers,
    };
  });
}

// ============================================
// MAIN
// ============================================

async function main() {
  const startTime = performance.now();

  if (!JSON_OUTPUT) {
    log('\n🔍 Post-Deploy Validation Suite', 'bold');
    log('═'.repeat(60));
    log(`Target: ${BASE_URL}`);
    log(`Timeout: ${TIMEOUT}ms`);
    log(`Time: ${new Date().toISOString()}\n`);
  }

  try {
    // API Health Checks
    log('📡 API Health', 'blue');
    await validateApiHealth();
    await validateGraphQL();
    await validateGraphQLQuery();

    // Frontend Checks
    log('\n🖥️  Frontend Pages', 'blue');
    await validatePage('Homepage', '/', true);
    await validatePage('Login', '/login', true);
    await validatePage('Dashboard', '/dashboard', false);
    await validatePage('Profile', '/profile', false);
    await validatePage('Workout', '/workout', false);
    await validatePage('Journey', '/journey', false);
    await validatePage('Achievements', '/achievements', false);
    await validatePage('Settings', '/settings', false);

    // Asset Checks
    log('\n📦 Assets', 'blue');
    await validateAssets();

    // Performance Checks
    log('\n⚡ Performance', 'blue');
    await validatePerformance();

    // User Journey Checks
    log('\n🚶 User Journeys', 'blue');
    await validateUserJourney();

    // Security Checks
    log('\n🔒 Security', 'blue');
    await validateSecurityHeaders();
  } catch (e) {
    if (FAIL_FAST) {
      log(`\n❌ Validation stopped: ${e}`, 'red');
    }
  }

  // Calculate summary
  const totalDuration = Math.round(performance.now() - startTime);
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const criticalFailed = results.filter((r) => !r.passed && r.critical).length;

  const overallStatus: 'SUCCESS' | 'WARNING' | 'FAILURE' =
    criticalFailed > 0 ? 'FAILURE' : failed > 0 ? 'WARNING' : 'SUCCESS';

  const summary: ValidationSummary = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    totalDuration,
    results,
    passed,
    failed,
    criticalFailed,
    overallStatus,
  };

  // Output results
  if (JSON_OUTPUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    log('\n' + '═'.repeat(60));
    log('📊 SUMMARY', 'bold');
    log(`   Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    log(`   Duration: ${(totalDuration / 1000).toFixed(2)}s`);

    if (criticalFailed > 0) {
      log(
        `\n🚨 ${criticalFailed} CRITICAL FAILURE(S) - ROLLBACK RECOMMENDED`,
        'red'
      );

      log('\nFailed critical checks:', 'red');
      results
        .filter((r) => !r.passed && r.critical)
        .forEach((r) => {
          log(`  ❌ ${r.name}: ${r.error}`, 'red');
        });
    } else if (failed > 0) {
      log(`\n⚠️  ${failed} non-critical failure(s) - monitor closely`, 'yellow');
    } else {
      log('\n✅ ALL VALIDATIONS PASSED', 'green');
    }

    log('');
  }

  // Exit code
  process.exit(criticalFailed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Validation error:', error);
  process.exit(1);
});
