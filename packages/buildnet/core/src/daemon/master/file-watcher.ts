/**
 * File Watcher Service
 *
 * Intelligent file watching with:
 * - Configurable scan intervals
 * - Debouncing for rapid changes
 * - Change impact categorization
 * - Preemptive build preparation
 */

import { watch, type FSWatcher } from 'chokidar';
import { EventEmitter } from 'eventemitter3';
import { glob } from 'glob';
import { resolve, relative, dirname, basename, extname } from 'node:path';
import { stat } from 'node:fs/promises';
import {
  ChangeImpact,
  type WatchConfig,
  type FileChangeEvent,
  type PreparationResult,
} from '../types.js';

// ============================================================================
// Interfaces
// ============================================================================

export interface FileWatcherConfig extends WatchConfig {
  root_dir: string;
}

export interface ChangeBuffer {
  events: Map<string, FileChangeEvent>;
  timer: NodeJS.Timeout | null;
  impact: ChangeImpact;
}

// ============================================================================
// File Watcher Implementation
// ============================================================================

export class FileWatcherService extends EventEmitter {
  private config: FileWatcherConfig;
  private watcher: FSWatcher | null = null;
  private changeBuffer: ChangeBuffer;
  private preparationCache: Map<string, PreparationResult> = new Map();
  private packageDependencies: Map<string, Set<string>> = new Map();
  private started: boolean = false;

  constructor(config: FileWatcherConfig) {
    super();
    this.config = config;
    this.changeBuffer = {
      events: new Map(),
      timer: null,
      impact: ChangeImpact.IGNORED,
    };
  }

  /**
   * Start watching for file changes.
   */
  async start(): Promise<void> {
    if (this.started) return;

    // Build initial package dependency map
    await this.buildPackageDependencies();

    // Resolve watch paths
    const watchPaths = this.config.directories.map(d =>
      resolve(this.config.root_dir, d)
    );

    // Create watcher with polling for reliability
    this.watcher = watch(watchPaths, {
      ignored: this.config.exclude_patterns,
      persistent: true,
      ignoreInitial: true,
      usePolling: this.config.scan_interval_ms < 500,
      interval: this.config.scan_interval_ms,
      binaryInterval: this.config.scan_interval_ms * 3,
      awaitWriteFinish: {
        stabilityThreshold: this.config.debounce_ms,
        pollInterval: 100,
      },
    });

    // Set up event handlers
    this.watcher.on('add', path => this.handleFileEvent(path, 'add'));
    this.watcher.on('change', path => this.handleFileEvent(path, 'change'));
    this.watcher.on('unlink', path => this.handleFileEvent(path, 'unlink'));

    this.watcher.on('error', error => {
      this.emit('error', error);
    });

    this.watcher.on('ready', () => {
      this.emit('ready');
    });

    this.started = true;
  }

  /**
   * Stop watching.
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    if (this.changeBuffer.timer) {
      clearTimeout(this.changeBuffer.timer);
      this.changeBuffer.timer = null;
    }

    this.started = false;
  }

  /**
   * Get current preparation cache.
   */
  getPreparationCache(): Map<string, PreparationResult> {
    return new Map(this.preparationCache);
  }

  /**
   * Clear preparation cache.
   */
  clearPreparationCache(): void {
    this.preparationCache.clear();
  }

  /**
   * Manually trigger a scan.
   */
  async scan(): Promise<FileChangeEvent[]> {
    const events: FileChangeEvent[] = [];

    for (const dir of this.config.directories) {
      const fullDir = resolve(this.config.root_dir, dir);
      const files = await glob(this.config.include_patterns, {
        cwd: fullDir,
        ignore: this.config.exclude_patterns,
        absolute: true,
      });

      for (const file of files) {
        try {
          const stats = await stat(file);
          events.push({
            path: file,
            type: 'change',
            timestamp: stats.mtime,
            size: stats.size,
          });
        } catch {
          // File may have been deleted
        }
      }
    }

    return events;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private async handleFileEvent(
    path: string,
    type: 'add' | 'change' | 'unlink'
  ): Promise<void> {
    // Check if file matches include patterns
    if (!this.matchesIncludePatterns(path)) {
      return;
    }

    // Create event
    const event: FileChangeEvent = {
      path,
      type,
      timestamp: new Date(),
    };

    // Try to get file size
    if (type !== 'unlink') {
      try {
        const stats = await stat(path);
        event.size = stats.size;
      } catch {
        // File may have been deleted between event and stat
      }
    }

    // Categorize impact
    const impact = this.categorizeChange(event);

    // Add to buffer
    this.changeBuffer.events.set(path, event);

    // Update overall impact (use highest)
    if (this.getImpactPriority(impact) > this.getImpactPriority(this.changeBuffer.impact)) {
      this.changeBuffer.impact = impact;
    }

    // Emit immediate event
    this.emit('file:changed', event);

    // If preemptive prepare is enabled, start preparing
    if (this.config.preemptive_prepare) {
      await this.preemptivePrepare(impact, event);
    }

    // Reset debounce timer
    this.resetDebounceTimer();
  }

  private resetDebounceTimer(): void {
    if (this.changeBuffer.timer) {
      clearTimeout(this.changeBuffer.timer);
    }

    this.changeBuffer.timer = setTimeout(() => {
      this.flushChangeBuffer();
    }, this.config.debounce_ms);
  }

  private flushChangeBuffer(): void {
    if (this.changeBuffer.events.size === 0) return;

    const events = Array.from(this.changeBuffer.events.values());
    const impact = this.changeBuffer.impact;

    // Reset buffer
    this.changeBuffer.events.clear();
    this.changeBuffer.impact = ChangeImpact.IGNORED;
    this.changeBuffer.timer = null;

    // Emit batch event
    this.emit('changes:batched', {
      events,
      impact,
      timestamp: new Date(),
    });
  }

  private categorizeChange(event: FileChangeEvent): ChangeImpact {
    const path = event.path;
    const filename = basename(path);
    const ext = extname(path);

    // Configuration files trigger full rebuild
    if (
      filename === 'package.json' ||
      filename === 'tsconfig.json' ||
      filename === 'vite.config.ts' ||
      filename === 'vite.config.js' ||
      filename.endsWith('.config.ts') ||
      filename.endsWith('.config.js')
    ) {
      return ChangeImpact.FULL_REBUILD;
    }

    // Lock files trigger full rebuild
    if (filename === 'pnpm-lock.yaml' || filename === 'package-lock.json') {
      return ChangeImpact.FULL_REBUILD;
    }

    // Test files are often ignored
    if (
      filename.includes('.test.') ||
      filename.includes('.spec.') ||
      path.includes('__tests__')
    ) {
      return ChangeImpact.IGNORED;
    }

    // Documentation files are ignored
    if (ext === '.md' || ext === '.txt' || ext === '.rst') {
      return ChangeImpact.IGNORED;
    }

    // Static assets
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'].includes(ext)) {
      return ChangeImpact.ASSET_ONLY;
    }

    // CSS/SCSS
    if (['.css', '.scss', '.sass', '.less'].includes(ext)) {
      return ChangeImpact.ASSET_ONLY;
    }

    // Source files
    if (['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'].includes(ext)) {
      // Check if in shared/core packages (affects all dependents)
      if (path.includes('/packages/shared/') || path.includes('/packages/core/')) {
        return ChangeImpact.PACKAGE_REBUILD;
      }

      return ChangeImpact.INCREMENTAL;
    }

    // JSON data files
    if (ext === '.json' && !filename.includes('config')) {
      return ChangeImpact.ASSET_ONLY;
    }

    // Default to incremental
    return ChangeImpact.INCREMENTAL;
  }

  private getImpactPriority(impact: ChangeImpact): number {
    const priorities: Record<ChangeImpact, number> = {
      [ChangeImpact.IGNORED]: 0,
      [ChangeImpact.ASSET_ONLY]: 1,
      [ChangeImpact.INCREMENTAL]: 2,
      [ChangeImpact.PACKAGE_REBUILD]: 3,
      [ChangeImpact.FULL_REBUILD]: 4,
    };
    return priorities[impact] ?? 0;
  }

  private async preemptivePrepare(
    impact: ChangeImpact,
    event: FileChangeEvent
  ): Promise<void> {
    if (impact === ChangeImpact.IGNORED) return;

    const preparation: PreparationResult = {
      affected_packages: await this.computeAffectedPackages(event.path),
      suggested_workers: this.calculateOptimalWorkers(impact),
      cache_warmups: this.identifyCacheWarmups(event.path),
      estimated_build_time_ms: this.estimateBuildTime(impact),
      impact,
    };

    this.preparationCache.set(event.path, preparation);

    // Emit preparation event
    this.emit('preparation:ready', preparation);
  }

  private async computeAffectedPackages(path: string): Promise<string[]> {
    const affected: Set<string> = new Set();

    // Determine which package this file belongs to
    const relativePath = relative(this.config.root_dir, path);
    const parts = relativePath.split('/');

    // Look for package.json in parent directories
    let packageName: string | null = null;

    if (parts[0] === 'packages' && parts.length >= 2) {
      packageName = parts[1];
      affected.add(packageName);
    } else if (parts[0] === 'apps' && parts.length >= 2) {
      packageName = parts[1];
      affected.add(packageName);
    } else if (parts[0] === 'src') {
      affected.add('frontend');
    }

    // Add dependents if this is a shared package
    if (packageName && this.packageDependencies.has(packageName)) {
      for (const dep of this.packageDependencies.get(packageName)!) {
        affected.add(dep);
      }
    }

    return Array.from(affected);
  }

  private calculateOptimalWorkers(impact: ChangeImpact): number {
    switch (impact) {
      case ChangeImpact.FULL_REBUILD:
        return 4; // Use all available workers
      case ChangeImpact.PACKAGE_REBUILD:
        return 3; // Most workers
      case ChangeImpact.INCREMENTAL:
        return 2; // A couple workers
      case ChangeImpact.ASSET_ONLY:
        return 1; // Single worker
      default:
        return 0;
    }
  }

  private identifyCacheWarmups(path: string): string[] {
    const warmups: string[] = [];
    const dir = dirname(path);

    // Add Vite cache for the package
    warmups.push(`${dir}/node_modules/.vite`);

    // Add TypeScript cache
    warmups.push(`${dir}/tsconfig.tsbuildinfo`);

    return warmups;
  }

  private estimateBuildTime(impact: ChangeImpact): number {
    // Rough estimates in milliseconds
    switch (impact) {
      case ChangeImpact.FULL_REBUILD:
        return 90000; // 90 seconds
      case ChangeImpact.PACKAGE_REBUILD:
        return 30000; // 30 seconds
      case ChangeImpact.INCREMENTAL:
        return 10000; // 10 seconds
      case ChangeImpact.ASSET_ONLY:
        return 2000; // 2 seconds
      default:
        return 0;
    }
  }

  private matchesIncludePatterns(path: string): boolean {
    const relativePath = relative(this.config.root_dir, path);

    for (const pattern of this.config.include_patterns) {
      // Simple pattern matching
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\./g, '\\.');

      if (new RegExp(regexPattern).test(relativePath)) {
        return true;
      }
    }

    return false;
  }

  private async buildPackageDependencies(): Promise<void> {
    // This would normally read package.json files to build dependency graph
    // For now, we'll use a simplified approach

    // packages/shared is a dependency of everything
    this.packageDependencies.set('shared', new Set([
      'core', 'client', 'ui', 'plugin-sdk', 'api', 'frontend'
    ]));

    // packages/core depends on shared, is dependency of others
    this.packageDependencies.set('core', new Set([
      'client', 'ui', 'plugin-sdk', 'api', 'frontend'
    ]));

    // packages/client is used by frontend and mobile
    this.packageDependencies.set('client', new Set(['frontend', 'mobile']));

    // packages/ui is used by frontend and mobile
    this.packageDependencies.set('ui', new Set(['frontend', 'mobile']));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFileWatcher(config: FileWatcherConfig): FileWatcherService {
  return new FileWatcherService(config);
}
