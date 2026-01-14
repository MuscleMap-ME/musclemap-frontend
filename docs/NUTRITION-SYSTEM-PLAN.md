# MuscleMap Nutrition System - Comprehensive Implementation Plan

**Created:** January 14, 2026
**Version:** 1.0
**Status:** Planning

---

## Executive Summary

This document outlines a comprehensive nutrition tracking system for MuscleMap that:
1. **Is Binary/Optional** - Users can enable/disable nutrition tracking at any time
2. **Is Deeply Integrated** - Connects with workouts, prescriptions, community, goals, and archetypes
3. **Exceeds Competitors** - Creates a superset of features from MyFitnessPal, Cronometer, MacroFactor, and more
4. **Is Mobile-First** - Touchscreen-optimized, beautiful, visual-first design
5. **Leverages Free Data Sources** - USDA, Open Food Facts, FatSecret APIs

---

## Table of Contents

1. [Market Analysis & Competitor Features](#1-market-analysis--competitor-features)
2. [Data Sources & APIs](#2-data-sources--apis)
3. [Core Architecture](#3-core-architecture)
4. [Feature Specifications](#4-feature-specifications)
5. [UI/UX Design](#5-uiux-design)
6. [Integration Points](#6-integration-points)
7. [Community Features](#7-community-features)
8. [Database Schema](#8-database-schema)
9. [Implementation Phases](#9-implementation-phases)
10. [Success Metrics](#10-success-metrics)

---

## 1. Market Analysis & Competitor Features

### Competitor Feature Matrix

| Feature | MyFitnessPal | Cronometer | MacroFactor | Fitbod | **MuscleMap** |
|---------|--------------|------------|-------------|--------|---------------|
| Food Database Size | 20M+ | 300K verified | 26.5K research-grade | N/A | **Hybrid (best of all)** |
| Barcode Scanning | Yes | Yes | Yes | No | **Yes** |
| AI Photo Recognition | Premium | No | Yes | No | **Yes (free tier)** |
| Macro Tracking | Yes | Yes | Yes | No | **Yes** |
| Micronutrients (84+) | Premium | Yes | Limited | No | **Yes** |
| Meal Planning | Premium | No | No | No | **Yes + AI** |
| Workout Integration | Basic | Basic | No | Yes | **Deep** |
| Community Sharing | Limited | No | No | No | **Full** |
| Muscle-Specific Nutrition | No | No | No | No | **Yes (unique)** |
| Archetype-Based Recommendations | No | No | No | No | **Yes (unique)** |
| Recovery-Aware Nutrition | No | No | Partial | Yes | **Yes** |
| Gamification | Streaks only | No | No | No | **Full XP/Credits** |

### MuscleMap Differentiators (Unique Features)

1. **Muscle-Specific Nutrition** - Protein recommendations based on trained muscle groups
2. **Archetype Nutrition Paths** - Diet templates aligned with archetypes (Warrior, Guardian, etc.)
3. **Workout-Nutrition Sync** - Automatic calorie/macro adjustment based on TU expenditure
4. **Community Meal Sharing** - Share meals, recipes, get props from crew
5. **Visual Nutrient Body Map** - See how nutrients affect different body systems
6. **Competition Diet Challenges** - Community diet competitions with leaderboards
7. **AI Coach Integration** - Nutrition advice tailored to training goals

---

## 2. Data Sources & APIs

### Primary Data Sources (Priority Order)

#### Tier 1: Free & Open Source

| Source | Coverage | Features | Cost |
|--------|----------|----------|------|
| **USDA FoodData Central** | 300K+ FDA-verified US foods | Research-grade accuracy, full micronutrients | Free, unlimited |
| **Open Food Facts** | 2.8M+ products, 150+ countries | Barcode data, international coverage, community-updated | Free, open source |

#### Tier 2: Freemium APIs

| Source | Free Tier | Features | Paid Tier |
|--------|-----------|----------|-----------|
| **FatSecret Platform** | 5,000 calls/day | 1.9M+ foods, global coverage | $199/mo for 50K/day |
| **Nutritionix** | 2 active users/mo | 800K+ branded/restaurant items | $1,850/mo enterprise |
| **Edamam** | 100 calls/day | Recipe analysis, meal planning | $99/mo for 10K/day |

#### Tier 3: Specialized Sources

| Source | Purpose | Integration |
|--------|---------|-------------|
| **OpenFoodRepo** | Swiss/European foods | REST API |
| **FoodRepo** | Academic research data | Bulk download |
| **MyFitnessPal Public** | Supplement data (scraping) | Rate-limited |

### Recommended Data Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    FOOD SEARCH FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Input (text/barcode/photo)                                │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────┐                                            │
│  │ Local Cache     │◄── Recently used foods (instant)           │
│  │ (PostgreSQL)    │                                            │
│  └────────┬────────┘                                            │
│           │ miss                                                 │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ Open Food Facts │◄── Barcode lookups (2.8M products)         │
│  │ (Free API)      │                                            │
│  └────────┬────────┘                                            │
│           │ miss                                                 │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ USDA FoodData   │◄── Generic foods (research-grade)          │
│  │ (Free API)      │                                            │
│  └────────┬────────┘                                            │
│           │ miss                                                 │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ FatSecret       │◄── Restaurant/branded (5K/day free)        │
│  │ (Freemium)      │                                            │
│  └────────┬────────┘                                            │
│           │ miss                                                 │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ Custom Food     │◄── User creates new entry                  │
│  │ Entry Form      │                                            │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### AI Photo Recognition Strategy

**Option A: Self-Hosted (Recommended for Privacy)**
- Use Calorie Mama AI API (pay-per-call)
- $0.01-0.05 per recognition
- High accuracy for common foods

**Option B: Client-Side ML (Long-term)**
- TensorFlow.js model running in browser/mobile
- Train on Open Food Facts images
- Zero API costs, works offline

**Option C: Hybrid**
- Client-side for common foods
- Cloud fallback for complex dishes
- Best accuracy/cost balance

---

## 3. Core Architecture

### Binary Enable/Disable System

```typescript
// User preference schema
interface NutritionPreferences {
  enabled: boolean;              // Master toggle
  enabledAt?: Date;              // When they enabled
  disabledAt?: Date;             // When they disabled
  dataRetention: 'keep' | 'delete'; // What happens to data on disable

  // Granular controls
  showOnDashboard: boolean;
  showInCommunity: boolean;
  shareWithCrew: boolean;

  // Goal settings
  trackingMode: 'calories' | 'macros' | 'detailed'; // Level of detail
  goalType: 'lose' | 'maintain' | 'gain' | 'custom';

  // Integration toggles
  syncWithWorkouts: boolean;     // Auto-adjust for workout days
  syncWithRecovery: boolean;     // Factor in recovery needs
  syncWithArchetype: boolean;    // Archetype-specific recommendations
}
```

### Module Structure

```
apps/api/src/modules/nutrition/
├── index.ts                    # Module registration
├── nutrition.service.ts        # Core business logic
├── food-search.service.ts      # Multi-source food search
├── meal-log.service.ts         # Meal logging CRUD
├── macro-calculator.service.ts # TDEE/macro calculations
├── meal-plan.service.ts        # AI meal planning
├── recipe.service.ts           # Recipe management
├── nutrition-goals.service.ts  # Goal tracking
├── integrations/
│   ├── usda.client.ts         # USDA FoodData Central
│   ├── openfoodfacts.client.ts # Open Food Facts
│   ├── fatsecret.client.ts    # FatSecret Platform
│   └── ai-recognition.ts      # Photo recognition
└── types.ts                    # TypeScript interfaces
```

### State Management (Frontend)

```javascript
// New Zustand store: src/store/nutritionStore.js
const useNutritionStore = create((set, get) => ({
  // Enable state
  enabled: false,
  preferences: null,

  // Daily tracking
  todaysMeals: [],
  todaysTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  dailyGoals: null,

  // Actions
  enable: async () => { /* API call */ },
  disable: async () => { /* API call */ },
  logMeal: async (meal) => { /* API call */ },
  deleteMeal: async (mealId) => { /* API call */ },

  // Computed
  remainingCalories: () => get().dailyGoals?.calories - get().todaysTotals.calories,
  macroPercentages: () => { /* calculate */ },
}));

// Shorthand hooks
export const useNutritionEnabled = () => useNutritionStore(s => s.enabled);
export const useDailyNutrition = () => useNutritionStore(s => ({
  meals: s.todaysMeals,
  totals: s.todaysTotals,
  goals: s.dailyGoals,
  remaining: s.remainingCalories(),
}));
```

---

## 4. Feature Specifications

### 4.1 Food Logging

#### Quick Log (Most Common)

**User Story:** As a user, I want to quickly log a meal in under 10 seconds so that tracking doesn't become a chore.

**Features:**
- [ ] Voice input: "Log 2 eggs and toast with butter"
- [ ] Barcode scanner with instant recognition
- [ ] AI photo recognition with portion estimation
- [ ] Recent foods (last 20) one-tap add
- [ ] Frequent foods learned from history
- [ ] Meal copy from previous days
- [ ] Quick calories (just enter number, no food lookup)

**UI Flow:**
```
┌────────────────────────────────────────┐
│  What did you eat?                     │
│                                        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │ 📷   │ │ 🎤   │ │ 📊   │ │ ⌨️   │  │
│  │Photo │ │Voice │ │Scan  │ │Type  │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│                                        │
│  ─────── Recent Foods ───────         │
│  🥚 2 Eggs          → 156 cal  [+]    │
│  🍞 Whole Wheat     → 80 cal   [+]    │
│  🥛 Protein Shake   → 220 cal  [+]    │
│                                        │
│  ─────── Favorites ───────            │
│  🥗 My Power Salad  → 450 cal  [+]    │
│  🍗 Chicken & Rice  → 520 cal  [+]    │
└────────────────────────────────────────┘
```

#### Detailed Food Entry

**Features:**
- [ ] Food search with autocomplete
- [ ] Portion size selector (grams, oz, cups, servings)
- [ ] Custom serving definitions
- [ ] Meal assignment (breakfast, lunch, dinner, snacks)
- [ ] Time of consumption
- [ ] Notes field
- [ ] Photo attachment
- [ ] Restaurant/brand selector

### 4.2 Macro & Micronutrient Tracking

#### Macro Dashboard

**Display Modes:**
1. **Simple Mode** - Calories only with circular progress
2. **Macro Mode** - Calories + Protein/Carbs/Fat bars
3. **Detailed Mode** - Full nutrient breakdown (84 nutrients)

**Visual Design (Glass Morphism):**
```
┌─────────────────────────────────────────────────────┐
│  Today's Nutrition          Jan 14, 2026           │
│  ═══════════════════════════════════════════════   │
│                                                     │
│       ┌───────────────────────┐                    │
│       │      1,847           │                    │
│       │     ───────          │     Remaining:     │
│       │      2,400           │      553 cal       │
│       │                       │                    │
│       │   ████████████░░░░   │     77% daily      │
│       └───────────────────────┘                    │
│                                                     │
│  ┌────────────┬────────────┬────────────┐         │
│  │  PROTEIN   │   CARBS    │    FAT     │         │
│  │  142g/180g │  185g/240g │   62g/80g  │         │
│  │ ████████░░ │ ███████░░░ │ ████████░░ │         │
│  │    79%     │    77%     │    78%     │         │
│  └────────────┴────────────┴────────────┘         │
│                                                     │
│  [Tap for detailed nutrient breakdown →]           │
└─────────────────────────────────────────────────────┘
```

#### Micronutrient Tracking (Detailed Mode)

**Categories:**
- Vitamins (A, B1-B12, C, D, E, K)
- Minerals (Iron, Zinc, Magnesium, Calcium, Potassium, Sodium)
- Fiber & Water
- Cholesterol, Saturated Fat, Trans Fat
- Omega-3/Omega-6 ratio
- Amino acid profile (for muscle recovery)

### 4.3 Meal Planning

#### AI-Powered Meal Generator

**User Story:** As a user, I want the app to suggest meals that fit my remaining macros so that I hit my goals effortlessly.

**Features:**
- [ ] "Fill My Day" - Generate meals to hit daily targets
- [ ] Meal swap suggestions (don't like suggestion? Get alternatives)
- [ ] Cuisine preference filters
- [ ] Dietary restriction support (vegan, keto, halal, gluten-free)
- [ ] Budget-aware suggestions (cheap ingredients)
- [ ] Prep time filters (quick, medium, meal prep)
- [ ] Ingredient exclusions (allergies, dislikes)

**AI Prompt Flow:**
```
User Context:
- Remaining macros: 600 cal, 45g protein, 60g carbs, 20g fat
- Preferences: Mediterranean, no shellfish
- Time available: 30 minutes
- Goal: Muscle gain (archetype: Warrior)

AI generates 3 meal options with:
- Ingredients list
- Macros breakdown
- Recipe steps
- Difficulty rating
- Cost estimate
```

#### Weekly Meal Plan

**Features:**
- [ ] 7-day meal plan generator
- [ ] Drag-and-drop meal rearrangement
- [ ] Shopping list auto-generation
- [ ] Ingredient quantity aggregation
- [ ] Store aisle organization
- [ ] Price estimation
- [ ] Plan sharing with crew/community

### 4.4 Recipe Management

#### Recipe Database

**Sources:**
1. **MuscleMap Curated** - Nutrition-optimized recipes by archetype
2. **Community Recipes** - User-submitted, rated recipes
3. **Web Import** - Import from external recipe URLs
4. **Custom Creation** - Build from scratch

**Recipe Card Structure:**
```typescript
interface Recipe {
  id: string;
  name: string;
  description: string;

  // Nutrition
  servings: number;
  macrosPerServing: MacroSet;
  micronutrients: Nutrient[];

  // Preparation
  prepTime: number;           // minutes
  cookTime: number;           // minutes
  difficulty: 'easy' | 'medium' | 'hard';

  // Ingredients
  ingredients: RecipeIngredient[];

  // Instructions
  steps: RecipeStep[];

  // Meta
  cuisine: string;
  dietaryTags: string[];      // vegan, keto, etc.
  allergens: string[];

  // Community
  authorId: string;
  rating: number;
  ratingCount: number;
  saveCount: number;

  // Archetype alignment
  archetypeBonus?: string;    // "Recommended for Warrior"
  muscleGroups?: string[];    // "Great for leg day recovery"
}
```

### 4.5 Goal Setting & Progress

#### Dynamic Goal Calculation

**TDEE Calculation Factors:**
- Base metabolic rate (age, weight, height, sex)
- Activity level (sedentary → very active)
- Workout activity (from logged TU)
- Goal type (deficit, maintenance, surplus)
- Archetype modifiers (Warrior +10% protein, etc.)

**Adaptive Algorithm:**
```typescript
// Inspired by MacroFactor's approach
interface AdaptiveGoals {
  // Calculated weekly based on:
  // 1. Weight trend (actual vs expected)
  // 2. Logged intake (adherence)
  // 3. Training load (TU from workouts)
  // 4. Recovery status

  calories: number;
  protein: number;      // Always high for muscle preservation
  carbs: number;        // Varies by workout intensity
  fat: number;          // Minimum for hormonal health

  // Adjustments
  workoutDayBonus: number;     // Extra calories on training days
  restDayAdjustment: number;   // Reduced calories on rest

  // Confidence
  calculatedAt: Date;
  nextRecalculation: Date;
  confidenceScore: number;     // Based on data quality
}
```

### 4.6 Workout-Nutrition Sync (Unique Feature)

#### Automatic Adjustments

**Post-Workout Nutrition:**
```typescript
// When workout completed, nutrition adjusts:
async function onWorkoutCompleted(workout: Workout) {
  const tuBurned = calculateTU(workout);
  const musclesTrained = getMuscleGroups(workout);

  // Adjust today's remaining macros
  const adjustment = {
    calories: tuBurned * CALORIES_PER_TU,
    protein: musclesTrained.length * PROTEIN_PER_MUSCLE_GROUP,
    carbs: workout.intensity === 'high' ? CARB_BOOST : 0,
  };

  // Suggest post-workout meal
  const suggestion = await generateMealSuggestion({
    macrosNeeded: adjustment,
    timing: 'post-workout',
    musclesWorked: musclesTrained,
  });

  return { adjustment, suggestion };
}
```

#### Pre-Workout Recommendations

**Based on scheduled workout:**
```
┌────────────────────────────────────────────┐
│  🏋️ Upcoming: Heavy Leg Day (2:00 PM)      │
│                                            │
│  Nutrition Prep Recommendations:           │
│                                            │
│  ⏰ 3 hours before:                        │
│     Complex carbs meal (oatmeal, rice)     │
│     Target: 60g carbs, 30g protein         │
│                                            │
│  ⏰ 30 min before:                         │
│     Light snack (banana, coffee)           │
│     Target: 25g carbs, caffeine boost      │
│                                            │
│  [Plan Pre-Workout Meals →]                │
└────────────────────────────────────────────┘
```

### 4.7 Daily Monitor/Log

#### Timeline View

**Visual daily log showing:**
- Meals logged with times
- Workout activities
- Water intake
- Supplements taken
- Energy/mood tracking (optional)
- Photos of meals

**Example UI:**
```
┌─────────────────────────────────────────────┐
│  Today's Timeline         Jan 14, 2026     │
│                                             │
│  07:30 ──────────────────────────────────  │
│  │ 🍳 Breakfast                             │
│  │ Eggs, avocado toast, coffee              │
│  │ 485 cal | P: 28g | C: 32g | F: 28g      │
│  │ [📷 photo attached]                      │
│                                             │
│  10:00 ──────────────────────────────────  │
│  │ 🥤 Snack                                 │
│  │ Protein shake + banana                   │
│  │ 320 cal | P: 35g | C: 28g | F: 8g       │
│                                             │
│  12:30 ──────────────────────────────────  │
│  │ 🏋️ WORKOUT                              │
│  │ Push Day - 45 min - 142 TU              │
│  │ Burned: ~380 cal                         │
│  │ [View Workout →]                         │
│                                             │
│  13:15 ──────────────────────────────────  │
│  │ 🍗 Lunch (post-workout)                  │
│  │ Grilled chicken, rice, vegetables        │
│  │ 620 cal | P: 48g | C: 65g | F: 14g      │
│                                             │
│  [ + Log Food ] [ + Log Water ] [ + Note ] │
└─────────────────────────────────────────────┘
```

### 4.8 AI Coach & Insights

#### Nutrition AI Coach

**Capabilities:**
- Answer nutrition questions
- Explain macro recommendations
- Suggest food swaps
- Identify nutrient gaps
- Provide meal timing advice
- Explain workout-nutrition relationship

**Example Interactions:**
```
User: "Why do I need more protein on leg day?"

AI Coach: "Great question! Your legs contain the largest muscle
groups in your body - quads, hamstrings, and glutes. When you
train them heavily, you create more muscle protein synthesis
demand than upper body days.

Today you trained legs with 142 TU, targeting approximately
62% of your total muscle mass. I've increased your protein
target by 25g (from 155g to 180g) to support optimal recovery.

Try to get most of this within 4 hours post-workout. Would you
like me to suggest some high-protein meal options?"
```

#### Weekly Insights

**Auto-generated weekly report:**
- Macro adherence score
- Best/worst adherence days
- Common nutrient deficiencies
- Meal timing patterns
- Workout-nutrition correlation
- Suggestions for improvement

---

## 5. UI/UX Design

### Design Principles

1. **Mobile-First, Touch-Optimized**
   - Minimum 44px touch targets
   - Swipe gestures for common actions
   - Bottom sheet modals (thumb-friendly)
   - Pull-to-refresh patterns

2. **Visual-First Data**
   - Progress rings over numbers
   - Color-coded macro bars
   - Food photos prominently displayed
   - Minimal text, maximum clarity

3. **Glass Morphism Consistency**
   - Match existing MuscleMap design system
   - GlassSurface for all cards
   - Frosted overlays for modals
   - Subtle gradients and glows

### Key Screens

#### 1. Nutrition Toggle (Settings)

```
┌─────────────────────────────────────────────┐
│  Settings > Features                        │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  🥗 Nutrition Tracking              │   │
│  │                                      │   │
│  │  Track meals, macros, and get       │   │
│  │  personalized nutrition guidance    │   │
│  │  aligned with your training.        │   │
│  │                                      │   │
│  │  ┌────────────────────────────┐     │   │
│  │  │      ENABLE NUTRITION      │     │   │
│  │  │          [Toggle ○]        │     │   │
│  │  └────────────────────────────┘     │   │
│  │                                      │   │
│  │  Your data, your choice. Disable    │   │
│  │  anytime and choose to keep or      │   │
│  │  delete your nutrition history.     │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

#### 2. Nutrition Dashboard Card (Main Dashboard)

```
┌─────────────────────────────────────────────┐
│  ┌───────────────────────────────────────┐ │
│  │  Today's Nutrition         77%       │ │
│  │                                       │ │
│  │  ┌─────────────────────────────────┐ │ │
│  │  │  [====================░░░░░░░]  │ │ │
│  │  │  1,847 / 2,400 cal              │ │ │
│  │  └─────────────────────────────────┘ │ │
│  │                                       │ │
│  │  P: ████████░░ 142/180g   79%       │ │
│  │  C: ███████░░░ 185/240g   77%       │ │
│  │  F: ████████░░  62/80g    78%       │ │
│  │                                       │ │
│  │  Next: 553 cal remaining             │ │
│  │  💡 Suggest a dinner that fits →     │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### 3. Food Logging Modal (Bottom Sheet)

```
┌─────────────────────────────────────────────┐
│  ═════════════════════════════════════════  │
│                                             │
│  Log Food                          [×]     │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  🔍 Search foods...                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐         │
│  │  📷    │ │  📊    │ │  🎤    │         │
│  │ Photo  │ │ Scan   │ │ Voice  │         │
│  └────────┘ └────────┘ └────────┘         │
│                                             │
│  ─────── Quick Add ───────                 │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🥚 Eggs (2 large)           156 cal │   │
│  │ 🍞 Whole wheat toast         80 cal │   │
│  │ 🥛 Protein shake            220 cal │   │
│  │ 🍌 Banana                    105 cal │   │
│  │ 🥗 My Power Salad           450 cal │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ─────── Meals ───────                     │
│  [Breakfast] [Lunch] [Dinner] [Snack]      │
│                                             │
└─────────────────────────────────────────────┘
```

#### 4. Full Nutrition Page

```
/nutrition - Full-page nutrition experience:

┌─────────────────────────────────────────────┐
│  ◀ Back    Nutrition    Today ▾    ⚙️      │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │         DAILY SUMMARY                 │ │
│  │    [Large circular progress ring]     │ │
│  │         1,847 / 2,400                 │ │
│  │          553 remaining                │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌─────────┬─────────┬─────────┐          │
│  │ Protein │  Carbs  │   Fat   │          │
│  │  142g   │  185g   │   62g   │          │
│  │  /180g  │  /240g  │  /80g   │          │
│  └─────────┴─────────┴─────────┘          │
│                                             │
│  ─── Today's Meals ───                     │
│                                             │
│  🌅 Breakfast                    485 cal   │
│  │  Eggs, avocado, toast...              │ │
│                                             │
│  ☀️ Morning Snack                320 cal   │
│  │  Protein shake, banana                │ │
│                                             │
│  🏋️ Workout                    -380 cal   │
│  │  Push Day • 45 min                    │ │
│                                             │
│  🌞 Lunch                        620 cal   │
│  │  Chicken, rice, vegetables            │ │
│                                             │
│          ┌─────────────────┐              │
│          │   + LOG FOOD    │              │
│          └─────────────────┘              │
└─────────────────────────────────────────────┘
```

### Mobile-Specific Interactions

1. **Swipe Actions:**
   - Swipe meal left → Delete
   - Swipe meal right → Copy to today
   - Pull down → Refresh data
   - Pull up on dashboard card → Expand to full view

2. **Haptic Feedback:**
   - Success vibration on meal logged
   - Warning vibration when over calories
   - Celebration haptic on hitting daily goal

3. **Quick Actions (3D Touch / Long Press):**
   - Long press meal → Edit, Delete, Copy
   - Long press + button → Voice log, Photo log
   - Long press macro bar → Detailed breakdown

---

## 6. Integration Points

### 6.1 Workout Integration

**Prescription Enhancement:**
```typescript
// Enhanced prescription with nutrition context
interface NutritionAwarePrescription {
  workout: Workout;

  // Pre-workout
  preWorkoutMealSuggestion?: MealSuggestion;
  optimalMealTiming: Date;

  // Post-workout
  postWorkoutMealSuggestion?: MealSuggestion;
  proteinTarget: number;        // Based on muscle groups
  carbTarget: number;           // Based on intensity

  // Context
  userNutritionToday: DailyNutrition;
  calorieAdjustment: number;    // Added to daily goal
}
```

**Workout Completion Hook:**
```typescript
// apps/api/src/http/routes/workouts.ts
fastify.post('/workouts', async (req, reply) => {
  // ... existing workout logging logic ...

  // NEW: Nutrition integration
  if (user.nutritionEnabled) {
    const nutritionAdjustment = calculateNutritionAdjustment(workout);
    await nutritionService.adjustDailyGoals(userId, nutritionAdjustment);

    // Suggest post-workout meal
    const suggestion = await nutritionService.suggestPostWorkoutMeal({
      musclesTrained: workout.muscleGroups,
      remainingMacros: await nutritionService.getRemainingMacros(userId),
    });

    return { workout, nutritionAdjustment, suggestion };
  }

  return { workout };
});
```

### 6.2 Goal System Integration

**Goals + Nutrition Alignment:**
```typescript
// When user sets/updates goal
async function onGoalUpdated(userId: string, goal: UserGoal) {
  if (!user.nutritionEnabled) return;

  // Adjust nutrition targets based on goal
  switch (goal.type) {
    case 'weight_loss':
      await adjustNutritionForDeficit(userId, goal.targetWeight);
      break;
    case 'muscle_gain':
      await adjustNutritionForSurplus(userId, goal.targetWeight);
      break;
    case 'body_recomposition':
      await adjustNutritionForRecomp(userId);
      break;
  }
}
```

### 6.3 Archetype Integration (Unique Feature)

**Archetype-Specific Nutrition Paths:**

| Archetype | Focus | Macro Split | Special Foods |
|-----------|-------|-------------|---------------|
| **Warrior** | Strength & power | High protein (35%), mod carbs (40%), mod fat (25%) | Red meat, eggs, complex carbs |
| **Guardian** | Endurance & resilience | Balanced (30/45/25) | Whole grains, legumes, steady energy |
| **Athlete** | Performance | Carb cycling (varies) | Timing-focused, workout-specific |
| **Sentinel** | Tactical readiness | High protein (35%), low carb (30%), high fat (35%) | Keto-friendly, sustained energy |
| **Titan** | Mass building | High everything | Caloric surplus focus |
| **Phoenix** | Recovery & healing | Anti-inflammatory | Omega-3s, antioxidants, healing foods |

**Implementation:**
```typescript
const archetypeNutritionProfiles: Record<Archetype, NutritionProfile> = {
  warrior: {
    name: 'Warrior Fuel',
    description: 'Power-focused nutrition for maximum strength',
    macroSplit: { protein: 0.35, carbs: 0.40, fat: 0.25 },
    priorityNutrients: ['protein', 'creatine', 'iron'],
    mealTiming: 'around-training',
    suggestedFoods: ['lean beef', 'eggs', 'oats', 'sweet potato'],
    avoidFoods: [],
    dailyProteinMultiplier: 1.1,  // 10% more protein than baseline
  },
  // ... other archetypes
};
```

### 6.4 Credits Economy Integration

**Earning Credits via Nutrition:**
- Log all meals for a day: +5 credits
- Hit daily goals: +10 credits
- 7-day logging streak: +25 credits
- Share a recipe that gets 10+ saves: +50 credits
- Complete weekly meal plan: +30 credits

### 6.5 Character Stats Integration

**Nutrition affects character stats:**
- Consistent protein intake → +Constitution
- Hitting macro targets → +Vitality
- Nutrition logging streak → +Endurance
- Community recipe contributions → +Charisma (if exists)

---

## 7. Community Features

### 7.1 Meal Sharing

**Share Options:**
- Share to activity feed
- Share to crew/hangout
- Share to archetype community
- Direct share to friend

**Meal Post Structure:**
```typescript
interface MealPost {
  mealLogId: string;
  userId: string;

  // Display
  photo?: string;
  caption?: string;

  // Nutrition (optional visibility)
  showMacros: boolean;
  showCalories: boolean;
  showRecipe: boolean;

  // Engagement
  props: PropCount;
  comments: Comment[];
  saves: number;

  // Context
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  postWorkout: boolean;
  musclesWorked?: string[];    // If post-workout
}
```

### 7.2 Community Recipes

**Recipe Sharing:**
- Share custom recipes publicly
- Rate and review community recipes
- Fork and modify recipes
- Save recipes to personal cookbook
- Filter by archetype, dietary restrictions, prep time

**Recipe Leaderboard:**
- Most saved recipes (weekly/monthly/all-time)
- Highest rated recipes
- Most popular by archetype
- Trending recipes

### 7.3 Diet Challenges/Competitions

**Challenge Types:**
1. **Consistency Challenge** - Log meals for X consecutive days
2. **Macro Mastery** - Hit macro targets for X days
3. **Clean Eating** - Log only whole foods for a week
4. **Archetype Challenge** - Follow archetype nutrition path for 30 days
5. **Crew Challenge** - Team average adherence competition

**Competition Structure:**
```typescript
interface NutritionCompetition {
  id: string;
  name: string;
  type: 'consistency' | 'macro_mastery' | 'clean_eating' | 'archetype' | 'crew';

  // Rules
  startDate: Date;
  endDate: Date;
  rules: CompetitionRule[];

  // Scoring
  scoringMethod: 'points' | 'percentage' | 'streak';

  // Prizes
  creditReward: number;
  achievementId?: string;

  // Participants
  participants: CompetitionParticipant[];
  leaderboard: LeaderboardEntry[];
}
```

### 7.4 Crew Meal Planning

**Crew Features:**
- Shared meal plans for crews
- Crew grocery list aggregation
- Group meal prep coordination
- Crew nutrition leaderboard

### 7.5 Mentor/Trainer Nutrition Coaching

**For Premium/Trainer Tier:**
- Trainers can view client nutrition logs
- Custom macro assignment
- Meal plan creation for clients
- Nutrition feedback/notes

---

## 8. Database Schema

### New Tables

```sql
-- Migration: 067_nutrition_system.ts

-- User nutrition preferences (binary toggle + settings)
CREATE TABLE user_nutrition_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Master toggle
  enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,

  -- Display preferences
  tracking_mode VARCHAR(20) DEFAULT 'macros',  -- calories, macros, detailed
  show_on_dashboard BOOLEAN DEFAULT true,
  show_in_community BOOLEAN DEFAULT true,
  share_with_crew BOOLEAN DEFAULT false,

  -- Goal settings
  goal_type VARCHAR(20) DEFAULT 'maintain',  -- lose, maintain, gain, custom
  custom_calories INTEGER,
  custom_protein_g INTEGER,
  custom_carbs_g INTEGER,
  custom_fat_g INTEGER,

  -- Archetype sync
  sync_with_archetype BOOLEAN DEFAULT true,
  sync_with_workouts BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Calculated nutrition goals (recalculated weekly)
CREATE TABLE nutrition_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Base goals
  calories INTEGER NOT NULL,
  protein_g INTEGER NOT NULL,
  carbs_g INTEGER NOT NULL,
  fat_g INTEGER NOT NULL,

  -- Workout day adjustments
  workout_day_calories INTEGER NOT NULL,
  workout_day_protein_g INTEGER NOT NULL,

  -- Calculation metadata
  tdee INTEGER NOT NULL,
  bmr INTEGER NOT NULL,
  activity_multiplier DECIMAL(3,2) NOT NULL,
  goal_adjustment INTEGER NOT NULL,  -- negative for deficit

  -- Valid period
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL,

  UNIQUE(user_id)  -- Only one active goal set per user
);

CREATE INDEX idx_nutrition_goals_user ON nutrition_goals(user_id);

-- Food database cache (local copy of external data)
CREATE TABLE foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- External references
  source VARCHAR(50) NOT NULL,  -- usda, openfoodfacts, fatsecret, custom
  external_id VARCHAR(100),
  barcode VARCHAR(50),

  -- Basic info
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255),
  description TEXT,

  -- Serving info
  serving_size_g DECIMAL(10,2),
  serving_unit VARCHAR(50),
  serving_description VARCHAR(100),

  -- Macros (per serving)
  calories INTEGER NOT NULL,
  protein_g DECIMAL(10,2),
  carbs_g DECIMAL(10,2),
  fat_g DECIMAL(10,2),
  fiber_g DECIMAL(10,2),
  sugar_g DECIMAL(10,2),

  -- Micronutrients (JSON for flexibility)
  micronutrients JSONB,  -- { vitamin_a_iu: 500, iron_mg: 2.5, ... }

  -- Meta
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(source, external_id)
);

CREATE INDEX idx_foods_barcode ON foods(barcode);
CREATE INDEX idx_foods_name_search ON foods USING GIN(to_tsvector('english', name));
CREATE INDEX idx_foods_source ON foods(source);

-- User's custom foods
CREATE TABLE custom_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255),

  -- Serving info
  serving_size_g DECIMAL(10,2) NOT NULL,
  serving_unit VARCHAR(50),
  serving_description VARCHAR(100),

  -- Macros
  calories INTEGER NOT NULL,
  protein_g DECIMAL(10,2),
  carbs_g DECIMAL(10,2),
  fat_g DECIMAL(10,2),

  -- Visibility
  is_public BOOLEAN DEFAULT false,  -- Share with community

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_custom_foods_user ON custom_foods(user_id);

-- Meal logs (core logging table)
CREATE TABLE meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Timing
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meal_date DATE NOT NULL,
  meal_type VARCHAR(20) NOT NULL,  -- breakfast, lunch, dinner, snack

  -- Food reference
  food_id UUID REFERENCES foods(id),
  custom_food_id UUID REFERENCES custom_foods(id),
  recipe_id UUID REFERENCES recipes(id),

  -- If quick entry (no food reference)
  quick_entry_name VARCHAR(255),

  -- Quantity
  servings DECIMAL(5,2) NOT NULL DEFAULT 1,
  grams DECIMAL(10,2),  -- Optional override

  -- Calculated totals (denormalized for query performance)
  total_calories INTEGER NOT NULL,
  total_protein_g DECIMAL(10,2),
  total_carbs_g DECIMAL(10,2),
  total_fat_g DECIMAL(10,2),

  -- Optional
  notes TEXT,
  photo_url VARCHAR(500),

  -- Workout context
  workout_id UUID REFERENCES workouts(id),  -- If post-workout meal

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meal_logs_user_date ON meal_logs(user_id, meal_date DESC);
CREATE INDEX idx_meal_logs_keyset ON meal_logs(user_id, logged_at DESC, id DESC);

-- Daily nutrition summaries (materialized for dashboard performance)
CREATE TABLE daily_nutrition_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,

  -- Totals
  total_calories INTEGER NOT NULL DEFAULT 0,
  total_protein_g DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_carbs_g DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_fat_g DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Goals for that day
  goal_calories INTEGER,
  goal_protein_g INTEGER,
  goal_carbs_g INTEGER,
  goal_fat_g INTEGER,

  -- Workout context
  was_workout_day BOOLEAN DEFAULT false,
  workout_tu INTEGER,

  -- Meal counts
  meal_count INTEGER NOT NULL DEFAULT 0,
  meals_logged JSONB,  -- { breakfast: true, lunch: true, ... }

  -- Adherence scores (0-100)
  calorie_adherence INTEGER,
  macro_adherence INTEGER,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, summary_date)
);

CREATE INDEX idx_daily_summaries_user_date ON daily_nutrition_summaries(user_id, summary_date DESC);

-- Recipes
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Servings
  servings INTEGER NOT NULL DEFAULT 1,

  -- Per-serving macros
  calories_per_serving INTEGER NOT NULL,
  protein_per_serving DECIMAL(10,2),
  carbs_per_serving DECIMAL(10,2),
  fat_per_serving DECIMAL(10,2),

  -- Prep info
  prep_time_min INTEGER,
  cook_time_min INTEGER,
  difficulty VARCHAR(20),  -- easy, medium, hard

  -- Content
  ingredients JSONB NOT NULL,  -- [{ food_id, quantity, unit, notes }]
  steps JSONB NOT NULL,        -- [{ order, instruction, duration_min, tip }]

  -- Tags
  cuisine VARCHAR(50),
  dietary_tags TEXT[],  -- vegan, keto, gluten-free, etc.
  allergens TEXT[],

  -- Archetype alignment
  archetype_bonus VARCHAR(50),  -- Recommended for which archetype
  muscle_groups TEXT[],         -- Good for recovery after these muscles

  -- Media
  photo_url VARCHAR(500),

  -- Community
  is_public BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recipes_author ON recipes(author_id);
CREATE INDEX idx_recipes_public ON recipes(is_public) WHERE is_public = true;
CREATE INDEX idx_recipes_dietary ON recipes USING GIN(dietary_tags);

-- Recipe saves (user saved recipes)
CREATE TABLE recipe_saves (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY(user_id, recipe_id)
);

-- Recipe ratings
CREATE TABLE recipe_ratings (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY(user_id, recipe_id)
);

-- Meal plans
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Duration
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Goals for this plan
  daily_calories INTEGER,
  daily_protein_g INTEGER,
  daily_carbs_g INTEGER,
  daily_fat_g INTEGER,

  -- Status
  status VARCHAR(20) DEFAULT 'draft',  -- draft, active, completed

  -- Source
  ai_generated BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meal plan items
CREATE TABLE meal_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,

  plan_date DATE NOT NULL,
  meal_type VARCHAR(20) NOT NULL,

  -- What to eat
  recipe_id UUID REFERENCES recipes(id),
  food_id UUID REFERENCES foods(id),
  custom_description VARCHAR(255),  -- Or just text description

  -- Portion
  servings DECIMAL(5,2) DEFAULT 1,

  -- Calculated
  calories INTEGER,
  protein_g DECIMAL(10,2),
  carbs_g DECIMAL(10,2),
  fat_g DECIMAL(10,2),

  -- Status
  completed BOOLEAN DEFAULT false,
  completed_meal_log_id UUID REFERENCES meal_logs(id)
);

CREATE INDEX idx_meal_plan_items_plan_date ON meal_plan_items(meal_plan_id, plan_date);

-- Nutrition streaks
CREATE TABLE nutrition_streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  current_logging_streak INTEGER DEFAULT 0,
  longest_logging_streak INTEGER DEFAULT 0,
  last_logged_date DATE,

  current_goal_streak INTEGER DEFAULT 0,  -- Days hitting goals
  longest_goal_streak INTEGER DEFAULT 0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Water/hydration tracking (optional module)
CREATE TABLE hydration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  log_date DATE NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  amount_ml INTEGER NOT NULL,
  beverage_type VARCHAR(50) DEFAULT 'water',  -- water, coffee, tea, etc.

  notes TEXT
);

CREATE INDEX idx_hydration_user_date ON hydration_logs(user_id, log_date DESC);

-- Nutrition community posts (extends existing activity feed)
-- Uses existing feed infrastructure, adds nutrition-specific fields
CREATE TABLE nutrition_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  post_type VARCHAR(50) NOT NULL,  -- meal_share, recipe_share, milestone

  -- References
  meal_log_id UUID REFERENCES meal_logs(id),
  recipe_id UUID REFERENCES recipes(id),

  -- Content
  caption TEXT,
  photo_url VARCHAR(500),

  -- What to show
  show_macros BOOLEAN DEFAULT true,
  show_calories BOOLEAN DEFAULT true,

  -- Context
  post_workout BOOLEAN DEFAULT false,
  workout_id UUID REFERENCES workouts(id),

  -- Engagement
  prop_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nutrition_posts_user ON nutrition_posts(user_id, created_at DESC);

-- Nutrition-specific achievements
INSERT INTO achievement_definitions (id, slug, name, description, category, xp_reward, credit_reward)
VALUES
  (gen_random_uuid(), 'first_meal_logged', 'First Bite', 'Log your first meal', 'nutrition', 10, 5),
  (gen_random_uuid(), 'log_streak_7', 'Week Warrior', 'Log meals for 7 consecutive days', 'nutrition', 50, 25),
  (gen_random_uuid(), 'log_streak_30', 'Month Master', 'Log meals for 30 consecutive days', 'nutrition', 200, 100),
  (gen_random_uuid(), 'macro_master_7', 'Macro Master', 'Hit macro targets for 7 days', 'nutrition', 100, 50),
  (gen_random_uuid(), 'recipe_creator', 'Chef Mode', 'Create your first recipe', 'nutrition', 25, 10),
  (gen_random_uuid(), 'recipe_popular', 'Community Chef', 'Have a recipe saved 100+ times', 'nutrition', 500, 200),
  (gen_random_uuid(), 'archetype_diet_30', 'True to Path', 'Follow archetype diet for 30 days', 'nutrition', 300, 150);
```

### Indexes for Performance

```sql
-- Keyset pagination indexes (per CLAUDE.md requirements)
CREATE INDEX idx_meal_logs_keyset ON meal_logs(user_id, logged_at DESC, id DESC);
CREATE INDEX idx_recipes_keyset ON recipes(created_at DESC, id DESC) WHERE is_public = true;
CREATE INDEX idx_nutrition_posts_keyset ON nutrition_posts(created_at DESC, id DESC);

-- Covering indexes for dashboard queries
CREATE INDEX idx_daily_summaries_dashboard ON daily_nutrition_summaries(user_id, summary_date DESC)
  INCLUDE (total_calories, total_protein_g, total_carbs_g, total_fat_g, goal_calories);

-- Full-text search for foods
CREATE INDEX idx_foods_search ON foods USING GIN(
  to_tsvector('english', name || ' ' || COALESCE(brand, ''))
);

-- Partial indexes for active data
CREATE INDEX idx_meal_plans_active ON meal_plans(user_id, start_date)
  WHERE status = 'active';

CREATE INDEX idx_recipes_public_popular ON recipes(save_count DESC, rating DESC)
  WHERE is_public = true;
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Weeks 1-3)
**Goal:** Basic food logging with external API integration

**Backend:**
- [ ] Create nutrition module structure
- [ ] Implement USDA FoodData Central client
- [ ] Implement Open Food Facts client (barcode support)
- [ ] Create food search service with multi-source fallback
- [ ] Database migrations for core tables
- [ ] Basic meal logging endpoints
- [ ] User nutrition preferences endpoints
- [ ] Daily summary calculation service

**Frontend:**
- [ ] Nutrition toggle in settings
- [ ] Basic nutrition dashboard card
- [ ] Food search component
- [ ] Meal logging bottom sheet
- [ ] Daily nutrition page (basic)
- [ ] Zustand store for nutrition state

**Testing:**
- [ ] E2E tests for food logging flow
- [ ] API integration tests for external services
- [ ] Load test food search performance

### Phase 2: Intelligence (Weeks 4-5)
**Goal:** Smart features and workout integration

**Backend:**
- [ ] TDEE/macro goal calculator
- [ ] Adaptive goal recalculation service
- [ ] Workout-nutrition sync hooks
- [ ] Archetype nutrition profiles
- [ ] AI meal suggestion service (basic)
- [ ] Barcode scanning endpoint
- [ ] Quick log (voice/photo) preparation

**Frontend:**
- [ ] Macro progress visualization
- [ ] Goal setup wizard
- [ ] Post-workout nutrition prompts
- [ ] Archetype diet recommendations
- [ ] Barcode scanner component
- [ ] Enhanced daily timeline view

### Phase 3: Recipes & Planning (Weeks 6-7)
**Goal:** Recipe management and meal planning

**Backend:**
- [ ] Recipe CRUD endpoints
- [ ] Recipe search and filtering
- [ ] Meal plan generation service
- [ ] Shopping list aggregation
- [ ] Recipe rating/save system

**Frontend:**
- [ ] Recipe creation wizard
- [ ] Recipe browser/search
- [ ] Meal plan calendar view
- [ ] Shopping list generator
- [ ] Recipe detail page

### Phase 4: Community (Weeks 8-9)
**Goal:** Social nutrition features

**Backend:**
- [ ] Meal sharing to activity feed
- [ ] Community recipe endpoints
- [ ] Recipe leaderboard queries
- [ ] Nutrition challenges/competitions
- [ ] Crew nutrition features

**Frontend:**
- [ ] Meal share flow
- [ ] Community recipes tab
- [ ] Recipe leaderboard
- [ ] Nutrition challenges UI
- [ ] Props on nutrition posts

### Phase 5: AI & Advanced (Weeks 10-12)
**Goal:** AI features and polish

**Backend:**
- [ ] AI photo recognition integration
- [ ] Voice logging (speech-to-food)
- [ ] AI nutrition coach
- [ ] Weekly insights generation
- [ ] Micronutrient tracking

**Frontend:**
- [ ] Photo recognition UI
- [ ] Voice logging interface
- [ ] AI coach chat interface
- [ ] Weekly insights view
- [ ] Detailed nutrient breakdown
- [ ] Water tracking module

### Phase 6: Polish & Launch (Weeks 13-14)
**Goal:** Production readiness

- [ ] Performance optimization
- [ ] Mobile app integration
- [ ] Offline support for logging
- [ ] Comprehensive E2E testing
- [ ] Documentation
- [ ] User onboarding flow
- [ ] Launch announcement

---

## 10. Success Metrics

### Adoption Metrics
| Metric | Week 1 Target | Month 1 Target | Month 3 Target |
|--------|---------------|----------------|----------------|
| Users with nutrition enabled | 100 | 1,000 | 5,000 |
| Daily active nutrition users | 50 | 500 | 2,500 |
| Meals logged per day (total) | 200 | 5,000 | 50,000 |
| Average meals per user per day | 2.0 | 2.5 | 3.0 |

### Engagement Metrics
| Metric | Target |
|--------|--------|
| 7-day logging retention | 60% |
| 30-day logging retention | 40% |
| Average session time (nutrition pages) | 3+ minutes |
| Recipes created per week | 50+ |
| Community recipe saves per week | 500+ |

### Quality Metrics
| Metric | Target |
|--------|--------|
| Food search success rate | >95% |
| Barcode recognition rate | >90% |
| Photo recognition accuracy | >80% |
| API response time (p95) | <200ms |
| User-reported bugs | <5/week |

### Business Metrics
| Metric | Target |
|--------|--------|
| Conversion to premium (nutrition users) | 15% |
| Credits earned via nutrition | 10% of total |
| Nutrition challenge participation | 30% of nutrition users |

---

## Appendix A: API Endpoints

```typescript
// Nutrition Module API Surface

// Preferences
GET    /me/nutrition/preferences
PATCH  /me/nutrition/preferences
POST   /me/nutrition/enable
POST   /me/nutrition/disable

// Goals
GET    /me/nutrition/goals
POST   /me/nutrition/goals/calculate
PATCH  /me/nutrition/goals

// Food Search
GET    /nutrition/foods/search?q=&source=&barcode=
GET    /nutrition/foods/:id
POST   /nutrition/foods/custom
GET    /me/nutrition/foods/recent
GET    /me/nutrition/foods/frequent

// Meal Logging
GET    /me/nutrition/meals?date=&from=&to=
POST   /me/nutrition/meals
PUT    /me/nutrition/meals/:id
DELETE /me/nutrition/meals/:id
POST   /me/nutrition/meals/quick  // Voice/photo quick entry

// Daily Summary
GET    /me/nutrition/summary?date=
GET    /me/nutrition/summary/range?from=&to=

// Recipes
GET    /nutrition/recipes?q=&dietary=&archetype=&sort=
GET    /nutrition/recipes/:id
POST   /me/nutrition/recipes
PUT    /me/nutrition/recipes/:id
DELETE /me/nutrition/recipes/:id
POST   /me/nutrition/recipes/:id/save
DELETE /me/nutrition/recipes/:id/save
POST   /me/nutrition/recipes/:id/rate

// Meal Plans
GET    /me/nutrition/plans
POST   /me/nutrition/plans
GET    /me/nutrition/plans/:id
PUT    /me/nutrition/plans/:id
DELETE /me/nutrition/plans/:id
POST   /me/nutrition/plans/generate  // AI generation

// Community
GET    /nutrition/posts?feed=&type=
POST   /me/nutrition/posts
GET    /nutrition/challenges
POST   /nutrition/challenges/:id/join

// AI Features
POST   /nutrition/recognize/photo
POST   /nutrition/recognize/voice
POST   /nutrition/ai/suggest-meal
POST   /nutrition/ai/coach

// GraphQL additions
type Query {
  nutritionPreferences: NutritionPreferences
  nutritionGoals: NutritionGoals
  foodSearch(query: String!, limit: Int): [Food!]!
  mealLogs(date: Date, cursor: String, limit: Int): MealLogConnection!
  dailySummary(date: Date!): DailySummary
  recipes(filter: RecipeFilter, cursor: String, limit: Int): RecipeConnection!
  communityRecipes(sort: RecipeSort, cursor: String, limit: Int): RecipeConnection!
}

type Mutation {
  enableNutrition: NutritionPreferences!
  disableNutrition(keepData: Boolean): Boolean!
  logMeal(input: MealLogInput!): MealLog!
  updateMealLog(id: ID!, input: MealLogInput!): MealLog!
  deleteMealLog(id: ID!): Boolean!
  createRecipe(input: RecipeInput!): Recipe!
  saveRecipe(id: ID!): Boolean!
  rateRecipe(id: ID!, rating: Int!, review: String): RecipeRating!
  generateMealPlan(input: MealPlanInput!): MealPlan!
}
```

---

## Appendix B: External API References

### USDA FoodData Central
- **Docs:** https://fdc.nal.usda.gov/api-guide/
- **Rate Limit:** None (generous)
- **Key Required:** Yes (free)
- **Data Types:** Foundation, SR Legacy, Branded, Survey (FNDDS)

### Open Food Facts
- **Docs:** https://openfoodfacts.github.io/openfoodfacts-server/api/
- **Rate Limit:** Reasonable use policy
- **Key Required:** No
- **Barcode API:** `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`

### FatSecret Platform
- **Docs:** https://platform.fatsecret.com/api-documentation
- **Rate Limit:** 5,000/day free
- **Key Required:** Yes (free tier available)
- **OAuth:** Required

---

## Appendix C: Community Feature Ideas

**Submitted by (placeholder for actual community input):**

1. **Meal Prep Sunday** - Weekly community event for planning
2. **Macro Matchup** - 1v1 competition for hitting targets
3. **Recipe Remix** - Take a recipe, modify it, share variant
4. **Nutrition Mentor** - Pair experienced users with beginners
5. **Grocery Run** - Share shopping hauls and deals
6. **Cheat Day Confessional** - Fun space to share indulgences
7. **Archetype Cookbook** - Community-curated recipes per archetype
8. **Meal Photo Contest** - Weekly best meal photo competition
9. **Budget Gains** - Recipes optimized for cost efficiency
10. **Supplement Stack Share** - Share and discuss supplement routines

---

*End of Plan Document*

**Next Steps:**
1. Review with stakeholders
2. Gather community input on features
3. Finalize API selection and costs
4. Begin Phase 1 implementation
