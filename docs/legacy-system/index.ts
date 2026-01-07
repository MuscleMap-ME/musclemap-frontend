/**
 * MuscleMap Core Types
 */

// ============================================
// USER & PROFILE
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  profile: UserProfile;
}

export interface UserProfile {
  selectedPath: EquipmentPath;
  selectedArchetype?: string;
  experienceLevel: ExperienceLevel;
  weeklyGoalUnits: number;
  preferredWorkoutDays: number[];
  bodyWeight?: number;
  heightCm?: number;
}

export type EquipmentPath = 'bodyweight' | 'kettlebell' | 'freeweight';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

// ============================================
// WORKOUT & EXERCISES
// ============================================

export type MovementCategory = 'push' | 'pull' | 'legs' | 'hinge' | 'core' | 'carry';
export type MuscleRole = 'primary' | 'secondary' | 'stabilizer';

export interface Exercise {
  id: string;
  name: string;
  path: EquipmentPath;
  category: MovementCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  description: string;
  cues: string[];
  timePerSet: number;
  muscleActivations: MuscleActivation[];
}

export interface MuscleActivation {
  muscleId: string;
  activation: number;
  role: MuscleRole;
}

export interface LoggedExercise {
  id: string;
  exerciseId: string;
  sets: number;
  reps: number;
  weight?: number;
  notes?: string;
  timestamp: Date;
}

export interface Workout {
  id: string;
  userId: string;
  exercises: LoggedExercise[];
  startedAt: Date;
  completedAt?: Date;
  totalUnits: number;
  notes?: string;
}

// ============================================
// MUSCLE DATA
// ============================================

export type MuscleRegion = 'shoulders' | 'chest' | 'back' | 'arms' | 'core' | 'hips' | 'legs';
export type CompoundExposure = 'very_high' | 'high' | 'medium' | 'low';

export interface Muscle {
  id: string;
  name: string;
  region: MuscleRegion;
  subregion: string;
  biasWeight: number;
  weeklySetRange: [number, number];
  recoveryHours: number;
  compoundExposure: CompoundExposure;
  rationale: string;
}

export interface MuscleActivationState {
  muscleId: string;
  rawActivation: number;
  displayedActivation: number;
  biasWeight: number;
}

// ============================================
// TRAINING UNITS & PRESCRIPTIONS
// ============================================

export interface WorkoutSession {
  exercises: LoggedExercise[];
  totalUnits: number;
  muscleActivations: Map<string, MuscleActivationState>;
  completionPercentage: number;
}

export interface PrescribedExercise {
  exercise: Exercise;
  sets: number;
  reps: number;
  restSeconds: number;
  notes: string[];
}

export interface WorkoutPrescription {
  exercises: PrescribedExercise[];
  totalUnits: number;
  estimatedDuration: number;
  musclesCovered: string[];
}

// ============================================
// ARCHETYPES
// ============================================

export interface Archetype {
  id: string;
  name: string;
  description: string;
  primaryMuscles: string[];
  totalUnitsRequired: number;
  imagePath?: string;
}

// ============================================
// PROGRESS & ANALYTICS
// ============================================

export interface WeeklyProgress {
  weekStartDate: Date;
  totalUnits: number;
  workoutsCompleted: number;
  muscleActivations: Record<string, number>;
  goalUnits: number;
  goalPercentage: number;
}

export interface MuscleProgress {
  muscleId: string;
  weeklyActivations: number[];
  averageActivation: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
