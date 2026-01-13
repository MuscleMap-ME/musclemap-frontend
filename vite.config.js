import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    // Bundle visualizer - generates stats.html when ANALYZE=true
    process.env.ANALYZE && visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // 'sunburst', 'treemap', 'network'
    }),
  ].filter(Boolean),
  publicDir: 'public',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setupTests.js',
    css: true,

    // Only frontend unit tests
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],

    // Do NOT let vitest pick up backend or playwright tests
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      'apps/api/**'
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/tests/**', 'src/**/*.test.{js,jsx}', 'src/**/*.spec.{js,jsx}']
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Increase chunk size warning limit since we're code-splitting
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Strategic chunk splitting for optimal caching and loading
        // Note: Three.js is NOT in manualChunks - Vite will auto-split it
        // based on actual usage, preventing it from being preloaded on pages
        // that don't use 3D features (important for slow connections)
        manualChunks: {
          // Core React - loaded on every page
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // D3 for charts and graphs - only loaded when needed
          'd3-vendor': ['d3'],

          // Apollo/GraphQL - loaded after initial render
          'apollo-vendor': ['@apollo/client', 'graphql'],

          // Animation library - commonly used but not critical path
          'animation-vendor': ['framer-motion'],

          // Icons - loaded as needed
          'icons-vendor': ['lucide-react'],
        },
      },
    },
  },
})
