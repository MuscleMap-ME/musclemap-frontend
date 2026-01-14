/**
 * Nutrition Goals Service
 *
 * Wrapper service for goal-related operations
 * Re-exports from macro-calculator for consistency
 */

import { macroCalculatorService } from './macro-calculator.service';
import type { NutritionGoals, CalculateGoalsInput } from './types';

export class NutritionGoalsService {
  async getGoals(userId: string): Promise<NutritionGoals | null> {
    return macroCalculatorService.getGoals(userId);
  }

  async calculateGoals(userId: string, input: CalculateGoalsInput): Promise<NutritionGoals> {
    return macroCalculatorService.calculateAndSaveGoals(userId, input);
  }

  async adjustForWorkout(
    userId: string,
    tuBurned: number,
    musclesTrained: string[]
  ): Promise<{ calorieAdjustment: number; proteinAdjustment: number }> {
    return macroCalculatorService.adjustForWorkout(userId, tuBurned, musclesTrained);
  }
}

export const nutritionGoalsService = new NutritionGoalsService();
