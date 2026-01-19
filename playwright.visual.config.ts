import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Visual Regression Testing
 *
 * This config is specifically for visual regression tests that capture
 * and compare screenshots to detect unintended visual changes.
 *
 * Run with: npx playwright test --config playwright.visual.config.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e/visual',

  // Snapshot settings
  snapshotDir: './e2e/visual/__snapshots__',
  snapshotPathTemplate:
    '{snapshotDir}/{projectName}/{testFilePath}/{arg}{ext}',

  // Screenshot comparison settings
  expect: {
    toHaveScreenshot: {
      // Maximum allowed ratio of pixels that can be different
      maxDiffPixelRatio: 0.01,

      // Maximum allowed pixel color difference (0-1)
      threshold: 0.2,

      // Handle animations
      animations: 'disabled',

      // Mask dynamic content
      mask: [],
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.01,
    },
  },

  // Test settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined, // Single worker for consistent screenshots

  // Reporter
  reporter: process.env.CI
    ? [
        ['list'],
        ['html', { outputFolder: 'playwright-report/visual' }],
        ['json', { outputFile: 'playwright-report/visual/results.json' }],
      ]
    : [['list'], ['html', { outputFolder: 'playwright-report/visual' }]],

  // Global settings
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',

    // Consistent browser behavior
    locale: 'en-US',
    timezoneId: 'America/New_York',

    // Ignore HTTPS errors for local testing
    ignoreHTTPSErrors: true,
  },

  // Projects for different browsers and viewports
  projects: [
    // Desktop browsers
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'Desktop Firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'Desktop Safari',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },

    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
      },
    },

    // Tablet
    {
      name: 'Tablet',
      use: {
        ...devices['iPad (gen 7)'],
      },
    },
  ],

  // Web server for local testing
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },

  // Output folder for test artifacts
  outputDir: 'test-results/visual',
});
