/**
 * Test Harness Personas
 * 15 distinct user personas for comprehensive testing coverage
 */

import type { PersonaConfig, PersonaType } from './types.js';

// ============================================================================
// Persona Definitions
// ============================================================================

/**
 * Nova Fresh - Brand new user who just signed up
 * Tests: onboarding, initial setup, empty states
 */
const novaFresh: PersonaConfig = {
  id: 'nova_fresh',
  name: 'Nova Fresh',
  description: 'Brand new user who just signed up, no data yet',
  traits: {
    level: 1,
    experience: 0,
    credits: 0,
    isPremium: false,
    isBanned: false,
    isPrivate: false,
    isCoach: false,
    isStudent: false,
    workoutCount: 0,
    achievementCount: 0,
    streakDays: 0,
  },
  credentials: {
    email: 'nova.fresh@test.musclemap.me',
    password: 'TestPass123!Nova',
  },
  state: {
    isLoggedIn: false,
    hasActiveWorkout: false,
    hasActiveGoal: false,
  },
  permissions: {
    canCreateWorkout: true,
    canJoinCompetition: true,
    canSendMessage: true,
    canViewPrivateProfiles: false,
    canAccessPremiumFeatures: false,
    canModerate: false,
  },
};

/**
 * Rookie Trainee - User with a few workouts under their belt
 * Tests: early progression, basic features, learning curve
 */
const rookieTrainee: PersonaConfig = {
  id: 'rookie_trainee',
  name: 'Rookie Trainee',
  description: 'User with 5-10 workouts, still learning the platform',
  traits: {
    level: 3,
    experience: 450,
    credits: 150,
    isPremium: false,
    isBanned: false,
    isPrivate: false,
    isCoach: false,
    isStudent: false,
    workoutCount: 8,
    achievementCount: 3,
    archetype: 'Warrior',
    streakDays: 5,
  },
  credentials: {
    email: 'rookie.trainee@test.musclemap.me',
    password: 'TestPass123!Rookie',
  },
  state: {
    isLoggedIn: false,
    hasActiveWorkout: false,
    hasActiveGoal: true,
  },
  permissions: {
    canCreateWorkout: true,
    canJoinCompetition: true,
    canSendMessage: true,
    canViewPrivateProfiles: false,
    canAccessPremiumFeatures: false,
    canModerate: false,
  },
};

/**
 * Active Andy - Regular active user
 * Tests: typical user flows, daily usage patterns
 */
const activeAndy: PersonaConfig = {
  id: 'active_andy',
  name: 'Active Andy',
  description: 'Regular user with consistent workout activity',
  traits: {
    level: 15,
    experience: 8500,
    credits: 2500,
    isPremium: false,
    isBanned: false,
    isPrivate: false,
    isCoach: false,
    isStudent: false,
    workoutCount: 120,
    achievementCount: 25,
    archetype: 'Athlete',
    rank: 'Gold',
    streakDays: 45,
  },
  credentials: {
    email: 'active.andy@test.musclemap.me',
    password: 'TestPass123!Andy',
  },
  state: {
    isLoggedIn: false,
    hasActiveWorkout: false,
    hasActiveGoal: true,
  },
  permissions: {
    canCreateWorkout: true,
    canJoinCompetition: true,
    canSendMessage: true,
    canViewPrivateProfiles: false,
    canAccessPremiumFeatures: false,
    canModerate: false,
  },
};

/**
 * Elite Eve - High-level power user
 * Tests: advanced features, complex workflows, edge cases for experienced users
 */
const eliteEve: PersonaConfig = {
  id: 'elite_eve',
  name: 'Elite Eve',
  description: 'High-level power user pushing platform limits',
  traits: {
    level: 50,
    experience: 75000,
    credits: 15000,
    isPremium: true,
    isBanned: false,
    isPrivate: false,
    isCoach: false,
    isStudent: false,
    workoutCount: 500,
    achievementCount: 95,
    archetype: 'Legend',
    rank: 'Diamond',
    streakDays: 200,
  },
  credentials: {
    email: 'elite.eve@test.musclemap.me',
    password: 'TestPass123!Eve',
  },
  state: {
    isLoggedIn: false,
    hasActiveWorkout: false,
    hasActiveGoal: true,
  },
  permissions: {
    canCreateWorkout: true,
    canJoinCompetition: true,
    canSendMessage: true,
    canViewPrivateProfiles: true,
    canAccessPremiumFeatures: true,
    canModerate: false,
  },
};

/**
 * Legend Leo - Top-tier legendary user
 * Tests: max level scenarios, leaderboard top spots, legendary achievements
 */
const legendLeo: PersonaConfig = {
  id: 'legend_leo',
  name: 'Legend Leo',
  description: 'Top-tier legendary user at maximum progression',
  traits: {
    level: 100,
    experience: 500000,
    credits: 100000,
    isPremium: true,
    isBanned: false,
    isPrivate: false,
    isCoach: true,
    isStudent: false,
    workoutCount: 2000,
    achievementCount: 150,
    archetype: 'Titan',
    rank: 'Legend',
    streakDays: 730,
  },
  credentials: {
    email: 'legend.leo@test.musclemap.me',
    password: 'TestPass123!Leo',
  },
  state: {
    isLoggedIn: false,
    hasActiveWorkout: false,
    hasActiveGoal: true,
  },
  permissions: {
    canCreateWorkout: true,
    canJoinCompetition: true,
    canSendMessage: true,
    canViewPrivateProfiles: true,
    canAccessPremiumFeatures: true,
    canModerate: true,
  },
};

/**
 * Diamond Dan - Premium subscriber
 * Tests: premium features, subscription benefits, exclusive content
 */
const diamondDan: PersonaConfig = {
  id: 'diamond_dan',
  name: 'Diamond Dan',
  description: 'Premium subscriber with exclusive feature access',
  traits: {
    level: 30,
    experience: 25000,
    credits: 50000,
    isPremium: true,
    isBanned: false,
    isPrivate: false,
    isCoach: false,
    isStudent: false,
    workoutCount: 250,
    achievementCount: 60,
    archetype: 'Champion',
    rank: 'Diamond',
    streakDays: 90,
  },
  credentials: {
    email: 'diamond.dan@test.musclemap.me',
    password: 'TestPass123!Dan',
  },
  state: {
    isLoggedIn: false,
    hasActiveWorkout: false,
    hasActiveGoal: true,
  },
  permissions: {
    canCreateWorkout: true,
    canJoinCompetition: true,
    canSendMessage: true,
    canViewPrivateProfiles: true,
    canAccessPremiumFeatures: true,
    canModerate: false,
  },
};

/**
 * Ghost Private - Privacy-focused user
 * Tests: privacy settings, hidden profiles, data visibility
 */
const ghostPrivate: PersonaConfig = {
  id: 'ghost_private',
  name: 'Ghost Private',
  description: 'Privacy-focused user with restricted profile visibility',
  traits: {
    level: 20,
    experience: 12000,
    credits: 3000,
    isPremium: false,
    isBanned: false,
    isPrivate: true,
    isCoach: false,
    isStudent: false,
    workoutCount: 150,
    achievementCount: 35,
    archetype: 'Shadow',
    rank: 'Silver',
    streakDays: 30,
  },
  credentials: {
    email: 'ghost.private@test.musclemap.me',
    password: 'TestPass123!Ghost',
  },
  state: {
    isLoggedIn: false,
    hasActiveWorkout: false,
    hasActiveGoal: false,
  },
  permissions: {
    canCreateWorkout: true,
    canJoinCompetition: true,
    canSendMessage: true,
    canViewPrivateProfiles: false,
    canAccessPremiumFeatures: false,
    canModerate: false,
  },
};

/**
 * Recover Ray - User returning from injury/break
 * Tests: recovery features, comeback flows, reduced intensity recommendations
 */
const recoverRay: PersonaConfig = {
  id: 'recover_ray',
  name: 'Recover Ray',
  description: 'User returning from injury, needs modified workouts',
  traits: {
    level: 25,
    experience: 18000,
    credits: 4000,
    isPremium: false,
    isBanned: false,
    isPrivate: false,
    isCoach: false,
    isStudent: false,
    workoutCount: 200,
    achievementCount: 40,
    archetype: 'Phoenix',
    rank: 'Gold',
    streakDays: 0, // Streak broken due to recovery
  },
  credentials: {
    email: 'recover.ray@test.musclemap.me',
    password: 'TestPass123!Ray',
  },
  state: {
    isLoggedIn: false,
    hasActiveWorkout: false,
    hasActiveGoal: true,
  },
  permissions: {
    canCreateWorkout: true,
    canJoinCompetition: true,
    canSendMessage: true,
    canViewPrivateProfiles: false,
    canAccessPremiumFeatures: false,
    canModerate: false,
  },
};

/**
 * Silver Sally - Senior/mature user
 * Tests: accessibility, age-appropriate recommendations, senior-friendly UI
 */
const silverSally: PersonaConfig = {
  id: 'silver_sally',
  name: 'Silver Sally',
  description: 'Senior user with age-appropriate fitness needs',
  traits: {
    level: 18,
    experience: 10000,
    credits: 2000,
    isPremium: false,
    isBanned: false,
    isPrivate: false,
    isCoach: false,
    isStudent: false,
    workoutCount: 100,
    achievementCount: 20,
    archetype: 'Sage',
    rank: 'Silver',
    streakDays: 60,
  },
  credentials: {
    email: 'silver.sally@test.musclemap.me',
    password: 'TestPass123!Sally',
  },
  state: {
    isLoggedIn: false,
    hasActiveWorkout: false,
    hasActiveGoal: true,
  },
  permissions: {
    canCreateWorkout: true,
    canJoinCompetition: true,
    canSendMessage: true,
    canViewPrivateProfiles: false,
    canAccessPremiumFeatures: false,
    canModerate: false,
  },
};

/**
 * Wheel Walter - Wheelchair/adaptive athlete
 * Tests: adaptive exercises, accessibility features, inclusive fitness
 */
const wheelWalter: PersonaConfig = {
  id: 'wheel_walter',
  name: 'Wheel Walter',
  description: 'Wheelchair athlete using adaptive fitness features',
  traits: {
    level: 22,
    experience: 14000,
    credits: 3500,
    isPremium: true,
    isBanned: false,
    isPrivate: false,
    isCoach: false,
    isStudent: false,
    workoutCount: 180,
    achievementCount: 45,
    archetype: 'Adaptive',
    rank: 'Gold',
    streakDays: 75,
  },
  credentials: {
    email: 'wheel.walter@test.musclemap.me',
    password: 'TestPass123!Walter',
  },
  state: {
    isLoggedIn: false,
    hasActiveWorkout: false,
    hasActiveGoal: true,
  },
  permissions: {
    canCreateWorkout: true,
    canJoinCompetition: true,
    canSendMessage: true,
    canViewPrivateProfiles: true,
    canAccessPremiumFeatures: true,
    canModerate: false,
  },
};

/**
 * Ninja Nat - Martial arts specialist
 * Tests: martial arts features, combat sports, specialized training
 */
const ninjaNat: PersonaConfig = {
  id: 'ninja_nat',
  name: 'Ninja Nat',
  description: 'Martial artist specializing in combat sports training',
  traits: {
    level: 35,
    experience: 35000,
    credits: 8000,
    isPremium: true,
    isBanned: false,
    isPrivate: false,
    isCoach: false,
    isStudent: false,
    workoutCount: 300,
    achievementCount: 70,
    archetype: 'Ninja',
    rank: 'Platinum',
    streakDays: 120,
  },
  credentials: {
    email: 'ninja.nat@test.musclemap.me',
    password: 'TestPass123!Nat',
  },
  state: {
    isLoggedIn: false,
    hasActiveWorkout: false,
    hasActiveGoal: true,
  },
  permissions: {
    canCreateWorkout: true,
    canJoinCompetition: true,
    canSendMessage: true,
    canViewPrivateProfiles: true,
    canAccessPremiumFeatures: true,
    canModerate: false,
  },
};

/**
 * Sleepy Sam - Inactive/dormant user
 * Tests: re-engagement, stale data handling, comeback prompts
 */
const sleepySam: PersonaConfig = {
  id: 'sleepy_sam',
  name: 'Sleepy Sam',
  description: 'Inactive user who hasnt logged in for months',
  traits: {
    level: 12,
    experience: 6000,
    credits: 1000,
    isPremium: false,
    isBanned: false,
    isPrivate: false,
    isCoach: false,
    isStudent: false,
    workoutCount: 80,
    achievementCount: 15,
    archetype: 'Warrior',
    rank: 'Bronze',
    streakDays: 0, // Long-term inactive
  },
  credentials: {
    email: 'sleepy.sam@test.musclemap.me',
    password: 'TestPass123!Sam',
  },
  state: {
    isLoggedIn: false,
    hasActiveWorkout: false,
    hasActiveGoal: false,
    lastLogin: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
  },
  permissions: {
    canCreateWorkout: true,
    canJoinCompetition: true,
    canSendMessage: true,
    canViewPrivateProfiles: false,
    canAccessPremiumFeatures: false,
    canModerate: false,
  },
};

/**
 * Banned Bob - User with restrictions
 * Tests: ban enforcement, restricted access, appeal flows
 */
const bannedBob: PersonaConfig = {
  id: 'banned_bob',
  name: 'Banned Bob',
  description: 'User with account restrictions due to violations',
  traits: {
    level: 10,
    experience: 5000,
    credits: 500,
    isPremium: false,
    isBanned: true,
    isPrivate: false,
    isCoach: false,
    isStudent: false,
    workoutCount: 50,
    achievementCount: 10,
    archetype: 'Outlaw',
    rank: 'Bronze',
    streakDays: 0,
  },
  credentials: {
    email: 'banned.bob@test.musclemap.me',
    password: 'TestPass123!Bob',
  },
  state: {
    isLoggedIn: false,
    hasActiveWorkout: false,
    hasActiveGoal: false,
  },
  permissions: {
    canCreateWorkout: false,
    canJoinCompetition: false,
    canSendMessage: false,
    canViewPrivateProfiles: false,
    canAccessPremiumFeatures: false,
    canModerate: false,
  },
};

/**
 * Coach Carol - Trainer/coach role
 * Tests: coaching features, student management, program creation
 */
const coachCarol: PersonaConfig = {
  id: 'coach_carol',
  name: 'Coach Carol',
  description: 'Certified coach managing multiple students',
  traits: {
    level: 45,
    experience: 60000,
    credits: 25000,
    isPremium: true,
    isBanned: false,
    isPrivate: false,
    isCoach: true,
    isStudent: false,
    workoutCount: 400,
    achievementCount: 85,
    archetype: 'Mentor',
    rank: 'Master',
    streakDays: 300,
  },
  credentials: {
    email: 'coach.carol@test.musclemap.me',
    password: 'TestPass123!Carol',
  },
  state: {
    isLoggedIn: false,
    hasActiveWorkout: false,
    hasActiveGoal: true,
  },
  permissions: {
    canCreateWorkout: true,
    canJoinCompetition: true,
    canSendMessage: true,
    canViewPrivateProfiles: true,
    canAccessPremiumFeatures: true,
    canModerate: true,
  },
};

/**
 * Student Steve - Learning under a coach
 * Tests: student features, assigned workouts, progress tracking
 */
const studentSteve: PersonaConfig = {
  id: 'student_steve',
  name: 'Student Steve',
  description: 'Student training under a coach with assigned programs',
  traits: {
    level: 8,
    experience: 3500,
    credits: 800,
    isPremium: false,
    isBanned: false,
    isPrivate: false,
    isCoach: false,
    isStudent: true,
    workoutCount: 40,
    achievementCount: 8,
    archetype: 'Apprentice',
    rank: 'Bronze',
    streakDays: 20,
  },
  credentials: {
    email: 'student.steve@test.musclemap.me',
    password: 'TestPass123!Steve',
  },
  state: {
    isLoggedIn: false,
    hasActiveWorkout: false,
    hasActiveGoal: true,
  },
  permissions: {
    canCreateWorkout: true,
    canJoinCompetition: true,
    canSendMessage: true,
    canViewPrivateProfiles: false,
    canAccessPremiumFeatures: false,
    canModerate: false,
  },
};

// ============================================================================
// Persona Registry
// ============================================================================

export const personas: Record<PersonaType, PersonaConfig> = {
  nova_fresh: novaFresh,
  rookie_trainee: rookieTrainee,
  active_andy: activeAndy,
  elite_eve: eliteEve,
  legend_leo: legendLeo,
  diamond_dan: diamondDan,
  ghost_private: ghostPrivate,
  recover_ray: recoverRay,
  silver_sally: silverSally,
  wheel_walter: wheelWalter,
  ninja_nat: ninjaNat,
  sleepy_sam: sleepySam,
  banned_bob: bannedBob,
  coach_carol: coachCarol,
  student_steve: studentSteve,
};

// ============================================================================
// Persona Helpers
// ============================================================================

/**
 * Get a persona by ID
 */
export function getPersona(id: PersonaType): PersonaConfig {
  const persona = personas[id];
  if (!persona) {
    throw new Error(`Unknown persona: ${id}`);
  }
  // Return a deep clone to prevent mutation
  return JSON.parse(JSON.stringify(persona)) as PersonaConfig;
}

/**
 * Get all persona IDs
 */
export function getAllPersonaIds(): PersonaType[] {
  return Object.keys(personas) as PersonaType[];
}

/**
 * Get personas matching a filter
 */
export function getPersonasBy(
  filter: Partial<{
    isPremium: boolean;
    isBanned: boolean;
    isPrivate: boolean;
    isCoach: boolean;
    isStudent: boolean;
    minLevel: number;
    maxLevel: number;
  }>
): PersonaConfig[] {
  return Object.values(personas).filter((p) => {
    if (filter.isPremium !== undefined && p.traits.isPremium !== filter.isPremium) return false;
    if (filter.isBanned !== undefined && p.traits.isBanned !== filter.isBanned) return false;
    if (filter.isPrivate !== undefined && p.traits.isPrivate !== filter.isPrivate) return false;
    if (filter.isCoach !== undefined && p.traits.isCoach !== filter.isCoach) return false;
    if (filter.isStudent !== undefined && p.traits.isStudent !== filter.isStudent) return false;
    if (filter.minLevel !== undefined && p.traits.level < filter.minLevel) return false;
    if (filter.maxLevel !== undefined && p.traits.level > filter.maxLevel) return false;
    return true;
  });
}

/**
 * Get premium personas
 */
export function getPremiumPersonas(): PersonaConfig[] {
  return getPersonasBy({ isPremium: true });
}

/**
 * Get free tier personas
 */
export function getFreePersonas(): PersonaConfig[] {
  return getPersonasBy({ isPremium: false, isBanned: false });
}

/**
 * Get default persona for general testing
 */
export function getDefaultPersona(): PersonaConfig {
  return getPersona('active_andy');
}

/**
 * Generate unique test email for a persona
 */
export function generateTestEmail(personaId: PersonaType, runId: string): string {
  return `${personaId}.${runId}@test.musclemap.me`;
}
