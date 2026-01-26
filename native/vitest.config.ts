import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Resolve ../index to the TypeScript source file
      '../index': resolve(__dirname, 'index.ts'),
    },
  },
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
