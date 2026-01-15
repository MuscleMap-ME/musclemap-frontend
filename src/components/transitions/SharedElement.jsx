/**
 * SharedElement - Element that morphs between pages
 *
 * Wraps an element to enable smooth morphing animations when the same
 * SharedElement (identified by id) appears on different pages. Uses
 * Framer Motion's layoutId for automatic morphing.
 *
 * Features:
 * - Automatic morphing between pages using layoutId
 * - Configurable spring/tween transitions
 * - Multiple presets for common use cases
 * - Graceful fallback when context not available
 * - Respects reduced motion preferences
 *
 * Common use cases:
 * - Avatar that grows from header to profile page
 * - Card that expands to full detail view
 * - Icon that moves to new position
 * - Exercise card that expands to exercise detail
 *
 * @example
 * // In list view (small card)
 * <SharedElement id={`exercise-${exercise.id}`}>
 *   <ExerciseCard exercise={exercise} />
 * </SharedElement>
 *
 * // In detail view (expanded)
 * <SharedElement id={`exercise-${exerciseId}`}>
 *   <ExerciseHeader exercise={exercise} />
 * </SharedElement>
 *
 * // With custom transition
 * <SharedElement
 *   id="workout-card"
 *   transition={{ type: 'spring', stiffness: 300, damping: 30 }}
 * >
 *   <WorkoutCard />
 * </SharedElement>
 */

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMotionAllowed } from '../../contexts/MotionContext';

// Try to import context, handle case where it's not available
let useTransitionContext;
try {
  useTransitionContext = require('./TransitionProvider').useTransitionContext;
} catch {
  useTransitionContext = () => null;
}

// ============================================
// CONSTANTS & PRESETS
// ============================================

/**
 * Default transition configuration
 */
export const DEFAULT_TRANSITION = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};

/**
 * Transition presets for different element types
 */
export const TRANSITION_PRESETS = {
  // Default balanced transition
  default: DEFAULT_TRANSITION,

  // Snappy for quick interactions
  snappy: {
    type: 'spring',
    stiffness: 500,
    damping: 30,
    mass: 0.5,
  },

  // Smooth for large elements
  smooth: {
    type: 'spring',
    stiffness: 300,
    damping: 35,
    mass: 1,
  },

  // Bouncy for playful elements
  bouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 20,
    mass: 0.8,
  },

  // Gentle for subtle transitions
  gentle: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
    mass: 1,
  },

  // Quick for rapid transitions
  quick: {
    type: 'tween',
    ease: [0.4, 0, 0.2, 1],
    duration: 0.25,
  },
};

const SHARED_ELEMENT_STYLES = {
  position: 'relative',
  display: 'inline-block',
};

// ============================================
// SHARED ELEMENT COMPONENT
// ============================================

/**
 * SharedElement - Morphing element wrapper
 *
 * @param {Object} props
 * @param {string} props.id - Unique identifier for the shared element (required)
 * @param {React.ReactNode} props.children - Element content to morph
 * @param {number} props.zIndex - Z-index during transition (default: 100)
 * @param {Object|string} props.transition - Custom transition config or preset name
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 * @param {boolean} props.disabled - Disable shared element behavior
 * @param {boolean} props.preserveAspectRatio - Preserve aspect ratio during transition
 * @param {Function} props.onLayoutAnimationStart - Callback when layout animation starts
 * @param {Function} props.onLayoutAnimationComplete - Callback when layout animation completes
 */
function SharedElement({
  id,
  children,
  zIndex = 100,
  transition = DEFAULT_TRANSITION,
  className = '',
  style = {},
  disabled = false,
  preserveAspectRatio = false,
  onLayoutAnimationStart,
  onLayoutAnimationComplete,
}) {
  const elementRef = useRef(null);
  const motionAllowed = useMotionAllowed();

  // Try to get context for registration, but don't fail if not available
  let context = null;
  try {
    context = useTransitionContext();
  } catch {
    // Context not available
  }

  // Resolve transition config (can be a preset name or custom config)
  const resolvedTransition = useMemo(() => {
    if (typeof transition === 'string') {
      return TRANSITION_PRESETS[transition] || DEFAULT_TRANSITION;
    }
    return transition || DEFAULT_TRANSITION;
  }, [transition]);

  // Register/unregister with context if available
  useEffect(() => {
    if (disabled || !context || !id) return;

    context.registerSharedElement(id, elementRef.current, zIndex);

    return () => {
      context.unregisterSharedElement(id);
    };
  }, [id, zIndex, disabled, context]);

  // If disabled or motion not allowed, render without motion wrapper
  if (disabled || !motionAllowed) {
    return (
      <div className={className} style={style} ref={elementRef}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={elementRef}
      layoutId={id}
      className={`shared-element ${className}`.trim()}
      style={{
        ...SHARED_ELEMENT_STYLES,
        zIndex,
        ...style,
      }}
      transition={resolvedTransition}
      onLayoutAnimationStart={onLayoutAnimationStart}
      onLayoutAnimationComplete={onLayoutAnimationComplete}
      layout={preserveAspectRatio ? 'preserve-aspect' : true}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// SHARED ELEMENT VARIANTS (PRESETS)
// ============================================

/**
 * SharedAvatar - Preset for avatar morphing
 * Includes scale and border-radius handling for avatars
 *
 * @example
 * // In header
 * <SharedAvatar id="user-avatar">
 *   <Avatar user={user} size="sm" />
 * </SharedAvatar>
 *
 * // In profile
 * <SharedAvatar id="user-avatar">
 *   <Avatar user={user} size="xl" />
 * </SharedAvatar>
 */
export function SharedAvatar({
  id,
  children,
  className = '',
  ...props
}) {
  return (
    <SharedElement
      id={id}
      className={`shared-avatar ${className}`.trim()}
      transition={TRANSITION_PRESETS.snappy}
      preserveAspectRatio
      {...props}
    >
      {children}
    </SharedElement>
  );
}

/**
 * SharedCard - Preset for card morphing/expansion
 * Uses smoother transition for larger elements
 *
 * @example
 * // In list
 * <SharedCard id={`exercise-${exercise.id}`}>
 *   <ExerciseCard exercise={exercise} />
 * </SharedCard>
 *
 * // In detail
 * <SharedCard id={`exercise-${exerciseId}`}>
 *   <ExerciseDetail exercise={exercise} />
 * </SharedCard>
 */
export function SharedCard({
  id,
  children,
  className = '',
  ...props
}) {
  return (
    <SharedElement
      id={id}
      className={`shared-card ${className}`.trim()}
      transition={TRANSITION_PRESETS.smooth}
      {...props}
    >
      {children}
    </SharedElement>
  );
}

/**
 * SharedIcon - Preset for icon morphing
 * Uses quick, snappy transition
 *
 * @example
 * // In navigation
 * <SharedIcon id="nav-icon">
 *   <HomeIcon />
 * </SharedIcon>
 */
export function SharedIcon({
  id,
  children,
  className = '',
  ...props
}) {
  return (
    <SharedElement
      id={id}
      className={`shared-icon ${className}`.trim()}
      transition={TRANSITION_PRESETS.snappy}
      {...props}
    >
      {children}
    </SharedElement>
  );
}

/**
 * SharedImage - Preset for image morphing
 * Handles aspect ratio changes smoothly
 *
 * @example
 * // In thumbnail
 * <SharedImage id={`workout-image-${id}`}>
 *   <img src={thumbnail} alt={title} />
 * </SharedImage>
 *
 * // In full view
 * <SharedImage id={`workout-image-${id}`}>
 *   <img src={fullImage} alt={title} />
 * </SharedImage>
 */
export function SharedImage({
  id,
  children,
  className = '',
  ...props
}) {
  return (
    <SharedElement
      id={id}
      className={`shared-image overflow-hidden ${className}`.trim()}
      transition={TRANSITION_PRESETS.smooth}
      preserveAspectRatio
      {...props}
    >
      {children}
    </SharedElement>
  );
}

/**
 * SharedButton - Preset for button morphing
 * Bouncy transition for interactive elements
 */
export function SharedButton({
  id,
  children,
  className = '',
  ...props
}) {
  return (
    <SharedElement
      id={id}
      className={`shared-button ${className}`.trim()}
      transition={TRANSITION_PRESETS.bouncy}
      {...props}
    >
      {children}
    </SharedElement>
  );
}

/**
 * SharedText - Preset for text morphing
 * Gentle transition for content
 */
export function SharedText({
  id,
  children,
  className = '',
  ...props
}) {
  return (
    <SharedElement
      id={id}
      className={`shared-text ${className}`.trim()}
      transition={TRANSITION_PRESETS.gentle}
      {...props}
    >
      {children}
    </SharedElement>
  );
}

// ============================================
// SHARED ELEMENT GROUP
// ============================================

/**
 * SharedElementGroup - Container that provides AnimatePresence
 * for a group of shared elements
 *
 * @example
 * <SharedElementGroup>
 *   {exercises.map(exercise => (
 *     <SharedElement key={exercise.id} id={`exercise-${exercise.id}`}>
 *       <ExerciseCard {...exercise} />
 *     </SharedElement>
 *   ))}
 * </SharedElementGroup>
 */
export function SharedElementGroup({
  children,
  mode = 'sync',
  className = '',
  style = {},
}) {
  return (
    <AnimatePresence mode={mode}>
      <div className={`shared-element-group ${className}`.trim()} style={style}>
        {children}
      </div>
    </AnimatePresence>
  );
}

// ============================================
// HOOKS FOR SHARED ELEMENT CONTROL
// ============================================

/**
 * useSharedElement - Hook for programmatic shared element control
 *
 * @param {string} id - Element identifier
 * @returns {Object} Control functions and state
 *
 * @example
 * const { ref, isRegistered, register, unregister } = useSharedElement('my-element');
 */
export function useSharedElement(id) {
  const ref = useRef(null);
  let context = null;

  try {
    context = useTransitionContext();
  } catch {
    // Context not available
  }

  const isRegistered = useMemo(() => {
    return context?.hasSharedElement(id) || false;
  }, [context, id]);

  const register = useCallback(() => {
    if (context && ref.current) {
      context.registerSharedElement(id, ref.current);
    }
  }, [context, id]);

  const unregister = useCallback(() => {
    if (context) {
      context.unregisterSharedElement(id);
    }
  }, [context, id]);

  return {
    ref,
    isRegistered,
    register,
    unregister,
    context,
  };
}

/**
 * useSharedElementTransition - Hook for transitioning with shared elements
 *
 * @param {string} id - Element identifier
 * @param {Object} options - Transition options
 * @returns {Object} Transition state and props
 *
 * @example
 * const { layoutId, transitionProps, isAnimating } = useSharedElementTransition('card-1');
 * <motion.div layoutId={layoutId} {...transitionProps}>...</motion.div>
 */
export function useSharedElementTransition(id, options = {}) {
  const { transition = DEFAULT_TRANSITION, zIndex = 100 } = options;
  const motionAllowed = useMotionAllowed();

  const layoutId = motionAllowed ? id : undefined;

  const transitionProps = useMemo(() => {
    if (!motionAllowed) return {};

    return {
      layoutId,
      transition,
      style: {
        zIndex,
        position: 'relative',
      },
    };
  }, [layoutId, transition, zIndex, motionAllowed]);

  return {
    layoutId,
    transitionProps,
    isEnabled: motionAllowed,
  };
}

// ============================================
// EXPORTS
// ============================================

export default SharedElement;
