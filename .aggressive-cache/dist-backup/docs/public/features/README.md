# MuscleMap Features

A comprehensive overview of everything MuscleMap offers.

## Table of Contents

- [Core Training Features](#core-training-features)
- [Progression Systems](#progression-systems)
- [Community & Social](#community--social)
- [Gamification & Economy](#gamification--economy)
- [Health & Wearables](#health--wearables)
- [Personalization](#personalization)

---

## Core Training Features

### Real-Time Muscle Tracking

The heart of MuscleMap - see exactly which muscles fire during every exercise.

**How it works:**
1. Log an exercise (e.g., "Bench Press")
2. Our database contains activation percentages for 40+ muscles
3. The 3D model updates in real-time showing which muscles are working
4. Track cumulative activation across your entire workout

**The Visualization:**
```
┌─────────────────────────────────────┐
│           MUSCLE ACTIVATION         │
├─────────────────────────────────────┤
│                                     │
│     [Front View]  [Back View]       │
│                                     │
│         🔴 = 70-100%                │
│         🟠 = 40-70%                 │
│         🟡 = 20-40%                 │
│         ⚪ = 0-20%                  │
│                                     │
│   Total TU This Session: 156        │
└─────────────────────────────────────┘
```

### Training Units (TU)

Our proprietary metric that normalizes training across different exercises:

| Muscle Group | Bias Weight | Why? |
|--------------|-------------|------|
| Large muscles (quads, glutes) | 4-6 | More volume needed |
| Medium muscles (chest, back) | 8-12 | Balanced response |
| Small muscles (biceps, triceps) | 14-18 | Less volume required |
| Stabilizers (forearms, calves) | 18-22 | Targeted isolation |

**TU Calculation:**
```
TU = (sets × reps × weight factor) × muscle_activation × bias_weight
```

This means:
- A heavy squat might earn 80 TU
- A bicep curl might earn 15 TU
- Both are appropriate for their muscle size!

### Exercise Database

**90+ exercises** with detailed data:
- Primary muscles targeted
- Secondary muscles activated
- Activation percentages
- Equipment required
- Difficulty level
- Exercise variations

**Example Entry:**
```
BARBELL DEADLIFT
├── Primary: Glutes (70%), Hamstrings (65%)
├── Secondary: Erector Spinae (60%), Quads (40%)
├── Tertiary: Traps (35%), Forearms (30%)
├── Equipment: Barbell, Plates
├── Difficulty: Intermediate
└── Variations: Romanian, Sumo, Deficit
```

### AI-Generated Prescriptions

Get personalized workout plans based on:
- Your goals
- Your archetype
- Available equipment
- Recent training history
- Muscle recovery status
- Any limitations/injuries

**Prescription Components:**
```
┌─────────────────────────────────────┐
│       TODAY'S PRESCRIPTION          │
├─────────────────────────────────────┤
│ WARMUP (5-10 min)                   │
│ ├── Dynamic stretches               │
│ └── Light cardio                    │
│                                     │
│ MAIN WORKOUT                        │
│ ├── Exercise 1: Squats 4×8          │
│ ├── Exercise 2: Lunges 3×12         │
│ ├── Exercise 3: Leg Press 3×10      │
│ └── Exercise 4: Leg Curls 3×12      │
│                                     │
│ COOLDOWN (5 min)                    │
│ ├── Static stretches                │
│ └── Foam rolling                    │
│                                     │
│ Expected TU: ~180                   │
│ Estimated Time: 45 minutes          │
└─────────────────────────────────────┘
```

---

## Progression Systems

### The Archetype System

Choose your training identity from **10 distinct archetypes**:

#### 1. Spartan
> *"Pain is temporary. Glory is forever."*

- **Focus:** Raw strength, mental toughness, endurance
- **Training Style:** Functional compound movements, minimal equipment
- **Example Exercises:** Deadlifts, carries, battle ropes

#### 2. Athlete
> *"Excellence in performance."*

- **Focus:** Balanced power, speed, agility
- **Training Style:** Sport-specific training, explosive movements
- **Example Exercises:** Olympic lifts, plyometrics, sprints

#### 3. Dancer
> *"Grace under pressure."*

- **Focus:** Flexibility, body control, rhythmic strength
- **Training Style:** Flow movements, isometrics, mobility
- **Example Exercises:** Yoga flows, Pilates, dance cardio

#### 4. Monk
> *"The body follows the mind."*

- **Focus:** Mind-muscle connection, discipline, breath work
- **Training Style:** Slow, controlled movements, meditation
- **Example Exercises:** Tai chi, focused resistance, breath holds

#### 5. Warrior
> *"Ready for battle."*

- **Focus:** Combat readiness, explosive power, endurance
- **Training Style:** Martial arts conditioning, HIIT
- **Example Exercises:** Heavy bag, shadowboxing, sprawls

#### 6. Explorer
> *"Adventure awaits."*

- **Focus:** Functional fitness, outdoor readiness
- **Training Style:** Practical movements, endurance building
- **Example Exercises:** Hiking simulation, carries, climbing

#### 7. Guardian
> *"Strength to protect."*

- **Focus:** Protective strength, stability, reliability
- **Training Style:** Steady progression, core stability
- **Example Exercises:** Farmer walks, planks, pressing

#### 8. Scholar
> *"Knowledge is power."*

- **Focus:** Scientific optimization, data-driven training
- **Training Style:** Periodization, precise tracking
- **Example Exercises:** Evidence-based programming

#### 9. Healer
> *"Longevity over intensity."*

- **Focus:** Recovery, sustainability, injury prevention
- **Training Style:** Therapeutic exercise, restoration
- **Example Exercises:** Corrective exercises, mobility work

#### 10. Artisan
> *"Sculpting perfection."*

- **Focus:** Aesthetic development, symmetry
- **Training Style:** Bodybuilding techniques, isolation
- **Example Exercises:** Targeted hypertrophy work

### Archetype Levels

Progress within your archetype:

```
Level 1-10:    Initiate
Level 11-20:   Practitioner
Level 21-30:   Adept
Level 31-40:   Expert
Level 41-50:   Master
Level 50+:     Grandmaster
```

Each level unlocks:
- New titles
- Cosmetic rewards
- Community recognition
- Achievement badges

### Character Stats (RPG System)

Your character has 6 core stats:

| Stat | What It Represents | How to Train |
|------|-------------------|--------------|
| **Strength** | Raw power output | Heavy compound lifts |
| **Endurance** | Stamina and resilience | Cardio, high-rep work |
| **Agility** | Speed and coordination | Plyometrics, agility drills |
| **Flexibility** | Range of motion | Stretching, yoga, mobility |
| **Balance** | Stability and control | Unilateral work, core training |
| **Mental Focus** | Mind-muscle connection | Slow, controlled reps |

**Stat Calculation:**
```
Each stat is calculated from:
├── Recent workout history
├── Exercise types performed
├── Volume and intensity
└── Consistency over time

Stats range from 1-100 and update weekly.
```

### Journey System

Create hierarchical goals:

```
JOURNEY: "Get Strong for Summer"
├── MILESTONE 1: Build Foundation (Week 1-4)
│   ├── Learn proper squat form
│   ├── Establish workout routine
│   └── Hit 1000 TU total
├── MILESTONE 2: Build Strength (Week 5-12)
│   ├── Increase squat by 20%
│   ├── Add deadlifts to routine
│   └── Hit 5000 TU total
└── MILESTONE 3: Peak Performance (Week 13-16)
    ├── Test new maxes
    ├── Complete assessment workout
    └── Compare before/after
```

---

## Community & Social

### Hangouts (Location-Based)

Connect with people who train at your gym:

**Features:**
- Local activity feed
- Gym-specific leaderboards
- Check-in system
- Event coordination
- Local challenges

**Creating a Hangout:**
1. Go to Locations
2. Search for your gym
3. If not found, add it with address
4. Become the Hangout founder
5. Invite others to join

### Virtual Hangouts

For those without local communities:

- **Interest-based:** Running, powerlifting, yoga
- **Goal-based:** Weight loss, muscle gain, marathon training
- **Time-based:** Morning crew, night owls
- **Archetype-based:** Spartans, Dancers, etc.

### Rivalries

Friendly 1v1 competitions:

```
┌─────────────────────────────────────┐
│         RIVALRY CHALLENGE           │
├─────────────────────────────────────┤
│ You vs. @FitnessFreak42             │
│                                     │
│ Metric: Total TU                    │
│ Duration: 7 days                    │
│ Stakes: 100 credits                 │
│                                     │
│ Current Standings:                  │
│ You:      456 TU ████████░░░        │
│ Opponent: 389 TU ██████░░░░░        │
│                                     │
│ Time Remaining: 3 days 4 hours      │
└─────────────────────────────────────┘
```

### Crews

Team up for group training:

**Crew Features:**
- Shared workout plans
- Team TU goals
- Crew leaderboards
- Group achievements
- Private crew chat
- Scheduled workouts

**Crew Roles:**
- **Captain** - Full admin rights
- **Officer** - Can invite members
- **Member** - Standard participation
- **Recruit** - New members

### Direct Messaging

Private communication:

- One-on-one chats
- Group conversations
- File/image sharing
- Read receipts
- Mute options

### High-Fives

Quick encouragement:

Send a high-five when someone:
- Completes a workout
- Hits a PR
- Earns an achievement
- Levels up

It's a simple tap that means "I see you, keep going!"

---

## Gamification & Economy

### Achievement System

**7 Achievement Categories:**

| Category | Examples |
|----------|----------|
| **Record** | New PR, most TU in a day |
| **Streak** | 7-day streak, 30-day streak |
| **First-Time** | First workout, first PR |
| **Top-Rank** | #1 in leaderboard |
| **Milestone** | 1000 TU total, Level 10 |
| **Social** | 10 high-fives given, join crew |
| **Special** | Seasonal events, rare feats |

**Rarity System:**
```
Common     ⚪ - Basic milestones
Uncommon   🟢 - Notable achievements
Rare       🔵 - Difficult accomplishments
Epic       🟣 - Major feats
Legendary  🟡 - Exceptional achievements
```

### Credit Economy

**Earning Credits:**
- Complete workouts
- Earn achievements
- Win rivalries
- Daily login streaks
- Community participation

**Spending Credits:**
- Cosmetic upgrades
- Companion customization
- Special features
- Premium content

**Credit Actions:**
```
ACTION                    CREDITS
─────────────────────────────────
Complete workout          +10-50
Earn achievement          +25-500
Win rivalry              +50-200
7-day streak             +100
Refer a friend           +200
Purchase pack            +Variable
```

### Skins Store

Customize your experience:

**Available Items:**
- Profile themes
- Badge frames
- Companion skins
- Workout templates
- Special effects

---

## Health & Wearables

### Supported Devices

| Device | Features Synced |
|--------|----------------|
| **Apple Watch** | Heart rate, workouts, steps |
| **Fitbit** | Sleep, heart rate, activity |
| **Garmin** | GPS workouts, heart rate |
| **HealthKit** | All Apple Health data |
| **Google Fit** | All Google Fit data |

### Biometric Tracking

Optional health metrics:
- Weight trends
- Body measurements
- Blood pressure
- Sleep quality
- Recovery scores

### HealthKit/Google Fit Integration

Automatic sync of:
- Workout history
- Heart rate during exercise
- Active calories
- Steps and distance
- Sleep data

---

## Personalization

### Goals System

Set personal targets:

```
GOAL TYPES:
├── Performance Goals
│   ├── "Bench press 225 lbs"
│   └── "Run 5K under 25 min"
├── Volume Goals
│   ├── "Hit 500 TU this week"
│   └── "Complete 20 workouts this month"
├── Consistency Goals
│   ├── "Work out 4x per week"
│   └── "Never miss Monday"
└── Body Composition Goals
    ├── "Lose 10 pounds"
    └── "Gain 5 lbs muscle"
```

### Limitations Tracking

Record and work around:

- **Injuries:** "Lower back strain - avoid deadlifts"
- **Chronic Conditions:** "Bad knee - modify squats"
- **Equipment Limits:** "No barbell - dumbbell alternatives"
- **Time Constraints:** "Only 30 min - HIIT focus"

The prescription system automatically:
- Excludes contraindicated exercises
- Suggests safe alternatives
- Adjusts intensity recommendations

### Privacy Controls

You control what's shared:

```
PRIVACY SETTINGS
├── Profile Visibility
│   ├── Public - Everyone can see
│   ├── Friends - Only connections
│   └── Private - Only you
├── Activity Sharing
│   ├── All workouts
│   ├── Achievements only
│   └── Nothing
├── Leaderboard Participation
│   ├── Opt-in (visible)
│   └── Opt-out (hidden)
└── Location
    ├── Show gym
    └── Hide gym
```

---

## Coming Soon

Features on the roadmap:

- **Form Analysis** - AI-powered exercise form feedback
- **Nutrition Tracking** - Macro and calorie integration
- **Advanced Analytics** - Deep performance insights
- **Plugin Marketplace** - Community extensions
- **Vision Pro App** - Spatial computing workout experience

---

[View Full Roadmap](/roadmap) | [Back to Documentation](/docs)
