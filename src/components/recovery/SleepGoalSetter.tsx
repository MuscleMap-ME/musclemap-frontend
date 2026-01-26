import React, { useState } from 'react';
import { SafeMotion } from '@/utils/safeMotion';
import { Moon, Clock, X, Check } from 'lucide-react';

interface SleepGoal {
  id?: string;
  targetHours: number;
  targetBedtime?: string;
  targetWakeTime?: string;
  daysActive?: string[];
}

interface SleepGoalSetterProps {
  currentGoal?: SleepGoal | null;
  onSave: (goal: Omit<SleepGoal, 'id'>) => void;
  onClose: () => void;
  loading?: boolean;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function SleepGoalSetter({ currentGoal, onSave, onClose, loading }: SleepGoalSetterProps) {
  const [targetHours, setTargetHours] = useState(currentGoal?.targetHours || 8);
  const [targetBedtime, setTargetBedtime] = useState(currentGoal?.targetBedtime || '22:00');
  const [targetWakeTime, setTargetWakeTime] = useState(currentGoal?.targetWakeTime || '06:00');
  const [daysActive, setDaysActive] = useState<string[]>(
    currentGoal?.daysActive || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  );

  const handleDayToggle = (day: string) => {
    setDaysActive((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      targetHours,
      targetBedtime,
      targetWakeTime,
      daysActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <SafeMotion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Moon className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Sleep Goal</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Target Hours */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Target Sleep Hours</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="12"
                step="0.5"
                value={targetHours}
                onChange={(e) => setTargetHours(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="w-20 text-center">
                <span className="text-2xl font-bold text-white">{targetHours}</span>
                <span className="text-sm text-gray-400 ml-1">hrs</span>
              </div>
            </div>
          </div>

          {/* Bedtime & Wake Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Bedtime
              </label>
              <input
                type="time"
                value={targetBedtime}
                onChange={(e) => setTargetBedtime(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Wake Time
              </label>
              <input
                type="time"
                value={targetWakeTime}
                onChange={(e) => setTargetWakeTime(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Active Days */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Active Days</label>
            <div className="flex gap-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayToggle(day)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    daysActive.includes(day)
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Save Goal
                </>
              )}
            </button>
          </div>
        </form>
      </SafeMotion.div>
    </div>
  );
}
