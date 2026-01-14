# Stage 1: Deep Architecture Analysis

**Generated:** 2026-01-14
**Status:** Complete

## Executive Summary

This document captures a comprehensive analysis of the MuscleMap codebase architecture, identifying all system flows, user journeys, feature interactions, and potential areas for optimization.

---

## 1. System Architecture Overview

### Technology Stack
- **Backend:** Fastify API server (TypeScript)
- **Frontend:** React 18 + Vite (TypeScript/JavaScript)
- **Mobile:** React Native + Expo
- **Database:** PostgreSQL (single source of truth)
- **Caching:** Redis (optional)
- **Native Modules:** C with FFI bindings

### Data Flow
```
Client Apps (Web/Mobile)
      ↓ HTTPS
  GraphQL/REST API
      ↓
  Fastify Server
      ↓
  Business Logic (Modules/Services)
      ↓
  PostgreSQL Database
```

---

## 2. Database Schema Summary

### Core Tables (58 migrations, 100+ tables)

#### User & Authentication
- `users` - Core user data with XP, rank, veteran tier
- `refresh_tokens` - JWT token management
- `user_privacy_settings` - Per-user privacy controls
- `user_locations` - Geobucket location data
- `user_profile_extended` - Extended demographics

#### Economy System
- `credit_balances` - Current balance with lifetime stats
- `credit_ledger` - Transaction history (audit trail)
- `credit_transfers` - P2P transfer records
- `earning_rules` - Configurable reward rules
- `earning_awards` - Award history
- `economy_fraud_flags` - Fraud detection flags
- `economy_rate_limits` - Per-user rate limiting

#### Training & Progression
- `workouts` - Completed workout records
- `workout_sessions` - Active session tracking
- `rep_events` - Individual rep tracking
- `exercises` - Exercise definitions
- `exercise_activations` - Muscle activation mappings
- `character_stats` - STR/CON/DEX/PWR/END/VIT
- `rank_definitions` - 8-tier rank system
- `xp_history` - XP earning history

#### Social Features
- `user_follows` - One-way following
- `friendships` - Bidirectional friendships
- `user_blocks` - Block relationships
- `crews` - Team/clan system
- `crew_members` - Crew membership
- `rivalries` - 1v1 competitive tracking
- `mentorships` - Mentor/mentee relationships

#### Community
- `hangouts` - Physical location communities
- `hangout_memberships` - Location membership
- `communities` - Interest-based groups
- `conversations` / `messages` - Messaging system

### Key Relationships
- User → Workouts: 1:N
- User → Credits: 1:1 (balance) / 1:N (ledger)
- Exercise → Muscles: M:N via activations
- User → Crews: N:1 (one crew per user)
- User → Rivalries: 1:N

### Data Integrity Risks Identified
1. Cascade deletes could remove historical data
2. Exercise soft-delete missing (affects rep_events)
3. Crew ownership transfer not implemented
4. Hangout deletion removes all posts

---

## 3. API Surface Area

### REST Endpoints: 200+
### GraphQL: 100+ queries, 80+ mutations, 5 subscriptions

#### Endpoint Categories
| Category | Endpoints | Auth Required |
|----------|-----------|---------------|
| Authentication | 6 | Mixed |
| Profile | 5 | Yes |
| Workouts | 8 | Yes |
| Exercises | 10 | Mixed |
| Goals | 8 | Yes |
| Economy | 15 | Mixed |
| Stats | 12 | Mixed |
| Community | 20 | Mixed |
| Messaging | 10 | Yes |
| Competitions | 8 | Mixed |
| Crews | 12 | Yes |
| Rivals | 10 | Yes |
| Trainers | 15 | Mixed |
| Admin | 10 | Admin |

### Rate Limiting
- Global: 100 requests/minute (configurable)
- Auth: 10/minute
- Transfer: 5/minute
- GraphQL: 200/minute

---

## 4. Frontend Architecture

### State Management
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Server State | Apollo Client | Database data |
| Frequent State | Zustand | UI, workouts, timers |
| Static State | React Context | Theme, locale |

### Zustand Stores
- `authStore` - User session with localStorage persistence
- `uiStore` - Modals, toasts, sidebar, responsive state
- `workoutSessionStore` - Active workout tracking, rest timer
- `muscleVisualizationStore` - 3D model state

### Code Splitting
- 64 lazy-loaded pages
- ~300KB initial bundle (vs ~1.5MB without splitting)
- Per-page chunks <100KB
- Vendor chunks by category (react, three, d3, apollo)

### Adaptive Loading
- Connection tier detection (fast/medium/slow/offline)
- Device tier detection (high/medium/low)
- Conditional 3D visualization
- Responsive image loading

---

## 5. Business Logic Analysis

### Economy Service (Most Complex)
**Critical Functions:**
- `transact()` - Atomic credit operations
- `transfer()` - P2P with fraud detection
- `awardForReps()` - 1 credit per rep
- `processEarning()` - Rule-based rewards

**Identified Issues:**
1. Cache invalidation race condition (60s window)
2. Rate limit reset clock sensitivity
3. Idempotency key collision potential
4. No upper bound on daily limits

### Stats System
**Calculation:** Category-based weights × volume × difficulty
**Capping:** Max 5.0 contribution per workout per stat
**Consistency Bonus:** +0.2 CON per workout (7-day lookback)

### Leaderboard System
**Cohort Filtering:** Gender, age band, adaptive category
**Periods:** Daily, weekly, monthly, all-time
**Caching:** 60s TTL with pattern invalidation

---

## 6. Native C Modules

### Current Modules (3)
| Module | Purpose | Status |
|--------|---------|--------|
| libgeo | Geohash, haversine distance | Active |
| libratelimit | Lock-free rate limiting | Active |
| libtu | TU calculation | Built, NOT integrated |

### Performance Gains
| Operation | JS | Native | Speedup |
|-----------|-----|--------|---------|
| Geohash encode (1000x) | 150ms | 5ms | 30x |
| Rate limit check | 0.1ms | 0.01ms | 10x |
| TU batch calc (100) | 20ms | 2ms | 10x |

### Opportunities for New Modules
1. **librank.c** - Leaderboard sorting (10x speedup)
2. **libstats.c** - XP aggregation (10x speedup)
3. **libcompress.c** - Domain-specific compression

---

## 7. Test Coverage Analysis

### Current Coverage
| Type | Tests | Coverage |
|------|-------|----------|
| E2E User Journey | 200+ | 50+ features |
| Unit Tests | 30+ | Limited |
| Data Integrity | 20+ | Database schema |
| Integration | 15+ | API endpoints |

### Critical Gaps
1. Authentication flows (password reset, 2FA)
2. Concurrent operations (race conditions)
3. Real-time features (WebSocket)
4. Security testing (OWASP)
5. Performance testing (load)

---

## 8. Identified Issues Summary

### High Priority (Security/Stability)
1. SQL injection in Communities service (lines 258, 384)
2. Missing crypto import in Rivals service (line 128)
3. Race condition on crew creation
4. Rate limit reset clock sensitivity
5. Missing concurrency checks on UPDATE statements

### Medium Priority (Functionality)
1. Cache invalidation timing issues
2. Idempotency key uniqueness
3. Deadlock potential in wallet transfers
4. Leaderboard percentile off-by-one
5. Streak calculation efficiency

### Low Priority (Polish)
1. Optimize streak calculations
2. Add indexes for rate limit queries
3. Move audit logging to async queue
4. Document timezone assumptions

---

## 9. Performance Bottlenecks

### Identified Hot Paths
1. **Workout submission** - Stats update, achievement check, credit award
2. **Leaderboard queries** - Complex aggregation with cohort filters
3. **Community feed** - Large result sets with user enrichment
4. **Prescription generation** - Exercise matching algorithm

### Optimization Opportunities
1. Activate libtu for TU calculations
2. Add librank for leaderboard sorting
3. Implement cursor-based pagination everywhere
4. Add GraphQL response caching
5. Pre-aggregate daily stats snapshots

---

## 10. Security Considerations

### Current Strengths
- JWT authentication with refresh tokens
- Idempotency keys prevent duplicate operations
- Rate limiting on all endpoints
- Fraud detection system
- Admin audit logging

### Gaps to Address
- No OWASP testing
- SQL injection vulnerability found
- Missing input validation in some endpoints
- No CORS policy verification in tests

---

## Next Steps

1. **Stage 2:** Create comprehensive user personas and journey maps
2. **Stage 3:** Build exhaustive test harness with scripting system
3. **Stage 4:** Run simulations across all user types
4. **Stage 5:** Detailed performance analysis and profiling
5. **Stage 6:** Create implementation plan with pseudocode

---

*This analysis serves as the foundation for the comprehensive testing and refactoring plan.*
