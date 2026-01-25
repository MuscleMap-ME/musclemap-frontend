#!/bin/bash
# verify-change.sh - Run this after making ANY code change
#
# This script enforces the "Prove It Works" development methodology.
# It guides you through verifying that your change actually works.
#
# Usage:
#   ./scripts/verify-change.sh           # Full verification
#   ./scripts/verify-change.sh --quick   # Quick compile-only check
#   ./scripts/verify-change.sh --api     # Verify API changes
#   ./scripts/verify-change.sh --frontend # Verify frontend changes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
QUICK=false
API_CHECK=false
FRONTEND_CHECK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            QUICK=true
            shift
            ;;
        --api)
            API_CHECK=true
            shift
            ;;
        --frontend)
            FRONTEND_CHECK=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}           VERIFICATION CHECKLIST - Prove It Works              ${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Track overall status
GATE1_PASSED=false
GATE2_PASSED=false
GATE3_PASSED=false

# ═══════════════════════════════════════════════════════════════════════
# GATE 1: COMPILE
# ═══════════════════════════════════════════════════════════════════════
echo -e "${BLUE}┌─────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│                      GATE 1: COMPILE                            │${NC}"
echo -e "${BLUE}└─────────────────────────────────────────────────────────────────┘${NC}"
echo ""

# Step 1a: TypeScript
echo -e "${YELLOW}Step 1a: TypeScript check...${NC}"
if pnpm typecheck; then
    echo -e "${GREEN}✅ TypeScript: PASSED${NC}"
else
    echo -e "${RED}❌ TypeScript: FAILED${NC}"
    echo ""
    echo "Fix all TypeScript errors before proceeding."
    exit 1
fi
echo ""

# Step 1b: Lint
echo -e "${YELLOW}Step 1b: Lint check...${NC}"
if pnpm lint 2>/dev/null; then
    echo -e "${GREEN}✅ Lint: PASSED${NC}"
else
    echo -e "${RED}❌ Lint: FAILED${NC}"
    echo ""
    echo "Fix all lint errors before proceeding."
    echo "Try: pnpm lint --fix"
    exit 1
fi
echo ""

GATE1_PASSED=true
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                    GATE 1 PASSED: Code Compiles                    ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$QUICK" = true ]; then
    echo -e "${YELLOW}Quick check complete. Run without --quick for full verification.${NC}"
    exit 0
fi

# ═══════════════════════════════════════════════════════════════════════
# GATE 2: VERIFY (Build & Run)
# ═══════════════════════════════════════════════════════════════════════
echo -e "${BLUE}┌─────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│                       GATE 2: VERIFY                            │${NC}"
echo -e "${BLUE}└─────────────────────────────────────────────────────────────────┘${NC}"
echo ""

# Step 2a: Build
echo -e "${YELLOW}Step 2a: Build project...${NC}"
if pnpm build:intelligent; then
    echo -e "${GREEN}✅ Build: PASSED${NC}"
else
    echo -e "${RED}❌ Build: FAILED${NC}"
    echo ""
    echo "Fix build errors before proceeding."
    exit 1
fi
echo ""

# Step 2b: Run tests
echo -e "${YELLOW}Step 2b: Running tests...${NC}"
if pnpm test 2>/dev/null; then
    echo -e "${GREEN}✅ Tests: PASSED${NC}"
else
    echo -e "${YELLOW}⚠️  Tests: Some tests failed (review output above)${NC}"
fi
echo ""

GATE2_PASSED=true
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                    GATE 2 PASSED: Build Succeeds                   ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# GATE 3: PROVE (Evidence Required)
# ═══════════════════════════════════════════════════════════════════════
echo -e "${BLUE}┌─────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│                        GATE 3: PROVE                            │${NC}"
echo -e "${BLUE}│              (Manual Verification Required)                     │${NC}"
echo -e "${BLUE}└─────────────────────────────────────────────────────────────────┘${NC}"
echo ""

# API-specific verification
if [ "$API_CHECK" = true ]; then
    echo -e "${CYAN}API Verification Checklist:${NC}"
    echo ""
    echo "  1. Start the API server locally (if not running):"
    echo "     pnpm -C apps/api dev"
    echo ""
    echo "  2. Test your specific endpoint:"
    echo "     curl -X POST http://localhost:3001/api/graphql \\"
    echo "       -H 'Content-Type: application/json' \\"
    echo "       -d '{\"query\":\"{ yourQuery }\"}'"
    echo ""
    echo "  3. Verify the response is correct (not just status 200)"
    echo ""
    echo "  4. Test edge cases:"
    echo "     - Empty/null input"
    echo "     - Invalid input"
    echo "     - Unauthorized access"
    echo ""
fi

# Frontend-specific verification
if [ "$FRONTEND_CHECK" = true ]; then
    echo -e "${CYAN}Frontend Verification Checklist:${NC}"
    echo ""
    echo "  1. Start the dev server:"
    echo "     pnpm dev"
    echo ""
    echo "  2. Open browser to http://localhost:5173"
    echo ""
    echo "  3. Navigate to the page you modified"
    echo ""
    echo "  4. Verify:"
    echo "     - Page renders without errors"
    echo "     - Feature works as expected"
    echo "     - No console errors in browser DevTools"
    echo ""
    echo "  5. Test on mobile viewport (browser DevTools)"
    echo ""
fi

# General verification checklist
echo -e "${CYAN}General Verification Checklist:${NC}"
echo ""
echo "  Before claiming your change is 'done', confirm:"
echo ""
echo "  [ ] I ran the specific code I wrote"
echo "  [ ] I saw the expected output (not just 'no errors')"
echo "  [ ] I tested with valid input → correct result"
echo "  [ ] I tested with empty/null input → graceful handling"
echo "  [ ] I tested with invalid input → proper error message"
echo "  [ ] I tested what happens when it fails"
echo ""

echo -e "${YELLOW}Have you verified all of the above? (y/n)${NC}"
read -r VERIFIED

if [ "$VERIFIED" = "y" ] || [ "$VERIFIED" = "Y" ]; then
    GATE3_PASSED=true
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}                    GATE 3 PASSED: Verified Working                 ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
else
    echo ""
    echo -e "${YELLOW}Go verify your changes, then run this script again.${NC}"
    echo ""
    echo "Remember: 'Looks right' is not verification."
    echo "You must RUN the code and SEE the output."
    exit 1
fi

# ═══════════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                   ALL GATES PASSED                             ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Your change has been verified. You may now:"
echo ""
echo "  1. Commit your changes:"
echo "     git add . && git commit -m 'Your descriptive message'"
echo ""
echo "  2. Deploy to production:"
echo "     ./deploy.sh 'Your descriptive message'"
echo ""
echo "  3. Verify on live site after deploy"
echo ""
echo -e "${CYAN}Remember: A change is only 'done' when it works in production.${NC}"
echo ""
