# Testing Guide

> Write tests that catch bugs and document behavior.

---

## Testing Stack

```
TESTING TOOLS
=============

Unit Tests:       Vitest
Integration:      Supertest + Vitest
E2E:              Custom test harness
GraphQL:          Apollo testing utilities
Coverage:         c8 (via Vitest)
Mocking:          Vitest mocks
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch

# Run specific tests
pnpm test -- --grep "workout"
```

### Test Categories

```bash
# API tests
pnpm test:api

# E2E user journey
pnpm test:e2e:api

# Test harness (comprehensive)
pnpm test:harness

# By category
pnpm test:harness --category core
pnpm test:harness --category security
pnpm test:harness --category edge
pnpm test:harness --category performance
```

---

## Test Organization

### Directory Structure

```
apps/api/
├── src/
│   └── modules/
│       └── workouts/
│           ├── service.ts
│           └── service.test.ts    # Co-located tests
├── tests/
│   ├── unit/                      # Unit tests
│   │   └── tu-calculator.test.ts
│   ├── integration/               # Integration tests
│   │   └── workout-flow.test.ts
│   └── fixtures/                  # Test data
│       └── workouts.json

scripts/
├── e2e-user-journey.ts            # E2E test script
└── test-harness/                  # Comprehensive harness
    ├── index.ts
    ├── personas.ts
    └── suites/
```

### Naming Conventions

```typescript
// Files: same name as source + .test.ts
// service.ts → service.test.ts

// Test descriptions: describe what, not how
describe('WorkoutService', () => {
  describe('create', () => {
    it('creates a workout with valid input', async () => { });
    it('throws ValidationError for invalid exercises', async () => { });
    it('calculates TU correctly for compound movements', async () => { });
  });
});
```

---

## Unit Tests

### Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkoutService } from './workout-service';

describe('WorkoutService', () => {
  let service: WorkoutService;
  let mockDb: MockDatabase;
  let mockCache: MockCache;

  beforeEach(() => {
    // Fresh mocks for each test
    mockDb = createMockDb();
    mockCache = createMockCache();
    service = new WorkoutService(mockDb, mockCache);
  });

  describe('create', () => {
    it('creates workout and invalidates cache', async () => {
      // Arrange
      const input = {
        name: 'Test Workout',
        exercises: [{ exerciseId: '1', sets: 3, reps: 10 }]
      };
      mockDb.insert.mockResolvedValue([{ id: '123', ...input }]);

      // Act
      const result = await service.create('user-1', input);

      // Assert
      expect(result.id).toBe('123');
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-1' })
      );
      expect(mockCache.invalidate).toHaveBeenCalledWith('user:user-1:*');
    });

    it('throws ValidationError for empty exercises', async () => {
      const input = { name: 'Empty', exercises: [] };

      await expect(service.create('user-1', input))
        .rejects
        .toThrow(ValidationError);
    });
  });
});
```

### Mocking

```typescript
import { vi } from 'vitest';

// Mock module
vi.mock('../services/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(true)
}));

// Mock function
const mockFn = vi.fn();
mockFn.mockReturnValue('value');
mockFn.mockResolvedValue('async value');
mockFn.mockRejectedValue(new Error('failed'));

// Spy on method
const spy = vi.spyOn(service, 'calculate');
expect(spy).toHaveBeenCalledWith(expected);

// Mock timers
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
vi.useRealTimers();
```

---

## Integration Tests

### API Route Testing

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../app';

describe('Workout Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build({ testing: true });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/workouts', () => {
    it('creates workout for authenticated user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/workouts',
        headers: {
          authorization: `Bearer ${testToken}`
        },
        payload: {
          name: 'Test Workout',
          exercises: [{ exerciseId: '1', sets: 3, reps: 10 }]
        }
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.payload)).toMatchObject({
        data: {
          name: 'Test Workout',
          exercises: expect.any(Array)
        }
      });
    });

    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/workouts',
        payload: { name: 'Test', exercises: [] }
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
```

### GraphQL Testing

```typescript
import { describe, it, expect } from 'vitest';
import { createTestClient } from 'apollo-server-testing';

describe('GraphQL Workouts', () => {
  const { query, mutate } = createTestClient(server);

  it('fetches workouts with pagination', async () => {
    const result = await query({
      query: GET_WORKOUTS,
      variables: { limit: 10 }
    });

    expect(result.errors).toBeUndefined();
    expect(result.data.workouts).toHaveLength(10);
  });

  it('creates workout mutation', async () => {
    const result = await mutate({
      mutation: CREATE_WORKOUT,
      variables: {
        input: {
          name: 'GraphQL Test',
          exercises: []
        }
      }
    });

    expect(result.errors).toBeUndefined();
    expect(result.data.createWorkout.name).toBe('GraphQL Test');
  });
});
```

---

## E2E Tests

### User Journey Test

```bash
# Run E2E test
pnpm test:e2e:api

# Against production
pnpm test:e2e:api:prod

# With verbose output
npx tsx scripts/e2e-user-journey.ts --verbose

# Keep test user
npx tsx scripts/e2e-user-journey.ts --keep-user
```

### Test Harness

```bash
# Full test suite (230+ tests)
pnpm test:harness

# With specific category
pnpm test:harness --category security
pnpm test:harness --category edge
pnpm test:harness --category performance

# With specific persona
pnpm test:harness --persona elite_eve

# Export results
pnpm test:harness --format json -o results.json
```

### Adding E2E Tests

When adding features, add corresponding E2E tests:

```typescript
// scripts/e2e-user-journey.ts

await runTest('NewFeature', 'Test new feature', async () => {
  const res = await request('GET', '/api/new-feature', {
    token: ctx.token,
    expectedStatus: [200, 404],
  });

  assert([200, 404].includes(res.status), 'New feature should respond');

  if (res.status === 200) {
    assert(res.data.hasOwnProperty('key'), 'Response should have key');
  }
});
```

---

## Test Fixtures

### Creating Fixtures

```typescript
// tests/fixtures/workouts.ts
export const validWorkout = {
  name: 'Test Workout',
  exercises: [
    { exerciseId: 'ex-1', sets: 3, reps: 10, weight: 100 },
    { exerciseId: 'ex-2', sets: 4, reps: 8, weight: 50 }
  ],
  notes: 'Test notes'
};

export const invalidWorkout = {
  name: '',  // Invalid: empty name
  exercises: []  // Invalid: no exercises
};

export const edgeCaseWorkout = {
  name: 'A'.repeat(100),  // Max length name
  exercises: Array(50).fill(validExercise)  // Max exercises
};
```

### Using Fixtures

```typescript
import { validWorkout, invalidWorkout } from '../fixtures/workouts';

describe('WorkoutService', () => {
  it('creates valid workout', async () => {
    const result = await service.create(userId, validWorkout);
    expect(result.id).toBeDefined();
  });

  it('rejects invalid workout', async () => {
    await expect(service.create(userId, invalidWorkout))
      .rejects.toThrow(ValidationError);
  });
});
```

---

## Coverage Requirements

### Minimum Coverage

```
TARGET COVERAGE
===============

Statements:  80%
Branches:    75%
Functions:   80%
Lines:       80%
```

### Checking Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html
```

### Coverage by Module

```
MODULE COVERAGE TARGETS
=======================

Critical (90%+):
├── Authentication
├── Authorization
├── Credit economy
└── TU calculation

Standard (80%+):
├── Workout operations
├── User management
├── Social features
└── Stats calculation

Lower (70%+):
├── UI components
├── Utility functions
└── Formatting helpers
```

---

## Best Practices

### Do

```typescript
// Test behavior, not implementation
it('calculates correct TU for compound exercise', () => {
  // Test the OUTPUT, not internal steps
  expect(calculateTU(input)).toBe(expectedTU);
});

// Use descriptive names
it('throws InsufficientCreditsError when balance is too low', () => { });

// Test edge cases
it('handles empty array input', () => { });
it('handles null values gracefully', () => { });
it('handles maximum allowed values', () => { });

// Isolate tests
beforeEach(() => {
  // Fresh state for each test
});
```

### Don't

```typescript
// DON'T test implementation details
it('calls calculateTU then saves to database', () => { });  // Too coupled

// DON'T use vague names
it('works correctly', () => { });  // What works? How?

// DON'T share state between tests
let sharedResult;  // Can cause flaky tests

// DON'T test external services
it('sends email via SendGrid', () => { });  // Mock this instead
```

---

## Debugging Tests

### Vitest UI

```bash
# Run with UI
pnpm test -- --ui
```

### Console Output

```typescript
it('debug test', async () => {
  const result = await service.create(input);

  console.log('Result:', JSON.stringify(result, null, 2));

  expect(result).toBeDefined();
});
```

### VS Code Debugging

```json
// .vscode/launch.json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "--reporter=verbose"],
      "console": "integratedTerminal"
    }
  ]
}
```

---

## See Also

- [Coding Standards](./03-coding-standards.md)
- [Contributing](./06-contributing.md)
- Test harness: `scripts/test-harness/`
- E2E test: `scripts/e2e-user-journey.ts`

---

*Last updated: 2026-01-15*
