# Hidden Features Exposure Plan

## Executive Summary

MuscleMap has **42+ backend modules** with extensive GraphQL APIs, but the frontend only exposes approximately **60% of functionality**. This plan outlines a phased approach to safely expose the remaining 40% of hidden features to users and flesh out admin capabilities.

**Estimated Timeline:** 8-12 weeks for full implementation
**Risk Level:** Low-Medium (most features are backend-complete)

---

## Table of Contents

1. [Phase 1: Quick Wins (Week 1-2)](#phase-1-quick-wins-week-1-2)
2. [Phase 2: Economy & Social Features (Week 3-4)](#phase-2-economy--social-features-week-3-4)
3. [Phase 3: Advanced Mascot Powers (Week 5-6)](#phase-3-advanced-mascot-powers-week-5-6)
4. [Phase 4: AI & Premium Features (Week 7-8)](#phase-4-ai--premium-features-week-7-8)
5. [Phase 5: B2B & Enterprise (Week 9-10)](#phase-5-b2b--enterprise-week-9-10)
6. [Phase 6: Admin Empire Completion (Week 11-12)](#phase-6-admin-empire-completion-week-11-12)
7. [Feature-by-Feature Implementation Guide](#feature-by-feature-implementation-guide)
8. [GraphQL Queries to Add to Frontend](#graphql-queries-to-add-to-frontend)
9. [New Pages & Components Required](#new-pages--components-required)
10. [Risk Assessment & Safety Checklist](#risk-assessment--safety-checklist)

---

## Phase 1: Quick Wins (Week 1-2)

**Goal:** Expose low-risk, high-value features that are already production-ready.

### 1.1 Journey Health Dashboard

**Backend Status:** ✅ Complete
**Risk:** Low
**Value:** High (user retention)

**What to expose:**
- Journey health score visualization
- Health alerts with actionable recommendations
- Stalled journey detection with nudges
- Progress recommendations

**Implementation:**
```
Location: Add to /journey page or new /journey/health route
Components needed:
  - JourneyHealthScore.tsx (circular progress with score)
  - JourneyHealthAlerts.tsx (dismissible alert cards)
  - JourneyRecommendations.tsx (actionable suggestion list)
```

**GraphQL queries to use:**
```graphql
journeyHealth(journeyId: ID!)
journeyHealthAlerts(journeyId: ID, status: String, limit: Int)
journeyRecommendations(journeyId: ID!)
stalledJourneys(thresholdDays: Int)
```

### 1.2 Recovery Recommendations

**Backend Status:** ✅ Complete
**Risk:** Low
**Value:** High (injury prevention)

**What to expose:**
- Sleep goal setting UI
- Recovery score display (already partial)
- Recovery recommendations cards
- Weekly sleep stats visualization

**Implementation:**
```
Location: Enhance /recovery page
Components needed:
  - SleepGoalSetter.tsx (goal configuration modal)
  - RecoveryRecommendationCard.tsx (actionable cards)
  - WeeklySleepChart.tsx (bar chart visualization)
```

**GraphQL queries to use:**
```graphql
sleepGoal
recoveryRecommendations
weeklySleepStats(weeks: Int)
generateRecoveryRecommendations (mutation)
```

### 1.3 RPE/Autoregulation Display

**Backend Status:** ✅ Complete
**Risk:** Low
**Value:** Medium (advanced users)

**What to expose:**
- RPE trends for exercises
- Fatigue analysis alerts
- Auto-regulation suggestions during workout

**Implementation:**
```
Location: Add to workout logging and /stats page
Components needed:
  - RPETrendChart.tsx (line chart per exercise)
  - FatigueAlertBanner.tsx (warning banner)
  - AutoRegulationSuggestion.tsx (inline suggestion)
```

**GraphQL queries to use:**
```graphql
rpeTrends(exerciseId: ID!, days: Int)
rpeFatigue
rpeTarget(exerciseId: ID!)
rpeAutoregulate (mutation)
```

### 1.4 Progression Targets & Recommendations

**Backend Status:** ✅ Complete
**Risk:** Low
**Value:** High (goal-oriented users)

**What to expose:**
- Personal progression targets
- AI-generated progression recommendations
- Exercise-specific progress tracking

**Implementation:**
```
Location: Add to /progression and /exercises/:id pages
Components needed:
  - ProgressionTargetCard.tsx (target with progress bar)
  - ProgressionRecommendationList.tsx (AI suggestions)
  - CreateTargetModal.tsx (set new targets)
```

**GraphQL queries to use:**
```graphql
progressionTargets(exerciseId: ID, includeCompleted: Boolean)
progressionRecommendations(limit: Int)
progressionExerciseRecommendation(exerciseId: ID!)
createProgressionTarget (mutation)
```

---

## Phase 2: Economy & Social Features (Week 3-4)

**Goal:** Unlock the full credit economy and social spending system.

### 2.1 Complete Credit Economy UI

**Backend Status:** ✅ Production-ready (16 services)
**Risk:** Medium (involves virtual currency)
**Value:** Very High (engagement & monetization)

**Features to expose:**

| Feature | Current State | Action Needed |
|---------|---------------|---------------|
| Tipping system | ❌ Hidden | Add tip button to profiles |
| Super High Fives | ❌ Hidden | Add to high-five flow |
| Post boosting | ❌ Hidden | Add boost button to feed |
| Gift sending | ❌ Hidden | Add gift modal to profiles |
| Credit loans (mascot) | ❌ Hidden | Add to mascot panel |
| Bonus events | ❌ Hidden | Add events banner |
| Credit packages | ❌ Hidden | Create purchase UI |

**Implementation:**

```
New pages:
  - /credits/store - Credit package purchase
  - /credits/earn - Earning opportunities

New components:
  - TipButton.tsx - Send tip to user
  - GiftModal.tsx - Send gift with credits
  - BoostButton.tsx - Boost a post
  - SuperHighFiveModal.tsx - Premium high-five
  - BonusEventBanner.tsx - Active bonus display
  - CreditPackageCard.tsx - Purchase options
  - EarnOpportunitiesList.tsx - Ways to earn
```

**GraphQL queries/mutations:**
```graphql
# Queries
creditEarningSummary
creditEarnEvents(unreadOnly: Boolean, limit: Int)
bonusEventTypes(enabledOnly: Boolean)
bonusEventHistory(limit: Int)
creditPackages

# Mutations
sendTip(input: TipInput!)
sendGift(input: GiftInput!)
sendSuperHighFive(input: SuperHighFiveInput!)
boostPost(input: PostBoostInput!)
markEarnEventsShown(eventIds: [ID!]!)
```

**Safety considerations:**
- Add confirmation dialogs for all spending
- Show running balance during transactions
- Add daily spending limits option
- Log all transactions for audit

### 2.2 Enhanced Social Features

**Backend Status:** ✅ Complete
**Risk:** Low
**Value:** High (community engagement)

**Features to expose:**

| Feature | Current State | Action Needed |
|---------|---------------|---------------|
| Activity feed preferences | ❌ Hidden | Add to settings |
| Activity sharing | ❌ Hidden | Add share button |
| Suggested users | Partial | Improve UI |
| Follow system | ✅ Basic | Enhance UX |

**Implementation:**
```
Enhance existing pages:
  - /community - Add feed preferences toggle
  - /profile/:id - Add suggested users sidebar

New components:
  - FeedPreferencesModal.tsx
  - ShareActivityModal.tsx
  - SuggestedUserCard.tsx (improved)
```

**GraphQL queries:**
```graphql
feedPreferences
suggestedUsers(limit: Int)
updateFeedPreferences (mutation)
shareActivity (mutation)
```

---

## Phase 3: Advanced Mascot Powers (Week 5-6)

**Goal:** Unlock the full mascot assistant capabilities.

### 3.1 Mascot Smart Features

**Backend Status:** ✅ All 6 phases implemented
**Risk:** Low
**Value:** Very High (unique differentiator)

**Features to expose:**

| Feature | Phase | Action Needed |
|---------|-------|---------------|
| Credit loan offers | Phase 2 | Add loan modal |
| Overtraining alerts | Phase 3 | Add alert banner |
| Workout suggestions | Phase 3 | Add suggestion cards |
| Program generation | Phase 6 | Add generation UI |
| Master abilities | Phase 6 | Add unlock interface |
| Crew suggestions | Phase 4 | Add to crew page |
| Rivalry alerts | Phase 4 | Add to rivals page |
| Negotiated rates | Bonus | Show in trainer booking |

**Implementation:**

```
Enhance CompanionDock.tsx:
  - Add powers menu/panel
  - Show active alerts
  - Quick actions for common powers

New components:
  - MascotLoanOffer.tsx - Emergency credit loan
  - MascotOvertrainingAlert.tsx - Recovery warning
  - MascotWorkoutSuggestion.tsx - Personalized suggestions
  - MascotProgramGenerator.tsx - Full workout program
  - MascotMasterAbilities.tsx - Unlock interface
  - MascotCrewSuggestions.tsx - Team recommendations
  - MascotRivalryAlerts.tsx - Competition alerts
```

**GraphQL queries:**
```graphql
mascotCreditLoanOffer
mascotOvertrainingAlerts
mascotWorkoutSuggestions(limit: Int)
mascotMilestoneProgress
mascotMasterAbilities
mascotGeneratedPrograms(status: String)
mascotCrewSuggestions(limit: Int)
mascotRivalryAlerts(limit: Int)
mascotNegotiatedRate

# Mutations
requestCreditLoan(amount: Int!)
repayCreditLoan(amount: Int!)
acknowledgeOvertrainingAlert(alertId: ID!)
acceptWorkoutSuggestion(suggestionId: ID!)
generateMascotProgram(input: MascotProgramGenerationInput!)
activateGeneratedProgram(programId: ID!)
unlockMasterAbility(abilityKey: String!)
```

### 3.2 Mascot Wardrobe Expansion

**Backend Status:** ✅ Complete
**Risk:** Low
**Value:** Medium (cosmetic engagement)

**What to expose:**
- Full wardrobe browser
- Preset system for quick outfit changes
- Shop with all available cosmetics

**Implementation:**
```
Enhance /buddy page or create /mascot/wardrobe:
  - MascotWardrobeBrowser.tsx
  - MascotPresetManager.tsx
  - MascotShopGrid.tsx
```

---

## Phase 4: AI & Premium Features (Week 7-8)

**Goal:** Launch the Prescription Engine v3 and premium features.

### 4.1 Prescription Engine v3

**Backend Status:** ⚠️ Algorithm ready, UI integration pending
**Risk:** Medium (complex feature)
**Value:** Extremely High ($500+/year competitive equivalent)

**What it does:**
- 16-factor scoring algorithm
- Biomechanical personalization
- Recovery-aware recommendations
- Adaptive learning from feedback

**Implementation:**

```
New pages:
  - /prescription/generate - AI workout builder
  - /prescription/biomechanics - User profile setup
  - /prescription/history - Past prescriptions

New components:
  - PrescriptionWizard.tsx - Multi-step generation
  - BiomechanicsForm.tsx - User physical data input
  - PrescriptionResults.tsx - Generated workout display
  - PrescriptionFeedback.tsx - Post-workout feedback
  - ExerciseScoreBreakdown.tsx - Why this exercise?
```

**GraphQL:**
```graphql
# Mutations
generatePrescriptionV3(input: PrescriptionInputV3!)
submitPrescriptionFeedback(input: PrescriptionFeedbackInput!)

# Types needed in frontend
input PrescriptionInputV3 {
  targetMuscleGroups: [String!]!
  availableEquipment: [ID!]!
  duration: Int!
  difficulty: DifficultyLevel!
  goals: [String!]
  excludeExercises: [ID!]
  preferRecoveryFriendly: Boolean
}
```

**Phased rollout:**
1. Week 7: Biomechanics profile collection
2. Week 8: Basic prescription generation
3. Week 9+: Feedback loop & adaptive learning

### 4.2 Training Program Enrollment

**Backend Status:** ✅ Complete
**Risk:** Low
**Value:** High (guided journeys)

**What to expose:**
- Program browsing & enrollment
- Today's workout from program
- Program progress tracking
- Pause/resume/drop enrollment

**Implementation:**
```
Enhance /templates page or create /programs:
  - ProgramBrowser.tsx - Search & filter
  - ProgramDetail.tsx - Full program view
  - EnrollmentProgress.tsx - Progress tracker
  - TodaysWorkout.tsx - Dashboard widget
```

**GraphQL:**
```graphql
trainingPrograms(input: ProgramSearchInput)
trainingProgram(id: ID!)
featuredPrograms(limit: Int)
myEnrollments(status: String, limit: Int, offset: Int)
todaysWorkout(programId: ID)
enrollInProgram(programId: ID!)
recordProgramWorkout(programId: ID!)
```

### 4.3 Wearables Integration

**Backend Status:** ⚠️ Framework ready, no pairing UI
**Risk:** Medium (external integrations)
**Value:** High (data integration)

**What to expose:**
- Device pairing UI
- Sync status & history
- Wearables summary display

**Implementation:**
```
New page: /settings/wearables
Components:
  - WearablePairingCard.tsx (Apple Watch, Garmin, etc.)
  - WearableSyncStatus.tsx
  - WearableDataSummary.tsx
```

**GraphQL:**
```graphql
wearablesSummary
wearablesStatus
wearableConnections
syncWearables (mutation)
```

---

## Phase 5: B2B & Enterprise (Week 9-10)

**Goal:** Launch organization features for gyms and companies.

### 5.1 Organizations Module

**Backend Status:** ⚠️ Core ready, SSO pending
**Risk:** Medium (enterprise complexity)
**Value:** Very High (B2B revenue)

**What to expose:**
- Organization creation & management
- Member invites & roles
- Unit hierarchy (teams/departments)
- Organization dashboard

**Implementation:**
```
New pages:
  - /org - Organization landing
  - /org/:slug - Organization dashboard
  - /org/:slug/members - Member management
  - /org/:slug/teams - Unit hierarchy
  - /org/:slug/settings - Organization settings

Components:
  - OrgCreateWizard.tsx
  - OrgMemberList.tsx
  - OrgUnitTree.tsx
  - OrgInviteModal.tsx
  - OrgRoleSelector.tsx
```

**GraphQL:**
```graphql
organization(id or slug)
myOrganizations
organizationUnits
organizationMembers
createOrganization (mutation)
inviteMembers (mutation)
changeRole (mutation)
```

### 5.2 Mentorship System

**Backend Status:** ✅ Complete
**Risk:** Low
**Value:** High (trainer ecosystem)

**What to expose:**
- Mentor discovery & profiles
- Mentorship requests
- Check-in system
- Mentorship dashboard

**Implementation:**
```
New pages:
  - /mentors - Mentor discovery
  - /mentors/become - Become a mentor
  - /mentorship - Mentorship dashboard
  - /mentorship/:id - Relationship detail

Components:
  - MentorProfileCard.tsx
  - MentorshipRequestModal.tsx
  - CheckInForm.tsx
  - MentorshipTimeline.tsx
```

**GraphQL:**
```graphql
mentors
mentor(userId: ID!)
myMentorProfile
activeMentorships
mentorshipCheckIns
createMentorProfile (mutation)
requestMentorship (mutation)
createCheckIn (mutation)
```

### 5.3 Enhanced Trainer Features

**Backend Status:** ⚠️ Core ready, payments pending
**Risk:** Medium (payments)
**Value:** High (marketplace)

**What to expose:**
- Trainer class scheduling
- Class enrollment
- Trainer programs
- Reviews & ratings

**Implementation:**
```
Enhance /trainers page:
  - TrainerClassSchedule.tsx
  - ClassEnrollmentModal.tsx
  - TrainerProgramList.tsx
  - TrainerReviewSection.tsx
```

---

## Phase 6: Admin Empire Completion (Week 11-12)

**Goal:** Complete the Empire control panel for full administrative capabilities.

### 6.1 Empire Panel Completion

**Current State:** 12 of 25 sections are stubs
**Priority:** Complete the most critical panels first

**Panel Implementation Priority:**

| Panel | Priority | Complexity | Notes |
|-------|----------|------------|-------|
| Server Control | P0 | Medium | PM2 commands, restart, logs |
| Database | P0 | Medium | Query runner, stats, vacuum |
| Security | P0 | High | Auth logs, ban management |
| Alerts | P1 | Medium | Error tracking, notifications |
| Feature Flags | P1 | Low | Toggle features |
| Log Analysis | P1 | Medium | Search & filter logs |
| Backup & Recovery | P1 | High | Backup triggers, restore |
| User Analytics | P2 | Medium | User stats, cohorts |
| Community Management | P2 | Medium | Moderation tools |
| Scheduler | P2 | Medium | Cron job management |
| Environment | P3 | Low | Env var display |

### 6.2 Server Control Panel

**Implementation:**
```tsx
// src/pages/Empire/panels/ServerControlPanel.tsx
Features:
  - PM2 process list with status
  - Restart/reload buttons
  - Real-time log viewer
  - Memory/CPU monitoring
  - Quick command execution
```

**Backend needs:**
- WebSocket endpoint for real-time logs
- PM2 control API endpoints

### 6.3 Database Panel

**Implementation:**
```tsx
// src/pages/Empire/panels/DatabasePanel.tsx
Features:
  - Connection stats (active, idle, waiting)
  - Query runner (read-only by default)
  - Table sizes and indexes
  - Vacuum/analyze triggers
  - Slow query log
```

**Safety:**
- Query whitelist for dangerous operations
- Confirmation for write queries
- Timeout limits

### 6.4 Security Panel

**Implementation:**
```tsx
// src/pages/Empire/panels/SecurityPanel.tsx
Features:
  - Recent auth failures
  - Active sessions
  - IP ban management
  - Suspicious activity log
  - 2FA enforcement status
```

### 6.5 Feature Flags Panel

**Implementation:**
```tsx
// src/pages/Empire/panels/FeatureFlagsPanel.tsx
Features:
  - Toggle features on/off
  - Percentage rollouts
  - User-specific overrides
  - Feature flag audit log
```

**Database migration needed:**
```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  percentage INT DEFAULT 100,
  description TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ
);

CREATE TABLE feature_flag_overrides (
  flag_id UUID REFERENCES feature_flags(id),
  user_id TEXT REFERENCES users(id),
  enabled BOOLEAN NOT NULL,
  PRIMARY KEY (flag_id, user_id)
);
```

### 6.6 Alerts & Monitoring Panel

**Implementation:**
```tsx
// src/pages/Empire/panels/AlertsPanel.tsx
Features:
  - Error rate monitoring
  - Response time alerts
  - Memory/CPU thresholds
  - Custom alert rules
  - Alert history
  - Slack/email integration
```

### 6.7 Backup & Recovery Panel

**Implementation:**
```tsx
// src/pages/Empire/panels/BackupPanel.tsx
Features:
  - Manual backup trigger
  - Backup schedule view
  - Backup history
  - Restore point selection
  - Download backup option
```

### 6.8 User Analytics Panel

**Implementation:**
```tsx
// src/pages/Empire/panels/UserAnalyticsPanel.tsx
Features:
  - User growth charts
  - DAU/WAU/MAU metrics
  - Retention cohorts
  - Feature adoption
  - User segments
```

---

## Feature-by-Feature Implementation Guide

### Quick Reference: Features by Risk Level

#### LOW RISK (Can ship immediately)
1. Journey Health Dashboard
2. Recovery Recommendations
3. RPE/Autoregulation Display
4. Progression Targets
5. Mascot Wardrobe
6. Feed Preferences
7. Suggested Users

#### MEDIUM RISK (Need testing)
1. Credit Economy (tipping, gifts)
2. Mascot Credit Loans
3. Training Programs
4. Wearables Integration
5. Mentorship System

#### HIGHER RISK (Need careful rollout)
1. Prescription Engine v3
2. Organizations Module
3. E2E Encryption
4. Admin Panels

---

## GraphQL Queries to Add to Frontend

Create or update `src/graphql/queries.ts`:

```typescript
// ============================================
// JOURNEY HEALTH (NEW)
// ============================================

export const JOURNEY_HEALTH_QUERY = gql`
  query JourneyHealth($journeyId: ID!) {
    journeyHealth(journeyId: $journeyId) {
      score
      trend
      lastCalculated
      factors {
        name
        score
        weight
      }
    }
  }
`;

export const JOURNEY_HEALTH_ALERTS_QUERY = gql`
  query JourneyHealthAlerts($journeyId: ID, $status: String, $limit: Int) {
    journeyHealthAlerts(journeyId: $journeyId, status: $status, limit: $limit) {
      id
      type
      severity
      message
      actionUrl
      createdAt
    }
  }
`;

export const JOURNEY_RECOMMENDATIONS_QUERY = gql`
  query JourneyRecommendations($journeyId: ID!) {
    journeyRecommendations(journeyId: $journeyId) {
      id
      type
      title
      description
      priority
      actionLabel
      actionUrl
    }
  }
`;

// ============================================
// RECOVERY (ENHANCED)
// ============================================

export const SLEEP_GOAL_QUERY = gql`
  query SleepGoal {
    sleepGoal {
      id
      targetHours
      targetBedtime
      targetWakeTime
      daysActive
    }
  }
`;

export const RECOVERY_RECOMMENDATIONS_QUERY = gql`
  query RecoveryRecommendations {
    recoveryRecommendations {
      id
      type
      title
      description
      priority
      estimatedImpact
    }
  }
`;

export const WEEKLY_SLEEP_STATS_QUERY = gql`
  query WeeklySleepStats($weeks: Int) {
    weeklySleepStats(weeks: $weeks) {
      weekStart
      avgDuration
      avgQuality
      consistency
      daysLogged
    }
  }
`;

// ============================================
// RPE TRACKING (NEW)
// ============================================

export const RPE_TRENDS_QUERY = gql`
  query RpeTrends($exerciseId: ID!, $days: Int) {
    rpeTrends(exerciseId: $exerciseId, days: $days) {
      dates
      rpeValues
      rirValues
      loadValues
      trend
    }
  }
`;

export const RPE_FATIGUE_QUERY = gql`
  query RpeFatigue {
    rpeFatigue {
      overallFatigue
      muscleGroupFatigue {
        muscleGroup
        fatigue
        recoveryHours
      }
      recommendations
    }
  }
`;

// ============================================
// PROGRESSION TARGETS (NEW)
// ============================================

export const PROGRESSION_TARGETS_QUERY = gql`
  query ProgressionTargets($exerciseId: ID, $includeCompleted: Boolean) {
    progressionTargets(exerciseId: $exerciseId, includeCompleted: $includeCompleted) {
      id
      exerciseId
      exerciseName
      targetType
      targetValue
      currentValue
      deadline
      status
    }
  }
`;

export const PROGRESSION_RECOMMENDATIONS_QUERY = gql`
  query ProgressionRecommendations($limit: Int) {
    progressionRecommendations(limit: $limit) {
      id
      exerciseId
      exerciseName
      recommendation
      rationale
      estimatedTimeframe
    }
  }
`;

// ============================================
// CREDIT ECONOMY (NEW)
// ============================================

export const CREDIT_EARNING_SUMMARY_QUERY = gql`
  query CreditEarningSummary {
    creditEarningSummary {
      todayEarned
      weekEarned
      monthEarned
      availableOpportunities
      streakBonus
    }
  }
`;

export const CREDIT_EARN_EVENTS_QUERY = gql`
  query CreditEarnEvents($unreadOnly: Boolean, $limit: Int) {
    creditEarnEvents(unreadOnly: $unreadOnly, limit: $limit) {
      events {
        id
        type
        amount
        description
        createdAt
        shown
      }
      unreadCount
    }
  }
`;

export const BONUS_EVENT_TYPES_QUERY = gql`
  query BonusEventTypes($enabledOnly: Boolean) {
    bonusEventTypes(enabledOnly: $enabledOnly) {
      id
      name
      multiplier
      startTime
      endTime
      description
    }
  }
`;

export const CREDIT_PACKAGES_QUERY = gql`
  query CreditPackages {
    creditPackages {
      id
      name
      credits
      price
      currency
      bonus
      popular
    }
  }
`;

// ============================================
// MASCOT ADVANCED POWERS (NEW)
// ============================================

export const MASCOT_CREDIT_LOAN_OFFER_QUERY = gql`
  query MascotCreditLoanOffer {
    mascotCreditLoanOffer {
      available
      maxAmount
      interestRate
      repaymentDays
      currentLoan {
        amount
        dueDate
        amountOwed
      }
    }
  }
`;

export const MASCOT_OVERTRAINING_ALERTS_QUERY = gql`
  query MascotOvertrainingAlerts {
    mascotOvertrainingAlerts {
      id
      muscleGroup
      severity
      message
      suggestedRestDays
      createdAt
    }
  }
`;

export const MASCOT_WORKOUT_SUGGESTIONS_QUERY = gql`
  query MascotWorkoutSuggestions($limit: Int) {
    mascotWorkoutSuggestions(limit: $limit) {
      id
      type
      title
      description
      exercises {
        id
        name
        sets
        reps
      }
      reason
    }
  }
`;

export const MASCOT_MASTER_ABILITIES_QUERY = gql`
  query MascotMasterAbilities {
    mascotMasterAbilities {
      key
      name
      description
      unlocked
      unlockCost
      requirements
    }
  }
`;

export const MASCOT_GENERATED_PROGRAMS_QUERY = gql`
  query MascotGeneratedPrograms($status: String) {
    mascotGeneratedPrograms(status: $status) {
      id
      name
      description
      duration
      difficulty
      status
      createdAt
    }
  }
`;

// ============================================
// PRESCRIPTION V3 (NEW)
// ============================================

export const GENERATE_PRESCRIPTION_V3_MUTATION = gql`
  mutation GeneratePrescriptionV3($input: PrescriptionInputV3!) {
    generatePrescriptionV3(input: $input) {
      id
      exercises {
        id
        name
        sets
        reps
        weight
        restSeconds
        score
        scoreBreakdown {
          factor
          score
          maxScore
        }
      }
      totalDuration
      targetMuscles
      difficulty
    }
  }
`;

// ============================================
// TRAINING PROGRAMS (NEW)
// ============================================

export const TRAINING_PROGRAMS_QUERY = gql`
  query TrainingPrograms($input: ProgramSearchInput) {
    trainingPrograms(input: $input) {
      id
      name
      description
      duration
      difficulty
      category
      rating
      enrollmentCount
      author {
        id
        username
        avatarUrl
      }
    }
  }
`;

export const TODAYS_WORKOUT_QUERY = gql`
  query TodaysWorkout($programId: ID) {
    todaysWorkout(programId: $programId) {
      day
      workout {
        id
        name
        exercises {
          id
          name
          sets
          reps
        }
      }
      completed
    }
  }
`;

// ============================================
// WEARABLES (NEW)
// ============================================

export const WEARABLES_STATUS_QUERY = gql`
  query WearablesStatus {
    wearablesStatus {
      connected
      lastSync
      connections {
        provider
        status
        lastSync
        deviceName
      }
    }
  }
`;

// ============================================
// MENTORSHIP (NEW)
// ============================================

export const MENTORS_QUERY = gql`
  query Mentors($verified: Boolean, $specialty: String, $limit: Int) {
    mentors(verified: $verified, specialty: $specialty, limit: $limit) {
      userId
      displayName
      avatarUrl
      specialties
      hourlyRate
      rating
      reviewCount
      verified
      maxMentees
      currentMentees
    }
  }
`;

export const ACTIVE_MENTORSHIPS_QUERY = gql`
  query ActiveMentorships {
    activeMentorships {
      id
      mentor {
        userId
        displayName
        avatarUrl
      }
      mentee {
        userId
        displayName
        avatarUrl
      }
      status
      focusAreas
      startDate
      lastCheckIn
    }
  }
`;

// ============================================
// ORGANIZATIONS (NEW)
// ============================================

export const MY_ORGANIZATIONS_QUERY = gql`
  query MyOrganizations {
    myOrganizations {
      id
      name
      slug
      logoUrl
      role
      memberCount
    }
  }
`;

export const ORGANIZATION_QUERY = gql`
  query Organization($id: ID, $slug: String) {
    organization(id: $id, slug: $slug) {
      id
      name
      slug
      description
      logoUrl
      memberCount
      subscription
      settings
      myRole
    }
  }
`;
```

---

## New Pages & Components Required

### Pages to Create

```
src/pages/
├── JourneyHealth.tsx           # Journey health dashboard
├── PrescriptionBuilder.tsx     # AI workout generator
├── PrescriptionHistory.tsx     # Past prescriptions
├── BiomechanicsProfile.tsx     # User physical data setup
├── CreditStore.tsx             # Purchase credits
├── CreditEarn.tsx              # Earning opportunities
├── MascotPowers.tsx            # Full mascot powers interface
├── Programs.tsx                # Training program browser
├── ProgramDetail.tsx           # Single program view
├── MentorDiscovery.tsx         # Find mentors
├── MentorProfile.tsx           # Mentor detail page
├── MentorshipDashboard.tsx     # Manage mentorships
├── OrgLanding.tsx              # Organization landing
├── OrgDashboard.tsx            # Organization dashboard
├── OrgMembers.tsx              # Member management
├── OrgTeams.tsx                # Unit hierarchy
├── Settings/
│   └── WearablesTab.tsx        # Wearables pairing
└── Empire/
    └── panels/
        ├── ServerControlPanel.tsx
        ├── DatabasePanel.tsx
        ├── SecurityPanel.tsx
        ├── FeatureFlagsPanel.tsx
        ├── AlertsPanel.tsx
        ├── BackupPanel.tsx
        └── UserAnalyticsPanel.tsx
```

### Components to Create

```
src/components/
├── journey/
│   ├── JourneyHealthScore.tsx
│   ├── JourneyHealthAlerts.tsx
│   └── JourneyRecommendations.tsx
├── recovery/
│   ├── SleepGoalSetter.tsx
│   ├── RecoveryRecommendationCard.tsx
│   └── WeeklySleepChart.tsx
├── rpe/
│   ├── RPETrendChart.tsx
│   ├── FatigueAlertBanner.tsx
│   └── AutoRegulationSuggestion.tsx
├── progression/
│   ├── ProgressionTargetCard.tsx
│   ├── ProgressionRecommendationList.tsx
│   └── CreateTargetModal.tsx
├── economy/
│   ├── TipButton.tsx
│   ├── GiftModal.tsx
│   ├── BoostButton.tsx
│   ├── SuperHighFiveModal.tsx
│   ├── BonusEventBanner.tsx
│   ├── CreditPackageCard.tsx
│   └── EarnOpportunitiesList.tsx
├── mascot/
│   ├── MascotLoanOffer.tsx
│   ├── MascotOvertrainingAlert.tsx
│   ├── MascotWorkoutSuggestion.tsx
│   ├── MascotProgramGenerator.tsx
│   ├── MascotMasterAbilities.tsx
│   ├── MascotCrewSuggestions.tsx
│   └── MascotRivalryAlerts.tsx
├── prescription/
│   ├── PrescriptionWizard.tsx
│   ├── BiomechanicsForm.tsx
│   ├── PrescriptionResults.tsx
│   ├── PrescriptionFeedback.tsx
│   └── ExerciseScoreBreakdown.tsx
├── programs/
│   ├── ProgramBrowser.tsx
│   ├── ProgramDetail.tsx
│   ├── EnrollmentProgress.tsx
│   └── TodaysWorkoutWidget.tsx
├── wearables/
│   ├── WearablePairingCard.tsx
│   ├── WearableSyncStatus.tsx
│   └── WearableDataSummary.tsx
├── mentorship/
│   ├── MentorProfileCard.tsx
│   ├── MentorshipRequestModal.tsx
│   ├── CheckInForm.tsx
│   └── MentorshipTimeline.tsx
└── organization/
    ├── OrgCreateWizard.tsx
    ├── OrgMemberList.tsx
    ├── OrgUnitTree.tsx
    ├── OrgInviteModal.tsx
    └── OrgRoleSelector.tsx
```

---

## Risk Assessment & Safety Checklist

### Pre-Launch Checklist per Feature

#### Economy Features
- [ ] Add confirmation dialogs for all spending
- [ ] Implement daily spending limits
- [ ] Add running balance display during transactions
- [ ] Test idempotency (double-click protection)
- [ ] Verify transaction logging
- [ ] Test insufficient balance handling
- [ ] Review fraud detection triggers

#### Mascot Credit Loans
- [ ] Clearly display interest rate
- [ ] Show repayment deadline prominently
- [ ] Prevent over-borrowing
- [ ] Test loan repayment flow
- [ ] Add loan status to wallet view

#### Prescription V3
- [ ] Start with beta flag (opt-in)
- [ ] Monitor exercise variety
- [ ] Track user feedback closely
- [ ] Have fallback to v1 prescription
- [ ] Validate equipment matching
- [ ] Test with edge cases (no equipment, injuries)

#### Organizations
- [ ] Test permission boundaries
- [ ] Verify member can't escalate privileges
- [ ] Test bulk operations carefully
- [ ] Audit log all admin actions
- [ ] Test invite expiration

#### E2E Encryption (Future)
- [ ] Key rotation testing
- [ ] Device management testing
- [ ] Encryption performance testing
- [ ] Backup key recovery flow
- [ ] Legal compliance review

### Rollout Strategy

1. **Alpha** (Week 1-2): Internal testing with dev accounts
2. **Beta** (Week 3-4): Opt-in for power users via feature flag
3. **Staged Rollout** (Week 5-6): 10% → 25% → 50% → 100%
4. **Monitor** (Ongoing): Error rates, user feedback, support tickets

### Monitoring Checklist

- [ ] Set up error tracking for new features
- [ ] Create dashboards for feature adoption
- [ ] Configure alerts for error spikes
- [ ] Track performance metrics (latency, success rate)
- [ ] Set up user feedback collection

---

## Appendix: Database Migrations Needed

### Feature Flags Table (New)

```sql
-- Migration: XXX_feature_flags.ts
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  percentage INT DEFAULT 100 CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id)
);

CREATE TABLE feature_flag_overrides (
  flag_id UUID REFERENCES feature_flags(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (flag_id, user_id)
);

CREATE INDEX idx_feature_flags_key ON feature_flags(key);
CREATE INDEX idx_feature_flag_overrides_user ON feature_flag_overrides(user_id);
```

### Alert Rules Table (New)

```sql
-- Migration: XXX_alert_rules.ts
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'error_rate', 'latency', 'memory', 'custom'
  threshold NUMERIC NOT NULL,
  comparison TEXT NOT NULL, -- 'gt', 'lt', 'eq', 'gte', 'lte'
  window_minutes INT DEFAULT 5,
  enabled BOOLEAN DEFAULT true,
  channels JSONB DEFAULT '[]', -- ['slack', 'email']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  value NUMERIC NOT NULL,
  resolved_at TIMESTAMPTZ,
  acknowledged_by TEXT REFERENCES users(id),
  notes TEXT
);

CREATE INDEX idx_alert_history_rule ON alert_history(rule_id);
CREATE INDEX idx_alert_history_triggered ON alert_history(triggered_at);
```

---

## Summary

This plan provides a comprehensive roadmap to expose MuscleMap's hidden 40% of features while ensuring safety and maintainability. The phased approach allows for:

1. **Quick wins** in weeks 1-2 to build momentum
2. **Core engagement features** in weeks 3-6 (economy, mascot)
3. **Premium differentiators** in weeks 7-8 (AI, programs)
4. **B2B expansion** in weeks 9-10 (organizations, mentorship)
5. **Admin completion** in weeks 11-12 (Empire panels)

Each phase includes specific GraphQL queries, components, and safety checklists to ensure successful implementation.
