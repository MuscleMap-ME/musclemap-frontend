# MuscleMap CSS Architecture

**The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance**

This document describes the CSS architecture for MuscleMap, ensuring consistency across all components and future development.

## Architecture Overview

```
src/styles/
├── index.css           # Main entry point (imported by main.tsx)
├── tokens.css          # SINGLE SOURCE OF TRUTH for all CSS variables
├── animations.css      # All @keyframe definitions (consolidated)
├── fonts.css           # @font-face declarations
├── typography.css      # Text hierarchy system (Knuth-inspired)
├── reset.css           # CSS reset/normalize
├── layout.css          # Box-and-glue layout system
├── fallback-cascade.css # Progressive enhancement & browser fallbacks
└── archetype-cards.css # Archetype-specific glassmorphism cards
```

## Core Principles

### 1. Single Source of Truth

**ALL CSS custom properties live in `tokens.css`.** Never define `:root` variables anywhere else.

```css
/* tokens.css - THE ONLY place for CSS variables */
:root {
  --brand-blue-500: #0066ff;
  --glass-white-8: rgba(255, 255, 255, 0.08);
  --duration-normal: 200ms;
  /* ... all other variables */
}
```

### 2. Tailwind-First for Utility Classes

Use Tailwind classes for common styling. Only create custom classes for complex, reusable patterns.

```tsx
// GOOD - Tailwind utilities
<div className="flex items-center gap-4 p-4 rounded-lg">

// GOOD - Custom class for complex pattern
<div className="glass card-glass-interactive">

// BAD - Inline styles for things Tailwind handles
<div style={{ display: 'flex', alignItems: 'center' }}>
```

### 3. Component Classes in @layer components

All custom component classes MUST be in `@layer components` for proper Tailwind ordering:

```css
/* styles/index.css */
@layer components {
  .glass {
    background: var(--glass-white-5);
    backdrop-filter: blur(var(--blur-md));
    /* ... */
  }

  .btn-glass {
    /* Button styles using design tokens */
  }

  .card-glass {
    /* Card styles using design tokens */
  }
}
```

### 4. Animation Keyframes in animations.css

**Never define @keyframes in component files or inline.** All keyframes go in `animations.css`:

```css
/* animations.css - THE ONLY place for @keyframes */
@keyframes fadeIn { /* ... */ }
@keyframes shimmer { /* ... */ }
@keyframes glow-breathe { /* ... */ }
```

Use them via utility classes:
```tsx
<div className="animate-fadeIn" />
<div className="animate-shimmer" />
```

### 5. Progressive Enhancement

Always provide fallbacks for advanced CSS features:

```css
/* Use @supports for feature detection */
@supports not (backdrop-filter: blur(1px)) {
  .glass {
    background: rgba(15, 15, 25, 0.95) !important;
  }
}

/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  .animate-pulse, .animate-shimmer {
    animation: none;
  }
}
```

## Design Token Categories

### Brand Colors
```css
--brand-blue-50 through --brand-blue-900   /* Primary blue spectrum */
--brand-pulse-50 through --brand-pulse-900 /* Magenta accent spectrum */
```

### Semantic Colors
```css
--void-pure, --void-deep, --void-base      /* Background layers */
--glass-white-3 through --glass-white-30   /* Glass surfaces */
--glass-brand-*, --glass-pulse-*           /* Tinted glass */
--text-primary, --text-secondary, etc.     /* Text hierarchy */
--border-subtle, --border-default, etc.    /* Border opacity levels */
```

### Muscle Activation Colors
```css
--muscle-chest, --muscle-chest-glow
--muscle-back, --muscle-back-glow
/* etc. for all muscle groups */
```

### Blur & Glass Properties
```css
--blur-none, --blur-xs, --blur-sm, --blur-md, --blur-lg, --blur-xl, --blur-2xl
```

### Shadows & Glows
```css
--shadow-sm, --shadow-md, --shadow-lg, --shadow-xl
--inner-glow-subtle, --inner-glow-light, --inner-glow-medium
--glow-brand-sm, --glow-brand-md, --glow-brand-lg
--glow-pulse-sm, --glow-pulse-md, --glow-pulse-lg
```

### Spacing Scale
```css
--space-0 through --space-24 (based on 4px unit)
```

### Animation Timing
```css
--duration-instant (50ms), --duration-fast (100ms), --duration-normal (200ms)
--duration-slow (300ms), --duration-slower (500ms), --duration-slowest (800ms)
--ease-spring, --ease-out, --ease-in-out, --ease-smooth
```

### Z-Index Layers
```css
--z-base (0), --z-elevated (10), --z-dropdown (100), --z-sticky (200)
--z-overlay (300), --z-modal (400), --z-popover (500), --z-toast (600)
--z-tooltip (9500)
```

## Component Styling Patterns

### Glass Surfaces

```tsx
// Base glass
<div className="glass rounded-xl p-4">

// Interactive glass card
<div className="card-glass card-glass-interactive">

// Glass variants
<div className="glass-subtle" />  // Lightest
<div className="glass-medium" />  // Standard
<div className="glass-heavy" />   // Most prominent
<div className="glass-brand" />   // Blue-tinted
<div className="glass-pulse" />   // Magenta-tinted (active states)
```

### Buttons

```tsx
// Glass button (default)
<button className="btn-glass">Action</button>

// Primary CTA
<button className="btn-glass btn-primary">Save</button>

// Pulse/Action button (workouts, active states)
<button className="btn-glass btn-pulse">Start Workout</button>
```

### Animations

```tsx
// Entrance animations
<div className="animate-fadeIn" />
<div className="animate-fadeInUp" />
<div className="animate-scaleIn" />

// Attention animations
<div className="animate-pulse" />
<div className="animate-bounce" />

// Loading animations
<div className="animate-shimmer" />
<div className="animate-spin" />

// Stagger delays
<div className="animate-fadeIn animate-delay-100" />
<div className="animate-fadeIn animate-delay-200" />
```

### Glow Effects

```tsx
// Static glows
<div className="glow-brand" />
<div className="glow-pulse" />

// Animated glows
<div className="glow-breathing" />      // Logo pulse
<div className="glow-activation" />     // Muscle activation
```

## React Component Best Practices

### Use Tailwind + Custom Classes

```tsx
function WorkoutCard({ workout }) {
  return (
    <div className="card-glass card-glass-interactive p-4">
      <h3 className="text-lg font-semibold text-white">
        {workout.name}
      </h3>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-sm text-secondary">{workout.duration}</span>
      </div>
    </div>
  );
}
```

### Conditional Classes with clsx

```tsx
import clsx from 'clsx';

function Button({ variant = 'secondary', active, className, ...props }) {
  return (
    <button
      className={clsx(
        'btn-glass',
        variant === 'primary' && 'btn-primary',
        variant === 'pulse' && 'btn-pulse',
        active && 'ring-2 ring-brand-blue-500',
        className
      )}
      {...props}
    />
  );
}
```

### Using CSS Variables in JS

```tsx
// Access CSS variables when needed
const primaryBlue = getComputedStyle(document.documentElement)
  .getPropertyValue('--brand-blue-500');

// Or use them directly in inline styles (rare cases only)
<div style={{ color: 'var(--brand-pulse-500)' }} />
```

## NEVER Do These

1. **Never define `:root` variables outside `tokens.css`**
2. **Never define `@keyframes` outside `animations.css`**
3. **Never use inline styles for things Tailwind handles**
4. **Never create duplicate glass/button/card classes**
5. **Never skip reduced-motion support for animations**
6. **Never skip backdrop-filter fallbacks for glass effects**
7. **Never use hardcoded color values - use CSS variables**
8. **Never use `!important` unless in fallback `@supports` blocks**

## File Import Order

The CSS files are imported in this specific order in `styles/index.css`:

```css
@import "tailwindcss";         /* 1. Tailwind base */
@import './tokens.css';        /* 2. Design tokens (variables) */
@import './fonts.css';         /* 3. Font definitions */
@import './animations.css';    /* 4. Keyframe animations */
@import './reset.css';         /* 5. CSS reset */
@import './layout.css';        /* 6. Layout system */
@import './typography.css';    /* 7. Text hierarchy */
@import './fallback-cascade.css'; /* 8. Browser fallbacks */
@import './archetype-cards.css';  /* 9. Component styles */
```

## Adding New Styles

### New CSS Variable?
Add to `tokens.css` in the appropriate section.

### New Animation?
Add keyframes to `animations.css`, utility class to the utility section.

### New Component Pattern?
Add to `@layer components` in `styles/index.css`.

### New Page-Specific Styles?
Prefer Tailwind utilities. If complex pattern, add to `@layer components`.

## Browser Compatibility

- **Backdrop filter**: Falls back to solid backgrounds in unsupported browsers
- **CSS variables**: Supported in all modern browsers
- **@supports queries**: Used for progressive enhancement
- **Reduced motion**: All animations respect `prefers-reduced-motion`
- **iOS Lockdown Mode + Brave**: Special handling via SafeMotion components

## Related Documentation

- `CLAUDE.md` - CSS coding standards section
- `docs/CODING-STYLE-GUIDE.md` - General coding standards
- `src/utils/safeMotion.tsx` - Animation compatibility for iOS/Brave
