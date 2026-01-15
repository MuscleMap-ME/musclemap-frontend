# MuscleMap Scaling Architecture Plan

**Goal**: Scale MuscleMap to handle **millions of concurrent active users** with optimal performance across all devices, low bandwidth, low latency, maximum security, and graceful failover.

**Current Hardware**: Hostinger KVM 2 VPS
- 2 CPU cores
- 8 GB RAM
- 100 GB SSD
- 8 TB bandwidth
- Debian 13
- Location: Boston, USA

---

## Executive Summary

The current single-VPS architecture cannot handle millions of concurrent users. This plan outlines a phased migration from a single server to a globally distributed, horizontally scalable infrastructure while maintaining simplicity and cost efficiency.

**Key Architecture Principles:**
1. **Edge-first** - Serve users from the nearest location
2. **Stateless services** - Scale horizontally without session affinity
3. **Event-driven** - Decouple components via message queues
4. **Cache everything** - Reduce database load by 95%+
5. **Progressive enhancement** - Work offline, sync when connected
6. **Zero-trust security** - Encrypt everything, authenticate everywhere

---

## Part 1: Infrastructure Architecture

### 1.1 Current State vs Target State

```
CURRENT (Single VPS - Boston) - OPTIMIZED January 2026
┌─────────────────────────────────────┐
│  Hostinger KVM 2                    │
│  ┌─────────┐  ┌─────────┐          │
│  │ Caddy   │→ │ Fastify │          │
│  │ (proxy) │  │ (API)   │          │
│  └─────────┘  └────┬────┘          │
│                    ↓                │
│  ┌─────────┐  ┌───────────┐        │
│  │ Redis   │  │ pgBouncer │        │
│  │ (cache) │  │ (pool)    │        │
│  │ ENABLED │  └─────┬─────┘        │
│  └─────────┘        ↓              │
│              ┌─────────┐           │
│              │ Postgres│           │
│              │ (DB)    │           │
│              └─────────┘           │
└─────────────────────────────────────┘
Max capacity: ~15,000-25,000 concurrent users (with optimizations)


TARGET (Global Edge Network)
┌──────────────────────────────────────────────────────────────────┐
│                         EDGE LAYER                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │Cloudflare│  │Cloudflare│  │Cloudflare│  │Cloudflare│           │
│  │ POP     │  │ POP     │  │ POP     │  │ POP     │           │
│  │ (NA)    │  │ (EU)    │  │ (APAC)  │  │ (LATAM) │           │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘           │
│       └────────────┴────────────┴────────────┘                   │
│                         ↓ (Global Anycast)                       │
├──────────────────────────────────────────────────────────────────┤
│                      COMPUTE LAYER                                │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │           Cloudflare Workers (Edge Compute)               │    │
│  │  • GraphQL Gateway (routing, caching, rate limiting)      │    │
│  │  • Auth validation (JWT verification at edge)             │    │
│  │  • Static asset serving (cache-first)                     │    │
│  │  • Real-time presence aggregation                         │    │
│  └──────────────────────────────────────────────────────────┘    │
│                              ↓                                    │
├──────────────────────────────────────────────────────────────────┤
│                      ORIGIN LAYER                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Origin NA   │  │ Origin EU   │  │ Origin APAC │              │
│  │ (Boston)    │  │ (Frankfurt) │  │ (Singapore) │              │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │              │
│  │ │ Fastify │ │  │ │ Fastify │ │  │ │ Fastify │ │              │
│  │ │ Cluster │ │  │ │ Cluster │ │  │ │ Cluster │ │              │
│  │ └────┬────┘ │  │ └────┬────┘ │  │ └────┬────┘ │              │
│  │      ↓      │  │      ↓      │  │      ↓      │              │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │              │
│  │ │ Redis   │ │  │ │ Redis   │ │  │ │ Redis   │ │              │
│  │ │ Cluster │ │  │ │ Replica │ │  │ │ Replica │ │              │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                              ↓                                    │
├──────────────────────────────────────────────────────────────────┤
│                      DATA LAYER                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │              PostgreSQL (Primary - Boston)                │    │
│  │              ┌─────────────────────────────┐              │    │
│  │              │  Primary (Write)            │              │    │
│  │              └────────────┬────────────────┘              │    │
│  │                   Streaming Replication                    │    │
│  │       ┌───────────────────┼───────────────────┐           │    │
│  │       ↓                   ↓                   ↓           │    │
│  │  ┌─────────┐        ┌─────────┐        ┌─────────┐        │    │
│  │  │ Read    │        │ Read    │        │ Read    │        │    │
│  │  │ Replica │        │ Replica │        │ Replica │        │    │
│  │  │ (EU)    │        │ (NA)    │        │ (APAC)  │        │    │
│  │  └─────────┘        └─────────┘        └─────────┘        │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
Max capacity: 10,000,000+ concurrent users
```

### 1.2 Hardware Scaling Path

#### Phase 1: Optimize Current VPS (0-25K users) ✅ COMPLETED
**Cost: $0 additional**
**Status: LIVE as of January 2026**

Optimizations implemented:
- ✅ **pgBouncer** - Transaction pooling mode (1000 client connections → 50 DB connections)
- ✅ **Redis caching** - Enabled for GraphQL responses, leaderboards, presence
- ✅ **Materialized views** - `mv_xp_rankings_v2`, `mv_leaderboard_top100`, `mv_sleep_stats`
- ✅ **Auto-refresh** - Materialized views refresh every 5 minutes
- ✅ **Cloudflare Free Tier** - Edge caching + DDoS protection
- ✅ **Connection pooling** - Node.js pool (5-20 connections) → pgBouncer (1000 clients)

**Current Configuration:**
```
pgBouncer Settings:
  pool_mode: transaction
  max_client_conn: 1000
  default_pool_size: 20
  max_db_connections: 50

Redis Settings:
  REDIS_ENABLED: true
  Cache TTLs: Exercise (5m), User (30s), Leaderboard (1m)

PostgreSQL:
  Connection via pgBouncer port 6432
  Materialized view refresh: 5 minutes
```

Expected capacity: **15,000-25,000 concurrent users**

#### Phase 2: Vertical Scale + CDN (10K-100K users)
**Cost: ~$50-100/month**
- Upgrade to Hostinger KVM 4 (4 CPU, 16GB RAM): ~$30/month
- Add Cloudflare Pro: ~$20/month
- Add managed PostgreSQL (Neon/Supabase free tier)
- Expected capacity: 50,000-100,000 concurrent users

#### Phase 3: Horizontal Scale (100K-1M users)
**Cost: ~$200-500/month**
- Add second VPS in EU (Hetzner/OVH): ~$30/month
- Cloudflare Business: ~$200/month
- Managed Redis (Upstash): ~$20/month
- PostgreSQL read replicas: ~$50/month
- Expected capacity: 500,000-1,000,000 concurrent users

#### Phase 4: Global Scale (1M+ users)
**Cost: ~$1,000-5,000/month**
- Multiple origin servers per region
- Cloudflare Enterprise or custom CDN
- Global PostgreSQL (CockroachDB/Neon)
- Kubernetes for container orchestration
- Expected capacity: 10,000,000+ concurrent users

---

## Part 2: Network Architecture

### 2.1 DNS & Global Load Balancing

```
DNS ARCHITECTURE
┌────────────────────────────────────────────────────────────┐
│                    musclemap.me                             │
│                         │                                   │
│              Cloudflare DNS (Anycast)                       │
│                         │                                   │
│         ┌───────────────┼───────────────┐                  │
│         ↓               ↓               ↓                  │
│    ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│    │ NA Edge │    │ EU Edge │    │ APAC    │              │
│    │  POPs   │    │  POPs   │    │  POPs   │              │
│    └─────────┘    └─────────┘    └─────────┘              │
│                                                             │
│  GeoDNS Routing:                                           │
│  • Americas → NA POPs → Boston origin                      │
│  • Europe/Africa → EU POPs → Frankfurt origin              │
│  • Asia/Pacific → APAC POPs → Singapore origin             │
└────────────────────────────────────────────────────────────┘
```

**Implementation:**
```
# Cloudflare DNS records (managed via API)
musclemap.me     A     Proxied (Cloudflare handles anycast)
api.musclemap.me CNAME Proxied (routes to origin via Workers)
ws.musclemap.me  A     Proxied (WebSocket through Cloudflare)
```

### 2.2 SSL/TLS Configuration

```
TLS ARCHITECTURE
┌─────────────────────────────────────────────────────────────┐
│                    END-TO-END ENCRYPTION                     │
│                                                              │
│  Client ←──TLS 1.3──→ Edge ←──mTLS──→ Origin ←──TLS──→ DB  │
│                                                              │
│  Certificates:                                               │
│  • Edge: Cloudflare Universal SSL (auto-renewed)            │
│  • Origin: Cloudflare Origin CA (15-year cert)              │
│  • Internal: mTLS between services                          │
│                                                              │
│  Cipher Suites (in order):                                  │
│  1. TLS_AES_256_GCM_SHA384                                  │
│  2. TLS_CHACHA20_POLY1305_SHA256                            │
│  3. TLS_AES_128_GCM_SHA256                                  │
│                                                              │
│  Security Headers:                                           │
│  • HSTS: max-age=31536000; includeSubDomains; preload       │
│  • Certificate Transparency: Enforced                        │
│  • OCSP Stapling: Enabled                                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 DDoS Protection

```
DDOS MITIGATION LAYERS
┌─────────────────────────────────────────────────────────────┐
│ Layer 7 (Application)                                        │
│ ├─ GraphQL query complexity limits (max cost: 1000)         │
│ ├─ Rate limiting per user/IP (100 req/min default)          │
│ ├─ Request size limits (10MB max)                           │
│ ├─ Bot detection (Cloudflare Bot Management)                │
│ └─ WAF rules (OWASP Core Rule Set)                          │
│                                                              │
│ Layer 4 (Transport)                                          │
│ ├─ SYN flood protection (Cloudflare Magic Transit)          │
│ ├─ Connection limits per IP                                  │
│ └─ TCP optimization (BBR congestion control)                │
│                                                              │
│ Layer 3 (Network)                                            │
│ ├─ Anycast absorption (distribute attack across POPs)       │
│ ├─ IP reputation filtering                                   │
│ └─ GeoIP blocking (optional, for targeted attacks)          │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 3: Application Architecture

### 3.1 Stateless API Design

```
STATELESS SERVICE ARCHITECTURE
┌─────────────────────────────────────────────────────────────┐
│                     API REQUEST FLOW                         │
│                                                              │
│  1. Request arrives at edge                                  │
│     ↓                                                        │
│  2. JWT validated at edge (no origin hit for bad tokens)    │
│     ↓                                                        │
│  3. Cache check (95%+ of reads served from edge cache)      │
│     ↓ (cache miss)                                           │
│  4. Route to nearest healthy origin                          │
│     ↓                                                        │
│  5. Origin processes request (stateless, any instance)      │
│     ↓                                                        │
│  6. Response cached at edge + origin                         │
│     ↓                                                        │
│  7. Response returned to client                              │
│                                                              │
│  KEY PRINCIPLE: No session state on servers                  │
│  • Auth: Stateless JWT (validated at edge)                  │
│  • User data: Always fetched from DB/cache                  │
│  • File uploads: Direct to object storage (R2/S3)           │
│  • WebSockets: Backed by Redis pub/sub                      │
└─────────────────────────────────────────────────────────────┘
```

**Current Changes Needed:**

```javascript
// apps/api/src/http/server.ts - Remove any session state
// BEFORE (if any session middleware exists):
fastify.register(session, { ... }); // ❌ Remove

// AFTER: Pure JWT authentication
fastify.register(jwtPlugin, {
  secret: process.env.JWT_SECRET,
  sign: { algorithm: 'ES256', expiresIn: '7d' },
  verify: { algorithms: ['ES256'] }
});

// All user context comes from JWT, not server state
fastify.addHook('onRequest', async (request) => {
  if (request.headers.authorization) {
    request.user = await request.jwtVerify();
  }
});
```

### 3.2 GraphQL Optimization for Scale

```
GRAPHQL AT SCALE
┌─────────────────────────────────────────────────────────────┐
│                   QUERY OPTIMIZATION                         │
│                                                              │
│  1. PERSISTED QUERIES (Reduce payload size by 90%)          │
│     ┌─────────────────────────────────────────────────┐     │
│     │ Client sends: { id: "abc123", variables: {...} }│     │
│     │ Instead of:   { query: "query GetUser...", ... }│     │
│     │ Savings: 2KB → 200 bytes per request            │     │
│     └─────────────────────────────────────────────────┘     │
│                                                              │
│  2. AUTOMATIC QUERY BATCHING                                 │
│     ┌─────────────────────────────────────────────────┐     │
│     │ 10 component mounts = 10 queries                │     │
│     │ Batched into 1 request with 10 operations       │     │
│     │ Savings: 10 round trips → 1 round trip          │     │
│     └─────────────────────────────────────────────────┘     │
│                                                              │
│  3. RESPONSE COMPRESSION                                     │
│     ┌─────────────────────────────────────────────────┐     │
│     │ Brotli compression: 80% size reduction          │     │
│     │ 100KB response → 20KB over wire                 │     │
│     └─────────────────────────────────────────────────┘     │
│                                                              │
│  4. QUERY COMPLEXITY LIMITS                                  │
│     ┌─────────────────────────────────────────────────┐     │
│     │ Max depth: 10 levels                            │     │
│     │ Max complexity: 1000 points                     │     │
│     │ Max aliases: 10 per query                       │     │
│     │ Prevents: N+1 attacks, resource exhaustion      │     │
│     └─────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**

```javascript
// apps/api/src/graphql/index.ts
import { createComplexityLimitRule } from 'graphql-validation-complexity';
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  schema,
  validationRules: [
    depthLimit(10),
    createComplexityLimitRule(1000, {
      scalarCost: 1,
      objectCost: 2,
      listFactor: 10,
    }),
  ],
  persistedQueries: {
    cache: new RedisCache({ client: redis }),
    ttl: 86400, // 24 hours
  },
  plugins: [
    ApolloServerPluginCacheControl({
      defaultMaxAge: 60, // 1 minute default
    }),
  ],
});
```

### 3.3 Caching Strategy (Multi-Layer)

```
CACHING LAYERS
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  L1: BROWSER CACHE (Milliseconds)                           │
│  ├─ Service Worker: Offline-first for static assets         │
│  ├─ Apollo Client: In-memory normalized cache               │
│  └─ LocalStorage: User preferences, draft workouts          │
│      TTL: Session / Manual invalidation                      │
│                                                              │
│  L2: EDGE CACHE (< 50ms globally)                           │
│  ├─ Cloudflare CDN: Static assets (JS, CSS, images)         │
│  ├─ Cloudflare KV: GraphQL query responses                  │
│  └─ Cloudflare R2: User uploads, generated images           │
│      TTL: 1 hour (static), 1-5 min (dynamic)                │
│                                                              │
│  L3: ORIGIN CACHE (< 10ms)                                  │
│  ├─ Redis: Hot data, session tokens, rate limits            │
│  ├─ DataLoader: Request-scoped query batching               │
│  └─ In-memory: Config, feature flags                        │
│      TTL: 1-60 minutes depending on data type               │
│                                                              │
│  L4: DATABASE (< 50ms with connection pooling)              │
│  ├─ PostgreSQL: Source of truth                             │
│  ├─ Read replicas: Geo-distributed reads                    │
│  └─ Connection pooling: PgBouncer (6000 connections)        │
│                                                              │
│  CACHE HIT TARGETS:                                         │
│  • L1 (Browser): 40% of requests                            │
│  • L2 (Edge): 50% of requests that miss L1                  │
│  • L3 (Origin): 80% of requests that miss L2                │
│  • L4 (Database): Only 2% of total requests                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Cache Key Strategy:**

```javascript
// apps/api/src/lib/cache.service.ts
const CACHE_KEYS = {
  // User-specific (short TTL)
  user: (id) => `user:${id}`,              // 5 min
  userStats: (id) => `user:${id}:stats`,   // 5 min
  userAchievements: (id) => `user:${id}:achievements`, // 10 min

  // Global reference data (long TTL)
  exercises: () => 'ref:exercises',         // 1 hour
  muscles: () => 'ref:muscles',             // 1 hour
  equipment: () => 'ref:equipment',         // 1 hour

  // Aggregations (medium TTL)
  leaderboard: (type) => `agg:leaderboard:${type}`, // 5 min
  communityStats: () => 'agg:community',    // 1 min

  // Real-time (very short TTL)
  presence: (room) => `rt:presence:${room}`, // 30 sec
  activeUsers: () => 'rt:active',            // 1 min
};

// Cache warming on startup
async function warmCache() {
  await Promise.all([
    cacheExercises(),
    cacheMuscles(),
    cacheEquipment(),
    cacheAchievements(),
  ]);
}
```

### 3.4 Real-Time Architecture (WebSockets at Scale)

```
WEBSOCKET SCALING
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  CHALLENGE: 1M concurrent WebSocket connections              │
│  Each connection = ~10KB RAM = 10GB RAM just for sockets    │
│                                                              │
│  SOLUTION: Hybrid Pub/Sub Architecture                       │
│                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Client    │     │   Client    │     │   Client    │   │
│  │   (NA)      │     │   (EU)      │     │   (APAC)    │   │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘   │
│         │                   │                   │           │
│         ↓                   ↓                   ↓           │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │ Cloudflare  │     │ Cloudflare  │     │ Cloudflare  │   │
│  │ Durable Obj │     │ Durable Obj │     │ Durable Obj │   │
│  │ (WS proxy)  │     │ (WS proxy)  │     │ (WS proxy)  │   │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘   │
│         │                   │                   │           │
│         └───────────────────┼───────────────────┘           │
│                             ↓                               │
│                   ┌─────────────────┐                       │
│                   │  Redis Pub/Sub  │                       │
│                   │  (Global)       │                       │
│                   └─────────────────┘                       │
│                                                              │
│  HOW IT WORKS:                                              │
│  1. Client connects to nearest edge (Durable Object)        │
│  2. Edge maintains WebSocket, subscribes to Redis channel   │
│  3. Events published to Redis propagate to all edges        │
│  4. Each edge pushes to its connected clients               │
│                                                              │
│  BENEFITS:                                                   │
│  • Connections held at edge (low latency)                   │
│  • Origin only handles pub/sub (no connection state)        │
│  • Horizontal scaling: add more edge POPs                   │
│  • Failover: clients reconnect to different edge            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.5 Database Scaling Strategy

```
POSTGRESQL SCALING PATH
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  PHASE 1: Connection Pooling (Current → 10K users)          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  App (20 conn) → PgBouncer (6000 conn) → PG (100)  │    │
│  │  • Transaction pooling mode                         │    │
│  │  • Prepared statement caching                       │    │
│  │  • Connection reuse across requests                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  PHASE 2: Read Replicas (10K → 100K users)                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Writes → Primary (Boston)                          │    │
│  │  Reads  → Nearest Replica (EU, APAC, NA-2)         │    │
│  │  • Streaming replication (< 1s lag)                │    │
│  │  • Automatic failover with pg_auto_failover        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  PHASE 3: Sharding (100K → 1M+ users)                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Shard by user_id hash:                             │    │
│  │  • Shard 0: user_id % 4 == 0                       │    │
│  │  • Shard 1: user_id % 4 == 1                       │    │
│  │  • Shard 2: user_id % 4 == 2                       │    │
│  │  • Shard 3: user_id % 4 == 3                       │    │
│  │  Global tables: exercises, muscles, equipment       │    │
│  │  (replicated to all shards)                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  PHASE 4: Global Distribution (1M+ users)                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Option A: CockroachDB (automatic geo-sharding)    │    │
│  │  Option B: Citus (PostgreSQL-compatible sharding)  │    │
│  │  Option C: Neon (serverless PostgreSQL branches)   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 4: Frontend Architecture

### 4.1 Bundle Optimization

```
BUNDLE SIZE TARGETS
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  CURRENT STATE:                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Initial bundle: ~300KB (gzipped)                   │    │
│  │  Full app: ~3.9MB (with all lazy chunks)           │    │
│  │  Landing page SVG: 14MB (BLOAT - needs removal)    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  TARGET STATE:                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Initial bundle: < 100KB (critical path only)      │    │
│  │  TTI on 3G: < 3 seconds                            │    │
│  │  LCP: < 1.5 seconds                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  CHUNK STRATEGY:                                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Entry (critical):     React + Router (~40KB)      │    │
│  │  Framework (defer):    Apollo + Auth (~30KB)       │    │
│  │  Pages (lazy):         Per-route splitting (~5-20KB)│   │
│  │  Visualizations:       Three.js / D3 (on-demand)   │    │
│  │  Icons:                Tree-shaken Lucide          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Vite Config Updates:**

```javascript
// vite.config.js
export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Critical path - loaded immediately
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react';
          }
          // Deferred - loaded after first paint
          if (id.includes('@apollo/client') || id.includes('graphql')) {
            return 'apollo';
          }
          // On-demand - loaded when needed
          if (id.includes('three') || id.includes('@react-three')) {
            return 'three';
          }
          if (id.includes('d3')) {
            return 'd3';
          }
          if (id.includes('framer-motion')) {
            return 'animation';
          }
        },
      },
    },
  },
  plugins: [
    // Brotli + Gzip precompression
    compression({ algorithm: 'brotliCompress', ext: '.br' }),
    compression({ algorithm: 'gzip', ext: '.gz' }),
  ],
});
```

### 4.2 Service Worker Strategy

```
SERVICE WORKER ARCHITECTURE
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  CACHING STRATEGIES BY RESOURCE TYPE:                       │
│                                                              │
│  1. APP SHELL (Cache-first, background update)              │
│     • index.html, main.js, main.css                         │
│     • Immediate display, update on next visit               │
│                                                              │
│  2. STATIC ASSETS (Cache-first, immutable)                  │
│     • Hashed JS/CSS chunks, fonts, images                   │
│     • Never revalidate (hash = version)                     │
│                                                              │
│  3. API RESPONSES (Stale-while-revalidate)                  │
│     • GraphQL queries (exercises, muscles, user data)       │
│     • Show cached, fetch fresh, update if changed           │
│                                                              │
│  4. USER DATA (Network-first, cache fallback)               │
│     • Mutations, real-time data                             │
│     • Always try network, fall back to cached               │
│                                                              │
│  5. OFFLINE QUEUE (IndexedDB)                               │
│     • Failed mutations queued for retry                     │
│     • Sync when back online (Background Sync API)           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Service Worker Implementation:**

```javascript
// public/sw.js
const CACHE_VERSION = 'v2';
const CACHES = {
  static: `static-${CACHE_VERSION}`,
  api: `api-${CACHE_VERSION}`,
  images: `images-${CACHE_VERSION}`,
};

// Precache critical assets
const PRECACHE = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/logo.webp',
];

// Cache strategies
const strategies = {
  cacheFirst: async (request, cacheName) => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  },

  staleWhileRevalidate: async (request, cacheName) => {
    const cached = await caches.match(request);
    const fetchPromise = fetch(request).then(response => {
      caches.open(cacheName).then(cache => {
        cache.put(request, response.clone());
      });
      return response;
    });
    return cached || fetchPromise;
  },

  networkFirst: async (request, cacheName, timeout = 3000) => {
    try {
      const response = await Promise.race([
        fetch(request),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), timeout)
        ),
      ]);
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      return response;
    } catch {
      return caches.match(request);
    }
  },
};
```

### 4.3 Adaptive Loading

```
ADAPTIVE LOADING SYSTEM
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  CONNECTION DETECTION:                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  navigator.connection.effectiveType                  │    │
│  │  • '4g' → Full experience                           │    │
│  │  • '3g' → Reduced animations, smaller images        │    │
│  │  • '2g'/'slow-2g' → Minimal mode                    │    │
│  │                                                      │    │
│  │  navigator.connection.saveData                       │    │
│  │  • true → Data saver mode (like 2g)                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ADAPTIVE FEATURES:                                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Feature          4G      3G      2G/SaveData       │    │
│  │  ─────────────────────────────────────────────────  │    │
│  │  3D Muscle Map    Full    Static   Image only       │    │
│  │  Animations       Full    Reduced  Disabled         │    │
│  │  Images           Full    WebP     Thumbnail        │    │
│  │  Video            Auto    On-tap   Disabled         │    │
│  │  Prefetching      Yes     Limited  Disabled         │    │
│  │  GraphQL polling  5s      30s      Disabled         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 5: Security Architecture

### 5.1 Zero-Trust Security Model

```
SECURITY LAYERS
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  1. EDGE SECURITY (Cloudflare)                              │
│     ├─ WAF: OWASP Core Rule Set                             │
│     ├─ Bot Management: Challenge suspicious traffic         │
│     ├─ Rate Limiting: Per-IP and per-user                   │
│     ├─ DDoS Protection: Automatic L3/L4/L7                  │
│     └─ TLS 1.3: End-to-end encryption                       │
│                                                              │
│  2. API SECURITY (Fastify)                                  │
│     ├─ JWT Validation: ES256 algorithm, short expiry        │
│     ├─ CORS: Strict origin whitelist                        │
│     ├─ Helmet: Security headers                             │
│     ├─ Input Validation: Zod schemas                        │
│     └─ Query Limits: Depth, complexity, rate                │
│                                                              │
│  3. DATA SECURITY (PostgreSQL)                              │
│     ├─ Encryption at Rest: AES-256                          │
│     ├─ Encryption in Transit: TLS                           │
│     ├─ Row-Level Security: User data isolation              │
│     ├─ Audit Logging: All sensitive operations              │
│     └─ Backups: Encrypted, geo-redundant                    │
│                                                              │
│  4. CLIENT SECURITY                                         │
│     ├─ CSP: Strict content security policy                  │
│     ├─ SRI: Subresource integrity for CDN assets            │
│     ├─ HttpOnly Cookies: Refresh tokens                     │
│     └─ Secure Storage: Encrypted IndexedDB                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Authentication Flow

```
AUTH ARCHITECTURE
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  TOKEN STRATEGY:                                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Access Token:                                       │    │
│  │  • JWT (ES256 algorithm)                            │    │
│  │  • 15 minute expiry                                 │    │
│  │  • Stored in memory only (not localStorage)         │    │
│  │  • Contains: userId, email, roles                   │    │
│  │                                                      │    │
│  │  Refresh Token:                                      │    │
│  │  • Opaque token (random 256-bit)                    │    │
│  │  • 7 day expiry                                     │    │
│  │  • Stored in HttpOnly cookie                        │    │
│  │  • Rotated on each use                              │    │
│  │  • Revokable (stored in Redis)                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  FLOW:                                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  1. Login → Returns access + sets refresh cookie    │    │
│  │  2. API call → Send access token in header          │    │
│  │  3. Token expired → Silent refresh via cookie       │    │
│  │  4. Refresh expired → Redirect to login             │    │
│  │  5. Logout → Revoke refresh, clear cookie           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Rate Limiting Strategy

```javascript
// apps/api/src/middleware/rateLimit.ts
const rateLimits = {
  // Anonymous users (by IP)
  anonymous: {
    global: { max: 60, window: '1m' },
    auth: { max: 10, window: '1m' }, // Login attempts
    signup: { max: 5, window: '1h' },
  },

  // Authenticated users (by userId)
  authenticated: {
    global: { max: 1000, window: '1m' },
    mutations: { max: 100, window: '1m' },
    uploads: { max: 10, window: '1h' },
  },

  // Premium users (higher limits)
  premium: {
    global: { max: 5000, window: '1m' },
    mutations: { max: 500, window: '1m' },
    uploads: { max: 100, window: '1h' },
  },
};
```

---

## Part 6: Monitoring & Observability

### 6.1 Metrics Stack

```
OBSERVABILITY ARCHITECTURE
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  METRICS (Prometheus + Grafana)                             │
│  ├─ Request rate, latency, errors (RED metrics)             │
│  ├─ Database queries per second, latency                    │
│  ├─ Cache hit/miss rates                                    │
│  ├─ WebSocket connection counts                             │
│  └─ Business metrics (signups, workouts, etc.)              │
│                                                              │
│  LOGGING (Structured JSON → Loki)                           │
│  ├─ Request logs with correlation IDs                       │
│  ├─ Error stack traces                                      │
│  ├─ Slow query logs (> 100ms)                               │
│  └─ Security events (failed auth, rate limits)              │
│                                                              │
│  TRACING (OpenTelemetry → Jaeger)                           │
│  ├─ Distributed traces across services                      │
│  ├─ Database query timing                                   │
│  ├─ External API calls                                      │
│  └─ Cache operations                                        │
│                                                              │
│  ALERTING (Grafana + PagerDuty)                             │
│  ├─ Error rate > 1% → Warning                               │
│  ├─ Error rate > 5% → Critical                              │
│  ├─ P99 latency > 1s → Warning                              │
│  ├─ Database connections > 80% → Warning                    │
│  └─ Disk usage > 80% → Warning                              │
│                                                              │
│  UPTIME (Better Uptime / Checkly)                           │
│  ├─ HTTP health checks every 30s                            │
│  ├─ Multi-region probes (NA, EU, APAC)                      │
│  ├─ SSL certificate monitoring                              │
│  └─ Status page for users                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Real User Monitoring (RUM)

```
FRONTEND PERFORMANCE MONITORING
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  CORE WEB VITALS:                                           │
│  ├─ LCP (Largest Contentful Paint): < 2.5s                  │
│  ├─ FID (First Input Delay): < 100ms                        │
│  ├─ CLS (Cumulative Layout Shift): < 0.1                    │
│  └─ INP (Interaction to Next Paint): < 200ms                │
│                                                              │
│  CUSTOM METRICS:                                            │
│  ├─ Time to first workout log                               │
│  ├─ 3D model load time                                      │
│  ├─ GraphQL query latency (client-side)                     │
│  └─ Offline queue sync time                                 │
│                                                              │
│  IMPLEMENTATION:                                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  // src/utils/vitals.js                             │    │
│  │  import { onLCP, onFID, onCLS, onINP } from 'web-vitals';│
│  │                                                      │    │
│  │  function sendToAnalytics(metric) {                  │    │
│  │    fetch('/api/vitals', {                           │    │
│  │      method: 'POST',                                │    │
│  │      body: JSON.stringify(metric),                  │    │
│  │      keepalive: true, // Send even on page close    │    │
│  │    });                                              │    │
│  │  }                                                  │    │
│  │                                                      │    │
│  │  onLCP(sendToAnalytics);                            │    │
│  │  onFID(sendToAnalytics);                            │    │
│  │  onCLS(sendToAnalytics);                            │    │
│  │  onINP(sendToAnalytics);                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 7: DevOps & Deployment

### 7.1 CI/CD Pipeline

```
DEPLOYMENT PIPELINE
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  TRIGGER: Push to main branch                               │
│                                                              │
│  1. BUILD STAGE                                             │
│     ├─ Install dependencies (pnpm, cached)                  │
│     ├─ Type check (pnpm typecheck)                          │
│     ├─ Lint (pnpm lint)                                     │
│     ├─ Unit tests (pnpm test)                               │
│     └─ Build all packages (pnpm build:all)                  │
│                                                              │
│  2. TEST STAGE                                              │
│     ├─ Integration tests (API + DB)                         │
│     ├─ E2E tests (Playwright)                               │
│     ├─ Lighthouse CI (performance budgets)                  │
│     └─ Security scan (npm audit, Snyk)                      │
│                                                              │
│  3. DEPLOY STAGE (Blue-Green)                               │
│     ├─ Deploy to staging slot                               │
│     ├─ Run smoke tests                                      │
│     ├─ Swap staging → production                            │
│     ├─ Monitor error rates (5 min)                          │
│     └─ Auto-rollback if errors > 1%                         │
│                                                              │
│  4. POST-DEPLOY                                             │
│     ├─ Purge CDN cache                                      │
│     ├─ Notify team (Slack/Discord)                          │
│     ├─ Update status page                                   │
│     └─ Run database migrations (if any)                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Infrastructure as Code

```yaml
# infrastructure/terraform/main.tf (conceptual)
module "cdn" {
  source = "./modules/cloudflare"

  zone_id = var.cloudflare_zone_id

  dns_records = {
    "musclemap.me" = { proxied = true }
    "api.musclemap.me" = { proxied = true }
    "ws.musclemap.me" = { proxied = true }
  }

  page_rules = {
    "musclemap.me/api/*" = {
      cache_level = "bypass"
      ssl = "full_strict"
    }
    "musclemap.me/*" = {
      cache_level = "cache_everything"
      edge_cache_ttl = 86400
    }
  }

  firewall_rules = {
    rate_limit = { expression = "true", action = "challenge", threshold = 100 }
    block_bots = { expression = "(cf.threat_score gt 30)", action = "block" }
  }
}

module "compute" {
  source = "./modules/vps"

  regions = ["us-east", "eu-central", "ap-southeast"]

  instances = {
    "api-na" = { size = "4vcpu-16gb", region = "us-east" }
    "api-eu" = { size = "4vcpu-16gb", region = "eu-central" }
    "api-ap" = { size = "4vcpu-16gb", region = "ap-southeast" }
  }
}

module "database" {
  source = "./modules/postgresql"

  primary = {
    size = "8vcpu-32gb"
    region = "us-east"
    storage = "500gb"
  }

  replicas = [
    { region = "eu-central", size = "4vcpu-16gb" },
    { region = "ap-southeast", size = "4vcpu-16gb" },
  ]
}
```

---

## Part 8: Community & Ecosystem

### 8.1 Plugin Architecture

```
PLUGIN SYSTEM (Already exists in @musclemap.me/plugin-sdk)
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  PLUGIN TYPES:                                              │
│  ├─ Data sources (wearables, fitness apps)                  │
│  ├─ Visualizations (custom charts, 3D models)               │
│  ├─ Workout programs (training plans)                       │
│  └─ Integrations (Apple Health, Google Fit, Strava)         │
│                                                              │
│  PLUGIN DISTRIBUTION:                                       │
│  ├─ Official plugins (npm @musclemap.me/plugin-*)           │
│  ├─ Community plugins (npm, verified)                       │
│  └─ Custom plugins (self-hosted)                            │
│                                                              │
│  SECURITY MODEL:                                            │
│  ├─ Sandboxed execution (Web Workers)                       │
│  ├─ Permission system (data access, API calls)              │
│  ├─ Code signing (verified publishers)                      │
│  └─ Review process (official marketplace)                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 API for Third-Party Developers

```
PUBLIC API (Future)
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  ENDPOINTS:                                                 │
│  ├─ GraphQL: /api/graphql (primary)                         │
│  ├─ REST: /api/v1/* (compatibility layer)                   │
│  └─ Webhooks: /api/webhooks (events)                        │
│                                                              │
│  AUTHENTICATION:                                            │
│  ├─ OAuth 2.0 (third-party apps)                            │
│  ├─ API Keys (server-to-server)                             │
│  └─ JWT (user delegation)                                   │
│                                                              │
│  RATE LIMITS:                                               │
│  ├─ Free tier: 100 req/hour                                 │
│  ├─ Developer tier: 10,000 req/hour                         │
│  └─ Enterprise: Custom                                      │
│                                                              │
│  DOCUMENTATION:                                             │
│  ├─ Interactive docs: /docs/api                             │
│  ├─ SDKs: JS, Python, Swift, Kotlin                         │
│  └─ Example apps and tutorials                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Open Source Strategy

```
OPEN SOURCE COMPONENTS
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  FULLY OPEN:                                                │
│  ├─ @musclemap.me/shared (utilities)                        │
│  ├─ @musclemap.me/plugin-sdk (plugin development)           │
│  ├─ @musclemap.me/ui (component library)                    │
│  └─ Documentation and tutorials                             │
│                                                              │
│  SOURCE AVAILABLE:                                          │
│  ├─ @musclemap.me/core (business logic, read-only)          │
│  ├─ @musclemap.me/client (API client)                       │
│  └─ Example applications                                    │
│                                                              │
│  PROPRIETARY:                                               │
│  ├─ API server implementation                               │
│  ├─ ML models (exercise detection, form analysis)           │
│  └─ Premium features                                        │
│                                                              │
│  COMMUNITY CONTRIBUTIONS:                                   │
│  ├─ Plugins (official marketplace)                          │
│  ├─ Translations (Crowdin)                                  │
│  ├─ Bug reports and feature requests (GitHub Issues)        │
│  └─ Documentation improvements (GitHub PRs)                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 9: Implementation Roadmap

### Phase 1: Foundation (Current → 10K users)
**Timeline: Immediate**
**Cost: $0 additional**

```
CHECKLIST:
[ ] Optimize current VPS configuration
    [ ] Enable PgBouncer for connection pooling
    [ ] Configure PM2 cluster mode (already done)
    [ ] Enable Brotli compression
    [ ] Set up proper cache headers

[ ] Implement edge caching
    [ ] Sign up for Cloudflare Free
    [ ] Configure DNS through Cloudflare
    [ ] Set up page rules for caching
    [ ] Enable automatic HTTPS

[ ] Optimize frontend
    [ ] Remove 14MB SVG from build
    [ ] Implement persisted GraphQL queries
    [ ] Enable service worker caching
    [ ] Add adaptive loading hooks

[ ] Add monitoring
    [ ] Set up Prometheus metrics endpoint
    [ ] Configure alerting for errors
    [ ] Add real user monitoring (RUM)
```

### Phase 2: Scale (10K → 100K users)
**Timeline: When hitting capacity**
**Cost: ~$100/month**

```
CHECKLIST:
[ ] Upgrade infrastructure
    [ ] Upgrade VPS to 4 CPU / 16GB RAM
    [ ] Add managed Redis (Upstash)
    [ ] Set up PostgreSQL read replica

[ ] Enhance caching
    [ ] Upgrade to Cloudflare Pro
    [ ] Implement Cloudflare Workers for edge logic
    [ ] Add CDN for user uploads (R2)

[ ] Improve reliability
    [ ] Set up health checks and auto-restart
    [ ] Implement circuit breakers
    [ ] Add database connection pooling (PgBouncer)

[ ] Enhance security
    [ ] Enable Cloudflare WAF
    [ ] Implement rate limiting at edge
    [ ] Add bot management
```

### Phase 3: Global (100K → 1M users)
**Timeline: When expanding internationally**
**Cost: ~$500/month**

```
CHECKLIST:
[ ] Add regional origins
    [ ] Deploy EU origin (Frankfurt)
    [ ] Deploy APAC origin (Singapore)
    [ ] Configure geo-routing

[ ] Scale database
    [ ] Add read replicas in each region
    [ ] Implement query routing
    [ ] Set up cross-region replication

[ ] Scale real-time
    [ ] Deploy Cloudflare Durable Objects for WebSockets
    [ ] Implement Redis cluster for pub/sub
    [ ] Add presence aggregation at edge
```

### Phase 4: Hyperscale (1M+ users)
**Timeline: When needed**
**Cost: ~$5,000+/month**

```
CHECKLIST:
[ ] Full edge architecture
    [ ] Cloudflare Enterprise
    [ ] Global database (CockroachDB/Neon)
    [ ] Kubernetes for container orchestration

[ ] Advanced features
    [ ] ML inference at edge
    [ ] Real-time collaboration
    [ ] Global leaderboards with sub-second updates
```

---

## Part 10: Quick Wins (Implement Now)

### Immediate Actions (No cost, high impact)

```bash
# 1. Enable Cloudflare (Free tier)
# - Sign up at cloudflare.com
# - Add musclemap.me domain
# - Update nameservers at Hostinger
# - Enable "Always Use HTTPS"
# - Set SSL mode to "Full (Strict)"

# 2. Optimize build
cd /Users/jeanpaulniko/Public/musclemap.me

# Remove bloated SVG from build
# Move to lazy-loaded or external hosting

# 3. Add compression to Caddy (on server)
ssh root@musclemap.me
cat >> /etc/caddy/Caddyfile << 'EOF'
(common) {
    encode zstd gzip
    header {
        Cache-Control "public, max-age=31536000, immutable"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    }
}
EOF

# 4. Enable connection pooling
# Add PgBouncer to VPS
apt install pgbouncer
# Configure for transaction pooling mode
```

---

## Summary

This plan transforms MuscleMap from a single-VPS deployment to a globally distributed, edge-first architecture capable of handling millions of concurrent users.

**Key Principles:**
1. **Edge-first**: Serve users from the nearest location (< 50ms latency globally)
2. **Cache everything**: 95%+ of requests served from cache
3. **Stateless services**: Any server can handle any request
4. **Progressive enhancement**: Works offline, syncs when connected
5. **Zero-trust security**: Encrypted at every layer

**Scaling Path:**
- Phase 1 (0-10K): Optimize current VPS → $0/month
- Phase 2 (10K-100K): CDN + managed services → ~$100/month
- Phase 3 (100K-1M): Multi-region deployment → ~$500/month
- Phase 4 (1M+): Global edge network → ~$5,000+/month

**Next Steps:**
1. Sign up for Cloudflare Free
2. Remove 14MB SVG from build
3. Implement persisted GraphQL queries
4. Add real user monitoring
5. Set up alerting

This architecture will support your growth while maintaining simplicity, performance, and security at every stage.
