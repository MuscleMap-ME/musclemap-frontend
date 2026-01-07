# MuscleMap Implementation Plans

This document contains detailed implementation plans for features currently on the roadmap but not yet implemented.

---

## Table of Contents

1. [Goal-Based Training](#1-goal-based-training)
2. [Disability & Physical Limitation Profiles](#2-disability--physical-limitation-profiles)
3. [Institutional & Occupational Archetypes](#3-institutional--occupational-archetypes)
4. [3D Anatomical Models](#4-3d-anatomical-models)
5. [Physical Profile Personalization](#5-physical-profile-personalization)

---

## 1. Goal-Based Training

### Overview
Allow users to set specific fitness goals (weight loss, strength milestones, body composition) and receive personalized workout plans that adapt based on progress.

### Database Schema

```sql
-- Goal types enum
CREATE TYPE goal_type AS ENUM (
  'weight_loss',
  'weight_gain',
  'strength',
  'endurance',
  'flexibility',
  'body_composition',
  'custom'
);

-- Goal status enum
CREATE TYPE goal_status AS ENUM (
  'active',
  'paused',
  'completed',
  'abandoned'
);

-- User goals table
CREATE TABLE user_goals (
  id TEXT PRIMARY KEY DEFAULT 'goal_' || replace(uuid_generate_v4()::text, '-', ''),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_type goal_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Target values (flexible based on goal type)
  target_value NUMERIC,           -- e.g., 150 (lbs), 225 (bench press)
  target_unit TEXT,               -- e.g., 'lbs', 'kg', 'minutes', 'reps'
  current_value NUMERIC,          -- Starting point

  -- For strength goals
  exercise_id TEXT REFERENCES exercises(id),

  -- Timeline
  target_date DATE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Status
  status goal_status DEFAULT 'active',
  priority INTEGER DEFAULT 1,     -- 1 = primary, 2 = secondary, etc.

  -- Tracking
  check_in_frequency TEXT DEFAULT 'weekly', -- daily, weekly, monthly
  last_check_in TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_goals_user ON user_goals(user_id);
CREATE INDEX idx_user_goals_active ON user_goals(user_id, status) WHERE status = 'active';

-- Goal progress tracking
CREATE TABLE goal_progress (
  id TEXT PRIMARY KEY DEFAULT 'gp_' || replace(uuid_generate_v4()::text, '-', ''),
  goal_id TEXT NOT NULL REFERENCES user_goals(id) ON DELETE CASCADE,
  recorded_value NUMERIC NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goal_progress_goal ON goal_progress(goal_id, recorded_at DESC);

-- Goal milestones (intermediate targets)
CREATE TABLE goal_milestones (
  id TEXT PRIMARY KEY DEFAULT 'gm_' || replace(uuid_generate_v4()::text, '-', ''),
  goal_id TEXT NOT NULL REFERENCES user_goals(id) ON DELETE CASCADE,
  milestone_value NUMERIC NOT NULL,
  milestone_name TEXT,
  reward_credits INTEGER DEFAULT 0,
  achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goal_milestones_goal ON goal_milestones(goal_id);
```

### API Endpoints

```
POST   /api/goals                    - Create a new goal
GET    /api/goals                    - List user's goals (with filters)
GET    /api/goals/:id                - Get goal details with progress
PUT    /api/goals/:id                - Update goal
DELETE /api/goals/:id                - Delete/abandon goal
POST   /api/goals/:id/check-in       - Record progress check-in
POST   /api/goals/:id/complete       - Mark goal as completed
GET    /api/goals/templates          - Get goal templates (e.g., "Lose 10 lbs")
```

### Mobile App Screens

1. **Goals Tab** - List of active/completed goals with progress rings
2. **New Goal Flow** - Wizard to create goal (type → target → timeline)
3. **Goal Detail** - Progress chart, milestones, check-in button
4. **Check-in Modal** - Quick entry for current weight/measurement

### Integration Points

- **Prescription Engine**: Adjust workout intensity based on goal type
  - Weight loss → higher volume, shorter rest, more cardio
  - Strength → lower reps, heavier weights, longer rest
- **Dashboard Widget**: Show primary goal progress
- **Notifications**: Remind for check-ins, celebrate milestones

### Files to Create/Modify

```
NEW: apps/api/src/db/migrations/023_user_goals.ts
NEW: apps/api/src/http/routes/goals.ts
NEW: apps/api/src/services/goal.service.ts
NEW: apps/mobile/app/(tabs)/goals.tsx
NEW: apps/mobile/src/components/GoalCard.tsx
NEW: apps/mobile/src/components/GoalProgressRing.tsx
NEW: apps/mobile/src/components/NewGoalFlow.tsx
MOD: apps/api/src/http/router.ts (register goals routes)
MOD: packages/client/src/api/index.ts (add goals methods)
```

---

## 2. Disability & Physical Limitation Profiles

### Overview
Track user injuries, chronic conditions, and physical limitations to automatically substitute exercises and adapt workout plans.

### Database Schema

```sql
-- Limitation severity
CREATE TYPE limitation_severity AS ENUM (
  'mild',        -- Can do most exercises with modification
  'moderate',    -- Needs significant substitutions
  'severe',      -- Cannot train affected area
  'permanent'    -- Long-term/permanent condition
);

-- Limitation types
CREATE TYPE limitation_type AS ENUM (
  'injury',           -- Acute injury (temporary)
  'chronic_condition', -- Ongoing condition (arthritis, etc.)
  'disability',       -- Permanent disability
  'post_surgery',     -- Recovery from surgery
  'age_related',      -- Age-related limitation
  'pregnancy',        -- Pregnancy-related
  'other'
);

-- Body regions for limitations
CREATE TABLE body_regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_region TEXT REFERENCES body_regions(id),
  related_muscles TEXT[]  -- Array of muscle IDs affected
);

-- Seed body regions
INSERT INTO body_regions (id, name, parent_region, related_muscles) VALUES
  ('upper_body', 'Upper Body', NULL, NULL),
  ('lower_body', 'Lower Body', NULL, NULL),
  ('core', 'Core/Torso', NULL, NULL),

  ('shoulder_l', 'Left Shoulder', 'upper_body', ARRAY['SH-001', 'SH-002', 'SH-003']),
  ('shoulder_r', 'Right Shoulder', 'upper_body', ARRAY['SH-001', 'SH-002', 'SH-003']),
  ('elbow_l', 'Left Elbow', 'upper_body', ARRAY['AR-001', 'AR-002', 'AR-003']),
  ('elbow_r', 'Right Elbow', 'upper_body', ARRAY['AR-001', 'AR-002', 'AR-003']),
  ('wrist_l', 'Left Wrist', 'upper_body', ARRAY['AR-006', 'AR-007', 'AR-008']),
  ('wrist_r', 'Right Wrist', 'upper_body', ARRAY['AR-006', 'AR-007', 'AR-008']),

  ('lower_back', 'Lower Back', 'core', ARRAY['CP-001', 'CP-002', 'CP-003']),
  ('hip_l', 'Left Hip', 'lower_body', ARRAY['HG-001', 'HG-003', 'HG-005']),
  ('hip_r', 'Right Hip', 'lower_body', ARRAY['HG-002', 'HG-004', 'HG-006']),
  ('knee_l', 'Left Knee', 'lower_body', ARRAY['LA-001', 'LA-003', 'LA-005']),
  ('knee_r', 'Right Knee', 'lower_body', ARRAY['LA-002', 'LA-004', 'LA-006']),
  ('ankle_l', 'Left Ankle', 'lower_body', ARRAY['LP-009', 'LP-011', 'LP-013']),
  ('ankle_r', 'Right Ankle', 'lower_body', ARRAY['LP-010', 'LP-012', 'LP-014']);

-- User limitations table
CREATE TABLE user_limitations (
  id TEXT PRIMARY KEY DEFAULT 'lim_' || replace(uuid_generate_v4()::text, '-', ''),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- What and where
  limitation_type limitation_type NOT NULL,
  body_region_id TEXT NOT NULL REFERENCES body_regions(id),
  severity limitation_severity NOT NULL,

  -- Details
  name TEXT NOT NULL,               -- e.g., "Rotator cuff tear"
  description TEXT,                 -- User's description
  medical_notes TEXT,               -- Optional medical info

  -- Restrictions
  avoid_movements TEXT[],           -- e.g., ['overhead_press', 'lateral_raise']
  max_load_percent INTEGER,         -- Max % of normal load (e.g., 50%)
  avoid_impact BOOLEAN DEFAULT FALSE,
  require_seated BOOLEAN DEFAULT FALSE,

  -- Timeline
  onset_date DATE,
  expected_recovery_date DATE,      -- NULL if permanent

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_limitations_user ON user_limitations(user_id);
CREATE INDEX idx_user_limitations_active ON user_limitations(user_id) WHERE is_active = TRUE;

-- Exercise substitutions
CREATE TABLE exercise_substitutions (
  id SERIAL PRIMARY KEY,
  original_exercise_id TEXT NOT NULL REFERENCES exercises(id),
  substitute_exercise_id TEXT NOT NULL REFERENCES exercises(id),

  -- When to use this substitution
  limitation_type limitation_type,          -- NULL = general substitution
  body_region_id TEXT REFERENCES body_regions(id),
  severity_min limitation_severity,

  -- Effectiveness
  muscle_coverage_percent INTEGER DEFAULT 80, -- How much of original muscles are hit
  difficulty_change INTEGER DEFAULT 0,        -- -1 = easier, 0 = same, 1 = harder

  notes TEXT,

  UNIQUE(original_exercise_id, substitute_exercise_id, limitation_type, body_region_id)
);

CREATE INDEX idx_exercise_substitutions_original ON exercise_substitutions(original_exercise_id);

-- Seed common substitutions
INSERT INTO exercise_substitutions (original_exercise_id, substitute_exercise_id, body_region_id, notes) VALUES
  -- Shoulder injuries
  ('overhead_press', 'landmine_press', 'shoulder_l', 'Reduced shoulder ROM needed'),
  ('overhead_press', 'landmine_press', 'shoulder_r', 'Reduced shoulder ROM needed'),
  ('lateral_raise', 'cable_lateral_raise', 'shoulder_l', 'More controlled movement'),

  -- Knee injuries
  ('barbell_squat', 'leg_press', 'knee_l', 'Less knee stress'),
  ('barbell_squat', 'leg_press', 'knee_r', 'Less knee stress'),
  ('lunges', 'step_ups', 'knee_l', 'More controlled knee flexion'),

  -- Lower back issues
  ('deadlift', 'trap_bar_deadlift', 'lower_back', 'More upright torso'),
  ('deadlift', 'hip_thrust', 'lower_back', 'No spinal loading'),
  ('barbell_row', 'chest_supported_row', 'lower_back', 'No lower back stress'),

  -- Wrist issues
  ('barbell_curl', 'hammer_curl', 'wrist_l', 'Neutral grip'),
  ('push_up', 'push_up_handles', 'wrist_l', 'Neutral wrist position');
```

### API Endpoints

```
POST   /api/limitations               - Add a limitation
GET    /api/limitations               - List user's limitations
PUT    /api/limitations/:id           - Update limitation
DELETE /api/limitations/:id           - Remove/resolve limitation
POST   /api/limitations/:id/resolve   - Mark as resolved

GET    /api/exercises/:id/substitutes - Get substitutes for exercise
GET    /api/body-regions              - List body regions for UI
```

### Mobile App Screens

1. **Limitations Section** (in Profile/Settings) - List active limitations
2. **Add Limitation Flow** - Body part selector → type → severity → details
3. **Exercise Substitution View** - Shows alternatives during workout

### Integration Points

- **Prescription Engine**: Filter out exercises that affect limited areas
- **Workout Logging**: Suggest substitutes when user selects restricted exercise
- **Onboarding**: Optional step to add limitations upfront

### Files to Create/Modify

```
NEW: apps/api/src/db/migrations/024_user_limitations.ts
NEW: apps/api/src/http/routes/limitations.ts
NEW: apps/api/src/services/limitation.service.ts
NEW: apps/api/src/services/substitution.service.ts
NEW: apps/mobile/app/(settings)/limitations.tsx
NEW: apps/mobile/src/components/BodyPartSelector.tsx
NEW: apps/mobile/src/components/LimitationCard.tsx
NEW: apps/mobile/src/components/SubstitutionSuggestion.tsx
MOD: apps/api/src/http/routes/prescription.ts (filter by limitations)
MOD: packages/client/src/api/index.ts (add limitations methods)
```

---

## 3. Institutional & Occupational Archetypes

### Overview
Add specialized training archetypes for first responders, military branches, and occupation-specific fitness requirements including PT test preparation.

### Database Schema

```sql
-- Extend archetypes table with occupation data
ALTER TABLE archetypes ADD COLUMN IF NOT EXISTS archetype_category TEXT
  DEFAULT 'athletic'
  CHECK (archetype_category IN ('athletic', 'first_responder', 'military', 'occupational'));

ALTER TABLE archetypes ADD COLUMN IF NOT EXISTS pt_test_config JSONB;
ALTER TABLE archetypes ADD COLUMN IF NOT EXISTS certification_requirements TEXT[];

-- PT Test definitions
CREATE TABLE pt_tests (
  id TEXT PRIMARY KEY,
  archetype_id TEXT NOT NULL REFERENCES archetypes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Test components as JSONB array
  -- [{event: "pushups", duration_seconds: 120, scoring: "reps"}, ...]
  events JSONB NOT NULL,

  -- Scoring
  passing_score INTEGER,
  max_score INTEGER,
  scoring_tables JSONB,  -- Age/gender-adjusted scoring tables

  -- Frequency
  test_frequency TEXT,   -- "annual", "semi-annual", "quarterly"

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pt_tests_archetype ON pt_tests(archetype_id);

-- User PT test results
CREATE TABLE user_pt_results (
  id TEXT PRIMARY KEY DEFAULT 'ptr_' || replace(uuid_generate_v4()::text, '-', ''),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pt_test_id TEXT NOT NULL REFERENCES pt_tests(id) ON DELETE CASCADE,

  -- Results
  event_results JSONB NOT NULL,  -- [{event: "pushups", value: 65, score: 85}, ...]
  total_score INTEGER,
  passed BOOLEAN,

  test_date DATE NOT NULL,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_pt_results_user ON user_pt_results(user_id);
```

### New Archetypes Data

```typescript
const institutionalArchetypes = [
  // First Responders
  {
    id: 'firefighter',
    name: 'Firefighter',
    category: 'first_responder',
    philosophy: 'Functional strength for rescue operations.',
    description: 'Train for the physical demands of firefighting: carrying equipment, climbing ladders, rescuing victims.',
    focusAreas: ['back', 'legs', 'core', 'grip', 'cardio'],
    ptTestConfig: {
      name: 'CPAT (Candidate Physical Ability Test)',
      events: [
        { name: 'Stair Climb', equipment: '75lb vest + 25lb hose bundle' },
        { name: 'Hose Drag', distance: '75 feet' },
        { name: 'Equipment Carry', weight: '2x 35lb saws' },
        { name: 'Ladder Raise/Extension', type: '24ft ladder' },
        { name: 'Forcible Entry', simulation: 'Keiser sled' },
        { name: 'Search', crawling: 'dark tunnel' },
        { name: 'Rescue Drag', dummy: '165lb' },
        { name: 'Ceiling Breach/Pull', overhead: 'pike pole' }
      ]
    }
  },
  {
    id: 'police',
    name: 'Police Officer',
    category: 'first_responder',
    philosophy: 'Ready for any physical confrontation.',
    description: 'Build strength, speed, and endurance for law enforcement duties.',
    focusAreas: ['full-body', 'cardio', 'core', 'grip'],
    ptTestConfig: {
      name: 'POST Physical Fitness Test',
      events: [
        { name: 'Sit-ups', duration: '1 minute' },
        { name: 'Push-ups', duration: '1 minute' },
        { name: '300m Sprint', type: 'timed' },
        { name: '1.5 Mile Run', type: 'timed' }
      ]
    }
  },
  {
    id: 'emt',
    name: 'EMT/Paramedic',
    category: 'first_responder',
    philosophy: 'Endurance under pressure.',
    description: 'Physical conditioning for patient handling and long shifts.',
    focusAreas: ['back', 'legs', 'core', 'cardio']
  },

  // Military Branches
  {
    id: 'army',
    name: 'US Army',
    category: 'military',
    philosophy: 'Army Strong.',
    description: 'Train for the Army Combat Fitness Test (ACFT).',
    focusAreas: ['full-body', 'power', 'endurance', 'grip'],
    ptTestConfig: {
      name: 'ACFT (Army Combat Fitness Test)',
      events: [
        { name: '3 Rep Max Deadlift', scoring: 'weight' },
        { name: 'Standing Power Throw', equipment: '10lb medicine ball' },
        { name: 'Hand-Release Push-ups', duration: '2 minutes' },
        { name: 'Sprint-Drag-Carry', distance: '5x50m shuttle' },
        { name: 'Leg Tuck or Plank', options: true },
        { name: '2 Mile Run', type: 'timed' }
      ]
    }
  },
  {
    id: 'navy',
    name: 'US Navy',
    category: 'military',
    philosophy: 'Forged by the sea.',
    description: 'Train for the Navy Physical Readiness Test.',
    focusAreas: ['cardio', 'core', 'upper-body', 'swimming'],
    ptTestConfig: {
      name: 'Navy PRT',
      events: [
        { name: 'Plank', duration: 'max hold' },
        { name: 'Push-ups', duration: '2 minutes' },
        { name: '1.5 Mile Run', type: 'timed', alt: '500yd swim' }
      ]
    }
  },
  {
    id: 'marines',
    name: 'US Marines',
    category: 'military',
    philosophy: 'Semper Fidelis.',
    description: 'Train for the Marine Corps Physical Fitness Test and Combat Fitness Test.',
    focusAreas: ['pull-ups', 'core', 'running', 'power'],
    ptTestConfig: {
      name: 'Marine PFT/CFT',
      events: [
        { name: 'Pull-ups', type: 'max reps', alt: 'push-ups' },
        { name: 'Crunches', duration: '2 minutes', alt: 'plank' },
        { name: '3 Mile Run', type: 'timed' }
      ]
    }
  },
  {
    id: 'airforce',
    name: 'US Air Force',
    category: 'military',
    philosophy: 'Aim High.',
    description: 'Train for the Air Force Physical Fitness Assessment.',
    focusAreas: ['cardio', 'core', 'upper-body'],
    ptTestConfig: {
      name: 'Air Force PFA',
      events: [
        { name: 'Push-ups', duration: '1 minute' },
        { name: 'Sit-ups', duration: '1 minute' },
        { name: '1.5 Mile Run', type: 'timed' }
      ]
    }
  },
  {
    id: 'coastguard',
    name: 'US Coast Guard',
    category: 'military',
    philosophy: 'Semper Paratus.',
    description: 'Train for Coast Guard physical requirements.',
    focusAreas: ['swimming', 'cardio', 'full-body']
  },
  {
    id: 'spaceforce',
    name: 'US Space Force',
    category: 'military',
    philosophy: 'Semper Supra.',
    description: 'Train for Space Force physical requirements.',
    focusAreas: ['cardio', 'core', 'upper-body']
  },

  // Occupational
  {
    id: 'construction',
    name: 'Construction Worker',
    category: 'occupational',
    philosophy: 'Built tough.',
    description: 'Strength and endurance for physically demanding labor.',
    focusAreas: ['back', 'legs', 'grip', 'shoulders', 'core']
  },
  {
    id: 'healthcare',
    name: 'Healthcare Worker',
    category: 'occupational',
    philosophy: 'Care for yourself to care for others.',
    description: 'Prevent injury from patient handling and long shifts.',
    focusAreas: ['back', 'core', 'legs', 'cardio']
  },
  {
    id: 'desk_athlete',
    name: 'Desk Athlete',
    category: 'occupational',
    philosophy: 'Counter the chair.',
    description: 'Combat sedentary work with targeted mobility and strength.',
    focusAreas: ['posture', 'hip-flexors', 'core', 'back', 'mobility']
  }
];
```

### API Endpoints

```
GET    /api/archetypes?category=military      - Filter by category
GET    /api/archetypes/:id/pt-test            - Get PT test for archetype
POST   /api/pt-tests/:id/results              - Log PT test result
GET    /api/pt-tests/my-results               - User's PT test history
GET    /api/pt-tests/:id/training-plan        - Get workout plan for PT test
```

### Mobile App Screens

1. **Archetype Selection** - Categorized view (Athletic | First Responder | Military | Occupational)
2. **PT Test Tracker** - Log test results, see progress over time
3. **PT Test Training Mode** - Focused workouts for upcoming test

### Files to Create/Modify

```
NEW: apps/api/src/db/migrations/025_institutional_archetypes.ts
NEW: apps/api/src/db/seed-institutional-archetypes.ts
NEW: apps/api/src/http/routes/pt-tests.ts
NEW: apps/mobile/src/components/ArchetypeCategoryTabs.tsx
NEW: apps/mobile/src/components/PTTestCard.tsx
NEW: apps/mobile/src/components/PTTestLogger.tsx
MOD: apps/api/src/db/seed-archetypes.ts (add new archetypes)
MOD: apps/mobile/app/(onboarding)/archetype.tsx (add categories)
```

---

## 4. 3D Anatomical Models

### Overview
Implement interactive 3D male and female anatomical models with individually rendered muscles for workout visualization and progress tracking.

### Technical Approach

**Option A: React Three Fiber (Recommended)**
- Use `@react-three/fiber` and `@react-three/drei`
- GLTF models for male/female anatomy
- Dynamic muscle coloring based on activation/progress

**Option B: Pre-rendered SVG layers**
- Simpler, faster to implement
- Less interactive but works everywhere
- Good fallback for low-end devices

### 3D Model Requirements

1. **Base Models**
   - Male anatomical model (GLTF/GLB format)
   - Female anatomical model (GLTF/GLB format)
   - Each muscle as a separate mesh for individual highlighting

2. **Muscle Mapping**
   - Map each mesh name to muscle IDs in database
   - Support for 98 muscles from `muscle_bias_weights.json`

3. **Visualization Modes**
   - **Workout Mode**: Highlight muscles being worked (red intensity = activation)
   - **Progress Mode**: Color by weekly volume completion (green gradient)
   - **Recovery Mode**: Color by recovery status (green = ready, red = fatigued)
   - **Educational Mode**: Tap muscle for name and info

### Implementation Structure

```typescript
// apps/mobile/src/components/MuscleModel3D.tsx
import { Canvas } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';

interface MuscleModel3DProps {
  gender: 'male' | 'female';
  mode: 'workout' | 'progress' | 'recovery' | 'educational';
  muscleActivations?: Record<string, number>;  // muscleId -> 0-100
  muscleProgress?: Record<string, number>;     // muscleId -> 0-100
  onMusclePress?: (muscleId: string) => void;
}

export function MuscleModel3D({ gender, mode, muscleActivations, onMusclePress }: MuscleModel3DProps) {
  const modelPath = gender === 'male'
    ? require('../assets/models/male_anatomy.glb')
    : require('../assets/models/female_anatomy.glb');

  const { nodes, materials } = useGLTF(modelPath);

  // Map muscle meshes to activation colors
  const getMuscleColor = (muscleId: string) => {
    const activation = muscleActivations?.[muscleId] || 0;
    // Red intensity based on activation
    return `rgb(${Math.round(activation * 2.55)}, 50, 50)`;
  };

  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} />
      <OrbitControls enablePan={false} />

      {/* Render each muscle mesh */}
      {Object.entries(nodes).map(([name, mesh]) => {
        const muscleId = meshToMuscleId[name];
        if (!muscleId) return null;

        return (
          <mesh
            key={name}
            geometry={mesh.geometry}
            onClick={() => onMusclePress?.(muscleId)}
          >
            <meshStandardMaterial color={getMuscleColor(muscleId)} />
          </mesh>
        );
      })}
    </Canvas>
  );
}
```

### Asset Requirements

```
public/models/
├── male_anatomy.glb          # Male 3D model (1-2MB)
├── female_anatomy.glb        # Female 3D model (1-2MB)
├── muscle_mesh_mapping.json  # Maps mesh names to muscle IDs
└── muscle_positions.json     # 2D screen positions for fallback SVG
```

### Fallback SVG Implementation

For devices that can't handle 3D:

```typescript
// apps/mobile/src/components/MuscleModelSVG.tsx
export function MuscleModelSVG({ gender, muscleActivations }: Props) {
  const SvgComponent = gender === 'male' ? MaleAnatomySvg : FemaleAnatomySvg;

  return (
    <SvgComponent
      muscleColors={Object.fromEntries(
        Object.entries(muscleActivations || {}).map(([id, val]) => [
          id,
          getActivationColor(val)
        ])
      )}
    />
  );
}
```

### Integration Points

- **Workout Screen**: Show 3D model with current exercise's muscle activation
- **Dashboard Widget**: Mini 3D model showing weekly progress
- **Muscles Tab**: Full interactive exploration mode
- **Exercise Detail**: Show which muscles an exercise targets

### Performance Considerations

1. **Lazy Loading**: Only load 3D models when needed
2. **LOD (Level of Detail)**: Lower poly models for list views
3. **Caching**: Cache loaded models in memory
4. **Fallback**: Use SVG on low-memory devices

### Files to Create/Modify

```
NEW: apps/mobile/src/components/MuscleModel3D.tsx
NEW: apps/mobile/src/components/MuscleModelSVG.tsx
NEW: apps/mobile/src/components/MuscleModelContainer.tsx (handles 3D vs SVG)
NEW: apps/mobile/src/hooks/useMuscleModel.ts
NEW: apps/mobile/assets/models/male_anatomy.glb
NEW: apps/mobile/assets/models/female_anatomy.glb
NEW: apps/mobile/assets/models/muscle_mesh_mapping.json
NEW: apps/mobile/src/components/MuscleInfoSheet.tsx (tap muscle for info)
MOD: apps/mobile/app/(tabs)/muscles.tsx (use new 3D model)
MOD: apps/mobile/app/(tabs)/workout.tsx (show model during workout)
MOD: package.json (add @react-three/fiber, @react-three/drei)
```

### Model Sourcing Options

1. **Purchase**: 3D anatomy models from TurboSquid, CGTrader (~$50-200)
2. **Open Source**: Blender HumanBase, MakeHuman exports
3. **Custom**: Commission from 3D artist (~$500-2000)
4. **API**: Use anatomy API like BioDigital (subscription)

---

## 5. Physical Profile Personalization

### Overview
Use the physical profile data already collected (height, weight, age, gender) to personalize workout prescriptions.

### Current State
- Data is collected in `user_profile_extended` table
- Data is NOT used in prescription generation

### Personalization Factors

```typescript
interface PersonalizationFactors {
  // From user_profile_extended
  gender: 'male' | 'female' | 'non_binary';
  age: number;          // Calculated from date_of_birth
  heightCm: number;
  weightKg: number;

  // Derived
  bmi: number;
  bodyType: 'ectomorph' | 'mesomorph' | 'endomorph';  // Estimated
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';  // From TU history

  // From limitations
  limitations: UserLimitation[];

  // From goals
  primaryGoal: UserGoal | null;
}
```

### Prescription Adjustments

```typescript
function adjustPrescription(
  basePrescription: Prescription,
  factors: PersonalizationFactors
): Prescription {
  let adjusted = { ...basePrescription };

  // Age adjustments
  if (factors.age > 50) {
    adjusted.restSeconds *= 1.25;      // More rest
    adjusted.intensityMax = 85;         // Cap intensity
    adjusted.warmupDuration *= 1.5;     // Longer warmup
  }
  if (factors.age > 65) {
    adjusted.restSeconds *= 1.5;
    adjusted.intensityMax = 75;
    adjusted.includeBalanceWork = true;
  }

  // Gender adjustments (if user opts in)
  if (factors.gender === 'female') {
    // Women generally recover faster, can handle more volume
    adjusted.restSeconds *= 0.9;
  }

  // Goal adjustments
  if (factors.primaryGoal?.type === 'weight_loss') {
    adjusted.restSeconds *= 0.8;        // Shorter rest
    adjusted.supersetFrequency = 'high';
    adjusted.cardioMinutes += 10;
  }
  if (factors.primaryGoal?.type === 'strength') {
    adjusted.restSeconds *= 1.5;        // Longer rest
    adjusted.repRangeMax = 6;
    adjusted.intensityMin = 80;
  }

  // Limitation adjustments
  for (const limitation of factors.limitations) {
    adjusted.exercises = adjusted.exercises.map(ex => {
      if (isExerciseAffected(ex, limitation)) {
        return getSubstitute(ex, limitation) || null;
      }
      return ex;
    }).filter(Boolean);
  }

  return adjusted;
}
```

### API Changes

```typescript
// Modify GET /api/prescriptions
interface PrescriptionRequest {
  archetypeId?: string;
  targetMuscles?: string[];
  duration?: number;
  equipment?: string[];

  // NEW: Personalization toggle
  usePersonalization?: boolean;  // Default: true
}

// The prescription engine now:
// 1. Fetches user profile
// 2. Fetches active limitations
// 3. Fetches primary goal
// 4. Generates base prescription
// 5. Applies personalization adjustments
```

### Files to Create/Modify

```
NEW: apps/api/src/services/personalization.service.ts
MOD: apps/api/src/http/routes/prescription.ts (add personalization)
MOD: apps/api/src/services/prescription.service.ts (integrate personalization)
MOD: apps/mobile/app/(settings)/profile.tsx (show personalization toggle)
```

---

## Implementation Priority

### Phase 1: Foundation (Essential)
1. **Physical Profile Personalization** - Uses existing data, high impact
2. **Goal-Based Training** - Core feature for engagement

### Phase 2: Safety & Inclusion
3. **Disability & Physical Limitation Profiles** - Important for user safety

### Phase 3: Market Expansion
4. **Institutional Archetypes** - Opens new market segments

### Phase 4: Visual Experience
5. **3D Anatomical Models** - High development cost, but differentiating

---

## Estimated Effort

| Feature | Backend | Frontend | Data/Assets | Total |
|---------|---------|----------|-------------|-------|
| Goal-Based Training | 2 days | 3 days | - | 5 days |
| Limitations | 2 days | 3 days | - | 5 days |
| Institutional Archetypes | 1 day | 2 days | 2 days | 5 days |
| 3D Models | 1 day | 5 days | 3 days* | 9 days |
| Personalization | 2 days | 1 day | - | 3 days |

*Depends on model sourcing

---

## Next Steps

1. Review and prioritize these plans
2. Create database migrations for chosen features
3. Implement API endpoints
4. Build mobile app screens
5. Test with real users
6. Iterate based on feedback
