/**
 * Nutrition Module Types
 */

// ============================================
// User Preferences
// ============================================

export interface NutritionPreferences {
  id: string;
  userId: string;
  enabled: boolean;
  enabledAt?: Date;
  disabledAt?: Date;
  trackingMode: 'calories' | 'macros' | 'detailed';
  showOnDashboard: boolean;
  showInCommunity: boolean;
  shareWithCrew: boolean;
  goalType: 'lose' | 'maintain' | 'gain' | 'custom';
  customCalories?: number;
  customProteinG?: number;
  customCarbsG?: number;
  customFatG?: number;
  syncWithArchetype: boolean;
  syncWithWorkouts: boolean;
  syncWithRecovery: boolean;
  dataRetention: 'keep' | 'delete';
  dietaryRestrictions: string[];
  allergens: string[];
  excludedIngredients: string[];
  waterTrackingEnabled: boolean;
  dailyWaterGoalMl: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateNutritionPreferencesInput {
  enabled?: boolean;
  trackingMode?: 'calories' | 'macros' | 'detailed';
  showOnDashboard?: boolean;
  showInCommunity?: boolean;
  shareWithCrew?: boolean;
  goalType?: 'lose' | 'maintain' | 'gain' | 'custom';
  customCalories?: number;
  customProteinG?: number;
  customCarbsG?: number;
  customFatG?: number;
  syncWithArchetype?: boolean;
  syncWithWorkouts?: boolean;
  syncWithRecovery?: boolean;
  dataRetention?: 'keep' | 'delete';
  dietaryRestrictions?: string[];
  allergens?: string[];
  excludedIngredients?: string[];
  waterTrackingEnabled?: boolean;
  dailyWaterGoalMl?: number;
}

// ============================================
// Nutrition Goals
// ============================================

export interface NutritionGoals {
  id: string;
  userId: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  workoutDayCalories: number;
  workoutDayProteinG: number;
  workoutDayCarbsG: number;
  tdee: number;
  bmr: number;
  activityMultiplier: number;
  goalAdjustment: number;
  weightKg?: number;
  heightCm?: number;
  age?: number;
  sex?: string;
  activityLevel?: string;
  archetype?: string;
  archetypeModifier?: ArchetypeModifier;
  calculatedAt: Date;
  validUntil: Date;
  confidenceScore: number;
}

export interface ArchetypeModifier {
  proteinMultiplier: number;
  calorieAdjustment: number;
  priorityNutrients: string[];
}

export interface CalculateGoalsInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goalType: 'lose' | 'maintain' | 'gain';
  goalIntensity?: 'slow' | 'moderate' | 'aggressive'; // For lose/gain
  archetype?: string;
}

// ============================================
// Foods
// ============================================

export interface Food {
  id: string;
  source: 'usda' | 'openfoodfacts' | 'fatsecret' | 'custom' | 'user';
  externalId?: string;
  barcode?: string;
  name: string;
  brand?: string;
  description?: string;
  category?: string;
  servingSizeG?: number;
  servingUnit?: string;
  servingDescription: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  saturatedFatG: number;
  sodiumMg: number;
  micronutrients: Record<string, number>;
  aminoAcids: Record<string, number>;
  verified: boolean;
  popularityScore: number;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomFood {
  id: string;
  userId: string;
  name: string;
  brand?: string;
  servingSizeG: number;
  servingUnit?: string;
  servingDescription?: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  isPublic: boolean;
  useCount: number;
  createdAt: Date;
}

export interface CreateCustomFoodInput {
  name: string;
  brand?: string;
  servingSizeG: number;
  servingUnit?: string;
  servingDescription?: string;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  isPublic?: boolean;
}

export interface FoodSearchResult {
  foods: Food[];
  source: string;
  totalCount: number;
  cached: boolean;
}

export interface FoodSearchOptions {
  query?: string;
  barcode?: string;
  source?: 'usda' | 'openfoodfacts' | 'fatsecret' | 'all';
  limit?: number;
  offset?: number;
  includeCustom?: boolean;
}

// ============================================
// Meal Logs
// ============================================

export type MealType = 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'evening_snack';
export type LoggedVia = 'manual' | 'barcode' | 'photo' | 'voice' | 'quick' | 'meal_plan';

export interface MealLog {
  id: string;
  userId: string;
  loggedAt: Date;
  mealDate: Date;
  mealType: MealType;
  foodId?: string;
  customFoodId?: string;
  recipeId?: string;
  quickEntryName?: string;
  servings: number;
  grams?: number;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFiberG: number;
  notes?: string;
  photoUrl?: string;
  workoutId?: string;
  isPostWorkout: boolean;
  loggedVia: LoggedVia;
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  food?: Food;
  customFood?: CustomFood;
  recipe?: Recipe;
}

export interface CreateMealLogInput {
  mealDate?: string; // ISO date, defaults to today
  mealType: MealType;
  foodId?: string;
  customFoodId?: string;
  recipeId?: string;
  quickEntryName?: string;
  quickEntryCalories?: number;
  quickEntryProteinG?: number;
  quickEntryCarbsG?: number;
  quickEntryFatG?: number;
  servings?: number;
  grams?: number;
  notes?: string;
  photoUrl?: string;
  workoutId?: string;
  isPostWorkout?: boolean;
  loggedVia?: LoggedVia;
}

export interface UpdateMealLogInput {
  mealType?: MealType;
  servings?: number;
  grams?: number;
  notes?: string;
  photoUrl?: string;
}

// ============================================
// Daily Summary
// ============================================

export interface DailyNutritionSummary {
  id: string;
  userId: string;
  summaryDate: Date;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFiberG: number;
  goalCalories?: number;
  goalProteinG?: number;
  goalCarbsG?: number;
  goalFatG?: number;
  wasWorkoutDay: boolean;
  workoutTu: number;
  caloriesBurned: number;
  mealCount: number;
  mealsLogged: Record<MealType, boolean>;
  calorieAdherence?: number;
  proteinAdherence?: number;
  macroAdherence?: number;
  overallScore?: number;
  waterMl: number;
  waterGoalMl?: number;
  updatedAt: Date;
}

export interface DailySummaryWithMeals extends DailyNutritionSummary {
  meals: MealLog[];
  remaining: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
}

// ============================================
// Recipes
// ============================================

export interface RecipeIngredient {
  foodId?: string;
  customFoodId?: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}

export interface RecipeStep {
  order: number;
  instruction: string;
  durationMin?: number;
  tip?: string;
  imageUrl?: string;
}

export interface Recipe {
  id: string;
  authorId: string;
  name: string;
  description?: string;
  slug?: string;
  servings: number;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  fiberPerServing: number;
  prepTimeMin?: number;
  cookTimeMin?: number;
  totalTimeMin?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tips?: string;
  cuisine?: string;
  dietaryTags: string[];
  allergens: string[];
  mealTypes: string[];
  archetypeBonus?: string;
  muscleGroups: string[];
  photoUrl?: string;
  videoUrl?: string;
  isPublic: boolean;
  rating: number;
  ratingCount: number;
  saveCount: number;
  viewCount: number;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  author?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  isSaved?: boolean;
  userRating?: number;
}

export interface CreateRecipeInput {
  name: string;
  description?: string;
  servings: number;
  prepTimeMin?: number;
  cookTimeMin?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tips?: string;
  cuisine?: string;
  dietaryTags?: string[];
  allergens?: string[];
  mealTypes?: string[];
  archetypeBonus?: string;
  muscleGroups?: string[];
  photoUrl?: string;
  videoUrl?: string;
  isPublic?: boolean;
}

export interface UpdateRecipeInput {
  name?: string;
  description?: string;
  servings?: number;
  prepTimeMin?: number;
  cookTimeMin?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  ingredients?: RecipeIngredient[];
  steps?: RecipeStep[];
  tips?: string;
  cuisine?: string;
  dietaryTags?: string[];
  allergens?: string[];
  mealTypes?: string[];
  archetypeBonus?: string;
  muscleGroups?: string[];
  photoUrl?: string;
  videoUrl?: string;
  isPublic?: boolean;
  status?: 'draft' | 'published' | 'archived';
}

export interface RecipeFilter {
  query?: string;
  authorId?: string;
  cuisine?: string;
  dietaryTags?: string[];
  difficulty?: string;
  maxPrepTime?: number;
  maxCalories?: number;
  minProtein?: number;
  archetypeBonus?: string;
  mealTypes?: string[];
  savedByUser?: boolean;
}

export interface RecipeSort {
  field: 'created_at' | 'rating' | 'save_count' | 'prep_time' | 'calories';
  direction: 'asc' | 'desc';
}

// ============================================
// Meal Plans
// ============================================

export interface MealPlan {
  id: string;
  userId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  dailyCalories?: number;
  dailyProteinG?: number;
  dailyCarbsG?: number;
  dailyFatG?: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  aiGenerated: boolean;
  templateId?: string;
  shoppingList: ShoppingListItem[];
  estimatedCost?: number;
  createdAt: Date;
  updatedAt: Date;
  // Computed
  items?: MealPlanItem[];
  progress?: {
    totalItems: number;
    completedItems: number;
    percentComplete: number;
  };
}

export interface MealPlanItem {
  id: string;
  mealPlanId: string;
  planDate: Date;
  mealType: MealType;
  recipeId?: string;
  foodId?: string;
  customDescription?: string;
  servings: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  completed: boolean;
  completedAt?: Date;
  completedMealLogId?: string;
  sortOrder: number;
  // Joined data
  recipe?: Recipe;
  food?: Food;
}

export interface ShoppingListItem {
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  checked: boolean;
  estimatedPrice?: number;
}

export interface CreateMealPlanInput {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  dailyCalories?: number;
  dailyProteinG?: number;
  dailyCarbsG?: number;
  dailyFatG?: number;
}

export interface GenerateMealPlanInput {
  startDate: string;
  days: number;
  dietaryRestrictions?: string[];
  excludeIngredients?: string[];
  cuisinePreferences?: string[];
  maxPrepTimePerMeal?: number;
  budgetLevel?: 'low' | 'medium' | 'high';
}

// ============================================
// Nutrition Streaks
// ============================================

export interface NutritionStreaks {
  userId: string;
  currentLoggingStreak: number;
  longestLoggingStreak: number;
  lastLoggedDate?: Date;
  currentGoalStreak: number;
  longestGoalStreak: number;
  lastGoalHitDate?: Date;
  currentProteinStreak: number;
  longestProteinStreak: number;
  totalMealsLogged: number;
  totalDaysLogged: number;
  totalCaloriesLogged: number;
  updatedAt: Date;
}

// ============================================
// Hydration
// ============================================

export interface HydrationLog {
  id: string;
  userId: string;
  logDate: Date;
  loggedAt: Date;
  amountMl: number;
  beverageType: 'water' | 'coffee' | 'tea' | 'juice' | 'sports_drink' | 'other';
  notes?: string;
}

export interface CreateHydrationLogInput {
  logDate?: string;
  amountMl: number;
  beverageType?: 'water' | 'coffee' | 'tea' | 'juice' | 'sports_drink' | 'other';
  notes?: string;
}

// ============================================
// Community
// ============================================

export interface NutritionPost {
  id: string;
  userId: string;
  postType: 'meal_share' | 'recipe_share' | 'milestone' | 'challenge_update';
  mealLogId?: string;
  recipeId?: string;
  caption?: string;
  photoUrl?: string;
  showMacros: boolean;
  showCalories: boolean;
  isPostWorkout: boolean;
  workoutId?: string;
  musclesWorked: string[];
  propCount: number;
  commentCount: number;
  saveCount: number;
  visibility: 'public' | 'crew' | 'friends' | 'private';
  createdAt: Date;
  // Joined data
  user?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  mealLog?: MealLog;
  recipe?: Recipe;
}

// ============================================
// Archetype Nutrition Profile
// ============================================

export interface ArchetypeNutritionProfile {
  archetype: string;
  name: string;
  description?: string;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  proteinMultiplier: number;
  calorieAdjustment: number;
  priorityNutrients: string[];
  mealTiming: 'standard' | 'around_training' | 'frequent_small' | 'intermittent';
  suggestedFoods: string[];
  avoidFoods: string[];
  tips: string[];
}

// ============================================
// Workout Integration
// ============================================

export interface WorkoutNutritionAdjustment {
  calorieAdjustment: number;
  proteinAdjustment: number;
  carbsAdjustment: number;
  musclesTrained: string[];
  tuBurned: number;
  postWorkoutSuggestion?: {
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    timing: string;
    suggestions: string[];
  };
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  cursor?: string;
}

export interface NutritionDashboard {
  enabled: boolean;
  preferences: NutritionPreferences;
  goals: NutritionGoals | null;
  todaySummary: DailySummaryWithMeals | null;
  streaks: NutritionStreaks | null;
  recentMeals: MealLog[];
  archetypeProfile: ArchetypeNutritionProfile | null;
}
