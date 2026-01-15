# Architecture Overview

> Understanding MuscleMap's technical foundation.

---

## High-Level Architecture

```
+--------------------------------------------------+
|                   CLIENTS                         |
+--------------------------------------------------+
|   Web (React)    Mobile (Expo)    Watch (Swift)  |
|       |               |               |          |
+-------+---------------+---------------+----------+
        |               |               |
        v               v               v
+--------------------------------------------------+
|              GRAPHQL API GATEWAY                  |
|                  (Fastify)                        |
+--------------------------------------------------+
        |               |               |
        v               v               v
+--------------------------------------------------+
|                  SERVICES                         |
+--------------------------------------------------+
| Auth | Workouts | Economy | Social | Stats | ... |
+--------------------------------------------------+
        |               |               |
        v               v               v
+--------------------------------------------------+
|                  DATA LAYER                       |
+--------------------------------------------------+
|      PostgreSQL          |         Redis         |
|    (Primary Data)        |       (Cache)         |
+--------------------------------------------------+
```

---

## Core Principles

### 1. Single Source of Truth

All data lives in PostgreSQL. No local SQLite, no conflicting state.

```
CLIENT ──GraphQL──> API ──SQL──> PostgreSQL
                                     │
                              [Single Source]
```

### 2. GraphQL Data Stream

All data flows through one GraphQL endpoint over SSL.

```
Endpoint: https://musclemap.me/graphql

Benefits:
├── Type-safe queries
├── Efficient data fetching
├── Single request for complex data
├── Built-in documentation
└── Automatic caching
```

### 3. Clients Only Render

Frontend apps are presentation layers only. Zero business logic.

```
WRONG:                      RIGHT:
Client calculates TU        API calculates TU
Client validates inputs     API validates everything
Client manages complex      API handles all business
state                       logic
```

---

## Tech Stack

### Backend

| Component | Technology | Purpose |
|-----------|------------|---------|
| HTTP Server | Fastify | API framework (NOT Express) |
| GraphQL | Mercurius | GraphQL implementation |
| Database | PostgreSQL | Primary data store |
| Cache | Redis | Session/query cache |
| Auth | JWT + bcrypt | Authentication |
| Validation | Zod | Input validation |
| ORM | Knex.js | Query builder |

### Frontend

| Component | Technology | Purpose |
|-----------|------------|---------|
| Web | React + Vite | SPA framework |
| Mobile | React Native + Expo | Cross-platform |
| State | Apollo + Zustand | Data + UI state |
| 3D | Three.js | Muscle visualization |
| Charts | D3.js | Data visualization |
| Styling | CSS Modules | Scoped styles |

### Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| Reverse Proxy | Caddy | SSL, routing |
| Process Manager | PM2 | Node process management |
| Hosting | VPS | Single server deployment |

---

## Directory Structure

```
musclemap.me/
├── apps/
│   ├── api/                 # Fastify API server
│   │   ├── src/
│   │   │   ├── db/         # Migrations, schema
│   │   │   ├── graphql/    # Schema, resolvers
│   │   │   ├── http/       # Routes, middleware
│   │   │   ├── modules/    # Feature modules
│   │   │   └── services/   # Business logic
│   │   └── package.json
│   └── mobile/              # React Native app
│       ├── src/
│       └── package.json
│
├── packages/
│   ├── shared/              # Types, utilities
│   ├── core/                # Business logic
│   ├── client/              # API client SDK
│   ├── ui/                  # Shared components
│   └── plugin-sdk/          # Plugin development
│
├── src/                     # React web frontend
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── store/
│   └── graphql/
│
├── docs/                    # Documentation
├── scripts/                 # Automation
└── native/                  # C native modules
```

---

## Data Flow

### Read Operations

```
1. Client Query
   │
   ▼
2. GraphQL Resolver
   │
   ├── Check Redis cache
   │   └── If cached: return immediately
   │
   ├── Query PostgreSQL
   │   └── Use indexed queries
   │
   ├── Transform data
   │   └── Apply business rules
   │
   └── Cache result in Redis
       └── Set appropriate TTL
   │
   ▼
3. Return to Client
```

### Write Operations

```
1. Client Mutation
   │
   ▼
2. Input Validation (Zod)
   │
   ├── Validate shape
   ├── Sanitize inputs
   └── Check business rules
   │
   ▼
3. Authorization Check
   │
   ├── Verify JWT
   ├── Check permissions
   └── Rate limiting
   │
   ▼
4. Business Logic
   │
   ├── Execute transaction
   ├── Update PostgreSQL
   └── Invalidate cache
   │
   ▼
5. Return Result
```

---

## Module System

### Feature Modules

Each feature is self-contained:

```
apps/api/src/modules/workouts/
├── index.ts           # Module exports
├── schema.ts          # GraphQL types
├── resolvers.ts       # Query/Mutation handlers
├── service.ts         # Business logic
├── repository.ts      # Data access
└── types.ts           # TypeScript types
```

### Module Communication

Modules communicate through services, not direct imports:

```
WRONG:                           RIGHT:
import { calculateTU }           const tuService =
  from '../stats/calc'             container.get('TUService')
                                 tuService.calculate(...)
```

---

## Authentication Flow

```
REGISTRATION
============

1. User submits email/password
   │
   ▼
2. API validates input
   │
   ├── Email format valid
   ├── Password strength OK
   └── Email not taken
   │
   ▼
3. Hash password (bcrypt, 12 rounds)
   │
   ▼
4. Create user record
   │
   ▼
5. Generate JWT (24h expiry)
   │
   ▼
6. Return token to client


LOGIN
=====

1. User submits credentials
   │
   ▼
2. Find user by email
   │
   ▼
3. Compare password hash
   │
   ▼
4. Generate new JWT
   │
   ▼
5. Return token + user data


AUTHENTICATED REQUESTS
======================

1. Client includes Authorization header
   │
   Authorization: Bearer <token>
   │
   ▼
2. Middleware validates JWT
   │
   ├── Check signature
   ├── Check expiration
   └── Load user from token
   │
   ▼
3. Request proceeds with user context
```

---

## Caching Strategy

### Cache Layers

```
L1: Apollo Client (Browser)
    └── Normalized object cache
    └── Automatic query deduplication

L2: Redis (Server)
    └── Query results
    └── Session data
    └── Rate limiting counters

L3: PostgreSQL
    └── Source of truth
    └── Materialized views for aggregates
```

### Cache Invalidation

```
Pattern: Write-through with selective invalidation

On Mutation:
1. Update PostgreSQL
2. Invalidate related Redis keys
3. Apollo cache updates via response

Example:
logWorkout(userId, workout)
  → UPDATE workouts SET...
  → DEL user:${userId}:stats
  → DEL user:${userId}:recent
  → Return updated data (Apollo updates)
```

---

## Error Handling

### Error Hierarchy

```
BaseError
├── ValidationError      (400)
├── AuthenticationError  (401)
├── AuthorizationError   (403)
├── NotFoundError        (404)
├── ConflictError        (409)
├── RateLimitError       (429)
└── InternalError        (500)
```

### Error Response Format

```json
{
  "errors": [
    {
      "message": "Email already registered",
      "code": "CONFLICT",
      "path": ["signup"],
      "extensions": {
        "field": "email",
        "suggestion": "Try logging in instead"
      }
    }
  ]
}
```

---

## Scaling Considerations

### Current Architecture (Single Server)

```
             Caddy (Reverse Proxy)
                     │
                     ▼
             PM2 (4 workers)
                     │
                     ▼
               PostgreSQL
                     │
                     ▼
                   Redis
```

### Future Scaling Path

```
                 Load Balancer
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    API Node 1    API Node 2    API Node N
        │             │             │
        └─────────────┼─────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    PostgreSQL    Read Replicas    Redis Cluster
    (Primary)
```

---

## Key Design Decisions

### Why Fastify (not Express)?

| Aspect | Fastify | Express |
|--------|---------|---------|
| Performance | 2-3x faster | Baseline |
| Schema validation | Built-in | Manual |
| TypeScript | First-class | Bolted on |
| Plugin system | Isolated | Global |

### Why PostgreSQL (not SQLite)?

| Aspect | PostgreSQL | SQLite |
|--------|------------|--------|
| Concurrency | Full MVCC | Limited |
| Scalability | Horizontal | Single file |
| Features | Full SQL | Subset |
| Cloud-ready | Yes | Difficult |

### Why GraphQL (not REST)?

| Aspect | GraphQL | REST |
|--------|---------|------|
| Overfetching | None | Common |
| Underfetching | None | Requires multiple calls |
| Type safety | Built-in | Manual |
| Documentation | Automatic | Manual |

---

## See Also

- [Local Setup](./02-local-setup.md) - Get the project running
- [Coding Standards](./03-coding-standards.md) - Style guide
- [API Reference](../api-reference/README.md) - Endpoint documentation

---

*Last updated: 2026-01-15*
