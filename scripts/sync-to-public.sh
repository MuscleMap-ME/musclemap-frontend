#!/bin/bash
# Sync public-safe files to MuscleMap-ME/musclemap-frontend
# This script exports only frontend code, excluding private/sensitive content

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PUBLIC_REPO_DIR="/tmp/musclemap-public-sync"
PUBLIC_REMOTE="git@github.com:MuscleMap-ME/musclemap-frontend.git"

echo "=== MuscleMap Public Repo Sync ==="
echo "Source: $PROJECT_ROOT"
echo "Target: $PUBLIC_REPO_DIR"
echo ""

# Clean and clone the public repo
rm -rf "$PUBLIC_REPO_DIR"
git clone "$PUBLIC_REMOTE" "$PUBLIC_REPO_DIR"

cd "$PUBLIC_REPO_DIR"

# Remove all existing files (except .git)
find . -maxdepth 1 -not -name '.git' -not -name '.' -exec rm -rf {} \;

echo "Copying public-safe files..."

# ===== FRONTEND SOURCE CODE =====
echo "  - src/ (frontend components)"
cp -r "$PROJECT_ROOT/src" .

# ===== SHARED PACKAGES =====
echo "  - packages/ (shared packages)"
mkdir -p packages
for pkg in shared core client ui contracts plugin-sdk; do
  if [ -d "$PROJECT_ROOT/packages/$pkg" ]; then
    cp -r "$PROJECT_ROOT/packages/$pkg" packages/
  fi
done

# ===== PUBLIC ASSETS =====
echo "  - public/ (static assets)"
cp -r "$PROJECT_ROOT/public" .

# ===== E2E TESTS =====
echo "  - e2e/ (end-to-end tests)"
if [ -d "$PROJECT_ROOT/e2e" ]; then
  cp -r "$PROJECT_ROOT/e2e" .
fi

# ===== CONFIGURATION FILES =====
echo "  - Configuration files"
cp "$PROJECT_ROOT/vite.config.js" . 2>/dev/null || true
cp "$PROJECT_ROOT/vitest.config.js" . 2>/dev/null || true
cp "$PROJECT_ROOT/tsconfig.json" . 2>/dev/null || true
cp "$PROJECT_ROOT/tsconfig.node.json" . 2>/dev/null || true
cp "$PROJECT_ROOT/tailwind.config.js" . 2>/dev/null || true
cp "$PROJECT_ROOT/postcss.config.js" . 2>/dev/null || true
cp "$PROJECT_ROOT/eslint.config.js" . 2>/dev/null || true
cp "$PROJECT_ROOT/index.html" . 2>/dev/null || true
cp "$PROJECT_ROOT/pnpm-workspace.yaml" . 2>/dev/null || true
cp "$PROJECT_ROOT/LICENSE" . 2>/dev/null || true

# ===== DOCUMENTATION (PUBLIC ONLY) =====
echo "  - docs/ (public documentation)"
mkdir -p docs
# Copy specific public-safe docs
for doc in CODING-STYLE-GUIDE.md SYSTEM-ARCHITECTURE.md SCALING-ARCHITECTURE-PLAN.md \
           DATABASE-OPTIMIZATION-PLAN.md SPA-UX-IMPROVEMENTS-PLAN.md; do
  if [ -f "$PROJECT_ROOT/docs/$doc" ]; then
    cp "$PROJECT_ROOT/docs/$doc" docs/
  fi
done
# Copy public subdirectory if exists
if [ -d "$PROJECT_ROOT/docs/public" ]; then
  cp -r "$PROJECT_ROOT/docs/public" docs/
fi

# ===== SCRIPTS (SAFE ONLY) =====
echo "  - scripts/ (development scripts only)"
mkdir -p scripts
# Copy only safe development scripts
for script in generate-docs.cjs generate-icons.cjs; do
  if [ -f "$PROJECT_ROOT/scripts/$script" ]; then
    cp "$PROJECT_ROOT/scripts/$script" scripts/
  fi
done
# Copy test harness if it exists
if [ -d "$PROJECT_ROOT/scripts/test-harness" ]; then
  cp -r "$PROJECT_ROOT/scripts/test-harness" scripts/
fi

# ===== GITHUB WORKFLOWS (SAFE ONLY) =====
echo "  - .github/ (CI workflows)"
mkdir -p .github/workflows
# Only copy test/lint workflows, not deployment
for workflow in test.yml lint.yml typecheck.yml ci.yml; do
  if [ -f "$PROJECT_ROOT/.github/workflows/$workflow" ]; then
    cp "$PROJECT_ROOT/.github/workflows/$workflow" .github/workflows/
  fi
done
# Copy issue/PR templates
if [ -d "$PROJECT_ROOT/.github/ISSUE_TEMPLATE" ]; then
  cp -r "$PROJECT_ROOT/.github/ISSUE_TEMPLATE" .github/
fi
if [ -f "$PROJECT_ROOT/.github/PULL_REQUEST_TEMPLATE.md" ]; then
  cp "$PROJECT_ROOT/.github/PULL_REQUEST_TEMPLATE.md" .github/
fi

# ===== PACKAGE.JSON (SANITIZED) =====
echo "  - package.json (sanitized)"
# Create a sanitized package.json without private scripts
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$PROJECT_ROOT/package.json', 'utf8'));

// Remove private scripts
const publicScripts = {
  'dev': pkg.scripts?.dev || 'vite',
  'build': pkg.scripts?.build || 'vite build',
  'preview': pkg.scripts?.preview || 'vite preview',
  'test': pkg.scripts?.test || 'vitest',
  'test:ui': pkg.scripts?.['test:ui'] || 'vitest --ui',
  'typecheck': pkg.scripts?.typecheck || 'tsc --noEmit',
  'lint': pkg.scripts?.lint || 'eslint .',
  'lint:fix': pkg.scripts?.['lint:fix'] || 'eslint . --fix',
  'format': pkg.scripts?.format || 'prettier --write .',
};

// Keep only scripts that don't reference private tools
const sanitizedPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description || 'MuscleMap - Fitness tracking with real-time muscle visualization',
  type: pkg.type,
  license: 'AGPL-3.0',
  author: pkg.author,
  homepage: 'https://musclemap.me',
  repository: {
    type: 'git',
    url: 'https://github.com/MuscleMap-ME/musclemap-frontend.git'
  },
  scripts: publicScripts,
  dependencies: pkg.dependencies,
  devDependencies: pkg.devDependencies,
  engines: pkg.engines,
};

fs.writeFileSync('./package.json', JSON.stringify(sanitizedPkg, null, 2));
console.log('    Created sanitized package.json');
"

# ===== LOCK FILE =====
echo "  - pnpm-lock.yaml"
cp "$PROJECT_ROOT/pnpm-lock.yaml" . 2>/dev/null || true

# ===== CREATE PUBLIC .gitignore =====
echo "  - .gitignore (public version)"
cat > .gitignore << 'GITIGNORE'
# Dependencies
node_modules/
.pnpm-store/

# Build output
dist/
build/

# Cache
.vite/
.cache/
*.tsbuildinfo

# Environment
.env
.env.*
!.env.example

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Test coverage
coverage/

# Logs
*.log
npm-debug.log*
pnpm-debug.log*
GITIGNORE

# ===== CREATE .env.example =====
echo "  - .env.example"
cat > .env.example << 'ENVEXAMPLE'
# MuscleMap Frontend Configuration
# Copy this file to .env and fill in your values

# API URL (required)
VITE_API_URL=https://musclemap.me/api

# Optional: Analytics
# VITE_GA_ID=G-XXXXXXXXXX

# Optional: Feature flags
# VITE_ENABLE_BETA_FEATURES=false
ENVEXAMPLE

# ===== SECURITY CHECK =====
echo ""
echo "=== Security Check ==="

# Check for sensitive files that should NOT be present
SENSITIVE_PATTERNS=(
  "*.pem"
  "*.key"
  "*.crt"
  "*.p12"
  "id_rsa*"
  "id_ed25519*"
  ".env"
  "ecosystem.config.cjs"
  "CLAUDE.md"
  "cron-jobs.js"
  "deploy*.sh"
  "*-cache*.mjs"
  "build-daemon.mjs"
  "webhook*.js"
  "approved-commands.txt"
)

FOUND_SENSITIVE=0
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
  matches=$(find . -name "$pattern" -not -path "./.git/*" 2>/dev/null)
  if [ -n "$matches" ]; then
    echo "  WARNING: Found sensitive file matching '$pattern':"
    echo "$matches" | sed 's/^/    /'
    FOUND_SENSITIVE=1
  fi
done

# Check for private directories
PRIVATE_DIRS=("apps/api" "private" ".claude" "docs/business" "docs/plans" "docs/analysis")
for dir in "${PRIVATE_DIRS[@]}"; do
  if [ -d "./$dir" ]; then
    echo "  WARNING: Found private directory: $dir"
    FOUND_SENSITIVE=1
  fi
done

if [ $FOUND_SENSITIVE -eq 0 ]; then
  echo "  All clear - no sensitive files detected"
fi

# ===== SHOW SUMMARY =====
echo ""
echo "=== Sync Summary ==="
echo "Files ready in: $PUBLIC_REPO_DIR"
echo ""
echo "To review changes:"
echo "  cd $PUBLIC_REPO_DIR && git status"
echo ""
echo "To commit and push:"
echo "  cd $PUBLIC_REPO_DIR"
echo "  git add -A"
echo "  git commit -m 'Sync frontend changes from private repo'"
echo "  git push origin main"
echo ""

# If --push flag provided, automatically commit and push
if [ "$1" = "--push" ]; then
  echo "=== Auto-pushing to public repo ==="
  git add -A

  # Get the latest commit message from the private repo
  COMMIT_MSG=$(cd "$PROJECT_ROOT" && git log -1 --pretty=format:"%s")

  git commit -m "Sync: $COMMIT_MSG" -m "Synced from private repository" || echo "Nothing to commit"
  git push origin main
  echo ""
  echo "=== Push complete ==="
fi
