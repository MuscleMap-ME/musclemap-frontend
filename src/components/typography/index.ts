/**
 * Typography Components - Knuth-Inspired Design System
 *
 * Central export for all typography components implementing
 * Donald Knuth's typographic principles.
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 *
 * @example
 * import { Text, Heading, H1, H2, Prose, Stat, Timer, Weight } from '@/components/typography';
 *
 * // Basic text
 * <Text variant="body">Paragraph text with optimal line breaking.</Text>
 *
 * // Headings
 * <H1>Hero Heading</H1>
 * <Heading level={2} variant="title">Custom visual variant</Heading>
 *
 * // Data display
 * <Stat value={1250} unit="kg" label="Total Volume" />
 * <Timer seconds={45} active />
 * <Weight value={100} unit="kg" />
 */

// Core Text component
export { Text, default as TextComponent } from './Text';
export type {
  TextProps,
  TextVariant,
  TextElement,
  TextWrap,
  TextAlign,
  NumericStyle,
  LigatureStyle,
  LineClamp,
} from './Text';

// Heading components
export { Heading, H1, H2, H3, H4, H5, H6 } from './Heading';
export type { HeadingProps, HeadingLevel, HeadingVariant } from './Heading';

// Prose (long-form content)
export { Prose, default as ProseComponent } from './Prose';
export type { ProseProps, ProseSize } from './Prose';

// Data display components
export {
  Stat,
  Timer,
  Weight,
  Reps,
  Percentage,
  Currency,
} from './DataDisplay';
export type {
  StatProps,
  TimerProps,
  WeightProps,
  RepsProps,
  PercentageProps,
  CurrencyProps,
} from './DataDisplay';
