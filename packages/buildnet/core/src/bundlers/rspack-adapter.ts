/**
 * Rspack Bundler Adapter
 *
 * Adapter for Rspack - a Rust-based Webpack-compatible bundler.
 * Use this for projects with existing Webpack configs.
 */

import { join } from 'node:path';
import { stat } from 'node:fs/promises';
import { BaseBundlerAdapter } from './base-adapter.js';
import type { BundlerName, BuildContext, BuildResult, Logger } from '../types/index.js';

export interface RspackConfig {
  configFile?: string;
  mode?: 'development' | 'production';
  outDir?: string;
}

export class RspackAdapter extends BaseBundlerAdapter {
  readonly name: BundlerName = 'rspack';
  readonly version: string = '1.0.0';

  private config: RspackConfig;

  constructor(config?: RspackConfig, logger?: Logger) {
    super(logger);
    this.config = config ?? {};
  }

  async isAvailable(): Promise<boolean> {
    try {
      await import('@rspack/core');
      return true;
    } catch {
      return false;
    }
  }

  async getConfig(): Promise<RspackConfig> {
    return this.config;
  }

  async build(context: BuildContext): Promise<BuildResult> {
    const startTime = Date.now();

    this.logger.info(`[rspack] Starting build for ${context.taskName}...`);

    try {
      // Dynamically import Rspack
      const rspack = await import('@rspack/core');

      // Load config file or use defaults
      let rspackConfig: any = {
        mode: this.config.mode ?? 'production',
        context: context.workDir,
        output: {
          path: join(context.workDir, this.config.outDir ?? 'dist'),
          filename: 'assets/[name].[contenthash:8].js',
          chunkFilename: 'assets/[name].[contenthash:8].js',
          clean: true,
        },
        optimization: {
          minimize: true,
          splitChunks: {
            chunks: 'all',
          },
        },
        stats: 'errors-warnings',
      };

      // Try to load config file
      const configFile = this.config.configFile ?? join(context.workDir, 'rspack.config.js');
      try {
        const configStat = await stat(configFile);
        if (configStat.isFile()) {
          const loadedConfig = await import(configFile);
          rspackConfig = loadedConfig.default ?? loadedConfig;
        }
      } catch {
        // Use default config
        this.logger.debug('[rspack] No config file found, using defaults');
      }

      // Run Rspack
      const compiler = rspack.rspack(rspackConfig);

      const stats = await new Promise<any>((resolve, reject) => {
        compiler.run((err: Error | null, stats: any) => {
          if (err) {
            reject(err);
            return;
          }

          compiler.close((closeErr) => {
            if (closeErr) {
              this.logger.warn(`[rspack] Error closing compiler: ${closeErr}`);
            }
          });

          resolve(stats);
        });
      });

      // Check for errors
      const info = stats.toJson();

      if (stats.hasErrors()) {
        const errors = info.errors?.map((e: any) => ({
          code: 'RSPACK_ERROR',
          message: e.message || String(e),
          file: e.moduleName,
          line: e.loc?.start?.line,
          column: e.loc?.start?.column,
        })) ?? [];

        this.logger.error(`[rspack] Build failed with ${errors.length} error(s)`);
        return this.createResult(context, false, [], startTime, { errors });
      }

      const outputDir = join(context.workDir, this.config.outDir ?? 'dist');
      const artifacts = await this.collectArtifacts(outputDir);

      // Collect warnings
      const warnings = info.warnings?.map((w: any) => w.message || String(w)) ?? [];

      const result = this.createResult(context, true, artifacts, startTime, {
        warnings: warnings.length > 0 ? warnings : undefined,
      });

      const totalSize = artifacts.reduce((sum, a) => sum + a.size_bytes, 0);
      this.logger.info(
        `[rspack] Build completed in ${result.duration_ms}ms ` +
          `(${artifacts.length} files, ${formatBytes(totalSize)})`,
      );

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`[rspack] Build failed: ${message}`);

      return this.createResult(context, false, [], startTime, {
        errors: [
          {
            code: 'RSPACK_BUILD_ERROR',
            message,
            stack,
          },
        ],
      });
    }
  }

  async watch(context: BuildContext, onChange: () => void): Promise<() => void> {
    this.logger.info(`[rspack] Starting watch mode for ${context.taskName}...`);

    try {
      const rspack = await import('@rspack/core');

      let rspackConfig: any = {
        mode: 'development',
        context: context.workDir,
        output: {
          path: join(context.workDir, this.config.outDir ?? 'dist'),
        },
        stats: 'errors-warnings',
      };

      // Try to load config file
      const configFile = this.config.configFile ?? join(context.workDir, 'rspack.config.js');
      try {
        const configStat = await stat(configFile);
        if (configStat.isFile()) {
          const loadedConfig = await import(configFile);
          rspackConfig = loadedConfig.default ?? loadedConfig;
          rspackConfig.mode = 'development';
        }
      } catch {
        // Use default config
      }

      const compiler = rspack.rspack(rspackConfig);

      const watching = compiler.watch(
        {
          aggregateTimeout: 300,
          poll: undefined,
          ignored: /node_modules/,
        },
        (err: Error | null, stats: any) => {
          if (err) {
            this.logger.error(`[rspack] Watch error: ${err.message}`);
            return;
          }

          if (stats?.hasErrors()) {
            const info = stats.toJson();
            this.logger.error(`[rspack] Build errors: ${info.errors?.[0]?.message}`);
          } else {
            this.logger.info('[rspack] Rebuild completed');
            onChange();
          }
        },
      );

      return () => {
        return new Promise<void>((resolve) => {
          watching.close(() => {
            this.logger.info('[rspack] Watch mode stopped');
            resolve();
          });
        });
      };
    } catch (error) {
      this.logger.error(`[rspack] Failed to start watch mode: ${error}`);
      throw error;
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
