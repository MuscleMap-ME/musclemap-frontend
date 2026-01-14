/**
 * SpotlightTour Component - Guided onboarding with spotlight effect
 *
 * A comprehensive tour component that highlights elements on the page
 * with a spotlight effect and shows contextual tooltips to guide users.
 *
 * Features:
 * - Semi-transparent overlay with spotlight cutout
 * - Animated pulse/glow around highlighted element
 * - Glass-styled tooltips with smart positioning
 * - Smooth transitions between steps
 * - Auto-scroll to elements not in viewport
 * - Full keyboard navigation (arrows, Enter, Escape)
 * - Mobile responsive with adaptive tooltip positioning
 * - LocalStorage persistence for completion state
 *
 * @example
 * <SpotlightTour
 *   steps={[
 *     { target: '.muscle-map', title: 'Your Muscle Map', body: 'See which muscles you\'ve trained' },
 *     { target: '.start-workout', title: 'Quick Start', body: 'Tap here to begin' },
 *   ]}
 *   onComplete={() => console.log('Tour finished!')}
 *   showProgress
 * />
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import TourStep from './TourStep';
import { useTour, useTourStore } from './useTour';

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  backdropColor: 'rgba(0, 0, 0, 0.75)',
  spotlightPadding: 12,
  scrollBehavior: 'smooth',
  transitionDuration: 0.3,
};

/**
 * SpotlightTour Component (Declarative API)
 *
 * For direct usage in components. For programmatic control, use the useTour hook.
 */
export default function SpotlightTour({
  steps = [],
  tourId,
  onComplete,
  onSkip,
  onStepChange,
  showProgress = true,
  showSkip = true,
  backdropColor = DEFAULT_CONFIG.backdropColor,
  spotlightPadding = DEFAULT_CONFIG.spotlightPadding,
  scrollBehavior = DEFAULT_CONFIG.scrollBehavior,
  allowBackdropClick = true,
  autoStart = true,
  delay = 500,
}) {
  const { startTour, isActive: globalIsActive } = useTour();

  // Start tour on mount if autoStart is true
  useEffect(() => {
    if (autoStart && steps.length > 0 && !globalIsActive) {
      const timer = setTimeout(() => {
        startTour(steps, {
          tourId,
          onComplete,
          onSkip,
          onStepChange,
          showProgress,
          showSkip,
          backdropColor,
          spotlightPadding,
          scrollBehavior,
          allowBackdropClick,
        });
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [autoStart, steps, tourId, delay, startTour, globalIsActive]);

  // This component just triggers the tour - the actual rendering
  // is handled by SpotlightTourRenderer below
  return null;
}

/**
 * SpotlightTourRenderer - Renders the active tour overlay
 *
 * This component should be mounted once at the app root level.
 * It listens to the global tour store and renders the active tour.
 *
 * @example
 * // In App.jsx or similar root component
 * function App() {
 *   return (
 *     <>
 *       <Routes />
 *       <SpotlightTourRenderer />
 *     </>
 *   );
 * }
 */
export function SpotlightTourRenderer() {
  const {
    isActive,
    steps,
    currentStep,
    config,
    nextStep,
    prevStep,
    skipTour,
  } = useTour();

  const [targetRect, setTargetRect] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const observerRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const step = steps[currentStep];

  // Find and track target element
  const updateTargetRect = useCallback(() => {
    if (!step?.target) {
      setTargetRect(null);
      return;
    }

    const targetElement = document.querySelector(step.target);

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      });

      // Scroll into view if needed
      const isInViewport =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth;

      if (!isInViewport) {
        targetElement.scrollIntoView({
          behavior: config.scrollBehavior || 'smooth',
          block: 'center',
          inline: 'center',
        });

        // Update rect after scroll animation
        setTimeout(() => {
          const newRect = targetElement.getBoundingClientRect();
          setTargetRect({
            top: newRect.top,
            left: newRect.left,
            right: newRect.right,
            bottom: newRect.bottom,
            width: newRect.width,
            height: newRect.height,
          });
        }, 350);
      }
    } else {
      console.warn(`SpotlightTour: Target "${step.target}" not found, skipping step`);
      // Skip to next step if target not found
      setTimeout(() => nextStep(), 100);
    }
  }, [step?.target, config.scrollBehavior, nextStep]);

  // Set up observers for target element changes
  useEffect(() => {
    if (!isActive || !step?.target) return;

    // Initial update
    updateTargetRect();

    // Track resize and scroll events
    const handleUpdate = () => updateTargetRect();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    // Set up ResizeObserver for target element
    const targetElement = document.querySelector(step.target);
    if (targetElement && typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver(handleUpdate);
      resizeObserverRef.current.observe(targetElement);
    }

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
      resizeObserverRef.current?.disconnect();
    };
  }, [isActive, step?.target, currentStep, updateTargetRect]);

  // Handle step transitions
  useEffect(() => {
    if (isActive) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 300);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isActive]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          skipTour();
          break;
        case 'Enter':
        case 'ArrowRight':
          e.preventDefault();
          nextStep();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevStep();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, prevStep, skipTour]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(() => {
    if (config.allowBackdropClick) {
      nextStep();
    }
  }, [config.allowBackdropClick, nextStep]);

  // Don't render if not active
  if (!isActive || steps.length === 0) return null;

  const padding = config.spotlightPadding || DEFAULT_CONFIG.spotlightPadding;

  // Create spotlight clip path
  const spotlightClipPath = targetRect
    ? `polygon(
        0% 0%,
        0% 100%,
        ${targetRect.left - padding}px 100%,
        ${targetRect.left - padding}px ${targetRect.top - padding}px,
        ${targetRect.right + padding}px ${targetRect.top - padding}px,
        ${targetRect.right + padding}px ${targetRect.bottom + padding}px,
        ${targetRect.left - padding}px ${targetRect.bottom + padding}px,
        ${targetRect.left - padding}px 100%,
        100% 100%,
        100% 0%
      )`
    : 'none';

  return createPortal(
    <AnimatePresence mode="wait">
      {isActive && (
        <>
          {/* Backdrop overlay with spotlight cutout */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9998] cursor-pointer"
            style={{
              backgroundColor: config.backdropColor || DEFAULT_CONFIG.backdropColor,
              clipPath: spotlightClipPath,
            }}
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Spotlight ring with pulse animation */}
          {targetRect && (
            <motion.div
              key="spotlight"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="fixed z-[9999] pointer-events-none"
              style={{
                left: targetRect.left - padding,
                top: targetRect.top - padding,
                width: targetRect.width + padding * 2,
                height: targetRect.height + padding * 2,
                borderRadius: '12px',
              }}
            >
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 rounded-xl"
                style={{
                  boxShadow: `
                    0 0 0 2px rgba(0, 102, 255, 0.6),
                    0 0 20px 4px rgba(0, 102, 255, 0.4),
                    0 0 40px 8px rgba(0, 102, 255, 0.2),
                    inset 0 0 15px 2px rgba(0, 102, 255, 0.1)
                  `,
                }}
                animate={{
                  boxShadow: [
                    `0 0 0 2px rgba(0, 102, 255, 0.6), 0 0 20px 4px rgba(0, 102, 255, 0.4), 0 0 40px 8px rgba(0, 102, 255, 0.2), inset 0 0 15px 2px rgba(0, 102, 255, 0.1)`,
                    `0 0 0 3px rgba(0, 102, 255, 0.8), 0 0 30px 6px rgba(0, 102, 255, 0.5), 0 0 50px 10px rgba(0, 102, 255, 0.3), inset 0 0 20px 3px rgba(0, 102, 255, 0.15)`,
                    `0 0 0 2px rgba(0, 102, 255, 0.6), 0 0 20px 4px rgba(0, 102, 255, 0.4), 0 0 40px 8px rgba(0, 102, 255, 0.2), inset 0 0 15px 2px rgba(0, 102, 255, 0.1)`,
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Corner accents */}
              {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
                <div
                  key={corner}
                  className={clsx(
                    'absolute w-4 h-4',
                    corner === 'top-left' && '-top-0.5 -left-0.5',
                    corner === 'top-right' && '-top-0.5 -right-0.5',
                    corner === 'bottom-left' && '-bottom-0.5 -left-0.5',
                    corner === 'bottom-right' && '-bottom-0.5 -right-0.5'
                  )}
                >
                  <div
                    className={clsx(
                      'absolute w-3 h-0.5 bg-blue-400',
                      corner.includes('top') && 'top-0',
                      corner.includes('bottom') && 'bottom-0',
                      corner.includes('left') && 'left-0',
                      corner.includes('right') && 'right-0'
                    )}
                  />
                  <div
                    className={clsx(
                      'absolute h-3 w-0.5 bg-blue-400',
                      corner.includes('top') && 'top-0',
                      corner.includes('bottom') && 'bottom-0',
                      corner.includes('left') && 'left-0',
                      corner.includes('right') && 'right-0'
                    )}
                  />
                </div>
              ))}
            </motion.div>
          )}

          {/* Tour step tooltip */}
          <AnimatePresence mode="wait">
            {!isTransitioning && step && (
              <TourStep
                key={currentStep}
                step={step}
                targetRect={targetRect}
                currentStep={currentStep}
                totalSteps={steps.length}
                showProgress={config.showProgress}
                showSkip={config.showSkip}
                onNext={nextStep}
                onPrev={prevStep}
                onSkip={skipTour}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

/**
 * Spotlight Component - Standalone spotlight without tour
 *
 * Useful for highlighting a single element without a full tour.
 *
 * @example
 * <Spotlight target=".new-feature" onDismiss={() => setShowSpotlight(false)}>
 *   <div className="p-4">
 *     <h3>New Feature!</h3>
 *     <p>Check out this awesome new feature.</p>
 *   </div>
 * </Spotlight>
 */
export function Spotlight({
  target,
  children,
  onDismiss,
  backdropColor = DEFAULT_CONFIG.backdropColor,
  spotlightPadding = DEFAULT_CONFIG.spotlightPadding,
  placement = 'auto',
}) {
  const [targetRect, setTargetRect] = useState(null);

  useEffect(() => {
    const element = document.querySelector(target);
    if (element) {
      const updateRect = () => {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
      };
      updateRect();

      window.addEventListener('resize', updateRect);
      window.addEventListener('scroll', updateRect, true);

      return () => {
        window.removeEventListener('resize', updateRect);
        window.removeEventListener('scroll', updateRect, true);
      };
    }
  }, [target]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onDismiss?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  if (!targetRect) return null;

  const padding = spotlightPadding;
  const clipPath = `polygon(
    0% 0%,
    0% 100%,
    ${targetRect.left - padding}px 100%,
    ${targetRect.left - padding}px ${targetRect.top - padding}px,
    ${targetRect.right + padding}px ${targetRect.top - padding}px,
    ${targetRect.right + padding}px ${targetRect.bottom + padding}px,
    ${targetRect.left - padding}px ${targetRect.bottom + padding}px,
    ${targetRect.left - padding}px 100%,
    100% 100%,
    100% 0%
  )`;

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998]"
        style={{ backgroundColor: backdropColor, clipPath }}
        onClick={onDismiss}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed z-[10000]"
        style={{
          left: targetRect.left + targetRect.width / 2,
          top: targetRect.bottom + 16,
          transform: 'translateX(-50%)',
        }}
      >
        {children}
      </motion.div>
    </>,
    document.body
  );
}
