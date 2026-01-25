/**
 * Nutrition Hooks
 *
 * React hooks for nutrition API operations.
 * Uses GraphQL for dashboard, REST for other operations (to be migrated).
 */

import { useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNutritionStore } from '../store/nutritionStore';
import { useAuthStore } from '../store/authStore';
import { NUTRITION_DASHBOARD_QUERY } from '../graphql/queries';

const API_BASE = '/api';

/**
 * Helper to make authenticated API calls (for non-GraphQL operations)
 */
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error?.message || error.message || 'Request failed');
  }

  return response.json();
}

/**
 * Hook for loading nutrition dashboard (uses GraphQL)
 */
export function useNutritionDashboard() {
  const {
    loadDashboard,
    setLoading,
    setError,
    isLoading,
    error,
    enabled,
    preferences,
    goals,
    todaysSummary,
    streaks,
    archetypeProfile,
  } = useNutritionStore();

  const { refetch } = useQuery(NUTRITION_DASHBOARD_QUERY, {
    skip: true, // Don't auto-fetch, we'll call load() manually
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      if (data?.nutritionDashboard) {
        loadDashboard(data.nutritionDashboard);
      }
    },
    onError: (err) => {
      // Silently fail - nutrition is optional
      setError(err.message);
    },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await refetch();
      if (result.data?.nutritionDashboard) {
        loadDashboard(result.data.nutritionDashboard);
      }
    } catch (err: unknown) {
      // Silently fail - nutrition is optional
      const errorMessage = err instanceof Error ? err.message : 'Failed to load nutrition';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loadDashboard, setLoading, setError, refetch]);

  return {
    load,
    isLoading,
    error,
    enabled,
    preferences,
    goals,
    todaysSummary,
    streaks,
    archetypeProfile,
  };
}

/**
 * Hook for nutrition preferences
 */
export function useNutritionPreferencesAPI() {
  const { setPreferences, setLoading, setError } = useNutritionStore();

  const enable = useCallback(async () => {
    setLoading(true);
    try {
      const prefs = await fetchAPI('/me/nutrition/enable', { method: 'POST', body: JSON.stringify({}) });
      setPreferences(prefs);
      return prefs;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setPreferences, setLoading, setError]);

  const disable = useCallback(async (deleteData = false) => {
    setLoading(true);
    try {
      await fetchAPI('/me/nutrition/disable', {
        method: 'POST',
        body: JSON.stringify({ deleteData }),
      });
      setPreferences({ enabled: false });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setPreferences, setLoading, setError]);

  const updatePreferences = useCallback(async (updates) => {
    setLoading(true);
    try {
      const prefs = await fetchAPI('/me/nutrition/preferences', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      setPreferences(prefs);
      return prefs;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setPreferences, setLoading, setError]);

  return { enable, disable, updatePreferences };
}

/**
 * Hook for nutrition goals
 */
export function useNutritionGoalsAPI() {
  const { setGoals, setLoading, setError } = useNutritionStore();

  const calculateGoals = useCallback(async (input) => {
    setLoading(true);
    try {
      const goals = await fetchAPI('/me/nutrition/goals/calculate', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      setGoals(goals);
      return goals;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setGoals, setLoading, setError]);

  const loadGoals = useCallback(async () => {
    try {
      const goals = await fetchAPI('/me/nutrition/goals');
      if (goals && !goals.message) {
        setGoals(goals);
      }
      return goals;
    } catch (err) {
      console.error('Failed to load goals:', err);
    }
  }, [setGoals]);

  return { calculateGoals, loadGoals };
}

/**
 * Hook for food search
 */
export function useFoodSearch() {
  const { setSearchResults, setLoading, searchQuery, setSearchQuery } = useNutritionStore();

  const search = useCallback(async (query, options = {}) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return [];
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        query,
        limit: options.limit || 25,
        ...(options.source && { source: options.source }),
      });

      const result = await fetchAPI(`/nutrition/foods/search?${params}`);
      setSearchResults(result.foods || []);
      return result.foods || [];
    } catch (err) {
      console.error('Food search failed:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [setSearchResults, setLoading]);

  const searchByBarcode = useCallback(async (barcode) => {
    setLoading(true);
    try {
      const result = await fetchAPI(`/nutrition/foods/barcode/${barcode}`);
      return result.foods || [];
    } catch (err) {
      console.error('Barcode search failed:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  return { search, searchByBarcode, searchQuery, setSearchQuery };
}

/**
 * Hook for meal logging
 */
export function useMealLog() {
  const { addMealToToday, removeMealFromToday, updateMealInToday, setLoading, setError } = useNutritionStore();

  const logMeal = useCallback(async (input) => {
    setLoading(true);
    try {
      const meal = await fetchAPI('/me/nutrition/meals', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      addMealToToday(meal);
      return meal;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addMealToToday, setLoading, setError]);

  const updateMeal = useCallback(async (id, updates) => {
    setLoading(true);
    try {
      const meal = await fetchAPI(`/me/nutrition/meals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      updateMealInToday(id, meal);
      return meal;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [updateMealInToday, setLoading, setError]);

  const deleteMeal = useCallback(async (id) => {
    setLoading(true);
    try {
      await fetchAPI(`/me/nutrition/meals/${id}`, { method: 'DELETE' });
      removeMealFromToday(id);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [removeMealFromToday, setLoading, setError]);

  const loadMealsByDate = useCallback(async (date) => {
    try {
      const meals = await fetchAPI(`/me/nutrition/meals?date=${date}`);
      return meals;
    } catch (err) {
      console.error('Failed to load meals:', err);
      return [];
    }
  }, []);

  return { logMeal, updateMeal, deleteMeal, loadMealsByDate };
}

/**
 * Hook for hydration tracking
 */
export function useHydration() {
  const { setLoading, setError } = useNutritionStore();

  const logWater = useCallback(async (amountMl, beverageType = 'water') => {
    setLoading(true);
    try {
      const log = await fetchAPI('/me/nutrition/hydration', {
        method: 'POST',
        body: JSON.stringify({ amountMl, beverageType }),
      });
      return log;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const getHydrationByDate = useCallback(async (date) => {
    try {
      return await fetchAPI(`/me/nutrition/hydration?date=${date}`);
    } catch (err) {
      console.error('Failed to load hydration:', err);
      return { logs: [], totalMl: 0 };
    }
  }, []);

  return { logWater, getHydrationByDate };
}

/**
 * Hook for recipes
 */
export function useRecipes() {
  const { setLoading, setError } = useNutritionStore();

  const searchRecipes = useCallback(async (filter = {}, sort = {}) => {
    try {
      const params = new URLSearchParams({
        ...filter,
        sort: sort.field || 'rating',
        sortDir: sort.direction || 'desc',
      });
      return await fetchAPI(`/nutrition/recipes?${params}`);
    } catch (err) {
      console.error('Recipe search failed:', err);
      return { items: [], total: 0, hasMore: false };
    }
  }, []);

  const getPopularRecipes = useCallback(async (limit = 10) => {
    try {
      return await fetchAPI(`/nutrition/recipes/popular?limit=${limit}`);
    } catch (err) {
      console.error('Failed to load popular recipes:', err);
      return [];
    }
  }, []);

  const getRecipe = useCallback(async (id) => {
    try {
      return await fetchAPI(`/nutrition/recipes/${id}`);
    } catch (err) {
      console.error('Failed to load recipe:', err);
      return null;
    }
  }, []);

  const createRecipe = useCallback(async (input) => {
    setLoading(true);
    try {
      return await fetchAPI('/me/nutrition/recipes', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const saveRecipe = useCallback(async (id) => {
    try {
      await fetchAPI(`/me/nutrition/recipes/${id}/save`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to save recipe:', err);
    }
  }, []);

  const unsaveRecipe = useCallback(async (id) => {
    try {
      await fetchAPI(`/me/nutrition/recipes/${id}/save`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to unsave recipe:', err);
    }
  }, []);

  const rateRecipe = useCallback(async (id, rating, review) => {
    try {
      await fetchAPI(`/me/nutrition/recipes/${id}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating, review }),
      });
    } catch (err) {
      console.error('Failed to rate recipe:', err);
    }
  }, []);

  return {
    searchRecipes,
    getPopularRecipes,
    getRecipe,
    createRecipe,
    saveRecipe,
    unsaveRecipe,
    rateRecipe,
  };
}

/**
 * Hook for meal plans
 */
export function useMealPlans() {
  const { setLoading, setError } = useNutritionStore();

  const getMealPlans = useCallback(async (status) => {
    try {
      const params = status ? `?status=${status}` : '';
      return await fetchAPI(`/me/nutrition/plans${params}`);
    } catch (err) {
      console.error('Failed to load meal plans:', err);
      return [];
    }
  }, []);

  const getActivePlan = useCallback(async () => {
    try {
      const result = await fetchAPI('/me/nutrition/plans/active');
      return result.message ? null : result;
    } catch (err) {
      console.error('Failed to load active plan:', err);
      return null;
    }
  }, []);

  const createMealPlan = useCallback(async (input) => {
    setLoading(true);
    try {
      return await fetchAPI('/me/nutrition/plans', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const generateMealPlan = useCallback(async (input) => {
    setLoading(true);
    try {
      return await fetchAPI('/me/nutrition/plans/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const activatePlan = useCallback(async (id) => {
    try {
      return await fetchAPI(`/me/nutrition/plans/${id}/activate`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to activate plan:', err);
      throw err;
    }
  }, []);

  return {
    getMealPlans,
    getActivePlan,
    createMealPlan,
    generateMealPlan,
    activatePlan,
  };
}

/**
 * Hook for shopping list management
 */
export function useShoppingList() {
  const { setLoading, setError, isLoading, error } = useNutritionStore();

  const getShoppingList = useCallback(async (planId) => {
    setLoading(true);
    try {
      // First get the meal plan to get the shopping list
      const plan = await fetchAPI(`/me/nutrition/plans/${planId}`);
      return {
        shoppingList: plan.shoppingList || [],
        planName: plan.name,
        planId: plan.id,
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const generateShoppingList = useCallback(async (planId) => {
    setLoading(true);
    try {
      const list = await fetchAPI(`/me/nutrition/plans/${planId}/shopping-list`, {
        method: 'POST',
      });
      return list;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  return {
    getShoppingList,
    generateShoppingList,
    isLoading,
    error,
  };
}

/**
 * Hook for archetype nutrition profiles
 */
export function useArchetypeNutrition() {
  const { setArchetypeProfile } = useNutritionStore();

  const loadProfile = useCallback(async (archetype) => {
    try {
      const profile = await fetchAPI(`/nutrition/archetypes/${archetype}`);
      setArchetypeProfile(profile);
      return profile;
    } catch (err) {
      console.error('Failed to load archetype profile:', err);
      return null;
    }
  }, [setArchetypeProfile]);

  const getAllProfiles = useCallback(async () => {
    try {
      return await fetchAPI('/nutrition/archetypes');
    } catch (err) {
      console.error('Failed to load archetype profiles:', err);
      return [];
    }
  }, []);

  return { loadProfile, getAllProfiles };
}

/**
 * Auto-load nutrition data on mount (if enabled)
 */
export function useNutritionAutoLoad() {
  const { load } = useNutritionDashboard();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) {
      load();
    }
  }, [token, load]);
}

export default {
  useNutritionDashboard,
  useNutritionPreferencesAPI,
  useNutritionGoalsAPI,
  useFoodSearch,
  useMealLog,
  useHydration,
  useRecipes,
  useMealPlans,
  useShoppingList,
  useArchetypeNutrition,
  useNutritionAutoLoad,
};
