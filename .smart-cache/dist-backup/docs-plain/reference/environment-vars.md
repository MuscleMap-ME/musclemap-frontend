# Environment Variables

> Configuration reference for MuscleMap.

---

## API Server (apps/api/.env)

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | API server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/musclemap` |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars) | `your-very-long-secret-key-here-minimum-32` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `CORS_ORIGIN` | Allowed CORS origins | `*` |

### External Services

| Variable | Description | Required For |
|----------|-------------|--------------|
| `STRIPE_SECRET_KEY` | Stripe API key | Payment processing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | Payment webhooks |
| `OPENAI_API_KEY` | OpenAI API key | AI workout generation |
| `SENTRY_DSN` | Sentry error tracking | Error monitoring |
| `SENDGRID_API_KEY` | SendGrid API key | Email notifications |

---

## Example .env File

```env
# Server
NODE_ENV=development
PORT=3001

# Database (required)
DATABASE_URL=postgresql://postgres:password@localhost:5432/musclemap

# Authentication (required)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Cache (optional)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=debug

# CORS
CORS_ORIGIN=http://localhost:5173

# Payments (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AI (optional)
OPENAI_API_KEY=sk-...

# Error Tracking (optional)
SENTRY_DSN=https://...@sentry.io/...

# Email (optional)
SENDGRID_API_KEY=SG...
```

---

## Production Considerations

### Security

```
IMPORTANT: In production, ensure:

1. JWT_SECRET is truly random and secure
   - Use: openssl rand -hex 32
   - Never commit to version control

2. DATABASE_URL uses SSL
   - Append ?ssl=true or ?sslmode=require

3. CORS_ORIGIN is specific
   - Don't use * in production
   - List allowed domains explicitly
```

### Performance

```env
# Production optimizations
NODE_ENV=production
LOG_LEVEL=warn

# Redis required for production
REDIS_URL=redis://localhost:6379
```

---

## Frontend (.env)

The frontend uses environment variables prefixed with `VITE_`:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | API base URL | `https://musclemap.me` |
| `VITE_GRAPHQL_URL` | GraphQL endpoint | `https://musclemap.me/graphql` |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe publishable key | `pk_live_...` |

### Example

```env
# Frontend .env
VITE_API_URL=http://localhost:3001
VITE_GRAPHQL_URL=http://localhost:3001/graphql
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

---

## Variable Validation

MuscleMap validates environment variables on startup:

```typescript
// Required variables throw error if missing
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}
```

---

## See Also

- [Local Setup](../developer-guide/02-local-setup.md)
- [Deployment](../developer-guide/05-deployment.md)

---

*Last updated: 2026-01-15*
