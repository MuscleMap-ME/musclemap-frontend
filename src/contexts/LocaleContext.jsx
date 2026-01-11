/**
 * Locale Context (React Context)
 *
 * Provides internationalization (i18n) throughout the app.
 * Uses React Context because language changes are very infrequent.
 *
 * WHEN TO USE THIS vs ZUSTAND:
 * - Language changes rarely (user changes in settings) -> Context is fine
 * - Locale data is static once loaded -> No need for Zustand selectors
 *
 * @example
 * // In a component
 * const { t, locale, setLocale } = useLocale();
 *
 * return (
 *   <div>
 *     <h1>{t('dashboard.title')}</h1>
 *     <p>{t('dashboard.welcome', { name: user.name })}</p>
 *   </div>
 * );
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

// Supported locales
export const LOCALES = {
  EN: 'en',
  ES: 'es',
  FR: 'fr',
  DE: 'de',
  PT: 'pt',
  JA: 'ja',
  ZH: 'zh',
  KO: 'ko',
};

// Locale metadata
export const LOCALE_INFO = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr' },
  de: { name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  pt: { name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  zh: { name: 'Chinese', nativeName: '中文', dir: 'ltr' },
  ko: { name: 'Korean', nativeName: '한국어', dir: 'ltr' },
};

// Default translations (English)
// Additional languages can be loaded dynamically
const defaultTranslations = {
  // Common
  'common.loading': 'Loading...',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.confirm': 'Confirm',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.done': 'Done',
  'common.close': 'Close',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.sort': 'Sort',
  'common.refresh': 'Refresh',
  'common.retry': 'Retry',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.warning': 'Warning',

  // Auth
  'auth.login': 'Log In',
  'auth.logout': 'Log Out',
  'auth.signup': 'Sign Up',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.forgotPassword': 'Forgot Password?',
  'auth.createAccount': 'Create Account',
  'auth.alreadyHaveAccount': 'Already have an account?',

  // Navigation
  'nav.dashboard': 'Dashboard',
  'nav.workout': 'Workout',
  'nav.exercises': 'Exercises',
  'nav.journey': 'Journey',
  'nav.profile': 'Profile',
  'nav.settings': 'Settings',
  'nav.community': 'Community',

  // Workout
  'workout.start': 'Start Workout',
  'workout.pause': 'Pause',
  'workout.resume': 'Resume',
  'workout.finish': 'Finish Workout',
  'workout.addSet': 'Add Set',
  'workout.rest': 'Rest',
  'workout.skip': 'Skip',
  'workout.weight': 'Weight',
  'workout.reps': 'Reps',
  'workout.sets': 'Sets',
  'workout.duration': 'Duration',
  'workout.volume': 'Volume',
  'workout.calories': 'Calories',

  // Stats
  'stats.totalWorkouts': 'Total Workouts',
  'stats.totalVolume': 'Total Volume',
  'stats.streakDays': 'Day Streak',
  'stats.level': 'Level',
  'stats.xp': 'XP',

  // Errors
  'error.generic': 'Something went wrong. Please try again.',
  'error.network': 'Network error. Check your connection.',
  'error.unauthorized': 'Please log in to continue.',
  'error.notFound': 'Not found.',
  'error.validation': 'Please check your input.',
};

// Local storage key
const LOCALE_STORAGE_KEY = 'musclemap_locale';

// Create context
const LocaleContext = createContext(null);

/**
 * Get browser's preferred language
 */
function getBrowserLocale() {
  if (typeof navigator === 'undefined') return LOCALES.EN;

  const browserLang = navigator.language?.split('-')[0];
  return Object.values(LOCALES).includes(browserLang) ? browserLang : LOCALES.EN;
}

/**
 * Get stored locale or detect from browser
 */
function getInitialLocale() {
  if (typeof window === 'undefined') return LOCALES.EN;

  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && Object.values(LOCALES).includes(stored)) {
      return stored;
    }
  } catch {
    // localStorage not available
  }

  return getBrowserLocale();
}

/**
 * Locale Provider Component
 */
export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(getInitialLocale);
  const [translations, setTranslations] = useState(defaultTranslations);
  const [isLoading, setIsLoading] = useState(false);

  // Load translations for locale
  useEffect(() => {
    async function loadTranslations() {
      if (locale === LOCALES.EN) {
        setTranslations(defaultTranslations);
        return;
      }

      setIsLoading(true);
      try {
        // Dynamic import for non-English translations
        // These would be in /src/locales/{locale}.json
        const module = await import(`../locales/${locale}.json`).catch(() => null);
        if (module?.default) {
          setTranslations({ ...defaultTranslations, ...module.default });
        } else {
          // Fallback to English if translation file not found
          setTranslations(defaultTranslations);
        }
      } catch (error) {
        console.warn(`Failed to load translations for ${locale}:`, error);
        setTranslations(defaultTranslations);
      } finally {
        setIsLoading(false);
      }
    }

    loadTranslations();
  }, [locale]);

  // Persist locale
  useEffect(() => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // localStorage not available
    }

    // Set HTML lang attribute
    document.documentElement.lang = locale;

    // Set text direction
    const localeInfo = LOCALE_INFO[locale];
    if (localeInfo) {
      document.documentElement.dir = localeInfo.dir;
    }
  }, [locale]);

  // Translation function
  const t = useCallback(
    (key, params = {}) => {
      let text = translations[key] || key;

      // Replace {{param}} placeholders
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(new RegExp(`{{${param}}}`, 'g'), String(value));
      });

      return text;
    },
    [translations]
  );

  // Set locale with validation
  const setLocale = useCallback((newLocale) => {
    if (Object.values(LOCALES).includes(newLocale)) {
      setLocaleState(newLocale);
    }
  }, []);

  // Format number according to locale
  const formatNumber = useCallback(
    (num, options = {}) => {
      return new Intl.NumberFormat(locale, options).format(num);
    },
    [locale]
  );

  // Format date according to locale
  const formatDate = useCallback(
    (date, options = {}) => {
      return new Intl.DateTimeFormat(locale, options).format(new Date(date));
    },
    [locale]
  );

  // Format relative time (e.g., "2 days ago")
  const formatRelativeTime = useCallback(
    (date, options = {}) => {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', ...options });
      const now = Date.now();
      const then = new Date(date).getTime();
      const diffInSeconds = Math.round((then - now) / 1000);

      // Find appropriate unit
      const units = [
        { unit: 'year', seconds: 31536000 },
        { unit: 'month', seconds: 2592000 },
        { unit: 'week', seconds: 604800 },
        { unit: 'day', seconds: 86400 },
        { unit: 'hour', seconds: 3600 },
        { unit: 'minute', seconds: 60 },
        { unit: 'second', seconds: 1 },
      ];

      for (const { unit, seconds } of units) {
        if (Math.abs(diffInSeconds) >= seconds || unit === 'second') {
          const value = Math.round(diffInSeconds / seconds);
          return rtf.format(value, unit);
        }
      }
    },
    [locale]
  );

  // Memoized context value
  const value = useMemo(
    () => ({
      // Current locale
      locale,
      // Locale info (name, direction, etc.)
      localeInfo: LOCALE_INFO[locale],
      // All available locales
      locales: LOCALES,
      localeList: Object.entries(LOCALE_INFO).map(([code, info]) => ({
        code,
        ...info,
      })),
      // Loading state (for language switching)
      isLoading,
      // Translation function
      t,
      // Formatting functions
      formatNumber,
      formatDate,
      formatRelativeTime,
      // Actions
      setLocale,
    }),
    [locale, isLoading, t, formatNumber, formatDate, formatRelativeTime, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * Hook to access locale context
 */
export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }

  return context;
}

/**
 * Shorthand hook for just the translation function
 */
export function useTranslation() {
  const { t } = useLocale();
  return t;
}

export default LocaleContext;
