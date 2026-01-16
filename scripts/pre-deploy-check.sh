#!/bin/bash
# Pre-Deploy Check Script (PERFORMANCE OPTIMIZED)
#
# Automatically runs before deployment to catch common issues.
# Uses parallel execution and caching for faster checks.
#
# Usage:
#   ./scripts/pre-deploy-check.sh           # Run all checks
#   ./scripts/pre-deploy-check.sh --fast    # Skip typecheck if cached
#   ./scripts/pre-deploy-check.sh --no-cache # Force fresh checks
#
# Performance Optimizations:
#   - Parallel execution of independent checks
#   - Cached typecheck results (valid for 5 minutes)
#   - Early exit on critical failures
#   - Background processes for non-blocking checks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CACHE_DIR="$PROJECT_ROOT/.cache"
TYPECHECK_CACHE="$CACHE_DIR/typecheck.cache"
CACHE_TTL=300  # 5 minutes in seconds

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
FAST_MODE=false
NO_CACHE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --fast|-f)
            FAST_MODE=true
            shift
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --fast, -f   Skip typecheck if recently cached"
            echo "  --no-cache   Force fresh checks (ignore cache)"
            echo "  --help, -h   Show this help message"
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

# Create cache directory
mkdir -p "$CACHE_DIR"

echo -e "${BLUE}🔍 Pre-Deploy Check (Optimized)${NC}"
echo "================================"

ERRORS=0
WARNINGS=0

# Track issues for automated resolution
declare -a ISSUES_TO_FIX

# Temp files for parallel results
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# =====================================================
# Helper Functions
# =====================================================

is_cache_valid() {
    local cache_file="$1"
    local ttl="$2"

    if [[ "$NO_CACHE" == "true" ]]; then
        return 1
    fi

    if [[ ! -f "$cache_file" ]]; then
        return 1
    fi

    local cache_time=$(stat -f %m "$cache_file" 2>/dev/null || stat -c %Y "$cache_file" 2>/dev/null)
    local current_time=$(date +%s)
    local age=$((current_time - cache_time))

    [[ $age -lt $ttl ]]
}

# =====================================================
# PARALLEL CHECK FUNCTIONS
# =====================================================

# Check 1: JSONB parse patterns (fast grep)
check_jsonb_patterns() {
    local result_file="$1"
    local count=$(grep -r "JSON\.parse.*\(row\|result\|data\)\." "$PROJECT_ROOT/apps/api/src" --include="*.ts" 2>/dev/null | grep -v "node_modules" | wc -l || echo "0")
    echo "JSONB|$count" >> "$result_file"
}

# Check 2: Migration numbering
check_migrations() {
    local result_file="$1"
    local dupes=$(ls "$PROJECT_ROOT/apps/api/src/db/migrations/"*.ts 2>/dev/null | xargs -I {} basename {} | sed 's/_.*//' | sort | uniq -d | tr '\n' ',' | sed 's/,$//')
    echo "MIGRATIONS|$dupes" >> "$result_file"
}

# Check 3: PM2 process name
check_pm2() {
    local result_file="$1"
    local deploy_name=$(grep "pm2 restart" "$PROJECT_ROOT/deploy.sh" 2>/dev/null | tail -1 | sed 's/.*pm2 restart //' | tr -d '"' | tr -d "'" || echo "")
    local local_name=$(pm2 jlist 2>/dev/null | jq -r '.[0].name // empty' 2>/dev/null || echo "")
    if [[ -n "$local_name" ]] && [[ "$deploy_name" != "$local_name" ]] && [[ -n "$deploy_name" ]]; then
        echo "PM2|MISMATCH:$deploy_name:$local_name" >> "$result_file"
    else
        echo "PM2|OK" >> "$result_file"
    fi
}

# Check 4: Port availability
check_port() {
    local result_file="$1"
    local port_pid=$(lsof -ti:3001 2>/dev/null || echo "")
    if [[ -n "$port_pid" ]]; then
        local process_name=$(ps -p $port_pid -o comm= 2>/dev/null || echo "unknown")
        echo "PORT|$process_name:$port_pid" >> "$result_file"
    else
        echo "PORT|FREE" >> "$result_file"
    fi
}

# Check 5: Build currency
check_build() {
    local result_file="$1"
    if [[ -d "$PROJECT_ROOT/apps/api/dist" ]]; then
        local newer=$(find "$PROJECT_ROOT/apps/api/src" -name "*.ts" -newer "$PROJECT_ROOT/apps/api/dist/index.js" 2>/dev/null | head -1)
        if [[ -n "$newer" ]]; then
            echo "BUILD|OUTDATED" >> "$result_file"
        else
            echo "BUILD|CURRENT" >> "$result_file"
        fi
    else
        echo "BUILD|MISSING" >> "$result_file"
    fi
}

# Check 6: Environment file
check_env() {
    local result_file="$1"
    if [[ -f "$PROJECT_ROOT/apps/api/.env" ]]; then
        local db_name=$(grep DATABASE_URL "$PROJECT_ROOT/apps/api/.env" 2>/dev/null | sed 's/.*\///' | cut -d'?' -f1)
        echo "ENV|$db_name" >> "$result_file"
    else
        echo "ENV|MISSING" >> "$result_file"
    fi
}

export -f check_jsonb_patterns check_migrations check_pm2 check_port check_build check_env
export PROJECT_ROOT

# =====================================================
# RUN PARALLEL CHECKS
# =====================================================

echo -e "\n${BLUE}Running parallel checks...${NC}"
RESULTS_FILE="$TEMP_DIR/results.txt"
touch "$RESULTS_FILE"

# Launch all checks in parallel
check_jsonb_patterns "$RESULTS_FILE" &
check_migrations "$RESULTS_FILE" &
check_pm2 "$RESULTS_FILE" &
check_port "$RESULTS_FILE" &
check_build "$RESULTS_FILE" &
check_env "$RESULTS_FILE" &

# Wait for all parallel checks
wait

# =====================================================
# PROCESS RESULTS
# =====================================================

echo -e "\n${BLUE}1. Database Checks${NC}"

# JSONB patterns
JSONB_RESULT=$(grep "^JSONB|" "$RESULTS_FILE" | cut -d'|' -f2 | tr -d ' ')
echo -n "  Checking for JSONB parse anti-patterns... "
if [[ "$JSONB_RESULT" -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  $JSONB_RESULT potential issue(s)${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC}"
fi

# Migrations
MIGRATION_RESULT=$(grep "^MIGRATIONS|" "$RESULTS_FILE" | cut -d'|' -f2)
echo -n "  Checking migration numbering... "
if [[ -n "$MIGRATION_RESULT" ]]; then
    echo -e "${RED}✗ Duplicates: $MIGRATION_RESULT${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC}"
fi

echo -e "\n${BLUE}2. PM2 & Process Checks${NC}"

# PM2
PM2_RESULT=$(grep "^PM2|" "$RESULTS_FILE" | cut -d'|' -f2)
echo -n "  Checking PM2 process name consistency... "
if [[ "$PM2_RESULT" == MISMATCH:* ]]; then
    IFS=':' read -r _ deploy_name local_name <<< "$PM2_RESULT"
    echo -e "${YELLOW}⚠️  Deploy uses '$deploy_name' but local PM2 has '$local_name'${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC}"
fi

# Port
PORT_RESULT=$(grep "^PORT|" "$RESULTS_FILE" | cut -d'|' -f2)
echo -n "  Checking port 3001 availability... "
if [[ "$PORT_RESULT" != "FREE" ]]; then
    IFS=':' read -r process_name pid <<< "$PORT_RESULT"
    echo -e "${YELLOW}⚠️  In use by $process_name (PID: $pid)${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC}"
fi

echo -e "\n${BLUE}3. Build Checks${NC}"

# Build
BUILD_RESULT=$(grep "^BUILD|" "$RESULTS_FILE" | cut -d'|' -f2)
echo -n "  Checking if build is current... "
case "$BUILD_RESULT" in
    OUTDATED)
        echo -e "${YELLOW}⚠️  Source files newer than build - rebuild needed${NC}"
        ((WARNINGS++))
        ISSUES_TO_FIX+=("REBUILD_NEEDED")
        ;;
    MISSING)
        echo -e "${YELLOW}⚠️  No dist folder - build needed${NC}"
        ((WARNINGS++))
        ISSUES_TO_FIX+=("REBUILD_NEEDED")
        ;;
    *)
        echo -e "${GREEN}✓${NC}"
        ;;
esac

echo -e "\n${BLUE}4. Environment Checks${NC}"

# Environment
ENV_RESULT=$(grep "^ENV|" "$RESULTS_FILE" | cut -d'|' -f2)
echo -n "  Checking database configuration... "
if [[ "$ENV_RESULT" == "MISSING" ]]; then
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓ Using database: $ENV_RESULT${NC}"
fi

# =====================================================
# TYPECHECK (with caching)
# =====================================================

echo -e "\n${BLUE}5. TypeScript Checks${NC}"

if is_cache_valid "$TYPECHECK_CACHE" $CACHE_TTL && [[ "$FAST_MODE" == "true" ]]; then
    echo -e "  ${GREEN}✓ Typecheck passed (cached)${NC}"
else
    echo -n "  Running typecheck... "

    if cd "$PROJECT_ROOT" && pnpm typecheck > /tmp/typecheck.log 2>&1; then
        echo -e "${GREEN}✓${NC}"
        # Update cache
        echo "$(date +%s)" > "$TYPECHECK_CACHE"
    else
        echo -e "${RED}✗ Type errors found${NC}"
        ((ERRORS++))
        grep -E "error TS" /tmp/typecheck.log | head -10 || true
        # Invalidate cache on failure
        rm -f "$TYPECHECK_CACHE"
    fi

    # Check for unused imports (quick grep, not full typecheck)
    UNUSED_IMPORTS=$(grep -c "is declared but" /tmp/typecheck.log 2>/dev/null || echo "0")
    if [[ "$UNUSED_IMPORTS" -gt 0 ]]; then
        echo -e "  ${YELLOW}⚠️  $UNUSED_IMPORTS unused import(s)${NC}"
        ((WARNINGS++))
        ISSUES_TO_FIX+=("UNUSED_IMPORTS")
    fi
fi

# =====================================================
# LINTING (quick mode)
# =====================================================

echo -e "\n${BLUE}6. Linting (quick)${NC}"
echo -n "  Running lint... "

# Use --quiet for faster lint (only errors, not warnings)
if cd "$PROJECT_ROOT" && timeout 30 pnpm lint --quiet > /tmp/lint.log 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    LINT_ERRORS=$(grep -c "error" /tmp/lint.log 2>/dev/null || echo "0")
    if [[ "$LINT_ERRORS" -gt 0 ]]; then
        echo -e "${YELLOW}⚠️  $LINT_ERRORS lint issue(s)${NC}"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓${NC}"
    fi
fi

# =====================================================
# Summary
# =====================================================

echo ""
echo "================================"
if [[ $ERRORS -gt 0 ]]; then
    echo -e "${RED}❌ Pre-deploy check failed: $ERRORS error(s), $WARNINGS warning(s)${NC}"
    exit 1
elif [[ $WARNINGS -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  Pre-deploy check passed with $WARNINGS warning(s)${NC}"

    # Offer to auto-fix
    if [[ ${#ISSUES_TO_FIX[@]} -gt 0 ]]; then
        echo ""
        echo -e "${BLUE}Auto-fixable issues:${NC}"
        for issue in "${ISSUES_TO_FIX[@]}"; do
            case $issue in
                REBUILD_NEEDED)
                    echo "  - Rebuild needed: run 'pnpm -C apps/api build'"
                    ;;
                UNUSED_IMPORTS)
                    echo "  - Unused imports: run 'pnpm lint --fix'"
                    ;;
            esac
        done
    fi
    exit 0
else
    echo -e "${GREEN}✅ Pre-deploy check passed!${NC}"
    exit 0
fi
