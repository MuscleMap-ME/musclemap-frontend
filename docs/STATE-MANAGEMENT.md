# MuscleMap State Management Guide

## Overview

MuscleMap uses a **hybrid state management architecture** optimized for performance, developer experience, and maintainability. This document explains when to use each approach and provides comprehensive examples.

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         STATE MANAGEMENT LAYERS                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │   Apollo Client  │  │     Zustand      │  │  React Context   │      │
│  │   (Server State) │  │  (Client State)  │  │ (Static Config)  │      │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘      │
│           │                     │                     │                 │
│           ▼                     ▼                     ▼                 │
│  • User data            • UI state           • Theme                   │
│  • Workouts             • Active workout     • Locale/i18n             │
│  • Achievements         • Modal/toast        • Feature flags           │
│  • Social data          • 3D visualization   • Auth (legacy)           │
│  • Leaderboards         • Form state                                   │
│                         • Rest timers                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## When to Use What

### Decision Tree

```
START
  │
  ├─── Is data from the server/database?
  │       │
  │       YES → Apollo Client (GraphQL)
  │       │     ✓ Automatic caching
  │       │     ✓ Request deduplication
  │       │     ✓ Optimistic updates
  │       │     ✓ Real-time subscriptions
  │       │
  │       NO ──┐
  │            │
  ├────────────┴── Does state change frequently? (every second, per-keystroke)
  │                    │
  │                    YES → Zustand with selectors
  │                    │     ✓ Selector-based subscriptions
  │                    │     ✓ No provider needed
  │                    │     ✓ Works outside React
  │                    │     ✓ DevTools support
  │                    │
  │                    NO ──┐
  │                         │
  ├─────────────────────────┴── Is state shared across many components?
  │                                 │
  │                                 YES → Zustand (still better for shared state)
  │                                 │
  │                                 NO ──┐
  │                                      │
  ├──────────────────────────────────────┴── Does state change rarely? (theme, locale)
  │                                              │
  │                                              YES → React Context
  │                                              │     ✓ Simple API
  │                                              │     ✓ Built-in to React
  │                                              │
  │                                              NO → Local useState
END
```

### Quick Reference Table

| Data Type | Solution | Example |
|-----------|----------|---------|
| User profile | Apollo Client | `useQuery(GET_USER)` |
| Workout history | Apollo Client | `useQuery(GET_WORKOUTS)` |
| Achievements | Apollo Client | `useQuery(GET_ACHIEVEMENTS)` |
| Active workout session | Zustand | `useWorkoutSessionStore` |
| Rest timer | Zustand | `useRestTimer()` |
| Modal state | Zustand | `useModal()` |
| Toast notifications | Zustand | `useToast()` |
| 3D model state | Zustand | `useMuscleVisualizationStore` |
| Theme (dark/light) | React Context | `useTheme()` |
| Language/locale | React Context | `useLocale()` |
| Form input | Local useState | `useState('')` |
| Component toggle | Local useState | `useState(false)` |

---

## Zustand Stores

### 1. Auth Store (`src/store/authStore.js`)

Manages authentication state with localStorage persistence.

```javascript
import { useAuth, getToken, getAuthHeader } from '@/hooks';

// In React components
function ProfileButton() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) return <LoginButton />;

  return (
    <button onClick={logout}>
      {user.name}
    </button>
  );
}

// Outside React (e.g., API client)
const token = getToken();
const headers = getAuthHeader(); // { Authorization: 'Bearer ...' }
```

### 2. UI Store (`src/store/uiStore.js`)

Manages all transient UI state.

```javascript
import { useModal, useToast, useConfirm, useResponsive, useUIStore } from '@/hooks';

// Modals
function CreateWorkoutButton() {
  const { openModal, closeModal } = useModal();

  return (
    <button onClick={() => openModal('create-workout', { template: 'push' })}>
      New Workout
    </button>
  );
}

// Toasts
function SaveButton() {
  const { success, error } = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      success('Saved successfully!');
    } catch (e) {
      error('Failed to save');
    }
  };
}

// Confirmation dialogs
function DeleteButton() {
  const { confirm } = useConfirm();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Workout?',
      message: 'This cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      await deleteWorkout();
    }
  };
}

// Responsive breakpoints
function Layout() {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  if (isMobile) return <MobileLayout />;
  if (isTablet) return <TabletLayout />;
  return <DesktopLayout />;
}

// Direct store access with selectors (advanced)
function Sidebar() {
  // Only re-renders when sidebarOpen changes
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <aside className={sidebarOpen ? 'open' : 'closed'}>
      <button onClick={toggleSidebar}>Toggle</button>
    </aside>
  );
}
```

### 3. Workout Session Store (`src/store/workoutSessionStore.js`)

Manages active workout tracking with real-time updates.

```javascript
import {
  useWorkoutSessionStore,
  useRestTimer,
  useWorkoutMetrics,
  useCurrentExercise
} from '@/hooks';

// Start a workout
function StartWorkoutButton({ workout }) {
  const startSession = useWorkoutSessionStore((s) => s.startSession);

  return (
    <button onClick={() => startSession(workout)}>
      Start Workout
    </button>
  );
}

// Rest timer component (updates every second without re-rendering parent)
function RestTimer() {
  const { time, isActive, start, stop, formatted } = useRestTimer();

  return (
    <div>
      <span>{formatted}</span> {/* "1:30" */}
      {isActive ? (
        <button onClick={stop}>Skip Rest</button>
      ) : (
        <button onClick={() => start(90)}>Rest 90s</button>
      )}
    </div>
  );
}

// Workout metrics (isolated from timer updates)
function WorkoutStats() {
  const { totalVolume, totalReps, totalSets, estimatedCalories } = useWorkoutMetrics();

  return (
    <div>
      <div>{totalSets} sets</div>
      <div>{totalReps} reps</div>
      <div>{totalVolume.toLocaleString()} lbs</div>
      <div>{estimatedCalories} cal</div>
    </div>
  );
}

// Current exercise navigation
function ExerciseNavigation() {
  const { exercise, index, total, hasNext, hasPrevious, next, previous } = useCurrentExercise();

  return (
    <div>
      <button disabled={!hasPrevious} onClick={previous}>←</button>
      <span>{exercise?.name} ({index + 1}/{total})</span>
      <button disabled={!hasNext} onClick={next}>→</button>
    </div>
  );
}

// Log a set
function LogSetForm() {
  const logSet = useWorkoutSessionStore((s) => s.logSet);
  const startRestTimer = useWorkoutSessionStore((s) => s.startRestTimer);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    logSet({
      weight: Number(formData.get('weight')),
      reps: Number(formData.get('reps')),
      rpe: Number(formData.get('rpe')),
    });

    // Automatically start rest timer
    startRestTimer(90);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="weight" type="number" placeholder="Weight" />
      <input name="reps" type="number" placeholder="Reps" />
      <input name="rpe" type="number" min="1" max="10" placeholder="RPE" />
      <button type="submit">Log Set</button>
    </form>
  );
}
```

### 4. Muscle Visualization Store (`src/store/muscleVisualizationStore.js`)

Manages 3D model state for muscle visualization.

```javascript
import {
  useMuscleHighlight,
  useMuscleIntensity,
  useCameraControls,
  MUSCLE_GROUPS,
  CAMERA_PRESETS
} from '@/hooks';

// Highlight muscles on hover
function MuscleList() {
  const { highlight, unhighlight, isHighlighted } = useMuscleHighlight();

  return (
    <ul>
      {Object.values(MUSCLE_GROUPS).map(muscle => (
        <li
          key={muscle}
          onMouseEnter={() => highlight(muscle)}
          onMouseLeave={() => unhighlight(muscle)}
          className={isHighlighted(muscle) ? 'highlighted' : ''}
        >
          {muscle}
        </li>
      ))}
    </ul>
  );
}

// Show workout intensity on 3D model
function MuscleHeatMap({ workoutSets }) {
  const { fromWorkout, clear } = useMuscleIntensity();

  useEffect(() => {
    fromWorkout(workoutSets);
    return () => clear();
  }, [workoutSets]);

  return <MuscleModel3D />;
}

// Camera controls for 3D model
function ModelControls() {
  const { setPreset, toggleAutoRotate, zoomIn, zoomOut, reset } = useCameraControls();

  return (
    <div>
      <button onClick={() => setPreset('FRONT')}>Front</button>
      <button onClick={() => setPreset('BACK')}>Back</button>
      <button onClick={() => setPreset('ISOMETRIC')}>3D</button>
      <button onClick={toggleAutoRotate}>Spin</button>
      <button onClick={zoomIn}>+</button>
      <button onClick={zoomOut}>-</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

---

## React Context

### Theme Context (`src/contexts/ThemeContext.jsx`)

```javascript
import { useTheme, THEMES } from '@/hooks';

function ThemeToggle() {
  const { theme, toggleTheme, setTheme, isDark } = useTheme();

  return (
    <div>
      <button onClick={toggleTheme}>
        {isDark ? '☀️' : '🌙'}
      </button>

      {/* Or explicit selection */}
      <select value={theme} onChange={(e) => setTheme(e.target.value)}>
        <option value={THEMES.DARK}>Dark</option>
        <option value={THEMES.LIGHT}>Light</option>
        <option value={THEMES.SYSTEM}>System</option>
      </select>
    </div>
  );
}

// Access theme colors
function ThemedComponent() {
  const { colors, isDark } = useTheme();

  return (
    <div style={{
      background: colors.background,
      color: colors.text,
      borderColor: colors.border,
    }}>
      {isDark ? 'Dark Mode' : 'Light Mode'}
    </div>
  );
}
```

### Locale Context (`src/contexts/LocaleContext.jsx`)

```javascript
import { useLocale, useTranslation, LOCALES } from '@/hooks';

// Basic translation
function WelcomeMessage() {
  const t = useTranslation();
  const { user } = useAuth();

  return <h1>{t('dashboard.welcome', { name: user.name })}</h1>;
}

// Language selector
function LanguageSelector() {
  const { locale, setLocale, localeList } = useLocale();

  return (
    <select value={locale} onChange={(e) => setLocale(e.target.value)}>
      {localeList.map(({ code, nativeName }) => (
        <option key={code} value={code}>{nativeName}</option>
      ))}
    </select>
  );
}

// Formatting utilities
function StatsDisplay({ stats }) {
  const { formatNumber, formatDate, formatRelativeTime } = useLocale();

  return (
    <div>
      <div>Volume: {formatNumber(stats.volume)} lbs</div>
      <div>Last workout: {formatRelativeTime(stats.lastWorkout)}</div>
      <div>Joined: {formatDate(stats.joinDate, { dateStyle: 'long' })}</div>
    </div>
  );
}
```

---

## Performance Hooks

### useDebounce

Debounce rapidly changing values to reduce API calls.

```javascript
import { useDebounce } from '@/hooks';

function SearchExercises() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data } = useQuery(SEARCH_EXERCISES, {
    variables: { query: debouncedQuery },
    skip: !debouncedQuery,
  });

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search exercises..."
    />
  );
}
```

### useThrottle

Throttle frequent updates (scroll, resize, mouse move).

```javascript
import { useThrottle } from '@/hooks';

function ScrollProgress() {
  const [scrollY, setScrollY] = useState(0);
  const throttledScrollY = useThrottle(scrollY, 100);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const progress = (throttledScrollY / document.body.scrollHeight) * 100;

  return <ProgressBar value={progress} />;
}
```

### useOptimistic

Optimistic updates with automatic rollback on failure.

```javascript
import { useOptimistic } from '@/hooks';

function LikeButton({ postId, initialLikes }) {
  const [likes, setOptimistic, rollback] = useOptimistic(initialLikes);
  const [likePost] = useMutation(LIKE_POST);

  const handleLike = async () => {
    setOptimistic(likes + 1); // Instant UI update

    try {
      await likePost({ variables: { postId } });
    } catch (error) {
      rollback(); // Revert on failure
      toast.error('Failed to like post');
    }
  };

  return <button onClick={handleLike}>❤️ {likes}</button>;
}
```

### usePrevious

Compare current value with previous render.

```javascript
import { usePrevious } from '@/hooks';

function ScoreDisplay({ score }) {
  const previousScore = usePrevious(score);
  const increased = score > (previousScore ?? 0);

  return (
    <div className={increased ? 'flash-green' : ''}>
      Score: {score}
      {increased && <span>+{score - previousScore}!</span>}
    </div>
  );
}
```

### useIsMounted

Prevent state updates after unmount.

```javascript
import { useIsMounted } from '@/hooks';

function AsyncComponent() {
  const [data, setData] = useState(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    fetchData().then((result) => {
      if (isMounted.current) {
        setData(result); // Safe - component is still mounted
      }
    });
  }, []);

  return <div>{data}</div>;
}
```

---

## Apollo Client (Server State)

### Queries

```javascript
import { useQuery } from '@apollo/client';
import { GET_WORKOUTS, GET_USER_STATS } from '@/graphql/queries';

function WorkoutHistory() {
  const { data, loading, error, refetch } = useQuery(GET_WORKOUTS, {
    variables: { limit: 10 },
    fetchPolicy: 'cache-and-network', // Show cached, then update
  });

  if (loading && !data) return <Skeleton />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      {data.workouts.map(workout => (
        <WorkoutCard key={workout.id} workout={workout} />
      ))}
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

### Mutations with Optimistic Updates

```javascript
import { useMutation } from '@apollo/client';
import { CREATE_WORKOUT, GET_WORKOUTS } from '@/graphql';

function QuickLogButton({ exercise }) {
  const [createWorkout] = useMutation(CREATE_WORKOUT, {
    // Instant UI update before server response
    optimisticResponse: {
      createWorkout: {
        __typename: 'Workout',
        id: `temp-${Date.now()}`,
        createdAt: new Date().toISOString(),
        exercises: [exercise],
      },
    },
    // Update cache with new workout
    update: (cache, { data }) => {
      const existing = cache.readQuery({ query: GET_WORKOUTS });
      cache.writeQuery({
        query: GET_WORKOUTS,
        data: {
          workouts: [data.createWorkout, ...existing.workouts],
        },
      });
    },
  });

  return (
    <button onClick={() => createWorkout({ variables: { exercise } })}>
      Quick Log
    </button>
  );
}
```

---

## Common Patterns

### Combining Zustand + Apollo

```javascript
function WorkoutPage() {
  // Server data (Apollo)
  const { data: exercisesData } = useQuery(GET_EXERCISES);

  // Client state (Zustand)
  const isActive = useWorkoutSessionStore((s) => s.isActive);
  const startSession = useWorkoutSessionStore((s) => s.startSession);

  // UI state (Zustand)
  const { openModal } = useModal();

  if (isActive) {
    return <ActiveWorkout exercises={exercisesData?.exercises} />;
  }

  return (
    <div>
      <h1>Start a Workout</h1>
      <button onClick={() => openModal('select-template')}>
        Choose Template
      </button>
      <button onClick={() => startSession({ exercises: exercisesData?.exercises })}>
        Quick Start
      </button>
    </div>
  );
}
```

### Form State with Zustand (Complex Forms)

For simple forms, use local `useState`. For complex multi-step forms:

```javascript
// src/store/formStore.js
import { create } from 'zustand';

export const useWorkoutFormStore = create((set) => ({
  step: 1,
  formData: {},

  nextStep: () => set((s) => ({ step: s.step + 1 })),
  prevStep: () => set((s) => ({ step: Math.max(1, s.step - 1) })),
  updateFormData: (data) => set((s) => ({
    formData: { ...s.formData, ...data }
  })),
  reset: () => set({ step: 1, formData: {} }),
}));

// Usage in multi-step form
function WorkoutForm() {
  const step = useWorkoutFormStore((s) => s.step);

  switch (step) {
    case 1: return <SelectExercises />;
    case 2: return <SetTargets />;
    case 3: return <ReviewAndStart />;
  }
}
```

---

## File Structure Reference

```
src/
├── store/                          # Zustand stores
│   ├── index.js                    # Central exports + utilities
│   ├── authStore.js                # Authentication
│   ├── uiStore.js                  # UI state
│   ├── workoutSessionStore.js      # Active workout
│   └── muscleVisualizationStore.js # 3D visualization
│
├── contexts/                       # React Context providers
│   ├── index.js                    # Central exports
│   ├── ThemeContext.jsx            # Dark/light mode
│   ├── LocaleContext.jsx           # i18n
│   └── UserContext.jsx             # Legacy auth (deprecated)
│
├── hooks/                          # Custom hooks
│   ├── index.js                    # All exports (stores + contexts + utilities)
│   ├── useDebounce.js              # Debounce values
│   ├── useThrottle.js              # Throttle values
│   └── ...                         # Other utility hooks
│
└── graphql/                        # Apollo Client
    ├── client.js                   # Apollo client setup
    ├── queries.js                  # GraphQL queries
    └── mutations.js                # GraphQL mutations
```

---

## Migration Guide

### From useState to Zustand

```javascript
// Before (local state scattered across components)
function ComponentA() {
  const [isOpen, setIsOpen] = useState(false);
  return <button onClick={() => setIsOpen(true)}>Open</button>;
}

function ComponentB() {
  const [isOpen, setIsOpen] = useState(false); // Duplicated!
  return isOpen ? <Modal /> : null;
}

// After (shared Zustand state)
function ComponentA() {
  const openModal = useUIStore((s) => s.openModal);
  return <button onClick={() => openModal('my-modal')}>Open</button>;
}

function ComponentB() {
  const activeModal = useUIStore((s) => s.activeModal);
  return activeModal === 'my-modal' ? <Modal /> : null;
}
```

### From Context to Zustand

```javascript
// Before (Context - causes unnecessary re-renders)
const WorkoutContext = createContext();

function WorkoutProvider({ children }) {
  const [sets, setSets] = useState([]);
  const [timer, setTimer] = useState(0);
  // Timer updates every second → ALL consumers re-render
}

// After (Zustand - selective subscriptions)
function TimerDisplay() {
  // Only re-renders when timer changes
  const timer = useWorkoutSessionStore((s) => s.restTimer);
  return <span>{timer}s</span>;
}

function SetsList() {
  // Only re-renders when sets change (not on timer updates)
  const sets = useWorkoutSessionStore((s) => s.sets);
  return <ul>{sets.map(s => <li key={s.id}>{s.reps} reps</li>)}</ul>;
}
```

---

## Debugging

### Zustand DevTools

```javascript
// In development, stores are automatically connected to Redux DevTools
// Open Redux DevTools browser extension to inspect state
```

### Apollo DevTools

```javascript
// Apollo Client DevTools browser extension shows:
// - Query cache
// - Active queries/mutations
// - GraphQL explorer
```

### Common Issues

1. **"Too many re-renders"** - You're not using selectors with Zustand
2. **"State not updating"** - You're mutating state instead of returning new object
3. **"Context value undefined"** - Component is outside provider
4. **"Stale closure"** - Use `get()` inside Zustand actions, not captured state
