/**
 * Switch Component - Tier-Aware Toggle Switch
 *
 * Knuth-inspired component that adapts to rendering tier:
 * - FULL: Smooth animations, glassmorphism track
 * - REDUCED: Styling without animations
 * - MINIMAL: Basic CSS toggle
 * - TEXT_ONLY: Checkbox fallback
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 *
 * @example
 * <Switch
 *   checked={darkMode}
 *   onChange={setDarkMode}
 *   label="Dark Mode"
 * />
 */

import React, { useId, useCallback } from 'react';
import { useRenderingTier, RenderingTier } from '@/hooks/useRenderingTier';

export type SwitchSize = 'sm' | 'md' | 'lg';

export interface SwitchProps {
  /** Whether the switch is checked */
  checked: boolean;
  /** Change handler */
  onChange: (checked: boolean) => void;
  /** Optional label */
  label?: string;
  /** Label position */
  labelPosition?: 'left' | 'right';
  /** Size variant */
  size?: SwitchSize;
  /** Disabled state */
  disabled?: boolean;
  /** Helper text */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Additional class name */
  className?: string;
  /** ARIA label for accessibility */
  'aria-label'?: string;
  /** Form name */
  name?: string;
}

// Size configurations - all meet 44px touch target
const sizeConfig: Record<SwitchSize, { track: string; thumb: string; translate: string }> = {
  sm: {
    track: 'w-11 h-6',      // 44px x 24px (44px touch area)
    thumb: 'w-5 h-5',       // 20px thumb
    translate: 'translate-x-5',
  },
  md: {
    track: 'w-14 h-7',      // 56px x 28px
    thumb: 'w-6 h-6',       // 24px thumb
    translate: 'translate-x-7',
  },
  lg: {
    track: 'w-16 h-8',      // 64px x 32px
    thumb: 'w-7 h-7',       // 28px thumb
    translate: 'translate-x-8',
  },
};

export function Switch({
  checked,
  onChange,
  label,
  labelPosition = 'right',
  size = 'md',
  disabled = false,
  helperText,
  error,
  className = '',
  'aria-label': ariaLabel,
  name,
}: SwitchProps): React.ReactElement {
  const { tier } = useRenderingTier();
  const id = useId();
  const sizes = sizeConfig[size];

  const handleToggle = useCallback(() => {
    if (!disabled) {
      onChange(!checked);
    }
  }, [disabled, checked, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  // TEXT_ONLY tier: Pure checkbox
  if (tier === RenderingTier.TEXT_ONLY) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {labelPosition === 'left' && label && (
          <label htmlFor={id} className="font-body">
            {label}
          </label>
        )}
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          name={name}
          aria-label={ariaLabel || label}
          className="w-5 h-5"
        />
        {labelPosition === 'right' && label && (
          <label htmlFor={id} className="font-body">
            {label}
          </label>
        )}
        {(helperText || error) && (
          <span className={`text-sm ${error ? 'text-red-600' : 'text-neutral-600'}`}>
            {error || helperText}
          </span>
        )}
      </div>
    );
  }

  // Track styles based on tier
  const getTrackStyles = (): string => {
    const base = `
      ${sizes.track}
      relative rounded-full
      cursor-pointer
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `;

    if (tier === RenderingTier.MINIMAL) {
      return `${base} ${checked ? 'bg-blue-600' : 'bg-gray-300'}`;
    }

    // REDUCED and FULL
    return `${base} ${
      checked
        ? 'bg-gradient-to-r from-blue-500 to-blue-600'
        : 'bg-neutral-300 dark:bg-neutral-700'
    }`;
  };

  // Thumb styles based on tier
  const getThumbStyles = (): string => {
    const base = `
      ${sizes.thumb}
      absolute top-0.5 left-0.5
      rounded-full
      ${disabled ? '' : 'cursor-pointer'}
    `;

    if (tier === RenderingTier.MINIMAL) {
      return `${base} bg-white ${checked ? sizes.translate : 'translate-x-0'}`;
    }

    // REDUCED tier: No transitions
    if (tier === RenderingTier.REDUCED) {
      return `${base} bg-white shadow-md ${checked ? sizes.translate : 'translate-x-0'}`;
    }

    // FULL tier: Transitions and shadows
    return `${base} bg-white shadow-lg transition-transform duration-200 ease-out ${
      checked ? sizes.translate : 'translate-x-0'
    }`;
  };

  // Container styles
  const containerStyles = `
    flex items-center gap-3
    ${labelPosition === 'left' ? 'flex-row-reverse justify-end' : ''}
    ${className}
  `;

  return (
    <div className={containerStyles}>
      <div className="flex flex-col">
        <button
          id={id}
          role="switch"
          type="button"
          aria-checked={checked}
          aria-label={ariaLabel || label}
          aria-describedby={helperText || error ? `${id}-description` : undefined}
          disabled={disabled}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className={getTrackStyles()}
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <span className={getThumbStyles()} />
          {/* Hidden input for form submission */}
          {name && (
            <input type="hidden" name={name} value={checked ? 'true' : 'false'} />
          )}
        </button>
      </div>

      {label && (
        <label
          htmlFor={id}
          className={`
            font-body text-base
            ${disabled ? 'opacity-50' : 'cursor-pointer'}
            text-neutral-900 dark:text-neutral-100
          `}
        >
          {label}
        </label>
      )}

      {(helperText || error) && (
        <span
          id={`${id}-description`}
          className={`text-sm ${error ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'}`}
        >
          {error || helperText}
        </span>
      )}
    </div>
  );
}

export default Switch;
