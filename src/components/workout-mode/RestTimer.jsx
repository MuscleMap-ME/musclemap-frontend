/**
 * RestTimer Component - Fullscreen Workout Mode
 *
 * Large circular countdown display optimized for gym use:
 * - Prominent countdown with pulsing animation
 * - Configurable rest times (30s, 60s, 90s, 120s, custom)
 * - Audio alert (Web Audio API beep) when timer ends
 * - Vibration when timer ends
 * - Skip and +30s buttons
 * - Pause/resume functionality
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, Plus, Volume2, VolumeX } from 'lucide-react';
import { haptic } from '../../utils/haptics';

// Rest time presets
const REST_PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '2m', seconds: 120 },
];

/**
 * Generate a beep sound using Web Audio API
 */
function playBeep(frequency = 880, duration = 200, volume = 0.3) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.value = volume;

    oscillator.start();

    // Fade out
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, duration);
  } catch {
    // Audio not supported or blocked
  }
}

/**
 * Play completion sound - triple beep
 */
function playCompletionSound() {
  playBeep(880, 150, 0.4);
  setTimeout(() => playBeep(880, 150, 0.4), 200);
  setTimeout(() => playBeep(1100, 300, 0.4), 400);
}

export function RestTimer({
  time,
  isActive,
  totalDuration,
  onStart,
  onStop,
  onAdjust,
  soundEnabled = true,
  onSoundToggle,
  compact = false,
}) {
  const [isPaused, setIsPaused] = useState(false);
  const hasPlayedAlertRef = useRef(false);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progress = totalDuration > 0 ? ((totalDuration - time) / totalDuration) * 100 : 0;

  // Determine if timer is in "warning" state (last 10 seconds)
  const isWarning = time > 0 && time <= 10;
  const isUrgent = time > 0 && time <= 5;

  // Handle timer completion
  useEffect(() => {
    if (time === 0 && isActive && !hasPlayedAlertRef.current) {
      hasPlayedAlertRef.current = true;

      // Play audio alert
      if (soundEnabled) {
        playCompletionSound();
      }

      // Vibration
      haptic('success');
    }

    // Reset alert flag when timer restarts
    if (time > 0) {
      hasPlayedAlertRef.current = false;
    }
  }, [time, isActive, soundEnabled]);

  // Handle start with preset
  const handlePresetClick = useCallback(
    (seconds) => {
      onStart?.(seconds);
      haptic('light');
    },
    [onStart]
  );

  // Handle skip
  const handleSkip = useCallback(() => {
    onStop?.();
    haptic('light');
  }, [onStop]);

  // Handle +30s
  const handleAdd30 = useCallback(() => {
    onAdjust?.(30);
    haptic('light');
  }, [onAdjust]);

  // Toggle sound
  const handleSoundToggle = useCallback(() => {
    onSoundToggle?.(!soundEnabled);
    haptic('light');
  }, [onSoundToggle, soundEnabled]);

  // Compact version for inline display
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {isActive ? (
          <>
            <motion.div
              animate={isWarning ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className={`font-mono text-2xl font-bold tabular-nums ${
                isUrgent ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-blue-400'
              }`}
            >
              {formatTime(time)}
            </motion.div>
            <button
              onClick={handleSkip}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all touch-manipulation"
              aria-label="Skip rest timer"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            <button
              onClick={handleAdd30}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all touch-manipulation"
              aria-label="Add 30 seconds"
            >
              <Plus className="w-5 h-5" />
            </button>
          </>
        ) : (
          <div className="flex gap-2">
            {REST_PRESETS.map((preset) => (
              <button
                key={preset.seconds}
                onClick={() => handlePresetClick(preset.seconds)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all touch-manipulation text-sm font-medium"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full version with circular display
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <div className="flex flex-col items-center">
      {/* Circular Timer Display */}
      <div className="relative w-48 h-48">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          {isActive && (
            <motion.circle
              cx="96"
              cy="96"
              r={radius}
              fill="none"
              stroke={isUrgent ? '#ef4444' : isWarning ? '#eab308' : '#3b82f6'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5, ease: 'linear' }}
              style={{
                filter: `drop-shadow(0 0 8px ${
                  isUrgent ? 'rgba(239, 68, 68, 0.5)' : isWarning ? 'rgba(234, 179, 8, 0.5)' : 'rgba(59, 130, 246, 0.5)'
                })`,
              }}
            />
          )}
        </svg>

        {/* Time Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={time}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.1 }}
              className={`text-5xl font-mono font-bold tabular-nums ${
                isUrgent ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-white'
              }`}
            >
              {formatTime(time)}
            </motion.span>
          </AnimatePresence>
          {isActive && (
            <span className="text-sm text-gray-400 mt-1">REST</span>
          )}
        </div>

        {/* Pulsing ring effect when warning */}
        {isWarning && (
          <motion.div
            className={`absolute inset-0 rounded-full border-4 ${
              isUrgent ? 'border-red-500/30' : 'border-yellow-500/30'
            }`}
            animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mt-6">
        {isActive ? (
          <>
            {/* Skip Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSkip}
              className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors touch-manipulation"
              aria-label="Skip rest"
            >
              <SkipForward className="w-6 h-6" />
            </motion.button>

            {/* Add 30s Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAdd30}
              className="w-16 h-16 rounded-full bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg transition-colors touch-manipulation"
              aria-label="Add 30 seconds"
            >
              +30
            </motion.button>
          </>
        ) : (
          /* Start Button */
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handlePresetClick(totalDuration || 90)}
            className="w-16 h-16 rounded-full bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-400 transition-colors touch-manipulation"
            aria-label="Start rest timer"
          >
            <Play className="w-8 h-8" />
          </motion.button>
        )}
      </div>

      {/* Preset Buttons */}
      {!isActive && (
        <div className="flex gap-3 mt-6">
          {REST_PRESETS.map((preset) => (
            <motion.button
              key={preset.seconds}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePresetClick(preset.seconds)}
              className={`px-5 py-3 rounded-xl font-medium text-base transition-all touch-manipulation ${
                totalDuration === preset.seconds
                  ? 'bg-blue-500/30 text-blue-400 border border-blue-500/40'
                  : 'bg-white/10 hover:bg-white/20 text-gray-300'
              }`}
            >
              {preset.label}
            </motion.button>
          ))}
        </div>
      )}

      {/* Sound Toggle */}
      <button
        onClick={handleSoundToggle}
        className="mt-4 flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 touch-manipulation"
      >
        {soundEnabled ? (
          <>
            <Volume2 className="w-4 h-4" />
            Sound On
          </>
        ) : (
          <>
            <VolumeX className="w-4 h-4" />
            Sound Off
          </>
        )}
      </button>
    </div>
  );
}

export default RestTimer;
