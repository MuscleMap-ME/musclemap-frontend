/**
 * PluginRegistry - Central registry for all loaded plugins
 *
 * Manages plugin state, routes, widgets, themes, and commands.
 * Uses Zustand for reactive state management.
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

/**
 * Widget slot definitions - where plugins can inject UI
 */
export const WIDGET_SLOTS = {
  // Dashboard slots
  'dashboard.main': { description: 'Main dashboard area', multiple: true },
  'dashboard.sidebar': { description: 'Dashboard sidebar', multiple: true },
  'dashboard.header': { description: 'Dashboard header area', multiple: false },
  'dashboard.stats': { description: 'Stats section', multiple: true },

  // Profile slots
  'profile.tabs': { description: 'Profile tab panels', multiple: true },
  'profile.header': { description: 'Profile header area', multiple: false },
  'profile.sidebar': { description: 'Profile sidebar', multiple: true },

  // Workout slots
  'workout.summary': { description: 'Workout summary section', multiple: true },
  'workout.actions': { description: 'Workout action buttons', multiple: true },
  'workout.details': { description: 'Workout detail panels', multiple: true },

  // Exercise slots
  'exercise.card': { description: 'Exercise card extras', multiple: true },
  'exercise.detail': { description: 'Exercise detail panels', multiple: true },

  // Muscle visualization slots
  'muscle.detail': { description: 'Muscle detail panels', multiple: true },
  'muscle.overlay': { description: 'Muscle map overlays', multiple: true },

  // Navigation slots
  'sidebar.top': { description: 'Top of sidebar nav', multiple: true },
  'sidebar.bottom': { description: 'Bottom of sidebar nav', multiple: true },

  // Settings slots
  'settings.tabs': { description: 'Settings tab panels', multiple: true },

  // Admin slots
  'admin.dashboard': { description: 'Admin dashboard widgets', multiple: true },
}

/**
 * Core events that plugins can subscribe to
 */
export const CORE_EVENTS = [
  'app:ready',
  'user:login',
  'user:logout',
  'route:changed',
  'theme:changed',
  'workout:started',
  'workout:completed',
  'workout:paused',
  'exercise:started',
  'exercise:completed',
  'set:logged',
  'achievement:unlocked',
  'level:up',
  'credits:changed',
]

/**
 * Plugin state shape
 */
const initialState = {
  // Registered plugins
  plugins: new Map(),

  // Plugin-contributed routes
  routes: [],

  // Widget registry by slot
  widgets: Object.keys(WIDGET_SLOTS).reduce((acc, slot) => {
    acc[slot] = []
    return acc
  }, {}),

  // Navigation items
  navItems: [],

  // Command palette commands
  commands: [],

  // Themes
  themes: [],
  activeThemeId: null,

  // Loading state
  isLoading: false,
  loadingPlugins: new Set(),

  // Errors
  errors: [],
}

/**
 * Plugin Registry Store
 */
export const usePluginRegistryStore = create(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // ==================== Plugin Management ====================

    /**
     * Register a plugin with the registry
     */
    registerPlugin: (plugin) => {
      const { plugins } = get()

      if (plugins.has(plugin.id)) {
        console.warn(`Plugin "${plugin.id}" is already registered`)
        return false
      }

      set((state) => ({
        plugins: new Map(state.plugins).set(plugin.id, {
          ...plugin,
          enabled: true,
          loadedAt: Date.now(),
        }),
      }))

      return true
    },

    /**
     * Unregister a plugin
     */
    unregisterPlugin: (pluginId) => {
      const { plugins, routes, widgets, navItems, commands, themes } = get()

      if (!plugins.has(pluginId)) {
        console.warn(`Plugin "${pluginId}" is not registered`)
        return false
      }

      // Remove all contributions from this plugin
      set((state) => {
        const newPlugins = new Map(state.plugins)
        newPlugins.delete(pluginId)

        const newWidgets = { ...state.widgets }
        Object.keys(newWidgets).forEach((slot) => {
          newWidgets[slot] = newWidgets[slot].filter((w) => w.pluginId !== pluginId)
        })

        return {
          plugins: newPlugins,
          routes: state.routes.filter((r) => r.pluginId !== pluginId),
          widgets: newWidgets,
          navItems: state.navItems.filter((n) => n.pluginId !== pluginId),
          commands: state.commands.filter((c) => c.pluginId !== pluginId),
          themes: state.themes.filter((t) => t.pluginId !== pluginId),
        }
      })

      return true
    },

    /**
     * Enable/disable a plugin
     */
    setPluginEnabled: (pluginId, enabled) => {
      set((state) => {
        const newPlugins = new Map(state.plugins)
        const plugin = newPlugins.get(pluginId)
        if (plugin) {
          newPlugins.set(pluginId, { ...plugin, enabled })
        }
        return { plugins: newPlugins }
      })
    },

    /**
     * Get a plugin by ID
     */
    getPlugin: (pluginId) => {
      return get().plugins.get(pluginId)
    },

    /**
     * Get all enabled plugins
     */
    getEnabledPlugins: () => {
      const { plugins } = get()
      return Array.from(plugins.values()).filter((p) => p.enabled)
    },

    // ==================== Route Management ====================

    /**
     * Register a route from a plugin
     */
    registerRoute: (pluginId, route) => {
      set((state) => ({
        routes: [
          ...state.routes,
          {
            ...route,
            pluginId,
            id: `${pluginId}:${route.path}`,
          },
        ],
      }))
    },

    /**
     * Get all registered routes
     */
    getRoutes: () => {
      const { routes, plugins } = get()
      // Only return routes from enabled plugins
      return routes.filter((r) => {
        const plugin = plugins.get(r.pluginId)
        return plugin?.enabled
      })
    },

    // ==================== Widget Management ====================

    /**
     * Register a widget for a slot
     */
    registerWidget: (pluginId, slot, widget) => {
      if (!WIDGET_SLOTS[slot]) {
        console.warn(`Unknown widget slot: ${slot}`)
        return false
      }

      const slotConfig = WIDGET_SLOTS[slot]

      set((state) => {
        const currentWidgets = state.widgets[slot] || []

        // Check if slot allows multiple widgets
        if (!slotConfig.multiple && currentWidgets.length > 0) {
          console.warn(`Slot "${slot}" only allows one widget`)
          return state
        }

        return {
          widgets: {
            ...state.widgets,
            [slot]: [
              ...currentWidgets,
              {
                ...widget,
                pluginId,
                id: `${pluginId}:${widget.id || slot}`,
              },
            ],
          },
        }
      })

      return true
    },

    /**
     * Get widgets for a specific slot
     */
    getWidgetsForSlot: (slot) => {
      const { widgets, plugins } = get()
      const slotWidgets = widgets[slot] || []

      // Only return widgets from enabled plugins
      return slotWidgets.filter((w) => {
        const plugin = plugins.get(w.pluginId)
        return plugin?.enabled
      })
    },

    // ==================== Navigation Management ====================

    /**
     * Register a navigation item
     */
    registerNavItem: (pluginId, navItem) => {
      set((state) => ({
        navItems: [
          ...state.navItems,
          {
            ...navItem,
            pluginId,
            id: `${pluginId}:${navItem.path}`,
          },
        ].sort((a, b) => (a.order || 100) - (b.order || 100)),
      }))
    },

    /**
     * Get navigation items for a section
     */
    getNavItems: (section = null) => {
      const { navItems, plugins } = get()

      return navItems
        .filter((n) => {
          const plugin = plugins.get(n.pluginId)
          if (!plugin?.enabled) return false
          if (section && n.section !== section) return false
          return true
        })
        .sort((a, b) => (a.order || 100) - (b.order || 100))
    },

    // ==================== Command Management ====================

    /**
     * Register a command
     */
    registerCommand: (pluginId, command) => {
      set((state) => ({
        commands: [
          ...state.commands,
          {
            ...command,
            pluginId,
            id: command.id || `${pluginId}:${command.title}`,
          },
        ],
      }))
    },

    /**
     * Get all commands
     */
    getCommands: () => {
      const { commands, plugins } = get()
      return commands.filter((c) => {
        const plugin = plugins.get(c.pluginId)
        return plugin?.enabled
      })
    },

    /**
     * Execute a command by ID
     */
    executeCommand: async (commandId, ...args) => {
      const { commands } = get()
      const command = commands.find((c) => c.id === commandId)

      if (!command) {
        console.warn(`Command "${commandId}" not found`)
        return
      }

      if (typeof command.handler === 'function') {
        return await command.handler(...args)
      }
    },

    // ==================== Theme Management ====================

    /**
     * Register a theme
     */
    registerTheme: (pluginId, theme) => {
      set((state) => ({
        themes: [
          ...state.themes,
          {
            ...theme,
            pluginId,
            id: theme.id || `${pluginId}:theme`,
          },
        ],
      }))
    },

    /**
     * Set the active theme
     */
    setActiveTheme: (themeId) => {
      set({ activeThemeId: themeId })
    },

    /**
     * Get the active theme
     */
    getActiveTheme: () => {
      const { themes, activeThemeId } = get()
      if (!activeThemeId) return null
      return themes.find((t) => t.id === activeThemeId) || null
    },

    /**
     * Get all themes
     */
    getThemes: () => {
      const { themes, plugins } = get()
      return themes.filter((t) => {
        const plugin = plugins.get(t.pluginId)
        return plugin?.enabled
      })
    },

    // ==================== Loading State ====================

    /**
     * Set loading state for a plugin
     */
    setPluginLoading: (pluginId, isLoading) => {
      set((state) => {
        const loadingPlugins = new Set(state.loadingPlugins)
        if (isLoading) {
          loadingPlugins.add(pluginId)
        } else {
          loadingPlugins.delete(pluginId)
        }
        return {
          loadingPlugins,
          isLoading: loadingPlugins.size > 0,
        }
      })
    },

    // ==================== Error Management ====================

    /**
     * Add an error
     */
    addError: (error) => {
      set((state) => ({
        errors: [
          ...state.errors,
          {
            ...error,
            id: `error-${Date.now()}`,
            timestamp: Date.now(),
          },
        ],
      }))
    },

    /**
     * Clear errors for a plugin
     */
    clearErrors: (pluginId = null) => {
      set((state) => ({
        errors: pluginId
          ? state.errors.filter((e) => e.pluginId !== pluginId)
          : [],
      }))
    },

    // ==================== Reset ====================

    /**
     * Reset the registry to initial state
     */
    reset: () => {
      set(initialState)
    },
  }))
)

/**
 * Selector hooks for common operations
 */
export const usePlugins = () =>
  usePluginRegistryStore((state) => Array.from(state.plugins.values()))

export const usePluginRoutes = () =>
  usePluginRegistryStore((state) => state.getRoutes())

export const useWidgetsForSlot = (slot) =>
  usePluginRegistryStore((state) => state.getWidgetsForSlot(slot))

export const usePluginNavItems = (section) =>
  usePluginRegistryStore((state) => state.getNavItems(section))

export const usePluginCommands = () =>
  usePluginRegistryStore((state) => state.getCommands())

export const usePluginThemes = () =>
  usePluginRegistryStore((state) => state.getThemes())

export const useActiveTheme = () =>
  usePluginRegistryStore((state) => state.getActiveTheme())

export const usePluginLoading = () =>
  usePluginRegistryStore((state) => state.isLoading)

export const usePluginErrors = () =>
  usePluginRegistryStore((state) => state.errors)

export default usePluginRegistryStore
