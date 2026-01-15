/**
 * RestTimerSettings Component
 *
 * A comprehensive settings panel for rest timer preferences:
 * - Default rest duration (global)
 * - Per-exercise rest duration overrides
 * - Auto-start timer after logging set
 * - Sound/vibration settings
 * - Quick adjust increment
 * - Timer presets management
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Timer,
  Volume2,
  VolumeX,
  Vibrate,
  Bell,
  Clock,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Plus,
  Minus,
  Check,
} from 'lucide-react';
import { GlassSurface } from '../glass';
import {
  useRestTimer,
  useRestTimerSettings,
  REST_TIMER_DEFAULTS,
  useWorkoutSessionStore,
} from '../../store/workoutSessionStore';
import { haptic } from '../../utils/haptics';

// Sound type options
const SOUND_OPTIONS = [
  { id: 'beep', label: 'Beep', icon: Bell },
  { id: 'chime', label: 'Chime', icon: Bell },
  { id: 'bell', label: 'Bell', icon: Bell },
];

export function RestTimerSettings({
  className = '',
  compact = false,
  showExerciseDefaults = false,
  exercises = [],
}) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Rest timer state and actions
  const {
    defaultDuration,
    presets,
    setDefault,
    setExerciseDefault,
  } = useRestTimer();

  // Rest timer settings from store (persisted)
  const {
    settings,
    update: updateSettings,
    playSound,
  } = useRestTimerSettings();

  // Get exercise defaults from store
  const exerciseRestDefaults = useWorkoutSessionStore((s) => s.exerciseRestDefaults);

  // Update setting handler with haptic feedback
  const updateSetting = useCallback((key, value) => {
    updateSettings({ [key]: value });
    haptic('light');
  }, [updateSettings]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    updateSettings(REST_TIMER_DEFAULTS);
    setDefault(90);
    haptic('medium');
  }, [updateSettings, setDefault]);

  // Preview sound
  const handlePreviewSound = useCallback(() => {
    playSound('complete');
    haptic('light');
  }, [playSound]);

  // Format seconds to display string
  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // Compact toggle for settings sections
  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-gray-300 transition-colors ${className}`}
      >
        <Timer className="w-4 h-4" />
        <span className="text-sm">Rest Timer: {formatDuration(defaultDuration)}</span>
        <ChevronDown className="w-4 h-4" />
      </button>
    );
  }

  return (
    <GlassSurface className={`overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <Timer className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Rest Timer Settings</h3>
            <p className="text-sm text-gray-400">Configure your rest timer preferences</p>
          </div>
        </div>
        {compact && (
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Default Rest Duration */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">Default Rest Duration</label>
          <div className="grid grid-cols-3 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.seconds}
                onClick={() => setDefault(preset.seconds)}
                className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  defaultDuration === preset.seconds
                    ? 'bg-blue-500/30 text-blue-400 border border-blue-500/40 ring-1 ring-blue-500/20'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">{presets.find(p => p.seconds === defaultDuration)?.description}</p>
        </div>

        {/* Quick Settings Toggle Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Auto-start Timer */}
          <button
            onClick={() => updateSetting('autoStartAfterSet', !settings.autoStartAfterSet)}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              settings.autoStartAfterSet
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-gray-800/30 border-gray-700 text-gray-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Auto-start</span>
            </div>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              settings.autoStartAfterSet ? 'bg-blue-500' : 'bg-gray-600'
            }`}>
              {settings.autoStartAfterSet && <Check className="w-3 h-3 text-white" />}
            </div>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              settings.soundEnabled
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-gray-800/30 border-gray-700 text-gray-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="text-sm font-medium">Sound</span>
            </div>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              settings.soundEnabled ? 'bg-blue-500' : 'bg-gray-600'
            }`}>
              {settings.soundEnabled && <Check className="w-3 h-3 text-white" />}
            </div>
          </button>

          {/* Vibration Toggle */}
          <button
            onClick={() => updateSetting('vibrationEnabled', !settings.vibrationEnabled)}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              settings.vibrationEnabled
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-gray-800/30 border-gray-700 text-gray-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Vibrate className="w-4 h-4" />
              <span className="text-sm font-medium">Vibration</span>
            </div>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              settings.vibrationEnabled ? 'bg-blue-500' : 'bg-gray-600'
            }`}>
              {settings.vibrationEnabled && <Check className="w-3 h-3 text-white" />}
            </div>
          </button>

          {/* Floating Timer Toggle */}
          <button
            onClick={() => updateSetting('showFloatingTimer', !settings.showFloatingTimer)}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              settings.showFloatingTimer
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-gray-800/30 border-gray-700 text-gray-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              <span className="text-sm font-medium">Float</span>
            </div>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              settings.showFloatingTimer ? 'bg-blue-500' : 'bg-gray-600'
            }`}>
              {settings.showFloatingTimer && <Check className="w-3 h-3 text-white" />}
            </div>
          </button>
        </div>

        {/* Advanced Settings Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full py-2 text-sm text-gray-400 hover:text-gray-300"
        >
          <span>Advanced Settings</span>
          <motion.div
            animate={{ rotate: showAdvanced ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </button>

        {/* Advanced Settings Panel */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Sound Volume */}
              {settings.soundEnabled && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Sound Volume</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.soundVolume}
                    onChange={(e) => updateSetting('soundVolume', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Quiet</span>
                    <span>{Math.round(settings.soundVolume * 100)}%</span>
                    <span>Loud</span>
                  </div>
                </div>
              )}

              {/* Sound Type */}
              {settings.soundEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-400">Alert Sound</label>
                    <button
                      onClick={handlePreviewSound}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Preview
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {SOUND_OPTIONS.map((sound) => (
                      <button
                        key={sound.id}
                        onClick={() => updateSetting('soundType', sound.id)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${
                          settings.soundType === sound.id
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
                        }`}
                      >
                        {sound.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Countdown Warning */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Warning at (seconds remaining)</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateSetting('countdownWarningAt', Math.max(5, settings.countdownWarningAt - 5))}
                    className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="flex-1 text-center text-xl font-mono text-white">
                    {settings.countdownWarningAt}s
                  </span>
                  <button
                    onClick={() => updateSetting('countdownWarningAt', Math.min(30, settings.countdownWarningAt + 5))}
                    className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Adjust Amount */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Quick adjust buttons (+/-)</label>
                <div className="flex gap-2">
                  {[15, 30, 60].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => updateSetting('quickAdjustAmount', amount)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${
                        settings.quickAdjustAmount === amount
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      {amount}s
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Per-Exercise Defaults */}
        {showExerciseDefaults && exercises.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">Per-Exercise Rest Times</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {exercises.map((exercise) => (
                <div
                  key={exercise.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30"
                >
                  <span className="text-sm text-gray-300 truncate flex-1">{exercise.name}</span>
                  <select
                    value={exerciseRestDefaults[exercise.id] || defaultDuration}
                    onChange={(e) => setExerciseDefault(exercise.id, parseInt(e.target.value))}
                    className="ml-3 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-sm text-white"
                  >
                    {presets.map((preset) => (
                      <option key={preset.seconds} value={preset.seconds}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reset Button */}
        <button
          onClick={resetToDefaults}
          className="flex items-center justify-center gap-2 w-full py-2 text-sm text-gray-400 hover:text-gray-300 border-t border-gray-800 pt-4"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>
    </GlassSurface>
  );
}

export default RestTimerSettings;
