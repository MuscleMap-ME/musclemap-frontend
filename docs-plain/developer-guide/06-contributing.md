# Contributing Guide

> Help make MuscleMap better.

---

## Getting Started

### Prerequisites

1. Read the [Architecture](./01-architecture.md) documentation
2. Set up your [Local Environment](./02-local-setup.md)
3. Review the [Coding Standards](./03-coding-standards.md)

### Quick Start

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/musclemap.git
cd musclemap.me

# 3. Add upstream remote
git remote add upstream https://github.com/jeanpaulniko/musclemap.git

# 4. Install dependencies
pnpm install

# 5. Create feature branch
git checkout -b feature/your-feature
```

---

## Contribution Workflow

### Standard Flow

```
CONTRIBUTION FLOW
=================

1. FORK           Fork repo to your account
       │
       ▼
2. BRANCH         Create feature branch
       │
       ▼
3. DEVELOP        Make changes
       │
       ▼
4. TEST           Run tests, typecheck, lint
       │
       ▼
5. COMMIT         Commit with clear message
       │
       ▼
6. PUSH           Push to your fork
       │
       ▼
7. PR             Open pull request
       │
       ▼
8. REVIEW         Address feedback
       │
       ▼
9. MERGE          Maintainer merges
```

### Branch Naming

```
BRANCH NAMING
=============

feature/      New features
fix/          Bug fixes
refactor/     Code improvements
docs/         Documentation
test/         Test additions

Examples:
feature/nutrition-tracking
fix/workout-validation
refactor/tu-calculation
docs/api-reference
test/e2e-competitions
```

---

## Making Changes

### Code Changes

1. **Create branch** from main

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature
```

2. **Make changes** following coding standards

3. **Test your changes**

```bash
pnpm typecheck
pnpm lint
pnpm test
```

4. **Update tests** if needed

```bash
# Add tests for new features
# Update tests for changed behavior
```

5. **Update documentation** if needed

```bash
pnpm docs:generate  # For auto-generated docs
```

### Commit Messages

```
COMMIT FORMAT
=============

<type>(<scope>): <description>

[optional body]

[optional footer]

Types:
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Formatting
refactor: Code restructure
test:     Tests
chore:    Maintenance

Examples:
feat(workouts): add superset support
fix(auth): handle expired tokens gracefully
docs(api): update endpoint documentation
refactor(tu): simplify calculation logic
test(e2e): add competition flow tests
```

### Good Commit Messages

```bash
# GOOD: Clear and descriptive
git commit -m "feat(nutrition): add barcode scanning for food logging"
git commit -m "fix(workouts): prevent duplicate exercise entries"
git commit -m "refactor(stats): optimize TU calculation performance"

# BAD: Vague or unclear
git commit -m "fixed bug"
git commit -m "updates"
git commit -m "WIP"
```

---

## Pull Requests

### Creating a PR

1. **Push your branch**

```bash
git push origin feature/your-feature
```

2. **Open PR** on GitHub

3. **Fill out template**

```markdown
## Summary
Brief description of changes

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Added/updated tests
- [ ] All tests pass
- [ ] Tested manually

## Screenshots
(if applicable)

## Related Issues
Fixes #123
```

### PR Checklist

```
PR CHECKLIST
============

[ ] Code follows coding standards
[ ] All tests pass (pnpm test)
[ ] Type checks pass (pnpm typecheck)
[ ] Lint passes (pnpm lint)
[ ] Documentation updated (if needed)
[ ] Commit messages are clear
[ ] No console.logs or debug code
[ ] No hardcoded values
[ ] Proper error handling
[ ] Security considerations addressed
```

### Code Review

Expect reviewers to check:

- **Functionality**: Does it work correctly?
- **Code quality**: Is it clean and maintainable?
- **Tests**: Are there adequate tests?
- **Performance**: Any performance concerns?
- **Security**: Any security issues?
- **Documentation**: Is it documented?

### Addressing Feedback

```bash
# Make requested changes
# ...

# Commit fixes
git add .
git commit -m "address review feedback"

# Push updates
git push origin feature/your-feature
```

---

## Types of Contributions

### Bug Fixes

1. **Search existing issues** first
2. **Create issue** if not found
3. **Fix the bug**
4. **Add regression test**
5. **Submit PR**

```typescript
// Include test that would have caught the bug
it('should not crash on empty input', () => {
  expect(() => processInput([])).not.toThrow();
});
```

### New Features

1. **Discuss first** via issue or discussion
2. **Get approval** before major work
3. **Implement feature**
4. **Add tests**
5. **Update documentation**
6. **Submit PR**

### Documentation

1. **Find gaps** or errors
2. **Make improvements**
3. **Test rendering** (if applicable)
4. **Submit PR**

Documentation contributions are highly valued!

### Performance Improvements

1. **Profile first** to identify bottleneck
2. **Measure baseline** performance
3. **Implement optimization**
4. **Measure improvement**
5. **Submit PR** with benchmarks

---

## Development Tips

### Keep Changes Small

```
GOOD                          BAD
==========================    ==========================
One feature per PR            Multiple unrelated changes
< 500 lines changed           1000+ lines changed
Focused scope                 Kitchen sink PR
Easy to review                Hard to review
```

### Test Locally

```bash
# Before pushing, always run:
pnpm typecheck
pnpm lint
pnpm test

# For API changes:
pnpm test:e2e:api

# For comprehensive testing:
pnpm test:harness
```

### Keep Up to Date

```bash
# Regularly sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Rebase feature branch
git checkout feature/your-feature
git rebase main
```

---

## Getting Help

### Resources

| Resource | Location |
|----------|----------|
| Documentation | `/docs/` directory |
| Architecture | `docs/ARCHITECTURE.md` |
| Coding Guide | `docs/CODING-STYLE-GUIDE.md` |
| API Reference | `docs/API_REFERENCE.md` |

### Questions

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas
- **Code Comments**: Inline code questions

### Issue Templates

When creating issues:

```markdown
## Bug Report

**Describe the bug**
Clear description of the issue

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen

**Screenshots**
If applicable

**Environment**
- OS: [e.g., macOS 13]
- Browser: [e.g., Chrome 120]
- Node: [e.g., 20.10]
```

---

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Accept constructive criticism
- Focus on what's best for the project
- Show empathy towards others

### Unacceptable Behavior

- Harassment or discrimination
- Personal attacks
- Trolling or derogatory comments
- Publishing private information

### Enforcement

Violations may result in:
1. Warning
2. Temporary ban
3. Permanent ban

Report issues to maintainers.

---

## Recognition

Contributors are recognized:

- **CONTRIBUTORS.md**: Listed contributors
- **Release notes**: Feature credits
- **GitHub**: Contributor badge

Thank you for contributing to MuscleMap!

---

## See Also

- [Architecture](./01-architecture.md)
- [Local Setup](./02-local-setup.md)
- [Coding Standards](./03-coding-standards.md)
- [Testing](./04-testing.md)

---

*Last updated: 2026-01-15*
