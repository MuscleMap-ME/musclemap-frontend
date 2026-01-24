/**
 * ExerciseSubstitutionPicker Component
 *
 * Allows users to find and select alternative exercises
 * that target similar muscle groups.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Check,
  X,
  ChevronRight,
  Dumbbell,
  Target,
  AlertCircle,
  Loader2,
  MapPin,
} from 'lucide-react';
import { useWorkoutSessionGraphQL } from '../../hooks/useWorkoutSessionGraphQL';
import type { ExerciseSubstitution } from '../../hooks/useWorkoutSessionGraphQL';

interface ExerciseSubstitutionPickerProps {
  exerciseId: string;
  exerciseName: string;
  availableEquipment?: string[];
  onSelect: (exercise: ExerciseSubstitution['exercise']) => void;
  onCancel: () => void;
}

export function ExerciseSubstitutionPicker({
  exerciseId,
  exerciseName,
  availableEquipment,
  onSelect,
  onCancel,
}: ExerciseSubstitutionPickerProps) {
  const [substitutions, setSubstitutions] = useState<ExerciseSubstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { findSubstitutes } = useWorkoutSessionGraphQL();

  // Load substitutions on mount
  useEffect(() => {
    const loadSubstitutions = async () => {
      setLoading(true);
      setError(null);

      const results = await findSubstitutes(exerciseId, availableEquipment, 8);

      if (results && results.length > 0) {
        setSubstitutions(results);
      } else {
        setError('No alternative exercises found for your equipment.');
      }
      setLoading(false);
    };

    loadSubstitutions();
  }, [exerciseId, availableEquipment, findSubstitutes]);

  // Handle selection
  const handleSelect = useCallback((sub: ExerciseSubstitution) => {
    setSelectedId(sub.exercise.id);
    // Small delay for visual feedback
    setTimeout(() => {
      onSelect(sub.exercise);
    }, 200);
  }, [onSelect]);

  // Get similarity color
  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    return 'text-orange-400';
  };

  // Get similarity label
  const getSimilarityLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent match';
    if (score >= 0.6) return 'Good match';
    return 'Partial match';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Swap Exercise</h2>
            <p className="text-sm text-gray-400">Find alternatives for {exerciseName}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-4" />
              <p className="text-gray-400">Finding similar exercises...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-8 h-8 text-orange-400 mb-4" />
              <p className="text-gray-400 text-center">{error}</p>
              <button
                onClick={onCancel}
                className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
              >
                Keep Current Exercise
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {substitutions.map((sub) => (
                <motion.button
                  key={sub.exercise.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(sub)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedId === sub.exercise.id
                      ? 'bg-green-500/20 border-green-500/50'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Dumbbell className="w-4 h-4 text-blue-400" />
                        <span className="font-medium">{sub.exercise.name}</span>
                      </div>

                      {/* Equipment */}
                      {sub.exercise.equipment && sub.exercise.equipment.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {sub.exercise.equipment.slice(0, 3).map((eq) => (
                            <span
                              key={eq}
                              className="text-xs bg-gray-700/50 text-gray-300 px-2 py-0.5 rounded"
                            >
                              {eq}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Matched muscles */}
                      {sub.matchedMuscles && sub.matchedMuscles.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                          <Target className="w-3 h-3" />
                          <span>Targets: {sub.matchedMuscles.join(', ')}</span>
                        </div>
                      )}

                      {/* Missing muscles warning */}
                      {sub.missingMuscles && sub.missingMuscles.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-orange-400">
                          <AlertCircle className="w-3 h-3" />
                          <span>Missing: {sub.missingMuscles.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {/* Similarity score */}
                      <div className={`text-sm font-medium ${getSimilarityColor(sub.similarityScore)}`}>
                        {Math.round(sub.similarityScore * 100)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {getSimilarityLabel(sub.similarityScore)}
                      </div>

                      {/* Selection indicator */}
                      {selectedId === sub.exercise.id ? (
                        <Check className="w-5 h-5 text-green-400 mt-2" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-600 mt-2" />
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div className="p-4 border-t border-gray-800 space-y-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <RefreshCw className="w-3 h-3" />
              <span>Alternatives sorted by muscle similarity</span>
            </div>

            {/* Outdoor Spots Suggestion */}
            <Link
              to="/discover"
              onClick={onCancel}
              className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl hover:bg-green-500/20 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-green-500/20">
                <MapPin className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-green-400">Find Outdoor Equipment</div>
                <div className="text-xs text-gray-400">Discover pull-up bars, dip stations & more nearby</div>
              </div>
              <ChevronRight className="w-4 h-4 text-green-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default ExerciseSubstitutionPicker;
