# Redesign Implementation Tracker

## Quick Reference

**Master Plan:** `docs/KNUTH-INSPIRED-REDESIGN-MASTERPLAN.md`

---

## Core Principles Summary

| Principle | Description |
|-----------|-------------|
| **Meta-Design** | One definition → infinite variations (parametric tokens) |
| **Boxes & Glue** | Flexible spacing that stretches/shrinks (CSS Flexbox/Grid) |
| **Separation of Concerns** | Content (data) → Structure (HTML) → Presentation (computed) |
| **Universal Rendering** | 4 tiers: full → reduced → minimal → text-only |
| **Progressive Enhancement** | Works everywhere, shines where possible |

---

## The 4 Rendering Tiers

| Tier | When Used | What's Rendered |
|------|-----------|-----------------|
| **Full** | Modern browsers, no restrictions | Glass effects, animations, all features |
| **Reduced** | `prefers-reduced-motion`, iOS+Brave, save-data | Styling but no animations |
| **Minimal** | Old browsers, low-end devices | Basic CSS, no effects |
| **Text-only** | Screen readers, Lynx, no CSS | Semantic HTML only |

---

## Phase Checklist

### Phase 1: Foundation (Weeks 1-2)
- [ ] Parametric CSS custom properties system
- [ ] `useRenderingTier` hook
- [ ] `SafeMotion` component wrapper
- [ ] Self-host Latin Modern + Inter Variable fonts
- [ ] CSS fallback cascade (`@supports` layers)
- [ ] User preferences schema + storage

### Phase 2: Typography (Weeks 3-4)
- [ ] Parametric type scale (calc-based)
- [ ] OpenType features CSS (ligatures, kerning)
- [ ] `text-wrap: pretty` with fallbacks
- [ ] Optical sizing system
- [ ] Dark mode optical adjustments
- [ ] Typography presets

### Phase 3: Layout (Weeks 5-6)
- [ ] Box-and-glue spacing system
- [ ] Container query components
- [ ] Auto-grid system
- [ ] Subgrid support with fallbacks
- [ ] Density presets

### Phase 4: Components (Weeks 7-10)
- [ ] Universal Card component
- [ ] Universal Button component
- [ ] Universal Navigation
- [ ] Atomic component library
- [ ] ARIA patterns
- [ ] Keyboard navigation

### Phase 5: Customization (Weeks 11-12)
- [ ] Display Settings page
- [ ] Live preview
- [ ] Preference persistence
- [ ] Preset themes
- [ ] Import/export preferences

### Phase 6: XR/Spatial (Weeks 13-14)
- [ ] XR capability detection
- [ ] Spatial layout CSS
- [ ] Vision Pro testing
- [ ] 3D muscle view optimization

### Phase 7: Testing (Weeks 15-16)
- [ ] Cross-browser matrix
- [ ] iOS Lockdown + Brave testing
- [ ] Screen reader testing
- [ ] Performance profiling
- [ ] Visual regression tests

---

## Key Files to Create/Modify

### New Files
```
src/
├── styles/
│   ├── reset.css                    # Knuth-inspired CSS reset
│   ├── parametric-tokens.css        # All CSS custom properties
│   ├── typography.css               # Type system
│   └── fallback-cascade.css         # @supports layers
├── hooks/
│   ├── useRenderingTier.ts          # Detect rendering capability
│   ├── useDesignParameters.ts       # Get computed params
│   ├── useUserPreferences.ts        # User display settings
│   └── useXRCapabilities.ts         # XR/VR/Vision Pro detection
├── components/
│   ├── universal/
│   │   ├── SafeMotion.tsx           # Animation wrapper
│   │   ├── Card.tsx                 # 4-tier card
│   │   ├── Button.tsx               # 4-tier button
│   │   └── ...
│   └── settings/
│       └── DisplaySettings.tsx      # Customization UI
├── lib/
│   ├── parameterComputer.ts         # Compute params from inputs
│   └── preferencesToCSS.ts          # Convert prefs to CSS vars
└── types/
    ├── design-tokens.ts             # Token type definitions
    └── userPreferences.ts           # Preference types
```

### Files to Modify
```
public/
├── fonts/                           # Add self-hosted fonts
│   ├── inter-var.woff2
│   ├── source-serif-var.woff2
│   ├── latin-modern-roman.woff2
│   └── jetbrains-mono-var.woff2
index.html                           # Font preloading
vite.config.js                       # Font optimization
tailwind.config.js                   # Token integration
```

---

## Font Assets Needed

| Font | Source | Weight Range | Size (est.) |
|------|--------|--------------|-------------|
| Inter Variable | rsms.me/inter | 100-900 | ~300KB |
| Source Serif 4 Variable | Adobe | 200-900 | ~200KB |
| Latin Modern Roman | GUST | 400, 700 | ~150KB |
| Latin Modern Math | GUST | 400 | ~400KB |
| JetBrains Mono Variable | JetBrains | 100-800 | ~150KB |

---

## Testing Matrix

### Browser Compatibility

| Browser | Config | Target |
|---------|--------|--------|
| Chrome | Standard | Full tier |
| Firefox | Standard | Full tier |
| Safari | Standard | Full tier |
| Brave | Shields Up | Reduced tier (graceful) |
| iOS Safari | Lockdown Mode | Reduced tier (graceful) |
| iOS Brave | Lockdown + Shields | Reduced tier (graceful) |
| Edge | Standard | Full tier |
| Samsung Internet | Ad block | Reduced tier |

### Device Compatibility

| Device | Target Tier |
|--------|-------------|
| iPhone SE (small) | Full/Reduced |
| iPhone Pro | Full |
| iPad | Full |
| Vision Pro | Full + spatial |
| Android low-end | Reduced/Minimal |
| Android flagship | Full |
| Quest 2/3 | Full + VR |
| Desktop 1080p | Full |
| Desktop 4K | Full |

### Accessibility

| Tool | Target |
|------|--------|
| VoiceOver (iOS/Mac) | Full navigation |
| NVDA (Windows) | Full navigation |
| JAWS | Full navigation |
| Keyboard only | Full interaction |
| High contrast mode | Enhanced visibility |

---

## Performance Budgets

| Metric | Budget |
|--------|--------|
| Initial JS (gzipped) | < 100KB |
| Initial CSS (gzipped) | < 30KB |
| Font files (subset) | < 500KB total |
| FCP (3G) | < 1.5s |
| TTI (3G) | < 3.5s |
| CLS | < 0.1 |

---

## Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm typecheck              # Type check
pnpm lint                   # Lint

# Testing
pnpm test:compatibility     # Cross-browser tests
pnpm test:a11y              # Accessibility audit
pnpm test:visual            # Visual regression

# Build
pnpm build:intelligent      # Production build
```

---

## Status

**Current Phase:** Planning
**Started:** 2026-01-25
**Target Completion:** 16 weeks from start

---

## Notes

- Breaking changes are OK — no users yet
- iOS Lockdown + Brave is the hardest target — if it works there, it works everywhere
- Math font (Latin Modern Math) only loaded when TU calculations displayed
- User preferences sync to cloud when authenticated, localStorage otherwise
