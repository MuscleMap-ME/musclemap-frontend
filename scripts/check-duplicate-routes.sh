#!/bin/bash
# Check for duplicate route definitions in the API codebase
# This script should be run before deployment to catch route conflicts

set -e

ROUTES_DIR="${1:-apps/api/src/http/routes}"
ERRORS=0

echo "🔍 Checking for duplicate route definitions in $ROUTES_DIR..."
echo

# Extract all route definitions with file and line info
# Pattern: app.(get|post|put|patch|delete)\s*\(['"](\/[^'"]*)['"
ROUTE_DEFS=$(grep -rn "app\.\(get\|post\|put\|patch\|delete\)" "$ROUTES_DIR" 2>/dev/null | \
  grep -oP "([^:]+):(\d+):.*app\.(get|post|put|patch|delete)\s*\(['\"]([^'\"]+)['\"]" | \
  sed -E "s/([^:]+):([0-9]+):.*app\.(get|post|put|patch|delete)\s*\(['\"]([^'\"]+)['\"].*/\4|\3|\1:\2/" || true)

# Also check fastify routes
FASTIFY_DEFS=$(grep -rn "fastify\.\(get\|post\|put\|patch\|delete\)" "$ROUTES_DIR" 2>/dev/null | \
  grep -oP "([^:]+):(\d+):.*fastify\.(get|post|put|patch|delete)\s*\(['\"]([^'\"]+)['\"]" | \
  sed -E "s/([^:]+):([0-9]+):.*fastify\.(get|post|put|patch|delete)\s*\(['\"]([^'\"]+)['\"].*/\4|\3|\1:\2/" || true)

ALL_ROUTES="$ROUTE_DEFS"$'\n'"$FASTIFY_DEFS"

# Check for duplicates (same method + route combo)
echo "$ALL_ROUTES" | sort | while read -r line; do
  if [ -z "$line" ]; then continue; fi

  route=$(echo "$line" | cut -d'|' -f1)
  method=$(echo "$line" | cut -d'|' -f2)
  location=$(echo "$line" | cut -d'|' -f3)

  key="${method}:${route}"

  # Count occurrences
  count=$(echo "$ALL_ROUTES" | grep -c "^${route}|${method}|" || true)

  if [ "$count" -gt 1 ]; then
    echo "❌ DUPLICATE: $method $route"
    echo "   Found in: $location"
    ERRORS=1
  fi
done | sort -u

if [ "$ERRORS" -eq 1 ]; then
  echo
  echo "❌ Found duplicate route definitions! Fix these before deploying."
  exit 1
fi

echo "✅ No duplicate routes found."
exit 0
