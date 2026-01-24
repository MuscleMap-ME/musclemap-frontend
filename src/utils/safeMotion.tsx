/**
 * SafeMotion - Reusable motion component wrappers for iOS Lockdown Mode / Brave compatibility
 *
 * CRITICAL: iOS Lockdown Mode and Brave browser with Shields enabled can cause
 * framer-motion animations to fail silently, leaving elements invisible.
 *
 * These wrappers:
 * 1. Detect restrictive environments (iOS + Brave combination)
 * 2. Fall back to static elements with CSS transitions when needed
 * 3. Ensure content is ALWAYS visible via inline style fallbacks
 *
 * Usage:
 *   import { SafeMotion, isRestrictiveEnvironment } from '@/utils/safeMotion';
 *
 *   // Instead of <motion.div>, use:
 *   <SafeMotion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 *     Content here
 *   </SafeMotion.div>
 */

import React, { ComponentProps, forwardRef } from 'react';
import { motion, AnimatePresence as FramerAnimatePresence } from 'framer-motion';

/**
 * Detect if we're in a restrictive environment where framer-motion might fail.
 * Checks for iOS + Brave combination which is known to cause issues.
 */
export function isRestrictiveEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isBrave = !!(navigator as any).brave;

    // iOS + Brave is problematic with Shields
    if (isIOS && isBrave) {
      return true;
    }

    // Check for Lockdown Mode indicators (WebGL often disabled)
    if (isIOS) {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
          console.log('[SafeMotion] WebGL unavailable, likely Lockdown Mode');
          return true;
        }
      } catch {
        return true;
      }
    }

    return false;
  } catch {
    return true; // Fail safe - assume restrictive if we can't detect
  }
}

// Cache the detection result for performance
let _isRestrictive: boolean | null = null;

export function getIsRestrictive(): boolean {
  if (_isRestrictive === null) {
    _isRestrictive = isRestrictiveEnvironment();
  }
  return _isRestrictive;
}

/**
 * Reset the restrictive environment cache (useful for testing)
 */
export function resetRestrictiveCache(): void {
  _isRestrictive = null;
}

/**
 * Base style that ensures visibility even if animations fail
 */
const VISIBILITY_FALLBACK = {
  opacity: 1,
  transform: 'none',
  visibility: 'visible' as const,
};

/**
 * Create a safe motion component that falls back to static rendering
 * in restrictive environments.
 */
function createSafeMotionComponent<T extends keyof typeof motion>(
  element: T
) {
  type MotionComponent = (typeof motion)[T];
  type Props = ComponentProps<MotionComponent>;

  const SafeComponent = forwardRef<HTMLElement, Props>(
    ({ style, children, initial, animate, exit, whileHover, whileTap, whileFocus, whileInView, ...props }, ref) => {
      // In restrictive environments, render a static element
      if (getIsRestrictive()) {
        const Element = element as keyof JSX.IntrinsicElements;
        return (
          // @ts-expect-error - Dynamic element creation
          <Element
            ref={ref}
            {...props}
            style={{
              ...VISIBILITY_FALLBACK,
              ...style,
              // Add CSS transitions as fallback for animations
              transition: 'all 0.3s ease-out',
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
          ref={ref}
          {...props}
          initial={initial}
          animate={animate}
          exit={exit}
          whileHover={whileHover}
          whileTap={whileTap}
          whileFocus={whileFocus}
          whileInView={whileInView}
          style={{
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
  div: createSafeMotionComponent('div'),
  span: createSafeMotionComponent('span'),
  p: createSafeMotionComponent('p'),
  h1: createSafeMotionComponent('h1'),
  h2: createSafeMotionComponent('h2'),
  h3: createSafeMotionComponent('h3'),
  h4: createSafeMotionComponent('h4'),
  h5: createSafeMotionComponent('h5'),
  h6: createSafeMotionComponent('h6'),
  a: createSafeMotionComponent('a'),
  button: createSafeMotionComponent('button'),
  img: createSafeMotionComponent('img'),
  ul: createSafeMotionComponent('ul'),
  li: createSafeMotionComponent('li'),
  nav: createSafeMotionComponent('nav'),
  header: createSafeMotionComponent('header'),
  footer: createSafeMotionComponent('footer'),
  section: createSafeMotionComponent('section'),
  article: createSafeMotionComponent('article'),
  aside: createSafeMotionComponent('aside'),
  main: createSafeMotionComponent('main'),
  form: createSafeMotionComponent('form'),
  input: createSafeMotionComponent('input'),
  label: createSafeMotionComponent('label'),
  svg: createSafeMotionComponent('svg'),
  path: createSafeMotionComponent('path'),
};

/**
 * SafeAnimatePresence - AnimatePresence wrapper that falls back to
 * simple conditional rendering in restrictive environments.
 */
export function SafeAnimatePresence({
  children,
  mode = 'sync',
  initial = true,
  onExitComplete,
}: {
  children: React.ReactNode;
  mode?: 'sync' | 'wait' | 'popLayout';
  initial?: boolean;
  onExitComplete?: () => void;
}) {
  // In restrictive environments, just render children directly
  if (getIsRestrictive()) {
    return <>{children}</>;
  }

  // Normal mode - use framer-motion
  return (
    <FramerAnimatePresence mode={mode} initial={initial} onExitComplete={onExitComplete}>
      {children}
    </FramerAnimatePresence>
  );
}

export default SafeMotion;
