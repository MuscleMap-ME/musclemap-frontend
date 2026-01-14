/**
 * Macro Calculator Service
 *
 * Calculates TDEE, BMR, and macro targets based on user metrics
 */

import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import type {
  NutritionGoals,
  CalculateGoalsInput,
  ArchetypeNutritionProfile,
} from './types';
import { nutritionService } from './nutrition.service';

const log = loggers.api;

export class MacroCalculatorService {
  // Activity multipliers for TDEE calculation
  private readonly activityMultipliers = {
    sedentary: 1.2,      // Little or no exercise
    light: 1.375,        // Light exercise 1-3 days/week
    moderate: 1.55,      // Moderate exercise 3-5 days/week
    active: 1.725,       // Hard exercise 6-7 days/week
    very_active: 1.9,    // Very hard exercise, physical job
  };

  // Goal adjustments (calories per day)
  private readonly goalAdjustments = {
    lose: {
      slow: -250,        // ~0.5 lb/week
      moderate: -500,    // ~1 lb/week
      aggressive: -750,  // ~1.5 lb/week
    },
    maintain: 0,
    gain: {
      slow: 250,         // ~0.5 lb/week
      moderate: 500,     // ~1 lb/week
      aggressive: 750,   // ~1.5 lb/week (more fat gain risk)
    },
  };

  // Default macro splits (percentage of calories)
  private readonly defaultMacroSplit = {
    protein: 0.30,  // 30%
    carbs: 0.40,    // 40%
    fat: 0.30,      // 30%
  };

  // Protein per kg bodyweight targets
  private readonly proteinTargets = {
    sedentary: 1.2,      // g/kg
    light: 1.4,
    moderate: 1.6,
    active: 1.8,
    very_active: 2.0,
  };

  /**
   * Calculate BMR using Mifflin-St Jeor equation (most accurate)
   */
  calculateBMR(
    weightKg: number,
    heightCm: number,
    age: number,
    sex: 'male' | 'female' | 'other'
  ): number {
    // Mifflin-St Jeor Equation
    // Men: BMR = 10W + 6.25H - 5A + 5
    // Women: BMR = 10W + 6.25H - 5A - 161

    const baseBMR = 10 * weightKg + 6.25 * heightCm - 5 * age;

    if (sex === 'male') {
      return Math.round(baseBMR + 5);
    } else if (sex === 'female') {
      return Math.round(baseBMR - 161);
    } else {
      // Average for 'other'
      return Math.round(baseBMR - 78);
    }
  }

  /**
   * Calculate TDEE (Total Daily Energy Expenditure)
   */
  calculateTDEE(bmr: number, activityLevel: keyof typeof this.activityMultipliers): number {
    const multiplier = this.activityMultipliers[activityLevel];
    return Math.round(bmr * multiplier);
  }

  /**
   * Calculate target calories based on goal
   */
  calculateTargetCalories(
    tdee: number,
    goalType: 'lose' | 'maintain' | 'gain',
    intensity: 'slow' | 'moderate' | 'aggressive' = 'moderate'
  ): number {
    if (goalType === 'maintain') {
      return tdee;
    }

    const adjustment = this.goalAdjustments[goalType][intensity];
    return tdee + adjustment;
  }

  /**
   * Calculate macro targets from calories
   */
  calculateMacros(
    calories: number,
    weightKg: number,
    activityLevel: keyof typeof this.activityMultipliers,
    archetypeProfile?: ArchetypeNutritionProfile | null
  ): { proteinG: number; carbsG: number; fatG: number } {
    // Use archetype profile splits if available, otherwise defaults
    const splits = archetypeProfile
      ? {
          protein: archetypeProfile.proteinPct,
          carbs: archetypeProfile.carbsPct,
          fat: archetypeProfile.fatPct,
        }
      : this.defaultMacroSplit;

    // Calculate protein based on bodyweight (prioritize this)
    const proteinTarget = this.proteinTargets[activityLevel];
    const proteinMultiplier = archetypeProfile?.proteinMultiplier ?? 1.0;
    const proteinG = Math.round(weightKg * proteinTarget * proteinMultiplier);
    const proteinCalories = proteinG * 4;

    // Distribute remaining calories between carbs and fat
    const remainingCalories = calories - proteinCalories;
    const carbRatio = splits.carbs / (splits.carbs + splits.fat);

    const carbsCalories = Math.round(remainingCalories * carbRatio);
    const fatCalories = remainingCalories - carbsCalories;

    return {
      proteinG,
      carbsG: Math.round(carbsCalories / 4),
      fatG: Math.round(fatCalories / 9),
    };
  }

  /**
   * Calculate workout day bonuses
   */
  calculateWorkoutDayBonus(
    baseCalories: number,
    baseProtein: number,
    baseCarbs: number,
    activityLevel: keyof typeof this.activityMultipliers
  ): { calories: number; proteinG: number; carbsG: number } {
    // On workout days, add extra calories (mostly carbs for performance)
    const calorieBonus = {
      sedentary: 150,
      light: 200,
      moderate: 300,
      active: 400,
      very_active: 500,
    };

    const bonus = calorieBonus[activityLevel];

    return {
      calories: baseCalories + bonus,
      proteinG: baseProtein + 20, // Extra protein for recovery
      carbsG: baseCarbs + Math.round((bonus - 80) / 4), // Most extra calories from carbs
    };
  }

  /**
   * Calculate and save nutrition goals for a user
   */
  async calculateAndSaveGoals(
    userId: string,
    input: CalculateGoalsInput
  ): Promise<NutritionGoals> {
    const { weightKg, heightCm, age, sex, activityLevel, goalType, goalIntensity, archetype } = input;

    // Get archetype profile if specified
    let archetypeProfile: ArchetypeNutritionProfile | null = null;
    if (archetype) {
      archetypeProfile = await nutritionService.getArchetypeProfile(archetype);
    }

    // Calculate BMR and TDEE
    const bmr = this.calculateBMR(weightKg, heightCm, age, sex);
    const tdee = this.calculateTDEE(bmr, activityLevel);

    // Apply archetype calorie adjustment
    const archetypeCalorieAdjustment = archetypeProfile?.calorieAdjustment ?? 0;
    const adjustedTdee = tdee + archetypeCalorieAdjustment;

    // Calculate target calories
    const targetCalories = this.calculateTargetCalories(adjustedTdee, goalType, goalIntensity);

    // Calculate macros
    const { proteinG, carbsG, fatG } = this.calculateMacros(
      targetCalories,
      weightKg,
      activityLevel,
      archetypeProfile
    );

    // Calculate workout day bonuses
    const workoutDay = this.calculateWorkoutDayBonus(
      targetCalories,
      proteinG,
      carbsG,
      activityLevel
    );

    // Calculate goal adjustment (difference from TDEE)
    const goalAdjustment = targetCalories - tdee;

    // Valid for 1 week (then should be recalculated based on progress)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    // Save to database
    const row = await db.queryOne<any>(`
      INSERT INTO nutrition_goals (
        user_id, calories, protein_g, carbs_g, fat_g, fiber_g,
        workout_day_calories, workout_day_protein_g, workout_day_carbs_g,
        tdee, bmr, activity_multiplier, goal_adjustment,
        weight_kg, height_cm, age, sex, activity_level,
        archetype, archetype_modifier, valid_until
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21
      )
      ON CONFLICT (user_id) DO UPDATE SET
        calories = EXCLUDED.calories,
        protein_g = EXCLUDED.protein_g,
        carbs_g = EXCLUDED.carbs_g,
        fat_g = EXCLUDED.fat_g,
        fiber_g = EXCLUDED.fiber_g,
        workout_day_calories = EXCLUDED.workout_day_calories,
        workout_day_protein_g = EXCLUDED.workout_day_protein_g,
        workout_day_carbs_g = EXCLUDED.workout_day_carbs_g,
        tdee = EXCLUDED.tdee,
        bmr = EXCLUDED.bmr,
        activity_multiplier = EXCLUDED.activity_multiplier,
        goal_adjustment = EXCLUDED.goal_adjustment,
        weight_kg = EXCLUDED.weight_kg,
        height_cm = EXCLUDED.height_cm,
        age = EXCLUDED.age,
        sex = EXCLUDED.sex,
        activity_level = EXCLUDED.activity_level,
        archetype = EXCLUDED.archetype,
        archetype_modifier = EXCLUDED.archetype_modifier,
        calculated_at = NOW(),
        valid_until = EXCLUDED.valid_until
      RETURNING *
    `, [
      userId,
      targetCalories,
      proteinG,
      carbsG,
      fatG,
      25, // Default fiber goal
      workoutDay.calories,
      workoutDay.proteinG,
      workoutDay.carbsG,
      tdee,
      bmr,
      this.activityMultipliers[activityLevel],
      goalAdjustment,
      weightKg,
      heightCm,
      age,
      sex,
      activityLevel,
      archetype,
      archetypeProfile ? JSON.stringify({
        proteinMultiplier: archetypeProfile.proteinMultiplier,
        calorieAdjustment: archetypeProfile.calorieAdjustment,
        priorityNutrients: archetypeProfile.priorityNutrients,
      }) : null,
      validUntil.toISOString(),
    ]);

    log.info({ userId, calories: targetCalories, proteinG, carbsG, fatG }, 'Calculated nutrition goals');

    return this.mapGoalsRow(row);
  }

  /**
   * Get current goals for a user
   */
  async getGoals(userId: string): Promise<NutritionGoals | null> {
    const row = await db.queryOne<any>(
      `SELECT * FROM nutrition_goals WHERE user_id = $1`,
      [userId]
    );

    return row ? this.mapGoalsRow(row) : null;
  }

  /**
   * Adjust goals based on workout completion
   */
  async adjustForWorkout(
    userId: string,
    tuBurned: number,
    musclesTrained: string[]
  ): Promise<{ calorieAdjustment: number; proteinAdjustment: number }> {
    const goals = await this.getGoals(userId);
    if (!goals) {
      return { calorieAdjustment: 0, proteinAdjustment: 0 };
    }

    // Estimate calories burned (rough approximation: 1 TU ≈ 3-5 calories)
    const calorieAdjustment = Math.round(tuBurned * 4);

    // Extra protein based on muscle groups trained
    // Large muscle groups (legs, back) = more protein needed
    const largeMuscles = ['quadriceps', 'hamstrings', 'glutes', 'lats', 'chest'];
    const largeMuscleTrained = musclesTrained.filter(m =>
      largeMuscles.some(lm => m.toLowerCase().includes(lm))
    ).length;

    const proteinAdjustment = Math.round(largeMuscleTrained * 5 + musclesTrained.length * 2);

    return { calorieAdjustment, proteinAdjustment };
  }

  /**
   * Generate macro recommendations for a specific meal
   */
  generateMealMacros(
    totalGoals: NutritionGoals,
    remainingCalories: number,
    remainingProtein: number,
    mealType: string,
    isPostWorkout: boolean
  ): { calories: number; proteinG: number; carbsG: number; fatG: number } {
    // Meal distribution percentages
    const mealDistribution: Record<string, number> = {
      breakfast: 0.25,
      morning_snack: 0.10,
      lunch: 0.30,
      afternoon_snack: 0.10,
      dinner: 0.20,
      evening_snack: 0.05,
    };

    const basePct = mealDistribution[mealType] || 0.20;

    // Post-workout meals should be higher in protein and carbs
    if (isPostWorkout) {
      const targetCalories = Math.min(remainingCalories, Math.round(totalGoals.calories * 0.25));
      const targetProtein = Math.min(remainingProtein, Math.round(totalGoals.proteinG * 0.30));

      return {
        calories: targetCalories,
        proteinG: targetProtein,
        carbsG: Math.round((targetCalories - targetProtein * 4) * 0.7 / 4),
        fatG: Math.round((targetCalories - targetProtein * 4) * 0.3 / 9),
      };
    }

    // Regular meal
    const targetCalories = Math.min(remainingCalories, Math.round(totalGoals.calories * basePct));
    const targetProtein = Math.min(remainingProtein, Math.round(totalGoals.proteinG * basePct));

    return {
      calories: targetCalories,
      proteinG: targetProtein,
      carbsG: Math.round(totalGoals.carbsG * basePct),
      fatG: Math.round(totalGoals.fatG * basePct),
    };
  }

  private mapGoalsRow(row: any): NutritionGoals {
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
}

export const macroCalculatorService = new MacroCalculatorService();
