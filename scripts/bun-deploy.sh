#!/bin/bash
# =============================================================================
# Bun Deployment Script
# =============================================================================
#
# This script prepares the production server for running MuscleMap with Bun.
#
# The challenge: Bun scans node_modules at startup and loads native .node files
# which triggers libuv functions (uv_thread_self) that Bun doesn't implement.
#
# Solution: Remove problematic native modules from node_modules AFTER pnpm install.
#
# Usage:
#   ./scripts/bun-deploy.sh [options]
#
# Options:
#   --local     Run locally (for testing)
#   --dry-run   Show what would be done without executing
#   --force     Skip confirmation prompts
#
# =============================================================================

set -e

# Configuration
REMOTE_USER="root"
REMOTE_HOST="musclemap.me"
REMOTE_PORT="2222"
REMOTE_PATH="/var/www/musclemap.me"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
LOCAL_MODE=false
DRY_RUN=false
FORCE=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --local) LOCAL_MODE=true ;;
        --dry-run) DRY_RUN=true ;;
        --force) FORCE=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Modules that cause libuv issues with Bun
PROBLEMATIC_MODULES=(
    "ffi-napi"
    "ref-napi"
    "ref-struct-di"
    "ref-array-di"
    "sharp"
    "better-sqlite3"
)

# Function to remove problematic modules
remove_native_modules() {
    local base_path="$1"

    log_info "Removing problematic native modules from node_modules..."

    for module in "${PROBLEMATIC_MODULES[@]}"; do
        # Check in regular node_modules
        if [ -d "$base_path/node_modules/$module" ]; then
            if [ "$DRY_RUN" = true ]; then
                echo "  Would remove: $base_path/node_modules/$module"
            else
                rm -rf "$base_path/node_modules/$module"
                echo "  Removed: node_modules/$module"
            fi
        fi

        # Check in pnpm store (hoisted modules)
        local pnpm_paths=$(find "$base_path/node_modules/.pnpm" -maxdepth 1 -type d -name "${module}@*" 2>/dev/null || true)
        for pnpm_path in $pnpm_paths; do
            if [ -d "$pnpm_path" ]; then
                if [ "$DRY_RUN" = true ]; then
                    echo "  Would remove: $pnpm_path"
                else
                    rm -rf "$pnpm_path"
                    echo "  Removed: $(basename $pnpm_path)"
                fi
            fi
        done

        # Also check in nested node_modules
        local nested_paths=$(find "$base_path/node_modules" -type d -name "$module" 2>/dev/null || true)
        for nested_path in $nested_paths; do
            if [ -d "$nested_path" ]; then
                if [ "$DRY_RUN" = true ]; then
                    echo "  Would remove: $nested_path"
                else
                    rm -rf "$nested_path"
                    echo "  Removed: $(echo $nested_path | sed "s|$base_path/||")"
                fi
            fi
        done
    done

    log_success "Native modules removed"
}

# Function to update ecosystem config for Bun
update_ecosystem_config() {
    local base_path="$1"
    local ecosystem_file="$base_path/private/ecosystem.config.cjs"

    log_info "Ensuring ecosystem.config.cjs uses Bun interpreter..."

    if [ "$DRY_RUN" = true ]; then
        echo "  Would update: $ecosystem_file"
        echo "  - Set interpreter: /root/.bun/bin/bun"
        echo "  - Set exec_mode: fork"
        echo "  - Set USE_NATIVE: false"
        return
    fi

    # The ecosystem config should already be set up for Bun
    # This is just a verification
    if grep -q "interpreter: '/root/.bun/bin/bun'" "$ecosystem_file" 2>/dev/null; then
        log_success "Ecosystem config already configured for Bun"
    else
        log_warn "Ecosystem config may need manual update for Bun"
        echo "  Expected: interpreter: '/root/.bun/bin/bun'"
    fi
}

# Function to deploy to remote server
deploy_remote() {
    log_info "Starting Bun deployment to $REMOTE_HOST..."

    if [ "$FORCE" != true ]; then
        read -p "This will deploy to production. Continue? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_warn "Deployment cancelled"
            exit 0
        fi
    fi

    local SSH_CMD="ssh -p $REMOTE_PORT $REMOTE_USER@$REMOTE_HOST"

    # Step 1: Pull latest code
    log_info "Pulling latest code..."
    if [ "$DRY_RUN" != true ]; then
        $SSH_CMD "cd $REMOTE_PATH && git pull"
    fi

    # Step 2: Install dependencies
    log_info "Installing dependencies..."
    if [ "$DRY_RUN" != true ]; then
        $SSH_CMD "cd $REMOTE_PATH && pnpm install"
    fi

    # Step 3: Remove problematic native modules
    log_info "Removing native modules that crash Bun..."
    if [ "$DRY_RUN" != true ]; then
        for module in "${PROBLEMATIC_MODULES[@]}"; do
            $SSH_CMD "cd $REMOTE_PATH && rm -rf node_modules/$module 2>/dev/null || true"
            $SSH_CMD "cd $REMOTE_PATH && find node_modules/.pnpm -maxdepth 1 -type d -name '${module}@*' -exec rm -rf {} + 2>/dev/null || true"
            $SSH_CMD "cd $REMOTE_PATH && find node_modules -type d -name '$module' -exec rm -rf {} + 2>/dev/null || true"
        done
    else
        echo "  Would remove: ${PROBLEMATIC_MODULES[*]}"
    fi

    # Step 4: Build (packages and API only - frontend was rsync'd)
    log_info "Building packages and API..."
    if [ "$DRY_RUN" != true ]; then
        $SSH_CMD "cd $REMOTE_PATH && pnpm build:packages && pnpm build:api"
    fi

    # Step 5: Restart PM2 with Bun
    log_info "Restarting PM2..."
    if [ "$DRY_RUN" != true ]; then
        $SSH_CMD "cd $REMOTE_PATH && pm2 restart musclemap --silent"
    fi

    # Step 6: Verify health
    log_info "Checking health endpoint..."
    sleep 3
    if [ "$DRY_RUN" != true ]; then
        local health_response=$(curl -s "https://$REMOTE_HOST/health" || echo '{"status":"error"}')
        if echo "$health_response" | grep -q '"status":"ok"'; then
            log_success "Health check passed!"
            echo "$health_response" | jq . 2>/dev/null || echo "$health_response"
        else
            log_error "Health check failed!"
            echo "$health_response"
            log_info "Checking PM2 logs..."
            $SSH_CMD "pm2 logs musclemap --lines 30 --nostream"
            exit 1
        fi
    fi

    log_success "Bun deployment complete!"
}

# Function to deploy locally (for testing)
deploy_local() {
    log_info "Running local Bun deployment test..."

    local base_path="$(cd "$(dirname "$0")/.." && pwd)"

    # Remove problematic modules
    remove_native_modules "$base_path"

    # Test that the API can start with Bun
    log_info "Testing API startup with Bun..."
    if [ "$DRY_RUN" != true ]; then
        cd "$base_path/apps/api"

        # Try to start with Bun for 5 seconds
        timeout 5 bun src/index.ts 2>&1 || true

        if [ $? -eq 124 ]; then
            # Timeout means it didn't crash - success!
            log_success "Bun startup test passed (no libuv crash)"
        else
            log_warn "Bun startup test had issues - check output above"
        fi
    fi

    log_success "Local deployment test complete"
}

# Main
echo "=============================================="
echo "  MuscleMap Bun Deployment"
echo "=============================================="
echo ""

if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN MODE - No changes will be made"
    echo ""
fi

if [ "$LOCAL_MODE" = true ]; then
    deploy_local
else
    deploy_remote
fi
