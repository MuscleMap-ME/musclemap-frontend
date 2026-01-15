/**
 * RestTimer Component - Fullscreen Workout Mode
 *
 * Large circular countdown display optimized for gym use:
 * - Prominent countdown with pulsing animation
 * - Fullscreen mode with ambient particle effects
 * - Configurable rest times (30s, 60s, 90s, 120s, custom)
 * - Audio alert (Web Audio API beep) when timer ends
 * - Vibration when timer ends
 * - Pulsing glow as timer approaches zero
 * - Skip and +30s/-30s buttons
 * - Optional ambient sounds hooks (white noise, heartbeat)
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { haptic } from '../../utils/haptics';
import { useShouldReduceMotion } from '../../contexts/MotionContext';

// Rest time presets
const REST_PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
];

// Particle count for ambient effects
const PARTICLE_COUNT = 30;

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

/**
 * Generate ambient particles for fullscreen mode
 */
function generateParticles(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 10 + 10,
    delay: Math.random() * 5,
  }));
}

/**
 * Ambient Particles Component
 */
function AmbientParticles({ active, intensity = 1 }) {
  const shouldReduceMotion = useShouldReduceMotion();
  const particles = useMemo(() => generateParticles(PARTICLE_COUNT), []);

  if (shouldReduceMotion || !active) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-blue-500/20"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size * intensity,
            height: particle.size * intensity,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0, 0.6 * intensity, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Hook for optional ambient sound effects
 * Just provides the interface - actual audio files not included
 */
export function useAmbientSound() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundType, setSoundType] = useState('none'); // 'none' | 'whitenoise' | 'heartbeat'

  const startSound = useCallback((type = 'whitenoise') => {
    setSoundType(type);
    setIsPlaying(true);
    // Actual audio implementation would go here
    // Using Web Audio API for generated sounds
  }, []);

  const stopSound = useCallback(() => {
    setIsPlaying(false);
    setSoundType('none');
  }, []);

  return {
    isPlaying,
    soundType,
    startSound,
    stopSound,
  };
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
  fullscreen = false,
}) {
  const shouldReduceMotion = useShouldReduceMotion();
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
  const radius = fullscreen ? 100 : 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  // Calculate intensity for ambient effects based on time remaining
  const intensity = useMemo(() => {
    if (!isActive) return 0;
    if (isUrgent) return 1.5;
    if (isWarning) return 1.2;
    return 1;
  }, [isActive, isWarning, isUrgent]);

  // Fullscreen version
  if (fullscreen) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full relative">
        {/* Ambient Particles */}
        <AmbientParticles active={isActive && !shouldReduceMotion} intensity={intensity} />

        {/* Pulsing background glow */}
        {isActive && !shouldReduceMotion && (
          <motion.div
            className={`absolute w-80 h-80 rounded-full blur-3xl ${
              isUrgent
                ? 'bg-red-500/20'
                : isWarning
                ? 'bg-yellow-500/20'
                : 'bg-blue-500/15'
            }`}
            animate={{
              scale: isWarning ? [1, 1.1, 1] : [1, 1.05, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: isUrgent ? 0.5 : isWarning ? 1 : 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Circular Timer Display - Large for fullscreen */}
        <div className="relative w-64 h-64 md:w-80 md:h-80 z-10">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="10"
            />
            {/* Progress circle */}
            {isActive && (
              <motion.circle
                cx="50%"
                cy="50%"
                r={radius}
                fill="none"
                stroke={isUrgent ? '#ef4444' : isWarning ? '#eab308' : '#3b82f6'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.5, ease: 'linear' }}
                style={{
                  filter: `drop-shadow(0 0 ${isWarning ? '16px' : '12px'} ${
                    isUrgent ? 'rgba(239, 68, 68, 0.6)' : isWarning ? 'rgba(234, 179, 8, 0.6)' : 'rgba(59, 130, 246, 0.5)'
                  })`,
                }}
              />
            )}
          </svg>

          {/* Time Display - Extra large */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={time}
                initial={shouldReduceMotion ? {} : { scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={shouldReduceMotion ? {} : { scale: 0.9, opacity: 0 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.1 }}
                className={`text-7xl md:text-8xl font-mono font-bold tabular-nums ${
                  isUrgent ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-white'
                }`}
                style={
                  isWarning && !shouldReduceMotion
                    ? {
                        textShadow: `0 0 20px ${isUrgent ? 'rgba(239, 68, 68, 0.5)' : 'rgba(234, 179, 8, 0.5)'}`,
                      }
                    : {}
                }
              >
                {formatTime(time)}
              </motion.span>
            </AnimatePresence>
            {isActive && (
              <span className="text-lg text-gray-400 mt-2 uppercase tracking-widest">REST</span>
            )}
          </div>

          {/* Pulsing ring effect when warning */}
          {isWarning && !shouldReduceMotion && (
            <motion.div
              className={`absolute inset-0 rounded-full border-4 ${
                isUrgent ? 'border-red-500/40' : 'border-yellow-500/40'
              }`}
              animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: isUrgent ? 0.3 : 0.5 }}
            />
          )}
        </div>

        {/* Controls - Large buttons for fullscreen */}
        <div className="flex items-center gap-6 mt-10 z-10">
          {/* -30s Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onAdjust?.(-30)}
            className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center text-white font-bold text-lg transition-colors touch-manipulation select-none"
            aria-label="Subtract 30 seconds"
          >
            -30
          </motion.button>

          {/* Skip Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSkip}
            className="w-20 h-20 min-w-[80px] min-h-[80px] rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors touch-manipulation select-none"
            aria-label="Skip rest"
          >
            <SkipForward className="w-10 h-10 text-white" />
          </motion.button>

          {/* +30s Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleAdd30}
            className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-full bg-blue-500/20 hover:bg-blue-500/30 active:bg-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-lg transition-colors touch-manipulation select-none"
            aria-label="Add 30 seconds"
          >
            +30
          </motion.button>
        </div>

        {/* Sound Toggle */}
        <button
          onClick={handleSoundToggle}
          className="mt-6 flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 touch-manipulation z-10"
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-5 h-5" />
              Sound On
            </>
          ) : (
            <>
              <VolumeX className="w-5 h-5" />
              Sound Off
            </>
          )}
        </button>

        {/* Tap anywhere hint */}
        <p className="absolute bottom-8 text-gray-500 text-sm z-10">
          Tap Skip to end rest early
        </p>
      </div>
    );
  }

  // Standard (non-fullscreen) version
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
              initial={shouldReduceMotion ? {} : { scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={shouldReduceMotion ? {} : { scale: 0.9, opacity: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.1 }}
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
        {isWarning && !shouldReduceMotion && (
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
              className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors touch-manipulation select-none"
              aria-label="Skip rest"
            >
              <SkipForward className="w-6 h-6 text-white" />
            </motion.button>

            {/* Add 30s Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAdd30}
              className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-full bg-blue-500/20 hover:bg-blue-500/30 active:bg-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-lg transition-colors touch-manipulation select-none"
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
            className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-full bg-blue-500/20 hover:bg-blue-500/30 active:bg-blue-500/40 flex items-center justify-center text-blue-400 transition-colors touch-manipulation select-none"
            aria-label="Start rest timer"
          >
            <Play className="w-8 h-8" />
          </motion.button>
        )}
      </div>

      {/* Preset Buttons */}
      {!isActive && (
        <div className="flex gap-3 mt-6 flex-wrap justify-center">
          {REST_PRESETS.map((preset) => (
            <motion.button
              key={preset.seconds}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePresetClick(preset.seconds)}
              className={`px-5 py-3 min-h-[48px] rounded-xl font-medium text-base transition-all touch-manipulation select-none ${
                totalDuration === preset.seconds
                  ? 'bg-blue-500/30 text-blue-400 border border-blue-500/40'
                  : 'bg-white/10 hover:bg-white/20 active:bg-white/30 text-gray-300'
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
