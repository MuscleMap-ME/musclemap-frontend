/**
 * Text Component - Knuth-Inspired Typography System
 *
 * A polymorphic text component that implements the parametric typography system.
 * Supports all text variants, semantic HTML elements, and accessibility features.
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 */

import React from 'react';
import { cn } from '@/utils/cn';

/**
 * Text variant types matching our typography system
 */
export type TextVariant =
  | 'hero'      // Display text at maximum size
  | 'title'     // Section titles
  | 'heading'   // Subsection headings
  | 'subheading'
  | 'body'      // Default paragraph style
  | 'caption'   // Small descriptive text
  | 'micro'     // Smallest legible text
  | 'data'      // Statistics and metrics
  | 'data-hero' // Large metrics display
  | 'timer'     // Workout timers
  | 'weight'    // Weight/reps display
  | 'code'      // Technical text
  | 'label'     // Form labels
  | 'overline'  // Small caps above titles
  | 'quote';    // Blockquotes

/**
 * Semantic HTML element types
 */
export type TextElement =
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'p' | 'span' | 'div'
  | 'strong' | 'em' | 'small' | 'mark'
  | 'code' | 'pre' | 'kbd' | 'samp'
  | 'blockquote' | 'cite'
  | 'label' | 'legend'
  | 'time' | 'data' | 'abbr';

/**
 * Text wrapping behavior
 */
export type TextWrap = 'balance' | 'pretty' | 'nowrap' | 'wrap';

/**
 * Text alignment
 */
export type TextAlign = 'start' | 'end' | 'center' | 'justify';

/**
 * Numeric formatting options
 */
export type NumericStyle =
  | 'tabular'      // Equal-width numbers (for tables)
  | 'proportional' // Normal-width numbers
  | 'lining'       // Numbers aligned to baseline
  | 'oldstyle'     // Numbers with descenders
  | 'slashed-zero' // Zero with slash
  | 'fractions';   // Diagonal fractions

/**
 * Ligature settings
 */
export type LigatureStyle = 'none' | 'common' | 'discretionary';

/**
 * Line clamping
 */
export type LineClamp = 1 | 2 | 3 | 4 | 'none';

/**
 * Props for the Text component
 */
export interface TextProps extends Omit<React.HTMLAttributes<HTMLElement>, 'color'> {
  /**
   * Text variant - determines font family, size, weight, and features
   */
  variant?: TextVariant;

  /**
   * HTML element to render (defaults based on variant)
   */
  as?: TextElement;

  /**
   * Text color (semantic names)
   */
  color?: 'primary' | 'secondary' | 'muted' | 'subtle' | 'disabled' | 'accent' | 'success' | 'warning' | 'error';

  /**
   * Text wrapping behavior
   */
  wrap?: TextWrap;

  /**
   * Text alignment
   */
  align?: TextAlign;

  /**
   * Enable truncation with ellipsis
   */
  truncate?: boolean;

  /**
   * Line clamping (multi-line truncation)
   */
  lineClamp?: LineClamp;

  /**
   * Maximum character width (ch units)
   */
  maxWidth?: number | 'prose' | 'narrow' | 'wide' | 'none';

  /**
   * Numeric formatting
   */
  numeric?: NumericStyle;

  /**
   * Ligature control
   */
  ligatures?: LigatureStyle;

  /**
   * Enable optical sizing (variable fonts)
   */
  opticalSizing?: boolean;

  /**
   * Small caps rendering
   */
  smallCaps?: boolean | 'all';

  /**
   * Monospace override
   */
  mono?: boolean;

  /**
   * Serif override
   */
  serif?: boolean;

  /**
   * Children content
   */
  children: React.ReactNode;
}

/**
 * Default element mapping for each variant
 */
const VARIANT_ELEMENTS: Record<TextVariant, TextElement> = {
  hero: 'h1',
  title: 'h2',
  heading: 'h3',
  subheading: 'h4',
  body: 'p',
  caption: 'p',
  micro: 'span',
  data: 'span',
  'data-hero': 'span',
  timer: 'time',
  weight: 'data',
  code: 'code',
  label: 'label',
  overline: 'span',
  quote: 'blockquote',
};

/**
 * CSS classes for each variant
 */
const VARIANT_CLASSES: Record<TextVariant, string> = {
  hero: 'text-hero',
  title: 'text-title',
  heading: 'text-heading',
  subheading: 'text-subheading',
  body: 'text-body',
  caption: 'text-caption',
  micro: 'text-micro',
  data: 'text-data',
  'data-hero': 'text-data-hero',
  timer: 'text-timer',
  weight: 'text-weight',
  code: 'text-code',
  label: 'text-label',
  overline: 'text-overline',
  quote: 'text-quote',
};

/**
 * Color classes
 */
const COLOR_CLASSES: Record<NonNullable<TextProps['color']>, string> = {
  primary: 'text-[color:var(--color-text)]',
  secondary: 'text-[color:var(--color-text-muted)]',
  muted: 'text-[color:var(--color-text-muted)]',
  subtle: 'text-[color:var(--color-text-subtle)]',
  disabled: 'opacity-50',
  accent: 'text-[color:var(--color-primary)]',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
};

/**
 * Text component with Knuth-inspired typography
 */
export const Text = React.forwardRef<HTMLElement, TextProps>(
  (
    {
      variant = 'body',
      as,
      color,
      wrap,
      align,
      truncate,
      lineClamp,
      maxWidth,
      numeric,
      ligatures,
      opticalSizing = true,
      smallCaps,
      mono,
      serif,
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Determine the element to render
    const Element = as || VARIANT_ELEMENTS[variant];

    // Build class list
    const classes = cn(
      // Base variant class
      VARIANT_CLASSES[variant],

      // Color
      color && COLOR_CLASSES[color],

      // Wrap
      wrap === 'balance' && 'text-balance',
      wrap === 'pretty' && 'text-pretty',
      wrap === 'nowrap' && 'text-nowrap',

      // Alignment
      align === 'start' && 'text-start',
      align === 'end' && 'text-end',
      align === 'center' && 'text-center',
      align === 'justify' && 'text-justify',

      // Truncation
      truncate && 'truncate',
      lineClamp === 1 && 'line-clamp-1',
      lineClamp === 2 && 'line-clamp-2',
      lineClamp === 3 && 'line-clamp-3',
      lineClamp === 4 && 'line-clamp-4',

      // Max width
      maxWidth === 'prose' && 'max-w-prose',
      maxWidth === 'narrow' && 'max-w-narrow',
      maxWidth === 'wide' && 'max-w-wide',
      typeof maxWidth === 'number' && `max-w-[${maxWidth}ch]`,

      // Numeric styles
      numeric === 'tabular' && 'nums-tabular',
      numeric === 'proportional' && 'nums-proportional',
      numeric === 'lining' && 'nums-lining',
      numeric === 'oldstyle' && 'nums-oldstyle',
      numeric === 'slashed-zero' && 'nums-slashed-zero',
      numeric === 'fractions' && 'nums-fractions',

      // Ligatures
      ligatures === 'none' && 'ligatures-none',
      ligatures === 'common' && 'ligatures-common',
      ligatures === 'discretionary' && 'ligatures-discretionary',

      // Optical sizing
      !opticalSizing && 'optical-size-none',

      // Small caps
      smallCaps === true && 'small-caps',
      smallCaps === 'all' && 'all-small-caps',

      // Font family overrides
      mono && 'font-mono',
      serif && 'font-serif',

      // Custom classes
      className
    );

    return React.createElement(
      Element,
      {
        ref,
        className: classes,
        ...props,
      },
      children
    );
  }
);

Text.displayName = 'Text';

export default Text;
