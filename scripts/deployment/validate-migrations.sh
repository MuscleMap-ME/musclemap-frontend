#!/bin/bash
# Migration Validation Script
# Validates migration files for safety before commit/deploy
#
# Checks:
# 1. No duplicate migration numbers
# 2. Destructive operations are acknowledged
# 3. Migration files are properly formatted
# 4. No unsafe patterns

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
MIGRATIONS_DIR="$PROJECT_ROOT/apps/api/src/db/migrations"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo "🔍 Validating migrations..."

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${YELLOW}⚠️  Migrations directory not found: $MIGRATIONS_DIR${NC}"
    exit 0
fi

# Get all migration files
MIGRATION_FILES=$(ls "$MIGRATIONS_DIR"/*.ts 2>/dev/null || true)

if [ -z "$MIGRATION_FILES" ]; then
    echo -e "${GREEN}✓ No migration files to validate${NC}"
    exit 0
fi

# =====================================================
# CHECK 1: Duplicate Migration Numbers
# =====================================================
echo -n "  Checking for duplicate migration numbers... "

DUPES=$(ls "$MIGRATIONS_DIR"/*.ts 2>/dev/null | xargs -I {} basename {} | \
    sed 's/_.*//' | sort | uniq -d)

if [ -n "$DUPES" ]; then
    echo -e "${RED}✗${NC}"
    echo -e "  ${RED}Duplicate migration numbers found: $DUPES${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC}"
fi

# =====================================================
# CHECK 2: Destructive Operations
# =====================================================
echo -n "  Checking for destructive operations... "

DESTRUCTIVE_FILES=""
for file in $MIGRATION_FILES; do
    filename=$(basename "$file")

    # Check for destructive patterns
    if grep -qE "(DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE|DELETE\s+FROM\s+[a-z_]+\s*;)" "$file" 2>/dev/null; then
        # Check if it has DESTRUCTIVE marker
        if ! grep -q "// DESTRUCTIVE:" "$file" && ! grep -q "/* DESTRUCTIVE:" "$file"; then
            DESTRUCTIVE_FILES="$DESTRUCTIVE_FILES $filename"
        fi
    fi
done

if [ -n "$DESTRUCTIVE_FILES" ]; then
    echo -e "${RED}✗${NC}"
    echo -e "  ${RED}Destructive migrations without acknowledgment:${NC}"
    for f in $DESTRUCTIVE_FILES; do
        echo -e "    ${RED}- $f${NC}"
    done
    echo -e "  ${YELLOW}Add '// DESTRUCTIVE: <reason>' comment to acknowledge${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC}"
fi

# =====================================================
# CHECK 3: NOT NULL without DEFAULT
# =====================================================
echo -n "  Checking for NOT NULL without DEFAULT... "

NOTNULL_FILES=""
for file in $MIGRATION_FILES; do
    filename=$(basename "$file")

    # Check for NOT NULL without DEFAULT (common cause of migration failures on existing data)
    if grep -qE "\.notNullable\(\)" "$file" 2>/dev/null; then
        if ! grep -qE "\.defaultTo\(" "$file" 2>/dev/null; then
            # Only warn if it's adding a column, not creating a new table
            if grep -qE "\.alterTable\(" "$file" 2>/dev/null; then
                NOTNULL_FILES="$NOTNULL_FILES $filename"
            fi
        fi
    fi
done

if [ -n "$NOTNULL_FILES" ]; then
    echo -e "${YELLOW}⚠️${NC}"
    echo -e "  ${YELLOW}Migrations adding NOT NULL columns without DEFAULT:${NC}"
    for f in $NOTNULL_FILES; do
        echo -e "    ${YELLOW}- $f${NC}"
    done
    echo -e "  ${YELLOW}This may fail on tables with existing data${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC}"
fi

# =====================================================
# CHECK 4: Missing Down Migration
# =====================================================
echo -n "  Checking for missing down migrations... "

MISSING_DOWN=""
for file in $MIGRATION_FILES; do
    filename=$(basename "$file")

    # Check if file has a down function
    if ! grep -qE "(export\s+async\s+function\s+down|exports\.down\s*=)" "$file" 2>/dev/null; then
        MISSING_DOWN="$MISSING_DOWN $filename"
    fi
done

if [ -n "$MISSING_DOWN" ]; then
    echo -e "${YELLOW}⚠️${NC}"
    echo -e "  ${YELLOW}Migrations without down() function:${NC}"
    for f in $MISSING_DOWN; do
        echo -e "    ${YELLOW}- $f${NC}"
    done
    echo -e "  ${YELLOW}Rollback will not be possible for these migrations${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC}"
fi

# =====================================================
# CHECK 5: Sequential Numbering
# =====================================================
echo -n "  Checking migration number sequence... "

NUMBERS=$(ls "$MIGRATIONS_DIR"/*.ts 2>/dev/null | xargs -I {} basename {} | \
    sed 's/_.*//' | sort -n)

EXPECTED=1
GAPS=""
for num in $NUMBERS; do
    # Remove leading zeros for comparison
    clean_num=$((10#$num))
    if [ "$clean_num" -ne "$EXPECTED" ] && [ "$clean_num" -ne "$((EXPECTED - 1))" ]; then
        # Check if it's actually a gap or just non-sequential start
        if [ "$EXPECTED" -gt 1 ]; then
            GAPS="$GAPS gap before $num"
        fi
    fi
    EXPECTED=$((clean_num + 1))
done

if [ -n "$GAPS" ]; then
    echo -e "${YELLOW}⚠️${NC}"
    echo -e "  ${YELLOW}Migration number gaps detected: $GAPS${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC}"
fi

# =====================================================
# CHECK 6: SQL Injection Patterns
# =====================================================
echo -n "  Checking for SQL injection patterns... "

INJECTION_FILES=""
for file in $MIGRATION_FILES; do
    filename=$(basename "$file")

    # Skip if file has SQL-SAFE marker (acknowledged false positive)
    if grep -q "// SQL-SAFE:" "$file" || grep -q "/\* SQL-SAFE:" "$file"; then
        continue
    fi

    # Check for string interpolation in raw SQL
    if grep -qE '`[^`]*\$\{[^}]+\}[^`]*`' "$file" 2>/dev/null; then
        INJECTION_FILES="$INJECTION_FILES $filename"
    fi

    # Check for string concatenation in SQL
    if grep -qE "raw\s*\(\s*['\"][^'\"]*['\"].*\+" "$file" 2>/dev/null; then
        INJECTION_FILES="$INJECTION_FILES $filename"
    fi
done

if [ -n "$INJECTION_FILES" ]; then
    echo -e "${RED}✗${NC}"
    echo -e "  ${RED}Potential SQL injection in migrations:${NC}"
    for f in $INJECTION_FILES; do
        echo -e "    ${RED}- $f${NC}"
    done
    echo -e "  ${YELLOW}Add '// SQL-SAFE: <reason>' comment to acknowledge false positives${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC}"
fi

# =====================================================
# Summary
# =====================================================
echo ""
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Migration validation failed: $ERRORS error(s), $WARNINGS warning(s)${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Migration validation passed with $WARNINGS warning(s)${NC}"
    exit 0
else
    echo -e "${GREEN}✅ Migration validation passed${NC}"
    exit 0
fi
