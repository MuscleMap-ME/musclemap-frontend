# MuscleMap Icon System

A comprehensive, unified icon library designed for the MuscleMap fitness platform.

## Overview

The MuscleMap icon system combines multiple high-quality icon libraries into a single, easy-to-use API with consistent theming that matches our Liquid Glass design system.

### Libraries Included

| Library | Purpose | Icons |
|---------|---------|-------|
| **Lucide React** | General UI icons | 1,000+ |
| **Phosphor Icons** | Fitness-focused with weight variants | 7,000+ |
| **DiceBear** | Programmatic avatar generation | Unlimited |
| **Custom Fitness** | Muscle groups, equipment, metrics | 30+ |

## Quick Start

```jsx
// Import the unified Icon component
import Icon from '@/components/icons';

// Basic usage
<Icon name="dumbbell" />
<Icon name="heart" color="primary" size="lg" />
<Icon name="trophy" library="phosphor" weight="bold" />

// Import specific icons directly
import { Dumbbell, Heart, Trophy, MuscleChest } from '@/components/icons';

// Use avatars
import { Avatar, AvatarGroup } from '@/components/icons';
<Avatar seed={userId} style="avataaars" size="lg" />
```

## Icon Component

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | string | required | Icon name (see catalog below) |
| `library` | `'lucide'` \| `'phosphor'` | `'lucide'` | Which library to use |
| `size` | `'xs'` \| `'sm'` \| `'md'` \| `'lg'` \| `'xl'` \| number | `'md'` | Icon size |
| `color` | string | `'currentColor'` | Color name or CSS value |
| `weight` | `'thin'` \| `'light'` \| `'regular'` \| `'bold'` | `'regular'` | Stroke weight |
| `className` | string | `''` | Additional CSS classes |

### Size Scale

| Size | Pixels |
|------|--------|
| `xs` | 12px |
| `sm` | 16px |
| `md` | 20px |
| `lg` | 24px |
| `xl` | 32px |
| `2xl` | 40px |
| `3xl` | 48px |

### Brand Colors

```jsx
// Primary colors
<Icon name="star" color="primary" />     // #0066ff (brand-blue-500)
<Icon name="heart" color="secondary" />  // #ff3366 (brand-pulse-500)

// Text colors
<Icon name="user" color="white" />       // #ffffff
<Icon name="settings" color="muted" />   // rgba(255, 255, 255, 0.7)
<Icon name="help" color="subtle" />      // rgba(255, 255, 255, 0.5)

// Muscle group colors
<Icon name="activity" color="chest" />      // #ef4444
<Icon name="activity" color="back" />       // #3b82f6
<Icon name="activity" color="shoulders" />  // #f97316
<Icon name="activity" color="arms" />       // #8b5cf6
<Icon name="activity" color="legs" />       // #22c55e
<Icon name="activity" color="core" />       // #eab308
<Icon name="activity" color="cardio" />     // #ec4899

// Status colors
<Icon name="check" color="success" />    // #22c55e
<Icon name="alert" color="warning" />    // #eab308
<Icon name="x" color="error" />          // #ef4444
<Icon name="info" color="info" />        // #3b82f6
```

## Avatar Component

Generate unique, deterministic avatars for user profiles.

### Basic Usage

```jsx
import { Avatar } from '@/components/icons';

// Generate avatar from user ID
<Avatar seed={user.id} />

// Different styles
<Avatar seed={user.id} style="avataaars" />
<Avatar seed={user.id} style="bottts" />
<Avatar seed={user.id} style="lorelei" />
<Avatar seed={user.id} style="pixelArt" />
```

### Available Styles

- `avataaars` - Cartoon human avatars (default)
- `adventurer` - Adventurer-style portraits
- `bigEars` - Big ears character style
- `bigSmile` - Big smile characters
- `bottts` - Robot avatars
- `croodles` - Hand-drawn doodle style
- `funEmoji` - Fun emoji faces
- `identicon` - GitHub-style geometric patterns
- `lorelei` - Stylized portrait illustrations
- `micah` - Micah-style illustrations
- `miniavs` - Minimalist avatars
- `notionists` - Clean, minimal style
- `openPeeps` - Open Peeps illustration style
- `personas` - Persona-style avatars
- `pixelArt` - Pixel art style
- `rings` - Circular ring patterns
- `shapes` - Abstract geometric shapes
- `thumbs` - Thumbs up/down style

### Avatar with Status

```jsx
import { AvatarWithStatus } from '@/components/icons';

<AvatarWithStatus
  seed={user.id}
  status="online"   // 'online' | 'offline' | 'away' | 'busy'
  size="lg"
/>
```

### Avatar Group

```jsx
import { AvatarGroup } from '@/components/icons';

<AvatarGroup
  users={[
    { id: 'user1', name: 'Alice' },
    { id: 'user2', name: 'Bob' },
    { id: 'user3', name: 'Charlie' },
  ]}
  max={3}
  size="md"
/>
```

### Editable Avatar

```jsx
import { EditableAvatar } from '@/components/icons';

<EditableAvatar
  seed={user.id}
  imageUrl={user.avatarUrl}  // Shows uploaded image if provided
  onImageChange={(file) => handleUpload(file)}
  size="xl"
/>
```

## Custom Fitness Icons

Hand-crafted SVG icons for fitness-specific use cases.

### Muscle Group Icons

```jsx
import {
  MuscleChest,
  MuscleBack,
  MuscleShoulders,
  MuscleArms,
  MuscleBicep,
  MuscleLegs,
  MuscleCore,
  MuscleGlutes,
} from '@/components/icons';

// Use with muscle group colors
<MuscleChest color="#ef4444" size={32} />
<MuscleBack color="#3b82f6" size={32} />
```

### Exercise Type Icons

```jsx
import {
  ExercisePush,
  ExercisePull,
  ExerciseSquat,
  ExerciseCardio,
  ExerciseStretch,
} from '@/components/icons';
```

### Equipment Icons

```jsx
import {
  EquipmentBarbell,
  EquipmentDumbbell,
  EquipmentKettlebell,
  EquipmentBand,
  EquipmentMat,
  EquipmentTreadmill,
} from '@/components/icons';
```

### Metric Icons

```jsx
import {
  MetricReps,
  MetricSets,
  MetricWeight,
  MetricTime,
  MetricDistance,
  MetricCalories,
} from '@/components/icons';
```

### Body Composition Icons

```jsx
import {
  BodyFat,
  BodyMuscle,
  BodyScale,
} from '@/components/icons';
```

### Workout Status Icons

```jsx
import {
  WorkoutActive,
  WorkoutRest,
  WorkoutComplete,
  WorkoutSkipped,
} from '@/components/icons';
```

## Using with Phosphor

Phosphor icons offer multiple weight variants, making them ideal for creating visual hierarchy.

```jsx
import Icon from '@/components/icons';

// Different weights
<Icon name="barbell" library="phosphor" weight="thin" />
<Icon name="barbell" library="phosphor" weight="light" />
<Icon name="barbell" library="phosphor" weight="regular" />
<Icon name="barbell" library="phosphor" weight="bold" />

// Fitness-specific Phosphor icons
<Icon name="run" library="phosphor" />
<Icon name="swim" library="phosphor" />
<Icon name="heartbeat" library="phosphor" />
<Icon name="scales" library="phosphor" />    // Weight scale
<Icon name="drop" library="phosphor" />      // Hydration
<Icon name="apple" library="phosphor" />     // Nutrition
```

## Common Icon Patterns

### Navigation Bar

```jsx
import { Home, Activity, Users, Trophy, User } from '@/components/icons';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Activity, label: 'Workout', path: '/workout' },
  { icon: Users, label: 'Community', path: '/community' },
  { icon: Trophy, label: 'Achievements', path: '/achievements' },
  { icon: User, label: 'Profile', path: '/profile' },
];
```

### Button with Icon

```jsx
import { Plus, Play, Check } from '@/components/icons';

<button className="btn-primary">
  <Plus size={18} />
  <span>Add Exercise</span>
</button>

<button className="btn-pulse">
  <Play size={18} />
  <span>Start Workout</span>
</button>
```

### Status Indicators

```jsx
import { CheckCircle, AlertCircle, XCircle, Loader2 } from '@/components/icons';

const StatusIcon = ({ status }) => {
  const icons = {
    success: <CheckCircle className="text-green-500" />,
    warning: <AlertCircle className="text-yellow-500" />,
    error: <XCircle className="text-red-500" />,
    loading: <Loader2 className="animate-spin text-blue-500" />,
  };
  return icons[status];
};
```

### Workout Card with Icons

```jsx
import { Dumbbell, Clock, Flame, TrendingUp } from '@/components/icons';

<div className="card-glass p-4">
  <div className="flex items-center gap-2">
    <Dumbbell className="text-brand-blue-500" />
    <h3>Upper Body Power</h3>
  </div>
  <div className="flex gap-4 mt-2 text-text-secondary text-sm">
    <span className="flex items-center gap-1">
      <Clock size={14} /> 45 min
    </span>
    <span className="flex items-center gap-1">
      <Flame size={14} /> 320 cal
    </span>
    <span className="flex items-center gap-1">
      <TrendingUp size={14} /> Intermediate
    </span>
  </div>
</div>
```

## Glass Styling

Icons integrate seamlessly with the Liquid Glass design system.

```jsx
// Icon with glass shadow effect
<div className="glass p-4">
  <Trophy
    size={48}
    className="text-brand-pulse-500"
    style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))' }}
  />
</div>

// Glowing icon for active states
<Heart
  size={24}
  className="text-brand-pulse-500"
  style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
/>
```

## Performance Tips

1. **Import specific icons** instead of the entire library:
   ```jsx
   // Good - tree-shakable
   import { Heart, Star } from '@/components/icons';

   // Avoid - imports everything
   import * as Icons from '@/components/icons';
   ```

2. **Memoize avatar generation** for lists:
   ```jsx
   const MemoizedAvatar = React.memo(Avatar);
   ```

3. **Use CSS for color changes** instead of re-rendering:
   ```jsx
   <Heart className="text-gray-500 hover:text-red-500 transition-colors" />
   ```

## Accessibility

All icons include proper accessibility attributes:

```jsx
// Icons with meaning should have aria-label
<Heart aria-label="Like" role="img" />

// Decorative icons should be hidden from screen readers
<Sparkles aria-hidden="true" />

// Interactive icons in buttons
<button aria-label="Add to favorites">
  <Heart aria-hidden="true" />
</button>
```

## File Structure

```
src/components/icons/
├── index.js           # Main exports
├── Icon.jsx           # Unified Icon component
├── iconTheme.js       # Theme configuration
├── Avatar.jsx         # DiceBear avatar components
└── FitnessIcons.jsx   # Custom fitness SVG icons
```

## Contributing New Icons

To add custom icons:

1. Create SVG with 24x24 viewBox
2. Use `currentColor` for stroke/fill
3. Add to `FitnessIcons.jsx` following existing patterns
4. Export from `index.js`

```jsx
export const MyNewIcon = forwardRef(function MyNewIcon(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* SVG paths here */}
    </IconBase>
  );
});
```
