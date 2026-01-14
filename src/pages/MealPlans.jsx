/**
 * Meal Plans Page
 *
 * Create and manage meal plans
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  ShoppingCart,
  ArrowLeft,
  Check,
  Play,
  Sparkles,
  ChevronRight,
  Wand2,
} from 'lucide-react';
import { GlassSurface } from '../components/glass/GlassSurface';
import { GlassButton } from '../components/glass/GlassButton';
import { GlassNav } from '../components/glass/GlassNav';
import { GlassSidebar } from '../components/glass/GlassSidebar';
import { GlassMobileNav } from '../components/glass/GlassMobileNav';
import { MeshBackground } from '../components/glass/MeshBackground';
import { useMealPlans } from '../hooks/useNutrition';
import { useNutritionGoals } from '../store/nutritionStore';

const PLAN_STATUS_COLORS = {
  draft: 'bg-gray-500/20 text-gray-400',
  active: 'bg-green-500/20 text-green-400',
  completed: 'bg-blue-500/20 text-blue-400',
  archived: 'bg-white/10 text-gray-500',
};

/**
 * Meal plan card
 */
function MealPlanCard({ plan, onActivate, isActive }) {
  const navigate = useNavigate();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group cursor-pointer"
      onClick={() => navigate(`/nutrition/plans/${plan.id}`)}
    >
      <GlassSurface className={`p-6 hover:bg-white/10 transition-colors ${isActive ? 'border border-green-500/30' : ''}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold mb-1 group-hover:text-green-400 transition-colors">
              {plan.name}
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${PLAN_STATUS_COLORS[plan.status]}`}>
              {plan.status === 'active' && <Play className="w-3 h-3 mr-1" />}
              {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
            </span>
          </div>
          {isActive && (
            <div className="flex items-center gap-1 text-green-400 text-xs">
              <Check className="w-4 h-4" />
              Active
            </div>
          )}
        </div>

        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
          {plan.description || `${plan.durationDays} day meal plan`}
        </p>

        {/* Plan stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-lg font-semibold text-white">{plan.avgCalories || '-'}</p>
            <p className="text-xs text-gray-500">Avg Cal/Day</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-white">{plan.durationDays || 7}</p>
            <p className="text-xs text-gray-500">Days</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-white">{plan.mealsPerDay || 4}</p>
            <p className="text-xs text-gray-500">Meals/Day</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {plan.status !== 'active' && (
            <GlassButton
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onActivate(plan.id);
              }}
            >
              <Play className="w-3 h-3 mr-1" />
              Activate
            </GlassButton>
          )}
          <GlassButton
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: View shopping list
            }}
          >
            <ShoppingCart className="w-3 h-3 mr-1" />
            Shopping List
          </GlassButton>
        </div>
      </GlassSurface>
    </motion.div>
  );
}

/**
 * AI Plan Generator
 */
function PlanGenerator({ onGenerate, isGenerating, goals }) {
  const [formData, setFormData] = useState({
    durationDays: 7,
    mealsPerDay: 4,
    preferences: [],
    excludeIngredients: '',
    targetCalories: goals?.calories || 2000,
  });

  const PREFERENCES = [
    { value: 'high_protein', label: 'High Protein' },
    { value: 'low_carb', label: 'Low Carb' },
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'quick_meals', label: 'Quick Meals (<30 min)' },
    { value: 'meal_prep', label: 'Meal Prep Friendly' },
    { value: 'budget', label: 'Budget Friendly' },
  ];

  const togglePreference = (pref) => {
    setFormData((prev) => ({
      ...prev,
      preferences: prev.preferences.includes(pref)
        ? prev.preferences.filter((p) => p !== pref)
        : [...prev.preferences, pref],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate({
      ...formData,
      excludeIngredients: formData.excludeIngredients.split(',').map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Duration & Meals */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Duration (days)</label>
          <select
            value={formData.durationDays}
            onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value, 10) })}
            className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white
                       focus:outline-none focus:border-green-500/50"
          >
            <option value={3}>3 days</option>
            <option value={5}>5 days</option>
            <option value={7}>7 days (week)</option>
            <option value={14}>14 days (2 weeks)</option>
            <option value={28}>28 days (month)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">Meals per day</label>
          <select
            value={formData.mealsPerDay}
            onChange={(e) => setFormData({ ...formData, mealsPerDay: parseInt(e.target.value, 10) })}
            className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white
                       focus:outline-none focus:border-green-500/50"
          >
            <option value={3}>3 meals</option>
            <option value={4}>4 meals</option>
            <option value={5}>5 meals</option>
            <option value={6}>6 meals</option>
          </select>
        </div>
      </div>

      {/* Target Calories */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Target Calories/Day</label>
        <input
          type="number"
          value={formData.targetCalories}
          onChange={(e) => setFormData({ ...formData, targetCalories: parseInt(e.target.value, 10) })}
          className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white
                     focus:outline-none focus:border-green-500/50"
        />
        {goals && (
          <p className="text-xs text-gray-500 mt-1">
            Your daily goal is {goals.calories} calories
          </p>
        )}
      </div>

      {/* Preferences */}
      <div>
        <label className="block text-sm text-gray-400 mb-3">Preferences</label>
        <div className="flex flex-wrap gap-2">
          {PREFERENCES.map((pref) => (
            <button
              key={pref.value}
              type="button"
              onClick={() => togglePreference(pref.value)}
              className={`px-3 py-2 rounded-xl text-sm transition-colors ${
                formData.preferences.includes(pref.value)
                  ? 'bg-green-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {formData.preferences.includes(pref.value) && <Check className="w-3 h-3 inline mr-1" />}
              {pref.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exclude Ingredients */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Exclude Ingredients (comma separated)</label>
        <input
          type="text"
          placeholder="e.g., shellfish, peanuts, mushrooms"
          value={formData.excludeIngredients}
          onChange={(e) => setFormData({ ...formData, excludeIngredients: e.target.value })}
          className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white
                     placeholder-gray-500 focus:outline-none focus:border-green-500/50"
        />
      </div>

      <GlassButton
        type="submit"
        variant="primary"
        className="w-full"
        disabled={isGenerating}
      >
        <Wand2 className="w-4 h-4 mr-2" />
        {isGenerating ? 'Generating...' : 'Generate Meal Plan'}
      </GlassButton>
    </form>
  );
}

/**
 * Active Plan Summary
 */
function ActivePlanBanner({ plan }) {
  if (!plan) return null;

  const today = new Date();
  const startDate = new Date(plan.startDate);
  const dayNumber = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <GlassSurface className="p-6 mb-6 border border-green-500/30 bg-green-500/5">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center">
          <Play className="w-7 h-7 text-green-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
              Active
            </span>
          </div>
          <p className="text-sm text-gray-400">
            Day {dayNumber} of {plan.durationDays}
          </p>
        </div>
        <Link to={`/nutrition/plans/${plan.id}`}>
          <GlassButton variant="ghost" size="sm">
            View Plan
            <ChevronRight className="w-4 h-4 ml-1" />
          </GlassButton>
        </Link>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-green-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(dayNumber / plan.durationDays) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>{dayNumber} days completed</span>
          <span>{plan.durationDays - dayNumber} days remaining</span>
        </div>
      </div>
    </GlassSurface>
  );
}

/**
 * Main Meal Plans page
 */
export default function MealPlans() {
  const navigate = useNavigate();
  const goals = useNutritionGoals();
  const { getMealPlans, getActivePlan, activatePlan, generateMealPlan } = useMealPlans();

  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load plans
  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allPlans, active] = await Promise.all([
        getMealPlans(),
        getActivePlan(),
      ]);
      setPlans(allPlans);
      setActivePlan(active);
    } catch (err) {
      console.error('Failed to load meal plans:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getMealPlans, getActivePlan]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleActivate = async (id) => {
    try {
      await activatePlan(id);
      loadPlans();
    } catch (err) {
      console.error('Failed to activate plan:', err);
    }
  };

  const handleGenerate = async (input) => {
    setIsGenerating(true);
    try {
      const plan = await generateMealPlan(input);
      setShowGenerator(false);
      loadPlans();
      // Navigate to the new plan
      navigate(`/nutrition/plans/${plan.id}`);
    } catch (err) {
      console.error('Failed to generate plan:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <MeshBackground />
      <GlassNav />
      <GlassSidebar />

      <main className="lg:pl-64 pt-16 pb-24 lg:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link to="/nutrition">
                <GlassButton variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                </GlassButton>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Meal Plans</h1>
                <p className="text-gray-400">Plan your meals for the week</p>
              </div>
            </div>
            <GlassButton variant="primary" onClick={() => setShowGenerator(true)}>
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Plan
            </GlassButton>
          </div>

          {/* Active Plan Banner */}
          <ActivePlanBanner plan={activePlan} />

          {/* Plan Generator */}
          <AnimatePresence>
            {showGenerator && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <GlassSurface className="p-6 mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">AI Meal Plan Generator</h2>
                        <p className="text-sm text-gray-400">Create a personalized meal plan</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowGenerator(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <PlanGenerator
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                    goals={goals}
                  />
                </GlassSurface>
              </motion.div>
            )}
          </AnimatePresence>

          {/* All Plans */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Your Meal Plans</h2>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <GlassSurface key={i} className="h-48 animate-pulse" />
                ))}
              </div>
            ) : plans.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {plans.map((plan) => (
                    <MealPlanCard
                      key={plan.id}
                      plan={plan}
                      onActivate={handleActivate}
                      isActive={activePlan?.id === plan.id}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <GlassSurface className="p-12 text-center">
                <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No meal plans yet</p>
                <GlassButton variant="primary" onClick={() => setShowGenerator(true)}>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Your First Plan
                </GlassButton>
              </GlassSurface>
            )}
          </div>
        </div>
      </main>

      <GlassMobileNav />
    </div>
  );
}
