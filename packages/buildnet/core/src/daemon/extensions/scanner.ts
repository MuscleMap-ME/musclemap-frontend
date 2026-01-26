/**
 * BuildNet Extension Scanner
 *
 * Scans the local environment to discover available CLI tools and extensions.
 * Reports capabilities to the master daemon so workers know what tools they can use.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as os from 'node:os';
import { EventEmitter } from 'eventemitter3';
import type {
  ExtensionDefinition,
  ExtensionCategory,
  DiscoveredExtension,
  ExtensionCapabilities,
  SystemInfo,
  DegradedExtension,
  RecommendedExtension,
  ScannerConfig,
  ScannerEvents,
  BuildOperation,
} from './types.js';
import { ALL_EXTENSIONS, getRecommendedForOperation } from './definitions.js';

const execAsync = promisify(exec);

// ============================================================================
// Extension Scanner
// ============================================================================

export class ExtensionScanner extends EventEmitter {
  private config: Required<ScannerConfig>;
  private cache: Map<string, DiscoveredExtension> = new Map();
  private lastScanTime: Date | null = null;

  constructor(config: Partial<ScannerConfig> = {}) {
    super();
    this.config = {
      categories: config.categories ?? [],
      extensionIds: config.extensionIds ?? [],
      runBenchmarks: config.runBenchmarks ?? false,
      detectionTimeoutMs: config.detectionTimeoutMs ?? 5000,
      maxConcurrent: config.maxConcurrent ?? 10,
      additionalPaths: config.additionalPaths ?? [],
      useCache: config.useCache ?? true,
      cacheTtlMs: config.cacheTtlMs ?? 300000, // 5 minutes
    };
  }

  /**
   * Scan for all available extensions.
   */
  async scan(workerId: string = 'local'): Promise<ExtensionCapabilities> {
    const startTime = Date.now();

    // Determine which extensions to scan
    let extensionsToScan = ALL_EXTENSIONS;

    if (this.config.extensionIds.length > 0) {
      extensionsToScan = extensionsToScan.filter(ext =>
        this.config.extensionIds.includes(ext.id)
      );
    }

    if (this.config.categories.length > 0) {
      extensionsToScan = extensionsToScan.filter(ext =>
        this.config.categories.includes(ext.category)
      );
    }

    this.emit('scan:started', {
      config: this.config,
      totalExtensions: extensionsToScan.length,
    });

    // Get system info first
    const system = await this.getSystemInfo();

    // Scan extensions in parallel batches
    const discovered: DiscoveredExtension[] = [];
    const batches = this.chunkArray(extensionsToScan, this.config.maxConcurrent);

    let checked = 0;
    for (const batch of batches) {
      const results = await Promise.all(
        batch.map(ext => this.detectExtension(ext))
      );

      for (const result of results) {
        checked++;
        this.emit('scan:progress', {
          checked,
          total: extensionsToScan.length,
          current: result.definition.name,
        });

        discovered.push(result);

        if (result.available) {
          this.emit('scan:extension:found', result);
        } else {
          this.emit('scan:extension:missing', {
            id: result.definition.id,
            reason: result.error ?? 'Not found',
          });
        }
      }
    }

    // Categorize results
    const byCategory = new Map<ExtensionCategory, DiscoveredExtension[]>();
    for (const ext of discovered) {
      const category = ext.definition.category;
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(ext);
    }

    // Find degraded extensions
    const degraded = this.findDegradedExtensions(discovered);

    // Find recommended missing extensions
    const recommended = this.findRecommendedExtensions(discovered);

    const scanDurationMs = Date.now() - startTime;
    this.lastScanTime = new Date();

    const capabilities: ExtensionCapabilities = {
      workerId,
      scannedAt: this.lastScanTime,
      scanDurationMs,
      system,
      byCategory,
      extensions: discovered,
      degraded,
      recommended,
    };

    this.emit('scan:completed', capabilities);

    return capabilities;
  }

  /**
   * Detect a single extension.
   */
  async detectExtension(definition: ExtensionDefinition): Promise<DiscoveredExtension> {
    const startTime = Date.now();

    // Check cache first
    if (this.config.useCache && this.cache.has(definition.id)) {
      const cached = this.cache.get(definition.id)!;
      const cacheAge = Date.now() - cached.discoveredAt.getTime();
      if (cacheAge < this.config.cacheTtlMs) {
        return cached;
      }
    }

    let available = false;
    let executablePath: string | undefined;
    let version: string | undefined;
    let error: string | undefined;

    // Try each detection command
    for (const cmd of definition.detectionCommands) {
      try {
        const result = await this.runDetectionCommand(cmd.command, cmd.timeout ?? this.config.detectionTimeoutMs);

        if (cmd.check === 'exists') {
          if (result.stdout.trim()) {
            available = true;
            executablePath = result.stdout.trim().split('\n')[0];
          }
        } else if (cmd.check === 'version') {
          if (cmd.versionPattern) {
            const match = result.stdout.match(new RegExp(cmd.versionPattern));
            if (match && match[1]) {
              available = true;
              version = match[1];
            }
          } else if (result.stdout.trim()) {
            available = true;
          }
        } else if (cmd.check === 'output_contains') {
          if (cmd.contains && result.stdout.includes(cmd.contains)) {
            available = true;
            const versionMatch = result.stdout.match(/@(\d+\.\d+\.\d+)/);
            if (versionMatch) {
              version = versionMatch[1];
            }
          }
        }

        if (available) break;
      } catch (err) {
        // Command failed, try next
        error = err instanceof Error ? err.message : String(err);
      }
    }

    const discovered: DiscoveredExtension = {
      definition,
      available,
      executablePath,
      version,
      detectionTimeMs: Date.now() - startTime,
      discoveredAt: new Date(),
      error: available ? undefined : error,
    };

    // Update cache
    this.cache.set(definition.id, discovered);

    return discovered;
  }

  /**
   * Run a detection command with timeout.
   */
  private async runDetectionCommand(
    command: string,
    timeout: number
  ): Promise<{ stdout: string; stderr: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Add additional paths to PATH
      const env = { ...process.env };
      if (this.config.additionalPaths.length > 0) {
        env.PATH = [...this.config.additionalPaths, env.PATH].join(':');
      }

      const result = await execAsync(command, {
        timeout,
        env,
        signal: controller.signal,
      });

      return result;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get system information.
   */
  async getSystemInfo(): Promise<SystemInfo> {
    const cpus = os.cpus();
    const totalMemoryMb = Math.round(os.totalmem() / (1024 * 1024));
    const freeMemoryMb = Math.round(os.freemem() / (1024 * 1024));

    // Get Node version
    const nodeVersion = process.version;

    // Get package manager version
    let packageManager = 'npm';
    let packageManagerVersion = 'unknown';

    try {
      const { stdout: pnpmVersion } = await execAsync('pnpm --version', { timeout: 2000 });
      packageManager = 'pnpm';
      packageManagerVersion = pnpmVersion.trim();
    } catch {
      try {
        const { stdout: npmVersion } = await execAsync('npm --version', { timeout: 2000 });
        packageManagerVersion = npmVersion.trim();
      } catch {
        // Ignore
      }
    }

    // Get shell
    const shell = process.env.SHELL ?? '/bin/sh';

    // Get OS version
    let osVersion = os.release();
    try {
      if (os.platform() === 'darwin') {
        const { stdout } = await execAsync('sw_vers -productVersion', { timeout: 2000 });
        osVersion = stdout.trim();
      } else if (os.platform() === 'linux') {
        const { stdout } = await execAsync('cat /etc/os-release | grep VERSION_ID', { timeout: 2000 });
        const match = stdout.match(/VERSION_ID="?([^"\n]+)"?/);
        if (match) osVersion = match[1];
      }
    } catch {
      // Use default os.release()
    }

    return {
      os: os.platform() as 'linux' | 'darwin' | 'win32',
      osVersion,
      arch: os.arch() as 'x64' | 'arm64' | 'arm',
      cpuCores: cpus.length,
      totalMemoryMb,
      availableMemoryMb: freeMemoryMb,
      nodeVersion,
      packageManager,
      packageManagerVersion,
      shell,
    };
  }

  /**
   * Find extensions that are installed but have issues.
   */
  private findDegradedExtensions(discovered: DiscoveredExtension[]): DegradedExtension[] {
    const degraded: DegradedExtension[] = [];

    for (const ext of discovered) {
      if (!ext.available) continue;

      // Check for old versions
      if (ext.definition.minVersion && ext.version) {
        if (this.compareVersions(ext.version, ext.definition.minVersion) < 0) {
          degraded.push({
            extension: ext.definition,
            reason: 'old_version',
            message: `Version ${ext.version} is older than minimum required ${ext.definition.minVersion}`,
            fix: ext.definition.installation?.npm ?? ext.definition.installation?.brew ?? 'Update to latest version',
          });
        }
      }

      // Check for missing dependencies
      if (ext.definition.dependencies) {
        for (const depId of ext.definition.dependencies) {
          const dep = discovered.find(d => d.definition.id === depId);
          if (!dep?.available) {
            degraded.push({
              extension: ext.definition,
              reason: 'missing_dependency',
              message: `Missing required dependency: ${depId}`,
              fix: `Install ${depId} first`,
            });
          }
        }
      }
    }

    return degraded;
  }

  /**
   * Find recommended extensions that are missing.
   */
  private findRecommendedExtensions(discovered: DiscoveredExtension[]): RecommendedExtension[] {
    const recommended: RecommendedExtension[] = [];
    const availableIds = new Set(discovered.filter(d => d.available).map(d => d.definition.id));

    // Check for high-impact missing extensions
    const highImpactOperations: BuildOperation[] = [
      'bundle_javascript',
      'minify_javascript',
      'optimize_images',
      'compress_assets',
      'lint_javascript',
    ];

    for (const operation of highImpactOperations) {
      const best = getRecommendedForOperation(operation);
      if (best && !availableIds.has(best.id)) {
        const multiplier = best.performanceMultiplier ?? 1;
        if (multiplier >= 5) {
          recommended.push({
            extension: best,
            reason: `Best tool for ${operation.replace(/_/g, ' ')}`,
            expectedSpeedup: `${multiplier}x faster`,
            priority: Math.min(10, Math.round(multiplier / 2)),
          });
        }
      }
    }

    // Check for missing compressors
    const hasCompressor = ['brotli', 'gzip', 'zstd'].some(id => availableIds.has(id));
    if (!hasCompressor) {
      const zstd = ALL_EXTENSIONS.find(e => e.id === 'zstd');
      if (zstd) {
        recommended.push({
          extension: zstd,
          reason: 'No compression tool available',
          expectedSpeedup: '42% faster than Brotli',
          priority: 8,
        });
      }
    }

    // Check for image optimizers
    const hasImageOptimizer = ['sharp', 'libvips', 'pngquant', 'optipng'].some(id => availableIds.has(id));
    if (!hasImageOptimizer) {
      const sharp = ALL_EXTENSIONS.find(e => e.id === 'sharp');
      if (sharp) {
        recommended.push({
          extension: sharp,
          reason: 'No image optimization tool available',
          expectedSpeedup: '5x faster than ImageMagick',
          priority: 7,
        });
      }
    }

    // Sort by priority
    return recommended.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Compare semantic versions.
   * Returns: -1 if a < b, 0 if a == b, 1 if a > b
   */
  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(n => parseInt(n, 10) || 0);
    const partsB = b.split('.').map(n => parseInt(n, 10) || 0);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] ?? 0;
      const partB = partsB[i] ?? 0;
      if (partA < partB) return -1;
      if (partA > partB) return 1;
    }

    return 0;
  }

  /**
   * Split array into chunks.
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Clear the cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached extension.
   */
  getCached(extensionId: string): DiscoveredExtension | undefined {
    return this.cache.get(extensionId);
  }

  /**
   * Check if a specific extension is available.
   */
  async isAvailable(extensionId: string): Promise<boolean> {
    const definition = ALL_EXTENSIONS.find(e => e.id === extensionId);
    if (!definition) return false;

    const discovered = await this.detectExtension(definition);
    return discovered.available;
  }

  /**
   * Get the best available extension for an operation.
   */
  async getBestForOperation(operation: BuildOperation): Promise<DiscoveredExtension | null> {
    const extensions = ALL_EXTENSIONS.filter(e => e.accelerates.includes(operation));
    if (extensions.length === 0) return null;

    // Sort by performance multiplier (highest first)
    const sorted = [...extensions].sort((a, b) => {
      return (b.performanceMultiplier ?? 1) - (a.performanceMultiplier ?? 1);
    });

    // Find the first available one
    for (const ext of sorted) {
      const discovered = await this.detectExtension(ext);
      if (discovered.available) {
        return discovered;
      }
    }

    return null;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an extension scanner.
 */
export function createExtensionScanner(config?: Partial<ScannerConfig>): ExtensionScanner {
  return new ExtensionScanner(config);
}

/**
 * Quick scan for commonly needed extensions.
 */
export async function quickScan(): Promise<ExtensionCapabilities> {
  const scanner = createExtensionScanner({
    categories: ['bundler', 'compressor', 'image_optimizer', 'linter'],
    maxConcurrent: 20,
  });
  return scanner.scan();
}

/**
 * Full scan of all extensions.
 */
export async function fullScan(workerId?: string): Promise<ExtensionCapabilities> {
  const scanner = createExtensionScanner();
  return scanner.scan(workerId);
}
