/**
 * Organization Readiness Module
 *
 * Provides enterprise-level readiness tracking and analytics for organizations:
 * - Org-wide and unit-level readiness aggregation
 * - Historical snapshot tracking and trend analysis
 * - Weak area identification and training recommendations
 * - Compliance monitoring and recertification tracking
 *
 * Reference: docs/specs/ENTERPRISE-ORGANIZATIONS.md
 */

import { queryOne, queryAll, query, transaction } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

// =============================================
// TYPES
// =============================================

export interface OrganizationReadiness {
  orgId: string;
  unitId: string | null;
  standardId: string;
  totalMembers: number;
  membersOptedIn: number;
  membersWithGoal: number;
  membersAssessed: number;
  membersReady: number;
  membersAtRisk: number;
  membersNotReady: number;
  averageReadiness: number | null;
  medianReadiness: number | null;
  minReadiness: number | null;
  maxReadiness: number | null;
  weakEvents: WeakEventAggregate[];
  complianceRate: number | null;
  overdueRecerts: number;
  staleAssessments: number;
  trendDirection: 'improving' | 'stable' | 'declining' | null;
  trendDelta: number | null;
  computedAt: string;
}

export interface WeakEventAggregate {
  eventId: string;
  eventName: string;
  count: number;
  percentage: number;
}

export interface MemberReadiness {
  userId: string;
  username: string;
  displayName: string | null;
  unitId: string | null;
  unitName: string | null;
  readinessScore: number | null;
  status: 'ready' | 'at_risk' | 'not_ready' | 'no_data';
  lastAssessmentAt: string | null;
  weakEvents: string[];
  shareReadiness: boolean;
}

export interface UnitReadiness {
  unitId: string;
  unitName: string;
  unitCode: string | null;
  unitType: string;
  parentUnitId: string | null;
  level: number;
  totalMembers: number;
  membersOptedIn: number;
  membersReady: number;
  membersAtRisk: number;
  membersNotReady: number;
  averageReadiness: number | null;
  complianceRate: number | null;
  trendDirection: 'improving' | 'stable' | 'declining' | null;
}

export interface ReadinessSnapshot {
  id: string;
  orgId: string;
  unitId: string | null;
  standardId: string;
  snapshotDate: string;
  snapshotType: 'daily' | 'weekly' | 'monthly';
  totalMembers: number;
  membersOptedIn: number;
  membersReady: number;
  membersAtRisk: number;
  membersNotReady: number;
  averageReadiness: number | null;
  complianceRate: number | null;
  createdAt: string;
}

export interface TrendAnalysis {
  direction: 'improving' | 'stable' | 'declining' | null;
  deltaPercent: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  dataPoints: number;
}

export interface ComplianceStatus {
  threshold: number;
  overallCompliance: number | null;
  membersCompliant: number;
  membersNonCompliant: number;
  overdueRecertifications: number;
  staleAssessments: number;
  recommendations: string[];
}

export interface RecommendedTraining {
  exerciseId: string;
  exerciseName: string;
  targetEvents: string[];
  memberCount: number;
  priority: 'high' | 'medium' | 'low';
}

interface OrganizationSettings {
  required_standards?: string[];
  compliance_threshold?: number;
  stale_assessment_days?: number;
  recert_grace_period_days?: number;
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Get organization settings
 */
async function getOrgSettings(orgId: string): Promise<OrganizationSettings> {
  const org = await queryOne<{ settings: OrganizationSettings | null }>(
    'SELECT settings FROM organizations WHERE id = $1',
    [orgId]
  );
  return org?.settings || {};
}

/**
 * Get compliance threshold for org (default 80%)
 */
async function getComplianceThreshold(orgId: string): Promise<number> {
  const settings = await getOrgSettings(orgId);
  return settings.compliance_threshold ?? 80;
}

/**
 * Determine readiness status based on score and threshold
 */
function getReadinessStatus(
  score: number | null,
  complianceThreshold: number
): 'ready' | 'at_risk' | 'not_ready' | 'no_data' {
  if (score === null) return 'no_data';
  if (score >= complianceThreshold) return 'ready';
  if (score >= 70) return 'at_risk';
  return 'not_ready';
}

/**
 * Calculate median from array of numbers
 */
function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// =============================================
// READINESS QUERIES
// =============================================

/**
 * Get organization-wide readiness with aggregate stats
 */
export async function getOrganizationReadiness(
  orgId: string,
  standardId: string
): Promise<OrganizationReadiness | null> {
  // First try to get from cache
  const cached = await queryOne<{
    org_id: string;
    unit_id: string | null;
    standard_id: string;
    total_members: number;
    members_opted_in: number;
    members_with_goal: number;
    members_assessed: number;
    members_ready: number;
    members_at_risk: number;
    members_not_ready: number;
    average_readiness: number | null;
    median_readiness: number | null;
    min_readiness: number | null;
    max_readiness: number | null;
    weak_events: WeakEventAggregate[] | null;
    compliance_rate: number | null;
    overdue_recerts: number;
    stale_assessments: number;
    trend_direction: string | null;
    trend_delta: number | null;
    computed_at: string;
  }>(
    `SELECT * FROM organization_readiness_cache
     WHERE org_id = $1 AND unit_id IS NULL AND standard_id = $2`,
    [orgId, standardId]
  );

  if (cached) {
    // Check if cache is fresh (< 1 hour old)
    const cacheAge = Date.now() - new Date(cached.computed_at).getTime();
    if (cacheAge < 60 * 60 * 1000) {
      return {
        orgId: cached.org_id,
        unitId: cached.unit_id,
        standardId: cached.standard_id,
        totalMembers: cached.total_members,
        membersOptedIn: cached.members_opted_in,
        membersWithGoal: cached.members_with_goal,
        membersAssessed: cached.members_assessed,
        membersReady: cached.members_ready,
        membersAtRisk: cached.members_at_risk,
        membersNotReady: cached.members_not_ready,
        averageReadiness: cached.average_readiness,
        medianReadiness: cached.median_readiness,
        minReadiness: cached.min_readiness,
        maxReadiness: cached.max_readiness,
        weakEvents: cached.weak_events || [],
        complianceRate: cached.compliance_rate,
        overdueRecerts: cached.overdue_recerts,
        staleAssessments: cached.stale_assessments,
        trendDirection: cached.trend_direction as 'improving' | 'stable' | 'declining' | null,
        trendDelta: cached.trend_delta,
        computedAt: cached.computed_at,
      };
    }
  }

  // Cache miss or stale - compute fresh
  return computeReadinessAggregate(orgId, null, standardId);
}

/**
 * Get unit-level readiness with member breakdown
 */
export async function getUnitReadiness(
  orgId: string,
  unitId: string,
  standardId: string
): Promise<{ aggregate: OrganizationReadiness | null; members: MemberReadiness[] }> {
  // Get aggregate from cache or compute
  let aggregate = await queryOne<{
    org_id: string;
    unit_id: string | null;
    standard_id: string;
    total_members: number;
    members_opted_in: number;
    members_with_goal: number;
    members_assessed: number;
    members_ready: number;
    members_at_risk: number;
    members_not_ready: number;
    average_readiness: number | null;
    median_readiness: number | null;
    min_readiness: number | null;
    max_readiness: number | null;
    weak_events: WeakEventAggregate[] | null;
    compliance_rate: number | null;
    overdue_recerts: number;
    stale_assessments: number;
    trend_direction: string | null;
    trend_delta: number | null;
    computed_at: string;
  }>(
    `SELECT * FROM organization_readiness_cache
     WHERE org_id = $1 AND unit_id = $2 AND standard_id = $3`,
    [orgId, unitId, standardId]
  );

  let aggregateResult: OrganizationReadiness | null = null;
  if (aggregate) {
    const cacheAge = Date.now() - new Date(aggregate.computed_at).getTime();
    if (cacheAge < 60 * 60 * 1000) {
      aggregateResult = {
        orgId: aggregate.org_id,
        unitId: aggregate.unit_id,
        standardId: aggregate.standard_id,
        totalMembers: aggregate.total_members,
        membersOptedIn: aggregate.members_opted_in,
        membersWithGoal: aggregate.members_with_goal,
        membersAssessed: aggregate.members_assessed,
        membersReady: aggregate.members_ready,
        membersAtRisk: aggregate.members_at_risk,
        membersNotReady: aggregate.members_not_ready,
        averageReadiness: aggregate.average_readiness,
        medianReadiness: aggregate.median_readiness,
        minReadiness: aggregate.min_readiness,
        maxReadiness: aggregate.max_readiness,
        weakEvents: aggregate.weak_events || [],
        complianceRate: aggregate.compliance_rate,
        overdueRecerts: aggregate.overdue_recerts,
        staleAssessments: aggregate.stale_assessments,
        trendDirection: aggregate.trend_direction as 'improving' | 'stable' | 'declining' | null,
        trendDelta: aggregate.trend_delta,
        computedAt: aggregate.computed_at,
      };
    }
  }

  if (!aggregateResult) {
    aggregateResult = await computeReadinessAggregate(orgId, unitId, standardId);
  }

  // Get member breakdown
  const complianceThreshold = await getComplianceThreshold(orgId);
  const members = await getMembersWithReadiness(orgId, unitId, standardId, complianceThreshold);

  return { aggregate: aggregateResult, members };
}

/**
 * Get individual member readiness
 */
export async function getMemberReadiness(
  orgId: string,
  userId: string,
  standardId: string
): Promise<MemberReadiness | null> {
  const complianceThreshold = await getComplianceThreshold(orgId);

  const member = await queryOne<{
    user_id: string;
    username: string;
    display_name: string | null;
    unit_id: string | null;
    unit_name: string | null;
    share_readiness: boolean;
    readiness_score: number | null;
    events_passed: number | null;
    events_total: number | null;
    weak_events: string[] | null;
    last_assessment_at: string | null;
  }>(
    `SELECT
       om.user_id,
       u.username,
       u.display_name,
       om.unit_id,
       ou.name as unit_name,
       om.share_readiness,
       crc.readiness_score,
       crc.events_passed,
       crc.events_total,
       crc.weak_events,
       crc.last_assessment_at
     FROM organization_members om
     JOIN users u ON u.id = om.user_id
     LEFT JOIN organization_units ou ON ou.id = om.unit_id
     LEFT JOIN user_career_goals ucg ON ucg.user_id = om.user_id AND ucg.pt_test_id = $3
     LEFT JOIN career_readiness_cache crc ON crc.goal_id = ucg.id
     WHERE om.org_id = $1 AND om.user_id = $2 AND om.status = 'active'`,
    [orgId, userId, standardId]
  );

  if (!member) return null;

  return {
    userId: member.user_id,
    username: member.username,
    displayName: member.display_name,
    unitId: member.unit_id,
    unitName: member.unit_name,
    readinessScore: member.readiness_score,
    status: getReadinessStatus(member.readiness_score, complianceThreshold),
    lastAssessmentAt: member.last_assessment_at,
    weakEvents: member.weak_events || [],
    shareReadiness: member.share_readiness,
  };
}

/**
 * Get members with readiness data for a unit or org
 */
async function getMembersWithReadiness(
  orgId: string,
  unitId: string | null,
  standardId: string,
  complianceThreshold: number
): Promise<MemberReadiness[]> {
  const whereClause = unitId
    ? 'om.org_id = $1 AND om.unit_id = $2 AND om.status = $4'
    : 'om.org_id = $1 AND om.status = $4';
  const params = unitId
    ? [orgId, unitId, standardId, 'active']
    : [orgId, standardId, 'active'];

  const members = await queryAll<{
    user_id: string;
    username: string;
    display_name: string | null;
    unit_id: string | null;
    unit_name: string | null;
    share_readiness: boolean;
    readiness_score: number | null;
    weak_events: string[] | null;
    last_assessment_at: string | null;
  }>(
    `SELECT
       om.user_id,
       u.username,
       u.display_name,
       om.unit_id,
       ou.name as unit_name,
       om.share_readiness,
       crc.readiness_score,
       crc.weak_events,
       crc.last_assessment_at
     FROM organization_members om
     JOIN users u ON u.id = om.user_id
     LEFT JOIN organization_units ou ON ou.id = om.unit_id
     LEFT JOIN user_career_goals ucg ON ucg.user_id = om.user_id AND ucg.pt_test_id = $${unitId ? 3 : 2}
     LEFT JOIN career_readiness_cache crc ON crc.goal_id = ucg.id
     WHERE ${whereClause}
     ORDER BY crc.readiness_score DESC NULLS LAST`,
    params
  );

  return members.map(m => ({
    userId: m.user_id,
    username: m.username,
    displayName: m.display_name,
    unitId: m.unit_id,
    unitName: m.unit_name,
    readinessScore: m.share_readiness ? m.readiness_score : null,
    status: m.share_readiness
      ? getReadinessStatus(m.readiness_score, complianceThreshold)
      : 'no_data',
    lastAssessmentAt: m.share_readiness ? m.last_assessment_at : null,
    weakEvents: m.share_readiness ? (m.weak_events || []) : [],
    shareReadiness: m.share_readiness,
  }));
}

// =============================================
// READINESS AGGREGATION
// =============================================

/**
 * Calculate aggregate metrics for an org or unit
 */
export async function computeReadinessAggregate(
  orgId: string,
  unitId: string | null,
  standardId: string
): Promise<OrganizationReadiness | null> {
  const complianceThreshold = await getComplianceThreshold(orgId);
  const settings = await getOrgSettings(orgId);
  const staleAssessmentDays = settings.stale_assessment_days ?? 90;

  // Get all active members for this org/unit
  const whereClause = unitId
    ? 'om.org_id = $1 AND om.unit_id = $2 AND om.status = $3'
    : 'om.org_id = $1 AND om.status = $3';
  const params = unitId ? [orgId, unitId, 'active'] : [orgId, 'active'];

  // Count total members
  const memberCount = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM organization_members om WHERE ${whereClause}`,
    params
  );
  const totalMembers = parseInt(memberCount?.count || '0', 10);

  if (totalMembers === 0) {
    return {
      orgId,
      unitId,
      standardId,
      totalMembers: 0,
      membersOptedIn: 0,
      membersWithGoal: 0,
      membersAssessed: 0,
      membersReady: 0,
      membersAtRisk: 0,
      membersNotReady: 0,
      averageReadiness: null,
      medianReadiness: null,
      minReadiness: null,
      maxReadiness: null,
      weakEvents: [],
      complianceRate: null,
      overdueRecerts: 0,
      staleAssessments: 0,
      trendDirection: null,
      trendDelta: null,
      computedAt: new Date().toISOString(),
    };
  }

  // Get opted-in members count
  const optedInWhere = unitId
    ? 'om.org_id = $1 AND om.unit_id = $2 AND om.status = $3 AND om.share_readiness = true'
    : 'om.org_id = $1 AND om.status = $3 AND om.share_readiness = true';
  const optedInCount = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM organization_members om WHERE ${optedInWhere}`,
    params
  );
  const membersOptedIn = parseInt(optedInCount?.count || '0', 10);

  // Get members with goals and their readiness data
  const readinessParams = unitId
    ? [orgId, unitId, standardId, 'active']
    : [orgId, standardId, 'active'];

  const readinessData = await queryAll<{
    user_id: string;
    readiness_score: number | null;
    weak_events: string[] | null;
    last_assessment_at: string | null;
    share_readiness: boolean;
    has_goal: boolean;
  }>(
    `SELECT
       om.user_id,
       crc.readiness_score,
       crc.weak_events,
       crc.last_assessment_at,
       om.share_readiness,
       CASE WHEN ucg.id IS NOT NULL THEN true ELSE false END as has_goal
     FROM organization_members om
     LEFT JOIN user_career_goals ucg ON ucg.user_id = om.user_id AND ucg.pt_test_id = $${unitId ? 3 : 2}
     LEFT JOIN career_readiness_cache crc ON crc.goal_id = ucg.id
     WHERE ${unitId
       ? 'om.org_id = $1 AND om.unit_id = $2 AND om.status = $4'
       : 'om.org_id = $1 AND om.status = $3'}`,
    readinessParams
  );

  // Calculate aggregates
  const scores: number[] = [];
  const weakEventCounts: Record<string, number> = {};
  let membersWithGoal = 0;
  let membersAssessed = 0;
  let membersReady = 0;
  let membersAtRisk = 0;
  let membersNotReady = 0;
  let staleAssessments = 0;

  const now = Date.now();
  const staleThreshold = staleAssessmentDays * 24 * 60 * 60 * 1000;

  for (const member of readinessData) {
    if (member.has_goal) {
      membersWithGoal++;
    }

    // Only consider opted-in members for readiness stats
    if (!member.share_readiness) continue;

    if (member.readiness_score !== null) {
      membersAssessed++;
      scores.push(member.readiness_score);

      if (member.readiness_score >= complianceThreshold) {
        membersReady++;
      } else if (member.readiness_score >= 70) {
        membersAtRisk++;
      } else {
        membersNotReady++;
      }

      // Check for stale assessment
      if (member.last_assessment_at) {
        const assessmentAge = now - new Date(member.last_assessment_at).getTime();
        if (assessmentAge > staleThreshold) {
          staleAssessments++;
        }
      }

      // Aggregate weak events
      if (member.weak_events) {
        for (const event of member.weak_events) {
          weakEventCounts[event] = (weakEventCounts[event] || 0) + 1;
        }
      }
    }
  }

  // Calculate score statistics
  const averageReadiness = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;
  const medianReadiness = calculateMedian(scores);
  const minReadiness = scores.length > 0 ? Math.min(...scores) : null;
  const maxReadiness = scores.length > 0 ? Math.max(...scores) : null;

  // Calculate compliance rate
  const complianceRate = membersAssessed > 0
    ? Math.round((membersReady / membersAssessed) * 1000) / 10
    : null;

  // Format weak events
  const weakEvents: WeakEventAggregate[] = Object.entries(weakEventCounts)
    .map(([eventId, count]) => ({
      eventId,
      eventName: eventId, // Will be populated from pt_tests if needed
      count,
      percentage: membersAssessed > 0 ? Math.round((count / membersAssessed) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Get overdue recertifications
  const overdueRecerts = await countOverdueRecertifications(orgId, unitId, standardId);

  // Calculate trend
  const trend = await computeTrend(orgId, unitId, standardId);

  const result: OrganizationReadiness = {
    orgId,
    unitId,
    standardId,
    totalMembers,
    membersOptedIn,
    membersWithGoal,
    membersAssessed,
    membersReady,
    membersAtRisk,
    membersNotReady,
    averageReadiness,
    medianReadiness,
    minReadiness,
    maxReadiness,
    weakEvents,
    complianceRate,
    overdueRecerts,
    staleAssessments,
    trendDirection: trend.direction,
    trendDelta: trend.deltaPercent,
    computedAt: new Date().toISOString(),
  };

  // Store in cache
  await upsertReadinessCache(result);

  log.info({ orgId, unitId, standardId, totalMembers, averageReadiness }, 'Computed readiness aggregate');

  return result;
}

/**
 * Update or insert readiness cache entry
 */
async function upsertReadinessCache(data: OrganizationReadiness): Promise<void> {
  await query(
    `INSERT INTO organization_readiness_cache (
       org_id, unit_id, standard_id, total_members, members_opted_in,
       members_with_goal, members_assessed, members_ready, members_at_risk,
       members_not_ready, average_readiness, median_readiness, min_readiness,
       max_readiness, weak_events, compliance_rate, overdue_recerts,
       stale_assessments, trend_direction, trend_delta, computed_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
     ON CONFLICT (org_id, COALESCE(unit_id, '00000000-0000-0000-0000-000000000000'), standard_id)
     DO UPDATE SET
       total_members = EXCLUDED.total_members,
       members_opted_in = EXCLUDED.members_opted_in,
       members_with_goal = EXCLUDED.members_with_goal,
       members_assessed = EXCLUDED.members_assessed,
       members_ready = EXCLUDED.members_ready,
       members_at_risk = EXCLUDED.members_at_risk,
       members_not_ready = EXCLUDED.members_not_ready,
       average_readiness = EXCLUDED.average_readiness,
       median_readiness = EXCLUDED.median_readiness,
       min_readiness = EXCLUDED.min_readiness,
       max_readiness = EXCLUDED.max_readiness,
       weak_events = EXCLUDED.weak_events,
       compliance_rate = EXCLUDED.compliance_rate,
       overdue_recerts = EXCLUDED.overdue_recerts,
       stale_assessments = EXCLUDED.stale_assessments,
       trend_direction = EXCLUDED.trend_direction,
       trend_delta = EXCLUDED.trend_delta,
       computed_at = EXCLUDED.computed_at`,
    [
      data.orgId,
      data.unitId,
      data.standardId,
      data.totalMembers,
      data.membersOptedIn,
      data.membersWithGoal,
      data.membersAssessed,
      data.membersReady,
      data.membersAtRisk,
      data.membersNotReady,
      data.averageReadiness,
      data.medianReadiness,
      data.minReadiness,
      data.maxReadiness,
      JSON.stringify(data.weakEvents),
      data.complianceRate,
      data.overdueRecerts,
      data.staleAssessments,
      data.trendDirection,
      data.trendDelta,
      data.computedAt,
    ]
  );
}

/**
 * Refresh readiness cache for an org/unit/standard
 */
export async function refreshReadinessCache(
  orgId: string,
  unitId: string | null,
  standardId: string
): Promise<OrganizationReadiness | null> {
  return computeReadinessAggregate(orgId, unitId, standardId);
}

/**
 * Refresh all readiness caches for an organization
 */
export async function refreshAllOrgReadiness(orgId: string): Promise<void> {
  const settings = await getOrgSettings(orgId);
  const standards = settings.required_standards || [];

  // Get all units in the org
  const units = await queryAll<{ id: string }>(
    'SELECT id FROM organization_units WHERE org_id = $1 AND active = true',
    [orgId]
  );

  // Refresh org-level readiness for each standard
  for (const standardId of standards) {
    await computeReadinessAggregate(orgId, null, standardId);

    // Refresh each unit
    for (const unit of units) {
      await computeReadinessAggregate(orgId, unit.id, standardId);
    }
  }

  log.info({ orgId, standardCount: standards.length, unitCount: units.length }, 'Refreshed all org readiness');
}

// =============================================
// HISTORICAL ANALYSIS
// =============================================

/**
 * Create a point-in-time snapshot
 */
export async function createReadinessSnapshot(
  orgId: string,
  unitId: string | null,
  standardId: string,
  snapshotType: 'daily' | 'weekly' | 'monthly'
): Promise<ReadinessSnapshot> {
  // Get current aggregate
  const aggregate = await computeReadinessAggregate(orgId, unitId, standardId);

  if (!aggregate) {
    throw new Error('Could not compute readiness aggregate');
  }

  const snapshotDate = new Date().toISOString().split('T')[0];

  const result = await queryOne<{ id: string; created_at: string }>(
    `INSERT INTO organization_readiness_snapshots (
       org_id, unit_id, standard_id, snapshot_date, snapshot_type,
       total_members, members_opted_in, members_ready, members_at_risk,
       members_not_ready, average_readiness, compliance_rate
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (org_id, COALESCE(unit_id, '00000000-0000-0000-0000-000000000000'), standard_id, snapshot_date, snapshot_type)
     DO UPDATE SET
       total_members = EXCLUDED.total_members,
       members_opted_in = EXCLUDED.members_opted_in,
       members_ready = EXCLUDED.members_ready,
       members_at_risk = EXCLUDED.members_at_risk,
       members_not_ready = EXCLUDED.members_not_ready,
       average_readiness = EXCLUDED.average_readiness,
       compliance_rate = EXCLUDED.compliance_rate
     RETURNING id, created_at`,
    [
      orgId,
      unitId,
      standardId,
      snapshotDate,
      snapshotType,
      aggregate.totalMembers,
      aggregate.membersOptedIn,
      aggregate.membersReady,
      aggregate.membersAtRisk,
      aggregate.membersNotReady,
      aggregate.averageReadiness,
      aggregate.complianceRate,
    ]
  );

  log.info({ orgId, unitId, standardId, snapshotType, snapshotDate }, 'Created readiness snapshot');

  return {
    id: result!.id,
    orgId,
    unitId,
    standardId,
    snapshotDate,
    snapshotType,
    totalMembers: aggregate.totalMembers,
    membersOptedIn: aggregate.membersOptedIn,
    membersReady: aggregate.membersReady,
    membersAtRisk: aggregate.membersAtRisk,
    membersNotReady: aggregate.membersNotReady,
    averageReadiness: aggregate.averageReadiness,
    complianceRate: aggregate.complianceRate,
    createdAt: result!.created_at,
  };
}

/**
 * Get historical snapshots for an org/unit
 */
export async function getReadinessHistory(
  orgId: string,
  unitId: string | null,
  standardId: string,
  dateRange?: { startDate: string; endDate: string }
): Promise<ReadinessSnapshot[]> {
  const params: unknown[] = [orgId, standardId];
  let whereClause = 'org_id = $1 AND standard_id = $2';

  if (unitId) {
    params.push(unitId);
    whereClause += ` AND unit_id = $${params.length}`;
  } else {
    whereClause += ' AND unit_id IS NULL';
  }

  if (dateRange) {
    params.push(dateRange.startDate, dateRange.endDate);
    whereClause += ` AND snapshot_date >= $${params.length - 1} AND snapshot_date <= $${params.length}`;
  }

  const snapshots = await queryAll<{
    id: string;
    org_id: string;
    unit_id: string | null;
    standard_id: string;
    snapshot_date: string;
    snapshot_type: string;
    total_members: number;
    members_opted_in: number;
    members_ready: number;
    members_at_risk: number;
    members_not_ready: number;
    average_readiness: number | null;
    compliance_rate: number | null;
    created_at: string;
  }>(
    `SELECT * FROM organization_readiness_snapshots
     WHERE ${whereClause}
     ORDER BY snapshot_date DESC`,
    params
  );

  return snapshots.map(s => ({
    id: s.id,
    orgId: s.org_id,
    unitId: s.unit_id,
    standardId: s.standard_id,
    snapshotDate: s.snapshot_date,
    snapshotType: s.snapshot_type as 'daily' | 'weekly' | 'monthly',
    totalMembers: s.total_members,
    membersOptedIn: s.members_opted_in,
    membersReady: s.members_ready,
    membersAtRisk: s.members_at_risk,
    membersNotReady: s.members_not_ready,
    averageReadiness: s.average_readiness,
    complianceRate: s.compliance_rate,
    createdAt: s.created_at,
  }));
}

/**
 * Calculate trend from snapshots
 */
export async function computeTrend(
  orgId: string,
  unitId: string | null,
  standardId: string
): Promise<TrendAnalysis> {
  // Get last 4 weekly snapshots
  const params: unknown[] = [orgId, standardId, 'weekly'];
  let whereClause = 'org_id = $1 AND standard_id = $2 AND snapshot_type = $3';

  if (unitId) {
    params.push(unitId);
    whereClause += ` AND unit_id = $${params.length}`;
  } else {
    whereClause += ' AND unit_id IS NULL';
  }

  const snapshots = await queryAll<{
    snapshot_date: string;
    average_readiness: number | null;
  }>(
    `SELECT snapshot_date, average_readiness
     FROM organization_readiness_snapshots
     WHERE ${whereClause}
     ORDER BY snapshot_date DESC
     LIMIT 4`,
    params
  );

  if (snapshots.length < 2) {
    return {
      direction: null,
      deltaPercent: null,
      periodStart: null,
      periodEnd: null,
      dataPoints: snapshots.length,
    };
  }

  const validSnapshots = snapshots.filter(s => s.average_readiness !== null);
  if (validSnapshots.length < 2) {
    return {
      direction: null,
      deltaPercent: null,
      periodStart: snapshots[snapshots.length - 1].snapshot_date,
      periodEnd: snapshots[0].snapshot_date,
      dataPoints: snapshots.length,
    };
  }

  const latest = validSnapshots[0].average_readiness!;
  const oldest = validSnapshots[validSnapshots.length - 1].average_readiness!;
  const delta = latest - oldest;
  const deltaPercent = oldest > 0 ? Math.round((delta / oldest) * 1000) / 10 : 0;

  let direction: 'improving' | 'stable' | 'declining' | null;
  if (Math.abs(deltaPercent) < 2) {
    direction = 'stable';
  } else if (deltaPercent > 0) {
    direction = 'improving';
  } else {
    direction = 'declining';
  }

  return {
    direction,
    deltaPercent,
    periodStart: validSnapshots[validSnapshots.length - 1].snapshot_date,
    periodEnd: validSnapshots[0].snapshot_date,
    dataPoints: validSnapshots.length,
  };
}

// =============================================
// WEAK AREA ANALYSIS
// =============================================

/**
 * Get aggregated weak events across org
 */
export async function getOrgWeakAreas(
  orgId: string,
  standardId: string
): Promise<WeakEventAggregate[]> {
  const aggregate = await getOrganizationReadiness(orgId, standardId);
  if (!aggregate) return [];

  // Get event names from pt_tests
  const test = await queryOne<{
    components: Array<{ id: string; name: string }>;
  }>(
    'SELECT components FROM pt_tests WHERE id = $1',
    [standardId]
  );

  const eventNameMap = new Map<string, string>();
  if (test?.components) {
    for (const comp of test.components) {
      eventNameMap.set(comp.id, comp.name);
    }
  }

  return aggregate.weakEvents.map(we => ({
    ...we,
    eventName: eventNameMap.get(we.eventId) || we.eventId,
  }));
}

/**
 * Get aggregated weak events for a unit
 */
export async function getUnitWeakAreas(
  orgId: string,
  unitId: string,
  standardId: string
): Promise<WeakEventAggregate[]> {
  const { aggregate } = await getUnitReadiness(orgId, unitId, standardId);
  if (!aggregate) return [];

  // Get event names from pt_tests
  const test = await queryOne<{
    components: Array<{ id: string; name: string }>;
  }>(
    'SELECT components FROM pt_tests WHERE id = $1',
    [standardId]
  );

  const eventNameMap = new Map<string, string>();
  if (test?.components) {
    for (const comp of test.components) {
      eventNameMap.set(comp.id, comp.name);
    }
  }

  return aggregate.weakEvents.map(we => ({
    ...we,
    eventName: eventNameMap.get(we.eventId) || we.eventId,
  }));
}

/**
 * Get recommended training exercises for weak areas
 */
export async function getRecommendedTraining(
  orgId: string,
  standardId: string
): Promise<RecommendedTraining[]> {
  const weakAreas = await getOrgWeakAreas(orgId, standardId);
  if (weakAreas.length === 0) return [];

  // Get exercise mappings from pt_test
  const test = await queryOne<{
    exercise_mappings: Record<string, string[]>;
  }>(
    'SELECT exercise_mappings FROM pt_tests WHERE id = $1',
    [standardId]
  );

  if (!test?.exercise_mappings) return [];

  // Collect exercises that target weak events
  const exerciseTargets: Record<string, { events: string[]; memberCount: number }> = {};

  for (const weakArea of weakAreas) {
    const exercises = test.exercise_mappings[weakArea.eventId] || [];
    for (const exerciseId of exercises) {
      if (!exerciseTargets[exerciseId]) {
        exerciseTargets[exerciseId] = { events: [], memberCount: 0 };
      }
      exerciseTargets[exerciseId].events.push(weakArea.eventId);
      exerciseTargets[exerciseId].memberCount = Math.max(
        exerciseTargets[exerciseId].memberCount,
        weakArea.count
      );
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

  return Object.entries(exerciseTargets)
    .map(([exerciseId, data]) => ({
      exerciseId,
      exerciseName: exerciseNameMap.get(exerciseId) || exerciseId,
      targetEvents: data.events,
      memberCount: data.memberCount,
      priority: data.memberCount > 10 ? 'high' : data.memberCount > 5 ? 'medium' : 'low',
    }))
    .sort((a, b) => {
      // Sort by priority then by member count
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      return priorityDiff !== 0 ? priorityDiff : b.memberCount - a.memberCount;
    }) as RecommendedTraining[];
}

// =============================================
// COMPLIANCE
// =============================================

/**
 * Get overall compliance status for an organization
 */
export async function getComplianceStatus(
  orgId: string,
  standardId: string
): Promise<ComplianceStatus> {
  const aggregate = await getOrganizationReadiness(orgId, standardId);
  const threshold = await getComplianceThreshold(orgId);

  if (!aggregate) {
    return {
      threshold,
      overallCompliance: null,
      membersCompliant: 0,
      membersNonCompliant: 0,
      overdueRecertifications: 0,
      staleAssessments: 0,
      recommendations: ['No readiness data available. Encourage members to opt-in and complete assessments.'],
    };
  }

  const recommendations: string[] = [];

  // Generate recommendations based on data
  if (aggregate.membersOptedIn < aggregate.totalMembers * 0.5) {
    recommendations.push(
      `Only ${Math.round((aggregate.membersOptedIn / aggregate.totalMembers) * 100)}% of members are opted-in. ` +
      'Consider running an opt-in campaign to improve visibility.'
    );
  }

  if (aggregate.membersNotReady > aggregate.membersAssessed * 0.2) {
    recommendations.push(
      `${aggregate.membersNotReady} members are not ready. ` +
      'Consider scheduling targeted training sessions for weak areas.'
    );
  }

  if (aggregate.overdueRecerts > 0) {
    recommendations.push(
      `${aggregate.overdueRecerts} members have overdue recertifications. ` +
      'Schedule testing sessions to maintain compliance.'
    );
  }

  if (aggregate.staleAssessments > aggregate.membersAssessed * 0.3) {
    recommendations.push(
      `${aggregate.staleAssessments} members have stale assessments. ` +
      'Encourage regular self-assessments to track progress.'
    );
  }

  if (aggregate.weakEvents.length > 0) {
    const topWeakEvent = aggregate.weakEvents[0];
    recommendations.push(
      `"${topWeakEvent.eventName}" is the most common weak area (${topWeakEvent.count} members). ` +
      'Focus training resources on this event.'
    );
  }

  return {
    threshold,
    overallCompliance: aggregate.complianceRate,
    membersCompliant: aggregate.membersReady,
    membersNonCompliant: aggregate.membersAtRisk + aggregate.membersNotReady,
    overdueRecertifications: aggregate.overdueRecerts,
    staleAssessments: aggregate.staleAssessments,
    recommendations: recommendations.length > 0 ? recommendations : ['Organization is meeting compliance goals!'],
  };
}

/**
 * Count overdue recertifications
 */
async function countOverdueRecertifications(
  orgId: string,
  unitId: string | null,
  standardId: string
): Promise<number> {
  const params: unknown[] = [orgId, standardId];
  let whereClause = 'om.org_id = $1 AND rs.status = $3';

  if (unitId) {
    params.push(unitId);
    whereClause = `om.org_id = $1 AND om.unit_id = $${params.length} AND rs.status = $4`;
    params.push('overdue');
  } else {
    params.push('overdue');
  }

  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM organization_members om
     JOIN user_career_goals ucg ON ucg.user_id = om.user_id AND ucg.pt_test_id = $2
     JOIN recertification_schedules rs ON rs.goal_id = ucg.id
     WHERE ${whereClause}`,
    params
  );

  return parseInt(result?.count || '0', 10);
}

/**
 * Get members with overdue recertifications
 */
export async function getOverdueRecertifications(orgId: string): Promise<MemberReadiness[]> {
  const settings = await getOrgSettings(orgId);
  const standards = settings.required_standards || [];
  const complianceThreshold = await getComplianceThreshold(orgId);

  if (standards.length === 0) return [];

  const members = await queryAll<{
    user_id: string;
    username: string;
    display_name: string | null;
    unit_id: string | null;
    unit_name: string | null;
    share_readiness: boolean;
    readiness_score: number | null;
    weak_events: string[] | null;
    last_assessment_at: string | null;
  }>(
    `SELECT DISTINCT
       om.user_id,
       u.username,
       u.display_name,
       om.unit_id,
       ou.name as unit_name,
       om.share_readiness,
       crc.readiness_score,
       crc.weak_events,
       crc.last_assessment_at
     FROM organization_members om
     JOIN users u ON u.id = om.user_id
     LEFT JOIN organization_units ou ON ou.id = om.unit_id
     JOIN user_career_goals ucg ON ucg.user_id = om.user_id AND ucg.pt_test_id = ANY($2)
     JOIN recertification_schedules rs ON rs.goal_id = ucg.id AND rs.status = 'overdue'
     LEFT JOIN career_readiness_cache crc ON crc.goal_id = ucg.id
     WHERE om.org_id = $1 AND om.status = 'active'
     ORDER BY u.username`,
    [orgId, standards]
  );

  return members.map(m => ({
    userId: m.user_id,
    username: m.username,
    displayName: m.display_name,
    unitId: m.unit_id,
    unitName: m.unit_name,
    readinessScore: m.share_readiness ? m.readiness_score : null,
    status: m.share_readiness
      ? getReadinessStatus(m.readiness_score, complianceThreshold)
      : 'no_data',
    lastAssessmentAt: m.share_readiness ? m.last_assessment_at : null,
    weakEvents: m.share_readiness ? (m.weak_events || []) : [],
    shareReadiness: m.share_readiness,
  }));
}

/**
 * Get members without recent assessments
 */
export async function getStaleAssessments(
  orgId: string,
  daysSince?: number
): Promise<MemberReadiness[]> {
  const settings = await getOrgSettings(orgId);
  const staleDays = daysSince ?? settings.stale_assessment_days ?? 90;
  const standards = settings.required_standards || [];
  const complianceThreshold = await getComplianceThreshold(orgId);

  if (standards.length === 0) return [];

  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - staleDays);

  const members = await queryAll<{
    user_id: string;
    username: string;
    display_name: string | null;
    unit_id: string | null;
    unit_name: string | null;
    share_readiness: boolean;
    readiness_score: number | null;
    weak_events: string[] | null;
    last_assessment_at: string | null;
  }>(
    `SELECT
       om.user_id,
       u.username,
       u.display_name,
       om.unit_id,
       ou.name as unit_name,
       om.share_readiness,
       crc.readiness_score,
       crc.weak_events,
       crc.last_assessment_at
     FROM organization_members om
     JOIN users u ON u.id = om.user_id
     LEFT JOIN organization_units ou ON ou.id = om.unit_id
     JOIN user_career_goals ucg ON ucg.user_id = om.user_id AND ucg.pt_test_id = ANY($2)
     LEFT JOIN career_readiness_cache crc ON crc.goal_id = ucg.id
     WHERE om.org_id = $1
       AND om.status = 'active'
       AND om.share_readiness = true
       AND (crc.last_assessment_at IS NULL OR crc.last_assessment_at < $3)
     ORDER BY crc.last_assessment_at ASC NULLS FIRST`,
    [orgId, standards, staleDate.toISOString()]
  );

  return members.map(m => ({
    userId: m.user_id,
    username: m.username,
    displayName: m.display_name,
    unitId: m.unit_id,
    unitName: m.unit_name,
    readinessScore: m.readiness_score,
    status: getReadinessStatus(m.readiness_score, complianceThreshold),
    lastAssessmentAt: m.last_assessment_at,
    weakEvents: m.weak_events || [],
    shareReadiness: m.share_readiness,
  }));
}

// =============================================
// EXPORTS
// =============================================

export const organizationReadinessService = {
  // Readiness Queries
  getOrganizationReadiness,
  getUnitReadiness,
  getMemberReadiness,

  // Readiness Aggregation
  computeReadinessAggregate,
  refreshReadinessCache,
  refreshAllOrgReadiness,

  // Historical Analysis
  createReadinessSnapshot,
  getReadinessHistory,
  computeTrend,

  // Weak Area Analysis
  getOrgWeakAreas,
  getUnitWeakAreas,
  getRecommendedTraining,

  // Compliance
  getComplianceStatus,
  getOverdueRecertifications,
  getStaleAssessments,
};

export default organizationReadinessService;
