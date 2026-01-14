# Intelligent Exercise Prescription System - Master Implementation Plan

> **Goal**: Transform MuscleMap's exercise prescription system into an AI-powered, science-backed platform that delivers personalized training programs rivaling elite sports coaching, circus arts conditioning, and professional rehabilitation protocols.

---

## Executive Summary

This plan outlines a comprehensive overhaul of MuscleMap's exercise prescription system to:

1. **Expand exercise library** from ~85 exercises to 500+ with scientific categorization
2. **Add AI-powered personalization** using machine learning and real-time adaptation
3. **Implement injury rehabilitation journeys** as first-class citizens in the goal system
4. **Incorporate elite training methodologies** from climbing, Olympic weightlifting, gymnastics, wrestling, and circus arts
5. **Create progressive skill trees** for advanced movements (planche, front lever, muscle-up, handstand)
6. **Integrate scientific periodization** including block, linear, and undulating models

---

## Table of Contents

1. [Phase 1: Exercise Library Expansion](#phase-1-exercise-library-expansion)
2. [Phase 2: Scientific Categorization & Metadata](#phase-2-scientific-categorization--metadata)
3. [Phase 3: Injury Rehabilitation System](#phase-3-injury-rehabilitation-system)
4. [Phase 4: AI-Powered Prescription Engine](#phase-4-ai-powered-prescription-engine)
5. [Phase 5: Elite Training Methodologies](#phase-5-elite-training-methodologies)
6. [Phase 6: Skill Progression Trees](#phase-6-skill-progression-trees)
7. [Phase 7: Periodization Engine](#phase-7-periodization-engine)
8. [Phase 8: Frontend & UX](#phase-8-frontend--ux)
9. [Database Schema Changes](#database-schema-changes)
10. [API Changes](#api-changes)
11. [Sources & Research](#sources--research)

---

## Phase 1: Exercise Library Expansion

### Current State
- ~85 exercises across bodyweight, kettlebell, and freeweight categories
- Basic difficulty ratings (1-5)
- Muscle activation percentages
- Location and equipment filtering

### Target State
500+ exercises organized by:

#### 1.1 Elite Climbing Exercises (50+ new exercises)
| Category | Examples | Source |
|----------|----------|--------|
| **Hangboard Protocols** | 7/3 Repeaters, Max Hangs, 7-53 Protocol, Abrahangs | [PMC Research](https://pmc.ncbi.nlm.nih.gov/articles/PMC11576708/), [Eric Horst](https://trainingforclimbing.com/advanced-hangboard-training-technique/) |
| **Finger Strength** | Half-crimp hangs, Open-hand hangs, One-arm hangs, Pinch grip training | [Nature Scientific Reports](https://www.nature.com/articles/s41598-021-92898-2) |
| **Contact Strength** | Campus board laddering, Touch training, Power slaps | [Training for Climbing](https://trainingforclimbing.com/4-fingerboard-strength-protocols-that-work/) |
| **Antagonist Training** | Wrist curls, Reverse wrist curls, Finger extensions | [Gripnatic](https://gripnatic.com/grip-training-climbers-essential-guide/) |
| **Core for Climbing** | Front lever progressions, Lock-off training, Body tension drills | [StrengthClimbing](https://strengthclimbing.com/hangboard-repeaters/) |

**Protocol Parameters to Track:**
- Hang duration (seconds)
- Rest duration (seconds)
- Sets per session
- Edge depth (mm)
- Added weight (lbs/kg)
- Grip position (half-crimp, open, full crimp)

#### 1.2 Olympic Weightlifting (40+ new exercises)
| Category | Examples | Source |
|----------|----------|--------|
| **Main Lifts** | Snatch, Clean & Jerk (competition), Power variants | [Catalyst Athletics](https://www.catalystathletics.com/olympic-weightlifting-workouts/training-programs/) |
| **Positional Variations** | Hang clean, Block snatch, High pull, Muscle snatch | [StrengthLog](https://www.strengthlog.com/intermediate-olympic-weightlifting-program/) |
| **Accessory Work** | Snatch grip deadlift, Clean pull, Push press, Jerk dip | [Garage Strength](https://www.garagestrength.com/blogs/news/6-best-accessory-exercises-for-olympic-weightlifting) |
| **Tempo Lifts** | Paused squats, Slow eccentrics, Positional holds | [Boostcamp](https://www.boostcamp.app/blogs/block-periodization-olympic-weightlifting) |

**Protocol Parameters:**
- Percentage of 1RM
- Position (floor, hang, blocks)
- Tempo notation (3-0-1-0)
- Catch position (power, squat)

#### 1.3 Gymnastics Strength Training (60+ new exercises)
| Category | Examples | Source |
|----------|----------|--------|
| **Static Holds** | Front lever, Back lever, Planche, Iron cross progressions | [GMB](https://gmb.io/planche/) |
| **Ring Work** | Support hold, Muscle-up, Ring dips, Skin the cat | [Calisthenics 101](https://www.calisthenics-101.co.uk/how-to-front-lever) |
| **Handstand Training** | Wall walks, Kick-ups, Press to handstand, Handstand walking | [MasterClass](https://www.masterclass.com/articles/gymnastics-conditioning) |
| **Core Progressions** | Hollow rocks, V-ups, Straddle L-sit, Manna progressions | [Gymnastics BC Manual](https://www.gymbc.org/media/lipd1gyc/strength-and-conditioning-manual-2020.pdf) |
| **Tumbling Prep** | Candlestick rolls, Forward rolls, Bridge kickovers | [Shift Movement Science](https://shiftmovementscience.com/legpowerblog/) |

**Progression Tracking:**
- Hold duration for statics
- Progression level (tuck, advanced tuck, straddle, full)
- Band assistance percentage
- Lean angle (for planche)

#### 1.4 Circus Arts / Cirque du Soleil (40+ new exercises)
| Category | Examples | Source |
|----------|----------|--------|
| **Aerial Conditioning** | Inverted hangs, Skin the cat, Aerial silk climbs | [Women's Health](https://www.womenshealthmag.com/uk/fitness/a42744769/how-do-cirque-du-soleil-cast-train/) |
| **Flexibility Protocols** | Active flexibility drills, Loaded stretching, PNF sequences | [Superhero Jacked](https://superherojacked.com/2020/04/10/cirque-du-soleil-workout/) |
| **Balance Training** | Handbalancing, Single-leg balances, Partner balancing | [Cirque Blog](https://blog.cirquedusoleil.com/artist-pre-show-routine) |
| **Contortion Prep** | Backbend progressions, Split progressions, Shoulder flexibility | [Fringe Sport](https://www.fringesport.com/blogs/news/how-a-circus-workout-lets-functional-fitness-clown-around) |

#### 1.5 Wrestling & Combat Conditioning (50+ new exercises)
| Category | Examples | Source |
|----------|----------|--------|
| **Explosive Power** | Hang cleans, Box jumps, Medicine ball throws | [USA Wrestling](https://www.stack.com/a/strength-training-with-the-u-s-national-wrestling-team/) |
| **Grip Strength** | Rope climbs, Gi pull-ups, Towel hangs, Farmer carries | [BJJ Europe](https://www.bjjee.com/articles/this-is-how-high-level-wrestlers-train-their-strength-conditioning/) |
| **Mat Work** | Sprawls, Level changes, Shot drills, Hip switches | [Garage Strength](https://www.garagestrength.com/blogs/news/wrestling-strength-exercises) |
| **Neck Strength** | Neck bridges, Plate neck curls, Wrestler's bridge | [Fanatic Wrestling](https://fanaticwrestling.com/blogs/news/wrestling-conditioning) |
| **Conditioning Circuits** | Tabata intervals, Bear crawl complexes, Tire flips | [Westside Barbell](https://www.westside-barbell.com/blogs/the-blog/wrestling-strength-training) |

#### 1.6 Calisthenics Skill Exercises (50+ new exercises)
| Category | Examples | Source |
|----------|----------|--------|
| **Planche Line** | Pseudo planche push-ups, Tuck planche, Straddle planche | [GMB](https://gmb.io/planche/) |
| **Front Lever Line** | Tuck FL, Advanced tuck FL, Open half lay, Straddle FL | [Berg Movement](https://www.bergmovement.com/calisthenics-blog/front-lever-progressions) |
| **Muscle-Up Line** | High pulls, Transition training, Bar muscle-up, Ring muscle-up | [Calisthenics Unity](https://www.calisthenicsunity.com/forums/general/11292-best-way-to-train-skils) |
| **One-Arm Pull-Up** | Assisted one-arm, Archer pull-ups, One-arm negatives | [Heavyweight Cali](https://heavyweightcali.com/en/front-lever-progression/) |
| **Human Flag** | Vertical flag, Straddle flag, Full flag holds | [Club Calisthenics](https://www.clubcalisthenics.com/post/front-lever-progressions-and-how-to-perform-them-properly) |

---

## Phase 2: Scientific Categorization & Metadata

### 2.1 Movement Pattern Taxonomy

```
MOVEMENT_PATTERNS = {
  // Horizontal Pushing
  'push_horizontal': ['bench_press', 'push_up', 'floor_press'],

  // Vertical Pushing
  'push_vertical': ['ohp', 'hspu', 'pike_push_up'],

  // Horizontal Pulling
  'pull_horizontal': ['row', 'inverted_row', 'cable_row'],

  // Vertical Pulling
  'pull_vertical': ['pull_up', 'lat_pulldown', 'chin_up'],

  // Hip Hinge
  'hip_hinge': ['deadlift', 'rdl', 'swing', 'good_morning'],

  // Squat Pattern
  'squat': ['back_squat', 'front_squat', 'goblet_squat'],

  // Lunge Pattern
  'lunge': ['forward_lunge', 'reverse_lunge', 'split_squat'],

  // Carry
  'carry': ['farmer_walk', 'suitcase_carry', 'overhead_carry'],

  // Rotation
  'rotation': ['woodchop', 'landmine_rotation', 'russian_twist'],

  // Anti-Extension
  'anti_extension': ['plank', 'dead_bug', 'ab_rollout'],

  // Anti-Rotation
  'anti_rotation': ['pallof_press', 'bird_dog', 'single_arm_farmer'],

  // Anti-Lateral Flexion
  'anti_lateral': ['side_plank', 'suitcase_hold', 'offset_carry'],

  // Skill/Isometric
  'skill_static': ['planche', 'front_lever', 'handstand', 'l_sit'],

  // Explosive/Ballistic
  'explosive': ['clean', 'snatch', 'jump', 'throw']
}
```

### 2.2 New Exercise Schema Fields

```sql
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS (
  -- Movement categorization
  movement_pattern TEXT,
  force_vector TEXT, -- 'vertical', 'horizontal', 'diagonal', 'rotational'
  contraction_type TEXT, -- 'concentric', 'eccentric', 'isometric', 'plyometric'

  -- Biomechanical data
  joint_actions JSONB, -- [{joint: 'shoulder', action: 'flexion', rom_degrees: 90}]
  muscle_length_bias TEXT, -- 'shortened', 'lengthened', 'mid-range'

  -- Loading parameters
  optimal_rep_range_low INT,
  optimal_rep_range_high INT,
  optimal_tempo TEXT, -- '3-0-1-0' notation
  typical_intensity_percent FLOAT, -- % of 1RM

  -- Skill requirements
  prerequisite_exercises TEXT[], -- Exercise IDs required first
  prerequisite_strength JSONB, -- {exercise: 'pull_up', reps: 10}
  skill_level TEXT, -- 'fundamental', 'intermediate', 'advanced', 'elite'

  -- Protocol metadata
  protocol_type TEXT, -- 'strength', 'hypertrophy', 'power', 'endurance', 'skill'
  rest_recommendation_seconds INT,
  nervous_system_demand TEXT, -- 'low', 'moderate', 'high', 'very_high'

  -- Safety & rehabilitation
  injury_risk_areas TEXT[], -- ['shoulder', 'lower_back', 'knee']
  contraindications TEXT[], -- ['disc_herniation', 'shoulder_impingement']
  regression_exercise TEXT, -- Easier alternative
  progression_exercise TEXT, -- Harder alternative

  -- Source attribution
  source_methodology TEXT, -- 'gymnastics', 'olympic_weightlifting', 'climbing', etc.
  evidence_level TEXT, -- 'peer_reviewed', 'expert_consensus', 'traditional'
  research_citations TEXT[]
);
```

### 2.3 Equipment Enhancement

```sql
-- New equipment types to add
INSERT INTO equipment_types (id, name, category) VALUES
  -- Climbing
  ('hangboard', 'Hangboard', 'climbing'),
  ('campus_board', 'Campus Board', 'climbing'),
  ('pinch_block', 'Pinch Block', 'climbing'),
  ('grip_trainer', 'Grip Trainer', 'climbing'),

  -- Gymnastics
  ('gymnastics_rings', 'Gymnastics Rings', 'gymnastics'),
  ('parallettes', 'Parallettes', 'gymnastics'),
  ('pommel_horse', 'Pommel Horse', 'gymnastics'),
  ('balance_beam', 'Balance Beam', 'gymnastics'),
  ('springboard', 'Springboard', 'gymnastics'),

  -- Olympic Weightlifting
  ('weightlifting_platform', 'Weightlifting Platform', 'olympic'),
  ('bumper_plates', 'Bumper Plates', 'olympic'),
  ('lifting_straps', 'Lifting Straps', 'olympic'),
  ('weightlifting_shoes', 'Weightlifting Shoes', 'olympic'),
  ('jerk_blocks', 'Jerk Blocks', 'olympic'),

  -- Wrestling/Combat
  ('wrestling_mat', 'Wrestling Mat', 'combat'),
  ('grappling_dummy', 'Grappling Dummy', 'combat'),
  ('heavy_bag', 'Heavy Bag', 'combat'),
  ('battle_ropes', 'Battle Ropes', 'combat'),

  -- Circus/Aerial
  ('aerial_silks', 'Aerial Silks', 'circus'),
  ('trapeze', 'Trapeze', 'circus'),
  ('lyra', 'Lyra (Aerial Hoop)', 'circus'),
  ('handbalancing_canes', 'Handbalancing Canes', 'circus'),

  -- Rehab
  ('therapy_band', 'Therapy Band', 'rehab'),
  ('foam_roller', 'Foam Roller', 'rehab'),
  ('lacrosse_ball', 'Lacrosse Ball', 'rehab'),
  ('balance_board', 'Balance Board', 'rehab'),
  ('bosu_ball', 'BOSU Ball', 'rehab');
```

---

## Phase 3: Injury Rehabilitation System

### 3.1 Rehabilitation as First-Class Journey Goal

Add "Rehabilitation & Recovery" as a top-level goal category alongside strength, hypertrophy, etc.

```typescript
// New journey category
{
  id: 'rehabilitation',
  name: 'Rehabilitation & Recovery',
  description: 'Structured programs to recover from injuries and return to full activity',
  icon: 'healing',
  subcategories: [
    'shoulder_rehab',
    'knee_rehab',
    'back_rehab',
    'hip_rehab',
    'ankle_rehab',
    'wrist_elbow_rehab',
    'neck_rehab',
    'tendon_rehab',
    'post_surgery',
    'chronic_condition_management'
  ]
}
```

### 3.2 Injury Assessment Flow

Users can drill down to their specific injury through a guided flow:

```
1. Body Region Selection
   └─ Shoulder
   └─ Knee
   └─ Back/Spine
   └─ Hip
   └─ Ankle/Foot
   └─ Wrist/Elbow
   └─ Neck

2. Injury Type (per region)
   └─ Shoulder:
      ├─ Rotator Cuff Injury
      ├─ Impingement Syndrome
      ├─ Frozen Shoulder
      ├─ Labral Tear
      ├─ AC Joint Injury
      └─ Instability/Dislocation

3. Severity Assessment
   └─ Acute (< 2 weeks)
   └─ Subacute (2-6 weeks)
   └─ Chronic (> 6 weeks)
   └─ Post-surgical

4. Current Limitations
   └─ Range of motion %
   └─ Pain level (0-10)
   └─ Activity restrictions
```

### 3.3 Evidence-Based Rehabilitation Protocols

Based on research from [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5609374/), [AAOS](https://orthoinfo.aaos.org/en/recovery/rotator-cuff-and-shoulder-conditioning-program/), and [Mass General](https://www.massgeneral.org/assets/mgh/pdf/orthopaedics/sports-medicine/physical-therapy/rehabilitation-protocol-for-acl.pdf):

#### Rotator Cuff Protocol (12-week program)
| Phase | Weeks | Focus | Exercises |
|-------|-------|-------|-----------|
| 1: Protection | 1-2 | Pain control, pendulum exercises | Pendulum swings, passive ROM |
| 2: Early Motion | 3-4 | Active-assisted ROM | Wand exercises, wall walks |
| 3: Strengthening | 5-8 | Isometric → isotonic | Band external rotation, prone Y/T/W |
| 4: Advanced | 9-12 | Full ROM, functional strength | Full rotator cuff series, sport-specific |

#### Tendinopathy Protocols
Based on [Physiopedia](https://www.physio-pedia.com/Tendinopathy_Rehabilitation) and [JOSPT](https://www.jospt.org/doi/10.2519/jospt.2015.5910):

| Phase | Protocol | Details |
|-------|----------|---------|
| Isometric | Pain relief | 5x45sec holds, 2-3x daily, 40-70% MVC |
| Eccentric | Alfredson Protocol | 3x15 reps, 2x daily, 7 days/week, 12 weeks |
| Heavy Slow Resistance | HSR Protocol | 3-4 sets, progress from 15→6 reps over 12 weeks |
| Energy Storage | Plyometrics | Progressive jumping, sport-specific loading |

### 3.4 Rehabilitation Database Schema

```sql
-- Injury profiles
CREATE TABLE injury_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  body_region TEXT NOT NULL,
  icd_10_code TEXT, -- Medical coding for professional reference
  description TEXT,
  typical_recovery_weeks INT,
  severity_levels JSONB, -- {mild: {weeks: 4}, moderate: {weeks: 8}, severe: {weeks: 12}}
  contraindicated_movements TEXT[],
  recommended_movements TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User injury tracking
CREATE TABLE user_injuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  injury_profile_id UUID REFERENCES injury_profiles(id),
  severity TEXT, -- mild, moderate, severe
  onset_date DATE,
  is_surgical BOOLEAN DEFAULT false,
  surgery_date DATE,
  current_phase INT DEFAULT 1,
  pain_level INT, -- 0-10
  rom_flexion_percent INT DEFAULT 100,
  rom_extension_percent INT DEFAULT 100,
  rom_rotation_percent INT DEFAULT 100,
  clearance_date DATE, -- When cleared for full activity
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rehabilitation protocols
CREATE TABLE rehab_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  injury_profile_id UUID REFERENCES injury_profiles(id),
  name TEXT NOT NULL,
  phase INT NOT NULL,
  phase_name TEXT,
  duration_weeks INT,
  goals JSONB, -- {rom: 90, strength: 70, pain: 2}
  progression_criteria JSONB, -- {rom_min: 80, pain_max: 3}
  exercises JSONB, -- [{exercise_id, sets, reps, tempo, notes}]
  frequency_per_week INT,
  precautions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track rehab progress
CREATE TABLE rehab_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_injury_id UUID REFERENCES user_injuries(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  phase INT,
  pain_before INT,
  pain_after INT,
  rom_achieved JSONB, -- {flexion: 85, extension: 90, rotation: 70}
  exercises_completed JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_injury_profiles_region ON injury_profiles(body_region);
CREATE INDEX idx_user_injuries_user ON user_injuries(user_id);
CREATE INDEX idx_rehab_progress_injury ON rehab_progress(user_injury_id, date DESC);
```

---

## Phase 4: AI-Powered Prescription Engine

### 4.1 Current Algorithm Limitations

The current prescription system uses simple scoring:
- Location/equipment hard filters
- Difficulty matching (±30 points)
- Compound preference (+20 points)
- Muscle targeting (+15 points per match)
- Recency penalty (-40 points for exercises used in last 7 days)

### 4.2 New AI-Enhanced Prescription Engine

Based on research from [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12411723/), [Nature](https://www.nature.com/articles/s41598-025-25566-4), and [ACM](https://dl.acm.org/doi/10.1145/3696425):

#### Multi-Factor Scoring Model

```typescript
interface EnhancedScoring {
  // Base filtering (unchanged)
  locationMatch: boolean;
  equipmentMatch: boolean;

  // Personalization factors (NEW)
  userPreferenceScore: number;      // Based on exercise ratings, completion rates
  progressionReadiness: number;     // Based on strength prerequisites met
  fatigueAdjustment: number;        // Based on recent training load
  injuryRiskScore: number;          // Based on user limitations

  // Optimization factors (NEW)
  muscleBalanceScore: number;       // Address imbalances in muscle development
  movementPatternVariety: number;   // Ensure all patterns trained weekly
  periodizationAlignment: number;   // Match current training phase
  recoveryStatus: number;           // Based on HRV, sleep, soreness if available

  // Learning factors (NEW)
  similarUserSuccess: number;       // What worked for similar users
  exerciseEffectiveness: number;    // Based on TU/effort ratio
  plateauPrevention: number;        // Vary exercises approaching plateaus
}
```

#### Reinforcement Learning Integration

Implement a feedback loop that learns from:
1. **User completion rates**: Did they finish the prescribed workout?
2. **Subjective feedback**: "Too hard", "Too easy", "Enjoyable"
3. **Objective progress**: TU accumulation, strength gains, body composition
4. **Engagement metrics**: Session duration, exercise skips

```typescript
// Pseudo-code for RL-based prescription
class PrescriptionAgent {
  // State: User profile, recent workouts, current goals, constraints
  // Actions: Select exercises, set parameters (sets, reps, weight)
  // Rewards: +1 for completed workouts, +2 for positive feedback,
  //          +3 for measurable progress, -1 for skipped exercises

  async selectExercises(state: UserState): Promise<Exercise[]> {
    const embeddings = await this.getUserEmbedding(state);
    const candidates = await this.getCandidateExercises(state.constraints);

    // Score each candidate using trained model
    const scores = await this.model.predict(embeddings, candidates);

    // Apply exploration vs exploitation
    return this.selectWithExploration(candidates, scores, epsilon: 0.1);
  }
}
```

### 4.3 Real-Time Adaptation

If wearable data is available (future integration):

```typescript
interface RealTimeAdaptation {
  // During workout adjustments
  heartRateZone: 'recovery' | 'fat_burn' | 'cardio' | 'peak';
  perceivedExertion: number; // RPE 1-10
  restTimeAdjustment: number; // Seconds to add/subtract

  // Between-set suggestions
  suggestWeightChange: 'increase' | 'maintain' | 'decrease';
  suggestRepChange: number;

  // Workout-level adaptations
  shouldExtendWorkout: boolean;
  shouldCutWorkout: boolean;
  alternativeExercises: Exercise[];
}
```

### 4.4 Constraint Expansion

```typescript
// Enhanced constraint schema
const enhancedConstraintSchema = z.object({
  // Existing constraints
  timeAvailable: z.number().min(15).max(180).default(45),
  location: z.enum(['gym', 'home', 'park', 'hotel', 'office', 'travel', 'climbing_gym', 'crossfit_box']),
  equipmentAvailable: z.array(z.string()),
  goals: z.array(z.enum([
    'strength', 'hypertrophy', 'endurance', 'mobility', 'fat_loss',
    'skill_acquisition', 'sport_specific', 'rehabilitation', 'maintenance',
    'power', 'speed', 'flexibility', 'balance'
  ])),
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced', 'elite']),

  // NEW: Injury considerations
  activeInjuries: z.array(z.string()), // injury_profile_ids
  avoidBodyParts: z.array(z.string()),
  maxPainTolerance: z.number().min(0).max(10).default(3),

  // NEW: Training preferences
  preferredExerciseTypes: z.array(z.string()), // 'bodyweight', 'kettlebell', etc.
  avoidExerciseTypes: z.array(z.string()),
  intensityPreference: z.enum(['light', 'moderate', 'hard', 'very_hard']),
  varietyPreference: z.enum(['consistent', 'varied', 'highly_varied']),

  // NEW: Skill training
  skillsInProgress: z.array(z.string()), // 'planche', 'front_lever', etc.
  allocateSkillTime: z.number().min(0).max(30).default(10), // minutes for skill work

  // NEW: Periodization context
  trainingPhase: z.enum(['accumulation', 'intensification', 'realization', 'deload']),
  weekInCycle: z.number().min(1).max(12),
  dayInSplit: z.enum(['push', 'pull', 'legs', 'upper', 'lower', 'full_body']),

  // NEW: Energy system targeting
  energySystem: z.enum(['phosphagen', 'glycolytic', 'oxidative', 'mixed']),

  // NEW: Sport specificity
  targetSport: z.string().optional(), // 'climbing', 'wrestling', 'gymnastics'
  competitionDate: z.date().optional()
});
```

---

## Phase 5: Elite Training Methodologies

### 5.1 Climbing Training Integration

Based on [PMC research](https://pmc.ncbi.nlm.nih.gov/articles/PMC11576708/), [Training for Climbing](https://trainingforclimbing.com/advanced-hangboard-training-technique/), and [StrengthClimbing](https://strengthclimbing.com/hangboard-repeaters/):

```typescript
const climbingProtocols = {
  // Max Hangs Protocol
  maxHangs: {
    sets: 5,
    hangDuration: 10,
    restBetweenSets: 180, // 3 minutes
    edgeDepth: '18-22mm',
    intensity: 'max -2 seconds',
    frequency: '2-3x/week',
    progression: 'Add 2.5-5lbs when completing all sets',
    source: 'Eric Horst Research'
  },

  // 7/3 Repeaters
  repeaters: {
    sets: 6,
    hangDuration: 7,
    restWithinSet: 3,
    repsPerSet: 6,
    restBetweenSets: 180,
    intensity: 'bodyweight to start',
    frequency: '2x/week',
    progression: 'Add set, then add weight',
    source: 'PMC Climbing Research'
  },

  // Density Hangs (Eva Lopez)
  densityHangs: {
    sets: 4,
    hangDuration: 'max',
    restBetweenSets: 60,
    edgeDepth: '18mm',
    intensity: 'submaximal',
    frequency: '2-3x/week',
    progression: 'Smaller edges before added weight',
    source: 'Eva Lopez Protocol'
  }
};
```

### 5.2 Olympic Weightlifting Integration

Based on [Catalyst Athletics](https://www.catalystathletics.com/olympic-weightlifting-workouts/training-programs/) and [Boostcamp](https://www.boostcamp.app/blogs/block-periodization-olympic-weightlifting):

```typescript
const weightliftingPeriodization = {
  accumulation: {
    weeks: 4,
    volume: 'high',
    intensity: '65-80%',
    exercises: ['snatch_pulls', 'clean_pulls', 'front_squats', 'rdl'],
    accessoryFocus: 'hypertrophy, positional strength'
  },

  transmutation: {
    weeks: 3,
    volume: 'moderate',
    intensity: '80-90%',
    exercises: ['power_snatch', 'power_clean', 'back_squat', 'push_press'],
    accessoryFocus: 'speed, explosiveness'
  },

  realization: {
    weeks: 2,
    volume: 'low',
    intensity: '90-100%',
    exercises: ['snatch', 'clean_and_jerk', 'back_squat'],
    accessoryFocus: 'minimal, recovery'
  }
};
```

### 5.3 Gymnastics Strength Training Integration

Based on [Shift Movement Science](https://shiftmovementscience.com/nickdanstrengthprogram2021/) and [Gymnastics BC](https://www.gymbc.org/media/lipd1gyc/strength-and-conditioning-manual-2020.pdf):

```typescript
const gymnasticsProgression = {
  fundamentals: {
    exercises: ['hollow_hold', 'arch_hold', 'support_hold', 'hanging'],
    criteria: {
      hollowHold: '60s',
      archHold: '60s',
      supportHold: '60s',
      deadHang: '90s'
    }
  },

  intermediate: {
    exercises: ['l_sit', 'tuck_front_lever', 'tuck_back_lever', 'wall_handstand'],
    criteria: {
      lSit: '30s',
      tuckFrontLever: '15s',
      tuckBackLever: '15s',
      wallHandstand: '60s'
    }
  },

  advanced: {
    exercises: ['straddle_l', 'adv_tuck_front_lever', 'straddle_back_lever', 'freestanding_hs'],
    criteria: {
      straddleL: '15s',
      advTuckFrontLever: '15s',
      straddleBackLever: '15s',
      freestandingHandstand: '30s'
    }
  },

  elite: {
    exercises: ['manna', 'full_front_lever', 'full_back_lever', 'press_handstand'],
    criteria: {
      // These are lifetime achievements
      fullFrontLever: '10s',
      fullBackLever: '15s',
      pressHandstand: '1 rep'
    }
  }
};
```

### 5.4 Wrestling Conditioning Integration

Based on [USA Wrestling](https://www.stack.com/a/strength-training-with-the-u-s-national-wrestling-team/) and [Garage Strength](https://www.garagestrength.com/blogs/news/wrestling-strength-exercises):

```typescript
const wrestlingConditioning = {
  inSeason: {
    frequency: '2-3x/week',
    focus: 'maintain, don't overtrain',
    exercises: ['hang_clean', 'front_squat', 'pull_up', 'dip'],
    conditioning: 'sport practice is primary conditioning'
  },

  offSeason: {
    frequency: '4-5x/week',
    focus: 'build strength base',
    exercises: ['deadlift', 'squat', 'bench', 'row', 'accessory'],
    conditioning: 'HIIT, circuits, tabata'
  },

  preCompetition: {
    frequency: '2x/week',
    focus: 'peak power',
    exercises: ['hang_clean', 'box_jump', 'explosive_push_up'],
    conditioning: 'sport-specific intervals'
  },

  keyExercises: [
    'rope_climb',
    'towel_pull_up',
    'sprawl',
    'shot_drill',
    'single_leg_squat',
    'neck_bridge',
    'assault_bike_tabata'
  ]
};
```

### 5.5 Circus Arts Integration

Based on [Cirque du Soleil Training](https://www.womenshealthmag.com/uk/fitness/a42744769/how-do-cirque-du-soleil-cast-train/) and [Women's Health](https://www.womenshealthmag.com/fitness/a19977838/cirque-du-soleil-workout/):

```typescript
const circusConditioning = {
  dailyFoundation: {
    warmup: ['splits', 'bridges', 'hip_circles', 'shoulder_circles'],
    duration: '40 minutes',
    focus: 'flexibility maintenance'
  },

  strengthWork: {
    exercises: ['pull_up', 'push_up', 'plank_variations', 'leg_raise'],
    style: 'circuit training',
    emphasis: 'bodyweight, functional'
  },

  specializedTraining: {
    aerial: ['invert_hang', 'skin_the_cat', 'rope_climb', 'silk_climb'],
    balance: ['handstand', 'headstand', 'elbow_lever'],
    flexibility: ['active_splits', 'backbend_progression', 'pike_stretch']
  },

  showConditioning: {
    note: 'The show itself serves as primary cardio',
    additional: 'Optional circuits post-show for extra work'
  }
};
```

---

## Phase 6: Skill Progression Trees

### 6.1 Visual Skill Tree Structure

Each advanced skill has a progression tree with prerequisites:

```
PLANCHE PROGRESSION TREE
========================

Level 0: Prerequisites
├── Push-Up: 30 reps
├── Dip: 15 reps
├── Pseudo Planche Push-Up: 15 reps
└── Plank: 60 seconds

Level 1: Foundation
├── Planche Lean (15° lean): 30 seconds
├── Tuck Planche (feet touching): 10 seconds
└── Frog Stand: 30 seconds

Level 2: Intermediate
├── Tuck Planche (feet off): 20 seconds
├── Planche Lean (30° lean): 20 seconds
└── Advanced Tuck Planche: 10 seconds

Level 3: Advanced
├── Advanced Tuck Planche: 20 seconds
├── Straddle Planche: 5 seconds
└── One-Leg Planche (both sides): 10 seconds

Level 4: Elite
├── Straddle Planche: 15 seconds
├── Full Planche: 3 seconds
└── Full Planche: 10 seconds (mastery)
```

### 6.2 Skill Progression Database Schema

```sql
CREATE TABLE skill_progressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name TEXT NOT NULL, -- 'planche', 'front_lever', 'muscle_up', etc.
  level INT NOT NULL,
  level_name TEXT NOT NULL, -- 'foundation', 'intermediate', 'advanced', 'elite'
  exercise_id UUID REFERENCES exercises(id),
  target_metric TEXT NOT NULL, -- 'duration_seconds', 'reps', 'weight_added'
  target_value FLOAT NOT NULL,
  prerequisites JSONB, -- [{skill_progression_id, target_value}]
  estimated_weeks INT,
  tips TEXT[],
  common_mistakes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_skill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  skill_progression_id UUID REFERENCES skill_progressions(id),
  current_value FLOAT,
  best_value FLOAT,
  attempts INT DEFAULT 0,
  first_achieved_at TIMESTAMPTZ,
  last_tested_at TIMESTAMPTZ,
  status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'achieved'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_skill_progressions_skill ON skill_progressions(skill_name, level);
CREATE INDEX idx_user_skill_progress_user ON user_skill_progress(user_id);
CREATE UNIQUE INDEX idx_user_skill_unique ON user_skill_progress(user_id, skill_progression_id);
```

### 6.3 Skill Training Prescription

```typescript
async function prescribeSkillTraining(
  userId: string,
  skillName: string,
  allocatedMinutes: number
): Promise<SkillWorkout> {
  // Get user's current progress
  const currentLevel = await getUserSkillLevel(userId, skillName);

  // Get exercises for current level + next level
  const exercises = await getSkillExercises(skillName, currentLevel);

  // Structure the skill session
  return {
    warmup: [
      { name: 'Wrist Circles', duration: 60 },
      { name: 'Shoulder Dislocates', reps: 15 },
      { name: 'Scapular Push-Ups', reps: 15 }
    ],

    primaryWork: {
      exercise: exercises.currentLevelExercise,
      protocol: 'max_hold_attempts',
      sets: 5,
      rest: 180, // 3 minutes
      cue: 'Focus on form, not duration'
    },

    supplementaryWork: [
      {
        exercise: exercises.strengthBuilder,
        sets: 3,
        reps: 8,
        rest: 90
      },
      {
        exercise: exercises.supportingExercise,
        sets: 3,
        reps: 10,
        rest: 60
      }
    ],

    nextMilestone: exercises.nextLevelTarget,
    estimatedWeeksToNext: exercises.estimatedWeeks
  };
}
```

---

## Phase 7: Periodization Engine

### 7.1 Periodization Models

Based on [Weightlifting Canada](https://weightliftingcanada.ca/wp-content/uploads/2020/09/CWFHC-Training-Periodization-for-the-Olympic-Weightlifter.pdf) and [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4637911/):

```typescript
// Block Periodization
const blockPeriodization = {
  mesocycle: {
    accumulation: {
      duration: '3-4 weeks',
      volume: 'high',
      intensity: 'low-moderate (60-75%)',
      focus: 'Build work capacity, technique, hypertrophy',
      exercises: 'Varied, including accessories'
    },
    transmutation: {
      duration: '2-3 weeks',
      volume: 'moderate',
      intensity: 'moderate-high (75-90%)',
      focus: 'Convert base to sport-specific strength',
      exercises: 'More specific to goals'
    },
    realization: {
      duration: '1-2 weeks',
      volume: 'low',
      intensity: 'high-max (90-100%+)',
      focus: 'Peak performance',
      exercises: 'Only main lifts/skills'
    }
  }
};

// Daily Undulating Periodization
const dupPeriodization = {
  week: {
    monday: { focus: 'hypertrophy', reps: '8-12', intensity: '65-75%' },
    wednesday: { focus: 'strength', reps: '4-6', intensity: '80-87%' },
    friday: { focus: 'power', reps: '2-4', intensity: '85-95%' }
  }
};

// Linear Periodization
const linearPeriodization = {
  week1_4: { reps: '12-15', intensity: '60-70%', focus: 'foundation' },
  week5_8: { reps: '8-10', intensity: '70-80%', focus: 'strength-endurance' },
  week9_12: { reps: '4-6', intensity: '80-90%', focus: 'strength' },
  week13_16: { reps: '1-3', intensity: '90-100%', focus: 'peak' }
};
```

### 7.2 Periodization Schema

```sql
CREATE TABLE training_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  periodization_model TEXT NOT NULL, -- 'block', 'dup', 'linear', 'conjugate'
  start_date DATE NOT NULL,
  end_date DATE,
  goal TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'abandoned'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE training_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES training_cycles(id) ON DELETE CASCADE,
  phase_type TEXT NOT NULL, -- 'accumulation', 'transmutation', 'realization', 'deload'
  phase_order INT NOT NULL,
  duration_weeks INT NOT NULL,
  volume_modifier FLOAT DEFAULT 1.0,
  intensity_range_low FLOAT,
  intensity_range_high FLOAT,
  rep_range_low INT,
  rep_range_high INT,
  focus_areas TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE training_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES training_phases(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  planned_sessions INT,
  actual_sessions INT DEFAULT 0,
  total_volume FLOAT,
  average_intensity FLOAT,
  fatigue_rating INT, -- 1-10
  readiness_rating INT, -- 1-10
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_training_cycles_user ON training_cycles(user_id, status);
CREATE INDEX idx_training_phases_cycle ON training_phases(cycle_id, phase_order);
CREATE INDEX idx_training_weeks_phase ON training_weeks(phase_id, week_number);
```

### 7.3 Automatic Deload Detection

```typescript
async function shouldDeload(userId: string): Promise<DeloadRecommendation> {
  const recentWeeks = await getRecentTrainingWeeks(userId, 4);

  // Check fatigue accumulation
  const avgFatigue = average(recentWeeks.map(w => w.fatigue_rating));
  const avgReadiness = average(recentWeeks.map(w => w.readiness_rating));

  // Check volume trends
  const volumeTrend = calculateTrend(recentWeeks.map(w => w.total_volume));

  // Check performance markers
  const performanceData = await getRecentPRs(userId);
  const plateauDetected = detectPlateau(performanceData);

  // Recommendation logic
  if (avgFatigue > 7 || avgReadiness < 4 || plateauDetected) {
    return {
      recommend: true,
      reason: avgFatigue > 7 ? 'High accumulated fatigue' :
              avgReadiness < 4 ? 'Low readiness scores' :
              'Performance plateau detected',
      suggestedDuration: '1 week',
      suggestedVolume: '50% of normal',
      suggestedIntensity: '60-70% of normal'
    };
  }

  return { recommend: false };
}
```

---

## Phase 8: Frontend & UX

### 8.1 Exercise Discovery Interface

```
┌─────────────────────────────────────────────────────────────┐
│  EXERCISE LIBRARY                          [Search...] 🔍   │
├─────────────────────────────────────────────────────────────┤
│ Filters:                                                    │
│ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐│
│ │Movement │ │Equipment │ │Difficulty│ │Methodology        ││
│ │Pattern ▼│ │        ▼ │ │        ▼ │ │                 ▼ ││
│ └─────────┘ └──────────┘ └──────────┘ └───────────────────┘│
│                                                             │
│ Categories:                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ 🧗 Climbing │ │ 🏋️ Olympic  │ │ 🤸 Gymnastics│            │
│ │    (52)     │ │    (45)     │ │    (68)     │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ 🤼 Wrestling│ │ 🎪 Circus   │ │ 🩹 Rehab    │            │
│ │    (55)     │ │    (42)     │ │    (80)     │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Injury Rehabilitation Flow

```
┌─────────────────────────────────────────────────────────────┐
│  INJURY REHABILITATION CENTER                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Where is your injury?                                      │
│                                                             │
│          🦴 Interactive Body Model 🦴                        │
│                                                             │
│            ○ Head/Neck                                      │
│           ╱│╲                                               │
│     ○────│─│─│────○  ← Shoulder, Elbow, Wrist, Hand        │
│          ○│○│○                                              │
│           │○│     ← Core, Lower Back                        │
│          ╱   ╲                                              │
│    ○────│     │────○ ← Hip, Knee, Ankle, Foot              │
│        ╱       ╲                                            │
│       ○         ○                                           │
│                                                             │
│  Selected: [SHOULDER] - [RIGHT]                             │
│                                                             │
│  What type of injury?                                       │
│  ┌────────────────────────────────────────────────────────┐│
│  │ ○ Rotator Cuff Tear/Strain                             ││
│  │ ○ Impingement Syndrome                                 ││
│  │ ○ Frozen Shoulder (Adhesive Capsulitis)               ││
│  │ ○ Labral Tear (SLAP)                                  ││
│  │ ○ AC Joint Injury                                      ││
│  │ ○ Instability/Dislocation                              ││
│  │ ○ Other / Not Sure                                     ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│                              [Continue →]                   │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Skill Progression Visualization

```
┌─────────────────────────────────────────────────────────────┐
│  FRONT LEVER PROGRESSION          [Your Progress: Level 2]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║  [✓] FOUNDATION                                       ║  │
│  ║      ├── Dead Hang: 60s ✓                            ║  │
│  ║      ├── Active Hang: 30s ✓                          ║  │
│  ║      └── Pull-Ups: 10 reps ✓                         ║  │
│  ╠═══════════════════════════════════════════════════════╣  │
│  ║  [✓] LEVEL 1 - TUCK                                  ║  │
│  ║      ├── Tuck Front Lever: 15s ✓                     ║  │
│  ║      ├── Tuck FL Rows: 5 reps ✓                      ║  │
│  ║      └── Skin the Cat: 5 reps ✓                      ║  │
│  ╠═══════════════════════════════════════════════════════╣  │
│  ║  [→] LEVEL 2 - ADVANCED TUCK    ← YOU ARE HERE       ║  │
│  ║      ├── Advanced Tuck FL: 8s / 15s target           ║  │
│  ║      ├── Adv Tuck FL Rows: 3 / 5 reps target         ║  │
│  ║      └── Weighted Pull-Ups: +25lbs / +40lbs target   ║  │
│  ╠═══════════════════════════════════════════════════════╣  │
│  ║  [ ] LEVEL 3 - STRADDLE                  [Locked]    ║  │
│  ║      ├── Straddle Front Lever: 10s                   ║  │
│  ║      └── Straddle FL Rows: 5 reps                    ║  │
│  ╠═══════════════════════════════════════════════════════╣  │
│  ║  [ ] LEVEL 4 - FULL                      [Locked]    ║  │
│  ║      └── Full Front Lever: 10s                       ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
│                                                             │
│  [📊 View Training Plan]  [📹 Watch Tutorial]  [📝 Log Attempt]│
└─────────────────────────────────────────────────────────────┘
```

### 8.4 AI Prescription Explanation

```
┌─────────────────────────────────────────────────────────────┐
│  TODAY'S PRESCRIPTION                    [Why this workout?]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🧠 AI Analysis:                                            │
│  ┌────────────────────────────────────────────────────────┐│
│  │ Based on your recent training (7 days):                ││
│  │ • Push volume: 85% of target ✓                         ││
│  │ • Pull volume: 62% of target ⚠️ (prioritizing today)   ││
│  │ • Legs volume: 78% of target ✓                         ││
│  │                                                        ││
│  │ Adjustments made:                                      ││
│  │ • Added extra pulling exercises (+2)                   ││
│  │ • Reduced push volume to aid recovery                  ││
│  │ • Included your skill work: Front Lever (10 min)       ││
│  │ • Avoided: Shoulder press (impingement flag active)    ││
│  │                                                        ││
│  │ Periodization context:                                 ││
│  │ • Week 2 of 4 in Accumulation phase                    ││
│  │ • Target: Build volume base                            ││
│  │ • Intensity: 65-75% (moderate)                         ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  [Accept Workout]  [Modify]  [Generate Alternative]         │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema Changes

### Migration Summary

```
Migration 065: Exercise Library Expansion
- Add new columns to exercises table (movement_pattern, force_vector, etc.)
- Add new equipment types (climbing, gymnastics, olympic, combat, circus, rehab)
- Seed 400+ new exercises with full metadata

Migration 066: Injury Rehabilitation System
- Create injury_profiles table
- Create user_injuries table
- Create rehab_protocols table
- Create rehab_progress table
- Seed common injury protocols (shoulder, knee, back, hip, ankle)

Migration 067: Skill Progressions
- Create skill_progressions table
- Create user_skill_progress table
- Seed progression trees (planche, front lever, muscle-up, handstand, etc.)

Migration 068: Periodization Engine
- Create training_cycles table
- Create training_phases table
- Create training_weeks table
- Add periodization context to prescriptions

Migration 069: AI Prescription Enhancement
- Add user_exercise_preferences table
- Add exercise_effectiveness_scores table
- Add user_training_feedback table
- Add indexes for ML model queries
```

---

## API Changes

### New Endpoints

```
# Rehabilitation
POST   /api/rehabilitation/assess          # Start injury assessment
GET    /api/rehabilitation/protocols       # Get available protocols
POST   /api/rehabilitation/start           # Begin rehab journey
GET    /api/rehabilitation/progress/:id    # Get rehab progress
POST   /api/rehabilitation/log             # Log rehab session

# Skills
GET    /api/skills/trees                   # Get all skill trees
GET    /api/skills/tree/:skillName         # Get specific skill tree
GET    /api/skills/progress                # Get user's skill progress
POST   /api/skills/test                    # Log skill attempt
GET    /api/skills/prescription            # Get skill training prescription

# Periodization
POST   /api/periodization/cycle            # Create training cycle
GET    /api/periodization/current          # Get current cycle/phase
POST   /api/periodization/week             # Log week summary
GET    /api/periodization/recommendations  # Get phase recommendations

# Enhanced Prescription
POST   /api/prescription/v2/generate       # New AI-powered prescription
GET    /api/prescription/explain/:id       # Get AI explanation for prescription
POST   /api/prescription/feedback          # Submit workout feedback
GET    /api/prescription/alternatives      # Get alternative exercises

# Exercise Library
GET    /api/exercises/v2                   # Enhanced exercise list with filters
GET    /api/exercises/by-methodology       # Get by training methodology
GET    /api/exercises/progressions/:id     # Get regression/progression chain
GET    /api/exercises/substitutes/:id      # Get injury-safe substitutes
```

### GraphQL Schema Additions

```graphql
type Exercise {
  # Existing fields...

  # New fields
  movementPattern: String
  forceVector: String
  contractionType: String
  jointActions: [JointAction!]
  skillLevel: SkillLevel
  sourceMethodology: String
  evidenceLevel: String
  prerequisiteExercises: [Exercise!]
  regressionExercise: Exercise
  progressionExercise: Exercise
  injuryRiskAreas: [String!]
  contraindications: [String!]
}

type InjuryProfile {
  id: ID!
  name: String!
  bodyRegion: String!
  description: String
  typicalRecoveryWeeks: Int
  severityLevels: JSON
  contraindicatedMovements: [String!]
  recommendedMovements: [String!]
  protocols: [RehabProtocol!]!
}

type RehabProtocol {
  id: ID!
  injuryProfile: InjuryProfile!
  phase: Int!
  phaseName: String!
  durationWeeks: Int!
  exercises: [ProtocolExercise!]!
  progressionCriteria: JSON
}

type SkillProgression {
  id: ID!
  skillName: String!
  level: Int!
  levelName: String!
  exercise: Exercise!
  targetMetric: String!
  targetValue: Float!
  estimatedWeeks: Int
  prerequisites: [SkillProgression!]
  userProgress: UserSkillProgress
}

type TrainingCycle {
  id: ID!
  name: String!
  periodizationModel: String!
  startDate: Date!
  endDate: Date
  currentPhase: TrainingPhase
  phases: [TrainingPhase!]!
}

type Query {
  # Existing queries...

  # New queries
  injuryProfiles(bodyRegion: String): [InjuryProfile!]!
  rehabProtocol(injuryId: ID!, severity: String!): RehabProtocol
  skillTree(skillName: String!): [SkillProgression!]!
  mySkillProgress: [UserSkillProgress!]!
  currentTrainingCycle: TrainingCycle
  exercisesByMethodology(methodology: String!): [Exercise!]!
}

type Mutation {
  # Existing mutations...

  # New mutations
  startRehabJourney(injuryProfileId: ID!, severity: String!): UserInjury!
  logRehabProgress(injuryId: ID!, input: RehabProgressInput!): RehabProgress!
  testSkill(skillProgressionId: ID!, value: Float!): UserSkillProgress!
  createTrainingCycle(input: TrainingCycleInput!): TrainingCycle!
  submitWorkoutFeedback(prescriptionId: ID!, feedback: FeedbackInput!): Boolean!
}
```

---

## Sources & Research

### Climbing
- [PMC: Effects of Different Loading Programs on Finger Strength](https://pmc.ncbi.nlm.nih.gov/articles/PMC11576708/)
- [Nature: Hangboard Training in Advanced Climbers](https://www.nature.com/articles/s41598-021-92898-2)
- [Eric Horst: Advanced Hangboard Training](https://trainingforclimbing.com/advanced-hangboard-training-technique/)
- [StrengthClimbing: Hangboard Repeaters](https://strengthclimbing.com/hangboard-repeaters/)

### Olympic Weightlifting
- [Weightlifting Canada: Training Periodization](https://weightliftingcanada.ca/wp-content/uploads/2020/09/CWFHC-Training-Periodization-for-the-Olympic-Weightlifter.pdf)
- [Catalyst Athletics: Programs](https://www.catalystathletics.com/olympic-weightlifting-workouts/training-programs/)
- [Garage Strength: Accessory Exercises](https://www.garagestrength.com/blogs/news/6-best-accessory-exercises-for-olympic-weightlifting)
- [Boostcamp: Block Periodization](https://www.boostcamp.app/blogs/block-periodization-olympic-weightlifting)

### Gymnastics
- [Shift Movement Science: Building Strength Programs](https://shiftmovementscience.com/nickdanstrengthprogram2021/)
- [Gymnastics BC: Strength and Conditioning Manual](https://www.gymbc.org/media/lipd1gyc/strength-and-conditioning-manual-2020.pdf)
- [MasterClass: Gymnastics Conditioning](https://www.masterclass.com/articles/gymnastics-conditioning)

### Calisthenics Skills
- [GMB: Planche Progression](https://gmb.io/planche/)
- [Berg Movement: Front Lever Progressions](https://www.bergmovement.com/calisthenics-blog/front-lever-progressions)
- [Calisthenics 101: Front Lever Guide](https://www.calisthenics-101.co.uk/how-to-front-lever)
- [Heavyweight Cali: Front Lever Ultimate Guide](https://heavyweightcali.com/en/front-lever-progression/)

### Wrestling & Combat
- [USA Wrestling: National Team Training](https://www.stack.com/a/strength-training-with-the-u-s-national-wrestling-team/)
- [Garage Strength: Wrestling Exercises](https://www.garagestrength.com/blogs/news/wrestling-strength-exercises)
- [Westside Barbell: Wrestling Strength](https://www.westside-barbell.com/blogs/the-blog/wrestling-strength-training)
- [Fanatic Wrestling: Conditioning Guide](https://fanaticwrestling.com/blogs/news/wrestling-conditioning)

### Circus Arts
- [Women's Health: Cirque du Soleil Training](https://www.womenshealthmag.com/uk/fitness/a42744769/how-do-cirque-du-soleil-cast-train/)
- [Cirque Blog: Artist Pre-Show Routine](https://blog.cirquedusoleil.com/artist-pre-show-routine)
- [Fringe Sport: Circus Workout](https://www.fringesport.com/blogs/news/how-a-circus-workout-lets-functional-fitness-clown-around)

### Injury Rehabilitation
- [PMC: Current Concepts in Sports Injury Rehabilitation](https://pmc.ncbi.nlm.nih.gov/articles/PMC5609374/)
- [AAOS: Rotator Cuff Conditioning Program](https://orthoinfo.aaos.org/en/recovery/rotator-cuff-and-shoulder-conditioning-program/)
- [Mass General: ACL Rehabilitation Protocol](https://www.massgeneral.org/assets/mgh/pdf/orthopaedics/sports-medicine/physical-therapy/rehabilitation-protocol-for-acl.pdf)
- [Physiopedia: Tendinopathy Rehabilitation](https://www.physio-pedia.com/Tendinopathy_Rehabilitation)
- [JOSPT: Eccentric vs Concentric for Tendinopathies](https://www.jospt.org/doi/10.2519/jospt.2015.5910)

### AI/ML in Fitness
- [PMC: ML for Personalized Workout Recommendations](https://pmc.ncbi.nlm.nih.gov/articles/PMC12411723/)
- [Nature: Personalized Fitness Recommendations Using ML](https://www.nature.com/articles/s41598-025-25566-4)
- [PMC: OpenAI GPT-4 for Exercise Prescription](https://pmc.ncbi.nlm.nih.gov/articles/PMC10955739/)
- [ACM: PERFECT Recommendation Framework](https://dl.acm.org/doi/10.1145/3696425)

### Periodization
- [PMC: Current Concepts in Periodization of S&C](https://pmc.ncbi.nlm.nih.gov/articles/PMC4637911/)

---

## Implementation Priority

### High Priority (Phase 1-3)
1. **Exercise Library Expansion** - Foundation for everything else
2. **Scientific Categorization** - Enables intelligent filtering
3. **Injury Rehabilitation System** - High user value, differentiator

### Medium Priority (Phase 4-6)
4. **AI-Powered Prescription** - Improves core experience
5. **Elite Training Methodologies** - Appeals to serious athletes
6. **Skill Progression Trees** - Gamification and long-term engagement

### Lower Priority (Phase 7-8)
7. **Periodization Engine** - Advanced feature for power users
8. **Frontend & UX** - Ongoing throughout all phases

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Exercise library size | ~85 | 500+ |
| Training methodologies | 3 | 8+ |
| Injury protocols | 0 | 20+ |
| Skill progressions | 0 | 10+ |
| Prescription personalization | Basic scoring | ML-enhanced |
| User retention (30-day) | TBD | +20% |
| Workout completion rate | TBD | +15% |
| User satisfaction score | TBD | 4.5+/5 |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Overwhelming users with options | Smart defaults, progressive disclosure |
| Incorrect rehab advice causing injury | Clear disclaimers, medical consultation recommendations |
| AI recommendations being wrong | Human override always available, feedback loop |
| Feature bloat | Phased rollout, A/B testing |
| Performance degradation | Caching, lazy loading, pagination |

---

## Conclusion

This plan transforms MuscleMap from a basic workout tracker into an AI-powered, science-backed training platform that rivals professional coaching. By incorporating methodologies from elite climbing, Olympic weightlifting, gymnastics, wrestling, circus arts, and evidence-based rehabilitation, users will have access to the most comprehensive exercise prescription system available in a consumer fitness app.

The phased approach ensures we can ship value incrementally while building toward the complete vision. Each phase is designed to be independently valuable while laying groundwork for subsequent phases.

**Ready for your approval to begin implementation.**
