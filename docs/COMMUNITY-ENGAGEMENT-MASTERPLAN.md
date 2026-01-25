# MuscleMap Community & Engagement Master Plan

> **Version**: 1.0.0
> **Created**: 2026-01-25
> **Status**: Active Development
> **Goal**: Transform MuscleMap from a solo tracking app into a thriving fitness community platform

---

## Executive Summary

This master plan outlines a comprehensive strategy to build community features, team functionality, and engagement systems that will dramatically increase user retention, daily active usage, and viral growth. The plan is organized into 5 phases over 12 weeks.

---

## Phase 1: Social Foundation (Weeks 1-2)
*Build the core social infrastructure that all other features depend on*

### 1.1 High-Five Reaction System ⚡ PRIORITY
**Why**: Lowest friction social interaction - one tap to encourage

| Component | Description | Status |
|-----------|-------------|--------|
| `high_fives` table | Store reactions with timestamps | Pending |
| High-Five button | Animated heart/fist icon on workout cards | Pending |
| Notification | "John gave you a high-five on your workout!" | Pending |
| Weekly digest | "You received 12 high-fives this week" | Pending |
| Sound/haptic | Satisfying feedback when giving/receiving | Pending |

**Schema**:
```sql
CREATE TABLE high_fives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workout_session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
  set_id UUID REFERENCES logged_sets(id) ON DELETE SET NULL,
  emoji VARCHAR(10) DEFAULT '🙌',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(giver_id, workout_session_id) -- One high-five per workout per user
);

CREATE INDEX idx_high_fives_receiver ON high_fives(receiver_id, created_at DESC);
CREATE INDEX idx_high_fives_workout ON high_fives(workout_session_id);
```

**GraphQL**:
```graphql
type HighFive {
  id: ID!
  giver: User!
  receiver: User!
  workoutSession: WorkoutSession
  emoji: String!
  createdAt: DateTime!
}

type Mutation {
  giveHighFive(workoutSessionId: ID!, emoji: String): HighFive!
  removeHighFive(workoutSessionId: ID!): Boolean!
}

type Query {
  myHighFives(limit: Int, after: String): HighFiveConnection!
  highFivesGiven(limit: Int): [HighFive!]!
}

type Subscription {
  highFiveReceived: HighFive!
}
```

### 1.2 Live Activity Feed
**Why**: Creates FOMO, shows social proof, keeps users coming back

| Component | Description | Status |
|-----------|-------------|--------|
| Feed query | Paginated feed of friend activities | Pending |
| Activity types | Workouts, PRs, achievements, streaks | Pending |
| Real-time updates | New activities appear at top | Pending |
| Privacy controls | Who can see your activity | Pending |
| Filtering | All/Friends/Following/Crew | Pending |

**Activity Types**:
1. `WORKOUT_COMPLETED` - "Jane completed Push Day (45 min)"
2. `PR_SET` - "Mike hit a new PR: 225 lbs Bench Press!"
3. `STREAK_MILESTONE` - "Sarah reached a 30-day streak! 🔥"
4. `ACHIEVEMENT_UNLOCKED` - "Tom unlocked 'Century Club'"
5. `LEVEL_UP` - "Alex reached Level 15!"
6. `CREW_JOINED` - "Chris joined Iron Warriors"
7. `CHALLENGE_COMPLETED` - "Team completed 10K Reps Challenge"

**Schema**:
```sql
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  reference_id UUID, -- Points to workout/achievement/etc
  reference_type VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  visibility VARCHAR(20) DEFAULT 'friends', -- public, friends, crew, private
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_feed_user ON activity_feed(user_id, created_at DESC);
CREATE INDEX idx_activity_feed_public ON activity_feed(created_at DESC) WHERE visibility = 'public';

-- Materialized view for friend feed (refreshed every minute)
CREATE MATERIALIZED VIEW mv_friend_feed AS
SELECT af.*, u.username, u.avatar_url
FROM activity_feed af
JOIN users u ON af.user_id = u.id
WHERE af.visibility IN ('public', 'friends')
  AND af.created_at > NOW() - INTERVAL '7 days'
ORDER BY af.created_at DESC;

CREATE UNIQUE INDEX idx_mv_friend_feed_id ON mv_friend_feed(id);
```

### 1.3 Following System Enhancement
**Why**: Foundation for personalized feeds

| Feature | Description |
|---------|-------------|
| Follow requests | Optional approval for private accounts |
| Follow suggestions | "People who lift at your gym" |
| Mutual follows | Highlighted as "Friends" |
| Follow notifications | "John started following you" |

---

## Phase 2: Workout Buddies (Weeks 3-4)
*Pair users for accountability and motivation*

### 2.1 Buddy Matching Algorithm
**Why**: Accountability partners dramatically improve retention

**Matching Criteria** (weighted scoring):
| Factor | Weight | Description |
|--------|--------|-------------|
| Schedule overlap | 30% | Same workout days/times |
| Goal alignment | 25% | Similar fitness goals |
| Experience level | 20% | Similar strength/experience |
| Location proximity | 15% | Same gym or area |
| Archetype match | 10% | Complementary archetypes |

**Schema**:
```sql
CREATE TABLE buddy_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, paused, ended
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  match_score DECIMAL(5,2),
  match_reasons JSONB DEFAULT '[]',
  streak_count INT DEFAULT 0,
  last_sync_workout TIMESTAMPTZ,
  UNIQUE(user_a_id, user_b_id)
);

CREATE TABLE buddy_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_pair_id UUID REFERENCES buddy_pairs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  check_in_type VARCHAR(30), -- workout_completed, encouragement, reminder_sent
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Buddy Features
| Feature | Description | Engagement Impact |
|---------|-------------|-------------------|
| Streak chains | Both must workout to maintain | High |
| Buddy nudges | "Your buddy hasn't worked out today" | Medium |
| Shared rest timer | Sync timers during workouts | High |
| Progress comparison | Side-by-side progress charts | Medium |
| Celebration sharing | Auto-share PRs with buddy | Medium |

### 2.3 Buddy Matching UI Flow
```
1. User enables "Find a Buddy" in settings
2. Completes buddy preference quiz:
   - Preferred workout times
   - Goals (strength/hypertrophy/endurance)
   - Experience level
   - Communication style (chatty/quiet)
3. System finds matches (show top 3)
4. User sends buddy request with intro message
5. Match accepts → Buddy pair created
6. 7-day trial period → Confirm or rematch
```

---

## Phase 3: Teams & Crews (Weeks 5-7)
*Build lasting communities around shared goals*

### 3.1 Crew System
**Why**: Group identity increases retention 3-5x

**Crew Types**:
| Type | Size | Description |
|------|------|-------------|
| Squad | 2-5 | Close friends, gym partners |
| Crew | 6-20 | Training group, gym community |
| Guild | 21-100 | Large community, gym chain |
| League | 100+ | Competitive organization |

**Schema**:
```sql
CREATE TABLE crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  crew_type VARCHAR(20) DEFAULT 'crew',
  visibility VARCHAR(20) DEFAULT 'public', -- public, private, invite_only
  max_members INT DEFAULT 20,

  -- Stats (denormalized for performance)
  member_count INT DEFAULT 0,
  total_workouts INT DEFAULT 0,
  total_volume BIGINT DEFAULT 0,
  weekly_active_members INT DEFAULT 0,
  current_streak INT DEFAULT 0,

  -- Settings
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member', -- owner, admin, moderator, member
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  contribution_score INT DEFAULT 0,
  workouts_contributed INT DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  UNIQUE(crew_id, user_id)
);

CREATE INDEX idx_crew_members_crew ON crew_members(crew_id);
CREATE INDEX idx_crew_members_user ON crew_members(user_id);
```

### 3.2 Crew Features
| Feature | Description | Priority |
|---------|-------------|----------|
| Crew feed | Activity feed filtered to crew | P0 |
| Crew leaderboard | Weekly rankings within crew | P0 |
| Crew challenges | Group goals and competitions | P1 |
| Crew chat | Real-time messaging | P1 |
| Crew templates | Shared workout templates | P1 |
| Crew calendar | Scheduled group workouts | P2 |
| Crew stats | Aggregate statistics dashboard | P2 |

### 3.3 Team Challenges
**Why**: Shared goals create bonding and urgency

**Challenge Types**:
```typescript
interface TeamChallenge {
  id: string;
  crewId: string;
  type: 'volume' | 'frequency' | 'streak' | 'exercise' | 'custom';
  name: string;
  description: string;
  target: number;
  unit: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  participants: string[];
  rewards: ChallengeReward[];
}

// Examples:
// - "10,000 Total Reps This Week"
// - "Everyone Works Out 4x This Week"
// - "Collective 100,000 lbs Volume"
// - "30-Day Crew Streak"
```

**Schema**:
```sql
CREATE TABLE crew_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  challenge_type VARCHAR(30) NOT NULL,
  target_value DECIMAL(12,2) NOT NULL,
  target_unit VARCHAR(30) NOT NULL,
  current_value DECIMAL(12,2) DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'upcoming', -- upcoming, active, completed, failed
  rewards JSONB DEFAULT '[]',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE challenge_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES crew_challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workout_session_id UUID REFERENCES workout_sessions(id),
  contribution_value DECIMAL(12,2) NOT NULL,
  contributed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 4: Real-Time Social (Weeks 8-10)
*Create live, connected workout experiences*

### 4.1 Live Workout Presence
**Why**: Knowing friends are working out NOW creates urgency

| Feature | Description |
|---------|-------------|
| "Working Out Now" indicator | Green dot on profile/feed |
| Live workout viewer | See friend's current exercises in real-time |
| Join workout | Start same workout template as friend |
| Cheer button | Send encouragement during their workout |

**Implementation**:
- WebSocket connection for presence
- Redis pub/sub for real-time updates
- Battery-efficient mobile polling fallback

### 4.2 Workout Reactions
**Why**: Micro-interactions during workouts feel amazing

| Reaction | Trigger | Effect |
|----------|---------|--------|
| 🔥 Fire | Heavy lift | Screen flashes orange |
| 💪 Strength | PR attempt | Encouraging sound |
| ⚡ Energy | High volume | Quick vibration |
| 🎯 Focus | Perfect form | Subtle ping |
| 🏆 Champion | Workout complete | Celebration animation |

**Schema**:
```sql
CREATE TABLE workout_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workout_session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
  set_id UUID REFERENCES logged_sets(id) ON DELETE SET NULL,
  reaction_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limit: max 10 reactions per workout per sender
CREATE INDEX idx_workout_reactions_sender_workout
ON workout_reactions(sender_id, workout_session_id);
```

### 4.3 In-Workout Chat
**Why**: Quick communication without leaving the app

| Feature | Description |
|---------|-------------|
| Voice notes | 15-second audio clips |
| Quick replies | Pre-set messages ("Let's go!", "Almost there!") |
| Set tagging | "@Mike just did 225x5, you got this!" |
| Form check requests | Share video clip for feedback |

### 4.4 Synchronized Workouts
**Why**: Working out "together" even when apart

```typescript
interface SyncSession {
  id: string;
  hostId: string;
  participants: string[];
  template: WorkoutTemplate;
  status: 'waiting' | 'active' | 'completed';
  currentExerciseIndex: number;
  startedAt: Date;

  // Real-time state
  participantProgress: Map<string, {
    currentSet: number;
    completed: boolean;
    restTimeRemaining: number;
  }>;
}
```

**Features**:
- Host starts sync session, shares link
- Participants see same workout template
- Real-time progress indicators
- Shared rest timer countdown
- Victory screen when all complete

---

## Phase 5: Gamification & Competitions (Weeks 11-12)
*Add competitive elements that drive engagement*

### 5.1 Crew XP & Leveling
**Why**: Collective progression creates ownership

| Level | XP Required | Perks Unlocked |
|-------|-------------|----------------|
| 1 | 0 | Basic crew features |
| 5 | 5,000 | Custom crew badge |
| 10 | 15,000 | Crew templates library |
| 15 | 35,000 | Challenge creation |
| 20 | 75,000 | Crew analytics |
| 25 | 150,000 | Verified crew badge |
| 30 | 300,000 | Hall of Fame entry |

**XP Sources**:
- Member workout: +10 XP
- Member PR: +25 XP
- Challenge completed: +100 XP
- New member joined: +50 XP
- Weekly crew streak: +200 XP

### 5.2 Territory System (Future)
**Why**: Local competition drives engagement

```
- Gyms become "territories"
- Crews compete for top position at each gym
- Weekly reset based on aggregate volume
- Leaderboard shows territory holders
- Special badge for holding territory
```

### 5.3 Seasonal Championships
**Why**: Time-limited events create urgency

| Season | Duration | Focus |
|--------|----------|-------|
| Q1 | Jan-Mar | Strength Challenge |
| Q2 | Apr-Jun | Summer Shred |
| Q3 | Jul-Sep | Endurance Push |
| Q4 | Oct-Dec | Year-End Championships |

**Structure**:
1. Qualification round (2 weeks)
2. Group stage (2 weeks)
3. Playoffs (1 week)
4. Finals (1 week)

---

## Technical Architecture

### Real-Time Infrastructure
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client App    │────▶│   API Server    │────▶│   PostgreSQL    │
│  (React/Native) │     │   (Fastify)     │     │   (Primary DB)  │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         │    WebSocket          │
         │                       ▼
         │              ┌─────────────────┐
         └─────────────▶│     Redis       │
                        │  (Pub/Sub +     │
                        │   Presence)     │
                        └─────────────────┘
```

### Notification System
```typescript
interface NotificationConfig {
  // In-app
  showBanner: boolean;
  playSound: boolean;
  vibrate: boolean;

  // Push
  pushEnabled: boolean;
  pushCategories: {
    highFives: boolean;
    buddyActivity: boolean;
    crewUpdates: boolean;
    challenges: boolean;
    achievements: boolean;
  };

  // Quiet hours
  quietStart: string; // "22:00"
  quietEnd: string;   // "07:00"
}
```

### Privacy Controls
```typescript
interface PrivacySettings {
  // Visibility
  profileVisibility: 'public' | 'friends' | 'private';
  activityVisibility: 'public' | 'friends' | 'crew' | 'private';
  statsVisibility: 'public' | 'friends' | 'private';

  // Discovery
  showInBuddyMatching: boolean;
  showInCrewSuggestions: boolean;
  showInLeaderboards: boolean;

  // Interactions
  allowHighFives: 'everyone' | 'friends' | 'nobody';
  allowBuddyRequests: boolean;
  allowCrewInvites: boolean;
}
```

---

## Success Metrics

### Engagement KPIs
| Metric | Current | Target (90 days) |
|--------|---------|------------------|
| DAU/MAU ratio | ~15% | 40% |
| Avg. sessions/user/week | 2.1 | 4.5 |
| Social actions/user/week | 0.5 | 8+ |
| Crew membership rate | 0% | 35% |
| Buddy pair active rate | 0% | 20% |

### Retention KPIs
| Metric | Current | Target |
|--------|---------|--------|
| D1 retention | 45% | 65% |
| D7 retention | 25% | 45% |
| D30 retention | 12% | 30% |
| Crew member D30 retention | N/A | 55% |

### Viral KPIs
| Metric | Target |
|--------|--------|
| Invites sent/user | 2+ |
| Invite conversion rate | 25% |
| Organic social shares | 500/month |

---

## Implementation Priority Matrix

```
                    HIGH IMPACT
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
    │  High-Fives   ★    │    Crews      ★   │
    │  Activity Feed ★   │    Challenges ★   │
    │                    │                    │
LOW ├────────────────────┼────────────────────┤ HIGH
EFFORT                   │                    EFFORT
    │                    │                    │
    │  Reactions         │    Sync Workouts  │
    │  Quick Chat        │    Territories    │
    │                    │                    │
    └────────────────────┼────────────────────┘
                         │
                    LOW IMPACT
```

**Immediate Priorities (This Sprint)**:
1. ⭐ High-Five system (low effort, high impact)
2. ⭐ Activity Feed (medium effort, high impact)
3. ⭐ Crew infrastructure (medium effort, high impact)

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Toxic behavior | High | Moderation tools, report system, mute/block |
| Privacy concerns | High | Granular privacy controls, default to private |
| Server overload | Medium | Rate limiting, efficient queries, caching |
| Feature bloat | Medium | Phased rollout, feature flags |
| Low adoption | Medium | Onboarding prompts, incentives |

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-25 | Initial master plan |

---

## Next Steps

1. **Immediate**: Create database migrations for Phase 1
2. **This Week**: Implement High-Five system end-to-end
3. **Next Week**: Build Activity Feed with real-time updates
4. **Week 3**: Launch Buddy Matching beta
5. **Week 5**: Roll out Crew system

---

*This is a living document. Review and update weekly during implementation.*
