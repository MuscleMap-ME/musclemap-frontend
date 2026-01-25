/**
 * Sidebar Component - Content with Sidebar Layout
 *
 * A layout primitive for main content with a sticky sidebar.
 * Automatically collapses to stacked layout on narrow screens.
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 */

import React from 'react';
import { cn } from '@/utils/cn';

/**
 * Sidebar width
 */
export type SidebarWidth = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Sidebar position
 */
export type SidebarPosition = 'start' | 'end';

/**
 * Gap sizes
 */
export type SidebarGap = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Sidebar props
 */
export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Sidebar width
   */
  sidebarWidth?: SidebarWidth;

  /**
   * Sidebar position
   */
  position?: SidebarPosition;

  /**
   * Gap between sidebar and content
   */
  gap?: SidebarGap;

  /**
   * Minimum content width (percentage)
   */
  minContentWidth?: number;

  /**
   * Reverse order (content first on mobile)
   */
  contentFirst?: boolean;

  /**
   * Children (should be exactly 2 elements)
   */
  children: React.ReactNode;
}

/**
 * Width class mapping
 */
const WIDTH_CLASSES: Record<SidebarWidth, string> = {
  xs: '[--sidebar-width:12rem]',
  sm: '[--sidebar-width:14rem]',
  md: '[--sidebar-width:16rem]',
  lg: '[--sidebar-width:20rem]',
  xl: '[--sidebar-width:24rem]',
};

/**
 * Gap class mapping
 */
const GAP_CLASSES: Record<SidebarGap, string> = {
  sm: '[--sidebar-gap:var(--space-2)]',
  md: '[--sidebar-gap:var(--space-4)]',
  lg: '[--sidebar-gap:var(--space-6)]',
  xl: '[--sidebar-gap:var(--space-8)]',
};

/**
 * Sidebar component
 */
export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      sidebarWidth = 'md',
      position = 'start',
      gap = 'md',
      minContentWidth = 50,
      contentFirst = true,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'sidebar-layout',
          position === 'end' && 'sidebar-layout-end',
          WIDTH_CLASSES[sidebarWidth],
          GAP_CLASSES[gap],
          className
        )}
        style={{
          ...style,
          '--sidebar-min-content': `${minContentWidth}%`,
        } as React.CSSProperties}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Sidebar.displayName = 'Sidebar';

/**
 * SidebarContent - The main content area
 */
export interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const SidebarContent = React.forwardRef<HTMLDivElement, SidebarContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex-1 min-w-0', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SidebarContent.displayName = 'SidebarContent';

/**
 * SidebarPanel - The sidebar panel
 */
export interface SidebarPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Make sidebar sticky
   */
  sticky?: boolean;

  /**
   * Top offset for sticky positioning
   */
  stickyTop?: string;

  children: React.ReactNode;
}

export const SidebarPanel = React.forwardRef<HTMLDivElement, SidebarPanelProps>(
  ({ sticky = false, stickyTop = '1rem', className, style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex-shrink-0',
          sticky && 'sticky self-start',
          className
        )}
        style={{
          ...style,
          ...(sticky && { top: stickyTop }),
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SidebarPanel.displayName = 'SidebarPanel';

export default Sidebar;
