/**
 * SharedElement - Element that morphs between pages
 *
 * Wraps an element to enable smooth morphing animations when the same
 * SharedElement (identified by id) appears on different pages. Uses
 * Framer Motion's layoutId for automatic morphing.
 *
 * Common use cases:
 * - Avatar that grows from header to profile page
 * - Card that expands to full detail view
 * - Icon that moves to new position
 *
 * @example
 * // In header (small avatar)
 * <SharedElement id="user-avatar">
 *   <Avatar user={user} size="sm" />
 * </SharedElement>
 *
 * // In profile page (large avatar)
 * <SharedElement id="user-avatar" zIndex={100}>
 *   <Avatar user={user} size="xl" />
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

// Try to import context, handle case where it's not available
let useTransitionContext;
try {
  useTransitionContext = require('./TransitionProvider').useTransitionContext;
} catch {
  useTransitionContext = () => null;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_TRANSITION = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 0.8,
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
 * @param {string} props.id - Unique identifier for the shared element
 * @param {React.ReactNode} props.children - Element content to morph
 * @param {number} props.zIndex - Z-index during transition (default: 100)
 * @param {Object} props.transition - Custom Framer Motion transition config
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 * @param {boolean} props.disabled - Disable shared element behavior
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
  onLayoutAnimationStart,
  onLayoutAnimationComplete,
}) {
  const elementRef = useRef(null);

  // Try to get context for registration, but don't fail if not available
  let context = null;
  try {
    context = useTransitionContext();
  } catch {
    // Context not available
  }

  // Register/unregister with context if available
  useEffect(() => {
    if (disabled || !context || !id) return;

    context.registerSharedElement(id, elementRef.current, zIndex);

    return () => {
      context.unregisterSharedElement(id);
    };
  }, [id, zIndex, disabled, context]);

  // If disabled, render without motion wrapper
  if (disabled) {
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
      transition={transition}
      onLayoutAnimationStart={onLayoutAnimationStart}
      onLayoutAnimationComplete={onLayoutAnimationComplete}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// SHARED ELEMENT VARIANTS
// ============================================

/**
 * SharedAvatar - Preset for avatar morphing
 * Includes scale and border-radius handling
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
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 25,
        mass: 0.8,
      }}
      {...props}
    >
      {children}
    </SharedElement>
  );
}

/**
 * SharedCard - Preset for card morphing/expansion
 * Uses smoother transition for larger elements
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
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 1,
      }}
      {...props}
    >
      {children}
    </SharedElement>
  );
}

/**
 * SharedIcon - Preset for icon morphing
 * Uses quick, snappy transition
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
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
        mass: 0.5,
      }}
      {...props}
    >
      {children}
    </SharedElement>
  );
}

/**
 * SharedImage - Preset for image morphing
 * Handles aspect ratio changes smoothly
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
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 35,
        mass: 1,
      }}
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
 *   {cards.map(card => (
 *     <SharedElement key={card.id} id={`card-${card.id}`}>
 *       <Card {...card} />
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
// HOOK FOR SHARED ELEMENT CONTROL
// ============================================

/**
 * useSharedElement - Hook for programmatic shared element control
 *
 * @param {string} id - Element identifier
 * @returns {Object} Control functions and state
 *
 * @example
 * const { isActive, ref, triggerTransition } = useSharedElement('my-element');
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

// ============================================
// EXPORTS
// ============================================

export { DEFAULT_TRANSITION };
export default SharedElement;
