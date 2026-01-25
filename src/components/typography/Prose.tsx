/**
 * Prose Component - Long-form Content Typography
 *
 * A container component that applies proper typography styles
 * to long-form content like blog posts, help text, and documentation.
 *
 * Implements Knuth's typographic principles:
 * - Optimal line breaking
 * - Proper spacing between elements
 * - Correct heading hierarchy
 * - Beautiful blockquotes and lists
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 */

import React from 'react';
import { cn } from '@/utils/cn';

/**
 * Prose size variants
 */
export type ProseSize = 'sm' | 'base' | 'lg' | 'xl';

/**
 * Props for the Prose component
 */
export interface ProseProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Size variant affects font size and spacing
   */
  size?: ProseSize;

  /**
   * Enable dark mode optimizations (inverted from default dark-first)
   */
  lightMode?: boolean;

  /**
   * Maximum width in characters (65ch is optimal for readability)
   */
  maxWidth?: number | 'prose' | 'narrow' | 'wide' | 'full';

  /**
   * Center the prose block
   */
  centered?: boolean;

  /**
   * Content to render
   */
  children: React.ReactNode;
}

/**
 * Size class mappings
 */
const SIZE_CLASSES: Record<ProseSize, string> = {
  sm: 'text-sm [&>p]:leading-6',
  base: 'text-base [&>p]:leading-7',
  lg: 'text-lg [&>p]:leading-8',
  xl: 'text-xl [&>p]:leading-9',
};

/**
 * Max width classes
 */
const MAX_WIDTH_CLASSES: Record<string, string> = {
  prose: 'max-w-[65ch]',
  narrow: 'max-w-[45ch]',
  wide: 'max-w-[80ch]',
  full: 'max-w-full',
};

/**
 * Prose component for long-form content
 */
export const Prose = React.forwardRef<HTMLDivElement, ProseProps>(
  (
    {
      size = 'base',
      lightMode = false,
      maxWidth = 'prose',
      centered = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const maxWidthClass =
      typeof maxWidth === 'number'
        ? `max-w-[${maxWidth}ch]`
        : MAX_WIDTH_CLASSES[maxWidth];

    return (
      <div
        ref={ref}
        className={cn(
          // Base prose styles
          'prose',

          // Size
          SIZE_CLASSES[size],

          // Max width
          maxWidthClass,

          // Centering
          centered && 'mx-auto',

          // Light mode (we're dark-first, so this inverts)
          lightMode && 'prose-invert',

          // Custom classes
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Prose.displayName = 'Prose';

export default Prose;
