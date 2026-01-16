# MuscleMap UI Component Library

## Complete Design System & Component Documentation

A comprehensive React UI library for the MuscleMap fitness application featuring 80+ production-ready components with liquid-glass aesthetics, Tailwind CSS styling, and full accessibility support.

---

## 📦 Package Contents

| File | Size | Description |
|------|------|-------------|
| `MuscleMapUI.jsx` | 79KB | Core component library (60+ components) |
| `MuscleMapPages.jsx` | 51KB | Complete page templates (6 screens) |
| `MuscleMapSpecialized.jsx` | 31KB | Advanced/domain-specific components (25+) |
| `MuscleMapStorybook.jsx` | 35KB | Storybook documentation & stories |
| `MuscleMapUIShowcase.jsx` | 28KB | Interactive component demo |
| `MuscleMapOnboarding.jsx` | 15KB | 5-screen onboarding flow |

**Total: ~240KB of production-ready React code**

---

## 🎨 Design System

### Color Palette

```css
/* Primary - Teal */
--teal-400: #2DD4BF;
--teal-500: #14B8A6;  /* Main accent */
--teal-600: #0D9488;

/* Neutrals - Slate */
--slate-50:  #F8FAFC;
--slate-400: #94A3B8;
--slate-700: #334155;
--slate-800: #1E293B;
--slate-900: #0F172A;  /* Background */

/* Semantic */
--success:  #10B981;  /* Emerald */
--warning:  #F59E0B;  /* Amber */
--error:    #EF4444;  /* Red */
--info:     #3B82F6;  /* Blue */

/* Gamification */
--xp:       #A855F7;  /* Purple */
--gold:     #EAB308;  /* Yellow */
--streak:   #F97316;  /* Orange */

/* Muscle Activation Gradient */
Low (0-40%):    Teal    #14B8A6
Medium (40-60%): Yellow  #EAB308
High (60-80%):   Orange  #F97316
Max (80-100%):   Red     #EF4444
```

### Typography

```css
/* Font Stack */
font-family: system-ui, -apple-system, sans-serif;
font-mono: ui-monospace, 'SF Mono', monospace;

/* Scale */
text-xs:   12px / 16px
text-sm:   14px / 20px
text-base: 16px / 24px
text-lg:   18px / 28px
text-xl:   20px / 28px
text-2xl:  24px / 32px
text-3xl:  30px / 36px
```

### Spacing

```css
xs:  4px   (0.25rem)
sm:  8px   (0.5rem)
md:  16px  (1rem)
lg:  24px  (1.5rem)
xl:  32px  (2rem)
2xl: 48px  (3rem)
```

### Border Radius

```css
sm:   8px   (rounded-lg)
md:   12px  (rounded-xl)
lg:   16px  (rounded-2xl)
xl:   24px  (rounded-3xl)
full: 9999px
```

---

## 🧩 Component Inventory

### Foundation (14 components)

| Component | Props | Description |
|-----------|-------|-------------|
| `Button` | variant, size, disabled, loading, fullWidth, icon | Primary action trigger |
| `IconButton` | icon, size, variant | Icon-only button |
| `FloatingActionButton` | icon, onClick | FAB for primary actions |
| `Input` | label, placeholder, error, helperText, icon, disabled | Text input field |
| `SearchInput` | value, onChange, onClear, placeholder | Search with clear button |
| `NumberInput` | value, onChange, min, max, step, unit | Numeric input with controls |
| `Textarea` | label, rows, maxLength | Multi-line text input |
| `Toggle` | checked, onChange, disabled | On/off switch |
| `Checkbox` | checked, onChange, label | Multiple selection |
| `Radio` | checked, onChange, name | Single selection |
| `Chip` | selected, onClick, children | Filter/tag selection |
| `SegmentedControl` | options, value, onChange | Tab-style selector |
| `Slider` | value, onChange, min, max, label | Range input |
| `ThemeProvider` | children | Dark/light theme context |

### Cards (11 components)

| Component | Props | Description |
|-----------|-------|-------------|
| `Card` | variant, padding, children | Container card |
| `ExerciseCard` | name, category, muscles, equipment, difficulty, compact | Exercise display |
| `WorkoutCard` | name, duration, exercises, muscles, completedCount | Workout summary |
| `SetCard` | setNumber, target, completed, isActive, isCompleted | Set tracking |
| `StatCard` | icon, label, value, unit, trend, trendValue, color | Metric display |
| `Badge` | variant, children | Status indicator |
| `AchievementBadge` | name, icon, tier, unlocked, progress | Achievement display |
| `StreakBadge` | days, active | Streak counter |
| `ProgressBar` | value, max, label, color | Linear progress |
| `CircularProgress` | value, label, size, color | Radial progress |
| `MuscleActivationBar` | muscle, activation, isPrimary | Muscle intensity |

### Navigation & Layout (19 components)

| Component | Props | Description |
|-----------|-------|-------------|
| `BottomNav` | items, active, onChange | Bottom tab bar |
| `TabBar` | tabs, active, onChange, variant | Horizontal tabs |
| `Header` | title, subtitle, leftAction, rightAction, transparent | Page header |
| `BackButton` | onClick | Navigation back |
| `Breadcrumb` | items | Navigation path |
| `Container` | maxWidth, padding, children | Content wrapper |
| `Section` | title, action, children | Content section |
| `Divider` | orientation, spacing | Visual separator |
| `Spacer` | size | Fixed spacing |
| `Grid` | cols, gap, children | Grid layout |
| `Stack` | direction, spacing, align, children | Flex layout |
| `Modal` | isOpen, onClose, title, children | Dialog overlay |
| `BottomSheet` | isOpen, onClose, title, children | Slide-up panel |
| `Drawer` | isOpen, onClose, position, children | Side panel |
| `Tooltip` | content, position, children | Hover info |
| `Toast` | message, type, isVisible, onClose | Notification |
| `Alert` | type, title, message, onDismiss | Inline alert |
| `Skeleton` | variant, width, height | Loading placeholder |
| `EmptyState` | icon, title, message, action | No content state |

### Workout (16 components)

| Component | Props | Description |
|-----------|-------|-------------|
| `RestTimer` | duration, onComplete, onSkip, size | Countdown timer |
| `WorkoutTimer` | isActive, startTime | Elapsed timer |
| `Stopwatch` | onLap, onReset | Lap timer |
| `ExerciseHeader` | name, muscleGroups, setNumber, totalSets, onInfo, onSwap | Exercise info |
| `SetInput` | value, onChange, unit, min, max | Weight/reps input |
| `SetLogger` | targetReps, targetWeight, previousReps, previousWeight, onComplete | Full set entry |
| `ExerciseProgress` | sets, currentSet | Set dots indicator |
| `MuscleHeatmap` | activations, view, onMuscleClick | Body diagram |
| `MuscleList` | muscles, showActivation | Muscle checklist |
| `WorkoutSummary` | duration, exercises, sets, volume, prs, musclesCovered | Post-workout |
| `WorkoutHistoryItem` | name, date, duration, exerciseCount, volume | History entry |
| `LeaderboardItem` | rank, name, score, unit, avatar, isCurrentUser | Rank display |
| `Leaderboard` | items, title | Full leaderboard |
| `CreditBalance` | balance, size | Credits display |
| `CreditTransaction` | type, amount, description, date | Transaction item |

### Specialized (25+ components)

| Component | Description |
|-----------|-------------|
| `PrescriptionCard` | AI workout recommendation |
| `ConstraintSelector` | Time/equipment/location picker |
| `ExerciseAnimation` | Animated exercise demo |
| `FormCueOverlay` | Form guidance markers |
| `HangoutCard` | Community workout event |
| `ActivityFeed` | Social activity stream |
| `ChallengeCard` | Challenge progress |
| `XPProgress` | Level/XP display |
| `DailyQuests` | Quest checklist |
| `LevelUpModal` | Level up celebration |
| `MiniChart` | Compact bar chart |
| `InsightCard` | Analytics insight |
| `WeeklyHeatmap` | Activity heatmap |
| `EquipmentSelector` | Equipment picker |
| `UnitToggle` | lbs/kg toggle |
| `RestTimerSettings` | Rest duration config |
| `WorkoutBuilder` | Exercise list builder |
| `SupersetGroup` | Grouped exercises |
| `ToastNotification` | Toast messages |
| `ConfirmDialog` | Confirmation modal |
| `FeedbackPrompt` | Rating/feedback form |
| `OnboardingStep` | Onboarding screen |
| `CoachMark` | Feature tutorial |
| `PRChart` | PR history chart |
| `VolumeComparison` | Week comparison |

---

## 📱 Page Templates

### HomePage
- Personalized greeting with time-based message
- Streak banner with flame animation
- Quick stats grid (workouts, streak, weekly)
- Suggested workout card with play button
- Recent workouts list
- Weekly progress calendar
- Quick action buttons

### ExerciseLibraryPage
- Search bar with 65+ exercises
- Category filter pills (All, Push, Pull, Legs, Core)
- Grid/List view toggle
- Exercise cards with difficulty badges
- Floating add button

### ExerciseDetailPage
- Hero image with exercise visualization
- Tabbed content (Overview, Muscles, History)
- Step-by-step instructions
- Pro tips callout
- Muscle activation bars
- PR card and history list
- "Add to Workout" CTA

### WorkoutSessionPage
- Live workout timer
- Progress bar (sets completed)
- Current exercise card
- Set progress dots
- Weight/reps input with quick adjust
- Rest timer overlay
- Skip/pause controls

### ProfilePage
- Avatar and user info
- Credit balance card
- Stats grid (workouts, streak, volume, PRs)
- Tabbed content (Stats, Achievements, History)
- Achievement badge grid
- Workout history list

### ProgressPage
- Period selector (Week/Month/Year)
- Summary stat cards with trends
- Volume bar chart
- Muscle balance bars
- Recent PRs list

---

## 🛠 Installation & Usage

### Quick Start

```bash
# Clone/download the files
# Copy MuscleMapUI.jsx to your src/components/

# Install dependencies
npm install react tailwindcss

# Configure Tailwind
npx tailwindcss init
```

### Tailwind Config

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
        },
      },
    },
  },
};
```

### Import Components

```jsx
import { 
  Button, 
  Input, 
  ExerciseCard, 
  RestTimer,
  HomePage 
} from './components/MuscleMapUI';

function App() {
  return (
    <div className="min-h-screen bg-slate-900">
      <HomePage user={{ name: 'Niko', streak: 7 }} />
    </div>
  );
}
```

---

## 📚 Storybook Setup

```bash
# Initialize Storybook
npx storybook@latest init

# Install addons
npm install -D @storybook/addon-a11y @storybook/addon-viewport

# Copy story files from MuscleMapStorybook.jsx

# Run Storybook
npm run storybook
```

---

## ♿ Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus rings (ring-2 ring-teal-500)
- Screen reader text
- Semantic HTML elements
- Color contrast ratios (WCAG AA)
- Touch targets (min 44px)

---

## 📁 File Organization

```
src/
├── components/
│   └── ui/
│       ├── foundation/    # Buttons, inputs, selections
│       ├── cards/         # Cards, badges, progress
│       ├── navigation/    # Nav, tabs, headers
│       ├── overlays/      # Modals, sheets, toasts
│       ├── workout/       # Timers, loggers, heatmaps
│       └── specialized/   # Gamification, social
├── pages/
│   ├── HomePage.jsx
│   ├── ExerciseLibrary.jsx
│   ├── ExerciseDetail.jsx
│   ├── WorkoutSession.jsx
│   ├── Profile.jsx
│   └── Progress.jsx
└── stories/
    └── *.stories.jsx
```

---

## 🎯 Key Design Patterns

### Liquid-Glass Aesthetic
```jsx
className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl"
```

### Gradient Buttons
```jsx
className="bg-gradient-to-r from-teal-500 to-teal-600 shadow-lg shadow-teal-500/25"
```

### Glow Effects
```jsx
className="shadow-lg shadow-teal-500/30"
```

### Hover States
```jsx
className="hover:scale-[0.98] hover:brightness-110 transition-all"
```

### Loading States
```jsx
className="animate-spin" // Spinners
className="animate-pulse" // Skeletons
```

---

## 📄 License

MIT License - Free to use for MuscleMap and derivative projects.

---

## 🚀 Next Steps

1. **TypeScript** - Add type definitions
2. **Testing** - Jest + React Testing Library
3. **Animation** - Framer Motion integration
4. **Icons** - Lucide React library
5. **Forms** - React Hook Form + Zod
6. **State** - Zustand or Redux Toolkit
7. **API** - React Query for data fetching

---

Built with ❤️ for MuscleMap by Claude
