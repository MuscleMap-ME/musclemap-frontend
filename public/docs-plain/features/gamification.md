# Gamification System

> Level up your fitness journey with RPG-style progression.

---

## Overview

MuscleMap transforms fitness into an engaging game with:

```
+--------------------------------------------------+
|              GAMIFICATION PILLARS                 |
+--------------------------------------------------+
|                                                  |
|   +--------+  +--------+  +--------+  +--------+ |
|   |  XP &  |  | ACHIEV |  | CHAR   |  | SOCIAL | |
|   | LEVELS |  | EMENTS |  | STATS  |  | COMPS  | |
|   +--------+  +--------+  +--------+  +--------+ |
|       |           |           |           |      |
|   Progress    Milestones   Build      Compete    |
|   through     to chase     your       with       |
|   training    and earn     character  others     |
|                                                  |
+--------------------------------------------------+
```

---

## XP & Leveling System

### Earning XP (Training Units)

Every workout earns Training Units (TU), which serve as XP:

```
TU Calculation:
+------------------+------------------+
| Factor           | Contribution     |
+------------------+------------------+
| Muscle size      | Base TU value    |
| Exercise type    | Multiplier       |
| Activation %     | Intensity bonus  |
| Volume (sets)    | Cumulative       |
+------------------+------------------+
```

### Level Progression

```
Level Requirements:

Level 1    [====                ] 0 TU
Level 5    [========            ] 500 TU
Level 10   [============        ] 2,000 TU
Level 15   [==============      ] 5,000 TU
Level 20   [================    ] 10,000 TU
Level 25   [==================  ] 20,000 TU
Level 30   [====================] 35,000 TU
Level 40+  [====================] 75,000+ TU
```

### Level Titles by Archetype

Each archetype has unique level titles:

| Level | Bodybuilder | Powerlifter | Athlete |
|-------|-------------|-------------|---------|
| 1-5 | Novice Sculptor | Novice Lifter | Rookie |
| 6-10 | Intermediate Builder | Intermediate Puller | Competitor |
| 11-20 | Advanced Artist | Strength Athlete | Varsity |
| 21-30 | Elite Bodybuilder | Elite Powerlifter | Elite Athlete |
| 31+ | Master of Aesthetics | Strength Master | Legend |

---

## Character Stats

Your character has RPG-style stats that grow with training:

```
CHARACTER STATS DISPLAY
=======================

STRENGTH      ████████████████░░░░  82
ENDURANCE     ██████████████░░░░░░  71
POWER         ███████████████░░░░░  76
FLEXIBILITY   ██████████░░░░░░░░░░  54
BALANCE       ████████████░░░░░░░░  63
COORDINATION  █████████████░░░░░░░  67

Overall Rating: B+
```

### How Stats Grow

| Stat | Training That Increases It |
|------|---------------------------|
| Strength | Heavy compound lifts |
| Endurance | High rep, circuit training |
| Power | Explosive movements, plyometrics |
| Flexibility | Full ROM exercises, stretching |
| Balance | Unilateral exercises, stability work |
| Coordination | Complex movements, skills |

### Stat Calculations

Stats are calculated from your workout history:

```
Strength = f(max loads, compound frequency)
Endurance = f(total volume, workout duration)
Power = f(explosive exercises, power metrics)
Flexibility = f(ROM scores, mobility work)
Balance = f(unilateral exercises, stability)
Coordination = f(skill exercises, complexity)
```

---

## Achievements

### Achievement Categories

```
+------------------+----------------------------------+
| Category         | Examples                         |
+------------------+----------------------------------+
| Volume           | 1K TU, 10K TU, 100K TU          |
| Consistency      | 7-day streak, 30-day streak     |
| Strength         | 1x BW bench, 2x BW squat        |
| Variety          | 100 exercises, all muscle groups|
| Social           | Join crew, win rivalry          |
| Special          | First workout, holiday workouts |
+------------------+----------------------------------+
```

### Achievement Tiers

```
Achievement Rarity:

COMMON       ●○○○○  Easy to obtain, many unlock
UNCOMMON     ●●○○○  Some effort required
RARE         ●●●○○  Dedicated training needed
EPIC         ●●●●○  Significant milestones
LEGENDARY    ●●●●●  Elite accomplishments
```

### Sample Achievements

```
+---------------------------------------------------+
| IRON FOUNDATION                    [COMMON]       |
| Complete your first workout                       |
| Reward: 10 Credits                                |
+---------------------------------------------------+

+---------------------------------------------------+
| CENTURY CLUB                       [RARE]         |
| Log 100 workouts                                  |
| Reward: Century Badge, 100 Credits                |
+---------------------------------------------------+

+---------------------------------------------------+
| THOUSAND POUND CLUB                [EPIC]         |
| Total 1000+ lbs across Squat, Bench, Deadlift    |
| Reward: Exclusive Title, 500 Credits              |
+---------------------------------------------------+

+---------------------------------------------------+
| YEAR OF IRON                       [LEGENDARY]    |
| 365-day workout streak                            |
| Reward: Legendary Avatar Frame, 1000 Credits      |
+---------------------------------------------------+
```

---

## Streaks

### Streak Types

```
Workout Streak:  Consecutive days with workouts
Weekly Streak:   Consecutive weeks hitting goal
Monthly Streak:  Consecutive months active
```

### Streak Rewards

```
Streak Milestones:

7 days   → "Week Warrior" badge
14 days  → 25 bonus credits
30 days  → "Monthly Master" badge
60 days  → Exclusive avatar frame
90 days  → "Quarter Champion" badge
180 days → Legendary status symbol
365 days → "Year of Iron" legendary achievement
```

### Streak Protection

- **Rest Days**: One rest day per 7 doesn't break streak
- **Streak Freeze**: Use credits to freeze (limited)
- **Grace Period**: 36 hours before streak breaks

---

## Leaderboards

### Leaderboard Types

```
Global Leaderboards:
├── All-Time TU
├── Weekly TU
├── Monthly TU
└── Streak Length

Filtered Leaderboards:
├── By Archetype
├── By Age Group
├── By Weight Class
├── By Region
└── By Crew
```

### Leaderboard Display

```
WEEKLY TU LEADERBOARD
=====================
Rank  User           TU      Change
----------------------------------
  1.  @ironking     2,847    +2
  2.  @liftheavy    2,691    -1
  3.  @gymrat99     2,543    NEW
  ...
 47.  @you          1,234    +12
```

### Fair Competition

MuscleMap ensures fair leaderboards:
- TU calculations are standardized
- Suspicious activity is flagged
- Verified PRs only
- Optional filters for fair comparison

---

## Rivalries

### Starting a Rivalry

1. Visit another user's profile
2. Tap **Challenge**
3. Set parameters:
   - Duration (1 week, 2 weeks, 1 month)
   - Metric (TU, workouts, specific lift)
   - Stakes (bragging rights or credit wager)
4. They accept or decline

### Rivalry Display

```
ACTIVE RIVALRY
==============
You vs @competitor
Duration: 7 days remaining
Metric: Total TU

Your TU:    ████████████████░░░░  847
Their TU:   ██████████████░░░░░░  721

Status: WINNING (+126 TU)
```

### Rivalry Rewards

- Winner gets bragging rights
- Winner receives credit stake (if wagered)
- Both get rivalry participation badge
- Winner gets profile badge for duration

---

## Crews

### What Are Crews?

Crews are teams of 3-50 users who train together:

```
CREW FEATURES
=============
├── Shared leaderboard
├── Crew chat
├── Team challenges
├── Combined TU goals
├── Crew vs Crew wars
└── Shared achievements
```

### Crew Roles

| Role | Permissions |
|------|-------------|
| **Captain** | Full control, set goals, manage members |
| **Officer** | Invite/remove members, manage chat |
| **Member** | Participate, chat, compete |

### Creating a Crew

Requirements:
- Level 4 or higher
- 50 credits (one-time fee)
- Unique crew name

---

## Competitions

### Competition Types

```
1. SPOT CHALLENGES
   - Single workout competitions
   - Example: Most TU in one session

2. DURATION CHALLENGES
   - Multi-day competitions
   - Example: Most TU in 7 days

3. SKILL CHALLENGES
   - Specific exercise focus
   - Example: Heaviest squat

4. COMMUNITY EVENTS
   - Site-wide competitions
   - Example: Holiday challenges
```

### Joining Competitions

1. Go to **Community → Competitions**
2. Browse available competitions
3. Tap **Join** (may require entry fee)
4. Compete during the window
5. Prizes awarded automatically

---

## Rewards Summary

```
REWARD TYPES
============

CREDITS        Can be earned, spent on workouts
BADGES         Display on profile permanently
TITLES         Shown with your username
AVATAR FRAMES  Visual enhancement for profile
ACHIEVEMENTS   Tracked in your trophy case
LEADERBOARD    Rank and bragging rights
```

---

## Privacy & Opt-Out

Don't want to compete? Enable **Minimalist Mode**:

- No leaderboard appearance
- No public stats
- No rivalry invitations
- Still earn personal XP/achievements

Settings → Privacy → Enable Minimalist Mode

---

## FAQ

### How do I catch up to higher-level players?

Focus on consistency, not comparison. Your level reflects YOUR progress. New players can't "lose" - you always progress.

### Can I reset my stats?

Changing archetypes resets your level but keeps total TU history. Full stat reset is not available.

### Do streaks count rest days?

One rest day per 7 is built in. You can also use streak freezes.

### Are leaderboards fair?

Yes. TU calculations are standardized and account for muscle size, so different body parts earn proportional credit.

---

*Last updated: 2026-01-15*
