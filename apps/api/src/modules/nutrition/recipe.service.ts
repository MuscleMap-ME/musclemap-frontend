/**
 * Recipe Service
 *
 * Handles recipe CRUD, community features, ratings, and saves
 */

import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import type {
  Recipe,
  CreateRecipeInput,
  UpdateRecipeInput,
  RecipeFilter,
  RecipeSort,
  RecipeIngredient,
  PaginatedResponse,
} from './types';

const log = loggers.api;

export class RecipeService {
  // ============================================
  // CRUD Operations
  // ============================================

  async createRecipe(userId: string, input: CreateRecipeInput): Promise<Recipe> {
    // Calculate nutrition per serving from ingredients
    const nutrition = await this.calculateRecipeNutrition(input.ingredients, input.servings);

    // Generate slug
    const slug = this.generateSlug(input.name);

    const row = await db.queryOne<any>(`
      INSERT INTO recipes (
        author_id, name, description, slug, servings,
        calories_per_serving, protein_per_serving, carbs_per_serving,
        fat_per_serving, fiber_per_serving,
        prep_time_min, cook_time_min, difficulty,
        ingredients, steps, tips,
        cuisine, dietary_tags, allergens, meal_types,
        archetype_bonus, muscle_groups,
        photo_url, video_url, is_public, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      )
      RETURNING *
    `, [
      userId,
      input.name,
      input.description || null,
      slug,
      input.servings,
      nutrition.calories,
      nutrition.protein,
      nutrition.carbs,
      nutrition.fat,
      nutrition.fiber,
      input.prepTimeMin || null,
      input.cookTimeMin || null,
      input.difficulty || 'medium',
      JSON.stringify(input.ingredients),
      JSON.stringify(input.steps),
      input.tips || null,
      input.cuisine || null,
      input.dietaryTags || [],
      input.allergens || [],
      input.mealTypes || [],
      input.archetypeBonus || null,
      input.muscleGroups || [],
      input.photoUrl || null,
      input.videoUrl || null,
      input.isPublic || false,
      input.isPublic ? 'published' : 'draft',
    ]);

    log.info({ userId, recipeId: row.id, name: input.name }, 'Recipe created');

    return this.mapRecipeRow(row);
  }

  async updateRecipe(id: string, userId: string, input: UpdateRecipeInput): Promise<Recipe | null> {
    // Verify ownership
    const existing = await this.getRecipe(id);
    if (!existing || existing.authorId !== userId) {
      return null;
    }

    // Recalculate nutrition if ingredients changed
    let nutrition = {
      calories: existing.caloriesPerServing,
      protein: existing.proteinPerServing,
      carbs: existing.carbsPerServing,
      fat: existing.fatPerServing,
      fiber: existing.fiberPerServing,
    };

    if (input.ingredients) {
      nutrition = await this.calculateRecipeNutrition(
        input.ingredients,
        input.servings || existing.servings
      );
    }

    const row = await db.queryOne<any>(`
      UPDATE recipes SET
        name = COALESCE($3, name),
        description = COALESCE($4, description),
        servings = COALESCE($5, servings),
        calories_per_serving = $6,
        protein_per_serving = $7,
        carbs_per_serving = $8,
        fat_per_serving = $9,
        fiber_per_serving = $10,
        prep_time_min = COALESCE($11, prep_time_min),
        cook_time_min = COALESCE($12, cook_time_min),
        difficulty = COALESCE($13, difficulty),
        ingredients = COALESCE($14, ingredients),
        steps = COALESCE($15, steps),
        tips = COALESCE($16, tips),
        cuisine = COALESCE($17, cuisine),
        dietary_tags = COALESCE($18, dietary_tags),
        allergens = COALESCE($19, allergens),
        meal_types = COALESCE($20, meal_types),
        archetype_bonus = COALESCE($21, archetype_bonus),
        muscle_groups = COALESCE($22, muscle_groups),
        photo_url = COALESCE($23, photo_url),
        video_url = COALESCE($24, video_url),
        is_public = COALESCE($25, is_public),
        status = COALESCE($26, status),
        updated_at = NOW()
      WHERE id = $1 AND author_id = $2
      RETURNING *
    `, [
      id,
      userId,
      input.name || null,
      input.description,
      input.servings || null,
      nutrition.calories,
      nutrition.protein,
      nutrition.carbs,
      nutrition.fat,
      nutrition.fiber,
      input.prepTimeMin,
      input.cookTimeMin,
      input.difficulty || null,
      input.ingredients ? JSON.stringify(input.ingredients) : null,
      input.steps ? JSON.stringify(input.steps) : null,
      input.tips,
      input.cuisine,
      input.dietaryTags || null,
      input.allergens || null,
      input.mealTypes || null,
      input.archetypeBonus,
      input.muscleGroups || null,
      input.photoUrl,
      input.videoUrl,
      input.isPublic,
      input.status || null,
    ]);

    return row ? this.mapRecipeRow(row) : null;
  }

  async deleteRecipe(id: string, userId: string): Promise<boolean> {
    await db.query(
      `DELETE FROM recipes WHERE id = $1 AND author_id = $2`,
      [id, userId]
    );
    return true;
  }

  async getRecipe(id: string, userId?: string): Promise<Recipe | null> {
    // Use parameterized query to prevent SQL injection
    const params: string[] = [id];
    const userSelect = userId
      ? `EXISTS(SELECT 1 FROM recipe_saves WHERE recipe_id = r.id AND user_id = $2) as is_saved,
         (SELECT rating FROM recipe_ratings WHERE recipe_id = r.id AND user_id = $2) as user_rating`
      : 'false as is_saved, null as user_rating';
    if (userId) {
      params.push(userId);
    }

    const row = await db.queryOne<any>(`
      SELECT r.*, u.username as author_username, u.avatar_url as author_avatar_url,
             ${userSelect}
      FROM recipes r
      LEFT JOIN users u ON r.author_id = u.id
      WHERE r.id = $1
    `, params);

    if (!row) return null;

    // Increment view count
    await db.query(
      `UPDATE recipes SET view_count = view_count + 1 WHERE id = $1`,
      [id]
    );

    return this.mapRecipeRow(row);
  }

  // ============================================
  // Search & Filter
  // ============================================

  async searchRecipes(
    filter: RecipeFilter,
    sort: RecipeSort = { field: 'created_at', direction: 'desc' },
    limit: number = 20,
    cursor?: string,
    userId?: string
  ): Promise<PaginatedResponse<Recipe>> {
    const conditions: string[] = ['r.is_public = true', "r.status = 'published'"];
    const params: any[] = [];
    let paramIndex = 1;

    // Build filter conditions
    if (filter.query) {
      conditions.push(`(r.name ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`);
      params.push(`%${filter.query}%`);
      paramIndex++;
    }

    if (filter.authorId) {
      conditions.push(`r.author_id = $${paramIndex}`);
      params.push(filter.authorId);
      paramIndex++;
    }

    if (filter.cuisine) {
      conditions.push(`r.cuisine = $${paramIndex}`);
      params.push(filter.cuisine);
      paramIndex++;
    }

    if (filter.dietaryTags && filter.dietaryTags.length > 0) {
      conditions.push(`r.dietary_tags && $${paramIndex}`);
      params.push(filter.dietaryTags);
      paramIndex++;
    }

    if (filter.difficulty) {
      conditions.push(`r.difficulty = $${paramIndex}`);
      params.push(filter.difficulty);
      paramIndex++;
    }

    if (filter.maxPrepTime) {
      conditions.push(`r.total_time_min <= $${paramIndex}`);
      params.push(filter.maxPrepTime);
      paramIndex++;
    }

    if (filter.maxCalories) {
      conditions.push(`r.calories_per_serving <= $${paramIndex}`);
      params.push(filter.maxCalories);
      paramIndex++;
    }

    if (filter.minProtein) {
      conditions.push(`r.protein_per_serving >= $${paramIndex}`);
      params.push(filter.minProtein);
      paramIndex++;
    }

    if (filter.archetypeBonus) {
      conditions.push(`r.archetype_bonus = $${paramIndex}`);
      params.push(filter.archetypeBonus);
      paramIndex++;
    }

    if (filter.mealTypes && filter.mealTypes.length > 0) {
      conditions.push(`r.meal_types && $${paramIndex}`);
      params.push(filter.mealTypes);
      paramIndex++;
    }

    if (filter.savedByUser && userId) {
      conditions.push(`EXISTS(SELECT 1 FROM recipe_saves WHERE recipe_id = r.id AND user_id = $${paramIndex})`);
      params.push(userId);
      paramIndex++;
    }

    // Cursor for keyset pagination
    if (cursor) {
      const [cursorValue, cursorId] = cursor.split('_');
      const sortColumn = this.getSortColumn(sort.field);
      const op = sort.direction === 'desc' ? '<' : '>';
      conditions.push(`(${sortColumn} ${op} $${paramIndex} OR (${sortColumn} = $${paramIndex} AND r.id ${op} $${paramIndex + 1}))`);
      params.push(cursorValue, cursorId);
      paramIndex += 2;
    }

    const whereClause = conditions.join(' AND ');
    const orderClause = `${this.getSortColumn(sort.field)} ${sort.direction.toUpperCase()}, r.id ${sort.direction.toUpperCase()}`;

    // Get total count
    const countResult = await db.queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM recipes r WHERE ${whereClause}
    `, params.slice(0, paramIndex - (cursor ? 2 : 0)));

    const total = parseInt(countResult?.count || '0');

    // Use parameterized query to prevent SQL injection
    const userSelect = userId
      ? `, EXISTS(SELECT 1 FROM recipe_saves WHERE recipe_id = r.id AND user_id = $${paramIndex++}) as is_saved`
      : ', false as is_saved';
    if (userId) {
      params.push(userId);
    }

    // Get recipes
    params.push(limit + 1); // +1 to check hasMore
    const rows = await db.queryAll<any>(`
      SELECT r.*, u.username as author_username, u.avatar_url as author_avatar_url
             ${userSelect}
      FROM recipes r
      LEFT JOIN users u ON r.author_id = u.id
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${paramIndex}
    `, params);

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(this.mapRecipeRow);

    // Generate cursor for next page
    let nextCursor: string | undefined;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      const cursorValue = this.getCursorValue(lastItem, sort.field);
      nextCursor = `${cursorValue}_${lastItem.id}`;
    }

    return {
      items,
      total,
      hasMore,
      cursor: nextCursor,
    };
  }

  async getUserRecipes(userId: string, limit: number = 50): Promise<Recipe[]> {
    const rows = await db.queryAll<any>(`
      SELECT r.*, u.username as author_username, u.avatar_url as author_avatar_url
      FROM recipes r
      LEFT JOIN users u ON r.author_id = u.id
      WHERE r.author_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return rows.map(this.mapRecipeRow);
  }

  async getSavedRecipes(userId: string, limit: number = 50): Promise<Recipe[]> {
    const rows = await db.queryAll<any>(`
      SELECT r.*, u.username as author_username, u.avatar_url as author_avatar_url, true as is_saved
      FROM recipes r
      JOIN recipe_saves rs ON r.id = rs.recipe_id
      LEFT JOIN users u ON r.author_id = u.id
      WHERE rs.user_id = $1
      ORDER BY rs.saved_at DESC
      LIMIT $2
    `, [userId, limit]);

    return rows.map(this.mapRecipeRow);
  }

  // ============================================
  // Saves & Ratings
  // ============================================

  async saveRecipe(recipeId: string, userId: string): Promise<boolean> {
    await db.query(`
      INSERT INTO recipe_saves (user_id, recipe_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, recipe_id) DO NOTHING
    `, [userId, recipeId]);
    return true;
  }

  async unsaveRecipe(recipeId: string, userId: string): Promise<boolean> {
    await db.query(
      `DELETE FROM recipe_saves WHERE user_id = $1 AND recipe_id = $2`,
      [userId, recipeId]
    );
    return true;
  }

  async rateRecipe(
    recipeId: string,
    userId: string,
    rating: number,
    review?: string
  ): Promise<boolean> {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    await db.query(`
      INSERT INTO recipe_ratings (user_id, recipe_id, rating, review)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, recipe_id) DO UPDATE SET
        rating = $3,
        review = COALESCE($4, recipe_ratings.review),
        updated_at = NOW()
    `, [userId, recipeId, rating, review || null]);

    return true;
  }

  async getRecipeRatings(
    recipeId: string,
    limit: number = 20
  ): Promise<{ userId: string; rating: number; review?: string; createdAt: Date }[]> {
    const rows = await db.queryAll<any>(`
      SELECT rr.*, u.username
      FROM recipe_ratings rr
      JOIN users u ON rr.user_id = u.id
      WHERE rr.recipe_id = $1
      ORDER BY rr.created_at DESC
      LIMIT $2
    `, [recipeId, limit]);

    return rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      rating: row.rating,
      review: row.review || undefined,
      createdAt: new Date(row.created_at),
    }));
  }

  // ============================================
  // Popular & Featured
  // ============================================

  async getPopularRecipes(limit: number = 10): Promise<Recipe[]> {
    const rows = await db.queryAll<any>(`
      SELECT r.*, u.username as author_username, u.avatar_url as author_avatar_url
      FROM recipes r
      LEFT JOIN users u ON r.author_id = u.id
      WHERE r.is_public = true AND r.status = 'published'
      ORDER BY r.save_count DESC, r.rating DESC
      LIMIT $1
    `, [limit]);

    return rows.map(this.mapRecipeRow);
  }

  async getTrendingRecipes(limit: number = 10): Promise<Recipe[]> {
    // Trending = high activity in last 7 days
    const rows = await db.queryAll<any>(`
      SELECT r.*, u.username as author_username, u.avatar_url as author_avatar_url,
             COUNT(rs.user_id) as recent_saves
      FROM recipes r
      LEFT JOIN users u ON r.author_id = u.id
      LEFT JOIN recipe_saves rs ON r.id = rs.recipe_id AND rs.saved_at > NOW() - INTERVAL '7 days'
      WHERE r.is_public = true AND r.status = 'published'
      GROUP BY r.id, u.username, u.avatar_url
      ORDER BY recent_saves DESC, r.rating DESC
      LIMIT $1
    `, [limit]);

    return rows.map(this.mapRecipeRow);
  }

  async getRecipesByArchetype(archetype: string, limit: number = 10): Promise<Recipe[]> {
    const rows = await db.queryAll<any>(`
      SELECT r.*, u.username as author_username, u.avatar_url as author_avatar_url
      FROM recipes r
      LEFT JOIN users u ON r.author_id = u.id
      WHERE r.is_public = true AND r.status = 'published'
        AND r.archetype_bonus = $1
      ORDER BY r.rating DESC, r.save_count DESC
      LIMIT $2
    `, [archetype.toLowerCase(), limit]);

    return rows.map(this.mapRecipeRow);
  }

  // ============================================
  // Helpers
  // ============================================

  private async calculateRecipeNutrition(
    ingredients: RecipeIngredient[],
    servings: number
  ): Promise<{ calories: number; protein: number; carbs: number; fat: number; fiber: number }> {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;

    for (const ingredient of ingredients) {
      // If ingredient has nutrition info, use it
      if (ingredient.calories !== undefined) {
        totalCalories += ingredient.calories;
        totalProtein += ingredient.proteinG || 0;
        totalCarbs += ingredient.carbsG || 0;
        totalFat += ingredient.fatG || 0;
      } else if (ingredient.foodId) {
        // Look up food nutrition
        const food = await db.queryOne<any>(
          `SELECT calories, protein_g, carbs_g, fat_g, fiber_g, serving_size_g
           FROM foods WHERE id = $1`,
          [ingredient.foodId]
        );

        if (food) {
          // Calculate based on quantity vs serving size
          const servingRatio = ingredient.quantity / (food.serving_size_g || 100);
          totalCalories += Math.round(food.calories * servingRatio);
          totalProtein += (parseFloat(food.protein_g) || 0) * servingRatio;
          totalCarbs += (parseFloat(food.carbs_g) || 0) * servingRatio;
          totalFat += (parseFloat(food.fat_g) || 0) * servingRatio;
          totalFiber += (parseFloat(food.fiber_g) || 0) * servingRatio;
        }
      }
    }

    // Calculate per serving
    return {
      calories: Math.round(totalCalories / servings),
      protein: Math.round((totalProtein / servings) * 10) / 10,
      carbs: Math.round((totalCarbs / servings) * 10) / 10,
      fat: Math.round((totalFat / servings) * 10) / 10,
      fiber: Math.round((totalFiber / servings) * 10) / 10,
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }

  private getSortColumn(field: string): string {
    const columns: Record<string, string> = {
      created_at: 'r.created_at',
      rating: 'r.rating',
      save_count: 'r.save_count',
      prep_time: 'r.total_time_min',
      calories: 'r.calories_per_serving',
    };
    return columns[field] || 'r.created_at';
  }

  private getCursorValue(recipe: Recipe, field: string): string {
    switch (field) {
      case 'rating':
        return String(recipe.rating);
      case 'save_count':
        return String(recipe.saveCount);
      case 'prep_time':
        return String(recipe.totalTimeMin || 0);
      case 'calories':
        return String(recipe.caloriesPerServing);
      default:
        return recipe.createdAt.toISOString();
    }
  }

  private mapRecipeRow(row: any): Recipe {
    return {
      id: row.id,
      authorId: row.author_id,
      name: row.name,
      description: row.description || undefined,
      slug: row.slug || undefined,
      servings: row.servings,
      caloriesPerServing: row.calories_per_serving,
      proteinPerServing: parseFloat(row.protein_per_serving) || 0,
      carbsPerServing: parseFloat(row.carbs_per_serving) || 0,
      fatPerServing: parseFloat(row.fat_per_serving) || 0,
      fiberPerServing: parseFloat(row.fiber_per_serving) || 0,
      prepTimeMin: row.prep_time_min || undefined,
      cookTimeMin: row.cook_time_min || undefined,
      totalTimeMin: row.total_time_min || undefined,
      difficulty: row.difficulty || undefined,
      ingredients: row.ingredients || [],
      steps: row.steps || [],
      tips: row.tips || undefined,
      cuisine: row.cuisine || undefined,
      dietaryTags: row.dietary_tags || [],
      allergens: row.allergens || [],
      mealTypes: row.meal_types || [],
      archetypeBonus: row.archetype_bonus || undefined,
      muscleGroups: row.muscle_groups || [],
      photoUrl: row.photo_url || undefined,
      videoUrl: row.video_url || undefined,
      isPublic: row.is_public,
      rating: parseFloat(row.rating) || 0,
      ratingCount: row.rating_count,
      saveCount: row.save_count,
      viewCount: row.view_count,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      author: row.author_username ? {
        id: row.author_id,
        username: row.author_username,
        avatarUrl: row.author_avatar_url || undefined,
      } : undefined,
      isSaved: row.is_saved || false,
      userRating: row.user_rating || undefined,
    };
  }
}

export const recipeService = new RecipeService();
