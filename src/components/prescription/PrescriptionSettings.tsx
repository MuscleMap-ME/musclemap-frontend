import React, { useState } from 'react';
import { SafeMotion } from '@/utils/safeMotion';
import {
  Settings,
  Clock,
  Target,
  Dumbbell,
  Zap,
  Activity,
  Calendar,
  Save,
} from 'lucide-react';

interface PrescriptionPreferences {
  preferredDuration: number; // minutes
  preferredIntensity: 'low' | 'moderate' | 'high' | 'adaptive';
  focusMuscleGroups: string[];
  avoidMuscleGroups: string[];
  equipmentAvailable: string[];
  workoutDaysPerWeek: number;
  goalType: 'strength' | 'hypertrophy' | 'endurance' | 'weight_loss' | 'general';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  includeWarmup: boolean;
  includeCooldown: boolean;
  supersetEnabled: boolean;
  dropsetEnabled: boolean;
  restPausedEnabled: boolean;
}

interface PrescriptionSettingsProps {
  preferences: PrescriptionPreferences;
  onSave: (preferences: PrescriptionPreferences) => void;
  isLoading?: boolean;
  muscleGroups?: string[];
  equipment?: string[];
}

const INTENSITY_OPTIONS = [
  { value: 'low', label: 'Low', description: 'Light effort, suitable for recovery' },
  { value: 'moderate', label: 'Moderate', description: 'Balanced intensity' },
  { value: 'high', label: 'High', description: 'Challenging, push your limits' },
  { value: 'adaptive', label: 'Adaptive', description: 'AI adjusts based on recovery' },
];

const GOAL_OPTIONS = [
  { value: 'strength', label: 'Strength', icon: Zap },
  { value: 'hypertrophy', label: 'Muscle Growth', icon: Dumbbell },
  { value: 'endurance', label: 'Endurance', icon: Activity },
  { value: 'weight_loss', label: 'Weight Loss', icon: Target },
  { value: 'general', label: 'General Fitness', icon: Activity },
];

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Beginner', description: '<1 year training' },
  { value: 'intermediate', label: 'Intermediate', description: '1-3 years training' },
  { value: 'advanced', label: 'Advanced', description: '3+ years training' },
];

export function PrescriptionSettings({
  preferences,
  onSave,
  isLoading,
  muscleGroups = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core', 'Glutes'],
  equipment = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Kettlebell', 'Bands'],
}: PrescriptionSettingsProps) {
  const [formData, setFormData] = useState<PrescriptionPreferences>(preferences);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const toggleArrayItem = (array: string[], item: string): string[] => {
    return array.includes(item)
      ? array.filter((i) => i !== item)
      : [...array, item];
  };

  return (
    <SafeMotion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden"
    >
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Prescription Settings</h3>
            <p className="text-sm text-gray-400">Customize your AI workout recommendations</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Duration */}
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Clock className="w-4 h-4" />
            Preferred Workout Duration
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="15"
              max="120"
              step="5"
              value={formData.preferredDuration}
              onChange={(e) =>
                setFormData({ ...formData, preferredDuration: Number(e.target.value) })
              }
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="w-16 text-center text-white font-medium">
              {formData.preferredDuration}m
            </span>
          </div>
        </div>

        {/* Workout Days */}
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Calendar className="w-4 h-4" />
            Workout Days Per Week
          </label>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6, 7].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setFormData({ ...formData, workoutDaysPerWeek: days })}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  formData.workoutDaysPerWeek === days
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {days}
              </button>
            ))}
          </div>
        </div>

        {/* Goal Type */}
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Target className="w-4 h-4" />
            Primary Goal
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GOAL_OPTIONS.map((goal) => {
              const Icon = goal.icon;
              return (
                <button
                  key={goal.value}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      goalType: goal.value as PrescriptionPreferences['goalType'],
                    })
                  }
                  className={`flex items-center gap-2 p-3 rounded-lg transition-colors ${
                    formData.goalType === goal.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{goal.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Intensity */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Intensity Level</label>
          <div className="space-y-2">
            {INTENSITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    preferredIntensity: option.value as PrescriptionPreferences['preferredIntensity'],
                  })
                }
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                  formData.preferredIntensity === option.value
                    ? 'bg-purple-600/20 border border-purple-500'
                    : 'bg-gray-800 border border-transparent'
                }`}
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-white">{option.label}</p>
                  <p className="text-xs text-gray-400">{option.description}</p>
                </div>
                {formData.preferredIntensity === option.value && (
                  <div className="w-4 h-4 rounded-full bg-purple-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Experience Level */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Experience Level</label>
          <div className="grid grid-cols-3 gap-2">
            {EXPERIENCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    experienceLevel: option.value as PrescriptionPreferences['experienceLevel'],
                  })
                }
                className={`p-3 rounded-lg text-center transition-colors ${
                  formData.experienceLevel === option.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs opacity-70">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Focus Muscle Groups */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Focus Muscle Groups</label>
          <div className="flex flex-wrap gap-2">
            {muscleGroups.map((muscle) => (
              <button
                key={muscle}
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    focusMuscleGroups: toggleArrayItem(formData.focusMuscleGroups, muscle),
                  })
                }
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  formData.focusMuscleGroups.includes(muscle)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {muscle}
              </button>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Available Equipment</label>
          <div className="flex flex-wrap gap-2">
            {equipment.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    equipmentAvailable: toggleArrayItem(formData.equipmentAvailable, item),
                  })
                }
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  formData.equipmentAvailable.includes(item)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Techniques */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Advanced Techniques</label>
          <div className="space-y-2">
            {[
              { key: 'includeWarmup', label: 'Include Warmup' },
              { key: 'includeCooldown', label: 'Include Cooldown' },
              { key: 'supersetEnabled', label: 'Allow Supersets' },
              { key: 'dropsetEnabled', label: 'Allow Drop Sets' },
              { key: 'restPausedEnabled', label: 'Allow Rest-Pause Sets' },
            ].map((option) => (
              <label
                key={option.key}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg cursor-pointer"
              >
                <span className="text-sm text-white">{option.label}</span>
                <input
                  type="checkbox"
                  checked={formData[option.key as keyof PrescriptionPreferences] as boolean}
                  onChange={(e) =>
                    setFormData({ ...formData, [option.key]: e.target.checked })
                  }
                  className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
            isLoading
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Preferences
            </>
          )}
        </button>
      </form>
    </SafeMotion.div>
  );
}
