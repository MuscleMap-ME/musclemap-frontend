/**
 * BuildNet Extension Definitions
 *
 * Built-in definitions for CLI tools that can accelerate builds.
 * Based on research of fastest available tools in each category.
 */

import type { ExtensionDefinition, ExtensionCategory, BuildOperation } from './types.js';

// ============================================================================
// Bundlers (10-100x faster than webpack)
// ============================================================================

export const ESBUILD: ExtensionDefinition = {
  id: 'esbuild',
  name: 'esbuild',
  category: 'bundler',
  description: 'An extremely fast JavaScript bundler and minifier written in Go. 10-100x faster than webpack.',
  detectionCommands: [
    { command: 'esbuild --version', check: 'version', versionPattern: '^(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which esbuild', check: 'exists' },
    { command: 'npx esbuild --version', check: 'version', versionPattern: '^(\\d+\\.\\d+\\.\\d+)' },
  ],
  performanceMultiplier: 100,
  accelerates: ['bundle_javascript', 'bundle_typescript', 'transpile_typescript', 'transpile_jsx', 'minify_javascript', 'minify_css'],
  installation: {
    npm: 'pnpm add -D esbuild',
    brew: 'brew install esbuild',
  },
};

export const SWC: ExtensionDefinition = {
  id: 'swc',
  name: 'SWC',
  category: 'transpiler',
  description: 'Rust-based JavaScript/TypeScript compiler. 20x faster than Babel.',
  detectionCommands: [
    { command: 'swc --version', check: 'version', versionPattern: '@swc/core:\\s*(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which swc', check: 'exists' },
    { command: 'npx swc --version', check: 'version' },
  ],
  performanceMultiplier: 20,
  accelerates: ['transpile_typescript', 'transpile_jsx', 'minify_javascript'],
  installation: {
    npm: 'pnpm add -D @swc/cli @swc/core',
  },
};

export const RSPACK: ExtensionDefinition = {
  id: 'rspack',
  name: 'Rspack',
  category: 'bundler',
  description: 'Rust-based webpack-compatible bundler. 5-10x faster than webpack.',
  detectionCommands: [
    { command: 'rspack --version', check: 'version', versionPattern: '(\\d+\\.\\d+\\.\\d+)' },
    { command: 'npx rspack --version', check: 'version' },
  ],
  performanceMultiplier: 10,
  accelerates: ['bundle_javascript', 'bundle_typescript'],
  installation: {
    npm: 'pnpm add -D @rspack/cli @rspack/core',
  },
};

export const TURBOPACK: ExtensionDefinition = {
  id: 'turbopack',
  name: 'Turbopack',
  category: 'bundler',
  description: 'Vercel\'s Rust-based bundler, integrated with Next.js.',
  detectionCommands: [
    { command: 'turbo --version', check: 'version', versionPattern: '(\\d+\\.\\d+\\.\\d+)' },
  ],
  performanceMultiplier: 50,
  accelerates: ['bundle_javascript', 'bundle_typescript'],
  installation: {
    npm: 'pnpm add -D turbo',
  },
};

// ============================================================================
// Minifiers
// ============================================================================

export const TERSER: ExtensionDefinition = {
  id: 'terser',
  name: 'Terser',
  category: 'minifier',
  description: 'JavaScript minifier with excellent compression. Industry standard.',
  detectionCommands: [
    { command: 'terser --version', check: 'version', versionPattern: 'terser\\s*(\\d+\\.\\d+\\.\\d+)' },
    { command: 'npx terser --version', check: 'version' },
  ],
  performanceMultiplier: 1,
  accelerates: ['minify_javascript'],
  installation: {
    npm: 'pnpm add -D terser',
  },
};

export const UGLIFY_JS: ExtensionDefinition = {
  id: 'uglify-js',
  name: 'UglifyJS',
  category: 'minifier',
  description: 'JavaScript compressor/minifier. Good compatibility with older code.',
  detectionCommands: [
    { command: 'uglifyjs --version', check: 'version', versionPattern: 'uglify-js\\s*(\\d+\\.\\d+\\.\\d+)' },
  ],
  performanceMultiplier: 0.8,
  accelerates: ['minify_javascript'],
  installation: {
    npm: 'pnpm add -D uglify-js',
  },
};

// ============================================================================
// Compressors
// ============================================================================

export const BROTLI: ExtensionDefinition = {
  id: 'brotli',
  name: 'Brotli',
  category: 'compressor',
  description: 'Google\'s compression algorithm. 70% size reduction, 20-26% better than gzip.',
  detectionCommands: [
    { command: 'brotli --version', check: 'version', versionPattern: 'brotli\\s*(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which brotli', check: 'exists' },
  ],
  performanceMultiplier: 1.2,
  accelerates: ['compress_assets'],
  installation: {
    brew: 'brew install brotli',
    apt: 'apt-get install brotli',
  },
};

export const GZIP: ExtensionDefinition = {
  id: 'gzip',
  name: 'Gzip',
  category: 'compressor',
  description: 'Standard compression. 65% size reduction, widely supported.',
  detectionCommands: [
    { command: 'gzip --version', check: 'version', versionPattern: 'gzip\\s*(\\d+\\.?\\d*)' },
    { command: 'which gzip', check: 'exists' },
  ],
  performanceMultiplier: 1,
  accelerates: ['compress_assets'],
  installation: {
    apt: 'apt-get install gzip',
  },
};

export const ZSTD: ExtensionDefinition = {
  id: 'zstd',
  name: 'Zstandard',
  category: 'compressor',
  description: 'Facebook\'s compression. 42% faster than Brotli, excellent compression ratio.',
  detectionCommands: [
    { command: 'zstd --version', check: 'version', versionPattern: 'v(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which zstd', check: 'exists' },
  ],
  performanceMultiplier: 1.5,
  accelerates: ['compress_assets'],
  installation: {
    brew: 'brew install zstd',
    apt: 'apt-get install zstd',
  },
};

// ============================================================================
// Image Optimization
// ============================================================================

export const SHARP: ExtensionDefinition = {
  id: 'sharp',
  name: 'Sharp',
  category: 'image_optimizer',
  description: 'High performance Node.js image processing backed by libvips. 4-5x faster than ImageMagick.',
  detectionCommands: [
    { command: 'node -e "require(\'sharp\')"', check: 'exists' },
    { command: 'npm list sharp', check: 'output_contains', contains: 'sharp@' },
  ],
  performanceMultiplier: 5,
  accelerates: ['optimize_images', 'process_images'],
  installation: {
    npm: 'pnpm add sharp',
  },
};

export const LIBVIPS: ExtensionDefinition = {
  id: 'libvips',
  name: 'libvips',
  category: 'image_optimizer',
  description: 'Fast image processing library. 4-5x faster than ImageMagick with lower memory.',
  detectionCommands: [
    { command: 'vips --version', check: 'version', versionPattern: 'vips-(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which vips', check: 'exists' },
  ],
  performanceMultiplier: 5,
  accelerates: ['optimize_images', 'process_images'],
  installation: {
    brew: 'brew install vips',
    apt: 'apt-get install libvips-tools',
  },
};

export const IMAGEMAGICK: ExtensionDefinition = {
  id: 'imagemagick',
  name: 'ImageMagick',
  category: 'image_processor',
  description: 'Comprehensive image manipulation. Supports 200+ formats.',
  detectionCommands: [
    { command: 'convert --version', check: 'version', versionPattern: 'ImageMagick\\s*(\\d+\\.\\d+\\.\\d+)' },
    { command: 'magick --version', check: 'version', versionPattern: 'ImageMagick\\s*(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which convert', check: 'exists' },
  ],
  performanceMultiplier: 1,
  accelerates: ['process_images'],
  installation: {
    brew: 'brew install imagemagick',
    apt: 'apt-get install imagemagick',
  },
};

export const PNGQUANT: ExtensionDefinition = {
  id: 'pngquant',
  name: 'pngquant',
  category: 'image_optimizer',
  description: 'Lossy PNG compressor. 70% size reduction with minimal quality loss.',
  detectionCommands: [
    { command: 'pngquant --version', check: 'version', versionPattern: '(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which pngquant', check: 'exists' },
  ],
  performanceMultiplier: 2,
  accelerates: ['optimize_images'],
  installation: {
    brew: 'brew install pngquant',
    apt: 'apt-get install pngquant',
  },
};

export const OPTIPNG: ExtensionDefinition = {
  id: 'optipng',
  name: 'OptiPNG',
  category: 'image_optimizer',
  description: 'Lossless PNG optimizer. Reduces size without quality loss.',
  detectionCommands: [
    { command: 'optipng --version', check: 'version', versionPattern: 'OptiPNG version\\s*(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which optipng', check: 'exists' },
  ],
  performanceMultiplier: 1.5,
  accelerates: ['optimize_images'],
  installation: {
    brew: 'brew install optipng',
    apt: 'apt-get install optipng',
  },
};

export const JPEGOPTIM: ExtensionDefinition = {
  id: 'jpegoptim',
  name: 'jpegoptim',
  category: 'image_optimizer',
  description: 'JPEG optimizer with lossless and lossy modes.',
  detectionCommands: [
    { command: 'jpegoptim --version', check: 'version', versionPattern: 'v(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which jpegoptim', check: 'exists' },
  ],
  performanceMultiplier: 1.5,
  accelerates: ['optimize_images'],
  installation: {
    brew: 'brew install jpegoptim',
    apt: 'apt-get install jpegoptim',
  },
};

export const SVGO: ExtensionDefinition = {
  id: 'svgo',
  name: 'SVGO',
  category: 'image_optimizer',
  description: 'SVG optimizer. Removes metadata and optimizes paths.',
  detectionCommands: [
    { command: 'svgo --version', check: 'version', versionPattern: '(\\d+\\.\\d+\\.\\d+)' },
    { command: 'npx svgo --version', check: 'version' },
  ],
  performanceMultiplier: 2,
  accelerates: ['optimize_images'],
  installation: {
    npm: 'pnpm add -D svgo',
  },
};

// ============================================================================
// CSS Processing
// ============================================================================

export const LIGHTNING_CSS: ExtensionDefinition = {
  id: 'lightningcss',
  name: 'Lightning CSS',
  category: 'css_processor',
  description: 'Rust-based CSS parser, transformer, and minifier. 100x faster than PostCSS.',
  detectionCommands: [
    { command: 'lightningcss --version', check: 'version', versionPattern: '(\\d+\\.\\d+\\.\\d+)' },
    { command: 'npx lightningcss --version', check: 'version' },
  ],
  performanceMultiplier: 100,
  accelerates: ['process_css', 'minify_css'],
  installation: {
    npm: 'pnpm add -D lightningcss-cli',
  },
};

export const POSTCSS: ExtensionDefinition = {
  id: 'postcss',
  name: 'PostCSS',
  category: 'css_processor',
  description: 'CSS transformer with plugin ecosystem. Industry standard.',
  detectionCommands: [
    { command: 'postcss --version', check: 'version', versionPattern: '(\\d+\\.\\d+\\.\\d+)' },
    { command: 'npx postcss --version', check: 'version' },
  ],
  performanceMultiplier: 1,
  accelerates: ['process_css'],
  installation: {
    npm: 'pnpm add -D postcss postcss-cli',
  },
};

export const CSSNANO: ExtensionDefinition = {
  id: 'cssnano',
  name: 'cssnano',
  category: 'css_processor',
  description: 'CSS minifier built on PostCSS. Excellent compression.',
  detectionCommands: [
    { command: 'npm list cssnano', check: 'output_contains', contains: 'cssnano@' },
  ],
  performanceMultiplier: 1,
  accelerates: ['minify_css'],
  dependencies: ['postcss'],
  installation: {
    npm: 'pnpm add -D cssnano',
  },
};

// ============================================================================
// Linters & Formatters
// ============================================================================

export const OXLINT: ExtensionDefinition = {
  id: 'oxlint',
  name: 'Oxlint',
  category: 'linter',
  description: 'Rust-based JavaScript linter. 50-100x faster than ESLint.',
  detectionCommands: [
    { command: 'oxlint --version', check: 'version', versionPattern: 'oxlint version (\\d+\\.\\d+\\.\\d+)' },
    { command: 'npx oxlint --version', check: 'version' },
  ],
  performanceMultiplier: 100,
  accelerates: ['lint_javascript', 'lint_typescript'],
  installation: {
    npm: 'pnpm add -D oxlint',
    brew: 'brew install oxc',
  },
};

export const BIOME: ExtensionDefinition = {
  id: 'biome',
  name: 'Biome',
  category: 'linter',
  description: 'Rust-based linter and formatter. Fast alternative to ESLint + Prettier.',
  detectionCommands: [
    { command: 'biome --version', check: 'version', versionPattern: 'Version:\\s*(\\d+\\.\\d+\\.\\d+)' },
    { command: 'npx biome --version', check: 'version' },
  ],
  performanceMultiplier: 35,
  accelerates: ['lint_javascript', 'lint_typescript', 'format_code'],
  installation: {
    npm: 'pnpm add -D @biomejs/biome',
  },
};

export const ESLINT: ExtensionDefinition = {
  id: 'eslint',
  name: 'ESLint',
  category: 'linter',
  description: 'JavaScript linter. Industry standard with extensive plugin ecosystem.',
  detectionCommands: [
    { command: 'eslint --version', check: 'version', versionPattern: 'v(\\d+\\.\\d+\\.\\d+)' },
    { command: 'npx eslint --version', check: 'version' },
  ],
  performanceMultiplier: 1,
  accelerates: ['lint_javascript', 'lint_typescript'],
  installation: {
    npm: 'pnpm add -D eslint',
  },
};

export const PRETTIER: ExtensionDefinition = {
  id: 'prettier',
  name: 'Prettier',
  category: 'formatter',
  description: 'Opinionated code formatter. Industry standard.',
  detectionCommands: [
    { command: 'prettier --version', check: 'version', versionPattern: '(\\d+\\.\\d+\\.\\d+)' },
    { command: 'npx prettier --version', check: 'version' },
  ],
  performanceMultiplier: 1,
  accelerates: ['format_code'],
  installation: {
    npm: 'pnpm add -D prettier',
  },
};

// ============================================================================
// Caching & Compilation
// ============================================================================

export const CCACHE: ExtensionDefinition = {
  id: 'ccache',
  name: 'ccache',
  category: 'cache',
  description: 'Compiler cache for C/C++. 5-10x faster rebuilds.',
  detectionCommands: [
    { command: 'ccache --version', check: 'version', versionPattern: 'ccache version\\s*(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which ccache', check: 'exists' },
  ],
  performanceMultiplier: 10,
  accelerates: ['compile_native', 'cache_compilation'],
  installation: {
    brew: 'brew install ccache',
    apt: 'apt-get install ccache',
  },
};

export const SCCACHE: ExtensionDefinition = {
  id: 'sccache',
  name: 'sccache',
  category: 'cache',
  description: 'Shared compilation cache with cloud storage support.',
  detectionCommands: [
    { command: 'sccache --version', check: 'version', versionPattern: 'sccache\\s*(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which sccache', check: 'exists' },
  ],
  performanceMultiplier: 10,
  accelerates: ['compile_native', 'cache_compilation'],
  installation: {
    brew: 'brew install sccache',
    cargo: 'cargo install sccache',
  },
};

export const NODE_GYP: ExtensionDefinition = {
  id: 'node-gyp',
  name: 'node-gyp',
  category: 'native',
  description: 'Native Node.js addon build tool.',
  detectionCommands: [
    { command: 'node-gyp --version', check: 'version', versionPattern: 'v(\\d+\\.\\d+\\.\\d+)' },
    { command: 'npx node-gyp --version', check: 'version' },
  ],
  performanceMultiplier: 1,
  accelerates: ['compile_native'],
  installation: {
    npm: 'pnpm add -g node-gyp',
  },
};

// ============================================================================
// WebAssembly
// ============================================================================

export const WASM_OPT: ExtensionDefinition = {
  id: 'wasm-opt',
  name: 'wasm-opt',
  category: 'wasm',
  description: 'WebAssembly optimizer from Binaryen. 10-20% size reduction.',
  detectionCommands: [
    { command: 'wasm-opt --version', check: 'version', versionPattern: 'version\\s*(\\d+)' },
    { command: 'which wasm-opt', check: 'exists' },
  ],
  performanceMultiplier: 2,
  accelerates: ['optimize_wasm', 'build_wasm'],
  installation: {
    brew: 'brew install binaryen',
    apt: 'apt-get install binaryen',
    npm: 'pnpm add -D binaryen',
  },
};

export const WASM_PACK: ExtensionDefinition = {
  id: 'wasm-pack',
  name: 'wasm-pack',
  category: 'wasm',
  description: 'Build Rust to WebAssembly packages.',
  detectionCommands: [
    { command: 'wasm-pack --version', check: 'version', versionPattern: 'wasm-pack\\s*(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which wasm-pack', check: 'exists' },
  ],
  performanceMultiplier: 1,
  accelerates: ['build_wasm'],
  installation: {
    cargo: 'cargo install wasm-pack',
    brew: 'brew install wasm-pack',
  },
};

// ============================================================================
// Video Processing
// ============================================================================

export const FFMPEG: ExtensionDefinition = {
  id: 'ffmpeg',
  name: 'FFmpeg',
  category: 'video',
  description: 'Complete multimedia processing. Supports all video/audio formats.',
  detectionCommands: [
    { command: 'ffmpeg -version', check: 'version', versionPattern: 'ffmpeg version\\s*([\\d.]+)' },
    { command: 'which ffmpeg', check: 'exists' },
  ],
  performanceMultiplier: 1,
  accelerates: ['process_video'],
  installation: {
    brew: 'brew install ffmpeg',
    apt: 'apt-get install ffmpeg',
  },
};

// ============================================================================
// Utility Tools
// ============================================================================

export const RSYNC: ExtensionDefinition = {
  id: 'rsync',
  name: 'rsync',
  category: 'utility',
  description: 'Fast file synchronization with delta transfer.',
  detectionCommands: [
    { command: 'rsync --version', check: 'version', versionPattern: 'rsync\\s+version\\s+(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which rsync', check: 'exists' },
  ],
  performanceMultiplier: 5,
  accelerates: ['compress_assets'],
  installation: {
    brew: 'brew install rsync',
    apt: 'apt-get install rsync',
  },
};

export const PARALLEL: ExtensionDefinition = {
  id: 'parallel',
  name: 'GNU Parallel',
  category: 'utility',
  description: 'Parallel command execution. Maximize CPU utilization.',
  detectionCommands: [
    { command: 'parallel --version', check: 'version', versionPattern: 'GNU parallel (\\d+)' },
    { command: 'which parallel', check: 'exists' },
  ],
  performanceMultiplier: 4,
  accelerates: ['optimize_images', 'compress_assets'],
  installation: {
    brew: 'brew install parallel',
    apt: 'apt-get install parallel',
  },
};

// ============================================================================
// All Extensions Registry
// ============================================================================

export const ALL_EXTENSIONS: ExtensionDefinition[] = [
  // Bundlers
  ESBUILD, SWC, RSPACK, TURBOPACK,
  // Minifiers
  TERSER, UGLIFY_JS,
  // Compressors
  BROTLI, GZIP, ZSTD,
  // Image optimization
  SHARP, LIBVIPS, IMAGEMAGICK, PNGQUANT, OPTIPNG, JPEGOPTIM, SVGO,
  // CSS
  LIGHTNING_CSS, POSTCSS, CSSNANO,
  // Linters & formatters
  OXLINT, BIOME, ESLINT, PRETTIER,
  // Caching
  CCACHE, SCCACHE, NODE_GYP,
  // WebAssembly
  WASM_OPT, WASM_PACK,
  // Video
  FFMPEG,
  // Utilities
  RSYNC, PARALLEL,
];

/**
 * Get extensions by category
 */
export function getExtensionsByCategory(category: ExtensionCategory): ExtensionDefinition[] {
  return ALL_EXTENSIONS.filter(ext => ext.category === category);
}

/**
 * Get extensions that accelerate a specific operation
 */
export function getExtensionsForOperation(operation: BuildOperation): ExtensionDefinition[] {
  return ALL_EXTENSIONS.filter(ext => ext.accelerates.includes(operation));
}

/**
 * Get the recommended extension for an operation (highest performance multiplier)
 */
export function getRecommendedForOperation(operation: BuildOperation): ExtensionDefinition | null {
  const extensions = getExtensionsForOperation(operation);
  if (extensions.length === 0) return null;

  return extensions.reduce((best, ext) => {
    const bestMultiplier = best.performanceMultiplier ?? 1;
    const extMultiplier = ext.performanceMultiplier ?? 1;
    return extMultiplier > bestMultiplier ? ext : best;
  });
}
