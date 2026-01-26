/**
 * Vite Bundler Adapter
 *
 * Adapter for Vite (with Rolldown in Vite 6+).
 * Vite is the recommended bundler for MuscleMap.
 */

import { join } from 'node:path';
import { stat } from 'node:fs/promises';
import { BaseBundlerAdapter } from './base-adapter.js';
import type { BundlerName, BuildContext, BuildResult, Logger } from '../types/index.js';

export interface ViteConfig {
  configFile?: string;
  mode?: 'development' | 'production';
  outDir?: string;
  minify?: boolean | 'esbuild' | 'terser';
  sourcemap?: boolean | 'inline' | 'hidden';
  logLevel?: 'info' | 'warn' | 'error' | 'silent';
}

export class ViteAdapter extends BaseBundlerAdapter {
  readonly name: BundlerName = 'vite-rolldown';
  readonly version: string = '1.0.0';

  private config: ViteConfig;

  constructor(config?: ViteConfig, logger?: Logger) {
    super(logger);
    this.config = config ?? {};
  }

  async isAvailable(): Promise<boolean> {
    try {
      await import('vite');
      return true;
    } catch {
      return false;
    }
  }

  async getConfig(): Promise<ViteConfig> {
    return this.config;
  }

  async build(context: BuildContext): Promise<BuildResult> {
    const startTime = Date.now();

    this.logger.info(`[vite] Starting build for ${context.taskName}...`);

    try {
      // Dynamically import Vite
      const vite = await import('vite');

      // Determine config file
      const configFile = this.config.configFile ?? join(context.workDir, 'vite.config.ts');

      // Check if config file exists
      let configExists = false;
      try {
        const configStat = await stat(configFile);
        configExists = configStat.isFile();
      } catch {
        // No config file
      }

      // Build with Vite
      const buildResult = await vite.build({
        root: context.workDir,
        configFile: configExists ? configFile : undefined,
        mode: this.config.mode ?? 'production',
        logLevel: this.config.logLevel ?? 'warn',
        build: {
          outDir: this.config.outDir ?? 'dist',
          minify: this.config.minify ?? 'esbuild',
          sourcemap: this.config.sourcemap ?? false,
          reportCompressedSize: false, // Faster builds
        },
      });

      const outputDir = join(context.workDir, this.config.outDir ?? 'dist');
      const artifacts = await this.collectArtifacts(outputDir);

      const result = this.createResult(context, true, artifacts, startTime);

      // Extract warnings from Vite build result
      if (Array.isArray(buildResult)) {
        const warnings: string[] = [];
        for (const output of buildResult) {
          if ('output' in output) {
            for (const chunk of output.output) {
              // Collect any warnings from the build
            }
          }
        }
        if (warnings.length > 0) {
          result.warnings = warnings;
        }
      }

      const totalSize = artifacts.reduce((sum, a) => sum + a.size_bytes, 0);
      this.logger.info(
        `[vite] Build completed in ${result.duration_ms}ms ` +
          `(${artifacts.length} files, ${formatBytes(totalSize)})`,
      );

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`[vite] Build failed: ${message}`);

      const errors = this.parseErrors(message + '\n' + (stack ?? ''));

      if (errors.length === 0) {
        errors.push({
          code: 'VITE_BUILD_ERROR',
          message,
          stack,
        });
      }

      return this.createResult(context, false, [], startTime, { errors });
    }
  }

  async watch(context: BuildContext, onChange: () => void): Promise<() => void> {
    this.logger.info(`[vite] Starting watch mode for ${context.taskName}...`);

    try {
      const vite = await import('vite');

      const configFile = this.config.configFile ?? join(context.workDir, 'vite.config.ts');

      const server = await vite.createServer({
        root: context.workDir,
        configFile,
        mode: 'development',
        server: {
          watch: {
            // Don't watch node_modules
            ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
          },
        },
      });

      // Listen for file changes
      server.watcher.on('change', (file) => {
        this.logger.debug(`[vite] File changed: ${file}`);
        onChange();
      });

      await server.listen();

      this.logger.info(`[vite] Dev server running at ${server.resolvedUrls?.local[0]}`);

      return async () => {
        await server.close();
        this.logger.info('[vite] Watch mode stopped');
      };
    } catch (error) {
      this.logger.error(`[vite] Failed to start watch mode: ${error}`);
      throw error;
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
