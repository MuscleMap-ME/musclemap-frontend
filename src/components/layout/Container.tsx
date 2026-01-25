/**
 * Container Component - Width-Constrained Layout
 *
 * A layout primitive that constrains content width and centers it.
 * Provides consistent horizontal padding across breakpoints.
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 */

import React from 'react';
import { cn } from '@/utils/cn';

/**
 * Container size presets
 */
export type ContainerSize =
  | 'xs'    // 320px
  | 'sm'    // 384px
  | 'md'    // 448px
  | 'lg'    // 512px
  | 'xl'    // 576px
  | '2xl'   // 672px
  | '3xl'   // 768px
  | '4xl'   // 896px
  | '5xl'   // 1024px
  | '6xl'   // 1152px
  | '7xl'   // 1280px
  | 'prose' // 65ch
  | 'wide'  // 80ch
  | 'full'; // 100%

/**
 * Container padding
 */
export type ContainerPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Container props
 */
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Maximum width
   */
  size?: ContainerSize;

  /**
   * Horizontal padding
   */
  padding?: ContainerPadding;

  /**
   * Center the container
   */
  centered?: boolean;

  /**
   * Render as different element
   */
  as?: 'div' | 'section' | 'main' | 'article' | 'header' | 'footer' | 'aside';

  /**
   * Children
   */
  children: React.ReactNode;
}

/**
 * Size class mapping
 */
const SIZE_CLASSES: Record<ContainerSize, string> = {
  xs: 'container-xs',
  sm: 'container-sm',
  md: 'container-md',
  lg: 'container-lg',
  xl: 'container-xl',
  '2xl': 'container-2xl',
  '3xl': 'container-3xl',
  '4xl': 'container-4xl',
  '5xl': 'container-5xl',
  '6xl': 'container-6xl',
  '7xl': 'container-7xl',
  prose: 'container-prose',
  wide: 'container-wide',
  full: 'container-full',
};

/**
 * Padding class mapping
 */
const PADDING_CLASSES: Record<ContainerPadding, string> = {
  none: 'px-0',
  sm: 'px-2 sm:px-4',
  md: 'px-4 sm:px-6',
  lg: 'px-4 sm:px-8',
  xl: 'px-4 sm:px-8 lg:px-12',
};

/**
 * Container component
 */
export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      size = '6xl',
      padding = 'md',
      centered = true,
      as: Component = 'div',
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref}
        className={cn(
          'container',
          SIZE_CLASSES[size],
          PADDING_CLASSES[padding],
          centered && 'mx-auto',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Container.displayName = 'Container';

export default Container;
