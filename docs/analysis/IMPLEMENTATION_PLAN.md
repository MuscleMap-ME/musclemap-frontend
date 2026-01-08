# MuscleMap Implementation Plan

*Generated: January 8, 2026*

## Executive Summary

This plan sequences the implementation of new features for MuscleMap, prioritizing Career Physical Standards as the key differentiator. Each PR is designed to be independently deployable with feature flags.

---

## PR Sequence Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     IMPLEMENTATION SEQUENCE                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PR0: Foundation                                            │
│   └── Feature flags, telemetry, migrations framework        │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PR1-PR5: Career Readiness (MVP)                      │   │
│  │                                                      │   │
│  │  PR1: Standards Library (data layer)                │   │
│  │   └── PR2: Career Goals (user layer)                │   │
│  │        └── PR3: Assessment Logger                   │   │
│  │             └── PR4: Readiness Dashboard            │   │
│  │                  └── PR5: Prescription Integration  │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PR6-PR8: Team Features                               │   │
│  │                                                      │   │
│  │  PR6: Unit Readiness Config                         │   │
│  │   └── PR7: Member Opt-In Flow                       │   │
│  │        └── PR8: Team Dashboard                      │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PR9-PR12: Safety Features                            │   │
│  │                                                      │   │
│  │  PR9: Safe Zones                                    │   │
│  │   └── PR10: Lifeline                                │   │
│  │        └── PR11: Mayday                             │   │
│  │             └── PR12: Conditions Alert              │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                   │
│         ▼                                                   │
│  PR13+: Activity Recording, Offline Mode (Future)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## PR0: Foundation

**Branch:** `feat/foundation`

**Purpose:** Establish infrastructure for feature development.

### Files to Create/Modify

```
apps/api/src/
├── lib/
│   ├── feature-flags.ts           # Feature flag system
│   └── telemetry.ts               # Telemetry event helpers
├── db/migrations/
│   └── 040_foundation.ts          # Foundation migration
└── modules/
    └── feature-flags/
        └── index.ts               # Feature flag service

apps/mobile/src/
├── lib/
│   ├── feature-flags.ts           # Client-side flags
│   └── telemetry.ts               # Client telemetry
└── hooks/
    └── useFeatureFlag.ts          # React hook for flags
```

### Feature Flags to Create

```typescript
const FEATURE_FLAGS = {
  // Career Readiness
  'career.standards_library': false,
  'career.goals': false,
  'career.assessments': false,
  'career.readiness_dashboard': false,
  'career.prescription_integration': false,

  // Team Features
  'team.unit_readiness': false,
  'team.opt_in': false,
  'team.dashboard': false,

  // Safety Features
  'safety.safe_zones': false,
  'safety.lifeline': false,
  'safety.mayday': false,
  'safety.conditions_alert': false,

  // Activity Recording
  'activity.field_log': false,
  'activity.offline_mode': false,
};
```

### Telemetry Events Schema

```typescript
interface TelemetryEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  user_id: string | null;
  session_id: string;
  platform: 'web' | 'ios' | 'android';
  app_version: string;
}

// Example usage
telemetry.track('career.standard_viewed', {
  standard_id: 'cpat',
  category: 'firefighter'
});
```

### Migration 040

```sql
-- Feature flags table
CREATE TABLE feature_flags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0,
  user_overrides JSONB DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Telemetry events table (for debugging)
CREATE TABLE telemetry_events (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  event TEXT NOT NULL,
  properties JSONB,
  user_id TEXT,
  session_id TEXT,
  platform TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_telemetry_event ON telemetry_events(event);
CREATE INDEX idx_telemetry_user ON telemetry_events(user_id);
CREATE INDEX idx_telemetry_created ON telemetry_events(created_at);
```

### Done Means

- [ ] Feature flag service deployed
- [ ] All flags default to OFF
- [ ] Telemetry helper functions working
- [ ] Migration runs up and down successfully
- [ ] Client SDK can check flags

---

## PR1: Career Standards - Data Layer

**Branch:** `feat/career-standards-data`

**Depends on:** PR0

**Purpose:** Create database tables and seed career standards data.

### Files to Create

```
apps/api/src/
├── db/migrations/
│   └── 041_career_standards.ts    # Tables
├── db/seeds/
│   └── career-standards.ts        # Seed data
└── modules/career/
    ├── index.ts                   # Service
    ├── types.ts                   # TypeScript types
    └── standards-data.ts          # Standards definitions
```

### Migration 041

```sql
CREATE TABLE career_standards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  full_name TEXT,
  agency TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  official_url TEXT,
  passing_criteria JSONB NOT NULL,
  scoring_type TEXT NOT NULL,
  recertification_period_months INTEGER,
  icon TEXT,
  active BOOLEAN DEFAULT true,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_career_standards_category ON career_standards(category);

CREATE TABLE career_standard_events (
  id TEXT PRIMARY KEY,
  standard_id TEXT NOT NULL REFERENCES career_standards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  metric_type TEXT NOT NULL,
  metric_unit TEXT,
  direction TEXT NOT NULL,
  passing_threshold REAL,
  maximum_threshold REAL,
  scoring_table JSONB,
  equipment_required TEXT[],
  exercise_mappings TEXT[],
  tips TEXT[],
  video_url TEXT,
  order_index INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_events_standard ON career_standard_events(standard_id);
```

### Seed Data (10+ Standards)

```typescript
// apps/api/src/db/seeds/career-standards.ts
export const CAREER_STANDARDS = [
  {
    id: 'cpat',
    name: 'CPAT',
    full_name: 'Candidate Physical Ability Test',
    agency: 'Generic Fire Department',
    category: 'firefighter',
    // ... full definition
  },
  {
    id: 'acft',
    name: 'ACFT',
    // ...
  },
  // ... 8+ more standards
];
```

### Service Methods

```typescript
// apps/api/src/modules/career/index.ts
export const careerService = {
  // List all standards
  async listStandards(filters?: { category?: string }): Promise<CareerStandard[]>,

  // Get standard by ID
  async getStandard(id: string): Promise<CareerStandard | null>,

  // Get exercises for a standard
  async getExercisesForStandard(standardId: string): Promise<Exercise[]>,
};
```

### Done Means

- [ ] Tables created successfully
- [ ] 10+ standards seeded (CPAT, ACFT, PFT, etc.)
- [ ] Service methods working
- [ ] TypeScript types complete
- [ ] Unit tests passing

---

## PR2: Career Goals - User Layer

**Branch:** `feat/career-goals`

**Depends on:** PR1

**Purpose:** Allow users to set career goals.

### Files to Create/Modify

```
apps/api/src/
├── db/migrations/
│   └── 042_user_career_goals.ts
├── http/routes/
│   └── career.ts                  # API routes
└── modules/career/
    └── goals.ts                   # Goals service

apps/mobile/app/(tabs)/
└── career.tsx                     # Career tab

apps/mobile/src/components/
├── CareerGoalSelector.tsx
├── StandardCard.tsx
└── GoalCard.tsx
```

### Migration 042

```sql
CREATE TABLE user_career_goals (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  standard_id TEXT NOT NULL REFERENCES career_standards(id),
  target_date DATE,
  priority TEXT DEFAULT 'primary',
  status TEXT DEFAULT 'active',
  agency_name TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  achieved_at TEXT,
  UNIQUE(user_id, standard_id)
);

CREATE INDEX idx_career_goals_user ON user_career_goals(user_id);
CREATE INDEX idx_career_goals_status ON user_career_goals(status);
```

### API Routes

```typescript
// POST /api/v1/career/goals
// GET /api/v1/career/goals
// GET /api/v1/career/goals/:id
// PUT /api/v1/career/goals/:id
// DELETE /api/v1/career/goals/:id
```

### Done Means

- [ ] Users can browse standards by category
- [ ] Users can set a standard as their goal
- [ ] Users can set target date
- [ ] Mobile UI for goal selection complete
- [ ] API endpoints working

---

## PR3: Assessment Logger

**Branch:** `feat/assessment-logger`

**Depends on:** PR2

**Purpose:** Allow users to log practice test results.

### Files to Create/Modify

```
apps/api/src/
├── db/migrations/
│   └── 043_assessments.ts
└── modules/career/
    └── assessments.ts

apps/mobile/src/components/
├── AssessmentLogger.tsx
├── EventResultInput.tsx
└── AssessmentHistory.tsx
```

### Migration 043

```sql
CREATE TABLE user_standard_assessments (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  standard_id TEXT NOT NULL REFERENCES career_standards(id),
  assessed_at TEXT NOT NULL,
  assessment_type TEXT DEFAULT 'practice',
  location TEXT,
  results JSONB NOT NULL,
  overall_passed BOOLEAN,
  total_score REAL,
  readiness_score REAL,
  notes TEXT,
  verified BOOLEAN DEFAULT false,
  verified_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_assessments_user ON user_standard_assessments(user_id);
CREATE INDEX idx_assessments_standard ON user_standard_assessments(standard_id);
CREATE INDEX idx_assessments_date ON user_standard_assessments(assessed_at);
```

### API Routes

```typescript
// POST /api/v1/career/assessments
// GET /api/v1/career/assessments
// GET /api/v1/career/assessments/:id
```

### Done Means

- [ ] Users can log assessment results
- [ ] Per-event results captured
- [ ] Pass/fail auto-calculated
- [ ] Assessment history viewable
- [ ] Improvement from previous shown

---

## PR4: Readiness Dashboard

**Branch:** `feat/readiness-dashboard`

**Depends on:** PR3

**Purpose:** Show users their readiness score and breakdown.

### Files to Create/Modify

```
apps/api/src/
└── modules/career/
    └── readiness.ts               # Readiness calculation

apps/mobile/src/components/
├── ReadinessDashboard.tsx
├── ReadinessScore.tsx
├── EventBreakdown.tsx
└── ReadinessTrend.tsx
```

### Readiness Calculation

```typescript
// apps/api/src/modules/career/readiness.ts
export async function calculateReadiness(
  userId: string,
  standardId: string
): Promise<ReadinessResult> {
  const latestAssessment = await getLatestAssessment(userId, standardId);

  if (!latestAssessment) {
    return { score: null, status: 'no_data' };
  }

  const standard = await getStandard(standardId);
  const events = await getStandardEvents(standardId);

  let passedEvents = 0;
  const eventResults = [];

  for (const event of events) {
    const result = latestAssessment.results.events[event.id];
    const passed = evaluateEvent(event, result);

    if (passed) passedEvents++;

    eventResults.push({
      event_id: event.id,
      event_name: event.name,
      passed,
      result: result?.value,
      threshold: event.passing_threshold
    });
  }

  const score = (passedEvents / events.length) * 100;
  const status = score >= 100 ? 'ready' : score >= 70 ? 'at_risk' : 'not_ready';

  return {
    score,
    status,
    events_passed: passedEvents,
    events_total: events.length,
    event_results: eventResults,
    last_assessment: latestAssessment.assessed_at
  };
}
```

### API Routes

```typescript
// GET /api/v1/career/readiness
// GET /api/v1/career/readiness/:goalId
// GET /api/v1/career/readiness/:goalId/history
```

### Done Means

- [ ] Readiness score calculated correctly
- [ ] Per-event breakdown shown
- [ ] Trend over time displayed
- [ ] Weak events highlighted
- [ ] Mobile dashboard complete

---

## PR5: Prescription Integration

**Branch:** `feat/career-prescription`

**Depends on:** PR4

**Purpose:** Enhance prescription engine to target weak events.

### Files to Modify

```
apps/api/src/modules/prescription/
├── index.ts                       # Modify generator
└── career-integration.ts          # Career-aware logic
```

### Prescription Enhancement

```typescript
// Modify existing prescription generator
export async function generatePrescription(
  userId: string,
  constraints: PrescriptionConstraints
): Promise<Prescription> {
  // Existing constraint handling...

  // NEW: Check for active career goal
  if (constraints.career_goal_id) {
    const readiness = await calculateReadiness(userId, constraints.career_goal_id);
    const weakEvents = readiness.event_results.filter(e => !e.passed);

    // Get exercises that train weak events
    const targetExercises = await getExercisesForEvents(weakEvents.map(e => e.event_id));

    // Prioritize these exercises in generation
    constraints.prioritized_exercises = targetExercises;
  }

  // Continue with generation...
}
```

### API Changes

```typescript
// POST /api/v1/prescription/generate
// Add optional career_goal_id to request
Request: {
  duration_minutes: 45,
  location: 'gym',
  equipment: [...],
  career_goal_id: 'goal_123',    // NEW
  focus_weak_events: true         // NEW
}
```

### Done Means

- [ ] Prescription accepts career goal
- [ ] Weak events identified from readiness
- [ ] Exercises mapped to events
- [ ] Prescription prioritizes weak-event exercises
- [ ] User sees career context in prescription

---

## PR6: Unit Readiness - Configuration

**Branch:** `feat/unit-readiness-config`

**Depends on:** PR4

**Purpose:** Allow hangout admins to enable unit readiness.

### Files to Create/Modify

```
apps/api/src/
├── db/migrations/
│   └── 044_team_readiness.ts
├── http/routes/
│   └── team-readiness.ts
└── modules/career/
    └── team-readiness.ts

apps/mobile/src/components/
└── UnitReadinessSettings.tsx
```

### Migration 044

```sql
CREATE TABLE team_readiness_config (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  hangout_id TEXT NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  standard_id TEXT REFERENCES career_standards(id),
  require_opt_in BOOLEAN DEFAULT true,
  visible_to TEXT[] DEFAULT '{"admin"}',
  show_individual_scores BOOLEAN DEFAULT true,
  notification_on_below_threshold REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(hangout_id)
);

CREATE TABLE team_readiness_permissions (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  hangout_id TEXT NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL,
  standard_id TEXT REFERENCES career_standards(id),
  granted_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(hangout_id, user_id, permission_type)
);

CREATE INDEX idx_team_readiness_hangout ON team_readiness_permissions(hangout_id);
```

### API Routes

```typescript
// PUT /api/v1/hangouts/:hangoutId/team-readiness/config
// GET /api/v1/hangouts/:hangoutId/team-readiness/config
```

### Done Means

- [ ] Admins can enable unit readiness for hangout
- [ ] Standard selection works
- [ ] Privacy settings configurable
- [ ] Configuration persists

---

## PR7: Unit Readiness - Member Opt-In

**Branch:** `feat/unit-opt-in`

**Depends on:** PR6

**Purpose:** Allow members to opt-in to sharing readiness.

### Files to Create/Modify

```
apps/mobile/src/components/
├── OptInModal.tsx
├── SharingSettings.tsx
└── PrivacyControls.tsx
```

### API Routes

```typescript
// POST /api/v1/hangouts/:hangoutId/team-readiness/opt-in
// DELETE /api/v1/hangouts/:hangoutId/team-readiness/opt-in
// GET /api/v1/hangouts/:hangoutId/team-readiness/my-sharing
```

### Done Means

- [ ] Members receive opt-in prompt
- [ ] Granular sharing controls work
- [ ] Opt-out removes from team view
- [ ] Privacy settings respect opt-in status

---

## PR8: Unit Readiness - Team Dashboard

**Branch:** `feat/unit-dashboard`

**Depends on:** PR7

**Purpose:** Show supervisors team readiness overview.

### Files to Create/Modify

```
apps/api/src/modules/career/
└── team-dashboard.ts

apps/mobile/src/components/
├── TeamReadinessDashboard.tsx
├── MemberReadinessCard.tsx
├── TeamWeakAreas.tsx
└── TeamTrendChart.tsx
```

### API Routes

```typescript
// GET /api/v1/hangouts/:hangoutId/team-readiness
// GET /api/v1/hangouts/:hangoutId/team-readiness/history
// GET /api/v1/hangouts/:hangoutId/team-readiness/export
```

### Done Means

- [ ] Supervisors see team overview
- [ ] Individual member scores shown (if opted-in)
- [ ] Aggregate statistics calculated
- [ ] Weak areas identified
- [ ] PDF export functional

---

## PR9: Safe Zones

**Branch:** `feat/safe-zones`

**Depends on:** PR0

**Purpose:** Allow users to define private location zones.

### Files to Create/Modify

```
apps/api/src/
├── db/migrations/
│   └── 045_safe_zones.ts
├── http/routes/
│   └── safety.ts
└── modules/safety/
    ├── index.ts
    └── safe-zones.ts

apps/mobile/src/components/
├── SafeZoneManager.tsx
├── SafeZoneMap.tsx
└── SafeZoneSuggestions.tsx
```

### Migration 045

```sql
CREATE TABLE safe_zones (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  center_lat REAL NOT NULL,
  center_lng REAL NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 500,
  type TEXT DEFAULT 'manual',
  obscure_to TEXT DEFAULT 'city',
  active BOOLEAN DEFAULT true,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_safe_zones_user ON safe_zones(user_id);
```

### Done Means

- [ ] Users can create safe zones
- [ ] Auto-suggestion of frequent locations
- [ ] Location obscuring logic works
- [ ] Zone management UI complete

---

## PR10: Lifeline

**Branch:** `feat/lifeline`

**Depends on:** PR9

**Purpose:** Real-time location sharing with trusted contacts.

### Files to Create/Modify

```
apps/api/src/
├── db/migrations/
│   └── 046_lifeline.ts
└── modules/safety/
    ├── lifeline.ts
    └── contacts.ts

apps/mobile/src/components/
├── LifelineStart.tsx
├── LifelineActive.tsx
├── ContactManager.tsx
└── LifelineMap.tsx
```

### Migration 046

```sql
CREATE TABLE lifeline_contacts (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  contact_name TEXT,
  relationship TEXT,
  notify_on_start BOOLEAN DEFAULT true,
  notify_on_end BOOLEAN DEFAULT true,
  notify_on_emergency BOOLEAN DEFAULT true,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, contact_type, contact_value)
);

CREATE TABLE lifeline_sessions (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id TEXT,
  started_at TEXT NOT NULL,
  expected_end_at TEXT,
  ended_at TEXT,
  status TEXT DEFAULT 'active',
  last_location JSONB,
  last_updated_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_lifeline_user ON lifeline_sessions(user_id);
CREATE INDEX idx_lifeline_status ON lifeline_sessions(status);
```

### Done Means

- [ ] Contacts can be added/managed
- [ ] Lifeline can be started/ended
- [ ] Location updates stream to contacts
- [ ] Notifications sent at start/end
- [ ] Contact view shows live map

---

## PR11: Mayday

**Branch:** `feat/mayday`

**Depends on:** PR10

**Purpose:** Emergency alert system.

### Files to Create/Modify

```
apps/api/src/
├── db/migrations/
│   └── 047_mayday.ts
└── modules/safety/
    └── mayday.ts

apps/mobile/src/components/
├── MaydayButton.tsx
├── MaydayCancel.tsx
└── MaydaySettings.tsx
```

### Migration 047

```sql
CREATE TABLE mayday_alerts (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lifeline_session_id TEXT REFERENCES lifeline_sessions(id),
  triggered_at TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  location JSONB NOT NULL,
  status TEXT DEFAULT 'active',
  cancelled_at TEXT,
  acknowledged_at TEXT,
  acknowledged_by TEXT,
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE mayday_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  auto_detect_no_movement BOOLEAN DEFAULT false,
  no_movement_threshold_minutes INTEGER DEFAULT 15,
  include_emergency_services BOOLEAN DEFAULT false,
  crew_hangout_id TEXT REFERENCES hangouts(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### Done Means

- [ ] Mayday can be triggered manually
- [ ] 30-second cancel window works
- [ ] Alerts sent to all contacts
- [ ] Acknowledgment flow works
- [ ] Auto-detection configurable

---

## PR12: Conditions Alert

**Branch:** `feat/conditions-alert`

**Depends on:** PR0

**Purpose:** Weather and PPE-aware safety warnings.

### Files to Create/Modify

```
apps/api/src/
├── db/migrations/
│   └── 048_conditions.ts
├── lib/
│   └── weather-api.ts
└── modules/safety/
    └── conditions.ts

apps/mobile/src/components/
├── ConditionsAlert.tsx
├── PPEProfile.tsx
└── HeatIndexDisplay.tsx
```

### Done Means

- [ ] Weather API integration working
- [ ] Heat index calculation accurate
- [ ] PPE profile adjusts calculations
- [ ] Alerts shown before/during activities
- [ ] User can respond to alerts

---

## Future PRs (Not Sequenced)

### PR13+: Activity Recording

- Field Log data model
- GPS recording
- Activity types
- Activity feed

### PR14+: Offline Mode

- Local database
- Sync engine
- Conflict resolution
- Offline UI

### PR15+: Device Integrations

- Garmin Connect API
- Apple HealthKit
- Google Fit

---

## Testing Strategy

### Unit Tests

Each PR should include:
- Service method tests
- API route tests
- Calculation tests (readiness, heat index, etc.)

### Integration Tests

- Full flow tests (create goal → log assessment → check readiness)
- Team readiness with opt-in flow
- Lifeline → Mayday flow

### E2E Tests (Playwright)

- Critical user journeys
- Career goal selection flow
- Assessment logging flow
- Team dashboard access

---

## Deployment Checklist

### Per-PR Deployment

1. [ ] Feature flag set to OFF
2. [ ] Migration tested (up and down)
3. [ ] API routes tested with curl/Postman
4. [ ] Mobile build successful
5. [ ] Unit tests passing
6. [ ] Code review approved
7. [ ] Merge to main
8. [ ] Deploy to staging
9. [ ] Smoke test on staging
10. [ ] Deploy to production
11. [ ] Verify production health
12. [ ] Enable feature flag for beta users
13. [ ] Monitor telemetry
14. [ ] Gradual rollout
15. [ ] Full rollout

### Production Rollout Phases

| Phase | Audience | Duration |
|-------|----------|----------|
| 1 | Internal team | 2 days |
| 2 | Beta users (10%) | 3 days |
| 3 | Early adopters (25%) | 5 days |
| 4 | General availability (100%) | - |

---

## Risk Mitigation

### Data Migration Risks

| Risk | Mitigation |
|------|------------|
| Migration fails | Test on production clone first |
| Data loss | Full backup before migration |
| Schema conflicts | Use reversible migrations |

### Performance Risks

| Risk | Mitigation |
|------|------------|
| Slow readiness calculation | Cache computed values |
| Large team dashboards | Paginate member lists |
| GPS data volume | Store routes separately |

### Security Risks

| Risk | Mitigation |
|------|------------|
| Location data exposure | Safe Zones, delayed posting |
| Team data privacy | Opt-in required, granular controls |
| Emergency alert abuse | 30-second cancel, rate limiting |

---

## Success Metrics

### MVP (Career Readiness)

| Metric | Target |
|--------|--------|
| Standards viewed | 100/week |
| Career goals set | 50 users |
| Assessments logged | 200 total |
| Prescriptions with career goal | 25% of all |

### Team Features

| Metric | Target |
|--------|--------|
| Hangouts with unit readiness | 10 |
| Member opt-in rate | 80% |
| Team dashboards viewed | 50/week |

### Safety Features

| Metric | Target |
|--------|--------|
| Safe zones created | 500 |
| Lifeline sessions | 100 |
| Mayday alerts (false positives) | <5% |

---

*End of Implementation Plan*
