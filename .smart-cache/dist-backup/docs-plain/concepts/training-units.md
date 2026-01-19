# Training Units (TU)

> Understanding MuscleMap's core metric for measuring workout volume.

---

## What Are Training Units?

Training Units (TU) is MuscleMap's proprietary metric for measuring workout volume. Unlike simple rep counting, TU provides a standardized way to compare different workouts and track progress over time.

```
TRADITIONAL VOLUME        TU VOLUME
==================        =========

Reps × Sets × Weight      Muscle Size × Activation × Volume

Problem: A leg day        Solution: Both earn
earns same credit as      proportional credit
an arm day                based on muscle
                          contribution
```

---

## Why TU Matters

### Problem with Traditional Metrics

```
SCENARIO: Compare These Workouts

Workout A (Arms):
- Bicep Curls: 3 × 12 × 15kg
- Tricep Extensions: 3 × 12 × 15kg
Total Reps: 72

Workout B (Legs):
- Squats: 4 × 8 × 100kg
- Leg Press: 3 × 10 × 150kg
Total Reps: 62

By reps: Workout A wins (72 > 62)
Reality: Workout B is much more demanding

TU solves this by accounting for muscle size.
```

### TU Solution

```
Same Workouts with TU:

Workout A (Arms):
- Biceps (small): 24 TU
- Triceps (small): 24 TU
Total: 48 TU

Workout B (Legs):
- Quads (large): 85 TU
- Glutes (large): 45 TU
- Hamstrings (medium): 30 TU
Total: 160 TU

TU correctly reflects Workout B's higher demand.
```

---

## TU Calculation

### The Formula

```
TU = Σ (Muscle_Size × Activation_% × Volume_Factor)

Where:
- Muscle_Size: Base value by muscle group
- Activation_%: How much the exercise activates that muscle
- Volume_Factor: Sets × Reps × (1 + Weight_Modifier)
```

### Muscle Size Multipliers

```
MUSCLE SIZE MULTIPLIERS
=======================

LARGE (1.5-2.0x)
├── Quadriceps:    2.0x
├── Gluteus Max:   1.8x
├── Back (Lats):   1.7x
└── Chest:         1.5x

MEDIUM (1.0-1.4x)
├── Hamstrings:    1.3x
├── Shoulders:     1.2x
├── Trapezius:     1.1x
└── Triceps:       1.0x

SMALL (0.5-0.9x)
├── Biceps:        0.9x
├── Forearms:      0.7x
├── Calves:        0.8x
└── Abs:           0.6x
```

### Activation Percentages

```
BENCH PRESS ACTIVATION
======================

Primary:
├── Chest:      85%
└── Triceps:    60%

Secondary:
├── Shoulders:  40%
└── Core:       15%


SQUAT ACTIVATION
================

Primary:
├── Quads:      90%
├── Glutes:     80%
└── Hamstrings: 50%

Secondary:
├── Core:       40%
├── Calves:     25%
└── Lower Back: 30%
```

### Calculation Example

```
EXAMPLE: Bench Press 80kg × 10 reps × 3 sets

Step 1: Calculate per-muscle TU
---------------------------------
Chest:    1.5 × 0.85 × 30 = 38.25 TU
Triceps:  1.0 × 0.60 × 30 = 18.00 TU
Shoulders: 1.2 × 0.40 × 30 = 14.40 TU
Core:     0.6 × 0.15 × 30 =  2.70 TU

Step 2: Sum all muscles
---------------------------------
Total TU = 38.25 + 18.00 + 14.40 + 2.70
Total TU = 73.35 TU

Step 3: Apply weight modifier
---------------------------------
Weight_Mod = log(80/20) = 0.60
Final TU = 73.35 × (1 + 0.60)
Final TU ≈ 117 TU
```

---

## TU in Practice

### Daily TU Targets

```
DAILY TU TARGETS BY LEVEL
=========================

Level 1-5:    50-100 TU per workout
Level 6-10:   80-150 TU per workout
Level 11-20:  120-200 TU per workout
Level 21+:    150-250+ TU per workout

Note: Quality > Quantity. These are guidelines, not requirements.
```

### Weekly TU Distribution

```
WEEKLY TU DISTRIBUTION
======================

Example: Intermediate (Level 10)
Target Weekly TU: 600-800

Option A: 4 Days
├── Day 1: 180 TU (Upper)
├── Day 2: 200 TU (Lower)
├── Day 3: REST
├── Day 4: 180 TU (Push)
├── Day 5: 200 TU (Pull)
├── Day 6-7: REST
└── Total: 760 TU

Option B: 6 Days (PPL)
├── Day 1: 130 TU (Push)
├── Day 2: 130 TU (Pull)
├── Day 3: 140 TU (Legs)
├── Day 4: 130 TU (Push)
├── Day 5: 130 TU (Pull)
├── Day 6: 140 TU (Legs)
├── Day 7: REST
└── Total: 800 TU
```

### TU by Body Part

```
WEEKLY TU DISTRIBUTION BY MUSCLE
================================

For balanced development:

Large Muscles (40% of total):
├── Legs (total):     200-250 TU
├── Back:             100-150 TU
└── Chest:            80-120 TU

Medium Muscles (35% of total):
├── Shoulders:        60-80 TU
├── Hamstrings:       60-80 TU
└── Glutes:           80-100 TU

Small Muscles (25% of total):
├── Arms:             50-80 TU
├── Core:             40-60 TU
└── Calves:           30-50 TU
```

---

## TU and Progression

### Level System

```
LEVEL PROGRESSION
=================

Level   Cumulative TU    Title Example
-----   -------------    -------------
1       0                Novice
5       500              Beginner
10      2,000            Intermediate
15      5,000            Advanced
20      10,000           Expert
25      20,000           Elite
30      35,000           Master
40      75,000           Legend
```

### Progression Rate

```
HEALTHY PROGRESSION RATES
=========================

Beginner (L1-10):
├── Weekly increase: 5-10% TU
├── Monthly increase: 20-40% TU
└── Plateau is normal every 4-6 weeks

Intermediate (L11-20):
├── Weekly increase: 2-5% TU
├── Monthly increase: 10-20% TU
└── Deload every 4-8 weeks recommended

Advanced (L21+):
├── Weekly increase: 1-3% TU
├── Monthly increase: 5-10% TU
└── Periodization becomes essential
```

---

## TU Optimization

### Maximizing TU Efficiently

```
HIGH TU EXERCISES
=================

Most TU per time:
1. Squats           High (multiple large muscles)
2. Deadlifts        High (full posterior chain)
3. Bench Press      Medium-High (chest + arms)
4. Rows             Medium-High (back + arms)
5. Overhead Press   Medium (shoulders + triceps)

Lower TU (but still valuable):
1. Curls            Low (small muscles)
2. Lateral Raises   Low (isolation)
3. Calf Raises      Low (small muscles)
4. Face Pulls       Low (small muscles)
```

### TU vs. Recovery

```
TU RECOVERY CONSIDERATION
=========================

Higher TU = More recovery needed

Per Muscle Group:
< 50 TU:   Can train again in 24-48h
50-100 TU: Need 48-72h recovery
100+ TU:   Need 72-96h recovery

Example:
Monday: 150 TU (Chest-focused)
  └── Don't train chest again until Thursday

This is why TU tracks per muscle, not just total.
```

---

## TU Analytics

### What MuscleMap Tracks

```
TU ANALYTICS DASHBOARD
======================

Personal Stats:
├── Total TU (all-time)
├── Weekly TU
├── Daily average TU
├── TU per muscle group
└── TU trend (increasing/decreasing)

Comparative Stats:
├── Percentile ranking
├── Archetype comparison
└── Level-appropriate comparison
```

### TU Insights

```
TU INSIGHTS EXAMPLES
====================

"Your leg TU is 40% below your upper body.
Consider adding 1-2 leg sessions."

"Your weekly TU has increased 15% over
the last month. Great progress!"

"You haven't trained shoulders in 8 days.
Consider including shoulder work."
```

---

## FAQ

### Why not just count reps?

Reps don't account for muscle size or exercise difficulty. A curl rep and a squat rep are very different in terms of systemic stress and development stimulus.

### Does weight affect TU?

Yes, but logarithmically. Doubling the weight doesn't double the TU - diminishing returns apply. This prevents "ego lifting" from gaming the system.

### Can I increase TU without heavier weights?

Absolutely. You can increase TU by:
- Adding more sets
- Adding more reps
- Choosing exercises with higher muscle activation
- Training more frequently

### Is higher TU always better?

No. Recovery matters. Sustainable TU growth is better than unsustainable spikes. Listen to your body and don't chase TU at the expense of form or recovery.

### How accurate is TU?

TU is an estimate based on scientific literature about muscle activation and size. It's more accurate than rep counting but not perfectly precise. Use it as a useful guide, not an exact measurement.

---

## See Also

- [Muscle Activation](./muscle-activation.md)
- [Progression System](./progression-system.md)
- [Features: Training Units](../features/training-units.md)

---

*Last updated: 2026-01-15*
