#!/bin/bash
# auto-validate.sh - Autonomous deployment validation
# Run this after ANY deployment to verify success WITHOUT user involvement
#
# Usage:
#   ./scripts/auto-validate.sh                    # Validate production
#   ./scripts/auto-validate.sh http://localhost:3001  # Validate local
#   ./scripts/auto-validate.sh --quick            # Fast validation only

set -e

BASE_URL="${1:-https://musclemap.me}"
QUICK_MODE=false
FAILED=0
WARNINGS=0

# Parse args
if [ "$1" = "--quick" ]; then
    QUICK_MODE=true
    BASE_URL="${2:-https://musclemap.me}"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}       AUTONOMOUS DEPLOYMENT VALIDATION                        ${NC}"
echo -e "${CYAN}       Target: $BASE_URL                                       ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# 1. HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════
echo -e "${CYAN}1. Health Check${NC}"
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" 2>/dev/null || echo "000")
HEALTH_BODY=$(curl -s "$BASE_URL/health" 2>/dev/null || echo "")

if [ "$HEALTH_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ /health returns 200${NC}"
    # Check response contains expected fields
    if echo "$HEALTH_BODY" | grep -q '"status"'; then
        echo -e "   ${GREEN}✅ Health response has status field${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Health response missing status field${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "   ${RED}❌ /health returns $HEALTH_CODE (expected 200)${NC}"
    FAILED=$((FAILED + 1))
fi

# ═══════════════════════════════════════════════════════════════════════
# 2. GRAPHQL SCHEMA
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}2. GraphQL Schema${NC}"
GQL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { queryType { name } mutationType { name } } }"}' 2>/dev/null || echo "CURL_FAILED")

if echo "$GQL_RESPONSE" | grep -q "__schema"; then
    echo -e "   ${GREEN}✅ GraphQL introspection works${NC}"
    if echo "$GQL_RESPONSE" | grep -q "Query"; then
        echo -e "   ${GREEN}✅ Query type available${NC}"
    fi
    if echo "$GQL_RESPONSE" | grep -q "Mutation"; then
        echo -e "   ${GREEN}✅ Mutation type available${NC}"
    fi
else
    echo -e "   ${RED}❌ GraphQL introspection failed${NC}"
    echo -e "   Response: $GQL_RESPONSE"
    FAILED=$((FAILED + 1))
fi

# ═══════════════════════════════════════════════════════════════════════
# 3. HOMEPAGE
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}3. Homepage${NC}"
HOMEPAGE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" 2>/dev/null || echo "000")

if [ "$HOMEPAGE_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ Homepage returns 200${NC}"
else
    echo -e "   ${RED}❌ Homepage returns $HOMEPAGE_CODE${NC}"
    FAILED=$((FAILED + 1))
fi

# ═══════════════════════════════════════════════════════════════════════
# 4. STATIC ASSETS
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}4. Static Assets${NC}"
HOMEPAGE_CONTENT=$(curl -s "$BASE_URL/" 2>/dev/null || echo "")
JS_COUNT=$(echo "$HOMEPAGE_CONTENT" | grep -c "\.js" || true)
CSS_COUNT=$(echo "$HOMEPAGE_CONTENT" | grep -c "\.css" || true)

if [ "$JS_COUNT" -gt 0 ]; then
    echo -e "   ${GREEN}✅ Found $JS_COUNT JavaScript references${NC}"
else
    echo -e "   ${RED}❌ No JavaScript files found (blank page?)${NC}"
    FAILED=$((FAILED + 1))
fi

if [ "$CSS_COUNT" -gt 0 ]; then
    echo -e "   ${GREEN}✅ Found $CSS_COUNT CSS references${NC}"
else
    echo -e "   ${YELLOW}⚠️  No CSS files found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# ═══════════════════════════════════════════════════════════════════════
# 5. RESPONSE TIMES
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}5. Response Times${NC}"

# Health endpoint
HEALTH_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/health" 2>/dev/null || echo "9999")
HEALTH_MS=$(echo "$HEALTH_TIME * 1000" | bc 2>/dev/null | cut -d. -f1 || echo "9999")
if [ "$HEALTH_MS" -lt 200 ]; then
    echo -e "   ${GREEN}✅ /health: ${HEALTH_MS}ms (excellent)${NC}"
elif [ "$HEALTH_MS" -lt 500 ]; then
    echo -e "   ${GREEN}✅ /health: ${HEALTH_MS}ms (good)${NC}"
else
    echo -e "   ${YELLOW}⚠️  /health: ${HEALTH_MS}ms (slow)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# GraphQL endpoint
GQL_TIME=$(curl -s -o /dev/null -w "%{time_total}" -X POST "$BASE_URL/api/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' 2>/dev/null || echo "9999")
GQL_MS=$(echo "$GQL_TIME * 1000" | bc 2>/dev/null | cut -d. -f1 || echo "9999")
if [ "$GQL_MS" -lt 300 ]; then
    echo -e "   ${GREEN}✅ /api/graphql: ${GQL_MS}ms (excellent)${NC}"
elif [ "$GQL_MS" -lt 800 ]; then
    echo -e "   ${GREEN}✅ /api/graphql: ${GQL_MS}ms (good)${NC}"
else
    echo -e "   ${YELLOW}⚠️  /api/graphql: ${GQL_MS}ms (slow)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Skip extended tests in quick mode
if [ "$QUICK_MODE" = true ]; then
    echo ""
    echo -e "${YELLOW}Quick mode: Skipping extended tests${NC}"
else
    # ═══════════════════════════════════════════════════════════════════════
    # 6. API SMOKE TESTS
    # ═══════════════════════════════════════════════════════════════════════
    echo ""
    echo -e "${CYAN}6. API Smoke Tests${NC}"

    # Test exercises query (public)
    EXERCISES=$(curl -s -X POST "$BASE_URL/api/graphql" \
      -H "Content-Type: application/json" \
      -d '{"query":"{ exercises(limit: 1) { id name } }"}' 2>/dev/null || echo "")
    if echo "$EXERCISES" | grep -q '"exercises"'; then
        echo -e "   ${GREEN}✅ Exercises query works${NC}"
    else
        echo -e "   ${RED}❌ Exercises query failed${NC}"
        FAILED=$((FAILED + 1))
    fi

    # Test health query (GraphQL)
    HEALTH_GQL=$(curl -s -X POST "$BASE_URL/api/graphql" \
      -H "Content-Type: application/json" \
      -d '{"query":"{ health { status } }"}' 2>/dev/null || echo "")
    if echo "$HEALTH_GQL" | grep -q '"health"'; then
        echo -e "   ${GREEN}✅ Health query works${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Health query failed (may not be implemented)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi

    # ═══════════════════════════════════════════════════════════════════════
    # 7. CRITICAL PAGES
    # ═══════════════════════════════════════════════════════════════════════
    echo ""
    echo -e "${CYAN}7. Critical Pages${NC}"

    PAGES=("/login" "/register" "/dashboard")
    for PAGE in "${PAGES[@]}"; do
        PAGE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$PAGE" 2>/dev/null || echo "000")
        if [ "$PAGE_CODE" = "200" ]; then
            echo -e "   ${GREEN}✅ $PAGE returns 200${NC}"
        else
            echo -e "   ${YELLOW}⚠️  $PAGE returns $PAGE_CODE${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    done
fi

# ═══════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

if [ "$FAILED" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}✅ ALL VALIDATIONS PASSED${NC}"
    echo ""
    echo "Deployment verified successfully. No user action needed."
    exit 0
elif [ "$FAILED" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  PASSED WITH $WARNINGS WARNING(S)${NC}"
    echo ""
    echo "Deployment functional but has minor issues."
    exit 0
else
    echo -e "${RED}❌ $FAILED VALIDATION(S) FAILED${NC}"
    if [ "$WARNINGS" -gt 0 ]; then
        echo -e "${YELLOW}   Plus $WARNINGS warning(s)${NC}"
    fi
    echo ""
    echo "Review failures above. Fix before reporting to user."
    exit 1
fi
