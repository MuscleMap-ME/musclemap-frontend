/**
 * Grid Component - Responsive Grid Layout
 *
 * A layout primitive for responsive grid layouts.
 * Supports auto-fit grids and fixed column counts.
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 */

import React from 'react';
import { cn } from '@/utils/cn';

/**
 * Minimum column widths for auto-fit grids
 */
export type GridMinWidth = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Fixed column counts
 */
export type GridColumns = 2 | 3 | 4 | 5 | 6 | 'auto';

/**
 * Gap sizes
 */
export type GridGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Grid props
 */
export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of columns (or 'auto' for auto-fit)
   */
  columns?: GridColumns;

  /**
   * Minimum column width (for auto-fit grids)
   */
  minWidth?: GridMinWidth;

  /**
   * Gap between items
   */
  gap?: GridGap;

  /**
   * Place items alignment
   */
  placeItems?: 'start' | 'center' | 'end' | 'stretch';

  /**
   * Enable container queries
   */
  containerQuery?: boolean;

  /**
   * Render as different element
   */
  as?: 'div' | 'section' | 'main' | 'ul' | 'ol';

  /**
   * Children
   */
  children: React.ReactNode;
}

/**
 * Min width class mapping
 */
const MIN_WIDTH_CLASSES: Record<GridMinWidth, string> = {
  xs: 'auto-grid-xs',
  sm: 'auto-grid-sm',
  md: 'auto-grid-md',
  lg: 'auto-grid-lg',
  xl: 'auto-grid-xl',
};

/**
 * Column class mapping
 */
const COLUMN_CLASSES: Record<string, string> = {
  '2': 'grid-2',
  '3': 'grid-3',
  '4': 'grid-4',
  '5': 'grid-5',
  '6': 'grid-6',
};

/**
 * Gap class mapping
 */
const GAP_CLASSES: Record<GridGap, string> = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
  '2xl': 'gap-12',
};

/**
 * Place items class mapping
 */
const PLACE_ITEMS_CLASSES: Record<string, string> = {
  start: 'place-items-start',
  center: 'place-items-center',
  end: 'place-items-end',
  stretch: 'place-items-stretch',
};

/**
 * Grid component for responsive layouts
 */
export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  (
    {
      columns = 'auto',
      minWidth = 'md',
      gap = 'md',
      placeItems,
      containerQuery = false,
      as: Component = 'div',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isAutoFit = columns === 'auto';

    return (
      <Component
        ref={ref}
        className={cn(
          // Base grid styles
          isAutoFit ? 'auto-grid' : 'grid',

          // Auto-fit min width
          isAutoFit && MIN_WIDTH_CLASSES[minWidth],

          // Fixed columns
          !isAutoFit && COLUMN_CLASSES[String(columns)],

          // Gap
          GAP_CLASSES[gap],

          // Place items
          placeItems && PLACE_ITEMS_CLASSES[placeItems],

          // Container query support
          containerQuery && 'container-query',

          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Grid.displayName = 'Grid';

/**
 * GridItem - For spanning multiple columns/rows
 */
export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Column span
   */
  colSpan?: number | 'full';

  /**
   * Row span
   */
  rowSpan?: number;

  /**
   * Column start
   */
  colStart?: number;

  /**
   * Row start
   */
  rowStart?: number;

  /**
   * Children
   */
  children: React.ReactNode;
}

export const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  (
    {
      colSpan,
      rowSpan,
      colStart,
      rowStart,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const customStyle: React.CSSProperties = {
      ...style,
      ...(colSpan && { gridColumn: colSpan === 'full' ? '1 / -1' : `span ${colSpan}` }),
      ...(rowSpan && { gridRow: `span ${rowSpan}` }),
      ...(colStart && { gridColumnStart: colStart }),
      ...(rowStart && { gridRowStart: rowStart }),
    };

    return (
      <div
        ref={ref}
        className={className}
        style={customStyle}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GridItem.displayName = 'GridItem';

export default Grid;
