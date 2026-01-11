/**
 * Contexts Index
 *
 * Central export for all React Context providers.
 * These are used for state that changes INFREQUENTLY.
 *
 * WHEN TO USE CONTEXT vs ZUSTAND:
 * --------------------------------
 * Use React Context for:
 * - Theme (dark/light mode) - changes rarely
 * - Locale/i18n - changes rarely
 * - Feature flags - static after load
 * - Auth state (legacy - prefer Zustand authStore)
 *
 * Use Zustand for:
 * - UI state (modals, sidebars) - changes frequently
 * - Form state - changes on every keystroke
 * - Real-time data (timers, live updates)
 * - Anything that needs selector-based subscriptions
 *
 * @example
 * // Wrap your app with providers (in order of dependency)
 * <ThemeProvider>
 *   <LocaleProvider>
 *     <App />
 *   </LocaleProvider>
 * </ThemeProvider>
 */

// Theme Context
export {
  ThemeProvider,
  useTheme,
  getThemeColors,
  THEMES,
  THEME_COLORS,
  default as ThemeContext,
} from './ThemeContext';

// Locale Context
export {
  LocaleProvider,
  useLocale,
  useTranslation,
  LOCALES,
  LOCALE_INFO,
  default as LocaleContext,
} from './LocaleContext';

// User Context (Legacy - prefer useAuth from store)
export {
  UserProvider,
  useUser,
  default as UserContext,
} from './UserContext';

/**
 * Combined provider for convenience
 * Wraps all contexts in the correct order
 */
export function AppProviders({ children }) {
  const { ThemeProvider } = require('./ThemeContext');
  const { LocaleProvider } = require('./LocaleContext');

  return (
    <ThemeProvider>
      <LocaleProvider>
        {children}
      </LocaleProvider>
    </ThemeProvider>
  );
}
