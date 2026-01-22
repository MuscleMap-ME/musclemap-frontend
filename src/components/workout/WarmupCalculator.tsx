/**
 * Warmup Calculator Component
 *
 * Auto-suggests warmup sets based on working weight.
 * Features:
 * - Calculates progressive warmup sets
 * - Customizable warmup percentages
 * - Quick copy to set logger
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Copy, Check, Settings } from 'lucide-react';

// Warmup presets for different lift types
const WARMUP_PRESETS = {
  compound: {
    label: 'Compound (5 sets)',
    sets: [
      { percent: 0, reps: 10, label: 'Bar' },
      { percent: 40, reps: 8, label: '40%' },
      { percent: 60, reps: 5, label: '60%' },
      { percent: 75, reps: 3, label: '75%' },
      { percent: 90, reps: 1, label: '90%' },
    ],
  },
  moderate: {
    label: 'Moderate (3 sets)',
    sets: [
      { percent: 50, reps: 8, label: '50%' },
      { percent: 70, reps: 5, label: '70%' },
      { percent: 85, reps: 3, label: '85%' },
    ],
  },
  quick: {
    label: 'Quick (2 sets)',
    sets: [
      { percent: 50, reps: 8, label: '50%' },
      { percent: 75, reps: 5, label: '75%' },
    ],
  },
  accessory: {
    label: 'Accessory (1 set)',
    sets: [
      { percent: 50, reps: 10, label: '50%' },
    ],
  },
};

interface WarmupCalculatorProps {
  workingWeight?: number;
  barWeight?: number;
  isMetric?: boolean;
  onCopySet?: (weight: number, reps: number) => void;
  onClose?: () => void;
  compact?: boolean;
}

export function WarmupCalculator({
  workingWeight: initialWeight,
  barWeight = 45, // Default to 45 lbs / 20kg bar
  isMetric = false,
  onCopySet,
  onClose,
  compact = false,
}: WarmupCalculatorProps) {
  const [workingWeight, setWorkingWeight] = useState(initialWeight?.toString() || '');
  const [customBar, setCustomBar] = useState(barWeight.toString());
  const [preset, setPreset] = useState<keyof typeof WARMUP_PRESETS>('compound');
  const [showSettings, setShowSettings] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const unitLabel = isMetric ? 'kg' : 'lbs';
  const effectiveBar = parseFloat(customBar) || barWeight;

  // Calculate warmup weights
  const warmupSets = useMemo(() => {
    const weight = parseFloat(workingWeight);
    if (!weight || weight <= effectiveBar) return [];

    const sets = WARMUP_PRESETS[preset].sets;

    return sets.map((set) => {
      let calculatedWeight: number;

      if (set.percent === 0) {
        // Just the bar
        calculatedWeight = effectiveBar;
      } else {
        // Calculate percentage of working weight
        calculatedWeight = Math.round((weight * (set.percent / 100)) / 5) * 5;
        // Ensure it's at least the bar weight
        calculatedWeight = Math.max(calculatedWeight, effectiveBar);
      }

      return {
        ...set,
        weight: calculatedWeight,
        plates: calculatePlatesPerSide(calculatedWeight, effectiveBar, isMetric),
      };
    });
  }, [workingWeight, preset, effectiveBar, isMetric]);

  // Calculate plates per side
  function calculatePlatesPerSide(totalWeight: number, bar: number, metric: boolean): string {
    const perSide = (totalWeight - bar) / 2;
    if (perSide <= 0) return 'Just bar';

    const plates = metric
      ? [25, 20, 15, 10, 5, 2.5, 1.25]
      : [45, 35, 25, 10, 5, 2.5];

    const result: string[] = [];
    let remaining = perSide;

    for (const plate of plates) {
      const count = Math.floor(remaining / plate);
      if (count > 0) {
        result.push(`${count}×${plate}`);
        remaining -= count * plate;
      }
    }

    return result.length > 0 ? result.join(' + ') : 'Just bar';
  }

  const handleCopy = (weight: number, reps: number, index: number) => {
    onCopySet?.(weight, reps);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className={`bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden ${compact ? '' : 'max-w-md'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          <h3 className="font-semibold text-white">Warmup Calculator</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg ${showSettings ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-800 text-gray-400'}`}
          >
            <Settings className="w-4 h-4" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-gray-800"
          >
            <div className="p-4 space-y-4 bg-gray-900/50">
              {/* Bar weight */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bar Weight ({unitLabel})</label>
                <div className="flex gap-2">
                  {(isMetric ? [20, 15, 10] : [45, 35, 25]).map((w) => (
                    <button
                      key={w}
                      onClick={() => setCustomBar(w.toString())}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                        parseFloat(customBar) === w
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset selection */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Warmup Preset</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(WARMUP_PRESETS) as [keyof typeof WARMUP_PRESETS, typeof WARMUP_PRESETS[keyof typeof WARMUP_PRESETS]][]).map(
                    ([key, value]) => (
                      <button
                        key={key}
                        onClick={() => setPreset(key)}
                        className={`px-3 py-1.5 rounded-lg text-sm ${
                          preset === key
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        {value.label}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="p-4 space-y-4">
        {/* Working weight input */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Working Weight ({unitLabel})</label>
          <input
            type="number"
            value={workingWeight}
            onChange={(e) => setWorkingWeight(e.target.value)}
            placeholder={`Enter your working weight`}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-lg font-medium"
          />
        </div>

        {/* Warmup sets */}
        {warmupSets.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Suggested Warmup Sets</span>
              <span className="text-xs text-gray-500">{warmupSets.length} sets</span>
            </div>
            <div className="space-y-2">
              {warmupSets.map((set, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-white">{set.weight} {unitLabel}</span>
                      <span className="text-gray-400">×</span>
                      <span className="font-medium text-gray-300">{set.reps} reps</span>
                      <span className="text-xs text-gray-500">({set.label})</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {set.plates}
                    </div>
                  </div>
                  {onCopySet && (
                    <button
                      onClick={() => handleCopy(set.weight, set.reps, index)}
                      className={`p-2 rounded-lg transition-colors ${
                        copiedIndex === index
                          ? 'bg-green-500/20 text-green-400'
                          : 'hover:bg-gray-700 text-gray-400'
                      }`}
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ) : workingWeight ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            Working weight must be greater than bar weight ({effectiveBar} {unitLabel})
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 text-sm">
            Enter your working weight to calculate warmup sets
          </div>
        )}

        {/* Tip */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
          <strong>Tip:</strong> Warmup sets prepare your muscles and joints, and help you practice form. Rest 30-60 seconds between warmup sets.
        </div>
      </div>
    </div>
  );
}

export default WarmupCalculator;
