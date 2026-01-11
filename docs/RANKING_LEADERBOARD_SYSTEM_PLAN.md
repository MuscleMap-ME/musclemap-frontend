# MuscleMap Ranking, Leveling & Leaderboard System
## Comprehensive Engineering Plan

**Version:** 1.0
**Status:** Implementation-Ready
**Target Platform:** MuscleMap (https://musclemap.me)

---

## Executive Summary

This document provides a complete engineering plan for MuscleMap's ranking/level system, profile/status system, and privacy-aware leaderboards. The system builds on existing infrastructure (migrations 047-050, ranks module, XP service) while adding comprehensive features for user progression, competitive leaderboards, and privacy controls.

**Key Design Decisions Made:**
1. **PostgreSQL** - Already in use; no migration needed
2. **Materialized rank storage** with event-driven updates for performance
3. **Pre-aggregated leaderboard cache** with background refresh for query speed
4. **Field-level privacy controls** stored per-user with API-level enforcement
5. **Gender-neutral naming** as default with optional style variants

---

## Section 1: Product Requirements (Clear & Testable)

### 1.1 User Levels / Ranks

#### Progression Tiers

| Rank | Min XP | Insignia | Description |
|------|--------|----------|-------------|
| Novice | 0 | Empty outline | Just getting started |
| Trainee | 100 | 1 chevron | Learning the basics |
| Apprentice | 500 | 2 chevrons | Building consistency |
| Practitioner | 1,500 | 3 chevrons | Developing expertise |
| Journeyperson | 4,000 | Bronze star | Proven dedication |
| Expert | 10,000 | Silver star | Advanced mastery |
| Master | 25,000 | Gold star | Elite performer |
| Grandmaster | 60,000 | Diamond + multi-star | Legendary status |

#### Visual Language

- **Military-inspired insignia**: Chevrons for lower ranks, stars for higher ranks
- **Inclusive design**: Non-political, gender-neutral, fun-but-serious aesthetic
- **Color progression**: Gray → Bronze → Silver → Gold → Diamond
- **Animation**: Subtle glow/pulse on rank-up, particle effects for Grandmaster

#### Naming Variants (User Preference)

| Default (Gender-Neutral) | Masculine Variant | Feminine Variant |
|--------------------------|-------------------|------------------|
| Journeyperson | Journeyman | Journeywoman |
| Master | Master | Mistress (opt-in only) |
| Grandmaster | Grandmaster | Grandmaster |

**Implementation:** Store `rank_name_style` preference: `'neutral' | 'masculine' | 'feminine'`

#### Rank Display Locations

Rank badge MUST appear in:
- [x] Profile header (below avatar/photo)
- [x] Leaderboard rows (next to username)
- [ ] Comments/posts (social features - future)
- [ ] Group rosters (community features - future)
- [x] Any `<UserCard>` component

### 1.2 Leaderboards / Scoreboards

#### Scope Filters (Nested, Combinable)

**Location Hierarchy:**
```
Global → Country → State/Province → City/Metro → Local (gym/power area)
```

**Demographic Filters:**
| Filter | Options | Privacy |
|--------|---------|---------|
| Gender | Male, Female, Non-binary, Other (custom), Prefer not to say | Opt-in display |
| Physical Ability | Standard, Adaptive, Wheelchair user, Visually impaired, Other (custom), Prefer not to say | Opt-in display |
| Age Bracket | 13-17, 18-24, 25-34, 35-44, 45-54, 55-64, 65+ | Opt-in display |
| Language(s) | Multi-select with flag icons | Always visible |

#### Ranking Statistics

**MVP Stats:**
1. Most exercises completed (overall)
2. Most exercises completed (by category)
3. Most personal goals completed
4. Most archetypes completed

**Future Stats:**
- Longest streak (days)
- Total reps logged
- Training minutes
- Consistency score (% of planned workouts completed)

#### Time Windows

- **All-time**: Since account creation
- **This month**: Calendar month
- **This week**: Monday-Sunday (ISO week)

### 1.3 User Roles & Visibility Modes

| Mode | Description | Leaderboard | Profile Visible | Can Use App |
|------|-------------|-------------|-----------------|-------------|
| Ghost Mode | Hidden/anonymized | Excluded | No (shows "Anonymous User") | Full access |
| Public Browser | Not logged in | View only | View public profiles | Limited |
| Free User | Logged in, no subscription | Included | Configurable | Full (credit limits) |
| Subscriber | Paid tier | Included + priority | Configurable | Full |

#### Veteran Badges

| Tenure | Badge | Accent |
|--------|-------|--------|
| 6 months | Bronze clock | Subtle bronze border |
| 1 year | Silver clock | Silver border + "1yr" |
| 2+ years | Gold clock | Gold border + year count |

### 1.4 Profile Editing Experience

#### Edit Profile Screen Structure

```
┌─────────────────────────────────────────┐
│ [← Back]        Edit Profile    [Save]  │
├─────────────────────────────────────────┤
│                                         │
│         ┌─────────────┐                 │
│         │   [Photo]   │  [Edit] [Remove]│
│         │  or Avatar  │                 │
│         └─────────────┘                 │
│                                         │
│  Display Name: [__________________]     │
│                                         │
│  About Me:                              │
│  ┌─────────────────────────────────┐   │
│  │ Rich text editor               │   │
│  │ B I H1 H2                       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─── Privacy Settings ───               │
│                                         │
│  Gender: [Select...] [👁 Show] [Toggle] │
│  Age Bracket: [Select...] [👁] [Toggle] │
│  Ability: [Select...] [👁] [Toggle]     │
│  Location: [Country ▾] [👁] [Toggle]    │
│  Languages: [Multi-select] [Always on]  │
│                                         │
│  ─── Special Modes ───                  │
│                                         │
│  [○ Ghost Mode]                         │
│  ⚠️ Your profile will be hidden from    │
│    other users and excluded from        │
│    leaderboards.                        │
│                                         │
└─────────────────────────────────────────┘
```

#### Image Editor Features

- **Crop**: Free-form and preset ratios (1:1 square for avatar)
- **Rotate**: 90° increments + fine rotation
- **Brightness/Contrast**: Slider controls
- **Zoom**: Pinch-to-zoom on mobile, scroll on desktop
- *(Deferred)* Background removal

#### About Me Field

- **Rich text support**: Bold, italics, H1, H2 (limited heading levels)
- **Max length**: 2,000 characters
- **XSS sanitization**: Server-side with DOMPurify/sanitize-html
- **Allowed tags**: `<p>, <strong>, <em>, <h1>, <h2>, <br>, <ul>, <ol>, <li>`
- **Forbidden**: Scripts, iframes, images, links (MVP)

#### Per-Field Privacy Toggles

| Field | Can Be Blank | "Prefer Not to Say" | Visibility Toggle |
|-------|--------------|---------------------|-------------------|
| Gender | Yes | Yes | Yes |
| Age Bracket | Yes | Yes | Yes |
| Physical Ability | Yes | Yes | Yes |
| Location (precise) | Yes | N/A | Granularity selector |
| Languages | Yes | No | Always visible if set |

### 1.5 Testable Acceptance Criteria

#### Rank System

| ID | Given | When | Then |
|----|-------|------|------|
| R-001 | User has 0 XP | View profile | Rank displays as "Novice" with empty outline insignia |
| R-002 | User has 100 XP | View profile | Rank displays as "Trainee" with 1 chevron |
| R-003 | User has 499 XP | View profile | Rank displays as "Trainee" (not yet Apprentice) |
| R-004 | User has 500 XP | View profile | Rank displays as "Apprentice" with 2 chevrons |
| R-005 | User has 60,000 XP | View profile | Rank displays as "Grandmaster" with diamond insignia |
| R-006 | User gains XP crossing threshold | Complete action | Rank-up animation plays, notification appears |
| R-007 | User sets rank_name_style to 'feminine' | View profile at Journeyperson rank | Displays "Journeywoman" |

#### Leaderboard

| ID | Given | When | Then |
|----|-------|------|------|
| L-001 | User views global leaderboard | Load page | Top 100 users displayed, sorted by selected stat desc |
| L-002 | User filters by country=USA | Apply filter | Only users with country=USA shown |
| L-003 | User filters by gender=Female + age=25-34 | Apply filters | Only matching users shown |
| L-004 | User in Ghost Mode | View any leaderboard | Current user NOT in list |
| L-005 | User sets gender to private | Other user views leaderboard | Gender column shows "—" for that user |
| L-006 | Two users have same XP | View leaderboard | Earlier achiever ranked higher |
| L-007 | User clicks own row | On leaderboard | Scrolls to and highlights their position |

#### Profile & Privacy

| ID | Given | When | Then |
|----|-------|------|------|
| P-001 | User uploads 10MB image | Submit | Error: "Image must be under 5MB" |
| P-002 | User uploads valid JPEG | Submit | Image processed, EXIF stripped, resized, saved |
| P-003 | User enters `<script>alert('xss')</script>` in About Me | Save | Script tags stripped, safe text saved |
| P-004 | User enables Ghost Mode | Save | Profile hidden from search, excluded from leaderboards |
| P-005 | User sets location visibility to "Country only" | Other user views profile | Only country shown, not city/state |
| P-006 | User is 13-17 age bracket | Default settings | Location locked to "Country only" maximum |
| P-007 | User has 6+ months tenure | View profile | Veteran badge (bronze clock) displayed |

#### XP & Progression

| ID | Given | When | Then |
|----|-------|------|------|
| X-001 | User completes exercise | Save workout | XP awarded based on exercise XP value |
| X-002 | User completes personal goal | Goal marked complete | Goal XP bonus awarded |
| X-003 | User completes archetype | All archetype exercises done | Archetype completion XP awarded |
| X-004 | User has 7-day streak | Log workout on day 7 | Streak bonus XP applied |
| X-005 | User tries to log impossible reps (10,000 in 1 minute) | Submit | Flagged for review, XP not awarded |

---

## Section 2: Data Model & Privacy Design

### 2.1 Database Schema

#### Existing Tables (from migrations 047-050)

```sql
-- Already exists: user_ranks
CREATE TABLE user_ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_rank VARCHAR(50) NOT NULL DEFAULT 'novice',
  rank_achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exercises_completed INTEGER NOT NULL DEFAULT 0,
  goals_completed INTEGER NOT NULL DEFAULT 0,
  archetypes_completed INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Already exists: xp_transactions
CREATE TABLE xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source VARCHAR(50) NOT NULL,
  source_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Already exists: leaderboard_cache
CREATE TABLE leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_type VARCHAR(50) NOT NULL,
  time_window VARCHAR(20) NOT NULL,
  scope_type VARCHAR(50) NOT NULL DEFAULT 'global',
  scope_value VARCHAR(255),
  rankings JSONB NOT NULL DEFAULT '[]',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(stat_type, time_window, scope_type, scope_value)
);

-- Already exists: user_profile_extended
CREATE TABLE user_profile_extended (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(100),
  about_me TEXT,
  about_me_html TEXT,
  avatar_url TEXT,
  photo_url TEXT,

  -- Demographics (stored but privacy-controlled)
  gender VARCHAR(50),
  gender_custom VARCHAR(100),
  age_bracket VARCHAR(20),
  physical_ability VARCHAR(50),
  physical_ability_custom VARCHAR(100),
  languages TEXT[], -- Array of ISO 639-1 codes

  -- Location (precise storage, granular exposure)
  country_code CHAR(2),
  state_province VARCHAR(100),
  city VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Privacy settings
  ghost_mode BOOLEAN NOT NULL DEFAULT FALSE,
  show_gender BOOLEAN NOT NULL DEFAULT FALSE,
  show_age_bracket BOOLEAN NOT NULL DEFAULT FALSE,
  show_ability BOOLEAN NOT NULL DEFAULT FALSE,
  location_visibility VARCHAR(20) NOT NULL DEFAULT 'country',

  -- Preferences
  rank_name_style VARCHAR(20) NOT NULL DEFAULT 'neutral',

  -- Metadata
  account_created_at TIMESTAMPTZ,
  tenure_months INTEGER GENERATED ALWAYS AS (
    EXTRACT(MONTH FROM AGE(NOW(), account_created_at))
  ) STORED,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);
```

#### New/Enhanced Tables

```sql
-- Enhanced: Add indexes and constraints
CREATE INDEX idx_user_ranks_total_xp ON user_ranks(total_xp DESC);
CREATE INDEX idx_user_ranks_exercises ON user_ranks(exercises_completed DESC);
CREATE INDEX idx_user_ranks_goals ON user_ranks(goals_completed DESC);
CREATE INDEX idx_user_ranks_archetypes ON user_ranks(archetypes_completed DESC);
CREATE INDEX idx_user_ranks_streak ON user_ranks(current_streak DESC);

CREATE INDEX idx_xp_transactions_user_created ON xp_transactions(user_id, created_at DESC);
CREATE INDEX idx_xp_transactions_source ON xp_transactions(source, created_at DESC);

CREATE INDEX idx_profile_country ON user_profile_extended(country_code) WHERE NOT ghost_mode;
CREATE INDEX idx_profile_gender ON user_profile_extended(gender) WHERE show_gender AND NOT ghost_mode;
CREATE INDEX idx_profile_age ON user_profile_extended(age_bracket) WHERE show_age_bracket AND NOT ghost_mode;
CREATE INDEX idx_profile_ability ON user_profile_extended(physical_ability) WHERE show_ability AND NOT ghost_mode;

-- New: Rank thresholds configuration table
CREATE TABLE rank_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rank_key VARCHAR(50) NOT NULL UNIQUE,
  rank_order INTEGER NOT NULL,
  min_xp INTEGER NOT NULL,
  display_name_neutral VARCHAR(50) NOT NULL,
  display_name_masculine VARCHAR(50),
  display_name_feminine VARCHAR(50),
  insignia_type VARCHAR(50) NOT NULL,
  insignia_count INTEGER NOT NULL DEFAULT 1,
  color_primary VARCHAR(7) NOT NULL,
  color_secondary VARCHAR(7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed rank thresholds
INSERT INTO rank_thresholds (rank_key, rank_order, min_xp, display_name_neutral, display_name_masculine, display_name_feminine, insignia_type, insignia_count, color_primary, color_secondary) VALUES
('novice', 1, 0, 'Novice', NULL, NULL, 'chevron_outline', 0, '#6B7280', NULL),
('trainee', 2, 100, 'Trainee', NULL, NULL, 'chevron', 1, '#6B7280', NULL),
('apprentice', 3, 500, 'Apprentice', NULL, NULL, 'chevron', 2, '#6B7280', NULL),
('practitioner', 4, 1500, 'Practitioner', NULL, NULL, 'chevron', 3, '#6B7280', NULL),
('journeyperson', 5, 4000, 'Journeyperson', 'Journeyman', 'Journeywoman', 'star', 1, '#CD7F32', NULL),
('expert', 6, 10000, 'Expert', NULL, NULL, 'star', 1, '#C0C0C0', NULL),
('master', 7, 25000, 'Master', 'Master', 'Mistress', 'star', 1, '#FFD700', NULL),
('grandmaster', 8, 60000, 'Grandmaster', NULL, NULL, 'star_diamond', 3, '#B9F2FF', '#FFD700');

-- New: XP velocity limits (anti-cheat)
CREATE TABLE xp_velocity_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL UNIQUE,
  max_per_hour INTEGER NOT NULL,
  max_per_day INTEGER NOT NULL,
  cooldown_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO xp_velocity_limits (source, max_per_hour, max_per_day, cooldown_seconds) VALUES
('exercise_completion', 500, 2000, 30),
('rep_logged', 200, 1000, 0),
('goal_completed', 300, 1000, 60),
('archetype_completed', 500, 2000, 300),
('streak_bonus', 100, 100, 0);

-- New: XP anomaly flags
CREATE TABLE xp_anomaly_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES xp_transactions(id),
  flag_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'warning',
  details JSONB NOT NULL DEFAULT '{}',
  reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_anomaly_flags_user ON xp_anomaly_flags(user_id, created_at DESC);
CREATE INDEX idx_anomaly_flags_unreviewed ON xp_anomaly_flags(reviewed, severity) WHERE NOT reviewed;

-- New: Profile edit audit log
CREATE TABLE profile_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_changed VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profile_audit_user ON profile_audit_log(user_id, created_at DESC);
```

### 2.2 Rank Computation & Storage

#### Strategy: Materialized + Event-Driven

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ User Action     │────▶│ XP Transaction   │────▶│ Rank Check      │
│ (exercise done) │     │ Created          │     │ & Update        │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │ user_ranks      │
                                                 │ (materialized)  │
                                                 └─────────────────┘
```

**Why Materialized:**
1. Rank is read FAR more often than updated (every profile view vs. occasional XP gain)
2. Rank thresholds rarely change
3. Enables fast leaderboard queries without JOINing xp_transactions

**Update Flow:**
```typescript
async function logXpEvent(userId: string, source: string, amount: number): Promise<void> {
  // 1. Insert transaction
  const txn = await db.xp_transactions.insert({ userId, source, amount });

  // 2. Update user_ranks atomically
  const newTotals = await db.user_ranks.update(userId, {
    total_xp: sql`total_xp + ${amount}`,
    [source === 'exercise_completion' ? 'exercises_completed' : '']: sql`exercises_completed + 1`,
    updated_at: new Date()
  }).returning('total_xp');

  // 3. Check for rank-up
  const newRank = computeRankFromXp(newTotals.total_xp);
  const currentRank = await db.user_ranks.get(userId, 'current_rank');

  if (newRank !== currentRank) {
    await db.user_ranks.update(userId, {
      current_rank: newRank,
      rank_achieved_at: new Date()
    });
    await emitRankUpEvent(userId, currentRank, newRank);
  }
}
```

#### Handling Threshold Changes

If rank thresholds are adjusted:
1. Create migration that updates `rank_thresholds` table
2. Run background job to recalculate all user ranks:
   ```sql
   UPDATE user_ranks ur
   SET current_rank = (
     SELECT rank_key FROM rank_thresholds rt
     WHERE rt.min_xp <= ur.total_xp
     ORDER BY rt.min_xp DESC
     LIMIT 1
   ),
   rank_achieved_at = NOW(),
   updated_at = NOW();
   ```
3. Feature flag to prevent rank display during migration

### 2.3 Leaderboard Query Optimization

#### Strategy: Pre-Aggregated Cache + Background Refresh

```
┌─────────────────────────────────────────────────────────────────┐
│                    Leaderboard Cache Architecture               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │ User        │    │ Background  │    │ leaderboard_cache   │ │
│  │ Request     │───▶│ Check TTL   │───▶│ (PostgreSQL)        │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│         │                  │                      │             │
│         │           [TTL Valid]            [TTL Expired]        │
│         │                  │                      │             │
│         │                  ▼                      ▼             │
│         │           ┌─────────────┐    ┌─────────────────────┐ │
│         │           │ Return      │    │ Recompute           │ │
│         │           │ Cached      │    │ (async job)         │ │
│         │           └─────────────┘    └─────────────────────┘ │
│         │                  │                      │             │
│         ▼                  ▼                      ▼             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    API Response                              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

#### Cache Key Structure

```
stat_type:time_window:scope_type:scope_value
```

Examples:
- `exercises:all_time:global:null` → Global all-time exercises
- `exercises:this_month:country:US` → US this month exercises
- `goals:this_week:country:US:state:CA` → California this week goals

#### TTL Strategy

| Scope | TTL |
|-------|-----|
| Global | 15 minutes |
| Country | 15 minutes |
| State/Province | 30 minutes |
| City | 60 minutes |
| Local | 60 minutes |

#### Background Job (Cron)

```typescript
// Run every 5 minutes
async function refreshExpiredLeaderboards(): Promise<void> {
  const expired = await db.leaderboard_cache.findMany({
    where: { expires_at: { lt: new Date() } }
  });

  for (const cache of expired) {
    await computeAndCacheLeaderboard(
      cache.stat_type,
      cache.time_window,
      cache.scope_type,
      cache.scope_value
    );
  }
}
```

#### Query Pattern for Multi-Filter

```sql
-- Example: Exercises, this month, USA, Female, 25-34, Standard ability
SELECT
  ur.user_id,
  ur.exercises_completed,
  ur.total_xp,
  ur.current_rank,
  upe.display_name,
  upe.avatar_url,
  CASE WHEN upe.show_gender THEN upe.gender ELSE NULL END as gender,
  CASE WHEN upe.show_age_bracket THEN upe.age_bracket ELSE NULL END as age_bracket,
  CASE WHEN upe.location_visibility IN ('country', 'state', 'city') THEN upe.country_code ELSE NULL END as country,
  ROW_NUMBER() OVER (ORDER BY ur.exercises_completed DESC, ur.rank_achieved_at ASC) as rank
FROM user_ranks ur
JOIN user_profile_extended upe ON ur.user_id = upe.user_id
WHERE
  upe.ghost_mode = FALSE
  AND upe.country_code = 'US'
  AND (upe.gender = 'female' AND upe.show_gender = TRUE)
  AND (upe.age_bracket = '25-34' AND upe.show_age_bracket = TRUE)
  AND (upe.physical_ability = 'standard' AND upe.show_ability = TRUE)
  AND ur.updated_at >= DATE_TRUNC('month', NOW())
ORDER BY ur.exercises_completed DESC, ur.rank_achieved_at ASC
LIMIT 100 OFFSET 0;
```

### 2.4 Privacy-Aware Field Storage

#### Storage vs. Exposure Matrix

| Field | Stored As | Exposed to Self | Exposed to Others | Exposed on Leaderboard |
|-------|-----------|-----------------|-------------------|------------------------|
| Gender | `gender` VARCHAR | Always | If `show_gender` | If `show_gender` |
| Gender (custom) | `gender_custom` VARCHAR | Always | If `show_gender` | If `show_gender` |
| Age Bracket | `age_bracket` VARCHAR | Always | If `show_age_bracket` | If `show_age_bracket` |
| Physical Ability | `physical_ability` VARCHAR | Always | If `show_ability` | If `show_ability` |
| Ability (custom) | `physical_ability_custom` VARCHAR | Always | If `show_ability` | If `show_ability` |
| Country | `country_code` | Always | If `location_visibility != 'hidden'` | Based on visibility |
| State | `state_province` | Always | If `location_visibility IN ('state', 'city')` | Based on visibility |
| City | `city` | Always | If `location_visibility = 'city'` | Based on visibility |
| Lat/Long | `latitude`, `longitude` | Always | Never (internal use only) | Never |
| Languages | `languages[]` | Always | Always (if set) | Always (if set) |

#### Ghost Mode Behavior

When `ghost_mode = TRUE`:

| Context | Behavior |
|---------|----------|
| Own Profile View | Full data visible to self |
| Other User Searches | Not returned in results |
| Leaderboards | Excluded entirely |
| Profile URL Access | Returns 404 or "User not found" |
| Comments/Posts (future) | Shows "Anonymous User" |

#### API Response Sanitization

```typescript
function sanitizeProfileForViewer(
  profile: UserProfileExtended,
  viewerId: string | null
): PublicProfile {
  const isSelf = viewerId === profile.user_id;
  const isGhost = profile.ghost_mode;

  if (isGhost && !isSelf) {
    throw new NotFoundError('User not found');
  }

  return {
    userId: profile.user_id,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    aboutMe: profile.about_me_html, // Already sanitized on save

    // Privacy-controlled fields
    gender: (isSelf || profile.show_gender) ? profile.gender : null,
    genderCustom: (isSelf || profile.show_gender) ? profile.gender_custom : null,
    ageBracket: (isSelf || profile.show_age_bracket) ? profile.age_bracket : null,
    physicalAbility: (isSelf || profile.show_ability) ? profile.physical_ability : null,

    // Location with granularity
    country: getLocationByVisibility(profile, 'country', isSelf),
    state: getLocationByVisibility(profile, 'state', isSelf),
    city: getLocationByVisibility(profile, 'city', isSelf),

    // Always visible
    languages: profile.languages,
    rank: profile.current_rank,
    totalXp: profile.total_xp,
    veteranBadge: computeVeteranBadge(profile.tenure_months),
  };
}
```

### 2.5 Abuse Prevention Hooks

#### XP Velocity Checks

```typescript
async function checkXpVelocity(
  userId: string,
  source: string,
  amount: number
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await db.xp_velocity_limits.get(source);
  if (!limits) return { allowed: true };

  const hourlyXp = await db.xp_transactions.sum({
    where: {
      user_id: userId,
      source,
      created_at: { gte: subHours(new Date(), 1) }
    }
  });

  if (hourlyXp + amount > limits.max_per_hour) {
    await flagAnomaly(userId, null, 'velocity_exceeded', 'warning', {
      source, hourlyXp, attempted: amount, limit: limits.max_per_hour
    });
    return { allowed: false, reason: 'Hourly XP limit exceeded' };
  }

  const dailyXp = await db.xp_transactions.sum({
    where: {
      user_id: userId,
      source,
      created_at: { gte: subDays(new Date(), 1) }
    }
  });

  if (dailyXp + amount > limits.max_per_day) {
    await flagAnomaly(userId, null, 'velocity_exceeded', 'warning', {
      source, dailyXp, attempted: amount, limit: limits.max_per_day
    });
    return { allowed: false, reason: 'Daily XP limit exceeded' };
  }

  return { allowed: true };
}
```

#### Anomaly Detection Signals

| Signal | Threshold | Action |
|--------|-----------|--------|
| XP spike | >500 XP in 5 minutes | Flag for review |
| Impossible reps | >1000 reps in single exercise | Block + flag |
| Rapid completions | >20 exercises in 10 minutes | Flag for review |
| Suspicious patterns | Same exercise repeated 50+ times/day | Flag for review |
| Account age vs XP | <1 day old + >5000 XP | Flag for review |

#### Rate Limiting

| Endpoint | Rate Limit |
|----------|------------|
| `PUT /api/profile` | 10/minute |
| `POST /api/profile/photo` | 5/hour |
| `GET /api/leaderboard` | 60/minute |
| `POST /api/xp/event` (internal) | 100/minute per user |

---

## Section 3: Ranking / XP Rules (Concrete)

### 3.1 XP Sources

| Action | Base XP | Notes |
|--------|---------|-------|
| Exercise completion | 10 | Per exercise logged |
| Rep logged | 0.1 | Capped at 100 XP per session |
| Set logged | 1 | Per set completed |
| Personal goal completed | 50 | Bonus for milestone |
| Archetype completed | 200 | Full archetype mastery |
| 7-day streak | 25 | Bonus at streak milestone |
| 30-day streak | 100 | Bonus at streak milestone |
| First workout of day | 5 | Daily login bonus |
| Profile completed | 25 | One-time for filling all fields |
| First archetype started | 10 | Encouragement for new feature |

#### XP Caps (Anti-Gaming)

| Source | Hourly Cap | Daily Cap |
|--------|------------|-----------|
| Exercise completion | 500 XP | 2,000 XP |
| Reps logged | 200 XP | 1,000 XP |
| Goals completed | 300 XP | 1,000 XP |
| Archetype completed | 500 XP | 2,000 XP |
| Streaks | 100 XP | 100 XP |

### 3.2 Normalization & Fairness

#### Design Principle: No Ableist Scoring

**Key decisions:**
1. **No XP penalty** for adaptive users, wheelchair users, or any ability category
2. **Segmented leaderboards** are the primary fairness mechanism
3. **Same XP values** for all users regardless of ability category
4. **Optional participation** in ability-segmented leaderboards

#### Path to Grandmaster: All Users Equal

```
User A (Standard):
  - Completes 600 exercises → 6,000 XP
  - 100 goals → 5,000 XP
  - 20 archetypes → 4,000 XP
  - 365-day streak bonuses → ~500 XP
  - Misc (daily, profile) → ~500 XP
  Total: ~16,000 XP (Expert rank)

  Time to Grandmaster at this pace: ~4 years consistent use

User B (Wheelchair User):
  - Completes 600 exercises (upper body focus) → 6,000 XP
  - 100 goals → 5,000 XP
  - 20 archetypes (adaptive archetypes) → 4,000 XP
  - 365-day streak bonuses → ~500 XP
  - Misc (daily, profile) → ~500 XP
  Total: ~16,000 XP (Expert rank)

  Time to Grandmaster at this pace: ~4 years consistent use
```

**Adaptive archetypes** count equally toward archetype XP. Exercise library includes adaptive variations.

#### Opt-In Categories

| Category | Default | Can Change |
|----------|---------|------------|
| Gender on leaderboard | Hidden | Yes |
| Age bracket on leaderboard | Hidden | Yes |
| Physical ability on leaderboard | Hidden | Yes |
| Location granularity | Country only | Yes |

### 3.3 Rank Thresholds

| Rank | Min XP | XP to Next | Insignia | Color |
|------|--------|------------|----------|-------|
| Novice | 0 | 100 | Empty chevron outline | Gray #6B7280 |
| Trainee | 100 | 400 | 1 chevron | Gray #6B7280 |
| Apprentice | 500 | 1,000 | 2 chevrons | Gray #6B7280 |
| Practitioner | 1,500 | 2,500 | 3 chevrons | Gray #6B7280 |
| Journeyperson | 4,000 | 6,000 | Bronze star | Bronze #CD7F32 |
| Expert | 10,000 | 15,000 | Silver star | Silver #C0C0C0 |
| Master | 25,000 | 35,000 | Gold star | Gold #FFD700 |
| Grandmaster | 60,000 | — | Diamond + 3 stars | Diamond #B9F2FF |

#### Progression Timeline (Typical User)

| Activity Level | Time to Expert | Time to Grandmaster |
|---------------|----------------|---------------------|
| Casual (2x/week) | ~2 years | ~6 years |
| Regular (4x/week) | ~1 year | ~3 years |
| Dedicated (6x/week) | ~6 months | ~2 years |
| Hardcore (daily + goals) | ~4 months | ~1.5 years |

### 3.4 Tie-Breakers

When users have identical stat values:

1. **Primary**: Higher value in sorting stat wins
2. **Secondary**: Earlier achievement date (who reached that value first)
3. **Tertiary**: Higher total XP
4. **Final**: Alphabetical by display name (deterministic fallback)

```sql
ORDER BY
  stat_value DESC,
  stat_achieved_at ASC,
  total_xp DESC,
  display_name ASC
```

---

## Section 4: API + UI Plan (Implementation-Ready)

### 4.1 API Endpoints

#### Profile Endpoints

```typescript
// GET /api/profile/:userId
// Returns user profile with privacy applied
interface GetProfileResponse {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  photoUrl: string | null;
  aboutMe: string | null; // Sanitized HTML

  // Privacy-controlled (null if hidden)
  gender: string | null;
  genderCustom: string | null;
  ageBracket: string | null;
  physicalAbility: string | null;
  physicalAbilityCustom: string | null;
  country: string | null;
  state: string | null;
  city: string | null;

  // Always visible
  languages: string[];
  rank: RankInfo;
  stats: UserStats;
  veteranBadge: VeteranBadge | null;

  // Self-only fields
  isOwnProfile: boolean;
  privacySettings?: PrivacySettings; // Only if own profile
}

interface RankInfo {
  key: string;
  displayName: string;
  totalXp: number;
  xpToNextRank: number | null;
  insigniaType: string;
  insigniaCount: number;
  colorPrimary: string;
  colorSecondary: string | null;
}

interface UserStats {
  exercisesCompleted: number;
  goalsCompleted: number;
  archetypesCompleted: number;
  currentStreak: number;
  longestStreak: number;
}

interface VeteranBadge {
  tier: 'bronze' | 'silver' | 'gold';
  months: number;
  label: string; // "6 months", "1 year", "2 years"
}

interface PrivacySettings {
  ghostMode: boolean;
  showGender: boolean;
  showAgeBracket: boolean;
  showAbility: boolean;
  locationVisibility: 'hidden' | 'country' | 'state' | 'city';
  rankNameStyle: 'neutral' | 'masculine' | 'feminine';
}
```

```typescript
// PUT /api/profile
// Update own profile (authenticated)
interface UpdateProfileRequest {
  displayName?: string;
  aboutMe?: string; // Raw text or limited HTML
  gender?: string | null;
  genderCustom?: string | null;
  ageBracket?: string | null;
  physicalAbility?: string | null;
  physicalAbilityCustom?: string | null;
  languages?: string[];
  countryCode?: string | null;
  stateProvince?: string | null;
  city?: string | null;

  // Privacy settings
  ghostMode?: boolean;
  showGender?: boolean;
  showAgeBracket?: boolean;
  showAbility?: boolean;
  locationVisibility?: 'hidden' | 'country' | 'state' | 'city';
  rankNameStyle?: 'neutral' | 'masculine' | 'feminine';
}

interface UpdateProfileResponse {
  success: boolean;
  profile: GetProfileResponse;
}
```

```typescript
// POST /api/profile/photo
// Upload profile photo (multipart/form-data)
// Max 5MB, JPEG/PNG/WebP only
interface UploadPhotoResponse {
  success: boolean;
  photoUrl: string;
  thumbnailUrl: string;
}

// PUT /api/profile/photo/edit
// Apply edits to current photo
interface EditPhotoRequest {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  rotation: number; // degrees
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
}

interface EditPhotoResponse {
  success: boolean;
  photoUrl: string;
  thumbnailUrl: string;
}
```

#### Leaderboard Endpoints

```typescript
// GET /api/leaderboard
interface LeaderboardRequest {
  stat: 'exercises' | 'exercises_category' | 'goals' | 'archetypes' | 'streak' | 'xp';
  category?: string; // For exercises_category
  window: 'all_time' | 'this_month' | 'this_week';

  // Scope filters (all optional)
  country?: string; // ISO 3166-1 alpha-2
  state?: string;
  city?: string;
  gender?: string;
  ageBracket?: string;
  ability?: string;
  language?: string;

  // Pagination
  page?: number; // Default 1
  limit?: number; // Default 50, max 100
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  currentUserPosition: number | null; // Null if not on board or ghost mode
  computedAt: string; // ISO timestamp
  filters: AppliedFilters;
}

interface LeaderboardEntry {
  position: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  rank: RankInfo;
  statValue: number;

  // Privacy-controlled demographics
  gender: string | null;
  ageBracket: string | null;
  ability: string | null;
  country: string | null;
  languages: string[];

  isCurrentUser: boolean;
}

interface AppliedFilters {
  stat: string;
  window: string;
  country: string | null;
  state: string | null;
  city: string | null;
  gender: string | null;
  ageBracket: string | null;
  ability: string | null;
  language: string | null;
}
```

#### Rank & XP Endpoints

```typescript
// GET /api/rank/:userId
interface GetRankResponse {
  userId: string;
  rank: RankInfo;
  stats: UserStats;
  recentXp: XpTransaction[]; // Last 10, own profile only
}

// POST /api/xp/event (internal - called by other services)
interface LogXpEventRequest {
  userId: string;
  source: 'exercise_completion' | 'rep_logged' | 'goal_completed' | 'archetype_completed' | 'streak_bonus' | 'daily_bonus' | 'profile_completed';
  amount: number;
  sourceId?: string; // Reference to exercise/goal/archetype ID
  description?: string;
  metadata?: Record<string, unknown>;
}

interface LogXpEventResponse {
  success: boolean;
  transactionId: string;
  newTotalXp: number;
  rankChanged: boolean;
  newRank?: RankInfo;
}

// GET /api/xp/history/:userId
// Own history or admin access
interface XpHistoryResponse {
  transactions: XpTransaction[];
  total: number;
  page: number;
  limit: number;
}

interface XpTransaction {
  id: string;
  amount: number;
  source: string;
  sourceId: string | null;
  description: string | null;
  createdAt: string;
}
```

### 4.2 Frontend Components

#### RankBadge Component

```tsx
// src/components/ranks/RankBadge.tsx
interface RankBadgeProps {
  rank: RankInfo;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showXp?: boolean;
  animate?: boolean;
}

// Sizes:
// xs: 16px (inline text)
// sm: 24px (compact cards)
// md: 32px (standard cards)
// lg: 48px (profile headers)
// xl: 64px (featured displays)

// Usage:
<RankBadge rank={user.rank} size="md" showLabel />
// Renders: [🔷 Expert] (silver star + "Expert" text)
```

#### UserCard Component

```tsx
// src/components/user/UserCard.tsx
interface UserCardProps {
  user: PublicProfile;
  showRank?: boolean;
  showStats?: boolean;
  showVeteran?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

// Usage:
<UserCard
  user={leaderboardEntry}
  showRank
  showStats
  onClick={() => navigate(`/profile/${user.userId}`)}
/>
```

#### Leaderboard Component

```tsx
// src/pages/Leaderboard.tsx
interface LeaderboardProps {
  initialStat?: string;
  initialWindow?: string;
}

// Features:
// - Filter chips at top (stat, window, demographic filters)
// - Infinite scroll with virtualization
// - Current user row highlighted and sticky
// - "Jump to my position" button
// - Empty state for no matches
// - Loading skeletons
```

#### ProfileHeader Component

```tsx
// src/components/profile/ProfileHeader.tsx
interface ProfileHeaderProps {
  profile: GetProfileResponse;
  onEdit?: () => void;
}

// Layout:
// [Avatar/Photo] [Display Name]
// [Rank Badge] [Veteran Badge]
// [Key Stats: Exercises | Goals | Streaks]
// [Edit Profile Button] (if own profile)
```

#### EditProfile Component

```tsx
// src/pages/EditProfile.tsx

// Subcomponents:
// - ImageEditor (Cropper.js wrapper)
// - RichTextEditor (Tiptap with limited toolbar)
// - PrivacyToggle (switch + visibility indicator)
// - GhostModeToggle (with warning modal)
// - LocationPicker (country → state → city cascade)
// - LanguageMultiSelect (with flag icons)
```

### 4.3 Security

#### Rich Text Sanitization

```typescript
// Server-side sanitization on save
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = ['p', 'strong', 'em', 'h1', 'h2', 'br', 'ul', 'ol', 'li'];
const ALLOWED_ATTRIBUTES = {}; // No attributes allowed

function sanitizeAboutMe(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    disallowedTagsMode: 'discard',
    textFilter: (text) => text.slice(0, 2000) // Max length
  });
}
```

#### Image Upload Constraints

```typescript
const IMAGE_CONSTRAINTS = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxDimensions: { width: 4096, height: 4096 },
  outputFormat: 'webp',
  outputQuality: 85,
  stripExif: true,
  thumbnailSize: { width: 200, height: 200 }
};

async function processUploadedImage(buffer: Buffer): Promise<ProcessedImage> {
  const sharp = require('sharp');

  const image = sharp(buffer)
    .rotate() // Auto-rotate based on EXIF
    .resize(IMAGE_CONSTRAINTS.maxDimensions.width, IMAGE_CONSTRAINTS.maxDimensions.height, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality: IMAGE_CONSTRAINTS.outputQuality });

  const processed = await image.toBuffer();
  const thumbnail = await sharp(buffer)
    .resize(IMAGE_CONSTRAINTS.thumbnailSize.width, IMAGE_CONSTRAINTS.thumbnailSize.height, {
      fit: 'cover'
    })
    .webp({ quality: 80 })
    .toBuffer();

  return { processed, thumbnail };
}
```

#### Authorization Rules

| Action | Rule |
|--------|------|
| View own profile | Always allowed |
| View other profile | Allowed unless ghost mode |
| Edit own profile | Authenticated + own user ID |
| Edit other profile | Denied (admin feature future) |
| View leaderboard | Always allowed |
| Appear on leaderboard | Not ghost mode + relevant privacy settings |
| Log XP event | Internal service only (JWT service token) |
| View own XP history | Authenticated + own user ID |
| View other XP history | Denied (admin feature future) |

#### Rate Limits

```typescript
const RATE_LIMITS = {
  'PUT /api/profile': { window: 60, max: 10 }, // 10/min
  'POST /api/profile/photo': { window: 3600, max: 5 }, // 5/hour
  'PUT /api/profile/photo/edit': { window: 60, max: 20 }, // 20/min
  'GET /api/leaderboard': { window: 60, max: 60 }, // 60/min
  'GET /api/profile/:userId': { window: 60, max: 120 }, // 120/min
};
```

---

## Section 5: Migration & Rollout Plan

### 5.1 Milestones

#### MVP (Phase 1)
- [x] Schema migrations (047-050 already exist)
- [x] XP logging service
- [x] Basic rank computation
- [x] RankBadge component
- [ ] Profile photo upload (basic)
- [ ] Rank display in profile header

#### v1 (Phase 2)
- [ ] Leaderboard page (single stat, global scope)
- [ ] Edit Profile screen with privacy toggles
- [ ] Ghost mode implementation
- [ ] Leaderboard cache system
- [ ] Background refresh jobs

#### v1.1 (Phase 3)
- [ ] Multi-filter leaderboards (country, gender, age, ability)
- [ ] Rich text About Me with sanitization
- [ ] Image editor (crop, rotate, brightness)
- [ ] Veteran badges
- [ ] Anomaly detection

#### Enhancements (Phase 4+)
- [ ] Additional stats (streaks, minutes)
- [ ] City/local leaderboards
- [ ] Language filter
- [ ] Social features integration
- [ ] Admin review dashboard

### 5.2 Backfill Strategy

```typescript
// scripts/backfill-xp.ts
async function backfillHistoricalXp(): Promise<void> {
  console.log('Starting XP backfill...');

  // 1. Get all users
  const users = await db.users.findMany();
  console.log(`Processing ${users.length} users...`);

  for (const user of users) {
    let totalXp = 0;
    const transactions: XpTransaction[] = [];

    // 2. Count historical exercises
    const exercises = await db.workout_exercises.count({
      where: { user_id: user.id }
    });
    totalXp += exercises * 10;
    transactions.push({
      userId: user.id,
      source: 'backfill_exercises',
      amount: exercises * 10,
      description: `Backfill: ${exercises} historical exercises`
    });

    // 3. Count historical goals
    const goals = await db.goals.count({
      where: { user_id: user.id, completed: true }
    });
    totalXp += goals * 50;
    transactions.push({
      userId: user.id,
      source: 'backfill_goals',
      amount: goals * 50,
      description: `Backfill: ${goals} historical goals`
    });

    // 4. Count historical archetypes
    const archetypes = await db.user_archetypes.count({
      where: { user_id: user.id, completed: true }
    });
    totalXp += archetypes * 200;
    transactions.push({
      userId: user.id,
      source: 'backfill_archetypes',
      amount: archetypes * 200,
      description: `Backfill: ${archetypes} historical archetypes`
    });

    // 5. Insert transactions
    await db.xp_transactions.insertMany(transactions);

    // 6. Compute rank
    const rank = computeRankFromXp(totalXp);

    // 7. Update user_ranks
    await db.user_ranks.upsert({
      where: { user_id: user.id },
      create: {
        user_id: user.id,
        total_xp: totalXp,
        current_rank: rank,
        exercises_completed: exercises,
        goals_completed: goals,
        archetypes_completed: archetypes
      },
      update: {
        total_xp: totalXp,
        current_rank: rank,
        exercises_completed: exercises,
        goals_completed: goals,
        archetypes_completed: archetypes
      }
    });

    console.log(`User ${user.id}: ${totalXp} XP → ${rank}`);
  }

  console.log('XP backfill complete!');
}
```

### 5.3 Feature Flags

```typescript
// Feature flag configuration
const FEATURE_FLAGS = {
  FF_RANK_SYSTEM: {
    description: 'Enable rank display throughout app',
    defaultValue: false,
    rollout: [
      { percentage: 10, date: 'phase1_start' },
      { percentage: 50, date: 'phase1_stable' },
      { percentage: 100, date: 'phase1_complete' }
    ]
  },
  FF_LEADERBOARDS: {
    description: 'Enable leaderboard screens',
    defaultValue: false,
    dependencies: ['FF_RANK_SYSTEM'],
    rollout: [
      { percentage: 10, date: 'phase2_start' },
      { percentage: 50, date: 'phase2_stable' },
      { percentage: 100, date: 'phase2_complete' }
    ]
  },
  FF_GHOST_MODE: {
    description: 'Enable Ghost mode toggle in profile',
    defaultValue: false,
    dependencies: ['FF_RANK_SYSTEM'],
    rollout: [
      { percentage: 100, date: 'phase2_start' } // All or nothing
    ]
  },
  FF_MULTI_FILTER_LEADERBOARDS: {
    description: 'Enable demographic filters on leaderboards',
    defaultValue: false,
    dependencies: ['FF_LEADERBOARDS'],
    rollout: [
      { percentage: 10, date: 'phase3_start' },
      { percentage: 100, date: 'phase3_stable' }
    ]
  },
  FF_RICH_TEXT_ABOUT: {
    description: 'Enable rich text editor for About Me',
    defaultValue: false,
    rollout: [
      { percentage: 100, date: 'phase3_start' }
    ]
  },
  FF_IMAGE_EDITOR: {
    description: 'Enable in-browser image editing',
    defaultValue: false,
    rollout: [
      { percentage: 100, date: 'phase3_start' }
    ]
  }
};
```

### 5.4 Instrumentation & Analytics

#### Events to Track

| Event | Properties | Purpose |
|-------|------------|---------|
| `xp_earned` | source, amount, user_rank | Track XP distribution |
| `rank_up` | old_rank, new_rank, total_xp | Track progression |
| `leaderboard_viewed` | stat, window, filters | Track engagement |
| `leaderboard_filter_used` | filter_type, filter_value | Understand filter usage |
| `profile_edited` | fields_changed | Track profile completion |
| `ghost_mode_toggled` | enabled | Track privacy feature adoption |
| `photo_uploaded` | file_size, processing_time | Monitor image pipeline |
| `photo_edited` | edit_actions | Track editor usage |

#### Error Tracking

| Error Type | Alert Threshold |
|------------|-----------------|
| Image processing failure | >1% of uploads |
| XP transaction failure | Any occurrence |
| Leaderboard cache miss | >10% of requests |
| Rank computation error | Any occurrence |
| Sanitization blocked content | Log for review |

### 5.5 Testing Requirements

#### Unit Tests

```typescript
// tests/unit/ranks.test.ts
describe('Rank Computation', () => {
  it('should return Novice for 0 XP', () => {
    expect(computeRankFromXp(0)).toBe('novice');
  });

  it('should return Trainee for 100 XP', () => {
    expect(computeRankFromXp(100)).toBe('trainee');
  });

  it('should return Trainee for 499 XP (boundary)', () => {
    expect(computeRankFromXp(499)).toBe('trainee');
  });

  it('should return Apprentice for 500 XP', () => {
    expect(computeRankFromXp(500)).toBe('apprentice');
  });

  it('should return Grandmaster for 60000+ XP', () => {
    expect(computeRankFromXp(60000)).toBe('grandmaster');
    expect(computeRankFromXp(100000)).toBe('grandmaster');
  });
});

describe('Privacy Filtering', () => {
  it('should hide gender when show_gender is false', () => {
    const profile = { gender: 'female', show_gender: false };
    const sanitized = sanitizeProfileForViewer(profile, 'other-user');
    expect(sanitized.gender).toBeNull();
  });

  it('should show gender to self regardless of setting', () => {
    const profile = { user_id: 'user-1', gender: 'female', show_gender: false };
    const sanitized = sanitizeProfileForViewer(profile, 'user-1');
    expect(sanitized.gender).toBe('female');
  });

  it('should return 404 for ghost mode users', () => {
    const profile = { user_id: 'user-1', ghost_mode: true };
    expect(() => sanitizeProfileForViewer(profile, 'other-user'))
      .toThrow('User not found');
  });
});

describe('XP Velocity Checks', () => {
  it('should allow XP within hourly limit', async () => {
    const result = await checkXpVelocity('user-1', 'exercise_completion', 10);
    expect(result.allowed).toBe(true);
  });

  it('should block XP exceeding hourly limit', async () => {
    // Setup: User already earned 495 XP this hour
    await seedXpTransactions('user-1', 495);
    const result = await checkXpVelocity('user-1', 'exercise_completion', 10);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Hourly XP limit');
  });
});
```

#### Integration Tests

```typescript
// tests/integration/leaderboard.test.ts
describe('Leaderboard API', () => {
  it('should return sorted leaderboard entries', async () => {
    const response = await api.get('/api/leaderboard?stat=exercises&window=all_time');
    expect(response.status).toBe(200);
    expect(response.body.entries).toBeSortedBy('statValue', { descending: true });
  });

  it('should exclude ghost mode users', async () => {
    await setGhostMode('user-ghost', true);
    const response = await api.get('/api/leaderboard?stat=exercises&window=all_time');
    const userIds = response.body.entries.map(e => e.userId);
    expect(userIds).not.toContain('user-ghost');
  });

  it('should apply country filter correctly', async () => {
    const response = await api.get('/api/leaderboard?stat=exercises&window=all_time&country=US');
    response.body.entries.forEach(entry => {
      expect(entry.country).toBe('US');
    });
  });

  it('should respect privacy settings in response', async () => {
    await setPrivacy('user-private', { showGender: false });
    const response = await api.get('/api/leaderboard?stat=exercises&window=all_time');
    const entry = response.body.entries.find(e => e.userId === 'user-private');
    expect(entry.gender).toBeNull();
  });
});

describe('Profile API', () => {
  it('should update profile with valid data', async () => {
    const response = await api.put('/api/profile')
      .auth('user-1')
      .send({ displayName: 'New Name', aboutMe: 'Hello world' });
    expect(response.status).toBe(200);
    expect(response.body.profile.displayName).toBe('New Name');
  });

  it('should sanitize HTML in aboutMe', async () => {
    const response = await api.put('/api/profile')
      .auth('user-1')
      .send({ aboutMe: '<script>alert("xss")</script><p>Safe text</p>' });
    expect(response.body.profile.aboutMe).toBe('<p>Safe text</p>');
    expect(response.body.profile.aboutMe).not.toContain('script');
  });

  it('should reject oversized image uploads', async () => {
    const largeImage = Buffer.alloc(6 * 1024 * 1024); // 6MB
    const response = await api.post('/api/profile/photo')
      .auth('user-1')
      .attach('photo', largeImage, 'large.jpg');
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('5MB');
  });
});
```

#### E2E Tests

```typescript
// tests/e2e/rank-progression.test.ts
describe('User Rank Progression Flow', () => {
  it('should progress from Novice to Trainee', async () => {
    // 1. Create new user
    const user = await createTestUser();

    // 2. Verify starts as Novice
    let profile = await getProfile(user.id);
    expect(profile.rank.key).toBe('novice');

    // 3. Complete 10 exercises (100 XP)
    for (let i = 0; i < 10; i++) {
      await completeExercise(user.id);
    }

    // 4. Verify rank up to Trainee
    profile = await getProfile(user.id);
    expect(profile.rank.key).toBe('trainee');
    expect(profile.rank.totalXp).toBe(100);
  });
});

describe('Ghost Mode Flow', () => {
  it('should hide user from leaderboard when enabled', async () => {
    const user = await createTestUser();
    await grantXp(user.id, 1000);

    // 1. Verify user appears on leaderboard
    let leaderboard = await getLeaderboard();
    expect(leaderboard.entries.map(e => e.userId)).toContain(user.id);

    // 2. Enable ghost mode
    await updateProfile(user.id, { ghostMode: true });

    // 3. Verify user no longer on leaderboard
    leaderboard = await getLeaderboard();
    expect(leaderboard.entries.map(e => e.userId)).not.toContain(user.id);

    // 4. Verify user can still see own profile
    const profile = await getProfile(user.id, { asUser: user.id });
    expect(profile.rank.totalXp).toBe(1000);
  });
});
```

---

## Section 6: Output Format

### 6.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MuscleMap Architecture                            │
│                         Ranking & Leaderboard System                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Web App   │  │  iOS App    │  │ Android App │  │  Admin Dashboard    │ │
│  │   (Vite)    │  │   (Expo)    │  │   (Expo)    │  │     (Future)        │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                │                     │           │
│         └────────────────┴────────────────┴─────────────────────┘           │
│                                    │                                         │
│                          HTTPS / WebSocket                                   │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Reverse Proxy                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                              Caddy                                           │
│                     (SSL termination, rate limiting)                         │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Server (PM2)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         Fastify HTTP Server                              ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ ││
│  │  │   Profile    │  │  Leaderboard │  │    Rank      │  │     XP       │ ││
│  │  │   Routes     │  │    Routes    │  │   Routes     │  │   Routes     │ ││
│  │  │              │  │              │  │              │  │  (internal)  │ ││
│  │  │ GET /profile │  │ GET /leader  │  │ GET /rank    │  │ POST /xp     │ ││
│  │  │ PUT /profile │  │   board      │  │              │  │ GET /history │ ││
│  │  │ POST /photo  │  │              │  │              │  │              │ ││
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ ││
│  │         │                 │                 │                 │         ││
│  │         └─────────────────┴─────────────────┴─────────────────┘         ││
│  │                                    │                                     ││
│  │                                    ▼                                     ││
│  │  ┌───────────────────────────────────────────────────────────────────┐  ││
│  │  │                         Service Layer                              │  ││
│  │  ├───────────────────────────────────────────────────────────────────┤  ││
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │  ││
│  │  │  │    Rank      │  │     XP       │  │      Leaderboard         │ │  ││
│  │  │  │   Service    │  │   Service    │  │       Service            │ │  ││
│  │  │  │              │  │              │  │                          │ │  ││
│  │  │  │ computeRank  │  │ logXpEvent   │  │ getLeaderboard           │ │  ││
│  │  │  │ getRankInfo  │  │ checkVelocity│  │ refreshCache             │ │  ││
│  │  │  │ getThresholds│  │ flagAnomaly  │  │ applyPrivacyFilters      │ │  ││
│  │  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │  ││
│  │  │                                                                    │  ││
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────��──┐ │  ││
│  │  │  │   Profile    │  │    Image     │  │       Privacy            │ │  ││
│  │  │  │   Service    │  │  Processing  │  │       Service            │ │  ││
│  │  │  │              │  │              │  │                          │ │  ││
│  │  │  │ getProfile   │  │ processImage │  │ sanitizeForViewer        │ │  ││
│  │  │  │ updateProfile│  │ cropImage    │  │ applyFieldPrivacy        │ │  ││
│  │  │  │ sanitizeHtml │  │ stripExif    │  │ checkGhostMode           │ │  ││
│  │  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │  ││
│  │  └───────────────────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐
│      PostgreSQL      │  │  File Storage    │  │     Background Worker        │
├──────────────────────┤  │    (S3/local)    │  │         (PM2)                │
│                      │  ├──────────────────┤  ├──────────────────────────────┤
│  Tables:             │  │                  │  │                              │
│  - users             │  │  /photos/        │  │  Jobs:                       │
│  - user_ranks        │  │    originals/    │  │  - refreshExpiredLeaderboards│
│  - xp_transactions   │  │    thumbnails/   │  │  - detectXpAnomalies         │
│  - leaderboard_cache │  │  /avatars/       │  │  - computeVeteranBadges      │
│  - user_profile_ext  │  │                  │  │  - cleanupOldTransactions    │
│  - rank_thresholds   │  │                  │  │                              │
│  - xp_velocity_limits│  │                  │  │  Schedule:                   │
│  - xp_anomaly_flags  │  │                  │  │  - Every 5 min: leaderboard  │
│  - profile_audit_log │  │                  │  │  - Every hour: anomalies     │
│                      │  │                  │  │  - Daily: veteran badges     │
└──────────────────────┘  └──────────────────┘  └──────────────────────────────┘
```

### 6.2 Prioritized Task List

#### Database Tasks

| # | Task | Complexity | Dependencies | Status |
|---|------|------------|--------------|--------|
| D1 | Create rank_thresholds table | S | None | ✅ Done (migration 047) |
| D2 | Create user_ranks table | S | None | ✅ Done (migration 047) |
| D3 | Create xp_transactions table | S | None | ✅ Done (migration 047) |
| D4 | Create leaderboard_cache table | M | None | ✅ Done (migration 050) |
| D5 | Create user_profile_extended table | M | None | ✅ Done (migration 049) |
| D6 | Create xp_velocity_limits table | S | None | 🔲 Pending |
| D7 | Create xp_anomaly_flags table | S | None | 🔲 Pending |
| D8 | Create profile_audit_log table | S | None | 🔲 Pending |
| D9 | Add indexes for leaderboard queries | M | D1-D5 | ✅ Done (migration 050) |
| D10 | Seed rank_thresholds data | S | D1 | 🔲 Pending |

#### Backend Tasks

| # | Task | Complexity | Dependencies | Status |
|---|------|------------|--------------|--------|
| B1 | Implement XP service (logXpEvent) | M | D2, D3 | ✅ Done |
| B2 | Implement rank computation | S | D1, D2 | ✅ Done |
| B3 | Implement velocity checks | M | D6 | 🔲 Pending |
| B4 | Implement anomaly detection | M | D7, B1 | 🔲 Pending |
| B5 | Profile GET endpoint | M | D5 | ✅ Done |
| B6 | Profile PUT endpoint | M | D5, B10 | ✅ Partial |
| B7 | Photo upload endpoint | M | None | 🔲 Pending |
| B8 | Photo edit endpoint | M | B7 | 🔲 Pending |
| B9 | Leaderboard GET endpoint | L | D4, B10 | ✅ Done |
| B10 | Privacy filter service | M | D5 | ✅ Done |
| B11 | Ghost mode enforcement | S | B10 | ✅ Done |
| B12 | Leaderboard cache refresh job | M | D4, B9 | 🔲 Pending |
| B13 | Rich text sanitization | S | None | 🔲 Pending |
| B14 | Image processing pipeline | M | B7 | 🔲 Pending |
| B15 | Veteran badge computation | S | D5 | 🔲 Pending |
| B16 | XP backfill script | M | B1, B2 | 🔲 Pending |

#### Frontend Tasks

| # | Task | Complexity | Dependencies | Status |
|---|------|------------|--------------|--------|
| F1 | RankBadge component | S | B2 | ✅ Done |
| F2 | UserCard component | S | F1 | 🔲 Pending |
| F3 | ProfileHeader component | M | F1, B5 | 🔲 Pending |
| F4 | Leaderboard page | L | F2, B9 | ✅ Done (basic) |
| F5 | Leaderboard filters UI | M | F4 | 🔲 Pending |
| F6 | EditProfile page | L | B6 | 🔲 Pending |
| F7 | Image upload UI | M | B7 | 🔲 Pending |
| F8 | Image editor component | L | F7, B8 | 🔲 Pending |
| F9 | Rich text editor component | M | B13 | 🔲 Pending |
| F10 | Privacy toggles UI | S | F6 | 🔲 Pending |
| F11 | Ghost mode toggle UI | S | F6, B11 | 🔲 Pending |
| F12 | Veteran badge display | S | B15 | 🔲 Pending |
| F13 | Rank-up animation | M | F1 | 🔲 Pending |
| F14 | XP progress indicator | S | B2 | 🔲 Pending |

#### DevOps & Testing Tasks

| # | Task | Complexity | Dependencies | Status |
|---|------|------------|--------------|--------|
| O1 | Feature flag system | M | None | 🔲 Pending |
| O2 | Unit tests for rank logic | S | B2 | 🔲 Pending |
| O3 | Unit tests for privacy filters | S | B10 | 🔲 Pending |
| O4 | Integration tests for APIs | M | B5, B6, B9 | 🔲 Pending |
| O5 | E2E tests for rank progression | M | F1, F4 | 🔲 Pending |
| O6 | E2E tests for ghost mode | M | F11 | 🔲 Pending |
| O7 | Analytics event tracking | M | B1 | 🔲 Pending |
| O8 | Error monitoring setup | S | None | 🔲 Pending |
| O9 | Performance monitoring | M | B9, B12 | 🔲 Pending |
| O10 | Load testing for leaderboards | M | B9, B12 | 🔲 Pending |

### 6.3 Pseudocode

#### computeUserRank

```typescript
/**
 * Computes the rank for a user based on their total XP.
 * Returns the rank info including display name, insignia, and progress.
 */
function computeUserRank(userId: string): Promise<UserRankInfo> {
  // 1. Get user's total XP from user_ranks table
  const userRank = await db.user_ranks.findUnique({
    where: { user_id: userId }
  });

  if (!userRank) {
    // New user - create initial rank record
    return createInitialRank(userId);
  }

  // 2. Get user's rank name style preference
  const profile = await db.user_profile_extended.findUnique({
    where: { user_id: userId },
    select: { rank_name_style: true }
  });
  const nameStyle = profile?.rank_name_style || 'neutral';

  // 3. Get all rank thresholds, ordered by min_xp descending
  const thresholds = await db.rank_thresholds.findMany({
    orderBy: { min_xp: 'desc' }
  });

  // 4. Find the highest rank the user qualifies for
  const currentThreshold = thresholds.find(t => t.min_xp <= userRank.total_xp);

  // 5. Find the next rank (if any)
  const currentIndex = thresholds.indexOf(currentThreshold);
  const nextThreshold = currentIndex > 0 ? thresholds[currentIndex - 1] : null;

  // 6. Calculate XP to next rank
  const xpToNextRank = nextThreshold
    ? nextThreshold.min_xp - userRank.total_xp
    : null;

  // 7. Select display name based on user preference
  let displayName: string;
  switch (nameStyle) {
    case 'masculine':
      displayName = currentThreshold.display_name_masculine
        || currentThreshold.display_name_neutral;
      break;
    case 'feminine':
      displayName = currentThreshold.display_name_feminine
        || currentThreshold.display_name_neutral;
      break;
    default:
      displayName = currentThreshold.display_name_neutral;
  }

  // 8. Return complete rank info
  return {
    key: currentThreshold.rank_key,
    displayName,
    totalXp: userRank.total_xp,
    xpToNextRank,
    insigniaType: currentThreshold.insignia_type,
    insigniaCount: currentThreshold.insignia_count,
    colorPrimary: currentThreshold.color_primary,
    colorSecondary: currentThreshold.color_secondary
  };
}
```

#### getLeaderboard

```typescript
/**
 * Retrieves leaderboard data with privacy filters applied.
 * Uses cached data when available, falls back to live query.
 */
async function getLeaderboard(
  filters: LeaderboardFilters,
  requesterId: string | null
): Promise<LeaderboardResponse> {
  // 1. Build cache key from filters
  const cacheKey = buildCacheKey(filters);

  // 2. Check cache
  const cached = await db.leaderboard_cache.findUnique({
    where: {
      stat_type_time_window_scope_type_scope_value: {
        stat_type: filters.stat,
        time_window: filters.window,
        scope_type: filters.scopeType || 'global',
        scope_value: filters.scopeValue || null
      }
    }
  });

  // 3. If cache valid, use it
  if (cached && cached.expires_at > new Date()) {
    return formatCachedLeaderboard(cached, filters, requesterId);
  }

  // 4. Build live query
  const query = buildLeaderboardQuery(filters);

  // 5. Execute query with privacy WHERE clauses
  const whereClause = {
    AND: [
      { ghost_mode: false }, // Never show ghost users

      // Country filter (if specified)
      filters.country ? {
        country_code: filters.country,
        location_visibility: { in: ['country', 'state', 'city'] }
      } : {},

      // Gender filter (if specified)
      filters.gender ? {
        gender: filters.gender,
        show_gender: true
      } : {},

      // Age bracket filter (if specified)
      filters.ageBracket ? {
        age_bracket: filters.ageBracket,
        show_age_bracket: true
      } : {},

      // Ability filter (if specified)
      filters.ability ? {
        physical_ability: filters.ability,
        show_ability: true
      } : {},

      // Time window filter
      filters.window === 'this_month' ? {
        updated_at: { gte: startOfMonth(new Date()) }
      } : filters.window === 'this_week' ? {
        updated_at: { gte: startOfWeek(new Date()) }
      } : {}
    ]
  };

  // 6. Get stat column to sort by
  const statColumn = getStatColumn(filters.stat);

  // 7. Execute query
  const results = await db.$queryRaw`
    SELECT
      ur.user_id,
      ur.${sql.raw(statColumn)} as stat_value,
      ur.total_xp,
      ur.current_rank,
      ur.rank_achieved_at,
      upe.display_name,
      upe.avatar_url,
      CASE WHEN upe.show_gender THEN upe.gender ELSE NULL END as gender,
      CASE WHEN upe.show_age_bracket THEN upe.age_bracket ELSE NULL END as age_bracket,
      CASE WHEN upe.show_ability THEN upe.physical_ability ELSE NULL END as ability,
      CASE WHEN upe.location_visibility != 'hidden' THEN upe.country_code ELSE NULL END as country,
      upe.languages,
      ROW_NUMBER() OVER (
        ORDER BY ur.${sql.raw(statColumn)} DESC,
                 ur.rank_achieved_at ASC,
                 ur.total_xp DESC,
                 upe.display_name ASC
      ) as position
    FROM user_ranks ur
    JOIN user_profile_extended upe ON ur.user_id = upe.user_id
    WHERE ${buildWhereClause(whereClause)}
    ORDER BY position ASC
    LIMIT ${filters.limit || 50}
    OFFSET ${((filters.page || 1) - 1) * (filters.limit || 50)}
  `;

  // 8. Find requester's position (if logged in and not ghost)
  let currentUserPosition: number | null = null;
  if (requesterId) {
    const requesterProfile = await db.user_profile_extended.findUnique({
      where: { user_id: requesterId },
      select: { ghost_mode: true }
    });

    if (!requesterProfile?.ghost_mode) {
      currentUserPosition = await findUserPosition(requesterId, filters);
    }
  }

  // 9. Get total count for pagination
  const totalCount = await db.$queryRaw`
    SELECT COUNT(*) as count
    FROM user_ranks ur
    JOIN user_profile_extended upe ON ur.user_id = upe.user_id
    WHERE ${buildWhereClause(whereClause)}
  `;

  // 10. Update cache
  await updateLeaderboardCache(filters, results, totalCount[0].count);

  // 11. Format and return response
  return {
    entries: results.map(r => ({
      position: r.position,
      userId: r.user_id,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      rank: await computeUserRank(r.user_id),
      statValue: r.stat_value,
      gender: r.gender,
      ageBracket: r.age_bracket,
      ability: r.ability,
      country: r.country,
      languages: r.languages || [],
      isCurrentUser: r.user_id === requesterId
    })),
    total: totalCount[0].count,
    page: filters.page || 1,
    limit: filters.limit || 50,
    hasMore: (filters.page || 1) * (filters.limit || 50) < totalCount[0].count,
    currentUserPosition,
    computedAt: new Date().toISOString(),
    filters: {
      stat: filters.stat,
      window: filters.window,
      country: filters.country || null,
      state: filters.state || null,
      city: filters.city || null,
      gender: filters.gender || null,
      ageBracket: filters.ageBracket || null,
      ability: filters.ability || null,
      language: filters.language || null
    }
  };
}
```

#### logXpEvent

```typescript
/**
 * Logs an XP event with idempotency, velocity checks, and rank updates.
 * Returns the transaction result and any rank changes.
 */
async function logXpEvent(
  userId: string,
  source: string,
  amount: number,
  sourceId?: string,
  description?: string,
  metadata?: Record<string, unknown>
): Promise<XpEventResult> {
  // 1. Idempotency check - prevent duplicate transactions
  if (sourceId) {
    const existing = await db.xp_transactions.findFirst({
      where: {
        user_id: userId,
        source,
        source_id: sourceId
      }
    });

    if (existing) {
      return {
        success: true,
        transactionId: existing.id,
        newTotalXp: await getTotalXp(userId),
        rankChanged: false,
        duplicate: true
      };
    }
  }

  // 2. Velocity check - prevent gaming
  const velocityCheck = await checkXpVelocity(userId, source, amount);
  if (!velocityCheck.allowed) {
    return {
      success: false,
      error: velocityCheck.reason,
      blocked: true
    };
  }

  // 3. Anomaly detection
  const anomalyCheck = await checkForAnomalies(userId, source, amount, metadata);
  if (anomalyCheck.flagged) {
    await db.xp_anomaly_flags.create({
      data: {
        user_id: userId,
        flag_type: anomalyCheck.type,
        severity: anomalyCheck.severity,
        details: {
          source,
          amount,
          reason: anomalyCheck.reason
        }
      }
    });

    // Block if severe, otherwise just flag
    if (anomalyCheck.severity === 'critical') {
      return {
        success: false,
        error: 'Transaction flagged for review',
        blocked: true
      };
    }
  }

  // 4. Begin transaction
  const result = await db.$transaction(async (tx) => {
    // 4a. Insert XP transaction
    const transaction = await tx.xp_transactions.create({
      data: {
        user_id: userId,
        amount,
        source,
        source_id: sourceId,
        description,
        metadata: metadata || {}
      }
    });

    // 4b. Update user_ranks atomically
    const updatedRank = await tx.user_ranks.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        total_xp: amount,
        current_rank: computeRankFromXp(amount),
        [getIncrementField(source)]: 1
      },
      update: {
        total_xp: { increment: amount },
        [getIncrementField(source)]: { increment: 1 },
        last_activity_at: new Date(),
        updated_at: new Date()
      }
    });

    return { transaction, updatedRank };
  });

  // 5. Check for rank change
  const previousRank = await getPreviousRank(userId);
  const newRankKey = computeRankFromXp(result.updatedRank.total_xp);
  const rankChanged = previousRank !== newRankKey;

  // 6. If rank changed, update and emit event
  if (rankChanged) {
    await db.user_ranks.update({
      where: { user_id: userId },
      data: {
        current_rank: newRankKey,
        rank_achieved_at: new Date()
      }
    });

    // Emit rank-up event for notifications/animations
    await emitEvent('rank_up', {
      userId,
      previousRank,
      newRank: newRankKey,
      totalXp: result.updatedRank.total_xp
    });
  }

  // 7. Log analytics event
  await trackEvent('xp_earned', {
    userId,
    source,
    amount,
    newTotalXp: result.updatedRank.total_xp,
    rankChanged,
    newRank: rankChanged ? newRankKey : undefined
  });

  // 8. Return result
  return {
    success: true,
    transactionId: result.transaction.id,
    newTotalXp: result.updatedRank.total_xp,
    rankChanged,
    newRank: rankChanged ? await computeUserRank(userId) : undefined
  };
}

// Helper: Map source to increment field
function getIncrementField(source: string): string {
  switch (source) {
    case 'exercise_completion':
      return 'exercises_completed';
    case 'goal_completed':
      return 'goals_completed';
    case 'archetype_completed':
      return 'archetypes_completed';
    default:
      return null; // No increment field
  }
}

// Helper: Compute rank from XP value
function computeRankFromXp(xp: number): string {
  const thresholds = [
    { key: 'grandmaster', min: 60000 },
    { key: 'master', min: 25000 },
    { key: 'expert', min: 10000 },
    { key: 'journeyperson', min: 4000 },
    { key: 'practitioner', min: 1500 },
    { key: 'apprentice', min: 500 },
    { key: 'trainee', min: 100 },
    { key: 'novice', min: 0 }
  ];

  return thresholds.find(t => xp >= t.min)?.key || 'novice';
}
```

### 6.4 Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Leaderboard query slowness** | Medium | High | Pre-aggregation in leaderboard_cache table; background refresh jobs; pagination limits (max 100); database indexes on filter columns; consider Redis cache for hot queries |
| **XP gaming/cheating** | Medium | Medium | Velocity limits per source; anomaly detection flags; audit log for manual review; rate limiting on XP-granting endpoints; cap maximum XP per time period |
| **Privacy data leak** | Low | Critical | Field-level privacy controls in database; API-level enforcement of privacy settings; sanitization before JSON response; security review of all profile endpoints; penetration testing |
| **Schema migration issues** | Low | High | Test migrations on staging environment; maintain rollback scripts; backup database before major migrations; use feature flags to decouple deploy from enable |
| **Image processing failures** | Medium | Medium | Client-side validation before upload; server-side retry with exponential backoff; fallback to default avatar; error tracking alerts; CDN for processed images |
| **Ghost mode bypass** | Low | High | Server-side enforcement (never trust client); database-level constraints; comprehensive integration tests; security audit of all user-listing queries |
| **Rich text XSS** | Low | Critical | Server-side sanitization with strict allowlist; no client-side HTML rendering of raw input; Content Security Policy headers; regular dependency updates for sanitization library |
| **Rank threshold changes break leaderboards** | Low | Medium | Background job to recalculate all ranks; feature flag to disable rank display during migration; idempotent rank computation |
| **Veteran badge date manipulation** | Low | Low | Use account_created_at from users table (immutable); server-side computation only; no client input for tenure |
| **Concurrent XP updates race condition** | Medium | Low | Database-level atomic updates with increment; transaction isolation; idempotency keys for duplicate prevention |

### 6.5 Definition of Done Checklist

#### Database
- [ ] Migration 051: Add xp_velocity_limits table
- [ ] Migration 052: Add xp_anomaly_flags table
- [ ] Migration 053: Add profile_audit_log table
- [ ] Migration 054: Seed rank_thresholds data
- [ ] All indexes created and verified with EXPLAIN ANALYZE
- [ ] Foreign key constraints working correctly

#### Backend API
- [ ] `GET /api/profile/:userId` returns privacy-filtered data
- [ ] `PUT /api/profile` validates and sanitizes all inputs
- [ ] `POST /api/profile/photo` handles upload with size/type validation
- [ ] `PUT /api/profile/photo/edit` applies transformations correctly
- [ ] `GET /api/leaderboard` supports all filter combinations
- [ ] `GET /api/rank/:userId` returns complete rank info
- [ ] `POST /api/xp/event` enforces velocity limits
- [ ] Ghost mode users excluded from all public listings
- [ ] All endpoints have rate limiting configured

#### Frontend Components
- [ ] `<RankBadge>` renders correctly at all sizes
- [ ] `<UserCard>` displays rank, stats, and veteran badge
- [ ] `<ProfileHeader>` shows all public profile info
- [ ] `<Leaderboard>` supports filtering and pagination
- [ ] `<EditProfile>` has working privacy toggles
- [ ] Image editor crop/rotate/brightness functional
- [ ] Rich text editor with sanitization preview
- [ ] Ghost mode toggle with confirmation modal

#### Privacy & Security
- [ ] Rich text sanitization prevents all XSS vectors
- [ ] Image uploads strip EXIF metadata
- [ ] Privacy settings respected in API responses
- [ ] Ghost users return 404 to other users
- [ ] Rate limits enforced on all endpoints
- [ ] Audit log captures profile changes

#### Testing
- [ ] Unit tests pass for rank computation
- [ ] Unit tests pass for privacy filtering
- [ ] Integration tests pass for all API endpoints
- [ ] E2E tests pass for rank progression flow
- [ ] E2E tests pass for ghost mode flow
- [ ] Load tests pass for leaderboard queries (<200ms p95)

#### Data & Rollout
- [ ] XP backfill script executed successfully
- [ ] All existing users have rank records
- [ ] Feature flags configured in production
- [ ] Gradual rollout plan documented
- [ ] Rollback procedure tested

#### Monitoring & Analytics
- [ ] XP events tracked in analytics
- [ ] Leaderboard performance monitored
- [ ] Error rates tracked for image processing
- [ ] Anomaly detection alerts configured

#### Documentation
- [ ] API documentation updated
- [ ] Component storybook updated
- [ ] Privacy policy updated for new data collection
- [ ] User-facing help docs for rank system

---

## Appendix A: Privacy Policy Considerations

### Data Collection Disclosure

Users must be informed that we collect:
- **Gender** (optional, self-declared)
- **Age bracket** (optional, no exact birthdate)
- **Physical ability category** (optional, self-declared)
- **Location** (precise coordinates stored, displayed at user-selected granularity)
- **Languages spoken** (optional)

### COPPA Compliance (Users 13-17)

- Age bracket "13-17" triggers additional protections
- Default location visibility: "Country only" (cannot select city/state)
- Parental consent flow (implementation deferred - placeholder)
- No PII collection beyond minimum necessary

### GDPR/CCPA Considerations

- Right to delete: Ghost mode + account deletion must purge all data
- Right to access: User can export their data
- Right to rectify: User can edit all personal data
- Data minimization: Only collect what's needed for features

---

## Appendix B: Localization

### Supported Languages (Initial)

| Code | Language | Flag |
|------|----------|------|
| en | English | 🇺🇸 |
| es | Spanish | 🇪🇸 |
| fr | French | 🇫🇷 |
| de | German | 🇩🇪 |
| pt | Portuguese | 🇧🇷 |
| ja | Japanese | 🇯🇵 |
| ko | Korean | 🇰🇷 |
| zh | Chinese | 🇨🇳 |

### Rank Name Translations

| Rank | English | Spanish | French |
|------|---------|---------|--------|
| Novice | Novice | Novato | Novice |
| Trainee | Trainee | Aprendiz | Stagiaire |
| Apprentice | Apprentice | Aprendiz | Apprenti |
| Practitioner | Practitioner | Practicante | Praticien |
| Journeyperson | Journeyperson | Oficial | Compagnon |
| Expert | Expert | Experto | Expert |
| Master | Master | Maestro | Maître |
| Grandmaster | Grandmaster | Gran Maestro | Grand Maître |

---

*Document generated: January 2025*
*Last updated: [Auto-update on merge]*
