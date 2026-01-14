# Stage 2: User Persona Modeling & Simulation Profiles

**Generated:** 2026-01-14
**Status:** Complete

## Overview

This document defines comprehensive user personas that represent all possible states, journeys, and feature interactions in the MuscleMap platform. These personas will be used as dummy users for exhaustive testing.

---

## 1. User State Dimensions

### 1.1 Account States
| State | Description | Test Priority |
|-------|-------------|---------------|
| `FRESH` | Just registered, no onboarding | High |
| `ONBOARDING` | In onboarding flow | High |
| `ACTIVE` | Completed onboarding, active user | High |
| `DORMANT` | No activity in 30+ days | Medium |
| `SUSPENDED` | Account suspended | Medium |
| `BANNED` | Account banned | Low |
| `DELETED` | Soft-deleted account | Low |

### 1.2 Rank Tiers (8 levels)
| Tier | Name | XP Threshold | Test Priority |
|------|------|--------------|---------------|
| 1 | Novice | 0 | High |
| 2 | Trainee | 100 | High |
| 3 | Apprentice | 500 | Medium |
| 4 | Practitioner | 1,500 | Medium |
| 5 | Journeyperson | 4,000 | Medium |
| 6 | Expert | 10,000 | Medium |
| 7 | Master | 25,000 | Low |
| 8 | Grandmaster | 60,000 | Low |

### 1.3 Wealth Tiers (Credit Balance)
| Tier | Name | Credits | Visual Indicator |
|------|------|---------|------------------|
| 0 | Broke | 0-9 | None |
| 1 | Bronze | 10-99 | Bronze ring |
| 2 | Silver | 100-999 | Silver ring |
| 3 | Gold | 1,000-9,999 | Gold ring |
| 4 | Platinum | 10,000-99,999 | Platinum ring |
| 5 | Diamond | 100,000-999,999 | Diamond ring |
| 6 | Obsidian | 1,000,000+ | Obsidian crown |

### 1.4 Archetype Paths (12 archetypes)
- Bodybuilder
- Powerlifter
- Olympic Lifter
- CrossFitter
- Calisthenics
- Martial Artist
- Endurance Athlete
- Yoga Practitioner
- General Fitness
- Rehabilitation
- Senior Fitness
- Sport-Specific

### 1.5 Physical Profiles
| Category | Options |
|----------|---------|
| Gender | Male, Female, Non-binary, Prefer not to say |
| Age Band | 13-17, 18-24, 25-34, 35-44, 45-54, 55-64, 65+ |
| Adaptive | None, Wheelchair, Prosthetic, Visual, Hearing, Cognitive |
| Limitations | Back, Knee, Shoulder, Wrist, Mobility, Heart, Breathing, Pregnant |

### 1.6 Social Engagement Levels
| Level | Description | Features Used |
|-------|-------------|---------------|
| Minimal | Privacy-focused, no social | Settings only |
| Low | Reads feed, doesn't post | Feed, browse |
| Medium | Posts occasionally, some friends | Posts, follows, DMs |
| High | Active community member | Crews, competitions, mentoring |
| Ultra | Community leader | Trainer, moderator, content creator |

### 1.7 Economy Engagement
| Level | Description | Actions |
|-------|-------------|---------|
| Free | Never purchases | Earn only |
| Occasional | Rare purchases | Store items |
| Regular | Monthly spending | Subscriptions |
| Premium | Heavy spender | All features |
| Whale | Top 1% spending | Prestige items |

---

## 2. Comprehensive User Personas

### Persona 1: Fresh Start (NOVA)
```json
{
  "id": "test_nova_fresh",
  "username": "nova_fresh",
  "state": "FRESH",
  "rank": 1,
  "xp": 0,
  "credits": 100,
  "wealthTier": 1,
  "archetype": null,
  "onboardingCompleted": false,
  "workouts": 0,
  "socialLevel": "minimal",
  "economyLevel": "free",
  "gender": "prefer_not_to_say",
  "ageBand": null,
  "limitations": [],
  "testPriority": "critical"
}
```
**Test Scenarios:**
- Complete onboarding flow
- Select archetype
- First workout
- Earn first credits
- View empty states

### Persona 2: New User (ROOKIE)
```json
{
  "id": "test_rookie_trainee",
  "username": "rookie_trainee",
  "state": "ACTIVE",
  "rank": 2,
  "xp": 150,
  "credits": 250,
  "wealthTier": 2,
  "archetype": "general_fitness",
  "onboardingCompleted": true,
  "workouts": 5,
  "socialLevel": "low",
  "economyLevel": "free",
  "gender": "male",
  "ageBand": "25-34",
  "limitations": [],
  "testPriority": "high"
}
```
**Test Scenarios:**
- Browse exercises
- Complete workouts
- View stats
- Earn credits
- Explore features

### Persona 3: Engaged User (ACTIVE_ANDY)
```json
{
  "id": "test_active_andy",
  "username": "active_andy",
  "state": "ACTIVE",
  "rank": 4,
  "xp": 2500,
  "credits": 3500,
  "wealthTier": 3,
  "archetype": "bodybuilder",
  "onboardingCompleted": true,
  "workouts": 75,
  "socialLevel": "medium",
  "economyLevel": "occasional",
  "gender": "male",
  "ageBand": "25-34",
  "limitations": [],
  "crew": "iron_warriors",
  "rivalries": 2,
  "testPriority": "high"
}
```
**Test Scenarios:**
- Crew participation
- Rivalry tracking
- Leaderboard ranking
- Store purchases
- Goal tracking
- Achievement unlocking

### Persona 4: Power User (ELITE_EVE)
```json
{
  "id": "test_elite_eve",
  "username": "elite_eve",
  "state": "ACTIVE",
  "rank": 6,
  "xp": 15000,
  "credits": 25000,
  "wealthTier": 4,
  "archetype": "powerlifter",
  "onboardingCompleted": true,
  "workouts": 300,
  "socialLevel": "high",
  "economyLevel": "regular",
  "gender": "female",
  "ageBand": "25-34",
  "limitations": [],
  "crew": "powerhouse_crew",
  "isCrewLeader": true,
  "rivalries": 5,
  "mentoring": 3,
  "testPriority": "high"
}
```
**Test Scenarios:**
- Crew leadership
- Multiple rivalries
- Mentorship giving
- Premium features
- Leaderboard top positions
- Competition creation

### Persona 5: Grandmaster (LEGEND_LEO)
```json
{
  "id": "test_legend_leo",
  "username": "legend_leo",
  "state": "ACTIVE",
  "rank": 8,
  "xp": 75000,
  "credits": 150000,
  "wealthTier": 5,
  "archetype": "olympic_lifter",
  "onboardingCompleted": true,
  "workouts": 1000,
  "socialLevel": "ultra",
  "economyLevel": "premium",
  "gender": "male",
  "ageBand": "35-44",
  "limitations": [],
  "isTrainer": true,
  "classesCreated": 50,
  "studentsTraining": 100,
  "testPriority": "medium"
}
```
**Test Scenarios:**
- Trainer features
- Class management
- Maximum rank perks
- High credit operations
- Large transfer amounts
- All prestige items

### Persona 6: Whale User (DIAMOND_DAN)
```json
{
  "id": "test_diamond_dan",
  "username": "diamond_dan",
  "state": "ACTIVE",
  "rank": 7,
  "xp": 40000,
  "credits": 1500000,
  "wealthTier": 6,
  "archetype": "bodybuilder",
  "onboardingCompleted": true,
  "workouts": 500,
  "socialLevel": "high",
  "economyLevel": "whale",
  "gender": "male",
  "ageBand": "35-44",
  "limitations": [],
  "prestigeItems": ["hall_of_fame", "custom_title"],
  "testPriority": "medium"
}
```
**Test Scenarios:**
- Large credit transfers
- All store purchases
- Obsidian tier features
- Tipping large amounts
- Economic edge cases

### Persona 7: Privacy-Focused (GHOST)
```json
{
  "id": "test_ghost_private",
  "username": "ghost_private",
  "state": "ACTIVE",
  "rank": 3,
  "xp": 800,
  "credits": 500,
  "wealthTier": 2,
  "archetype": "calisthenics",
  "onboardingCompleted": true,
  "workouts": 30,
  "socialLevel": "minimal",
  "economyLevel": "free",
  "privacy": {
    "minimalistMode": true,
    "optOutLeaderboards": true,
    "optOutCommunityFeed": true,
    "profileCompletelyPrivate": true
  },
  "testPriority": "high"
}
```
**Test Scenarios:**
- Privacy exclusions working
- Not appearing in leaderboards
- Hidden from search
- Minimal data exposure

### Persona 8: Rehabilitation User (RECOVER_RAY)
```json
{
  "id": "test_recover_ray",
  "username": "recover_ray",
  "state": "ACTIVE",
  "rank": 2,
  "xp": 200,
  "credits": 150,
  "wealthTier": 2,
  "archetype": "rehabilitation",
  "onboardingCompleted": true,
  "workouts": 15,
  "socialLevel": "low",
  "economyLevel": "free",
  "gender": "male",
  "ageBand": "45-54",
  "limitations": ["back_pain", "knee_issues"],
  "testPriority": "high"
}
```
**Test Scenarios:**
- Exercise substitutions
- Limitation-aware prescriptions
- Rehabilitation tracking
- Adaptive exercise filtering

### Persona 9: Senior User (SILVER_SALLY)
```json
{
  "id": "test_silver_sally",
  "username": "silver_sally",
  "state": "ACTIVE",
  "rank": 3,
  "xp": 600,
  "credits": 800,
  "wealthTier": 2,
  "archetype": "senior_fitness",
  "onboardingCompleted": true,
  "workouts": 50,
  "socialLevel": "medium",
  "economyLevel": "occasional",
  "gender": "female",
  "ageBand": "65+",
  "limitations": ["limited_mobility"],
  "adaptive": "none",
  "testPriority": "medium"
}
```
**Test Scenarios:**
- Age-appropriate exercises
- Mobility considerations
- Senior-friendly UI
- Community features for seniors

### Persona 10: Adaptive User (WHEEL_WALTER)
```json
{
  "id": "test_wheel_walter",
  "username": "wheel_walter",
  "state": "ACTIVE",
  "rank": 4,
  "xp": 2000,
  "credits": 1200,
  "wealthTier": 3,
  "archetype": "calisthenics",
  "onboardingCompleted": true,
  "workouts": 80,
  "socialLevel": "medium",
  "economyLevel": "free",
  "gender": "male",
  "ageBand": "25-34",
  "limitations": [],
  "adaptive": "wheelchair",
  "cohortPreferences": {
    "adaptiveCategory": "wheelchair",
    "adaptiveVisible": true
  },
  "testPriority": "high"
}
```
**Test Scenarios:**
- Adaptive exercise filtering
- Wheelchair-accessible workouts
- Adaptive leaderboard cohort
- Community matching

### Persona 11: Martial Artist (NINJA_NAT)
```json
{
  "id": "test_ninja_nat",
  "username": "ninja_nat",
  "state": "ACTIVE",
  "rank": 5,
  "xp": 5000,
  "credits": 4000,
  "wealthTier": 3,
  "archetype": "martial_artist",
  "onboardingCompleted": true,
  "workouts": 150,
  "socialLevel": "high",
  "economyLevel": "regular",
  "gender": "non_binary",
  "ageBand": "25-34",
  "martialArtsStyles": ["bjj", "muay_thai"],
  "beltRank": "purple",
  "testPriority": "medium"
}
```
**Test Scenarios:**
- Martial arts tracking
- Belt progression
- Style-specific exercises
- Technique logging

### Persona 12: Dormant User (SLEEPY_SAM)
```json
{
  "id": "test_sleepy_sam",
  "username": "sleepy_sam",
  "state": "DORMANT",
  "rank": 3,
  "xp": 700,
  "credits": 450,
  "wealthTier": 2,
  "archetype": "general_fitness",
  "onboardingCompleted": true,
  "workouts": 25,
  "lastActivity": "2025-11-01T00:00:00Z",
  "socialLevel": "low",
  "economyLevel": "free",
  "testPriority": "medium"
}
```
**Test Scenarios:**
- Reactivation flows
- Streak reset handling
- Re-engagement notifications
- Data retention

### Persona 13: Suspended User (BANNED_BOB)
```json
{
  "id": "test_banned_bob",
  "username": "banned_bob",
  "state": "SUSPENDED",
  "rank": 2,
  "xp": 300,
  "credits": 0,
  "wealthTier": 0,
  "archetype": "bodybuilder",
  "moderationStatus": "suspended",
  "moderationReason": "fraud_detected",
  "testPriority": "medium"
}
```
**Test Scenarios:**
- Access restrictions
- Appeal process
- Wallet frozen state
- API rejection

### Persona 14: Trainer User (COACH_CAROL)
```json
{
  "id": "test_coach_carol",
  "username": "coach_carol",
  "state": "ACTIVE",
  "rank": 6,
  "xp": 12000,
  "credits": 35000,
  "wealthTier": 4,
  "archetype": "crossfitter",
  "onboardingCompleted": true,
  "workouts": 400,
  "socialLevel": "ultra",
  "economyLevel": "premium",
  "isTrainer": true,
  "trainerVerified": true,
  "trainerProfile": {
    "specialties": ["CrossFit", "HIIT", "Strength"],
    "certifications": ["CSCS", "CF-L2"],
    "hourlyRate": 100,
    "rating": 4.8,
    "totalClasses": 200,
    "totalStudents": 500
  },
  "testPriority": "high"
}
```
**Test Scenarios:**
- Class creation
- Student enrollment
- Wage calculations
- Trainer verification
- Rating system

### Persona 15: Mentee User (STUDENT_STEVE)
```json
{
  "id": "test_student_steve",
  "username": "student_steve",
  "state": "ACTIVE",
  "rank": 2,
  "xp": 180,
  "credits": 100,
  "wealthTier": 1,
  "archetype": "bodybuilder",
  "onboardingCompleted": true,
  "workouts": 8,
  "socialLevel": "medium",
  "economyLevel": "free",
  "hasMentor": true,
  "mentorId": "test_coach_carol",
  "testPriority": "medium"
}
```
**Test Scenarios:**
- Mentorship requests
- Progress tracking with mentor
- Check-in system
- Goal alignment

---

## 3. Feature Interaction Matrix

### Critical Path Combinations
| Feature A | Feature B | Interaction | Priority |
|-----------|-----------|-------------|----------|
| Workout | Credits | Earn per rep | Critical |
| Workout | Stats | Stat updates | Critical |
| Workout | Achievements | Unlock triggers | High |
| Workout | Leaderboard | Ranking updates | High |
| Credits | Transfer | P2P economy | High |
| Credits | Store | Purchases | High |
| Crew | Workout | TU contribution | High |
| Rivalry | Workout | TU tracking | High |
| Privacy | Leaderboard | Exclusion | High |
| Limitations | Prescription | Filtering | High |
| Trainer | Class | Enrollment | Medium |
| Mentorship | Goals | Tracking | Medium |

### Edge Case Combinations
| Scenario | Users Involved | Expected Behavior |
|----------|----------------|-------------------|
| Transfer to self | Single user | Rejected |
| Crew war both sides | Two crew members | Both tracked |
| Rivalry with blocked user | Two users | Should fail |
| Class enrollment while banned | Suspended + Trainer | Rejected |
| Workout with all limitations | Rehab user | Minimal exercises |
| Privacy mode in competition | Privacy + Competition | Excluded from public view |

---

## 4. Test Action Scripts

### Script: New User Journey
```typescript
const newUserJourney = [
  { action: "register", params: { email, password, username } },
  { action: "login", params: { email, password } },
  { action: "getOnboardingStatus", expected: { completed: false } },
  { action: "updateOnboardingProfile", params: { displayName, goals } },
  { action: "setHomeEquipment", params: { equipmentIds } },
  { action: "selectArchetype", params: { archetypeId } },
  { action: "completeOnboarding", expected: { success: true } },
  { action: "getDashboard", expected: { hasData: true } },
  { action: "generatePrescription", params: { time: 30, location: "home" } },
  { action: "completeWorkout", params: { sets } },
  { action: "getCreditsBalance", expected: { increased: true } },
  { action: "getStats", expected: { hasStats: true } },
];
```

### Script: Economy Flow
```typescript
const economyFlow = [
  { action: "getBalance", expected: { balance: ">0" } },
  { action: "getStoreItems", expected: { count: ">0" } },
  { action: "purchaseItem", params: { sku: "buddy_species_wolf" } },
  { action: "getInventory", expected: { contains: "buddy_species_wolf" } },
  { action: "equipCosmetic", params: { slot: "buddy", sku: "buddy_species_wolf" } },
  { action: "transfer", params: { recipientId, amount: 50 } },
  { action: "getTransferHistory", expected: { count: 1 } },
  { action: "tipUser", params: { userId, amount: 10 } },
];
```

### Script: Social Flow
```typescript
const socialFlow = [
  { action: "followUser", params: { userId } },
  { action: "getFollowing", expected: { contains: userId } },
  { action: "createPost", params: { content: "Test post" } },
  { action: "getFeed", expected: { contains: "Test post" } },
  { action: "joinCrew", params: { crewId } },
  { action: "getMyCrew", expected: { id: crewId } },
  { action: "challengeRival", params: { opponentId } },
  { action: "getRivalries", expected: { status: "pending" } },
  { action: "sendMessage", params: { conversationId, content: "Hello" } },
];
```

### Script: Trainer Flow
```typescript
const trainerFlow = [
  { action: "createTrainerProfile", params: { specialties, rate } },
  { action: "getTrainerProfile", expected: { exists: true } },
  { action: "createClass", params: { title, time, capacity } },
  { action: "getMyClasses", expected: { count: 1 } },
  { action: "enrollStudent", params: { classId, studentId } },
  { action: "getEnrollments", expected: { count: 1 } },
  { action: "markAttendance", params: { classId, studentId, attended: true } },
  { action: "getEarnings", expected: { amount: ">0" } },
];
```

### Script: Privacy Flow
```typescript
const privacyFlow = [
  { action: "enableMinimalistMode" },
  { action: "getLeaderboard", expected: { excludes: userId } },
  { action: "searchUsers", expected: { excludes: userId } },
  { action: "optOutLeaderboards" },
  { action: "getCommunityFeed", expected: { excludes: userId } },
  { action: "setProfilePrivate" },
  { action: "getUserProfile", params: { userId }, expected: { limited: true } },
];
```

---

## 5. Wealth Tier Visual Indicators

### Proposed Implementation

```typescript
interface WealthTier {
  tier: number;
  name: string;
  minCredits: number;
  maxCredits: number;
  color: string;
  icon: string;
  ringStyle: string;
  badgeGlow: boolean;
  animationLevel: "none" | "subtle" | "medium" | "intense";
}

const WEALTH_TIERS: WealthTier[] = [
  {
    tier: 0,
    name: "Broke",
    minCredits: 0,
    maxCredits: 9,
    color: "#666666",
    icon: "none",
    ringStyle: "none",
    badgeGlow: false,
    animationLevel: "none"
  },
  {
    tier: 1,
    name: "Bronze",
    minCredits: 10,
    maxCredits: 99,
    color: "#CD7F32",
    icon: "bronze_ring",
    ringStyle: "solid 2px #CD7F32",
    badgeGlow: false,
    animationLevel: "none"
  },
  {
    tier: 2,
    name: "Silver",
    minCredits: 100,
    maxCredits: 999,
    color: "#C0C0C0",
    icon: "silver_ring",
    ringStyle: "solid 2px #C0C0C0",
    badgeGlow: false,
    animationLevel: "subtle"
  },
  {
    tier: 3,
    name: "Gold",
    minCredits: 1000,
    maxCredits: 9999,
    color: "#FFD700",
    icon: "gold_ring",
    ringStyle: "solid 3px #FFD700",
    badgeGlow: true,
    animationLevel: "subtle"
  },
  {
    tier: 4,
    name: "Platinum",
    minCredits: 10000,
    maxCredits: 99999,
    color: "#E5E4E2",
    icon: "platinum_ring",
    ringStyle: "double 3px #E5E4E2",
    badgeGlow: true,
    animationLevel: "medium"
  },
  {
    tier: 5,
    name: "Diamond",
    minCredits: 100000,
    maxCredits: 999999,
    color: "#B9F2FF",
    icon: "diamond_ring",
    ringStyle: "gradient 4px diamond",
    badgeGlow: true,
    animationLevel: "medium"
  },
  {
    tier: 6,
    name: "Obsidian",
    minCredits: 1000000,
    maxCredits: Infinity,
    color: "#0D0D0D",
    icon: "obsidian_crown",
    ringStyle: "animated 5px obsidian",
    badgeGlow: true,
    animationLevel: "intense"
  }
];
```

---

## 6. Test Data Generation

### Automated User Creation Script
```typescript
async function createTestPersonas(db: Database) {
  const personas = [
    createNovaFresh(),
    createRookieTrainee(),
    createActiveAndy(),
    createEliteEve(),
    createLegendLeo(),
    createDiamondDan(),
    createGhostPrivate(),
    createRecoverRay(),
    createSilverSally(),
    createWheelWalter(),
    createNinjaNat(),
    createSleepySam(),
    createBannedBob(),
    createCoachCarol(),
    createStudentSteve()
  ];

  for (const persona of personas) {
    await db.transaction(async (tx) => {
      // Create user
      const userId = await tx.insert('users', persona.user);

      // Create credit balance
      await tx.insert('credit_balances', {
        user_id: userId,
        balance: persona.credits,
        lifetime_earned: persona.lifetimeEarned
      });

      // Create stats
      await tx.insert('character_stats', {
        user_id: userId,
        ...persona.stats
      });

      // Create workouts
      for (const workout of persona.workouts) {
        await tx.insert('workouts', { ...workout, user_id: userId });
      }

      // Create social connections
      for (const follow of persona.follows) {
        await tx.insert('user_follows', { follower_id: userId, following_id: follow });
      }
    });
  }
}
```

---

## Next Steps

1. **Stage 3:** Build test harness with scripting system
2. **Stage 4:** Run simulations with all personas
3. **Stage 5:** Analyze results and identify gaps
4. **Stage 6:** Create refactoring plan

---

*These personas provide comprehensive coverage of all user states and feature interactions.*
