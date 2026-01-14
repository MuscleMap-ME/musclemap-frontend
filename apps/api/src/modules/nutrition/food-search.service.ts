/**
 * Food Search Service
 *
 * Multi-source food search with caching:
 * 1. Local cache (PostgreSQL)
 * 2. Open Food Facts (barcode + search)
 * 3. USDA FoodData Central
 * 4. FatSecret (if configured)
 */

import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import type { Food, CustomFood, FoodSearchResult, FoodSearchOptions, CreateCustomFoodInput } from './types';

const log = loggers.api;

// API Configuration
const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const OFF_BASE_URL = 'https://world.openfoodfacts.org/api/v2';
const FATSECRET_KEY = process.env.FATSECRET_API_KEY;
const FATSECRET_SECRET = process.env.FATSECRET_API_SECRET;

export class FoodSearchService {
  // ============================================
  // Main Search
  // ============================================

  async search(options: FoodSearchOptions, userId?: string): Promise<FoodSearchResult> {
    const { query, barcode, source = 'all', limit = 25, offset = 0, includeCustom = true } = options;

    // Barcode search - direct lookup
    if (barcode) {
      return this.searchByBarcode(barcode);
    }

    if (!query) {
      return { foods: [], source: 'none', totalCount: 0, cached: false };
    }

    // Try local cache first
    const cached = await this.searchLocalCache(query, limit, offset);
    if (cached.foods.length >= limit) {
      return { ...cached, cached: true };
    }

    // Search external APIs based on source preference
    let results: Food[] = [...cached.foods];

    if (source === 'all' || source === 'usda') {
      const usdaResults = await this.searchUSDA(query, limit);
      results = this.mergeResults(results, usdaResults);
    }

    if (source === 'all' || source === 'openfoodfacts') {
      const offResults = await this.searchOpenFoodFacts(query, limit);
      results = this.mergeResults(results, offResults);
    }

    if ((source === 'all' || source === 'fatsecret') && FATSECRET_KEY) {
      const fsResults = await this.searchFatSecret(query, limit);
      results = this.mergeResults(results, fsResults);
    }

    // Include user's custom foods if requested
    if (includeCustom && userId) {
      const customFoods = await this.searchUserCustomFoods(userId, query, 10);
      // Convert custom foods to Food format and prepend
      const customAsFoods = customFoods.map(cf => this.customFoodToFood(cf));
      results = [...customAsFoods, ...results];
    }

    // Limit and deduplicate
    const deduplicated = this.deduplicateFoods(results);
    const limited = deduplicated.slice(0, limit);

    return {
      foods: limited,
      source: 'mixed',
      totalCount: deduplicated.length,
      cached: false,
    };
  }

  // ============================================
  // Barcode Search
  // ============================================

  async searchByBarcode(barcode: string): Promise<FoodSearchResult> {
    // Check local cache first
    const cached = await db.queryOne<any>(
      `SELECT * FROM foods WHERE barcode = $1`,
      [barcode]
    );

    if (cached) {
      return {
        foods: [this.mapFoodRow(cached)],
        source: 'cache',
        totalCount: 1,
        cached: true,
      };
    }

    // Try Open Food Facts (best for barcodes)
    try {
      const response = await fetch(`${OFF_BASE_URL}/product/${barcode}.json`);
      if (response.ok) {
        const data = await response.json() as { status: number; product?: Record<string, unknown> };
        if (data.status === 1 && data.product) {
          const food = this.parseOpenFoodFactsProduct(data.product, barcode);
          // Cache it
          await this.cacheFood(food);
          return {
            foods: [food],
            source: 'openfoodfacts',
            totalCount: 1,
            cached: false,
          };
        }
      }
    } catch (error) {
      log.warn({ barcode, error }, 'Open Food Facts barcode lookup failed');
    }

    return { foods: [], source: 'none', totalCount: 0, cached: false };
  }

  // ============================================
  // Local Cache Search
  // ============================================

  private async searchLocalCache(query: string, limit: number, offset: number): Promise<FoodSearchResult> {
    const rows = await db.queryAll<any>(`
      SELECT *, ts_rank(to_tsvector('english', name || ' ' || COALESCE(brand, '')), plainto_tsquery($1)) as rank
      FROM foods
      WHERE to_tsvector('english', name || ' ' || COALESCE(brand, '')) @@ plainto_tsquery($1)
      ORDER BY popularity_score DESC, rank DESC
      LIMIT $2 OFFSET $3
    `, [query, limit, offset]);

    return {
      foods: rows.map(this.mapFoodRow),
      source: 'cache',
      totalCount: rows.length,
      cached: true,
    };
  }

  // ============================================
  // USDA FoodData Central
  // ============================================

  private async searchUSDA(query: string, limit: number): Promise<Food[]> {
    try {
      const response = await fetch(`${USDA_BASE_URL}/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=${limit}&dataType=Foundation,SR%20Legacy,Branded`);

      if (!response.ok) {
        log.warn({ status: response.status }, 'USDA API error');
        return [];
      }

      const data = (await response.json()) as { foods?: any[] };
      const foods: Food[] = [];

      for (const item of (data.foods ?? [])) {
        const food = this.parseUSDAFood(item);
        if (food) {
          foods.push(food);
          // Cache async (don't wait)
          this.cacheFood(food).catch(() => {});
        }
      }

      return foods;
    } catch (error) {
      log.warn({ error }, 'USDA search failed');
      return [];
    }
  }

  private parseUSDAFood(item: any): Food | null {
    if (!item.fdcId || !item.description) return null;

    // Extract nutrients
    const getNutrient = (nutrients: any[], id: number): number => {
      const n = nutrients?.find((n: any) => n.nutrientId === id);
      return n?.value ?? 0;
    };

    const nutrients = item.foodNutrients || [];

    return {
      id: '', // Will be assigned on cache
      source: 'usda',
      externalId: String(item.fdcId),
      barcode: item.gtinUpc || undefined,
      name: item.description,
      brand: item.brandOwner || item.brandName || undefined,
      description: item.additionalDescriptions || undefined,
      category: item.foodCategory || undefined,
      servingSizeG: item.servingSize || 100,
      servingUnit: item.servingSizeUnit || 'g',
      servingDescription: item.householdServingFullText || '100g',
      calories: Math.round(getNutrient(nutrients, 1008)), // Energy
      proteinG: getNutrient(nutrients, 1003),
      carbsG: getNutrient(nutrients, 1005),
      fatG: getNutrient(nutrients, 1004),
      fiberG: getNutrient(nutrients, 1079),
      sugarG: getNutrient(nutrients, 2000),
      saturatedFatG: getNutrient(nutrients, 1258),
      sodiumMg: getNutrient(nutrients, 1093),
      micronutrients: this.extractUSDAMicronutrients(nutrients),
      aminoAcids: {},
      verified: true,
      popularityScore: 0,
      imageUrl: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private extractUSDAMicronutrients(nutrients: any[]): Record<string, number> {
    const micronutrientIds: Record<number, string> = {
      1087: 'calcium_mg',
      1089: 'iron_mg',
      1090: 'magnesium_mg',
      1091: 'phosphorus_mg',
      1092: 'potassium_mg',
      1095: 'zinc_mg',
      1098: 'copper_mg',
      1103: 'selenium_mcg',
      1106: 'vitamin_a_iu',
      1109: 'vitamin_e_mg',
      1114: 'vitamin_d_iu',
      1162: 'vitamin_c_mg',
      1165: 'thiamin_mg',
      1166: 'riboflavin_mg',
      1167: 'niacin_mg',
      1175: 'vitamin_b6_mg',
      1177: 'folate_mcg',
      1178: 'vitamin_b12_mcg',
      1185: 'vitamin_k_mcg',
    };

    const result: Record<string, number> = {};
    for (const nutrient of nutrients) {
      const key = micronutrientIds[nutrient.nutrientId];
      if (key && nutrient.value) {
        result[key] = nutrient.value;
      }
    }
    return result;
  }

  // ============================================
  // Open Food Facts
  // ============================================

  private async searchOpenFoodFacts(query: string, limit: number): Promise<Food[]> {
    try {
      const response = await fetch(
        `${OFF_BASE_URL}/search?search_terms=${encodeURIComponent(query)}&page_size=${limit}&json=true&fields=code,product_name,brands,nutriments,serving_size,image_url,categories`
      );

      if (!response.ok) {
        log.warn({ status: response.status }, 'Open Food Facts API error');
        return [];
      }

      const data = (await response.json()) as { products?: any[] };
      const foods: Food[] = [];

      for (const product of (data.products ?? [])) {
        const food = this.parseOpenFoodFactsProduct(product);
        if (food) {
          foods.push(food);
          this.cacheFood(food).catch(() => {});
        }
      }

      return foods;
    } catch (error) {
      log.warn({ error }, 'Open Food Facts search failed');
      return [];
    }
  }

  private parseOpenFoodFactsProduct(product: any, barcode?: string): Food | null {
    if (!product.product_name) return null;

    const n = product.nutriments || {};

    // Parse serving size (e.g., "30g" -> 30)
    let servingSizeG = 100;
    if (product.serving_size) {
      const match = product.serving_size.match(/(\d+(?:\.\d+)?)/);
      if (match) servingSizeG = parseFloat(match[1]);
    }

    return {
      id: '',
      source: 'openfoodfacts',
      externalId: product.code || barcode,
      barcode: product.code || barcode,
      name: product.product_name,
      brand: product.brands || undefined,
      description: undefined,
      category: product.categories || undefined,
      servingSizeG,
      servingUnit: 'g',
      servingDescription: product.serving_size || '100g',
      calories: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
      proteinG: n.proteins_100g || n.proteins || 0,
      carbsG: n.carbohydrates_100g || n.carbohydrates || 0,
      fatG: n.fat_100g || n.fat || 0,
      fiberG: n.fiber_100g || n.fiber || 0,
      sugarG: n.sugars_100g || n.sugars || 0,
      saturatedFatG: n['saturated-fat_100g'] || 0,
      sodiumMg: (n.sodium_100g || 0) * 1000, // Convert to mg
      micronutrients: {},
      aminoAcids: {},
      verified: false,
      popularityScore: 0,
      imageUrl: product.image_url || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // ============================================
  // FatSecret (if configured)
  // ============================================

  private async searchFatSecret(query: string, limit: number): Promise<Food[]> {
    if (!FATSECRET_KEY || !FATSECRET_SECRET) {
      return [];
    }

    // FatSecret requires OAuth 1.0a - simplified implementation
    // In production, use a proper OAuth library
    try {
      // This is a placeholder - actual implementation requires OAuth signing
      log.debug('FatSecret search not fully implemented');
      return [];
    } catch (error) {
      log.warn({ error }, 'FatSecret search failed');
      return [];
    }
  }

  // ============================================
  // Custom Foods
  // ============================================

  async searchUserCustomFoods(userId: string, query: string, limit: number): Promise<CustomFood[]> {
    const rows = await db.queryAll<any>(`
      SELECT * FROM custom_foods
      WHERE user_id = $1
        AND (name ILIKE $2 OR brand ILIKE $2)
      ORDER BY use_count DESC
      LIMIT $3
    `, [userId, `%${query}%`, limit]);

    return rows.map(this.mapCustomFoodRow);
  }

  async createCustomFood(userId: string, input: CreateCustomFoodInput): Promise<CustomFood> {
    const row = await db.queryOne<any>(`
      INSERT INTO custom_foods (
        user_id, name, brand, serving_size_g, serving_unit, serving_description,
        calories, protein_g, carbs_g, fat_g, fiber_g, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      userId,
      input.name,
      input.brand || null,
      input.servingSizeG,
      input.servingUnit || 'g',
      input.servingDescription || null,
      input.calories,
      input.proteinG || 0,
      input.carbsG || 0,
      input.fatG || 0,
      input.fiberG || 0,
      input.isPublic || false,
    ]);

    return this.mapCustomFoodRow(row);
  }

  async getCustomFood(id: string, userId: string): Promise<CustomFood | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM custom_foods WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return row ? this.mapCustomFoodRow(row) : null;
  }

  async getUserCustomFoods(userId: string, limit: number = 50): Promise<CustomFood[]> {
    const rows = await db.queryAll<any>(
      `SELECT * FROM custom_foods WHERE user_id = $1 ORDER BY use_count DESC, created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return rows.map(this.mapCustomFoodRow);
  }

  async deleteCustomFood(id: string, userId: string): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM custom_foods WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return true;
  }

  // ============================================
  // Food by ID
  // ============================================

  async getFoodById(id: string): Promise<Food | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM foods WHERE id = $1`,
      [id]
    );
    return row ? this.mapFoodRow(row) : null;
  }

  // ============================================
  // Frequent Foods
  // ============================================

  async getFrequentFoods(userId: string, limit: number = 20): Promise<Food[]> {
    const rows = await db.queryAll<any>(`
      SELECT f.* FROM user_frequent_foods uff
      JOIN foods f ON uff.food_id = f.id
      WHERE uff.user_id = $1 AND uff.food_id IS NOT NULL
      ORDER BY uff.use_count DESC, uff.last_used_at DESC
      LIMIT $2
    `, [userId, limit]);

    return rows.map(this.mapFoodRow);
  }

  async updateFoodUsage(userId: string, foodId: string): Promise<void> {
    await db.query(`
      INSERT INTO user_frequent_foods (user_id, food_id, use_count, last_used_at)
      VALUES ($1, $2, 1, NOW())
      ON CONFLICT (user_id, COALESCE(food_id, ''), COALESCE(custom_food_id, ''), COALESCE(recipe_id, ''))
      DO UPDATE SET
        use_count = user_frequent_foods.use_count + 1,
        last_used_at = NOW()
    `, [userId, foodId]);

    // Also update food popularity
    await db.query(
      `UPDATE foods SET popularity_score = popularity_score + 1 WHERE id = $1`,
      [foodId]
    );
  }

  // ============================================
  // Caching
  // ============================================

  private async cacheFood(food: Food): Promise<Food> {
    const row = await db.queryOne<any>(`
      INSERT INTO foods (
        source, external_id, barcode, name, brand, description, category,
        serving_size_g, serving_unit, serving_description,
        calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g,
        saturated_fat_g, sodium_mg, micronutrients, amino_acids,
        verified, image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT (source, external_id) DO UPDATE SET
        name = EXCLUDED.name,
        brand = EXCLUDED.brand,
        calories = EXCLUDED.calories,
        protein_g = EXCLUDED.protein_g,
        carbs_g = EXCLUDED.carbs_g,
        fat_g = EXCLUDED.fat_g,
        updated_at = NOW()
      RETURNING *
    `, [
      food.source,
      food.externalId,
      food.barcode || null,
      food.name,
      food.brand || null,
      food.description || null,
      food.category || null,
      food.servingSizeG || 100,
      food.servingUnit || 'g',
      food.servingDescription,
      food.calories,
      food.proteinG,
      food.carbsG,
      food.fatG,
      food.fiberG,
      food.sugarG,
      food.saturatedFatG,
      food.sodiumMg,
      JSON.stringify(food.micronutrients),
      JSON.stringify(food.aminoAcids),
      food.verified,
      food.imageUrl || null,
    ]);

    return this.mapFoodRow(row);
  }

  // ============================================
  // Helpers
  // ============================================

  private mergeResults(existing: Food[], newFoods: Food[]): Food[] {
    const seen = new Set(existing.map(f => `${f.source}:${f.externalId}`));
    const merged = [...existing];

    for (const food of newFoods) {
      const key = `${food.source}:${food.externalId}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(food);
      }
    }

    return merged;
  }

  private deduplicateFoods(foods: Food[]): Food[] {
    const seen = new Map<string, Food>();

    for (const food of foods) {
      // Prefer verified foods and those with more data
      const key = food.name.toLowerCase().replace(/\s+/g, ' ').trim();
      const existing = seen.get(key);

      if (!existing || (food.verified && !existing.verified) || (food.micronutrients && Object.keys(food.micronutrients).length > Object.keys(existing.micronutrients || {}).length)) {
        seen.set(key, food);
      }
    }

    return Array.from(seen.values());
  }

  private customFoodToFood(cf: CustomFood): Food {
    return {
      id: cf.id,
      source: 'user',
      externalId: cf.id,
      barcode: undefined,
      name: cf.name,
      brand: cf.brand,
      description: undefined,
      category: 'Custom',
      servingSizeG: cf.servingSizeG,
      servingUnit: cf.servingUnit,
      servingDescription: cf.servingDescription || '1 serving',
      calories: cf.calories,
      proteinG: cf.proteinG,
      carbsG: cf.carbsG,
      fatG: cf.fatG,
      fiberG: cf.fiberG,
      sugarG: 0,
      saturatedFatG: 0,
      sodiumMg: 0,
      micronutrients: {},
      aminoAcids: {},
      verified: false,
      popularityScore: cf.useCount,
      imageUrl: undefined,
      createdAt: cf.createdAt,
      updatedAt: cf.createdAt,
    };
  }

  private mapFoodRow(row: any): Food {
    return {
      id: row.id,
      source: row.source,
      externalId: row.external_id,
      barcode: row.barcode || undefined,
      name: row.name,
      brand: row.brand || undefined,
      description: row.description || undefined,
      category: row.category || undefined,
      servingSizeG: row.serving_size_g ? parseFloat(row.serving_size_g) : undefined,
      servingUnit: row.serving_unit || undefined,
      servingDescription: row.serving_description || '1 serving',
      calories: row.calories,
      proteinG: parseFloat(row.protein_g) || 0,
      carbsG: parseFloat(row.carbs_g) || 0,
      fatG: parseFloat(row.fat_g) || 0,
      fiberG: parseFloat(row.fiber_g) || 0,
      sugarG: parseFloat(row.sugar_g) || 0,
      saturatedFatG: parseFloat(row.saturated_fat_g) || 0,
      sodiumMg: parseFloat(row.sodium_mg) || 0,
      micronutrients: row.micronutrients || {},
      aminoAcids: row.amino_acids || {},
      verified: row.verified,
      popularityScore: row.popularity_score,
      imageUrl: row.image_url || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapCustomFoodRow(row: any): CustomFood {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      brand: row.brand || undefined,
      servingSizeG: parseFloat(row.serving_size_g),
      servingUnit: row.serving_unit || undefined,
      servingDescription: row.serving_description || undefined,
      calories: row.calories,
      proteinG: parseFloat(row.protein_g) || 0,
      carbsG: parseFloat(row.carbs_g) || 0,
      fatG: parseFloat(row.fat_g) || 0,
      fiberG: parseFloat(row.fiber_g) || 0,
      isPublic: row.is_public,
      useCount: row.use_count,
      createdAt: new Date(row.created_at),
    };
  }
}

export const foodSearchService = new FoodSearchService();
