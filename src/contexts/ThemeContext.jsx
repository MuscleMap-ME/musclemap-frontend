/**
 * Theme Context (React Context)
 *
 * Provides theme (dark/light mode) throughout the app.
 * Uses React Context because theme changes are infrequent.
 *
 * WHEN TO USE THIS vs ZUSTAND:
 * - Theme changes rarely (user manually toggles) -> Context is fine
 * - If theme changed frequently (e.g., per-page) -> Use Zustand instead
 *
 * @example
 * // In a component
 * const { theme, toggleTheme, setTheme } = useTheme();
 *
 * return (
 *   <button onClick={toggleTheme}>
 *     Current: {theme}
 *   </button>
 * );
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

// Theme options
export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
  SYSTEM: 'system',
};

// Color palette for each theme
export const THEME_COLORS = {
  dark: {
    background: '#0a0a0f',
    backgroundSecondary: '#111118',
    surface: 'rgba(255, 255, 255, 0.05)',
    surfaceHover: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textMuted: 'rgba(255, 255, 255, 0.5)',
    primary: '#0066FF',
    primaryHover: '#0052CC',
    accent: '#8B5CF6',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  light: {
    background: '#ffffff',
    backgroundSecondary: '#f8f9fa',
    surface: 'rgba(0, 0, 0, 0.03)',
    surfaceHover: 'rgba(0, 0, 0, 0.06)',
    border: 'rgba(0, 0, 0, 0.1)',
    text: '#111111',
    textSecondary: 'rgba(0, 0, 0, 0.7)',
    textMuted: 'rgba(0, 0, 0, 0.5)',
    primary: '#0066FF',
    primaryHover: '#0052CC',
    accent: '#8B5CF6',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
  },
};

// Local storage key
const THEME_STORAGE_KEY = 'musclemap_theme';

// Create context
const ThemeContext = createContext(null);

/**
 * Get system color scheme preference
 */
function getSystemTheme() {
  if (typeof window === 'undefined') return THEMES.DARK;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT;
}

/**
 * Get stored theme or default
 */
function getStoredTheme() {
  if (typeof window === 'undefined') return THEMES.DARK;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && Object.values(THEMES).includes(stored)) {
      return stored;
    }
  } catch {
    // localStorage not available
  }
  return THEMES.DARK; // Default to dark (MuscleMap brand)
}

/**
 * Theme Provider Component
 */
export function ThemeProvider({ children }) {
  const [themeSetting, setThemeSetting] = useState(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  // Resolve actual theme (considering 'system' setting)
  const resolvedTheme = themeSetting === THEMES.SYSTEM ? systemTheme : themeSetting;

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      setSystemTheme(e.matches ? THEMES.DARK : THEMES.LIGHT);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Set class for CSS
    root.classList.remove('theme-dark', 'theme-light');
    root.classList.add(`theme-${resolvedTheme}`);

    // Set CSS variables
    const colors = THEME_COLORS[resolvedTheme];
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Set meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', colors.background);
    }
  }, [resolvedTheme]);

  // Persist theme setting
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeSetting);
    } catch {
      // localStorage not available
    }
  }, [themeSetting]);

  // Memoized actions
  const setTheme = useCallback((theme) => {
    if (Object.values(THEMES).includes(theme)) {
      setThemeSetting(theme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeSetting((current) => {
      if (current === THEMES.DARK) return THEMES.LIGHT;
      if (current === THEMES.LIGHT) return THEMES.DARK;
      // If system, toggle to opposite of current system theme
      return systemTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    });
  }, [systemTheme]);

  // Memoized context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      // Current resolved theme ('dark' or 'light')
      theme: resolvedTheme,
      // User's theme setting ('dark', 'light', or 'system')
      themeSetting,
      // Theme colors for current theme
      colors: THEME_COLORS[resolvedTheme],
      // Is dark mode active
      isDark: resolvedTheme === THEMES.DARK,
      // Actions
      setTheme,
      toggleTheme,
      // Theme options for settings UI
      themeOptions: THEMES,
    }),
    [resolvedTheme, themeSetting, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

/**
 * Get theme colors outside of React components
 * (e.g., for canvas/WebGL rendering)
 */
export function getThemeColors(theme = THEMES.DARK) {
  return THEME_COLORS[theme] || THEME_COLORS.dark;
}

export default ThemeContext;
