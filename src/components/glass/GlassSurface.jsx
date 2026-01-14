/**
 * GlassSurface - Core glass UI primitive
 *
 * A configurable frosted glass surface component inspired by visionOS.
 * Supports multiple depth levels, brand tinting, and interactive states.
 */

import React, { forwardRef } from 'react';
import clsx from 'clsx';

/**
 * Depth presets map to CSS blur and opacity values
 * Higher depth = more blur = appears further back in z-space
 */
const DEPTH_PRESETS = {
  subtle: 'glass-subtle',
  default: 'glass',
  medium: 'glass-medium',
  heavy: 'glass-heavy',
};

/**
 * Tint presets for brand-aligned glass surfaces
 */
const TINT_PRESETS = {
  neutral: '',
  brand: 'glass-brand',
  pulse: 'glass-pulse',
};

const GlassSurface = forwardRef(
  (
    {
      as: Component = 'div',
      children,
      className,
      depth = 'default',
      tint = 'neutral',
      interactive = false,
      luminousBorder = false,
      prismaticBorder = false,
      noiseTexture = false,
      rounded = 'xl',
      padding = true,
      style,
      ...props
    },
    ref
  ) => {
    // Map rounded prop to radius classes
    const radiusMap = {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
      '3xl': 'rounded-3xl',
      full: 'rounded-full',
    };

    // Determine base glass class
    const baseClass = tint !== 'neutral' ? TINT_PRESETS[tint] : DEPTH_PRESETS[depth];

    return (
      <Component
        ref={ref}
        className={clsx(
          // Base glass styling
          baseClass,
          // Border radius
          radiusMap[rounded] || 'rounded-xl',
          // Default padding
          padding && 'p-4',
          // Interactive hover/press states
          interactive && 'glass-interactive cursor-pointer',
          // Luminous border overlay
          luminousBorder && 'border-luminous',
          // Prismatic rainbow border
          prismaticBorder && 'border-prismatic',
          // Noise texture overlay
          noiseTexture && 'noise-overlay',
          // Custom classes
          className
        )}
        style={style}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

GlassSurface.displayName = 'GlassSurface';

export { GlassSurface };
export default GlassSurface;

/**
 * GlassCard - Card variant of glass surface with elevation
 */
export const GlassCard = forwardRef(
  ({ children, className, interactive = true, ...props }, ref) => (
    <GlassSurface
      ref={ref}
      className={clsx('card-glass', interactive && 'card-glass-interactive', className)}
      interactive={false}
      padding={false}
      {...props}
    >
      {children}
    </GlassSurface>
  )
);

GlassCard.displayName = 'GlassCard';

/**
 * GlassPanel - For sidebar/nav panels
 */
export const GlassPanel = forwardRef(
  ({ children, className, ...props }, ref) => (
    <GlassSurface
      ref={ref}
      depth="medium"
      rounded="none"
      className={className}
      {...props}
    >
      {children}
    </GlassSurface>
  )
);

GlassPanel.displayName = 'GlassPanel';

/**
 * GlassModal - For modal/overlay content
 */
export const GlassModal = forwardRef(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('modal-glass', className)}
      {...props}
    >
      {children}
    </div>
  )
);

GlassModal.displayName = 'GlassModal';
