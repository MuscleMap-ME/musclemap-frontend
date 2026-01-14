# Feature: Enterprise Organizations & Multi-Tenant Architecture

*Specification v1.0 - January 14, 2026*

## Overview

**User value:** Departments, agencies, and companies can manage their entire workforce's fitness readiness from a single dashboard with hierarchical organization support.

**MuscleMap advantage:** No competitor offers true multi-tenant organization management with privacy-preserving team readiness at scale.

**Target customers:**
- Fire departments (stations → shifts → crews)
- Police departments (precincts → units → squads)
- Military units (battalions → companies → platoons → squads)
- Corrections facilities (facilities → units → shifts)
- EMS agencies (stations → shifts → units)
- Private companies (divisions → teams)

---

## Data Model

### organizations

Top-level organization entity.

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  name TEXT NOT NULL,                    -- "Chicago Fire Department"
  slug TEXT UNIQUE NOT NULL,             -- "chicago-fire-dept"
  type TEXT NOT NULL,                    -- "fire_department", "police_department", etc.
  logo_url TEXT,
  website TEXT,

  -- Location
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'US',
  timezone TEXT DEFAULT 'America/Chicago',

  -- Contact
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,

  -- Settings
  settings JSONB DEFAULT '{}',           -- See OrganizationSettings

  -- Subscription
  subscription_tier TEXT DEFAULT 'trial', -- "trial", "team", "enterprise", "government"
  subscription_status TEXT DEFAULT 'active',
  subscription_seats INTEGER,
  subscription_expires_at TEXT,

  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id)
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_subscription ON organizations(subscription_tier, subscription_status);
```

**OrganizationSettings:**
```typescript
interface OrganizationSettings {
  // Career readiness
  required_standards: string[];          // ["cpat", "emt-basic"]
  compliance_threshold: number;          // 80 (percent)
  recert_grace_period_days: number;      // 30
  stale_assessment_days: number;         // 90

  // Privacy
  require_member_opt_in: boolean;        // true
  allow_individual_scores: boolean;      // true
  allow_weak_event_sharing: boolean;     // true

  // Notifications
  notify_on_below_threshold: boolean;    // true
  notify_on_recert_due: boolean;         // true
  notify_supervisors_weekly: boolean;    // false

  // Features
  enable_benchmarking: boolean;          // false (compare to other orgs)
  enable_ai_recommendations: boolean;    // true
  enable_prescription_assignment: boolean; // true

  // SSO
  sso_enabled: boolean;                  // false
  sso_provider: string | null;           // "okta", "azure_ad"
  sso_config: SSOConfig | null;

  // Branding
  custom_logo: boolean;                  // false
  primary_color: string;                 // "#0066FF"
  secondary_color: string;               // "#1a1a1a"
}
```

---

### organization_units

Hierarchical units within an organization.

```sql
CREATE TABLE organization_units (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_unit_id TEXT REFERENCES organization_units(id) ON DELETE SET NULL,

  name TEXT NOT NULL,                    -- "Station 5"
  code TEXT,                             -- "STA-005"
  type TEXT NOT NULL,                    -- "station", "precinct", "platoon", etc.

  -- Location (optional, for stations/precincts)
  address_line1 TEXT,
  city TEXT,
  state TEXT,

  -- Hierarchy
  level INTEGER DEFAULT 1,               -- Depth in hierarchy (1 = top)
  path TEXT,                             -- Materialized path: "org/division/station"

  -- Settings (overrides org settings)
  settings JSONB DEFAULT '{}',

  -- Metadata
  active BOOLEAN DEFAULT true,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_units_org ON organization_units(org_id);
CREATE INDEX idx_units_parent ON organization_units(parent_unit_id);
CREATE INDEX idx_units_path ON organization_units(path);
CREATE INDEX idx_units_type ON organization_units(type);
```

**Unit Types by Organization Type:**

| Org Type | Level 1 | Level 2 | Level 3 | Level 4 |
|----------|---------|---------|---------|---------|
| fire_department | division | station | shift | crew |
| police_department | bureau | precinct | unit | squad |
| military | battalion | company | platoon | squad |
| corrections | region | facility | unit | shift |
| ems_agency | region | station | shift | unit |
| company | division | department | team | - |

---

### organization_members

User membership in organizations.

```sql
CREATE TABLE organization_members (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id TEXT REFERENCES organization_units(id) ON DELETE SET NULL,

  -- Role
  role TEXT NOT NULL DEFAULT 'member',   -- "member", "supervisor", "admin", "owner"
  permissions TEXT[] DEFAULT '{}',       -- Additional permissions

  -- Employment details (optional)
  badge_number TEXT,
  employee_id TEXT,
  rank TEXT,                             -- "Captain", "Sergeant", etc.
  title TEXT,                            -- "Firefighter", "Officer", etc.
  hire_date DATE,

  -- Readiness sharing
  share_readiness BOOLEAN DEFAULT false,
  share_assessments BOOLEAN DEFAULT false,
  share_weak_events BOOLEAN DEFAULT false,
  opted_in_at TEXT,                      -- When user opted in

  -- Status
  status TEXT DEFAULT 'active',          -- "active", "inactive", "on_leave"

  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  invited_by TEXT REFERENCES users(id),

  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_members_org ON organization_members(org_id);
CREATE INDEX idx_members_user ON organization_members(user_id);
CREATE INDEX idx_members_unit ON organization_members(unit_id);
CREATE INDEX idx_members_role ON organization_members(role);
CREATE INDEX idx_members_status ON organization_members(status);
```

**Roles & Permissions:**

| Role | View Own | View Team | Manage Team | Manage Units | Manage Org |
|------|----------|-----------|-------------|--------------|------------|
| member | ✓ | - | - | - | - |
| supervisor | ✓ | ✓ | ✓ | - | - |
| admin | ✓ | ✓ | ✓ | ✓ | - |
| owner | ✓ | ✓ | ✓ | ✓ | ✓ |

---

### organization_invites

Pending invitations to join an organization.

```sql
CREATE TABLE organization_invites (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  unit_id TEXT REFERENCES organization_units(id),

  -- Invite details
  token TEXT UNIQUE NOT NULL,            -- Secure invite token
  message TEXT,                          -- Custom invite message

  -- Status
  status TEXT DEFAULT 'pending',         -- "pending", "accepted", "expired", "revoked"
  expires_at TEXT NOT NULL,              -- Default 7 days

  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  accepted_at TEXT,
  invited_by TEXT NOT NULL REFERENCES users(id),
  accepted_by TEXT REFERENCES users(id)
);

CREATE INDEX idx_invites_org ON organization_invites(org_id);
CREATE INDEX idx_invites_email ON organization_invites(email);
CREATE INDEX idx_invites_token ON organization_invites(token);
CREATE INDEX idx_invites_status ON organization_invites(status);
```

---

### organization_readiness_cache

Cached readiness data for fast dashboard queries.

```sql
CREATE TABLE organization_readiness_cache (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id TEXT REFERENCES organization_units(id) ON DELETE CASCADE,
  standard_id TEXT NOT NULL REFERENCES career_standards(id),

  -- Aggregate metrics
  total_members INTEGER NOT NULL,
  members_opted_in INTEGER NOT NULL,
  members_with_goal INTEGER NOT NULL,
  members_assessed INTEGER NOT NULL,

  -- Readiness breakdown
  members_ready INTEGER NOT NULL,        -- >= compliance threshold
  members_at_risk INTEGER NOT NULL,      -- 70-threshold
  members_not_ready INTEGER NOT NULL,    -- < 70%

  -- Scores
  average_readiness REAL,
  median_readiness REAL,
  min_readiness REAL,
  max_readiness REAL,

  -- Weak areas
  weak_events JSONB,                     -- [{event_id, count, pct}]

  -- Compliance
  compliance_rate REAL,
  overdue_recerts INTEGER,
  stale_assessments INTEGER,             -- > X days since assessment

  -- Trend
  trend_direction TEXT,                  -- "improving", "stable", "declining"
  trend_delta REAL,                      -- Change from last period

  -- Metadata
  computed_at TEXT DEFAULT (datetime('now')),

  UNIQUE(org_id, unit_id, standard_id)
);

CREATE INDEX idx_org_readiness_org ON organization_readiness_cache(org_id);
CREATE INDEX idx_org_readiness_unit ON organization_readiness_cache(unit_id);
CREATE INDEX idx_org_readiness_computed ON organization_readiness_cache(computed_at);
```

---

### organization_readiness_snapshots

Historical snapshots for trend analysis.

```sql
CREATE TABLE organization_readiness_snapshots (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id TEXT REFERENCES organization_units(id) ON DELETE CASCADE,
  standard_id TEXT NOT NULL REFERENCES career_standards(id),

  snapshot_date DATE NOT NULL,
  snapshot_type TEXT DEFAULT 'weekly',   -- "daily", "weekly", "monthly"

  -- Metrics (same as cache)
  total_members INTEGER NOT NULL,
  members_opted_in INTEGER NOT NULL,
  members_ready INTEGER NOT NULL,
  members_at_risk INTEGER NOT NULL,
  members_not_ready INTEGER NOT NULL,
  average_readiness REAL,
  compliance_rate REAL,

  -- Full data (for detailed historical analysis)
  full_data JSONB,                       -- All member scores (anonymized IDs)

  created_at TEXT DEFAULT (datetime('now')),

  UNIQUE(org_id, unit_id, standard_id, snapshot_date, snapshot_type)
);

CREATE INDEX idx_snapshots_org ON organization_readiness_snapshots(org_id);
CREATE INDEX idx_snapshots_date ON organization_readiness_snapshots(snapshot_date);

-- Partition by month for performance
-- (PostgreSQL 10+ partitioning syntax)
```

---

### organization_sso_configs

SSO configuration for enterprise organizations.

```sql
CREATE TABLE organization_sso_configs (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  provider TEXT NOT NULL,                -- "okta", "azure_ad", "google", "onelogin", "saml"

  -- SAML Configuration
  saml_metadata_url TEXT,
  saml_entity_id TEXT,
  saml_sso_url TEXT,
  saml_certificate TEXT,                 -- X.509 cert (encrypted at rest)

  -- OAuth/OIDC Configuration
  oauth_client_id TEXT,
  oauth_client_secret TEXT,              -- Encrypted at rest
  oauth_authorization_url TEXT,
  oauth_token_url TEXT,
  oauth_userinfo_url TEXT,
  oauth_scopes TEXT[],

  -- Attribute Mapping
  attribute_mapping JSONB DEFAULT '{}',  -- Map IdP attrs to MuscleMap fields

  -- Settings
  require_sso BOOLEAN DEFAULT false,     -- Block password login
  auto_provision BOOLEAN DEFAULT true,   -- Create users on first login
  auto_update_profile BOOLEAN DEFAULT true,
  default_role TEXT DEFAULT 'member',
  default_unit_id TEXT REFERENCES organization_units(id),

  -- Status
  active BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,        -- SSO tested and working
  last_login_at TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  UNIQUE(org_id)
);

CREATE INDEX idx_sso_org ON organization_sso_configs(org_id);
```

**Attribute Mapping:**
```typescript
interface AttributeMapping {
  email: string;                         // "email" or "preferred_username"
  first_name: string;                    // "given_name"
  last_name: string;                     // "family_name"
  badge_number?: string;                 // "employeeNumber"
  unit_code?: string;                    // "department"
  rank?: string;                         // "title"
  employee_id?: string;                  // "employeeId"
}
```

---

### organization_audit_log

Audit log for compliance and security.

```sql
CREATE TABLE organization_audit_log (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Actor
  actor_id TEXT REFERENCES users(id),
  actor_email TEXT,
  actor_ip TEXT,

  -- Action
  action TEXT NOT NULL,                  -- "member.added", "settings.updated", etc.
  resource_type TEXT,                    -- "member", "unit", "settings"
  resource_id TEXT,

  -- Details
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,

  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_org ON organization_audit_log(org_id);
CREATE INDEX idx_audit_actor ON organization_audit_log(actor_id);
CREATE INDEX idx_audit_action ON organization_audit_log(action);
CREATE INDEX idx_audit_created ON organization_audit_log(created_at);

-- Keep 2 years of audit logs
-- Partition by month for performance
```

**Audit Actions:**
- `org.created`, `org.updated`, `org.deleted`
- `unit.created`, `unit.updated`, `unit.deleted`
- `member.invited`, `member.added`, `member.updated`, `member.removed`
- `member.role_changed`, `member.unit_changed`
- `member.opted_in`, `member.opted_out`
- `settings.updated`, `sso.configured`, `sso.verified`
- `report.generated`, `report.exported`
- `readiness.viewed`, `readiness.exported`

---

## API Endpoints

### Organization Management

```typescript
// Create organization
POST /api/v1/organizations
Request: {
  name: string;
  type: string;
  address?: Address;
  primary_contact?: Contact;
  required_standards?: string[];
}
Response: Organization

// Get organization
GET /api/v1/organizations/:orgId
Response: Organization (with units and member counts)

// Update organization
PUT /api/v1/organizations/:orgId
Request: Partial<Organization>

// Delete organization
DELETE /api/v1/organizations/:orgId

// Get organization by slug
GET /api/v1/organizations/by-slug/:slug
```

### Unit Management

```typescript
// List units
GET /api/v1/organizations/:orgId/units
Query: ?parent_id=xxx&type=station
Response: OrganizationUnit[]

// Create unit
POST /api/v1/organizations/:orgId/units
Request: {
  name: string;
  type: string;
  parent_unit_id?: string;
  code?: string;
}

// Update unit
PUT /api/v1/organizations/:orgId/units/:unitId

// Delete unit
DELETE /api/v1/organizations/:orgId/units/:unitId

// Get unit hierarchy
GET /api/v1/organizations/:orgId/units/tree
Response: NestedUnitTree
```

### Member Management

```typescript
// List members
GET /api/v1/organizations/:orgId/members
Query: ?unit_id=xxx&role=supervisor&status=active&page=1&limit=50
Response: { members: OrganizationMember[], total: number }

// Invite member
POST /api/v1/organizations/:orgId/invite
Request: {
  email: string;
  role?: string;
  unit_id?: string;
  message?: string;
}
Response: { invite_id: string, invite_url: string }

// Accept invite
POST /api/v1/organizations/invites/:token/accept

// Update member
PUT /api/v1/organizations/:orgId/members/:userId
Request: {
  role?: string;
  unit_id?: string;
  badge_number?: string;
  rank?: string;
}

// Remove member
DELETE /api/v1/organizations/:orgId/members/:userId

// Bulk invite
POST /api/v1/organizations/:orgId/invite/bulk
Request: {
  members: { email: string; role?: string; unit_id?: string }[]
}

// Bulk update
PUT /api/v1/organizations/:orgId/members/bulk
Request: {
  user_ids: string[];
  updates: { unit_id?: string; role?: string }
}
```

### Organization Readiness

```typescript
// Get org-wide readiness
GET /api/v1/organizations/:orgId/readiness
Query: ?standard_id=cpat
Response: {
  organization: OrganizationSummary;
  standard: CareerStandard;
  aggregate: ReadinessAggregate;
  by_unit: UnitReadiness[];
  weak_areas: WeakArea[];
  compliance: ComplianceStatus;
}

// Get unit readiness
GET /api/v1/organizations/:orgId/units/:unitId/readiness
Query: ?standard_id=cpat
Response: {
  unit: OrganizationUnit;
  aggregate: ReadinessAggregate;
  members: MemberReadiness[];
  weak_areas: WeakArea[];
}

// Get readiness history
GET /api/v1/organizations/:orgId/readiness/history
Query: ?standard_id=cpat&start_date=2025-01-01&end_date=2026-01-01&unit_id=xxx
Response: {
  snapshots: ReadinessSnapshot[];
  trend: TrendAnalysis;
}

// Force refresh readiness cache
POST /api/v1/organizations/:orgId/readiness/refresh

// Export readiness report
POST /api/v1/organizations/:orgId/readiness/export
Request: {
  format: "pdf" | "csv" | "xlsx";
  include_individual: boolean;
  date_range?: { start: Date; end: Date };
  unit_ids?: string[];
}
Response: { download_url: string; expires_at: string }
```

### SSO Management

```typescript
// Get SSO config
GET /api/v1/organizations/:orgId/sso
Response: SSOConfig (without secrets)

// Configure SSO
PUT /api/v1/organizations/:orgId/sso
Request: SSOConfigInput

// Test SSO
POST /api/v1/organizations/:orgId/sso/test
Response: { success: boolean; error?: string }

// SSO login initiation
GET /api/v1/auth/sso/:orgSlug
Redirect: To IdP login page

// SSO callback
POST /api/v1/auth/sso/callback
Request: SAML response or OAuth code
Response: { token: string; user: User }
```

### Settings & Admin

```typescript
// Get organization settings
GET /api/v1/organizations/:orgId/settings
Response: OrganizationSettings

// Update settings
PUT /api/v1/organizations/:orgId/settings
Request: Partial<OrganizationSettings>

// Get audit log
GET /api/v1/organizations/:orgId/audit
Query: ?action=member.*&actor_id=xxx&start_date=xxx&page=1
Response: { entries: AuditEntry[]; total: number }

// Get subscription info
GET /api/v1/organizations/:orgId/subscription
Response: SubscriptionInfo

// Update subscription (webhook from Stripe)
POST /api/v1/webhooks/stripe
```

---

## UI Screens

### Enterprise Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Chicago Fire Department                                    ⚙️ Settings  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Department Overview                     Trend (12 months)              │
│  ┌─────────────────────────────┐        ┌──────────────────────────────┐│
│  │                             │        │       ╱╲                     ││
│  │   82.4%                     │        │     ╱    ╲    ╱────╲  ╱─    ││
│  │   Overall Readiness         │        │   ╱        ╲╱        ╲╱      ││
│  │                             │        │ ╱                            ││
│  │   ▲ +3.2% from last month   │        │                              ││
│  │                             │        │ J F M A M J J A S O N D J    ││
│  └─────────────────────────────┘        └──────────────────────────────┘│
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ 847 Members  │ │ 78% Opted-In │ │ 91% Compliant│ │ 12 Overdue   │   │
│  │ Total        │ │ Sharing Data │ │ CPAT Ready   │ │ Recerts      │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                                         │
│ ────────────────────────────────────────────────────────────────────── │
│                                                                         │
│  Station Breakdown                                   Sort: Readiness ▼  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Station    │ Readiness │ Compliance │ Members │ Trend │ Action  │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ Station 1  │   94.2%   │   100%     │  28/28  │  ▲    │  View   │   │
│  │ Station 5  │   78.2%   │   87.5%    │  24/28  │  ▲    │  View   │   │
│  │ Station 12 │   71.8%   │   75.0%    │  21/28  │  ▼    │  View   │   │
│  │ Station 18 │   88.5%   │   92.3%    │  26/28  │  ─    │  View   │   │
│  │ ... 12 more stations                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ ────────────────────────────────────────────────────────────────────── │
│                                                                         │
│  Department Weak Areas                    Recommended Actions           │
│  ┌───────────────────────────────┐        ┌───────────────────────────┐│
│  │ 1. Ladder Raise      23 mbrs │        │ • Schedule ladder drills  ││
│  │    ██████████░░░░░░   27%    │        │ • Assign workout program  ││
│  │                               │        │ • Track improvement        ││
│  │ 2. Stair Climb       18 mbrs │        └───────────────────────────┘│
│  │    ████████░░░░░░░░   21%    │                                      │
│  │                               │        ┌───────────────────────────┐│
│  │ 3. Equipment Carry   12 mbrs │        │ Schedule Department PT    ││
│  │    █████░░░░░░░░░░░   14%    │        └───────────────────────────┘│
│  └───────────────────────────────┘        ┌───────────────────────────┐│
│                                           │   Export Full Report  📊  ││
│                                           └───────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Organization Admin Panel

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Settings                                               Chicago Fire Dept│
├───────────────────┬─────────────────────────────────────────────────────┤
│                   │                                                     │
│  ▸ General        │  General Settings                                  │
│  ▸ Units          │  ─────────────────────────────────────────────────  │
│  ▸ Members        │                                                     │
│  ▸ Standards      │  Organization Name                                  │
│  ▸ Privacy        │  [Chicago Fire Department                      ]   │
│  ▸ SSO            │                                                     │
│  ▸ Integrations   │  Organization Type                                  │
│  ▸ Billing        │  [Fire Department                            ▼]   │
│  ▸ Audit Log      │                                                     │
│                   │  Timezone                                           │
│                   │  [America/Chicago                            ▼]   │
│                   │                                                     │
│                   │  ─────────────────────────────────────────────────  │
│                   │                                                     │
│                   │  Primary Contact                                    │
│                   │                                                     │
│                   │  Name                                               │
│                   │  [Chief Robert Martinez                        ]   │
│                   │                                                     │
│                   │  Email                                              │
│                   │  [rmartnez@chicagofire.gov                    ]   │
│                   │                                                     │
│                   │  Phone                                              │
│                   │  [(312) 555-0100                               ]   │
│                   │                                                     │
│                   │  ┌────────────────────┐                            │
│                   │  │    Save Changes    │                            │
│                   │  └────────────────────┘                            │
│                   │                                                     │
└───────────────────┴─────────────────────────────────────────────────────┘
```

### SSO Configuration

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SSO Configuration                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Single Sign-On Provider                                                │
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │             │ │             │ │             │ │             │       │
│  │    Okta     │ │  Azure AD   │ │   Google    │ │    SAML     │       │
│  │      ✓      │ │             │ │  Workspace  │ │   Custom    │       │
│  │             │ │             │ │             │ │             │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Okta Configuration                                                     │
│                                                                         │
│  Metadata URL                                                           │
│  [https://chicagofire.okta.com/app/.../sso/saml/metadata       ]       │
│                                                                         │
│  Or upload metadata file:  [Choose File]                                │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Attribute Mapping                                                      │
│                                                                         │
│  Email        →  [email                                         ]      │
│  First Name   →  [firstName                                     ]      │
│  Last Name    →  [lastName                                      ]      │
│  Badge Number →  [badgeNumber                                   ]      │
│  Unit Code    →  [department                                    ]      │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Options                                                                │
│                                                                         │
│  ☑️ Require SSO for all members (disable password login)                │
│  ☑️ Auto-provision new users on first login                             │
│  ☐ Auto-assign users to units based on department attribute             │
│                                                                         │
│  ┌────────────────────┐  ┌────────────────────┐                        │
│  │    Test SSO        │  │    Save & Enable   │                        │
│  └────────────────────┘  └────────────────────┘                        │
│                                                                         │
│  Status: ● Verified and Active                                          │
│  Last login via SSO: Today at 2:34 PM                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Background Jobs

### Daily: Compute Organization Readiness

```typescript
// Run daily at 2 AM
async function computeOrganizationReadiness() {
  const orgs = await getActiveOrganizations();

  for (const org of orgs) {
    for (const standard of org.settings.required_standards) {
      // Compute org-level aggregate
      const orgReadiness = await computeReadinessAggregate(org.id, null, standard);
      await upsertOrganizationReadinessCache(org.id, null, standard, orgReadiness);

      // Compute per-unit aggregates
      const units = await getOrganizationUnits(org.id);
      for (const unit of units) {
        const unitReadiness = await computeReadinessAggregate(org.id, unit.id, standard);
        await upsertOrganizationReadinessCache(org.id, unit.id, standard, unitReadiness);
      }
    }
  }
}
```

### Weekly: Snapshot Readiness

```typescript
// Run every Sunday at midnight
async function snapshotOrganizationReadiness() {
  const orgs = await getActiveOrganizations();

  for (const org of orgs) {
    for (const standard of org.settings.required_standards) {
      // Org-level snapshot
      await createReadinessSnapshot(org.id, null, standard, 'weekly');

      // Unit-level snapshots
      const units = await getOrganizationUnits(org.id);
      for (const unit of units) {
        await createReadinessSnapshot(org.id, unit.id, standard, 'weekly');
      }
    }
  }
}
```

### On-Demand: Generate Report

```typescript
async function generateOrganizationReport(
  orgId: string,
  options: ReportOptions
): Promise<string> {
  const org = await getOrganization(orgId);
  const readiness = await getOrganizationReadiness(orgId, options.standard_id);
  const history = await getReadinessHistory(orgId, options.date_range);

  if (options.format === 'pdf') {
    return await generatePDFReport(org, readiness, history, options);
  } else if (options.format === 'csv') {
    return await generateCSVReport(org, readiness, options);
  } else {
    return await generateExcelReport(org, readiness, history, options);
  }
}
```

---

## Security Considerations

### Data Isolation

- Organizations are fully isolated at the database level
- All queries include `org_id` filter
- Row-level security policies enforce isolation

### Access Control

- Role-based access with principle of least privilege
- Supervisors can only see their unit and below
- Admins can see entire organization
- API keys are scoped to organization

### Audit Trail

- All sensitive actions are logged
- Logs retained for 2 years (configurable)
- Logs are immutable (append-only)
- Export available for compliance audits

### SSO Security

- SAML assertions validated against certificate
- OAuth tokens validated against IdP
- Session binding to IdP session (optional)
- JIT provisioning with email verification

---

## Migration Plan

### Migration 070: Organizations Core

```sql
-- Create organizations table
-- Create organization_units table
-- Create organization_members table
-- Create organization_invites table
```

### Migration 071: Organization Readiness

```sql
-- Create organization_readiness_cache table
-- Create organization_readiness_snapshots table
-- Create indexes for efficient queries
```

### Migration 072: Organization SSO

```sql
-- Create organization_sso_configs table
-- Create organization_audit_log table
```

### Migration 073: Link Hangouts to Organizations (Optional)

```sql
-- Add org_id to hangouts table for migration
-- Create trigger to sync hangout members to org members
```

---

*End of Enterprise Organizations Specification*
