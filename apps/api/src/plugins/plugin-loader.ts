/**
 * Plugin System
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { config } from '../config';
import { loggers } from '../lib/logger';
import { db } from '../db/client';
import { economyService } from '../modules/economy';

const log = loggers.plugins;

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  entry?: { backend?: string };
  capabilities: string[];
}

interface PluginHooks {
  onServerStart?(ctx: any): Promise<void>;
  onShutdown?(ctx: any): Promise<void>;
}

interface LoadedPlugin {
  id: string;
  manifest: PluginManifest;
  hooks: PluginHooks;
  router: Router;
  enabled: boolean;
}

const manifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  entry: z.object({ backend: z.string().optional() }).optional(),
  capabilities: z.array(z.string()),
});

class PluginRegistry {
  private plugins = new Map<string, LoadedPlugin>();
  private hooks: Map<string, Set<Function>> = new Map();

  register(plugin: LoadedPlugin): void {
    this.plugins.set(plugin.id, plugin);
    log.info({ id: plugin.id, version: plugin.manifest.version }, 'Plugin registered');
  }

  getEnabled(): LoadedPlugin[] {
    return Array.from(this.plugins.values()).filter(p => p.enabled);
  }

  getAll(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  addHook(event: string, handler: Function): void {
    if (!this.hooks.has(event)) this.hooks.set(event, new Set());
    this.hooks.get(event)!.add(handler);
  }

  async invokeHooks(event: string, ...args: any[]): Promise<void> {
    const handlers = this.hooks.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        await handler(...args);
      } catch (error) {
        log.error({ event, error }, 'Plugin hook error');
      }
    }
  }
}

export const pluginRegistry = new PluginRegistry();

function createPluginContext(pluginId: string) {
  const pluginLog = log.child({ plugin: pluginId });
  return {
    pluginId,
    db,
    config: {},
    logger: pluginLog,
    credits: {
      async charge(request: any) {
        return economyService.charge({
          userId: request.userId,
          action: `plugin:${pluginId}:${request.action}`,
          amount: request.cost,
          metadata: request.metadata,
          idempotencyKey: request.idempotencyKey,
        });
      },
      async canCharge(userId: string, amount: number) {
        return economyService.canCharge(userId, amount);
      },
      async getBalance(userId: string) {
        return economyService.getBalance(userId);
      },
    },
  };
}

export async function loadPlugin(pluginPath: string): Promise<LoadedPlugin | null> {
  // Check for plugin.json first, then manifest.json
  let manifestPath = path.join(pluginPath, 'plugin.json');
  if (!fs.existsSync(manifestPath)) {
    manifestPath = path.join(pluginPath, 'manifest.json');
  }
  if (!fs.existsSync(manifestPath)) return null;

  try {
    const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const manifest = manifestSchema.parse(manifestData) as PluginManifest;

    const pluginId = manifest.id;
    const ctx = createPluginContext(pluginId);
    const router = Router();
    const hooks: PluginHooks = {};

    // Load backend entry
    const backendEntry = manifest.entry?.backend || './backend/index.js';
    const entryPath = path.join(pluginPath, backendEntry);
    
    if (fs.existsSync(entryPath)) {
      const module = await import(entryPath);
      const registration = await (module.default || module)(ctx);
      if (registration?.registerRoutes) registration.registerRoutes(router);
      if (registration?.registerHooks) registration.registerHooks(hooks);
    } else {
      // Try .ts version for development
      const tsEntryPath = entryPath.replace('.js', '.ts');
      if (fs.existsSync(tsEntryPath)) {
        log.warn({ plugin: pluginId }, 'Plugin has .ts entry but no .js - compile plugins first');
      }
    }

    // Register in database
    await db.query(`
      INSERT INTO installed_plugins (id, name, version, display_name, description, enabled)
      VALUES ($1, $2, $3, $4, $5, TRUE)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        version = EXCLUDED.version,
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        enabled = TRUE
    `, [pluginId, manifest.name, manifest.version, manifest.name, manifest.description || null]);

    const loaded: LoadedPlugin = { id: pluginId, manifest, hooks, router, enabled: true };
    pluginRegistry.register(loaded);

    for (const [event, handler] of Object.entries(hooks)) {
      if (typeof handler === 'function') pluginRegistry.addHook(event, handler);
    }

    return loaded;
  } catch (error) {
    log.error({ path: pluginPath, error }, 'Failed to load plugin');
    return null;
  }
}

export async function loadAllPlugins(): Promise<void> {
  // Load from configured plugin directories
  const configuredDirs = config.PLUGIN_DIRS.split(',').map(d => d.trim());
  
  // Also check repo root /plugins directory
  const repoPluginsDir = path.resolve(__dirname, '../../../../plugins');
  const allDirs = [...configuredDirs];
  
  if (fs.existsSync(repoPluginsDir) && !allDirs.includes(repoPluginsDir)) {
    allDirs.push(repoPluginsDir);
  }

  for (const dir of allDirs) {
    if (!fs.existsSync(dir)) continue;
    
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        await loadPlugin(path.join(dir, entry.name));
      }
    }
  }

  log.info({ count: pluginRegistry.getAll().length }, 'All plugins loaded');
}

export function mountPluginRoutes(mainRouter: Router): void {
  for (const plugin of pluginRegistry.getEnabled()) {
    mainRouter.use(`/plugins/${plugin.id}`, plugin.router);
  }
}

export async function invokePluginHook(event: string, ...args: any[]): Promise<void> {
  await pluginRegistry.invokeHooks(event, ...args);
}
