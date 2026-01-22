/**
 * GraphQL Mutations
 *
 * All mutation definitions for MuscleMap client
 */

import { gql } from '@apollo/client';

// ============================================
// AUTH
// ============================================

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        id
        email
        username
        level
        xp
        roles
        createdAt
      }
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        email
        username
        displayName
        level
        xp
        roles
        createdAt
      }
    }
  }
`;

// ============================================
// PROFILE
// ============================================

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: ProfileInput!) {
    updateProfile(input: $input) {
      id
      userId
      displayName
      bio
      avatar
      location
      visibility
      createdAt
      updatedAt
    }
  }
`;

// ============================================
// WORKOUTS
// ============================================

export const CREATE_WORKOUT_MUTATION = gql`
  mutation CreateWorkout($input: WorkoutInput!) {
    createWorkout(input: $input) {
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
        notes
        totalTU
        createdAt
      }
      tuEarned
      characterStats {
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
        currentStreak
      }
      levelUp
      newLevel
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

export const PREVIEW_WORKOUT_MUTATION = gql`
  mutation PreviewWorkout($input: WorkoutInput!) {
    previewWorkout(input: $input) {
      exercises {
        exerciseId
        name
        sets
        reps
        weight
      }
      estimatedTU
      estimatedXP
      musclesTargeted
    }
  }
`;

// ============================================
// GOALS
// ============================================

export const CREATE_GOAL_MUTATION = gql`
  mutation CreateGoal($input: GoalInput!) {
    createGoal(input: $input) {
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

export const DELETE_GOAL_MUTATION = gql`
  mutation DeleteGoal($id: ID!) {
    deleteGoal(id: $id)
  }
`;

// ============================================
// ARCHETYPES
// ============================================

export const SELECT_ARCHETYPE_MUTATION = gql`
  mutation SelectArchetype($archetypeId: ID!) {
    selectArchetype(archetypeId: $archetypeId) {
      success
      archetype {
        id
        name
        description
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

// ============================================
// ECONOMY
// ============================================

export const CHARGE_CREDITS_MUTATION = gql`
  mutation ChargeCredits($input: ChargeInput!) {
    chargeCredits(input: $input) {
      success
      newBalance
      error
    }
  }
`;

// ============================================
// TIPS
// ============================================

export const MARK_TIP_SEEN_MUTATION = gql`
  mutation MarkTipSeen($tipId: ID!) {
    markTipSeen(tipId: $tipId)
  }
`;

// ============================================
// LOGGING
// ============================================

export const LOG_FRONTEND_ERROR_MUTATION = gql`
  mutation LogFrontendError($input: FrontendLogInput!) {
    logFrontendError(input: $input)
  }
`;

// ============================================
// WORKOUT SESSIONS (Real-Time Logging)
// ============================================

export const START_WORKOUT_SESSION_MUTATION = gql`
  mutation StartWorkoutSession($input: StartWorkoutSessionInput!) {
    startWorkoutSession(input: $input) {
      success
      session {
        id
        userId
        startedAt
        sets {
          id
          exerciseId
          exerciseName
          setNumber
          reps
          weightKg
          rpe
          tu
        }
        totalVolume
        totalTU
        musclesWorked {
          muscleId
          muscleName
          totalTU
          setCount
        }
      }
      error
    }
  }
`;

export const LOG_SET_MUTATION = gql`
  mutation LogSet($input: LogSetInput!) {
    logSet(input: $input) {
      success
      set {
        id
        exerciseId
        exerciseName
        setNumber
        reps
        weightKg
        rpe
        rir
        durationSeconds
        tu
        muscleActivations {
          muscleId
          muscleName
          activationPercent
          tu
        }
        isPRWeight
        isPR1RM
        isPRVolume
        notes
        performedAt
      }
      sessionUpdate {
        totalVolume
        totalTU
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
          value
          previousValue
        }
      }
      error
    }
  }
`;

export const UPDATE_SET_MUTATION = gql`
  mutation UpdateSet($input: UpdateSetInput!) {
    updateSet(input: $input) {
      success
      set {
        id
        exerciseId
        exerciseName
        setNumber
        reps
        weightKg
        rpe
        tu
        muscleActivations {
          muscleId
          muscleName
          activationPercent
          tu
        }
        isPRWeight
        isPR1RM
        performedAt
      }
      error
    }
  }
`;

export const DELETE_SET_MUTATION = gql`
  mutation DeleteSet($sessionId: ID!, $setId: ID!) {
    deleteSet(sessionId: $sessionId, setId: $setId) {
      success
      error
    }
  }
`;

export const PAUSE_WORKOUT_SESSION_MUTATION = gql`
  mutation PauseWorkoutSession($sessionId: ID!) {
    pauseWorkoutSession(sessionId: $sessionId) {
      success
      pausedAt
      error
    }
  }
`;

export const RESUME_WORKOUT_SESSION_MUTATION = gql`
  mutation ResumeWorkoutSession($sessionId: ID!) {
    resumeWorkoutSession(sessionId: $sessionId) {
      success
      totalPausedTime
      error
    }
  }
`;

export const COMPLETE_WORKOUT_SESSION_MUTATION = gql`
  mutation CompleteWorkoutSession($input: CompleteWorkoutSessionInput!) {
    completeWorkoutSession(input: $input) {
      success
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
      tuEarned
      xpEarned
      characterStats {
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
        currentStreak
      }
      levelUp
      newLevel
      achievements {
        id
        name
        description
        icon
        rarity
        unlockedAt
      }
      sessionSummary {
        duration
        totalSets
        totalVolume
        totalTU
        exerciseCount
        musclesWorked {
          muscleId
          muscleName
          totalTU
          setCount
        }
        prs {
          exerciseId
          exerciseName
          prType
          value
          previousValue
        }
      }
      error
    }
  }
`;

export const ABANDON_WORKOUT_SESSION_MUTATION = gql`
  mutation AbandonWorkoutSession($sessionId: ID!) {
    abandonWorkoutSession(sessionId: $sessionId) {
      success
      error
    }
  }
`;

export const RECOVER_WORKOUT_SESSION_MUTATION = gql`
  mutation RecoverWorkoutSession($sessionId: ID!) {
    recoverWorkoutSession(sessionId: $sessionId) {
      success
      session {
        id
        userId
        startedAt
        pausedAt
        totalPausedTime
        sets {
          id
          exerciseId
          exerciseName
          setNumber
          reps
          weightKg
          rpe
          tu
          performedAt
        }
        totalVolume
        totalTU
        musclesWorked {
          muscleId
          muscleName
          totalTU
          setCount
        }
      }
      error
    }
  }
`;
