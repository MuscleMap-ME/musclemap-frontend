import React from 'react';

export type WeightUnit = 'lbs' | 'kg';

export interface UnitToggleProps {
  /** Current unit */
  unit: WeightUnit;
  /** Callback when unit changes */
  onChange: (unit: WeightUnit) => void;
  /** Optional label */
  label?: string;
  /** Optional className */
  className?: string;
}

/**
 * UnitToggle - Clean lbs/kg unit switcher
 *
 * @example
 * <UnitToggle
 *   unit={weightUnit}
 *   onChange={(unit) => setWeightUnit(unit)}
 * />
 */
export const UnitToggle: React.FC<UnitToggleProps> = ({
  unit,
  onChange,
  label,
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
        {(['lbs', 'kg'] as const).map((u) => (
          <button
            key={u}
            onClick={() => onChange(u)}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium uppercase transition-all ${
              unit === u
                ? 'bg-teal-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {u}
          </button>
        ))}
      </div>
    </div>
  );
};

export default UnitToggle;
