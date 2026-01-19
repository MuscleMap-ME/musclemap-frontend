# Error Handling

> Understanding and handling API errors.

---

## Error Response Format

All errors follow a consistent format:

### REST API Errors

```json
{
  "error": "Validation Error",
  "message": "Email is required",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "details": {
    "field": "email",
    "constraint": "required"
  }
}
```

### GraphQL Errors

```json
{
  "errors": [
    {
      "message": "User not found",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["user"],
      "extensions": {
        "code": "NOT_FOUND",
        "statusCode": 404
      }
    }
  ],
  "data": null
}
```

---

## HTTP Status Codes

### Success Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource created |
| 204 | No Content | Successful deletion |

### Client Error Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Permission denied |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable | Validation failed |
| 429 | Too Many Requests | Rate limited |

### Server Error Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 500 | Internal Error | Server error |
| 502 | Bad Gateway | Upstream error |
| 503 | Service Unavailable | Maintenance |

---

## Error Codes Reference

### Authentication Errors

```
AUTH_REQUIRED
-------------
Status: 401
Message: Authentication required
Solution: Include valid Bearer token

INVALID_TOKEN
-------------
Status: 401
Message: Invalid or malformed token
Solution: Check token format, re-login

TOKEN_EXPIRED
-------------
Status: 401
Message: Token has expired
Solution: Re-login to get new token

INVALID_CREDENTIALS
-------------------
Status: 400
Message: Email or password is incorrect
Solution: Verify credentials, reset password
```

### Authorization Errors

```
FORBIDDEN
---------
Status: 403
Message: You don't have permission
Solution: Check user role/permissions

NOT_OWNER
---------
Status: 403
Message: You don't own this resource
Solution: Can only modify own resources

INSUFFICIENT_CREDITS
--------------------
Status: 403
Message: Not enough credits
Solution: Purchase credits or subscribe
```

### Validation Errors

```
VALIDATION_ERROR
----------------
Status: 400
Message: Input validation failed
Details: { field, constraint, value }

Example:
{
  "code": "VALIDATION_ERROR",
  "message": "Password must be at least 8 characters",
  "details": {
    "field": "password",
    "constraint": "minLength",
    "expected": 8,
    "received": 5
  }
}
```

### Resource Errors

```
NOT_FOUND
---------
Status: 404
Message: Resource not found
Example: "Workout with id xyz not found"

ALREADY_EXISTS
--------------
Status: 409
Message: Resource already exists
Example: "Email already registered"

CONFLICT
--------
Status: 409
Message: Resource conflict
Example: "Username already taken"
```

### Rate Limiting Errors

```
RATE_LIMITED
------------
Status: 429
Message: Too many requests
Headers: Retry-After: 60

{
  "code": "RATE_LIMITED",
  "message": "Rate limit exceeded",
  "retryAfter": 60,
  "limit": 100,
  "remaining": 0,
  "resetAt": "2026-01-15T12:05:00Z"
}
```

---

## Error Handling Patterns

### JavaScript/TypeScript

```typescript
try {
  const response = await fetch('/api/workouts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(workout)
  });

  if (!response.ok) {
    const error = await response.json();

    switch (error.code) {
      case 'UNAUTHORIZED':
        // Redirect to login
        router.push('/login');
        break;
      case 'VALIDATION_ERROR':
        // Show field error
        setFieldError(error.details.field, error.message);
        break;
      case 'RATE_LIMITED':
        // Wait and retry
        await delay(error.retryAfter * 1000);
        return retry();
      default:
        // Show generic error
        showToast(error.message);
    }
  }

  return await response.json();
} catch (error) {
  // Network error
  showToast('Network error. Please try again.');
}
```

### Apollo Client

```typescript
const [createWorkout, { error }] = useMutation(CREATE_WORKOUT, {
  onError: (error) => {
    const code = error.graphQLErrors?.[0]?.extensions?.code;

    switch (code) {
      case 'UNAUTHORIZED':
        logout();
        break;
      case 'INSUFFICIENT_CREDITS':
        showCreditModal();
        break;
      default:
        showToast(error.message);
    }
  }
});
```

### React Error Boundary

```typescript
class APIErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

---

## Validation Error Details

### Field Validation

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "errors": [
      {
        "field": "email",
        "message": "Invalid email format",
        "constraint": "email"
      },
      {
        "field": "password",
        "message": "Must be at least 8 characters",
        "constraint": "minLength",
        "expected": 8
      },
      {
        "field": "exercises",
        "message": "At least one exercise required",
        "constraint": "minItems",
        "expected": 1
      }
    ]
  }
}
```

### Common Constraints

| Constraint | Description | Example |
|------------|-------------|---------|
| required | Field is required | "Email is required" |
| email | Valid email format | "Invalid email" |
| minLength | Minimum string length | "Min 8 characters" |
| maxLength | Maximum string length | "Max 100 characters" |
| min | Minimum number value | "Must be at least 1" |
| max | Maximum number value | "Cannot exceed 1000" |
| minItems | Minimum array items | "At least 1 required" |
| pattern | Regex pattern match | "Invalid format" |
| enum | Must be one of values | "Invalid option" |

---

## Retry Strategies

### Exponential Backoff

```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        await delay(retryAfter * 1000);
        continue;
      }

      if (response.status >= 500) {
        const backoff = Math.pow(2, attempt) * 1000;
        await delay(backoff);
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      const backoff = Math.pow(2, attempt) * 1000;
      await delay(backoff);
    }
  }
}
```

### When to Retry

| Error Type | Retry? | Strategy |
|------------|--------|----------|
| 400 Bad Request | No | Fix input |
| 401 Unauthorized | No | Re-authenticate |
| 403 Forbidden | No | Check permissions |
| 404 Not Found | No | Resource missing |
| 429 Rate Limited | Yes | Wait Retry-After |
| 500 Server Error | Yes | Exponential backoff |
| Network Error | Yes | Exponential backoff |

---

## Best Practices

### Do

```
✓ Handle all error codes appropriately
✓ Show user-friendly error messages
✓ Log errors for debugging
✓ Implement retry for transient errors
✓ Handle network failures gracefully
✓ Use error boundaries in React
```

### Don't

```
✗ Expose internal error details to users
✗ Retry infinitely
✗ Ignore rate limiting
✗ Swallow errors silently
✗ Show technical error messages to users
✗ Retry non-retryable errors
```

---

## See Also

- [Authentication](./authentication.md)
- [GraphQL](./graphql.md)
- [API Reference](./README.md)

---

*Last updated: 2026-01-15*
