/**
 * Stack Component - Vertical Rhythm Layout
 *
 * A layout primitive for vertical stacking with consistent spacing.
 * Inspired by Knuth's box-and-glue model.
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 */

import React from 'react';
import { cn } from '@/utils/cn';

/**
 * Spacing scale
 */
export type StackSpace = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

/**
 * Stack alignment
 */
export type StackAlign = 'start' | 'center' | 'end' | 'stretch';

/**
 * Stack props
 */
export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Spacing between items
   */
  space?: StackSpace;

  /**
   * Horizontal alignment of items
   */
  align?: StackAlign;

  /**
   * Add dividers between items
   */
  dividers?: boolean;

  /**
   * Render as different element
   */
  as?: 'div' | 'section' | 'article' | 'main' | 'aside' | 'nav' | 'ul' | 'ol';

  /**
   * Children
   */
  children: React.ReactNode;
}

/**
 * Space class mapping
 */
const SPACE_CLASSES: Record<StackSpace, string> = {
  xs: 'stack-xs',
  sm: 'stack-sm',
  md: 'stack-md',
  lg: 'stack-lg',
  xl: 'stack-xl',
  '2xl': 'stack-2xl',
  '3xl': 'stack-3xl',
};

/**
 * Alignment class mapping
 */
const ALIGN_CLASSES: Record<StackAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

/**
 * Stack component for vertical layouts
 */
export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  (
    {
      space = 'md',
      align = 'stretch',
      dividers = false,
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
          'stack',
          SPACE_CLASSES[space],
          ALIGN_CLASSES[align],
          dividers && 'stack-divided',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Stack.displayName = 'Stack';

export default Stack;
