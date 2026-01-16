#!/usr/bin/env npx tsx
/**
 * MuscleMap Frontend Health Check
 *
 * This script checks for blank pages, JavaScript errors, and frontend issues
 * by fetching pages and analyzing the HTML response.
 *
 * Usage:
 *   npx tsx scripts/frontend-health-check.ts [--base-url URL] [--verbose]
 *
 * Options:
 *   --base-url URL   Site URL (default: https://musclemap.me)
 *   --verbose        Show detailed logs
 *   --production     Use production URL (https://musclemap.me)
 *   --local          Use local URL (http://localhost:5173)
 */

// ============================================
// CONFIGURATION
// ============================================

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const USE_LOCAL = args.includes('--local');

const BASE_URL =
  args.find((a) => a.startsWith('--base-url='))?.split('=')[1] ||
  (USE_LOCAL ? 'http://localhost:5173' : 'https://musclemap.me');

// ============================================
// TYPES
// ============================================

interface TestResult {
  name: string;
  url: string;
  passed: boolean;
  duration: number;
  error?: string;
  warnings?: string[];
  details?: {
    status?: number;
    contentLength?: number;
    hasReactRoot?: boolean;
    hasContent?: boolean;
    hasJsErrors?: boolean;
    jsErrorIndicators?: string[];
    missingAssets?: string[];
  };
}

interface FrontendCheckResult {
  passed: boolean;
  message: string;
  details?: unknown;
}

// ============================================
// UTILITIES
// ============================================

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
}

function logResult(result: TestResult) {
  const icon = result.passed ? `${colors.green}✓` : `${colors.red}✗`;
  const duration = `${colors.dim}(${result.duration}ms)${colors.reset}`;
  const errorMsg = result.error ? ` - ${colors.red}${result.error}${colors.reset}` : '';
  console.log(`  ${icon} ${result.name} ${duration}${errorMsg}${colors.reset}`);

  if (result.warnings && result.warnings.length > 0) {
    result.warnings.forEach(w => {
      console.log(`    ${colors.yellow}⚠ ${w}${colors.reset}`);
    });
  }
}

// ============================================
// FRONTEND CHECKS
// ============================================

/**
 * Check if HTML contains a proper React app root
 */
function checkReactRoot(html: string): FrontendCheckResult {
  // Check for root div that React mounts to
  const hasRootDiv = html.includes('id="root"') || html.includes("id='root'");

  // Check if root has content (not blank)
  const rootMatch = html.match(/<div[^>]*id=["']root["'][^>]*>([\s\S]*?)<\/div>/);
  const rootHasContent = rootMatch ? rootMatch[1].trim().length > 0 : false;

  // For SSR, root should have content; for CSR, it should be empty but JS should hydrate it
  // We'll check for either content in root OR presence of JS bundle
  const hasJsBundle = html.includes('.js"') || html.includes(".js'");

  if (!hasRootDiv) {
    return {
      passed: false,
      message: 'Missing React root element (id="root")',
    };
  }

  if (!hasJsBundle && !rootHasContent) {
    return {
      passed: false,
      message: 'No JavaScript bundle found and root element is empty - likely blank page',
    };
  }

  return {
    passed: true,
    message: 'React root present',
    details: { rootHasContent, hasJsBundle },
  };
}

/**
 * Check for JavaScript error indicators in the HTML
 */
function checkForJsErrors(html: string): FrontendCheckResult {
  const errorIndicators: string[] = [];

  // Common error messages that might appear in HTML
  const patterns = [
    /ChunkLoadError/i,
    /Loading chunk \d+ failed/i,
    /Failed to load resource/i,
    /SyntaxError/i,
    /ReferenceError/i,
    /TypeError: Cannot read propert/i,
    /Uncaught Error/i,
    /Module not found/i,
    /Cannot find module/i,
    /SCRIPT_ERROR/i,
    /__REACT_DEVTOOLS_GLOBAL_HOOK__.*error/i,
    /window\.onerror/i,
  ];

  patterns.forEach(pattern => {
    if (pattern.test(html)) {
      errorIndicators.push(pattern.source);
    }
  });

  // Check for error boundary fallback UI
  if (html.includes('Something went wrong') || html.includes('error-boundary')) {
    errorIndicators.push('Error boundary fallback detected');
  }

  // Check for blank body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const bodyContent = bodyMatch[1].replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').trim();
    // If body is essentially empty except for root div
    if (bodyContent.replace(/<div[^>]*id=["']root["'][^>]*>\s*<\/div>/i, '').trim().length < 50) {
      // This is expected for CSR apps, so don't flag it
    }
  }

  if (errorIndicators.length > 0) {
    return {
      passed: false,
      message: `Found ${errorIndicators.length} JavaScript error indicator(s)`,
      details: errorIndicators,
    };
  }

  return {
    passed: true,
    message: 'No JavaScript errors detected in HTML',
  };
}

/**
 * Check for missing critical assets
 */
function checkAssets(html: string): FrontendCheckResult {
  const missingAssets: string[] = [];

  // Check for critical CSS
  const hasCss = html.includes('.css"') || html.includes(".css'") || html.includes('<style');
  if (!hasCss) {
    missingAssets.push('No CSS files or styles found');
  }

  // Check for JavaScript bundles
  const hasJs = html.includes('.js"') || html.includes(".js'");
  if (!hasJs) {
    missingAssets.push('No JavaScript bundles found');
  }

  // Check for module scripts (Vite uses type="module")
  const hasModuleScript = html.includes('type="module"');
  if (!hasModuleScript && !hasJs) {
    missingAssets.push('No module scripts found');
  }

  // Check for favicon
  const hasFavicon = html.includes('favicon') || html.includes('icon');
  if (!hasFavicon) {
    missingAssets.push('No favicon found (minor)');
  }

  if (missingAssets.length > 1 || (missingAssets.length === 1 && !missingAssets[0].includes('minor'))) {
    return {
      passed: false,
      message: `Missing critical assets: ${missingAssets.join(', ')}`,
      details: missingAssets,
    };
  }

  return {
    passed: true,
    message: 'All critical assets present',
    details: missingAssets.length > 0 ? missingAssets : undefined,
  };
}

/**
 * Check meta tags for proper SEO/hydration
 */
function checkMetaTags(html: string): FrontendCheckResult {
  const issues: string[] = [];

  // Check for viewport meta tag (mobile responsiveness)
  if (!html.includes('viewport')) {
    issues.push('Missing viewport meta tag');
  }

  // Check for charset
  if (!html.includes('charset') && !html.includes('UTF-8')) {
    issues.push('Missing charset declaration');
  }

  // Check for title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch || titleMatch[1].trim().length === 0) {
    issues.push('Missing or empty page title');
  }

  if (issues.length > 0) {
    return {
      passed: false,
      message: `Meta tag issues: ${issues.join(', ')}`,
      details: issues,
    };
  }

  return {
    passed: true,
    message: 'Meta tags properly configured',
  };
}

/**
 * Check for blank page indicators
 */
function checkForBlankPage(html: string, status: number): FrontendCheckResult {
  // Check status code
  if (status >= 400) {
    return {
      passed: false,
      message: `HTTP error status: ${status}`,
    };
  }

  // Check content length
  if (html.length < 500) {
    return {
      passed: false,
      message: `Suspiciously short HTML (${html.length} chars) - likely blank or error page`,
    };
  }

  // Check for completely empty body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    // Remove scripts and check remaining content
    const bodyContent = bodyMatch[1]
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
      .trim();

    // Check if there's a root div at minimum
    if (!bodyContent.includes('id="root"') && !bodyContent.includes("id='root'") && bodyContent.length < 100) {
      return {
        passed: false,
        message: 'Body appears empty - no root element or content',
      };
    }
  }

  // Check for common "blank" error states
  const blankIndicators = [
    /^\s*<!DOCTYPE html>\s*<html[^>]*>\s*<head[^>]*>\s*<\/head>\s*<body[^>]*>\s*<\/body>\s*<\/html>\s*$/i,
    /Loading\.\.\./i,
    /Page not found/i,
    /404/i,
    /500 Internal Server Error/i,
  ];

  for (const indicator of blankIndicators) {
    if (indicator.test(html)) {
      // Special case for "Loading..." - this might be intentional for lazy loading
      if (indicator.source.includes('Loading')) {
        return {
          passed: true,
          message: 'Page shows loading state (may be normal for CSR)',
        };
      }
      return {
        passed: false,
        message: `Blank page indicator found: ${indicator.source}`,
      };
    }
  }

  return {
    passed: true,
    message: 'Page has content',
  };
}

// ============================================
// TEST RUNNER
// ============================================

const results: TestResult[] = [];

async function testPage(name: string, path: string): Promise<TestResult> {
  const url = `${BASE_URL}${path}`;
  const start = Date.now();
  const warnings: string[] = [];

  try {
    if (VERBOSE) {
      log(`  Testing: ${url}`, 'dim');
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MuscleMap-HealthCheck/1.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    const html = await response.text();
    const duration = Date.now() - start;

    // Run all checks
    const blankCheck = checkForBlankPage(html, response.status);
    const rootCheck = checkReactRoot(html);
    const jsErrorCheck = checkForJsErrors(html);
    const assetCheck = checkAssets(html);
    const metaCheck = checkMetaTags(html);

    // Collect warnings
    if (!metaCheck.passed) {
      warnings.push(metaCheck.message);
    }
    if (assetCheck.details && Array.isArray(assetCheck.details)) {
      assetCheck.details.forEach(d => {
        if (String(d).includes('minor')) {
          warnings.push(String(d));
        }
      });
    }

    // Determine overall pass/fail
    const criticalChecks = [blankCheck, rootCheck, jsErrorCheck, assetCheck];
    const failures = criticalChecks.filter(c => !c.passed);

    if (failures.length > 0) {
      return {
        name,
        url,
        passed: false,
        duration,
        error: failures.map(f => f.message).join('; '),
        warnings,
        details: {
          status: response.status,
          contentLength: html.length,
          hasReactRoot: rootCheck.passed,
          hasContent: blankCheck.passed,
          hasJsErrors: !jsErrorCheck.passed,
          jsErrorIndicators: jsErrorCheck.details as string[] | undefined,
          missingAssets: assetCheck.details as string[] | undefined,
        },
      };
    }

    return {
      name,
      url,
      passed: true,
      duration,
      warnings: warnings.length > 0 ? warnings : undefined,
      details: {
        status: response.status,
        contentLength: html.length,
        hasReactRoot: true,
        hasContent: true,
        hasJsErrors: false,
      },
    };
  } catch (error) {
    return {
      name,
      url,
      passed: false,
      duration: Date.now() - start,
      error: `Fetch failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================
// ASSET VERIFICATION
// ============================================

async function verifyAsset(url: string): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

async function testCriticalAssets(): Promise<TestResult[]> {
  const assetResults: TestResult[] = [];

  // First, fetch the main page to extract asset URLs
  const mainPageResponse = await fetch(BASE_URL);
  const html = await mainPageResponse.text();

  // Extract JS bundle URLs
  const jsMatches = html.matchAll(/src=["']([^"']*\.js)["']/gi);
  const jsUrls = Array.from(jsMatches).map(m => m[1]);

  // Extract CSS URLs
  const cssMatches = html.matchAll(/href=["']([^"']*\.css)["']/gi);
  const cssUrls = Array.from(cssMatches).map(m => m[1]);

  // Test a sample of critical assets
  const criticalAssets = [
    ...jsUrls.slice(0, 3).map(url => ({ name: `JS Bundle: ${url.split('/').pop()}`, url })),
    ...cssUrls.slice(0, 2).map(url => ({ name: `CSS: ${url.split('/').pop()}`, url })),
  ];

  for (const asset of criticalAssets) {
    const fullUrl = asset.url.startsWith('http') ? asset.url : `${BASE_URL}${asset.url}`;
    const start = Date.now();
    const result = await verifyAsset(fullUrl);

    assetResults.push({
      name: asset.name,
      url: fullUrl,
      passed: result.ok,
      duration: Date.now() - start,
      error: result.ok ? undefined : `HTTP ${result.status}${result.error ? `: ${result.error}` : ''}`,
    });
  }

  return assetResults;
}

// ============================================
// API HEALTH CHECK
// ============================================

async function testApiHealth(): Promise<TestResult> {
  const url = `${BASE_URL}/health`;
  const start = Date.now();

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return {
        name: 'API Health Check',
        url,
        passed: false,
        duration: Date.now() - start,
        error: `HTTP ${response.status}`,
      };
    }

    // Check if API reports healthy status
    if (data.status !== 'healthy' && data.status !== 'ok') {
      return {
        name: 'API Health Check',
        url,
        passed: false,
        duration: Date.now() - start,
        error: `API reports unhealthy: ${JSON.stringify(data)}`,
      };
    }

    return {
      name: 'API Health Check',
      url,
      passed: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'API Health Check',
      url,
      passed: false,
      duration: Date.now() - start,
      error: `Fetch failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  const startTime = Date.now();

  log(`\n${colors.bold}MuscleMap Frontend Health Check${colors.reset}`);
  log(`${'─'.repeat(50)}`);
  log(`Target: ${BASE_URL}`);
  log(`Time: ${new Date().toISOString()}`);

  // Test API health first
  logSection('API HEALTH');
  const apiResult = await testApiHealth();
  results.push(apiResult);
  logResult(apiResult);

  // Test critical pages
  logSection('PAGE TESTS');

  const pagesToTest = [
    { name: 'Homepage', path: '/' },
    { name: 'Login Page', path: '/login' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Profile', path: '/profile' },
    { name: 'Workout', path: '/workout' },
    { name: 'Stats', path: '/stats' },
    { name: 'Settings', path: '/settings' },
    { name: 'Journey', path: '/journey' },
    { name: 'Achievements', path: '/achievements' },
    { name: 'Recovery', path: '/recovery' },
  ];

  for (const page of pagesToTest) {
    const result = await testPage(page.name, page.path);
    results.push(result);
    logResult(result);
  }

  // Test critical assets
  logSection('ASSET VERIFICATION');
  const assetResults = await testCriticalAssets();
  for (const result of assetResults) {
    results.push(result);
    logResult(result);
  }

  // Summary
  const duration = Date.now() - startTime;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`\n${colors.bold}${'═'.repeat(50)}${colors.reset}`);
  console.log(`${colors.bold}  FRONTEND HEALTH SUMMARY${colors.reset}`);
  console.log(`${colors.bold}${'═'.repeat(50)}${colors.reset}`);
  console.log(`  Total Checks:  ${total}`);
  console.log(`  ${colors.green}Passed:        ${passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed:        ${failed}${colors.reset}`);
  console.log(`  Duration:      ${(duration / 1000).toFixed(2)}s`);
  console.log(`${colors.bold}${'═'.repeat(50)}${colors.reset}`);

  if (failed > 0) {
    console.log(`\n${colors.red}${colors.bold}  FAILED CHECKS:${colors.reset}`);
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ${colors.red}✗ ${r.name} (${r.url})${colors.reset}`);
        console.log(`    ${colors.dim}Error: ${r.error}${colors.reset}`);
        if (r.details) {
          console.log(`    ${colors.dim}Details: ${JSON.stringify(r.details, null, 2)}${colors.reset}`);
        }
      });
    console.log();
  }

  // Warnings summary
  const withWarnings = results.filter(r => r.warnings && r.warnings.length > 0);
  if (withWarnings.length > 0) {
    console.log(`\n${colors.yellow}${colors.bold}  WARNINGS:${colors.reset}`);
    withWarnings.forEach((r) => {
      console.log(`  ${colors.yellow}⚠ ${r.name}${colors.reset}`);
      r.warnings?.forEach(w => {
        console.log(`    ${colors.dim}${w}${colors.reset}`);
      });
    });
    console.log();
  }

  const successRate = ((passed / total) * 100).toFixed(1);
  if (failed === 0) {
    console.log(`\n${colors.green}${colors.bold}  ✅ ALL FRONTEND CHECKS PASSED! (${successRate}%)${colors.reset}\n`);
  } else {
    console.log(`\n${colors.red}${colors.bold}  ⚠️  ${failed} CHECK(S) FAILED (${successRate}% pass rate)${colors.reset}\n`);
    console.log(`${colors.yellow}  Common causes of blank pages:${colors.reset}`);
    console.log(`    - JavaScript bundle failed to load (check network tab)`);
    console.log(`    - Runtime error in React app (check console)`);
    console.log(`    - Missing environment variables`);
    console.log(`    - CORS issues with API requests`);
    console.log(`    - Service worker caching stale assets`);
    console.log();
  }

  // Output JSON for CI integration
  if (args.includes('--json')) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      duration,
      total,
      passed,
      failed,
      successRate: parseFloat(successRate),
      results,
    }, null, 2));
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
