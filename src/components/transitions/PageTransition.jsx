/**
 * PageTransition - Wrapper for animated page transitions
 *
 * Provides smooth entrance and exit animations for page content.
 * Supports multiple animation variants and respects reduced motion preferences.
 *
 * Features:
 * - Multiple transition types (fade, slide, scale, zoom)
 * - Direction-aware animations (slides based on navigation direction)
 * - Configurable duration and easing
 * - Respects prefers-reduced-motion
 * - Spring and tween transition presets
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
import { useMotionAllowed } from '../../contexts/MotionContext';

// Try to import context, handle case where it's not available
let useTransitionContext;
try {
  useTransitionContext = require('./TransitionProvider').useTransitionContext;
} catch {
  useTransitionContext = () => null;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

/**
 * Animation variants for page transitions
 * Each variant defines initial, animate, and exit states
 */
export const PAGE_VARIANTS = {
  // Simple fade in/out
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  // Slide from left with fade
  slide: {
    initial: { x: -30, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 30, opacity: 0 },
  },

  // Slide from right with fade (reverse of slide)
  slideBack: {
    initial: { x: 30, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -30, opacity: 0 },
  },

  // Slide from right (forward navigation)
  slideRight: {
    initial: { x: 50, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  },

  // Slide from left (back navigation)
  slideLeft: {
    initial: { x: -50, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 50, opacity: 0 },
  },

  // Slide up from bottom with fade
  slideUp: {
    initial: { y: 30, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
  },

  // Slide down from top with fade
  slideDown: {
    initial: { y: -30, opacity: 0 },
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

  // Reveal from bottom (drawer-like)
  reveal: {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0 },
  },

  // Flip horizontal
  flip: {
    initial: { rotateY: 90, opacity: 0 },
    animate: { rotateY: 0, opacity: 1 },
    exit: { rotateY: -90, opacity: 0 },
  },

  // No animation (for reduced motion or instant transitions)
  none: {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    exit: { opacity: 1 },
  },
};

// Direction-aware variants (adapt based on navigation direction)
export const DIRECTION_AWARE_VARIANTS = {
  slide: {
    forward: PAGE_VARIANTS.slideRight,
    back: PAGE_VARIANTS.slideLeft,
    same: PAGE_VARIANTS.fade,
  },
  slideVertical: {
    forward: PAGE_VARIANTS.slideUp,
    back: PAGE_VARIANTS.slideDown,
    same: PAGE_VARIANTS.fade,
  },
  scale: {
    forward: PAGE_VARIANTS.scale,
    back: PAGE_VARIANTS.scaleDown,
    same: PAGE_VARIANTS.fade,
  },
};

// ============================================
// TRANSITION CONFIGS
// ============================================

/**
 * Transition configurations for different animation types
 */
export const TRANSITION_PRESETS = {
  // Smooth spring animation
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  },

  // Snappy spring
  snappy: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
    mass: 0.6,
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
    damping: 20,
    mass: 0.8,
  },

  // Gentle ease
  gentle: {
    type: 'tween',
    ease: 'easeInOut',
    duration: 0.4,
  },

  // Quick ease
  quick: {
    type: 'tween',
    ease: [0.4, 0, 0.2, 1],
    duration: 0.2,
  },

  // Anticipate (slight overshoot)
  anticipate: {
    type: 'spring',
    stiffness: 200,
    damping: 15,
    mass: 1,
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

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
 * @param {'fade' | 'slide' | 'slideUp' | 'slideDown' | 'scale' | 'scaleDown' | 'zoom' | 'reveal' | 'flip' | 'none'} props.variant - Animation variant
 * @param {number} props.duration - Animation duration in milliseconds
 * @param {number} props.delay - Animation delay in milliseconds
 * @param {boolean} props.directionAware - Adapt animation based on navigation direction
 * @param {'spring' | 'snappy' | 'tween' | 'bouncy' | 'gentle' | 'quick' | 'anticipate'} props.transitionType - Type of transition
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
  // Check motion preference
  const motionAllowed = useMotionAllowed();

  // Try to get context, but don't fail if not available
  let contextDirection = 'forward';
  try {
    const context = useTransitionContext();
    contextDirection = context?.direction || 'forward';
  } catch {
    // Context not available, use default direction
  }

  // Get the appropriate variant
  const selectedVariant = useMemo(() => {
    // Use no animation for reduced motion
    if (!motionAllowed) {
      return PAGE_VARIANTS.none;
    }

    // Direction-aware variants
    if (directionAware && DIRECTION_AWARE_VARIANTS[variant]) {
      return DIRECTION_AWARE_VARIANTS[variant][contextDirection] || PAGE_VARIANTS[variant];
    }

    // Standard variants
    return PAGE_VARIANTS[variant] || PAGE_VARIANTS.fade;
  }, [variant, directionAware, contextDirection, motionAllowed]);

  // Build transition config
  const transition = useMemo(() => {
    if (!motionAllowed) {
      return { duration: 0 };
    }

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
  }, [transitionType, duration, delay, motionAllowed]);

  return (
    <motion.div
      className={`page-transition ${className}`.trim()}
      style={{
        willChange: motionAllowed ? 'transform, opacity' : 'auto',
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
    <PageTransition variant="fade" transitionType="gentle" {...props}>
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
    <PageTransition variant="slideUp" transitionType="spring" {...props}>
      {children}
    </PageTransition>
  );
}

/**
 * SlideDownTransition - Slide down from top
 */
export function SlideDownTransition({ children, ...props }) {
  return (
    <PageTransition variant="slideDown" transitionType="spring" {...props}>
      {children}
    </PageTransition>
  );
}

/**
 * ScaleTransition - Scale up with fade
 */
export function ScaleTransition({ children, directionAware = false, ...props }) {
  return (
    <PageTransition variant="scale" directionAware={directionAware} transitionType="snappy" {...props}>
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

/**
 * RevealTransition - Reveal from bottom (drawer-like)
 */
export function RevealTransition({ children, ...props }) {
  return (
    <PageTransition variant="reveal" transitionType="spring" {...props}>
      {children}
    </PageTransition>
  );
}

/**
 * FlipTransition - Horizontal flip
 */
export function FlipTransition({ children, ...props }) {
  return (
    <PageTransition variant="flip" transitionType="anticipate" {...props}>
      {children}
    </PageTransition>
  );
}

/**
 * NoTransition - No animation wrapper (for reduced motion or instant)
 */
export function NoTransition({ children, className = '', style = {} }) {
  return (
    <div className={`page-transition ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

// ============================================
// EXPORTS
// ============================================

export default PageTransition;
