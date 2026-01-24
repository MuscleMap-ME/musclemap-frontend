/**
 * Quick Sleep Log Component
 *
 * Fast sleep logging with:
 * - Bedtime/wake time pickers
 * - Quality rating (1-5 stars)
 * - Quick presets for common patterns
 * - Optional sleep factors
 */

import React, { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';
import {
  Moon,
  Sun,
  Star,
  Coffee,
  Wine,
  Smartphone,
  Utensils,
  Dumbbell,
  ChevronDown,
  Check,
  Loader2,
} from 'lucide-react';
import { LOG_SLEEP_MUTATION } from '@/graphql/mutations';
import { RECOVERY_SCORE_QUERY, LAST_SLEEP_QUERY, SLEEP_STATS_QUERY } from '@/graphql/queries';

// Sleep quality presets
const QUICK_PRESETS = [
  { label: 'Slept Great', hours: 8, quality: 5, icon: '😴' },
  { label: 'Slept Well', hours: 7.5, quality: 4, icon: '🙂' },
  { label: 'Slept Okay', hours: 7, quality: 3, icon: '😐' },
  { label: 'Slept Poorly', hours: 6, quality: 2, icon: '😔' },
];

// Sleep factors that can affect recovery
const SLEEP_FACTORS = [
  { key: 'lateExercise', label: 'Late Exercise', icon: Dumbbell, description: 'Worked out within 3 hours of bed' },
  { key: 'lateFood', label: 'Late Meal', icon: Utensils, description: 'Ate a large meal close to bedtime' },
  { key: 'screenBeforeBed', label: 'Screen Time', icon: Smartphone, description: 'Used phone/computer before bed' },
  { key: 'caffeineAfter6pm', label: 'Late Caffeine', icon: Coffee, description: 'Had coffee or energy drinks after 6pm' },
  { key: 'alcoholConsumed', label: 'Alcohol', icon: Wine, description: 'Consumed alcohol before bed' },
];

interface QuickSleepLogProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultBedTime?: string;
  defaultWakeTime?: string;
}

export function QuickSleepLog({ onSuccess, onCancel, defaultBedTime, defaultWakeTime }: QuickSleepLogProps) {
  // Calculate default times (last night)
  const getDefaultBedTime = () => {
    if (defaultBedTime) return defaultBedTime;
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(22, 30, 0, 0);
    return yesterday.toISOString().slice(0, 16);
  };

  const getDefaultWakeTime = () => {
    if (defaultWakeTime) return defaultWakeTime;
    const now = new Date();
    now.setHours(6, 30, 0, 0);
    return now.toISOString().slice(0, 16);
  };

  const [bedTime, setBedTime] = useState(getDefaultBedTime());
  const [wakeTime, setWakeTime] = useState(getDefaultWakeTime());
  const [quality, setQuality] = useState<number>(3);
  const [notes, setNotes] = useState('');
  const [showFactors, setShowFactors] = useState(false);
  const [factors, setFactors] = useState<Record<string, boolean>>({});

  const [logSleep, { loading }] = useMutation(LOG_SLEEP_MUTATION, {
    refetchQueries: [
      { query: RECOVERY_SCORE_QUERY },
      { query: LAST_SLEEP_QUERY },
      { query: SLEEP_STATS_QUERY, variables: { period: 'week' } },
    ],
    onCompleted: () => {
      onSuccess?.();
    },
  });

  // Calculate sleep duration
  const calculateDuration = useCallback(() => {
    const bed = new Date(bedTime);
    const wake = new Date(wakeTime);
    let diff = wake.getTime() - bed.getTime();
    if (diff < 0) diff += 24 * 60 * 60 * 1000; // Handle overnight
    return diff / (1000 * 60 * 60); // Hours
  }, [bedTime, wakeTime]);

  const duration = calculateDuration();

  // Apply preset
  const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setQuality(preset.quality);
    // Adjust wake time based on hours
    const bed = new Date(bedTime);
    const wake = new Date(bed.getTime() + preset.hours * 60 * 60 * 1000);
    setWakeTime(wake.toISOString().slice(0, 16));
  };

  // Toggle factor
  const toggleFactor = (key: string) => {
    setFactors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
      await logSleep({
        variables: {
          input: {
            bedTime: new Date(bedTime).toISOString(),
            wakeTime: new Date(wakeTime).toISOString(),
            quality,
            notes: notes.trim() || undefined,
            factors: Object.keys(factors).length > 0 ? factors : undefined,
          },
        },
      });
    } catch (err) {
      console.error('Failed to log sleep:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Presets */}
      <div className="space-y-2">
        <label className="text-sm text-gray-400">Quick Log</label>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className={`p-3 rounded-lg border transition-all text-left ${
                quality === preset.quality && Math.abs(duration - preset.hours) < 0.5
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{preset.icon}</span>
                <div>
                  <p className="font-medium text-sm">{preset.label}</p>
                  <p className="text-xs text-gray-500">{preset.hours}h</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Time Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            <Moon className="w-4 h-4" />
            Bedtime
          </label>
          <input
            type="datetime-local"
            value={bedTime}
            onChange={(e) => setBedTime(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            <Sun className="w-4 h-4" />
            Wake Time
          </label>
          <input
            type="datetime-local"
            value={wakeTime}
            onChange={(e) => setWakeTime(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Duration Display */}
      <div className="text-center py-3 bg-gray-800/30 rounded-lg">
        <p className="text-2xl font-bold">{duration.toFixed(1)} hours</p>
        <p className="text-sm text-gray-500">
          {duration >= 8 && 'Great sleep duration!'}
          {duration >= 7 && duration < 8 && 'Good sleep duration'}
          {duration >= 6 && duration < 7 && 'Slightly short on sleep'}
          {duration < 6 && 'Consider getting more sleep'}
        </p>
      </div>

      {/* Quality Rating */}
      <div className="space-y-2">
        <label className="text-sm text-gray-400">Sleep Quality</label>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              onClick={() => setQuality(rating)}
              className="p-2 transition-all hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${
                  rating <= quality
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-600'
                }`}
              />
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500">
          {quality === 1 && 'Terrible - barely slept'}
          {quality === 2 && 'Poor - woke up frequently'}
          {quality === 3 && 'Okay - some disturbances'}
          {quality === 4 && 'Good - slept well'}
          {quality === 5 && 'Excellent - deep, restful sleep'}
        </p>
      </div>

      {/* Sleep Factors Toggle */}
      <button
        onClick={() => setShowFactors(!showFactors)}
        className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-300 flex items-center justify-center gap-2 border border-gray-700 rounded-lg"
      >
        <span>Sleep Factors (optional)</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showFactors ? 'rotate-180' : ''}`} />
      </button>

      {/* Sleep Factors */}
      <SafeAnimatePresence>
        {showFactors && (
          <SafeMotion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-2">
              {SLEEP_FACTORS.map((factor) => {
                const Icon = factor.icon;
                const isActive = factors[factor.key];
                return (
                  <button
                    key={factor.key}
                    onClick={() => toggleFactor(factor.key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      isActive
                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                        : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{factor.label}</p>
                      <p className="text-xs text-gray-500">{factor.description}</p>
                    </div>
                    {isActive && <Check className="w-5 h-5" />}
                  </button>
                );
              })}
            </div>
          </SafeMotion.div>
        )}
      </SafeAnimatePresence>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm text-gray-400">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did you feel when you woke up?"
          rows={2}
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Moon className="w-5 h-5" />
              Log Sleep
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default QuickSleepLog;
