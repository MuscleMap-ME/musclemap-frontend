/**
 * ThemeProvider - Apply plugin themes via CSS variables
 *
 * Allows plugins to contribute custom themes that override
 * the default MuscleMap design tokens.
 */

import React, { useEffect, useMemo, createContext, useContext } from 'react'
import { usePluginRegistryStore, useActiveTheme, usePluginThemes } from './PluginRegistry'
import eventBus from './EventBus'

// Default MuscleMap theme
export const DEFAULT_THEME = {
  id: 'default',
  name: 'MuscleMap Default',
  colors: {
    // Brand colors
    'brand-primary': '#0066FF',
    'brand-secondary': '#00D4FF',
    'brand-accent': '#FF6B00',

    // Background colors
    'bg-primary': '#0a0a0f',
    'bg-secondary': '#12121a',
    'bg-tertiary': '#1a1a25',
    'bg-card': 'rgba(255, 255, 255, 0.03)',
    'bg-card-hover': 'rgba(255, 255, 255, 0.06)',

    // Text colors
    'text-primary': '#ffffff',
    'text-secondary': 'rgba(255, 255, 255, 0.7)',
    'text-tertiary': 'rgba(255, 255, 255, 0.5)',
    'text-muted': 'rgba(255, 255, 255, 0.3)',

    // Border colors
    'border-primary': 'rgba(255, 255, 255, 0.1)',
    'border-secondary': 'rgba(255, 255, 255, 0.05)',
    'border-focus': '#0066FF',

    // Status colors
    'success': '#00FF88',
    'warning': '#FFB800',
    'error': '#FF4757',
    'info': '#00D4FF',

    // Muscle activation colors
    'muscle-inactive': '#2a2a35',
    'muscle-low': '#3d5a80',
    'muscle-medium': '#ee6c4d',
    'muscle-high': '#e63946',

    // Glass effect
    'glass-bg': 'rgba(255, 255, 255, 0.03)',
    'glass-border': 'rgba(255, 255, 255, 0.08)',
    'glass-shadow': 'rgba(0, 0, 0, 0.3)',
  },
  fonts: {
    heading: 'Bebas Neue, sans-serif',
    body: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
}

// Theme context
const PluginThemeContext = createContext(null)

/**
 * Apply theme to document
 */
function applyThemeToDocument(theme) {
  const root = document.documentElement

  // Apply colors
  if (theme.colors) {
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })
  }

  // Apply fonts
  if (theme.fonts) {
    Object.entries(theme.fonts).forEach(([key, value]) => {
      root.style.setProperty(`--font-${key}`, value)
    })
  }

  // Apply spacing
  if (theme.spacing) {
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value)
    })
  }

  // Apply radius
  if (theme.radius) {
    Object.entries(theme.radius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value)
    })
  }

  // Set theme class on body for CSS selectors
  document.body.setAttribute('data-theme', theme.id)
}

/**
 * Reset theme to default
 */
function resetTheme() { // eslint-disable-line @typescript-eslint/no-unused-vars
  applyThemeToDocument(DEFAULT_THEME)
}

/**
 * PluginThemeProvider component
 */
export function PluginThemeProvider({ children }) {
  const activeTheme = useActiveTheme()
  const themes = usePluginThemes()
  const setActiveTheme = usePluginRegistryStore((s) => s.setActiveTheme)

  // Merge active theme with defaults
  const currentTheme = useMemo(() => {
    if (!activeTheme) return DEFAULT_THEME

    return {
      ...DEFAULT_THEME,
      ...activeTheme,
      colors: {
        ...DEFAULT_THEME.colors,
        ...activeTheme.colors,
      },
      fonts: {
        ...DEFAULT_THEME.fonts,
        ...activeTheme.fonts,
      },
      spacing: {
        ...DEFAULT_THEME.spacing,
        ...activeTheme.spacing,
      },
      radius: {
        ...DEFAULT_THEME.radius,
        ...activeTheme.radius,
      },
    }
  }, [activeTheme])

  // Apply theme when it changes
  useEffect(() => {
    applyThemeToDocument(currentTheme)

    // Emit theme change event
    eventBus.emit('theme:changed', {
      themeId: currentTheme.id,
      theme: currentTheme,
    })
  }, [currentTheme])

  // Apply default theme on mount
  useEffect(() => {
    applyThemeToDocument(DEFAULT_THEME)
  }, [])

  // Context value
  const contextValue = useMemo(
    () => ({
      currentTheme,
      themes: [DEFAULT_THEME, ...themes],
      setTheme: setActiveTheme,
      resetTheme: () => setActiveTheme(null),
      getColor: (name) => currentTheme.colors?.[name],
      getFont: (name) => currentTheme.fonts?.[name],
    }),
    [currentTheme, themes, setActiveTheme]
  )

  return (
    <PluginThemeContext.Provider value={contextValue}>
      {children}
    </PluginThemeContext.Provider>
  )
}

/**
 * Hook to access theme context
 */
export function usePluginTheme() {
  const context = useContext(PluginThemeContext)
  if (!context) {
    throw new Error('usePluginTheme must be used within a PluginThemeProvider')
  }
  return context
}

/**
 * Hook to get current theme
 */
export function useCurrentTheme() {
  const { currentTheme } = usePluginTheme()
  return currentTheme
}

/**
 * Hook to get available themes
 */
export function useAvailableThemes() {
  const { themes } = usePluginTheme()
  return themes
}

/**
 * Hook to set theme
 */
export function useSetTheme() {
  const { setTheme } = usePluginTheme()
  return setTheme
}

/**
 * Hook to get a specific color
 */
export function useThemeColor(name) {
  const { getColor } = usePluginTheme()
  return getColor(name)
}

/**
 * Hook to get theme colors object
 */
export function useThemeColors() {
  const { currentTheme } = usePluginTheme()
  return currentTheme.colors
}

/**
 * Theme preview component
 */
export function ThemePreview({ theme, isActive, onClick }) {
  const colors = theme.colors || {}

  return (
    <button
      onClick={onClick}
      className={`
        relative p-3 rounded-xl border transition-all
        ${
          isActive
            ? 'border-blue-500 ring-2 ring-blue-500/30'
            : 'border-white/10 hover:border-white/20'
        }
      `}
      style={{ backgroundColor: colors['bg-primary'] || '#0a0a0f' }}
    >
      {/* Color swatches */}
      <div className="flex gap-1 mb-2">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: colors['brand-primary'] || '#0066FF' }}
        />
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: colors['brand-secondary'] || '#00D4FF' }}
        />
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: colors['success'] || '#00FF88' }}
        />
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: colors['error'] || '#FF4757' }}
        />
      </div>

      {/* Theme name */}
      <p
        className="text-xs font-medium truncate"
        style={{ color: colors['text-primary'] || '#ffffff' }}
      >
        {theme.name}
      </p>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
      )}
    </button>
  )
}

/**
 * Theme selector component
 */
export function ThemeSelector({ className = '' }) {
  const { themes, currentTheme, setTheme, resetTheme } = usePluginTheme()

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${className}`}>
      {themes.map((theme) => (
        <ThemePreview
          key={theme.id}
          theme={theme}
          isActive={currentTheme.id === theme.id}
          onClick={() =>
            theme.id === 'default' ? resetTheme() : setTheme(theme.id)
          }
        />
      ))}
    </div>
  )
}

export default PluginThemeProvider
