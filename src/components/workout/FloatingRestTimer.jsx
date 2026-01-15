/**
 * FloatingRestTimer Component
 *
 * A persistent, draggable rest timer that stays visible while browsing
 * other exercises during a workout. Features:
 * - Draggable position (persisted to localStorage)
 * - Minimizable to corner indicator
 * - Quick +30/-30 second adjustments
 * - Visual countdown with warning states
 * - Sound/vibration alerts when complete
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  Timer,
  X,
  Minimize2,
  Maximize2,
  SkipForward,
  Volume2,
  VolumeX,
  GripVertical,
} from 'lucide-react';
import { useRestTimer, useRestTimerSettings } from '../../store/workoutSessionStore';
import { haptic } from '../../utils/haptics';
import { useShouldReduceMotion } from '../../contexts/MotionContext';

// Position persistence key
const POSITION_KEY = 'musclemap-floating-timer-position';

// Default position (bottom right with padding)
const DEFAULT_POSITION = { x: -20, y: -120 };

export function FloatingRestTimer({
  enabled = true,
  onTimerEnd,
  className = '',
}) {
  const shouldReduceMotion = useShouldReduceMotion();

  const {
    time,
    isActive,
    totalDuration,
    defaultDuration,
    presets,
    start,
    stop,
    adjust,
    progress,
    formatted,
  } = useRestTimer();

  const { settings, toggleSound } = useRestTimerSettings();

  const [isMinimized, setIsMinimized] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [position, setPosition] = useState(() => {
    try {
      const stored = localStorage.getItem(POSITION_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_POSITION;
    } catch {
      return DEFAULT_POSITION;
    }
  });

  const dragControls = useDragControls();
  const containerRef = useRef(null);
  const hasPlayedAlert = useRef(false);

  // Handle timer completion - note: sound/vibration is now handled by the store
  useEffect(() => {
    if (time === 0 && isActive && !hasPlayedAlert.current) {
      hasPlayedAlert.current = true;
      // Callback
      onTimerEnd?.();
    }

    // Reset alert flag when timer restarts
    if (time > 0) {
      hasPlayedAlert.current = false;
    }
  }, [time, isActive, onTimerEnd]);

  // Handle drag end - save position
  const handleDragEnd = useCallback((event, info) => {
    const newPosition = { x: position.x + info.offset.x, y: position.y + info.offset.y };
    setPosition(newPosition);
    localStorage.setItem(POSITION_KEY, JSON.stringify(newPosition));
  }, [position]);

  // Quick adjust handlers - use settings for amount
  const handleAddTime = useCallback(() => {
    adjust(settings.quickAdjustAmount);
    haptic('light');
  }, [adjust, settings.quickAdjustAmount]);

  const handleSubtractTime = useCallback(() => {
    adjust(-settings.quickAdjustAmount);
    haptic('light');
  }, [adjust, settings.quickAdjustAmount]);

  const handleSkip = useCallback(() => {
    stop();
    haptic('light');
  }, [stop]);

  const handleToggleSound = useCallback(() => {
    toggleSound();
    haptic('light');
  }, [toggleSound]);

  const handleToggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
    haptic('light');
  }, []);

  const handleTogglePresets = useCallback(() => {
    setShowPresets((prev) => !prev);
    haptic('light');
  }, []);

  const handlePresetClick = useCallback((seconds) => {
    start(seconds);
    setShowPresets(false);
    haptic('medium');
  }, [start]);

  // Don't render if disabled or no active timer or floating is disabled
  if (!enabled || !isActive || !settings.showFloatingTimer) return null;

  // Calculate visual states
  const isWarning = time > 0 && time <= settings.countdownWarningAt;
  const isUrgent = time > 0 && time <= 5;
  const displayProgress = totalDuration > 0 ? progress : (defaultDuration > 0 ? ((defaultDuration - time) / defaultDuration) * 100 : 0);

  // Minimized indicator (small pill in corner)
  if (isMinimized) {
    return (
      <motion.button
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-gray-900/95 backdrop-blur-lg border border-gray-700 shadow-lg"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={handleToggleMinimize}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Timer className={`w-4 h-4 ${isUrgent ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-blue-400'}`} />
        <span className={`font-mono font-bold text-sm ${isUrgent ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-white'}`}>
          {formatted}
        </span>
        <Maximize2 className="w-3 h-3 text-gray-400" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        className={`fixed z-50 ${className}`}
        style={{ bottom: 0, right: 0 }}
        initial={{ x: position.x, y: position.y, scale: 0.8, opacity: 0 }}
        animate={{ x: position.x, y: position.y, scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        drag
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        dragConstraints={{
          top: -window.innerHeight + 150,
          bottom: 0,
          left: -window.innerWidth + 200,
          right: 0,
        }}
      >
        <div
          className={`relative bg-gray-900/95 backdrop-blur-lg rounded-2xl border shadow-2xl overflow-hidden ${
            isUrgent ? 'border-red-500/50' : isWarning ? 'border-yellow-500/50' : 'border-gray-700'
          }`}
          style={{ width: 200 }}
        >
          {/* Header with drag handle */}
          <div
            className="flex items-center justify-between px-3 py-2 border-b border-gray-800 cursor-move"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Rest Timer</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleMinimize}
                className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-300"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleSkip}
                className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Timer Display */}
          <div className="p-4">
            {/* Progress bar */}
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden mb-4">
              <motion.div
                className={`h-full ${isUrgent ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-blue-500'}`}
                initial={{ width: '0%' }}
                animate={{ width: `${displayProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Time display */}
            <motion.div
              className="text-center mb-4"
              animate={isWarning && !shouldReduceMotion ? { scale: [1, 1.02, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.5 }}
            >
              <span
                className={`text-4xl font-mono font-bold tabular-nums ${
                  isUrgent ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-white'
                }`}
                style={isWarning ? { textShadow: `0 0 20px ${isUrgent ? 'rgba(239, 68, 68, 0.5)' : 'rgba(234, 179, 8, 0.5)'}` } : {}}
              >
                {formatted}
              </span>
            </motion.div>

            {/* Control buttons */}
            <div className="flex items-center justify-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSubtractTime}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm min-w-[48px]"
                aria-label={`Subtract ${settings.quickAdjustAmount} seconds`}
              >
                -{settings.quickAdjustAmount}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSkip}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
                aria-label="Skip rest"
              >
                <SkipForward className="w-5 h-5" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleAddTime}
                className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium text-sm min-w-[48px]"
                aria-label={`Add ${settings.quickAdjustAmount} seconds`}
              >
                +{settings.quickAdjustAmount}
              </motion.button>
            </div>

            {/* Preset buttons toggle */}
            <button
              onClick={handleTogglePresets}
              className="w-full mt-3 py-1.5 text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              {showPresets ? 'Hide presets' : 'Show presets'}
            </button>

            {/* Preset buttons */}
            <AnimatePresence>
              {showPresets && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap justify-center gap-1 pt-2">
                    {presets.map((preset) => (
                      <button
                        key={preset.seconds}
                        onClick={() => handlePresetClick(preset.seconds)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          time === preset.seconds || totalDuration === preset.seconds
                            ? 'bg-blue-500/30 text-blue-400 border border-blue-500/40'
                            : 'bg-gray-800 text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer with sound toggle */}
          <div className="px-3 py-2 border-t border-gray-800 flex items-center justify-between">
            <button
              onClick={handleToggleSound}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300"
            >
              {settings.soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  Sound On
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  Sound Off
                </>
              )}
            </button>

            <span className="text-xs text-gray-500">
              Drag to move
            </span>
          </div>

          {/* Pulsing border effect when warning */}
          {isWarning && !shouldReduceMotion && (
            <motion.div
              className={`absolute inset-0 rounded-2xl border-2 pointer-events-none ${
                isUrgent ? 'border-red-500/50' : 'border-yellow-500/50'
              }`}
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ repeat: Infinity, duration: isUrgent ? 0.3 : 0.5 }}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default FloatingRestTimer;
