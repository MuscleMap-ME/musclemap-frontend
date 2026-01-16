/**
 * PluginContext - React context provider for plugin services
 *
 * Provides:
 * - Plugin registry access
 * - Event bus
 * - Hook registry
 * - API client
 * - Notification service
 * - Navigation
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { usePluginRegistryStore } from './PluginRegistry'
import eventBus from './EventBus'
import hookRegistry from './HookRegistry'
import { loadPlugin, unloadPlugin, loadBuiltInPlugins } from './PluginLoader'
import { useToast } from '../hooks'
import api from '../utils/api'

// Create context
const PluginServicesContext = createContext(null)

/**
 * Plugin Provider component
 */
export function PluginProvider({ children, builtInPlugins = [] }) {
  const navigate = useNavigate()
  const toast = useToast()

  // Get registry actions
  const registry = usePluginRegistryStore()

  // Create services object
  const services = useMemo(
    () => ({
      api,
      navigate,
      toast,
      graphql: null, // Will be set from Apollo context if needed
    }),
    [navigate, toast]
  )

  // Load built-in plugins on mount
  useEffect(() => {
    if (builtInPlugins.length > 0) {
      loadBuiltInPlugins(builtInPlugins, services).then((results) => {
        const failed = results.filter((r) => !r.success)
        if (failed.length > 0) {
          console.warn('Some plugins failed to load:', failed)
        }
      })
    }

    // Emit app ready event
    eventBus.emit('app:ready', { timestamp: Date.now() })

    // Cleanup on unmount
    return () => {
      // Unload all plugins
      for (const [pluginId] of registry.plugins) {
        unloadPlugin(pluginId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Emit route change events
  useEffect(() => {
    const handleRouteChange = () => {
      eventBus.emit('route:changed', {
        path: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      })
    }

    // Listen for popstate (back/forward)
    window.addEventListener('popstate', handleRouteChange)

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  // Context value
  const contextValue = useMemo(
    () => ({
      // Registry
      registry,

      // Event bus
      eventBus,
      on: eventBus.on.bind(eventBus),
      emit: eventBus.emit.bind(eventBus),

      // Hook registry
      hookRegistry,
      addFilter: hookRegistry.addFilter.bind(hookRegistry),
      addAction: hookRegistry.addAction.bind(hookRegistry),
      applyFilters: hookRegistry.applyFilters.bind(hookRegistry),
      getActions: hookRegistry.getActions.bind(hookRegistry),

      // Services
      services,

      // Plugin management
      loadPlugin: (manifest, entry) => loadPlugin(manifest, entry, services),
      unloadPlugin,
    }),
    [registry, services]
  )

  return (
    <PluginServicesContext.Provider value={contextValue}>
      {children}
    </PluginServicesContext.Provider>
  )
}

/**
 * Hook to access plugin services
 */
export function usePluginServices() {
  const context = useContext(PluginServicesContext)
  if (!context) {
    throw new Error('usePluginServices must be used within a PluginProvider')
  }
  return context
}

/**
 * Hook to access the event bus
 */
export function usePluginEventBus() {
  const { eventBus, on, emit } = usePluginServices()
  return { eventBus, on, emit }
}

/**
 * Hook to access hooks registry
 */
export function usePluginHooks() {
  const { hookRegistry, addFilter, addAction, applyFilters, getActions } =
    usePluginServices()
  return { hookRegistry, addFilter, addAction, applyFilters, getActions }
}

/**
 * Hook to subscribe to an event (with auto-cleanup)
 */
export function usePluginEvent(event, handler, deps = []) {
  const { on } = usePluginServices()

  useEffect(() => {
    if (!handler) return

    const unsubscribe = on(event, handler)
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, on, ...deps])
}

/**
 * Hook to emit events
 */
export function useEmitPluginEvent() {
  const { emit } = usePluginServices()
  return useCallback(
    (event, payload, meta) => emit(event, payload, meta),
    [emit]
  )
}

/**
 * Hook to register a filter (with auto-cleanup)
 */
export function usePluginFilter(name, handler, options = {}, deps = []) {
  const { addFilter } = usePluginServices()

  useEffect(() => {
    if (!handler) return

    return addFilter(name, handler, options)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, addFilter, ...deps])
}

/**
 * Hook to apply filters
 */
export function useApplyFilter(name, value, deps = []) {
  const { applyFilters } = usePluginServices()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => applyFilters(name, value), [name, value, applyFilters, ...deps])
}

/**
 * Hook to register an action (with auto-cleanup)
 */
export function usePluginAction(name, handler, options = {}, deps = []) {
  const { addAction } = usePluginServices()

  useEffect(() => {
    if (!handler) return

    return addAction(name, handler, options)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, addAction, ...deps])
}

/**
 * Hook to get actions for a hook
 */
export function useGetActions(name, context = {}, deps = []) {
  const { getActions } = usePluginServices()

  return useMemo(
    () => getActions(name, context),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name, JSON.stringify(context), getActions, ...deps]
  )
}

/**
 * Hook to load a plugin dynamically
 */
export function useLoadPlugin() {
  const { loadPlugin: load } = usePluginServices()
  return load
}

/**
 * Hook to unload a plugin
 */
export function useUnloadPlugin() {
  const { unloadPlugin: unload } = usePluginServices()
  return unload
}

export default PluginProvider
