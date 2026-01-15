# Database Schema Reference

> Overview of MuscleMap's database structure.

---

## Core Tables

### users

Primary user accounts table.

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  username        VARCHAR(50) UNIQUE NOT NULL,
  archetype_id    VARCHAR(50),
  level           INT DEFAULT 1,
  total_tu        INT DEFAULT 0,
  credit_balance  INT DEFAULT 100,
  wealth_tier     INT DEFAULT 0,
  avatar_url      VARCHAR(500),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_archetype ON users(archetype_id);
CREATE INDEX idx_users_level ON users(level);
```

### workouts

Logged workout sessions.

```sql
CREATE TABLE workouts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  total_tu      INT DEFAULT 0,
  duration_sec  INT,
  completed_at  TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workouts_user ON workouts(user_id);
CREATE INDEX idx_workouts_keyset ON workouts(user_id, created_at DESC, id DESC);
```

### workout_exercises

Exercises within a workout.

```sql
CREATE TABLE workout_exercises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id    UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id   UUID REFERENCES exercises(id),
  order_num     INT NOT NULL,
  tu_earned     INT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workout_exercises_workout ON workout_exercises(workout_id);
CREATE INDEX idx_workout_exercises_exercise ON workout_exercises(exercise_id);
```

### exercise_sets

Individual sets within an exercise.

```sql
CREATE TABLE exercise_sets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number          INT NOT NULL,
  reps                INT NOT NULL,
  weight              DECIMAL(10,2),
  rpe                 INT,
  rir                 INT,
  duration_sec        INT,
  created_at          TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_exercise_sets_workout_exercise ON exercise_sets(workout_exercise_id);
```

---

## Reference Tables

### exercises

Exercise library.

```sql
CREATE TABLE exercises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  category      VARCHAR(50) NOT NULL,
  equipment     VARCHAR(100)[],
  instructions  TEXT,
  difficulty    INT DEFAULT 1,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_exercises_name ON exercises(name);
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_equipment ON exercises USING GIN(equipment);
```

### muscle_activations

Muscle activation data for exercises.

```sql
CREATE TABLE muscle_activations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id   UUID REFERENCES exercises(id) ON DELETE CASCADE,
  muscle_id     VARCHAR(50) NOT NULL,
  muscle_name   VARCHAR(100) NOT NULL,
  activation    DECIMAL(5,2) NOT NULL,
  is_primary    BOOLEAN DEFAULT false
);

-- Indexes
CREATE INDEX idx_muscle_activations_exercise ON muscle_activations(exercise_id);
CREATE INDEX idx_muscle_activations_muscle ON muscle_activations(muscle_id);
```

### archetypes

Training archetypes reference.

```sql
CREATE TABLE archetypes (
  id            VARCHAR(50) PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  stat_weights  JSONB
);
```

---

## Social Tables

### follows

User follow relationships.

```sql
CREATE TABLE follows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Indexes
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
```

### crews

Crew/team groups.

```sql
CREATE TABLE crews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  captain_id    UUID REFERENCES users(id),
  privacy       VARCHAR(20) DEFAULT 'open',
  member_count  INT DEFAULT 0,
  total_tu      INT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_crews_captain ON crews(captain_id);
CREATE INDEX idx_crews_name ON crews(name);
```

### crew_members

Crew membership.

```sql
CREATE TABLE crew_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id       UUID REFERENCES crews(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  role          VARCHAR(20) DEFAULT 'member',
  joined_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE(crew_id, user_id)
);

-- Indexes
CREATE INDEX idx_crew_members_crew ON crew_members(crew_id);
CREATE INDEX idx_crew_members_user ON crew_members(user_id);
```

### high_fives

Encouragement gestures.

```sql
CREATE TABLE high_fives (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  to_user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(20) DEFAULT 'single',
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_high_fives_from ON high_fives(from_user_id);
CREATE INDEX idx_high_fives_to ON high_fives(to_user_id);
CREATE INDEX idx_high_fives_created ON high_fives(created_at DESC);
```

---

## Gamification Tables

### achievements

Achievement definitions.

```sql
CREATE TABLE achievements (
  id            VARCHAR(50) PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  category      VARCHAR(50),
  rarity        VARCHAR(20),
  credit_reward INT DEFAULT 0,
  icon          VARCHAR(100)
);
```

### user_achievements

Earned achievements.

```sql
CREATE TABLE user_achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id  VARCHAR(50) REFERENCES achievements(id),
  earned_at       TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Indexes
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
```

### rivalries

Head-to-head competitions.

```sql
CREATE TABLE rivalries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id   UUID REFERENCES users(id),
  challenged_id   UUID REFERENCES users(id),
  metric          VARCHAR(50) NOT NULL,
  stake           INT DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'pending',
  start_date      TIMESTAMP,
  end_date        TIMESTAMP,
  winner_id       UUID REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rivalries_challenger ON rivalries(challenger_id);
CREATE INDEX idx_rivalries_challenged ON rivalries(challenged_id);
CREATE INDEX idx_rivalries_status ON rivalries(status);
```

---

## Economy Tables

### credit_transactions

Credit history ledger.

```sql
CREATE TABLE credit_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  amount        INT NOT NULL,
  type          VARCHAR(50) NOT NULL,
  description   TEXT,
  balance_after INT NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_keyset ON credit_transactions(user_id, created_at DESC, id DESC);
```

---

## Materialized Views

### leaderboard_weekly

Weekly leaderboard (refreshed every 5 minutes).

```sql
CREATE MATERIALIZED VIEW leaderboard_weekly AS
SELECT
  user_id,
  SUM(total_tu) as weekly_tu,
  RANK() OVER (ORDER BY SUM(total_tu) DESC) as rank
FROM workouts
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id;

CREATE UNIQUE INDEX idx_leaderboard_weekly_user ON leaderboard_weekly(user_id);
```

---

## Entity Relationship

```
users ──────────────────────┬──────────────────┬──────────────────┐
  │                         │                  │                  │
  │ 1:n                     │ 1:n              │ 1:n              │ 1:n
  ▼                         ▼                  ▼                  ▼
workouts                follows           crew_members     user_achievements
  │                                           │
  │ 1:n                                       │ n:1
  ▼                                           ▼
workout_exercises                          crews
  │
  │ 1:n
  ▼
exercise_sets

exercises ─────────────────┐
  │                        │
  │ 1:n                    │
  ▼                        │
muscle_activations         │
                           │
                           ▼
               workout_exercises (n:1)
```

---

## See Also

- [Architecture](../developer-guide/01-architecture.md)
- [Deployment](../developer-guide/05-deployment.md)
- Full schema: `apps/api/src/db/schema.ts`

---

*Last updated: 2026-01-15*
