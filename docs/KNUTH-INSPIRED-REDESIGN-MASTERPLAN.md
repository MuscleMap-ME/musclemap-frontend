# MuscleMap Hyper-Modern Redesign Master Plan

## The Knuth-Inspired Universal Design System

**Vision:** A fitness app that embodies Donald Knuth's typographic philosophy—mathematically precise, parametrically adaptive, universally accessible, and timelessly beautiful.

**Core Principles:**
1. **Meta-Design** — One definition, infinite variations (like Metafont)
2. **Boxes and Glue** — Flexible, intelligent layout (like TeX)
3. **Separation of Concerns** — Content is data, presentation is computed
4. **Universal Rendering** — Same content renders beautifully on any device
5. **Progressive Enhancement** — Works everywhere, shines where possible

---

## Part I: The Philosophy

### 1.1 Why Knuth?

Donald Knuth created TeX and Metafont not just to make beautiful documents, but to create a *system* that could produce beautiful output under any conditions. His approach:

| Knuth's Problem | Knuth's Solution | Our Application |
|-----------------|------------------|-----------------|
| Fonts look different at different sizes | **Optical sizing** — different designs per size | Variable fonts with `font-optical-sizing` |
| Line breaks vary by column width | **Box and glue** — stretchable/shrinkable spaces | CSS Flexbox + `text-wrap: pretty` |
| Manual kerning is tedious | **Ligatures and kerning tables** | OpenType features via CSS |
| Fonts are static images | **Parametric fonts** — mathematical definitions | CSS custom properties + variable fonts |
| Different output devices need different code | **Device-independent format** (DVI) | Semantic HTML + computed styles |

### 1.2 The Three Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 3: PRESENTATION                    │
│         Computed styles, animations, visual effects         │
│    (Can be disabled entirely without losing information)    │
├─────────────────────────────────────────────────────────────┤
│                     LAYER 2: STRUCTURE                      │
│          Semantic HTML, ARIA roles, data attributes         │
│         (Accessible to screen readers, indexable)           │
├─────────────────────────────────────────────────────────────┤
│                      LAYER 1: CONTENT                       │
│             Pure data, text, numbers, relationships         │
│      (Could be rendered as plain text and still work)       │
└─────────────────────────────────────────────────────────────┘
```

**The Rule:** If Layer 3 fails completely (no CSS, no JS animations), the app MUST still function via Layers 1 and 2.

### 1.3 The Compatibility Commitment

**MuscleMap will work on:**

| Device | Minimum Experience | Enhanced Experience |
|--------|-------------------|---------------------|
| **Screen reader** | Full content, all interactions | N/A |
| **Text-only browser (Lynx)** | Core workout logging | N/A |
| **Feature phone (KaiOS)** | Basic functionality | Limited animations |
| **Cheap Android (~$50)** | Full app, reduced effects | N/A |
| **iOS Lockdown Mode + Brave Shields** | **Full functionality** | Graceful fallbacks |
| **Standard mobile** | Full app | Full animations |
| **Desktop** | Full app | Enhanced interactions |
| **Apple Vision Pro** | Full app | Spatial UI, gaze tracking |
| **VR headsets (Quest, etc.)** | Full app | 3D muscle visualization |

---

## Part II: The Typography System

### 2.1 Font Selection: The Knuth-Modern Stack

We will use fonts that embody Knuth's principles while being optimized for screens:

```css
:root {
  /* Primary: Latin Modern — Computer Modern's modern successor */
  --font-serif: 'Latin Modern Roman', 'Computer Modern', Georgia, 'Times New Roman', serif;

  /* Sans: Inter with optical sizing — the modern Swiss knife */
  --font-sans: 'Inter var', 'Inter', system-ui, -apple-system, sans-serif;

  /* Display: Variable font with weight + optical size axes */
  --font-display: 'Source Serif 4 Variable', 'Latin Modern Roman', serif;

  /* Mono: JetBrains Mono — ligatures + optical improvements */
  --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;

  /* Math: For any mathematical notation (TU calculations, etc.) */
  --font-math: 'Latin Modern Math', 'STIX Two Math', 'Cambria Math', serif;
}
```

**Font Files to Self-Host:**
- `Inter-Variable.woff2` (with `opsz` axis) — ~300KB
- `SourceSerif4-Variable.woff2` — ~200KB
- `LatinModern-Roman.woff2` — ~150KB
- `LatinModern-Math.woff2` — ~400KB (only load when needed)
- `JetBrainsMono-Variable.woff2` — ~150KB

### 2.2 Parametric Typography (Metafont Principles)

Instead of fixed font sizes, we define a **parametric type system**:

```css
:root {
  /* BASE PARAMETERS (the "Metafont parameters") */
  --type-base-size: 16px;           /* Foundation size */
  --type-scale-ratio: 1.25;         /* Major third scale */
  --type-line-height-ratio: 1.5;    /* Golden ratio approximation */
  --type-measure: 66ch;             /* Optimal line length */

  /* COMPUTED SIZES (derived from parameters) */
  --type-xs: calc(var(--type-base-size) / var(--type-scale-ratio) / var(--type-scale-ratio));
  --type-sm: calc(var(--type-base-size) / var(--type-scale-ratio));
  --type-base: var(--type-base-size);
  --type-lg: calc(var(--type-base-size) * var(--type-scale-ratio));
  --type-xl: calc(var(--type-base-size) * var(--type-scale-ratio) * var(--type-scale-ratio));
  --type-2xl: calc(var(--type-base-size) * var(--type-scale-ratio) * var(--type-scale-ratio) * var(--type-scale-ratio));
  --type-3xl: calc(var(--type-base-size) * var(--type-scale-ratio) * var(--type-scale-ratio) * var(--type-scale-ratio) * var(--type-scale-ratio));

  /* LINE HEIGHTS (proportional to size) */
  --leading-tight: 1.25;
  --leading-normal: var(--type-line-height-ratio);
  --leading-relaxed: 1.75;

  /* OPTICAL SIZE THRESHOLDS */
  --opsz-caption: 8;    /* Tiny text, high contrast needed */
  --opsz-text: 14;      /* Body text, balanced */
  --opsz-subhead: 24;   /* Subheadings */
  --opsz-display: 48;   /* Large display text, refined details */
}

/* Responsive adjustment of base parameters */
@media (max-width: 640px) {
  :root {
    --type-base-size: 15px;
    --type-scale-ratio: 1.2;  /* Tighter scale on mobile */
  }
}

@media (min-width: 1280px) {
  :root {
    --type-base-size: 18px;
    --type-scale-ratio: 1.333;  /* Perfect fourth on large screens */
  }
}

/* User preference: larger text */
@media (prefers-reduced-data: reduce) {
  :root {
    --type-base-size: 18px;  /* Larger for readability when data is limited */
  }
}
```

### 2.3 OpenType Features (Microtypography)

```css
/* Enable Knuth-quality typography */
body {
  /* Kerning */
  font-kerning: normal;

  /* Ligatures */
  font-variant-ligatures: common-ligatures contextual;

  /* Optimal line breaking (TeX-inspired) */
  text-wrap: pretty;
  hyphens: auto;
  hyphenate-limit-chars: 6 3 2;

  /* Optical sizing for variable fonts */
  font-optical-sizing: auto;

  /* Smooth rendering */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* Headlines: balanced wrapping */
h1, h2, h3, h4, h5, h6 {
  text-wrap: balance;
  font-variant-numeric: lining-nums;
}

/* Body text: pretty wrapping with hyphenation */
p, li, blockquote {
  text-wrap: pretty;
  font-variant-numeric: oldstyle-nums proportional-nums;
}

/* Tabular data: fixed-width numbers */
table, .stats, .numbers {
  font-variant-numeric: tabular-nums lining-nums;
}

/* Small caps for abbreviations */
abbr, .acronym {
  font-variant-caps: all-small-caps;
  letter-spacing: 0.05em;
}
```

### 2.4 The Dark Mode Optical Adjustment

Knuth understood that the same design doesn't work at all sizes. Similarly, light text on dark backgrounds needs adjustment:

```css
@media (prefers-color-scheme: dark) {
  body {
    /* Slightly heavier weight compensates for halation effect */
    font-variation-settings: 'wght' 420;
  }

  h1, h2, h3 {
    /* Display text can be slightly lighter in dark mode */
    font-variation-settings: 'wght' 580, 'opsz' 48;
  }
}
```

---

## Part III: The Layout System (Boxes and Glue)

### 3.1 TeX's Boxes and Glue → CSS Flexbox/Grid

Knuth's insight: layout is about **ideal sizes** plus **stretchability** and **shrinkability**.

```css
:root {
  /* SPACING GLUE (like TeX's glue) */
  --space-unit: 0.25rem;  /* Base unit */

  /* Named spaces with stretch/shrink behavior */
  --space-xs: calc(var(--space-unit) * 1);   /* 4px */
  --space-sm: calc(var(--space-unit) * 2);   /* 8px */
  --space-md: calc(var(--space-unit) * 4);   /* 16px */
  --space-lg: calc(var(--space-unit) * 6);   /* 24px */
  --space-xl: calc(var(--space-unit) * 8);   /* 32px */
  --space-2xl: calc(var(--space-unit) * 12); /* 48px */
  --space-3xl: calc(var(--space-unit) * 16); /* 64px */

  /* Flexible gaps (grow: 1, shrink: 0.5) */
  --gap-flexible: clamp(var(--space-sm), 2vw, var(--space-lg));
}

/* The "glue" utility classes */
.gap-flex { gap: var(--gap-flexible); }
.gap-stretch { gap: clamp(var(--space-xs), 3vw, var(--space-2xl)); }
```

### 3.2 The Container Query System

True separation of layout and content:

```css
/* Container definitions */
.card { container-type: inline-size; container-name: card; }
.panel { container-type: inline-size; container-name: panel; }
.section { container-type: inline-size; container-name: section; }

/* Components respond to their container, not viewport */
@container card (width < 200px) {
  .card-content { flex-direction: column; }
  .card-actions { display: none; }
}

@container card (width >= 200px) and (width < 400px) {
  .card-content { flex-direction: row; }
  .card-actions { display: flex; }
}

@container card (width >= 400px) {
  .card-content { flex-direction: row; gap: var(--space-lg); }
  .card-actions { display: flex; gap: var(--space-md); }
}
```

### 3.3 The Grid System (Knuth-Inspired)

```css
:root {
  /* Grid columns based on content, not arbitrary numbers */
  --grid-min-column: 280px;  /* Minimum readable column */
  --grid-max-column: 1fr;    /* Expand to fill */
  --grid-gap: var(--gap-flexible);
}

.auto-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(var(--grid-min-column), 100%), var(--grid-max-column))
  );
  gap: var(--grid-gap);
}

/* Subgrid for aligned children */
@supports (grid-template-columns: subgrid) {
  .card-grid > * {
    display: grid;
    grid-template-columns: subgrid;
  }
}
```

---

## Part IV: The Component Architecture

### 4.1 Atomic Design with Parametric Tokens

Components are defined by their **parameters**, not their pixels:

```typescript
// types/design-tokens.ts
interface DesignParameters {
  // Typography
  typeScale: number;        // 1.2 - 1.5
  typeBaseSize: number;     // 14 - 20px
  typeMeasure: number;      // 45 - 75ch

  // Spacing
  spaceUnit: number;        // 4 - 8px
  spaceScale: number;       // 1.5 - 2

  // Color
  hueShift: number;         // 0 - 360
  saturationScale: number;  // 0 - 1.5
  lightnessScale: number;   // 0.8 - 1.2

  // Effects
  motionScale: number;      // 0 (no motion) - 2 (dramatic)
  glassOpacity: number;     // 0 (solid) - 1 (fully transparent)
  blurIntensity: number;    // 0 (no blur) - 48px

  // Density
  informationDensity: 'compact' | 'normal' | 'spacious';
  touchTargetSize: 44 | 48 | 56;  // px
}

// Default parameters
const defaultParameters: DesignParameters = {
  typeScale: 1.25,
  typeBaseSize: 16,
  typeMeasure: 66,
  spaceUnit: 4,
  spaceScale: 2,
  hueShift: 0,
  saturationScale: 1,
  lightnessScale: 1,
  motionScale: 1,
  glassOpacity: 0.1,
  blurIntensity: 16,
  informationDensity: 'normal',
  touchTargetSize: 48,
};
```

### 4.2 The Rendering Pipeline

```
User Preferences ─┐
                  │
Device Caps ──────┼───▶ [Parameter Computer] ───▶ CSS Variables ───▶ Components
                  │
Network Status ───┘

1. Collect inputs (user prefs, device, network)
2. Compute parameters based on inputs
3. Inject as CSS custom properties
4. Components read properties, render accordingly
```

```typescript
// lib/parameterComputer.ts
function computeParameters(
  userPrefs: Partial<DesignParameters>,
  deviceCaps: DeviceCapabilities,
  networkStatus: NetworkStatus
): DesignParameters {
  const params = { ...defaultParameters, ...userPrefs };

  // Adjust for device
  if (deviceCaps.isLowEndDevice) {
    params.motionScale = Math.min(params.motionScale, 0.5);
    params.blurIntensity = Math.min(params.blurIntensity, 8);
    params.glassOpacity = Math.max(params.glassOpacity, 0.3); // More opaque = faster
  }

  // Adjust for network
  if (networkStatus.isSlowConnection || networkStatus.saveData) {
    params.motionScale = 0; // Disable animations
  }

  // Adjust for accessibility
  if (deviceCaps.prefersReducedMotion) {
    params.motionScale = 0;
  }

  if (deviceCaps.prefersHighContrast) {
    params.glassOpacity = 0; // Solid backgrounds
    params.saturationScale = 1.3; // More vivid colors
  }

  return params;
}
```

### 4.3 The Universal Component Pattern

Every component follows this pattern:

```tsx
// components/universal/Card.tsx
import { useDesignParameters } from '@/hooks/useDesignParameters';
import { useRenderingTier } from '@/hooks/useRenderingTier';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  // Content props only — no style props!
}

export function Card({ children, variant = 'default' }: CardProps) {
  const params = useDesignParameters();
  const tier = useRenderingTier(); // 'full' | 'reduced' | 'minimal' | 'text-only'

  // TEXT-ONLY TIER: Just semantic HTML
  if (tier === 'text-only') {
    return (
      <article className="card" data-variant={variant}>
        {children}
      </article>
    );
  }

  // MINIMAL TIER: Basic styling, no effects
  if (tier === 'minimal') {
    return (
      <article
        className="card card--minimal"
        data-variant={variant}
        style={{
          padding: `${params.spaceUnit * 4}px`,
          borderRadius: `${params.spaceUnit * 2}px`,
        }}
      >
        {children}
      </article>
    );
  }

  // REDUCED TIER: Styling but no animations
  if (tier === 'reduced') {
    return (
      <article
        className="card card--reduced"
        data-variant={variant}
        style={{
          '--card-padding': `${params.spaceUnit * 4}px`,
          '--card-radius': `${params.spaceUnit * 3}px`,
          '--card-bg': `rgba(255,255,255,${params.glassOpacity})`,
        } as React.CSSProperties}
      >
        {children}
      </article>
    );
  }

  // FULL TIER: All effects
  return (
    <motion.article
      className="card card--full"
      data-variant={variant}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 * params.motionScale }}
      style={{
        '--card-padding': `${params.spaceUnit * 4}px`,
        '--card-radius': `${params.spaceUnit * 3}px`,
        '--card-bg': `rgba(255,255,255,${params.glassOpacity})`,
        '--card-blur': `${params.blurIntensity}px`,
      } as React.CSSProperties}
    >
      {children}
    </motion.article>
  );
}
```

---

## Part V: The Compatibility Layer

### 5.1 The Rendering Tiers

```typescript
// hooks/useRenderingTier.ts
type RenderingTier = 'full' | 'reduced' | 'minimal' | 'text-only';

function useRenderingTier(): RenderingTier {
  const [tier, setTier] = useState<RenderingTier>('full');

  useEffect(() => {
    // Check capabilities
    const checks = {
      // Text-only: No CSS support or screen reader
      textOnly: !CSS.supports('display', 'flex') ||
                window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
                !CSS.supports('backdrop-filter', 'blur(1px)'),

      // Minimal: Basic CSS but no modern features
      minimal: !CSS.supports('backdrop-filter', 'blur(1px)') ||
               !CSS.supports('gap', '1px') ||
               isLowEndDevice(),

      // Reduced: Modern CSS but no animations
      reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
               isRestrictiveEnvironment() ||  // iOS Lockdown + Brave
               navigator.connection?.saveData,
    };

    if (checks.textOnly) setTier('text-only');
    else if (checks.minimal) setTier('minimal');
    else if (checks.reduced) setTier('reduced');
    else setTier('full');
  }, []);

  return tier;
}

// Detect iOS Lockdown Mode + Brave (problematic combination)
function isRestrictiveEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isBrave = !!(navigator as any).brave;

    // Also check for animation API availability
    const hasAnimationAPI = typeof document.createElement('div').animate === 'function';

    // Restrictive if iOS+Brave OR if animation API is broken
    return (isIOS && isBrave) || !hasAnimationAPI;
  } catch {
    return true; // Assume restrictive if we can't detect
  }
}
```

### 5.2 The Fallback Cascade

```css
/* LEVEL 0: Universal base (works in Lynx) */
.card {
  display: block;
  margin: 1em 0;
  padding: 1em;
  border: 1px solid;
}

/* LEVEL 1: Basic styling (works everywhere with CSS) */
@supports (display: flex) {
  .card {
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    background: #1a1a1a;
  }
}

/* LEVEL 2: Modern layout (90%+ browsers) */
@supports (gap: 1px) {
  .card {
    gap: var(--space-md, 16px);
  }
}

/* LEVEL 3: Glass effects (modern browsers) */
@supports (backdrop-filter: blur(1px)) {
  .card {
    background: rgba(255, 255, 255, var(--glass-opacity, 0.1));
    backdrop-filter: blur(var(--blur-intensity, 16px));
    -webkit-backdrop-filter: blur(var(--blur-intensity, 16px));
  }
}

/* LEVEL 4: Animations (when motion is OK) */
@media (prefers-reduced-motion: no-preference) {
  @supports (animation: name 1s) {
    .card {
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
  }
}

/* LEVEL 5: Advanced effects (high-end devices) */
@media (prefers-reduced-motion: no-preference) and (min-resolution: 2dppx) {
  .card {
    /* Only on high-DPI, modern devices */
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.1),
      0 8px 32px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
}
```

### 5.3 iOS Lockdown + Brave Shield Bulletproofing

**The Problem:** In iOS Lockdown Mode with Brave Shields, framer-motion animations can fail silently, leaving elements invisible.

**The Solution:** Never use opacity animations as the only visibility mechanism.

```tsx
// WRONG: Can leave element invisible
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
  Content that might disappear!
</motion.div>

// RIGHT: CSS ensures visibility, animation is enhancement
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  style={{ opacity: 1 }}  // CSS fallback
  className="visible-fallback"  // Class fallback
>
  Content always visible!
</motion.div>

// styles.css
.visible-fallback {
  opacity: 1 !important;
  visibility: visible !important;
}
```

**The Bulletproof Animation Pattern:**

```tsx
// components/SafeMotion.tsx
import { motion, MotionProps } from 'framer-motion';
import { useRenderingTier } from '@/hooks/useRenderingTier';

interface SafeMotionProps extends MotionProps {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

export function SafeMotion({
  children,
  as: Tag = 'div',
  initial,
  animate,
  ...props
}: SafeMotionProps) {
  const tier = useRenderingTier();

  // In reduced/minimal/text-only tiers, skip animation entirely
  if (tier !== 'full') {
    const Element = Tag as any;
    return (
      <Element
        {...props}
        style={{
          ...props.style,
          // Apply final animated values as static styles
          ...(typeof animate === 'object' ? animate : {}),
        }}
      >
        {children}
      </Element>
    );
  }

  // Full tier: use framer-motion with safety styles
  const MotionComponent = motion[Tag as keyof typeof motion] || motion.div;

  return (
    <MotionComponent
      initial={initial}
      animate={animate}
      {...props}
      style={{
        ...props.style,
        // Fallback: always ensure visibility
        opacity: 1,
        visibility: 'visible',
      }}
    >
      {children}
    </MotionComponent>
  );
}
```

---

## Part VI: The Customization System

### 6.1 User Preferences Schema

```typescript
// types/userPreferences.ts
interface UserDisplayPreferences {
  // Typography
  fontSize: 'small' | 'medium' | 'large' | 'x-large';  // 14, 16, 18, 20px
  fontFamily: 'sans' | 'serif' | 'mono' | 'system';
  lineSpacing: 'compact' | 'normal' | 'relaxed';

  // Information Density
  density: 'compact' | 'comfortable' | 'spacious';
  showMetrics: 'minimal' | 'standard' | 'detailed';
  cardStyle: 'minimal' | 'standard' | 'rich';

  // Visual Effects
  animations: 'none' | 'reduced' | 'full';
  glassEffects: boolean;
  colorTheme: 'dark' | 'light' | 'system';
  accentColor: string;  // HSL hue value 0-360

  // Accessibility
  highContrast: boolean;
  dyslexiaFont: boolean;
  focusIndicators: 'default' | 'enhanced';

  // Performance
  dataSaver: boolean;
  preloadPages: boolean;
  cacheImages: boolean;
}

// Default preferences
const defaultPreferences: UserDisplayPreferences = {
  fontSize: 'medium',
  fontFamily: 'sans',
  lineSpacing: 'normal',
  density: 'comfortable',
  showMetrics: 'standard',
  cardStyle: 'standard',
  animations: 'full',
  glassEffects: true,
  colorTheme: 'dark',
  accentColor: '220',  // Blue
  highContrast: false,
  dyslexiaFont: false,
  focusIndicators: 'default',
  dataSaver: false,
  preloadPages: true,
  cacheImages: true,
};
```

### 6.2 The Preference → CSS Variable Pipeline

```typescript
// lib/preferencesToCSS.ts
function preferencesToCSS(prefs: UserDisplayPreferences): string {
  const vars: Record<string, string> = {};

  // Font size
  const fontSizes = { small: '14px', medium: '16px', large: '18px', 'x-large': '20px' };
  vars['--type-base-size'] = fontSizes[prefs.fontSize];

  // Font family
  const fontFamilies = {
    sans: 'var(--font-sans)',
    serif: 'var(--font-serif)',
    mono: 'var(--font-mono)',
    system: 'system-ui, sans-serif',
  };
  vars['--font-body'] = fontFamilies[prefs.fontFamily];

  // Line spacing
  const lineHeights = { compact: '1.3', normal: '1.5', relaxed: '1.8' };
  vars['--type-line-height-ratio'] = lineHeights[prefs.lineSpacing];

  // Density
  const densityMultipliers = { compact: '0.75', comfortable: '1', spacious: '1.5' };
  vars['--density-multiplier'] = densityMultipliers[prefs.density];

  // Animation
  const motionScales = { none: '0', reduced: '0.5', full: '1' };
  vars['--motion-scale'] = motionScales[prefs.animations];

  // Glass effects
  vars['--glass-opacity'] = prefs.glassEffects ? '0.1' : '0.95';
  vars['--blur-intensity'] = prefs.glassEffects ? '16px' : '0px';

  // Accent color (HSL)
  vars['--accent-hue'] = prefs.accentColor;
  vars['--color-primary'] = `hsl(${prefs.accentColor}, 80%, 55%)`;
  vars['--color-primary-hover'] = `hsl(${prefs.accentColor}, 80%, 45%)`;

  // High contrast
  if (prefs.highContrast) {
    vars['--text-primary'] = '#ffffff';
    vars['--text-secondary'] = '#e0e0e0';
    vars['--border-color'] = '#ffffff';
  }

  // Dyslexia font
  if (prefs.dyslexiaFont) {
    vars['--font-body'] = "'OpenDyslexic', var(--font-sans)";
  }

  // Build CSS string
  return Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n');
}
```

### 6.3 The Customization UI

```tsx
// components/settings/DisplaySettings.tsx
export function DisplaySettings() {
  const [prefs, setPrefs] = useUserPreferences();

  return (
    <section aria-labelledby="display-settings">
      <h2 id="display-settings">Display Settings</h2>

      {/* Typography */}
      <fieldset>
        <legend>Typography</legend>

        <label>
          Font Size
          <select
            value={prefs.fontSize}
            onChange={(e) => setPrefs({ fontSize: e.target.value })}
          >
            <option value="small">Small (14px)</option>
            <option value="medium">Medium (16px)</option>
            <option value="large">Large (18px)</option>
            <option value="x-large">Extra Large (20px)</option>
          </select>
        </label>

        <label>
          Font Style
          <select
            value={prefs.fontFamily}
            onChange={(e) => setPrefs({ fontFamily: e.target.value })}
          >
            <option value="sans">Clean (Sans-serif)</option>
            <option value="serif">Classic (Serif)</option>
            <option value="mono">Technical (Monospace)</option>
            <option value="system">System Default</option>
          </select>
        </label>

        <label>
          Line Spacing
          <input
            type="range"
            min="1"
            max="3"
            value={{ compact: 1, normal: 2, relaxed: 3 }[prefs.lineSpacing]}
            onChange={(e) => setPrefs({
              lineSpacing: ['compact', 'normal', 'relaxed'][e.target.value - 1]
            })}
          />
        </label>
      </fieldset>

      {/* Information Density */}
      <fieldset>
        <legend>Information Density</legend>

        <div role="radiogroup" aria-label="Card density">
          {['compact', 'comfortable', 'spacious'].map((density) => (
            <label key={density}>
              <input
                type="radio"
                name="density"
                value={density}
                checked={prefs.density === density}
                onChange={() => setPrefs({ density })}
              />
              <span className="density-preview" data-density={density}>
                {density.charAt(0).toUpperCase() + density.slice(1)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Visual Effects */}
      <fieldset>
        <legend>Visual Effects</legend>

        <label>
          <input
            type="checkbox"
            checked={prefs.glassEffects}
            onChange={(e) => setPrefs({ glassEffects: e.target.checked })}
          />
          Glass blur effects (may impact performance)
        </label>

        <label>
          Animation Level
          <select
            value={prefs.animations}
            onChange={(e) => setPrefs({ animations: e.target.value })}
          >
            <option value="full">Full animations</option>
            <option value="reduced">Reduced (subtle only)</option>
            <option value="none">None (instant transitions)</option>
          </select>
        </label>

        <label>
          Accent Color
          <input
            type="range"
            min="0"
            max="360"
            value={prefs.accentColor}
            onChange={(e) => setPrefs({ accentColor: e.target.value })}
            style={{
              background: `linear-gradient(to right,
                hsl(0, 80%, 55%),
                hsl(60, 80%, 55%),
                hsl(120, 80%, 55%),
                hsl(180, 80%, 55%),
                hsl(240, 80%, 55%),
                hsl(300, 80%, 55%),
                hsl(360, 80%, 55%)
              )`
            }}
          />
        </label>
      </fieldset>

      {/* Accessibility */}
      <fieldset>
        <legend>Accessibility</legend>

        <label>
          <input
            type="checkbox"
            checked={prefs.highContrast}
            onChange={(e) => setPrefs({ highContrast: e.target.checked })}
          />
          High contrast mode
        </label>

        <label>
          <input
            type="checkbox"
            checked={prefs.dyslexiaFont}
            onChange={(e) => setPrefs({ dyslexiaFont: e.target.checked })}
          />
          Dyslexia-friendly font
        </label>

        <label>
          <input
            type="checkbox"
            checked={prefs.focusIndicators === 'enhanced'}
            onChange={(e) => setPrefs({
              focusIndicators: e.target.checked ? 'enhanced' : 'default'
            })}
          />
          Enhanced focus indicators
        </label>
      </fieldset>

      {/* Live Preview */}
      <div className="preview-panel" aria-live="polite">
        <h3>Preview</h3>
        <PreviewCard prefs={prefs} />
      </div>
    </section>
  );
}
```

---

## Part VII: XR/Spatial Computing Support

### 7.1 Vision Pro / VR Readiness

```tsx
// hooks/useXRCapabilities.ts
interface XRCapabilities {
  isXRAvailable: boolean;
  isImmersiveVR: boolean;
  isImmersiveAR: boolean;
  isVisionPro: boolean;
  gazeCursor: boolean;
  handTracking: boolean;
}

function useXRCapabilities(): XRCapabilities {
  const [caps, setCaps] = useState<XRCapabilities>({
    isXRAvailable: false,
    isImmersiveVR: false,
    isImmersiveAR: false,
    isVisionPro: false,
    gazeCursor: false,
    handTracking: false,
  });

  useEffect(() => {
    async function checkXR() {
      if (!navigator.xr) return;

      const isVR = await navigator.xr.isSessionSupported('immersive-vr');
      const isAR = await navigator.xr.isSessionSupported('immersive-ar');

      // Vision Pro detection (heuristic)
      const isVisionPro = isAR &&
        /Apple.*Safari/.test(navigator.userAgent) &&
        window.matchMedia('(display-mode: standalone)').matches;

      setCaps({
        isXRAvailable: isVR || isAR,
        isImmersiveVR: isVR,
        isImmersiveAR: isAR,
        isVisionPro,
        gazeCursor: isVisionPro,  // Vision Pro has gaze cursor
        handTracking: isVR || isVisionPro,
      });
    }

    checkXR();
  }, []);

  return caps;
}
```

### 7.2 Spatial Layout Adaptations

```css
/* Vision Pro / XR spatial adaptations */
@media (display-mode: immersive) {
  :root {
    /* Larger touch targets for spatial input */
    --touch-target-size: 64px;

    /* Increased spacing for depth perception */
    --space-unit: 8px;

    /* Reduced transparency (better in mixed reality) */
    --glass-opacity: 0.3;

    /* No blur (expensive in XR) */
    --blur-intensity: 0;
  }

  /* Float elements in z-space */
  .card {
    transform: translateZ(20px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  .card:hover, .card:focus-within {
    transform: translateZ(40px) scale(1.02);
  }

  /* Larger, more legible text */
  body {
    font-size: 20px;
    line-height: 1.8;
  }
}
```

---

## Part VIII: Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

| Task | Priority | Effort |
|------|----------|--------|
| Create parametric CSS custom properties system | P0 | Medium |
| Implement `useRenderingTier` hook | P0 | Low |
| Create `SafeMotion` component system | P0 | Medium |
| Self-host Latin Modern + Inter Variable fonts | P0 | Low |
| Implement CSS fallback cascade | P0 | Medium |
| Create user preferences schema + storage | P1 | Medium |

**Deliverable:** Core infrastructure that works on all devices.

### Phase 2: Typography System (Weeks 3-4)

| Task | Priority | Effort |
|------|----------|--------|
| Implement parametric type scale | P0 | Medium |
| Add OpenType feature CSS (ligatures, kerning) | P0 | Low |
| Implement `text-wrap: pretty` with fallbacks | P0 | Low |
| Create optical sizing system | P1 | Medium |
| Add dark mode optical adjustments | P1 | Low |
| Create typography presets (compact/normal/spacious) | P1 | Low |

**Deliverable:** Knuth-quality typography that adapts to any context.

### Phase 3: Layout System (Weeks 5-6)

| Task | Priority | Effort |
|------|----------|--------|
| Implement box-and-glue spacing system | P0 | Medium |
| Create container query components | P0 | High |
| Implement auto-grid system | P0 | Medium |
| Add subgrid support with fallbacks | P1 | Medium |
| Create density presets | P1 | Medium |

**Deliverable:** Flexible layouts that work from 320px to 4K+.

### Phase 4: Component Library (Weeks 7-10)

| Task | Priority | Effort |
|------|----------|--------|
| Refactor Card component with universal pattern | P0 | Medium |
| Refactor Button with tier support | P0 | Medium |
| Refactor Navigation | P0 | High |
| Create atomic component library | P0 | High |
| Add ARIA patterns throughout | P0 | Medium |
| Implement keyboard navigation | P0 | Medium |

**Deliverable:** Complete component library with 4-tier rendering.

### Phase 5: Customization UI (Weeks 11-12)

| Task | Priority | Effort |
|------|----------|--------|
| Build Display Settings page | P0 | High |
| Implement live preview | P0 | Medium |
| Add preference persistence (local + cloud sync) | P0 | Medium |
| Create preset themes | P1 | Low |
| Add import/export preferences | P2 | Low |

**Deliverable:** Full customization system.

### Phase 6: XR/Spatial (Weeks 13-14)

| Task | Priority | Effort |
|------|----------|--------|
| Add XR capability detection | P1 | Low |
| Create spatial layout CSS | P1 | Medium |
| Test on Vision Pro simulator | P1 | Medium |
| Optimize 3D muscle view for XR | P2 | High |

**Deliverable:** XR-ready application.

### Phase 7: Testing & Polish (Weeks 15-16)

| Task | Priority | Effort |
|------|----------|--------|
| Cross-browser testing matrix | P0 | High |
| iOS Lockdown + Brave testing | P0 | Medium |
| Screen reader testing | P0 | Medium |
| Performance profiling | P0 | Medium |
| Visual regression tests | P1 | Medium |

**Deliverable:** Production-ready redesigned application.

---

## Part IX: Breaking Changes & Migration

Since there are no users, we can make clean breaks:

### Removed
- All Express middleware remnants
- Google Analytics
- Google Fonts external loading
- jQuery-style DOM manipulation
- Non-parametric hardcoded styles

### Changed
- Component API: All style props → design tokens
- Animation: framer-motion → SafeMotion wrapper
- Typography: Fixed sizes → parametric scale
- Layout: Fixed breakpoints → container queries
- Colors: Hardcoded → HSL with user-adjustable hue

### Added
- 4-tier rendering system
- User display preferences
- Parametric design tokens
- XR/spatial computing support
- Universal accessibility

---

## Part X: Success Metrics

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint (3G) | < 1.5s | Lighthouse |
| Time to Interactive (3G) | < 3.5s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Core Web Vitals |
| Total Blocking Time | < 200ms | Lighthouse |
| Initial bundle (gzipped) | < 100KB | Build stats |

### Compatibility Targets

| Environment | Target |
|-------------|--------|
| iOS Safari + Lockdown Mode + Brave Shields | Full functionality |
| Text-only browsers (Lynx, w3m) | Core functionality |
| Screen readers (VoiceOver, NVDA, JAWS) | Full accessibility |
| Low-end Android (2GB RAM) | Smooth 30fps |
| Vision Pro / Quest | Usable spatial UI |

### Customization Targets

| Feature | Options |
|---------|---------|
| Font size | 4 presets + custom |
| Information density | 3 presets |
| Animation level | 3 presets |
| Color accent | Full HSL wheel |
| Contrast | Normal / High |

---

## Appendix A: Font Loading Strategy

```html
<!-- index.html -->
<head>
  <!-- Critical fonts: preload -->
  <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>

  <!-- Display fonts: prefetch (loaded on demand) -->
  <link rel="prefetch" href="/fonts/source-serif-var.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="prefetch" href="/fonts/latin-modern-math.woff2" as="font" type="font/woff2" crossorigin>

  <style>
    /* Inline critical @font-face to avoid FOIT */
    @font-face {
      font-family: 'Inter var';
      src: url('/fonts/inter-var.woff2') format('woff2');
      font-weight: 100 900;
      font-display: swap;
      font-style: normal;
    }
  </style>
</head>
```

## Appendix B: CSS Reset for Parametric Design

```css
/* reset.css - Knuth-inspired reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  /* Prevent font size inflation on mobile */
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;

  /* Use parametric base size */
  font-size: var(--type-base-size, 16px);

  /* Smooth scrolling (respects reduced motion) */
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}

body {
  min-height: 100vh;
  line-height: var(--type-line-height-ratio, 1.5);
  font-family: var(--font-body, var(--font-sans));
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Remove list styles (accessibility maintained via ARIA) */
ul, ol {
  list-style: none;
}

/* Images responsive by default */
img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
  height: auto;
}

/* Inherit fonts for form elements */
input, button, textarea, select {
  font: inherit;
}

/* Remove built-in form typography */
button {
  background: none;
  border: none;
  cursor: pointer;
}

/* Balanced headlines */
h1, h2, h3, h4, h5, h6 {
  text-wrap: balance;
  overflow-wrap: break-word;
}

/* Pretty paragraphs */
p {
  text-wrap: pretty;
  overflow-wrap: break-word;
}

/* Focus visible for keyboard users */
:focus-visible {
  outline: 2px solid var(--color-primary, #0066FF);
  outline-offset: 2px;
}

/* Remove focus for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}

/* Reduced motion: disable all animations/transitions */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Part XI: Internationalization & Localization (i18n/L10n)

### The Troika: Three Guiding Principles

1. **Maximum Flexibility** — Support any language, writing direction, measurement system
2. **Maximum User Choice** — Users control every aspect of their experience
3. **Maximum Performance** — Localization adds zero perceptible latency

### 11.1 Language Support (26+ Languages)

**Target Languages (Phase 1):**
| Region | Languages |
|--------|-----------|
| **Americas** | English (US), English (UK), Spanish, Portuguese (BR), French (CA) |
| **Europe** | German, French, Italian, Spanish, Portuguese, Dutch, Polish, Swedish, Norwegian, Danish, Finnish |
| **Middle East** | Arabic, Hebrew, Turkish |
| **Asia** | Japanese, Korean, Chinese (Simplified), Chinese (Traditional), Hindi, Thai, Vietnamese |
| **Other** | Russian |

### 11.2 Writing Direction System

**Full bidirectional support with CSS Logical Properties:**

```css
/* Use logical properties instead of physical */
.card {
  /* Instead of margin-left/right, use: */
  margin-inline-start: var(--space-4);
  margin-inline-end: var(--space-2);

  /* Instead of padding-top/bottom, use: */
  padding-block-start: var(--space-3);
  padding-block-end: var(--space-3);

  /* Instead of left/right for positioning: */
  inset-inline-start: 0;
}

/* Direction-aware flexbox */
.row {
  display: flex;
  flex-direction: row; /* Automatically reverses in RTL */
}

/* Explicit direction control */
html[dir="rtl"] {
  --direction-coefficient: -1;
}

html[dir="ltr"] {
  --direction-coefficient: 1;
}

/* For icons/arrows that need manual flipping */
.directional-icon {
  transform: scaleX(var(--direction-coefficient, 1));
}
```

**Supported Writing Modes:**

| Mode | CSS Value | Languages |
|------|-----------|-----------|
| **LTR Horizontal** | `direction: ltr; writing-mode: horizontal-tb;` | English, German, Spanish, etc. |
| **RTL Horizontal** | `direction: rtl; writing-mode: horizontal-tb;` | Arabic, Hebrew, Persian |
| **Vertical RTL** | `writing-mode: vertical-rl;` | Japanese (traditional), Chinese (traditional) |
| **Vertical LTR** | `writing-mode: vertical-lr;` | Mongolian (traditional) |

```typescript
// Writing direction hook
function useWritingDirection() {
  const { locale } = useLocale();

  const config = useMemo(() => {
    const rtlLocales = ['ar', 'he', 'fa', 'ur'];
    const verticalLocales = ['ja-vertical', 'zh-vertical', 'mn-vertical'];

    return {
      dir: rtlLocales.includes(locale) ? 'rtl' : 'ltr',
      writingMode: verticalLocales.includes(locale) ? 'vertical-rl' : 'horizontal-tb',
      isRTL: rtlLocales.includes(locale),
      isVertical: verticalLocales.includes(locale),
    };
  }, [locale]);

  return config;
}
```

### 11.3 Measurement Systems

**Support for all major systems:**

```typescript
type MeasurementSystem = 'metric' | 'imperial' | 'custom';

interface MeasurementConfig {
  system: MeasurementSystem;
  weight: 'kg' | 'lb' | 'stone';
  distance: 'km' | 'mi';
  height: 'cm' | 'ft-in';
  temperature: 'celsius' | 'fahrenheit';
  dateFormat: string; // e.g., 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'
  timeFormat: '12h' | '24h';
  firstDayOfWeek: 0 | 1 | 5 | 6; // Sun, Mon, Fri, Sat
  numberFormat: {
    decimal: '.' | ',';
    thousands: ',' | '.' | ' ' | "'";
  };
}

// Presets by region
const measurementPresets: Record<string, MeasurementConfig> = {
  'en-US': {
    system: 'imperial',
    weight: 'lb',
    distance: 'mi',
    height: 'ft-in',
    temperature: 'fahrenheit',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    firstDayOfWeek: 0,
    numberFormat: { decimal: '.', thousands: ',' },
  },
  'en-GB': {
    system: 'metric',
    weight: 'kg', // UK uses kg for gym
    distance: 'mi', // But miles for distance
    height: 'ft-in', // And feet-inches for height
    temperature: 'celsius',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    firstDayOfWeek: 1,
    numberFormat: { decimal: '.', thousands: ',' },
  },
  'de-DE': {
    system: 'metric',
    weight: 'kg',
    distance: 'km',
    height: 'cm',
    temperature: 'celsius',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h',
    firstDayOfWeek: 1,
    numberFormat: { decimal: ',', thousands: '.' },
  },
  // ... more presets
};
```

### 11.4 Time Zones

**Full timezone support with user override:**

```typescript
interface TimezoneConfig {
  timezone: string; // IANA timezone (e.g., 'America/New_York')
  autoDetect: boolean;
  showTimezoneInDates: boolean;
  workoutTimezone: 'local' | 'gym' | 'home'; // Where was the workout done?
}

// Hook for timezone-aware dates
function useTimezone() {
  const { timezone, autoDetect } = useUserPreferences();

  const effectiveTimezone = useMemo(() => {
    if (autoDetect) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    return timezone;
  }, [timezone, autoDetect]);

  const formatDate = useCallback((date: Date, options?: Intl.DateTimeFormatOptions) => {
    return new Intl.DateTimeFormat(locale, {
      timeZone: effectiveTimezone,
      ...options,
    }).format(date);
  }, [effectiveTimezone, locale]);

  return { timezone: effectiveTimezone, formatDate };
}
```

### 11.5 Translation Architecture

**Namespace-based loading for performance:**

```typescript
// Only load translations for current page
const namespaces = {
  common: ['buttons', 'navigation', 'errors'],
  dashboard: ['stats', 'charts', 'goals'],
  workout: ['exercises', 'sets', 'timer'],
  settings: ['preferences', 'account', 'display'],
  social: ['feed', 'messages', 'crews'],
};

// Lazy load translations per route
function useTranslations(namespace: keyof typeof namespaces) {
  const { locale } = useLocale();

  const { data: translations, isLoading } = useQuery({
    queryKey: ['translations', locale, namespace],
    queryFn: () => import(`@/locales/${locale}/${namespace}.json`),
    staleTime: Infinity, // Translations don't change during session
  });

  return { t: (key: string) => translations?.[key] ?? key, isLoading };
}
```

**Translation file structure:**

```
src/locales/
├── en/
│   ├── common.json
│   ├── dashboard.json
│   ├── workout.json
│   └── ...
├── de/
│   └── ...
├── ar/
│   └── ...
└── ja/
    └── ...
```

### 11.6 Font Support by Script

**Script-specific font stacks:**

```css
:root {
  /* Latin scripts (most European languages) */
  --font-latin: 'Inter var', system-ui, sans-serif;

  /* Arabic script */
  --font-arabic: 'Noto Sans Arabic', 'Geeza Pro', sans-serif;

  /* Hebrew script */
  --font-hebrew: 'Noto Sans Hebrew', 'Arial Hebrew', sans-serif;

  /* CJK (Chinese, Japanese, Korean) */
  --font-cjk: 'Noto Sans CJK', 'Hiragino Sans', 'Microsoft YaHei', sans-serif;

  /* Devanagari (Hindi) */
  --font-devanagari: 'Noto Sans Devanagari', sans-serif;

  /* Thai */
  --font-thai: 'Noto Sans Thai', 'Thonburi', sans-serif;
}

/* Apply based on lang attribute */
:lang(ar), :lang(fa), :lang(ur) {
  font-family: var(--font-arabic);
}

:lang(he) {
  font-family: var(--font-hebrew);
}

:lang(ja), :lang(zh), :lang(ko) {
  font-family: var(--font-cjk);
}

:lang(hi) {
  font-family: var(--font-devanagari);
}

:lang(th) {
  font-family: var(--font-thai);
}
```

### 11.7 User Preference UI

**Settings page structure:**

```tsx
function LocalizationSettings() {
  return (
    <SettingsSection title="Language & Region">
      {/* Language selector with native names */}
      <LanguageSelector
        options={[
          { value: 'en-US', label: 'English (US)', native: 'English' },
          { value: 'de-DE', label: 'German', native: 'Deutsch' },
          { value: 'ja-JP', label: 'Japanese', native: '日本語' },
          { value: 'ar-SA', label: 'Arabic', native: 'العربية' },
          // ... 26 languages
        ]}
      />

      {/* Time zone */}
      <TimezoneSelector
        autoDetect={true}
        showCurrentTime={true}
      />

      {/* Measurement system with granular control */}
      <MeasurementSettings
        presets={['metric', 'imperial', 'custom']}
        customOptions={['weight', 'distance', 'height', 'temperature']}
      />

      {/* Date & time format */}
      <DateTimeSettings
        dateFormats={['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']}
        timeFormats={['12h', '24h']}
        firstDayOfWeek={['Sunday', 'Monday', 'Friday', 'Saturday']}
      />

      {/* Number format preview */}
      <NumberFormatPreview
        sample={1234567.89}
      />

      {/* Writing direction (usually auto but can override) */}
      <WritingDirectionSelector
        options={['auto', 'ltr', 'rtl']}
        showPreview={true}
      />
    </SettingsSection>
  );
}
```

### 11.8 Implementation Phases for i18n

**Phase 1 (Week 13-14): Infrastructure**
- [ ] Set up i18n framework (react-i18next or similar)
- [ ] CSS logical properties migration
- [ ] RTL layout testing framework
- [ ] Timezone utility functions

**Phase 2 (Week 15-16): Core Languages**
- [ ] English (US/UK) baseline
- [ ] Spanish, French, German, Portuguese
- [ ] Professional translation for UI strings

**Phase 3 (Week 17-18): Extended Languages**
- [ ] Arabic, Hebrew (RTL support)
- [ ] Japanese, Korean, Chinese
- [ ] Thai, Vietnamese, Hindi

**Phase 4 (Week 19-20): Polish & QA**
- [ ] Native speaker review
- [ ] RTL layout fixes
- [ ] Measurement conversion accuracy
- [ ] Date/time format validation

---

*This master plan transforms MuscleMap from a good fitness app into a universal, timeless experience that embodies the mathematical beauty of Knuth's typographic principles while working flawlessly from screen readers to Vision Pro, in 26 languages and every writing direction.*
