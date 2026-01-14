/**
 * TourStep Component - Individual step tooltip for spotlight tours
 *
 * Renders the tooltip content for a single tour step with:
 * - Glass morphism styling
 * - Smart positioning to avoid viewport edges
 * - Animated entrance/exit
 * - Step progress indicator
 * - Navigation buttons
 *
 * @example
 * <TourStep
 *   step={{ title: 'Welcome', body: 'Let me show you around', placement: 'bottom' }}
 *   targetRect={{ top: 100, left: 200, width: 150, height: 50 }}
 *   currentStep={0}
 *   totalSteps={5}
 *   onNext={() => {}}
 *   onPrev={() => {}}
 *   onSkip={() => {}}
 * />
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Tooltip offset from target element
 */
const TOOLTIP_OFFSET = 16;

/**
 * Viewport padding for tooltip positioning
 */
const VIEWPORT_PADDING = 16;

/**
 * Arrow pointer configurations for each placement
 */
const ARROW_CONFIG = {
  top: {
    position: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full',
    border: 'border-l-transparent border-r-transparent border-b-transparent border-t-[rgba(255,255,255,0.1)]',
    shadow: '0 2px 8px rgba(0, 102, 255, 0.2)',
  },
  bottom: {
    position: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full',
    border: 'border-l-transparent border-r-transparent border-t-transparent border-b-[rgba(255,255,255,0.1)]',
    shadow: '0 -2px 8px rgba(0, 102, 255, 0.2)',
  },
  left: {
    position: 'right-0 top-1/2 -translate-y-1/2 translate-x-full',
    border: 'border-t-transparent border-b-transparent border-r-transparent border-l-[rgba(255,255,255,0.1)]',
    shadow: '2px 0 8px rgba(0, 102, 255, 0.2)',
  },
  right: {
    position: 'left-0 top-1/2 -translate-y-1/2 -translate-x-full',
    border: 'border-t-transparent border-b-transparent border-l-transparent border-r-[rgba(255,255,255,0.1)]',
    shadow: '-2px 0 8px rgba(0, 102, 255, 0.2)',
  },
};

/**
 * Calculate optimal tooltip placement based on available space
 */
function calculatePlacement(targetRect, tooltipRect, preferredPlacement = 'auto') {
  if (!targetRect) return 'bottom';

  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // If explicit placement provided and valid, use it
  if (preferredPlacement !== 'auto') {
    return preferredPlacement;
  }

  // Calculate available space in each direction
  const space = {
    top: targetRect.top,
    bottom: viewport.height - targetRect.bottom,
    left: targetRect.left,
    right: viewport.width - targetRect.right,
  };

  // Prefer bottom, then top, then right, then left
  const placements = ['bottom', 'top', 'right', 'left'];
  const requiredSpace = {
    top: tooltipRect.height + TOOLTIP_OFFSET,
    bottom: tooltipRect.height + TOOLTIP_OFFSET,
    left: tooltipRect.width + TOOLTIP_OFFSET,
    right: tooltipRect.width + TOOLTIP_OFFSET,
  };

  for (const placement of placements) {
    if (space[placement] >= requiredSpace[placement]) {
      return placement;
    }
  }

  // Default to bottom if no space
  return 'bottom';
}

/**
 * Calculate tooltip position styles based on placement
 */
function calculatePosition(targetRect, placement, tooltipRect) {
  if (!targetRect) {
    return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  }

  const styles = { position: 'fixed' };

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

  // Clamp to viewport bounds
  const maxLeft = window.innerWidth - tooltipRect.width - VIEWPORT_PADDING;
  const maxTop = window.innerHeight - tooltipRect.height - VIEWPORT_PADDING;

  styles.left = Math.max(VIEWPORT_PADDING, Math.min(styles.left, maxLeft));
  styles.top = Math.max(VIEWPORT_PADDING, Math.min(styles.top, maxTop));

  return styles;
}

/**
 * Animation variants for tooltip entrance/exit
 */
const tooltipVariants = {
  initial: (placement) => ({
    opacity: 0,
    scale: 0.95,
    y: placement === 'top' ? 10 : placement === 'bottom' ? -10 : 0,
    x: placement === 'left' ? 10 : placement === 'right' ? -10 : 0,
  }),
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    x: 0,
  },
  exit: (placement) => ({
    opacity: 0,
    scale: 0.95,
    y: placement === 'top' ? 10 : placement === 'bottom' ? -10 : 0,
    x: placement === 'left' ? 10 : placement === 'right' ? -10 : 0,
  }),
};

/**
 * TourStep Component
 */
export default function TourStep({
  step,
  targetRect,
  currentStep,
  totalSteps,
  showProgress = true,
  showSkip = true,
  onNext,
  onPrev,
  onSkip,
}) {
  const tooltipRef = useRef(null);
  const [tooltipRect, setTooltipRect] = useState({ width: 320, height: 200 });

  // Update tooltip dimensions after render
  useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      setTooltipRect({ width: rect.width, height: rect.height });
    }
  }, [step, currentStep]);

  // Calculate placement and position
  const placement = useMemo(
    () => calculatePlacement(targetRect, tooltipRect, step?.placement),
    [targetRect, tooltipRect, step?.placement]
  );

  const position = useMemo(
    () => calculatePosition(targetRect, placement, tooltipRect),
    [targetRect, placement, tooltipRect]
  );

  if (!step) return null;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <motion.div
      ref={tooltipRef}
      className="fixed z-[10000] w-80 max-w-[calc(100vw-32px)]"
      style={position}
      custom={placement}
      variants={tooltipVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        duration: 0.25,
        ease: [0.4, 0, 0.2, 1],
        delay: 0.1,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-step-title"
      aria-describedby="tour-step-body"
    >
      {/* Glass surface */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'rgba(15, 15, 20, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
            0 0 60px -20px rgba(0, 102, 255, 0.3)
          `,
        }}
      >
        {/* Gradient border accent */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0, 102, 255, 0.5), rgba(139, 92, 246, 0.5), transparent)',
          }}
        />

        {/* Content */}
        <div className="p-5">
          {/* Progress indicator */}
          {showProgress && totalSteps > 1 && (
            <div className="flex items-center gap-1.5 mb-3">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <motion.div
                  key={index}
                  className={clsx(
                    'h-1.5 rounded-full transition-all duration-300',
                    index === currentStep
                      ? 'bg-blue-500'
                      : index < currentStep
                        ? 'bg-blue-400/50'
                        : 'bg-white/20'
                  )}
                  initial={{ width: index === currentStep ? 8 : 6 }}
                  animate={{ width: index === currentStep ? 24 : 6 }}
                  transition={{ duration: 0.3 }}
                  aria-hidden="true"
                />
              ))}
              <span className="ml-auto text-xs text-white/40">
                {currentStep + 1} / {totalSteps}
              </span>
            </div>
          )}

          {/* Title */}
          <h3
            id="tour-step-title"
            className="text-lg font-semibold text-white mb-2"
          >
            {step.title}
          </h3>

          {/* Body */}
          <p
            id="tour-step-body"
            className="text-sm text-white/70 leading-relaxed mb-5"
          >
            {step.body}
          </p>

          {/* Custom content slot */}
          {step.content && (
            <div className="mb-5">{step.content}</div>
          )}

          {/* Step action button (optional) */}
          {step.action && step.action.label && (
            <div className="mb-4">
              <motion.button
                onClick={() => {
                  if (step.action.onClick) {
                    step.action.onClick();
                  }
                }}
                className={clsx(
                  'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium',
                  'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200',
                  'border border-purple-500/30 hover:border-purple-500/50',
                  'transition-all duration-200'
                )}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {step.action.label}
              </motion.button>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-3">
            {/* Skip button */}
            {showSkip ? (
              <button
                onClick={onSkip}
                className="text-sm text-white/40 hover:text-white/70 transition-colors px-2 py-1 rounded"
                aria-label="Skip tour"
              >
                Skip tour
              </button>
            ) : (
              <div />
            )}

            {/* Nav buttons */}
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  onClick={onPrev}
                  className={clsx(
                    'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium',
                    'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white',
                    'transition-colors min-h-[40px]'
                  )}
                  aria-label="Previous step"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}

              <motion.button
                onClick={onNext}
                className={clsx(
                  'flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-blue-500 hover:bg-blue-400 text-white',
                  'transition-colors min-h-[40px]'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label={isLastStep ? 'Finish tour' : 'Next step'}
              >
                {isLastStep ? 'Done' : 'Next'}
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Keyboard hints footer */}
        <div
          className="px-5 py-2 border-t border-white/5"
          style={{ background: 'rgba(255, 255, 255, 0.02)' }}
        >
          <p className="text-xs text-white/30 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono text-[10px]">
                Enter
              </kbd>
              <span>next</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono text-[10px]">
                Esc
              </kbd>
              <span>skip</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono text-[10px]">
                <span className="inline-flex gap-0.5">
                  <span>&larr;</span>
                  <span>&rarr;</span>
                </span>
              </kbd>
              <span>navigate</span>
            </span>
          </p>
        </div>
      </div>

      {/* Arrow pointer */}
      <div
        className={clsx(
          'absolute w-0 h-0',
          'border-8',
          ARROW_CONFIG[placement]?.position
        )}
        style={{
          borderTopColor: placement === 'bottom' ? 'rgba(15, 15, 20, 0.85)' : 'transparent',
          borderBottomColor: placement === 'top' ? 'rgba(15, 15, 20, 0.85)' : 'transparent',
          borderLeftColor: placement === 'right' ? 'rgba(15, 15, 20, 0.85)' : 'transparent',
          borderRightColor: placement === 'left' ? 'rgba(15, 15, 20, 0.85)' : 'transparent',
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
        }}
        aria-hidden="true"
      />
    </motion.div>
  );
}

/**
 * TourStepSkeleton - Loading state for tour step
 */
export function TourStepSkeleton() {
  return (
    <div
      className="fixed z-[10000] w-80 rounded-2xl p-5"
      style={{
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(15, 15, 20, 0.85)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex gap-1.5 mb-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1.5 w-6 rounded-full bg-white/10 animate-pulse"
          />
        ))}
      </div>
      <div className="h-6 w-32 bg-white/10 rounded animate-pulse mb-3" />
      <div className="space-y-2 mb-5">
        <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
      </div>
      <div className="flex justify-end gap-2">
        <div className="h-10 w-20 bg-white/10 rounded-lg animate-pulse" />
        <div className="h-10 w-20 bg-blue-500/30 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
