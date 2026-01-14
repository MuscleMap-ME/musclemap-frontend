/**
 * Meal Plan Service
 *
 * Handles meal plan creation, management, and AI-assisted generation
 */

import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import { recipeService } from './recipe.service';
import { macroCalculatorService } from './macro-calculator.service';
import type {
  MealPlan,
  MealPlanItem,
  CreateMealPlanInput,
  GenerateMealPlanInput,
  ShoppingListItem,
  MealType,
} from './types';

const log = loggers.api;

export class MealPlanService {
  // ============================================
  // CRUD Operations
  // ============================================

  async createMealPlan(userId: string, input: CreateMealPlanInput): Promise<MealPlan> {
    const row = await db.queryOne<any>(`
      INSERT INTO meal_plans (
        user_id, name, description, start_date, end_date,
        daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      userId,
      input.name,
      input.description || null,
      input.startDate,
      input.endDate,
      input.dailyCalories || null,
      input.dailyProteinG || null,
      input.dailyCarbsG || null,
      input.dailyFatG || null,
    ]);

    return this.mapMealPlanRow(row);
  }

  async getMealPlan(id: string, userId: string): Promise<MealPlan | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM meal_plans WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!row) return null;

    const plan = this.mapMealPlanRow(row);

    // Get items
    plan.items = await this.getMealPlanItems(id);

    // Calculate progress
    const completedItems = plan.items?.filter(i => i.completed).length || 0;
    const totalItems = plan.items?.length || 0;
    plan.progress = {
      totalItems,
      completedItems,
      percentComplete: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    };

    return plan;
  }

  async getUserMealPlans(userId: string, status?: string): Promise<MealPlan[]> {
    let query = `SELECT * FROM meal_plans WHERE user_id = $1`;
    const params: any[] = [userId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY start_date DESC`;

    const rows = await db.queryAll<any>(query, params);
    return rows.map(this.mapMealPlanRow);
  }

  async getActiveMealPlan(userId: string): Promise<MealPlan | null> {
    const row = await db.queryOne<any>(`
      SELECT * FROM meal_plans
      WHERE user_id = $1 AND status = 'active'
        AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
      ORDER BY start_date DESC
      LIMIT 1
    `, [userId]);

    if (!row) return null;

    const plan = this.mapMealPlanRow(row);
    plan.items = await this.getMealPlanItems(plan.id);

    return plan;
  }

  async updateMealPlan(
    id: string,
    userId: string,
    updates: Partial<CreateMealPlanInput & { status: string }>
  ): Promise<MealPlan | null> {
    const row = await db.queryOne<any>(`
      UPDATE meal_plans SET
        name = COALESCE($3, name),
        description = COALESCE($4, description),
        start_date = COALESCE($5, start_date),
        end_date = COALESCE($6, end_date),
        daily_calories = COALESCE($7, daily_calories),
        daily_protein_g = COALESCE($8, daily_protein_g),
        daily_carbs_g = COALESCE($9, daily_carbs_g),
        daily_fat_g = COALESCE($10, daily_fat_g),
        status = COALESCE($11, status),
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [
      id,
      userId,
      updates.name || null,
      updates.description,
      updates.startDate || null,
      updates.endDate || null,
      updates.dailyCalories,
      updates.dailyProteinG,
      updates.dailyCarbsG,
      updates.dailyFatG,
      updates.status || null,
    ]);

    return row ? this.mapMealPlanRow(row) : null;
  }

  async deleteMealPlan(id: string, userId: string): Promise<boolean> {
    await db.query(
      `DELETE FROM meal_plans WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return true;
  }

  async activateMealPlan(id: string, userId: string): Promise<MealPlan | null> {
    // Deactivate other active plans
    await db.query(
      `UPDATE meal_plans SET status = 'draft' WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    return this.updateMealPlan(id, userId, { status: 'active' });
  }

  // ============================================
  // Meal Plan Items
  // ============================================

  async addMealPlanItem(
    planId: string,
    userId: string,
    item: {
      planDate: string;
      mealType: MealType;
      recipeId?: string;
      foodId?: string;
      customDescription?: string;
      servings?: number;
    }
  ): Promise<MealPlanItem> {
    // Verify ownership
    const plan = await db.queryOne<any>(
      `SELECT id FROM meal_plans WHERE id = $1 AND user_id = $2`,
      [planId, userId]
    );
    if (!plan) {
      throw new Error('Meal plan not found');
    }

    // Calculate nutrition
    let calories = 0;
    let proteinG = 0;
    let carbsG = 0;
    let fatG = 0;

    const servings = item.servings || 1;

    if (item.recipeId) {
      const recipe = await db.queryOne<any>(
        `SELECT calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving
         FROM recipes WHERE id = $1`,
        [item.recipeId]
      );
      if (recipe) {
        calories = recipe.calories_per_serving * servings;
        proteinG = parseFloat(recipe.protein_per_serving) * servings;
        carbsG = parseFloat(recipe.carbs_per_serving) * servings;
        fatG = parseFloat(recipe.fat_per_serving) * servings;
      }
    } else if (item.foodId) {
      const food = await db.queryOne<any>(
        `SELECT calories, protein_g, carbs_g, fat_g FROM foods WHERE id = $1`,
        [item.foodId]
      );
      if (food) {
        calories = food.calories * servings;
        proteinG = parseFloat(food.protein_g) * servings;
        carbsG = parseFloat(food.carbs_g) * servings;
        fatG = parseFloat(food.fat_g) * servings;
      }
    }

    // Get sort order
    const sortResult = await db.queryOne<{ max_order: number }>(`
      SELECT COALESCE(MAX(sort_order), 0) + 1 as max_order
      FROM meal_plan_items
      WHERE meal_plan_id = $1 AND plan_date = $2
    `, [planId, item.planDate]);

    const row = await db.queryOne<any>(`
      INSERT INTO meal_plan_items (
        meal_plan_id, plan_date, meal_type, recipe_id, food_id,
        custom_description, servings, calories, protein_g, carbs_g, fat_g, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      planId,
      item.planDate,
      item.mealType,
      item.recipeId || null,
      item.foodId || null,
      item.customDescription || null,
      servings,
      Math.round(calories),
      proteinG,
      carbsG,
      fatG,
      sortResult?.max_order || 1,
    ]);

    return this.mapMealPlanItemRow(row);
  }

  async getMealPlanItems(planId: string): Promise<MealPlanItem[]> {
    const rows = await db.queryAll<any>(`
      SELECT mpi.*, r.name as recipe_name, r.photo_url as recipe_photo,
             f.name as food_name
      FROM meal_plan_items mpi
      LEFT JOIN recipes r ON mpi.recipe_id = r.id
      LEFT JOIN foods f ON mpi.food_id = f.id
      WHERE mpi.meal_plan_id = $1
      ORDER BY mpi.plan_date, mpi.sort_order
    `, [planId]);

    return rows.map(this.mapMealPlanItemRow);
  }

  async getMealPlanItemsForDate(planId: string, date: string): Promise<MealPlanItem[]> {
    const rows = await db.queryAll<any>(`
      SELECT mpi.*, r.name as recipe_name, r.photo_url as recipe_photo,
             f.name as food_name
      FROM meal_plan_items mpi
      LEFT JOIN recipes r ON mpi.recipe_id = r.id
      LEFT JOIN foods f ON mpi.food_id = f.id
      WHERE mpi.meal_plan_id = $1 AND mpi.plan_date = $2
      ORDER BY mpi.sort_order
    `, [planId, date]);

    return rows.map(this.mapMealPlanItemRow);
  }

  async updateMealPlanItem(
    itemId: string,
    userId: string,
    updates: { servings?: number; completed?: boolean; completedMealLogId?: string }
  ): Promise<MealPlanItem | null> {
    // Verify ownership
    const item = await db.queryOne<any>(`
      SELECT mpi.* FROM meal_plan_items mpi
      JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
      WHERE mpi.id = $1 AND mp.user_id = $2
    `, [itemId, userId]);

    if (!item) return null;

    const row = await db.queryOne<any>(`
      UPDATE meal_plan_items SET
        servings = COALESCE($2, servings),
        completed = COALESCE($3, completed),
        completed_at = CASE WHEN $3 = true THEN NOW() ELSE completed_at END,
        completed_meal_log_id = COALESCE($4, completed_meal_log_id)
      WHERE id = $1
      RETURNING *
    `, [
      itemId,
      updates.servings || null,
      updates.completed,
      updates.completedMealLogId || null,
    ]);

    return row ? this.mapMealPlanItemRow(row) : null;
  }

  async deleteMealPlanItem(itemId: string, userId: string): Promise<boolean> {
    await db.query(`
      DELETE FROM meal_plan_items mpi
      USING meal_plans mp
      WHERE mpi.id = $1 AND mpi.meal_plan_id = mp.id AND mp.user_id = $2
    `, [itemId, userId]);
    return true;
  }

  // ============================================
  // Shopping List
  // ============================================

  async generateShoppingList(planId: string, userId: string): Promise<ShoppingListItem[]> {
    // Verify ownership and get items
    const plan = await this.getMealPlan(planId, userId);
    if (!plan || !plan.items) {
      return [];
    }

    // Aggregate ingredients from all recipes
    const ingredientMap = new Map<string, ShoppingListItem>();

    for (const item of plan.items) {
      if (item.recipeId) {
        const recipe = await db.queryOne<any>(
          `SELECT ingredients FROM recipes WHERE id = $1`,
          [item.recipeId]
        );

        if (recipe?.ingredients) {
          for (const ingredient of recipe.ingredients) {
            const key = `${ingredient.name.toLowerCase()}_${ingredient.unit}`;
            const existing = ingredientMap.get(key);

            if (existing) {
              existing.quantity += ingredient.quantity * (item.servings || 1);
            } else {
              ingredientMap.set(key, {
                name: ingredient.name,
                quantity: ingredient.quantity * (item.servings || 1),
                unit: ingredient.unit,
                category: this.categorizeIngredient(ingredient.name),
                checked: false,
              });
            }
          }
        }
      }
    }

    const shoppingList = Array.from(ingredientMap.values())
      .sort((a, b) => (a.category || '').localeCompare(b.category || ''));

    // Save to plan
    await db.query(
      `UPDATE meal_plans SET shopping_list = $2 WHERE id = $1`,
      [planId, JSON.stringify(shoppingList)]
    );

    return shoppingList;
  }

  private categorizeIngredient(name: string): string {
    const nameLower = name.toLowerCase();

    // Produce
    if (['apple', 'banana', 'orange', 'lemon', 'lime', 'berry', 'avocado', 'tomato', 'lettuce', 'spinach', 'kale', 'carrot', 'broccoli', 'pepper', 'onion', 'garlic', 'potato', 'sweet potato'].some(f => nameLower.includes(f))) {
      return 'Produce';
    }

    // Meat & Seafood
    if (['chicken', 'beef', 'pork', 'turkey', 'salmon', 'fish', 'shrimp', 'steak', 'ground'].some(f => nameLower.includes(f))) {
      return 'Meat & Seafood';
    }

    // Dairy
    if (['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg'].some(f => nameLower.includes(f))) {
      return 'Dairy & Eggs';
    }

    // Grains
    if (['rice', 'pasta', 'bread', 'oat', 'flour', 'quinoa', 'cereal'].some(f => nameLower.includes(f))) {
      return 'Grains & Bread';
    }

    // Canned & Dry
    if (['bean', 'lentil', 'chickpea', 'canned', 'broth', 'stock', 'sauce'].some(f => nameLower.includes(f))) {
      return 'Canned & Dry Goods';
    }

    // Spices & Condiments
    if (['salt', 'pepper', 'spice', 'herb', 'oil', 'vinegar', 'mustard', 'mayo', 'ketchup'].some(f => nameLower.includes(f))) {
      return 'Spices & Condiments';
    }

    return 'Other';
  }

  // ============================================
  // AI-Assisted Generation
  // ============================================

  async generateMealPlan(
    userId: string,
    input: GenerateMealPlanInput
  ): Promise<MealPlan> {
    const startDate = new Date(input.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + input.days - 1);

    // Get user's goals
    const goals = await macroCalculatorService.getGoals(userId);
    const targetCalories = goals?.calories || 2000;
    const targetProtein = goals?.proteinG || 150;

    // Create the meal plan
    const plan = await this.createMealPlan(userId, {
      name: `${input.days}-Day Meal Plan`,
      description: `AI-generated meal plan${input.dietaryRestrictions?.length ? ` (${input.dietaryRestrictions.join(', ')})` : ''}`,
      startDate: input.startDate,
      endDate: endDate.toISOString().split('T')[0],
      dailyCalories: targetCalories,
      dailyProteinG: targetProtein,
    });

    // Mark as AI-generated
    await db.query(
      `UPDATE meal_plans SET ai_generated = true WHERE id = $1`,
      [plan.id]
    );

    // Find suitable recipes
    const recipes = await recipeService.searchRecipes(
      {
        dietaryTags: input.dietaryRestrictions,
        maxPrepTime: input.maxPrepTimePerMeal,
      },
      { field: 'rating', direction: 'desc' },
      50
    );

    // Distribute recipes across days
    const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner'];

    for (let day = 0; day < input.days; day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];

      for (const mealType of mealTypes) {
        // Select a recipe that fits the meal type
        const suitableRecipes = recipes.items.filter(r =>
          r.mealTypes.length === 0 || r.mealTypes.includes(mealType)
        );

        if (suitableRecipes.length > 0) {
          // Pick a random suitable recipe (could be smarter with variety)
          const recipe = suitableRecipes[Math.floor(Math.random() * suitableRecipes.length)];

          await this.addMealPlanItem(plan.id, userId, {
            planDate: dateStr,
            mealType,
            recipeId: recipe.id,
            servings: 1,
          });
        }
      }
    }

    // Generate shopping list
    await this.generateShoppingList(plan.id, userId);

    return (await this.getMealPlan(plan.id, userId))!;
  }

  // ============================================
  // Helpers
  // ============================================

  private mapMealPlanRow(row: any): MealPlan {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description || undefined,
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      dailyCalories: row.daily_calories || undefined,
      dailyProteinG: row.daily_protein_g || undefined,
      dailyCarbsG: row.daily_carbs_g || undefined,
      dailyFatG: row.daily_fat_g || undefined,
      status: row.status,
      aiGenerated: row.ai_generated,
      templateId: row.template_id || undefined,
      shoppingList: row.shopping_list || [],
      estimatedCost: row.estimated_cost ? parseFloat(row.estimated_cost) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapMealPlanItemRow(row: any): MealPlanItem {
    return {
      id: row.id,
      mealPlanId: row.meal_plan_id,
      planDate: new Date(row.plan_date),
      mealType: row.meal_type,
      recipeId: row.recipe_id || undefined,
      foodId: row.food_id || undefined,
      customDescription: row.custom_description || undefined,
      servings: parseFloat(row.servings) || 1,
      calories: row.calories || undefined,
      proteinG: row.protein_g ? parseFloat(row.protein_g) : undefined,
      carbsG: row.carbs_g ? parseFloat(row.carbs_g) : undefined,
      fatG: row.fat_g ? parseFloat(row.fat_g) : undefined,
      completed: row.completed,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      completedMealLogId: row.completed_meal_log_id || undefined,
      sortOrder: row.sort_order,
      recipe: row.recipe_name ? { name: row.recipe_name, photoUrl: row.recipe_photo } as any : undefined,
      food: row.food_name ? { name: row.food_name } as any : undefined,
    };
  }
}

export const mealPlanService = new MealPlanService();
