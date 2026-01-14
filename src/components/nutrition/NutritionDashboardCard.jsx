/**
 * Nutrition Dashboard Card
 *
 * Compact nutrition summary for the main dashboard
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Utensils, Droplets, TrendingUp, ChevronRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassSurface } from '../glass/GlassSurface';
import { GlassButton } from '../glass/GlassButton';
import {
  useNutritionEnabled,
  useNutritionGoals,
  useTodaysSummary,
  useNutritionStore,
} from '../../store/nutritionStore';

/**
 * Circular progress ring component
 */
function ProgressRing({ progress, size = 80, strokeWidth = 6, color = 'var(--brand-blue-500)' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--glass-white-10)"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}

/**
 * Macro progress bar component
 */
function MacroBar({ label, current, goal, color, unit = 'g' }) {
  const progress = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;

  return (
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
        <span className="text-xs text-gray-300">
          {Math.round(current)}/{goal}{unit}
        </span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/**
 * Not enabled state
 */
function NutritionDisabled() {
  return (
    <GlassSurface className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
            <Utensils className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="font-semibold text-white">Nutrition Tracking</h3>
        </div>
      </div>

      <p className="text-gray-400 text-sm mb-4">
        Track your meals, macros, and nutrition goals to optimize your training results.
      </p>

      <Link to="/nutrition/settings">
        <GlassButton variant="primary" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Enable Nutrition Tracking
        </GlassButton>
      </Link>
    </GlassSurface>
  );
}

/**
 * Main dashboard card
 */
export function NutritionDashboardCard() {
  const enabled = useNutritionEnabled();
  const goals = useNutritionGoals();
  const summary = useTodaysSummary();
  const openQuickLog = useNutritionStore((s) => s.openQuickLog);

  if (!enabled) {
    return <NutritionDisabled />;
  }

  const calories = summary?.totalCalories || 0;
  const calorieGoal = goals?.calories || 2000;
  const calorieProgress = Math.min(100, (calories / calorieGoal) * 100);
  const remaining = Math.max(0, calorieGoal - calories);

  const protein = summary?.totalProteinG || 0;
  const carbs = summary?.totalCarbsG || 0;
  const fat = summary?.totalFatG || 0;

  const proteinGoal = goals?.proteinG || 150;
  const carbsGoal = goals?.carbsG || 200;
  const fatGoal = goals?.fatG || 70;

  return (
    <GlassSurface className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
            <Utensils className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Today's Nutrition</h3>
            <p className="text-xs text-gray-400">{Math.round(calorieProgress)}% of daily goal</p>
          </div>
        </div>
        <Link
          to="/nutrition"
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
      </div>

      {/* Main calorie ring */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative">
          <ProgressRing
            progress={calorieProgress}
            size={100}
            strokeWidth={8}
            color={calorieProgress > 100 ? 'var(--feedback-error)' : 'var(--brand-blue-500)'}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{calories}</span>
            <span className="text-xs text-gray-400">/ {calorieGoal}</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="text-sm text-gray-400 mb-1">Remaining</div>
          <div className="text-3xl font-bold text-white">{remaining}</div>
          <div className="text-sm text-gray-400">calories</div>

          {summary?.wasWorkoutDay && (
            <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
              <TrendingUp className="w-3 h-3" />
              Workout day bonus applied
            </div>
          )}
        </div>
      </div>

      {/* Macro bars */}
      <div className="flex gap-4 mb-4">
        <MacroBar
          label="Protein"
          current={protein}
          goal={proteinGoal}
          color="#22c55e"
        />
        <MacroBar
          label="Carbs"
          current={carbs}
          goal={carbsGoal}
          color="#3b82f6"
        />
        <MacroBar
          label="Fat"
          current={fat}
          goal={fatGoal}
          color="#f59e0b"
        />
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <GlassButton
          variant="primary"
          className="flex-1"
          onClick={() => openQuickLog('lunch')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Log Food
        </GlassButton>
        <GlassButton
          variant="ghost"
          className="px-3"
          onClick={() => openQuickLog('water')}
        >
          <Droplets className="w-4 h-4" />
        </GlassButton>
      </div>

      {/* Suggestion */}
      {remaining > 0 && (
        <Link
          to="/nutrition/suggest"
          className="block mt-3 p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 hover:border-green-500/40 transition-colors"
        >
          <p className="text-sm text-gray-300">
            <span className="text-green-400">💡</span> Suggest a meal that fits my macros
          </p>
        </Link>
      )}
    </GlassSurface>
  );
}

export default NutritionDashboardCard;
