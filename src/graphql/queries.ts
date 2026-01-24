/**
 * GraphQL Queries
 *
 * All query definitions for MuscleMap client
 */

import { gql } from '@apollo/client/core';

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
      isPrimary
      createdAt
      updatedAt
    }
  }
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
      quarter
      priority
      voteCount
      hasVoted
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
      activeUsers
      workoutsInProgress
      recentActivity {
        type
        userId
        username
        action
        timestamp
      }
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
// TRAINERS
// ============================================

export const TRAINERS_QUERY = gql`
  query Trainers {
    trainers {
      id
      userId
      name
      bio
      specialties
      certifications
      rating
      reviewCount
      hourlyRate
      available
    }
  }
`;

export const MY_TRAINER_PROFILE_QUERY = gql`
  query MyTrainerProfile {
    myTrainerProfile {
      id
      userId
      name
      bio
      specialties
      certifications
      rating
      reviewCount
      hourlyRate
      available
      totalClients
      totalSessions
    }
  }
`;

// ============================================
// CLASSES
// ============================================

export const CLASSES_QUERY = gql`
  query Classes($status: String) {
    classes(status: $status) {
      id
      trainerId
      name
      description
      type
      duration
      maxParticipants
      currentParticipants
      scheduledAt
      price
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
