/**
 * HookRegistry - WordPress-style filter and action hooks for deep integration
 *
 * Allows plugins to:
 * - Filter data before it's displayed (modify workout stats, add links, etc.)
 * - Add actions to UI elements (add buttons to cards, menu items, etc.)
 * - Extend forms with custom fields
 * - Add context menu items
 */

class HookRegistry {
  constructor() {
    // Filters: hooks that transform data
    // filterName -> [{ handler, pluginId, priority }]
    this.filters = new Map()

    // Actions: hooks that add UI elements or side effects
    // actionName -> [{ handler, pluginId, priority }]
    this.actions = new Map()
  }

  // ==================== Filters ====================

  /**
   * Register a filter hook
   * @param {string} name - Filter name (e.g., 'filter:workout-stats')
   * @param {Function} handler - Function that receives data and returns modified data
   * @param {Object} options - { pluginId, priority }
   * @returns {Function} Unregister function
   */
  addFilter(name, handler, options = {}) {
    const { pluginId = 'core', priority = 10 } = options

    if (!this.filters.has(name)) {
      this.filters.set(name, [])
    }

    const filter = { handler, pluginId, priority }
    const filters = this.filters.get(name)
    filters.push(filter)

    // Sort by priority (lower = earlier)
    filters.sort((a, b) => a.priority - b.priority)

    return () => this.removeFilter(name, handler)
  }

  /**
   * Remove a filter hook
   */
  removeFilter(name, handler) {
    const filters = this.filters.get(name)
    if (!filters) return

    const index = filters.findIndex((f) => f.handler === handler)
    if (index !== -1) {
      filters.splice(index, 1)
    }
  }

  /**
   * Apply all filters to a value
   * @param {string} name - Filter name
   * @param {any} value - Initial value to filter
   * @param {...any} args - Additional arguments passed to filters
   * @returns {any} Filtered value
   */
  applyFilters(name, value, ...args) {
    const filters = this.filters.get(name)
    if (!filters || filters.length === 0) {
      return value
    }

    let result = value
    for (const filter of filters) {
      try {
        result = filter.handler(result, ...args)
      } catch (error) {
        console.error(
          `Error in filter "${name}" from plugin "${filter.pluginId}":`,
          error
        )
      }
    }

    return result
  }

  /**
   * Apply filters asynchronously
   */
  async applyFiltersAsync(name, value, ...args) {
    const filters = this.filters.get(name)
    if (!filters || filters.length === 0) {
      return value
    }

    let result = value
    for (const filter of filters) {
      try {
        result = await filter.handler(result, ...args)
      } catch (error) {
        console.error(
          `Error in async filter "${name}" from plugin "${filter.pluginId}":`,
          error
        )
      }
    }

    return result
  }

  // ==================== Actions ====================

  /**
   * Register an action hook
   * @param {string} name - Action name (e.g., 'action:workout-card')
   * @param {Function} handler - Function that returns action items
   * @param {Object} options - { pluginId, priority }
   * @returns {Function} Unregister function
   */
  addAction(name, handler, options = {}) {
    const { pluginId = 'core', priority = 10 } = options

    if (!this.actions.has(name)) {
      this.actions.set(name, [])
    }

    const action = { handler, pluginId, priority }
    const actions = this.actions.get(name)
    actions.push(action)
    actions.sort((a, b) => a.priority - b.priority)

    return () => this.removeAction(name, handler)
  }

  /**
   * Remove an action hook
   */
  removeAction(name, handler) {
    const actions = this.actions.get(name)
    if (!actions) return

    const index = actions.findIndex((a) => a.handler === handler)
    if (index !== -1) {
      actions.splice(index, 1)
    }
  }

  /**
   * Get all action items for a hook
   * @param {string} name - Action name
   * @param {Object} context - Context passed to action handlers
   * @returns {Array} Array of action items
   */
  getActions(name, context = {}) {
    const actions = this.actions.get(name)
    if (!actions || actions.length === 0) {
      return []
    }

    const results = []
    for (const action of actions) {
      try {
        const items = action.handler(context)
        if (Array.isArray(items)) {
          results.push(...items.map((item) => ({ ...item, pluginId: action.pluginId })))
        } else if (items) {
          results.push({ ...items, pluginId: action.pluginId })
        }
      } catch (error) {
        console.error(
          `Error in action "${name}" from plugin "${action.pluginId}":`,
          error
        )
      }
    }

    return results
  }

  /**
   * Execute all action handlers (for side effects)
   */
  doAction(name, ...args) {
    const actions = this.actions.get(name)
    if (!actions) return

    for (const action of actions) {
      try {
        action.handler(...args)
      } catch (error) {
        console.error(
          `Error in action "${name}" from plugin "${action.pluginId}":`,
          error
        )
      }
    }
  }

  /**
   * Execute all action handlers asynchronously
   */
  async doActionAsync(name, ...args) {
    const actions = this.actions.get(name)
    if (!actions) return

    for (const action of actions) {
      try {
        await action.handler(...args)
      } catch (error) {
        console.error(
          `Error in async action "${name}" from plugin "${action.pluginId}":`,
          error
        )
      }
    }
  }

  // ==================== Plugin Management ====================

  /**
   * Remove all hooks from a plugin
   */
  removePluginHooks(pluginId) {
    for (const [name, filters] of this.filters) {
      this.filters.set(
        name,
        filters.filter((f) => f.pluginId !== pluginId)
      )
    }

    for (const [name, actions] of this.actions) {
      this.actions.set(
        name,
        actions.filter((a) => a.pluginId !== pluginId)
      )
    }
  }

  // ==================== Utilities ====================

  /**
   * Check if a filter has any handlers
   */
  hasFilter(name) {
    const filters = this.filters.get(name)
    return filters && filters.length > 0
  }

  /**
   * Check if an action has any handlers
   */
  hasAction(name) {
    const actions = this.actions.get(name)
    return actions && actions.length > 0
  }

  /**
   * Get all registered hook names
   */
  getRegisteredHooks() {
    return {
      filters: Array.from(this.filters.keys()),
      actions: Array.from(this.actions.keys()),
    }
  }

  /**
   * Debug: log all registered hooks
   */
  debug() {
    console.group('HookRegistry Debug')
    console.log('Filters:', this.filters.size)
    for (const [name, filters] of this.filters) {
      console.log(`  ${name}: ${filters.length} handler(s)`)
    }
    console.log('Actions:', this.actions.size)
    for (const [name, actions] of this.actions) {
      console.log(`  ${name}: ${actions.length} handler(s)`)
    }
    console.groupEnd()
  }
}

// Create singleton instance
const hookRegistry = new HookRegistry()

// ==================== Pre-defined Hook Names ====================

/**
 * Available filter hooks (for documentation)
 */
export const FILTER_HOOKS = {
  // Workout filters
  'filter:workout-stats': 'Modify workout statistics before display',
  'filter:workout-title': 'Modify workout title',
  'filter:workout-exercises': 'Modify exercise list in workout',

  // Exercise filters
  'filter:exercise-data': 'Modify exercise data before display',
  'filter:exercise-sets': 'Modify sets data',

  // Profile filters
  'filter:profile-stats': 'Modify profile statistics',
  'filter:profile-achievements': 'Modify achievements list',

  // Dashboard filters
  'filter:dashboard-stats': 'Modify dashboard statistics',
  'filter:recent-workouts': 'Modify recent workouts list',

  // Navigation filters
  'filter:nav-items': 'Modify navigation items',
  'filter:breadcrumbs': 'Modify breadcrumb items',
}

/**
 * Available action hooks (for documentation)
 */
export const ACTION_HOOKS = {
  // Card actions
  'action:workout-card': 'Add actions to workout cards',
  'action:exercise-card': 'Add actions to exercise cards',
  'action:profile-card': 'Add actions to profile cards',

  // Menu actions
  'menu:workout-options': 'Add items to workout options menu',
  'menu:exercise-options': 'Add items to exercise options menu',
  'menu:user-options': 'Add items to user options menu',

  // Form extensions
  'fields:workout-form': 'Add fields to workout form',
  'fields:exercise-form': 'Add fields to exercise form',
  'fields:profile-form': 'Add fields to profile form',
  'fields:settings-form': 'Add fields to settings form',

  // Button groups
  'buttons:workout-actions': 'Add buttons to workout actions',
  'buttons:dashboard-quick': 'Add quick action buttons to dashboard',

  // Lifecycle hooks
  'lifecycle:before-workout-save': 'Run before workout is saved',
  'lifecycle:after-workout-save': 'Run after workout is saved',
  'lifecycle:before-exercise-log': 'Run before exercise is logged',
  'lifecycle:after-exercise-log': 'Run after exercise is logged',
}

// ==================== React Hooks ====================

/**
 * React hook to use a filter
 */
export function useFilter(name, value, deps = []) {
  const { useMemo } = require('react')

  return useMemo(() => {
    return hookRegistry.applyFilters(name, value)
  }, [name, value, ...deps])
}

/**
 * React hook to get actions
 */
export function useActions(name, context = {}, deps = []) {
  const { useMemo } = require('react')

  return useMemo(() => {
    return hookRegistry.getActions(name, context)
  }, [name, JSON.stringify(context), ...deps])
}

/**
 * React hook to register a filter (auto-cleanup)
 */
export function useAddFilter(name, handler, options = {}, deps = []) {
  const { useEffect } = require('react')

  useEffect(() => {
    return hookRegistry.addFilter(name, handler, options)
  }, [name, ...deps])
}

/**
 * React hook to register an action (auto-cleanup)
 */
export function useAddAction(name, handler, options = {}, deps = []) {
  const { useEffect } = require('react')

  useEffect(() => {
    return hookRegistry.addAction(name, handler, options)
  }, [name, ...deps])
}

export { hookRegistry }
export default hookRegistry
