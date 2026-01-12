// Core scalar types
export type DateTime = string;
export type JSON = Record<string, unknown>;

// ============================================
// AUTH TYPES
// ============================================
export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
  archetype?: Archetype;
  level: number;
  xp: number;
  createdAt: DateTime;
}

export interface AuthPayload {
  token: string;
  user: User;
}

export interface Capabilities {
  canCreateWorkout: boolean;
  canJoinHangouts: boolean;
  canMessage: boolean;
  canVote: boolean;
  isPremium: boolean;
  dailyWorkoutLimit: number;
  remainingWorkouts: number;
}

export interface RegisterInput {
  email: string;
  password: string;
  username: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ============================================
// PROFILE TYPES
// ============================================
export interface Profile {
  id: string;
  userId: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  location?: string;
  website?: string;
  fitnessGoals?: string[];
  experienceLevel?: string;
  visibility: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface ProfileInput {
  displayName?: string;
  bio?: string;
  avatar?: string;
  location?: string;
  website?: string;
  fitnessGoals?: string[];
  experienceLevel?: string;
  visibility?: string;
}

// ============================================
// EXERCISE & MUSCLE TYPES
// ============================================
export interface Exercise {
  id: string;
  name: string;
  description?: string;
  type: string;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  equipment?: string[];
  difficulty?: string;
  instructions?: string[];
  tips?: string[];
  imageUrl?: string;
  videoUrl?: string;
}

export interface Muscle {
  id: string;
  name: string;
  group: string;
  subGroup?: string;
  description?: string;
}

// ============================================
// WORKOUT TYPES
// ============================================
export interface Workout {
  id: string;
  userId: string;
  exercises: WorkoutExercise[];
  duration?: number;
  notes?: string;
  totalTU: number;
  createdAt: DateTime;
}

export interface WorkoutExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  notes?: string;
}

export interface WorkoutStats {
  totalWorkouts: number;
  totalExercises: number;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  currentStreak: number;
  longestStreak: number;
  thisWeek: number;
  thisMonth: number;
}

export interface MuscleStats {
  muscleGroups: MuscleGroupStat[];
  lastTrained: JSON;
  weeklyVolume: JSON;
}

export interface MuscleGroupStat {
  muscle: string;
  totalSets: number;
  totalReps: number;
  lastTrained?: DateTime;
}

export interface WorkoutResult {
  workout: Workout;
  tuEarned: number;
  characterStats?: CharacterStats;
  levelUp: boolean;
  newLevel?: number;
  achievements?: Achievement[];
}

export interface WorkoutInput {
  exercises: WorkoutExerciseInput[];
  notes?: string;
  idempotencyKey?: string;
}

export interface WorkoutExerciseInput {
  exerciseId: string;
  sets: number;
  reps: number;
  weight?: number;
  notes?: string;
}

// ============================================
// GOAL TYPES
// ============================================
export interface Goal {
  id: string;
  userId: string;
  type: string;
  title: string;
  description?: string;
  target: number;
  current: number;
  unit: string;
  deadline?: DateTime;
  status: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface GoalSuggestion {
  type: string;
  title: string;
  description: string;
  target: number;
  unit: string;
  reasoning: string;
}

export interface GoalInput {
  type: string;
  title: string;
  description?: string;
  target: number;
  unit: string;
  deadline?: DateTime;
}

// ============================================
// JOURNEY & ARCHETYPE TYPES
// ============================================
export interface JourneyProgress {
  userId: string;
  archetype?: Archetype;
  currentLevel: number;
  currentXP: number;
  xpToNextLevel: number;
  totalXP: number;
  completedMilestones: string[];
  unlockedAbilities: string[];
  stats?: CharacterStats;
}

export interface Archetype {
  id: string;
  name: string;
  description: string;
  philosophy?: string;
  icon?: string;
  color?: string;
  levels?: ArchetypeLevel[];
  primaryStats?: string[];
}

export interface ArchetypeLevel {
  level: number;
  title: string;
  xpRequired: number;
  abilities: string[];
}

export interface ArchetypeCategory {
  id: string;
  name: string;
  description?: string;
  archetypes: Archetype[];
}

export interface ArchetypeSelection {
  success: boolean;
  archetype: Archetype;
  journey: JourneyProgress;
}

// ============================================
// EQUIPMENT TYPES
// ============================================
export interface EquipmentType {
  id: string;
  name: string;
  category: string;
  description?: string;
  icon?: string;
}

export interface EquipmentCategory {
  id: string;
  name: string;
  description?: string;
}

export interface HomeEquipment {
  id: string;
  userId: string;
  equipmentId: string;
  equipment: EquipmentType;
  addedAt: DateTime;
}

// ============================================
// STATS TYPES
// ============================================
export interface CharacterStats {
  userId: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  strength: number;
  endurance: number;
  agility: number;
  flexibility: number;
  balance: number;
  mentalFocus: number;
  totalWorkouts: number;
  totalExercises: number;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutAt?: DateTime;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  level: number;
  xp: number;
  stat: string;
  value: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon?: string;
  rarity: string;
  unlockedAt: DateTime;
}

// ============================================
// COMMUNITY TYPES
// ============================================
export interface FeedItem {
  id: string;
  type: string;
  userId: string;
  username: string;
  avatar?: string;
  content: JSON;
  createdAt: DateTime;
  likes: number;
  comments: number;
  liked: boolean;
}

export interface CommunityStats {
  activeUsers: number;
  activeWorkouts: number;
  totalWorkoutsToday: number;
  totalWorkoutsWeek: number;
  topArchetype?: string;
}

export interface PublicCommunityStats {
  activeNow: StatDisplay;
  activeWorkouts: StatDisplay;
  totalUsers: StatDisplay;
  totalWorkouts: StatDisplay;
  recentActivity?: ActivityEvent[];
  milestone?: CommunityMilestone;
}

export interface StatDisplay {
  value: number;
  display: string;
}

export interface ActivityEvent {
  id: string;
  type: string;
  message: string;
  timestamp: DateTime;
}

export interface CommunityMilestone {
  type: string;
  value: number;
  reached: boolean;
}

// ============================================
// ISSUES & ROADMAP TYPES
// ============================================
export interface Issue {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  labels: IssueLabel[];
  authorId: string;
  author: User;
  votes: number;
  userVote?: number;
  subscribed: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface IssueLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: string;
  quarter?: string;
  votes: number;
  userVoted: boolean;
  createdAt: DateTime;
}

export interface IssueInput {
  title: string;
  description: string;
  labels?: string[];
}
