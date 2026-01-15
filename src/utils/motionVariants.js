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
 * 4. Use transition presets (spring, bounce, smooth) for consistent timing
 *
 * @example
 * import { getMotionVariant, safeTransition, transitionPresets } from '@/utils/motionVariants';
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
 *
 * // Use stagger containers for lists
 * <motion.ul variants={staggerChildren(reducedMotion)} initial="hidden" animate="visible">
 *   {items.map(item => (
 *     <motion.li key={item.id} variants={staggerItem(reducedMotion)}>
 *       {item.name}
 *     </motion.li>
 *   ))}
 * </motion.ul>
 */

// ============================================
// TRANSITION PRESETS
// ============================================

/**
 * Transition presets for consistent animation timing across the app.
 * Each preset has a full and reduced motion version.
 */
export const transitionPresets = {
  /** Spring - bouncy, natural movement for interactive elements */
  spring: (reducedMotion) => reducedMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 300, damping: 25 },

  /** Bounce - extra bouncy for celebratory/playful animations */
  bounce: (reducedMotion) => reducedMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 400, damping: 10 },

  /** Smooth - gentle easing for subtle transitions */
  smooth: (reducedMotion) => reducedMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: [0.4, 0, 0.2, 1] },

  /** Quick - fast transitions for micro-interactions */
  quick: (reducedMotion) => reducedMotion
    ? { duration: 0 }
    : { duration: 0.15, ease: 'easeOut' },

  /** Snappy - crisp spring for buttons and toggles */
  snappy: (reducedMotion) => reducedMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 500, damping: 30 },

  /** Gentle - slow and smooth for page transitions */
  gentle: (reducedMotion) => reducedMotion
    ? { duration: 0 }
    : { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },

  /** Elastic - very bouncy for attention-grabbing animations */
  elastic: (reducedMotion) => reducedMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 200, damping: 8, mass: 0.8 },
};

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
   * Slide in from left (alias with better naming)
   */
  slideInLeft: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, x: -30 },
    animate: { opacity: 1, x: 0 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, x: -30 },
    transition: reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 },
  }),

  /**
   * Slide in from right (alias with better naming)
   */
  slideInRight: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, x: 30 },
    transition: reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 },
  }),

  /**
   * Slide in from top
   */
  slideInUp: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, y: -30 },
    animate: { opacity: 1, y: 0 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, y: -30 },
    transition: reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 },
  }),

  /**
   * Slide in from bottom
   */
  slideInDown: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 30 },
    transition: reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 },
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
   * Scale in - zoom in from small
   */
  scaleIn: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 },
    transition: reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 },
  }),

  /**
   * Scale out - zoom out to small
   */
  scaleOut: (reducedMotion) => ({
    initial: { opacity: 1, scale: 1 },
    animate: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 },
    transition: reducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeIn' },
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

  /**
   * Burst animation - for reactions and celebrations
   * Creates outward expansion effect
   */
  burst: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.3 },
    animate: { opacity: 1, scale: 1 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.5 },
    transition: reducedMotion
      ? { duration: 0 }
      : { type: 'spring', stiffness: 400, damping: 15 },
  }),

  /**
   * Bounce in - playful entrance for notifications
   */
  bounceIn: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.3, y: -20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.3, y: 20 },
    transition: reducedMotion
      ? { duration: 0 }
      : { type: 'spring', stiffness: 400, damping: 10 },
  }),

  /**
   * Wiggle animation - for attention/error states
   */
  wiggle: (reducedMotion) => ({
    animate: reducedMotion
      ? {}
      : {
          rotate: [0, -3, 3, -3, 3, 0],
        },
    transition: reducedMotion
      ? { duration: 0 }
      : {
          duration: 0.5,
          ease: 'easeInOut',
        },
  }),

  /**
   * Flip animation - for card flip effects
   */
  flipIn: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, rotateY: -90 },
    animate: { opacity: 1, rotateY: 0 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, rotateY: 90 },
    transition: reducedMotion ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' },
  }),

  /**
   * Swing animation - pendulum-like entrance
   */
  swing: (reducedMotion) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, rotate: -15, transformOrigin: 'top center' },
    animate: { opacity: 1, rotate: 0, transformOrigin: 'top center' },
    transition: reducedMotion
      ? { duration: 0 }
      : { type: 'spring', stiffness: 200, damping: 12 },
  }),
};

// ============================================
// STAGGER CHILDREN VARIANTS
// ============================================

/**
 * Create container variants for staggered children animations.
 * Use with motion.ul/motion.div as parent container.
 *
 * @param {boolean} reducedMotion - Whether reduced motion is preferred
 * @param {Object} options - Configuration options
 * @param {number} options.staggerDelay - Delay between children (default: 0.05)
 * @param {number} options.delayChildren - Initial delay before first child (default: 0.1)
 * @returns {Object} Container variants
 *
 * @example
 * <motion.ul variants={staggerChildren(reducedMotion)} initial="hidden" animate="visible">
 *   {items.map(item => (
 *     <motion.li key={item.id} variants={staggerItem(reducedMotion)}>
 *       {item.name}
 *     </motion.li>
 *   ))}
 * </motion.ul>
 */
export function staggerChildren(reducedMotion, { staggerDelay = 0.05, delayChildren = 0.1 } = {}) {
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
        delayChildren,
      },
    },
  };
}

/**
 * Child item variants for use with staggerChildren container
 *
 * @param {boolean} reducedMotion - Whether reduced motion is preferred
 * @param {string} direction - Direction to animate from ('up' | 'down' | 'left' | 'right')
 * @returns {Object} Child variants
 */
export function staggerItem(reducedMotion, direction = 'up') {
  if (reducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0 } },
    };
  }

  const directionMap = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  };

  const offset = directionMap[direction] || directionMap.up;

  return {
    hidden: { opacity: 0, ...offset },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
      },
    },
  };
}

/**
 * Reverse stagger - animate children from last to first
 */
export function reverseStaggerChildren(reducedMotion, { staggerDelay = 0.05, delayChildren = 0.1 } = {}) {
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
        staggerDirection: -1,
        delayChildren,
      },
    },
  };
}

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

// ============================================
// NAMED VARIANT EXPORTS (for convenience)
// ============================================

/**
 * Convenience exports matching the requested names
 */
export const fadeIn = safeVariants.fadeIn;
export const fadeOut = safeVariants.fadeOut;
export const slideInLeft = safeVariants.slideInLeft;
export const slideInRight = safeVariants.slideInRight;
export const slideInUp = safeVariants.slideInUp;
export const slideInDown = safeVariants.slideInDown;
export const scaleIn = safeVariants.scaleIn;
export const scaleOut = safeVariants.scaleOut;
export const burst = safeVariants.burst;
export const bounceIn = safeVariants.bounceIn;

/**
 * Preset shortcuts
 */
export const spring = transitionPresets.spring;
export const bounce = transitionPresets.bounce;
export const smooth = transitionPresets.smooth;

export default {
  // Variants
  safeVariants,
  // Transition helpers
  safeTransition,
  safeSpring,
  transitionPresets,
  // Variant getters
  getMotionVariant,
  createSafeVariant,
  getInteractionVariants,
  // Stagger helpers
  getStaggerContainerVariants,
  getStaggerChildVariants,
  staggerChildren,
  staggerItem,
  reverseStaggerChildren,
  // Presets
  animationPresets,
  // Named exports
  fadeIn,
  fadeOut,
  slideInLeft,
  slideInRight,
  slideInUp,
  slideInDown,
  scaleIn,
  scaleOut,
  burst,
  bounceIn,
  spring,
  bounce,
  smooth,
};
