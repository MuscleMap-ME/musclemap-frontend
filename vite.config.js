import { defineConfig } from 'vite'
// Use SWC-based React plugin for 20x faster transforms than Babel
// SWC is written in Rust - native speed without custom C code
import react from '@vitejs/plugin-react-swc'
import { visualizer } from 'rollup-plugin-visualizer'
import compression from 'vite-plugin-compression'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Read package.json to get version
const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

// Memory optimization: Skip compression during build if SKIP_COMPRESSION is set
// This reduces peak memory by ~500MB - compression is done post-build instead
// See: scripts/build-safe.sh and scripts/compress-assets.sh
const skipCompression = process.env.SKIP_COMPRESSION === 'true'

// Low memory mode: Reduce parallelism for memory-constrained environments
// Set LOW_MEMORY=true on 8GB servers to prevent OOM during builds
const lowMemoryMode = process.env.LOW_MEMORY === 'true'

// Log build mode for debugging
if (skipCompression) {
  console.log('[vite] SKIP_COMPRESSION=true - compression deferred to post-build')
}
if (lowMemoryMode) {
  console.log('[vite] LOW_MEMORY=true - reducing parallelism for memory-constrained builds')
}

export default defineConfig({
  // Define environment variables from package.json
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      // Map npm package names to local packages
      '@musclemap.me/shared': resolve(__dirname, 'packages/shared/src'),
      '@musclemap.me/core': resolve(__dirname, 'packages/core/src'),
    },
  },
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
    // Pre-compress assets with Brotli for faster serving
    // Cloudflare can serve these directly instead of compressing on-the-fly
    // NOTE: Skip during memory-safe builds (compression done post-build)
    !skipCompression && compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024, // Only compress files > 1KB
      deleteOriginFile: false,
      filter: /\.(js|css|html|svg|json)$/i,
    }),
    // Also generate gzip for older clients
    !skipCompression && compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      deleteOriginFile: false,
      filter: /\.(js|css|html|svg|json)$/i,
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
    // Target modern browsers for better tree-shaking
    target: 'es2020',
    // Warning limit - we still want to be alerted for large chunks
    chunkSizeWarningLimit: 300,
    // Low memory mode: Use esbuild minification (faster, less memory than terser)
    minify: 'esbuild',
    // Reduce memory pressure by limiting concurrent file operations
    // Normal: 20 parallel ops, Low memory: 2 parallel ops
    ...(lowMemoryMode && {
      // These options reduce peak memory at cost of build speed
      cssCodeSplit: true,  // Split CSS to reduce memory per chunk
      reportCompressedSize: false,  // Skip compressed size calculation
    }),
    // Disable modulepreload for heavy vendor chunks
    // They will be loaded on-demand when the page that needs them is visited
    modulePreload: {
      resolveDependencies: (filename, deps, context) => {
        // Only preload critical path chunks
        // Exclude heavy vendor chunks that are only needed for specific pages
        const heavyChunks = [
          'three-vendor',     // 3D rendering - only dashboard/workout
          'recharts-vendor',  // Charts - only stats pages
          'd3-vendor',        // Charts - only stats pages
          'reactflow-vendor', // Flow diagrams - only skill tree
          'leaflet-vendor',   // Maps - only location pages
          'markdown-vendor',  // Markdown - only docs pages
          'lottie-vendor',    // Animations - rare usage
          'dicebear-vendor',  // Avatar generation - rare usage
          'ui-vendor',        // MUI/Headless - load after initial
          'apollo-vendor',    // GraphQL - can load after initial paint
        ];

        return deps.filter(dep => {
          // Exclude heavy chunks from preload
          return !heavyChunks.some(chunk => dep.includes(chunk));
        });
      },
    },
    rollupOptions: {
      // Low memory mode: Reduce Rollup's parallelism during transformation
      // This is the KEY setting that prevents OOM during module transformation
      ...(lowMemoryMode && {
        maxParallelFileOps: 2,  // Default is 20, reduce to 2 for 8GB servers
        // Note: We keep cache enabled (default) for faster rebuilds
        // The cache is disk-based and doesn't significantly impact peak memory
      }),
      output: {
        // Strategic chunk splitting for optimal caching and loading
        // Chunks are split by usage pattern and load priority
        manualChunks(id) {
          // Core React - loaded on every page (~165KB)
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }

          // Apollo/GraphQL - loaded after initial render (~170KB)
          if (id.includes('@apollo/client') ||
              id.includes('node_modules/graphql/')) {
            return 'apollo-vendor';
          }

          // Animation - framer-motion (~125KB)
          // NOTE: Do NOT split framer-motion into separate chunk!
          // It depends on React context and must load after react-vendor.
          // Splitting it causes "Cannot read properties of undefined (reading 'createContext')"
          // Let it bundle with the main app code instead.
          // if (id.includes('framer-motion') || id.includes('motion/')) {
          //   return 'animation-vendor';
          // }

          // Three.js and React Three Fiber - only for 3D pages (~800KB)
          // Kept separate so pages without 3D never load this
          if (id.includes('node_modules/three/') ||
              id.includes('@react-three/fiber') ||
              id.includes('@react-three/drei')) {
            return 'three-vendor';
          }

          // D3 for charts and graphs (~150KB)
          if (id.includes('node_modules/d3')) {
            return 'd3-vendor';
          }

          // Recharts - only for pages with charts (~300KB)
          if (id.includes('node_modules/recharts')) {
            return 'recharts-vendor';
          }

          // Leaflet - only for map pages (~150KB)
          if (id.includes('node_modules/leaflet') ||
              id.includes('react-leaflet')) {
            return 'leaflet-vendor';
          }

          // UI libraries (MUI, Headless UI, etc.)
          if (id.includes('@mui/') ||
              id.includes('@headlessui/') ||
              id.includes('@emotion/')) {
            return 'ui-vendor';
          }

          // ReactFlow - only for skill tree pages
          if (id.includes('reactflow')) {
            return 'reactflow-vendor';
          }

          // Date utilities
          if (id.includes('date-fns')) {
            return 'date-vendor';
          }

          // Markdown rendering
          if (id.includes('react-markdown') ||
              id.includes('remark-') ||
              id.includes('rehype-') ||
              id.includes('unified') ||
              id.includes('micromark') ||
              id.includes('mdast') ||
              id.includes('hast')) {
            return 'markdown-vendor';
          }

          // Lottie animations
          if (id.includes('lottie-')) {
            return 'lottie-vendor';
          }

          // DiceBear avatars
          if (id.includes('@dicebear')) {
            return 'dicebear-vendor';
          }

          // Do NOT bundle lucide-react or phosphor-icons into a single chunk
          // Let Vite tree-shake them per-component for optimal size
          // Icons are imported directly in components that need them
        },
      },
    },
    // Optimize dependency pre-bundling
    commonjsOptions: {
      // Helps with tree-shaking
      transformMixedEsModules: true,
    },
  },
  // Optimize deps for faster dev server
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@apollo/client',
      'graphql',
      'framer-motion',
      'zustand',
    ],
    // Exclude heavy deps and their transitive deps from pre-bundling
    // This prevents module resolution conflicts during HMR
    exclude: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
    ],
    // Force optimization of nested dependencies
    esbuildOptions: {
      // Resolve react-reconciler module issues
      mainFields: ['module', 'main'],
    },
  },
})
