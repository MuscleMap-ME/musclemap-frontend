# Coding Standards

> Write clean, consistent, maintainable code.

---

## TypeScript Standards

### Strict Mode

Always use strict TypeScript configuration:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true
  }
}
```

### Type Safety

```typescript
// GOOD: Explicit types
function calculateTU(
  muscleId: string,
  sets: number,
  reps: number,
  weight: number
): number {
  return muscleId ? sets * reps * weight * 0.1 : 0;
}

// BAD: Any types
function calculateTU(muscle: any, sets: any): any {
  return muscle.id * sets;  // Type unsafe
}
```

### Naming Conventions

```typescript
// Interfaces: PascalCase with I prefix (optional)
interface User { }
interface IUserService { }

// Types: PascalCase
type UserId = string;
type WorkoutStatus = 'pending' | 'active' | 'completed';

// Enums: PascalCase with UPPER_CASE values
enum HttpStatus {
  OK = 200,
  NOT_FOUND = 404,
}

// Variables: camelCase
const userId = '123';
const workoutData = {};

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 5000;

// Functions: camelCase with verb prefix
function getUserById() { }
function createWorkout() { }
function validateInput() { }

// Classes: PascalCase
class WorkoutService { }
class UserRepository { }

// Files: kebab-case
// user-service.ts
// workout-repository.ts
```

---

## React Patterns

### Component Structure

```typescript
// 1. Imports (grouped)
import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { Button } from '@/components/ui';
import { formatDate } from '@/utils';
import type { User } from '@/types';

// 2. Types
interface Props {
  userId: string;
  onComplete?: () => void;
}

// 3. Component
export function UserProfile({ userId, onComplete }: Props) {
  // 3a. Hooks (in order)
  const [isEditing, setIsEditing] = useState(false);
  const { data, loading } = useQuery(GET_USER, { variables: { userId } });

  // 3b. Effects
  useEffect(() => {
    if (data?.user) {
      trackPageView('user_profile');
    }
  }, [data]);

  // 3c. Event handlers
  const handleSave = async () => {
    await saveUser();
    onComplete?.();
  };

  // 3d. Early returns
  if (loading) return <Skeleton />;
  if (!data?.user) return <NotFound />;

  // 3e. Main render
  return (
    <div className={styles.container}>
      {/* ... */}
    </div>
  );
}
```

### Hook Rules

```typescript
// GOOD: Hooks at top level
function MyComponent() {
  const [state, setState] = useState(null);
  const data = useQuery(QUERY);

  // ...
}

// BAD: Conditional hooks
function MyComponent({ isAdmin }) {
  if (isAdmin) {
    const [state, setState] = useState(null);  // Error!
  }
}
```

### State Management

```typescript
// Use Apollo for server data
const { data } = useQuery(GET_WORKOUTS);

// Use Zustand for UI state (with selectors!)
const sidebarOpen = useUIStore((state) => state.sidebarOpen);

// BAD: Subscribe to entire store
const { sidebarOpen } = useUIStore();  // Causes re-renders

// Use Context for rarely-changing data
const { theme } = useTheme();

// Use local state for component-specific
const [isOpen, setIsOpen] = useState(false);
```

---

## API & Backend Patterns

### Route Structure

```typescript
// routes/workouts.ts
import { FastifyPluginAsync } from 'fastify';
import { workoutService } from '../services';
import { createWorkoutSchema, workoutParamsSchema } from '../schemas';

const workoutRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /workouts
  fastify.get('/', {
    schema: {
      querystring: paginationSchema,
      response: { 200: workoutsResponseSchema }
    }
  }, async (request, reply) => {
    const workouts = await workoutService.list(request.query);
    return { data: workouts };
  });

  // POST /workouts
  fastify.post('/', {
    schema: {
      body: createWorkoutSchema,
      response: { 201: workoutResponseSchema }
    },
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const workout = await workoutService.create(request.user.id, request.body);
    reply.code(201);
    return { data: workout };
  });
};
```

### Service Layer

```typescript
// services/workout-service.ts
export class WorkoutService {
  constructor(
    private db: Database,
    private cache: CacheService,
    private tuCalculator: TUCalculator
  ) {}

  async create(userId: string, input: CreateWorkoutInput): Promise<Workout> {
    // Validation
    const validated = createWorkoutSchema.parse(input);

    // Business logic
    const tu = this.tuCalculator.calculate(validated.exercises);

    // Data access (transaction)
    const workout = await this.db.transaction(async (trx) => {
      const workout = await trx('workouts').insert({
        user_id: userId,
        ...validated,
        total_tu: tu
      }).returning('*');

      await trx('user_stats').increment('total_tu', tu);

      return workout[0];
    });

    // Cache invalidation
    await this.cache.invalidate(`user:${userId}:*`);

    return workout;
  }
}
```

### Input Validation (Zod)

```typescript
import { z } from 'zod';

// Schema definition
export const createWorkoutSchema = z.object({
  name: z.string().min(1).max(100),
  exercises: z.array(z.object({
    exerciseId: z.string().uuid(),
    sets: z.number().int().min(1).max(50),
    reps: z.number().int().min(1).max(100),
    weight: z.number().min(0).max(1000).optional()
  })).min(1).max(50),
  notes: z.string().max(1000).optional()
});

// Usage in route
const validated = createWorkoutSchema.parse(request.body);
// Throws ZodError if invalid
```

---

## Database Patterns

### Query Best Practices

```typescript
// GOOD: Parameterized queries
const user = await db('users')
  .where('id', userId)
  .first();

// BAD: String interpolation (SQL injection risk!)
const user = await db.raw(`SELECT * FROM users WHERE id = '${userId}'`);

// GOOD: Select only needed columns
const users = await db('users')
  .select('id', 'username', 'avatar_url')
  .where('status', 'active');

// BAD: Select all columns
const users = await db('users').where('status', 'active');  // SELECT *
```

### Keyset Pagination

```typescript
// GOOD: Keyset pagination (O(1))
async function getWorkouts(userId: string, cursor?: Cursor) {
  const query = db('workouts')
    .where('user_id', userId)
    .orderBy([
      { column: 'created_at', order: 'desc' },
      { column: 'id', order: 'desc' }
    ])
    .limit(50);

  if (cursor) {
    query.where(function() {
      this.where('created_at', '<', cursor.createdAt)
        .orWhere(function() {
          this.where('created_at', '=', cursor.createdAt)
            .andWhere('id', '<', cursor.id);
        });
    });
  }

  return query;
}

// BAD: Offset pagination (O(n))
const results = await db('workouts')
  .where('user_id', userId)
  .offset(page * 50)  // Gets slower as page increases!
  .limit(50);
```

### Transactions

```typescript
// GOOD: Use transactions for multi-table updates
await db.transaction(async (trx) => {
  await trx('credits').decrement('balance', amount);
  await trx('ledger').insert({ type: 'debit', amount });
  await trx('purchases').insert({ userId, itemId });
});

// BAD: Separate queries (can leave inconsistent state)
await db('credits').decrement('balance', amount);
await db('ledger').insert({ type: 'debit', amount });
// What if this crashes here?
await db('purchases').insert({ userId, itemId });
```

---

## Error Handling

### Error Classes

```typescript
// Define custom errors
export class ValidationError extends Error {
  code = 'VALIDATION_ERROR';
  statusCode = 400;

  constructor(message: string, public field?: string) {
    super(message);
  }
}

export class NotFoundError extends Error {
  code = 'NOT_FOUND';
  statusCode = 404;

  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
  }
}
```

### Error Handling in Routes

```typescript
// Use try-catch with specific handling
fastify.post('/workouts', async (request, reply) => {
  try {
    const workout = await workoutService.create(request.body);
    reply.code(201).send({ data: workout });
  } catch (error) {
    if (error instanceof ValidationError) {
      reply.code(400).send({ error: error.message, field: error.field });
    } else if (error instanceof NotFoundError) {
      reply.code(404).send({ error: error.message });
    } else {
      // Log unexpected errors
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  }
});
```

### Frontend Error Handling

```typescript
// Use error boundaries
<ErrorBoundary name="WorkoutList">
  <Suspense fallback={<Skeleton />}>
    <WorkoutList />
  </Suspense>
</ErrorBoundary>

// Handle query errors
const { data, error } = useQuery(GET_WORKOUTS);

if (error) {
  return <ErrorMessage error={error} />;
}
```

---

## Security Standards

### Authentication

```typescript
// Always use the authenticate preHandler
fastify.post('/workouts', {
  preHandler: [fastify.authenticate]
}, async (request, reply) => {
  // request.user is now available
  const workout = await service.create(request.user.id, request.body);
});
```

### Authorization

```typescript
// Check ownership
async function getWorkout(userId: string, workoutId: string) {
  const workout = await db('workouts').where('id', workoutId).first();

  if (!workout) {
    throw new NotFoundError('Workout', workoutId);
  }

  if (workout.user_id !== userId) {
    throw new AuthorizationError('Not authorized to access this workout');
  }

  return workout;
}
```

### Input Validation

```typescript
// ALWAYS validate user input
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z\s]+$/)
});

// Sanitize HTML where needed
import sanitizeHtml from 'sanitize-html';
const cleanBio = sanitizeHtml(userInput.bio, {
  allowedTags: [],  // No HTML allowed
  allowedAttributes: {}
});
```

---

## Anti-Patterns to Avoid

### TypeScript

```typescript
// BAD: any type
const data: any = fetchData();

// BAD: Type assertions without validation
const user = data as User;  // What if data is null?

// BAD: Non-null assertion operator
const name = user!.name;  // Could crash

// GOOD: Runtime validation
const user = userSchema.parse(data);
const name = user?.name ?? 'Unknown';
```

### React

```typescript
// BAD: Inline object/array in props (causes re-renders)
<Component style={{ color: 'red' }} />

// GOOD: Memoize or hoist
const style = useMemo(() => ({ color: 'red' }), []);
<Component style={style} />

// BAD: Index as key
{items.map((item, index) => <Item key={index} />)}

// GOOD: Stable unique key
{items.map((item) => <Item key={item.id} />)}
```

### Database

```typescript
// BAD: N+1 queries
for (const user of users) {
  const workouts = await db('workouts').where('user_id', user.id);
}

// GOOD: Batch query
const workouts = await db('workouts').whereIn('user_id', users.map(u => u.id));

// BAD: Missing index on foreign key
// (slow JOIN performance)

// GOOD: Add index when creating FK
await knex.schema.alterTable('workouts', (table) => {
  table.index('user_id');
});
```

---

## Quick Reference

```
ALWAYS                              NEVER
================================    ================================
Use strict TypeScript               Use `any` type
Parameterize SQL queries            String interpolation in SQL
Keyset pagination                   OFFSET pagination
Zustand selectors                   Subscribe to entire store
Validate ALL input (Zod)            Trust user input
Explicit return types               Type assertions without checks
Lazy load routes                    Eager import all pages
Use transactions for writes         Multiple unrelated queries
```

---

## See Also

- [Architecture](./01-architecture.md) - System design
- [Testing](./04-testing.md) - Test your code
- Full coding guide: `docs/CODING-STYLE-GUIDE.md`

---

*Last updated: 2026-01-15*
