import React from 'react';
import { SafeMotion } from '@/utils/safeMotion';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MuscleGroupFatigue {
  muscleGroup: string;
  fatigue: number;
  recoveryHours: number;
}

interface FatigueData {
  overallFatigue: number;
  muscleGroupFatigue: MuscleGroupFatigue[];
  recommendations: string[];
}

interface FatigueAlertBannerProps {
  fatigue: FatigueData;
  onDismiss?: () => void;
}

export function FatigueAlertBanner({ fatigue, onDismiss }: FatigueAlertBannerProps) {
  const { overallFatigue, muscleGroupFatigue, recommendations } = fatigue;

  // Only show banner if fatigue is significant
  if (overallFatigue < 60) {
    return null;
  }

  const getSeverity = () => {
    if (overallFatigue >= 85) return 'critical';
    if (overallFatigue >= 70) return 'warning';
    return 'info';
  };

  const severity = getSeverity();

  const severityStyles = {
    critical: {
      bg: 'bg-red-500/10 border-red-500/30',
      icon: 'text-red-400',
      text: 'text-red-400',
    },
    warning: {
      bg: 'bg-amber-500/10 border-amber-500/30',
      icon: 'text-amber-400',
      text: 'text-amber-400',
    },
    info: {
      bg: 'bg-blue-500/10 border-blue-500/30',
      icon: 'text-blue-400',
      text: 'text-blue-400',
    },
  };

  const styles = severityStyles[severity];

  // Get most fatigued muscle groups
  const topFatigued = [...muscleGroupFatigue]
    .sort((a, b) => b.fatigue - a.fatigue)
    .slice(0, 3);

  return (
    <SafeMotion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-xl border p-4 ${styles.bg}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${styles.icon}`}>
          <AlertTriangle className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className={`font-medium ${styles.text}`}>
              {severity === 'critical' ? 'High Fatigue Detected' :
               severity === 'warning' ? 'Elevated Fatigue' : 'Fatigue Notice'}
            </h4>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          <p className="text-sm text-gray-300 mb-3">
            Your overall fatigue level is {overallFatigue}%.{' '}
            {severity === 'critical' ? 'Consider taking a rest day.' :
             severity === 'warning' ? 'Light training recommended.' :
             'Monitor your recovery.'}
          </p>

          {/* Fatigued Muscle Groups */}
          {topFatigued.length > 0 && (
            <div className="mb-3">
              <span className="text-xs text-gray-500 uppercase">Most Fatigued</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {topFatigued.map((mg) => (
                  <div
                    key={mg.muscleGroup}
                    className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-2 py-1"
                  >
                    <span className="text-sm text-white">{mg.muscleGroup}</span>
                    <span className="text-xs text-gray-400">{mg.fatigue}%</span>
                    <span className="text-xs text-gray-500">
                      ({Math.round(mg.recoveryHours)}h recovery)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="mb-3">
              <span className="text-xs text-gray-500 uppercase">Recommendations</span>
              <ul className="mt-1 space-y-1">
                {recommendations.slice(0, 2).map((rec, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Link */}
          <Link
            to="/recovery"
            className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            View Recovery Details
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </SafeMotion.div>
  );
}
