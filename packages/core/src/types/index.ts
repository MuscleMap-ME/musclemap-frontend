/**
 * @musclemap/core - Domain Types
 * 
 * Single source of truth for all domain types across the monorepo.
 * These types are used by backend, frontend, and plugins.
 */

// ============================================
// IDENTIFIERS
// ============================================

export type UserId = string;
export type GroupId = string;
export type WorkoutId = string;
export type ExerciseId = string;
export type MuscleId = string;
export type ArchetypeId = string;
export type CompetitionId = string;
export type PluginId = string;
export type CreditActionId = string;
export type IdempotencyKey = string;

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: UserId;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  roles: UserRole[];
  flags: UserFlags;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'user' | 'admin' | 'moderator' | 'developer';

export interface UserFlags {
  verified: boolean;
  banned: boolean;
  suspended: boolean;
  emailConfirmed: boolean;
}

export interface UserProfile extends User {
  creditBalance: number;
  currentArchetypeId?: ArchetypeId;
  currentLevel: number;
  totalTU: number;
  workoutCount: number;
  memberSince: Date;
}

// ============================================
// GROUP / ORGANIZATION TYPES
// ============================================

export interface Group {
  id: GroupId;
  name: string;
  description?: string;
  avatarUrl?: string;
  ownerId: UserId;
  settings: GroupSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupSettings {
  isPublic: boolean;
  allowJoinRequests: boolean;
  sharedCreditPool: boolean;
  creditBudgetPerMember?: number;
  allowedPlugins?: PluginId[];
  blockedPlugins?: PluginId[];
}

export type GroupRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface GroupMembership {
  groupId: GroupId;
  userId: UserId;
  role: GroupRole;
  joinedAt: Date;
}

// ============================================
// ECONOMY / CREDIT TYPES
// ============================================

export interface CreditBalance {
  userId: UserId;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  updatedAt: Date;
}

export interface CreditTier {
  id: string;
  credits: number;
  priceCents: number;
  label: string;
  popular?: boolean;
}

export interface PricingResponse {
  tiers: CreditTier[];
  rate: string;
}

export interface CreditLedgerEntry {
  id: string;
  userId: UserId;
  action: CreditActionId;
  amount: number; // Negative for charges, positive for credits
  balanceAfter: number;
  metadata?: Record<string, unknown>;
  idempotencyKey: IdempotencyKey;
  createdAt: Date;
}

export interface CreditAction {
  id: CreditActionId;
  name: string;
  description?: string;
  defaultCost: number;
  pluginId?: PluginId; // null for core actions
  enabled: boolean;
}

export interface CreditChargeRequest {
  userId: UserId;
  action: CreditActionId;
  cost?: number; // Override default cost
  metadata?: Record<string, unknown>;
  idempotencyKey: IdempotencyKey;
}

export interface CreditChargeResult {
  success: boolean;
  ledgerEntryId?: string;
  newBalance?: number;
  error?: string;
}

// ============================================
// WORKOUT / EXERCISE TYPES
// ============================================

export interface Workout {
  id: WorkoutId;
  userId: UserId;
  date: Date;
  exercises: WorkoutExercise[];
  totalTU: number;
  creditsUsed: number;
  notes?: string;
  isPublic: boolean;
  createdAt: Date;
}

export interface WorkoutExercise {
  exerciseId: ExerciseId;
  sets: number;
  reps: number;
  weight?: number;
  intensity: number;
  tuEarned: number;
}

export interface Exercise {
  id: ExerciseId;
  name: string;
  type: ExerciseType;
  difficulty: 1 | 2 | 3;
  description?: string;
  cues?: string[];
  primaryMuscles: MuscleId[];
}

export type ExerciseType = 'bodyweight' | 'kettlebell' | 'freeweight' | 'machine' | 'cable';

export interface Muscle {
  id: MuscleId;
  name: string;
  anatomicalName?: string;
  muscleGroup: string;
  biasWeight: number;
}

export interface MuscleActivation {
  muscleId: MuscleId;
  rawActivation: number;
  normalizedActivation: number;
  tuEarned: number;
  colorTier: 0 | 1 | 2 | 3 | 4 | 5;
}

// ============================================
// ARCHETYPE TYPES
// ============================================

export interface Archetype {
  id: ArchetypeId;
  name: string;
  philosophy?: string;
  description?: string;
  focusAreas: string[];
  iconUrl?: string;
}

export interface ArchetypeLevel {
  id: number;
  archetypeId: ArchetypeId;
  level: number;
  name: string;
  totalTU: number;
  description?: string;
  muscleTargets: Record<MuscleId, number>;
}

// ============================================
// COMPETITION TYPES
// ============================================

export interface Competition {
  id: CompetitionId;
  name: string;
  description?: string;
  creatorId: UserId;
  type: CompetitionType;
  status: CompetitionStatus;
  startDate: Date;
  endDate: Date;
  maxParticipants?: number;
  entryFee?: number; // In credits
  prizePool?: number;
  rules?: CompetitionRules;
  isPublic: boolean;
  createdAt: Date;
}

export type CompetitionType = 'total_tu' | 'consistency' | 'specific_muscle' | 'custom';
export type CompetitionStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled';

export interface CompetitionRules {
  targetMuscles?: MuscleId[];
  requiredExercises?: ExerciseId[];
  minimumWorkouts?: number;
  customCriteria?: string;
}

export interface CompetitionParticipant {
  competitionId: CompetitionId;
  userId: UserId;
  score: number;
  rank?: number;
  joinedAt: Date;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiMeta {
  total?: number;
  page?: number;
  pageSize?: number;
  requestId?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================
// HEALTH CHECK
// ============================================

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  version?: string;
}

export interface HealthDepsResponse extends HealthResponse {
  checks: {
    database: boolean;
    cache?: boolean;
    external?: Record<string, boolean>;
  };
}
