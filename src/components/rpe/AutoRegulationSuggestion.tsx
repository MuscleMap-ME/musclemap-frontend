import React from 'react';
import { SafeMotion } from '@/utils/safeMotion';
import { TrendingUp, TrendingDown, Minus, Zap, AlertTriangle } from 'lucide-react';

interface AutoRegulationData {
  suggestedAdjustment: 'increase' | 'decrease' | 'maintain';
  percentageChange: number;
  reason: string;
  confidence: number;
  basedOn: string[];
}

interface AutoRegulationSuggestionProps {
  data: AutoRegulationData;
  exerciseName: string;
  currentWeight?: number;
  onAccept?: (newWeight: number) => void;
  onDismiss?: () => void;
  compact?: boolean;
}

export function AutoRegulationSuggestion({
  data,
  exerciseName,
  currentWeight,
  onAccept,
  onDismiss,
  compact = false,
}: AutoRegulationSuggestionProps) {
  const { suggestedAdjustment, percentageChange, reason, confidence, basedOn } = data;

  const getAdjustmentIcon = () => {
    switch (suggestedAdjustment) {
      case 'increase':
        return <TrendingUp className="w-5 h-5 text-emerald-400" />;
      case 'decrease':
        return <TrendingDown className="w-5 h-5 text-amber-400" />;
      default:
        return <Minus className="w-5 h-5 text-blue-400" />;
    }
  };

  const getAdjustmentColor = () => {
    switch (suggestedAdjustment) {
      case 'increase':
        return 'border-emerald-500/30 bg-emerald-500/10';
      case 'decrease':
        return 'border-amber-500/30 bg-amber-500/10';
      default:
        return 'border-blue-500/30 bg-blue-500/10';
    }
  };

  const getAdjustmentText = () => {
    if (suggestedAdjustment === 'maintain') {
      return 'Maintain current weight';
    }
    const direction = suggestedAdjustment === 'increase' ? '+' : '-';
    return `${direction}${percentageChange}% weight`;
  };

  const calculateNewWeight = () => {
    if (!currentWeight) return null;
    const multiplier = suggestedAdjustment === 'increase'
      ? 1 + percentageChange / 100
      : suggestedAdjustment === 'decrease'
      ? 1 - percentageChange / 100
      : 1;
    return Math.round(currentWeight * multiplier * 2) / 2; // Round to nearest 0.5
  };

  const newWeight = calculateNewWeight();

  if (compact) {
    return (
      <SafeMotion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getAdjustmentColor()}`}
      >
        {getAdjustmentIcon()}
        <span className="text-sm font-medium text-white">{getAdjustmentText()}</span>
        {confidence >= 80 && <Zap className="w-4 h-4 text-purple-400" />}
      </SafeMotion.div>
    );
  }

  return (
    <SafeMotion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 ${getAdjustmentColor()}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {getAdjustmentIcon()}
          <h4 className="font-medium text-white">Auto-Regulation Suggestion</h4>
        </div>
        {confidence < 70 && (
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            Low confidence
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Exercise and suggestion */}
        <div>
          <p className="text-sm text-gray-400 mb-1">{exerciseName}</p>
          <p className="text-lg font-semibold text-white">{getAdjustmentText()}</p>
          {currentWeight && newWeight && suggestedAdjustment !== 'maintain' && (
            <p className="text-sm text-gray-300 mt-1">
              {currentWeight} lbs → {newWeight} lbs
            </p>
          )}
        </div>

        {/* Reason */}
        <p className="text-sm text-gray-300">{reason}</p>

        {/* Based on factors */}
        {basedOn.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {basedOn.map((factor, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs rounded-full bg-gray-700/50 text-gray-400"
              >
                {factor}
              </span>
            ))}
          </div>
        )}

        {/* Confidence bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Confidence</span>
            <span>{confidence}%</span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                confidence >= 80
                  ? 'bg-emerald-500'
                  : confidence >= 60
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        {(onAccept || onDismiss) && (
          <div className="flex gap-2 pt-2">
            {onAccept && newWeight && (
              <button
                onClick={() => onAccept(newWeight)}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Apply {newWeight} lbs
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
    </SafeMotion.div>
  );
}
