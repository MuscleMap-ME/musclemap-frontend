#!/bin/bash
# ============================================
# HTTP-Based Deployment Script
# ============================================
# Uses the /api/deploy endpoints when SSH is unavailable
# Requires DEPLOY_ADMIN_TOKEN in .env
#
# Usage:
#   ./scripts/deploy-via-api.sh                    # Full deploy
#   ./scripts/deploy-via-api.sh quick              # Quick deploy (API only)
#   ./scripts/deploy-via-api.sh command git-pull   # Single command
#   ./scripts/deploy-via-api.sh status             # Check status
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_BASE="https://musclemap.me/api/deploy"

# Load token from .env
if [ -f "$PROJECT_ROOT/.env" ]; then
  export $(grep -E '^DEPLOY_ADMIN_TOKEN=' "$PROJECT_ROOT/.env" | xargs)
fi

if [ -z "$DEPLOY_ADMIN_TOKEN" ]; then
  echo "Error: DEPLOY_ADMIN_TOKEN not found in .env"
  echo ""
  echo "To set up:"
  echo "1. Log in as admin at https://musclemap.me"
  echo "2. Open DevTools → Application → Local Storage"
  echo "3. Copy the 'token' value"
  echo "4. Add to .env: DEPLOY_ADMIN_TOKEN=your_token_here"
  exit 1
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Execute a deployment command or sequence
execute_deploy() {
  local payload="$1"
  local description="$2"

  log_info "Executing: $description"

  response=$(curl -s -X POST "$API_BASE/execute" \
    -H "Authorization: Bearer $DEPLOY_ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload")

  # Check for error
  if echo "$response" | grep -q '"error"'; then
    log_error "Failed: $(echo "$response" | jq -r '.error.message // .error')"
    return 1
  fi

  # Get deployment ID and stream output
  deploy_id=$(echo "$response" | jq -r '.id // .deploymentId // empty')

  if [ -n "$deploy_id" ]; then
    log_info "Deployment ID: $deploy_id"
    log_info "Streaming output..."
    echo ""

    # Stream output using curl (SSE)
    curl -s -N "$API_BASE/stream/$deploy_id?token=$DEPLOY_ADMIN_TOKEN" 2>/dev/null | while IFS= read -r line; do
      # Parse SSE data
      if [[ "$line" == data:* ]]; then
        data="${line#data:}"
        # Extract message from JSON
        msg=$(echo "$data" | jq -r '.message // .output // .data // empty' 2>/dev/null)
        if [ -n "$msg" ]; then
          echo "$msg"
        fi
        # Check for completion
        status=$(echo "$data" | jq -r '.status // empty' 2>/dev/null)
        if [ "$status" = "completed" ] || [ "$status" = "success" ]; then
          echo ""
          log_success "Deployment completed successfully"
          break
        elif [ "$status" = "failed" ] || [ "$status" = "error" ]; then
          echo ""
          log_error "Deployment failed"
          break
        fi
      fi
    done
  else
    # Direct response (no streaming)
    echo "$response" | jq -r '.output // .message // .'
  fi
}

# Check deployment status
check_status() {
  log_info "Checking deployment status..."
  response=$(curl -s "$API_BASE/status" \
    -H "Authorization: Bearer $DEPLOY_ADMIN_TOKEN")
  echo "$response" | jq '.'
}

# Get available commands
list_commands() {
  log_info "Available deployment commands:"
  response=$(curl -s "$API_BASE/commands" \
    -H "Authorization: Bearer $DEPLOY_ADMIN_TOKEN")
  echo "$response" | jq '.'
}

# Main
case "${1:-full}" in
  full|full-deploy)
    log_info "Starting FULL deployment..."
    log_warn "This will: git-pull → pnpm-install → build-all → pm2-restart → health-check"
    execute_deploy '{"sequence": "full-deploy"}' "Full deployment sequence"
    ;;

  quick|quick-deploy)
    log_info "Starting QUICK deployment (API only)..."
    execute_deploy '{"sequence": "quick-deploy"}' "Quick deployment sequence"
    ;;

  frontend|frontend-deploy)
    log_info "Starting FRONTEND deployment..."
    execute_deploy '{"sequence": "frontend-deploy"}' "Frontend deployment sequence"
    ;;

  check|safe-check)
    log_info "Running pre-deploy checks..."
    execute_deploy '{"sequence": "safe-check"}' "Safe check sequence"
    ;;

  system|system-status)
    log_info "Checking system status..."
    execute_deploy '{"sequence": "system-status"}' "System status check"
    ;;

  command|cmd)
    if [ -z "$2" ]; then
      log_error "Usage: $0 command <command-name>"
      log_info "Available commands: git-pull, git-status, build-api, build-packages, pm2-restart, db-migrate, health-check"
      exit 1
    fi
    execute_deploy "{\"command\": \"$2\"}" "Command: $2"
    ;;

  status)
    check_status
    ;;

  commands|list)
    list_commands
    ;;

  migrate|db-migrate)
    log_info "Running database migrations..."
    execute_deploy '{"command": "db-migrate"}' "Database migration"
    ;;

  restart|pm2-restart)
    log_info "Restarting PM2..."
    execute_deploy '{"command": "pm2-restart"}' "PM2 restart"
    ;;

  pull|git-pull)
    log_info "Pulling latest code..."
    execute_deploy '{"command": "git-pull"}' "Git pull"
    ;;

  health|health-check)
    log_info "Running health check..."
    execute_deploy '{"command": "health-check"}' "Health check"
    ;;

  help|--help|-h)
    echo "HTTP-Based Deployment Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Sequences:"
    echo "  full, full-deploy      Full deployment (git-pull → install → build-all → restart)"
    echo "  quick, quick-deploy    Quick API deployment (git-pull → build-api → restart)"
    echo "  frontend               Frontend build only"
    echo "  check, safe-check      Pre-deploy quality checks"
    echo "  system, system-status  System health check"
    echo ""
    echo "Single Commands:"
    echo "  pull, git-pull         Pull latest code from GitHub"
    echo "  migrate, db-migrate    Run database migrations"
    echo "  restart, pm2-restart   Restart PM2 process"
    echo "  health, health-check   Check API health"
    echo "  command <name>         Run any available command"
    echo ""
    echo "Utility:"
    echo "  status                 Check current deployment status"
    echo "  commands, list         List all available commands"
    echo "  help                   Show this help"
    echo ""
    echo "Environment:"
    echo "  DEPLOY_ADMIN_TOKEN     Admin JWT token (required, set in .env)"
    ;;

  *)
    log_error "Unknown command: $1"
    echo "Use '$0 help' for usage information"
    exit 1
    ;;
esac
