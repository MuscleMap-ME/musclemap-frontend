/**
 * Select Component - Tier-Aware Dropdown Select
 *
 * Knuth-inspired component that adapts to rendering tier:
 * - FULL: Custom dropdown with animations, glassmorphism
 * - REDUCED: Custom dropdown without animations
 * - MINIMAL: Native select with basic styling
 * - TEXT_ONLY: Native select, no styling
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 *
 * @example
 * <Select
 *   value={selected}
 *   onChange={setSelected}
 *   options={[
 *     { value: 'opt1', label: 'Option 1' },
 *     { value: 'opt2', label: 'Option 2' },
 *   ]}
 *   label="Choose option"
 * />
 */

import React, { useState, useRef, useId, useCallback, useEffect } from 'react';
import { useRenderingTier, RenderingTier } from '@/hooks/useRenderingTier';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectProps {
  /** Selected value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Available options */
  options: SelectOption[];
  /** Optional label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Size variant */
  size?: SelectSize;
  /** Disabled state */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Additional class name */
  className?: string;
  /** Form name */
  name?: string;
  /** Required field */
  required?: boolean;
}

// Size configurations - all meet 44px touch target
const sizeConfig: Record<SelectSize, { height: string; text: string; padding: string }> = {
  sm: { height: 'min-h-[44px]', text: 'text-sm', padding: 'px-3 py-2' },
  md: { height: 'min-h-[48px]', text: 'text-base', padding: 'px-4 py-3' },
  lg: { height: 'min-h-[56px]', text: 'text-lg', padding: 'px-4 py-3' },
};

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select...',
  size = 'md',
  disabled = false,
  error,
  helperText,
  className = '',
  name,
  required = false,
}: SelectProps): React.ReactElement {
  const { tier } = useRenderingTier();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const sizes = sizeConfig[size];

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (isOpen && focusedIndex >= 0) {
            const opt = options[focusedIndex];
            if (!opt.disabled) {
              onChange(opt.value);
              setIsOpen(false);
            }
          } else {
            setIsOpen(!isOpen);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setFocusedIndex((prev) => {
              const next = prev + 1;
              return next >= options.length ? 0 : next;
            });
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (isOpen) {
            setFocusedIndex((prev) => {
              const next = prev - 1;
              return next < 0 ? options.length - 1 : next;
            });
          }
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(options.length - 1);
          break;
      }
    },
    [disabled, isOpen, focusedIndex, options, onChange]
  );

  // TEXT_ONLY and MINIMAL: Native select
  if (tier === RenderingTier.TEXT_ONLY || tier === RenderingTier.MINIMAL) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        {label && (
          <label htmlFor={id} className="font-body text-sm">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          className={`
            ${sizes.height} ${sizes.text} ${sizes.padding}
            border rounded
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            bg-white dark:bg-neutral-800
          `}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {(error || helperText) && (
          <span className={`text-sm ${error ? 'text-red-500' : 'text-gray-500'}`}>
            {error || helperText}
          </span>
        )}
      </div>
    );
  }

  // REDUCED and FULL: Custom dropdown
  const getTriggerStyles = (): string => {
    const base = `
      ${sizes.height} ${sizes.text} ${sizes.padding}
      w-full rounded-lg border
      flex items-center justify-between gap-2
      text-left
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `;

    if (tier === RenderingTier.REDUCED) {
      return `${base} ${
        error
          ? 'border-red-500 bg-red-50 dark:bg-red-950'
          : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800'
      }`;
    }

    // FULL tier: Glass effect
    return `${base} ${
      error
        ? 'border-red-500 bg-red-50/80 dark:bg-red-950/50'
        : isOpen
        ? 'border-blue-500 bg-white/90 dark:bg-neutral-800/90 ring-2 ring-blue-500/30'
        : 'border-neutral-300/50 dark:border-neutral-600/50 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm'
    } transition-all duration-200`;
  };

  const getDropdownStyles = (): string => {
    const base = `
      absolute z-50 w-full mt-1
      rounded-lg border overflow-hidden
      max-h-60 overflow-y-auto
    `;

    if (tier === RenderingTier.REDUCED) {
      return `${base} border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-lg`;
    }

    // FULL tier: Glass effect with animation
    return `${base} border-neutral-200/50 dark:border-neutral-700/50 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md shadow-xl`;
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="font-body text-sm text-neutral-700 dark:text-neutral-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${id}-listbox`}
          aria-labelledby={label ? `${id}-label` : undefined}
          aria-describedby={error || helperText ? `${id}-description` : undefined}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={getTriggerStyles()}
        >
          <span className={selectedOption ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}>
            {selectedOption ? (
              <span className="flex items-center gap-2">
                {selectedOption.icon}
                {selectedOption.label}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <svg
            className={`w-5 h-5 text-neutral-500 ${tier === RenderingTier.FULL ? 'transition-transform duration-200' : ''} ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Hidden input for form submission */}
        {name && <input type="hidden" name={name} value={value} />}

        {isOpen && (
          <ul
            id={`${id}-listbox`}
            role="listbox"
            ref={listRef}
            className={getDropdownStyles()}
            style={tier === RenderingTier.FULL ? { animation: 'fadeIn 150ms ease-out' } : undefined}
          >
            {options.map((opt, index) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                aria-disabled={opt.disabled}
                className={`
                  ${sizes.padding} ${sizes.text}
                  flex items-center gap-2
                  ${opt.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${opt.value === value ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : ''}
                  ${focusedIndex === index && !opt.disabled ? 'bg-neutral-100 dark:bg-neutral-700' : ''}
                  ${tier === RenderingTier.FULL ? 'transition-colors duration-100' : ''}
                `}
                onClick={() => {
                  if (!opt.disabled) {
                    onChange(opt.value);
                    setIsOpen(false);
                  }
                }}
                onMouseEnter={() => !opt.disabled && setFocusedIndex(index)}
              >
                {opt.icon}
                {opt.label}
                {opt.value === value && (
                  <svg className="w-4 h-4 ml-auto text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {(error || helperText) && (
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

export default Select;
