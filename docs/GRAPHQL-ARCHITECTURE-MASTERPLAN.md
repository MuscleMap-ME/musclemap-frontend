# GraphQL Architecture Master Plan

## Scholarly Foundations

This plan applies rigorous software engineering principles from two of computing's most influential thinkers:

### Bjarne Stroustrup's Design Principles (C++ Creator)
1. **Type Safety**: "Make interfaces precise and strongly typed"
2. **Zero-Overhead Abstraction**: "What you don't use, you shouldn't pay for"
3. **Resource Acquisition Is Initialization (RAII)**: Deterministic resource management
4. **Layered Abstraction**: Build complex systems from simple, composable parts
5. **Express intent directly in code**: Self-documenting, unambiguous interfaces

### Donald Knuth's Algorithm Analysis
1. **Premature optimization is the root of all evil** — but mature optimization is essential
2. **Complexity analysis**: Understand O(n) characteristics before scaling
3. **Literate programming**: Code should be readable as prose
4. **Bottom-up verification**: Test components before integration
5. **Measure, don't guess**: Profile before optimizing

---

## Current State Analysis

### Identified Issues

| Query | Measured Complexity | Limit | Root Cause |
|-------|---------------------|-------|------------|
| `workoutSessions` | 8550+ | 500 | Nested sets × exercises × muscleActivations |
| `conversations` | 1380 | 500 | participants[] × messages[] |
| `nearestOutdoorVenues` | 710 | 500 | venues[] × equipment[] |
| Various dashboard queries | 400-600 | 500 | Field proliferation |

### Complexity Explosion Pattern

```
Query Complexity = Σ(field_cost × array_multiplier^depth)

Example: workoutSessions
- sessions[]: 10 items
  - sets[]: 50 items per session
    - muscleActivations[]: 5 items per set

Total = 10 × 50 × 5 = 2,500 minimum (before other fields)
```

This is **exponential growth** — Knuth would immediately flag this as O(n^d) where d = nesting depth.

---

## The Master Plan: Six Pillars

### Pillar 1: Query Decomposition (Stroustrup's Layered Abstraction)

**Principle**: Break monolithic queries into composable, single-responsibility units.

#### Before (Anti-pattern)
```graphql
query Dashboard {
  me { ...allUserFields }
  workouts { ...allWorkoutFields }
  goals { ...allGoalFields }
  achievements { ...allAchievementFields }
  # Complexity: 2000+
}
```

#### After (Decomposed)
```graphql
# Each query has single responsibility, <100 complexity
query DashboardUser { me { id username avatar level } }
query DashboardStats { userStats { workoutsThisWeek streakDays } }
query DashboardGoals { goals(limit: 3) { id title progress } }
```

**Implementation**:
1. Audit all queries >300 complexity
2. Split into atomic queries by data domain
3. Use Apollo Client's `useQueries` for parallel fetching
4. Implement query batching at network layer

### Pillar 2: Pagination Everywhere (Knuth's Complexity Control)

**Principle**: Never return unbounded arrays. Always paginate.

#### Pagination Strategy
```graphql
type Connection {
  edges: [Edge!]!
  pageInfo: PageInfo!
  totalCount: Int
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

**Cursor-based (Keyset) Pagination** — O(1) vs OFFSET's O(n):
```graphql
query WorkoutSessions($first: Int!, $after: String) {
  workoutSessions(first: $first, after: $after) {
    edges {
      cursor
      node { id name createdAt }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

**Implementation**:
1. Add Connection types for all list fields
2. Enforce `first`/`last` arguments (max 50)
3. Remove all OFFSET-based pagination
4. Add keyset indexes to database

### Pillar 3: Field Cost Budgeting (Zero-Overhead Abstraction)

**Principle**: Assign explicit costs to fields; reject queries exceeding budget.

#### Cost Model
```typescript
const fieldCosts = {
  // Scalar fields: cost 1
  id: 1,
  name: 1,
  createdAt: 1,

  // Computed fields: cost varies
  level: 2,        // requires calculation
  rank: 5,         // requires leaderboard lookup

  // Relations: base cost + multiplier
  workouts: { base: 10, multiplier: 5 },  // each workout adds 5
  sets: { base: 5, multiplier: 2 },
  muscleActivations: { base: 2, multiplier: 1 },
};
```

**Complexity Budget Tiers**:
| User Type | Budget | Rationale |
|-----------|--------|-----------|
| Anonymous | 100 | Prevent abuse |
| Authenticated | 500 | Standard usage |
| Premium | 1000 | Power users |
| Internal | 5000 | Admin tools |

**Implementation**:
1. Document costs in schema comments
2. Add `@cost(complexity: N)` directive
3. Implement budget tracking middleware
4. Return `X-Query-Complexity` header

### Pillar 4: DataLoader Optimization (RAII for Data)

**Principle**: Batch and cache all database access deterministically.

#### Current Problem: N+1 Queries
```typescript
// BAD: N+1 pattern
const workouts = await getWorkouts(userId);
for (const workout of workouts) {
  workout.sets = await getSets(workout.id); // N queries!
}
```

#### Solution: DataLoader
```typescript
// GOOD: Batched loading
const setLoader = new DataLoader(async (workoutIds) => {
  const sets = await db('sets').whereIn('workout_id', workoutIds);
  return workoutIds.map(id => sets.filter(s => s.workout_id === id));
});

// Automatically batches all set requests in single query
const sets = await setLoader.load(workoutId);
```

**Implementation**:
1. Create DataLoader for every entity relationship
2. Scope loaders per-request (prevent cache pollution)
3. Add batch size limits (max 100 per batch)
4. Monitor batch efficiency in `/metrics`

### Pillar 5: Schema-First Design (Express Intent Directly)

**Principle**: The schema IS the API contract. Make it precise.

#### Type Safety Improvements
```graphql
# Before: Loose typing
type Workout {
  status: String  # What values are valid?
  duration: Int   # Seconds? Minutes? Hours?
}

# After: Precise typing
enum WorkoutStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

type Workout {
  status: WorkoutStatus!
  durationSeconds: Int!
  """Duration formatted as HH:MM:SS"""
  durationFormatted: String!
}
```

#### Nullability Contract
```graphql
# Non-null by default, null only when semantically meaningful
type User {
  id: ID!           # Always exists
  username: String! # Required
  bio: String       # Optional (user may not have set)
  deletedAt: DateTime # Null means not deleted
}
```

**Implementation**:
1. Audit all `String` fields for enum conversion
2. Add `!` to all guaranteed non-null fields
3. Document nullability semantics in descriptions
4. Generate TypeScript types from schema

### Pillar 6: Query Complexity Visualization (Measure, Don't Guess)

**Principle**: You can't optimize what you can't see.

#### Metrics to Track
```typescript
const metrics = {
  queryComplexity: Histogram,     // Distribution of query costs
  queryDepth: Histogram,          // Nesting depth distribution
  fieldUsage: Counter,            // Which fields are actually used
  rejectedQueries: Counter,       // Queries over budget
  dataloaderBatchSize: Histogram, // Batch efficiency
  resolverDuration: Histogram,    // Per-resolver timing
};
```

#### Developer Dashboard
- Real-time query complexity calculator
- Schema field usage heatmap
- Slow resolver identification
- Suggested query optimizations

**Implementation**:
1. Add Apollo Server plugins for metrics
2. Create `/empire/graphql-metrics` dashboard
3. Set up alerts for complexity spikes
4. Weekly complexity budget reports

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Audit all queries and document current complexity
- [ ] Add complexity header to all responses
- [ ] Create Connection types for top 10 list fields
- [ ] Split 5 highest-complexity queries

### Phase 2: DataLoaders (Week 3-4)
- [ ] Implement DataLoader for all entity relationships
- [ ] Add batch monitoring to `/metrics`
- [ ] Remove all N+1 patterns from resolvers
- [ ] Add DataLoader cache hit rate tracking

### Phase 3: Schema Hardening (Week 5-6)
- [ ] Convert 20+ String fields to enums
- [ ] Add nullability annotations throughout
- [ ] Generate TypeScript types from schema
- [ ] Update all frontend queries to match

### Phase 4: Monitoring (Week 7-8)
- [ ] Build GraphQL metrics dashboard
- [ ] Set up complexity budget alerts
- [ ] Create field usage analytics
- [ ] Document optimization patterns

---

## Quick Wins (Implement Today)

### 1. Add Complexity Header
```typescript
// apps/api/src/graphql/server.ts
const complexityPlugin = {
  requestDidStart: () => ({
    willSendResponse({ response, context }) {
      response.http.headers.set(
        'X-Query-Complexity',
        context.complexity?.toString() || 'unknown'
      );
    },
  }),
};
```

### 2. Limit Array Returns
```typescript
// In resolvers
workouts: async (_, { first = 20 }, ctx) => {
  const limit = Math.min(first, 50); // Hard cap at 50
  return db('workouts').where('user_id', ctx.userId).limit(limit);
},
```

### 3. Lazy Loading Pattern
```graphql
# Frontend: Only request nested data when expanded
query WorkoutList {
  workouts(first: 20) {
    id
    name
    setCount  # Computed count, not full array
  }
}

# When user expands a workout
query WorkoutDetail($id: ID!) {
  workout(id: $id) {
    sets { ... }  # Only load when needed
  }
}
```

---

## Stroustrup's Checklist for Every Query

Before adding/modifying a query, verify:

- [ ] **Type-safe**: All fields have precise types (enums, not strings)
- [ ] **Bounded**: Arrays have pagination or hard limits
- [ ] **Composable**: Can be combined with other queries cleanly
- [ ] **Minimal**: Requests only the data actually needed
- [ ] **Documented**: Description explains purpose and constraints
- [ ] **Tested**: Complexity is measured and within budget

## Knuth's Checklist for Performance

Before deploying a query change:

- [ ] **Measured**: Know the actual complexity, not estimated
- [ ] **Profiled**: DataLoader batches are optimal
- [ ] **Indexed**: Database has covering indexes
- [ ] **Cached**: Appropriate cache headers set
- [ ] **Monitored**: Metrics will detect regressions

---

## Conclusion

This plan transforms our GraphQL layer from an ad-hoc collection of queries into a **disciplined, type-safe, performance-optimized API** that can scale to millions of users.

The core insight from both Stroustrup and Knuth: **Complexity is the enemy. Fight it with abstraction, measurement, and relentless simplification.**

> "Simplicity is prerequisite for reliability." — Edsger Dijkstra

> "Programs must be written for people to read, and only incidentally for machines to execute." — Harold Abelson

---

*Document created: 2026-01-25*
*Author: Claude (following CLAUDE.md autonomous workflow)*
*Status: MASTER PLAN - Ready for implementation*
