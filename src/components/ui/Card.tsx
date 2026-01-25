/**
 * Card - Tier-Aware Card Component
 *
 * Knuth-inspired card that adapts to rendering tier:
 * - FULL: Glass morphism with blur, shadows, hover effects
 * - REDUCED: Solid background, no blur, static styling
 * - MINIMAL: Basic bordered card
 * - TEXT_ONLY: Semantic section with border
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 *
 * @example
 * import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui';
 *
 * // Basic usage
 * <Card>
 *   <CardBody>Content here</CardBody>
 * </Card>
 *
 * // With header and footer
 * <Card>
 *   <CardHeader>
 *     <h2>Title</h2>
 *   </CardHeader>
 *   <CardBody>
 *     <p>Card content</p>
 *   </CardBody>
 *   <CardFooter>
 *     <Button>Action</Button>
 *   </CardFooter>
 * </Card>
 *
 * // Interactive card (hover effects)
 * <Card interactive onClick={() => navigate('/details')}>
 *   <CardBody>Click me</CardBody>
 * </Card>
 *
 * // Variants
 * <Card variant="elevated">Raised card</Card>
 * <Card variant="outlined">Bordered card</Card>
 * <Card variant="glass">Glass card (full tier)</Card>
 */

import React, { forwardRef, useMemo } from 'react';
import clsx from 'clsx';
import { useRenderingTier, type RenderingTier } from '@/hooks/useRenderingTier';

// ============================================
// TYPES
// ============================================

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass' | 'filled';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Visual variant of the card
   * @default 'default'
   */
  variant?: CardVariant;

  /**
   * Enable hover/focus effects
   */
  interactive?: boolean;

  /**
   * Override padding (CardBody has its own padding)
   */
  padding?: CardPadding;

  /**
   * Force a specific rendering tier (for testing)
   */
  forceTier?: RenderingTier;

  /**
   * Render as a different element
   */
  as?: 'div' | 'article' | 'section' | 'aside' | 'a';
}

// ============================================
// STYLE DEFINITIONS
// ============================================

const BASE_STYLES = 'rounded-xl overflow-hidden';

/**
 * Variant styles for each card type by tier
 */
const VARIANT_STYLES: Record<CardVariant, Record<'full' | 'reduced' | 'minimal' | 'textOnly', string>> = {
  default: {
    full: `
      bg-[var(--glass-white-5)]
      border border-[var(--color-border)]
      backdrop-blur-md
      shadow-[var(--shadow-glass-sm)]
    `,
    reduced: `
      bg-[var(--color-bg-elevated)]
      border border-[var(--color-border)]
    `,
    minimal: `
      bg-[var(--color-bg-elevated)]
      border border-[var(--color-border)]
    `,
    textOnly: `
      border border-currentColor
      py-2
    `,
  },
  elevated: {
    full: `
      bg-[var(--glass-white-8)]
      border border-[var(--color-border)]
      backdrop-blur-lg
      shadow-[var(--shadow-glass-md)]
    `,
    reduced: `
      bg-[var(--color-bg-elevated)]
      border border-[var(--color-border)]
      shadow-md
    `,
    minimal: `
      bg-[var(--color-bg-elevated)]
      shadow-md
    `,
    textOnly: `
      border-2 border-currentColor
      py-2
    `,
  },
  outlined: {
    full: `
      bg-transparent
      border border-[var(--color-border)]
      hover:border-[var(--color-border-hover)]
    `,
    reduced: `
      bg-transparent
      border border-[var(--color-border)]
    `,
    minimal: `
      border border-[var(--color-border)]
    `,
    textOnly: `
      border border-currentColor
    `,
  },
  glass: {
    full: `
      bg-[var(--glass-white-5)]
      border border-[var(--color-border)]
      backdrop-blur-xl
      shadow-[var(--inner-glow-subtle),var(--shadow-glass-sm)]
    `,
    reduced: `
      bg-[var(--color-bg-elevated)]
      border border-[var(--color-border)]
    `,
    minimal: `
      bg-[var(--color-bg-elevated)]
      border border-[var(--color-border)]
    `,
    textOnly: `
      border border-currentColor
    `,
  },
  filled: {
    full: `
      bg-[var(--color-bg-elevated)]
      border border-transparent
    `,
    reduced: `
      bg-[var(--color-bg-elevated)]
    `,
    minimal: `
      bg-[var(--color-bg-elevated)]
    `,
    textOnly: '',
  },
};

/**
 * Interactive styles by tier
 */
const INTERACTIVE_STYLES: Record<'full' | 'reduced' | 'minimal' | 'textOnly', string> = {
  full: `
    cursor-pointer
    transition-all duration-200
    hover:bg-[var(--glass-white-8)]
    hover:border-[var(--color-border-hover)]
    hover:shadow-[var(--shadow-glass-md)]
    hover:-translate-y-1
    focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2
    active:scale-[0.99] active:translate-y-0
  `,
  reduced: `
    cursor-pointer
    hover:border-[var(--color-border-hover)]
    focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]
  `,
  minimal: `
    cursor-pointer
    focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]
  `,
  textOnly: `
    cursor-pointer
    text-decoration-underline
    focus:outline-none
  `,
};

/**
 * Padding styles
 */
const PADDING_STYLES: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

// ============================================
// HELPER: Get tier key for styles
// ============================================

function getTierKey(tier: RenderingTier): 'full' | 'reduced' | 'minimal' | 'textOnly' {
  switch (tier) {
    case 'full':
      return 'full';
    case 'reduced':
      return 'reduced';
    case 'minimal':
      return 'minimal';
    case 'text-only':
      return 'textOnly';
    default:
      return 'reduced';
  }
}

// ============================================
// CARD COMPONENT
// ============================================

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className,
      variant = 'default',
      interactive = false,
      padding = 'none',
      forceTier,
      as: Component = 'div',
      ...props
    },
    ref
  ) => {
    // Get current rendering tier
    const { tier } = useRenderingTier({ forceTier });
    const tierKey = getTierKey(tier);

    // Get styles based on tier
    const variantClass = useMemo(() => {
      return VARIANT_STYLES[variant]?.[tierKey] || VARIANT_STYLES.default[tierKey];
    }, [variant, tierKey]);

    const interactiveClass = useMemo(() => {
      return interactive ? INTERACTIVE_STYLES[tierKey] : '';
    }, [interactive, tierKey]);

    // For text-only tier, render minimal semantic structure
    if (tier === 'text-only') {
      return (
        <Component
          ref={ref as React.Ref<HTMLDivElement>}
          className={clsx('border border-current', className)}
          {...props}
        >
          {children}
        </Component>
      );
    }

    return (
      <Component
        ref={ref as React.Ref<HTMLDivElement>}
        className={clsx(
          BASE_STYLES,
          variantClass,
          interactiveClass,
          PADDING_STYLES[padding],
          className
        )}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'button' : undefined}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Card.displayName = 'Card';

// ============================================
// CARD HEADER
// ============================================

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Add border below header
   */
  divider?: boolean;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, divider = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'px-4 py-3 sm:px-6 sm:py-4',
          divider && 'border-b border-[var(--color-border)]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// ============================================
// CARD BODY
// ============================================

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Padding size
   * @default 'md'
   */
  padding?: CardPadding;
}

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className, padding = 'md', ...props }, ref) => {
    const paddingMap: Record<CardPadding, string> = {
      none: '',
      sm: 'p-3',
      md: 'p-4 sm:p-6',
      lg: 'p-6 sm:p-8',
      xl: 'p-8 sm:p-10',
    };

    return (
      <div
        ref={ref}
        className={clsx(paddingMap[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

// ============================================
// CARD FOOTER
// ============================================

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Add border above footer
   */
  divider?: boolean;

  /**
   * Align footer content
   * @default 'end'
   */
  align?: 'start' | 'center' | 'end' | 'between';
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, divider = false, align = 'end', ...props }, ref) => {
    const alignMap = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    };

    return (
      <div
        ref={ref}
        className={clsx(
          'px-4 py-3 sm:px-6 sm:py-4',
          'flex items-center gap-3',
          alignMap[align],
          divider && 'border-t border-[var(--color-border)]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export default Card;
