/**
 * SpotlightTour - Guided onboarding component
 *
 * Highlights target elements with a spotlight effect and displays
 * contextual tooltips to guide users through the app.
 *
 * Features:
 * - Spotlight/highlight around target elements
 * - Animated tooltip with glass design
 * - Next/Back/Skip navigation
 * - localStorage persistence
 * - Keyboard accessible (Escape to skip, Enter for next)
 * - Framer Motion animations
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { GlassButton } from '../glass';

/**
 * Default placement calculation offset
 */
const TOOLTIP_OFFSET = 16;

/**
 * Calculate optimal tooltip placement based on target position
 */
const calculatePlacement = (targetRect, tooltipRect, placement = 'auto') => {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // If explicit placement provided, use it
  if (placement !== 'auto') {
    return placement;
  }

  // Calculate available space in each direction
  const spaceAbove = targetRect.top;
  const spaceBelow = viewport.height - targetRect.bottom;
  const spaceLeft = targetRect.left;
  const spaceRight = viewport.width - targetRect.right;

  // Prefer bottom, then top, then right, then left
  if (spaceBelow >= tooltipRect.height + TOOLTIP_OFFSET) {
    return 'bottom';
  }
  if (spaceAbove >= tooltipRect.height + TOOLTIP_OFFSET) {
    return 'top';
  }
  if (spaceRight >= tooltipRect.width + TOOLTIP_OFFSET) {
    return 'right';
  }
  if (spaceLeft >= tooltipRect.width + TOOLTIP_OFFSET) {
    return 'left';
  }

  // Default to bottom if no space
  return 'bottom';
};

/**
 * Get tooltip position styles based on placement
 */
const getTooltipStyles = (targetRect, placement, tooltipRect) => {
  const styles = {};

  switch (placement) {
    case 'top':
      styles.left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
      styles.top = targetRect.top - tooltipRect.height - TOOLTIP_OFFSET;
      break;
    case 'bottom':
      styles.left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
      styles.top = targetRect.bottom + TOOLTIP_OFFSET;
      break;
    case 'left':
      styles.left = targetRect.left - tooltipRect.width - TOOLTIP_OFFSET;
      styles.top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
      break;
    case 'right':
      styles.left = targetRect.right + TOOLTIP_OFFSET;
      styles.top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
      break;
    default:
      styles.left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
      styles.top = targetRect.bottom + TOOLTIP_OFFSET;
  }

  // Clamp to viewport
  const padding = 16;
  styles.left = Math.max(padding, Math.min(styles.left, window.innerWidth - tooltipRect.width - padding));
  styles.top = Math.max(padding, Math.min(styles.top, window.innerHeight - tooltipRect.height - padding));

  return styles;
};

/**
 * SpotlightTour Component
 *
 * @param {Object[]} steps - Array of tour steps
 * @param {string} steps[].target - CSS selector for target element
 * @param {string} steps[].title - Step title
 * @param {string} steps[].body - Step description
 * @param {string} [steps[].placement] - Tooltip placement (auto, top, bottom, left, right)
 * @param {Function} [onComplete] - Callback when tour is completed
 * @param {Function} [onSkip] - Callback when tour is skipped
 * @param {string} [storageKey] - localStorage key for completion state
 * @param {boolean} [showOnce] - Only show tour once per storage key (default: true)
 */
const SpotlightTour = ({
  steps = [],
  onComplete,
  onSkip,
  storageKey = 'spotlight-tour-complete',
  showOnce = true,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipRect, setTooltipRect] = useState({ width: 320, height: 200 });
  const tooltipRef = useRef(null);
  const spotlightPadding = 8;

  // Define handlers first so they can be used in other effects
  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Tour complete
      if (storageKey) {
        localStorage.setItem(storageKey, 'true');
      }
      setIsActive(false);
      onComplete?.();
    }
  }, [currentStep, steps.length, storageKey, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, 'true');
    }
    setIsActive(false);
    onSkip?.();
  }, [storageKey, onSkip]);

  // Check if tour should be shown
  useEffect(() => {
    if (showOnce && storageKey) {
      const isComplete = localStorage.getItem(storageKey) === 'true';
      if (!isComplete && steps.length > 0) {
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => setIsActive(true), 500);
        return () => clearTimeout(timer);
      }
    } else if (steps.length > 0) {
      const timer = setTimeout(() => setIsActive(true), 500);
      return () => clearTimeout(timer);
    }
  }, [showOnce, storageKey, steps.length]);

  // Update target element rect
  const updateTargetRect = useCallback(() => {
    if (!isActive || currentStep >= steps.length) return;

    const step = steps[currentStep];
    const targetElement = document.querySelector(step.target);

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      setTargetRect(rect);

      // Scroll element into view if needed
      const isInViewport =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth;

      if (!isInViewport) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
        // Update rect after scroll
        setTimeout(() => {
          const newRect = targetElement.getBoundingClientRect();
          setTargetRect(newRect);
        }, 300);
      }
    } else {
      // Target not found, skip to next step
      console.warn(`SpotlightTour: Target "${step.target}" not found`);
      handleNext();
    }
  }, [isActive, currentStep, steps, handleNext]);

  // Update tooltip dimensions after render
  useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      setTooltipRect({ width: rect.width, height: rect.height });
    }
  }, [currentStep, isActive]);

  // Update target rect on step change and window resize
  useEffect(() => {
    updateTargetRect();

    const handleResize = () => updateTargetRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [updateTargetRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          handleSkip();
          break;
        case 'Enter':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleBack();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleNext, handleBack, handleSkip]);

  if (!isActive || steps.length === 0) return null;

  const step = steps[currentStep];
  const placement = calculatePlacement(
    targetRect || { top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0 },
    tooltipRect,
    step.placement
  );
  const tooltipStyles = targetRect
    ? getTooltipStyles(targetRect, placement, tooltipRect)
    : { left: '50%', top: '50%' };

  // Create spotlight clip path
  const spotlightClipPath = targetRect
    ? `polygon(
        0% 0%,
        0% 100%,
        ${targetRect.left - spotlightPadding}px 100%,
        ${targetRect.left - spotlightPadding}px ${targetRect.top - spotlightPadding}px,
        ${targetRect.right + spotlightPadding}px ${targetRect.top - spotlightPadding}px,
        ${targetRect.right + spotlightPadding}px ${targetRect.bottom + spotlightPadding}px,
        ${targetRect.left - spotlightPadding}px ${targetRect.bottom + spotlightPadding}px,
        ${targetRect.left - spotlightPadding}px 100%,
        100% 100%,
        100% 0%
      )`
    : 'none';

  return createPortal(
    <AnimatePresence mode="wait">
      {isActive && (
        <>
          {/* Darkened overlay with spotlight cutout */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9998] pointer-events-auto"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              clipPath: spotlightClipPath,
            }}
            onClick={handleSkip}
            aria-hidden="true"
          />

          {/* Spotlight ring around target */}
          {targetRect && (
            <motion.div
              key="spotlight-ring"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="fixed z-[9999] pointer-events-none"
              style={{
                left: targetRect.left - spotlightPadding,
                top: targetRect.top - spotlightPadding,
                width: targetRect.width + spotlightPadding * 2,
                height: targetRect.height + spotlightPadding * 2,
                borderRadius: '12px',
                boxShadow: `
                  0 0 0 4px var(--brand-blue-500),
                  0 0 20px 4px var(--brand-blue-500),
                  inset 0 0 20px 4px rgba(0, 102, 255, 0.1)
                `,
              }}
              aria-hidden="true"
            />
          )}

          {/* Tooltip */}
          <motion.div
            ref={tooltipRef}
            key={`tooltip-${currentStep}`}
            initial={{ opacity: 0, y: placement === 'top' ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === 'top' ? 10 : -10, scale: 0.95 }}
            transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' }}
            className="fixed z-[10000] w-80 max-w-[calc(100vw-32px)]"
            style={{
              ...tooltipStyles,
              // Glass surface styling
              background: 'var(--glass-white-10)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid var(--glass-white-15)',
              boxShadow: `
                0 8px 32px rgba(0, 0, 0, 0.4),
                0 0 0 1px var(--glass-white-5),
                inset 0 1px 0 0 var(--glass-white-15)
              `,
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="spotlight-tour-title"
            aria-describedby="spotlight-tour-body"
          >
            {/* Content */}
            <div className="p-5">
              {/* Step indicator */}
              <div className="flex items-center gap-1.5 mb-3">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={clsx(
                      'h-1.5 rounded-full transition-all duration-300',
                      index === currentStep
                        ? 'w-6 bg-[var(--brand-blue-500)]'
                        : index < currentStep
                          ? 'w-1.5 bg-[var(--brand-blue-400)]'
                          : 'w-1.5 bg-[var(--glass-white-20)]'
                    )}
                    aria-hidden="true"
                  />
                ))}
              </div>

              {/* Title */}
              <h3
                id="spotlight-tour-title"
                className="text-lg font-semibold text-white mb-2"
              >
                {step.title}
              </h3>

              {/* Body */}
              <p
                id="spotlight-tour-body"
                className="text-sm text-[var(--glass-white-80)] leading-relaxed mb-5"
                style={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                {step.body}
              </p>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleSkip}
                  className="text-sm text-[var(--glass-white-50)] hover:text-white transition-colors px-2 py-1"
                  style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                  aria-label="Skip tour"
                >
                  Skip
                </button>

                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={handleBack}
                      aria-label="Previous step"
                    >
                      Back
                    </GlassButton>
                  )}
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={handleNext}
                    aria-label={currentStep === steps.length - 1 ? 'Finish tour' : 'Next step'}
                  >
                    {currentStep === steps.length - 1 ? 'Done' : 'Next'}
                  </GlassButton>
                </div>
              </div>
            </div>

            {/* Keyboard hint */}
            <div
              className="px-5 py-2 border-t"
              style={{
                borderColor: 'var(--glass-white-10)',
                background: 'var(--glass-white-5)',
                borderRadius: '0 0 16px 16px',
              }}
            >
              <p
                className="text-xs"
                style={{ color: 'rgba(255, 255, 255, 0.4)' }}
              >
                Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--glass-white-10)] text-white">Enter</kbd> for next,{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--glass-white-10)] text-white">Esc</kbd> to skip
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default SpotlightTour;

/**
 * Hook to manually control the SpotlightTour
 *
 * @param {string} storageKey - localStorage key for completion state
 * @returns {Object} Tour control functions
 */
export const useSpotlightTour = (storageKey) => {
  const resetTour = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const isComplete = useCallback(() => {
    if (!storageKey) return false;
    return localStorage.getItem(storageKey) === 'true';
  }, [storageKey]);

  const markComplete = useCallback(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, 'true');
    }
  }, [storageKey]);

  return {
    resetTour,
    isComplete,
    markComplete,
  };
};
