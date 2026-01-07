-- MuscleMap Database Schema
-- PostgreSQL / SQLite compatible

-- ============================================
-- USERS
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  selected_path VARCHAR(20) DEFAULT 'bodyweight' CHECK (selected_path IN ('bodyweight', 'kettlebell', 'freeweight')),
  selected_archetype VARCHAR(50),
  experience_level VARCHAR(20) DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  weekly_goal_units INTEGER DEFAULT 100,
  preferred_workout_days INTEGER[] DEFAULT '{1,3,5}',
  body_weight_kg DECIMAL(5,2),
  height_cm INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- ============================================
-- EXERCISES (Static data, seeded)
-- ============================================

CREATE TABLE exercises (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  path VARCHAR(20) NOT NULL CHECK (path IN ('bodyweight', 'kettlebell', 'freeweight')),
  category VARCHAR(20) NOT NULL CHECK (category IN ('push', 'pull', 'legs', 'hinge', 'core', 'carry')),
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  description TEXT,
  cues TEXT[],
  time_per_set INTEGER DEFAULT 60,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exercise_muscle_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id VARCHAR(50) REFERENCES exercises(id) ON DELETE CASCADE,
  muscle_id VARCHAR(20) NOT NULL,
  activation INTEGER NOT NULL CHECK (activation BETWEEN 0 AND 100),
  role VARCHAR(20) NOT NULL CHECK (role IN ('primary', 'secondary', 'stabilizer')),
  UNIQUE(exercise_id, muscle_id)
);

-- ============================================
-- MUSCLES (Static data, seeded)
-- ============================================

CREATE TABLE muscles (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  region VARCHAR(20) NOT NULL CHECK (region IN ('shoulders', 'chest', 'back', 'arms', 'core', 'hips', 'legs')),
  subregion VARCHAR(50) NOT NULL,
  bias_weight DECIMAL(3,2) NOT NULL,
  weekly_set_range_min INTEGER NOT NULL,
  weekly_set_range_max INTEGER NOT NULL,
  recovery_hours INTEGER NOT NULL,
  compound_exposure VARCHAR(20) NOT NULL CHECK (compound_exposure IN ('very_high', 'high', 'medium', 'low')),
  rationale TEXT
);

-- ============================================
-- ARCHETYPES (Static data, seeded)
-- ============================================

CREATE TABLE archetypes (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  total_units_required INTEGER DEFAULT 100,
  image_path VARCHAR(255)
);

CREATE TABLE archetype_muscles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype_id VARCHAR(50) REFERENCES archetypes(id) ON DELETE CASCADE,
  muscle_id VARCHAR(20) REFERENCES muscles(id) ON DELETE CASCADE,
  target_activation INTEGER NOT NULL CHECK (target_activation BETWEEN 0 AND 100),
  UNIQUE(archetype_id, muscle_id)
);

-- ============================================
-- WORKOUTS
-- ============================================

CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  total_units INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE logged_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id VARCHAR(50) REFERENCES exercises(id),
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight_kg DECIMAL(5,2),
  notes TEXT,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  order_index INTEGER DEFAULT 0
);

-- ============================================
-- PROGRESS TRACKING
-- ============================================

CREATE TABLE weekly_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  total_units INTEGER DEFAULT 0,
  workouts_completed INTEGER DEFAULT 0,
  goal_units INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, week_start_date)
);

CREATE TABLE muscle_weekly_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_progress_id UUID REFERENCES weekly_progress(id) ON DELETE CASCADE,
  muscle_id VARCHAR(20) REFERENCES muscles(id),
  total_activation DECIMAL(6,2) DEFAULT 0,
  displayed_activation DECIMAL(5,2) DEFAULT 0,
  UNIQUE(weekly_progress_id, muscle_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_started_at ON workouts(started_at);
CREATE INDEX idx_logged_exercises_workout_id ON logged_exercises(workout_id);
CREATE INDEX idx_weekly_progress_user_week ON weekly_progress(user_id, week_start_date);
CREATE INDEX idx_exercises_path ON exercises(path);
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_muscles_region ON muscles(region);

-- ============================================
-- VIEWS
-- ============================================

-- User's current week summary
CREATE VIEW user_current_week_summary AS
SELECT 
  u.id AS user_id,
  u.name,
  COALESCE(wp.total_units, 0) AS units_this_week,
  COALESCE(wp.workouts_completed, 0) AS workouts_this_week,
  up.weekly_goal_units AS goal_units,
  CASE 
    WHEN up.weekly_goal_units > 0 
    THEN ROUND((COALESCE(wp.total_units, 0)::DECIMAL / up.weekly_goal_units) * 100, 1)
    ELSE 0 
  END AS goal_percentage
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN weekly_progress wp ON u.id = wp.user_id 
  AND wp.week_start_date = DATE_TRUNC('week', CURRENT_DATE);

-- Exercise with activation summary
CREATE VIEW exercise_activation_summary AS
SELECT 
  e.id,
  e.name,
  e.path,
  e.category,
  e.difficulty,
  COUNT(DISTINCT ema.muscle_id) AS muscles_targeted,
  AVG(CASE WHEN ema.role = 'primary' THEN ema.activation END) AS avg_primary_activation,
  STRING_AGG(DISTINCT m.region, ', ') AS regions_targeted
FROM exercises e
LEFT JOIN exercise_muscle_activations ema ON e.id = ema.exercise_id
LEFT JOIN muscles m ON ema.muscle_id = m.id
GROUP BY e.id, e.name, e.path, e.category, e.difficulty;
