# Visual Architecture Maps - Implementation Plan

> MuscleMap Interactive Site Navigation and Architecture Visualization System

## Executive Summary

This document details the implementation plan for "Visual Architecture Maps" - a system of interactive, visual navigation tools that help users understand and explore MuscleMap. The system includes:

1. **Route Atlas** - Interactive map of all site routes
2. **Docs Atlas** - Visual documentation directory
3. **Architecture Atlas** - System architecture diagrams
4. **Roadmap Atlas** - Git-derived feature timeline (no dates)

All components use MuscleMap's liquid glass design language and are optimized for touch/mobile-first interaction.

---

## Phase 0: Discovery Findings

### Current Architecture

```
musclemap.me/
├── apps/
│   ├── api/           # Fastify API (47+ route files)
│   └── mobile/        # Expo React Native app
├── packages/
│   ├── client/        # @musclemap/client SDK
│   ├── core/          # Shared business logic
│   ├── shared/        # Types and utilities
│   └── ui/            # Shared UI components
├── src/               # React web frontend (Vite)
│   ├── components/    # Glass UI components
│   ├── pages/         # Route pages
│   └── index.css      # Liquid glass CSS system
└── docs/              # Documentation
```

### Existing Route Structure (from `src/App.jsx`)

**Public Routes (14):**
- `/` (Landing), `/login`, `/signup`, `/design-system`
- `/features`, `/technology`, `/science`, `/design`
- `/docs`, `/docs/:docId`
- `/skills`, `/skills/:treeId`
- `/martial-arts`, `/martial-arts/:disciplineId`
- `/issues`, `/issues/:id`, `/updates`, `/roadmap`

**Protected Routes (22):**
- `/dashboard`, `/onboarding`, `/workout`, `/journey`
- `/profile`, `/settings`, `/progression`
- `/community`, `/competitions`, `/locations`, `/highfives`
- `/credits`, `/messages`, `/wallet`, `/skins`
- `/exercises`, `/stats`, `/crews`, `/rivals`
- `/health`, `/goals`, `/limitations`, `/pt-tests`
- `/issues/new`, `/my-issues`

**Admin Routes (3):**
- `/admin-control`, `/admin/issues`, `/admin/monitoring`

### Existing Design System

The project uses a "liquid glass" aesthetic with:
- CSS custom properties in `src/index.css`
- `GlassSurface`, `GlassCard`, `GlassPanel`, `GlassModal` components
- Brand colors: `#0066ff` (blue), `#ff3366` (pulse/magenta)
- Dark background: `#0a0a0f`
- Glass effects: blur, transparency, luminous borders

### Existing Dependencies

- **Charts:** Recharts (already installed)
- **Animation:** Framer Motion (already installed)
- **Icons:** Lucide React, Phosphor Icons (already installed)
- **3D:** Three.js, @react-three/fiber (already installed)
- **No graph library** currently installed

---

## Phase 1: Technical Design

### 1.1 Visualization Library Recommendation

**Recommendation: React Flow**

| Criteria | React Flow | D3.js | Cytoscape | vis-network |
|----------|------------|-------|-----------|-------------|
| Touch Support | Excellent | Manual | Good | Good |
| React Integration | Native | Wrapper | Wrapper | Wrapper |
| Performance | Good (virtualized) | Excellent | Excellent | Good |
| Bundle Size | ~150KB | ~250KB | ~400KB | ~300KB |
| Learning Curve | Low | High | Medium | Medium |
| A11y Support | Good | Manual | Fair | Fair |
| Customization | Excellent | Excellent | Good | Good |

**Rationale:**
1. Native React component model aligns with MuscleMap's architecture
2. Built-in pan/zoom with touch support
3. Good TypeScript support
4. Active community and maintenance
5. Virtualized rendering for performance
6. Custom node/edge rendering for liquid glass styling

### 1.2 Route Atlas System

#### Data Source: Route Atlas Manifest

Routes will be extracted from `src/App.jsx` via a build-time script and supplemented with manual metadata.

```typescript
// src/components/atlas/atlasTypes.ts

export interface RouteAtlasManifest {
  version: string;
  generated: string;
  categories: RouteCategory[];
}

export interface RouteCategory {
  id: string;
  label: string;
  color: string;           // CSS color value
  icon: string;            // Lucide icon name
  routes: RouteNode[];
}

export interface RouteNode {
  id: string;              // Unique identifier
  path: string;            // Route path (e.g., "/dashboard")
  label: string;           // Display name
  description: string;     // Short description
  protection: 'public' | 'protected' | 'admin';
  icon?: string;           // Override category icon
  badge?: string;          // e.g., "NEW", "BETA"
  children?: RouteNode[];  // Nested routes
  relatedRoutes?: string[];// IDs of related routes
  position?: { x: number; y: number }; // Manual positioning override
}
```

#### Generation Script

```typescript
// scripts/generate-route-atlas.ts
// Parses src/App.jsx and extracts route definitions
// Merges with config/route-atlas-overrides.yaml for descriptions/metadata
// Outputs public/atlases/route-atlas.json
```

### 1.3 Docs Atlas System

#### Data Source: Docs Manifest

```typescript
export interface DocsAtlasManifest {
  version: string;
  generated: string;
  rootPath: string;
  documents: DocNode[];
}

export interface DocNode {
  id: string;
  path: string;           // File path relative to docs/
  title: string;          // Extracted from H1 or frontmatter
  description?: string;   // Extracted from first paragraph
  category?: string;      // Folder name or manual override
  icon?: string;
  children?: DocNode[];   // Subdirectories/files
  anchors?: DocAnchor[];  // H2/H3 headings as anchors
  relatedDocs?: string[]; // IDs of related documents
}

export interface DocAnchor {
  id: string;             // Anchor slug
  title: string;          // Heading text
  level: number;          // 2 for H2, 3 for H3
}
```

### 1.4 Architecture Atlas System

```typescript
export interface ArchitectureAtlasManifest {
  version: string;
  diagrams: ArchitectureDiagram[];
}

export interface ArchitectureDiagram {
  id: string;
  title: string;
  description: string;
  category: 'frontend' | 'backend' | 'data' | 'realtime' | 'flow';
  type: 'flowchart' | 'erd' | 'sequence' | 'component';
  source: string;         // Mermaid syntax
  interactiveNodes?: {
    nodeId: string;
    link?: string;
    tooltip?: string;
  }[];
}
```

### 1.5 Roadmap Atlas System

#### Git-Derived Timeline (No Dates)

```typescript
export interface RoadmapAtlasManifest {
  version: string;
  generated: string;
  phases: RoadmapPhase[];
}

export interface RoadmapPhase {
  id: string;
  number: number;         // 1, 2, 3... for ordering
  label: string;          // "Foundation", "Core Features", etc.
  description?: string;
  clusters: FeatureCluster[];
}

export interface FeatureCluster {
  id: string;
  label: string;
  description: string;
  status: 'completed' | 'in-progress' | 'planned';
  size: 'small' | 'medium' | 'large'; // Based on commit count
  icon?: string;
  relatedRoutes?: string[];
  relatedDocs?: string[];
  dependencies?: string[]; // Other cluster IDs
  highlights?: string[];   // Key features
}
```

#### Override Mechanism

```yaml
# config/roadmap-overrides.yaml
clusters:
  - id: "skills-system"
    label: "Skills & Progression"
    description: "7 skill trees with 45+ skills, XP and mastery tracking"
    mergePatterns: ["skills/*", "progression/*"]
    phase: 2

  - id: "community-v1"
    label: "Community Foundation"
    description: "Crews, rivalries, and social features"
    mergePatterns: ["community/*", "crews/*", "social/*"]
    phase: 3

phaseLabels:
  1: "Foundation"
  2: "Core Features"
  3: "Community"
  4: "Economy"
  5: "Polish & Scale"
```

---

## Phase 2: Component Architecture

### 2.1 Component Hierarchy

```
src/components/atlas/
├── providers/
│   └── AtlasProvider.tsx      # Context for atlas data and interactions
├── core/
│   ├── AtlasCanvas.tsx        # React Flow wrapper with glass styling
│   ├── AtlasControls.tsx      # Zoom, pan, search, filter controls
│   ├── AtlasLegend.tsx        # Category/protection legend
│   ├── AtlasTooltip.tsx       # Node hover/tap tooltip
│   └── AtlasSearch.tsx        # Search input with filtering
├── nodes/
│   ├── RouteNode.tsx          # Custom node for routes
│   ├── DocNode.tsx            # Custom node for documents
│   ├── ClusterNode.tsx        # Custom node for roadmap clusters
│   └── DiagramNode.tsx        # Custom node for architecture
├── views/
│   ├── RouteAtlas.tsx         # Homepage/dashboard route map
│   ├── DocsAtlas.tsx          # Documentation directory
│   ├── ArchitectureAtlas.tsx  # System diagrams
│   └── RoadmapAtlas.tsx       # Git-derived roadmap
├── utils/
│   ├── layoutAlgorithms.ts    # Force-directed, hierarchical layouts
│   ├── atlasFilters.ts        # Search and filter logic
│   └── atlasColors.ts         # Color mapping utilities
├── hooks/
│   ├── useAtlasData.ts        # Data fetching and caching
│   ├── useAtlasNavigation.ts  # Navigation handlers
│   └── useAtlasSearch.ts      # Search state and filtering
└── index.ts                   # Public exports
```

### 2.2 AtlasProvider Context

```typescript
// src/components/atlas/providers/AtlasProvider.tsx

interface AtlasContextValue {
  // Data
  routeAtlas: RouteAtlasManifest | null;
  docsAtlas: DocsAtlasManifest | null;
  roadmapAtlas: RoadmapAtlasManifest | null;
  architectureAtlas: ArchitectureAtlasManifest | null;
  userContext: UserAtlasContext | null;

  // State
  loading: boolean;
  error: Error | null;

  // Interactions
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilters: AtlasFilters;
  setActiveFilters: (filters: AtlasFilters) => void;

  // Navigation
  navigateToRoute: (path: string) => void;
  navigateToDoc: (docId: string, anchor?: string) => void;
}
```

### 2.3 Custom Node Components

```tsx
// src/components/atlas/nodes/RouteNode.tsx

import { Handle, Position } from 'reactflow';
import { GlassSurface } from '../../glass/GlassSurface';
import { Lock, Shield } from 'lucide-react';

interface RouteNodeProps {
  data: {
    route: RouteNode;
    isHighlighted: boolean;
    isCurrentRoute: boolean;
  };
}

export function RouteNode({ data }: RouteNodeProps) {
  const { route, isHighlighted, isCurrentRoute } = data;

  return (
    <GlassSurface
      className={`
        atlas-route-node
        ${isHighlighted ? 'ring-2 ring-brand-blue-500' : ''}
        ${isCurrentRoute ? 'ring-2 ring-brand-pulse-500 animate-pulse' : ''}
      `}
      depth={isHighlighted ? 'medium' : 'subtle'}
      interactive
    >
      <Handle type="target" position={Position.Top} />

      <div className="flex items-center gap-2 p-3">
        {/* Protection indicator */}
        {route.protection === 'protected' && (
          <Lock className="w-4 h-4 text-amber-400" />
        )}
        {route.protection === 'admin' && (
          <Shield className="w-4 h-4 text-red-400" />
        )}

        {/* Route icon */}
        <span className="text-lg">{route.icon || '📄'}</span>

        {/* Route label */}
        <span className="font-medium text-white">{route.label}</span>

        {/* Badge */}
        {route.badge && (
          <span className="px-1.5 py-0.5 text-[10px] bg-brand-pulse-500/30 text-brand-pulse-300 rounded">
            {route.badge}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </GlassSurface>
  );
}
```

---

## Phase 3: UI Specifications

### 3.1 Homepage Atlas Section

**Location:** Embedded in `src/pages/Landing.jsx` after "How It Works"

**Layout:**
- Full-width section with max-height 500px
- Glass container with subtle background
- Centered title: "Explore MuscleMap"
- Search input floating in top-right

**Interactions:**
- Pan: drag or two-finger scroll
- Zoom: pinch or scroll wheel (with +/- buttons)
- Tap node: show tooltip with description + "Go" button
- Search: filter/highlight matching nodes

**Visual Design:**
```css
.atlas-homepage-container {
  @apply relative rounded-2xl overflow-hidden;
  background: var(--glass-white-5);
  border: 1px solid var(--border-subtle);
  backdrop-filter: blur(20px);
}

.atlas-route-node {
  min-width: 120px;
  transition: all 0.2s ease;
}

.atlas-route-node:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 102, 255, 0.2);
}
```

### 3.2 Dashboard Atlas Panel

**Location:** Card/panel in `src/pages/Dashboard.jsx`

**Features:**
- "You Are Here" indicator on current route
- Pulsing animation on current node
- "Next Steps" highlights based on user journey
- Expandable to full-screen modal

**User Context Overlay:**
```tsx
// Shows small badges for user progress
<div className="atlas-user-overlay">
  <span className="badge">Level {user.level}</span>
  <span className="badge">{user.skillTreesCompleted.length}/7 Trees</span>
  <span className="badge">{user.credits} Credits</span>
</div>
```

### 3.3 Docs Atlas

**Location:** Sidebar or header section in `src/pages/Docs.jsx`

**Two Views:**
1. **Tree View:** Expandable/collapsible hierarchy
2. **Graph View:** Force-directed graph showing relationships

**Features:**
- Current doc highlighted
- Related docs suggested
- Anchor links visible on hover

### 3.4 Roadmap Atlas

**Location:** Replace/enhance `src/pages/Roadmap.jsx`

**Layout:**
- Horizontal timeline (phases left-to-right) on desktop
- Vertical list on mobile
- Phase columns contain cluster cards

**No Dates Policy:**
- Show "Phase N" labels only
- Use relative indicators: "Completed", "In Progress", "Planned"
- Never show timestamps or date estimates

---

## Phase 4: API Endpoints

### 4.1 Static Manifests (Primary)

Manifests are generated at build time and served as static JSON:

```
public/atlases/
├── route-atlas.json
├── docs-atlas.json
├── roadmap-atlas.json
└── architecture/
    ├── frontend.json
    ├── backend.json
    ├── data.json
    └── realtime.json
```

### 4.2 Dynamic Endpoints (Optional)

```typescript
// apps/api/src/http/routes/atlas.ts

// GET /api/atlas/user-context
// Returns personalized atlas data for logged-in users
// Protected endpoint

interface UserAtlasContext {
  currentRoute: string;
  userId: string;
  progress: {
    journeyStep: number;
    journeyTotal: number;
    skillTreesStarted: string[];
    skillTreesCompleted: string[];
    creditsBalance: number;
  };
  recommendations: {
    routeId: string;
    reason: string;
    priority: number;
  }[];
  recentlyVisited: string[];
}
```

---

## Phase 5: Generation Scripts

### 5.1 Route Atlas Generator

```typescript
// scripts/generate-route-atlas.ts

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

async function generateRouteAtlas() {
  // 1. Parse src/App.jsx
  const appSource = fs.readFileSync('src/App.jsx', 'utf-8');
  const ast = parse(appSource, {
    sourceType: 'module',
    plugins: ['jsx'],
  });

  // 2. Extract Route elements
  const routes: RouteNode[] = [];
  traverse(ast, {
    JSXElement(path) {
      if (path.node.openingElement.name.name === 'Route') {
        // Extract path, element, protection from JSX attributes
        const routeData = extractRouteData(path.node);
        if (routeData) routes.push(routeData);
      }
    },
  });

  // 3. Load overrides
  const overrides = yaml.load(
    fs.readFileSync('config/route-atlas-overrides.yaml', 'utf-8')
  );

  // 4. Merge and categorize
  const categorizedRoutes = categorizeRoutes(routes, overrides);

  // 5. Output manifest
  const manifest: RouteAtlasManifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    categories: categorizedRoutes,
  };

  fs.writeFileSync(
    'public/atlases/route-atlas.json',
    JSON.stringify(manifest, null, 2)
  );
}
```

### 5.2 Docs Atlas Generator

```typescript
// scripts/generate-docs-atlas.ts

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

async function generateDocsAtlas() {
  const docsDir = 'docs/public';
  const documents = walkDocsDirectory(docsDir);

  const manifest: DocsAtlasManifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    rootPath: docsDir,
    documents,
  };

  fs.writeFileSync(
    'public/atlases/docs-atlas.json',
    JSON.stringify(manifest, null, 2)
  );
}

function walkDocsDirectory(dir: string): DocNode[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const docs: DocNode[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      docs.push({
        id: entry.name,
        path: path.join(dir, entry.name),
        title: formatTitle(entry.name),
        children: walkDocsDirectory(path.join(dir, entry.name)),
      });
    } else if (entry.name.endsWith('.md')) {
      const content = fs.readFileSync(path.join(dir, entry.name), 'utf-8');
      const { data, content: body } = matter(content);

      docs.push({
        id: path.basename(entry.name, '.md'),
        path: path.join(dir, entry.name),
        title: data.title || extractH1(body) || formatTitle(entry.name),
        description: data.description || extractFirstParagraph(body),
        anchors: extractAnchors(body),
      });
    }
  }

  return docs;
}
```

### 5.3 Roadmap Atlas Generator

```typescript
// scripts/generate-roadmap-atlas.ts

import { execSync } from 'child_process';
import fs from 'fs';
import yaml from 'js-yaml';

async function generateRoadmapAtlas() {
  // 1. Get git log with file changes
  const gitLog = execSync(
    'git log --pretty=format:"%H|%s" --name-only',
    { encoding: 'utf-8' }
  );

  // 2. Parse commits and group by directory patterns
  const commits = parseGitLog(gitLog);
  const clusters = clusterCommits(commits);

  // 3. Load overrides for labels and phase assignments
  const overrides = yaml.load(
    fs.readFileSync('config/roadmap-overrides.yaml', 'utf-8')
  );

  // 4. Merge clusters with overrides
  const phases = assignPhases(clusters, overrides);

  // 5. Output manifest
  const manifest: RoadmapAtlasManifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    phases,
  };

  fs.writeFileSync(
    'public/atlases/roadmap-atlas.json',
    JSON.stringify(manifest, null, 2)
  );
}
```

---

## Phase 6: Phased Implementation Checklist

### Week 1: Foundation

- [ ] Install React Flow: `pnpm add reactflow`
- [ ] Create `src/components/atlas/` directory structure
- [ ] Implement `AtlasProvider` context
- [ ] Create `AtlasCanvas` base component with glass styling
- [ ] Implement `AtlasControls` (zoom, pan, search)
- [ ] Create `AtlasLegend` component
- [ ] Create `AtlasTooltip` component
- [ ] Define TypeScript interfaces in `atlasTypes.ts`
- [ ] Create static placeholder manifests for development

### Week 2: Route Atlas

- [ ] Write `scripts/generate-route-atlas.ts`
- [ ] Create `config/route-atlas-overrides.yaml` with route metadata
- [ ] Implement `RouteNode` custom component
- [ ] Build `RouteAtlas` view component
- [ ] Add search/filter functionality
- [ ] Integrate into `src/pages/Landing.jsx` (new section)
- [ ] Add to build process: `atlas:generate` script
- [ ] Test touch interactions on mobile

### Week 3: Dashboard Integration

- [ ] Create `/api/atlas/user-context` endpoint
- [ ] Implement `useAtlasData` hook with user context
- [ ] Build dashboard atlas variant with user overlay
- [ ] Implement "You are here" highlighting
- [ ] Add "Next steps" recommendation logic
- [ ] Create expandable modal view
- [ ] Integrate into `src/pages/Dashboard.jsx`

### Week 4: Docs Atlas

- [ ] Write `scripts/generate-docs-atlas.ts`
- [ ] Implement `DocNode` custom component
- [ ] Build `DocsAtlas` view with tree/graph toggle
- [ ] Add anchor navigation support
- [ ] Integrate into `src/pages/Docs.jsx`
- [ ] Link between docs atlas and route atlas

### Week 5: Roadmap Atlas

- [ ] Write `scripts/generate-roadmap-atlas.ts`
- [ ] Create `config/roadmap-overrides.yaml`
- [ ] Implement `ClusterNode` custom component
- [ ] Build `RoadmapAtlas` view
- [ ] Add phase columns layout
- [ ] Integrate into `src/pages/Roadmap.jsx`
- [ ] Connect to existing roadmap voting system

### Week 6: Architecture Diagrams

- [ ] Create Mermaid source files for each diagram
- [ ] Implement `DiagramNode` component
- [ ] Build `ArchitectureAtlas` with diagram switcher
- [ ] Create user story flow diagrams
- [ ] Add to `/technology` page
- [ ] Add interactive node linking

### Week 7: Polish & QA

- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Keyboard navigation testing
- [ ] Screen reader testing
- [ ] Mobile touch testing on real devices
- [ ] Performance optimization (virtualization)
- [ ] Bundle size analysis
- [ ] Visual QA for design consistency
- [ ] Cross-browser testing

---

## Phase 7: File List

### New Files to Create

```
# Atlas Components
src/components/atlas/
├── providers/
│   └── AtlasProvider.tsx
├── core/
│   ├── AtlasCanvas.tsx
│   ├── AtlasControls.tsx
│   ├── AtlasLegend.tsx
│   ├── AtlasTooltip.tsx
│   └── AtlasSearch.tsx
├── nodes/
│   ├── RouteNode.tsx
│   ├── DocNode.tsx
│   ├── ClusterNode.tsx
│   └── DiagramNode.tsx
├── views/
│   ├── RouteAtlas.tsx
│   ├── DocsAtlas.tsx
│   ├── ArchitectureAtlas.tsx
│   └── RoadmapAtlas.tsx
├── utils/
│   ├── layoutAlgorithms.ts
│   ├── atlasFilters.ts
│   └── atlasColors.ts
├── hooks/
│   ├── useAtlasData.ts
│   ├── useAtlasNavigation.ts
│   └── useAtlasSearch.ts
├── atlasTypes.ts
├── atlasStyles.css
└── index.ts

# Generation Scripts
scripts/
├── generate-route-atlas.ts
├── generate-docs-atlas.ts
├── generate-roadmap-atlas.ts
└── generate-all-atlases.ts

# Configuration
config/
├── route-atlas-overrides.yaml
└── roadmap-overrides.yaml

# Generated Manifests (gitignored)
public/atlases/
├── route-atlas.json
├── docs-atlas.json
├── roadmap-atlas.json
└── architecture/
    ├── frontend.json
    ├── backend.json
    ├── data.json
    └── realtime.json

# API Endpoint
apps/api/src/http/routes/atlas.ts

# Tests
src/components/atlas/__tests__/
├── RouteAtlas.test.tsx
├── AtlasProvider.test.tsx
└── atlasUtils.test.ts
```

### Files to Modify

```
src/pages/Landing.jsx       # Add RouteAtlas section
src/pages/Dashboard.jsx     # Add dashboard atlas panel
src/pages/Docs.jsx          # Add DocsAtlas sidebar
src/pages/Roadmap.jsx       # Enhance with RoadmapAtlas
src/pages/Technology.jsx    # Add ArchitectureAtlas
package.json                # Add atlas:generate script
.gitignore                  # Ignore generated manifests
apps/api/src/http/server.ts # Register atlas routes
```

---

## Phase 8: Acceptance Criteria

### Functional Requirements

- [ ] Route atlas displays all routes with correct protection indicators
- [ ] Search filters nodes in real-time (<100ms)
- [ ] Clicking a node navigates to the correct page
- [ ] Dashboard shows "You are here" indicator
- [ ] Docs atlas matches actual docs folder structure
- [ ] Roadmap shows phases without dates
- [ ] Architecture diagrams render correctly

### Mobile/Touch Requirements

- [ ] Pinch-to-zoom at 60fps
- [ ] Single-finger pan works smoothly
- [ ] Tap targets minimum 44x44px
- [ ] Controls reachable with thumb
- [ ] Responsive layout on all screen sizes

### Accessibility Requirements

- [ ] All nodes keyboard navigable (Tab, Enter, Escape)
- [ ] ARIA labels on all interactive elements
- [ ] Focus indicators visible
- [ ] Screen reader announces node labels
- [ ] Color is not sole differentiator

### Performance Budget

- [ ] Initial render <200ms for 100 nodes
- [ ] Smooth pan/zoom at 60fps
- [ ] Lazy load architecture diagrams
- [ ] Total atlas bundle <100KB gzipped (excluding React Flow)

---

## Phase 9: MVP Scaffold (Optional)

If approved, a minimal MVP can be created behind a feature flag:

### Feature Flag

```typescript
// src/config/featureFlags.ts
export const FEATURE_FLAGS = {
  ATLAS_ENABLED: import.meta.env.VITE_ATLAS_ENABLED === 'true',
};
```

### Static Manifest

A manually curated `public/atlases/route-atlas-static.json` with the main routes.

### Minimal Component

A basic `RouteAtlas` component using React Flow with glass styling.

### Integration

```tsx
// src/pages/Landing.jsx
{FEATURE_FLAGS.ATLAS_ENABLED && (
  <section className="atlas-section py-20 px-6 border-t border-white/5">
    <div className="max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-8">
        <span className="gradient-text">Explore MuscleMap</span>
      </h2>
      <RouteAtlas />
    </div>
  </section>
)}
```

---

## Appendix A: Static Route Atlas Manifest

```json
{
  "version": "1.0.0",
  "generated": "static",
  "categories": [
    {
      "id": "core",
      "label": "Core",
      "color": "#3b82f6",
      "icon": "activity",
      "routes": [
        { "id": "dashboard", "path": "/dashboard", "label": "Dashboard", "description": "Your personal training hub", "protection": "protected" },
        { "id": "workout", "path": "/workout", "label": "Workout", "description": "Log training sessions", "protection": "protected" },
        { "id": "exercises", "path": "/exercises", "label": "Exercises", "description": "65+ exercises with muscle data", "protection": "protected" },
        { "id": "journey", "path": "/journey", "label": "Journey", "description": "Personalized training path", "protection": "protected" },
        { "id": "progression", "path": "/progression", "label": "Progression", "description": "Track strength gains", "protection": "protected" },
        { "id": "skills", "path": "/skills", "label": "Skills", "description": "7 skill trees with 45+ skills", "protection": "public" },
        { "id": "martial-arts", "path": "/martial-arts", "label": "Martial Arts", "description": "10 disciplines, 60+ techniques", "protection": "public" }
      ]
    },
    {
      "id": "community",
      "label": "Community",
      "color": "#22c55e",
      "icon": "users",
      "routes": [
        { "id": "community", "path": "/community", "label": "Community Hub", "description": "Feed, map, and stats", "protection": "protected" },
        { "id": "crews", "path": "/crews", "label": "Crews", "description": "Team up with others", "protection": "protected" },
        { "id": "rivals", "path": "/rivals", "label": "Rivals", "description": "Friendly competition", "protection": "protected" },
        { "id": "competitions", "path": "/competitions", "label": "Competitions", "description": "Compete for rewards", "protection": "protected" },
        { "id": "highfives", "path": "/highfives", "label": "High Fives", "description": "Celebrate achievements", "protection": "protected" },
        { "id": "locations", "path": "/locations", "label": "Locations", "description": "Find training spots", "protection": "protected" },
        { "id": "messages", "path": "/messages", "label": "Messages", "description": "Connect with others", "protection": "protected" }
      ]
    },
    {
      "id": "account",
      "label": "Account",
      "color": "#f59e0b",
      "icon": "wallet",
      "routes": [
        { "id": "profile", "path": "/profile", "label": "Profile", "description": "Your public profile", "protection": "protected" },
        { "id": "settings", "path": "/settings", "label": "Settings", "description": "App preferences", "protection": "protected" },
        { "id": "credits", "path": "/credits", "label": "Credits", "description": "Credit balance and history", "protection": "protected" },
        { "id": "wallet", "path": "/wallet", "label": "Wallet", "description": "Manage payments", "protection": "protected" },
        { "id": "skins", "path": "/skins", "label": "Skins Store", "description": "Customize your look", "protection": "protected" },
        { "id": "stats", "path": "/stats", "label": "Stats", "description": "Character stats", "protection": "protected" }
      ]
    },
    {
      "id": "health",
      "label": "Health & Goals",
      "color": "#ec4899",
      "icon": "heart",
      "routes": [
        { "id": "health", "path": "/health", "label": "Health", "description": "Wearable integrations", "protection": "protected" },
        { "id": "goals", "path": "/goals", "label": "Goals", "description": "Set and track goals", "protection": "protected" },
        { "id": "limitations", "path": "/limitations", "label": "Limitations", "description": "Injury accommodations", "protection": "protected" },
        { "id": "pt-tests", "path": "/pt-tests", "label": "PT Tests", "description": "Military fitness tests", "protection": "protected" }
      ]
    },
    {
      "id": "docs",
      "label": "Documentation",
      "color": "#8b5cf6",
      "icon": "book-open",
      "routes": [
        { "id": "landing", "path": "/", "label": "Home", "description": "Welcome to MuscleMap", "protection": "public" },
        { "id": "features", "path": "/features", "label": "Features", "description": "Feature overview", "protection": "public" },
        { "id": "technology", "path": "/technology", "label": "Technology", "description": "Tech stack", "protection": "public" },
        { "id": "science", "path": "/science", "label": "Science", "description": "The methodology", "protection": "public" },
        { "id": "design", "path": "/design", "label": "Design", "description": "Design system", "protection": "public" },
        { "id": "docs", "path": "/docs", "label": "Docs", "description": "Full documentation", "protection": "public" }
      ]
    },
    {
      "id": "issues",
      "label": "Issue Tracker",
      "color": "#ef4444",
      "icon": "bug",
      "routes": [
        { "id": "issues", "path": "/issues", "label": "Issues", "description": "Report and track bugs", "protection": "public" },
        { "id": "updates", "path": "/updates", "label": "Dev Updates", "description": "Latest changes", "protection": "public" },
        { "id": "roadmap", "path": "/roadmap", "label": "Roadmap", "description": "Feature roadmap", "protection": "public" },
        { "id": "new-issue", "path": "/issues/new", "label": "New Issue", "description": "Submit a bug report", "protection": "protected" },
        { "id": "my-issues", "path": "/my-issues", "label": "My Issues", "description": "Your submissions", "protection": "protected" }
      ]
    },
    {
      "id": "auth",
      "label": "Auth",
      "color": "#6b7280",
      "icon": "log-in",
      "routes": [
        { "id": "login", "path": "/login", "label": "Login", "description": "Sign in to your account", "protection": "public" },
        { "id": "signup", "path": "/signup", "label": "Sign Up", "description": "Create an account", "protection": "public" },
        { "id": "onboarding", "path": "/onboarding", "label": "Onboarding", "description": "Get started", "protection": "protected" }
      ]
    },
    {
      "id": "admin",
      "label": "Admin",
      "color": "#991b1b",
      "icon": "shield",
      "routes": [
        { "id": "admin-control", "path": "/admin-control", "label": "Admin Control", "description": "Admin dashboard", "protection": "admin" },
        { "id": "admin-issues", "path": "/admin/issues", "label": "Manage Issues", "description": "Issue administration", "protection": "admin" },
        { "id": "admin-monitoring", "path": "/admin/monitoring", "label": "Monitoring", "description": "System monitoring", "protection": "admin" }
      ]
    }
  ]
}
```

---

## Appendix B: CSS Additions

```css
/* src/components/atlas/atlasStyles.css */

/* Atlas container with glass effect */
.atlas-container {
  @apply relative rounded-2xl overflow-hidden;
  background: var(--glass-white-5);
  border: 1px solid var(--border-subtle);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

/* Custom React Flow styling */
.react-flow__node {
  @apply transition-all duration-200;
}

.react-flow__node:hover {
  @apply transform -translate-y-0.5;
}

.react-flow__edge {
  stroke: var(--border-medium);
  stroke-width: 2;
}

.react-flow__edge.selected {
  stroke: var(--brand-blue-500);
}

/* Category color classes */
.atlas-category-core { --category-color: #3b82f6; }
.atlas-category-community { --category-color: #22c55e; }
.atlas-category-account { --category-color: #f59e0b; }
.atlas-category-health { --category-color: #ec4899; }
.atlas-category-docs { --category-color: #8b5cf6; }
.atlas-category-issues { --category-color: #ef4444; }
.atlas-category-auth { --category-color: #6b7280; }
.atlas-category-admin { --category-color: #991b1b; }

/* Node with category color */
.atlas-route-node {
  border-left: 3px solid var(--category-color);
}

/* "You are here" pulse animation */
@keyframes atlas-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 51, 102, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(255, 51, 102, 0); }
}

.atlas-current-node {
  animation: atlas-pulse 2s infinite;
}

/* Search highlight */
.atlas-node-highlighted {
  @apply ring-2 ring-brand-blue-400;
}

/* Controls styling */
.atlas-controls {
  @apply absolute top-4 right-4 flex gap-2 z-10;
}

.atlas-control-button {
  @apply p-2 rounded-lg;
  background: var(--glass-white-10);
  border: 1px solid var(--border-subtle);
  backdrop-filter: blur(10px);
}

.atlas-control-button:hover {
  background: var(--glass-white-15);
}

/* Legend styling */
.atlas-legend {
  @apply absolute bottom-4 left-4 p-3 rounded-lg z-10;
  background: var(--glass-white-10);
  border: 1px solid var(--border-subtle);
  backdrop-filter: blur(10px);
}

.atlas-legend-item {
  @apply flex items-center gap-2 text-sm;
}

.atlas-legend-dot {
  @apply w-3 h-3 rounded-full;
}

/* Mobile touch optimizations */
@media (pointer: coarse) {
  .atlas-route-node {
    min-height: 48px;
    min-width: 140px;
  }

  .atlas-control-button {
    min-width: 44px;
    min-height: 44px;
  }
}
```

---

*Document generated: 2026-01-10*
*Version: 1.0.0*
