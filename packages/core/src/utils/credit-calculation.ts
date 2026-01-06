/**
 * Credit Calculation Utilities
 *
 * Shared logic for calculating credit costs, bonuses, and transactions.
 */

import { CREDITS_PER_DOLLAR, DEFAULT_WORKOUT_COST, PRICING_TIERS, MINIMUM_PURCHASE_CENTS } from '../constants';

export interface CreditTransaction {
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  balanceAfter: number;
}

/**
 * Calculate credits for a given dollar amount.
 */
export function dollarsToCredits(dollars: number): number {
  return Math.floor(dollars * CREDITS_PER_DOLLAR);
}

/**
 * Calculate dollar amount for given credits.
 */
export function creditsToDollars(credits: number): number {
  return credits / CREDITS_PER_DOLLAR;
}

/**
 * Get the best pricing tier for a given amount in cents.
 */
export function getBestTier(amountCents: number): {
  tierId: string;
  credits: number;
  bonusPercentage: number;
} | null {
  // Find the matching tier
  const tier = PRICING_TIERS.find((t) => t.priceCents === amountCents);

  if (!tier) {
    return null;
  }

  const baseCredits = amountCents; // 1 cent = 1 credit base
  const bonusCredits = tier.credits - baseCredits;
  const bonusPercentage = (bonusCredits / baseCredits) * 100;

  return {
    tierId: tier.id,
    credits: tier.credits,
    bonusPercentage: Math.round(bonusPercentage * 10) / 10,
  };
}

/**
 * Validate a purchase amount.
 */
export function validatePurchaseAmount(amountCents: number): {
  valid: boolean;
  error?: string;
} {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    return { valid: false, error: 'Invalid amount' };
  }

  if (amountCents < MINIMUM_PURCHASE_CENTS) {
    return {
      valid: false,
      error: `Minimum purchase is $${MINIMUM_PURCHASE_CENTS / 100}`,
    };
  }

  // Check if it matches a valid tier
  const tier = PRICING_TIERS.find((t) => t.priceCents === amountCents);
  if (!tier) {
    return {
      valid: false,
      error: 'Amount does not match a valid pricing tier',
    };
  }

  return { valid: true };
}

/**
 * Check if user has enough credits for an action.
 */
export function hasEnoughCredits(balance: number, cost: number): boolean {
  return balance >= cost;
}

/**
 * Calculate workout credit cost based on complexity.
 */
export function calculateWorkoutCost(
  exerciseCount: number,
  options: {
    baseCost?: number;
    perExerciseCost?: number;
    maxCost?: number;
  } = {}
): number {
  const {
    baseCost = DEFAULT_WORKOUT_COST,
    perExerciseCost = 5,
    maxCost = 100,
  } = options;

  const totalCost = baseCost + (exerciseCount * perExerciseCost);
  return Math.min(totalCost, maxCost);
}

/**
 * Format credits for display.
 */
export function formatCredits(credits: number): string {
  if (credits >= 1000) {
    return `${(credits / 1000).toFixed(1)}k`;
  }
  return credits.toString();
}

/**
 * Format dollar amount for display.
 */
export function formatDollars(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}

/**
 * Calculate the value proposition text for a tier.
 */
export function getTierValueText(tierId: string): string | null {
  const tier = PRICING_TIERS.find((t) => t.id === tierId);
  if (!tier) return null;

  const baseCredits = tier.priceCents;
  const bonusCredits = tier.credits - baseCredits;

  if (bonusCredits <= 0) {
    return 'Standard rate';
  }

  const bonusPercentage = Math.round((bonusCredits / baseCredits) * 100);
  return `+${bonusPercentage}% bonus`;
}
