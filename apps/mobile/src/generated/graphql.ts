import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
};

export type Achievement = {
  __typename: 'Achievement';
  description: Scalars['String']['output'];
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  rarity: Scalars['String']['output'];
  unlockedAt: Scalars['DateTime']['output'];
};

export type AchievementDefinition = {
  __typename: 'AchievementDefinition';
  category: Scalars['String']['output'];
  creditsReward?: Maybe<Scalars['Int']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
  points: Scalars['Int']['output'];
  rarity: Scalars['String']['output'];
  requiresVerification?: Maybe<Scalars['Boolean']['output']>;
  tier?: Maybe<Scalars['Int']['output']>;
  unlockHint?: Maybe<Scalars['String']['output']>;
  xpReward?: Maybe<Scalars['Int']['output']>;
};

export type AchievementResult = {
  __typename: 'AchievementResult';
  achievements: Array<UserAchievement>;
  total: Scalars['Int']['output'];
};

export type AchievementSummary = {
  __typename: 'AchievementSummary';
  byCategory: Scalars['JSON']['output'];
  byRarity: Scalars['JSON']['output'];
  recentAchievements: Array<UserAchievement>;
  totalAchievements: Scalars['Int']['output'];
  totalCredits: Scalars['Int']['output'];
  totalPoints: Scalars['Int']['output'];
  totalXp: Scalars['Int']['output'];
};

export type AchievementVerification = {
  __typename: 'AchievementVerification';
  achievementId: Scalars['ID']['output'];
  achievementKey?: Maybe<Scalars['String']['output']>;
  achievementName?: Maybe<Scalars['String']['output']>;
  achievementTier?: Maybe<Scalars['String']['output']>;
  avatarUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  displayName?: Maybe<Scalars['String']['output']>;
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  rejectionReason?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  submittedAt: Scalars['DateTime']['output'];
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
  username?: Maybe<Scalars['String']['output']>;
  verifiedAt?: Maybe<Scalars['DateTime']['output']>;
  videoDurationSeconds?: Maybe<Scalars['Int']['output']>;
  videoUrl?: Maybe<Scalars['String']['output']>;
  witness?: Maybe<WitnessInfo>;
};

/** Verification status */
export type AchievementVerificationStatus =
  | 'approved'
  | 'expired'
  | 'pending'
  | 'rejected';

export type ActionItem = {
  __typename: 'ActionItem';
  action: Scalars['String']['output'];
  completed: Scalars['Boolean']['output'];
};

/** Comment on an activity item */
export type ActivityComment = {
  __typename: 'ActivityComment';
  activityId: Scalars['ID']['output'];
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  parentId?: Maybe<Scalars['ID']['output']>;
  user: UserSummary;
  userId: Scalars['ID']['output'];
};

/** Result for activity comments query */
export type ActivityCommentsResult = {
  __typename: 'ActivityCommentsResult';
  items: Array<ActivityComment>;
  nextCursor?: Maybe<Scalars['String']['output']>;
  total: Scalars['Int']['output'];
};

export type ActivityEvent = {
  __typename: 'ActivityEvent';
  id: Scalars['ID']['output'];
  message: Scalars['String']['output'];
  timestamp: Scalars['DateTime']['output'];
  type: Scalars['String']['output'];
};

/** Filter for activity feed */
export type ActivityFeedFilter = {
  activityTypes?: InputMaybe<Array<Scalars['String']['input']>>;
  followedOnly?: InputMaybe<Scalars['Boolean']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

/** Activity feed result with pagination */
export type ActivityFeedResult = {
  __typename: 'ActivityFeedResult';
  hasMore: Scalars['Boolean']['output'];
  items: Array<ActivityItem>;
  nextCursor?: Maybe<Scalars['String']['output']>;
};

/** Activity feed item */
export type ActivityItem = {
  __typename: 'ActivityItem';
  activityType: Scalars['String']['output'];
  commentCount: Scalars['Int']['output'];
  comments?: Maybe<Array<ActivityComment>>;
  createdAt: Scalars['DateTime']['output'];
  data: Scalars['JSON']['output'];
  hasHighFived: Scalars['Boolean']['output'];
  highFiveCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  referenceId?: Maybe<Scalars['ID']['output']>;
  referenceType?: Maybe<Scalars['String']['output']>;
  user: UserSummary;
  userId: Scalars['ID']['output'];
  visibility: Scalars['String']['output'];
};

export type AdminSubmissionResult = {
  __typename: 'AdminSubmissionResult';
  message?: Maybe<Scalars['String']['output']>;
  submission?: Maybe<VenueSubmission>;
  success: Scalars['Boolean']['output'];
  venue?: Maybe<OutdoorVenue>;
};

export type AdminSyncResult = {
  __typename: 'AdminSyncResult';
  errors?: Maybe<Array<Scalars['String']['output']>>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  venuesCreated: Scalars['Int']['output'];
  venuesUpdated: Scalars['Int']['output'];
};

/** Age verification levels */
export type AgeVerificationLevel =
  | 'id_verified'
  | 'none'
  | 'payment_verified'
  | 'self_declared';

/** Age verification result */
export type AgeVerificationResult = {
  __typename: 'AgeVerificationResult';
  isMinor: Scalars['Boolean']['output'];
  message?: Maybe<Scalars['String']['output']>;
  restrictionsApplied: Scalars['Boolean']['output'];
  success: Scalars['Boolean']['output'];
  verificationLevel: AgeVerificationLevel;
};

export type AllTimeTuLeaderboardEntry = {
  __typename: 'AllTimeTuLeaderboardEntry';
  activeYears: Scalars['Int']['output'];
  avatarUrl?: Maybe<Scalars['String']['output']>;
  lifetimePrs: Scalars['Int']['output'];
  lifetimeTu: Scalars['Float']['output'];
  lifetimeVolumeLbs: Scalars['Float']['output'];
  lifetimeWorkouts: Scalars['Int']['output'];
  rank: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};

export type Archetype = {
  __typename: 'Archetype';
  bonuses?: Maybe<Scalars['JSON']['output']>;
  categoryId?: Maybe<Scalars['String']['output']>;
  color?: Maybe<Scalars['String']['output']>;
  description: Scalars['String']['output'];
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  levels?: Maybe<Array<ArchetypeLevel>>;
  name: Scalars['String']['output'];
  philosophy?: Maybe<Scalars['String']['output']>;
  primaryStats?: Maybe<Array<Scalars['String']['output']>>;
};

export type ArchetypeCategory = {
  __typename: 'ArchetypeCategory';
  archetypes: Array<Archetype>;
  description?: Maybe<Scalars['String']['output']>;
  displayOrder?: Maybe<Scalars['Int']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type ArchetypeLevel = {
  __typename: 'ArchetypeLevel';
  abilities: Array<Scalars['String']['output']>;
  bonuses?: Maybe<Scalars['JSON']['output']>;
  level: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  xpRequired: Scalars['Int']['output'];
};

export type ArchetypeNutritionProfile = {
  __typename: 'ArchetypeNutritionProfile';
  archetypeId: Scalars['ID']['output'];
  archetypeName: Scalars['String']['output'];
  carbsRatio: Scalars['Float']['output'];
  fatRatio: Scalars['Float']['output'];
  mealTiming?: Maybe<Array<Scalars['String']['output']>>;
  postworkoutRecommendations?: Maybe<Array<Scalars['String']['output']>>;
  preworkoutRecommendations?: Maybe<Array<Scalars['String']['output']>>;
  proteinRatio: Scalars['Float']['output'];
  recommendedCalories?: Maybe<Scalars['Int']['output']>;
  supplements?: Maybe<Array<Scalars['String']['output']>>;
  tips?: Maybe<Array<Scalars['String']['output']>>;
};

export type ArchetypeSelection = {
  __typename: 'ArchetypeSelection';
  archetype: Archetype;
  journey: JourneyProgress;
  success: Scalars['Boolean']['output'];
};

export type AttendanceResult = {
  __typename: 'AttendanceResult';
  attendeeCount: Scalars['Int']['output'];
  wageEarned: Scalars['Int']['output'];
};

export type AttendeeInput = {
  attended: Scalars['Boolean']['input'];
  feedback?: InputMaybe<Scalars['String']['input']>;
  rating?: InputMaybe<Scalars['Int']['input']>;
  userId: Scalars['ID']['input'];
};

export type AuthPayload = {
  __typename: 'AuthPayload';
  token: Scalars['String']['output'];
  user: User;
};

export type AutoRegulateInput = {
  exerciseIds: Array<Scalars['ID']['input']>;
  targetRpe?: InputMaybe<Scalars['Int']['input']>;
};

export type AutoRegulationContext = {
  __typename: 'AutoRegulationContext';
  fatigueLevel: Scalars['String']['output'];
  fatigueScore: Scalars['Int']['output'];
  overallRecommendation: Scalars['String']['output'];
};

export type AutoRegulationResult = {
  __typename: 'AutoRegulationResult';
  context: AutoRegulationContext;
  suggestions: Array<AutoRegulationSuggestion>;
};

export type AutoRegulationSuggestion = {
  __typename: 'AutoRegulationSuggestion';
  adjustmentPercent: Scalars['Int']['output'];
  confidence: Scalars['String']['output'];
  currentWeight?: Maybe<Scalars['Float']['output']>;
  exerciseId: Scalars['ID']['output'];
  exerciseName?: Maybe<Scalars['String']['output']>;
  reasoning: Scalars['String']['output'];
  suggestedReps: Scalars['Int']['output'];
  suggestedWeight: Scalars['Float']['output'];
  targetRpe: Scalars['Int']['output'];
};

export type Avatar = {
  __typename: 'Avatar';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  rarity: Scalars['String']['output'];
  unlockLevel: Scalars['Int']['output'];
};

export type Balance = {
  __typename: 'Balance';
  credits: Scalars['Int']['output'];
  lifetime: Scalars['Int']['output'];
  pending: Scalars['Int']['output'];
};

export type BestMonthHighlight = {
  __typename: 'BestMonthHighlight';
  month: Scalars['Int']['output'];
  tu: Scalars['Float']['output'];
};

export type BestPeriod = {
  __typename: 'BestPeriod';
  month: Scalars['Int']['output'];
  tu: Scalars['Float']['output'];
  year: Scalars['Int']['output'];
};

export type BestQuarter = {
  __typename: 'BestQuarter';
  quarter: Scalars['Int']['output'];
  tu: Scalars['Float']['output'];
  year: Scalars['Int']['output'];
};

export type BestYear = {
  __typename: 'BestYear';
  tu: Scalars['Float']['output'];
  year: Scalars['Int']['output'];
};

export type BiggestPrHighlight = {
  __typename: 'BiggestPrHighlight';
  exerciseId: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  weight: Scalars['Float']['output'];
};

export type BlockStatus = {
  __typename: 'BlockStatus';
  blockedBy: Scalars['Boolean']['output'];
  isBlocked: Scalars['Boolean']['output'];
};

export type BodyMeasurement = {
  __typename: 'BodyMeasurement';
  bodyFatPercentage?: Maybe<Scalars['Float']['output']>;
  chestCm?: Maybe<Scalars['Float']['output']>;
  createdAt: Scalars['DateTime']['output'];
  hipsCm?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  leanMassKg?: Maybe<Scalars['Float']['output']>;
  leftBicepCm?: Maybe<Scalars['Float']['output']>;
  leftCalfCm?: Maybe<Scalars['Float']['output']>;
  leftForearmCm?: Maybe<Scalars['Float']['output']>;
  leftThighCm?: Maybe<Scalars['Float']['output']>;
  measurementDate: Scalars['DateTime']['output'];
  measurementSource?: Maybe<Scalars['String']['output']>;
  neckCm?: Maybe<Scalars['Float']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  rightBicepCm?: Maybe<Scalars['Float']['output']>;
  rightCalfCm?: Maybe<Scalars['Float']['output']>;
  rightForearmCm?: Maybe<Scalars['Float']['output']>;
  rightThighCm?: Maybe<Scalars['Float']['output']>;
  shouldersCm?: Maybe<Scalars['Float']['output']>;
  userId: Scalars['ID']['output'];
  waistCm?: Maybe<Scalars['Float']['output']>;
  weightKg?: Maybe<Scalars['Float']['output']>;
};

export type BodyMeasurementComparison = {
  __typename: 'BodyMeasurementComparison';
  bodyFatPercentage?: Maybe<BodyMeasurementComparisonField>;
  chestCm?: Maybe<BodyMeasurementComparisonField>;
  currentDate?: Maybe<Scalars['DateTime']['output']>;
  daysBetween?: Maybe<Scalars['Int']['output']>;
  hipsCm?: Maybe<BodyMeasurementComparisonField>;
  leanMassKg?: Maybe<BodyMeasurementComparisonField>;
  leftBicepCm?: Maybe<BodyMeasurementComparisonField>;
  leftCalfCm?: Maybe<BodyMeasurementComparisonField>;
  leftForearmCm?: Maybe<BodyMeasurementComparisonField>;
  leftThighCm?: Maybe<BodyMeasurementComparisonField>;
  neckCm?: Maybe<BodyMeasurementComparisonField>;
  pastDate?: Maybe<Scalars['DateTime']['output']>;
  rightBicepCm?: Maybe<BodyMeasurementComparisonField>;
  rightCalfCm?: Maybe<BodyMeasurementComparisonField>;
  rightForearmCm?: Maybe<BodyMeasurementComparisonField>;
  rightThighCm?: Maybe<BodyMeasurementComparisonField>;
  shouldersCm?: Maybe<BodyMeasurementComparisonField>;
  waistCm?: Maybe<BodyMeasurementComparisonField>;
  weightKg?: Maybe<BodyMeasurementComparisonField>;
};

export type BodyMeasurementComparisonField = {
  __typename: 'BodyMeasurementComparisonField';
  change?: Maybe<Scalars['Float']['output']>;
  changePercent?: Maybe<Scalars['String']['output']>;
  current?: Maybe<Scalars['Float']['output']>;
  past?: Maybe<Scalars['Float']['output']>;
};

export type BodyMeasurementHistory = {
  __typename: 'BodyMeasurementHistory';
  history: Array<BodyMeasurementHistoryEntry>;
  stats?: Maybe<BodyMeasurementHistoryStats>;
};

export type BodyMeasurementHistoryEntry = {
  __typename: 'BodyMeasurementHistoryEntry';
  measurementDate: Scalars['DateTime']['output'];
  value: Scalars['Float']['output'];
};

export type BodyMeasurementHistoryStats = {
  __typename: 'BodyMeasurementHistoryStats';
  change?: Maybe<Scalars['Float']['output']>;
  changePercent?: Maybe<Scalars['String']['output']>;
  current?: Maybe<Scalars['Float']['output']>;
  max?: Maybe<Scalars['Float']['output']>;
  min?: Maybe<Scalars['Float']['output']>;
};

export type BodyMeasurementInput = {
  bodyFatPercentage?: InputMaybe<Scalars['Float']['input']>;
  chestCm?: InputMaybe<Scalars['Float']['input']>;
  hipsCm?: InputMaybe<Scalars['Float']['input']>;
  leanMassKg?: InputMaybe<Scalars['Float']['input']>;
  leftBicepCm?: InputMaybe<Scalars['Float']['input']>;
  leftCalfCm?: InputMaybe<Scalars['Float']['input']>;
  leftForearmCm?: InputMaybe<Scalars['Float']['input']>;
  leftThighCm?: InputMaybe<Scalars['Float']['input']>;
  measurementDate: Scalars['String']['input'];
  measurementSource?: InputMaybe<Scalars['String']['input']>;
  neckCm?: InputMaybe<Scalars['Float']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  rightBicepCm?: InputMaybe<Scalars['Float']['input']>;
  rightCalfCm?: InputMaybe<Scalars['Float']['input']>;
  rightForearmCm?: InputMaybe<Scalars['Float']['input']>;
  rightThighCm?: InputMaybe<Scalars['Float']['input']>;
  shouldersCm?: InputMaybe<Scalars['Float']['input']>;
  waistCm?: InputMaybe<Scalars['Float']['input']>;
  weightKg?: InputMaybe<Scalars['Float']['input']>;
};

export type BodyMeasurementsResult = {
  __typename: 'BodyMeasurementsResult';
  measurements: Array<BodyMeasurement>;
  pagination: PaginationInfo;
};

export type BodyRegion = {
  __typename: 'BodyRegion';
  children?: Maybe<Array<BodyRegionChild>>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type BodyRegionChild = {
  __typename: 'BodyRegionChild';
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type BonusEvent = {
  __typename: 'BonusEvent';
  createdAt: Scalars['DateTime']['output'];
  creditsAwarded: Scalars['Int']['output'];
  eventType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

export type BonusEventResult = {
  __typename: 'BonusEventResult';
  creditsAwarded?: Maybe<Scalars['Int']['output']>;
  eventId?: Maybe<Scalars['ID']['output']>;
  eventType?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  triggered: Scalars['Boolean']['output'];
};

export type BonusEventType = {
  __typename: 'BonusEventType';
  animation?: Maybe<Scalars['String']['output']>;
  code: Scalars['String']['output'];
  color?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  enabled: Scalars['Boolean']['output'];
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  maxCredits: Scalars['Int']['output'];
  maxPerDay: Scalars['Int']['output'];
  maxPerWeek: Scalars['Int']['output'];
  minCredits: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  probability: Scalars['Float']['output'];
  triggerOn: Scalars['String']['output'];
};

export type Buddy = {
  __typename: 'Buddy';
  createdAt: Scalars['DateTime']['output'];
  equippedArmor?: Maybe<Scalars['String']['output']>;
  equippedAura?: Maybe<Scalars['String']['output']>;
  equippedEmotePack?: Maybe<Scalars['String']['output']>;
  equippedSkin?: Maybe<Scalars['String']['output']>;
  equippedTool?: Maybe<Scalars['String']['output']>;
  equippedVoicePack?: Maybe<Scalars['String']['output']>;
  equippedWings?: Maybe<Scalars['String']['output']>;
  level: Scalars['Int']['output'];
  nickname?: Maybe<Scalars['String']['output']>;
  prsCelebrated: Scalars['Int']['output'];
  showInWorkouts: Scalars['Boolean']['output'];
  showOnProfile: Scalars['Boolean']['output'];
  species: Scalars['String']['output'];
  stage: Scalars['Int']['output'];
  stageDescription?: Maybe<Scalars['String']['output']>;
  stageName: Scalars['String']['output'];
  streaksWitnessed: Scalars['Int']['output'];
  totalXpEarned: Scalars['Int']['output'];
  unlockedAbilities: Array<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
  visible: Scalars['Boolean']['output'];
  workoutsTogether: Scalars['Int']['output'];
  xp: Scalars['Int']['output'];
  xpToNextLevel: Scalars['Int']['output'];
};

/** Buddy check-in */
export type BuddyCheckIn = {
  __typename: 'BuddyCheckIn';
  buddyPairId: Scalars['ID']['output'];
  checkInDate: Scalars['String']['output'];
  checkInType: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  message?: Maybe<Scalars['String']['output']>;
  moodRating?: Maybe<Scalars['Int']['output']>;
  user: UserSummary;
  userId: Scalars['ID']['output'];
  workoutId?: Maybe<Scalars['ID']['output']>;
};

/** Input for buddy check-in */
export type BuddyCheckInInput = {
  buddyPairId: Scalars['ID']['input'];
  checkInType: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  moodRating?: InputMaybe<Scalars['Int']['input']>;
  workoutId?: InputMaybe<Scalars['ID']['input']>;
};

export type BuddyEvolutionStage = {
  __typename: 'BuddyEvolutionStage';
  description?: Maybe<Scalars['String']['output']>;
  minLevel: Scalars['Int']['output'];
  species: Scalars['String']['output'];
  stage: Scalars['Int']['output'];
  stageName: Scalars['String']['output'];
  unlockedFeatures: Array<Scalars['String']['output']>;
};

export type BuddyInventoryItem = {
  __typename: 'BuddyInventoryItem';
  category: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  equipped: Scalars['Boolean']['output'];
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  rarity?: Maybe<Scalars['String']['output']>;
  sku: Scalars['String']['output'];
  slot?: Maybe<Scalars['String']['output']>;
};

/** Buddy invite */
export type BuddyInvite = {
  __typename: 'BuddyInvite';
  compatibilityScore?: Maybe<Scalars['Float']['output']>;
  createdAt: Scalars['DateTime']['output'];
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  matchReasons: Array<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  recipient: UserSummary;
  sender: UserSummary;
  status: Scalars['String']['output'];
};

/** Response from buddy invite action */
export type BuddyInviteResponse = {
  __typename: 'BuddyInviteResponse';
  buddyPair?: Maybe<WorkoutBuddyPair>;
  invite?: Maybe<BuddyInvite>;
  success: Scalars['Boolean']['output'];
};

/** Result for buddy invites query */
export type BuddyInvitesResult = {
  __typename: 'BuddyInvitesResult';
  received: Array<BuddyInvite>;
  sent: Array<BuddyInvite>;
};

export type BuddyLeaderboardEntry = {
  __typename: 'BuddyLeaderboardEntry';
  level: Scalars['Int']['output'];
  nickname?: Maybe<Scalars['String']['output']>;
  rank: Scalars['Int']['output'];
  species: Scalars['String']['output'];
  stage: Scalars['Int']['output'];
  stageName: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};

export type BuddyLeaderboardResult = {
  __typename: 'BuddyLeaderboardResult';
  entries: Array<BuddyLeaderboardEntry>;
  total: Scalars['Int']['output'];
};

/** Buddy match from potential matches view */
export type BuddyMatch = {
  __typename: 'BuddyMatch';
  bothVirtualOk: Scalars['Boolean']['output'];
  compatibilityScore: Scalars['Float']['output'];
  distanceKm?: Maybe<Scalars['Float']['output']>;
  matchReasons: Array<Scalars['String']['output']>;
  overlappingGoals: Scalars['Boolean']['output'];
  overlappingTimes: Scalars['Boolean']['output'];
  overlappingWorkouts: Scalars['Boolean']['output'];
  sameLevel: Scalars['Boolean']['output'];
  user: UserSummary;
};

/** Buddy message */
export type BuddyMessage = {
  __typename: 'BuddyMessage';
  buddyPairId: Scalars['ID']['output'];
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isRead: Scalars['Boolean']['output'];
  messageType: Scalars['String']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  readAt?: Maybe<Scalars['DateTime']['output']>;
  sender: UserSummary;
  senderId: Scalars['ID']['output'];
};

/** Buddy messages result with pagination */
export type BuddyMessagesResult = {
  __typename: 'BuddyMessagesResult';
  hasMore: Scalars['Boolean']['output'];
  messages: Array<BuddyMessage>;
  nextCursor?: Maybe<Scalars['String']['output']>;
};

/** Input for buddy preferences */
export type BuddyPreferencesInput = {
  city?: InputMaybe<Scalars['String']['input']>;
  fitnessLevel?: InputMaybe<Scalars['String']['input']>;
  goals?: InputMaybe<Array<Scalars['String']['input']>>;
  isLookingForBuddy?: InputMaybe<Scalars['Boolean']['input']>;
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  matchSimilarLevel?: InputMaybe<Scalars['Boolean']['input']>;
  maxDistanceKm?: InputMaybe<Scalars['Int']['input']>;
  openToInPerson?: InputMaybe<Scalars['Boolean']['input']>;
  openToVirtualWorkouts?: InputMaybe<Scalars['Boolean']['input']>;
  preferredDays?: InputMaybe<Array<Scalars['Int']['input']>>;
  preferredTimes?: InputMaybe<Array<Scalars['String']['input']>>;
  preferredWorkoutTypes?: InputMaybe<Array<Scalars['String']['input']>>;
  timezone?: InputMaybe<Scalars['String']['input']>;
  wantsDailyCheckins?: InputMaybe<Scalars['Boolean']['input']>;
  wantsWorkoutReminders?: InputMaybe<Scalars['Boolean']['input']>;
};

export type BuddySettingsInput = {
  showInWorkouts?: InputMaybe<Scalars['Boolean']['input']>;
  showOnProfile?: InputMaybe<Scalars['Boolean']['input']>;
  visible?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Buddy suggestion */
export type BuddySuggestion = {
  __typename: 'BuddySuggestion';
  compatibilityScore: Scalars['Float']['output'];
  distanceKm?: Maybe<Scalars['Float']['output']>;
  matchReasons: Array<Scalars['String']['output']>;
  overlappingGoals: Scalars['Boolean']['output'];
  overlappingTimes: Scalars['Boolean']['output'];
  overlappingWorkouts: Scalars['Boolean']['output'];
  user: UserSummary;
};

export type BuddyXpResult = {
  __typename: 'BuddyXpResult';
  evolved: Scalars['Boolean']['output'];
  leveledUp: Scalars['Boolean']['output'];
  newLevel: Scalars['Int']['output'];
  newStage: Scalars['Int']['output'];
  newXp: Scalars['Int']['output'];
};

/** Ability to message a specific user */
export type CanMessageResult = {
  __typename: 'CanMessageResult';
  canMessage: Scalars['Boolean']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  requiresRequest: Scalars['Boolean']['output'];
};

/** Ability to upgrade conversation to E2EE */
export type CanUpgradeResult = {
  __typename: 'CanUpgradeResult';
  canUpgrade: Scalars['Boolean']['output'];
  missingUsers?: Maybe<Array<Scalars['ID']['output']>>;
};

export type Capabilities = {
  __typename: 'Capabilities';
  canCreateWorkout: Scalars['Boolean']['output'];
  canJoinHangouts: Scalars['Boolean']['output'];
  canMessage: Scalars['Boolean']['output'];
  canVote: Scalars['Boolean']['output'];
  dailyWorkoutLimit: Scalars['Int']['output'];
  isAdmin: Scalars['Boolean']['output'];
  isPremium: Scalars['Boolean']['output'];
  remainingWorkouts: Scalars['Int']['output'];
};

export type CareerAssessment = {
  __typename: 'CareerAssessment';
  assessedAt: Scalars['DateTime']['output'];
  assessmentType: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  passed?: Maybe<Scalars['Boolean']['output']>;
  results: Scalars['JSON']['output'];
  standardId: Scalars['ID']['output'];
  totalScore?: Maybe<Scalars['Float']['output']>;
  userId: Scalars['ID']['output'];
};

export type CareerAssessmentInput = {
  assessedAt?: InputMaybe<Scalars['String']['input']>;
  assessmentType: Scalars['String']['input'];
  results: Scalars['JSON']['input'];
  standardId: Scalars['ID']['input'];
};

export type CareerGoal = {
  __typename: 'CareerGoal';
  agencyName?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  daysRemaining?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  priority: Scalars['String']['output'];
  readiness?: Maybe<CareerReadiness>;
  standard?: Maybe<CareerStandard>;
  standardId: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  targetDate?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type CareerGoalInput = {
  agencyName?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['String']['input']>;
  standardId: Scalars['ID']['input'];
  targetDate?: InputMaybe<Scalars['String']['input']>;
};

export type CareerGoalUpdateInput = {
  agencyName?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  targetDate?: InputMaybe<Scalars['String']['input']>;
};

export type CareerReadiness = {
  __typename: 'CareerReadiness';
  eventBreakdown: Array<EventReadiness>;
  eventsPassed: Scalars['Int']['output'];
  eventsTotal: Scalars['Int']['output'];
  lastAssessmentAt?: Maybe<Scalars['String']['output']>;
  score?: Maybe<Scalars['Float']['output']>;
  status: Scalars['String']['output'];
  trend?: Maybe<Scalars['String']['output']>;
  trendDelta?: Maybe<Scalars['Float']['output']>;
  weakEvents: Array<Scalars['String']['output']>;
};

export type CareerStandard = {
  __typename: 'CareerStandard';
  agency?: Maybe<Scalars['String']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  eventCount: Scalars['Int']['output'];
  events: Array<CareerStandardEvent>;
  fullName?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  maxScore?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  officialUrl?: Maybe<Scalars['String']['output']>;
  passingScore?: Maybe<Scalars['Int']['output']>;
  recertificationPeriodMonths?: Maybe<Scalars['Int']['output']>;
  scoringType: Scalars['String']['output'];
};

export type CareerStandardCategory = {
  __typename: 'CareerStandardCategory';
  category: Scalars['String']['output'];
  count: Scalars['Int']['output'];
  icon: Scalars['String']['output'];
};

export type CareerStandardEvent = {
  __typename: 'CareerStandardEvent';
  description?: Maybe<Scalars['String']['output']>;
  direction?: Maybe<Scalars['String']['output']>;
  exerciseMappings?: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['ID']['output'];
  metricType?: Maybe<Scalars['String']['output']>;
  metricUnit?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  orderIndex: Scalars['Int']['output'];
  passingThreshold?: Maybe<Scalars['Float']['output']>;
  tips?: Maybe<Array<Scalars['String']['output']>>;
};

export type CategoryCount = {
  __typename: 'CategoryCount';
  category: Scalars['String']['output'];
  count: Scalars['Int']['output'];
};

/** Challenge contribution */
export type ChallengeContribution = {
  __typename: 'ChallengeContribution';
  challengeId: Scalars['ID']['output'];
  contributionValue: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  crewId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  userId: Scalars['ID']['output'];
  workoutId?: Maybe<Scalars['ID']['output']>;
};

/** Challenge contributor summary */
export type ChallengeContributor = {
  __typename: 'ChallengeContributor';
  contribution: Scalars['Float']['output'];
  rank: Scalars['Int']['output'];
  user: UserSummary;
};

export type ChangePasswordInput = {
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
};

export type ChangePasswordResult = {
  __typename: 'ChangePasswordResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type CharacterStats = {
  __typename: 'CharacterStats';
  agility: Scalars['Int']['output'];
  balance: Scalars['Int']['output'];
  currentStreak: Scalars['Int']['output'];
  endurance: Scalars['Int']['output'];
  flexibility: Scalars['Int']['output'];
  lastWorkoutAt?: Maybe<Scalars['DateTime']['output']>;
  level: Scalars['Int']['output'];
  longestStreak: Scalars['Int']['output'];
  mentalFocus: Scalars['Int']['output'];
  strength: Scalars['Int']['output'];
  totalExercises: Scalars['Int']['output'];
  totalWorkouts: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
  xp: Scalars['Int']['output'];
  xpToNextLevel: Scalars['Int']['output'];
};

export type ChargeInput = {
  action: Scalars['String']['input'];
  amount: Scalars['Int']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
};

export type ChargeResult = {
  __typename: 'ChargeResult';
  error?: Maybe<Scalars['String']['output']>;
  newBalance: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
  transaction?: Maybe<Transaction>;
};

export type ClaimSetRewardResult = {
  __typename: 'ClaimSetRewardResult';
  reward?: Maybe<ClaimedReward>;
  success: Scalars['Boolean']['output'];
};

/** Input for claiming a venue record */
export type ClaimVenueRecordInput = {
  conditions?: InputMaybe<Scalars['JSON']['input']>;
  exerciseId: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  recordType: RecordType;
  recordUnit: Scalars['String']['input'];
  recordValue: Scalars['Float']['input'];
  repsAtWeight?: InputMaybe<Scalars['Int']['input']>;
  setId?: InputMaybe<Scalars['String']['input']>;
  venueId: Scalars['ID']['input'];
  weightAtReps?: InputMaybe<Scalars['Float']['input']>;
  workoutSessionId?: InputMaybe<Scalars['ID']['input']>;
};

export type ClaimedReward = {
  __typename: 'ClaimedReward';
  description?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type ClassAttendance = {
  __typename: 'ClassAttendance';
  attended: Scalars['Boolean']['output'];
  classId: Scalars['ID']['output'];
  feedback?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  markedAt: Scalars['DateTime']['output'];
  markedBy: Scalars['ID']['output'];
  rating?: Maybe<Scalars['Int']['output']>;
  userId: Scalars['ID']['output'];
  wageTxId?: Maybe<Scalars['String']['output']>;
};

export type ClassEnrollment = {
  __typename: 'ClassEnrollment';
  cancelledAt?: Maybe<Scalars['DateTime']['output']>;
  class?: Maybe<TrainerClass>;
  classId: Scalars['ID']['output'];
  creditsPaid: Scalars['Int']['output'];
  enrolledAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  paymentTxId?: Maybe<Scalars['String']['output']>;
  refundTxId?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

/** Class status */
export type ClassStatus =
  | 'cancelled'
  | 'completed'
  | 'in_progress'
  | 'scheduled';

export type ClusterInput = {
  bounds: MapBoundsInput;
  zoom: Scalars['Int']['input'];
};

export type CollectionFavoriteResult = {
  __typename: 'CollectionFavoriteResult';
  id: Scalars['ID']['output'];
  isFavorite: Scalars['Boolean']['output'];
};

export type CollectionItem = {
  __typename: 'CollectionItem';
  acquiredAt: Scalars['String']['output'];
  category?: Maybe<Scalars['String']['output']>;
  cosmeticId: Scalars['ID']['output'];
  description?: Maybe<Scalars['String']['output']>;
  estimatedValue?: Maybe<Scalars['Int']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isFavorite: Scalars['Boolean']['output'];
  isGiftable?: Maybe<Scalars['Boolean']['output']>;
  isNew: Scalars['Boolean']['output'];
  isTradeable?: Maybe<Scalars['Boolean']['output']>;
  name: Scalars['String']['output'];
  previewUrl?: Maybe<Scalars['String']['output']>;
  rarity: Scalars['String']['output'];
};

export type CollectionItemsResult = {
  __typename: 'CollectionItemsResult';
  hasMore: Scalars['Boolean']['output'];
  items: Array<CollectionItem>;
  total: Scalars['Int']['output'];
};

export type CollectionSeenResult = {
  __typename: 'CollectionSeenResult';
  success: Scalars['Boolean']['output'];
};

export type CollectionSet = {
  __typename: 'CollectionSet';
  description?: Maybe<Scalars['String']['output']>;
  expirationDate?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isLimited: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  ownedCount: Scalars['Int']['output'];
  rewards: Array<SetRewardInfo>;
  theme?: Maybe<Scalars['String']['output']>;
  totalCount: Scalars['Int']['output'];
};

export type CollectionSetDetail = {
  __typename: 'CollectionSetDetail';
  claimableRewards: Array<SetRewardInfo>;
  items: Array<SetItem>;
  progress: SetProgress;
  set: CollectionSet;
};

export type CollectionStats = {
  __typename: 'CollectionStats';
  categoryBreakdown: Array<CategoryCount>;
  completedSets: Scalars['Int']['output'];
  rarityBreakdown: Array<RarityCount>;
  totalOwned: Scalars['Int']['output'];
  totalValue: Scalars['Int']['output'];
};

export type CommunityMilestone = {
  __typename: 'CommunityMilestone';
  reached: Scalars['Boolean']['output'];
  type: Scalars['String']['output'];
  value: Scalars['Int']['output'];
};

export type CommunityPresenceData = {
  __typename: 'CommunityPresenceData';
  byGeoBucket: Array<GeoBucket>;
  redisEnabled: Scalars['Boolean']['output'];
  total: Scalars['Int']['output'];
};

export type CommunityStats = {
  __typename: 'CommunityStats';
  activeUsers: Scalars['Int']['output'];
  activeWorkouts: Scalars['Int']['output'];
  topArchetype?: Maybe<Scalars['String']['output']>;
  totalWorkoutsToday: Scalars['Int']['output'];
  totalWorkoutsWeek: Scalars['Int']['output'];
};

export type Competition = {
  __typename: 'Competition';
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  creatorId: Scalars['ID']['output'];
  description?: Maybe<Scalars['String']['output']>;
  endDate: Scalars['DateTime']['output'];
  entryFee?: Maybe<Scalars['Int']['output']>;
  goalTu?: Maybe<Scalars['Int']['output']>;
  hasJoined?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  isPublic: Scalars['Boolean']['output'];
  leaderboard?: Maybe<Array<CompetitionLeaderboardEntry>>;
  maxParticipants?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  participantCount: Scalars['Int']['output'];
  prizePool?: Maybe<Scalars['Int']['output']>;
  rules?: Maybe<Scalars['String']['output']>;
  startDate: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type CompetitionEntry = {
  __typename: 'CompetitionEntry';
  competition?: Maybe<Competition>;
  competitionId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  joinedAt: Scalars['DateTime']['output'];
  rank?: Maybe<Scalars['Int']['output']>;
  score: Scalars['Float']['output'];
  userId: Scalars['ID']['output'];
};

export type CompetitionInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  entryFee?: InputMaybe<Scalars['Int']['input']>;
  goalTu?: InputMaybe<Scalars['Int']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  maxParticipants?: InputMaybe<Scalars['Int']['input']>;
  name: Scalars['String']['input'];
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
  type: Scalars['String']['input'];
};

export type CompetitionJoinResult = {
  __typename: 'CompetitionJoinResult';
  entry?: Maybe<CompetitionEntry>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type CompetitionLeaderboardEntry = {
  __typename: 'CompetitionLeaderboardEntry';
  avatar?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  rank?: Maybe<Scalars['Int']['output']>;
  score: Scalars['Float']['output'];
  tuEarned: Scalars['Float']['output'];
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};

/** Competition status */
export type CompetitionStatus =
  | 'active'
  | 'cancelled'
  | 'completed'
  | 'upcoming';

export type CompleteWorkoutSessionInput = {
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  sessionId: Scalars['ID']['input'];
};

export type ConditionVoteCount = {
  __typename: 'ConditionVoteCount';
  condition: Scalars['String']['output'];
  count: Scalars['Int']['output'];
  percentage: Scalars['Float']['output'];
};

/** Result of voting on equipment condition */
export type ConditionVoteResult = {
  __typename: 'ConditionVoteResult';
  creditsEarned: Scalars['Int']['output'];
  equipment?: Maybe<EquipmentConditionInfo>;
  success: Scalars['Boolean']['output'];
};

/** Input for confirming file upload */
export type ConfirmFileUploadInput = {
  /** Hash of encrypted content */
  contentHash: Scalars['String']['input'];
  /** Base64 encoded encrypted symmetric key */
  encryptedKey: Scalars['String']['input'];
  uploadToken: Scalars['String']['input'];
};

/** User's content preferences and age verification */
export type ContentPreferences = {
  __typename: 'ContentPreferences';
  adultContentEnabled: Scalars['Boolean']['output'];
  ageVerificationLevel: AgeVerificationLevel;
  autoBlurNsfw: Scalars['Boolean']['output'];
  createdAt: Scalars['DateTime']['output'];
  dateOfBirth?: Maybe<Scalars['String']['output']>;
  isMinor: Scalars['Boolean']['output'];
  lastVerifiedAt?: Maybe<Scalars['DateTime']['output']>;
  nsfwWarningsEnabled: Scalars['Boolean']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
};

/** Content report result */
export type ContentReportResult = {
  __typename: 'ContentReportResult';
  reportId: Scalars['ID']['output'];
  success: Scalars['Boolean']['output'];
};

/** Content report types */
export type ContentReportType =
  | 'csam'
  | 'harassment'
  | 'illegal_content'
  | 'impersonation'
  | 'non_consensual'
  | 'other'
  | 'spam';

/** Contributor badge */
export type ContributorBadge = {
  __typename: 'ContributorBadge';
  description: Scalars['String']['output'];
  earnedAt: Scalars['DateTime']['output'];
  iconName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

/** Contributor leaderboard entry */
export type ContributorLeaderboardEntry = {
  __typename: 'ContributorLeaderboardEntry';
  rank: Scalars['Int']['output'];
  score: Scalars['Int']['output'];
  stats: ContributorStats;
  user: User;
  userId: Scalars['ID']['output'];
};

/** Contributor statistics */
export type ContributorStats = {
  __typename: 'ContributorStats';
  badges: Array<ContributorBadge>;
  level: Scalars['Int']['output'];
  levelName: Scalars['String']['output'];
  photosUploaded: Scalars['Int']['output'];
  pointsToNextLevel: Scalars['Int']['output'];
  rank?: Maybe<Scalars['Int']['output']>;
  reportsSubmitted: Scalars['Int']['output'];
  totalContributions: Scalars['Int']['output'];
  totalCreditsEarned: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
  venuesSubmitted: Scalars['Int']['output'];
  venuesVerified: Scalars['Int']['output'];
};

export type Conversation = {
  __typename: 'Conversation';
  archivedAt?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  disappearingTtl?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  lastMessage?: Maybe<ConversationLastMessage>;
  lastMessageAt?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  participants: Array<ConversationParticipant>;
  starred?: Maybe<Scalars['Boolean']['output']>;
  type: Scalars['String']['output'];
  typingUsers?: Maybe<Array<TypingUser>>;
  unreadCount: Scalars['Int']['output'];
  updatedAt: Scalars['String']['output'];
};

export type ConversationLastMessage = {
  __typename: 'ConversationLastMessage';
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  senderId: Scalars['ID']['output'];
};

export type ConversationParticipant = {
  __typename: 'ConversationParticipant';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  lastActiveAt?: Maybe<Scalars['String']['output']>;
  role?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};

/** Conversation type */
export type ConversationType =
  | 'community'
  | 'crew'
  | 'direct'
  | 'group';

/** Cooldown/stretching exercise */
export type CooldownExercise = {
  __typename: 'CooldownExercise';
  category: Scalars['String']['output'];
  duration: Scalars['Int']['output'];
  exerciseId: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  targetMuscles: Array<Scalars['String']['output']>;
};

export type CreateBuddyInput = {
  nickname?: InputMaybe<Scalars['String']['input']>;
  species: Scalars['String']['input'];
};

export type CreateCrewInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  tag: Scalars['String']['input'];
};

export type CreateProgramInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  daysPerWeek: Scalars['Int']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  difficulty?: InputMaybe<Scalars['String']['input']>;
  durationWeeks: Scalars['Int']['input'];
  equipmentRequired?: InputMaybe<Array<Scalars['String']['input']>>;
  goals?: InputMaybe<Array<Scalars['String']['input']>>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  progressionRules?: InputMaybe<Scalars['JSON']['input']>;
  schedule: Array<ProgramDayInput>;
  shortDescription?: InputMaybe<Scalars['String']['input']>;
  targetMuscles?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateTradeInput = {
  initiatorCredits?: InputMaybe<Scalars['Int']['input']>;
  initiatorItems?: InputMaybe<Array<Scalars['ID']['input']>>;
  message?: InputMaybe<Scalars['String']['input']>;
  receiverCredits?: InputMaybe<Scalars['Int']['input']>;
  receiverId: Scalars['ID']['input'];
  receiverItems?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CreateTradeResult = {
  __typename: 'CreateTradeResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  trade?: Maybe<Trade>;
  valueWarning?: Maybe<Scalars['String']['output']>;
};

export type CreateTrainerClassInput = {
  capacity: Scalars['Int']['input'];
  category: Scalars['String']['input'];
  creditsPerStudent: Scalars['Int']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  difficulty: Scalars['String']['input'];
  durationMinutes: Scalars['Int']['input'];
  hangoutId?: InputMaybe<Scalars['Int']['input']>;
  locationDetails?: InputMaybe<Scalars['String']['input']>;
  locationType: Scalars['String']['input'];
  startAt: Scalars['DateTime']['input'];
  title: Scalars['String']['input'];
  trainerWagePerStudent: Scalars['Int']['input'];
  virtualHangoutId?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateWorkoutTemplateInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  difficulty?: InputMaybe<Scalars['String']['input']>;
  durationMinutes?: InputMaybe<Scalars['Int']['input']>;
  equipmentRequired?: InputMaybe<Array<Scalars['String']['input']>>;
  exercises: Array<TemplateExerciseInput>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  targetMuscles?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreditEarningSummary = {
  __typename: 'CreditEarningSummary';
  balance: Scalars['Int']['output'];
  dailyAverage: Scalars['Float']['output'];
  earnedThisMonth: Scalars['Int']['output'];
  earnedThisWeek: Scalars['Int']['output'];
  earnedToday: Scalars['Int']['output'];
  lifetimeEarned: Scalars['Int']['output'];
  lifetimeSpent: Scalars['Int']['output'];
  pending: Scalars['Int']['output'];
  recentEarnings: Array<EarnEvent>;
  streakBonus?: Maybe<Scalars['Int']['output']>;
  wealthTier: WealthTier;
};

export type CreditPackage = {
  __typename: 'CreditPackage';
  bestValue: Scalars['Boolean']['output'];
  bonusCredits: Scalars['Int']['output'];
  bonusPercent: Scalars['Float']['output'];
  credits: Scalars['Int']['output'];
  displayOrder: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  popular: Scalars['Boolean']['output'];
  priceCents: Scalars['Int']['output'];
  totalCredits: Scalars['Int']['output'];
};

export type Crew = {
  __typename: 'Crew';
  avatar?: Maybe<Scalars['String']['output']>;
  color: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  losses: Scalars['Int']['output'];
  memberCount: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  ownerId: Scalars['ID']['output'];
  tag: Scalars['String']['output'];
  totalTU: Scalars['Float']['output'];
  weeklyTU: Scalars['Float']['output'];
  wins: Scalars['Int']['output'];
};

/** Crew achievement */
export type CrewAchievement = {
  __typename: 'CrewAchievement';
  achievedValue?: Maybe<Scalars['Float']['output']>;
  achievementKey: Scalars['String']['output'];
  crewId: Scalars['ID']['output'];
  description?: Maybe<Scalars['String']['output']>;
  earnedAt: Scalars['DateTime']['output'];
  iconUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  rarity: Scalars['String']['output'];
  targetValue?: Maybe<Scalars['Float']['output']>;
  title: Scalars['String']['output'];
};

/** Crew challenge */
export type CrewChallenge = {
  __typename: 'CrewChallenge';
  challengeType: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  createdBy: UserSummary;
  crew: CrewSummary;
  crewId: Scalars['ID']['output'];
  currentValue: Scalars['Float']['output'];
  description?: Maybe<Scalars['String']['output']>;
  endsAt: Scalars['DateTime']['output'];
  goalValue?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  metricType: Scalars['String']['output'];
  myContribution?: Maybe<Scalars['Float']['output']>;
  opponentCrew?: Maybe<CrewSummary>;
  opponentCrewId?: Maybe<Scalars['ID']['output']>;
  progress: Scalars['Float']['output'];
  rewards?: Maybe<Scalars['JSON']['output']>;
  startsAt: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
  title: Scalars['String']['output'];
  topContributors: Array<ChallengeContributor>;
  winnerCrewId?: Maybe<Scalars['ID']['output']>;
};

/** Input for crew challenge */
export type CrewChallengeInput = {
  challengeType: Scalars['String']['input'];
  crewId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  endsAt: Scalars['DateTime']['input'];
  goalValue?: InputMaybe<Scalars['Float']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  metricType: Scalars['String']['input'];
  opponentCrewId?: InputMaybe<Scalars['ID']['input']>;
  rewards?: InputMaybe<Scalars['JSON']['input']>;
  startsAt: Scalars['DateTime']['input'];
  title: Scalars['String']['input'];
};

/** Crew chat message */
export type CrewChatMessage = {
  __typename: 'CrewChatMessage';
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  crewId: Scalars['ID']['output'];
  editedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isDeleted: Scalars['Boolean']['output'];
  isPinned: Scalars['Boolean']['output'];
  messageType: Scalars['String']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  reactions?: Maybe<Scalars['JSON']['output']>;
  replyTo?: Maybe<CrewChatMessage>;
  user: UserSummary;
  userId: Scalars['ID']['output'];
};

/** Crew chat result with pagination */
export type CrewChatResult = {
  __typename: 'CrewChatResult';
  hasMore: Scalars['Boolean']['output'];
  messages: Array<CrewChatMessage>;
  nextCursor?: Maybe<Scalars['String']['output']>;
  unreadCount: Scalars['Int']['output'];
};

export type CrewInvite = {
  __typename: 'CrewInvite';
  createdAt: Scalars['DateTime']['output'];
  crewId: Scalars['ID']['output'];
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  inviteeId: Scalars['ID']['output'];
  inviterId: Scalars['ID']['output'];
  status: Scalars['String']['output'];
};

export type CrewLeaderboardCrew = {
  __typename: 'CrewLeaderboardCrew';
  avatar?: Maybe<Scalars['String']['output']>;
  color: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  memberCount: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  tag: Scalars['String']['output'];
  weeklyTU: Scalars['Float']['output'];
};

export type CrewLeaderboardEntry = {
  __typename: 'CrewLeaderboardEntry';
  crew: CrewLeaderboardCrew;
  rank: Scalars['Int']['output'];
};

export type CrewMember = {
  __typename: 'CrewMember';
  archetype?: Maybe<Scalars['String']['output']>;
  avatar?: Maybe<Scalars['String']['output']>;
  crewId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  joinedAt: Scalars['DateTime']['output'];
  role: Scalars['String']['output'];
  totalTU: Scalars['Float']['output'];
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
  weeklyTU: Scalars['Float']['output'];
};

export type CrewStats = {
  __typename: 'CrewStats';
  currentStreak: Scalars['Int']['output'];
  topContributors: Array<CrewTopContributor>;
  totalMembers: Scalars['Int']['output'];
  totalTU: Scalars['Float']['output'];
  warsLost: Scalars['Int']['output'];
  warsWon: Scalars['Int']['output'];
  weeklyTU: Scalars['Float']['output'];
};

/** Crew summary for challenges */
export type CrewSummary = {
  __typename: 'CrewSummary';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  level?: Maybe<Scalars['Int']['output']>;
  memberCount: Scalars['Int']['output'];
  name: Scalars['String']['output'];
};

export type CrewTopContributor = {
  __typename: 'CrewTopContributor';
  avatar?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
  weeklyTU: Scalars['Float']['output'];
};

export type CrewWar = {
  __typename: 'CrewWar';
  challengerCrewId: Scalars['ID']['output'];
  challengerTU: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  defendingCrewId: Scalars['ID']['output'];
  defendingTU: Scalars['Float']['output'];
  endDate: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  startDate: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
  winnerId?: Maybe<Scalars['ID']['output']>;
};

export type CrewWarBasicInfo = {
  __typename: 'CrewWarBasicInfo';
  avatar?: Maybe<Scalars['String']['output']>;
  color: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  tag: Scalars['String']['output'];
};

export type CrewWarWithDetails = {
  __typename: 'CrewWarWithDetails';
  challengerCrew: CrewWarBasicInfo;
  challengerCrewId: Scalars['ID']['output'];
  challengerTU: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  daysRemaining: Scalars['Int']['output'];
  defendingCrew: CrewWarBasicInfo;
  defendingCrewId: Scalars['ID']['output'];
  defendingTU: Scalars['Float']['output'];
  endDate: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isChallenger: Scalars['Boolean']['output'];
  isWinning: Scalars['Boolean']['output'];
  myCrewTU: Scalars['Float']['output'];
  opponentCrewTU: Scalars['Float']['output'];
  startDate: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
  winnerId?: Maybe<Scalars['ID']['output']>;
};

export type CrewWithDetails = {
  __typename: 'CrewWithDetails';
  crew: Crew;
  members: Array<CrewMember>;
  stats: CrewStats;
};

/** Data point for time series charts */
export type DailyDataPoint = {
  __typename: 'DailyDataPoint';
  date: Scalars['DateTime']['output'];
  value: Scalars['Float']['output'];
};

export type DailyNutritionSummary = {
  __typename: 'DailyNutritionSummary';
  date: Scalars['String']['output'];
  goalCalories: Scalars['Int']['output'];
  goalCarbsG: Scalars['Int']['output'];
  goalFatG: Scalars['Int']['output'];
  goalProteinG: Scalars['Int']['output'];
  mealCount: Scalars['Int']['output'];
  meals: Array<MealLog>;
  totalCalories: Scalars['Int']['output'];
  totalCarbsG: Scalars['Float']['output'];
  totalFatG: Scalars['Float']['output'];
  totalFiberG?: Maybe<Scalars['Float']['output']>;
  totalProteinG: Scalars['Float']['output'];
  wasWorkoutDay: Scalars['Boolean']['output'];
  waterMl?: Maybe<Scalars['Int']['output']>;
};

export type DetailedHealthStatus = {
  __typename: 'DetailedHealthStatus';
  database: ServiceStatus;
  memory: MemoryStatus;
  redis: ServiceStatus;
  status: Scalars['String']['output'];
  uptime: Scalars['Float']['output'];
  version: Scalars['String']['output'];
};

/** Device info for multi-device support */
export type DeviceInfo = {
  __typename: 'DeviceInfo';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  lastActive?: Maybe<Scalars['DateTime']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
};

/** Difficulty level */
export type DifficultyLevel =
  | 'advanced'
  | 'beginner'
  | 'expert'
  | 'intermediate';

export type DisciplineLeaderboardEntry = {
  __typename: 'DisciplineLeaderboardEntry';
  masteredCount: Scalars['Int']['output'];
  totalPracticeMinutes: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};

export type DisciplineProgress = {
  __typename: 'DisciplineProgress';
  disciplineId: Scalars['ID']['output'];
  disciplineName: Scalars['String']['output'];
  mastered: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

/** Success result with count */
export type E2EeCountResult = {
  __typename: 'E2EECountResult';
  count: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

/** E2EE key event (device added, key rotated) */
export type E2EeKeyEvent = {
  __typename: 'E2EEKeyEvent';
  deviceId?: Maybe<Scalars['String']['output']>;
  timestamp: Scalars['DateTime']['output'];
  type: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

/** Simple success result */
export type E2EeResult = {
  __typename: 'E2EEResult';
  success: Scalars['Boolean']['output'];
};

export type EarnEvent = {
  __typename: 'EarnEvent';
  amount: Scalars['Int']['output'];
  animationType: Scalars['String']['output'];
  color?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  shown: Scalars['Boolean']['output'];
  source: Scalars['String']['output'];
  sourceId?: Maybe<Scalars['ID']['output']>;
};

export type EarnEventsResult = {
  __typename: 'EarnEventsResult';
  events: Array<EarnEvent>;
  totalUnread: Scalars['Int']['output'];
};

export type EconomyAction = {
  __typename: 'EconomyAction';
  cost: Scalars['Int']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type EditedMessage = {
  __typename: 'EditedMessage';
  content: Scalars['String']['output'];
  editCount: Scalars['Int']['output'];
  editedAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

/** Encrypted file metadata (content stored externally) */
export type EncryptedFileMetadata = {
  __typename: 'EncryptedFileMetadata';
  /** Hash of encrypted content for integrity verification */
  contentHash: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  /** Base64 encoded encrypted symmetric key */
  encryptedKey: Scalars['String']['output'];
  /** Base64 encoded encrypted metadata (filename, size, etc.) */
  encryptedMetadata: Scalars['String']['output'];
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  fileSize: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  mimeType: Scalars['String']['output'];
  /** NSFW classification (classified client-side) */
  nsfwClassification: NsfwClassification;
  /** External storage URL (R2/IPFS) */
  storageUrl: Scalars['String']['output'];
  uploader?: Maybe<User>;
  uploaderId: Scalars['ID']['output'];
};

/** Encrypted message (server cannot read content) */
export type EncryptedMessage = {
  __typename: 'EncryptedMessage';
  conversationId: Scalars['ID']['output'];
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Base64 encoded encrypted payload */
  encryptedPayload: Scalars['String']['output'];
  fileIds?: Maybe<Array<Scalars['ID']['output']>>;
  files?: Maybe<Array<EncryptedFileMetadata>>;
  id: Scalars['ID']['output'];
  messageType: Scalars['String']['output'];
  receipts?: Maybe<Array<MessageReceipt>>;
  replyToId?: Maybe<Scalars['ID']['output']>;
  sender?: Maybe<User>;
  senderId: Scalars['ID']['output'];
};

/** Paginated encrypted messages result */
export type EncryptedMessagesResult = {
  __typename: 'EncryptedMessagesResult';
  cursor?: Maybe<MessageCursor>;
  hasMore: Scalars['Boolean']['output'];
  messages: Array<EncryptedMessage>;
};

export type EnrollmentProgress = {
  __typename: 'EnrollmentProgress';
  daysRemaining: Scalars['Int']['output'];
  nextWorkout?: Maybe<ProgramDay>;
  onTrack: Scalars['Boolean']['output'];
  totalProgress: Scalars['Float']['output'];
  weekProgress: Scalars['Float']['output'];
};

/** Enrollment status (programs, classes) */
export type EnrollmentStatus =
  | 'active'
  | 'completed'
  | 'dropped'
  | 'paused';

export type EnrollmentWithProgram = {
  __typename: 'EnrollmentWithProgram';
  enrollment: ProgramEnrollment;
  program: TrainingProgram;
  progress: EnrollmentProgress;
};

export type EnrollmentsResult = {
  __typename: 'EnrollmentsResult';
  enrollments: Array<ClassEnrollment>;
  total: Scalars['Int']['output'];
};

export type Entitlements = {
  __typename: 'Entitlements';
  creditBalance: Scalars['Int']['output'];
  creditsVisible: Scalars['Boolean']['output'];
  daysLeftInTrial?: Maybe<Scalars['Int']['output']>;
  reason: Scalars['String']['output'];
  subscriptionEndsAt?: Maybe<Scalars['DateTime']['output']>;
  trialEndsAt?: Maybe<Scalars['DateTime']['output']>;
  unlimited: Scalars['Boolean']['output'];
};

export type EquipmentCategory = {
  __typename: 'EquipmentCategory';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

/** Equipment condition */
export type EquipmentCondition =
  | 'broken'
  | 'excellent'
  | 'fair'
  | 'good'
  | 'poor'
  | 'removed';

export type EquipmentConditionInfo = {
  __typename: 'EquipmentConditionInfo';
  condition?: Maybe<Scalars['String']['output']>;
  confidenceLevel?: Maybe<Scalars['String']['output']>;
  consensusCondition?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  verificationCount: Scalars['Int']['output'];
};

/** Vote on an equipment condition */
export type EquipmentConditionVote = {
  __typename: 'EquipmentConditionVote';
  createdAt: Scalars['DateTime']['output'];
  equipmentItemId: Scalars['ID']['output'];
  locationVerified: Scalars['Boolean']['output'];
  userId: Scalars['ID']['output'];
  voteType: Scalars['String']['output'];
  voteValue: Scalars['String']['output'];
};

/** Consensus data for equipment */
export type EquipmentConsensus = {
  __typename: 'EquipmentConsensus';
  conditionVotes: Array<ConditionVoteCount>;
  confidenceLevel: Scalars['String']['output'];
  existsVotes: Array<ExistsVoteCount>;
  lastVerifiedAt?: Maybe<Scalars['DateTime']['output']>;
  totalVotes: Scalars['Int']['output'];
};

/** Result of reporting equipment as removed */
export type EquipmentRemovedResult = {
  __typename: 'EquipmentRemovedResult';
  creditsEarned: Scalars['Int']['output'];
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type EquipmentSubmissionInput = {
  condition?: InputMaybe<Scalars['String']['input']>;
  equipmentType: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  quantity?: InputMaybe<Scalars['Int']['input']>;
};

/** User suggestion for new equipment at an existing venue */
export type EquipmentSuggestion = {
  __typename: 'EquipmentSuggestion';
  condition?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  equipmentType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  locationVerified: Scalars['Boolean']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  photoUrl?: Maybe<Scalars['String']['output']>;
  quantity: Scalars['Int']['output'];
  rejectCount: Scalars['Int']['output'];
  status: Scalars['String']['output'];
  suggestedBy?: Maybe<User>;
  supportCount: Scalars['Int']['output'];
  venueId: Scalars['ID']['output'];
};

export type EquipmentSuggestionInfo = {
  __typename: 'EquipmentSuggestionInfo';
  createdAt: Scalars['DateTime']['output'];
  equipmentType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  supportCount: Scalars['Int']['output'];
};

/** Input for suggesting new equipment */
export type EquipmentSuggestionInput = {
  condition?: InputMaybe<Scalars['String']['input']>;
  equipmentType: Scalars['String']['input'];
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  photoUrl?: InputMaybe<Scalars['String']['input']>;
  quantity?: InputMaybe<Scalars['Int']['input']>;
};

/** Result of suggesting equipment */
export type EquipmentSuggestionResult = {
  __typename: 'EquipmentSuggestionResult';
  creditsEarned: Scalars['Int']['output'];
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  suggestion?: Maybe<EquipmentSuggestionInfo>;
};

export type EquipmentType = {
  __typename: 'EquipmentType';
  category: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type EquipmentVerifyInput = {
  condition?: InputMaybe<Scalars['String']['input']>;
  equipmentItemId: Scalars['ID']['input'];
  exists: Scalars['Boolean']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
};

export type EventReadiness = {
  __typename: 'EventReadiness';
  eventId: Scalars['ID']['output'];
  eventName: Scalars['String']['output'];
  passed?: Maybe<Scalars['Boolean']['output']>;
  status: Scalars['String']['output'];
  value?: Maybe<Scalars['Float']['output']>;
};

export type Exercise = {
  __typename: 'Exercise';
  description?: Maybe<Scalars['String']['output']>;
  difficulty?: Maybe<Scalars['String']['output']>;
  equipment?: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  instructions?: Maybe<Array<Scalars['String']['output']>>;
  name: Scalars['String']['output'];
  primaryMuscles: Array<Scalars['String']['output']>;
  secondaryMuscles?: Maybe<Array<Scalars['String']['output']>>;
  tips?: Maybe<Array<Scalars['String']['output']>>;
  type: Scalars['String']['output'];
  videoUrl?: Maybe<Scalars['String']['output']>;
};

/** Exercise distribution item for pie charts */
export type ExerciseBreakdownItem = {
  __typename: 'ExerciseBreakdownItem';
  count: Scalars['Int']['output'];
  exerciseId: Scalars['ID']['output'];
  exerciseName: Scalars['String']['output'];
  percentage: Scalars['Float']['output'];
};

export type ExerciseCheck = {
  __typename: 'ExerciseCheck';
  alternatives?: Maybe<Array<Exercise>>;
  suitable: Scalars['Boolean']['output'];
  warnings?: Maybe<Array<Scalars['String']['output']>>;
};

/** Feedback for individual exercise */
export type ExerciseFeedbackInput = {
  actualReps?: InputMaybe<Scalars['Int']['input']>;
  actualSets?: InputMaybe<Scalars['Int']['input']>;
  actualWeight?: InputMaybe<Scalars['Float']['input']>;
  completed: Scalars['Boolean']['input'];
  enjoymentRating?: InputMaybe<Scalars['Int']['input']>;
  exerciseId: Scalars['ID']['input'];
  formRating?: InputMaybe<Scalars['Int']['input']>;
  jointDiscomfort?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  perceivedDifficulty?: InputMaybe<Scalars['Int']['input']>;
  wouldSubstitute?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ExerciseHistoryEntry = {
  __typename: 'ExerciseHistoryEntry';
  best1RM: Scalars['Float']['output'];
  bestVolume: Scalars['Float']['output'];
  bestWeight: Scalars['Float']['output'];
  exerciseId: Scalars['ID']['output'];
  exerciseName?: Maybe<Scalars['String']['output']>;
  lastPerformedAt?: Maybe<Scalars['DateTime']['output']>;
  totalSessions: Scalars['Int']['output'];
};

/** Basic exercise info for venue search results */
export type ExerciseInfo = {
  __typename: 'ExerciseInfo';
  equipmentRequired: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  locations: Array<Scalars['String']['output']>;
  name: Scalars['String']['output'];
};

export type ExerciseRecommendation = {
  __typename: 'ExerciseRecommendation';
  exerciseId: Scalars['ID']['output'];
  exerciseName: Scalars['String']['output'];
  targetEvents: Array<Scalars['String']['output']>;
};

/** Exercise substitute recommendation */
export type ExerciseSubstitute = {
  __typename: 'ExerciseSubstitute';
  exerciseId: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  reason: Scalars['String']['output'];
  scoreDifference: Scalars['Float']['output'];
};

export type ExerciseSubstitution = {
  __typename: 'ExerciseSubstitution';
  effectiveness: Scalars['Float']['output'];
  originalExerciseId: Scalars['ID']['output'];
  reason: Scalars['String']['output'];
  substitute: Exercise;
  substituteExerciseId: Scalars['ID']['output'];
};

export type ExistsVoteCount = {
  __typename: 'ExistsVoteCount';
  count: Scalars['Int']['output'];
  exists: Scalars['Boolean']['output'];
  percentage: Scalars['Float']['output'];
};

export type ExtendedProfile = {
  __typename: 'ExtendedProfile';
  age?: Maybe<Scalars['Int']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  countryCode?: Maybe<Scalars['String']['output']>;
  county?: Maybe<Scalars['String']['output']>;
  fitnessLevel?: Maybe<Scalars['String']['output']>;
  gender?: Maybe<Scalars['String']['output']>;
  goals?: Maybe<Array<Scalars['String']['output']>>;
  height?: Maybe<Scalars['Float']['output']>;
  leaderboardOptIn?: Maybe<Scalars['Boolean']['output']>;
  preferredUnits?: Maybe<Scalars['String']['output']>;
  previousStrength?: Maybe<Scalars['Int']['output']>;
  profileVisibility?: Maybe<Scalars['String']['output']>;
  state?: Maybe<Scalars['String']['output']>;
  volumeTrend?: Maybe<Array<VolumeTrendEntry>>;
  weeklyActivity?: Maybe<Array<Scalars['Int']['output']>>;
  weight?: Maybe<Scalars['Float']['output']>;
};

export type ExtendedProfileInput = {
  age?: InputMaybe<Scalars['Int']['input']>;
  fitnessLevel?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  goals?: InputMaybe<Array<Scalars['String']['input']>>;
  height?: InputMaybe<Scalars['Float']['input']>;
  preferredUnits?: InputMaybe<Scalars['String']['input']>;
  weight?: InputMaybe<Scalars['Float']['input']>;
};

export type FatigueAnalysis = {
  __typename: 'FatigueAnalysis';
  classification: Scalars['String']['output'];
  fatigueScore: Scalars['Int']['output'];
  indicators: Array<Scalars['String']['output']>;
  recentRpeTrend: Scalars['String']['output'];
  recommendation: Scalars['String']['output'];
  suggestedIntensity: Scalars['String']['output'];
};

export type FeedItem = {
  __typename: 'FeedItem';
  avatar?: Maybe<Scalars['String']['output']>;
  comments: Scalars['Int']['output'];
  content: Scalars['JSON']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  liked: Scalars['Boolean']['output'];
  likes: Scalars['Int']['output'];
  type: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};

/** Feed item type */
export type FeedItemType =
  | 'achievement'
  | 'goal'
  | 'milestone'
  | 'social'
  | 'system'
  | 'workout';

/** Feed preferences for customization */
export type FeedPreferences = {
  __typename: 'FeedPreferences';
  notifyBuddyActivity: Scalars['Boolean']['output'];
  notifyCrewActivity: Scalars['Boolean']['output'];
  notifyHighFives: Scalars['Boolean']['output'];
  notifyNewFollowers: Scalars['Boolean']['output'];
  pushAchievements: Scalars['Boolean']['output'];
  pushBuddyReminders: Scalars['Boolean']['output'];
  pushEnabled: Scalars['Boolean']['output'];
  pushHighFives: Scalars['Boolean']['output'];
  showAchievements: Scalars['Boolean']['output'];
  showChallenges: Scalars['Boolean']['output'];
  showGoals: Scalars['Boolean']['output'];
  showHighFives: Scalars['Boolean']['output'];
  showLevelUps: Scalars['Boolean']['output'];
  showPrs: Scalars['Boolean']['output'];
  showStreaks: Scalars['Boolean']['output'];
  showWorkouts: Scalars['Boolean']['output'];
};

/** Input for updating feed preferences */
export type FeedPreferencesInput = {
  notifyBuddyActivity?: InputMaybe<Scalars['Boolean']['input']>;
  notifyCrewActivity?: InputMaybe<Scalars['Boolean']['input']>;
  notifyHighFives?: InputMaybe<Scalars['Boolean']['input']>;
  notifyNewFollowers?: InputMaybe<Scalars['Boolean']['input']>;
  pushAchievements?: InputMaybe<Scalars['Boolean']['input']>;
  pushBuddyReminders?: InputMaybe<Scalars['Boolean']['input']>;
  pushEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  pushHighFives?: InputMaybe<Scalars['Boolean']['input']>;
  showAchievements?: InputMaybe<Scalars['Boolean']['input']>;
  showChallenges?: InputMaybe<Scalars['Boolean']['input']>;
  showGoals?: InputMaybe<Scalars['Boolean']['input']>;
  showHighFives?: InputMaybe<Scalars['Boolean']['input']>;
  showLevelUps?: InputMaybe<Scalars['Boolean']['input']>;
  showPrs?: InputMaybe<Scalars['Boolean']['input']>;
  showStreaks?: InputMaybe<Scalars['Boolean']['input']>;
  showWorkouts?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Result of feedback submission */
export type FeedbackSubmissionResult = {
  __typename: 'FeedbackSubmissionResult';
  newPreferences?: Maybe<Scalars['JSON']['output']>;
  success: Scalars['Boolean']['output'];
  weightsUpdated: Scalars['Boolean']['output'];
};

/** File download URL result */
export type FileDownloadResult = {
  __typename: 'FileDownloadResult';
  url: Scalars['String']['output'];
};

/** File upload token and presigned URL */
export type FileUploadToken = {
  __typename: 'FileUploadToken';
  expiresAt: Scalars['DateTime']['output'];
  maxSize: Scalars['Int']['output'];
  token: Scalars['String']['output'];
  uploadUrl: Scalars['String']['output'];
};

/** Follow/follower list item */
export type FollowListItem = {
  __typename: 'FollowListItem';
  followedAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isFollowingBack: Scalars['Boolean']['output'];
  user: UserSummary;
};

/** Follow list result with pagination */
export type FollowListResult = {
  __typename: 'FollowListResult';
  items: Array<FollowListItem>;
  nextCursor?: Maybe<Scalars['String']['output']>;
  total: Scalars['Int']['output'];
};

/** Result of follow action */
export type FollowResult = {
  __typename: 'FollowResult';
  isFollowing: Scalars['Boolean']['output'];
  success: Scalars['Boolean']['output'];
};

export type FoodItem = {
  __typename: 'FoodItem';
  barcode?: Maybe<Scalars['String']['output']>;
  brand?: Maybe<Scalars['String']['output']>;
  calories: Scalars['Int']['output'];
  carbsG: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  fatG: Scalars['Float']['output'];
  fiberG?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  isVerified: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  proteinG: Scalars['Float']['output'];
  servingDescription?: Maybe<Scalars['String']['output']>;
  servingSize: Scalars['Float']['output'];
  servingUnit: Scalars['String']['output'];
  sodiumMg?: Maybe<Scalars['Float']['output']>;
  source: Scalars['String']['output'];
  sourceId?: Maybe<Scalars['String']['output']>;
  sugarG?: Maybe<Scalars['Float']['output']>;
};

export type FoodSearchResult = {
  __typename: 'FoodSearchResult';
  foods: Array<FoodItem>;
  hasMore: Scalars['Boolean']['output'];
  source?: Maybe<Scalars['String']['output']>;
  total: Scalars['Int']['output'];
};

export type ForwardedMessage = {
  __typename: 'ForwardedMessage';
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

export type FrontendLogInput = {
  context?: InputMaybe<Scalars['JSON']['input']>;
  level: Scalars['String']['input'];
  message: Scalars['String']['input'];
  stack?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  userAgent?: InputMaybe<Scalars['String']['input']>;
};

export type FullProfile = {
  __typename: 'FullProfile';
  aboutMe?: Maybe<Scalars['String']['output']>;
  age?: Maybe<Scalars['Int']['output']>;
  avatarId?: Maybe<Scalars['String']['output']>;
  avatarUrl?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  equipmentInventory: Array<Scalars['String']['output']>;
  gender?: Maybe<Scalars['String']['output']>;
  ghostMode: Scalars['Boolean']['output'];
  heightCm?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  leaderboardOptIn: Scalars['Boolean']['output'];
  level: Scalars['Int']['output'];
  limitations: Array<Scalars['String']['output']>;
  preferredUnits: Scalars['String']['output'];
  rank?: Maybe<Scalars['String']['output']>;
  theme?: Maybe<Scalars['String']['output']>;
  username: Scalars['String']['output'];
  wealthTier: Scalars['Int']['output'];
  weeklyActivity: Array<Scalars['Int']['output']>;
  weightKg?: Maybe<Scalars['Float']['output']>;
  xp: Scalars['Int']['output'];
};

export type FullProfileInput = {
  age?: InputMaybe<Scalars['Int']['input']>;
  avatarId?: InputMaybe<Scalars['String']['input']>;
  equipmentInventory?: InputMaybe<Array<Scalars['String']['input']>>;
  gender?: InputMaybe<Scalars['String']['input']>;
  limitations?: InputMaybe<Array<Scalars['String']['input']>>;
  theme?: InputMaybe<Scalars['String']['input']>;
};

export type GeoBucket = {
  __typename: 'GeoBucket';
  count: Scalars['Int']['output'];
  geoBucket: Scalars['String']['output'];
};

export type GeoJsonInput = {
  bounds?: InputMaybe<MapBoundsInput>;
  equipmentTypes?: InputMaybe<Array<Scalars['String']['input']>>;
  includePhotos?: InputMaybe<Scalars['Boolean']['input']>;
  verifiedOnly?: InputMaybe<Scalars['Boolean']['input']>;
};

export type GiftInput = {
  isAnonymous?: InputMaybe<Scalars['Boolean']['input']>;
  itemSku: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  recipientId: Scalars['ID']['input'];
};

export type GiftResult = {
  __typename: 'GiftResult';
  cost: Scalars['Int']['output'];
  error?: Maybe<Scalars['String']['output']>;
  fee: Scalars['Int']['output'];
  itemSku: Scalars['String']['output'];
  newBalance: Scalars['Int']['output'];
  recipientUsername?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  transactionId?: Maybe<Scalars['ID']['output']>;
};

export type Goal = {
  __typename: 'Goal';
  createdAt: Scalars['DateTime']['output'];
  current: Scalars['Float']['output'];
  deadline?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  milestones?: Maybe<Array<GoalMilestone>>;
  status: Scalars['String']['output'];
  target: Scalars['Float']['output'];
  title: Scalars['String']['output'];
  type: Scalars['String']['output'];
  unit: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
};

export type GoalInput = {
  deadline?: InputMaybe<Scalars['DateTime']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  target: Scalars['Float']['input'];
  title: Scalars['String']['input'];
  type: Scalars['String']['input'];
  unit: Scalars['String']['input'];
};

export type GoalMilestone = {
  __typename: 'GoalMilestone';
  achieved: Scalars['Boolean']['output'];
  achievedAt?: Maybe<Scalars['DateTime']['output']>;
  goalId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  target: Scalars['Float']['output'];
  title: Scalars['String']['output'];
};

export type GoalProgressInput = {
  notes?: InputMaybe<Scalars['String']['input']>;
  value: Scalars['Float']['input'];
};

/** Goal status */
export type GoalStatus =
  | 'abandoned'
  | 'active'
  | 'completed'
  | 'paused';

export type GoalSuggestion = {
  __typename: 'GoalSuggestion';
  description: Scalars['String']['output'];
  reasoning: Scalars['String']['output'];
  target: Scalars['Float']['output'];
  title: Scalars['String']['output'];
  type: Scalars['String']['output'];
  unit: Scalars['String']['output'];
};

export type Hangout = {
  __typename: 'Hangout';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  endsAt?: Maybe<Scalars['DateTime']['output']>;
  host: User;
  hostId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  location: HangoutLocation;
  maxMembers?: Maybe<Scalars['Int']['output']>;
  memberCount: Scalars['Int']['output'];
  members: Array<HangoutMember>;
  posts?: Maybe<Array<HangoutPost>>;
  startsAt: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
  title: Scalars['String']['output'];
  type: HangoutType;
  typeId: Scalars['ID']['output'];
};

export type HangoutInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  endsAt?: InputMaybe<Scalars['DateTime']['input']>;
  lat: Scalars['Float']['input'];
  lng: Scalars['Float']['input'];
  maxMembers?: InputMaybe<Scalars['Int']['input']>;
  placeName?: InputMaybe<Scalars['String']['input']>;
  startsAt: Scalars['DateTime']['input'];
  title: Scalars['String']['input'];
  typeId: Scalars['ID']['input'];
};

export type HangoutLocation = {
  __typename: 'HangoutLocation';
  address?: Maybe<Scalars['String']['output']>;
  lat: Scalars['Float']['output'];
  lng: Scalars['Float']['output'];
  placeName?: Maybe<Scalars['String']['output']>;
};

export type HangoutMember = {
  __typename: 'HangoutMember';
  joinedAt: Scalars['DateTime']['output'];
  role: Scalars['String']['output'];
  user: User;
  userId: Scalars['ID']['output'];
};

export type HangoutMembership = {
  __typename: 'HangoutMembership';
  hangoutId: Scalars['ID']['output'];
  joinedAt: Scalars['DateTime']['output'];
  role: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export type HangoutPost = {
  __typename: 'HangoutPost';
  author: User;
  authorId: Scalars['ID']['output'];
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  hangoutId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
};

export type HangoutStats = {
  __typename: 'HangoutStats';
  activeHangouts: Scalars['Int']['output'];
  totalHangouts: Scalars['Int']['output'];
  totalParticipants: Scalars['Int']['output'];
};

export type HangoutType = {
  __typename: 'HangoutType';
  description: Scalars['String']['output'];
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  maxParticipants: Scalars['Int']['output'];
  minParticipants: Scalars['Int']['output'];
  name: Scalars['String']['output'];
};

export type HealthStatus = {
  __typename: 'HealthStatus';
  status: Scalars['String']['output'];
  timestamp: Scalars['DateTime']['output'];
};

export type HighFiveEncouragement = {
  __typename: 'HighFiveEncouragement';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  message?: Maybe<Scalars['String']['output']>;
  readAt?: Maybe<Scalars['DateTime']['output']>;
  recipientId?: Maybe<Scalars['ID']['output']>;
  recipientName?: Maybe<Scalars['String']['output']>;
  senderId?: Maybe<Scalars['ID']['output']>;
  senderName?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

export type HighFiveInput = {
  message?: InputMaybe<Scalars['String']['input']>;
  recipientId: Scalars['ID']['input'];
  type: Scalars['String']['input'];
};

export type HighFiveSendResult = {
  __typename: 'HighFiveSendResult';
  error?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type HighFiveStats = {
  __typename: 'HighFiveStats';
  received: Scalars['Int']['output'];
  sent: Scalars['Int']['output'];
  unread: Scalars['Int']['output'];
};

export type HighFiveUser = {
  __typename: 'HighFiveUser';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  currentArchetype?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  level: Scalars['Int']['output'];
  username: Scalars['String']['output'];
};

export type HomeEquipment = {
  __typename: 'HomeEquipment';
  addedAt: Scalars['DateTime']['output'];
  equipment: EquipmentType;
  equipmentId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  userId: Scalars['ID']['output'];
};

export type HomeEquipmentInput = {
  extras?: InputMaybe<Array<Scalars['String']['input']>>;
  kettlebellCount?: InputMaybe<Scalars['Int']['input']>;
  type: Scalars['String']['input'];
};

/** Hourly pattern data point */
export type HourlyDataPoint = {
  __typename: 'HourlyDataPoint';
  averageUsers: Scalars['Float']['output'];
  averageWorkouts: Scalars['Float']['output'];
  hour: Scalars['Int']['output'];
};

export type HrvDetails = {
  __typename: 'HrvDetails';
  baselineHrv?: Maybe<Scalars['Float']['output']>;
  currentHrv?: Maybe<Scalars['Float']['output']>;
  percentOfBaseline?: Maybe<Scalars['Int']['output']>;
};

export type HydrationLog = {
  __typename: 'HydrationLog';
  amountMl: Scalars['Int']['output'];
  beverageType: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  loggedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
};

export type HydrationLogInput = {
  amountMl: Scalars['Int']['input'];
  beverageType?: InputMaybe<Scalars['String']['input']>;
};

export type HydrationSummary = {
  __typename: 'HydrationSummary';
  goalMl: Scalars['Int']['output'];
  logs: Array<HydrationLog>;
  percentComplete: Scalars['Float']['output'];
  totalMl: Scalars['Int']['output'];
};

export type Issue = {
  __typename: 'Issue';
  author?: Maybe<User>;
  authorAvatarUrl?: Maybe<Scalars['String']['output']>;
  authorDisplayName?: Maybe<Scalars['String']['output']>;
  authorId?: Maybe<Scalars['ID']['output']>;
  authorUsername?: Maybe<Scalars['String']['output']>;
  commentCount: Scalars['Int']['output'];
  comments?: Maybe<Array<IssueComment>>;
  createdAt: Scalars['DateTime']['output'];
  description: Scalars['String']['output'];
  hasVoted?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  isLocked?: Maybe<Scalars['Boolean']['output']>;
  isPinned?: Maybe<Scalars['Boolean']['output']>;
  issueNumber: Scalars['Int']['output'];
  labels: Array<IssueLabel>;
  priority: Scalars['Int']['output'];
  solutionCommentId?: Maybe<Scalars['ID']['output']>;
  status: Scalars['Int']['output'];
  subscriberCount?: Maybe<Scalars['Int']['output']>;
  title: Scalars['String']['output'];
  type: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  viewCount?: Maybe<Scalars['Int']['output']>;
  voteCount: Scalars['Int']['output'];
};

export type IssueComment = {
  __typename: 'IssueComment';
  author: User;
  authorId: Scalars['ID']['output'];
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isSolution: Scalars['Boolean']['output'];
  issueId: Scalars['ID']['output'];
};

export type IssueInput = {
  browserInfo?: InputMaybe<Scalars['JSON']['input']>;
  description: Scalars['String']['input'];
  deviceInfo?: InputMaybe<Scalars['JSON']['input']>;
  labelIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  pageUrl?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  title: Scalars['String']['input'];
  type?: InputMaybe<Scalars['Int']['input']>;
};

export type IssueLabel = {
  __typename: 'IssueLabel';
  color: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  slug?: Maybe<Scalars['String']['output']>;
};

export type IssueStats = {
  __typename: 'IssueStats';
  issuesByStatus?: Maybe<Scalars['JSON']['output']>;
  issuesByType?: Maybe<Scalars['JSON']['output']>;
  openIssues: Scalars['Int']['output'];
  resolvedIssues: Scalars['Int']['output'];
  totalIssues: Scalars['Int']['output'];
  totalVotes: Scalars['Int']['output'];
};

/** Issue status */
export type IssueStatus =
  | 'closed'
  | 'in_progress'
  | 'open'
  | 'resolved'
  | 'wont_fix';

/** Issue type */
export type IssueType =
  | 'bug'
  | 'feature'
  | 'feedback'
  | 'improvement'
  | 'question';

export type IssueUpdateInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  labels?: InputMaybe<Array<Scalars['ID']['input']>>;
  priority?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type IssuesResult = {
  __typename: 'IssuesResult';
  hasMore: Scalars['Boolean']['output'];
  issues: Array<Issue>;
  total: Scalars['Int']['output'];
};

export type JourneyAlertSeverity =
  | 'critical'
  | 'info'
  | 'warning';

export type JourneyAlertStatus =
  | 'acknowledged'
  | 'active'
  | 'dismissed'
  | 'resolved';

export type JourneyAlertType =
  | 'approaching_deadline'
  | 'consistency_drop'
  | 'declining'
  | 'missed_milestone'
  | 'no_activity'
  | 'off_track'
  | 'risk_upgrade'
  | 'stalled';

export type JourneyExercise = {
  __typename: 'JourneyExercise';
  count: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type JourneyHealthAlert = {
  __typename: 'JourneyHealthAlert';
  acknowledgedAt?: Maybe<Scalars['DateTime']['output']>;
  alertType: JourneyAlertType;
  createdAt: Scalars['DateTime']['output'];
  dismissedAt?: Maybe<Scalars['DateTime']['output']>;
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  message: Scalars['String']['output'];
  notificationSent: Scalars['Boolean']['output'];
  resolvedAt?: Maybe<Scalars['DateTime']['output']>;
  severity: JourneyAlertSeverity;
  status: JourneyAlertStatus;
  title: Scalars['String']['output'];
  triggerData?: Maybe<Scalars['JSON']['output']>;
  userId: Scalars['ID']['output'];
  userJourneyId: Scalars['ID']['output'];
};

export type JourneyHealthHistoryEntry = {
  __typename: 'JourneyHealthHistoryEntry';
  consistencyScore: Scalars['Int']['output'];
  date: Scalars['String']['output'];
  engagementScore: Scalars['Int']['output'];
  healthScore: Scalars['Int']['output'];
  momentumScore: Scalars['Int']['output'];
  riskLevel: JourneyRiskLevel;
};

export type JourneyHealthRecalcResult = {
  __typename: 'JourneyHealthRecalcResult';
  alertsCreated: Scalars['Int']['output'];
  durationMs: Scalars['Int']['output'];
  journeysProcessed: Scalars['Int']['output'];
};

export type JourneyHealthScore = {
  __typename: 'JourneyHealthScore';
  actualCheckins: Scalars['Int']['output'];
  actualDailyProgress: Scalars['Float']['output'];
  calculatedAt: Scalars['DateTime']['output'];
  checkinConsistency: Scalars['Float']['output'];
  consistencyScore: Scalars['Int']['output'];
  daysSinceLastProgress: Scalars['Int']['output'];
  deviationPercentage: Scalars['Float']['output'];
  engagementScore: Scalars['Int']['output'];
  expectedCheckins: Scalars['Int']['output'];
  expectedDailyProgress: Scalars['Float']['output'];
  healthScore: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  lastActivityAt?: Maybe<Scalars['DateTime']['output']>;
  milestonesBehind: Scalars['Int']['output'];
  milestonesCompleted: Scalars['Int']['output'];
  milestonesOnTrack: Scalars['Int']['output'];
  milestonesTotal: Scalars['Int']['output'];
  momentumScore: Scalars['Int']['output'];
  progressRate: Scalars['Float']['output'];
  riskFactors: Array<JourneyRiskFactor>;
  riskLevel: JourneyRiskLevel;
  score7dChange: Scalars['Int']['output'];
  score30dChange: Scalars['Int']['output'];
  scoreTrend: JourneyScoreTrend;
  streakCurrent: Scalars['Int']['output'];
  streakLongest: Scalars['Int']['output'];
  totalActiveDays: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
  userJourneyId: Scalars['ID']['output'];
};

export type JourneyLevel = {
  __typename: 'JourneyLevel';
  achieved: Scalars['Boolean']['output'];
  level: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  totalTu: Scalars['Float']['output'];
};

export type JourneyMuscle = {
  __typename: 'JourneyMuscle';
  group: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  totalActivation: Scalars['Float']['output'];
};

export type JourneyMuscleGroup = {
  __typename: 'JourneyMuscleGroup';
  name: Scalars['String']['output'];
  total: Scalars['Float']['output'];
};

export type JourneyOverview = {
  __typename: 'JourneyOverview';
  currentArchetype: Scalars['String']['output'];
  currentLevel: Scalars['Int']['output'];
  currentLevelName: Scalars['String']['output'];
  daysSinceJoined: Scalars['Int']['output'];
  levels: Array<JourneyLevel>;
  muscleBreakdown: Array<JourneyMuscle>;
  muscleGroups: Array<JourneyMuscleGroup>;
  nextLevelTU: Scalars['Float']['output'];
  paths: Array<JourneyPath>;
  recentWorkouts: Array<JourneyWorkout>;
  stats: JourneyStats;
  streak: Scalars['Int']['output'];
  topExercises: Array<JourneyExercise>;
  totalTU: Scalars['Float']['output'];
  totalWorkouts: Scalars['Int']['output'];
  workoutHistory: Array<JourneyWorkoutDay>;
};

export type JourneyPath = {
  __typename: 'JourneyPath';
  archetype: Scalars['String']['output'];
  focusAreas: Array<Scalars['String']['output']>;
  isCurrent: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  percentComplete: Scalars['Float']['output'];
  philosophy?: Maybe<Scalars['String']['output']>;
};

export type JourneyPeriodStats = {
  __typename: 'JourneyPeriodStats';
  avgTuPerWorkout: Scalars['Float']['output'];
  tu: Scalars['Float']['output'];
  workouts: Scalars['Int']['output'];
};

export type JourneyProgress = {
  __typename: 'JourneyProgress';
  archetype?: Maybe<Archetype>;
  completedMilestones: Array<Scalars['String']['output']>;
  currentLevel: Scalars['Int']['output'];
  currentXP: Scalars['Int']['output'];
  stats?: Maybe<CharacterStats>;
  totalXP: Scalars['Int']['output'];
  unlockedAbilities: Array<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
  xpToNextLevel: Scalars['Int']['output'];
};

export type JourneyRecommendation = {
  __typename: 'JourneyRecommendation';
  actionText?: Maybe<Scalars['String']['output']>;
  actionUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description: Scalars['String']['output'];
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  feedbackText?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  priority: Scalars['Int']['output'];
  reasoning: JourneyRecommendationReasoning;
  recommendationType: JourneyRecommendationType;
  status: JourneyRecommendationStatus;
  title: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
  userJourneyId: Scalars['ID']['output'];
  wasHelpful?: Maybe<Scalars['Boolean']['output']>;
};

export type JourneyRecommendationReasoning = {
  __typename: 'JourneyRecommendationReasoning';
  confidence: Scalars['Float']['output'];
  factors: Array<Scalars['String']['output']>;
};

export type JourneyRecommendationStatus =
  | 'actioned'
  | 'active'
  | 'dismissed'
  | 'expired'
  | 'viewed';

export type JourneyRecommendationType =
  | 'adjust_goal'
  | 'archive_journey'
  | 'celebrate_progress'
  | 'change_approach'
  | 'connect_buddy'
  | 'increase_frequency'
  | 'join_challenge'
  | 'restart_journey'
  | 'seek_support'
  | 'set_reminder'
  | 'simplify_goal'
  | 'take_break';

export type JourneyRiskFactor = {
  __typename: 'JourneyRiskFactor';
  completed?: Maybe<Scalars['Int']['output']>;
  days?: Maybe<Scalars['Int']['output']>;
  factor: Scalars['String']['output'];
  progressGap?: Maybe<Scalars['Float']['output']>;
  ratio?: Maybe<Scalars['Float']['output']>;
  total?: Maybe<Scalars['Int']['output']>;
  weight: Scalars['Int']['output'];
};

export type JourneyRiskLevel =
  | 'at_risk'
  | 'critical'
  | 'healthy'
  | 'stalled';

export type JourneyScoreTrend =
  | 'critical_decline'
  | 'declining'
  | 'improving'
  | 'stable';

export type JourneyStats = {
  __typename: 'JourneyStats';
  allTime: JourneyPeriodStats;
  monthly: JourneyPeriodStats;
  weekly: JourneyPeriodStats;
};

export type JourneyWorkout = {
  __typename: 'JourneyWorkout';
  createdAt: Scalars['DateTime']['output'];
  date: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  tu: Scalars['Float']['output'];
};

export type JourneyWorkoutDay = {
  __typename: 'JourneyWorkoutDay';
  count: Scalars['Int']['output'];
  date: Scalars['String']['output'];
  tu: Scalars['Float']['output'];
};

/** User's encryption key bundle for E2EE */
export type KeyBundle = {
  __typename: 'KeyBundle';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  deviceId?: Maybe<Scalars['String']['output']>;
  deviceName?: Maybe<Scalars['String']['output']>;
  deviceType?: Maybe<Scalars['String']['output']>;
  hasOneTimePreKey?: Maybe<Scalars['Boolean']['output']>;
  identityKey: Scalars['String']['output'];
  prekeyCount?: Maybe<Scalars['Int']['output']>;
  signedPreKey: Scalars['String']['output'];
  signedPreKeySignature: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  userId: Scalars['ID']['output'];
};

export type LeaderboardEntry = {
  __typename: 'LeaderboardEntry';
  avatar?: Maybe<Scalars['String']['output']>;
  level: Scalars['Int']['output'];
  rank: Scalars['Int']['output'];
  stat: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
  value: Scalars['Int']['output'];
  xp: Scalars['Int']['output'];
};

export type LeaderboardPosition = {
  __typename: 'LeaderboardPosition';
  archetype?: Maybe<Scalars['Int']['output']>;
  overall?: Maybe<Scalars['Int']['output']>;
  weekly?: Maybe<Scalars['Int']['output']>;
};

/** Leaderboard type */
export type LeaderboardType =
  | 'allTime'
  | 'archetype'
  | 'crew'
  | 'daily'
  | 'monthly'
  | 'weekly';

export type Limitation = {
  __typename: 'Limitation';
  avoidImpact: Scalars['Boolean']['output'];
  avoidMovements?: Maybe<Array<Scalars['String']['output']>>;
  avoidWeightBearing: Scalars['Boolean']['output'];
  bodyRegionId?: Maybe<Scalars['ID']['output']>;
  bodyRegionName?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  diagnosedBy?: Maybe<Scalars['String']['output']>;
  expectedRecoveryDate?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  lastReviewed?: Maybe<Scalars['DateTime']['output']>;
  limitationType: Scalars['String']['output'];
  maxReps?: Maybe<Scalars['Int']['output']>;
  maxWeightLbs?: Maybe<Scalars['Int']['output']>;
  medicalNotes?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  onsetDate?: Maybe<Scalars['DateTime']['output']>;
  ptApproved: Scalars['Boolean']['output'];
  romExtensionPercent?: Maybe<Scalars['Int']['output']>;
  romFlexionPercent?: Maybe<Scalars['Int']['output']>;
  romRotationPercent?: Maybe<Scalars['Int']['output']>;
  severity: Scalars['String']['output'];
  status: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  userId: Scalars['ID']['output'];
};

export type LimitationInput = {
  avoidImpact?: InputMaybe<Scalars['Boolean']['input']>;
  avoidMovements?: InputMaybe<Array<Scalars['String']['input']>>;
  avoidWeightBearing?: InputMaybe<Scalars['Boolean']['input']>;
  bodyRegionId?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  diagnosedBy?: InputMaybe<Scalars['String']['input']>;
  expectedRecoveryDate?: InputMaybe<Scalars['DateTime']['input']>;
  limitationType: Scalars['String']['input'];
  maxReps?: InputMaybe<Scalars['Int']['input']>;
  maxWeightLbs?: InputMaybe<Scalars['Int']['input']>;
  medicalNotes?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  onsetDate?: InputMaybe<Scalars['DateTime']['input']>;
  ptApproved?: InputMaybe<Scalars['Boolean']['input']>;
  romExtensionPercent?: InputMaybe<Scalars['Int']['input']>;
  romFlexionPercent?: InputMaybe<Scalars['Int']['input']>;
  romRotationPercent?: InputMaybe<Scalars['Int']['input']>;
  severity?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};

export type LimitationIssue = {
  __typename: 'LimitationIssue';
  exerciseId: Scalars['ID']['output'];
  exerciseName: Scalars['String']['output'];
  limitation: Limitation;
  severity: Scalars['String']['output'];
};

export type Location = {
  __typename: 'Location';
  avgRating?: Maybe<Scalars['Float']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  distance?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  lat?: Maybe<Scalars['Float']['output']>;
  lng?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  ratingCount?: Maybe<Scalars['Int']['output']>;
  type: Scalars['String']['output'];
};

export type LocationAmenity = {
  __typename: 'LocationAmenity';
  amenity: Scalars['String']['output'];
  count: Scalars['Int']['output'];
};

export type LocationComment = {
  __typename: 'LocationComment';
  comment: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  upvotes: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
  username?: Maybe<Scalars['String']['output']>;
};

export type LocationDetails = {
  __typename: 'LocationDetails';
  amenities: Array<LocationAmenity>;
  comments: Array<LocationComment>;
  location?: Maybe<Location>;
  ratings?: Maybe<LocationRatings>;
};

export type LocationEquipment = {
  __typename: 'LocationEquipment';
  equipment: EquipmentType;
  equipmentId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  lastVerified?: Maybe<Scalars['DateTime']['output']>;
  locationId: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  verifiedBy?: Maybe<Scalars['ID']['output']>;
};

export type LocationInput = {
  amenities?: InputMaybe<Array<Scalars['String']['input']>>;
  city?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  lat?: InputMaybe<Scalars['Float']['input']>;
  lng?: InputMaybe<Scalars['Float']['input']>;
  name: Scalars['String']['input'];
  type: Scalars['String']['input'];
};

export type LocationRating = {
  __typename: 'LocationRating';
  cleanliness?: Maybe<Scalars['Int']['output']>;
  comment?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  crowdLevel?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  locationId: Scalars['ID']['output'];
  rating: Scalars['Int']['output'];
  safetyRating?: Maybe<Scalars['Int']['output']>;
};

export type LocationRatingInput = {
  cleanliness?: InputMaybe<Scalars['Int']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  crowdLevel?: InputMaybe<Scalars['Int']['input']>;
  rating: Scalars['Int']['input'];
  safetyRating?: InputMaybe<Scalars['Int']['input']>;
};

export type LocationRatings = {
  __typename: 'LocationRatings';
  avgClean?: Maybe<Scalars['Float']['output']>;
  avgCrowd?: Maybe<Scalars['Float']['output']>;
  avgRating?: Maybe<Scalars['Float']['output']>;
  avgSafety?: Maybe<Scalars['Float']['output']>;
  totalRatings: Scalars['Int']['output'];
};

/** Input for updating location record privacy */
export type LocationRecordPrivacyInput = {
  shareLocationRecords: Scalars['Boolean']['input'];
  shareVenueActivity: Scalars['Boolean']['input'];
};

export type LogSetInput = {
  clientSetId?: InputMaybe<Scalars['String']['input']>;
  durationSeconds?: InputMaybe<Scalars['Int']['input']>;
  exerciseId: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  reps?: InputMaybe<Scalars['Int']['input']>;
  restSeconds?: InputMaybe<Scalars['Int']['input']>;
  rir?: InputMaybe<Scalars['Int']['input']>;
  rpe?: InputMaybe<Scalars['Float']['input']>;
  sessionId: Scalars['ID']['input'];
  setNumber: Scalars['Int']['input'];
  tag?: InputMaybe<Scalars['String']['input']>;
  weightKg?: InputMaybe<Scalars['Float']['input']>;
};

export type LoggedSet = {
  __typename: 'LoggedSet';
  durationSeconds?: Maybe<Scalars['Int']['output']>;
  exerciseId: Scalars['ID']['output'];
  exerciseName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isPR1RM: Scalars['Boolean']['output'];
  isPRReps: Scalars['Boolean']['output'];
  isPRWeight: Scalars['Boolean']['output'];
  muscleActivations: Array<MuscleActivation>;
  notes?: Maybe<Scalars['String']['output']>;
  performedAt: Scalars['DateTime']['output'];
  reps?: Maybe<Scalars['Int']['output']>;
  restSeconds?: Maybe<Scalars['Int']['output']>;
  rir?: Maybe<Scalars['Int']['output']>;
  rpe?: Maybe<Scalars['Float']['output']>;
  setNumber: Scalars['Int']['output'];
  tag?: Maybe<Scalars['String']['output']>;
  tu?: Maybe<Scalars['Float']['output']>;
  weightKg?: Maybe<Scalars['Float']['output']>;
};

export type LoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type MacroBreakdown = {
  __typename: 'MacroBreakdown';
  carbsCalories: Scalars['Int']['output'];
  fatCalories: Scalars['Int']['output'];
  proteinCalories: Scalars['Int']['output'];
};

export type MacroCalculationInput = {
  activityLevel: Scalars['String']['input'];
  age: Scalars['Int']['input'];
  archetype?: InputMaybe<Scalars['String']['input']>;
  gender: Scalars['String']['input'];
  goal: Scalars['String']['input'];
  heightCm: Scalars['Float']['input'];
  weightKg: Scalars['Float']['input'];
};

export type MacroCalculationResult = {
  __typename: 'MacroCalculationResult';
  bmr: Scalars['Int']['output'];
  breakdown: MacroBreakdown;
  calories: Scalars['Int']['output'];
  carbsG: Scalars['Int']['output'];
  carbsRatio: Scalars['Float']['output'];
  fatG: Scalars['Int']['output'];
  fatRatio: Scalars['Float']['output'];
  proteinG: Scalars['Int']['output'];
  proteinRatio: Scalars['Float']['output'];
  tdee: Scalars['Int']['output'];
};

export type MapBoundsInput = {
  east: Scalars['Float']['input'];
  north: Scalars['Float']['input'];
  south: Scalars['Float']['input'];
  west: Scalars['Float']['input'];
};

export type MarketplaceListing = {
  __typename: 'MarketplaceListing';
  allowOffers?: Maybe<Scalars['Boolean']['output']>;
  bidCount?: Maybe<Scalars['Int']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  cosmeticIcon?: Maybe<Scalars['String']['output']>;
  cosmeticName: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  currentBid?: Maybe<Scalars['Int']['output']>;
  expiresAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  listingType: Scalars['String']['output'];
  minOffer?: Maybe<Scalars['Int']['output']>;
  price?: Maybe<Scalars['Int']['output']>;
  rarity: Scalars['String']['output'];
  sellerId: Scalars['ID']['output'];
  sellerUsername: Scalars['String']['output'];
};

export type MarketplaceListingsResult = {
  __typename: 'MarketplaceListingsResult';
  hasMore: Scalars['Boolean']['output'];
  listings: Array<MarketplaceListing>;
  nextCursor?: Maybe<Scalars['String']['output']>;
};

export type MarketplaceStats = {
  __typename: 'MarketplaceStats';
  avgRating?: Maybe<Scalars['Float']['output']>;
  feeDiscount: Scalars['Float']['output'];
  sellerLevel: Scalars['Int']['output'];
  totalPurchases: Scalars['Int']['output'];
  totalRevenue: Scalars['Int']['output'];
  totalSales: Scalars['Int']['output'];
};

export type MarketplaceWatchlistItem = {
  __typename: 'MarketplaceWatchlistItem';
  cosmeticIcon?: Maybe<Scalars['String']['output']>;
  cosmeticName?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  listingId: Scalars['ID']['output'];
  listingType?: Maybe<Scalars['String']['output']>;
  price?: Maybe<Scalars['Int']['output']>;
  rarity?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
};

export type MartialArtsCategory = {
  __typename: 'MartialArtsCategory';
  description?: Maybe<Scalars['String']['output']>;
  disciplineId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  orderIndex: Scalars['Int']['output'];
};

export type MartialArtsDiscipline = {
  __typename: 'MartialArtsDiscipline';
  categories?: Maybe<Array<MartialArtsCategory>>;
  color?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  focusAreas: Array<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isMilitary: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  orderIndex: Scalars['Int']['output'];
  originCountry?: Maybe<Scalars['String']['output']>;
};

export type MartialArtsSummary = {
  __typename: 'MartialArtsSummary';
  availableTechniques: Scalars['Int']['output'];
  disciplineProgress: Array<DisciplineProgress>;
  learningTechniques: Scalars['Int']['output'];
  masteredTechniques: Scalars['Int']['output'];
  totalPracticeMinutes: Scalars['Int']['output'];
  totalTechniques: Scalars['Int']['output'];
};

export type MartialArtsTechnique = {
  __typename: 'MartialArtsTechnique';
  category: Scalars['String']['output'];
  categoryId?: Maybe<Scalars['ID']['output']>;
  commonMistakes: Array<Scalars['String']['output']>;
  creditReward: Scalars['Int']['output'];
  description?: Maybe<Scalars['String']['output']>;
  difficulty: Scalars['Int']['output'];
  disciplineId: Scalars['ID']['output'];
  drillSuggestions: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  keyPoints: Array<Scalars['String']['output']>;
  muscleGroups: Array<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  prerequisites: Array<Scalars['String']['output']>;
  progress?: Maybe<UserTechniqueProgress>;
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  tier: Scalars['Int']['output'];
  videoUrl?: Maybe<Scalars['String']['output']>;
  xpReward: Scalars['Int']['output'];
};

export type MascotAnimationConfig = {
  __typename: 'MascotAnimationConfig';
  blinkRate: Scalars['Float']['output'];
  bounciness: Scalars['Float']['output'];
  breathingDepth: Scalars['Float']['output'];
  idleSpeed: Scalars['Float']['output'];
  movementAmplitude: Scalars['Float']['output'];
};

export type MascotAppearance = {
  __typename: 'MascotAppearance';
  animationConfig: MascotAnimationConfig;
  base: MascotBaseTraits;
  equipped: MascotLoadout;
  final: MascotFinalAppearance;
  stageFeatures: MascotStageFeatures;
};

export type MascotAssistAbility = {
  __typename: 'MascotAssistAbility';
  cooldownHours: Scalars['Int']['output'];
  dailyCharges: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  maxExercises: Scalars['Int']['output'];
  name: Scalars['String']['output'];
};

export type MascotAssistResult = {
  __typename: 'MascotAssistResult';
  assistLogId?: Maybe<Scalars['ID']['output']>;
  chargesRemaining?: Maybe<Scalars['Int']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  tuAwarded?: Maybe<Scalars['Float']['output']>;
};

export type MascotAssistState = {
  __typename: 'MascotAssistState';
  ability?: Maybe<MascotAssistAbility>;
  canUseAssist: Scalars['Boolean']['output'];
  chargesMax: Scalars['Int']['output'];
  chargesRemaining: Scalars['Int']['output'];
  companionStage: Scalars['Int']['output'];
  cooldownEndsAt?: Maybe<Scalars['DateTime']['output']>;
  exercisesAssistedToday: Scalars['Int']['output'];
  lastAssistUsed?: Maybe<Scalars['DateTime']['output']>;
  lastChargeReset?: Maybe<Scalars['DateTime']['output']>;
  totalAssistsUsed: Scalars['Int']['output'];
  userRankTier: Scalars['Int']['output'];
};

export type MascotBaseTraits = {
  __typename: 'MascotBaseTraits';
  accentColor: Scalars['String']['output'];
  baseColor: Scalars['String']['output'];
  bodyShape: Scalars['String']['output'];
  demeanor: Scalars['String']['output'];
  earStyle: Scalars['String']['output'];
  energyLevel: Scalars['String']['output'];
  expressionDefault: Scalars['String']['output'];
  eyeColor: Scalars['String']['output'];
  eyeStyle: Scalars['String']['output'];
  mouthStyle: Scalars['String']['output'];
  patternIntensity: Scalars['Float']['output'];
  patternType: Scalars['String']['output'];
  secondaryColor: Scalars['String']['output'];
  species: Scalars['String']['output'];
  tailStyle: Scalars['String']['output'];
};

export type MascotBonusMultiplier = {
  __typename: 'MascotBonusMultiplier';
  consecutiveBonus: Scalars['Float']['output'];
  consecutiveDays: Scalars['Int']['output'];
  firstWorkoutBonus: Scalars['Float']['output'];
  totalMultiplier: Scalars['Float']['output'];
};

export type MascotCosmetic = {
  __typename: 'MascotCosmetic';
  assetUrl?: Maybe<Scalars['String']['output']>;
  basePrice: Scalars['Int']['output'];
  category: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isGiftable: Scalars['Boolean']['output'];
  isPurchasable: Scalars['Boolean']['output'];
  isTradeable: Scalars['Boolean']['output'];
  itemKey: Scalars['String']['output'];
  name: Scalars['String']['output'];
  previewUrl?: Maybe<Scalars['String']['output']>;
  rarity: Scalars['String']['output'];
  slot?: Maybe<Scalars['String']['output']>;
  stageRequired: Scalars['Int']['output'];
};

export type MascotCreditAlert = {
  __typename: 'MascotCreditAlert';
  alertType: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  currentBalance: Scalars['Int']['output'];
  dismissed: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  message: Scalars['String']['output'];
  workoutCost?: Maybe<Scalars['Int']['output']>;
};

export type MascotCreditLoanOffer = {
  __typename: 'MascotCreditLoanOffer';
  available: Scalars['Boolean']['output'];
  canBorrow: Scalars['Boolean']['output'];
  currentLoan: Scalars['Int']['output'];
  interestRate: Scalars['Float']['output'];
  maxAmount: Scalars['Int']['output'];
  reason?: Maybe<Scalars['String']['output']>;
};

export type MascotCreditLoanResult = {
  __typename: 'MascotCreditLoanResult';
  amountRepaid?: Maybe<Scalars['Int']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  newBalance?: Maybe<Scalars['Int']['output']>;
  remainingDebt?: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
};

export type MascotCrewSuggestion = {
  __typename: 'MascotCrewSuggestion';
  crewId: Scalars['ID']['output'];
  crewName: Scalars['String']['output'];
  matchReasons: Array<Scalars['String']['output']>;
  matchScore: Scalars['Int']['output'];
  memberCount: Scalars['Int']['output'];
};

export type MascotEnergy = {
  __typename: 'MascotEnergy';
  current: Scalars['Int']['output'];
  max: Scalars['Int']['output'];
  regenPerHour: Scalars['Int']['output'];
};

export type MascotExerciseAlternative = {
  __typename: 'MascotExerciseAlternative';
  difficulty: Scalars['String']['output'];
  equipment: Array<Scalars['String']['output']>;
  exerciseId: Scalars['ID']['output'];
  exerciseName: Scalars['String']['output'];
  reason: Scalars['String']['output'];
  similarityScore: Scalars['Float']['output'];
};

export type MascotExerciseAvoidanceInput = {
  avoidanceType: Scalars['String']['input'];
  exerciseId: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type MascotFinalAppearance = {
  __typename: 'MascotFinalAppearance';
  activeEffects: Array<Scalars['String']['output']>;
  colorPalette: Array<Scalars['String']['output']>;
  renderSeed: Scalars['String']['output'];
};

export type MascotGeneratedProgram = {
  __typename: 'MascotGeneratedProgram';
  creditCost: Scalars['Int']['output'];
  daysPerWeek: Scalars['Int']['output'];
  durationWeeks: Scalars['Int']['output'];
  goal: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  schedule: Scalars['JSON']['output'];
  type: Scalars['String']['output'];
  workouts: Array<MascotProgramWorkout>;
};

export type MascotHighfivePrefs = {
  __typename: 'MascotHighfivePrefs';
  allFollowing: Scalars['Boolean']['output'];
  closeFriends: Scalars['Boolean']['output'];
  crew: Scalars['Boolean']['output'];
  dailyLimit: Scalars['Int']['output'];
  enabled: Scalars['Boolean']['output'];
  usedToday: Scalars['Int']['output'];
};

export type MascotHighfivePrefsInput = {
  allFollowing?: InputMaybe<Scalars['Boolean']['input']>;
  closeFriends?: InputMaybe<Scalars['Boolean']['input']>;
  crew?: InputMaybe<Scalars['Boolean']['input']>;
  dailyLimit?: InputMaybe<Scalars['Int']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
};

export type MascotLoadout = {
  __typename: 'MascotLoadout';
  accessory1?: Maybe<MascotCosmetic>;
  accessory2?: Maybe<MascotCosmetic>;
  accessory3?: Maybe<MascotCosmetic>;
  aura?: Maybe<MascotCosmetic>;
  background?: Maybe<MascotCosmetic>;
  emoteIdle?: Maybe<MascotCosmetic>;
  emoteVictory?: Maybe<MascotCosmetic>;
  eyes?: Maybe<MascotCosmetic>;
  footwear?: Maybe<MascotCosmetic>;
  headwear?: Maybe<MascotCosmetic>;
  outfit?: Maybe<MascotCosmetic>;
  skin?: Maybe<MascotCosmetic>;
};

export type MascotMasterAbility = {
  __typename: 'MascotMasterAbility';
  abilityKey: Scalars['String']['output'];
  abilityName: Scalars['String']['output'];
  category: Scalars['String']['output'];
  creditCost: Scalars['Int']['output'];
  description: Scalars['String']['output'];
  unlocked: Scalars['Boolean']['output'];
};

export type MascotMilestoneProgress = {
  __typename: 'MascotMilestoneProgress';
  confidencePercent: Scalars['Int']['output'];
  currentValue: Scalars['Int']['output'];
  estimatedCompletion?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  milestoneName: Scalars['String']['output'];
  milestoneType: Scalars['String']['output'];
  targetValue: Scalars['Int']['output'];
};

export type MascotNegotiatedRate = {
  __typename: 'MascotNegotiatedRate';
  available: Scalars['Boolean']['output'];
  discountPercent: Scalars['Int']['output'];
};

export type MascotOvertrainingAlert = {
  __typename: 'MascotOvertrainingAlert';
  affectedArea: Scalars['String']['output'];
  alertType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  recommendation?: Maybe<Scalars['String']['output']>;
  riskLevel: Scalars['String']['output'];
};

export type MascotOwnedCosmetic = {
  __typename: 'MascotOwnedCosmetic';
  acquiredAt: Scalars['DateTime']['output'];
  acquisitionMethod: Scalars['String']['output'];
  cosmetic: MascotCosmetic;
  creditsSpent: Scalars['Int']['output'];
  giftedBy?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isFavorite: Scalars['Boolean']['output'];
  isNew: Scalars['Boolean']['output'];
};

export type MascotPowers = {
  __typename: 'MascotPowers';
  bonusMultiplier: MascotBonusMultiplier;
  canAutoHighfive: Scalars['Boolean']['output'];
  canCoordinateCrews: Scalars['Boolean']['output'];
  canDetectAnomalies: Scalars['Boolean']['output'];
  canGeneratePrograms: Scalars['Boolean']['output'];
  canPredictMilestones: Scalars['Boolean']['output'];
  canSuggestRecovery: Scalars['Boolean']['output'];
  canSuggestSettings: Scalars['Boolean']['output'];
  canTrashTalk: Scalars['Boolean']['output'];
  companionStage: Scalars['Int']['output'];
  creditGuardianFeatures: Array<Scalars['String']['output']>;
  energy: MascotEnergy;
  hasInjuryPrevention: Scalars['Boolean']['output'];
  hasNutritionHints: Scalars['Boolean']['output'];
  masterAbilities: Array<Scalars['String']['output']>;
  schedulerLevel: Scalars['String']['output'];
  streakSaver: MascotStreakSaver;
};

export type MascotPreset = {
  __typename: 'MascotPreset';
  createdAt: Scalars['DateTime']['output'];
  icon: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  loadout: Scalars['JSON']['output'];
  name: Scalars['String']['output'];
};

export type MascotProgramExercise = {
  __typename: 'MascotProgramExercise';
  exerciseId: Scalars['ID']['output'];
  exerciseName: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  reps: Scalars['String']['output'];
  restSeconds: Scalars['Int']['output'];
  sets: Scalars['Int']['output'];
};

export type MascotProgramGenerationInput = {
  daysPerWeek: Scalars['Int']['input'];
  durationWeeks: Scalars['Int']['input'];
  equipment?: InputMaybe<Array<Scalars['String']['input']>>;
  goal: Scalars['String']['input'];
  programType: Scalars['String']['input'];
};

export type MascotProgramGenerationResult = {
  __typename: 'MascotProgramGenerationResult';
  creditCost?: Maybe<Scalars['Int']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  program?: Maybe<MascotGeneratedProgram>;
  success: Scalars['Boolean']['output'];
};

export type MascotProgramWorkout = {
  __typename: 'MascotProgramWorkout';
  dayNumber: Scalars['Int']['output'];
  durationMinutes: Scalars['Int']['output'];
  exercises: Array<MascotProgramExercise>;
  focusAreas: Array<Scalars['String']['output']>;
  isDeload: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  weekNumber: Scalars['Int']['output'];
};

export type MascotProgression = {
  __typename: 'MascotProgression';
  currentXp: Scalars['Int']['output'];
  isMaxStage: Scalars['Boolean']['output'];
  nextStageXp: Scalars['Int']['output'];
  prevStageXp: Scalars['Int']['output'];
  progressPercent: Scalars['Float']['output'];
};

export type MascotPurchaseResult = {
  __typename: 'MascotPurchaseResult';
  cosmetic?: Maybe<MascotCosmetic>;
  creditsSpent?: Maybe<Scalars['Int']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  newBalance?: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
};

export type MascotReaction = {
  __typename: 'MascotReaction';
  animation: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  duration: Scalars['Int']['output'];
  emote: Scalars['String']['output'];
  eventId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  intensity: Scalars['Float']['output'];
  message: Scalars['String']['output'];
  reactionType: Scalars['String']['output'];
  shown: Scalars['Boolean']['output'];
  soundEffect?: Maybe<Scalars['String']['output']>;
};

export type MascotRivalryAlert = {
  __typename: 'MascotRivalryAlert';
  alertType: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  rivalAction?: Maybe<Scalars['String']['output']>;
  rivalUserId: Scalars['ID']['output'];
  rivalUsername: Scalars['String']['output'];
  suggestion?: Maybe<Scalars['String']['output']>;
  yourStanding?: Maybe<Scalars['String']['output']>;
};

export type MascotSettingsInput = {
  isMinimized?: InputMaybe<Scalars['Boolean']['input']>;
  isVisible?: InputMaybe<Scalars['Boolean']['input']>;
  soundsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  tipsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
};

export type MascotShopItem = {
  __typename: 'MascotShopItem';
  cosmetic: MascotCosmetic;
  discountPercent: Scalars['Int']['output'];
  finalPrice: Scalars['Int']['output'];
  isFeatured: Scalars['Boolean']['output'];
  owned: Scalars['Boolean']['output'];
  slotNumber: Scalars['Int']['output'];
};

export type MascotSocialAction = {
  __typename: 'MascotSocialAction';
  actionData: Scalars['JSON']['output'];
  actionType: Scalars['String']['output'];
  priority: Scalars['Int']['output'];
  targetUserId: Scalars['ID']['output'];
  targetUsername: Scalars['String']['output'];
};

export type MascotStageFeatures = {
  __typename: 'MascotStageFeatures';
  auraUnlocked: Scalars['Boolean']['output'];
  evolutionGlow: Scalars['Boolean']['output'];
  specialEffectsUnlocked: Scalars['Boolean']['output'];
  stage: Scalars['Int']['output'];
  wingsUnlocked: Scalars['Boolean']['output'];
};

export type MascotState = {
  __typename: 'MascotState';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isMinimized: Scalars['Boolean']['output'];
  isVisible: Scalars['Boolean']['output'];
  nickname?: Maybe<Scalars['String']['output']>;
  progression: MascotProgression;
  soundsEnabled: Scalars['Boolean']['output'];
  stage: Scalars['Int']['output'];
  tipsEnabled: Scalars['Boolean']['output'];
  userId: Scalars['ID']['output'];
  xp: Scalars['Int']['output'];
};

export type MascotStreakSaveResult = {
  __typename: 'MascotStreakSaveResult';
  error?: Maybe<Scalars['String']['output']>;
  saveId?: Maybe<Scalars['ID']['output']>;
  success: Scalars['Boolean']['output'];
};

export type MascotStreakSaver = {
  __typename: 'MascotStreakSaver';
  canSaveAnyStreak: Scalars['Boolean']['output'];
  creditCost: Scalars['Int']['output'];
  energyCost: Scalars['Int']['output'];
  savesRemaining: Scalars['Int']['output'];
  savesUsed: Scalars['Int']['output'];
  weeklySaves: Scalars['Int']['output'];
};

export type MascotTimelineEvent = {
  __typename: 'MascotTimelineEvent';
  eventData?: Maybe<Scalars['JSON']['output']>;
  eventType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  importance: Scalars['String']['output'];
  timestamp: Scalars['DateTime']['output'];
};

export type MascotTimelineItem = {
  __typename: 'MascotTimelineItem';
  event: MascotTimelineEvent;
  reaction?: Maybe<MascotReaction>;
};

export type MascotVolumeStats = {
  __typename: 'MascotVolumeStats';
  averageIntensity: Scalars['Float']['output'];
  frequency: Scalars['Int']['output'];
  muscleGroup: Scalars['String']['output'];
  recommendation?: Maybe<Scalars['String']['output']>;
  trend: Scalars['String']['output'];
  weeklyVolume: Scalars['Int']['output'];
};

export type MascotWardrobe = {
  __typename: 'MascotWardrobe';
  currentLoadout: MascotLoadout;
  inventory: Array<MascotOwnedCosmetic>;
  presets: Array<MascotPreset>;
};

export type MascotWorkoutSuggestion = {
  __typename: 'MascotWorkoutSuggestion';
  durationMinutes: Scalars['Int']['output'];
  focusMuscles: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  reason: Scalars['String']['output'];
  recommendedExercises: Array<Scalars['String']['output']>;
  suggestedFor: Scalars['DateTime']['output'];
  suggestionType: Scalars['String']['output'];
};

export type MealLog = {
  __typename: 'MealLog';
  createdAt: Scalars['DateTime']['output'];
  food?: Maybe<FoodItem>;
  foodItemId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  loggedAt: Scalars['DateTime']['output'];
  loggedVia: Scalars['String']['output'];
  mealType: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  quickEntryCalories?: Maybe<Scalars['Int']['output']>;
  quickEntryName?: Maybe<Scalars['String']['output']>;
  servings: Scalars['Float']['output'];
  totalCalories: Scalars['Int']['output'];
  totalCarbsG: Scalars['Float']['output'];
  totalFatG: Scalars['Float']['output'];
  totalFiberG?: Maybe<Scalars['Float']['output']>;
  totalProteinG: Scalars['Float']['output'];
  userId: Scalars['ID']['output'];
};

export type MealLogInput = {
  foodId?: InputMaybe<Scalars['ID']['input']>;
  loggedAt?: InputMaybe<Scalars['DateTime']['input']>;
  loggedVia?: InputMaybe<Scalars['String']['input']>;
  mealType: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  quickEntryCalories?: InputMaybe<Scalars['Int']['input']>;
  quickEntryCarbsG?: InputMaybe<Scalars['Float']['input']>;
  quickEntryFatG?: InputMaybe<Scalars['Float']['input']>;
  quickEntryName?: InputMaybe<Scalars['String']['input']>;
  quickEntryProteinG?: InputMaybe<Scalars['Float']['input']>;
  servings?: InputMaybe<Scalars['Float']['input']>;
};

export type MealPlan = {
  __typename: 'MealPlan';
  avgCalories?: Maybe<Scalars['Int']['output']>;
  avgCarbsG?: Maybe<Scalars['Int']['output']>;
  avgFatG?: Maybe<Scalars['Int']['output']>;
  avgProteinG?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['DateTime']['output'];
  days?: Maybe<Array<MealPlanDay>>;
  description?: Maybe<Scalars['String']['output']>;
  durationDays: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  mealsPerDay: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  preferences?: Maybe<Array<Scalars['String']['output']>>;
  shoppingList?: Maybe<Array<ShoppingListItem>>;
  startDate?: Maybe<Scalars['DateTime']['output']>;
  status: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export type MealPlanDay = {
  __typename: 'MealPlanDay';
  date?: Maybe<Scalars['DateTime']['output']>;
  dayNumber: Scalars['Int']['output'];
  meals: Array<MealPlanMeal>;
  totalCalories: Scalars['Int']['output'];
  totalCarbsG: Scalars['Float']['output'];
  totalFatG: Scalars['Float']['output'];
  totalProteinG: Scalars['Float']['output'];
};

export type MealPlanGenerateInput = {
  durationDays: Scalars['Int']['input'];
  excludeIngredients?: InputMaybe<Array<Scalars['String']['input']>>;
  mealsPerDay: Scalars['Int']['input'];
  preferences?: InputMaybe<Array<Scalars['String']['input']>>;
  targetCalories?: InputMaybe<Scalars['Int']['input']>;
};

export type MealPlanInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  durationDays: Scalars['Int']['input'];
  excludeIngredients?: InputMaybe<Array<Scalars['String']['input']>>;
  mealsPerDay: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  preferences?: InputMaybe<Array<Scalars['String']['input']>>;
  targetCalories?: InputMaybe<Scalars['Int']['input']>;
};

export type MealPlanMeal = {
  __typename: 'MealPlanMeal';
  calories: Scalars['Int']['output'];
  carbsG: Scalars['Float']['output'];
  fatG: Scalars['Float']['output'];
  foodItemId?: Maybe<Scalars['ID']['output']>;
  mealType: Scalars['String']['output'];
  name: Scalars['String']['output'];
  proteinG: Scalars['Float']['output'];
  recipeId?: Maybe<Scalars['ID']['output']>;
  servings: Scalars['Float']['output'];
};

export type MemoryStatus = {
  __typename: 'MemoryStatus';
  percentage: Scalars['Float']['output'];
  total: Scalars['Float']['output'];
  used: Scalars['Float']['output'];
};

export type Message = {
  __typename: 'Message';
  content: Scalars['String']['output'];
  contentType?: Maybe<Scalars['String']['output']>;
  conversationId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  deliveredAt?: Maybe<Scalars['String']['output']>;
  editCount?: Maybe<Scalars['Int']['output']>;
  editedAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  pinnedAt?: Maybe<Scalars['String']['output']>;
  reactions?: Maybe<Array<MessageReaction>>;
  read?: Maybe<Scalars['Boolean']['output']>;
  readAt?: Maybe<Scalars['String']['output']>;
  replyTo?: Maybe<MessageReplyTo>;
  sender?: Maybe<User>;
  senderDisplayName?: Maybe<Scalars['String']['output']>;
  senderId: Scalars['ID']['output'];
  senderUsername?: Maybe<Scalars['String']['output']>;
};

/** Cursor for message pagination */
export type MessageCursor = {
  __typename: 'MessageCursor';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

/** Cursor input for message pagination */
export type MessageCursorInput = {
  createdAt: Scalars['String']['input'];
  id: Scalars['ID']['input'];
};

export type MessageReaction = {
  __typename: 'MessageReaction';
  count: Scalars['Int']['output'];
  emoji: Scalars['String']['output'];
  userReacted: Scalars['Boolean']['output'];
  users: Array<Scalars['ID']['output']>;
};

/** Message delivery/read receipt */
export type MessageReceipt = {
  __typename: 'MessageReceipt';
  deliveredAt?: Maybe<Scalars['DateTime']['output']>;
  messageId: Scalars['ID']['output'];
  readAt?: Maybe<Scalars['DateTime']['output']>;
  userId: Scalars['ID']['output'];
};

export type MessageReplyTo = {
  __typename: 'MessageReplyTo';
  content: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  senderName: Scalars['String']['output'];
};

/** Message request from non-friend/follower */
export type MessageRequest = {
  __typename: 'MessageRequest';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  message?: Maybe<Scalars['String']['output']>;
  respondedAt?: Maybe<Scalars['DateTime']['output']>;
  senderAvatarUrl?: Maybe<Scalars['String']['output']>;
  senderDisplayName?: Maybe<Scalars['String']['output']>;
  senderId: Scalars['ID']['output'];
  senderUsername: Scalars['String']['output'];
  status: MessageRequestStatus;
};

/** Message request response result */
export type MessageRequestResult = {
  __typename: 'MessageRequestResult';
  conversationId?: Maybe<Scalars['ID']['output']>;
  success: Scalars['Boolean']['output'];
};

/** Message request status */
export type MessageRequestStatus =
  | 'accepted'
  | 'blocked'
  | 'declined'
  | 'pending';

export type MessageTemplate = {
  __typename: 'MessageTemplate';
  category?: Maybe<Scalars['String']['output']>;
  content: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  shortcut?: Maybe<Scalars['String']['output']>;
  useCount: Scalars['Int']['output'];
};

/** Who can message/send content */
export type MessagingPermission =
  | 'everyone'
  | 'followers'
  | 'friends'
  | 'mutual_followers'
  | 'nobody';

/** User's messaging privacy settings */
export type MessagingPrivacy = {
  __typename: 'MessagingPrivacy';
  allowFileAttachments: MessagingPermission;
  allowMessagesFrom: MessagingPermission;
  allowVoiceMessages: MessagingPermission;
  blockedUserIds?: Maybe<Array<Scalars['ID']['output']>>;
  createdAt: Scalars['DateTime']['output'];
  lastSeenVisible: Scalars['Boolean']['output'];
  onlineStatusVisible: Scalars['Boolean']['output'];
  readReceiptsEnabled: Scalars['Boolean']['output'];
  typingIndicatorsEnabled: Scalars['Boolean']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
};

export type Milestone = {
  __typename: 'Milestone';
  claimed: Scalars['Boolean']['output'];
  current: Scalars['Int']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  reward: Scalars['Int']['output'];
  target: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  type: Scalars['String']['output'];
  unlockedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type MilestoneClaimResult = {
  __typename: 'MilestoneClaimResult';
  creditsEarned: Scalars['Int']['output'];
  milestone: Milestone;
  newBalance: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type MilestoneInput = {
  target: Scalars['Float']['input'];
  title: Scalars['String']['input'];
};

export type MonthlyBreakdownEntry = {
  __typename: 'MonthlyBreakdownEntry';
  month: Scalars['Int']['output'];
  tu: Scalars['Float']['output'];
  workouts: Scalars['Int']['output'];
};

export type MonthlyStats = {
  __typename: 'MonthlyStats';
  activeDays: Scalars['Int']['output'];
  avgTuPerWorkout: Scalars['Float']['output'];
  avgWorkoutDurationMinutes: Scalars['Float']['output'];
  calculatedAt: Scalars['DateTime']['output'];
  consistencyScore: Scalars['Int']['output'];
  constitutionDelta: Scalars['Float']['output'];
  creditsEarned: Scalars['Int']['output'];
  creditsSpent: Scalars['Int']['output'];
  currentStreak: Scalars['Int']['output'];
  dexterityDelta: Scalars['Float']['output'];
  enduranceDelta: Scalars['Float']['output'];
  highFivesReceived: Scalars['Int']['output'];
  highFivesSent: Scalars['Int']['output'];
  isComplete: Scalars['Boolean']['output'];
  month: Scalars['Int']['output'];
  powerDelta: Scalars['Float']['output'];
  prsSet: Scalars['Int']['output'];
  strengthDelta: Scalars['Float']['output'];
  topExercises: Array<TopExercise>;
  totalDurationMinutes: Scalars['Int']['output'];
  totalExercises: Scalars['Int']['output'];
  totalReps: Scalars['Int']['output'];
  totalSets: Scalars['Int']['output'];
  totalTu: Scalars['Float']['output'];
  totalVolumeLbs: Scalars['Float']['output'];
  totalWorkouts: Scalars['Int']['output'];
  tuChangeFromPrevMonth?: Maybe<Scalars['Float']['output']>;
  userId: Scalars['ID']['output'];
  vitalityDelta: Scalars['Float']['output'];
  weeklyBreakdown: Array<WeeklyBreakdownEntry>;
  workoutDays: Scalars['Int']['output'];
  xpEarned: Scalars['Int']['output'];
  year: Scalars['Int']['output'];
};

export type Muscle = {
  __typename: 'Muscle';
  description?: Maybe<Scalars['String']['output']>;
  group: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  subGroup?: Maybe<Scalars['String']['output']>;
};

export type MuscleActivation = {
  __typename: 'MuscleActivation';
  activation: Scalars['Float']['output'];
  muscleId: Scalars['ID']['output'];
  muscleName: Scalars['String']['output'];
  tu: Scalars['Float']['output'];
};

/** Muscle activation item for heatmaps */
export type MuscleActivationItem = {
  __typename: 'MuscleActivationItem';
  muscleId: Scalars['ID']['output'];
  muscleName: Scalars['String']['output'];
  percentage: Scalars['Float']['output'];
  totalTu: Scalars['Float']['output'];
};

export type MuscleActivationSummary = {
  __typename: 'MuscleActivationSummary';
  muscleId: Scalars['ID']['output'];
  muscleName: Scalars['String']['output'];
  percentageOfMax?: Maybe<Scalars['Float']['output']>;
  setCount: Scalars['Int']['output'];
  totalTU: Scalars['Float']['output'];
};

export type MuscleGroupStat = {
  __typename: 'MuscleGroupStat';
  lastTrained?: Maybe<Scalars['DateTime']['output']>;
  muscle: Scalars['String']['output'];
  totalReps: Scalars['Int']['output'];
  totalSets: Scalars['Int']['output'];
};

export type MuscleStats = {
  __typename: 'MuscleStats';
  lastTrained?: Maybe<Scalars['JSON']['output']>;
  muscleGroups: Array<MuscleGroupStat>;
  weeklyVolume?: Maybe<Scalars['JSON']['output']>;
};

export type Mutation = {
  __typename: 'Mutation';
  abandonWorkoutSession: Scalars['Boolean']['output'];
  /** Accept a buddy invite */
  acceptBuddyInvite: WorkoutBuddyPair;
  acceptCrewInvite: CrewMember;
  acceptRivalry: RivalWithUser;
  acceptTrade: TradeActionResult;
  acceptWorkoutSuggestion: Scalars['Boolean']['output'];
  achieveSkill: SkillAchieveResult;
  acknowledgeJourneyAlert: JourneyHealthAlert;
  acknowledgeOvertrainingAlert: Scalars['Boolean']['output'];
  acknowledgeRecommendation: Scalars['Boolean']['output'];
  activateGeneratedProgram: Scalars['Boolean']['output'];
  activateMealPlan: MealPlan;
  addHomeEquipment: HomeEquipment;
  addReaction: ReactionResult;
  addToWatchlist: WatchlistResult;
  adminBulkUpdateIssues: Array<Issue>;
  approveVenueSubmission: AdminSubmissionResult;
  archiveConversation: Scalars['Boolean']['output'];
  blockUser: Scalars['Boolean']['output'];
  boostPost: PostBoostResult;
  calculateJourneyHealth: JourneyHealthScore;
  calculateMacros: MacroCalculationResult;
  /** Cancel a crew challenge */
  cancelCrewChallenge: Scalars['Boolean']['output'];
  cancelScheduledMessage: Scalars['Boolean']['output'];
  cancelTrade: TradeActionResult;
  cancelTrainerClass: Scalars['Boolean']['output'];
  cancelVerification: Scalars['Boolean']['output'];
  challengeRival: RivalWithUser;
  changePassword: ChangePasswordResult;
  chargeCredits: ChargeResult;
  checkExercisePersonalization: ExerciseCheck;
  checkWorkoutLimitations: WorkoutLimitationCheck;
  claimMilestone: MilestoneClaimResult;
  claimSetReward: ClaimSetRewardResult;
  /** Claim a record at a venue */
  claimVenueRecord: VenueRecordClaimResult;
  cloneWorkoutTemplate: WorkoutTemplate;
  completeOnboarding: OnboardingResult;
  completeWorkoutSession: WorkoutCompletionResult;
  /** Confirm file upload after uploading to R2 */
  confirmFileUpload: EncryptedFileMetadata;
  /** Contribute to a crew challenge */
  contributeToChallenge: ChallengeContribution;
  createBodyMeasurement: BodyMeasurement;
  createBuddy: Buddy;
  createCareerGoal: CareerGoal;
  createCompetition: Competition;
  createConversation: Conversation;
  createCrew: Crew;
  /** Create a crew challenge */
  createCrewChallenge: CrewChallenge;
  createGoal: Goal;
  createGoalMilestone: GoalMilestone;
  createHangout: Hangout;
  createHangoutPost: HangoutPost;
  createIssue: Issue;
  createIssueComment: IssueComment;
  createLimitation: Limitation;
  createLocation: Location;
  createMealPlan: MealPlan;
  createMessageTemplate: MessageTemplate;
  createProgram: TrainingProgram;
  createProgressPhoto: ProgressPhoto;
  createProgressionTarget: ProgressionTarget;
  createRecipe: Recipe;
  createRoadmapItem: RoadmapItem;
  createRpeSnapshot?: Maybe<RpeSnapshot>;
  createSleepGoal: SleepGoal;
  createTrade: CreateTradeResult;
  createTrainerClass: TrainerClass;
  createUpdate: Update;
  createWorkout: WorkoutResult;
  createWorkoutTemplate: WorkoutTemplate;
  deactivateMealPlan: Scalars['Boolean']['output'];
  /** Decline a buddy invite */
  declineBuddyInvite: Scalars['Boolean']['output'];
  declineRivalry: Scalars['Boolean']['output'];
  /** Delete your comment */
  deleteActivityComment: Scalars['Boolean']['output'];
  deleteBodyMeasurement: Scalars['Boolean']['output'];
  deleteCareerGoal: Scalars['Boolean']['output'];
  /** Delete a crew chat message */
  deleteCrewMessage: Scalars['Boolean']['output'];
  /** Delete encrypted message */
  deleteEncryptedMessage: E2EeResult;
  deleteGoal: Scalars['Boolean']['output'];
  deleteLimitation: Scalars['Boolean']['output'];
  deleteMascotPreset: Scalars['Boolean']['output'];
  deleteMeal: Scalars['Boolean']['output'];
  deleteMealPlan: Scalars['Boolean']['output'];
  deleteMessage: Scalars['Boolean']['output'];
  deleteProgram: Scalars['Boolean']['output'];
  deleteProgressPhoto: Scalars['Boolean']['output'];
  deleteRecipe: Scalars['Boolean']['output'];
  deleteSet: Scalars['Boolean']['output'];
  deleteSleepGoal: Scalars['Boolean']['output'];
  deleteSleepLog: Scalars['Boolean']['output'];
  deleteWorkoutTemplate: Scalars['Boolean']['output'];
  disableMinimalistMode: PrivacySettings;
  disableNutrition: Scalars['Boolean']['output'];
  dismissCreditAlert: Scalars['Boolean']['output'];
  dismissJourneyAlert: Scalars['Boolean']['output'];
  /** Dispute a venue record */
  disputeVenueRecord: Scalars['Boolean']['output'];
  dropEnrollment: ProgramEnrollment;
  duplicateProgram: TrainingProgram;
  editMessage: EditedMessage;
  enableMinimalistMode: PrivacySettings;
  enableNutrition: NutritionPreferences;
  /** End a buddy partnership */
  endBuddyPair: Scalars['Boolean']['output'];
  endRivalry: Scalars['Boolean']['output'];
  enrollInClass: ClassEnrollment;
  enrollInProgram: ProgramEnrollment;
  equipBuddyCosmetic: Scalars['Boolean']['output'];
  equipMascotCosmetic: MascotLoadout;
  equipSkin: SkinEquipResult;
  executeMascotSocialAction: Scalars['Boolean']['output'];
  feedBuddy: BuddyXpResult;
  /** Follow a user */
  followUser: FollowResult;
  forwardMessage: Array<ForwardedMessage>;
  generateJourneyRecommendations: Array<JourneyRecommendation>;
  generateMascotProgram: MascotProgramGenerationResult;
  generateMealPlan: MealPlan;
  generatePrescription: Prescription;
  generatePrescriptionV3: PrescriptionV3;
  generateRecoveryRecommendations: Array<RecoveryRecommendation>;
  /** Get presigned download URL for a file */
  getFileDownloadUrl: FileDownloadResult;
  inviteToCrew: CrewInvite;
  joinCompetition: CompetitionJoinResult;
  joinCrew: CrewMember;
  joinHangout: HangoutMembership;
  leaveCrew: Scalars['Boolean']['output'];
  leaveHangout: Scalars['Boolean']['output'];
  loadMascotPreset: MascotLoadout;
  logCareerAssessment: CareerAssessment;
  logFrontendError: Scalars['Boolean']['output'];
  logHydration: HydrationLog;
  logMeal: MealLog;
  /** Log QA session events - no auth required for testing logged-out flows */
  logQAEvents: QaLogResult;
  logSet: WorkoutSessionResult;
  logSkillPractice: SkillPracticeLog;
  logSleep: SleepLog;
  login: AuthPayload;
  makeOffer: OfferResult;
  markAllSeen: CollectionSeenResult;
  /** Mark buddy messages as read */
  markBuddyMessagesRead: Scalars['Boolean']['output'];
  markClassAttendance: AttendanceResult;
  markCommentAsSolution: Issue;
  markConversationRead: Scalars['Boolean']['output'];
  /** Mark crew chat as read */
  markCrewChatRead: Scalars['Boolean']['output'];
  markEarnEventsShown: Scalars['Boolean']['output'];
  /** Mark encrypted message as delivered */
  markEncryptedMessageDelivered: E2EeResult;
  /** Mark encrypted message as read */
  markEncryptedMessageRead: E2EeResult;
  markItemSeen: CollectionSeenResult;
  markMascotReactionsShown: Scalars['Boolean']['output'];
  markRecommendationActioned: Scalars['Boolean']['output'];
  markRecommendationViewed: Scalars['Boolean']['output'];
  markTipSeen: Scalars['Boolean']['output'];
  masterMartialArt: TechniqueMasterResult;
  openMysteryBox: MysteryBoxOpenResult;
  pauseEnrollment: ProgramEnrollment;
  pauseWorkoutSession: WorkoutSession;
  /** Pin a crew chat message */
  pinCrewMessage: CrewChatMessage;
  pinMessage: PinnedMessageResult;
  /** Post a comment on an activity */
  postActivityComment: ActivityComment;
  /** Post a check-in to your buddy */
  postBuddyCheckIn: BuddyCheckIn;
  practiceMartialArt: TechniquePracticeLog;
  previewWorkout: WorkoutPreview;
  provideRecommendationFeedback: Scalars['Boolean']['output'];
  purchaseListing: PurchaseResult;
  purchaseMascotCosmetic: MascotPurchaseResult;
  purchaseSkin: SkinPurchaseResult;
  rateLocation: LocationRating;
  rateProgram: Scalars['Boolean']['output'];
  rateRecipe: Scalars['Boolean']['output'];
  rateWorkoutTemplate: Scalars['Boolean']['output'];
  /** React to a crew chat message */
  reactToCrewMessage: CrewChatMessage;
  recalculateAllJourneyHealth: JourneyHealthRecalcResult;
  recalculateStats: CharacterStats;
  recordGoalProgress: Goal;
  recordPTTestResult: RecordPtTestResultResponse;
  recordProgramWorkout: ProgramEnrollment;
  recoverWorkoutSession: WorkoutSession;
  register: AuthPayload;
  /** Register encryption keys for E2EE */
  registerEncryptionKeys: E2EeResult;
  rejectTrade: TradeActionResult;
  rejectVenueSubmission: AdminSubmissionResult;
  /** Remove a device from E2EE */
  removeDevice: E2EeResult;
  removeExerciseAvoidance: Scalars['Boolean']['output'];
  removeFromWatchlist: WatchlistResult;
  removeHomeEquipment: Scalars['Boolean']['output'];
  removeReaction: Scalars['Boolean']['output'];
  repayCreditLoan: MascotCreditLoanResult;
  /** Report encrypted content */
  reportEncryptedContent: ContentReportResult;
  /** Report equipment as removed or broken */
  reportEquipmentRemoved: EquipmentRemovedResult;
  reportLocationEquipment: LocationEquipment;
  reportVenueIssue: VenueReportResult;
  requestCreditLoan: MascotCreditLoanResult;
  /** Request file upload URL (returns presigned R2 URL) */
  requestFileUpload: FileUploadToken;
  requestPasswordReset: RequestPasswordResetResult;
  resetPassword: ResetPasswordResult;
  /** Respond to a buddy invite (accept or decline) */
  respondToBuddyInvite: BuddyInviteResponse;
  /** Respond to message request */
  respondToMessageRequest: MessageRequestResult;
  resumeEnrollment: ProgramEnrollment;
  resumeWorkoutSession: WorkoutSession;
  /** Rotate signed prekey */
  rotateSignedPreKey: E2EeResult;
  rpeAutoregulate: AutoRegulationResult;
  saveMascotPreset: MascotPreset;
  saveRecipe: Scalars['Boolean']['output'];
  saveStreak: MascotStreakSaveResult;
  saveWorkoutTemplate: Scalars['Boolean']['output'];
  scheduleMessage: ScheduledMessage;
  selectArchetype: ArchetypeSelection;
  /** Send a check-in to your buddy (alternative name) */
  sendBuddyCheckIn: BuddyCheckIn;
  /** Send a buddy invite */
  sendBuddyInvite: BuddyInvite;
  /** Send a message to your buddy */
  sendBuddyMessage: BuddyMessage;
  /** Send a message in crew chat */
  sendCrewChatMessage: CrewChatMessage;
  /** Send an encrypted message */
  sendEncryptedMessage: EncryptedMessage;
  sendGift: GiftResult;
  sendHighFive: HighFiveSendResult;
  sendMessage: Message;
  sendSuperHighFive: SuperHighFiveResult;
  sendTip: TipResult;
  setDisappearingMessages: Scalars['Boolean']['output'];
  setExerciseAvoidance: Scalars['Boolean']['output'];
  setHomeEquipmentOnboarding: Scalars['Boolean']['output'];
  setRpeTarget: RpeTarget;
  setTypingStatus: Scalars['Boolean']['output'];
  /** Share an activity to your feed */
  shareActivity: ActivityItem;
  skipOnboarding: Scalars['Boolean']['output'];
  starConversation: Scalars['Boolean']['output'];
  startCrewWar: CrewWar;
  startWorkoutSession: WorkoutSessionResult;
  submitPrescriptionFeedback: FeedbackSubmissionResult;
  /** Submit video verification for a record */
  submitRecordVerification: VenueExerciseRecord;
  submitVenue: VenueSubmissionResult;
  subscribeToIssue: Scalars['Boolean']['output'];
  /** Suggest new equipment at an existing venue */
  suggestEquipment: EquipmentSuggestionResult;
  syncNycData: AdminSyncResult;
  syncOsmData: AdminSyncResult;
  syncWearables: WearablesSyncResult;
  toggleFavorite: CollectionFavoriteResult;
  /** Pin/unpin a crew chat message */
  togglePinCrewMessage: CrewChatMessage;
  transferCredits: TransferResult;
  transferCreditsByUsername: TransferResult;
  unarchiveConversation: Scalars['Boolean']['output'];
  unblockUser: Scalars['Boolean']['output'];
  unenrollFromClass: Scalars['Boolean']['output'];
  unequipBuddyCosmetic: Scalars['Boolean']['output'];
  unequipMascotCosmetic: MascotLoadout;
  unequipSkin: SkinEquipResult;
  /** Unfollow a user */
  unfollowUser: Scalars['Boolean']['output'];
  unlockMasterAbility: Scalars['Boolean']['output'];
  unpinMessage: Scalars['Boolean']['output'];
  unsaveRecipe: Scalars['Boolean']['output'];
  unsaveWorkoutTemplate: Scalars['Boolean']['output'];
  unstarConversation: Scalars['Boolean']['output'];
  updateBodyMeasurement: BodyMeasurement;
  updateBuddyNickname: Scalars['Boolean']['output'];
  /** Update buddy matching preferences */
  updateBuddyPreferences: WorkoutBuddyPreferences;
  updateBuddySettings: Scalars['Boolean']['output'];
  updateBuddySpecies: Buddy;
  updateCareerGoal?: Maybe<CareerGoal>;
  /** Update content preferences */
  updateContentPreferences: ContentPreferences;
  /** Update a crew challenge */
  updateCrewChallenge: CrewChallenge;
  updateExtendedProfile: ExtendedProfile;
  /** Update feed preferences */
  updateFeedPreferences: FeedPreferences;
  updateGoal: Goal;
  updateHomeEquipment: Array<HomeEquipment>;
  updateIssue: Issue;
  updateLimitation: Limitation;
  /** Update privacy settings for location records */
  updateLocationRecordPrivacy: PrivacySettings;
  updateMartialArtNotes: Scalars['Boolean']['output'];
  updateMascotHighfivePrefs: MascotHighfivePrefs;
  updateMascotNickname: MascotState;
  updateMascotSettings: MascotState;
  updateMeal: MealLog;
  /** Update messaging privacy settings */
  updateMessagingPrivacy: MessagingPrivacy;
  updateMilestoneProgress: Milestone;
  updateMyFullProfile: FullProfile;
  updateNutritionGoals: NutritionGoals;
  updateNutritionPreferences: NutritionPreferences;
  updateOnboardingProfile: OnboardingProfile;
  updatePresence: PresenceInfo;
  updatePrivacy: PrivacySettings;
  updateProfile: Profile;
  updateProgram: TrainingProgram;
  updateProgressPhoto: ProgressPhoto;
  updateProgressionTarget: ProgressionTarget;
  updateRecipe: Recipe;
  updateRestTimer: WorkoutSession;
  updateSet: LoggedSet;
  updateSettings: UserSettings;
  updateSleepGoal: SleepGoal;
  updateSleepLog: SleepLog;
  updateTrainerClass: TrainerClass;
  updateTrainerStatus: Scalars['Boolean']['output'];
  updateWorkoutTemplate: WorkoutTemplate;
  /** Upgrade conversation to E2EE */
  upgradeToE2EE: E2EeResult;
  /** Upload additional one-time prekeys */
  uploadOneTimePreKeys: E2EeCountResult;
  uploadVenuePhoto: VenuePhotoResult;
  upsertTrainerProfile: TrainerProfile;
  useMascotAssist: MascotAssistResult;
  /** Verify age (self-declaration) */
  verifyAge: AgeVerificationResult;
  verifyEquipment: VenueVerifyResult;
  verifyVenue: VenueVerifyResult;
  /** Vote on equipment condition */
  voteEquipmentCondition: ConditionVoteResult;
  voteLocationComment: LocationComment;
  voteOnIssue: Issue;
  voteOnRoadmapItem: RoadmapItem;
  /** Vote to support or reject an equipment suggestion */
  voteOnSuggestion: SuggestionVoteResult;
  /** Witness someone else's record */
  witnessRecord: VenueExerciseRecord;
};


export type MutationAbandonWorkoutSessionArgs = {
  reason?: InputMaybe<Scalars['String']['input']>;
  sessionId: Scalars['ID']['input'];
};


export type MutationAcceptBuddyInviteArgs = {
  inviteId: Scalars['ID']['input'];
};


export type MutationAcceptCrewInviteArgs = {
  inviteId: Scalars['ID']['input'];
};


export type MutationAcceptRivalryArgs = {
  rivalryId: Scalars['ID']['input'];
};


export type MutationAcceptTradeArgs = {
  tradeId: Scalars['ID']['input'];
};


export type MutationAcceptWorkoutSuggestionArgs = {
  suggestionId: Scalars['ID']['input'];
};


export type MutationAchieveSkillArgs = {
  skillNodeId: Scalars['ID']['input'];
};


export type MutationAcknowledgeJourneyAlertArgs = {
  alertId: Scalars['ID']['input'];
};


export type MutationAcknowledgeOvertrainingAlertArgs = {
  alertId: Scalars['ID']['input'];
};


export type MutationAcknowledgeRecommendationArgs = {
  id: Scalars['ID']['input'];
  input?: InputMaybe<RecommendationFeedbackInput>;
};


export type MutationActivateGeneratedProgramArgs = {
  programId: Scalars['ID']['input'];
};


export type MutationActivateMealPlanArgs = {
  id: Scalars['ID']['input'];
};


export type MutationAddHomeEquipmentArgs = {
  equipmentId: Scalars['ID']['input'];
};


export type MutationAddReactionArgs = {
  emoji: Scalars['String']['input'];
  messageId: Scalars['ID']['input'];
};


export type MutationAddToWatchlistArgs = {
  listingId: Scalars['ID']['input'];
};


export type MutationAdminBulkUpdateIssuesArgs = {
  issueIds: Array<Scalars['ID']['input']>;
  status: Scalars['String']['input'];
};


export type MutationApproveVenueSubmissionArgs = {
  notes?: InputMaybe<Scalars['String']['input']>;
  submissionId: Scalars['ID']['input'];
};


export type MutationArchiveConversationArgs = {
  conversationId: Scalars['ID']['input'];
};


export type MutationBlockUserArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationBoostPostArgs = {
  input: PostBoostInput;
};


export type MutationCalculateJourneyHealthArgs = {
  journeyId: Scalars['ID']['input'];
};


export type MutationCalculateMacrosArgs = {
  input: MacroCalculationInput;
};


export type MutationCancelCrewChallengeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCancelScheduledMessageArgs = {
  scheduledId: Scalars['ID']['input'];
};


export type MutationCancelTradeArgs = {
  tradeId: Scalars['ID']['input'];
};


export type MutationCancelTrainerClassArgs = {
  classId: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCancelVerificationArgs = {
  verificationId: Scalars['ID']['input'];
};


export type MutationChallengeRivalArgs = {
  opponentId: Scalars['ID']['input'];
};


export type MutationChangePasswordArgs = {
  input: ChangePasswordInput;
};


export type MutationChargeCreditsArgs = {
  input: ChargeInput;
};


export type MutationCheckExercisePersonalizationArgs = {
  exerciseId: Scalars['ID']['input'];
};


export type MutationCheckWorkoutLimitationsArgs = {
  exerciseIds: Array<Scalars['ID']['input']>;
};


export type MutationClaimMilestoneArgs = {
  milestoneId: Scalars['ID']['input'];
};


export type MutationClaimSetRewardArgs = {
  setId: Scalars['ID']['input'];
  threshold: Scalars['Float']['input'];
};


export type MutationClaimVenueRecordArgs = {
  input: ClaimVenueRecordInput;
};


export type MutationCloneWorkoutTemplateArgs = {
  id: Scalars['ID']['input'];
  newName?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCompleteWorkoutSessionArgs = {
  input: CompleteWorkoutSessionInput;
};


export type MutationConfirmFileUploadArgs = {
  input: ConfirmFileUploadInput;
};


export type MutationContributeToChallengeArgs = {
  challengeId: Scalars['ID']['input'];
  value: Scalars['Float']['input'];
  workoutId: Scalars['ID']['input'];
};


export type MutationCreateBodyMeasurementArgs = {
  input: BodyMeasurementInput;
};


export type MutationCreateBuddyArgs = {
  input: CreateBuddyInput;
};


export type MutationCreateCareerGoalArgs = {
  input: CareerGoalInput;
};


export type MutationCreateCompetitionArgs = {
  input: CompetitionInput;
};


export type MutationCreateConversationArgs = {
  participantIds: Array<Scalars['ID']['input']>;
  type: Scalars['String']['input'];
};


export type MutationCreateCrewArgs = {
  input: CreateCrewInput;
};


export type MutationCreateCrewChallengeArgs = {
  input: CrewChallengeInput;
};


export type MutationCreateGoalArgs = {
  input: GoalInput;
};


export type MutationCreateGoalMilestoneArgs = {
  goalId: Scalars['ID']['input'];
  input: MilestoneInput;
};


export type MutationCreateHangoutArgs = {
  input: HangoutInput;
};


export type MutationCreateHangoutPostArgs = {
  content: Scalars['String']['input'];
  hangoutId: Scalars['ID']['input'];
};


export type MutationCreateIssueArgs = {
  input: IssueInput;
};


export type MutationCreateIssueCommentArgs = {
  content: Scalars['String']['input'];
  issueId: Scalars['ID']['input'];
};


export type MutationCreateLimitationArgs = {
  input: LimitationInput;
};


export type MutationCreateLocationArgs = {
  input: LocationInput;
};


export type MutationCreateMealPlanArgs = {
  input: MealPlanInput;
};


export type MutationCreateMessageTemplateArgs = {
  content: Scalars['String']['input'];
  name: Scalars['String']['input'];
  shortcut?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateProgramArgs = {
  input: CreateProgramInput;
};


export type MutationCreateProgressPhotoArgs = {
  input: ProgressPhotoInput;
};


export type MutationCreateProgressionTargetArgs = {
  input: ProgressionTargetInput;
};


export type MutationCreateRecipeArgs = {
  input: RecipeInput;
};


export type MutationCreateRoadmapItemArgs = {
  input: RoadmapInput;
};


export type MutationCreateSleepGoalArgs = {
  input: SleepGoalInput;
};


export type MutationCreateTradeArgs = {
  input: CreateTradeInput;
};


export type MutationCreateTrainerClassArgs = {
  input: CreateTrainerClassInput;
};


export type MutationCreateUpdateArgs = {
  input: UpdateInput;
};


export type MutationCreateWorkoutArgs = {
  input: WorkoutInput;
};


export type MutationCreateWorkoutTemplateArgs = {
  input: CreateWorkoutTemplateInput;
};


export type MutationDeactivateMealPlanArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeclineBuddyInviteArgs = {
  inviteId: Scalars['ID']['input'];
};


export type MutationDeclineRivalryArgs = {
  rivalryId: Scalars['ID']['input'];
};


export type MutationDeleteActivityCommentArgs = {
  commentId: Scalars['ID']['input'];
};


export type MutationDeleteBodyMeasurementArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCareerGoalArgs = {
  goalId: Scalars['ID']['input'];
};


export type MutationDeleteCrewMessageArgs = {
  messageId: Scalars['ID']['input'];
};


export type MutationDeleteEncryptedMessageArgs = {
  messageId: Scalars['ID']['input'];
};


export type MutationDeleteGoalArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteLimitationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMascotPresetArgs = {
  presetId: Scalars['ID']['input'];
};


export type MutationDeleteMealArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMealPlanArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMessageArgs = {
  messageId: Scalars['ID']['input'];
};


export type MutationDeleteProgramArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteProgressPhotoArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteRecipeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSetArgs = {
  setId: Scalars['ID']['input'];
};


export type MutationDeleteSleepGoalArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSleepLogArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteWorkoutTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDisableNutritionArgs = {
  deleteData?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationDismissCreditAlertArgs = {
  alertId: Scalars['ID']['input'];
};


export type MutationDismissJourneyAlertArgs = {
  alertId: Scalars['ID']['input'];
};


export type MutationDisputeVenueRecordArgs = {
  reason: Scalars['String']['input'];
  recordId: Scalars['ID']['input'];
};


export type MutationDropEnrollmentArgs = {
  enrollmentId: Scalars['ID']['input'];
};


export type MutationDuplicateProgramArgs = {
  id: Scalars['ID']['input'];
  newName?: InputMaybe<Scalars['String']['input']>;
};


export type MutationEditMessageArgs = {
  content: Scalars['String']['input'];
  messageId: Scalars['ID']['input'];
};


export type MutationEndBuddyPairArgs = {
  buddyPairId: Scalars['ID']['input'];
};


export type MutationEndRivalryArgs = {
  rivalryId: Scalars['ID']['input'];
};


export type MutationEnrollInClassArgs = {
  classId: Scalars['ID']['input'];
};


export type MutationEnrollInProgramArgs = {
  programId: Scalars['ID']['input'];
};


export type MutationEquipBuddyCosmeticArgs = {
  sku: Scalars['String']['input'];
  slot: Scalars['String']['input'];
};


export type MutationEquipMascotCosmeticArgs = {
  cosmeticId: Scalars['ID']['input'];
  slot: Scalars['String']['input'];
};


export type MutationEquipSkinArgs = {
  skinId: Scalars['ID']['input'];
};


export type MutationExecuteMascotSocialActionArgs = {
  actionId: Scalars['ID']['input'];
};


export type MutationFeedBuddyArgs = {
  xpAmount: Scalars['Int']['input'];
};


export type MutationFollowUserArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationForwardMessageArgs = {
  addComment?: InputMaybe<Scalars['String']['input']>;
  messageId: Scalars['ID']['input'];
  toConversationIds: Array<Scalars['ID']['input']>;
};


export type MutationGenerateJourneyRecommendationsArgs = {
  journeyId: Scalars['ID']['input'];
};


export type MutationGenerateMascotProgramArgs = {
  input: MascotProgramGenerationInput;
};


export type MutationGenerateMealPlanArgs = {
  input: MealPlanGenerateInput;
};


export type MutationGeneratePrescriptionArgs = {
  input: PrescriptionInput;
};


export type MutationGeneratePrescriptionV3Args = {
  input: PrescriptionInputV3;
};


export type MutationGetFileDownloadUrlArgs = {
  fileId: Scalars['ID']['input'];
};


export type MutationInviteToCrewArgs = {
  crewId: Scalars['ID']['input'];
  inviteeId: Scalars['ID']['input'];
};


export type MutationJoinCompetitionArgs = {
  competitionId: Scalars['ID']['input'];
};


export type MutationJoinCrewArgs = {
  crewId: Scalars['ID']['input'];
};


export type MutationJoinHangoutArgs = {
  hangoutId: Scalars['ID']['input'];
};


export type MutationLeaveHangoutArgs = {
  hangoutId: Scalars['ID']['input'];
};


export type MutationLoadMascotPresetArgs = {
  presetId: Scalars['ID']['input'];
};


export type MutationLogCareerAssessmentArgs = {
  input: CareerAssessmentInput;
};


export type MutationLogFrontendErrorArgs = {
  input: FrontendLogInput;
};


export type MutationLogHydrationArgs = {
  input: HydrationLogInput;
};


export type MutationLogMealArgs = {
  input: MealLogInput;
};


export type MutationLogQaEventsArgs = {
  input: QaLogInput;
};


export type MutationLogSetArgs = {
  input: LogSetInput;
};


export type MutationLogSkillPracticeArgs = {
  input: SkillPracticeInput;
};


export type MutationLogSleepArgs = {
  input: SleepLogInput;
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationMakeOfferArgs = {
  amount: Scalars['Int']['input'];
  listingId: Scalars['ID']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
};


export type MutationMarkBuddyMessagesReadArgs = {
  buddyPairId: Scalars['ID']['input'];
};


export type MutationMarkClassAttendanceArgs = {
  attendees: Array<AttendeeInput>;
  classId: Scalars['ID']['input'];
};


export type MutationMarkCommentAsSolutionArgs = {
  commentId: Scalars['ID']['input'];
  issueId: Scalars['ID']['input'];
};


export type MutationMarkConversationReadArgs = {
  conversationId: Scalars['ID']['input'];
};


export type MutationMarkCrewChatReadArgs = {
  crewId: Scalars['ID']['input'];
};


export type MutationMarkEarnEventsShownArgs = {
  eventIds: Array<Scalars['ID']['input']>;
};


export type MutationMarkEncryptedMessageDeliveredArgs = {
  messageId: Scalars['ID']['input'];
};


export type MutationMarkEncryptedMessageReadArgs = {
  messageId: Scalars['ID']['input'];
};


export type MutationMarkItemSeenArgs = {
  itemId: Scalars['ID']['input'];
};


export type MutationMarkMascotReactionsShownArgs = {
  reactionIds: Array<Scalars['ID']['input']>;
};


export type MutationMarkRecommendationActionedArgs = {
  recommendationId: Scalars['ID']['input'];
};


export type MutationMarkRecommendationViewedArgs = {
  recommendationId: Scalars['ID']['input'];
};


export type MutationMarkTipSeenArgs = {
  tipId: Scalars['ID']['input'];
};


export type MutationMasterMartialArtArgs = {
  techniqueId: Scalars['ID']['input'];
};


export type MutationOpenMysteryBoxArgs = {
  boxId: Scalars['ID']['input'];
  quantity?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationPauseEnrollmentArgs = {
  enrollmentId: Scalars['ID']['input'];
};


export type MutationPauseWorkoutSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationPinCrewMessageArgs = {
  messageId: Scalars['ID']['input'];
};


export type MutationPinMessageArgs = {
  messageId: Scalars['ID']['input'];
};


export type MutationPostActivityCommentArgs = {
  activityId: Scalars['ID']['input'];
  content: Scalars['String']['input'];
  parentId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationPostBuddyCheckInArgs = {
  input: BuddyCheckInInput;
};


export type MutationPracticeMartialArtArgs = {
  input: TechniquePracticeInput;
};


export type MutationPreviewWorkoutArgs = {
  input: WorkoutInput;
};


export type MutationProvideRecommendationFeedbackArgs = {
  feedbackText?: InputMaybe<Scalars['String']['input']>;
  recommendationId: Scalars['ID']['input'];
  wasHelpful: Scalars['Boolean']['input'];
};


export type MutationPurchaseListingArgs = {
  listingId: Scalars['ID']['input'];
};


export type MutationPurchaseMascotCosmeticArgs = {
  cosmeticId: Scalars['ID']['input'];
};


export type MutationPurchaseSkinArgs = {
  skinId: Scalars['ID']['input'];
};


export type MutationRateLocationArgs = {
  input: LocationRatingInput;
  locationId: Scalars['ID']['input'];
};


export type MutationRateProgramArgs = {
  id: Scalars['ID']['input'];
  rating: Scalars['Int']['input'];
  review?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRateRecipeArgs = {
  id: Scalars['ID']['input'];
  rating: Scalars['Int']['input'];
  review?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRateWorkoutTemplateArgs = {
  id: Scalars['ID']['input'];
  rating: Scalars['Int']['input'];
  review?: InputMaybe<Scalars['String']['input']>;
};


export type MutationReactToCrewMessageArgs = {
  messageId: Scalars['ID']['input'];
  reaction: Scalars['String']['input'];
};


export type MutationRecordGoalProgressArgs = {
  id: Scalars['ID']['input'];
  input: GoalProgressInput;
};


export type MutationRecordPtTestResultArgs = {
  input: PtTestResultInput;
};


export type MutationRecordProgramWorkoutArgs = {
  programId: Scalars['ID']['input'];
};


export type MutationRecoverWorkoutSessionArgs = {
  archivedSessionId: Scalars['ID']['input'];
};


export type MutationRegisterArgs = {
  input: RegisterInput;
};


export type MutationRegisterEncryptionKeysArgs = {
  input: RegisterKeysInput;
};


export type MutationRejectTradeArgs = {
  tradeId: Scalars['ID']['input'];
};


export type MutationRejectVenueSubmissionArgs = {
  reason: Scalars['String']['input'];
  submissionId: Scalars['ID']['input'];
};


export type MutationRemoveDeviceArgs = {
  deviceId: Scalars['String']['input'];
};


export type MutationRemoveExerciseAvoidanceArgs = {
  exerciseId: Scalars['ID']['input'];
};


export type MutationRemoveFromWatchlistArgs = {
  listingId: Scalars['ID']['input'];
};


export type MutationRemoveHomeEquipmentArgs = {
  equipmentId: Scalars['ID']['input'];
};


export type MutationRemoveReactionArgs = {
  emoji: Scalars['String']['input'];
  messageId: Scalars['ID']['input'];
};


export type MutationRepayCreditLoanArgs = {
  amount: Scalars['Int']['input'];
};


export type MutationReportEncryptedContentArgs = {
  input: ReportEncryptedContentInput;
};


export type MutationReportEquipmentRemovedArgs = {
  equipmentItemId: Scalars['ID']['input'];
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationReportLocationEquipmentArgs = {
  equipmentId: Scalars['ID']['input'];
  locationId: Scalars['ID']['input'];
  status: Scalars['String']['input'];
};


export type MutationReportVenueIssueArgs = {
  input: VenueReportInput;
  venueId: Scalars['ID']['input'];
};


export type MutationRequestCreditLoanArgs = {
  amount: Scalars['Int']['input'];
};


export type MutationRequestFileUploadArgs = {
  input: RequestFileUploadInput;
};


export type MutationRequestPasswordResetArgs = {
  email: Scalars['String']['input'];
};


export type MutationResetPasswordArgs = {
  input: ResetPasswordInput;
};


export type MutationRespondToBuddyInviteArgs = {
  accept: Scalars['Boolean']['input'];
  inviteId: Scalars['ID']['input'];
};


export type MutationRespondToMessageRequestArgs = {
  accept: Scalars['Boolean']['input'];
  requestId: Scalars['ID']['input'];
};


export type MutationResumeEnrollmentArgs = {
  enrollmentId: Scalars['ID']['input'];
};


export type MutationResumeWorkoutSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationRotateSignedPreKeyArgs = {
  input: RotateSignedPreKeyInput;
};


export type MutationRpeAutoregulateArgs = {
  input: AutoRegulateInput;
};


export type MutationSaveMascotPresetArgs = {
  icon?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};


export type MutationSaveRecipeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSaveStreakArgs = {
  streakType: Scalars['String']['input'];
  streakValue: Scalars['Int']['input'];
};


export type MutationSaveWorkoutTemplateArgs = {
  folder?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationScheduleMessageArgs = {
  content: Scalars['String']['input'];
  conversationId: Scalars['ID']['input'];
  scheduledFor: Scalars['String']['input'];
};


export type MutationSelectArchetypeArgs = {
  archetypeId: Scalars['ID']['input'];
};


export type MutationSendBuddyCheckInArgs = {
  buddyPairId: Scalars['ID']['input'];
  checkInType: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  moodRating?: InputMaybe<Scalars['Int']['input']>;
  workoutId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationSendBuddyInviteArgs = {
  message?: InputMaybe<Scalars['String']['input']>;
  recipientId: Scalars['ID']['input'];
};


export type MutationSendBuddyMessageArgs = {
  buddyPairId: Scalars['ID']['input'];
  content: Scalars['String']['input'];
  messageType?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSendCrewChatMessageArgs = {
  content: Scalars['String']['input'];
  crewId: Scalars['ID']['input'];
  messageType?: InputMaybe<Scalars['String']['input']>;
  replyToId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationSendEncryptedMessageArgs = {
  input: SendEncryptedMessageInput;
};


export type MutationSendGiftArgs = {
  input: GiftInput;
};


export type MutationSendHighFiveArgs = {
  input: HighFiveInput;
};


export type MutationSendMessageArgs = {
  content: Scalars['String']['input'];
  conversationId: Scalars['ID']['input'];
  replyToId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationSendSuperHighFiveArgs = {
  input: SuperHighFiveInput;
};


export type MutationSendTipArgs = {
  input: TipInput;
};


export type MutationSetDisappearingMessagesArgs = {
  conversationId: Scalars['ID']['input'];
  ttl?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationSetExerciseAvoidanceArgs = {
  input: MascotExerciseAvoidanceInput;
};


export type MutationSetHomeEquipmentOnboardingArgs = {
  input: HomeEquipmentInput;
};


export type MutationSetRpeTargetArgs = {
  exerciseId: Scalars['ID']['input'];
  input: RpeTargetInput;
};


export type MutationSetTypingStatusArgs = {
  conversationId: Scalars['ID']['input'];
  isTyping: Scalars['Boolean']['input'];
};


export type MutationShareActivityArgs = {
  input: ShareActivityInput;
};


export type MutationStarConversationArgs = {
  conversationId: Scalars['ID']['input'];
};


export type MutationStartCrewWarArgs = {
  crewId: Scalars['ID']['input'];
  defendingCrewId: Scalars['ID']['input'];
  durationDays?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationStartWorkoutSessionArgs = {
  input?: InputMaybe<StartWorkoutSessionInput>;
};


export type MutationSubmitPrescriptionFeedbackArgs = {
  input: PrescriptionFeedbackInput;
};


export type MutationSubmitRecordVerificationArgs = {
  recordId: Scalars['ID']['input'];
  videoUrl: Scalars['String']['input'];
};


export type MutationSubmitVenueArgs = {
  input: VenueSubmissionInput;
};


export type MutationSubscribeToIssueArgs = {
  issueId: Scalars['ID']['input'];
};


export type MutationSuggestEquipmentArgs = {
  input: EquipmentSuggestionInput;
  venueId: Scalars['ID']['input'];
};


export type MutationToggleFavoriteArgs = {
  itemId: Scalars['ID']['input'];
};


export type MutationTogglePinCrewMessageArgs = {
  messageId: Scalars['ID']['input'];
};


export type MutationTransferCreditsArgs = {
  input: TransferInput;
};


export type MutationTransferCreditsByUsernameArgs = {
  input: TransferByUsernameInput;
};


export type MutationUnarchiveConversationArgs = {
  conversationId: Scalars['ID']['input'];
};


export type MutationUnblockUserArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationUnenrollFromClassArgs = {
  classId: Scalars['ID']['input'];
};


export type MutationUnequipBuddyCosmeticArgs = {
  slot: Scalars['String']['input'];
};


export type MutationUnequipMascotCosmeticArgs = {
  slot: Scalars['String']['input'];
};


export type MutationUnequipSkinArgs = {
  skinId: Scalars['ID']['input'];
};


export type MutationUnfollowUserArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationUnlockMasterAbilityArgs = {
  abilityKey: Scalars['String']['input'];
};


export type MutationUnpinMessageArgs = {
  messageId: Scalars['ID']['input'];
};


export type MutationUnsaveRecipeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUnsaveWorkoutTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUnstarConversationArgs = {
  conversationId: Scalars['ID']['input'];
};


export type MutationUpdateBodyMeasurementArgs = {
  id: Scalars['ID']['input'];
  input: BodyMeasurementInput;
};


export type MutationUpdateBuddyNicknameArgs = {
  nickname?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateBuddyPreferencesArgs = {
  input: BuddyPreferencesInput;
};


export type MutationUpdateBuddySettingsArgs = {
  input: BuddySettingsInput;
};


export type MutationUpdateBuddySpeciesArgs = {
  species: Scalars['String']['input'];
};


export type MutationUpdateCareerGoalArgs = {
  goalId: Scalars['ID']['input'];
  input: CareerGoalUpdateInput;
};


export type MutationUpdateContentPreferencesArgs = {
  input: UpdateContentPreferencesInput;
};


export type MutationUpdateCrewChallengeArgs = {
  id: Scalars['ID']['input'];
  input: CrewChallengeInput;
};


export type MutationUpdateExtendedProfileArgs = {
  input: ExtendedProfileInput;
};


export type MutationUpdateFeedPreferencesArgs = {
  input: FeedPreferencesInput;
};


export type MutationUpdateGoalArgs = {
  id: Scalars['ID']['input'];
  input: GoalInput;
};


export type MutationUpdateHomeEquipmentArgs = {
  equipmentIds: Array<Scalars['ID']['input']>;
};


export type MutationUpdateIssueArgs = {
  id: Scalars['ID']['input'];
  input: IssueUpdateInput;
};


export type MutationUpdateLimitationArgs = {
  id: Scalars['ID']['input'];
  input: LimitationInput;
};


export type MutationUpdateLocationRecordPrivacyArgs = {
  input: LocationRecordPrivacyInput;
};


export type MutationUpdateMartialArtNotesArgs = {
  notes: Scalars['String']['input'];
  techniqueId: Scalars['ID']['input'];
};


export type MutationUpdateMascotHighfivePrefsArgs = {
  input: MascotHighfivePrefsInput;
};


export type MutationUpdateMascotNicknameArgs = {
  nickname: Scalars['String']['input'];
};


export type MutationUpdateMascotSettingsArgs = {
  input: MascotSettingsInput;
};


export type MutationUpdateMealArgs = {
  id: Scalars['ID']['input'];
  input: MealLogInput;
};


export type MutationUpdateMessagingPrivacyArgs = {
  input: UpdateMessagingPrivacyInput;
};


export type MutationUpdateMilestoneProgressArgs = {
  milestoneId: Scalars['ID']['input'];
  progress: Scalars['Int']['input'];
};


export type MutationUpdateMyFullProfileArgs = {
  input: FullProfileInput;
};


export type MutationUpdateNutritionGoalsArgs = {
  input: NutritionGoalsInput;
};


export type MutationUpdateNutritionPreferencesArgs = {
  input: NutritionPreferencesInput;
};


export type MutationUpdateOnboardingProfileArgs = {
  input: OnboardingProfileInput;
};


export type MutationUpdatePresenceArgs = {
  status: Scalars['String']['input'];
};


export type MutationUpdatePrivacyArgs = {
  input: PrivacyInput;
};


export type MutationUpdateProfileArgs = {
  input: ProfileInput;
};


export type MutationUpdateProgramArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProgramInput;
};


export type MutationUpdateProgressPhotoArgs = {
  id: Scalars['ID']['input'];
  input: ProgressPhotoUpdateInput;
};


export type MutationUpdateProgressionTargetArgs = {
  currentValue: Scalars['Float']['input'];
  id: Scalars['ID']['input'];
};


export type MutationUpdateRecipeArgs = {
  id: Scalars['ID']['input'];
  input: RecipeInput;
};


export type MutationUpdateRestTimerArgs = {
  remaining: Scalars['Int']['input'];
  sessionId: Scalars['ID']['input'];
  total: Scalars['Int']['input'];
};


export type MutationUpdateSetArgs = {
  input: UpdateSetInput;
};


export type MutationUpdateSettingsArgs = {
  input: UserSettingsInput;
};


export type MutationUpdateSleepGoalArgs = {
  id: Scalars['ID']['input'];
  input: SleepGoalInput;
};


export type MutationUpdateSleepLogArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSleepLogInput;
};


export type MutationUpdateTrainerClassArgs = {
  classId: Scalars['ID']['input'];
  input: UpdateTrainerClassInput;
};


export type MutationUpdateTrainerStatusArgs = {
  status: Scalars['String']['input'];
};


export type MutationUpdateWorkoutTemplateArgs = {
  id: Scalars['ID']['input'];
  input: UpdateWorkoutTemplateInput;
};


export type MutationUpgradeToE2EeArgs = {
  conversationId: Scalars['ID']['input'];
};


export type MutationUploadOneTimePreKeysArgs = {
  input: UploadPreKeysInput;
};


export type MutationUploadVenuePhotoArgs = {
  input: VenuePhotoInput;
  venueId: Scalars['ID']['input'];
};


export type MutationUpsertTrainerProfileArgs = {
  input: TrainerProfileInput;
};


export type MutationUseMascotAssistArgs = {
  exerciseId: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  workoutId: Scalars['ID']['input'];
};


export type MutationVerifyAgeArgs = {
  input: VerifyAgeInput;
};


export type MutationVerifyEquipmentArgs = {
  input: EquipmentVerifyInput;
  venueId: Scalars['ID']['input'];
};


export type MutationVerifyVenueArgs = {
  input: VenueVerifyInput;
  venueId: Scalars['ID']['input'];
};


export type MutationVoteEquipmentConditionArgs = {
  condition: Scalars['String']['input'];
  equipmentItemId: Scalars['ID']['input'];
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
};


export type MutationVoteLocationCommentArgs = {
  commentId: Scalars['ID']['input'];
  vote: Scalars['Int']['input'];
};


export type MutationVoteOnIssueArgs = {
  issueId: Scalars['ID']['input'];
  vote: Scalars['Int']['input'];
};


export type MutationVoteOnRoadmapItemArgs = {
  itemId: Scalars['ID']['input'];
};


export type MutationVoteOnSuggestionArgs = {
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  suggestionId: Scalars['ID']['input'];
  support: Scalars['Boolean']['input'];
};


export type MutationWitnessRecordArgs = {
  attestation?: InputMaybe<Scalars['String']['input']>;
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  recordId: Scalars['ID']['input'];
};

export type MyCrewResult = {
  __typename: 'MyCrewResult';
  crew: Crew;
  members: Array<CrewMember>;
  membership: CrewMember;
  stats: CrewStats;
  wars: Array<CrewWarWithDetails>;
};

export type MysteryBox = {
  __typename: 'MysteryBox';
  availableFrom?: Maybe<Scalars['DateTime']['output']>;
  availableUntil?: Maybe<Scalars['DateTime']['output']>;
  boxType: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  dropRates?: Maybe<Scalars['JSON']['output']>;
  id: Scalars['ID']['output'];
  maxPurchasesPerDay?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  price: Scalars['Int']['output'];
};

export type MysteryBoxDetails = {
  __typename: 'MysteryBoxDetails';
  box: MysteryBox;
  dropStats: Array<MysteryBoxDropStat>;
  recentDrops: Array<MysteryBoxDrop>;
};

export type MysteryBoxDrop = {
  __typename: 'MysteryBoxDrop';
  name: Scalars['String']['output'];
  openedAt: Scalars['DateTime']['output'];
  previewUrl?: Maybe<Scalars['String']['output']>;
  rarity: Scalars['String']['output'];
  username: Scalars['String']['output'];
};

export type MysteryBoxDropStat = {
  __typename: 'MysteryBoxDropStat';
  count: Scalars['Int']['output'];
  rarity: Scalars['String']['output'];
};

export type MysteryBoxOpenResult = {
  __typename: 'MysteryBoxOpenResult';
  newBalance?: Maybe<Scalars['Int']['output']>;
  results: Array<MysteryBoxReward>;
  success: Scalars['Boolean']['output'];
};

export type MysteryBoxOpening = {
  __typename: 'MysteryBoxOpening';
  boxId: Scalars['ID']['output'];
  boxName: Scalars['String']['output'];
  cosmeticId: Scalars['ID']['output'];
  cosmeticName: Scalars['String']['output'];
  creditsSpent: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  openedAt: Scalars['DateTime']['output'];
  previewUrl?: Maybe<Scalars['String']['output']>;
  rarity: Scalars['String']['output'];
  wasPityReward: Scalars['Boolean']['output'];
};

export type MysteryBoxReward = {
  __typename: 'MysteryBoxReward';
  cosmeticId: Scalars['ID']['output'];
  cosmeticName: Scalars['String']['output'];
  isDuplicate?: Maybe<Scalars['Boolean']['output']>;
  previewUrl?: Maybe<Scalars['String']['output']>;
  rarity: Scalars['String']['output'];
  refundAmount?: Maybe<Scalars['Int']['output']>;
  wasPityReward: Scalars['Boolean']['output'];
};

export type NearestVenuesInput = {
  equipmentTypes?: InputMaybe<Array<Scalars['String']['input']>>;
  latitude: Scalars['Float']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  longitude: Scalars['Float']['input'];
  maxDistanceKm?: InputMaybe<Scalars['Float']['input']>;
};

/** NSFW classification levels */
export type NsfwClassification =
  | 'explicit'
  | 'nsfw'
  | 'safe'
  | 'suggestive';

export type NutritionDashboard = {
  __typename: 'NutritionDashboard';
  archetypeProfile?: Maybe<ArchetypeNutritionProfile>;
  enabled: Scalars['Boolean']['output'];
  goals?: Maybe<NutritionGoals>;
  preferences?: Maybe<NutritionPreferences>;
  recentMeals: Array<MealLog>;
  streaks?: Maybe<NutritionStreaks>;
  todaySummary?: Maybe<DailyNutritionSummary>;
};

export type NutritionGoals = {
  __typename: 'NutritionGoals';
  activityMultiplier?: Maybe<Scalars['Float']['output']>;
  calculationMethod?: Maybe<Scalars['String']['output']>;
  calories: Scalars['Int']['output'];
  carbsG: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  fatG: Scalars['Int']['output'];
  fiberG?: Maybe<Scalars['Int']['output']>;
  goalAdjustment?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  proteinG: Scalars['Int']['output'];
  tdeeBase?: Maybe<Scalars['Int']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
  weekdayCalories?: Maybe<Scalars['Int']['output']>;
  weekendCalories?: Maybe<Scalars['Int']['output']>;
  workoutDayCalories?: Maybe<Scalars['Int']['output']>;
  workoutDayProteinG?: Maybe<Scalars['Int']['output']>;
};

export type NutritionGoalsInput = {
  calories?: InputMaybe<Scalars['Int']['input']>;
  carbsG?: InputMaybe<Scalars['Int']['input']>;
  fatG?: InputMaybe<Scalars['Int']['input']>;
  fiberG?: InputMaybe<Scalars['Int']['input']>;
  proteinG?: InputMaybe<Scalars['Int']['input']>;
  workoutDayCalories?: InputMaybe<Scalars['Int']['input']>;
  workoutDayProteinG?: InputMaybe<Scalars['Int']['input']>;
};

export type NutritionHistoryEntry = {
  __typename: 'NutritionHistoryEntry';
  calories: Scalars['Int']['output'];
  carbsG: Scalars['Float']['output'];
  date: Scalars['String']['output'];
  fatG: Scalars['Float']['output'];
  goalCalories: Scalars['Int']['output'];
  goalMet: Scalars['Boolean']['output'];
  mealCount: Scalars['Int']['output'];
  proteinG: Scalars['Float']['output'];
};

export type NutritionPreferences = {
  __typename: 'NutritionPreferences';
  dietaryRestrictions?: Maybe<Array<Scalars['String']['output']>>;
  enabled: Scalars['Boolean']['output'];
  goalType: Scalars['String']['output'];
  showInCommunity: Scalars['Boolean']['output'];
  showOnDashboard: Scalars['Boolean']['output'];
  syncWithArchetype: Scalars['Boolean']['output'];
  syncWithWorkouts: Scalars['Boolean']['output'];
  trackingMode: Scalars['String']['output'];
};

export type NutritionPreferencesInput = {
  dietaryRestrictions?: InputMaybe<Array<Scalars['String']['input']>>;
  goalType?: InputMaybe<Scalars['String']['input']>;
  showInCommunity?: InputMaybe<Scalars['Boolean']['input']>;
  showOnDashboard?: InputMaybe<Scalars['Boolean']['input']>;
  syncWithArchetype?: InputMaybe<Scalars['Boolean']['input']>;
  syncWithWorkouts?: InputMaybe<Scalars['Boolean']['input']>;
  trackingMode?: InputMaybe<Scalars['String']['input']>;
};

export type NutritionStreaks = {
  __typename: 'NutritionStreaks';
  currentGoalStreak: Scalars['Int']['output'];
  currentLoggingStreak: Scalars['Int']['output'];
  lastLoggedAt?: Maybe<Scalars['DateTime']['output']>;
  longestGoalStreak: Scalars['Int']['output'];
  longestLoggingStreak: Scalars['Int']['output'];
};

export type NutritionTip = {
  __typename: 'NutritionTip';
  content: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
};

export type OfferResult = {
  __typename: 'OfferResult';
  message?: Maybe<Scalars['String']['output']>;
  offerId?: Maybe<Scalars['ID']['output']>;
  success: Scalars['Boolean']['output'];
};

export type OnboardingEquipment = {
  __typename: 'OnboardingEquipment';
  extras?: Maybe<Array<Scalars['String']['output']>>;
  kettlebellCount?: Maybe<Scalars['Int']['output']>;
  type: Scalars['String']['output'];
};

export type OnboardingProfile = {
  __typename: 'OnboardingProfile';
  displayName?: Maybe<Scalars['String']['output']>;
  equipment?: Maybe<OnboardingEquipment>;
  experienceLevel?: Maybe<Scalars['String']['output']>;
  fitnessGoals?: Maybe<Array<Scalars['String']['output']>>;
  preferredWorkoutTime?: Maybe<Scalars['String']['output']>;
};

export type OnboardingProfileInput = {
  displayName?: InputMaybe<Scalars['String']['input']>;
  experienceLevel?: InputMaybe<Scalars['String']['input']>;
  fitnessGoals?: InputMaybe<Array<Scalars['String']['input']>>;
  preferredWorkoutTime?: InputMaybe<Scalars['String']['input']>;
};

export type OnboardingResult = {
  __typename: 'OnboardingResult';
  journey?: Maybe<JourneyProgress>;
  success: Scalars['Boolean']['output'];
  user: User;
};

export type OnboardingStatus = {
  __typename: 'OnboardingStatus';
  completed: Scalars['Boolean']['output'];
  currentStep?: Maybe<Scalars['String']['output']>;
  profile?: Maybe<OnboardingProfile>;
  stepsCompleted: Array<Scalars['String']['output']>;
};

/** One-time prekey input */
export type OneTimePreKeyInput = {
  id: Scalars['Int']['input'];
  key: Scalars['String']['input'];
};

/** Type of outdoor exercise equipment */
export type OutdoorEquipmentType = {
  __typename: 'OutdoorEquipmentType';
  category: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  exercises: Array<Exercise>;
  iconName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  muscleGroups: Array<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

/** A fitness venue with outdoor exercise equipment */
export type OutdoorVenue = {
  __typename: 'OutdoorVenue';
  accessibleFeatures?: Maybe<Array<Scalars['String']['output']>>;
  address?: Maybe<Scalars['String']['output']>;
  amenities?: Maybe<Array<Scalars['String']['output']>>;
  averageRating?: Maybe<Scalars['Float']['output']>;
  borough?: Maybe<Scalars['String']['output']>;
  coveredArea?: Maybe<Scalars['Boolean']['output']>;
  createdAt: Scalars['DateTime']['output'];
  dataSource?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  distance?: Maybe<Scalars['Float']['output']>;
  equipment: Array<VenueEquipmentItem>;
  externalId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isVerified: Scalars['Boolean']['output'];
  lastVerifiedAt?: Maybe<Scalars['DateTime']['output']>;
  latitude: Scalars['Float']['output'];
  lightingAvailable?: Maybe<Scalars['Boolean']['output']>;
  longitude: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  neighborhood?: Maybe<Scalars['String']['output']>;
  nycParkId?: Maybe<Scalars['String']['output']>;
  operatingHours?: Maybe<Scalars['JSON']['output']>;
  osmId?: Maybe<Scalars['String']['output']>;
  photos: Array<VenuePhoto>;
  seasonalAvailability?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  surfaceType?: Maybe<Scalars['String']['output']>;
  totalRatings: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  venueType: Scalars['String']['output'];
  verificationCount: Scalars['Int']['output'];
};

export type PtTest = {
  __typename: 'PTTest';
  category?: Maybe<Scalars['String']['output']>;
  components: Array<PtTestComponent>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  institution?: Maybe<Scalars['String']['output']>;
  lastUpdated?: Maybe<Scalars['DateTime']['output']>;
  maxScore?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  passingScore?: Maybe<Scalars['Int']['output']>;
  scoringMethod: Scalars['String']['output'];
  sourceUrl?: Maybe<Scalars['String']['output']>;
  testFrequency?: Maybe<Scalars['String']['output']>;
};

export type PtTestComponent = {
  __typename: 'PTTestComponent';
  alternative?: Maybe<PtTestComponent>;
  description?: Maybe<Scalars['String']['output']>;
  distanceMiles?: Maybe<Scalars['Float']['output']>;
  durationSeconds?: Maybe<Scalars['Int']['output']>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type PtTestComponentResultInput = {
  componentId: Scalars['String']['input'];
  unit?: InputMaybe<Scalars['String']['input']>;
  value: Scalars['Float']['input'];
};

export type PtTestLeaderboardEntry = {
  __typename: 'PTTestLeaderboardEntry';
  avatar?: Maybe<Scalars['String']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  passed?: Maybe<Scalars['Boolean']['output']>;
  rank: Scalars['Int']['output'];
  score: Scalars['Int']['output'];
  testDate: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};

export type PtTestPreviousResult = {
  __typename: 'PTTestPreviousResult';
  passed?: Maybe<Scalars['Boolean']['output']>;
  testDate: Scalars['String']['output'];
  totalScore?: Maybe<Scalars['Int']['output']>;
};

export type PtTestResult = {
  __typename: 'PTTestResult';
  category?: Maybe<Scalars['String']['output']>;
  componentResults: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  institution?: Maybe<Scalars['String']['output']>;
  location?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  official: Scalars['Boolean']['output'];
  passed?: Maybe<Scalars['Boolean']['output']>;
  proctor?: Maybe<Scalars['String']['output']>;
  recordedAt: Scalars['DateTime']['output'];
  testDate: Scalars['String']['output'];
  testId: Scalars['ID']['output'];
  testName: Scalars['String']['output'];
  totalScore?: Maybe<Scalars['Int']['output']>;
};

export type PtTestResultDetail = {
  __typename: 'PTTestResultDetail';
  components: Array<PtTestComponent>;
  previousResults: Array<PtTestPreviousResult>;
  result: PtTestResult;
};

export type PtTestResultInput = {
  componentResults: Array<PtTestComponentResultInput>;
  location?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  official?: InputMaybe<Scalars['Boolean']['input']>;
  proctor?: InputMaybe<Scalars['String']['input']>;
  ptTestId: Scalars['ID']['input'];
  testDate: Scalars['String']['input'];
};

export type PtTestsByInstitution = {
  __typename: 'PTTestsByInstitution';
  byInstitution: Scalars['JSON']['output'];
  tests: Array<PtTest>;
};

/** Standard Relay-style pagination info */
export type PageInfo = {
  __typename: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type PaginationInfo = {
  __typename: 'PaginationInfo';
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  nextCursor?: Maybe<Scalars['String']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type PercentileInfo = {
  __typename: 'PercentileInfo';
  archetype: Scalars['Float']['output'];
  level: Scalars['Float']['output'];
  overall: Scalars['Float']['output'];
  workouts: Scalars['Float']['output'];
};

export type PersonalPlan = {
  __typename: 'PersonalPlan';
  estimatedProgress?: Maybe<Scalars['JSON']['output']>;
  focusAreas: Array<Scalars['String']['output']>;
  weeklySchedule: Scalars['JSON']['output'];
};

export type PersonalRecord = {
  __typename: 'PersonalRecord';
  achievedAt: Scalars['DateTime']['output'];
  bodyweight?: Maybe<Scalars['Float']['output']>;
  details?: Maybe<PersonalRecordDetails>;
  exerciseId: Scalars['ID']['output'];
  exerciseName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  previousValue?: Maybe<Scalars['Float']['output']>;
  recordType: Scalars['String']['output'];
  reps?: Maybe<Scalars['Int']['output']>;
  setNumber?: Maybe<Scalars['Int']['output']>;
  unit?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
  value: Scalars['Float']['output'];
  workoutId?: Maybe<Scalars['ID']['output']>;
};

export type PersonalRecordDetails = {
  __typename: 'PersonalRecordDetails';
  estimated1RM?: Maybe<Scalars['Float']['output']>;
  reps?: Maybe<Scalars['Int']['output']>;
  weight?: Maybe<Scalars['Float']['output']>;
};

export type PersonalizationContext = {
  __typename: 'PersonalizationContext';
  archetype?: Maybe<Archetype>;
  equipment: Array<Scalars['String']['output']>;
  level: Scalars['Int']['output'];
  limitations: Array<Limitation>;
  preferences?: Maybe<Scalars['JSON']['output']>;
  recentMuscles: Array<Scalars['String']['output']>;
  weakPoints: Array<Scalars['String']['output']>;
};

export type PersonalizationSummary = {
  __typename: 'PersonalizationSummary';
  areasForImprovement: Array<Scalars['String']['output']>;
  strengths: Array<Scalars['String']['output']>;
  suggestedFocus?: Maybe<Scalars['String']['output']>;
};

export type PinnedMessage = {
  __typename: 'PinnedMessage';
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  senderName: Scalars['String']['output'];
};

export type PinnedMessageResult = {
  __typename: 'PinnedMessageResult';
  id: Scalars['ID']['output'];
  pinnedAt: Scalars['String']['output'];
};

export type PityCounter = {
  __typename: 'PityCounter';
  boxType: Scalars['String']['output'];
  epicCounter: Scalars['Int']['output'];
  epicThreshold: Scalars['Int']['output'];
  lastEpicAt?: Maybe<Scalars['DateTime']['output']>;
  lastLegendaryAt?: Maybe<Scalars['DateTime']['output']>;
  legendaryCounter: Scalars['Int']['output'];
  legendaryThreshold: Scalars['Int']['output'];
};

export type PostBoostInput = {
  durationHours: Scalars['Int']['input'];
  targetId: Scalars['ID']['input'];
  targetType: Scalars['String']['input'];
};

export type PostBoostResult = {
  __typename: 'PostBoostResult';
  boostEndsAt?: Maybe<Scalars['DateTime']['output']>;
  cost: Scalars['Int']['output'];
  error?: Maybe<Scalars['String']['output']>;
  newBalance: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
  targetId: Scalars['ID']['output'];
  targetType: Scalars['String']['output'];
  transactionId?: Maybe<Scalars['ID']['output']>;
};

export type PotentialRival = {
  __typename: 'PotentialRival';
  archetype?: Maybe<Scalars['String']['output']>;
  avatar?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  level?: Maybe<Scalars['Int']['output']>;
  username: Scalars['String']['output'];
};

export type PrescribedExercise = {
  __typename: 'PrescribedExercise';
  exerciseId: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  phase?: Maybe<Scalars['String']['output']>;
  primaryMuscles: Array<Scalars['String']['output']>;
  reps: Scalars['Int']['output'];
  restSeconds: Scalars['Int']['output'];
  sets: Scalars['Int']['output'];
};

/** Enhanced prescribed exercise with scoring and load details */
export type PrescribedExerciseV3 = {
  __typename: 'PrescribedExerciseV3';
  exerciseId: Scalars['ID']['output'];
  movementPattern: Scalars['String']['output'];
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  percentOf1RM?: Maybe<Scalars['Float']['output']>;
  primaryMuscles: Array<Scalars['String']['output']>;
  reasoning: Scalars['String']['output'];
  reps: Scalars['String']['output'];
  restSeconds: Scalars['Int']['output'];
  rpe?: Maybe<Scalars['Float']['output']>;
  score: Scalars['Float']['output'];
  scoreBreakdown: ScoreBreakdown;
  secondaryMuscles: Array<Scalars['String']['output']>;
  sets: Scalars['Int']['output'];
  substitutes: Array<ExerciseSubstitute>;
  tempo?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

export type Prescription = {
  __typename: 'Prescription';
  actualDuration: Scalars['Int']['output'];
  cooldown?: Maybe<Array<PrescribedExercise>>;
  createdAt: Scalars['DateTime']['output'];
  difficulty: Scalars['String']['output'];
  exercises: Array<PrescribedExercise>;
  id: Scalars['ID']['output'];
  muscleCoverage?: Maybe<Scalars['JSON']['output']>;
  targetDuration: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
  warmup?: Maybe<Array<PrescribedExercise>>;
};

/** Input for submitting prescription feedback */
export type PrescriptionFeedbackInput = {
  completionPercent?: InputMaybe<Scalars['Float']['input']>;
  exerciseFeedback: Array<ExerciseFeedbackInput>;
  notes?: InputMaybe<Scalars['String']['input']>;
  overallDifficulty?: InputMaybe<Scalars['Int']['input']>;
  overallEnjoyment?: InputMaybe<Scalars['Int']['input']>;
  prescriptionId: Scalars['ID']['input'];
  wouldRepeat?: InputMaybe<Scalars['Boolean']['input']>;
};

export type PrescriptionInput = {
  equipment?: InputMaybe<Array<Scalars['String']['input']>>;
  goals: Array<Scalars['String']['input']>;
  location: Scalars['String']['input'];
  timeAvailable: Scalars['Int']['input'];
};

/** Input for generating V3 prescription */
export type PrescriptionInputV3 = {
  equipment: Array<Scalars['String']['input']>;
  excludeMuscles?: InputMaybe<Array<Scalars['String']['input']>>;
  experienceLevel?: InputMaybe<Scalars['String']['input']>;
  goals: Array<Scalars['String']['input']>;
  includeCooldown?: InputMaybe<Scalars['Boolean']['input']>;
  includeSupersets?: InputMaybe<Scalars['Boolean']['input']>;
  includeWarmup?: InputMaybe<Scalars['Boolean']['input']>;
  location: Scalars['String']['input'];
  maxExercises?: InputMaybe<Scalars['Int']['input']>;
  preferredIntensity?: InputMaybe<Scalars['String']['input']>;
  targetMuscles?: InputMaybe<Array<Scalars['String']['input']>>;
  timeAvailable: Scalars['Int']['input'];
  trainingPhase?: InputMaybe<Scalars['String']['input']>;
};

/** Prescription generation metadata */
export type PrescriptionMetadata = {
  __typename: 'PrescriptionMetadata';
  algorithmVersion: Scalars['String']['output'];
  cacheHit: Scalars['Boolean']['output'];
  factorsConsidered: Array<Scalars['String']['output']>;
  generatedAt: Scalars['DateTime']['output'];
  generationTimeMs: Scalars['Int']['output'];
  recoveryScore?: Maybe<Scalars['Float']['output']>;
};

/** Prescription V3 result with enhanced metadata and scoring */
export type PrescriptionV3 = {
  __typename: 'PrescriptionV3';
  actualDuration: Scalars['Int']['output'];
  cooldown?: Maybe<Array<CooldownExercise>>;
  createdAt: Scalars['DateTime']['output'];
  difficulty: Scalars['String']['output'];
  exercises: Array<PrescribedExerciseV3>;
  id: Scalars['ID']['output'];
  metadata: PrescriptionMetadata;
  muscleCoverage: Scalars['JSON']['output'];
  periodizationPhase?: Maybe<Scalars['String']['output']>;
  supersets?: Maybe<Array<SupersetPair>>;
  targetDuration: Scalars['Int']['output'];
  warmup?: Maybe<Array<WarmupExercise>>;
};

export type PresenceInfo = {
  __typename: 'PresenceInfo';
  lastSeen?: Maybe<Scalars['DateTime']['output']>;
  online: Scalars['Boolean']['output'];
  status?: Maybe<Scalars['String']['output']>;
};

/** User presence status */
export type PresenceStatus =
  | 'away'
  | 'busy'
  | 'offline'
  | 'online';

export type PricingTier = {
  __typename: 'PricingTier';
  bonus?: Maybe<Scalars['Int']['output']>;
  credits: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  price: Scalars['Float']['output'];
};

export type PrivacyInput = {
  allowMessages?: InputMaybe<Scalars['String']['input']>;
  profileVisibility?: InputMaybe<Scalars['String']['input']>;
  shareProgress?: InputMaybe<Scalars['Boolean']['input']>;
  showInLeaderboards?: InputMaybe<Scalars['Boolean']['input']>;
  showWorkoutHistory?: InputMaybe<Scalars['Boolean']['input']>;
};

export type PrivacySettings = {
  __typename: 'PrivacySettings';
  allowMessages: Scalars['String']['output'];
  minimalistMode: Scalars['Boolean']['output'];
  profileVisibility: Scalars['String']['output'];
  shareProgress: Scalars['Boolean']['output'];
  showInLeaderboards: Scalars['Boolean']['output'];
  showWorkoutHistory: Scalars['Boolean']['output'];
};

export type PrivacySummary = {
  __typename: 'PrivacySummary';
  dataCollected: Array<Scalars['String']['output']>;
  dataShared: Array<Scalars['String']['output']>;
  retentionPeriod: Scalars['String']['output'];
};

export type Profile = {
  __typename: 'Profile';
  avatar?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  bioRichJson?: Maybe<Scalars['JSON']['output']>;
  createdAt: Scalars['DateTime']['output'];
  displayName?: Maybe<Scalars['String']['output']>;
  experienceLevel?: Maybe<Scalars['String']['output']>;
  fitnessGoals?: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['ID']['output'];
  location?: Maybe<Scalars['String']['output']>;
  preferredWorkoutTime?: Maybe<Scalars['String']['output']>;
  socialLinks?: Maybe<Scalars['JSON']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
  visibility: Scalars['String']['output'];
  wealthTier?: Maybe<WealthTier>;
  website?: Maybe<Scalars['String']['output']>;
};

export type ProfileInput = {
  avatar?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  experienceLevel?: InputMaybe<Scalars['String']['input']>;
  fitnessGoals?: InputMaybe<Array<Scalars['String']['input']>>;
  location?: InputMaybe<Scalars['String']['input']>;
  preferredWorkoutTime?: InputMaybe<Scalars['String']['input']>;
  socialLinks?: InputMaybe<Scalars['JSON']['input']>;
  visibility?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type ProgramDay = {
  __typename: 'ProgramDay';
  day: Scalars['Int']['output'];
  exercises: Array<ProgramExercise>;
  focus?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
};

export type ProgramDayInput = {
  day: Scalars['Int']['input'];
  exercises: Array<ProgramExerciseInput>;
  focus?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
};

export type ProgramEnrollment = {
  __typename: 'ProgramEnrollment';
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  currentDay: Scalars['Int']['output'];
  currentWeek: Scalars['Int']['output'];
  expectedEndDate?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  pausedAt?: Maybe<Scalars['DateTime']['output']>;
  program?: Maybe<TrainingProgram>;
  programId: Scalars['ID']['output'];
  progressData?: Maybe<Scalars['JSON']['output']>;
  startedAt: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
  streakCurrent: Scalars['Int']['output'];
  streakLongest: Scalars['Int']['output'];
  totalWorkouts: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
  userRating?: Maybe<Scalars['Int']['output']>;
  userReview?: Maybe<Scalars['String']['output']>;
  workoutsCompleted: Scalars['Int']['output'];
};

export type ProgramExercise = {
  __typename: 'ProgramExercise';
  exerciseId: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  reps: Scalars['String']['output'];
  restSeconds: Scalars['Int']['output'];
  rpe?: Maybe<Scalars['Float']['output']>;
  sets: Scalars['Int']['output'];
  weight?: Maybe<Scalars['Float']['output']>;
};

export type ProgramExerciseInput = {
  exerciseId: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  reps: Scalars['String']['input'];
  restSeconds: Scalars['Int']['input'];
  rpe?: InputMaybe<Scalars['Float']['input']>;
  sets: Scalars['Int']['input'];
  weight?: InputMaybe<Scalars['Float']['input']>;
};

export type ProgramSearchInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  creator?: InputMaybe<Scalars['ID']['input']>;
  daysPerWeek?: InputMaybe<Scalars['Int']['input']>;
  difficulty?: InputMaybe<Scalars['String']['input']>;
  durationWeeks?: InputMaybe<Scalars['Int']['input']>;
  equipment?: InputMaybe<Array<Scalars['String']['input']>>;
  featured?: InputMaybe<Scalars['Boolean']['input']>;
  goals?: InputMaybe<Array<Scalars['String']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  minRating?: InputMaybe<Scalars['Float']['input']>;
  official?: InputMaybe<Scalars['Boolean']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};

export type ProgressPhoto = {
  __typename: 'ProgressPhoto';
  bodyFatPercentage?: Maybe<Scalars['Float']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isPrivate: Scalars['Boolean']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  photoDate: Scalars['String']['output'];
  photoType: Scalars['String']['output'];
  pose: Scalars['String']['output'];
  storagePath: Scalars['String']['output'];
  thumbnailPath?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
  weightKg?: Maybe<Scalars['Float']['output']>;
};

export type ProgressPhotoComparison = {
  __typename: 'ProgressPhotoComparison';
  allPhotos: Array<ProgressPhoto>;
  daysBetween?: Maybe<Scalars['Int']['output']>;
  first?: Maybe<ProgressPhoto>;
  last?: Maybe<ProgressPhoto>;
  message?: Maybe<Scalars['String']['output']>;
  middle?: Maybe<ProgressPhoto>;
  totalPhotos: Scalars['Int']['output'];
};

export type ProgressPhotoInput = {
  bodyFatPercentage?: InputMaybe<Scalars['Float']['input']>;
  isPrivate?: InputMaybe<Scalars['Boolean']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  photoDate: Scalars['String']['input'];
  photoType: Scalars['String']['input'];
  pose?: InputMaybe<Scalars['String']['input']>;
  storagePath: Scalars['String']['input'];
  thumbnailPath?: InputMaybe<Scalars['String']['input']>;
  weightKg?: InputMaybe<Scalars['Float']['input']>;
};

export type ProgressPhotoStats = {
  __typename: 'ProgressPhotoStats';
  byType: Scalars['JSON']['output'];
  firstPhoto?: Maybe<Scalars['DateTime']['output']>;
  lastPhoto?: Maybe<Scalars['DateTime']['output']>;
  totalPhotos: Scalars['Int']['output'];
};

export type ProgressPhotoTimeline = {
  __typename: 'ProgressPhotoTimeline';
  timeline: Scalars['JSON']['output'];
};

export type ProgressPhotoUpdateInput = {
  bodyFatPercentage?: InputMaybe<Scalars['Float']['input']>;
  isPrivate?: InputMaybe<Scalars['Boolean']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  photoDate?: InputMaybe<Scalars['String']['input']>;
  photoType?: InputMaybe<Scalars['String']['input']>;
  pose?: InputMaybe<Scalars['String']['input']>;
  weightKg?: InputMaybe<Scalars['Float']['input']>;
};

export type ProgressPhotosResult = {
  __typename: 'ProgressPhotosResult';
  pagination: PaginationInfo;
  photos: Array<ProgressPhoto>;
};

export type ProgressTrends = {
  __typename: 'ProgressTrends';
  bestMonth?: Maybe<BestPeriod>;
  bestQuarter?: Maybe<BestQuarter>;
  bestYear?: Maybe<BestYear>;
  calculatedAt: Scalars['DateTime']['output'];
  currentStreak: Scalars['Int']['output'];
  dataPointsCount: Scalars['Int']['output'];
  daysUntilStreakMilestone?: Maybe<Scalars['Int']['output']>;
  earliestDataDate?: Maybe<Scalars['String']['output']>;
  latestDataDate?: Maybe<Scalars['String']['output']>;
  longestStreak: Scalars['Int']['output'];
  overallTrend: Scalars['String']['output'];
  projectedLevelUpDate?: Maybe<Scalars['String']['output']>;
  projectedTuNextMonth?: Maybe<Scalars['Float']['output']>;
  projectedTuNextQuarter?: Maybe<Scalars['Float']['output']>;
  projectedTuNextYear?: Maybe<Scalars['Float']['output']>;
  projectedWorkoutsNextMonth?: Maybe<Scalars['Int']['output']>;
  projectionConfidence: Scalars['Int']['output'];
  streakHealth: Scalars['String']['output'];
  strengthAcceleration: Scalars['Float']['output'];
  strengthVelocity: Scalars['Float']['output'];
  tuAcceleration: Scalars['Float']['output'];
  tuTrend: Scalars['String']['output'];
  tuVelocity: Scalars['Float']['output'];
  tuVsPrevMonthPct?: Maybe<Scalars['Float']['output']>;
  tuVsPrevQuarterPct?: Maybe<Scalars['Float']['output']>;
  tuVsPrevYearPct?: Maybe<Scalars['Float']['output']>;
  userId: Scalars['ID']['output'];
  volumeVelocity: Scalars['Float']['output'];
  workoutAcceleration: Scalars['Float']['output'];
  workoutTrend: Scalars['String']['output'];
  workoutVelocity: Scalars['Float']['output'];
  workoutsVsPrevMonthPct?: Maybe<Scalars['Float']['output']>;
  xpVelocity: Scalars['Float']['output'];
};

export type ProgressionAchievement = {
  __typename: 'ProgressionAchievement';
  description?: Maybe<Scalars['String']['output']>;
  earned: Scalars['Boolean']['output'];
  earnedAt?: Maybe<Scalars['DateTime']['output']>;
  iconUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type ProgressionExerciseStats = {
  __typename: 'ProgressionExerciseStats';
  avgWeight?: Maybe<Scalars['Float']['output']>;
  exerciseId: Scalars['ID']['output'];
  exerciseName: Scalars['String']['output'];
  history: Array<ProgressionHistoryEntry>;
  lastWorkoutAt?: Maybe<Scalars['DateTime']['output']>;
  maxWeight?: Maybe<Scalars['Float']['output']>;
  totalReps: Scalars['Int']['output'];
  totalSets: Scalars['Int']['output'];
  totalVolume: Scalars['Float']['output'];
};

export type ProgressionHistoryEntry = {
  __typename: 'ProgressionHistoryEntry';
  date: Scalars['DateTime']['output'];
  reps: Scalars['Int']['output'];
  sets: Scalars['Int']['output'];
  volume: Scalars['Float']['output'];
  weight?: Maybe<Scalars['Float']['output']>;
};

export type ProgressionLeaderboardEntry = {
  __typename: 'ProgressionLeaderboardEntry';
  avatar?: Maybe<Scalars['String']['output']>;
  level: Scalars['Int']['output'];
  rank: Scalars['Int']['output'];
  totalTu: Scalars['Float']['output'];
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
  xp: Scalars['Int']['output'];
};

export type ProgressionMastery = {
  __typename: 'ProgressionMastery';
  archetypeId: Scalars['String']['output'];
  archetypeName?: Maybe<Scalars['String']['output']>;
  tier: Scalars['String']['output'];
  totalTu: Scalars['Float']['output'];
};

export type ProgressionNutrition = {
  __typename: 'ProgressionNutrition';
  tips: Array<NutritionTip>;
};

export type ProgressionRecommendation = {
  __typename: 'ProgressionRecommendation';
  confidence: Scalars['Float']['output'];
  currentValue?: Maybe<Scalars['Float']['output']>;
  exerciseId: Scalars['ID']['output'];
  exerciseName: Scalars['String']['output'];
  message: Scalars['String']['output'];
  recommendationType: Scalars['String']['output'];
  recommendedValue: Scalars['Float']['output'];
  unit?: Maybe<Scalars['String']['output']>;
};

export type ProgressionRecord = {
  __typename: 'ProgressionRecord';
  achievedAt: Scalars['DateTime']['output'];
  exerciseId: Scalars['ID']['output'];
  exerciseName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  previousValue?: Maybe<Scalars['Float']['output']>;
  recordType: Scalars['String']['output'];
  unit?: Maybe<Scalars['String']['output']>;
  value: Scalars['Float']['output'];
};

export type ProgressionTarget = {
  __typename: 'ProgressionTarget';
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  currentValue: Scalars['Float']['output'];
  exerciseId?: Maybe<Scalars['ID']['output']>;
  exerciseName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  incrementFrequency?: Maybe<Scalars['String']['output']>;
  incrementValue?: Maybe<Scalars['Float']['output']>;
  progress: Scalars['Float']['output'];
  status: Scalars['String']['output'];
  targetDate?: Maybe<Scalars['DateTime']['output']>;
  targetType: Scalars['String']['output'];
  targetValue: Scalars['Float']['output'];
};

export type ProgressionTargetInput = {
  currentValue: Scalars['Float']['input'];
  exerciseId?: InputMaybe<Scalars['ID']['input']>;
  incrementFrequency?: InputMaybe<Scalars['String']['input']>;
  incrementValue?: InputMaybe<Scalars['Float']['input']>;
  targetDate?: InputMaybe<Scalars['DateTime']['input']>;
  targetType: Scalars['String']['input'];
  targetValue: Scalars['Float']['input'];
};

export type ProjectedMilestone = {
  __typename: 'ProjectedMilestone';
  category: Scalars['String']['output'];
  confidence: Scalars['Int']['output'];
  currentValue: Scalars['Float']['output'];
  daysRemaining?: Maybe<Scalars['Int']['output']>;
  description: Scalars['String']['output'];
  name: Scalars['String']['output'];
  projectedDate?: Maybe<Scalars['String']['output']>;
  targetValue: Scalars['Float']['output'];
};

export type PublicCommunityStats = {
  __typename: 'PublicCommunityStats';
  activeNow: StatDisplay;
  activeWorkouts: StatDisplay;
  milestone?: Maybe<CommunityMilestone>;
  recentActivity?: Maybe<Array<ActivityEvent>>;
  totalUsers: StatDisplay;
  totalWorkouts: StatDisplay;
};

/** Public key bundle for initiating E2EE with a user */
export type PublicKeyBundle = {
  __typename: 'PublicKeyBundle';
  hasOneTimePreKey: Scalars['Boolean']['output'];
  identityKey: Scalars['String']['output'];
  signedPreKey: Scalars['String']['output'];
  signedPreKeySignature: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export type PurchaseResult = {
  __typename: 'PurchaseResult';
  message?: Maybe<Scalars['String']['output']>;
  newBalance?: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
};

/** Individual QA event input */
export type QaEventInput = {
  /** Event data as JSON */
  eventData: Scalars['JSON']['input'];
  /** Event type (js_error, graphql_error, navigation, interaction, etc.) */
  eventType: Scalars['String']['input'];
  /** ISO timestamp of the event */
  timestamp: Scalars['String']['input'];
  /** URL where event occurred */
  url?: InputMaybe<Scalars['String']['input']>;
};

/** QA event log entry */
export type QaLogEntry = {
  __typename: 'QALogEntry';
  createdAt: Scalars['DateTime']['output'];
  eventData: Scalars['JSON']['output'];
  eventType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  sessionId: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
  userAgent?: Maybe<Scalars['String']['output']>;
  userId?: Maybe<Scalars['ID']['output']>;
};

/** Input for logging QA session events */
export type QaLogInput = {
  /** Array of events to log */
  events: Array<QaEventInput>;
  /** Unique session ID for grouping events */
  sessionId: Scalars['String']['input'];
  /** User agent string */
  userAgent?: InputMaybe<Scalars['String']['input']>;
};

/** Result of logging QA events */
export type QaLogResult = {
  __typename: 'QALogResult';
  /** Number of events logged */
  count: Scalars['Int']['output'];
  /** Session ID for reference */
  sessionId: Scalars['String']['output'];
  /** Whether the events were logged successfully */
  success: Scalars['Boolean']['output'];
};

/** QA session summary for analysis */
export type QaSessionSummary = {
  __typename: 'QASessionSummary';
  endedAt?: Maybe<Scalars['DateTime']['output']>;
  errorCount: Scalars['Int']['output'];
  interactionCount: Scalars['Int']['output'];
  navigationCount: Scalars['Int']['output'];
  sessionId: Scalars['String']['output'];
  startedAt: Scalars['DateTime']['output'];
  totalEvents: Scalars['Int']['output'];
  userId?: Maybe<Scalars['ID']['output']>;
  warningCount: Scalars['Int']['output'];
};

export type QualityDistribution = {
  __typename: 'QualityDistribution';
  excellent: Scalars['Int']['output'];
  fair: Scalars['Int']['output'];
  good: Scalars['Int']['output'];
  poor: Scalars['Int']['output'];
  terrible: Scalars['Int']['output'];
};

export type Query = {
  __typename: 'Query';
  achievementDefinitions: Array<AchievementDefinition>;
  activeEnrollment?: Maybe<ProgramEnrollment>;
  activeMealPlan?: Maybe<MealPlan>;
  activeWorkoutSession?: Maybe<WorkoutSession>;
  /** Get comments on an activity item */
  activityComments: ActivityCommentsResult;
  /** Get the activity feed (your own or followed users) */
  activityFeed: ActivityFeedResult;
  /** Get a single activity item by ID */
  activityItem?: Maybe<ActivityItem>;
  adminIssues: Array<Issue>;
  allTimeTuLeaderboard: Array<AllTimeTuLeaderboardEntry>;
  archetype?: Maybe<Archetype>;
  archetypeCategories: Array<ArchetypeCategory>;
  archetypeNutritionProfile?: Maybe<ArchetypeNutritionProfile>;
  archetypeNutritionProfiles: Array<ArchetypeNutritionProfile>;
  archetypes: Array<Archetype>;
  archetypesByCategory: Array<Archetype>;
  blockStatus: BlockStatus;
  bodyMeasurement?: Maybe<BodyMeasurement>;
  bodyMeasurementComparison?: Maybe<BodyMeasurementComparison>;
  bodyMeasurementHistory?: Maybe<BodyMeasurementHistory>;
  bodyMeasurements: BodyMeasurementsResult;
  bodyRegions: Array<BodyRegion>;
  bonusEventHistory: Array<BonusEvent>;
  bonusEventTypes: Array<BonusEventType>;
  buddy?: Maybe<Buddy>;
  /** Get check-ins for a buddy pair */
  buddyCheckIns: Array<BuddyCheckIn>;
  buddyEvolutionPath: Array<BuddyEvolutionStage>;
  buddyInventory: Array<BuddyInventoryItem>;
  /** Get pending buddy invites */
  buddyInvites: BuddyInvitesResult;
  buddyLeaderboard: BuddyLeaderboardResult;
  /** Get messages with a buddy */
  buddyMessages: BuddyMessagesResult;
  /** Get your workout buddy preferences */
  buddyPreferences?: Maybe<WorkoutBuddyPreferences>;
  /** Get buddy suggestions based on preferences */
  buddySuggestions: Array<BuddySuggestion>;
  /** Check if I can message a specific user */
  canMessageUser: CanMessageResult;
  /** Check if a conversation can be upgraded to E2EE */
  canUpgradeToE2EE: CanUpgradeResult;
  careerExerciseRecommendations: Array<ExerciseRecommendation>;
  careerStandard?: Maybe<CareerStandard>;
  careerStandardCategories: Array<CareerStandardCategory>;
  careerStandards: Array<CareerStandard>;
  classAttendance: Array<ClassAttendance>;
  classEnrollments: Array<ClassEnrollment>;
  collectionFavorites: Array<CollectionItem>;
  collectionItems: CollectionItemsResult;
  collectionNewCount: Scalars['Int']['output'];
  collectionSetDetail?: Maybe<CollectionSetDetail>;
  collectionSets: Array<CollectionSet>;
  collectionShowcase: Array<CollectionItem>;
  collectionStats: CollectionStats;
  communityFeed: Array<FeedItem>;
  communityPercentile?: Maybe<PercentileInfo>;
  communityPresence?: Maybe<CommunityPresenceData>;
  communityStats?: Maybe<CommunityStats>;
  competition?: Maybe<Competition>;
  competitions: Array<Competition>;
  contributorLeaderboard: Array<ContributorLeaderboardEntry>;
  conversationMessages: Array<Message>;
  conversations: Array<Conversation>;
  creditEarnEvents?: Maybe<EarnEventsResult>;
  creditEarningSummary?: Maybe<CreditEarningSummary>;
  creditPackages: Array<CreditPackage>;
  creditsBalance?: Maybe<Balance>;
  crew?: Maybe<CrewWithDetails>;
  /** Get crew achievements */
  crewAchievements: Array<CrewAchievement>;
  /** Get a specific crew challenge */
  crewChallenge?: Maybe<CrewChallenge>;
  /** Get active crew challenges */
  crewChallenges: Array<CrewChallenge>;
  /** Get crew chat messages */
  crewChatMessages: CrewChatResult;
  crewLeaderboard: Array<CrewLeaderboardEntry>;
  /** Get unread message count for a crew */
  crewUnreadCount: Scalars['Int']['output'];
  economyActions: Array<EconomyAction>;
  economyBalance?: Maybe<Balance>;
  economyHistory: Array<Transaction>;
  economyPricing: Array<PricingTier>;
  economyTransactions: Array<Transaction>;
  economyWallet?: Maybe<Wallet>;
  /** Get encrypted file metadata */
  encryptedFileMetadata?: Maybe<EncryptedFileMetadata>;
  /** Get encrypted messages in a conversation */
  encryptedMessages: EncryptedMessagesResult;
  enrollment?: Maybe<EnrollmentWithProgram>;
  equipmentByCategory: Array<EquipmentType>;
  equipmentCategories: Array<EquipmentCategory>;
  /** Get consensus data for equipment condition */
  equipmentConsensus?: Maybe<EquipmentConsensus>;
  equipmentTypes: Array<EquipmentType>;
  equippedSkins: Array<Skin>;
  exercise?: Maybe<Exercise>;
  exerciseHistory: Array<ExerciseHistoryEntry>;
  exerciseSubstitutions: Array<ExerciseSubstitution>;
  exercises: Array<Exercise>;
  /** Find exercises that can be done at a specific venue based on available equipment */
  exercisesAtVenue: Array<Exercise>;
  extendedProfile?: Maybe<ExtendedProfile>;
  featuredPrograms: Array<TrainingProgram>;
  featuredWorkoutTemplates: Array<WorkoutTemplate>;
  /** Get feed preferences */
  feedPreferences: FeedPreferences;
  /** Get users who follow you/a user */
  followers: FollowListResult;
  /** Get users you're following */
  following: FollowListResult;
  foodByBarcode?: Maybe<FoodItem>;
  foodSearch: FoodSearchResult;
  /** Get top records across all venues for an exercise */
  globalVenueRecords: Array<VenueExerciseRecord>;
  goal?: Maybe<Goal>;
  goalSuggestions: Array<GoalSuggestion>;
  goals: Array<Goal>;
  hangout?: Maybe<Hangout>;
  hangoutStats?: Maybe<HangoutStats>;
  hangoutTypes: Array<HangoutType>;
  health?: Maybe<HealthStatus>;
  healthDetailed?: Maybe<DetailedHealthStatus>;
  highFiveStats: HighFiveStats;
  highFiveUsers: Array<HighFiveUser>;
  highFivesReceived: Array<HighFiveEncouragement>;
  highFivesSent: Array<HighFiveEncouragement>;
  homeEquipment: Array<HomeEquipment>;
  homeEquipmentIds: Array<Scalars['ID']['output']>;
  hydrationByDate: HydrationSummary;
  /** Check if you're following a specific user */
  isFollowing: Scalars['Boolean']['output'];
  issue?: Maybe<Issue>;
  issueLabels: Array<IssueLabel>;
  issueStats?: Maybe<IssueStats>;
  issues: IssuesResult;
  journey?: Maybe<JourneyProgress>;
  journeyHealth?: Maybe<JourneyHealthScore>;
  journeyHealthAlerts: Array<JourneyHealthAlert>;
  journeyHealthHistory: Array<JourneyHealthHistoryEntry>;
  journeyOverview?: Maybe<JourneyOverview>;
  journeyRecommendations: Array<JourneyRecommendation>;
  lastSleep?: Maybe<SleepLog>;
  latestBodyMeasurement?: Maybe<BodyMeasurement>;
  leaderboards: Array<LeaderboardEntry>;
  limitations: Array<Limitation>;
  location?: Maybe<LocationDetails>;
  locationEquipment: Array<LocationEquipment>;
  marketplaceListings: MarketplaceListingsResult;
  marketplaceStats: MarketplaceStats;
  marketplaceWatchlist: Array<MarketplaceWatchlistItem>;
  martialArtsDiscipline?: Maybe<MartialArtsDiscipline>;
  martialArtsDisciplineLeaderboard: Array<DisciplineLeaderboardEntry>;
  martialArtsDisciplineProgress: Array<MartialArtsTechnique>;
  martialArtsDisciplines: Array<MartialArtsDiscipline>;
  martialArtsPracticeHistory: TechniquePracticeHistory;
  martialArtsProgress?: Maybe<MartialArtsSummary>;
  martialArtsTechnique?: Maybe<MartialArtsTechnique>;
  martialArtsTechniques: Array<MartialArtsTechnique>;
  mascot?: Maybe<MascotState>;
  mascotAppearance?: Maybe<MascotAppearance>;
  mascotAssistState?: Maybe<MascotAssistState>;
  mascotCreditAlerts: Array<MascotCreditAlert>;
  mascotCreditLoanOffer: MascotCreditLoanOffer;
  mascotCrewSuggestions: Array<MascotCrewSuggestion>;
  mascotExerciseAlternatives: Array<MascotExerciseAlternative>;
  mascotGeneratedPrograms: Array<MascotGeneratedProgram>;
  mascotHighfivePrefs?: Maybe<MascotHighfivePrefs>;
  mascotMasterAbilities: Array<MascotMasterAbility>;
  mascotMilestoneProgress: Array<MascotMilestoneProgress>;
  mascotNegotiatedRate?: Maybe<MascotNegotiatedRate>;
  mascotOvertrainingAlerts: Array<MascotOvertrainingAlert>;
  mascotPendingReactions: Array<MascotReaction>;
  mascotPendingSocialActions: Array<MascotSocialAction>;
  mascotPowers?: Maybe<MascotPowers>;
  mascotRivalryAlerts: Array<MascotRivalryAlert>;
  mascotShop: Array<MascotShopItem>;
  mascotTimeline: Array<MascotTimelineItem>;
  mascotVolumeStats: Array<MascotVolumeStats>;
  mascotWardrobe?: Maybe<MascotWardrobe>;
  mascotWorkoutSuggestions: Array<MascotWorkoutSuggestion>;
  me?: Maybe<User>;
  mealPlan?: Maybe<MealPlan>;
  mealPlans: Array<MealPlan>;
  mealsByDate: Array<MealLog>;
  /** Get pending message requests */
  messageRequests: Array<MessageRequest>;
  messageTemplates: Array<MessageTemplate>;
  messagingPrivacy?: Maybe<MessagingPrivacy>;
  milestones: Array<Milestone>;
  monthlyTrends: Array<MonthlyStats>;
  muscles: Array<Muscle>;
  myAchievementSummary: AchievementSummary;
  myAchievements: AchievementResult;
  myArchetypePTTest?: Maybe<PtTest>;
  myArchetypePTTests: Array<PtTest>;
  myAvatars: Array<Avatar>;
  /** Get your active buddy pairs */
  myBuddies: Array<WorkoutBuddyPair>;
  myCapabilities?: Maybe<Capabilities>;
  myCareerGoals: Array<CareerGoal>;
  myCareerReadiness?: Maybe<CareerReadiness>;
  myClassEnrollments: EnrollmentsResult;
  myCompetitionEntries: Array<CompetitionEntry>;
  /** Get my content preferences and age verification status */
  myContentPreferences?: Maybe<ContentPreferences>;
  myContributorStats?: Maybe<ContributorStats>;
  myCrew?: Maybe<MyCrewResult>;
  /** Get all my registered devices */
  myDevices: Array<DeviceInfo>;
  myEnrollments: Array<ProgramEnrollment>;
  myEntitlements?: Maybe<Entitlements>;
  myFullProfile?: Maybe<FullProfile>;
  myHangouts: Array<Hangout>;
  myIssues: Array<Issue>;
  /** Get my encryption key bundle */
  myKeyBundle?: Maybe<KeyBundle>;
  myLeaderboardPosition?: Maybe<LeaderboardPosition>;
  /** Get my messaging privacy settings */
  myMessagingPrivacy?: Maybe<MessagingPrivacy>;
  myMuscleActivations: Array<UserMuscleActivation>;
  myMuscleStats?: Maybe<MuscleStats>;
  myPersonalRecords: Array<PersonalRecord>;
  myPrograms: Array<TrainingProgram>;
  mySettings?: Maybe<UserSettings>;
  myStats?: Maybe<CharacterStats>;
  myStatsWithRankings?: Maybe<StatsWithRankings>;
  myThemes: Array<Theme>;
  myTrainerClasses: TrainerClassesResult;
  myTrainerProfile?: Maybe<TrainerProfile>;
  /** Get my trust score */
  myTrustScore?: Maybe<TrustScore>;
  /** Get current user's records at venues */
  myVenueRecords: VenueRecordConnection;
  myVenueSubmissions: Array<VenueSubmission>;
  myVerifications: VerificationsResult;
  myWalletInfo?: Maybe<WalletInfo>;
  myWitnessRequests: VerificationsResult;
  myWorkoutStats?: Maybe<WorkoutStats>;
  myWorkoutTemplates: WorkoutTemplatesResult;
  myWorkouts: Array<Workout>;
  mysteryBox?: Maybe<MysteryBoxDetails>;
  mysteryBoxHistory: Array<MysteryBoxOpening>;
  mysteryBoxPity: Array<PityCounter>;
  mysteryBoxes: Array<MysteryBox>;
  nearbyHangouts: Array<Hangout>;
  nearbyLocations: Array<Location>;
  /** Get nearby venue activity summaries */
  nearbyVenueActivity: Array<VenueActivitySummary>;
  nearestOutdoorVenues: Array<OutdoorVenue>;
  nutritionDashboard?: Maybe<NutritionDashboard>;
  nutritionGoals?: Maybe<NutritionGoals>;
  nutritionHistory: Array<NutritionHistoryEntry>;
  nutritionPreferences?: Maybe<NutritionPreferences>;
  officialPrograms: Array<TrainingProgram>;
  onboardingProfile?: Maybe<OnboardingProfile>;
  onboardingStatus?: Maybe<OnboardingStatus>;
  outdoorEquipmentTypes: Array<OutdoorEquipmentType>;
  outdoorVenue?: Maybe<OutdoorVenue>;
  outdoorVenueBySlug?: Maybe<OutdoorVenue>;
  outdoorVenues: VenueConnection;
  ownedSkins: Array<Skin>;
  /** Get pending equipment suggestions for a venue */
  pendingEquipmentSuggestions: Array<EquipmentSuggestion>;
  pendingRivals: Array<RivalWithUser>;
  pendingVenueSubmissions: Array<VenueSubmission>;
  personalizationContext?: Maybe<PersonalizationContext>;
  personalizationPlan?: Maybe<PersonalPlan>;
  personalizationRecommendations: Array<Recommendation>;
  personalizationSummary?: Maybe<PersonalizationSummary>;
  pinnedMessages: Array<PinnedMessage>;
  popularRecipes: Array<Recipe>;
  /** Get potential buddy matches based on compatibility */
  potentialBuddyMatches: Array<BuddyMatch>;
  prescription?: Maybe<Prescription>;
  privacy?: Maybe<PrivacySettings>;
  privacySummary?: Maybe<PrivacySummary>;
  profile?: Maybe<Profile>;
  progressPhoto?: Maybe<ProgressPhoto>;
  progressPhotoComparison: ProgressPhotoComparison;
  progressPhotoStats: ProgressPhotoStats;
  progressPhotoTimeline: ProgressPhotoTimeline;
  progressPhotos: ProgressPhotosResult;
  progressVelocity?: Maybe<ProgressTrends>;
  progressionAchievements: Array<ProgressionAchievement>;
  progressionExerciseRecommendation?: Maybe<ProgressionRecommendation>;
  progressionExerciseRecords: Array<ProgressionRecord>;
  progressionExerciseStats?: Maybe<ProgressionExerciseStats>;
  progressionLeaderboard: Array<ProgressionLeaderboardEntry>;
  progressionMastery: Array<ProgressionMastery>;
  progressionNutrition: ProgressionNutrition;
  progressionRecommendations: Array<ProgressionRecommendation>;
  progressionRecords: Array<ProgressionRecord>;
  progressionTargets: Array<ProgressionTarget>;
  projectedMilestones: Array<ProjectedMilestone>;
  ptTest?: Maybe<PtTest>;
  ptTestLeaderboard: Array<PtTestLeaderboardEntry>;
  ptTestResult?: Maybe<PtTestResultDetail>;
  ptTestResults: Array<PtTestResult>;
  ptTests: Array<PtTest>;
  ptTestsByInstitution: PtTestsByInstitution;
  publicCommunityStats?: Maybe<PublicCommunityStats>;
  recipe?: Maybe<Recipe>;
  recipes: Array<Recipe>;
  recoverableSessions: Array<RecoverableSession>;
  recoveryHistory: RecoveryHistory;
  recoveryRecommendations: Array<RecoveryRecommendation>;
  recoveryScore?: Maybe<RecoveryScore>;
  recoveryStatus: RecoveryStatus;
  /** Get regional activity summary across multiple venues */
  regionalActivitySummary: RegionalActivitySummary;
  rival?: Maybe<RivalWithUser>;
  rivalStats: RivalStats;
  rivals: RivalsResult;
  roadmap: Array<RoadmapItem>;
  rpeFatigue: FatigueAnalysis;
  rpeScale: RpeScale;
  rpeSnapshots: Array<RpeSnapshot>;
  rpeTarget: RpeTarget;
  rpeTrends: RpeTrends;
  rpeWeeklyTrends: RpeWeeklyTrends;
  savedWorkoutTemplates: WorkoutTemplatesResult;
  scheduledMessages: Array<ScheduledMessage>;
  searchCrews: Array<Crew>;
  searchLocations: Array<Location>;
  searchMessages: SearchMessagesResponse;
  searchPotentialRivals: Array<PotentialRival>;
  searchUsers: Array<SearchUserResult>;
  skillSummary?: Maybe<SkillSummary>;
  skillTree?: Maybe<SkillTree>;
  skillTreeProgress: Array<SkillNode>;
  skillTrees: Array<SkillTree>;
  skins: Array<Skin>;
  sleepGoal?: Maybe<SleepGoal>;
  sleepHistory: SleepHistoryResult;
  sleepLog?: Maybe<SleepLog>;
  sleepStats: SleepStats;
  stalledJourneys: Array<StalledJourney>;
  statLeaderboard: StatLeaderboardResult;
  statsHistory: Array<StatsHistoryEntry>;
  statsInfo?: Maybe<StatsInfo>;
  /** Suggested users to follow (alternative query name for compatibility) */
  suggestedFollows: Array<SuggestedUser>;
  /** Suggested users to follow based on similar interests */
  suggestedUsers: Array<SuggestedUser>;
  tips: Array<Tip>;
  todaysWorkout?: Maybe<TodaysWorkoutResult>;
  trade?: Maybe<Trade>;
  tradesHistory: Array<TradeHistory>;
  tradesIncoming: Array<Trade>;
  tradesOutgoing: Array<Trade>;
  trainer?: Maybe<TrainerProfile>;
  trainerClass?: Maybe<TrainerClass>;
  trainerClasses: TrainerClassesResult;
  trainers: TrainersResult;
  trainingProgram?: Maybe<TrainingProgram>;
  trainingPrograms: Array<TrainingProgram>;
  transactionHistory: TransactionHistoryResult;
  typingUsers: Array<TypingUser>;
  unlockableSkins: Array<Skin>;
  updates: Array<Update>;
  /** Get another user's public key bundle for E2EE */
  userKeyBundle?: Maybe<PublicKeyBundle>;
  userPresence: Array<UserPresence>;
  userStats?: Maybe<CharacterStats>;
  /** Get daily activity for a venue */
  venueActivityDaily?: Maybe<VenueActivityDaily>;
  /** Get activity summary for a venue over a date range */
  venueActivitySummary: VenueActivitySummary;
  /** Get leaderboard for a venue/exercise/record type */
  venueLeaderboard: VenueLeaderboard;
  venueMapClusters: Array<VenueCluster>;
  venueMapGeoJSON: VenueGeoJsonCollection;
  venuePhotos: Array<VenuePhoto>;
  /** Get records at a specific venue */
  venueRecords: VenueRecordConnection;
  venueSyncStats?: Maybe<VenueSyncStats>;
  venuesByBorough: VenueConnection;
  /** Find outdoor venues that have equipment for a specific exercise */
  venuesForExercise: VenuesForExerciseResult;
  verification?: Maybe<AchievementVerification>;
  wearableConnections: Array<WearableConnection>;
  wearablesStatus: WearablesStatus;
  wearablesSummary?: Maybe<WearablesSummary>;
  weeklySleepStats: Array<WeeklySleepStats>;
  workout?: Maybe<Workout>;
  workoutMuscleBreakdown: Array<MuscleActivationSummary>;
  workoutSession?: Maybe<WorkoutSession>;
  workoutTemplate?: Maybe<WorkoutTemplate>;
  workoutTemplates: WorkoutTemplatesResult;
  yearInReview: YearInReview;
  yearlyStats?: Maybe<YearlyStats>;
  yearsList: Array<Scalars['Int']['output']>;
};


export type QueryAchievementDefinitionsArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
};


export type QueryActiveEnrollmentArgs = {
  programId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryActivityCommentsArgs = {
  activityId: Scalars['ID']['input'];
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryActivityFeedArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ActivityFeedFilter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryActivityItemArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAdminIssuesArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAllTimeTuLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryArchetypeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryArchetypeNutritionProfileArgs = {
  archetypeId: Scalars['ID']['input'];
};


export type QueryArchetypesByCategoryArgs = {
  categoryId: Scalars['ID']['input'];
};


export type QueryBlockStatusArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryBodyMeasurementArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBodyMeasurementComparisonArgs = {
  days?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryBodyMeasurementHistoryArgs = {
  days?: InputMaybe<Scalars['Int']['input']>;
  field: Scalars['String']['input'];
};


export type QueryBodyMeasurementsArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryBonusEventHistoryArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryBonusEventTypesArgs = {
  enabledOnly?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryBuddyCheckInsArgs = {
  buddyPairId: Scalars['ID']['input'];
  date?: InputMaybe<Scalars['String']['input']>;
};


export type QueryBuddyEvolutionPathArgs = {
  species: Scalars['String']['input'];
};


export type QueryBuddyInventoryArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
};


export type QueryBuddyLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  species?: InputMaybe<Scalars['String']['input']>;
};


export type QueryBuddyMessagesArgs = {
  buddyPairId: Scalars['ID']['input'];
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryBuddySuggestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCanMessageUserArgs = {
  targetUserId: Scalars['ID']['input'];
};


export type QueryCanUpgradeToE2EeArgs = {
  conversationId: Scalars['ID']['input'];
};


export type QueryCareerExerciseRecommendationsArgs = {
  goalId: Scalars['ID']['input'];
};


export type QueryCareerStandardArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCareerStandardsArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
};


export type QueryClassAttendanceArgs = {
  classId: Scalars['ID']['input'];
};


export type QueryClassEnrollmentsArgs = {
  classId: Scalars['ID']['input'];
};


export type QueryCollectionItemsArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  rarity?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCollectionSetDetailArgs = {
  setId: Scalars['ID']['input'];
};


export type QueryCollectionShowcaseArgs = {
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryCommunityFeedArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCompetitionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCompetitionsArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryContributorLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryConversationMessagesArgs = {
  before?: InputMaybe<Scalars['ID']['input']>;
  conversationId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryConversationsArgs = {
  tab?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCreditEarnEventsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  unreadOnly?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryCrewArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCrewAchievementsArgs = {
  crewId: Scalars['ID']['input'];
};


export type QueryCrewChallengeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCrewChallengesArgs = {
  crewId?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCrewChatMessagesArgs = {
  crewId: Scalars['ID']['input'];
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCrewLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCrewUnreadCountArgs = {
  crewId: Scalars['ID']['input'];
};


export type QueryEconomyHistoryArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryEconomyTransactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryEncryptedFileMetadataArgs = {
  fileId: Scalars['ID']['input'];
};


export type QueryEncryptedMessagesArgs = {
  conversationId: Scalars['ID']['input'];
  cursor?: InputMaybe<MessageCursorInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryEnrollmentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEquipmentByCategoryArgs = {
  category: Scalars['String']['input'];
};


export type QueryEquipmentConsensusArgs = {
  equipmentItemId: Scalars['ID']['input'];
};


export type QueryExerciseArgs = {
  id: Scalars['ID']['input'];
};


export type QueryExerciseHistoryArgs = {
  exerciseIds: Array<Scalars['ID']['input']>;
};


export type QueryExerciseSubstitutionsArgs = {
  exerciseId: Scalars['ID']['input'];
};


export type QueryExercisesArgs = {
  equipment?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  muscleGroup?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryExercisesAtVenueArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  muscleGroup?: InputMaybe<Scalars['String']['input']>;
  venueId: Scalars['ID']['input'];
};


export type QueryFeaturedProgramsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryFeaturedWorkoutTemplatesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryFollowersArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryFollowingArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryFoodByBarcodeArgs = {
  barcode: Scalars['String']['input'];
};


export type QueryFoodSearchArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
  source?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGlobalVenueRecordsArgs = {
  exerciseId?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  recordType?: InputMaybe<RecordType>;
};


export type QueryGoalArgs = {
  id: Scalars['ID']['input'];
};


export type QueryHangoutArgs = {
  id: Scalars['ID']['input'];
};


export type QueryHydrationByDateArgs = {
  date: Scalars['String']['input'];
};


export type QueryIsFollowingArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryIssueArgs = {
  id: Scalars['ID']['input'];
};


export type QueryIssuesArgs = {
  labelSlug?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryJourneyHealthArgs = {
  journeyId: Scalars['ID']['input'];
};


export type QueryJourneyHealthAlertsArgs = {
  journeyId?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryJourneyHealthHistoryArgs = {
  days?: InputMaybe<Scalars['Int']['input']>;
  journeyId: Scalars['ID']['input'];
};


export type QueryJourneyRecommendationsArgs = {
  journeyId: Scalars['ID']['input'];
};


export type QueryLeaderboardsArgs = {
  type?: InputMaybe<Scalars['String']['input']>;
};


export type QueryLimitationsArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryLocationArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLocationEquipmentArgs = {
  locationId: Scalars['ID']['input'];
};


export type QueryMarketplaceListingsArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  listingType?: InputMaybe<Scalars['String']['input']>;
  maxPrice?: InputMaybe<Scalars['Int']['input']>;
  minPrice?: InputMaybe<Scalars['Int']['input']>;
  rarity?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMartialArtsDisciplineArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMartialArtsDisciplineLeaderboardArgs = {
  disciplineId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMartialArtsDisciplineProgressArgs = {
  disciplineId: Scalars['ID']['input'];
};


export type QueryMartialArtsDisciplinesArgs = {
  militaryOnly?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryMartialArtsPracticeHistoryArgs = {
  disciplineId?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMartialArtsTechniqueArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMartialArtsTechniquesArgs = {
  disciplineId: Scalars['ID']['input'];
};


export type QueryMascotCrewSuggestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMascotExerciseAlternativesArgs = {
  exerciseId: Scalars['ID']['input'];
};


export type QueryMascotGeneratedProgramsArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMascotPendingReactionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMascotRivalryAlertsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMascotTimelineArgs = {
  importance?: InputMaybe<Array<Scalars['String']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMascotVolumeStatsArgs = {
  weeks?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMascotWorkoutSuggestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMealPlanArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMealPlansArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMealsByDateArgs = {
  date: Scalars['String']['input'];
};


export type QueryMessageRequestsArgs = {
  status?: InputMaybe<MessageRequestStatus>;
};


export type QueryMonthlyTrendsArgs = {
  months?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyAchievementsArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyCareerReadinessArgs = {
  goalId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMyClassEnrollmentsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMyEnrollmentsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMyPersonalRecordsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  recordType?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMyProgramsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyTrainerClassesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMyVenueRecordsArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  venueId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMyVenueSubmissionsArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMyVerificationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMyWitnessRequestsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMyWorkoutTemplatesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyWorkoutsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMysteryBoxArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMysteryBoxHistoryArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryNearbyHangoutsArgs = {
  lat: Scalars['Float']['input'];
  lng: Scalars['Float']['input'];
  radius?: InputMaybe<Scalars['Float']['input']>;
};


export type QueryNearbyLocationsArgs = {
  lat: Scalars['Float']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  lng: Scalars['Float']['input'];
  type?: InputMaybe<Scalars['String']['input']>;
};


export type QueryNearbyVenueActivityArgs = {
  latitude: Scalars['Float']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  longitude: Scalars['Float']['input'];
  radiusMeters?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryNearestOutdoorVenuesArgs = {
  input: NearestVenuesInput;
};


export type QueryNutritionHistoryArgs = {
  days?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryOutdoorVenueArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOutdoorVenueBySlugArgs = {
  slug: Scalars['String']['input'];
};


export type QueryOutdoorVenuesArgs = {
  input?: InputMaybe<VenueSearchInput>;
};


export type QueryPendingEquipmentSuggestionsArgs = {
  venueId: Scalars['ID']['input'];
};


export type QueryPendingVenueSubmissionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPinnedMessagesArgs = {
  conversationId: Scalars['ID']['input'];
};


export type QueryPopularRecipesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPotentialBuddyMatchesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPrescriptionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProgressPhotoArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProgressPhotoComparisonArgs = {
  photoType?: InputMaybe<Scalars['String']['input']>;
  pose?: InputMaybe<Scalars['String']['input']>;
};


export type QueryProgressPhotoTimelineArgs = {
  days?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryProgressPhotosArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  photoType?: InputMaybe<Scalars['String']['input']>;
};


export type QueryProgressionExerciseRecommendationArgs = {
  exerciseId: Scalars['ID']['input'];
};


export type QueryProgressionExerciseRecordsArgs = {
  exerciseId: Scalars['ID']['input'];
};


export type QueryProgressionExerciseStatsArgs = {
  exerciseId: Scalars['ID']['input'];
};


export type QueryProgressionLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryProgressionRecommendationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryProgressionRecordsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  recordType?: InputMaybe<Scalars['String']['input']>;
};


export type QueryProgressionTargetsArgs = {
  exerciseId?: InputMaybe<Scalars['ID']['input']>;
  includeCompleted?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryPtTestArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPtTestLeaderboardArgs = {
  testId: Scalars['ID']['input'];
};


export type QueryPtTestResultArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPtTestResultsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  testId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryRecipeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRecipesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type QueryRecoverableSessionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRecoveryHistoryArgs = {
  days?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRecoveryScoreArgs = {
  forceRecalculate?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryRegionalActivitySummaryArgs = {
  input: RegionalActivityInput;
};


export type QueryRivalArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRivalsArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryRpeSnapshotsArgs = {
  days?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRpeTargetArgs = {
  exerciseId: Scalars['ID']['input'];
};


export type QueryRpeTrendsArgs = {
  days?: InputMaybe<Scalars['Int']['input']>;
  exerciseId: Scalars['ID']['input'];
};


export type QueryRpeWeeklyTrendsArgs = {
  exerciseId: Scalars['ID']['input'];
  weeks?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySavedWorkoutTemplatesArgs = {
  folder?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySearchCrewsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QuerySearchLocationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
  type?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySearchMessagesArgs = {
  conversationId?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QuerySearchPotentialRivalsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QuerySearchUsersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QuerySkillTreeArgs = {
  treeId: Scalars['ID']['input'];
};


export type QuerySkillTreeProgressArgs = {
  treeId: Scalars['ID']['input'];
};


export type QuerySleepHistoryArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QuerySleepLogArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySleepStatsArgs = {
  period?: InputMaybe<Scalars['String']['input']>;
};


export type QueryStalledJourneysArgs = {
  thresholdDays?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryStatLeaderboardArgs = {
  afterRank?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  scope?: InputMaybe<Scalars['String']['input']>;
  scopeValue?: InputMaybe<Scalars['String']['input']>;
  stat?: InputMaybe<Scalars['String']['input']>;
};


export type QueryStatsHistoryArgs = {
  days?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySuggestedFollowsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySuggestedUsersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTipsArgs = {
  context?: InputMaybe<Scalars['String']['input']>;
  exerciseId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryTodaysWorkoutArgs = {
  programId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryTradeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTradesHistoryArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTrainerArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryTrainerClassArgs = {
  classId: Scalars['ID']['input'];
};


export type QueryTrainerClassesArgs = {
  input?: InputMaybe<TrainerClassesInput>;
};


export type QueryTrainersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  specialty?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  verified?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryTrainingProgramArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTrainingProgramsArgs = {
  input?: InputMaybe<ProgramSearchInput>;
};


export type QueryTransactionHistoryArgs = {
  input?: InputMaybe<TransactionHistoryInput>;
};


export type QueryTypingUsersArgs = {
  conversationId: Scalars['ID']['input'];
};


export type QueryUpdatesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryUserKeyBundleArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryUserPresenceArgs = {
  userIds: Array<Scalars['ID']['input']>;
};


export type QueryUserStatsArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryVenueActivityDailyArgs = {
  date: Scalars['DateTime']['input'];
  venueId: Scalars['ID']['input'];
};


export type QueryVenueActivitySummaryArgs = {
  endDate: Scalars['DateTime']['input'];
  startDate: Scalars['DateTime']['input'];
  venueId: Scalars['ID']['input'];
};


export type QueryVenueLeaderboardArgs = {
  exerciseId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  recordType: RecordType;
  venueId: Scalars['ID']['input'];
};


export type QueryVenueMapClustersArgs = {
  input: ClusterInput;
};


export type QueryVenueMapGeoJsonArgs = {
  input?: InputMaybe<GeoJsonInput>;
};


export type QueryVenuePhotosArgs = {
  venueId: Scalars['ID']['input'];
};


export type QueryVenueRecordsArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  exerciseId?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  recordType?: InputMaybe<RecordType>;
  venueId: Scalars['ID']['input'];
};


export type QueryVenuesByBoroughArgs = {
  borough: Scalars['String']['input'];
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryVenuesForExerciseArgs = {
  exerciseId: Scalars['ID']['input'];
  latitude?: InputMaybe<Scalars['Float']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  maxDistanceKm?: InputMaybe<Scalars['Float']['input']>;
};


export type QueryVerificationArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWeeklySleepStatsArgs = {
  weeks?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryWorkoutArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWorkoutMuscleBreakdownArgs = {
  sessionId: Scalars['ID']['input'];
};


export type QueryWorkoutSessionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWorkoutTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWorkoutTemplatesArgs = {
  input?: InputMaybe<WorkoutTemplateSearchInput>;
};


export type QueryYearInReviewArgs = {
  year: Scalars['Int']['input'];
};


export type QueryYearlyStatsArgs = {
  year: Scalars['Int']['input'];
};

export type RpeGuideEntry = {
  __typename: 'RPEGuideEntry';
  description: Scalars['String']['output'];
  label: Scalars['String']['output'];
  rir: Scalars['Int']['output'];
  rpe: Scalars['Int']['output'];
};

export type RpeScale = {
  __typename: 'RPEScale';
  guide: Array<RpeGuideEntry>;
  scale: Array<RpeScaleEntry>;
};

export type RpeScaleEntry = {
  __typename: 'RPEScaleEntry';
  description: Scalars['String']['output'];
  intensity: Scalars['String']['output'];
  rir?: Maybe<Scalars['Int']['output']>;
  rpe: Scalars['Float']['output'];
};

export type RpeSnapshot = {
  __typename: 'RPESnapshot';
  avgRir?: Maybe<Scalars['Float']['output']>;
  avgRpe: Scalars['Float']['output'];
  date: Scalars['DateTime']['output'];
  fatigueScore: Scalars['Int']['output'];
  recoveryRecommendation: Scalars['String']['output'];
  totalSets: Scalars['Int']['output'];
};

export type RpeTarget = {
  __typename: 'RPETarget';
  exerciseId: Scalars['ID']['output'];
  rir?: Maybe<Scalars['Int']['output']>;
  rpe?: Maybe<Scalars['Int']['output']>;
};

export type RpeTargetInput = {
  rir?: InputMaybe<Scalars['Int']['input']>;
  rpe?: InputMaybe<Scalars['Int']['input']>;
};

export type RpeTrendEntry = {
  __typename: 'RPETrendEntry';
  avgReps: Scalars['Float']['output'];
  avgRir?: Maybe<Scalars['Float']['output']>;
  avgRpe: Scalars['Float']['output'];
  avgWeight: Scalars['Float']['output'];
  date: Scalars['DateTime']['output'];
  maxWeight: Scalars['Float']['output'];
  setCount: Scalars['Int']['output'];
};

export type RpeTrendSummary = {
  __typename: 'RPETrendSummary';
  avgRpe: Scalars['Float']['output'];
  daysWithData: Scalars['Int']['output'];
  totalSets: Scalars['Int']['output'];
  trend: Scalars['String']['output'];
};

export type RpeTrends = {
  __typename: 'RPETrends';
  exerciseId: Scalars['ID']['output'];
  exerciseName?: Maybe<Scalars['String']['output']>;
  summary: RpeTrendSummary;
  trends: Array<RpeTrendEntry>;
};

export type RpeWeeklyTrendEntry = {
  __typename: 'RPEWeeklyTrendEntry';
  avgRir?: Maybe<Scalars['Float']['output']>;
  avgRpe: Scalars['Float']['output'];
  avgWeight: Scalars['Float']['output'];
  maxRpe: Scalars['Float']['output'];
  minRpe: Scalars['Float']['output'];
  rpeVariance: Scalars['Float']['output'];
  totalSets: Scalars['Int']['output'];
  totalVolume: Scalars['Float']['output'];
  weekStart: Scalars['DateTime']['output'];
};

export type RpeWeeklyTrends = {
  __typename: 'RPEWeeklyTrends';
  exerciseId: Scalars['ID']['output'];
  trends: Array<RpeWeeklyTrendEntry>;
};

export type RarityCount = {
  __typename: 'RarityCount';
  count: Scalars['Int']['output'];
  rarity: Scalars['String']['output'];
};

export type ReactionResult = {
  __typename: 'ReactionResult';
  emoji: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

export type Recipe = {
  __typename: 'Recipe';
  cookTimeMinutes?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['DateTime']['output'];
  creatorId?: Maybe<Scalars['ID']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  ingredients: Array<RecipeIngredient>;
  instructions: Array<Scalars['String']['output']>;
  isPublic: Scalars['Boolean']['output'];
  isSaved?: Maybe<Scalars['Boolean']['output']>;
  name: Scalars['String']['output'];
  prepTimeMinutes?: Maybe<Scalars['Int']['output']>;
  rating?: Maybe<Scalars['Float']['output']>;
  ratingCount: Scalars['Int']['output'];
  servings: Scalars['Int']['output'];
  tags?: Maybe<Array<Scalars['String']['output']>>;
  totalCalories: Scalars['Int']['output'];
  totalCarbsG: Scalars['Float']['output'];
  totalFatG: Scalars['Float']['output'];
  totalProteinG: Scalars['Float']['output'];
};

export type RecipeIngredient = {
  __typename: 'RecipeIngredient';
  amount: Scalars['Float']['output'];
  foodItemId?: Maybe<Scalars['ID']['output']>;
  name: Scalars['String']['output'];
  unit: Scalars['String']['output'];
};

export type RecipeIngredientInput = {
  amount: Scalars['Float']['input'];
  calories?: InputMaybe<Scalars['Int']['input']>;
  carbsG?: InputMaybe<Scalars['Float']['input']>;
  fatG?: InputMaybe<Scalars['Float']['input']>;
  foodItemId?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  proteinG?: InputMaybe<Scalars['Float']['input']>;
  unit: Scalars['String']['input'];
};

export type RecipeInput = {
  cookTimeMinutes?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  ingredients: Array<RecipeIngredientInput>;
  instructions: Array<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  prepTimeMinutes?: InputMaybe<Scalars['Int']['input']>;
  servings: Scalars['Int']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type Recommendation = {
  __typename: 'Recommendation';
  exercise?: Maybe<Exercise>;
  exerciseId?: Maybe<Scalars['ID']['output']>;
  priority: Scalars['Int']['output'];
  reason: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type RecommendationFeedbackInput = {
  feedback?: InputMaybe<Scalars['String']['input']>;
  followed?: InputMaybe<Scalars['Boolean']['input']>;
};

export type RecordPtTestResultResponse = {
  __typename: 'RecordPTTestResultResponse';
  category?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  passed?: Maybe<Scalars['Boolean']['output']>;
  totalScore?: Maybe<Scalars['Int']['output']>;
};

/** Types of records that can be set at venues */
export type RecordType =
  | 'FASTEST_TIME'
  | 'MAX_1RM'
  | 'MAX_DISTANCE'
  | 'MAX_REPS'
  | 'MAX_WEIGHT';

export type RecoverableSession = {
  __typename: 'RecoverableSession';
  archiveReason: Scalars['String']['output'];
  archivedAt: Scalars['DateTime']['output'];
  canRecover: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  musclesWorked: Array<Scalars['String']['output']>;
  setsLogged: Scalars['Int']['output'];
  startedAt: Scalars['DateTime']['output'];
  totalVolume: Scalars['Float']['output'];
};

export type RecoveryFactors = {
  __typename: 'RecoveryFactors';
  consistencyBonus?: Maybe<Scalars['Int']['output']>;
  hrvBonus?: Maybe<Scalars['Int']['output']>;
  hrvDetails?: Maybe<HrvDetails>;
  restDaysScore: Scalars['Int']['output'];
  restDetails?: Maybe<RestDetails>;
  sleepDetails?: Maybe<SleepDetails>;
  sleepDurationScore: Scalars['Int']['output'];
  sleepQualityScore: Scalars['Int']['output'];
  strainPenalty?: Maybe<Scalars['Int']['output']>;
};

/** Individual recovery factors for prescription v3 */
export type RecoveryFactorsV3 = {
  __typename: 'RecoveryFactorsV3';
  muscleReadiness: Scalars['Float']['output'];
  previousWorkoutIntensity: Scalars['Float']['output'];
  sleepQuality: Scalars['Float']['output'];
  stressLevel: Scalars['Float']['output'];
};

export type RecoveryHistory = {
  __typename: 'RecoveryHistory';
  averageScore: Scalars['Int']['output'];
  bestScore: Scalars['Int']['output'];
  daysTracked: Scalars['Int']['output'];
  scores: Array<RecoveryScore>;
  trend: Scalars['String']['output'];
  worstScore: Scalars['Int']['output'];
};

export type RecoveryRecommendation = {
  __typename: 'RecoveryRecommendation';
  acknowledgedAt?: Maybe<Scalars['DateTime']['output']>;
  actionItems: Array<ActionItem>;
  createdAt: Scalars['DateTime']['output'];
  description: Scalars['String']['output'];
  expiresAt: Scalars['DateTime']['output'];
  feedback?: Maybe<Scalars['String']['output']>;
  followed?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  priority: Scalars['Int']['output'];
  recoveryScoreId?: Maybe<Scalars['ID']['output']>;
  relatedExerciseIds: Array<Scalars['ID']['output']>;
  relatedTipIds: Array<Scalars['ID']['output']>;
  title: Scalars['String']['output'];
  type: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export type RecoveryScore = {
  __typename: 'RecoveryScore';
  calculatedAt: Scalars['DateTime']['output'];
  classification: Scalars['String']['output'];
  dataSources: Array<Scalars['String']['output']>;
  expiresAt: Scalars['DateTime']['output'];
  factors: RecoveryFactors;
  id: Scalars['ID']['output'];
  recommendedIntensity: Scalars['String']['output'];
  recommendedWorkoutTypes: Array<Scalars['String']['output']>;
  score: Scalars['Int']['output'];
  trend?: Maybe<Scalars['String']['output']>;
  trendConfidence?: Maybe<Scalars['Float']['output']>;
  userId: Scalars['ID']['output'];
};

/** User recovery score information */
export type RecoveryScoreV3 = {
  __typename: 'RecoveryScoreV3';
  classification: Scalars['String']['output'];
  factors: RecoveryFactorsV3;
  recommendedIntensity: Scalars['Float']['output'];
  score: Scalars['Float']['output'];
};

export type RecoveryStatus = {
  __typename: 'RecoveryStatus';
  currentScore?: Maybe<RecoveryScore>;
  lastSleep?: Maybe<SleepLog>;
  nextWorkoutSuggestion: WorkoutSuggestion;
  recommendations: Array<RecoveryRecommendation>;
  sleepGoal?: Maybe<SleepGoal>;
  sleepStats: SleepStats;
};

/** Input for regional activity summary query */
export type RegionalActivityInput = {
  borough?: InputMaybe<Scalars['String']['input']>;
  endDate: Scalars['DateTime']['input'];
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  radiusMeters?: InputMaybe<Scalars['Int']['input']>;
  startDate: Scalars['DateTime']['input'];
  venueIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Regional activity summary across multiple venues */
export type RegionalActivitySummary = {
  __typename: 'RegionalActivitySummary';
  heatmapData: Array<VenueHeatmapPoint>;
  totalRecordsSet: Scalars['Int']['output'];
  totalWorkouts: Scalars['Int']['output'];
  uniqueUsers: Scalars['Int']['output'];
  venueComparison: Array<VenueComparisonItem>;
  venueCount: Scalars['Int']['output'];
  venues: Array<OutdoorVenue>;
};

export type RegisterInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

/** Input for registering encryption keys */
export type RegisterKeysInput = {
  deviceId: Scalars['String']['input'];
  deviceName?: InputMaybe<Scalars['String']['input']>;
  deviceType?: InputMaybe<Scalars['String']['input']>;
  identityKey: Scalars['String']['input'];
  oneTimePreKeys?: InputMaybe<Array<OneTimePreKeyInput>>;
  signedPreKey: Scalars['String']['input'];
  signedPreKeyId: Scalars['Int']['input'];
  signedPreKeySignature: Scalars['String']['input'];
};

/** Input for reporting encrypted content */
export type ReportEncryptedContentInput = {
  /** Optional: decrypted evidence for severe violations */
  decryptedEvidence?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  fileId?: InputMaybe<Scalars['ID']['input']>;
  messageId?: InputMaybe<Scalars['ID']['input']>;
  reportType: ContentReportType;
};

/** Input for requesting file upload */
export type RequestFileUploadInput = {
  /** Base64 encoded encrypted metadata */
  encryptedMetadata: Scalars['String']['input'];
  fileName: Scalars['String']['input'];
  fileSize: Scalars['Int']['input'];
  mimeType: Scalars['String']['input'];
  nsfwClassification?: InputMaybe<NsfwClassification>;
};

export type RequestPasswordResetResult = {
  __typename: 'RequestPasswordResetResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type ResetPasswordInput = {
  newPassword: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

export type ResetPasswordResult = {
  __typename: 'ResetPasswordResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type RestDetails = {
  __typename: 'RestDetails';
  averageIntensity: Scalars['Float']['output'];
  daysSinceLastWorkout: Scalars['Int']['output'];
  workoutsThisWeek: Scalars['Int']['output'];
};

export type RivalOpponent = {
  __typename: 'RivalOpponent';
  archetype?: Maybe<Scalars['String']['output']>;
  avatar?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  level?: Maybe<Scalars['Int']['output']>;
  username: Scalars['String']['output'];
};

export type RivalStats = {
  __typename: 'RivalStats';
  activeRivals: Scalars['Int']['output'];
  currentStreak: Scalars['Int']['output'];
  longestStreak: Scalars['Int']['output'];
  losses: Scalars['Int']['output'];
  ties: Scalars['Int']['output'];
  totalTUEarned: Scalars['Float']['output'];
  wins: Scalars['Int']['output'];
};

export type RivalWithUser = {
  __typename: 'RivalWithUser';
  challengedId: Scalars['ID']['output'];
  challengedTU: Scalars['Float']['output'];
  challengerId: Scalars['ID']['output'];
  challengerTU: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  endedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isChallenger: Scalars['Boolean']['output'];
  isWinning: Scalars['Boolean']['output'];
  myLastWorkout?: Maybe<Scalars['DateTime']['output']>;
  myTU: Scalars['Float']['output'];
  opponent: RivalOpponent;
  opponentLastWorkout?: Maybe<Scalars['DateTime']['output']>;
  opponentTU: Scalars['Float']['output'];
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  status: Scalars['String']['output'];
  tuDifference: Scalars['Float']['output'];
};

/** Rivalry status */
export type RivalryStatus =
  | 'active'
  | 'cancelled'
  | 'completed'
  | 'declined'
  | 'pending';

export type RivalsResult = {
  __typename: 'RivalsResult';
  rivals: Array<RivalWithUser>;
  stats: RivalStats;
};

export type RoadmapInput = {
  description: Scalars['String']['input'];
  quarter?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type RoadmapItem = {
  __typename: 'RoadmapItem';
  category?: Maybe<Scalars['String']['output']>;
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description: Scalars['String']['output'];
  hasVoted: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  priority?: Maybe<Scalars['Int']['output']>;
  progress?: Maybe<Scalars['Int']['output']>;
  quarter?: Maybe<Scalars['String']['output']>;
  relatedIssueIds?: Maybe<Array<Scalars['String']['output']>>;
  status: Scalars['Int']['output'];
  targetDate?: Maybe<Scalars['DateTime']['output']>;
  title: Scalars['String']['output'];
  voteCount: Scalars['Int']['output'];
};

/** Input for rotating signed prekey */
export type RotateSignedPreKeyInput = {
  deviceId: Scalars['String']['input'];
  signedPreKey: Scalars['String']['input'];
  signedPreKeyId: Scalars['Int']['input'];
  signedPreKeySignature: Scalars['String']['input'];
};

export type ScheduledMessage = {
  __typename: 'ScheduledMessage';
  content: Scalars['String']['output'];
  conversationId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  scheduledFor: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

/** Score breakdown showing contribution of each factor */
export type ScoreBreakdown = {
  __typename: 'ScoreBreakdown';
  biomechanicalFit: Scalars['Float']['output'];
  equipmentMatch: Scalars['Float']['output'];
  equipmentOptimization: Scalars['Float']['output'];
  goalEffectiveness: Scalars['Float']['output'];
  injurySafe: Scalars['Float']['output'];
  jointStressAcceptable: Scalars['Float']['output'];
  movementPatternBalance: Scalars['Float']['output'];
  muscleTargetMatch: Scalars['Float']['output'];
  performanceHistory: Scalars['Float']['output'];
  periodizationAlignment: Scalars['Float']['output'];
  progressionOpportunity: Scalars['Float']['output'];
  recoveryAppropriate: Scalars['Float']['output'];
  skillAppropriate: Scalars['Float']['output'];
  timeEfficiency: Scalars['Float']['output'];
  totalScore: Scalars['Float']['output'];
  userPreference: Scalars['Float']['output'];
  varietyOptimization: Scalars['Float']['output'];
};

export type SearchMessageResult = {
  __typename: 'SearchMessageResult';
  content: Scalars['String']['output'];
  conversationId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  highlight?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  senderName: Scalars['String']['output'];
};

export type SearchMessagesResponse = {
  __typename: 'SearchMessagesResponse';
  messages: Array<SearchMessageResult>;
  total: Scalars['Int']['output'];
};

export type SearchUserResult = {
  __typename: 'SearchUserResult';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  canMessage: Scalars['Boolean']['output'];
  displayName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};

/** Input for sending encrypted message */
export type SendEncryptedMessageInput = {
  conversationId: Scalars['ID']['input'];
  /** Base64 encoded encrypted payload */
  encryptedPayload: Scalars['String']['input'];
  fileIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  messageType?: InputMaybe<Scalars['String']['input']>;
  replyToId?: InputMaybe<Scalars['ID']['input']>;
};

export type ServiceStatus = {
  __typename: 'ServiceStatus';
  connected: Scalars['Boolean']['output'];
  latency?: Maybe<Scalars['Float']['output']>;
};

export type SessionPr = {
  __typename: 'SessionPR';
  achievedAt: Scalars['DateTime']['output'];
  exerciseId: Scalars['ID']['output'];
  exerciseName: Scalars['String']['output'];
  improvementPercent?: Maybe<Scalars['Float']['output']>;
  newValue: Scalars['Float']['output'];
  prType: Scalars['String']['output'];
  previousValue?: Maybe<Scalars['Float']['output']>;
};

export type SetItem = {
  __typename: 'SetItem';
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  owned: Scalars['Boolean']['output'];
  rarity: Scalars['String']['output'];
};

export type SetProgress = {
  __typename: 'SetProgress';
  completionPercent: Scalars['Float']['output'];
  ownedCount: Scalars['Int']['output'];
  rewardsClaimed: Array<Scalars['Float']['output']>;
  totalCount: Scalars['Int']['output'];
};

export type SetRewardInfo = {
  __typename: 'SetRewardInfo';
  claimed: Scalars['Boolean']['output'];
  description: Scalars['String']['output'];
  icon?: Maybe<Scalars['String']['output']>;
  threshold: Scalars['Float']['output'];
};

/** Input for sharing an activity */
export type ShareActivityInput = {
  activityType: Scalars['String']['input'];
  data?: InputMaybe<Scalars['JSON']['input']>;
  referenceId?: InputMaybe<Scalars['ID']['input']>;
  referenceType?: InputMaybe<Scalars['String']['input']>;
  visibility?: InputMaybe<Scalars['String']['input']>;
};

export type ShoppingListItem = {
  __typename: 'ShoppingListItem';
  amount: Scalars['Float']['output'];
  category: Scalars['String']['output'];
  checked: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  unit: Scalars['String']['output'];
};

/** Legacy simple messaging privacy (deprecated - use E2EE MessagingPrivacy instead) */
export type SimpleMessagingPrivacy = {
  __typename: 'SimpleMessagingPrivacy';
  messagingEnabled: Scalars['Boolean']['output'];
};

export type SkillAchieveResult = {
  __typename: 'SkillAchieveResult';
  creditsAwarded?: Maybe<Scalars['Int']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  xpAwarded?: Maybe<Scalars['Int']['output']>;
};

export type SkillNode = {
  __typename: 'SkillNode';
  creditReward: Scalars['Int']['output'];
  criteriaDescription?: Maybe<Scalars['String']['output']>;
  criteriaType?: Maybe<Scalars['String']['output']>;
  criteriaValue?: Maybe<Scalars['Int']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  difficulty: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  progress?: Maybe<SkillProgress>;
  tier: Scalars['Int']['output'];
  tips?: Maybe<Array<Scalars['String']['output']>>;
  treeId: Scalars['ID']['output'];
  xpReward: Scalars['Int']['output'];
};

export type SkillPracticeInput = {
  durationMinutes: Scalars['Int']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  skillNodeId: Scalars['ID']['input'];
  valueAchieved?: InputMaybe<Scalars['Int']['input']>;
};

export type SkillPracticeLog = {
  __typename: 'SkillPracticeLog';
  createdAt: Scalars['DateTime']['output'];
  durationMinutes: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  skillNodeId: Scalars['ID']['output'];
  valueAchieved?: Maybe<Scalars['Int']['output']>;
};

export type SkillProgress = {
  __typename: 'SkillProgress';
  achievedAt?: Maybe<Scalars['DateTime']['output']>;
  bestValue?: Maybe<Scalars['Int']['output']>;
  practiceCount: Scalars['Int']['output'];
  practiceMinutes: Scalars['Int']['output'];
  status: Scalars['String']['output'];
};

export type SkillSummary = {
  __typename: 'SkillSummary';
  achievedSkills: Scalars['Int']['output'];
  availableSkills: Scalars['Int']['output'];
  inProgressSkills: Scalars['Int']['output'];
  lockedSkills: Scalars['Int']['output'];
  totalPracticeMinutes: Scalars['Int']['output'];
  totalSkills: Scalars['Int']['output'];
};

export type SkillTree = {
  __typename: 'SkillTree';
  color?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  nodeCount: Scalars['Int']['output'];
  nodes?: Maybe<Array<SkillNode>>;
};

export type Skin = {
  __typename: 'Skin';
  category: Scalars['String']['output'];
  creditsRequired?: Maybe<Scalars['Int']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  price: Scalars['Int']['output'];
  rarity: Scalars['String']['output'];
  unlockRequirement?: Maybe<Scalars['String']['output']>;
};

export type SkinEquipResult = {
  __typename: 'SkinEquipResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type SkinPurchaseResult = {
  __typename: 'SkinPurchaseResult';
  message?: Maybe<Scalars['String']['output']>;
  newBalance?: Maybe<Scalars['Int']['output']>;
  skin?: Maybe<Skin>;
  success: Scalars['Boolean']['output'];
};

export type SleepDetails = {
  __typename: 'SleepDetails';
  hoursSlept: Scalars['Float']['output'];
  qualityRating: Scalars['Int']['output'];
  targetHours: Scalars['Float']['output'];
};

export type SleepEnvironment = {
  __typename: 'SleepEnvironment';
  alcoholConsumed?: Maybe<Scalars['Boolean']['output']>;
  caffeineAfter6pm?: Maybe<Scalars['Boolean']['output']>;
  dark?: Maybe<Scalars['Boolean']['output']>;
  quiet?: Maybe<Scalars['Boolean']['output']>;
  screenBeforeBed?: Maybe<Scalars['Boolean']['output']>;
  temperature?: Maybe<Scalars['String']['output']>;
};

export type SleepEnvironmentInput = {
  alcoholConsumed?: InputMaybe<Scalars['Boolean']['input']>;
  caffeineAfter6pm?: InputMaybe<Scalars['Boolean']['input']>;
  dark?: InputMaybe<Scalars['Boolean']['input']>;
  quiet?: InputMaybe<Scalars['Boolean']['input']>;
  screenBeforeBed?: InputMaybe<Scalars['Boolean']['input']>;
  temperature?: InputMaybe<Scalars['String']['input']>;
};

export type SleepGoal = {
  __typename: 'SleepGoal';
  consistencyTarget: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  targetBedTime?: Maybe<Scalars['String']['output']>;
  targetHours: Scalars['Float']['output'];
  targetQuality?: Maybe<Scalars['Int']['output']>;
  targetWakeTime?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
};

export type SleepGoalInput = {
  consistencyTarget?: InputMaybe<Scalars['Int']['input']>;
  targetBedTime?: InputMaybe<Scalars['String']['input']>;
  targetHours: Scalars['Float']['input'];
  targetQuality?: InputMaybe<Scalars['Int']['input']>;
  targetWakeTime?: InputMaybe<Scalars['String']['input']>;
};

export type SleepHistoryResult = {
  __typename: 'SleepHistoryResult';
  hasMore: Scalars['Boolean']['output'];
  logs: Array<SleepLog>;
  nextCursor?: Maybe<Scalars['String']['output']>;
};

export type SleepLog = {
  __typename: 'SleepLog';
  bedTime: Scalars['DateTime']['output'];
  createdAt: Scalars['DateTime']['output'];
  externalId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  loggedAt: Scalars['DateTime']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  quality: Scalars['Int']['output'];
  sleepDurationMinutes: Scalars['Int']['output'];
  sleepEnvironment?: Maybe<SleepEnvironment>;
  source: Scalars['String']['output'];
  timeToFallAsleepMinutes?: Maybe<Scalars['Int']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
  wakeCount?: Maybe<Scalars['Int']['output']>;
  wakeTime: Scalars['DateTime']['output'];
};

export type SleepLogInput = {
  bedTime: Scalars['DateTime']['input'];
  externalId?: InputMaybe<Scalars['String']['input']>;
  loggedAt?: InputMaybe<Scalars['DateTime']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  quality: Scalars['Int']['input'];
  sleepEnvironment?: InputMaybe<SleepEnvironmentInput>;
  source?: InputMaybe<Scalars['String']['input']>;
  timeToFallAsleepMinutes?: InputMaybe<Scalars['Int']['input']>;
  wakeCount?: InputMaybe<Scalars['Int']['input']>;
  wakeTime: Scalars['DateTime']['input'];
};

export type SleepStats = {
  __typename: 'SleepStats';
  avgDurationHours: Scalars['Float']['output'];
  avgDurationMinutes: Scalars['Float']['output'];
  avgQuality: Scalars['Float']['output'];
  consistency: Scalars['Int']['output'];
  maxDurationMinutes: Scalars['Int']['output'];
  minDurationMinutes: Scalars['Int']['output'];
  nightsLogged: Scalars['Int']['output'];
  period: Scalars['String']['output'];
  qualityDistribution: QualityDistribution;
  targetMet: Scalars['Int']['output'];
};

export type StalledJourney = {
  __typename: 'StalledJourney';
  currentProgress: Scalars['Float']['output'];
  daysSinceActivity: Scalars['Int']['output'];
  healthScore: Scalars['Int']['output'];
  journeyName: Scalars['String']['output'];
  riskLevel: JourneyRiskLevel;
  userJourneyId: Scalars['ID']['output'];
};

export type StartWorkoutSessionInput = {
  clientId?: InputMaybe<Scalars['String']['input']>;
  workoutPlan?: InputMaybe<Scalars['JSON']['input']>;
};

export type StatDisplay = {
  __typename: 'StatDisplay';
  display: Scalars['String']['output'];
  value: Scalars['Int']['output'];
};

export type StatLeaderboardEntry = {
  __typename: 'StatLeaderboardEntry';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  gender?: Maybe<Scalars['String']['output']>;
  rank: Scalars['Int']['output'];
  statValue: Scalars['Float']['output'];
  state?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};

export type StatLeaderboardResult = {
  __typename: 'StatLeaderboardResult';
  entries: Array<StatLeaderboardEntry>;
  nextCursor?: Maybe<Scalars['Int']['output']>;
  total: Scalars['Int']['output'];
};

export type StatRanking = {
  __typename: 'StatRanking';
  percentile: Scalars['Float']['output'];
  rank: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type StatRankingsByScope = {
  __typename: 'StatRankingsByScope';
  city?: Maybe<StatRanking>;
  country?: Maybe<StatRanking>;
  global: StatRanking;
  state?: Maybe<StatRanking>;
};

export type StatsHistoryEntry = {
  __typename: 'StatsHistoryEntry';
  date: Scalars['DateTime']['output'];
  stats: CharacterStats;
  workoutCount: Scalars['Int']['output'];
};

export type StatsInfo = {
  __typename: 'StatsInfo';
  levelThresholds: Array<Scalars['Int']['output']>;
  statDescriptions: Scalars['JSON']['output'];
  xpRates: Scalars['JSON']['output'];
};

export type StatsWithRankings = {
  __typename: 'StatsWithRankings';
  rankings: Scalars['JSON']['output'];
  stats: CharacterStats;
};

/** Generic status for most entities */
export type Status =
  | 'active'
  | 'archived'
  | 'cancelled'
  | 'completed'
  | 'deleted'
  | 'inactive'
  | 'pending';

/** Submission status (venues, content) */
export type SubmissionStatus =
  | 'approved'
  | 'pending'
  | 'rejected';

export type Subscription = {
  __typename: 'Subscription';
  communityActivity: ActivityEvent;
  communityStatsUpdated: PublicCommunityStats;
  conversationUpdated: Conversation;
  /** Subscribe to E2EE key events (new device, rotation) */
  e2eeKeyEvent: E2EeKeyEvent;
  /** Subscribe to encrypted messages in a conversation */
  encryptedMessageReceived: EncryptedMessage;
  messageReceived: Message;
};


export type SubscriptionE2eeKeyEventArgs = {
  userId: Scalars['ID']['input'];
};


export type SubscriptionEncryptedMessageReceivedArgs = {
  conversationId: Scalars['ID']['input'];
};


export type SubscriptionMessageReceivedArgs = {
  conversationId?: InputMaybe<Scalars['ID']['input']>;
};

/** Suggested user to follow */
export type SuggestedUser = {
  __typename: 'SuggestedUser';
  commonInterests: Array<Scalars['String']['output']>;
  mutualFollowers: Scalars['Int']['output'];
  reason: Scalars['String']['output'];
  user: UserSummary;
};

export type SuggestionVoteInfo = {
  __typename: 'SuggestionVoteInfo';
  id: Scalars['ID']['output'];
  rejectCount: Scalars['Int']['output'];
  status: Scalars['String']['output'];
  supportCount: Scalars['Int']['output'];
};

/** Result of voting on a suggestion */
export type SuggestionVoteResult = {
  __typename: 'SuggestionVoteResult';
  creditsEarned: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
  suggestion?: Maybe<SuggestionVoteInfo>;
};

export type SuperHighFiveInput = {
  message?: InputMaybe<Scalars['String']['input']>;
  recipientId: Scalars['ID']['input'];
  targetId?: InputMaybe<Scalars['ID']['input']>;
  targetType?: InputMaybe<Scalars['String']['input']>;
  type: Scalars['String']['input'];
};

export type SuperHighFiveResult = {
  __typename: 'SuperHighFiveResult';
  animationUrl?: Maybe<Scalars['String']['output']>;
  cost: Scalars['Int']['output'];
  error?: Maybe<Scalars['String']['output']>;
  newBalance: Scalars['Int']['output'];
  recipientUsername?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  transactionId?: Maybe<Scalars['ID']['output']>;
  type: Scalars['String']['output'];
};

/** Superset pairing information */
export type SupersetPair = {
  __typename: 'SupersetPair';
  exercise1Index: Scalars['Int']['output'];
  exercise2Index: Scalars['Int']['output'];
  pairingType: Scalars['String']['output'];
  restBetween: Scalars['Int']['output'];
};

export type TechniqueMasterResult = {
  __typename: 'TechniqueMasterResult';
  creditsAwarded?: Maybe<Scalars['Int']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  xpAwarded?: Maybe<Scalars['Int']['output']>;
};

export type TechniquePracticeHistory = {
  __typename: 'TechniquePracticeHistory';
  logs: Array<TechniquePracticeLog>;
  total: Scalars['Int']['output'];
};

export type TechniquePracticeInput = {
  durationMinutes: Scalars['Int']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  partnerDrill?: InputMaybe<Scalars['Boolean']['input']>;
  repsPerformed?: InputMaybe<Scalars['Int']['input']>;
  roundsPerformed?: InputMaybe<Scalars['Int']['input']>;
  techniqueId: Scalars['ID']['input'];
};

export type TechniquePracticeLog = {
  __typename: 'TechniquePracticeLog';
  createdAt: Scalars['DateTime']['output'];
  disciplineName?: Maybe<Scalars['String']['output']>;
  durationMinutes: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  partnerDrill: Scalars['Boolean']['output'];
  practiceDate: Scalars['DateTime']['output'];
  repsPerformed?: Maybe<Scalars['Int']['output']>;
  roundsPerformed?: Maybe<Scalars['Int']['output']>;
  techniqueId: Scalars['ID']['output'];
  techniqueName?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
};

export type TemplateExercise = {
  __typename: 'TemplateExercise';
  duration?: Maybe<Scalars['Int']['output']>;
  exerciseId: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  reps?: Maybe<Scalars['Int']['output']>;
  restSeconds?: Maybe<Scalars['Int']['output']>;
  sets: Scalars['Int']['output'];
  weight?: Maybe<Scalars['Float']['output']>;
};

export type TemplateExerciseInput = {
  duration?: InputMaybe<Scalars['Int']['input']>;
  exerciseId: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  reps?: InputMaybe<Scalars['Int']['input']>;
  restSeconds?: InputMaybe<Scalars['Int']['input']>;
  sets: Scalars['Int']['input'];
  weight?: InputMaybe<Scalars['Float']['input']>;
};

export type Theme = {
  __typename: 'Theme';
  colors?: Maybe<Scalars['JSON']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  rarity: Scalars['String']['output'];
  unlockLevel: Scalars['Int']['output'];
};

export type Tip = {
  __typename: 'Tip';
  category?: Maybe<Scalars['String']['output']>;
  content: Scalars['String']['output'];
  exerciseId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  priority: Scalars['Int']['output'];
  seen: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type TipInput = {
  amount: Scalars['Int']['input'];
  isAnonymous?: InputMaybe<Scalars['Boolean']['input']>;
  message?: InputMaybe<Scalars['String']['input']>;
  recipientId: Scalars['ID']['input'];
};

export type TipResult = {
  __typename: 'TipResult';
  amount: Scalars['Int']['output'];
  error?: Maybe<Scalars['String']['output']>;
  newBalance: Scalars['Int']['output'];
  recipientUsername?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  transactionId?: Maybe<Scalars['ID']['output']>;
};

export type TodaysWorkoutResult = {
  __typename: 'TodaysWorkoutResult';
  enrollment: ProgramEnrollment;
  program: TrainingProgram;
  todaysWorkout?: Maybe<ProgramDay>;
};

export type TopExercise = {
  __typename: 'TopExercise';
  count: Scalars['Int']['output'];
  exerciseId: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type TopMuscleGroup = {
  __typename: 'TopMuscleGroup';
  muscleGroup: Scalars['String']['output'];
  volume: Scalars['Float']['output'];
};

export type Trade = {
  __typename: 'Trade';
  createdAt: Scalars['DateTime']['output'];
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  initiatorCredits: Scalars['Int']['output'];
  initiatorId: Scalars['ID']['output'];
  initiatorItems: Array<TradeItem>;
  initiatorUsername: Scalars['String']['output'];
  message?: Maybe<Scalars['String']['output']>;
  receiverCredits: Scalars['Int']['output'];
  receiverId: Scalars['ID']['output'];
  receiverItems: Array<TradeItem>;
  receiverUsername: Scalars['String']['output'];
  status: Scalars['String']['output'];
  valueWarning?: Maybe<Scalars['Boolean']['output']>;
};

export type TradeActionResult = {
  __typename: 'TradeActionResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  trade?: Maybe<Trade>;
};

export type TradeHistory = {
  __typename: 'TradeHistory';
  completedAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  user1Id: Scalars['ID']['output'];
  user1Username: Scalars['String']['output'];
  user2Id: Scalars['ID']['output'];
  user2Username: Scalars['String']['output'];
};

export type TradeItem = {
  __typename: 'TradeItem';
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  previewUrl?: Maybe<Scalars['String']['output']>;
  rarity: Scalars['String']['output'];
};

export type TrainerClass = {
  __typename: 'TrainerClass';
  capacity: Scalars['Int']['output'];
  category: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  creditsPerStudent: Scalars['Int']['output'];
  description?: Maybe<Scalars['String']['output']>;
  difficulty: Scalars['String']['output'];
  durationMinutes: Scalars['Int']['output'];
  enrolledCount: Scalars['Int']['output'];
  hangoutId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  locationDetails?: Maybe<Scalars['String']['output']>;
  locationType: Scalars['String']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  startAt: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
  title: Scalars['String']['output'];
  trainer?: Maybe<TrainerProfile>;
  trainerUserId: Scalars['ID']['output'];
  trainerWagePerStudent: Scalars['Int']['output'];
  virtualHangoutId?: Maybe<Scalars['Int']['output']>;
};

export type TrainerClassesInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  trainerUserId?: InputMaybe<Scalars['ID']['input']>;
  upcoming?: InputMaybe<Scalars['Boolean']['input']>;
};

export type TrainerClassesResult = {
  __typename: 'TrainerClassesResult';
  classes: Array<TrainerClass>;
  total: Scalars['Int']['output'];
};

export type TrainerProfile = {
  __typename: 'TrainerProfile';
  bio?: Maybe<Scalars['String']['output']>;
  certifications: Array<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  displayName: Scalars['String']['output'];
  hourlyRateCredits: Scalars['Int']['output'];
  perClassRateCredits: Scalars['Int']['output'];
  ratingAvg: Scalars['Float']['output'];
  ratingCount: Scalars['Int']['output'];
  specialties: Array<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  totalClassesTaught: Scalars['Int']['output'];
  totalCreditsEarned: Scalars['Int']['output'];
  totalStudentsTrained: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
  verified: Scalars['Boolean']['output'];
  verifiedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type TrainerProfileInput = {
  bio?: InputMaybe<Scalars['String']['input']>;
  certifications?: InputMaybe<Array<Scalars['String']['input']>>;
  displayName: Scalars['String']['input'];
  hourlyRateCredits?: InputMaybe<Scalars['Int']['input']>;
  perClassRateCredits?: InputMaybe<Scalars['Int']['input']>;
  specialties?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** Trainer status */
export type TrainerStatus =
  | 'inactive'
  | 'pending'
  | 'suspended'
  | 'verified';

export type TrainersResult = {
  __typename: 'TrainersResult';
  total: Scalars['Int']['output'];
  trainers: Array<TrainerProfile>;
};

export type TrainingProgram = {
  __typename: 'TrainingProgram';
  activeEnrollments: Scalars['Int']['output'];
  averageRating: Scalars['Float']['output'];
  category?: Maybe<Scalars['String']['output']>;
  completionRate: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  creatorDisplayName?: Maybe<Scalars['String']['output']>;
  creatorId?: Maybe<Scalars['ID']['output']>;
  creatorUsername?: Maybe<Scalars['String']['output']>;
  daysPerWeek: Scalars['Int']['output'];
  description?: Maybe<Scalars['String']['output']>;
  difficulty?: Maybe<Scalars['String']['output']>;
  durationWeeks: Scalars['Int']['output'];
  equipmentRequired: Array<Scalars['String']['output']>;
  goals: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  isEnrolled?: Maybe<Scalars['Boolean']['output']>;
  isFeatured: Scalars['Boolean']['output'];
  isOfficial: Scalars['Boolean']['output'];
  isPublic: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  progressionRules?: Maybe<Scalars['JSON']['output']>;
  ratingCount: Scalars['Int']['output'];
  schedule: Array<ProgramDay>;
  shortDescription?: Maybe<Scalars['String']['output']>;
  targetMuscles: Array<Scalars['String']['output']>;
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  totalEnrollments: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userRating?: Maybe<Scalars['Int']['output']>;
};

export type Transaction = {
  __typename: 'Transaction';
  amount: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  type: Scalars['String']['output'];
};

export type TransactionHistoryInput = {
  action?: InputMaybe<Scalars['String']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
  fromDate?: InputMaybe<Scalars['DateTime']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  toDate?: InputMaybe<Scalars['DateTime']['input']>;
};

export type TransactionHistoryResult = {
  __typename: 'TransactionHistoryResult';
  hasMore: Scalars['Boolean']['output'];
  nextCursor?: Maybe<Scalars['String']['output']>;
  totalCount: Scalars['Int']['output'];
  transactions: Array<Transaction>;
};

/** Transaction type */
export type TransactionType =
  | 'earn'
  | 'purchase'
  | 'refund'
  | 'reward'
  | 'spend'
  | 'transfer';

export type TransferByUsernameInput = {
  amount: Scalars['Int']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  recipientUsername: Scalars['String']['input'];
};

export type TransferInput = {
  amount: Scalars['Int']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  recipientId: Scalars['ID']['input'];
};

export type TransferResult = {
  __typename: 'TransferResult';
  amount: Scalars['Int']['output'];
  error?: Maybe<Scalars['String']['output']>;
  fee: Scalars['Int']['output'];
  newBalance: Scalars['Int']['output'];
  recipientUsername?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  transactionId?: Maybe<Scalars['ID']['output']>;
};

/** Trust levels based on score */
export type TrustLevel =
  | 'excellent'
  | 'fair'
  | 'good'
  | 'poor'
  | 'untrusted';

/** User's trust score for anti-abuse */
export type TrustScore = {
  __typename: 'TrustScore';
  accountAgeScore: Scalars['Int']['output'];
  activityScore: Scalars['Int']['output'];
  lastCalculatedAt: Scalars['DateTime']['output'];
  positiveInteractionsScore: Scalars['Int']['output'];
  reportScore: Scalars['Int']['output'];
  score: Scalars['Int']['output'];
  trustLevel: TrustLevel;
  userId: Scalars['ID']['output'];
  verificationScore: Scalars['Int']['output'];
};

export type TypingUser = {
  __typename: 'TypingUser';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};

export type Update = {
  __typename: 'Update';
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

/** Input for updating content preferences */
export type UpdateContentPreferencesInput = {
  adultContentEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  autoBlurNsfw?: InputMaybe<Scalars['Boolean']['input']>;
  nsfwWarningsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateInput = {
  content: Scalars['String']['input'];
  title: Scalars['String']['input'];
  type: Scalars['String']['input'];
};

/** Input for messaging privacy settings */
export type UpdateMessagingPrivacyInput = {
  allowFileAttachments?: InputMaybe<MessagingPermission>;
  allowMessagesFrom?: InputMaybe<MessagingPermission>;
  allowVoiceMessages?: InputMaybe<MessagingPermission>;
  lastSeenVisible?: InputMaybe<Scalars['Boolean']['input']>;
  onlineStatusVisible?: InputMaybe<Scalars['Boolean']['input']>;
  readReceiptsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  typingIndicatorsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateProgramInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  daysPerWeek?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  difficulty?: InputMaybe<Scalars['String']['input']>;
  durationWeeks?: InputMaybe<Scalars['Int']['input']>;
  equipmentRequired?: InputMaybe<Array<Scalars['String']['input']>>;
  goals?: InputMaybe<Array<Scalars['String']['input']>>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  progressionRules?: InputMaybe<Scalars['JSON']['input']>;
  schedule?: InputMaybe<Array<ProgramDayInput>>;
  shortDescription?: InputMaybe<Scalars['String']['input']>;
  targetMuscles?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateSetInput = {
  durationSeconds?: InputMaybe<Scalars['Int']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  reps?: InputMaybe<Scalars['Int']['input']>;
  rir?: InputMaybe<Scalars['Int']['input']>;
  rpe?: InputMaybe<Scalars['Float']['input']>;
  setId: Scalars['ID']['input'];
  tag?: InputMaybe<Scalars['String']['input']>;
  weightKg?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateSleepLogInput = {
  notes?: InputMaybe<Scalars['String']['input']>;
  quality?: InputMaybe<Scalars['Int']['input']>;
  sleepEnvironment?: InputMaybe<SleepEnvironmentInput>;
  timeToFallAsleepMinutes?: InputMaybe<Scalars['Int']['input']>;
  wakeCount?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateTrainerClassInput = {
  capacity?: InputMaybe<Scalars['Int']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  creditsPerStudent?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  difficulty?: InputMaybe<Scalars['String']['input']>;
  durationMinutes?: InputMaybe<Scalars['Int']['input']>;
  locationDetails?: InputMaybe<Scalars['String']['input']>;
  locationType?: InputMaybe<Scalars['String']['input']>;
  startAt?: InputMaybe<Scalars['DateTime']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  trainerWagePerStudent?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateWorkoutTemplateInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  difficulty?: InputMaybe<Scalars['String']['input']>;
  durationMinutes?: InputMaybe<Scalars['Int']['input']>;
  equipmentRequired?: InputMaybe<Array<Scalars['String']['input']>>;
  exercises?: InputMaybe<Array<TemplateExerciseInput>>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  targetMuscles?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** Input for uploading more one-time prekeys */
export type UploadPreKeysInput = {
  deviceId: Scalars['String']['input'];
  preKeys: Array<OneTimePreKeyInput>;
};

export type User = {
  __typename: 'User';
  archetype?: Maybe<Archetype>;
  avatar?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  displayName?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  level: Scalars['Int']['output'];
  roles: Array<Scalars['String']['output']>;
  socialLinks?: Maybe<Scalars['JSON']['output']>;
  username: Scalars['String']['output'];
  wealthTier?: Maybe<WealthTier>;
  xp: Scalars['Int']['output'];
};

export type UserAchievement = {
  __typename: 'UserAchievement';
  achievementDescription?: Maybe<Scalars['String']['output']>;
  achievementIcon?: Maybe<Scalars['String']['output']>;
  achievementKey: Scalars['String']['output'];
  achievementName: Scalars['String']['output'];
  category: Scalars['String']['output'];
  creditsEarned?: Maybe<Scalars['Int']['output']>;
  earnedAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isVerified?: Maybe<Scalars['Boolean']['output']>;
  points: Scalars['Int']['output'];
  rarity: Scalars['String']['output'];
  witnessUsername?: Maybe<Scalars['String']['output']>;
  xpEarned?: Maybe<Scalars['Int']['output']>;
};

export type UserMuscleActivation = {
  __typename: 'UserMuscleActivation';
  activation: Scalars['Int']['output'];
  muscleId: Scalars['String']['output'];
};

export type UserPresence = {
  __typename: 'UserPresence';
  lastSeen?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export type UserSettings = {
  __typename: 'UserSettings';
  equipment?: Maybe<Array<Scalars['String']['output']>>;
  highContrast: Scalars['Boolean']['output'];
  isPublic: Scalars['Boolean']['output'];
  reducedMotion: Scalars['Boolean']['output'];
  showLocation: Scalars['Boolean']['output'];
  showProgress: Scalars['Boolean']['output'];
  textSize: Scalars['String']['output'];
  theme: Scalars['String']['output'];
};

export type UserSettingsInput = {
  equipment?: InputMaybe<Array<Scalars['String']['input']>>;
  highContrast?: InputMaybe<Scalars['Boolean']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  reducedMotion?: InputMaybe<Scalars['Boolean']['input']>;
  showLocation?: InputMaybe<Scalars['Boolean']['input']>;
  showProgress?: InputMaybe<Scalars['Boolean']['input']>;
  textSize?: InputMaybe<Scalars['String']['input']>;
  theme?: InputMaybe<Scalars['String']['input']>;
};

/** Minimal user info for social features */
export type UserSummary = {
  __typename: 'UserSummary';
  archetypeName?: Maybe<Scalars['String']['output']>;
  avatar?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  level: Scalars['Int']['output'];
  username: Scalars['String']['output'];
};

export type UserTechniqueProgress = {
  __typename: 'UserTechniqueProgress';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  lastPracticed?: Maybe<Scalars['DateTime']['output']>;
  masteredAt?: Maybe<Scalars['DateTime']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  practiceCount: Scalars['Int']['output'];
  proficiency: Scalars['Int']['output'];
  status: Scalars['String']['output'];
  techniqueId: Scalars['ID']['output'];
  totalPracticeMinutes: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
};

/** Contributor to venue activity */
export type VenueActivityContributor = {
  __typename: 'VenueActivityContributor';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  recordsHeld: Scalars['Int']['output'];
  totalVolumeKg: Scalars['Float']['output'];
  totalWorkouts: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};

/** Daily activity aggregate for a venue (for visualizations) */
export type VenueActivityDaily = {
  __typename: 'VenueActivityDaily';
  activityDate: Scalars['DateTime']['output'];
  busiestHour?: Maybe<Scalars['Int']['output']>;
  exercisesBreakdown: Array<ExerciseBreakdownItem>;
  /** Hourly activity counts (24 values, index 0-23) */
  hourlyActivity: Array<Scalars['Int']['output']>;
  muscleActivations: Array<MuscleActivationItem>;
  peakConcurrentUsers: Scalars['Int']['output'];
  publicUsers: Scalars['Int']['output'];
  recordsSet: Scalars['Int']['output'];
  totalReps: Scalars['Int']['output'];
  totalSets: Scalars['Int']['output'];
  totalTu: Scalars['Float']['output'];
  totalUsers: Scalars['Int']['output'];
  totalVolumeKg: Scalars['Float']['output'];
  totalWorkouts: Scalars['Int']['output'];
  venueId: Scalars['ID']['output'];
};

/** Input for venue activity summary query */
export type VenueActivityInput = {
  endDate: Scalars['DateTime']['input'];
  startDate: Scalars['DateTime']['input'];
  venueId: Scalars['ID']['input'];
};

/** Summary of venue activity over a date range */
export type VenueActivitySummary = {
  __typename: 'VenueActivitySummary';
  dailyRecords: Array<DailyDataPoint>;
  dailyUsers: Array<DailyDataPoint>;
  dailyVolume: Array<DailyDataPoint>;
  /** For line charts */
  dailyWorkouts: Array<DailyDataPoint>;
  endDate: Scalars['DateTime']['output'];
  /** For pie charts */
  exerciseDistribution: Array<ExerciseBreakdownItem>;
  /** For bar charts */
  hourlyPattern: Array<HourlyDataPoint>;
  muscleDistribution: Array<MuscleActivationItem>;
  recentRecords: Array<VenueExerciseRecord>;
  startDate: Scalars['DateTime']['output'];
  /** Top public contributors */
  topContributors: Array<VenueActivityContributor>;
  totalRecordsSet: Scalars['Int']['output'];
  totalTu: Scalars['Float']['output'];
  totalVolumeKg: Scalars['Float']['output'];
  totalWorkouts: Scalars['Int']['output'];
  uniqueUsers: Scalars['Int']['output'];
  venue?: Maybe<OutdoorVenue>;
  venueId: Scalars['ID']['output'];
  weekdayPattern: Array<WeekdayDataPoint>;
};

export type VenueBounds = {
  __typename: 'VenueBounds';
  east: Scalars['Float']['output'];
  north: Scalars['Float']['output'];
  south: Scalars['Float']['output'];
  west: Scalars['Float']['output'];
};

/** Map cluster for venue visualization */
export type VenueCluster = {
  __typename: 'VenueCluster';
  count: Scalars['Int']['output'];
  expansion_zoom?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
  venues?: Maybe<Array<OutdoorVenue>>;
};

/** Venue comparison item for charts */
export type VenueComparisonItem = {
  __typename: 'VenueComparisonItem';
  records: Scalars['Int']['output'];
  users: Scalars['Int']['output'];
  venueId: Scalars['ID']['output'];
  venueName: Scalars['String']['output'];
  workouts: Scalars['Int']['output'];
};

/** Connection type for paginated venue results */
export type VenueConnection = {
  __typename: 'VenueConnection';
  edges: Array<VenueEdge>;
  pageInfo: VenuePageInfo;
  totalCount: Scalars['Int']['output'];
};

/** User contribution to venue data */
export type VenueContribution = {
  __typename: 'VenueContribution';
  contributionType: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  creditsEarned: Scalars['Int']['output'];
  data?: Maybe<Scalars['JSON']['output']>;
  id: Scalars['ID']['output'];
  submissionId?: Maybe<Scalars['ID']['output']>;
  user: User;
  userId: Scalars['ID']['output'];
  venueId?: Maybe<Scalars['ID']['output']>;
};

export type VenueEdge = {
  __typename: 'VenueEdge';
  cursor: Scalars['String']['output'];
  node: OutdoorVenue;
};

/** Equipment item at a venue */
export type VenueEquipmentItem = {
  __typename: 'VenueEquipmentItem';
  brand?: Maybe<Scalars['String']['output']>;
  condition?: Maybe<Scalars['String']['output']>;
  equipmentType: OutdoorEquipmentType;
  id: Scalars['ID']['output'];
  installDate?: Maybe<Scalars['DateTime']['output']>;
  isVerified: Scalars['Boolean']['output'];
  lastVerifiedAt?: Maybe<Scalars['DateTime']['output']>;
  model?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  photos: Array<VenuePhoto>;
  quantity: Scalars['Int']['output'];
  venueId: Scalars['ID']['output'];
  verificationCount: Scalars['Int']['output'];
};

/** An exercise record set at a specific venue */
export type VenueExerciseRecord = {
  __typename: 'VenueExerciseRecord';
  achievedAt: Scalars['DateTime']['output'];
  conditions?: Maybe<Scalars['JSON']['output']>;
  exercise?: Maybe<Exercise>;
  exerciseId: Scalars['ID']['output'];
  /** Rank across all venues for this exercise */
  globalRank?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  /** Rank at this specific venue */
  rank: Scalars['Int']['output'];
  recordType: RecordType;
  recordUnit: Scalars['String']['output'];
  recordValue: Scalars['Float']['output'];
  repsAtWeight?: Maybe<Scalars['Int']['output']>;
  /** Whether this user needs to submit verification (top 3) */
  requiresVerification: Scalars['Boolean']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
  venue?: Maybe<OutdoorVenue>;
  venueId: Scalars['ID']['output'];
  verificationStatus: VerificationStatus;
  verifiedAt?: Maybe<Scalars['DateTime']['output']>;
  videoUrl?: Maybe<Scalars['String']['output']>;
  weightAtReps?: Maybe<Scalars['Float']['output']>;
  witnessCount: Scalars['Int']['output'];
};

/** GeoJSON FeatureCollection */
export type VenueGeoJsonCollection = {
  __typename: 'VenueGeoJSONCollection';
  bounds?: Maybe<VenueBounds>;
  features: Array<VenueGeoJsonFeature>;
  totalCount: Scalars['Int']['output'];
  type: Scalars['String']['output'];
};

/** GeoJSON feature for map rendering */
export type VenueGeoJsonFeature = {
  __typename: 'VenueGeoJSONFeature';
  geometry: VenueGeometry;
  properties: VenueGeoJsonProperties;
  type: Scalars['String']['output'];
};

export type VenueGeoJsonProperties = {
  __typename: 'VenueGeoJSONProperties';
  clusterExpansion?: Maybe<Scalars['Boolean']['output']>;
  equipmentCount: Scalars['Int']['output'];
  hasPhotos: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  isVerified: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  pointCount?: Maybe<Scalars['Int']['output']>;
  slug: Scalars['String']['output'];
  venueType: Scalars['String']['output'];
};

export type VenueGeometry = {
  __typename: 'VenueGeometry';
  coordinates: Array<Scalars['Float']['output']>;
  type: Scalars['String']['output'];
};

/** Heatmap data point for geographic visualization */
export type VenueHeatmapPoint = {
  __typename: 'VenueHeatmapPoint';
  /** Activity intensity 0-1 */
  intensity: Scalars['Float']['output'];
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
  venueId: Scalars['ID']['output'];
  workouts: Scalars['Int']['output'];
};

/** Leaderboard for a specific exercise at a venue */
export type VenueLeaderboard = {
  __typename: 'VenueLeaderboard';
  entries: Array<VenueLeaderboardEntry>;
  exercise?: Maybe<Exercise>;
  exerciseId: Scalars['ID']['output'];
  lastUpdatedAt: Scalars['DateTime']['output'];
  myRank?: Maybe<Scalars['Int']['output']>;
  myRecord?: Maybe<VenueExerciseRecord>;
  recordType: RecordType;
  totalParticipants: Scalars['Int']['output'];
  venue?: Maybe<OutdoorVenue>;
  venueId: Scalars['ID']['output'];
};

/** Entry in a venue leaderboard */
export type VenueLeaderboardEntry = {
  __typename: 'VenueLeaderboardEntry';
  achievedAt: Scalars['DateTime']['output'];
  avatarUrl?: Maybe<Scalars['String']['output']>;
  isCurrentUser: Scalars['Boolean']['output'];
  rank: Scalars['Int']['output'];
  unit: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
  value: Scalars['Float']['output'];
  verificationStatus: VerificationStatus;
};

export type VenuePageInfo = {
  __typename: 'VenuePageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

/** Photo of a venue or equipment */
export type VenuePhoto = {
  __typename: 'VenuePhoto';
  caption?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  equipmentItemId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  isFeatured: Scalars['Boolean']['output'];
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  uploadedBy: User;
  url: Scalars['String']['output'];
  venueId: Scalars['ID']['output'];
  verificationCount: Scalars['Int']['output'];
};

export type VenuePhotoInput = {
  caption?: InputMaybe<Scalars['String']['input']>;
  equipmentItemId?: InputMaybe<Scalars['ID']['input']>;
  thumbnailUrl?: InputMaybe<Scalars['String']['input']>;
  url: Scalars['String']['input'];
};

export type VenuePhotoResult = {
  __typename: 'VenuePhotoResult';
  creditsEarned: Scalars['Int']['output'];
  message?: Maybe<Scalars['String']['output']>;
  photo?: Maybe<VenuePhoto>;
  success: Scalars['Boolean']['output'];
};

/** Result of claiming a venue record */
export type VenueRecordClaimResult = {
  __typename: 'VenueRecordClaimResult';
  achievements?: Maybe<Array<Achievement>>;
  isNewRecord: Scalars['Boolean']['output'];
  isVenueBest: Scalars['Boolean']['output'];
  previousHolderId?: Maybe<Scalars['ID']['output']>;
  previousValue?: Maybe<Scalars['Float']['output']>;
  rank: Scalars['Int']['output'];
  record: VenueExerciseRecord;
  requiresVerification: Scalars['Boolean']['output'];
};

/** Connection type for paginated venue records */
export type VenueRecordConnection = {
  __typename: 'VenueRecordConnection';
  edges: Array<VenueExerciseRecord>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** Issue report for a venue */
export type VenueReport = {
  __typename: 'VenueReport';
  adminNotes?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  reportType: Scalars['String']['output'];
  reportedBy: User;
  resolvedAt?: Maybe<Scalars['DateTime']['output']>;
  severity: Scalars['String']['output'];
  status: Scalars['String']['output'];
  venueId: Scalars['ID']['output'];
};

export type VenueReportInput = {
  description: Scalars['String']['input'];
  reportType: Scalars['String']['input'];
  severity?: InputMaybe<Scalars['String']['input']>;
};

export type VenueReportResult = {
  __typename: 'VenueReportResult';
  creditsEarned: Scalars['Int']['output'];
  message?: Maybe<Scalars['String']['output']>;
  report?: Maybe<VenueReport>;
  success: Scalars['Boolean']['output'];
};

export type VenueSearchInput = {
  amenities?: InputMaybe<Array<Scalars['String']['input']>>;
  borough?: InputMaybe<Scalars['String']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
  equipmentTypes?: InputMaybe<Array<Scalars['String']['input']>>;
  hasPhotos?: InputMaybe<Scalars['Boolean']['input']>;
  latitude?: InputMaybe<Scalars['Float']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  radiusKm?: InputMaybe<Scalars['Float']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  verifiedOnly?: InputMaybe<Scalars['Boolean']['input']>;
};

/** User submission for a new venue */
export type VenueSubmission = {
  __typename: 'VenueSubmission';
  address?: Maybe<Scalars['String']['output']>;
  borough?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  equipment: Array<VenueSubmissionEquipment>;
  id: Scalars['ID']['output'];
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  photos: Array<VenuePhoto>;
  reviewNotes?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  submittedBy: User;
  updatedAt: Scalars['DateTime']['output'];
};

/** Equipment in a venue submission */
export type VenueSubmissionEquipment = {
  __typename: 'VenueSubmissionEquipment';
  condition?: Maybe<Scalars['String']['output']>;
  equipmentType: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  quantity: Scalars['Int']['output'];
};

export type VenueSubmissionInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  borough?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  equipment: Array<EquipmentSubmissionInput>;
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
  name: Scalars['String']['input'];
  photoUrls?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type VenueSubmissionResult = {
  __typename: 'VenueSubmissionResult';
  creditsEarned: Scalars['Int']['output'];
  message?: Maybe<Scalars['String']['output']>;
  submission?: Maybe<VenueSubmission>;
  success: Scalars['Boolean']['output'];
};

/** Data sync statistics */
export type VenueSyncStats = {
  __typename: 'VenueSyncStats';
  crowdsourcedVenues: Scalars['Int']['output'];
  lastNycSync?: Maybe<Scalars['DateTime']['output']>;
  lastOsmSync?: Maybe<Scalars['DateTime']['output']>;
  nycVenues: Scalars['Int']['output'];
  osmVenues: Scalars['Int']['output'];
  pendingSubmissions: Scalars['Int']['output'];
  totalContributors: Scalars['Int']['output'];
  totalEquipment: Scalars['Int']['output'];
  totalPhotos: Scalars['Int']['output'];
  totalVenues: Scalars['Int']['output'];
};

export type VenueVerifyInput = {
  exists: Scalars['Boolean']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  rating?: InputMaybe<Scalars['Int']['input']>;
};

export type VenueVerifyResult = {
  __typename: 'VenueVerifyResult';
  contribution?: Maybe<VenueContribution>;
  creditsEarned: Scalars['Int']['output'];
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/** Result of searching venues for a specific exercise */
export type VenuesForExerciseResult = {
  __typename: 'VenuesForExerciseResult';
  /** The exercise that was searched for */
  exercise: ExerciseInfo;
  /** Search radius in kilometers */
  searchRadius: Scalars['Float']['output'];
  /** Total number of venues found */
  totalFound: Scalars['Int']['output'];
  /** Venues that have equipment for this exercise */
  venues: Array<OutdoorVenue>;
};

/** Verification status for venue records */
export type VerificationStatus =
  | 'PENDING_VERIFICATION'
  | 'SELF_VERIFIED'
  | 'UNVERIFIED'
  | 'VIDEO_VERIFIED'
  | 'WITNESS_VERIFIED';

export type VerificationsResult = {
  __typename: 'VerificationsResult';
  total: Scalars['Int']['output'];
  verifications: Array<AchievementVerification>;
};

/** Input for age verification */
export type VerifyAgeInput = {
  birthDate: Scalars['String']['input'];
  consentToTerms: Scalars['Boolean']['input'];
};

export type VolumeTrendEntry = {
  __typename: 'VolumeTrendEntry';
  label: Scalars['String']['output'];
  value: Scalars['Float']['output'];
};

export type Wallet = {
  __typename: 'Wallet';
  balance: Balance;
  transactions: Array<Transaction>;
};

export type WalletInfo = {
  __typename: 'WalletInfo';
  balance: Scalars['Int']['output'];
  lifetimeEarned: Scalars['Int']['output'];
  lifetimeSpent: Scalars['Int']['output'];
  status: Scalars['String']['output'];
  totalTransferredIn: Scalars['Int']['output'];
  totalTransferredOut: Scalars['Int']['output'];
  transactions: Array<WalletTransaction>;
  vipTier: Scalars['String']['output'];
};

export type WalletTransaction = {
  __typename: 'WalletTransaction';
  action?: Maybe<Scalars['String']['output']>;
  amount: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  type: Scalars['String']['output'];
};

/** Warmup exercise with specific instructions */
export type WarmupExercise = {
  __typename: 'WarmupExercise';
  category: Scalars['String']['output'];
  duration?: Maybe<Scalars['Int']['output']>;
  exerciseId: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  reps?: Maybe<Scalars['Int']['output']>;
};

export type WatchlistResult = {
  __typename: 'WatchlistResult';
  success: Scalars['Boolean']['output'];
};

export type WealthTier = {
  __typename: 'WealthTier';
  color: Scalars['String']['output'];
  creditsToNext?: Maybe<Scalars['Int']['output']>;
  description: Scalars['String']['output'];
  icon: Scalars['String']['output'];
  minCredits: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  progressPercent: Scalars['Int']['output'];
  tier: Scalars['Int']['output'];
};

export type WearableConnection = {
  __typename: 'WearableConnection';
  isConnected: Scalars['Boolean']['output'];
  lastSyncAt?: Maybe<Scalars['DateTime']['output']>;
  provider: Scalars['String']['output'];
};

export type WearableSyncStatus = {
  __typename: 'WearableSyncStatus';
  isConnected: Scalars['Boolean']['output'];
  lastSyncAt?: Maybe<Scalars['DateTime']['output']>;
  provider: Scalars['String']['output'];
};

export type WearablesDailySummary = {
  __typename: 'WearablesDailySummary';
  activeCalories?: Maybe<Scalars['Int']['output']>;
  avgHeartRate?: Maybe<Scalars['Int']['output']>;
  sleepHours?: Maybe<Scalars['Float']['output']>;
  steps?: Maybe<Scalars['Int']['output']>;
  workoutMinutes?: Maybe<Scalars['Int']['output']>;
};

export type WearablesStatus = {
  __typename: 'WearablesStatus';
  syncStatus: Array<WearableSyncStatus>;
};

export type WearablesSummary = {
  __typename: 'WearablesSummary';
  thisWeek?: Maybe<WearablesWeeklySummary>;
  today?: Maybe<WearablesDailySummary>;
};

export type WearablesSyncResult = {
  __typename: 'WearablesSyncResult';
  lastSyncAt?: Maybe<Scalars['DateTime']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type WearablesWeeklySummary = {
  __typename: 'WearablesWeeklySummary';
  avgDailySteps?: Maybe<Scalars['Int']['output']>;
  avgRestingHeartRate?: Maybe<Scalars['Int']['output']>;
  avgSleepHours?: Maybe<Scalars['Float']['output']>;
  totalSteps?: Maybe<Scalars['Int']['output']>;
  totalWorkoutMinutes?: Maybe<Scalars['Int']['output']>;
};

/** Weekday pattern data point */
export type WeekdayDataPoint = {
  __typename: 'WeekdayDataPoint';
  averageUsers: Scalars['Float']['output'];
  averageWorkouts: Scalars['Float']['output'];
  dayName: Scalars['String']['output'];
  dayOfWeek: Scalars['Int']['output'];
};

export type WeeklyBreakdownEntry = {
  __typename: 'WeeklyBreakdownEntry';
  tu: Scalars['Float']['output'];
  week: Scalars['Int']['output'];
  workouts: Scalars['Int']['output'];
};

export type WeeklySleepStats = {
  __typename: 'WeeklySleepStats';
  avgDurationMinutes: Scalars['Float']['output'];
  avgQuality: Scalars['Float']['output'];
  maxDurationMinutes: Scalars['Int']['output'];
  minDurationMinutes: Scalars['Int']['output'];
  nightsLogged: Scalars['Int']['output'];
  stddevDuration: Scalars['Float']['output'];
  weekStart: Scalars['DateTime']['output'];
};

export type WitnessInfo = {
  __typename: 'WitnessInfo';
  attestationText?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isPublic: Scalars['Boolean']['output'];
  locationDescription?: Maybe<Scalars['String']['output']>;
  relationship?: Maybe<Scalars['String']['output']>;
  requestedAt: Scalars['DateTime']['output'];
  respondedAt?: Maybe<Scalars['DateTime']['output']>;
  status: Scalars['String']['output'];
  witnessAvatarUrl?: Maybe<Scalars['String']['output']>;
  witnessDisplayName?: Maybe<Scalars['String']['output']>;
  witnessUserId: Scalars['ID']['output'];
  witnessUsername?: Maybe<Scalars['String']['output']>;
};

export type Workout = {
  __typename: 'Workout';
  characterStats?: Maybe<CharacterStats>;
  createdAt: Scalars['DateTime']['output'];
  duration?: Maybe<Scalars['Int']['output']>;
  exercises: Array<WorkoutExercise>;
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  totalTU: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
};

/** Active buddy pair */
export type WorkoutBuddyPair = {
  __typename: 'WorkoutBuddyPair';
  buddy: UserSummary;
  compatibilityScore?: Maybe<Scalars['Float']['output']>;
  createdAt: Scalars['DateTime']['output'];
  currentStreak: Scalars['Int']['output'];
  highFivesExchanged: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  lastMutualActivity?: Maybe<Scalars['DateTime']['output']>;
  longestStreak: Scalars['Int']['output'];
  matchReasons: Array<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  totalCheckIns: Scalars['Int']['output'];
  totalWorkoutsTogether: Scalars['Int']['output'];
  unreadMessages: Scalars['Int']['output'];
};

/** Workout buddy preferences */
export type WorkoutBuddyPreferences = {
  __typename: 'WorkoutBuddyPreferences';
  city?: Maybe<Scalars['String']['output']>;
  fitnessLevel: Scalars['String']['output'];
  goals: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isLookingForBuddy: Scalars['Boolean']['output'];
  matchSimilarLevel: Scalars['Boolean']['output'];
  maxDistanceKm?: Maybe<Scalars['Int']['output']>;
  openToInPerson: Scalars['Boolean']['output'];
  openToVirtualWorkouts: Scalars['Boolean']['output'];
  preferredDays: Array<Scalars['Int']['output']>;
  preferredTimes: Array<Scalars['String']['output']>;
  preferredWorkoutTypes: Array<Scalars['String']['output']>;
  timezone?: Maybe<Scalars['String']['output']>;
  wantsDailyCheckins: Scalars['Boolean']['output'];
  wantsWorkoutReminders: Scalars['Boolean']['output'];
};

export type WorkoutCompletionResult = {
  __typename: 'WorkoutCompletionResult';
  achievements?: Maybe<Array<Achievement>>;
  creditsCharged: Scalars['Int']['output'];
  duration: Scalars['Int']['output'];
  levelUp: Scalars['Boolean']['output'];
  muscleBreakdown: Array<MuscleActivationSummary>;
  prsAchieved: Array<SessionPr>;
  session: WorkoutSession;
  totalReps: Scalars['Int']['output'];
  totalSets: Scalars['Int']['output'];
  totalTU: Scalars['Float']['output'];
  totalVolume: Scalars['Float']['output'];
  workout: Workout;
  xpEarned: Scalars['Int']['output'];
};

export type WorkoutExercise = {
  __typename: 'WorkoutExercise';
  exerciseId: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  reps: Scalars['Int']['output'];
  sets: Scalars['Int']['output'];
  weight?: Maybe<Scalars['Float']['output']>;
};

export type WorkoutExerciseInput = {
  exerciseId: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  reps: Scalars['Int']['input'];
  sets: Scalars['Int']['input'];
  weight?: InputMaybe<Scalars['Float']['input']>;
};

export type WorkoutInput = {
  exercises: Array<WorkoutExerciseInput>;
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
};

export type WorkoutLimitationCheck = {
  __typename: 'WorkoutLimitationCheck';
  issues: Array<LimitationIssue>;
  substitutions: Array<ExerciseSubstitution>;
  valid: Scalars['Boolean']['output'];
};

export type WorkoutPreview = {
  __typename: 'WorkoutPreview';
  estimatedTU: Scalars['Int']['output'];
  estimatedXP: Scalars['Int']['output'];
  exercises: Array<WorkoutExercise>;
  musclesTargeted: Array<Scalars['String']['output']>;
};

export type WorkoutResult = {
  __typename: 'WorkoutResult';
  achievements?: Maybe<Array<Achievement>>;
  characterStats?: Maybe<CharacterStats>;
  levelUp: Scalars['Boolean']['output'];
  newLevel?: Maybe<Scalars['Int']['output']>;
  tuEarned: Scalars['Int']['output'];
  workout: Workout;
};

export type WorkoutSession = {
  __typename: 'WorkoutSession';
  clientVersion: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  currentExerciseIndex: Scalars['Int']['output'];
  currentSetIndex: Scalars['Int']['output'];
  estimatedCalories: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  lastActivityAt: Scalars['DateTime']['output'];
  musclesWorked: Array<MuscleActivationSummary>;
  pausedAt?: Maybe<Scalars['DateTime']['output']>;
  restTimerRemaining?: Maybe<Scalars['Int']['output']>;
  restTimerStartedAt?: Maybe<Scalars['DateTime']['output']>;
  restTimerTotalDuration?: Maybe<Scalars['Int']['output']>;
  serverVersion: Scalars['Int']['output'];
  sessionPRs: Array<SessionPr>;
  sets: Array<LoggedSet>;
  startedAt: Scalars['DateTime']['output'];
  totalPausedTime: Scalars['Int']['output'];
  totalReps: Scalars['Int']['output'];
  totalVolume: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
  workoutPlan?: Maybe<Scalars['JSON']['output']>;
};

export type WorkoutSessionResult = {
  __typename: 'WorkoutSessionResult';
  muscleUpdate?: Maybe<Array<MuscleActivationSummary>>;
  prsAchieved?: Maybe<Array<SessionPr>>;
  session: WorkoutSession;
  setLogged?: Maybe<LoggedSet>;
};

/** Workout session status */
export type WorkoutSessionStatus =
  | 'abandoned'
  | 'active'
  | 'completed'
  | 'paused';

export type WorkoutStats = {
  __typename: 'WorkoutStats';
  averageWorkoutDuration: Scalars['Float']['output'];
  currentStreak: Scalars['Int']['output'];
  longestStreak: Scalars['Int']['output'];
  thisMonth: Scalars['Int']['output'];
  thisWeek: Scalars['Int']['output'];
  totalExercises: Scalars['Int']['output'];
  totalReps: Scalars['Int']['output'];
  totalSets: Scalars['Int']['output'];
  totalWeight: Scalars['Float']['output'];
  totalWorkouts: Scalars['Int']['output'];
};

export type WorkoutSuggestion = {
  __typename: 'WorkoutSuggestion';
  intensity: Scalars['String']['output'];
  reason: Scalars['String']['output'];
  types: Array<Scalars['String']['output']>;
};

export type WorkoutTemplate = {
  __typename: 'WorkoutTemplate';
  averageRating?: Maybe<Scalars['Float']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  creatorDisplayName?: Maybe<Scalars['String']['output']>;
  creatorId: Scalars['ID']['output'];
  creatorUsername?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  difficulty?: Maybe<Scalars['String']['output']>;
  durationMinutes?: Maybe<Scalars['Int']['output']>;
  equipmentRequired: Array<Scalars['String']['output']>;
  exercises: Array<TemplateExercise>;
  forkedFromId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  isFeatured: Scalars['Boolean']['output'];
  isPublic: Scalars['Boolean']['output'];
  isSaved?: Maybe<Scalars['Boolean']['output']>;
  name: Scalars['String']['output'];
  ratingCount: Scalars['Int']['output'];
  tags: Array<Scalars['String']['output']>;
  targetMuscles: Array<Scalars['String']['output']>;
  timesCloned: Scalars['Int']['output'];
  timesUsed: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userRating?: Maybe<Scalars['Int']['output']>;
  version: Scalars['Int']['output'];
};

export type WorkoutTemplateSearchInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  creator?: InputMaybe<Scalars['String']['input']>;
  difficulty?: InputMaybe<Scalars['String']['input']>;
  equipment?: InputMaybe<Array<Scalars['String']['input']>>;
  featured?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  minRating?: InputMaybe<Scalars['Float']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  targetMuscles?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type WorkoutTemplatesResult = {
  __typename: 'WorkoutTemplatesResult';
  templates: Array<WorkoutTemplate>;
  total: Scalars['Int']['output'];
};

/** Records claimed during workout completion */
export type WorkoutVenueRecordsClaimed = {
  __typename: 'WorkoutVenueRecordsClaimed';
  records: Array<VenueRecordClaimResult>;
  totalNewRecords: Scalars['Int']['output'];
};

export type YearComparison = {
  __typename: 'YearComparison';
  tuChange?: Maybe<Scalars['Float']['output']>;
  volumeChange?: Maybe<Scalars['Float']['output']>;
  workoutsChange?: Maybe<Scalars['Float']['output']>;
};

export type YearHighlights = {
  __typename: 'YearHighlights';
  achievementsUnlocked: Scalars['Int']['output'];
  bestMonth?: Maybe<BestMonthHighlight>;
  biggestPr?: Maybe<BiggestPrHighlight>;
  totalHighFives: Scalars['Int']['output'];
};

export type YearInReview = {
  __typename: 'YearInReview';
  comparison?: Maybe<YearComparison>;
  highlights: YearHighlights;
  monthlyBreakdown: Array<YearMonthBreakdown>;
  ranking: YearRanking;
  summary?: Maybe<YearSummary>;
  topExercises: Array<TopExercise>;
  topMuscleGroups: Array<TopMuscleGroup>;
  year: Scalars['Int']['output'];
};

export type YearMonthBreakdown = {
  __typename: 'YearMonthBreakdown';
  month: Scalars['Int']['output'];
  tu: Scalars['Float']['output'];
  volume: Scalars['Float']['output'];
  workouts: Scalars['Int']['output'];
};

export type YearRanking = {
  __typename: 'YearRanking';
  percentile?: Maybe<Scalars['Int']['output']>;
  totalUsers: Scalars['Int']['output'];
  tuRank?: Maybe<Scalars['Int']['output']>;
};

export type YearSummary = {
  __typename: 'YearSummary';
  activeDays: Scalars['Int']['output'];
  creditsEarned: Scalars['Int']['output'];
  longestStreak: Scalars['Int']['output'];
  prsSet: Scalars['Int']['output'];
  totalTu: Scalars['Float']['output'];
  totalVolumeLbs: Scalars['Float']['output'];
  totalWorkouts: Scalars['Int']['output'];
  xpEarned: Scalars['Int']['output'];
};

export type YearlyStats = {
  __typename: 'YearlyStats';
  achievementsUnlocked: Scalars['Int']['output'];
  activeDays: Scalars['Int']['output'];
  avgRepsPerSet: Scalars['Float']['output'];
  avgSetsPerWorkout: Scalars['Float']['output'];
  avgTuPerWorkout: Scalars['Float']['output'];
  avgWorkoutDurationMinutes: Scalars['Float']['output'];
  avgWorkoutsPerWeek: Scalars['Float']['output'];
  calculatedAt: Scalars['DateTime']['output'];
  competitionsEntered: Scalars['Int']['output'];
  competitionsWon: Scalars['Int']['output'];
  consistencyScore: Scalars['Int']['output'];
  constitutionGained: Scalars['Float']['output'];
  creditsEarned: Scalars['Int']['output'];
  creditsSpent: Scalars['Int']['output'];
  dexterityGained: Scalars['Float']['output'];
  enduranceGained: Scalars['Float']['output'];
  highFivesReceived: Scalars['Int']['output'];
  highFivesSent: Scalars['Int']['output'];
  isComplete: Scalars['Boolean']['output'];
  levelsGained: Scalars['Int']['output'];
  longestStreak: Scalars['Int']['output'];
  maxTuSingleWorkout: Scalars['Float']['output'];
  milestonesCompleted: Scalars['Int']['output'];
  monthlyBreakdown: Array<MonthlyBreakdownEntry>;
  powerGained: Scalars['Float']['output'];
  prsSet: Scalars['Int']['output'];
  strengthGained: Scalars['Float']['output'];
  topExercises: Array<TopExercise>;
  topMuscleGroups: Array<TopMuscleGroup>;
  totalDurationMinutes: Scalars['Int']['output'];
  totalExercises: Scalars['Int']['output'];
  totalReps: Scalars['Int']['output'];
  totalSets: Scalars['Int']['output'];
  totalTu: Scalars['Float']['output'];
  totalVolumeLbs: Scalars['Float']['output'];
  totalWorkouts: Scalars['Int']['output'];
  tuTrendPercent?: Maybe<Scalars['Float']['output']>;
  userId: Scalars['ID']['output'];
  vitalityGained: Scalars['Float']['output'];
  workoutDays: Scalars['Int']['output'];
  xpEarned: Scalars['Int']['output'];
  year: Scalars['Int']['output'];
};

export type LoginVariables = Exact<{
  input: LoginInput;
}>;


export type Login = { __typename: 'Mutation', login: { __typename: 'AuthPayload', token: string, user: { __typename: 'User', id: string, username: string, email: string, displayName?: string | null, avatar?: string | null, level: number, xp: number, createdAt: string, roles: Array<string>, wealthTier?: { __typename: 'WealthTier', tier: number, name: string, color: string, icon: string, progressPercent: number } | null } } };

export type RegisterVariables = Exact<{
  input: RegisterInput;
}>;


export type Register = { __typename: 'Mutation', register: { __typename: 'AuthPayload', token: string, user: { __typename: 'User', id: string, username: string, email: string, displayName?: string | null, avatar?: string | null, level: number, xp: number, createdAt: string, roles: Array<string>, wealthTier?: { __typename: 'WealthTier', tier: number, name: string, color: string, icon: string } | null } } };

export type ChangePasswordVariables = Exact<{
  input: ChangePasswordInput;
}>;


export type ChangePassword = { __typename: 'Mutation', changePassword: { __typename: 'ChangePasswordResult', success: boolean, message: string } };

export type RequestPasswordResetVariables = Exact<{
  email: Scalars['String']['input'];
}>;


export type RequestPasswordReset = { __typename: 'Mutation', requestPasswordReset: { __typename: 'RequestPasswordResetResult', success: boolean, message: string } };

export type ResetPasswordVariables = Exact<{
  input: ResetPasswordInput;
}>;


export type ResetPassword = { __typename: 'Mutation', resetPassword: { __typename: 'ResetPasswordResult', success: boolean, message: string } };

export type UpdateProfileVariables = Exact<{
  input: ProfileInput;
}>;


export type UpdateProfile = { __typename: 'Mutation', updateProfile: { __typename: 'Profile', id: string, userId: string, displayName?: string | null, bio?: string | null, avatar?: string | null, location?: string | null, website?: string | null, socialLinks?: Record<string, unknown> | null, fitnessGoals?: Array<string> | null, preferredWorkoutTime?: string | null, experienceLevel?: string | null, visibility: string, updatedAt: string, wealthTier?: { __typename: 'WealthTier', tier: number, name: string, color: string, icon: string } | null } };

export type UpdateMyFullProfileVariables = Exact<{
  input: FullProfileInput;
}>;


export type UpdateMyFullProfile = { __typename: 'Mutation', updateMyFullProfile: { __typename: 'FullProfile', id: string, username: string, displayName?: string | null, avatarUrl?: string | null, avatarId?: string | null, xp: number, level: number, rank?: string | null, wealthTier: number, age?: number | null, gender?: string | null, heightCm?: number | null, weightKg?: number | null, preferredUnits: string, ghostMode: boolean, leaderboardOptIn: boolean, aboutMe?: string | null, theme?: string | null } };

export type StartWorkoutSessionVariables = Exact<{
  input?: InputMaybe<StartWorkoutSessionInput>;
}>;


export type StartWorkoutSession = { __typename: 'Mutation', startWorkoutSession: { __typename: 'WorkoutSessionResult', session: { __typename: 'WorkoutSession', id: string, userId: string, startedAt: string, currentExerciseIndex: number, currentSetIndex: number, totalVolume: number, totalReps: number, clientVersion: number, serverVersion: number, sets: Array<{ __typename: 'LoggedSet', id: string, exerciseId: string, exerciseName: string, setNumber: number, weightKg?: number | null, reps?: number | null, rpe?: number | null, isPRWeight: boolean, isPRReps: boolean, isPR1RM: boolean, performedAt: string }> } } };

export type LogSetVariables = Exact<{
  input: LogSetInput;
}>;


export type LogSet = { __typename: 'Mutation', logSet: { __typename: 'WorkoutSessionResult', session: { __typename: 'WorkoutSession', id: string, currentExerciseIndex: number, currentSetIndex: number, totalVolume: number, totalReps: number, estimatedCalories: number, clientVersion: number, serverVersion: number, sets: Array<{ __typename: 'LoggedSet', id: string, exerciseId: string, exerciseName: string, setNumber: number, weightKg?: number | null, reps?: number | null, rpe?: number | null, durationSeconds?: number | null, notes?: string | null, isPRWeight: boolean, isPRReps: boolean, isPR1RM: boolean, performedAt: string }>, musclesWorked: Array<{ __typename: 'MuscleActivationSummary', muscleId: string, muscleName: string, totalTU: number, setCount: number }>, sessionPRs: Array<{ __typename: 'SessionPR', exerciseId: string, exerciseName: string, prType: string, newValue: number, previousValue?: number | null }> }, setLogged?: { __typename: 'LoggedSet', id: string, exerciseId: string, exerciseName: string, setNumber: number, weightKg?: number | null, reps?: number | null, rpe?: number | null, isPRWeight: boolean, isPRReps: boolean, performedAt: string } | null } };

export type UpdateSetVariables = Exact<{
  input: UpdateSetInput;
}>;


export type UpdateSet = { __typename: 'Mutation', updateSet: { __typename: 'LoggedSet', id: string, exerciseId: string, exerciseName: string, setNumber: number, weightKg?: number | null, reps?: number | null, rpe?: number | null, durationSeconds?: number | null, notes?: string | null, isPRWeight: boolean, isPRReps: boolean, isPR1RM: boolean, performedAt: string } };

export type DeleteSetVariables = Exact<{
  setId: Scalars['ID']['input'];
}>;


export type DeleteSet = { __typename: 'Mutation', deleteSet: boolean };

export type PauseWorkoutSessionVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type PauseWorkoutSession = { __typename: 'Mutation', pauseWorkoutSession: { __typename: 'WorkoutSession', id: string, pausedAt?: string | null, totalPausedTime: number, clientVersion: number, serverVersion: number } };

export type ResumeWorkoutSessionVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type ResumeWorkoutSession = { __typename: 'Mutation', resumeWorkoutSession: { __typename: 'WorkoutSession', id: string, pausedAt?: string | null, totalPausedTime: number, lastActivityAt: string, clientVersion: number, serverVersion: number } };

export type UpdateRestTimerVariables = Exact<{
  sessionId: Scalars['ID']['input'];
  remaining: Scalars['Int']['input'];
  total: Scalars['Int']['input'];
}>;


export type UpdateRestTimer = { __typename: 'Mutation', updateRestTimer: { __typename: 'WorkoutSession', id: string, restTimerRemaining?: number | null, restTimerTotalDuration?: number | null, restTimerStartedAt?: string | null } };

export type CompleteWorkoutSessionVariables = Exact<{
  input: CompleteWorkoutSessionInput;
}>;


export type CompleteWorkoutSession = { __typename: 'Mutation', completeWorkoutSession: { __typename: 'WorkoutCompletionResult', totalTU: number, totalVolume: number, totalSets: number, totalReps: number, duration: number, creditsCharged: number, xpEarned: number, levelUp: boolean, workout: { __typename: 'Workout', id: string, userId: string, duration?: number | null, notes?: string | null, totalTU: number, createdAt: string, exercises: Array<{ __typename: 'WorkoutExercise', exerciseId: string, name: string, sets: number, reps: number, weight?: number | null, notes?: string | null }> }, session: { __typename: 'WorkoutSession', id: string, totalVolume: number, totalReps: number, estimatedCalories: number }, muscleBreakdown: Array<{ __typename: 'MuscleActivationSummary', muscleId: string, muscleName: string, totalTU: number, setCount: number }>, prsAchieved: Array<{ __typename: 'SessionPR', exerciseId: string, exerciseName: string, prType: string, newValue: number, previousValue?: number | null }>, achievements?: Array<{ __typename: 'Achievement', id: string, name: string, description: string, icon?: string | null, rarity: string, unlockedAt: string }> | null } };

export type AbandonWorkoutSessionVariables = Exact<{
  sessionId: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
}>;


export type AbandonWorkoutSession = { __typename: 'Mutation', abandonWorkoutSession: boolean };

export type RecoverWorkoutSessionVariables = Exact<{
  archivedSessionId: Scalars['ID']['input'];
}>;


export type RecoverWorkoutSession = { __typename: 'Mutation', recoverWorkoutSession: { __typename: 'WorkoutSession', id: string, userId: string, startedAt: string, totalVolume: number, totalReps: number, clientVersion: number, serverVersion: number, sets: Array<{ __typename: 'LoggedSet', id: string, exerciseId: string, exerciseName: string, setNumber: number, weightKg?: number | null, reps?: number | null, rpe?: number | null, isPRWeight: boolean, isPRReps: boolean, performedAt: string }> } };

export type CreateGoalVariables = Exact<{
  input: GoalInput;
}>;


export type CreateGoal = { __typename: 'Mutation', createGoal: { __typename: 'Goal', id: string, userId: string, type: string, target: number, current: number, unit: string, title: string, description?: string | null, status: string, deadline?: string | null, createdAt: string, milestones?: Array<{ __typename: 'GoalMilestone', id: string, goalId: string, title: string, target: number, achieved: boolean, achievedAt?: string | null }> | null } };

export type UpdateGoalVariables = Exact<{
  id: Scalars['ID']['input'];
  input: GoalInput;
}>;


export type UpdateGoal = { __typename: 'Mutation', updateGoal: { __typename: 'Goal', id: string, userId: string, type: string, target: number, current: number, unit: string, title: string, description?: string | null, status: string, deadline?: string | null, updatedAt: string, milestones?: Array<{ __typename: 'GoalMilestone', id: string, goalId: string, title: string, target: number, achieved: boolean, achievedAt?: string | null }> | null } };

export type DeleteGoalVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteGoal = { __typename: 'Mutation', deleteGoal: boolean };

export type RecordGoalProgressVariables = Exact<{
  id: Scalars['ID']['input'];
  input: GoalProgressInput;
}>;


export type RecordGoalProgress = { __typename: 'Mutation', recordGoalProgress: { __typename: 'Goal', id: string, current: number, status: string, updatedAt: string, milestones?: Array<{ __typename: 'GoalMilestone', id: string, achieved: boolean, achievedAt?: string | null }> | null } };

export type SelectArchetypeVariables = Exact<{
  archetypeId: Scalars['ID']['input'];
}>;


export type SelectArchetype = { __typename: 'Mutation', selectArchetype: { __typename: 'ArchetypeSelection', success: boolean, archetype: { __typename: 'Archetype', id: string, name: string, description: string, icon?: string | null }, journey: { __typename: 'JourneyProgress', userId: string, currentLevel: number, currentXP: number, xpToNextLevel: number, totalXP: number, completedMilestones: Array<string>, unlockedAbilities: Array<string> } } };

export type RecalculateStatsVariables = Exact<{ [key: string]: never; }>;


export type RecalculateStats = { __typename: 'Mutation', recalculateStats: { __typename: 'CharacterStats', userId: string, level: number, xp: number, xpToNextLevel: number, strength: number, endurance: number, agility: number, flexibility: number, balance: number, mentalFocus: number, totalWorkouts: number, totalExercises: number, currentStreak: number, longestStreak: number, lastWorkoutAt?: string | null } };

export type ChargeCreditsVariables = Exact<{
  input: ChargeInput;
}>;


export type ChargeCredits = { __typename: 'Mutation', chargeCredits: { __typename: 'ChargeResult', success: boolean, newBalance: number, transaction?: { __typename: 'Transaction', id: string, type: string, amount: number, description: string, createdAt: string, metadata?: Record<string, unknown> | null } | null } };

export type SendHighFiveVariables = Exact<{
  input: HighFiveInput;
}>;


export type SendHighFive = { __typename: 'Mutation', sendHighFive: { __typename: 'HighFiveSendResult', success: boolean, error?: string | null } };

export type CreateConversationVariables = Exact<{
  type: Scalars['String']['input'];
  participantIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type CreateConversation = { __typename: 'Mutation', createConversation: { __typename: 'Conversation', id: string, type: string, name?: string | null, createdAt: string, updatedAt: string, participants: Array<{ __typename: 'ConversationParticipant', userId: string, username: string, displayName?: string | null, avatarUrl?: string | null, role?: string | null }> } };

export type SendMessageVariables = Exact<{
  conversationId: Scalars['ID']['input'];
  content: Scalars['String']['input'];
  replyToId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type SendMessage = { __typename: 'Mutation', sendMessage: { __typename: 'Message', id: string, conversationId: string, senderId: string, senderUsername?: string | null, senderDisplayName?: string | null, content: string, contentType?: string | null, createdAt: string, editedAt?: string | null, replyTo?: { __typename: 'MessageReplyTo', id: string, content: string, senderName: string } | null } };

export type MarkConversationReadVariables = Exact<{
  conversationId: Scalars['ID']['input'];
}>;


export type MarkConversationRead = { __typename: 'Mutation', markConversationRead: boolean };

export type UpdatePresenceVariables = Exact<{
  status: Scalars['String']['input'];
}>;


export type UpdatePresence = { __typename: 'Mutation', updatePresence: { __typename: 'PresenceInfo', online: boolean, lastSeen?: string | null, status?: string | null } };

export type MeVariables = Exact<{ [key: string]: never; }>;


export type Me = { __typename: 'Query', me?: { __typename: 'User', id: string, username: string, email: string, displayName?: string | null, avatar?: string | null, level: number, xp: number, createdAt: string, roles: Array<string>, wealthTier?: { __typename: 'WealthTier', tier: number, name: string, minCredits: number, color: string, icon: string, description: string, creditsToNext?: number | null, progressPercent: number } | null } | null };

export type MyProfileVariables = Exact<{ [key: string]: never; }>;


export type MyProfile = { __typename: 'Query', profile?: { __typename: 'Profile', id: string, userId: string, displayName?: string | null, bio?: string | null, avatar?: string | null, location?: string | null, website?: string | null, socialLinks?: Record<string, unknown> | null, fitnessGoals?: Array<string> | null, preferredWorkoutTime?: string | null, experienceLevel?: string | null, visibility: string, createdAt: string, updatedAt: string, wealthTier?: { __typename: 'WealthTier', tier: number, name: string, color: string, icon: string } | null } | null };

export type MyFullProfileVariables = Exact<{ [key: string]: never; }>;


export type MyFullProfile = { __typename: 'Query', myFullProfile?: { __typename: 'FullProfile', id: string, username: string, displayName?: string | null, avatarUrl?: string | null, avatarId?: string | null, xp: number, level: number, rank?: string | null, wealthTier: number, age?: number | null, gender?: string | null, heightCm?: number | null, weightKg?: number | null, preferredUnits: string, ghostMode: boolean, leaderboardOptIn: boolean, aboutMe?: string | null, limitations: Array<string>, equipmentInventory: Array<string>, weeklyActivity: Array<number>, theme?: string | null } | null };

export type ExercisesVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  muscleGroup?: InputMaybe<Scalars['String']['input']>;
  equipment?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type Exercises = { __typename: 'Query', exercises: Array<{ __typename: 'Exercise', id: string, name: string, description?: string | null, type: string, primaryMuscles: Array<string>, secondaryMuscles?: Array<string> | null, equipment?: Array<string> | null, difficulty?: string | null, instructions?: Array<string> | null, tips?: Array<string> | null, imageUrl?: string | null, videoUrl?: string | null }> };

export type GetExerciseVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetExercise = { __typename: 'Query', exercise?: { __typename: 'Exercise', id: string, name: string, description?: string | null, type: string, primaryMuscles: Array<string>, secondaryMuscles?: Array<string> | null, equipment?: Array<string> | null, difficulty?: string | null, instructions?: Array<string> | null, tips?: Array<string> | null, imageUrl?: string | null, videoUrl?: string | null } | null };

export type MyWorkoutsVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type MyWorkouts = { __typename: 'Query', myWorkouts: Array<{ __typename: 'Workout', id: string, userId: string, duration?: number | null, notes?: string | null, totalTU: number, createdAt: string, exercises: Array<{ __typename: 'WorkoutExercise', exerciseId: string, name: string, sets: number, reps: number, weight?: number | null, notes?: string | null }> }> };

export type GetWorkoutVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetWorkout = { __typename: 'Query', workout?: { __typename: 'Workout', id: string, userId: string, duration?: number | null, notes?: string | null, totalTU: number, createdAt: string, exercises: Array<{ __typename: 'WorkoutExercise', exerciseId: string, name: string, sets: number, reps: number, weight?: number | null, notes?: string | null }> } | null };

export type MyWorkoutStatsVariables = Exact<{ [key: string]: never; }>;


export type MyWorkoutStats = { __typename: 'Query', myWorkoutStats?: { __typename: 'WorkoutStats', totalWorkouts: number, totalExercises: number, totalSets: number, totalReps: number, totalWeight: number, averageWorkoutDuration: number, currentStreak: number, longestStreak: number, thisWeek: number, thisMonth: number } | null };

export type ActiveWorkoutSessionVariables = Exact<{ [key: string]: never; }>;


export type ActiveWorkoutSession = { __typename: 'Query', activeWorkoutSession?: { __typename: 'WorkoutSession', id: string, userId: string, startedAt: string, pausedAt?: string | null, totalPausedTime: number, lastActivityAt: string, workoutPlan?: Record<string, unknown> | null, currentExerciseIndex: number, currentSetIndex: number, totalVolume: number, totalReps: number, estimatedCalories: number, restTimerRemaining?: number | null, restTimerTotalDuration?: number | null, restTimerStartedAt?: string | null, clientVersion: number, serverVersion: number, sets: Array<{ __typename: 'LoggedSet', id: string, exerciseId: string, exerciseName: string, setNumber: number, weightKg?: number | null, reps?: number | null, rpe?: number | null, rir?: number | null, durationSeconds?: number | null, restSeconds?: number | null, tag?: string | null, notes?: string | null, tu?: number | null, isPRWeight: boolean, isPRReps: boolean, isPR1RM: boolean, performedAt: string }>, musclesWorked: Array<{ __typename: 'MuscleActivationSummary', muscleId: string, muscleName: string, totalTU: number, setCount: number, percentageOfMax?: number | null }>, sessionPRs: Array<{ __typename: 'SessionPR', exerciseId: string, exerciseName: string, prType: string, newValue: number, previousValue?: number | null, improvementPercent?: number | null, achievedAt: string }> } | null };

export type RecoverableSessionsVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type RecoverableSessions = { __typename: 'Query', recoverableSessions: Array<{ __typename: 'RecoverableSession', id: string, startedAt: string, archivedAt: string, archiveReason: string, setsLogged: number, totalVolume: number, musclesWorked: Array<string>, canRecover: boolean }> };

export type EconomyWalletVariables = Exact<{ [key: string]: never; }>;


export type EconomyWallet = { __typename: 'Query', economyWallet?: { __typename: 'Wallet', balance: { __typename: 'Balance', credits: number, pending: number, lifetime: number }, transactions: Array<{ __typename: 'Transaction', id: string, type: string, amount: number, description: string, createdAt: string }> } | null };

export type EconomyTransactionsVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type EconomyTransactions = { __typename: 'Query', economyTransactions: Array<{ __typename: 'Transaction', id: string, type: string, amount: number, description: string, createdAt: string, metadata?: Record<string, unknown> | null }> };

export type StatLeaderboardVariables = Exact<{
  stat?: InputMaybe<Scalars['String']['input']>;
  scope?: InputMaybe<Scalars['String']['input']>;
  scopeValue?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  afterRank?: InputMaybe<Scalars['Int']['input']>;
}>;


export type StatLeaderboard = { __typename: 'Query', statLeaderboard: { __typename: 'StatLeaderboardResult', total: number, nextCursor?: number | null, entries: Array<{ __typename: 'StatLeaderboardEntry', userId: string, username: string, avatarUrl?: string | null, statValue: number, rank: number, gender?: string | null, country?: string | null, state?: string | null, city?: string | null }> } };

export type MyCrewVariables = Exact<{ [key: string]: never; }>;


export type MyCrew = { __typename: 'Query', myCrew?: { __typename: 'MyCrewResult', crew: { __typename: 'Crew', id: string, name: string, tag: string, description?: string | null, avatar?: string | null, color: string, ownerId: string, memberCount: number, totalTU: number, weeklyTU: number, wins: number, losses: number, createdAt: string }, membership: { __typename: 'CrewMember', id: string, crewId: string, userId: string, role: string, joinedAt: string, weeklyTU: number, totalTU: number, username: string, avatar?: string | null, archetype?: string | null }, members: Array<{ __typename: 'CrewMember', id: string, crewId: string, userId: string, role: string, joinedAt: string, weeklyTU: number, totalTU: number, username: string, avatar?: string | null, archetype?: string | null }>, stats: { __typename: 'CrewStats', totalMembers: number, totalTU: number, weeklyTU: number, warsWon: number, warsLost: number, currentStreak: number } } | null };

export type MyAchievementsVariables = Exact<{
  category?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type MyAchievements = { __typename: 'Query', myAchievements: { __typename: 'AchievementResult', total: number, achievements: Array<{ __typename: 'UserAchievement', id: string, achievementKey: string, achievementName: string, achievementDescription?: string | null, achievementIcon?: string | null, category: string, points: number, rarity: string, creditsEarned?: number | null, xpEarned?: number | null, isVerified?: boolean | null, witnessUsername?: string | null, earnedAt: string }> } };

export type GoalsVariables = Exact<{ [key: string]: never; }>;


export type Goals = { __typename: 'Query', goals: Array<{ __typename: 'Goal', id: string, userId: string, type: string, target: number, current: number, unit: string, title: string, description?: string | null, status: string, deadline?: string | null, createdAt: string, updatedAt: string, milestones?: Array<{ __typename: 'GoalMilestone', id: string, goalId: string, title: string, target: number, achieved: boolean, achievedAt?: string | null }> | null }> };

export type GetGoalVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetGoal = { __typename: 'Query', goal?: { __typename: 'Goal', id: string, userId: string, type: string, target: number, current: number, unit: string, title: string, description?: string | null, status: string, deadline?: string | null, createdAt: string, updatedAt: string, milestones?: Array<{ __typename: 'GoalMilestone', id: string, goalId: string, title: string, target: number, achieved: boolean, achievedAt?: string | null }> | null } | null };

export type GoalSuggestionsVariables = Exact<{ [key: string]: never; }>;


export type GoalSuggestions = { __typename: 'Query', goalSuggestions: Array<{ __typename: 'GoalSuggestion', type: string, target: number, unit: string, title: string, description: string, reasoning: string }> };


export const LoginDocument = gql`
    mutation Login($input: LoginInput!) {
  login(input: $input) {
    token
    user {
      id
      username
      email
      displayName
      avatar
      level
      xp
      wealthTier {
        tier
        name
        color
        icon
        progressPercent
      }
      createdAt
      roles
    }
  }
}
    `;
export type LoginMutationFn = Apollo.MutationFunction<Login, LoginVariables>;

/**
 * __useLogin__
 *
 * To run a mutation, you first call `useLogin` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLogin` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [login, { data, loading, error }] = useLogin({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useLogin(baseOptions?: ApolloReactHooks.MutationHookOptions<Login, LoginVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<Login, LoginVariables>(LoginDocument, options);
      }
export type LoginHookResult = ReturnType<typeof useLogin>;
export type LoginMutationResult = Apollo.MutationResult<Login>;
export type LoginMutationOptions = Apollo.BaseMutationOptions<Login, LoginVariables>;
export const RegisterDocument = gql`
    mutation Register($input: RegisterInput!) {
  register(input: $input) {
    token
    user {
      id
      username
      email
      displayName
      avatar
      level
      xp
      wealthTier {
        tier
        name
        color
        icon
      }
      createdAt
      roles
    }
  }
}
    `;
export type RegisterMutationFn = Apollo.MutationFunction<Register, RegisterVariables>;

/**
 * __useRegister__
 *
 * To run a mutation, you first call `useRegister` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegister` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [register, { data, loading, error }] = useRegister({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRegister(baseOptions?: ApolloReactHooks.MutationHookOptions<Register, RegisterVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<Register, RegisterVariables>(RegisterDocument, options);
      }
export type RegisterHookResult = ReturnType<typeof useRegister>;
export type RegisterMutationResult = Apollo.MutationResult<Register>;
export type RegisterMutationOptions = Apollo.BaseMutationOptions<Register, RegisterVariables>;
export const ChangePasswordDocument = gql`
    mutation ChangePassword($input: ChangePasswordInput!) {
  changePassword(input: $input) {
    success
    message
  }
}
    `;
export type ChangePasswordMutationFn = Apollo.MutationFunction<ChangePassword, ChangePasswordVariables>;

/**
 * __useChangePassword__
 *
 * To run a mutation, you first call `useChangePassword` within a React component and pass it any options that fit your needs.
 * When your component renders, `useChangePassword` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [changePassword, { data, loading, error }] = useChangePassword({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useChangePassword(baseOptions?: ApolloReactHooks.MutationHookOptions<ChangePassword, ChangePasswordVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ChangePassword, ChangePasswordVariables>(ChangePasswordDocument, options);
      }
export type ChangePasswordHookResult = ReturnType<typeof useChangePassword>;
export type ChangePasswordMutationResult = Apollo.MutationResult<ChangePassword>;
export type ChangePasswordMutationOptions = Apollo.BaseMutationOptions<ChangePassword, ChangePasswordVariables>;
export const RequestPasswordResetDocument = gql`
    mutation RequestPasswordReset($email: String!) {
  requestPasswordReset(email: $email) {
    success
    message
  }
}
    `;
export type RequestPasswordResetMutationFn = Apollo.MutationFunction<RequestPasswordReset, RequestPasswordResetVariables>;

/**
 * __useRequestPasswordReset__
 *
 * To run a mutation, you first call `useRequestPasswordReset` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestPasswordReset` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestPasswordReset, { data, loading, error }] = useRequestPasswordReset({
 *   variables: {
 *      email: // value for 'email'
 *   },
 * });
 */
export function useRequestPasswordReset(baseOptions?: ApolloReactHooks.MutationHookOptions<RequestPasswordReset, RequestPasswordResetVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RequestPasswordReset, RequestPasswordResetVariables>(RequestPasswordResetDocument, options);
      }
export type RequestPasswordResetHookResult = ReturnType<typeof useRequestPasswordReset>;
export type RequestPasswordResetMutationResult = Apollo.MutationResult<RequestPasswordReset>;
export type RequestPasswordResetMutationOptions = Apollo.BaseMutationOptions<RequestPasswordReset, RequestPasswordResetVariables>;
export const ResetPasswordDocument = gql`
    mutation ResetPassword($input: ResetPasswordInput!) {
  resetPassword(input: $input) {
    success
    message
  }
}
    `;
export type ResetPasswordMutationFn = Apollo.MutationFunction<ResetPassword, ResetPasswordVariables>;

/**
 * __useResetPassword__
 *
 * To run a mutation, you first call `useResetPassword` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResetPassword` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resetPassword, { data, loading, error }] = useResetPassword({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useResetPassword(baseOptions?: ApolloReactHooks.MutationHookOptions<ResetPassword, ResetPasswordVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ResetPassword, ResetPasswordVariables>(ResetPasswordDocument, options);
      }
export type ResetPasswordHookResult = ReturnType<typeof useResetPassword>;
export type ResetPasswordMutationResult = Apollo.MutationResult<ResetPassword>;
export type ResetPasswordMutationOptions = Apollo.BaseMutationOptions<ResetPassword, ResetPasswordVariables>;
export const UpdateProfileDocument = gql`
    mutation UpdateProfile($input: ProfileInput!) {
  updateProfile(input: $input) {
    id
    userId
    displayName
    bio
    avatar
    location
    website
    socialLinks
    fitnessGoals
    preferredWorkoutTime
    experienceLevel
    visibility
    wealthTier {
      tier
      name
      color
      icon
    }
    updatedAt
  }
}
    `;
export type UpdateProfileMutationFn = Apollo.MutationFunction<UpdateProfile, UpdateProfileVariables>;

/**
 * __useUpdateProfile__
 *
 * To run a mutation, you first call `useUpdateProfile` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateProfile` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateProfile, { data, loading, error }] = useUpdateProfile({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateProfile(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateProfile, UpdateProfileVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateProfile, UpdateProfileVariables>(UpdateProfileDocument, options);
      }
export type UpdateProfileHookResult = ReturnType<typeof useUpdateProfile>;
export type UpdateProfileMutationResult = Apollo.MutationResult<UpdateProfile>;
export type UpdateProfileMutationOptions = Apollo.BaseMutationOptions<UpdateProfile, UpdateProfileVariables>;
export const UpdateMyFullProfileDocument = gql`
    mutation UpdateMyFullProfile($input: FullProfileInput!) {
  updateMyFullProfile(input: $input) {
    id
    username
    displayName
    avatarUrl
    avatarId
    xp
    level
    rank
    wealthTier
    age
    gender
    heightCm
    weightKg
    preferredUnits
    ghostMode
    leaderboardOptIn
    aboutMe
    theme
  }
}
    `;
export type UpdateMyFullProfileMutationFn = Apollo.MutationFunction<UpdateMyFullProfile, UpdateMyFullProfileVariables>;

/**
 * __useUpdateMyFullProfile__
 *
 * To run a mutation, you first call `useUpdateMyFullProfile` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMyFullProfile` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateMyFullProfile, { data, loading, error }] = useUpdateMyFullProfile({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateMyFullProfile(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateMyFullProfile, UpdateMyFullProfileVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateMyFullProfile, UpdateMyFullProfileVariables>(UpdateMyFullProfileDocument, options);
      }
export type UpdateMyFullProfileHookResult = ReturnType<typeof useUpdateMyFullProfile>;
export type UpdateMyFullProfileMutationResult = Apollo.MutationResult<UpdateMyFullProfile>;
export type UpdateMyFullProfileMutationOptions = Apollo.BaseMutationOptions<UpdateMyFullProfile, UpdateMyFullProfileVariables>;
export const StartWorkoutSessionDocument = gql`
    mutation StartWorkoutSession($input: StartWorkoutSessionInput) {
  startWorkoutSession(input: $input) {
    session {
      id
      userId
      startedAt
      currentExerciseIndex
      currentSetIndex
      sets {
        id
        exerciseId
        exerciseName
        setNumber
        weightKg
        reps
        rpe
        isPRWeight
        isPRReps
        isPR1RM
        performedAt
      }
      totalVolume
      totalReps
      clientVersion
      serverVersion
    }
  }
}
    `;
export type StartWorkoutSessionMutationFn = Apollo.MutationFunction<StartWorkoutSession, StartWorkoutSessionVariables>;

/**
 * __useStartWorkoutSession__
 *
 * To run a mutation, you first call `useStartWorkoutSession` within a React component and pass it any options that fit your needs.
 * When your component renders, `useStartWorkoutSession` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [startWorkoutSession, { data, loading, error }] = useStartWorkoutSession({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useStartWorkoutSession(baseOptions?: ApolloReactHooks.MutationHookOptions<StartWorkoutSession, StartWorkoutSessionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<StartWorkoutSession, StartWorkoutSessionVariables>(StartWorkoutSessionDocument, options);
      }
export type StartWorkoutSessionHookResult = ReturnType<typeof useStartWorkoutSession>;
export type StartWorkoutSessionMutationResult = Apollo.MutationResult<StartWorkoutSession>;
export type StartWorkoutSessionMutationOptions = Apollo.BaseMutationOptions<StartWorkoutSession, StartWorkoutSessionVariables>;
export const LogSetDocument = gql`
    mutation LogSet($input: LogSetInput!) {
  logSet(input: $input) {
    session {
      id
      currentExerciseIndex
      currentSetIndex
      sets {
        id
        exerciseId
        exerciseName
        setNumber
        weightKg
        reps
        rpe
        durationSeconds
        notes
        isPRWeight
        isPRReps
        isPR1RM
        performedAt
      }
      totalVolume
      totalReps
      estimatedCalories
      musclesWorked {
        muscleId
        muscleName
        totalTU
        setCount
      }
      sessionPRs {
        exerciseId
        exerciseName
        prType
        newValue
        previousValue
      }
      clientVersion
      serverVersion
    }
    setLogged {
      id
      exerciseId
      exerciseName
      setNumber
      weightKg
      reps
      rpe
      isPRWeight
      isPRReps
      performedAt
    }
  }
}
    `;
export type LogSetMutationFn = Apollo.MutationFunction<LogSet, LogSetVariables>;

/**
 * __useLogSet__
 *
 * To run a mutation, you first call `useLogSet` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLogSet` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [logSet, { data, loading, error }] = useLogSet({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useLogSet(baseOptions?: ApolloReactHooks.MutationHookOptions<LogSet, LogSetVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<LogSet, LogSetVariables>(LogSetDocument, options);
      }
export type LogSetHookResult = ReturnType<typeof useLogSet>;
export type LogSetMutationResult = Apollo.MutationResult<LogSet>;
export type LogSetMutationOptions = Apollo.BaseMutationOptions<LogSet, LogSetVariables>;
export const UpdateSetDocument = gql`
    mutation UpdateSet($input: UpdateSetInput!) {
  updateSet(input: $input) {
    id
    exerciseId
    exerciseName
    setNumber
    weightKg
    reps
    rpe
    durationSeconds
    notes
    isPRWeight
    isPRReps
    isPR1RM
    performedAt
  }
}
    `;
export type UpdateSetMutationFn = Apollo.MutationFunction<UpdateSet, UpdateSetVariables>;

/**
 * __useUpdateSet__
 *
 * To run a mutation, you first call `useUpdateSet` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateSet` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateSet, { data, loading, error }] = useUpdateSet({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateSet(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateSet, UpdateSetVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateSet, UpdateSetVariables>(UpdateSetDocument, options);
      }
export type UpdateSetHookResult = ReturnType<typeof useUpdateSet>;
export type UpdateSetMutationResult = Apollo.MutationResult<UpdateSet>;
export type UpdateSetMutationOptions = Apollo.BaseMutationOptions<UpdateSet, UpdateSetVariables>;
export const DeleteSetDocument = gql`
    mutation DeleteSet($setId: ID!) {
  deleteSet(setId: $setId)
}
    `;
export type DeleteSetMutationFn = Apollo.MutationFunction<DeleteSet, DeleteSetVariables>;

/**
 * __useDeleteSet__
 *
 * To run a mutation, you first call `useDeleteSet` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteSet` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteSet, { data, loading, error }] = useDeleteSet({
 *   variables: {
 *      setId: // value for 'setId'
 *   },
 * });
 */
export function useDeleteSet(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteSet, DeleteSetVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteSet, DeleteSetVariables>(DeleteSetDocument, options);
      }
export type DeleteSetHookResult = ReturnType<typeof useDeleteSet>;
export type DeleteSetMutationResult = Apollo.MutationResult<DeleteSet>;
export type DeleteSetMutationOptions = Apollo.BaseMutationOptions<DeleteSet, DeleteSetVariables>;
export const PauseWorkoutSessionDocument = gql`
    mutation PauseWorkoutSession($sessionId: ID!) {
  pauseWorkoutSession(sessionId: $sessionId) {
    id
    pausedAt
    totalPausedTime
    clientVersion
    serverVersion
  }
}
    `;
export type PauseWorkoutSessionMutationFn = Apollo.MutationFunction<PauseWorkoutSession, PauseWorkoutSessionVariables>;

/**
 * __usePauseWorkoutSession__
 *
 * To run a mutation, you first call `usePauseWorkoutSession` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePauseWorkoutSession` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pauseWorkoutSession, { data, loading, error }] = usePauseWorkoutSession({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function usePauseWorkoutSession(baseOptions?: ApolloReactHooks.MutationHookOptions<PauseWorkoutSession, PauseWorkoutSessionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<PauseWorkoutSession, PauseWorkoutSessionVariables>(PauseWorkoutSessionDocument, options);
      }
export type PauseWorkoutSessionHookResult = ReturnType<typeof usePauseWorkoutSession>;
export type PauseWorkoutSessionMutationResult = Apollo.MutationResult<PauseWorkoutSession>;
export type PauseWorkoutSessionMutationOptions = Apollo.BaseMutationOptions<PauseWorkoutSession, PauseWorkoutSessionVariables>;
export const ResumeWorkoutSessionDocument = gql`
    mutation ResumeWorkoutSession($sessionId: ID!) {
  resumeWorkoutSession(sessionId: $sessionId) {
    id
    pausedAt
    totalPausedTime
    lastActivityAt
    clientVersion
    serverVersion
  }
}
    `;
export type ResumeWorkoutSessionMutationFn = Apollo.MutationFunction<ResumeWorkoutSession, ResumeWorkoutSessionVariables>;

/**
 * __useResumeWorkoutSession__
 *
 * To run a mutation, you first call `useResumeWorkoutSession` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResumeWorkoutSession` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resumeWorkoutSession, { data, loading, error }] = useResumeWorkoutSession({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useResumeWorkoutSession(baseOptions?: ApolloReactHooks.MutationHookOptions<ResumeWorkoutSession, ResumeWorkoutSessionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ResumeWorkoutSession, ResumeWorkoutSessionVariables>(ResumeWorkoutSessionDocument, options);
      }
export type ResumeWorkoutSessionHookResult = ReturnType<typeof useResumeWorkoutSession>;
export type ResumeWorkoutSessionMutationResult = Apollo.MutationResult<ResumeWorkoutSession>;
export type ResumeWorkoutSessionMutationOptions = Apollo.BaseMutationOptions<ResumeWorkoutSession, ResumeWorkoutSessionVariables>;
export const UpdateRestTimerDocument = gql`
    mutation UpdateRestTimer($sessionId: ID!, $remaining: Int!, $total: Int!) {
  updateRestTimer(sessionId: $sessionId, remaining: $remaining, total: $total) {
    id
    restTimerRemaining
    restTimerTotalDuration
    restTimerStartedAt
  }
}
    `;
export type UpdateRestTimerMutationFn = Apollo.MutationFunction<UpdateRestTimer, UpdateRestTimerVariables>;

/**
 * __useUpdateRestTimer__
 *
 * To run a mutation, you first call `useUpdateRestTimer` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateRestTimer` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateRestTimer, { data, loading, error }] = useUpdateRestTimer({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *      remaining: // value for 'remaining'
 *      total: // value for 'total'
 *   },
 * });
 */
export function useUpdateRestTimer(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateRestTimer, UpdateRestTimerVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateRestTimer, UpdateRestTimerVariables>(UpdateRestTimerDocument, options);
      }
export type UpdateRestTimerHookResult = ReturnType<typeof useUpdateRestTimer>;
export type UpdateRestTimerMutationResult = Apollo.MutationResult<UpdateRestTimer>;
export type UpdateRestTimerMutationOptions = Apollo.BaseMutationOptions<UpdateRestTimer, UpdateRestTimerVariables>;
export const CompleteWorkoutSessionDocument = gql`
    mutation CompleteWorkoutSession($input: CompleteWorkoutSessionInput!) {
  completeWorkoutSession(input: $input) {
    workout {
      id
      userId
      exercises {
        exerciseId
        name
        sets
        reps
        weight
        notes
      }
      duration
      notes
      totalTU
      createdAt
    }
    session {
      id
      totalVolume
      totalReps
      estimatedCalories
    }
    totalTU
    totalVolume
    totalSets
    totalReps
    duration
    muscleBreakdown {
      muscleId
      muscleName
      totalTU
      setCount
    }
    prsAchieved {
      exerciseId
      exerciseName
      prType
      newValue
      previousValue
    }
    creditsCharged
    xpEarned
    levelUp
    achievements {
      id
      name
      description
      icon
      rarity
      unlockedAt
    }
  }
}
    `;
export type CompleteWorkoutSessionMutationFn = Apollo.MutationFunction<CompleteWorkoutSession, CompleteWorkoutSessionVariables>;

/**
 * __useCompleteWorkoutSession__
 *
 * To run a mutation, you first call `useCompleteWorkoutSession` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCompleteWorkoutSession` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [completeWorkoutSession, { data, loading, error }] = useCompleteWorkoutSession({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCompleteWorkoutSession(baseOptions?: ApolloReactHooks.MutationHookOptions<CompleteWorkoutSession, CompleteWorkoutSessionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CompleteWorkoutSession, CompleteWorkoutSessionVariables>(CompleteWorkoutSessionDocument, options);
      }
export type CompleteWorkoutSessionHookResult = ReturnType<typeof useCompleteWorkoutSession>;
export type CompleteWorkoutSessionMutationResult = Apollo.MutationResult<CompleteWorkoutSession>;
export type CompleteWorkoutSessionMutationOptions = Apollo.BaseMutationOptions<CompleteWorkoutSession, CompleteWorkoutSessionVariables>;
export const AbandonWorkoutSessionDocument = gql`
    mutation AbandonWorkoutSession($sessionId: ID!, $reason: String) {
  abandonWorkoutSession(sessionId: $sessionId, reason: $reason)
}
    `;
export type AbandonWorkoutSessionMutationFn = Apollo.MutationFunction<AbandonWorkoutSession, AbandonWorkoutSessionVariables>;

/**
 * __useAbandonWorkoutSession__
 *
 * To run a mutation, you first call `useAbandonWorkoutSession` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAbandonWorkoutSession` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [abandonWorkoutSession, { data, loading, error }] = useAbandonWorkoutSession({
 *   variables: {
 *      sessionId: // value for 'sessionId'
 *      reason: // value for 'reason'
 *   },
 * });
 */
export function useAbandonWorkoutSession(baseOptions?: ApolloReactHooks.MutationHookOptions<AbandonWorkoutSession, AbandonWorkoutSessionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<AbandonWorkoutSession, AbandonWorkoutSessionVariables>(AbandonWorkoutSessionDocument, options);
      }
export type AbandonWorkoutSessionHookResult = ReturnType<typeof useAbandonWorkoutSession>;
export type AbandonWorkoutSessionMutationResult = Apollo.MutationResult<AbandonWorkoutSession>;
export type AbandonWorkoutSessionMutationOptions = Apollo.BaseMutationOptions<AbandonWorkoutSession, AbandonWorkoutSessionVariables>;
export const RecoverWorkoutSessionDocument = gql`
    mutation RecoverWorkoutSession($archivedSessionId: ID!) {
  recoverWorkoutSession(archivedSessionId: $archivedSessionId) {
    id
    userId
    startedAt
    sets {
      id
      exerciseId
      exerciseName
      setNumber
      weightKg
      reps
      rpe
      isPRWeight
      isPRReps
      performedAt
    }
    totalVolume
    totalReps
    clientVersion
    serverVersion
  }
}
    `;
export type RecoverWorkoutSessionMutationFn = Apollo.MutationFunction<RecoverWorkoutSession, RecoverWorkoutSessionVariables>;

/**
 * __useRecoverWorkoutSession__
 *
 * To run a mutation, you first call `useRecoverWorkoutSession` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRecoverWorkoutSession` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [recoverWorkoutSession, { data, loading, error }] = useRecoverWorkoutSession({
 *   variables: {
 *      archivedSessionId: // value for 'archivedSessionId'
 *   },
 * });
 */
export function useRecoverWorkoutSession(baseOptions?: ApolloReactHooks.MutationHookOptions<RecoverWorkoutSession, RecoverWorkoutSessionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RecoverWorkoutSession, RecoverWorkoutSessionVariables>(RecoverWorkoutSessionDocument, options);
      }
export type RecoverWorkoutSessionHookResult = ReturnType<typeof useRecoverWorkoutSession>;
export type RecoverWorkoutSessionMutationResult = Apollo.MutationResult<RecoverWorkoutSession>;
export type RecoverWorkoutSessionMutationOptions = Apollo.BaseMutationOptions<RecoverWorkoutSession, RecoverWorkoutSessionVariables>;
export const CreateGoalDocument = gql`
    mutation CreateGoal($input: GoalInput!) {
  createGoal(input: $input) {
    id
    userId
    type
    target
    current
    unit
    title
    description
    status
    deadline
    milestones {
      id
      goalId
      title
      target
      achieved
      achievedAt
    }
    createdAt
  }
}
    `;
export type CreateGoalMutationFn = Apollo.MutationFunction<CreateGoal, CreateGoalVariables>;

/**
 * __useCreateGoal__
 *
 * To run a mutation, you first call `useCreateGoal` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGoal` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGoal, { data, loading, error }] = useCreateGoal({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateGoal(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateGoal, CreateGoalVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateGoal, CreateGoalVariables>(CreateGoalDocument, options);
      }
export type CreateGoalHookResult = ReturnType<typeof useCreateGoal>;
export type CreateGoalMutationResult = Apollo.MutationResult<CreateGoal>;
export type CreateGoalMutationOptions = Apollo.BaseMutationOptions<CreateGoal, CreateGoalVariables>;
export const UpdateGoalDocument = gql`
    mutation UpdateGoal($id: ID!, $input: GoalInput!) {
  updateGoal(id: $id, input: $input) {
    id
    userId
    type
    target
    current
    unit
    title
    description
    status
    deadline
    milestones {
      id
      goalId
      title
      target
      achieved
      achievedAt
    }
    updatedAt
  }
}
    `;
export type UpdateGoalMutationFn = Apollo.MutationFunction<UpdateGoal, UpdateGoalVariables>;

/**
 * __useUpdateGoal__
 *
 * To run a mutation, you first call `useUpdateGoal` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateGoal` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateGoal, { data, loading, error }] = useUpdateGoal({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateGoal(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateGoal, UpdateGoalVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateGoal, UpdateGoalVariables>(UpdateGoalDocument, options);
      }
export type UpdateGoalHookResult = ReturnType<typeof useUpdateGoal>;
export type UpdateGoalMutationResult = Apollo.MutationResult<UpdateGoal>;
export type UpdateGoalMutationOptions = Apollo.BaseMutationOptions<UpdateGoal, UpdateGoalVariables>;
export const DeleteGoalDocument = gql`
    mutation DeleteGoal($id: ID!) {
  deleteGoal(id: $id)
}
    `;
export type DeleteGoalMutationFn = Apollo.MutationFunction<DeleteGoal, DeleteGoalVariables>;

/**
 * __useDeleteGoal__
 *
 * To run a mutation, you first call `useDeleteGoal` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteGoal` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteGoal, { data, loading, error }] = useDeleteGoal({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteGoal(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteGoal, DeleteGoalVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteGoal, DeleteGoalVariables>(DeleteGoalDocument, options);
      }
export type DeleteGoalHookResult = ReturnType<typeof useDeleteGoal>;
export type DeleteGoalMutationResult = Apollo.MutationResult<DeleteGoal>;
export type DeleteGoalMutationOptions = Apollo.BaseMutationOptions<DeleteGoal, DeleteGoalVariables>;
export const RecordGoalProgressDocument = gql`
    mutation RecordGoalProgress($id: ID!, $input: GoalProgressInput!) {
  recordGoalProgress(id: $id, input: $input) {
    id
    current
    status
    milestones {
      id
      achieved
      achievedAt
    }
    updatedAt
  }
}
    `;
export type RecordGoalProgressMutationFn = Apollo.MutationFunction<RecordGoalProgress, RecordGoalProgressVariables>;

/**
 * __useRecordGoalProgress__
 *
 * To run a mutation, you first call `useRecordGoalProgress` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRecordGoalProgress` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [recordGoalProgress, { data, loading, error }] = useRecordGoalProgress({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRecordGoalProgress(baseOptions?: ApolloReactHooks.MutationHookOptions<RecordGoalProgress, RecordGoalProgressVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RecordGoalProgress, RecordGoalProgressVariables>(RecordGoalProgressDocument, options);
      }
export type RecordGoalProgressHookResult = ReturnType<typeof useRecordGoalProgress>;
export type RecordGoalProgressMutationResult = Apollo.MutationResult<RecordGoalProgress>;
export type RecordGoalProgressMutationOptions = Apollo.BaseMutationOptions<RecordGoalProgress, RecordGoalProgressVariables>;
export const SelectArchetypeDocument = gql`
    mutation SelectArchetype($archetypeId: ID!) {
  selectArchetype(archetypeId: $archetypeId) {
    success
    archetype {
      id
      name
      description
      icon
    }
    journey {
      userId
      currentLevel
      currentXP
      xpToNextLevel
      totalXP
      completedMilestones
      unlockedAbilities
    }
  }
}
    `;
export type SelectArchetypeMutationFn = Apollo.MutationFunction<SelectArchetype, SelectArchetypeVariables>;

/**
 * __useSelectArchetype__
 *
 * To run a mutation, you first call `useSelectArchetype` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSelectArchetype` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [selectArchetype, { data, loading, error }] = useSelectArchetype({
 *   variables: {
 *      archetypeId: // value for 'archetypeId'
 *   },
 * });
 */
export function useSelectArchetype(baseOptions?: ApolloReactHooks.MutationHookOptions<SelectArchetype, SelectArchetypeVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SelectArchetype, SelectArchetypeVariables>(SelectArchetypeDocument, options);
      }
export type SelectArchetypeHookResult = ReturnType<typeof useSelectArchetype>;
export type SelectArchetypeMutationResult = Apollo.MutationResult<SelectArchetype>;
export type SelectArchetypeMutationOptions = Apollo.BaseMutationOptions<SelectArchetype, SelectArchetypeVariables>;
export const RecalculateStatsDocument = gql`
    mutation RecalculateStats {
  recalculateStats {
    userId
    level
    xp
    xpToNextLevel
    strength
    endurance
    agility
    flexibility
    balance
    mentalFocus
    totalWorkouts
    totalExercises
    currentStreak
    longestStreak
    lastWorkoutAt
  }
}
    `;
export type RecalculateStatsMutationFn = Apollo.MutationFunction<RecalculateStats, RecalculateStatsVariables>;

/**
 * __useRecalculateStats__
 *
 * To run a mutation, you first call `useRecalculateStats` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRecalculateStats` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [recalculateStats, { data, loading, error }] = useRecalculateStats({
 *   variables: {
 *   },
 * });
 */
export function useRecalculateStats(baseOptions?: ApolloReactHooks.MutationHookOptions<RecalculateStats, RecalculateStatsVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RecalculateStats, RecalculateStatsVariables>(RecalculateStatsDocument, options);
      }
export type RecalculateStatsHookResult = ReturnType<typeof useRecalculateStats>;
export type RecalculateStatsMutationResult = Apollo.MutationResult<RecalculateStats>;
export type RecalculateStatsMutationOptions = Apollo.BaseMutationOptions<RecalculateStats, RecalculateStatsVariables>;
export const ChargeCreditsDocument = gql`
    mutation ChargeCredits($input: ChargeInput!) {
  chargeCredits(input: $input) {
    success
    newBalance
    transaction {
      id
      type
      amount
      description
      createdAt
      metadata
    }
  }
}
    `;
export type ChargeCreditsMutationFn = Apollo.MutationFunction<ChargeCredits, ChargeCreditsVariables>;

/**
 * __useChargeCredits__
 *
 * To run a mutation, you first call `useChargeCredits` within a React component and pass it any options that fit your needs.
 * When your component renders, `useChargeCredits` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [chargeCredits, { data, loading, error }] = useChargeCredits({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useChargeCredits(baseOptions?: ApolloReactHooks.MutationHookOptions<ChargeCredits, ChargeCreditsVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ChargeCredits, ChargeCreditsVariables>(ChargeCreditsDocument, options);
      }
export type ChargeCreditsHookResult = ReturnType<typeof useChargeCredits>;
export type ChargeCreditsMutationResult = Apollo.MutationResult<ChargeCredits>;
export type ChargeCreditsMutationOptions = Apollo.BaseMutationOptions<ChargeCredits, ChargeCreditsVariables>;
export const SendHighFiveDocument = gql`
    mutation SendHighFive($input: HighFiveInput!) {
  sendHighFive(input: $input) {
    success
    error
  }
}
    `;
export type SendHighFiveMutationFn = Apollo.MutationFunction<SendHighFive, SendHighFiveVariables>;

/**
 * __useSendHighFive__
 *
 * To run a mutation, you first call `useSendHighFive` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendHighFive` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendHighFive, { data, loading, error }] = useSendHighFive({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSendHighFive(baseOptions?: ApolloReactHooks.MutationHookOptions<SendHighFive, SendHighFiveVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SendHighFive, SendHighFiveVariables>(SendHighFiveDocument, options);
      }
export type SendHighFiveHookResult = ReturnType<typeof useSendHighFive>;
export type SendHighFiveMutationResult = Apollo.MutationResult<SendHighFive>;
export type SendHighFiveMutationOptions = Apollo.BaseMutationOptions<SendHighFive, SendHighFiveVariables>;
export const CreateConversationDocument = gql`
    mutation CreateConversation($type: String!, $participantIds: [ID!]!) {
  createConversation(type: $type, participantIds: $participantIds) {
    id
    type
    name
    participants {
      userId
      username
      displayName
      avatarUrl
      role
    }
    createdAt
    updatedAt
  }
}
    `;
export type CreateConversationMutationFn = Apollo.MutationFunction<CreateConversation, CreateConversationVariables>;

/**
 * __useCreateConversation__
 *
 * To run a mutation, you first call `useCreateConversation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateConversation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createConversation, { data, loading, error }] = useCreateConversation({
 *   variables: {
 *      type: // value for 'type'
 *      participantIds: // value for 'participantIds'
 *   },
 * });
 */
export function useCreateConversation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateConversation, CreateConversationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateConversation, CreateConversationVariables>(CreateConversationDocument, options);
      }
export type CreateConversationHookResult = ReturnType<typeof useCreateConversation>;
export type CreateConversationMutationResult = Apollo.MutationResult<CreateConversation>;
export type CreateConversationMutationOptions = Apollo.BaseMutationOptions<CreateConversation, CreateConversationVariables>;
export const SendMessageDocument = gql`
    mutation SendMessage($conversationId: ID!, $content: String!, $replyToId: ID) {
  sendMessage(
    conversationId: $conversationId
    content: $content
    replyToId: $replyToId
  ) {
    id
    conversationId
    senderId
    senderUsername
    senderDisplayName
    content
    contentType
    replyTo {
      id
      content
      senderName
    }
    createdAt
    editedAt
  }
}
    `;
export type SendMessageMutationFn = Apollo.MutationFunction<SendMessage, SendMessageVariables>;

/**
 * __useSendMessage__
 *
 * To run a mutation, you first call `useSendMessage` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendMessage` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendMessage, { data, loading, error }] = useSendMessage({
 *   variables: {
 *      conversationId: // value for 'conversationId'
 *      content: // value for 'content'
 *      replyToId: // value for 'replyToId'
 *   },
 * });
 */
export function useSendMessage(baseOptions?: ApolloReactHooks.MutationHookOptions<SendMessage, SendMessageVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SendMessage, SendMessageVariables>(SendMessageDocument, options);
      }
export type SendMessageHookResult = ReturnType<typeof useSendMessage>;
export type SendMessageMutationResult = Apollo.MutationResult<SendMessage>;
export type SendMessageMutationOptions = Apollo.BaseMutationOptions<SendMessage, SendMessageVariables>;
export const MarkConversationReadDocument = gql`
    mutation MarkConversationRead($conversationId: ID!) {
  markConversationRead(conversationId: $conversationId)
}
    `;
export type MarkConversationReadMutationFn = Apollo.MutationFunction<MarkConversationRead, MarkConversationReadVariables>;

/**
 * __useMarkConversationRead__
 *
 * To run a mutation, you first call `useMarkConversationRead` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMarkConversationRead` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [markConversationRead, { data, loading, error }] = useMarkConversationRead({
 *   variables: {
 *      conversationId: // value for 'conversationId'
 *   },
 * });
 */
export function useMarkConversationRead(baseOptions?: ApolloReactHooks.MutationHookOptions<MarkConversationRead, MarkConversationReadVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<MarkConversationRead, MarkConversationReadVariables>(MarkConversationReadDocument, options);
      }
export type MarkConversationReadHookResult = ReturnType<typeof useMarkConversationRead>;
export type MarkConversationReadMutationResult = Apollo.MutationResult<MarkConversationRead>;
export type MarkConversationReadMutationOptions = Apollo.BaseMutationOptions<MarkConversationRead, MarkConversationReadVariables>;
export const UpdatePresenceDocument = gql`
    mutation UpdatePresence($status: String!) {
  updatePresence(status: $status) {
    online
    lastSeen
    status
  }
}
    `;
export type UpdatePresenceMutationFn = Apollo.MutationFunction<UpdatePresence, UpdatePresenceVariables>;

/**
 * __useUpdatePresence__
 *
 * To run a mutation, you first call `useUpdatePresence` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdatePresence` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updatePresence, { data, loading, error }] = useUpdatePresence({
 *   variables: {
 *      status: // value for 'status'
 *   },
 * });
 */
export function useUpdatePresence(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdatePresence, UpdatePresenceVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdatePresence, UpdatePresenceVariables>(UpdatePresenceDocument, options);
      }
export type UpdatePresenceHookResult = ReturnType<typeof useUpdatePresence>;
export type UpdatePresenceMutationResult = Apollo.MutationResult<UpdatePresence>;
export type UpdatePresenceMutationOptions = Apollo.BaseMutationOptions<UpdatePresence, UpdatePresenceVariables>;
export const MeDocument = gql`
    query Me {
  me {
    id
    username
    email
    displayName
    avatar
    level
    xp
    wealthTier {
      tier
      name
      minCredits
      color
      icon
      description
      creditsToNext
      progressPercent
    }
    createdAt
    roles
  }
}
    `;

/**
 * __useMe__
 *
 * To run a query within a React component, call `useMe` and pass it any options that fit your needs.
 * When your component renders, `useMe` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMe({
 *   variables: {
 *   },
 * });
 */
export function useMe(baseOptions?: ApolloReactHooks.QueryHookOptions<Me, MeVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<Me, MeVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<Me, MeVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<Me, MeVariables>(MeDocument, options);
        }
// @ts-ignore
export function useMeSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<Me, MeVariables>): ApolloReactHooks.UseSuspenseQueryResult<Me, MeVariables>;
export function useMeSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<Me, MeVariables>): ApolloReactHooks.UseSuspenseQueryResult<Me | undefined, MeVariables>;
export function useMeSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<Me, MeVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<Me, MeVariables>(MeDocument, options);
        }
export type MeHookResult = ReturnType<typeof useMe>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeSuspenseQueryHookResult = ReturnType<typeof useMeSuspenseQuery>;
export type MeQueryResult = Apollo.QueryResult<Me, MeVariables>;
export const MyProfileDocument = gql`
    query MyProfile {
  profile {
    id
    userId
    displayName
    bio
    avatar
    location
    website
    socialLinks
    fitnessGoals
    preferredWorkoutTime
    experienceLevel
    visibility
    wealthTier {
      tier
      name
      color
      icon
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useMyProfile__
 *
 * To run a query within a React component, call `useMyProfile` and pass it any options that fit your needs.
 * When your component renders, `useMyProfile` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyProfile({
 *   variables: {
 *   },
 * });
 */
export function useMyProfile(baseOptions?: ApolloReactHooks.QueryHookOptions<MyProfile, MyProfileVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MyProfile, MyProfileVariables>(MyProfileDocument, options);
      }
export function useMyProfileLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MyProfile, MyProfileVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MyProfile, MyProfileVariables>(MyProfileDocument, options);
        }
// @ts-ignore
export function useMyProfileSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<MyProfile, MyProfileVariables>): ApolloReactHooks.UseSuspenseQueryResult<MyProfile, MyProfileVariables>;
export function useMyProfileSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<MyProfile, MyProfileVariables>): ApolloReactHooks.UseSuspenseQueryResult<MyProfile | undefined, MyProfileVariables>;
export function useMyProfileSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<MyProfile, MyProfileVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<MyProfile, MyProfileVariables>(MyProfileDocument, options);
        }
export type MyProfileHookResult = ReturnType<typeof useMyProfile>;
export type MyProfileLazyQueryHookResult = ReturnType<typeof useMyProfileLazyQuery>;
export type MyProfileSuspenseQueryHookResult = ReturnType<typeof useMyProfileSuspenseQuery>;
export type MyProfileQueryResult = Apollo.QueryResult<MyProfile, MyProfileVariables>;
export const MyFullProfileDocument = gql`
    query MyFullProfile {
  myFullProfile {
    id
    username
    displayName
    avatarUrl
    avatarId
    xp
    level
    rank
    wealthTier
    age
    gender
    heightCm
    weightKg
    preferredUnits
    ghostMode
    leaderboardOptIn
    aboutMe
    limitations
    equipmentInventory
    weeklyActivity
    theme
  }
}
    `;

/**
 * __useMyFullProfile__
 *
 * To run a query within a React component, call `useMyFullProfile` and pass it any options that fit your needs.
 * When your component renders, `useMyFullProfile` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyFullProfile({
 *   variables: {
 *   },
 * });
 */
export function useMyFullProfile(baseOptions?: ApolloReactHooks.QueryHookOptions<MyFullProfile, MyFullProfileVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MyFullProfile, MyFullProfileVariables>(MyFullProfileDocument, options);
      }
export function useMyFullProfileLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MyFullProfile, MyFullProfileVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MyFullProfile, MyFullProfileVariables>(MyFullProfileDocument, options);
        }
// @ts-ignore
export function useMyFullProfileSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<MyFullProfile, MyFullProfileVariables>): ApolloReactHooks.UseSuspenseQueryResult<MyFullProfile, MyFullProfileVariables>;
export function useMyFullProfileSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<MyFullProfile, MyFullProfileVariables>): ApolloReactHooks.UseSuspenseQueryResult<MyFullProfile | undefined, MyFullProfileVariables>;
export function useMyFullProfileSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<MyFullProfile, MyFullProfileVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<MyFullProfile, MyFullProfileVariables>(MyFullProfileDocument, options);
        }
export type MyFullProfileHookResult = ReturnType<typeof useMyFullProfile>;
export type MyFullProfileLazyQueryHookResult = ReturnType<typeof useMyFullProfileLazyQuery>;
export type MyFullProfileSuspenseQueryHookResult = ReturnType<typeof useMyFullProfileSuspenseQuery>;
export type MyFullProfileQueryResult = Apollo.QueryResult<MyFullProfile, MyFullProfileVariables>;
export const ExercisesDocument = gql`
    query Exercises($search: String, $muscleGroup: String, $equipment: String, $limit: Int = 20) {
  exercises(
    search: $search
    muscleGroup: $muscleGroup
    equipment: $equipment
    limit: $limit
  ) {
    id
    name
    description
    type
    primaryMuscles
    secondaryMuscles
    equipment
    difficulty
    instructions
    tips
    imageUrl
    videoUrl
  }
}
    `;

/**
 * __useExercises__
 *
 * To run a query within a React component, call `useExercises` and pass it any options that fit your needs.
 * When your component renders, `useExercises` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useExercises({
 *   variables: {
 *      search: // value for 'search'
 *      muscleGroup: // value for 'muscleGroup'
 *      equipment: // value for 'equipment'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useExercises(baseOptions?: ApolloReactHooks.QueryHookOptions<Exercises, ExercisesVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<Exercises, ExercisesVariables>(ExercisesDocument, options);
      }
export function useExercisesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<Exercises, ExercisesVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<Exercises, ExercisesVariables>(ExercisesDocument, options);
        }
// @ts-ignore
export function useExercisesSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<Exercises, ExercisesVariables>): ApolloReactHooks.UseSuspenseQueryResult<Exercises, ExercisesVariables>;
export function useExercisesSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<Exercises, ExercisesVariables>): ApolloReactHooks.UseSuspenseQueryResult<Exercises | undefined, ExercisesVariables>;
export function useExercisesSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<Exercises, ExercisesVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<Exercises, ExercisesVariables>(ExercisesDocument, options);
        }
export type ExercisesHookResult = ReturnType<typeof useExercises>;
export type ExercisesLazyQueryHookResult = ReturnType<typeof useExercisesLazyQuery>;
export type ExercisesSuspenseQueryHookResult = ReturnType<typeof useExercisesSuspenseQuery>;
export type ExercisesQueryResult = Apollo.QueryResult<Exercises, ExercisesVariables>;
export const GetExerciseDocument = gql`
    query GetExercise($id: ID!) {
  exercise(id: $id) {
    id
    name
    description
    type
    primaryMuscles
    secondaryMuscles
    equipment
    difficulty
    instructions
    tips
    imageUrl
    videoUrl
  }
}
    `;

/**
 * __useGetExercise__
 *
 * To run a query within a React component, call `useGetExercise` and pass it any options that fit your needs.
 * When your component renders, `useGetExercise` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetExercise({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetExercise(baseOptions: ApolloReactHooks.QueryHookOptions<GetExercise, GetExerciseVariables> & ({ variables: GetExerciseVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetExercise, GetExerciseVariables>(GetExerciseDocument, options);
      }
export function useGetExerciseLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetExercise, GetExerciseVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetExercise, GetExerciseVariables>(GetExerciseDocument, options);
        }
// @ts-ignore
export function useGetExerciseSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<GetExercise, GetExerciseVariables>): ApolloReactHooks.UseSuspenseQueryResult<GetExercise, GetExerciseVariables>;
export function useGetExerciseSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetExercise, GetExerciseVariables>): ApolloReactHooks.UseSuspenseQueryResult<GetExercise | undefined, GetExerciseVariables>;
export function useGetExerciseSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetExercise, GetExerciseVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetExercise, GetExerciseVariables>(GetExerciseDocument, options);
        }
export type GetExerciseHookResult = ReturnType<typeof useGetExercise>;
export type GetExerciseLazyQueryHookResult = ReturnType<typeof useGetExerciseLazyQuery>;
export type GetExerciseSuspenseQueryHookResult = ReturnType<typeof useGetExerciseSuspenseQuery>;
export type GetExerciseQueryResult = Apollo.QueryResult<GetExercise, GetExerciseVariables>;
export const MyWorkoutsDocument = gql`
    query MyWorkouts($limit: Int = 10, $offset: Int = 0) {
  myWorkouts(limit: $limit, offset: $offset) {
    id
    userId
    exercises {
      exerciseId
      name
      sets
      reps
      weight
      notes
    }
    duration
    notes
    totalTU
    createdAt
  }
}
    `;

/**
 * __useMyWorkouts__
 *
 * To run a query within a React component, call `useMyWorkouts` and pass it any options that fit your needs.
 * When your component renders, `useMyWorkouts` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyWorkouts({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useMyWorkouts(baseOptions?: ApolloReactHooks.QueryHookOptions<MyWorkouts, MyWorkoutsVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MyWorkouts, MyWorkoutsVariables>(MyWorkoutsDocument, options);
      }
export function useMyWorkoutsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MyWorkouts, MyWorkoutsVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MyWorkouts, MyWorkoutsVariables>(MyWorkoutsDocument, options);
        }
// @ts-ignore
export function useMyWorkoutsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<MyWorkouts, MyWorkoutsVariables>): ApolloReactHooks.UseSuspenseQueryResult<MyWorkouts, MyWorkoutsVariables>;
export function useMyWorkoutsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<MyWorkouts, MyWorkoutsVariables>): ApolloReactHooks.UseSuspenseQueryResult<MyWorkouts | undefined, MyWorkoutsVariables>;
export function useMyWorkoutsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<MyWorkouts, MyWorkoutsVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<MyWorkouts, MyWorkoutsVariables>(MyWorkoutsDocument, options);
        }
export type MyWorkoutsHookResult = ReturnType<typeof useMyWorkouts>;
export type MyWorkoutsLazyQueryHookResult = ReturnType<typeof useMyWorkoutsLazyQuery>;
export type MyWorkoutsSuspenseQueryHookResult = ReturnType<typeof useMyWorkoutsSuspenseQuery>;
export type MyWorkoutsQueryResult = Apollo.QueryResult<MyWorkouts, MyWorkoutsVariables>;
export const GetWorkoutDocument = gql`
    query GetWorkout($id: ID!) {
  workout(id: $id) {
    id
    userId
    exercises {
      exerciseId
      name
      sets
      reps
      weight
      notes
    }
    duration
    notes
    totalTU
    createdAt
  }
}
    `;

/**
 * __useGetWorkout__
 *
 * To run a query within a React component, call `useGetWorkout` and pass it any options that fit your needs.
 * When your component renders, `useGetWorkout` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetWorkout({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetWorkout(baseOptions: ApolloReactHooks.QueryHookOptions<GetWorkout, GetWorkoutVariables> & ({ variables: GetWorkoutVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetWorkout, GetWorkoutVariables>(GetWorkoutDocument, options);
      }
export function useGetWorkoutLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetWorkout, GetWorkoutVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetWorkout, GetWorkoutVariables>(GetWorkoutDocument, options);
        }
// @ts-ignore
export function useGetWorkoutSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<GetWorkout, GetWorkoutVariables>): ApolloReactHooks.UseSuspenseQueryResult<GetWorkout, GetWorkoutVariables>;
export function useGetWorkoutSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetWorkout, GetWorkoutVariables>): ApolloReactHooks.UseSuspenseQueryResult<GetWorkout | undefined, GetWorkoutVariables>;
export function useGetWorkoutSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetWorkout, GetWorkoutVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetWorkout, GetWorkoutVariables>(GetWorkoutDocument, options);
        }
export type GetWorkoutHookResult = ReturnType<typeof useGetWorkout>;
export type GetWorkoutLazyQueryHookResult = ReturnType<typeof useGetWorkoutLazyQuery>;
export type GetWorkoutSuspenseQueryHookResult = ReturnType<typeof useGetWorkoutSuspenseQuery>;
export type GetWorkoutQueryResult = Apollo.QueryResult<GetWorkout, GetWorkoutVariables>;
export const MyWorkoutStatsDocument = gql`
    query MyWorkoutStats {
  myWorkoutStats {
    totalWorkouts
    totalExercises
    totalSets
    totalReps
    totalWeight
    averageWorkoutDuration
    currentStreak
    longestStreak
    thisWeek
    thisMonth
  }
}
    `;

/**
 * __useMyWorkoutStats__
 *
 * To run a query within a React component, call `useMyWorkoutStats` and pass it any options that fit your needs.
 * When your component renders, `useMyWorkoutStats` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyWorkoutStats({
 *   variables: {
 *   },
 * });
 */
export function useMyWorkoutStats(baseOptions?: ApolloReactHooks.QueryHookOptions<MyWorkoutStats, MyWorkoutStatsVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MyWorkoutStats, MyWorkoutStatsVariables>(MyWorkoutStatsDocument, options);
      }
export function useMyWorkoutStatsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MyWorkoutStats, MyWorkoutStatsVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MyWorkoutStats, MyWorkoutStatsVariables>(MyWorkoutStatsDocument, options);
        }
// @ts-ignore
export function useMyWorkoutStatsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<MyWorkoutStats, MyWorkoutStatsVariables>): ApolloReactHooks.UseSuspenseQueryResult<MyWorkoutStats, MyWorkoutStatsVariables>;
export function useMyWorkoutStatsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<MyWorkoutStats, MyWorkoutStatsVariables>): ApolloReactHooks.UseSuspenseQueryResult<MyWorkoutStats | undefined, MyWorkoutStatsVariables>;
export function useMyWorkoutStatsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<MyWorkoutStats, MyWorkoutStatsVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<MyWorkoutStats, MyWorkoutStatsVariables>(MyWorkoutStatsDocument, options);
        }
export type MyWorkoutStatsHookResult = ReturnType<typeof useMyWorkoutStats>;
export type MyWorkoutStatsLazyQueryHookResult = ReturnType<typeof useMyWorkoutStatsLazyQuery>;
export type MyWorkoutStatsSuspenseQueryHookResult = ReturnType<typeof useMyWorkoutStatsSuspenseQuery>;
export type MyWorkoutStatsQueryResult = Apollo.QueryResult<MyWorkoutStats, MyWorkoutStatsVariables>;
export const ActiveWorkoutSessionDocument = gql`
    query ActiveWorkoutSession {
  activeWorkoutSession {
    id
    userId
    startedAt
    pausedAt
    totalPausedTime
    lastActivityAt
    workoutPlan
    currentExerciseIndex
    currentSetIndex
    sets {
      id
      exerciseId
      exerciseName
      setNumber
      weightKg
      reps
      rpe
      rir
      durationSeconds
      restSeconds
      tag
      notes
      tu
      isPRWeight
      isPRReps
      isPR1RM
      performedAt
    }
    totalVolume
    totalReps
    estimatedCalories
    musclesWorked {
      muscleId
      muscleName
      totalTU
      setCount
      percentageOfMax
    }
    sessionPRs {
      exerciseId
      exerciseName
      prType
      newValue
      previousValue
      improvementPercent
      achievedAt
    }
    restTimerRemaining
    restTimerTotalDuration
    restTimerStartedAt
    clientVersion
    serverVersion
  }
}
    `;

/**
 * __useActiveWorkoutSession__
 *
 * To run a query within a React component, call `useActiveWorkoutSession` and pass it any options that fit your needs.
 * When your component renders, `useActiveWorkoutSession` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useActiveWorkoutSession({
 *   variables: {
 *   },
 * });
 */
export function useActiveWorkoutSession(baseOptions?: ApolloReactHooks.QueryHookOptions<ActiveWorkoutSession, ActiveWorkoutSessionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ActiveWorkoutSession, ActiveWorkoutSessionVariables>(ActiveWorkoutSessionDocument, options);
      }
export function useActiveWorkoutSessionLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ActiveWorkoutSession, ActiveWorkoutSessionVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ActiveWorkoutSession, ActiveWorkoutSessionVariables>(ActiveWorkoutSessionDocument, options);
        }
// @ts-ignore
export function useActiveWorkoutSessionSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<ActiveWorkoutSession, ActiveWorkoutSessionVariables>): ApolloReactHooks.UseSuspenseQueryResult<ActiveWorkoutSession, ActiveWorkoutSessionVariables>;
export function useActiveWorkoutSessionSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<ActiveWorkoutSession, ActiveWorkoutSessionVariables>): ApolloReactHooks.UseSuspenseQueryResult<ActiveWorkoutSession | undefined, ActiveWorkoutSessionVariables>;
export function useActiveWorkoutSessionSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<ActiveWorkoutSession, ActiveWorkoutSessionVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<ActiveWorkoutSession, ActiveWorkoutSessionVariables>(ActiveWorkoutSessionDocument, options);
        }
export type ActiveWorkoutSessionHookResult = ReturnType<typeof useActiveWorkoutSession>;
export type ActiveWorkoutSessionLazyQueryHookResult = ReturnType<typeof useActiveWorkoutSessionLazyQuery>;
export type ActiveWorkoutSessionSuspenseQueryHookResult = ReturnType<typeof useActiveWorkoutSessionSuspenseQuery>;
export type ActiveWorkoutSessionQueryResult = Apollo.QueryResult<ActiveWorkoutSession, ActiveWorkoutSessionVariables>;
export const RecoverableSessionsDocument = gql`
    query RecoverableSessions($limit: Int = 5) {
  recoverableSessions(limit: $limit) {
    id
    startedAt
    archivedAt
    archiveReason
    setsLogged
    totalVolume
    musclesWorked
    canRecover
  }
}
    `;

/**
 * __useRecoverableSessions__
 *
 * To run a query within a React component, call `useRecoverableSessions` and pass it any options that fit your needs.
 * When your component renders, `useRecoverableSessions` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRecoverableSessions({
 *   variables: {
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useRecoverableSessions(baseOptions?: ApolloReactHooks.QueryHookOptions<RecoverableSessions, RecoverableSessionsVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<RecoverableSessions, RecoverableSessionsVariables>(RecoverableSessionsDocument, options);
      }
export function useRecoverableSessionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<RecoverableSessions, RecoverableSessionsVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<RecoverableSessions, RecoverableSessionsVariables>(RecoverableSessionsDocument, options);
        }
// @ts-ignore
export function useRecoverableSessionsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<RecoverableSessions, RecoverableSessionsVariables>): ApolloReactHooks.UseSuspenseQueryResult<RecoverableSessions, RecoverableSessionsVariables>;
export function useRecoverableSessionsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<RecoverableSessions, RecoverableSessionsVariables>): ApolloReactHooks.UseSuspenseQueryResult<RecoverableSessions | undefined, RecoverableSessionsVariables>;
export function useRecoverableSessionsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<RecoverableSessions, RecoverableSessionsVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<RecoverableSessions, RecoverableSessionsVariables>(RecoverableSessionsDocument, options);
        }
export type RecoverableSessionsHookResult = ReturnType<typeof useRecoverableSessions>;
export type RecoverableSessionsLazyQueryHookResult = ReturnType<typeof useRecoverableSessionsLazyQuery>;
export type RecoverableSessionsSuspenseQueryHookResult = ReturnType<typeof useRecoverableSessionsSuspenseQuery>;
export type RecoverableSessionsQueryResult = Apollo.QueryResult<RecoverableSessions, RecoverableSessionsVariables>;
export const EconomyWalletDocument = gql`
    query EconomyWallet {
  economyWallet {
    balance {
      credits
      pending
      lifetime
    }
    transactions {
      id
      type
      amount
      description
      createdAt
    }
  }
}
    `;

/**
 * __useEconomyWallet__
 *
 * To run a query within a React component, call `useEconomyWallet` and pass it any options that fit your needs.
 * When your component renders, `useEconomyWallet` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEconomyWallet({
 *   variables: {
 *   },
 * });
 */
export function useEconomyWallet(baseOptions?: ApolloReactHooks.QueryHookOptions<EconomyWallet, EconomyWalletVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<EconomyWallet, EconomyWalletVariables>(EconomyWalletDocument, options);
      }
export function useEconomyWalletLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<EconomyWallet, EconomyWalletVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<EconomyWallet, EconomyWalletVariables>(EconomyWalletDocument, options);
        }
// @ts-ignore
export function useEconomyWalletSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<EconomyWallet, EconomyWalletVariables>): ApolloReactHooks.UseSuspenseQueryResult<EconomyWallet, EconomyWalletVariables>;
export function useEconomyWalletSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<EconomyWallet, EconomyWalletVariables>): ApolloReactHooks.UseSuspenseQueryResult<EconomyWallet | undefined, EconomyWalletVariables>;
export function useEconomyWalletSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<EconomyWallet, EconomyWalletVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<EconomyWallet, EconomyWalletVariables>(EconomyWalletDocument, options);
        }
export type EconomyWalletHookResult = ReturnType<typeof useEconomyWallet>;
export type EconomyWalletLazyQueryHookResult = ReturnType<typeof useEconomyWalletLazyQuery>;
export type EconomyWalletSuspenseQueryHookResult = ReturnType<typeof useEconomyWalletSuspenseQuery>;
export type EconomyWalletQueryResult = Apollo.QueryResult<EconomyWallet, EconomyWalletVariables>;
export const EconomyTransactionsDocument = gql`
    query EconomyTransactions($limit: Int = 20) {
  economyTransactions(limit: $limit) {
    id
    type
    amount
    description
    createdAt
    metadata
  }
}
    `;

/**
 * __useEconomyTransactions__
 *
 * To run a query within a React component, call `useEconomyTransactions` and pass it any options that fit your needs.
 * When your component renders, `useEconomyTransactions` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEconomyTransactions({
 *   variables: {
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useEconomyTransactions(baseOptions?: ApolloReactHooks.QueryHookOptions<EconomyTransactions, EconomyTransactionsVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<EconomyTransactions, EconomyTransactionsVariables>(EconomyTransactionsDocument, options);
      }
export function useEconomyTransactionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<EconomyTransactions, EconomyTransactionsVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<EconomyTransactions, EconomyTransactionsVariables>(EconomyTransactionsDocument, options);
        }
// @ts-ignore
export function useEconomyTransactionsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<EconomyTransactions, EconomyTransactionsVariables>): ApolloReactHooks.UseSuspenseQueryResult<EconomyTransactions, EconomyTransactionsVariables>;
export function useEconomyTransactionsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<EconomyTransactions, EconomyTransactionsVariables>): ApolloReactHooks.UseSuspenseQueryResult<EconomyTransactions | undefined, EconomyTransactionsVariables>;
export function useEconomyTransactionsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<EconomyTransactions, EconomyTransactionsVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<EconomyTransactions, EconomyTransactionsVariables>(EconomyTransactionsDocument, options);
        }
export type EconomyTransactionsHookResult = ReturnType<typeof useEconomyTransactions>;
export type EconomyTransactionsLazyQueryHookResult = ReturnType<typeof useEconomyTransactionsLazyQuery>;
export type EconomyTransactionsSuspenseQueryHookResult = ReturnType<typeof useEconomyTransactionsSuspenseQuery>;
export type EconomyTransactionsQueryResult = Apollo.QueryResult<EconomyTransactions, EconomyTransactionsVariables>;
export const StatLeaderboardDocument = gql`
    query StatLeaderboard($stat: String, $scope: String, $scopeValue: String, $limit: Int = 50, $afterRank: Int) {
  statLeaderboard(
    stat: $stat
    scope: $scope
    scopeValue: $scopeValue
    limit: $limit
    afterRank: $afterRank
  ) {
    entries {
      userId
      username
      avatarUrl
      statValue
      rank
      gender
      country
      state
      city
    }
    total
    nextCursor
  }
}
    `;

/**
 * __useStatLeaderboard__
 *
 * To run a query within a React component, call `useStatLeaderboard` and pass it any options that fit your needs.
 * When your component renders, `useStatLeaderboard` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStatLeaderboard({
 *   variables: {
 *      stat: // value for 'stat'
 *      scope: // value for 'scope'
 *      scopeValue: // value for 'scopeValue'
 *      limit: // value for 'limit'
 *      afterRank: // value for 'afterRank'
 *   },
 * });
 */
export function useStatLeaderboard(baseOptions?: ApolloReactHooks.QueryHookOptions<StatLeaderboard, StatLeaderboardVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<StatLeaderboard, StatLeaderboardVariables>(StatLeaderboardDocument, options);
      }
export function useStatLeaderboardLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<StatLeaderboard, StatLeaderboardVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<StatLeaderboard, StatLeaderboardVariables>(StatLeaderboardDocument, options);
        }
// @ts-ignore
export function useStatLeaderboardSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<StatLeaderboard, StatLeaderboardVariables>): ApolloReactHooks.UseSuspenseQueryResult<StatLeaderboard, StatLeaderboardVariables>;
export function useStatLeaderboardSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<StatLeaderboard, StatLeaderboardVariables>): ApolloReactHooks.UseSuspenseQueryResult<StatLeaderboard | undefined, StatLeaderboardVariables>;
export function useStatLeaderboardSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<StatLeaderboard, StatLeaderboardVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<StatLeaderboard, StatLeaderboardVariables>(StatLeaderboardDocument, options);
        }
export type StatLeaderboardHookResult = ReturnType<typeof useStatLeaderboard>;
export type StatLeaderboardLazyQueryHookResult = ReturnType<typeof useStatLeaderboardLazyQuery>;
export type StatLeaderboardSuspenseQueryHookResult = ReturnType<typeof useStatLeaderboardSuspenseQuery>;
export type StatLeaderboardQueryResult = Apollo.QueryResult<StatLeaderboard, StatLeaderboardVariables>;
export const MyCrewDocument = gql`
    query MyCrew {
  myCrew {
    crew {
      id
      name
      tag
      description
      avatar
      color
      ownerId
      memberCount
      totalTU
      weeklyTU
      wins
      losses
      createdAt
    }
    membership {
      id
      crewId
      userId
      role
      joinedAt
      weeklyTU
      totalTU
      username
      avatar
      archetype
    }
    members {
      id
      crewId
      userId
      role
      joinedAt
      weeklyTU
      totalTU
      username
      avatar
      archetype
    }
    stats {
      totalMembers
      totalTU
      weeklyTU
      warsWon
      warsLost
      currentStreak
    }
  }
}
    `;

/**
 * __useMyCrew__
 *
 * To run a query within a React component, call `useMyCrew` and pass it any options that fit your needs.
 * When your component renders, `useMyCrew` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyCrew({
 *   variables: {
 *   },
 * });
 */
export function useMyCrew(baseOptions?: ApolloReactHooks.QueryHookOptions<MyCrew, MyCrewVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MyCrew, MyCrewVariables>(MyCrewDocument, options);
      }
export function useMyCrewLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MyCrew, MyCrewVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MyCrew, MyCrewVariables>(MyCrewDocument, options);
        }
// @ts-ignore
export function useMyCrewSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<MyCrew, MyCrewVariables>): ApolloReactHooks.UseSuspenseQueryResult<MyCrew, MyCrewVariables>;
export function useMyCrewSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<MyCrew, MyCrewVariables>): ApolloReactHooks.UseSuspenseQueryResult<MyCrew | undefined, MyCrewVariables>;
export function useMyCrewSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<MyCrew, MyCrewVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<MyCrew, MyCrewVariables>(MyCrewDocument, options);
        }
export type MyCrewHookResult = ReturnType<typeof useMyCrew>;
export type MyCrewLazyQueryHookResult = ReturnType<typeof useMyCrewLazyQuery>;
export type MyCrewSuspenseQueryHookResult = ReturnType<typeof useMyCrewSuspenseQuery>;
export type MyCrewQueryResult = Apollo.QueryResult<MyCrew, MyCrewVariables>;
export const MyAchievementsDocument = gql`
    query MyAchievements($category: String, $limit: Int, $offset: Int) {
  myAchievements(category: $category, limit: $limit, offset: $offset) {
    achievements {
      id
      achievementKey
      achievementName
      achievementDescription
      achievementIcon
      category
      points
      rarity
      creditsEarned
      xpEarned
      isVerified
      witnessUsername
      earnedAt
    }
    total
  }
}
    `;

/**
 * __useMyAchievements__
 *
 * To run a query within a React component, call `useMyAchievements` and pass it any options that fit your needs.
 * When your component renders, `useMyAchievements` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyAchievements({
 *   variables: {
 *      category: // value for 'category'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useMyAchievements(baseOptions?: ApolloReactHooks.QueryHookOptions<MyAchievements, MyAchievementsVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MyAchievements, MyAchievementsVariables>(MyAchievementsDocument, options);
      }
export function useMyAchievementsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MyAchievements, MyAchievementsVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MyAchievements, MyAchievementsVariables>(MyAchievementsDocument, options);
        }
// @ts-ignore
export function useMyAchievementsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<MyAchievements, MyAchievementsVariables>): ApolloReactHooks.UseSuspenseQueryResult<MyAchievements, MyAchievementsVariables>;
export function useMyAchievementsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<MyAchievements, MyAchievementsVariables>): ApolloReactHooks.UseSuspenseQueryResult<MyAchievements | undefined, MyAchievementsVariables>;
export function useMyAchievementsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<MyAchievements, MyAchievementsVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<MyAchievements, MyAchievementsVariables>(MyAchievementsDocument, options);
        }
export type MyAchievementsHookResult = ReturnType<typeof useMyAchievements>;
export type MyAchievementsLazyQueryHookResult = ReturnType<typeof useMyAchievementsLazyQuery>;
export type MyAchievementsSuspenseQueryHookResult = ReturnType<typeof useMyAchievementsSuspenseQuery>;
export type MyAchievementsQueryResult = Apollo.QueryResult<MyAchievements, MyAchievementsVariables>;
export const GoalsDocument = gql`
    query Goals {
  goals {
    id
    userId
    type
    target
    current
    unit
    title
    description
    status
    deadline
    milestones {
      id
      goalId
      title
      target
      achieved
      achievedAt
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGoals__
 *
 * To run a query within a React component, call `useGoals` and pass it any options that fit your needs.
 * When your component renders, `useGoals` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGoals({
 *   variables: {
 *   },
 * });
 */
export function useGoals(baseOptions?: ApolloReactHooks.QueryHookOptions<Goals, GoalsVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<Goals, GoalsVariables>(GoalsDocument, options);
      }
export function useGoalsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<Goals, GoalsVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<Goals, GoalsVariables>(GoalsDocument, options);
        }
// @ts-ignore
export function useGoalsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<Goals, GoalsVariables>): ApolloReactHooks.UseSuspenseQueryResult<Goals, GoalsVariables>;
export function useGoalsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<Goals, GoalsVariables>): ApolloReactHooks.UseSuspenseQueryResult<Goals | undefined, GoalsVariables>;
export function useGoalsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<Goals, GoalsVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<Goals, GoalsVariables>(GoalsDocument, options);
        }
export type GoalsHookResult = ReturnType<typeof useGoals>;
export type GoalsLazyQueryHookResult = ReturnType<typeof useGoalsLazyQuery>;
export type GoalsSuspenseQueryHookResult = ReturnType<typeof useGoalsSuspenseQuery>;
export type GoalsQueryResult = Apollo.QueryResult<Goals, GoalsVariables>;
export const GetGoalDocument = gql`
    query GetGoal($id: ID!) {
  goal(id: $id) {
    id
    userId
    type
    target
    current
    unit
    title
    description
    status
    deadline
    milestones {
      id
      goalId
      title
      target
      achieved
      achievedAt
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetGoal__
 *
 * To run a query within a React component, call `useGetGoal` and pass it any options that fit your needs.
 * When your component renders, `useGetGoal` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGoal({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetGoal(baseOptions: ApolloReactHooks.QueryHookOptions<GetGoal, GetGoalVariables> & ({ variables: GetGoalVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetGoal, GetGoalVariables>(GetGoalDocument, options);
      }
export function useGetGoalLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetGoal, GetGoalVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetGoal, GetGoalVariables>(GetGoalDocument, options);
        }
// @ts-ignore
export function useGetGoalSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<GetGoal, GetGoalVariables>): ApolloReactHooks.UseSuspenseQueryResult<GetGoal, GetGoalVariables>;
export function useGetGoalSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetGoal, GetGoalVariables>): ApolloReactHooks.UseSuspenseQueryResult<GetGoal | undefined, GetGoalVariables>;
export function useGetGoalSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetGoal, GetGoalVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetGoal, GetGoalVariables>(GetGoalDocument, options);
        }
export type GetGoalHookResult = ReturnType<typeof useGetGoal>;
export type GetGoalLazyQueryHookResult = ReturnType<typeof useGetGoalLazyQuery>;
export type GetGoalSuspenseQueryHookResult = ReturnType<typeof useGetGoalSuspenseQuery>;
export type GetGoalQueryResult = Apollo.QueryResult<GetGoal, GetGoalVariables>;
export const GoalSuggestionsDocument = gql`
    query GoalSuggestions {
  goalSuggestions {
    type
    target
    unit
    title
    description
    reasoning
  }
}
    `;

/**
 * __useGoalSuggestions__
 *
 * To run a query within a React component, call `useGoalSuggestions` and pass it any options that fit your needs.
 * When your component renders, `useGoalSuggestions` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGoalSuggestions({
 *   variables: {
 *   },
 * });
 */
export function useGoalSuggestions(baseOptions?: ApolloReactHooks.QueryHookOptions<GoalSuggestions, GoalSuggestionsVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GoalSuggestions, GoalSuggestionsVariables>(GoalSuggestionsDocument, options);
      }
export function useGoalSuggestionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GoalSuggestions, GoalSuggestionsVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GoalSuggestions, GoalSuggestionsVariables>(GoalSuggestionsDocument, options);
        }
// @ts-ignore
export function useGoalSuggestionsSuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<GoalSuggestions, GoalSuggestionsVariables>): ApolloReactHooks.UseSuspenseQueryResult<GoalSuggestions, GoalSuggestionsVariables>;
export function useGoalSuggestionsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GoalSuggestions, GoalSuggestionsVariables>): ApolloReactHooks.UseSuspenseQueryResult<GoalSuggestions | undefined, GoalSuggestionsVariables>;
export function useGoalSuggestionsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GoalSuggestions, GoalSuggestionsVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GoalSuggestions, GoalSuggestionsVariables>(GoalSuggestionsDocument, options);
        }
export type GoalSuggestionsHookResult = ReturnType<typeof useGoalSuggestions>;
export type GoalSuggestionsLazyQueryHookResult = ReturnType<typeof useGoalSuggestionsLazyQuery>;
export type GoalSuggestionsSuspenseQueryHookResult = ReturnType<typeof useGoalSuggestionsSuspenseQuery>;
export type GoalSuggestionsQueryResult = Apollo.QueryResult<GoalSuggestions, GoalSuggestionsVariables>;