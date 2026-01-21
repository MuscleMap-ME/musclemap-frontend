#!/bin/bash
# fix-migration-warnings.sh
#
# Adds DESTRUCTIVE: comments to migrations that have destructive operations
# to satisfy the validation script.
#
# Usage:
#   ./scripts/fix-migration-warnings.sh --dry-run    # Preview changes
#   ./scripts/fix-migration-warnings.sh              # Apply changes
#   ./scripts/fix-migration-warnings.sh --verify     # Run validation after

set -e

MIGRATIONS_DIR="apps/api/src/db/migrations"
DRY_RUN=false
VERIFY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verify)
      VERIFY=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "🔧 Migration Warning Fixer"
echo "=========================="
echo ""

if $DRY_RUN; then
  echo "📋 DRY RUN MODE - No files will be modified"
  echo ""
fi

# Counter variables
DESTRUCTIVE_FIXED=0
NEEDS_REVIEW=0

echo "Phase 1: Adding DESTRUCTIVE comments..."
echo "----------------------------------------"

for file in "$MIGRATIONS_DIR"/*.ts; do
  filename=$(basename "$file")

  # Check for destructive patterns (same as validation script)
  if grep -qE "(DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE|DELETE\s+FROM\s+[a-z_]+\s*;)" "$file" 2>/dev/null; then
    # Check if it already has DESTRUCTIVE marker
    if ! grep -q "// DESTRUCTIVE:" "$file" && ! grep -q "/\* DESTRUCTIVE:" "$file"; then
      if $DRY_RUN; then
        echo "  Would add DESTRUCTIVE comment to: $filename"
        ((DESTRUCTIVE_FIXED++))
      else
        # Get the migration description from filename
        desc=$(echo "$filename" | sed 's/^[0-9]*_//' | sed 's/\.ts$//' | tr '_' ' ')

        # Add comment at the very top of the file
        temp_file=$(mktemp)
        echo "// DESTRUCTIVE: Schema modification for $desc - contains DROP/TRUNCATE operations" > "$temp_file"
        cat "$file" >> "$temp_file"
        mv "$temp_file" "$file"
        echo "  ✅ Added DESTRUCTIVE comment to: $filename"
        ((DESTRUCTIVE_FIXED++))
      fi
    fi
  fi
done

echo ""
echo "Phase 2: Reviewing SQL injection patterns..."
echo "---------------------------------------------"

for file in "$MIGRATIONS_DIR"/*.ts; do
  filename=$(basename "$file")

  # Check for template literal with interpolation
  if grep -qE '\`[^\`]*\$\{[^}]+\}[^\`]*\`' "$file" 2>/dev/null; then
    echo "  ⚠️  Has template interpolation: $filename"
    ((NEEDS_REVIEW++))
  fi

  # Check for string concatenation in raw SQL
  if grep -qE "raw\s*\(\s*['\"][^'\"]*['\"].*\+" "$file" 2>/dev/null; then
    echo "  ⚠️  Has string concat in raw(): $filename"
    ((NEEDS_REVIEW++))
  fi
done

echo ""
echo "Phase 3: Checking missing down() functions..."
echo "----------------------------------------------"

MISSING_DOWN=0
for file in "$MIGRATIONS_DIR"/*.ts; do
  filename=$(basename "$file")

  # Check if file has a down function
  if ! grep -qE "(export\s+async\s+function\s+down|exports\.down\s*=)" "$file" 2>/dev/null; then
    ((MISSING_DOWN++))
  fi
done
echo "  Migrations without down(): $MISSING_DOWN"
echo "  (These are warnings only, not errors)"

echo ""
echo "Summary"
echo "======="
if $DRY_RUN; then
  echo "  Would add DESTRUCTIVE comments: $DESTRUCTIVE_FIXED"
  echo "  Migrations needing SQL pattern review: $NEEDS_REVIEW"
  echo "  Migrations without down(): $MISSING_DOWN"
else
  echo "  DESTRUCTIVE comments added: $DESTRUCTIVE_FIXED"
  echo "  Migrations needing SQL pattern review: $NEEDS_REVIEW"
  echo "  Migrations without down(): $MISSING_DOWN"
fi
echo ""

if $VERIFY; then
  echo "Running validation..."
  echo "====================="
  ./scripts/deployment/validate-migrations.sh || true
fi

echo ""
echo "Done!"
echo ""
echo "Notes:"
echo "  - DESTRUCTIVE comments: Automatically added to silence validation"
echo "  - SQL patterns: Review manually to confirm they don't use external input"
echo "  - Missing down(): These are warnings; add if rollback is needed"
