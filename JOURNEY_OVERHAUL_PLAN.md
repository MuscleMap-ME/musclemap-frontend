# MuscleMap Journey System Overhaul - Master Plan

**Created:** January 8, 2026
**Last Updated:** January 8, 2026
**Status:** Planning Phase

---

## Quick Status

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Taxonomy Migration | IN PROGRESS | 60% |
| Phase 2: Expanded Journeys | NOT STARTED | 0% |
| Phase 3: Milestones System | NOT STARTED | 0% |
| Phase 4: Bodybuilding Section | NOT STARTED | 0% |
| Phase 5: Onboarding Redesign | NOT STARTED | 0% |
| Phase 6: Future Module Prep | NOT STARTED | 0% |

**Current Phase:** Phase 1 - Taxonomy Migration
**Next Action:** Deploy and run migration, then update frontend

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

## Phase 2: Expanded Journeys

**Goal:** Add comprehensive journey hierarchy with rehabilitation, accessibility, life-stage support

### 2.1 Database Schema
- [ ] Create migration `033_journey_hierarchy.ts`
- [ ] Add `journey_categories` table (top-level categories)
- [ ] Add `journey_templates` table (predefined journeys)
- [ ] Add hierarchy fields: `parent_id`, `depth`, `children_ids`
- [ ] Add safety fields: `medical_disclaimer_required`, `professional_supervision_recommended`, `contraindications`
- [ ] Add exercise filter fields for prescriptions

### 2.2 Seed Data
- [ ] Create `seed-journey-templates.ts`
- [ ] Weight Management journeys (8 items)
- [ ] Strength Foundations journeys (12 items)
- [ ] Cardiovascular journeys (11 items)
- [ ] Mobility & Flexibility journeys (9 items)
- [ ] Rehabilitation & Recovery journeys (25+ items)
- [ ] Accessibility & Adaptive journeys (15+ items)
- [ ] Life Stage journeys (10 items)
- [ ] Return to Activity journeys (9 items)

### 2.3 API Endpoints
- [ ] `GET /api/journeys/categories` - List top-level categories
- [ ] `GET /api/journeys/categories/:category` - List subcategories
- [ ] `GET /api/journeys/categories/:category/:subcategory` - List specific journeys
- [ ] `GET /api/journeys/templates/:id` - Get journey template details
- [ ] `POST /api/journeys/start` - Start a journey from template
- [ ] Update existing CRUD endpoints for new schema

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

## Phase 3: Milestones System

**Goal:** Add elite bodyweight feat tracking with progression trees

### 3.1 Database Schema
- [ ] Create migration `034_milestones.ts`
- [ ] `milestones` table (50+ skills)
- [ ] `milestone_progressions` table (progression steps)
- [ ] `user_milestones` table (user's active milestones)
- [ ] `user_milestone_progress` table (logged attempts)
- [ ] Indexes for category, difficulty, user status

### 3.2 Seed Data
- [ ] Create `seed-milestones.ts`
- [ ] Handstands & Inversions (11 items)
- [ ] Straight-Arm Strength (18 items)
- [ ] Pulling Power (10 items)
- [ ] Pushing Power (6 items)
- [ ] Dynamic/Tumbling (7 items)
- [ ] Rings Skills (5 items)
- [ ] Grip & Forearm (3 items)
- [ ] Human Flag & Pole (2 items)
- [ ] Combination Feats (4 items)
- [ ] Create progression trees for each milestone

### 3.3 API Endpoints
- [ ] `GET /api/milestones` - List all milestones
- [ ] `GET /api/milestones/categories` - List categories
- [ ] `GET /api/milestones/categories/:category` - List milestones in category
- [ ] `GET /api/milestones/:id` - Get milestone with progressions
- [ ] `GET /api/milestones/:id/progression` - Detailed progression tree
- [ ] `POST /api/milestones/start` - Start pursuing a milestone
- [ ] `GET /api/users/me/milestones` - Get user's active milestones
- [ ] `PUT /api/users/me/milestones/:id` - Update progress
- [ ] `POST /api/users/me/milestones/:id/log` - Log progression attempt

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

## Phase 4: Bodybuilding/Competition Section

**Goal:** Add competition prep tracking for bodybuilding, powerlifting, etc.

### 4.1 Database Schema
- [ ] Create migration `035_competition.ts`
- [ ] `competition_categories` table (federations/divisions)
- [ ] `user_competition_profiles` table
- [ ] Computed `weeks_out` field
- [ ] Phase tracking (offseason, prep, peak_week, post_show)
- [ ] Weak point assessment storage

### 4.2 Seed Data
- [ ] Create `seed-competition-categories.ts`
- [ ] IFBB/NPC Men's divisions (4 items)
- [ ] IFBB/NPC Women's divisions (5 items)
- [ ] Natural federations (2 items)
- [ ] Other sports (3 items)

### 4.3 API Endpoints
- [ ] `GET /api/competitions/categories` - List federations/divisions
- [ ] `GET /api/competitions/categories/:id` - Get category details
- [ ] `POST /api/users/me/competition` - Create competition profile
- [ ] `GET /api/users/me/competition` - Get user's competition profile
- [ ] `PUT /api/users/me/competition` - Update competition profile
- [ ] `GET /api/users/me/competition/countdown` - Get weeks out, phase info

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
- [ ] Next: Deploy and run migration

**Files Created This Session:**
- `apps/api/src/db/migrations/032_taxonomy_rename.ts`
- `apps/api/src/modules/identity-communities/index.ts`
- `apps/api/src/http/routes/identities.ts`
- `apps/api/src/http/routes/journeys.ts`

**Files Modified This Session:**
- `apps/api/src/http/server.ts` (added new route imports and registrations)

---

## Resume Instructions

If Claude needs to resume this work:

1. Read this file: `/Users/jeanpaulniko/Public/musclemap.me/JOURNEY_OVERHAUL_PLAN.md`
2. Check the "Quick Status" table at the top
3. Find the current phase and its checkbox status
4. Continue from the next unchecked item
5. Update this document as you complete tasks
