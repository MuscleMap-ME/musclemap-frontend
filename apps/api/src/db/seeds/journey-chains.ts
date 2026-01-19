/**
 * Journey Progression Chains Seed File
 *
 * This file exports the seed data for journey progression chains.
 * The actual seeding is done in migration 133_journey_progression_chains.ts
 *
 * Chains included:
 * - Weight Loss Chain: Lose 10 lbs -> Lose 20 lbs -> Lose 50 lbs -> Maintain Weight
 * - Muscle Building Chain: Gain 5 lbs -> Gain 10 lbs -> Gain 15 lbs -> Gain 30 lbs -> Maintain
 * - Strength Chain: Beginner -> Intermediate -> Advanced -> Elite
 * - Running Chain: Couch to 5K -> 10K -> Half Marathon -> Marathon
 * - Pull-up Chain: First Pull-up -> 10 Pull-ups -> 20 Pull-ups -> Weighted Pull-ups
 * - Push-up Chain: First Push-up -> 25 Push-ups -> 50 Push-ups -> 100 Push-ups
 * - Flexibility Chain: Touch Toes -> Front Splits -> Middle Splits -> Full Mobility Mastery
 * - Plank Chain: 60 Second Plank -> 5 Minute Plank
 * - Rehab to Fitness: From Couch -> Beginner Strength -> Couch to 5K
 *
 * Total estimated completion time for longest chains: 2-3 years
 */

export interface UnlockCriteria {
  completion_percentage?: number;
  min_milestones?: number;
  min_days_active?: number;
  custom_condition?: string;
}

export interface JourneyProgressionChainSeed {
  chain_name: string;
  chain_description: string;
  chain_order: number;
  source_journey_template_id: string;
  target_journey_template_id: string;
  unlock_criteria: UnlockCriteria;
  bonus_xp: number;
  bonus_credits?: number;
  unlock_achievement_key?: string;
  icon?: string;
  color?: string;
  is_featured?: boolean;
}

export interface ChainMetadata {
  name: string;
  displayName: string;
  description: string;
  stages: number;
  estimatedDuration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  icon: string;
  color: string;
}

// ============================================
// WEIGHT LOSS CHAIN
// Estimated duration: 18-24 months total
// ============================================
export const weightLossChain: JourneyProgressionChainSeed[] = [
  {
    chain_name: 'weight_loss_progression',
    chain_description: 'Progressive weight loss journey from 10 lbs to sustainable maintenance',
    chain_order: 0,
    source_journey_template_id: 'lose_10_lbs',
    target_journey_template_id: 'lose_20_lbs',
    unlock_criteria: { completion_percentage: 100, min_milestones: 3 },
    bonus_xp: 200,
    bonus_credits: 50,
    icon: '🏋️',
    color: '#4CAF50',
    is_featured: true,
  },
  {
    chain_name: 'weight_loss_progression',
    chain_description: 'Progressive weight loss journey from 10 lbs to sustainable maintenance',
    chain_order: 1,
    source_journey_template_id: 'lose_20_lbs',
    target_journey_template_id: 'lose_50_lbs',
    unlock_criteria: { completion_percentage: 100, min_milestones: 3 },
    bonus_xp: 300,
    bonus_credits: 75,
    icon: '🏋️',
    color: '#4CAF50',
  },
  {
    chain_name: 'weight_loss_progression',
    chain_description: 'Progressive weight loss journey from 10 lbs to sustainable maintenance',
    chain_order: 2,
    source_journey_template_id: 'lose_50_lbs',
    target_journey_template_id: 'maintain_weight_journey',
    unlock_criteria: { completion_percentage: 100, min_days_active: 180 },
    bonus_xp: 500,
    bonus_credits: 150,
    unlock_achievement_key: 'chain_complete',
    icon: '🏋️',
    color: '#4CAF50',
  },
];

// ============================================
// MUSCLE BUILDING CHAIN
// Estimated duration: 24-36 months total
// ============================================
export const muscleBuildingChain: JourneyProgressionChainSeed[] = [
  {
    chain_name: 'muscle_building_progression',
    chain_description: 'Progressive muscle gain from beginner to elite level',
    chain_order: 0,
    source_journey_template_id: 'gain_5_lbs_muscle',
    target_journey_template_id: 'gain_10_lbs_muscle',
    unlock_criteria: { completion_percentage: 100, min_days_active: 60 },
    bonus_xp: 200,
    bonus_credits: 50,
    icon: '💪',
    color: '#FF5722',
    is_featured: true,
  },
  {
    chain_name: 'muscle_building_progression',
    chain_description: 'Progressive muscle gain from beginner to elite level',
    chain_order: 1,
    source_journey_template_id: 'gain_10_lbs_muscle',
    target_journey_template_id: 'gain_15_lbs_muscle',
    unlock_criteria: { completion_percentage: 100, min_days_active: 120 },
    bonus_xp: 300,
    bonus_credits: 75,
    icon: '💪',
    color: '#FF5722',
  },
  {
    chain_name: 'muscle_building_progression',
    chain_description: 'Progressive muscle gain from beginner to elite level',
    chain_order: 2,
    source_journey_template_id: 'gain_15_lbs_muscle',
    target_journey_template_id: 'gain_30_lbs_muscle',
    unlock_criteria: { completion_percentage: 100, min_days_active: 180 },
    bonus_xp: 400,
    bonus_credits: 100,
    icon: '💪',
    color: '#FF5722',
  },
  {
    chain_name: 'muscle_building_progression',
    chain_description: 'Progressive muscle gain from beginner to elite level',
    chain_order: 3,
    source_journey_template_id: 'gain_30_lbs_muscle',
    target_journey_template_id: 'maintain_muscle',
    unlock_criteria: { completion_percentage: 100, min_days_active: 270 },
    bonus_xp: 600,
    bonus_credits: 175,
    unlock_achievement_key: 'chain_complete',
    icon: '💪',
    color: '#FF5722',
  },
];

// ============================================
// STRENGTH PROGRESSION CHAIN
// Estimated duration: 18-24 months total
// ============================================
export const strengthChain: JourneyProgressionChainSeed[] = [
  {
    chain_name: 'strength_progression',
    chain_description: 'Build strength from beginner to elite level',
    chain_order: 0,
    source_journey_template_id: 'beginner_strength',
    target_journey_template_id: 'intermediate_strength',
    unlock_criteria: { completion_percentage: 100, min_milestones: 3 },
    bonus_xp: 200,
    bonus_credits: 50,
    icon: '🔱',
    color: '#9C27B0',
    is_featured: true,
  },
  {
    chain_name: 'strength_progression',
    chain_description: 'Build strength from beginner to elite level',
    chain_order: 1,
    source_journey_template_id: 'intermediate_strength',
    target_journey_template_id: 'advanced_strength',
    unlock_criteria: { completion_percentage: 100, min_days_active: 90 },
    bonus_xp: 350,
    bonus_credits: 85,
    icon: '🔱',
    color: '#9C27B0',
  },
  {
    chain_name: 'strength_progression',
    chain_description: 'Build strength from beginner to elite level',
    chain_order: 2,
    source_journey_template_id: 'advanced_strength',
    target_journey_template_id: 'elite_strength',
    unlock_criteria: { completion_percentage: 100, min_days_active: 180 },
    bonus_xp: 600,
    bonus_credits: 175,
    unlock_achievement_key: 'chain_complete',
    icon: '🔱',
    color: '#9C27B0',
  },
];

// ============================================
// RUNNING CHAIN (Couch to Marathon)
// Estimated duration: 12-18 months total
// ============================================
export const runningChain: JourneyProgressionChainSeed[] = [
  {
    chain_name: 'running_progression',
    chain_description: 'From couch to marathon - the ultimate running journey',
    chain_order: 0,
    source_journey_template_id: 'couch_to_5k',
    target_journey_template_id: 'run_10k',
    unlock_criteria: { completion_percentage: 100, min_milestones: 4 },
    bonus_xp: 250,
    bonus_credits: 60,
    icon: '🏃',
    color: '#2196F3',
    is_featured: true,
  },
  {
    chain_name: 'running_progression',
    chain_description: 'From couch to marathon - the ultimate running journey',
    chain_order: 1,
    source_journey_template_id: 'run_10k',
    target_journey_template_id: 'run_half_marathon',
    unlock_criteria: { completion_percentage: 100, min_days_active: 60 },
    bonus_xp: 400,
    bonus_credits: 100,
    icon: '🏃',
    color: '#2196F3',
  },
  {
    chain_name: 'running_progression',
    chain_description: 'From couch to marathon - the ultimate running journey',
    chain_order: 2,
    source_journey_template_id: 'run_half_marathon',
    target_journey_template_id: 'run_marathon',
    unlock_criteria: { completion_percentage: 100, min_days_active: 90 },
    bonus_xp: 750,
    bonus_credits: 200,
    unlock_achievement_key: 'chain_complete',
    icon: '🏃',
    color: '#2196F3',
  },
];

// ============================================
// PULL-UP MASTERY CHAIN
// Estimated duration: 12-18 months total
// ============================================
export const pullUpChain: JourneyProgressionChainSeed[] = [
  {
    chain_name: 'pullup_progression',
    chain_description: 'Master the pull-up from zero to weighted',
    chain_order: 0,
    source_journey_template_id: 'first_pullup',
    target_journey_template_id: 'pullups_10',
    unlock_criteria: { completion_percentage: 100, min_milestones: 3 },
    bonus_xp: 200,
    bonus_credits: 50,
    icon: '🎯',
    color: '#E91E63',
    is_featured: true,
  },
  {
    chain_name: 'pullup_progression',
    chain_description: 'Master the pull-up from zero to weighted',
    chain_order: 1,
    source_journey_template_id: 'pullups_10',
    target_journey_template_id: 'pullups_20',
    unlock_criteria: { completion_percentage: 100, min_days_active: 60 },
    bonus_xp: 350,
    bonus_credits: 85,
    icon: '🎯',
    color: '#E91E63',
  },
  {
    chain_name: 'pullup_progression',
    chain_description: 'Master the pull-up from zero to weighted',
    chain_order: 2,
    source_journey_template_id: 'pullups_20',
    target_journey_template_id: 'weighted_pullups',
    unlock_criteria: { completion_percentage: 100, min_days_active: 90 },
    bonus_xp: 500,
    bonus_credits: 150,
    unlock_achievement_key: 'chain_complete',
    icon: '🎯',
    color: '#E91E63',
  },
];

// ============================================
// PUSH-UP MASTERY CHAIN
// Estimated duration: 9-15 months total
// ============================================
export const pushUpChain: JourneyProgressionChainSeed[] = [
  {
    chain_name: 'pushup_progression',
    chain_description: 'Master the push-up from first rep to 100',
    chain_order: 0,
    source_journey_template_id: 'first_pushup',
    target_journey_template_id: 'pushups_25',
    unlock_criteria: { completion_percentage: 100, min_milestones: 3 },
    bonus_xp: 150,
    bonus_credits: 40,
    icon: '✊',
    color: '#FF9800',
    is_featured: true,
  },
  {
    chain_name: 'pushup_progression',
    chain_description: 'Master the push-up from first rep to 100',
    chain_order: 1,
    source_journey_template_id: 'pushups_25',
    target_journey_template_id: 'pushups_50',
    unlock_criteria: { completion_percentage: 100, min_days_active: 45 },
    bonus_xp: 250,
    bonus_credits: 60,
    icon: '✊',
    color: '#FF9800',
  },
  {
    chain_name: 'pushup_progression',
    chain_description: 'Master the push-up from first rep to 100',
    chain_order: 2,
    source_journey_template_id: 'pushups_50',
    target_journey_template_id: 'pushups_100',
    unlock_criteria: { completion_percentage: 100, min_days_active: 60 },
    bonus_xp: 500,
    bonus_credits: 125,
    unlock_achievement_key: 'chain_complete',
    icon: '✊',
    color: '#FF9800',
  },
];

// ============================================
// FLEXIBILITY CHAIN
// Estimated duration: 12-18 months total
// ============================================
export const flexibilityChain: JourneyProgressionChainSeed[] = [
  {
    chain_name: 'flexibility_progression',
    chain_description: 'Develop full-body flexibility from basics to advanced',
    chain_order: 0,
    source_journey_template_id: 'touch_toes',
    target_journey_template_id: 'front_splits',
    unlock_criteria: { completion_percentage: 100, min_days_active: 30 },
    bonus_xp: 200,
    bonus_credits: 50,
    icon: '🧘',
    color: '#00BCD4',
    is_featured: true,
  },
  {
    chain_name: 'flexibility_progression',
    chain_description: 'Develop full-body flexibility from basics to advanced',
    chain_order: 1,
    source_journey_template_id: 'front_splits',
    target_journey_template_id: 'middle_splits',
    unlock_criteria: { completion_percentage: 100, min_days_active: 120 },
    bonus_xp: 400,
    bonus_credits: 100,
    icon: '🧘',
    color: '#00BCD4',
  },
  {
    chain_name: 'flexibility_progression',
    chain_description: 'Develop full-body flexibility from basics to advanced',
    chain_order: 2,
    source_journey_template_id: 'middle_splits',
    target_journey_template_id: 'full_mobility_mastery',
    unlock_criteria: { completion_percentage: 100, min_days_active: 180 },
    bonus_xp: 600,
    bonus_credits: 175,
    unlock_achievement_key: 'chain_complete',
    icon: '🧘',
    color: '#00BCD4',
  },
];

// ============================================
// PLANK ENDURANCE CHAIN
// Estimated duration: 6-12 months total
// ============================================
export const plankChain: JourneyProgressionChainSeed[] = [
  {
    chain_name: 'plank_progression',
    chain_description: 'Build core endurance from 60 seconds to 5 minutes',
    chain_order: 0,
    source_journey_template_id: 'plank_60s',
    target_journey_template_id: 'plank_5min',
    unlock_criteria: { completion_percentage: 100, min_days_active: 30 },
    bonus_xp: 350,
    bonus_credits: 85,
    unlock_achievement_key: 'chain_complete',
    icon: '🪑',
    color: '#795548',
  },
];

// ============================================
// REHABILITATION TO FITNESS CHAIN
// Estimated duration: 6-12 months total
// ============================================
export const rehabToFitnessChain: JourneyProgressionChainSeed[] = [
  {
    chain_name: 'rehab_to_fitness',
    chain_description: 'Transition from sedentary to full fitness',
    chain_order: 0,
    source_journey_template_id: 'from_couch',
    target_journey_template_id: 'beginner_strength',
    unlock_criteria: { completion_percentage: 100, min_days_active: 45 },
    bonus_xp: 300,
    bonus_credits: 75,
    icon: '🌱',
    color: '#8BC34A',
  },
  {
    chain_name: 'rehab_to_fitness',
    chain_description: 'Transition from sedentary to full fitness',
    chain_order: 1,
    source_journey_template_id: 'beginner_strength',
    target_journey_template_id: 'couch_to_5k',
    unlock_criteria: { completion_percentage: 100, min_days_active: 60 },
    bonus_xp: 400,
    bonus_credits: 100,
    unlock_achievement_key: 'chain_complete',
    icon: '🌱',
    color: '#8BC34A',
  },
];

// ============================================
// COMBINE ALL CHAINS
// ============================================
export const allProgressionChains: JourneyProgressionChainSeed[] = [
  ...weightLossChain,
  ...muscleBuildingChain,
  ...strengthChain,
  ...runningChain,
  ...pullUpChain,
  ...pushUpChain,
  ...flexibilityChain,
  ...plankChain,
  ...rehabToFitnessChain,
];

// ============================================
// CHAIN METADATA FOR DISPLAY
// ============================================
export const chainMetadata: ChainMetadata[] = [
  {
    name: 'weight_loss_progression',
    displayName: 'Weight Loss Journey',
    description: 'Progressive weight loss from 10 lbs to sustainable maintenance',
    stages: 4,
    estimatedDuration: '18-24 months',
    difficulty: 'intermediate',
    icon: '🏋️',
    color: '#4CAF50',
  },
  {
    name: 'muscle_building_progression',
    displayName: 'Muscle Building Path',
    description: 'Build muscle mass from beginner to elite level',
    stages: 5,
    estimatedDuration: '24-36 months',
    difficulty: 'advanced',
    icon: '💪',
    color: '#FF5722',
  },
  {
    name: 'strength_progression',
    displayName: 'Strength Mastery',
    description: 'Develop strength from novice to elite powerlifter',
    stages: 4,
    estimatedDuration: '18-24 months',
    difficulty: 'intermediate',
    icon: '🔱',
    color: '#9C27B0',
  },
  {
    name: 'running_progression',
    displayName: 'Couch to Marathon',
    description: 'The ultimate running journey from 0 to 42.2 km',
    stages: 4,
    estimatedDuration: '12-18 months',
    difficulty: 'intermediate',
    icon: '🏃',
    color: '#2196F3',
  },
  {
    name: 'pullup_progression',
    displayName: 'Pull-up Mastery',
    description: 'Master the pull-up from zero to weighted reps',
    stages: 4,
    estimatedDuration: '12-18 months',
    difficulty: 'intermediate',
    icon: '🎯',
    color: '#E91E63',
  },
  {
    name: 'pushup_progression',
    displayName: 'Push-up Champion',
    description: 'Progress from first push-up to 100 consecutive reps',
    stages: 4,
    estimatedDuration: '9-15 months',
    difficulty: 'beginner',
    icon: '✊',
    color: '#FF9800',
  },
  {
    name: 'flexibility_progression',
    displayName: 'Flexibility Evolution',
    description: 'Develop full-body flexibility and mobility',
    stages: 4,
    estimatedDuration: '12-18 months',
    difficulty: 'intermediate',
    icon: '🧘',
    color: '#00BCD4',
  },
  {
    name: 'plank_progression',
    displayName: 'Plank Endurance',
    description: 'Build core endurance from 60 seconds to 5 minutes',
    stages: 2,
    estimatedDuration: '6-12 months',
    difficulty: 'beginner',
    icon: '🪑',
    color: '#795548',
  },
  {
    name: 'rehab_to_fitness',
    displayName: 'Recovery to Fitness',
    description: 'Transition from sedentary to active lifestyle',
    stages: 3,
    estimatedDuration: '6-12 months',
    difficulty: 'beginner',
    icon: '🌱',
    color: '#8BC34A',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the chain metadata for a given chain name
 */
export function getChainMetadata(chainName: string): ChainMetadata | undefined {
  return chainMetadata.find((m) => m.name === chainName);
}

/**
 * Get all chains in a specific progression
 */
export function getChainsByName(chainName: string): JourneyProgressionChainSeed[] {
  return allProgressionChains
    .filter((c) => c.chain_name === chainName)
    .sort((a, b) => a.chain_order - b.chain_order);
}

/**
 * Get the next journey template ID in a chain after completing the source
 */
export function getNextJourneyInChain(
  chainName: string,
  sourceJourneyTemplateId: string
): string | undefined {
  const chain = allProgressionChains.find(
    (c) => c.chain_name === chainName && c.source_journey_template_id === sourceJourneyTemplateId
  );
  return chain?.target_journey_template_id;
}

/**
 * Check if a journey is the start of any chain
 */
export function isChainStart(journeyTemplateId: string): boolean {
  return allProgressionChains.some(
    (c) => c.source_journey_template_id === journeyTemplateId && c.chain_order === 0
  );
}

/**
 * Check if a journey is the end of any chain
 */
export function isChainEnd(journeyTemplateId: string): boolean {
  const asTarget = allProgressionChains.filter(
    (c) => c.target_journey_template_id === journeyTemplateId
  );
  // It's the end if it's a target but not a source
  return asTarget.some(
    (targetChain) =>
      !allProgressionChains.some(
        (c) =>
          c.chain_name === targetChain.chain_name &&
          c.source_journey_template_id === journeyTemplateId
      )
  );
}

// ============================================
// EXPORT DEFAULT
// ============================================
export default {
  progressionChains: allProgressionChains,
  chainMetadata,
  chains: {
    weightLoss: weightLossChain,
    muscleBuilding: muscleBuildingChain,
    strength: strengthChain,
    running: runningChain,
    pullUp: pullUpChain,
    pushUp: pushUpChain,
    flexibility: flexibilityChain,
    plank: plankChain,
    rehabToFitness: rehabToFitnessChain,
  },
  helpers: {
    getChainMetadata,
    getChainsByName,
    getNextJourneyInChain,
    isChainStart,
    isChainEnd,
  },
  // Statistics about the seed data
  stats: {
    totalChainSteps: allProgressionChains.length,
    uniqueChains: chainMetadata.length,
    byChain: {
      weight_loss_progression: weightLossChain.length,
      muscle_building_progression: muscleBuildingChain.length,
      strength_progression: strengthChain.length,
      running_progression: runningChain.length,
      pullup_progression: pullUpChain.length,
      pushup_progression: pushUpChain.length,
      flexibility_progression: flexibilityChain.length,
      plank_progression: plankChain.length,
      rehab_to_fitness: rehabToFitnessChain.length,
    },
    totalBonusXp: allProgressionChains.reduce((sum, c) => sum + c.bonus_xp, 0),
    totalBonusCredits: allProgressionChains.reduce((sum, c) => sum + (c.bonus_credits || 0), 0),
    featuredChains: allProgressionChains.filter((c) => c.is_featured).length,
  },
};
