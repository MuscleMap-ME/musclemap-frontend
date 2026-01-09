# MuscleMap Remaining Features Implementation Plan

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

---

## Phase 1: Quick Wins (1-2 days each)

### 1.1 Homepage Engagement Stats
**Priority: HIGH** - Kickstart community engagement

Add real-time counters showing:
- Total registered users
- Users currently exercising (active workout sessions)
- Workouts completed today
- Community members online

**Implementation:**
```
- Create stats endpoint: GET /api/stats/engagement
- Add Redis-cached counters for real-time data
- Frontend component showing animated counters
- Placement: Hero section or dedicated stats bar
```

### 1.2 "Under Development" Banner
**Priority: HIGH** - Set user expectations

Add a dismissible banner:
```
"MuscleMap is under active development. New features are added daily!
Join the community and start your journey. [Learn More] [Dismiss]"
```

**Implementation:**
- LocalStorage to remember dismissal
- Subtle but visible placement
- Link to roadmap/changelog

### 1.3 TripToMean Mascot Link
**Priority: MEDIUM** - Creator attribution

Update global mascot to link to triptomean.com/about when clicked.

**Implementation:**
- Add click handler to mascot component
- Open in new tab
- Subtle tooltip: "Meet the creator"

---

## Phase 2: Skill Progression System (1 week)

### 2.1 Gymnastics/Calisthenics Skill Trees
**Priority: HIGH** - Major user engagement feature

Create progression trees for advanced bodyweight skills:

**Skill Categories:**
1. **Handstands & Inversions**
   - Wall Handstand → Freestanding → One-Arm → HSPU → Press to Handstand

2. **Straight-Arm Strength**
   - L-Sit → V-Sit → Manna
   - Tuck Planche → Straddle → Full Planche
   - Tuck Front Lever → Straddle → Full Front Lever
   - Back Lever progression

3. **Pulling Power**
   - Pull-up → Chest-to-bar → Muscle-up → One-arm pull-up

4. **Pushing Power**
   - Dips → Ring Dips → Korean Dips
   - Ring Push-ups → Maltese progression

5. **Dynamic Skills**
   - Kip-up, Back Handspring, Aerial

6. **Rings Specialty**
   - Iron Cross, Ring Handstand

**Database Schema:**
```sql
CREATE TABLE skill_trees (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- handstands, straight_arm, pulling, pushing, dynamic, rings
  description TEXT,
  icon TEXT,
  order_index INT
);

CREATE TABLE skill_nodes (
  id SERIAL PRIMARY KEY,
  tree_id INT REFERENCES skill_trees(id),
  name TEXT NOT NULL,
  description TEXT,
  prerequisites JSONB DEFAULT '[]', -- array of skill_node_ids
  difficulty INT CHECK (difficulty BETWEEN 1 AND 5),
  xp_reward INT DEFAULT 100,
  credit_reward INT DEFAULT 50,
  criteria JSONB, -- { "hold_seconds": 30, "reps": 5, etc. }
  video_url TEXT,
  tips TEXT[]
);

CREATE TABLE user_skill_progress (
  user_id UUID REFERENCES users(id),
  skill_node_id INT REFERENCES skill_nodes(id),
  status TEXT DEFAULT 'locked', -- locked, in_progress, achieved
  best_attempt JSONB,
  achieved_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, skill_node_id)
);
```

**Frontend:**
- Visual tree diagram (like a talent tree in games)
- Unlocked/locked visual states
- Progress indicators
- Video demonstrations
- Achievement celebrations

---

## Phase 3: Martial Arts Module (1-2 weeks)

### 3.1 Martial Arts Training System
**Priority: MEDIUM** - Appeals to military/first responder users

**Supported Disciplines:**
- Boxing fundamentals
- Kickboxing basics
- Brazilian Jiu-Jitsu positions
- Wrestling takedowns
- Self-defense techniques
- Military combatives (MCMAP, Army Combatives)

**Features:**
- Technique library with descriptions
- Visual diagrams/illustrations
- Progression from basics to advanced
- Integration with existing archetype system
- Drill timers and round counters

**Database Schema:**
```sql
CREATE TABLE martial_arts_disciplines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  origin_country TEXT,
  focus_areas TEXT[], -- striking, grappling, throws, etc.
  icon TEXT
);

CREATE TABLE martial_arts_techniques (
  id TEXT PRIMARY KEY,
  discipline_id TEXT REFERENCES martial_arts_disciplines(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- stance, strike, block, submission, takedown, escape
  difficulty INT CHECK (difficulty BETWEEN 1 AND 5),
  prerequisites TEXT[],
  muscle_groups TEXT[],
  illustration_url TEXT,
  video_url TEXT,
  tips TEXT[]
);

CREATE TABLE user_technique_progress (
  user_id UUID REFERENCES users(id),
  technique_id TEXT REFERENCES martial_arts_techniques(id),
  proficiency INT DEFAULT 0, -- 0-100
  practice_count INT DEFAULT 0,
  last_practiced TIMESTAMPTZ,
  PRIMARY KEY (user_id, technique_id)
);
```

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

## Implementation Order

| Phase | Feature | Est. Time | Priority |
|-------|---------|-----------|----------|
| 1.1 | Homepage Engagement Stats | 4-6 hours | HIGH |
| 1.2 | Under Development Banner | 1-2 hours | HIGH |
| 1.3 | TripToMean Mascot Link | 30 min | MEDIUM |
| 2.1 | Skill Progression Trees | 5-7 days | HIGH |
| 3.1 | Martial Arts Module | 7-10 days | MEDIUM |
| 4.1 | Nutrition Structure | 2-3 days | LOW |
| 4.2 | Supplementation Structure | 2-3 days | LOW |
| 5.1 | Touchscreen UX | Ongoing | MEDIUM |
| 6.1 | 3D Models | TBD | LOW |

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
