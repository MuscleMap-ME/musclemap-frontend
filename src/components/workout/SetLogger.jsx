/**
 * SetLogger Component
 *
 * Enhanced set logging with:
 * - Weight and reps input
 * - Set tags (warmup, working, failure, drop)
 * - RPE (Rate of Perceived Exertion) slider
 * - RIR (Reps in Reserve) quick select
 * - 1RM estimation display
 * - PR detection and celebration
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Target,
  TrendingUp,
  Award,
  Minus,
  Plus,
  ChevronDown,
  Zap,
} from 'lucide-react';
import {
  useWorkoutSessionStore,
  useSetLogging,
  use1RM,
  calculate1RM,
  SET_TAGS,
} from '../../store/workoutSessionStore';

// Tag configuration
const TAG_CONFIG = {
  [SET_TAGS.WARMUP]: { label: 'Warmup', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Flame },
  [SET_TAGS.WORKING]: { label: 'Working', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Target },
  [SET_TAGS.FAILURE]: { label: 'Failure', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Zap },
  [SET_TAGS.DROP]: { label: 'Drop', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: ChevronDown },
  [SET_TAGS.AMRAP]: { label: 'AMRAP', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: TrendingUp },
};

// RIR options
const RIR_OPTIONS = [
  { value: 0, label: '0 RIR', description: 'Total failure' },
  { value: 1, label: '1 RIR', description: 'Could do 1 more' },
  { value: 2, label: '2 RIR', description: 'Could do 2 more' },
  { value: 3, label: '3 RIR', description: 'Could do 3 more' },
  { value: 4, label: '4+ RIR', description: 'Easy' },
];

export function SetLogger({ exercise, onSetLogged }) {
  // Local state
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [tag, setTag] = useState(SET_TAGS.WORKING);
  const [rpe, setRpe] = useState(null);
  const [rir, setRir] = useState(null);
  const [notes, setNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recentPR, setRecentPR] = useState(null);

  // Hooks
  const { log, tags } = useSetLogging();
  const { getBestForExercise, getSuggestedWeight } = use1RM();
  const startRestTimer = useWorkoutSessionStore((s) => s.startRestTimer);

  // Calculate estimated 1RM in real-time
  const estimated1RM = useMemo(() => {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (w > 0 && r > 0 && r <= 15) {
      return calculate1RM(w, r);
    }
    return null;
  }, [weight, reps]);

  // Get best 1RM for this exercise
  const best1RM = getBestForExercise(exercise?.id);

  // Check if this would be a PR
  const wouldBePR = estimated1RM && best1RM && estimated1RM > best1RM;

  // Handle set logging
  const handleLogSet = useCallback(() => {
    const w = parseFloat(weight);
    const r = parseInt(reps);

    if (!w || !r) return;

    const result = log({
      weight: w,
      reps: r,
      tag,
      rpe,
      rir,
      notes: notes.trim() || undefined,
    });

    // Check for PRs
    if (result.prs && result.prs.length > 0) {
      setRecentPR(result.prs[0]);
      setTimeout(() => setRecentPR(null), 3000);
    }

    // Start rest timer
    startRestTimer();

    // Reset form (keep weight for next set)
    setReps('');
    setRpe(null);
    setRir(null);
    setNotes('');

    // Callback
    onSetLogged?.(result);
  }, [weight, reps, tag, rpe, rir, notes, log, startRestTimer, onSetLogged]);

  // Quick weight adjustments
  const adjustWeight = (delta) => {
    const current = parseFloat(weight) || 0;
    setWeight(Math.max(0, current + delta).toString());
  };

  // Quick rep adjustments
  const adjustReps = (delta) => {
    const current = parseInt(reps) || 0;
    setReps(Math.max(0, current + delta).toString());
  };

  return (
    <div className="space-y-4">
      {/* PR Celebration */}
      <AnimatePresence>
        {recentPR && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-4 flex items-center gap-3"
          >
            <Award className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="font-bold text-yellow-400">NEW PR!</p>
              <p className="text-sm text-gray-300">
                {recentPR.type === '1rm' && `Estimated 1RM: ${recentPR.value} lbs`}
                {recentPR.type === 'weight' && `Max weight: ${recentPR.value} lbs`}
                {recentPR.type === 'volume' && `Set volume: ${recentPR.value} lbs`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Set Tags */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(TAG_CONFIG).map(([tagKey, config]) => {
          const Icon = config.icon;
          return (
            <button
              key={tagKey}
              onClick={() => setTag(tagKey)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all flex items-center gap-1.5 ${
                tag === tagKey
                  ? config.color
                  : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:border-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Weight Input */}
      <div className="space-y-2">
        <label className="text-sm text-gray-400">Weight (lbs)</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustWeight(-5)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"
          >
            <Minus className="w-5 h-5" />
          </button>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="0"
            className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-center text-2xl font-bold focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={() => adjustWeight(5)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Reps Input */}
      <div className="space-y-2">
        <label className="text-sm text-gray-400">Reps</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustReps(-1)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"
          >
            <Minus className="w-5 h-5" />
          </button>
          <input
            type="number"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="0"
            className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-center text-2xl font-bold focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={() => adjustReps(1)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 1RM Estimation Display */}
      {estimated1RM && (
        <div className={`p-3 rounded-lg border ${
          wouldBePR
            ? 'bg-yellow-500/10 border-yellow-500/30'
            : 'bg-gray-800/50 border-gray-700'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Estimated 1RM</span>
            <span className={`font-bold ${wouldBePR ? 'text-yellow-400' : 'text-white'}`}>
              {estimated1RM} lbs
              {wouldBePR && <span className="ml-2 text-xs">NEW PR!</span>}
            </span>
          </div>
          {best1RM > 0 && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-500">Previous Best</span>
              <span className="text-xs text-gray-400">{best1RM} lbs</span>
            </div>
          )}
        </div>
      )}

      {/* Advanced Options Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full py-2 text-sm text-gray-400 hover:text-gray-300 flex items-center justify-center gap-2"
      >
        <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Options</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
      </button>

      {/* Advanced Options */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {/* RPE Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">RPE (1-10)</label>
                <span className="text-sm font-medium">{rpe || '-'}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={rpe || 5}
                onChange={(e) => setRpe(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Easy</span>
                <span>Max Effort</span>
              </div>
            </div>

            {/* RIR Quick Select */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Reps in Reserve</label>
              <div className="flex gap-2">
                {RIR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setRir(rir === option.value ? null : option.value)}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                      rir === option.value
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log Set Button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={handleLogSet}
        disabled={!weight || !reps}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
          weight && reps
            ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
      >
        Log Set
      </motion.button>
    </div>
  );
}

export default SetLogger;
