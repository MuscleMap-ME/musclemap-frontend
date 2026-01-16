/**
 * SkeletonBase - Base skeleton component with shimmer animation
 *
 * Provides a customizable skeleton loading placeholder with smooth
 * animation effects. Supports shimmer, wave, and pulse variants.
 * Respects prefers-reduced-motion for accessibility.
 *
 * @example
 * // Basic usage
 * <SkeletonBase width={200} height={20} />
 * <SkeletonBase width="100%" height={48} borderRadius="lg" />
 *
 * // Animation variants
 * <SkeletonBase variant="shimmer" width={200} height={20} />
 * <SkeletonBase variant="wave" width={200} height={20} />
 * <SkeletonBase variant="pulse" width={200} height={20} />
 *
 * // Animation speed
 * <SkeletonBase speed="slow" width={200} height={20} />
 * <SkeletonBase speed="normal" width={200} height={20} />
 * <SkeletonBase speed="fast" width={200} height={20} />
 *
 * // Shape variants
 * <SkeletonBase shape="circle" width={48} height={48} />
 * <SkeletonBase shape="text" width="60%" />
 * <SkeletonBase shape="rect" width={100} height={50} />
 *
 * // Animation delay for staggered effect
 * <SkeletonBase width="100%" height={16} animationDelay={0} />
 * <SkeletonBase width="80%" height={16} animationDelay={1} />
 * <SkeletonBase width="90%" height={16} animationDelay={2} />
 */

import React from 'react';
import clsx from 'clsx';

// CSS for all skeleton animations - injected once
const shimmerStyles = `
  /* Shimmer animation - gradient sweep left to right */
  @keyframes skeleton-shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  /* Wave animation - more pronounced gradient with smoother motion */
  @keyframes skeleton-wave {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  /* Pulse animation - opacity fade in/out */
  @keyframes skeleton-pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  /* Base skeleton styles */
  .skeleton-base {
    position: relative;
    overflow: hidden;
  }

  /* Shimmer variant - subtle gradient sweep */
  .skeleton-shimmer {
    background: linear-gradient(
      90deg,
      var(--skeleton-base, rgba(255, 255, 255, 0.05)) 0%,
      var(--skeleton-base, rgba(255, 255, 255, 0.05)) 40%,
      var(--skeleton-highlight, rgba(255, 255, 255, 0.1)) 50%,
      var(--skeleton-base, rgba(255, 255, 255, 0.05)) 60%,
      var(--skeleton-base, rgba(255, 255, 255, 0.05)) 100%
    );
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
  }

  /* Wave variant - more visible gradient with longer sweep */
  .skeleton-wave {
    background: linear-gradient(
      90deg,
      var(--skeleton-base, rgba(255, 255, 255, 0.05)) 0%,
      var(--skeleton-base, rgba(255, 255, 255, 0.05)) 25%,
      var(--skeleton-highlight, rgba(255, 255, 255, 0.15)) 50%,
      var(--skeleton-base, rgba(255, 255, 255, 0.05)) 75%,
      var(--skeleton-base, rgba(255, 255, 255, 0.05)) 100%
    );
    background-size: 200% 100%;
    animation: skeleton-wave 2s linear infinite;
  }

  /* Pulse variant - simple opacity animation */
  .skeleton-pulse {
    background: var(--skeleton-base, rgba(255, 255, 255, 0.08));
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }

  /* Speed modifiers */
  .skeleton-speed-slow.skeleton-shimmer { animation-duration: 2.5s; }
  .skeleton-speed-normal.skeleton-shimmer { animation-duration: 1.5s; }
  .skeleton-speed-fast.skeleton-shimmer { animation-duration: 0.8s; }

  .skeleton-speed-slow.skeleton-wave { animation-duration: 3s; }
  .skeleton-speed-normal.skeleton-wave { animation-duration: 2s; }
  .skeleton-speed-fast.skeleton-wave { animation-duration: 1.2s; }

  .skeleton-speed-slow.skeleton-pulse { animation-duration: 2.5s; }
  .skeleton-speed-normal.skeleton-pulse { animation-duration: 1.5s; }
  .skeleton-speed-fast.skeleton-pulse { animation-duration: 0.8s; }

  /* Delay classes for staggered animations */
  .skeleton-delay-0 { animation-delay: 0ms; }
  .skeleton-delay-1 { animation-delay: 100ms; }
  .skeleton-delay-2 { animation-delay: 200ms; }
  .skeleton-delay-3 { animation-delay: 300ms; }
  .skeleton-delay-4 { animation-delay: 400ms; }
  .skeleton-delay-5 { animation-delay: 500ms; }
  .skeleton-delay-6 { animation-delay: 600ms; }
  .skeleton-delay-7 { animation-delay: 700ms; }
  .skeleton-delay-8 { animation-delay: 800ms; }
  .skeleton-delay-9 { animation-delay: 900ms; }

  /* Static variant - no animation */
  .skeleton-static {
    background: var(--skeleton-base, rgba(255, 255, 255, 0.08));
  }

  /* Respect prefers-reduced-motion */
  @media (prefers-reduced-motion: reduce) {
    .skeleton-shimmer,
    .skeleton-wave,
    .skeleton-pulse {
      animation: none;
      background: var(--skeleton-base, rgba(255, 255, 255, 0.08));
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
 * Skeleton - Base skeleton component with shimmer animation
 *
 * A flexible skeleton loading placeholder that supports multiple animation
 * types, variants, and sizing options. This is the core building block for
 * all skeleton loading states in the app.
 *
 * @param {Object} props
 * @param {'text'|'circular'|'rectangular'|'rounded'} [props.variant='rectangular'] - Shape variant
 * @param {number|string} [props.width] - Width (number = px, string = CSS value)
 * @param {number|string} [props.height] - Height (number = px, string = CSS value)
 * @param {'shimmer'|'pulse'|'wave'|'none'} [props.animation='shimmer'] - Animation type
 * @param {'slow'|'normal'|'fast'} [props.speed='normal'] - Animation speed
 * @param {number} [props.animationDelay] - Delay index for staggered animations (0-9)
 * @param {'none'|'xs'|'sm'|'md'|'lg'|'xl'|'2xl'|'3xl'|'full'|string} [props.borderRadius] - Custom border radius (overrides variant)
 * @param {string} [props.className] - Additional CSS classes
 * @param {Object} [props.style] - Additional inline styles
 *
 * @example
 * // Basic shapes
 * <Skeleton variant="text" width="60%" />
 * <Skeleton variant="circular" width={48} height={48} />
 * <Skeleton variant="rectangular" width={200} height={100} />
 * <Skeleton variant="rounded" width={200} height={100} />
 *
 * // Animation types
 * <Skeleton animation="shimmer" width={200} height={20} />
 * <Skeleton animation="pulse" width={200} height={20} />
 * <Skeleton animation="wave" width={200} height={20} />
 * <Skeleton animation="none" width={200} height={20} />
 *
 * // Staggered animations
 * <Skeleton width="100%" height={16} animationDelay={0} />
 * <Skeleton width="80%" height={16} animationDelay={1} />
 * <Skeleton width="90%" height={16} animationDelay={2} />
 */
function SkeletonBase({
  // New API props (preferred)
  variant = 'rectangular',
  animation = 'shimmer',
  // Legacy API props (still supported for backward compatibility)
  shape, // Legacy: 'rect'|'circle'|'text' -> maps to variant
  // eslint-disable-next-line no-unused-vars
  animate, // Legacy: boolean -> maps to animation !== 'none'
  shimmer, // Legacy: boolean -> if false, animation='none'
  circle = false, // Legacy: boolean -> variant='circular'
  // Common props
  width,
  height,
  borderRadius,
  speed = 'normal',
  animationDelay,
  className,
  style,
  ...props
}) {
  // Inject styles on first render
  React.useEffect(() => {
    injectStyles();
  }, []);

  // Handle legacy props - map to new API
  let effectiveVariant = variant;
  if (circle) {
    effectiveVariant = 'circular';
  } else if (shape) {
    // Map legacy shape values to new variant names
    const shapeToVariant = {
      rect: 'rectangular',
      circle: 'circular',
      text: 'text',
    };
    effectiveVariant = shapeToVariant[shape] || shape;
  }

  // Handle legacy animation props
  let effectiveAnimation = animation;
  if (shimmer === false || props.animate === false) {
    effectiveAnimation = 'none';
  }

  // Compute border radius based on variant (can be overridden by borderRadius prop)
  let computedRadius;
  if (borderRadius !== undefined) {
    computedRadius = radiusMap[borderRadius] || borderRadius;
  } else {
    // Default radius based on variant
    switch (effectiveVariant) {
      case 'circular':
        computedRadius = 'var(--radius-full, 9999px)';
        break;
      case 'text':
        computedRadius = 'var(--radius-sm, 4px)';
        break;
      case 'rounded':
        computedRadius = 'var(--radius-lg, 12px)';
        break;
      case 'rectangular':
      default:
        computedRadius = 'var(--radius-md, 8px)';
        break;
    }
  }

  // Compute dimensions
  let computedWidth = typeof width === 'number' ? `${width}px` : width;
  let computedHeight = typeof height === 'number' ? `${height}px` : height;

  // Set sensible defaults for text variant
  if (effectiveVariant === 'text') {
    computedWidth = computedWidth || '100%';
    computedHeight = computedHeight || '16px';
  }

  // For circular variant, ensure equal dimensions
  if (effectiveVariant === 'circular' && width && !height) {
    computedHeight = computedWidth;
  }

  // Build animation classes
  const animationClass = effectiveAnimation !== 'none'
    ? `skeleton-${effectiveAnimation}`
    : 'skeleton-static';
  const speedClass = effectiveAnimation !== 'none'
    ? `skeleton-speed-${speed}`
    : '';
  const delayClass = effectiveAnimation !== 'none' && animationDelay !== undefined
    ? `skeleton-delay-${Math.min(Math.max(0, animationDelay), 9)}`
    : '';

  return (
    <div
      className={clsx(
        'skeleton-base',
        animationClass,
        speedClass,
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

// Export as both default and named export for flexibility
export { SkeletonBase as Skeleton };

/**
 * SkeletonText - Text line skeleton with appropriate height
 *
 * @param {Object} props
 * @param {number|string} [props.width='100%'] - Width of the text line
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|'2xl'|number} [props.size='md'] - Text size
 * @param {number} [props.lines=1] - Number of lines to render
 * @param {'pulse'|'shimmer'|'wave'} [props.variant='shimmer'] - Animation variant
 * @param {'slow'|'normal'|'fast'} [props.speed='normal'] - Animation speed
 * @param {number} [props.animationDelay] - Delay index for staggered animations
 */
export function SkeletonText({
  width = '100%',
  size = 'md',
  lines = 1,
  variant = 'shimmer',
  speed = 'normal',
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
            shape="text"
            variant={variant}
            speed={speed}
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
      shape="text"
      variant={variant}
      speed={speed}
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
 * @param {'pulse'|'shimmer'|'wave'} [props.variant='shimmer'] - Animation variant
 * @param {'slow'|'normal'|'fast'} [props.speed='normal'] - Animation speed
 * @param {number} [props.animationDelay] - Delay index for staggered animations
 */
export function SkeletonAvatar({
  size = 48,
  variant = 'shimmer',
  speed = 'normal',
  animationDelay,
  className,
  ...props
}) {
  const computedSize = typeof size === 'number' ? size : parseInt(size, 10) || 48;

  return (
    <SkeletonBase
      shape="circle"
      variant={variant}
      speed={speed}
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
 * @param {'pulse'|'shimmer'|'wave'} [props.variant='shimmer'] - Animation variant
 * @param {'slow'|'normal'|'fast'} [props.speed='normal'] - Animation speed
 * @param {number} [props.animationDelay] - Delay index for staggered animations
 */
export function SkeletonButton({
  width,
  height,
  size,
  variant = 'shimmer',
  speed = 'normal',
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
      shape="rect"
      variant={variant}
      speed={speed}
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
 * @param {'pulse'|'shimmer'|'wave'} [props.variant='shimmer'] - Animation variant
 * @param {'slow'|'normal'|'fast'} [props.speed='normal'] - Animation speed
 * @param {number} [props.animationDelay] - Delay index for staggered animations
 */
export function SkeletonImage({
  aspectRatio = '16/9',
  width = '100%',
  variant = 'shimmer',
  speed = 'normal',
  animationDelay,
  className,
  ...props
}) {
  return (
    <SkeletonBase
      shape="rect"
      variant={variant}
      speed={speed}
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
 * @param {'pulse'|'shimmer'|'wave'} [props.variant='shimmer'] - Animation variant
 * @param {'slow'|'normal'|'fast'} [props.speed='normal'] - Animation speed
 * @param {number} [props.animationDelay] - Delay index for staggered animations
 */
export function SkeletonIcon({
  size = 24,
  variant = 'shimmer',
  speed = 'normal',
  animationDelay,
  className,
  ...props
}) {
  return (
    <SkeletonBase
      shape="rect"
      variant={variant}
      speed={speed}
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
 * @param {'pulse'|'shimmer'|'wave'} [props.variant='shimmer'] - Animation variant
 * @param {'slow'|'normal'|'fast'} [props.speed='normal'] - Animation speed
 * @param {number} [props.animationDelay] - Delay index for staggered animations
 */
export function SkeletonBadge({
  width = 64,
  variant = 'shimmer',
  speed = 'normal',
  animationDelay,
  className,
  ...props
}) {
  return (
    <SkeletonBase
      shape="rect"
      variant={variant}
      speed={speed}
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
