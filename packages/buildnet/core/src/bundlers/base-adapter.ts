/**
 * Base Bundler Adapter
 *
 * Abstract base class for all bundler adapters.
 */

import type {
  BundlerAdapter,
  BundlerName,
  BuildContext,
  BuildResult,
  Artifact,
  BuildError,
  Logger,
} from '../types/index.js';
import { readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export abstract class BaseBundlerAdapter implements BundlerAdapter {
  abstract readonly name: BundlerName;
  abstract readonly version: string;

  protected logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? createConsoleLogger();
  }

  /**
   * Check if the bundler is available (package installed).
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get bundler-specific configuration.
   */
  abstract getConfig(): Promise<unknown>;

  /**
   * Execute the build.
   */
  abstract build(context: BuildContext): Promise<BuildResult>;

  /**
   * Start watch mode (optional).
   */
  watch?(context: BuildContext, onChange: () => void): Promise<() => void>;

  /**
   * Collect artifacts from the output directory.
   */
  protected async collectArtifacts(outputDir: string): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];

    async function scanDir(dir: string): Promise<void> {
      try {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(dir, entry.name);

          if (entry.isDirectory()) {
            await scanDir(fullPath);
          } else if (entry.isFile()) {
            const fileStat = await stat(fullPath);
            const content = await readFile(fullPath);
            const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);

            artifacts.push({
              path: fullPath,
              size_bytes: fileStat.size,
              hash,
            });
          }
        }
      } catch {
        // Directory doesn't exist
      }
    }

    await scanDir(outputDir);
    return artifacts;
  }

  /**
   * Parse error output into structured errors.
   */
  protected parseErrors(output: string): BuildError[] {
    const errors: BuildError[] = [];

    // Try to parse common error formats
    const lines = output.split('\n');

    for (const line of lines) {
      // TypeScript-style errors: src/file.ts(10,5): error TS2322: ...
      const tsMatch = line.match(/^(.+?)\((\d+),(\d+)\):\s*error\s+(\w+):\s*(.+)$/);
      if (tsMatch) {
        errors.push({
          code: tsMatch[4],
          message: tsMatch[5],
          file: tsMatch[1],
          line: parseInt(tsMatch[2], 10),
          column: parseInt(tsMatch[3], 10),
        });
        continue;
      }

      // ESLint-style: /path/to/file.ts:10:5 - error: message
      const eslintMatch = line.match(/^(.+?):(\d+):(\d+)\s*[-–]\s*error:\s*(.+)$/);
      if (eslintMatch) {
        errors.push({
          code: 'LINT_ERROR',
          message: eslintMatch[4],
          file: eslintMatch[1],
          line: parseInt(eslintMatch[2], 10),
          column: parseInt(eslintMatch[3], 10),
        });
        continue;
      }

      // Vite/Rollup style: [vite]: Error: message
      const viteMatch = line.match(/^\[vite\]:\s*(?:Error:\s*)?(.+)$/i);
      if (viteMatch) {
        errors.push({
          code: 'VITE_ERROR',
          message: viteMatch[1],
        });
        continue;
      }

      // Generic error line
      if (line.toLowerCase().includes('error') && !line.includes('warning')) {
        errors.push({
          code: 'BUILD_ERROR',
          message: line.trim(),
        });
      }
    }

    // Deduplicate errors
    const seen = new Set<string>();
    return errors.filter((e) => {
      const key = `${e.file}:${e.line}:${e.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Create a build result object.
   */
  protected createResult(
    context: BuildContext,
    success: boolean,
    artifacts: Artifact[],
    startTime: number,
    options?: {
      errors?: BuildError[];
      warnings?: string[];
    },
  ): BuildResult {
    const duration = Date.now() - startTime;

    return {
      success,
      buildId: context.buildId,
      duration_ms: duration,
      artifacts,
      errors: options?.errors,
      warnings: options?.warnings,
      metrics: {
        queue_wait_ms: 0,
        total_duration_ms: duration,
        phases: {
          pre_build_ms: 0,
          build_ms: duration,
          post_build_ms: 0,
        },
        cache: {
          files_checked: 0,
          cache_hits: 0,
          cache_misses: 0,
          hit_ratio: 0,
          time_saved_ms: 0,
        },
        resources: {
          peak_memory_mb: process.memoryUsage().heapUsed / (1024 * 1024),
          avg_cpu_percent: 0,
          io_read_mb: 0,
          io_write_mb: artifacts.reduce((sum, a) => sum + a.size_bytes, 0) / (1024 * 1024),
        },
      },
    };
  }
}

/**
 * Create a console logger.
 */
function createConsoleLogger(): Logger {
  const createLogFn =
    (level: string) =>
    (message: string, data?: Record<string, unknown>): void => {
      const timestamp = new Date().toISOString();
      const dataStr = data ? ` ${JSON.stringify(data)}` : '';
      console.log(`[${timestamp}] [${level.toUpperCase()}] [bundler] ${message}${dataStr}`);
    };

  const logger: Logger = {
    debug: createLogFn('debug'),
    info: createLogFn('info'),
    warn: createLogFn('warn'),
    error: createLogFn('error'),
    fatal: createLogFn('fatal'),
    child: () => logger,
  };

  return logger;
}
