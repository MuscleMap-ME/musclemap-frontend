# MuscleMap Engagement System - Comprehensive Implementation Plan

**Created:** 2026-01-16
**Status:** Active Development Plan
**Priority:** P0 - Critical for User Retention

## Executive Summary

This document outlines a comprehensive engagement system designed to drive daily active usage, habitual behavior formation, and long-term retention. The system combines behavioral psychology principles (variable rewards, loss aversion, social proof, commitment/consistency) with gamification mechanics proven in apps like Duolingo, Strava, and mobile games.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Daily Login Reward System](#2-daily-login-reward-system)
3. [Streak System & Milestones](#3-streak-system--milestones)
4. [Daily Challenges System](#4-daily-challenges-system)
5. [Notification & Toast System](#5-notification--toast-system)
6. [Daily Workout Prescription](#6-daily-workout-prescription)
7. [Social Engagement Triggers](#7-social-engagement-triggers)
8. [Time-Limited Events](#8-time-limited-events)
9. [Recovery & Rest Day Engagement](#9-recovery--rest-day-engagement)
10. [Push Notification Strategy](#10-push-notification-strategy)
11. [Database Schema](#11-database-schema)
12. [API Routes](#12-api-routes)
13. [Frontend Components](#13-frontend-components)
14. [Implementation Phases](#14-implementation-phases)
15. [Success Metrics](#15-success-metrics)

---

## 1. Current State Analysis

### What Exists

| Feature | Frontend | Backend | Database | Status |
|---------|----------|---------|----------|--------|
| Daily Challenges UI | ✅ Complete | ❌ Missing | ❌ Missing | **Needs Backend** |
| Streak Tracking | ❌ Missing | ✅ Partial | ✅ Tables exist | **Needs Frontend + API** |
| Loot/Mystery Boxes | ✅ Excellent | ✅ Complete | ✅ Complete | **Production Ready** |
| High Fives | ✅ Basic | ✅ Basic | ✅ Complete | **Functional** |
| Credit Economy | ✅ Complete | ✅ Excellent | ✅ Complete | **Production Ready** |
| Notifications | ❌ Missing | ✅ Complete | ✅ Complete | **Needs Frontend** |
| Daily Prescriptions | ❌ Missing | ✅ Complete | ✅ Complete | **Needs Frontend** |
| Achievements | ❌ Minimal | ✅ Complete | ✅ Complete | **Needs Frontend** |

### Critical Gaps

1. **No daily login incentive** - Users have no reason to open app daily
2. **Streak visibility zero** - Backend tracks but users can't see
3. **No notification UI** - Backend sends notifications nobody can see
4. **No prescription UI** - AI generates workouts nobody can view
5. **Challenge backend missing** - Beautiful UI with no data

---

## 2. Daily Login Reward System

### Concept

A daily reward system that:
- Grants escalating rewards for consecutive daily logins
- Provides a "mystery box" on day 7
- Resets streak (but not progress) if user misses a day
- Uses loss aversion: "Don't lose your 15-day streak!"

### Reward Schedule

| Day | Credits | XP | Special Reward |
|-----|---------|-----|----------------|
| 1 | 10 | 25 | - |
| 2 | 15 | 35 | - |
| 3 | 20 | 50 | - |
| 4 | 25 | 65 | - |
| 5 | 35 | 85 | - |
| 6 | 50 | 100 | - |
| 7 | 100 | 150 | Mystery Box (Common) |
| 14 | 150 | 200 | Mystery Box (Uncommon) |
| 21 | 200 | 300 | Mystery Box (Rare) |
| 30 | 300 | 500 | Mystery Box (Epic) + Title "Consistent" |
| 60 | 500 | 750 | Mystery Box (Legendary) + Badge |
| 90 | 750 | 1000 | Mystery Box (Mythic) + Profile Frame |
| 100 | 1000 | 1500 | Mystery Box (Divine) + Exclusive Skin |

### After Day 7 Pattern

Days 8-13 follow same pattern as 1-6, days 15-20 follow 1-6, etc.
Major milestones (7, 14, 21, 30, 60, 90, 100) always get bonus box.

### Streak Protection

- **Streak Freeze**: Purchasable item (250 credits) that protects streak for 1 day
- **Mascot Power**: Companion can save streak once per week at high bond level
- **Grace Period**: 36-hour window to claim previous day's reward

### Database Tables

```sql
CREATE TABLE daily_login_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  login_date DATE NOT NULL,
  day_number INTEGER NOT NULL, -- 1-100+
  credits_awarded INTEGER NOT NULL,
  xp_awarded INTEGER NOT NULL,
  mystery_box_id UUID REFERENCES mystery_boxes(id),
  streak_freeze_used BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, login_date)
);

CREATE TABLE login_streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  streak_freezes_owned INTEGER DEFAULT 0,
  total_logins INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_streaks_last_login ON login_streaks(last_login_date);
```

### API Endpoints

```
POST   /api/daily-login/claim        - Claim today's reward
GET    /api/daily-login/status       - Get current streak & today's reward
GET    /api/daily-login/calendar     - Get last 30 days login history
POST   /api/daily-login/use-freeze   - Use a streak freeze
GET    /api/daily-login/rewards      - Get reward schedule preview
```

### Frontend Components

```
src/components/daily-login/
├── DailyLoginModal.tsx        - Full-screen reward claim modal
├── LoginStreakBadge.tsx       - Small badge showing current streak
├── LoginCalendar.tsx          - 30-day calendar view
├── RewardPreview.tsx          - Shows upcoming rewards
├── StreakFreezeButton.tsx     - Use/buy streak freeze
└── useDailyLogin.ts           - Custom hook for state management
```

---

## 3. Streak System & Milestones

### Streak Types

| Streak Type | Description | Tracking Method |
|-------------|-------------|-----------------|
| **Login Streak** | Consecutive daily app opens | First API call each day |
| **Workout Streak** | Consecutive days with completed workout | Workout completion |
| **Nutrition Streak** | Consecutive days logging food | Food log entries |
| **Sleep Streak** | Consecutive days logging sleep | Sleep log entries |
| **Social Streak** | Consecutive days with social interaction | High-fives, comments |

### Milestone Rewards

| Milestone | Reward | Badge |
|-----------|--------|-------|
| 7 days | 100 credits + 200 XP | "Week Warrior" |
| 14 days | 200 credits + 400 XP | "Two Week Terror" |
| 30 days | 500 credits + 1000 XP | "Monthly Monster" |
| 60 days | 1000 credits + 2000 XP | "Consistency King" |
| 90 days | 2000 credits + 4000 XP | "Quarter Master" |
| 180 days | 5000 credits + 8000 XP | "Half Year Hero" |
| 365 days | 10000 credits + 20000 XP | "Year of Iron" |

### Visual Design

```
┌─────────────────────────────────────────┐
│  🔥 WORKOUT STREAK: 23 DAYS             │
│  ████████████████████░░░░░░░  23/30     │
│  Next milestone: Monthly Monster (7 days)│
│                                         │
│  🏃 Keep it up! Work out today to       │
│     continue your streak.               │
└─────────────────────────────────────────┘
```

### Streak Fire Animation

- Day 1-6: Small flame, subtle glow
- Day 7-13: Medium flame, orange glow
- Day 14-29: Large flame, red glow, particles
- Day 30+: Blue flame, intense particles, crown icon
- Day 100+: Purple/gold flame, legendary effects

### Database Schema

```sql
CREATE TABLE user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  streak_type VARCHAR(50) NOT NULL, -- 'login', 'workout', 'nutrition', 'sleep', 'social'
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  milestone_claimed JSONB DEFAULT '{}', -- {"7": true, "14": true, ...}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, streak_type)
);

CREATE TABLE streak_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  streak_type VARCHAR(50) NOT NULL,
  milestone_days INTEGER NOT NULL,
  credits_awarded INTEGER NOT NULL,
  xp_awarded INTEGER NOT NULL,
  badge_id UUID REFERENCES badges(id),
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, streak_type, milestone_days)
);

CREATE INDEX idx_user_streaks_user ON user_streaks(user_id);
CREATE INDEX idx_user_streaks_type ON user_streaks(streak_type);
```

### API Endpoints

```
GET    /api/streaks                   - Get all user streaks
GET    /api/streaks/:type             - Get specific streak type
POST   /api/streaks/:type/record      - Record activity for streak
POST   /api/streaks/:type/claim       - Claim milestone reward
GET    /api/streaks/leaderboard       - Top streaks this week
```

---

## 4. Daily Challenges System

### Overview

Three daily challenges that reset at midnight (user's timezone):
- One **Easy** challenge (quick wins)
- One **Medium** challenge (moderate effort)
- One **Hard** challenge (significant effort)

### Challenge Categories

| Category | Examples | Tracking |
|----------|----------|----------|
| **Workout** | Log X sets, Complete X workouts, Lift X volume | Set logs, workout completion |
| **Consistency** | Login X days, Workout X consecutive days | Login/workout tracking |
| **Social** | Send X high-fives, Comment on X posts | Social activity |
| **Achievement** | Set X PRs, Earn X XP | Achievement system |
| **Variety** | Train X muscle groups, Try X new exercises | Exercise diversity |

### Challenge Definitions (Already in codebase)

```typescript
// From src/components/challenges/challengeDefinitions.ts
CHALLENGE_TYPES = {
  LOG_SETS: { targets: { easy: 3, medium: 5, hard: 10 } },
  WORKOUT_STREAK: { targets: { easy: 1, medium: 2, hard: 3 } },
  HIT_MUSCLE_GROUPS: { targets: { easy: 2, medium: 3, hard: 5 } },
  HIGH_FIVE_FRIENDS: { targets: { easy: 1, medium: 3, hard: 5 } },
  BEAT_PR: { targets: { easy: 1, medium: 2, hard: 3 } },
  COMPLETE_WORKOUT: { targets: { easy: 1, medium: 2, hard: 3 } },
  EXPLORE_EXERCISE: { targets: { easy: 1, medium: 2, hard: 4 } },
  EARN_XP: { targets: { easy: 100, medium: 250, hard: 500 } },
  TOTAL_VOLUME: { targets: { easy: 1000, medium: 5000, hard: 10000 } },
}
```

### Bonus Challenges

- **Weekly Challenge**: Spans 7 days, bigger rewards
- **Monthly Challenge**: Spans 30 days, huge rewards
- **Flash Challenge**: 2-4 hour window, surprise reward

### Database Schema

```sql
CREATE TABLE daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  challenge_date DATE NOT NULL,
  challenge_type VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20) NOT NULL, -- 'easy', 'medium', 'hard'
  target_value INTEGER NOT NULL,
  current_progress INTEGER DEFAULT 0,
  is_complete BOOLEAN DEFAULT FALSE,
  is_claimed BOOLEAN DEFAULT FALSE,
  xp_reward INTEGER NOT NULL,
  credit_reward INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  UNIQUE(user_id, challenge_date, challenge_type)
);

CREATE TABLE challenge_progress_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  challenge_id UUID NOT NULL REFERENCES daily_challenges(id),
  progress_delta INTEGER NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'set_logged', 'workout_completed', etc.
  event_ref_id UUID, -- Reference to the triggering event
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE weekly_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  week_start DATE NOT NULL,
  challenge_type VARCHAR(50) NOT NULL,
  target_value INTEGER NOT NULL,
  current_progress INTEGER DEFAULT 0,
  is_complete BOOLEAN DEFAULT FALSE,
  is_claimed BOOLEAN DEFAULT FALSE,
  xp_reward INTEGER NOT NULL,
  credit_reward INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start, challenge_type)
);

CREATE INDEX idx_daily_challenges_user_date ON daily_challenges(user_id, challenge_date);
CREATE INDEX idx_daily_challenges_expires ON daily_challenges(expires_at) WHERE NOT is_claimed;
```

### Challenge Generation Algorithm

```typescript
// Pseudocode for daily challenge generation
function generateDailyChallenges(userId: string, date: Date) {
  // Use deterministic seed so same user gets same challenges if called multiple times
  const seed = hashCode(`${userId}-${date.toISOString().split('T')[0]}`);
  const rng = seededRandom(seed);

  // Get user's recent activity to personalize
  const recentActivity = await getUserRecentActivity(userId);

  // Weight challenge types based on user behavior
  const weights = calculateChallengeWeights(recentActivity);

  // Select one challenge per difficulty
  const challenges = ['easy', 'medium', 'hard'].map(difficulty => {
    const type = weightedRandomSelect(CHALLENGE_TYPES, weights, rng);
    return {
      type: type.id,
      difficulty,
      target: type.targets[difficulty],
      xpReward: type.rewards.xp[difficulty],
      creditReward: type.rewards.credits[difficulty],
      expiresAt: getMidnight(date, 1), // Midnight next day
    };
  });

  return challenges;
}
```

### API Endpoints

```
GET    /api/challenges/daily          - Get today's challenges with progress
POST   /api/challenges/daily/claim/:id - Claim completed challenge reward
GET    /api/challenges/weekly         - Get this week's challenge
GET    /api/challenges/history        - Past challenge completions
POST   /api/challenges/progress       - Internal: Update challenge progress
```

### Frontend Integration

Challenge progress updates automatically when:
- User logs a set (increments LOG_SETS, TOTAL_VOLUME)
- User completes a workout (increments WORKOUT_STREAK, COMPLETE_WORKOUT)
- User sends a high-five (increments HIGH_FIVE_FRIENDS)
- User sets a PR (increments BEAT_PR)
- User tries new exercise (increments EXPLORE_EXERCISE)
- User earns XP (increments EARN_XP)

---

## 5. Notification & Toast System

### In-App Notifications

Types of notifications:
1. **Achievement unlocked** - Badge earned
2. **Challenge complete** - Ready to claim
3. **Streak milestone** - New record
4. **Social activity** - High-five received, crew invite
5. **Rival activity** - Rival set a PR, rival worked out
6. **Credit events** - Credits received, bonus active
7. **System** - Updates, maintenance, new features

### Toast Notifications

Quick, ephemeral notifications that appear at bottom of screen:

```typescript
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'achievement' | 'credits';
  title: string;
  message?: string;
  duration?: number; // ms, default 4000
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: string | React.ReactNode;
}
```

### Notification Bell

```
┌─────────────────────────────────────┐
│ 🔔 (3)                              │  <- Bell with badge
├─────────────────────────────────────┤
│ ✨ Achievement Unlocked!         2m │
│    You earned "Week Warrior"        │
├─────────────────────────────────────┤
│ 🖐️ High Five from @musclebro    15m │
│    "Keep crushing it!"              │
├─────────────────────────────────────┤
│ 🎯 Challenge Complete!           1h │
│    "Log 5 Sets" - Claim your reward │
└─────────────────────────────────────┘
```

### Database (Uses existing notification tables)

The notification backend already exists with:
- `notifications` table
- Category-based filtering
- Preferences per category
- Quiet hours support

### Frontend Components

```
src/components/notifications/
├── NotificationBell.tsx         - Header bell with unread badge
├── NotificationDrawer.tsx       - Slide-out notification panel
├── NotificationItem.tsx         - Individual notification row
├── NotificationPreferences.tsx  - Settings for notification types
├── ToastContainer.tsx           - Toast rendering container
├── Toast.tsx                    - Individual toast component
├── useNotifications.ts          - Hook for fetching notifications
└── useToast.ts                  - Hook for showing toasts
```

### Toast Store (Zustand)

```typescript
interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;

  // Convenience methods
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  achievement: (title: string, badgeName: string) => void;
  credits: (amount: number, reason: string) => void;
}
```

---

## 6. Daily Workout Prescription

### Concept

Every day, the user sees a personalized "Today's Workout" that:
- Is generated based on their recovery status
- Considers their schedule/availability
- Expires at midnight (creates urgency)
- Can be regenerated once per day for free

### Prescription Display

```
┌─────────────────────────────────────────┐
│  📋 TODAY'S PRESCRIPTION                │
│                                         │
│  Push Day - Upper Body Focus            │
│  ⏱️ Est. 45 minutes  |  🔥 Moderate     │
│                                         │
│  Based on your recovery (85%) and       │
│  that you haven't hit chest in 3 days.  │
│                                         │
│  Exercises:                             │
│  • Bench Press (3x8)                    │
│  • Overhead Press (3x10)                │
│  • Incline Dumbbell Press (3x12)        │
│  • Lateral Raises (3x15)                │
│  • Tricep Pushdowns (3x12)              │
│                                         │
│  [Start Workout]  [Regenerate] [Save]   │
│                                         │
│  ⏰ Expires in 8h 23m                   │
└─────────────────────────────────────────┘
```

### Smart Prescription Logic

Backend already implements (in `apps/api/src/modules/prescription/`):
- Time constraints
- Location/equipment filtering
- Muscle group targeting
- Exercise variety (penalizes recent exercises)
- Warmup/cooldown inclusion

### Enhancements Needed

1. **Recovery Integration**: Factor in sleep quality, previous workout intensity
2. **Schedule Awareness**: If user usually works out at 6pm, show prescription then
3. **Archetype Alignment**: Match prescription to user's chosen archetype
4. **Progressive Overload**: Suggest weight/rep increases based on history

### Database Schema

```sql
CREATE TABLE daily_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  prescription_date DATE NOT NULL,
  prescription_data JSONB NOT NULL, -- Full workout details
  generation_count INTEGER DEFAULT 1,
  was_completed BOOLEAN DEFAULT FALSE,
  was_started BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, prescription_date)
);

CREATE INDEX idx_daily_prescriptions_user_date ON daily_prescriptions(user_id, prescription_date);
```

### API Endpoints

```
GET    /api/prescription/today        - Get today's prescription
POST   /api/prescription/regenerate   - Generate new prescription (1/day free)
POST   /api/prescription/start        - Mark prescription as started
POST   /api/prescription/complete     - Mark prescription as completed
GET    /api/prescription/history      - Past prescriptions and completion rate
```

### Frontend Components

```
src/components/prescription/
├── TodaysPrescription.tsx      - Main prescription card
├── PrescriptionExerciseList.tsx - Exercise list with details
├── PrescriptionTimer.tsx        - Countdown to expiration
├── PrescriptionHistory.tsx      - Past prescriptions
├── usePrescription.ts          - Hook for prescription data
└── PrescriptionSettings.tsx    - Preferences (time, equipment, etc.)
```

---

## 7. Social Engagement Triggers

### Rival Activity Notifications

When your rival does something, you get notified:
- Rival completed a workout
- Rival set a new PR
- Rival passed you on leaderboard
- Rival's streak is longer than yours

### Crew Activity

- Crew member worked out (optional, daily digest)
- Crew challenge progress
- Crew leaderboard changes
- New crew member joined

### High-Five Prompts

After viewing someone's workout/achievement:
```
┌─────────────────────────────────────┐
│  @musclebro just hit a 315lb squat! │
│                                     │
│  [🖐️ High Five]  [🔥 Fire]  [👏]   │
└─────────────────────────────────────┘
```

### Activity Feed Engagement

Real-time feed showing:
- Friends' workouts
- PR celebrations
- Achievement unlocks
- Challenge completions

### Database Schema

```sql
CREATE TABLE social_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_user_id UUID NOT NULL REFERENCES users(id), -- Who triggered
  target_user_id UUID NOT NULL REFERENCES users(id), -- Who should be notified
  trigger_type VARCHAR(50) NOT NULL, -- 'rival_workout', 'rival_pr', 'crew_workout', etc.
  trigger_data JSONB NOT NULL,
  is_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_social_triggers_target ON social_triggers(target_user_id, is_notified);
```

### API Endpoints

```
GET    /api/social/feed              - Activity feed
POST   /api/social/react             - React to activity (high-five, etc.)
GET    /api/social/rival-activity    - Rival's recent activity
GET    /api/social/crew-activity     - Crew's recent activity
```

---

## 8. Time-Limited Events

### Event Types

| Event Type | Duration | Example |
|------------|----------|---------|
| **Flash Sale** | 2-4 hours | 50% off mystery boxes |
| **Double Credits** | 24-48 hours | 2x credits for workouts |
| **Challenge Bonus** | 1 week | 1.5x challenge rewards |
| **Seasonal Event** | 2-4 weeks | Halloween workout challenge |
| **Community Goal** | Variable | Collective 1M reps goal |

### Event Display

```
┌─────────────────────────────────────────┐
│  🎉 ACTIVE EVENT                        │
│                                         │
│  DOUBLE CREDIT WEEKEND                  │
│  Earn 2x credits for every workout!     │
│                                         │
│  ⏰ Ends in 18h 42m                     │
│                                         │
│  Your bonus earnings: +1,234 credits    │
└─────────────────────────────────────────┘
```

### Database Schema

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  config JSONB NOT NULL, -- Event-specific configuration
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  user_id UUID NOT NULL REFERENCES users(id),
  progress JSONB DEFAULT '{}',
  rewards_claimed JSONB DEFAULT '{}',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_events_active ON events(starts_at, ends_at) WHERE is_active;
CREATE INDEX idx_event_participation_user ON event_participation(user_id);
```

### Credit Multiplier Logic

```typescript
// In credit.service.ts
async function getEffectiveCredits(baseCredits: number, userId: string): Promise<number> {
  const activeEvents = await getActiveEvents();
  let multiplier = 1.0;

  for (const event of activeEvents) {
    if (event.config.creditMultiplier) {
      multiplier *= event.config.creditMultiplier;
    }
  }

  return Math.floor(baseCredits * multiplier);
}
```

### API Endpoints

```
GET    /api/events/active            - Get currently active events
GET    /api/events/:id               - Get event details
POST   /api/events/:id/join          - Join an event
GET    /api/events/:id/progress      - Get user's event progress
GET    /api/events/history           - Past events user participated in
```

---

## 9. Recovery & Rest Day Engagement

### Problem

Users don't open the app on rest days, breaking habits.

### Solution: Recovery Score

Show users their recovery status even on rest days:

```
┌─────────────────────────────────────────┐
│  😴 REST DAY - RECOVERY MODE            │
│                                         │
│  Your muscles are recovering...         │
│                                         │
│  RECOVERY SCORE: 78%                    │
│  ████████████████░░░░░░░░░░             │
│                                         │
│  🦵 Quads: 95% recovered                │
│  💪 Chest: 72% recovered (trained 2d)   │
│  🔙 Back: 85% recovered                 │
│                                         │
│  📈 Optimal training window: Tomorrow   │
│                                         │
│  Today's Tip: Foam rolling can          │
│  accelerate recovery by 15%             │
│                                         │
│  [Log Sleep] [Log Nutrition] [Stretch]  │
└─────────────────────────────────────────┘
```

### Rest Day Activities

Things users can do on rest days (earning credits):
- Log sleep quality (+5 credits)
- Log nutrition (+5 credits)
- Complete mobility routine (+10 credits)
- Read educational content (+3 credits)
- Set goals for next workout (+5 credits)
- Review progress/stats (+2 credits)

### Database Schema

```sql
CREATE TABLE recovery_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  score_date DATE NOT NULL,
  overall_score INTEGER NOT NULL, -- 0-100
  muscle_scores JSONB NOT NULL, -- { "chest": 72, "back": 85, ... }
  factors JSONB NOT NULL, -- { "sleep": 80, "nutrition": 75, ... }
  recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, score_date)
);

CREATE TABLE rest_day_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  activity_date DATE NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  credits_earned INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 10. Push Notification Strategy

### Notification Types & Timing

| Type | Trigger | Timing | Frequency |
|------|---------|--------|-----------|
| **Streak at risk** | No activity by 8pm | 8pm local | Daily if applicable |
| **Challenge expiring** | Unclaimed challenge, 2h left | 2h before midnight | Once per challenge |
| **Rival activity** | Rival completed workout | Immediate | Max 3/day |
| **Daily reward ready** | New day started | 9am local | Daily |
| **Event starting** | New event begins | Event start | Per event |
| **Workout reminder** | User's usual workout time | User's schedule | Max 1/day |
| **Weekly digest** | Week summary | Sunday 10am | Weekly |

### Smart Notification Logic

```typescript
// Don't spam users
const notificationRules = {
  maxPerHour: 2,
  maxPerDay: 8,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  minIntervalMinutes: 30,

  // Priority queue: higher priority can interrupt
  priorities: {
    streak_at_risk: 10,
    challenge_expiring: 8,
    rival_activity: 5,
    daily_reward: 6,
    event_starting: 7,
    workout_reminder: 4,
    weekly_digest: 3,
  }
};
```

### Re-engagement Campaigns

For users who haven't opened app in X days:

| Days Inactive | Notification |
|---------------|--------------|
| 1 day | "Your streak is at risk! Open now to keep it alive." |
| 3 days | "Your crew misses you! @friend worked out today." |
| 7 days | "Come back! Here's 100 bonus credits waiting for you." |
| 14 days | "We saved your progress. Your 23-day streak record is still there!" |
| 30 days | "It's never too late. Start fresh with 500 bonus credits." |

### Database Schema

```sql
CREATE TABLE push_notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL, -- 'ios', 'android', 'web'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id, token)
);

CREATE TABLE notification_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  notification_type VARCHAR(50) NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_schedule_pending ON notification_schedule(scheduled_for)
  WHERE NOT is_sent;
```

---

## 11. Database Schema (Complete Migration)

### Migration: 115_engagement_system.ts

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ========================================
  // LOGIN STREAKS & DAILY REWARDS
  // ========================================

  await knex.schema.createTable('login_streaks', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
    table.integer('current_streak').defaultTo(0);
    table.integer('longest_streak').defaultTo(0);
    table.date('last_login_date');
    table.integer('streak_freezes_owned').defaultTo(0);
    table.integer('total_logins').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('daily_login_rewards', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('login_date').notNullable();
    table.integer('day_number').notNullable();
    table.integer('credits_awarded').notNullable();
    table.integer('xp_awarded').notNullable();
    table.uuid('mystery_box_id').references('id').inTable('mystery_boxes');
    table.boolean('streak_freeze_used').defaultTo(false);
    table.timestamp('claimed_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'login_date']);
  });

  // ========================================
  // UNIFIED STREAK SYSTEM
  // ========================================

  await knex.schema.createTable('user_streaks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('streak_type', 50).notNullable();
    table.integer('current_streak').defaultTo(0);
    table.integer('longest_streak').defaultTo(0);
    table.date('last_activity_date');
    table.jsonb('milestone_claimed').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'streak_type']);
  });

  await knex.schema.createTable('streak_milestones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('streak_type', 50).notNullable();
    table.integer('milestone_days').notNullable();
    table.integer('credits_awarded').notNullable();
    table.integer('xp_awarded').notNullable();
    table.uuid('badge_id').references('id').inTable('badges');
    table.timestamp('claimed_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'streak_type', 'milestone_days']);
  });

  // ========================================
  // DAILY CHALLENGES
  // ========================================

  await knex.schema.createTable('daily_challenges', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('challenge_date').notNullable();
    table.string('challenge_type', 50).notNullable();
    table.string('difficulty', 20).notNullable();
    table.integer('target_value').notNullable();
    table.integer('current_progress').defaultTo(0);
    table.boolean('is_complete').defaultTo(false);
    table.boolean('is_claimed').defaultTo(false);
    table.integer('xp_reward').notNullable();
    table.integer('credit_reward').notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('claimed_at');
    table.unique(['user_id', 'challenge_date', 'challenge_type']);
  });

  await knex.schema.createTable('weekly_challenges', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('week_start').notNullable();
    table.string('challenge_type', 50).notNullable();
    table.integer('target_value').notNullable();
    table.integer('current_progress').defaultTo(0);
    table.boolean('is_complete').defaultTo(false);
    table.boolean('is_claimed').defaultTo(false);
    table.integer('xp_reward').notNullable();
    table.integer('credit_reward').notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'week_start', 'challenge_type']);
  });

  // ========================================
  // DAILY PRESCRIPTIONS
  // ========================================

  await knex.schema.createTable('daily_prescriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('prescription_date').notNullable();
    table.jsonb('prescription_data').notNullable();
    table.integer('generation_count').defaultTo(1);
    table.boolean('was_completed').defaultTo(false);
    table.boolean('was_started').defaultTo(false);
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.unique(['user_id', 'prescription_date']);
  });

  // ========================================
  // EVENTS SYSTEM
  // ========================================

  await knex.schema.createTable('events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('event_type', 50).notNullable();
    table.string('name', 100).notNullable();
    table.text('description');
    table.jsonb('config').notNullable();
    table.timestamp('starts_at').notNullable();
    table.timestamp('ends_at').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('event_participation', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.jsonb('progress').defaultTo('{}');
    table.jsonb('rewards_claimed').defaultTo('{}');
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.unique(['event_id', 'user_id']);
  });

  // ========================================
  // RECOVERY TRACKING
  // ========================================

  await knex.schema.createTable('recovery_scores', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('score_date').notNullable();
    table.integer('overall_score').notNullable();
    table.jsonb('muscle_scores').notNullable();
    table.jsonb('factors').notNullable();
    table.text('recommendation');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'score_date']);
  });

  // ========================================
  // PUSH NOTIFICATIONS
  // ========================================

  await knex.schema.createTable('push_notification_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('token').notNullable();
    table.string('platform', 20).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_used_at');
    table.unique(['user_id', 'token']);
  });

  await knex.schema.createTable('notification_schedule', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('notification_type', 50).notNullable();
    table.timestamp('scheduled_for').notNullable();
    table.jsonb('payload').notNullable();
    table.boolean('is_sent').defaultTo(false);
    table.timestamp('sent_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ========================================
  // INDEXES
  // ========================================

  await knex.raw(`CREATE INDEX idx_login_streaks_last_login ON login_streaks(last_login_date)`);
  await knex.raw(`CREATE INDEX idx_user_streaks_user ON user_streaks(user_id)`);
  await knex.raw(`CREATE INDEX idx_user_streaks_type ON user_streaks(streak_type)`);
  await knex.raw(`CREATE INDEX idx_daily_challenges_user_date ON daily_challenges(user_id, challenge_date)`);
  await knex.raw(`CREATE INDEX idx_daily_challenges_expires ON daily_challenges(expires_at) WHERE NOT is_claimed`);
  await knex.raw(`CREATE INDEX idx_daily_prescriptions_user_date ON daily_prescriptions(user_id, prescription_date)`);
  await knex.raw(`CREATE INDEX idx_events_active ON events(starts_at, ends_at) WHERE is_active`);
  await knex.raw(`CREATE INDEX idx_event_participation_user ON event_participation(user_id)`);
  await knex.raw(`CREATE INDEX idx_notification_schedule_pending ON notification_schedule(scheduled_for) WHERE NOT is_sent`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_schedule');
  await knex.schema.dropTableIfExists('push_notification_tokens');
  await knex.schema.dropTableIfExists('recovery_scores');
  await knex.schema.dropTableIfExists('event_participation');
  await knex.schema.dropTableIfExists('events');
  await knex.schema.dropTableIfExists('daily_prescriptions');
  await knex.schema.dropTableIfExists('weekly_challenges');
  await knex.schema.dropTableIfExists('daily_challenges');
  await knex.schema.dropTableIfExists('streak_milestones');
  await knex.schema.dropTableIfExists('user_streaks');
  await knex.schema.dropTableIfExists('daily_login_rewards');
  await knex.schema.dropTableIfExists('login_streaks');
}
```

---

## 12. API Routes

### New Route Files

```
apps/api/src/http/routes/
├── daily-login.ts        - Daily login rewards
├── streaks.ts            - Streak tracking & milestones
├── challenges.ts         - Daily/weekly challenges
├── daily-prescription.ts - Today's workout prescription
├── events.ts             - Time-limited events
├── recovery.ts           - Recovery scores & rest day
└── push-notifications.ts - Push notification tokens
```

### Route Registration

```typescript
// In apps/api/src/http/server.ts
import { registerDailyLoginRoutes } from './routes/daily-login';
import { registerStreakRoutes } from './routes/streaks';
import { registerChallengeRoutes } from './routes/challenges';
import { registerDailyPrescriptionRoutes } from './routes/daily-prescription';
import { registerEventRoutes } from './routes/events';
import { registerRecoveryRoutes } from './routes/recovery';
import { registerPushNotificationRoutes } from './routes/push-notifications';

// In plugin registration
await registerDailyLoginRoutes(app);
await registerStreakRoutes(app);
await registerChallengeRoutes(app);
await registerDailyPrescriptionRoutes(app);
await registerEventRoutes(app);
await registerRecoveryRoutes(app);
await registerPushNotificationRoutes(app);
```

### Complete API Reference

```yaml
# Daily Login
POST   /api/daily-login/claim           # Claim today's reward
GET    /api/daily-login/status          # Current streak & today's reward
GET    /api/daily-login/calendar        # Last 30 days login history
POST   /api/daily-login/use-freeze      # Use a streak freeze
GET    /api/daily-login/rewards         # Reward schedule preview

# Streaks
GET    /api/streaks                     # All user streaks
GET    /api/streaks/:type               # Specific streak type
POST   /api/streaks/:type/record        # Record activity
POST   /api/streaks/:type/claim         # Claim milestone reward
GET    /api/streaks/leaderboard         # Top streaks this week

# Challenges
GET    /api/challenges/daily            # Today's challenges with progress
POST   /api/challenges/daily/claim/:id  # Claim completed challenge
GET    /api/challenges/weekly           # This week's challenge
GET    /api/challenges/history          # Past completions

# Prescription
GET    /api/prescription/today          # Today's prescription
POST   /api/prescription/regenerate     # Generate new (1/day free)
POST   /api/prescription/start          # Mark as started
POST   /api/prescription/complete       # Mark as completed
GET    /api/prescription/history        # Past prescriptions

# Events
GET    /api/events/active               # Currently active events
GET    /api/events/:id                  # Event details
POST   /api/events/:id/join             # Join an event
GET    /api/events/:id/progress         # User's event progress
GET    /api/events/history              # Past events

# Recovery
GET    /api/recovery/today              # Today's recovery score
GET    /api/recovery/muscles            # Per-muscle recovery status
POST   /api/recovery/log-activity       # Log rest day activity
GET    /api/recovery/history            # Recovery score history

# Push Notifications
POST   /api/push/register               # Register push token
DELETE /api/push/unregister             # Unregister token
PUT    /api/push/preferences            # Update push preferences
```

---

## 13. Frontend Components

### Component Directory Structure

```
src/components/engagement/
├── daily-login/
│   ├── DailyLoginModal.tsx         # Full-screen reward claim
│   ├── LoginStreakBadge.tsx        # Header streak display
│   ├── LoginCalendar.tsx           # 30-day calendar
│   ├── RewardPreview.tsx           # Upcoming rewards
│   ├── StreakFreezeButton.tsx      # Use/buy freeze
│   └── useDailyLogin.ts            # Data hook
│
├── streaks/
│   ├── StreakCard.tsx              # Individual streak display
│   ├── StreakFlame.tsx             # Animated flame (existing)
│   ├── StreakMilestone.tsx         # Milestone achievement
│   ├── StreakLeaderboard.tsx       # Top streaks
│   └── useStreaks.ts               # Data hook
│
├── challenges/
│   ├── DailyChallenges.tsx         # Challenge list container
│   ├── ChallengeCard.tsx           # Individual challenge (existing)
│   ├── ChallengeTimer.tsx          # Time remaining (existing)
│   ├── WeeklyChallenge.tsx         # Weekly challenge card
│   └── useChallenges.ts            # Data hook
│
├── prescription/
│   ├── TodaysPrescription.tsx      # Main prescription card
│   ├── PrescriptionExerciseList.tsx # Exercise details
│   ├── PrescriptionTimer.tsx       # Expiration countdown
│   └── usePrescription.ts          # Data hook
│
├── notifications/
│   ├── NotificationBell.tsx        # Header bell with badge
│   ├── NotificationDrawer.tsx      # Slide-out panel
│   ├── NotificationItem.tsx        # Individual notification
│   ├── ToastContainer.tsx          # Toast rendering
│   ├── Toast.tsx                   # Individual toast
│   └── useNotifications.ts         # Data hook
│
├── events/
│   ├── ActiveEventBanner.tsx       # Event announcement
│   ├── EventCard.tsx               # Event details
│   ├── EventProgress.tsx           # User's event progress
│   └── useEvents.ts                # Data hook
│
├── recovery/
│   ├── RecoveryDashboard.tsx       # Recovery score display
│   ├── MuscleRecoveryMap.tsx       # Per-muscle recovery
│   ├── RestDayActivities.tsx       # Rest day engagement
│   └── useRecovery.ts              # Data hook
│
└── index.ts                        # Central exports
```

### Zustand Store Additions

```typescript
// src/store/engagementStore.ts

interface EngagementState {
  // Daily Login
  loginStreak: number;
  longestStreak: number;
  todayRewardClaimed: boolean;
  streakFreezesOwned: number;

  // Challenges
  dailyChallenges: Challenge[];
  weeklyChallenge: Challenge | null;
  challengesLoading: boolean;

  // Prescription
  todaysPrescription: Prescription | null;
  prescriptionLoading: boolean;

  // Events
  activeEvents: Event[];

  // Recovery
  recoveryScore: number;
  muscleRecovery: Record<string, number>;

  // Actions
  claimDailyReward: () => Promise<void>;
  useStreakFreeze: () => Promise<void>;
  updateChallengeProgress: (challengeId: string, progress: number) => void;
  claimChallenge: (challengeId: string) => Promise<void>;
  startPrescription: () => Promise<void>;
  completePrescription: () => Promise<void>;
  regeneratePrescription: () => Promise<void>;
}
```

---

## 14. Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Priority: Critical**

- [ ] Database migration for all engagement tables
- [ ] Daily login reward API routes
- [ ] Streak tracking API routes
- [ ] DailyLoginModal component
- [ ] LoginStreakBadge component
- [ ] Basic notification bell UI
- [ ] Toast notification system

**Deliverables:**
- Users can claim daily rewards
- Users can see their streak
- Basic toast notifications work

### Phase 2: Challenges (Week 3-4)
**Priority: High**

- [ ] Challenge generation service
- [ ] Challenge progress tracking
- [ ] Challenge API routes
- [ ] Connect existing challenge UI to backend
- [ ] Weekly challenge system
- [ ] Challenge progress auto-update on workout events

**Deliverables:**
- Daily challenges functional end-to-end
- Progress updates automatically
- Users can claim challenge rewards

### Phase 3: Prescription & Recovery (Week 5-6)
**Priority: High**

- [ ] Daily prescription API (enhance existing)
- [ ] Prescription UI components
- [ ] Recovery score calculation
- [ ] Recovery dashboard
- [ ] Rest day activity tracking

**Deliverables:**
- Users see "Today's Workout"
- Users see recovery status on rest days
- Rest day engagement options

### Phase 4: Events & Social (Week 7-8)
**Priority: Medium**

- [ ] Events system backend
- [ ] Event UI components
- [ ] Credit multiplier integration
- [ ] Social trigger notifications
- [ ] Rival activity notifications
- [ ] Activity feed enhancements

**Deliverables:**
- Time-limited events functional
- Credit multipliers work during events
- Social notifications appear

### Phase 5: Push Notifications (Week 9-10)
**Priority: Medium**

- [ ] Push notification token registration
- [ ] Notification scheduling system
- [ ] Streak-at-risk notifications
- [ ] Challenge expiring notifications
- [ ] Re-engagement campaigns
- [ ] Web push support

**Deliverables:**
- Push notifications work on mobile
- Smart notification timing
- Re-engagement automation

### Phase 6: Polish & Optimization (Week 11-12)
**Priority: Low**

- [ ] Animation polish
- [ ] Performance optimization
- [ ] A/B testing setup
- [ ] Analytics integration
- [ ] Edge case handling
- [ ] Documentation

**Deliverables:**
- Polished user experience
- Analytics tracking engagement
- System fully documented

---

## 15. Success Metrics

### Key Performance Indicators

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **DAU/MAU Ratio** | ~15% | 40% | Daily active / monthly active |
| **D1 Retention** | ~30% | 50% | Users returning day after signup |
| **D7 Retention** | ~15% | 35% | Users returning 7 days after signup |
| **D30 Retention** | ~8% | 25% | Users returning 30 days after signup |
| **Avg Session Length** | 3min | 8min | Time in app per session |
| **Sessions/Week** | 2.1 | 5.0 | App opens per user per week |
| **Challenge Completion** | N/A | 60% | Challenges completed vs assigned |
| **Prescription Adherence** | N/A | 40% | Prescriptions started |

### Tracking Implementation

```typescript
// Analytics events to track
const engagementEvents = {
  // Daily Login
  'daily_login.claimed': { day_number, credits, xp },
  'daily_login.streak_broken': { previous_streak },
  'daily_login.freeze_used': { streak_saved },

  // Challenges
  'challenge.assigned': { challenge_type, difficulty },
  'challenge.progress': { challenge_id, progress, target },
  'challenge.completed': { challenge_id, time_to_complete },
  'challenge.claimed': { challenge_id, credits, xp },
  'challenge.expired': { challenge_id, progress, target },

  // Prescription
  'prescription.generated': { workout_type, exercise_count },
  'prescription.started': { prescription_id },
  'prescription.completed': { prescription_id, duration },
  'prescription.regenerated': { reason },

  // Streaks
  'streak.milestone': { streak_type, days, reward },
  'streak.extended': { streak_type, new_length },
  'streak.broken': { streak_type, previous_length },

  // Events
  'event.joined': { event_id, event_type },
  'event.progress': { event_id, progress },
  'event.completed': { event_id, rewards },

  // Notifications
  'notification.sent': { type, channel },
  'notification.opened': { type, time_to_open },
  'notification.dismissed': { type },
};
```

### A/B Testing Opportunities

1. **Reward Amounts**: Test different credit/XP values
2. **Streak Freeze Cost**: 200 vs 250 vs 300 credits
3. **Challenge Difficulty**: Easier vs harder targets
4. **Notification Timing**: Different times of day
5. **Mystery Box Frequency**: Every 7 vs 5 days
6. **Event Duration**: 24h vs 48h vs 72h

---

## Appendix A: Behavioral Psychology Principles

### Loss Aversion
- Streaks create fear of losing progress
- "Don't lose your 23-day streak!"
- Streak freeze as insurance purchase

### Variable Rewards
- Mystery boxes have random rewards
- Challenge types vary daily
- Event rewards are unpredictable

### Social Proof
- "23 of your friends worked out today"
- Leaderboards show community activity
- Rival comparison drives competition

### Commitment/Consistency
- Small daily actions build habit
- Streak investment increases commitment
- Archetype choice creates identity

### Urgency/Scarcity
- Challenges expire at midnight
- Events have limited duration
- Daily rewards can't be claimed late

### Progress & Mastery
- Visual progress bars everywhere
- Milestone celebrations
- Character progression (levels, XP)

---

## Appendix B: Competitor Analysis

| Feature | MuscleMap | Strong | Hevy | Duolingo | Strava |
|---------|-----------|--------|------|----------|--------|
| Daily Login Reward | Planned | No | No | Yes | No |
| Streaks | Planned | No | No | Yes | Yes |
| Daily Challenges | Planned | No | No | Yes | Yes |
| Mystery Boxes | Yes | No | No | Yes | No |
| Credit Economy | Yes | No | No | Yes | No |
| Social Feed | Yes | No | Yes | Yes | Yes |
| Push Notifications | Planned | Yes | Yes | Yes | Yes |
| Events | Planned | No | No | Yes | Yes |
| Recovery Score | Planned | No | No | No | Yes |

---

## Appendix C: Technical Dependencies

### Required Services
- PostgreSQL (primary database)
- Redis (caching, rate limiting)
- Push notification service (Firebase/OneSignal)
- Cron scheduler (node-cron or external)

### Package Dependencies
```json
{
  "node-cron": "^3.0.0",
  "firebase-admin": "^11.0.0",
  "date-fns": "^2.30.0",
  "date-fns-tz": "^2.0.0"
}
```

### Cron Jobs Required
```
# Midnight - Generate daily challenges
0 0 * * * node scripts/generate-daily-challenges.js

# Hourly - Send scheduled notifications
0 * * * * node scripts/send-scheduled-notifications.js

# Daily - Calculate recovery scores
0 6 * * * node scripts/calculate-recovery-scores.js

# Weekly - Send digest emails
0 10 * * 0 node scripts/send-weekly-digests.js
```

---

*Document Version: 1.0*
*Last Updated: 2026-01-16*
*Author: Claude Code*
