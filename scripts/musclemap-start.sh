#!/bin/bash
#
# MuscleMap Local Development Services - START
#
# PERFORMANCE OPTIMIZED:
#   - Parallel service startup where possible
#   - Faster status checks using pgrep/lsof instead of brew services
#   - Reduced wait times with exponential backoff
#   - Background initialization for faster perceived startup
#
# Usage:
#   ./scripts/musclemap-start.sh              # Start core services (PostgreSQL, Redis)
#   ./scripts/musclemap-start.sh --api        # Also start the API server
#   ./scripts/musclemap-start.sh --dev        # Also start Vite dev server
#   ./scripts/musclemap-start.sh --bug-hunter # Also start bug-hunter daemon (local)
#   ./scripts/musclemap-start.sh --bug-hunter-prod # Also start bug-hunter daemon (production)
#   ./scripts/musclemap-start.sh --all        # Start everything (including bug-hunter local)
#   ./scripts/musclemap-start.sh --status     # Just show status (fast)
#   ./scripts/musclemap-start.sh --fast       # Skip wait-for-ready checks
#
# To stop services, run:
#   ./scripts/musclemap-stop.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directory (use relative path if possible for portability)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MuscleMap Services - Starting (Fast) ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Parse arguments
START_API=false
START_DEV=false
START_BUG_HUNTER=false
START_BUG_HUNTER_PROD=false
STATUS_ONLY=false
FAST_MODE=false

for arg in "$@"; do
  case $arg in
    --api)
      START_API=true
      ;;
    --dev)
      START_DEV=true
      ;;
    --bug-hunter)
      START_BUG_HUNTER=true
      ;;
    --bug-hunter-prod)
      START_BUG_HUNTER_PROD=true
      ;;
    --all)
      START_API=true
      START_DEV=true
      START_BUG_HUNTER=true
      ;;
    --status)
      STATUS_ONLY=true
      ;;
    --fast|-f)
      FAST_MODE=true
      ;;
    --help|-h)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --api              Also start the API server"
      echo "  --dev              Also start Vite dev server"
      echo "  --bug-hunter       Start bug-hunter daemon (tests local dev server)"
      echo "  --bug-hunter-prod  Start bug-hunter daemon (tests production)"
      echo "  --all              Start everything (core + API + dev + bug-hunter local)"
      echo "  --status           Just show status (fast check)"
      echo "  --fast, -f         Skip wait-for-ready checks"
      echo "  --help, -h         Show this help"
      exit 0
      ;;
  esac
done

# Fast service check using process detection instead of brew services
check_postgres_fast() {
  pgrep -x postgres >/dev/null 2>&1 || pgrep -f "postgres.*5432" >/dev/null 2>&1
}

check_redis_fast() {
  pgrep -x redis-server >/dev/null 2>&1 || lsof -i:6379 >/dev/null 2>&1
}

check_pm2_running() {
  pm2 list 2>/dev/null | grep -q "musclemap.*online"
}

check_vite_running() {
  pgrep -f "vite" >/dev/null 2>&1 || lsof -i:5173 >/dev/null 2>&1
}

check_bug_hunter_running() {
  pgrep -f "bug-hunter.*daemon" >/dev/null 2>&1 || pgrep -f "tsx.*bug-hunter" >/dev/null 2>&1
}

check_bug_hunter_prod_running() {
  pgrep -f "bug-hunter.*production" >/dev/null 2>&1
}

# Show status only (FAST)
if [ "$STATUS_ONLY" = true ]; then
  echo -e "${BLUE}Service Status (fast check):${NC}"
  echo ""

  # PostgreSQL
  if check_postgres_fast; then
    echo -e "  ${GREEN}✓${NC} PostgreSQL running"
  else
    echo -e "  ${YELLOW}○${NC} PostgreSQL not running"
  fi

  # Redis
  if check_redis_fast; then
    echo -e "  ${GREEN}✓${NC} Redis running"
  else
    echo -e "  ${YELLOW}○${NC} Redis not running"
  fi

  # PM2/API
  if command -v pm2 &>/dev/null && check_pm2_running; then
    echo -e "  ${GREEN}✓${NC} API server running (PM2)"
  else
    echo -e "  ${YELLOW}○${NC} API server not running"
  fi

  # Vite
  if check_vite_running; then
    echo -e "  ${GREEN}✓${NC} Vite dev server running"
  else
    echo -e "  ${YELLOW}○${NC} Vite dev server not running"
  fi

  # Bug Hunter (local)
  if check_bug_hunter_running; then
    echo -e "  ${GREEN}✓${NC} Bug Hunter daemon running (local)"
  else
    echo -e "  ${YELLOW}○${NC} Bug Hunter daemon not running (local)"
  fi

  # Bug Hunter (production)
  if check_bug_hunter_prod_running; then
    echo -e "  ${GREEN}✓${NC} Bug Hunter daemon running (production)"
  else
    echo -e "  ${YELLOW}○${NC} Bug Hunter daemon not running (production)"
  fi

  exit 0
fi

# Start brew service with fast check
start_brew_service() {
  local service=$1
  local display_name=$2
  local check_func=$3

  if $check_func; then
    echo -e "${GREEN}  ✓ $display_name already running${NC}"
    return 0
  fi

  echo -e "${YELLOW}Starting $display_name...${NC}"
  brew services start "$service" 2>/dev/null || true
  echo -e "${GREEN}  ✓ $display_name started${NC}"
}

# Wait for PostgreSQL with exponential backoff
wait_for_postgres() {
  if [[ "$FAST_MODE" == "true" ]]; then
    echo -e "${YELLOW}  Skipping ready check (--fast mode)${NC}"
    return 0
  fi

  local max_attempts=15
  local attempt=0
  local wait_time=0.2

  while [ $attempt -lt $max_attempts ]; do
    if pg_isready -q 2>/dev/null; then
      echo -e "${GREEN}  ✓ PostgreSQL is ready${NC}"
      return 0
    fi
    sleep $wait_time
    attempt=$((attempt + 1))
    # Exponential backoff: 0.2, 0.4, 0.8, 1.0, 1.0...
    wait_time=$(echo "$wait_time * 2" | bc 2>/dev/null || echo "1")
    [[ $(echo "$wait_time > 1" | bc 2>/dev/null || echo "0") == "1" ]] && wait_time=1
  done

  echo -e "${YELLOW}  ⚠ PostgreSQL may still be starting${NC}"
  return 0
}

# Wait for Redis with exponential backoff
wait_for_redis() {
  if [[ "$FAST_MODE" == "true" ]]; then
    return 0
  fi

  local max_attempts=8
  local attempt=0
  local wait_time=0.2

  while [ $attempt -lt $max_attempts ]; do
    if redis-cli ping 2>/dev/null | grep -q "PONG"; then
      echo -e "${GREEN}  ✓ Redis is ready${NC}"
      return 0
    fi
    sleep $wait_time
    attempt=$((attempt + 1))
    wait_time=$(echo "$wait_time * 2" | bc 2>/dev/null || echo "0.5")
    [[ $(echo "$wait_time > 1" | bc 2>/dev/null || echo "0") == "1" ]] && wait_time=1
  done

  echo -e "${YELLOW}  ⚠ Redis may still be starting${NC}"
  return 0
}

# Start API via PM2
start_api() {
  if command -v pm2 &>/dev/null; then
    if check_pm2_running; then
      echo -e "${GREEN}  ✓ API already running via PM2${NC}"
    else
      echo -e "${YELLOW}Starting API server via PM2...${NC}"
      cd "$PROJECT_DIR"

      # Build if needed (in background if possible)
      if [ ! -f "apps/api/dist/index.js" ]; then
        echo -e "${YELLOW}  Building API first...${NC}"
        pnpm build:api
      fi

      pm2 start ecosystem.config.cjs 2>/dev/null || true

      if [[ "$FAST_MODE" != "true" ]]; then
        sleep 1
      fi

      if check_pm2_running; then
        echo -e "${GREEN}  ✓ API started${NC}"
      else
        echo -e "${YELLOW}  ⚠ API may still be starting${NC}"
      fi
    fi
  else
    echo -e "${YELLOW}PM2 not installed. Install with: npm install -g pm2${NC}"
  fi
}

# Start Vite dev server
start_dev() {
  if check_vite_running; then
    echo -e "${GREEN}  ✓ Vite dev server already running${NC}"
  else
    echo -e "${YELLOW}Starting Vite dev server...${NC}"
    cd "$PROJECT_DIR"

    # Start in background
    nohup pnpm dev > /tmp/vite-musclemap.log 2>&1 &

    if [[ "$FAST_MODE" != "true" ]]; then
      sleep 2
    fi

    if check_vite_running; then
      echo -e "${GREEN}  ✓ Vite dev server started (http://localhost:5173)${NC}"
    else
      echo -e "${YELLOW}  ⚠ Vite may still be starting${NC}"
      echo -e "${YELLOW}    Check /tmp/vite-musclemap.log for errors${NC}"
    fi
  fi
}

# Start Bug Hunter daemon (local)
start_bug_hunter() {
  if check_bug_hunter_running; then
    echo -e "${GREEN}  ✓ Bug Hunter daemon already running (local)${NC}"
  else
    echo -e "${YELLOW}Starting Bug Hunter daemon (local)...${NC}"
    cd "$PROJECT_DIR"

    # Create log directory
    mkdir -p scripts/bug-hunter/logs

    # Start in background with daemon mode
    nohup pnpm bug-hunter:daemon > scripts/bug-hunter/logs/daemon-local.log 2>&1 &
    BUG_HUNTER_PID=$!
    echo "$BUG_HUNTER_PID" > /tmp/bug-hunter-local.pid

    if [[ "$FAST_MODE" != "true" ]]; then
      sleep 2
    fi

    if check_bug_hunter_running; then
      echo -e "${GREEN}  ✓ Bug Hunter daemon started (local)${NC}"
      echo -e "${GREEN}    PID: $BUG_HUNTER_PID${NC}"
      echo -e "${GREEN}    Log: scripts/bug-hunter/logs/daemon-local.log${NC}"
    else
      echo -e "${YELLOW}  ⚠ Bug Hunter may still be starting${NC}"
      echo -e "${YELLOW}    Check scripts/bug-hunter/logs/daemon-local.log for errors${NC}"
    fi
  fi
}

# Start Bug Hunter daemon (production)
start_bug_hunter_prod() {
  if check_bug_hunter_prod_running; then
    echo -e "${GREEN}  ✓ Bug Hunter daemon already running (production)${NC}"
  else
    echo -e "${YELLOW}Starting Bug Hunter daemon (production)...${NC}"
    cd "$PROJECT_DIR"

    # Create log directory
    mkdir -p scripts/bug-hunter/logs

    # Start in background with daemon mode targeting production
    nohup pnpm bug-hunter:daemon --production > scripts/bug-hunter/logs/daemon-prod.log 2>&1 &
    BUG_HUNTER_PROD_PID=$!
    echo "$BUG_HUNTER_PROD_PID" > /tmp/bug-hunter-prod.pid

    if [[ "$FAST_MODE" != "true" ]]; then
      sleep 2
    fi

    if check_bug_hunter_prod_running; then
      echo -e "${GREEN}  ✓ Bug Hunter daemon started (production)${NC}"
      echo -e "${GREEN}    PID: $BUG_HUNTER_PROD_PID${NC}"
      echo -e "${GREEN}    Log: scripts/bug-hunter/logs/daemon-prod.log${NC}"
    else
      echo -e "${YELLOW}  ⚠ Bug Hunter may still be starting${NC}"
      echo -e "${YELLOW}    Check scripts/bug-hunter/logs/daemon-prod.log for errors${NC}"
    fi
  fi
}

# ========================================
# MAIN: Start services
# ========================================

echo -e "${BLUE}Starting core services...${NC}"
echo ""

# 1. Start PostgreSQL and Redis in parallel (if both need starting)
if ! check_postgres_fast || ! check_redis_fast; then
  # Start services that need starting
  if ! check_postgres_fast; then
    start_brew_service "postgresql@16" "PostgreSQL" check_postgres_fast &
    PG_PID=$!
  fi

  if ! check_redis_fast; then
    start_brew_service "redis" "Redis" check_redis_fast &
    REDIS_PID=$!
  fi

  # Wait for background starts
  wait $PG_PID 2>/dev/null || true
  wait $REDIS_PID 2>/dev/null || true
else
  echo -e "${GREEN}  ✓ PostgreSQL already running${NC}"
  echo -e "${GREEN}  ✓ Redis already running${NC}"
fi

# 2. Wait for services to be ready (if not fast mode)
if [[ "$FAST_MODE" != "true" ]]; then
  wait_for_postgres
  wait_for_redis
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Core services started!               ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Start optional services
if [ "$START_API" = true ]; then
  echo -e "${BLUE}Starting API server...${NC}"
  start_api
  echo ""
fi

if [ "$START_DEV" = true ]; then
  echo -e "${BLUE}Starting Vite dev server...${NC}"
  start_dev
  echo ""
fi

if [ "$START_BUG_HUNTER" = true ]; then
  echo -e "${BLUE}Starting Bug Hunter daemon (local)...${NC}"
  start_bug_hunter
  echo ""
fi

if [ "$START_BUG_HUNTER_PROD" = true ]; then
  echo -e "${BLUE}Starting Bug Hunter daemon (production)...${NC}"
  start_bug_hunter_prod
  echo ""
fi

# Show final status (fast check)
echo -e "${BLUE}Service Status:${NC}"
if check_postgres_fast; then echo -e "  ${GREEN}✓${NC} PostgreSQL"; else echo -e "  ${YELLOW}○${NC} PostgreSQL"; fi
if check_redis_fast; then echo -e "  ${GREEN}✓${NC} Redis"; else echo -e "  ${YELLOW}○${NC} Redis"; fi
if command -v pm2 &>/dev/null && check_pm2_running; then echo -e "  ${GREEN}✓${NC} API (PM2)"; fi
if check_vite_running; then echo -e "  ${GREEN}✓${NC} Vite"; fi
if check_bug_hunter_running; then echo -e "  ${GREEN}✓${NC} Bug Hunter (local)"; fi
if check_bug_hunter_prod_running; then echo -e "  ${GREEN}✓${NC} Bug Hunter (production)"; fi
echo ""

# Show next steps
echo -e "${BLUE}Next steps:${NC}"
if [ "$START_API" = false ]; then
  echo -e "  Start API:              ${GREEN}./scripts/musclemap-start.sh --api${NC}"
fi
if [ "$START_DEV" = false ]; then
  echo -e "  Start frontend:         ${GREEN}./scripts/musclemap-start.sh --dev${NC}"
fi
if [ "$START_BUG_HUNTER" = false ]; then
  echo -e "  Start Bug Hunter local: ${GREEN}./scripts/musclemap-start.sh --bug-hunter${NC}"
fi
if [ "$START_BUG_HUNTER_PROD" = false ]; then
  echo -e "  Start Bug Hunter prod:  ${GREEN}./scripts/musclemap-start.sh --bug-hunter-prod${NC}"
fi
echo -e "  Stop services:          ${GREEN}./scripts/musclemap-stop.sh${NC}"
echo ""

# Health check info
echo -e "${BLUE}Endpoints (when running):${NC}"
echo -e "  Frontend:  http://localhost:5173"
echo -e "  API:       http://localhost:3001"
echo -e "  Health:    http://localhost:3001/health"
echo ""
