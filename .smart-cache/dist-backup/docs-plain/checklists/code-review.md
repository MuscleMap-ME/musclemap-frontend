# Code Review Checklist

> Use this checklist when reviewing pull requests.

---

## General

```
[ ] PR description is clear and complete
[ ] Changes match the described intent
[ ] No unrelated changes included
[ ] Commit messages are meaningful
[ ] Branch is up to date with main
```

---

## Code Quality

```
[ ] Code is readable and maintainable
[ ] Follows project coding standards
[ ] No code duplication
[ ] Functions are appropriately sized
[ ] Variables have meaningful names
[ ] No magic numbers (use constants)
[ ] No commented-out code
[ ] No debug statements (console.log)
```

---

## TypeScript

```
[ ] No `any` types (or justified)
[ ] Proper type definitions
[ ] No type assertions without validation
[ ] Interface/type naming consistent
[ ] Generic types used appropriately
[ ] Strict null checks handled
```

---

## React (Frontend)

```
[ ] Components properly structured
[ ] Hooks follow rules (top-level only)
[ ] Dependencies in useEffect complete
[ ] No unnecessary re-renders
[ ] Keys used properly in lists
[ ] Error boundaries where needed
[ ] Loading states handled
[ ] Accessibility considered
```

---

## State Management

```
[ ] Appropriate state location
[ ] Zustand selectors used (not full store)
[ ] Apollo used for server data
[ ] No prop drilling (use context/store)
[ ] Optimistic updates where appropriate
```

---

## API/Backend

```
[ ] Input validation with Zod
[ ] Authorization checks present
[ ] Error handling complete
[ ] No N+1 queries
[ ] Transactions for multi-table writes
[ ] Proper HTTP status codes
[ ] Response format consistent
```

---

## Database

```
[ ] Migrations are reversible
[ ] Indexes added for new queries
[ ] No raw SQL string interpolation
[ ] Keyset pagination (not OFFSET)
[ ] Foreign keys have indexes
[ ] Proper data types used
```

---

## Security

```
[ ] No SQL injection possible
[ ] No XSS vulnerabilities
[ ] Authorization verified
[ ] Sensitive data protected
[ ] Input sanitized
[ ] Rate limiting considered
```

---

## Testing

```
[ ] New code has tests
[ ] Tests are meaningful (not just coverage)
[ ] Edge cases covered
[ ] Error cases tested
[ ] Tests are not flaky
[ ] Test names are descriptive
```

---

## Performance

```
[ ] No obvious performance issues
[ ] Large lists paginated
[ ] Images optimized
[ ] Lazy loading where appropriate
[ ] Expensive operations memoized
[ ] No unnecessary API calls
```

---

## Documentation

```
[ ] Complex logic commented
[ ] Public APIs documented
[ ] README updated (if needed)
[ ] Breaking changes noted
```

---

## Final Checks

```
[ ] CI/CD passes
[ ] Works locally (tested)
[ ] No merge conflicts
[ ] Approved by required reviewers
```

---

*Last updated: 2026-01-15*
