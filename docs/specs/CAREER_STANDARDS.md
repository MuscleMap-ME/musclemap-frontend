# Feature: Career Physical Standards & Readiness

*Specification v1.0 - January 8, 2026*

## Overview

**Original concept name:** "Career Readiness"

**User value:** Train toward real job physical requirements with tracked progress and readiness scoring.

**MuscleMap advantage:** No competitor offers career physical standards tracking. This maps directly to our physiology engine, prescription system, and Hangouts architecture.

**Target users:**
- Firefighter candidates preparing for CPAT
- Military members maintaining PFT/ACFT readiness
- Law enforcement officers meeting POST standards
- First responders with annual recertification
- Tactical athletes (SWAT, special operations)
- Blue-collar workers with physical job requirements

---

## Data Model

### career_standards

Master table of physical test standards.

```sql
CREATE TABLE career_standards (
  id TEXT PRIMARY KEY,                   -- Slug: "cpat", "acft", "fbi-pft"
  name TEXT NOT NULL,                    -- "CPAT", "ACFT", "FBI PFT"
  full_name TEXT,                        -- "Candidate Physical Ability Test"
  agency TEXT NOT NULL,                  -- "Generic Fire Department", "US Army"
  category TEXT NOT NULL,                -- "firefighter", "military", "law_enforcement"
  description TEXT,                      -- Long description of the test
  official_url TEXT,                     -- Link to official documentation
  passing_criteria JSONB NOT NULL,       -- See schema below
  scoring_type TEXT NOT NULL,            -- "pass_fail", "points", "time"
  recertification_period_months INTEGER, -- How often recert is required
  icon TEXT,                             -- Icon identifier
  active BOOLEAN DEFAULT true,           -- Is this standard currently used?
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Index for category browsing
CREATE INDEX idx_career_standards_category ON career_standards(category);
```

**passing_criteria schema:**
```json
{
  "type": "timed",
  "time_limit_seconds": 636,
  "must_complete_all_events": true,
  "minimum_events_passed": null,
  "aggregate_score_required": null
}
```

or for points-based:
```json
{
  "type": "points",
  "time_limit_seconds": null,
  "must_complete_all_events": true,
  "minimum_events_passed": 6,
  "aggregate_score_required": 360
}
```

---

### career_standard_events

Individual events within a standard.

```sql
CREATE TABLE career_standard_events (
  id TEXT PRIMARY KEY,                   -- Slug: "cpat-stair-climb"
  standard_id TEXT NOT NULL REFERENCES career_standards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- "Stair Climb"
  description TEXT,                      -- How the event is performed
  metric_type TEXT NOT NULL,             -- "time", "reps", "weight", "distance", "pass_fail"
  metric_unit TEXT,                      -- "seconds", "reps", "lbs", "meters"
  direction TEXT NOT NULL,               -- "lower_is_better", "higher_is_better", "pass_fail"
  passing_threshold REAL,                -- e.g., 180 (seconds), 140 (lbs)
  maximum_threshold REAL,                -- Max score threshold (for points)
  scoring_table JSONB,                   -- Age/gender scoring tables
  equipment_required TEXT[],             -- Equipment needed for event
  exercise_mappings TEXT[],              -- MuscleMap exercise IDs for training
  tips TEXT[],                           -- Training tips for this event
  video_url TEXT,                        -- Demonstration video
  order_index INTEGER NOT NULL,          -- Event order in test
  created_at TEXT DEFAULT (datetime('now'))
);

-- Index for standard lookup
CREATE INDEX idx_events_standard ON career_standard_events(standard_id);
```

**scoring_table schema (ACFT example):**
```json
{
  "type": "age_gender",
  "tables": {
    "male": {
      "17-21": { "min": 140, "max": 340, "points_per_unit": 0.5 },
      "22-26": { "min": 140, "max": 340, "points_per_unit": 0.5 },
      "27-31": { "min": 130, "max": 330, "points_per_unit": 0.5 }
    },
    "female": {
      "17-21": { "min": 120, "max": 210, "points_per_unit": 0.5 }
    }
  }
}
```

---

### user_career_goals

User's selected career standards to train toward.

```sql
CREATE TABLE user_career_goals (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  standard_id TEXT NOT NULL REFERENCES career_standards(id),
  target_date DATE,                      -- When user wants to be ready
  priority TEXT DEFAULT 'primary',       -- "primary", "secondary"
  status TEXT DEFAULT 'active',          -- "active", "achieved", "abandoned"
  agency_name TEXT,                      -- User's specific agency
  notes TEXT,                            -- Personal notes
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  achieved_at TEXT,                      -- When goal was achieved

  UNIQUE(user_id, standard_id)
);

-- Index for user's goals
CREATE INDEX idx_career_goals_user ON user_career_goals(user_id);
CREATE INDEX idx_career_goals_status ON user_career_goals(status);
```

---

### user_standard_assessments

Logged practice tests and official assessments.

```sql
CREATE TABLE user_standard_assessments (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  standard_id TEXT NOT NULL REFERENCES career_standards(id),
  assessed_at TEXT NOT NULL,             -- When assessment was taken
  assessment_type TEXT DEFAULT 'practice', -- "practice", "official", "simulated"
  location TEXT,                         -- Where assessment was taken
  results JSONB NOT NULL,                -- Per-event results (see schema)
  overall_passed BOOLEAN,                -- Did user pass overall?
  total_score REAL,                      -- For points-based standards
  readiness_score REAL,                  -- Calculated 0-100% readiness
  notes TEXT,                            -- User notes
  verified BOOLEAN DEFAULT false,        -- Verified by supervisor/proctor
  verified_by TEXT,                      -- Who verified
  created_at TEXT DEFAULT (datetime('now'))
);

-- Index for user assessments
CREATE INDEX idx_assessments_user ON user_standard_assessments(user_id);
CREATE INDEX idx_assessments_standard ON user_standard_assessments(standard_id);
CREATE INDEX idx_assessments_date ON user_standard_assessments(assessed_at);
```

**results schema:**
```json
{
  "events": {
    "cpat-stair-climb": {
      "value": 175,
      "passed": true,
      "score": null,
      "notes": "Felt strong"
    },
    "cpat-hose-drag": {
      "value": null,
      "passed": true,
      "score": null,
      "notes": null
    }
  },
  "total_time_seconds": 598,
  "conditions": {
    "temperature_f": 72,
    "humidity_pct": 45,
    "altitude_ft": 500
  }
}
```

---

### team_readiness_permissions

Controls who can see team readiness data.

```sql
CREATE TABLE team_readiness_permissions (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  hangout_id TEXT NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL,         -- "viewer", "member"
  standard_id TEXT REFERENCES career_standards(id), -- Specific standard or all
  granted_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),

  UNIQUE(hangout_id, user_id, permission_type)
);

-- viewer: Can see team readiness dashboard
-- member: Shares their readiness data with the team

CREATE INDEX idx_team_readiness_hangout ON team_readiness_permissions(hangout_id);
CREATE INDEX idx_team_readiness_user ON team_readiness_permissions(user_id);
```

---

### recertification_schedules

User's recertification reminders.

```sql
CREATE TABLE recertification_schedules (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id TEXT NOT NULL REFERENCES user_career_goals(id) ON DELETE CASCADE,
  last_certified_at TEXT,                -- Last official pass date
  next_due_at TEXT NOT NULL,             -- When recertification is due
  reminder_days INTEGER[] DEFAULT '{30, 14, 7}', -- Days before to remind
  last_reminded_at TEXT,                 -- Prevent duplicate reminders
  status TEXT DEFAULT 'active',          -- "active", "completed", "overdue"
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_recert_user ON recertification_schedules(user_id);
CREATE INDEX idx_recert_due ON recertification_schedules(next_due_at);
```

---

## Seed Data: Initial Standards

### CPAT (Candidate Physical Ability Test)

```json
{
  "id": "cpat",
  "name": "CPAT",
  "full_name": "Candidate Physical Ability Test",
  "agency": "Generic Fire Department",
  "category": "firefighter",
  "description": "Standardized physical ability test for firefighter candidates. Simulates critical firefighting tasks while wearing a 50-lb vest (25-lb if female) to simulate SCBAs and bunker gear. All 8 events must be completed in sequence within 10:20 (636 seconds).",
  "official_url": "https://www.iaff.org/cpat/",
  "scoring_type": "pass_fail",
  "passing_criteria": {
    "type": "timed",
    "time_limit_seconds": 636,
    "must_complete_all_events": true
  },
  "recertification_period_months": null,
  "events": [
    {
      "id": "cpat-stair-climb",
      "name": "Stair Climb",
      "order_index": 1,
      "description": "Climb a StepMill at 60 steps per minute for 3 minutes while wearing 75-lb total weight (50-lb vest + 25-lb shoulder weights).",
      "metric_type": "pass_fail",
      "direction": "pass_fail",
      "equipment_required": ["stepmill", "weighted_vest"],
      "exercise_mappings": ["stair_climber", "lunges", "step_ups", "box_jumps"],
      "tips": [
        "Build aerobic base with 20+ minutes of stairs at moderate pace",
        "Practice with weighted vest, gradually increasing weight",
        "Focus on steady pace - don't start too fast"
      ]
    },
    {
      "id": "cpat-hose-drag",
      "name": "Hose Drag",
      "order_index": 2,
      "description": "Drag a charged hoseline 75 feet, make a 90-degree turn, drag 25 more feet, drop to knee and pull 50 feet of hose.",
      "metric_type": "pass_fail",
      "direction": "pass_fail",
      "equipment_required": ["fire_hose"],
      "exercise_mappings": ["sled_drag", "cable_rows", "deadlifts", "farmers_carry"],
      "tips": [
        "Train grip endurance with heavy farmers carries",
        "Practice pulling from kneeling position",
        "Build posterior chain with deadlifts and rows"
      ]
    },
    {
      "id": "cpat-equipment-carry",
      "name": "Equipment Carry",
      "order_index": 3,
      "description": "Carry two saws (total 50-65 lbs) around an 80-foot course.",
      "metric_type": "pass_fail",
      "direction": "pass_fail",
      "exercise_mappings": ["farmers_carry", "kettlebell_carry", "trap_bar_deadlift"],
      "tips": [
        "Grip strength is key - train with thick grip implements",
        "Practice walking with heavy implements"
      ]
    },
    {
      "id": "cpat-ladder-raise",
      "name": "Ladder Raise & Extension",
      "order_index": 4,
      "description": "Raise a 24-foot extension ladder from ground to wall, then extend a pre-positioned fly section using a halyard rope.",
      "metric_type": "pass_fail",
      "direction": "pass_fail",
      "exercise_mappings": ["lat_pulldown", "pull_ups", "overhead_press", "cable_rows"],
      "tips": [
        "Build pulling strength with rows and pulldowns",
        "Practice hand-over-hand rope pulling"
      ]
    },
    {
      "id": "cpat-forcible-entry",
      "name": "Forcible Entry",
      "order_index": 5,
      "description": "Strike a mechanized forcible entry device with a 10-lb sledgehammer until the buzzer sounds.",
      "metric_type": "pass_fail",
      "direction": "pass_fail",
      "equipment_required": ["sledgehammer"],
      "exercise_mappings": ["sledgehammer_swings", "medicine_ball_slams", "woodchoppers"],
      "tips": [
        "Train explosive hip rotation",
        "Build core anti-rotation strength",
        "Practice tire hits with sledgehammer"
      ]
    },
    {
      "id": "cpat-search",
      "name": "Search",
      "order_index": 6,
      "description": "Crawl through a dark, confined 64-foot maze on hands and knees.",
      "metric_type": "pass_fail",
      "direction": "pass_fail",
      "exercise_mappings": ["bear_crawl", "plank", "mountain_climbers"],
      "tips": [
        "Build crawling endurance",
        "Practice in dark, confined spaces if possible",
        "Maintain calm breathing"
      ]
    },
    {
      "id": "cpat-rescue-drag",
      "name": "Rescue Drag",
      "order_index": 7,
      "description": "Drag a 165-lb mannequin 35 feet around a drum, then 35 feet back.",
      "metric_type": "pass_fail",
      "direction": "pass_fail",
      "exercise_mappings": ["sled_drag", "goblet_squats", "lunges", "hip_thrusts"],
      "tips": [
        "Build hip and glute strength",
        "Practice dragging technique - stay low",
        "Train grip endurance"
      ]
    },
    {
      "id": "cpat-ceiling-breach",
      "name": "Ceiling Breach & Pull",
      "order_index": 8,
      "description": "Use a pike pole (6-8 lbs) to push up a hinged door 3 times, then pull down a hinged door 5 times. Repeat 4 times.",
      "metric_type": "pass_fail",
      "direction": "pass_fail",
      "exercise_mappings": ["overhead_press", "lat_pulldown", "push_ups", "pull_ups"],
      "tips": [
        "Build shoulder endurance",
        "Practice overhead pressing and pulling movements",
        "Core stability is essential"
      ]
    }
  ]
}
```

---

### ACFT (Army Combat Fitness Test)

```json
{
  "id": "acft",
  "name": "ACFT",
  "full_name": "Army Combat Fitness Test",
  "agency": "United States Army",
  "category": "military",
  "description": "The Army Combat Fitness Test replaced the APFT in 2020. It consists of 6 events designed to assess muscular strength, muscular endurance, aerobic endurance, anaerobic endurance, and explosive power. Minimum passing score is 60 points per event (360 total).",
  "official_url": "https://www.army.mil/acft/",
  "scoring_type": "points",
  "passing_criteria": {
    "type": "points",
    "must_complete_all_events": true,
    "minimum_points_per_event": 60,
    "aggregate_score_required": 360
  },
  "recertification_period_months": 12,
  "events": [
    {
      "id": "acft-mdl",
      "name": "3 Repetition Maximum Deadlift",
      "order_index": 1,
      "description": "Execute three deadlifts with the maximum weight you can lift. Weight range: 140-340 lbs.",
      "metric_type": "weight",
      "metric_unit": "lbs",
      "direction": "higher_is_better",
      "passing_threshold": 140,
      "maximum_threshold": 340,
      "scoring_table": {
        "type": "linear",
        "min_value": 140,
        "min_points": 60,
        "max_value": 340,
        "max_points": 100
      },
      "exercise_mappings": ["deadlift", "romanian_deadlift", "trap_bar_deadlift", "hip_thrusts"],
      "tips": [
        "Focus on hip hinge mechanics",
        "Build grip strength",
        "Progressive overload is key"
      ]
    },
    {
      "id": "acft-spt",
      "name": "Standing Power Throw",
      "order_index": 2,
      "description": "Throw a 10-lb medicine ball backward over your head for maximum distance.",
      "metric_type": "distance",
      "metric_unit": "meters",
      "direction": "higher_is_better",
      "passing_threshold": 4.5,
      "maximum_threshold": 12.5,
      "exercise_mappings": ["medicine_ball_slams", "wall_balls", "back_extensions", "box_jumps"],
      "tips": [
        "Focus on explosive hip extension",
        "Practice release timing",
        "Build posterior chain power"
      ]
    },
    {
      "id": "acft-hrp",
      "name": "Hand-Release Push-Ups",
      "order_index": 3,
      "description": "Execute maximum hand-release push-ups in 2 minutes. At bottom, lift hands off ground momentarily.",
      "metric_type": "reps",
      "direction": "higher_is_better",
      "passing_threshold": 10,
      "maximum_threshold": 60,
      "exercise_mappings": ["push_ups", "bench_press", "dips", "incline_push_ups"],
      "tips": [
        "Build pushing endurance",
        "Practice the specific hand-release movement",
        "Pace yourself - don't burn out early"
      ]
    },
    {
      "id": "acft-sdc",
      "name": "Sprint-Drag-Carry",
      "order_index": 4,
      "description": "Complete 5 x 50-meter shuttles: sprint, drag (90-lb sled), lateral shuffle, carry (2x40-lb kettlebells), sprint.",
      "metric_type": "time",
      "metric_unit": "seconds",
      "direction": "lower_is_better",
      "passing_threshold": 180,
      "maximum_threshold": 93,
      "exercise_mappings": ["sled_drag", "kettlebell_carry", "lateral_shuffles", "sprints"],
      "tips": [
        "Practice transitions between movements",
        "Build anaerobic capacity",
        "Grip endurance is critical"
      ]
    },
    {
      "id": "acft-plank",
      "name": "Plank",
      "order_index": 5,
      "description": "Hold a proper plank position for maximum time. Minimum 2:00, maximum 4:20 for scoring.",
      "metric_type": "time",
      "metric_unit": "seconds",
      "direction": "higher_is_better",
      "passing_threshold": 120,
      "maximum_threshold": 260,
      "exercise_mappings": ["plank", "dead_bug", "bird_dog", "hollow_body_hold"],
      "tips": [
        "Build core endurance progressively",
        "Practice proper form - flat back, engaged glutes",
        "Mental toughness matters"
      ]
    },
    {
      "id": "acft-2mr",
      "name": "2-Mile Run",
      "order_index": 6,
      "description": "Run 2 miles for time on a measured, level course.",
      "metric_type": "time",
      "metric_unit": "seconds",
      "direction": "lower_is_better",
      "passing_threshold": 1260,
      "maximum_threshold": 780,
      "exercise_mappings": ["running", "tempo_runs", "interval_training"],
      "tips": [
        "Build aerobic base with easy runs",
        "Include interval training",
        "Practice race pace"
      ]
    }
  ]
}
```

---

### Marine Corps PFT

```json
{
  "id": "usmc-pft",
  "name": "Marine Corps PFT",
  "full_name": "Marine Corps Physical Fitness Test",
  "agency": "United States Marine Corps",
  "category": "military",
  "description": "The PFT measures a Marine's overall physical conditioning. Scored on a 300-point scale. Minimum class-specific scores required.",
  "official_url": "https://www.fitness.marines.mil/",
  "scoring_type": "points",
  "passing_criteria": {
    "type": "points",
    "must_complete_all_events": true,
    "aggregate_score_required": 150
  },
  "recertification_period_months": 12,
  "events": [
    {
      "id": "usmc-pullups",
      "name": "Pull-Ups (or Push-Ups)",
      "order_index": 1,
      "metric_type": "reps",
      "direction": "higher_is_better",
      "passing_threshold": 3,
      "maximum_threshold": 23,
      "exercise_mappings": ["pull_ups", "lat_pulldown", "assisted_pull_ups", "negative_pull_ups"]
    },
    {
      "id": "usmc-crunches",
      "name": "Crunches (or Plank)",
      "order_index": 2,
      "metric_type": "reps",
      "direction": "higher_is_better",
      "passing_threshold": 50,
      "maximum_threshold": 115,
      "exercise_mappings": ["crunches", "plank", "dead_bug", "hanging_leg_raises"]
    },
    {
      "id": "usmc-3mile",
      "name": "3-Mile Run",
      "order_index": 3,
      "metric_type": "time",
      "metric_unit": "seconds",
      "direction": "lower_is_better",
      "passing_threshold": 1680,
      "maximum_threshold": 1080,
      "exercise_mappings": ["running", "tempo_runs", "long_runs"]
    }
  ]
}
```

---

### Navy PRT

```json
{
  "id": "navy-prt",
  "name": "Navy PRT",
  "full_name": "Navy Physical Readiness Test",
  "agency": "United States Navy",
  "category": "military",
  "scoring_type": "points",
  "recertification_period_months": 6,
  "events": [
    {
      "id": "navy-pushups",
      "name": "Push-Ups",
      "order_index": 1,
      "metric_type": "reps",
      "direction": "higher_is_better",
      "exercise_mappings": ["push_ups", "bench_press", "dips"]
    },
    {
      "id": "navy-plank",
      "name": "Forearm Plank",
      "order_index": 2,
      "metric_type": "time",
      "metric_unit": "seconds",
      "direction": "higher_is_better",
      "exercise_mappings": ["plank", "dead_bug", "hollow_body_hold"]
    },
    {
      "id": "navy-cardio",
      "name": "1.5-Mile Run (or Swim/Bike)",
      "order_index": 3,
      "metric_type": "time",
      "metric_unit": "seconds",
      "direction": "lower_is_better",
      "exercise_mappings": ["running", "swimming", "cycling"]
    }
  ]
}
```

---

### Air Force PT Test

```json
{
  "id": "usaf-pt",
  "name": "Air Force PT Test",
  "full_name": "Air Force Physical Fitness Assessment",
  "agency": "United States Air Force",
  "category": "military",
  "scoring_type": "points",
  "recertification_period_months": 12,
  "events": [
    {
      "id": "usaf-pushups",
      "name": "Push-Ups",
      "order_index": 1,
      "metric_type": "reps"
    },
    {
      "id": "usaf-situps",
      "name": "Sit-Ups",
      "order_index": 2,
      "metric_type": "reps"
    },
    {
      "id": "usaf-run",
      "name": "1.5-Mile Run",
      "order_index": 3,
      "metric_type": "time",
      "metric_unit": "seconds"
    }
  ]
}
```

---

### FBI PFT

```json
{
  "id": "fbi-pft",
  "name": "FBI PFT",
  "full_name": "FBI Physical Fitness Test",
  "agency": "Federal Bureau of Investigation",
  "category": "law_enforcement",
  "description": "The FBI PFT is a pass/fail test required for Special Agent candidates. All 5 events must be passed.",
  "scoring_type": "pass_fail",
  "events": [
    {
      "id": "fbi-situps",
      "name": "Sit-Ups (1 minute)",
      "order_index": 1,
      "metric_type": "reps",
      "passing_threshold": 38
    },
    {
      "id": "fbi-sprint",
      "name": "300-Meter Sprint",
      "order_index": 2,
      "metric_type": "time",
      "metric_unit": "seconds",
      "passing_threshold": 52.4
    },
    {
      "id": "fbi-pushups",
      "name": "Push-Ups (untimed)",
      "order_index": 3,
      "metric_type": "reps",
      "passing_threshold": 30
    },
    {
      "id": "fbi-run",
      "name": "1.5-Mile Run",
      "order_index": 4,
      "metric_type": "time",
      "metric_unit": "seconds",
      "passing_threshold": 720
    }
  ]
}
```

---

### DEA PFT

```json
{
  "id": "dea-pft",
  "name": "DEA PFT",
  "full_name": "DEA Physical Task Test",
  "agency": "Drug Enforcement Administration",
  "category": "law_enforcement",
  "scoring_type": "pass_fail",
  "events": [
    {
      "id": "dea-situps",
      "name": "Sit-Ups (1 minute)",
      "metric_type": "reps",
      "passing_threshold": 35
    },
    {
      "id": "dea-pushups",
      "name": "Push-Ups (1 minute)",
      "metric_type": "reps",
      "passing_threshold": 25
    },
    {
      "id": "dea-pullups",
      "name": "Pull-Ups",
      "metric_type": "reps",
      "passing_threshold": 1
    },
    {
      "id": "dea-run",
      "name": "1.5-Mile Run",
      "metric_type": "time",
      "metric_unit": "seconds",
      "passing_threshold": 810
    }
  ]
}
```

---

### California POST (Peace Officer Standards)

```json
{
  "id": "ca-post",
  "name": "California POST",
  "full_name": "California Peace Officer Physical Ability Test",
  "agency": "California POST",
  "category": "law_enforcement",
  "description": "California's standardized physical ability test for peace officer candidates. Varies by department.",
  "scoring_type": "pass_fail",
  "events": [
    {
      "id": "ca-post-run",
      "name": "1.5-Mile Run",
      "metric_type": "time",
      "metric_unit": "seconds",
      "passing_threshold": 840
    },
    {
      "id": "ca-post-pushups",
      "name": "Push-Ups",
      "metric_type": "reps",
      "passing_threshold": 25
    },
    {
      "id": "ca-post-situps",
      "name": "Sit-Ups (1 minute)",
      "metric_type": "reps",
      "passing_threshold": 25
    }
  ]
}
```

---

### BUD/S PST (SEAL Candidate Screening)

```json
{
  "id": "buds-pst",
  "name": "BUD/S PST",
  "full_name": "Basic Underwater Demolition/SEAL Physical Screening Test",
  "agency": "United States Navy",
  "category": "special_operations",
  "description": "Minimum standards for SEAL candidates. Competitive scores are much higher.",
  "scoring_type": "pass_fail",
  "events": [
    {
      "id": "buds-swim",
      "name": "500-Yard Swim",
      "order_index": 1,
      "metric_type": "time",
      "metric_unit": "seconds",
      "passing_threshold": 750,
      "tips": ["Competitive: under 480 seconds"]
    },
    {
      "id": "buds-pushups",
      "name": "Push-Ups (2 minutes)",
      "order_index": 2,
      "metric_type": "reps",
      "passing_threshold": 42,
      "tips": ["Competitive: 100+"]
    },
    {
      "id": "buds-situps",
      "name": "Sit-Ups (2 minutes)",
      "order_index": 3,
      "metric_type": "reps",
      "passing_threshold": 50,
      "tips": ["Competitive: 100+"]
    },
    {
      "id": "buds-pullups",
      "name": "Pull-Ups",
      "order_index": 4,
      "metric_type": "reps",
      "passing_threshold": 6,
      "tips": ["Competitive: 20+"]
    },
    {
      "id": "buds-run",
      "name": "1.5-Mile Run",
      "order_index": 5,
      "metric_type": "time",
      "metric_unit": "seconds",
      "passing_threshold": 660,
      "tips": ["Competitive: under 540 seconds"]
    }
  ]
}
```

---

### Additional Standards to Include

| ID | Name | Category | Notes |
|----|------|----------|-------|
| `ranger-rpat` | Ranger Physical Assessment | special_operations | RPAT for 75th Ranger |
| `sf-sfas` | SF Assessment Prep | special_operations | Special Forces prep |
| `marsoc-asvab` | MARSOC Assessment | special_operations | Marine Raiders |
| `secret-service-pft` | Secret Service PFT | law_enforcement | USSS candidates |
| `border-patrol-pft` | Border Patrol PFT | law_enforcement | CBP officers |
| `corrections-pft` | Corrections Officer | law_enforcement | State varies |
| `fdny-fss` | FDNY FSS | firefighter | NYC specific |
| `lafd-pat` | LAFD PAT | firefighter | Los Angeles specific |
| `chicago-cpat` | Chicago CPAT | firefighter | Chicago Fire |

---

## API Endpoints

### Standards Endpoints

```typescript
// GET /api/v1/career-standards
// List all standards, filterable by category
{
  "standards": [
    {
      "id": "cpat",
      "name": "CPAT",
      "category": "firefighter",
      "agency": "Generic Fire Department",
      "event_count": 8,
      "scoring_type": "pass_fail"
    }
  ],
  "categories": ["firefighter", "military", "law_enforcement", "special_operations"]
}

// GET /api/v1/career-standards/:id
// Get standard details with all events
{
  "id": "cpat",
  "name": "CPAT",
  "full_name": "Candidate Physical Ability Test",
  "description": "...",
  "passing_criteria": {...},
  "events": [
    {
      "id": "cpat-stair-climb",
      "name": "Stair Climb",
      "description": "...",
      "metric_type": "pass_fail",
      "exercise_mappings": ["stair_climber", "lunges"],
      "tips": ["..."]
    }
  ]
}

// GET /api/v1/career-standards/:id/exercises
// Get exercises that train for this standard
{
  "exercises": [
    {
      "id": "stair_climber",
      "name": "Stair Climber",
      "events_trained": ["cpat-stair-climb"],
      "relevance_score": 0.95
    }
  ]
}
```

### User Goals Endpoints

```typescript
// POST /api/v1/users/me/career-goals
// Set a career goal
Request: {
  "standard_id": "cpat",
  "target_date": "2026-06-01",
  "priority": "primary",
  "agency_name": "Chicago Fire Department"
}

Response: {
  "id": "goal_123",
  "standard": {...},
  "target_date": "2026-06-01",
  "days_remaining": 144,
  "current_readiness": null
}

// GET /api/v1/users/me/career-goals
// List user's career goals
{
  "goals": [
    {
      "id": "goal_123",
      "standard": {...},
      "target_date": "2026-06-01",
      "priority": "primary",
      "current_readiness": 72.5,
      "status": "active"
    }
  ]
}

// PUT /api/v1/users/me/career-goals/:id
// Update goal

// DELETE /api/v1/users/me/career-goals/:id
// Remove goal
```

### Assessment Endpoints

```typescript
// POST /api/v1/users/me/assessments
// Log an assessment
Request: {
  "standard_id": "cpat",
  "assessed_at": "2026-01-08T14:30:00Z",
  "assessment_type": "practice",
  "location": "Station 5 Training Grounds",
  "results": {
    "events": {
      "cpat-stair-climb": { "passed": true, "notes": "Felt strong" },
      "cpat-hose-drag": { "passed": true },
      "cpat-equipment-carry": { "passed": true },
      "cpat-ladder-raise": { "passed": false, "notes": "Struggled with extension" },
      "cpat-forcible-entry": { "passed": true },
      "cpat-search": { "passed": true },
      "cpat-rescue-drag": { "passed": true },
      "cpat-ceiling-breach": { "passed": true }
    },
    "total_time_seconds": 642
  },
  "notes": "Need to work on ladder extension"
}

Response: {
  "id": "assessment_456",
  "overall_passed": false,
  "readiness_score": 87.5,
  "events_passed": 7,
  "events_failed": 1,
  "improvement": {
    "readiness_change": +12.5,
    "events_improved": ["cpat-hose-drag"]
  }
}

// GET /api/v1/users/me/assessments
// List assessments with filters
Query: ?standard_id=cpat&limit=10

// GET /api/v1/users/me/assessments/:id
// Get specific assessment
```

### Readiness Endpoints

```typescript
// GET /api/v1/users/me/career-readiness
// Get current readiness for all goals
{
  "goals": [
    {
      "goal_id": "goal_123",
      "standard": {...},
      "readiness_score": 87.5,
      "trend": "improving",
      "events": [
        { "event_id": "cpat-stair-climb", "status": "passed", "last_result": true },
        { "event_id": "cpat-ladder-raise", "status": "needs_work", "last_result": false }
      ],
      "target_date": "2026-06-01",
      "days_remaining": 144,
      "recommended_focus": ["cpat-ladder-raise"]
    }
  ]
}

// GET /api/v1/users/me/career-readiness/:goalId/history
// Get readiness history over time
{
  "history": [
    { "date": "2025-12-01", "readiness": 65.0 },
    { "date": "2025-12-15", "readiness": 72.0 },
    { "date": "2026-01-08", "readiness": 87.5 }
  ]
}
```

### Team Readiness Endpoints

```typescript
// GET /api/v1/hangouts/:hangoutId/team-readiness
// (Supervisor only) Get team readiness overview
{
  "hangout": {...},
  "standard": {...},
  "aggregate": {
    "members_total": 8,
    "members_ready": 5,
    "members_at_risk": 2,
    "members_not_ready": 1,
    "average_readiness": 78.2
  },
  "members": [
    {
      "user_id": "user_123",
      "display_name": "J. Smith",
      "readiness_score": 92.0,
      "last_assessment": "2026-01-05",
      "status": "ready"
    }
  ],
  "weak_areas": [
    { "event_id": "cpat-ladder-raise", "members_failing": 3 }
  ]
}

// POST /api/v1/hangouts/:hangoutId/team-readiness/opt-in
// Member opts in to share readiness
Request: {
  "standard_id": "cpat"
}

// DELETE /api/v1/hangouts/:hangoutId/team-readiness/opt-in
// Member opts out
```

### Recertification Endpoints

```typescript
// GET /api/v1/users/me/recertifications
// List recertification schedules
{
  "schedules": [
    {
      "id": "recert_789",
      "goal": {...},
      "last_certified_at": "2025-06-15",
      "next_due_at": "2026-06-15",
      "days_until_due": 158,
      "status": "active"
    }
  ]
}

// POST /api/v1/users/me/recertifications
// Set recertification schedule
Request: {
  "goal_id": "goal_123",
  "last_certified_at": "2025-06-15",
  "reminder_days": [30, 14, 7]
}
```

---

## Prescription Integration

### Enhanced Prescription Request

```typescript
// POST /api/v1/prescription/generate
Request: {
  // Existing parameters
  "duration_minutes": 45,
  "location": "gym",
  "equipment": ["barbell", "dumbbells", "pull_up_bar"],

  // NEW: Career goal parameters
  "career_goal_id": "goal_123",
  "focus_weak_events": true,
  "target_date_aware": true
}
```

### Prescription Engine Modifications

1. **Identify weak events** from most recent assessment
2. **Map events to exercises** using `exercise_mappings`
3. **Prioritize weakness-targeting exercises** in generation
4. **Adjust intensity** based on target date:
   - Far from target: Focus on building base
   - Close to target: Event-specific drills, peaking
5. **Include event simulations** when possible:
   - Stair climber sessions for CPAT stair climb
   - Timed push-up sets for PFT
   - Sled work for rescue drag

### Example Prescription Output

```json
{
  "workout": {
    "name": "CPAT Prep - Ladder Focus",
    "career_goal": "cpat",
    "focus_events": ["cpat-ladder-raise", "cpat-ceiling-breach"],
    "exercises": [
      {
        "id": "lat_pulldown",
        "sets": 4,
        "reps": 12,
        "note": "Targets ladder extension strength"
      },
      {
        "id": "overhead_press",
        "sets": 3,
        "reps": 10,
        "note": "Targets ceiling breach"
      },
      {
        "id": "pull_ups",
        "sets": 3,
        "reps": "max",
        "note": "Build pulling endurance"
      }
    ],
    "event_simulation": {
      "event": "cpat-ceiling-breach",
      "instructions": "Perform push-pull circuit: 3 overhead presses, 5 lat pulldowns. Repeat 4 times."
    }
  }
}
```

---

## UI Screens

### Screen 1: Career Goal Selection

**Path:** `/career-readiness` or tab in mobile app

**Layout:**
```
┌────────────────────────────────────────┐
│ Career Readiness                    ⚙️ │
├────────────────────────────────────────┤
│                                        │
│ Choose Your Standard                   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ 🔥 Firefighter                   │   │
│ │    CPAT, FDNY FSS, LAFD PAT     │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ 🎖️ Military                      │   │
│ │    ACFT, PFT, Navy PRT          │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ 🚔 Law Enforcement               │   │
│ │    FBI PFT, POST, DEA           │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ ⚔️ Special Operations            │   │
│ │    BUD/S PST, Ranger RPAT       │   │
│ └──────────────────────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

### Screen 2: Standard Detail

**Layout:**
```
┌────────────────────────────────────────┐
│ ← CPAT                              ℹ️ │
├────────────────────────────────────────┤
│                                        │
│ Candidate Physical Ability Test        │
│ Fire Department Standard               │
│                                        │
│ ⏱️ Complete all 8 events in 10:20     │
│                                        │
│ Events                                 │
│ ┌──────────────────────────────────┐   │
│ │ 1. Stair Climb         Pass/Fail │   │
│ │    3 min @ 60 steps/min         │   │
│ └──────────────────────────────────┘   │
│ ┌──────────────────────────────────┐   │
│ │ 2. Hose Drag           Pass/Fail │   │
│ │    75ft + 90° turn + 25ft       │   │
│ └──────────────────────────────────┘   │
│ ... (more events)                      │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │       Set as My Goal             │   │
│ └──────────────────────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

### Screen 3: Readiness Dashboard

**Layout:**
```
┌────────────────────────────────────────┐
│ My CPAT Readiness                   ⚙️ │
├────────────────────────────────────────┤
│                                        │
│         ┌─────────────┐                │
│         │    87%      │                │
│         │   Ready     │                │
│         └─────────────┘                │
│         Target: Jun 1, 2026            │
│         144 days remaining             │
│                                        │
│ ────────────────────────────────────── │
│                                        │
│ Event Breakdown                        │
│                                        │
│ ✅ Stair Climb       ████████████ Pass │
│ ✅ Hose Drag         ████████████ Pass │
│ ✅ Equipment Carry   ████████████ Pass │
│ ❌ Ladder Raise      ████░░░░░░░ FAIL │
│ ✅ Forcible Entry    ████████████ Pass │
│ ✅ Search            ████████████ Pass │
│ ✅ Rescue Drag       ████████████ Pass │
│ ✅ Ceiling Breach    ████████████ Pass │
│                                        │
│ ────────────────────────────────────── │
│                                        │
│ 📈 Trend: Improving (+12% this month) │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │      Log New Assessment          │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │    Get Workout for Weak Events   │   │
│ └──────────────────────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

### Screen 4: Assessment Logger

**Layout:**
```
┌────────────────────────────────────────┐
│ Log CPAT Assessment                 ✕  │
├────────────────────────────────────────┤
│                                        │
│ Assessment Type                        │
│ ○ Practice  ○ Official  ○ Simulated   │
│                                        │
│ Date: [January 8, 2026        ] 📅    │
│                                        │
│ Location: [Training Grounds    ]      │
│                                        │
│ ────────────────────────────────────── │
│                                        │
│ Events                                 │
│                                        │
│ 1. Stair Climb                         │
│    [✅ Pass] [❌ Fail]                 │
│    Notes: [_______________]            │
│                                        │
│ 2. Hose Drag                           │
│    [✅ Pass] [❌ Fail]                 │
│    Notes: [_______________]            │
│                                        │
│ ... (more events)                      │
│                                        │
│ Total Time: [__:__]                    │
│                                        │
│ Notes:                                 │
│ [_____________________________]        │
│ [_____________________________]        │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │        Save Assessment           │   │
│ └──────────────────────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

### Screen 5: Team Readiness (Supervisor View)

**Layout:**
```
┌────────────────────────────────────────┐
│ Station 5 - Unit Readiness          📊 │
├────────────────────────────────────────┤
│                                        │
│ CPAT Readiness                         │
│                                        │
│    5 of 8 Members Ready                │
│    ████████░░░░ 62.5%                  │
│                                        │
│ ────────────────────────────────────── │
│                                        │
│ Members                                │
│                                        │
│ ✅ J. Smith         92% │ Jan 5       │
│ ✅ M. Johnson       89% │ Jan 3       │
│ ✅ R. Williams      85% │ Dec 28      │
│ ✅ K. Davis         82% │ Jan 7       │
│ ✅ T. Brown         80% │ Jan 2       │
│ ⚠️ A. Martinez      68% │ Dec 15      │
│ ⚠️ C. Garcia        65% │ Dec 20      │
│ ❌ P. Wilson        45% │ Nov 30      │
│                                        │
│ ────────────────────────────────────── │
│                                        │
│ Unit Weak Areas                        │
│ • Ladder Raise (3 members struggling) │
│ • Ceiling Breach (2 members)          │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │       Export Report (PDF)        │   │
│ └──────────────────────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

---

## Privacy Defaults

| Data Type | Default Visibility | Notes |
|-----------|-------------------|-------|
| Career goals | Private | Only user sees |
| Assessment results | Private | Only user sees |
| Readiness score | Private | Only user sees |
| Team readiness | Opt-in | Member must consent |
| Recertification status | Private | Only user sees |
| Agency affiliation | Private | Optional disclosure |

**Team Readiness Opt-In Process:**
1. Hangout admin enables "Unit Readiness" feature
2. Members receive notification to opt-in
3. Members explicitly consent in privacy settings
4. Opt-in is per-hangout (can share with station, not department)
5. Members can revoke consent at any time

---

## Telemetry Events

| Event | Description | Properties |
|-------|-------------|------------|
| `career.standard_viewed` | User viewed a standard | standard_id, category |
| `career.goal_set` | User set a career goal | standard_id, target_date |
| `career.goal_updated` | User updated goal | goal_id, changes |
| `career.goal_achieved` | User achieved goal | goal_id, days_to_achieve |
| `career.assessment_logged` | User logged assessment | standard_id, type, passed |
| `career.readiness_viewed` | User viewed readiness | goal_id, score |
| `career.prescription_generated` | Prescription with career goal | goal_id, weak_events |
| `career.team_opted_in` | Member opted into team view | hangout_id, standard_id |
| `career.team_viewed` | Supervisor viewed team | hangout_id, standard_id |
| `career.recert_reminder` | Recertification reminder sent | goal_id, days_until_due |

---

## Migration Plan

### Migration 040: Career Standards Tables

```sql
-- Create career_standards table
CREATE TABLE career_standards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  full_name TEXT,
  agency TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  official_url TEXT,
  passing_criteria JSONB NOT NULL,
  scoring_type TEXT NOT NULL,
  recertification_period_months INTEGER,
  icon TEXT,
  active BOOLEAN DEFAULT true,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_career_standards_category ON career_standards(category);

-- Create career_standard_events table
CREATE TABLE career_standard_events (
  id TEXT PRIMARY KEY,
  standard_id TEXT NOT NULL REFERENCES career_standards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  metric_type TEXT NOT NULL,
  metric_unit TEXT,
  direction TEXT NOT NULL,
  passing_threshold REAL,
  maximum_threshold REAL,
  scoring_table JSONB,
  equipment_required TEXT[],
  exercise_mappings TEXT[],
  tips TEXT[],
  video_url TEXT,
  order_index INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_events_standard ON career_standard_events(standard_id);

-- Create user_career_goals table
CREATE TABLE user_career_goals (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  standard_id TEXT NOT NULL REFERENCES career_standards(id),
  target_date DATE,
  priority TEXT DEFAULT 'primary',
  status TEXT DEFAULT 'active',
  agency_name TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  achieved_at TEXT,
  UNIQUE(user_id, standard_id)
);

CREATE INDEX idx_career_goals_user ON user_career_goals(user_id);

-- Create user_standard_assessments table
CREATE TABLE user_standard_assessments (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  standard_id TEXT NOT NULL REFERENCES career_standards(id),
  assessed_at TEXT NOT NULL,
  assessment_type TEXT DEFAULT 'practice',
  location TEXT,
  results JSONB NOT NULL,
  overall_passed BOOLEAN,
  total_score REAL,
  readiness_score REAL,
  notes TEXT,
  verified BOOLEAN DEFAULT false,
  verified_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_assessments_user ON user_standard_assessments(user_id);
CREATE INDEX idx_assessments_standard ON user_standard_assessments(standard_id);

-- Create team_readiness_permissions table
CREATE TABLE team_readiness_permissions (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  hangout_id TEXT NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL,
  standard_id TEXT REFERENCES career_standards(id),
  granted_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(hangout_id, user_id, permission_type)
);

CREATE INDEX idx_team_readiness_hangout ON team_readiness_permissions(hangout_id);

-- Create recertification_schedules table
CREATE TABLE recertification_schedules (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id TEXT NOT NULL REFERENCES user_career_goals(id) ON DELETE CASCADE,
  last_certified_at TEXT,
  next_due_at TEXT NOT NULL,
  reminder_days INTEGER[] DEFAULT '{30, 14, 7}',
  last_reminded_at TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_recert_user ON recertification_schedules(user_id);
CREATE INDEX idx_recert_due ON recertification_schedules(next_due_at);
```

### Migration 041: Seed Career Standards

```sql
-- Seed CPAT
INSERT INTO career_standards (id, name, full_name, agency, category, description, scoring_type, passing_criteria)
VALUES (
  'cpat',
  'CPAT',
  'Candidate Physical Ability Test',
  'Generic Fire Department',
  'firefighter',
  'Standardized physical ability test for firefighter candidates...',
  'pass_fail',
  '{"type": "timed", "time_limit_seconds": 636, "must_complete_all_events": true}'
);

-- Seed CPAT events
INSERT INTO career_standard_events (id, standard_id, name, description, metric_type, direction, order_index, exercise_mappings)
VALUES
  ('cpat-stair-climb', 'cpat', 'Stair Climb', '3 min at 60 steps/min', 'pass_fail', 'pass_fail', 1, ARRAY['stair_climber', 'lunges']),
  ('cpat-hose-drag', 'cpat', 'Hose Drag', '75ft + turn + 25ft', 'pass_fail', 'pass_fail', 2, ARRAY['sled_drag', 'cable_rows']),
  -- ... more events
;

-- Repeat for ACFT, PFT, etc.
```

---

## Success Criteria

### MVP (Launch)
- [ ] 10+ physical standards in database
- [ ] Standards browseable by category
- [ ] Users can set career goals
- [ ] Users can log assessments
- [ ] Readiness score calculated automatically
- [ ] Mobile and web UI complete

### Phase 2
- [ ] Prescription engine uses career goals
- [ ] Team readiness dashboards functional
- [ ] Recertification reminders working
- [ ] 100+ users with active career goals

### Phase 3
- [ ] 1000+ assessments logged
- [ ] 50+ hangouts with team readiness enabled
- [ ] Prescription usage increases 50% with career goals

---

*End of Career Standards Specification*
