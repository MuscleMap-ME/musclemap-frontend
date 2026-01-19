import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests for Critical Pages
 *
 * These tests capture screenshots of critical pages and compare them
 * against baseline images to detect visual regressions.
 *
 * Run with: pnpm test:visual
 * Update baselines with: pnpm test:visual --update-snapshots
 */

// Critical pages that should be visually stable
const CRITICAL_PAGES = [
  { name: 'homepage', path: '/', waitFor: '#root' },
  { name: 'login', path: '/login', waitFor: 'form' },
  { name: 'register', path: '/register', waitFor: 'form' },
  { name: 'dashboard', path: '/dashboard', waitFor: '#root' },
  { name: 'profile', path: '/profile', waitFor: '#root' },
  { name: 'workout', path: '/workout', waitFor: '#root' },
  { name: 'journey', path: '/journey', waitFor: '#root' },
  { name: 'achievements', path: '/achievements', waitFor: '#root' },
  { name: 'stats', path: '/stats', waitFor: '#root' },
  { name: 'settings', path: '/settings', waitFor: '#root' },
];

// Configure test to use visual comparison
test.describe('Visual Regression - Critical Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
    await page.addInitScript(() => {
      // Disable CSS animations
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      document.head.appendChild(style);
    });
  });

  for (const pageConfig of CRITICAL_PAGES) {
    test(`${pageConfig.name} page visual regression`, async ({ page }) => {
      // Navigate to the page
      await page.goto(pageConfig.path);

      // Wait for the page to be ready
      await page.waitForLoadState('networkidle');

      // Wait for React hydration
      try {
        await page.waitForSelector(pageConfig.waitFor, { timeout: 10000 });
      } catch {
        // If specific selector not found, just wait for root
        await page.waitForSelector('#root', { timeout: 5000 });
      }

      // Additional wait for any lazy-loaded content
      await page.waitForTimeout(500);

      // Take full page screenshot and compare
      await expect(page).toHaveScreenshot(`${pageConfig.name}.png`, {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixelRatio: 0.01, // Allow 1% difference
        threshold: 0.2, // Color difference threshold
      });
    });
  }
});

test.describe('Visual Regression - Responsive Layouts', () => {
  const VIEWPORTS = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 },
    { name: 'wide', width: 1920, height: 1080 },
  ];

  for (const viewport of VIEWPORTS) {
    test(`homepage at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
      page,
    }) => {
      // Set viewport
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      // Navigate
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('#root', { timeout: 5000 });

      // Screenshot
      await expect(page).toHaveScreenshot(`homepage-${viewport.name}.png`, {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixelRatio: 0.02, // Slightly more tolerance for responsive
      });
    });
  }
});

test.describe('Visual Regression - Key Components', () => {
  test('navigation component', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find navigation element
    const nav = page.locator('nav').first();
    if (await nav.isVisible()) {
      await expect(nav).toHaveScreenshot('component-navigation.png', {
        animations: 'disabled',
      });
    }
  });

  test('footer component', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scroll to footer
    const footer = page.locator('footer').first();
    if (await footer.isVisible()) {
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toHaveScreenshot('component-footer.png', {
        animations: 'disabled',
      });
    }
  });

  test('login form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const form = page.locator('form').first();
    if (await form.isVisible()) {
      await expect(form).toHaveScreenshot('component-login-form.png', {
        animations: 'disabled',
      });
    }
  });
});

test.describe('Visual Regression - Error States', () => {
  test('404 page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-404');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('error-404.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.05, // More tolerance for error pages
    });
  });
});

test.describe('Visual Regression - Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Emulate dark color scheme
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  test('homepage in dark mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#root', { timeout: 5000 });

    await expect(page).toHaveScreenshot('homepage-dark.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });

  test('login in dark mode', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-dark.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });
});
