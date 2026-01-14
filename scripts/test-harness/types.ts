/**
 * Test Harness Types
 * TypeScript interfaces for the MuscleMap test harness infrastructure
 */

// ============================================================================
// Core Test Types
// ============================================================================

export type TestStatus = 'passed' | 'failed' | 'skipped' | 'error';

export interface TestStep {
  name: string;
  action: string;
  params?: Record<string, unknown>;
  assertions?: Assertion[];
  timeout?: number;
  retries?: number;
  skip?: boolean | ((ctx: TestContext) => boolean);
  setup?: (ctx: TestContext) => Promise<void>;
  teardown?: (ctx: TestContext) => Promise<void>;
}

export interface TestResult {
  stepName: string;
  status: TestStatus;
  duration: number;
  error?: Error | string;
  assertions?: AssertionResult[];
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface SuiteResult {
  suiteName: string;
  category: TestCategory;
  persona: string;
  status: TestStatus;
  results: TestResult[];
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
  startTime: Date;
  endTime: Date;
}

export interface Scorecard {
  runId: string;
  timestamp: Date;
  environment: Environment;
  persona: string;
  duration: number;
  summary: ScoreSummary;
  categories: CategoryScore[];
  recommendations: Recommendation[];
  grade: Grade;
}

// ============================================================================
// Test Categories
// ============================================================================

export type TestCategory =
  | 'core'
  | 'auth'
  | 'profile'
  | 'workouts'
  | 'exercises'
  | 'social'
  | 'economy'
  | 'achievements'
  | 'competitions'
  | 'settings'
  | 'graphql'
  | 'stress'
  | 'security'
  | 'edge-cases';

// ============================================================================
// Assertion Types
// ============================================================================

export type AssertionType =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'matches'
  | 'greaterThan'
  | 'lessThan'
  | 'truthy'
  | 'falsy'
  | 'exists'
  | 'notExists'
  | 'hasProperty'
  | 'hasLength'
  | 'isArray'
  | 'isObject'
  | 'isNumber'
  | 'isString'
  | 'isBoolean'
  | 'statusCode'
  | 'schema'
  | 'custom';

export interface Assertion {
  type: AssertionType;
  path?: string;
  expected?: unknown;
  message?: string;
  validator?: (value: unknown, ctx: TestContext) => boolean | Promise<boolean>;
}

export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  actual?: unknown;
  expected?: unknown;
  message?: string;
}

// ============================================================================
// Persona Types
// ============================================================================

export type PersonaType =
  | 'nova_fresh'
  | 'rookie_trainee'
  | 'active_andy'
  | 'elite_eve'
  | 'legend_leo'
  | 'diamond_dan'
  | 'ghost_private'
  | 'recover_ray'
  | 'silver_sally'
  | 'wheel_walter'
  | 'ninja_nat'
  | 'sleepy_sam'
  | 'banned_bob'
  | 'coach_carol'
  | 'student_steve';

export interface PersonaConfig {
  id: PersonaType;
  name: string;
  description: string;
  traits: PersonaTraits;
  credentials?: PersonaCredentials;
  state: PersonaState;
  permissions: PersonaPermissions;
}

export interface PersonaTraits {
  level: number;
  experience: number;
  credits: number;
  isPremium: boolean;
  isBanned: boolean;
  isPrivate: boolean;
  isCoach: boolean;
  isStudent: boolean;
  workoutCount: number;
  achievementCount: number;
  archetype?: string;
  rank?: string;
  streakDays: number;
}

export interface PersonaCredentials {
  email: string;
  password: string;
  token?: string;
  refreshToken?: string;
}

export interface PersonaState {
  isLoggedIn: boolean;
  hasActiveWorkout: boolean;
  hasActiveGoal: boolean;
  lastLogin?: Date;
  currentStreak?: number;
}

export interface PersonaPermissions {
  canCreateWorkout: boolean;
  canJoinCompetition: boolean;
  canSendMessage: boolean;
  canViewPrivateProfiles: boolean;
  canAccessPremiumFeatures: boolean;
  canModerate: boolean;
}

// ============================================================================
// Test Script Types
// ============================================================================

export interface TestScript {
  name: string;
  description: string;
  category: TestCategory;
  personas: PersonaType[];
  setup?: (ctx: TestContext) => Promise<void>;
  teardown?: (ctx: TestContext) => Promise<void>;
  steps: TestStep[];
  timeout?: number;
  retries?: number;
  parallel?: boolean;
}

export interface TestSuite {
  name: string;
  category: TestCategory;
  scripts: TestScript[];
}

// ============================================================================
// Execution Types
// ============================================================================

export interface TestContext {
  runId: string;
  environment: Environment;
  baseUrl: string;
  persona: PersonaConfig;
  variables: Map<string, unknown>;
  results: TestResult[];
  currentStep?: TestStep;
  verbose: boolean;
  token?: string;
  userId?: string;
  startTime: Date;
}

export interface ExecutionOptions {
  category?: TestCategory;
  suite?: string;
  persona?: PersonaType;
  environment: Environment;
  verbose: boolean;
  parallel: boolean;
  retries: number;
  timeout: number;
  failFast: boolean;
  dryRun: boolean;
}

export type Environment = 'local' | 'staging' | 'production';

// ============================================================================
// Action Types
// ============================================================================

export type ActionType =
  | 'http_request'
  | 'graphql_query'
  | 'graphql_mutation'
  | 'wait'
  | 'set_variable'
  | 'assert'
  | 'log'
  | 'conditional'
  | 'loop'
  | 'parallel';

export interface Action {
  type: ActionType;
  name: string;
  params: ActionParams;
}

export interface ActionParams {
  // HTTP Request params
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  expectedStatus?: number | number[];

  // GraphQL params
  query?: string;
  mutation?: string;
  variables?: Record<string, unknown>;

  // Control flow params
  condition?: (ctx: TestContext) => boolean | Promise<boolean>;
  iterations?: number;
  actions?: Action[];
  delay?: number;

  // Variable params
  variable?: string;
  value?: unknown | ((ctx: TestContext) => unknown | Promise<unknown>);

  // Logging params
  message?: string;
  level?: 'debug' | 'info' | 'warn' | 'error';
}

export interface ActionResult {
  action: Action;
  success: boolean;
  data?: unknown;
  error?: Error | string;
  duration: number;
  statusCode?: number;
  headers?: Record<string, string>;
}

// ============================================================================
// Scorecard Types
// ============================================================================

export interface ScoreSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  avgDuration: number;
}

export interface CategoryScore {
  category: TestCategory;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  grade: Grade;
}

export type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface Recommendation {
  category: TestCategory;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  suggestion: string;
  affectedTests?: string[];
}

// ============================================================================
// Reporter Types
// ============================================================================

export type ReporterFormat = 'console' | 'json' | 'html' | 'junit';

export interface ReporterOptions {
  format: ReporterFormat;
  outputPath?: string;
  verbose: boolean;
  includeMetadata: boolean;
}

// ============================================================================
// Hook Types
// ============================================================================

export type HookType = 'beforeAll' | 'afterAll' | 'beforeEach' | 'afterEach';

export interface Hook {
  type: HookType;
  fn: (ctx: TestContext) => Promise<void>;
}

// ============================================================================
// CLI Types
// ============================================================================

export interface CLIArgs {
  category?: TestCategory;
  suite?: string;
  persona?: PersonaType;
  env: Environment;
  verbose: boolean;
  parallel: boolean;
  retries: number;
  timeout: number;
  failFast: boolean;
  dryRun: boolean;
  output?: string;
  format: ReporterFormat;
  help: boolean;
}
