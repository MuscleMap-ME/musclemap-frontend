/**
 * BuildNet Extensions Module
 *
 * Provides discovery, management, and installation of external CLI tools
 * that can accelerate build processes.
 *
 * Features:
 * - 60+ built-in extension definitions (bundlers, compilers, optimizers)
 * - 35+ compiler/toolchain definitions (GCC, Clang, Rust, Go, Python, etc.)
 * - Automatic detection of available tools
 * - Multi-package-manager installation support (brew, apt, npm, cargo, etc.)
 * - AI-friendly fluent configuration API
 * - Safe fallbacks and graceful degradation
 *
 * @example
 * ```typescript
 * import {
 *   createExtensionScanner,
 *   createExtensionInstaller,
 *   buildConfig
 * } from '@musclemap.me/buildnet-core/extensions';
 *
 * // Scan for available extensions
 * const scanner = createExtensionScanner();
 * const capabilities = await scanner.scan('worker-1');
 *
 * // See what's available
 * console.log('Available bundlers:', capabilities.byCategory.get('bundler'));
 * console.log('Missing recommendations:', capabilities.recommended);
 *
 * // Install missing high-impact extensions
 * const installer = createExtensionInstaller();
 * await installer.initialize();
 *
 * const missing = capabilities.extensions
 *   .filter(e => !e.available && e.definition.performanceMultiplier >= 10)
 *   .map(e => e.definition);
 *
 * const plan = await installer.createInstallationPlan(missing);
 * console.log(installer.generateInstallationSummary(plan));
 *
 * // Execute installation
 * const results = await installer.executeInstallation(plan);
 *
 * // AI-friendly fluent config
 * const config = buildConfig()
 *   .target('web')
 *   .language('typescript')
 *   .optimize('speed')
 *   .build();
 * ```
 */

// Types
export type {
  ExtensionCategory,
  ExtensionDefinition,
  DetectionCommand,
  InstallationInfo,
  BuildOperation,
  DiscoveredExtension,
  ExtensionBenchmark,
  ExtensionCapabilities,
  SystemInfo,
  DegradedExtension,
  RecommendedExtension,
  ExtensionRegistry,
  ScannerConfig,
  ScannerEvents,
} from './types.js';

// Extension Definitions
export {
  ALL_EXTENSIONS,
  getExtensionsByCategory,
  getExtensionsForOperation,
  getRecommendedForOperation,
  // Individual extension definitions
  ESBUILD,
  SWC,
  RSPACK,
  TURBOPACK,
  TERSER,
  UGLIFY_JS,
  BROTLI,
  GZIP,
  ZSTD,
  SHARP,
  LIBVIPS,
  IMAGEMAGICK,
  PNGQUANT,
  OPTIPNG,
  JPEGOPTIM,
  SVGO,
  LIGHTNING_CSS,
  POSTCSS,
  CSSNANO,
  OXLINT,
  BIOME,
  ESLINT,
  PRETTIER,
  CCACHE,
  SCCACHE,
  NODE_GYP,
  WASM_OPT,
  WASM_PACK,
  FFMPEG,
  RSYNC,
  PARALLEL,
} from './definitions.js';

// Compiler & Toolchain Definitions
export type {
  CompilerCategory,
  CompilerTarget,
  CompilerDefinition,
} from './compilers.js';

export {
  ALL_COMPILERS,
  getCompilersForLanguage,
  getCompilersForTarget,
  getCrossCompilers,
  getCompilerForExtension,
  // Individual compiler definitions
  GCC,
  GPP,
  CLANG,
  CLANGPP,
  MSVC,
  XCODE,
  SWIFT,
  ANDROID_NDK,
  JAVA,
  KOTLIN,
  SCALA,
  GROOVY,
  DOTNET,
  MONO,
  RUST,
  GO,
  ZIG,
  NIM,
  PYTHON,
  PYPY,
  RUBY,
  PHP,
  PERL,
  HASKELL,
  OCAML,
  ERLANG,
  ELIXIR,
  MAKE,
  CMAKE,
  NINJA,
  MESON,
  BAZEL,
  DOCKER,
  PODMAN,
  FLUTTER,
  DART,
} from './compilers.js';

// Scanner
export {
  ExtensionScanner,
  createExtensionScanner,
  quickScan,
  fullScan,
} from './scanner.js';

// Installer
export type {
  PackageManagerType,
  PackageManager,
  InstallationPlan,
  PlannedInstallation,
  ExpectedBenefit,
  Prerequisite,
  InstallationResult,
  InstallerEvents,
} from './installer.js';

export {
  ExtensionInstaller,
  createExtensionInstaller,
  quickInstall,
} from './installer.js';

// ============================================================================
// Unified Registry - Combines Extensions + Compilers
// ============================================================================

import { ALL_EXTENSIONS, getExtensionsByCategory } from './definitions.js';
import { ALL_COMPILERS, getCompilersForLanguage, getCompilersForTarget } from './compilers.js';
import type { ExtensionDefinition, ExtensionCategory, ExtensionCapabilities } from './types.js';
import type { CompilerDefinition, CompilerTarget } from './compilers.js';

/**
 * Unified registry of all available tools (extensions + compilers).
 */
export interface UnifiedRegistry {
  /** All extension definitions */
  extensions: ExtensionDefinition[];

  /** All compiler definitions */
  compilers: CompilerDefinition[];

  /** Total tool count */
  totalCount: number;

  /** Get all tools (extensions + compilers) */
  getAllTools(): (ExtensionDefinition | CompilerDefinition)[];

  /** Get tools by category */
  getByCategory(category: ExtensionCategory): ExtensionDefinition[];

  /** Get compilers for a language */
  getCompilersForLanguage(language: string): CompilerDefinition[];

  /** Get compilers for a target platform */
  getCompilersForTarget(target: CompilerTarget): CompilerDefinition[];

  /** Get recommended tools for common workflows */
  getRecommendedForWorkflow(workflow: WorkflowType): ToolRecommendation[];
}

export type WorkflowType =
  | 'web-frontend'    // React/Vue/Svelte apps
  | 'web-backend'     // Node.js APIs
  | 'mobile-native'   // React Native, Flutter
  | 'mobile-hybrid'   // Capacitor, Cordova
  | 'desktop-electron'// Electron apps
  | 'cli-tool'        // CLI applications
  | 'library-npm'     // npm packages
  | 'monorepo'        // Large monorepos
  | 'microservices'   // Microservice architecture
  | 'data-science'    // Python/R data projects
  | 'game-dev'        // Game development
  | 'embedded'        // Embedded systems
  | 'wasm';           // WebAssembly

export interface ToolRecommendation {
  tool: ExtensionDefinition | CompilerDefinition;
  reason: string;
  priority: 'essential' | 'recommended' | 'optional';
  expectedBenefit: string;
}

/**
 * Create a unified registry of all tools.
 */
export function createUnifiedRegistry(): UnifiedRegistry {
  return {
    extensions: ALL_EXTENSIONS,
    compilers: ALL_COMPILERS,
    totalCount: ALL_EXTENSIONS.length + ALL_COMPILERS.length,

    getAllTools() {
      return [...ALL_EXTENSIONS, ...ALL_COMPILERS];
    },

    getByCategory(category: ExtensionCategory) {
      return getExtensionsByCategory(category);
    },

    getCompilersForLanguage(language: string) {
      return getCompilersForLanguage(language);
    },

    getCompilersForTarget(target: CompilerTarget) {
      return getCompilersForTarget(target);
    },

    getRecommendedForWorkflow(workflow: WorkflowType): ToolRecommendation[] {
      const recommendations: ToolRecommendation[] = [];

      // Common recommendations for all workflows
      const addEssential = (id: string, reason: string, benefit: string) => {
        const tool = ALL_EXTENSIONS.find(e => e.id === id) ||
                     ALL_COMPILERS.find(c => c.id === id);
        if (tool) {
          recommendations.push({
            tool,
            reason,
            priority: 'essential',
            expectedBenefit: benefit,
          });
        }
      };

      const addRecommended = (id: string, reason: string, benefit: string) => {
        const tool = ALL_EXTENSIONS.find(e => e.id === id) ||
                     ALL_COMPILERS.find(c => c.id === id);
        if (tool) {
          recommendations.push({
            tool,
            reason,
            priority: 'recommended',
            expectedBenefit: benefit,
          });
        }
      };

      const addOptional = (id: string, reason: string, benefit: string) => {
        const tool = ALL_EXTENSIONS.find(e => e.id === id) ||
                     ALL_COMPILERS.find(c => c.id === id);
        if (tool) {
          recommendations.push({
            tool,
            reason,
            priority: 'optional',
            expectedBenefit: benefit,
          });
        }
      };

      switch (workflow) {
        case 'web-frontend':
          addEssential('esbuild', 'Ultra-fast bundler', '100x faster builds');
          addEssential('swc', 'Fast TypeScript transpilation', '20x faster than Babel');
          addRecommended('lightningcss', 'Lightning-fast CSS processing', '100x faster than PostCSS');
          addRecommended('biome', 'Fast linting & formatting', '35x faster than ESLint+Prettier');
          addRecommended('brotli', 'Best compression for web', '20-26% smaller than gzip');
          addOptional('sharp', 'Image optimization', '5x faster than ImageMagick');
          break;

        case 'web-backend':
          addEssential('esbuild', 'Fast bundler for Node.js', '100x faster builds');
          addEssential('swc', 'Fast TypeScript compilation', '20x faster than tsc');
          addRecommended('biome', 'Fast linting', '35x faster than ESLint');
          addOptional('zstd', 'Fast compression', '42% faster than Brotli');
          break;

        case 'mobile-native':
          addEssential('flutter', 'Cross-platform UI toolkit', 'Single codebase for iOS/Android');
          addRecommended('swift', 'iOS development', 'Native iOS performance');
          addRecommended('kotlin', 'Android development', 'Modern Android language');
          addOptional('android-ndk', 'Native Android code', 'C/C++ for performance');
          break;

        case 'monorepo':
          addEssential('esbuild', 'Ultra-fast bundler', '100x faster builds');
          addEssential('turbopack', 'Incremental bundling', 'Smart caching across packages');
          addRecommended('biome', 'Monorepo-wide linting', 'Consistent code style');
          addRecommended('ccache', 'Compilation caching', '5-10x faster rebuilds');
          addOptional('bazel', 'Advanced build system', 'Excellent for large repos');
          break;

        case 'wasm':
          addEssential('rust', 'Best WASM target', 'Optimal WASM output');
          addEssential('wasm-pack', 'WASM build tool', 'Seamless npm integration');
          addRecommended('wasm-opt', 'WASM optimizer', '10-20% size reduction');
          addOptional('zig', 'Alternative WASM target', 'Excellent cross-compilation');
          break;

        case 'data-science':
          addEssential('python', 'Data science standard', 'Rich ecosystem');
          addRecommended('pypy', 'Fast Python', '7x faster execution');
          addOptional('rust', 'Performance-critical code', 'Native speed');
          break;

        case 'embedded':
          addEssential('gcc', 'GCC toolchain', 'Wide target support');
          addRecommended('clang', 'LLVM toolchain', 'Better diagnostics');
          addRecommended('zig', 'Modern systems language', 'Excellent cross-compilation');
          addRecommended('ccache', 'Build caching', '5-10x faster rebuilds');
          addOptional('cmake', 'Build system', 'Cross-platform builds');
          break;

        default:
          // Generic recommendations
          addEssential('esbuild', 'Fast JavaScript bundler', '100x faster');
          addRecommended('biome', 'Linting & formatting', '35x faster');
      }

      return recommendations;
    },
  };
}

// ============================================================================
// AI-Friendly Fluent Build Configuration API
// ============================================================================

export interface BuildConfigOptions {
  target?: CompilerTarget | CompilerTarget[];
  language?: string | string[];
  optimization?: 'speed' | 'size' | 'balanced';
  features?: string[];
  bundler?: 'esbuild' | 'swc' | 'rspack' | 'turbopack' | 'auto';
  minifier?: 'esbuild' | 'swc' | 'terser' | 'auto';
  linter?: 'oxlint' | 'biome' | 'eslint' | 'auto';
  compressor?: 'brotli' | 'gzip' | 'zstd' | 'auto';
  imageOptimizer?: 'sharp' | 'vips' | 'imagemagick' | 'auto';
  cssProcessor?: 'lightningcss' | 'postcss' | 'auto';
  sourceMaps?: boolean;
  treeshaking?: boolean;
  splitting?: boolean;
  watch?: boolean;
  incremental?: boolean;
}

export interface BuildConfigResult {
  /** Selected tools for this configuration */
  tools: {
    bundler: ExtensionDefinition | null;
    minifier: ExtensionDefinition | null;
    linter: ExtensionDefinition | null;
    compressor: ExtensionDefinition | null;
    imageOptimizer: ExtensionDefinition | null;
    cssProcessor: ExtensionDefinition | null;
    compilers: CompilerDefinition[];
  };

  /** Recommended installation commands */
  installCommands: string[];

  /** Build options for each tool */
  buildOptions: Record<string, Record<string, unknown>>;

  /** Estimated build performance */
  estimatedPerformance: {
    buildTimeMultiplier: number;
    description: string;
  };

  /** Warnings and notes */
  notes: string[];
}

class FluentBuildConfig {
  private options: BuildConfigOptions = {};

  target(t: CompilerTarget | CompilerTarget[]): this {
    this.options.target = t;
    return this;
  }

  language(l: string | string[]): this {
    this.options.language = l;
    return this;
  }

  optimize(level: 'speed' | 'size' | 'balanced'): this {
    this.options.optimization = level;
    return this;
  }

  features(...features: string[]): this {
    this.options.features = features;
    return this;
  }

  bundler(b: BuildConfigOptions['bundler']): this {
    this.options.bundler = b;
    return this;
  }

  minifier(m: BuildConfigOptions['minifier']): this {
    this.options.minifier = m;
    return this;
  }

  linter(l: BuildConfigOptions['linter']): this {
    this.options.linter = l;
    return this;
  }

  compressor(c: BuildConfigOptions['compressor']): this {
    this.options.compressor = c;
    return this;
  }

  sourceMaps(enabled: boolean = true): this {
    this.options.sourceMaps = enabled;
    return this;
  }

  treeshaking(enabled: boolean = true): this {
    this.options.treeshaking = enabled;
    return this;
  }

  splitting(enabled: boolean = true): this {
    this.options.splitting = enabled;
    return this;
  }

  watch(enabled: boolean = true): this {
    this.options.watch = enabled;
    return this;
  }

  incremental(enabled: boolean = true): this {
    this.options.incremental = enabled;
    return this;
  }

  build(): BuildConfigResult {
    const tools: BuildConfigResult['tools'] = {
      bundler: null,
      minifier: null,
      linter: null,
      compressor: null,
      imageOptimizer: null,
      cssProcessor: null,
      compilers: [],
    };

    const installCommands: string[] = [];
    const buildOptions: Record<string, Record<string, unknown>> = {};
    const notes: string[] = [];

    // Select bundler
    const bundlerId = this.options.bundler === 'auto' ? 'esbuild' : (this.options.bundler ?? 'esbuild');
    tools.bundler = ALL_EXTENSIONS.find(e => e.id === bundlerId) ?? null;

    // Select minifier
    const minifierId = this.options.minifier === 'auto' ? 'esbuild' : (this.options.minifier ?? 'esbuild');
    tools.minifier = ALL_EXTENSIONS.find(e => e.id === minifierId) ?? null;

    // Select linter
    const linterId = this.options.linter === 'auto' ? 'biome' : (this.options.linter ?? 'biome');
    tools.linter = ALL_EXTENSIONS.find(e => e.id === linterId) ?? null;

    // Select compressor based on optimization goal
    let compressorId = this.options.compressor;
    if (compressorId === 'auto' || !compressorId) {
      compressorId = this.options.optimization === 'size' ? 'brotli' :
                     this.options.optimization === 'speed' ? 'zstd' : 'brotli';
    }
    tools.compressor = ALL_EXTENSIONS.find(e => e.id === compressorId) ?? null;

    // Select CSS processor
    const cssId = this.options.cssProcessor === 'auto' ? 'lightningcss' : (this.options.cssProcessor ?? 'lightningcss');
    tools.cssProcessor = ALL_EXTENSIONS.find(e => e.id === cssId) ?? null;

    // Select image optimizer
    const imgId = this.options.imageOptimizer === 'auto' ? 'sharp' : (this.options.imageOptimizer ?? 'sharp');
    tools.imageOptimizer = ALL_EXTENSIONS.find(e => e.id === imgId) ?? null;

    // Select compilers based on language
    const languages = Array.isArray(this.options.language)
      ? this.options.language
      : this.options.language ? [this.options.language] : [];

    for (const lang of languages) {
      const compilers = getCompilersForLanguage(lang);
      if (compilers.length > 0) {
        tools.compilers.push(compilers[0]); // Best compiler for language
      }
    }

    // Generate install commands
    const toolsToInstall = [
      tools.bundler,
      tools.minifier,
      tools.linter,
      tools.compressor,
      tools.cssProcessor,
      tools.imageOptimizer,
    ].filter(Boolean) as ExtensionDefinition[];

    for (const tool of toolsToInstall) {
      if (tool.installation?.npm) {
        installCommands.push(tool.installation.npm);
      } else if (tool.installation?.brew) {
        installCommands.push(tool.installation.brew);
      }
    }

    // Calculate estimated performance
    const multipliers = toolsToInstall.map(t => t.performanceMultiplier ?? 1);
    const avgMultiplier = multipliers.length > 0
      ? multipliers.reduce((a, b) => a + b, 0) / multipliers.length
      : 1;

    // Build options for esbuild
    if (tools.bundler?.id === 'esbuild') {
      buildOptions.esbuild = {
        bundle: true,
        minify: this.options.optimization === 'size',
        sourcemap: this.options.sourceMaps ?? false,
        treeShaking: this.options.treeshaking ?? true,
        splitting: this.options.splitting ?? false,
        format: 'esm',
        target: 'es2020',
      };
    }

    // Add notes
    if (this.options.optimization === 'speed') {
      notes.push('Optimizing for build speed - using fastest tools available');
    } else if (this.options.optimization === 'size') {
      notes.push('Optimizing for output size - using best compression');
    }

    return {
      tools,
      installCommands,
      buildOptions,
      estimatedPerformance: {
        buildTimeMultiplier: avgMultiplier,
        description: avgMultiplier > 50 ? 'Extremely fast (50x+ improvement)' :
                     avgMultiplier > 10 ? 'Very fast (10x+ improvement)' :
                     avgMultiplier > 2 ? 'Fast (2x+ improvement)' :
                     'Standard performance',
      },
      notes,
    };
  }
}

/**
 * Create a fluent build configuration.
 *
 * @example
 * ```typescript
 * const config = buildConfig()
 *   .target('web')
 *   .language('typescript')
 *   .optimize('speed')
 *   .sourceMaps(true)
 *   .build();
 *
 * console.log(config.estimatedPerformance.description);
 * // "Extremely fast (50x+ improvement)"
 * ```
 */
export function buildConfig(): FluentBuildConfig {
  return new FluentBuildConfig();
}

// ============================================================================
// Safe Fallback Utilities
// ============================================================================

/**
 * Get the best available tool for an operation, with fallbacks.
 *
 * @example
 * ```typescript
 * const bundler = await getBestAvailable('bundle_javascript', capabilities);
 * // Returns esbuild if available, falls back to swc, then rspack, then null
 * ```
 */
export async function getBestAvailable(
  operation: string,
  capabilities?: ExtensionCapabilities
): Promise<ExtensionDefinition | null> {
  // Define fallback chains for operations
  const fallbackChains: Record<string, string[]> = {
    bundle_javascript: ['esbuild', 'swc', 'rspack', 'turbopack'],
    bundle_typescript: ['esbuild', 'swc', 'rspack'],
    transpile_typescript: ['swc', 'esbuild', 'tsc'],
    minify_javascript: ['esbuild', 'swc', 'terser', 'uglify-js'],
    minify_css: ['lightningcss', 'cssnano', 'postcss'],
    compress_assets: ['brotli', 'zstd', 'gzip'],
    optimize_images: ['sharp', 'libvips', 'imagemagick', 'pngquant'],
    lint_javascript: ['oxlint', 'biome', 'eslint'],
    lint_typescript: ['oxlint', 'biome', 'eslint'],
    format_code: ['biome', 'prettier'],
  };

  const chain = fallbackChains[operation] ?? [];

  // If we have capabilities, check what's actually available
  if (capabilities) {
    for (const toolId of chain) {
      const found = capabilities.extensions.find(
        e => e.definition.id === toolId && e.available
      );
      if (found) {
        return found.definition;
      }
    }
  }

  // Otherwise return the first in the chain (best theoretical option)
  for (const toolId of chain) {
    const tool = ALL_EXTENSIONS.find(e => e.id === toolId);
    if (tool) return tool;
  }

  return null;
}

/**
 * Check if a specific tool is available with safe error handling.
 */
export async function isToolAvailable(toolId: string): Promise<boolean> {
  try {
    const scanner = createExtensionScanner({ extensionIds: [toolId] });
    const capabilities = await scanner.scan();
    const tool = capabilities.extensions.find(e => e.definition.id === toolId);
    return tool?.available ?? false;
  } catch {
    return false;
  }
}

/**
 * Get installation instructions for missing tools.
 */
export function getInstallInstructions(
  toolId: string,
  platform: 'darwin' | 'linux' | 'win32' = process.platform as 'darwin' | 'linux' | 'win32'
): string | null {
  const tool = ALL_EXTENSIONS.find(e => e.id === toolId) ||
               ALL_COMPILERS.find(c => c.id === toolId);

  if (!tool?.installation) return null;

  if (platform === 'darwin' && tool.installation.brew) {
    return tool.installation.brew;
  }

  if (platform === 'linux' && tool.installation.apt) {
    return tool.installation.apt;
  }

  if (tool.installation.npm) {
    return tool.installation.npm;
  }

  if (tool.installation.cargo) {
    return tool.installation.cargo;
  }

  return tool.installation.manual ?? null;
}

import { createExtensionScanner } from './scanner.js';
