/**
 * Bug Hunter Types
 * Core type definitions for the autonomous bug hunting and auto-fixing system
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type BugCategory = 'crash' | 'error' | 'ui' | 'network' | 'performance' | 'accessibility' | 'security';
export type RootCauseType = 'frontend' | 'backend' | 'database' | 'integration' | 'configuration';
export type FixStatus = 'pending' | 'in_progress' | 'fixed' | 'failed' | 'rolled_back' | 'skipped';
export type AutomationLevel =
  | 'discover'           // Level 1: Find bugs, generate reports only
  | 'diagnose'           // Level 2: Find and diagnose bugs
  | 'suggest'            // Level 3: Find, diagnose, and suggest fixes
  | 'auto-fix-simple'    // Level 4: Auto-fix simple bugs (high confidence)
  | 'auto-fix-all'       // Level 5: Auto-fix all bugs (spawn Claude for complex)
  | 'autonomous'         // Level 6: Full autonomous loop with deployment
  | 'aggressive';        // Level 7: Faster cycles, parallel fixes

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface CapturedError {
  id: string;
  timestamp: string;
  url: string;
  type: 'console' | 'network' | 'react' | 'graphql' | 'timeout' | 'blank_page' | 'missing_element';
  message: string;
  stack?: string;
  severity: Severity;

  // Context
  consoleErrors: ConsoleError[];
  networkErrors: NetworkError[];
  screenshot?: string;
  htmlSnapshot?: string;

  // Browser state
  userAgent: string;
  viewport: { width: number; height: number };
  localStorage?: Record<string, string>;
  sessionStorage?: Record<string, string>;
  cookies?: string[];
}

export interface ConsoleError {
  level: 'error' | 'warn' | 'info';
  message: string;
  source?: string;
  line?: number;
  column?: number;
  stack?: string;
  timestamp: string;
}

export interface NetworkError {
  url: string;
  method: string;
  status: number;
  statusText: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  duration: number;
  timestamp: string;
}

// ============================================================================
// BUG REPORT TYPES
// ============================================================================

export interface BugReport {
  id: string;
  severity: Severity;
  category: BugCategory;
  title: string;
  description: string;
  stepsToReproduce: string[];
  expectedBehavior: string;
  actualBehavior: string;

  // Evidence
  screenshot?: string;
  consoleErrors: string[];
  networkErrors: string[];

  // Context
  url: string;
  timestamp: string;
  userAgent: string;

  // Metadata
  hash: string;  // For deduplication
  occurrences: number;
  firstSeen: string;
  lastSeen: string;

  // Fix tracking
  fixStatus: FixStatus;
  fixAttempts: number;
  fixedBy?: string;
  fixedAt?: string;
  githubIssue?: string;
}

// ============================================================================
// DIAGNOSIS TYPES
// ============================================================================

export interface DiagnosedBug extends BugReport {
  rootCause: RootCause;
  suggestedFix: SuggestedFix;
  relatedBugs: string[];  // IDs of related bugs
  affectedFiles: string[];
  affectedEndpoints: string[];
}

export interface RootCause {
  type: RootCauseType;
  file: string;
  line?: number;
  column?: number;
  hypothesis: string;
  confidence: number;  // 0-1
  evidence: string[];
  codeContext?: string;  // Surrounding code snippet
}

export interface SuggestedFix {
  description: string;
  codeChanges: CodeChange[];
  testCase: TestCase;
  estimatedEffort: 'trivial' | 'simple' | 'moderate' | 'complex';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CodeChange {
  file: string;
  oldCode: string;
  newCode: string;
  startLine?: number;
  endLine?: number;
  description: string;
}

export interface TestCase {
  name: string;
  description: string;
  steps: TestStep[];
  assertions: TestAssertion[];
}

export interface TestStep {
  action: 'navigate' | 'click' | 'type' | 'wait' | 'assert' | 'api_call';
  target?: string;
  value?: string;
  timeout?: number;
}

export interface TestAssertion {
  type: 'visible' | 'hidden' | 'text' | 'value' | 'url' | 'status' | 'console_clean';
  target?: string;
  expected?: string | number | boolean;
}

// ============================================================================
// FIX RESULT TYPES
// ============================================================================

export interface FixResult {
  bugId: string;
  success: boolean;
  status: FixStatus;

  // Execution details
  branch: string;
  commit?: string;
  deployedAt?: string;

  // Changes made
  filesChanged: string[];
  linesAdded: number;
  linesRemoved: number;

  // Verification
  typecheckPassed: boolean;
  testsPassed: boolean;
  buildPassed: boolean;
  productionVerified: boolean;

  // Errors
  errors: string[];
  rollbackReason?: string;

  // Timing
  startedAt: string;
  completedAt: string;
  duration: number;
}

// ============================================================================
// COVERAGE TYPES
// ============================================================================

export interface CoverageMap {
  routes: RouteDefinition[];
  interactions: InteractionDefinition[];
  forms: FormDefinition[];
  apiEndpoints: ApiEndpoint[];
  graphqlOperations: GraphQLOperation[];
  edgeCases: EdgeCase[];
}

export interface RouteDefinition {
  path: string;
  name: string;
  requiresAuth: boolean;
  requiresAdmin: boolean;
  params?: string[];
  category: string;
}

export interface InteractionDefinition {
  selector: string;
  type: 'click' | 'hover' | 'focus' | 'scroll';
  description: string;
}

export interface FormDefinition {
  path: string;
  selector: string;
  fields: FormField[];
  submitButton: string;
}

export interface FormField {
  name: string;
  selector: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'checkbox' | 'radio' | 'textarea';
  required: boolean;
  validValues: string[];
  invalidValues: string[];
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  requiresAuth: boolean;
  requiresAdmin: boolean;
  requestBody?: Record<string, unknown>;
  expectedStatus: number[];
}

export interface GraphQLOperation {
  name: string;
  type: 'query' | 'mutation' | 'subscription';
  variables?: Record<string, unknown>;
  requiresAuth: boolean;
}

export interface EdgeCase {
  name: string;
  description: string;
  action: () => Promise<void>;
  category: 'empty_state' | 'max_data' | 'rapid_action' | 'navigation' | 'network' | 'auth' | 'concurrent';
}

// ============================================================================
// LEARNING TYPES
// ============================================================================

export interface FixPattern {
  id: string;
  errorPattern: string;  // Regex pattern
  errorType: CapturedError['type'];
  fixTemplate: FixTemplate;
  successRate: number;
  timesUsed: number;
  lastUsed: string;
  createdAt: string;
}

export interface FixTemplate {
  description: string;
  filePatterns: string[];  // Glob patterns for affected files
  codeTransform: CodeTransform;
}

export interface CodeTransform {
  type: 'replace' | 'insert_before' | 'insert_after' | 'wrap' | 'delete';
  searchPattern: string;
  replacement: string;
  flags?: string;
}

// ============================================================================
// METRICS TYPES
// ============================================================================

export interface BugHunterMetrics {
  totalBugsFound: number;
  totalBugsFixed: number;
  totalRollbacks: number;
  autoFixSuccessRate: number;
  meanTimeToDetection: number;  // ms
  meanTimeToFix: number;  // ms
  humanInterventions: number;
  cyclesCompleted: number;
  lastCycleAt: string;

  // By category
  bugsByCategory: Record<BugCategory, number>;
  bugsBySeverity: Record<Severity, number>;

  // Historical
  dailyStats: DailyStats[];
}

export interface DailyStats {
  date: string;
  bugsFound: number;
  bugsFixed: number;
  rollbacks: number;
  cyclesRun: number;
  humanInterventions: number;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface BugHunterConfig {
  automationLevel: AutomationLevel;
  baseUrl: string;
  productionUrl: string;

  // Timing
  cycleDuration: number;  // ms
  cooldownPeriod: number;  // ms
  maxFixAttempts: number;
  deploymentMonitorDuration: number;  // ms

  // Thresholds
  confidenceThreshold: number;  // 0-1, minimum confidence to auto-fix
  errorRateThreshold: number;  // Max error rate increase before rollback

  // Safety
  skipCategories: BugCategory[];
  skipPatterns: string[];  // Regex patterns for bugs to skip
  dryRun: boolean;

  // Output
  screenshotDir: string;
  reportDir: string;
  dataDir: string;

  // Claude integration
  claudeEnabled: boolean;
  claudeModel: string;
  fixQueueDir: string;
}

// ============================================================================
// DAEMON TYPES
// ============================================================================

export interface DaemonState {
  running: boolean;
  currentCycle: number;
  currentPhase: 'discovery' | 'diagnosis' | 'fixing' | 'verification' | 'reporting' | 'cooldown';
  lastCycleStart: string;
  lastCycleEnd: string;
  bugsInQueue: number;
  fixesInProgress: number;
  errors: string[];
}

export interface CycleResult {
  cycleNumber: number;
  startedAt: string;
  completedAt: string;
  duration: number;

  // Discovery
  routesTested: number;
  interactionsTested: number;
  bugsFound: DiagnosedBug[];

  // Fixing
  bugsAttempted: number;
  bugsFixed: number;
  bugsFailed: number;
  bugsSkipped: number;
  rollbacks: number;

  // Health
  productionHealthy: boolean;
  humanInterventionsRequired: number;
}
