/**
 * DataDisplay Components - Numeric and Data Typography
 *
 * Specialized components for displaying numeric data, statistics,
 * timers, and other data-focused content with proper typography.
 *
 * Uses tabular figures and other numeric OpenType features for
 * proper alignment and readability in data-heavy contexts.
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 */

import React from 'react';
import { cn } from '@/utils/cn';
import { Text, TextProps } from './Text';

/**
 * Common props for data display components
 */
interface DataDisplayBaseProps extends Omit<TextProps, 'variant' | 'numeric'> {
  /**
   * The value to display
   */
  value: string | number;

  /**
   * Unit suffix (e.g., "kg", "lbs", "%")
   */
  unit?: string;

  /**
   * Prefix (e.g., "$", "#")
   */
  prefix?: string;

  /**
   * Use smaller unit text
   */
  smallUnit?: boolean;
}

/**
 * Stat - For displaying statistics and metrics
 */
export interface StatProps extends DataDisplayBaseProps {
  /**
   * Label above or below the stat
   */
  label?: string;

  /**
   * Label position
   */
  labelPosition?: 'above' | 'below';

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
}

const STAT_SIZES = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
  xl: 'text-5xl',
  hero: 'text-6xl',
};

export const Stat = React.forwardRef<HTMLDivElement, StatProps>(
  (
    {
      value,
      unit,
      prefix,
      smallUnit = true,
      label,
      labelPosition = 'below',
      size = 'lg',
      className,
      ...props
    },
    ref
  ) => {
    const valueElement = (
      <span className={cn('font-mono font-semibold', STAT_SIZES[size])}>
        {prefix && <span className="opacity-70">{prefix}</span>}
        <span className="tabular-nums">{value}</span>
        {unit && (
          <span className={cn('ml-1', smallUnit ? 'text-[0.6em] opacity-70' : '')}>
            {unit}
          </span>
        )}
      </span>
    );

    return (
      <div
        ref={ref}
        className={cn('flex flex-col items-start gap-1', className)}
        {...props}
      >
        {label && labelPosition === 'above' && (
          <Text variant="label" color="muted">
            {label}
          </Text>
        )}
        {valueElement}
        {label && labelPosition === 'below' && (
          <Text variant="label" color="muted">
            {label}
          </Text>
        )}
      </div>
    );
  }
);

Stat.displayName = 'Stat';

/**
 * Timer - For countdown/count-up timers
 */
export interface TimerProps extends Omit<DataDisplayBaseProps, 'value' | 'unit' | 'prefix'> {
  /**
   * Time in seconds
   */
  seconds: number;

  /**
   * Show hours if > 0
   */
  showHours?: boolean;

  /**
   * Show milliseconds
   */
  showMilliseconds?: boolean;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Active/running state (for styling)
   */
  active?: boolean;
}

const TIMER_SIZES = {
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-5xl',
  xl: 'text-7xl',
};

export const Timer = React.forwardRef<HTMLTimeElement, TimerProps>(
  (
    {
      seconds,
      showHours = false,
      showMilliseconds = false,
      size = 'lg',
      active = false,
      className,
      ...props
    },
    ref
  ) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);

    const pad = (n: number) => n.toString().padStart(2, '0');

    const parts: string[] = [];
    if (showHours || hours > 0) {
      parts.push(pad(hours));
    }
    parts.push(pad(minutes));
    parts.push(pad(secs));

    const timeString = parts.join(':');
    const msString = showMilliseconds ? `.${pad(ms)}` : '';

    return (
      <time
        ref={ref}
        className={cn(
          'font-mono font-semibold tracking-wider tabular-nums slashed-zero',
          TIMER_SIZES[size],
          active && 'text-[var(--color-primary)]',
          className
        )}
        dateTime={`PT${seconds}S`}
        {...props}
      >
        {timeString}
        {showMilliseconds && (
          <span className="text-[0.6em] opacity-70">{msString}</span>
        )}
      </time>
    );
  }
);

Timer.displayName = 'Timer';

/**
 * Weight - For displaying weight values
 */
export interface WeightProps extends Omit<DataDisplayBaseProps, 'value'> {
  /**
   * Weight value
   */
  value: number;

  /**
   * Unit (defaults to user preference)
   */
  unit?: 'kg' | 'lbs';

  /**
   * Decimal places
   */
  decimals?: number;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

const WEIGHT_SIZES = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
};

export const Weight = React.forwardRef<HTMLElement, WeightProps>(
  (
    {
      value,
      unit = 'kg',
      decimals = 1,
      size = 'md',
      smallUnit = true,
      className,
      ...props
    },
    ref
  ) => {
    const formattedValue = value.toFixed(decimals);

    return (
      <Text
        ref={ref}
        variant="weight"
        className={cn(WEIGHT_SIZES[size], className)}
        numeric="tabular"
        {...props}
      >
        {formattedValue}
        {unit && (
          <span className={cn('ml-0.5', smallUnit ? 'text-[0.7em] opacity-70' : '')}>
            {unit}
          </span>
        )}
      </Text>
    );
  }
);

Weight.displayName = 'Weight';

/**
 * Reps - For displaying rep counts
 */
export interface RepsProps extends Omit<DataDisplayBaseProps, 'value' | 'unit'> {
  /**
   * Number of reps
   */
  count: number;

  /**
   * Show "reps" suffix
   */
  showLabel?: boolean;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

const REPS_SIZES = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
};

export const Reps = React.forwardRef<HTMLElement, RepsProps>(
  (
    {
      count,
      showLabel = false,
      size = 'md',
      className,
      ...props
    },
    ref
  ) => {
    return (
      <Text
        ref={ref}
        variant="weight"
        className={cn(REPS_SIZES[size], className)}
        numeric="tabular"
        {...props}
      >
        {count}
        {showLabel && (
          <span className="ml-1 text-[0.6em] opacity-70">
            {count === 1 ? 'rep' : 'reps'}
          </span>
        )}
      </Text>
    );
  }
);

Reps.displayName = 'Reps';

/**
 * Percentage - For displaying percentages
 */
export interface PercentageProps extends Omit<DataDisplayBaseProps, 'value' | 'unit'> {
  /**
   * Percentage value (0-100 or 0-1 depending on normalized)
   */
  value: number;

  /**
   * Value is normalized (0-1) instead of (0-100)
   */
  normalized?: boolean;

  /**
   * Decimal places
   */
  decimals?: number;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

const PERCENTAGE_SIZES = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
};

export const Percentage = React.forwardRef<HTMLElement, PercentageProps>(
  (
    {
      value,
      normalized = false,
      decimals = 0,
      size = 'md',
      className,
      ...props
    },
    ref
  ) => {
    const displayValue = normalized ? value * 100 : value;
    const formattedValue = displayValue.toFixed(decimals);

    return (
      <Text
        ref={ref}
        variant="data"
        className={cn(PERCENTAGE_SIZES[size], className)}
        numeric="tabular"
        {...props}
      >
        {formattedValue}
        <span className="text-[0.7em] opacity-70">%</span>
      </Text>
    );
  }
);

Percentage.displayName = 'Percentage';

/**
 * Currency - For displaying monetary values
 */
export interface CurrencyProps extends Omit<DataDisplayBaseProps, 'value' | 'prefix'> {
  /**
   * Monetary value
   */
  value: number;

  /**
   * Currency code (ISO 4217)
   */
  currency?: string;

  /**
   * Locale for formatting
   */
  locale?: string;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

const CURRENCY_SIZES = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
};

export const Currency = React.forwardRef<HTMLElement, CurrencyProps>(
  (
    {
      value,
      currency = 'USD',
      locale = 'en-US',
      size = 'md',
      className,
      ...props
    },
    ref
  ) => {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(value);

    return (
      <Text
        ref={ref}
        variant="data"
        className={cn(CURRENCY_SIZES[size], className)}
        numeric="tabular"
        {...props}
      >
        {formatted}
      </Text>
    );
  }
);

Currency.displayName = 'Currency';

export default {
  Stat,
  Timer,
  Weight,
  Reps,
  Percentage,
  Currency,
};
