# Feature: Unit Readiness Dashboard

*Specification v1.0 - January 8, 2026*

## Overview

**Original concept name:** "Unit Readiness"

**User value:** Supervisors can see their team's physical fitness status at a glance, ensuring operational readiness.

**MuscleMap advantage:** No fitness app provides team-level readiness dashboards. This feature unlocks enterprise/department sales.

**Target users:**
- Fire captains monitoring crew fitness
- Military NCOs tracking squad readiness
- SWAT team leaders ensuring team preparedness
- Gym owners with member fitness goals
- Personal trainers with client groups

---

## User Stories

### Supervisor/Commander
- As a fire captain, I want to see which of my crew members are CPAT-ready so that I can ensure operational safety.
- As a platoon sergeant, I want to identify weak areas across my unit so that I can plan group PT.
- As a SWAT commander, I want monthly fitness reports for my team so that I can maintain readiness standards.

### Team Member
- As a firefighter, I want to share my readiness with my captain so that they know I'm fit for duty.
- As a soldier, I want to control what fitness data my leadership sees so that I maintain privacy.
- As a gym member, I want to contribute to my gym's collective challenge so that we compete as a team.

---

## Data Model

### team_readiness_config

Hangout-level configuration for team readiness features.

```sql
CREATE TABLE team_readiness_config (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  hangout_id TEXT NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  standard_id TEXT REFERENCES career_standards(id),  -- Optional: specific standard
  require_opt_in BOOLEAN DEFAULT true,               -- Members must opt-in
  visible_to TEXT[] DEFAULT '{"admin"}',             -- Roles that can see dashboard
  show_individual_scores BOOLEAN DEFAULT true,       -- Show per-member scores
  show_aggregate_only BOOLEAN DEFAULT false,         -- Only show team average
  notification_on_below_threshold REAL,              -- Alert if member drops below %
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  UNIQUE(hangout_id)
);
```

### team_member_readiness

Cached/computed readiness for faster dashboard queries.

```sql
CREATE TABLE team_member_readiness (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  hangout_id TEXT NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  standard_id TEXT REFERENCES career_standards(id),
  readiness_score REAL,                              -- 0-100%
  status TEXT,                                        -- "ready", "at_risk", "not_ready"
  last_assessment_at TEXT,
  weak_events TEXT[],                                -- Events user is failing
  computed_at TEXT DEFAULT (datetime('now')),

  UNIQUE(hangout_id, user_id, standard_id)
);

CREATE INDEX idx_team_readiness_hangout ON team_member_readiness(hangout_id);
CREATE INDEX idx_team_readiness_status ON team_member_readiness(status);
```

### team_readiness_snapshots

Historical snapshots for trend tracking.

```sql
CREATE TABLE team_readiness_snapshots (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  hangout_id TEXT NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
  standard_id TEXT REFERENCES career_standards(id),
  snapshot_date DATE NOT NULL,
  members_total INTEGER NOT NULL,
  members_opted_in INTEGER NOT NULL,
  members_ready INTEGER NOT NULL,
  members_at_risk INTEGER NOT NULL,
  members_not_ready INTEGER NOT NULL,
  average_readiness REAL,
  weak_events JSONB,                                 -- Aggregate weak areas
  created_at TEXT DEFAULT (datetime('now')),

  UNIQUE(hangout_id, standard_id, snapshot_date)
);

CREATE INDEX idx_snapshots_hangout ON team_readiness_snapshots(hangout_id);
```

---

## API Endpoints

### Configuration

```typescript
// PUT /api/v1/hangouts/:hangoutId/team-readiness/config
// (Admin only) Configure team readiness
Request: {
  "enabled": true,
  "standard_id": "cpat",
  "require_opt_in": true,
  "visible_to": ["admin", "moderator"],
  "show_individual_scores": true,
  "notification_on_below_threshold": 70.0
}

// GET /api/v1/hangouts/:hangoutId/team-readiness/config
// Get current configuration
```

### Member Opt-In

```typescript
// POST /api/v1/hangouts/:hangoutId/team-readiness/opt-in
// Member opts in to share readiness
Request: {
  "standard_id": "cpat",  // Optional: specific standard
  "share_scores": true,
  "share_assessments": false,
  "share_weak_events": true
}

// DELETE /api/v1/hangouts/:hangoutId/team-readiness/opt-in
// Member revokes consent

// GET /api/v1/hangouts/:hangoutId/team-readiness/my-sharing
// Member checks their sharing settings
```

### Dashboard

```typescript
// GET /api/v1/hangouts/:hangoutId/team-readiness
// (Supervisor only) Get team readiness overview
Response: {
  "hangout": {
    "id": "hangout_123",
    "name": "Station 5"
  },
  "standard": {
    "id": "cpat",
    "name": "CPAT"
  },
  "aggregate": {
    "members_total": 8,
    "members_opted_in": 7,
    "members_ready": 5,
    "members_at_risk": 1,
    "members_not_ready": 1,
    "average_readiness": 78.2,
    "trend": "improving",  // vs last month
    "trend_delta": +4.5
  },
  "members": [
    {
      "user_id": "user_123",
      "display_name": "J. Smith",
      "readiness_score": 92.0,
      "status": "ready",
      "last_assessment_at": "2026-01-05",
      "weak_events": [],
      "sharing": {
        "scores": true,
        "assessments": false,
        "weak_events": true
      }
    },
    {
      "user_id": "user_456",
      "display_name": "P. Wilson",
      "readiness_score": 45.0,
      "status": "not_ready",
      "last_assessment_at": "2025-11-30",
      "weak_events": ["cpat-stair-climb", "cpat-ladder-raise"],
      "sharing": {...}
    }
  ],
  "weak_areas": [
    {
      "event_id": "cpat-ladder-raise",
      "event_name": "Ladder Raise",
      "members_struggling": 3,
      "member_ids": ["user_456", "user_789", "user_012"]
    }
  ],
  "stale_assessments": [
    {
      "user_id": "user_456",
      "display_name": "P. Wilson",
      "days_since_assessment": 39
    }
  ]
}

// GET /api/v1/hangouts/:hangoutId/team-readiness/history
// Get historical trend data
Query: ?start_date=2025-07-01&end_date=2026-01-08
Response: {
  "snapshots": [
    {
      "date": "2025-07-01",
      "average_readiness": 65.0,
      "members_ready": 3,
      "members_total": 8
    },
    ...
  ]
}
```

### Exports

```typescript
// GET /api/v1/hangouts/:hangoutId/team-readiness/export
// Export team readiness report
Query: ?format=pdf&include_individual=true
Response: Binary PDF or JSON

// POST /api/v1/hangouts/:hangoutId/team-readiness/schedule-report
// Schedule recurring reports
Request: {
  "frequency": "monthly",
  "day_of_month": 1,
  "recipients": ["captain@fire.gov"],
  "format": "pdf",
  "include_individual": true
}
```

---

## Privacy Architecture

### Opt-In Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    Member Opt-In Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Admin enables Unit Readiness for hangout               │
│                      │                                      │
│                      ▼                                      │
│  2. Members receive notification:                          │
│     "Station 5 has enabled Unit Readiness tracking.        │
│      Your fitness data is NOT shared by default.           │
│      Would you like to share your readiness?"              │
│                      │                                      │
│         ┌───────────┴───────────┐                          │
│         ▼                       ▼                          │
│     [Opt In]              [Decline]                        │
│         │                       │                          │
│         ▼                       ▼                          │
│  3. Member chooses          Data remains                   │
│     granular sharing:       private                        │
│     - Readiness %                                          │
│     - Assessment dates                                     │
│     - Weak events                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Visibility Matrix

| Data Type | Member View | Supervisor View | Export |
|-----------|-------------|-----------------|--------|
| Own readiness % | Always | If opted-in | Yes |
| Other members' % | Never | If they opted-in | Yes |
| Assessment details | Own only | Never | No |
| Weak events | Own only | If opted-in | If opted-in |
| Team aggregate | Yes | Yes | Yes |

### Revocation

- Members can revoke consent at any time
- Revocation is immediate (next page load)
- Historical snapshots retain aggregate data only
- Individual data removed from team views

---

## UI Screens

### Screen 1: Team Readiness Dashboard (Supervisor)

```
┌────────────────────────────────────────────────────────────┐
│ Station 5 - Unit Readiness                       📊 Export │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  CPAT Readiness        Trend (6 months)                    │
│  ┌────────────┐        ┌──────────────────────────────┐   │
│  │            │        │     ╱╲                       │   │
│  │    78%     │        │   ╱    ╲___╱────            │   │
│  │   Ready    │        │ ╱                            │   │
│  │            │        │                              │   │
│  │ 5/8 Pass   │        │ Jul Aug Sep Oct Nov Dec Jan │   │
│  └────────────┘        └──────────────────────────────┘   │
│                                                            │
│ ─────────────────────────────────────────────────────────  │
│                                                            │
│  Team Members                              Sort: Readiness │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ✅ J. Smith          92%  │  Jan 5   │ Ready       │  │
│  │ ✅ M. Johnson        89%  │  Jan 3   │ Ready       │  │
│  │ ✅ R. Williams       85%  │  Dec 28  │ Ready       │  │
│  │ ✅ K. Davis          82%  │  Jan 7   │ Ready       │  │
│  │ ✅ T. Brown          80%  │  Jan 2   │ Ready       │  │
│  │ ⚠️ A. Martinez       68%  │  Dec 15  │ At Risk    │  │
│  │    Weak: Ladder Raise, Ceiling Breach               │  │
│  │ ❌ P. Wilson         45%  │  Nov 30  │ Not Ready  │  │
│  │    Weak: Stair Climb, Ladder Raise, Rescue Drag     │  │
│  │ 🔒 C. Garcia         --   │  --      │ Not Shared │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│ ─────────────────────────────────────────────────────────  │
│                                                            │
│  Unit Weak Areas                                           │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Ladder Raise           ████████░░░░  3 members     │  │
│  │ Ceiling Breach         ████░░░░░░░░  2 members     │  │
│  │ Stair Climb            ██░░░░░░░░░░  1 member      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │          Schedule Group Training Session            │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Screen 2: Member Opt-In Modal

```
┌────────────────────────────────────────────────────────────┐
│ Share Your Readiness with Station 5                     ✕  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Captain Rodriguez has enabled Unit Readiness tracking     │
│  for your station. This helps ensure team safety.          │
│                                                            │
│  Your data is private by default. Choose what to share:    │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ☑️ Share my readiness percentage                     │  │
│  │    Your captain will see: "J. Smith - 92% Ready"    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ☑️ Share my weak events                              │  │
│  │    Helps identify group training needs              │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ☐ Share my assessment dates                         │  │
│  │    Shows when you last practiced                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  You can change these settings anytime in Privacy.         │
│                                                            │
│  ┌────────────────────┐  ┌────────────────────┐           │
│  │   Share Selected   │  │   Keep Private     │           │
│  └────────────────────┘  └────────────────────┘           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Screen 3: Admin Configuration

```
┌────────────────────────────────────────────────────────────┐
│ Unit Readiness Settings                                 ✕  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Enable Unit Readiness                                     │
│  [═══════════════════════════════○] ON                    │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Standard to Track                                         │
│  [CPAT - Firefighter Standard              ▼]             │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Privacy Settings                                          │
│                                                            │
│  ☑️ Require member opt-in (recommended)                    │
│  ☐ Show individual scores (vs. aggregate only)            │
│  ☑️ Alert me when member drops below: [70]%               │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Who Can View Dashboard                                    │
│  ☑️ Hangout Admins                                         │
│  ☐ Hangout Moderators                                      │
│  ☐ All Members (aggregate only)                           │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Scheduled Reports                                         │
│  ☑️ Send monthly report to:                                │
│     [captain@chicagofire.gov                   ]          │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │                  Save Settings                      │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Notifications

### For Members

| Trigger | Notification |
|---------|--------------|
| Readiness enabled | "Station 5 has enabled Unit Readiness. Share your fitness data?" |
| Readiness below threshold | "Your CPAT readiness dropped to 65%. Need help getting back on track?" |
| Stale assessment | "It's been 30 days since your last CPAT practice. Log an assessment?" |

### For Supervisors

| Trigger | Notification |
|---------|--------------|
| Member drops below threshold | "P. Wilson's CPAT readiness dropped to 45%." |
| New opt-in | "A. Martinez has shared their readiness with Station 5." |
| Opt-out | "C. Garcia has stopped sharing readiness data." |
| Monthly report ready | "January Unit Readiness Report is ready for Station 5." |

---

## Background Jobs

### Daily: Compute Readiness

```typescript
// Run daily at 2 AM
async function computeTeamReadiness() {
  // For each hangout with unit readiness enabled
  const hangouts = await getHangoutsWithReadinessEnabled();

  for (const hangout of hangouts) {
    // For each opted-in member
    const members = await getOptedInMembers(hangout.id);

    for (const member of members) {
      // Get latest assessment
      const assessment = await getLatestAssessment(member.user_id, hangout.standard_id);

      if (assessment) {
        // Compute readiness score
        const readiness = computeReadinessScore(assessment);

        // Update cached readiness
        await upsertTeamMemberReadiness({
          hangout_id: hangout.id,
          user_id: member.user_id,
          standard_id: hangout.standard_id,
          readiness_score: readiness.score,
          status: readiness.status,
          weak_events: readiness.weakEvents,
          last_assessment_at: assessment.assessed_at
        });

        // Check for threshold alerts
        if (readiness.score < hangout.notification_threshold) {
          await notifySupervisor(hangout, member, readiness);
        }
      }
    }
  }
}
```

### Weekly: Snapshot Readiness

```typescript
// Run weekly on Sunday at midnight
async function snapshotTeamReadiness() {
  const hangouts = await getHangoutsWithReadinessEnabled();

  for (const hangout of hangouts) {
    const members = await getTeamMemberReadiness(hangout.id);

    const snapshot = {
      hangout_id: hangout.id,
      standard_id: hangout.standard_id,
      snapshot_date: new Date().toISOString().split('T')[0],
      members_total: members.total,
      members_opted_in: members.optedIn,
      members_ready: members.ready,
      members_at_risk: members.atRisk,
      members_not_ready: members.notReady,
      average_readiness: members.average,
      weak_events: members.weakEvents
    };

    await insertSnapshot(snapshot);
  }
}
```

### Monthly: Generate Reports

```typescript
// Run monthly on 1st at 6 AM
async function generateMonthlyReports() {
  const schedules = await getScheduledReports('monthly');

  for (const schedule of schedules) {
    const report = await generateReadinessReport(schedule.hangout_id, {
      period: 'month',
      includeIndividual: schedule.include_individual
    });

    await sendReportEmail(schedule.recipients, report);
  }
}
```

---

## Export Formats

### PDF Report

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                    UNIT READINESS REPORT                   │
│                       Station 5                            │
│                    January 2026                            │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  EXECUTIVE SUMMARY                                         │
│  ─────────────────                                         │
│  Standard: CPAT (Candidate Physical Ability Test)          │
│  Period: January 1-31, 2026                                │
│                                                            │
│  Team Readiness: 78.2%                                     │
│  Members Ready: 5 of 8 (62.5%)                             │
│  Trend: Improving (+4.5% from December)                    │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  INDIVIDUAL STATUS                                         │
│  ─────────────────                                         │
│                                                            │
│  Name          Readiness   Status      Last Assessment     │
│  ──────────────────────────────────────────────────────    │
│  J. Smith         92%      Ready       Jan 5, 2026         │
│  M. Johnson       89%      Ready       Jan 3, 2026         │
│  R. Williams      85%      Ready       Dec 28, 2025        │
│  K. Davis         82%      Ready       Jan 7, 2026         │
│  T. Brown         80%      Ready       Jan 2, 2026         │
│  A. Martinez      68%      At Risk     Dec 15, 2025        │
│  P. Wilson        45%      Not Ready   Nov 30, 2025        │
│  C. Garcia        --       Not Shared  --                  │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  AREAS FOR IMPROVEMENT                                     │
│  ─────────────────────                                     │
│                                                            │
│  1. Ladder Raise & Extension - 3 members struggling        │
│     Recommended: Group ladder drills, pull-up training     │
│                                                            │
│  2. Ceiling Breach & Pull - 2 members struggling           │
│     Recommended: Overhead press circuits                   │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  RECOMMENDATIONS                                           │
│  ─────────────────                                         │
│                                                            │
│  • Schedule group PT focusing on ladder/overhead work      │
│  • P. Wilson requires immediate remediation plan           │
│  • A. Martinez approaching at-risk threshold               │
│  • Request assessment from C. Garcia                       │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Generated by MuscleMap                                    │
│  https://musclemap.me                                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### CSV Export

```csv
User ID,Display Name,Readiness %,Status,Last Assessment,Weak Events
user_123,J. Smith,92.0,ready,2026-01-05,""
user_456,M. Johnson,89.0,ready,2026-01-03,""
user_789,P. Wilson,45.0,not_ready,2025-11-30,"cpat-stair-climb,cpat-ladder-raise,cpat-rescue-drag"
```

---

## Telemetry Events

| Event | Description | Properties |
|-------|-------------|------------|
| `unit_readiness.enabled` | Admin enabled feature | hangout_id, standard_id |
| `unit_readiness.disabled` | Admin disabled feature | hangout_id |
| `unit_readiness.member_opted_in` | Member opted in | hangout_id, user_id, sharing |
| `unit_readiness.member_opted_out` | Member opted out | hangout_id, user_id |
| `unit_readiness.dashboard_viewed` | Supervisor viewed dashboard | hangout_id, viewer_id |
| `unit_readiness.report_generated` | Report exported | hangout_id, format |
| `unit_readiness.alert_sent` | Threshold alert sent | hangout_id, user_id, readiness |

---

## Success Criteria

### Launch
- [ ] Opt-in/opt-out flow complete
- [ ] Dashboard shows team readiness
- [ ] Aggregate and individual views working
- [ ] PDF export functional

### Phase 2
- [ ] 10+ hangouts using Unit Readiness
- [ ] 80%+ opt-in rate among members
- [ ] Monthly report scheduling working
- [ ] Historical trend charts

### Phase 3
- [ ] Department-level aggregation (multiple hangouts)
- [ ] Benchmark against department averages
- [ ] Integration with HR/personnel systems

---

*End of Unit Readiness Specification*
