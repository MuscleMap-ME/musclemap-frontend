#!/bin/bash
# =============================================================================
# MuscleMap Repository Split Script
# =============================================================================
# This script splits the monorepo into public frontend and private backend repos
# using git-filter-repo for clean history separation.
#
# Prerequisites:
#   - git-filter-repo: pip install git-filter-repo
#   - GitHub CLI: brew install gh
#
# Usage:
#   ./scripts/split-repos.sh [--dry-run]
#
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WORK_DIR="${PROJECT_ROOT}/.repo-split-work"
DRY_RUN=false

# Repository names
PUBLIC_REPO="musclemap-frontend"
PRIVATE_REPO="musclemap-backend"
GITHUB_ORG="musclemap"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v git-filter-repo &> /dev/null; then
        log_error "git-filter-repo is required. Install with: pip install git-filter-repo"
        exit 1
    fi

    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI is required. Install with: brew install gh"
        exit 1
    fi

    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI not authenticated. Run: gh auth login"
        exit 1
    fi

    log_success "All prerequisites met"
}

# Files/directories to include in public frontend repo
PUBLIC_PATHS=(
    "src/"
    "public/"
    "packages/contracts/"
    "packages/ui/"
    "index.html"
    "vite.config.ts"
    "tsconfig.json"
    "tsconfig.node.json"
    "tailwind.config.js"
    "postcss.config.js"
    "eslint.config.js"
    ".prettierrc"
    ".github/ISSUE_TEMPLATE/"
    ".github/PULL_REQUEST_TEMPLATE.md"
    ".github/workflows/ci.yml"
    "docs/CONTRIBUTING.md"
    "docs/SECURITY.md"
    "README.md"
    "LICENSE"
)

# Files/directories to EXCLUDE from public repo (sensitive backend)
PRIVATE_PATHS=(
    "apps/api/"
    "apps/mobile/"
    "packages/core/"
    "packages/client/"
    "packages/plugin-sdk/"
    "packages/shared/"
    "native/"
    "plugins/"
    "scripts/"
    "ecosystem.config.cjs"
    "deploy.sh"
    ".env*"
    "CLAUDE.md"
)

# Create path filter file for git-filter-repo
create_path_filter() {
    local filter_file="$1"
    local mode="$2"  # "include" or "exclude"

    > "$filter_file"

    if [[ "$mode" == "include" ]]; then
        # For public repo: include only these paths
        for path in "${PUBLIC_PATHS[@]}"; do
            echo "regex:^${path}" >> "$filter_file"
        done
    else
        # For private repo: exclude public-only paths
        for path in "${PRIVATE_PATHS[@]}"; do
            echo "regex:^${path}" >> "$filter_file"
        done
    fi
}

# Split frontend (public) repository
split_frontend() {
    log_info "Creating public frontend repository..."

    local frontend_dir="${WORK_DIR}/${PUBLIC_REPO}"

    # Clone fresh copy
    rm -rf "$frontend_dir"
    git clone "$PROJECT_ROOT" "$frontend_dir"
    cd "$frontend_dir"

    # Remove remote to prevent accidental pushes
    git remote remove origin

    # Create paths file
    local paths_file="${WORK_DIR}/frontend-paths.txt"
    create_path_filter "$paths_file" "include"

    log_info "Filtering repository to frontend-only paths..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log_warn "DRY RUN: Would filter to paths:"
        cat "$paths_file"
    else
        git-filter-repo --paths-from-file "$paths_file" --force

        # Clean up any remaining sensitive files
        rm -rf apps/ packages/core packages/client packages/plugin-sdk packages/shared native/ plugins/ scripts/ .env* 2>/dev/null || true

        # Add public-specific files
        cat > README.md << 'EOF'
# MuscleMap Frontend

The open-source frontend for MuscleMap - visualize your muscles, track your gains.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start with mock API (no backend needed!)
pnpm dev:mock

# Open http://localhost:5173
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.
EOF

        git add -A
        git commit -m "chore: prepare for public release" --allow-empty || true
    fi

    log_success "Frontend repository prepared at: $frontend_dir"
}

# Split backend (private) repository
split_backend() {
    log_info "Creating private backend repository..."

    local backend_dir="${WORK_DIR}/${PRIVATE_REPO}"

    # Clone fresh copy
    rm -rf "$backend_dir"
    git clone "$PROJECT_ROOT" "$backend_dir"
    cd "$backend_dir"

    # Remove remote
    git remote remove origin

    log_info "Backend repository is a full copy (private, includes everything)"

    if [[ "$DRY_RUN" == "false" ]]; then
        # Update package.json to reference @musclemap/contracts from npm
        if [[ -f "package.json" ]]; then
            # Add contracts as npm dependency instead of workspace reference
            sed -i.bak 's|"@musclemap/contracts": "workspace:\*"|"@musclemap/contracts": "^1.0.0"|g' package.json 2>/dev/null || true
            rm -f package.json.bak
        fi

        git add -A
        git commit -m "chore: update to use published contracts package" --allow-empty || true
    fi

    log_success "Backend repository prepared at: $backend_dir"
}

# Create GitHub repositories
create_github_repos() {
    log_info "Creating GitHub repositories..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log_warn "DRY RUN: Would create:"
        log_warn "  - ${GITHUB_ORG}/${PUBLIC_REPO} (public)"
        log_warn "  - ${GITHUB_ORG}/${PRIVATE_REPO} (private)"
        return
    fi

    # Create public frontend repo
    if ! gh repo view "${GITHUB_ORG}/${PUBLIC_REPO}" &> /dev/null; then
        gh repo create "${GITHUB_ORG}/${PUBLIC_REPO}" \
            --public \
            --description "MuscleMap Frontend - Open source fitness visualization" \
            --homepage "https://musclemap.me"
        log_success "Created public repo: ${GITHUB_ORG}/${PUBLIC_REPO}"
    else
        log_warn "Public repo already exists: ${GITHUB_ORG}/${PUBLIC_REPO}"
    fi

    # Create private backend repo
    if ! gh repo view "${GITHUB_ORG}/${PRIVATE_REPO}" &> /dev/null; then
        gh repo create "${GITHUB_ORG}/${PRIVATE_REPO}" \
            --private \
            --description "MuscleMap Backend - Private API and business logic"
        log_success "Created private repo: ${GITHUB_ORG}/${PRIVATE_REPO}"
    else
        log_warn "Private repo already exists: ${GITHUB_ORG}/${PRIVATE_REPO}"
    fi
}

# Push to GitHub
push_to_github() {
    log_info "Pushing to GitHub..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log_warn "DRY RUN: Would push repositories to GitHub"
        return
    fi

    # Push frontend
    cd "${WORK_DIR}/${PUBLIC_REPO}"
    git remote add origin "git@github.com:${GITHUB_ORG}/${PUBLIC_REPO}.git"
    git push -u origin main --force
    log_success "Pushed frontend to GitHub"

    # Push backend
    cd "${WORK_DIR}/${PRIVATE_REPO}"
    git remote add origin "git@github.com:${GITHUB_ORG}/${PRIVATE_REPO}.git"
    git push -u origin main --force
    log_success "Pushed backend to GitHub"
}

# Main execution
main() {
    echo "============================================="
    echo "  MuscleMap Repository Split Script"
    echo "============================================="
    echo ""

    if [[ "$DRY_RUN" == "true" ]]; then
        log_warn "Running in DRY RUN mode - no changes will be made"
        echo ""
    fi

    check_prerequisites

    # Create work directory
    mkdir -p "$WORK_DIR"

    split_frontend
    split_backend

    echo ""
    log_info "Repository split complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Review the split repos in: $WORK_DIR"
    echo "  2. Run without --dry-run to create GitHub repos"
    echo "  3. Set up branch protection on public repo"
    echo "  4. Configure secrets in GitHub Actions"
    echo "  5. Publish @musclemap/contracts to npm"
    echo ""

    if [[ "$DRY_RUN" == "false" ]]; then
        read -p "Create GitHub repositories and push? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            create_github_repos
            push_to_github

            echo ""
            log_success "All done! Repositories are live on GitHub"
            echo ""
            echo "Public:  https://github.com/${GITHUB_ORG}/${PUBLIC_REPO}"
            echo "Private: https://github.com/${GITHUB_ORG}/${PRIVATE_REPO}"
        fi
    fi
}

main "$@"
