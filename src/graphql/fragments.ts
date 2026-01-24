/**
 * GraphQL Fragments
 *
 * Reusable field selections for common types.
 * Using fragments reduces code duplication and ensures consistency
 * across queries and mutations.
 *
 * Usage:
 *   import { USER_CORE_FIELDS, EXERCISE_FIELDS } from './fragments';
 *
 *   const MY_QUERY = gql`
 *     query MyQuery {
 *       user {
 *         ...UserCoreFields
 *       }
 *     }
 *     ${USER_CORE_FIELDS}
 *   `;
 */

import { gql } from '@apollo/client/core';

// ============================================
// USER FRAGMENTS
// ============================================

/**
 * Core user fields - minimal user info for lists and references
 */
export const USER_CORE_FIELDS = gql`
  fragment UserCoreFields on User {
    id
    username
    displayName
    avatar
  }
`;

/**
 * Extended user fields - includes level, XP, roles
 */
export const USER_EXTENDED_FIELDS = gql`
  fragment UserExtendedFields on User {
    id
    email
    username
    displayName
    avatar
    level
    xp
    roles
    createdAt
  }
`;

/**
 * Full user profile fields
 */
export const USER_PROFILE_FIELDS = gql`
  fragment UserProfileFields on User {
    id
    email
    username
    displayName
    avatar
    bio
    level
    xp
    totalTu
    wealthTier
    creditBalance
    roles
    verified
    createdAt
    updatedAt
  }
`;

// ============================================
// EXERCISE FRAGMENTS
// ============================================

/**
 * Core exercise fields - for lists and search results
 */
export const EXERCISE_CORE_FIELDS = gql`
  fragment ExerciseCoreFields on Exercise {
    id
    name
    type
    primaryMuscles
    equipment
    difficulty
    imageUrl
  }
`;

/**
 * Full exercise fields - for detail views
 */
export const EXERCISE_FULL_FIELDS = gql`
  fragment ExerciseFullFields on Exercise {
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
`;

// ============================================
// WORKOUT FRAGMENTS
// ============================================

/**
 * Core workout fields - for lists
 */
export const WORKOUT_CORE_FIELDS = gql`
  fragment WorkoutCoreFields on Workout {
    id
    date
    totalTu
    exerciseCount
    notes
    createdAt
  }
`;

/**
 * Workout set fields
 */
export const WORKOUT_SET_FIELDS = gql`
  fragment WorkoutSetFields on WorkoutSet {
    id
    exerciseId
    setNumber
    reps
    weight
    rpe
    tu
    notes
    createdAt
  }
`;

/**
 * Full workout with sets
 */
export const WORKOUT_FULL_FIELDS = gql`
  fragment WorkoutFullFields on Workout {
    id
    date
    totalTu
    notes
    exerciseCount
    duration
    createdAt
    sets {
      ...WorkoutSetFields
    }
  }
  ${WORKOUT_SET_FIELDS}
`;

// ============================================
// MUSCLE FRAGMENTS
// ============================================

/**
 * Muscle info fields
 */
export const MUSCLE_FIELDS = gql`
  fragment MuscleFields on Muscle {
    id
    name
    group
    subGroup
    description
  }
`;

/**
 * Muscle activation fields (for heatmaps)
 */
export const MUSCLE_ACTIVATION_FIELDS = gql`
  fragment MuscleActivationFields on MuscleActivation {
    muscleId
    intensity
    lastWorked
    totalVolume
  }
`;

// ============================================
// STATS FRAGMENTS
// ============================================

/**
 * Basic stats period
 */
export const STATS_PERIOD_FIELDS = gql`
  fragment StatsPeriodFields on StatsPeriod {
    workouts
    tu
    avgTuPerWorkout
  }
`;

/**
 * Character stats fields
 */
export const CHARACTER_STATS_FIELDS = gql`
  fragment CharacterStatsFields on CharacterStats {
    strength
    endurance
    flexibility
    power
    speed
    balance
  }
`;

// ============================================
// ECONOMY FRAGMENTS
// ============================================

/**
 * Credit balance fields
 */
export const BALANCE_FIELDS = gql`
  fragment BalanceFields on Balance {
    credits
    pending
    lifetime
  }
`;

/**
 * Transaction fields
 */
export const TRANSACTION_FIELDS = gql`
  fragment TransactionFields on Transaction {
    id
    type
    amount
    description
    balanceAfter
    createdAt
  }
`;

/**
 * Wallet info fields
 */
export const WALLET_INFO_FIELDS = gql`
  fragment WalletInfoFields on WalletInfo {
    balance
    lifetimeEarned
    lifetimeSpent
    wealthTier
    wealthTierName
    wealthTierColor
    creditsToNextTier
    wealthTierProgress
  }
`;

// ============================================
// ACHIEVEMENT FRAGMENTS
// ============================================

/**
 * Achievement definition fields
 */
export const ACHIEVEMENT_FIELDS = gql`
  fragment AchievementFields on Achievement {
    id
    key
    name
    description
    category
    tier
    iconUrl
    xpReward
    creditReward
    requiresVerification
    createdAt
  }
`;

/**
 * User achievement progress fields
 */
export const USER_ACHIEVEMENT_FIELDS = gql`
  fragment UserAchievementFields on UserAchievement {
    id
    achievementId
    status
    progress
    progressMax
    unlockedAt
    verifiedAt
    achievement {
      ...AchievementFields
    }
  }
  ${ACHIEVEMENT_FIELDS}
`;

// ============================================
// COMMUNITY FRAGMENTS
// ============================================

/**
 * Feed item fields
 */
export const FEED_ITEM_FIELDS = gql`
  fragment FeedItemFields on FeedItem {
    id
    type
    payload
    visibilityScope
    geoBucket
    createdAt
    user {
      ...UserCoreFields
    }
  }
  ${USER_CORE_FIELDS}
`;

/**
 * Conversation fields
 */
export const CONVERSATION_FIELDS = gql`
  fragment ConversationFields on Conversation {
    id
    type
    name
    avatarUrl
    lastMessageAt
    unreadCount
    muted
    pinned
  }
`;

/**
 * Message fields
 */
export const MESSAGE_FIELDS = gql`
  fragment MessageFields on Message {
    id
    conversationId
    senderId
    content
    type
    replyToId
    editedAt
    deletedAt
    createdAt
    sender {
      ...UserCoreFields
    }
  }
  ${USER_CORE_FIELDS}
`;

// ============================================
// GOAL FRAGMENTS
// ============================================

/**
 * Goal fields
 */
export const GOAL_FIELDS = gql`
  fragment GoalFields on Goal {
    id
    type
    title
    description
    target
    current
    unit
    deadline
    status
    isPrimary
    createdAt
    updatedAt
  }
`;

// ============================================
// JOURNEY/ARCHETYPE FRAGMENTS
// ============================================

/**
 * Archetype fields
 */
export const ARCHETYPE_FIELDS = gql`
  fragment ArchetypeFields on Archetype {
    id
    name
    description
    icon
    color
    category
    traits
    strengths
    focusAreas
  }
`;

/**
 * Journey progress fields
 */
export const JOURNEY_FIELDS = gql`
  fragment JourneyFields on Journey {
    userId
    archetype {
      ...ArchetypeFields
    }
    currentLevel
    currentXP
    xpToNextLevel
    totalXP
    completedMilestones
    unlockedAbilities
  }
  ${ARCHETYPE_FIELDS}
`;

// ============================================
// PAGINATION FRAGMENTS
// ============================================

/**
 * Page info for cursor-based pagination
 */
export const PAGE_INFO_FIELDS = gql`
  fragment PageInfoFields on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
`;

// ============================================
// VERIFICATION FRAGMENTS
// ============================================

/**
 * Witness info fields
 */
export const WITNESS_INFO_FIELDS = gql`
  fragment WitnessInfoFields on WitnessInfo {
    id
    witnessUserId
    witnessUsername
    witnessDisplayName
    witnessAvatarUrl
    attestationText
    relationship
    locationDescription
    status
    isPublic
    requestedAt
    respondedAt
  }
`;

/**
 * Achievement verification fields
 */
export const VERIFICATION_FIELDS = gql`
  fragment VerificationFields on AchievementVerification {
    id
    userId
    achievementId
    achievementKey
    achievementName
    achievementTier
    videoUrl
    thumbnailUrl
    videoDurationSeconds
    status
    notes
    rejectionReason
    submittedAt
    verifiedAt
    expiresAt
    createdAt
    updatedAt
    username
    displayName
    avatarUrl
    witness {
      ...WitnessInfoFields
    }
  }
  ${WITNESS_INFO_FIELDS}
`;

// ============================================
// LEADERBOARD FRAGMENTS
// ============================================

/**
 * Leaderboard entry fields
 */
export const LEADERBOARD_ENTRY_FIELDS = gql`
  fragment LeaderboardEntryFields on LeaderboardEntry {
    rank
    userId
    username
    displayName
    avatar
    value
    trend
  }
`;

// ============================================
// COMPETITION FRAGMENTS
// ============================================

/**
 * Competition fields
 */
export const COMPETITION_FIELDS = gql`
  fragment CompetitionFields on Competition {
    id
    name
    description
    type
    metric
    startDate
    endDate
    status
    entryFee
    prizePool
    maxParticipants
    participantCount
    createdBy
    createdAt
  }
`;

// ============================================
// TRAINER FRAGMENTS
// ============================================

/**
 * Trainer profile fields
 */
export const TRAINER_PROFILE_FIELDS = gql`
  fragment TrainerProfileFields on TrainerProfile {
    userId
    displayName
    bio
    specialties
    certifications
    hourlyRateCredits
    perClassRateCredits
    verified
    verifiedAt
    ratingAvg
    ratingCount
    totalClassesTaught
    totalStudentsTrained
    totalCreditsEarned
    status
    createdAt
  }
`;

/**
 * Trainer class fields
 */
export const TRAINER_CLASS_FIELDS = gql`
  fragment TrainerClassFields on TrainerClass {
    id
    trainerUserId
    title
    description
    category
    difficulty
    startAt
    durationMinutes
    locationType
    locationDetails
    capacity
    enrolledCount
    creditsPerStudent
    trainerWagePerStudent
    status
    createdAt
  }
`;
