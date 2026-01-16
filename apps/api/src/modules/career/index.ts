/**
 * Career Readiness Module
 *
 * Provides career physical standards tracking, readiness scoring,
 * and team readiness dashboards for first responders, military, and law enforcement.
 */

import { queryOne, queryAll, query } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

// =============================================
// TYPES
// =============================================

export interface CareerGoal {
  id: string;
  userId: string;
  ptTestId: string;
  targetDate: string | null;
  priority: 'primary' | 'secondary';
  status: 'active' | 'achieved' | 'abandoned';
  agencyName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  achievedAt: string | null;
}

export interface CareerGoalWithTest extends CareerGoal {
  testName: string;
  testDescription: string | null;
  institution: string | null;
  category: string | null;
  icon: string | null;
}

export interface ReadinessScore {
  goalId: string;
  readinessScore: number | null;
  status: 'ready' | 'at_risk' | 'not_ready' | 'no_data';
  eventsPassed: number;
  eventsTotal: number;
  weakEvents: string[];
  lastAssessmentAt: string | null;
}

export interface PTTestWithCareer {
  id: string;
  name: string;
  description: string | null;
  institution: string | null;
  category: string | null;
  components: unknown[];
  scoringMethod: string;
  maxScore: number | null;
  passingScore: number | null;
  recertificationMonths: number | null;
  exerciseMappings: Record<string, string[]>;
  tips: Array<{ event: string; tip: string }>;
  icon: string | null;
  active: boolean;
}

export interface TeamReadinessConfig {
  id: string;
  hangoutId: string;
  enabled: boolean;
  ptTestId: string | null;
  requireOptIn: boolean;
  visibleTo: string[];
  showIndividualScores: boolean;
  showAggregateOnly: boolean;
}

export interface TeamMemberReadiness {
  userId: string;
  username: string;
  displayName: string | null;
  readinessScore: number | null;
  status: 'ready' | 'at_risk' | 'not_ready' | 'no_data';
  lastAssessmentAt: string | null;
  weakEvents: string[];
}

export interface TeamReadinessSummary {
  hangoutId: string;
  ptTestId: string | null;
  membersTotal: number;
  membersOptedIn: number;
  membersReady: number;
  membersAtRisk: number;
  membersNotReady: number;
  averageReadiness: number | null;
  members: TeamMemberReadiness[];
  weakAreas: Array<{ eventId: string; membersFailing: number }>;
}

export interface RecertificationSchedule {
  id: string;
  userId: string;
  goalId: string;
  lastCertifiedAt: string | null;
  nextDueAt: string;
  reminderDays: number[];
  status: 'active' | 'completed' | 'overdue';
}

// =============================================
// PT TESTS (CAREER STANDARDS)
// =============================================

/**
 * Get all PT tests with career-specific fields
 */
export async function getCareerStandards(options?: {
  category?: string;
  activeOnly?: boolean;
}): Promise<PTTestWithCareer[]> {
  const { category, activeOnly = true } = options || {};

  let whereClause = activeOnly ? 'WHERE (active = true OR active IS NULL)' : 'WHERE 1=1';
  const params: unknown[] = [];

  if (category) {
    params.push(category);
    whereClause += ` AND category = $${params.length}`;
  }

  const tests = await queryAll<{
    id: string;
    name: string;
    description: string | null;
    institution: string | null;
    category: string | null;
    components: unknown[];
    scoring_method: string;
    max_score: number | null;
    passing_score: number | null;
    recertification_months: number | null;
    exercise_mappings: Record<string, string[]> | null;
    tips: Array<{ event: string; tip: string }> | null;
    icon: string | null;
    active: boolean | null;
  }>(
    `SELECT id, name, description, institution, category, components,
            scoring_method, max_score, passing_score, recertification_months,
            exercise_mappings, tips, icon, active
     FROM pt_tests
     ${whereClause}
     ORDER BY category, name`,
    params
  );

  return tests.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    institution: t.institution,
    category: t.category,
    components: t.components || [],
    scoringMethod: t.scoring_method,
    maxScore: t.max_score,
    passingScore: t.passing_score,
    recertificationMonths: t.recertification_months,
    exerciseMappings: t.exercise_mappings || {},
    tips: t.tips || [],
    icon: t.icon,
    active: t.active ?? true,
  }));
}

/**
 * Get a single PT test by ID
 */
export async function getCareerStandard(testId: string): Promise<PTTestWithCareer | null> {
  const test = await queryOne<{
    id: string;
    name: string;
    description: string | null;
    institution: string | null;
    category: string | null;
    components: unknown[];
    scoring_method: string;
    max_score: number | null;
    passing_score: number | null;
    recertification_months: number | null;
    exercise_mappings: Record<string, string[]> | null;
    tips: Array<{ event: string; tip: string }> | null;
    icon: string | null;
    active: boolean | null;
  }>(
    `SELECT id, name, description, institution, category, components,
            scoring_method, max_score, passing_score, recertification_months,
            exercise_mappings, tips, icon, active
     FROM pt_tests WHERE id = $1`,
    [testId]
  );

  if (!test) return null;

  return {
    id: test.id,
    name: test.name,
    description: test.description,
    institution: test.institution,
    category: test.category,
    components: test.components || [],
    scoringMethod: test.scoring_method,
    maxScore: test.max_score,
    passingScore: test.passing_score,
    recertificationMonths: test.recertification_months,
    exerciseMappings: test.exercise_mappings || {},
    tips: test.tips || [],
    icon: test.icon,
    active: test.active ?? true,
  };
}

/**
 * Get categories with test counts
 */
export async function getCareerCategories(): Promise<Array<{ category: string; count: number; icon: string }>> {
  const categories = await queryAll<{ category: string; count: string }>(
    `SELECT category, COUNT(*) as count
     FROM pt_tests
     WHERE active = true OR active IS NULL
     GROUP BY category
     ORDER BY category`
  );

  const icons: Record<string, string> = {
    military: 'shield',
    firefighter: 'fire',
    law_enforcement: 'badge',
    special_operations: 'target',
    civil_service: 'building',
    general: 'dumbbell',
  };

  return categories.map(c => ({
    category: c.category,
    count: parseInt(c.count, 10),
    icon: icons[c.category] || 'dumbbell',
  }));
}

// =============================================
// USER CAREER GOALS
// =============================================

/**
 * Get user's career goals
 */
export async function getUserCareerGoals(userId: string): Promise<CareerGoalWithTest[]> {
  const goals = await queryAll<{
    id: string;
    user_id: string;
    pt_test_id: string;
    target_date: string | null;
    priority: string;
    status: string;
    agency_name: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    achieved_at: string | null;
    test_name: string;
    test_description: string | null;
    institution: string | null;
    category: string | null;
    icon: string | null;
  }>(
    `SELECT g.*, t.name as test_name, t.description as test_description,
            t.institution, t.category, t.icon
     FROM user_career_goals g
     JOIN pt_tests t ON g.pt_test_id = t.id
     WHERE g.user_id = $1
     ORDER BY g.priority, g.created_at`,
    [userId]
  );

  return goals.map(g => ({
    id: g.id,
    userId: g.user_id,
    ptTestId: g.pt_test_id,
    targetDate: g.target_date,
    priority: g.priority as 'primary' | 'secondary',
    status: g.status as 'active' | 'achieved' | 'abandoned',
    agencyName: g.agency_name,
    notes: g.notes,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
    achievedAt: g.achieved_at,
    testName: g.test_name,
    testDescription: g.test_description,
    institution: g.institution,
    category: g.category,
    icon: g.icon,
  }));
}

/**
 * Create a career goal
 */
export async function createCareerGoal(
  userId: string,
  data: {
    ptTestId: string;
    targetDate?: string;
    priority?: 'primary' | 'secondary';
    agencyName?: string;
    notes?: string;
  }
): Promise<CareerGoal> {
  // Check if test exists
  const test = await queryOne<{ id: string }>(`SELECT id FROM pt_tests WHERE id = $1`, [data.ptTestId]);
  if (!test) {
    throw new Error('PT test not found');
  }

  // Check for existing goal
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM user_career_goals WHERE user_id = $1 AND pt_test_id = $2`,
    [userId, data.ptTestId]
  );
  if (existing) {
    throw new Error('Goal already exists for this standard');
  }

  const result = await queryOne<{ id: string }>(
    `INSERT INTO user_career_goals (user_id, pt_test_id, target_date, priority, agency_name, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      userId,
      data.ptTestId,
      data.targetDate || null,
      data.priority || 'primary',
      data.agencyName || null,
      data.notes || null,
    ]
  );

  log.info({ userId, goalId: result?.id, ptTestId: data.ptTestId }, 'Career goal created');

  const goal = await queryOne<{
    id: string;
    user_id: string;
    pt_test_id: string;
    target_date: string | null;
    priority: string;
    status: string;
    agency_name: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    achieved_at: string | null;
  }>(`SELECT * FROM user_career_goals WHERE id = $1`, [result!.id]);

  return {
    id: goal!.id,
    userId: goal!.user_id,
    ptTestId: goal!.pt_test_id,
    targetDate: goal!.target_date,
    priority: goal!.priority as 'primary' | 'secondary',
    status: goal!.status as 'active' | 'achieved' | 'abandoned',
    agencyName: goal!.agency_name,
    notes: goal!.notes,
    createdAt: goal!.created_at,
    updatedAt: goal!.updated_at,
    achievedAt: goal!.achieved_at,
  };
}

/**
 * Update a career goal
 */
export async function updateCareerGoal(
  userId: string,
  goalId: string,
  data: {
    targetDate?: string | null;
    priority?: 'primary' | 'secondary';
    status?: 'active' | 'achieved' | 'abandoned';
    agencyName?: string | null;
    notes?: string | null;
  }
): Promise<CareerGoal | null> {
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM user_career_goals WHERE id = $1 AND user_id = $2`,
    [goalId, userId]
  );
  if (!existing) return null;

  const updates: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.targetDate !== undefined) {
    updates.push(`target_date = $${paramIndex++}`);
    values.push(data.targetDate);
  }
  if (data.priority !== undefined) {
    updates.push(`priority = $${paramIndex++}`);
    values.push(data.priority);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(data.status);
    if (data.status === 'achieved') {
      updates.push(`achieved_at = NOW()`);
    }
  }
  if (data.agencyName !== undefined) {
    updates.push(`agency_name = $${paramIndex++}`);
    values.push(data.agencyName);
  }
  if (data.notes !== undefined) {
    updates.push(`notes = $${paramIndex++}`);
    values.push(data.notes);
  }

  values.push(goalId);

  await query(
    `UPDATE user_career_goals SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  );

  const goal = await queryOne<{
    id: string;
    user_id: string;
    pt_test_id: string;
    target_date: string | null;
    priority: string;
    status: string;
    agency_name: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    achieved_at: string | null;
  }>(`SELECT * FROM user_career_goals WHERE id = $1`, [goalId]);

  return goal ? {
    id: goal.id,
    userId: goal.user_id,
    ptTestId: goal.pt_test_id,
    targetDate: goal.target_date,
    priority: goal.priority as 'primary' | 'secondary',
    status: goal.status as 'active' | 'achieved' | 'abandoned',
    agencyName: goal.agency_name,
    notes: goal.notes,
    createdAt: goal.created_at,
    updatedAt: goal.updated_at,
    achievedAt: goal.achieved_at,
  } : null;
}

/**
 * Delete a career goal
 */
export async function deleteCareerGoal(userId: string, goalId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM user_career_goals WHERE id = $1 AND user_id = $2`,
    [goalId, userId]
  );
  return (result?.rowCount ?? 0) > 0;
}

// =============================================
// READINESS CALCULATION
// =============================================

/**
 * Calculate readiness score for a goal based on latest PT test results
 */
export async function calculateReadiness(userId: string, goalId: string): Promise<ReadinessScore> {
  // Get the goal and associated test
  const goal = await queryOne<{ pt_test_id: string }>(
    `SELECT pt_test_id FROM user_career_goals WHERE id = $1 AND user_id = $2`,
    [goalId, userId]
  );

  if (!goal) {
    return {
      goalId,
      readinessScore: null,
      status: 'no_data',
      eventsPassed: 0,
      eventsTotal: 0,
      weakEvents: [],
      lastAssessmentAt: null,
    };
  }

  // Get the test configuration
  const test = await queryOne<{
    components: Array<{ id: string; name: string }>;
    scoring_method: string;
    passing_score: number | null;
  }>(`SELECT components, scoring_method, passing_score FROM pt_tests WHERE id = $1`, [goal.pt_test_id]);

  if (!test) {
    return {
      goalId,
      readinessScore: null,
      status: 'no_data',
      eventsPassed: 0,
      eventsTotal: 0,
      weakEvents: [],
      lastAssessmentAt: null,
    };
  }

  // Get the latest result for this test
  const latestResult = await queryOne<{
    id: string;
    test_date: string;
    component_results: Record<string, { value: number; points?: number; passed?: boolean }>;
    total_score: number | null;
    passed: boolean | null;
  }>(
    `SELECT id, test_date, component_results, total_score, passed
     FROM user_pt_results
     WHERE user_id = $1 AND pt_test_id = $2
     ORDER BY test_date DESC
     LIMIT 1`,
    [userId, goal.pt_test_id]
  );

  if (!latestResult) {
    return {
      goalId,
      readinessScore: null,
      status: 'no_data',
      eventsPassed: 0,
      eventsTotal: 0,
      weakEvents: [],
      lastAssessmentAt: null,
    };
  }

  // Calculate readiness based on component results
  const components = test.components || [];
  const results = latestResult.component_results || {};
  let eventsPassed = 0;
  const weakEvents: string[] = [];

  for (const component of components) {
    const result = results[component.id];
    if (result?.passed === true) {
      eventsPassed++;
    } else if (result?.passed === false) {
      weakEvents.push(component.id);
    }
  }

  const eventsTotal = components.length;
  const readinessScore = eventsTotal > 0 ? Math.round((eventsPassed / eventsTotal) * 100) : null;

  let status: 'ready' | 'at_risk' | 'not_ready' | 'no_data' = 'no_data';
  if (readinessScore !== null) {
    if (readinessScore >= 100) {
      status = 'ready';
    } else if (readinessScore >= 70) {
      status = 'at_risk';
    } else {
      status = 'not_ready';
    }
  }

  // Cache the result
  await query(
    `INSERT INTO career_readiness_cache (user_id, goal_id, readiness_score, status, events_passed, events_total, weak_events, last_assessment_id, last_assessment_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id, goal_id) DO UPDATE SET
       readiness_score = EXCLUDED.readiness_score,
       status = EXCLUDED.status,
       events_passed = EXCLUDED.events_passed,
       events_total = EXCLUDED.events_total,
       weak_events = EXCLUDED.weak_events,
       last_assessment_id = EXCLUDED.last_assessment_id,
       last_assessment_at = EXCLUDED.last_assessment_at,
       computed_at = NOW()`,
    [
      userId,
      goalId,
      readinessScore,
      status,
      eventsPassed,
      eventsTotal,
      JSON.stringify(weakEvents),
      latestResult.id,
      latestResult.test_date,
    ]
  );

  return {
    goalId,
    readinessScore,
    status,
    eventsPassed,
    eventsTotal,
    weakEvents,
    lastAssessmentAt: latestResult.test_date,
  };
}

/**
 * Get cached readiness or calculate fresh
 */
export async function getReadiness(userId: string, goalId: string): Promise<ReadinessScore> {
  const cached = await queryOne<{
    goal_id: string;
    readiness_score: number | null;
    status: string;
    events_passed: number;
    events_total: number;
    weak_events: string[];
    last_assessment_at: string | null;
    computed_at: string;
  }>(
    `SELECT * FROM career_readiness_cache WHERE user_id = $1 AND goal_id = $2`,
    [userId, goalId]
  );

  // If cache is less than 1 hour old, use it
  if (cached) {
    const computedAt = new Date(cached.computed_at);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (computedAt > oneHourAgo) {
      return {
        goalId: cached.goal_id,
        readinessScore: cached.readiness_score,
        status: cached.status as 'ready' | 'at_risk' | 'not_ready' | 'no_data',
        eventsPassed: cached.events_passed,
        eventsTotal: cached.events_total,
        weakEvents: cached.weak_events || [],
        lastAssessmentAt: cached.last_assessment_at,
      };
    }
  }

  return calculateReadiness(userId, goalId);
}

/**
 * Get readiness for all user goals
 */
export async function getAllReadiness(userId: string): Promise<Array<ReadinessScore & { goal: CareerGoalWithTest }>> {
  const goals = await getUserCareerGoals(userId);
  const results: Array<ReadinessScore & { goal: CareerGoalWithTest }> = [];

  for (const goal of goals) {
    const readiness = await getReadiness(userId, goal.id);
    results.push({ ...readiness, goal });
  }

  return results;
}

// =============================================
// TEAM READINESS
// =============================================

/**
 * Get or create team readiness config for a hangout
 */
export async function getTeamReadinessConfig(hangoutId: string): Promise<TeamReadinessConfig | null> {
  const config = await queryOne<{
    id: string;
    hangout_id: string;
    enabled: boolean;
    pt_test_id: string | null;
    require_opt_in: boolean;
    visible_to: string[];
    show_individual_scores: boolean;
    show_aggregate_only: boolean;
  }>(
    `SELECT * FROM team_readiness_config WHERE hangout_id = $1`,
    [hangoutId]
  );

  if (!config) return null;

  return {
    id: config.id,
    hangoutId: config.hangout_id,
    enabled: config.enabled,
    ptTestId: config.pt_test_id,
    requireOptIn: config.require_opt_in,
    visibleTo: config.visible_to || ['admin'],
    showIndividualScores: config.show_individual_scores,
    showAggregateOnly: config.show_aggregate_only,
  };
}

/**
 * Enable team readiness for a hangout
 */
export async function enableTeamReadiness(
  hangoutId: string,
  ptTestId: string,
  options?: {
    requireOptIn?: boolean;
    visibleTo?: string[];
    showIndividualScores?: boolean;
  }
): Promise<TeamReadinessConfig> {
  const _result = await queryOne<{ id: string }>(
    `INSERT INTO team_readiness_config (hangout_id, pt_test_id, enabled, require_opt_in, visible_to, show_individual_scores)
     VALUES ($1, $2, true, $3, $4, $5)
     ON CONFLICT (hangout_id) DO UPDATE SET
       pt_test_id = EXCLUDED.pt_test_id,
       enabled = true,
       require_opt_in = EXCLUDED.require_opt_in,
       visible_to = EXCLUDED.visible_to,
       show_individual_scores = EXCLUDED.show_individual_scores,
       updated_at = NOW()
     RETURNING id`,
    [
      hangoutId,
      ptTestId,
      options?.requireOptIn ?? true,
      options?.visibleTo || ['admin'],
      options?.showIndividualScores ?? true,
    ]
  );

  return (await getTeamReadinessConfig(hangoutId))!;
}

/**
 * Opt in/out of team readiness sharing
 */
export async function setTeamReadinessOptIn(
  hangoutId: string,
  userId: string,
  optIn: boolean,
  options?: {
    shareScore?: boolean;
    shareAssessmentDates?: boolean;
    shareWeakEvents?: boolean;
  }
): Promise<void> {
  if (optIn) {
    await query(
      `INSERT INTO team_readiness_permissions (hangout_id, user_id, permission_type, share_score, share_assessment_dates, share_weak_events)
       VALUES ($1, $2, 'member', $3, $4, $5)
       ON CONFLICT (hangout_id, user_id, permission_type) DO UPDATE SET
         share_score = EXCLUDED.share_score,
         share_assessment_dates = EXCLUDED.share_assessment_dates,
         share_weak_events = EXCLUDED.share_weak_events,
         revoked_at = NULL`,
      [
        hangoutId,
        userId,
        options?.shareScore ?? true,
        options?.shareAssessmentDates ?? true,
        options?.shareWeakEvents ?? false,
      ]
    );
  } else {
    await query(
      `UPDATE team_readiness_permissions SET revoked_at = NOW()
       WHERE hangout_id = $1 AND user_id = $2 AND permission_type = 'member'`,
      [hangoutId, userId]
    );
  }
}

/**
 * Get team readiness summary
 */
export async function getTeamReadiness(hangoutId: string): Promise<TeamReadinessSummary | null> {
  const config = await getTeamReadinessConfig(hangoutId);
  if (!config || !config.enabled) return null;

  // Get all hangout members
  const members = await queryAll<{ user_id: string }>(
    `SELECT user_id FROM hangout_memberships WHERE hangout_id = $1`,
    [hangoutId]
  );

  // Get opted-in members
  const optedIn = await queryAll<{
    user_id: string;
    share_score: boolean;
    share_assessment_dates: boolean;
    share_weak_events: boolean;
  }>(
    `SELECT user_id, share_score, share_assessment_dates, share_weak_events
     FROM team_readiness_permissions
     WHERE hangout_id = $1 AND permission_type = 'member' AND revoked_at IS NULL`,
    [hangoutId]
  );

  const optedInUserIds = new Set(optedIn.map(o => o.user_id));

  // Get readiness for opted-in members
  const memberReadiness: TeamMemberReadiness[] = [];
  const weakAreaCounts: Record<string, number> = {};
  let totalReadiness = 0;
  let readinessCount = 0;
  let membersReady = 0;
  let membersAtRisk = 0;
  let membersNotReady = 0;

  for (const member of members) {
    if (!optedInUserIds.has(member.user_id)) continue;

    const permission = optedIn.find(o => o.user_id === member.user_id)!;

    // Get user info
    const user = await queryOne<{ username: string; display_name: string | null }>(
      `SELECT username, display_name FROM users WHERE id = $1`,
      [member.user_id]
    );

    // Get goal for this test
    const goal = await queryOne<{ id: string }>(
      `SELECT id FROM user_career_goals WHERE user_id = $1 AND pt_test_id = $2`,
      [member.user_id, config.ptTestId]
    );

    let readiness: ReadinessScore | null = null;
    if (goal) {
      readiness = await getReadiness(member.user_id, goal.id);
    }

    memberReadiness.push({
      userId: member.user_id,
      username: user?.username || 'Unknown',
      displayName: user?.display_name || null,
      readinessScore: permission.share_score ? readiness?.readinessScore ?? null : null,
      status: readiness?.status || 'no_data',
      lastAssessmentAt: permission.share_assessment_dates ? readiness?.lastAssessmentAt ?? null : null,
      weakEvents: permission.share_weak_events ? readiness?.weakEvents || [] : [],
    });

    if (readiness && readiness.readinessScore !== null) {
      totalReadiness += readiness.readinessScore;
      readinessCount++;
    }

    if (readiness?.status === 'ready') membersReady++;
    else if (readiness?.status === 'at_risk') membersAtRisk++;
    else if (readiness?.status === 'not_ready') membersNotReady++;

    // Track weak areas
    if (permission.share_weak_events && readiness?.weakEvents) {
      for (const event of readiness.weakEvents) {
        weakAreaCounts[event] = (weakAreaCounts[event] || 0) + 1;
      }
    }
  }

  // Sort weak areas by count
  const weakAreas = Object.entries(weakAreaCounts)
    .map(([eventId, count]) => ({ eventId, membersFailing: count }))
    .sort((a, b) => b.membersFailing - a.membersFailing);

  return {
    hangoutId,
    ptTestId: config.ptTestId,
    membersTotal: members.length,
    membersOptedIn: optedIn.length,
    membersReady,
    membersAtRisk,
    membersNotReady,
    averageReadiness: readinessCount > 0 ? Math.round(totalReadiness / readinessCount) : null,
    members: memberReadiness.sort((a, b) => (b.readinessScore || 0) - (a.readinessScore || 0)),
    weakAreas,
  };
}

// =============================================
// RECERTIFICATION
// =============================================

/**
 * Set recertification schedule for a goal
 */
export async function setRecertificationSchedule(
  userId: string,
  goalId: string,
  data: {
    lastCertifiedAt?: string;
    nextDueAt: string;
    reminderDays?: number[];
  }
): Promise<RecertificationSchedule> {
  const result = await queryOne<{ id: string }>(
    `INSERT INTO recertification_schedules (user_id, goal_id, last_certified_at, next_due_at, reminder_days)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, goal_id) DO UPDATE SET
       last_certified_at = EXCLUDED.last_certified_at,
       next_due_at = EXCLUDED.next_due_at,
       reminder_days = EXCLUDED.reminder_days
     RETURNING id`,
    [
      userId,
      goalId,
      data.lastCertifiedAt || null,
      data.nextDueAt,
      data.reminderDays || [30, 14, 7],
    ]
  );

  const schedule = await queryOne<{
    id: string;
    user_id: string;
    goal_id: string;
    last_certified_at: string | null;
    next_due_at: string;
    reminder_days: number[];
    status: string;
  }>(`SELECT * FROM recertification_schedules WHERE id = $1`, [result!.id]);

  return {
    id: schedule!.id,
    userId: schedule!.user_id,
    goalId: schedule!.goal_id,
    lastCertifiedAt: schedule!.last_certified_at,
    nextDueAt: schedule!.next_due_at,
    reminderDays: schedule!.reminder_days || [30, 14, 7],
    status: schedule!.status as 'active' | 'completed' | 'overdue',
  };
}

/**
 * Get user's recertification schedules
 */
export async function getRecertificationSchedules(userId: string): Promise<RecertificationSchedule[]> {
  const schedules = await queryAll<{
    id: string;
    user_id: string;
    goal_id: string;
    last_certified_at: string | null;
    next_due_at: string;
    reminder_days: number[];
    status: string;
  }>(
    `SELECT * FROM recertification_schedules WHERE user_id = $1 ORDER BY next_due_at`,
    [userId]
  );

  return schedules.map(s => ({
    id: s.id,
    userId: s.user_id,
    goalId: s.goal_id,
    lastCertifiedAt: s.last_certified_at,
    nextDueAt: s.next_due_at,
    reminderDays: s.reminder_days || [30, 14, 7],
    status: s.status as 'active' | 'completed' | 'overdue',
  }));
}

// =============================================
// EXERCISE RECOMMENDATIONS
// =============================================

/**
 * Get exercises that target weak events for a goal
 */
export async function getExercisesForWeakEvents(
  goalId: string,
  userId: string
): Promise<Array<{ exerciseId: string; exerciseName: string; targetEvents: string[] }>> {
  const goal = await queryOne<{ pt_test_id: string }>(
    `SELECT pt_test_id FROM user_career_goals WHERE id = $1 AND user_id = $2`,
    [goalId, userId]
  );

  if (!goal) return [];

  const readiness = await getReadiness(userId, goalId);
  if (readiness.weakEvents.length === 0) return [];

  // Get exercise mappings for this test
  const test = await queryOne<{ exercise_mappings: Record<string, string[]> }>(
    `SELECT exercise_mappings FROM pt_tests WHERE id = $1`,
    [goal.pt_test_id]
  );

  if (!test?.exercise_mappings) return [];

  // Collect exercises that target weak events
  const exerciseTargets: Record<string, string[]> = {};

  for (const weakEvent of readiness.weakEvents) {
    const exercises = test.exercise_mappings[weakEvent] || [];
    for (const exerciseId of exercises) {
      if (!exerciseTargets[exerciseId]) {
        exerciseTargets[exerciseId] = [];
      }
      exerciseTargets[exerciseId].push(weakEvent);
    }
  }

  // Get exercise names
  const exerciseIds = Object.keys(exerciseTargets);
  if (exerciseIds.length === 0) return [];

  const exercises = await queryAll<{ id: string; name: string }>(
    `SELECT id, name FROM exercises WHERE id = ANY($1)`,
    [exerciseIds]
  );

  const exerciseNameMap = new Map(exercises.map(e => [e.id, e.name]));

  return Object.entries(exerciseTargets).map(([exerciseId, targetEvents]) => ({
    exerciseId,
    exerciseName: exerciseNameMap.get(exerciseId) || exerciseId,
    targetEvents,
  }));
}

// =============================================
// EXPORTS
// =============================================

export const careerService = {
  // Standards
  getCareerStandards,
  getCareerStandard,
  getCareerCategories,
  // Goals
  getUserCareerGoals,
  createCareerGoal,
  updateCareerGoal,
  deleteCareerGoal,
  // Readiness
  calculateReadiness,
  getReadiness,
  getAllReadiness,
  // Team
  getTeamReadinessConfig,
  enableTeamReadiness,
  setTeamReadinessOptIn,
  getTeamReadiness,
  // Recertification
  setRecertificationSchedule,
  getRecertificationSchedules,
  // Exercises
  getExercisesForWeakEvents,
};

export default careerService;
