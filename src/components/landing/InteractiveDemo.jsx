/**
 * InteractiveDemo Component
 *
 * Container that cycles through different demo components to showcase
 * MuscleMap's value propositions. Supports auto-play, pause on hover,
 * and manual navigation.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import MuscleTrackingDemo from './MuscleTrackingDemo';
import RPGProgressionDemo from './RPGProgressionDemo';
import WorkoutLogDemo from './WorkoutLogDemo';

// Demo definitions
const DEMOS = [
  {
    id: 'muscle-tracking',
    title: 'Muscle Tracking',
    description: 'See which muscles you\'re working',
    component: MuscleTrackingDemo,
  },
  {
    id: 'rpg-progression',
    title: 'RPG Progression',
    description: 'Level up as you train',
    component: RPGProgressionDemo,
  },
  {
    id: 'workout-log',
    title: 'Workout Logging',
    description: 'Log sets with one tap',
    component: WorkoutLogDemo,
  },
];

// Indicator dots component
function DemoIndicators({ demos, currentIndex, onSelect }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {demos.map((demo, index) => {
        const isActive = index === currentIndex;

        return (
          <button
            key={demo.id}
            onClick={() => onSelect(index)}
            className="group relative p-1"
            aria-label={`View ${demo.title} demo`}
          >
            <motion.div
              className="w-2 h-2 rounded-full transition-colors"
              animate={{
                backgroundColor: isActive ? '#3b82f6' : 'rgba(255,255,255,0.3)',
                scale: isActive ? 1.2 : 1,
              }}
              transition={{ duration: 0.2 }}
            />

            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {demo.title}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Progress bar for auto-play timing
function AutoPlayProgress({ isPlaying, interval }) {
  return (
    <div className="h-0.5 bg-gray-800 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-blue-500"
        initial={{ width: '0%' }}
        animate={{
          width: isPlaying ? '100%' : '0%',
        }}
        transition={{
          duration: isPlaying ? interval / 1000 : 0,
          ease: 'linear',
        }}
        key={isPlaying ? 'playing' : 'paused'}
      />
    </div>
  );
}

// Slide transition variants
const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};

export default function InteractiveDemo({
  autoPlay = true,
  interval = 8000,
  showIndicators = true,
  className = '',
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  // Current demo
  const currentDemo = DEMOS[currentIndex];
  const DemoComponent = currentDemo.component;

  // Navigate to next demo
  const goToNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % DEMOS.length);
  }, []);

  // Navigate to previous demo
  const goToPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + DEMOS.length) % DEMOS.length);
  }, []);

  // Navigate to specific demo
  const goToDemo = useCallback((index) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  // Handle auto-play
  useEffect(() => {
    if (!isPlaying || isPaused) return;

    const timer = setInterval(goToNext, interval);
    return () => clearInterval(timer);
  }, [isPlaying, isPaused, interval, goToNext]);

  // Pause on hover/focus
  const handleMouseEnter = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!containerRef.current?.contains(document.activeElement)) return;

      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  return (
    <div
      ref={containerRef}
      className={`interactive-demo ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      tabIndex={0}
      role="region"
      aria-label="Interactive feature demos"
    >
      {/* Main container */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-sm p-4 max-w-[300px] mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentDemo.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-lg font-bold text-white mb-1">{currentDemo.title}</h3>
              <p className="text-xs text-gray-400">{currentDemo.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Demo content area */}
        <div className="relative min-h-[320px] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentDemo.id}
              custom={direction}
              variants={prefersReducedMotion ? {} : slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
            >
              <DemoComponent />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Auto-play progress */}
        {autoPlay && (
          <div className="mt-4 mb-2">
            <AutoPlayProgress isPlaying={isPlaying && !isPaused} interval={interval} />
          </div>
        )}

        {/* Navigation */}
        {showIndicators && (
          <div className="flex items-center justify-between mt-3">
            {/* Previous button */}
            <button
              onClick={goToPrev}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              aria-label="Previous demo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Indicators */}
            <DemoIndicators
              demos={DEMOS}
              currentIndex={currentIndex}
              onSelect={goToDemo}
            />

            {/* Next button */}
            <button
              onClick={goToNext}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              aria-label="Next demo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Play/Pause toggle */}
        {autoPlay && (
          <div className="flex justify-center mt-3">
            <button
              onClick={() => setIsPlaying((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              {isPlaying ? (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Export individual demos for standalone use
export { MuscleTrackingDemo, RPGProgressionDemo, WorkoutLogDemo };
