/**
 * Nutrition Page
 *
 * Full nutrition tracking dashboard
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Utensils,
  Plus,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  Target,
  TrendingUp,
  Calendar,
  Settings,
  BookOpen,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { GlassSurface } from '../components/glass/GlassSurface';
import { GlassButton } from '../components/glass/GlassButton';
import { GlassNav, GlassSidebar, GlassMobileNav } from '../components/glass/GlassNav';
import { MeshBackground } from '../components/glass/MeshBackground';
import { QuickLogModal } from '../components/nutrition/QuickLogModal';
import {
  useNutritionStore,
  useNutritionEnabled,
  useNutritionGoals,
  useTodaysSummary,
  useTodaysMeals,
  useNutritionStreaks,
  useArchetypeProfile,
} from '../store/nutritionStore';
import { useNutritionDashboard, useMealLog } from '../hooks/useNutrition';

/**
 * Circular progress component
 */
function CircularProgress({ progress, size = 120, strokeWidth = 10, color, children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, progress) / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/**
 * Macro stat card
 */
function MacroCard({ label, current, goal, unit, color, icon: Icon }) {
  const progress = goal > 0 ? (current / goal) * 100 : 0;
  const remaining = Math.max(0, goal - current);

  return (
    <GlassSurface className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="flex items-end justify-between mb-2">
        <div>
          <span className="text-2xl font-bold text-white">{Math.round(current)}</span>
          <span className="text-gray-400">/{goal}{unit}</span>
        </div>
        <span className="text-sm text-gray-400">{remaining}{unit} left</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, progress)}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </GlassSurface>
  );
}

/**
 * Meal item component
 */
function MealItem({ meal, onDelete: _onDelete }) {
  const name = meal.food?.name || meal.customFood?.name || meal.recipe?.name || meal.quickEntryName || 'Unknown';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
        <Utensils className="w-6 h-6 text-green-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{name}</p>
        <p className="text-sm text-gray-400">
          {meal.servings !== 1 && `${meal.servings} servings · `}
          {meal.mealType.replace('_', ' ')}
        </p>
      </div>
      <div className="text-right">
        <p className="text-white font-semibold">{meal.totalCalories}</p>
        <p className="text-xs text-gray-400">cal</p>
      </div>
    </motion.div>
  );
}

/**
 * Date navigator
 */
function DateNavigator({ date, onDateChange }) {
  const today = new Date().toISOString().split('T')[0];
  const isToday = date === today;

  const goToPrevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr) => {
    if (dateStr === today) return 'Today';
    const d = new Date(dateStr);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={goToPrevDay}
        className="p-2 rounded-full hover:bg-white/10 transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-gray-400" />
      </button>
      <div className="text-center">
        <p className="text-white font-semibold">{formatDate(date)}</p>
        <p className="text-xs text-gray-400">{new Date(date).toLocaleDateString()}</p>
      </div>
      <button
        onClick={goToNextDay}
        disabled={isToday}
        className={`p-2 rounded-full transition-colors ${
          isToday ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10'
        }`}
      >
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </button>
    </div>
  );
}

/**
 * Enable nutrition prompt
 */
function EnableNutritionPrompt() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <GlassSurface className="max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
          <Utensils className="w-10 h-10 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Nutrition Tracking</h1>
        <p className="text-gray-400 mb-6">
          Track your meals, macros, and nutrition goals to optimize your training results.
          Get personalized recommendations based on your archetype.
        </p>
        <GlassButton
          variant="primary"
          className="w-full mb-3"
          onClick={() => navigate('/settings/nutrition')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Enable Nutrition Tracking
        </GlassButton>
        <GlassButton
          variant="ghost"
          className="w-full"
          onClick={() => navigate('/dashboard')}
        >
          Maybe Later
        </GlassButton>
      </GlassSurface>
    </div>
  );
}

/**
 * Main Nutrition Page
 */
export default function Nutrition() {
  const enabled = useNutritionEnabled();
  const goals = useNutritionGoals();
  const summary = useTodaysSummary();
  const meals = useTodaysMeals();
  const streaks = useNutritionStreaks();
  const archetypeProfile = useArchetypeProfile();

  const { load, isLoading: _isLoading } = useNutritionDashboard();
  const { deleteMeal } = useMealLog();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const openQuickLog = useNutritionStore((s) => s.openQuickLog);

  useEffect(() => {
    load();
  }, [load]);

  if (!enabled) {
    return <EnableNutritionPrompt />;
  }

  const calories = summary?.totalCalories || 0;
  const calorieGoal = goals?.calories || 2000;
  const calorieProgress = (calories / calorieGoal) * 100;
  const remainingCalories = Math.max(0, calorieGoal - calories);

  const protein = summary?.totalProteinG || 0;
  const carbs = summary?.totalCarbsG || 0;
  const fat = summary?.totalFatG || 0;

  const proteinGoal = goals?.proteinG || 150;
  const carbsGoal = goals?.carbsG || 200;
  const fatGoal = goals?.fatG || 70;

  return (
    <div className="min-h-screen bg-gray-950">
      <MeshBackground />
      <GlassNav />
      <GlassSidebar />

      <main className="lg:pl-64 pt-16 pb-24 lg:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Nutrition</h1>
              <p className="text-gray-400">Track your daily nutrition</p>
            </div>
            <div className="flex gap-2">
              <Link to="/nutrition/settings">
                <GlassButton variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </GlassButton>
              </Link>
              <GlassButton variant="primary" onClick={() => openQuickLog('lunch')}>
                <Plus className="w-4 h-4 mr-2" />
                Log Food
              </GlassButton>
            </div>
          </div>

          {/* Date Navigator */}
          <GlassSurface className="p-4 mb-6">
            <DateNavigator date={selectedDate} onDateChange={setSelectedDate} />
          </GlassSurface>

          {/* Main Calorie Ring */}
          <GlassSurface className="p-6 mb-6">
            <div className="flex items-center gap-8">
              <CircularProgress
                progress={calorieProgress}
                size={140}
                strokeWidth={12}
                color={calorieProgress > 100 ? '#ef4444' : '#22c55e'}
              >
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{calories}</p>
                  <p className="text-xs text-gray-400">of {calorieGoal}</p>
                </div>
              </CircularProgress>

              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-1">Remaining</p>
                <p className="text-4xl font-bold text-white mb-1">{remainingCalories}</p>
                <p className="text-gray-400">calories</p>

                {summary?.wasWorkoutDay && (
                  <div className="flex items-center gap-2 mt-3 text-green-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    Workout day bonus applied
                  </div>
                )}

                {streaks?.currentLoggingStreak > 0 && (
                  <div className="flex items-center gap-2 mt-2 text-orange-400 text-sm">
                    <Flame className="w-4 h-4" />
                    {streaks.currentLoggingStreak} day streak
                  </div>
                )}
              </div>
            </div>
          </GlassSurface>

          {/* Macro Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <MacroCard
              label="Protein"
              current={protein}
              goal={proteinGoal}
              unit="g"
              color="#22c55e"
              icon={Target}
            />
            <MacroCard
              label="Carbs"
              current={carbs}
              goal={carbsGoal}
              unit="g"
              color="#3b82f6"
              icon={Sparkles}
            />
            <MacroCard
              label="Fat"
              current={fat}
              goal={fatGoal}
              unit="g"
              color="#f59e0b"
              icon={Droplets}
            />
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Link to="/nutrition/recipes">
              <GlassSurface className="p-4 text-center hover:bg-white/10 transition-colors">
                <BookOpen className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-gray-300">Recipes</p>
              </GlassSurface>
            </Link>
            <Link to="/nutrition/plans">
              <GlassSurface className="p-4 text-center hover:bg-white/10 transition-colors">
                <ClipboardList className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-gray-300">Meal Plans</p>
              </GlassSurface>
            </Link>
            <Link to="/nutrition/history">
              <GlassSurface className="p-4 text-center hover:bg-white/10 transition-colors">
                <Calendar className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-300">History</p>
              </GlassSurface>
            </Link>
          </div>

          {/* Archetype Profile */}
          {archetypeProfile && (
            <GlassSurface className="p-4 mb-6 border border-green-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{archetypeProfile.name}</p>
                  <p className="text-xs text-gray-400">{archetypeProfile.description}</p>
                </div>
                <Link to="/nutrition/archetype" className="text-green-400 text-sm hover:underline">
                  View tips
                </Link>
              </div>
            </GlassSurface>
          )}

          {/* Today's Meals */}
          <GlassSurface className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Today&apos;s Meals</h2>
              <span className="text-sm text-gray-400">{meals.length} items</span>
            </div>

            {meals.length > 0 ? (
              <div className="space-y-3">
                {meals.map((meal) => (
                  <MealItem key={meal.id} meal={meal} onDelete={deleteMeal} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Utensils className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-4">No meals logged yet today</p>
                <GlassButton
                  variant="primary"
                  onClick={() => openQuickLog('breakfast')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Log your first meal
                </GlassButton>
              </div>
            )}
          </GlassSurface>
        </div>
      </main>

      <GlassMobileNav />
      <QuickLogModal />
    </div>
  );
}
