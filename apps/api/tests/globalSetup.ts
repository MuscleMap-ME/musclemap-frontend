/**
 * Global test setup - runs once before all tests
 */
import { initializePool } from '../src/db/client';
import { initializeSchema, seedCreditActions } from '../src/db/schema';
import { migrate as migrateTrialAndSubscriptions } from '../src/db/migrations/001_add_trial_and_subscriptions';
import { migrate as migrateCommunityDashboard } from '../src/db/migrations/002_community_dashboard';
import { migrate as migrateMessaging } from '../src/db/migrations/003_messaging';
import { migrate as migrateExerciseEquipmentLocations } from '../src/db/migrations/004_exercise_equipment_locations';
import { migrate as migrateTipsAndMilestones } from '../src/db/migrations/005_tips_and_milestones';
import { migrate as migratePerformanceOptimization } from '../src/db/migrations/006_performance_optimization';

export default async function globalSetup(): Promise<void> {
  console.log('Global test setup: initializing database...');

  await initializePool();
  await initializeSchema();
  await seedCreditActions();
  await migrateTrialAndSubscriptions();
  await migrateCommunityDashboard();
  await migrateMessaging();
  await migrateExerciseEquipmentLocations();
  await migrateTipsAndMilestones();
  await migratePerformanceOptimization();

  console.log('Global test setup: database initialized');
}
