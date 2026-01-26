/**
 * BuildNet Extension Types
 *
 * Defines types for external CLI tools and resources that can accelerate builds.
 * Workers discover these "extensions" in their local environment and report
 * capabilities to the master daemon.
 */

// ============================================================================
// Extension Categories
// ============================================================================

export type ExtensionCategory =
  | 'bundler'          // esbuild, swc, rspack, turbopack
  | 'transpiler'       // swc, babel, tsc
  | 'minifier'         // terser, swc, uglify-js, tdewolff/minify
  | 'compressor'       // brotli, gzip, zstd
  | 'image_optimizer'  // sharp, vips, pngquant, optipng, jpegoptim, svgo
  | 'image_processor'  // imagemagick, graphicsmagick
  | 'css_processor'    // lightningcss, postcss, cssnano
  | 'linter'           // oxlint, biome, eslint
  | 'formatter'        // biome, prettier, oxfmt
  | 'cache'            // ccache, sccache
  | 'compiler'         // gcc, clang, node-gyp
  | 'wasm'             // wasm-opt, wasm-pack, binaryen
  | 'video'            // ffmpeg
  | 'native'           // prebuildify, node-gyp
  | 'utility';         // other useful CLI tools

// ============================================================================
// Extension Definition
// ============================================================================

export interface ExtensionDefinition {
  /** Unique identifier for the extension */
  id: string;

  /** Human-readable name */
  name: string;

  /** Category of the extension */
  category: ExtensionCategory;

  /** Description of what this extension does */
  description: string;

  /** Commands to check if the extension is available */
  detectionCommands: DetectionCommand[];

  /** Minimum version required (semver) */
  minVersion?: string;

  /** Preferred/recommended version */
  preferredVersion?: string;

  /** Performance multiplier compared to baseline (e.g., 10 = 10x faster) */
  performanceMultiplier?: number;

  /** Build operations this extension accelerates */
  accelerates: BuildOperation[];

  /** Other extensions this depends on */
  dependencies?: string[];

  /** Extensions that conflict with this one */
  conflicts?: string[];

  /** Installation commands for different package managers */
  installation?: InstallationInfo;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface DetectionCommand {
  /** The command to run (e.g., "which esbuild" or "esbuild --version") */
  command: string;

  /** What to look for in the output */
  check: 'exists' | 'version' | 'output_contains';

  /** For 'output_contains', what string to look for */
  contains?: string;

  /** Regex to extract version from output */
  versionPattern?: string;

  /** Timeout in milliseconds */
  timeout?: number;
}

export interface InstallationInfo {
  /** npm/pnpm/yarn installation */
  npm?: string;

  /** Homebrew installation */
  brew?: string;

  /** apt installation (Debian/Ubuntu) */
  apt?: string;

  /** dnf installation (Fedora/RHEL) */
  dnf?: string;

  /** pacman installation (Arch Linux) */
  pacman?: string;

  /** apk installation (Alpine Linux) */
  apk?: string;

  /** Cargo (Rust) installation */
  cargo?: string;

  /** pip/pip3 installation (Python) */
  pip?: string;

  /** pipx installation (Python CLI tools) */
  pipx?: string;

  /** winget installation (Windows) */
  winget?: string;

  /** Chocolatey installation (Windows) */
  choco?: string;

  /** Manual installation URL or command */
  manual?: string;
}

// ============================================================================
// Build Operations
// ============================================================================

export type BuildOperation =
  | 'bundle_javascript'
  | 'bundle_typescript'
  | 'transpile_typescript'
  | 'transpile_jsx'
  | 'minify_javascript'
  | 'minify_css'
  | 'minify_html'
  | 'compress_assets'
  | 'optimize_images'
  | 'process_images'
  | 'process_css'
  | 'lint_javascript'
  | 'lint_typescript'
  | 'format_code'
  | 'compile_native'
  | 'build_wasm'
  | 'optimize_wasm'
  | 'process_video'
  | 'cache_compilation';

// ============================================================================
// Discovered Extension
// ============================================================================

export interface DiscoveredExtension {
  /** The extension definition */
  definition: ExtensionDefinition;

  /** Whether this extension is available */
  available: boolean;

  /** Absolute path to the executable */
  executablePath?: string;

  /** Detected version */
  version?: string;

  /** How long detection took */
  detectionTimeMs: number;

  /** When this was discovered */
  discoveredAt: Date;

  /** Any detection errors */
  error?: string;

  /** Performance benchmark results (if run) */
  benchmark?: ExtensionBenchmark;
}

export interface ExtensionBenchmark {
  /** Operation benchmarked */
  operation: BuildOperation;

  /** Input size in bytes */
  inputSizeBytes: number;

  /** Time taken in milliseconds */
  durationMs: number;

  /** Throughput (bytes per second) */
  throughputBytesPerSec: number;

  /** Memory usage peak in MB */
  memoryPeakMb?: number;

  /** Compared to baseline, how much faster (e.g., 2.5 = 2.5x faster) */
  speedupFactor?: number;
}

// ============================================================================
// Extension Capabilities Report
// ============================================================================

export interface ExtensionCapabilities {
  /** Worker ID reporting these capabilities */
  workerId: string;

  /** When capabilities were scanned */
  scannedAt: Date;

  /** How long the full scan took */
  scanDurationMs: number;

  /** System information */
  system: SystemInfo;

  /** Available extensions by category */
  byCategory: Map<ExtensionCategory, DiscoveredExtension[]>;

  /** All discovered extensions */
  extensions: DiscoveredExtension[];

  /** Extensions that are installed but have issues */
  degraded: DegradedExtension[];

  /** Recommended extensions that are missing */
  recommended: RecommendedExtension[];
}

export interface SystemInfo {
  /** Operating system */
  os: 'linux' | 'darwin' | 'win32';

  /** OS version */
  osVersion: string;

  /** CPU architecture */
  arch: 'x64' | 'arm64' | 'arm';

  /** Number of CPU cores */
  cpuCores: number;

  /** Total memory in MB */
  totalMemoryMb: number;

  /** Available memory in MB */
  availableMemoryMb: number;

  /** Node.js version */
  nodeVersion: string;

  /** npm/pnpm version */
  packageManager: string;
  packageManagerVersion: string;

  /** Shell being used */
  shell: string;
}

export interface DegradedExtension {
  /** The extension */
  extension: ExtensionDefinition;

  /** Why it's degraded */
  reason: 'old_version' | 'missing_dependency' | 'permission_error' | 'config_error';

  /** Detailed message */
  message: string;

  /** How to fix */
  fix?: string;
}

export interface RecommendedExtension {
  /** The extension */
  extension: ExtensionDefinition;

  /** Why it's recommended */
  reason: string;

  /** Expected performance improvement */
  expectedSpeedup: string;

  /** Priority (1-10, 10 being highest) */
  priority: number;
}

// ============================================================================
// Extension Registry
// ============================================================================

export interface ExtensionRegistry {
  /** All known extensions */
  definitions: Map<string, ExtensionDefinition>;

  /** Extensions by category */
  byCategory: Map<ExtensionCategory, ExtensionDefinition[]>;

  /** Extensions by operation they accelerate */
  byOperation: Map<BuildOperation, ExtensionDefinition[]>;

  /** Get all extensions for a category */
  getByCategory(category: ExtensionCategory): ExtensionDefinition[];

  /** Get best extension for an operation */
  getBestForOperation(operation: BuildOperation, available: DiscoveredExtension[]): DiscoveredExtension | null;

  /** Register a new extension definition */
  register(extension: ExtensionDefinition): void;
}

// ============================================================================
// Scanner Configuration
// ============================================================================

export interface ScannerConfig {
  /** Categories to scan for */
  categories?: ExtensionCategory[];

  /** Specific extensions to check */
  extensionIds?: string[];

  /** Run benchmarks after detection */
  runBenchmarks?: boolean;

  /** Timeout for each detection command */
  detectionTimeoutMs?: number;

  /** Maximum concurrent detection commands */
  maxConcurrent?: number;

  /** Additional paths to search for executables */
  additionalPaths?: string[];

  /** Skip detection for known unavailable extensions */
  useCache?: boolean;

  /** Cache TTL in milliseconds */
  cacheTtlMs?: number;
}

// ============================================================================
// Scanner Events
// ============================================================================

export interface ScannerEvents {
  'scan:started': { config: ScannerConfig; totalExtensions: number };
  'scan:progress': { checked: number; total: number; current: string };
  'scan:extension:found': DiscoveredExtension;
  'scan:extension:missing': { id: string; reason: string };
  'scan:benchmark:started': { extensionId: string; operation: BuildOperation };
  'scan:benchmark:completed': { extensionId: string; benchmark: ExtensionBenchmark };
  'scan:completed': ExtensionCapabilities;
  'scan:error': { error: Error };
}
