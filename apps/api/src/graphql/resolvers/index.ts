/**
 * GraphQL Resolvers - Modular Entry Point
 *
 * This file combines all domain-specific resolver modules into a single
 * resolver map for Apollo Server.
 *
 * Architecture:
 * - Each domain has its own file (user.ts, workout.ts, economy.ts, etc.)
 * - Domain files export queries, mutations, and type resolvers
 * - This file merges them into the final resolver structure
 *
 * Migration Status:
 * - [x] user.ts - User queries/mutations
 * - [ ] workout.ts - Workout tracking
 * - [ ] economy.ts - Credits and transactions
 * - [ ] achievement.ts - Achievements and badges
 * - [ ] community.ts - Social features
 * - [ ] (more to be added)
 *
 * Legacy: The main resolvers.ts still contains most resolvers.
 * These will be gradually migrated to domain modules.
 */

// Re-export types and utilities
export * from './types';
export * from './utils';

// Domain modules
import userResolvers, { userQueries, userMutations, userTypeResolvers } from './user';

// Export individual resolvers for testing
export { userResolvers, userQueries, userMutations, userTypeResolvers };

/**
 * Merge multiple resolver objects into one.
 * Handles nested type resolvers correctly.
 */
function mergeResolvers(...resolverMaps: Record<string, unknown>[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const resolvers of resolverMaps) {
    for (const [typeName, typeResolvers] of Object.entries(resolvers)) {
      if (!result[typeName]) {
        result[typeName] = {};
      }

      if (typeof typeResolvers === 'object' && typeResolvers !== null) {
        // Merge type resolvers
        Object.assign(result[typeName] as object, typeResolvers);
      } else {
        // Direct assignment for scalars, etc.
        result[typeName] = typeResolvers;
      }
    }
  }

  return result;
}

/**
 * Combined modular resolvers.
 *
 * NOTE: These are currently used alongside the legacy resolvers.ts file.
 * The main resolvers.ts takes precedence for queries/mutations that exist in both.
 * As migration progresses, more resolvers will move here.
 */
export const modularResolvers = mergeResolvers(
  userResolvers
  // Add more domain resolvers here as they are created:
  // workoutResolvers,
  // economyResolvers,
  // achievementResolvers,
  // communityResolvers,
);

export default modularResolvers;
