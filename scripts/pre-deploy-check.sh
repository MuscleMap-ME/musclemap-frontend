#!/bin/bash
# Pre-Deploy Check Script
# Automatically runs before deployment to catch common issues
# Usage: ./scripts/pre-deploy-check.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Pre-Deploy Check${NC}"
echo "================================"

ERRORS=0
WARNINGS=0

# Track issues for automated resolution
declare -a ISSUES_TO_FIX

# =====================================================
# 1. TypeScript Checks
# =====================================================
echo -e "\n${BLUE}1. TypeScript Checks${NC}"

# Check for unused imports
echo -n "  Checking for unused imports... "
UNUSED_IMPORTS=$(cd "$PROJECT_ROOT" && pnpm typecheck 2>&1 | grep -c "is declared but" || true)
if [ "$UNUSED_IMPORTS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $UNUSED_IMPORTS unused import(s)${NC}"
    WARNINGS=$((WARNINGS + 1))
    ISSUES_TO_FIX+=("UNUSED_IMPORTS")
else
    echo -e "${GREEN}✓${NC}"
fi

# Full typecheck
echo -n "  Running full typecheck... "
if cd "$PROJECT_ROOT" && pnpm typecheck > /tmp/typecheck.log 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Type errors found${NC}"
    ERRORS=$((ERRORS + 1))
    cat /tmp/typecheck.log | grep -E "error TS" | head -10
fi

# =====================================================
# 2. Database Checks
# =====================================================
echo -e "\n${BLUE}2. Database Checks${NC}"

# Check for JSONB columns being JSON.parsed (common mistake)
echo -n "  Checking for JSONB parse anti-patterns... "
JSONB_ISSUES=$(grep -r "JSON\.parse.*\(row\|result\|data\)\." "$PROJECT_ROOT/apps/api/src" --include="*.ts" 2>/dev/null | grep -v "node_modules" | wc -l || true)
if [ "$JSONB_ISSUES" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Potential JSONB parsing issues${NC}"
    echo "     PostgreSQL JSONB columns are auto-parsed. Check these files:"
    grep -r "JSON\.parse.*\(row\|result\|data\)\." "$PROJECT_ROOT/apps/api/src" --include="*.ts" -l 2>/dev/null | head -5
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✓${NC}"
fi

# Check migration numbering for duplicates
echo -n "  Checking migration numbering... "
MIGRATION_NUMS=$(ls "$PROJECT_ROOT/apps/api/src/db/migrations/"*.ts 2>/dev/null | xargs -I {} basename {} | sed 's/_.*//' | sort | uniq -d)
if [ -n "$MIGRATION_NUMS" ]; then
    echo -e "${RED}✗ Duplicate migration numbers: $MIGRATION_NUMS${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓${NC}"
fi

# =====================================================
# 3. PM2 & Process Checks
# =====================================================
echo -e "\n${BLUE}3. PM2 & Process Checks${NC}"

# Check local PM2 process name matches deploy script
echo -n "  Checking PM2 process name consistency... "
DEPLOY_PM2_NAME=$(grep "pm2 restart" "$PROJECT_ROOT/deploy.sh" | tail -1 | sed 's/.*pm2 restart //' | tr -d '"')
LOCAL_PM2_NAME=$(pm2 jlist 2>/dev/null | jq -r '.[0].name // empty' 2>/dev/null || echo "")
if [ -n "$LOCAL_PM2_NAME" ] && [ "$DEPLOY_PM2_NAME" != "$LOCAL_PM2_NAME" ]; then
    echo -e "${YELLOW}⚠️  Deploy uses '$DEPLOY_PM2_NAME' but local PM2 has '$LOCAL_PM2_NAME'${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✓${NC}"
fi

# Check if port 3001 is in use
echo -n "  Checking port 3001 availability... "
PORT_PID=$(lsof -ti:3001 2>/dev/null || true)
if [ -n "$PORT_PID" ]; then
    PROCESS_NAME=$(ps -p $PORT_PID -o comm= 2>/dev/null || echo "unknown")
    echo -e "${YELLOW}⚠️  Port 3001 in use by $PROCESS_NAME (PID: $PORT_PID)${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✓${NC}"
fi

# =====================================================
# 4. Build Checks
# =====================================================
echo -e "\n${BLUE}4. Build Checks${NC}"

# Check if dist is older than src
echo -n "  Checking if build is current... "
if [ -d "$PROJECT_ROOT/apps/api/dist" ]; then
    SRC_NEWEST=$(find "$PROJECT_ROOT/apps/api/src" -name "*.ts" -newer "$PROJECT_ROOT/apps/api/dist/index.js" 2>/dev/null | head -1)
    if [ -n "$SRC_NEWEST" ]; then
        echo -e "${YELLOW}⚠️  Source files newer than build - rebuild needed${NC}"
        WARNINGS=$((WARNINGS + 1))
        ISSUES_TO_FIX+=("REBUILD_NEEDED")
    else
        echo -e "${GREEN}✓${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No dist folder - build needed${NC}"
    WARNINGS=$((WARNINGS + 1))
    ISSUES_TO_FIX+=("REBUILD_NEEDED")
fi

# =====================================================
# 5. Environment Checks
# =====================================================
echo -e "\n${BLUE}5. Environment Checks${NC}"

# Check which database is configured
echo -n "  Checking database configuration... "
if [ -f "$PROJECT_ROOT/apps/api/.env" ]; then
    DB_NAME=$(grep DATABASE_URL "$PROJECT_ROOT/apps/api/.env" | sed 's/.*\///' | cut -d'?' -f1)
    echo -e "${GREEN}✓ Using database: $DB_NAME${NC}"
else
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# =====================================================
# 6. Linting
# =====================================================
echo -e "\n${BLUE}6. Linting${NC}"
echo -n "  Running lint... "
if cd "$PROJECT_ROOT" && pnpm lint > /tmp/lint.log 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    LINT_ERRORS=$(cat /tmp/lint.log | grep -c "error" || true)
    echo -e "${YELLOW}⚠️  $LINT_ERRORS lint issues${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# =====================================================
# Summary
# =====================================================
echo ""
echo "================================"
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Pre-deploy check failed: $ERRORS error(s), $WARNINGS warning(s)${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Pre-deploy check passed with $WARNINGS warning(s)${NC}"

    # Offer to auto-fix
    if [ ${#ISSUES_TO_FIX[@]} -gt 0 ]; then
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
