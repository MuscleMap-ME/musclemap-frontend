/**
 * SkeletonBase - Base skeleton component with shimmer animation
 *
 * Provides a customizable skeleton loading placeholder with a smooth
 * left-to-right shimmer wave effect. Respects prefers-reduced-motion.
 *
 * @example
 * // Basic usage
 * <SkeletonBase width={200} height={20} />
 * <SkeletonBase width="100%" height={48} borderRadius="lg" />
 *
 * // Using variants
 * <SkeletonBase variant="circle" width={48} height={48} />
 * <SkeletonBase variant="text" width="60%" />
 * <SkeletonBase variant="rect" width={100} height={50} />
 *
 * // Disable shimmer
 * <SkeletonBase width={200} height={20} shimmer={false} />
 *
 * // Animation delay for staggered effect
 * <SkeletonBase width="100%" height={16} animationDelay={0} />
 * <SkeletonBase width="80%" height={16} animationDelay={1} />
 * <SkeletonBase width="90%" height={16} animationDelay={2} />
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
      var(--skeleton-base, var(--glass-white-5)) 0%,
      var(--skeleton-base, var(--glass-white-5)) 40%,
      var(--skeleton-highlight, var(--glass-white-10)) 50%,
      var(--skeleton-base, var(--glass-white-5)) 60%,
      var(--skeleton-base, var(--glass-white-5)) 100%
    );
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
  }

  .skeleton-shimmer.skeleton-delay-0 { animation-delay: 0ms; }
  .skeleton-shimmer.skeleton-delay-1 { animation-delay: 100ms; }
  .skeleton-shimmer.skeleton-delay-2 { animation-delay: 200ms; }
  .skeleton-shimmer.skeleton-delay-3 { animation-delay: 300ms; }
  .skeleton-shimmer.skeleton-delay-4 { animation-delay: 400ms; }
  .skeleton-shimmer.skeleton-delay-5 { animation-delay: 500ms; }
  .skeleton-shimmer.skeleton-delay-6 { animation-delay: 600ms; }
  .skeleton-shimmer.skeleton-delay-7 { animation-delay: 700ms; }
  .skeleton-shimmer.skeleton-delay-8 { animation-delay: 800ms; }
  .skeleton-shimmer.skeleton-delay-9 { animation-delay: 900ms; }

  .skeleton-static {
    background: var(--skeleton-base, var(--glass-white-8));
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton-shimmer {
      animation: none;
      background: var(--skeleton-base, var(--glass-white-8));
    }
  }
`;

// Inject styles once
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.id = 'skeleton-shimmer-styles';
  style.textContent = shimmerStyles;
  document.head.appendChild(style);
  stylesInjected = true;
}

// Border radius mapping
const radiusMap = {
  none: '0',
  xs: 'var(--radius-xs, 2px)',
  sm: 'var(--radius-sm, 4px)',
  md: 'var(--radius-md, 8px)',
  lg: 'var(--radius-lg, 12px)',
  xl: 'var(--radius-xl, 16px)',
  '2xl': 'var(--radius-2xl, 24px)',
  '3xl': 'var(--radius-3xl, 32px)',
  full: 'var(--radius-full, 9999px)',
};

// Text size to height mapping
const textSizeMap = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
};

/**
 * SkeletonBase - The foundational skeleton component
 *
 * @param {Object} props
 * @param {number|string} [props.width] - Width (number = px, string = CSS value)
 * @param {number|string} [props.height] - Height (number = px, string = CSS value)
 * @param {'none'|'xs'|'sm'|'md'|'lg'|'xl'|'2xl'|'3xl'|'full'|string} [props.borderRadius='md'] - Border radius
 * @param {'rect'|'circle'|'text'} [props.variant='rect'] - Shape variant
 * @param {boolean} [props.shimmer=true] - Enable shimmer animation
 * @param {boolean} [props.circle=false] - Shorthand for variant="circle"
 * @param {number} [props.animationDelay] - Delay index for staggered animations (0-9)
 * @param {string} [props.className] - Additional CSS classes
 * @param {Object} [props.style] - Additional inline styles
 */
function SkeletonBase({
  width,
  height,
  borderRadius = 'md',
  variant = 'rect',
  shimmer = true,
  circle = false,
  animationDelay,
  className,
  style,
  ...props
}) {
  // Inject styles on first render
  React.useEffect(() => {
    injectStyles();
  }, []);

  // Determine variant from props
  const effectiveVariant = circle ? 'circle' : variant;

  // Compute border radius based on variant
  let computedRadius;
  if (effectiveVariant === 'circle') {
    computedRadius = 'var(--radius-full, 9999px)';
  } else if (effectiveVariant === 'text') {
    computedRadius = 'var(--radius-sm, 4px)';
  } else {
    computedRadius = radiusMap[borderRadius] || borderRadius;
  }

  // Compute dimensions
  let computedWidth = typeof width === 'number' ? `${width}px` : width;
  let computedHeight = typeof height === 'number' ? `${height}px` : height;

  // For text variant, use sensible defaults
  if (effectiveVariant === 'text') {
    computedWidth = computedWidth || '100%';
    computedHeight = computedHeight || '16px';
  }

  // For circle variant, ensure equal dimensions
  if (effectiveVariant === 'circle' && width && !height) {
    computedHeight = computedWidth;
  }

  // Build delay class
  const delayClass = animationDelay !== undefined
    ? `skeleton-delay-${Math.min(Math.max(0, animationDelay), 9)}`
    : '';

  return (
    <div
      className={clsx(
        shimmer ? 'skeleton-shimmer' : 'skeleton-static',
        delayClass,
        className
      )}
      style={{
        width: computedWidth,
        height: computedHeight,
        borderRadius: computedRadius,
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
      role="presentation"
      {...props}
    />
  );
}

/**
 * SkeletonText - Text line skeleton with appropriate height
 *
 * @param {Object} props
 * @param {number|string} [props.width='100%'] - Width of the text line
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|'2xl'|number} [props.size='md'] - Text size
 * @param {number} [props.lines=1] - Number of lines to render
 * @param {number} [props.animationDelay] - Delay index for staggered animations
 */
export function SkeletonText({
  width = '100%',
  size = 'md',
  lines = 1,
  animationDelay,
  className,
  ...props
}) {
  const heightValue = textSizeMap[size] || size;

  if (lines > 1) {
    return (
      <div className={clsx('space-y-2', className)} aria-hidden="true" role="presentation">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBase
            key={i}
            variant="text"
            width={i === lines - 1 ? '75%' : width}
            height={heightValue}
            animationDelay={animationDelay !== undefined ? animationDelay + i : undefined}
            {...props}
          />
        ))}
      </div>
    );
  }

  return (
    <SkeletonBase
      variant="text"
      width={width}
      height={heightValue}
      animationDelay={animationDelay}
      className={className}
      {...props}
    />
  );
}

/**
 * SkeletonAvatar - Circular avatar skeleton
 *
 * @param {Object} props
 * @param {number|string} [props.size=48] - Avatar diameter
 * @param {number} [props.animationDelay] - Delay index for staggered animations
 */
export function SkeletonAvatar({ size = 48, animationDelay, className, ...props }) {
  const computedSize = typeof size === 'number' ? size : parseInt(size, 10) || 48;

  return (
    <SkeletonBase
      variant="circle"
      width={computedSize}
      height={computedSize}
      animationDelay={animationDelay}
      className={className}
      {...props}
    />
  );
}

/**
 * SkeletonButton - Button-shaped skeleton
 *
 * @param {Object} props
 * @param {number|string} [props.width=120] - Button width
 * @param {number|string} [props.height=40] - Button height
 * @param {'sm'|'md'|'lg'} [props.size] - Predefined size
 * @param {number} [props.animationDelay] - Delay index for staggered animations
 */
export function SkeletonButton({
  width,
  height,
  size,
  animationDelay,
  className,
  ...props
}) {
  // Size presets
  const sizePresets = {
    sm: { width: 80, height: 32 },
    md: { width: 120, height: 40 },
    lg: { width: 160, height: 48 },
  };

  const preset = size ? sizePresets[size] : null;
  const finalWidth = width ?? preset?.width ?? 120;
  const finalHeight = height ?? preset?.height ?? 40;

  return (
    <SkeletonBase
      variant="rect"
      width={finalWidth}
      height={finalHeight}
      borderRadius="lg"
      animationDelay={animationDelay}
      className={className}
      {...props}
    />
  );
}

/**
 * SkeletonImage - Image placeholder skeleton with aspect ratio
 *
 * @param {Object} props
 * @param {string} [props.aspectRatio='16/9'] - CSS aspect ratio
 * @param {number|string} [props.width='100%'] - Image width
 * @param {number} [props.animationDelay] - Delay index for staggered animations
 */
export function SkeletonImage({
  aspectRatio = '16/9',
  width = '100%',
  animationDelay,
  className,
  ...props
}) {
  return (
    <SkeletonBase
      variant="rect"
      width={width}
      height="auto"
      borderRadius="lg"
      animationDelay={animationDelay}
      className={className}
      style={{ aspectRatio }}
      {...props}
    />
  );
}

/**
 * SkeletonIcon - Small icon placeholder
 *
 * @param {Object} props
 * @param {number} [props.size=24] - Icon size
 * @param {number} [props.animationDelay] - Delay index for staggered animations
 */
export function SkeletonIcon({ size = 24, animationDelay, className, ...props }) {
  return (
    <SkeletonBase
      variant="rect"
      width={size}
      height={size}
      borderRadius="sm"
      animationDelay={animationDelay}
      className={className}
      {...props}
    />
  );
}

/**
 * SkeletonBadge - Badge/chip skeleton
 *
 * @param {Object} props
 * @param {number|string} [props.width=64] - Badge width
 * @param {number} [props.animationDelay] - Delay index for staggered animations
 */
export function SkeletonBadge({ width = 64, animationDelay, className, ...props }) {
  return (
    <SkeletonBase
      variant="rect"
      width={width}
      height={22}
      borderRadius="full"
      animationDelay={animationDelay}
      className={className}
      {...props}
    />
  );
}

/**
 * SkeletonParagraph - Multiple lines of text
 *
 * @param {Object} props
 * @param {number} [props.lines=3] - Number of lines
 * @param {string} [props.lastLineWidth='75%'] - Width of the last line
 * @param {'xs'|'sm'|'md'|'lg'} [props.size='sm'] - Text size
 * @param {number} [props.animationDelay] - Starting delay index
 */
export function SkeletonParagraph({
  lines = 3,
  lastLineWidth = '75%',
  size = 'sm',
  animationDelay = 0,
  className,
  ...props
}) {
  return (
    <div className={clsx('space-y-2', className)} aria-hidden="true" role="presentation" {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonText
          key={i}
          width={i === lines - 1 ? lastLineWidth : '100%'}
          size={size}
          animationDelay={animationDelay + i}
        />
      ))}
    </div>
  );
}

export default SkeletonBase;
