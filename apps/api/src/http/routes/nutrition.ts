/**
 * Nutrition Routes
 *
 * REST API endpoints for nutrition tracking
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from './auth';
import {
  nutritionService,
  foodSearchService,
  mealLogService,
  macroCalculatorService,
  recipeService,
  mealPlanService,
} from '../../modules/nutrition';
import type {
  UpdateNutritionPreferencesInput,
  CreateMealLogInput,
  UpdateMealLogInput,
  FoodSearchOptions,
  CreateCustomFoodInput,
  CalculateGoalsInput,
  CreateRecipeInput,
  UpdateRecipeInput,
  RecipeFilter,
  CreateMealPlanInput,
  GenerateMealPlanInput,
  CreateHydrationLogInput,
} from '../../modules/nutrition/types';
import { loggers } from '../../lib/logger';

const log = loggers.http;

export async function nutritionRoutes(fastify: FastifyInstance): Promise<void> {
  log.info({ module: 'nutrition-routes' }, 'Registering nutrition routes');
  // ============================================
  // Preferences & Dashboard
  // ============================================

  // Get nutrition dashboard
  fastify.get('/me/nutrition', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const dashboard = await nutritionService.getDashboard(userId);
    return dashboard;
  });

  // Get nutrition preferences
  fastify.get('/me/nutrition/preferences', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const prefs = await nutritionService.getOrCreatePreferences(userId);
    return prefs;
  });

  // Update nutrition preferences
  fastify.patch('/me/nutrition/preferences', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: UpdateNutritionPreferencesInput }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const prefs = await nutritionService.updatePreferences(userId, request.body);
    return prefs;
  });

  // Enable nutrition
  fastify.post('/me/nutrition/enable', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const prefs = await nutritionService.enableNutrition(userId);
    return prefs;
  });

  // Disable nutrition
  fastify.post('/me/nutrition/disable', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: { deleteData?: boolean } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const deleteData = request.body?.deleteData || false;
    await nutritionService.disableNutrition(userId, deleteData);
    return { success: true };
  });

  // ============================================
  // Goals
  // ============================================

  // Get nutrition goals
  fastify.get('/me/nutrition/goals', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const goals = await macroCalculatorService.getGoals(userId);
    return goals || { message: 'No goals set' };
  });

  // Calculate and save nutrition goals
  fastify.post('/me/nutrition/goals/calculate', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: CalculateGoalsInput }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const goals = await macroCalculatorService.calculateAndSaveGoals(userId, request.body);
    return goals;
  });

  // ============================================
  // Food Search
  // ============================================

  // Search foods
  fastify.get('/nutrition/foods/search', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: FoodSearchOptions }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const results = await foodSearchService.search(request.query, userId);
    return results;
  });

  // Get food by ID
  fastify.get('/nutrition/foods/:id', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
    const food = await foodSearchService.getFoodById(request.params.id);
    if (!food) {
      return _reply.status(404).send({ error: 'Food not found' });
    }
    return food;
  });

  // Search by barcode
  fastify.get('/nutrition/foods/barcode/:barcode', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { barcode: string } }>, _reply: FastifyReply) => {
    const results = await foodSearchService.searchByBarcode(request.params.barcode);
    return results;
  });

  // Get frequent foods
  fastify.get('/me/nutrition/foods/frequent', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: { limit?: number } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const limit = request.query.limit || 20;
    const foods = await foodSearchService.getFrequentFoods(userId, limit);
    return foods;
  });

  // Get recent foods (from meal logs)
  fastify.get('/me/nutrition/foods/recent', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: { limit?: number } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const limit = request.query.limit || 20;
    const meals = await mealLogService.getRecentMeals(userId, limit);
    return meals;
  });

  // ============================================
  // Custom Foods
  // ============================================

  // Create custom food
  fastify.post('/me/nutrition/foods/custom', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: CreateCustomFoodInput }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const food = await foodSearchService.createCustomFood(userId, request.body);
    return food;
  });

  // Get user's custom foods
  fastify.get('/me/nutrition/foods/custom', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: { limit?: number } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const limit = request.query.limit || 50;
    const foods = await foodSearchService.getUserCustomFoods(userId, limit);
    return foods;
  });

  // Delete custom food
  fastify.delete('/me/nutrition/foods/custom/:id', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    await foodSearchService.deleteCustomFood(request.params.id, userId);
    return { success: true };
  });

  // ============================================
  // Meal Logging
  // ============================================

  // Log a meal
  fastify.post('/me/nutrition/meals', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: CreateMealLogInput }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const meal = await mealLogService.createMealLog(userId, request.body);
    return meal;
  });

  // Get meals by date
  fastify.get('/me/nutrition/meals', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: { date?: string; from?: string; to?: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const { date, from, to } = request.query;

    if (date) {
      const meals = await mealLogService.getMealsByDate(userId, date);
      return meals;
    } else if (from && to) {
      const meals = await mealLogService.getMealsByDateRange(userId, from, to);
      return meals;
    } else {
      // Default to today
      const today = new Date().toISOString().split('T')[0];
      const meals = await mealLogService.getMealsByDate(userId, today);
      return meals;
    }
  });

  // Get single meal
  fastify.get('/me/nutrition/meals/:id', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const meal = await mealLogService.getMealLog(request.params.id, userId);
    if (!meal) {
      return _reply.status(404).send({ error: 'Meal not found' });
    }
    return meal;
  });

  // Update meal
  fastify.put('/me/nutrition/meals/:id', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateMealLogInput }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const meal = await mealLogService.updateMealLog(request.params.id, userId, request.body);
    if (!meal) {
      return _reply.status(404).send({ error: 'Meal not found' });
    }
    return meal;
  });

  // Delete meal
  fastify.delete('/me/nutrition/meals/:id', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    await mealLogService.deleteMealLog(request.params.id, userId);
    return { success: true };
  });

  // Copy meals from another date
  fastify.post('/me/nutrition/meals/copy', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: { sourceDate: string; targetDate: string; mealTypes?: string[] } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const { sourceDate, targetDate, mealTypes } = request.body;
    const meals = await mealLogService.copyMealsFromDate(userId, sourceDate, targetDate, mealTypes as any);
    return meals;
  });

  // ============================================
  // Daily Summary
  // ============================================

  // Get daily summary
  fastify.get('/me/nutrition/summary', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: { date?: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const date = request.query.date || new Date().toISOString().split('T')[0];
    const summary = await mealLogService.getDailySummary(userId, date);
    return summary || { message: 'No data for this date' };
  });

  // Get summary range
  fastify.get('/me/nutrition/summary/range', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: { from: string; to: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const { from, to } = request.query;
    const summaries = await mealLogService.getDailySummaries(userId, from, to);
    return summaries;
  });

  // ============================================
  // Hydration
  // ============================================

  // Log water/hydration
  fastify.post('/me/nutrition/hydration', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: CreateHydrationLogInput }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const log = await mealLogService.logHydration(userId, request.body);
    return log;
  });

  // Get hydration by date
  fastify.get('/me/nutrition/hydration', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: { date?: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const date = request.query.date || new Date().toISOString().split('T')[0];
    const logs = await mealLogService.getHydrationByDate(userId, date);
    const total = await mealLogService.getDailyWaterTotal(userId, date);
    return { logs, totalMl: total };
  });

  // ============================================
  // Recipes
  // ============================================

  // Search public recipes
  fastify.get('/nutrition/recipes', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{
    Querystring: RecipeFilter & { sort?: string; sortDir?: string; limit?: number; cursor?: string }
  }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const { sort, sortDir, limit, cursor, ...filter } = request.query;
    const results = await recipeService.searchRecipes(
      filter,
      { field: (sort as any) || 'created_at', direction: (sortDir as any) || 'desc' },
      limit || 20,
      cursor,
      userId
    );
    return results;
  });

  // Get popular recipes
  fastify.get('/nutrition/recipes/popular', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: { limit?: number } }>, _reply: FastifyReply) => {
    const limit = request.query.limit || 10;
    const recipes = await recipeService.getPopularRecipes(limit);
    return recipes;
  });

  // Get trending recipes
  fastify.get('/nutrition/recipes/trending', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: { limit?: number } }>, _reply: FastifyReply) => {
    const limit = request.query.limit || 10;
    const recipes = await recipeService.getTrendingRecipes(limit);
    return recipes;
  });

  // Get recipes by archetype
  fastify.get('/nutrition/recipes/archetype/:archetype', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { archetype: string }; Querystring: { limit?: number } }>, _reply: FastifyReply) => {
    const limit = request.query.limit || 10;
    const recipes = await recipeService.getRecipesByArchetype(request.params.archetype, limit);
    return recipes;
  });

  // Get single recipe
  fastify.get('/nutrition/recipes/:id', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const recipe = await recipeService.getRecipe(request.params.id, userId);
    if (!recipe) {
      return _reply.status(404).send({ error: 'Recipe not found' });
    }
    return recipe;
  });

  // Create recipe
  fastify.post('/me/nutrition/recipes', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: CreateRecipeInput }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const recipe = await recipeService.createRecipe(userId, request.body);
    return recipe;
  });

  // Get user's recipes
  fastify.get('/me/nutrition/recipes', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: { limit?: number } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const limit = request.query.limit || 50;
    const recipes = await recipeService.getUserRecipes(userId, limit);
    return recipes;
  });

  // Get saved recipes
  fastify.get('/me/nutrition/recipes/saved', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: { limit?: number } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const limit = request.query.limit || 50;
    const recipes = await recipeService.getSavedRecipes(userId, limit);
    return recipes;
  });

  // Update recipe
  fastify.put('/me/nutrition/recipes/:id', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateRecipeInput }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const recipe = await recipeService.updateRecipe(request.params.id, userId, request.body);
    if (!recipe) {
      return _reply.status(404).send({ error: 'Recipe not found or not authorized' });
    }
    return recipe;
  });

  // Delete recipe
  fastify.delete('/me/nutrition/recipes/:id', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    await recipeService.deleteRecipe(request.params.id, userId);
    return { success: true };
  });

  // Save recipe
  fastify.post('/me/nutrition/recipes/:id/save', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    await recipeService.saveRecipe(request.params.id, userId);
    return { success: true };
  });

  // Unsave recipe
  fastify.delete('/me/nutrition/recipes/:id/save', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    await recipeService.unsaveRecipe(request.params.id, userId);
    return { success: true };
  });

  // Rate recipe
  fastify.post('/me/nutrition/recipes/:id/rate', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { rating: number; review?: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const { rating, review } = request.body;
    await recipeService.rateRecipe(request.params.id, userId, rating, review);
    return { success: true };
  });

  // Get recipe ratings
  fastify.get('/nutrition/recipes/:id/ratings', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string }; Querystring: { limit?: number } }>, _reply: FastifyReply) => {
    const limit = request.query.limit || 20;
    const ratings = await recipeService.getRecipeRatings(request.params.id, limit);
    return ratings;
  });

  // ============================================
  // Meal Plans
  // ============================================

  // Get user's meal plans
  fastify.get('/me/nutrition/plans', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: { status?: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const plans = await mealPlanService.getUserMealPlans(userId, request.query.status);
    return plans;
  });

  // Get active meal plan
  fastify.get('/me/nutrition/plans/active', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const plan = await mealPlanService.getActiveMealPlan(userId);
    return plan || { message: 'No active meal plan' };
  });

  // Create meal plan
  fastify.post('/me/nutrition/plans', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: CreateMealPlanInput }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const plan = await mealPlanService.createMealPlan(userId, request.body);
    return plan;
  });

  // Generate meal plan with AI
  fastify.post('/me/nutrition/plans/generate', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: GenerateMealPlanInput }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const plan = await mealPlanService.generateMealPlan(userId, request.body);
    return plan;
  });

  // Get single meal plan
  fastify.get('/me/nutrition/plans/:id', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const plan = await mealPlanService.getMealPlan(request.params.id, userId);
    if (!plan) {
      return _reply.status(404).send({ error: 'Meal plan not found' });
    }
    return plan;
  });

  // Update meal plan
  fastify.put('/me/nutrition/plans/:id', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: Partial<CreateMealPlanInput & { status: string }> }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const plan = await mealPlanService.updateMealPlan(request.params.id, userId, request.body);
    if (!plan) {
      return _reply.status(404).send({ error: 'Meal plan not found' });
    }
    return plan;
  });

  // Delete meal plan
  fastify.delete('/me/nutrition/plans/:id', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    await mealPlanService.deleteMealPlan(request.params.id, userId);
    return { success: true };
  });

  // Activate meal plan
  fastify.post('/me/nutrition/plans/:id/activate', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const plan = await mealPlanService.activateMealPlan(request.params.id, userId);
    if (!plan) {
      return _reply.status(404).send({ error: 'Meal plan not found' });
    }
    return plan;
  });

  // Add item to meal plan
  fastify.post('/me/nutrition/plans/:id/items', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { planDate: string; mealType: string; recipeId?: string; foodId?: string; customDescription?: string; servings?: number }
  }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const item = await mealPlanService.addMealPlanItem(request.params.id, userId, request.body as any);
    return item;
  });

  // Get meal plan items for a date
  fastify.get('/me/nutrition/plans/:id/items', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string }; Querystring: { date?: string } }>, _reply: FastifyReply) => {
    const { date } = request.query;
    if (date) {
      const items = await mealPlanService.getMealPlanItemsForDate(request.params.id, date);
      return items;
    } else {
      const items = await mealPlanService.getMealPlanItems(request.params.id);
      return items;
    }
  });

  // Update meal plan item
  fastify.put('/me/nutrition/plans/items/:itemId', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{
    Params: { itemId: string };
    Body: { servings?: number; completed?: boolean; completedMealLogId?: string }
  }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const item = await mealPlanService.updateMealPlanItem(request.params.itemId, userId, request.body);
    if (!item) {
      return _reply.status(404).send({ error: 'Item not found' });
    }
    return item;
  });

  // Delete meal plan item
  fastify.delete('/me/nutrition/plans/items/:itemId', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { itemId: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    await mealPlanService.deleteMealPlanItem(request.params.itemId, userId);
    return { success: true };
  });

  // Generate shopping list
  fastify.post('/me/nutrition/plans/:id/shopping-list', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const list = await mealPlanService.generateShoppingList(request.params.id, userId);
    return list;
  });

  // ============================================
  // Archetype Profiles
  // ============================================

  // Get all archetype nutrition profiles
  fastify.get('/nutrition/archetypes', {
    preHandler: authenticate,
  }, async (_request: FastifyRequest, _reply: FastifyReply) => {
    const profiles = await nutritionService.getAllArchetypeProfiles();
    return profiles;
  });

  // Get specific archetype profile
  fastify.get('/nutrition/archetypes/:archetype', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { archetype: string } }>, _reply: FastifyReply) => {
    const profile = await nutritionService.getArchetypeProfile(request.params.archetype);
    if (!profile) {
      return _reply.status(404).send({ error: 'Archetype profile not found' });
    }
    return profile;
  });

  // ============================================
  // Streaks
  // ============================================

  // Get nutrition streaks
  fastify.get('/me/nutrition/streaks', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, _reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const streaks = await nutritionService.getStreaks(userId);
    return streaks || { message: 'No streak data' };
  });
}

export default nutritionRoutes;
