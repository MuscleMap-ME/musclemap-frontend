#!/bin/bash
#
# MuscleMap Local Development Services - START
#
# Starts all MuscleMap-related services for local development. This includes:
# - PostgreSQL (database)
# - Redis (caching)
# - PM2/API server (optional)
# - Vite dev server (optional)
#
# Usage:
#   ./scripts/musclemap-start.sh              # Start core services (PostgreSQL, Redis)
#   ./scripts/musclemap-start.sh --api        # Also start the API server
#   ./scripts/musclemap-start.sh --dev        # Also start Vite dev server
#   ./scripts/musclemap-start.sh --all        # Start everything
#   ./scripts/musclemap-start.sh --status     # Just show status
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

# Project directory
PROJECT_DIR="/Users/jeanpaulniko/Public/musclemap.me"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MuscleMap Services - Starting        ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Parse arguments
START_API=false
START_DEV=false
STATUS_ONLY=false

for arg in "$@"; do
  case $arg in
    --api)
      START_API=true
      shift
      ;;
    --dev)
      START_DEV=true
      shift
      ;;
    --all)
      START_API=true
      START_DEV=true
      shift
      ;;
    --status)
      STATUS_ONLY=true
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

# Function to start brew service
start_brew_service() {
  local service=$1
  local display_name=$2

  if check_service "$service"; then
    echo -e "${GREEN}  ✓ $display_name already running${NC}"
  else
    echo -e "${YELLOW}Starting $display_name...${NC}"
    brew services start "$service" 2>/dev/null
    sleep 1
    if check_service "$service"; then
      echo -e "${GREEN}  ✓ $display_name started${NC}"
    else
      echo -e "${RED}  ✗ Failed to start $display_name${NC}"
      return 1
    fi
  fi
}

# Function to wait for PostgreSQL to be ready
wait_for_postgres() {
  echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
  local max_attempts=30
  local attempt=0

  while [ $attempt -lt $max_attempts ]; do
    if pg_isready -q 2>/dev/null; then
      echo -e "${GREEN}  ✓ PostgreSQL is ready${NC}"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done

  echo -e "${RED}  ✗ PostgreSQL failed to become ready${NC}"
  return 1
}

# Function to wait for Redis to be ready
wait_for_redis() {
  echo -e "${YELLOW}Waiting for Redis to be ready...${NC}"
  local max_attempts=10
  local attempt=0

  while [ $attempt -lt $max_attempts ]; do
    if redis-cli ping 2>/dev/null | grep -q "PONG"; then
      echo -e "${GREEN}  ✓ Redis is ready${NC}"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done

  echo -e "${RED}  ✗ Redis failed to become ready${NC}"
  return 1
}

# Function to start API via PM2
start_api() {
  if command -v pm2 &> /dev/null; then
    if pm2 list 2>/dev/null | grep -q "musclemap.*online"; then
      echo -e "${GREEN}  ✓ API already running via PM2${NC}"
    else
      echo -e "${YELLOW}Starting API server via PM2...${NC}"
      cd "$PROJECT_DIR"

      # Build if needed
      if [ ! -f "apps/api/dist/index.js" ]; then
        echo -e "${YELLOW}  Building API first...${NC}"
        pnpm build:api
      fi

      pm2 start ecosystem.config.cjs 2>/dev/null || true
      sleep 2

      if pm2 list 2>/dev/null | grep -q "musclemap.*online"; then
        echo -e "${GREEN}  ✓ API started${NC}"
      else
        echo -e "${RED}  ✗ Failed to start API${NC}"
      fi
    fi
  else
    echo -e "${YELLOW}PM2 not installed. Install with: npm install -g pm2${NC}"
  fi
}

# Function to start Vite dev server
start_dev() {
  local vite_pids=$(pgrep -f "vite" 2>/dev/null || true)
  if [ -n "$vite_pids" ]; then
    echo -e "${GREEN}  ✓ Vite dev server already running${NC}"
  else
    echo -e "${YELLOW}Starting Vite dev server...${NC}"
    cd "$PROJECT_DIR"

    # Start in background
    nohup pnpm dev > /tmp/vite-musclemap.log 2>&1 &
    sleep 3

    vite_pids=$(pgrep -f "vite" 2>/dev/null || true)
    if [ -n "$vite_pids" ]; then
      echo -e "${GREEN}  ✓ Vite dev server started (http://localhost:5173)${NC}"
    else
      echo -e "${RED}  ✗ Failed to start Vite dev server${NC}"
      echo -e "${YELLOW}    Check /tmp/vite-musclemap.log for errors${NC}"
    fi
  fi
}

# Show status only
if [ "$STATUS_ONLY" = true ]; then
  echo -e "${BLUE}Service Status:${NC}"
  echo ""
  brew services list | grep -E "postgresql|redis|caddy" || true
  echo ""

  if command -v pm2 &> /dev/null; then
    echo -e "${BLUE}PM2 Processes:${NC}"
    pm2 list 2>/dev/null || echo "  No PM2 processes"
  fi

  echo ""
  local vite_pids=$(pgrep -f "vite" 2>/dev/null || true)
  if [ -n "$vite_pids" ]; then
    echo -e "${GREEN}Vite dev server: running${NC}"
  else
    echo -e "${YELLOW}Vite dev server: not running${NC}"
  fi

  exit 0
fi

# Start core services
echo -e "${BLUE}Starting core services...${NC}"
echo ""

# 1. Start PostgreSQL first (required for API)
start_brew_service "postgresql@16" "PostgreSQL"
wait_for_postgres

# 2. Start Redis (optional but recommended for caching)
start_brew_service "redis" "Redis"
wait_for_redis

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

# Show final status
echo -e "${BLUE}Service Status:${NC}"
brew services list | grep -E "postgresql|redis|caddy" || true
echo ""

if command -v pm2 &> /dev/null && pm2 list 2>/dev/null | grep -q "musclemap"; then
  echo -e "${BLUE}PM2 Processes:${NC}"
  pm2 list 2>/dev/null | head -20
  echo ""
fi

# Show next steps
echo -e "${BLUE}Next steps:${NC}"
if [ "$START_API" = false ]; then
  echo -e "  Start API:      ${GREEN}./scripts/musclemap-start.sh --api${NC}"
fi
if [ "$START_DEV" = false ]; then
  echo -e "  Start frontend: ${GREEN}./scripts/musclemap-start.sh --dev${NC}"
  echo -e "  Or manually:    ${GREEN}pnpm dev${NC}"
fi
echo -e "  Stop services:  ${GREEN}./scripts/musclemap-stop.sh${NC}"
echo ""

# Health check info
echo -e "${BLUE}Endpoints (when running):${NC}"
echo -e "  Frontend:  http://localhost:5173"
echo -e "  API:       http://localhost:3001"
echo -e "  Health:    http://localhost:3001/health"
echo -e "  GraphQL:   http://localhost:3001/graphql"
echo ""
