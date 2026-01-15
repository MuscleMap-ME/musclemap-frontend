# Authentication

> How to authenticate with the MuscleMap API.

---

## Overview

MuscleMap uses JWT (JSON Web Tokens) for authentication. All authenticated endpoints require a valid token in the Authorization header.

---

## Authentication Flow

```
AUTHENTICATION FLOW
===================

1. REGISTER / LOGIN
   POST /api/auth/signup
   POST /api/auth/login
         │
         ▼
2. RECEIVE TOKEN
   { "token": "eyJhbGc...", "user": {...} }
         │
         ▼
3. USE TOKEN
   Authorization: Bearer eyJhbGc...
         │
         ▼
4. TOKEN EXPIRES (24h)
   Re-login required
```

---

## Endpoints

### Register (Signup)

```
POST /api/auth/signup
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "username": "fituser"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "username": "fituser",
    "level": 1,
    "archetypeId": null,
    "createdAt": "2026-01-15T00:00:00Z"
  }
}
```

**Errors:**
| Code | Message |
|------|---------|
| 400 | Invalid email format |
| 400 | Password too weak |
| 409 | Email already registered |
| 409 | Username already taken |

### Login

```
POST /api/auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "username": "fituser",
    "level": 14,
    "archetypeId": "bodybuilder",
    "totalTU": 5847,
    "createdAt": "2025-06-15T00:00:00Z"
  }
}
```

**Errors:**
| Code | Message |
|------|---------|
| 400 | Invalid credentials |
| 401 | Account locked |
| 404 | User not found |

### Verify Token

```
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "username": "fituser",
    "level": 14,
    "archetypeId": "bodybuilder"
  }
}
```

**Errors:**
| Code | Message |
|------|---------|
| 401 | Token expired |
| 401 | Invalid token |

---

## Using Tokens

### HTTP Header

Include the token in every authenticated request:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Example Requests

**cURL:**
```bash
curl -X GET https://musclemap.me/api/workouts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**JavaScript:**
```javascript
const response = await fetch('https://musclemap.me/api/workouts', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

**Apollo Client:**
```javascript
const client = new ApolloClient({
  uri: 'https://musclemap.me/graphql',
  headers: {
    authorization: `Bearer ${token}`
  }
});
```

---

## Token Details

### Token Structure

MuscleMap tokens are JWTs with this structure:

```
HEADER.PAYLOAD.SIGNATURE

Header: { "alg": "HS256", "typ": "JWT" }
Payload: {
  "sub": "user-uuid",
  "email": "user@example.com",
  "iat": 1705276800,
  "exp": 1705363200
}
```

### Token Lifetime

```
TOKEN LIFETIME
==============

Standard token:   24 hours
Remember me:      7 days (if enabled)
Refresh:          Not supported (re-login required)
```

### Token Storage

**Recommended:**
```javascript
// Web: Store in memory + httpOnly cookie
// Mobile: Secure storage (Keychain/Keystore)

// NOT recommended:
// localStorage (XSS vulnerable)
// sessionStorage (lost on tab close)
```

---

## Password Requirements

```
PASSWORD REQUIREMENTS
=====================

Minimum length:     8 characters
Maximum length:     100 characters
Required:           At least 1 letter
Required:           At least 1 number
Recommended:        Special characters
Recommended:        Mixed case
```

### Password Hashing

Passwords are hashed using bcrypt with cost factor 12:

```
bcrypt.hash(password, 12)
```

---

## Security Features

### Rate Limiting

```
RATE LIMITS
===========

Login attempts:     5 per minute per IP
Signup attempts:    3 per minute per IP
Password reset:     3 per hour per email
```

### Account Protection

```
SECURITY MEASURES
=================

├── Password hashing (bcrypt)
├── JWT signature verification
├── Token expiration
├── Rate limiting
├── HTTPS required
└── Optional 2FA (coming soon)
```

---

## Error Responses

### Authentication Errors

```json
// 401 Unauthorized
{
  "error": "Unauthorized",
  "message": "Token expired",
  "code": "TOKEN_EXPIRED"
}

// 401 Unauthorized
{
  "error": "Unauthorized",
  "message": "Invalid token",
  "code": "INVALID_TOKEN"
}

// 400 Bad Request
{
  "error": "Bad Request",
  "message": "Invalid credentials",
  "code": "INVALID_CREDENTIALS"
}
```

### Handling Token Expiration

```javascript
// Check for 401 and redirect to login
if (response.status === 401) {
  localStorage.removeItem('token');
  window.location.href = '/login';
}
```

---

## GraphQL Authentication

### Schema

```graphql
type Mutation {
  signup(input: SignupInput!): AuthPayload!
  login(input: LoginInput!): AuthPayload!
}

type AuthPayload {
  token: String!
  user: User!
}

input SignupInput {
  email: String!
  password: String!
  username: String!
}

input LoginInput {
  email: String!
  password: String!
}
```

### Example Mutations

**Signup:**
```graphql
mutation Signup {
  signup(input: {
    email: "user@example.com"
    password: "securePassword123"
    username: "fituser"
  }) {
    token
    user {
      id
      email
      username
    }
  }
}
```

**Login:**
```graphql
mutation Login {
  login(input: {
    email: "user@example.com"
    password: "securePassword123"
  }) {
    token
    user {
      id
      username
      level
    }
  }
}
```

---

## See Also

- [API Overview](./README.md)
- [Errors](./errors.md)
- [GraphQL](./graphql.md)

---

*Last updated: 2026-01-15*
