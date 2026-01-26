/**
 * BuildNet Plugin System
 *
 * Provides a flexible plugin architecture for extending the build pipeline.
 *
 * Plugin Hooks:
 * - pre-build: Runs before the build starts (typecheck, lint, clean)
 * - build: The main build phase (handled by bundler adapters)
 * - post-build: Runs after build completes (compress, sourcemaps)
 * - deploy: Runs during deployment (rsync, pm2 restart, notify)
 * - error: Runs when an error occurs
 *
 * Plugin Sources:
 * - Core plugins: Built-in plugins (typecheck, lint, compress, etc.)
 * - Custom plugins: User-defined plugins from a directory
 * - Remote plugins: Plugins from npm or git
 */

export { PluginLoader, PluginExecutor, type LoadedPlugin } from './plugin-loader.js';

// Re-export types
export type {
  Plugin,
  PluginConfig,
  PluginsConfig,
  PluginHook,
  PluginHandler,
} from '../types/index.js';

// Export core plugins for direct import if needed
export { default as typecheckPlugin } from './core/typecheck.js';
export { default as lintPlugin } from './core/lint.js';
export { default as compressPlugin } from './core/compress.js';
export { default as cleanPlugin } from './core/clean.js';
export { default as notifyPlugin } from './core/notify.js';
export { default as sourcemapsPlugin } from './core/sourcemaps.js';

/**
 * Default plugins configuration.
 */
export const DEFAULT_PLUGINS_CONFIG = {
  core: {
    typecheck: {
      enabled: true,
      hook: 'pre-build' as const,
      command: 'pnpm typecheck',
      fail_on_error: true,
    },
    lint: {
      enabled: true,
      hook: 'pre-build' as const,
      command: 'pnpm lint',
      fail_on_error: false,
    },
    clean: {
      enabled: false,
      hook: 'pre-build' as const,
    },
    compress: {
      enabled: true,
      hook: 'post-build' as const,
    },
    sourcemaps: {
      enabled: false,
      hook: 'post-build' as const,
    },
    notify: {
      enabled: false,
      hook: 'deploy' as const,
    },
  },
};

/**
 * Create a simple plugin from a command string.
 *
 * @example
 * const myPlugin = createCommandPlugin('my-plugin', 'npm run custom-task', {
 *   hook: 'pre-build',
 *   failOnError: true,
 * });
 */
export function createCommandPlugin(
  name: string,
  command: string,
  options: {
    hook?: 'pre-build' | 'post-build' | 'deploy';
    failOnError?: boolean;
    description?: string;
  } = {},
) {
  const hook = options.hook ?? 'pre-build';

  return {
    name,
    version: '1.0.0',
    hotSwappable: true,
    description: options.description,
    hooks: {
      [hook]: async (context: import('../types/index.js').BuildContext) => {
        const { exec } = await import('node:child_process');
        const { promisify } = await import('node:util');
        const execAsync = promisify(exec);

        context.logger.info(`[${name}] Running: ${command}`);
        const startTime = Date.now();

        try {
          const { stdout, stderr } = await execAsync(command, {
            cwd: context.workDir,
            env: { ...process.env, ...context.env },
            maxBuffer: 50 * 1024 * 1024,
          });

          const duration = Date.now() - startTime;

          if (stdout) {
            context.logger.debug(`[${name}] ${stdout.slice(0, 1000)}`);
          }
          if (stderr) {
            context.logger.warn(`[${name}] ${stderr.slice(0, 1000)}`);
          }

          context.logger.info(`[${name}] Completed in ${duration}ms`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          context.logger.error(`[${name}] Failed: ${message}`);

          if (options.failOnError) {
            throw error;
          }
        }
      },
    },
  };
}

/**
 * Plugin template for creating new plugins.
 *
 * @example
 * // my-custom-plugin.ts
 * import { definePlugin } from '@buildnet/core/plugins';
 *
 * export default definePlugin({
 *   name: 'my-custom-plugin',
 *   version: '1.0.0',
 *   hooks: {
 *     'pre-build': async (ctx) => {
 *       ctx.logger.info('Running custom pre-build logic');
 *     },
 *     'post-build': async (ctx, result) => {
 *       if (result?.success) {
 *         ctx.logger.info('Build succeeded!');
 *       }
 *     },
 *   },
 * });
 */
export function definePlugin(plugin: import('../types/index.js').Plugin) {
  return {
    ...plugin,
    hotSwappable: plugin.hotSwappable ?? true,
  };
}
