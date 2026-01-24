/**
 * GraphQL Queries
 *
 * All query definitions for MuscleMap client
 *
 * ARCHITECTURE NOTE: Queries use fragments from ./fragments.ts for consistency
 * and code reuse. Always prefer fragments over inline field selections.
 */

import { gql } from '@apollo/client/core';
import {
  USER_EXTENDED_FIELDS,
  EXERCISE_FULL_FIELDS,
  MUSCLE_FIELDS,
  GOAL_FIELDS,
  JOURNEY_FIELDS,
  LEADERBOARD_ENTRY_FIELDS,
  TRAINER_PROFILE_FIELDS,
} from './fragments';

// ============================================
// AUTH & USER
// ============================================

export const ME_QUERY = gql`
  query Me {
    me {
      ...UserExtendedFields
    }
  }
  ${USER_EXTENDED_FIELDS}
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
      ...ExerciseFullFields
    }
  }
  ${EXERCISE_FULL_FIELDS}
`;

export const EXERCISE_QUERY = gql`
  query Exercise($id: ID!) {
    exercise(id: $id) {
      ...ExerciseFullFields
    }
  }
  ${EXERCISE_FULL_FIELDS}
`;

export const MUSCLES_QUERY = gql`
  query Muscles {
    muscles {
      ...MuscleFields
    }
  }
  ${MUSCLE_FIELDS}
`;

export const MY_MUSCLE_ACTIVATIONS_QUERY = gql`
  query MyMuscleActivations {
    myMuscleActivations {
      muscleId
      activation
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
  query Goals($status: String) {
    goals(status: $status) {
      ...GoalFields
      userId
    }
  }
  ${GOAL_FIELDS}
`;

export const GOAL_SUGGESTIONS_QUERY = gql`
  query GoalSuggestions {
    goalSuggestions {
      type
      title
      description
      target
      unit
      reason
    }
  }
`;

// ============================================
// JOURNEY & ARCHETYPES
// ============================================

export const JOURNEY_QUERY = gql`
  query Journey {
    journey {
      ...JourneyFields
    }
  }
  ${JOURNEY_FIELDS}
`;

export const JOURNEY_OVERVIEW_QUERY = gql`
  query JourneyOverview {
    journeyOverview {
      currentArchetype
      totalTU
      currentLevel
      currentLevelName
      daysSinceJoined
      totalWorkouts
      streak
      nextLevelTU
      stats {
        weekly {
          workouts
          tu
          avgTuPerWorkout
        }
        monthly {
          workouts
          tu
          avgTuPerWorkout
        }
        allTime {
          workouts
          tu
          avgTuPerWorkout
        }
      }
      workoutHistory {
        date
        tu
        count
      }
      topExercises {
        id
        name
        count
      }
      levels {
        level
        name
        totalTu
        achieved
      }
      muscleGroups {
        name
        total
      }
      muscleBreakdown {
        id
        name
        group
        totalActivation
      }
      recentWorkouts {
        id
        date
        tu
        createdAt
      }
      paths {
        archetype
        name
        philosophy
        focusAreas
        isCurrent
        percentComplete
      }
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
      categoryId
      primaryStats
      bonuses
    }
  }
`;

export const ARCHETYPE_CATEGORIES_QUERY = gql`
  query ArchetypeCategories {
    archetypeCategories {
      id
      name
      description
      icon
      displayOrder
      archetypes {
        id
        name
        description
        philosophy
        icon
        color
        categoryId
        primaryStats
        bonuses
      }
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
      ...LeaderboardEntryFields
      level
      xp
      stat
    }
  }
  ${LEADERBOARD_ENTRY_FIELDS}
`;

export const MY_STATS_WITH_RANKINGS_QUERY = gql`
  query MyStatsWithRankings {
    myStatsWithRankings {
      stats {
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
      rankings
    }
  }
`;

export const EXTENDED_PROFILE_QUERY = gql`
  query ExtendedProfile {
    extendedProfile {
      height
      weight
      age
      gender
      fitnessLevel
      goals
      preferredUnits
      city
      county
      state
      country
      countryCode
      leaderboardOptIn
      profileVisibility
      weeklyActivity
      volumeTrend {
        label
        value
      }
      previousStrength
    }
  }
`;

export const STAT_LEADERBOARD_QUERY = gql`
  query StatLeaderboard($stat: String, $scope: String, $scopeValue: String, $limit: Int, $afterRank: Int) {
    statLeaderboard(stat: $stat, scope: $scope, scopeValue: $scopeValue, limit: $limit, afterRank: $afterRank) {
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

// ============================================
// BODY MEASUREMENTS
// ============================================

export const BODY_MEASUREMENTS_QUERY = gql`
  query BodyMeasurements($limit: Int, $cursor: String) {
    bodyMeasurements(limit: $limit, cursor: $cursor) {
      measurements {
        id
        userId
        weightKg
        bodyFatPercentage
        leanMassKg
        neckCm
        shouldersCm
        chestCm
        waistCm
        hipsCm
        leftBicepCm
        rightBicepCm
        leftForearmCm
        rightForearmCm
        leftThighCm
        rightThighCm
        leftCalfCm
        rightCalfCm
        measurementSource
        notes
        measurementDate
        createdAt
      }
      pagination {
        hasMore
        nextCursor
        count
      }
    }
  }
`;

export const LATEST_BODY_MEASUREMENT_QUERY = gql`
  query LatestBodyMeasurement {
    latestBodyMeasurement {
      id
      userId
      weightKg
      bodyFatPercentage
      leanMassKg
      neckCm
      shouldersCm
      chestCm
      waistCm
      hipsCm
      leftBicepCm
      rightBicepCm
      leftForearmCm
      rightForearmCm
      leftThighCm
      rightThighCm
      leftCalfCm
      rightCalfCm
      measurementSource
      notes
      measurementDate
      createdAt
    }
  }
`;

export const BODY_MEASUREMENT_COMPARISON_QUERY = gql`
  query BodyMeasurementComparison($days: Int) {
    bodyMeasurementComparison(days: $days) {
      weightKg { current past change changePercent }
      bodyFatPercentage { current past change changePercent }
      leanMassKg { current past change changePercent }
      neckCm { current past change changePercent }
      shouldersCm { current past change changePercent }
      chestCm { current past change changePercent }
      waistCm { current past change changePercent }
      hipsCm { current past change changePercent }
      leftBicepCm { current past change changePercent }
      rightBicepCm { current past change changePercent }
      leftForearmCm { current past change changePercent }
      rightForearmCm { current past change changePercent }
      leftThighCm { current past change changePercent }
      rightThighCm { current past change changePercent }
      leftCalfCm { current past change changePercent }
      rightCalfCm { current past change changePercent }
      currentDate
      pastDate
      daysBetween
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

// ============================================
// WORKOUT SESSIONS (Real-Time Logging)
// ============================================

export const ACTIVE_WORKOUT_SESSION_QUERY = gql`
  query ActiveWorkoutSession {
    activeWorkoutSession {
      id
      userId
      startedAt
      pausedAt
      totalPausedTime
      lastActivityAt
      currentExerciseIndex
      currentSetIndex
      restTimerRemaining
      restTimerTotalDuration
      restTimerStartedAt
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
      clientVersion
      serverVersion
    }
  }
`;

export const WORKOUT_SESSION_QUERY = gql`
  query WorkoutSession($id: ID!) {
    workoutSession(id: $id) {
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

export const RECOVERABLE_SESSIONS_QUERY = gql`
  query RecoverableSessions($limit: Int) {
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

export const WORKOUT_MUSCLE_BREAKDOWN_QUERY = gql`
  query WorkoutMuscleBreakdown($workoutId: ID!) {
    workoutMuscleBreakdown(workoutId: $workoutId) {
      muscleId
      muscleName
      totalTU
      setCount
      exercises {
        exerciseId
        exerciseName
        tu
        setCount
      }
    }
  }
`;

export const EXERCISE_SUBSTITUTIONS_QUERY = gql`
  query ExerciseSubstitutions($exerciseId: ID!, $equipment: [String!], $maxResults: Int) {
    exerciseSubstitutions(exerciseId: $exerciseId, equipment: $equipment, maxResults: $maxResults) {
      exercise {
        id
        name
        description
        primaryMuscles
        secondaryMuscles
        equipment
        difficulty
        imageUrl
      }
      similarityScore
      matchedMuscles
      missingMuscles
    }
  }
`;

// ============================================
// PROFILE
// ============================================

export const PROFILE_QUERY = gql`
  query Profile {
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

// ============================================
// MESSAGING
// ============================================

export const CONVERSATIONS_QUERY = gql`
  query Conversations($tab: String) {
    conversations(tab: $tab) {
      id
      type
      name
      participants {
        userId
        username
        displayName
        avatarUrl
        lastActiveAt
      }
      lastMessage {
        id
        content
        createdAt
        senderId
      }
      lastMessageAt
      unreadCount
      starred
      archivedAt
      disappearingTtl
      typingUsers {
        userId
        username
        avatarUrl
      }
      createdAt
      updatedAt
    }
  }
`;

export const CONVERSATION_MESSAGES_QUERY = gql`
  query ConversationMessages($conversationId: ID!, $limit: Int, $before: ID) {
    conversationMessages(conversationId: $conversationId, limit: $limit, before: $before) {
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
      reactions {
        emoji
        count
        users
        userReacted
      }
      pinnedAt
      editedAt
      editCount
      deliveredAt
      readAt
      createdAt
    }
  }
`;

export const PINNED_MESSAGES_QUERY = gql`
  query PinnedMessages($conversationId: ID!) {
    pinnedMessages(conversationId: $conversationId) {
      id
      content
      senderName
      createdAt
    }
  }
`;

export const TYPING_USERS_QUERY = gql`
  query TypingUsers($conversationId: ID!) {
    typingUsers(conversationId: $conversationId) {
      userId
      username
      avatarUrl
    }
  }
`;

export const USER_PRESENCE_QUERY = gql`
  query UserPresence($userIds: [ID!]!) {
    userPresence(userIds: $userIds) {
      userId
      status
      lastSeen
    }
  }
`;

export const BLOCK_STATUS_QUERY = gql`
  query BlockStatus($userId: ID!) {
    blockStatus(userId: $userId) {
      isBlocked
      blockedBy
    }
  }
`;

export const MESSAGE_TEMPLATES_QUERY = gql`
  query MessageTemplates {
    messageTemplates {
      id
      name
      content
      shortcut
      category
      useCount
    }
  }
`;

export const SCHEDULED_MESSAGES_QUERY = gql`
  query ScheduledMessages {
    scheduledMessages {
      id
      conversationId
      content
      scheduledFor
      status
    }
  }
`;

export const SEARCH_MESSAGES_QUERY = gql`
  query SearchMessages($query: String!, $conversationId: ID, $limit: Int, $offset: Int) {
    searchMessages(query: $query, conversationId: $conversationId, limit: $limit, offset: $offset) {
      messages {
        id
        content
        senderName
        conversationId
        createdAt
        highlight
      }
      total
    }
  }
`;

export const SEARCH_USERS_QUERY = gql`
  query SearchUsers($query: String!, $limit: Int) {
    searchUsers(query: $query, limit: $limit) {
      id
      username
      displayName
      avatarUrl
      canMessage
    }
  }
`;

// ============================================
// ISSUES & ROADMAP
// ============================================

export const ISSUES_QUERY = gql`
  query Issues($status: Int, $type: Int, $labelSlug: String, $search: String, $sortBy: String, $limit: Int, $offset: Int) {
    issues(status: $status, type: $type, labelSlug: $labelSlug, search: $search, sortBy: $sortBy, limit: $limit, offset: $offset) {
      issues {
        id
        issueNumber
        title
        description
        type
        status
        priority
        labels {
          id
          name
          slug
          color
          icon
        }
        authorUsername
        authorAvatarUrl
        voteCount
        hasVoted
        commentCount
        isPinned
        isLocked
        createdAt
        updatedAt
      }
      total
      hasMore
    }
  }
`;

export const ISSUE_QUERY = gql`
  query Issue($id: ID!) {
    issue(id: $id) {
      id
      title
      description
      status
      priority
      labels
      author {
        id
        username
        avatar
      }
      comments {
        id
        content
        author {
          id
          username
          avatar
        }
        isSolution
        createdAt
      }
      voteCount
      hasVoted
      commentCount
      createdAt
      updatedAt
    }
  }
`;

export const ISSUE_LABELS_QUERY = gql`
  query IssueLabels {
    issueLabels {
      id
      name
      slug
      color
      icon
      description
    }
  }
`;

export const ISSUE_STATS_QUERY = gql`
  query IssueStats {
    issueStats {
      totalIssues
      openIssues
      resolvedIssues
      totalVotes
      issuesByType
      issuesByStatus
    }
  }
`;

export const MY_ISSUES_QUERY = gql`
  query MyIssues {
    myIssues {
      id
      title
      status
      priority
      voteCount
      commentCount
      createdAt
    }
  }
`;

export const ROADMAP_QUERY = gql`
  query Roadmap {
    roadmap {
      id
      title
      description
      status
      category
      quarter
      priority
      progress
      voteCount
      hasVoted
      relatedIssueIds
      completedAt
    }
  }
`;

export const UPDATES_QUERY = gql`
  query Updates($limit: Int) {
    updates(limit: $limit) {
      id
      title
      content
      type
      createdAt
    }
  }
`;

// ============================================
// ACHIEVEMENTS
// ============================================

export const ACHIEVEMENTS_QUERY = gql`
  query Achievements {
    achievements {
      id
      name
      description
      icon
      rarity
      category
      requirement
      progress
      unlockedAt
    }
  }
`;

export const ACHIEVEMENT_DEFINITIONS_QUERY = gql`
  query AchievementDefinitions($category: String) {
    achievementDefinitions(category: $category) {
      id
      key
      name
      description
      icon
      category
      points
      rarity
      tier
      creditsReward
      xpReward
      requiresVerification
      unlockHint
    }
  }
`;

export const MY_ACHIEVEMENTS_QUERY = gql`
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

export const MY_ACHIEVEMENT_SUMMARY_QUERY = gql`
  query MyAchievementSummary {
    myAchievementSummary {
      totalPoints
      totalAchievements
      totalCredits
      totalXp
      byCategory
      byRarity
      recentAchievements {
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
        earnedAt
      }
    }
  }
`;

// ============================================
// VERIFICATIONS
// ============================================

export const MY_VERIFICATIONS_QUERY = gql`
  query MyVerifications($status: String, $limit: Int, $offset: Int) {
    myVerifications(status: $status, limit: $limit, offset: $offset) {
      verifications {
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
      }
      total
    }
  }
`;

export const MY_WITNESS_REQUESTS_QUERY = gql`
  query MyWitnessRequests($status: String, $limit: Int, $offset: Int) {
    myWitnessRequests(status: $status, limit: $limit, offset: $offset) {
      verifications {
        id
        userId
        achievementId
        achievementKey
        achievementName
        achievementTier
        videoUrl
        thumbnailUrl
        status
        notes
        submittedAt
        expiresAt
        username
        displayName
        avatarUrl
        witness {
          id
          witnessUserId
          witnessUsername
          status
          requestedAt
        }
      }
      total
    }
  }
`;

// ============================================
// SKILLS
// ============================================

export const SKILL_TREES_QUERY = gql`
  query SkillTrees {
    skillTrees {
      id
      name
      description
      icon
      color
      nodeCount
    }
  }
`;

export const SKILL_TREE_QUERY = gql`
  query SkillTree($treeId: ID!) {
    skillTree(treeId: $treeId) {
      id
      name
      description
      icon
      color
      nodeCount
      nodes {
        id
        treeId
        name
        description
        tier
        position
        difficulty
        criteriaType
        criteriaValue
        criteriaDescription
        xpReward
        creditReward
        tips
      }
    }
  }
`;

export const SKILL_TREE_PROGRESS_QUERY = gql`
  query SkillTreeProgress($treeId: ID!) {
    skillTreeProgress(treeId: $treeId) {
      id
      treeId
      name
      description
      tier
      position
      difficulty
      criteriaType
      criteriaValue
      criteriaDescription
      xpReward
      creditReward
      tips
      progress {
        status
        practiceMinutes
        practiceCount
        bestValue
        achievedAt
      }
    }
  }
`;

export const SKILL_SUMMARY_QUERY = gql`
  query SkillSummary {
    skillSummary {
      totalSkills
      achievedSkills
      inProgressSkills
      availableSkills
      lockedSkills
      totalPracticeMinutes
    }
  }
`;

export const SKILL_PROGRESS_QUERY = gql`
  query SkillProgress {
    skillSummary {
      totalSkills
      achievedSkills
      inProgressSkills
      availableSkills
      lockedSkills
      totalPracticeMinutes
    }
  }
`;

// ============================================
// MARTIAL ARTS
// ============================================

export const MARTIAL_ARTS_PROGRESS_QUERY = gql`
  query MartialArtsProgress {
    martialArtsProgress {
      totalTechniques
      masteredTechniques
      learningTechniques
      availableTechniques
      totalPracticeMinutes
      disciplineProgress {
        disciplineId
        disciplineName
        mastered
        total
      }
    }
  }
`;

export const MARTIAL_ARTS_DISCIPLINES_QUERY = gql`
  query MartialArtsDisciplines($militaryOnly: Boolean) {
    martialArtsDisciplines(militaryOnly: $militaryOnly) {
      id
      name
      description
      originCountry
      focusAreas
      icon
      color
      orderIndex
      isMilitary
    }
  }
`;

export const MARTIAL_ARTS_DISCIPLINE_QUERY = gql`
  query MartialArtsDiscipline($id: ID!) {
    martialArtsDiscipline(id: $id) {
      id
      name
      description
      originCountry
      focusAreas
      icon
      color
      orderIndex
      isMilitary
      categories {
        id
        disciplineId
        name
        description
        orderIndex
      }
    }
  }
`;

export const MARTIAL_ARTS_TECHNIQUES_QUERY = gql`
  query MartialArtsTechniques($disciplineId: ID!) {
    martialArtsTechniques(disciplineId: $disciplineId) {
      id
      disciplineId
      categoryId
      name
      description
      category
      difficulty
      prerequisites
      keyPoints
      commonMistakes
      drillSuggestions
      videoUrl
      thumbnailUrl
      muscleGroups
      xpReward
      creditReward
      tier
      position
    }
  }
`;

export const MARTIAL_ARTS_DISCIPLINE_PROGRESS_QUERY = gql`
  query MartialArtsDisciplineProgress($disciplineId: ID!) {
    martialArtsDisciplineProgress(disciplineId: $disciplineId) {
      id
      disciplineId
      categoryId
      name
      description
      category
      difficulty
      prerequisites
      keyPoints
      commonMistakes
      drillSuggestions
      videoUrl
      thumbnailUrl
      muscleGroups
      xpReward
      creditReward
      tier
      position
      progress {
        id
        userId
        techniqueId
        status
        proficiency
        practiceCount
        totalPracticeMinutes
        lastPracticed
        masteredAt
        notes
        createdAt
        updatedAt
      }
    }
  }
`;

export const MARTIAL_ARTS_DISCIPLINE_LEADERBOARD_QUERY = gql`
  query MartialArtsDisciplineLeaderboard($disciplineId: ID!, $limit: Int) {
    martialArtsDisciplineLeaderboard(disciplineId: $disciplineId, limit: $limit) {
      userId
      username
      masteredCount
      totalPracticeMinutes
    }
  }
`;

export const MARTIAL_ARTS_PRACTICE_HISTORY_QUERY = gql`
  query MartialArtsPracticeHistory($limit: Int, $offset: Int, $disciplineId: ID) {
    martialArtsPracticeHistory(limit: $limit, offset: $offset, disciplineId: $disciplineId) {
      logs {
        id
        userId
        techniqueId
        techniqueName
        disciplineName
        practiceDate
        durationMinutes
        repsPerformed
        roundsPerformed
        partnerDrill
        notes
        createdAt
      }
      total
    }
  }
`;

// ============================================
// WALLET & ECONOMY
// ============================================

export const ECONOMY_WALLET_QUERY = gql`
  query EconomyWallet {
    economyWallet {
      credits
      pending
      lifetime
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

export const ECONOMY_PRICING_QUERY = gql`
  query EconomyPricing {
    economyPricing {
      id
      name
      credits
      price
      bonus
      popular
    }
  }
`;

export const ECONOMY_HISTORY_QUERY = gql`
  query EconomyHistory($limit: Int) {
    economyHistory(limit: $limit) {
      id
      type
      amount
      description
      createdAt
    }
  }
`;

// Personal Records
export const MY_PERSONAL_RECORDS_QUERY = gql`
  query MyPersonalRecords($limit: Int, $recordType: String) {
    myPersonalRecords(limit: $limit, recordType: $recordType) {
      id
      userId
      exerciseId
      exerciseName
      recordType
      value
      unit
      reps
      bodyweight
      workoutId
      setNumber
      achievedAt
      previousValue
      details {
        weight
        reps
        estimated1RM
      }
    }
  }
`;

// User Entitlements (subscription/trial status)
export const MY_ENTITLEMENTS_QUERY = gql`
  query MyEntitlements {
    myEntitlements {
      unlimited
      reason
      trialEndsAt
      subscriptionEndsAt
      creditBalance
      creditsVisible
      daysLeftInTrial
    }
  }
`;

// Detailed wallet info for Wallet page
export const MY_WALLET_INFO_QUERY = gql`
  query MyWalletInfo {
    myWalletInfo {
      balance
      lifetimeEarned
      lifetimeSpent
      totalTransferredOut
      totalTransferredIn
      status
      vipTier
      transactions {
        id
        type
        amount
        action
        createdAt
      }
    }
  }
`;

// ============================================
// COMMUNITY FEED
// ============================================

export const COMMUNITY_FEED_QUERY = gql`
  query CommunityFeed($limit: Int, $offset: Int) {
    communityFeed(limit: $limit, offset: $offset) {
      id
      type
      user {
        id
        username
        avatar
        level
      }
      content
      workout {
        id
        totalTU
        duration
      }
      achievement {
        id
        name
        icon
      }
      reactions {
        type
        count
        hasReacted
      }
      comments {
        id
        content
        author {
          id
          username
          avatar
        }
        createdAt
      }
      createdAt
    }
  }
`;

export const COMMUNITY_PRESENCE_QUERY = gql`
  query CommunityPresence {
    communityPresence {
      total
      byGeoBucket {
        geoBucket
        count
      }
      redisEnabled
    }
  }
`;

// ============================================
// PRESCRIPTION
// ============================================

export const PRESCRIPTION_QUERY = gql`
  query Prescription($id: ID!) {
    prescription(id: $id) {
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

export const COMPETITIONS_QUERY = gql`
  query Competitions($status: String) {
    competitions(status: $status) {
      id
      name
      description
      type
      status
      startDate
      endDate
      prizePool
      participantCount
      maxParticipants
      goalTu
      hasJoined
      leaderboard {
        userId
        username
        displayName
        avatar
        score
        rank
        tuEarned
      }
      createdAt
    }
  }
`;

export const MY_COMPETITION_ENTRIES_QUERY = gql`
  query MyCompetitionEntries {
    myCompetitionEntries {
      id
      competitionId
      competition {
        id
        name
        type
      }
      rank
      score
      joinedAt
    }
  }
`;

// ============================================
// RIVALS (1v1)
// ============================================

export const RIVALS_QUERY = gql`
  query Rivals($status: String) {
    rivals(status: $status) {
      rivals {
        id
        challengerId
        challengedId
        status
        createdAt
        startedAt
        endedAt
        challengerTU
        challengedTU
        opponent {
          id
          username
          avatar
          archetype
          level
        }
        isChallenger
        myTU
        opponentTU
        myLastWorkout
        opponentLastWorkout
        tuDifference
        isWinning
      }
      stats {
        activeRivals
        wins
        losses
        ties
        totalTUEarned
        currentStreak
        longestStreak
      }
    }
  }
`;

export const PENDING_RIVALS_QUERY = gql`
  query PendingRivals {
    pendingRivals {
      id
      challengerId
      challengedId
      status
      createdAt
      opponent {
        id
        username
        avatar
        archetype
        level
      }
      isChallenger
      myTU
      opponentTU
    }
  }
`;

export const RIVAL_STATS_QUERY = gql`
  query RivalStats {
    rivalStats {
      activeRivals
      wins
      losses
      ties
      totalTUEarned
      currentStreak
      longestStreak
    }
  }
`;

export const SEARCH_POTENTIAL_RIVALS_QUERY = gql`
  query SearchPotentialRivals($query: String!, $limit: Int) {
    searchPotentialRivals(query: $query, limit: $limit) {
      id
      username
      avatar
      archetype
      level
    }
  }
`;

// ============================================
// CREWS (TEAM SYSTEM)
// ============================================

export const MY_CREW_QUERY = gql`
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
      wars {
        id
        challengerCrewId
        defendingCrewId
        status
        startDate
        endDate
        challengerTU
        defendingTU
        winnerId
        createdAt
        challengerCrew {
          id
          name
          tag
          avatar
          color
        }
        defendingCrew {
          id
          name
          tag
          avatar
          color
        }
        isChallenger
        myCrewTU
        opponentCrewTU
        daysRemaining
        isWinning
      }
      stats {
        totalMembers
        totalTU
        weeklyTU
        warsWon
        warsLost
        currentStreak
        topContributors {
          userId
          username
          avatar
          weeklyTU
        }
      }
    }
  }
`;

export const CREW_QUERY = gql`
  query Crew($id: ID!) {
    crew(id: $id) {
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
        topContributors {
          userId
          username
          avatar
          weeklyTU
        }
      }
    }
  }
`;

export const CREW_LEADERBOARD_QUERY = gql`
  query CrewLeaderboard($limit: Int) {
    crewLeaderboard(limit: $limit) {
      rank
      crew {
        id
        name
        tag
        avatar
        color
        memberCount
        weeklyTU
      }
    }
  }
`;

export const SEARCH_CREWS_QUERY = gql`
  query SearchCrews($query: String!, $limit: Int) {
    searchCrews(query: $query, limit: $limit) {
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
  }
`;

// ============================================
// TRAINERS & CLASSES
// ============================================

export const TRAINERS_QUERY = gql`
  query Trainers($verified: Boolean, $specialty: String, $status: String, $limit: Int, $offset: Int) {
    trainers(verified: $verified, specialty: $specialty, status: $status, limit: $limit, offset: $offset) {
      trainers {
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
      total
    }
  }
`;

export const MY_TRAINER_PROFILE_QUERY = gql`
  query MyTrainerProfile {
    myTrainerProfile {
      ...TrainerProfileFields
    }
  }
  ${TRAINER_PROFILE_FIELDS}
`;

export const TRAINER_CLASSES_QUERY = gql`
  query TrainerClasses($input: TrainerClassesInput) {
    trainerClasses(input: $input) {
      classes {
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
      total
    }
  }
`;

export const UPCOMING_CLASSES_QUERY = gql`
  query UpcomingClasses($limit: Int) {
    trainerClasses(input: { upcoming: true, limit: $limit }) {
      classes {
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
        status
        createdAt
      }
      total
    }
  }
`;

export const MY_TRAINER_CLASSES_QUERY = gql`
  query MyTrainerClasses($status: String, $limit: Int, $offset: Int) {
    myTrainerClasses(status: $status, limit: $limit, offset: $offset) {
      classes {
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
      total
    }
  }
`;

export const MY_CLASS_ENROLLMENTS_QUERY = gql`
  query MyClassEnrollments($status: String, $limit: Int, $offset: Int) {
    myClassEnrollments(status: $status, limit: $limit, offset: $offset) {
      enrollments {
        id
        classId
        userId
        status
        creditsPaid
        enrolledAt
        cancelledAt
        class {
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
          status
        }
      }
      total
    }
  }
`;

export const CLASS_ENROLLMENTS_QUERY = gql`
  query ClassEnrollments($classId: ID!) {
    classEnrollments(classId: $classId) {
      id
      classId
      userId
      status
      creditsPaid
      enrolledAt
      cancelledAt
    }
  }
`;

export const CLASS_ATTENDANCE_QUERY = gql`
  query ClassAttendance($classId: ID!) {
    classAttendance(classId: $classId) {
      id
      classId
      userId
      attended
      markedBy
      rating
      feedback
      markedAt
    }
  }
`;

// ============================================
// NOTIFICATIONS
// ============================================

export const NOTIFICATIONS_QUERY = gql`
  query Notifications($unreadOnly: Boolean, $limit: Int) {
    notifications(unreadOnly: $unreadOnly, limit: $limit) {
      id
      type
      title
      message
      data
      readAt
      createdAt
    }
  }
`;

export const NOTIFICATION_UNREAD_COUNT_QUERY = gql`
  query NotificationUnreadCount {
    notificationUnreadCount
  }
`;

// ============================================
// BUDDY SYSTEM
// ============================================

export const BUDDY_QUERY = gql`
  query Buddy {
    buddy {
      userId
      species
      nickname
      level
      xp
      xpToNextLevel
      stage
      stageName
      stageDescription
      equippedAura
      equippedArmor
      equippedWings
      equippedTool
      equippedSkin
      equippedEmotePack
      equippedVoicePack
      unlockedAbilities
      visible
      showOnProfile
      showInWorkouts
      totalXpEarned
      workoutsTogether
      streaksWitnessed
      prsCelebrated
      createdAt
      updatedAt
    }
  }
`;

export const BUDDY_INVENTORY_QUERY = gql`
  query BuddyInventory($category: String) {
    buddyInventory(category: $category) {
      id
      sku
      name
      category
      slot
      rarity
      equipped
      icon
      description
    }
  }
`;

export const BUDDY_EVOLUTION_PATH_QUERY = gql`
  query BuddyEvolutionPath($species: String!) {
    buddyEvolutionPath(species: $species) {
      species
      stage
      minLevel
      stageName
      description
      unlockedFeatures
    }
  }
`;

export const BUDDY_LEADERBOARD_QUERY = gql`
  query BuddyLeaderboard($species: String, $limit: Int, $offset: Int) {
    buddyLeaderboard(species: $species, limit: $limit, offset: $offset) {
      entries {
        rank
        userId
        username
        species
        nickname
        level
        stage
        stageName
      }
      total
    }
  }
`;

// ============================================
// COLLECTION
// ============================================

export const COLLECTION_STATS_QUERY = gql`
  query CollectionStats {
    collectionStats {
      totalOwned
      totalValue
      rarityBreakdown {
        rarity
        count
      }
      categoryBreakdown {
        category
        count
      }
      completedSets
    }
  }
`;

export const COLLECTION_ITEMS_QUERY = gql`
  query CollectionItems(
    $category: String
    $rarity: String
    $sortBy: String
    $limit: Int
    $offset: Int
  ) {
    collectionItems(
      category: $category
      rarity: $rarity
      sortBy: $sortBy
      limit: $limit
      offset: $offset
    ) {
      items {
        id
        cosmeticId
        name
        description
        category
        rarity
        icon
        previewUrl
        acquiredAt
        isFavorite
        isNew
        estimatedValue
        isTradeable
        isGiftable
      }
      total
      hasMore
    }
  }
`;

export const COLLECTION_FAVORITES_QUERY = gql`
  query CollectionFavorites {
    collectionFavorites {
      id
      cosmeticId
      name
      description
      category
      rarity
      icon
      previewUrl
      acquiredAt
      isFavorite
      isNew
      estimatedValue
    }
  }
`;

export const COLLECTION_SETS_QUERY = gql`
  query CollectionSets {
    collectionSets {
      id
      name
      description
      icon
      theme
      isLimited
      expirationDate
      ownedCount
      totalCount
      rewards {
        threshold
        icon
        description
        claimed
      }
    }
  }
`;

export const COLLECTION_SET_DETAIL_QUERY = gql`
  query CollectionSetDetail($setId: ID!) {
    collectionSetDetail(setId: $setId) {
      set {
        id
        name
        description
        icon
        theme
        isLimited
        expirationDate
      }
      progress {
        ownedCount
        totalCount
        completionPercent
        rewardsClaimed
      }
      items {
        id
        name
        icon
        rarity
        owned
      }
      claimableRewards {
        threshold
        icon
        description
      }
    }
  }
`;

export const COLLECTION_SHOWCASE_QUERY = gql`
  query CollectionShowcase($userId: ID) {
    collectionShowcase(userId: $userId) {
      id
      cosmeticId
      name
      rarity
      icon
      previewUrl
    }
  }
`;

export const COLLECTION_NEW_COUNT_QUERY = gql`
  query CollectionNewCount {
    collectionNewCount
  }
`;

// ============================================
// MARKETPLACE
// ============================================

export const MARKETPLACE_LISTINGS_QUERY = gql`
  query MarketplaceListings(
    $search: String
    $listingType: String
    $category: String
    $rarity: String
    $sortBy: String
    $minPrice: Int
    $maxPrice: Int
    $cursor: String
    $limit: Int
  ) {
    marketplaceListings(
      search: $search
      listingType: $listingType
      category: $category
      rarity: $rarity
      sortBy: $sortBy
      minPrice: $minPrice
      maxPrice: $maxPrice
      cursor: $cursor
      limit: $limit
    ) {
      listings {
        id
        sellerId
        listingType
        price
        currentBid
        bidCount
        expiresAt
        createdAt
        cosmeticName
        cosmeticIcon
        rarity
        category
        sellerUsername
        allowOffers
        minOffer
      }
      nextCursor
      hasMore
    }
  }
`;

export const MARKETPLACE_WATCHLIST_QUERY = gql`
  query MarketplaceWatchlist {
    marketplaceWatchlist {
      id
      listingId
      price
      listingType
      expiresAt
      status
      cosmeticName
      cosmeticIcon
      rarity
      createdAt
    }
  }
`;

export const MARKETPLACE_STATS_QUERY = gql`
  query MarketplaceStats {
    marketplaceStats {
      totalSales
      totalPurchases
      totalRevenue
      avgRating
      sellerLevel
      feeDiscount
    }
  }
`;

// ============================================
// TRADES
// ============================================

export const TRADES_INCOMING_QUERY = gql`
  query TradesIncoming {
    tradesIncoming {
      id
      initiatorId
      initiatorUsername
      receiverId
      receiverUsername
      initiatorItems {
        id
        name
        rarity
        icon
        previewUrl
      }
      initiatorCredits
      receiverItems {
        id
        name
        rarity
        icon
        previewUrl
      }
      receiverCredits
      status
      message
      valueWarning
      expiresAt
      createdAt
    }
  }
`;

export const TRADES_OUTGOING_QUERY = gql`
  query TradesOutgoing {
    tradesOutgoing {
      id
      initiatorId
      initiatorUsername
      receiverId
      receiverUsername
      initiatorItems {
        id
        name
        rarity
        icon
        previewUrl
      }
      initiatorCredits
      receiverItems {
        id
        name
        rarity
        icon
        previewUrl
      }
      receiverCredits
      status
      message
      valueWarning
      expiresAt
      createdAt
    }
  }
`;

export const TRADES_HISTORY_QUERY = gql`
  query TradesHistory($limit: Int) {
    tradesHistory(limit: $limit) {
      id
      user1Id
      user1Username
      user2Id
      user2Username
      status
      completedAt
    }
  }
`;

export const TRADE_QUERY = gql`
  query Trade($id: ID!) {
    trade(id: $id) {
      id
      initiatorId
      initiatorUsername
      receiverId
      receiverUsername
      initiatorItems {
        id
        name
        rarity
        icon
        previewUrl
      }
      initiatorCredits
      receiverItems {
        id
        name
        rarity
        icon
        previewUrl
      }
      receiverCredits
      status
      message
      valueWarning
      expiresAt
      createdAt
    }
  }
`;

// ============================================
// MYSTERY BOXES
// ============================================

export const MYSTERY_BOXES_QUERY = gql`
  query MysteryBoxes {
    mysteryBoxes {
      id
      name
      description
      boxType
      price
      dropRates
      availableFrom
      availableUntil
      maxPurchasesPerDay
      createdAt
    }
  }
`;

export const MYSTERY_BOX_QUERY = gql`
  query MysteryBox($id: ID!) {
    mysteryBox(id: $id) {
      box {
        id
        name
        description
        boxType
        price
        dropRates
      }
      recentDrops {
        rarity
        openedAt
        name
        previewUrl
        username
      }
      dropStats {
        rarity
        count
      }
    }
  }
`;

export const MYSTERY_BOX_HISTORY_QUERY = gql`
  query MysteryBoxHistory($limit: Int) {
    mysteryBoxHistory(limit: $limit) {
      id
      boxId
      boxName
      cosmeticId
      cosmeticName
      rarity
      previewUrl
      creditsSpent
      wasPityReward
      openedAt
    }
  }
`;

export const MYSTERY_BOX_PITY_QUERY = gql`
  query MysteryBoxPity {
    mysteryBoxPity {
      boxType
      epicCounter
      legendaryCounter
      epicThreshold
      legendaryThreshold
      lastEpicAt
      lastLegendaryAt
    }
  }
`;

// ============================================
// SKINS
// ============================================

export const SKINS_QUERY = gql`
  query Skins {
    skins {
      id
      name
      description
      category
      rarity
      price
      unlockRequirement
      creditsRequired
      imageUrl
    }
  }
`;

export const OWNED_SKINS_QUERY = gql`
  query OwnedSkins {
    ownedSkins {
      id
      name
      description
      category
      rarity
      price
      imageUrl
    }
  }
`;

export const EQUIPPED_SKINS_QUERY = gql`
  query EquippedSkins {
    equippedSkins {
      id
      name
      description
      category
      rarity
      price
      imageUrl
    }
  }
`;

export const UNLOCKABLE_SKINS_QUERY = gql`
  query UnlockableSkins {
    unlockableSkins {
      id
      name
      description
      category
      rarity
      price
      unlockRequirement
      creditsRequired
      imageUrl
    }
  }
`;

// ============================================
// ADMIN
// ============================================

export const ADMIN_USERS_QUERY = gql`
  query AdminUsers($limit: Int, $offset: Int, $search: String) {
    adminUsers(limit: $limit, offset: $offset, search: $search) {
      id
      username
      email
      level
      roles
      creditBalance
      banned
      createdAt
      lastActiveAt
    }
  }
`;

export const ADMIN_FEEDBACK_STATS_QUERY = gql`
  query AdminFeedbackStats {
    adminFeedbackStats {
      total
      pending
      resolved
      byType
    }
  }
`;

export const ADMIN_BUGS_STATS_QUERY = gql`
  query AdminBugsStats {
    adminBugsStats {
      total
      open
      inProgress
      resolved
      critical
    }
  }
`;

export const ADMIN_TEST_SCORECARD_QUERY = gql`
  query AdminTestScorecard {
    adminTestScorecard {
      passRate
      totalTests
      passed
      failed
      skipped
      categories {
        name
        passRate
        tests
      }
      lastRun
    }
  }
`;

// ============================================
// WORKOUT TEMPLATES
// ============================================

export const WORKOUT_TEMPLATES_QUERY = gql`
  query WorkoutTemplates($input: WorkoutTemplateSearchInput) {
    workoutTemplates(input: $input) {
      templates {
        id
        creatorId
        creatorUsername
        creatorDisplayName
        name
        description
        exercises {
          exerciseId
          name
          sets
          reps
          weight
          duration
          restSeconds
          notes
        }
        difficulty
        durationMinutes
        targetMuscles
        equipmentRequired
        category
        tags
        isPublic
        isFeatured
        timesUsed
        timesCloned
        averageRating
        ratingCount
        userRating
        isSaved
        createdAt
        updatedAt
      }
      total
    }
  }
`;

export const WORKOUT_TEMPLATE_QUERY = gql`
  query WorkoutTemplate($id: ID!) {
    workoutTemplate(id: $id) {
      id
      creatorId
      creatorUsername
      creatorDisplayName
      name
      description
      exercises {
        exerciseId
        name
        sets
        reps
        weight
        duration
        restSeconds
        notes
      }
      difficulty
      durationMinutes
      targetMuscles
      equipmentRequired
      category
      tags
      isPublic
      isFeatured
      timesUsed
      timesCloned
      averageRating
      ratingCount
      userRating
      isSaved
      createdAt
      updatedAt
    }
  }
`;

export const MY_WORKOUT_TEMPLATES_QUERY = gql`
  query MyWorkoutTemplates($limit: Int, $offset: Int) {
    myWorkoutTemplates(limit: $limit, offset: $offset) {
      templates {
        id
        creatorId
        creatorUsername
        creatorDisplayName
        name
        description
        exercises {
          exerciseId
          name
          sets
          reps
          weight
          duration
          restSeconds
          notes
        }
        difficulty
        durationMinutes
        targetMuscles
        equipmentRequired
        category
        tags
        isPublic
        isFeatured
        timesUsed
        timesCloned
        averageRating
        ratingCount
        userRating
        isSaved
        createdAt
        updatedAt
      }
      total
    }
  }
`;

export const SAVED_WORKOUT_TEMPLATES_QUERY = gql`
  query SavedWorkoutTemplates($folder: String, $limit: Int, $offset: Int) {
    savedWorkoutTemplates(folder: $folder, limit: $limit, offset: $offset) {
      templates {
        id
        creatorId
        creatorUsername
        creatorDisplayName
        name
        description
        exercises {
          exerciseId
          name
          sets
          reps
          weight
          duration
          restSeconds
          notes
        }
        difficulty
        durationMinutes
        targetMuscles
        equipmentRequired
        category
        tags
        isPublic
        isFeatured
        timesUsed
        timesCloned
        averageRating
        ratingCount
        userRating
        isSaved
        createdAt
        updatedAt
      }
      total
    }
  }
`;

export const FEATURED_WORKOUT_TEMPLATES_QUERY = gql`
  query FeaturedWorkoutTemplates($limit: Int) {
    featuredWorkoutTemplates(limit: $limit) {
      id
      creatorId
      creatorUsername
      creatorDisplayName
      name
      description
      exercises {
        exerciseId
        name
        sets
        reps
        weight
        duration
        restSeconds
        notes
      }
      difficulty
      durationMinutes
      targetMuscles
      equipmentRequired
      category
      tags
      isPublic
      isFeatured
      timesUsed
      timesCloned
      averageRating
      ratingCount
      userRating
      isSaved
      createdAt
      updatedAt
    }
  }
`;

// ============================================
// RECOVERY & SLEEP
// ============================================

export const RECOVERY_SCORE_QUERY = gql`
  query RecoveryScore($forceRecalculate: Boolean) {
    recoveryScore(forceRecalculate: $forceRecalculate) {
      id
      userId
      score
      classification
      factors {
        sleepDurationScore
        sleepQualityScore
        restDaysScore
        hrvBonus
        strainPenalty
        consistencyBonus
        sleepDetails {
          hoursSlept
          targetHours
          qualityRating
        }
        restDetails {
          daysSinceLastWorkout
          workoutsThisWeek
          averageIntensity
        }
        hrvDetails {
          currentHrv
          baselineHrv
          percentOfBaseline
        }
      }
      recommendedIntensity
      recommendedWorkoutTypes
      trend
      trendConfidence
      calculatedAt
      expiresAt
      dataSources
    }
  }
`;

export const RECOVERY_STATUS_QUERY = gql`
  query RecoveryStatus {
    recoveryStatus {
      currentScore {
        id
        score
        classification
        recommendedIntensity
        trend
      }
      lastSleep {
        id
        bedTime
        wakeTime
        sleepDurationMinutes
        quality
        notes
      }
      sleepStats {
        avgDuration
        avgQuality
        totalNights
        sleepDebt
        consistency
      }
      recommendations {
        id
        type
        priority
        title
        description
        actionItems {
          action
          completed
        }
      }
      sleepGoal {
        id
        targetHours
        targetBedTime
        targetWakeTime
      }
      nextWorkoutSuggestion {
        intensity
        types
        reason
      }
    }
  }
`;

export const RECOVERY_HISTORY_QUERY = gql`
  query RecoveryHistory($days: Int) {
    recoveryHistory(days: $days) {
      scores {
        id
        score
        classification
        calculatedAt
      }
      averageScore
      trend
      bestScore
      worstScore
      daysTracked
    }
  }
`;

export const RECOVERY_RECOMMENDATIONS_QUERY = gql`
  query RecoveryRecommendations {
    recoveryRecommendations {
      id
      type
      priority
      title
      description
      actionItems {
        action
        completed
      }
    }
  }
`;

export const LAST_SLEEP_QUERY = gql`
  query LastSleep {
    lastSleep {
      id
      bedTime
      wakeTime
      sleepDurationMinutes
      quality
      notes
      factors {
        lateExercise
        lateFood
        screenBeforeBed
        caffeineAfter6pm
        alcoholConsumed
      }
      createdAt
    }
  }
`;

export const SLEEP_HISTORY_QUERY = gql`
  query SleepHistory($limit: Int, $cursor: String, $startDate: DateTime, $endDate: DateTime) {
    sleepHistory(limit: $limit, cursor: $cursor, startDate: $startDate, endDate: $endDate) {
      logs {
        id
        bedTime
        wakeTime
        sleepDurationMinutes
        quality
        notes
        createdAt
      }
      nextCursor
      hasMore
    }
  }
`;

export const SLEEP_STATS_QUERY = gql`
  query SleepStats($period: String) {
    sleepStats(period: $period) {
      avgDuration
      avgQuality
      totalNights
      sleepDebt
      consistency
      qualityDistribution {
        poor
        fair
        good
        excellent
      }
    }
  }
`;

export const WEEKLY_SLEEP_STATS_QUERY = gql`
  query WeeklySleepStats($weeks: Int) {
    weeklySleepStats(weeks: $weeks) {
      weekStart
      weekEnd
      avgDuration
      avgQuality
      nightsTracked
      sleepDebt
    }
  }
`;

export const SLEEP_GOAL_QUERY = gql`
  query SleepGoal {
    sleepGoal {
      id
      targetHours
      targetBedTime
      targetWakeTime
      reminderEnabled
      reminderMinutesBefore
    }
  }
`;

// ============================================
// CAREER READINESS
// ============================================

export const CAREER_STANDARDS_QUERY = gql`
  query CareerStandards($category: String) {
    careerStandards(category: $category) {
      id
      name
      fullName
      agency
      category
      description
      officialUrl
      scoringType
      recertificationPeriodMonths
      events {
        id
        name
        description
        metricType
        metricUnit
        direction
        passingThreshold
        exerciseMappings
        tips
        orderIndex
      }
      eventCount
      icon
      maxScore
      passingScore
    }
  }
`;

export const CAREER_STANDARD_QUERY = gql`
  query CareerStandard($id: ID!) {
    careerStandard(id: $id) {
      id
      name
      fullName
      agency
      category
      description
      officialUrl
      scoringType
      recertificationPeriodMonths
      events {
        id
        name
        description
        metricType
        metricUnit
        direction
        passingThreshold
        exerciseMappings
        tips
        orderIndex
      }
      eventCount
      icon
      maxScore
      passingScore
    }
  }
`;

export const CAREER_STANDARD_CATEGORIES_QUERY = gql`
  query CareerStandardCategories {
    careerStandardCategories {
      category
      count
      icon
    }
  }
`;

export const MY_CAREER_GOALS_QUERY = gql`
  query MyCareerGoals {
    myCareerGoals {
      id
      standard {
        id
        name
        fullName
        agency
        category
        description
        icon
        eventCount
        scoringType
        maxScore
        passingScore
      }
      standardId
      targetDate
      priority
      status
      agencyName
      notes
      readiness {
        score
        status
        trend
        trendDelta
        eventBreakdown {
          eventId
          eventName
          passed
          value
          status
        }
        weakEvents
        lastAssessmentAt
        eventsPassed
        eventsTotal
      }
      daysRemaining
      createdAt
      updatedAt
    }
  }
`;

export const MY_CAREER_READINESS_QUERY = gql`
  query MyCareerReadiness($goalId: ID) {
    myCareerReadiness(goalId: $goalId) {
      score
      status
      trend
      trendDelta
      eventBreakdown {
        eventId
        eventName
        passed
        value
        status
      }
      weakEvents
      lastAssessmentAt
      eventsPassed
      eventsTotal
    }
  }
`;

export const CAREER_EXERCISE_RECOMMENDATIONS_QUERY = gql`
  query CareerExerciseRecommendations($goalId: ID!) {
    careerExerciseRecommendations(goalId: $goalId) {
      exerciseId
      exerciseName
      targetEvents
    }
  }
`;

export const CAREER_GOAL_QUERY = gql`
  query CareerGoal($goalId: ID!) {
    careerGoal(goalId: $goalId) {
      id
      standard {
        id
        name
        fullName
        agency
        category
        icon
      }
      standardId
      targetDate
      priority
      status
      agencyName
      notes
      readiness {
        score
        status
        eventsPassed
        eventsTotal
      }
      daysRemaining
      createdAt
    }
  }
`;

export const CAREER_GOAL_READINESS_QUERY = gql`
  query CareerGoalReadiness($goalId: ID!) {
    careerGoalReadiness(goalId: $goalId) {
      score
      status
      eventsPassed
      eventsTotal
      weakEvents
      lastAssessmentAt
      events {
        id
        name
        currentValue
        passingValue
        unit
        isPassing
      }
    }
  }
`;

export const CAREER_GOAL_TREND_QUERY = gql`
  query CareerGoalTrend($goalId: ID!) {
    careerGoalTrend(goalId: $goalId) {
      date
      score
      eventsPassed
      eventsTotal
    }
  }
`;

// ============================================
// SETTINGS
// ============================================

export const MY_SETTINGS_QUERY = gql`
  query MySettings {
    mySettings {
      theme
      reducedMotion
      highContrast
      textSize
      isPublic
      showLocation
      showProgress
      equipment
    }
  }
`;

export const MESSAGING_PRIVACY_QUERY = gql`
  query MessagingPrivacy {
    messagingPrivacy {
      messagingEnabled
    }
  }
`;

export const MY_PROFILE_LEVEL_QUERY = gql`
  query MyProfileLevel {
    me {
      id
      level
    }
  }
`;

// ============================================
// FULL PROFILE (for Profile page)
// ============================================

export const MY_FULL_PROFILE_QUERY = gql`
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

export const MY_AVATARS_QUERY = gql`
  query MyAvatars {
    myAvatars {
      id
      name
      rarity
      unlockLevel
      imageUrl
      description
    }
  }
`;

export const MY_THEMES_QUERY = gql`
  query MyThemes {
    myThemes {
      id
      name
      rarity
      unlockLevel
      colors
      description
    }
  }
`;

// ============================================
// HIGH FIVES (ENCOURAGEMENTS)
// ============================================

export const HIGH_FIVE_STATS_QUERY = gql`
  query HighFiveStats {
    highFiveStats {
      sent
      received
      unread
    }
  }
`;

export const HIGH_FIVE_USERS_QUERY = gql`
  query HighFiveUsers {
    highFiveUsers {
      id
      username
      level
      currentArchetype
      avatarUrl
    }
  }
`;

export const HIGH_FIVES_RECEIVED_QUERY = gql`
  query HighFivesReceived {
    highFivesReceived {
      id
      type
      message
      senderName
      senderId
      readAt
      createdAt
    }
  }
`;

export const HIGH_FIVES_SENT_QUERY = gql`
  query HighFivesSent {
    highFivesSent {
      id
      type
      message
      recipientName
      recipientId
      createdAt
    }
  }
`;

// ============================================
// LIMITATIONS QUERIES
// ============================================

export const MY_LIMITATIONS_QUERY = gql`
  query MyLimitations($status: String) {
    limitations(status: $status) {
      id
      userId
      bodyRegionId
      bodyRegionName
      limitationType
      severity
      status
      name
      description
      medicalNotes
      avoidMovements
      avoidImpact
      avoidWeightBearing
      maxWeightLbs
      maxReps
      romFlexionPercent
      romExtensionPercent
      romRotationPercent
      onsetDate
      expectedRecoveryDate
      lastReviewed
      diagnosedBy
      ptApproved
      createdAt
      updatedAt
    }
  }
`;

export const BODY_REGIONS_QUERY = gql`
  query BodyRegions {
    bodyRegions {
      id
      name
      icon
      children {
        id
        name
        icon
      }
    }
  }
`;

// ============================================
// PT TESTS QUERIES
// ============================================

export const PT_TESTS_QUERY = gql`
  query PTTests {
    ptTests {
      id
      name
      description
      institution
      components
      scoringMethod
      maxScore
      passingScore
      testFrequency
      sourceUrl
      lastUpdated
      category
    }
  }
`;

export const PT_TESTS_BY_INSTITUTION_QUERY = gql`
  query PTTestsByInstitution {
    ptTestsByInstitution {
      tests {
        id
        name
        description
        institution
        components
        scoringMethod
        maxScore
        passingScore
        testFrequency
        sourceUrl
        lastUpdated
        category
      }
      byInstitution
    }
  }
`;

export const PT_TEST_QUERY = gql`
  query PTTest($id: ID!) {
    ptTest(id: $id) {
      id
      name
      description
      institution
      components
      scoringMethod
      maxScore
      passingScore
      testFrequency
      sourceUrl
      lastUpdated
      category
    }
  }
`;

export const MY_ARCHETYPE_PT_TEST_QUERY = gql`
  query MyArchetypePTTest {
    myArchetypePTTest {
      id
      name
      description
      institution
      components
      scoringMethod
      maxScore
      passingScore
      testFrequency
      sourceUrl
    }
  }
`;

export const PT_TEST_RESULTS_QUERY = gql`
  query PTTestResults($testId: ID, $limit: Int) {
    ptTestResults(testId: $testId, limit: $limit) {
      id
      testId
      testName
      institution
      testDate
      componentResults
      totalScore
      passed
      category
      official
      location
      proctor
      notes
      recordedAt
    }
  }
`;

export const PT_TEST_RESULT_QUERY = gql`
  query PTTestResult($id: ID!) {
    ptTestResult(id: $id) {
      result {
        id
        testId
        testName
        institution
        testDate
        componentResults
        totalScore
        passed
        category
        official
        location
        proctor
        notes
        recordedAt
      }
      components
      previousResults {
        testDate
        totalScore
        passed
      }
    }
  }
`;

export const PT_TEST_LEADERBOARD_QUERY = gql`
  query PTTestLeaderboard($testId: ID!) {
    ptTestLeaderboard(testId: $testId) {
      rank
      userId
      username
      displayName
      avatar
      score
      testDate
      passed
      category
    }
  }
`;

// ============================================
// PROGRESS PHOTOS
// ============================================
export const PROGRESS_PHOTOS_QUERY = gql`
  query ProgressPhotos($limit: Int, $cursor: String, $photoType: String) {
    progressPhotos(limit: $limit, cursor: $cursor, photoType: $photoType) {
      photos {
        id
        userId
        storagePath
        thumbnailPath
        photoType
        pose
        isPrivate
        weightKg
        bodyFatPercentage
        notes
        photoDate
        createdAt
      }
      pagination {
        hasMore
        nextCursor
        count
      }
    }
  }
`;

export const PROGRESS_PHOTO_QUERY = gql`
  query ProgressPhoto($id: ID!) {
    progressPhoto(id: $id) {
      id
      userId
      storagePath
      thumbnailPath
      photoType
      pose
      isPrivate
      weightKg
      bodyFatPercentage
      notes
      photoDate
      createdAt
    }
  }
`;

export const PROGRESS_PHOTO_TIMELINE_QUERY = gql`
  query ProgressPhotoTimeline($days: Int) {
    progressPhotoTimeline(days: $days) {
      timeline
    }
  }
`;

export const PROGRESS_PHOTO_COMPARISON_QUERY = gql`
  query ProgressPhotoComparison($photoType: String, $pose: String) {
    progressPhotoComparison(photoType: $photoType, pose: $pose) {
      first {
        id
        storagePath
        thumbnailPath
        photoType
        pose
        weightKg
        photoDate
      }
      middle {
        id
        storagePath
        thumbnailPath
        photoType
        pose
        weightKg
        photoDate
      }
      last {
        id
        storagePath
        thumbnailPath
        photoType
        pose
        weightKg
        photoDate
      }
      totalPhotos
      daysBetween
      allPhotos {
        id
        storagePath
        thumbnailPath
        photoType
        pose
        weightKg
        photoDate
      }
      message
    }
  }
`;

export const PROGRESS_PHOTO_STATS_QUERY = gql`
  query ProgressPhotoStats {
    progressPhotoStats {
      byType
      firstPhoto
      lastPhoto
      totalPhotos
    }
  }
`;

// ============================================
// WEARABLES
// ============================================

export const WEARABLES_SUMMARY_QUERY = gql`
  query WearablesSummary {
    wearablesSummary {
      today {
        steps
        activeCalories
        avgHeartRate
        workoutMinutes
        sleepHours
      }
      thisWeek {
        totalSteps
        avgDailySteps
        totalWorkoutMinutes
        avgSleepHours
        avgRestingHeartRate
      }
    }
  }
`;

export const WEARABLES_STATUS_QUERY = gql`
  query WearablesStatus {
    wearablesStatus {
      syncStatus {
        provider
        lastSyncAt
        isConnected
      }
    }
  }
`;

export const WEARABLE_CONNECTIONS_QUERY = gql`
  query WearableConnections {
    wearableConnections {
      provider
      lastSyncAt
      isConnected
    }
  }
`;

// ============================================
// PROGRESSION
// ============================================

export const PROGRESSION_MASTERY_QUERY = gql`
  query ProgressionMastery {
    progressionMastery {
      archetypeId
      archetypeName
      totalTu
      tier
    }
  }
`;

export const PROGRESSION_ACHIEVEMENTS_QUERY = gql`
  query ProgressionAchievements {
    progressionAchievements {
      id
      name
      description
      earned
      earnedAt
      iconUrl
    }
  }
`;

export const PROGRESSION_NUTRITION_QUERY = gql`
  query ProgressionNutrition {
    progressionNutrition {
      tips {
        id
        title
        content
      }
    }
  }
`;

export const PROGRESSION_LEADERBOARD_QUERY = gql`
  query ProgressionLeaderboard($limit: Int) {
    progressionLeaderboard(limit: $limit) {
      rank
      userId
      username
      avatar
      level
      xp
      totalTu
    }
  }
`;

export const PROGRESSION_RECORDS_QUERY = gql`
  query ProgressionRecords($limit: Int, $recordType: String) {
    progressionRecords(limit: $limit, recordType: $recordType) {
      id
      exerciseId
      exerciseName
      recordType
      value
      previousValue
      unit
      achievedAt
    }
  }
`;

export const PROGRESSION_EXERCISE_RECORDS_QUERY = gql`
  query ProgressionExerciseRecords($exerciseId: ID!) {
    progressionExerciseRecords(exerciseId: $exerciseId) {
      id
      exerciseId
      exerciseName
      recordType
      value
      previousValue
      unit
      achievedAt
    }
  }
`;

export const PROGRESSION_EXERCISE_STATS_QUERY = gql`
  query ProgressionExerciseStats($exerciseId: ID!) {
    progressionExerciseStats(exerciseId: $exerciseId) {
      exerciseId
      exerciseName
      totalSets
      totalReps
      totalVolume
      maxWeight
      avgWeight
      lastWorkoutAt
      history {
        date
        sets
        reps
        weight
        volume
      }
    }
  }
`;

export const PROGRESSION_RECOMMENDATIONS_QUERY = gql`
  query ProgressionRecommendations($limit: Int) {
    progressionRecommendations(limit: $limit) {
      exerciseId
      exerciseName
      recommendationType
      currentValue
      recommendedValue
      unit
      message
      confidence
    }
  }
`;

export const PROGRESSION_TARGETS_QUERY = gql`
  query ProgressionTargets($exerciseId: ID, $includeCompleted: Boolean) {
    progressionTargets(exerciseId: $exerciseId, includeCompleted: $includeCompleted) {
      id
      exerciseId
      exerciseName
      targetType
      currentValue
      targetValue
      incrementValue
      incrementFrequency
      targetDate
      status
      progress
      createdAt
      completedAt
    }
  }
`;

// ============================================
// LOCATIONS
// ============================================

export const NEARBY_LOCATIONS_QUERY = gql`
  query NearbyLocations($lat: Float!, $lng: Float!, $type: String, $limit: Int) {
    nearbyLocations(lat: $lat, lng: $lng, type: $type, limit: $limit) {
      id
      name
      type
      city
      description
      lat
      lng
      avgRating
      ratingCount
      distance
      createdAt
    }
  }
`;

export const SEARCH_LOCATIONS_QUERY = gql`
  query SearchLocations($query: String!, $type: String, $limit: Int) {
    searchLocations(query: $query, type: $type, limit: $limit) {
      id
      name
      type
      city
      description
      lat
      lng
      avgRating
      ratingCount
      distance
      createdAt
    }
  }
`;

export const LOCATION_DETAILS_QUERY = gql`
  query LocationDetails($id: ID!) {
    location(id: $id) {
      location {
        id
        name
        type
        city
        description
        lat
        lng
        avgRating
        ratingCount
        createdAt
      }
      ratings {
        avgRating
        avgSafety
        avgCrowd
        avgClean
        totalRatings
      }
      amenities {
        amenity
        count
      }
      comments {
        id
        userId
        username
        comment
        upvotes
        createdAt
      }
    }
  }
`;
