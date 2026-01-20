#!/bin/bash
# Automated Rollback Script
#
# Automatically rolls back to the last known good deployment when
# post-deploy validation fails. Can be triggered manually or by CI/CD.
#
# Usage:
#   ./scripts/deployment/auto-rollback.sh [options]
#
# Options:
#   --dry-run       Show what would be done without executing
#   --force         Skip confirmation prompt
#   --reason TEXT   Reason for rollback (logged)
#   --commit HASH   Rollback to specific commit (instead of last-good)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
DRY_RUN=false
FORCE=false
REASON=""
TARGET_COMMIT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --reason)
            REASON="$2"
            shift 2
            ;;
        --commit)
            TARGET_COMMIT="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

echo ""
echo -e "${YELLOW}🔄 AUTOMATED ROLLBACK${NC}"
echo "═══════════════════════════════════════════════════════════"

# Get current state
CURRENT_COMMIT=$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || echo "unknown")
CURRENT_SHORT=$(echo "$CURRENT_COMMIT" | cut -c1-7)

echo -e "Current commit: ${BLUE}$CURRENT_SHORT${NC}"

# Determine target commit
if [ -n "$TARGET_COMMIT" ]; then
    ROLLBACK_COMMIT="$TARGET_COMMIT"
    echo -e "Target commit (specified): ${GREEN}$(echo "$ROLLBACK_COMMIT" | cut -c1-7)${NC}"
else
    # Get last successful deployment
    ROLLBACK_COMMIT=$(npx tsx "$SCRIPT_DIR/deployment-tracker.ts" rollback-to 2>/dev/null || echo "")

    if [ -z "$ROLLBACK_COMMIT" ]; then
        echo -e "${RED}❌ No successful deployment found to rollback to${NC}"
        echo ""
        echo "Options:"
        echo "  1. Specify a commit: --commit <hash>"
        echo "  2. Check git log: git log --oneline -10"
        exit 1
    fi

    echo -e "Target commit (last-good): ${GREEN}$(echo "$ROLLBACK_COMMIT" | cut -c1-7)${NC}"
fi

# Check if already at target
if [ "$CURRENT_COMMIT" = "$ROLLBACK_COMMIT" ]; then
    echo -e "${YELLOW}⚠️  Already at target commit${NC}"
    exit 0
fi

# Get target commit info
TARGET_MESSAGE=$(git -C "$PROJECT_ROOT" log -1 --format=%s "$ROLLBACK_COMMIT" 2>/dev/null || echo "unknown")
TARGET_DATE=$(git -C "$PROJECT_ROOT" log -1 --format=%ci "$ROLLBACK_COMMIT" 2>/dev/null || echo "unknown")

echo ""
echo "Target commit details:"
echo "  Hash:    $ROLLBACK_COMMIT"
echo "  Date:    $TARGET_DATE"
echo "  Message: $TARGET_MESSAGE"

# Confirmation
if [ "$DRY_RUN" = true ]; then
    echo ""
    echo -e "${YELLOW}[DRY RUN] Would execute the following:${NC}"
    echo "  1. Stop PM2 processes"
    echo "  2. git reset --hard $ROLLBACK_COMMIT"
    echo "  3. pnpm install"
    echo "  4. pnpm build:intelligent"
    echo "  5. Start PM2 processes"
    echo "  6. Verify health check"
    exit 0
fi

if [ "$FORCE" != true ]; then
    echo ""
    echo -e "${YELLOW}⚠️  This will reset the server to a previous state${NC}"
    read -p "Continue with rollback? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Rollback cancelled"
        exit 0
    fi
fi

# Record rollback start
DEPLOY_ID=$(npx tsx "$SCRIPT_DIR/deployment-tracker.ts" record 2>/dev/null | jq -r '.id' || echo "")

echo ""
echo -e "${BLUE}Starting rollback...${NC}"

# Function to handle errors
cleanup_on_error() {
    echo -e "${RED}❌ Rollback failed at step: $1${NC}"
    if [ -n "$DEPLOY_ID" ]; then
        npx tsx "$SCRIPT_DIR/deployment-tracker.ts" update "$DEPLOY_ID" "failed" 2>/dev/null || true
    fi
    # Try to restart PM2 anyway
    pm2 start musclemap 2>/dev/null || true
}

trap 'cleanup_on_error "unknown"' ERR

# Step 1: Stop PM2
echo -e "\n${BLUE}[1/6] Stopping PM2 processes...${NC}"
pm2 stop musclemap 2>/dev/null || echo "PM2 process not running"

# Step 2: Git reset
echo -e "\n${BLUE}[2/6] Resetting to target commit...${NC}"
cd "$PROJECT_ROOT"
git fetch origin 2>/dev/null || true
git reset --hard "$ROLLBACK_COMMIT"

# Step 3: Install dependencies
echo -e "\n${BLUE}[3/6] Installing dependencies...${NC}"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Step 4: Build
echo -e "\n${BLUE}[4/6] Building application...${NC}"
pnpm build:intelligent

# Step 5: Start PM2
echo -e "\n${BLUE}[5/6] Starting PM2 processes...${NC}"
pm2 start musclemap || pm2 start ecosystem.config.cjs

# Step 6: Verify
echo -e "\n${BLUE}[6/6] Verifying rollback...${NC}"
sleep 5

# Health check
MAX_RETRIES=3
RETRY_COUNT=0
HEALTH_OK=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://musclemap.me/health 2>/dev/null || echo "000")

    if [ "$HTTP_STATUS" = "200" ]; then
        HEALTH_OK=true
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  Health check attempt $RETRY_COUNT: HTTP $HTTP_STATUS"
    sleep 3
done

if [ "$HEALTH_OK" = true ]; then
    echo -e "\n${GREEN}✅ Rollback successful!${NC}"
    echo "  Site is live at https://musclemap.me"

    # Update deployment tracker
    if [ -n "$DEPLOY_ID" ]; then
        npx tsx "$SCRIPT_DIR/deployment-tracker.ts" update "$DEPLOY_ID" "rolled_back" "" "$REASON" 2>/dev/null || true
    fi

    # Find the failed deployment and mark it
    # (This assumes the previous deployment that caused the rollback)

    echo ""
    echo "Rollback complete:"
    echo "  From: $CURRENT_SHORT"
    echo "  To:   $(echo "$ROLLBACK_COMMIT" | cut -c1-7)"
    [ -n "$REASON" ] && echo "  Reason: $REASON"
else
    echo -e "\n${RED}❌ Rollback verification failed!${NC}"
    echo "  Health check returned HTTP $HTTP_STATUS after $MAX_RETRIES attempts"
    echo ""
    echo "Manual intervention required:"
    echo "  1. Check PM2 logs: pm2 logs musclemap --lines 50"
    echo "  2. Check system: ssh -p 2222 root@musclemap.me"
    echo "  3. Consider reverting to an earlier commit"

    if [ -n "$DEPLOY_ID" ]; then
        npx tsx "$SCRIPT_DIR/deployment-tracker.ts" update "$DEPLOY_ID" "failed" "" "Health check failed after rollback" 2>/dev/null || true
    fi

    exit 1
fi
