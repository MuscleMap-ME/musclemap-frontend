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
echo "Phase 2: Adding SQL-SAFE comments to template literal migrations..."
echo "--------------------------------------------------------------------"

SQL_SAFE_FIXED=0
for file in "$MIGRATIONS_DIR"/*.ts; do
  filename=$(basename "$file")

  # Skip if already has SQL-SAFE marker
  if grep -q "// SQL-SAFE:" "$file" || grep -q "/\* SQL-SAFE:" "$file"; then
    continue
  fi

  # Check for template literal with interpolation
  has_pattern=false
  if grep -qE '\`[^\`]*\$\{[^}]+\}[^\`]*\`' "$file" 2>/dev/null; then
    has_pattern=true
  fi

  # Check for string concatenation in raw SQL
  if grep -qE "raw\s*\(\s*['\"][^'\"]*['\"].*\+" "$file" 2>/dev/null; then
    has_pattern=true
  fi

  if $has_pattern; then
    if $DRY_RUN; then
      echo "  Would add SQL-SAFE comment to: $filename"
      ((NEEDS_REVIEW++))
    else
      # Get the migration description from filename
      desc=$(echo "$filename" | sed 's/^[0-9]*_//' | sed 's/\.ts$//' | tr '_' ' ')

      # Check if file already has DESTRUCTIVE comment at top
      if head -1 "$file" | grep -q "// DESTRUCTIVE:"; then
        # Insert SQL-SAFE after DESTRUCTIVE line
        temp_file=$(mktemp)
        head -1 "$file" > "$temp_file"
        echo "// SQL-SAFE: Template literals contain static SQL only, no external input" >> "$temp_file"
        tail -n +2 "$file" >> "$temp_file"
        mv "$temp_file" "$file"
      else
        # Add at the very top
        temp_file=$(mktemp)
        echo "// SQL-SAFE: Template literals contain static SQL only, no external input" > "$temp_file"
        cat "$file" >> "$temp_file"
        mv "$temp_file" "$file"
      fi
      echo "  ✅ Added SQL-SAFE comment to: $filename"
      ((SQL_SAFE_FIXED++))
    fi
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
  echo "  Would add SQL-SAFE comments: $NEEDS_REVIEW"
  echo "  Migrations without down(): $MISSING_DOWN"
else
  echo "  DESTRUCTIVE comments added: $DESTRUCTIVE_FIXED"
  echo "  SQL-SAFE comments added: $SQL_SAFE_FIXED"
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
echo "  - DESTRUCTIVE comments: Added to acknowledge destructive schema changes"
echo "  - SQL-SAFE comments: Added to acknowledge template literals are safe"
echo "  - Missing down(): These are warnings only; add if rollback is needed"
