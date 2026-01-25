/**
 * Split Component - Two-Item Separated Layout
 *
 * A layout primitive that places two items at opposite ends.
 * Perfect for headers with left/right content, nav bars, etc.
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 */

import React from 'react';
import { cn } from '@/utils/cn';

/**
 * Split gap sizes
 */
export type SplitGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Split alignment
 */
export type SplitAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch';

/**
 * Split props
 */
export interface SplitProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Gap between items when wrapped
   */
  gap?: SplitGap;

  /**
   * Vertical alignment
   */
  align?: SplitAlign;

  /**
   * Reverse the order (end item first on desktop)
   */
  reverse?: boolean;

  /**
   * Allow wrapping on small screens
   */
  wrap?: boolean;

  /**
   * Render as different element
   */
  as?: 'div' | 'header' | 'footer' | 'nav';

  /**
   * Children (should be exactly 2 elements)
   */
  children: React.ReactNode;
}

/**
 * Gap class mapping
 */
const GAP_CLASSES: Record<SplitGap, string> = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

/**
 * Align class mapping
 */
const ALIGN_CLASSES: Record<SplitAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
  stretch: 'items-stretch',
};

/**
 * Split component
 */
export const Split = React.forwardRef<HTMLDivElement, SplitProps>(
  (
    {
      gap = 'md',
      align = 'center',
      reverse = false,
      wrap = true,
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
          'split',
          GAP_CLASSES[gap],
          ALIGN_CLASSES[align],
          reverse && 'flex-row-reverse',
          !wrap && 'flex-nowrap',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Split.displayName = 'Split';

export default Split;
