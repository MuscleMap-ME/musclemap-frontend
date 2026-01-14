#!/bin/bash
#
# MuscleMap Local Development Services - STOP
#
# Stops all MuscleMap-related services to free up system resources when
# you're not actively developing. This includes:
# - PostgreSQL (database)
# - Redis (caching)
# - PM2/Node processes (API server)
# - Caddy (reverse proxy) - if running
# - Vite dev server (frontend) - if running
#
# Usage:
#   ./scripts/musclemap-stop.sh         # Stop all services
#   ./scripts/musclemap-stop.sh --quiet # Stop without confirmation
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
PROJECT_DIR="/Users/jeanpaulniko/Public/musclemap.me"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MuscleMap Services - Stopping        ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Parse arguments
QUIET=false
for arg in "$@"; do
  case $arg in
    --quiet|-q)
      QUIET=true
      shift
      ;;
  esac
done

# Function to check if a service is running
check_service() {
  local service=$1
  if brew services list | grep -q "^$service.*started"; then
    return 0
  else
    return 1
  fi
}

# Function to stop brew service
stop_brew_service() {
  local service=$1
  local display_name=$2

  if check_service "$service"; then
    echo -e "${YELLOW}Stopping $display_name...${NC}"
    brew services stop "$service" 2>/dev/null
    echo -e "${GREEN}  ✓ $display_name stopped${NC}"
  else
    echo -e "${BLUE}  - $display_name already stopped${NC}"
  fi
}

# Function to stop PM2 processes
stop_pm2() {
  if command -v pm2 &> /dev/null; then
    if pm2 list 2>/dev/null | grep -q "musclemap"; then
      echo -e "${YELLOW}Stopping PM2 processes...${NC}"
      pm2 stop all 2>/dev/null || true
      pm2 delete all 2>/dev/null || true
      echo -e "${GREEN}  ✓ PM2 processes stopped${NC}"
    else
      echo -e "${BLUE}  - PM2 processes already stopped${NC}"
    fi
  else
    echo -e "${BLUE}  - PM2 not installed (skipping)${NC}"
  fi
}

# Function to stop Vite dev server
stop_vite() {
  local vite_pids=$(pgrep -f "vite" 2>/dev/null || true)
  if [ -n "$vite_pids" ]; then
    echo -e "${YELLOW}Stopping Vite dev server...${NC}"
    echo "$vite_pids" | xargs kill 2>/dev/null || true
    echo -e "${GREEN}  ✓ Vite dev server stopped${NC}"
  else
    echo -e "${BLUE}  - Vite dev server not running${NC}"
  fi
}

# Function to stop Caddy
stop_caddy() {
  if check_service "caddy"; then
    echo -e "${YELLOW}Stopping Caddy...${NC}"
    brew services stop caddy 2>/dev/null
    echo -e "${GREEN}  ✓ Caddy stopped${NC}"
  else
    # Check for manual Caddy process
    local caddy_pids=$(pgrep -f "caddy" 2>/dev/null || true)
    if [ -n "$caddy_pids" ]; then
      echo -e "${YELLOW}Stopping Caddy process...${NC}"
      echo "$caddy_pids" | xargs kill 2>/dev/null || true
      echo -e "${GREEN}  ✓ Caddy stopped${NC}"
    else
      echo -e "${BLUE}  - Caddy not running${NC}"
    fi
  fi
}

# Function to stop any node processes in project directory
stop_node_processes() {
  local node_pids=$(pgrep -f "node.*musclemap" 2>/dev/null || true)
  if [ -n "$node_pids" ]; then
    echo -e "${YELLOW}Stopping Node.js processes...${NC}"
    echo "$node_pids" | xargs kill 2>/dev/null || true
    echo -e "${GREEN}  ✓ Node.js processes stopped${NC}"
  else
    echo -e "${BLUE}  - No MuscleMap Node.js processes running${NC}"
  fi
}

# Confirmation prompt (unless --quiet)
if [ "$QUIET" = false ]; then
  echo -e "This will stop the following services:"
  echo -e "  - PostgreSQL (database)"
  echo -e "  - Redis (caching)"
  echo -e "  - PM2 processes (API)"
  echo -e "  - Caddy (reverse proxy)"
  echo -e "  - Vite dev server (frontend)"
  echo ""
  read -p "Continue? [Y/n] " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
    echo -e "${YELLOW}Aborted.${NC}"
    exit 0
  fi
  echo ""
fi

# Stop services in reverse dependency order
echo -e "${BLUE}Stopping services...${NC}"
echo ""

# 1. Stop frontend dev server first
stop_vite

# 2. Stop PM2/API processes
stop_pm2

# 3. Stop any other Node processes
stop_node_processes

# 4. Stop Caddy reverse proxy
stop_caddy

# 5. Stop Redis (cache)
stop_brew_service "redis" "Redis"

# 6. Stop PostgreSQL (database) - stop last
stop_brew_service "postgresql@16" "PostgreSQL"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  All MuscleMap services stopped!      ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "System resources freed. To restart services:"
echo -e "  ${BLUE}./scripts/musclemap-start.sh${NC}"
echo ""

# Show current status
echo -e "${BLUE}Current service status:${NC}"
brew services list | grep -E "postgresql|redis|caddy" || true
