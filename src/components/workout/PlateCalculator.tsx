/**
 * Plate Calculator Component
 *
 * Shows which plates to load on each side of the barbell.
 * Features:
 * - Standard plate configurations (kg and lbs)
 * - Visual plate representation
 * - Bar weight options (Olympic 20kg, standard 15kg, etc.)
 * - Custom available plates configuration
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, RotateCcw, Info } from 'lucide-react';

// Types
interface PlateConfig {
  weight: number;
  color: string;
  width: number; // Visual width in pixels
  available: number; // How many pairs available
}

// Standard plate configurations (per side)
const METRIC_PLATES: PlateConfig[] = [
  { weight: 25, color: '#DC2626', width: 42, available: 4 },    // Red
  { weight: 20, color: '#2563EB', width: 40, available: 4 },    // Blue
  { weight: 15, color: '#FBBF24', width: 36, available: 4 },    // Yellow
  { weight: 10, color: '#22C55E', width: 32, available: 4 },    // Green
  { weight: 5, color: '#F8F8F8', width: 28, available: 4 },     // White
  { weight: 2.5, color: '#EF4444', width: 18, available: 4 },   // Small red
  { weight: 2, color: '#3B82F6', width: 16, available: 4 },     // Small blue
  { weight: 1.25, color: '#FCD34D', width: 14, available: 4 },  // Small yellow
  { weight: 1, color: '#4ADE80', width: 12, available: 4 },     // Small green
  { weight: 0.5, color: '#A3A3A3', width: 10, available: 4 },   // Gray
  { weight: 0.25, color: '#737373', width: 8, available: 4 },   // Dark gray
];

const IMPERIAL_PLATES: PlateConfig[] = [
  { weight: 45, color: '#2563EB', width: 42, available: 4 },    // Blue
  { weight: 35, color: '#FBBF24', width: 38, available: 4 },    // Yellow
  { weight: 25, color: '#22C55E', width: 34, available: 4 },    // Green
  { weight: 10, color: '#F8F8F8', width: 28, available: 4 },    // White
  { weight: 5, color: '#EF4444', width: 20, available: 4 },     // Red
  { weight: 2.5, color: '#A3A3A3', width: 14, available: 4 },   // Gray
];

// Bar weight options
const BAR_WEIGHTS = {
  metric: [
    { label: 'Olympic Bar', weight: 20 },
    { label: 'Women\'s Bar', weight: 15 },
    { label: 'EZ Curl Bar', weight: 10 },
    { label: 'Trap Bar', weight: 25 },
    { label: 'Custom', weight: 0 },
  ],
  imperial: [
    { label: 'Olympic Bar', weight: 45 },
    { label: 'Women\'s Bar', weight: 35 },
    { label: 'EZ Curl Bar', weight: 25 },
    { label: 'Trap Bar', weight: 55 },
    { label: 'Custom', weight: 0 },
  ],
};

interface PlateCalculatorProps {
  targetWeight?: number;
  isMetric?: boolean;
  barWeight?: number;
  onClose?: () => void;
  compact?: boolean;
}

export function PlateCalculator({
  targetWeight: initialTarget,
  isMetric = true,
  barWeight: initialBarWeight,
  onClose,
  compact = false,
}: PlateCalculatorProps) {
  const [unit, setUnit] = useState<'metric' | 'imperial'>(isMetric ? 'metric' : 'imperial');
  const [barWeight, setBarWeight] = useState(initialBarWeight || (unit === 'metric' ? 20 : 45));
  const [customBarWeight, setCustomBarWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState(initialTarget?.toString() || '');
  const [showSettings, setShowSettings] = useState(false);
  const [availablePlates, setAvailablePlates] = useState<PlateConfig[]>(
    unit === 'metric' ? METRIC_PLATES : IMPERIAL_PLATES
  );

  // Calculate plates needed for one side
  const calculatePlates = useCallback((totalWeight: number, bar: number, plates: PlateConfig[]) => {
    const weightPerSide = (totalWeight - bar) / 2;

    if (weightPerSide <= 0) {
      return { plates: [], remaining: 0, valid: totalWeight === bar };
    }

    const result: { weight: number; color: string; width: number }[] = [];
    let remaining = weightPerSide;
    const usedCounts: Record<number, number> = {};

    // Sort plates by weight descending
    const sortedPlates = [...plates].sort((a, b) => b.weight - a.weight);

    for (const plate of sortedPlates) {
      const maxAvailable = Math.floor(plate.available / 2); // Per side
      const maxNeeded = Math.floor(remaining / plate.weight);
      const toUse = Math.min(maxAvailable, maxNeeded);

      if (toUse > 0) {
        for (let i = 0; i < toUse; i++) {
          result.push({ weight: plate.weight, color: plate.color, width: plate.width });
        }
        usedCounts[plate.weight] = toUse;
        remaining -= toUse * plate.weight;
      }
    }

    // Round remaining to avoid floating point issues
    remaining = Math.round(remaining * 100) / 100;

    return { plates: result, remaining, valid: remaining === 0 };
  }, []);

  // Calculate the plates for current target
  const calculation = useMemo(() => {
    const target = parseFloat(targetWeight);
    if (isNaN(target) || target <= 0) {
      return null;
    }

    const effectiveBar = customBarWeight ? parseFloat(customBarWeight) : barWeight;
    if (target < effectiveBar) {
      return { plates: [], remaining: 0, valid: false, error: 'Target is less than bar weight' };
    }

    return calculatePlates(target, effectiveBar, availablePlates);
  }, [targetWeight, barWeight, customBarWeight, availablePlates, calculatePlates]);

  // Handle unit change
  const handleUnitChange = (newUnit: 'metric' | 'imperial') => {
    setUnit(newUnit);
    setAvailablePlates(newUnit === 'metric' ? METRIC_PLATES : IMPERIAL_PLATES);
    setBarWeight(newUnit === 'metric' ? 20 : 45);
    setTargetWeight('');
  };

  // Quick weight suggestions
  const quickWeights = unit === 'metric'
    ? [60, 80, 100, 120, 140, 160]
    : [135, 185, 225, 275, 315, 405];

  const unitLabel = unit === 'metric' ? 'kg' : 'lbs';
  const effectiveBar = customBarWeight ? parseFloat(customBarWeight) : barWeight;

  return (
    <div className={`bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden ${compact ? '' : 'max-w-md'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="font-semibold text-white">Plate Calculator</h3>
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
              {/* Unit toggle */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Unit System</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUnitChange('metric')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      unit === 'metric' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    Metric (kg)
                  </button>
                  <button
                    onClick={() => handleUnitChange('imperial')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      unit === 'imperial' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    Imperial (lbs)
                  </button>
                </div>
              </div>

              {/* Bar weight */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bar Weight</label>
                <div className="flex flex-wrap gap-2">
                  {BAR_WEIGHTS[unit].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => {
                        setBarWeight(option.weight);
                        setCustomBarWeight('');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        barWeight === option.weight && !customBarWeight
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {option.label} {option.weight > 0 && `(${option.weight})`}
                    </button>
                  ))}
                </div>
                {barWeight === 0 && (
                  <input
                    type="number"
                    value={customBarWeight}
                    onChange={(e) => setCustomBarWeight(e.target.value)}
                    placeholder={`Custom bar weight (${unitLabel})`}
                    className="mt-2 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="p-4 space-y-4">
        {/* Target weight input */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Target Weight ({unitLabel})</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              placeholder={`Enter target weight`}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-lg font-medium"
            />
            <button
              onClick={() => setTargetWeight('')}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick weight suggestions */}
        <div className="flex flex-wrap gap-2">
          {quickWeights.map((w) => (
            <button
              key={w}
              onClick={() => setTargetWeight(w.toString())}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                targetWeight === w.toString()
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {w}
            </button>
          ))}
        </div>

        {/* Calculation result */}
        {calculation && (
          <div className="mt-4">
            {!calculation.valid && calculation.error ? (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{calculation.error}</p>
              </div>
            ) : (
              <>
                {/* Visual barbell representation */}
                <div className="relative flex items-center justify-center py-6 bg-gray-800/50 rounded-xl overflow-hidden">
                  {/* Left plates */}
                  <div className="flex items-center">
                    {[...calculation.plates].reverse().map((plate, i) => (
                      <motion.div
                        key={`left-${i}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="relative flex items-center justify-center rounded"
                        style={{
                          backgroundColor: plate.color,
                          width: plate.width,
                          height: 60 + plate.width,
                          marginRight: -2,
                          zIndex: calculation.plates.length - i,
                        }}
                      >
                        <span
                          className="absolute text-xs font-bold"
                          style={{
                            color: plate.color === '#F8F8F8' || plate.color === '#FCD34D' || plate.color === '#FBBF24' ? '#333' : '#fff',
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)',
                          }}
                        >
                          {plate.weight}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Bar */}
                  <div className="w-24 h-4 bg-gray-500 rounded-full relative z-50">
                    <div className="absolute inset-y-0 left-0 w-4 bg-gray-600 rounded-l-full" />
                    <div className="absolute inset-y-0 right-0 w-4 bg-gray-600 rounded-r-full" />
                  </div>

                  {/* Right plates */}
                  <div className="flex items-center">
                    {calculation.plates.map((plate, i) => (
                      <motion.div
                        key={`right-${i}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="relative flex items-center justify-center rounded"
                        style={{
                          backgroundColor: plate.color,
                          width: plate.width,
                          height: 60 + plate.width,
                          marginLeft: -2,
                          zIndex: calculation.plates.length - i,
                        }}
                      >
                        <span
                          className="absolute text-xs font-bold"
                          style={{
                            color: plate.color === '#F8F8F8' || plate.color === '#FCD34D' || plate.color === '#FBBF24' ? '#333' : '#fff',
                            writingMode: 'vertical-rl',
                          }}
                        >
                          {plate.weight}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Plate list */}
                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Per side:</span>
                    <span className="text-sm font-medium">
                      {((parseFloat(targetWeight) - effectiveBar) / 2).toFixed(1)} {unitLabel}
                    </span>
                  </div>

                  {calculation.plates.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {/* Group plates by weight */}
                      {Object.entries(
                        calculation.plates.reduce((acc, p) => {
                          acc[p.weight] = (acc[p.weight] || 0) + 1;
                          return acc;
                        }, {} as Record<number, number>)
                      )
                        .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
                        .map(([weight, count]) => (
                          <div
                            key={weight}
                            className="flex items-center gap-1 px-2 py-1 bg-gray-900 rounded-lg"
                          >
                            <div
                              className="w-3 h-3 rounded"
                              style={{
                                backgroundColor: calculation.plates.find(p => p.weight === parseFloat(weight))?.color,
                              }}
                            />
                            <span className="text-sm font-medium">
                              {count}×{weight}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Just the bar</p>
                  )}

                  {/* Warning if not exact */}
                  {!calculation.valid && calculation.remaining > 0 && (
                    <div className="flex items-start gap-2 mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-400">
                        Cannot make exact weight. Missing {calculation.remaining.toFixed(2)} {unitLabel} per side.
                        Showing closest possible ({(parseFloat(targetWeight) - calculation.remaining * 2).toFixed(1)} {unitLabel} total).
                      </p>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="mt-3 text-center">
                  <p className="text-xs text-gray-500">
                    Bar: {effectiveBar}{unitLabel} + Plates: {(parseFloat(targetWeight) - effectiveBar).toFixed(1)}{unitLabel}
                    = <span className="font-bold text-white">{targetWeight}{unitLabel}</span>
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Empty state */}
        {!targetWeight && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Enter a target weight to see which plates to load</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlateCalculator;
