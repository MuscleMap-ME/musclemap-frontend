#!/bin/bash
# Warning Tracker - Tracks, triages, and auto-resolves common warnings
# Usage: ./scripts/warning-tracker.sh [scan|fix|status|clear]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WARNING_LOG="$PROJECT_ROOT/.warning-log.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Initialize warning log if doesn't exist
init_log() {
    if [ ! -f "$WARNING_LOG" ]; then
        echo '{"warnings": [], "auto_fixed": [], "last_scan": null}' > "$WARNING_LOG"
    fi
}

# Scan for warnings
scan_warnings() {
    echo -e "${BLUE}🔍 Scanning for warnings...${NC}"

    WARNINGS=()

    # 1. Unused imports (TypeScript)
    UNUSED=$(cd "$PROJECT_ROOT" && pnpm typecheck 2>&1 | grep "is declared but" | head -20 || true)
    if [ -n "$UNUSED" ]; then
        while IFS= read -r line; do
            FILE=$(echo "$line" | cut -d'(' -f1 | xargs)
            WARNINGS+=("{\"type\": \"UNUSED_IMPORT\", \"file\": \"$FILE\", \"severity\": \"low\", \"auto_fixable\": true}")
        done <<< "$UNUSED"
    fi

    # 2. JSONB parse anti-patterns
    JSONB=$(grep -rn "JSON\.parse.*\(row\|result\|data\)\." "$PROJECT_ROOT/apps/api/src" --include="*.ts" 2>/dev/null || true)
    if [ -n "$JSONB" ]; then
        while IFS= read -r line; do
            FILE=$(echo "$line" | cut -d':' -f1)
            LINE_NUM=$(echo "$line" | cut -d':' -f2)
            WARNINGS+=("{\"type\": \"JSONB_PARSE\", \"file\": \"$FILE\", \"line\": $LINE_NUM, \"severity\": \"high\", \"auto_fixable\": false}")
        done <<< "$JSONB"
    fi

    # 3. Console.log in production code
    CONSOLE=$(grep -rn "console\.log" "$PROJECT_ROOT/apps/api/src" --include="*.ts" 2>/dev/null | grep -v "test" | grep -v ".spec" || true)
    if [ -n "$CONSOLE" ]; then
        while IFS= read -r line; do
            FILE=$(echo "$line" | cut -d':' -f1)
            LINE_NUM=$(echo "$line" | cut -d':' -f2)
            WARNINGS+=("{\"type\": \"CONSOLE_LOG\", \"file\": \"$FILE\", \"line\": $LINE_NUM, \"severity\": \"medium\", \"auto_fixable\": true}")
        done <<< "$CONSOLE"
    fi

    # 4. Duplicate migration numbers
    DUPE_MIGRATIONS=$(ls "$PROJECT_ROOT/apps/api/src/db/migrations/"*.ts 2>/dev/null | xargs -I {} basename {} | sed 's/_.*//' | sort | uniq -d)
    if [ -n "$DUPE_MIGRATIONS" ]; then
        while IFS= read -r num; do
            WARNINGS+=("{\"type\": \"DUPLICATE_MIGRATION\", \"migration_number\": \"$num\", \"severity\": \"critical\", \"auto_fixable\": false}")
        done <<< "$DUPE_MIGRATIONS"
    fi

    # 5. SQL string interpolation (security)
    SQL_INTERP=$(grep -rn "\`.*SELECT.*\\\${" "$PROJECT_ROOT/apps/api/src" --include="*.ts" 2>/dev/null || true)
    if [ -n "$SQL_INTERP" ]; then
        while IFS= read -r line; do
            FILE=$(echo "$line" | cut -d':' -f1)
            LINE_NUM=$(echo "$line" | cut -d':' -f2)
            WARNINGS+=("{\"type\": \"SQL_INJECTION_RISK\", \"file\": \"$FILE\", \"line\": $LINE_NUM, \"severity\": \"critical\", \"auto_fixable\": false}")
        done <<< "$SQL_INTERP"
    fi

    # Output warnings
    echo -e "\n${BLUE}Found ${#WARNINGS[@]} warning(s)${NC}"

    # Update log
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    WARNINGS_JSON=$(printf '%s\n' "${WARNINGS[@]}" | jq -s '.')

    jq --arg ts "$TIMESTAMP" --argjson warns "$WARNINGS_JSON" \
        '.warnings = $warns | .last_scan = $ts' "$WARNING_LOG" > "$WARNING_LOG.tmp" && mv "$WARNING_LOG.tmp" "$WARNING_LOG"

    # Display by severity
    for sev in critical high medium low; do
        COUNT=$(echo "$WARNINGS_JSON" | jq "[.[] | select(.severity == \"$sev\")] | length")
        if [ "$COUNT" -gt 0 ]; then
            case $sev in
                critical) COLOR=$RED ;;
                high) COLOR=$YELLOW ;;
                medium) COLOR=$BLUE ;;
                low) COLOR=$NC ;;
            esac
            echo -e "  ${COLOR}$sev: $COUNT${NC}"
        fi
    done
}

# Auto-fix warnings where possible
fix_warnings() {
    echo -e "${BLUE}🔧 Auto-fixing warnings...${NC}"
    init_log

    FIXED=0

    # Fix unused imports via lint
    echo -n "  Fixing lint issues... "
    if cd "$PROJECT_ROOT" && pnpm lint --fix > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        FIXED=$((FIXED + 1))
    else
        echo -e "${YELLOW}partial${NC}"
    fi

    # Remove console.logs (with confirmation for each)
    echo -n "  Checking console.logs... "
    CONSOLE_COUNT=$(grep -rn "console\.log" "$PROJECT_ROOT/apps/api/src" --include="*.ts" 2>/dev/null | grep -v "test" | grep -v ".spec" | wc -l || true)
    if [ "$CONSOLE_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}$CONSOLE_COUNT found (manual review needed)${NC}"
    else
        echo -e "${GREEN}✓ none${NC}"
    fi

    echo -e "\n${GREEN}Auto-fixed $FIXED issue(s)${NC}"
}

# Show status
show_status() {
    init_log
    echo -e "${BLUE}📊 Warning Status${NC}"
    echo "================================"

    if [ -f "$WARNING_LOG" ]; then
        LAST_SCAN=$(jq -r '.last_scan // "never"' "$WARNING_LOG")
        TOTAL=$(jq '.warnings | length' "$WARNING_LOG")
        CRITICAL=$(jq '[.warnings[] | select(.severity == "critical")] | length' "$WARNING_LOG")
        HIGH=$(jq '[.warnings[] | select(.severity == "high")] | length' "$WARNING_LOG")

        echo "  Last scan: $LAST_SCAN"
        echo "  Total warnings: $TOTAL"
        echo -e "  ${RED}Critical: $CRITICAL${NC}"
        echo -e "  ${YELLOW}High: $HIGH${NC}"

        if [ "$CRITICAL" -gt 0 ]; then
            echo -e "\n${RED}⚠️  Critical issues require immediate attention!${NC}"
            jq -r '.warnings[] | select(.severity == "critical") | "  - \(.type): \(.file // .migration_number)"' "$WARNING_LOG"
        fi
    else
        echo "  No scan data. Run: ./scripts/warning-tracker.sh scan"
    fi
}

# Clear warnings
clear_warnings() {
    echo '{"warnings": [], "auto_fixed": [], "last_scan": null}' > "$WARNING_LOG"
    echo -e "${GREEN}✓ Warning log cleared${NC}"
}

# Main
init_log

case "${1:-status}" in
    scan)
        scan_warnings
        ;;
    fix)
        fix_warnings
        ;;
    status)
        show_status
        ;;
    clear)
        clear_warnings
        ;;
    *)
        echo "Usage: $0 [scan|fix|status|clear]"
        exit 1
        ;;
esac
