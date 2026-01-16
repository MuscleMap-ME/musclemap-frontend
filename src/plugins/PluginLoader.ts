/**
 * PluginLoader - Load and initialize plugins from manifests
 *
 * Handles:
 * - Loading plugin manifests
 * - Validating manifests
 * - Loading plugin modules (lazy)
 * - Initializing plugins with context
 * - Managing plugin lifecycle
 */

import { usePluginRegistryStore } from './PluginRegistry'
import eventBus from './EventBus'
import hookRegistry from './HookRegistry'

// ==================== Manifest Validation ====================

/**
 * Required fields in a plugin manifest
 */
const REQUIRED_MANIFEST_FIELDS = ['id', 'name', 'version']

/**
 * Valid capability types
 */
const VALID_CAPABILITIES = [
  'routes',
  'widgets',
  'themes',
  'commands',
  'settings',
  'graphql',
  'hooks',
]

/**
 * Validate a plugin manifest
 */
export function validateManifest(manifest) {
  const errors = []

  // Check required fields
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (!manifest[field]) {
      errors.push(`Missing required field: ${field}`)
    }
  }

  // Validate ID format (kebab-case)
  if (manifest.id && !/^[a-z0-9-]+$/.test(manifest.id)) {
    errors.push('Plugin ID must be lowercase alphanumeric with hyphens only')
  }

  // Validate version format (semver-ish)
  if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
    errors.push('Version must be in semver format (e.g., 1.0.0)')
  }

  // Validate capabilities
  if (manifest.capabilities) {
    for (const cap of manifest.capabilities) {
      if (!VALID_CAPABILITIES.includes(cap)) {
        errors.push(`Unknown capability: ${cap}`)
      }
    }
  }

  // Validate entry points exist
  if (manifest.entry) {
    if (manifest.entry.frontend && typeof manifest.entry.frontend !== 'string') {
      errors.push('entry.frontend must be a string path')
    }
    if (manifest.entry.backend && typeof manifest.entry.backend !== 'string') {
      errors.push('entry.backend must be a string path')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ==================== Plugin Context ====================

/**
 * Create a context object for a plugin
 */
export function createPluginContext(manifest, services = {}) {
  const pluginId = manifest.id

  return {
    pluginId,
    manifest,
    config: manifest.config || {},

    // Services
    api: services.api || null,
    graphql: services.graphql || null,
    navigate: services.navigate || (() => {}),

    // Notification service
    notify: {
      success: (message) => services.toast?.success?.(message),
      error: (message) => services.toast?.error?.(message),
      info: (message) => services.toast?.info?.(message),
      warning: (message) => services.toast?.warning?.(message),
    },

    // Event bus (scoped to this plugin)
    on: (event, handler) => eventBus.on(event, handler, { pluginId }),
    once: (event, handler) => eventBus.once(event, handler, { pluginId }),
    emit: (event, payload) => eventBus.emit(event, payload, { pluginId }),
    off: (event, handler) => eventBus.off(event, handler),

    // Hook registry (scoped to this plugin)
    addFilter: (name, handler, options = {}) =>
      hookRegistry.addFilter(name, handler, { ...options, pluginId }),
    addAction: (name, handler, options = {}) =>
      hookRegistry.addAction(name, handler, { ...options, pluginId }),
    applyFilters: hookRegistry.applyFilters.bind(hookRegistry),
    getActions: hookRegistry.getActions.bind(hookRegistry),

    // Storage (scoped to this plugin)
    storage: {
      get: (key) => {
        try {
          const data = localStorage.getItem(`plugin:${pluginId}:${key}`)
          return data ? JSON.parse(data) : null
        } catch {
          return null
        }
      },
      set: (key, value) => {
        try {
          localStorage.setItem(`plugin:${pluginId}:${key}`, JSON.stringify(value))
        } catch (error) {
          console.error(`Failed to save plugin data: ${error}`)
        }
      },
      remove: (key) => {
        localStorage.removeItem(`plugin:${pluginId}:${key}`)
      },
      clear: () => {
        const prefix = `plugin:${pluginId}:`
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i)
          if (key?.startsWith(prefix)) {
            localStorage.removeItem(key)
          }
        }
      },
    },

    // Logger
    log: {
      debug: (...args) => console.debug(`[${pluginId}]`, ...args),
      info: (...args) => console.info(`[${pluginId}]`, ...args),
      warn: (...args) => console.warn(`[${pluginId}]`, ...args),
      error: (...args) => console.error(`[${pluginId}]`, ...args),
    },
  }
}

// ==================== Plugin Loading ====================

/**
 * Load a plugin from its manifest and entry point
 */
export async function loadPlugin(manifest, entryModule, services = {}) {
  const registry = usePluginRegistryStore.getState()

  // Validate manifest
  const validation = validateManifest(manifest)
  if (!validation.valid) {
    registry.addError({
      pluginId: manifest.id || 'unknown',
      type: 'validation',
      message: `Invalid manifest: ${validation.errors.join(', ')}`,
    })
    return { success: false, errors: validation.errors }
  }

  const pluginId = manifest.id

  // Check if already loaded
  if (registry.plugins.has(pluginId)) {
    return { success: false, errors: ['Plugin already loaded'] }
  }

  // Set loading state
  registry.setPluginLoading(pluginId, true)

  try {
    // Create plugin context
    const ctx = createPluginContext(manifest, services)

    // Initialize entry module
    let entry = entryModule
    if (typeof entryModule === 'function') {
      entry = await entryModule(ctx)
    }

    // Register the plugin
    registry.registerPlugin({
      id: pluginId,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      manifest,
      entry,
      context: ctx,
    })

    // Register contributions from manifest
    if (manifest.contributes) {
      await registerContributions(pluginId, manifest.contributes, entry)
    }

    // Call plugin's onLoad hook
    if (entry?.onLoad) {
      await entry.onLoad(ctx)
    }

    // Emit plugin loaded event
    eventBus.emit('plugin:loaded', { pluginId, manifest })

    registry.setPluginLoading(pluginId, false)

    return { success: true, pluginId }
  } catch (error) {
    registry.setPluginLoading(pluginId, false)
    registry.addError({
      pluginId,
      type: 'load',
      message: error.message,
      stack: error.stack,
    })
    console.error(`Failed to load plugin "${pluginId}":`, error)
    return { success: false, errors: [error.message] }
  }
}

/**
 * Register contributions from a plugin manifest
 */
async function registerContributions(pluginId, contributes, entry) {
  const registry = usePluginRegistryStore.getState()

  // Register routes
  if (contributes.routes) {
    for (const route of contributes.routes) {
      // Get component from entry if specified by name
      let component = route.component
      if (typeof component === 'string' && entry?.routes?.[component]) {
        component = entry.routes[component]
      }

      registry.registerRoute(pluginId, {
        path: route.path,
        title: route.title,
        icon: route.icon,
        component,
        protected: route.protected !== false,
        admin: route.admin || false,
      })
    }
  }

  // Register widgets
  if (contributes.widgets) {
    for (const widget of contributes.widgets) {
      let component = widget.component
      if (typeof component === 'string' && entry?.widgets?.[component]) {
        component = entry.widgets[component]
      }

      registry.registerWidget(pluginId, widget.slot, {
        id: widget.id || widget.component,
        component,
        props: widget.defaultProps || {},
        order: widget.order || 100,
      })
    }
  }

  // Register nav items
  if (contributes.navItems) {
    for (const navItem of contributes.navItems) {
      registry.registerNavItem(pluginId, {
        label: navItem.label,
        path: navItem.path,
        icon: navItem.icon,
        section: navItem.section || 'main',
        order: navItem.order || 100,
        badge: navItem.badge,
      })
    }
  }

  // Register commands
  if (contributes.commands) {
    for (const command of contributes.commands) {
      let handler = command.handler
      if (typeof handler === 'string' && entry?.commands?.[handler]) {
        handler = entry.commands[handler]
      }

      registry.registerCommand(pluginId, {
        id: command.id,
        title: command.title,
        description: command.description,
        icon: command.icon,
        keybinding: command.keybinding,
        handler,
      })
    }
  }

  // Register themes
  if (contributes.themes || entry?.themes) {
    const themes = contributes.themes || entry.themes || []
    for (const theme of themes) {
      registry.registerTheme(pluginId, {
        id: theme.id,
        name: theme.name,
        colors: theme.colors,
        fonts: theme.fonts,
        preview: theme.preview,
      })
    }
  }
}

// ==================== Plugin Unloading ====================

/**
 * Unload a plugin
 */
export async function unloadPlugin(pluginId) {
  const registry = usePluginRegistryStore.getState()
  const plugin = registry.plugins.get(pluginId)

  if (!plugin) {
    return { success: false, errors: ['Plugin not found'] }
  }

  try {
    // Call plugin's onUnload hook
    if (plugin.entry?.onUnload) {
      await plugin.entry.onUnload()
    }

    // Remove all event listeners for this plugin
    eventBus.offPlugin(pluginId)

    // Remove all hooks for this plugin
    hookRegistry.removePluginHooks(pluginId)

    // Unregister from registry (removes routes, widgets, etc.)
    registry.unregisterPlugin(pluginId)

    // Emit plugin unloaded event
    eventBus.emit('plugin:unloaded', { pluginId })

    return { success: true }
  } catch (error) {
    console.error(`Failed to unload plugin "${pluginId}":`, error)
    return { success: false, errors: [error.message] }
  }
}

// ==================== Plugin Discovery ====================

/**
 * Discover available plugins from the API
 */
export async function discoverPlugins(api) {
  try {
    const response = await api.get('/plugins/available')
    return response.data || []
  } catch (error) {
    console.error('Failed to discover plugins:', error)
    return []
  }
}

/**
 * Get installed plugins from the API
 */
export async function getInstalledPlugins(api) {
  try {
    const response = await api.get('/plugins/installed')
    return response.data || []
  } catch (error) {
    console.error('Failed to get installed plugins:', error)
    return []
  }
}

/**
 * Install a plugin from a GitHub repository
 */
export async function installPlugin(api, repo) {
  try {
    const response = await api.post('/plugins/install', { repo })
    return { success: true, plugin: response.data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Uninstall a plugin
 */
export async function uninstallPlugin(api, pluginId) {
  try {
    await api.delete(`/plugins/${pluginId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ==================== Built-in Plugins Loader ====================

/**
 * Load all built-in plugins
 */
export async function loadBuiltInPlugins(plugins, services) {
  const results = []

  for (const plugin of plugins) {
    const result = await loadPlugin(plugin.manifest, plugin.entry, services)
    results.push({
      pluginId: plugin.manifest.id,
      ...result,
    })
  }

  // Emit all plugins loaded event
  eventBus.emit('plugins:ready', { count: results.length })

  return results
}

export default {
  validateManifest,
  createPluginContext,
  loadPlugin,
  unloadPlugin,
  discoverPlugins,
  getInstalledPlugins,
  installPlugin,
  uninstallPlugin,
  loadBuiltInPlugins,
}
