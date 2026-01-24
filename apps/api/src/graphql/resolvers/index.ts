/**
 * GraphQL Resolvers - Modular Architecture
 *
 * This file serves as the entry point for all resolvers.
 * Resolvers are organized by domain for better maintainability.
 *
 * Migration Strategy:
 * 1. Domain resolvers are gradually extracted to separate files
 * 2. This index re-exports all resolvers in a single object
 * 3. The main resolvers.ts will eventually just import from here
 *
 * Domain modules:
 * - auth: User authentication, profile, capabilities
 * - exercises: Exercise library, muscle data
 * - workouts: Workout tracking, sets, sessions
 * - stats: Statistics, leaderboards, rankings
 * - economy: Credits, wallet, transactions
 * - community: Feed, presence, messaging
 * - achievements: Achievements, verifications
 * - goals: User goals and progress
 * - journey: Archetypes, journeys, progression
 * - skills: Skill trees, progression
 * - martial-arts: Martial arts module
 * - teams: Crews, rivals, mentorship
 * - mascot: Companion mascot system
 * - marketplace: Store, mystery boxes
 * - nutrition: Food logging, macros
 * - recovery: Sleep, recovery tracking
 * - career: PT tests, career readiness
 * - programs: Workout programs
 * - admin: Administrative operations
 */

// Re-export utilities for use in resolver modules
export * from './utils';

// Import domain resolvers as they are extracted
// (These will be gradually populated as we modularize)

// For now, the main resolvers.ts still contains all resolvers
// This file will be the future entry point once modularization is complete

/**
 * Merge multiple resolver objects into one
 */
export function mergeResolvers(
  ...resolverSets: Array<Record<string, Record<string, unknown>>>
): Record<string, Record<string, unknown>> {
  const merged: Record<string, Record<string, unknown>> = {};

  for (const resolvers of resolverSets) {
    for (const [typeName, typeResolvers] of Object.entries(resolvers)) {
      if (!merged[typeName]) {
        merged[typeName] = {};
      }
      Object.assign(merged[typeName], typeResolvers);
    }
  }

  return merged;
}

/**
 * Create a resolver module structure
 */
export interface ResolverModule {
  Query?: Record<string, unknown>;
  Mutation?: Record<string, unknown>;
  Subscription?: Record<string, unknown>;
  [typeName: string]: Record<string, unknown> | undefined;
}

// Domain resolver exports (uncomment as modules are created)
// export { authResolvers } from './auth.resolvers';
// export { exerciseResolvers } from './exercises.resolvers';
// export { workoutResolvers } from './workouts.resolvers';
// export { statsResolvers } from './stats.resolvers';
// export { economyResolvers } from './economy.resolvers';
// export { communityResolvers } from './community.resolvers';
// export { achievementResolvers } from './achievements.resolvers';
// export { goalResolvers } from './goals.resolvers';
// export { journeyResolvers } from './journey.resolvers';
// export { skillResolvers } from './skills.resolvers';
// export { martialArtsResolvers } from './martial-arts.resolvers';
// export { teamResolvers } from './teams.resolvers';
// export { mascotResolvers } from './mascot.resolvers';
// export { marketplaceResolvers } from './marketplace.resolvers';
// export { nutritionResolvers } from './nutrition.resolvers';
// export { recoveryResolvers } from './recovery.resolvers';
// export { careerResolvers } from './career.resolvers';
// export { programResolvers } from './programs.resolvers';
// export { adminResolvers } from './admin.resolvers';
