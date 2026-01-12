# Contributing to MuscleMap

Thank you for your interest in contributing to MuscleMap! We're excited to have you help build the future of fitness visualization. This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Code Style](#code-style)
- [Testing](#testing)
- [Good First Issues](#good-first-issues)
- [Getting Help](#getting-help)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to conduct@musclemap.me.

## Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **pnpm** 9.x (we use pnpm for package management)
- **Git** 2.x or higher

### Quick Start

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/musclemap-frontend.git
cd musclemap-frontend

# 3. Add upstream remote
git remote add upstream https://github.com/musclemap/musclemap-frontend.git

# 4. Install dependencies
pnpm install

# 5. Start the mock development server (no backend required!)
pnpm dev:mock

# 6. Open http://localhost:5173 in your browser
```

### Running Without the Backend

MuscleMap uses **Mock Service Worker (MSW)** to enable frontend development without needing the actual backend. This is perfect for UI contributions:

```bash
# Start with mocked API
pnpm dev:mock
```

This provides:
- Mock authentication (demo@musclemap.me / demo123)
- Sample exercises and workouts
- All UI features functional

## Development Setup

### Environment

No environment variables are required for frontend-only development! The MSW mocks handle everything.

### Development Commands

```bash
# Start development server (with mocks)
pnpm dev:mock

# Start development server (requires backend)
pnpm dev

# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Run tests
pnpm test

# Run tests with coverage
pnpm test --coverage

# Build for production
pnpm build
```

## Project Structure

```
musclemap-frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── feedback/     # Bug report, feature suggestion forms
│   │   ├── muscle/       # 3D muscle visualization
│   │   ├── workout/      # Workout tracking UI
│   │   └── ui/           # Generic UI components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom React hooks
│   ├── store/            # Zustand state management
│   ├── contexts/         # React contexts
│   ├── graphql/          # GraphQL queries and mutations
│   ├── mocks/            # MSW mock handlers
│   ├── fixtures/         # Sample data for mocks
│   └── utils/            # Utility functions
├── packages/
│   └── contracts/        # Shared types (from @musclemap/contracts)
└── public/               # Static assets
```

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/muscle-heatmap` - New features
- `fix/login-button-disabled` - Bug fixes
- `docs/contributing-guide` - Documentation
- `refactor/workout-store` - Code improvements

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add muscle heatmap visualization
fix: prevent login button double-click
docs: update contributing guide
refactor: simplify workout state logic
test: add unit tests for muscle utils
style: format workout components
```

### Code Quality Checks

Before committing, ensure:

```bash
# Type checking passes
pnpm typecheck

# Linting passes
pnpm lint

# Tests pass
pnpm test

# Build succeeds
pnpm build
```

## Submitting a Pull Request

1. **Sync with upstream**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your branch**
   ```bash
   git push origin feature/your-feature
   ```

3. **Open a PR** on GitHub with:
   - Clear title describing the change
   - Description of what and why
   - Screenshots/videos for UI changes
   - Link to related issue (if any)

4. **Address review feedback** and keep your branch up to date

### PR Checklist

- [ ] Code follows the project style guidelines
- [ ] Tests added for new functionality
- [ ] All tests pass locally
- [ ] Documentation updated (if needed)
- [ ] No TypeScript errors
- [ ] No console errors or warnings
- [ ] Accessibility considered (keyboard nav, screen readers)

## Code Style

### TypeScript

- Enable strict mode
- Use explicit types for function parameters and returns
- Avoid `any` - use `unknown` if type is truly unknown
- Use interfaces for object shapes, types for unions/aliases

### React Components

- Function components with hooks
- Props interface defined above component
- Use custom hooks to extract complex logic
- Memoize expensive calculations with `useMemo`

### State Management

Follow the [State Management Guide](../CLAUDE.md#critical-state-management-architecture):

```typescript
// ✅ Good - Use selectors with Zustand
const sidebarOpen = useUIStore((state) => state.sidebarOpen);

// ❌ Bad - Subscribes to all state changes
const { sidebarOpen } = useUIStore();
```

### Styling

- Use Tailwind CSS utility classes
- Follow existing glassmorphism design patterns
- Ensure dark mode compatibility
- Test on mobile viewports

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/components/Button.test.tsx

# Run with watch mode
pnpm test --watch

# Run with coverage
pnpm test --coverage
```

### Writing Tests

```typescript
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked!')).toBeInTheDocument();
  });
});
```

## Good First Issues

New to the project? Look for issues labeled [`good first issue`](https://github.com/musclemap/musclemap-frontend/issues?q=is:open+label:"good+first+issue"). These are:

- Well-documented with clear requirements
- Limited in scope
- Don't require deep codebase knowledge
- Great for learning the codebase

## Getting Help

- **Questions**: Open a [Discussion](https://github.com/musclemap/musclemap-frontend/discussions)
- **Bug Reports**: Use the [Bug Report template](https://github.com/musclemap/musclemap-frontend/issues/new?template=bug_report.yml)
- **Feature Ideas**: Use the [Feature Request template](https://github.com/musclemap/musclemap-frontend/issues/new?template=feature_request.yml)

## Recognition

Contributors are recognized in:
- Our README contributors section
- Release notes for significant contributions
- The in-app "Contributors" page

Thank you for contributing to MuscleMap! 💪
