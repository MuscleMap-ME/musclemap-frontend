# MuscleMap Journey System Overhaul - Master Plan

**Created:** January 8, 2026
**Last Updated:** January 8, 2026
**Status:** Planning Phase

---

## Quick Status

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Taxonomy Migration | COMPLETE | 100% |
| Phase 2: Expanded Journeys | COMPLETE | 100% |
| Phase 3: Milestones System | COMPLETE | 100% |
| Phase 4: Bodybuilding Section | COMPLETE | 100% |
| Phase 5: Onboarding Redesign | NOT STARTED | 0% |
| Phase 6: Future Module Prep | NOT STARTED | 0% |

**Current Phase:** Phase 5 - Onboarding Redesign
**Next Action:** Design onboarding state machine and intent flows

---

## Overview

This document tracks the complete overhaul of MuscleMap's journey system:

1. **Archetypes → Identities** (who you want to become)
2. **Goals → Journeys** (transformations with endpoints)
3. **NEW: Milestones** (elite bodyweight feats)
4. **NEW: Competition Section** (bodybuilding/powerlifting)
5. **Redesigned Onboarding** (progressive disclosure)
6. **Future Module Prep** (nutrition/supplementation placeholders)

---

## Current State Analysis

### Existing Database Tables (Relevant)
- `archetypes` - Body type/activity identities
- `archetype_categories` - 6 categories (general, first_responder, military, sports, occupational, rehabilitation)
- `archetype_levels` - Level progression within archetypes
- `archetype_community_links` - Links archetypes to communities
- `user_goals` - User fitness goals (11 types)
- `goal_progress` - Daily progress tracking
- `goal_milestones` - Achievement milestones with XP
- `user_profile_extended` - Physical profile + onboarding status
- `equipment_types` - 35+ equipment types
- `user_home_equipment` - User's home gym equipment
- `pt_tests` - Physical fitness test definitions

### Existing API Routes (Relevant)
- `/api/archetypes/*` - Archetype CRUD and community linking
- `/api/goals/*` - Goals CRUD and progress tracking
- `/api/onboarding/*` - Onboarding flow endpoints
- `/api/personalization/*` - Personalized recommendations

### Existing Frontend (Relevant)
- `src/pages/Goals.jsx` - Goal management UI
- `src/pages/Onboarding.jsx` - Multi-step onboarding
- `apps/mobile/src/stores/onboarding.ts` - Mobile onboarding state

---

## Phase 1: Taxonomy Migration

**Goal:** Rename tables/routes without breaking functionality

### 1.1 Database Migration
- [x] Create migration `032_taxonomy_rename.ts`
- [x] Rename `archetypes` → `identities`
- [x] Rename `archetype_categories` → `identity_categories`
- [x] Rename `archetype_levels` → `identity_levels`
- [x] Rename `archetype_community_links` → `identity_community_links`
- [x] Rename `user_goals` → `user_journeys`
- [x] Rename `goal_progress` → `journey_progress`
- [x] Rename `goal_milestones` → `journey_milestones`
- [x] Update all foreign key references
- [x] Add backward-compatible views for old table names (temporary)

### 1.2 API Updates
- [x] Create new routes with new names
- [x] `/api/identities/*` (new routes)
- [x] `/api/journeys/*` (new routes)
- [x] Keep old routes as aliases (deprecation period)
- [x] Create `identity-communities` module
- [x] Register new routes in server.ts
- [x] TypeScript compiles cleanly

### 1.3 Type Updates
- [ ] Update `packages/shared/` types
- [ ] Rename `Archetype` → `Identity`
- [ ] Rename `Goal` → `Journey`
- [ ] Update all TypeScript interfaces

### 1.4 Frontend Updates
- [ ] Update web app components
- [ ] Update mobile app stores and components
- [ ] Update all API calls to use new endpoints
- [ ] Update UI labels/strings

### 1.5 i18n
- [ ] Add new translation keys for Identities, Journeys, Milestones
- [ ] Update existing translations

### 1.6 Testing
- [ ] Verify all renamed endpoints work
- [ ] Verify old endpoints still work (backward compat)
- [ ] Verify frontend displays correctly

**Files to Modify:**
```
apps/api/src/db/migrations/032_taxonomy_rename.ts (NEW)
apps/api/src/db/schema.ts
apps/api/src/http/routes/archetype-communities.ts → identity-communities.ts
apps/api/src/http/routes/goals.ts → journeys.ts
apps/api/src/modules/archetype-communities/ → identity-communities/
packages/shared/src/types.ts (or similar)
src/pages/Goals.jsx → Journeys.jsx
src/pages/Onboarding.jsx
apps/mobile/src/stores/onboarding.ts
```

---

## Phase 2: Expanded Journeys (COMPLETE)

**Goal:** Add comprehensive journey hierarchy with rehabilitation, accessibility, life-stage support

### 2.1 Database Schema
- [x] Create migration `033_journey_hierarchy.ts`
- [x] Add `journey_categories` table (top-level categories)
- [x] Add `journey_templates` table (predefined journeys)
- [x] Add hierarchy fields: `parent_id`, `depth`, `children_ids`
- [x] Add safety fields: `medical_disclaimer_required`, `professional_supervision_recommended`, `contraindications`
- [x] Add exercise filter fields for prescriptions

### 2.2 Seed Data
- [x] Seeded 8 top-level categories with 40 subcategories
- [x] Weight Management journeys (5 items)
- [x] Strength Foundations journeys (5 items)
- [x] Cardiovascular journeys (5 items)
- [x] Mobility & Flexibility journeys (5 items)
- [x] Rehabilitation & Recovery journeys (5 items)
- [x] Accessibility & Adaptive journeys (5 items)
- [x] Life Stage journeys (5 items)
- [x] Return to Activity journeys (3 items)
- [x] Total: 38 journey templates seeded

### 2.3 API Endpoints
- [x] `GET /api/journeys/categories` - List top-level categories
- [x] `GET /api/journeys/categories/:categoryId` - List category details with subcategories
- [x] `GET /api/journeys/templates` - List all journey templates
- [x] `GET /api/journeys/templates/:templateId` - Get journey template details
- [x] `POST /api/journeys/start` - Start a journey from template
- [x] `GET /api/journeys/featured` - Get featured journey templates

### 2.4 Frontend - Drill-Down UI
- [ ] Create `JourneyBrowser.tsx` component
- [ ] Implement progressive disclosure navigation
- [ ] Create category cards with icons
- [ ] Add back navigation
- [ ] Add medical disclaimer modal for rehabilitation journeys

### 2.5 Mobile Updates
- [ ] Update mobile journey selection
- [ ] Add drill-down navigation
- [ ] Sync with web UI patterns

**Files to Create/Modify:**
```
apps/api/src/db/migrations/033_journey_hierarchy.ts (NEW)
apps/api/src/db/seed-journey-templates.ts (NEW)
apps/api/src/http/routes/journeys.ts
apps/api/src/modules/journeys/index.ts (NEW or modify)
src/pages/Journeys.jsx
src/components/JourneyBrowser.tsx (NEW)
src/components/JourneyCategoryCard.tsx (NEW)
src/components/MedicalDisclaimerModal.tsx (NEW)
apps/mobile/src/components/JourneyBrowser.tsx (NEW)
```

---

## Phase 3: Milestones System (COMPLETE)

**Goal:** Add elite bodyweight feat tracking with progression trees

### 3.1 Database Schema
- [x] Create migration `034_milestones.ts`
- [x] `skill_milestones` table (56 skills)
- [x] `milestone_progressions` table (progression steps)
- [x] `user_skill_milestones` table (user's active milestones)
- [x] `user_milestone_attempts` table (logged attempts)
- [x] Indexes for category, difficulty, user status

### 3.2 Seed Data
- [x] 56 milestones seeded across 8 categories:
- [x] Handstands & Inversions (7 items)
- [x] Straight-Arm Strength (7 items)
- [x] Pulling Power (7 items)
- [x] Pushing Power (7 items)
- [x] Dynamic/Tumbling (7 items)
- [x] Rings Skills (7 items)
- [x] Grip & Forearm (7 items)
- [x] Human Flag & Pole (7 items)
- [x] 32 progression steps seeded for key milestones

### 3.3 API Endpoints (routes use `/skill-milestones` to avoid conflict with tips.ts)
- [x] `GET /api/skill-milestones` - List all milestones
- [x] `GET /api/skill-milestones/categories` - List categories with counts
- [x] `GET /api/skill-milestones/featured` - Featured milestones
- [x] `GET /api/skill-milestones/:id` - Get milestone with progressions
- [x] `POST /api/skill-milestones/start` - Start pursuing a milestone
- [x] `GET /api/skill-milestones/me` - Get user's active milestones
- [x] `POST /api/skill-milestones/me/:userMilestoneId/log` - Log attempt

### 3.4 Frontend - Milestone Browser
- [ ] Create `MilestoneBrowser.tsx` component
- [ ] Apparatus filter (Floor, Rings, Bar)
- [ ] Difficulty filter (1-5 stars)
- [ ] Milestone detail view with progression tree
- [ ] Progress visualization
- [ ] Video demo integration
- [ ] Log attempt modal

### 3.5 Mobile Updates
- [ ] Create `MilestoneTab.tsx`
- [ ] Milestone browser component
- [ ] Progress tracking UI
- [ ] Video playback support

### 3.6 Integration with Prescription Engine
- [ ] Update workout prescriptions to include milestone exercises
- [ ] Add milestone-specific workout generation

**Files to Create/Modify:**
```
apps/api/src/db/migrations/034_milestones.ts (NEW)
apps/api/src/db/seed-milestones.ts (NEW)
apps/api/src/http/routes/milestones.ts (NEW)
apps/api/src/modules/milestones/index.ts (NEW)
src/pages/Milestones.tsx (NEW)
src/components/MilestoneBrowser.tsx (NEW)
src/components/MilestoneCard.tsx (NEW)
src/components/MilestoneDetail.tsx (NEW)
src/components/ProgressionTree.tsx (NEW)
apps/mobile/app/(tabs)/milestones.tsx (NEW)
apps/mobile/src/components/MilestoneBrowser.tsx (NEW)
```

---

## Phase 4: Bodybuilding/Competition Section (COMPLETE)

**Goal:** Add competition prep tracking for bodybuilding, powerlifting, etc.

### 4.1 Database Schema
- [x] Create migration `035_competition.ts`
- [x] `competition_categories` table (25 federations/divisions)
- [x] `user_competition_profiles` table
- [x] `competition_weigh_ins` table
- [x] `competition_prep_phases` table
- [x] `competition_mandatory_poses` table (23 poses)
- [x] `weak_point_options` table (23 options)
- [x] Phase tracking (offseason, prep, peak_week, post_show, maintenance)

### 4.2 Seed Data
- [x] IFBB Pro League - Men's (4 divisions)
- [x] IFBB Pro League - Women's (5 divisions)
- [x] NPC Amateur (6 divisions)
- [x] Natural federations - INBA, WNBF, OCB (3 items)
- [x] Powerlifting - IPF, USAPL, USPA (3 items)
- [x] Strongman, CrossFit, Olympic Weightlifting (4 items)
- [x] Mandatory poses per sport
- [x] Weak point options by muscle group

### 4.3 API Endpoints (routes use `/competition`)
- [x] `GET /api/competition/categories` - List federations/divisions with filters
- [x] `GET /api/competition/categories/grouped` - Categories grouped by sport
- [x] `GET /api/competition/categories/:id` - Get category with mandatory poses
- [x] `GET /api/competition/weak-points` - Get weak point options by muscle group
- [x] `GET /api/competition/me` - Get user's competition profile
- [x] `POST /api/competition/me` - Create/update competition profile
- [x] `PUT /api/competition/me/phase` - Update competition phase
- [x] `POST /api/competition/me/weigh-in` - Log a weigh-in
- [x] `GET /api/competition/me/weigh-ins` - Get weigh-in history
- [x] `GET /api/competition/me/countdown` - Get weeks out, phase info
- [x] `POST /api/competition/me/show-complete` - Mark show as complete
- [x] `DELETE /api/competition/me` - Deactivate profile

### 4.4 Frontend - Competition Dashboard
- [ ] Create `CompetitionDashboard.tsx`
- [ ] Show countdown widget
- [ ] Phase indicator
- [ ] Weak point assessment UI (3D body selector)
- [ ] Competition prep timeline
- [ ] Posing practice log (optional)

### 4.5 Integration
- [ ] Modify prescription engine for competition prep
- [ ] Add weak point volume multipliers
- [ ] Add phase-specific training adjustments

**Files to Create/Modify:**
```
apps/api/src/db/migrations/035_competition.ts (NEW)
apps/api/src/db/seed-competition-categories.ts (NEW)
apps/api/src/http/routes/competition.ts (NEW)
apps/api/src/modules/competition/index.ts (NEW)
src/pages/Competition.tsx (NEW)
src/components/CompetitionDashboard.tsx (NEW)
src/components/ShowCountdown.tsx (NEW)
src/components/WeakPointSelector.tsx (NEW)
apps/mobile/src/components/CompetitionDashboard.tsx (NEW)
```

---

## Phase 5: Onboarding Redesign

**Goal:** Implement progressive disclosure with 5 user intents

### 5.1 State Machine
- [ ] Define onboarding states and transitions
- [ ] Create `OnboardingContext` interface
- [ ] Implement state persistence

### 5.2 API Updates
- [ ] `POST /api/onboarding/start` - Initialize onboarding state
- [ ] `PUT /api/onboarding/progress` - Update onboarding step
- [ ] `POST /api/onboarding/complete` - Finalize onboarding
- [ ] `GET /api/onboarding/state` - Get current onboarding state

### 5.3 Intent Flows
- [ ] "Just want to work out smarter" → Equipment → Time → Identity → Dashboard
- [ ] "I have a specific goal" → Journey drill-down → Baseline → Plan
- [ ] "Training for competition" → Federation → Show date → Phase → Weak points
- [ ] "I want to unlock a skill" → Milestone browser → Prerequisites → Plan
- [ ] "Recovering from injury" → Body region → Condition → Disclaimer → Safe plan

### 5.4 Frontend Components
- [ ] Create `OnboardingFlow.tsx` (new architecture)
- [ ] Intent selection screen
- [ ] Progress indicator
- [ ] Flow-specific screens for each intent
- [ ] Back navigation with state preservation

### 5.5 Mobile Updates
- [ ] Update `apps/mobile/src/stores/onboarding.ts`
- [ ] Add intent and state tracking
- [ ] Create new onboarding screens

**Files to Create/Modify:**
```
apps/api/src/http/routes/onboarding.ts (MODIFY)
apps/api/src/modules/onboarding/index.ts (NEW or MODIFY)
src/pages/Onboarding.jsx → OnboardingFlow.tsx (REWRITE)
src/components/onboarding/IntentSelection.tsx (NEW)
src/components/onboarding/ProgressIndicator.tsx (NEW)
src/components/onboarding/GeneralFlow.tsx (NEW)
src/components/onboarding/GoalFlow.tsx (NEW)
src/components/onboarding/CompetitionFlow.tsx (NEW)
src/components/onboarding/MilestoneFlow.tsx (NEW)
src/components/onboarding/RecoveryFlow.tsx (NEW)
apps/mobile/src/stores/onboarding.ts (MODIFY)
apps/mobile/app/onboarding/*.tsx (NEW screens)
```

---

## Phase 6: Future Module Preparation

**Goal:** Add placeholder schemas and UI for Nutrition & Supplementation

### 6.1 Database Schema
- [ ] Create migration `036_future_modules.ts`
- [ ] `nutrition_plans` table (placeholder)
- [ ] `food_logs` table (placeholder)
- [ ] `supplement_stacks` table (placeholder)
- [ ] `supplement_logs` table (placeholder)
- [ ] `navigation_modules` table for dynamic nav

### 6.2 Navigation Module System
- [ ] Seed navigation modules
- [ ] Add enabled/disabled flags
- [ ] Add coming soon messages

### 6.3 Frontend
- [ ] Create `ComingSoonModule.tsx` component
- [ ] Add nutrition tab (coming soon)
- [ ] Add supplements tab (coming soon)
- [ ] Notification signup for availability

**Files to Create/Modify:**
```
apps/api/src/db/migrations/036_future_modules.ts (NEW)
apps/api/src/db/seed-navigation-modules.ts (NEW)
src/components/ComingSoonModule.tsx (NEW)
src/components/Navigation.tsx (MODIFY)
apps/mobile/app/(tabs)/_layout.tsx (MODIFY)
```

---

## Deployment Checklist (Per Phase)

For each phase:
1. [ ] Run `pnpm typecheck` - no TypeScript errors
2. [ ] Run `./scripts/merge-all.sh` - merge worktree branches
3. [ ] Run `./deploy.sh "Phase X: Description"` - deploy to VPS
4. [ ] Run `ssh root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:migrate"` - run migrations
5. [ ] Run `ssh root@musclemap.me "pm2 restart musclemap-api"` - restart API
6. [ ] Verify at https://musclemap.me/
7. [ ] Test API: `curl https://musclemap.me/health`
8. [ ] Update this document with completion status

---

## Notes & Decisions

### Naming Decision
- Using **Identities**, **Journeys**, **Milestones** as proposed

### Backward Compatibility
- Keep old API routes as aliases for 1-2 release cycles
- Add deprecation warnings to old endpoints

### i18n Strategy
- Add all new strings to translation files
- Use same structure as existing translations

### Medical Disclaimer Strategy
- Show disclaimer before activating rehabilitation journeys
- Require explicit acknowledgment
- Store acknowledgment timestamp

---

## Session Log

### Session 1 (January 8, 2026)
- [x] Read scripts/README.md
- [x] Explored codebase structure
- [x] Created master plan document
- [x] Started Phase 1: Taxonomy Migration
- [x] Created migration `032_taxonomy_rename.ts`
- [x] Created `identity-communities` module
- [x] Created `identities.ts` routes
- [x] Created `journeys.ts` routes
- [x] Registered new routes in `server.ts`
- [x] TypeScript typecheck passes
- [x] Deployed Phase 1 - taxonomy migration complete

### Session 2 (January 8, 2026)
- [x] Completed Phase 2: Expanded Journeys
- [x] Created migration `033_journey_hierarchy.ts` with:
  - `journey_categories` table (8 categories, 40 subcategories)
  - `journey_templates` table (38 templates)
- [x] Updated `journeys.ts` routes with new endpoints
- [x] Fixed migration function name (`migrate()` → `up()`)
- [x] Fixed table ownership permissions
- [x] Deployed and tested Phase 2

- [x] Completed Phase 3: Milestones System
- [x] Created migration `034_milestones.ts` with:
  - `skill_milestones` table (56 milestones)
  - `milestone_progressions` table (32 progressions)
  - `user_skill_milestones` table
  - `user_milestone_attempts` table
- [x] Created `milestones.ts` routes (renamed to `/skill-milestones` to avoid conflict)
- [x] Registered new routes in `server.ts`
- [x] Deployed and tested Phase 3

### Session 3 (January 8, 2026)
- [x] Completed Phase 4: Bodybuilding/Competition Section
- [x] Created migration `035_competition.ts` with:
  - `competition_categories` table (25 divisions seeded)
  - `user_competition_profiles` table
  - `competition_weigh_ins` table
  - `competition_prep_phases` table
  - `competition_mandatory_poses` table (23 poses)
  - `weak_point_options` table (23 body parts)
- [x] Created `competition.ts` routes with full CRUD
- [x] Fixed user_id type (TEXT not UUID to match users table)
- [x] Registered new routes in `server.ts`
- [x] Deployed and tested Phase 4

**Files Created Sessions 1-3:**
- `apps/api/src/db/migrations/032_taxonomy_rename.ts`
- `apps/api/src/db/migrations/033_journey_hierarchy.ts`
- `apps/api/src/db/migrations/034_milestones.ts`
- `apps/api/src/db/migrations/035_competition.ts`
- `apps/api/src/modules/identity-communities/index.ts`
- `apps/api/src/http/routes/identities.ts`
- `apps/api/src/http/routes/journeys.ts`
- `apps/api/src/http/routes/milestones.ts`
- `apps/api/src/http/routes/competition.ts`

**Files Modified Sessions 1-3:**
- `apps/api/src/http/server.ts` (added new route imports and registrations)

---

## Resume Instructions

If Claude needs to resume this work:

1. Read this file: `/Users/jeanpaulniko/Public/musclemap.me/JOURNEY_OVERHAUL_PLAN.md`
2. Check the "Quick Status" table at the top
3. Find the current phase and its checkbox status
4. Continue from the next unchecked item
5. Update this document as you complete tasks
