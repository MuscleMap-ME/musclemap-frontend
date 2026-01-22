/**
 * GraphQL Schema Definition
 *
 * Complete schema for MuscleMap API - replaces all REST endpoints
 */

export const typeDefs = `#graphql
  # ============================================
  # SCALARS
  # ============================================
  scalar DateTime
  scalar JSON

  # ============================================
  # ROOT TYPES
  # ============================================
  type Query {
    # Auth
    me: User
    myCapabilities: Capabilities

    # Profile
    profile: Profile

    # Exercises & Muscles
    exercises(search: String, muscleGroup: String, equipment: String, limit: Int): [Exercise!]!
    exercise(id: ID!): Exercise
    muscles: [Muscle!]!

    # Workouts
    myWorkouts(limit: Int, offset: Int): [Workout!]!
    myWorkoutStats: WorkoutStats
    myMuscleStats: MuscleStats
    workout(id: ID!): Workout

    # Workout Sessions (Real-time logging)
    activeWorkoutSession: WorkoutSession
    workoutSession(id: ID!): WorkoutSession
    recoverableSessions(limit: Int): [RecoverableSession!]!
    workoutMuscleBreakdown(sessionId: ID!): [MuscleActivationSummary!]!

    # Exercise History (PRs and best lifts)
    exerciseHistory(exerciseIds: [ID!]!): [ExerciseHistoryEntry!]!

    # Goals
    goals: [Goal!]!
    goal(id: ID!): Goal
    goalSuggestions: [GoalSuggestion!]!

    # Journey & Archetypes
    journey: JourneyProgress
    archetypes: [Archetype!]!
    archetype(id: ID!): Archetype
    archetypeCategories: [ArchetypeCategory!]!
    archetypesByCategory(categoryId: ID!): [Archetype!]!

    # Equipment
    equipmentTypes: [EquipmentType!]!
    equipmentCategories: [EquipmentCategory!]!
    equipmentByCategory(category: String!): [EquipmentType!]!
    homeEquipment: [HomeEquipment!]!
    homeEquipmentIds: [ID!]!
    locationEquipment(locationId: ID!): [LocationEquipment!]!

    # Limitations
    limitations: [Limitation!]!
    bodyRegions: [BodyRegion!]!
    exerciseSubstitutions(exerciseId: ID!): [ExerciseSubstitution!]!

    # Stats
    myStats: CharacterStats
    userStats(userId: ID!): CharacterStats
    statsHistory(days: Int): [StatsHistoryEntry!]!
    leaderboards(type: String): [LeaderboardEntry!]!
    myLeaderboardPosition: LeaderboardPosition
    extendedProfile: ExtendedProfile
    statsInfo: StatsInfo

    # Long-Term Analytics
    yearlyStats(year: Int!): YearlyStats
    yearsList: [Int!]!
    monthlyTrends(months: Int): [MonthlyStats!]!
    progressVelocity: ProgressTrends
    projectedMilestones: [ProjectedMilestone!]!
    yearInReview(year: Int!): YearInReview!
    allTimeTuLeaderboard(limit: Int, offset: Int): [AllTimeTuLeaderboardEntry!]!

    # Community
    communityFeed(limit: Int, offset: Int): [FeedItem!]!
    communityStats: CommunityStats
    publicCommunityStats: PublicCommunityStats
    communityPresence: PresenceInfo
    communityPercentile: PercentileInfo

    # Economy
    economyPricing: [PricingTier!]!
    economyBalance: Balance
    economyWallet: Wallet
    economyHistory(limit: Int): [Transaction!]!
    economyTransactions(limit: Int): [Transaction!]!
    economyActions: [EconomyAction!]!
    creditsBalance: Balance

    # Enhanced Economy
    creditEarningSummary: CreditEarningSummary
    creditEarnEvents(unreadOnly: Boolean, limit: Int): EarnEventsResult
    bonusEventTypes(enabledOnly: Boolean): [BonusEventType!]!
    bonusEventHistory(limit: Int): [BonusEvent!]!
    creditPackages: [CreditPackage!]!
    transactionHistory(input: TransactionHistoryInput): TransactionHistoryResult!

    # Tips & Milestones
    tips(context: String, exerciseId: ID): [Tip!]!
    milestones: [Milestone!]!

    # Messaging
    conversations: [Conversation!]!
    conversationMessages(conversationId: ID!, limit: Int, before: ID): [Message!]!

    # Issues & Roadmap
    issues(status: String, label: String, limit: Int, offset: Int): [Issue!]!
    issue(id: ID!): Issue
    issueLabels: [IssueLabel!]!
    issueStats: IssueStats
    myIssues: [Issue!]!
    adminIssues(status: String): [Issue!]!
    updates(limit: Int): [Update!]!
    roadmap: [RoadmapItem!]!

    # Hangouts
    hangoutTypes: [HangoutType!]!
    nearbyHangouts(lat: Float!, lng: Float!, radius: Float): [Hangout!]!
    hangout(id: ID!): Hangout
    hangoutStats: HangoutStats
    myHangouts: [Hangout!]!

    # Onboarding
    onboardingStatus: OnboardingStatus
    onboardingProfile: OnboardingProfile

    # Personalization
    personalizationContext: PersonalizationContext
    personalizationRecommendations: [Recommendation!]!
    personalizationPlan: PersonalPlan
    personalizationSummary: PersonalizationSummary

    # Prescription
    prescription(id: ID!): Prescription

    # Privacy
    privacy: PrivacySettings
    privacySummary: PrivacySummary

    # PT Tests
    ptTests: [PTTest!]!
    ptTest(id: ID!): PTTest
    myArchetypePTTests: [PTTest!]!
    ptTestResults: [PTTestResult!]!
    ptTestResult(id: ID!): PTTestResult
    ptTestLeaderboard(testId: ID!): [PTTestLeaderboardEntry!]!

    # Career Readiness
    careerStandards(category: String): [CareerStandard!]!
    careerStandard(id: ID!): CareerStandard
    careerStandardCategories: [CareerStandardCategory!]!
    myCareerGoals: [CareerGoal!]!
    myCareerReadiness(goalId: ID): CareerReadiness
    careerExerciseRecommendations(goalId: ID!): [ExerciseRecommendation!]!

    # Training Programs
    trainingPrograms(input: ProgramSearchInput): [TrainingProgram!]!
    trainingProgram(id: ID!): TrainingProgram
    officialPrograms: [TrainingProgram!]!
    featuredPrograms(limit: Int): [TrainingProgram!]!
    myPrograms(limit: Int, offset: Int): [TrainingProgram!]!
    myEnrollments(status: String, limit: Int, offset: Int): [ProgramEnrollment!]!
    activeEnrollment(programId: ID): ProgramEnrollment
    enrollment(id: ID!): EnrollmentWithProgram
    todaysWorkout(programId: ID): TodaysWorkoutResult

    # Sleep & Recovery
    sleepLog(id: ID!): SleepLog
    lastSleep: SleepLog
    sleepHistory(limit: Int, cursor: String, startDate: DateTime, endDate: DateTime): SleepHistoryResult!
    sleepStats(period: String): SleepStats!
    weeklySleepStats(weeks: Int): [WeeklySleepStats!]!
    sleepGoal: SleepGoal
    recoveryScore(forceRecalculate: Boolean): RecoveryScore
    recoveryStatus: RecoveryStatus!
    recoveryHistory(days: Int): RecoveryHistory!
    recoveryRecommendations: [RecoveryRecommendation!]!

    # RPE/RIR Tracking
    rpeScale: RPEScale!
    rpeTrends(exerciseId: ID!, days: Int): RPETrends!
    rpeWeeklyTrends(exerciseId: ID!, weeks: Int): RPEWeeklyTrends!
    rpeFatigue: FatigueAnalysis!
    rpeSnapshots(days: Int): [RPESnapshot!]!
    rpeTarget(exerciseId: ID!): RPETarget!

    # Health (internal)
    health: HealthStatus
    healthDetailed: DetailedHealthStatus

    # Nutrition
    nutritionDashboard: NutritionDashboard
    nutritionGoals: NutritionGoals
    nutritionPreferences: NutritionPreferences
    nutritionHistory(days: Int): [NutritionHistoryEntry!]!
    foodSearch(query: String!, source: String, limit: Int): FoodSearchResult!
    foodByBarcode(barcode: String!): FoodItem
    mealsByDate(date: String!): [MealLog!]!
    recipes(search: String, tags: [String!], limit: Int): [Recipe!]!
    recipe(id: ID!): Recipe
    popularRecipes(limit: Int): [Recipe!]!
    mealPlans(status: String): [MealPlan!]!
    mealPlan(id: ID!): MealPlan
    activeMealPlan: MealPlan
    hydrationByDate(date: String!): HydrationSummary!
    archetypeNutritionProfiles: [ArchetypeNutritionProfile!]!
    archetypeNutritionProfile(archetypeId: ID!): ArchetypeNutritionProfile

    # Mascot / Spirit Animal
    mascot: MascotState
    mascotAppearance: MascotAppearance
    mascotPowers: MascotPowers
    mascotTimeline(limit: Int, offset: Int, importance: [String!]): [MascotTimelineItem!]!
    mascotPendingReactions(limit: Int): [MascotReaction!]!
    mascotWardrobe: MascotWardrobe
    mascotShop: [MascotShopItem!]!

    # Mascot Advanced Powers
    mascotAssistState: MascotAssistState
    mascotExerciseAlternatives(exerciseId: ID!): [MascotExerciseAlternative!]!
    mascotCrewSuggestions(limit: Int): [MascotCrewSuggestion!]!
    mascotRivalryAlerts(limit: Int): [MascotRivalryAlert!]!
    mascotCreditAlerts: [MascotCreditAlert!]!
    mascotCreditLoanOffer: MascotCreditLoanOffer!
    mascotVolumeStats(weeks: Int): [MascotVolumeStats!]!
    mascotOvertrainingAlerts: [MascotOvertrainingAlert!]!
    mascotWorkoutSuggestions(limit: Int): [MascotWorkoutSuggestion!]!
    mascotMilestoneProgress: [MascotMilestoneProgress!]!
    mascotMasterAbilities: [MascotMasterAbility!]!
    mascotGeneratedPrograms(status: String): [MascotGeneratedProgram!]!
    mascotNegotiatedRate: MascotNegotiatedRate
    mascotHighfivePrefs: MascotHighfivePrefs
    mascotPendingSocialActions: [MascotSocialAction!]!

    # Journey Health
    journeyHealth(journeyId: ID!): JourneyHealthScore
    journeyHealthAlerts(journeyId: ID, status: String, limit: Int): [JourneyHealthAlert!]!
    journeyRecommendations(journeyId: ID!): [JourneyRecommendation!]!
    stalledJourneys(thresholdDays: Int): [StalledJourney!]!
    journeyHealthHistory(journeyId: ID!, days: Int): [JourneyHealthHistoryEntry!]!
  }

  type Mutation {
    # Auth
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!

    # Profile
    updateProfile(input: ProfileInput!): Profile!

    # Workouts (batch creation)
    createWorkout(input: WorkoutInput!): WorkoutResult!
    previewWorkout(input: WorkoutInput!): WorkoutPreview!

    # Workout Sessions (real-time logging)
    startWorkoutSession(input: StartWorkoutSessionInput): WorkoutSessionResult!
    logSet(input: LogSetInput!): WorkoutSessionResult!
    updateSet(input: UpdateSetInput!): LoggedSet!
    deleteSet(setId: ID!): Boolean!
    pauseWorkoutSession(sessionId: ID!): WorkoutSession!
    resumeWorkoutSession(sessionId: ID!): WorkoutSession!
    updateRestTimer(sessionId: ID!, remaining: Int!, total: Int!): WorkoutSession!
    completeWorkoutSession(input: CompleteWorkoutSessionInput!): WorkoutCompletionResult!
    abandonWorkoutSession(sessionId: ID!, reason: String): Boolean!
    recoverWorkoutSession(archivedSessionId: ID!): WorkoutSession!

    # Goals
    createGoal(input: GoalInput!): Goal!
    updateGoal(id: ID!, input: GoalInput!): Goal!
    deleteGoal(id: ID!): Boolean!
    recordGoalProgress(id: ID!, input: GoalProgressInput!): Goal!
    createGoalMilestone(goalId: ID!, input: MilestoneInput!): GoalMilestone!

    # Archetypes
    selectArchetype(archetypeId: ID!): ArchetypeSelection!

    # Equipment
    updateHomeEquipment(equipmentIds: [ID!]!): [HomeEquipment!]!
    addHomeEquipment(equipmentId: ID!): HomeEquipment!
    removeHomeEquipment(equipmentId: ID!): Boolean!
    reportLocationEquipment(locationId: ID!, equipmentId: ID!, status: String!): LocationEquipment!

    # Limitations
    createLimitation(input: LimitationInput!): Limitation!
    updateLimitation(id: ID!, input: LimitationInput!): Limitation!
    deleteLimitation(id: ID!): Boolean!
    checkWorkoutLimitations(exerciseIds: [ID!]!): WorkoutLimitationCheck!

    # Stats
    recalculateStats: CharacterStats!
    updateExtendedProfile(input: ExtendedProfileInput!): ExtendedProfile!

    # Community
    updatePresence(status: String!): PresenceInfo!

    # Economy
    chargeCredits(input: ChargeInput!): ChargeResult!

    # Social Spending
    sendTip(input: TipInput!): TipResult!
    sendGift(input: GiftInput!): GiftResult!
    sendSuperHighFive(input: SuperHighFiveInput!): SuperHighFiveResult!
    boostPost(input: PostBoostInput!): PostBoostResult!
    transferCredits(input: TransferInput!): TransferResult!
    markEarnEventsShown(eventIds: [ID!]!): Boolean!

    # Tips & Milestones
    markTipSeen(tipId: ID!): Boolean!
    claimMilestone(milestoneId: ID!): MilestoneClaimResult!
    updateMilestoneProgress(milestoneId: ID!, progress: Int!): Milestone!

    # Messaging
    createConversation(participantIds: [ID!]!): Conversation!
    sendMessage(conversationId: ID!, content: String!): Message!
    markConversationRead(conversationId: ID!): Boolean!
    deleteMessage(messageId: ID!): Boolean!
    blockUser(userId: ID!): Boolean!
    unblockUser(userId: ID!): Boolean!

    # Issues
    createIssue(input: IssueInput!): Issue!
    updateIssue(id: ID!, input: IssueUpdateInput!): Issue!
    voteOnIssue(issueId: ID!, vote: Int!): Issue!
    subscribeToIssue(issueId: ID!): Boolean!
    createIssueComment(issueId: ID!, content: String!): IssueComment!
    markCommentAsSolution(issueId: ID!, commentId: ID!): Issue!
    createUpdate(input: UpdateInput!): Update!
    createRoadmapItem(input: RoadmapInput!): RoadmapItem!
    voteOnRoadmapItem(itemId: ID!): RoadmapItem!
    adminBulkUpdateIssues(issueIds: [ID!]!, status: String!): [Issue!]!

    # Hangouts
    createHangout(input: HangoutInput!): Hangout!
    joinHangout(hangoutId: ID!): HangoutMembership!
    leaveHangout(hangoutId: ID!): Boolean!
    createHangoutPost(hangoutId: ID!, content: String!): HangoutPost!

    # Onboarding
    updateOnboardingProfile(input: OnboardingProfileInput!): OnboardingProfile!
    setHomeEquipmentOnboarding(input: HomeEquipmentInput!): Boolean!
    completeOnboarding: OnboardingResult!
    skipOnboarding: Boolean!

    # Personalization
    checkExercisePersonalization(exerciseId: ID!): ExerciseCheck!

    # Prescription
    generatePrescription(input: PrescriptionInput!): Prescription!

    # Privacy
    updatePrivacy(input: PrivacyInput!): PrivacySettings!
    enableMinimalistMode: PrivacySettings!
    disableMinimalistMode: PrivacySettings!

    # PT Tests
    submitPTTestResults(input: PTTestResultInput!): PTTestResult!

    # Career Readiness
    createCareerGoal(input: CareerGoalInput!): CareerGoal!
    updateCareerGoal(goalId: ID!, input: CareerGoalUpdateInput!): CareerGoal
    deleteCareerGoal(goalId: ID!): Boolean!
    logCareerAssessment(input: CareerAssessmentInput!): CareerAssessment!

    # Training Programs
    createProgram(input: CreateProgramInput!): TrainingProgram!
    updateProgram(id: ID!, input: UpdateProgramInput!): TrainingProgram!
    deleteProgram(id: ID!): Boolean!
    duplicateProgram(id: ID!, newName: String): TrainingProgram!
    rateProgram(id: ID!, rating: Int!, review: String): Boolean!
    enrollInProgram(programId: ID!): ProgramEnrollment!
    recordProgramWorkout(programId: ID!): ProgramEnrollment!
    pauseEnrollment(enrollmentId: ID!): ProgramEnrollment!
    resumeEnrollment(enrollmentId: ID!): ProgramEnrollment!
    dropEnrollment(enrollmentId: ID!): ProgramEnrollment!

    # Sleep & Recovery
    logSleep(input: SleepLogInput!): SleepLog!
    updateSleepLog(id: ID!, input: UpdateSleepLogInput!): SleepLog!
    deleteSleepLog(id: ID!): Boolean!
    createSleepGoal(input: SleepGoalInput!): SleepGoal!
    updateSleepGoal(id: ID!, input: SleepGoalInput!): SleepGoal!
    deleteSleepGoal(id: ID!): Boolean!
    acknowledgeRecommendation(id: ID!, input: RecommendationFeedbackInput): Boolean!
    generateRecoveryRecommendations: [RecoveryRecommendation!]!

    # RPE/RIR Tracking
    rpeAutoregulate(input: AutoRegulateInput!): AutoRegulationResult!
    setRpeTarget(exerciseId: ID!, input: RPETargetInput!): RPETarget!
    createRpeSnapshot: RPESnapshot

    # Logging
    logFrontendError(input: FrontendLogInput!): Boolean!

    # Nutrition
    enableNutrition: NutritionPreferences!
    disableNutrition(deleteData: Boolean): Boolean!
    updateNutritionPreferences(input: NutritionPreferencesInput!): NutritionPreferences!
    updateNutritionGoals(input: NutritionGoalsInput!): NutritionGoals!
    calculateMacros(input: MacroCalculationInput!): MacroCalculationResult!
    logMeal(input: MealLogInput!): MealLog!
    updateMeal(id: ID!, input: MealLogInput!): MealLog!
    deleteMeal(id: ID!): Boolean!
    logHydration(input: HydrationLogInput!): HydrationLog!
    createRecipe(input: RecipeInput!): Recipe!
    updateRecipe(id: ID!, input: RecipeInput!): Recipe!
    deleteRecipe(id: ID!): Boolean!
    saveRecipe(id: ID!): Boolean!
    unsaveRecipe(id: ID!): Boolean!
    rateRecipe(id: ID!, rating: Int!, review: String): Boolean!
    createMealPlan(input: MealPlanInput!): MealPlan!
    generateMealPlan(input: MealPlanGenerateInput!): MealPlan!
    activateMealPlan(id: ID!): MealPlan!
    deactivateMealPlan(id: ID!): Boolean!
    deleteMealPlan(id: ID!): Boolean!

    # Mascot / Spirit Animal
    updateMascotNickname(nickname: String!): MascotState!
    updateMascotSettings(input: MascotSettingsInput!): MascotState!
    purchaseMascotCosmetic(cosmeticId: ID!): MascotPurchaseResult!
    equipMascotCosmetic(cosmeticId: ID!, slot: String!): MascotLoadout!
    unequipMascotCosmetic(slot: String!): MascotLoadout!
    saveMascotPreset(name: String!, icon: String): MascotPreset!
    loadMascotPreset(presetId: ID!): MascotLoadout!
    deleteMascotPreset(presetId: ID!): Boolean!
    markMascotReactionsShown(reactionIds: [ID!]!): Boolean!

    # Mascot Advanced Powers
    useMascotAssist(workoutId: ID!, exerciseId: ID!, reason: String): MascotAssistResult!
    saveStreak(streakType: String!, streakValue: Int!): MascotStreakSaveResult!
    requestCreditLoan(amount: Int!): MascotCreditLoanResult!
    repayCreditLoan(amount: Int!): MascotCreditLoanResult!
    dismissCreditAlert(alertId: ID!): Boolean!
    acknowledgeOvertrainingAlert(alertId: ID!): Boolean!
    acceptWorkoutSuggestion(suggestionId: ID!): Boolean!
    generateMascotProgram(input: MascotProgramGenerationInput!): MascotProgramGenerationResult!
    activateGeneratedProgram(programId: ID!): Boolean!
    unlockMasterAbility(abilityKey: String!): Boolean!
    updateMascotHighfivePrefs(input: MascotHighfivePrefsInput!): MascotHighfivePrefs!
    executeMascotSocialAction(actionId: ID!): Boolean!
    setExerciseAvoidance(input: MascotExerciseAvoidanceInput!): Boolean!
    removeExerciseAvoidance(exerciseId: ID!): Boolean!

    # Journey Health
    calculateJourneyHealth(journeyId: ID!): JourneyHealthScore!
    acknowledgeJourneyAlert(alertId: ID!): JourneyHealthAlert!
    dismissJourneyAlert(alertId: ID!): Boolean!
    generateJourneyRecommendations(journeyId: ID!): [JourneyRecommendation!]!
    markRecommendationViewed(recommendationId: ID!): Boolean!
    markRecommendationActioned(recommendationId: ID!): Boolean!
    provideRecommendationFeedback(recommendationId: ID!, wasHelpful: Boolean!, feedbackText: String): Boolean!
    recalculateAllJourneyHealth: JourneyHealthRecalcResult!
  }

  type Subscription {
    # Real-time community stats
    communityStatsUpdated: PublicCommunityStats!
    communityActivity: ActivityEvent!

    # Messaging
    messageReceived(conversationId: ID): Message!
    conversationUpdated: Conversation!
  }

  # ============================================
  # AUTH TYPES
  # ============================================
  type User {
    id: ID!
    email: String!
    username: String!
    displayName: String
    avatar: String
    bio: String
    socialLinks: JSON
    archetype: Archetype
    level: Int!
    xp: Int!
    wealthTier: WealthTier
    createdAt: DateTime!
    roles: [String!]!
  }

  # ============================================
  # WEALTH TIER TYPES
  # ============================================
  type WealthTier {
    tier: Int!
    name: String!
    minCredits: Int!
    color: String!
    icon: String!
    description: String!
    creditsToNext: Int
    progressPercent: Int!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Capabilities {
    canCreateWorkout: Boolean!
    canJoinHangouts: Boolean!
    canMessage: Boolean!
    canVote: Boolean!
    isAdmin: Boolean!
    isPremium: Boolean!
    dailyWorkoutLimit: Int!
    remainingWorkouts: Int!
  }

  input RegisterInput {
    email: String!
    password: String!
    username: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  # ============================================
  # PROFILE TYPES
  # ============================================
  type Profile {
    id: ID!
    userId: ID!
    displayName: String
    bio: String
    bioRichJson: JSON
    avatar: String
    location: String
    website: String
    socialLinks: JSON
    fitnessGoals: [String!]
    preferredWorkoutTime: String
    experienceLevel: String
    visibility: String!
    wealthTier: WealthTier
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input ProfileInput {
    displayName: String
    bio: String
    avatar: String
    location: String
    website: String
    socialLinks: JSON
    fitnessGoals: [String!]
    preferredWorkoutTime: String
    experienceLevel: String
    visibility: String
  }

  # ============================================
  # EXERCISE & MUSCLE TYPES
  # ============================================
  type Exercise {
    id: ID!
    name: String!
    description: String
    type: String!
    primaryMuscles: [String!]!
    secondaryMuscles: [String!]
    equipment: [String!]
    difficulty: String
    instructions: [String!]
    tips: [String!]
    imageUrl: String
    videoUrl: String
  }

  type Muscle {
    id: ID!
    name: String!
    group: String!
    subGroup: String
    description: String
  }

  # ============================================
  # EXERCISE HISTORY TYPES
  # ============================================
  type ExerciseHistoryEntry {
    exerciseId: ID!
    exerciseName: String
    bestWeight: Float!
    best1RM: Float!
    bestVolume: Float!
    lastPerformedAt: DateTime
    totalSessions: Int!
  }

  # ============================================
  # WORKOUT TYPES
  # ============================================
  type Workout {
    id: ID!
    userId: ID!
    exercises: [WorkoutExercise!]!
    duration: Int
    notes: String
    totalTU: Int!
    characterStats: CharacterStats
    createdAt: DateTime!
  }

  type WorkoutExercise {
    exerciseId: ID!
    name: String!
    sets: Int!
    reps: Int!
    weight: Float
    notes: String
  }

  type WorkoutStats {
    totalWorkouts: Int!
    totalExercises: Int!
    totalSets: Int!
    totalReps: Int!
    totalWeight: Float!
    averageWorkoutDuration: Float!
    currentStreak: Int!
    longestStreak: Int!
    thisWeek: Int!
    thisMonth: Int!
  }

  type MuscleStats {
    muscleGroups: [MuscleGroupStat!]!
    lastTrained: JSON
    weeklyVolume: JSON
  }

  type MuscleGroupStat {
    muscle: String!
    totalSets: Int!
    totalReps: Int!
    lastTrained: DateTime
  }

  type WorkoutResult {
    workout: Workout!
    tuEarned: Int!
    characterStats: CharacterStats
    levelUp: Boolean!
    newLevel: Int
    achievements: [Achievement!]
  }

  type WorkoutPreview {
    exercises: [WorkoutExercise!]!
    estimatedTU: Int!
    estimatedXP: Int!
    musclesTargeted: [String!]!
  }

  input WorkoutInput {
    exercises: [WorkoutExerciseInput!]!
    notes: String
    idempotencyKey: String
  }

  input WorkoutExerciseInput {
    exerciseId: ID!
    sets: Int!
    reps: Int!
    weight: Float
    notes: String
  }

  # ============================================
  # WORKOUT SESSION TYPES (Real-time logging)
  # ============================================
  type WorkoutSession {
    id: ID!
    userId: ID!
    startedAt: DateTime!
    pausedAt: DateTime
    totalPausedTime: Int!
    lastActivityAt: DateTime!
    workoutPlan: JSON
    currentExerciseIndex: Int!
    currentSetIndex: Int!
    sets: [LoggedSet!]!
    totalVolume: Float!
    totalReps: Int!
    estimatedCalories: Int!
    musclesWorked: [MuscleActivationSummary!]!
    sessionPRs: [SessionPR!]!
    restTimerRemaining: Int
    restTimerTotalDuration: Int
    restTimerStartedAt: DateTime
    clientVersion: Int!
    serverVersion: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type LoggedSet {
    id: ID!
    exerciseId: ID!
    exerciseName: String!
    setNumber: Int!
    reps: Int
    weightKg: Float
    rpe: Float
    rir: Int
    durationSeconds: Int
    restSeconds: Int
    tag: String
    notes: String
    tu: Float
    muscleActivations: [MuscleActivation!]!
    isPRWeight: Boolean!
    isPRReps: Boolean!
    isPR1RM: Boolean!
    performedAt: DateTime!
  }

  type MuscleActivationSummary {
    muscleId: ID!
    muscleName: String!
    totalTU: Float!
    setCount: Int!
    percentageOfMax: Float
  }

  type MuscleActivation {
    muscleId: ID!
    muscleName: String!
    activation: Float!
    tu: Float!
  }

  type SessionPR {
    exerciseId: ID!
    exerciseName: String!
    prType: String!
    previousValue: Float
    newValue: Float!
    improvementPercent: Float
    achievedAt: DateTime!
  }

  type WorkoutSessionResult {
    session: WorkoutSession!
    setLogged: LoggedSet
    prsAchieved: [SessionPR!]
    muscleUpdate: [MuscleActivationSummary!]
  }

  type WorkoutCompletionResult {
    workout: Workout!
    session: WorkoutSession!
    totalTU: Float!
    totalVolume: Float!
    totalSets: Int!
    totalReps: Int!
    duration: Int!
    muscleBreakdown: [MuscleActivationSummary!]!
    prsAchieved: [SessionPR!]!
    creditsCharged: Int!
    xpEarned: Int!
    levelUp: Boolean!
    achievements: [Achievement!]
  }

  type RecoverableSession {
    id: ID!
    startedAt: DateTime!
    archivedAt: DateTime!
    archiveReason: String!
    setsLogged: Int!
    totalVolume: Float!
    musclesWorked: [String!]!
    canRecover: Boolean!
  }

  input StartWorkoutSessionInput {
    workoutPlan: JSON
    clientId: String
  }

  input LogSetInput {
    sessionId: ID!
    exerciseId: ID!
    setNumber: Int!
    reps: Int
    weightKg: Float
    rpe: Float
    rir: Int
    durationSeconds: Int
    restSeconds: Int
    tag: String
    notes: String
    clientSetId: String
  }

  input UpdateSetInput {
    setId: ID!
    reps: Int
    weightKg: Float
    rpe: Float
    rir: Int
    durationSeconds: Int
    notes: String
    tag: String
  }

  input CompleteWorkoutSessionInput {
    sessionId: ID!
    notes: String
    isPublic: Boolean
  }

  # ============================================
  # GOAL TYPES
  # ============================================
  type Goal {
    id: ID!
    userId: ID!
    type: String!
    title: String!
    description: String
    target: Float!
    current: Float!
    unit: String!
    deadline: DateTime
    status: String!
    milestones: [GoalMilestone!]
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type GoalMilestone {
    id: ID!
    goalId: ID!
    title: String!
    target: Float!
    achieved: Boolean!
    achievedAt: DateTime
  }

  type GoalSuggestion {
    type: String!
    title: String!
    description: String!
    target: Float!
    unit: String!
    reasoning: String!
  }

  input GoalInput {
    type: String!
    title: String!
    description: String
    target: Float!
    unit: String!
    deadline: DateTime
  }

  input GoalProgressInput {
    value: Float!
    notes: String
  }

  input MilestoneInput {
    title: String!
    target: Float!
  }

  # ============================================
  # JOURNEY & ARCHETYPE TYPES
  # ============================================
  type JourneyProgress {
    userId: ID!
    archetype: Archetype
    currentLevel: Int!
    currentXP: Int!
    xpToNextLevel: Int!
    totalXP: Int!
    completedMilestones: [String!]!
    unlockedAbilities: [String!]!
    stats: CharacterStats
  }

  type Archetype {
    id: ID!
    name: String!
    description: String!
    philosophy: String
    icon: String
    imageUrl: String
    categoryId: String
    color: String
    levels: [ArchetypeLevel!]
    primaryStats: [String!]
    bonuses: JSON
  }

  type ArchetypeLevel {
    level: Int!
    title: String!
    xpRequired: Int!
    abilities: [String!]!
    bonuses: JSON
  }

  type ArchetypeCategory {
    id: ID!
    name: String!
    description: String
    icon: String
    displayOrder: Int
    archetypes: [Archetype!]!
  }

  type ArchetypeSelection {
    success: Boolean!
    archetype: Archetype!
    journey: JourneyProgress!
  }

  # ============================================
  # EQUIPMENT TYPES
  # ============================================
  type EquipmentType {
    id: ID!
    name: String!
    category: String!
    description: String
    icon: String
  }

  type EquipmentCategory {
    id: ID!
    name: String!
    description: String
  }

  type HomeEquipment {
    id: ID!
    userId: ID!
    equipmentId: ID!
    equipment: EquipmentType!
    addedAt: DateTime!
  }

  type LocationEquipment {
    id: ID!
    locationId: ID!
    equipmentId: ID!
    equipment: EquipmentType!
    status: String!
    lastVerified: DateTime
    verifiedBy: ID
  }

  # ============================================
  # LIMITATION TYPES
  # ============================================
  type Limitation {
    id: ID!
    userId: ID!
    bodyRegion: String!
    description: String!
    severity: String!
    startDate: DateTime
    endDate: DateTime
    active: Boolean!
    excludedExercises: [ID!]
    createdAt: DateTime!
  }

  type BodyRegion {
    id: ID!
    name: String!
    parentRegion: String
    affectedMuscles: [String!]!
  }

  type ExerciseSubstitution {
    originalExerciseId: ID!
    substituteExerciseId: ID!
    substitute: Exercise!
    reason: String!
    effectiveness: Float!
  }

  type WorkoutLimitationCheck {
    valid: Boolean!
    issues: [LimitationIssue!]!
    substitutions: [ExerciseSubstitution!]!
  }

  type LimitationIssue {
    exerciseId: ID!
    exerciseName: String!
    limitation: Limitation!
    severity: String!
  }

  input LimitationInput {
    bodyRegion: String!
    description: String!
    severity: String!
    startDate: DateTime
    endDate: DateTime
    excludedExercises: [ID!]
  }

  # ============================================
  # STATS TYPES
  # ============================================
  type CharacterStats {
    userId: ID!
    level: Int!
    xp: Int!
    xpToNextLevel: Int!
    strength: Int!
    endurance: Int!
    agility: Int!
    flexibility: Int!
    balance: Int!
    mentalFocus: Int!
    totalWorkouts: Int!
    totalExercises: Int!
    currentStreak: Int!
    longestStreak: Int!
    lastWorkoutAt: DateTime
  }

  type StatsHistoryEntry {
    date: DateTime!
    stats: CharacterStats!
    workoutCount: Int!
  }

  type LeaderboardEntry {
    rank: Int!
    userId: ID!
    username: String!
    avatar: String
    level: Int!
    xp: Int!
    stat: String!
    value: Int!
  }

  type LeaderboardPosition {
    overall: Int
    archetype: Int
    weekly: Int
  }

  type ExtendedProfile {
    height: Float
    weight: Float
    age: Int
    gender: String
    fitnessLevel: String
    goals: [String!]
    preferredUnits: String
  }

  type StatsInfo {
    statDescriptions: JSON!
    levelThresholds: [Int!]!
    xpRates: JSON!
  }

  input ExtendedProfileInput {
    height: Float
    weight: Float
    age: Int
    gender: String
    fitnessLevel: String
    goals: [String!]
    preferredUnits: String
  }

  # ============================================
  # COMMUNITY TYPES
  # ============================================
  type FeedItem {
    id: ID!
    type: String!
    userId: ID!
    username: String!
    avatar: String
    content: JSON!
    createdAt: DateTime!
    likes: Int!
    comments: Int!
    liked: Boolean!
  }

  type CommunityStats {
    activeUsers: Int!
    activeWorkouts: Int!
    totalWorkoutsToday: Int!
    totalWorkoutsWeek: Int!
    topArchetype: String
  }

  type PublicCommunityStats {
    activeNow: StatDisplay!
    activeWorkouts: StatDisplay!
    totalUsers: StatDisplay!
    totalWorkouts: StatDisplay!
    recentActivity: [ActivityEvent!]
    milestone: CommunityMilestone
  }

  type StatDisplay {
    value: Int!
    display: String!
  }

  type ActivityEvent {
    id: ID!
    type: String!
    message: String!
    timestamp: DateTime!
  }

  type CommunityMilestone {
    type: String!
    value: Int!
    reached: Boolean!
  }

  type PresenceInfo {
    online: Boolean!
    lastSeen: DateTime
    status: String
  }

  type PercentileInfo {
    overall: Float!
    archetype: Float!
    level: Float!
    workouts: Float!
  }

  # ============================================
  # ECONOMY TYPES
  # ============================================
  type PricingTier {
    id: ID!
    name: String!
    credits: Int!
    price: Float!
    currency: String!
    bonus: Int
  }

  type Balance {
    credits: Int!
    pending: Int!
    lifetime: Int!
  }

  type Wallet {
    balance: Balance!
    transactions: [Transaction!]!
  }

  type Transaction {
    id: ID!
    type: String!
    amount: Int!
    description: String!
    createdAt: DateTime!
    metadata: JSON
  }

  type EconomyAction {
    id: ID!
    name: String!
    cost: Int!
    description: String!
  }

  type ChargeResult {
    success: Boolean!
    newBalance: Int!
    transaction: Transaction
    error: String
  }

  input ChargeInput {
    amount: Int!
    action: String!
    metadata: JSON
  }

  # Credit Earning Summary
  type CreditEarningSummary {
    balance: Int!
    pending: Int!
    lifetimeEarned: Int!
    lifetimeSpent: Int!
    wealthTier: WealthTier!
    earnedToday: Int!
    earnedThisWeek: Int!
    earnedThisMonth: Int!
    recentEarnings: [EarnEvent!]!
    dailyAverage: Float!
    streakBonus: Int
  }

  # Real-time earn events for celebration animations
  type EarnEvent {
    id: ID!
    amount: Int!
    source: String!
    sourceId: ID
    description: String
    animationType: String!
    icon: String
    color: String
    shown: Boolean!
    createdAt: DateTime!
  }

  type EarnEventsResult {
    events: [EarnEvent!]!
    totalUnread: Int!
  }

  # Bonus event types
  type BonusEventType {
    id: ID!
    code: String!
    name: String!
    description: String
    probability: Float!
    minCredits: Int!
    maxCredits: Int!
    triggerOn: String!
    maxPerDay: Int!
    maxPerWeek: Int!
    icon: String
    color: String
    animation: String
    enabled: Boolean!
  }

  type BonusEvent {
    id: ID!
    eventType: String!
    creditsAwarded: Int!
    createdAt: DateTime!
  }

  type BonusEventResult {
    triggered: Boolean!
    eventType: String
    creditsAwarded: Int
    eventId: ID
    message: String
  }

  # Credit packages for purchase
  type CreditPackage {
    id: ID!
    name: String!
    priceCents: Int!
    credits: Int!
    bonusCredits: Int!
    bonusPercent: Float!
    totalCredits: Int!
    popular: Boolean!
    bestValue: Boolean!
    displayOrder: Int!
  }

  # Social spending types
  type TipResult {
    success: Boolean!
    error: String
    transactionId: ID
    amount: Int!
    newBalance: Int!
    recipientUsername: String
  }

  type GiftResult {
    success: Boolean!
    error: String
    transactionId: ID
    itemSku: String!
    cost: Int!
    fee: Int!
    newBalance: Int!
    recipientUsername: String
  }

  type SuperHighFiveResult {
    success: Boolean!
    error: String
    transactionId: ID
    type: String!
    cost: Int!
    newBalance: Int!
    recipientUsername: String
    animationUrl: String
  }

  type PostBoostResult {
    success: Boolean!
    error: String
    transactionId: ID
    cost: Int!
    newBalance: Int!
    boostEndsAt: DateTime
    targetType: String!
    targetId: ID!
  }

  # Enhanced transaction history
  type TransactionHistoryResult {
    transactions: [Transaction!]!
    totalCount: Int!
    hasMore: Boolean!
    nextCursor: String
  }

  input TransactionHistoryInput {
    action: String
    fromDate: DateTime
    toDate: DateTime
    limit: Int
    cursor: String
  }

  # Wallet transfer types
  type TransferResult {
    success: Boolean!
    error: String
    transactionId: ID
    amount: Int!
    fee: Int!
    newBalance: Int!
    recipientUsername: String
  }

  input TransferInput {
    recipientId: ID!
    amount: Int!
    message: String
  }

  input TipInput {
    recipientId: ID!
    amount: Int!
    message: String
    isAnonymous: Boolean
  }

  input GiftInput {
    recipientId: ID!
    itemSku: String!
    message: String
    isAnonymous: Boolean
  }

  input SuperHighFiveInput {
    recipientId: ID!
    type: String!
    targetType: String
    targetId: ID
    message: String
  }

  input PostBoostInput {
    targetType: String!
    targetId: ID!
    durationHours: Int!
  }

  # ============================================
  # TIPS & MILESTONES TYPES
  # ============================================
  type Tip {
    id: ID!
    type: String!
    title: String!
    content: String!
    category: String
    exerciseId: ID
    priority: Int!
    seen: Boolean!
  }

  type Milestone {
    id: ID!
    type: String!
    title: String!
    description: String!
    target: Int!
    current: Int!
    reward: Int!
    claimed: Boolean!
    unlockedAt: DateTime
  }

  type MilestoneClaimResult {
    success: Boolean!
    milestone: Milestone!
    creditsEarned: Int!
    newBalance: Int!
  }

  type Achievement {
    id: ID!
    name: String!
    description: String!
    icon: String
    rarity: String!
    unlockedAt: DateTime!
  }

  # ============================================
  # MESSAGING TYPES
  # ============================================
  type Conversation {
    id: ID!
    participants: [User!]!
    lastMessage: Message
    unreadCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Message {
    id: ID!
    conversationId: ID!
    senderId: ID!
    sender: User!
    content: String!
    read: Boolean!
    createdAt: DateTime!
  }

  # ============================================
  # ISSUES & ROADMAP TYPES
  # ============================================
  type Issue {
    id: ID!
    title: String!
    description: String!
    status: String!
    priority: String!
    labels: [IssueLabel!]!
    authorId: ID!
    author: User!
    votes: Int!
    userVote: Int
    subscribed: Boolean!
    comments: [IssueComment!]
    solutionCommentId: ID
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type IssueLabel {
    id: ID!
    name: String!
    color: String!
    description: String
  }

  type IssueComment {
    id: ID!
    issueId: ID!
    authorId: ID!
    author: User!
    content: String!
    isSolution: Boolean!
    createdAt: DateTime!
  }

  type IssueStats {
    total: Int!
    open: Int!
    inProgress: Int!
    resolved: Int!
    closed: Int!
  }

  type Update {
    id: ID!
    title: String!
    content: String!
    type: String!
    createdAt: DateTime!
  }

  type RoadmapItem {
    id: ID!
    title: String!
    description: String!
    status: String!
    quarter: String
    votes: Int!
    userVoted: Boolean!
    createdAt: DateTime!
  }

  input IssueInput {
    title: String!
    description: String!
    labels: [ID!]
  }

  input IssueUpdateInput {
    title: String
    description: String
    status: String
    priority: String
    labels: [ID!]
  }

  input UpdateInput {
    title: String!
    content: String!
    type: String!
  }

  input RoadmapInput {
    title: String!
    description: String!
    quarter: String
  }

  # ============================================
  # HANGOUTS TYPES
  # ============================================
  type HangoutType {
    id: ID!
    name: String!
    description: String!
    icon: String
    minParticipants: Int!
    maxParticipants: Int!
  }

  type Hangout {
    id: ID!
    typeId: ID!
    type: HangoutType!
    title: String!
    description: String
    hostId: ID!
    host: User!
    location: HangoutLocation!
    startsAt: DateTime!
    endsAt: DateTime
    status: String!
    members: [HangoutMember!]!
    memberCount: Int!
    maxMembers: Int
    posts: [HangoutPost!]
    createdAt: DateTime!
  }

  type HangoutLocation {
    lat: Float!
    lng: Float!
    address: String
    placeName: String
  }

  type HangoutMember {
    userId: ID!
    user: User!
    role: String!
    joinedAt: DateTime!
  }

  type HangoutMembership {
    hangoutId: ID!
    userId: ID!
    role: String!
    joinedAt: DateTime!
  }

  type HangoutPost {
    id: ID!
    hangoutId: ID!
    authorId: ID!
    author: User!
    content: String!
    createdAt: DateTime!
  }

  type HangoutStats {
    totalHangouts: Int!
    activeHangouts: Int!
    totalParticipants: Int!
  }

  input HangoutInput {
    typeId: ID!
    title: String!
    description: String
    lat: Float!
    lng: Float!
    address: String
    placeName: String
    startsAt: DateTime!
    endsAt: DateTime
    maxMembers: Int
  }

  # ============================================
  # ONBOARDING TYPES
  # ============================================
  type OnboardingStatus {
    completed: Boolean!
    currentStep: String
    stepsCompleted: [String!]!
    profile: OnboardingProfile
  }

  type OnboardingProfile {
    displayName: String
    fitnessGoals: [String!]
    experienceLevel: String
    preferredWorkoutTime: String
    equipment: OnboardingEquipment
  }

  type OnboardingEquipment {
    type: String!
    kettlebellCount: Int
    extras: [String!]
  }

  type OnboardingResult {
    success: Boolean!
    user: User!
    journey: JourneyProgress
  }

  input OnboardingProfileInput {
    displayName: String
    fitnessGoals: [String!]
    experienceLevel: String
    preferredWorkoutTime: String
  }

  input HomeEquipmentInput {
    type: String!
    kettlebellCount: Int
    extras: [String!]
  }

  # ============================================
  # PERSONALIZATION TYPES
  # ============================================
  type PersonalizationContext {
    archetype: Archetype
    level: Int!
    recentMuscles: [String!]!
    weakPoints: [String!]!
    limitations: [Limitation!]!
    equipment: [String!]!
    preferences: JSON
  }

  type Recommendation {
    type: String!
    exerciseId: ID
    exercise: Exercise
    reason: String!
    priority: Int!
  }

  type PersonalPlan {
    weeklySchedule: JSON!
    focusAreas: [String!]!
    estimatedProgress: JSON
  }

  type PersonalizationSummary {
    strengths: [String!]!
    areasForImprovement: [String!]!
    suggestedFocus: String
  }

  type ExerciseCheck {
    suitable: Boolean!
    warnings: [String!]
    alternatives: [Exercise!]
  }

  # ============================================
  # PRESCRIPTION TYPES
  # ============================================
  type Prescription {
    id: ID!
    userId: ID!
    exercises: [PrescribedExercise!]!
    warmup: [PrescribedExercise!]
    cooldown: [PrescribedExercise!]
    targetDuration: Int!
    actualDuration: Int!
    muscleCoverage: JSON
    difficulty: String!
    createdAt: DateTime!
  }

  type PrescribedExercise {
    exerciseId: ID!
    name: String!
    sets: Int!
    reps: Int!
    restSeconds: Int!
    notes: String
    primaryMuscles: [String!]!
    phase: String
  }

  input PrescriptionInput {
    timeAvailable: Int!
    location: String!
    equipment: [String!]
    goals: [String!]!
  }

  # ============================================
  # PRIVACY TYPES
  # ============================================
  type PrivacySettings {
    profileVisibility: String!
    showInLeaderboards: Boolean!
    showWorkoutHistory: Boolean!
    allowMessages: String!
    shareProgress: Boolean!
    minimalistMode: Boolean!
  }

  type PrivacySummary {
    dataCollected: [String!]!
    dataShared: [String!]!
    retentionPeriod: String!
  }

  input PrivacyInput {
    profileVisibility: String
    showInLeaderboards: Boolean
    showWorkoutHistory: Boolean
    allowMessages: String
    shareProgress: Boolean
  }

  # ============================================
  # PT TEST TYPES
  # ============================================
  type PTTest {
    id: ID!
    name: String!
    description: String!
    instructions: [String!]!
    metrics: [PTTestMetric!]!
    archetypeId: ID
    category: String!
  }

  type PTTestMetric {
    id: ID!
    name: String!
    unit: String!
    higherIsBetter: Boolean!
  }

  type PTTestResult {
    id: ID!
    userId: ID!
    testId: ID!
    test: PTTest!
    scores: JSON!
    totalScore: Float!
    percentile: Float
    createdAt: DateTime!
  }

  type PTTestLeaderboardEntry {
    rank: Int!
    userId: ID!
    username: String!
    avatar: String
    score: Float!
    createdAt: DateTime!
  }

  input PTTestResultInput {
    testId: ID!
    scores: JSON!
  }

  # ============================================
  # HEALTH TYPES
  # ============================================
  type HealthStatus {
    status: String!
    timestamp: DateTime!
  }

  type DetailedHealthStatus {
    status: String!
    version: String!
    uptime: Float!
    database: ServiceStatus!
    redis: ServiceStatus!
    memory: MemoryStatus!
  }

  type ServiceStatus {
    connected: Boolean!
    latency: Float
  }

  type MemoryStatus {
    used: Float!
    total: Float!
    percentage: Float!
  }

  # ============================================
  # CAREER READINESS TYPES
  # ============================================
  type CareerStandard {
    id: ID!
    name: String!
    fullName: String
    agency: String
    category: String
    description: String
    officialUrl: String
    scoringType: String!
    recertificationPeriodMonths: Int
    events: [CareerStandardEvent!]!
    eventCount: Int!
    icon: String
    maxScore: Int
    passingScore: Int
  }

  type CareerStandardEvent {
    id: ID!
    name: String!
    description: String
    metricType: String
    metricUnit: String
    direction: String
    passingThreshold: Float
    exerciseMappings: [String!]
    tips: [String!]
    orderIndex: Int!
  }

  type CareerGoal {
    id: ID!
    standard: CareerStandard
    standardId: ID!
    targetDate: String
    priority: String!
    status: String!
    agencyName: String
    notes: String
    readiness: CareerReadiness
    daysRemaining: Int
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type CareerReadiness {
    score: Float
    status: String!
    trend: String
    trendDelta: Float
    eventBreakdown: [EventReadiness!]!
    weakEvents: [String!]!
    lastAssessmentAt: String
    eventsPassed: Int!
    eventsTotal: Int!
  }

  type EventReadiness {
    eventId: ID!
    eventName: String!
    passed: Boolean
    value: Float
    status: String!
  }

  type CareerStandardCategory {
    category: String!
    count: Int!
    icon: String!
  }

  type CareerAssessment {
    id: ID!
    userId: ID!
    standardId: ID!
    assessmentType: String!
    results: JSON!
    totalScore: Float
    passed: Boolean
    assessedAt: DateTime!
    createdAt: DateTime!
  }

  type ExerciseRecommendation {
    exerciseId: ID!
    exerciseName: String!
    targetEvents: [String!]!
  }

  input CareerGoalInput {
    standardId: ID!
    targetDate: String
    priority: String
    agencyName: String
    notes: String
  }

  input CareerGoalUpdateInput {
    targetDate: String
    priority: String
    status: String
    agencyName: String
    notes: String
  }

  input CareerAssessmentInput {
    standardId: ID!
    assessmentType: String!
    results: JSON!
    assessedAt: String
  }

  # ============================================
  # TRAINING PROGRAMS TYPES
  # ============================================
  type TrainingProgram {
    id: ID!
    creatorId: ID
    creatorUsername: String
    creatorDisplayName: String
    name: String!
    description: String
    shortDescription: String
    durationWeeks: Int!
    daysPerWeek: Int!
    schedule: [ProgramDay!]!
    progressionRules: JSON
    difficulty: String
    category: String
    goals: [String!]!
    targetMuscles: [String!]!
    equipmentRequired: [String!]!
    isPublic: Boolean!
    isOfficial: Boolean!
    isFeatured: Boolean!
    totalEnrollments: Int!
    activeEnrollments: Int!
    completionRate: Float!
    averageRating: Float!
    ratingCount: Int!
    imageUrl: String
    thumbnailUrl: String
    isEnrolled: Boolean
    userRating: Int
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ProgramDay {
    day: Int!
    name: String!
    focus: String
    exercises: [ProgramExercise!]!
    notes: String
  }

  type ProgramExercise {
    exerciseId: ID!
    name: String
    sets: Int!
    reps: String!
    restSeconds: Int!
    notes: String
    weight: Float
    rpe: Float
  }

  type ProgramEnrollment {
    id: ID!
    userId: ID!
    programId: ID!
    program: TrainingProgram
    currentWeek: Int!
    currentDay: Int!
    status: String!
    startedAt: DateTime!
    pausedAt: DateTime
    completedAt: DateTime
    expectedEndDate: DateTime
    workoutsCompleted: Int!
    totalWorkouts: Int!
    streakCurrent: Int!
    streakLongest: Int!
    progressData: JSON
    userRating: Int
    userReview: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type EnrollmentProgress {
    weekProgress: Float!
    totalProgress: Float!
    daysRemaining: Int!
    onTrack: Boolean!
    nextWorkout: ProgramDay
  }

  type TodaysWorkoutResult {
    enrollment: ProgramEnrollment!
    program: TrainingProgram!
    todaysWorkout: ProgramDay
  }

  type EnrollmentWithProgram {
    enrollment: ProgramEnrollment!
    program: TrainingProgram!
    progress: EnrollmentProgress!
  }

  input CreateProgramInput {
    name: String!
    description: String
    shortDescription: String
    durationWeeks: Int!
    daysPerWeek: Int!
    schedule: [ProgramDayInput!]!
    progressionRules: JSON
    difficulty: String
    category: String
    goals: [String!]
    targetMuscles: [String!]
    equipmentRequired: [String!]
    isPublic: Boolean
    imageUrl: String
  }

  input UpdateProgramInput {
    name: String
    description: String
    shortDescription: String
    durationWeeks: Int
    daysPerWeek: Int
    schedule: [ProgramDayInput!]
    progressionRules: JSON
    difficulty: String
    category: String
    goals: [String!]
    targetMuscles: [String!]
    equipmentRequired: [String!]
    isPublic: Boolean
    imageUrl: String
  }

  input ProgramDayInput {
    day: Int!
    name: String!
    focus: String
    exercises: [ProgramExerciseInput!]!
    notes: String
  }

  input ProgramExerciseInput {
    exerciseId: ID!
    name: String
    sets: Int!
    reps: String!
    restSeconds: Int!
    notes: String
    weight: Float
    rpe: Float
  }

  input ProgramSearchInput {
    search: String
    category: String
    difficulty: String
    minRating: Float
    durationWeeks: Int
    daysPerWeek: Int
    official: Boolean
    featured: Boolean
    goals: [String!]
    equipment: [String!]
    creator: ID
    sortBy: String
    limit: Int
    offset: Int
  }

  # ============================================
  # MISC TYPES
  # ============================================
  input FrontendLogInput {
    level: String!
    message: String!
    context: JSON
    stack: String
    url: String
    userAgent: String
  }

  # ============================================
  # SLEEP & RECOVERY TYPES
  # ============================================
  type SleepLog {
    id: ID!
    userId: ID!
    bedTime: DateTime!
    wakeTime: DateTime!
    sleepDurationMinutes: Int!
    quality: Int!
    sleepEnvironment: SleepEnvironment
    timeToFallAsleepMinutes: Int
    wakeCount: Int
    notes: String
    source: String!
    externalId: String
    loggedAt: DateTime!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type SleepEnvironment {
    dark: Boolean
    quiet: Boolean
    temperature: String
    screenBeforeBed: Boolean
    caffeineAfter6pm: Boolean
    alcoholConsumed: Boolean
  }

  type RecoveryScore {
    id: ID!
    userId: ID!
    score: Int!
    classification: String!
    factors: RecoveryFactors!
    recommendedIntensity: String!
    recommendedWorkoutTypes: [String!]!
    trend: String
    trendConfidence: Float
    calculatedAt: DateTime!
    expiresAt: DateTime!
    dataSources: [String!]!
  }

  type RecoveryFactors {
    sleepDurationScore: Int!
    sleepQualityScore: Int!
    restDaysScore: Int!
    hrvBonus: Int
    strainPenalty: Int
    consistencyBonus: Int
    sleepDetails: SleepDetails
    restDetails: RestDetails
    hrvDetails: HrvDetails
  }

  type SleepDetails {
    hoursSlept: Float!
    targetHours: Float!
    qualityRating: Int!
  }

  type RestDetails {
    daysSinceLastWorkout: Int!
    workoutsThisWeek: Int!
    averageIntensity: Float!
  }

  type HrvDetails {
    currentHrv: Float
    baselineHrv: Float
    percentOfBaseline: Int
  }

  type RecoveryRecommendation {
    id: ID!
    userId: ID!
    recoveryScoreId: ID
    type: String!
    priority: Int!
    title: String!
    description: String!
    actionItems: [ActionItem!]!
    relatedExerciseIds: [ID!]!
    relatedTipIds: [ID!]!
    acknowledgedAt: DateTime
    followed: Boolean
    feedback: String
    createdAt: DateTime!
    expiresAt: DateTime!
  }

  type ActionItem {
    action: String!
    completed: Boolean!
  }

  type SleepGoal {
    id: ID!
    userId: ID!
    targetHours: Float!
    targetBedTime: String
    targetWakeTime: String
    targetQuality: Int
    consistencyTarget: Int!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type SleepStats {
    period: String!
    nightsLogged: Int!
    avgDurationMinutes: Float!
    avgDurationHours: Float!
    avgQuality: Float!
    minDurationMinutes: Int!
    maxDurationMinutes: Int!
    consistency: Int!
    targetMet: Int!
    qualityDistribution: QualityDistribution!
  }

  type QualityDistribution {
    terrible: Int!
    poor: Int!
    fair: Int!
    good: Int!
    excellent: Int!
  }

  type RecoveryStatus {
    currentScore: RecoveryScore
    lastSleep: SleepLog
    sleepStats: SleepStats!
    recommendations: [RecoveryRecommendation!]!
    sleepGoal: SleepGoal
    nextWorkoutSuggestion: WorkoutSuggestion!
  }

  type WorkoutSuggestion {
    intensity: String!
    types: [String!]!
    reason: String!
  }

  type RecoveryHistory {
    scores: [RecoveryScore!]!
    averageScore: Int!
    trend: String!
    bestScore: Int!
    worstScore: Int!
    daysTracked: Int!
  }

  type SleepHistoryResult {
    logs: [SleepLog!]!
    nextCursor: String
    hasMore: Boolean!
  }

  type WeeklySleepStats {
    weekStart: DateTime!
    nightsLogged: Int!
    avgDurationMinutes: Float!
    avgQuality: Float!
    minDurationMinutes: Int!
    maxDurationMinutes: Int!
    stddevDuration: Float!
  }

  input SleepLogInput {
    bedTime: DateTime!
    wakeTime: DateTime!
    quality: Int!
    sleepEnvironment: SleepEnvironmentInput
    timeToFallAsleepMinutes: Int
    wakeCount: Int
    notes: String
    source: String
    externalId: String
    loggedAt: DateTime
  }

  input SleepEnvironmentInput {
    dark: Boolean
    quiet: Boolean
    temperature: String
    screenBeforeBed: Boolean
    caffeineAfter6pm: Boolean
    alcoholConsumed: Boolean
  }

  input UpdateSleepLogInput {
    quality: Int
    sleepEnvironment: SleepEnvironmentInput
    timeToFallAsleepMinutes: Int
    wakeCount: Int
    notes: String
  }

  input SleepGoalInput {
    targetHours: Float!
    targetBedTime: String
    targetWakeTime: String
    targetQuality: Int
    consistencyTarget: Int
  }

  input RecommendationFeedbackInput {
    followed: Boolean
    feedback: String
  }

  # ============================================
  # NUTRITION TYPES
  # ============================================
  type NutritionDashboard {
    enabled: Boolean!
    preferences: NutritionPreferences
    goals: NutritionGoals
    todaySummary: DailyNutritionSummary
    streaks: NutritionStreaks
    archetypeProfile: ArchetypeNutritionProfile
    recentMeals: [MealLog!]!
  }

  type NutritionPreferences {
    enabled: Boolean!
    trackingMode: String!
    showOnDashboard: Boolean!
    showInCommunity: Boolean!
    goalType: String!
    syncWithArchetype: Boolean!
    syncWithWorkouts: Boolean!
    dietaryRestrictions: [String!]
  }

  type NutritionGoals {
    id: ID!
    userId: ID!
    calories: Int!
    proteinG: Int!
    carbsG: Int!
    fatG: Int!
    fiberG: Int
    workoutDayCalories: Int
    workoutDayProteinG: Int
    weekdayCalories: Int
    weekendCalories: Int
    calculationMethod: String
    tdeeBase: Int
    activityMultiplier: Float
    goalAdjustment: Int
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DailyNutritionSummary {
    date: String!
    totalCalories: Int!
    totalProteinG: Float!
    totalCarbsG: Float!
    totalFatG: Float!
    totalFiberG: Float
    goalCalories: Int!
    goalProteinG: Int!
    goalCarbsG: Int!
    goalFatG: Int!
    mealCount: Int!
    wasWorkoutDay: Boolean!
    waterMl: Int
    meals: [MealLog!]!
  }

  type NutritionStreaks {
    currentLoggingStreak: Int!
    longestLoggingStreak: Int!
    currentGoalStreak: Int!
    longestGoalStreak: Int!
    lastLoggedAt: DateTime
  }

  type ArchetypeNutritionProfile {
    archetypeId: ID!
    archetypeName: String!
    proteinRatio: Float!
    carbsRatio: Float!
    fatRatio: Float!
    recommendedCalories: Int
    mealTiming: [String!]
    preworkoutRecommendations: [String!]
    postworkoutRecommendations: [String!]
    supplements: [String!]
    tips: [String!]
  }

  type MealLog {
    id: ID!
    userId: ID!
    foodItemId: ID
    mealType: String!
    servings: Float!
    totalCalories: Int!
    totalProteinG: Float!
    totalCarbsG: Float!
    totalFatG: Float!
    totalFiberG: Float
    quickEntryName: String
    quickEntryCalories: Int
    loggedVia: String!
    loggedAt: DateTime!
    notes: String
    food: FoodItem
    createdAt: DateTime!
  }

  type FoodItem {
    id: ID!
    name: String!
    brand: String
    servingSize: Float!
    servingUnit: String!
    servingDescription: String
    calories: Int!
    proteinG: Float!
    carbsG: Float!
    fatG: Float!
    fiberG: Float
    sugarG: Float
    sodiumMg: Float
    source: String!
    sourceId: String
    barcode: String
    imageUrl: String
    isVerified: Boolean!
    createdAt: DateTime!
  }

  type FoodSearchResult {
    foods: [FoodItem!]!
    total: Int!
    source: String
    hasMore: Boolean!
  }

  type Recipe {
    id: ID!
    creatorId: ID
    name: String!
    description: String
    servings: Int!
    prepTimeMinutes: Int
    cookTimeMinutes: Int
    totalCalories: Int!
    totalProteinG: Float!
    totalCarbsG: Float!
    totalFatG: Float!
    ingredients: [RecipeIngredient!]!
    instructions: [String!]!
    tags: [String!]
    imageUrl: String
    rating: Float
    ratingCount: Int!
    isPublic: Boolean!
    isSaved: Boolean
    createdAt: DateTime!
  }

  type RecipeIngredient {
    foodItemId: ID
    name: String!
    amount: Float!
    unit: String!
  }

  type MealPlan {
    id: ID!
    userId: ID!
    name: String!
    description: String
    status: String!
    durationDays: Int!
    mealsPerDay: Int!
    startDate: DateTime
    avgCalories: Int
    avgProteinG: Int
    avgCarbsG: Int
    avgFatG: Int
    preferences: [String!]
    days: [MealPlanDay!]
    shoppingList: [ShoppingListItem!]
    createdAt: DateTime!
  }

  type MealPlanDay {
    dayNumber: Int!
    date: DateTime
    meals: [MealPlanMeal!]!
    totalCalories: Int!
    totalProteinG: Float!
    totalCarbsG: Float!
    totalFatG: Float!
  }

  type MealPlanMeal {
    mealType: String!
    recipeId: ID
    foodItemId: ID
    name: String!
    servings: Float!
    calories: Int!
    proteinG: Float!
    carbsG: Float!
    fatG: Float!
  }

  type ShoppingListItem {
    category: String!
    name: String!
    amount: Float!
    unit: String!
    checked: Boolean!
  }

  type HydrationLog {
    id: ID!
    userId: ID!
    amountMl: Int!
    beverageType: String!
    loggedAt: DateTime!
    createdAt: DateTime!
  }

  type HydrationSummary {
    logs: [HydrationLog!]!
    totalMl: Int!
    goalMl: Int!
    percentComplete: Float!
  }

  type NutritionHistoryEntry {
    date: String!
    calories: Int!
    proteinG: Float!
    carbsG: Float!
    fatG: Float!
    goalCalories: Int!
    goalMet: Boolean!
    mealCount: Int!
  }

  type MacroCalculationResult {
    calories: Int!
    proteinG: Int!
    carbsG: Int!
    fatG: Int!
    tdee: Int!
    bmr: Int!
    proteinRatio: Float!
    carbsRatio: Float!
    fatRatio: Float!
    breakdown: MacroBreakdown!
  }

  type MacroBreakdown {
    proteinCalories: Int!
    carbsCalories: Int!
    fatCalories: Int!
  }

  input NutritionPreferencesInput {
    trackingMode: String
    showOnDashboard: Boolean
    showInCommunity: Boolean
    goalType: String
    syncWithArchetype: Boolean
    syncWithWorkouts: Boolean
    dietaryRestrictions: [String!]
  }

  input NutritionGoalsInput {
    calories: Int
    proteinG: Int
    carbsG: Int
    fatG: Int
    fiberG: Int
    workoutDayCalories: Int
    workoutDayProteinG: Int
  }

  input MacroCalculationInput {
    weightKg: Float!
    heightCm: Float!
    age: Int!
    gender: String!
    activityLevel: String!
    goal: String!
    archetype: String
  }

  input MealLogInput {
    mealType: String!
    foodId: ID
    servings: Float
    quickEntryName: String
    quickEntryCalories: Int
    quickEntryProteinG: Float
    quickEntryCarbsG: Float
    quickEntryFatG: Float
    notes: String
    loggedVia: String
    loggedAt: DateTime
  }

  input HydrationLogInput {
    amountMl: Int!
    beverageType: String
  }

  input RecipeInput {
    name: String!
    description: String
    servings: Int!
    prepTimeMinutes: Int
    cookTimeMinutes: Int
    ingredients: [RecipeIngredientInput!]!
    instructions: [String!]!
    tags: [String!]
    imageUrl: String
    isPublic: Boolean
  }

  input RecipeIngredientInput {
    foodItemId: ID
    name: String!
    amount: Float!
    unit: String!
    calories: Int
    proteinG: Float
    carbsG: Float
    fatG: Float
  }

  input MealPlanInput {
    name: String!
    description: String
    durationDays: Int!
    mealsPerDay: Int!
    preferences: [String!]
    targetCalories: Int
    excludeIngredients: [String!]
  }

  input MealPlanGenerateInput {
    durationDays: Int!
    mealsPerDay: Int!
    preferences: [String!]
    excludeIngredients: [String!]
    targetCalories: Int
  }

  # ============================================
  # RPE/RIR TRACKING TYPES
  # ============================================
  type RPEScaleEntry {
    rpe: Float!
    rir: Int
    description: String!
    intensity: String!
  }

  type RPEScale {
    scale: [RPEScaleEntry!]!
    guide: [RPEGuideEntry!]!
  }

  type RPEGuideEntry {
    rpe: Int!
    rir: Int!
    label: String!
    description: String!
  }

  type RPETrendEntry {
    date: DateTime!
    avgRpe: Float!
    avgRir: Float
    setCount: Int!
    avgWeight: Float!
    maxWeight: Float!
    avgReps: Float!
  }

  type RPETrends {
    exerciseId: ID!
    exerciseName: String
    trends: [RPETrendEntry!]!
    summary: RPETrendSummary!
  }

  type RPETrendSummary {
    avgRpe: Float!
    totalSets: Int!
    daysWithData: Int!
    trend: String!
  }

  type RPEWeeklyTrendEntry {
    weekStart: DateTime!
    avgRpe: Float!
    avgRir: Float
    totalSets: Int!
    rpeVariance: Float!
    minRpe: Float!
    maxRpe: Float!
    avgWeight: Float!
    totalVolume: Float!
  }

  type RPEWeeklyTrends {
    exerciseId: ID!
    trends: [RPEWeeklyTrendEntry!]!
  }

  type FatigueAnalysis {
    fatigueScore: Int!
    classification: String!
    indicators: [String!]!
    recommendation: String!
    suggestedIntensity: String!
    recentRpeTrend: String!
  }

  type AutoRegulationSuggestion {
    exerciseId: ID!
    exerciseName: String
    currentWeight: Float
    suggestedWeight: Float!
    suggestedReps: Int!
    targetRpe: Int!
    reasoning: String!
    adjustmentPercent: Int!
    confidence: String!
  }

  type AutoRegulationContext {
    fatigueLevel: String!
    fatigueScore: Int!
    overallRecommendation: String!
  }

  type AutoRegulationResult {
    suggestions: [AutoRegulationSuggestion!]!
    context: AutoRegulationContext!
  }

  type RPETarget {
    exerciseId: ID!
    rpe: Int
    rir: Int
  }

  type RPESnapshot {
    date: DateTime!
    avgRpe: Float!
    avgRir: Float
    totalSets: Int!
    fatigueScore: Int!
    recoveryRecommendation: String!
  }

  input AutoRegulateInput {
    exerciseIds: [ID!]!
    targetRpe: Int
  }

  input RPETargetInput {
    rpe: Int
    rir: Int
  }

  # ============================================
  # MASCOT / SPIRIT ANIMAL TYPES
  # ============================================

  type MascotState {
    id: ID!
    userId: ID!
    nickname: String
    stage: Int!
    xp: Int!
    progression: MascotProgression!
    isVisible: Boolean!
    isMinimized: Boolean!
    soundsEnabled: Boolean!
    tipsEnabled: Boolean!
    createdAt: DateTime!
  }

  type MascotProgression {
    currentXp: Int!
    prevStageXp: Int!
    nextStageXp: Int!
    progressPercent: Float!
    isMaxStage: Boolean!
  }

  type MascotAppearance {
    base: MascotBaseTraits!
    stageFeatures: MascotStageFeatures!
    equipped: MascotLoadout!
    final: MascotFinalAppearance!
    animationConfig: MascotAnimationConfig!
  }

  type MascotBaseTraits {
    species: String!
    bodyShape: String!
    baseColor: String!
    secondaryColor: String!
    accentColor: String!
    eyeStyle: String!
    eyeColor: String!
    mouthStyle: String!
    expressionDefault: String!
    earStyle: String!
    tailStyle: String!
    patternType: String!
    patternIntensity: Float!
    energyLevel: String!
    demeanor: String!
  }

  type MascotStageFeatures {
    stage: Int!
    auraUnlocked: Boolean!
    wingsUnlocked: Boolean!
    specialEffectsUnlocked: Boolean!
    evolutionGlow: Boolean!
  }

  type MascotLoadout {
    skin: MascotCosmetic
    eyes: MascotCosmetic
    outfit: MascotCosmetic
    headwear: MascotCosmetic
    footwear: MascotCosmetic
    accessory1: MascotCosmetic
    accessory2: MascotCosmetic
    accessory3: MascotCosmetic
    aura: MascotCosmetic
    background: MascotCosmetic
    emoteVictory: MascotCosmetic
    emoteIdle: MascotCosmetic
  }

  type MascotFinalAppearance {
    renderSeed: String!
    colorPalette: [String!]!
    activeEffects: [String!]!
  }

  type MascotAnimationConfig {
    idleSpeed: Float!
    movementAmplitude: Float!
    blinkRate: Float!
    bounciness: Float!
    breathingDepth: Float!
  }

  type MascotCosmetic {
    id: ID!
    itemKey: String!
    name: String!
    description: String
    category: String!
    slot: String
    rarity: String!
    basePrice: Int!
    stageRequired: Int!
    isPurchasable: Boolean!
    isTradeable: Boolean!
    isGiftable: Boolean!
    previewUrl: String
    assetUrl: String
  }

  type MascotPowers {
    companionStage: Int!
    energy: MascotEnergy!
    bonusMultiplier: MascotBonusMultiplier!
    streakSaver: MascotStreakSaver!
    creditGuardianFeatures: [String!]!
    schedulerLevel: String!
    canSuggestRecovery: Boolean!
    canPredictMilestones: Boolean!
    canAutoHighfive: Boolean!
    canTrashTalk: Boolean!
    canCoordinateCrews: Boolean!
    canDetectAnomalies: Boolean!
    canSuggestSettings: Boolean!
    canGeneratePrograms: Boolean!
    hasInjuryPrevention: Boolean!
    hasNutritionHints: Boolean!
    masterAbilities: [String!]!
  }

  type MascotEnergy {
    current: Int!
    max: Int!
    regenPerHour: Int!
  }

  type MascotBonusMultiplier {
    totalMultiplier: Float!
    firstWorkoutBonus: Float!
    consecutiveBonus: Float!
    consecutiveDays: Int!
  }

  type MascotStreakSaver {
    weeklySaves: Int!
    savesUsed: Int!
    savesRemaining: Int!
    creditCost: Int!
    energyCost: Int!
    canSaveAnyStreak: Boolean!
  }

  # ============================================
  # MASCOT ADVANCED POWERS TYPES
  # ============================================

  type MascotExerciseAlternative {
    exerciseId: ID!
    exerciseName: String!
    reason: String!
    similarityScore: Float!
    equipment: [String!]!
    difficulty: String!
  }

  type MascotCrewSuggestion {
    crewId: ID!
    crewName: String!
    matchScore: Int!
    matchReasons: [String!]!
    memberCount: Int!
  }

  type MascotRivalryAlert {
    id: ID!
    rivalUserId: ID!
    rivalUsername: String!
    alertType: String!
    rivalAction: String
    yourStanding: String
    suggestion: String
    createdAt: DateTime!
  }

  type MascotCreditLoanOffer {
    available: Boolean!
    maxAmount: Int!
    interestRate: Float!
    currentLoan: Int!
    canBorrow: Boolean!
    reason: String
  }

  type MascotCreditLoanResult {
    success: Boolean!
    error: String
    newBalance: Int
    amountRepaid: Int
    remainingDebt: Int
  }

  type MascotVolumeStats {
    muscleGroup: String!
    weeklyVolume: Int!
    averageIntensity: Float!
    frequency: Int!
    trend: String!
    recommendation: String
  }

  type MascotOvertrainingAlert {
    id: ID!
    alertType: String!
    affectedArea: String!
    riskLevel: String!
    recommendation: String
  }

  type MascotWorkoutSuggestion {
    id: ID!
    suggestedFor: DateTime!
    suggestionType: String!
    focusMuscles: [String!]!
    recommendedExercises: [String!]!
    durationMinutes: Int!
    reason: String!
  }

  type MascotMilestoneProgress {
    id: ID!
    milestoneType: String!
    milestoneName: String!
    currentValue: Int!
    targetValue: Int!
    estimatedCompletion: DateTime
    confidencePercent: Int!
  }

  type MascotMasterAbility {
    abilityKey: String!
    abilityName: String!
    description: String!
    category: String!
    unlocked: Boolean!
    creditCost: Int!
  }

  type MascotGeneratedProgram {
    id: ID!
    name: String!
    type: String!
    goal: String!
    durationWeeks: Int!
    daysPerWeek: Int!
    schedule: JSON!
    workouts: [MascotProgramWorkout!]!
    creditCost: Int!
  }

  type MascotProgramWorkout {
    weekNumber: Int!
    dayNumber: Int!
    name: String!
    focusAreas: [String!]!
    exercises: [MascotProgramExercise!]!
    durationMinutes: Int!
    isDeload: Boolean!
  }

  type MascotProgramExercise {
    exerciseId: ID!
    exerciseName: String!
    sets: Int!
    reps: String!
    restSeconds: Int!
    notes: String
  }

  type MascotProgramGenerationResult {
    success: Boolean!
    error: String
    program: MascotGeneratedProgram
    creditCost: Int
  }

  type MascotStreakSaveResult {
    success: Boolean!
    error: String
    saveId: ID
  }

  type MascotAssistState {
    chargesRemaining: Int!
    chargesMax: Int!
    lastChargeReset: DateTime
    lastAssistUsed: DateTime
    totalAssistsUsed: Int!
    exercisesAssistedToday: Int!
    canUseAssist: Boolean!
    cooldownEndsAt: DateTime
    companionStage: Int!
    userRankTier: Int!
    ability: MascotAssistAbility
  }

  type MascotAssistAbility {
    id: ID!
    name: String!
    maxExercises: Int!
    dailyCharges: Int!
    cooldownHours: Int!
  }

  type MascotAssistResult {
    success: Boolean!
    error: String
    assistLogId: ID
    tuAwarded: Float
    chargesRemaining: Int
    message: String
  }

  type MascotCreditAlert {
    id: ID!
    alertType: String!
    message: String!
    currentBalance: Int!
    workoutCost: Int
    dismissed: Boolean!
    createdAt: DateTime!
  }

  type MascotNegotiatedRate {
    discountPercent: Int!
    available: Boolean!
  }

  type MascotHighfivePrefs {
    enabled: Boolean!
    closeFriends: Boolean!
    crew: Boolean!
    allFollowing: Boolean!
    dailyLimit: Int!
    usedToday: Int!
  }

  type MascotSocialAction {
    actionType: String!
    targetUserId: ID!
    targetUsername: String!
    actionData: JSON!
    priority: Int!
  }

  input MascotHighfivePrefsInput {
    enabled: Boolean
    closeFriends: Boolean
    crew: Boolean
    allFollowing: Boolean
    dailyLimit: Int
  }

  input MascotProgramGenerationInput {
    programType: String!
    goal: String!
    durationWeeks: Int!
    daysPerWeek: Int!
    equipment: [String!]
  }

  input MascotExerciseAvoidanceInput {
    exerciseId: ID!
    avoidanceType: String!
    reason: String
  }

  type MascotTimelineItem {
    event: MascotTimelineEvent!
    reaction: MascotReaction
  }

  type MascotTimelineEvent {
    id: ID!
    eventType: String!
    eventData: JSON
    importance: String!
    timestamp: DateTime!
  }

  type MascotReaction {
    id: ID!
    eventId: ID!
    reactionType: String!
    message: String!
    emote: String!
    animation: String!
    duration: Int!
    intensity: Float!
    soundEffect: String
    shown: Boolean!
    createdAt: DateTime!
  }

  type MascotWardrobe {
    inventory: [MascotOwnedCosmetic!]!
    presets: [MascotPreset!]!
    currentLoadout: MascotLoadout!
  }

  type MascotOwnedCosmetic {
    id: ID!
    cosmetic: MascotCosmetic!
    acquiredAt: DateTime!
    acquisitionMethod: String!
    creditsSpent: Int!
    giftedBy: String
    isFavorite: Boolean!
    isNew: Boolean!
  }

  type MascotPreset {
    id: ID!
    name: String!
    icon: String!
    loadout: JSON!
    createdAt: DateTime!
  }

  type MascotShopItem {
    slotNumber: Int!
    cosmetic: MascotCosmetic!
    discountPercent: Int!
    finalPrice: Int!
    isFeatured: Boolean!
    owned: Boolean!
  }

  type MascotPurchaseResult {
    success: Boolean!
    error: String
    cosmetic: MascotCosmetic
    creditsSpent: Int
    newBalance: Int
  }

  input MascotSettingsInput {
    isVisible: Boolean
    isMinimized: Boolean
    soundsEnabled: Boolean
    tipsEnabled: Boolean
  }

  # ============================================
  # JOURNEY HEALTH TYPES
  # ============================================
  type JourneyHealthScore {
    id: ID!
    userJourneyId: ID!
    userId: ID!
    healthScore: Int!
    engagementScore: Int!
    consistencyScore: Int!
    momentumScore: Int!
    progressRate: Float!
    expectedDailyProgress: Float!
    actualDailyProgress: Float!
    deviationPercentage: Float!
    riskLevel: JourneyRiskLevel!
    riskFactors: [JourneyRiskFactor!]!
    daysSinceLastProgress: Int!
    totalActiveDays: Int!
    streakCurrent: Int!
    streakLongest: Int!
    lastActivityAt: DateTime
    milestonesTotal: Int!
    milestonesCompleted: Int!
    milestonesOnTrack: Int!
    milestonesBehind: Int!
    expectedCheckins: Int!
    actualCheckins: Int!
    checkinConsistency: Float!
    scoreTrend: JourneyScoreTrend!
    score7dChange: Int!
    score30dChange: Int!
    calculatedAt: DateTime!
  }

  enum JourneyRiskLevel {
    healthy
    at_risk
    critical
    stalled
  }

  enum JourneyScoreTrend {
    improving
    stable
    declining
    critical_decline
  }

  type JourneyRiskFactor {
    factor: String!
    weight: Int!
    days: Int
    ratio: Float
    progressGap: Float
    completed: Int
    total: Int
  }

  type JourneyHealthAlert {
    id: ID!
    userJourneyId: ID!
    userId: ID!
    alertType: JourneyAlertType!
    severity: JourneyAlertSeverity!
    title: String!
    message: String!
    triggerData: JSON
    status: JourneyAlertStatus!
    acknowledgedAt: DateTime
    dismissedAt: DateTime
    resolvedAt: DateTime
    notificationSent: Boolean!
    expiresAt: DateTime
    createdAt: DateTime!
  }

  enum JourneyAlertType {
    stalled
    declining
    missed_milestone
    off_track
    no_activity
    consistency_drop
    risk_upgrade
    approaching_deadline
  }

  enum JourneyAlertSeverity {
    info
    warning
    critical
  }

  enum JourneyAlertStatus {
    active
    acknowledged
    dismissed
    resolved
  }

  type JourneyRecommendation {
    id: ID!
    userJourneyId: ID!
    userId: ID!
    recommendationType: JourneyRecommendationType!
    priority: Int!
    title: String!
    description: String!
    actionText: String
    actionUrl: String
    reasoning: JourneyRecommendationReasoning!
    status: JourneyRecommendationStatus!
    wasHelpful: Boolean
    feedbackText: String
    expiresAt: DateTime
    createdAt: DateTime!
  }

  enum JourneyRecommendationType {
    increase_frequency
    set_reminder
    adjust_goal
    take_break
    celebrate_progress
    connect_buddy
    join_challenge
    simplify_goal
    change_approach
    seek_support
    restart_journey
    archive_journey
  }

  enum JourneyRecommendationStatus {
    active
    viewed
    actioned
    dismissed
    expired
  }

  type JourneyRecommendationReasoning {
    factors: [String!]!
    confidence: Float!
  }

  type StalledJourney {
    userJourneyId: ID!
    journeyName: String!
    daysSinceActivity: Int!
    currentProgress: Float!
    riskLevel: JourneyRiskLevel!
    healthScore: Int!
  }

  type JourneyHealthHistoryEntry {
    date: String!
    healthScore: Int!
    engagementScore: Int!
    consistencyScore: Int!
    momentumScore: Int!
    riskLevel: JourneyRiskLevel!
  }

  type JourneyHealthRecalcResult {
    journeysProcessed: Int!
    alertsCreated: Int!
    durationMs: Int!
  }

  # ============================================
  # LONG-TERM ANALYTICS TYPES
  # ============================================
  type YearlyStats {
    userId: ID!
    year: Int!
    totalTu: Float!
    avgTuPerWorkout: Float!
    maxTuSingleWorkout: Float!
    tuTrendPercent: Float
    totalWorkouts: Int!
    totalExercises: Int!
    totalSets: Int!
    totalReps: Int!
    totalDurationMinutes: Int!
    totalVolumeLbs: Float!
    avgWorkoutDurationMinutes: Float!
    avgSetsPerWorkout: Float!
    avgRepsPerSet: Float!
    activeDays: Int!
    workoutDays: Int!
    longestStreak: Int!
    avgWorkoutsPerWeek: Float!
    consistencyScore: Int!
    strengthGained: Float!
    constitutionGained: Float!
    dexterityGained: Float!
    powerGained: Float!
    enduranceGained: Float!
    vitalityGained: Float!
    creditsEarned: Int!
    creditsSpent: Int!
    xpEarned: Int!
    levelsGained: Int!
    highFivesSent: Int!
    highFivesReceived: Int!
    competitionsEntered: Int!
    competitionsWon: Int!
    prsSet: Int!
    topExercises: [TopExercise!]!
    topMuscleGroups: [TopMuscleGroup!]!
    monthlyBreakdown: [MonthlyBreakdownEntry!]!
    achievementsUnlocked: Int!
    milestonesCompleted: Int!
    calculatedAt: DateTime!
    isComplete: Boolean!
  }

  type MonthlyStats {
    userId: ID!
    year: Int!
    month: Int!
    totalTu: Float!
    avgTuPerWorkout: Float!
    tuChangeFromPrevMonth: Float
    totalWorkouts: Int!
    totalExercises: Int!
    totalSets: Int!
    totalReps: Int!
    totalDurationMinutes: Int!
    totalVolumeLbs: Float!
    avgWorkoutDurationMinutes: Float!
    activeDays: Int!
    workoutDays: Int!
    currentStreak: Int!
    consistencyScore: Int!
    strengthDelta: Float!
    constitutionDelta: Float!
    dexterityDelta: Float!
    powerDelta: Float!
    enduranceDelta: Float!
    vitalityDelta: Float!
    creditsEarned: Int!
    creditsSpent: Int!
    xpEarned: Int!
    highFivesSent: Int!
    highFivesReceived: Int!
    prsSet: Int!
    topExercises: [TopExercise!]!
    weeklyBreakdown: [WeeklyBreakdownEntry!]!
    calculatedAt: DateTime!
    isComplete: Boolean!
  }

  type ProgressTrends {
    userId: ID!
    tuVelocity: Float!
    workoutVelocity: Float!
    volumeVelocity: Float!
    xpVelocity: Float!
    strengthVelocity: Float!
    tuAcceleration: Float!
    workoutAcceleration: Float!
    strengthAcceleration: Float!
    tuTrend: String!
    workoutTrend: String!
    overallTrend: String!
    projectedTuNextMonth: Float
    projectedTuNextQuarter: Float
    projectedTuNextYear: Float
    projectedWorkoutsNextMonth: Int
    projectedLevelUpDate: String
    tuVsPrevMonthPct: Float
    tuVsPrevQuarterPct: Float
    tuVsPrevYearPct: Float
    workoutsVsPrevMonthPct: Float
    bestMonth: BestPeriod
    bestQuarter: BestQuarter
    bestYear: BestYear
    projectionConfidence: Int!
    currentStreak: Int!
    longestStreak: Int!
    streakHealth: String!
    daysUntilStreakMilestone: Int
    dataPointsCount: Int!
    earliestDataDate: String
    latestDataDate: String
    calculatedAt: DateTime!
  }

  type YearInReview {
    year: Int!
    summary: YearSummary
    comparison: YearComparison
    monthlyBreakdown: [YearMonthBreakdown!]!
    topExercises: [TopExercise!]!
    topMuscleGroups: [TopMuscleGroup!]!
    highlights: YearHighlights!
    ranking: YearRanking!
  }

  type ProjectedMilestone {
    name: String!
    description: String!
    targetValue: Float!
    currentValue: Float!
    projectedDate: String
    daysRemaining: Int
    confidence: Int!
    category: String!
  }

  type AllTimeTuLeaderboardEntry {
    userId: ID!
    username: String!
    avatarUrl: String
    lifetimeTu: Float!
    lifetimeWorkouts: Int!
    lifetimeVolumeLbs: Float!
    lifetimePrs: Int!
    activeYears: Int!
    rank: Int!
  }

  type TopExercise {
    exerciseId: ID!
    name: String!
    count: Int!
  }

  type TopMuscleGroup {
    muscleGroup: String!
    volume: Float!
  }

  type MonthlyBreakdownEntry {
    month: Int!
    tu: Float!
    workouts: Int!
  }

  type WeeklyBreakdownEntry {
    week: Int!
    tu: Float!
    workouts: Int!
  }

  type BestPeriod {
    year: Int!
    month: Int!
    tu: Float!
  }

  type BestQuarter {
    year: Int!
    quarter: Int!
    tu: Float!
  }

  type BestYear {
    year: Int!
    tu: Float!
  }

  type YearSummary {
    totalTu: Float!
    totalWorkouts: Int!
    totalVolumeLbs: Float!
    activeDays: Int!
    longestStreak: Int!
    prsSet: Int!
    creditsEarned: Int!
    xpEarned: Int!
  }

  type YearComparison {
    tuChange: Float
    workoutsChange: Float
    volumeChange: Float
  }

  type YearMonthBreakdown {
    month: Int!
    tu: Float!
    workouts: Int!
    volume: Float!
  }

  type YearHighlights {
    bestMonth: BestMonthHighlight
    biggestPr: BiggestPrHighlight
    totalHighFives: Int!
    achievementsUnlocked: Int!
  }

  type BestMonthHighlight {
    month: Int!
    tu: Float!
  }

  type BiggestPrHighlight {
    exerciseId: ID!
    name: String!
    weight: Float!
  }

  type YearRanking {
    tuRank: Int
    percentile: Int
    totalUsers: Int!
  }
`;
