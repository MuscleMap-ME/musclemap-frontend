#!/bin/bash
#
# MuscleMap Local Development Services - STOP
#
# PERFORMANCE OPTIMIZED:
#   - Parallel service shutdown
#   - Fast process detection (pgrep/lsof instead of brew services)
#   - Reduced wait times
#   - Graceful shutdown with SIGTERM before SIGKILL
#
# Usage:
#   ./scripts/musclemap-stop.sh         # Stop all services
#   ./scripts/musclemap-stop.sh --quiet # Stop without confirmation
#   ./scripts/musclemap-stop.sh --fast  # Force stop without waiting
#
# To start services again, run:
#   ./scripts/musclemap-start.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MuscleMap Services - Stopping (Fast) ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Parse arguments
QUIET=false
FAST_MODE=false

for arg in "$@"; do
  case $arg in
    --quiet|-q)
      QUIET=true
      ;;
    --fast|-f)
      FAST_MODE=true
      QUIET=true  # Fast mode implies quiet
      ;;
    --help|-h)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --quiet, -q  Stop without confirmation"
      echo "  --fast, -f   Force stop without waiting (implies --quiet)"
      echo "  --help, -h   Show this help"
      exit 0
      ;;
  esac
done

# Fast service checks
check_postgres_fast() {
  pgrep -x postgres >/dev/null 2>&1 || pgrep -f "postgres.*5432" >/dev/null 2>&1
}

check_redis_fast() {
  pgrep -x redis-server >/dev/null 2>&1 || lsof -i:6379 >/dev/null 2>&1
}

check_pm2_running() {
  pm2 list 2>/dev/null | grep -qE "musclemap|online"
}

check_vite_running() {
  pgrep -f "vite" >/dev/null 2>&1
}

check_caddy_running() {
  pgrep -x caddy >/dev/null 2>&1
}

check_bug_hunter_running() {
  pgrep -f "bug-hunter.*daemon" >/dev/null 2>&1 || pgrep -f "tsx.*bug-hunter" >/dev/null 2>&1
}

check_bug_hunter_prod_running() {
  pgrep -f "bug-hunter.*production" >/dev/null 2>&1
}

# Stop Vite dev server
stop_vite() {
  local vite_pids=$(pgrep -f "vite" 2>/dev/null || true)
  if [ -n "$vite_pids" ]; then
    echo -e "${YELLOW}Stopping Vite dev server...${NC}"
    echo "$vite_pids" | xargs kill 2>/dev/null || true
    echo -e "${GREEN}  ✓ Vite stopped${NC}"
  else
    echo -e "${BLUE}  - Vite not running${NC}"
  fi
}

# Stop PM2 processes
stop_pm2() {
  if command -v pm2 &>/dev/null; then
    if check_pm2_running; then
      echo -e "${YELLOW}Stopping PM2 processes...${NC}"
      pm2 stop all 2>/dev/null || true
      pm2 delete all 2>/dev/null || true
      echo -e "${GREEN}  ✓ PM2 stopped${NC}"
    else
      echo -e "${BLUE}  - PM2 not running${NC}"
    fi
  fi
}

# Stop any node processes for the project
stop_node_processes() {
  local node_pids=$(pgrep -f "node.*musclemap" 2>/dev/null || true)
  if [ -n "$node_pids" ]; then
    echo -e "${YELLOW}Stopping Node.js processes...${NC}"
    echo "$node_pids" | xargs kill 2>/dev/null || true
    echo -e "${GREEN}  ✓ Node stopped${NC}"
  fi
}

# Stop Caddy
stop_caddy() {
  if check_caddy_running; then
    echo -e "${YELLOW}Stopping Caddy...${NC}"
    # Try brew first, then manual kill
    brew services stop caddy 2>/dev/null || pkill caddy 2>/dev/null || true
    echo -e "${GREEN}  ✓ Caddy stopped${NC}"
  else
    echo -e "${BLUE}  - Caddy not running${NC}"
  fi
}

# Stop Bug Hunter daemon (local)
stop_bug_hunter() {
  local bug_hunter_pids=$(pgrep -f "tsx.*bug-hunter" 2>/dev/null || true)
  if [ -n "$bug_hunter_pids" ]; then
    echo -e "${YELLOW}Stopping Bug Hunter daemon (local)...${NC}"
    echo "$bug_hunter_pids" | xargs kill 2>/dev/null || true
    rm -f /tmp/bug-hunter-local.pid 2>/dev/null || true
    echo -e "${GREEN}  ✓ Bug Hunter (local) stopped${NC}"
  else
    echo -e "${BLUE}  - Bug Hunter (local) not running${NC}"
  fi
}

# Stop Bug Hunter daemon (production)
stop_bug_hunter_prod() {
  local bug_hunter_prod_pids=$(pgrep -f "bug-hunter.*production" 2>/dev/null || true)
  if [ -n "$bug_hunter_prod_pids" ]; then
    echo -e "${YELLOW}Stopping Bug Hunter daemon (production)...${NC}"
    echo "$bug_hunter_prod_pids" | xargs kill 2>/dev/null || true
    rm -f /tmp/bug-hunter-prod.pid 2>/dev/null || true
    echo -e "${GREEN}  ✓ Bug Hunter (production) stopped${NC}"
  else
    echo -e "${BLUE}  - Bug Hunter (production) not running${NC}"
  fi
}

# Stop brew service
stop_brew_service() {
  local service=$1
  local display_name=$2
  local check_func=$3

  if $check_func; then
    echo -e "${YELLOW}Stopping $display_name...${NC}"
    brew services stop "$service" 2>/dev/null || true
    echo -e "${GREEN}  ✓ $display_name stopped${NC}"
  else
    echo -e "${BLUE}  - $display_name not running${NC}"
  fi
}

# Confirmation prompt (unless --quiet)
if [ "$QUIET" = false ]; then
  echo -e "This will stop:"
  check_bug_hunter_running && echo -e "  ${GREEN}●${NC} Bug Hunter daemon (local)"
  check_bug_hunter_prod_running && echo -e "  ${GREEN}●${NC} Bug Hunter daemon (production)"
  check_vite_running && echo -e "  ${GREEN}●${NC} Vite dev server"
  check_pm2_running && echo -e "  ${GREEN}●${NC} PM2/API processes"
  check_caddy_running && echo -e "  ${GREEN}●${NC} Caddy"
  check_redis_fast && echo -e "  ${GREEN}●${NC} Redis"
  check_postgres_fast && echo -e "  ${GREEN}●${NC} PostgreSQL"
  echo ""
  read -p "Continue? [Y/n] " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
    echo -e "${YELLOW}Aborted.${NC}"
    exit 0
  fi
  echo ""
fi

# ========================================
# PARALLEL SHUTDOWN
# ========================================

echo -e "${BLUE}Stopping services...${NC}"
echo ""

# Phase 0: Stop bug hunter daemons first (they depend on other services)
{
  stop_bug_hunter &
  BH_LOCAL_PID=$!

  stop_bug_hunter_prod &
  BH_PROD_PID=$!

  # Wait for bug hunter to stop
  wait $BH_LOCAL_PID $BH_PROD_PID 2>/dev/null || true
}

# Phase 1: Stop application-level services in parallel
{
  stop_vite &
  VITE_PID=$!

  stop_pm2 &
  PM2_PID=$!

  stop_node_processes &
  NODE_PID=$!

  stop_caddy &
  CADDY_PID=$!

  # Wait for app services
  wait $VITE_PID $PM2_PID $NODE_PID $CADDY_PID 2>/dev/null || true
}

# Phase 2: Stop infrastructure services in parallel
{
  stop_brew_service "redis" "Redis" check_redis_fast &
  REDIS_PID=$!

  stop_brew_service "postgresql@16" "PostgreSQL" check_postgres_fast &
  PG_PID=$!

  # Wait for infra services
  wait $REDIS_PID $PG_PID 2>/dev/null || true
}

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  All MuscleMap services stopped!      ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "To restart services:"
echo -e "  ${BLUE}./scripts/musclemap-start.sh${NC}"
echo ""

# Show final status
echo -e "${BLUE}Final Status:${NC}"
if ! check_postgres_fast && ! check_redis_fast && ! check_pm2_running && ! check_vite_running && ! check_bug_hunter_running && ! check_bug_hunter_prod_running; then
  echo -e "  ${GREEN}✓${NC} All services stopped"
else
  check_bug_hunter_running && echo -e "  ${YELLOW}●${NC} Bug Hunter (local) still running"
  check_bug_hunter_prod_running && echo -e "  ${YELLOW}●${NC} Bug Hunter (production) still running"
  check_postgres_fast && echo -e "  ${YELLOW}●${NC} PostgreSQL still running"
  check_redis_fast && echo -e "  ${YELLOW}●${NC} Redis still running"
  check_pm2_running && echo -e "  ${YELLOW}●${NC} PM2 still running"
  check_vite_running && echo -e "  ${YELLOW}●${NC} Vite still running"
fi
echo ""
