/**
 * esbuild Bundler Adapter
 *
 * Adapter for esbuild - the fastest JavaScript bundler.
 * Best for CI/CD environments and simple builds.
 */

import { join } from 'node:path';
import { stat } from 'node:fs/promises';
import { BaseBundlerAdapter } from './base-adapter.js';
import type { BundlerName, BuildContext, BuildResult, Logger } from '../types/index.js';

export interface EsbuildConfig {
  entryPoints?: string[];
  outdir?: string;
  bundle?: boolean;
  minify?: boolean;
  sourcemap?: boolean | 'inline' | 'external' | 'both';
  target?: string | string[];
  format?: 'iife' | 'cjs' | 'esm';
  splitting?: boolean;
  platform?: 'browser' | 'node' | 'neutral';
  external?: string[];
  loader?: Record<string, string>;
  define?: Record<string, string>;
  alias?: Record<string, string>;
}

export class EsbuildAdapter extends BaseBundlerAdapter {
  readonly name: BundlerName = 'esbuild';
  readonly version: string = '1.0.0';

  private config: EsbuildConfig;

  constructor(config?: EsbuildConfig, logger?: Logger) {
    super(logger);
    this.config = config ?? {};
  }

  async isAvailable(): Promise<boolean> {
    try {
      await import('esbuild');
      return true;
    } catch {
      return false;
    }
  }

  async getConfig(): Promise<EsbuildConfig> {
    return this.config;
  }

  async build(context: BuildContext): Promise<BuildResult> {
    const startTime = Date.now();

    this.logger.info(`[esbuild] Starting build for ${context.taskName}...`);

    try {
      // Dynamically import esbuild
      const esbuild = await import('esbuild');

      // Determine entry points
      let entryPoints = this.config.entryPoints;

      if (!entryPoints || entryPoints.length === 0) {
        // Try to find common entry points
        const possibleEntries = [
          'src/index.tsx',
          'src/index.ts',
          'src/main.tsx',
          'src/main.ts',
          'index.tsx',
          'index.ts',
        ];

        for (const entry of possibleEntries) {
          const entryPath = join(context.workDir, entry);
          try {
            const entryStat = await stat(entryPath);
            if (entryStat.isFile()) {
              entryPoints = [entryPath];
              break;
            }
          } catch {
            // File doesn't exist
          }
        }
      }

      if (!entryPoints || entryPoints.length === 0) {
        throw new Error('No entry points found');
      }

      const outdir = join(context.workDir, this.config.outdir ?? 'dist');

      // Build options
      const buildOptions: any = {
        entryPoints: entryPoints.map((e) =>
          e.startsWith('/') ? e : join(context.workDir, e),
        ),
        outdir,
        bundle: this.config.bundle ?? true,
        minify: this.config.minify ?? true,
        sourcemap: this.config.sourcemap ?? false,
        target: this.config.target ?? ['es2020'],
        format: this.config.format ?? 'esm',
        splitting: this.config.splitting ?? (this.config.format === 'esm'),
        platform: this.config.platform ?? 'browser',
        metafile: true,
        write: true,
        logLevel: 'warning',
      };

      if (this.config.external) {
        buildOptions.external = this.config.external;
      }

      if (this.config.loader) {
        buildOptions.loader = this.config.loader;
      }

      if (this.config.define) {
        buildOptions.define = this.config.define;
      }

      if (this.config.alias) {
        buildOptions.alias = this.config.alias;
      }

      // Run esbuild
      const result = await esbuild.build(buildOptions);

      // Check for errors
      if (result.errors.length > 0) {
        const errors = result.errors.map((e: any) => ({
          code: 'ESBUILD_ERROR',
          message: e.text,
          file: e.location?.file,
          line: e.location?.line,
          column: e.location?.column,
        }));

        this.logger.error(`[esbuild] Build failed with ${errors.length} error(s)`);
        return this.createResult(context, false, [], startTime, { errors });
      }

      const artifacts = await this.collectArtifacts(outdir);

      // Collect warnings
      const warnings = result.warnings.map((w: any) => w.text);

      const buildResult = this.createResult(context, true, artifacts, startTime, {
        warnings: warnings.length > 0 ? warnings : undefined,
      });

      const totalSize = artifacts.reduce((sum, a) => sum + a.size_bytes, 0);
      this.logger.info(
        `[esbuild] Build completed in ${buildResult.duration_ms}ms ` +
          `(${artifacts.length} files, ${formatBytes(totalSize)})`,
      );

      return buildResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`[esbuild] Build failed: ${message}`);

      return this.createResult(context, false, [], startTime, {
        errors: [
          {
            code: 'ESBUILD_BUILD_ERROR',
            message,
            stack,
          },
        ],
      });
    }
  }

  async watch(context: BuildContext, onChange: () => void): Promise<() => void> {
    this.logger.info(`[esbuild] Starting watch mode for ${context.taskName}...`);

    try {
      const esbuild = await import('esbuild');

      let entryPoints = this.config.entryPoints;

      if (!entryPoints || entryPoints.length === 0) {
        // Try to find common entry points
        const possibleEntries = ['src/index.tsx', 'src/index.ts'];

        for (const entry of possibleEntries) {
          const entryPath = join(context.workDir, entry);
          try {
            const entryStat = await stat(entryPath);
            if (entryStat.isFile()) {
              entryPoints = [entryPath];
              break;
            }
          } catch {
            // File doesn't exist
          }
        }
      }

      const outdir = join(context.workDir, this.config.outdir ?? 'dist');

      const ctx = await esbuild.context({
        entryPoints: entryPoints?.map((e) =>
          e.startsWith('/') ? e : join(context.workDir, e),
        ),
        outdir,
        bundle: this.config.bundle ?? true,
        minify: false, // Don't minify in watch mode
        sourcemap: true,
        target: this.config.target ?? ['es2020'],
        format: this.config.format ?? 'esm',
        platform: this.config.platform ?? 'browser',
        logLevel: 'info',
        plugins: [
          {
            name: 'watch-plugin',
            setup(build) {
              build.onEnd((result) => {
                if (result.errors.length === 0) {
                  onChange();
                }
              });
            },
          },
        ],
      });

      await ctx.watch();

      this.logger.info('[esbuild] Watch mode started');

      return async () => {
        await ctx.dispose();
        this.logger.info('[esbuild] Watch mode stopped');
      };
    } catch (error) {
      this.logger.error(`[esbuild] Failed to start watch mode: ${error}`);
      throw error;
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
