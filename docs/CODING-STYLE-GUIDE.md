# MuscleMap Coding Style Guide

> **Version:** 1.0.0 | **Last Updated:** January 2026
> **Scope:** All MuscleMap applications, packages, and contributions
> **Philosophy:** Simplicity, Performance, Security, Maintainability

This guide synthesizes patterns from:
- Google, Microsoft, Meta engineering standards
- OWASP API Security Top 10
- TypeScript/React/Node.js 2025 best practices
- PostgreSQL optimization guidelines
- Our own proven codebase patterns

---

## Table of Contents

**⚠️ [CLAUDE AGENT: MANDATORY PRE-DEPLOYMENT CHECKLIST](#claude-agent-mandatory-pre-deployment-checklist)** ← Run this after EVERY code change!

1. [Core Principles](#1-core-principles)
2. [TypeScript Standards](#2-typescript-standards)
3. [React & Frontend Patterns](#3-react--frontend-patterns)
4. [State Management](#4-state-management)
5. [API & Backend Patterns](#5-api--backend-patterns)
6. [Database Patterns](#6-database-patterns)
7. [Error Handling](#7-error-handling)
8. [Security Standards](#8-security-standards)
9. [Performance Optimization](#9-performance-optimization)
10. [Testing Standards](#10-testing-standards)
11. [Documentation Standards](#11-documentation-standards)
12. [File & Code Organization](#12-file--code-organization)
13. [Git & Deployment](#13-git--deployment)
14. [Anti-Patterns to Avoid](#14-anti-patterns-to-avoid)

---

## 1. Core Principles

### 1.1 The Golden Rules

| Principle | Description |
|-----------|-------------|
| **Optimize for Reading** | Code is read 10x more than written. Prioritize clarity over cleverness |
| **Fail Fast** | Detect errors early. Validate at boundaries. Throw on invalid state |
| **Single Responsibility** | Functions do one thing. Classes have one reason to change |
| **Explicit Over Implicit** | Make dependencies, types, and behavior visible |
| **Secure by Default** | Never trust input. Parameterize queries. Validate everything |
| **Performance-Conscious** | Consider scale from day one. Measure before optimizing |

### 1.2 Decision Hierarchy

When patterns conflict, prioritize in this order:
1. **Security** - Never compromise on security
2. **Correctness** - Code must work correctly
3. **Readability** - Others must understand it
4. **Performance** - Then optimize
5. **Brevity** - Concise is good, but not at cost of clarity

### 1.3 Consistency Hierarchy

Follow Google's consistency principle:
1. File-level consistency first
2. Module/feature consistency second
3. Package/project consistency third
4. Codebase-wide patterns fourth

---

## CLAUDE AGENT: MANDATORY PRE-DEPLOYMENT CHECKLIST

> **⚠️ CRITICAL: This checklist is MANDATORY for all Claude agents working on this codebase.**
>
> After EVERY code change, idea implementation, or chunk of work, Claude MUST systematically work through this checklist before considering the task complete. This is not optional - it is a reflexive quality gate.

### When to Run This Checklist

Run this checklist:
- After implementing ANY feature or fix
- After modifying ANY existing code
- After adding ANY new file
- Before committing ANY changes
- Before deploying ANY changes
- When you think you're "done" with a task

### The Checklist (Execute In Order)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: CODE CORRECTNESS (Run immediately after writing code)             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ ] 1.1 RE-READ ALL MODIFIED CODE                                          │
│      • Open each file you changed and read it line by line                  │
│      • Look for typos, copy-paste errors, missing characters                │
│      • Verify variable names match their intended purpose                   │
│      • Check that all brackets, parentheses, quotes are balanced            │
│                                                                             │
│  [ ] 1.2 VERIFY LOGIC CORRECTNESS                                           │
│      • Trace through the code mentally with sample inputs                   │
│      • Check boundary conditions (empty arrays, null values, zero, max)     │
│      • Verify loop termination conditions                                   │
│      • Check off-by-one errors in indexes and ranges                        │
│      • Verify conditional logic (&&, ||, !) is correct                      │
│                                                                             │
│  [ ] 1.3 CHECK ALGORITHM CORRECTNESS                                        │
│      • Does the algorithm solve the actual problem?                         │
│      • Are there edge cases not handled?                                    │
│      • Is the time complexity acceptable? (O(n²) in a hot path = bad)       │
│      • Is the space complexity acceptable?                                  │
│      • Could this cause infinite loops or stack overflow?                   │
│                                                                             │
│  [ ] 1.4 VERIFY IMPORTS AND DEPENDENCIES                                    │
│      • All imports are used (no unused imports)                             │
│      • All used symbols are imported                                        │
│      • Import paths are correct (no typos)                                  │
│      • No circular dependencies introduced                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: TYPE SAFETY (After Phase 1)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ ] 2.1 RUN TYPE CHECKER                                                   │
│      Execute: pnpm typecheck                                                │
│      • Fix ALL type errors before proceeding                                │
│      • Do not use `any` to silence errors                                   │
│      • Do not use @ts-ignore without explicit justification                 │
│                                                                             │
│  [ ] 2.2 VERIFY TYPE ANNOTATIONS                                            │
│      • All function parameters have explicit types                          │
│      • All function return types are explicit (especially public APIs)      │
│      • Generic types are properly constrained                               │
│      • Union types handle all variants                                      │
│                                                                             │
│  [ ] 2.3 CHECK FOR TYPE ASSERTION ABUSE                                     │
│      • Search for `as ` in your changes                                     │
│      • Each assertion must have validation before it                        │
│      • Prefer type guards over assertions                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: SECURITY VERIFICATION (After Phase 2)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ ] 3.1 INPUT VALIDATION                                                   │
│      • ALL user input is validated with Zod schemas                         │
│      • Validation happens at the boundary (route handler)                   │
│      • Bounds are set on all numeric fields (min/max)                       │
│      • String lengths have maximums                                         │
│      • Array sizes have limits                                              │
│                                                                             │
│  [ ] 3.2 SQL INJECTION PREVENTION                                           │
│      • Search for template literals containing SQL                          │
│      • ALL queries use parameterized arguments ($1, $2, etc.)               │
│      • NO string interpolation in queries                                   │
│      • Table/column names are NOT from user input                           │
│                                                                             │
│  [ ] 3.3 AUTHORIZATION CHECKS                                               │
│      • Protected routes have `authenticate` middleware                      │
│      • Resource access verifies ownership/permissions                       │
│      • Role checks use proper middleware                                    │
│      • No authorization bypass possible                                     │
│                                                                             │
│  [ ] 3.4 SENSITIVE DATA HANDLING                                            │
│      • Passwords are hashed (never stored plain)                            │
│      • Tokens are not logged                                                │
│      • PII is not exposed in error messages                                 │
│      • Secrets are not in code (use environment variables)                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: PERFORMANCE VERIFICATION (After Phase 3)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ ] 4.1 DATABASE QUERY EFFICIENCY                                          │
│      • No N+1 queries (queries in loops)                                    │
│      • Uses keyset pagination (NOT OFFSET)                                  │
│      • SELECT lists specific columns (NOT SELECT *)                         │
│      • JOINs are indexed appropriately                                      │
│      • Large result sets are paginated                                      │
│                                                                             │
│  [ ] 4.2 FRONTEND PERFORMANCE                                               │
│      • New routes are lazy loaded                                           │
│      • Heavy components use React.memo                                      │
│      • Expensive calculations use useMemo                                   │
│      • Callbacks passed to children use useCallback                         │
│      • Zustand uses selectors (not entire store subscription)               │
│                                                                             │
│  [ ] 4.3 MEMORY AND RESOURCES                                               │
│      • Event listeners are cleaned up in useEffect return                   │
│      • Subscriptions are unsubscribed on unmount                            │
│      • Large objects are not kept in closure unnecessarily                  │
│      • AbortController used for cancellable fetch requests                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: CODE QUALITY (After Phase 4)                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ ] 5.1 RUN LINTER                                                         │
│      Execute: pnpm lint                                                     │
│      • Fix ALL linting errors                                               │
│      • Review and address warnings                                          │
│                                                                             │
│  [ ] 5.2 CODE CLEANLINESS                                                   │
│      • No console.log statements left in (use proper logger)                │
│      • No debugger statements                                               │
│      • No commented-out code blocks                                         │
│      • No TODO comments for things done in this change                      │
│      • No dead code (unreachable or unused)                                 │
│                                                                             │
│  [ ] 5.3 NAMING AND READABILITY                                             │
│      • Variable names are descriptive and accurate                          │
│      • Function names describe what they do (verb-first)                    │
│      • No single-letter variables except loop counters                      │
│      • Complex logic has explanatory comments                               │
│                                                                             │
│  [ ] 5.4 ERROR HANDLING                                                     │
│      • All async operations have try/catch or .catch()                      │
│      • Errors are not swallowed silently                                    │
│      • Error messages are helpful and actionable                            │
│      • Failed operations don't leave state corrupted                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 6: TESTING (After Phase 5)                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ ] 6.1 RUN TEST SUITE                                                     │
│      Execute: pnpm test                                                     │
│      • ALL tests must pass                                                  │
│      • No skipped tests unless explicitly documented                        │
│                                                                             │
│  [ ] 6.2 TEST COVERAGE CHECK                                                │
│      • New code has corresponding tests                                     │
│      • Edge cases are tested                                                │
│      • Error paths are tested                                               │
│      • Critical paths have high coverage                                    │
│                                                                             │
│  [ ] 6.3 INTEGRATION VERIFICATION                                           │
│      • Changes work with existing code                                      │
│      • API contracts are maintained                                         │
│      • Database migrations are tested                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 7: BUILD VERIFICATION (After Phase 6)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ ] 7.1 BUILD SUCCESS                                                      │
│      Execute: pnpm build:all                                                │
│      • Build completes without errors                                       │
│      • Build completes without warnings (or warnings are understood)        │
│                                                                             │
│  [ ] 7.2 DEPENDENCY CHECK                                                   │
│      • No new vulnerabilities introduced (pnpm audit)                       │
│      • Dependencies are in correct package.json (not root for backend)      │
│      • No duplicate dependencies                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 8: DOCUMENTATION (After Phase 7)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ ] 8.1 UPDATE DOCUMENTATION                                               │
│      • README updated if public API changed                                 │
│      • JSDoc added for new public functions                                 │
│      • CHANGELOG updated for user-facing changes                            │
│      • Architecture docs updated if structure changed                       │
│                                                                             │
│  [ ] 8.2 UPDATE PROJECT FILES                                               │
│      • ROADMAP.md updated if features completed                             │
│      • Implementation plans marked complete                                 │
│      • E2E test script updated for new endpoints                            │
│      Execute: pnpm docs:generate                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 9: DEPLOYMENT (After Phase 8)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ ] 9.1 PRE-DEPLOYMENT                                                     │
│      • All previous phases completed successfully                           │
│      • Changes committed with descriptive message                           │
│      • Branch merged to main (if using branches)                            │
│                                                                             │
│  [ ] 9.2 DEPLOY                                                             │
│      Execute: ./deploy.sh "description of changes"                          │
│      • Deploy script completes without errors                               │
│                                                                             │
│  [ ] 9.3 POST-DEPLOYMENT VERIFICATION                                       │
│      Execute: curl https://musclemap.me/health                              │
│      • Health check returns OK                                              │
│      • Test affected endpoints manually                                     │
│      • Verify changes are visible on live site                              │
│      • Monitor for errors for 5-10 minutes                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Quick Commands Reference

```bash
# Phase 2: Type Safety
pnpm typecheck

# Phase 5: Code Quality
pnpm lint

# Phase 6: Testing
pnpm test
pnpm test:e2e:api

# Phase 7: Build
pnpm build:all

# Phase 8: Documentation
pnpm docs:generate

# Phase 9: Deployment
./deploy.sh "description"
curl https://musclemap.me/health
```

### Checklist Failure Protocol

If ANY phase fails:

1. **STOP** - Do not proceed to next phase
2. **FIX** - Address the issue completely
3. **RE-RUN** - Run the failed phase again from the beginning
4. **CONTINUE** - Only after the phase passes completely

### Self-Verification Questions

Before marking a task complete, ask yourself:

1. "If I were reviewing this code, would I approve it?"
2. "Could this code cause a production incident?"
3. "Have I actually tested this, or am I assuming it works?"
4. "Is there any scenario I haven't considered?"
5. "Would I be comfortable explaining every line of this code?"

---

## 2. TypeScript Standards

### 2.1 Strict Mode (MANDATORY)

All projects must use strict TypeScript:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 2.2 Type Safety Rules

```typescript
// RULE 1: Never use `any` - use `unknown` for truly unknown types
// ❌ BAD
function process(data: any) { ... }

// ✅ GOOD
function process(data: unknown) {
  if (isValidInput(data)) { ... }
}

// RULE 2: Explicit return types on public APIs
// ❌ BAD - return type inferred, may change accidentally
export function getUser(id: string) {
  return db.users.find(id);
}

// ✅ GOOD - explicit contract
export function getUser(id: string): Promise<User | null> {
  return db.users.find(id);
}

// RULE 3: Use branded types for domain identifiers
// ❌ BAD - strings are interchangeable
function transferCredits(from: string, to: string, amount: number) { ... }

// ✅ GOOD - type-safe identifiers prevent mixing
type UserId = string & { readonly __brand: 'UserId' };
type WorkoutId = string & { readonly __brand: 'WorkoutId' };

function transferCredits(from: UserId, to: UserId, amount: number) { ... }

// RULE 4: Use `as const` for immutable literals
// ❌ BAD - type is string[]
const ROLES = ['user', 'moderator', 'admin'];

// ✅ GOOD - type is readonly ['user', 'moderator', 'admin']
const ROLES = ['user', 'moderator', 'admin'] as const;
type Role = typeof ROLES[number]; // 'user' | 'moderator' | 'admin'

// RULE 5: Prefer interfaces for objects, types for unions/primitives
interface User {
  id: UserId;
  email: string;
  roles: Role[];
}

type Status = 'pending' | 'active' | 'completed';
type Nullable<T> = T | null;
```

### 2.3 Type Assertions

```typescript
// RULE: Avoid type assertions - they bypass type checking
// ❌ BAD - silences compiler, may crash at runtime
const user = data as User;

// ✅ GOOD - validate then narrow
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data
  );
}

if (isUser(data)) {
  // TypeScript knows `data` is User here
}

// EXCEPTION: When you've just validated
const parsed = schema.parse(input); // Zod validates
const user = parsed as User; // Safe after Zod validation
```

### 2.4 Naming Conventions

| Entity | Convention | Example |
|--------|------------|---------|
| Variables | camelCase | `userId`, `isActive` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_URL` |
| Functions | camelCase, verb-first | `getUser`, `calculateTotal` |
| Classes | PascalCase, noun | `UserService`, `WorkoutManager` |
| Interfaces | PascalCase, noun | `User`, `WorkoutConfig` |
| Types | PascalCase | `UserId`, `ApiResponse` |
| Enums | PascalCase | `UserRole`, `WorkoutStatus` |
| Files | kebab-case | `user-service.ts`, `auth-utils.ts` |
| React Components | PascalCase | `UserProfile.tsx`, `WorkoutCard.tsx` |

### 2.5 Import Organization

```typescript
// Order imports in this sequence, separated by blank lines:

// 1. Node built-ins
import { readFile } from 'fs/promises';
import path from 'path';

// 2. External packages (alphabetically)
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

// 3. Internal packages (@musclemap/*)
import { User, UserId } from '@musclemap/core';
import { ApiClient } from '@musclemap/client';

// 4. Relative imports (parent first, then siblings, then children)
import { config } from '../../config';
import { logger } from '../utils/logger';
import { validateUser } from './validation';

// 5. Type-only imports (at the end)
import type { PoolClient } from 'pg';
```

---

## 3. React & Frontend Patterns

### 3.1 Component Structure

```tsx
// Standard component file structure:

// 1. Imports
import { useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks';
import type { User } from '@musclemap/core';

// 2. Types (component-specific)
interface UserCardProps {
  user: User;
  onSelect?: (user: User) => void;
  variant?: 'default' | 'compact';
}

// 3. Constants (component-specific)
const ANIMATION_DURATION = 0.2;

// 4. Component definition
export const UserCard = memo(function UserCard({
  user,
  onSelect,
  variant = 'default',
}: UserCardProps) {
  // 4a. Hooks (in consistent order)
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  // 4b. Derived state (useMemo for expensive calculations)
  const displayName = user.displayName || user.username;

  // 4c. Event handlers (useCallback for referential stability)
  const handleClick = useCallback(() => {
    onSelect?.(user);
  }, [user, onSelect]);

  // 4d. Effects (useEffect)
  // ...

  // 4e. Early returns for loading/error states
  if (!user) return null;

  // 4f. Render
  return (
    <motion.div
      className="glass-surface p-4 rounded-xl"
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: ANIMATION_DURATION }}
    >
      <h3 className="text-lg font-semibold">{displayName}</h3>
      {variant === 'default' && (
        <p className="text-gray-400">{user.email}</p>
      )}
    </motion.div>
  );
});

// 5. Default export (if needed)
export default UserCard;
```

### 3.2 Hooks Best Practices

```typescript
// RULE 1: Custom hooks for reusable logic
// ❌ BAD - duplicated across components
function ComponentA() {
  const [value, setValue] = useState('');
  useEffect(() => {
    localStorage.setItem('key', value);
  }, [value]);
}

// ✅ GOOD - extracted to custom hook
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initial;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

// RULE 2: Use functional updates for state depending on previous value
// ❌ BAD - may use stale state
setCount(count + 1);

// ✅ GOOD - always uses latest state
setCount(prev => prev + 1);

// RULE 3: Cleanup effects properly
useEffect(() => {
  const controller = new AbortController();

  fetchData({ signal: controller.signal });

  return () => controller.abort(); // Cleanup on unmount
}, []);

// RULE 4: Prefer useReducer for complex state
// ❌ BAD - multiple related states
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// ✅ GOOD - single reducer for related state
const [state, dispatch] = useReducer(reducer, {
  items: [],
  loading: false,
  error: null,
});
```

### 3.3 Performance Patterns

```tsx
// RULE 1: Lazy load all routes
// ❌ BAD - eager loading bloats initial bundle
import Dashboard from './pages/Dashboard';

// ✅ GOOD - lazy loading splits the bundle
const Dashboard = lazy(() => import('./pages/Dashboard'));

// RULE 2: Suspense with meaningful fallbacks
<Suspense fallback={<DashboardSkeleton />}>
  <Dashboard />
</Suspense>

// RULE 3: Use React.memo for expensive renders
// Component only re-renders if props change
export const ExpensiveList = memo(function ExpensiveList({ items }) {
  return items.map(item => <ExpensiveItem key={item.id} {...item} />);
});

// RULE 4: useMemo for expensive calculations
const sortedItems = useMemo(
  () => items.sort((a, b) => b.score - a.score),
  [items]
);

// RULE 5: useCallback for callbacks passed to children
const handleSelect = useCallback((id: string) => {
  setSelected(id);
}, []); // Empty deps = stable reference

// RULE 6: Virtualize long lists
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });
  // Only renders visible items
}
```

### 3.4 Accessibility Standards

```tsx
// RULE 1: Semantic HTML
// ❌ BAD
<div onClick={handleClick}>Click me</div>

// ✅ GOOD
<button onClick={handleClick}>Click me</button>

// RULE 2: Proper heading hierarchy
// ❌ BAD - skips h2
<h1>Page Title</h1>
<h3>Section</h3>

// ✅ GOOD - sequential hierarchy
<h1>Page Title</h1>
<h2>Section</h2>

// RULE 3: Touch targets minimum 44x44px
<button className="min-h-[44px] min-w-[44px] p-3">
  <Icon />
</button>

// RULE 4: Respect motion preferences
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

<motion.div
  animate={prefersReducedMotion ? {} : { scale: 1.1 }}
/>

// RULE 5: ARIA labels for non-text content
<button aria-label="Close dialog">
  <XIcon />
</button>

// RULE 6: Focus management on route changes
useEffect(() => {
  document.getElementById('main-content')?.focus();
}, [location]);
```

---

## 4. State Management

### 4.1 State Decision Tree

```
Is the data from the server?
├─ YES → Use Apollo Client (GraphQL)
│        • Handles caching, deduplication, optimistic updates
│        • Never duplicate server state in local stores
│
└─ NO → Does the state change frequently (per-second)?
        ├─ YES → Use Zustand with selectors
        │        • Prevents unnecessary re-renders
        │        • Best for timers, animations, real-time data
        │
        └─ NO → Is the state shared across many components?
                ├─ YES → Use Zustand with selectors
                │
                └─ NO → Does the state rarely change?
                        ├─ YES → Use React Context
                        │        • Theme, locale, auth state
                        │
                        └─ NO → Use local useState
```

### 4.2 Zustand Patterns

```typescript
// RULE 1: ALWAYS use selectors
// ❌ BAD - subscribes to ALL state changes
const { sidebarOpen } = useUIStore();
const state = useUIStore(); // Never do this

// ✅ GOOD - only re-renders when sidebarOpen changes
const sidebarOpen = useUIStore(state => state.sidebarOpen);

// RULE 2: Multiple values with single selector
const { isOpen, modalType } = useUIStore(state => ({
  isOpen: state.modalOpen,
  modalType: state.modalType,
}));

// RULE 3: Store structure - separate state from actions
interface UIStore {
  // State
  sidebarOpen: boolean;
  modalOpen: boolean;
  toasts: Toast[];

  // Actions
  toggleSidebar: () => void;
  openModal: (type: ModalType) => void;
  addToast: (toast: Toast) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  // Initial state
  sidebarOpen: false,
  modalOpen: false,
  toasts: [],

  // Actions
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  openModal: (type) => set({ modalOpen: true, modalType: type }),
  addToast: (toast) => set(state => ({ toasts: [...state.toasts, toast] })),
}));

// RULE 4: Create shorthand hooks for common patterns
export function useToast() {
  const addToast = useUIStore(state => state.addToast);
  const removeToast = useUIStore(state => state.removeToast);

  return {
    toast: (message: string) => addToast({ message, type: 'info' }),
    success: (message: string) => addToast({ message, type: 'success' }),
    error: (message: string) => addToast({ message, type: 'error' }),
    remove: removeToast,
  };
}
```

### 4.3 Apollo Client Patterns

```typescript
// RULE 1: Use Apollo for ALL server state
const { data, loading, error } = useQuery(GET_WORKOUTS);

// RULE 2: Optimistic updates for instant UI feedback
const [createWorkout] = useMutation(CREATE_WORKOUT, {
  optimisticResponse: {
    createWorkout: {
      __typename: 'Workout',
      id: 'temp-id',
      ...input,
    },
  },
  update(cache, { data }) {
    // Update cache immediately
    cache.modify({
      fields: {
        workouts(existing = []) {
          return [...existing, data.createWorkout];
        },
      },
    });
  },
});

// RULE 3: Error handling at query level
const { data, error } = useQuery(GET_USER, {
  onError: (error) => {
    toast.error(error.message);
  },
});

// RULE 4: Loading states with skeletons
if (loading) return <WorkoutsSkeleton />;
if (error) return <ErrorDisplay error={error} />;
return <WorkoutsList workouts={data.workouts} />;
```

---

## 5. API & Backend Patterns

### 5.1 Fastify Route Structure

```typescript
// Standard route file structure:

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from './auth';
import { logger } from '../utils/logger';
import type { User } from '@musclemap/core';

// 1. Schemas (Zod)
const createWorkoutSchema = z.object({
  name: z.string().min(1).max(100),
  exercises: z.array(z.object({
    exerciseId: z.string().uuid(),
    sets: z.number().int().min(1).max(100),
    reps: z.number().int().min(1).max(1000).optional(),
    weight: z.number().min(0).max(10000).optional(),
  })).min(1).max(50),
});

type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

// 2. Route registration
export async function registerWorkoutRoutes(app: FastifyInstance) {
  // GET /workouts - List user's workouts
  app.get('/workouts', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.userId;
    const workouts = await workoutService.getByUser(userId);
    return reply.send({ data: workouts });
  });

  // POST /workouts - Create a workout
  app.post('/workouts', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Validate input
    const result = createWorkoutSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid workout data',
          details: result.error.flatten(),
        },
      });
    }

    const userId = request.user!.userId;
    const workout = await workoutService.create(userId, result.data);

    return reply.status(201).send({ data: workout });
  });
}
```

### 5.2 Service Layer Pattern

```typescript
// Services encapsulate business logic, routes handle HTTP

// ❌ BAD - business logic in route
app.post('/transfer', async (req, reply) => {
  const { from, to, amount } = req.body;

  // All this logic should be in a service
  const fromBalance = await db.query('SELECT balance FROM credits WHERE user_id = $1', [from]);
  if (fromBalance < amount) throw new Error('Insufficient funds');
  await db.query('UPDATE credits SET balance = balance - $1 WHERE user_id = $2', [amount, from]);
  await db.query('UPDATE credits SET balance = balance + $1 WHERE user_id = $2', [amount, to]);
  // ...
});

// ✅ GOOD - thin route, thick service
// Route
app.post('/transfer', async (req, reply) => {
  const input = transferSchema.parse(req.body);
  const result = await creditService.transfer(input);
  return reply.send({ data: result });
});

// Service
export const creditService = {
  async transfer(input: TransferInput): Promise<TransferResult> {
    return db.serializableTransaction(async (client) => {
      // Get balances with row lock
      const fromBalance = await this.getBalanceForUpdate(client, input.from);

      if (fromBalance < input.amount) {
        throw new InsufficientCreditsError(fromBalance, input.amount);
      }

      // Execute transfer atomically
      await this.debit(client, input.from, input.amount, input.idempotencyKey);
      await this.credit(client, input.to, input.amount);

      return { success: true, newBalance: fromBalance - input.amount };
    });
  },
};
```

### 5.3 Response Format Standard

```typescript
// ALL API responses follow this envelope:

interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;        // Machine-readable: 'VALIDATION_ERROR', 'NOT_FOUND'
    message: string;     // Human-readable: 'User not found'
    statusCode: number;  // HTTP status: 400, 404, 500
    details?: unknown;   // Additional context (validation errors, etc.)
  };
  meta?: {
    pagination?: {
      cursor?: string;
      hasMore: boolean;
    };
    timestamp: string;
  };
}

// Success response
return reply.send({
  data: workout,
  meta: { timestamp: new Date().toISOString() },
});

// Error response
return reply.status(404).send({
  error: {
    code: 'NOT_FOUND',
    message: 'Workout not found',
    statusCode: 404,
  },
});

// Paginated response
return reply.send({
  data: workouts,
  meta: {
    pagination: {
      cursor: lastWorkout?.id,
      hasMore: workouts.length === limit,
    },
  },
});
```

### 5.4 Validation Standards

```typescript
// RULE 1: Validate ALL input with Zod schemas
const userSchema = z.object({
  email: z.string().email().max(255),
  username: z.string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),
});

// RULE 2: Set explicit bounds on all fields
const workoutSchema = z.object({
  sets: z.number().int().min(1).max(100),      // Prevent unreasonable values
  reps: z.number().int().min(1).max(1000),
  weight: z.number().min(0).max(10000),        // Max 10,000 kg
  notes: z.string().max(500).optional(),
  exercises: z.array(exerciseSchema).min(1).max(50), // Limit array sizes
});

// RULE 3: Use safeParse for graceful error handling
const result = schema.safeParse(input);
if (!result.success) {
  throw new ValidationError(result.error.flatten());
}
const validated = result.data;

// RULE 4: Validate at service boundaries too
// Even if route validated, service should validate critical operations
export async function transferCredits(input: TransferInput) {
  if (input.amount <= 0) {
    throw new ValidationError('Amount must be positive');
  }
  if (input.from === input.to) {
    throw new ValidationError('Cannot transfer to self');
  }
  // ...
}
```

---

## 6. Database Patterns

### 6.1 Query Patterns

```typescript
// RULE 1: ALWAYS use parameterized queries
// ❌ BAD - SQL injection vulnerability
const user = await query(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ GOOD - parameterized
const user = await query('SELECT * FROM users WHERE email = $1', [email]);

// RULE 2: Select only needed columns
// ❌ BAD - fetches all columns including password_hash
const users = await query('SELECT * FROM users');

// ✅ GOOD - explicit columns
const users = await query(
  'SELECT id, username, email, avatar_url FROM users WHERE active = true'
);

// RULE 3: Use keyset pagination, NEVER offset
// ❌ BAD - O(n) performance, gets slower with page number
const page2 = await query(
  'SELECT * FROM workouts ORDER BY created_at DESC OFFSET 50 LIMIT 50'
);

// ✅ GOOD - O(1) performance at any "page"
const nextPage = await query(
  `SELECT * FROM workouts
   WHERE (created_at, id) < ($1, $2)
   ORDER BY created_at DESC, id DESC
   LIMIT 50`,
  [cursor.createdAt, cursor.id]
);

// RULE 4: Use JOINs instead of N+1 queries
// ❌ BAD - N+1 queries
const workouts = await query('SELECT * FROM workouts WHERE user_id = $1', [userId]);
for (const workout of workouts) {
  workout.exercises = await query('SELECT * FROM workout_exercises WHERE workout_id = $1', [workout.id]);
}

// ✅ GOOD - single query with JOIN
const workouts = await query(`
  SELECT w.*,
         json_agg(we.*) as exercises
  FROM workouts w
  LEFT JOIN workout_exercises we ON we.workout_id = w.id
  WHERE w.user_id = $1
  GROUP BY w.id
`, [userId]);

// RULE 5: Use covering indexes for frequent queries
// Index includes all columns needed for the query
CREATE INDEX idx_users_profile_covering
ON users (id)
INCLUDE (username, avatar_url, display_name);
```

### 6.2 Transaction Patterns

```typescript
// RULE 1: Use SERIALIZABLE for critical operations
export async function transferCredits(from: string, to: string, amount: number) {
  return db.serializableTransaction(async (client) => {
    // Lock rows to prevent concurrent modification
    const fromBalance = await client.query(
      'SELECT balance FROM credit_balances WHERE user_id = $1 FOR UPDATE',
      [from]
    );

    if (fromBalance.rows[0].balance < amount) {
      throw new InsufficientCreditsError();
    }

    // Atomic debit/credit
    await client.query(
      'UPDATE credit_balances SET balance = balance - $1 WHERE user_id = $2',
      [amount, from]
    );
    await client.query(
      'UPDATE credit_balances SET balance = balance + $1 WHERE user_id = $2',
      [amount, to]
    );

    // Record in ledger
    await client.query(
      'INSERT INTO credit_ledger (user_id, amount, type) VALUES ($1, $2, $3)',
      [from, -amount, 'transfer_out']
    );
    await client.query(
      'INSERT INTO credit_ledger (user_id, amount, type) VALUES ($1, $2, $3)',
      [to, amount, 'transfer_in']
    );
  });
}

// RULE 2: Use idempotency keys for critical operations
export async function chargeCredits(
  userId: string,
  amount: number,
  idempotencyKey: string
) {
  try {
    await db.query(
      `INSERT INTO credit_ledger (user_id, amount, idempotency_key)
       VALUES ($1, $2, $3)`,
      [userId, amount, idempotencyKey]
    );
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      // Already processed - return existing result
      return db.query(
        'SELECT * FROM credit_ledger WHERE idempotency_key = $1',
        [idempotencyKey]
      );
    }
    throw error;
  }
}
```

### 6.3 Index Strategy

```sql
-- RULE 1: Index foreign keys
CREATE INDEX idx_workouts_user ON workouts(user_id);

-- RULE 2: Composite index for keyset pagination
CREATE INDEX idx_workouts_keyset
ON workouts(user_id, created_at DESC, id DESC);

-- RULE 3: Covering index for frequent queries
CREATE INDEX idx_users_profile
ON users(id)
INCLUDE (username, avatar_url, total_xp);

-- RULE 4: Partial index for filtered queries
CREATE INDEX idx_workouts_active
ON workouts(user_id, created_at DESC)
WHERE status = 'completed';

-- RULE 5: BRIN index for time-series data
CREATE INDEX idx_activity_events_time
ON activity_events USING BRIN(created_at);

-- RULE 6: GIN index for JSONB queries
CREATE INDEX idx_users_roles
ON users USING GIN(roles);

-- Index naming convention:
-- idx_{table}_{columns}         - General
-- idx_{table}_keyset            - Keyset pagination
-- idx_{table}_{col}_covering    - Covering index
-- idx_{table}_{col}_partial     - Partial index
```

---

## 7. Error Handling

### 7.1 Error Hierarchy

```typescript
// Base application error
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(details: unknown) {
    super('Validation failed', 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(available: number, required: number) {
    super(
      `Insufficient credits: ${available} available, ${required} required`,
      'INSUFFICIENT_CREDITS',
      402,
      { available, required }
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('Rate limit exceeded', 'RATE_LIMITED', 429, { retryAfter });
  }
}
```

### 7.2 Error Handling Patterns

```typescript
// RULE 1: Fail fast - validate early
async function createWorkout(input: unknown) {
  // Validate first
  const validated = workoutSchema.parse(input); // Throws ValidationError

  // Then proceed with validated data
  return db.query('INSERT INTO workouts...', [validated.name]);
}

// RULE 2: Use Result pattern for expected failures
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function findUser(id: string): Promise<Result<User, NotFoundError>> {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  if (!user) {
    return { success: false, error: new NotFoundError('User') };
  }
  return { success: true, data: user };
}

// Usage - forces caller to handle both cases
const result = await findUser(id);
if (!result.success) {
  return reply.status(404).send({ error: result.error });
}
const user = result.data;

// RULE 3: Central error handler
export function errorHandler(error: Error, request: FastifyRequest, reply: FastifyReply) {
  // Log error with request context
  logger.error({
    error: error.message,
    stack: error.stack,
    requestId: request.id,
    path: request.url,
    method: request.method,
  });

  // Handle known errors
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        ...(error.details && { details: error.details }),
      },
    });
  }

  // Handle unknown errors (hide details in production)
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
      statusCode: 500,
    },
  });
}

// RULE 4: Never swallow errors
// ❌ BAD
try {
  await riskyOperation();
} catch (e) {
  // Swallowed - no one knows it failed
}

// ✅ GOOD
try {
  await riskyOperation();
} catch (e) {
  logger.error('Operation failed', { error: e });
  throw e; // Re-throw or handle appropriately
}
```

### 7.3 Frontend Error Handling

```tsx
// RULE 1: ErrorBoundary for React errors
<ErrorBoundary
  fallback={<ErrorDisplay />}
  onError={(error, info) => {
    logger.error('React error', { error, componentStack: info.componentStack });
  }}
>
  <App />
</ErrorBoundary>

// RULE 2: Query error handling
const { data, error } = useQuery(GET_WORKOUTS, {
  onError: (error) => {
    if (error.message.includes('unauthorized')) {
      // Redirect to login
      router.push('/login');
    } else {
      toast.error('Failed to load workouts');
    }
  },
});

// RULE 3: Mutation error handling with rollback
const [updateProfile] = useMutation(UPDATE_PROFILE, {
  optimisticResponse: newData,
  onError: (error, _, context) => {
    // Rollback optimistic update
    cache.writeQuery({
      query: GET_PROFILE,
      data: context.previousData,
    });
    toast.error('Update failed');
  },
});

// RULE 4: Form error handling
async function handleSubmit(data: FormData) {
  try {
    await createWorkout(data);
    toast.success('Workout created');
  } catch (error) {
    if (error instanceof ValidationError) {
      // Show field-specific errors
      setErrors(error.details);
    } else {
      toast.error('Failed to create workout');
    }
  }
}
```

---

## 8. Security Standards

### 8.1 Authentication

```typescript
// RULE 1: Strong password hashing
import crypto from 'crypto';

const ITERATIONS = 100_000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  const testHash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(testHash));
}

// RULE 2: JWT with proper claims
const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    roles: user.roles,
    iat: Math.floor(Date.now() / 1000),
  },
  config.JWT_SECRET,
  { expiresIn: '7d' }
);

// RULE 3: Validate token on every request
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing token');
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, config.JWT_SECRET) as TokenPayload;

    // Check if token is revoked
    if (await isTokenRevoked(payload.jti)) {
      throw new UnauthorizedError('Token revoked');
    }

    request.user = payload;
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
}
```

### 8.2 Authorization

```typescript
// RULE 1: Check permissions on every operation
export async function getWorkout(userId: string, workoutId: string): Promise<Workout> {
  const workout = await db.query(
    'SELECT * FROM workouts WHERE id = $1',
    [workoutId]
  );

  if (!workout) {
    throw new NotFoundError('Workout');
  }

  // Verify ownership
  if (workout.user_id !== userId) {
    throw new ForbiddenError('Not your workout');
  }

  return workout;
}

// RULE 2: Role-based middleware
export function requireRole(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);

    const userRoles = request.user!.roles || [];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenError('Insufficient permissions');
    }
  };
}

// Usage
app.delete('/admin/users/:id', {
  preHandler: [requireRole('admin')],
}, deleteUserHandler);

// RULE 3: Resource-level permissions
function canModifyWorkout(user: User, workout: Workout): boolean {
  // Owner can always modify
  if (workout.userId === user.id) return true;

  // Admins can modify any
  if (user.roles.includes('admin')) return true;

  // Coaches can modify their students' workouts
  if (user.roles.includes('coach') && user.students.includes(workout.userId)) return true;

  return false;
}
```

### 8.3 Input Security

```typescript
// RULE 1: Validate ALL input
const userInputSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().max(255).toLowerCase(),
  bio: z.string().max(1000).optional(),
});

// RULE 2: Sanitize HTML content
import DOMPurify from 'dompurify';

function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href'],
  });
}

// RULE 3: Prevent NoSQL injection in queries
// Even with parameterized SQL, validate expected types
function getUserById(id: string): Promise<User> {
  // Validate UUID format
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid user ID format');
  }
  return db.query('SELECT * FROM users WHERE id = $1', [id]);
}

// RULE 4: Rate limit sensitive endpoints
app.post('/auth/login', {
  preHandler: [rateLimit({ limit: 10, windowSeconds: 60 })],
}, loginHandler);

app.post('/credits/transfer', {
  preHandler: [authenticate, rateLimit({ limit: 5, windowSeconds: 60 })],
}, transferHandler);
```

### 8.4 Security Headers

```typescript
// Configure in Fastify
app.addHook('onSend', async (request, reply) => {
  // Prevent clickjacking
  reply.header('X-Frame-Options', 'DENY');

  // Prevent MIME sniffing
  reply.header('X-Content-Type-Options', 'nosniff');

  // XSS protection
  reply.header('X-XSS-Protection', '1; mode=block');

  // HTTPS enforcement
  reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Content Security Policy
  reply.header('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' wss:",
    "frame-ancestors 'none'",
  ].join('; '));

  // Referrer policy
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});
```

---

## 9. Performance Optimization

### 9.1 Frontend Performance

```typescript
// RULE 1: Code split all routes
const routes = [
  { path: '/dashboard', component: lazy(() => import('./pages/Dashboard')) },
  { path: '/workouts', component: lazy(() => import('./pages/Workouts')) },
  { path: '/profile', component: lazy(() => import('./pages/Profile')) },
];

// RULE 2: Preload anticipated routes
function NavLink({ to, children }) {
  const prefetch = useCallback(() => {
    // Preload on hover/focus
    const route = routes.find(r => r.path === to);
    route?.component.preload?.();
  }, [to]);

  return (
    <Link to={to} onMouseEnter={prefetch} onFocus={prefetch}>
      {children}
    </Link>
  );
}

// RULE 3: Debounce search inputs
function SearchInput() {
  const [value, setValue] = useState('');
  const debouncedValue = useDebounce(value, 300);

  useEffect(() => {
    if (debouncedValue) {
      search(debouncedValue);
    }
  }, [debouncedValue]);
}

// RULE 4: Virtualize long lists
import { useVirtualizer } from '@tanstack/react-virtual';

function WorkoutList({ workouts }) {
  const virtualizer = useVirtualizer({
    count: workouts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(item => (
          <WorkoutCard key={item.key} workout={workouts[item.index]} />
        ))}
      </div>
    </div>
  );
}

// RULE 5: Optimize images
function Avatar({ src, size = 48 }) {
  return (
    <img
      src={src}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      srcSet={`${src}?w=${size} 1x, ${src}?w=${size * 2} 2x`}
    />
  );
}
```

### 9.2 Backend Performance

```typescript
// RULE 1: Connection pooling
const pool = new Pool({
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 10000,
});

// RULE 2: Request batching with DataLoader
const userLoader = new DataLoader<string, User>(async (ids) => {
  const users = await db.query(
    'SELECT * FROM users WHERE id = ANY($1)',
    [ids]
  );
  // Return in same order as requested
  return ids.map(id => users.find(u => u.id === id));
});

// RULE 3: Cache expensive operations
const LEADERBOARD_CACHE_TTL = 300; // 5 minutes

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  // Check cache first
  const cached = await redis.get('leaderboard:global');
  if (cached) return JSON.parse(cached);

  // Calculate and cache
  const leaderboard = await db.query('SELECT * FROM mv_xp_rankings LIMIT 100');
  await redis.setex('leaderboard:global', LEADERBOARD_CACHE_TTL, JSON.stringify(leaderboard));

  return leaderboard;
}

// RULE 4: Use materialized views for aggregations
CREATE MATERIALIZED VIEW mv_user_stats AS
SELECT
  user_id,
  COUNT(*) as workout_count,
  SUM(total_volume) as total_volume,
  MAX(created_at) as last_workout
FROM workouts
GROUP BY user_id;

CREATE UNIQUE INDEX idx_mv_user_stats_user ON mv_user_stats(user_id);

// Refresh periodically (not on every request)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_stats;
```

### 9.3 Database Performance

```sql
-- RULE 1: EXPLAIN ANALYZE all critical queries
EXPLAIN ANALYZE
SELECT w.*, u.username
FROM workouts w
JOIN users u ON u.id = w.user_id
WHERE w.user_id = 'abc123'
ORDER BY w.created_at DESC
LIMIT 20;

-- Look for: Sequential Scans on large tables (bad)
-- Want: Index Scan or Index Only Scan (good)

-- RULE 2: Monitor slow queries
-- Enable in postgresql.conf:
-- log_min_duration_statement = 100  -- Log queries > 100ms

-- RULE 3: Tune PostgreSQL for your workload
-- OLTP (many small transactions):
shared_buffers = '256MB'
effective_cache_size = '768MB'
random_page_cost = 1.1

-- RULE 4: Vacuum regularly
-- Auto-vacuum should handle this, but monitor
SELECT schemaname, relname, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000;
```

---

## 10. Testing Standards

### 10.1 Test Organization

```
tests/
├── unit/                  # Fast, isolated tests
│   ├── services/          # Service function tests
│   ├── utils/             # Utility function tests
│   └── components/        # React component tests
├── integration/           # Tests with real dependencies
│   ├── api/               # API endpoint tests
│   └── db/                # Database query tests
├── e2e/                   # Full user flow tests
│   └── user-journey.ts    # Complete platform test
├── fixtures/              # Test data
│   └── users.ts
└── helpers/               # Test utilities
    └── setup.ts
```

### 10.2 Test Patterns

```typescript
// RULE 1: Descriptive test names
// ❌ BAD
test('createUser', async () => {});

// ✅ GOOD
describe('UserService', () => {
  describe('createUser', () => {
    it('creates a new user with valid input', async () => {});
    it('throws ValidationError for invalid email', async () => {});
    it('throws ConflictError for duplicate username', async () => {});
  });
});

// RULE 2: Arrange-Act-Assert pattern
it('transfers credits between users', async () => {
  // Arrange
  const sender = await createTestUser({ balance: 1000 });
  const receiver = await createTestUser({ balance: 0 });

  // Act
  await creditService.transfer(sender.id, receiver.id, 500);

  // Assert
  expect(await getBalance(sender.id)).toBe(500);
  expect(await getBalance(receiver.id)).toBe(500);
});

// RULE 3: Test error cases
it('throws InsufficientCreditsError when balance is too low', async () => {
  const sender = await createTestUser({ balance: 100 });
  const receiver = await createTestUser();

  await expect(
    creditService.transfer(sender.id, receiver.id, 500)
  ).rejects.toThrow(InsufficientCreditsError);

  // Verify no state change
  expect(await getBalance(sender.id)).toBe(100);
});

// RULE 4: Isolate tests with transactions
beforeEach(async () => {
  await db.query('BEGIN');
});

afterEach(async () => {
  await db.query('ROLLBACK');
});

// RULE 5: Test concurrent scenarios
it('prevents double-spending in concurrent transfers', async () => {
  const sender = await createTestUser({ balance: 100 });
  const receiver1 = await createTestUser();
  const receiver2 = await createTestUser();

  // Both try to transfer 100 at once
  const results = await Promise.allSettled([
    creditService.transfer(sender.id, receiver1.id, 100),
    creditService.transfer(sender.id, receiver2.id, 100),
  ]);

  // Exactly one should succeed
  const successes = results.filter(r => r.status === 'fulfilled');
  expect(successes.length).toBe(1);
  expect(await getBalance(sender.id)).toBe(0);
});
```

### 10.3 Test Coverage Requirements

| Category | Minimum Coverage |
|----------|------------------|
| Services | 80% |
| Utilities | 90% |
| Routes | 70% |
| Components | 60% |
| Critical paths (auth, economy) | 95% |

```bash
# Run with coverage
pnpm test:coverage

# Coverage thresholds in vitest.config.ts
coverage: {
  statements: 70,
  branches: 60,
  functions: 70,
  lines: 70,
}
```

---

## 11. Documentation Standards

### 11.1 Code Documentation

```typescript
// RULE 1: JSDoc for public APIs
/**
 * Transfers credits between users atomically.
 *
 * @param from - Source user ID
 * @param to - Destination user ID
 * @param amount - Amount to transfer (must be positive)
 * @param idempotencyKey - Unique key to prevent duplicate transfers
 * @returns The updated balances for both users
 * @throws {InsufficientCreditsError} When sender has insufficient balance
 * @throws {ValidationError} When amount is invalid
 *
 * @example
 * ```typescript
 * const result = await transferCredits(
 *   'user-123',
 *   'user-456',
 *   500,
 *   'transfer-abc-123'
 * );
 * console.log(result.fromBalance); // 500
 * ```
 */
export async function transferCredits(
  from: UserId,
  to: UserId,
  amount: number,
  idempotencyKey: string
): Promise<TransferResult> {
  // ...
}

// RULE 2: Inline comments for "why", not "what"
// ❌ BAD - explains what code does (obvious from reading)
// Increment counter by one
counter++;

// ✅ GOOD - explains why
// Skip first item because it's always the header row
for (let i = 1; i < rows.length; i++) { ... }

// RULE 3: Document non-obvious business rules
// Users get 10% bonus on first purchase due to promotional campaign
// ending 2026-03-01. Remove this after campaign ends.
const bonus = isFirstPurchase ? amount * 0.1 : 0;

// RULE 4: Mark technical debt
// TODO(jeanpaul): Replace with proper queue system
// HACK: Temporary workaround for race condition - see issue #123
// FIXME: This breaks when user has > 1000 workouts
```

### 11.2 README Structure

Every package/module should have:

```markdown
# Package Name

Brief description (1-2 sentences).

## Installation

```bash
pnpm add @musclemap/package
```

## Usage

```typescript
// Quick start example
```

## API Reference

### `functionName(param: Type): ReturnType`

Description of what it does.

**Parameters:**
- `param` - Description

**Returns:** Description

**Throws:** When it throws

## Contributing

Link to contribution guidelines.
```

---

## 12. File & Code Organization

### 12.1 Project Structure

```
musclemap.me/
├── apps/
│   ├── api/                    # Fastify API server
│   │   ├── src/
│   │   │   ├── config/         # Configuration
│   │   │   ├── db/             # Database (migrations, client)
│   │   │   ├── graphql/        # GraphQL (schema, resolvers)
│   │   │   ├── http/           # REST (routes, middleware)
│   │   │   ├── modules/        # Business logic services
│   │   │   └── utils/          # Utilities
│   │   └── tests/
│   └── mobile/                 # React Native app
├── packages/
│   ├── client/                 # API client SDK
│   ├── core/                   # Shared types & logic
│   ├── shared/                 # Shared utilities
│   ├── ui/                     # Shared UI components
│   └── plugin-sdk/             # Plugin framework
├── src/                        # React web frontend
│   ├── components/             # UI components
│   ├── contexts/               # React contexts
│   ├── hooks/                  # Custom hooks
│   ├── pages/                  # Page components
│   ├── store/                  # Zustand stores
│   └── utils/                  # Utilities
├── scripts/                    # Automation scripts
└── docs/                       # Documentation
```

### 12.2 Module Organization

```typescript
// Feature module structure:
modules/
├── economy/
│   ├── index.ts              # Public exports only
│   ├── types.ts              # Types for this module
│   ├── credit.service.ts     # Credit operations
│   ├── wallet.service.ts     # Wallet operations
│   ├── pricing.service.ts    # Pricing logic
│   └── __tests__/            # Module tests
│       ├── credit.test.ts
│       └── wallet.test.ts

// index.ts - Public API
export { creditService } from './credit.service';
export { walletService } from './wallet.service';
export type { CreditBalance, Transaction } from './types';
// Don't export internal helpers

// RULE: Only import from index.ts
// ❌ BAD - deep import
import { internalHelper } from '@/modules/economy/credit.service';

// ✅ GOOD - public API
import { creditService } from '@/modules/economy';
```

### 12.3 File Size Limits

| File Type | Max Lines | Action if Exceeded |
|-----------|-----------|-------------------|
| Route files | 300 | Extract to service layer |
| Service files | 500 | Split into focused services |
| Component files | 250 | Extract sub-components |
| Utility files | 200 | Split by domain |
| Test files | 500 | Split by scenario |

---

## 13. Git & Deployment

### 13.1 Commit Messages

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(workouts): add rest timer to workout session

- Implement countdown timer with audio alert
- Store rest duration preference in user settings
- Add haptic feedback on timer completion

Closes #234

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### 13.2 Branch Strategy

```
main                    # Production-ready code
├── feature/xyz         # New features
├── fix/issue-123       # Bug fixes
└── chore/update-deps   # Maintenance
```

### 13.3 Pre-Commit Checklist

```bash
# Before committing:
pnpm typecheck          # Type checking passes
pnpm lint               # No linting errors
pnpm test               # Tests pass
pnpm build:all          # Build succeeds
```

### 13.4 Deployment Checklist

```bash
# Before deploying:
[ ] All tests pass
[ ] Type checking passes
[ ] Linting passes
[ ] Build succeeds
[ ] E2E tests pass (pnpm test:e2e:api)
[ ] Documentation updated (pnpm docs:generate)
[ ] Database migrations ready (if any)
[ ] Security scan clean

# After deploying:
[ ] Health check passes (curl https://musclemap.me/health)
[ ] Smoke test critical paths
[ ] Monitor error rates for 15 minutes
```

---

## 14. Anti-Patterns to Avoid

### 14.1 TypeScript Anti-Patterns

```typescript
// ❌ Using `any`
function process(data: any) {}

// ❌ Non-null assertions without validation
const user = getUser()!;

// ❌ Type assertions without validation
const config = data as Config;

// ❌ Implicit any in callbacks
items.map(item => item.name); // If items: any[]

// ❌ Using `object` type
function merge(a: object, b: object): object {}
```

### 14.2 React Anti-Patterns

```tsx
// ❌ Props drilling through many levels
<GrandParent user={user}>
  <Parent user={user}>
    <Child user={user}>
      <GrandChild user={user} />
    </Child>
  </Parent>
</GrandParent>

// ❌ Subscribing to entire store
const store = useStore(); // Re-renders on ANY change

// ❌ Inline objects/arrays in JSX (new reference each render)
<Component style={{ color: 'red' }} items={[1, 2, 3]} />

// ❌ useEffect for derived state
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);
// Should be: const fullName = `${firstName} ${lastName}`;

// ❌ Missing dependency array
useEffect(() => {
  fetchData(userId);
}); // Runs every render!

// ❌ Setting state in render
function Component() {
  const [x, setX] = useState(0);
  setX(1); // Infinite loop!
}
```

### 14.3 API Anti-Patterns

```typescript
// ❌ Business logic in routes
app.post('/transfer', async (req, reply) => {
  // 100 lines of business logic here
});

// ❌ N+1 queries
for (const user of users) {
  user.workouts = await getWorkouts(user.id);
}

// ❌ Offset pagination
SELECT * FROM items OFFSET 1000 LIMIT 50;

// ❌ String interpolation in SQL
query(`SELECT * FROM users WHERE id = '${id}'`);

// ❌ Swallowing errors
try { await operation(); } catch (e) { /* silent */ }

// ❌ No input validation
app.post('/users', async (req) => {
  await db.insert('users', req.body); // Raw input!
});

// ❌ Inconsistent response formats
// Some routes: { data: {...} }
// Other routes: { result: {...} }
// Other routes: { ...data }
```

### 14.4 Database Anti-Patterns

```sql
-- ❌ SELECT * in production
SELECT * FROM users;

-- ❌ Missing indexes on foreign keys
ALTER TABLE orders ADD FOREIGN KEY (user_id) REFERENCES users(id);
-- Without: CREATE INDEX idx_orders_user ON orders(user_id);

-- ❌ OFFSET pagination
SELECT * FROM items ORDER BY created_at OFFSET 1000 LIMIT 50;

-- ❌ N+1 in application code (see API anti-patterns)

-- ❌ No connection pooling

-- ❌ Missing transaction for multi-table updates
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
-- Should be wrapped in transaction
```

---

## Quick Reference Card

### Must-Do Checklist

```
[ ] TypeScript strict mode enabled
[ ] All input validated with Zod
[ ] All queries parameterized
[ ] Keyset pagination (no OFFSET)
[ ] Error boundaries in React
[ ] Lazy loading for routes
[ ] Authentication on protected routes
[ ] Rate limiting on sensitive endpoints
[ ] Tests for critical paths
[ ] Type-safe state management
```

### Code Review Checklist

```
[ ] Types are explicit and correct
[ ] No `any` types
[ ] Error cases handled
[ ] Input validated
[ ] SQL parameterized
[ ] No N+1 queries
[ ] Performance considered
[ ] Tests added/updated
[ ] Documentation updated
[ ] Security implications reviewed
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01 | Initial release |

---

## References

- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [React Design Patterns 2025](https://www.telerik.com/blogs/react-design-patterns-best-practices)
- [Fastify Best Practices](https://fastify.dev/docs/latest/Guides/Recommendations/)
- [PostgreSQL Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html)
- [OWASP API Security Top 10](https://owasp.org/API-Security/)
- [GraphQL Security Best Practices](https://graphql.org/learn/security/)
- [Monorepo Architecture Guide](https://feature-sliced.design/blog/frontend-monorepo-explained)
