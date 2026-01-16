# MuscleMap Full Refactor Plan

## Executive Summary

This document outlines a comprehensive refactor of the MuscleMap codebase to address technical debt, improve type safety, enhance test coverage, and establish patterns for long-term maintainability.

**Current Health Score: 7.5/10**
**Target Health Score: 9.0/10**

### Key Metrics

| Metric | Current | Target |
|--------|---------|--------|
| TypeScript Strict Mode | Disabled (API) | Enabled |
| Frontend Type Safety | JSX (no types) | TSX (strict) |
| Test Coverage | ~2% | >50% |
| Files with `any` | 113+ | 0 |
| Migration Conflicts | 5 files | 0 |
| JSONB Parse Anti-patterns | ~15 | 0 |
| OFFSET Pagination | 5 routes | 0 |

---

## Phase 0: Critical Fixes (Day 1)

**Priority: BLOCKER - Must complete before any other work**

### 0.1 Fix Migration File Naming Conflicts

**Problem**: 5 migration files all start with `108_`, causing deployment failures on fresh databases.

**Files to rename**:
```
108_backup_system.ts        → 109_backup_system.ts
108_deployments_table.ts    → 110_deployments_table.ts
108_env_config_management.ts → 111_env_config_management.ts
108_scheduled_jobs.ts       → 112_scheduled_jobs.ts
108_security_audit_system.ts → 113_security_audit_system.ts
```

**Implementation**:
```bash
cd apps/api/src/db/migrations
mv 108_backup_system.ts 109_backup_system.ts
mv 108_deployments_table.ts 110_deployments_table.ts
mv 108_env_config_management.ts 111_env_config_management.ts
mv 108_scheduled_jobs.ts 112_scheduled_jobs.ts
mv 108_security_audit_system.ts 113_security_audit_system.ts
```

**Verification**: Run `pnpm -C apps/api db:migrate` on a fresh database.

### 0.2 Remove JSON.parse on JSONB Columns

**Problem**: PostgreSQL JSONB columns return JavaScript objects, not strings. Parsing them is unnecessary CPU overhead.

**Files to fix** (15+ instances):
- `apps/api/src/http/routes/prescription.ts` - 8 instances
- `apps/api/src/http/routes/watch.ts` - 2 instances
- `apps/api/src/modules/nutrition/*.ts` - 3 instances
- `apps/api/src/modules/recovery/*.ts` - 2 instances

**Pattern**:
```typescript
// BEFORE (wrong)
const exercises = JSON.parse(prescription.exercises || '[]');

// AFTER (correct)
const exercises = prescription.exercises || [];
```

**Verification**: Search for `JSON.parse` in route files and verify JSONB columns.

### 0.3 Replace OFFSET Pagination with Keyset

**Problem**: OFFSET pagination has O(n) performance, degrading as data grows.

**Files to fix** (5 routes):
- `apps/api/src/http/routes/checkins.ts`
- `apps/api/src/http/routes/body-measurements.ts`
- `apps/api/src/http/routes/admin-deploy.ts`
- Others using `OFFSET $X` pattern

**Pattern**:
```typescript
// BEFORE (wrong)
SELECT * FROM table WHERE user_id = $1 LIMIT $2 OFFSET $3

// AFTER (correct)
SELECT * FROM table
WHERE user_id = $1
  AND (created_at, id) < ($2, $3)
ORDER BY created_at DESC, id DESC
LIMIT $4
```

---

## Phase 1: TypeScript Strict Mode (Week 1-2)

**Goal**: Enable strict TypeScript across the entire API layer.

### 1.1 Audit `any` Type Usage

**Current state**: 113 files contain `any` type

**Strategy**: Fix in dependency order:
1. Shared utilities (`packages/shared`)
2. Core types (`packages/core`)
3. Database layer (`apps/api/src/db`)
4. Services (`apps/api/src/modules`)
5. Routes (`apps/api/src/http/routes`)
6. GraphQL resolvers (`apps/api/src/graphql`)

### 1.2 Enable Strict Mode Incrementally

**Step 1**: Enable `noImplicitAny` first
```json
// apps/api/tsconfig.json
{
  "compilerOptions": {
    "noImplicitAny": true,  // Enable first
    "strict": false         // Enable after noImplicitAny passes
  }
}
```

**Step 2**: Fix all implicit `any` errors (estimate: 200-300 fixes)

**Step 3**: Enable full strict mode
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "declaration": true
  }
}
```

### 1.3 Create Type Definitions

**Missing types to create**:
```typescript
// apps/api/src/types/index.ts

// Request context types
interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

// Database result types
interface PaginatedResult<T> {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
}

// Service response types
type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: AppError };
```

### 1.4 Type Database Queries

**Current**: Raw SQL with `any` returns
**Target**: Typed query helpers

```typescript
// BEFORE
const user = await queryOne('SELECT * FROM users WHERE id = $1', [id]);
// Type: any

// AFTER
interface User {
  id: string;
  email: string;
  username: string;
  // ...
}

const user = await queryOne<User>(
  'SELECT id, email, username FROM users WHERE id = $1',
  [id]
);
// Type: User | null
```

---

## Phase 2: Repository Pattern (Week 2-3)

**Goal**: Separate data access from business logic.

### 2.1 Create Repository Base Class

```typescript
// apps/api/src/db/repository.ts

export abstract class Repository<T, CreateDTO, UpdateDTO> {
  constructor(
    protected tableName: string,
    protected db: DatabaseClient
  ) {}

  async findById(id: string): Promise<T | null> {
    return this.db.queryOne<T>(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
  }

  async findByIds(ids: string[]): Promise<T[]> {
    return this.db.queryAll<T>(
      `SELECT * FROM ${this.tableName} WHERE id = ANY($1)`,
      [ids]
    );
  }

  async create(data: CreateDTO): Promise<T> {
    // Implementation with proper typing
  }

  async update(id: string, data: UpdateDTO): Promise<T | null> {
    // Implementation with proper typing
  }

  async delete(id: string): Promise<boolean> {
    // Implementation
  }

  // Keyset pagination helper
  async findPaginated(
    filters: Record<string, unknown>,
    cursor: { createdAt: Date; id: string } | null,
    limit: number
  ): Promise<PaginatedResult<T>> {
    // Implementation
  }
}
```

### 2.2 Implement Domain Repositories

**Priority order**:
1. `UserRepository` - Core user operations
2. `WorkoutRepository` - Workout CRUD
3. `ExerciseRepository` - Exercise lookups
4. `CreditRepository` - Economy operations
5. `CrewRepository` - Social features

**Example**:
```typescript
// apps/api/src/repositories/workout.repository.ts

export class WorkoutRepository extends Repository<Workout, CreateWorkoutDTO, UpdateWorkoutDTO> {
  constructor(db: DatabaseClient) {
    super('workouts', db);
  }

  async findByUserId(
    userId: string,
    cursor?: { createdAt: Date; id: string },
    limit = 50
  ): Promise<PaginatedResult<Workout>> {
    const query = cursor
      ? `SELECT * FROM workouts
         WHERE user_id = $1
           AND (created_at, id) < ($2, $3)
         ORDER BY created_at DESC, id DESC
         LIMIT $4`
      : `SELECT * FROM workouts
         WHERE user_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT $2`;

    const params = cursor
      ? [userId, cursor.createdAt, cursor.id, limit + 1]
      : [userId, limit + 1];

    const results = await this.db.queryAll<Workout>(query, params);
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, -1) : results;

    return {
      items,
      cursor: items.length > 0
        ? encodeCursor(items[items.length - 1])
        : null,
      hasMore,
    };
  }

  async getWithExercises(workoutId: string): Promise<WorkoutWithExercises | null> {
    // Efficient JOIN query instead of N+1
  }
}
```

### 2.3 Update Services to Use Repositories

```typescript
// BEFORE (direct SQL in service)
export async function getUserWorkouts(userId: string, page: number) {
  return queryAll('SELECT * FROM workouts WHERE user_id = $1 LIMIT 50 OFFSET $2',
    [userId, page * 50]);
}

// AFTER (repository injection)
export class WorkoutService {
  constructor(private workoutRepo: WorkoutRepository) {}

  async getUserWorkouts(userId: string, cursor?: string) {
    const parsedCursor = cursor ? decodeCursor(cursor) : undefined;
    return this.workoutRepo.findByUserId(userId, parsedCursor);
  }
}
```

---

## Phase 3: Frontend TypeScript Migration (Week 3-5)

**Goal**: Convert 218 JSX components to TSX with strict typing.

### 3.1 Migration Strategy

**Approach**: Migrate by feature domain, not file-by-file.

**Priority order** (by impact and dependencies):
1. **Core UI** (week 3)
   - `src/components/ui/` - Shared components
   - `src/components/layout/` - Layout wrappers
   - `src/components/common/` - Common utilities

2. **Authentication** (week 3)
   - `src/components/auth/` - Login, register, etc.
   - `src/pages/auth/` - Auth pages

3. **Workout Flow** (week 4)
   - `src/components/workout-mode/` - Core workout UI
   - `src/components/exercises/` - Exercise components
   - `src/pages/workout/` - Workout pages

4. **Social & Gamification** (week 4-5)
   - `src/components/gamification/` - Badges, XP, etc.
   - `src/components/community/` - Social features
   - `src/components/mascot/` - Companion UI

5. **Admin & Settings** (week 5)
   - `src/components/admin/` - Admin panels
   - `src/pages/settings/` - Settings pages

### 3.2 Component Type Patterns

```typescript
// Component Props Pattern
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  children,
}) => {
  // Implementation
};

// Hook Types Pattern
interface UseWorkoutSessionReturn {
  isActive: boolean;
  currentExercise: Exercise | null;
  restTimer: number;
  startWorkout: (prescriptionId: string) => void;
  endWorkout: () => Promise<WorkoutResult>;
  logSet: (set: SetData) => void;
}

export function useWorkoutSession(): UseWorkoutSessionReturn {
  // Implementation
}
```

### 3.3 State Management Types

```typescript
// Zustand Store Types
interface UIState {
  sidebarOpen: boolean;
  activeModal: ModalType | null;
  toasts: Toast[];
}

interface UIActions {
  toggleSidebar: () => void;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set) => ({
  // Implementation
}));

// Type-safe selector pattern
export const useSidebarOpen = () =>
  useUIStore((state) => state.sidebarOpen);
```

### 3.4 Enable Frontend Strict Mode

```json
// tsconfig.json (root)
{
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

---

## Phase 4: Test Coverage (Week 5-7)

**Goal**: Achieve >50% test coverage across critical paths.

### 4.1 Testing Infrastructure

**Current state**: 4 test files total (3 frontend, 1 API)

**Target structure**:
```
tests/
├── unit/                    # Unit tests
│   ├── api/
│   │   ├── services/       # Service unit tests
│   │   ├── repositories/   # Repository unit tests
│   │   └── utils/         # Utility unit tests
│   └── frontend/
│       ├── components/    # Component unit tests
│       ├── hooks/        # Hook unit tests
│       └── utils/        # Utility unit tests
├── integration/            # Integration tests
│   ├── api/              # API integration tests
│   └── frontend/        # Frontend integration tests
└── e2e/                   # End-to-end tests
    └── user-journeys/    # User flow tests
```

### 4.2 API Testing Strategy

**Unit Tests** (per service):
```typescript
// tests/unit/api/services/credit.service.test.ts
describe('CreditService', () => {
  describe('transfer', () => {
    it('should transfer credits between users', async () => {
      const mockRepo = createMockCreditRepository();
      const service = new CreditService(mockRepo);

      const result = await service.transfer({
        fromUserId: 'user1',
        toUserId: 'user2',
        amount: 100,
        reason: 'gift',
      });

      expect(result.success).toBe(true);
      expect(mockRepo.debit).toHaveBeenCalledWith('user1', 100, expect.any(String));
      expect(mockRepo.credit).toHaveBeenCalledWith('user2', 100, expect.any(String));
    });

    it('should fail if sender has insufficient balance', async () => {
      // Test
    });

    it('should handle concurrent transfers correctly', async () => {
      // Race condition test
    });
  });
});
```

**Integration Tests** (per route):
```typescript
// tests/integration/api/routes/workouts.test.ts
describe('POST /api/workouts', () => {
  let app: FastifyInstance;
  let testUser: User;
  let authToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    testUser = await createTestUser();
    authToken = generateToken(testUser);
  });

  afterAll(async () => {
    await cleanupTestUser(testUser.id);
    await app.close();
  });

  it('should create a workout with valid data', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/workouts',
      headers: { Authorization: `Bearer ${authToken}` },
      payload: {
        exercises: [{ exerciseId: 'ex1', sets: [{ weight: 100, reps: 10 }] }],
        idempotencyKey: 'test-key-1',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      id: expect.any(String),
      userId: testUser.id,
    });
  });

  it('should return 401 without auth token', async () => {
    // Test
  });

  it('should deduplicate with same idempotency key', async () => {
    // Test
  });
});
```

### 4.3 Frontend Testing Strategy

**Component Tests**:
```typescript
// tests/unit/frontend/components/WorkoutCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkoutCard } from '@/components/workout/WorkoutCard';

describe('WorkoutCard', () => {
  const mockWorkout = {
    id: '1',
    name: 'Push Day',
    exerciseCount: 5,
    completedAt: new Date(),
  };

  it('renders workout information', () => {
    render(<WorkoutCard workout={mockWorkout} />);

    expect(screen.getByText('Push Day')).toBeInTheDocument();
    expect(screen.getByText('5 exercises')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<WorkoutCard workout={mockWorkout} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(mockWorkout.id);
  });
});
```

**Hook Tests**:
```typescript
// tests/unit/frontend/hooks/useRestTimer.test.ts
import { renderHook, act } from '@testing-library/react';
import { useRestTimer } from '@/hooks/useRestTimer';

describe('useRestTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down from initial time', () => {
    const { result } = renderHook(() => useRestTimer(60));

    act(() => {
      result.current.start();
    });

    expect(result.current.time).toBe(60);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.time).toBe(50);
  });

  it('triggers callback when timer completes', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useRestTimer(5, { onComplete }));

    act(() => {
      result.current.start();
      vi.advanceTimersByTime(6000);
    });

    expect(onComplete).toHaveBeenCalled();
  });
});
```

### 4.4 Coverage Targets

| Area | Current | Target |
|------|---------|--------|
| API Services | 0% | 80% |
| API Routes | 0% | 60% |
| API Repositories | 0% | 70% |
| Frontend Components | 0% | 40% |
| Frontend Hooks | 0% | 60% |
| E2E User Journeys | ~10% | 90% |

---

## Phase 5: Component Organization (Week 7-8)

**Goal**: Reorganize 218 components into logical, navigable structure.

### 5.1 Current State Analysis

**Problem**: 56 top-level component directories, hard to navigate.

```
src/components/
├── admin/           (15 files)
├── ai-coach/        (5 files)
├── archetypes/      (8 files)
├── atlas/           (12 files)
├── auth/            (6 files)
... 51 more directories
```

### 5.2 Proposed Structure

**Feature-based organization**:
```
src/
├── features/                    # Feature modules
│   ├── auth/                   # Authentication
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── index.ts
│   ├── workout/               # Workout tracking
│   │   ├── components/
│   │   │   ├── WorkoutCard.tsx
│   │   │   ├── ExerciseList.tsx
│   │   │   ├── SetLogger.tsx
│   │   │   └── RestTimer.tsx
│   │   ├── hooks/
│   │   │   ├── useWorkoutSession.ts
│   │   │   └── useRestTimer.ts
│   │   ├── pages/
│   │   │   ├── WorkoutPage.tsx
│   │   │   └── WorkoutHistoryPage.tsx
│   │   └── index.ts
│   ├── social/                # Social features
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/
│   ├── gamification/          # XP, badges, etc.
│   ├── economy/              # Credits, wallet
│   ├── profile/              # User profile
│   └── admin/                # Admin panels
├── shared/                    # Shared code
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # Primitives (Button, Input, etc.)
│   │   ├── layout/          # Layout components
│   │   └── feedback/        # Toast, Modal, etc.
│   ├── hooks/               # Shared hooks
│   ├── utils/               # Utilities
│   └── types/               # Shared types
└── app/                      # App-level code
    ├── routes/              # Route definitions
    ├── providers/           # Context providers
    └── App.tsx              # Root component
```

### 5.3 Migration Approach

**Step 1**: Create new structure alongside existing
**Step 2**: Migrate one feature at a time
**Step 3**: Update imports using IDE refactoring
**Step 4**: Delete old directories

**Import alias setup** (vite.config.ts):
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@features': path.resolve(__dirname, './src/features'),
    '@shared': path.resolve(__dirname, './src/shared'),
    '@app': path.resolve(__dirname, './src/app'),
  },
},
```

---

## Phase 6: State Management Consolidation (Week 8-9)

**Goal**: Clear boundaries between state management solutions.

### 6.1 Current State (Mixed)

| Solution | Current Usage | Issues |
|----------|--------------|--------|
| Zustand | UI state, workout session, auth | Overlapping with Context |
| Apollo Client | Server state (GraphQL) | Good |
| React Context | Theme, locale, user (legacy) | Duplicates authStore |
| localStorage | Token persistence | Good |
| IndexedDB | Apollo cache | Good |

### 6.2 Proposed State Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                        STATE MANAGEMENT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Apollo Client  │  │     Zustand     │  │ React Context   │  │
│  │                 │  │                 │  │                 │  │
│  │  • Server data  │  │  • UI state     │  │  • Theme        │  │
│  │  • GraphQL      │  │  • Forms        │  │  • Locale       │  │
│  │  • Caching      │  │  • Modals       │  │                 │  │
│  │  • Optimistic   │  │  • Real-time    │  │  (rarely        │  │
│  │    updates      │  │    state        │  │   changing)     │  │
│  │                 │  │  • Auth token   │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Consolidation Tasks

1. **Remove UserContext** - Migrate to authStore
2. **Move theme to Zustand** - Simplify, better devtools
3. **Define clear rules** - Document in CLAUDE.md

**Decision tree** (add to docs):
```
Is it from the server (database)?
  → YES: Use Apollo Client
  → NO: Continue...

Does it change frequently (real-time)?
  → YES: Use Zustand
  → NO: Continue...

Is it shared across unrelated components?
  → YES: Use Zustand
  → NO: Continue...

Does it rarely change (theme, locale)?
  → YES: Use Zustand (simpler than Context)
  → NO: Use local useState
```

---

## Phase 7: Documentation Cleanup (Week 9-10)

**Goal**: Reduce 64 markdown files to essential, up-to-date documentation.

### 7.1 Documentation Audit

**Keep and Update**:
- `CLAUDE.md` - Development guide (keep comprehensive)
- `ARCHITECTURE.md` - Auto-generated system overview
- `CODING-STYLE-GUIDE.md` - Standards reference
- `DATABASE-OPTIMIZATION-PLAN.md` - Database guidelines

**Archive** (move to `docs/archive/`):
- Completed migration plans
- Old feature plans
- Superseded documentation

**Delete**:
- Duplicate content
- Outdated plans with no historical value

### 7.2 Auto-Generation

**Keep auto-generated**:
- API documentation (from TypeBox schemas)
- Route documentation (from OpenAPI spec)
- Component documentation (from TypeDoc)

**Command**:
```bash
pnpm docs:generate  # Already exists
```

---

## Implementation Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 0: Critical Fixes | 1 day | Day 1 | Day 1 |
| Phase 1: TypeScript Strict | 2 weeks | Day 2 | Day 14 |
| Phase 2: Repository Pattern | 1.5 weeks | Day 8 | Day 21 |
| Phase 3: Frontend TypeScript | 2.5 weeks | Day 15 | Day 35 |
| Phase 4: Test Coverage | 2 weeks | Day 28 | Day 49 |
| Phase 5: Component Reorg | 1.5 weeks | Day 42 | Day 56 |
| Phase 6: State Management | 1 week | Day 49 | Day 63 |
| Phase 7: Documentation | 1 week | Day 56 | Day 70 |

**Note**: Phases overlap intentionally for efficiency.

---

## Success Criteria

### Phase 0 Complete When:
- [ ] All migrations have unique numbers (no 108_* conflicts)
- [ ] Zero `JSON.parse` on JSONB columns
- [ ] Zero `OFFSET` pagination in production routes

### Phase 1 Complete When:
- [ ] `pnpm typecheck` passes with `strict: true` in API
- [ ] Zero `any` types in `apps/api/src`
- [ ] All database queries return typed results

### Phase 2 Complete When:
- [ ] Repository pattern implemented for core domains
- [ ] Services use dependency injection
- [ ] Database queries isolated from business logic

### Phase 3 Complete When:
- [ ] All 218 JSX files converted to TSX
- [ ] Frontend `strict: true` passes
- [ ] All components have typed props

### Phase 4 Complete When:
- [ ] >50% test coverage overall
- [ ] >80% coverage on critical services
- [ ] All user journeys have E2E tests

### Phase 5 Complete When:
- [ ] Feature-based directory structure
- [ ] Clear component ownership
- [ ] Import aliases working

### Phase 6 Complete When:
- [ ] UserContext removed
- [ ] State management documented
- [ ] No duplicate state sources

### Phase 7 Complete When:
- [ ] <30 essential documentation files
- [ ] All docs up-to-date
- [ ] Auto-generation working

---

## Risk Mitigation

### Risk: Breaking Changes During Migration

**Mitigation**:
- Feature branches for each phase
- Comprehensive E2E tests before merge
- Gradual rollout with feature flags if needed

### Risk: Type Errors Overwhelm Team

**Mitigation**:
- Enable strict mode incrementally (noImplicitAny first)
- Use `// @ts-expect-error` temporarily with TODO comments
- Track progress with `pnpm typecheck 2>&1 | wc -l`

### Risk: Test Coverage Slows Development

**Mitigation**:
- Focus on critical paths first
- Use test templates/generators
- Integrate tests into PR requirements gradually

### Risk: Component Reorganization Breaks Imports

**Mitigation**:
- Use IDE refactoring tools (VS Code "Move Symbol")
- Create import aliases before moving
- Keep backwards-compatible re-exports temporarily

---

## Resources Required

### Tools
- TypeScript 5.3+
- Vitest for testing
- React Testing Library
- VS Code with TypeScript extensions

### Time Investment
- **Total**: ~10 weeks of focused effort
- **Can be parallelized**: Yes, phases 1-3 can overlap

### Team Coordination
- Code review required for each phase completion
- Daily standup on refactor progress
- Weekly refactor retrospective

---

## Post-Refactor Maintenance

### Continuous Quality Gates

Add to CI/CD pipeline:
```yaml
# .github/workflows/quality.yml
- name: TypeScript Strict
  run: pnpm typecheck

- name: Test Coverage
  run: pnpm test --coverage

- name: Coverage Threshold
  run: |
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 50" | bc -l) )); then
      echo "Coverage below 50%: $COVERAGE%"
      exit 1
    fi
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
pnpm typecheck
pnpm lint
pnpm test --changed
```

### Documentation Automation

```bash
# Run on every PR merge
pnpm docs:generate
git add docs/
git commit -m "docs: auto-update documentation"
```

---

## Appendix: Quick Reference

### Common Type Patterns

```typescript
// Nullable return
function findUser(id: string): User | null

// Result type for operations that can fail
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Pagination cursor
interface PaginationCursor {
  createdAt: Date;
  id: string;
}

// API response wrapper
interface ApiResponse<T> {
  data: T;
  meta?: {
    cursor?: string;
    hasMore?: boolean;
  };
}
```

### Testing Patterns

```typescript
// Factory for test data
const createTestUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  ...overrides,
});

// Mock repository
const createMockUserRepository = (): jest.Mocked<UserRepository> => ({
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});
```

### Import Aliases

```typescript
// Instead of:
import { Button } from '../../../components/ui/Button';

// Use:
import { Button } from '@shared/components/ui';
```

---

## Appendix B: Modern Tooling & Cutting-Edge Patterns

### B.1 AI-Assisted Development

**GitHub Copilot / Claude Integration**
- Use AI for boilerplate generation (tests, types, repositories)
- AI-assisted code review for type safety issues
- Auto-generate JSDoc comments during TSX migration

**Recommended MCP Tools**:
```bash
# Add to Claude Code for enhanced refactoring
- Context7 MCP: Real-time documentation lookup
- Sequential thinking MCP: Complex refactor planning
```

### B.2 Modern TypeScript Patterns (2025+)

**Branded Types for Type Safety**:
```typescript
// Prevent mixing IDs across domains
declare const UserIdBrand: unique symbol;
declare const WorkoutIdBrand: unique symbol;

type UserId = string & { [UserIdBrand]: never };
type WorkoutId = string & { [WorkoutIdBrand]: never };

// Now these can't be accidentally swapped
function getWorkout(id: WorkoutId): Promise<Workout>
function getUser(id: UserId): Promise<User>
```

**`satisfies` Operator** (TypeScript 4.9+):
```typescript
// Ensure object matches type while preserving literal types
const config = {
  apiUrl: 'https://musclemap.me/api',
  timeout: 5000,
} satisfies Config;
// Type: { apiUrl: "https://musclemap.me/api", timeout: 5000 }
// Not: { apiUrl: string, timeout: number }
```

**`const` Type Parameters** (TypeScript 5.0+):
```typescript
function createRoute<const T extends readonly string[]>(paths: T) {
  // T is inferred as readonly tuple, not string[]
}

createRoute(['/users', '/workouts']); // Type: readonly ["/users", "/workouts"]
```

**Decorator Metadata** (TypeScript 5.2+):
```typescript
// Built-in decorator metadata for DI
@Injectable()
class WorkoutService {
  constructor(
    private repo: WorkoutRepository,
    private cache: CacheService,
  ) {}
}
```

### B.3 Effect-TS / Functional Error Handling

**Consider Effect-TS** for complex services:
```typescript
import { Effect, pipe } from 'effect';

// Type-safe error handling with Effect
const transferCredits = (from: UserId, to: UserId, amount: number) =>
  pipe(
    Effect.Do,
    Effect.bind('fromUser', () => UserService.getById(from)),
    Effect.bind('toUser', () => UserService.getById(to)),
    Effect.filterOrFail(
      ({ fromUser }) => fromUser.balance >= amount,
      () => new InsufficientBalanceError(from, amount)
    ),
    Effect.flatMap(({ fromUser, toUser }) =>
      CreditService.transfer(fromUser, toUser, amount)
    ),
    Effect.tapError((error) => Logger.error('Transfer failed', error)),
  );

// Errors are tracked in the type system!
// Effect<TransferResult, InsufficientBalanceError | UserNotFoundError, Dependencies>
```

### B.4 Drizzle ORM (Modern Alternative)

**Consider migrating to Drizzle** for type-safe queries:
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Schema as code
export const workouts = pgTable('workouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: text('name'),
  completedAt: timestamp('completed_at'),
});

// Type-safe queries
const userWorkouts = await db
  .select()
  .from(workouts)
  .where(eq(workouts.userId, userId))
  .orderBy(desc(workouts.completedAt));
// Type: { id: string; userId: string; name: string | null; completedAt: Date | null }[]
```

**Benefits**:
- Schema-driven types (no manual type definitions)
- SQL-like syntax (familiar to team)
- Excellent performance (minimal overhead)
- Built-in migrations

### B.5 Vite 5+ Features

**Module Federation** for micro-frontends:
```typescript
// vite.config.ts
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    federation({
      name: 'musclemap-shell',
      remotes: {
        workoutModule: 'https://cdn.musclemap.me/workout/remoteEntry.js',
        socialModule: 'https://cdn.musclemap.me/social/remoteEntry.js',
      },
    }),
  ],
});
```

**Lightning CSS** (faster than PostCSS):
```typescript
// vite.config.ts
export default defineConfig({
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: browserslistToTargets(browserslist('>= 0.25%')),
    },
  },
});
```

### B.6 React Server Components (Future-Proofing)

**Prepare for RSC** by separating:
```typescript
// Components that can become server components
// (no hooks, no browser APIs, no event handlers)
export function WorkoutSummary({ workout }: { workout: Workout }) {
  return (
    <div>
      <h2>{workout.name}</h2>
      <p>{workout.exerciseCount} exercises</p>
    </div>
  );
}

// Components that must remain client components
'use client';
export function WorkoutTimer({ duration }: { duration: number }) {
  const [time, setTime] = useState(duration);
  // ... timer logic
}
```

### B.7 Biome (Modern Linter/Formatter)

**Replace ESLint + Prettier with Biome**:
```bash
pnpm add -D @biomejs/biome
```

```json
// biome.json
{
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      },
      "suspicious": {
        "noExplicitAny": "error"
      }
    }
  }
}
```

**Benefits**:
- 10-100x faster than ESLint
- Single tool (linting + formatting)
- Better TypeScript support
- Built-in import sorting

### B.8 Vitest 2.0 Features

**Browser Mode Testing**:
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
    },
  },
});
```

**Snapshot Inline**:
```typescript
import { expect, test } from 'vitest';

test('workout card renders correctly', () => {
  const { container } = render(<WorkoutCard workout={mockWorkout} />);
  expect(container).toMatchInlineSnapshot(`
    <div>
      <h2>Push Day</h2>
      <p>5 exercises</p>
    </div>
  `);
});
```

### B.9 TanStack Query v5 (Consider for REST)

If moving away from GraphQL for some endpoints:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Type-safe queries
const { data: workouts } = useQuery({
  queryKey: ['workouts', userId],
  queryFn: () => api.getWorkouts(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Optimistic updates
const mutation = useMutation({
  mutationFn: api.createWorkout,
  onMutate: async (newWorkout) => {
    await queryClient.cancelQueries({ queryKey: ['workouts', userId] });
    const previous = queryClient.getQueryData(['workouts', userId]);
    queryClient.setQueryData(['workouts', userId], (old) => [...old, newWorkout]);
    return { previous };
  },
  onError: (err, newWorkout, context) => {
    queryClient.setQueryData(['workouts', userId], context.previous);
  },
});
```

### B.10 Edge Computing Preparation

**Prepare for edge deployment** (Cloudflare Workers, Vercel Edge):
```typescript
// Separate edge-compatible code
// apps/api/src/edge/

// Edge-compatible handlers (no Node.js APIs)
export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // Fast path for static data
  if (url.pathname === '/api/exercises') {
    return new Response(JSON.stringify(CACHED_EXERCISES), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Delegate to origin for dynamic data
  return fetch(request);
}
```

### B.11 Observability Stack

**OpenTelemetry Integration**:
```typescript
import { trace, context } from '@opentelemetry/api';

const tracer = trace.getTracer('musclemap-api');

async function handleWorkoutCreate(request: FastifyRequest) {
  const span = tracer.startSpan('workout.create');

  try {
    const result = await workoutService.create(request.body);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}
```

**Structured Logging with Pino**:
```typescript
// Already using Pino - enhance with correlation IDs
fastify.addHook('onRequest', (request, reply, done) => {
  request.log = request.log.child({
    requestId: request.id,
    userId: request.user?.id,
    path: request.url,
  });
  done();
});
```

### B.12 Database: Modern PostgreSQL Features

**Use JSON Path Queries** (PostgreSQL 12+):
```sql
-- Instead of: JSON.parse + filter in code
SELECT * FROM workouts
WHERE exercises @? '$[*] ? (@.muscleGroup == "chest")';
```

**Generated Columns** for derived data:
```sql
ALTER TABLE workouts
ADD COLUMN total_volume INT GENERATED ALWAYS AS (
  (SELECT SUM((s->>'weight')::int * (s->>'reps')::int)
   FROM jsonb_array_elements(exercises) e,
        jsonb_array_elements(e->'sets') s)
) STORED;
```

**Row-Level Security** for multi-tenancy:
```sql
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY workout_isolation ON workouts
  USING (user_id = current_setting('app.current_user_id')::uuid);
```

---

## Appendix C: Refactor Automation Scripts

### C.1 TypeScript Migration Script

```bash
#!/bin/bash
# scripts/migrate-to-tsx.sh

# Convert JSX to TSX with basic type annotations
for file in $(find src -name "*.jsx"); do
  newfile="${file%.jsx}.tsx"
  mv "$file" "$newfile"

  # Add React import if missing
  if ! grep -q "import React" "$newfile"; then
    sed -i '' '1i\
import React from "react";
' "$newfile"
  fi

  echo "Converted: $file -> $newfile"
done

# Run typecheck to identify issues
pnpm typecheck 2>&1 | tee tsx-migration-errors.log
echo "Migration complete. Check tsx-migration-errors.log for type errors."
```

### C.2 Any Type Hunter

```bash
#!/bin/bash
# scripts/find-any-types.sh

echo "=== Files with explicit 'any' type ==="
rg ": any" --type ts -c | sort -t: -k2 -nr | head -20

echo ""
echo "=== Files with implicit 'any' (would fail strict) ==="
pnpm tsc --noEmit --noImplicitAny 2>&1 | grep "error TS7" | \
  sed 's/.*src/src/' | cut -d: -f1 | sort | uniq -c | sort -nr | head -20

echo ""
echo "=== Total any usage ==="
rg ": any" --type ts | wc -l
```

### C.3 JSONB Parse Finder

```bash
#!/bin/bash
# scripts/find-jsonb-parse.sh

echo "=== JSON.parse on potentially JSONB columns ==="
rg "JSON\.parse\(.*\.(exercises|settings|preferences|data|config|metadata)" \
  --type ts -A 2 -B 2

echo ""
echo "=== All JSON.parse in routes ==="
rg "JSON\.parse" apps/api/src/http/routes --type ts -l
```

### C.4 Test Coverage Report

```bash
#!/bin/bash
# scripts/coverage-report.sh

pnpm test --coverage --reporter=json > coverage.json

echo "=== Coverage by Directory ==="
cat coverage.json | jq -r '
  .coverageMap | to_entries | map({
    dir: (.key | split("/")[0:4] | join("/")),
    lines: .value.s | to_entries | length,
    covered: .value.s | to_entries | map(select(.value > 0)) | length
  }) | group_by(.dir) | map({
    directory: .[0].dir,
    total_lines: (map(.lines) | add),
    covered_lines: (map(.covered) | add)
  }) | map(. + {coverage: ((.covered_lines / .total_lines * 100) | floor)})
  | sort_by(.coverage) | .[]
  | "\(.coverage)%\t\(.directory)"
'
```

---

*This plan will be updated as phases complete. Last updated: January 2026*
