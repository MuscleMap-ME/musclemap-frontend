/**
 * Muscle Recovery Status Component
 *
 * Displays individual muscle group recovery status with:
 * - Visual body diagram or list view
 * - Color-coded recovery percentages (green = recovered, red = fatigued)
 * - Time remaining for full recovery
 * - Training recommendations based on recovery state
 */

import React, { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';
import {
  Activity,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Timer,
} from 'lucide-react';
import { gql } from '@apollo/client/core';

// GraphQL query for muscle recovery status
const MUSCLE_RECOVERY_QUERY = gql`
  query MuscleRecoveryStatus {
    muscleRecoveryStatus {
      muscleGroup
      recoveryPercent
      hoursRemaining
      lastTrained
      volumeLastSession
      status
    }
  }
`;

// Muscle group display names and categories
const MUSCLE_GROUPS = {
  chest: { name: 'Chest', category: 'push', icon: '🫁' },
  back: { name: 'Back', category: 'pull', icon: '🔙' },
  shoulders: { name: 'Shoulders', category: 'push', icon: '💪' },
  biceps: { name: 'Biceps', category: 'pull', icon: '💪' },
  triceps: { name: 'Triceps', category: 'push', icon: '💪' },
  forearms: { name: 'Forearms', category: 'pull', icon: '🦾' },
  quadriceps: { name: 'Quads', category: 'legs', icon: '🦵' },
  hamstrings: { name: 'Hamstrings', category: 'legs', icon: '🦵' },
  glutes: { name: 'Glutes', category: 'legs', icon: '🍑' },
  calves: { name: 'Calves', category: 'legs', icon: '🦶' },
  core: { name: 'Core', category: 'core', icon: '🔥' },
  traps: { name: 'Traps', category: 'pull', icon: '🏋️' },
  lats: { name: 'Lats', category: 'pull', icon: '🦅' },
};

// Get color based on recovery percentage
function getRecoveryColor(percent: number): string {
  if (percent >= 90) return '#4ADE80'; // Green - fully recovered
  if (percent >= 70) return '#A3E635'; // Lime - mostly recovered
  if (percent >= 50) return '#FACC15'; // Yellow - partially recovered
  if (percent >= 30) return '#FB923C'; // Orange - still fatigued
  return '#EF4444'; // Red - very fatigued
}

// Get status label
function getStatusLabel(percent: number): string {
  if (percent >= 90) return 'Fully Recovered';
  if (percent >= 70) return 'Ready to Train';
  if (percent >= 50) return 'Moderate Recovery';
  if (percent >= 30) return 'Still Recovering';
  return 'Needs Rest';
}

// Format hours to readable time
function formatTimeRemaining(hours: number | null | undefined): string {
  if (!hours || hours <= 0) return 'Ready';
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

// Individual muscle recovery item
interface MuscleRecoveryItemProps {
  muscleGroup: string;
  recoveryPercent: number;
  hoursRemaining?: number | null;
  lastTrained?: string | null;
  volumeLastSession?: number | null;
  status?: string;
  compact?: boolean;
}

function MuscleRecoveryItem({
  muscleGroup,
  recoveryPercent,
  hoursRemaining,
  lastTrained,
  volumeLastSession,
  compact = false,
}: MuscleRecoveryItemProps) {
  const [expanded, setExpanded] = useState(false);
  const muscleInfo = MUSCLE_GROUPS[muscleGroup as keyof typeof MUSCLE_GROUPS] || {
    name: muscleGroup.charAt(0).toUpperCase() + muscleGroup.slice(1),
    category: 'other',
    icon: '💪',
  };
  const color = getRecoveryColor(recoveryPercent);
  const statusLabel = getStatusLabel(recoveryPercent);
  const isRecovered = recoveryPercent >= 90;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2">
        <div className="text-lg">{muscleInfo.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{muscleInfo.name}</div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${recoveryPercent}%`, backgroundColor: color }}
            />
          </div>
        </div>
        <div className="text-sm font-medium" style={{ color }}>
          {recoveryPercent}%
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-700/50 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-700/30 transition-colors"
      >
        <div className="text-xl">{muscleInfo.icon}</div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium">{muscleInfo.name}</span>
            {isRecovered ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <Timer className="w-4 h-4 text-yellow-400" />
            )}
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden mt-1.5">
            <SafeMotion.div
              initial={{ width: 0 }}
              animate={{ width: `${recoveryPercent}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm font-bold" style={{ color }}>
            {recoveryPercent}%
          </span>
          <span className="text-xs text-gray-500">
            {formatTimeRemaining(hoursRemaining)}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <SafeAnimatePresence>
        {expanded && (
          <SafeMotion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span style={{ color }}>{statusLabel}</span>
              </div>
              {hoursRemaining !== undefined && hoursRemaining !== null && hoursRemaining > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Full Recovery In</span>
                  <span className="text-gray-300">{formatTimeRemaining(hoursRemaining)}</span>
                </div>
              )}
              {lastTrained && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Last Trained</span>
                  <span className="text-gray-300">
                    {new Date(lastTrained).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {volumeLastSession !== undefined && volumeLastSession !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Volume Last Session</span>
                  <span className="text-gray-300">{volumeLastSession.toLocaleString()} lbs</span>
                </div>
              )}
            </div>
          </SafeMotion.div>
        )}
      </SafeAnimatePresence>
    </div>
  );
}

interface MuscleRecoveryStatusProps {
  compact?: boolean;
  showRecommendations?: boolean;
  limit?: number;
  onMuscleSelect?: (muscle: string) => void;
}

export function MuscleRecoveryStatus({
  compact = false,
  showRecommendations = true,
  limit,
  onMuscleSelect,
}: MuscleRecoveryStatusProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const { data, loading, error } = useQuery(MUSCLE_RECOVERY_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  if (loading && !data) {
    return (
      <div className={`bg-gray-800/50 rounded-xl border border-gray-700 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-700 rounded w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-700 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-700 rounded w-24" />
                <div className="h-2 bg-gray-700 rounded" />
              </div>
              <div className="h-4 bg-gray-700 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.muscleRecoveryStatus) {
    // Show mock data when no real data available
    const mockData = [
      { muscleGroup: 'chest', recoveryPercent: 100, hoursRemaining: 0 },
      { muscleGroup: 'back', recoveryPercent: 85, hoursRemaining: 8 },
      { muscleGroup: 'shoulders', recoveryPercent: 70, hoursRemaining: 16 },
      { muscleGroup: 'quadriceps', recoveryPercent: 45, hoursRemaining: 32 },
      { muscleGroup: 'biceps', recoveryPercent: 90, hoursRemaining: 4 },
      { muscleGroup: 'triceps', recoveryPercent: 95, hoursRemaining: 2 },
    ];

    const displayData = limit ? mockData.slice(0, limit) : mockData;
    const recoveredMuscles = mockData.filter((m) => m.recoveryPercent >= 90);
    const recoveringMuscles = mockData.filter((m) => m.recoveryPercent < 90);

    return (
      <div className={`bg-gray-800/50 rounded-xl border border-gray-700 ${compact ? 'p-4' : 'p-6'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold">Muscle Recovery</h3>
          </div>
          {!compact && (
            <div className="flex gap-1 bg-gray-700/50 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'list' ? 'bg-gray-600 text-white' : 'text-gray-400'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'grid' ? 'bg-gray-600 text-white' : 'text-gray-400'
                }`}
              >
                Grid
              </button>
            </div>
          )}
        </div>

        {/* Note about sample data */}
        <div className="mb-4 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-400">
            Complete workouts to see your actual muscle recovery status
          </p>
        </div>

        {/* Muscle List */}
        {viewMode === 'list' || compact ? (
          <div className="divide-y divide-gray-700/50">
            {displayData.map((muscle) => (
              <div
                key={muscle.muscleGroup}
                onClick={() => onMuscleSelect?.(muscle.muscleGroup)}
                className={onMuscleSelect ? 'cursor-pointer' : ''}
              >
                <MuscleRecoveryItem {...muscle} compact={compact} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {displayData.map((muscle) => {
              const muscleInfo = MUSCLE_GROUPS[muscle.muscleGroup as keyof typeof MUSCLE_GROUPS];
              const color = getRecoveryColor(muscle.recoveryPercent);
              return (
                <button
                  key={muscle.muscleGroup}
                  onClick={() => onMuscleSelect?.(muscle.muscleGroup)}
                  className="p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{muscleInfo?.icon || '💪'}</span>
                    <span className="text-sm font-medium truncate">
                      {muscleInfo?.name || muscle.muscleGroup}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${muscle.recoveryPercent}%`, backgroundColor: color }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {formatTimeRemaining(muscle.hoursRemaining)}
                    </span>
                    <span className="text-xs font-medium" style={{ color }}>
                      {muscle.recoveryPercent}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Recommendations */}
        {showRecommendations && !compact && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="text-sm font-medium text-gray-400 mb-3">Training Recommendations</h4>
            <div className="space-y-2">
              {recoveredMuscles.length > 0 && (
                <div className="flex items-start gap-2 p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-400 font-medium">Ready to train</p>
                    <p className="text-xs text-gray-400">
                      {recoveredMuscles.map((m) => {
                        const info = MUSCLE_GROUPS[m.muscleGroup as keyof typeof MUSCLE_GROUPS];
                        return info?.name || m.muscleGroup;
                      }).join(', ')}
                    </p>
                  </div>
                </div>
              )}
              {recoveringMuscles.length > 0 && (
                <div className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-400 font-medium">Still recovering</p>
                    <p className="text-xs text-gray-400">
                      Consider lighter training for: {recoveringMuscles.slice(0, 3).map((m) => {
                        const info = MUSCLE_GROUPS[m.muscleGroup as keyof typeof MUSCLE_GROUPS];
                        return info?.name || m.muscleGroup;
                      }).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Real data rendering
  const muscles = data.muscleRecoveryStatus;
  const displayData = limit ? muscles.slice(0, limit) : muscles;
  const recoveredMuscles = muscles.filter((m: { recoveryPercent: number }) => m.recoveryPercent >= 90);
  const recoveringMuscles = muscles.filter((m: { recoveryPercent: number }) => m.recoveryPercent < 90);

  return (
    <div className={`bg-gray-800/50 rounded-xl border border-gray-700 ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">Muscle Recovery</h3>
        </div>
        {!compact && (
          <div className="flex gap-1 bg-gray-700/50 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 text-xs rounded ${
                viewMode === 'list' ? 'bg-gray-600 text-white' : 'text-gray-400'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-1 text-xs rounded ${
                viewMode === 'grid' ? 'bg-gray-600 text-white' : 'text-gray-400'
              }`}
            >
              Grid
            </button>
          </div>
        )}
      </div>

      {/* Muscle List */}
      {viewMode === 'list' || compact ? (
        <div className="divide-y divide-gray-700/50">
          {displayData.map((muscle: MuscleRecoveryItemProps) => (
            <div
              key={muscle.muscleGroup}
              onClick={() => onMuscleSelect?.(muscle.muscleGroup)}
              className={onMuscleSelect ? 'cursor-pointer' : ''}
            >
              <MuscleRecoveryItem {...muscle} compact={compact} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {displayData.map((muscle: MuscleRecoveryItemProps) => {
            const muscleInfo = MUSCLE_GROUPS[muscle.muscleGroup as keyof typeof MUSCLE_GROUPS];
            const color = getRecoveryColor(muscle.recoveryPercent);
            return (
              <button
                key={muscle.muscleGroup}
                onClick={() => onMuscleSelect?.(muscle.muscleGroup)}
                className="p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{muscleInfo?.icon || '💪'}</span>
                  <span className="text-sm font-medium truncate">
                    {muscleInfo?.name || muscle.muscleGroup}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${muscle.recoveryPercent}%`, backgroundColor: color }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">
                    {formatTimeRemaining(muscle.hoursRemaining)}
                  </span>
                  <span className="text-xs font-medium" style={{ color }}>
                    {muscle.recoveryPercent}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Recommendations */}
      {showRecommendations && !compact && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Training Recommendations</h4>
          <div className="space-y-2">
            {recoveredMuscles.length > 0 && (
              <div className="flex items-start gap-2 p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                <div>
                  <p className="text-sm text-green-400 font-medium">Ready to train</p>
                  <p className="text-xs text-gray-400">
                    {recoveredMuscles.map((m: { muscleGroup: string }) => {
                      const info = MUSCLE_GROUPS[m.muscleGroup as keyof typeof MUSCLE_GROUPS];
                      return info?.name || m.muscleGroup;
                    }).join(', ')}
                  </p>
                </div>
              </div>
            )}
            {recoveringMuscles.length > 0 && (
              <div className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-400 font-medium">Still recovering</p>
                  <p className="text-xs text-gray-400">
                    Consider lighter training for: {recoveringMuscles.slice(0, 3).map((m: { muscleGroup: string }) => {
                      const info = MUSCLE_GROUPS[m.muscleGroup as keyof typeof MUSCLE_GROUPS];
                      return info?.name || m.muscleGroup;
                    }).join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MuscleRecoveryStatus;
