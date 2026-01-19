# GraphQL API

> MuscleMap's primary data interface.

---

## Overview

MuscleMap uses GraphQL as its primary API. All data operations (queries and mutations) go through a single endpoint.

```
ENDPOINT
========

URL:     https://musclemap.me/graphql
Method:  POST
Headers: Content-Type: application/json
         Authorization: Bearer <token> (for authenticated operations)
```

---

## Basic Usage

### Query Structure

```graphql
query {
  user {
    id
    username
    level
  }
}
```

### Mutation Structure

```graphql
mutation {
  createWorkout(input: {
    name: "Push Day"
    exercises: [...]
  }) {
    id
    name
    totalTU
  }
}
```

### Variables

```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    username
    level
  }
}
```

With variables:
```json
{
  "query": "query GetUser($id: ID!) { user(id: $id) { username } }",
  "variables": { "id": "user-uuid" }
}
```

---

## Schema Overview

### Core Types

```graphql
type User {
  id: ID!
  username: String!
  email: String!
  level: Int!
  archetypeId: String
  totalTU: Int!
  stats: UserStats
  createdAt: DateTime!
}

type Workout {
  id: ID!
  name: String!
  exercises: [WorkoutExercise!]!
  totalTU: Int!
  duration: Int
  createdAt: DateTime!
  user: User!
}

type Exercise {
  id: ID!
  name: String!
  category: String!
  muscleGroups: [MuscleActivation!]!
  equipment: [String!]!
  instructions: String
}

type MuscleActivation {
  muscleId: String!
  muscleName: String!
  activation: Float!
  isPrimary: Boolean!
}
```

### Query Types

```graphql
type Query {
  # User queries
  me: User
  user(id: ID!): User

  # Workout queries
  workouts(limit: Int, cursor: String): WorkoutConnection!
  workout(id: ID!): Workout

  # Exercise queries
  exercises(
    search: String
    category: String
    muscleGroup: String
    equipment: [String!]
    limit: Int
  ): [Exercise!]!

  exercise(id: ID!): Exercise

  # Stats queries
  stats: UserStats
  leaderboard(type: LeaderboardType!, limit: Int): [LeaderboardEntry!]!

  # Community queries
  feed(limit: Int, cursor: String): FeedConnection!
  crew(id: ID!): Crew
}
```

### Mutation Types

```graphql
type Mutation {
  # Auth
  signup(input: SignupInput!): AuthPayload!
  login(input: LoginInput!): AuthPayload!

  # Workouts
  createWorkout(input: CreateWorkoutInput!): Workout!
  logExercise(input: LogExerciseInput!): WorkoutExercise!
  completeWorkout(id: ID!): Workout!

  # Profile
  updateProfile(input: UpdateProfileInput!): User!
  selectArchetype(archetypeId: String!): User!

  # Social
  followUser(userId: ID!): User!
  unfollowUser(userId: ID!): User!
  sendHighFive(userId: ID!, type: HighFiveType): HighFive!

  # Economy
  purchaseCredits(packageId: String!): CreditPurchase!
  giftCredits(userId: ID!, amount: Int!): CreditTransfer!
}
```

---

## Common Queries

### Get Current User

```graphql
query Me {
  me {
    id
    username
    email
    level
    archetypeId
    totalTU
    creditBalance
    stats {
      strength
      endurance
      power
      flexibility
      balance
      coordination
    }
  }
}
```

### Get Workouts

```graphql
query GetWorkouts($limit: Int, $cursor: String) {
  workouts(limit: $limit, cursor: $cursor) {
    edges {
      node {
        id
        name
        totalTU
        duration
        createdAt
        exercises {
          exerciseId
          exerciseName
          sets {
            reps
            weight
          }
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Search Exercises

```graphql
query SearchExercises($search: String, $muscleGroup: String) {
  exercises(search: $search, muscleGroup: $muscleGroup, limit: 20) {
    id
    name
    category
    equipment
    muscleGroups {
      muscleName
      activation
      isPrimary
    }
  }
}
```

### Get Leaderboard

```graphql
query Leaderboard($type: LeaderboardType!) {
  leaderboard(type: $type, limit: 50) {
    rank
    user {
      id
      username
      level
      avatarUrl
    }
    value
  }
}
```

---

## Common Mutations

### Create Workout

```graphql
mutation CreateWorkout($input: CreateWorkoutInput!) {
  createWorkout(input: $input) {
    id
    name
    totalTU
    exercises {
      id
      exerciseName
    }
  }
}
```

Variables:
```json
{
  "input": {
    "name": "Push Day",
    "exercises": [
      {
        "exerciseId": "bench-press-uuid",
        "sets": [
          { "reps": 10, "weight": 80 },
          { "reps": 8, "weight": 85 },
          { "reps": 6, "weight": 90 }
        ]
      }
    ]
  }
}
```

### Log Exercise

```graphql
mutation LogExercise($input: LogExerciseInput!) {
  logExercise(input: $input) {
    id
    exerciseId
    exerciseName
    sets {
      reps
      weight
      rpe
    }
    tu
  }
}
```

### Select Archetype

```graphql
mutation SelectArchetype($archetypeId: String!) {
  selectArchetype(archetypeId: $archetypeId) {
    id
    archetypeId
    level
  }
}
```

### Send High Five

```graphql
mutation SendHighFive($userId: ID!, $type: HighFiveType) {
  sendHighFive(userId: $userId, type: $type) {
    id
    fromUser {
      username
    }
    toUser {
      username
    }
    type
    createdAt
  }
}
```

---

## Pagination

MuscleMap uses cursor-based (keyset) pagination:

```graphql
query {
  workouts(limit: 20, cursor: "cursor-value") {
    edges {
      node {
        id
        name
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Pagination Pattern

```javascript
// Initial query
const { data } = await query({ limit: 20 });

// Load more
if (data.workouts.pageInfo.hasNextPage) {
  const nextPage = await query({
    limit: 20,
    cursor: data.workouts.pageInfo.endCursor
  });
}
```

---

## Error Handling

### Error Format

```json
{
  "errors": [
    {
      "message": "Not authorized",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["createWorkout"],
      "extensions": {
        "code": "UNAUTHORIZED"
      }
    }
  ],
  "data": null
}
```

### Common Error Codes

| Code | Meaning |
|------|---------|
| UNAUTHORIZED | Authentication required or invalid |
| FORBIDDEN | User lacks permission |
| NOT_FOUND | Resource doesn't exist |
| VALIDATION_ERROR | Input validation failed |
| RATE_LIMITED | Too many requests |

---

## Query Complexity

To prevent abuse, queries have complexity limits:

```
COMPLEXITY LIMITS
=================

Anonymous:      100
Authenticated:  500
Premium:        1000
```

### Field Costs

```
Base field:       1
List field:       2 × limit
Nested object:    +2
Connection:       +3
```

Example:
```graphql
query {              # Base: 1
  workouts(limit: 10) {  # 2 × 10 = 20
    edges {
      node {
        exercises {  # 2 × exercises
          sets {     # 2 × sets
          }
        }
      }
    }
  }
}
# Total: ~60 complexity
```

---

## Caching

### Cache-Control

Responses include cache hints:

```
@cacheControl(maxAge: 300)  # 5 minutes for exercises
@cacheControl(maxAge: 30)   # 30 seconds for user data
@cacheControl(maxAge: 0)    # No cache for mutations
```

### Apollo Client Caching

```javascript
const client = new ApolloClient({
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          workouts: {
            keyArgs: false,
            merge(existing, incoming) {
              // Merge pagination results
            }
          }
        }
      }
    }
  })
});
```

---

## Introspection

Query the schema:

```graphql
query {
  __schema {
    types {
      name
      fields {
        name
        type {
          name
        }
      }
    }
  }
}
```

---

## See Also

- [Authentication](./authentication.md)
- [Errors](./errors.md)
- Full schema: `docs-plain/machine-readable/graphql-schema.graphql`

---

*Last updated: 2026-01-15*
