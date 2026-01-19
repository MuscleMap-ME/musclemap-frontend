/**
 * Workout Settings Tab
 *
 * Controls workout-related preferences:
 * - Default rest timer duration
 * - Auto-start timer
 * - Floating timer display
 * - Warmup/cooldown reminders
 * - Equipment selection
 */

import React, { useState, useEffect } from 'react';
import { Timer, Play, Maximize2, Thermometer, Wind } from 'lucide-react';
import { useWorkoutSettings } from '../../../store/preferencesStore';
import { RestTimerSettings } from '../../../components/workout/RestTimerSettings';
import { EquipmentSelector } from '../../../components/settings';
import { api } from '../../../utils/api';

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
// REST TIME PRESETS
// ============================================

const REST_PRESETS = [
  { label: '30s', value: 30, description: 'Quick recovery' },
  { label: '60s', value: 60, description: 'Standard' },
  { label: '90s', value: 90, description: 'Moderate' },
  { label: '2m', value: 120, description: 'Full recovery' },
  { label: '3m', value: 180, description: 'Heavy lifts' },
  { label: '5m', value: 300, description: 'Powerlifting' },
];

const EQUIPMENT_LIST = [
  { id: 'barbell', name: 'Barbell', icon: '🏋️' },
  { id: 'dumbbells', name: 'Dumbbells', icon: '💪' },
  { id: 'cables', name: 'Cables', icon: '🔗' },
  { id: 'bench', name: 'Bench', icon: '🪑' },
  { id: 'kettlebell', name: 'Kettlebell', icon: '⚡' },
  { id: 'resistance', name: 'Resistance Bands', icon: '🎯' },
  { id: 'pullup_bar', name: 'Pull-up Bar', icon: '📏' },
  { id: 'machines', name: 'Machines', icon: '🔧' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function WorkoutTab() {
  const { settings, updateSettings } = useWorkoutSettings();
  const [equipment, setEquipment] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Load equipment from server
  useEffect(() => {
    api.settings
      .fetch()
      .then((s: { settings?: { equipment?: string[] }; equipment?: string[] }) => {
        if (s.settings?.equipment) setEquipment(s.settings.equipment);
        else if (s.equipment) setEquipment(s.equipment as string[]);
      })
      .catch(() => {});
  }, []);

  const saveEquipment = async (newEquipment: string[]) => {
    setSaving(true);
    setEquipment(newEquipment);
    try {
      await api.settings.update({ equipment: newEquipment });
    } catch {
      // Silent fail
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Rest Timer */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Timer className="w-5 h-5 text-blue-400" />
          Rest Timer
        </h3>

        {/* Rest Timer Presets */}
        <div className="mb-4">
          <div className="font-medium mb-2">Default Rest Duration</div>
          <div className="grid grid-cols-3 gap-2">
            {REST_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => updateSettings({ defaultRestSeconds: preset.value })}
                className={`p-3 rounded-xl transition-all ${
                  settings.defaultRestSeconds === preset.value
                    ? 'bg-purple-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div className="font-bold">{preset.label}</div>
                <div className="text-xs text-gray-400">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom time input */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-gray-400">Custom:</span>
          <input
            type="number"
            min={10}
            max={600}
            value={settings.defaultRestSeconds}
            onChange={(e) => updateSettings({ defaultRestSeconds: Number(e.target.value) })}
            className="w-20 bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-center"
          />
          <span className="text-gray-400">seconds</span>
        </div>

        {/* Existing rest timer component */}
        <div className="border-t border-gray-700 pt-4 mt-4">
          <RestTimerSettings compact className="bg-transparent border-0 p-0" />
        </div>
      </section>

      {/* Timer Behavior */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-green-400" />
          Timer Behavior
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div>
              <div className="font-medium">Auto-Start Timer</div>
              <div className="text-sm text-gray-400">Start rest timer automatically after logging set</div>
            </div>
            <Toggle
              value={settings.autoStartTimer}
              onChange={() => updateSettings({ autoStartTimer: !settings.autoStartTimer })}
            />
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Maximize2 className="w-5 h-5 text-purple-400" />
              <div>
                <div className="font-medium">Floating Timer</div>
                <div className="text-sm text-gray-400">Show timer overlay during workout</div>
              </div>
            </div>
            <Toggle
              value={settings.showFloatingTimer}
              onChange={() => updateSettings({ showFloatingTimer: !settings.showFloatingTimer })}
            />
          </div>
        </div>
      </section>

      {/* Warmup & Cooldown */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4">🔥 Warmup & Cooldown</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Thermometer className="w-5 h-5 text-orange-400" />
              <div>
                <div className="font-medium">Warmup Reminder</div>
                <div className="text-sm text-gray-400">Remind to warm up before workout</div>
              </div>
            </div>
            <Toggle
              value={settings.warmupReminder}
              onChange={() => updateSettings({ warmupReminder: !settings.warmupReminder })}
            />
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Wind className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="font-medium">Cooldown Reminder</div>
                <div className="text-sm text-gray-400">Remind to cool down after workout</div>
              </div>
            </div>
            <Toggle
              value={settings.cooldownReminder}
              onChange={() => updateSettings({ cooldownReminder: !settings.cooldownReminder })}
            />
          </div>
        </div>
      </section>

      {/* Equipment */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-2 flex items-center justify-between">
          🏋️ Available Equipment
          {saving && <span className="text-xs text-purple-400 font-normal">Saving...</span>}
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Select equipment you have access to for personalized workout recommendations
        </p>
        <EquipmentSelector
          selected={equipment}
          onChange={saveEquipment}
          equipment={EQUIPMENT_LIST}
        />
      </section>

      {/* Summary */}
      <section className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-2xl p-4">
        <h3 className="font-bold mb-3">Current Workout Setup</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-400">Default Rest:</span>{' '}
            <span className="font-bold">
              {settings.defaultRestSeconds >= 60
                ? `${Math.floor(settings.defaultRestSeconds / 60)}m ${settings.defaultRestSeconds % 60}s`
                : `${settings.defaultRestSeconds}s`}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Auto-start:</span>{' '}
            <span className={settings.autoStartTimer ? 'text-green-400' : 'text-gray-500'}>
              {settings.autoStartTimer ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Floating timer:</span>{' '}
            <span className={settings.showFloatingTimer ? 'text-green-400' : 'text-gray-500'}>
              {settings.showFloatingTimer ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Equipment:</span>{' '}
            <span className="font-bold">{equipment.length} items</span>
          </div>
        </div>
      </section>
    </div>
  );
}
