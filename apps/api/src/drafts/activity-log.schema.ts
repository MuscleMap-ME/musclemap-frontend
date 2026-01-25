/**
 * Activity Log GraphQL Schema Extensions
 *
 * Adds types, queries, and mutations for the Activity Log panel -
 * a multi-input workout logging system supporting voice, screenshot,
 * clipboard, CSV import, and health platform sync.
 */

export const activityLogTypeDefs = `#graphql
  # ============================================
  # ACTIVITY LOG ENUMS
  # ============================================

  """Source of activity data entry"""
  enum ActivitySource {
    MANUAL
    VOICE
    SCREENSHOT
    CLIPBOARD
    CSV_IMPORT
    JSON_IMPORT
    APPLE_HEALTH
    GOOGLE_FIT
    FITBIT
    GARMIN
    STRAVA
    WHOOP
    OURA
    TEMPLATE
    CLONE
  }

  """Type of activity being logged"""
  enum ActivityType {
    STRENGTH
    CARDIO
    HIIT
    FLEXIBILITY
    SPORTS
    MARTIAL_ARTS
    SWIMMING
    CYCLING
    RUNNING
    WALKING
    YOGA
    OTHER
  }

  """Import file format"""
  enum ImportFormat {
    STRONG_CSV
    HEVY_CSV
    JEFIT_CSV
    FITBOD_CSV
    FITNOTES_CSV
    GYMBOOK_CSV
    GRAVITUS_CSV
    REPCOUNT_JSON
    MUSCLEMAP_JSON
    GENERIC_CSV
    APPLE_HEALTH_XML
    GOOGLE_FIT_JSON
  }

  """Export file format"""
  enum ExportFormat {
    MUSCLEMAP_JSON
    STRONG_CSV
    GENERIC_CSV
    APPLE_HEALTH_XML
  }

  """Date range for imports/exports"""
  enum DateRange {
    DAYS_30
    DAYS_90
    MONTHS_6
    YEAR_1
    ALL_TIME
  }

  """Import/Export job status"""
  enum JobStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
    CANCELLED
  }

  # ============================================
  # VOICE INPUT TYPES
  # ============================================

  """Voice command input"""
  input VoiceLogInput {
    rawText: String!
    audioUrl: String
  }

  """Result of parsing a voice command"""
  type VoiceParseResult {
    success: Boolean!
    parsedExercise: String
    matchedExerciseId: ID
    parsedWeight: Float
    parsedReps: Int
    parsedSets: Int
    parsedRPE: Float
    confidence: Float!
    needsConfirmation: Boolean!
    alternatives: [VoiceParseAlternative!]
    rawText: String!
  }

  """Alternative interpretations of voice input"""
  type VoiceParseAlternative {
    exercise: String
    exerciseId: ID
    weight: Float
    reps: Int
    confidence: Float!
  }

  """Voice command history entry"""
  type VoiceCommand {
    id: ID!
    rawText: String!
    parsedIntent: JSON
    wasCorrected: Boolean!
    correctedData: JSON
    confidence: Float!
    provider: String!
    createdAt: DateTime!
  }

  # ============================================
  # SCREENSHOT IMPORT TYPES
  # ============================================

  """Screenshot import input"""
  input ScreenshotImportInput {
    imageUrl: String
    imageBase64: String
  }

  """Result of parsing a screenshot"""
  type ScreenshotParseResult {
    success: Boolean!
    exercises: [ParsedExercise!]!
    overallConfidence: Float!
    rawOcrText: String
    errors: [String!]
  }

  """Exercise parsed from screenshot or text"""
  type ParsedExercise {
    name: String!
    matchedExerciseId: ID
    matchedExerciseName: String
    sets: Int
    reps: Int
    weight: Float
    rpe: Float
    notes: String
    confidence: Float!
    lineNumber: Int
  }

  """Screenshot import record"""
  type ScreenshotImport {
    id: ID!
    imageUrl: String
    rawOcrText: String
    parsedExercises: [ParsedExercise!]!
    overallConfidence: Float!
    ocrProvider: String!
    status: JobStatus!
    workoutId: ID
    createdAt: DateTime!
  }

  # ============================================
  # TEXT/CLIPBOARD IMPORT TYPES
  # ============================================

  """Text import input (clipboard paste)"""
  input TextImportInput {
    text: String!
  }

  """Result of parsing pasted text"""
  type TextParseResult {
    success: Boolean!
    exercises: [ParsedExercise!]!
    detectedFormat: String
    confidence: Float!
    errors: [String!]
  }

  # ============================================
  # FILE IMPORT TYPES
  # ============================================

  """File import input"""
  input FileImportInput {
    fileUrl: String!
    fileName: String!
    format: ImportFormat
    dateRange: DateRange!
    fieldMapping: JSON
  }

  """Import job status"""
  type ImportJob {
    id: ID!
    source: String!
    fileName: String
    fileSize: Int
    status: JobStatus!
    totalRecords: Int
    importedCount: Int!
    skippedCount: Int!
    errorCount: Int!
    errors: [ImportError!]
    fieldMapping: JSON
    dateRange: String
    startedAt: DateTime
    completedAt: DateTime
    createdAt: DateTime!
  }

  """Import error detail"""
  type ImportError {
    row: Int
    field: String
    value: String
    message: String!
  }

  """Import preview before committing"""
  type ImportPreview {
    totalRecords: Int!
    sampleRecords: [ImportPreviewRecord!]!
    detectedFormat: ImportFormat
    fieldMapping: JSON
    dateRange: DateRangeInfo!
    duplicateCount: Int!
    warnings: [String!]
  }

  """Single record in import preview"""
  type ImportPreviewRecord {
    date: DateTime
    exerciseName: String
    sets: Int
    reps: Int
    weight: Float
    notes: String
    isDuplicate: Boolean!
  }

  """Date range info for imports"""
  type DateRangeInfo {
    earliest: DateTime
    latest: DateTime
    totalDays: Int!
    recordsInRange: Int!
  }

  # ============================================
  # EXPORT TYPES
  # ============================================

  """Export job input"""
  input ExportInput {
    format: ExportFormat!
    dateRange: DateRange!
  }

  """Export job status"""
  type ExportJob {
    id: ID!
    format: ExportFormat!
    dateRange: String
    status: JobStatus!
    totalWorkouts: Int
    exportedCount: Int!
    fileUrl: String
    fileSize: Int
    expiresAt: DateTime
    startedAt: DateTime
    completedAt: DateTime
    createdAt: DateTime!
  }

  # ============================================
  # QUICK PICK / PATTERNS TYPES
  # ============================================

  """Workout pattern for quick pick suggestions"""
  type WorkoutPattern {
    id: ID!
    dayOfWeek: Int!
    hourOfDay: Int
    workoutType: String
    workoutName: String
    typicalExercises: [String!]!
    occurrenceCount: Int!
    lastOccurred: DateTime!
  }

  """Suggested workout for quick pick"""
  type SuggestedWorkout {
    type: String!
    name: String!
    reason: String!
    confidence: Float!
    sourceWorkoutId: ID
    sourceDate: DateTime
    exercises: [SuggestedExercise!]!
  }

  """Exercise suggestion in a workout"""
  type SuggestedExercise {
    exerciseId: ID!
    name: String!
    suggestedSets: Int
    suggestedReps: Int
    suggestedWeight: Float
    lastWeight: Float
    lastReps: Int
  }

  # ============================================
  # QUICK LOG INPUT TYPES
  # ============================================

  """Quick log a single set"""
  input QuickLogSetInput {
    exerciseId: ID!
    weight: Float
    reps: Int!
    rpe: Float
    rir: Int
    notes: String
    tag: String
    source: ActivitySource
  }

  """Quick log multiple sets for one exercise"""
  input QuickLogExerciseInput {
    exerciseId: ID!
    sets: [QuickLogSetDataInput!]!
    source: ActivitySource
  }

  """Set data within quick log exercise"""
  input QuickLogSetDataInput {
    weight: Float
    reps: Int!
    rpe: Float
    rir: Int
    notes: String
    tag: String
  }

  """Quick log a complete workout"""
  input QuickLogWorkoutInput {
    name: String
    source: ActivitySource!
    activityType: ActivityType
    startedAt: DateTime
    endedAt: DateTime
    exercises: [QuickLogExerciseInput!]!
    notes: String
  }

  """Clone a workout to a new date"""
  input CloneWorkoutInput {
    workoutId: ID!
    date: DateTime!
    adjustWeights: Boolean
    weightAdjustPercent: Float
  }

  # ============================================
  # ACTIVITY LOG RESULT TYPES
  # ============================================

  """Result of quick logging a set"""
  type QuickLogSetResult {
    success: Boolean!
    set: LoggedSet
    session: WorkoutSession
    error: String
  }

  """Result of quick logging a workout"""
  type QuickLogWorkoutResult {
    success: Boolean!
    workout: Workout
    session: WorkoutSession
    tuEarned: Int
    xpEarned: Int
    creditsAwarded: Int
    prsAchieved: [PersonalRecord!]
    error: String
  }

  """Result of cloning a workout"""
  type CloneWorkoutResult {
    success: Boolean!
    workout: Workout
    error: String
  }

  # ============================================
  # HEALTH SYNC TYPES
  # ============================================

  """Health platform connection status"""
  type HealthPlatformStatus {
    platform: ActivitySource!
    connected: Boolean!
    lastSyncAt: DateTime
    syncEnabled: Boolean!
    autoSyncEnabled: Boolean!
    syncDirection: String
    recordCount: Int
  }

  """Health platform sync result"""
  type HealthSyncResult {
    success: Boolean!
    platform: ActivitySource!
    importedCount: Int!
    skippedCount: Int!
    errors: [String!]
    lastSyncAt: DateTime
  }

  """Health platform sync settings"""
  input HealthSyncSettingsInput {
    platform: ActivitySource!
    syncEnabled: Boolean!
    autoSyncEnabled: Boolean!
    syncDirection: String
    dateRange: DateRange
  }

  # ============================================
  # RECENT EXERCISES TYPE
  # ============================================

  """Recent exercise with last used stats"""
  type RecentExercise {
    exercise: Exercise!
    lastUsedAt: DateTime!
    lastWeight: Float
    lastReps: Int
    lastSets: Int
    useCount: Int!
  }

  # ============================================
  # ACTIVITY LOG QUERIES
  # ============================================

  extend type Query {
    # Quick pick suggestions
    suggestedWorkouts(limit: Int): [SuggestedWorkout!]!
    workoutPatterns: [WorkoutPattern!]!
    recentExercises(limit: Int): [RecentExercise!]!

    # Import jobs
    importJob(id: ID!): ImportJob
    importJobs(limit: Int, status: JobStatus): [ImportJob!]!
    importPreview(fileUrl: String!, format: ImportFormat): ImportPreview!

    # Export jobs
    exportJob(id: ID!): ExportJob
    exportJobs(limit: Int): [ExportJob!]!

    # Health platforms
    healthPlatformStatus: [HealthPlatformStatus!]!
    healthPlatformConnections: [HealthPlatformStatus!]!

    # Voice command history
    voiceCommandHistory(limit: Int): [VoiceCommand!]!

    # Screenshot imports
    screenshotImports(limit: Int): [ScreenshotImport!]!
  }

  # ============================================
  # ACTIVITY LOG MUTATIONS
  # ============================================

  extend type Mutation {
    # Quick logging
    quickLogSet(input: QuickLogSetInput!): QuickLogSetResult!
    quickLogExercise(input: QuickLogExerciseInput!): QuickLogSetResult!
    quickLogWorkout(input: QuickLogWorkoutInput!): QuickLogWorkoutResult!
    cloneWorkout(input: CloneWorkoutInput!): CloneWorkoutResult!

    # Voice input
    parseVoiceCommand(input: VoiceLogInput!): VoiceParseResult!
    confirmVoiceLog(exerciseId: ID!, weight: Float, reps: Int!, rpe: Float, rir: Int, notes: String): QuickLogSetResult!

    # Screenshot import
    parseScreenshot(input: ScreenshotImportInput!): ScreenshotParseResult!
    confirmScreenshotImport(screenshotId: ID!, exercises: [QuickLogExerciseInput!]!): QuickLogWorkoutResult!

    # Text/clipboard import
    parseText(input: TextImportInput!): TextParseResult!
    confirmTextImport(exercises: [QuickLogExerciseInput!]!): QuickLogWorkoutResult!

    # File import
    startFileImport(input: FileImportInput!): ImportJob!
    cancelImport(jobId: ID!): Boolean!
    retryImport(jobId: ID!): ImportJob!

    # Export
    startExport(input: ExportInput!): ExportJob!
    cancelExport(jobId: ID!): Boolean!

    # Health platform sync
    connectHealthPlatform(platform: ActivitySource!, authCode: String): HealthPlatformStatus!
    disconnectHealthPlatform(platform: ActivitySource!): Boolean!
    syncHealthPlatform(platform: ActivitySource!, dateRange: DateRange): HealthSyncResult!
    updateHealthSyncSettings(input: HealthSyncSettingsInput!): HealthPlatformStatus!

    # Pattern management
    deleteWorkoutPattern(patternId: ID!): Boolean!
  }
`;
