# Reference

> Quick reference materials for MuscleMap.

---

## Reference Index

| Document | Description |
|----------|-------------|
| [Database Schema](./database-schema.md) | Tables, columns, relationships |
| [Environment Variables](./environment-vars.md) | Configuration options |
| [CLI Commands](./cli-commands.md) | Development commands |
| [Glossary](./glossary.md) | Terms and definitions |

---

## Quick References

### Common CLI Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build:all        # Build everything
pnpm typecheck        # Type check
pnpm test             # Run tests
pnpm lint             # Lint code

# Database
pnpm -C apps/api db:migrate   # Run migrations
pnpm -C apps/api db:seed      # Seed data
pnpm -C apps/api db:rollback  # Rollback migration

# Services
./scripts/musclemap-start.sh --all   # Start all services
./scripts/musclemap-stop.sh          # Stop all services

# Deployment
./scripts/merge-all.sh               # Merge worktrees
./deploy.sh "message"                # Deploy to production
```

---

### Environment Variables

```bash
# Required
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/musclemap
JWT_SECRET=your-secret-key-minimum-32-characters

# Optional
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_...
```

---

### HTTP Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable | Validation failed |
| 429 | Rate Limited | Too many requests |
| 500 | Server Error | Internal error |

---

### API Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication needed |
| `INVALID_TOKEN` | JWT token invalid |
| `TOKEN_EXPIRED` | JWT token expired |
| `FORBIDDEN` | Not authorized |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Input validation failed |
| `INSUFFICIENT_CREDITS` | Not enough credits |
| `RATE_LIMITED` | Too many requests |
| `SERVER_ERROR` | Internal server error |

---

### TU Multipliers

| Muscle Group | Multiplier |
|--------------|------------|
| Quadriceps | 1.00 |
| Glutes | 0.90 |
| Lats | 0.80 |
| Hamstrings | 0.70 |
| Chest | 0.60 |
| Shoulders | 0.50 |
| Core | 0.40 |
| Triceps | 0.35 |
| Biceps | 0.30 |
| Calves | 0.25 |
| Forearms | 0.20 |

---

### Level Progression (General)

| Level | TU Required | Total TU |
|-------|-------------|----------|
| 1 → 2 | 100 | 100 |
| 2 → 3 | 200 | 300 |
| 3 → 4 | 300 | 600 |
| 4 → 5 | 400 | 1,000 |
| 5 → 6 | 500 | 1,500 |
| 6 → 7 | 700 | 2,200 |
| 7 → 8 | 800 | 3,000 |
| 8 → 9 | 1,000 | 4,000 |
| 9 → 10 | 1,500 | 5,500 |

---

### Credits Economy

| Action | Credits |
|--------|---------|
| Sign up | +100 |
| Generate workout | -25 |
| First workout | +10 |
| Level up | +25 |
| Weekly achievement | +5-20 |

---

*See individual reference documents for more details.*
