/**
 * MuscleMap User Preferences Type Definitions
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 */

import type { RenderingTier } from '../hooks/useRenderingTier';

/* ==========================================================================
   DISPLAY PREFERENCES
   ========================================================================== */

export type DensityPreset = 'compact' | 'normal' | 'comfortable';
export type MotionPreset = 'none' | 'reduced' | 'normal' | 'enhanced';
export type ContrastPreset = 'normal' | 'high';
export type ColorScheme = 'dark' | 'light' | 'system';

export interface DisplayPreferences {
  /**
   * Font size base in pixels (12-24)
   */
  fontSize: number;

  /**
   * Type scale ratio (1.125 to 1.5)
   * Common scales: 1.125 (Major Second), 1.2 (Minor Third), 1.25 (Major Third), 1.333 (Perfect Fourth)
   */
  typeScaleRatio: number;

  /**
   * Base line height (1.3 to 2.0)
   */
  lineHeight: number;

  /**
   * Information density (affects spacing)
   */
  density: DensityPreset;

  /**
   * Motion/animation level
   */
  motion: MotionPreset;

  /**
   * Contrast level
   */
  contrast: ContrastPreset;

  /**
   * Color scheme preference
   */
  colorScheme: ColorScheme;

  /**
   * Primary color hue (0-360)
   */
  primaryHue: number;

  /**
   * Force a specific rendering tier (overrides auto-detection)
   */
  forcedRenderingTier?: RenderingTier;
}

/* ==========================================================================
   LOCALE PREFERENCES
   ========================================================================== */

export type SupportedLocale =
  // Americas
  | 'en-US' | 'en-GB' | 'es-ES' | 'es-MX' | 'pt-BR' | 'fr-CA'
  // Europe
  | 'de-DE' | 'fr-FR' | 'it-IT' | 'pt-PT' | 'nl-NL' | 'pl-PL'
  | 'sv-SE' | 'no-NO' | 'da-DK' | 'fi-FI'
  // Middle East
  | 'ar-SA' | 'he-IL' | 'tr-TR'
  // Asia
  | 'ja-JP' | 'ko-KR' | 'zh-CN' | 'zh-TW' | 'hi-IN' | 'th-TH' | 'vi-VN'
  // Other
  | 'ru-RU';

export type WritingDirection = 'ltr' | 'rtl' | 'auto';
export type WritingMode = 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';

export type WeightUnit = 'kg' | 'lb' | 'stone';
export type DistanceUnit = 'km' | 'mi';
export type HeightUnit = 'cm' | 'ft-in';
export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'YYYY/MM/DD';
export type TimeFormat = '12h' | '24h';
export type FirstDayOfWeek = 0 | 1 | 5 | 6; // Sunday, Monday, Friday, Saturday

export interface NumberFormatConfig {
  decimal: '.' | ',';
  thousands: ',' | '.' | ' ' | "'";
}

export interface LocalePreferences {
  /**
   * Selected locale (BCP 47 language tag)
   */
  locale: SupportedLocale;

  /**
   * Timezone (IANA timezone string)
   */
  timezone: string;

  /**
   * Auto-detect timezone from browser
   */
  autoDetectTimezone: boolean;

  /**
   * Writing direction override (or 'auto' for locale default)
   */
  writingDirection: WritingDirection;

  /**
   * Writing mode for special scripts (Japanese vertical, etc.)
   */
  writingMode: WritingMode;
}

/* ==========================================================================
   MEASUREMENT PREFERENCES
   ========================================================================== */

export interface MeasurementPreferences {
  /**
   * Weight unit for exercises
   */
  weight: WeightUnit;

  /**
   * Distance unit for cardio
   */
  distance: DistanceUnit;

  /**
   * Height unit for body measurements
   */
  height: HeightUnit;

  /**
   * Temperature unit (for weather-based workout suggestions)
   */
  temperature: TemperatureUnit;

  /**
   * Date format
   */
  dateFormat: DateFormat;

  /**
   * Time format (12-hour or 24-hour)
   */
  timeFormat: TimeFormat;

  /**
   * First day of week for calendars
   */
  firstDayOfWeek: FirstDayOfWeek;

  /**
   * Number formatting configuration
   */
  numberFormat: NumberFormatConfig;
}

/* ==========================================================================
   ACCESSIBILITY PREFERENCES
   ========================================================================== */

export interface AccessibilityPreferences {
  /**
   * Enable screen reader optimizations
   */
  screenReaderMode: boolean;

  /**
   * Show focus indicators always (not just on keyboard focus)
   */
  alwaysShowFocus: boolean;

  /**
   * Reduce transparency for better readability
   */
  reduceTransparency: boolean;

  /**
   * Increase target sizes for touch/click
   */
  largeTargets: boolean;

  /**
   * Enable dyslexia-friendly font adjustments
   */
  dyslexiaFriendly: boolean;

  /**
   * Announce live regions more frequently
   */
  verboseAnnouncements: boolean;
}

/* ==========================================================================
   COMBINED USER PREFERENCES
   ========================================================================== */

export interface UserPreferences {
  display: DisplayPreferences;
  locale: LocalePreferences;
  measurement: MeasurementPreferences;
  accessibility: AccessibilityPreferences;

  /**
   * Last updated timestamp
   */
  updatedAt: string;

  /**
   * Schema version for migrations
   */
  schemaVersion: number;
}

/* ==========================================================================
   DEFAULT VALUES
   ========================================================================== */

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  fontSize: 16,
  typeScaleRatio: 1.25, // Major Third
  lineHeight: 1.5,
  density: 'normal',
  motion: 'normal',
  contrast: 'normal',
  colorScheme: 'dark',
  primaryHue: 220, // Electric blue
};

export const DEFAULT_LOCALE_PREFERENCES: LocalePreferences = {
  locale: 'en-US',
  timezone: 'America/New_York',
  autoDetectTimezone: true,
  writingDirection: 'auto',
  writingMode: 'horizontal-tb',
};

export const DEFAULT_MEASUREMENT_PREFERENCES: MeasurementPreferences = {
  weight: 'lb',
  distance: 'mi',
  height: 'ft-in',
  temperature: 'fahrenheit',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  firstDayOfWeek: 0, // Sunday
  numberFormat: {
    decimal: '.',
    thousands: ',',
  },
};

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  screenReaderMode: false,
  alwaysShowFocus: false,
  reduceTransparency: false,
  largeTargets: false,
  dyslexiaFriendly: false,
  verboseAnnouncements: false,
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  display: DEFAULT_DISPLAY_PREFERENCES,
  locale: DEFAULT_LOCALE_PREFERENCES,
  measurement: DEFAULT_MEASUREMENT_PREFERENCES,
  accessibility: DEFAULT_ACCESSIBILITY_PREFERENCES,
  updatedAt: new Date().toISOString(),
  schemaVersion: 1,
};

/* ==========================================================================
   LOCALE METADATA
   ========================================================================== */

export interface LocaleMetadata {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  script: string;
  region: string;
}

export const SUPPORTED_LOCALES: LocaleMetadata[] = [
  // Americas
  { code: 'en-US', name: 'English (US)', nativeName: 'English', direction: 'ltr', script: 'Latin', region: 'Americas' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English', direction: 'ltr', script: 'Latin', region: 'Americas' },
  { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español', direction: 'ltr', script: 'Latin', region: 'Europe' },
  { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español', direction: 'ltr', script: 'Latin', region: 'Americas' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português', direction: 'ltr', script: 'Latin', region: 'Americas' },
  { code: 'fr-CA', name: 'French (Canada)', nativeName: 'Français', direction: 'ltr', script: 'Latin', region: 'Americas' },
  // Europe
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', direction: 'ltr', script: 'Latin', region: 'Europe' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', direction: 'ltr', script: 'Latin', region: 'Europe' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano', direction: 'ltr', script: 'Latin', region: 'Europe' },
  { code: 'pt-PT', name: 'Portuguese', nativeName: 'Português', direction: 'ltr', script: 'Latin', region: 'Europe' },
  { code: 'nl-NL', name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr', script: 'Latin', region: 'Europe' },
  { code: 'pl-PL', name: 'Polish', nativeName: 'Polski', direction: 'ltr', script: 'Latin', region: 'Europe' },
  { code: 'sv-SE', name: 'Swedish', nativeName: 'Svenska', direction: 'ltr', script: 'Latin', region: 'Europe' },
  { code: 'no-NO', name: 'Norwegian', nativeName: 'Norsk', direction: 'ltr', script: 'Latin', region: 'Europe' },
  { code: 'da-DK', name: 'Danish', nativeName: 'Dansk', direction: 'ltr', script: 'Latin', region: 'Europe' },
  { code: 'fi-FI', name: 'Finnish', nativeName: 'Suomi', direction: 'ltr', script: 'Latin', region: 'Europe' },
  // Middle East
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', script: 'Arabic', region: 'Middle East' },
  { code: 'he-IL', name: 'Hebrew', nativeName: 'עברית', direction: 'rtl', script: 'Hebrew', region: 'Middle East' },
  { code: 'tr-TR', name: 'Turkish', nativeName: 'Türkçe', direction: 'ltr', script: 'Latin', region: 'Middle East' },
  // Asia
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', direction: 'ltr', script: 'Japanese', region: 'Asia' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어', direction: 'ltr', script: 'Korean', region: 'Asia' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', direction: 'ltr', script: 'Chinese', region: 'Asia' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', direction: 'ltr', script: 'Chinese', region: 'Asia' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr', script: 'Devanagari', region: 'Asia' },
  { code: 'th-TH', name: 'Thai', nativeName: 'ภาษาไทย', direction: 'ltr', script: 'Thai', region: 'Asia' },
  { code: 'vi-VN', name: 'Vietnamese', nativeName: 'Tiếng Việt', direction: 'ltr', script: 'Latin', region: 'Asia' },
  // Other
  { code: 'ru-RU', name: 'Russian', nativeName: 'Русский', direction: 'ltr', script: 'Cyrillic', region: 'Other' },
];

/* ==========================================================================
   MEASUREMENT PRESETS BY REGION
   ========================================================================== */

export interface MeasurementPreset {
  locale: SupportedLocale;
  measurements: MeasurementPreferences;
}

export const MEASUREMENT_PRESETS: MeasurementPreset[] = [
  {
    locale: 'en-US',
    measurements: {
      weight: 'lb',
      distance: 'mi',
      height: 'ft-in',
      temperature: 'fahrenheit',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      firstDayOfWeek: 0,
      numberFormat: { decimal: '.', thousands: ',' },
    },
  },
  {
    locale: 'en-GB',
    measurements: {
      weight: 'kg', // UK gyms use kg
      distance: 'mi', // UK uses miles for distance
      height: 'ft-in', // UK uses feet-inches for height
      temperature: 'celsius',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 1,
      numberFormat: { decimal: '.', thousands: ',' },
    },
  },
  {
    locale: 'de-DE',
    measurements: {
      weight: 'kg',
      distance: 'km',
      height: 'cm',
      temperature: 'celsius',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 1,
      numberFormat: { decimal: ',', thousands: '.' },
    },
  },
  {
    locale: 'fr-FR',
    measurements: {
      weight: 'kg',
      distance: 'km',
      height: 'cm',
      temperature: 'celsius',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 1,
      numberFormat: { decimal: ',', thousands: ' ' },
    },
  },
  {
    locale: 'ja-JP',
    measurements: {
      weight: 'kg',
      distance: 'km',
      height: 'cm',
      temperature: 'celsius',
      dateFormat: 'YYYY/MM/DD',
      timeFormat: '24h',
      firstDayOfWeek: 0,
      numberFormat: { decimal: '.', thousands: ',' },
    },
  },
];

/**
 * Get measurement preset for a locale
 */
export function getMeasurementPresetForLocale(locale: SupportedLocale): MeasurementPreferences {
  const preset = MEASUREMENT_PRESETS.find((p) => p.locale === locale);
  if (preset) {
    return preset.measurements;
  }

  // Default to metric for unknown locales
  return {
    weight: 'kg',
    distance: 'km',
    height: 'cm',
    temperature: 'celsius',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    firstDayOfWeek: 1,
    numberFormat: { decimal: '.', thousands: ',' },
  };
}
