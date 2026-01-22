/**
 * RealtimeSetLogger Component
 *
 * Enhanced set logging with real-time GraphQL sync:
 * - Per-set TU calculation from server
 * - Real-time muscle activation display
 * - Server-side PR detection
 * - Exercise history and suggested weights
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Loader2,
  RefreshCw,
  Dumbbell,
  AlertCircle,
} from 'lucide-react';
import { useWorkoutSessionGraphQL } from '../../hooks/useWorkoutSessionGraphQL';
import { useToast } from '../../hooks';
import type { LoggedSet, MuscleActivation, ExerciseHistory } from '../../hooks/useWorkoutSessionGraphQL';

// Set tag types
type SetTag = 'warmup' | 'working' | 'failure' | 'drop' | 'amrap';

// Tag configuration
const TAG_CONFIG: Record<SetTag, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  warmup: { label: 'Warmup', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Flame },
  working: { label: 'Working', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Target },
  failure: { label: 'Failure', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Zap },
  drop: { label: 'Drop', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: ChevronDown },
  amrap: { label: 'AMRAP', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: TrendingUp },
};

// RIR options
const RIR_OPTIONS = [
  { value: 0, label: '0 RIR', description: 'Total failure' },
  { value: 1, label: '1 RIR', description: 'Could do 1 more' },
  { value: 2, label: '2 RIR', description: 'Could do 2 more' },
  { value: 3, label: '3 RIR', description: 'Could do 3 more' },
  { value: 4, label: '4+ RIR', description: 'Easy' },
];

interface RealtimeSetLoggerProps {
  exerciseId: string;
  exerciseName: string;
  suggestedSets?: number;
  suggestedReps?: number;
  onSetLogged?: (set: LoggedSet) => void;
  onAllSetsComplete?: () => void;
  compact?: boolean;
}

export function RealtimeSetLogger({
  exerciseId,
  exerciseName: _exerciseName,
  suggestedSets = 3,
  suggestedReps = 10,
  onSetLogged,
  onAllSetsComplete,
  compact = false,
}: RealtimeSetLoggerProps) {
  // Toast hook for user feedback
  const { error: showError } = useToast();

  // Local state
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState(suggestedReps.toString());
  const [tag, setTag] = useState<SetTag>('working');
  const [rpe, setRpe] = useState<number | null>(null);
  const [rir, setRir] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recentPR, setRecentPR] = useState<{ type: string; value: number; previousValue?: number } | null>(null);
  const [lastMuscleActivations, setLastMuscleActivations] = useState<MuscleActivation[]>([]);

  // GraphQL hook
  const {
    logSet,
    loadExerciseHistory,
    exerciseHistory,
    getSetsForExercise,
    activeSession,
    loading,
  } = useWorkoutSessionGraphQL();

  const isLoggingSet = loading.loggingSet;

  // Load exercise history on mount
  useEffect(() => {
    loadExerciseHistory([exerciseId]);
  }, [exerciseId, loadExerciseHistory]);

  // Get history for this exercise
  const history: ExerciseHistory | undefined = exerciseHistory[exerciseId];

  // Calculate set number for this exercise
  const exerciseSets = getSetsForExercise(exerciseId);
  const nextSetNumber = exerciseSets.length + 1;

  // Suggest weight based on history
  const suggestedWeight = useMemo(() => {
    if (history?.bestWeight) {
      // Suggest 85-90% of best for working sets
      return Math.round(history.bestWeight * 0.85 / 5) * 5;
    }
    return null;
  }, [history]);

  // Set initial weight from history if available
  useEffect(() => {
    if (suggestedWeight && !weight) {
      setWeight(suggestedWeight.toString());
    }
  }, [suggestedWeight, weight]);

  // Handle set logging
  const handleLogSet = useCallback(async () => {
    const w = parseFloat(weight);
    const r = parseInt(reps);

    // Validate inputs and show feedback
    if (!w || w <= 0) {
      showError('Please enter a weight greater than 0');
      return;
    }
    if (!r || r <= 0) {
      showError('Please enter reps greater than 0');
      return;
    }
    if (!activeSession) {
      showError('No active workout session. Please start a new workout from the beginning.');
      return;
    }

    const result = await logSet({
      sessionId: activeSession.id,
      exerciseId,
      setNumber: nextSetNumber,
      reps: r,
      weightKg: w / 2.205, // Convert lbs to kg for server
      rpe: rpe || undefined,
      rir: rir || undefined,
      tag: tag || undefined,
      notes: notes.trim() || undefined,
    });

    if (result?.set) {
      // Store muscle activations for display
      setLastMuscleActivations(result.set.muscleActivations || []);

      // Check for PRs
      if (result.set.isPRWeight || result.set.isPR1RM || result.set.isPRReps) {
        const prType = result.set.isPR1RM ? '1rm' : result.set.isPRWeight ? 'weight' : 'reps';
        setRecentPR({
          type: prType,
          value: prType === '1rm' ? Math.round(result.set.weightKg * 2.205 / (1.0278 - 0.0278 * r)) : Math.round(result.set.weightKg * 2.205),
        });
        setTimeout(() => setRecentPR(null), 4000);
      }

      // Reset form (keep weight for next set)
      setReps(suggestedReps.toString());
      setRpe(null);
      setRir(null);
      setNotes('');

      // Callback
      onSetLogged?.(result.set);

      // Check if all suggested sets are done
      if (nextSetNumber >= suggestedSets) {
        onAllSetsComplete?.();
      }
    }
  }, [weight, reps, tag, rpe, rir, notes, exerciseId, activeSession, logSet, suggestedReps, suggestedSets, nextSetNumber, onSetLogged, onAllSetsComplete, showError]);

  // Quick weight adjustments
  const adjustWeight = (delta: number) => {
    const current = parseFloat(weight) || 0;
    setWeight(Math.max(0, current + delta).toString());
  };

  // Quick rep adjustments
  const adjustReps = (delta: number) => {
    const current = parseInt(reps) || 0;
    setReps(Math.max(0, current + delta).toString());
  };

  // Estimated 1RM for display
  const estimated1RM = useMemo(() => {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (w > 0 && r > 0 && r <= 15) {
      return Math.round(w / (1.0278 - 0.0278 * r));
    }
    return null;
  }, [weight, reps]);

  // Check if this would be a PR
  const wouldBePR = estimated1RM && history?.best1RM && estimated1RM > history.best1RM;

  // Show warning if no active session
  if (!activeSession) {
    return (
      <div className="space-y-3">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-200 font-medium">No Active Session</p>
            <p className="text-xs text-yellow-400/80 mt-1">
              Please start a new workout to log your sets. Use the &quot;Generate Workout&quot; button or go back and start fresh.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    // Compact mode - just the essentials
    return (
      <div className="space-y-3">
        {/* Weight and Reps in one row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Weight (lbs)</label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => adjustWeight(-5)}
                className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
                className="flex-1 bg-gray-800/50 border border-gray-700 rounded px-2 py-2 text-center text-lg font-bold focus:border-blue-500 focus:outline-none w-20"
              />
              <button
                onClick={() => adjustWeight(5)}
                className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Reps</label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => adjustReps(-1)}
                className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="0"
                className="flex-1 bg-gray-800/50 border border-gray-700 rounded px-2 py-2 text-center text-lg font-bold focus:border-blue-500 focus:outline-none w-16"
              />
              <button
                onClick={() => adjustReps(1)}
                className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Log Set Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleLogSet}
          disabled={!weight || !reps || isLoggingSet}
          className={`w-full py-3 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
            weight && reps && !isLoggingSet
              ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoggingSet ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Logging...
            </>
          ) : (
            <>
              <Dumbbell className="w-4 h-4" />
              Log Set {nextSetNumber}/{suggestedSets}
            </>
          )}
        </motion.button>
      </div>
    );
  }

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

      {/* Exercise History Summary */}
      {history && (
        <div className="bg-gray-800/50 rounded-lg p-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <RefreshCw className="w-4 h-4" />
            <span>Last: {history.totalSessions} sessions</span>
          </div>
          <div className="flex gap-4">
            {history.bestWeight && (
              <span className="text-blue-400">Best: {Math.round(history.bestWeight * 2.205)} lbs</span>
            )}
            {history.best1RM && (
              <span className="text-purple-400">1RM: {Math.round(history.best1RM * 2.205)} lbs</span>
            )}
          </div>
        </div>
      )}

      {/* Set Progress */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Set Progress:</span>
        <div className="flex gap-1">
          {Array.from({ length: suggestedSets }).map((_, i) => (
            <div
              key={i}
              className={`w-8 h-2 rounded-full transition-colors ${
                i < exerciseSets.length
                  ? 'bg-green-500'
                  : i === exerciseSets.length
                  ? 'bg-blue-500 animate-pulse'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
        <span className="text-sm font-medium">
          {exerciseSets.length}/{suggestedSets}
        </span>
      </div>

      {/* Set Tags */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(TAG_CONFIG) as [SetTag, typeof TAG_CONFIG[SetTag]][]).map(([tagKey, config]) => {
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
          {history?.best1RM && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-500">Previous Best</span>
              <span className="text-xs text-gray-400">{Math.round(history.best1RM * 2.205)} lbs</span>
            </div>
          )}
        </div>
      )}

      {/* Last Set Muscle Activations */}
      {lastMuscleActivations.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-2">Last Set - Muscle Activation</div>
          <div className="flex flex-wrap gap-1">
            {lastMuscleActivations.map((m) => (
              <span
                key={m.muscleId}
                className="bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded text-xs"
              >
                {m.muscleName} ({Math.round(m.activation * 100)}%)
              </span>
            ))}
          </div>
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

      {/* Logged Sets for this Exercise */}
      {exerciseSets.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-gray-400">Logged Sets</div>
          <div className="space-y-1">
            {exerciseSets.map((set, i) => (
              <div
                key={set.id}
                className="bg-gray-800/50 rounded-lg p-2 flex items-center justify-between text-sm"
              >
                <span className="text-gray-400">Set {i + 1}</span>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{Math.round((set.weightKg || 0) * 2.205)} lbs x {set.reps}</span>
                  <span className="text-purple-400">{set.tu} TU</span>
                  {set.isPRWeight && <Award className="w-4 h-4 text-yellow-400" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log Set Button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={handleLogSet}
        disabled={!weight || !reps || isLoggingSet}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
          weight && reps && !isLoggingSet
            ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isLoggingSet ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Logging Set...
          </>
        ) : (
          <>
            <Dumbbell className="w-5 h-5" />
            Log Set {nextSetNumber}
          </>
        )}
      </motion.button>
    </div>
  );
}

export default RealtimeSetLogger;
