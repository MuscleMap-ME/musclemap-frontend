/**
 * Browser Utilities
 * Playwright browser automation helpers
 */

import { chromium, Browser, BrowserContext, Page, ConsoleMessage, Request, Response } from 'playwright';
import type { ConsoleError, NetworkError, CapturedError } from '../types.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export interface BrowserOptions {
  headless?: boolean;
  slowMo?: number;
  timeout?: number;
  viewport?: { width: number; height: number };
  userAgent?: string;
}

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  consoleErrors: ConsoleError[];
  networkErrors: NetworkError[];
}

const DEFAULT_OPTIONS: BrowserOptions = {
  headless: true,
  slowMo: 50,
  timeout: 30000,
  viewport: { width: 1920, height: 1080 },
  // Use a realistic Chrome user agent to avoid being blocked by security systems
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// ============================================================================
// BROWSER LIFECYCLE
// ============================================================================

export async function createBrowser(options: BrowserOptions = {}): Promise<Browser> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const browser = await chromium.launch({
    headless: opts.headless,
    slowMo: opts.slowMo,
  });

  return browser;
}

export async function createSession(browser: Browser, options: BrowserOptions = {}): Promise<BrowserSession> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const context = await browser.newContext({
    viewport: opts.viewport,
    userAgent: opts.userAgent,
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();
  page.setDefaultTimeout(opts.timeout!);

  const consoleErrors: ConsoleError[] = [];
  const networkErrors: NetworkError[] = [];

  // Capture console messages
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      const location = msg.location();
      consoleErrors.push({
        level: msg.type() as 'error' | 'warn',
        message: msg.text(),
        source: location.url,
        line: location.lineNumber,
        column: location.columnNumber,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Capture page errors
  page.on('pageerror', (error: Error) => {
    consoleErrors.push({
      level: 'error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  });

  // Capture network failures
  page.on('requestfailed', (request: Request) => {
    networkErrors.push({
      url: request.url(),
      method: request.method(),
      status: 0,
      statusText: request.failure()?.errorText || 'Request failed',
      duration: 0,
      timestamp: new Date().toISOString(),
    });
  });

  // Capture HTTP errors
  page.on('response', async (response: Response) => {
    if (response.status() >= 400) {
      let responseBody = '';
      try {
        responseBody = await response.text();
      } catch {
        // Response body not available
      }

      networkErrors.push({
        url: response.url(),
        method: response.request().method(),
        status: response.status(),
        statusText: response.statusText(),
        responseBody,
        duration: 0,
        timestamp: new Date().toISOString(),
      });
    }
  });

  return { browser, context, page, consoleErrors, networkErrors };
}

export async function closeSession(session: BrowserSession): Promise<void> {
  await session.context.close();
}

export async function closeBrowser(browser: Browser): Promise<void> {
  await browser.close();
}

// ============================================================================
// NAVIGATION
// ============================================================================

export async function navigate(page: Page, url: string, options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<void> {
  await page.goto(url, {
    waitUntil: options?.waitUntil || 'networkidle',
  });
}

export async function waitForNavigation(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

export async function waitForSelector(page: Page, selector: string, timeout = 10000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// INTERACTIONS
// ============================================================================

export async function click(page: Page, selector: string): Promise<void> {
  await page.click(selector);
}

export async function clickSafe(page: Page, selector: string): Promise<boolean> {
  try {
    await page.click(selector, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export async function type(page: Page, selector: string, text: string): Promise<void> {
  await page.fill(selector, text);
}

export async function selectOption(page: Page, selector: string, value: string): Promise<void> {
  await page.selectOption(selector, value);
}

export async function hover(page: Page, selector: string): Promise<void> {
  await page.hover(selector);
}

export async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
}

export async function scrollToTop(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
}

// ============================================================================
// ELEMENT QUERIES
// ============================================================================

export async function elementExists(page: Page, selector: string): Promise<boolean> {
  const element = await page.$(selector);
  return element !== null;
}

export async function getElementText(page: Page, selector: string): Promise<string | null> {
  const element = await page.$(selector);
  if (!element) return null;
  return element.textContent();
}

export async function getElementAttribute(page: Page, selector: string, attribute: string): Promise<string | null> {
  const element = await page.$(selector);
  if (!element) return null;
  return element.getAttribute(attribute);
}

export async function countElements(page: Page, selector: string): Promise<number> {
  const elements = await page.$$(selector);
  return elements.length;
}

export async function getAllLinks(page: Page): Promise<string[]> {
  return page.$$eval('a[href]', (links) =>
    links.map((link) => link.getAttribute('href')).filter((href): href is string => href !== null)
  );
}

export async function getAllButtons(page: Page): Promise<string[]> {
  return page.$$eval('button', (buttons) =>
    buttons.map((btn) => btn.textContent || btn.getAttribute('aria-label') || 'unnamed').filter(Boolean)
  );
}

// ============================================================================
// PAGE STATE
// ============================================================================

export async function getPageTitle(page: Page): Promise<string> {
  return page.title();
}

export async function getPageUrl(page: Page): Promise<string> {
  return page.url();
}

export async function getPageContent(page: Page): Promise<string> {
  return page.content();
}

export async function isPageBlank(page: Page): Promise<boolean> {
  const content = await page.content();
  const bodyContent = await page.$eval('body', (body) => body.innerHTML.trim());

  // Check for blank page indicators
  const isBlank =
    bodyContent === '' ||
    bodyContent === '<div id="root"></div>' ||
    bodyContent === '<div id="app"></div>' ||
    content.includes('Cannot GET') ||
    content.includes('404');

  return isBlank;
}

export async function hasReactError(page: Page): Promise<boolean> {
  // Check for React error boundary
  const errorBoundary = await page.$('[class*="error-boundary"]');
  if (errorBoundary) return true;

  // Check for common React error messages
  const content = await page.content();
  const errorPatterns = [
    'Something went wrong',
    'Error boundary',
    'Uncaught Error',
    'ChunkLoadError',
    'Loading chunk',
    'failed to load',
  ];

  return errorPatterns.some((pattern) => content.includes(pattern));
}

// ============================================================================
// SCREENSHOTS
// ============================================================================

export async function takeScreenshot(page: Page, dir: string, name?: string): Promise<string> {
  const filename = name || `screenshot-${uuidv4()}.png`;
  const filepath = path.join(dir, filename);

  await fs.mkdir(dir, { recursive: true });
  await page.screenshot({ path: filepath, fullPage: true });

  return filepath;
}

export async function takeElementScreenshot(page: Page, selector: string, dir: string, name?: string): Promise<string | null> {
  const element = await page.$(selector);
  if (!element) return null;

  const filename = name || `element-${uuidv4()}.png`;
  const filepath = path.join(dir, filename);

  await fs.mkdir(dir, { recursive: true });
  await element.screenshot({ path: filepath });

  return filepath;
}

// ============================================================================
// NETWORK CONTROL
// ============================================================================

export async function setOffline(context: BrowserContext, offline: boolean): Promise<void> {
  await context.setOffline(offline);
}

export async function throttleNetwork(page: Page, latency: number, downloadThroughput: number, uploadThroughput: number): Promise<void> {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency,
    downloadThroughput,
    uploadThroughput,
  });
}

export async function set3GNetwork(page: Page): Promise<void> {
  // 3G: ~100ms latency, 750kb/s down, 250kb/s up
  await throttleNetwork(page, 100, 750 * 1024 / 8, 250 * 1024 / 8);
}

export async function setSlowNetwork(page: Page): Promise<void> {
  // Slow 3G: ~400ms latency, 400kb/s down, 150kb/s up
  await throttleNetwork(page, 400, 400 * 1024 / 8, 150 * 1024 / 8);
}

// ============================================================================
// LOCAL STORAGE & COOKIES
// ============================================================================

export async function setLocalStorage(page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
}

export async function getLocalStorage(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

export async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
}

export async function setCookie(context: BrowserContext, cookie: { name: string; value: string; domain: string; path?: string }): Promise<void> {
  await context.addCookies([{ ...cookie, path: cookie.path || '/' }]);
}

export async function getCookies(context: BrowserContext): Promise<string[]> {
  const cookies = await context.cookies();
  return cookies.map((c) => `${c.name}=${c.value}`);
}

export async function clearCookies(context: BrowserContext): Promise<void> {
  await context.clearCookies();
}

// ============================================================================
// ERROR COLLECTION
// ============================================================================

export function collectErrors(session: BrowserSession, url: string): CapturedError | null {
  const { consoleErrors, networkErrors, page } = session;

  if (consoleErrors.length === 0 && networkErrors.length === 0) {
    return null;
  }

  const severity = determineSeverity(consoleErrors, networkErrors);

  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    url,
    type: consoleErrors.length > 0 ? 'console' : 'network',
    message: consoleErrors[0]?.message || networkErrors[0]?.statusText || 'Unknown error',
    stack: consoleErrors[0]?.stack,
    severity,
    consoleErrors: [...consoleErrors],
    networkErrors: [...networkErrors],
    userAgent: DEFAULT_OPTIONS.userAgent!,
    viewport: DEFAULT_OPTIONS.viewport!,
  };
}

export function clearErrors(session: BrowserSession): void {
  session.consoleErrors.length = 0;
  session.networkErrors.length = 0;
}

function determineSeverity(consoleErrors: ConsoleError[], networkErrors: NetworkError[]): 'critical' | 'high' | 'medium' | 'low' {
  // Critical: Unhandled exceptions, 500 errors
  if (consoleErrors.some((e) => e.message.includes('Uncaught') || e.message.includes('unhandled'))) {
    return 'critical';
  }
  if (networkErrors.some((e) => e.status >= 500)) {
    return 'critical';
  }

  // High: React errors, 4xx errors
  if (consoleErrors.some((e) => e.message.includes('React') || e.message.includes('Error boundary'))) {
    return 'high';
  }
  if (networkErrors.some((e) => e.status >= 400 && e.status < 500)) {
    return 'high';
  }

  // Medium: Warnings
  if (consoleErrors.some((e) => e.level === 'warn')) {
    return 'medium';
  }

  return 'low';
}

// ============================================================================
// PERFORMANCE
// ============================================================================

export async function measurePageLoad(page: Page, url: string): Promise<number> {
  const start = Date.now();
  await page.goto(url, { waitUntil: 'networkidle' });
  return Date.now() - start;
}

export async function getPerformanceMetrics(page: Page): Promise<Record<string, number>> {
  const metrics = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: perf.domContentLoadedEventEnd - perf.startTime,
      load: perf.loadEventEnd - perf.startTime,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
    };
  });

  return metrics;
}
