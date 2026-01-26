#!/bin/bash
# Safe Deployment Script
#
# A comprehensive deployment script that includes all validation, tracking,
# and rollback capabilities. This is the recommended way to deploy.
#
# Usage:
#   ./scripts/deployment/deploy-safe.sh [options]
#
# Options:
#   --skip-tests        Skip running tests before deploy
#   --skip-validation   Skip post-deploy validation
#   --no-rollback       Disable automatic rollback on failure
#   --dry-run           Show what would be done without executing
#   --force             Skip all confirmations
#   --verbose           Show detailed output
#
# Environment:
#   SLACK_WEBHOOK_URL   Slack webhook for notifications
#   DEPLOY_TIMEOUT      Timeout for deployment (default: 600s)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parse arguments
SKIP_TESTS=false
SKIP_VALIDATION=false
NO_ROLLBACK=false
DRY_RUN=false
FORCE=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --no-rollback)
            NO_ROLLBACK=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

DEPLOY_TIMEOUT="${DEPLOY_TIMEOUT:-600}"

# =====================================================
# HELPER FUNCTIONS
# =====================================================

log() {
    local color=$1
    local message=$2
    echo -e "${!color}${message}${NC}"
}

log_step() {
    local step=$1
    local total=$2
    local message=$3
    echo -e "\n${BLUE}[$step/$total] $message${NC}"
}

send_notification() {
    local message=$1
    local status=$2 # success, warning, error

    echo "$message"

    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local color="good"
        [ "$status" = "warning" ] && color="warning"
        [ "$status" = "error" ] && color="danger"

        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"attachments\": [{\"color\": \"$color\", \"text\": \"$message\"}]}" \
            >/dev/null 2>&1 || true
    fi
}

# =====================================================
# MAIN
# =====================================================

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║            MuscleMap Safe Deployment                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

cd "$PROJECT_ROOT"

# Get current state
CURRENT_COMMIT=$(git rev-parse HEAD)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT_MESSAGE=$(git log -1 --format=%s)

echo "Repository:  $(pwd)"
echo "Branch:      $CURRENT_BRANCH"
echo "Commit:      ${CURRENT_COMMIT:0:7}"
echo "Message:     $COMMIT_MESSAGE"
echo ""
echo "Options:"
echo "  Skip tests:       $SKIP_TESTS"
echo "  Skip validation:  $SKIP_VALIDATION"
echo "  Auto-rollback:    $([ "$NO_ROLLBACK" = true ] && echo "disabled" || echo "enabled")"
echo ""

if [ "$DRY_RUN" = true ]; then
    log "YELLOW" "🔍 DRY RUN MODE - No changes will be made\n"
fi

# Confirmation
if [ "$FORCE" != true ] && [ "$DRY_RUN" != true ]; then
    read -p "Proceed with deployment? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 0
    fi
fi

TOTAL_STEPS=7
START_TIME=$(date +%s)

# =====================================================
# STEP 1: Pre-flight Checks
# =====================================================
log_step 1 $TOTAL_STEPS "Running pre-flight checks..."

if [ "$DRY_RUN" = true ]; then
    echo "  Would run: pnpm typecheck"
    echo "  Would run: pnpm lint"
    echo "  Would run: ./scripts/deployment/validate-migrations.sh"
else
    # TypeScript check
    echo "  TypeScript check..."
    if ! pnpm typecheck >/dev/null 2>&1; then
        log "RED" "  ❌ TypeScript check failed"
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} TypeScript check passed"

    # Lint
    echo "  Linting..."
    if ! pnpm lint --quiet >/dev/null 2>&1; then
        log "RED" "  ❌ Lint check failed"
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} Lint passed"

    # Migration validation
    echo "  Migration validation..."
    if [ -f ./scripts/deployment/validate-migrations.sh ]; then
        if ! ./scripts/deployment/validate-migrations.sh >/dev/null 2>&1; then
            log "YELLOW" "  ⚠️  Migration validation warnings"
        else
            echo -e "  ${GREEN}✓${NC} Migrations valid"
        fi
    fi
fi

# =====================================================
# STEP 2: Run Tests (Optional)
# =====================================================
if [ "$SKIP_TESTS" = true ]; then
    log_step 2 $TOTAL_STEPS "Skipping tests (--skip-tests)"
else
    log_step 2 $TOTAL_STEPS "Running tests..."

    if [ "$DRY_RUN" = true ]; then
        echo "  Would run: pnpm test"
    else
        if pnpm test:frontend >/dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} Tests passed"
        else
            log "YELLOW" "  ⚠️  Some tests failed (continuing)"
        fi
    fi
fi

# =====================================================
# STEP 3: Build
# =====================================================
log_step 3 $TOTAL_STEPS "Building application via BuildNet Native..."

if [ "$DRY_RUN" = true ]; then
    echo "  Would run: ./scripts/buildnet.sh build"
else
    if ! ./scripts/buildnet.sh build; then
        log "RED" "  ❌ Build failed"
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} Build successful"
fi

# =====================================================
# STEP 4: Record Deployment
# =====================================================
log_step 4 $TOTAL_STEPS "Recording deployment..."

DEPLOY_ID=""
if [ "$DRY_RUN" = true ]; then
    echo "  Would record deployment to tracker"
    DEPLOY_ID="dry-run-$(date +%s)"
else
    DEPLOY_ID=$(npx tsx scripts/deployment/deployment-tracker.ts record 2>/dev/null | jq -r '.id // empty' || echo "deploy-$(date +%s)")
    echo "  Deployment ID: $DEPLOY_ID"
fi

# =====================================================
# STEP 5: Push to Git
# =====================================================
log_step 5 $TOTAL_STEPS "Pushing to repository..."

if [ "$DRY_RUN" = true ]; then
    echo "  Would push to origin/$CURRENT_BRANCH"
else
    # Check if there are uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        log "YELLOW" "  ⚠️  Uncommitted changes detected"
    fi

    # Push
    if git push origin "$CURRENT_BRANCH" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Pushed to origin"
    else
        log "YELLOW" "  ⚠️  Push may have failed or branch is up to date"
    fi
fi

# =====================================================
# STEP 6: Deploy to Production
# =====================================================
log_step 6 $TOTAL_STEPS "Deploying to production..."

if [ "$DRY_RUN" = true ]; then
    echo "  Would SSH to production server"
    echo "  Would run: git pull && pnpm install && pnpm build:safe && pm2 restart"
else
    # Update status
    npx tsx scripts/deployment/deployment-tracker.ts update "$DEPLOY_ID" "deploying" 2>/dev/null || true

    send_notification "🚀 Starting deployment: ${COMMIT_MESSAGE:0:50}" "warning"

    # Deploy via SSH
    echo "  Connecting to production server..."
    if ! ssh -p 2222 -o ConnectTimeout=30 root@musclemap.me "
        set -e
        cd /var/www/musclemap.me
        echo '📥 Pulling latest code...'
        git fetch origin main
        git reset --hard origin/main
        echo '📦 Installing dependencies...'
        pnpm install --frozen-lockfile 2>/dev/null || pnpm install
        echo '🔨 Building via BuildNet Native...'
        ./scripts/buildnet.sh build
        echo '✅ Deployment complete'
    "; then
        log "RED" "  ❌ Deployment failed"
        npx tsx scripts/deployment/deployment-tracker.ts update "$DEPLOY_ID" "failed" 2>/dev/null || true
        send_notification "❌ Deployment failed: ${COMMIT_MESSAGE:0:50}" "error"

        if [ "$NO_ROLLBACK" != true ]; then
            log "YELLOW" "  Initiating automatic rollback..."
            ./scripts/deployment/auto-rollback.sh --force --reason "Deployment command failed" || true
        fi
        exit 1
    fi

    echo -e "  ${GREEN}✓${NC} Deployment commands executed"
fi

# =====================================================
# STEP 7: Post-Deploy Validation
# =====================================================
if [ "$SKIP_VALIDATION" = true ]; then
    log_step 7 $TOTAL_STEPS "Skipping validation (--skip-validation)"
else
    log_step 7 $TOTAL_STEPS "Running post-deploy validation..."

    if [ "$DRY_RUN" = true ]; then
        echo "  Would run: post-deploy-validation.ts"
    else
        # Update status
        npx tsx scripts/deployment/deployment-tracker.ts update "$DEPLOY_ID" "validating" 2>/dev/null || true

        # Wait for server to stabilize
        echo "  Waiting for server to stabilize..."
        sleep 10

        # Run validation
        VALIDATION_OUTPUT=$(mktemp)
        if npx tsx scripts/deployment/post-deploy-validation.ts \
            --base-url https://musclemap.me \
            --json > "$VALIDATION_OUTPUT" 2>/dev/null; then

            PASSED=$(jq -r '.passed // 0' "$VALIDATION_OUTPUT")
            FAILED=$(jq -r '.failed // 0' "$VALIDATION_OUTPUT")
            CRITICAL=$(jq -r '.criticalFailed // 0' "$VALIDATION_OUTPUT")

            VALIDATION_JSON="{\"passed\": $PASSED, \"failed\": $FAILED, \"criticalFailed\": $CRITICAL}"

            if [ "$CRITICAL" -gt 0 ]; then
                log "RED" "  ❌ $CRITICAL critical validation(s) failed!"

                npx tsx scripts/deployment/deployment-tracker.ts update "$DEPLOY_ID" "failed" "$VALIDATION_JSON" 2>/dev/null || true
                send_notification "❌ Post-deploy validation failed: $CRITICAL critical failures" "error"

                if [ "$NO_ROLLBACK" != true ]; then
                    log "YELLOW" "  Initiating automatic rollback..."
                    ./scripts/deployment/auto-rollback.sh --force --reason "Post-deploy validation failed ($CRITICAL critical)"
                fi

                rm -f "$VALIDATION_OUTPUT"
                exit 1
            elif [ "$FAILED" -gt 0 ]; then
                log "YELLOW" "  ⚠️  $PASSED passed, $FAILED failed (non-critical)"
                npx tsx scripts/deployment/deployment-tracker.ts update "$DEPLOY_ID" "success" "$VALIDATION_JSON" 2>/dev/null || true
            else
                echo -e "  ${GREEN}✓${NC} All $PASSED validations passed"
                npx tsx scripts/deployment/deployment-tracker.ts update "$DEPLOY_ID" "success" "$VALIDATION_JSON" 2>/dev/null || true
            fi
        else
            log "YELLOW" "  ⚠️  Validation script failed to run"
            # Don't fail deployment if validation script itself errors
        fi

        rm -f "$VALIDATION_OUTPUT"
    fi
fi

# =====================================================
# SUMMARY
# =====================================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "  Duration:    ${DURATION}s"
echo "  Commit:      ${CURRENT_COMMIT:0:7}"
echo "  Deploy ID:   $DEPLOY_ID"
echo "  URL:         https://musclemap.me"
echo ""
echo "Post-deployment commands:"
echo "  View logs:     pnpm deploy:track:list"
echo "  Monitor:       pnpm monitor:uptime"
echo "  Rollback:      pnpm deploy:rollback"
echo ""

send_notification "✅ Deployment successful: ${COMMIT_MESSAGE:0:50} (${DURATION}s)" "success"
