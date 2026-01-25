/**
 * Heading Components - Semantic Heading Hierarchy
 *
 * Pre-configured heading components that ensure proper semantic HTML
 * while allowing visual customization via variants.
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 */

import React from 'react';
import { Text, TextProps, TextVariant } from './Text';

/**
 * Heading levels
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Visual variant for headings (can differ from semantic level)
 */
export type HeadingVariant = 'hero' | 'title' | 'heading' | 'subheading';

/**
 * Props for heading components
 */
export interface HeadingProps extends Omit<TextProps, 'variant' | 'as'> {
  /**
   * Semantic heading level (h1-h6)
   */
  level?: HeadingLevel;

  /**
   * Visual variant (can differ from level for design flexibility)
   */
  variant?: HeadingVariant;
}

/**
 * Map heading levels to default variants
 */
const LEVEL_TO_VARIANT: Record<HeadingLevel, HeadingVariant> = {
  1: 'hero',
  2: 'title',
  3: 'heading',
  4: 'subheading',
  5: 'subheading',
  6: 'subheading',
};

/**
 * Heading component with semantic level and visual variant
 */
export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ level = 2, variant, children, ...props }, ref) => {
    const visualVariant = variant || LEVEL_TO_VARIANT[level];
    const element = `h${level}` as TextProps['as'];

    return (
      <Text
        ref={ref as React.Ref<HTMLElement>}
        as={element}
        variant={visualVariant as TextVariant}
        {...props}
      >
        {children}
      </Text>
    );
  }
);

Heading.displayName = 'Heading';

/**
 * Pre-configured heading components for convenience
 */
export const H1 = React.forwardRef<HTMLHeadingElement, Omit<HeadingProps, 'level'>>(
  (props, ref) => <Heading ref={ref} level={1} {...props} />
);
H1.displayName = 'H1';

export const H2 = React.forwardRef<HTMLHeadingElement, Omit<HeadingProps, 'level'>>(
  (props, ref) => <Heading ref={ref} level={2} {...props} />
);
H2.displayName = 'H2';

export const H3 = React.forwardRef<HTMLHeadingElement, Omit<HeadingProps, 'level'>>(
  (props, ref) => <Heading ref={ref} level={3} {...props} />
);
H3.displayName = 'H3';

export const H4 = React.forwardRef<HTMLHeadingElement, Omit<HeadingProps, 'level'>>(
  (props, ref) => <Heading ref={ref} level={4} {...props} />
);
H4.displayName = 'H4';

export const H5 = React.forwardRef<HTMLHeadingElement, Omit<HeadingProps, 'level'>>(
  (props, ref) => <Heading ref={ref} level={5} {...props} />
);
H5.displayName = 'H5';

export const H6 = React.forwardRef<HTMLHeadingElement, Omit<HeadingProps, 'level'>>(
  (props, ref) => <Heading ref={ref} level={6} {...props} />
);
H6.displayName = 'H6';

export default Heading;
