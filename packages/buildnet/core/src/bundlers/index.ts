/**
 * BuildNet Bundler System
 *
 * Hot-swappable bundler adapters for flexible build pipelines.
 *
 * Supported Bundlers:
 * - Vite (with Rolldown) - Recommended for production, best DX
 * - Rspack - Webpack-compatible, Rust-based
 * - esbuild - Fastest, best for CI/CD
 * - Turbopack - Beta, Next.js optimized (planned)
 * - Webpack - Legacy support (planned)
 */

import type {
  BundlerAdapter,
  BundlerName,
  BundlerConfig,
  BundlersConfig,
  BuildContext,
  Logger,
} from '../types/index.js';
import { ViteAdapter, type ViteConfig } from './vite-adapter.js';
import { RspackAdapter, type RspackConfig } from './rspack-adapter.js';
import { EsbuildAdapter, type EsbuildConfig } from './esbuild-adapter.js';

export { BaseBundlerAdapter } from './base-adapter.js';
export { ViteAdapter, type ViteConfig } from './vite-adapter.js';
export { RspackAdapter, type RspackConfig } from './rspack-adapter.js';
export { EsbuildAdapter, type EsbuildConfig } from './esbuild-adapter.js';

/**
 * Bundler Manager
 *
 * Manages bundler selection, hot-swapping, and fallback.
 */
export class BundlerManager {
  private adapters = new Map<BundlerName, BundlerAdapter>();
  private activeAdapter: BundlerAdapter | null = null;
  private config: BundlersConfig;
  private logger: Logger;

  constructor(config: BundlersConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger ?? createConsoleLogger();
  }

  /**
   * Initialize and detect available bundlers.
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing bundler manager...');

    // Register all available bundlers
    const bundlerFactories: Array<{
      name: BundlerName;
      factory: () => BundlerAdapter;
    }> = [
      { name: 'vite-rolldown', factory: () => new ViteAdapter(undefined, this.logger) },
      { name: 'rspack', factory: () => new RspackAdapter(undefined, this.logger) },
      { name: 'esbuild', factory: () => new EsbuildAdapter(undefined, this.logger) },
    ];

    for (const { name, factory } of bundlerFactories) {
      const bundlerConfig = this.config.available?.[name];

      // Skip disabled bundlers
      if (bundlerConfig && !bundlerConfig.enabled) {
        this.logger.debug(`Bundler ${name} is disabled`);
        continue;
      }

      try {
        const adapter = factory();
        const isAvailable = await adapter.isAvailable();

        if (isAvailable) {
          this.adapters.set(name, adapter);
          this.logger.info(`Registered bundler: ${name} v${adapter.version}`);
        } else {
          this.logger.debug(`Bundler ${name} is not available (package not installed)`);
        }
      } catch (error) {
        this.logger.debug(`Failed to initialize bundler ${name}: ${error}`);
      }
    }

    // Set active bundler
    await this.setActive(this.config.active as BundlerName);
  }

  /**
   * Set the active bundler.
   */
  async setActive(name: BundlerName): Promise<boolean> {
    let adapter = this.adapters.get(name);

    // If requested bundler not available, try fallback chain
    if (!adapter && this.config.fallback_chain) {
      this.logger.warn(`Bundler ${name} not available, trying fallbacks...`);

      for (const fallbackName of this.config.fallback_chain) {
        adapter = this.adapters.get(fallbackName as BundlerName);
        if (adapter) {
          this.logger.info(`Falling back to bundler: ${fallbackName}`);
          break;
        }
      }
    }

    if (!adapter) {
      this.logger.error(`No bundler available. Tried: ${name}, fallbacks: ${this.config.fallback_chain?.join(', ')}`);
      return false;
    }

    this.activeAdapter = adapter;
    this.logger.info(`Active bundler: ${adapter.name} v${adapter.version}`);
    return true;
  }

  /**
   * Get the active bundler.
   */
  getActive(): BundlerAdapter {
    if (!this.activeAdapter) {
      throw new Error('No active bundler. Call initialize() first.');
    }
    return this.activeAdapter;
  }

  /**
   * Get a specific bundler.
   */
  get(name: BundlerName): BundlerAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * List available bundlers.
   */
  listAvailable(): BundlerName[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Hot-swap to a different bundler.
   */
  async switchTo(name: BundlerName): Promise<boolean> {
    const previousName = this.activeAdapter?.name;

    if (previousName === name) {
      this.logger.debug(`Already using ${name}`);
      return true;
    }

    const success = await this.setActive(name);

    if (success) {
      this.logger.info(`Hot-swapped bundler: ${previousName} → ${name}`);
    }

    return success;
  }

  /**
   * Auto-select the best bundler based on environment.
   */
  async autoSelect(): Promise<BundlerName | null> {
    const autoConfig = this.config.auto_select;

    if (!autoConfig) {
      return null;
    }

    // Check CI environment
    if (autoConfig.ci_environment && process.env.CI) {
      const bundler = autoConfig.ci_environment as BundlerName;
      if (this.adapters.has(bundler)) {
        await this.setActive(bundler);
        this.logger.info(`Auto-selected ${bundler} for CI environment`);
        return bundler;
      }
    }

    // Check development mode
    if (autoConfig.development && process.env.NODE_ENV === 'development') {
      const bundler = autoConfig.development as BundlerName;
      if (this.adapters.has(bundler)) {
        await this.setActive(bundler);
        this.logger.info(`Auto-selected ${bundler} for development`);
        return bundler;
      }
    }

    // Check for webpack config (use rspack)
    if (autoConfig.has_webpack_config) {
      try {
        const fs = await import('node:fs/promises');
        await fs.stat('webpack.config.js');
        const bundler = autoConfig.has_webpack_config as BundlerName;
        if (this.adapters.has(bundler)) {
          await this.setActive(bundler);
          this.logger.info(`Auto-selected ${bundler} (webpack config detected)`);
          return bundler;
        }
      } catch {
        // No webpack config
      }
    }

    return null;
  }

  /**
   * Get bundler info for display.
   */
  getInfo(): Array<{
    name: BundlerName;
    version: string;
    active: boolean;
    available: boolean;
  }> {
    const allBundlers: BundlerName[] = ['vite-rolldown', 'rspack', 'esbuild', 'turbopack', 'webpack'];

    return allBundlers.map((name) => {
      const adapter = this.adapters.get(name);
      return {
        name,
        version: adapter?.version ?? 'not installed',
        active: this.activeAdapter?.name === name,
        available: !!adapter,
      };
    });
  }
}

/**
 * Create a bundler adapter from configuration.
 */
export function createBundlerAdapter(
  name: BundlerName,
  config?: Record<string, unknown>,
  logger?: Logger,
): BundlerAdapter {
  switch (name) {
    case 'vite-rolldown':
      return new ViteAdapter(config as ViteConfig, logger);
    case 'rspack':
      return new RspackAdapter(config as RspackConfig, logger);
    case 'esbuild':
      return new EsbuildAdapter(config as EsbuildConfig, logger);
    default:
      throw new Error(`Unknown bundler: ${name}`);
  }
}

/**
 * Default bundlers configuration.
 */
export const DEFAULT_BUNDLERS_CONFIG: BundlersConfig = {
  active: 'vite-rolldown',
  available: {
    'vite-rolldown': {
      enabled: true,
      package: 'vite@^6.0.0',
      priority: 1,
    },
    rspack: {
      enabled: true,
      package: '@rspack/core@^1.0.0',
      priority: 2,
    },
    esbuild: {
      enabled: true,
      package: 'esbuild@^0.20.0',
      priority: 3,
    },
    turbopack: {
      enabled: false,
      package: 'turbopack@latest',
      priority: 4,
    },
    webpack: {
      enabled: false,
      package: 'webpack@^5.0.0',
      priority: 5,
    },
  },
  fallback_chain: ['vite-rolldown', 'rspack', 'esbuild'],
  auto_select: {
    ci_environment: 'esbuild',
    development: 'vite-rolldown',
    has_webpack_config: 'rspack',
  },
};

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
