import React from 'react';

export type WeightUnit = 'lbs' | 'kg';

export interface UnitOption {
  value: string;
  label: string;
}

export interface UnitToggleProps {
  /** Current unit value */
  value: string;
  /** Callback when unit changes */
  onChange: (value: string) => void;
  /** Optional label */
  label?: string;
  /** Options to display */
  options?: UnitOption[];
  /** Optional className */
  className?: string;
}

/**
 * UnitToggle - Flexible unit switcher component
 *
 * @example
 * // Simple weight toggle
 * <UnitToggle
 *   value={weightUnit}
 *   onChange={(value) => setWeightUnit(value)}
 *   label="Weight Units"
 *   options={[
 *     { value: 'lbs', label: 'lbs' },
 *     { value: 'kg', label: 'kg' },
 *   ]}
 * />
 *
 * @example
 * // Height toggle
 * <UnitToggle
 *   value={heightUnit}
 *   onChange={(value) => setHeightUnit(value)}
 *   label="Height Units"
 *   options={[
 *     { value: 'cm', label: 'cm' },
 *     { value: 'ft_in', label: 'ft/in' },
 *   ]}
 * />
 */
export const UnitToggle: React.FC<UnitToggleProps> = ({
  value,
  onChange,
  label,
  options = [
    { value: 'lbs', label: 'lbs' },
    { value: 'kg', label: 'kg' },
  ],
  className = '',
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {label}
        </label>
      )}
      <div className="flex bg-slate-800 rounded-xl p-1 w-fit">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium uppercase transition-all ${
              value === opt.value
                ? 'bg-teal-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default UnitToggle;
