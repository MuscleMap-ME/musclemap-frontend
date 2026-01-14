#!/bin/bash
#
# competitive-analysis.sh - Automated Competitive Analysis for MuscleMap
#
# This script helps Claude Code perform regular competitive analysis.
# It should be run monthly or before major feature planning.
#
# Usage:
#   ./scripts/competitive-analysis.sh           # Full analysis
#   ./scripts/competitive-analysis.sh --gaps-only  # Update gaps only
#   ./scripts/competitive-analysis.sh --help    # Show help
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCS_DIR="$PROJECT_ROOT/docs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Files to update
COMPETITOR_ANALYSIS="$DOCS_DIR/COMPETITOR-FEATURE-ANALYSIS.md"
GAP_ANALYSIS="$DOCS_DIR/FEATURE-GAP-ANALYSIS.md"

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}     ${GREEN}MuscleMap Competitive Analysis${NC}                         ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --gaps-only    Only update the feature gap analysis (skip competitor research)"
    echo "  --check        Check when analysis was last updated"
    echo "  --help         Show this help message"
    echo ""
    echo "This script assists Claude Code in performing competitive analysis."
    echo "It provides context and prompts for a thorough review."
    echo ""
    echo "Files updated:"
    echo "  - docs/COMPETITOR-FEATURE-ANALYSIS.md"
    echo "  - docs/FEATURE-GAP-ANALYSIS.md"
    echo ""
    echo "Recommended frequency: Monthly"
}

check_last_update() {
    echo -e "${YELLOW}Checking last update times...${NC}"
    echo ""

    if [ -f "$COMPETITOR_ANALYSIS" ]; then
        LAST_MOD=$(stat -f "%Sm" -t "%Y-%m-%d" "$COMPETITOR_ANALYSIS" 2>/dev/null || stat -c "%y" "$COMPETITOR_ANALYSIS" 2>/dev/null | cut -d' ' -f1)
        echo -e "  Competitor Analysis: ${GREEN}$LAST_MOD${NC}"
    else
        echo -e "  Competitor Analysis: ${RED}Not found${NC}"
    fi

    if [ -f "$GAP_ANALYSIS" ]; then
        LAST_MOD=$(stat -f "%Sm" -t "%Y-%m-%d" "$GAP_ANALYSIS" 2>/dev/null || stat -c "%y" "$GAP_ANALYSIS" 2>/dev/null | cut -d' ' -f1)
        echo -e "  Gap Analysis: ${GREEN}$LAST_MOD${NC}"
    else
        echo -e "  Gap Analysis: ${RED}Not found${NC}"
    fi

    echo ""
}

show_current_features() {
    echo -e "${YELLOW}Current MuscleMap Feature Summary${NC}"
    echo "=================================="
    echo ""

    # Count API routes
    if [ -d "$PROJECT_ROOT/apps/api/src/http/routes" ]; then
        ROUTE_COUNT=$(find "$PROJECT_ROOT/apps/api/src/http/routes" -name "*.ts" | wc -l | tr -d ' ')
        echo -e "  API Route Files: ${GREEN}$ROUTE_COUNT${NC}"
    fi

    # Count modules
    if [ -d "$PROJECT_ROOT/apps/api/src/modules" ]; then
        MODULE_COUNT=$(find "$PROJECT_ROOT/apps/api/src/modules" -maxdepth 1 -type d | wc -l | tr -d ' ')
        echo -e "  Backend Modules: ${GREEN}$MODULE_COUNT${NC}"
    fi

    # Count frontend pages
    if [ -d "$PROJECT_ROOT/src/pages" ]; then
        PAGE_COUNT=$(find "$PROJECT_ROOT/src/pages" -name "*.jsx" -o -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')
        echo -e "  Frontend Pages: ${GREEN}$PAGE_COUNT${NC}"
    fi

    # Count migrations
    if [ -d "$PROJECT_ROOT/apps/api/src/db/migrations" ]; then
        MIGRATION_COUNT=$(find "$PROJECT_ROOT/apps/api/src/db/migrations" -name "*.ts" | wc -l | tr -d ' ')
        echo -e "  DB Migrations: ${GREEN}$MIGRATION_COUNT${NC}"
    fi

    echo ""
}

show_competitors() {
    echo -e "${YELLOW}Competitors to Analyze${NC}"
    echo "======================="
    echo ""
    echo "  Primary (Strength Training):"
    echo "    - Strong App (Apple Watch, RPE)"
    echo "    - Hevy (Social, 10M+ users)"
    echo "    - JEFIT (Database, Recovery)"
    echo "    - Fitbod (AI Generation)"
    echo ""
    echo "  Secondary (Broader Fitness):"
    echo "    - Nike Training Club (Free Videos)"
    echo "    - Peloton (AI Form Feedback)"
    echo "    - Apple Fitness+ (Ecosystem)"
    echo "    - Strava (Gamification)"
    echo ""
    echo "  Recovery & Wellness:"
    echo "    - WHOOP (HRV, Sleep, Strain)"
    echo "    - Oura (Recovery)"
    echo ""
    echo "  Coaching Platforms:"
    echo "    - Future, Caliber, Trainerize, TrueCoach"
    echo ""
}

show_analysis_prompt() {
    echo -e "${YELLOW}Analysis Prompt for Claude Code${NC}"
    echo "================================"
    echo ""
    echo "When performing competitive analysis, research and document:"
    echo ""
    echo "1. COMPETITOR RESEARCH"
    echo "   - Search for '[App Name] features 2025/2026'"
    echo "   - Check official websites and app stores"
    echo "   - Note pricing and user counts"
    echo "   - Document unique differentiators"
    echo ""
    echo "2. FEATURE COMPARISON"
    echo "   - Core workout tracking (sets, reps, timers)"
    echo "   - Progress analytics (1RM, charts, PRs)"
    echo "   - AI & personalization"
    echo "   - Social features"
    echo "   - Gamification"
    echo "   - Nutrition tracking"
    echo "   - Recovery & wellness"
    echo "   - Wearable integrations"
    echo "   - Video content"
    echo ""
    echo "3. GAP ANALYSIS"
    echo "   - P0: Critical (table stakes)"
    echo "   - P1: High (retention drivers)"
    echo "   - P2: Medium (nice-to-have)"
    echo "   - P3: Low (future consideration)"
    echo ""
    echo "4. IMPLEMENTATION ROADMAP"
    echo "   - Prioritize by user impact vs effort"
    echo "   - Create phased implementation plan"
    echo "   - Identify quick wins"
    echo ""
}

main() {
    print_header

    case "${1:-}" in
        --help)
            print_help
            exit 0
            ;;
        --check)
            check_last_update
            exit 0
            ;;
        --gaps-only)
            echo -e "${GREEN}Running gap analysis update only...${NC}"
            echo ""
            show_current_features
            echo -e "${YELLOW}Please update: docs/FEATURE-GAP-ANALYSIS.md${NC}"
            echo ""
            exit 0
            ;;
        *)
            check_last_update
            show_current_features
            show_competitors
            show_analysis_prompt

            echo ""
            echo -e "${GREEN}Ready for analysis!${NC}"
            echo ""
            echo "Documents to update:"
            echo "  1. docs/COMPETITOR-FEATURE-ANALYSIS.md"
            echo "  2. docs/FEATURE-GAP-ANALYSIS.md"
            echo ""
            echo "After analysis, run:"
            echo "  pnpm docs:generate"
            echo "  ./deploy.sh 'Update competitive analysis'"
            echo ""
            ;;
    esac
}

main "$@"
