# New Feature Checklist

> Complete these steps when implementing a new feature.

---

## Planning Phase

```
[ ] Feature requirements documented
[ ] User stories defined
[ ] Technical approach decided
[ ] Database schema changes identified
[ ] API endpoints planned
[ ] UI mockups reviewed (if applicable)
[ ] Security considerations reviewed
[ ] Estimated complexity assessed
```

---

## Implementation Phase

### Backend

```
[ ] Database migration created (if needed)
[ ] Migration tested locally
[ ] Service layer implemented
[ ] Input validation added (Zod)
[ ] GraphQL types defined
[ ] Resolvers implemented
[ ] REST endpoints added (if needed)
[ ] Error handling added
[ ] Authorization checks added
[ ] Unit tests written
[ ] Integration tests written
```

### Frontend

```
[ ] Components created
[ ] State management implemented
[ ] GraphQL queries/mutations added
[ ] Loading states added
[ ] Error states added
[ ] Responsive design verified
[ ] Accessibility checked
[ ] Performance optimized
[ ] Unit tests written
```

---

## Quality Checks

### Code Quality

```
[ ] pnpm typecheck passes
[ ] pnpm lint passes
[ ] No console.log statements
[ ] No commented-out code
[ ] No TODO comments (or tracked)
[ ] Follows coding standards
[ ] Code reviewed
```

### Testing

```
[ ] pnpm test passes
[ ] New tests have good coverage
[ ] Edge cases tested
[ ] Error cases tested
[ ] E2E test updated (if applicable)
[ ] Manual testing completed
```

### Security

```
[ ] Input validation on all user data
[ ] SQL queries parameterized
[ ] Authorization verified
[ ] No sensitive data exposure
[ ] Rate limiting considered
[ ] XSS protection verified
```

---

## Documentation

```
[ ] API documentation updated
[ ] Code comments added (where complex)
[ ] CHANGELOG updated
[ ] User guide updated (if user-facing)
[ ] README updated (if applicable)
```

---

## Pre-Deployment

```
[ ] All tests pass
[ ] Build succeeds
[ ] Migrations tested on staging
[ ] Feature flags set (if applicable)
[ ] Rollback plan documented
[ ] Monitoring alerts configured
```

---

## Deployment

```
[ ] Changes merged to main
[ ] Deployed to production
[ ] Migrations run
[ ] Smoke tests passed
[ ] Feature verified on live site
[ ] Monitoring checked
```

---

## Post-Deployment

```
[ ] Feature announced (if public)
[ ] User feedback monitored
[ ] Error rates monitored
[ ] Performance metrics checked
[ ] Documentation published
```

---

*Last updated: 2026-01-15*
