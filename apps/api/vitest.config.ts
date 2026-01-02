import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    globalSetup: './tests/globalSetup.ts',
  },
});
