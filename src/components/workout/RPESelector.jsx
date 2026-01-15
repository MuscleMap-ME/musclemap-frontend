/**
 * RPE Selector Component
 *
 * Rate of Perceived Exertion (RPE) selector with:
 * - 0-10 scale with half-point increments
 * - Visual indicator (color gradient)
 * - Description for each level
 * - Touch-friendly design for gym use
 *
 * @example
 * <RPESelector value={8} onChange={setRpe} />
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Info } from 'lucide-react';

// RPE Scale with descriptions
const RPE_SCALE = [
  { value: 10, label: 'RPE 10', description: 'Maximum effort - could not do more reps', intensity: 'maximal', color: '#EF4444' },
  { value: 9.5, label: 'RPE 9.5', description: 'Could maybe do 1 more rep', intensity: 'near-maximal', color: '#F87171' },
  { value: 9, label: 'RPE 9', description: 'Could definitely do 1 more rep', intensity: 'very hard', color: '#FB923C' },
  { value: 8.5, label: 'RPE 8.5', description: 'Could do 1-2 more reps', intensity: 'very hard', color: '#FBBF24' },
  { value: 8, label: 'RPE 8', description: 'Could do 2 more reps', intensity: 'hard', color: '#FACC15' },
  { value: 7.5, label: 'RPE 7.5', description: 'Could do 2-3 more reps', intensity: 'hard', color: '#A3E635' },
  { value: 7, label: 'RPE 7', description: 'Could do 3 more reps', intensity: 'moderate-hard', color: '#4ADE80' },
  { value: 6.5, label: 'RPE 6.5', description: 'Could do 3-4 more reps', intensity: 'moderate', color: '#34D399' },
  { value: 6, label: 'RPE 6', description: 'Could do 4+ more reps', intensity: 'moderate', color: '#2DD4BF' },
  { value: 5, label: 'RPE 5', description: 'Warm-up / light work', intensity: 'light', color: '#38BDF8' },
];

// Get color for RPE value
export function getRPEColor(rpe) {
  if (rpe >= 9.5) return '#EF4444';
  if (rpe >= 9) return '#FB923C';
  if (rpe >= 8) return '#FACC15';
  if (rpe >= 7) return '#4ADE80';
  if (rpe >= 6) return '#2DD4BF';
  return '#38BDF8';
}

// Get intensity label for RPE value
export function getRPEIntensity(rpe) {
  if (rpe >= 10) return 'maximal';
  if (rpe >= 9) return 'very hard';
  if (rpe >= 8) return 'hard';
  if (rpe >= 7) return 'moderate-hard';
  if (rpe >= 6) return 'moderate';
  return 'light';
}

/**
 * Compact RPE Selector (Slider style)
 */
export function RPESelector({ value, onChange, showInfo = true, disabled = false }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const currentRPE = RPE_SCALE.find((r) => r.value === value) || null;
  const displayValue = value ?? '-';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-400 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          RPE
          {showInfo && (
            <button
              type="button"
              onClick={() => setShowTooltip(!showTooltip)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Show RPE info"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </label>
        <span
          className="text-lg font-bold"
          style={{ color: value ? getRPEColor(value) : '#9CA3AF' }}
        >
          {displayValue}
        </span>
      </div>

      {/* Slider */}
      <input
        type="range"
        min="5"
        max="10"
        step="0.5"
        value={value ?? 7}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
        style={{
          background: value
            ? `linear-gradient(to right, ${getRPEColor(5)} 0%, ${getRPEColor(value)} ${((value - 5) / 5) * 100}%, #374151 ${((value - 5) / 5) * 100}%)`
            : '#374151',
        }}
      />

      {/* Description */}
      {currentRPE && (
        <p className="text-xs text-gray-500">{currentRPE.description}</p>
      )}

      {/* Info Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 p-3 rounded-lg bg-gray-800 border border-gray-700"
          >
            <p className="text-sm font-medium text-white mb-2">RPE Scale Guide</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-red-400">10:</span>
                <span className="text-gray-400">Maximum effort (failure)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-400">9:</span>
                <span className="text-gray-400">Could do 1 more rep</span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-400">8:</span>
                <span className="text-gray-400">Could do 2 more reps</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-400">7:</span>
                <span className="text-gray-400">Could do 3 more reps</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyan-400">6:</span>
                <span className="text-gray-400">Could do 4+ more reps</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-400">5:</span>
                <span className="text-gray-400">Warm-up / light</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Expanded RPE Selector (Button grid style)
 */
export function RPESelectorExpanded({ value, onChange, disabled = false }) {
  const handleSelect = useCallback(
    (rpe) => {
      if (disabled) return;
      onChange(value === rpe ? null : rpe);
    },
    [value, onChange, disabled]
  );

  return (
    <div className="space-y-3">
      <label className="text-sm text-gray-400 flex items-center gap-2">
        <Activity className="w-4 h-4" />
        Rate of Perceived Exertion (RPE)
      </label>

      {/* Main RPE values (6-10) */}
      <div className="grid grid-cols-5 gap-2">
        {[6, 7, 8, 9, 10].map((rpe) => {
          const rpeData = RPE_SCALE.find((r) => r.value === rpe);
          const isSelected = value === rpe;

          return (
            <button
              key={rpe}
              type="button"
              onClick={() => handleSelect(rpe)}
              disabled={disabled}
              className={`
                py-3 px-2 rounded-lg text-center font-bold text-lg transition-all
                border disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  isSelected
                    ? 'border-transparent scale-105'
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                }
              `}
              style={{
                backgroundColor: isSelected ? `${rpeData?.color}20` : undefined,
                borderColor: isSelected ? rpeData?.color : undefined,
                color: isSelected ? rpeData?.color : '#9CA3AF',
              }}
            >
              {rpe}
            </button>
          );
        })}
      </div>

      {/* Half values toggle for precision */}
      <div className="flex gap-2">
        {[5.5, 6.5, 7.5, 8.5, 9.5].map((rpe) => {
          const isSelected = value === rpe;
          const rpeData = RPE_SCALE.find((r) => r.value === rpe);

          return (
            <button
              key={rpe}
              type="button"
              onClick={() => handleSelect(rpe)}
              disabled={disabled}
              className={`
                flex-1 py-1.5 px-1 rounded text-xs font-medium transition-all
                border disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  isSelected
                    ? 'border-transparent'
                    : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600'
                }
              `}
              style={{
                backgroundColor: isSelected ? `${rpeData?.color}15` : undefined,
                borderColor: isSelected ? `${rpeData?.color}50` : undefined,
                color: isSelected ? rpeData?.color : '#6B7280',
              }}
            >
              {rpe}
            </button>
          );
        })}
      </div>

      {/* Description */}
      {value && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-400 text-center"
        >
          {RPE_SCALE.find((r) => r.value === value)?.description}
        </motion.p>
      )}
    </div>
  );
}

/**
 * RPE Badge - Display only component
 */
export function RPEBadge({ rpe, size = 'md', showLabel = true }) {
  if (rpe == null) return null;

  const color = getRPEColor(rpe);
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
      {showLabel && <span className="opacity-70">RPE</span>}
      {rpe}
    </span>
  );
}

export default RPESelector;
