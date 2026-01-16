/**
 * Nutrition Store
 *
 * Zustand store for nutrition state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * @typedef {Object} NutritionPreferences
 * @property {boolean} enabled
 * @property {'calories' | 'macros' | 'detailed'} trackingMode
 * @property {boolean} showOnDashboard
 * @property {boolean} showInCommunity
 * @property {'lose' | 'maintain' | 'gain' | 'custom'} goalType
 * @property {boolean} syncWithArchetype
 * @property {boolean} syncWithWorkouts
 */

/**
 * @typedef {Object} NutritionGoals
 * @property {number} calories
 * @property {number} proteinG
 * @property {number} carbsG
 * @property {number} fatG
 * @property {number} fiberG
 * @property {number} workoutDayCalories
 * @property {number} workoutDayProteinG
 */

/**
 * @typedef {Object} DailySummary
 * @property {number} totalCalories
 * @property {number} totalProteinG
 * @property {number} totalCarbsG
 * @property {number} totalFatG
 * @property {number} goalCalories
 * @property {number} goalProteinG
 * @property {number} goalCarbsG
 * @property {number} goalFatG
 * @property {number} mealCount
 * @property {boolean} wasWorkoutDay
 * @property {number} waterMl
 */

/**
 * @typedef {Object} MealLog
 * @property {string} id
 * @property {string} mealType
 * @property {string} foodName
 * @property {number} calories
 * @property {number} proteinG
 * @property {number} carbsG
 * @property {number} fatG
 * @property {number} servings
 * @property {Date} loggedAt
 */

const initialState = {
  // Enable state
  enabled: false,
  preferences: null,
  goals: null,

  // Daily tracking
  todaysMeals: [],
  todaysSummary: null,
  selectedDate: new Date().toISOString().split('T')[0],

  // Streaks
  streaks: null,

  // Archetype profile
  archetypeProfile: null,

  // UI state
  isLoading: false,
  error: null,

  // Quick log state
  quickLogOpen: false,
  quickLogMealType: 'lunch',

  // Food search
  searchQuery: '',
  searchResults: [],
  recentFoods: [],
  frequentFoods: [],
};

export const useNutritionStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // ============================================
      // Actions - Enable/Disable
      // ============================================

      setEnabled: (enabled) => set({ enabled }),

      setPreferences: (preferences) => set({
        preferences,
        enabled: preferences?.enabled ?? false,
      }),

      // ============================================
      // Actions - Goals
      // ============================================

      setGoals: (goals) => set({ goals }),

      // ============================================
      // Actions - Daily Data
      // ============================================

      setTodaysSummary: (summary) => set({ todaysSummary: summary }),

      setTodaysMeals: (meals) => set({ todaysMeals: meals }),

      addMealToToday: (meal) => set((state) => ({
        todaysMeals: [...state.todaysMeals, meal],
        todaysSummary: state.todaysSummary ? {
          ...state.todaysSummary,
          totalCalories: state.todaysSummary.totalCalories + meal.totalCalories,
          totalProteinG: state.todaysSummary.totalProteinG + meal.totalProteinG,
          totalCarbsG: state.todaysSummary.totalCarbsG + meal.totalCarbsG,
          totalFatG: state.todaysSummary.totalFatG + meal.totalFatG,
          mealCount: state.todaysSummary.mealCount + 1,
        } : null,
      })),

      removeMealFromToday: (mealId) => set((state) => {
        const meal = state.todaysMeals.find(m => m.id === mealId);
        if (!meal) return state;

        return {
          todaysMeals: state.todaysMeals.filter(m => m.id !== mealId),
          todaysSummary: state.todaysSummary ? {
            ...state.todaysSummary,
            totalCalories: state.todaysSummary.totalCalories - meal.totalCalories,
            totalProteinG: state.todaysSummary.totalProteinG - meal.totalProteinG,
            totalCarbsG: state.todaysSummary.totalCarbsG - meal.totalCarbsG,
            totalFatG: state.todaysSummary.totalFatG - meal.totalFatG,
            mealCount: state.todaysSummary.mealCount - 1,
          } : null,
        };
      }),

      updateMealInToday: (mealId, updates) => set((state) => ({
        todaysMeals: state.todaysMeals.map(m =>
          m.id === mealId ? { ...m, ...updates } : m
        ),
      })),

      setSelectedDate: (date) => set({ selectedDate: date }),

      // ============================================
      // Actions - Streaks
      // ============================================

      setStreaks: (streaks) => set({ streaks }),

      // ============================================
      // Actions - Archetype Profile
      // ============================================

      setArchetypeProfile: (profile) => set({ archetypeProfile: profile }),

      // ============================================
      // Actions - UI State
      // ============================================

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // ============================================
      // Actions - Quick Log
      // ============================================

      openQuickLog: (mealType = 'lunch') => set({
        quickLogOpen: true,
        quickLogMealType: mealType,
      }),

      closeQuickLog: () => set({ quickLogOpen: false }),

      // ============================================
      // Actions - Food Search
      // ============================================

      setSearchQuery: (query) => set({ searchQuery: query }),

      setSearchResults: (results) => set({ searchResults: results }),

      setRecentFoods: (foods) => set({ recentFoods: foods }),

      setFrequentFoods: (foods) => set({ frequentFoods: foods }),

      // ============================================
      // Actions - Full Dashboard Load
      // ============================================

      loadDashboard: (dashboard) => set({
        enabled: dashboard.enabled,
        preferences: dashboard.preferences,
        goals: dashboard.goals,
        todaysSummary: dashboard.todaySummary,
        todaysMeals: dashboard.todaySummary?.meals || [],
        streaks: dashboard.streaks,
        archetypeProfile: dashboard.archetypeProfile,
        recentFoods: dashboard.recentMeals || [],
      }),

      // ============================================
      // Actions - Reset
      // ============================================

      reset: () => set(initialState),

      // ============================================
      // Computed - Remaining Macros
      // ============================================

      getRemainingCalories: () => {
        const { todaysSummary, goals } = get();
        if (!goals) return 0;
        return (goals.calories || 0) - (todaysSummary?.totalCalories || 0);
      },

      getRemainingProtein: () => {
        const { todaysSummary, goals } = get();
        if (!goals) return 0;
        return (goals.proteinG || 0) - (todaysSummary?.totalProteinG || 0);
      },

      getRemainingCarbs: () => {
        const { todaysSummary, goals } = get();
        if (!goals) return 0;
        return (goals.carbsG || 0) - (todaysSummary?.totalCarbsG || 0);
      },

      getRemainingFat: () => {
        const { todaysSummary, goals } = get();
        if (!goals) return 0;
        return (goals.fatG || 0) - (todaysSummary?.totalFatG || 0);
      },

      getCalorieProgress: () => {
        const { todaysSummary, goals } = get();
        if (!goals?.calories) return 0;
        return Math.min(100, ((todaysSummary?.totalCalories || 0) / goals.calories) * 100);
      },

      getProteinProgress: () => {
        const { todaysSummary, goals } = get();
        if (!goals?.proteinG) return 0;
        return Math.min(100, ((todaysSummary?.totalProteinG || 0) / goals.proteinG) * 100);
      },

      getCarbsProgress: () => {
        const { todaysSummary, goals } = get();
        if (!goals?.carbsG) return 0;
        return Math.min(100, ((todaysSummary?.totalCarbsG || 0) / goals.carbsG) * 100);
      },

      getFatProgress: () => {
        const { todaysSummary, goals } = get();
        if (!goals?.fatG) return 0;
        return Math.min(100, ((todaysSummary?.totalFatG || 0) / goals.fatG) * 100);
      },
    }),
    {
      name: 'nutrition-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        enabled: state.enabled,
        selectedDate: state.selectedDate,
        recentFoods: state.recentFoods.slice(0, 10), // Keep last 10
      }),
    }
  )
);

// ============================================
// Selector Hooks (for performance)
// ============================================

export const useNutritionEnabled = () => useNutritionStore((s) => s.enabled);
export const useNutritionPreferences = () => useNutritionStore((s) => s.preferences);
export const useNutritionGoals = () => useNutritionStore((s) => s.goals);
export const useTodaysSummary = () => useNutritionStore((s) => s.todaysSummary);
export const useTodaysMeals = () => useNutritionStore((s) => s.todaysMeals);
export const useNutritionStreaks = () => useNutritionStore((s) => s.streaks);
export const useArchetypeProfile = () => useNutritionStore((s) => s.archetypeProfile);
export const useNutritionLoading = () => useNutritionStore((s) => s.isLoading);
export const useNutritionError = () => useNutritionStore((s) => s.error);
export const useQuickLogOpen = () => useNutritionStore((s) => s.quickLogOpen);
export const useQuickLogMealType = () => useNutritionStore((s) => s.quickLogMealType);
export const useSearchResults = () => useNutritionStore((s) => s.searchResults);
export const useRecentFoods = () => useNutritionStore((s) => s.recentFoods);
export const useFrequentFoods = () => useNutritionStore((s) => s.frequentFoods);

// Computed selectors
export const useRemainingMacros = () => useNutritionStore((s) => ({
  calories: s.getRemainingCalories(),
  protein: s.getRemainingProtein(),
  carbs: s.getRemainingCarbs(),
  fat: s.getRemainingFat(),
}));

export const useMacroProgress = () => useNutritionStore((s) => ({
  calories: s.getCalorieProgress(),
  protein: s.getProteinProgress(),
  carbs: s.getCarbsProgress(),
  fat: s.getFatProgress(),
}));

export default useNutritionStore;
