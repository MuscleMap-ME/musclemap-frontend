# MuscleMap System Architecture

> **Last Updated:** January 2026
> **Purpose:** Comprehensive technical reference for Claude instances and developers
> **Audience:** AI assistants, DevOps engineers, backend developers

This document provides a complete technical overview of the MuscleMap production infrastructure, software stack, architectural decisions, and operational constraints. It serves as the authoritative reference for understanding the system's capabilities and limitations.

---

## Table of Contents

1. [Infrastructure Overview](#1-infrastructure-overview)
2. [Hardware Specifications](#2-hardware-specifications)
3. [Software Stack](#3-software-stack)
4. [Network Architecture](#4-network-architecture)
5. [Database Architecture](#5-database-architecture)
6. [Caching Strategy](#6-caching-strategy)
7. [Application Architecture](#7-application-architecture)
8. [GraphQL Architecture & Data Flow](#8-graphql-architecture--data-flow) ⭐ **CRITICAL**
9. [Process Management](#9-process-management)
10. [Security Architecture](#10-security-architecture)
11. [Performance Characteristics](#11-performance-characteristics)
12. [Operational Constraints](#12-operational-constraints)
13. [Scaling Considerations](#13-scaling-considerations)
14. [Monitoring & Observability](#14-monitoring--observability)
15. [Disaster Recovery](#15-disaster-recovery)
16. [Cost Optimization](#16-cost-optimization)

---

## 1. Infrastructure Overview

### Hosting Provider
- **Provider:** Dedicated VPS (likely Contabo or similar European provider based on hostname pattern)
- **Location:** Europe (srv1211254)
- **Type:** Single-server deployment (monolithic infrastructure)

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET                                     │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS (443) / HTTP (80)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CADDY REVERSE PROXY                              │
│  • Automatic TLS (Let's Encrypt)                                     │
│  • Compression (zstd, gzip)                                          │
│  • Static file serving                                               │
│  • Security headers                                                  │
│  • SPA routing                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
            /api/*  │               Static  │
            /health │               Files   │
            /metrics│                       │
                    ▼                       ▼
┌──────────────────────────────┐   ┌─────────────────────┐
│     BUN API SERVER           │   │   STATIC ASSETS     │
│  (Fastify + GraphQL)         │   │   /var/www/.../dist │
│  127.0.0.1:3001              │   │                     │
└──────────────────────────────┘   └─────────────────────┘
           │              │
           │              │
           ▼              ▼
┌─────────────────┐  ┌─────────────────┐
│   PGBOUNCER     │  │   DRAGONFLYDB   │
│  127.0.0.1:6432 │  │  127.0.0.1:6379 │
│  Transaction    │  │  Caching +      │
│  Pooling        │  │  Sessions       │
└─────────────────┘  └─────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│          POSTGRESQL 17              │
│         127.0.0.1:5432              │
│  • 457 tables                       │
│  • 106 migrations                   │
│  • 41 MB database size              │
└─────────────────────────────────────┘
```

---

## 2. Hardware Specifications

### CPU
| Property | Value |
|----------|-------|
| Model | AMD EPYC 9354P 32-Core Processor |
| Allocated Cores | 2 |
| Threads per Core | 1 |
| Architecture | x86_64 (Zen 4) |
| Performance Class | High single-thread performance |

**Observations:**
- The EPYC 9354P is a server-grade processor with excellent IPC
- 2 cores is sufficient for current load but limits parallelism
- Bun uses fork mode (2 instances) to utilize both cores
- CPU is rarely the bottleneck; memory and I/O are more constrained

### Memory
| Property | Value |
|----------|-------|
| Total RAM | 8 GB (8,138,164 KB) |
| Swap | 2 GB |
| Typical Available | 7+ GB (services stopped) |
| Typical Used | 3-6 GB (services running) |

**Memory Budget Allocation:**
```
┌────────────────────────────────────────────────────────┐
│                    8 GB TOTAL RAM                       │
├─────────────────────────────────────────────────────────┤
│ OS + System        │  ~300 MB                           │
│ PostgreSQL         │  ~200 MB (shared_buffers: 128MB)   │
│ DragonflyDB        │  ~20-50 MB (80% less than Redis)   │
│ PgBouncer          │  ~20 MB                            │
│ Caddy              │  ~50 MB                            │
│ Bun API            │  ~200-300 MB per instance          │
│ Bug Hunter         │  ~500-800 MB (Playwright)          │
│ Build processes    │  ~2-4 GB (temporary)               │
│ Buffer/Cache       │  ~1-2 GB                           │
├─────────────────────────────────────────────────────────┤
│ AVAILABLE HEADROOM │  ~2-4 GB                           │
└─────────────────────────────────────────────────────────┘
```

**Critical Constraint:** Vite builds require ~4GB RAM. Build on dev machine and rsync dist/ to server (never build frontend on server).

### Storage
| Property | Value |
|----------|-------|
| Total Disk | 99 GB |
| Used | 11 GB (11%) |
| Available | 84 GB |
| Filesystem | ext4 on /dev/sda1 |

**Storage Breakdown:**
- Application code: ~500 MB
- Node modules: ~2 GB
- PostgreSQL data: ~50 MB
- Redis data: ~5 MB
- Logs: ~500 MB
- Build artifacts: ~500 MB

---

## 3. Software Stack

### Operating System
| Component | Version |
|-----------|---------|
| OS | Debian GNU/Linux 13 (Trixie) |
| Kernel | 6.12.63+deb13-cloud-amd64 |
| Init System | systemd |

### Runtime & Languages
| Component | Version | Purpose |
|-----------|---------|---------|
| Bun | 1.3.6+ | API server runtime (faster than Node.js) |
| pnpm | 10.26.2 | Package manager |
| TypeScript | 5.x | Type-safe development (Bun runs TS natively) |

### Databases & Caching
| Component | Version | Purpose |
|-----------|---------|---------|
| PostgreSQL | 17.7 | Primary database |
| PgBouncer | Latest | Connection pooling |
| DragonflyDB | 1.36.0 | Caching, sessions, rate limiting (Redis-compatible, 25x faster) |

### Web Server & Security
| Component | Version | Purpose |
|-----------|---------|---------|
| Caddy | 2.10.2 | Reverse proxy, TLS, static files |

### Process Management
| Component | Version | Purpose |
|-----------|---------|---------|
| PM2 | Latest | Bun/Rust process management |
| systemd | System | Service management |

---

## 4. Network Architecture

### Port Bindings

| Port | Binding | Service | Exposure |
|------|---------|---------|----------|
| 80 | 0.0.0.0 | Caddy (HTTP→HTTPS redirect) | Public |
| 443 | 0.0.0.0 | Caddy (HTTPS) | Public |
| 2019 | 127.0.0.1 | Caddy Admin API | Internal |
| 3001 | 127.0.0.1 | Bun API | Internal |
| 5432 | 127.0.0.1 | PostgreSQL | Internal |
| 6379 | 127.0.0.1 | DragonflyDB | Internal |
| 6432 | 127.0.0.1 | PgBouncer | Internal |

**Security Design:**
- Only ports 80 and 443 are exposed to the internet
- All backend services bind to localhost only
- Caddy acts as the sole entry point
- No direct database access from the internet

### TLS Configuration
- **Provider:** Let's Encrypt (automatic via Caddy)
- **Renewal:** Automatic (Caddy handles this)
- **HSTS:** Enabled with preload (1 year max-age)
- **Ciphers:** Caddy defaults (modern, secure)

### Request Flow

```
Client Request
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│ Caddy (port 443)                                        │
│ 1. TLS termination                                      │
│ 2. Security headers injection                           │
│ 3. Compression (zstd/gzip)                              │
│ 4. Route matching                                       │
└─────────────────────────────────────────────────────────┘
      │
      ├─── /api/*, /health, /metrics, /ready
      │         │
      │         ▼
      │    ┌─────────────────────────────────────────────┐
      │    │ reverse_proxy 127.0.0.1:3001               │
      │    │ → Fastify API Server                       │
      │    └─────────────────────────────────────────────┘
      │
      └─── Static files (*.js, *.css, *.html, images)
                │
                ▼
           ┌─────────────────────────────────────────────┐
           │ file_server /var/www/musclemap.me/dist     │
           │ → SPA with fallback to index.html          │
           └─────────────────────────────────────────────┘
```

---

## 5. Database Architecture

### PostgreSQL Configuration

| Parameter | Value | Notes |
|-----------|-------|-------|
| max_connections | 100 | Managed by PgBouncer |
| shared_buffers | 128 MB | Could increase to 2GB |
| Database Size | 41 MB | Very small currently |
| Tables | 457 | Comprehensive schema |
| Migrations | 106 | Extensive history |

**Schema Characteristics:**
- Normalized relational design
- UUID primary keys
- JSONB columns for flexible data
- Extensive indexing strategy
- Trigger-based derived data

### PgBouncer Configuration

```ini
pool_mode = transaction          # Best for web apps
max_client_conn = 3000          # Client-side limit
default_pool_size = 25          # Connections per user/db
min_pool_size = 10              # Minimum hot connections
reserve_pool_size = 10          # Emergency connections
max_db_connections = 80         # Total to PostgreSQL

# Timeouts
server_connect_timeout = 10     # Connection establishment
query_wait_timeout = 30         # Query queue wait
server_idle_timeout = 300       # Idle connection reap
```

**Why Transaction Pooling:**
- Each API request gets a connection only for the duration of queries
- Supports thousands of concurrent API requests with ~80 DB connections
- Prevents connection exhaustion during traffic spikes
- Required for serverless-style scaling

### Connection Flow

```
Node.js App (multiple instances)
         │
         │ Up to 3000 concurrent connections
         ▼
┌─────────────────────────────────────────────────────────┐
│                     PGBOUNCER                            │
│  • Multiplexes 3000 client connections                   │
│  • Into 80 PostgreSQL connections                        │
│  • Transaction-level pooling                             │
│  • Query queueing with 30s timeout                       │
└─────────────────────────────────────────────────────────┘
         │
         │ Max 80 connections
         ▼
┌─────────────────────────────────────────────────────────┐
│                    POSTGRESQL                            │
│  • max_connections = 100                                 │
│  • 20 reserved for admin/maintenance                     │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Caching Strategy

### DragonflyDB Configuration

| Parameter | Value |
|-----------|-------|
| Version | 1.36.0 |
| Binding | 127.0.0.1:6379 |
| Max Memory | 512 MB (LRU eviction) |
| Threads | 2 (multi-threaded, unlike Redis) |
| Persistence | RDB snapshots (hourly) |

**Why DragonflyDB over Redis:**
- **25x faster** performance than Redis
- **80% less memory** usage
- **Multi-threaded** architecture (Redis is single-threaded)
- **Wire-compatible** with Redis (drop-in replacement, uses ioredis client)
- Active development with modern features

### Configuration

```ini
# /etc/dragonfly/dragonfly.conf
--bind=127.0.0.1
--port=6379
--maxmemory=512mb
--cache_mode=true
--dir=/var/lib/dragonfly
--dbfilename=dump
--snapshot_cron=0 * * * *
--proactor_threads=2
```

**Data Stored in DragonflyDB:**
- Session tokens (JWT refresh tokens)
- Rate limiting counters
- GraphQL query caching (APQ)
- Temporary computation results
- BullMQ job queues
- Feature flags (future)

### Multi-Layer Cache Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                      │
├─────────────────────────────────────────────────────────┤
│ L1: Memory Cache (Apollo Client InMemoryCache)          │
│     • Instant access                                     │
│     • Session-scoped                                     │
│     • Normalized GraphQL entities                        │
├─────────────────────────────────────────────────────────┤
│ L2a: LocalStorage (small data)                          │
│     • Persistent across sessions                         │
│     • 5MB limit                                          │
│     • User preferences, UI state                         │
├─────────────────────────────────────────────────────────┤
│ L2b: IndexedDB (large data)                             │
│     • Offline workout data                               │
│     • Cached exercise library                            │
│     • Queued mutations                                   │
├─────────────────────────────────────────────────────────┤
│ Service Worker Cache                                     │
│     • Static assets (immutable)                          │
│     • Stale-while-revalidate for API                    │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Network Request
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    CDN (Cloudflare)                      │
│     • Static asset caching (1 year)                      │
│     • Edge compression                                   │
│     • DDoS protection                                    │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    SERVER (Caddy)                        │
│     • Static file serving                                │
│     • Cache headers                                      │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION                           │
├─────────────────────────────────────────────────────────┤
│ L3: DragonflyDB Cache                                    │
│     • GraphQL persisted queries (APQ)                    │
│     • Rate limit counters                                │
│     • Session data                                       │
│     • Computed aggregations                              │
├─────────────────────────────────────────────────────────┤
│ L4: PostgreSQL                                           │
│     • Materialized views                                 │
│     • Covering indexes                                   │
│     • Connection pool                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Application Architecture

### Monorepo Structure

```
musclemap.me/
├── apps/
│   ├── api/               # Fastify API server (363 TS files)
│   │   ├── src/
│   │   │   ├── db/        # Database layer (106 migrations)
│   │   │   ├── graphql/   # GraphQL schema & resolvers
│   │   │   ├── http/      # REST routes (50k+ lines)
│   │   │   ├── modules/   # Feature modules
│   │   │   └── services/  # Business logic
│   │   └── dist/          # Compiled JS
│   └── mobile/            # React Native + Expo
├── packages/
│   ├── shared/            # Shared types/utilities
│   ├── core/              # Domain logic
│   ├── client/            # API client SDK
│   ├── plugin-sdk/        # Plugin development
│   └── ui/                # Cross-platform components
├── src/                   # React web frontend (95 pages, 295 components)
├── native/                # C native modules (TU calculations)
└── scripts/               # Automation scripts
```

### API Server Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FASTIFY SERVER                               │
├─────────────────────────────────────────────────────────────────────┤
│  Plugins                                                             │
│  ├── @fastify/cors          # CORS handling                         │
│  ├── @fastify/helmet        # Security headers                      │
│  ├── @fastify/jwt           # JWT authentication                    │
│  ├── @fastify/rate-limit    # Rate limiting (Redis-backed)          │
│  └── @apollo/server         # GraphQL server (Apollo Server 5)      │
├─────────────────────────────────────────────────────────────────────┤
│  Route Registration                                                  │
│  ├── /api/graphql          # GraphQL endpoint (PRIMARY)             │
│  ├── /health               # Health check                           │
│  ├── /ready                # Readiness probe                        │
│  └── /metrics              # Prometheus metrics                     │
├─────────────────────────────────────────────────────────────────────┤
│  Middleware Chain                                                    │
│  ├── Request logging                                                │
│  ├── Rate limiting                                                  │
│  ├── Authentication (JWT extraction)                                │
│  ├── Authorization (role checks)                                    │
│  └── Request validation (Zod schemas)                               │
├─────────────────────────────────────────────────────────────────────┤
│  Business Logic                                                      │
│  ├── Services (stateless business logic)                            │
│  ├── Repositories (data access)                                     │
│  └── Domain models (validation, behavior)                           │
└─────────────────────────────────────────────────────────────────────┘
```

**IMPORTANT: GraphQL-Only Architecture**

MuscleMap uses GraphQL as the **exclusive data access layer**. There are no REST endpoints for data operations. All reads and writes flow through the single GraphQL endpoint at `/api/graphql`. This design ensures:

- Single source of truth for API contracts (the GraphQL schema)
- Automatic type safety from schema to client
- Efficient data fetching (clients request exactly what they need)
- Built-in introspection and documentation

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         REACT SPA                                    │
├─────────────────────────────────────────────────────────────────────┤
│  Routing                                                             │
│  └── React Router v6 (lazy-loaded routes)                           │
├─────────────────────────────────────────────────────────────────────┤
│  State Management                                                    │
│  ├── Apollo Client (server state - GraphQL)                         │
│  ├── Zustand (client state - UI, sessions)                          │
│  └── React Context (theme, locale)                                  │
├─────────────────────────────────────────────────────────────────────┤
│  UI Layer                                                            │
│  ├── Tailwind CSS (utility-first)                                   │
│  ├── Framer Motion (animations)                                     │
│  ├── Headless UI (accessible components)                            │
│  └── Three.js (3D muscle visualization)                             │
├─────────────────────────────────────────────────────────────────────┤
│  Chunk Strategy                                                      │
│  ├── react-vendor (~165KB)      # Core React                        │
│  ├── apollo-vendor (~173KB)     # GraphQL client                    │
│  ├── three-vendor (~877KB)      # 3D rendering (lazy)               │
│  ├── recharts-vendor (~358KB)   # Charts (lazy)                     │
│  └── ui-vendor (~231KB)         # UI libraries                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. GraphQL Architecture & Data Flow

MuscleMap employs a **GraphQL-exclusive** architecture where all client-server communication flows through a single GraphQL endpoint. This is the most critical architectural decision in the system.

### Why GraphQL-Only (No REST)

| Aspect | GraphQL Approach | REST Alternative |
|--------|-----------------|------------------|
| Over-fetching | Client requests exactly what's needed | Fixed payloads, often too much data |
| Under-fetching | Single request for related data | Multiple round trips (N+1) |
| Type Safety | Schema-driven, auto-generated types | Manual type definitions |
| Versioning | Schema evolution, deprecation | URL versioning (/v1/, /v2/) |
| Documentation | Introspection, self-documenting | Swagger/OpenAPI separate |
| Caching | Normalized cache by entity ID | Response-level only |

### Server-Side GraphQL Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APOLLO SERVER 5 (Fastify)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    QUERY PROTECTION                          │    │
│  │  • Depth Limiting (max 10 levels)                            │    │
│  │  • Complexity Limiting (100 anon / 500 auth / 1000 premium)  │    │
│  │  • Rate Limiting (Redis-backed)                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    PERSISTED QUERIES (APQ)                   │    │
│  │  • Client sends SHA256 hash instead of full query            │    │
│  │  • Redis cache (24-hour TTL)                                 │    │
│  │  • In-memory fallback (1000 queries)                         │    │
│  │  • Reduces bandwidth by ~90% for repeat queries              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    RESPONSE CACHING                          │    │
│  │  Per-type TTL configuration:                                 │    │
│  │  • Static data (Exercise, Muscle): 15 minutes                │    │
│  │  • Semi-static (Archetype): 30 minutes                       │    │
│  │  • User data: 1 minute                                       │    │
│  │  • Real-time (CreditBalance): 15 seconds                     │    │
│  │  • Never cached: Mutations, Messages, Transactions           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    DATALOADERS (N+1 Prevention)              │    │
│  │  • Per-request batching and caching                          │    │
│  │  • L2 Redis cache for static data                            │    │
│  │  • Automatic query deduplication                             │    │
│  │  • Loaders: users, exercises, muscles, workouts, etc.        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    RESOLVERS                                 │    │
│  │  • 100+ resolver functions                                   │    │
│  │  • Authorization checks per field                            │    │
│  │  • Service layer calls (no direct DB access)                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Client-Side Apollo Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APOLLO CLIENT 4                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    LINK CHAIN (Request Pipeline)             │    │
│  │                                                              │    │
│  │  RetryLink ─→ ErrorLink ─→ AuthLink ─→ BatchHttpLink        │    │
│  │      │            │            │              │              │    │
│  │      │            │            │              └─ Batches up  │    │
│  │      │            │            │                 to 10 ops   │    │
│  │      │            │            │                 per request │    │
│  │      │            │            │                             │    │
│  │      │            │            └─ Injects JWT Bearer token   │    │
│  │      │            │                                          │    │
│  │      │            └─ Handles UNAUTHENTICATED errors          │    │
│  │      │               (redirects to /login)                   │    │
│  │      │                                                       │    │
│  │      └─ Retries network failures (3 attempts, jitter)        │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    NORMALIZED CACHE                          │    │
│  │                                                              │    │
│  │  InMemoryCache with Type Policies:                          │    │
│  │  • Entity normalization by ID (User:123, Workout:456)       │    │
│  │  • Field-level merge policies for pagination                │    │
│  │  • Automatic cache updates after mutations                  │    │
│  │  • Partial data returns (show cached while fetching)        │    │
│  │                                                              │    │
│  │  Type Policies:                                              │    │
│  │  ├── Query.myWorkouts: keyArgs [filter, sortBy], append     │    │
│  │  ├── Query.exercises: keyArgs [filter, muscleGroup]         │    │
│  │  ├── Query.messages: cursor pagination, prepend new         │    │
│  │  ├── User: keyFields [id]                                   │    │
│  │  ├── Workout: keyFields [id]                                │    │
│  │  └── Exercise: keyFields [id]                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    CACHE PERSISTENCE (IndexedDB)             │    │
│  │                                                              │    │
│  │  apollo3-cache-persist:                                     │    │
│  │  • Persists normalized cache to IndexedDB                   │    │
│  │  • 5MB maximum size                                         │    │
│  │  • Debounced writes (1 second)                              │    │
│  │  • Instant app loads on repeat visits                       │    │
│  │  • Survives browser refresh/close                           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Fetch Policies

Apollo Client uses intelligent fetch policies to balance freshness with performance:

| Policy | When Used | Behavior |
|--------|-----------|----------|
| `cache-first` | Default for queries | Return cached data immediately; no network if cache hit |
| `cache-and-network` | Default for watchQuery | Return cache immediately, then update from network |
| `network-only` | Sensitive data | Skip cache, always fetch fresh |
| `cache-only` | Offline mode | Only use cache, no network |

**Default Configuration:**
```javascript
defaultOptions: {
  watchQuery: {
    fetchPolicy: 'cache-and-network',     // Show cached, update in background
    nextFetchPolicy: 'cache-first',        // After first load, prefer cache
    returnPartialData: true,               // Show what we have immediately
    notifyOnNetworkStatusChange: true,     // Show loading states on refetch
  },
  query: {
    fetchPolicy: 'cache-first',            // Single queries prefer cache
    returnPartialData: true,               // Return partial while fetching rest
  }
}
```

### Hydration Strategy

MuscleMap uses a **cache-first hydration** strategy for optimal perceived performance:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APP STARTUP SEQUENCE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. IndexedDB Cache Restore (0-50ms)                                │
│     └─ Restore persisted Apollo cache from IndexedDB                │
│     └─ App can render immediately with cached data                  │
│                                                                      │
│  2. Render with Cached Data (50-100ms)                              │
│     └─ React renders using restored cache                           │
│     └─ User sees content immediately (no loading spinners)          │
│                                                                      │
│  3. Background Revalidation (100ms+)                                │
│     └─ Queries with cache-and-network policy                        │
│     └─ Fresh data fetched from server                               │
│     └─ UI updates seamlessly when new data arrives                  │
│                                                                      │
│  4. Optimistic Updates (user interactions)                          │
│     └─ Mutations show immediate UI feedback                         │
│     └─ Server response confirms or rolls back                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**First Load vs Repeat Visit:**

| Scenario | Time to Content | Data Freshness |
|----------|----------------|----------------|
| First visit (empty cache) | ~500-1000ms | Fresh from server |
| Repeat visit (with cache) | ~50-100ms | Cached, then updated |
| Offline (with cache) | ~50ms | Last cached state |

### Optimistic Updates

Mutations use optimistic responses for instant UI feedback:

```javascript
// Example: Adding a workout
const [addWorkout] = useMutation(ADD_WORKOUT, {
  // Optimistic response - UI updates immediately
  optimisticResponse: {
    addWorkout: {
      __typename: 'Workout',
      id: 'temp-id',           // Temporary ID
      date: new Date(),
      exercises: [...],
      totalTU: 150,
    }
  },
  // Update cache after mutation
  update: (cache, { data }) => {
    // Add new workout to cached list
    cache.modify({
      fields: {
        myWorkouts: (existing = []) => [data.addWorkout, ...existing]
      }
    });
  }
});
```

### Offline Support (Service Worker)

The Service Worker extends GraphQL caching for offline scenarios:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OFFLINE ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Service Worker (public/sw.js)                                      │
│  ├── Static Assets: Cache-first (7 days)                            │
│  ├── GraphQL Queries: Stale-while-revalidate (1 minute)             │
│  ├── GraphQL Mutations: Queue for Background Sync                   │
│  └── Exercise Database: Cached 30 days in IndexedDB                │
│                                                                      │
│  IndexedDB Stores:                                                   │
│  ├── pending-requests: Failed mutations awaiting sync               │
│  ├── exercises: Full exercise library (offline search)              │
│  ├── pending-workouts: Workouts logged while offline                │
│  ├── sync-queue: Ordered mutation queue                             │
│  ├── sync-metadata: Last sync timestamps                            │
│  └── conflicts: Server conflicts for resolution                     │
│                                                                      │
│  Background Sync:                                                    │
│  ├── Max retries: 5                                                 │
│  ├── Base delay: 1 second                                           │
│  ├── Max delay: 5 minutes                                           │
│  ├── Backoff: Exponential (2x)                                      │
│  └── Syncs when: Online + page visible                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Client vs Server Responsibilities

| Responsibility | Client (Apollo) | Server (Apollo Server) |
|---------------|-----------------|------------------------|
| Data fetching | Request batching, caching | DataLoader batching |
| Authentication | Token injection | JWT validation |
| Authorization | Hide UI elements | Field-level checks |
| Validation | Form validation | Schema + resolver validation |
| Pagination | Cursor tracking, merge | Keyset pagination queries |
| Real-time | WebSocket subscription | Subscription resolvers |
| Offline | IndexedDB queue | Conflict resolution |

### GraphQL Schema Statistics

| Metric | Count |
|--------|-------|
| Types | ~100 |
| Queries | ~50 |
| Mutations | ~80 |
| Subscriptions | ~10 |
| Resolver functions | 100+ |
| Lines in schema.ts | ~58,000 |
| Lines in resolvers.ts | ~104,000 |

### Performance Optimizations

1. **Query Batching (Client)**
   - BatchHttpLink combines up to 10 operations per HTTP request
   - Adaptive interval based on connection quality (20ms 4G, 500ms 2G)

2. **DataLoader (Server)**
   - Per-request batching prevents N+1 queries
   - L2 Redis cache for static data

3. **Persisted Queries (APQ)**
   - SHA256 hash instead of full query text
   - 90%+ bandwidth reduction for repeat queries

4. **Response Caching**
   - Redis-backed per-type TTL
   - Static data cached 15-30 minutes
   - Dynamic data 15-60 seconds

5. **Complexity Limiting**
   - Prevents expensive queries from DoS
   - Tiered limits: 100 (anon) / 500 (auth) / 1000 (premium)

---

## 9. Process Management

### PM2 Configuration

The application uses PM2 for Node.js process management with the following configuration:

**Main API Process:**
```javascript
{
  name: 'musclemap',
  script: 'dist/index.js',
  cwd: './apps/api',
  exec_mode: 'fork',           // Single process (cluster available)
  instances: 2,                // Match 2 CPU cores
  max_memory_restart: '1G',

  env_production: {
    NODE_ENV: 'production',
    PORT: 3001,
    HOST: '127.0.0.1',         // Localhost only
    REDIS_ENABLED: 'true',
    PG_POOL_MIN: 5,
    PG_POOL_MAX: 20,
  }
}
```

**Bug Hunter Daemon:**
```javascript
{
  name: 'bug-hunter',
  script: 'npx tsx scripts/bug-hunter/index.ts',
  args: '--daemon --production --level autonomous',
  max_memory_restart: '800M',  // Reduced for stability

  env_production: {
    PLAYWRIGHT_CHROMIUM_ARGS: '--disable-dev-shm-usage --no-sandbox --disable-gpu --single-process'
  }
}
```

### Process Memory Budgets

| Process | Normal | Peak | Restart Threshold |
|---------|--------|------|-------------------|
| musclemap (API) | 150-300 MB | 500 MB | 1 GB |
| bug-hunter | 300-600 MB | 800 MB | 800 MB |
| Node.js builds | N/A | 2-4 GB | N/A |

### Graceful Shutdown

```javascript
// Signal handling
process.on('SIGTERM', async () => {
  // 1. Stop accepting new connections
  server.close();

  // 2. Wait for in-flight requests (10s timeout)
  await waitForInflight(10000);

  // 3. Close database connections
  await closePool();

  // 4. Signal PM2 we're ready
  process.exit(0);
});

// PM2 ready signal (wait_ready: true)
process.send('ready');
```

---

## 10. Security Architecture

### Network Security

| Layer | Protection |
|-------|------------|
| Edge | Cloudflare DDoS protection |
| Transport | TLS 1.3 with HSTS |
| Application | Rate limiting (Redis-backed) |
| Database | Localhost-only binding |

### Security Headers (Caddy)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=()
```

### Authentication Flow

```
┌────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW                         │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User submits credentials                                     │
│     POST /api/v1/auth/login                                     │
│                                                                  │
│  2. Server validates credentials                                 │
│     • Check password hash (argon2)                              │
│     • Verify account status                                     │
│                                                                  │
│  3. Generate tokens                                              │
│     • Access token (JWT, 15min expiry)                          │
│     • Refresh token (opaque, stored in Redis)                   │
│                                                                  │
│  4. Return tokens                                                │
│     • Access token in response body                             │
│     • Refresh token in httpOnly cookie                          │
│                                                                  │
│  5. Client stores access token                                   │
│     • Memory only (not localStorage)                            │
│     • Apollo Client link intercepts requests                    │
│                                                                  │
│  6. Token refresh (automatic)                                    │
│     • When access token expires (401 response)                  │
│     • POST /api/v1/auth/refresh with cookie                     │
│     • New access token returned                                 │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| /api/v1/auth/* | 5 | 1 minute |
| /api/v1/* (authenticated) | 100 | 1 minute |
| /api/v1/* (anonymous) | 20 | 1 minute |
| /graphql (mutations) | 30 | 1 minute |
| /graphql (queries) | 200 | 1 minute |

---

## 11. Performance Characteristics

### Response Time Targets

| Endpoint Type | Target | Current |
|---------------|--------|---------|
| Health check | < 10ms | ~5ms |
| Static assets | < 50ms | ~20-50ms |
| Simple API | < 100ms | ~50-80ms |
| GraphQL query | < 200ms | ~100-150ms |
| Complex aggregation | < 500ms | ~200-400ms |

### Throughput Capacity

| Scenario | Estimated Capacity |
|----------|-------------------|
| Concurrent users | ~500-1000 |
| Requests/second (API) | ~500-1000 |
| Database queries/second | ~1000-2000 |
| WebSocket connections | ~1000 (if implemented) |

### Bundle Sizes (Production, Brotli)

| Chunk | Size | Load Priority |
|-------|------|---------------|
| index (main) | 110 KB | Critical |
| react-vendor | 46 KB | Critical |
| apollo-vendor | 45 KB | High |
| ui-vendor | 60 KB | Medium |
| three-vendor | 196 KB | Lazy |
| recharts-vendor | 75 KB | Lazy |

---

## 12. Operational Constraints

### Critical Limitations

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| 2 CPU cores | Limited parallelism | PM2 cluster mode (2 instances) |
| 8 GB RAM | Build processes can OOM | Stop services before building |
| Single server | No horizontal scaling | Vertical scaling only |
| No CDN origin shield | Direct origin hits | Aggressive cache headers |

### Build Process Requirements

**CRITICAL:** Vite builds require ~4GB RAM. Before running builds on the server:

```bash
# 1. Stop all PM2 processes
pm2 stop all

# 2. Clear OS caches
sync && echo 3 > /proc/sys/vm/drop_caches

# 3. Run build with limited memory
NODE_OPTIONS='--max-old-space-size=2048' pnpm build

# 4. Restart services
pm2 start ecosystem.config.cjs --env production
```

### Memory Pressure Scenarios

| Scenario | Risk | Solution |
|----------|------|----------|
| Concurrent builds | OOM kill | Sequential builds only |
| Bug hunter + builds | OOM kill | Stop bug hunter first |
| Traffic spike | Degraded performance | Rate limiting active |
| Memory leak | Process restart | PM2 max_memory_restart |

---

## 13. Scaling Considerations

### Current Capacity vs. Load

| Metric | Current Capacity | Current Load | Headroom |
|--------|------------------|--------------|----------|
| CPU | 2 cores | ~5-20% | 80%+ |
| RAM | 8 GB | ~3-6 GB | 25-60% |
| Disk | 99 GB | 11 GB | 88% |
| DB connections | 80 (PgBouncer) | ~5-10 | 90%+ |
| Network | 1 Gbps | ~1-10 Mbps | 99%+ |

### Vertical Scaling Path

When the current server becomes insufficient:

1. **First:** Increase RAM to 16 GB (~$10-20/mo more)
   - Allows comfortable builds without stopping services
   - More headroom for traffic spikes

2. **Second:** Increase to 4 CPU cores (~$10-20/mo more)
   - PM2 cluster mode with 4 instances
   - Better parallel request handling

3. **Third:** Increase to 32 GB RAM, 8 cores
   - Support for thousands of concurrent users
   - Room for additional services

### Horizontal Scaling (Future)

When vertical scaling is exhausted:

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │   (Cloudflare)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  App 1   │  │  App 2   │  │  App 3   │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │              │              │
             └──────────────┼──────────────┘
                            │
                   ┌────────┴────────┐
                   │                 │
                   ▼                 ▼
            ┌──────────┐      ┌──────────┐
            │  Redis   │      │ Postgres │
            │ (Managed)│      │ (Managed)│
            └──────────┘      └──────────┘
```

---

## 14. Monitoring & Observability

### Health Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| /health | Liveness probe | DB + Redis status |
| /ready | Readiness probe | Full system check |
| /metrics | Prometheus metrics | Counters, gauges, histograms |

### Metrics Collected

```
# Database
pg_pool_total_connections
pg_pool_idle_connections
pg_pool_waiting_clients
pg_query_duration_seconds

# DragonflyDB (Redis-compatible metrics)
redis_connected
redis_memory_used_bytes

# HTTP
http_request_duration_seconds
http_requests_total
http_response_size_bytes

# GraphQL
graphql_query_complexity
graphql_query_duration_seconds
graphql_cache_hits_total
```

### Log Locations

| Service | Log Location |
|---------|--------------|
| Caddy access | /var/log/caddy/musclemap-access.log |
| Caddy errors | /var/log/caddy/musclemap-error.log |
| PM2 out | /var/www/musclemap.me/logs/out.log |
| PM2 error | /var/www/musclemap.me/logs/error.log |
| PostgreSQL | /var/log/postgresql/ |
| PgBouncer | /var/log/postgresql/pgbouncer.log |
| DragonflyDB | /var/log/dragonfly/ + systemd journal |

---

## 15. Disaster Recovery

### Backup Strategy

| Data | Method | Frequency | Retention |
|------|--------|-----------|-----------|
| PostgreSQL | pg_dump | Daily | 30 days |
| DragonflyDB | RDB Snapshot | Hourly | 7 days |
| Code | Git (GitHub) | On push | Forever |
| Config | Git | On push | Forever |

### Recovery Procedures

**Database Recovery:**
```bash
# Restore from backup
pg_restore -d musclemap /backups/musclemap_YYYYMMDD.dump

# Or point-in-time recovery with WAL
pg_basebackup + WAL replay
```

**DragonflyDB Recovery:**
```bash
# DragonflyDB recovers automatically from RDB snapshot on restart
systemctl restart dragonfly

# Or restore from backup
cp /backups/dump /var/lib/dragonfly/
systemctl restart dragonfly
```

**Application Recovery:**
```bash
cd /var/www/musclemap.me
git fetch origin
git reset --hard origin/main
pnpm install
pnpm build:all
pm2 restart musclemap
```

---

## 16. Cost Optimization

### Current Infrastructure Cost

| Component | Estimated Cost/Month |
|-----------|---------------------|
| VPS (8GB RAM, 2 cores) | ~$15-25 |
| Domain (musclemap.me) | ~$1 (annual amortized) |
| Cloudflare (free tier) | $0 |
| SSL (Let's Encrypt) | $0 |
| **Total** | **~$15-25/month** |

### Cost Optimization Strategies

1. **Efficient Resource Usage**
   - PgBouncer reduces PostgreSQL memory needs
   - Aggressive caching reduces compute load
   - Lazy loading reduces bandwidth

2. **Build Optimization**
   - Local builds when possible (saves server resources)
   - Incremental TypeScript compilation
   - Pre-compressed assets (served directly)

3. **Future Considerations**
   - Consider managed PostgreSQL ($15-20/mo) if scaling needed
   - CDN for static assets if traffic grows
   - Consider object storage for user uploads

---

## Appendix A: Quick Reference

### Essential Commands

```bash
# Service Management
pm2 status                              # View all processes
pm2 restart musclemap                   # Restart API
pm2 logs musclemap --lines 50          # View recent logs

# Database
sudo -u postgres psql musclemap         # Direct DB access
redis-cli                               # DragonflyDB CLI (Redis-compatible)

# Caddy
caddy reload --config /etc/caddy/Caddyfile

# Build & Deploy
pm2 stop all                            # Before building
pnpm build:all                          # Build everything
pm2 start ecosystem.config.cjs --env production
```

### Key File Locations

| Purpose | Path |
|---------|------|
| Application code | /var/www/musclemap.me |
| Static files | /var/www/musclemap.me/dist |
| API build | /var/www/musclemap.me/apps/api/dist |
| Caddy config | /etc/caddy/Caddyfile |
| PostgreSQL config | /etc/postgresql/17/main/postgresql.conf |
| PgBouncer config | /etc/pgbouncer/pgbouncer.ini |
| DragonflyDB config | /etc/dragonfly/dragonfly.conf |
| PM2 config | /var/www/musclemap.me/ecosystem.config.cjs |

---

## Appendix B: Architecture Decision Records

### ADR-001: Fastify over Express
**Decision:** Use Fastify instead of Express.js
**Rationale:** 2-3x higher throughput, built-in validation, better TypeScript support
**Trade-offs:** Smaller ecosystem, different plugin API

### ADR-002: Caddy over Nginx
**Decision:** Use Caddy instead of Nginx
**Rationale:** Automatic TLS, simpler configuration, modern defaults
**Trade-offs:** Slightly higher memory, less community knowledge

### ADR-003: Transaction Pooling
**Decision:** Use PgBouncer with transaction pooling
**Rationale:** Supports 3000+ concurrent connections with 80 DB connections
**Trade-offs:** Can't use session-level features (prepared statements in session mode)

### ADR-004: Single Server Deployment
**Decision:** Deploy all services on one server
**Rationale:** Cost-effective, simpler operations, sufficient for current scale
**Trade-offs:** Single point of failure, limited horizontal scaling

### ADR-005: DragonflyDB for Sessions
**Decision:** Store sessions in DragonflyDB instead of PostgreSQL
**Rationale:** Lower latency, automatic expiration, reduces DB load, 25x faster than Redis
**Trade-offs:** Additional service to manage, data loss risk (mitigated by hourly RDB snapshots)

### ADR-006: DragonflyDB over Redis
**Decision:** Use DragonflyDB instead of Redis for caching and sessions
**Rationale:** 25x faster performance, 80% less memory, multi-threaded, wire-compatible
**Trade-offs:** Newer project with smaller community, but rapidly maturing

---

*Document generated automatically. Last infrastructure audit: January 2026.*
