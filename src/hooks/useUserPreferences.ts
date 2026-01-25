/**
 * useUserPreferences - Manage and persist user display preferences
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 *
 * Features:
 * - Syncs to localStorage for guests
 * - Syncs to server for authenticated users
 * - Applies preferences to CSS custom properties
 * - Handles system preference detection
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  UserPreferences,
  DisplayPreferences,
  LocalePreferences,
  MeasurementPreferences,
  AccessibilityPreferences,
  SupportedLocale,
} from '../types/userPreferences';
import {
  DEFAULT_USER_PREFERENCES,
  SUPPORTED_LOCALES,
  getMeasurementPresetForLocale,
} from '../types/userPreferences';

/* ==========================================================================
   STORAGE KEYS
   ========================================================================== */

const STORAGE_KEY = 'musclemap:preferences';
const SCHEMA_VERSION = 1;

/* ==========================================================================
   PREFERENCE APPLICATION
   ========================================================================== */

/**
 * Apply display preferences to CSS custom properties
 */
function applyDisplayPreferencesToDOM(display: DisplayPreferences): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Typography parameters
  root.style.setProperty('--param-base-size', String(display.fontSize));
  root.style.setProperty('--param-scale-ratio', String(display.typeScaleRatio));
  root.style.setProperty('--param-line-height', String(display.lineHeight));

  // Color parameters
  root.style.setProperty('--param-hue-primary', String(display.primaryHue));

  // Density
  root.setAttribute('data-density', display.density);

  // Motion
  root.setAttribute('data-motion', display.motion);

  // Contrast
  root.setAttribute('data-contrast', display.contrast);

  // Color scheme
  if (display.colorScheme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', display.colorScheme);
  }

  // Forced rendering tier
  if (display.forcedRenderingTier) {
    root.setAttribute('data-rendering-tier', display.forcedRenderingTier);
  }
}

/**
 * Apply locale preferences to DOM
 */
function applyLocalePreferencesToDOM(locale: LocalePreferences): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Set lang attribute
  root.setAttribute('lang', locale.locale.split('-')[0]);

  // Set direction
  const localeInfo = SUPPORTED_LOCALES.find((l) => l.code === locale.locale);
  const direction =
    locale.writingDirection === 'auto'
      ? localeInfo?.direction || 'ltr'
      : locale.writingDirection;

  root.setAttribute('dir', direction);
  root.style.setProperty('--direction', direction);
  root.style.setProperty('--direction-coefficient', direction === 'rtl' ? '-1' : '1');

  // Set writing mode
  root.style.setProperty('writing-mode', locale.writingMode);
}

/**
 * Apply accessibility preferences to DOM
 */
function applyAccessibilityPreferencesToDOM(a11y: AccessibilityPreferences): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Screen reader mode
  if (a11y.screenReaderMode) {
    root.setAttribute('data-screen-reader', 'true');
  } else {
    root.removeAttribute('data-screen-reader');
  }

  // Always show focus
  if (a11y.alwaysShowFocus) {
    root.setAttribute('data-always-focus', 'true');
  } else {
    root.removeAttribute('data-always-focus');
  }

  // Reduce transparency
  if (a11y.reduceTransparency) {
    root.setAttribute('data-reduce-transparency', 'true');
  } else {
    root.removeAttribute('data-reduce-transparency');
  }

  // Large targets
  if (a11y.largeTargets) {
    root.setAttribute('data-large-targets', 'true');
  } else {
    root.removeAttribute('data-large-targets');
  }

  // Dyslexia friendly
  if (a11y.dyslexiaFriendly) {
    root.setAttribute('data-dyslexia-friendly', 'true');
  } else {
    root.removeAttribute('data-dyslexia-friendly');
  }
}

/**
 * Apply all preferences to DOM
 */
function applyPreferencesToDOM(prefs: UserPreferences): void {
  applyDisplayPreferencesToDOM(prefs.display);
  applyLocalePreferencesToDOM(prefs.locale);
  applyAccessibilityPreferencesToDOM(prefs.accessibility);
}

/* ==========================================================================
   STORAGE HELPERS
   ========================================================================== */

/**
 * Load preferences from localStorage
 */
function loadFromStorage(): UserPreferences | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as UserPreferences;

    // Check schema version for migrations
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      // TODO: Implement migration logic
      console.log('[UserPreferences] Schema version mismatch, using defaults');
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('[UserPreferences] Failed to load from storage:', error);
    return null;
  }
}

/**
 * Save preferences to localStorage
 */
function saveToStorage(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    const toStore: UserPreferences = {
      ...prefs,
      updatedAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (error) {
    console.warn('[UserPreferences] Failed to save to storage:', error);
  }
}

/* ==========================================================================
   SYSTEM PREFERENCE DETECTION
   ========================================================================== */

/**
 * Detect system preferences
 */
function detectSystemPreferences(): Partial<UserPreferences> {
  if (typeof window === 'undefined') {
    return {};
  }

  const systemPrefs: Partial<UserPreferences> = {
    display: {
      ...DEFAULT_USER_PREFERENCES.display,
    },
    locale: {
      ...DEFAULT_USER_PREFERENCES.locale,
    },
  };

  // Color scheme
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    systemPrefs.display!.colorScheme = 'light';
  }

  // Reduced motion
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    systemPrefs.display!.motion = 'reduced';
  }

  // High contrast
  if (window.matchMedia?.('(prefers-contrast: more)').matches) {
    systemPrefs.display!.contrast = 'high';
  }

  // Timezone
  try {
    systemPrefs.locale!.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // Ignore
  }

  // Locale from browser
  try {
    const browserLocale = navigator.language;
    const matchingLocale = SUPPORTED_LOCALES.find(
      (l) => l.code === browserLocale || l.code.startsWith(browserLocale.split('-')[0])
    );
    if (matchingLocale) {
      systemPrefs.locale!.locale = matchingLocale.code;
    }
  } catch {
    // Ignore
  }

  return systemPrefs;
}

/* ==========================================================================
   MAIN HOOK
   ========================================================================== */

export interface UseUserPreferencesReturn {
  preferences: UserPreferences;
  isLoading: boolean;

  // Display setters
  setFontSize: (size: number) => void;
  setTypeScale: (ratio: number) => void;
  setLineHeight: (height: number) => void;
  setDensity: (density: DisplayPreferences['density']) => void;
  setMotion: (motion: DisplayPreferences['motion']) => void;
  setContrast: (contrast: DisplayPreferences['contrast']) => void;
  setColorScheme: (scheme: DisplayPreferences['colorScheme']) => void;
  setPrimaryHue: (hue: number) => void;
  setDisplayPreferences: (display: Partial<DisplayPreferences>) => void;

  // Locale setters
  setLocale: (locale: SupportedLocale) => void;
  setTimezone: (timezone: string) => void;
  setAutoDetectTimezone: (auto: boolean) => void;
  setWritingDirection: (dir: LocalePreferences['writingDirection']) => void;
  setLocalePreferences: (locale: Partial<LocalePreferences>) => void;

  // Measurement setters
  setWeightUnit: (unit: MeasurementPreferences['weight']) => void;
  setDistanceUnit: (unit: MeasurementPreferences['distance']) => void;
  setHeightUnit: (unit: MeasurementPreferences['height']) => void;
  setTemperatureUnit: (unit: MeasurementPreferences['temperature']) => void;
  setDateFormat: (format: MeasurementPreferences['dateFormat']) => void;
  setTimeFormat: (format: MeasurementPreferences['timeFormat']) => void;
  setMeasurementPreferences: (measurement: Partial<MeasurementPreferences>) => void;

  // Accessibility setters
  setScreenReaderMode: (enabled: boolean) => void;
  setAlwaysShowFocus: (enabled: boolean) => void;
  setReduceTransparency: (enabled: boolean) => void;
  setLargeTargets: (enabled: boolean) => void;
  setDyslexiaFriendly: (enabled: boolean) => void;
  setAccessibilityPreferences: (a11y: Partial<AccessibilityPreferences>) => void;

  // Utility
  resetToDefaults: () => void;
  applyLocalePreset: (locale: SupportedLocale) => void;
  exportPreferences: () => string;
  importPreferences: (json: string) => boolean;
}

export function useUserPreferences(): UseUserPreferencesReturn {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from storage or system preferences
  useEffect(() => {
    const stored = loadFromStorage();
    const system = detectSystemPreferences();

    if (stored) {
      // Merge stored with any new system preferences
      setPreferences(stored);
    } else {
      // First visit - use system preferences with defaults
      setPreferences({
        ...DEFAULT_USER_PREFERENCES,
        display: { ...DEFAULT_USER_PREFERENCES.display, ...system.display },
        locale: { ...DEFAULT_USER_PREFERENCES.locale, ...system.locale },
      });
    }

    setIsLoading(false);
  }, []);

  // Apply preferences to DOM when they change
  useEffect(() => {
    if (!isLoading) {
      applyPreferencesToDOM(preferences);
      saveToStorage(preferences);
    }
  }, [preferences, isLoading]);

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: light)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');

    const handleColorScheme = (e: MediaQueryListEvent) => {
      setPreferences((prev) => {
        if (prev.display.colorScheme === 'system') {
          // Just trigger re-render - we don't actually store system value
          return { ...prev };
        }
        return prev;
      });
    };

    const handleMotion = (e: MediaQueryListEvent) => {
      setPreferences((prev) => {
        if (prev.display.motion === 'normal' && e.matches) {
          return { ...prev, display: { ...prev.display, motion: 'reduced' } };
        }
        return prev;
      });
    };

    const handleContrast = (e: MediaQueryListEvent) => {
      setPreferences((prev) => {
        if (prev.display.contrast === 'normal' && e.matches) {
          return { ...prev, display: { ...prev.display, contrast: 'high' } };
        }
        return prev;
      });
    };

    colorSchemeQuery.addEventListener('change', handleColorScheme);
    motionQuery.addEventListener('change', handleMotion);
    contrastQuery.addEventListener('change', handleContrast);

    return () => {
      colorSchemeQuery.removeEventListener('change', handleColorScheme);
      motionQuery.removeEventListener('change', handleMotion);
      contrastQuery.removeEventListener('change', handleContrast);
    };
  }, []);

  // =========================================================================
  // Setters
  // =========================================================================

  // Display setters
  const setFontSize = useCallback((size: number) => {
    setPreferences((prev) => ({
      ...prev,
      display: { ...prev.display, fontSize: Math.min(24, Math.max(12, size)) },
    }));
  }, []);

  const setTypeScale = useCallback((ratio: number) => {
    setPreferences((prev) => ({
      ...prev,
      display: { ...prev.display, typeScaleRatio: Math.min(1.5, Math.max(1.125, ratio)) },
    }));
  }, []);

  const setLineHeight = useCallback((height: number) => {
    setPreferences((prev) => ({
      ...prev,
      display: { ...prev.display, lineHeight: Math.min(2, Math.max(1.3, height)) },
    }));
  }, []);

  const setDensity = useCallback((density: DisplayPreferences['density']) => {
    setPreferences((prev) => ({
      ...prev,
      display: { ...prev.display, density },
    }));
  }, []);

  const setMotion = useCallback((motion: DisplayPreferences['motion']) => {
    setPreferences((prev) => ({
      ...prev,
      display: { ...prev.display, motion },
    }));
  }, []);

  const setContrast = useCallback((contrast: DisplayPreferences['contrast']) => {
    setPreferences((prev) => ({
      ...prev,
      display: { ...prev.display, contrast },
    }));
  }, []);

  const setColorScheme = useCallback((colorScheme: DisplayPreferences['colorScheme']) => {
    setPreferences((prev) => ({
      ...prev,
      display: { ...prev.display, colorScheme },
    }));
  }, []);

  const setPrimaryHue = useCallback((hue: number) => {
    setPreferences((prev) => ({
      ...prev,
      display: { ...prev.display, primaryHue: Math.min(360, Math.max(0, hue)) },
    }));
  }, []);

  const setDisplayPreferences = useCallback((display: Partial<DisplayPreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      display: { ...prev.display, ...display },
    }));
  }, []);

  // Locale setters
  const setLocale = useCallback((locale: SupportedLocale) => {
    setPreferences((prev) => ({
      ...prev,
      locale: { ...prev.locale, locale },
    }));
  }, []);

  const setTimezone = useCallback((timezone: string) => {
    setPreferences((prev) => ({
      ...prev,
      locale: { ...prev.locale, timezone, autoDetectTimezone: false },
    }));
  }, []);

  const setAutoDetectTimezone = useCallback((auto: boolean) => {
    setPreferences((prev) => {
      const timezone = auto
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : prev.locale.timezone;
      return {
        ...prev,
        locale: { ...prev.locale, autoDetectTimezone: auto, timezone },
      };
    });
  }, []);

  const setWritingDirection = useCallback((writingDirection: LocalePreferences['writingDirection']) => {
    setPreferences((prev) => ({
      ...prev,
      locale: { ...prev.locale, writingDirection },
    }));
  }, []);

  const setLocalePreferences = useCallback((locale: Partial<LocalePreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      locale: { ...prev.locale, ...locale },
    }));
  }, []);

  // Measurement setters
  const setWeightUnit = useCallback((weight: MeasurementPreferences['weight']) => {
    setPreferences((prev) => ({
      ...prev,
      measurement: { ...prev.measurement, weight },
    }));
  }, []);

  const setDistanceUnit = useCallback((distance: MeasurementPreferences['distance']) => {
    setPreferences((prev) => ({
      ...prev,
      measurement: { ...prev.measurement, distance },
    }));
  }, []);

  const setHeightUnit = useCallback((height: MeasurementPreferences['height']) => {
    setPreferences((prev) => ({
      ...prev,
      measurement: { ...prev.measurement, height },
    }));
  }, []);

  const setTemperatureUnit = useCallback((temperature: MeasurementPreferences['temperature']) => {
    setPreferences((prev) => ({
      ...prev,
      measurement: { ...prev.measurement, temperature },
    }));
  }, []);

  const setDateFormat = useCallback((dateFormat: MeasurementPreferences['dateFormat']) => {
    setPreferences((prev) => ({
      ...prev,
      measurement: { ...prev.measurement, dateFormat },
    }));
  }, []);

  const setTimeFormat = useCallback((timeFormat: MeasurementPreferences['timeFormat']) => {
    setPreferences((prev) => ({
      ...prev,
      measurement: { ...prev.measurement, timeFormat },
    }));
  }, []);

  const setMeasurementPreferences = useCallback((measurement: Partial<MeasurementPreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      measurement: { ...prev.measurement, ...measurement },
    }));
  }, []);

  // Accessibility setters
  const setScreenReaderMode = useCallback((screenReaderMode: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      accessibility: { ...prev.accessibility, screenReaderMode },
    }));
  }, []);

  const setAlwaysShowFocus = useCallback((alwaysShowFocus: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      accessibility: { ...prev.accessibility, alwaysShowFocus },
    }));
  }, []);

  const setReduceTransparency = useCallback((reduceTransparency: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      accessibility: { ...prev.accessibility, reduceTransparency },
    }));
  }, []);

  const setLargeTargets = useCallback((largeTargets: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      accessibility: { ...prev.accessibility, largeTargets },
    }));
  }, []);

  const setDyslexiaFriendly = useCallback((dyslexiaFriendly: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      accessibility: { ...prev.accessibility, dyslexiaFriendly },
    }));
  }, []);

  const setAccessibilityPreferences = useCallback((a11y: Partial<AccessibilityPreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      accessibility: { ...prev.accessibility, ...a11y },
    }));
  }, []);

  // Utility functions
  const resetToDefaults = useCallback(() => {
    const system = detectSystemPreferences();
    setPreferences({
      ...DEFAULT_USER_PREFERENCES,
      display: { ...DEFAULT_USER_PREFERENCES.display, ...system.display },
      locale: { ...DEFAULT_USER_PREFERENCES.locale, ...system.locale },
    });
  }, []);

  const applyLocalePreset = useCallback((locale: SupportedLocale) => {
    const measurements = getMeasurementPresetForLocale(locale);
    const localeInfo = SUPPORTED_LOCALES.find((l) => l.code === locale);

    setPreferences((prev) => ({
      ...prev,
      locale: {
        ...prev.locale,
        locale,
        writingDirection: 'auto',
      },
      measurement: measurements,
    }));
  }, []);

  const exportPreferences = useCallback((): string => {
    return JSON.stringify(preferences, null, 2);
  }, [preferences]);

  const importPreferences = useCallback((json: string): boolean => {
    try {
      const imported = JSON.parse(json) as UserPreferences;

      // Basic validation
      if (!imported.display || !imported.locale || !imported.measurement) {
        return false;
      }

      setPreferences({
        ...DEFAULT_USER_PREFERENCES,
        ...imported,
        updatedAt: new Date().toISOString(),
        schemaVersion: SCHEMA_VERSION,
      });

      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    preferences,
    isLoading,

    // Display
    setFontSize,
    setTypeScale,
    setLineHeight,
    setDensity,
    setMotion,
    setContrast,
    setColorScheme,
    setPrimaryHue,
    setDisplayPreferences,

    // Locale
    setLocale,
    setTimezone,
    setAutoDetectTimezone,
    setWritingDirection,
    setLocalePreferences,

    // Measurement
    setWeightUnit,
    setDistanceUnit,
    setHeightUnit,
    setTemperatureUnit,
    setDateFormat,
    setTimeFormat,
    setMeasurementPreferences,

    // Accessibility
    setScreenReaderMode,
    setAlwaysShowFocus,
    setReduceTransparency,
    setLargeTargets,
    setDyslexiaFriendly,
    setAccessibilityPreferences,

    // Utility
    resetToDefaults,
    applyLocalePreset,
    exportPreferences,
    importPreferences,
  };
}

export default useUserPreferences;
