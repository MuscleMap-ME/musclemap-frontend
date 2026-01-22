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
  mutation StartWorkoutSession($input: StartWorkoutSessionInput) {
    startWorkoutSession(input: $input) {
      session {
        id
        userId
        startedAt
        pausedAt
        totalPausedTime
        lastActivityAt
        currentExerciseIndex
        currentSetIndex
        sets {
          id
          exerciseId
          exerciseName
          setNumber
          reps
          weightKg
          rpe
          rir
          durationSeconds
          restSeconds
          tag
          tu
          muscleActivations {
            muscleId
            muscleName
            activation
            tu
          }
          isPRWeight
          isPRReps
          isPR1RM
          notes
          performedAt
        }
        totalVolume
        totalReps
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
        estimatedCalories
      }
      setLogged {
        id
        exerciseId
        exerciseName
        tu
      }
      prsAchieved {
        exerciseId
        exerciseName
        prType
        newValue
        previousValue
      }
    }
  }
`;

export const LOG_SET_MUTATION = gql`
  mutation LogSet($input: LogSetInput!) {
    logSet(input: $input) {
      session {
        id
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
        sets {
          id
          exerciseId
          exerciseName
          setNumber
          reps
          weightKg
          rpe
          rir
          durationSeconds
          restSeconds
          tag
          tu
          muscleActivations {
            muscleId
            muscleName
            activation
            tu
          }
          isPRWeight
          isPRReps
          isPR1RM
          notes
          performedAt
        }
      }
      setLogged {
        id
        exerciseId
        exerciseName
        setNumber
        reps
        weightKg
        rpe
        rir
        durationSeconds
        restSeconds
        tag
        tu
        muscleActivations {
          muscleId
          muscleName
          activation
          tu
        }
        isPRWeight
        isPRReps
        isPR1RM
        notes
        performedAt
      }
      prsAchieved {
        exerciseId
        exerciseName
        prType
        newValue
        previousValue
        improvementPercent
        achievedAt
      }
    }
  }
`;

export const UPDATE_SET_MUTATION = gql`
  mutation UpdateSet($input: UpdateSetInput!) {
    updateSet(input: $input) {
      id
      exerciseId
      exerciseName
      setNumber
      reps
      weightKg
      rpe
      rir
      durationSeconds
      restSeconds
      tag
      tu
      muscleActivations {
        muscleId
        muscleName
        activation
        tu
      }
      isPRWeight
      isPRReps
      isPR1RM
      notes
      performedAt
    }
  }
`;

export const DELETE_SET_MUTATION = gql`
  mutation DeleteSet($setId: ID!) {
    deleteSet(setId: $setId)
  }
`;

export const PAUSE_WORKOUT_SESSION_MUTATION = gql`
  mutation PauseWorkoutSession($sessionId: ID!) {
    pauseWorkoutSession(sessionId: $sessionId) {
      id
      pausedAt
      totalPausedTime
    }
  }
`;

export const RESUME_WORKOUT_SESSION_MUTATION = gql`
  mutation ResumeWorkoutSession($sessionId: ID!) {
    resumeWorkoutSession(sessionId: $sessionId) {
      id
      pausedAt
      totalPausedTime
    }
  }
`;

export const COMPLETE_WORKOUT_SESSION_MUTATION = gql`
  mutation CompleteWorkoutSession($input: CompleteWorkoutSessionInput!) {
    completeWorkoutSession(input: $input) {
      workout {
        id
        userId
      }
      session {
        id
        sets {
          id
          exerciseId
          exerciseName
          setNumber
          reps
          weightKg
          tu
        }
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
        percentageOfMax
      }
      prsAchieved {
        exerciseId
        exerciseName
        prType
        newValue
        previousValue
        improvementPercent
        achievedAt
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

export const ABANDON_WORKOUT_SESSION_MUTATION = gql`
  mutation AbandonWorkoutSession($sessionId: ID!, $reason: String) {
    abandonWorkoutSession(sessionId: $sessionId, reason: $reason)
  }
`;

export const RECOVER_WORKOUT_SESSION_MUTATION = gql`
  mutation RecoverWorkoutSession($archivedSessionId: ID!) {
    recoverWorkoutSession(archivedSessionId: $archivedSessionId) {
      id
      userId
      startedAt
      pausedAt
      totalPausedTime
      lastActivityAt
      currentExerciseIndex
      currentSetIndex
      sets {
        id
        exerciseId
        exerciseName
        setNumber
        reps
        weightKg
        rpe
        rir
        durationSeconds
        restSeconds
        tag
        tu
        muscleActivations {
          muscleId
          muscleName
          activation
          tu
        }
        isPRWeight
        isPRReps
        isPR1RM
        notes
        performedAt
      }
      totalVolume
      totalReps
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
      estimatedCalories
    }
  }
`;
