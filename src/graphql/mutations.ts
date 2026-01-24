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
        archetype
        onboardingCompletedAt
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

export const UPDATE_GOAL_MUTATION = gql`
  mutation UpdateGoal($id: ID!, $input: GoalInput!) {
    updateGoal(id: $id, input: $input) {
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
      }
      createdAt
    }
  }
`;

export const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($conversationId: ID!, $content: String!, $replyToId: ID) {
    sendMessage(conversationId: $conversationId, content: $content, replyToId: $replyToId) {
      id
      conversationId
      senderId
      content
      replyTo {
        id
        content
        senderName
      }
      createdAt
    }
  }
`;

export const EDIT_MESSAGE_MUTATION = gql`
  mutation EditMessage($messageId: ID!, $content: String!) {
    editMessage(messageId: $messageId, content: $content) {
      id
      content
      editedAt
      editCount
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

export const PIN_MESSAGE_MUTATION = gql`
  mutation PinMessage($messageId: ID!) {
    pinMessage(messageId: $messageId) {
      id
      pinnedAt
    }
  }
`;

export const UNPIN_MESSAGE_MUTATION = gql`
  mutation UnpinMessage($messageId: ID!) {
    unpinMessage(messageId: $messageId)
  }
`;

export const ADD_REACTION_MUTATION = gql`
  mutation AddReaction($messageId: ID!, $emoji: String!) {
    addReaction(messageId: $messageId, emoji: $emoji) {
      id
      emoji
    }
  }
`;

export const REMOVE_REACTION_MUTATION = gql`
  mutation RemoveReaction($messageId: ID!, $emoji: String!) {
    removeReaction(messageId: $messageId, emoji: $emoji)
  }
`;

export const SET_TYPING_STATUS_MUTATION = gql`
  mutation SetTypingStatus($conversationId: ID!, $isTyping: Boolean!) {
    setTypingStatus(conversationId: $conversationId, isTyping: $isTyping)
  }
`;

export const STAR_CONVERSATION_MUTATION = gql`
  mutation StarConversation($conversationId: ID!) {
    starConversation(conversationId: $conversationId)
  }
`;

export const UNSTAR_CONVERSATION_MUTATION = gql`
  mutation UnstarConversation($conversationId: ID!) {
    unstarConversation(conversationId: $conversationId)
  }
`;

export const ARCHIVE_CONVERSATION_MUTATION = gql`
  mutation ArchiveConversation($conversationId: ID!) {
    archiveConversation(conversationId: $conversationId)
  }
`;

export const UNARCHIVE_CONVERSATION_MUTATION = gql`
  mutation UnarchiveConversation($conversationId: ID!) {
    unarchiveConversation(conversationId: $conversationId)
  }
`;

export const FORWARD_MESSAGE_MUTATION = gql`
  mutation ForwardMessage($messageId: ID!, $toConversationIds: [ID!]!, $addComment: String) {
    forwardMessage(messageId: $messageId, toConversationIds: $toConversationIds, addComment: $addComment) {
      id
      content
      createdAt
    }
  }
`;

export const SET_DISAPPEARING_MESSAGES_MUTATION = gql`
  mutation SetDisappearingMessages($conversationId: ID!, $ttl: Int) {
    setDisappearingMessages(conversationId: $conversationId, ttl: $ttl)
  }
`;

export const SCHEDULE_MESSAGE_MUTATION = gql`
  mutation ScheduleMessage($conversationId: ID!, $content: String!, $scheduledFor: String!) {
    scheduleMessage(conversationId: $conversationId, content: $content, scheduledFor: $scheduledFor) {
      id
      content
      scheduledFor
      status
    }
  }
`;

export const CANCEL_SCHEDULED_MESSAGE_MUTATION = gql`
  mutation CancelScheduledMessage($scheduledId: ID!) {
    cancelScheduledMessage(scheduledId: $scheduledId)
  }
`;

export const CREATE_MESSAGE_TEMPLATE_MUTATION = gql`
  mutation CreateMessageTemplate($name: String!, $content: String!, $shortcut: String) {
    createMessageTemplate(name: $name, content: $content, shortcut: $shortcut) {
      id
      name
      content
      shortcut
    }
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
  mutation LogSkillPractice($input: SkillPracticeInput!) {
    logSkillPractice(input: $input) {
      id
      skillNodeId
      durationMinutes
      valueAchieved
      notes
      createdAt
    }
  }
`;

export const LOG_SKILL_PRACTICE_MUTATION = gql`
  mutation LogSkillPractice($input: SkillPracticeInput!) {
    logSkillPractice(input: $input) {
      id
      skillNodeId
      durationMinutes
      valueAchieved
      notes
      createdAt
    }
  }
`;

export const ACHIEVE_SKILL_MUTATION = gql`
  mutation AchieveSkill($skillNodeId: ID!) {
    achieveSkill(skillNodeId: $skillNodeId) {
      success
      error
      xpAwarded
      creditsAwarded
    }
  }
`;

// ============================================
// MARTIAL ARTS
// ============================================

export const PRACTICE_MARTIAL_ART_MUTATION = gql`
  mutation PracticeMartialArt($input: TechniquePracticeInput!) {
    practiceMartialArt(input: $input) {
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
  }
`;

export const MASTER_MARTIAL_ART_MUTATION = gql`
  mutation MasterMartialArt($techniqueId: ID!) {
    masterMartialArt(techniqueId: $techniqueId) {
      success
      creditsAwarded
      xpAwarded
      error
    }
  }
`;

export const UPDATE_MARTIAL_ART_NOTES_MUTATION = gql`
  mutation UpdateMartialArtNotes($techniqueId: ID!, $notes: String!) {
    updateMartialArtNotes(techniqueId: $techniqueId, notes: $notes)
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
// WORKOUT TEMPLATES
// ============================================

export const CREATE_WORKOUT_TEMPLATE_MUTATION = gql`
  mutation CreateWorkoutTemplate($input: CreateWorkoutTemplateInput!) {
    createWorkoutTemplate(input: $input) {
      id
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
      createdAt
    }
  }
`;

export const UPDATE_WORKOUT_TEMPLATE_MUTATION = gql`
  mutation UpdateWorkoutTemplate($id: ID!, $input: UpdateWorkoutTemplateInput!) {
    updateWorkoutTemplate(id: $id, input: $input) {
      id
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
      updatedAt
    }
  }
`;

export const DELETE_WORKOUT_TEMPLATE_MUTATION = gql`
  mutation DeleteWorkoutTemplate($id: ID!) {
    deleteWorkoutTemplate(id: $id)
  }
`;

export const CLONE_WORKOUT_TEMPLATE_MUTATION = gql`
  mutation CloneWorkoutTemplate($id: ID!) {
    cloneWorkoutTemplate(id: $id) {
      id
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
      forkedFromId
      createdAt
    }
  }
`;

export const RATE_WORKOUT_TEMPLATE_MUTATION = gql`
  mutation RateWorkoutTemplate($id: ID!, $rating: Int!) {
    rateWorkoutTemplate(id: $id, rating: $rating) {
      id
      averageRating
      ratingCount
      userRating
    }
  }
`;

export const SAVE_WORKOUT_TEMPLATE_MUTATION = gql`
  mutation SaveWorkoutTemplate($id: ID!) {
    saveWorkoutTemplate(id: $id)
  }
`;

export const UNSAVE_WORKOUT_TEMPLATE_MUTATION = gql`
  mutation UnsaveWorkoutTemplate($id: ID!) {
    unsaveWorkoutTemplate(id: $id)
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
// RIVALS (1v1)
// ============================================

export const CHALLENGE_RIVAL_MUTATION = gql`
  mutation ChallengeRival($opponentId: ID!) {
    challengeRival(opponentId: $opponentId) {
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

export const ACCEPT_RIVALRY_MUTATION = gql`
  mutation AcceptRivalry($rivalryId: ID!) {
    acceptRivalry(rivalryId: $rivalryId) {
      id
      status
      startedAt
      opponent {
        id
        username
        avatar
      }
      isChallenger
      myTU
      opponentTU
    }
  }
`;

export const DECLINE_RIVALRY_MUTATION = gql`
  mutation DeclineRivalry($rivalryId: ID!) {
    declineRivalry(rivalryId: $rivalryId)
  }
`;

export const END_RIVALRY_MUTATION = gql`
  mutation EndRivalry($rivalryId: ID!) {
    endRivalry(rivalryId: $rivalryId)
  }
`;

// ============================================
// CREWS (TEAM SYSTEM)
// ============================================

export const CREATE_CREW_MUTATION = gql`
  mutation CreateCrew($input: CreateCrewInput!) {
    createCrew(input: $input) {
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

export const LEAVE_CREW_MUTATION = gql`
  mutation LeaveCrew {
    leaveCrew
  }
`;

export const JOIN_CREW_MUTATION = gql`
  mutation JoinCrew($crewId: ID!) {
    joinCrew(crewId: $crewId) {
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
  }
`;

export const INVITE_TO_CREW_MUTATION = gql`
  mutation InviteToCrew($crewId: ID!, $inviteeId: ID!) {
    inviteToCrew(crewId: $crewId, inviteeId: $inviteeId) {
      id
      crewId
      inviterId
      inviteeId
      status
      createdAt
      expiresAt
    }
  }
`;

export const ACCEPT_CREW_INVITE_MUTATION = gql`
  mutation AcceptCrewInvite($inviteId: ID!) {
    acceptCrewInvite(inviteId: $inviteId) {
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
  }
`;

export const START_CREW_WAR_MUTATION = gql`
  mutation StartCrewWar($crewId: ID!, $defendingCrewId: ID!, $durationDays: Int) {
    startCrewWar(crewId: $crewId, defendingCrewId: $defendingCrewId, durationDays: $durationDays) {
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
    }
  }
`;

// ============================================
// TRAINERS & CLASSES
// ============================================

export const UPSERT_TRAINER_PROFILE_MUTATION = gql`
  mutation UpsertTrainerProfile($input: TrainerProfileInput!) {
    upsertTrainerProfile(input: $input) {
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
  }
`;

export const UPDATE_TRAINER_STATUS_MUTATION = gql`
  mutation UpdateTrainerStatus($status: String!) {
    updateTrainerStatus(status: $status)
  }
`;

export const CREATE_TRAINER_CLASS_MUTATION = gql`
  mutation CreateTrainerClass($input: CreateTrainerClassInput!) {
    createTrainerClass(input: $input) {
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
  }
`;

export const UPDATE_TRAINER_CLASS_MUTATION = gql`
  mutation UpdateTrainerClass($classId: ID!, $input: UpdateTrainerClassInput!) {
    updateTrainerClass(classId: $classId, input: $input) {
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
  }
`;

export const CANCEL_TRAINER_CLASS_MUTATION = gql`
  mutation CancelTrainerClass($classId: ID!, $reason: String) {
    cancelTrainerClass(classId: $classId, reason: $reason)
  }
`;

export const ENROLL_IN_CLASS_MUTATION = gql`
  mutation EnrollInClass($classId: ID!) {
    enrollInClass(classId: $classId) {
      id
      classId
      userId
      status
      creditsPaid
      enrolledAt
    }
  }
`;

export const UNENROLL_FROM_CLASS_MUTATION = gql`
  mutation UnenrollFromClass($classId: ID!) {
    unenrollFromClass(classId: $classId)
  }
`;

export const MARK_CLASS_ATTENDANCE_MUTATION = gql`
  mutation MarkClassAttendance($classId: ID!, $attendees: [AttendeeInput!]!) {
    markClassAttendance(classId: $classId, attendees: $attendees) {
      attendeeCount
      wageEarned
    }
  }
`;

// ============================================
// CAREER READINESS
// ============================================

export const CREATE_CAREER_GOAL_MUTATION = gql`
  mutation CreateCareerGoal($input: CareerGoalInput!) {
    createCareerGoal(input: $input) {
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

export const UPDATE_CAREER_GOAL_MUTATION = gql`
  mutation UpdateCareerGoal($goalId: ID!, $input: CareerGoalUpdateInput!) {
    updateCareerGoal(goalId: $goalId, input: $input) {
      id
      targetDate
      priority
      status
      agencyName
      notes
      updatedAt
    }
  }
`;

export const DELETE_CAREER_GOAL_MUTATION = gql`
  mutation DeleteCareerGoal($goalId: ID!) {
    deleteCareerGoal(goalId: $goalId)
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

export const CREATE_BUDDY_MUTATION = gql`
  mutation CreateBuddy($input: CreateBuddyInput!) {
    createBuddy(input: $input) {
      userId
      species
      nickname
      level
      xp
      xpToNextLevel
      stage
      stageName
    }
  }
`;

export const UPDATE_BUDDY_MUTATION = gql`
  mutation UpdateBuddySpecies($species: String!) {
    updateBuddySpecies(species: $species) {
      userId
      species
      nickname
      level
      stage
      stageName
    }
  }
`;

export const UPDATE_BUDDY_NICKNAME_MUTATION = gql`
  mutation UpdateBuddyNickname($nickname: String) {
    updateBuddyNickname(nickname: $nickname)
  }
`;

export const UPDATE_BUDDY_SETTINGS_MUTATION = gql`
  mutation UpdateBuddySettings($input: BuddySettingsInput!) {
    updateBuddySettings(input: $input)
  }
`;

export const FEED_BUDDY_MUTATION = gql`
  mutation FeedBuddy($xpAmount: Int!) {
    feedBuddy(xpAmount: $xpAmount) {
      newXp
      newLevel
      leveledUp
      newStage
      evolved
    }
  }
`;

export const EQUIP_BUDDY_ITEM_MUTATION = gql`
  mutation EquipBuddyCosmetic($sku: String!, $slot: String!) {
    equipBuddyCosmetic(sku: $sku, slot: $slot)
  }
`;

export const UNEQUIP_BUDDY_ITEM_MUTATION = gql`
  mutation UnequipBuddyCosmetic($slot: String!) {
    unequipBuddyCosmetic(slot: $slot)
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

export const MARK_ITEM_SEEN_MUTATION = gql`
  mutation MarkItemSeen($itemId: ID!) {
    markItemSeen(itemId: $itemId) {
      success
    }
  }
`;

export const MARK_ALL_SEEN_MUTATION = gql`
  mutation MarkAllSeen {
    markAllSeen {
      success
    }
  }
`;

export const CLAIM_SET_REWARD_MUTATION = gql`
  mutation ClaimSetReward($setId: ID!, $threshold: Float!) {
    claimSetReward(setId: $setId, threshold: $threshold) {
      success
      reward {
        type
        value
        description
      }
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
      newBalance
      message
    }
  }
`;

export const MAKE_OFFER_MUTATION = gql`
  mutation MakeOffer($listingId: ID!, $amount: Int!, $message: String) {
    makeOffer(listingId: $listingId, amount: $amount, message: $message) {
      success
      offerId
      message
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

export const REMOVE_FROM_WATCHLIST_MUTATION = gql`
  mutation RemoveFromWatchlist($listingId: ID!) {
    removeFromWatchlist(listingId: $listingId) {
      success
    }
  }
`;

// ============================================
// TRADES
// ============================================

export const CREATE_TRADE_MUTATION = gql`
  mutation CreateTrade($input: CreateTradeInput!) {
    createTrade(input: $input) {
      success
      trade {
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
        }
        initiatorCredits
        receiverItems {
          id
          name
          rarity
          icon
        }
        receiverCredits
        status
        message
        createdAt
      }
      valueWarning
      message
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
      message
    }
  }
`;

export const REJECT_TRADE_MUTATION = gql`
  mutation RejectTrade($tradeId: ID!) {
    rejectTrade(tradeId: $tradeId) {
      success
      trade {
        id
        status
      }
      message
    }
  }
`;

export const CANCEL_TRADE_MUTATION = gql`
  mutation CancelTrade($tradeId: ID!) {
    cancelTrade(tradeId: $tradeId) {
      success
      trade {
        id
        status
      }
      message
    }
  }
`;

// ============================================
// MYSTERY BOXES
// ============================================

export const OPEN_MYSTERY_BOX_MUTATION = gql`
  mutation OpenMysteryBox($boxId: ID!, $quantity: Int) {
    openMysteryBox(boxId: $boxId, quantity: $quantity) {
      success
      results {
        cosmeticId
        cosmeticName
        rarity
        previewUrl
        wasPityReward
        isDuplicate
        refundAmount
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
      message
    }
  }
`;

export const EQUIP_SKIN_MUTATION = gql`
  mutation EquipSkin($skinId: ID!) {
    equipSkin(skinId: $skinId) {
      success
      message
    }
  }
`;

export const UNEQUIP_SKIN_MUTATION = gql`
  mutation UnequipSkin($skinId: ID!) {
    unequipSkin(skinId: $skinId) {
      success
      message
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

// ============================================
// SLEEP & RECOVERY
// ============================================

export const LOG_SLEEP_MUTATION = gql`
  mutation LogSleep($input: SleepLogInput!) {
    logSleep(input: $input) {
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
      sleepDebt
      createdAt
    }
  }
`;

export const UPDATE_SLEEP_LOG_MUTATION = gql`
  mutation UpdateSleepLog($id: ID!, $input: SleepLogInput!) {
    updateSleepLog(id: $id, input: $input) {
      id
      bedTime
      wakeTime
      sleepDurationMinutes
      quality
      notes
    }
  }
`;

export const DELETE_SLEEP_LOG_MUTATION = gql`
  mutation DeleteSleepLog($id: ID!) {
    deleteSleepLog(id: $id)
  }
`;

export const UPDATE_SLEEP_GOAL_MUTATION = gql`
  mutation UpdateSleepGoal($input: SleepGoalInput!) {
    updateSleepGoal(input: $input) {
      id
      targetHours
      targetBedTime
      targetWakeTime
      reminderEnabled
      reminderMinutesBefore
    }
  }
`;

export const ACKNOWLEDGE_RECOVERY_RECOMMENDATION_MUTATION = gql`
  mutation AcknowledgeRecoveryRecommendation($recommendationId: ID!, $followed: Boolean, $feedback: String) {
    acknowledgeRecoveryRecommendation(recommendationId: $recommendationId, followed: $followed, feedback: $feedback)
  }
`;

// ============================================
// BODY MEASUREMENTS
// ============================================

export const CREATE_BODY_MEASUREMENT_MUTATION = gql`
  mutation CreateBodyMeasurement($input: BodyMeasurementInput!) {
    createBodyMeasurement(input: $input) {
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

export const UPDATE_BODY_MEASUREMENT_MUTATION = gql`
  mutation UpdateBodyMeasurement($id: ID!, $input: BodyMeasurementInput!) {
    updateBodyMeasurement(id: $id, input: $input) {
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

export const DELETE_BODY_MEASUREMENT_MUTATION = gql`
  mutation DeleteBodyMeasurement($id: ID!) {
    deleteBodyMeasurement(id: $id)
  }
`;

// ============================================
// STATS
// ============================================

export const RECALCULATE_STATS_MUTATION = gql`
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

// ============================================
// SETTINGS
// ============================================

export const UPDATE_SETTINGS_MUTATION = gql`
  mutation UpdateSettings($input: UserSettingsInput!) {
    updateSettings(input: $input) {
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

export const UPDATE_MESSAGING_PRIVACY_MUTATION = gql`
  mutation UpdateMessagingPrivacy($enabled: Boolean!) {
    updateMessagingPrivacy(enabled: $enabled) {
      messagingEnabled
    }
  }
`;

// ============================================
// ONBOARDING
// ============================================

export const COMPLETE_ONBOARDING_MUTATION = gql`
  mutation CompleteOnboarding {
    completeOnboarding {
      success
      message
    }
  }
`;
