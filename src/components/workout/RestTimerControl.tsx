/**
 * RestTimerControl Component
 *
 * Enhanced rest timer with:
 * - Visual countdown display
 * - Quick preset buttons (30s, 60s, 90s, 2m, 3m, 5m)
 * - Per-exercise defaults
 * - Pause/Resume functionality
 * - Audio/vibration alerts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Timer,
  Play,
  Pause,
  Plus,
  Minus,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useRestTimer } from '../../store/workoutSessionStore';

// Format time as MM:SS
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function RestTimerControl({ exerciseId, compact = false }) {
  const {
    time,
    isActive,
    defaultDuration,
    presets,
    start,
    stop,
    adjust,
    setDefault,
    setExerciseDefault,
    formatted,
  } = useRestTimer();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Play sound when timer ends
  useEffect(() => {
    if (time === 0 && isActive === false && soundEnabled) {
      // Timer just ended
      try {
        // Browser notification sound
        const audio = new Audio('/sounds/timer-end.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});

        // Vibration if supported
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      } catch (_e) {
        // Ignore audio errors
      }
    }
  }, [time, isActive, soundEnabled]);

  // Handle preset click
  const handlePresetClick = useCallback((preset) => {
    start(preset.seconds);
  }, [start]);

  // Compact version for inline display
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isActive ? (
          <>
            <div className={`font-mono text-xl font-bold ${time <= 10 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>
              {formatted}
            </div>
            <button
              onClick={stop}
              className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              <Pause className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => start()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-sm font-medium"
          >
            <Timer className="w-4 h-4" />
            Start Rest ({formatTime(defaultDuration)})
          </button>
        )}
      </div>
    );
  }

  // Calculate progress percentage
  const _progress = isActive ? (time / defaultDuration) * 100 : 0;

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
      {/* Timer Display */}
      <div className="p-6">
        <div className="relative flex flex-col items-center">
          {/* Circular Progress */}
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r="72"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-800"
              />
              {/* Progress circle */}
              {isActive && (
                <motion.circle
                  cx="80"
                  cy="80"
                  r="72"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className={time <= 10 ? 'text-red-500' : 'text-blue-500'}
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '452.39', strokeDashoffset: 0 }}
                  animate={{
                    strokeDashoffset: 452.39 * (1 - time / defaultDuration),
                  }}
                  transition={{ duration: 0.5 }}
                />
              )}
            </svg>

            {/* Time Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                key={time}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className={`text-4xl font-mono font-bold ${
                  time <= 10 && isActive ? 'text-red-400' : 'text-white'
                }`}
              >
                {formatted}
              </motion.span>
              {isActive && (
                <span className="text-xs text-gray-400 mt-1">remaining</span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 mt-6">
            {isActive ? (
              <>
                <button
                  onClick={() => adjust(-15)}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <button
                  onClick={stop}
                  className="p-4 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  <Pause className="w-6 h-6" />
                </button>
                <button
                  onClick={() => adjust(15)}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => start()}
                className="p-4 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                <Play className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="border-t border-gray-800 p-4">
        <div className="grid grid-cols-3 gap-2">
          {presets.slice(0, 6).map((preset, _index) => (
            <button
              key={preset.seconds}
              onClick={() => handlePresetClick(preset)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                defaultDuration === preset.seconds
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Toggle */}
      <div className="border-t border-gray-800 p-3 flex items-center justify-between">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
          Sound {soundEnabled ? 'On' : 'Off'}
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-800 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Default Duration */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Default Rest Duration</label>
                <select
                  value={defaultDuration}
                  onChange={(e) => setDefault(parseInt(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  {presets.map((preset) => (
                    <option key={preset.seconds} value={preset.seconds}>
                      {preset.label} - {preset.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Set as exercise default */}
              {exerciseId && (
                <button
                  onClick={() => setExerciseDefault(exerciseId, defaultDuration)}
                  className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 bg-blue-500/10 rounded-lg"
                >
                  Set as default for this exercise
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RestTimerControl;
