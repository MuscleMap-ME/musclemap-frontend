/**
 * EventBus - Cross-plugin communication system
 *
 * Allows plugins to communicate without direct coupling.
 * Supports both synchronous and asynchronous event handling.
 */

import { CORE_EVENTS } from './PluginRegistry'

class EventBus {
  constructor() {
    // Event listeners map: eventName -> Set of { handler, pluginId, once }
    this.listeners = new Map()

    // Event history for debugging
    this.history = []
    this.maxHistorySize = 100

    // Wildcard listeners (listen to all events)
    this.wildcardListeners = new Set()
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name (supports wildcards like 'workout:*')
   * @param {Function} handler - Event handler function
   * @param {Object} options - Options { pluginId, once }
   * @returns {Function} Unsubscribe function
   */
  on(event, handler, options = {}) {
    const { pluginId = 'core', once = false } = options

    // Handle wildcard subscription
    if (event === '*') {
      const listener = { handler, pluginId, once }
      this.wildcardListeners.add(listener)
      return () => this.wildcardListeners.delete(listener)
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }

    const listener = { handler, pluginId, once }
    this.listeners.get(event).add(listener)

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event)
      if (eventListeners) {
        eventListeners.delete(listener)
        if (eventListeners.size === 0) {
          this.listeners.delete(event)
        }
      }
    }
  }

  /**
   * Subscribe to an event once
   */
  once(event, handler, options = {}) {
    return this.on(event, handler, { ...options, once: true })
  }

  /**
   * Unsubscribe from an event
   */
  off(event, handler) {
    const eventListeners = this.listeners.get(event)
    if (!eventListeners) return

    for (const listener of eventListeners) {
      if (listener.handler === handler) {
        eventListeners.delete(listener)
        break
      }
    }

    if (eventListeners.size === 0) {
      this.listeners.delete(event)
    }
  }

  /**
   * Remove all listeners for a plugin
   */
  offPlugin(pluginId) {
    for (const [event, listeners] of this.listeners) {
      for (const listener of listeners) {
        if (listener.pluginId === pluginId) {
          listeners.delete(listener)
        }
      }
      if (listeners.size === 0) {
        this.listeners.delete(event)
      }
    }

    // Also remove from wildcard listeners
    for (const listener of this.wildcardListeners) {
      if (listener.pluginId === pluginId) {
        this.wildcardListeners.delete(listener)
      }
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {any} payload - Event data
   * @param {Object} meta - Event metadata { pluginId, timestamp }
   */
  emit(event, payload = {}, meta = {}) {
    const { pluginId = 'core' } = meta
    const timestamp = Date.now()

    // Create event object
    const eventObj = {
      type: event,
      payload,
      meta: {
        pluginId,
        timestamp,
        ...meta,
      },
    }

    // Add to history
    this._addToHistory(eventObj)

    // Get listeners for this specific event
    const listeners = this.listeners.get(event) || new Set()

    // Get pattern-matched listeners (e.g., 'workout:*' matches 'workout:started')
    const patternListeners = this._getPatternListeners(event)

    // Combine all listeners
    const allListeners = [
      ...listeners,
      ...patternListeners,
      ...this.wildcardListeners,
    ]

    // Track listeners to remove (once listeners)
    const toRemove = []

    // Call all listeners
    for (const listener of allListeners) {
      try {
        listener.handler(eventObj)

        if (listener.once) {
          toRemove.push({ event, listener })
        }
      } catch (error) {
        console.error(
          `Error in event handler for "${event}" from plugin "${listener.pluginId}":`,
          error
        )
      }
    }

    // Remove once listeners
    for (const { event: e, listener } of toRemove) {
      if (e === '*') {
        this.wildcardListeners.delete(listener)
      } else {
        const eventListeners = this.listeners.get(e)
        if (eventListeners) {
          eventListeners.delete(listener)
        }
      }
    }

    return eventObj
  }

  /**
   * Emit an event and wait for all async handlers
   */
  async emitAsync(event, payload = {}, meta = {}) {
    const { pluginId = 'core' } = meta
    const timestamp = Date.now()

    const eventObj = {
      type: event,
      payload,
      meta: {
        pluginId,
        timestamp,
        ...meta,
      },
    }

    this._addToHistory(eventObj)

    const listeners = this.listeners.get(event) || new Set()
    const patternListeners = this._getPatternListeners(event)
    const allListeners = [
      ...listeners,
      ...patternListeners,
      ...this.wildcardListeners,
    ]

    const toRemove = []
    const results = []

    for (const listener of allListeners) {
      try {
        const result = await listener.handler(eventObj)
        results.push(result)

        if (listener.once) {
          toRemove.push({ event, listener })
        }
      } catch (error) {
        console.error(
          `Error in async event handler for "${event}" from plugin "${listener.pluginId}":`,
          error
        )
        results.push({ error })
      }
    }

    for (const { event: e, listener } of toRemove) {
      if (e === '*') {
        this.wildcardListeners.delete(listener)
      } else {
        const eventListeners = this.listeners.get(e)
        if (eventListeners) {
          eventListeners.delete(listener)
        }
      }
    }

    return results
  }

  /**
   * Get pattern-matched listeners
   * @private
   */
  _getPatternListeners(event) {
    const result = []

    for (const [pattern, listeners] of this.listeners) {
      if (pattern.endsWith(':*')) {
        const prefix = pattern.slice(0, -1) // Remove '*'
        if (event.startsWith(prefix)) {
          result.push(...listeners)
        }
      }
    }

    return result
  }

  /**
   * Add event to history
   * @private
   */
  _addToHistory(event) {
    this.history.push(event)
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
    }
  }

  /**
   * Get event history
   */
  getHistory(filter = {}) {
    let history = [...this.history]

    if (filter.event) {
      history = history.filter((e) => e.type === filter.event)
    }

    if (filter.pluginId) {
      history = history.filter((e) => e.meta.pluginId === filter.pluginId)
    }

    if (filter.since) {
      history = history.filter((e) => e.meta.timestamp >= filter.since)
    }

    return history
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.history = []
  }

  /**
   * Get list of all registered event types
   */
  getRegisteredEvents() {
    return Array.from(this.listeners.keys())
  }

  /**
   * Get listener count for an event
   */
  getListenerCount(event) {
    const listeners = this.listeners.get(event)
    return listeners ? listeners.size : 0
  }

  /**
   * Check if event has listeners
   */
  hasListeners(event) {
    return this.getListenerCount(event) > 0 || this.wildcardListeners.size > 0
  }

  /**
   * Debug: log all registered listeners
   */
  debug() {
    console.group('EventBus Debug')
    console.log('Registered Events:', this.getRegisteredEvents())
    console.log('Wildcard Listeners:', this.wildcardListeners.size)
    console.log('History Length:', this.history.length)

    for (const [event, listeners] of this.listeners) {
      console.log(`  ${event}: ${listeners.size} listener(s)`)
    }
    console.groupEnd()
  }
}

// Create singleton instance
const eventBus = new EventBus()

// Pre-define core events for type hints
CORE_EVENTS.forEach((event) => {
  // Initialize with empty set so getRegisteredEvents shows them
  if (!eventBus.listeners.has(event)) {
    eventBus.listeners.set(event, new Set())
  }
})

/**
 * React hook to subscribe to events
 */
export function useEventBus(event, handler, deps = []) {
  const { useEffect } = require('react')

  useEffect(() => {
    if (!handler) return

    const unsubscribe = eventBus.on(event, handler)
    return unsubscribe
  }, [event, ...deps])
}

/**
 * React hook to emit events
 */
export function useEmitEvent() {
  return (event, payload, meta) => eventBus.emit(event, payload, meta)
}

export { eventBus }
export default eventBus
