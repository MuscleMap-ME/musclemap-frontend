# MuscleMap Remaining Features Implementation Plan

> Last updated: 2026-01-09

## Executive Summary

Based on a thorough review of the codebase and user requirements, MuscleMap has **most major features fully implemented**. This document outlines what remains to be built.

---

## What's Already Complete

### Core Systems (100% Done)
- Credits Economy (wallet, earning, store, transfers, anti-abuse, scheduler)
- Training Buddy (8 species, 6 evolution stages, 7 cosmetic slots)
- D&D-Style Stats (STR, CON, DEX, PWR, END, VIT with radar chart)
- Archetypes (general + military + first responder)
- Goals (weight, strength, rehabilitation, milestones)
- Achievements (11 categories, 5 rarities)
- Leaderboards (time-based, cohort filtering)
- PT Tests (military and first responder)
- Disabilities/Limitations (29+ body regions, substitutions)
- Virtual Hangouts (10+ themed spaces)
- Community (follows, friendships, crews, rivals, mentorship)
- Dual Mascot (global + per-user companions)
- Admin Dashboard (fraud review, wallet management)

### Recently Completed (January 2026)
- Homepage Live Community Stats (WebSocket real-time counters)
- "Under Development" Banner with dismiss functionality
- TripToMean Mascot link to creator's about page
- **Gymnastics/Calisthenics Skill Progression Trees** (7 trees, 45+ skills)

---

## ~~Phase 1: Quick Wins~~ COMPLETED

### ~~1.1 Homepage Engagement Stats~~ ✅ DONE
Live community stats with WebSocket real-time updates showing:
- Users browsing the site
- Active workout sessions
- Total registered accounts
- Total workouts completed

See: `src/components/landing/LiveCommunityStats.jsx`, `src/hooks/useLiveCommunityStats.js`

### ~~1.2 "Under Development" Banner~~ ✅ DONE
Dismissible banner on landing page with localStorage persistence.
See: `src/pages/Landing.jsx` (lines 53-81)

### ~~1.3 TripToMean Mascot Link~~ ✅ DONE
Global mascot links to triptomean.com/about when clicked.
See: `src/pages/Landing.jsx` footer section

---

## ~~Phase 2: Skill Progression System~~ COMPLETED

### ~~2.1 Gymnastics/Calisthenics Skill Trees~~ ✅ DONE

**Implemented 7 skill tree categories with 45+ skills:**

1. **Handstands & Inversions** 🤸
   - Wall Handstand → Freestanding → HSPU → Press to HS → One-Arm HS

2. **Straight-Arm Strength** 💪
   - Tuck Planche → Straddle → Full Planche
   - Tuck Front Lever → Straddle → Full Lever
   - L-Sit → V-Sit → Manna

3. **Pulling Power** 🧗
   - Pull-ups → Muscle-up → One-arm Pull-up

4. **Pushing Power** 🏋️
   - Dips → Ring Dips → Korean Dips

5. **Core & Compression** 🎯
   - Hollow Body → L-sit → V-sit → Manna

6. **Rings Mastery** ⭕
   - Support Hold → Ring Dips → Iron Cross

7. **Dynamic Skills** 🔄
   - Kip-up → Back Handspring → Aerial

**Implementation Details:**
- Migration: `apps/api/src/db/migrations/043_skill_progression_trees.ts`
- Service: `apps/api/src/modules/skills/index.ts`
- Routes: `apps/api/src/http/routes/skills.ts`
- Frontend: `src/pages/Skills.jsx`
- Public routes: `/skills`, `/skills/:treeId`

**API Endpoints:**
- `GET /api/skills/trees` - List all skill trees
- `GET /api/skills/trees/:id` - Get tree with nodes
- `GET /api/skills/trees/:id/progress` - User progress (auth)
- `GET /api/skills/progress` - User skill summary (auth)
- `POST /api/skills/practice` - Log practice session (auth)
- `POST /api/skills/achieve` - Mark skill achieved (auth)
- `GET /api/skills/history` - Practice history (auth)
- `GET /api/skills/nodes/:id/leaderboard` - Skill leaderboard

**Earning Rule:** `skill_unlock` - 50 credits, 100 XP per skill achieved

---

## Phase 2.5: USA Gymnastics Program Expansion (Planned)

### 2.5.1 Full USAG Skill Progressions
**Priority: HIGH** - Comprehensive gymnastics training resource

The current skill trees focus on calisthenics/street workout skills. This expansion will add the **complete USA Gymnastics (USAG) program and syllabus** to support competitive gymnasts at all levels.

**Target Audience:**
- Boys gymnastics (Junior Olympic levels 4-10 + Elite)
- Girls gymnastics (Junior Olympic levels 1-10 + Elite)
- Men's Artistic Gymnastics (MAG)
- Women's Artistic Gymnastics (WAG)
- Recreational gymnasts following USAG progressions

**Women's Artistic Gymnastics (WAG) Apparatus:**
1. **Vault** - Handspring, Tsukahara, Yurchenko progressions
2. **Uneven Bars** - Kip, cast handstand, giants, release moves, dismounts
3. **Balance Beam** - Mounts, leaps, turns, acro series, dismounts
4. **Floor Exercise** - Tumbling passes, leaps, turns, dance elements

**Men's Artistic Gymnastics (MAG) Apparatus:**
1. **Floor Exercise** - Tumbling, strength holds, press handstands
2. **Pommel Horse** - Circles, flairs, scissors, dismounts
3. **Still Rings** - Strength holds (cross, lever), swings, dismounts
4. **Vault** - Handspring, Tsukahara, Kasamatsu progressions
5. **Parallel Bars** - Swings, handstands, releases, dismounts
6. **High Bar** - Giants, releases, pirouettes, dismounts

**USAG Level Structure:**
| Level | Description | Age Range |
|-------|-------------|-----------|
| 1-3 | Compulsory (set routines) | 5-8 years |
| 4-5 | Compulsory with options | 7-10 years |
| 6-7 | Optional (custom routines) | 8-12 years |
| 8-10 | Advanced Optional | 10-16 years |
| Elite | National/International | 14+ years |

**Implementation Approach:**
1. Create new skill trees per apparatus (4 for WAG, 6 for MAG)
2. Map USAG Code of Points skills to tree nodes
3. Include difficulty values (A, B, C, D, E, F, G)
4. Add level requirements for each skill
5. Support both boys/men and girls/women progressions
6. Include skill videos/animations where available

**Database Additions:**
- `apparatus` field on skill trees (vault, bars, beam, floor, pommel, rings, pbars, hbar)
- `usag_level` field on skill nodes (1-10, elite)
- `difficulty_value` field (A=0.1, B=0.2, ... G=0.7)
- `gender` field on skill trees (male, female, unisex)
- `code_of_points_id` for official USAG skill references

**Estimated Scope:**
- 10 new apparatus-specific skill trees
- 500+ individual skills from USAG syllabi
- Level-appropriate progressions for each apparatus
- Integration with existing XP/credit rewards

---

## ~~Phase 3: Martial Arts Module~~ COMPLETED

### ~~3.1 Martial Arts Training System~~ ✅ DONE

**Implemented 10 disciplines with 60+ techniques:**

**Civilian Disciplines:**
1. **Boxing** 🥊 - Stances, punches, defense, combinations
2. **Kickboxing** 🦵 - Punches, kicks, defense
3. **Muay Thai** 🇹🇭 - Punches, kicks, elbows, knees, clinch
4. **Brazilian Jiu-Jitsu** 🥋 - Positions, guards, sweeps, submissions, escapes
5. **Wrestling** 🤼 - Stances, takedowns, defense, pins
6. **Judo** 🥋 - Throws, pins, submissions
7. **Self-Defense** 🛡️ - Awareness, strikes, escapes, defense

**Military Combatives:**
8. **MCMAP** ⚔️ - Marine Corps Martial Arts Program (Tan through Black belt)
9. **Army Combatives** 🪖 - Modern Army Combatives Program levels 1-3
10. **Krav Maga** 🇮🇱 - Israeli military self-defense system

**Implementation Details:**
- Migration: `apps/api/src/db/migrations/044_martial_arts.ts`
- Service: `apps/api/src/modules/martial-arts/index.ts`
- Routes: `apps/api/src/http/routes/martial-arts.ts`
- Frontend: `src/pages/MartialArts.jsx`
- Public routes: `/martial-arts`, `/martial-arts/:disciplineId`

**API Endpoints:**
- `GET /api/martial-arts/disciplines` - List all disciplines (filter by ?military=true)
- `GET /api/martial-arts/disciplines/:id` - Get discipline with categories
- `GET /api/martial-arts/disciplines/:id/techniques` - Get techniques
- `GET /api/martial-arts/disciplines/:id/progress` - User progress (auth)
- `GET /api/martial-arts/disciplines/:id/leaderboard` - Discipline leaderboard
- `GET /api/martial-arts/progress` - User summary (auth)
- `POST /api/martial-arts/practice` - Log practice session (auth)
- `POST /api/martial-arts/master` - Mark technique mastered (auth)
- `GET /api/martial-arts/history` - Practice history (auth)

**Earning Rule:** `technique_master` - 50 credits, 100 XP per technique mastered

**Features:**
- Proficiency-based progression (0-100%)
- Practice logging with reps, rounds, partner drills
- Category grouping (stances, strikes, submissions, etc.)
- Military/tactical toggle for service members
- Tier-based technique organization

---

## Phase 4: Nutrition & Supplementation Prep (3-5 days each)

### 4.1 Nutrition Module Structure
**Priority: LOW** - Foundation for future feature

Create scaffolding for:
- Food database integration (USDA or similar)
- Meal logging
- Macro tracking (protein, carbs, fat)
- Calorie goals based on user goals
- Integration with weight goals

**Initial Implementation:**
- Database schema only
- API stubs
- UI placeholder with "Coming Soon"

### 4.2 Supplementation Module Structure
**Priority: LOW** - Foundation for future feature

Create scaffolding for:
- Supplement database
- Dosage tracking
- Timing reminders
- Stack recommendations by goal
- Safety warnings

**Initial Implementation:**
- Database schema only
- API stubs
- UI placeholder with "Coming Soon"

---

## Phase 5: Touchscreen UX Optimization (Ongoing)

### 5.1 One-Tap Interaction Audit
**Priority: MEDIUM** - Per your detailed spec

Systematic review and update of:
- Exercise cards (tap to add, not tap → confirm)
- Settings (auto-save on toggle)
- Navigation (bottom tabs, swipe gestures)
- Workout logging (inline inputs, auto-advance)
- Modals (tap outside to close, no explicit cancel)

**Implementation Approach:**
1. Audit all interactions
2. Identify multi-tap patterns
3. Implement undo-instead-of-confirm pattern
4. Add swipe gestures
5. Ensure 48dp minimum touch targets
6. Add haptic feedback

---

## Phase 6: 3D Anatomical Models (Future)

### 6.1 Full 3D Male/Female Models
**Priority: LOW** - Enhancement

- Integrate Three.js or similar
- Separate male/female models
- Individual muscle highlighting
- Rotation and zoom controls
- Integration with workout muscle activation display

---

## Implementation Status

| Phase | Feature | Status | Priority |
|-------|---------|--------|----------|
| 1.1 | Homepage Engagement Stats | ✅ COMPLETE | HIGH |
| 1.2 | Under Development Banner | ✅ COMPLETE | HIGH |
| 1.3 | TripToMean Mascot Link | ✅ COMPLETE | MEDIUM |
| 2.1 | Skill Progression Trees | ✅ COMPLETE | HIGH |
| 2.5 | USA Gymnastics Program (USAG) | 🔲 PENDING | HIGH |
| 3.1 | Martial Arts Module | ✅ COMPLETE | MEDIUM |
| 4.1 | Nutrition Structure | 🔲 PENDING | LOW |
| 4.2 | Supplementation Structure | 🔲 PENDING | LOW |
| 5.1 | Touchscreen UX | 🔲 PENDING | MEDIUM |
| 6.1 | 3D Models | 🔲 PENDING | LOW |

---

## Notes

### What's NOT Needed (Already Exists)
- Military archetypes ✅
- Police/Fire/EMT archetypes ✅
- PT test tracking ✅
- D&D-style stats ✅
- Leaderboards with filters ✅
- Disability accommodations ✅
- Virtual hangouts with themes ✅
- Ghost mode in communities ✅
- Peer groups (via Crews) ✅
- Opt-out of community features ✅

### Recommendations
1. Start with Phase 1 quick wins to show immediate progress
2. Skill trees will be a major differentiator - prioritize this
3. Martial arts appeals to your target military/first responder users
4. Nutrition/supplements are large undertakings - keep as stubs for now
5. Touchscreen UX can be improved incrementally
