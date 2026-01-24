/**
 * SafeMotion - Bulletproof motion component wrappers for restrictive environments
 *
 * CRITICAL: iOS Lockdown Mode and Brave Browser with Shields enabled can cause
 * framer-motion animations to fail silently, leaving elements INVISIBLE.
 *
 * This module provides drop-in replacements for motion.* components that:
 * 1. Detect restrictive environments (iOS + Brave, Lockdown Mode, etc.)
 * 2. Fall back to static elements with CSS transitions when needed
 * 3. Ensure content is ALWAYS visible via inline style fallbacks
 * 4. Log issues for debugging without breaking the UI
 *
 * USAGE:
 *   // Instead of:
 *   import { motion, AnimatePresence } from 'framer-motion';
 *   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 *
 *   // Use:
 *   import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';
 *   <SafeMotion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 *
 * The SafeMotion components will:
 * - Work normally on standard browsers
 * - Fall back to static rendering on iOS Lockdown Mode / Brave Shields
 * - Always include visibility fallback styles to prevent invisible elements
 */

import React, { ComponentProps, forwardRef, useEffect, useRef } from 'react';
import { motion, AnimatePresence as FramerAnimatePresence, MotionProps } from 'framer-motion';
import {
  isRestrictiveEnvironment,
  getCapabilities,
  getAnimationSafetyLevel,
} from './browserCompat';

// Re-export detection functions for convenience
export { isRestrictiveEnvironment, getCapabilities, getAnimationSafetyLevel };

// ============================================================================
// CACHED DETECTION
// ============================================================================

// Cache the restrictive environment check for performance
let _isRestrictive: boolean | null = null;
let _hasLoggedMode = false;

/**
 * Get cached restrictive environment status
 */
export function getIsRestrictive(): boolean {
  if (_isRestrictive === null) {
    _isRestrictive = isRestrictiveEnvironment();

    // Log once for debugging
    if (!_hasLoggedMode && typeof console !== 'undefined') {
      console.log(`[SafeMotion] Mode: ${_isRestrictive ? 'STATIC (restrictive environment)' : 'ANIMATED'}`);
      _hasLoggedMode = true;
    }
  }
  return _isRestrictive;
}

/**
 * Reset the restrictive environment cache (useful for testing)
 */
export function resetRestrictiveCache(): void {
  _isRestrictive = null;
  _hasLoggedMode = false;
}

// ============================================================================
// VISIBILITY FALLBACK STYLES
// ============================================================================

/**
 * Base style that GUARANTEES visibility even if animations fail
 * This is applied to ALL SafeMotion components
 */
export const VISIBILITY_FALLBACK: React.CSSProperties = {
  opacity: 1,
  transform: 'none',
  visibility: 'visible',
};

/**
 * CSS transition fallback for when animations are disabled
 */
const CSS_TRANSITION_FALLBACK: React.CSSProperties = {
  transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
};

// ============================================================================
// SAFE MOTION COMPONENT FACTORY
// ============================================================================

/**
 * Create a safe motion component that falls back to static rendering
 * in restrictive environments while maintaining visibility guarantees.
 */
function createSafeMotionComponent<T extends keyof typeof motion>(
  element: T
) {
  type MotionComponent = (typeof motion)[T];
  type Props = ComponentProps<MotionComponent>;

  const SafeComponent = forwardRef<HTMLElement, Props>(
    (
      {
        style,
        children,
        initial,
        animate,
        exit,
        whileHover,
        whileTap,
        whileFocus,
        whileInView,
        whileDrag,
        variants,
        transition,
        layout,
        layoutId,
        onAnimationStart,
        onAnimationComplete,
        ...props
      },
      ref
    ) => {
      const elementRef = useRef<HTMLElement>(null);
      const combinedRef = (ref || elementRef) as React.Ref<HTMLElement>;

      // Safety check: ensure element is visible after mount
      useEffect(() => {
        const el = (ref as React.RefObject<HTMLElement>)?.current || elementRef.current;
        if (el && getIsRestrictive()) {
          // Force visibility in restrictive mode
          el.style.opacity = '1';
          el.style.visibility = 'visible';
          el.style.transform = 'none';
        }
      }, [ref]);

      // In restrictive environments, render a static element
      if (getIsRestrictive()) {
        const Element = element as keyof JSX.IntrinsicElements;

        // Extract only valid HTML props (filter out motion-specific props)
        const htmlProps = { ...props };

        return (
          // @ts-expect-error - Dynamic element creation
          <Element
            ref={combinedRef}
            {...htmlProps}
            style={{
              ...VISIBILITY_FALLBACK,
              ...CSS_TRANSITION_FALLBACK,
              ...style,
            }}
          >
            {children}
          </Element>
        );
      }

      // Normal mode - use framer-motion with visibility fallback
      const MotionElement = motion[element] as React.ComponentType<any>;

      return (
        <MotionElement
          ref={combinedRef}
          {...props}
          initial={initial}
          animate={animate}
          exit={exit}
          whileHover={whileHover}
          whileTap={whileTap}
          whileFocus={whileFocus}
          whileInView={whileInView}
          whileDrag={whileDrag}
          variants={variants}
          transition={transition}
          layout={layout}
          layoutId={layoutId}
          onAnimationStart={onAnimationStart}
          onAnimationComplete={onAnimationComplete}
          style={{
            // Apply visibility fallback FIRST, then user styles
            // This ensures elements are visible even if animation fails mid-way
            ...VISIBILITY_FALLBACK,
            ...style,
          }}
        >
          {children}
        </MotionElement>
      );
    }
  );

  SafeComponent.displayName = `SafeMotion.${element}`;
  return SafeComponent;
}

// ============================================================================
// SAFEMOTION COMPONENTS
// ============================================================================

/**
 * SafeMotion - Drop-in replacements for motion.* components
 *
 * These components ensure content is always visible, even if framer-motion fails.
 *
 * @example
 * // Instead of:
 * <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 *
 * // Use:
 * <SafeMotion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 */
export const SafeMotion = {
  // Layout elements
  div: createSafeMotionComponent('div'),
  span: createSafeMotionComponent('span'),
  p: createSafeMotionComponent('p'),
  section: createSafeMotionComponent('section'),
  article: createSafeMotionComponent('article'),
  aside: createSafeMotionComponent('aside'),
  main: createSafeMotionComponent('main'),
  header: createSafeMotionComponent('header'),
  footer: createSafeMotionComponent('footer'),
  nav: createSafeMotionComponent('nav'),

  // Headings
  h1: createSafeMotionComponent('h1'),
  h2: createSafeMotionComponent('h2'),
  h3: createSafeMotionComponent('h3'),
  h4: createSafeMotionComponent('h4'),
  h5: createSafeMotionComponent('h5'),
  h6: createSafeMotionComponent('h6'),

  // Interactive elements
  a: createSafeMotionComponent('a'),
  button: createSafeMotionComponent('button'),

  // Form elements
  form: createSafeMotionComponent('form'),
  input: createSafeMotionComponent('input'),
  label: createSafeMotionComponent('label'),
  textarea: createSafeMotionComponent('textarea'),
  select: createSafeMotionComponent('select'),

  // Media elements
  img: createSafeMotionComponent('img'),
  video: createSafeMotionComponent('video'),
  audio: createSafeMotionComponent('audio'),

  // List elements
  ul: createSafeMotionComponent('ul'),
  ol: createSafeMotionComponent('ol'),
  li: createSafeMotionComponent('li'),

  // Table elements
  table: createSafeMotionComponent('table'),
  thead: createSafeMotionComponent('thead'),
  tbody: createSafeMotionComponent('tbody'),
  tr: createSafeMotionComponent('tr'),
  td: createSafeMotionComponent('td'),
  th: createSafeMotionComponent('th'),

  // SVG elements
  svg: createSafeMotionComponent('svg'),
  path: createSafeMotionComponent('path'),
  circle: createSafeMotionComponent('circle'),
  rect: createSafeMotionComponent('rect'),
  line: createSafeMotionComponent('line'),
  polyline: createSafeMotionComponent('polyline'),
  polygon: createSafeMotionComponent('polygon'),
  g: createSafeMotionComponent('g'),

  // Other common elements
  figure: createSafeMotionComponent('figure'),
  figcaption: createSafeMotionComponent('figcaption'),
  blockquote: createSafeMotionComponent('blockquote'),
  pre: createSafeMotionComponent('pre'),
  code: createSafeMotionComponent('code'),
  hr: createSafeMotionComponent('hr'),
};

// ============================================================================
// SAFE ANIMATE PRESENCE
// ============================================================================

export interface SafeAnimatePresenceProps {
  children: React.ReactNode;
  mode?: 'sync' | 'wait' | 'popLayout';
  initial?: boolean;
  onExitComplete?: () => void;
  presenceAffectsLayout?: boolean;
}

/**
 * SafeAnimatePresence - AnimatePresence wrapper that falls back to
 * simple conditional rendering in restrictive environments.
 *
 * In restrictive mode, this simply renders children directly without
 * enter/exit animations, ensuring content is always visible.
 */
export function SafeAnimatePresence({
  children,
  mode = 'sync',
  initial = true,
  onExitComplete,
  presenceAffectsLayout,
}: SafeAnimatePresenceProps) {
  const isRestrictive = getIsRestrictive();

  // Always call hooks unconditionally (React rules of hooks)
  useEffect(() => {
    // In restrictive mode, signal completion on unmount
    if (isRestrictive) {
      return () => {
        onExitComplete?.();
      };
    }
  }, [isRestrictive, onExitComplete]);

  // In restrictive environments, just render children directly
  if (isRestrictive) {
    return <>{children}</>;
  }

  // Normal mode - use framer-motion
  return (
    <FramerAnimatePresence
      mode={mode}
      initial={initial}
      onExitComplete={onExitComplete}
      presenceAffectsLayout={presenceAffectsLayout}
    >
      {children}
    </FramerAnimatePresence>
  );
}

// ============================================================================
// SAFE VARIANTS
// ============================================================================

/**
 * Get safe animation variants based on environment
 * Returns empty variants in restrictive mode to prevent invisible elements
 */
export function getSafeVariants<T extends Record<string, any>>(
  variants: T
): T | Record<string, Record<string, never>> {
  if (getIsRestrictive()) {
    // Return empty variants that don't hide elements
    const safeVariants: Record<string, Record<string, never>> = {};
    for (const key of Object.keys(variants)) {
      safeVariants[key] = {};
    }
    return safeVariants as any;
  }
  return variants;
}

/**
 * Get safe initial state - prevents hidden initial states in restrictive mode
 */
export function getSafeInitial<T>(initial: T): T | false {
  if (getIsRestrictive()) {
    return false; // Framer-motion interprets false as "no initial animation"
  }
  return initial;
}

/**
 * Get safe animate state - ensures elements stay visible
 */
export function getSafeAnimate<T>(animate: T): T | undefined {
  if (getIsRestrictive()) {
    return undefined;
  }
  return animate;
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

import { useState } from 'react';

/**
 * Hook to check if we're in a restrictive environment
 */
export function useIsRestrictive(): boolean {
  const [isRestrictive] = useState(() => getIsRestrictive());
  return isRestrictive;
}

/**
 * Hook to get safe animation props
 * Strips animation props in restrictive environments
 */
export function useSafeAnimationProps<T extends MotionProps>(props: T): T | Partial<T> {
  if (getIsRestrictive()) {
    // Remove animation-related props (prefixed with _ to satisfy no-unused-vars)
    const { initial: _initial, animate: _animate, exit: _exit, whileHover: _whileHover, whileTap: _whileTap, whileFocus: _whileFocus, whileInView: _whileInView, variants: _variants, transition: _transition, ...rest } = props;
    return rest as Partial<T>;
  }
  return props;
}

// ============================================================================
// CSS-ONLY ANIMATION HELPERS
// ============================================================================

/**
 * CSS class names for animations that work without JavaScript
 * Use these as fallbacks when framer-motion might fail
 */
export const cssAnimationClasses = {
  fadeIn: 'animate-fadeIn',
  fadeOut: 'animate-fadeOut',
  slideUp: 'animate-slideUp',
  slideDown: 'animate-slideDown',
  slideLeft: 'animate-slideLeft',
  slideRight: 'animate-slideRight',
  scaleUp: 'animate-scaleUp',
  scaleDown: 'animate-scaleDown',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  spin: 'animate-spin',
  ping: 'animate-ping',
} as const;

/**
 * Generate CSS keyframes string for custom animations
 * Use this in a <style> tag for pure CSS animations
 */
export const cssKeyframes = `
@keyframes safeMotionFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes safeMotionFadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes safeMotionSlideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes safeMotionSlideDown {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes safeMotionSlideLeft {
  from { transform: translateX(20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes safeMotionSlideRight {
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes safeMotionScaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes safeMotionScaleDown {
  from { transform: scale(1.05); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.safe-motion-fade-in { animation: safeMotionFadeIn 0.3s ease-out forwards; }
.safe-motion-fade-out { animation: safeMotionFadeOut 0.3s ease-out forwards; }
.safe-motion-slide-up { animation: safeMotionSlideUp 0.3s ease-out forwards; }
.safe-motion-slide-down { animation: safeMotionSlideDown 0.3s ease-out forwards; }
.safe-motion-slide-left { animation: safeMotionSlideLeft 0.3s ease-out forwards; }
.safe-motion-slide-right { animation: safeMotionSlideRight 0.3s ease-out forwards; }
.safe-motion-scale-up { animation: safeMotionScaleUp 0.3s ease-out forwards; }
.safe-motion-scale-down { animation: safeMotionScaleDown 0.3s ease-out forwards; }

/* Ensure visibility by default */
.safe-motion-visible {
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
}
`;

export default SafeMotion;
