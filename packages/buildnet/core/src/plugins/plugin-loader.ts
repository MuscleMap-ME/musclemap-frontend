/**
 * Plugin Loader
 *
 * Loads and manages plugins from various sources:
 * - Built-in core plugins
 * - Custom plugins from a directory
 * - Remote plugins from npm/git
 */

import { readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import type {
  Plugin,
  PluginConfig,
  PluginsConfig,
  PluginHook,
  BuildContext,
  BuildResult,
  Logger,
} from '../types/index.js';

export interface LoadedPlugin extends Plugin {
  config: PluginConfig;
  enabled: boolean;
  source: 'core' | 'custom' | 'remote';
}

export interface PluginLoaderOptions {
  pluginsConfig: PluginsConfig;
  logger?: Logger;
}

/**
 * Plugin Loader class for discovering and loading plugins.
 */
export class PluginLoader {
  private plugins = new Map<string, LoadedPlugin>();
  private config: PluginsConfig;
  private logger: Logger;

  /**
   * Create a PluginLoader.
   * Supports two calling patterns:
   * - new PluginLoader(pluginsConfig, logger?)
   * - new PluginLoader({ pluginsConfig, logger? })
   */
  constructor(configOrOptions: PluginsConfig | PluginLoaderOptions, logger?: Logger) {
    // Check if first argument is an options object or direct config
    if (configOrOptions && 'pluginsConfig' in configOrOptions) {
      // Options object pattern
      this.config = configOrOptions.pluginsConfig;
      this.logger = configOrOptions.logger ?? createConsoleLogger();
    } else {
      // Direct config pattern
      this.config = configOrOptions as PluginsConfig;
      this.logger = logger ?? createConsoleLogger();
    }
  }

  /**
   * Load all plugins from configured sources.
   */
  async loadAll(): Promise<void> {
    // 1. Load core plugins
    await this.loadCorePlugins();

    // 2. Load custom plugins from directory
    if (this.config.custom_dir) {
      await this.loadCustomPlugins(this.config.custom_dir);
    }

    // 3. Load remote plugins
    if (this.config.remote) {
      await this.loadRemotePlugins(this.config.remote);
    }

    this.logger.info(`Loaded ${this.plugins.size} plugins`);
  }

  /**
   * Load built-in core plugins.
   */
  private async loadCorePlugins(): Promise<void> {
    for (const [name, config] of Object.entries(this.config.core ?? {})) {
      try {
        // Import the core plugin
        const pluginModule = await import(`./core/${name}.js`);
        const plugin = pluginModule.default as Plugin;

        if (!plugin) {
          this.logger.warn(`Core plugin ${name} has no default export`);
          continue;
        }

        this.plugins.set(name, {
          ...plugin,
          config,
          enabled: config.enabled,
          source: 'core',
        });

        this.logger.debug(`Loaded core plugin: ${name}`, { enabled: config.enabled });
      } catch (error) {
        // Core plugin not found - that's OK, we'll create stubs
        this.logger.debug(`Core plugin ${name} not found, using config-based stub`);

        // Create a config-based plugin stub
        const stub = this.createConfigBasedPlugin(name, config);
        this.plugins.set(name, {
          ...stub,
          config,
          enabled: config.enabled,
          source: 'core',
        });
      }
    }
  }

  /**
   * Create a plugin from just configuration (for simple command-based plugins).
   */
  private createConfigBasedPlugin(name: string, config: PluginConfig): Plugin {
    const hook = config.hook ?? 'pre-build';

    const plugin: Plugin = {
      name,
      version: '1.0.0',
      hotSwappable: true,
      hooks: {},
    };

    if (config.command) {
      plugin.hooks[hook] = async (ctx: BuildContext) => {
        const { exec } = await import('node:child_process');
        const { promisify } = await import('node:util');
        const execAsync = promisify(exec);

        ctx.logger.info(`[${name}] Running: ${config.command}`);

        try {
          const { stdout, stderr } = await execAsync(config.command!, {
            cwd: ctx.workDir,
            env: { ...process.env, ...ctx.env },
            maxBuffer: 50 * 1024 * 1024, // 50MB buffer
          });

          if (stdout) {
            ctx.logger.debug(`[${name}] stdout: ${stdout.slice(0, 1000)}`);
          }
          if (stderr) {
            ctx.logger.warn(`[${name}] stderr: ${stderr.slice(0, 1000)}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          ctx.logger.error(`[${name}] Failed: ${message}`);

          if (config.fail_on_error) {
            throw error;
          }
        }
      };
    }

    return plugin;
  }

  /**
   * Load custom plugins from a directory.
   */
  private async loadCustomPlugins(dirPath: string): Promise<void> {
    try {
      const dirStat = await stat(dirPath);
      if (!dirStat.isDirectory()) {
        this.logger.warn(`Custom plugin path is not a directory: ${dirPath}`);
        return;
      }

      const files = await readdir(dirPath);

      for (const file of files) {
        const ext = extname(file);
        if (!['.js', '.mjs', '.ts'].includes(ext)) {
          continue;
        }

        try {
          const filePath = join(dirPath, file);
          const pluginModule = await import(filePath);
          const plugin = pluginModule.default as Plugin;

          if (!plugin || !plugin.name) {
            this.logger.warn(`Invalid plugin export in ${file}`);
            continue;
          }

          this.plugins.set(plugin.name, {
            ...plugin,
            config: { enabled: true, hook: 'pre-build' },
            enabled: true,
            source: 'custom',
          });

          this.logger.debug(`Loaded custom plugin: ${plugin.name} from ${file}`);
        } catch (error) {
          this.logger.warn(`Failed to load custom plugin ${file}: ${error}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to access custom plugins directory: ${error}`);
    }
  }

  /**
   * Load remote plugins from npm or git.
   */
  private async loadRemotePlugins(
    remoteConfigs: Array<{ name: string; source: string; enabled: boolean }>,
  ): Promise<void> {
    for (const remoteConfig of remoteConfigs) {
      if (!remoteConfig.enabled) {
        continue;
      }

      try {
        // Parse source URL
        let modulePath = remoteConfig.source;

        // Handle npm: prefix
        if (modulePath.startsWith('npm:')) {
          modulePath = modulePath.slice(4);
        }

        // Try to import the module
        const pluginModule = await import(modulePath);
        const plugin = pluginModule.default as Plugin;

        if (!plugin || !plugin.name) {
          this.logger.warn(`Invalid remote plugin: ${remoteConfig.name}`);
          continue;
        }

        this.plugins.set(remoteConfig.name, {
          ...plugin,
          config: { enabled: remoteConfig.enabled, hook: 'pre-build' },
          enabled: remoteConfig.enabled,
          source: 'remote',
        });

        this.logger.debug(`Loaded remote plugin: ${remoteConfig.name}`);
      } catch (error) {
        this.logger.warn(`Failed to load remote plugin ${remoteConfig.name}: ${error}`);
      }
    }
  }

  /**
   * Get a plugin by name.
   */
  get(name: string): LoadedPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all loaded plugins.
   */
  getAll(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all enabled plugins.
   */
  getEnabled(): LoadedPlugin[] {
    return this.getAll().filter((p) => p.enabled);
  }

  /**
   * Get plugins for a specific hook.
   */
  getForHook(hook: PluginHook): LoadedPlugin[] {
    return this.getEnabled().filter((p) => {
      // Check if plugin has this hook
      if (p.hooks[hook]) {
        return true;
      }
      // Check if config specifies this hook
      if (p.config.hook === hook) {
        return true;
      }
      return false;
    });
  }

  /**
   * Enable a plugin at runtime.
   */
  enable(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return false;
    }

    if (!plugin.hotSwappable) {
      this.logger.warn(`Plugin ${name} does not support hot-swap`);
      return false;
    }

    plugin.enabled = true;
    this.logger.info(`Enabled plugin: ${name}`);
    return true;
  }

  /**
   * Disable a plugin at runtime.
   */
  disable(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return false;
    }

    if (!plugin.hotSwappable) {
      this.logger.warn(`Plugin ${name} does not support hot-swap`);
      return false;
    }

    plugin.enabled = false;
    this.logger.info(`Disabled plugin: ${name}`);
    return true;
  }

  /**
   * Check if a plugin is enabled.
   */
  isEnabled(name: string): boolean {
    const plugin = this.plugins.get(name);
    return plugin?.enabled ?? false;
  }

  /**
   * List all plugin names.
   */
  list(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * List enabled plugin names.
   */
  listEnabled(): string[] {
    return this.getEnabled().map((p) => p.name);
  }

  /**
   * Get plugin info for display.
   */
  getInfo(): Array<{
    name: string;
    version: string;
    enabled: boolean;
    source: string;
    hook: string;
    hotSwappable: boolean;
  }> {
    return this.getAll().map((p) => ({
      name: p.name,
      version: p.version,
      enabled: p.enabled,
      source: p.source,
      hook: p.config.hook ?? 'pre-build',
      hotSwappable: p.hotSwappable,
    }));
  }
}

/**
 * Plugin Executor - runs plugin hooks in order.
 */
export class PluginExecutor {
  private loader: PluginLoader;
  private logger: Logger;

  constructor(loader: PluginLoader, logger?: Logger) {
    this.loader = loader;
    this.logger = logger ?? createConsoleLogger();
  }

  /**
   * Execute all plugins for a given hook.
   */
  async executeHook(
    hook: PluginHook,
    context: BuildContext,
    result?: BuildResult,
  ): Promise<void> {
    const plugins = this.loader.getForHook(hook);

    if (plugins.length === 0) {
      return;
    }

    this.logger.debug(`Executing ${plugins.length} plugins for hook: ${hook}`);

    for (const plugin of plugins) {
      const startTime = Date.now();

      try {
        this.logger.debug(`Running plugin: ${plugin.name}`);

        const hookFn = plugin.hooks[hook];
        if (hookFn) {
          await hookFn(context, result);
        }

        const duration = Date.now() - startTime;
        this.logger.debug(`Plugin ${plugin.name} completed in ${duration}ms`);

        // Record timing in metrics
        context.metrics.timing('plugin_execution_ms', duration, {
          plugin: plugin.name,
          hook,
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        const message = error instanceof Error ? error.message : String(error);

        this.logger.error(`Plugin ${plugin.name} failed: ${message}`);
        context.metrics.increment('plugin_errors_total', {
          plugin: plugin.name,
          hook,
        });

        // Check if this plugin should fail the build
        if (plugin.config.fail_on_error) {
          throw error;
        }
      }
    }
  }

  /**
   * Execute pre-build plugins.
   */
  async preBuild(context: BuildContext): Promise<void> {
    await this.executeHook('pre-build', context);
  }

  /**
   * Execute post-build plugins.
   */
  async postBuild(context: BuildContext, result: BuildResult): Promise<void> {
    await this.executeHook('post-build', context, result);
  }

  /**
   * Execute deploy plugins.
   */
  async deploy(context: BuildContext, result: BuildResult): Promise<void> {
    await this.executeHook('deploy', context, result);
  }

  /**
   * Execute error plugins.
   */
  async onError(context: BuildContext, error: Error): Promise<void> {
    const errorResult: BuildResult = {
      success: false,
      buildId: context.buildId,
      duration_ms: context.startedAt ? Date.now() - context.startedAt.getTime() : 0,
      artifacts: [],
      errors: [
        {
          code: 'PLUGIN_ERROR',
          message: error.message,
          stack: error.stack,
        },
      ],
      metrics: {
        queue_wait_ms: 0,
        total_duration_ms: 0,
        phases: {
          pre_build_ms: 0,
          build_ms: 0,
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
          peak_memory_mb: 0,
          avg_cpu_percent: 0,
          io_read_mb: 0,
          io_write_mb: 0,
        },
      },
    };

    await this.executeHook('error', context, errorResult);
  }
}

/**
 * Create a simple console logger.
 */
function createConsoleLogger(): Logger {
  const createLogFn =
    (level: string) =>
    (message: string, data?: Record<string, unknown>): void => {
      const timestamp = new Date().toISOString();
      const dataStr = data ? ` ${JSON.stringify(data)}` : '';
      console.log(`[${timestamp}] [${level.toUpperCase()}] [plugins] ${message}${dataStr}`);
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
