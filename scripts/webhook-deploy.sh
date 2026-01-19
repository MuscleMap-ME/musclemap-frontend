#!/bin/bash
# =============================================================================
# MuscleMap GitHub Webhook Deploy Handler
# =============================================================================
#
# This script is called by the webhook listener when GitHub sends a push event.
# It validates the webhook signature, then triggers a deploy.
#
# Usage:
#   ./scripts/webhook-deploy.sh <signature> <payload>
#
# Environment:
#   WEBHOOK_SECRET - GitHub webhook secret for signature validation
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/musclemap/webhook-deploy.log"
LOCK_FILE="/tmp/musclemap-webhook-deploy.lock"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "[$(date -Iseconds)] $1" | tee -a "$LOG_FILE"
}

# Validate webhook signature
validate_signature() {
    local signature="$1"
    local payload="$2"
    local secret="${WEBHOOK_SECRET:-}"

    if [ -z "$secret" ]; then
        log "ERROR: WEBHOOK_SECRET not set"
        return 1
    fi

    # GitHub sends signature as "sha256=..."
    local expected_sig="sha256=$(echo -n "$payload" | openssl dgst -sha256 -hmac "$secret" | awk '{print $2}')"

    if [ "$signature" != "$expected_sig" ]; then
        log "ERROR: Invalid webhook signature"
        log "  Received: $signature"
        log "  Expected: $expected_sig"
        return 1
    fi

    log "Webhook signature validated"
    return 0
}

# Check if deploy is already running
check_lock() {
    if [ -d "$LOCK_FILE" ]; then
        local lock_age=$(($(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || stat -f %m "$LOCK_FILE" 2>/dev/null)))
        if [ "$lock_age" -lt 600 ]; then
            log "Deploy already in progress (lock age: ${lock_age}s)"
            return 1
        fi
        log "Removing stale lock (age: ${lock_age}s)"
        rm -rf "$LOCK_FILE"
    fi
    mkdir -p "$LOCK_FILE"
    return 0
}

# Release lock
release_lock() {
    rm -rf "$LOCK_FILE"
}

# Run the deploy
run_deploy() {
    log "Starting deploy..."

    cd "$PROJECT_DIR"

    # Pull latest changes
    log "Pulling latest changes..."
    git pull origin main 2>&1 | tee -a "$LOG_FILE"

    # Install dependencies
    log "Installing dependencies..."
    pnpm install 2>&1 | tee -a "$LOG_FILE"

    # Run the memory-safe build
    log "Running build..."
    if [ -f "$SCRIPT_DIR/build-safe.sh" ]; then
        "$SCRIPT_DIR/build-safe.sh" 2>&1 | tee -a "$LOG_FILE"
    else
        pnpm build:all 2>&1 | tee -a "$LOG_FILE"
    fi

    # Restart PM2
    log "Restarting PM2..."
    pm2 restart musclemap 2>&1 | tee -a "$LOG_FILE" || pm2 start ecosystem.config.cjs --env production 2>&1 | tee -a "$LOG_FILE"

    log "Deploy complete!"
}

# Main
main() {
    local signature="${1:-}"
    local payload="${2:-}"
    local branch=""

    log "========================================"
    log "Webhook received"

    # If called with signature and payload, validate
    if [ -n "$signature" ] && [ -n "$payload" ]; then
        if ! validate_signature "$signature" "$payload"; then
            exit 1
        fi

        # Extract branch from payload
        branch=$(echo "$payload" | grep -o '"ref":"[^"]*"' | head -1 | sed 's/"ref":"refs\/heads\///' | sed 's/"//')
        log "Push to branch: $branch"

        # Only deploy on main branch
        if [ "$branch" != "main" ]; then
            log "Ignoring push to non-main branch: $branch"
            exit 0
        fi
    else
        log "No signature provided - running manual deploy"
    fi

    # Check for existing deploy
    if ! check_lock; then
        exit 1
    fi

    # Ensure lock is released on exit
    trap 'release_lock' EXIT INT TERM

    # Run deploy
    run_deploy

    log "========================================"
}

main "$@"
