# MuscleMap Mobile Enhancement Plan

> **Status**: Active Implementation
> **Last Updated**: January 2026
> **Breaking Changes**: Allowed (no production users)

---

## Executive Summary

This plan transforms the MuscleMap React Native app from a functional prototype into a **powerful, performant, enterprise-grade fitness platform** that fully realizes MuscleMap's unique vision: **fitness as an RPG adventure**.

### Core Principles

1. **Performance First**: 60 FPS animations, <2s startup, offline-capable
2. **Vision Alignment**: Every screen reinforces the RPG/gamification experience
3. **GraphQL Native**: Align mobile with web's pure GraphQL architecture
4. **Type Safety**: Zero `any` types, full Zod validation
5. **Modern Stack**: Latest React Native + Expo with New Architecture

---

## Current State Assessment

### What We Have (Strengths)

| Feature | Status | Quality |
|---------|--------|---------|
| 3D Muscle Visualization | ✅ Implemented | Good (Three.js + fallback) |
| Tamagui Design System | ✅ Implemented | Good theming |
| Apple Watch Foundation | ✅ Started | Native Swift module |
| Health Integration | ✅ Started | HealthKit + Health Connect |
| Zustand State | ✅ Basic | Auth + Onboarding only |
| TypeScript | ✅ Strict Mode | Well configured |

### What's Missing (Gaps)

| Gap | Priority | Impact |
|-----|----------|--------|
| GraphQL/Apollo Client | P0 | Can't use web's API patterns |
| Spirit Animal System | P0 | Core differentiator missing |
| Credits Economy UI | P0 | Monetization not visible |
| Offline Workouts | P0 | Gym connectivity unreliable |
| Animation System | P1 | App feels static |
| Testing Infrastructure | P1 | No quality assurance |
| Workout Session Screen | P1 | Core UX incomplete |
| Rest Timer | P1 | Expected feature |
| Video Demos | P2 | Competitor parity |

---

## Architecture Decisions

### State Management Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    State Architecture                        │
├─────────────────────────────────────────────────────────────┤
│  SERVER STATE (Apollo Client)                               │
│  - User profile, workouts, exercises, leaderboards          │
│  - Automatic caching, background refetch                    │
│  - Offline persistence with apollo-cache-persist            │
├─────────────────────────────────────────────────────────────┤
│  CLIENT STATE (Zustand)                                     │
│  - Auth tokens, UI state, workout session                   │
│  - Spirit Animal customization preview                      │
│  - Rest timer, active exercise                              │
├─────────────────────────────────────────────────────────────┤
│  FORM STATE (React Hook Form + Zod)                         │
│  - Registration, onboarding, workout logging                │
│  - Real-time validation, type-safe                          │
└─────────────────────────────────────────────────────────────┘
```

**Why This Stack:**
- **Apollo Client**: Matches web app, normalized caching, offline support
- **Zustand**: Simple, performant, minimal boilerplate for local state
- **React Hook Form**: Most performant form library for RN
- **Zod**: Runtime validation that generates TypeScript types

### Animation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Animation Layers                          │
├─────────────────────────────────────────────────────────────┤
│  REANIMATED 3 (Current) → REANIMATED 4 (Upgrade)           │
│  - Gesture-driven 3D model rotation                         │
│  - Workout card swipe interactions                          │
│  - Pull-to-refresh custom physics                           │
│  - Spirit Animal evolution transitions                      │
├─────────────────────────────────────────────────────────────┤
│  TAMAGUI ANIMATIONS                                         │
│  - Screen transitions                                       │
│  - Button/card press states                                 │
│  - Modal presentations                                      │
│  - Liquid glass blur effects                                │
├─────────────────────────────────────────────────────────────┤
│  LOTTIE (New)                                               │
│  - Spirit Animal idle animations                            │
│  - Achievement unlocked celebrations                        │
│  - Credit earning confetti                                  │
│  - Loading states                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

#### 1.1 Upgrade Core Dependencies

```bash
# Target versions
expo: ~53.0.0          # From ~52.0.0
react-native: 0.79.x   # From 0.76.9
react: 19.x            # From 18.3.1
```

**Breaking Changes to Handle:**
- `expo-av` → `expo-video` + `expo-audio`
- React 19 automatic batching
- New Architecture enabled by default

#### 1.2 Apollo Client Integration

```typescript
// src/lib/apollo.ts
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistCache } from 'apollo3-cache-persist';

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        exercises: {
          keyArgs: ['muscleGroup', 'equipment'],
          merge(existing = [], incoming) {
            return [...existing, ...incoming];
          },
        },
      },
    },
  },
});

// Persist cache for offline support
await persistCache({
  cache,
  storage: AsyncStorage,
  maxSize: 10 * 1024 * 1024, // 10MB
});

const httpLink = createHttpLink({
  uri: `${process.env.EXPO_PUBLIC_API_URL}/api/graphql`,
});

const authLink = setContext(async (_, { headers }) => {
  const token = await SecureStore.getItemAsync('musclemap_token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});
```

#### 1.3 GraphQL Codegen Setup

```bash
pnpm add -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-react-apollo
```

```yaml
# codegen.yml
schema: "../../apps/api/src/graphql/schema.graphql"
documents: "src/**/*.graphql"
generates:
  src/generated/graphql.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-react-apollo
    config:
      withHooks: true
      withComponent: false
```

#### 1.4 Zustand Store Expansion

```typescript
// src/stores/index.ts - New store structure
export * from './auth';           // Existing
export * from './onboarding';     // Existing
export * from './ui';             // NEW: modals, toasts, theme
export * from './workoutSession'; // NEW: active workout state
export * from './spiritAnimal';   // NEW: customization preview
export * from './offline';        // NEW: offline queue
```

---

### Phase 2: Core Features (Week 3-4)

#### 2.1 Spirit Animal Component

The Spirit Animal is MuscleMap's emotional core. Users need to see their companion:
- On the home screen (greeting them)
- During workouts (cheering them on)
- On profile (showing off to others)
- Evolving as they level up

```typescript
// src/components/SpiritAnimal/SpiritAnimal.tsx
interface SpiritAnimalProps {
  species: 'phoenix' | 'wolf' | 'owl' | 'fox' | 'lion' | 'serpent' | 'golem' | 'raven';
  stage: 1 | 2 | 3 | 4 | 5 | 6; // Baby → Legendary
  cosmetics: {
    skin?: string;
    outfit?: string;
    accessory?: string;
    aura?: string;
  };
  mood: 'idle' | 'happy' | 'cheering' | 'celebrating' | 'sleeping';
  wealthTier: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
}
```

**Implementation Options:**
1. **Lottie Animations**: Pre-rendered animations per species/stage (fastest)
2. **Rive**: Interactive state machines (most dynamic)
3. **3D Models**: Three.js like muscle viewer (most impressive but complex)

**Recommended**: Start with **Lottie** for MVP, upgrade to **Rive** later.

#### 2.2 Credits Economy UI

```typescript
// src/components/Credits/CreditsDisplay.tsx
// Animated counter with wealth tier indicator

// src/components/Credits/CreditTransaction.tsx
// Shows +/- credits with animation

// src/components/Credits/CreditsStore.tsx
// Spirit Animal cosmetics shop
```

#### 2.3 Workout Session Screen

```typescript
// src/screens/WorkoutSession/
├── index.tsx              // Main session screen
├── ExerciseCard.tsx       // Current exercise display
├── SetLogger.tsx          // Log sets (weight, reps, RPE)
├── RestTimer.tsx          // Animated countdown
├── WorkoutProgress.tsx    // Progress bar with credits preview
├── SpiritAnimalCoach.tsx  // Companion encouraging user
└── WorkoutComplete.tsx    // Summary + credits earned + XP
```

**Key Features:**
- Swipe to complete set
- Haptic feedback on PRs
- Spirit Animal reacts to performance
- Credits counter animates as earned
- Rest timer with customizable duration
- Offline queue for gym connectivity

---

### Phase 3: Polish & Performance (Week 5-6)

#### 3.1 Animation System

**Liquid Glass Effects:**
```typescript
// src/components/ui/GlassCard.tsx
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

export const GlassCard = ({ children, intensity = 50 }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed ? 0.98 : 1) }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <BlurView intensity={intensity} tint="dark">
        {children}
      </BlurView>
    </Animated.View>
  );
};
```

**Screen Transitions:**
```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
        gestureEnabled: true,
        headerShown: false,
        contentStyle: { backgroundColor: '#000' },
      }}
    />
  );
}
```

#### 3.2 Offline-First Architecture

```typescript
// src/stores/offline.ts
interface OfflineStore {
  pendingActions: OfflineAction[];
  isOnline: boolean;
  lastSyncAt: Date | null;

  queueAction: (action: OfflineAction) => void;
  processQueue: () => Promise<void>;
  setOnline: (online: boolean) => void;
}

type OfflineAction =
  | { type: 'LOG_SET'; payload: SetData }
  | { type: 'COMPLETE_WORKOUT'; payload: WorkoutData }
  | { type: 'EARN_CREDITS'; payload: { amount: number; reason: string } };
```

**Sync Strategy:**
1. All mutations queue locally first
2. Background sync when online
3. Optimistic UI updates
4. Conflict resolution (server wins for credits, merge for workouts)

#### 3.3 Performance Optimization

**Bundle Analysis:**
```bash
npx expo-atlas
```

**Code Splitting:**
```typescript
// Lazy load heavy screens
const MuscleVisualization = React.lazy(() => import('./screens/MuscleVisualization'));
const SpiritAnimalCustomizer = React.lazy(() => import('./screens/SpiritAnimalCustomizer'));
const Leaderboards = React.lazy(() => import('./screens/Leaderboards'));
```

**Image Optimization:**
```typescript
// Use expo-image for better performance
import { Image } from 'expo-image';

<Image
  source={exerciseImage}
  placeholder={blurhash}
  contentFit="cover"
  transition={200}
/>
```

---

### Phase 4: Quality Assurance (Week 7-8)

#### 4.1 Testing Infrastructure

```bash
# Install testing dependencies
pnpm add -D jest @testing-library/react-native @testing-library/jest-native jest-expo
```

**Test Structure:**
```
__tests__/
├── unit/
│   ├── stores/
│   │   ├── auth.test.ts
│   │   ├── workoutSession.test.ts
│   │   └── offline.test.ts
│   └── utils/
│       └── credits.test.ts
├── components/
│   ├── SpiritAnimal.test.tsx
│   ├── CreditsDisplay.test.tsx
│   └── RestTimer.test.tsx
└── e2e/
    ├── onboarding.test.ts
    ├── workout-flow.test.ts
    └── credits-economy.test.ts
```

#### 4.2 Biome Configuration

```bash
pnpm add -D @biomejs/biome
```

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": { "noExcessiveCognitiveComplexity": "warn" },
      "correctness": { "useExhaustiveDependencies": "warn" },
      "suspicious": { "noExplicitAny": "error" }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always"
    }
  }
}
```

#### 4.3 Error Monitoring (Sentry)

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableAutoSessionTracking: true,
  tracesSampleRate: 0.2,
  profilesSampleRate: 0.1,
  integrations: [
    Sentry.reactNativeTracingIntegration(),
    Sentry.mobileReplayIntegration({ maskAllText: false }),
  ],
});

// Set user context after login
export const setSentryUser = (user: User) => {
  Sentry.setUser({
    id: user.id,
    username: user.username,
    email: user.email,
  });
};
```

---

## File Structure (Target)

```
apps/mobile/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout (providers)
│   ├── index.tsx                 # Entry point
│   ├── (auth)/                   # Authentication
│   ├── (onboarding)/             # Onboarding flow
│   ├── (tabs)/                   # Main app tabs
│   │   ├── _layout.tsx           # Tab bar
│   │   ├── index.tsx             # Home (Spirit Animal + today's workout)
│   │   ├── workout/              # Workout screens
│   │   │   ├── index.tsx         # Workout list
│   │   │   ├── [id].tsx          # Workout detail
│   │   │   └── session.tsx       # Active workout session
│   │   ├── muscles.tsx           # Muscle visualization
│   │   ├── progress.tsx          # Progress tracking
│   │   ├── community.tsx         # Social hub
│   │   └── profile.tsx           # User profile
│   └── (modals)/                 # Modal screens
│       ├── spirit-animal.tsx     # Customization
│       ├── credits-store.tsx     # Shop
│       └── achievement.tsx       # Achievement detail
├── src/
│   ├── components/
│   │   ├── ui/                   # Base UI components
│   │   │   ├── GlassCard.tsx
│   │   │   ├── AnimatedButton.tsx
│   │   │   └── GradientText.tsx
│   │   ├── SpiritAnimal/         # Spirit Animal components
│   │   ├── Credits/              # Economy components
│   │   ├── Workout/              # Workout components
│   │   ├── MuscleViewer/         # Existing 3D viewer
│   │   └── common/               # Shared components
│   ├── hooks/
│   │   ├── queries/              # Apollo query hooks
│   │   ├── mutations/            # Apollo mutation hooks
│   │   └── ui/                   # UI utility hooks
│   ├── stores/                   # Zustand stores
│   ├── lib/                      # Configuration
│   │   ├── apollo.ts
│   │   ├── sentry.ts
│   │   └── analytics.ts
│   ├── generated/                # GraphQL codegen output
│   ├── utils/
│   └── types/
├── assets/
│   ├── animations/               # Lottie files
│   ├── images/
│   └── fonts/
└── __tests__/
```

---

## Success Metrics

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| App startup (cold) | <2.0s | ~3.5s |
| App startup (warm) | <1.0s | ~2.0s |
| Animation FPS | 60 fps | ~45 fps |
| Bundle size | <15MB | ~12MB |
| TTI (Time to Interactive) | <3.0s | ~4.5s |

### Quality Targets

| Metric | Target |
|--------|--------|
| Test coverage (business logic) | >80% |
| TypeScript strict compliance | 100% |
| Crash-free sessions | >99.5% |
| Sentry errors/session | <0.01 |

### Feature Completion

| Feature | Phase | Status |
|---------|-------|--------|
| Apollo Client + offline | Phase 1 | ✅ Complete |
| Spirit Animal v1 (Animated) | Phase 2 | ✅ Complete |
| Credits Economy UI | Phase 2 | ✅ Complete |
| Workout Session + Rest Timer | Phase 2 | ✅ Complete |
| Zustand Stores (UI, Session, Offline) | Phase 1 | ✅ Complete |
| GraphQL Queries/Mutations | Phase 1 | ✅ Complete |
| Testing infrastructure | Phase 4 | ✅ Complete |
| Biome linting | Phase 4 | ✅ Complete |
| Liquid Glass animations | Phase 3 | 🔲 Pending (use expo-blur) |
| Sentry monitoring | Phase 4 | 🔲 Pending (add when ready) |
| Lottie animations | Phase 2 | 🔲 Pending (need assets) |

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@apollo/client": "^3.9.0",
    "apollo3-cache-persist": "^0.15.0",
    "@react-native-async-storage/async-storage": "^2.0.0",
    "lottie-react-native": "^7.0.0",
    "expo-blur": "~14.0.0",
    "expo-image": "~2.0.0",
    "expo-haptics": "~14.0.0",
    "react-hook-form": "^7.54.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.9.0",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "@sentry/react-native": "^6.0.0",
    "@testing-library/react-native": "^12.0.0",
    "@testing-library/jest-native": "^5.4.0",
    "jest": "^29.0.0",
    "jest-expo": "~52.0.0",
    "@graphql-codegen/cli": "^5.0.0",
    "@graphql-codegen/typescript": "^4.0.0",
    "@graphql-codegen/typescript-operations": "^4.0.0",
    "@graphql-codegen/typescript-react-apollo": "^4.0.0"
  }
}
```

---

## Next Steps

1. **Immediate**: Begin Phase 1 - Upgrade dependencies and add Apollo Client
2. **This Week**: Create Spirit Animal Lottie animations or find asset library
3. **Design**: Finalize liquid glass design tokens with Tamagui
4. **Backend**: Ensure all required GraphQL queries exist for mobile features

---

*This document is the source of truth for mobile development. Update it as implementation progresses.*
