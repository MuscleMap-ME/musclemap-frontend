/**
 * Meal Log Service
 *
 * Handles meal logging, daily summaries, and hydration tracking
 */

import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import { foodSearchService } from './food-search.service';
import { nutritionService } from './nutrition.service';
import type {
  MealLog,
  CreateMealLogInput,
  UpdateMealLogInput,
  DailyNutritionSummary,
  HydrationLog,
  CreateHydrationLogInput,
  MealType,
} from './types';

const log = loggers.api;

export class MealLogService {
  // ============================================
  // Meal Logging
  // ============================================

  async createMealLog(userId: string, input: CreateMealLogInput): Promise<MealLog> {
    const mealDate = input.mealDate || new Date().toISOString().split('T')[0];

    // Calculate nutrition totals
    let totalCalories = 0;
    let totalProteinG = 0;
    let totalCarbsG = 0;
    let totalFatG = 0;
    let totalFiberG = 0;

    const servings = input.servings || 1;

    if (input.foodId) {
      const food = await foodSearchService.getFoodById(input.foodId);
      if (food) {
        totalCalories = Math.round(food.calories * servings);
        totalProteinG = food.proteinG * servings;
        totalCarbsG = food.carbsG * servings;
        totalFatG = food.fatG * servings;
        totalFiberG = food.fiberG * servings;

        // Update usage stats
        await foodSearchService.updateFoodUsage(userId, input.foodId);
      }
    } else if (input.customFoodId) {
      const customFood = await foodSearchService.getCustomFood(input.customFoodId, userId);
      if (customFood) {
        totalCalories = Math.round(customFood.calories * servings);
        totalProteinG = customFood.proteinG * servings;
        totalCarbsG = customFood.carbsG * servings;
        totalFatG = customFood.fatG * servings;
        totalFiberG = customFood.fiberG * servings;
      }
    } else if (input.recipeId) {
      const recipe = await this.getRecipeNutrition(input.recipeId);
      if (recipe) {
        totalCalories = Math.round(recipe.caloriesPerServing * servings);
        totalProteinG = recipe.proteinPerServing * servings;
        totalCarbsG = recipe.carbsPerServing * servings;
        totalFatG = recipe.fatPerServing * servings;
        totalFiberG = recipe.fiberPerServing * servings;
      }
    } else if (input.quickEntryName) {
      // Quick entry with manual calories/macros
      totalCalories = input.quickEntryCalories || 0;
      totalProteinG = input.quickEntryProteinG || 0;
      totalCarbsG = input.quickEntryCarbsG || 0;
      totalFatG = input.quickEntryFatG || 0;
    }

    const row = await db.queryOne<any>(`
      INSERT INTO meal_logs (
        user_id, meal_date, meal_type, food_id, custom_food_id, recipe_id,
        quick_entry_name, servings, grams,
        total_calories, total_protein_g, total_carbs_g, total_fat_g, total_fiber_g,
        notes, photo_url, workout_id, is_post_workout, logged_via
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      userId,
      mealDate,
      input.mealType,
      input.foodId || null,
      input.customFoodId || null,
      input.recipeId || null,
      input.quickEntryName || null,
      servings,
      input.grams || null,
      totalCalories,
      totalProteinG,
      totalCarbsG,
      totalFatG,
      totalFiberG,
      input.notes || null,
      input.photoUrl || null,
      input.workoutId || null,
      input.isPostWorkout || false,
      input.loggedVia || 'manual',
    ]);

    // Update streaks
    await nutritionService.updateStreaks(userId, mealDate);

    log.info({ userId, mealType: input.mealType, calories: totalCalories }, 'Meal logged');

    return this.mapMealLogRow(row);
  }

  async updateMealLog(id: string, userId: string, input: UpdateMealLogInput): Promise<MealLog | null> {
    // Get existing log
    const existing = await this.getMealLog(id, userId);
    if (!existing) return null;

    // Recalculate totals if servings changed
    let totalCalories = existing.totalCalories;
    let totalProteinG = existing.totalProteinG;
    let totalCarbsG = existing.totalCarbsG;
    let totalFatG = existing.totalFatG;
    let totalFiberG = existing.totalFiberG;

    if (input.servings && input.servings !== existing.servings) {
      const ratio = input.servings / existing.servings;
      totalCalories = Math.round(existing.totalCalories * ratio);
      totalProteinG = existing.totalProteinG * ratio;
      totalCarbsG = existing.totalCarbsG * ratio;
      totalFatG = existing.totalFatG * ratio;
      totalFiberG = existing.totalFiberG * ratio;
    }

    const row = await db.queryOne<any>(`
      UPDATE meal_logs SET
        meal_type = COALESCE($3, meal_type),
        servings = COALESCE($4, servings),
        grams = COALESCE($5, grams),
        total_calories = $6,
        total_protein_g = $7,
        total_carbs_g = $8,
        total_fat_g = $9,
        total_fiber_g = $10,
        notes = COALESCE($11, notes),
        photo_url = COALESCE($12, photo_url),
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [
      id,
      userId,
      input.mealType || null,
      input.servings || null,
      input.grams || null,
      totalCalories,
      totalProteinG,
      totalCarbsG,
      totalFatG,
      totalFiberG,
      input.notes || null,
      input.photoUrl || null,
    ]);

    return row ? this.mapMealLogRow(row) : null;
  }

  async deleteMealLog(id: string, userId: string): Promise<boolean> {
    await db.query(
      `DELETE FROM meal_logs WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return true;
  }

  async getMealLog(id: string, userId: string): Promise<MealLog | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM meal_logs WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return row ? this.mapMealLogRow(row) : null;
  }

  async getMealsByDate(userId: string, date: string): Promise<MealLog[]> {
    const rows = await db.queryAll<any>(`
      SELECT ml.*, f.name as food_name, f.brand as food_brand,
             cf.name as custom_food_name, r.name as recipe_name
      FROM meal_logs ml
      LEFT JOIN foods f ON ml.food_id = f.id
      LEFT JOIN custom_foods cf ON ml.custom_food_id = cf.id
      LEFT JOIN recipes r ON ml.recipe_id = r.id
      WHERE ml.user_id = $1 AND ml.meal_date = $2
      ORDER BY ml.logged_at ASC
    `, [userId, date]);

    return rows.map(this.mapMealLogRow);
  }

  async getMealsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<MealLog[]> {
    const rows = await db.queryAll<any>(`
      SELECT ml.*, f.name as food_name, f.brand as food_brand,
             cf.name as custom_food_name, r.name as recipe_name
      FROM meal_logs ml
      LEFT JOIN foods f ON ml.food_id = f.id
      LEFT JOIN custom_foods cf ON ml.custom_food_id = cf.id
      LEFT JOIN recipes r ON ml.recipe_id = r.id
      WHERE ml.user_id = $1 AND ml.meal_date BETWEEN $2 AND $3
      ORDER BY ml.meal_date DESC, ml.logged_at ASC
    `, [userId, startDate, endDate]);

    return rows.map(this.mapMealLogRow);
  }

  async getRecentMeals(userId: string, limit: number = 20): Promise<MealLog[]> {
    const rows = await db.queryAll<any>(`
      SELECT ml.*, f.name as food_name, f.brand as food_brand,
             cf.name as custom_food_name, r.name as recipe_name
      FROM meal_logs ml
      LEFT JOIN foods f ON ml.food_id = f.id
      LEFT JOIN custom_foods cf ON ml.custom_food_id = cf.id
      LEFT JOIN recipes r ON ml.recipe_id = r.id
      WHERE ml.user_id = $1
      ORDER BY ml.logged_at DESC
      LIMIT $2
    `, [userId, limit]);

    return rows.map(this.mapMealLogRow);
  }

  // ============================================
  // Daily Summaries
  // ============================================

  async getDailySummary(userId: string, date: string): Promise<DailyNutritionSummary | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM daily_nutrition_summaries WHERE user_id = $1 AND summary_date = $2`,
      [userId, date]
    );

    return row ? this.mapSummaryRow(row) : null;
  }

  async getDailySummaries(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DailyNutritionSummary[]> {
    const rows = await db.queryAll<any>(`
      SELECT * FROM daily_nutrition_summaries
      WHERE user_id = $1 AND summary_date BETWEEN $2 AND $3
      ORDER BY summary_date DESC
    `, [userId, startDate, endDate]);

    return rows.map(this.mapSummaryRow);
  }

  async updateDailySummaryGoals(userId: string, date: string): Promise<void> {
    // Get user's goals
    const goals = await db.queryOne<any>(
      `SELECT * FROM nutrition_goals WHERE user_id = $1`,
      [userId]
    );

    if (!goals) return;

    // Check if it's a workout day
    const workout = await db.queryOne<any>(
      `SELECT SUM(total_tu) as tu FROM workouts WHERE user_id = $1 AND DATE(created_at) = $2`,
      [userId, date]
    );

    const wasWorkoutDay = workout && workout.tu > 0;
    const workoutTu = workout?.tu || 0;

    // Calculate adherence scores
    const summary = await this.getDailySummary(userId, date);
    if (!summary) return;

    const goalCalories = wasWorkoutDay ? goals.workout_day_calories : goals.calories;
    const goalProtein = wasWorkoutDay ? goals.workout_day_protein_g : goals.protein_g;

    const calorieAdherence = goalCalories > 0
      ? Math.min(100, Math.round((summary.totalCalories / goalCalories) * 100))
      : null;

    const proteinAdherence = goalProtein > 0
      ? Math.min(100, Math.round((summary.totalProteinG / goalProtein) * 100))
      : null;

    // Macro adherence = average of protein, carbs, fat adherence
    const carbsAdherence = goals.carbs_g > 0
      ? Math.min(100, Math.round((summary.totalCarbsG / goals.carbs_g) * 100))
      : 100;

    const fatAdherence = goals.fat_g > 0
      ? Math.min(100, Math.round((summary.totalFatG / goals.fat_g) * 100))
      : 100;

    const macroAdherence = Math.round((proteinAdherence || 0 + carbsAdherence + fatAdherence) / 3);

    // Overall score weighted: 40% calories, 30% protein, 30% other macros
    const overallScore = Math.round(
      (calorieAdherence || 0) * 0.4 +
      (proteinAdherence || 0) * 0.3 +
      macroAdherence * 0.3
    );

    await db.query(`
      UPDATE daily_nutrition_summaries SET
        goal_calories = $3,
        goal_protein_g = $4,
        goal_carbs_g = $5,
        goal_fat_g = $6,
        was_workout_day = $7,
        workout_tu = $8,
        calorie_adherence = $9,
        protein_adherence = $10,
        macro_adherence = $11,
        overall_score = $12,
        updated_at = NOW()
      WHERE user_id = $1 AND summary_date = $2
    `, [
      userId,
      date,
      goalCalories,
      goalProtein,
      goals.carbs_g,
      goals.fat_g,
      wasWorkoutDay,
      workoutTu,
      calorieAdherence,
      proteinAdherence,
      macroAdherence,
      overallScore,
    ]);
  }

  // ============================================
  // Hydration
  // ============================================

  async logHydration(userId: string, input: CreateHydrationLogInput): Promise<HydrationLog> {
    const logDate = input.logDate || new Date().toISOString().split('T')[0];

    const row = await db.queryOne<any>(`
      INSERT INTO hydration_logs (user_id, log_date, amount_ml, beverage_type, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      userId,
      logDate,
      input.amountMl,
      input.beverageType || 'water',
      input.notes || null,
    ]);

    // Update daily summary water total
    await this.updateDailyWater(userId, logDate);

    return this.mapHydrationRow(row);
  }

  async getHydrationByDate(userId: string, date: string): Promise<HydrationLog[]> {
    const rows = await db.queryAll<any>(
      `SELECT * FROM hydration_logs WHERE user_id = $1 AND log_date = $2 ORDER BY logged_at ASC`,
      [userId, date]
    );
    return rows.map(this.mapHydrationRow);
  }

  async getDailyWaterTotal(userId: string, date: string): Promise<number> {
    const result = await db.queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(amount_ml), 0) as total FROM hydration_logs WHERE user_id = $1 AND log_date = $2`,
      [userId, date]
    );
    return parseInt(result?.total || '0');
  }

  private async updateDailyWater(userId: string, date: string): Promise<void> {
    const total = await this.getDailyWaterTotal(userId, date);

    // Get user's water goal
    const prefs = await nutritionService.getPreferences(userId);
    const waterGoal = prefs?.dailyWaterGoalMl || 2500;

    await db.query(`
      INSERT INTO daily_nutrition_summaries (user_id, summary_date, water_ml, water_goal_ml)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, summary_date) DO UPDATE SET
        water_ml = $3,
        water_goal_ml = $4,
        updated_at = NOW()
    `, [userId, date, total, waterGoal]);
  }

  // ============================================
  // Copy Meals
  // ============================================

  async copyMealsFromDate(
    userId: string,
    sourceDate: string,
    targetDate: string,
    mealTypes?: MealType[]
  ): Promise<MealLog[]> {
    // Get meals from source date
    let meals = await this.getMealsByDate(userId, sourceDate);

    if (mealTypes && mealTypes.length > 0) {
      meals = meals.filter(m => mealTypes.includes(m.mealType));
    }

    const copied: MealLog[] = [];

    for (const meal of meals) {
      const newMeal = await this.createMealLog(userId, {
        mealDate: targetDate,
        mealType: meal.mealType,
        foodId: meal.foodId,
        customFoodId: meal.customFoodId,
        recipeId: meal.recipeId,
        quickEntryName: meal.quickEntryName,
        servings: meal.servings,
        grams: meal.grams,
        notes: meal.notes,
        loggedVia: 'manual',
      });
      copied.push(newMeal);
    }

    return copied;
  }

  // ============================================
  // Helpers
  // ============================================

  private async getRecipeNutrition(recipeId: string): Promise<any> {
    return db.queryOne<any>(
      `SELECT calories_per_serving, protein_per_serving, carbs_per_serving,
              fat_per_serving, fiber_per_serving
       FROM recipes WHERE id = $1`,
      [recipeId]
    );
  }

  private mapMealLogRow(row: any): MealLog {
    return {
      id: row.id,
      userId: row.user_id,
      loggedAt: new Date(row.logged_at),
      mealDate: new Date(row.meal_date),
      mealType: row.meal_type,
      foodId: row.food_id || undefined,
      customFoodId: row.custom_food_id || undefined,
      recipeId: row.recipe_id || undefined,
      quickEntryName: row.quick_entry_name || undefined,
      servings: parseFloat(row.servings),
      grams: row.grams ? parseFloat(row.grams) : undefined,
      totalCalories: row.total_calories,
      totalProteinG: parseFloat(row.total_protein_g) || 0,
      totalCarbsG: parseFloat(row.total_carbs_g) || 0,
      totalFatG: parseFloat(row.total_fat_g) || 0,
      totalFiberG: parseFloat(row.total_fiber_g) || 0,
      notes: row.notes || undefined,
      photoUrl: row.photo_url || undefined,
      workoutId: row.workout_id || undefined,
      isPostWorkout: row.is_post_workout,
      loggedVia: row.logged_via,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      // Joined data
      food: row.food_name ? { name: row.food_name, brand: row.food_brand } as any : undefined,
      customFood: row.custom_food_name ? { name: row.custom_food_name } as any : undefined,
      recipe: row.recipe_name ? { name: row.recipe_name } as any : undefined,
    };
  }

  private mapSummaryRow(row: any): DailyNutritionSummary {
    return {
      id: row.id,
      userId: row.user_id,
      summaryDate: new Date(row.summary_date),
      totalCalories: row.total_calories,
      totalProteinG: parseFloat(row.total_protein_g) || 0,
      totalCarbsG: parseFloat(row.total_carbs_g) || 0,
      totalFatG: parseFloat(row.total_fat_g) || 0,
      totalFiberG: parseFloat(row.total_fiber_g) || 0,
      goalCalories: row.goal_calories,
      goalProteinG: row.goal_protein_g,
      goalCarbsG: row.goal_carbs_g,
      goalFatG: row.goal_fat_g,
      wasWorkoutDay: row.was_workout_day,
      workoutTu: row.workout_tu || 0,
      caloriesBurned: row.calories_burned || 0,
      mealCount: row.meal_count,
      mealsLogged: row.meals_logged || {},
      calorieAdherence: row.calorie_adherence,
      proteinAdherence: row.protein_adherence,
      macroAdherence: row.macro_adherence,
      overallScore: row.overall_score,
      waterMl: row.water_ml || 0,
      waterGoalMl: row.water_goal_ml,
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapHydrationRow(row: any): HydrationLog {
    return {
      id: row.id,
      userId: row.user_id,
      logDate: new Date(row.log_date),
      loggedAt: new Date(row.logged_at),
      amountMl: row.amount_ml,
      beverageType: row.beverage_type,
      notes: row.notes || undefined,
    };
  }
}

export const mealLogService = new MealLogService();
