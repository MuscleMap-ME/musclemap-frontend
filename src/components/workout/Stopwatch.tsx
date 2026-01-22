/**
 * Stopwatch Component
 *
 * For timed exercises (planks, holds, cardio, etc.)
 * Features:
 * - Count-up stopwatch
 * - Lap/split times
 * - Countdown mode option
 * - Sound alerts
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Flag,
  Clock,
  Timer,
  ChevronDown,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { haptic } from '../../utils/haptics';

// Format time in mm:ss or hh:mm:ss
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

// Format lap time
function formatLapTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

// Quick countdown presets
const COUNTDOWN_PRESETS = [
  { label: '30s', value: 30 },
  { label: '45s', value: 45 },
  { label: '1m', value: 60 },
  { label: '90s', value: 90 },
  { label: '2m', value: 120 },
  { label: '3m', value: 180 },
  { label: '5m', value: 300 },
];

interface Lap {
  number: number;
  time: number;
  delta: number;
}

interface StopwatchProps {
  onTimeRecorded?: (time: number) => void;
  onClose?: () => void;
  compact?: boolean;
  initialMode?: 'stopwatch' | 'countdown';
  initialCountdown?: number;
}

export function Stopwatch({
  onTimeRecorded,
  onClose,
  compact = false,
  initialMode = 'stopwatch',
  initialCountdown = 60,
}: StopwatchProps) {
  const [mode, setMode] = useState<'stopwatch' | 'countdown'>(initialMode);
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0); // Elapsed time in ms
  const [countdownTarget, setCountdownTarget] = useState(initialCountdown);
  const [customCountdown, setCustomCountdown] = useState('');
  const [laps, setLaps] = useState<Lap[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showLaps, setShowLaps] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastLapTimeRef = useRef<number>(0);

  // Audio context for beeps
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play beep sound
  const playBeep = useCallback((frequency = 800, duration = 100) => {
    if (!soundEnabled) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (_e) {
      // Audio not supported
    }
  }, [soundEnabled]);

  // Start/stop timer
  const toggleTimer = useCallback(() => {
    if (isRunning) {
      // Pause
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRunning(false);
    } else {
      // Start
      startTimeRef.current = Date.now() - time;
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setTime(elapsed);

        // Countdown mode: check if finished
        if (mode === 'countdown') {
          const remaining = countdownTarget * 1000 - elapsed;
          if (remaining <= 0) {
            // Time's up!
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            setIsRunning(false);
            setTime(countdownTarget * 1000);
            playBeep(1000, 500);
            haptic('heavy');
            onTimeRecorded?.(countdownTarget * 1000);
          } else if (remaining <= 3000 && remaining > 2900) {
            // 3 second warning
            playBeep(600, 100);
            haptic('light');
          } else if (remaining <= 2000 && remaining > 1900) {
            playBeep(600, 100);
            haptic('light');
          } else if (remaining <= 1000 && remaining > 900) {
            playBeep(600, 100);
            haptic('light');
          }
        }
      }, 10);
      setIsRunning(true);
      haptic('light');
    }
  }, [isRunning, time, mode, countdownTarget, playBeep, onTimeRecorded]);

  // Reset timer
  const resetTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setTime(0);
    setLaps([]);
    lastLapTimeRef.current = 0;
    haptic('light');
  }, []);

  // Record lap
  const recordLap = useCallback(() => {
    const lapTime = time - lastLapTimeRef.current;
    const delta = laps.length > 0 ? lapTime - laps[laps.length - 1].time : 0;

    setLaps((prev) => [
      ...prev,
      {
        number: prev.length + 1,
        time: lapTime,
        delta,
      },
    ]);
    lastLapTimeRef.current = time;
    haptic('medium');
    playBeep(600, 50);
  }, [time, laps, playBeep]);

  // Finish and record time
  const finishAndRecord = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    onTimeRecorded?.(time);
    haptic('medium');
  }, [time, onTimeRecorded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Display time (countdown shows remaining)
  const displayTime = mode === 'countdown' ? Math.max(0, countdownTarget * 1000 - time) : time;
  const isTimeUp = mode === 'countdown' && time >= countdownTarget * 1000;

  // Progress percentage for countdown
  const progress = mode === 'countdown' ? (time / (countdownTarget * 1000)) * 100 : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
        <button
          onClick={toggleTimer}
          className={`p-2 rounded-lg ${isRunning ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
        >
          {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        <span className="font-mono text-xl font-bold flex-1">{formatTime(displayTime)}</span>
        <button onClick={resetTimer} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400">
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          {mode === 'stopwatch' ? (
            <Clock className="w-5 h-5 text-blue-400" />
          ) : (
            <Timer className="w-5 h-5 text-orange-400" />
          )}
          <h3 className="font-semibold text-white">
            {mode === 'stopwatch' ? 'Stopwatch' : 'Countdown Timer'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg ${soundEnabled ? 'text-blue-400' : 'text-gray-600'}`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 p-4 border-b border-gray-800">
        <button
          onClick={() => {
            setMode('stopwatch');
            resetTimer();
          }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${
            mode === 'stopwatch' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          Stopwatch
        </button>
        <button
          onClick={() => {
            setMode('countdown');
            resetTimer();
          }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${
            mode === 'countdown' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          Countdown
        </button>
      </div>

      {/* Main display */}
      <div className="p-6">
        {/* Progress ring for countdown */}
        {mode === 'countdown' && (
          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="96"
                cy="96"
                r="88"
                fill="none"
                stroke="#374151"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="96"
                cy="96"
                r="88"
                fill="none"
                stroke={isTimeUp ? '#EF4444' : progress > 90 ? '#EF4444' : progress > 75 ? '#F59E0B' : '#3B82F6'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                className="transition-all duration-100"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`font-mono text-4xl font-bold ${
                  isTimeUp ? 'text-red-400' : displayTime <= 10000 ? 'text-red-400' : displayTime <= 30000 ? 'text-yellow-400' : 'text-white'
                }`}
              >
                {formatTime(displayTime)}
              </span>
              {isTimeUp && <span className="text-red-400 text-sm mt-1">Time&apos;s Up!</span>}
            </div>
          </div>
        )}

        {/* Stopwatch display */}
        {mode === 'stopwatch' && (
          <div className="text-center mb-6">
            <span className="font-mono text-5xl font-bold text-white">
              {formatTime(displayTime)}
            </span>
          </div>
        )}

        {/* Countdown presets */}
        {mode === 'countdown' && !isRunning && (
          <div className="mb-6">
            <div className="flex flex-wrap justify-center gap-2 mb-3">
              {COUNTDOWN_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    setCountdownTarget(preset.value);
                    resetTimer();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    countdownTarget === preset.value
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={customCountdown}
                onChange={(e) => setCustomCountdown(e.target.value)}
                placeholder="Custom (seconds)"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
              />
              <button
                onClick={() => {
                  const val = parseInt(customCountdown);
                  if (val > 0) {
                    setCountdownTarget(val);
                    resetTimer();
                  }
                }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
                disabled={!customCountdown || parseInt(customCountdown) <= 0}
              >
                Set
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={resetTimer}
            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400"
          >
            <RotateCcw className="w-6 h-6" />
          </button>

          <button
            onClick={toggleTimer}
            disabled={isTimeUp}
            className={`p-4 rounded-full text-white ${
              isRunning
                ? 'bg-red-600 hover:bg-red-700'
                : isTimeUp
                ? 'bg-gray-700 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </button>

          {mode === 'stopwatch' && isRunning && (
            <button
              onClick={recordLap}
              className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full text-white"
            >
              <Flag className="w-6 h-6" />
            </button>
          )}

          {!isRunning && time > 0 && onTimeRecorded && (
            <button
              onClick={finishAndRecord}
              className="p-3 bg-green-600 hover:bg-green-700 rounded-full text-white"
            >
              <Flag className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Laps */}
        {mode === 'stopwatch' && laps.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowLaps(!showLaps)}
              className="flex items-center justify-between w-full p-3 bg-gray-800/50 rounded-lg text-sm"
            >
              <span className="text-gray-400">Laps ({laps.length})</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showLaps ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showLaps && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {[...laps].reverse().map((lap) => (
                      <div
                        key={lap.number}
                        className="flex items-center justify-between p-2 bg-gray-800/30 rounded text-sm"
                      >
                        <span className="text-gray-500">Lap {lap.number}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono">{formatLapTime(lap.time)}</span>
                          {lap.delta !== 0 && (
                            <span className={lap.delta > 0 ? 'text-red-400' : 'text-green-400'}>
                              {lap.delta > 0 ? '+' : ''}{formatLapTime(Math.abs(lap.delta))}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

export default Stopwatch;
