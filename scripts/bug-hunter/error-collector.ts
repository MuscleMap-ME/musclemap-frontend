/**
 * Error Collector
 * Capture, categorize, and deduplicate errors from browser sessions
 */

import type { Page, BrowserContext } from 'playwright';
import type {
  CapturedError,
  ConsoleError,
  NetworkError,
  Severity,
  BugCategory,
} from './types.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// ============================================================================
// ERROR COLLECTOR CLASS
// ============================================================================

export class ErrorCollector {
  private consoleErrors: ConsoleError[] = [];
  private networkErrors: NetworkError[] = [];
  private capturedErrors: Map<string, CapturedError> = new Map();
  private page: Page;
  private context: BrowserContext;

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
    this.setupListeners();
  }

  // ============================================================================
  // KNOWN DEV-ONLY WARNINGS TO IGNORE
  // ============================================================================

  private static readonly IGNORED_PATTERNS = [
    // Vite HMR module resolution warnings for react-three/fiber internals
    /The requested module.*react-reconciler.*does not provide an export/,
    /react-reconciler.*node_modules/,
    // Vite pre-bundling warnings
    /Failed to resolve dependency.*optimizeDeps/,
    // React DevTools
    /Download the React DevTools/,
    // Service Worker registration (not an error)
    /\[SW Registration\]/,
  ];

  private shouldIgnoreError(message: string): boolean {
    return ErrorCollector.IGNORED_PATTERNS.some(pattern => pattern.test(message));
  }

  // ============================================================================
  // LISTENER SETUP
  // ============================================================================

  private setupListeners(): void {
    // Console errors
    this.page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        const message = msg.text();

        // Skip known dev-only warnings
        if (this.shouldIgnoreError(message)) {
          return;
        }

        const location = msg.location();
        this.consoleErrors.push({
          level: msg.type() as 'error' | 'warn',
          message,
          source: location.url,
          line: location.lineNumber,
          column: location.columnNumber,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Page errors (uncaught exceptions)
    this.page.on('pageerror', (error) => {
      this.consoleErrors.push({
        level: 'error',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    });

    // Request failures
    this.page.on('requestfailed', (request) => {
      this.networkErrors.push({
        url: request.url(),
        method: request.method(),
        status: 0,
        statusText: request.failure()?.errorText || 'Network request failed',
        duration: 0,
        timestamp: new Date().toISOString(),
      });
    });

    // HTTP errors (4xx, 5xx)
    this.page.on('response', async (response) => {
      if (response.status() >= 400) {
        let responseBody = '';
        try {
          responseBody = await response.text();
        } catch {
          // Response body not available
        }

        this.networkErrors.push({
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
  }

  // ============================================================================
  // ERROR CAPTURE
  // ============================================================================

  async captureCurrentErrors(url: string): Promise<CapturedError | null> {
    // Skip if no errors
    if (this.consoleErrors.length === 0 && this.networkErrors.length === 0) {
      return null;
    }

    const error = await this.buildCapturedError(url);

    // Deduplicate by hash
    const existingError = this.capturedErrors.get(error.hash);
    if (existingError) {
      existingError.occurrences++;
      existingError.lastSeen = new Date().toISOString();
      return existingError;
    }

    this.capturedErrors.set(error.hash, error);
    return error;
  }

  private async buildCapturedError(url: string): Promise<CapturedError> {
    const primaryError = this.consoleErrors[0] || this.networkErrors[0];
    const message = primaryError
      ? ('message' in primaryError ? primaryError.message : primaryError.statusText)
      : 'Unknown error';

    const error: CapturedError = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      url,
      type: this.determineErrorType(),
      message,
      stack: this.consoleErrors[0]?.stack,
      severity: this.determineSeverity(),
      consoleErrors: [...this.consoleErrors],
      networkErrors: [...this.networkErrors],
      userAgent: await this.page.evaluate(() => navigator.userAgent),
      viewport: await this.page.viewportSize() || { width: 1920, height: 1080 },
    };

    // Generate hash for deduplication
    const hashContent = `${error.type}:${error.message}:${url}`;
    error.hash = crypto.createHash('md5').update(hashContent).digest('hex');

    return error;
  }

  // ============================================================================
  // BLANK PAGE DETECTION
  // ============================================================================

  async checkForBlankPage(url: string): Promise<CapturedError | null> {
    const isBlank = await this.isPageBlank();

    if (!isBlank) {
      return null;
    }

    const error: CapturedError = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      url,
      type: 'blank_page',
      message: 'Page rendered blank or with no content',
      severity: 'critical',
      consoleErrors: [...this.consoleErrors],
      networkErrors: [...this.networkErrors],
      userAgent: await this.page.evaluate(() => navigator.userAgent),
      viewport: await this.page.viewportSize() || { width: 1920, height: 1080 },
      hash: crypto.createHash('md5').update(`blank_page:${url}`).digest('hex'),
    };

    this.capturedErrors.set(error.hash, error);
    return error;
  }

  private async isPageBlank(): Promise<boolean> {
    try {
      const bodyContent = await this.page.$eval('body', (body) => body.innerHTML.trim());
      const content = await this.page.content();

      // Check for blank page indicators
      const blankIndicators = [
        bodyContent === '',
        bodyContent === '<div id="root"></div>',
        bodyContent === '<div id="app"></div>',
        bodyContent.length < 100 && !bodyContent.includes('<'),
        content.includes('Cannot GET'),
        content.includes('404 Not Found'),
      ];

      return blankIndicators.some(Boolean);
    } catch {
      return false;
    }
  }

  // ============================================================================
  // REACT ERROR DETECTION
  // ============================================================================

  async checkForReactErrors(url: string): Promise<CapturedError | null> {
    const hasReactError = await this.hasReactError();

    if (!hasReactError) {
      return null;
    }

    const errorMessage = await this.extractReactErrorMessage();

    const error: CapturedError = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      url,
      type: 'react',
      message: errorMessage || 'React error boundary triggered',
      severity: 'high',
      consoleErrors: [...this.consoleErrors],
      networkErrors: [...this.networkErrors],
      userAgent: await this.page.evaluate(() => navigator.userAgent),
      viewport: await this.page.viewportSize() || { width: 1920, height: 1080 },
      hash: crypto.createHash('md5').update(`react:${errorMessage}:${url}`).digest('hex'),
    };

    this.capturedErrors.set(error.hash, error);
    return error;
  }

  private async hasReactError(): Promise<boolean> {
    try {
      // Check for error boundary elements
      const errorBoundary = await this.page.$('[class*="error-boundary"], [class*="error_boundary"], [class*="ErrorBoundary"]');
      if (errorBoundary) return true;

      // Check for common React error messages in the DOM
      const content = await this.page.content();
      const errorPatterns = [
        'Something went wrong',
        'Error boundary',
        'Application error',
        'ChunkLoadError',
        'Loading chunk.*failed',
        'Minified React error',
      ];

      return errorPatterns.some((pattern) => new RegExp(pattern, 'i').test(content));
    } catch {
      return false;
    }
  }

  private async extractReactErrorMessage(): Promise<string | null> {
    try {
      // Try to get error message from error boundary
      const errorElement = await this.page.$('[class*="error"] p, [class*="error"] span, [class*="error-message"]');
      if (errorElement) {
        return await errorElement.textContent();
      }

      // Get from console errors
      const reactError = this.consoleErrors.find((e) =>
        e.message.includes('React') ||
        e.message.includes('Error') ||
        e.message.includes('Uncaught')
      );

      return reactError?.message || null;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // MISSING ELEMENT DETECTION
  // ============================================================================

  async checkForMissingElement(selector: string, url: string, description: string): Promise<CapturedError | null> {
    const element = await this.page.$(selector);

    if (element) {
      return null;
    }

    const error: CapturedError = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      url,
      type: 'missing_element',
      message: `Expected element not found: ${description} (${selector})`,
      severity: 'medium',
      consoleErrors: [...this.consoleErrors],
      networkErrors: [...this.networkErrors],
      userAgent: await this.page.evaluate(() => navigator.userAgent),
      viewport: await this.page.viewportSize() || { width: 1920, height: 1080 },
      hash: crypto.createHash('md5').update(`missing:${selector}:${url}`).digest('hex'),
    };

    this.capturedErrors.set(error.hash, error);
    return error;
  }

  // ============================================================================
  // TIMEOUT DETECTION
  // ============================================================================

  async checkForTimeout(url: string, duration: number, threshold: number): Promise<CapturedError | null> {
    if (duration < threshold) {
      return null;
    }

    const error: CapturedError = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      url,
      type: 'timeout',
      message: `Page load exceeded threshold: ${duration}ms (threshold: ${threshold}ms)`,
      severity: duration > threshold * 2 ? 'high' : 'medium',
      consoleErrors: [...this.consoleErrors],
      networkErrors: [...this.networkErrors],
      userAgent: await this.page.evaluate(() => navigator.userAgent),
      viewport: await this.page.viewportSize() || { width: 1920, height: 1080 },
      hash: crypto.createHash('md5').update(`timeout:${url}`).digest('hex'),
    };

    this.capturedErrors.set(error.hash, error);
    return error;
  }

  // ============================================================================
  // GraphQL ERROR DETECTION
  // ============================================================================

  async checkForGraphQLErrors(): Promise<CapturedError[]> {
    const graphqlErrors: CapturedError[] = [];

    for (const networkError of this.networkErrors) {
      if (!networkError.url.includes('graphql')) {
        continue;
      }

      try {
        const responseBody = networkError.responseBody;
        if (!responseBody) continue;

        const data = JSON.parse(responseBody);
        if (data.errors && Array.isArray(data.errors)) {
          for (const gqlError of data.errors) {
            const error: CapturedError = {
              id: uuidv4(),
              timestamp: new Date().toISOString(),
              url: networkError.url,
              type: 'graphql',
              message: gqlError.message || 'GraphQL error',
              severity: 'high',
              consoleErrors: [],
              networkErrors: [networkError],
              userAgent: await this.page.evaluate(() => navigator.userAgent),
              viewport: await this.page.viewportSize() || { width: 1920, height: 1080 },
              hash: crypto.createHash('md5').update(`graphql:${gqlError.message}`).digest('hex'),
            };

            if (!this.capturedErrors.has(error.hash)) {
              this.capturedErrors.set(error.hash, error);
              graphqlErrors.push(error);
            }
          }
        }
      } catch {
        // Not JSON or parsing failed
      }
    }

    return graphqlErrors;
  }

  // ============================================================================
  // ACCESSIBILITY VIOLATIONS
  // ============================================================================

  async checkAccessibility(url: string): Promise<CapturedError[]> {
    const errors: CapturedError[] = [];

    try {
      // Basic accessibility checks
      const violations = await this.page.evaluate(() => {
        const issues: string[] = [];

        // Check for images without alt text
        const images = document.querySelectorAll('img:not([alt])');
        if (images.length > 0) {
          issues.push(`${images.length} images missing alt text`);
        }

        // Check for form inputs without labels
        const inputs = document.querySelectorAll('input:not([aria-label]):not([id])');
        if (inputs.length > 0) {
          issues.push(`${inputs.length} form inputs missing labels`);
        }

        // Check for buttons without accessible names
        const buttons = document.querySelectorAll('button:empty:not([aria-label])');
        if (buttons.length > 0) {
          issues.push(`${buttons.length} buttons without accessible names`);
        }

        // Check for low contrast (basic)
        const lowContrastElements = document.querySelectorAll('[style*="color: #ccc"], [style*="color: #999"]');
        if (lowContrastElements.length > 0) {
          issues.push(`${lowContrastElements.length} potential low contrast elements`);
        }

        return issues;
      });

      for (const violation of violations) {
        const error: CapturedError = {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          url,
          type: 'console',
          message: `Accessibility: ${violation}`,
          severity: 'low',
          consoleErrors: [],
          networkErrors: [],
          userAgent: await this.page.evaluate(() => navigator.userAgent),
          viewport: await this.page.viewportSize() || { width: 1920, height: 1080 },
          hash: crypto.createHash('md5').update(`a11y:${violation}:${url}`).digest('hex'),
        };

        if (!this.capturedErrors.has(error.hash)) {
          this.capturedErrors.set(error.hash, error);
          errors.push(error);
        }
      }
    } catch {
      // Accessibility check failed
    }

    return errors;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private determineErrorType(): CapturedError['type'] {
    if (this.consoleErrors.some((e) => e.message.includes('React'))) {
      return 'react';
    }
    if (this.consoleErrors.some((e) => e.message.includes('GraphQL'))) {
      return 'graphql';
    }
    if (this.networkErrors.length > 0 && this.consoleErrors.length === 0) {
      return 'network';
    }
    return 'console';
  }

  private determineSeverity(): Severity {
    // Critical: Unhandled exceptions, 500 errors
    if (this.consoleErrors.some((e) =>
      e.message.includes('Uncaught') ||
      e.message.includes('unhandled') ||
      e.message.includes('Fatal')
    )) {
      return 'critical';
    }
    if (this.networkErrors.some((e) => e.status >= 500)) {
      return 'critical';
    }

    // High: React errors, auth failures
    if (this.consoleErrors.some((e) =>
      e.message.includes('React') ||
      e.message.includes('Error boundary') ||
      e.message.includes('TypeError') ||
      e.message.includes('ReferenceError')
    )) {
      return 'high';
    }
    if (this.networkErrors.some((e) => e.status === 401 || e.status === 403)) {
      return 'high';
    }

    // Medium: 4xx errors (except auth)
    if (this.networkErrors.some((e) => e.status >= 400 && e.status < 500)) {
      return 'medium';
    }

    // Low: Warnings
    if (this.consoleErrors.every((e) => e.level === 'warn')) {
      return 'low';
    }

    return 'medium';
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  clearCurrentErrors(): void {
    this.consoleErrors = [];
    this.networkErrors = [];
  }

  getAllCapturedErrors(): CapturedError[] {
    return Array.from(this.capturedErrors.values());
  }

  getCapturedError(hash: string): CapturedError | undefined {
    return this.capturedErrors.get(hash);
  }

  clearAllErrors(): void {
    this.consoleErrors = [];
    this.networkErrors = [];
    this.capturedErrors.clear();
  }

  getErrorCount(): number {
    return this.capturedErrors.size;
  }

  hasErrors(): boolean {
    return this.consoleErrors.length > 0 || this.networkErrors.length > 0;
  }

  getConsoleErrorCount(): number {
    return this.consoleErrors.length;
  }

  getNetworkErrorCount(): number {
    return this.networkErrors.length;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function categorizeBug(error: CapturedError): BugCategory {
  switch (error.type) {
    case 'console':
      if (error.message.includes('Uncaught') || error.message.includes('Error')) {
        return 'crash';
      }
      return 'error';
    case 'network':
      return 'network';
    case 'react':
      return 'crash';
    case 'graphql':
      return 'error';
    case 'blank_page':
      return 'ui';
    case 'missing_element':
      return 'ui';
    case 'timeout':
      return 'performance';
    default:
      return 'error';
  }
}

export function filterBySeverity(errors: CapturedError[], minSeverity: Severity): CapturedError[] {
  const severityOrder: Severity[] = ['low', 'medium', 'high', 'critical'];
  const minIndex = severityOrder.indexOf(minSeverity);

  return errors.filter((error) => {
    const errorIndex = severityOrder.indexOf(error.severity);
    return errorIndex >= minIndex;
  });
}

export function sortBySeverity(errors: CapturedError[]): CapturedError[] {
  const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low'];

  return [...errors].sort((a, b) => {
    return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
  });
}
