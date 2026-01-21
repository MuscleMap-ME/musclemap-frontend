/**
 * Nutrition Settings Page
 *
 * Configure nutrition tracking preferences and goals
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Target,
  Activity,
  Flame,
  Calculator,
  Eye,
  Trash2,
  AlertCircle,
  Check,
  ChevronRight,
} from 'lucide-react';
import { GlassSurface } from '../components/glass/GlassSurface';
import { GlassButton } from '../components/glass/GlassButton';
import { GlassNav } from '../components/glass/GlassNav';
import { GlassSidebar } from '../components/glass/GlassSidebar';
import { GlassMobileNav } from '../components/glass/GlassMobileNav';
import { MeshBackground } from '../components/glass/MeshBackground';
import {
  useNutritionEnabled,
  useNutritionPreferences,
  useNutritionGoals,
} from '../store/nutritionStore';
import {
  useNutritionPreferencesAPI,
  useNutritionGoalsAPI,
  useNutritionDashboard,
} from '../hooks/useNutrition';

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise' },
  { value: 'light', label: 'Light', description: 'Light exercise 1-3 days/week' },
  { value: 'moderate', label: 'Moderate', description: 'Moderate exercise 3-5 days/week' },
  { value: 'active', label: 'Active', description: 'Hard exercise 6-7 days/week' },
  { value: 'very_active', label: 'Very Active', description: 'Physical job + hard exercise' },
];

const GOAL_TYPES = [
  { value: 'lose', label: 'Lose Weight', color: 'text-red-400' },
  { value: 'maintain', label: 'Maintain', color: 'text-blue-400' },
  { value: 'gain', label: 'Build Muscle', color: 'text-green-400' },
];

const GOAL_INTENSITIES = [
  { value: 'slow', label: 'Slow', description: '~0.5 lb/week' },
  { value: 'moderate', label: 'Moderate', description: '~1 lb/week' },
  { value: 'aggressive', label: 'Aggressive', description: '~1.5 lb/week' },
];

// Unit conversion helpers
const lbsToKg = (lbs: number) => lbs * 0.453592;
const kgToLbs = (kg: number) => kg / 0.453592;
const ftInToCm = (ft: number, inches: number) => (ft * 12 + inches) * 2.54;
const cmToFtIn = (cm: number) => {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { ft, inches };
};

/**
 * Goal calculator form
 */
function GoalCalculator({ onCalculate, isLoading }) {
  const [formData, setFormData] = useState({
    weightKg: '',
    heightCm: '',
    age: '',
    sex: 'male',
    activityLevel: 'moderate',
    goalType: 'maintain',
    goalIntensity: 'moderate',
  });

  // Unit preferences (default to imperial for US users)
  const [useImperial, setUseImperial] = useState(true);
  const [weightLbs, setWeightLbs] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');

  // Handle weight change with unit conversion
  const handleWeightChange = (value: string, isImperial: boolean) => {
    if (isImperial) {
      setWeightLbs(value);
      if (value) {
        const kg = lbsToKg(parseFloat(value));
        setFormData({ ...formData, weightKg: kg.toFixed(1) });
      } else {
        setFormData({ ...formData, weightKg: '' });
      }
    } else {
      setFormData({ ...formData, weightKg: value });
      if (value) {
        const lbs = kgToLbs(parseFloat(value));
        setWeightLbs(lbs.toFixed(1));
      } else {
        setWeightLbs('');
      }
    }
  };

  // Handle height change with unit conversion
  const handleHeightChange = (ft: string, inches: string) => {
    setHeightFt(ft);
    setHeightIn(inches);
    if (ft || inches) {
      const cm = ftInToCm(parseFloat(ft) || 0, parseFloat(inches) || 0);
      setFormData({ ...formData, heightCm: cm.toFixed(0) });
    } else {
      setFormData({ ...formData, heightCm: '' });
    }
  };

  const handleHeightCmChange = (value: string) => {
    setFormData({ ...formData, heightCm: value });
    if (value) {
      const { ft, inches } = cmToFtIn(parseFloat(value));
      setHeightFt(ft.toString());
      setHeightIn(inches.toString());
    } else {
      setHeightFt('');
      setHeightIn('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onCalculate({
      ...formData,
      weightKg: parseFloat(formData.weightKg),
      heightCm: parseFloat(formData.heightCm),
      age: parseInt(formData.age, 10),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Unit Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-white/10 p-1">
          <button
            type="button"
            onClick={() => setUseImperial(true)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              useImperial ? 'bg-green-500/20 text-green-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            lbs / ft
          </button>
          <button
            type="button"
            onClick={() => setUseImperial(false)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              !useImperial ? 'bg-green-500/20 text-green-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            kg / cm
          </button>
        </div>
      </div>

      {/* Body Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Weight ({useImperial ? 'lbs' : 'kg'})
          </label>
          {useImperial ? (
            <input
              type="number"
              step="0.1"
              required
              value={weightLbs}
              onChange={(e) => handleWeightChange(e.target.value, true)}
              className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white
                         focus:outline-none focus:border-green-500/50"
              placeholder="155"
            />
          ) : (
            <input
              type="number"
              step="0.1"
              required
              value={formData.weightKg}
              onChange={(e) => handleWeightChange(e.target.value, false)}
              className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white
                         focus:outline-none focus:border-green-500/50"
              placeholder="70"
            />
          )}
          {useImperial && formData.weightKg && (
            <p className="text-xs text-gray-500 mt-1">= {formData.weightKg} kg</p>
          )}
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Height ({useImperial ? 'ft / in' : 'cm'})
          </label>
          {useImperial ? (
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="8"
                  required
                  value={heightFt}
                  onChange={(e) => handleHeightChange(e.target.value, heightIn)}
                  className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white
                             focus:outline-none focus:border-green-500/50"
                  placeholder="5"
                />
                <span className="text-xs text-gray-500 mt-1 block text-center">ft</span>
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="11"
                  value={heightIn}
                  onChange={(e) => handleHeightChange(heightFt, e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white
                             focus:outline-none focus:border-green-500/50"
                  placeholder="9"
                />
                <span className="text-xs text-gray-500 mt-1 block text-center">in</span>
              </div>
            </div>
          ) : (
            <input
              type="number"
              required
              value={formData.heightCm}
              onChange={(e) => handleHeightCmChange(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white
                         focus:outline-none focus:border-green-500/50"
              placeholder="175"
            />
          )}
          {useImperial && formData.heightCm && (
            <p className="text-xs text-gray-500 mt-1">= {formData.heightCm} cm</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Age</label>
          <input
            type="number"
            required
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white
                       focus:outline-none focus:border-green-500/50"
            placeholder="30"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">Sex</label>
          <select
            value={formData.sex}
            onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white
                       focus:outline-none focus:border-green-500/50"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Activity Level */}
      <div>
        <label className="block text-sm text-gray-400 mb-3">Activity Level</label>
        <div className="space-y-2">
          {ACTIVITY_LEVELS.map((level) => (
            <label
              key={level.value}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                formData.activityLevel === level.value
                  ? 'border-green-500/50 bg-green-500/10'
                  : 'border-white/10 hover:bg-white/5'
              }`}
            >
              <input
                type="radio"
                name="activityLevel"
                value={level.value}
                checked={formData.activityLevel === level.value}
                onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value })}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                formData.activityLevel === level.value
                  ? 'border-green-400 bg-green-400'
                  : 'border-white/30'
              }`}>
                {formData.activityLevel === level.value && (
                  <Check className="w-3 h-3 text-black" />
                )}
              </div>
              <div>
                <p className="text-white font-medium">{level.label}</p>
                <p className="text-xs text-gray-400">{level.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Goal Type */}
      <div>
        <label className="block text-sm text-gray-400 mb-3">Goal</label>
        <div className="grid grid-cols-3 gap-3">
          {GOAL_TYPES.map((goal) => (
            <button
              key={goal.value}
              type="button"
              onClick={() => setFormData({ ...formData, goalType: goal.value })}
              className={`p-4 rounded-xl border text-center transition-colors ${
                formData.goalType === goal.value
                  ? 'border-green-500/50 bg-green-500/10'
                  : 'border-white/10 hover:bg-white/5'
              }`}
            >
              <span className={`font-medium ${goal.color}`}>{goal.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Goal Intensity */}
      {formData.goalType !== 'maintain' && (
        <div>
          <label className="block text-sm text-gray-400 mb-3">Intensity</label>
          <div className="grid grid-cols-3 gap-3">
            {GOAL_INTENSITIES.map((intensity) => (
              <button
                key={intensity.value}
                type="button"
                onClick={() => setFormData({ ...formData, goalIntensity: intensity.value })}
                className={`p-4 rounded-xl border text-center transition-colors ${
                  formData.goalIntensity === intensity.value
                    ? 'border-green-500/50 bg-green-500/10'
                    : 'border-white/10 hover:bg-white/5'
                }`}
              >
                <p className="text-white font-medium">{intensity.label}</p>
                <p className="text-xs text-gray-400">{intensity.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <GlassButton
        type="submit"
        variant="primary"
        className="w-full"
        disabled={isLoading}
      >
        <Calculator className="w-4 h-4 mr-2" />
        {isLoading ? 'Calculating...' : 'Calculate Goals'}
      </GlassButton>
    </form>
  );
}

/**
 * Main settings page
 */
export default function NutritionSettings() {
  const navigate = useNavigate();
  const enabled = useNutritionEnabled();
  const preferences = useNutritionPreferences();
  const goals = useNutritionGoals();

  const { enable, disable, updatePreferences } = useNutritionPreferencesAPI();
  const { calculateGoals } = useNutritionGoalsAPI();
  const { load, isLoading: _isLoading } = useNutritionDashboard();

  const [showCalculator, setShowCalculator] = useState(!goals);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  const handleEnable = async () => {
    setActionLoading(true);
    try {
      await enable();
      setShowCalculator(true);
    } catch (err) {
      console.error('Failed to enable:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable = async (deleteData = false) => {
    setActionLoading(true);
    try {
      await disable(deleteData);
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to disable:', err);
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCalculateGoals = async (input) => {
    setActionLoading(true);
    try {
      await calculateGoals(input);
      setShowCalculator(false);
    } catch (err) {
      console.error('Failed to calculate goals:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePreference = async (key) => {
    if (!preferences) return;
    try {
      await updatePreferences({ [key]: !preferences[key] });
    } catch (err) {
      console.error('Failed to update preference:', err);
    }
  };

  // Enable prompt if not enabled
  if (!enabled) {
    return (
      <div className="min-h-screen bg-gray-950">
        <MeshBackground />
        <GlassNav />
        <GlassSidebar />

        <main className="lg:pl-64 pt-16 pb-24 lg:pb-8">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <GlassSurface className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                <Target className="w-10 h-10 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">Enable Nutrition Tracking</h1>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Track your meals, calories, and macros. Get personalized goals based on your body metrics
                and training archetype.
              </p>

              <ul className="text-left max-w-sm mx-auto mb-8 space-y-3">
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  Smart macro calculations
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  Food database with barcode scanning
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  Recipe & meal plan creation
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  Archetype-specific recommendations
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  Workout day calorie adjustments
                </li>
              </ul>

              <GlassButton
                variant="primary"
                onClick={handleEnable}
                disabled={actionLoading}
                className="w-full max-w-xs"
              >
                {actionLoading ? 'Enabling...' : 'Enable Nutrition Tracking'}
              </GlassButton>
            </GlassSurface>
          </div>
        </main>

        <GlassMobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <MeshBackground />
      <GlassNav />
      <GlassSidebar />

      <main className="lg:pl-64 pt-16 pb-24 lg:pb-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link to="/nutrition">
              <GlassButton variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </GlassButton>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Nutrition Settings</h1>
              <p className="text-gray-400">Configure your tracking preferences</p>
            </div>
          </div>

          {/* Current Goals */}
          {goals && !showCalculator && (
            <GlassSurface className="p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Your Goals</h2>
                <button
                  onClick={() => setShowCalculator(true)}
                  className="text-sm text-green-400 hover:underline"
                >
                  Recalculate
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white/5 rounded-xl">
                  <p className="text-2xl font-bold text-white">{goals.calories}</p>
                  <p className="text-xs text-gray-400">Calories</p>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-xl">
                  <p className="text-2xl font-bold text-green-400">{goals.proteinG}g</p>
                  <p className="text-xs text-gray-400">Protein</p>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-xl">
                  <p className="text-2xl font-bold text-blue-400">{goals.carbsG}g</p>
                  <p className="text-xs text-gray-400">Carbs</p>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-xl">
                  <p className="text-2xl font-bold text-yellow-400">{goals.fatG}g</p>
                  <p className="text-xs text-gray-400">Fat</p>
                </div>
              </div>

              {goals.workoutDayCalories > goals.calories && (
                <div className="mt-4 p-3 bg-green-500/10 rounded-xl text-sm text-green-300">
                  <Flame className="w-4 h-4 inline mr-2" />
                  On workout days: {goals.workoutDayCalories} cal, {goals.workoutDayProteinG}g protein
                </div>
              )}

              <div className="mt-4 text-xs text-gray-500">
                BMR: {goals.bmr} cal | TDEE: {goals.tdee} cal
              </div>
            </GlassSurface>
          )}

          {/* Goal Calculator */}
          {showCalculator && (
            <GlassSurface className="p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Calculate Your Goals</h2>
              <GoalCalculator onCalculate={handleCalculateGoals} isLoading={actionLoading} />
            </GlassSurface>
          )}

          {/* Preferences */}
          <GlassSurface className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Preferences</h2>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-white font-medium">Show on Dashboard</p>
                    <p className="text-xs text-gray-400">Display nutrition widget on main dashboard</p>
                  </div>
                </div>
                <div
                  onClick={() => handleTogglePreference('showOnDashboard')}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${
                    preferences?.showOnDashboard ? 'bg-green-500' : 'bg-white/20'
                  }`}
                >
                  <motion.div
                    className="w-4 h-4 rounded-full bg-white"
                    animate={{ x: preferences?.showOnDashboard ? 24 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </div>
              </label>

              <label className="flex items-center justify-between p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-white font-medium">Sync with Workouts</p>
                    <p className="text-xs text-gray-400">Adjust calories on workout days</p>
                  </div>
                </div>
                <div
                  onClick={() => handleTogglePreference('syncWithWorkouts')}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${
                    preferences?.syncWithWorkouts ? 'bg-green-500' : 'bg-white/20'
                  }`}
                >
                  <motion.div
                    className="w-4 h-4 rounded-full bg-white"
                    animate={{ x: preferences?.syncWithWorkouts ? 24 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </div>
              </label>

              <label className="flex items-center justify-between p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-white font-medium">Sync with Archetype</p>
                    <p className="text-xs text-gray-400">Use archetype-specific nutrition profile</p>
                  </div>
                </div>
                <div
                  onClick={() => handleTogglePreference('syncWithArchetype')}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${
                    preferences?.syncWithArchetype ? 'bg-green-500' : 'bg-white/20'
                  }`}
                >
                  <motion.div
                    className="w-4 h-4 rounded-full bg-white"
                    animate={{ x: preferences?.syncWithArchetype ? 24 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </div>
              </label>
            </div>
          </GlassSurface>

          {/* Danger Zone */}
          <GlassSurface className="p-6 border border-red-500/20">
            <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-3 w-full p-4 bg-red-500/10 rounded-xl text-left hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-red-400 font-medium">Disable Nutrition Tracking</p>
                  <p className="text-xs text-gray-400">Turn off tracking and optionally delete all data</p>
                </div>
                <ChevronRight className="w-5 h-5 text-red-400 ml-auto" />
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium">Are you sure?</p>
                    <p className="text-sm text-gray-400 mt-1">
                      You can disable tracking and keep your data, or delete everything permanently.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <GlassButton
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </GlassButton>
                  <GlassButton
                    variant="ghost"
                    className="flex-1 text-yellow-400 border-yellow-400/30"
                    onClick={() => handleDisable(false)}
                    disabled={actionLoading}
                  >
                    Disable Only
                  </GlassButton>
                  <GlassButton
                    variant="ghost"
                    className="flex-1 text-red-400 border-red-400/30"
                    onClick={() => handleDisable(true)}
                    disabled={actionLoading}
                  >
                    Delete All Data
                  </GlassButton>
                </div>
              </div>
            )}
          </GlassSurface>
        </div>
      </main>

      <GlassMobileNav />
    </div>
  );
}
