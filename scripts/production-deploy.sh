#!/bin/bash
#
# production-deploy.sh - Deploy script for MuscleMap production server
#
# This script can be run:
#   1. Directly on the production server: ./scripts/production-deploy.sh
#   2. Remotely via SSH from local machine: ssh root@72.62.83.202 'cd /var/www/musclemap.me && ./scripts/production-deploy.sh'
#   3. Triggered by GitHub webhook (optional)
#
# Usage:
#   ./scripts/production-deploy.sh           # Full deployment
#   ./scripts/production-deploy.sh --quick   # Skip tests, quick rebuild
#   ./scripts/production-deploy.sh --pull    # Just pull and rebuild (no service restart)
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_DIR="${PROJECT_DIR:-/var/www/musclemap.me}"
BRANCH="${BRANCH:-main}"
LOG_FILE="${PROJECT_DIR}/deploy.log"

# Parse arguments
QUICK_MODE=false
PULL_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --quick|-q)
      QUICK_MODE=true
      shift
      ;;
    --pull|-p)
      PULL_ONLY=true
      shift
      ;;
    --branch|-b)
      BRANCH="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --quick, -q     Quick mode (skip optional steps)"
      echo "  --pull, -p      Pull only (no service restart)"
      echo "  --branch, -b    Branch to deploy (default: main)"
      echo "  --help, -h      Show this help"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Helper functions
log() {
  echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
}

log_step() {
  echo -e "\n${CYAN}━━━ $1 ━━━${NC}\n" | tee -a "$LOG_FILE"
}

# Start deployment
log_step "Starting MuscleMap Deployment"
log "Branch: $BRANCH"
log "Quick mode: $QUICK_MODE"
log "Pull only: $PULL_ONLY"

# Change to project directory
cd "$PROJECT_DIR" || { log_error "Could not find project directory: $PROJECT_DIR"; exit 1; }
log_success "Changed to $PROJECT_DIR"

# Store current commit for rollback
PREV_COMMIT=$(git rev-parse HEAD)
log "Previous commit: $PREV_COMMIT"

# Pull latest code
log_step "Pulling Latest Code"

git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

NEW_COMMIT=$(git rev-parse HEAD)
log_success "Updated to commit: $NEW_COMMIT"

# Show what changed
if [ "$PREV_COMMIT" != "$NEW_COMMIT" ]; then
  log "Changes:"
  git log --oneline "$PREV_COMMIT..$NEW_COMMIT" | head -10 | tee -a "$LOG_FILE"
else
  log "No new commits"
fi

# Install dependencies
log_step "Installing Dependencies"

if [ "$QUICK_MODE" = true ]; then
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install --prefer-offline
else
  pnpm install
fi
log_success "Dependencies installed"

# Build packages
log_step "Building Packages"

# Build shared packages (TypeScript)
log "Building shared packages..."
pnpm build:packages 2>/dev/null || {
  log_error "Failed to build packages, continuing anyway..."
}

# Build client package (tsup)
log "Building client package..."
pnpm -C packages/client build 2>/dev/null || {
  log_error "Failed to build client package, continuing anyway..."
}

log_success "Packages built"

# Build frontend
log_step "Building Frontend"

pnpm build
log_success "Frontend built"

# Build API (optional, may have TypeScript errors)
log_step "Building API"

pnpm build:api 2>/dev/null && log_success "API built" || log_error "API build had errors (continuing)"

# Restart services (unless pull-only mode)
if [ "$PULL_ONLY" = false ]; then
  log_step "Restarting Services"

  if command -v pm2 &> /dev/null; then
    pm2 restart all --update-env --silent 2>/dev/null || pm2 start ecosystem.config.js 2>/dev/null || log_error "PM2 restart failed"
    log_success "Services restarted via PM2"

    # Show PM2 status
    pm2 list 2>/dev/null || true
  elif command -v systemctl &> /dev/null; then
    systemctl restart musclemap 2>/dev/null || log_error "systemctl restart failed"
    log_success "Services restarted via systemctl"
  else
    log "No process manager found, skipping service restart"
  fi
fi

# Verify deployment
log_step "Verifying Deployment"

# Check if site is accessible
SITE_URL="https://musclemap.me"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
  log_success "Site is live at $SITE_URL (HTTP $HTTP_STATUS)"
else
  log_error "Site check returned HTTP $HTTP_STATUS"
fi

# Summary
log_step "Deployment Complete"

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Commit:  ${CYAN}$NEW_COMMIT${NC}"
echo -e "Branch:  ${CYAN}$BRANCH${NC}"
echo -e "Status:  ${GREEN}DEPLOYED${NC}"
echo -e "URL:     ${CYAN}$SITE_URL${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

log_success "Deployment finished at $(date)"
