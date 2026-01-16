/**
 * Transition Presets - Animation presets for page transitions
 *
 * Provides consistent, accessible animation configurations for page transitions.
 * All presets respect reduced motion preferences and coordinate with the router.
 *
 * @example
 * import { PRESETS, getPresetForDirection } from './transitionPresets';
 *
 * // Get a specific preset
 * const fadePreset = PRESETS.fade;
 *
 * // Get appropriate preset based on navigation direction
 * const preset = getPresetForDirection('forward'); // Returns slideLeft
 */

// ============================================
// SPRING CONFIGURATIONS
// ============================================

/**
 * Default spring configuration for smooth, natural movement
 */
export const DEFAULT_SPRING = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

/**
 * Snappy spring for quick, responsive transitions
 */
export const SNAPPY_SPRING = {
  type: 'spring',
  stiffness: 400,
  damping: 35,
};

/**
 * Gentle spring for slower, more dramatic transitions
 */
export const GENTLE_SPRING = {
  type: 'spring',
  stiffness: 200,
  damping: 25,
};

// ============================================
// TRANSITION PRESETS
// ============================================

/**
 * Page transition presets
 *
 * Each preset contains:
 * - initial: State when entering (opacity, transform)
 * - animate: Target state during transition
 * - exit: State when leaving
 * - transition: Framer Motion transition config
 */
export const PRESETS = {
  /**
   * Fade - Simple opacity transition
   * Best for: Modal backgrounds, overlays, subtle page changes
   */
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },

  /**
   * Slide Left - Content slides in from right, exits to left
   * Best for: Forward navigation (going deeper into app)
   */
  slideLeft: {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -20, opacity: 0 },
    transition: DEFAULT_SPRING,
  },

  /**
   * Slide Right - Content slides in from left, exits to right
   * Best for: Backward navigation (going back)
   */
  slideRight: {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 20, opacity: 0 },
    transition: DEFAULT_SPRING,
  },

  /**
   * Slide Up - Content slides in from bottom
   * Best for: Bottom sheets, modals, detail views
   */
  slideUp: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
    transition: DEFAULT_SPRING,
  },

  /**
   * Slide Down - Content slides in from top
   * Best for: Dropdowns, notifications
   */
  slideDown: {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
    transition: DEFAULT_SPRING,
  },

  /**
   * Scale - Content scales up with fade
   * Best for: Modal dialogs, popups, focus transitions
   */
  scale: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: SNAPPY_SPRING,
  },

  /**
   * Scale Up - More dramatic scale from smaller
   * Best for: Hero sections, featured content
   */
  scaleUp: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
    transition: DEFAULT_SPRING,
  },

  /**
   * Scale Down - Scale from larger (zoom out effect)
   * Best for: Exiting full-screen views
   */
  scaleDown: {
    initial: { scale: 1.05, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.05, opacity: 0 },
    transition: DEFAULT_SPRING,
  },

  /**
   * None - No animation (instant transition)
   * Best for: When reduced motion is preferred
   */
  none: {
    initial: {},
    animate: {},
    exit: {},
    transition: { duration: 0 },
  },

  /**
   * Morph - Used for shared element transitions
   * Best for: Connecting elements between pages
   */
  morph: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 30,
    },
  },

  /**
   * Push Left - Full push animation (like iOS)
   * Content pushes completely off screen
   */
  pushLeft: {
    initial: { x: '100%', opacity: 1 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 1 },
    transition: SNAPPY_SPRING,
  },

  /**
   * Push Right - Full push animation (reverse)
   */
  pushRight: {
    initial: { x: '-100%', opacity: 1 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 1 },
    transition: SNAPPY_SPRING,
  },

  /**
   * Cover Up - Content covers current content from bottom
   * Best for: Modal sheets, action sheets
   */
  coverUp: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
    transition: SNAPPY_SPRING,
  },

  /**
   * Reveal - Fade with slight zoom for revealing content
   */
  reveal: {
    initial: { scale: 0.98, opacity: 0, y: 10 },
    animate: { scale: 1, opacity: 1, y: 0 },
    exit: { scale: 0.98, opacity: 0, y: -10 },
    transition: GENTLE_SPRING,
  },
};

// ============================================
// REDUCED MOTION VERSIONS
// ============================================

/**
 * Reduced motion versions of all presets
 * Use these when user prefers reduced motion
 */
export const REDUCED_MOTION_PRESETS = {
  fade: PRESETS.fade,
  slideLeft: { ...PRESETS.fade, transition: { duration: 0.15 } },
  slideRight: { ...PRESETS.fade, transition: { duration: 0.15 } },
  slideUp: { ...PRESETS.fade, transition: { duration: 0.15 } },
  slideDown: { ...PRESETS.fade, transition: { duration: 0.15 } },
  scale: { ...PRESETS.fade, transition: { duration: 0.15 } },
  scaleUp: { ...PRESETS.fade, transition: { duration: 0.15 } },
  scaleDown: { ...PRESETS.fade, transition: { duration: 0.15 } },
  none: PRESETS.none,
  morph: { ...PRESETS.fade, transition: { duration: 0.15 } },
  pushLeft: { ...PRESETS.fade, transition: { duration: 0.15 } },
  pushRight: { ...PRESETS.fade, transition: { duration: 0.15 } },
  coverUp: { ...PRESETS.fade, transition: { duration: 0.15 } },
  reveal: { ...PRESETS.fade, transition: { duration: 0.15 } },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get appropriate preset based on navigation direction
 *
 * @param {'forward' | 'back' | 'up' | 'down' | 'replace'} direction - Navigation direction
 * @returns {Object} Preset configuration
 *
 * @example
 * const preset = getPresetForDirection('forward');
 * // Returns PRESETS.slideLeft
 */
export function getPresetForDirection(direction) {
  switch (direction) {
    case 'forward':
      return PRESETS.slideLeft;
    case 'back':
      return PRESETS.slideRight;
    case 'up':
      return PRESETS.slideUp;
    case 'down':
      return PRESETS.slideDown;
    case 'replace':
      return PRESETS.fade;
    default:
      return PRESETS.fade;
  }
}

/**
 * Get preset with reduced motion fallback
 *
 * @param {string} presetName - Name of the preset
 * @param {boolean} reducedMotion - Whether reduced motion is preferred
 * @returns {Object} Preset configuration
 */
export function getPreset(presetName, reducedMotion = false) {
  if (reducedMotion) {
    return REDUCED_MOTION_PRESETS[presetName] || REDUCED_MOTION_PRESETS.fade;
  }
  return PRESETS[presetName] || PRESETS.fade;
}

/**
 * Create custom preset with duration override
 *
 * @param {string} presetName - Base preset name
 * @param {number} duration - Custom duration in ms
 * @param {boolean} reducedMotion - Whether reduced motion is preferred
 * @returns {Object} Modified preset configuration
 */
export function createCustomPreset(presetName, duration, reducedMotion = false) {
  const basePreset = getPreset(presetName, reducedMotion);

  // Convert ms to seconds for Framer Motion
  const durationInSeconds = duration / 1000;

  return {
    ...basePreset,
    transition: {
      ...basePreset.transition,
      duration: reducedMotion ? 0 : durationInSeconds,
    },
  };
}

/**
 * Merge custom transition config with preset
 *
 * @param {string} presetName - Base preset name
 * @param {Object} customTransition - Custom transition overrides
 * @param {boolean} reducedMotion - Whether reduced motion is preferred
 * @returns {Object} Merged preset configuration
 */
export function mergePresetWithTransition(presetName, customTransition, reducedMotion = false) {
  const basePreset = getPreset(presetName, reducedMotion);

  if (reducedMotion) {
    return basePreset;
  }

  return {
    ...basePreset,
    transition: {
      ...basePreset.transition,
      ...customTransition,
    },
  };
}

/**
 * Get exit preset with custom direction
 * Useful when exit direction should differ from enter
 *
 * @param {string} enterPreset - Preset used for entering
 * @param {string} exitDirection - Direction for exit ('left' | 'right' | 'up' | 'down')
 * @returns {Object} Modified preset with custom exit
 */
export function getPresetWithCustomExit(enterPreset, exitDirection) {
  const base = PRESETS[enterPreset] || PRESETS.fade;

  const exitMap = {
    left: { x: -20, opacity: 0 },
    right: { x: 20, opacity: 0 },
    up: { y: -20, opacity: 0 },
    down: { y: 20, opacity: 0 },
  };

  return {
    ...base,
    exit: exitMap[exitDirection] || base.exit,
  };
}

// ============================================
// LAYOUT TRANSITION CONFIGS
// ============================================

/**
 * Layout transition configurations for shared elements
 */
export const LAYOUT_TRANSITIONS = {
  /**
   * Default layout transition for shared elements
   */
  default: {
    type: 'spring',
    stiffness: 350,
    damping: 30,
  },

  /**
   * Smooth layout transition for larger elements
   */
  smooth: {
    type: 'spring',
    stiffness: 250,
    damping: 25,
    mass: 0.8,
  },

  /**
   * Snappy layout transition for small elements
   */
  snappy: {
    type: 'spring',
    stiffness: 500,
    damping: 35,
  },

  /**
   * Reduced motion layout transition
   */
  reduced: {
    duration: 0.15,
    ease: 'easeOut',
  },
};

export default {
  PRESETS,
  REDUCED_MOTION_PRESETS,
  LAYOUT_TRANSITIONS,
  DEFAULT_SPRING,
  SNAPPY_SPRING,
  GENTLE_SPRING,
  getPresetForDirection,
  getPreset,
  createCustomPreset,
  mergePresetWithTransition,
  getPresetWithCustomExit,
};
