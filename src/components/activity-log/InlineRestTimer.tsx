/**
 * InlineRestTimer Component
 *
 * A compact, inline rest timer that appears between sets.
 * Features:
 * - Countdown from preset durations
 * - Audio/haptic feedback when complete
 * - Quick preset buttons (30s, 60s, 90s, 2m, 3m)
 * - Manual +/- adjustment
 * - Auto-start option
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, Bell, BellOff, Check } from 'lucide-react';
import { haptic } from '@/utils/haptics';

interface InlineRestTimerProps {
  /** Initial rest time in seconds */
  initialSeconds?: number;
  /** Whether to auto-start when mounted */
  autoStart?: boolean;
  /** Callback when timer completes */
  onComplete?: () => void;
  /** Callback when timer is dismissed */
  onDismiss?: () => void;
  /** Show in compact mode */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

const PRESET_TIMES = [
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
];

const DEFAULT_REST_TIME = 90; // 90 seconds default

export function InlineRestTimer({
  initialSeconds = DEFAULT_REST_TIME,
  autoStart = false,
  onComplete,
  onDismiss,
  compact = false,
  className = '',
}: InlineRestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/timer-complete.mp3');
      audioRef.current.volume = 0.5;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer complete
            setIsRunning(false);
            setIsCompleted(true);

            // Feedback
            haptic('success');
            if (soundEnabled && audioRef.current) {
              audioRef.current.play().catch(() => {
                // Audio play failed (likely blocked by browser)
              });
            }

            onComplete?.();
            return 0;
          }

          // Haptic at 10, 5, 3, 2, 1 seconds
          if (prev === 11 || prev === 6 || prev === 4 || prev === 3 || prev === 2) {
            haptic('light');
          }

          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, soundEnabled, onComplete]);

  const toggleTimer = useCallback(() => {
    haptic('light');
    setIsRunning((prev) => !prev);
    setIsCompleted(false);
  }, []);

  const resetTimer = useCallback((newTime?: number) => {
    haptic('light');
    setTimeLeft(newTime ?? initialSeconds);
    setIsRunning(false);
    setIsCompleted(false);
  }, [initialSeconds]);

  const adjustTime = useCallback((delta: number) => {
    haptic('light');
    setTimeLeft((prev) => Math.max(0, Math.min(600, prev + delta))); // Max 10 minutes
    setIsCompleted(false);
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calculate progress percentage
  const progress = ((initialSeconds - timeLeft) / initialSeconds) * 100;

  // Compact variant
  if (compact) {
    return (
      <div
        className={`
          flex items-center gap-2 px-3 py-2 bg-gray-800/80 rounded-xl
          border border-gray-700/50 ${className}
        `}
      >
        {/* Timer Display */}
        <div
          className={`
            font-mono text-lg font-bold tabular-nums
            ${isCompleted ? 'text-green-400' : isRunning ? 'text-blue-400' : 'text-gray-300'}
          `}
        >
          {formatTime(timeLeft)}
        </div>

        {/* Play/Pause */}
        <button
          onClick={toggleTimer}
          className={`
            p-1.5 rounded-lg transition-colors
            ${isRunning ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}
          `}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        {/* Quick Done */}
        {isCompleted && (
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg bg-green-500/20 text-green-400"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`
        bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl p-4
        border border-gray-700/50 backdrop-blur-sm ${className}
      `}
    >
      {/* Progress Bar */}
      <div className="h-1 bg-gray-700 rounded-full mb-4 overflow-hidden">
        <div
          className={`
            h-full transition-all duration-1000 ease-linear rounded-full
            ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}
          `}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Timer Display */}
      <div className="text-center mb-4">
        <div
          className={`
            font-mono text-5xl font-bold tabular-nums tracking-tight
            ${isCompleted ? 'text-green-400 animate-pulse' : isRunning ? 'text-blue-400' : 'text-white'}
          `}
        >
          {formatTime(timeLeft)}
        </div>
        <p className="text-sm text-gray-400 mt-1">
          {isCompleted ? 'Rest complete!' : isRunning ? 'Resting...' : 'Rest timer'}
        </p>
      </div>

      {/* Preset Buttons */}
      <div className="flex justify-center gap-2 mb-4">
        {PRESET_TIMES.map((preset) => (
          <button
            key={preset.seconds}
            onClick={() => resetTimer(preset.seconds)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${
                timeLeft === preset.seconds && !isRunning
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }
            `}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {/* Decrease Time */}
        <button
          onClick={() => adjustTime(-15)}
          disabled={isRunning}
          className="p-2.5 rounded-xl bg-gray-700/50 text-gray-300 hover:bg-gray-700
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Minus className="w-5 h-5" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={toggleTimer}
          className={`
            p-4 rounded-2xl transition-all transform active:scale-95
            ${
              isRunning
                ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                : 'bg-blue-500 text-white hover:bg-blue-400'
            }
          `}
        >
          {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </button>

        {/* Increase Time */}
        <button
          onClick={() => adjustTime(15)}
          disabled={isRunning}
          className="p-2.5 rounded-xl bg-gray-700/50 text-gray-300 hover:bg-gray-700
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700/50">
        {/* Reset */}
        <button
          onClick={() => resetTimer()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                   text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>

        {/* Sound Toggle */}
        <button
          onClick={() => {
            haptic('light');
            setSoundEnabled(!soundEnabled);
          }}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors
            ${soundEnabled ? 'text-blue-400 hover:bg-blue-500/10' : 'text-gray-500 hover:bg-gray-700/50'}
          `}
        >
          {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          Sound {soundEnabled ? 'On' : 'Off'}
        </button>

        {/* Skip/Done */}
        <button
          onClick={onDismiss}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                   text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
        >
          <Check className="w-4 h-4" />
          {isCompleted ? 'Done' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

/**
 * Hook to manage rest timer state
 */
export function useRestTimer(defaultSeconds: number = DEFAULT_REST_TIME) {
  const [isTimerVisible, setIsTimerVisible] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(defaultSeconds);

  const showTimer = useCallback((seconds?: number) => {
    setTimerSeconds(seconds ?? defaultSeconds);
    setIsTimerVisible(true);
  }, [defaultSeconds]);

  const hideTimer = useCallback(() => {
    setIsTimerVisible(false);
  }, []);

  return {
    isTimerVisible,
    timerSeconds,
    showTimer,
    hideTimer,
  };
}

export default InlineRestTimer;
