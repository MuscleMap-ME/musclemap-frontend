/**
 * Hydration Settings Tab
 *
 * Controls water break reminders and hydration tracking:
 * - Enable/disable reminders (default ON)
 * - Reminder interval
 * - Daily goal
 * - Sound/vibration settings
 * - Workout mode behavior
 */

import React from 'react';
import { Droplets, Clock, Volume2, Vibrate, Dumbbell, Target, Info } from 'lucide-react';
import { useHydrationSettings, useHydrationTracker } from '../../../store/hydrationStore';

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
// INTERVAL PRESETS
// ============================================

const INTERVAL_PRESETS = [
  { label: '10 min', value: 10, description: 'Frequent' },
  { label: '15 min', value: 15, description: 'Default' },
  { label: '20 min', value: 20, description: 'Moderate' },
  { label: '30 min', value: 30, description: 'Relaxed' },
  { label: '45 min', value: 45, description: 'Minimal' },
  { label: '60 min', value: 60, description: 'Rare' },
];

const GOAL_PRESETS = [
  { label: '48 oz', value: 48, cups: 6, description: 'Light activity' },
  { label: '64 oz', value: 64, cups: 8, description: 'Recommended' },
  { label: '80 oz', value: 80, cups: 10, description: 'Active lifestyle' },
  { label: '96 oz', value: 96, cups: 12, description: 'Intense training' },
  { label: '128 oz', value: 128, cups: 16, description: 'Athlete level' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function HydrationTab() {
  const { settings, updateSettings } = useHydrationSettings();
  const { currentIntake, dailyGoal, progress, isGoalMet } = useHydrationTracker();

  return (
    <div className="space-y-6">
      {/* Today's Progress */}
      <section className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Droplets className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="font-bold">Today's Hydration</h2>
              <p className="text-sm text-gray-400">Keep drinking water!</p>
            </div>
          </div>
          {isGoalMet && <span className="text-2xl">🎉</span>}
        </div>

        {/* Progress bar */}
        <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden mb-2">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>

        <div className="flex justify-between text-sm">
          <span>
            {currentIntake} oz / {dailyGoal} oz
          </span>
          <span className={isGoalMet ? 'text-green-400' : 'text-gray-400'}>
            {Math.round(progress)}% {isGoalMet && '✓'}
          </span>
        </div>
      </section>

      {/* Enable Reminders */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          Water Break Reminders
        </h3>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div>
              <div className="font-medium">Enable Reminders</div>
              <div className="text-sm text-gray-400">Get notified to drink water</div>
            </div>
            <Toggle
              value={settings.enabled}
              onChange={() => updateSettings({ enabled: !settings.enabled })}
            />
          </div>

          {settings.enabled && (
            <div className="p-3 bg-green-900/20 border border-green-600/30 rounded-xl flex gap-2">
              <Info className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-green-200">
                Hydration reminders are on! You'll be notified every {settings.intervalMinutes} minutes.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Reminder Interval */}
      {settings.enabled && (
        <section className="bg-gray-800 rounded-2xl p-4">
          <h3 className="font-bold mb-4">⏱️ Reminder Interval</h3>
          <div className="grid grid-cols-3 gap-2">
            {INTERVAL_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => updateSettings({ intervalMinutes: preset.value })}
                className={`p-3 rounded-xl transition-all ${
                  settings.intervalMinutes === preset.value
                    ? 'bg-purple-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div className="font-bold">{preset.label}</div>
                <div className="text-xs text-gray-400">{preset.description}</div>
              </button>
            ))}
          </div>

          {/* Custom interval */}
          <div className="flex items-center gap-3 mt-4">
            <span className="text-gray-400">Custom:</span>
            <input
              type="number"
              min={5}
              max={120}
              value={settings.intervalMinutes}
              onChange={(e) => updateSettings({ intervalMinutes: Number(e.target.value) })}
              className="w-20 bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-center"
            />
            <span className="text-gray-400">minutes</span>
          </div>
        </section>
      )}

      {/* Daily Goal */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-cyan-400" />
          Daily Goal
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {GOAL_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => updateSettings({ dailyGoalOz: preset.value })}
              className={`p-3 rounded-xl transition-all ${
                settings.dailyGoalOz === preset.value
                  ? 'bg-purple-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <div className="font-bold">{preset.label}</div>
              <div className="text-xs text-gray-400">~{preset.cups} cups</div>
              <div className="text-xs text-gray-500">{preset.description}</div>
            </button>
          ))}
        </div>

        {/* Custom goal */}
        <div className="flex items-center gap-3 mt-4">
          <span className="text-gray-400">Custom:</span>
          <input
            type="number"
            min={16}
            max={256}
            value={settings.dailyGoalOz}
            onChange={(e) => updateSettings({ dailyGoalOz: Number(e.target.value) })}
            className="w-20 bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-center"
          />
          <span className="text-gray-400">oz (~{Math.round(settings.dailyGoalOz / 8)} cups)</span>
        </div>
      </section>

      {/* Alert Settings */}
      {settings.enabled && (
        <section className="bg-gray-800 rounded-2xl p-4">
          <h3 className="font-bold mb-4">🔔 Alert Settings</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="font-medium">Sound Alert</div>
                  <div className="text-sm text-gray-400">Play sound when reminder fires</div>
                </div>
              </div>
              <Toggle
                value={settings.soundEnabled}
                onChange={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
              />
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Vibrate className="w-5 h-5 text-purple-400" />
                <div>
                  <div className="font-medium">Vibration</div>
                  <div className="text-sm text-gray-400">Vibrate device (mobile)</div>
                </div>
              </div>
              <Toggle
                value={settings.vibrationEnabled}
                onChange={() => updateSettings({ vibrationEnabled: !settings.vibrationEnabled })}
              />
            </div>
          </div>
        </section>
      )}

      {/* Workout Mode */}
      {settings.enabled && (
        <section className="bg-gray-800 rounded-2xl p-4">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-orange-400" />
            During Workouts
          </h3>
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div>
              <div className="font-medium">Show During Workout</div>
              <div className="text-sm text-gray-400">Continue reminders while training</div>
            </div>
            <Toggle
              value={settings.showDuringWorkout}
              onChange={() => updateSettings({ showDuringWorkout: !settings.showDuringWorkout })}
            />
          </div>

          {!settings.showDuringWorkout && (
            <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-xl text-sm text-yellow-200">
              Hydration reminders will be paused during active workouts
            </div>
          )}
        </section>
      )}

      {/* Info */}
      <section className="bg-gray-800/50 rounded-2xl p-4">
        <h3 className="font-bold mb-3">💡 Hydration Tips</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li>• Drink 8oz (1 cup) when you wake up</li>
          <li>• Hydrate before, during, and after workouts</li>
          <li>• If urine is dark yellow, drink more water</li>
          <li>• Add electrolytes during intense exercise</li>
          <li>• Foods like fruits contribute to hydration</li>
        </ul>
      </section>
    </div>
  );
}
