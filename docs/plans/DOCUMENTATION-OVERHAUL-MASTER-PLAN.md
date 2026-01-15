# MuscleMap Documentation Overhaul Master Plan

> **Version:** 1.0.0 | **Status:** Planning | **Priority:** High
> **Goal:** Create world-class documentation that is intuitive, exhaustive, beautiful, and accessible

---

## Executive Summary

This plan outlines a complete overhaul of MuscleMap's documentation system to create:

1. **Interactive Rich Documentation** - Beautiful, illustrated docs with clickable visualizations using modern JavaScript libraries
2. **Plain-Text Repository** - Lightweight markdown files for low-bandwidth users, automated scrapers, and AI agents
3. **Hierarchical Organization** - Conceptually organized with a clear master plan and intuitive navigation
4. **Comprehensive Coverage** - Exhaustive documentation with examples, checklists, charts, and graphs

---

## Part 1: Current State Analysis

### 1.1 Existing Documentation Inventory

| Category | Count | Quality | Issues |
|----------|-------|---------|--------|
| Auto-generated docs | 4 | Good | Lacks depth, no examples |
| Technical guides | 15+ | Variable | Scattered, inconsistent structure |
| Implementation plans | 20+ | Good | Not user-facing, cluttered |
| Public user docs | 10 | Moderate | Incomplete, needs illustrations |
| Business docs | 6 | Good | Siloed, not integrated |
| Spec documents | 6 | Good | Hidden, hard to discover |

### 1.2 Current Pain Points

```
┌─────────────────────────────────────────────────────────────────┐
│  DOCUMENTATION PAIN POINTS                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. DISCOVERABILITY                                              │
│     • No clear entry point or navigation hierarchy               │
│     • Mixed purposes (dev docs, user guides, plans)              │
│     • No search functionality                                    │
│                                                                  │
│  2. VISUAL APPEAL                                                │
│     • Text-heavy, no illustrations                               │
│     • No interactive diagrams or visualizations                  │
│     • Tables are functional but not beautiful                    │
│                                                                  │
│  3. ACCESSIBILITY                                                │
│     • Single format (markdown) serves all audiences              │
│     • No low-bandwidth alternative                               │
│     • No machine-readable structured data                        │
│                                                                  │
│  4. COMPLETENESS                                                 │
│     • Many features undocumented                                 │
│     • Examples are sparse                                        │
│     • Checklists and quick-refs missing                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Strengths to Preserve

- Existing auto-generation pipeline (`scripts/generate-docs.cjs`)
- LaTeX support for professional PDFs
- Comprehensive API endpoint extraction
- Integration with deployment workflow
- Good technical depth in coding style guide

---

## Part 2: Documentation Architecture Vision

### 2.1 The Documentation Pyramid

```
                          ┌─────────────┐
                          │   LANDING   │  ← Entry point for all users
                          │    PAGE     │     Quick overview, links
                          └──────┬──────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              ┌─────┴─────┐             ┌─────┴─────┐
              │  USER     │             │ DEVELOPER │  ← Audience split
              │  DOCS     │             │   DOCS    │
              └─────┬─────┘             └─────┬─────┘
                    │                         │
         ┌──────────┼──────────┐    ┌─────────┼─────────┐
         │          │          │    │         │         │
    ┌────┴────┐ ┌───┴───┐ ┌───┴───┐ ┌───┴───┐ ┌───┴───┐ ┌───┴───┐
    │ Getting │ │Feature│ │ Guides│ │  API  │ │ Arch- │ │Contrib│
    │ Started │ │ Tours │ │       │ │  Ref  │ │iture  │ │  ute  │
    └─────────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘
         │          │          │         │         │         │
         └──────────┴──────────┴─────────┴─────────┴─────────┘
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                   ┌─────┴─────┐         ┌─────┴─────┐
                   │  RICH     │         │  PLAIN   │  ← Dual format
                   │  (HTML)   │         │  (MD)    │
                   └───────────┘         └──────────┘
```

### 2.2 Dual-Format Strategy

| Aspect | Rich Interactive Docs | Plain-Text Repository |
|--------|----------------------|----------------------|
| **Format** | HTML/CSS/JS | Pure Markdown |
| **Location** | `/public/docs/` (web) | `/docs-plain/` (repo) |
| **Audience** | Humans with browsers | Bots, agents, low-bandwidth |
| **Features** | Interactive charts, animations | Text, tables, ASCII diagrams |
| **Size** | ~5-10MB total | ~500KB total |
| **Updates** | Auto-generated from source | Auto-generated from source |

### 2.3 Core Principles

```
┌──────────────────────────────────────────────────────────────────┐
│  DOCUMENTATION DESIGN PRINCIPLES                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. PROGRESSIVE DISCLOSURE                                        │
│     Start simple, reveal complexity gradually                     │
│     Landing → Overview → Details → Reference                      │
│                                                                   │
│  2. TASK-ORIENTED                                                 │
│     Organize by what users want to DO, not by code structure      │
│     "How do I track a workout?" not "WorkoutService API"          │
│                                                                   │
│  3. MULTIPLE LEARNING STYLES                                      │
│     Visual learners: diagrams, charts, videos                     │
│     Reading learners: detailed prose                              │
│     Hands-on learners: code examples, tutorials                   │
│                                                                   │
│  4. SEARCHABLE & SCANNABLE                                        │
│     Clear headings, TOCs, keyword-rich content                    │
│     TL;DR summaries at the top of long pages                      │
│                                                                   │
│  5. LIVING DOCUMENTATION                                          │
│     Auto-generated where possible                                 │
│     Single source of truth (code → docs)                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Interactive Documentation System

### 3.1 JavaScript Library Selection

| Library | Purpose | Why This Choice |
|---------|---------|-----------------|
| **D3.js** | Data visualizations | Already in codebase, powerful, flexible |
| **Mermaid** | Diagrams (flowcharts, ER) | Text-to-diagram, easy to maintain |
| **Chart.js** | Simple charts (bar, line, pie) | Lightweight, great defaults |
| **Three.js** | 3D muscle visualizations | Already in codebase for muscle model |
| **Prism.js** | Code syntax highlighting | Best-in-class, many languages |
| **Fuse.js** | Client-side search | No backend needed, fast |
| **driver.js** | Interactive tours | Feature walkthrough capability |

### 3.2 Interactive Components to Build

#### 3.2.1 Architecture Visualizations

```javascript
// Interactive system architecture diagram
const ArchitectureDiagram = () => (
  <DiagramCanvas>
    <ClickableNode id="frontend" label="React Frontend" onClick={showDetails} />
    <ClickableNode id="api" label="Fastify API" onClick={showDetails} />
    <ClickableNode id="db" label="PostgreSQL" onClick={showDetails} />
    <AnimatedConnections />
    <ZoomControls />
  </DiagramCanvas>
);
```

**Features:**
- Click any component to see details
- Hover for quick info tooltips
- Zoom and pan for complex diagrams
- Export as PNG/SVG

#### 3.2.2 API Explorer

```
┌─────────────────────────────────────────────────────────────────┐
│  INTERACTIVE API EXPLORER                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Search endpoints...]                     [Filter by module ▼]  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ GET  /api/workouts/me                              [Try It] ││
│  │──────────────────────────────────────────────────────────────││
│  │ Get user's workout history                                  ││
│  │                                                             ││
│  │ Parameters:                                                 ││
│  │ ┌─────────┬──────────┬─────────────────────────────────────┐││
│  │ │ limit   │ number   │ Max results (default: 50)           │││
│  │ │ cursor  │ string   │ Pagination cursor                   │││
│  │ └─────────┴──────────┴─────────────────────────────────────┘││
│  │                                                             ││
│  │ Response:                                                   ││
│  │ ┌─────────────────────────────────────────────────────────┐ ││
│  │ │ {                                                       │ ││
│  │ │   "success": true,                                      │ ││
│  │ │   "data": { "workouts": [...], "nextCursor": "..." }    │ ││
│  │ │ }                                                       │ ││
│  │ └─────────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Live API testing in browser
- Auto-generated from OpenAPI/GraphQL schema
- Code snippet generation (curl, JavaScript, Python)
- Response schema visualization

#### 3.2.3 Feature Comparison Charts

```
           ARCHETYPE COMPARISON CHART (Interactive)

    Strength ████████████████░░░░ Bodybuilder
             ████████████████████ Powerlifter
             ████████░░░░░░░░░░░░ Runner

    Endurance ████░░░░░░░░░░░░░░░ Bodybuilder
              ██████░░░░░░░░░░░░░ Powerlifter
              ████████████████████ Runner

    [Click any bar to see detailed breakdown]
    [Toggle archetypes to compare]
```

#### 3.2.4 Database Schema Explorer

```
┌─────────────────────────────────────────────────────────────────┐
│  INTERACTIVE ER DIAGRAM                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│      ┌──────────────┐         ┌──────────────┐                  │
│      │    users     │────────▶│   workouts   │                  │
│      │──────────────│  1:N    │──────────────│                  │
│      │ id           │         │ id           │                  │
│      │ username     │         │ user_id ─────┤                  │
│      │ archetype_id │         │ duration     │                  │
│      └──────────────┘         │ created_at   │                  │
│             │                 └──────────────┘                  │
│             │ 1:1                    │                          │
│             ▼                        │ 1:N                      │
│      ┌──────────────┐                ▼                          │
│      │  user_stats  │         ┌──────────────┐                  │
│      │──────────────│         │  workout_sets │                  │
│      │ total_tu     │         │──────────────│                  │
│      │ level        │         │ exercise_id  │                  │
│      └──────────────┘         │ reps         │                  │
│                               │ weight       │                  │
│                               └──────────────┘                  │
│                                                                  │
│  [Click table to see columns] [Show indexes] [Export SQL]       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Rich Documentation Page Types

| Page Type | Interactive Elements | Example |
|-----------|---------------------|---------|
| **Landing** | Animated hero, feature carousel | `/docs/` |
| **Overview** | Interactive architecture diagram | `/docs/architecture` |
| **Tutorial** | Step progress, code playground | `/docs/guides/first-workout` |
| **Reference** | Searchable tables, expandable details | `/docs/api/endpoints` |
| **Feature** | Demo GIFs, comparison charts | `/docs/features/muscle-viz` |
| **Concept** | Mermaid diagrams, annotated code | `/docs/concepts/training-units` |

### 3.4 Visual Design System for Docs

```css
/* Documentation Color Palette */
:root {
  /* MuscleMap Brand Colors */
  --mm-electric-blue: #0066FF;
  --mm-pulse-magenta: #FF3366;
  --mm-deep-black: #0A0A0F;
  --mm-surface: rgba(255, 255, 255, 0.05);

  /* Documentation-specific */
  --doc-bg: #FAFBFC;
  --doc-text: #24292F;
  --doc-code-bg: #F6F8FA;
  --doc-border: #D0D7DE;
  --doc-accent: var(--mm-electric-blue);

  /* Status colors */
  --doc-success: #2DA44E;
  --doc-warning: #BF8700;
  --doc-error: #CF222E;
  --doc-info: #0969DA;
}
```

**Design Elements:**
- Glass morphism for floating panels
- Subtle gradients for section separators
- Consistent iconography (Lucide icons)
- Responsive breakpoints (mobile-first)
- Dark mode support

---

## Part 4: Plain-Text Documentation Repository

### 4.1 Directory Structure

```
docs-plain/
├── README.md                    # Entry point with TOC
├── QUICK-START.md               # 5-minute getting started
│
├── user-guide/
│   ├── README.md                # User docs index
│   ├── 01-getting-started.md
│   ├── 02-your-first-workout.md
│   ├── 03-tracking-progress.md
│   ├── 04-community-features.md
│   ├── 05-settings-privacy.md
│   └── 06-faq.md
│
├── features/
│   ├── README.md                # Feature index
│   ├── muscle-visualization.md
│   ├── training-units.md
│   ├── archetypes.md
│   ├── workout-generation.md
│   ├── gamification.md
│   ├── community.md
│   ├── nutrition.md
│   ├── career-standards.md
│   └── companion-pet.md
│
├── developer-guide/
│   ├── README.md                # Dev docs index
│   ├── 01-architecture.md
│   ├── 02-local-setup.md
│   ├── 03-coding-standards.md
│   ├── 04-testing.md
│   ├── 05-deployment.md
│   └── 06-contributing.md
│
├── api-reference/
│   ├── README.md                # API index
│   ├── authentication.md
│   ├── endpoints/
│   │   ├── workouts.md
│   │   ├── exercises.md
│   │   ├── users.md
│   │   ├── community.md
│   │   └── ... (one per module)
│   ├── graphql-schema.md
│   └── error-codes.md
│
├── concepts/
│   ├── README.md                # Concepts index
│   ├── training-units-explained.md
│   ├── muscle-activation-system.md
│   ├── credits-economy.md
│   ├── progression-system.md
│   └── data-model.md
│
├── checklists/
│   ├── README.md                # Checklists index
│   ├── new-feature-checklist.md
│   ├── deployment-checklist.md
│   ├── security-checklist.md
│   ├── testing-checklist.md
│   └── code-review-checklist.md
│
├── reference/
│   ├── README.md                # Reference index
│   ├── database-schema.md
│   ├── environment-vars.md
│   ├── cli-commands.md
│   ├── keyboard-shortcuts.md
│   └── glossary.md
│
└── machine-readable/
    ├── README.md                # Machine docs index
    ├── openapi.yaml             # OpenAPI 3.0 spec
    ├── graphql-schema.graphql   # Full GraphQL schema
    ├── database-schema.json     # JSON schema
    ├── features.json            # Feature manifest
    └── endpoints.json           # Flat endpoint list
```

### 4.2 Plain-Text Formatting Standards

```markdown
# Document Title

> TL;DR: One-sentence summary of this document.

---

## Table of Contents

1. [Section One](#section-one)
2. [Section Two](#section-two)
3. [Section Three](#section-three)

---

## Section One

### Subsection 1.1

Content here...

**Key Points:**
- Point one
- Point two
- Point three

### Subsection 1.2

| Column A | Column B | Column C |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |

---

## Section Two

### Code Example

```typescript
// Example code with comments
function example(): void {
  console.log('Hello');
}
```

### ASCII Diagram

```
┌─────────┐     ┌─────────┐
│ Client  │────▶│  Server │
└─────────┘     └─────────┘
```

---

## Checklist

- [ ] Step one
- [ ] Step two
- [ ] Step three

---

## See Also

- [Related Document 1](./related-1.md)
- [Related Document 2](./related-2.md)

---

*Last updated: YYYY-MM-DD | Auto-generated: No/Yes*
```

### 4.3 Machine-Readable Formats

#### OpenAPI Spec (excerpt)
```yaml
openapi: 3.0.3
info:
  title: MuscleMap API
  version: 1.0.0
  description: Fitness tracking API with muscle visualization

servers:
  - url: https://musclemap.me/api
    description: Production
  - url: http://localhost:3001
    description: Development

paths:
  /workouts:
    get:
      summary: Get user workouts
      operationId: getWorkouts
      tags: [Workouts]
      security:
        - bearerAuth: []
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 50
```

#### Feature Manifest (JSON)
```json
{
  "version": "1.0.0",
  "generated": "2026-01-15T00:00:00Z",
  "features": [
    {
      "id": "muscle-visualization",
      "name": "Real-Time Muscle Visualization",
      "description": "3D muscle model showing activation during exercises",
      "status": "stable",
      "platforms": ["web", "ios", "android"],
      "docs": "/docs/features/muscle-visualization"
    }
  ]
}
```

---

## Part 5: Content Categories & Examples

### 5.1 User Documentation Examples

#### Getting Started Guide (Illustrated)

```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR FIRST WORKOUT WITH MUSCLEMAP                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STEP 1: CREATE ACCOUNT                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │     ┌─────────────────────┐                                ││
│  │     │     Sign Up         │                                ││
│  │     │─────────────────────│                                ││
│  │     │ Email: [________]   │                                ││
│  │     │ Pass:  [________]   │                                ││
│  │     │ [Create Account]    │                                ││
│  │     └─────────────────────┘                                ││
│  │                                                             ││
│  │  You'll receive 100 free credits to get started!           ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  STEP 2: CHOOSE YOUR ARCHETYPE                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │   ⚔️ SPARTAN    🏋️ POWERLIFTER   🤸 GYMNAST               ││
│  │   Raw strength   Maximum power    Bodyweight mastery       ││
│  │                                                             ││
│  │   🏃 RUNNER     🧘 MONK          🥷 MARTIAL ARTIST         ││
│  │   Endurance      Mind-body       Combat readiness          ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  STEP 3: SET YOUR EQUIPMENT                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │   What equipment do you have access to?                     ││
│  │                                                             ││
│  │   [✓] Bodyweight (always available)                        ││
│  │   [ ] Kettlebells                                          ││
│  │   [ ] Dumbbells                                            ││
│  │   [ ] Barbell & Rack                                       ││
│  │   [ ] Pull-up Bar                                          ││
│  │   [ ] Full Gym Access                                      ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  STEP 4: START YOUR FIRST WORKOUT!                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │           [🚀 START WORKOUT]                                ││
│  │                                                             ││
│  │   MuscleMap will generate a personalized routine            ││
│  │   based on your archetype, equipment, and recovery.         ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 API Documentation Examples

#### Endpoint Documentation Template

```markdown
# POST /api/workouts

> Create a new workout session and log exercises.

## TL;DR

Start tracking a workout. Returns workout ID for logging sets.

---

## Request

### Headers

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |
| `Content-Type` | `application/json` | Yes |

### Body

```json
{
  "location": "gym",
  "notes": "Push day",
  "templateId": "uuid-optional"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `location` | string | No | Where you're training (gym/home/park) |
| `notes` | string | No | Optional workout notes |
| `templateId` | uuid | No | Use a saved template |

---

## Response

### Success (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "workout-uuid",
    "startedAt": "2026-01-15T10:30:00Z",
    "location": "gym",
    "status": "in_progress"
  }
}
```

### Errors

| Code | Message | Cause |
|------|---------|-------|
| 401 | Unauthorized | Missing or invalid token |
| 422 | Validation failed | Invalid location value |
| 429 | Rate limited | Too many requests |

---

## Code Examples

### cURL

```bash
curl -X POST https://musclemap.me/api/workouts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location": "gym"}'
```

### JavaScript

```javascript
const response = await fetch('https://musclemap.me/api/workouts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ location: 'gym' })
});

const { data } = await response.json();
console.log('Workout started:', data.id);
```

### Python

```python
import requests

response = requests.post(
    'https://musclemap.me/api/workouts',
    headers={'Authorization': f'Bearer {token}'},
    json={'location': 'gym'}
)

data = response.json()['data']
print(f"Workout started: {data['id']}")
```

---

## Related Endpoints

- [GET /api/workouts/me](./get-workouts.md) - List your workouts
- [POST /api/sets](./create-set.md) - Log a set
- [GET /api/exercises](./list-exercises.md) - Browse exercises
```

### 5.3 Concept Documentation Examples

#### Training Units Explained

```markdown
# Training Units (TU) - The Science Behind the Score

> TL;DR: TU measures your actual training volume accounting for muscle size,
> activation intensity, and exercise difficulty. It's the fairest way to
> compare workouts across different body parts and training styles.

---

## What are Training Units?

Training Units are MuscleMap's proprietary metric for measuring workout
effectiveness. Unlike simple rep counting, TU accounts for biomechanical
reality.

```
┌─────────────────────────────────────────────────────────────────┐
│                    TU CALCULATION                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TU = Σ (muscle_volume × activation_% × difficulty_multiplier)  │
│                                                                  │
│  Where:                                                          │
│  • muscle_volume: Relative size of each muscle group            │
│  • activation_%: How much the muscle is engaged (0-100%)        │
│  • difficulty_multiplier: Exercise complexity factor             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why TU Matters

### Problem: Rep Counting is Unfair

```
Traditional Counting:

  100 bicep curls = 100 reps ← Small muscle
  100 squats     = 100 reps ← Large muscle group

  Same score, VERY different workouts!
```

### Solution: TU is Volume-Weighted

```
TU Calculation:

  100 bicep curls = ~50 TU   (small muscle)
  100 squats      = ~300 TU  (quads + glutes + hamstrings)

  Reflects actual training stimulus!
```

---

## Muscle Volume Factors

| Muscle Group | Relative Volume | TU Multiplier |
|--------------|-----------------|---------------|
| Quadriceps   | Large           | 1.0           |
| Glutes       | Large           | 0.9           |
| Hamstrings   | Medium-Large    | 0.7           |
| Chest        | Medium          | 0.6           |
| Back (Lats)  | Large           | 0.8           |
| Shoulders    | Medium          | 0.5           |
| Biceps       | Small           | 0.3           |
| Triceps      | Small-Medium    | 0.35          |
| Calves       | Small           | 0.25          |
| Forearms     | Small           | 0.2           |
| Core         | Medium          | 0.4           |

---

## Example Calculations

### Squat (3 sets × 10 reps)

```
Primary Muscles:
  Quadriceps: 80% activation × 1.0 volume = 0.80
  Glutes:     70% activation × 0.9 volume = 0.63

Secondary Muscles:
  Hamstrings: 40% activation × 0.7 volume = 0.28
  Core:       30% activation × 0.4 volume = 0.12

Total per rep: 0.80 + 0.63 + 0.28 + 0.12 = 1.83 TU
Total for set: 1.83 × 10 reps × 3 sets = 54.9 TU
```

### Bicep Curl (3 sets × 12 reps)

```
Primary Muscles:
  Biceps: 90% activation × 0.3 volume = 0.27

Secondary Muscles:
  Forearms: 40% activation × 0.2 volume = 0.08

Total per rep: 0.27 + 0.08 = 0.35 TU
Total for set: 0.35 × 12 reps × 3 sets = 12.6 TU
```

---

## TU Benchmarks

| Level | Weekly TU | Training Style |
|-------|-----------|----------------|
| Beginner | 100-200 | 2-3 workouts |
| Intermediate | 200-400 | 3-4 workouts |
| Advanced | 400-600 | 4-5 workouts |
| Elite | 600+ | 5+ workouts |

---

## FAQ

**Q: Does weight lifted affect TU?**
A: Currently, TU measures volume (sets × reps × muscles). Intensity tracking
via RPE is separate. Future versions may incorporate load.

**Q: Why doesn't cardio earn more TU?**
A: TU measures resistance training volume. Cardio has separate metrics
(duration, heart rate zones) better suited to endurance activities.

**Q: Can I game TU with isolation exercises?**
A: You could, but you'd need to do many more sets of curls than squats
to earn the same TU. The system naturally encourages compound movements.
```

### 5.4 Checklist Examples

#### Deployment Checklist

```markdown
# Deployment Checklist

> Use this checklist before EVERY production deployment.

---

## Pre-Deployment

### Code Quality
- [ ] All tests pass (`pnpm test`)
- [ ] Type check passes (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] No console.log statements in production code
- [ ] No hardcoded secrets or credentials

### Database
- [ ] Migrations tested locally
- [ ] Migrations are reversible (or have rollback plan)
- [ ] New indexes added for new queries
- [ ] No breaking schema changes without migration path

### Documentation
- [ ] API changes documented
- [ ] New features have user docs
- [ ] CHANGELOG updated
- [ ] Version number bumped (if applicable)

---

## Deployment Steps

### 1. Merge Worktrees
```bash
./scripts/merge-all.sh
```
- [ ] All branches merged successfully
- [ ] No merge conflicts

### 2. Run Full Test Suite
```bash
pnpm test:harness --verbose
```
- [ ] All test categories pass
- [ ] No performance regressions

### 3. Deploy
```bash
./deploy.sh "Description of changes"
```
- [ ] Deploy script completes without errors
- [ ] Build succeeds
- [ ] Assets uploaded

### 4. Run Migrations (if any)
```bash
ssh root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:migrate"
```
- [ ] Migrations complete successfully
- [ ] No data loss

### 5. Restart Services (if needed)
```bash
ssh root@musclemap.me "pm2 restart musclemap-api"
```
- [ ] API restarts cleanly
- [ ] No error spike in logs

---

## Post-Deployment Verification

### Health Checks
- [ ] `curl https://musclemap.me/health` returns OK
- [ ] `curl https://musclemap.me/ready` returns OK
- [ ] Frontend loads without errors

### Smoke Tests
- [ ] Can log in
- [ ] Can start workout
- [ ] Can view dashboard
- [ ] New feature works as expected

### Monitoring
- [ ] No error spike in PM2 logs
- [ ] No unusual latency in metrics
- [ ] No failed requests in access log

---

## Rollback Plan

If issues are detected:

1. **Revert code**
   ```bash
   git revert HEAD
   ./deploy.sh "Rollback: <reason>"
   ```

2. **Rollback migration** (if applicable)
   ```bash
   ssh root@musclemap.me "cd /var/www/musclemap.me/apps/api && pnpm db:rollback"
   ```

3. **Restart services**
   ```bash
   ssh root@musclemap.me "pm2 restart musclemap-api"
   ```

4. **Notify team** of rollback and reason

---

*Last updated: 2026-01-15*
```

---

## Part 6: Implementation Roadmap

### 6.1 Phase 1: Foundation (Weeks 1-2)

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Create `/docs-plain/` directory structure | P0 | Low | Claude |
| Migrate existing content to new structure | P0 | Medium | Claude |
| Update `generate-docs.cjs` for dual output | P0 | Medium | Claude |
| Set up documentation build pipeline | P0 | Medium | Claude |
| Create README and navigation | P0 | Low | Claude |

**Deliverables:**
- Plain-text documentation repository live
- All existing docs migrated and organized
- Auto-generation working for both formats

### 6.2 Phase 2: Interactive Framework (Weeks 3-4)

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Set up Docusaurus or VitePress for rich docs | P1 | Medium | Claude |
| Integrate D3.js for visualizations | P1 | Medium | Claude |
| Build interactive API explorer | P1 | High | Claude |
| Create architecture diagram component | P1 | Medium | Claude |
| Implement client-side search | P1 | Low | Claude |

**Deliverables:**
- Interactive documentation site framework
- API explorer with live testing
- Architecture visualizations

### 6.3 Phase 3: Content Creation (Weeks 5-8)

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Write comprehensive Getting Started guide | P0 | Medium | Claude |
| Document all 791 API endpoints | P0 | High | Claude |
| Create feature tour pages with demos | P1 | High | Claude |
| Write concept explainers (TU, archetypes, etc.) | P1 | Medium | Claude |
| Create all checklists | P1 | Medium | Claude |
| Add code examples (JS, Python, curl) | P2 | Medium | Claude |

**Deliverables:**
- Complete user documentation
- Complete API reference
- All concept explainers
- Comprehensive checklists

### 6.4 Phase 4: Visual Polish (Weeks 9-10)

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Add illustrations to all major pages | P1 | High | Claude |
| Create animated feature demos | P2 | Medium | Claude |
| Build database schema explorer | P2 | Medium | Claude |
| Add comparison charts | P2 | Low | Claude |
| Implement dark mode | P2 | Low | Claude |

**Deliverables:**
- Fully illustrated documentation
- Animated demos
- Interactive schema explorer

### 6.5 Phase 5: Machine Readability (Week 11)

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Generate OpenAPI 3.0 specification | P1 | Medium | Claude |
| Export GraphQL schema with annotations | P1 | Low | Claude |
| Create feature manifest JSON | P2 | Low | Claude |
| Generate database schema JSON | P2 | Low | Claude |
| Add structured data (JSON-LD) | P3 | Low | Claude |

**Deliverables:**
- Complete OpenAPI spec
- Annotated GraphQL schema
- Machine-readable manifests

### 6.6 Phase 6: Integration & Launch (Week 12)

| Task | Priority | Effort | Owner |
|------|----------|--------|-------|
| Integrate docs into main site navigation | P0 | Low | Claude |
| Set up docs.musclemap.me subdomain | P1 | Low | Claude |
| Add docs search to main site | P1 | Medium | Claude |
| Create docs contribution guide | P2 | Low | Claude |
| Launch announcement | P2 | Low | Claude |

**Deliverables:**
- Documentation live at docs.musclemap.me
- Integrated with main site
- Contribution workflow documented

---

## Part 7: Technical Specifications

### 7.1 Documentation Generator Updates

```javascript
// Enhanced generate-docs.cjs outline

const generateDocs = async () => {
  // 1. Analyze codebase (existing)
  const pages = analyzePages();
  const routes = analyzeAPIRoutes();
  const components = analyzeComponents();
  const packages = analyzePackages();

  // 2. NEW: Generate plain-text docs
  await generatePlainTextDocs({
    pages,
    routes,
    components,
    packages,
    outputDir: 'docs-plain'
  });

  // 3. NEW: Generate rich docs data
  await generateRichDocsData({
    pages,
    routes,
    components,
    packages,
    outputDir: 'public/docs-data'
  });

  // 4. NEW: Generate machine-readable formats
  await generateOpenAPISpec(routes, 'docs-plain/machine-readable/openapi.yaml');
  await generateGraphQLDocs('docs-plain/machine-readable/graphql-schema.graphql');
  await generateFeatureManifest(pages, 'docs-plain/machine-readable/features.json');

  // 5. Existing: Generate markdown and LaTeX
  await generateMarkdown();
  await generateLaTeX();
};
```

### 7.2 Rich Documentation Framework

```
public/docs/
├── index.html              # Docs SPA entry point
├── assets/
│   ├── css/
│   │   ├── docs.css        # Documentation styles
│   │   └── prism.css       # Code highlighting
│   ├── js/
│   │   ├── docs.js         # Main docs app
│   │   ├── search.js       # Fuse.js search
│   │   ├── charts.js       # Chart.js wrapper
│   │   ├── diagrams.js     # Mermaid wrapper
│   │   └── api-explorer.js # API testing UI
│   └── images/
│       ├── icons/          # Feature icons
│       ├── diagrams/       # Static diagrams
│       └── screenshots/    # UI screenshots
├── data/
│   ├── navigation.json     # Sidebar structure
│   ├── search-index.json   # Pre-built search index
│   ├── endpoints.json      # API endpoint data
│   └── features.json       # Feature metadata
└── components/
    ├── SearchBar.js
    ├── Sidebar.js
    ├── CodeBlock.js
    ├── APIExplorer.js
    ├── ArchitectureDiagram.js
    └── FeatureComparison.js
```

### 7.3 Build Pipeline

```yaml
# .github/workflows/docs.yml

name: Build Documentation

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'apps/api/**'
      - 'docs/**'
      - 'scripts/generate-docs.cjs'

jobs:
  build-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Generate documentation
        run: pnpm docs:generate

      - name: Build rich docs
        run: pnpm docs:build

      - name: Deploy to docs site
        run: pnpm docs:deploy
```

---

## Part 8: Success Metrics

### 8.1 Documentation Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Coverage | 100% of features documented | Automated check |
| Freshness | Updated within 7 days of code changes | Git comparison |
| Examples | Every endpoint has code examples | Automated check |
| Illustrations | 80%+ pages have visuals | Manual audit |
| Search findability | <3 clicks to any topic | User testing |

### 8.2 User Experience Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first success | <5 minutes for "Hello World" | User testing |
| Documentation NPS | >50 | User surveys |
| Support ticket reduction | 30% reduction | Support analytics |
| API adoption | 20% increase in API usage | API analytics |

### 8.3 Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page load time (rich) | <2 seconds | Lighthouse |
| Page load time (plain) | <500ms | curl timing |
| Search latency | <100ms | Client metrics |
| Build time | <60 seconds | CI timing |

---

## Part 9: Appendices

### Appendix A: Document Templates

[Templates for each document type will be created during implementation]

### Appendix B: Icon Library

[Consistent icon set for use across all documentation]

### Appendix C: Screenshot Standards

[Guidelines for capturing consistent, high-quality screenshots]

### Appendix D: Writing Style Guide

[Tone, voice, and formatting guidelines for documentation]

---

## Conclusion

This documentation overhaul will transform MuscleMap's knowledge base from a scattered collection of markdown files into a world-class documentation system that serves all audiences:

- **End users** get beautiful, illustrated guides
- **Developers** get comprehensive API references with live testing
- **AI agents** get machine-readable structured data
- **Low-bandwidth users** get lightweight plain-text alternatives

The dual-format approach ensures accessibility without sacrificing richness, and the automated generation pipeline keeps everything in sync with the codebase.

---

*Document Status: Planning*
*Author: Claude Code*
*Created: 2026-01-15*
*Next Review: After Phase 1 completion*
