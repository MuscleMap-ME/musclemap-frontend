/**
 * Motion Variants - Safe animation variants that respect reduced motion
 *
 * This module provides pre-built animation variants for Framer Motion
 * that automatically adapt to the user's reduced motion preference.
 *
 * Key principles:
 * - With reduced motion: Instant transitions (duration: 0) or simple opacity changes
 * - With full motion: Rich animations with transforms, springs, and delays
 *
 * Usage:
 * 1. Use getMotionVariant() for simple cases
 * 2. Use safeVariants directly for more control
 * 3. Use createSafeVariant() for custom animations
 *
 * @example
 * import { getMotionVariant, safeTransition } from '@/utils/motionVariants';
 *
 * // Get a variant for fade in animation
 * const variant = getMotionVariant('fadeIn', reducedMotion);
 *
 * <motion.div {...variant}>
 *   Content
 * </motion.div>
 *
 * // Or use with Framer Motion variants directly
 * <motion.div
 *   initial={safeVariants.slideUp(reducedMotion).initial}
 *   animate={safeVariants.slideUp(reducedMotion).animate}
 * >
 *   Content
 * </motion.div>
 */

// ============================================
// TRANSITION HELPERS
// ============================================

/**
 * Get a safe transition configuration based on reduced motion preference
 *
 * @param {boolean} reducedMotion - Whether reduced motion is preferred
 * @param {Object} fullMotionTransition - Transition to use with full motion
 * @returns {Object} Safe transition configuration
 */
export function safeTransition(reducedMotion, fullMotionTransition = {}) {
  if (reducedMotion) {
    return { duration: 0 };
  }
  return {
    duration: 0.3,
    ease: 'easeOut',
    ...fullMotionTransition,
  };
}

/**
 * Get a safe spring transition
 *
 * @param {boolean} reducedMotion - Whether reduced motion is preferred
 * @param {Object} springConfig - Spring configuration for full motion
 * @returns {Object} Safe spring transition
 */
export function safeSpring(reducedMotion, springConfig = {}) {
  if (reducedMotion) {
    return { duration: 0 };
  }
  return {
    type: 'spring',
    stiffness: 300,
    damping: 25,
    ...springConfig,
  };
}

// ============================================
// SAFE VARIANTS
// ============================================

/**
 * Pre-built safe animation variants
 *
 * Each variant is a function that takes reducedMotion boolean
 * and returns a Framer Motion variant configuration.
 */
export const safeVariants = {
  /**
   * Fade in animation
   * Reduced: Instant opacity change
   * Full: Smooth opacity transition
   */
  fadeIn: (reducedMotion) => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: reducedMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' },
  }),

  /**
   * Fade out animation
   */
  fadeOut: (reducedMotion) => ({
    initial: { opacity: 1 },
    animate: { opacity: 0 },
    transition: reducedMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeIn' },
  }),

  /**
   * Slide up animation
   * Reduced: Instant opacity only
   * Full: Slide up with opacity
   */
  slideUp: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 },
    transition: reducedMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' },
  }),

  /**
   * Slide down animation
   */
  slideDown: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
    transition: reducedMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' },
  }),

  /**
   * Slide in from left
   */
  slideLeft: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, x: 20 },
    transition: reducedMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' },
  }),

  /**
   * Slide in from right
   */
  slideRight: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, x: -20 },
    transition: reducedMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' },
  }),

  /**
   * Scale animation
   * Reduced: Instant opacity only
   * Full: Scale with opacity
   */
  scale: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 },
    transition: reducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' },
  }),

  /**
   * Scale up (zoom in) animation
   */
  scaleUp: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 },
    transition: reducedMotion
      ? { duration: 0 }
      : { type: 'spring', stiffness: 300, damping: 25 },
  }),

  /**
   * Scale down (zoom out) animation
   */
  scaleDown: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.1 },
    animate: { opacity: 1, scale: 1 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.1 },
    transition: reducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' },
  }),

  /**
   * Pop animation (spring scale)
   * Reduced: Instant
   * Full: Bouncy spring effect
   */
  pop: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 },
    transition: reducedMotion
      ? { duration: 0 }
      : { type: 'spring', stiffness: 400, damping: 15 },
  }),

  /**
   * Modal/dialog animation
   * Reduced: Instant opacity
   * Full: Scale + fade
   */
  modal: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 },
    transition: reducedMotion
      ? { duration: 0 }
      : { type: 'spring', stiffness: 300, damping: 25 },
  }),

  /**
   * Toast notification animation
   */
  toast: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.95 },
    transition: reducedMotion
      ? { duration: 0 }
      : { type: 'spring', stiffness: 400, damping: 25 },
  }),

  /**
   * Backdrop/overlay animation
   */
  backdrop: (reducedMotion) => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: reducedMotion ? { duration: 0 } : { duration: 0.2 },
  }),

  /**
   * List item stagger animation
   */
  listItem: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 },
    transition: reducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' },
  }),

  /**
   * Card reveal animation
   */
  card: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 },
    transition: reducedMotion
      ? { duration: 0 }
      : { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  }),

  /**
   * Progress bar fill animation
   * Reduced: Instant fill
   * Full: Animated fill with spring
   */
  progress: (reducedMotion) => ({
    initial: { scaleX: 0, originX: 0 },
    animate: { scaleX: 1 },
    transition: reducedMotion
      ? { duration: 0 }
      : { type: 'spring', stiffness: 100, damping: 20 },
  }),

  /**
   * Rotation animation (e.g., for spinners)
   * Reduced: No animation
   * Full: Continuous rotation
   */
  rotate: (reducedMotion) => ({
    animate: reducedMotion
      ? {}
      : {
          rotate: 360,
        },
    transition: reducedMotion
      ? { duration: 0 }
      : {
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        },
  }),

  /**
   * Pulse animation (attention getter)
   * Reduced: No animation
   * Full: Subtle scale pulse
   */
  pulse: (reducedMotion) => ({
    animate: reducedMotion
      ? {}
      : {
          scale: [1, 1.02, 1],
        },
    transition: reducedMotion
      ? { duration: 0 }
      : {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
  }),

  /**
   * Shake animation (error feedback)
   * Reduced: No animation
   * Full: Horizontal shake
   */
  shake: (reducedMotion) => ({
    animate: reducedMotion
      ? {}
      : {
          x: [0, -4, 4, -4, 4, 0],
        },
    transition: reducedMotion
      ? { duration: 0 }
      : {
          duration: 0.5,
          ease: 'easeInOut',
        },
  }),

  /**
   * Float animation (idle state)
   * Reduced: No animation
   * Full: Gentle vertical float
   */
  float: (reducedMotion) => ({
    animate: reducedMotion
      ? {}
      : {
          y: [0, -5, 0],
        },
    transition: reducedMotion
      ? { duration: 0 }
      : {
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        },
  }),

  /**
   * Glow animation (attention/highlight)
   * Reduced: Static state
   * Full: Pulsing opacity/shadow
   */
  glow: (reducedMotion) => ({
    animate: reducedMotion
      ? {}
      : {
          opacity: [0.5, 1, 0.5],
        },
    transition: reducedMotion
      ? { duration: 0 }
      : {
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
  }),
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a motion variant by name
 *
 * @param {string} name - Variant name (e.g., 'fadeIn', 'slideUp')
 * @param {boolean} reducedMotion - Whether reduced motion is preferred
 * @returns {Object} Framer Motion variant configuration
 *
 * @example
 * const variant = getMotionVariant('fadeIn', shouldReduceMotion);
 * <motion.div {...variant}>Content</motion.div>
 */
export function getMotionVariant(name, reducedMotion) {
  if (safeVariants[name]) {
    return safeVariants[name](reducedMotion);
  }
  // Fallback to fadeIn if variant not found
  console.warn(`Motion variant "${name}" not found, using fadeIn`);
  return safeVariants.fadeIn(reducedMotion);
}

/**
 * Create a custom safe variant
 *
 * @param {Object} fullMotion - Animation for full motion
 * @param {Object} reducedMotion - Animation for reduced motion (default: opacity only)
 * @returns {Function} Variant function
 *
 * @example
 * const customVariant = createSafeVariant(
 *   { initial: { opacity: 0, y: 50 }, animate: { opacity: 1, y: 0 } },
 *   { initial: { opacity: 0 }, animate: { opacity: 1 } }
 * );
 */
export function createSafeVariant(fullMotionConfig, reducedMotionConfig) {
  return (shouldReduceMotion) => {
    if (shouldReduceMotion) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0 },
        ...reducedMotionConfig,
      };
    }
    return {
      transition: { duration: 0.3, ease: 'easeOut' },
      ...fullMotionConfig,
    };
  };
}

/**
 * Get hover/tap variants that respect reduced motion
 *
 * @param {boolean} reducedMotion - Whether reduced motion is preferred
 * @returns {Object} whileHover and whileTap variants
 */
export function getInteractionVariants(reducedMotion) {
  if (reducedMotion) {
    return {
      whileHover: {},
      whileTap: {},
    };
  }
  return {
    whileHover: { scale: 1.02, y: -1 },
    whileTap: { scale: 0.98 },
  };
}

/**
 * Get container variants for staggered children
 *
 * @param {boolean} reducedMotion - Whether reduced motion is preferred
 * @param {number} staggerDelay - Delay between children (default: 0.05)
 * @returns {Object} Container variants
 */
export function getStaggerContainerVariants(reducedMotion, staggerDelay = 0.05) {
  if (reducedMotion) {
    return {
      hidden: {},
      visible: {},
    };
  }
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };
}

/**
 * Get stagger child variants
 *
 * @param {boolean} reducedMotion - Whether reduced motion is preferred
 * @returns {Object} Child variants for stagger animation
 */
export function getStaggerChildVariants(reducedMotion) {
  return safeVariants.listItem(reducedMotion);
}

// ============================================
// ANIMATION PRESETS
// ============================================

/**
 * Common animation presets combining variants + transition settings
 */
export const animationPresets = {
  /** Page transition */
  page: (reducedMotion) => ({
    ...safeVariants.fadeIn(reducedMotion),
    transition: safeTransition(reducedMotion, { duration: 0.3 }),
  }),

  /** Quick fade for micro-interactions */
  quick: (reducedMotion) => ({
    ...safeVariants.fadeIn(reducedMotion),
    transition: safeTransition(reducedMotion, { duration: 0.15 }),
  }),

  /** Slow, dramatic reveal */
  dramatic: (reducedMotion) => ({
    ...safeVariants.scaleUp(reducedMotion),
    transition: safeTransition(reducedMotion, { duration: 0.5, ease: [0.4, 0, 0.2, 1] }),
  }),
};

export default {
  safeVariants,
  safeTransition,
  safeSpring,
  getMotionVariant,
  createSafeVariant,
  getInteractionVariants,
  getStaggerContainerVariants,
  getStaggerChildVariants,
  animationPresets,
};
