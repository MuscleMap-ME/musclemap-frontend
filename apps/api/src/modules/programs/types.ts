/**
 * Training Programs Types
 */

export type ProgramDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'elite';
export type ProgramCategory = 'strength' | 'hypertrophy' | 'powerbuilding' | 'general_fitness' | 'athletic_performance';
export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'dropped';

export interface ProgramExercise {
  exerciseId: string;
  name?: string;
  sets: number;
  reps: string; // Can be "5" or "8-12" or "12 each"
  restSeconds: number;
  notes?: string;
  weight?: number;
  rpe?: number;
}

export interface ProgramDay {
  day: number;
  name: string;
  focus?: string;
  exercises: ProgramExercise[];
  notes?: string;
}

export interface ProgressionRules {
  type: 'linear' | 'double_progression' | 'undulating' | 'power_hypertrophy' | 'custom';
  weight_increment?: number;
  weight_increment_upper?: number;
  weight_increment_lower?: number;
  rep_range_low?: number;
  rep_range_high?: number;
  deload_week?: number;
  deload_percentage?: number;
  starting_weights?: Record<string, number>;
  failure_protocol?: string;
  strength_days?: {
    rep_target: number;
    weight_increment: number;
  };
  hypertrophy_days?: {
    rep_target: number;
    weight_increment: number;
  };
  power_progression?: {
    add_weight_when: string;
    weight_increment: number;
    failure_protocol: string;
  };
  hypertrophy_progression?: {
    add_weight_when: string;
    weight_increment: number;
  };
}

export interface TrainingProgram {
  id: string;
  creatorId: string | null;
  creatorUsername?: string;
  creatorDisplayName?: string;
  name: string;
  description?: string;
  shortDescription?: string;
  durationWeeks: number;
  daysPerWeek: number;
  schedule: ProgramDay[];
  progressionRules: ProgressionRules;
  difficulty?: ProgramDifficulty;
  category?: ProgramCategory;
  goals: string[];
  targetMuscles: string[];
  equipmentRequired: string[];
  isPublic: boolean;
  isOfficial: boolean;
  isFeatured: boolean;
  totalEnrollments: number;
  activeEnrollments: number;
  completionRate: number;
  averageRating: number;
  ratingCount: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  // User-specific fields (populated when userId provided)
  isEnrolled?: boolean;
  userRating?: number;
  currentEnrollment?: ProgramEnrollment;
}

export interface ProgramEnrollment {
  id: string;
  userId: string;
  programId: string;
  program?: TrainingProgram;
  currentWeek: number;
  currentDay: number;
  status: EnrollmentStatus;
  startedAt: Date;
  pausedAt?: Date;
  completedAt?: Date;
  expectedEndDate?: Date;
  workoutsCompleted: number;
  totalWorkouts: number;
  streakCurrent: number;
  streakLongest: number;
  progressData: Record<string, unknown>;
  userRating?: number;
  userReview?: string;
  ratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProgramInput {
  name: string;
  description?: string;
  shortDescription?: string;
  durationWeeks: number;
  daysPerWeek: number;
  schedule: ProgramDay[];
  progressionRules?: ProgressionRules;
  difficulty?: ProgramDifficulty;
  category?: ProgramCategory;
  goals?: string[];
  targetMuscles?: string[];
  equipmentRequired?: string[];
  isPublic?: boolean;
  imageUrl?: string;
}

export interface UpdateProgramInput {
  name?: string;
  description?: string;
  shortDescription?: string;
  durationWeeks?: number;
  daysPerWeek?: number;
  schedule?: ProgramDay[];
  progressionRules?: ProgressionRules;
  difficulty?: ProgramDifficulty;
  category?: ProgramCategory;
  goals?: string[];
  targetMuscles?: string[];
  equipmentRequired?: string[];
  isPublic?: boolean;
  imageUrl?: string;
}

export interface ProgramSearchOptions {
  search?: string;
  category?: ProgramCategory;
  difficulty?: ProgramDifficulty;
  minRating?: number;
  durationWeeks?: number;
  daysPerWeek?: number;
  official?: boolean;
  featured?: boolean;
  goals?: string[];
  equipment?: string[];
  creator?: string;
  sortBy?: 'popular' | 'rating' | 'recent' | 'name' | 'duration';
  limit?: number;
  offset?: number;
}

export interface EnrollmentProgress {
  weekProgress: number;
  totalProgress: number;
  daysRemaining: number;
  onTrack: boolean;
  nextWorkout?: {
    day: number;
    name: string;
    exercises: ProgramExercise[];
  };
}

export interface ProgramRating {
  id: string;
  programId: string;
  userId: string;
  rating: number;
  review?: string;
  completedProgram: boolean;
  createdAt: Date;
  updatedAt: Date;
}
