/**
 * Nutrition Module
 *
 * Comprehensive nutrition tracking system including:
 * - Food search with multi-source API integration
 * - Meal logging and daily summaries
 * - Macro/micronutrient tracking
 * - Recipe management
 * - Meal planning
 * - Workout-nutrition integration
 * - Community features
 */

export { NutritionService, nutritionService } from './nutrition.service';
export { FoodSearchService, foodSearchService } from './food-search.service';
export { MealLogService, mealLogService } from './meal-log.service';
export { MacroCalculatorService, macroCalculatorService } from './macro-calculator.service';
export { RecipeService, recipeService } from './recipe.service';
export { MealPlanService, mealPlanService } from './meal-plan.service';
export { NutritionGoalsService, nutritionGoalsService } from './nutrition-goals.service';

export * from './types';
