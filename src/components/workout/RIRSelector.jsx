/**
 * RIR Selector Component
 *
 * Reps in Reserve (RIR) selector with:
 * - 0-5 scale
 * - Clear descriptions for each level
 * - Touch-friendly buttons for gym use
 * - Alternative to RPE for those who prefer it
 *
 * @example
 * <RIRSelector value={2} onChange={setRir} />
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';

// RIR Scale with descriptions
const RIR_SCALE = [
  { value: 0, label: '0', description: 'Total failure - could not do any more reps', rpeEquivalent: 10 },
  { value: 1, label: '1', description: 'Could do 1 more rep', rpeEquivalent: 9 },
  { value: 2, label: '2', description: 'Could do 2 more reps', rpeEquivalent: 8 },
  { value: 3, label: '3', description: 'Could do 3 more reps', rpeEquivalent: 7 },
  { value: 4, label: '4', description: 'Could do 4+ more reps', rpeEquivalent: 6 },
  { value: 5, label: '5+', description: 'Easy / warm-up weight', rpeEquivalent: 5 },
];

// Get color for RIR value (inverse of RPE - lower RIR = more intense)
export function getRIRColor(rir) {
  if (rir === 0) return '#EF4444'; // Red - failure
  if (rir === 1) return '#FB923C'; // Orange
  if (rir === 2) return '#FACC15'; // Yellow
  if (rir === 3) return '#4ADE80'; // Green
  if (rir === 4) return '#2DD4BF'; // Teal
  return '#38BDF8'; // Blue - easy
}

// Convert RIR to RPE
export function rirToRpe(rir) {
  if (rir === null || rir === undefined) return null;
  return 10 - rir;
}

// Convert RPE to RIR
export function rpeToRir(rpe) {
  if (rpe === null || rpe === undefined) return null;
  return 10 - rpe;
}

/**
 * RIR Selector - Button style
 */
export function RIRSelector({ value, onChange, disabled = false, showRpeEquivalent = true }) {
  const handleSelect = (rir) => {
    if (disabled) return;
    onChange(value === rir ? null : rir);
  };

  const currentRIR = RIR_SCALE.find((r) => r.value === value);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-400 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Reps in Reserve (RIR)
        </label>
        {showRpeEquivalent && value !== null && value !== undefined && (
          <span className="text-xs text-gray-500">
            = RPE {rirToRpe(value)}
          </span>
        )}
      </div>

      {/* RIR Buttons */}
      <div className="grid grid-cols-6 gap-2">
        {RIR_SCALE.map((rir) => {
          const isSelected = value === rir.value;
          const color = getRIRColor(rir.value);

          return (
            <button
              key={rir.value}
              type="button"
              onClick={() => handleSelect(rir.value)}
              disabled={disabled}
              className={`
                py-2.5 px-2 rounded-lg text-center font-bold transition-all
                border disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  isSelected
                    ? 'border-transparent scale-105'
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                }
              `}
              style={{
                backgroundColor: isSelected ? `${color}20` : undefined,
                borderColor: isSelected ? color : undefined,
                color: isSelected ? color : '#9CA3AF',
              }}
            >
              {rir.label}
            </button>
          );
        })}
      </div>

      {/* Description */}
      {currentRIR && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-400 text-center"
        >
          {currentRIR.description}
        </motion.p>
      )}
    </div>
  );
}

/**
 * Compact RIR Selector (dropdown style)
 */
export function RIRSelectorCompact({ value, onChange, disabled = false }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500 flex items-center gap-1">
        <Target className="w-3 h-3" />
        RIR
      </label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
        disabled={disabled}
        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm
                   focus:border-blue-500 focus:outline-none disabled:opacity-50"
        style={{
          color: value !== null && value !== undefined ? getRIRColor(value) : '#9CA3AF',
        }}
      >
        <option value="">-</option>
        {RIR_SCALE.map((rir) => (
          <option key={rir.value} value={rir.value}>
            {rir.value} RIR - {rir.description}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * RIR Badge - Display only component
 */
export function RIRBadge({ rir, size = 'md', showLabel = true }) {
  if (rir === null || rir === undefined) return null;

  const color = getRIRColor(rir);
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      {showLabel && <span className="opacity-70">RIR</span>}
      {rir}
    </span>
  );
}

/**
 * RPE/RIR Combined Quick Input
 * Allows users to input either RPE or RIR based on preference
 */
export function RPERIRQuickInput({ rpe, rir, onRpeChange, onRirChange, preference = 'rpe' }) {
  const [mode, setMode] = React.useState(preference);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    // Sync values when switching modes
    if (newMode === 'rir' && rpe) {
      onRirChange(rpeToRir(rpe));
    } else if (newMode === 'rpe' && rir !== null && rir !== undefined) {
      onRpeChange(rirToRpe(rir));
    }
  };

  return (
    <div className="space-y-2">
      {/* Mode Toggle */}
      <div className="flex bg-gray-800/50 rounded-lg p-1">
        <button
          type="button"
          onClick={() => handleModeChange('rpe')}
          className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors ${
            mode === 'rpe'
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          RPE
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('rir')}
          className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors ${
            mode === 'rir'
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          RIR
        </button>
      </div>

      {/* Input based on mode */}
      {mode === 'rpe' ? (
        <div className="grid grid-cols-5 gap-2">
          {[6, 7, 8, 9, 10].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => {
                onRpeChange(rpe === val ? null : val);
                onRirChange(rpe === val ? null : rpeToRir(val));
              }}
              className={`
                py-2 rounded-lg font-bold transition-all border
                ${
                  rpe === val
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                }
              `}
            >
              {val}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-2">
          {[0, 1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => {
                onRirChange(rir === val ? null : val);
                onRpeChange(rir === val ? null : rirToRpe(val));
              }}
              className={`
                py-2 rounded-lg font-bold transition-all border
                ${
                  rir === val
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                }
              `}
            >
              {val}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default RIRSelector;
