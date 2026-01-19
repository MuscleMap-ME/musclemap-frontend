# Checklists

> Ready-to-use checklists for common workflows.

---

## Available Checklists

| Checklist | Use Case |
|-----------|----------|
| [Deployment](./deployment.md) | Before deploying to production |
| [New Feature](./new-feature.md) | When adding new functionality |
| [Security](./security.md) | Security review checklist |
| [Code Review](./code-review.md) | Reviewing pull requests |

---

## Quick Reference

### Deployment Checklist (Summary)

```
PRE-DEPLOYMENT
[ ] All tests pass (pnpm test)
[ ] Type check passes (pnpm typecheck)
[ ] Lint passes (pnpm lint)
[ ] No console.logs in production code
[ ] Migrations tested locally

DEPLOYMENT
[ ] Merge worktrees (./scripts/merge-all.sh)
[ ] Run test harness (pnpm test:harness)
[ ] Deploy (./deploy.sh "message")
[ ] Run migrations if needed

POST-DEPLOYMENT
[ ] Health check passes
[ ] Smoke test key features
[ ] Monitor logs for errors
```

[Full checklist →](./deployment.md)

---

### New Feature Checklist (Summary)

```
PLANNING
[ ] Requirements clear
[ ] API endpoints designed
[ ] Database changes identified
[ ] UI mockups reviewed

IMPLEMENTATION
[ ] Backend code complete
[ ] Frontend code complete
[ ] Tests written
[ ] Documentation updated

REVIEW
[ ] Code review passed
[ ] E2E tests added
[ ] Performance checked
```

[Full checklist →](./new-feature.md)

---

### Security Checklist (Summary)

```
INPUT VALIDATION
[ ] All user input validated
[ ] SQL queries parameterized
[ ] No string interpolation in queries

AUTHENTICATION
[ ] Routes properly protected
[ ] JWT tokens validated
[ ] Sensitive routes require re-auth

DATA PROTECTION
[ ] Sensitive data encrypted
[ ] No secrets in code
[ ] HTTPS enforced
```

[Full checklist →](./security.md)

---

### Code Review Checklist (Summary)

```
CORRECTNESS
[ ] Logic is correct
[ ] Edge cases handled
[ ] Error handling present

QUALITY
[ ] Code is readable
[ ] No unnecessary complexity
[ ] Follows coding standards

SECURITY
[ ] No vulnerabilities introduced
[ ] Input properly validated
[ ] No sensitive data exposed
```

[Full checklist →](./code-review.md)

---

*Select a checklist above for the complete version.*
