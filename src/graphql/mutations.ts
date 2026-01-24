/**
 * GraphQL Mutations
 *
 * All mutation definitions for MuscleMap client
 */

import { gql } from '@apollo/client/core';

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

// ============================================
// MESSAGING
// ============================================

export const CREATE_CONVERSATION_MUTATION = gql`
  mutation CreateConversation($participantIds: [ID!]!) {
    createConversation(participantIds: $participantIds) {
      id
      type
      participants {
        id
        username
        avatar
      }
      createdAt
    }
  }
`;

export const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($conversationId: ID!, $content: String!) {
    sendMessage(conversationId: $conversationId, content: $content) {
      id
      conversationId
      senderId
      content
      createdAt
    }
  }
`;

export const MARK_CONVERSATION_READ_MUTATION = gql`
  mutation MarkConversationRead($conversationId: ID!) {
    markConversationRead(conversationId: $conversationId)
  }
`;

export const DELETE_MESSAGE_MUTATION = gql`
  mutation DeleteMessage($messageId: ID!) {
    deleteMessage(messageId: $messageId)
  }
`;

export const BLOCK_USER_MUTATION = gql`
  mutation BlockUser($userId: ID!) {
    blockUser(userId: $userId)
  }
`;

export const UNBLOCK_USER_MUTATION = gql`
  mutation UnblockUser($userId: ID!) {
    unblockUser(userId: $userId)
  }
`;

// ============================================
// ISSUES
// ============================================

export const CREATE_ISSUE_MUTATION = gql`
  mutation CreateIssue($input: IssueInput!) {
    createIssue(input: $input) {
      id
      title
      description
      status
      priority
      labels
      createdAt
    }
  }
`;

export const UPDATE_ISSUE_MUTATION = gql`
  mutation UpdateIssue($id: ID!, $input: IssueUpdateInput!) {
    updateIssue(id: $id, input: $input) {
      id
      title
      description
      status
      priority
      labels
      updatedAt
    }
  }
`;

export const VOTE_ON_ISSUE_MUTATION = gql`
  mutation VoteOnIssue($issueId: ID!, $vote: Int!) {
    voteOnIssue(issueId: $issueId, vote: $vote) {
      id
      voteCount
      hasVoted
    }
  }
`;

export const CREATE_ISSUE_COMMENT_MUTATION = gql`
  mutation CreateIssueComment($issueId: ID!, $content: String!) {
    createIssueComment(issueId: $issueId, content: $content) {
      id
      content
      author {
        id
        username
        avatar
      }
      createdAt
    }
  }
`;

export const SUBSCRIBE_TO_ISSUE_MUTATION = gql`
  mutation SubscribeToIssue($issueId: ID!) {
    subscribeToIssue(issueId: $issueId)
  }
`;

// ============================================
// ROADMAP
// ============================================

export const CREATE_ROADMAP_ITEM_MUTATION = gql`
  mutation CreateRoadmapItem($input: RoadmapInput!) {
    createRoadmapItem(input: $input) {
      id
      title
      description
      status
      quarter
      priority
    }
  }
`;

export const VOTE_ON_ROADMAP_ITEM_MUTATION = gql`
  mutation VoteOnRoadmapItem($itemId: ID!) {
    voteOnRoadmapItem(itemId: $itemId) {
      id
      voteCount
      hasVoted
    }
  }
`;

// ============================================
// SKILLS
// ============================================

export const PRACTICE_SKILL_MUTATION = gql`
  mutation PracticeSkill($skillId: ID!, $duration: Int!) {
    practiceSkill(skillId: $skillId, duration: $duration) {
      skillId
      xpEarned
      newLevel
      levelUp
    }
  }
`;

export const ACHIEVE_SKILL_MUTATION = gql`
  mutation AchieveSkill($skillId: ID!) {
    achieveSkill(skillId: $skillId) {
      success
      achievement {
        id
        name
        description
      }
    }
  }
`;

// ============================================
// MARTIAL ARTS
// ============================================

export const PRACTICE_MARTIAL_ART_MUTATION = gql`
  mutation PracticeMartialArt($disciplineId: ID!, $duration: Int!, $techniques: [String!]) {
    practiceMartialArt(disciplineId: $disciplineId, duration: $duration, techniques: $techniques) {
      xpEarned
      newBelt
      beltUp
      techniquesLearned
    }
  }
`;

export const MASTER_MARTIAL_ART_MUTATION = gql`
  mutation MasterMartialArt($disciplineId: ID!) {
    masterMartialArt(disciplineId: $disciplineId) {
      success
      newBelt
      reward {
        type
        value
      }
    }
  }
`;

// ============================================
// PRESCRIPTION
// ============================================

export const GENERATE_PRESCRIPTION_MUTATION = gql`
  mutation GeneratePrescription($input: PrescriptionInput!) {
    generatePrescription(input: $input) {
      id
      userId
      exercises {
        exerciseId
        name
        sets
        reps
        weight
        restSeconds
        notes
      }
      targetMuscles
      difficulty
      estimatedDuration
      createdAt
    }
  }
`;

// ============================================
// COMPETITIONS
// ============================================

export const JOIN_COMPETITION_MUTATION = gql`
  mutation JoinCompetition($competitionId: ID!) {
    joinCompetition(competitionId: $competitionId) {
      success
      message
      entry {
        id
        competitionId
        userId
        rank
        score
        joinedAt
      }
    }
  }
`;

export const CREATE_COMPETITION_MUTATION = gql`
  mutation CreateCompetition($input: CompetitionInput!) {
    createCompetition(input: $input) {
      id
      name
      description
      type
      status
      startDate
      endDate
      participantCount
      goalTu
      hasJoined
      createdAt
    }
  }
`;

// ============================================
// TRAINERS
// ============================================

export const UPDATE_TRAINER_PROFILE_MUTATION = gql`
  mutation UpdateTrainerProfile($input: TrainerProfileInput!) {
    updateTrainerProfile(input: $input) {
      id
      name
      bio
      specialties
      hourlyRate
      available
    }
  }
`;

export const CREATE_CLASS_MUTATION = gql`
  mutation CreateClass($input: ClassInput!) {
    createClass(input: $input) {
      id
      name
      description
      type
      duration
      maxParticipants
      scheduledAt
      price
    }
  }
`;

// ============================================
// BUDDY
// ============================================

export const UPDATE_BUDDY_MUTATION = gql`
  mutation UpdateBuddy($input: BuddyInput!) {
    updateBuddy(input: $input) {
      id
      nickname
      mood
    }
  }
`;

export const FEED_BUDDY_MUTATION = gql`
  mutation FeedBuddy {
    feedBuddy {
      id
      hunger
      mood
      xpEarned
    }
  }
`;

export const EQUIP_BUDDY_ITEM_MUTATION = gql`
  mutation EquipBuddyItem($itemId: ID!) {
    equipBuddyItem(itemId: $itemId) {
      success
      buddy {
        id
        equippedItems
      }
    }
  }
`;

// ============================================
// COLLECTION
// ============================================

export const TOGGLE_FAVORITE_MUTATION = gql`
  mutation ToggleFavorite($itemId: ID!) {
    toggleFavorite(itemId: $itemId) {
      id
      isFavorite
    }
  }
`;

// ============================================
// MARKETPLACE
// ============================================

export const CREATE_LISTING_MUTATION = gql`
  mutation CreateListing($input: ListingInput!) {
    createListing(input: $input) {
      id
      item {
        id
        name
      }
      price
      status
      createdAt
    }
  }
`;

export const PURCHASE_LISTING_MUTATION = gql`
  mutation PurchaseListing($listingId: ID!) {
    purchaseListing(listingId: $listingId) {
      success
      item {
        id
        name
      }
      newBalance
    }
  }
`;

export const ADD_TO_WATCHLIST_MUTATION = gql`
  mutation AddToWatchlist($listingId: ID!) {
    addToWatchlist(listingId: $listingId) {
      success
    }
  }
`;

// ============================================
// TRADES
// ============================================

export const CREATE_TRADE_MUTATION = gql`
  mutation CreateTrade($input: TradeInput!) {
    createTrade(input: $input) {
      id
      to {
        id
        username
      }
      offeredItems {
        id
        name
      }
      requestedItems {
        id
        name
      }
      status
      createdAt
    }
  }
`;

export const ACCEPT_TRADE_MUTATION = gql`
  mutation AcceptTrade($tradeId: ID!) {
    acceptTrade(tradeId: $tradeId) {
      success
      trade {
        id
        status
      }
    }
  }
`;

export const REJECT_TRADE_MUTATION = gql`
  mutation RejectTrade($tradeId: ID!) {
    rejectTrade(tradeId: $tradeId) {
      success
    }
  }
`;

// ============================================
// MYSTERY BOXES
// ============================================

export const OPEN_MYSTERY_BOX_MUTATION = gql`
  mutation OpenMysteryBox($boxId: ID!) {
    openMysteryBox(boxId: $boxId) {
      success
      rewards {
        id
        name
        rarity
        imageUrl
      }
      newBalance
    }
  }
`;

// ============================================
// SKINS
// ============================================

export const PURCHASE_SKIN_MUTATION = gql`
  mutation PurchaseSkin($skinId: ID!) {
    purchaseSkin(skinId: $skinId) {
      success
      skin {
        id
        name
      }
      newBalance
    }
  }
`;

export const EQUIP_SKIN_MUTATION = gql`
  mutation EquipSkin($skinId: ID!) {
    equipSkin(skinId: $skinId) {
      success
    }
  }
`;

// ============================================
// FEEDBACK
// ============================================

export const SUBMIT_FEEDBACK_MUTATION = gql`
  mutation SubmitFeedback($input: FeedbackInput!) {
    submitFeedback(input: $input) {
      id
      type
      message
      status
      createdAt
    }
  }
`;

// ============================================
// ADMIN
// ============================================

export const ADMIN_ADJUST_CREDITS_MUTATION = gql`
  mutation AdminAdjustCredits($userId: ID!, $amount: Int!, $reason: String!) {
    adminAdjustCredits(userId: $userId, amount: $amount, reason: $reason) {
      success
      newBalance
    }
  }
`;

export const ADMIN_BAN_USER_MUTATION = gql`
  mutation AdminBanUser($userId: ID!, $reason: String!, $duration: Int) {
    adminBanUser(userId: $userId, reason: $reason, duration: $duration) {
      success
    }
  }
`;

export const ADMIN_GRANT_ACHIEVEMENT_MUTATION = gql`
  mutation AdminGrantAchievement($userId: ID!, $achievementId: ID!) {
    adminGrantAchievement(userId: $userId, achievementId: $achievementId) {
      success
    }
  }
`;

export const ADMIN_BULK_UPDATE_ISSUES_MUTATION = gql`
  mutation AdminBulkUpdateIssues($issueIds: [ID!]!, $status: String!) {
    adminBulkUpdateIssues(issueIds: $issueIds, status: $status) {
      id
      status
    }
  }
`;

export const UPDATE_PRESENCE_MUTATION = gql`
  mutation UpdatePresence($status: String!) {
    updatePresence(status: $status) {
      activeUsers
      workoutsInProgress
    }
  }
`;
