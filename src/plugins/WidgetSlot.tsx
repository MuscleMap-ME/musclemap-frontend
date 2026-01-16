/**
 * WidgetSlot - Render plugin widgets in designated slots
 *
 * Usage:
 *   <WidgetSlot name="dashboard.main" />
 *   <WidgetSlot name="profile.tabs" context={{ userId: '123' }} />
 */

import React, { Suspense, useMemo } from 'react'
import { useWidgetsForSlot, WIDGET_SLOTS } from './PluginRegistry'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Default loading skeleton for widgets
 */
function WidgetSkeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/5 border border-white/10 p-4 ${className}`}
    >
      <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
      <div className="h-20 bg-white/10 rounded" />
    </div>
  )
}

/**
 * Error boundary for individual widgets
 */
class WidgetErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      `Widget error in slot "${this.props.slot}" from plugin "${this.props.pluginId}":`,
      error,
      errorInfo
    )
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm">
          <p className="font-medium">Widget Error</p>
          <p className="text-red-400/70 text-xs mt-1">
            Plugin: {this.props.pluginId}
          </p>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Single widget wrapper with error boundary and suspense
 */
function WidgetWrapper({
  widget,
  slot,
  context,
  skeleton,
  animate,
  className,
}) {
  const { component: Component, props: defaultProps, pluginId, id } = widget

  // Merge default props with context
  const mergedProps = useMemo(
    () => ({
      ...defaultProps,
      ...context,
      pluginId,
      widgetId: id,
    }),
    [defaultProps, context, pluginId, id]
  )

  const content = (
    <WidgetErrorBoundary slot={slot} pluginId={pluginId}>
      <Suspense fallback={skeleton || <WidgetSkeleton />}>
        {typeof Component === 'function' ? (
          <Component {...mergedProps} />
        ) : (
          Component
        )}
      </Suspense>
    </WidgetErrorBoundary>
  )

  if (animate) {
    return (
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={className}
      >
        {content}
      </motion.div>
    )
  }

  return (
    <div key={id} className={className}>
      {content}
    </div>
  )
}

/**
 * WidgetSlot component - renders all widgets registered for a slot
 */
export function WidgetSlot({
  name,
  context = {},
  skeleton,
  fallback,
  className = '',
  widgetClassName = '',
  layout = 'vertical', // 'vertical' | 'horizontal' | 'grid'
  gap = 4,
  animate = true,
  maxWidgets,
  emptyMessage,
}) {
  const widgets = useWidgetsForSlot(name)

  // Check if slot is valid
  if (!WIDGET_SLOTS[name]) {
    console.warn(`Unknown widget slot: ${name}`)
    return null
  }

  // Limit number of widgets if specified
  const displayWidgets = maxWidgets
    ? widgets.slice(0, maxWidgets)
    : widgets

  // No widgets registered
  if (displayWidgets.length === 0) {
    if (fallback) return fallback
    if (emptyMessage) {
      return (
        <div className={`text-white/40 text-sm ${className}`}>
          {emptyMessage}
        </div>
      )
    }
    return null
  }

  // Layout classes
  const layoutClasses = {
    vertical: `flex flex-col gap-${gap}`,
    horizontal: `flex flex-row gap-${gap} overflow-x-auto`,
    grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-${gap}`,
  }

  const containerClass = `${layoutClasses[layout] || layoutClasses.vertical} ${className}`

  return (
    <div className={containerClass} data-widget-slot={name}>
      <AnimatePresence mode="popLayout">
        {displayWidgets.map((widget) => (
          <WidgetWrapper
            key={widget.id}
            widget={widget}
            slot={name}
            context={context}
            skeleton={skeleton}
            animate={animate}
            className={widgetClassName}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

/**
 * Hook to check if a slot has widgets
 */
export function useHasWidgets(slot) {
  const widgets = useWidgetsForSlot(slot)
  return widgets.length > 0
}

/**
 * Hook to get widget count for a slot
 */
export function useWidgetCount(slot) {
  const widgets = useWidgetsForSlot(slot)
  return widgets.length
}

/**
 * HOC to inject widgets into a component
 */
export function withWidgetSlot(slot, options = {}) {
  return function (WrappedComponent) {
    return function WithWidgetSlot(props) {
      const widgets = useWidgetsForSlot(slot)
      return (
        <WrappedComponent
          {...props}
          pluginWidgets={widgets}
          widgetSlot={
            <WidgetSlot name={slot} context={props} {...options} />
          }
        />
      )
    }
  }
}

/**
 * Individual slot debug item component - allows hooks to be called properly
 */
function SlotDebugItem({ name, config }) {
  const widgets = useWidgetsForSlot(name);
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <span className="text-blue-400">{name}</span>
        <span className="text-white/40">
          ({widgets.length} widget{widgets.length !== 1 ? 's' : ''})
        </span>
        {!config.multiple && (
          <span className="text-yellow-400 text-xs">[single]</span>
        )}
      </div>
      <div className="text-white/50 text-xs ml-4">
        {config.description}
      </div>
      {widgets.length > 0 && (
        <ul className="ml-4 mt-1 text-xs text-white/60">
          {widgets.map((w) => (
            <li key={w.id}>
              • {w.id} <span className="text-white/40">({w.pluginId})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Debug component to show all slots and their widgets
 */
export function WidgetSlotDebug() {
  return (
    <div className="p-4 bg-black/50 rounded-xl text-sm font-mono">
      <h3 className="text-white font-bold mb-4">Widget Slots</h3>
      {Object.entries(WIDGET_SLOTS).map(([name, config]) => (
        <SlotDebugItem key={name} name={name} config={config} />
      ))}
    </div>
  );
}

export default WidgetSlot
