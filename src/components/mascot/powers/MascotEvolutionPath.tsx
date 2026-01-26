import React from 'react';
import { SafeMotion } from '@/utils/safeMotion';
import { ChevronRight, Lock, CheckCircle, Star, Sparkles } from 'lucide-react';

interface EvolutionStage {
  id: string;
  name: string;
  icon: string;
  tier: number;
  tuRequired: number;
  powersUnlocked: string[];
  isUnlocked: boolean;
  isCurrent: boolean;
}

interface MascotEvolutionPathProps {
  stages: EvolutionStage[];
  currentTU: number;
  onSelect?: (stageId: string) => void;
}

export function MascotEvolutionPath({ stages, currentTU, onSelect }: MascotEvolutionPathProps) {
  const currentStageIndex = stages.findIndex((s) => s.isCurrent);

  return (
    <div className="space-y-4">
      {/* Progress overview */}
      <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
        <div>
          <p className="text-sm text-gray-400">Current Stage</p>
          <p className="font-semibold text-white">
            {stages[currentStageIndex]?.name || 'Unknown'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Training Units</p>
          <p className="font-semibold text-purple-400">{currentTU.toLocaleString()} TU</p>
        </div>
      </div>

      {/* Evolution path */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-700" />

        <div className="space-y-4">
          {stages.map((stage, index) => {
            const isNext = index === currentStageIndex + 1;
            const progressToNext = stage.isUnlocked
              ? 100
              : isNext
              ? Math.min(100, (currentTU / stage.tuRequired) * 100)
              : 0;

            return (
              <SafeMotion.div
                key={stage.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {/* Stage indicator */}
                <div
                  className={`absolute left-0 w-12 h-12 rounded-xl flex items-center justify-center z-10 ${
                    stage.isCurrent
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 ring-2 ring-purple-400 ring-offset-2 ring-offset-gray-900'
                      : stage.isUnlocked
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
                      : 'bg-gray-700'
                  }`}
                >
                  {stage.isUnlocked ? (
                    <span className="text-2xl">{stage.icon}</span>
                  ) : (
                    <Lock className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Stage content */}
                <div
                  className={`ml-16 p-4 rounded-xl border transition-all ${
                    stage.isCurrent
                      ? 'bg-purple-500/10 border-purple-500/30'
                      : stage.isUnlocked
                      ? 'bg-gray-800/50 border-gray-700/50'
                      : 'bg-gray-800/30 border-gray-700/30'
                  } ${onSelect && stage.isUnlocked ? 'cursor-pointer hover:bg-gray-800/70' : ''}`}
                  onClick={() => onSelect && stage.isUnlocked && onSelect(stage.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white">{stage.name}</h4>
                        {stage.isCurrent && (
                          <span className="px-2 py-0.5 text-xs rounded bg-purple-500/30 text-purple-300">
                            Current
                          </span>
                        )}
                        {stage.isUnlocked && !stage.isCurrent && (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400">Tier {stage.tier}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">
                        {stage.tuRequired.toLocaleString()} TU
                      </p>
                      {!stage.isUnlocked && (
                        <p className="text-xs text-gray-500">
                          {Math.max(0, stage.tuRequired - currentTU).toLocaleString()} to go
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar for next stage */}
                  {isNext && !stage.isUnlocked && (
                    <div className="mb-3">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <SafeMotion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressToNext}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {progressToNext.toFixed(0)}% progress
                      </p>
                    </div>
                  )}

                  {/* Powers unlocked */}
                  {stage.powersUnlocked.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Powers Unlocked:</p>
                      <div className="flex flex-wrap gap-1">
                        {stage.powersUnlocked.map((power, i) => (
                          <span
                            key={i}
                            className={`px-2 py-0.5 text-xs rounded ${
                              stage.isUnlocked
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-gray-700/50 text-gray-500'
                            }`}
                          >
                            {power}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Connector to next stage */}
                {index < stages.length - 1 && (
                  <div className="absolute left-6 -translate-x-1/2 bottom-0 translate-y-full h-4 flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-gray-600 rotate-90" />
                  </div>
                )}
              </SafeMotion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
