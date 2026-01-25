/**
 * Cluster Component - Horizontal Wrapping Layout
 *
 * A layout primitive for horizontal arrangements that wrap.
 * Perfect for tags, buttons, and other inline elements.
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 */

import React from 'react';
import { cn } from '@/utils/cn';

/**
 * Spacing scale
 */
export type ClusterSpace = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Horizontal alignment
 */
export type ClusterJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

/**
 * Vertical alignment
 */
export type ClusterAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch';

/**
 * Cluster props
 */
export interface ClusterProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Gap between items
   */
  space?: ClusterSpace;

  /**
   * Horizontal alignment
   */
  justify?: ClusterJustify;

  /**
   * Vertical alignment
   */
  align?: ClusterAlign;

  /**
   * Disable wrapping
   */
  nowrap?: boolean;

  /**
   * Render as different element
   */
  as?: 'div' | 'nav' | 'ul' | 'ol';

  /**
   * Children
   */
  children: React.ReactNode;
}

/**
 * Space class mapping
 */
const SPACE_CLASSES: Record<ClusterSpace, string> = {
  xs: 'cluster-xs',
  sm: 'cluster-sm',
  md: 'cluster-md',
  lg: 'cluster-lg',
  xl: 'cluster-xl',
};

/**
 * Justify class mapping
 */
const JUSTIFY_CLASSES: Record<ClusterJustify, string> = {
  start: 'cluster-start',
  center: 'cluster-center',
  end: 'cluster-end',
  between: 'cluster-between',
  around: 'cluster-around',
  evenly: 'cluster-evenly',
};

/**
 * Align class mapping
 */
const ALIGN_CLASSES: Record<ClusterAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
  stretch: 'items-stretch',
};

/**
 * Cluster component for horizontal wrapping layouts
 */
export const Cluster = React.forwardRef<HTMLDivElement, ClusterProps>(
  (
    {
      space = 'md',
      justify = 'start',
      align = 'center',
      nowrap = false,
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
          'cluster',
          SPACE_CLASSES[space],
          JUSTIFY_CLASSES[justify],
          ALIGN_CLASSES[align],
          nowrap && 'flex-nowrap',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Cluster.displayName = 'Cluster';

export default Cluster;
