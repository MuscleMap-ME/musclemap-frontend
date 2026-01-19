/**
 * General Settings Tab
 *
 * Covers theme, accessibility, and units settings.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import { usePreferencesStore } from '../../../store/preferencesStore';

// ============================================
// THEMES
// ============================================

const THEMES = [
  { id: 'dark', name: 'Dark', bg: '#111827', icon: '🌙' },
  { id: 'light', name: 'Light', bg: '#f9fafb', icon: '☀️', textDark: true },
  { id: 'midnight', name: 'Midnight', bg: '#0f172a', icon: '🌌' },
  { id: 'ocean', name: 'Ocean', bg: '#0c4a6e', icon: '🌊', level: 5 },
  { id: 'forest', name: 'Forest', bg: '#14532d', icon: '🌲', level: 10 },
  { id: 'sunset', name: 'Sunset', bg: '#7c2d12', icon: '🌅', level: 15 },
  { id: 'cosmic', name: 'Cosmic', bg: '#1e1b4b', icon: '✨', level: 25 },
];

// ============================================
// COMPONENTS
// ============================================

function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`w-14 h-8 rounded-full transition-all duration-200 ${
        value ? 'bg-purple-600' : 'bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div
        className={`w-6 h-6 bg-white rounded-full transition-transform duration-200 mx-1 ${
          value ? 'translate-x-6' : ''
        }`}
      />
    </button>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function GeneralTab() {
  const [settings, setSettings] = useState({
    theme: 'dark',
    reduced_motion: 0,
    high_contrast: 0,
    text_size: 'normal',
    weight_unit: 'lbs',
    distance_unit: 'mi',
  });
  const [userLevel, setUserLevel] = useState(1);
  const [saving, setSaving] = useState(false);

  // Get preferences from store
  const preferences = usePreferencesStore((s) => s.preferences);
  const updatePreferences = usePreferencesStore((s) => s.updatePreferences);

  useEffect(() => {
    Promise.all([api.settings.fetch(), api.profile.get()])
      .then(([s, p]) => {
        if (s.settings) setSettings((prev) => ({ ...prev, ...s.settings }));
        else setSettings((prev) => ({ ...prev, ...s }));
        if (p.level) setUserLevel(p.level);
      })
      .catch(() => {});
  }, []);

  const save = async (updates: Partial<typeof settings>) => {
    setSaving(true);
    setSettings((s) => ({ ...s, ...updates }));
    try {
      await api.settings.update(updates);
      if (updates.theme) localStorage.setItem('musclemap_theme', updates.theme);

      // Also update preferences store
      if (updates.reduced_motion !== undefined) {
        updatePreferences({ display: { ...preferences.display, reducedMotion: !!updates.reduced_motion } });
      }
      if (updates.high_contrast !== undefined) {
        updatePreferences({ display: { ...preferences.display, highContrast: !!updates.high_contrast } });
      }
      if (updates.text_size) {
        updatePreferences({
          display: { ...preferences.display, textSize: updates.text_size as 'small' | 'normal' | 'large' | 'xlarge' },
        });
      }
      if (updates.weight_unit) {
        updatePreferences({
          units: { ...preferences.units, weight: updates.weight_unit as 'lbs' | 'kg' },
        });
      }
      if (updates.distance_unit) {
        updatePreferences({
          units: { ...preferences.units, distance: updates.distance_unit as 'mi' | 'km' },
        });
      }
    } catch {
      // Failed to save settings
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          🎨 Theme{' '}
          <span className="text-xs text-gray-400 font-normal">Level {userLevel}</span>
          {saving && <span className="text-xs text-purple-400 ml-auto">Saving...</span>}
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {THEMES.map((t) => {
            const locked = t.level && userLevel < t.level;
            return (
              <button
                key={t.id}
                onClick={() => !locked && save({ theme: t.id })}
                disabled={locked}
                className={`p-3 rounded-xl border-2 transition-all ${
                  settings.theme === t.id ? 'border-purple-500 scale-105' : 'border-transparent'
                } ${locked ? 'opacity-40 cursor-not-allowed' : 'hover:scale-102'}`}
                style={{ backgroundColor: t.bg, color: t.textDark ? '#111' : '#fff' }}
              >
                <div className="text-xl">{t.icon}</div>
                <div className="text-xs font-bold mt-1">{t.name}</div>
                {locked && <div className="text-xs opacity-75">🔒 Lv{t.level}</div>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Accessibility */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h2 className="font-bold mb-4">♿ Accessibility</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium">Reduced Motion</div>
              <div className="text-sm text-gray-400">Minimize animations</div>
            </div>
            <Toggle
              value={!!settings.reduced_motion}
              onChange={() => save({ reduced_motion: settings.reduced_motion ? 0 : 1 })}
            />
          </div>

          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium">High Contrast</div>
              <div className="text-sm text-gray-400">Increase text visibility</div>
            </div>
            <Toggle
              value={!!settings.high_contrast}
              onChange={() => save({ high_contrast: settings.high_contrast ? 0 : 1 })}
            />
          </div>

          <div>
            <div className="font-medium mb-2">Text Size</div>
            <div className="flex gap-2">
              {['small', 'normal', 'large', 'xlarge'].map((s) => (
                <button
                  key={s}
                  onClick={() => save({ text_size: s })}
                  className={`flex-1 py-2 rounded-xl capitalize transition-all ${
                    settings.text_size === s ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {s === 'xlarge' ? 'XL' : s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="font-medium mb-2">Color Blind Mode</div>
            <div className="grid grid-cols-2 gap-2">
              {['none', 'protanopia', 'deuteranopia', 'tritanopia'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    updatePreferences({
                      display: {
                        ...preferences.display,
                        colorBlindMode: mode as 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia',
                      },
                    });
                  }}
                  className={`py-2 px-3 rounded-xl capitalize transition-all text-sm ${
                    preferences.display.colorBlindMode === mode
                      ? 'bg-purple-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {mode === 'none' ? 'Standard' : mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Units */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h2 className="font-bold mb-4">📏 Units</h2>
        <div className="space-y-4">
          <div>
            <div className="font-medium mb-2">Weight Units</div>
            <div className="flex gap-2">
              {[
                { value: 'lbs', label: 'Pounds (lbs)' },
                { value: 'kg', label: 'Kilograms (kg)' },
              ].map((unit) => (
                <button
                  key={unit.value}
                  onClick={() => save({ weight_unit: unit.value })}
                  className={`flex-1 py-2 rounded-xl transition-all ${
                    settings.weight_unit === unit.value
                      ? 'bg-purple-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {unit.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="font-medium mb-2">Distance Units</div>
            <div className="flex gap-2">
              {[
                { value: 'mi', label: 'Miles (mi)' },
                { value: 'km', label: 'Kilometers (km)' },
              ].map((unit) => (
                <button
                  key={unit.value}
                  onClick={() => save({ distance_unit: unit.value })}
                  className={`flex-1 py-2 rounded-xl transition-all ${
                    settings.distance_unit === unit.value
                      ? 'bg-purple-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {unit.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
