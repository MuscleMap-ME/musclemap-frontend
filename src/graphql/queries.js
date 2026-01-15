/**
 * GraphQL Queries
 *
 * All query definitions for MuscleMap client
 */

import { gql } from '@apollo/client';

// ============================================
// AUTH & USER
// ============================================

export const ME_QUERY = gql`
  query Me {
    me {
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
  }
`;

export const MY_CAPABILITIES_QUERY = gql`
  query MyCapabilities {
    myCapabilities {
      canCreateWorkout
      canJoinHangouts
      canMessage
      canVote
      isAdmin
      isPremium
      dailyWorkoutLimit
      remainingWorkouts
    }
  }
`;

// ============================================
// EXERCISES & MUSCLES
// ============================================

export const EXERCISES_QUERY = gql`
  query Exercises($search: String, $muscleGroup: String, $equipment: String, $limit: Int) {
    exercises(search: $search, muscleGroup: $muscleGroup, equipment: $equipment, limit: $limit) {
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

export const EXERCISE_QUERY = gql`
  query Exercise($id: ID!) {
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

export const MUSCLES_QUERY = gql`
  query Muscles {
    muscles {
      id
      name
      group
      subGroup
      description
    }
  }
`;

// ============================================
// EXERCISE HISTORY (PRs and Best Lifts)
// ============================================

export const EXERCISE_HISTORY_QUERY = gql`
  query ExerciseHistory($exerciseIds: [ID!]!) {
    exerciseHistory(exerciseIds: $exerciseIds) {
      exerciseId
      exerciseName
      bestWeight
      best1RM
      bestVolume
      lastPerformedAt
      totalSessions
    }
  }
`;

// ============================================
// WORKOUTS
// ============================================

export const MY_WORKOUTS_QUERY = gql`
  query MyWorkouts($limit: Int, $offset: Int) {
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

export const MY_WORKOUT_STATS_QUERY = gql`
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

export const WORKOUT_QUERY = gql`
  query Workout($id: ID!) {
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

// ============================================
// GOALS
// ============================================

export const GOALS_QUERY = gql`
  query Goals {
    goals {
      id
      userId
      type
      title
      description
      target
      current
      unit
      deadline
      status
      createdAt
      updatedAt
    }
  }
`;

// ============================================
// JOURNEY & ARCHETYPES
// ============================================

export const JOURNEY_QUERY = gql`
  query Journey {
    journey {
      userId
      archetype {
        id
        name
        description
        icon
        color
      }
      currentLevel
      currentXP
      xpToNextLevel
      totalXP
      completedMilestones
      unlockedAbilities
    }
  }
`;

export const ARCHETYPES_QUERY = gql`
  query Archetypes {
    archetypes {
      id
      name
      description
      philosophy
      icon
      color
      primaryStats
      bonuses
    }
  }
`;

// ============================================
// STATS
// ============================================

export const MY_STATS_QUERY = gql`
  query MyStats {
    myStats {
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

export const LEADERBOARDS_QUERY = gql`
  query Leaderboards($type: String) {
    leaderboards(type: $type) {
      rank
      userId
      username
      avatar
      level
      xp
      stat
      value
    }
  }
`;

// ============================================
// COMMUNITY
// ============================================

export const PUBLIC_COMMUNITY_STATS_QUERY = gql`
  query PublicCommunityStats {
    publicCommunityStats {
      activeNow {
        value
        display
      }
      activeWorkouts {
        value
        display
      }
      totalUsers {
        value
        display
      }
      totalWorkouts {
        value
        display
      }
      recentActivity {
        id
        type
        message
        timestamp
      }
      milestone {
        type
        value
        reached
      }
    }
  }
`;

export const COMMUNITY_STATS_QUERY = gql`
  query CommunityStats {
    communityStats {
      activeUsers
      activeWorkouts
      totalWorkoutsToday
      totalWorkoutsWeek
      topArchetype
    }
  }
`;

// ============================================
// ECONOMY
// ============================================

export const CREDITS_BALANCE_QUERY = gql`
  query CreditsBalance {
    creditsBalance {
      credits
      pending
      lifetime
    }
  }
`;

export const ECONOMY_BALANCE_QUERY = gql`
  query EconomyBalance {
    economyBalance {
      credits
      pending
      lifetime
    }
  }
`;

// ============================================
// TIPS
// ============================================

export const TIPS_QUERY = gql`
  query Tips($context: String, $exerciseId: ID) {
    tips(context: $context, exerciseId: $exerciseId) {
      id
      type
      title
      content
      category
      exerciseId
      priority
      seen
    }
  }
`;

// ============================================
// HEALTH
// ============================================

export const HEALTH_QUERY = gql`
  query Health {
    health {
      status
      timestamp
    }
  }
`;

export const HEALTH_DETAILED_QUERY = gql`
  query HealthDetailed {
    healthDetailed {
      status
      version
      uptime
      database {
        connected
        latency
      }
      redis {
        connected
        latency
      }
      memory {
        used
        total
        percentage
      }
    }
  }
`;
