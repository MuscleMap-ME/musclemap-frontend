/**
 * MuscleMap Plugin System
 *
 * A comprehensive extension system that allows community contributions.
 *
 * @module plugins
 */

// Core Registry
export {
  usePluginRegistryStore,
  usePlugins,
  usePluginRoutes,
  useWidgetsForSlot,
  usePluginNavItems,
  usePluginCommands,
  usePluginThemes,
  useActiveTheme,
  usePluginLoading,
  usePluginErrors,
  WIDGET_SLOTS,
  CORE_EVENTS,
} from './PluginRegistry'

// Event Bus
export {
  eventBus,
  useEventBus,
  useEmitEvent,
} from './EventBus'

// Hook Registry
export {
  hookRegistry,
  useFilter,
  useActions,
  useAddFilter,
  useAddAction,
  FILTER_HOOKS,
  ACTION_HOOKS,
} from './HookRegistry'

// Plugin Loader
export {
  validateManifest,
  createPluginContext,
  loadPlugin,
  unloadPlugin,
  discoverPlugins,
  getInstalledPlugins,
  installPlugin,
  uninstallPlugin,
  loadBuiltInPlugins,
} from './PluginLoader'

// Widget Slot
export {
  WidgetSlot,
  useHasWidgets,
  useWidgetCount,
  withWidgetSlot,
  WidgetSlotDebug,
} from './WidgetSlot'

// Plugin Context
export {
  PluginProvider,
  usePluginServices,
  usePluginEventBus,
  usePluginHooks,
  usePluginEvent,
  useEmitPluginEvent,
  usePluginFilter,
  useApplyFilter,
  usePluginAction,
  useGetActions,
  useLoadPlugin,
  useUnloadPlugin,
} from './PluginContext'

// Theme Provider
export {
  PluginThemeProvider,
  usePluginTheme,
  useCurrentTheme,
  useAvailableThemes,
  useSetTheme,
  useThemeColor,
  useThemeColors,
  ThemePreview,
  ThemeSelector,
  DEFAULT_THEME,
} from './ThemeProvider'

// Default exports are available as named exports above:
// - PluginProvider from './PluginContext'
// - PluginThemeProvider from './ThemeProvider'
// - WidgetSlot from './WidgetSlot'
