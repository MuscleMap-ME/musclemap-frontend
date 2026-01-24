# Phase 1: Quick Wins Implementation Plan

**Target:** Complete in 1-2 weeks
**Goal:** Ship 5 features that are 90% built but need UI polish

---

## 1. RPE/RIR Workout Integration

### Backend Status: ✅ COMPLETE
- Migration `092_rpe_rir_tracking.ts` exists
- GraphQL fields available
- Service layer implemented

### Frontend Tasks

#### 1.1 RPE Selector Component
```
Location: src/components/workout/RPESelector.tsx
```

**Design:**
- Horizontal scale 1-10 with color gradient (green → red)
- Tap to select, show description
- Optional: Sliding scale with haptic feedback

**RPE Scale Reference:**
| RPE | Description | RIR |
|-----|-------------|-----|
| 10 | Maximum effort, couldn't do more | 0 |
| 9 | Could maybe do 1 more | 1 |
| 8 | Could do 2 more | 2 |
| 7 | Could do 3 more | 3 |
| 6 | Could do 4-5 more | 4-5 |
| 5 | Moderate effort | 5+ |

#### 1.2 Integration Points
```
Location: src/pages/Workout.tsx
```

**Tasks:**
- [ ] Add RPE prompt after set completion (optional, can skip)
- [ ] Store RPE with set data via GraphQL mutation
- [ ] Show RPE history for exercise in set log
- [ ] Add toggle in settings to enable/disable RPE prompts

#### 1.3 RPE Analytics
```
Location: src/components/workout/RPETrendsChart.tsx (exists)
```

**Tasks:**
- [ ] Show average RPE per workout over time
- [ ] Fatigue indicator when RPE trending up at same weight
- [ ] Weekly RPE summary

### GraphQL Mutations to Use
```graphql
mutation LogSetWithRPE($input: LogSetInput!) {
  logSet(input: $input) {
    id
    reps
    weight
    rpe
    rir
  }
}
```

---

## 2. Recovery Score Dashboard

### Backend Status: ✅ COMPLETE
- Module: `apps/api/src/modules/recovery/`
- GraphQL queries available

### Frontend Tasks

#### 2.1 Recovery Score Card
```
Location: src/components/dashboard/RecoveryScoreCard.tsx (create)
```

**Design:**
- Circular progress indicator (0-100 score)
- Color: Red (<50) → Yellow (50-75) → Green (>75)
- Show trend arrow (↑↓→)
- Tap to see breakdown

**Score Breakdown:**
- Sleep quality (40%)
- Training load (30%)
- Stress indicators (20%)
- Nutrition (10%)

#### 2.2 Muscle Recovery Status
```
Location: src/components/recovery/MuscleRecoveryStatus.tsx (create)
```

**Design:**
- Mini 3D body or simple body diagram
- Color-coded muscles by recovery %
- Tap muscle to see recovery time remaining
- Show "fully recovered" vs "still recovering"

#### 2.3 Recovery Recommendations
```
Location: src/components/recovery/RecoveryRecommendations.tsx (create)
```

**Show:**
- "Train these muscles today" (fully recovered)
- "Rest these muscles" (still recovering)
- Sleep recommendation if score low
- Suggested workout intensity

### GraphQL Queries to Use
```graphql
query GetRecoveryScore {
  recoveryScore {
    overall
    sleep
    training
    stress
    trend
    muscleRecovery {
      muscleGroup
      recoveryPercent
      hoursRemaining
    }
    recommendations
  }
}
```

---

## 3. Sleep Tracking Enhancement

### Backend Status: ✅ COMPLETE
- Migration `095_sleep_recovery_system.ts`
- Migration `115_sleep_hygiene_system.ts`

### Frontend Tasks

#### 3.1 Quick Sleep Log
```
Location: src/components/sleep/QuickSleepLog.tsx (create)
```

**Design:**
- Bedtime picker (last night)
- Wake time picker
- Quality rating (1-5 stars or emoji)
- Optional notes

**One-tap shortcuts:**
- "Slept well" (8h, quality 4)
- "Slept okay" (7h, quality 3)
- "Slept poorly" (6h, quality 2)

#### 3.2 Sleep Debt Tracker
```
Location: src/components/sleep/SleepDebtCard.tsx (create)
```

**Design:**
- Show sleep debt in hours
- Target vs actual this week
- Trend over 7 days
- "Pay back debt" recommendations

#### 3.3 Sleep Factors
```
Location: src/components/sleep/SleepFactors.tsx (create)
```

**Track (optional toggles):**
- [ ] Caffeine after 2pm
- [ ] Alcohol
- [ ] Screen time before bed
- [ ] Late meal
- [ ] Stressful day
- [ ] Exercise timing

### GraphQL Mutations
```graphql
mutation LogSleep($input: SleepLogInput!) {
  logSleep(input: $input) {
    id
    bedTime
    wakeTime
    quality
    duration
    sleepDebt
  }
}
```

---

## 4. 1RM Tracking & Estimation

### Backend Status: ⚠️ PARTIAL
- Database exists
- Needs service implementation

### Backend Tasks

#### 4.1 1RM Calculation Service
```
Location: apps/api/src/modules/stats/oneRepMax.service.ts (create)
```

**Formulas:**
```typescript
// Epley Formula (most common)
function epley(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// Brzycki Formula (more conservative)
function brzycki(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (36 / (37 - reps));
}

// Average of multiple formulas for accuracy
function estimated1RM(weight: number, reps: number): number {
  return Math.round((epley(weight, reps) + brzycki(weight, reps)) / 2);
}
```

#### 4.2 GraphQL Schema Addition
```graphql
type ExerciseStats {
  exerciseId: ID!
  estimated1RM: Float
  tested1RM: Float
  oneRMHistory: [OneRMRecord!]!
  percentOf1RM(weight: Float!): Float
}

type OneRMRecord {
  date: DateTime!
  value: Float!
  method: OneRMMethod! # ESTIMATED, TESTED
  sourceSetId: ID
}
```

### Frontend Tasks

#### 4.3 1RM Display in Exercise
```
Location: src/components/exercise/OneRMCard.tsx (create)
```

**Design:**
- Show current estimated 1RM
- Show tested 1RM (if available)
- Progress chart over time
- "Test Your 1RM" button

#### 4.4 Percentage Calculator
```
Location: src/components/workout/PercentageCalculator.tsx (create)
```

**Design:**
- Input target percentage (e.g., 80%)
- Show weight to use based on 1RM
- Quick buttons: 60%, 70%, 80%, 90%

---

## 5. Outdoor Equipment Map Route

### Backend Status: ✅ COMPLETE (just deployed)

### Frontend Tasks

#### 5.1 Add Route
```
Location: src/App.tsx or src/router.tsx
```

```typescript
// Add to routes
{
  path: '/discover',
  element: <DiscoverPage />,
}
```

#### 5.2 Create Page Wrapper
```
Location: src/pages/Discover.tsx (create)
```

```typescript
import { EquipmentMap } from '@/components/outdoor-equipment';

export default function DiscoverPage() {
  return (
    <div className="h-screen">
      <EquipmentMap
        onVenueSelect={(venue) => {/* navigate to detail */}}
      />
    </div>
  );
}
```

#### 5.3 Add Navigation Link
```
Location: src/components/navigation/MainNav.tsx
```

- Add "Discover" or "Outdoor" link to main navigation
- Icon: MapPin or Compass

#### 5.4 Dashboard Widget
```
Location: src/components/dashboard/NearbyVenuesWidget.tsx (create)
```

**Design:**
- Show 3 closest outdoor gyms
- Distance from current location
- Tap to open in map
- "Workout Here" quick action

---

## Implementation Order

### Day 1-2: RPE/RIR
1. Create RPESelector component
2. Integrate into Workout.tsx
3. Add RPE to set logging mutation
4. Test end-to-end

### Day 3: Recovery Dashboard
1. Create RecoveryScoreCard
2. Add to Dashboard
3. Create MuscleRecoveryStatus
4. Wire up GraphQL queries

### Day 4: Sleep Enhancement
1. Create QuickSleepLog component
2. Add to Dashboard or Health page
3. Create SleepDebtCard
4. Test logging flow

### Day 5: 1RM Tracking
1. Create backend service
2. Add GraphQL fields
3. Create OneRMCard component
4. Add percentage calculator

### Day 6: Outdoor Map Route
1. Add route to router
2. Create Discover page
3. Add navigation link
4. Create NearbyVenuesWidget

### Day 7: Testing & Polish
1. End-to-end testing
2. Mobile responsiveness
3. Error handling
4. Loading states

---

## Files to Create

```
src/components/
├── workout/
│   ├── RPESelector.tsx        # NEW
│   ├── RIRSelector.tsx        # NEW
│   └── PercentageCalculator.tsx # NEW
├── dashboard/
│   ├── RecoveryScoreCard.tsx  # NEW
│   └── NearbyVenuesWidget.tsx # NEW
├── recovery/
│   ├── MuscleRecoveryStatus.tsx # NEW
│   └── RecoveryRecommendations.tsx # NEW
├── sleep/
│   ├── QuickSleepLog.tsx      # NEW
│   ├── SleepDebtCard.tsx      # NEW
│   └── SleepFactors.tsx       # NEW
├── exercise/
│   └── OneRMCard.tsx          # NEW
└── outdoor-equipment/
    └── (already exists)

src/pages/
└── Discover.tsx               # NEW

apps/api/src/modules/stats/
└── oneRepMax.service.ts       # NEW
```

---

## GraphQL Schema Additions

```graphql
# Add to schema.ts

extend type Set {
  rpe: Int
  rir: Int
}

input LogSetInput {
  # ... existing fields
  rpe: Int
  rir: Int
}

type RecoveryScore {
  overall: Int!
  sleep: Int!
  training: Int!
  stress: Int!
  trend: String!
  muscleRecovery: [MuscleRecoveryStatus!]!
  recommendations: [String!]!
}

type MuscleRecoveryStatus {
  muscleGroup: String!
  recoveryPercent: Int!
  hoursRemaining: Int
  lastTrained: DateTime
}

type ExerciseStats {
  exerciseId: ID!
  estimated1RM: Float
  tested1RM: Float
  oneRMHistory: [OneRMRecord!]!
}

type Query {
  recoveryScore: RecoveryScore
  exerciseStats(exerciseId: ID!): ExerciseStats
}
```

---

## Testing Checklist

### RPE/RIR
- [ ] Can log set with RPE
- [ ] Can skip RPE
- [ ] RPE shows in history
- [ ] Settings toggle works

### Recovery
- [ ] Score displays correctly
- [ ] Muscle recovery shows
- [ ] Recommendations are relevant
- [ ] Handles no data state

### Sleep
- [ ] Can log sleep
- [ ] Sleep debt calculates
- [ ] Shows on recovery score
- [ ] Handles timezone

### 1RM
- [ ] Estimates calculate correctly
- [ ] History shows progression
- [ ] Percentage calculator works
- [ ] Updates after new PR

### Outdoor Map
- [ ] Route loads
- [ ] Map displays venues
- [ ] Can filter equipment
- [ ] Venue detail works

---

## Definition of Done

- [ ] Feature works on mobile and desktop
- [ ] Loading and error states handled
- [ ] TypeScript types complete
- [ ] No console errors
- [ ] Tested with real data
- [ ] Deployed to production
