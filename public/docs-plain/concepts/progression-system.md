# Progression System

> How leveling, stats, and advancement work in MuscleMap.

---

## Overview

MuscleMap's progression system gamifies your fitness journey with:

```
PROGRESSION PILLARS
===================

   LEVELS        STATS         ACHIEVEMENTS
   ------        -----         ------------
   1-50+         6 attributes  200+ badges
   Archetype     RPG-style     Milestones
   titles        growth        Rewards
```

---

## Leveling System

### How Levels Work

Your level is determined by total Training Units (TU) earned:

```
LEVEL PROGRESSION
=================

Level    Total TU Required    TU to Next
-----    -----------------    ----------
1        0                    100
5        500                  200
10       2,000                500
15       5,000                1,000
20       10,000               2,000
25       20,000               3,000
30       35,000               5,000
40       75,000               10,000
50       150,000              15,000
```

### Level Curve

```
TU REQUIRED PER LEVEL
=====================

TU
150k │                                    ●
     │                               ●
100k │                          ●
     │                     ●
75k  │                ●
     │           ●
50k  │      ●
     │ ●
0    └──────────────────────────────────────
     1    10    20    30    40    50    Level

Each level requires increasingly more TU.
This prevents rapid early advancement and
rewards long-term consistency.
```

### Level Titles

Each archetype has unique level titles:

```
BODYBUILDER TITLES
==================
1-5:    Novice Sculptor
6-10:   Intermediate Builder
11-20:  Advanced Physique Artist
21-30:  Elite Bodybuilder
31-40:  Master of Aesthetics
41+:    Legendary Sculptor

POWERLIFTER TITLES
==================
1-5:    Novice Lifter
6-10:   Intermediate Puller
11-20:  Advanced Strength Athlete
21-30:  Elite Powerlifter
31-40:  Strength Master
41+:    Legendary Strength

ATHLETE TITLES
==============
1-5:    Rookie Athlete
6-10:   Intermediate Competitor
11-20:  Advanced Performance Athlete
21-30:  Elite Sports Performer
31-40:  Peak Performance Master
41+:    Athletic Legend
```

---

## Character Stats

### The Six Stats

```
CHARACTER STATS
===============

STRENGTH
├── Measures: Maximum force output
├── Grows from: Heavy compound lifts
└── Example exercises: Squats, Deadlifts, Presses

ENDURANCE
├── Measures: Sustained effort capacity
├── Grows from: High volume, circuits
└── Example exercises: High-rep sets, Supersets

POWER
├── Measures: Explosive force
├── Grows from: Plyometrics, Olympic lifts
└── Example exercises: Cleans, Box Jumps, Throws

FLEXIBILITY
├── Measures: Range of motion
├── Grows from: Full ROM exercises, Stretching
└── Example exercises: Deep squats, Yoga flows

BALANCE
├── Measures: Stability and control
├── Grows from: Unilateral work
└── Example exercises: Single-leg, Stability balls

COORDINATION
├── Measures: Complex movement skill
├── Grows from: Skill-based exercises
└── Example exercises: Gymnastics, Complex lifts
```

### Stat Calculation

```
STAT CALCULATION
================

Each stat ranges from 1-100

Example: Strength Calculation
├── Recent 1RM attempts (40%)
├── Heavy compound frequency (30%)
├── Weight progression (20%)
└── Consistency (10%)

Your Strength = 82
          ████████████████░░░░

This means you're in the 82nd percentile
for strength among similar-level users.
```

### Stat Display

```
YOUR STATS
==========

STRENGTH      ████████████████░░░░  82
ENDURANCE     ██████████████░░░░░░  71
POWER         ███████████████░░░░░  76
FLEXIBILITY   ██████████░░░░░░░░░░  54
BALANCE       ████████████░░░░░░░░  63
COORDINATION  █████████████░░░░░░░  67

Overall Rating: B+
Average: 68.8
```

### Stat Growth

```
HOW STATS GROW
==============

Stat improvement comes from specific training:

To increase STRENGTH:
├── Lift heavier weights
├── Focus on compound movements
├── Progressive overload
└── Train in 1-5 rep range

To increase ENDURANCE:
├── Higher rep ranges (15+)
├── Shorter rest periods
├── Circuit training
└── Longer workouts

To increase FLEXIBILITY:
├── Full range of motion
├── Include mobility work
├── Stretching post-workout
└── Yoga or flexibility-focused sessions
```

---

## Achievements

### Achievement Categories

```
ACHIEVEMENT CATEGORIES
======================

VOLUME          Cumulative TU milestones
CONSISTENCY     Streak and frequency
STRENGTH        Lift milestones
VARIETY         Exercise diversity
SOCIAL          Community engagement
ARCHETYPE       Path-specific achievements
SPECIAL         Events, challenges
SECRET          Hidden achievements
```

### Achievement Tiers

```
ACHIEVEMENT RARITY
==================

COMMON       ●○○○○    Easy to obtain
UNCOMMON     ●●○○○    Some effort
RARE         ●●●○○    Dedicated training
EPIC         ●●●●○    Significant milestone
LEGENDARY    ●●●●●    Elite accomplishment
```

### Sample Achievements

```
VOLUME ACHIEVEMENTS
===================

Iron Foundation     [COMMON]
└── Earn 100 TU total

Thousand TU Club    [UNCOMMON]
└── Earn 1,000 TU total

TU Titan           [RARE]
└── Earn 10,000 TU total

TU Master          [EPIC]
└── Earn 50,000 TU total

TU Legend          [LEGENDARY]
└── Earn 100,000 TU total


CONSISTENCY ACHIEVEMENTS
========================

Week Warrior       [COMMON]
└── 7-day workout streak

Monthly Master     [UNCOMMON]
└── 30-day workout streak

Quarter Champion   [RARE]
└── 90-day workout streak

Half-Year Hero     [EPIC]
└── 180-day workout streak

Year of Iron       [LEGENDARY]
└── 365-day workout streak


STRENGTH ACHIEVEMENTS
=====================

Plate Club         [COMMON]
└── Bench press 135 lbs (1 plate each side)

Two Plate Bench    [UNCOMMON]
└── Bench press 225 lbs

Three Plate Bench  [RARE]
└── Bench press 315 lbs

1000 lb Club       [EPIC]
└── Squat + Bench + Deadlift = 1000+ lbs
```

---

## Personal Records

### PR Tracking

```
PERSONAL RECORDS
================

PRs are tracked for:
├── Every exercise
├── Different rep ranges (1RM, 5RM, 10RM)
├── Volume PRs (most weight × reps)
└── Duration PRs (longest plank, etc.)

Example PR Card:
+---------------------------+
| BENCH PRESS               |
+---------------------------+
| 1RM:    100 kg  (Jan 10) |
| 5RM:    85 kg   (Jan 8)  |
| 10RM:   70 kg   (Dec 20) |
| Volume: 2,400 kg (Jan 5) |
+---------------------------+
```

### Estimated 1RM

```
1RM CALCULATION
===============

MuscleMap estimates 1RM using Epley formula:

1RM = weight × (1 + reps/30)

Example:
80 kg × 8 reps = 80 × (1 + 8/30)
               = 80 × 1.267
               = 101 kg estimated 1RM

Note: Estimates become less accurate
above 10 reps. Log heavy singles for
accurate 1RM tracking.
```

---

## Progression Tips

### Optimal Growth

```
PROGRESSION BEST PRACTICES
==========================

1. CONSISTENCY FIRST
   Regular training beats occasional intensity
   4 moderate workouts > 1 extreme workout

2. VARIETY FOR STATS
   Train all stats for balanced development
   Don't neglect flexibility and coordination

3. TRACK EVERYTHING
   Log all workouts for accurate progression
   PRs only count if recorded

4. QUALITY > QUANTITY
   Proper form earns full TU
   Cheating reps aren't tracked correctly

5. RECOVERY MATTERS
   Rest days allow adaptation
   Overtraining slows progression
```

### Common Mistakes

```
PROGRESSION MISTAKES
====================

❌ Chasing TU at expense of form
❌ Ignoring weak stats
❌ Skipping rest days
❌ Not tracking workouts
❌ Comparing to others too much
❌ Changing archetypes frequently

✓ Focus on personal improvement
✓ Balance all training aspects
✓ Rest and recover properly
✓ Log every workout
✓ Stay on one path long-term
```

---

## FAQ

### Can I lose levels?

No. Levels are based on total TU earned, which only increases. You cannot lose levels from inactivity.

### How do I level up faster?

- Train consistently (no long breaks)
- Focus on compound exercises (high TU)
- Track all workouts (don't miss logging)
- Choose exercises with high muscle activation

### What happens at max level?

There's no hard cap. High levels (50+) require massive TU, but you can keep growing indefinitely.

### Do stats affect workout generation?

Yes. The AI considers your stat profile when suggesting exercises, helping you develop weak areas.

### Can I reset my progression?

No full reset available. Changing archetypes resets level but keeps total TU and achievements.

---

## See Also

- [Training Units](./training-units.md)
- [Gamification](../features/gamification.md)
- [Archetypes](../features/archetypes.md)

---

*Last updated: 2026-01-15*
