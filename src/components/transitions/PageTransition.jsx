/**
 * PageTransition - Wrapper for animated page transitions
 *
 * Provides smooth entrance and exit animations for page content.
 * Supports multiple animation variants and respects reduced motion preferences.
 *
 * @example
 * // Basic usage with default fade
 * <PageTransition>
 *   <YourPageContent />
 * </PageTransition>
 *
 * // With specific variant
 * <PageTransition variant="slideUp" duration={400}>
 *   <ProfilePage />
 * </PageTransition>
 *
 * // Direction-aware (slides based on navigation direction)
 * <PageTransition variant="slide" directionAware>
 *   <Content />
 * </PageTransition>
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTransitionContext } from './TransitionProvider';

// ============================================
// ANIMATION VARIANTS
// ============================================

/**
 * Animation variants for page transitions
 * Each variant defines initial, animate, and exit states
 */
const PAGE_VARIANTS = {
  // Simple fade in/out
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  // Slide from left with fade
  slide: {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 20, opacity: 0 },
  },

  // Slide from right with fade (reverse of slide)
  slideBack: {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -20, opacity: 0 },
  },

  // Slide up from bottom with fade
  slideUp: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
  },

  // Slide down from top with fade
  slideDown: {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
  },

  // Scale up with fade
  scale: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
  },

  // Scale down from larger
  scaleDown: {
    initial: { scale: 1.05, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.05, opacity: 0 },
  },

  // Zoom in with blur (modal-like)
  zoom: {
    initial: { scale: 0.9, opacity: 0, filter: 'blur(4px)' },
    animate: { scale: 1, opacity: 1, filter: 'blur(0px)' },
    exit: { scale: 0.9, opacity: 0, filter: 'blur(4px)' },
  },

  // No animation (for reduced motion or instant transitions)
  none: {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    exit: { opacity: 1 },
  },
};

// Direction-aware variants (adapt based on navigation direction)
const DIRECTION_AWARE_VARIANTS = {
  slide: {
    forward: PAGE_VARIANTS.slide,
    back: PAGE_VARIANTS.slideBack,
  },
  slideVertical: {
    forward: PAGE_VARIANTS.slideUp,
    back: PAGE_VARIANTS.slideDown,
  },
  scale: {
    forward: PAGE_VARIANTS.scale,
    back: PAGE_VARIANTS.scaleDown,
  },
};

// ============================================
// TRANSITION CONFIGS
// ============================================

/**
 * Transition configurations for different animation types
 */
const TRANSITION_PRESETS = {
  // Smooth spring animation
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  },

  // Quick tween animation
  tween: {
    type: 'tween',
    ease: [0.25, 0.1, 0.25, 1], // cubic-bezier
    duration: 0.3,
  },

  // Bouncy spring
  bouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
  },

  // Gentle ease
  gentle: {
    type: 'tween',
    ease: 'easeInOut',
    duration: 0.4,
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Convert duration from ms to seconds for Framer Motion
 */
function msToSeconds(ms) {
  return ms / 1000;
}

// ============================================
// PAGE TRANSITION COMPONENT
// ============================================

/**
 * PageTransition - Animated wrapper for page content
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content to animate
 * @param {'fade' | 'slide' | 'slideUp' | 'slideDown' | 'scale' | 'scaleDown' | 'zoom' | 'none'} props.variant - Animation variant
 * @param {number} props.duration - Animation duration in milliseconds
 * @param {number} props.delay - Animation delay in milliseconds
 * @param {boolean} props.directionAware - Adapt animation based on navigation direction
 * @param {'spring' | 'tween' | 'bouncy' | 'gentle'} props.transitionType - Type of transition
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 * @param {Function} props.onAnimationStart - Callback when animation starts
 * @param {Function} props.onAnimationComplete - Callback when animation completes
 */
function PageTransition({
  children,
  variant = 'fade',
  duration = 300,
  delay = 0,
  directionAware = false,
  transitionType = 'spring',
  className = '',
  style = {},
  onAnimationStart,
  onAnimationComplete,
}) {
  // Try to get context, but don't fail if not available
  let contextDirection = 'forward';
  try {
    const context = useTransitionContext();
    contextDirection = context?.direction || 'forward';
  } catch {
    // Context not available, use default direction
  }

  // Check for reduced motion preference
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  // Get the appropriate variant
  const selectedVariant = useMemo(() => {
    // Use no animation for reduced motion
    if (reducedMotion) {
      return PAGE_VARIANTS.none;
    }

    // Direction-aware variants
    if (directionAware && DIRECTION_AWARE_VARIANTS[variant]) {
      return DIRECTION_AWARE_VARIANTS[variant][contextDirection] || PAGE_VARIANTS[variant];
    }

    // Standard variants
    return PAGE_VARIANTS[variant] || PAGE_VARIANTS.fade;
  }, [variant, directionAware, contextDirection, reducedMotion]);

  // Build transition config
  const transition = useMemo(() => {
    const preset = TRANSITION_PRESETS[transitionType] || TRANSITION_PRESETS.spring;

    // Override duration if using tween
    if (preset.type === 'tween') {
      return {
        ...preset,
        duration: msToSeconds(duration),
        delay: msToSeconds(delay),
      };
    }

    // For spring, duration is a hint (stiffness/damping control actual speed)
    return {
      ...preset,
      delay: msToSeconds(delay),
    };
  }, [transitionType, duration, delay]);

  return (
    <motion.div
      className={`page-transition ${className}`.trim()}
      style={{
        willChange: 'transform, opacity',
        ...style,
      }}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={selectedVariant}
      transition={transition}
      onAnimationStart={onAnimationStart}
      onAnimationComplete={onAnimationComplete}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// PRESET PAGE TRANSITIONS
// ============================================

/**
 * FadeTransition - Simple fade in/out
 */
export function FadeTransition({ children, ...props }) {
  return (
    <PageTransition variant="fade" {...props}>
      {children}
    </PageTransition>
  );
}

/**
 * SlideTransition - Horizontal slide with fade
 */
export function SlideTransition({ children, directionAware = true, ...props }) {
  return (
    <PageTransition variant="slide" directionAware={directionAware} {...props}>
      {children}
    </PageTransition>
  );
}

/**
 * SlideUpTransition - Slide up from bottom
 */
export function SlideUpTransition({ children, ...props }) {
  return (
    <PageTransition variant="slideUp" {...props}>
      {children}
    </PageTransition>
  );
}

/**
 * ScaleTransition - Scale up with fade
 */
export function ScaleTransition({ children, ...props }) {
  return (
    <PageTransition variant="scale" {...props}>
      {children}
    </PageTransition>
  );
}

/**
 * ZoomTransition - Zoom with blur (modal-like)
 */
export function ZoomTransition({ children, ...props }) {
  return (
    <PageTransition variant="zoom" transitionType="gentle" {...props}>
      {children}
    </PageTransition>
  );
}

// ============================================
// EXPORTS
// ============================================

export {
  PAGE_VARIANTS,
  TRANSITION_PRESETS,
  DIRECTION_AWARE_VARIANTS,
};

export default PageTransition;
