/**
 * API Client
 *
 * High-level API client with typed endpoints and response validation.
 */
import { request } from '../http/client';
import { Type } from '../http/schema';

// =====================
// Exercise Types & Schemas
// =====================
export interface Exercise {
  id: string;
  name: string;
  type: string;
  difficulty: number;
  description: string | null;
  cues: string | null;
  primaryMuscles: string[];
}

export interface ExerciseActivation {
  muscleId: string;
  muscleName: string;
  activation: number;
}

export interface ExerciseWithActivations extends Exercise {
  activations: ExerciseActivation[];
}

const ExerciseSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    type: Type.String(),
    difficulty: Type.Number(),
    description: Type.Union([Type.String(), Type.Null()]),
    cues: Type.Union([Type.String(), Type.Null()]),
    primaryMuscles: Type.Array(Type.String(), { default: [] }),
  },
  { additionalProperties: true }
);

const ExerciseWithActivationsSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    type: Type.String(),
    difficulty: Type.Number(),
    description: Type.Union([Type.String(), Type.Null()]),
    cues: Type.Union([Type.String(), Type.Null()]),
    primaryMuscles: Type.Array(Type.String(), { default: [] }),
    activations: Type.Array(
      Type.Object({
        muscleId: Type.String(),
        muscleName: Type.String(),
        activation: Type.Number(),
      }),
      { default: [] }
    ),
  },
  { additionalProperties: true }
);

// =====================
// Muscle Types & Schemas
// =====================
export interface Muscle {
  id: string;
  name: string;
  anatomicalName: string | null;
  muscleGroup: string;
  biasWeight: number;
  optimalWeeklyVolume: number | null;
  recoveryTime: number | null;
}

export interface MuscleActivation {
  muscleId: string;
  muscleName: string;
  muscleGroup: string;
  rawActivation: number;
  biasWeight: number;
  normalizedActivation: number;
  colorTier: number;
}

const MuscleSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    anatomicalName: Type.Union([Type.String(), Type.Null()]),
    muscleGroup: Type.String(),
    biasWeight: Type.Number(),
    optimalWeeklyVolume: Type.Union([Type.Number(), Type.Null()]),
    recoveryTime: Type.Union([Type.Number(), Type.Null()]),
  },
  { additionalProperties: true }
);

const MuscleActivationSchema = Type.Object(
  {
    muscleId: Type.String(),
    muscleName: Type.String(),
    muscleGroup: Type.String(),
    rawActivation: Type.Number(),
    biasWeight: Type.Number(),
    normalizedActivation: Type.Number(),
    colorTier: Type.Number(),
  },
  { additionalProperties: true }
);

// =====================
// Workout Types & Schemas
// =====================
export interface WorkoutExercise {
  exerciseId: string;
  sets: number;
  reps?: number;
  weight?: number;
  duration?: number;
  notes?: string;
}

export interface Workout {
  id: string;
  userId: string;
  date: string;
  totalTU: number;
  creditsUsed: number;
  notes: string | null;
  isPublic: boolean;
  exerciseData: WorkoutExercise[];
  muscleActivations: Record<string, number>;
  createdAt: string;
}

export interface WorkoutStats {
  allTime: { workoutCount: number; totalTU: number };
  thisWeek: { workoutCount: number; totalTU: number };
  thisMonth: { workoutCount: number; totalTU: number };
}

export interface WorkoutPreview {
  totalTU: number;
  activations: MuscleActivation[];
}

const WorkoutExerciseSchema = Type.Object(
  {
    exerciseId: Type.String(),
    sets: Type.Number(),
    reps: Type.Optional(Type.Number()),
    weight: Type.Optional(Type.Number()),
    duration: Type.Optional(Type.Number()),
    notes: Type.Optional(Type.String()),
  },
  { additionalProperties: true }
);

const WorkoutSchema = Type.Object(
  {
    id: Type.String(),
    userId: Type.String(),
    date: Type.String(),
    totalTU: Type.Number(),
    creditsUsed: Type.Number(),
    notes: Type.Union([Type.String(), Type.Null()]),
    isPublic: Type.Boolean(),
    exerciseData: Type.Array(WorkoutExerciseSchema, { default: [] }),
    muscleActivations: Type.Record(Type.String(), Type.Number(), { default: {} }),
    createdAt: Type.String(),
  },
  { additionalProperties: true }
);

const WorkoutStatsSchema = Type.Object(
  {
    allTime: Type.Object({ workoutCount: Type.Number(), totalTU: Type.Number() }),
    thisWeek: Type.Object({ workoutCount: Type.Number(), totalTU: Type.Number() }),
    thisMonth: Type.Object({ workoutCount: Type.Number(), totalTU: Type.Number() }),
  },
  { additionalProperties: true }
);

const WorkoutPreviewSchema = Type.Object(
  {
    totalTU: Type.Number(),
    activations: Type.Array(MuscleActivationSchema, { default: [] }),
  },
  { additionalProperties: true }
);

// =====================
// Archetype Types & Schemas
// =====================
export interface Archetype {
  id: string;
  name: string;
  philosophy: string | null;
  description: string | null;
  focusAreas: string[];
  iconUrl: string | null;
}

export interface ArchetypeLevel {
  id?: number;
  archetypeId?: string;
  level: number;
  name: string;
  totalTU?: number;
  total_tu?: number;
  description: string | null;
  muscleTargets?: Record<string, number>;
}

export interface ArchetypeWithLevels extends Archetype {
  levels: ArchetypeLevel[];
}

export interface ArchetypeProgress {
  archetypeId: string;
  archetypeName: string;
  currentLevel: number;
  currentLevelName: string;
  currentTU: number;
  nextLevelTU: number | null;
  progressPercent: number;
}

const ArchetypeSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    philosophy: Type.Union([Type.String(), Type.Null()]),
    description: Type.Union([Type.String(), Type.Null()]),
    focusAreas: Type.Array(Type.String(), { default: [] }),
    iconUrl: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: true }
);

const ArchetypeLevelSchema = Type.Object(
  {
    id: Type.Optional(Type.Number()),
    archetypeId: Type.Optional(Type.String()),
    level: Type.Number(),
    name: Type.String(),
    totalTU: Type.Optional(Type.Number()),
    total_tu: Type.Optional(Type.Number()),
    description: Type.Union([Type.String(), Type.Null()]),
    muscleTargets: Type.Optional(Type.Record(Type.String(), Type.Number())),
  },
  { additionalProperties: true }
);

const ArchetypeWithLevelsSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    philosophy: Type.Union([Type.String(), Type.Null()]),
    description: Type.Union([Type.String(), Type.Null()]),
    focusAreas: Type.Array(Type.String(), { default: [] }),
    iconUrl: Type.Union([Type.String(), Type.Null()]),
    levels: Type.Array(ArchetypeLevelSchema, { default: [] }),
  },
  { additionalProperties: true }
);

const ArchetypeProgressSchema = Type.Object(
  {
    archetypeId: Type.String(),
    archetypeName: Type.String(),
    currentLevel: Type.Number(),
    currentLevelName: Type.String(),
    currentTU: Type.Number(),
    nextLevelTU: Type.Union([Type.Number(), Type.Null()]),
    progressPercent: Type.Number(),
  },
  { additionalProperties: true }
);

// =====================
// Journey Types & Schemas
// =====================
export interface JourneyPath {
  archetype: string;
  name: string;
  philosophy: string;
  description: string;
  focusAreas: string[];
  isCurrent: boolean;
  percentComplete: number;
  levels: Array<{ level: number; name: string; total_tu: number }>;
}

export interface JourneyMuscleBreakdown {
  id: string;
  name: string;
  group: string;
  totalActivation: number;
}

export interface JourneyStats {
  weekly: { workouts: number; tu: number; avgTuPerWorkout: number };
  monthly: { workouts: number; tu: number; avgTuPerWorkout: number };
  allTime: { workouts: number; tu: number; avgTuPerWorkout: number };
}

export interface JourneyData {
  totalTU: number;
  totalWorkouts: number;
  currentLevel: number;
  currentLevelName: string;
  nextLevelTU: number;
  progressToNextLevel: number;
  currentArchetype: string | null;
  daysSinceJoined: number;
  streak: number;
  stats: JourneyStats;
  workoutHistory: Array<{ date: string; tu: number; count: number }>;
  muscleBreakdown: JourneyMuscleBreakdown[];
  muscleGroups: Array<{ name: string; total: number }>;
  paths: JourneyPath[];
  levels: Array<{ level: number; name: string; total_tu: number; achieved: boolean }>;
  topExercises: Array<{ id: string; name: string; count: number }>;
  recentWorkouts: Array<{ id: string; date: string; tu: number; createdAt: string }>;
}

// =====================
// Rival Types & Schemas
// =====================
export type RivalStatus = 'pending' | 'active' | 'declined' | 'ended';

export interface RivalOpponent {
  id: string;
  username: string;
  avatar?: string | null;
  archetype?: string | null;
  level?: number;
}

export interface Rival {
  id: string;
  challengerId: string;
  challengedId: string;
  status: RivalStatus;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  opponent: RivalOpponent;
  isChallenger: boolean;
  myTU: number;
  opponentTU: number;
  myLastWorkout: string | null;
  opponentLastWorkout: string | null;
  tuDifference: number;
  isWinning: boolean;
}

export interface RivalStats {
  activeRivals: number;
  wins: number;
  losses: number;
  ties: number;
  totalTUEarned: number;
  currentStreak: number;
  longestStreak: number;
}

export interface RivalSearchResult {
  id: string;
  username: string;
  avatar?: string;
  archetype?: string;
}

const RivalOpponentSchema = Type.Object(
  {
    id: Type.String(),
    username: Type.String(),
    avatar: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    archetype: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    level: Type.Optional(Type.Number()),
  },
  { additionalProperties: true }
);

const RivalSchema = Type.Object(
  {
    id: Type.String(),
    challengerId: Type.String(),
    challengedId: Type.String(),
    status: Type.String(),
    createdAt: Type.String(),
    startedAt: Type.Union([Type.String(), Type.Null()]),
    endedAt: Type.Union([Type.String(), Type.Null()]),
    opponent: RivalOpponentSchema,
    isChallenger: Type.Boolean(),
    myTU: Type.Number(),
    opponentTU: Type.Number(),
    myLastWorkout: Type.Union([Type.String(), Type.Null()]),
    opponentLastWorkout: Type.Union([Type.String(), Type.Null()]),
    tuDifference: Type.Number(),
    isWinning: Type.Boolean(),
  },
  { additionalProperties: true }
);

const RivalStatsSchema = Type.Object(
  {
    activeRivals: Type.Number(),
    wins: Type.Number(),
    losses: Type.Number(),
    ties: Type.Number(),
    totalTUEarned: Type.Number(),
    currentStreak: Type.Number(),
    longestStreak: Type.Number(),
  },
  { additionalProperties: true }
);

const RivalSearchResultSchema = Type.Object(
  {
    id: Type.String(),
    username: Type.String(),
    avatar: Type.Optional(Type.String()),
    archetype: Type.Optional(Type.String()),
  },
  { additionalProperties: true }
);

// =====================
// Wearables Types & Schemas
// =====================
export type WearableProvider = 'apple_health' | 'fitbit' | 'garmin' | 'google_fit';

export interface WearableConnection {
  id: string;
  userId: string;
  provider: WearableProvider;
  providerUserId?: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

export interface HeartRateSample {
  timestamp: string;
  bpm: number;
  source?: string;
}

export interface WorkoutSample {
  id: string;
  type: string;
  startTime: string;
  endTime: string;
  duration: number;
  calories?: number;
  distance?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  source: WearableProvider;
}

export interface ActivitySample {
  date: string;
  steps?: number;
  activeCalories?: number;
  totalCalories?: number;
  moveMinutes?: number;
  standHours?: number;
  source: WearableProvider;
}

export interface SleepSample {
  startTime: string;
  endTime: string;
  duration: number;
  sleepStages?: {
    awake?: number;
    light?: number;
    deep?: number;
    rem?: number;
  };
  source: WearableProvider;
}

export interface HealthSyncPayload {
  heartRate?: HeartRateSample[];
  workouts?: WorkoutSample[];
  activity?: ActivitySample[];
  sleep?: SleepSample[];
}

export interface HealthSummary {
  today: {
    steps: number;
    activeCalories: number;
    avgHeartRate: number | null;
    workoutMinutes: number;
    sleepHours: number | null;
  };
  thisWeek: {
    totalSteps: number;
    avgDailySteps: number;
    totalWorkoutMinutes: number;
    avgSleepHours: number | null;
    avgRestingHeartRate: number | null;
  };
  connections: WearableConnection[];
}

const WearableConnectionSchema = Type.Object(
  {
    id: Type.String(),
    userId: Type.String(),
    provider: Type.String(),
    providerUserId: Type.Optional(Type.String()),
    isActive: Type.Boolean(),
    lastSyncAt: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.String(),
  },
  { additionalProperties: true }
);

const HealthSummarySchema = Type.Object(
  {
    today: Type.Object({
      steps: Type.Number(),
      activeCalories: Type.Number(),
      avgHeartRate: Type.Union([Type.Number(), Type.Null()]),
      workoutMinutes: Type.Number(),
      sleepHours: Type.Union([Type.Number(), Type.Null()]),
    }),
    thisWeek: Type.Object({
      totalSteps: Type.Number(),
      avgDailySteps: Type.Number(),
      totalWorkoutMinutes: Type.Number(),
      avgSleepHours: Type.Union([Type.Number(), Type.Null()]),
      avgRestingHeartRate: Type.Union([Type.Number(), Type.Null()]),
    }),
    connections: Type.Array(WearableConnectionSchema, { default: [] }),
  },
  { additionalProperties: true }
);

const WorkoutSampleSchema = Type.Object(
  {
    id: Type.String(),
    type: Type.String(),
    startTime: Type.String(),
    endTime: Type.String(),
    duration: Type.Number(),
    calories: Type.Optional(Type.Number()),
    distance: Type.Optional(Type.Number()),
    avgHeartRate: Type.Optional(Type.Number()),
    maxHeartRate: Type.Optional(Type.Number()),
    source: Type.String(),
  },
  { additionalProperties: true }
);

// =====================
// Crew Types & Schemas
// =====================
export type CrewRole = 'owner' | 'captain' | 'member';
export type CrewWarStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface Crew {
  id: string;
  name: string;
  tag: string;
  description: string | null;
  avatar: string | null;
  color: string;
  ownerId: string;
  memberCount: number;
  totalTU: number;
  weeklyTU: number;
  wins: number;
  losses: number;
  createdAt: string;
}

export interface CrewMember {
  id: string;
  crewId: string;
  userId: string;
  role: CrewRole;
  joinedAt: string;
  weeklyTU: number;
  totalTU: number;
  username: string;
  avatar: string | null;
  archetype: string | null;
}

export interface CrewWar {
  id: string;
  challengerCrewId: string;
  defendingCrewId: string;
  status: CrewWarStatus;
  startDate: string;
  endDate: string;
  challengerTU: number;
  defendingTU: number;
  winnerId: string | null;
  createdAt: string;
  challengerCrew: Pick<Crew, 'id' | 'name' | 'tag' | 'avatar' | 'color'>;
  defendingCrew: Pick<Crew, 'id' | 'name' | 'tag' | 'avatar' | 'color'>;
  isChallenger: boolean;
  myCrewTU: number;
  opponentCrewTU: number;
  daysRemaining: number;
  isWinning: boolean;
}

export interface CrewStats {
  totalMembers: number;
  totalTU: number;
  weeklyTU: number;
  warsWon: number;
  warsLost: number;
  currentStreak: number;
  topContributors: { userId: string; username: string; avatar: string | null; weeklyTU: number }[];
}

export interface CrewLeaderboardEntry {
  rank: number;
  crew: Pick<Crew, 'id' | 'name' | 'tag' | 'avatar' | 'color' | 'memberCount' | 'weeklyTU'>;
}

export interface MyCrewData {
  crew: Crew;
  membership: CrewMember;
  members: CrewMember[];
  wars: CrewWar[];
  stats: CrewStats;
}

const CrewSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    tag: Type.String(),
    description: Type.Union([Type.String(), Type.Null()]),
    avatar: Type.Union([Type.String(), Type.Null()]),
    color: Type.String(),
    ownerId: Type.String(),
    memberCount: Type.Number(),
    totalTU: Type.Number(),
    weeklyTU: Type.Number(),
    wins: Type.Number(),
    losses: Type.Number(),
    createdAt: Type.String(),
  },
  { additionalProperties: true }
);

const CrewMemberSchema = Type.Object(
  {
    id: Type.String(),
    crewId: Type.String(),
    userId: Type.String(),
    role: Type.String(),
    joinedAt: Type.String(),
    weeklyTU: Type.Number(),
    totalTU: Type.Number(),
    username: Type.String(),
    avatar: Type.Union([Type.String(), Type.Null()]),
    archetype: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: true }
);

const CrewWarSchema = Type.Object(
  {
    id: Type.String(),
    challengerCrewId: Type.String(),
    defendingCrewId: Type.String(),
    status: Type.String(),
    startDate: Type.String(),
    endDate: Type.String(),
    challengerTU: Type.Number(),
    defendingTU: Type.Number(),
    winnerId: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.String(),
    challengerCrew: Type.Object({
      id: Type.String(),
      name: Type.String(),
      tag: Type.String(),
      avatar: Type.Union([Type.String(), Type.Null()]),
      color: Type.String(),
    }),
    defendingCrew: Type.Object({
      id: Type.String(),
      name: Type.String(),
      tag: Type.String(),
      avatar: Type.Union([Type.String(), Type.Null()]),
      color: Type.String(),
    }),
    isChallenger: Type.Boolean(),
    myCrewTU: Type.Number(),
    opponentCrewTU: Type.Number(),
    daysRemaining: Type.Number(),
    isWinning: Type.Boolean(),
  },
  { additionalProperties: true }
);

const CrewStatsSchema = Type.Object(
  {
    totalMembers: Type.Number(),
    totalTU: Type.Number(),
    weeklyTU: Type.Number(),
    warsWon: Type.Number(),
    warsLost: Type.Number(),
    currentStreak: Type.Number(),
    topContributors: Type.Array(
      Type.Object({
        userId: Type.String(),
        username: Type.String(),
        avatar: Type.Union([Type.String(), Type.Null()]),
        weeklyTU: Type.Number(),
      })
    ),
  },
  { additionalProperties: true }
);

const MyCrewDataSchema = Type.Object(
  {
    crew: CrewSchema,
    membership: CrewMemberSchema,
    members: Type.Array(CrewMemberSchema, { default: [] }),
    wars: Type.Array(CrewWarSchema, { default: [] }),
    stats: CrewStatsSchema,
  },
  { additionalProperties: true }
);

const CrewLeaderboardEntrySchema = Type.Object(
  {
    rank: Type.Number(),
    crew: Type.Object({
      id: Type.String(),
      name: Type.String(),
      tag: Type.String(),
      avatar: Type.Union([Type.String(), Type.Null()]),
      color: Type.String(),
      memberCount: Type.Number(),
      weeklyTU: Type.Number(),
    }),
  },
  { additionalProperties: true }
);

const JourneyDataSchema = Type.Object(
  {
    totalTU: Type.Number(),
    totalWorkouts: Type.Number(),
    currentLevel: Type.Number(),
    currentLevelName: Type.String(),
    nextLevelTU: Type.Number(),
    progressToNextLevel: Type.Number(),
    currentArchetype: Type.Union([Type.String(), Type.Null()]),
    daysSinceJoined: Type.Number(),
    streak: Type.Number(),
    stats: Type.Object({
      weekly: Type.Object({ workouts: Type.Number(), tu: Type.Number(), avgTuPerWorkout: Type.Number() }),
      monthly: Type.Object({ workouts: Type.Number(), tu: Type.Number(), avgTuPerWorkout: Type.Number() }),
      allTime: Type.Object({ workouts: Type.Number(), tu: Type.Number(), avgTuPerWorkout: Type.Number() }),
    }),
    workoutHistory: Type.Array(Type.Object({ date: Type.String(), tu: Type.Number(), count: Type.Number() })),
    muscleBreakdown: Type.Array(Type.Any()),
    muscleGroups: Type.Array(Type.Any()),
    paths: Type.Array(Type.Any()),
    levels: Type.Array(Type.Any()),
    topExercises: Type.Array(Type.Any()),
    recentWorkouts: Type.Array(Type.Any()),
  },
  { additionalProperties: true }
);

// =====================
// Character Stats Types & Schemas
// =====================
export interface CharacterStats {
  strength: number;
  constitution: number;
  dexterity: number;
  power: number;
  endurance: number;
  vitality: number;
  lastCalculatedAt?: string;
}

export interface StatRanking {
  rank: number;
  total: number;
  percentile: number;
}

export interface StatRankingsByScope {
  global: StatRanking;
  country?: StatRanking;
  state?: StatRanking;
  city?: StatRanking;
}

export interface StatsWithRankings {
  stats: CharacterStats;
  rankings: Record<string, StatRankingsByScope>;
}

export interface StatsHistoryEntry {
  snapshotDate: string;
  strength: number;
  constitution: number;
  dexterity: number;
  power: number;
  endurance: number;
  vitality: number;
}

export interface ExtendedProfile {
  gender: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  country: string | null;
  countryCode: string | null;
  leaderboardOptIn: boolean;
  profileVisibility: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl: string | null;
  statValue: number;
  rank: number;
  gender?: string;
  country?: string;
  state?: string;
  city?: string;
}

export interface StatInfo {
  id: string;
  name: string;
  abbr: string;
  description: string;
  color: string;
}

const CharacterStatsSchema = Type.Object(
  {
    strength: Type.Number(),
    constitution: Type.Number(),
    dexterity: Type.Number(),
    power: Type.Number(),
    endurance: Type.Number(),
    vitality: Type.Number(),
    lastCalculatedAt: Type.Optional(Type.String()),
  },
  { additionalProperties: true }
);

const StatRankingSchema = Type.Object(
  {
    rank: Type.Number(),
    total: Type.Number(),
    percentile: Type.Number(),
  },
  { additionalProperties: true }
);

const StatRankingsByScopeSchema = Type.Object(
  {
    global: StatRankingSchema,
    country: Type.Optional(StatRankingSchema),
    state: Type.Optional(StatRankingSchema),
    city: Type.Optional(StatRankingSchema),
  },
  { additionalProperties: true }
);

const StatsWithRankingsSchema = Type.Object(
  {
    stats: CharacterStatsSchema,
    rankings: Type.Record(Type.String(), StatRankingsByScopeSchema),
  },
  { additionalProperties: true }
);

const StatsHistoryEntrySchema = Type.Object(
  {
    snapshotDate: Type.String(),
    strength: Type.Number(),
    constitution: Type.Number(),
    dexterity: Type.Number(),
    power: Type.Number(),
    endurance: Type.Number(),
    vitality: Type.Number(),
  },
  { additionalProperties: true }
);

const ExtendedProfileSchema = Type.Object(
  {
    gender: Type.Union([Type.String(), Type.Null()]),
    city: Type.Union([Type.String(), Type.Null()]),
    county: Type.Union([Type.String(), Type.Null()]),
    state: Type.Union([Type.String(), Type.Null()]),
    country: Type.Union([Type.String(), Type.Null()]),
    countryCode: Type.Union([Type.String(), Type.Null()]),
    leaderboardOptIn: Type.Boolean(),
    profileVisibility: Type.String(),
  },
  { additionalProperties: true }
);

const LeaderboardEntrySchema = Type.Object(
  {
    userId: Type.String(),
    username: Type.String(),
    avatarUrl: Type.Union([Type.String(), Type.Null()]),
    statValue: Type.Number(),
    rank: Type.Number(),
    gender: Type.Optional(Type.String()),
    country: Type.Optional(Type.String()),
    state: Type.Optional(Type.String()),
    city: Type.Optional(Type.String()),
  },
  { additionalProperties: true }
);

const StatInfoSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    abbr: Type.String(),
    description: Type.String(),
    color: Type.String(),
  },
  { additionalProperties: true }
);

// =====================
// Privacy Settings Types & Schemas
// =====================
export interface PrivacySettings {
  // Master toggle
  minimalistMode: boolean;

  // Community feature opt-outs
  optOutLeaderboards: boolean;
  optOutCommunityFeed: boolean;
  optOutCrews: boolean;
  optOutRivals: boolean;
  optOutHangouts: boolean;
  optOutMessaging: boolean;
  optOutHighFives: boolean;

  // Data collection opt-outs
  excludeFromStatsComparison: boolean;
  excludeFromLocationFeatures: boolean;
  excludeFromActivityFeed: boolean;

  // UI preferences
  hideGamification: boolean;
  hideAchievements: boolean;
  hideTips: boolean;
  hideSocialNotifications: boolean;
  hideProgressComparisons: boolean;

  // Presence & activity
  disablePresenceTracking: boolean;
  disableWorkoutSharing: boolean;

  // Profile
  profileCompletelyPrivate: boolean;
}

export interface PrivacySummary {
  mode: 'minimalist' | 'standard';
  summary: string;
  enabledFeatures: string[];
  disabledFeatures: string[];
  dataPrivacy: {
    excludedFromComparisons: boolean;
    excludedFromActivityFeed: boolean;
    locationHidden: boolean;
    presenceHidden: boolean;
    profilePrivate: boolean;
  };
}

const PrivacySettingsSchema = Type.Object(
  {
    minimalistMode: Type.Boolean(),
    optOutLeaderboards: Type.Boolean(),
    optOutCommunityFeed: Type.Boolean(),
    optOutCrews: Type.Boolean(),
    optOutRivals: Type.Boolean(),
    optOutHangouts: Type.Boolean(),
    optOutMessaging: Type.Boolean(),
    optOutHighFives: Type.Boolean(),
    excludeFromStatsComparison: Type.Boolean(),
    excludeFromLocationFeatures: Type.Boolean(),
    excludeFromActivityFeed: Type.Boolean(),
    hideGamification: Type.Boolean(),
    hideAchievements: Type.Boolean(),
    hideTips: Type.Boolean(),
    hideSocialNotifications: Type.Boolean(),
    hideProgressComparisons: Type.Boolean(),
    disablePresenceTracking: Type.Boolean(),
    disableWorkoutSharing: Type.Boolean(),
    profileCompletelyPrivate: Type.Boolean(),
  },
  { additionalProperties: true }
);

const PrivacySummarySchema = Type.Object(
  {
    mode: Type.String(),
    summary: Type.String(),
    enabledFeatures: Type.Array(Type.String()),
    disabledFeatures: Type.Array(Type.String()),
    dataPrivacy: Type.Object({
      excludedFromComparisons: Type.Boolean(),
      excludedFromActivityFeed: Type.Boolean(),
      locationHidden: Type.Boolean(),
      presenceHidden: Type.Boolean(),
      profilePrivate: Type.Boolean(),
    }),
  },
  { additionalProperties: true }
);

// =====================
// Onboarding Types & Schemas
// =====================
export interface OnboardingStatus {
  completed: boolean;
  completedAt: string | null;
  hasProfile: boolean;
  hasGender: boolean;
  hasUnits: boolean;
}

export interface PhysicalProfile {
  gender: string | null;
  dateOfBirth: string | null;
  heightCm: number | null;
  heightFt: number | null;
  heightIn: number | null;
  weightKg: number | null;
  weightLbs: number | null;
  preferredUnits: 'metric' | 'imperial';
  onboardingCompletedAt: string | null;
}

export interface PhysicalProfileInput {
  gender?: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
  dateOfBirth?: string;
  heightCm?: number;
  heightFt?: number;
  heightIn?: number;
  weightKg?: number;
  weightLbs?: number;
  preferredUnits: 'metric' | 'imperial';
}

const OnboardingStatusSchema = Type.Object(
  {
    completed: Type.Boolean(),
    completedAt: Type.Union([Type.String(), Type.Null()]),
    hasProfile: Type.Boolean(),
    hasGender: Type.Boolean(),
    hasUnits: Type.Boolean(),
  },
  { additionalProperties: true }
);

const PhysicalProfileSchema = Type.Object(
  {
    gender: Type.Union([Type.String(), Type.Null()]),
    dateOfBirth: Type.Union([Type.String(), Type.Null()]),
    heightCm: Type.Union([Type.Number(), Type.Null()]),
    heightFt: Type.Union([Type.Number(), Type.Null()]),
    heightIn: Type.Union([Type.Number(), Type.Null()]),
    weightKg: Type.Union([Type.Number(), Type.Null()]),
    weightLbs: Type.Union([Type.Number(), Type.Null()]),
    preferredUnits: Type.String(),
    onboardingCompletedAt: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: true }
);

// =====================
// Equipment Types & Schemas
// =====================
export interface EquipmentType {
  id: string;
  name: string;
  category: string;
  description: string | null;
  iconUrl: string | null;
  displayOrder: number;
}

export interface LocationEquipment {
  equipmentTypeId: string;
  equipmentName: string;
  category: string;
  confirmedCount: number;
  deniedCount: number;
  isVerified: boolean;
  firstReportedAt: string;
  lastReportedAt: string;
}

export interface UserHomeEquipment {
  id: number;
  userId: string;
  equipmentTypeId: string;
  equipmentName: string;
  category: string;
  locationType: 'home' | 'work' | 'other';
  notes: string | null;
}

const EquipmentTypeSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    category: Type.String(),
    description: Type.Union([Type.String(), Type.Null()]),
    iconUrl: Type.Union([Type.String(), Type.Null()]),
    displayOrder: Type.Number(),
  },
  { additionalProperties: true }
);

const LocationEquipmentSchema = Type.Object(
  {
    equipmentTypeId: Type.String(),
    equipmentName: Type.String(),
    category: Type.String(),
    confirmedCount: Type.Number(),
    deniedCount: Type.Number(),
    isVerified: Type.Boolean(),
    firstReportedAt: Type.String(),
    lastReportedAt: Type.String(),
  },
  { additionalProperties: true }
);

const UserHomeEquipmentSchema = Type.Object(
  {
    id: Type.Number(),
    userId: Type.String(),
    equipmentTypeId: Type.String(),
    equipmentName: Type.String(),
    category: Type.String(),
    locationType: Type.String(),
    notes: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: true }
);

// =====================
// User & Auth Types & Schemas
// =====================
export interface User {
  id: string | number;
  email?: string;
  username?: string;
  archetype?: string;
  [key: string]: unknown;
}

export interface AuthResponse {
  token: string;
  user: User;
}

const UserSchema = Type.Object(
  {
    id: Type.Union([Type.String(), Type.Number()]),
    email: Type.Optional(Type.String()),
    username: Type.Optional(Type.String()),
    archetype: Type.Optional(Type.String()),
  },
  { additionalProperties: true }
);

const AuthResponseSchema = Type.Object(
  { token: Type.String(), user: UserSchema },
  { additionalProperties: true }
);

// =====================
// Wallet Types & Schemas
// =====================
export interface Wallet {
  wallet: {
    balance: number;
    currency: string;
  };
}

export interface Transaction {
  id: string | number;
  amount: number;
  description?: string;
  created_at?: string;
}

export interface TransactionsResponse {
  transactions: Transaction[];
}

const WalletSchema = Type.Object(
  {
    wallet: Type.Object(
      { balance: Type.Number(), currency: Type.String({ default: 'CR' }) },
      { additionalProperties: true }
    ),
  },
  { additionalProperties: true }
);

const TransactionsSchema = Type.Object(
  {
    transactions: Type.Array(
      Type.Object(
        {
          id: Type.Union([Type.String(), Type.Number()]),
          amount: Type.Number(),
          description: Type.Optional(Type.String()),
          created_at: Type.Optional(Type.String()),
        },
        { additionalProperties: true }
      ),
      { default: [] }
    ),
  },
  { additionalProperties: true }
);

// =====================
// Billing Types & Schemas
// =====================
export interface Subscription {
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'incomplete' | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface BillingCheckoutResponse {
  url: string;
}

export interface FoundingMemberStatus {
  isFoundingMember: boolean;
  memberNumber: number | null;
  joinedAt: string | null;
  perks: string[];
}

const SubscriptionSchema = Type.Object(
  {
    status: Type.Union([
      Type.String(),
      Type.Null(),
    ]),
    currentPeriodEnd: Type.Union([Type.String(), Type.Null()]),
    cancelAtPeriodEnd: Type.Boolean({ default: false }),
  },
  { additionalProperties: true }
);

const BillingCheckoutResponseSchema = Type.Object(
  { url: Type.String() },
  { additionalProperties: true }
);

const FoundingMemberStatusSchema = Type.Object(
  {
    isFoundingMember: Type.Boolean(),
    memberNumber: Type.Union([Type.Number(), Type.Null()]),
    joinedAt: Type.Union([Type.String(), Type.Null()]),
    perks: Type.Array(Type.String(), { default: [] }),
  },
  { additionalProperties: true }
);

// =====================
// High Five Types & Schemas
// =====================
export interface HighFiveUser {
  id: string | number;
  username?: string;
}

export interface Encouragement {
  id: string | number;
  sender_name?: string;
  recipient_name?: string;
  type: string;
  message?: string | null;
  created_at?: string;
  read_at?: string | null;
}

export interface HighFiveFeed {
  encouragements: Encouragement[];
}

export interface HighFiveStats {
  sent?: number;
  received?: number;
  unread?: number;
}

const HighFiveUserSchema = Type.Object(
  { id: Type.Union([Type.String(), Type.Number()]), username: Type.Optional(Type.String()) },
  { additionalProperties: true }
);

const HighFiveFeedSchema = Type.Object(
  {
    encouragements: Type.Array(
      Type.Object(
        {
          id: Type.Union([Type.String(), Type.Number()]),
          sender_name: Type.Optional(Type.String()),
          recipient_name: Type.Optional(Type.String()),
          type: Type.String(),
          message: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          created_at: Type.Optional(Type.String()),
          read_at: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        },
        { additionalProperties: true }
      ),
      { default: [] }
    ),
  },
  { additionalProperties: true }
);

const HighFiveStatsSchema = Type.Object(
  {
    sent: Type.Optional(Type.Number()),
    received: Type.Optional(Type.Number()),
    unread: Type.Optional(Type.Number()),
  },
  { additionalProperties: true }
);

// =====================
// Settings Types & Schemas
// =====================
export interface Settings {
  email_notifications?: boolean;
  sms_notifications?: boolean;
  theme?: string;
}

export interface SettingsResponse {
  settings?: Settings;
}

const SettingsSchema = Type.Object(
  {
    email_notifications: Type.Optional(Type.Boolean()),
    sms_notifications: Type.Optional(Type.Boolean()),
    theme: Type.Optional(Type.String()),
  },
  { additionalProperties: true }
);

const SettingsResponseSchema = Type.Object(
  {
    settings: Type.Optional(SettingsSchema),
  },
  { additionalProperties: true }
);

// =====================
// Profile Types & Schemas
// =====================
export interface Profile {
  id?: string | number;
  username?: string;
  bio?: string;
  avatar?: string;
}

export interface Stats {
  workoutsCompleted?: number;
  streak?: number;
  achievements?: unknown[];
}

const ProfileSchema = Type.Object(
  {
    id: Type.Optional(Type.Union([Type.String(), Type.Number()])),
    username: Type.Optional(Type.String()),
    bio: Type.Optional(Type.String()),
    avatar: Type.Optional(Type.String()),
  },
  { additionalProperties: true }
);

const StatsSchema = Type.Object(
  {
    workoutsCompleted: Type.Optional(Type.Number()),
    streak: Type.Optional(Type.Number()),
    achievements: Type.Optional(Type.Array(Type.Any())),
  },
  { additionalProperties: true }
);

// =====================
// Helper to unwrap API responses
// =====================
interface DataResponse<T> {
  data: T;
}

// Creates a wrapper schema for { data: T } responses
// The inner schema can be any schema type (Object, Array, Record, etc.)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapInData(innerSchema: any) {
  return Type.Object({ data: innerSchema }, { additionalProperties: true });
}

// =====================
// API Client
// =====================
export const apiClient = {
  // Authentication
  auth: {
    login: async (email: string, password: string) => {
      const response = await request<DataResponse<AuthResponse>>('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
        schema: wrapInData(AuthResponseSchema),
      });
      return response.data;
    },
    register: async (payload: { email: string; password: string; username?: string }) => {
      const response = await request<DataResponse<AuthResponse>>('/auth/register', {
        method: 'POST',
        body: payload,
        auth: false,
        schema: wrapInData(AuthResponseSchema),
      });
      return response.data;
    },
    profile: () => request<User>('/auth/me', { schema: UserSchema }),
  },

  // Billing
  billing: {
    subscription: () =>
      request<DataResponse<Subscription | null>>('/billing/subscription', {
        schema: wrapInData(Type.Union([SubscriptionSchema, Type.Null()])),
      }),
    checkout: () =>
      request<DataResponse<BillingCheckoutResponse>>('/billing/checkout', {
        method: 'POST',
        schema: wrapInData(BillingCheckoutResponseSchema),
      }),
    creditsCheckout: () =>
      request<DataResponse<BillingCheckoutResponse>>('/billing/credits/checkout', {
        method: 'POST',
        schema: wrapInData(BillingCheckoutResponseSchema),
      }),
    portal: () =>
      request<DataResponse<BillingCheckoutResponse>>('/billing/portal', {
        method: 'POST',
        schema: wrapInData(BillingCheckoutResponseSchema),
      }),
    foundingMember: () =>
      request<DataResponse<FoundingMemberStatus>>('/billing/founding-member', {
        schema: wrapInData(FoundingMemberStatusSchema),
      }),
    claimFoundingMember: () =>
      request<DataResponse<FoundingMemberStatus>>('/billing/founding-member/claim', {
        method: 'POST',
        schema: wrapInData(FoundingMemberStatusSchema),
      }),
  },

  // Exercises
  exercises: {
    list: (type?: string) =>
      request<DataResponse<Exercise[]>>(type ? `/exercises?type=${type}` : '/exercises', {
        schema: wrapInData(Type.Array(ExerciseSchema)),
        cacheTtl: 300_000, // Cache for 5 minutes
      }),
    get: (id: string) =>
      request<DataResponse<ExerciseWithActivations>>(`/exercises/${id}`, {
        schema: wrapInData(ExerciseWithActivationsSchema),
        cacheTtl: 300_000,
      }),
    types: () =>
      request<DataResponse<string[]>>('/exercises/types', {
        schema: wrapInData(Type.Array(Type.String())),
        cacheTtl: 300_000,
      }),
    search: (query: string) =>
      request<DataResponse<Exercise[]>>(`/exercises/search?q=${encodeURIComponent(query)}`, {
        schema: wrapInData(Type.Array(ExerciseSchema)),
      }),
    activations: (id: string) =>
      request<DataResponse<Record<string, number>>>(`/exercises/${id}/activations`, {
        schema: wrapInData(Type.Record(Type.String(), Type.Number())),
        cacheTtl: 300_000,
      }),
  },

  // Muscles
  muscles: {
    list: (group?: string) =>
      request<DataResponse<Muscle[]>>(group ? `/muscles?group=${group}` : '/muscles', {
        schema: wrapInData(Type.Array(MuscleSchema)),
        cacheTtl: 300_000,
      }),
    get: (id: string) =>
      request<DataResponse<Muscle>>(`/muscles/${id}`, {
        schema: wrapInData(MuscleSchema),
        cacheTtl: 300_000,
      }),
    groups: () =>
      request<DataResponse<string[]>>('/muscles/groups', {
        schema: wrapInData(Type.Array(Type.String())),
        cacheTtl: 300_000,
      }),
  },

  // Workouts
  workouts: {
    create: (payload: {
      exercises: WorkoutExercise[];
      idempotencyKey: string;
      date?: string;
      notes?: string;
      isPublic?: boolean;
    }) =>
      request<DataResponse<Workout>>('/workouts', {
        method: 'POST',
        body: payload,
        schema: wrapInData(WorkoutSchema),
      }),
    list: (limit = 50, offset = 0) =>
      request<DataResponse<Workout[]>>(`/workouts/me?limit=${limit}&offset=${offset}`, {
        schema: wrapInData(Type.Array(WorkoutSchema)),
      }),
    get: (id: string) =>
      request<DataResponse<Workout>>(`/workouts/${id}`, {
        schema: wrapInData(WorkoutSchema),
      }),
    stats: () =>
      request<DataResponse<WorkoutStats>>('/workouts/me/stats', {
        schema: wrapInData(WorkoutStatsSchema),
      }),
    muscleActivations: (days = 7) =>
      request<DataResponse<MuscleActivation[]>>(`/workouts/me/muscles?days=${days}`, {
        schema: wrapInData(Type.Array(MuscleActivationSchema)),
      }),
    preview: (exercises: WorkoutExercise[]) =>
      request<DataResponse<WorkoutPreview>>('/workouts/preview', {
        method: 'POST',
        body: { exercises },
        schema: wrapInData(WorkoutPreviewSchema),
      }),
  },

  // Archetypes
  archetypes: {
    list: () =>
      request<DataResponse<Archetype[]>>('/archetypes', {
        schema: wrapInData(Type.Array(ArchetypeSchema)),
        cacheTtl: 300_000,
      }),
    get: (id: string) =>
      request<DataResponse<ArchetypeWithLevels>>(`/archetypes/${id}`, {
        schema: wrapInData(ArchetypeWithLevelsSchema),
        cacheTtl: 300_000,
      }),
    levels: (id: string) =>
      request<DataResponse<ArchetypeLevel[]>>(`/archetypes/${id}/levels`, {
        schema: wrapInData(Type.Array(ArchetypeLevelSchema)),
        cacheTtl: 300_000,
      }),
    myProgress: () =>
      request<DataResponse<ArchetypeProgress | null>>('/archetypes/me/progress', {
        schema: Type.Object({ data: Type.Union([ArchetypeProgressSchema, Type.Null()]) }, { additionalProperties: true }),
      }),
    progressFor: (archetypeId: string) =>
      request<DataResponse<ArchetypeProgress>>(`/archetypes/me/progress/${archetypeId}`, {
        schema: wrapInData(ArchetypeProgressSchema),
      }),
    select: (archetypeId: string) =>
      request<DataResponse<{ success: boolean; archetypeId: string }>>('/archetypes/me/select', {
        method: 'POST',
        body: { archetypeId },
        schema: wrapInData(Type.Object({ success: Type.Boolean(), archetypeId: Type.String() })),
      }),
  },

  // Journey (comprehensive progress tracking)
  journey: {
    get: () =>
      request<DataResponse<JourneyData>>('/journey', {
        schema: wrapInData(JourneyDataSchema),
      }),
    paths: () =>
      request<DataResponse<{ paths: JourneyPath[] }>>('/journey/paths', {
        schema: wrapInData(Type.Object({ paths: Type.Array(Type.Any()) })),
      }),
    switchArchetype: (archetype: string) =>
      request<{ success: boolean; data: { archetype: string } }>('/journey/switch', {
        method: 'POST',
        body: { archetype },
        schema: Type.Object({
          success: Type.Boolean(),
          data: Type.Object({ archetype: Type.String() }),
        }, { additionalProperties: true }),
      }),
  },

  // Progress (legacy stats)
  progress: {
    stats: () => request<Stats>('/progress/stats', { schema: StatsSchema }),
  },

  // Wallet / Economy
  wallet: {
    balance: () => request<Wallet>('/economy/wallet', { schema: WalletSchema }),
    transactions: (limit = 20) =>
      request<TransactionsResponse>(`/economy/transactions?limit=${limit}`, {
        schema: TransactionsSchema,
      }),
    transfer: (payload: { recipient_id: string | number; amount: number }) =>
      request<{ success?: boolean }>('/economy/transfer', {
        method: 'POST',
        body: payload,
        schema: Type.Object({ success: Type.Optional(Type.Boolean()) }, { additionalProperties: true }),
      }),
  },

  // High Fives
  highFives: {
    users: () =>
      request<{ users: HighFiveUser[] }>('/highfives/users', {
        schema: Type.Object(
          { users: Type.Array(HighFiveUserSchema, { default: [] }) },
          { additionalProperties: true }
        ),
      }),
    received: () => request<HighFiveFeed>('/highfives/received', { schema: HighFiveFeedSchema }),
    sent: () => request<HighFiveFeed>('/highfives/sent', { schema: HighFiveFeedSchema }),
    stats: () => request<HighFiveStats>('/highfives/stats', { schema: HighFiveStatsSchema }),
    send: (payload: { recipient_id: string | number; type: string; message?: string }) =>
      request<{ error?: string }>('/highfives/send', {
        method: 'POST',
        body: payload,
        schema: Type.Object({ error: Type.Optional(Type.String()) }, { additionalProperties: true }),
      }),
  },

  // Settings
  settings: {
    fetch: () => request<SettingsResponse>('/settings', { schema: SettingsResponseSchema }),
    update: (updates: Partial<Settings>) =>
      request<Settings>('/settings', { method: 'PATCH', body: updates, schema: SettingsSchema }),
  },

  // Profile
  profile: {
    get: () => request<Profile>('/profile', { schema: ProfileSchema }),
    update: (updates: Partial<Profile>) =>
      request<Profile>('/profile', { method: 'PUT', body: updates, schema: ProfileSchema }),
    avatars: () =>
      request<{ avatars: unknown[] }>('/profile/avatars', {
        schema: Type.Object(
          { avatars: Type.Array(Type.Any(), { default: [] }) },
          { additionalProperties: true }
        ),
        cacheTtl: 60_000,
      }),
    themes: () =>
      request<{ themes: unknown[] }>('/profile/themes', {
        schema: Type.Object(
          { themes: Type.Array(Type.Any(), { default: [] }) },
          { additionalProperties: true }
        ),
        cacheTtl: 60_000,
      }),
  },

  // Rivals
  rivals: {
    list: (status?: RivalStatus) =>
      request<DataResponse<{ rivals: Rival[]; stats: RivalStats }>>(
        status ? `/rivals?status=${status}` : '/rivals',
        {
          schema: wrapInData(
            Type.Object({
              rivals: Type.Array(RivalSchema),
              stats: RivalStatsSchema,
            })
          ),
        }
      ),
    get: (id: string) =>
      request<DataResponse<Rival>>(`/rivals/${id}`, {
        schema: wrapInData(RivalSchema),
      }),
    pending: () =>
      request<DataResponse<Rival[]>>('/rivals/pending', {
        schema: wrapInData(Type.Array(RivalSchema)),
      }),
    stats: () =>
      request<DataResponse<RivalStats>>('/rivals/stats', {
        schema: wrapInData(RivalStatsSchema),
      }),
    search: (query: string, limit = 20) =>
      request<DataResponse<RivalSearchResult[]>>(
        `/rivals/search?q=${encodeURIComponent(query)}&limit=${limit}`,
        {
          schema: wrapInData(Type.Array(RivalSearchResultSchema)),
        }
      ),
    challenge: (userId: string) =>
      request<DataResponse<Rival>>('/rivals', {
        method: 'POST',
        body: { userId },
        schema: wrapInData(RivalSchema),
      }),
    accept: (id: string) =>
      request<DataResponse<Rival>>(`/rivals/${id}/accept`, {
        method: 'POST',
        schema: wrapInData(RivalSchema),
      }),
    decline: (id: string) =>
      request<{ success: boolean }>(`/rivals/${id}/decline`, {
        method: 'POST',
        schema: Type.Object({ success: Type.Boolean() }, { additionalProperties: true }),
      }),
    end: (id: string) =>
      request<{ success: boolean }>(`/rivals/${id}/end`, {
        method: 'POST',
        schema: Type.Object({ success: Type.Boolean() }, { additionalProperties: true }),
      }),
  },

  // Wearables
  wearables: {
    summary: () =>
      request<DataResponse<HealthSummary>>('/wearables', {
        schema: wrapInData(HealthSummarySchema),
      }),
    connect: (provider: WearableProvider, data?: { providerUserId?: string; accessToken?: string; refreshToken?: string; tokenExpiresAt?: string }) =>
      request<DataResponse<WearableConnection>>('/wearables/connect', {
        method: 'POST',
        body: { provider, ...data },
        schema: wrapInData(WearableConnectionSchema),
      }),
    disconnect: (provider: WearableProvider) =>
      request<{ success: boolean }>('/wearables/disconnect', {
        method: 'POST',
        body: { provider },
        schema: Type.Object({ success: Type.Boolean() }, { additionalProperties: true }),
      }),
    sync: (provider: WearableProvider, data: HealthSyncPayload) =>
      request<DataResponse<{ synced: { heartRate: number; workouts: number; activity: number; sleep: number } }>>(
        '/wearables/sync',
        {
          method: 'POST',
          body: { provider, data },
          schema: wrapInData(
            Type.Object({
              synced: Type.Object({
                heartRate: Type.Number(),
                workouts: Type.Number(),
                activity: Type.Number(),
                sleep: Type.Number(),
              }),
            })
          ),
        }
      ),
    workouts: (limit = 10) =>
      request<DataResponse<{ workouts: WorkoutSample[] }>>(`/wearables/workouts?limit=${limit}`, {
        schema: wrapInData(Type.Object({ workouts: Type.Array(WorkoutSampleSchema, { default: [] }) })),
      }),
  },

  // Crews
  crews: {
    my: () =>
      request<DataResponse<MyCrewData | null>>('/crews/my', {
        schema: wrapInData(Type.Union([MyCrewDataSchema, Type.Null()])),
      }),
    create: (name: string, tag: string, description?: string, color?: string) =>
      request<DataResponse<Crew>>('/crews', {
        method: 'POST',
        body: { name, tag, description, color },
        schema: wrapInData(CrewSchema),
      }),
    get: (id: string) =>
      request<DataResponse<{ crew: Crew; members: CrewMember[]; stats: CrewStats }>>(`/crews/${id}`, {
        schema: wrapInData(
          Type.Object({
            crew: CrewSchema,
            members: Type.Array(CrewMemberSchema, { default: [] }),
            stats: CrewStatsSchema,
          })
        ),
      }),
    search: (query: string, limit = 20) =>
      request<DataResponse<Crew[]>>(`/crews/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
        schema: wrapInData(Type.Array(CrewSchema, { default: [] })),
      }),
    leaderboard: (limit = 50) =>
      request<DataResponse<CrewLeaderboardEntry[]>>(`/crews/leaderboard?limit=${limit}`, {
        schema: wrapInData(Type.Array(CrewLeaderboardEntrySchema, { default: [] })),
      }),
    invite: (crewId: string, inviteeId: string) =>
      request<DataResponse<{ id: string }>>(`/crews/${crewId}/invite`, {
        method: 'POST',
        body: { inviteeId },
        schema: wrapInData(Type.Object({ id: Type.String() }, { additionalProperties: true })),
      }),
    acceptInvite: (inviteId: string) =>
      request<DataResponse<CrewMember>>(`/crews/invites/${inviteId}/accept`, {
        method: 'POST',
        schema: wrapInData(CrewMemberSchema),
      }),
    leave: () =>
      request<{ success: boolean }>('/crews/leave', {
        method: 'POST',
        schema: Type.Object({ success: Type.Boolean() }, { additionalProperties: true }),
      }),
    startWar: (crewId: string, defendingCrewId: string, durationDays = 7) =>
      request<DataResponse<CrewWar>>(`/crews/${crewId}/war`, {
        method: 'POST',
        body: { defendingCrewId, durationDays },
        schema: wrapInData(CrewWarSchema),
      }),
    getWars: (crewId: string) =>
      request<DataResponse<CrewWar[]>>(`/crews/${crewId}/wars`, {
        schema: wrapInData(Type.Array(CrewWarSchema, { default: [] })),
      }),
  },

  // Character Stats (D&D-style attributes)
  characterStats: {
    /**
     * Get current user's character stats and rankings
     */
    me: () =>
      request<DataResponse<StatsWithRankings>>('/stats/me', {
        schema: wrapInData(StatsWithRankingsSchema),
      }),

    /**
     * Get another user's stats (if public)
     */
    getUser: (userId: string) =>
      request<DataResponse<{ userId: string; stats: CharacterStats }>>(`/stats/user/${userId}`, {
        schema: wrapInData(
          Type.Object({
            userId: Type.String(),
            stats: CharacterStatsSchema,
          })
        ),
      }),

    /**
     * Get stats history for progress charts
     */
    history: (days = 30) =>
      request<DataResponse<StatsHistoryEntry[]>>(`/stats/history?days=${days}`, {
        schema: wrapInData(Type.Array(StatsHistoryEntrySchema)),
      }),

    /**
     * Force recalculate all stats from workout history
     */
    recalculate: () =>
      request<DataResponse<{ stats: CharacterStats; message: string }>>('/stats/recalculate', {
        method: 'POST',
        schema: wrapInData(
          Type.Object({
            stats: CharacterStatsSchema,
            message: Type.String(),
          })
        ),
      }),

    /**
     * Get leaderboard rankings with filtering
     */
    leaderboard: (options?: {
      stat?: 'strength' | 'constitution' | 'dexterity' | 'power' | 'endurance' | 'vitality';
      scope?: 'global' | 'country' | 'state' | 'city';
      scopeValue?: string;
      gender?: 'male' | 'female' | 'non_binary';
      limit?: number;
      offset?: number;
    }) => {
      const params = new URLSearchParams();
      if (options?.stat) params.set('stat', options.stat);
      if (options?.scope) params.set('scope', options.scope);
      if (options?.scopeValue) params.set('scopeValue', options.scopeValue);
      if (options?.gender) params.set('gender', options.gender);
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.offset) params.set('offset', String(options.offset));
      const query = params.toString();
      return request<DataResponse<LeaderboardEntry[]>>(`/stats/leaderboards${query ? `?${query}` : ''}`, {
        schema: wrapInData(Type.Array(LeaderboardEntrySchema)),
      });
    },

    /**
     * Get current user's rankings across all scopes
     */
    myRankings: () =>
      request<
        DataResponse<{
          rankings: Record<string, StatRankingsByScope>;
          profile: { gender: string | null; city: string | null; state: string | null; country: string | null };
        }>
      >('/stats/leaderboards/me', {
        schema: wrapInData(
          Type.Object({
            rankings: Type.Record(Type.String(), StatRankingsByScopeSchema),
            profile: Type.Object({
              gender: Type.Union([Type.String(), Type.Null()]),
              city: Type.Union([Type.String(), Type.Null()]),
              state: Type.Union([Type.String(), Type.Null()]),
              country: Type.Union([Type.String(), Type.Null()]),
            }),
          })
        ),
      }),

    /**
     * Get extended profile (gender, location)
     */
    extendedProfile: () =>
      request<DataResponse<ExtendedProfile>>('/stats/profile/extended', {
        schema: wrapInData(ExtendedProfileSchema),
      }),

    /**
     * Update extended profile
     */
    updateExtendedProfile: (updates: Partial<{
      gender: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
      city: string;
      county: string;
      state: string;
      country: string;
      countryCode: string;
      leaderboardOptIn: boolean;
      profileVisibility: 'public' | 'friends' | 'private';
    }>) =>
      request<DataResponse<ExtendedProfile>>('/stats/profile/extended', {
        method: 'PUT',
        body: updates,
        schema: wrapInData(ExtendedProfileSchema),
      }),

    /**
     * Get information about the stats system
     */
    info: () =>
      request<DataResponse<{ stats: StatInfo[] }>>('/stats/info', {
        schema: wrapInData(Type.Object({ stats: Type.Array(StatInfoSchema) })),
        cacheTtl: 300_000, // Cache for 5 minutes
      }),
  },

  // Privacy Settings (Minimalist Mode)
  privacy: {
    /**
     * Get current user's privacy settings
     */
    get: () =>
      request<DataResponse<PrivacySettings>>('/privacy', {
        schema: wrapInData(PrivacySettingsSchema),
      }),

    /**
     * Update privacy settings
     */
    update: (updates: Partial<PrivacySettings>) =>
      request<DataResponse<PrivacySettings>>('/privacy', {
        method: 'PUT',
        body: updates,
        schema: wrapInData(PrivacySettingsSchema),
      }),

    /**
     * Enable full minimalist mode (one-click privacy)
     * Disables all community features and excludes user from all comparisons
     */
    enableMinimalist: () =>
      request<DataResponse<{ minimalistMode: boolean; message: string }>>('/privacy/enable-minimalist', {
        method: 'POST',
        schema: wrapInData(
          Type.Object({
            minimalistMode: Type.Boolean(),
            message: Type.String(),
          })
        ),
      }),

    /**
     * Disable minimalist mode and restore defaults
     */
    disableMinimalist: () =>
      request<DataResponse<{ minimalistMode: boolean; message: string }>>('/privacy/disable-minimalist', {
        method: 'POST',
        schema: wrapInData(
          Type.Object({
            minimalistMode: Type.Boolean(),
            message: Type.String(),
          })
        ),
      }),

    /**
     * Get a user-friendly summary of privacy settings
     */
    summary: () =>
      request<DataResponse<PrivacySummary>>('/privacy/summary', {
        schema: wrapInData(PrivacySummarySchema),
      }),
  },

  // Onboarding
  onboarding: {
    /**
     * Get onboarding status
     */
    status: () =>
      request<DataResponse<OnboardingStatus>>('/onboarding/status', {
        schema: wrapInData(OnboardingStatusSchema),
      }),

    /**
     * Get current physical profile
     */
    getProfile: () =>
      request<DataResponse<PhysicalProfile>>('/onboarding/profile', {
        schema: wrapInData(PhysicalProfileSchema),
      }),

    /**
     * Save physical profile during onboarding
     */
    saveProfile: (profile: PhysicalProfileInput) =>
      request<DataResponse<{ success: boolean; message: string }>>('/onboarding/profile', {
        method: 'POST',
        body: profile as unknown as Record<string, unknown>,
        schema: wrapInData(
          Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          })
        ),
      }),

    /**
     * Save home equipment during onboarding
     */
    saveHomeEquipment: (equipmentIds: string[], locationType: 'home' | 'work' | 'other' = 'home') =>
      request<DataResponse<{ success: boolean; message: string; equipmentCount: number }>>('/onboarding/home-equipment', {
        method: 'POST',
        body: { equipmentIds, locationType },
        schema: wrapInData(
          Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
            equipmentCount: Type.Number(),
          })
        ),
      }),

    /**
     * Mark onboarding as complete
     */
    complete: () =>
      request<DataResponse<{ success: boolean; message: string; completedAt: string }>>('/onboarding/complete', {
        method: 'POST',
        schema: wrapInData(
          Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
            completedAt: Type.String(),
          })
        ),
      }),

    /**
     * Skip onboarding
     */
    skip: () =>
      request<DataResponse<{ success: boolean; message: string; skipped: boolean }>>('/onboarding/skip', {
        method: 'POST',
        schema: wrapInData(
          Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
            skipped: Type.Boolean(),
          })
        ),
      }),
  },

  // Equipment
  equipment: {
    /**
     * Get all equipment types
     */
    types: () =>
      request<DataResponse<EquipmentType[]>>('/equipment/types', {
        schema: wrapInData(Type.Array(EquipmentTypeSchema)),
        cacheTtl: 300_000, // Cache for 5 minutes
      }),

    /**
     * Get equipment types by category
     */
    typesByCategory: (category: string) =>
      request<DataResponse<EquipmentType[]>>(`/equipment/types/${encodeURIComponent(category)}`, {
        schema: wrapInData(Type.Array(EquipmentTypeSchema)),
        cacheTtl: 300_000,
      }),

    /**
     * Get all equipment categories
     */
    categories: () =>
      request<DataResponse<string[]>>('/equipment/categories', {
        schema: wrapInData(Type.Array(Type.String())),
        cacheTtl: 300_000,
      }),

    /**
     * Get equipment at a location
     */
    getLocationEquipment: (hangoutId: string) =>
      request<DataResponse<LocationEquipment[]>>(`/locations/${hangoutId}/equipment`, {
        schema: wrapInData(Type.Array(LocationEquipmentSchema)),
      }),

    /**
     * Get verified equipment at a location
     */
    getVerifiedLocationEquipment: (hangoutId: string) =>
      request<DataResponse<string[]>>(`/locations/${hangoutId}/equipment/verified`, {
        schema: wrapInData(Type.Array(Type.String())),
      }),

    /**
     * Report equipment at a location
     */
    reportEquipment: (hangoutId: string, types: string[], reportType: 'present' | 'absent') =>
      request<DataResponse<{ success: boolean; message: string; reportedCount: number }>>(
        `/locations/${hangoutId}/equipment`,
        {
          method: 'POST',
          body: { types, reportType },
          schema: wrapInData(
            Type.Object({
              success: Type.Boolean(),
              message: Type.String(),
              reportedCount: Type.Number(),
            })
          ),
        }
      ),

    /**
     * Get user's reports for a location
     */
    getMyReports: (hangoutId: string) =>
      request<DataResponse<{ equipmentTypeId: string; reportType: 'present' | 'absent' }[]>>(
        `/locations/${hangoutId}/equipment/my-reports`,
        {
          schema: wrapInData(
            Type.Array(
              Type.Object({
                equipmentTypeId: Type.String(),
                reportType: Type.String(),
              })
            )
          ),
        }
      ),

    /**
     * Get user's home equipment
     */
    getHomeEquipment: (locationType?: 'home' | 'work' | 'other') =>
      request<DataResponse<UserHomeEquipment[]>>(
        `/equipment/home${locationType ? `?locationType=${locationType}` : ''}`,
        {
          schema: wrapInData(Type.Array(UserHomeEquipmentSchema)),
        }
      ),

    /**
     * Get user's home equipment IDs
     */
    getHomeEquipmentIds: (locationType?: 'home' | 'work' | 'other') =>
      request<DataResponse<string[]>>(
        `/equipment/home/ids${locationType ? `?locationType=${locationType}` : ''}`,
        {
          schema: wrapInData(Type.Array(Type.String())),
        }
      ),

    /**
     * Set user's home equipment (replaces all)
     */
    setHomeEquipment: (equipmentIds: string[], locationType: 'home' | 'work' | 'other' = 'home') =>
      request<DataResponse<{ success: boolean; message: string; equipmentCount: number }>>('/equipment/home', {
        method: 'PUT',
        body: { equipmentIds, locationType },
        schema: wrapInData(
          Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
            equipmentCount: Type.Number(),
          })
        ),
      }),

    /**
     * Add single equipment to home
     */
    addHomeEquipment: (equipmentId: string, locationType: 'home' | 'work' | 'other' = 'home', notes?: string) =>
      request<DataResponse<{ success: boolean; message: string }>>('/equipment/home', {
        method: 'POST',
        body: { equipmentId, locationType, notes },
        schema: wrapInData(
          Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          })
        ),
      }),

    /**
     * Remove equipment from home
     */
    removeHomeEquipment: (equipmentId: string, locationType: 'home' | 'work' | 'other' = 'home') =>
      request<{ success: boolean; message: string }>(
        `/equipment/home/${equipmentId}${locationType !== 'home' ? `?locationType=${locationType}` : ''}`,
        {
          method: 'DELETE',
          schema: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }, { additionalProperties: true }),
        }
      ),
  },

  // Virtual Hangouts (themed community spaces)
  hangouts: {
    /**
     * Get all hangout themes
     */
    themes: () =>
      request<DataResponse<VirtualHangoutTheme[]>>('/virtual-hangouts/themes', {
        schema: wrapInData(Type.Array(VirtualHangoutThemeSchema)),
        cacheTtl: 300_000,
      }),

    /**
     * List virtual hangouts
     */
    list: (themeId?: number, limit = 50, offset = 0) =>
      request<DataResponse<VirtualHangout[]> & { meta: { total: number } }>(
        `/virtual-hangouts?${new URLSearchParams({ ...(themeId ? { themeId: String(themeId) } : {}), limit: String(limit), offset: String(offset) }).toString()}`,
        { schema: wrapInData(Type.Array(VirtualHangoutSchema)) }
      ),

    /**
     * Get recommended hangouts for current user
     */
    recommended: (limit = 5) =>
      request<DataResponse<VirtualHangout[]>>(`/virtual-hangouts/recommended?limit=${limit}`, {
        schema: wrapInData(Type.Array(VirtualHangoutSchema)),
      }),

    /**
     * Get user's hangout memberships
     */
    my: (limit = 50, offset = 0) =>
      request<DataResponse<VirtualHangout[]> & { meta: { total: number } }>(
        `/virtual-hangouts/my?limit=${limit}&offset=${offset}`,
        { schema: wrapInData(Type.Array(VirtualHangoutSchema)) }
      ),

    /**
     * Get a single hangout
     */
    get: (id: number) =>
      request<DataResponse<VirtualHangout>>(`/virtual-hangouts/${id}`, {
        schema: wrapInData(VirtualHangoutSchema),
      }),

    /**
     * Join a hangout
     */
    join: (id: number, showInMemberList = true, receiveNotifications = true) =>
      request<DataResponse<{ message: string }>>(`/virtual-hangouts/${id}/join`, {
        method: 'POST',
        body: { showInMemberList, receiveNotifications },
        schema: wrapInData(Type.Object({ message: Type.String() })),
      }),

    /**
     * Leave a hangout
     */
    leave: (id: number) =>
      request<DataResponse<{ message: string }>>(`/virtual-hangouts/${id}/leave`, {
        method: 'POST',
        schema: wrapInData(Type.Object({ message: Type.String() })),
      }),

    /**
     * Get hangout members
     */
    members: (id: number, limit = 50, offset = 0) =>
      request<DataResponse<HangoutMember[]> & { meta: { total: number } }>(
        `/virtual-hangouts/${id}/members?limit=${limit}&offset=${offset}`,
        { schema: wrapInData(Type.Array(HangoutMemberSchema)) }
      ),

    /**
     * Get hangout activity feed
     */
    activity: (id: number, limit = 50, offset = 0) =>
      request<DataResponse<HangoutActivity[]>>(
        `/virtual-hangouts/${id}/activity?limit=${limit}&offset=${offset}`,
        { schema: wrapInData(Type.Array(HangoutActivitySchema)) }
      ),

    /**
     * Share a workout to a hangout
     */
    shareWorkout: (id: number, workoutId: string, message?: string) =>
      request<DataResponse<{ message: string }>>(`/virtual-hangouts/${id}/share-workout`, {
        method: 'POST',
        body: { workoutId, message },
        schema: wrapInData(Type.Object({ message: Type.String() })),
      }),

    /**
     * Send heartbeat to update last active time
     */
    heartbeat: (id: number) =>
      request<DataResponse<{ acknowledged: boolean }>>(`/virtual-hangouts/${id}/heartbeat`, {
        method: 'POST',
        schema: wrapInData(Type.Object({ acknowledged: Type.Boolean() })),
      }),

    /**
     * Get posts from hangout bulletin board
     */
    posts: (id: number, options?: { limit?: number; offset?: number; sortBy?: 'hot' | 'new' | 'top' }) =>
      request<DataResponse<BulletinPost[]> & { meta: { total: number; boardId: number } }>(
        `/virtual-hangouts/${id}/posts?${new URLSearchParams({
          limit: String(options?.limit || 20),
          offset: String(options?.offset || 0),
          sortBy: options?.sortBy || 'hot',
        }).toString()}`,
        { schema: wrapInData(Type.Array(BulletinPostSchema)) }
      ),

    /**
     * Create a post in hangout bulletin board
     */
    createPost: (id: number, post: { title: string; content: string; postType?: string; mediaUrls?: string[] }) =>
      request<DataResponse<BulletinPost>>(`/virtual-hangouts/${id}/posts`, {
        method: 'POST',
        body: post,
        schema: wrapInData(BulletinPostSchema),
      }),
  },

  // Communities (self-organized groups)
  communities: {
    /**
     * Create a new community
     */
    create: (data: {
      name: string;
      tagline?: string;
      description?: string;
      communityType: 'goal' | 'interest' | 'institution' | 'local' | 'challenge';
      goalType?: string;
      institutionType?: string;
      privacy?: 'public' | 'private' | 'secret';
      iconEmoji?: string;
      accentColor?: string;
      rules?: string;
      requiresApproval?: boolean;
      allowMemberPosts?: boolean;
    }) =>
      request<DataResponse<Community>>('/communities', {
        method: 'POST',
        body: data,
        schema: wrapInData(CommunitySchema),
      }),

    /**
     * Search/list communities
     */
    search: (options?: {
      query?: string;
      communityType?: string;
      goalType?: string;
      institutionType?: string;
      limit?: number;
      offset?: number;
    }) => {
      const params = new URLSearchParams();
      if (options?.query) params.set('query', options.query);
      if (options?.communityType) params.set('communityType', options.communityType);
      if (options?.goalType) params.set('goalType', options.goalType);
      if (options?.institutionType) params.set('institutionType', options.institutionType);
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.offset) params.set('offset', String(options.offset));
      const query = params.toString();
      return request<DataResponse<Community[]> & { meta: { total: number } }>(
        `/communities${query ? `?${query}` : ''}`,
        { schema: wrapInData(Type.Array(CommunitySchema)) }
      );
    },

    /**
     * Get user's communities
     */
    my: (limit = 50, offset = 0) =>
      request<DataResponse<Community[]> & { meta: { total: number } }>(
        `/communities/my?limit=${limit}&offset=${offset}`,
        { schema: wrapInData(Type.Array(CommunitySchema)) }
      ),

    /**
     * Get a community by ID or slug
     */
    get: (idOrSlug: string | number) =>
      request<DataResponse<Community>>(`/communities/${idOrSlug}`, {
        schema: wrapInData(CommunitySchema),
      }),

    /**
     * Join a community
     */
    join: (id: number) =>
      request<DataResponse<{ message: string; status: string }>>(`/communities/${id}/join`, {
        method: 'POST',
        schema: wrapInData(Type.Object({ message: Type.String(), status: Type.String() })),
      }),

    /**
     * Leave a community
     */
    leave: (id: number) =>
      request<DataResponse<{ message: string }>>(`/communities/${id}/leave`, {
        method: 'POST',
        schema: wrapInData(Type.Object({ message: Type.String() })),
      }),

    /**
     * Get community members
     */
    members: (id: number, limit = 50, offset = 0, status = 'active') =>
      request<DataResponse<CommunityMember[]> & { meta: { total: number } }>(
        `/communities/${id}/members?limit=${limit}&offset=${offset}&status=${status}`,
        { schema: wrapInData(Type.Array(CommunityMemberSchema)) }
      ),

    /**
     * Get community events
     */
    events: (id: number, upcoming = true, limit = 20, offset = 0) =>
      request<DataResponse<CommunityEvent[]>>(
        `/communities/${id}/events?upcoming=${upcoming}&limit=${limit}&offset=${offset}`,
        { schema: wrapInData(Type.Array(CommunityEventSchema)) }
      ),

    /**
     * Create a community event
     */
    createEvent: (id: number, event: {
      title: string;
      description?: string;
      eventType: 'meetup' | 'challenge' | 'workshop' | 'competition' | 'social';
      startsAt: string;
      endsAt?: string;
      timezone?: string;
      locationName?: string;
      locationAddress?: string;
      isVirtual?: boolean;
      virtualUrl?: string;
      maxParticipants?: number;
    }) =>
      request<DataResponse<CommunityEvent>>(`/communities/${id}/events`, {
        method: 'POST',
        body: event,
        schema: wrapInData(CommunityEventSchema),
      }),

    /**
     * Get posts from community bulletin board
     */
    posts: (id: number, options?: { limit?: number; offset?: number; sortBy?: 'hot' | 'new' | 'top' }) =>
      request<DataResponse<BulletinPost[]> & { meta: { total: number; boardId: number } }>(
        `/communities/${id}/posts?${new URLSearchParams({
          limit: String(options?.limit || 20),
          offset: String(options?.offset || 0),
          sortBy: options?.sortBy || 'hot',
        }).toString()}`,
        { schema: wrapInData(Type.Array(BulletinPostSchema)) }
      ),

    /**
     * Create a post in community bulletin board
     */
    createPost: (id: number, post: { title: string; content: string; postType?: string; mediaUrls?: string[] }) =>
      request<DataResponse<BulletinPost>>(`/communities/${id}/posts`, {
        method: 'POST',
        body: post,
        schema: wrapInData(BulletinPostSchema),
      }),
  },

  // Bulletin board actions (shared between hangouts and communities)
  bulletin: {
    /**
     * Get a single post
     */
    getPost: (postId: string) =>
      request<DataResponse<BulletinPost>>(`/bulletin/posts/${postId}`, {
        schema: wrapInData(BulletinPostSchema),
      }),

    /**
     * Vote on a post
     */
    votePost: (postId: string, voteType: 'up' | 'down') =>
      request<DataResponse<{ upvotes: number; downvotes: number; score: number }>>(
        `/bulletin/posts/${postId}/vote`,
        {
          method: 'POST',
          body: { voteType },
          schema: wrapInData(Type.Object({
            upvotes: Type.Number(),
            downvotes: Type.Number(),
            score: Type.Number(),
          })),
        }
      ),

    /**
     * Get comments for a post
     */
    getComments: (postId: string, limit = 50, offset = 0) =>
      request<DataResponse<BulletinComment[]> & { meta: { total: number } }>(
        `/bulletin/posts/${postId}/comments?limit=${limit}&offset=${offset}`,
        { schema: wrapInData(Type.Array(BulletinCommentSchema)) }
      ),

    /**
     * Add a comment to a post
     */
    addComment: (postId: string, content: string, parentId?: string) =>
      request<DataResponse<BulletinComment>>(`/bulletin/posts/${postId}/comments`, {
        method: 'POST',
        body: { content, parentId },
        schema: wrapInData(BulletinCommentSchema),
      }),

    /**
     * Vote on a comment
     */
    voteComment: (commentId: string, voteType: 'up' | 'down') =>
      request<DataResponse<{ upvotes: number; downvotes: number; score: number }>>(
        `/bulletin/comments/${commentId}/vote`,
        {
          method: 'POST',
          body: { voteType },
          schema: wrapInData(Type.Object({
            upvotes: Type.Number(),
            downvotes: Type.Number(),
            score: Type.Number(),
          })),
        }
      ),

    /**
     * Pin a post (moderator)
     */
    pinPost: (postId: string) =>
      request<DataResponse<{ message: string }>>(`/bulletin/posts/${postId}/pin`, {
        method: 'POST',
        schema: wrapInData(Type.Object({ message: Type.String() })),
      }),

    /**
     * Unpin a post (moderator)
     */
    unpinPost: (postId: string) =>
      request<DataResponse<{ message: string }>>(`/bulletin/posts/${postId}/unpin`, {
        method: 'POST',
        schema: wrapInData(Type.Object({ message: Type.String() })),
      }),

    /**
     * Hide a post (moderator)
     */
    hidePost: (postId: string) =>
      request<DataResponse<{ message: string }>>(`/bulletin/posts/${postId}/hide`, {
        method: 'POST',
        schema: wrapInData(Type.Object({ message: Type.String() })),
      }),
  },
};

// =====================
// Virtual Hangout Types & Schemas
// =====================
export interface VirtualHangoutTheme {
  id: number;
  slug: string;
  name: string;
  description: string;
  iconEmoji: string;
  accentColor: string;
  backgroundPattern: string;
  relatedArchetypes: number[];
  relatedGoals: string[];
  isActive: boolean;
}

export interface VirtualHangout {
  id: number;
  themeId: number;
  themeName: string;
  themeSlug: string;
  name: string;
  description?: string;
  welcomeMessage?: string;
  iconEmoji: string;
  accentColor: string;
  bannerImageUrl?: string;
  memberCount: number;
  activeNow: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isMember?: boolean;
  userRole?: number;
  lastVisitedAt?: string;
}

export interface HangoutMember {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role: number;
  joinedAt: string;
  lastActiveAt?: string;
  showInMemberList: boolean;
  receiveNotifications: boolean;
}

export interface HangoutActivity {
  id: string;
  hangoutId: number;
  userId?: string;
  username?: string;
  activityType: 'join' | 'leave' | 'post' | 'workout_shared' | 'achievement' | 'milestone';
  activityData: Record<string, unknown>;
  createdAt: string;
}

// =====================
// Community Types & Schemas
// =====================
export interface Community {
  id: number;
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  communityType: 'goal' | 'interest' | 'institution' | 'local' | 'challenge';
  goalType?: string;
  institutionType?: string;
  archetypeId?: number;
  privacy: 'public' | 'private' | 'secret';
  iconEmoji: string;
  accentColor: string;
  bannerImageUrl?: string;
  logoImageUrl?: string;
  rules?: string;
  memberCount: number;
  postCount: number;
  isVerified: boolean;
  isActive: boolean;
  requiresApproval: boolean;
  allowMemberPosts: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isMember?: boolean;
  userRole?: number;
  membershipStatus?: 'pending' | 'active' | 'suspended' | 'banned';
}

export interface CommunityMember {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role: number;
  title?: string;
  status: 'pending' | 'active' | 'suspended' | 'banned';
  joinedAt: string;
  lastActiveAt?: string;
  showInMemberList: boolean;
}

export interface CommunityEvent {
  id: string;
  communityId: number;
  virtualHangoutId?: number;
  creatorId: string;
  title: string;
  description?: string;
  eventType: 'meetup' | 'challenge' | 'workshop' | 'competition' | 'social';
  startsAt: string;
  endsAt?: string;
  timezone: string;
  locationName?: string;
  locationAddress?: string;
  isVirtual: boolean;
  virtualUrl?: string;
  maxParticipants?: number;
  participantCount: number;
  status: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: string;
}

// =====================
// Bulletin Types & Schemas
// =====================
export interface BulletinPost {
  id: string;
  boardId: number;
  authorId?: string;
  authorUsername?: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  title: string;
  content: string;
  contentLang: string;
  postType: 'discussion' | 'question' | 'announcement' | 'poll' | 'workout_share' | 'milestone';
  mediaUrls: string[];
  linkedWorkoutId?: string;
  linkedMilestoneId?: string;
  upvotes: number;
  downvotes: number;
  score: number;
  commentCount: number;
  viewCount: number;
  isPinned: boolean;
  isHighlighted: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  userVote?: 'up' | 'down';
}

export interface BulletinComment {
  id: string;
  postId: string;
  parentId?: string;
  authorId?: string;
  authorUsername?: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  content: string;
  upvotes: number;
  downvotes: number;
  score: number;
  replyCount: number;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  userVote?: 'up' | 'down';
  replies?: BulletinComment[];
}

const VirtualHangoutThemeSchema = Type.Object({
  id: Type.Number(),
  slug: Type.String(),
  name: Type.String(),
  description: Type.String(),
  iconEmoji: Type.String(),
  accentColor: Type.String(),
  backgroundPattern: Type.String(),
  relatedArchetypes: Type.Array(Type.Number()),
  relatedGoals: Type.Array(Type.String()),
  isActive: Type.Boolean(),
}, { additionalProperties: true });

const VirtualHangoutSchema = Type.Object({
  id: Type.Number(),
  themeId: Type.Number(),
  themeName: Type.String(),
  themeSlug: Type.String(),
  name: Type.String(),
  description: Type.Optional(Type.String()),
  welcomeMessage: Type.Optional(Type.String()),
  iconEmoji: Type.String(),
  accentColor: Type.String(),
  bannerImageUrl: Type.Optional(Type.String()),
  memberCount: Type.Number(),
  activeNow: Type.Number(),
  isActive: Type.Boolean(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  isMember: Type.Optional(Type.Boolean()),
  userRole: Type.Optional(Type.Number()),
  lastVisitedAt: Type.Optional(Type.String()),
}, { additionalProperties: true });

const HangoutMemberSchema = Type.Object({
  userId: Type.String(),
  username: Type.String(),
  displayName: Type.Optional(Type.String()),
  avatarUrl: Type.Optional(Type.String()),
  role: Type.Number(),
  joinedAt: Type.String(),
  lastActiveAt: Type.Optional(Type.String()),
  showInMemberList: Type.Boolean(),
  receiveNotifications: Type.Boolean(),
}, { additionalProperties: true });

const HangoutActivitySchema = Type.Object({
  id: Type.String(),
  hangoutId: Type.Number(),
  userId: Type.Optional(Type.String()),
  username: Type.Optional(Type.String()),
  activityType: Type.String(),
  activityData: Type.Record(Type.String(), Type.Any()),
  createdAt: Type.String(),
}, { additionalProperties: true });

const CommunitySchema = Type.Object({
  id: Type.Number(),
  slug: Type.String(),
  name: Type.String(),
  tagline: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  communityType: Type.String(),
  goalType: Type.Optional(Type.String()),
  institutionType: Type.Optional(Type.String()),
  archetypeId: Type.Optional(Type.Number()),
  privacy: Type.String(),
  iconEmoji: Type.String(),
  accentColor: Type.String(),
  bannerImageUrl: Type.Optional(Type.String()),
  logoImageUrl: Type.Optional(Type.String()),
  rules: Type.Optional(Type.String()),
  memberCount: Type.Number(),
  postCount: Type.Number(),
  isVerified: Type.Boolean(),
  isActive: Type.Boolean(),
  requiresApproval: Type.Boolean(),
  allowMemberPosts: Type.Boolean(),
  createdBy: Type.String(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  isMember: Type.Optional(Type.Boolean()),
  userRole: Type.Optional(Type.Number()),
  membershipStatus: Type.Optional(Type.String()),
}, { additionalProperties: true });

const CommunityMemberSchema = Type.Object({
  userId: Type.String(),
  username: Type.String(),
  displayName: Type.Optional(Type.String()),
  avatarUrl: Type.Optional(Type.String()),
  role: Type.Number(),
  title: Type.Optional(Type.String()),
  status: Type.String(),
  joinedAt: Type.String(),
  lastActiveAt: Type.Optional(Type.String()),
  showInMemberList: Type.Boolean(),
}, { additionalProperties: true });

const CommunityEventSchema = Type.Object({
  id: Type.String(),
  communityId: Type.Number(),
  virtualHangoutId: Type.Optional(Type.Number()),
  creatorId: Type.String(),
  title: Type.String(),
  description: Type.Optional(Type.String()),
  eventType: Type.String(),
  startsAt: Type.String(),
  endsAt: Type.Optional(Type.String()),
  timezone: Type.String(),
  locationName: Type.Optional(Type.String()),
  locationAddress: Type.Optional(Type.String()),
  isVirtual: Type.Boolean(),
  virtualUrl: Type.Optional(Type.String()),
  maxParticipants: Type.Optional(Type.Number()),
  participantCount: Type.Number(),
  status: Type.String(),
  createdAt: Type.String(),
}, { additionalProperties: true });

const BulletinPostSchema = Type.Object({
  id: Type.String(),
  boardId: Type.Number(),
  authorId: Type.Optional(Type.String()),
  authorUsername: Type.Optional(Type.String()),
  authorDisplayName: Type.Optional(Type.String()),
  authorAvatarUrl: Type.Optional(Type.String()),
  title: Type.String(),
  content: Type.String(),
  contentLang: Type.String(),
  postType: Type.String(),
  mediaUrls: Type.Array(Type.String()),
  linkedWorkoutId: Type.Optional(Type.String()),
  linkedMilestoneId: Type.Optional(Type.String()),
  upvotes: Type.Number(),
  downvotes: Type.Number(),
  score: Type.Number(),
  commentCount: Type.Number(),
  viewCount: Type.Number(),
  isPinned: Type.Boolean(),
  isHighlighted: Type.Boolean(),
  isHidden: Type.Boolean(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  userVote: Type.Optional(Type.String()),
}, { additionalProperties: true });

const BulletinCommentSchema = Type.Object({
  id: Type.String(),
  postId: Type.String(),
  parentId: Type.Optional(Type.String()),
  authorId: Type.Optional(Type.String()),
  authorUsername: Type.Optional(Type.String()),
  authorDisplayName: Type.Optional(Type.String()),
  authorAvatarUrl: Type.Optional(Type.String()),
  content: Type.String(),
  upvotes: Type.Number(),
  downvotes: Type.Number(),
  score: Type.Number(),
  replyCount: Type.Number(),
  isHidden: Type.Boolean(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  userVote: Type.Optional(Type.String()),
  replies: Type.Optional(Type.Array(Type.Any())),
}, { additionalProperties: true });

export default apiClient;
