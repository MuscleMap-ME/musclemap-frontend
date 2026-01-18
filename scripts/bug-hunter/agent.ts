/**
 * Bug Hunter Agent
 * Browser automation agent that explores the app and captures errors
 */

import type { Browser, Page, BrowserContext } from 'playwright';
import type { CapturedError, DiagnosedBug, RouteDefinition } from './types.js';
import type { BugHunterConfig } from './config.js';
import {
  createBrowser,
  createSession,
  closeSession,
  closeBrowser,
  navigate,
  waitForSelector,
  clickSafe,
  isPageBlank,
  hasReactError,
  takeScreenshot,
  measurePageLoad,
  type BrowserSession,
} from './utils/browser.js';
import {
  generateTestUser,
  registerUserViaAPI,
  loginUserViaAPI,
  injectAuthContext,
  clearAuth,
  type AuthContext,
  type TestUser,
} from './utils/auth.js';
import { ErrorCollector, sortBySeverity } from './error-collector.js';
import { DiagnosticsEngine } from './diagnostics.js';
import { ROUTES, INTERACTIONS, FORMS, getAuthenticatedRoutes, getPublicRoutes } from './coverage-map.js';

// ============================================================================
// BUG HUNTER AGENT CLASS
// ============================================================================

export class BugHunterAgent {
  private config: BugHunterConfig;
  private projectRoot: string;
  private browser: Browser | null = null;
  private session: BrowserSession | null = null;
  private authContext: AuthContext | null = null;
  private testUser: TestUser | null = null;
  private errorCollector: ErrorCollector | null = null;
  private diagnosticsEngine: DiagnosticsEngine;
  private discoveredBugs: DiagnosedBug[] = [];
  private routesTested: Set<string> = new Set();
  private verbose: boolean = false;

  constructor(projectRoot: string, config: BugHunterConfig) {
    this.projectRoot = projectRoot;
    this.config = config;
    this.diagnosticsEngine = new DiagnosticsEngine(projectRoot);
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  async start(options?: { verbose?: boolean; headed?: boolean }): Promise<void> {
    this.verbose = options?.verbose ?? false;

    this.log('🚀 Starting Bug Hunter Agent...');

    // Create browser
    this.browser = await createBrowser({
      headless: !options?.headed,
      slowMo: options?.headed ? 100 : 50,
    });

    // Create session
    this.session = await createSession(this.browser);
    this.errorCollector = new ErrorCollector(this.session.page, this.session.context);

    // Setup test user
    await this.setupTestUser();

    this.log('✅ Bug Hunter Agent ready');
  }

  async stop(): Promise<void> {
    this.log('🛑 Stopping Bug Hunter Agent...');

    if (this.session) {
      await closeSession(this.session);
      this.session = null;
    }

    if (this.browser) {
      await closeBrowser(this.browser);
      this.browser = null;
    }

    this.log('✅ Bug Hunter Agent stopped');
  }

  /**
   * Recreate browser session to avoid stale/closed context issues.
   * This is called before each exploration cycle to ensure a fresh browser state.
   */
  private async recreateSession(): Promise<void> {
    this.log('🔄 Refreshing browser session...');

    // Close existing session if any
    if (this.session) {
      try {
        await closeSession(this.session);
      } catch (e) {
        // Session might already be closed, ignore
        this.log(`   ⚠️  Old session cleanup: ${e}`, true);
      }
      this.session = null;
    }

    // Close existing browser and create a new one
    if (this.browser) {
      try {
        await closeBrowser(this.browser);
      } catch (e) {
        // Browser might already be closed, ignore
        this.log(`   ⚠️  Old browser cleanup: ${e}`, true);
      }
      this.browser = null;
    }

    // Create fresh browser and session
    this.browser = await createBrowser({
      headless: true,
      slowMo: 50,
    });

    this.session = await createSession(this.browser);
    this.errorCollector = new ErrorCollector(this.session.page, this.session.context);

    // Re-setup auth context if we have a test user
    if (this.testUser) {
      // Re-login to get fresh auth
      this.authContext = await loginUserViaAPI(this.config.baseUrl, this.testUser);
      if (!this.authContext) {
        // Try registering again (shouldn't be needed, but just in case)
        this.authContext = await registerUserViaAPI(this.config.baseUrl, this.testUser);
      }
    }

    this.log('✅ Browser session refreshed');
  }

  // ============================================================================
  // TEST USER MANAGEMENT
  // ============================================================================

  private async setupTestUser(): Promise<void> {
    this.log('👤 Setting up test user...');

    this.testUser = generateTestUser();

    // Try to login first (in case user already exists)
    this.authContext = await loginUserViaAPI(this.config.baseUrl, this.testUser);

    if (!this.authContext) {
      // Register new user
      this.authContext = await registerUserViaAPI(this.config.baseUrl, this.testUser);

      if (!this.authContext) {
        throw new Error('Failed to create test user');
      }
    }

    this.log(`✅ Test user ready: ${this.testUser.email}`);
  }

  // ============================================================================
  // EXPLORATION
  // ============================================================================

  async explore(options?: { duration?: number; section?: string; depth?: 'quick' | 'medium' | 'comprehensive' }): Promise<DiagnosedBug[]> {
    const duration = options?.duration ?? this.config.cycleDuration;
    const depth = options?.depth ?? 'comprehensive';
    const section = options?.section;

    this.discoveredBugs = [];
    this.routesTested.clear();

    this.log(`\n🔍 Starting exploration (${duration / 60000} minutes, ${depth} depth)`);

    // Recreate browser session before each exploration to avoid stale/closed context
    await this.recreateSession();

    const startTime = Date.now();

    try {
      // Phase 1: Test public routes
      this.log('\n📋 Phase 1: Testing public routes...');
      await this.testPublicRoutes(section);

      // Phase 2: Test authenticated routes
      this.log('\n📋 Phase 2: Testing authenticated routes...');
      await this.injectAuth();
      await this.testAuthenticatedRoutes(section);

      // Phase 3: Test forms and interactions (if time permits)
      if (depth !== 'quick' && Date.now() - startTime < duration * 0.7) {
        this.log('\n📋 Phase 3: Testing forms and interactions...');
        await this.testFormsAndInteractions();
      }

      // Phase 4: Edge cases (comprehensive only)
      if (depth === 'comprehensive' && Date.now() - startTime < duration * 0.9) {
        this.log('\n📋 Phase 4: Testing edge cases...');
        await this.testEdgeCases();
      }

    } catch (error) {
      this.log(`❌ Exploration error: ${error}`);
    }

    const elapsedMinutes = ((Date.now() - startTime) / 60000).toFixed(1);
    this.log(`\n✅ Exploration complete (${elapsedMinutes} minutes)`);
    this.log(`   Routes tested: ${this.routesTested.size}`);
    this.log(`   Bugs found: ${this.discoveredBugs.length}`);

    return this.discoveredBugs;
  }

  // ============================================================================
  // ROUTE TESTING
  // ============================================================================

  private async testPublicRoutes(section?: string): Promise<void> {
    let routes = getPublicRoutes();

    if (section) {
      routes = routes.filter(r => r.category === section);
    }

    for (const route of routes) {
      await this.testRoute(route);
    }
  }

  private async testAuthenticatedRoutes(section?: string): Promise<void> {
    let routes = getAuthenticatedRoutes();

    if (section) {
      routes = routes.filter(r => r.category === section);
    }

    for (const route of routes) {
      await this.testRoute(route);
    }
  }

  private async testRoute(route: RouteDefinition): Promise<void> {
    if (!this.session || !this.errorCollector) return;

    const page = this.session.page;
    const url = this.buildUrl(route);

    this.routesTested.add(route.path);
    this.log(`   Testing: ${route.path}`, true);

    // Clear errors from previous page
    this.errorCollector.clearCurrentErrors();

    try {
      // Navigate to route
      const loadTime = await measurePageLoad(page, url);

      // Check for errors
      const errors = await this.collectPageErrors(url, loadTime);

      if (errors.length === 0) {
        this.log(`   ✅ ${route.path} (${loadTime}ms)`, true);
      } else {
        for (const error of errors) {
          const diagnosedBug = await this.diagnosticsEngine.analyze(error);
          this.discoveredBugs.push(diagnosedBug);
          this.log(`   ❌ ${route.path}: ${error.type} - ${error.message.slice(0, 100)}`);
        }
      }

      // Wait a bit before next route
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`   ❌ ${route.path}: Navigation failed - ${errorMessage}`);

      // Create error for navigation failure
      const capturedError: CapturedError = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        url,
        type: 'timeout',
        message: `Navigation failed: ${errorMessage}`,
        severity: 'high',
        consoleErrors: [],
        networkErrors: [],
        userAgent: 'BugHunter/1.0',
        viewport: { width: 1920, height: 1080 },
        hash: crypto.randomUUID(),
      };

      const diagnosedBug = await this.diagnosticsEngine.analyze(capturedError);
      this.discoveredBugs.push(diagnosedBug);
    }
  }

  private buildUrl(route: RouteDefinition): string {
    let path = route.path;

    // Replace params with test values
    if (route.params) {
      for (const param of route.params) {
        path = path.replace(`:${param}`, 'test-id');
      }
    }

    return `${this.config.baseUrl}${path}`;
  }

  private async collectPageErrors(url: string, loadTime: number): Promise<CapturedError[]> {
    if (!this.errorCollector || !this.session) return [];

    const errors: CapturedError[] = [];
    const page = this.session.page;

    // Check for console/network errors
    const capturedError = await this.errorCollector.captureCurrentErrors(url);
    if (capturedError) {
      // Take screenshot
      capturedError.screenshot = await takeScreenshot(page, this.config.screenshotDir);
      errors.push(capturedError);
    }

    // Check for blank page
    const blankError = await this.errorCollector.checkForBlankPage(url);
    if (blankError) {
      blankError.screenshot = await takeScreenshot(page, this.config.screenshotDir);
      errors.push(blankError);
    }

    // Check for React errors
    const reactError = await this.errorCollector.checkForReactErrors(url);
    if (reactError) {
      reactError.screenshot = await takeScreenshot(page, this.config.screenshotDir);
      errors.push(reactError);
    }

    // Check for slow load
    const timeoutError = await this.errorCollector.checkForTimeout(url, loadTime, 3000);
    if (timeoutError) {
      errors.push(timeoutError);
    }

    // Check for GraphQL errors
    const graphqlErrors = await this.errorCollector.checkForGraphQLErrors();
    errors.push(...graphqlErrors);

    return errors;
  }

  // ============================================================================
  // FORM & INTERACTION TESTING
  // ============================================================================

  private async testFormsAndInteractions(): Promise<void> {
    if (!this.session) return;

    // Test each form with valid and invalid data
    for (const form of FORMS) {
      await this.testForm(form.path, form);
    }

    // Test interactive elements on key pages
    const keyPages = ['/dashboard', '/workout', '/exercises', '/profile'];
    for (const pagePath of keyPages) {
      await this.testInteractionsOnPage(pagePath);
    }
  }

  private async testForm(path: string, form: typeof FORMS[0]): Promise<void> {
    if (!this.session || !this.errorCollector) return;

    const page = this.session.page;
    const url = `${this.config.baseUrl}${path}`;

    this.log(`   Testing form: ${path}`, true);

    try {
      await navigate(page, url);
      this.errorCollector.clearCurrentErrors();

      // Wait for form
      const formExists = await waitForSelector(page, form.selector);
      if (!formExists) {
        this.log(`   ⚠️  Form not found: ${path}`, true);
        return;
      }

      // Fill with invalid data first
      for (const field of form.fields) {
        if (field.invalidValues.length === 0) continue;

        for (const invalidValue of field.invalidValues.slice(0, 2)) {
          try {
            await page.fill(field.selector, invalidValue);
          } catch {
            // Field might not exist or be fillable
          }
        }
      }

      // Try to submit
      const submitted = await clickSafe(page, form.submitButton);
      if (submitted) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const errors = await this.collectPageErrors(url, 0);
        for (const error of errors) {
          const diagnosedBug = await this.diagnosticsEngine.analyze(error);
          this.discoveredBugs.push(diagnosedBug);
        }
      }

    } catch (error) {
      this.log(`   ⚠️  Form test error: ${error}`, true);
    }
  }

  private async testInteractionsOnPage(path: string): Promise<void> {
    if (!this.session || !this.errorCollector) return;

    const page = this.session.page;
    const url = `${this.config.baseUrl}${path}`;

    this.log(`   Testing interactions: ${path}`, true);

    try {
      await navigate(page, url);
      this.errorCollector.clearCurrentErrors();

      // Find and click buttons
      const buttons = await page.$$('button:not([disabled])');
      for (const button of buttons.slice(0, 5)) {
        try {
          await button.click();
          await new Promise(resolve => setTimeout(resolve, 500));

          const errors = await this.collectPageErrors(url, 0);
          for (const error of errors) {
            const diagnosedBug = await this.diagnosticsEngine.analyze(error);
            this.discoveredBugs.push(diagnosedBug);
          }

          this.errorCollector.clearCurrentErrors();
        } catch {
          // Button click failed
        }
      }

    } catch (error) {
      this.log(`   ⚠️  Interaction test error: ${error}`, true);
    }
  }

  // ============================================================================
  // EDGE CASE TESTING
  // ============================================================================

  private async testEdgeCases(): Promise<void> {
    if (!this.session || !this.errorCollector) return;

    // Test rapid clicks
    await this.testRapidClicks();

    // Test back button navigation
    await this.testBackButton();

    // Test with expired token
    await this.testExpiredToken();

    // Test slow network (if Playwright supports it)
    // await this.testSlowNetwork();
  }

  private async testRapidClicks(): Promise<void> {
    if (!this.session) return;

    const page = this.session.page;
    const url = `${this.config.baseUrl}/dashboard`;

    this.log('   Testing: Rapid clicks', true);

    try {
      await navigate(page, url);

      // Find a button and click it rapidly
      const button = await page.$('button:not([disabled])');
      if (button) {
        for (let i = 0; i < 10; i++) {
          await button.click().catch(() => {});
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        const errors = await this.collectPageErrors(url, 0);
        for (const error of errors) {
          const diagnosedBug = await this.diagnosticsEngine.analyze(error);
          this.discoveredBugs.push(diagnosedBug);
        }
      }
    } catch (error) {
      this.log(`   ⚠️  Rapid click test error: ${error}`, true);
    }
  }

  private async testBackButton(): Promise<void> {
    if (!this.session) return;

    const page = this.session.page;

    this.log('   Testing: Back button navigation', true);

    try {
      await navigate(page, `${this.config.baseUrl}/dashboard`);
      await navigate(page, `${this.config.baseUrl}/workout`);
      await navigate(page, `${this.config.baseUrl}/exercises`);

      // Go back twice
      await page.goBack();
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.goBack();
      await new Promise(resolve => setTimeout(resolve, 500));

      const errors = await this.collectPageErrors(page.url(), 0);
      for (const error of errors) {
        const diagnosedBug = await this.diagnosticsEngine.analyze(error);
        this.discoveredBugs.push(diagnosedBug);
      }
    } catch (error) {
      this.log(`   ⚠️  Back button test error: ${error}`, true);
    }
  }

  private async testExpiredToken(): Promise<void> {
    if (!this.session || !this.errorCollector) return;

    const page = this.session.page;
    const url = `${this.config.baseUrl}/dashboard`;

    this.log('   Testing: Expired/invalid token', true);

    try {
      // Clear auth and inject invalid token
      await clearAuth(page);
      await page.evaluate(() => {
        localStorage.setItem('token', 'invalid-token-for-testing');
      });

      await page.goto(url);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const errors = await this.collectPageErrors(url, 0);

      // Filter out expected 401 errors
      const unexpectedErrors = errors.filter(e =>
        !e.message.includes('401') && !e.message.includes('Unauthorized')
      );

      for (const error of unexpectedErrors) {
        const diagnosedBug = await this.diagnosticsEngine.analyze(error);
        this.discoveredBugs.push(diagnosedBug);
      }

      // Restore auth
      await this.injectAuth();
    } catch (error) {
      this.log(`   ⚠️  Expired token test error: ${error}`, true);
      await this.injectAuth();
    }
  }

  // ============================================================================
  // AUTH HELPERS
  // ============================================================================

  private async injectAuth(): Promise<void> {
    if (!this.session || !this.authContext) return;

    const page = this.session.page;

    // Navigate to the base URL first to ensure we're on the correct origin
    // (localStorage can only be set when on a page from that origin)
    const currentUrl = page.url();
    if (!currentUrl.includes(this.config.baseUrl.replace('https://', '').replace('http://', ''))) {
      this.log('   Navigating to base URL to set auth context...', true);
      await page.goto(this.config.baseUrl, { waitUntil: 'domcontentloaded' });
    }

    await injectAuthContext(page, this.authContext);

    // Verify auth was set correctly
    const token = await page.evaluate(() => localStorage.getItem('token'));
    if (token) {
      this.log(`   ✅ Auth context injected (token: ${token.substring(0, 20)}...)`, true);
    } else {
      this.log('   ⚠️  Failed to inject auth context', true);
    }
  }

  // ============================================================================
  // RESULTS
  // ============================================================================

  getDiscoveredBugs(): DiagnosedBug[] {
    return sortBySeverity(this.discoveredBugs.map(b => ({
      ...b,
      severity: b.severity,
    }))) as DiagnosedBug[];
  }

  getRoutesTested(): string[] {
    return Array.from(this.routesTested);
  }

  // ============================================================================
  // LOGGING
  // ============================================================================

  private log(message: string, verboseOnly = false): void {
    if (verboseOnly && !this.verbose) return;
    console.log(message);
  }
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export function createBugHunterAgent(projectRoot: string, config: BugHunterConfig): BugHunterAgent {
  return new BugHunterAgent(projectRoot, config);
}
