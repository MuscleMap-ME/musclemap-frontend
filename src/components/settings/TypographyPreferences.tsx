/**
 * Typography Preferences - User Customization Component
 *
 * Allows users to customize typography settings:
 * - Font scale (80% to 150%)
 * - Line height (tight, normal, relaxed, loose)
 * - Font family preferences
 * - Dyslexia-friendly mode
 *
 * Part of "The Troika": Maximum Flexibility, Maximum User Choice, Maximum Performance
 *
 * @example
 * <TypographyPreferences
 *   value={userPreferences.typography}
 *   onChange={(settings) => updatePreferences({ typography: settings })}
 * />
 */

import React, { useCallback } from 'react';
import { Card, CardHeader, CardBody, Switch, Select } from '@/components/ui';
import { useRenderingTier, RenderingTier } from '@/hooks/useRenderingTier';

export interface TypographySettings {
  /** Font scale percentage (80-150) */
  fontScale: number;
  /** Line height setting */
  lineHeight: 'tight' | 'normal' | 'relaxed' | 'loose';
  /** Display font preference */
  displayFont: 'bebas' | 'system' | 'serif';
  /** Body font preference */
  bodyFont: 'inter' | 'system' | 'serif' | 'opendyslexic';
  /** Monospace font preference */
  monoFont: 'jetbrains' | 'system';
  /** Enable dyslexia-friendly mode */
  dyslexiaMode: boolean;
  /** Increase letter spacing */
  wideLetterSpacing: boolean;
  /** Use larger paragraph spacing */
  largeParagraphSpacing: boolean;
}

export const defaultTypographySettings: TypographySettings = {
  fontScale: 100,
  lineHeight: 'normal',
  displayFont: 'bebas',
  bodyFont: 'inter',
  monoFont: 'jetbrains',
  dyslexiaMode: false,
  wideLetterSpacing: false,
  largeParagraphSpacing: false,
};

export interface TypographyPreferencesProps {
  /** Current settings */
  value: TypographySettings;
  /** Change handler */
  onChange: (settings: TypographySettings) => void;
  /** Compact layout */
  compact?: boolean;
  /** Additional class name */
  className?: string;
}

// Font scale options
const fontScaleOptions = [
  { value: '80', label: 'Extra Small (80%)' },
  { value: '90', label: 'Small (90%)' },
  { value: '100', label: 'Normal (100%)' },
  { value: '110', label: 'Large (110%)' },
  { value: '120', label: 'Extra Large (120%)' },
  { value: '130', label: 'Huge (130%)' },
  { value: '150', label: 'Maximum (150%)' },
];

// Line height options
const lineHeightOptions = [
  { value: 'tight', label: 'Tight (1.25)' },
  { value: 'normal', label: 'Normal (1.5)' },
  { value: 'relaxed', label: 'Relaxed (1.75)' },
  { value: 'loose', label: 'Loose (2.0)' },
];

// Display font options
const displayFontOptions = [
  { value: 'bebas', label: 'Bebas Neue (Default)' },
  { value: 'system', label: 'System Sans' },
  { value: 'serif', label: 'System Serif' },
];

// Body font options
const bodyFontOptions = [
  { value: 'inter', label: 'Inter (Default)' },
  { value: 'system', label: 'System Sans' },
  { value: 'serif', label: 'System Serif' },
  { value: 'opendyslexic', label: 'OpenDyslexic' },
];

// Mono font options
const monoFontOptions = [
  { value: 'jetbrains', label: 'JetBrains Mono (Default)' },
  { value: 'system', label: 'System Mono' },
];

export function TypographyPreferences({
  value,
  onChange,
  compact = false,
  className = '',
}: TypographyPreferencesProps): React.ReactElement {
  const { tier } = useRenderingTier();

  const updateSetting = useCallback(
    <K extends keyof TypographySettings>(key: K, newValue: TypographySettings[K]) => {
      onChange({ ...value, key: newValue });

      // If enabling dyslexia mode, also enable helpful settings
      if (key === 'dyslexiaMode' && newValue === true) {
        onChange({
          ...value,
          dyslexiaMode: true,
          bodyFont: 'opendyslexic',
          lineHeight: 'relaxed',
          wideLetterSpacing: true,
          largeParagraphSpacing: true,
        });
        return;
      }

      onChange({ ...value, [key]: newValue });
    },
    [value, onChange]
  );

  // TEXT_ONLY tier: Simple form
  if (tier === RenderingTier.TEXT_ONLY) {
    return (
      <div className={className}>
        <h3>Typography Settings</h3>
        <div>
          <label>
            Font Size:
            <select
              value={value.fontScale.toString()}
              onChange={(e) => updateSetting('fontScale', parseInt(e.target.value))}
            >
              {fontScaleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={value.dyslexiaMode}
              onChange={(e) => updateSetting('dyslexiaMode', e.target.checked)}
            />
            Enable dyslexia-friendly mode
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Font Scale */}
      <div className="space-y-2">
        <label className="block font-medium text-neutral-900 dark:text-neutral-100">
          Font Size
        </label>
        <Select
          value={value.fontScale.toString()}
          onChange={(v) => updateSetting('fontScale', parseInt(v))}
          options={fontScaleOptions}
          helperText="Scales all text throughout the app"
        />

        {/* Preview */}
        {!compact && (
          <div
            className="mt-3 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50"
            style={{ fontSize: `${value.fontScale}%` }}
          >
            <p className="font-display text-2xl mb-2">Sample Heading</p>
            <p className="font-body">
              The quick brown fox jumps over the lazy dog. This preview shows how your text will appear at {value.fontScale}% scale.
            </p>
          </div>
        )}
      </div>

      {/* Line Height */}
      <div className="space-y-2">
        <label className="block font-medium text-neutral-900 dark:text-neutral-100">
          Line Spacing
        </label>
        <Select
          value={value.lineHeight}
          onChange={(v) => updateSetting('lineHeight', v as TypographySettings['lineHeight'])}
          options={lineHeightOptions}
          helperText="Space between lines of text"
        />
      </div>

      {/* Font Family Preferences */}
      {!compact && (
        <>
          <div className="space-y-2">
            <label className="block font-medium text-neutral-900 dark:text-neutral-100">
              Heading Font
            </label>
            <Select
              value={value.displayFont}
              onChange={(v) => updateSetting('displayFont', v as TypographySettings['displayFont'])}
              options={displayFontOptions}
            />
          </div>

          <div className="space-y-2">
            <label className="block font-medium text-neutral-900 dark:text-neutral-100">
              Body Font
            </label>
            <Select
              value={value.bodyFont}
              onChange={(v) => updateSetting('bodyFont', v as TypographySettings['bodyFont'])}
              options={bodyFontOptions}
            />
          </div>
        </>
      )}

      {/* Accessibility Options */}
      <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
          Accessibility Options
        </h4>

        <Switch
          checked={value.dyslexiaMode}
          onChange={(checked) => updateSetting('dyslexiaMode', checked)}
          label="Dyslexia-friendly mode"
          helperText="Uses OpenDyslexic font and optimized spacing"
        />

        <Switch
          checked={value.wideLetterSpacing}
          onChange={(checked) => updateSetting('wideLetterSpacing', checked)}
          label="Wide letter spacing"
          helperText="Increases space between letters for readability"
        />

        <Switch
          checked={value.largeParagraphSpacing}
          onChange={(checked) => updateSetting('largeParagraphSpacing', checked)}
          label="Large paragraph spacing"
          helperText="Adds extra space between paragraphs"
        />
      </div>

      {/* Reset Button */}
      <button
        onClick={() => onChange(defaultTypographySettings)}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        Reset to defaults
      </button>
    </div>
  );
}

/**
 * Card version for settings pages
 */
export function TypographyCard({
  value,
  onChange,
}: Pick<TypographyPreferencesProps, 'value' | 'onChange'>): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-display font-semibold">Typography</h3>
        <p className="text-sm text-neutral-500">
          Customize fonts, sizes, and reading experience
        </p>
      </CardHeader>
      <CardBody>
        <TypographyPreferences value={value} onChange={onChange} />
      </CardBody>
    </Card>
  );
}

export default TypographyPreferences;
