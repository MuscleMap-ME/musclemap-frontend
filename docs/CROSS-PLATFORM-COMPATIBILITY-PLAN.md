# MuscleMap Cross-Platform Compatibility Plan

**Goal:** Make MuscleMap work flawlessly across all platforms, browsers, and security configurations including Brave Shields, VPNs, low bandwidth, and intermittent connectivity.

## Executive Summary

Current issues identified:
1. **Google Analytics** - Blocked by Brave Shields, uBlock, etc.
2. **Google Fonts** - Blocked by Brave Shields
3. **Third-party preconnects** - Waste bandwidth when blocked
4. **CORS configuration** - May cause issues with strict security
5. **CSP headers** - Missing from Cloudflare response (API headers only)
6. **Service Worker** - Hardcoded domain references
7. **localStorage** - Blocked in private/incognito mode
8. **No network timeouts** - Hangs on slow connections

---

## Phase 1: Critical Fixes (Brave Shields Compatibility)

### 1.1 Remove/Replace Google Analytics

**Problem:** Google Analytics is blocked by:
- Brave Shields (default)
- uBlock Origin
- Privacy Badger
- Firefox Enhanced Tracking Protection
- Safari Intelligent Tracking Prevention

**Solution:** Replace with privacy-focused analytics or remove entirely.

**Files to modify:**
- `index.html` - Remove GA script and preconnects
- Create `src/lib/analytics.ts` - Lightweight, self-hosted analytics

```typescript
// src/lib/analytics.ts
// Privacy-focused analytics that works with ad blockers
export const analytics = {
  pageView: (path: string) => {
    // Send to our own API endpoint
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/pageview', JSON.stringify({
        path,
        timestamp: Date.now(),
        referrer: document.referrer || null
      }));
    }
  },
  event: (name: string, data?: Record<string, any>) => {
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, data, timestamp: Date.now() }),
      keepalive: true
    }).catch(() => {}); // Silent fail
  }
};
```

### 1.2 Self-Host Google Fonts

**Problem:** Google Fonts blocked by Brave Shields.

**Solution:** Download and self-host fonts.

**Steps:**
1. Download fonts from Google Fonts
2. Convert to WOFF2 format
3. Place in `public/fonts/`
4. Update CSS to use local fonts

**Files to create:**
- `public/fonts/inter-regular.woff2`
- `public/fonts/inter-medium.woff2`
- `public/fonts/inter-semibold.woff2`
- `public/fonts/inter-bold.woff2`
- `public/fonts/bebas-neue.woff2`
- `public/fonts/jetbrains-mono-regular.woff2`
- `public/fonts/jetbrains-mono-bold.woff2`

**CSS to add (`src/styles/fonts.css`):**
```css
/* Self-hosted fonts - immune to ad blockers */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/inter-regular.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/inter-medium.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/inter-semibold.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/inter-bold.woff2') format('woff2');
}

@font-face {
  font-family: 'Bebas Neue';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/bebas-neue.woff2') format('woff2');
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/jetbrains-mono-regular.woff2') format('woff2');
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/jetbrains-mono-bold.woff2') format('woff2');
}
```

### 1.3 Remove Blocked Preconnects

**Problem:** Preconnects to blocked domains waste resources.

**Solution:** Remove all third-party preconnects from `index.html`.

**Remove these lines:**
```html
<!-- REMOVE THESE -->
<link rel="preconnect" href="https://www.googletagmanager.com" crossorigin>
<link rel="preconnect" href="https://www.google-analytics.com" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

**Keep only:**
```html
<link rel="preconnect" href="https://api.musclemap.me" crossorigin>
<link rel="dns-prefetch" href="https://api.musclemap.me">
```

---

## Phase 2: Storage Resilience

### 2.1 Fallback Storage System

**Problem:** localStorage blocked in:
- Private/Incognito browsing
- Brave with strict settings
- Firefox with enhanced tracking protection

**Solution:** Multi-tier storage with fallbacks.

**Create `src/lib/storage.ts`:**
```typescript
// Resilient storage that works everywhere
class ResilientStorage {
  private memoryStorage: Map<string, string> = new Map();
  private storageAvailable: boolean | null = null;

  private isLocalStorageAvailable(): boolean {
    if (this.storageAvailable !== null) return this.storageAvailable;

    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      this.storageAvailable = true;
    } catch {
      this.storageAvailable = false;
    }
    return this.storageAvailable;
  }

  getItem(key: string): string | null {
    if (this.isLocalStorageAvailable()) {
      return localStorage.getItem(key);
    }
    return this.memoryStorage.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.isLocalStorageAvailable()) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Quota exceeded or blocked - use memory
        this.memoryStorage.set(key, value);
      }
    } else {
      this.memoryStorage.set(key, value);
    }
  }

  removeItem(key: string): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    }
    this.memoryStorage.delete(key);
  }

  clear(): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.clear();
    }
    this.memoryStorage.clear();
  }
}

export const storage = new ResilientStorage();
```

### 2.2 Update Auth Store to Use Resilient Storage

**File:** `src/store/authStore.ts`

Update to use the resilient storage wrapper instead of direct localStorage access.

### 2.3 Update Apollo Client

**File:** `src/graphql/client.ts`

```typescript
// Replace direct localStorage access
import { storage } from '../lib/storage';

const authLink = setContext((_, { headers }) => {
  try {
    const authData = storage.getItem('musclemap-auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      const token = parsed?.state?.token;
      if (token) {
        return {
          headers: {
            ...headers,
            authorization: `Bearer ${token}`,
          },
        };
      }
    }
  } catch {
    // Error reading auth token - continue without auth
  }
  return { headers };
});
```

---

## Phase 3: Network Resilience

### 3.1 Add Request Timeouts

**Problem:** No timeout on GraphQL requests - hangs on slow connections.

**Solution:** Add configurable timeouts with AbortController.

**Update `src/graphql/client.ts`:**
```typescript
const DEFAULT_TIMEOUT = 30000; // 30 seconds

const httpLink = new BatchHttpLink({
  uri: '/api/graphql',
  credentials: 'include',
  batchMax: 10,
  batchInterval: 20,
  batchDebounce: true,
  fetch: (uri, options) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    return fetch(uri, {
      ...options,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
  },
});
```

### 3.2 Adaptive Batch Interval

**Problem:** 20ms batch interval too aggressive for slow connections.

**Solution:** Detect connection type and adjust.

```typescript
function getAdaptiveBatchInterval(): number {
  const connection = (navigator as any).connection;
  if (!connection) return 20;

  switch (connection.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 500; // Wait longer to batch more requests
    case '3g':
      return 100;
    case '4g':
    default:
      return 20;
  }
}
```

### 3.3 Connection Status Hook

**Create `src/hooks/useNetworkStatus.ts`:**
```typescript
import { useState, useEffect } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // Round-trip time in ms
  saveData: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    effectiveType: 'unknown',
    downlink: 10,
    rtt: 50,
    saveData: false,
  });

  useEffect(() => {
    const updateStatus = () => {
      const connection = (navigator as any).connection;
      setStatus({
        isOnline: navigator.onLine,
        effectiveType: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || 10,
        rtt: connection?.rtt || 50,
        saveData: connection?.saveData || false,
      });
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateStatus);
    }

    updateStatus();

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      if (connection) {
        connection.removeEventListener('change', updateStatus);
      }
    };
  }, []);

  return status;
}
```

---

## Phase 4: Service Worker Improvements

### 4.1 Fix Hardcoded Domain References

**Problem:** Service worker has hardcoded `api.musclemap.me` that breaks with VPNs/proxies.

**File:** `public/sw.js`

**Replace:**
```javascript
const isApiRequest = (url) => {
  return url.pathname.startsWith('/api/') ||
         url.hostname === 'api.musclemap.me';
};
```

**With:**
```javascript
const isApiRequest = (url) => {
  // Support both same-origin /api/ and explicit API subdomain
  if (url.pathname.startsWith('/api/')) return true;

  // Check if it's our API domain (handles VPN/proxy scenarios)
  const apiDomains = ['api.musclemap.me', 'musclemap.me'];
  return apiDomains.some(domain => url.hostname.endsWith(domain)) &&
         (url.pathname.startsWith('/api/') || url.pathname.startsWith('/graphql'));
};
```

### 4.2 Add Offline Fallback Page

**Create `public/offline.html`:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MuscleMap - Offline</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    .logo {
      width: 80px;
      height: 80px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 12px;
      color: #0066FF;
    }
    p {
      color: #888;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    button {
      background: #0066FF;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #0052cc; }
    .status {
      margin-top: 24px;
      padding: 12px;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="/logo.webp" alt="MuscleMap" class="logo">
    <h1>You're Offline</h1>
    <p>It looks like you've lost your internet connection. Your workout data is saved locally and will sync when you're back online.</p>
    <button onclick="location.reload()">Try Again</button>
    <div class="status" id="status">Checking connection...</div>
  </div>
  <script>
    function updateStatus() {
      const el = document.getElementById('status');
      el.textContent = navigator.onLine ? 'Connection restored! Reloading...' : 'Still offline. Your data is safe.';
      if (navigator.onLine) {
        setTimeout(() => location.reload(), 1000);
      }
    }
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  </script>
</body>
</html>
```

---

## Phase 5: CSP and Security Headers

### 5.1 Add CSP Meta Tag to index.html

**Problem:** Cloudflare may not pass through all API headers.

**Solution:** Add CSP as meta tag for reliability.

**Add to `index.html` `<head>`:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  font-src 'self' data:;
  img-src 'self' data: https: blob:;
  media-src 'self' blob:;
  connect-src 'self' https://api.musclemap.me wss://api.musclemap.me https://musclemap.me;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
  object-src 'none';
  worker-src 'self' blob:;
">
```

---

## Phase 6: Cross-Platform Test Matrix

### 6.1 Browser Compatibility Matrix

| Browser | Platform | Version | Status | Notes |
|---------|----------|---------|--------|-------|
| **Desktop** |
| Chrome | Windows | 120+ | To Test | Standard config |
| Chrome | macOS | 120+ | To Test | Standard config |
| Chrome | Linux | 120+ | To Test | Standard config |
| Firefox | Windows | 120+ | To Test | Enhanced Tracking Protection |
| Firefox | macOS | 120+ | To Test | Enhanced Tracking Protection |
| Firefox | Linux | 120+ | To Test | Enhanced Tracking Protection |
| Safari | macOS | 17+ | To Test | ITP enabled |
| Edge | Windows | 120+ | To Test | Standard config |
| Brave | Windows | Latest | To Test | Shields Up (strict) |
| Brave | macOS | Latest | **CURRENT ISSUE** | Shields Up (strict) |
| Brave | Linux | Latest | To Test | Shields Up (strict) |
| **Mobile** |
| Chrome | Android | Latest | To Test | Data Saver mode |
| Chrome | iOS | Latest | To Test | |
| Safari | iOS | 17+ | To Test | ITP + Private Relay |
| Firefox | Android | Latest | To Test | Enhanced Tracking |
| Samsung Internet | Android | Latest | To Test | Ad blocker enabled |
| Brave | Android | Latest | To Test | Shields Up |
| Brave | iOS | Latest | To Test | Shields Up |

### 6.2 Security Configuration Test Cases

| Configuration | Expected Behavior |
|--------------|-------------------|
| Brave Shields Up (Strict) | Full functionality, no blocked resources |
| uBlock Origin enabled | Full functionality |
| Firefox ETP Strict | Full functionality |
| Safari ITP | Full functionality, auth works |
| VPN (NordVPN) | API requests work |
| VPN (ExpressVPN) | API requests work |
| Tor Browser | Basic functionality (degraded) |
| Private/Incognito | Works with memory storage fallback |
| Corporate proxy | API requests work |

### 6.3 Network Condition Test Cases

| Condition | Expected Behavior |
|-----------|-------------------|
| 4G/5G | Normal operation |
| 3G | Slower loads, batched requests |
| 2G | Minimal UI, cached data |
| Offline | Cached data, queued mutations |
| Intermittent | Graceful reconnection, synced data |
| High latency (500ms+) | Timeouts work, no hangs |
| Packet loss (10%) | Retries work |

---

## Phase 7: Automated Testing

### 7.1 Create Compatibility Test Script

**File:** `scripts/cross-platform-test.ts`

```typescript
#!/usr/bin/env npx tsx
/**
 * Cross-Platform Compatibility Test Suite
 *
 * Tests MuscleMap functionality across different browser configurations
 * and network conditions.
 */

import { chromium, firefox, webkit, BrowserType } from 'playwright';

const BASE_URL = process.env.TEST_URL || 'https://musclemap.me';

interface TestResult {
  browser: string;
  config: string;
  test: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(
  browserType: BrowserType,
  browserName: string,
  config: string,
  launchOptions: any
) {
  const browser = await browserType.launch(launchOptions);
  const context = await browser.newContext({
    // Simulate different scenarios
    ...(config === 'offline' && { offline: true }),
    ...(config === 'slow-3g' && {
      // Simulate 3G network
    }),
  });

  const page = await context.newPage();

  // Test 1: Page loads without errors
  const startTime = Date.now();
  try {
    const response = await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    results.push({
      browser: browserName,
      config,
      test: 'Page Load',
      passed: response?.status() === 200,
      duration: Date.now() - startTime,
    });
  } catch (error: any) {
    results.push({
      browser: browserName,
      config,
      test: 'Page Load',
      passed: false,
      error: error.message,
      duration: Date.now() - startTime,
    });
  }

  // Test 2: No console errors from blocked resources
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.waitForTimeout(2000);

  results.push({
    browser: browserName,
    config,
    test: 'No Console Errors',
    passed: errors.length === 0,
    error: errors.join('; '),
    duration: 0,
  });

  // Test 3: Fonts render correctly
  const fontLoaded = await page.evaluate(() => {
    return document.fonts.check('16px Inter');
  });

  results.push({
    browser: browserName,
    config,
    test: 'Fonts Loaded',
    passed: fontLoaded,
    duration: 0,
  });

  // Test 4: API connectivity
  const apiWorks = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/health');
      return res.ok;
    } catch {
      return false;
    }
  });

  results.push({
    browser: browserName,
    config,
    test: 'API Health',
    passed: apiWorks,
    duration: 0,
  });

  // Test 5: Archetypes page loads
  try {
    await page.goto(`${BASE_URL}/archetypes`, { waitUntil: 'networkidle' });
    const archetypesVisible = await page.locator('[data-testid="archetype-card"]').first().isVisible();
    results.push({
      browser: browserName,
      config,
      test: 'Archetypes Load',
      passed: archetypesVisible,
      duration: 0,
    });
  } catch (error: any) {
    results.push({
      browser: browserName,
      config,
      test: 'Archetypes Load',
      passed: false,
      error: error.message,
      duration: 0,
    });
  }

  await browser.close();
}

async function main() {
  console.log('Running Cross-Platform Compatibility Tests...\n');

  // Test across browsers
  const browsers = [
    { type: chromium, name: 'Chromium' },
    { type: firefox, name: 'Firefox' },
    { type: webkit, name: 'WebKit (Safari)' },
  ];

  const configs = [
    { name: 'Standard', options: {} },
    { name: 'No JavaScript', options: { javaScriptEnabled: false } },
  ];

  for (const browser of browsers) {
    for (const config of configs) {
      console.log(`Testing ${browser.name} - ${config.name}...`);
      await runTest(browser.type, browser.name, config.name, config.options);
    }
  }

  // Print results
  console.log('\n=== TEST RESULTS ===\n');

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} [${result.browser}/${result.config}] ${result.test}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.passed) passed++;
    else failed++;
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
```

### 7.2 Add to Package.json

```json
{
  "scripts": {
    "test:compatibility": "playwright test scripts/cross-platform-test.ts",
    "test:brave": "npx playwright test --browser=chromium --headed scripts/brave-shields-test.ts"
  }
}
```

---

## Phase 8: Implementation Checklist

### Immediate (Today)

- [ ] Remove Google Analytics from `index.html`
- [ ] Remove third-party preconnects
- [ ] Download and self-host fonts
- [ ] Create `src/lib/storage.ts` resilient storage
- [ ] Update Apollo client with timeouts
- [ ] Create `public/offline.html`
- [ ] Add CSP meta tag to `index.html`

### Short-term (This Week)

- [ ] Update auth store to use resilient storage
- [ ] Fix Service Worker hardcoded domains
- [ ] Add network status hook
- [ ] Create adaptive batch interval
- [ ] Write compatibility test script

### Medium-term (This Month)

- [ ] Implement self-hosted analytics
- [ ] Add Playwright cross-browser tests
- [ ] Test on all platforms in matrix
- [ ] Document browser-specific workarounds
- [ ] Create automated CI/CD browser testing

---

## Phase 9: Monitoring & Alerting

### 9.1 Error Tracking for Blocked Resources

Add to `src/main.tsx`:
```typescript
// Track blocked resource errors
window.addEventListener('error', (event) => {
  if (event.message?.includes('blocked') ||
      event.message?.includes('CORS') ||
      event.message?.includes('network')) {
    // Log to our analytics (not GA)
    fetch('/api/analytics/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'resource_blocked',
        message: event.message,
        url: event.filename,
        userAgent: navigator.userAgent,
      }),
      keepalive: true,
    }).catch(() => {});
  }
}, true);
```

### 9.2 Performance Monitoring

Add Real User Monitoring (RUM) that works without third-party scripts:

```typescript
// src/lib/rum.ts
export function reportWebVitals() {
  if ('PerformanceObserver' in window) {
    // LCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      fetch('/api/analytics/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric: 'LCP', value: lastEntry.startTime }),
        keepalive: true,
      }).catch(() => {});
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // FID
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        fetch('/api/analytics/vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metric: 'FID', value: entry.processingStart - entry.startTime }),
          keepalive: true,
        }).catch(() => {});
      });
    }).observe({ entryTypes: ['first-input'] });
  }
}
```

---

## Success Criteria

After implementing this plan:

1. **Brave Shields Up**: App loads fully, all features work
2. **uBlock Origin**: App loads fully, all features work
3. **Private/Incognito**: App works with session storage
4. **Offline**: Cached pages load, mutations queue
5. **Slow 3G**: App loads within 10 seconds
6. **High latency**: No UI freezes, timeouts work
7. **VPN**: All API calls succeed
8. **All browsers**: Chrome, Firefox, Safari, Edge, Brave

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-16 | 1.0 | Initial plan created |
