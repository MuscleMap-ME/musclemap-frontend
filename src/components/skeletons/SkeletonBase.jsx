/**
 * SkeletonBase - Base skeleton component with shimmer animation
 *
 * Provides a customizable skeleton loading placeholder with a smooth
 * left-to-right shimmer wave effect. Respects prefers-reduced-motion.
 *
 * @example
 * <SkeletonBase width={200} height={20} />
 * <SkeletonBase width="100%" height={48} borderRadius="lg" />
 */

import React from 'react';
import clsx from 'clsx';

// CSS for shimmer animation - injected once
const shimmerStyles = `
  @keyframes skeleton-shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  .skeleton-shimmer {
    background: linear-gradient(
      90deg,
      var(--glass-white-5) 0%,
      var(--glass-white-5) 40%,
      var(--glass-white-10) 50%,
      var(--glass-white-5) 60%,
      var(--glass-white-5) 100%
    );
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton-shimmer {
      animation: none;
      background: var(--glass-white-8);
    }
  }
`;

// Inject styles once
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = shimmerStyles;
  document.head.appendChild(style);
  stylesInjected = true;
}

// Border radius mapping
const radiusMap = {
  none: '0',
  xs: 'var(--radius-xs)',
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  '2xl': 'var(--radius-2xl)',
  '3xl': 'var(--radius-3xl)',
  full: 'var(--radius-full)',
};

function SkeletonBase({
  width,
  height,
  borderRadius = 'md',
  className,
  style,
  circle = false,
  ...props
}) {
  // Inject styles on first render
  React.useEffect(() => {
    injectStyles();
  }, []);

  const computedRadius = circle
    ? 'var(--radius-full)'
    : radiusMap[borderRadius] || borderRadius;

  const computedWidth = typeof width === 'number' ? `${width}px` : width;
  const computedHeight = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={clsx('skeleton-shimmer', className)}
      style={{
        width: computedWidth,
        height: computedHeight,
        borderRadius: computedRadius,
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * SkeletonText - Text line skeleton with appropriate height
 */
export function SkeletonText({
  width = '100%',
  size = 'md',
  className,
  ...props
}) {
  const sizeMap = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
  };

  return (
    <SkeletonBase
      width={width}
      height={sizeMap[size] || size}
      borderRadius="sm"
      className={className}
      {...props}
    />
  );
}

/**
 * SkeletonAvatar - Circular avatar skeleton
 */
export function SkeletonAvatar({ size = 48, className, ...props }) {
  const computedSize = typeof size === 'number' ? size : parseInt(size, 10) || 48;

  return (
    <SkeletonBase
      width={computedSize}
      height={computedSize}
      circle
      className={className}
      {...props}
    />
  );
}

/**
 * SkeletonButton - Button-shaped skeleton
 */
export function SkeletonButton({
  width = 120,
  height = 40,
  className,
  ...props
}) {
  return (
    <SkeletonBase
      width={width}
      height={height}
      borderRadius="lg"
      className={className}
      {...props}
    />
  );
}

/**
 * SkeletonImage - Image placeholder skeleton
 */
export function SkeletonImage({
  aspectRatio = '16/9',
  width = '100%',
  className,
  ...props
}) {
  return (
    <SkeletonBase
      width={width}
      height="auto"
      borderRadius="lg"
      className={className}
      style={{ aspectRatio }}
      {...props}
    />
  );
}

export default SkeletonBase;
