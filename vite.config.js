import { defineConfig } from 'vite'
// Use SWC-based React plugin for 20x faster transforms than Babel
// SWC is written in Rust - native speed without custom C code
import react from '@vitejs/plugin-react-swc'
import { visualizer } from 'rollup-plugin-visualizer'
import compression from 'vite-plugin-compression'
import viteImagemin from 'vite-plugin-imagemin'
import prebundledVendors from './vite-prebundled-vendors.js'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { cpus } from 'os'

// Skip image optimization in dev mode or when SKIP_IMAGEMIN is set
// Image optimization adds ~10s to builds but reduces image sizes by 30-50%
const skipImagemin = process.env.NODE_ENV !== 'production' || process.env.SKIP_IMAGEMIN === 'true'

/**
 * Prefetch Hints Plugin
 *
 * Injects resource hints for likely-needed chunks to improve navigation.
 * - preload: Critical path chunks (react-vendor)
 * - prefetch: Likely next chunks (apollo-vendor, ui-vendor)
 */
function prefetchHintsPlugin() {
  return {
    name: 'vite-plugin-prefetch-hints',
    enforce: 'post',
    transformIndexHtml(html, ctx) {
      // Only add hints in production builds
      if (!ctx.bundle) return html;

      const hints = [];
      const criticalChunks = ['react-vendor']; // Always preload
      const prefetchChunks = ['apollo-vendor']; // Prefetch for GraphQL

      for (const [fileName, chunk] of Object.entries(ctx.bundle)) {
        if (chunk.type !== 'chunk' || !fileName.endsWith('.js')) continue;

        // Check if this is a critical chunk
        const isCritical = criticalChunks.some(c => fileName.includes(c));
        const shouldPrefetch = prefetchChunks.some(c => fileName.includes(c));

        if (isCritical) {
          hints.push(`<link rel="modulepreload" href="/${fileName}">`);
        } else if (shouldPrefetch) {
          hints.push(`<link rel="prefetch" href="/${fileName}" as="script">`);
        }
      }

      // Insert hints before </head>
      if (hints.length > 0) {
        const hintsHtml = `\n  <!-- Prefetch hints for faster navigation -->\n  ${hints.join('\n  ')}\n`;
        return html.replace('</head>', hintsHtml + '</head>');
      }

      return html;
    },
  };
}

/**
 * CRITICAL: Fix for "Dynamic require of 'react' is not supported" error
 *
 * The use-sync-external-store package uses CommonJS require() internally.
 * When bundled by Vite/Rollup, this becomes a broken polyfill that throws at runtime.
 *
 * Solution: Create a virtual module that exports useSyncExternalStore directly from React.
 * Since React 18+ has useSyncExternalStore built-in, we don't need the shim.
 */
function useSyncExternalStoreFix() {
  const virtualModules = {
    'use-sync-external-store': `
      import * as React from 'react';
      export const useSyncExternalStore = React.useSyncExternalStore;
    `,
    'use-sync-external-store/shim': `
      import * as React from 'react';
      export const useSyncExternalStore = React.useSyncExternalStore;
    `,
    'use-sync-external-store/shim/index.js': `
      import * as React from 'react';
      export const useSyncExternalStore = React.useSyncExternalStore;
    `,
    'use-sync-external-store/with-selector': `
      import * as React from 'react';
      import { useSyncExternalStore } from 'react';

      function is(x, y) {
        return (x === y && (x !== 0 || 1 / x === 1 / y)) || (x !== x && y !== y);
      }
      const objectIs = typeof Object.is === 'function' ? Object.is : is;

      export function useSyncExternalStoreWithSelector(
        subscribe,
        getSnapshot,
        getServerSnapshot,
        selector,
        isEqual
      ) {
        const selectedSnapshot = React.useMemo(() => {
          let hasMemo = false;
          let memoizedSnapshot;
          let memoizedSelection;

          return () => {
            const nextSnapshot = getSnapshot();
            if (!hasMemo) {
              hasMemo = true;
              memoizedSnapshot = nextSnapshot;
              memoizedSelection = selector(nextSnapshot);
              return memoizedSelection;
            }
            if (objectIs(memoizedSnapshot, nextSnapshot)) {
              return memoizedSelection;
            }
            const nextSelection = selector(nextSnapshot);
            if (isEqual !== undefined && isEqual(memoizedSelection, nextSelection)) {
              memoizedSnapshot = nextSnapshot;
              return memoizedSelection;
            }
            memoizedSnapshot = nextSnapshot;
            memoizedSelection = nextSelection;
            return nextSelection;
          };
        }, [getSnapshot, selector, isEqual]);

        const getSnapshotWithSelector = React.useCallback(
          () => selectedSnapshot(),
          [selectedSnapshot]
        );

        return useSyncExternalStore(
          subscribe,
          getSnapshotWithSelector,
          getServerSnapshot === undefined ? undefined : () => selector(getServerSnapshot())
        );
      }

      export default { useSyncExternalStoreWithSelector };
    `,
    'use-sync-external-store/shim/with-selector': `
      import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';
      export { useSyncExternalStoreWithSelector };
      export default { useSyncExternalStoreWithSelector };
    `,
    'use-sync-external-store/shim/with-selector.js': `
      import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';
      export { useSyncExternalStoreWithSelector };
      export default { useSyncExternalStoreWithSelector };
    `,
  };

  return {
    name: 'use-sync-external-store-fix',
    enforce: 'pre',
    resolveId(id, importer) {
      // Direct virtual module matches
      if (virtualModules[id]) {
        console.log(`[use-sync-external-store-fix] Intercepting: ${id}`);
        return '\0' + id;
      }

      // Handle any import that contains use-sync-external-store
      if (id.includes('use-sync-external-store')) {
        // Determine which virtual module to use based on the path
        if (id.includes('with-selector')) {
          console.log(`[use-sync-external-store-fix] Redirecting with-selector: ${id}`);
          return '\0use-sync-external-store/shim/with-selector';
        }
        if (id.includes('shim')) {
          console.log(`[use-sync-external-store-fix] Redirecting shim: ${id}`);
          return '\0use-sync-external-store/shim';
        }
        console.log(`[use-sync-external-store-fix] Redirecting base: ${id}`);
        return '\0use-sync-external-store';
      }

      return null;
    },
    load(id) {
      if (id.startsWith('\0')) {
        const realId = id.slice(1);
        if (virtualModules[realId]) {
          console.log(`[use-sync-external-store-fix] Loading virtual: ${realId}`);
          return virtualModules[realId];
        }
      }
      return null;
    },
  };
}

// Read package.json to get version
const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

// Detect available CPU cores for parallelization
const numCPUs = cpus().length

// Memory optimization: Skip compression during build if SKIP_COMPRESSION is set
// This reduces peak memory by ~500MB - compression is done post-build instead
// See: scripts/build-safe.sh and scripts/compress-assets.sh
const skipCompression = process.env.SKIP_COMPRESSION === 'true'

// Low memory mode: Reduce parallelism for memory-constrained environments
// Set LOW_MEMORY=true on 8GB servers to prevent OOM during builds
const lowMemoryMode = process.env.LOW_MEMORY === 'true'

// Ultra-low memory mode: Maximum memory savings for severely constrained environments
// Set ULTRA_LOW_MEMORY=true when available RAM < 3GB
const ultraLowMemoryMode = process.env.ULTRA_LOW_MEMORY === 'true'

// Log build mode for debugging
if (skipCompression) {
  console.log('[vite] SKIP_COMPRESSION=true - compression deferred to post-build')
}
if (ultraLowMemoryMode) {
  console.log('[vite] ULTRA_LOW_MEMORY=true - maximum memory savings enabled')
} else if (lowMemoryMode) {
  console.log('[vite] LOW_MEMORY=true - reducing parallelism for memory-constrained builds')
}

export default defineConfig({
  // Define environment variables from package.json
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      // Map @ to src directory for cleaner imports
      '@': resolve(__dirname, 'src'),
      // Map npm package names to local packages
      '@musclemap.me/shared': resolve(__dirname, 'packages/shared/src'),
      '@musclemap.me/core': resolve(__dirname, 'packages/core/src'),
      // Note: use-sync-external-store aliases handled by useSyncExternalStoreFix() plugin
    },
    // Prefer ESM module resolution to avoid CommonJS require() issues
    mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
    // Force these conditions for package.json exports resolution
    conditions: ['import', 'module', 'browser', 'default'],
    // PERFORMANCE: Reduce extension resolution overhead - only list what we use
    // Fewer extensions = fewer filesystem checks per import
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
  plugins: [
    // CRITICAL: Fix "Dynamic require of 'react' is not supported" error
    // Must be FIRST so it intercepts use-sync-external-store imports before other plugins
    useSyncExternalStoreFix(),
    // CRITICAL: Pre-bundled vendors FIRST - uses cached ESM bundles for heavy deps
    // This DRAMATICALLY reduces transform count from ~10k to ~800 modules
    // Run `node scripts/prebundle-vendors.mjs` to create/update cache
    prebundledVendors(),
    react({
      // SWC options for faster compilation
      // https://swc.rs/docs/configuration/compilation
      devTarget: 'es2022',  // Target modern browsers in dev for faster transforms
    }),
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
    // Image optimization - reduces PNG/JPG/GIF sizes by 30-50%
    // Only runs in production builds to speed up dev
    // IMPORTANT: Excludes logo files to preserve quality for iOS Safari compatibility
    !skipImagemin && viteImagemin({
      // Exclude logo files from optimization - pngquant converts to 8-bit grayscale
      // which causes rendering issues on iOS Safari
      filter: (file) => {
        const basename = file.split('/').pop() || '';
        // Skip logo files and icons (preserve original quality)
        if (basename.startsWith('logo') || basename.startsWith('icon-')) {
          return false;
        }
        return true;
      },
      gifsicle: {
        optimizationLevel: 7,
        interlaced: false,
      },
      optipng: {
        optimizationLevel: 7,
      },
      mozjpeg: {
        quality: 80,
      },
      pngquant: {
        quality: [0.8, 0.9],
        speed: 4,
      },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: false },
        ],
      },
    }),
    // Prefetch hints - adds resource hints for faster navigation
    prefetchHintsPlugin(),
  ].filter(Boolean),
  publicDir: 'public',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    },
    // MEMORY OPTIMIZATION: Reduce file watching overhead
    // Ignoring these directories reduces memory footprint during dev
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/.aggressive-cache/**',
        '**/.intelligent-cache/**',
        '**/.vendor-cache/**',
        '**/coverage/**',
      ]
    },
    // PERFORMANCE: Pre-transform frequently used files for faster dev server startup
    // These files are warmed up immediately when the dev server starts
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/pages/**/*.tsx',
        './src/components/**/*.tsx',
      ],
    },
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
    // MEMORY OPTIMIZATION: Disable sourcemaps in production to save ~30% memory
    // Source maps significantly increase memory usage during builds
    // Enable only for debugging: sourcemap: 'inline' or true
    sourcemap: false,
    // PERFORMANCE: Target esnext for minimal transpilation (faster builds)
    // All modern browsers support ES2022+, so we skip unnecessary transforms
    target: 'esnext',
    // Warning limit - we still want to be alerted for large chunks
    chunkSizeWarningLimit: 300,
    // MEMORY OPTIMIZATION: ALWAYS use esbuild minification
    // esbuild is faster and more memory-efficient than terser
    minify: 'esbuild',
    // MEMORY OPTIMIZATION: Skip compressed size reporting
    // Saves ~30% build time and reduces memory for size calculations
    // We calculate sizes in post-build compression anyway
    reportCompressedSize: false,
    // Inline assets smaller than 2KB (default is 4KB)
    // Reduces HTTP requests for tiny files while keeping bundle size down
    assetsInlineLimit: 2048,
    // PERFORMANCE: Tree-shaking optimization with 'recommended' preset
    // - Protects CSS imports (they have side effects)
    // - Aggressively shakes JS modules
    // - External deps use their package.json sideEffects field
    treeshake: {
      preset: 'recommended',
      // Protect CSS and other side-effect-only imports from being removed
      moduleSideEffects: (id, external) => {
        // Always keep CSS files - they're pure side effects (add styles)
        if (id.endsWith('.css')) return true;
        // External modules: trust their package.json sideEffects field
        if (external) return 'no-external';
        // Internal modules: assume no side effects (safe tree-shaking)
        return false;
      },
    },
    // MEMORY OPTIMIZATION: Memory-based build settings
    ...(ultraLowMemoryMode && {
      // Ultra-low memory: Maximum savings
      cssCodeSplit: true,     // Split CSS to reduce memory per chunk
      assetsInlineLimit: 1024, // Smaller inline threshold
      chunkSizeWarningLimit: 500, // Higher warning to reduce analysis overhead
    }),
    ...(lowMemoryMode && !ultraLowMemoryMode && {
      // Low memory: Balanced approach
      cssCodeSplit: true,  // Split CSS to reduce memory per chunk
    }),
    // Disable modulepreload for heavy vendor chunks
    // They will be loaded on-demand when the page that needs them is visited
    modulePreload: {
      resolveDependencies: (filename, deps, context) => {
        // Only preload critical path chunks
        // Exclude heavy vendor chunks that are only needed for specific pages
        const heavyChunks = [
          'three-core',       // 3D core math - only 3D pages
          'three-render',     // 3D renderers - only 3D pages
          'three-extras',     // 3D helpers - only 3D pages
          'three-vendor',     // 3D misc - only 3D pages
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
      // MEMORY OPTIMIZATION: Reduce parallelism based on memory mode
      // Lower parallelism = less peak memory, but slower builds
      ...(ultraLowMemoryMode && {
        maxParallelFileOps: 1,  // Minimum parallelism for ultra-low memory
      }),
      ...(lowMemoryMode && !ultraLowMemoryMode && {
        maxParallelFileOps: 2,  // Default is 20, reduce to 2 for 8GB servers
      }),
      ...(!lowMemoryMode && !ultraLowMemoryMode && {
        maxParallelFileOps: Math.max(numCPUs * 2, 20),  // Use 2x CPU cores
      }),
      // PERFORMANCE: Enable Rollup's internal cache for faster rebuilds
      cache: true,
      // Mark server-only dependencies as external (should never be in browser bundle)
      external: [
        'sharp',      // Image processing - build-time only
        'pg',         // PostgreSQL - server only
        'knex',       // Database - server only
        'redis',      // Cache - server only
        'jsonwebtoken', // JWT - server only (we use browser-compatible alternative)
      ],
      output: {
        // CRITICAL: Force .js extension for all output files
        // Without this, Vite might preserve .tsx extension which browsers don't recognize
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
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

          // Three.js split into multiple chunks for better loading
          // Only pages with 3D content will load these
          if (id.includes('node_modules/three/') && !id.includes('@react-three')) {
            // Core Three.js math and scene fundamentals (~200KB)
            if (id.includes('three/src/math') ||
                id.includes('three/src/core') ||
                id.includes('three/src/constants') ||
                id.includes('three/src/Three.js')) {
              return 'three-core';
            }
            // Renderers and materials (~250KB)
            if (id.includes('three/src/renderers') ||
                id.includes('three/src/materials') ||
                id.includes('three/src/textures') ||
                id.includes('three/src/objects')) {
              return 'three-render';
            }
            // Loaders, helpers, extras (~200KB)
            if (id.includes('three/src/loaders') ||
                id.includes('three/src/helpers') ||
                id.includes('three/src/extras') ||
                id.includes('three/src/animation') ||
                id.includes('three/src/geometries')) {
              return 'three-extras';
            }
            // Anything else from three.js
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

          // UI libraries (MUI, Emotion, etc.)
          if (id.includes('@mui/') ||
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
      // Fix "Dynamic require of 'react' is not supported" error
      // This tells Rollup how to handle CommonJS require() calls
      requireReturnsDefault: 'auto',
      // Explicitly tell Rollup that these are ES modules (don't use require())
      esmExternals: ['react', 'react-dom', 'react/jsx-runtime'],
      // CRITICAL: Include use-sync-external-store in CommonJS transformation
      // This package uses require() internally which causes "Dynamic require" errors
      include: [
        /node_modules/,
      ],
      // Force these packages to be treated as external ESM
      // Prevents rollup from generating the broken require() shim
      ignore: (id) => {
        // Don't ignore - we want all CommonJS to be transformed
        return false;
      },
    },
  },
  // CRITICAL: Configure Vite's dependency optimization for MAXIMUM caching
  optimizeDeps: {
    // Force include these for faster subsequent builds
    // These are pre-bundled once and cached in node_modules/.vite
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@apollo/client',
      'graphql',
      'framer-motion',
      'zustand',
      'zustand/react',
      // CRITICAL: Pre-bundle use-sync-external-store to fix "Dynamic require" error
      // This package uses CommonJS internally - pre-bundling converts it to ESM
      'use-sync-external-store',
      'use-sync-external-store/shim',
      'use-sync-external-store/shim/with-selector',
      'lucide-react',
      'clsx',
      'tailwind-merge',
    ],
    // Exclude dependencies from Vite's pre-bundling
    // - three: Uses our custom pre-bundled file in .vendor-cache/
    // - sharp: Build-time only, not needed in browser bundle
    // Note: @react-three/* are NOT excluded - let Vite handle them normally
    exclude: [
      'three',
      'sharp', // Build-time only image processing
    ],
    // Force optimization of nested dependencies
    esbuildOptions: {
      mainFields: ['module', 'main'],
      // PERFORMANCE: Don't keep names during pre-bundling for faster builds
      // Stack traces will be less readable but builds are faster
      keepNames: false,
    },
    // CRITICAL: Hold optimized deps for longer to avoid re-bundling
    // This caches in node_modules/.vite which we preserve with transform-cache.mjs
  },
  // esbuild configuration for faster transforms
  esbuild: {
    // Skip JSX development annotations in production
    jsx: 'automatic',
    // Drop console.log in production builds
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // PERFORMANCE: Faster minification settings
    // - legalComments: 'none' removes license comments
    // - minifyIdentifiers: true shortens variable names
    // - minifySyntax: true optimizes syntax patterns
    // - treeShaking: true removes dead code
    // Note: keepNames is set to false for faster builds (stack traces less readable)
    legalComments: 'none',
    minifyIdentifiers: true,
    minifySyntax: true,
    treeShaking: true,
    // Note: keepNames intentionally NOT set here (defaults to false for faster builds)
    // If you need readable stack traces, set keepNames: true
  },
  // CRITICAL: Cache configuration
  cacheDir: 'node_modules/.vite',
})
