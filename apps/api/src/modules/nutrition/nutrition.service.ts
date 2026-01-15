/**
 * Nutrition Service
 *
 * Core service for nutrition preferences and dashboard data
 */

import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import type {
  NutritionPreferences,
  UpdateNutritionPreferencesInput,
  NutritionDashboard,
  NutritionStreaks,
  ArchetypeNutritionProfile,
} from './types';

const log = loggers.api;

export class NutritionService {
  // ============================================
  // Preferences
  // ============================================

  async getPreferences(userId: string): Promise<NutritionPreferences | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM user_nutrition_preferences WHERE user_id = $1`,
      [userId]
    );

    if (!row) return null;

    return this.mapPreferencesRow(row);
  }

  async getOrCreatePreferences(userId: string): Promise<NutritionPreferences> {
    let prefs = await this.getPreferences(userId);

    if (!prefs) {
      await db.query(
        `INSERT INTO user_nutrition_preferences (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
      prefs = await this.getPreferences(userId);
    }

    return prefs!;
  }

  async updatePreferences(
    userId: string,
    input: UpdateNutritionPreferencesInput
  ): Promise<NutritionPreferences> {
    // Ensure preferences exist
    await this.getOrCreatePreferences(userId);

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic update
    const fieldMappings: Record<string, string> = {
      enabled: 'enabled',
      trackingMode: 'tracking_mode',
      showOnDashboard: 'show_on_dashboard',
      showInCommunity: 'show_in_community',
      shareWithCrew: 'share_with_crew',
      goalType: 'goal_type',
      customCalories: 'custom_calories',
      customProteinG: 'custom_protein_g',
      customCarbsG: 'custom_carbs_g',
      customFatG: 'custom_fat_g',
      syncWithArchetype: 'sync_with_archetype',
      syncWithWorkouts: 'sync_with_workouts',
      syncWithRecovery: 'sync_with_recovery',
      dataRetention: 'data_retention',
      dietaryRestrictions: 'dietary_restrictions',
      allergens: 'allergens',
      excludedIngredients: 'excluded_ingredients',
      waterTrackingEnabled: 'water_tracking_enabled',
      dailyWaterGoalMl: 'daily_water_goal_ml',
    };

    for (const [key, column] of Object.entries(fieldMappings)) {
      if (input[key as keyof UpdateNutritionPreferencesInput] !== undefined) {
        updates.push(`${column} = $${paramIndex}`);
        values.push(input[key as keyof UpdateNutritionPreferencesInput]);
        paramIndex++;
      }
    }

    // Handle enabled_at / disabled_at timestamps
    if (input.enabled !== undefined) {
      if (input.enabled) {
        updates.push(`enabled_at = NOW()`);
        updates.push(`disabled_at = NULL`);
      } else {
        updates.push(`disabled_at = NOW()`);
      }
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    await db.query(
      `UPDATE user_nutrition_preferences
       SET ${updates.join(', ')}
       WHERE user_id = $${paramIndex}`,
      values
    );

    // Update users table flag
    if (input.enabled !== undefined) {
      await db.query(
        `UPDATE users SET nutrition_enabled = $1 WHERE id = $2`,
        [input.enabled, userId]
      );
    }

    return (await this.getPreferences(userId))!;
  }

  async enableNutrition(userId: string): Promise<NutritionPreferences> {
    return this.updatePreferences(userId, { enabled: true });
  }

  async disableNutrition(userId: string, deleteData: boolean = false): Promise<boolean> {
    await this.updatePreferences(userId, { enabled: false });

    if (deleteData) {
      // Delete all user nutrition data
      await db.query(`DELETE FROM meal_logs WHERE user_id = $1`, [userId]);
      await db.query(`DELETE FROM daily_nutrition_summaries WHERE user_id = $1`, [userId]);
      await db.query(`DELETE FROM nutrition_goals WHERE user_id = $1`, [userId]);
      await db.query(`DELETE FROM meal_plans WHERE user_id = $1`, [userId]);
      await db.query(`DELETE FROM custom_foods WHERE user_id = $1`, [userId]);
      await db.query(`DELETE FROM recipes WHERE author_id = $1`, [userId]);
      await db.query(`DELETE FROM hydration_logs WHERE user_id = $1`, [userId]);
      await db.query(`DELETE FROM nutrition_streaks WHERE user_id = $1`, [userId]);
      await db.query(`DELETE FROM nutrition_posts WHERE user_id = $1`, [userId]);
      log.info({ userId }, 'Deleted all nutrition data for user');
    }

    return true;
  }

  // ============================================
  // Dashboard
  // ============================================

  async getDashboard(userId: string): Promise<NutritionDashboard> {
    const [prefs, goals, todaySummary, streaks, recentMeals, userArchetype] = await Promise.all([
      this.getOrCreatePreferences(userId),
      this.getGoals(userId),
      this.getTodaySummary(userId),
      this.getStreaks(userId),
      this.getRecentMeals(userId, 5),
      this.getUserArchetype(userId),
    ]);

    let archetypeProfile: ArchetypeNutritionProfile | null = null;
    if (userArchetype && prefs.syncWithArchetype) {
      archetypeProfile = await this.getArchetypeProfile(userArchetype);
    }

    return {
      enabled: prefs.enabled,
      preferences: prefs,
      goals,
      todaySummary,
      streaks,
      recentMeals,
      archetypeProfile,
    };
  }

  private async getGoals(userId: string): Promise<any> {
    const row = await db.queryOne<any>(
      `SELECT * FROM nutrition_goals WHERE user_id = $1`,
      [userId]
    );
    return row ? this.mapGoalsRow(row) : null;
  }

  private async getTodaySummary(userId: string): Promise<any> {
    const today = new Date().toISOString().split('T')[0];

    // Get summary
    const summary = await db.queryOne<any>(
      `SELECT * FROM daily_nutrition_summaries
       WHERE user_id = $1 AND summary_date = $2`,
      [userId, today]
    );

    // Get today's meals
    const meals = await db.queryAll<any>(
      `SELECT ml.*, f.name as food_name, f.brand as food_brand,
              cf.name as custom_food_name, r.name as recipe_name
       FROM meal_logs ml
       LEFT JOIN foods f ON ml.food_id = f.id
       LEFT JOIN custom_foods cf ON ml.custom_food_id = cf.id
       LEFT JOIN recipes r ON ml.recipe_id = r.id
       WHERE ml.user_id = $1 AND ml.meal_date = $2
       ORDER BY ml.logged_at ASC`,
      [userId, today]
    );

    // Get goals for remaining calculation
    const goals = await this.getGoals(userId);

    if (!summary) {
      // Return empty summary
      return {
        id: null,
        userId,
        summaryDate: new Date(today),
        totalCalories: 0,
        totalProteinG: 0,
        totalCarbsG: 0,
        totalFatG: 0,
        totalFiberG: 0,
        goalCalories: goals?.calories,
        goalProteinG: goals?.proteinG,
        goalCarbsG: goals?.carbsG,
        goalFatG: goals?.fatG,
        wasWorkoutDay: false,
        workoutTu: 0,
        caloriesBurned: 0,
        mealCount: 0,
        mealsLogged: {},
        waterMl: 0,
        meals: [],
        remaining: {
          calories: goals?.calories ?? 0,
          proteinG: goals?.proteinG ?? 0,
          carbsG: goals?.carbsG ?? 0,
          fatG: goals?.fatG ?? 0,
        },
      };
    }

    const mappedSummary = this.mapSummaryRow(summary);

    return {
      ...mappedSummary,
      meals: meals.map(this.mapMealLogRow),
      remaining: {
        calories: (goals?.calories ?? 0) - mappedSummary.totalCalories,
        proteinG: (goals?.proteinG ?? 0) - mappedSummary.totalProteinG,
        carbsG: (goals?.carbsG ?? 0) - mappedSummary.totalCarbsG,
        fatG: (goals?.fatG ?? 0) - mappedSummary.totalFatG,
      },
    };
  }

  private async getRecentMeals(userId: string, limit: number): Promise<any[]> {
    const rows = await db.queryAll<any>(
      `SELECT ml.*, f.name as food_name, f.brand as food_brand,
              cf.name as custom_food_name, r.name as recipe_name
       FROM meal_logs ml
       LEFT JOIN foods f ON ml.food_id = f.id
       LEFT JOIN custom_foods cf ON ml.custom_food_id = cf.id
       LEFT JOIN recipes r ON ml.recipe_id = r.id
       WHERE ml.user_id = $1
       ORDER BY ml.logged_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return rows.map(this.mapMealLogRow);
  }

  // ============================================
  // Streaks
  // ============================================

  async getStreaks(userId: string): Promise<NutritionStreaks | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM nutrition_streaks WHERE user_id = $1`,
      [userId]
    );

    if (!row) return null;

    return {
      userId: row.user_id,
      currentLoggingStreak: row.current_logging_streak,
      longestLoggingStreak: row.longest_logging_streak,
      lastLoggedDate: row.last_logged_date ? new Date(row.last_logged_date) : undefined,
      currentGoalStreak: row.current_goal_streak,
      longestGoalStreak: row.longest_goal_streak,
      lastGoalHitDate: row.last_goal_hit_date ? new Date(row.last_goal_hit_date) : undefined,
      currentProteinStreak: row.current_protein_streak,
      longestProteinStreak: row.longest_protein_streak,
      totalMealsLogged: row.total_meals_logged,
      totalDaysLogged: row.total_days_logged,
      totalCaloriesLogged: row.total_calories_logged,
      updatedAt: new Date(row.updated_at),
    };
  }

  async updateStreaks(userId: string, mealDate: string): Promise<void> {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    await db.query(`
      INSERT INTO nutrition_streaks (user_id, current_logging_streak, longest_logging_streak, last_logged_date, total_meals_logged, total_days_logged)
      VALUES ($1, 1, 1, $2, 1, 1)
      ON CONFLICT (user_id) DO UPDATE SET
        current_logging_streak = CASE
          WHEN nutrition_streaks.last_logged_date = $3 THEN nutrition_streaks.current_logging_streak
          WHEN nutrition_streaks.last_logged_date = $4 THEN nutrition_streaks.current_logging_streak + 1
          ELSE 1
        END,
        longest_logging_streak = GREATEST(
          nutrition_streaks.longest_logging_streak,
          CASE
            WHEN nutrition_streaks.last_logged_date = $3 THEN nutrition_streaks.current_logging_streak
            WHEN nutrition_streaks.last_logged_date = $4 THEN nutrition_streaks.current_logging_streak + 1
            ELSE 1
          END
        ),
        last_logged_date = $2,
        total_meals_logged = nutrition_streaks.total_meals_logged + 1,
        total_days_logged = CASE
          WHEN nutrition_streaks.last_logged_date = $2 THEN nutrition_streaks.total_days_logged
          ELSE nutrition_streaks.total_days_logged + 1
        END,
        updated_at = NOW()
    `, [userId, mealDate, mealDate, yesterday]);
  }

  // ============================================
  // Archetype Profiles
  // ============================================

  async getArchetypeProfile(archetype: string): Promise<ArchetypeNutritionProfile | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM archetype_nutrition_profiles WHERE archetype = $1`,
      [archetype.toLowerCase()]
    );

    if (!row) return null;

    return {
      archetype: row.archetype,
      name: row.name,
      description: row.description,
      proteinPct: parseFloat(row.protein_pct),
      carbsPct: parseFloat(row.carbs_pct),
      fatPct: parseFloat(row.fat_pct),
      proteinMultiplier: parseFloat(row.protein_multiplier),
      calorieAdjustment: row.calorie_adjustment,
      priorityNutrients: row.priority_nutrients || [],
      mealTiming: row.meal_timing,
      suggestedFoods: row.suggested_foods || [],
      avoidFoods: row.avoid_foods || [],
      tips: row.tips || [],
    };
  }

  async getAllArchetypeProfiles(): Promise<ArchetypeNutritionProfile[]> {
    const rows = await db.queryAll<any>(
      `SELECT * FROM archetype_nutrition_profiles ORDER BY archetype`
    );

    return rows.map(row => ({
      archetype: row.archetype,
      name: row.name,
      description: row.description,
      proteinPct: parseFloat(row.protein_pct),
      carbsPct: parseFloat(row.carbs_pct),
      fatPct: parseFloat(row.fat_pct),
      proteinMultiplier: parseFloat(row.protein_multiplier),
      calorieAdjustment: row.calorie_adjustment,
      priorityNutrients: row.priority_nutrients || [],
      mealTiming: row.meal_timing,
      suggestedFoods: row.suggested_foods || [],
      avoidFoods: row.avoid_foods || [],
      tips: row.tips || [],
    }));
  }

  // ============================================
  // Helpers
  // ============================================

  private async getUserArchetype(userId: string): Promise<string | null> {
    const row = await db.queryOne<{ archetype: string }>(
      `SELECT archetype FROM users WHERE id = $1`,
      [userId]
    );
    return row?.archetype || null;
  }

  private mapPreferencesRow(row: any): NutritionPreferences {
    return {
      id: row.id,
      userId: row.user_id,
      enabled: row.enabled,
      enabledAt: row.enabled_at ? new Date(row.enabled_at) : undefined,
      disabledAt: row.disabled_at ? new Date(row.disabled_at) : undefined,
      trackingMode: row.tracking_mode,
      showOnDashboard: row.show_on_dashboard,
      showInCommunity: row.show_in_community,
      shareWithCrew: row.share_with_crew,
      goalType: row.goal_type,
      customCalories: row.custom_calories,
      customProteinG: row.custom_protein_g,
      customCarbsG: row.custom_carbs_g,
      customFatG: row.custom_fat_g,
      syncWithArchetype: row.sync_with_archetype,
      syncWithWorkouts: row.sync_with_workouts,
      syncWithRecovery: row.sync_with_recovery,
      dataRetention: row.data_retention,
      dietaryRestrictions: row.dietary_restrictions || [],
      allergens: row.allergens || [],
      excludedIngredients: row.excluded_ingredients || [],
      waterTrackingEnabled: row.water_tracking_enabled,
      dailyWaterGoalMl: row.daily_water_goal_ml,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapGoalsRow(row: any): any {
    return {
      id: row.id,
      userId: row.user_id,
      calories: row.calories,
      proteinG: row.protein_g,
      carbsG: row.carbs_g,
      fatG: row.fat_g,
      fiberG: row.fiber_g,
      workoutDayCalories: row.workout_day_calories,
      workoutDayProteinG: row.workout_day_protein_g,
      workoutDayCarbsG: row.workout_day_carbs_g,
      tdee: row.tdee,
      bmr: row.bmr,
      activityMultiplier: parseFloat(row.activity_multiplier),
      goalAdjustment: row.goal_adjustment,
      weightKg: row.weight_kg ? parseFloat(row.weight_kg) : undefined,
      heightCm: row.height_cm ? parseFloat(row.height_cm) : undefined,
      age: row.age,
      sex: row.sex,
      activityLevel: row.activity_level,
      archetype: row.archetype,
      archetypeModifier: row.archetype_modifier,
      calculatedAt: new Date(row.calculated_at),
      validUntil: new Date(row.valid_until),
      confidenceScore: parseFloat(row.confidence_score),
    };
  }

  private mapSummaryRow(row: any): any {
    return {
      id: row.id,
      userId: row.user_id,
      summaryDate: new Date(row.summary_date),
      totalCalories: row.total_calories,
      totalProteinG: parseFloat(row.total_protein_g),
      totalCarbsG: parseFloat(row.total_carbs_g),
      totalFatG: parseFloat(row.total_fat_g),
      totalFiberG: parseFloat(row.total_fiber_g),
      goalCalories: row.goal_calories,
      goalProteinG: row.goal_protein_g,
      goalCarbsG: row.goal_carbs_g,
      goalFatG: row.goal_fat_g,
      wasWorkoutDay: row.was_workout_day,
      workoutTu: row.workout_tu,
      caloriesBurned: row.calories_burned,
      mealCount: row.meal_count,
      mealsLogged: row.meals_logged || {},
      calorieAdherence: row.calorie_adherence,
      proteinAdherence: row.protein_adherence,
      macroAdherence: row.macro_adherence,
      overallScore: row.overall_score,
      waterMl: row.water_ml,
      waterGoalMl: row.water_goal_ml,
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapMealLogRow(row: any): any {
    return {
      id: row.id,
      userId: row.user_id,
      loggedAt: new Date(row.logged_at),
      mealDate: new Date(row.meal_date),
      mealType: row.meal_type,
      foodId: row.food_id,
      customFoodId: row.custom_food_id,
      recipeId: row.recipe_id,
      quickEntryName: row.quick_entry_name,
      servings: parseFloat(row.servings),
      grams: row.grams ? parseFloat(row.grams) : undefined,
      totalCalories: row.total_calories,
      totalProteinG: parseFloat(row.total_protein_g),
      totalCarbsG: parseFloat(row.total_carbs_g),
      totalFatG: parseFloat(row.total_fat_g),
      totalFiberG: parseFloat(row.total_fiber_g),
      notes: row.notes,
      photoUrl: row.photo_url,
      workoutId: row.workout_id,
      isPostWorkout: row.is_post_workout,
      loggedVia: row.logged_via,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      // Joined data
      foodName: row.food_name,
      foodBrand: row.food_brand,
      customFoodName: row.custom_food_name,
      recipeName: row.recipe_name,
    };
  }
}

export const nutritionService = new NutritionService();
