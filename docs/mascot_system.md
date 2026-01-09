# MuscleMap Dual Mascot System

This document describes the architecture and implementation of MuscleMap's dual mascot system.

## Overview

The system has **TWO DISTINCT MASCOT TYPES** that serve different purposes:

| Aspect | Global Site Mascot | User Companion Creatures |
|--------|-------------------|-------------------------|
| **Name** | TЯIPTθMΞAN Spirit | Training Companion |
| **Evolves** | No - static, unchanging | Yes - 6 stages of growth |
| **Costs credits** | No - free, ambient | Yes - upgrades cost training units |
| **Personalized** | No - same for all users | Yes - per-user state |
| **Appears** | Site-wide key moments | Persistent dock widget |
| **Purpose** | Brand identity, ecosystem link | Retention, delight, gamification |

---

## Global Site Mascot (TЯIPTθMΞAN Spirit)

### Identity

The Global Mascot is a 3D/2D animated symbol based on the TripToMean logo (θ theta/spiral):

- **Abstract & cosmic** - NOT cute, NOT a character with eyes
- **Ambient & observational** - watches over the site
- **Non-interactive** - users don't click to open panels (except About)
- **Static in progression** - never evolves, same for everyone

### Visual Design

- Central theta (θ) torus shape
- Orbiting particles, geometric halos
- Color: Purple gradient (#4c1d95 → #a855f7)
- Emissive glow, glass-like materials

### Placement Locations

| Location | Size | Animation State |
|----------|------|-----------------|
| Hero/Landing | Large | `idle` |
| Loading states | Medium | `loading` |
| Onboarding welcome | Large | `greeting` |
| 404/Error pages | Medium | `contemplating` |
| About panel | Small | `idle` |

### Animation States

| State | Description |
|-------|-------------|
| `idle` | Gentle float, slow rotation, ambient particles |
| `greeting` | Brightens, welcoming gesture |
| `loading` | Faster rotation, pulsing energy |
| `celebrating` | Particle burst, triumphant |
| `contemplating` | Subdued, thoughtful sway |

### Ecosystem Links

- Main site: https://triptomean.com
- About: https://triptomean.com/ABOUT
- Sections: SCIENCE, ART, POETRY, LINKS, Rχ

---

## User Companion Creatures

### Evolution Stages

| Stage | Name | XP Threshold | Visual |
|-------|------|--------------|--------|
| 1 | Baby | 0 | Small, simple, learning |
| 2 | Adolescent | 100 | Growing, defined |
| 3 | Capable | 500 | Strong, confident |
| 4 | Armored | 1,500 | Protected, resilient |
| 5 | Flying | 4,000 | Winged, aerial |
| 6 | Magnificent | 10,000 | Legendary, complete |

### XP & Training Unit Economy

**Earning:**
| Action | XP | Training Units |
|--------|----|----|
| Workout logged | +10 | +5 |
| 7-day streak | +25 | +15 |
| Personal record | +50 | +25 |
| Goal milestone | +15 | +10 |
| Community contribution | +30 | +20 |

**Spending:**
| Category | Cost Range |
|----------|------------|
| Auras | 50-500 units |
| Armor | 100-1000 units |
| Wings | 200-1500 units |
| Tools | 150-400 units |
| Abilities | 300-500 units |

### Upgrade Categories

| Category | Examples | Effect |
|----------|----------|--------|
| Aura | Golden, Ember, Frost, Shadow, Cosmic | Visual glow |
| Armor | Vest, Plate, Crystal, Mythic | Visual protection |
| Wings | Fledgling, Seraphim, Dragon, Astral | Visual (stage 3+) |
| Tools | Stats Slate, Trophy Case, Focus Orb | Info overlays |
| Badge | Streak badges, PR badge | Achievement display |
| Ability | Coach Tips, Social Link, Deep Sight | Unlocks features |

### Event Reactions

| Event | Companion Behavior |
|-------|-------------------|
| Login | Wave greeting |
| Workout logged | Celebrate, show XP gain |
| Streak milestone | Special animation |
| PR set | Victory dance |
| Stage evolution | Major celebration |
| Upgrade purchased | Sparkle, equip animation |

---

## API Endpoints

### Global Mascot (Public)

```
GET /api/mascot/global/config
  Returns global mascot configuration

GET /api/mascot/global/placements?location={location}
  Returns placement configuration for specified location
```

### User Companion (Authenticated)

```
GET /api/mascot/companion/state
  Returns current companion state for authenticated user

PATCH /api/mascot/companion/settings
  Update visibility, sounds, tips settings

PATCH /api/mascot/companion/nickname
  Set companion nickname

GET /api/mascot/companion/upgrades
  Get available upgrades with purchase status

POST /api/mascot/companion/upgrades/:id/purchase
  Purchase an upgrade

POST /api/mascot/companion/cosmetics/equip
  Equip/unequip a cosmetic

GET /api/mascot/companion/events/recent
  Get recent companion events

POST /api/mascot/companion/events/mark-reacted
  Mark events as having shown reaction

GET /api/mascot/companion/tips/next
  Get next tip for companion to show
```

---

## Database Schema

### Tables

- `global_mascot_config` - Global mascot configuration
- `global_mascot_placements` - Placement configurations
- `companion_templates` - Base companion templates
- `user_companion_state` - Per-user companion state
- `companion_upgrades` - Available upgrades catalog
- `companion_events` - Event log for XP/reactions
- `companion_tips_log` - Tip display history

### Key Relationships

```
users
  └── user_companion_state (1:1)
        └── companion_templates (many:1)
        └── companion_events (1:many)
        └── companion_tips_log (1:many)
```

---

## Frontend Components

### Global Mascot

```
src/components/mascot/global/
├── useGlobalMascot.js      # Hook for config/placements
├── GlobalMascot2D.jsx      # SVG fallback
├── GlobalMascot3D.jsx      # Three.js WebGL render
├── GlobalMascotHero.jsx    # Hero section placement
├── GlobalMascotLoader.jsx  # Loading indicator
└── GlobalMascotAbout.jsx   # About panel modal
```

### User Companion

```
src/components/mascot/companion/
├── CompanionContext.jsx    # State management
├── CompanionDock.jsx       # Persistent dock widget
├── CompanionCharacter.jsx  # Character visualization
├── CompanionPanel.jsx      # Management panel
├── CompanionProgress.jsx   # XP progression display
└── CompanionReaction.jsx   # Event reaction bubbles
```

---

## Asset Pipeline

### Directory Structure

```
public/mascot/
├── global/
│   ├── ttm-spirit.svg      # 2D global mascot
│   └── ttm-spirit.png      # Static fallback
└── companion/
    ├── stages/
    │   ├── stage-1.svg     # Baby stage
    │   ├── stage-2.svg     # Adolescent
    │   ├── stage-3.svg     # Capable
    │   ├── stage-4.svg     # Armored
    │   ├── stage-5.svg     # Flying
    │   └── stage-6.svg     # Magnificent
    └── upgrades/
        └── (cosmetic assets)
```

### Adding New Upgrades

1. Add asset to `public/mascot/companion/upgrades/`
2. Insert row into `companion_upgrades` table:
```sql
INSERT INTO companion_upgrades (id, name, description, category, cost_units, prerequisite_stage, rarity, visual_asset_url)
VALUES ('new-upgrade-id', 'Upgrade Name', 'Description', 'category', 100, 1, 'rare', '/mascot/companion/upgrades/asset.svg');
```

---

## Integration Points

### Workout Completion

When a workout is logged, the companion event service is called:
```typescript
await companionEventsService.emit(userId, 'workout_logged', {
  workoutId,
  exerciseCount,
  totalTU,
});
```

### Achievement Awards

When awarding badges:
```typescript
await companionEventsService.awardBadge(userId, 'badge-streak-7');
```

---

## Accessibility

- Keyboard navigation supported
- ARIA labels on interactive elements
- Reduced motion preference honored
- Screen reader friendly labels
- High contrast visual elements

---

## Performance Considerations

- 3D rendering only when WebGL available
- Lazy loading of panel components
- Event polling every 30 seconds
- Reduced motion disables animations
- SVG fallbacks for all 3D elements
