/**
 * CompanionProgress
 *
 * Shows the companion's progression toward the next evolution stage.
 * Displays XP bar, current stage, and next stage preview.
 */

import React from 'react';
import { motion } from 'framer-motion';

// Stage names
const STAGE_NAMES = {
  1: 'Baby',
  2: 'Adolescent',
  3: 'Capable',
  4: 'Armored',
  5: 'Flying',
  6: 'Magnificent',
};

// Stage colors
const STAGE_COLORS = {
  1: 'from-gray-400 to-gray-500',
  2: 'from-green-400 to-green-500',
  3: 'from-blue-400 to-blue-500',
  4: 'from-purple-400 to-purple-500',
  5: 'from-orange-400 to-orange-500',
  6: 'from-yellow-400 to-yellow-500',
};

export default function CompanionProgress({ state, className = '' }) {
  if (!state || !state.progression) {
    return null;
  }

  const { stage, progression } = state;
  const { currentXp, prevStageXp, nextStageXp, progressPercent, isMaxStage } = progression;

  const stageName = STAGE_NAMES[stage] || 'Unknown';
  const nextStageName = STAGE_NAMES[stage + 1] || 'Max';
  const stageColor = STAGE_COLORS[stage] || STAGE_COLORS[1];

  return (
    <div className={`${className}`}>
      {/* Stage header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold bg-gradient-to-r ${stageColor} bg-clip-text text-transparent`}>
            Stage {stage}: {stageName}
          </span>
        </div>

        {!isMaxStage && (
          <span className="text-xs text-gray-500">
            Next: {nextStageName}
          </span>
        )}
      </div>

      {/* XP progress bar */}
      <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${stageColor} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* XP text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-white drop-shadow-md">
            {isMaxStage ? (
              'MAX STAGE'
            ) : (
              `${currentXp} / ${nextStageXp} XP`
            )}
          </span>
        </div>
      </div>

      {/* Stage milestones */}
      {!isMaxStage && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500">{prevStageXp} XP</span>
          <span className="text-xs text-gray-500">{nextStageXp} XP</span>
        </div>
      )}

      {/* Max stage celebration */}
      {isMaxStage && (
        <motion.div
          className="mt-3 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-sm text-yellow-400 font-medium">
            🌟 Maximum Evolution Achieved! 🌟
          </span>
        </motion.div>
      )}
    </div>
  );
}
