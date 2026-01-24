#!/bin/bash

# ============================================================================
# Migrate framer-motion imports to SafeMotion
# ============================================================================
#
# This script helps identify and migrate files that use framer-motion directly
# to use the SafeMotion wrappers instead, for iOS Lockdown Mode / Brave Shields
# compatibility.
#
# Usage:
#   ./scripts/migrate-to-safe-motion.sh          # List files needing migration
#   ./scripts/migrate-to-safe-motion.sh --count  # Just count files
#   ./scripts/migrate-to-safe-motion.sh --high   # Show highest priority files
#   ./scripts/migrate-to-safe-motion.sh --auto   # Auto-migrate simple cases
#
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  SafeMotion Migration Analysis${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Count files using direct framer-motion
PAGES_COUNT=$(grep -r "from 'framer-motion'" src/pages/ 2>/dev/null | wc -l | tr -d ' ')
COMPONENTS_COUNT=$(grep -r "from 'framer-motion'" src/components/ 2>/dev/null | wc -l | tr -d ' ')
UTILS_COUNT=$(grep -r "from 'framer-motion'" src/utils/ 2>/dev/null | wc -l | tr -d ' ')
HOOKS_COUNT=$(grep -r "from 'framer-motion'" src/hooks/ 2>/dev/null | wc -l | tr -d ' ')

# Count files already using SafeMotion
SAFEMOTION_COUNT=$(grep -r "from.*safeMotion" src/ 2>/dev/null | wc -l | tr -d ' ')

TOTAL=$((PAGES_COUNT + COMPONENTS_COUNT + UTILS_COUNT + HOOKS_COUNT))

echo -e "${YELLOW}Files using framer-motion directly:${NC}"
echo -e "  Pages:      ${RED}$PAGES_COUNT${NC}"
echo -e "  Components: ${RED}$COMPONENTS_COUNT${NC}"
echo -e "  Utils:      ${BLUE}$UTILS_COUNT${NC}"
echo -e "  Hooks:      ${BLUE}$HOOKS_COUNT${NC}"
echo -e "  ${YELLOW}Total:      $TOTAL${NC}"
echo ""
echo -e "${GREEN}Files already using SafeMotion: $SAFEMOTION_COUNT${NC}"
echo ""

if [ "$1" == "--count" ]; then
  exit 0
fi

# High priority files (pages and critical components)
if [ "$1" == "--high" ] || [ -z "$1" ]; then
  echo -e "${CYAN}============================================${NC}"
  echo -e "${CYAN}  High Priority Files (User-Facing)${NC}"
  echo -e "${CYAN}============================================${NC}"
  echo ""

  echo -e "${YELLOW}Pages using framer-motion:${NC}"
  grep -l "from 'framer-motion'" src/pages/*.tsx 2>/dev/null | while read file; do
    # Check if it also imports SafeMotion (partially migrated)
    if grep -q "safeMotion" "$file" 2>/dev/null; then
      echo -e "  ${YELLOW}$file${NC} (partial)"
    else
      echo -e "  ${RED}$file${NC}"
    fi
  done

  echo ""
  echo -e "${YELLOW}Critical Components:${NC}"

  # Navigation components - HIGHEST priority
  for file in src/components/glass/GlassNav.tsx \
              src/components/glass/GlassMobileNav.tsx \
              src/components/mobile/FloatingActionButton.tsx \
              src/components/mobile/BottomSheet.tsx \
              src/components/navigation/*.tsx; do
    if [ -f "$file" ] && grep -q "from 'framer-motion'" "$file" 2>/dev/null; then
      if grep -q "safeMotion" "$file" 2>/dev/null; then
        echo -e "  ${YELLOW}$file${NC} (partial)"
      else
        echo -e "  ${RED}$file${NC}"
      fi
    fi
  done

  echo ""
  echo -e "${YELLOW}Celebration Components (visible on key moments):${NC}"
  for file in src/components/celebrations/*.tsx \
              src/components/loot/*.tsx \
              src/components/gamification/*.tsx; do
    if [ -f "$file" ] && grep -q "from 'framer-motion'" "$file" 2>/dev/null; then
      echo -e "  ${RED}$file${NC}"
    fi
  done

  echo ""
  echo -e "${YELLOW}Mascot Components:${NC}"
  for file in src/components/mascot/**/*.tsx; do
    if [ -f "$file" ] && grep -q "from 'framer-motion'" "$file" 2>/dev/null; then
      echo -e "  ${RED}$file${NC}"
    fi
  done
fi

# Show migration instructions
if [ "$1" != "--auto" ]; then
  echo ""
  echo -e "${CYAN}============================================${NC}"
  echo -e "${CYAN}  Migration Instructions${NC}"
  echo -e "${CYAN}============================================${NC}"
  echo ""
  echo "For each file, replace:"
  echo ""
  echo -e "  ${RED}import { motion, AnimatePresence } from 'framer-motion';${NC}"
  echo ""
  echo "With:"
  echo ""
  echo -e "  ${GREEN}import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';${NC}"
  echo ""
  echo "Then replace usage:"
  echo ""
  echo -e "  ${RED}<motion.div ...>     ${NC} ->  ${GREEN}<SafeMotion.div ...>${NC}"
  echo -e "  ${RED}<motion.span ...>    ${NC} ->  ${GREEN}<SafeMotion.span ...>${NC}"
  echo -e "  ${RED}<AnimatePresence>    ${NC} ->  ${GREEN}<SafeAnimatePresence>${NC}"
  echo ""
  echo "For complex components with drag/layout animations, add a static fallback:"
  echo ""
  echo -e "  ${GREEN}const isRestrictive = getIsRestrictive();${NC}"
  echo -e "  ${GREEN}if (isRestrictive) {${NC}"
  echo -e "  ${GREEN}  return <StaticFallback />;${NC}"
  echo -e "  ${GREEN}}${NC}"
  echo ""
fi

# Auto-migration for simple cases
if [ "$1" == "--auto" ]; then
  echo ""
  echo -e "${CYAN}============================================${NC}"
  echo -e "${CYAN}  Auto-Migration (Simple Cases)${NC}"
  echo -e "${CYAN}============================================${NC}"
  echo ""
  echo -e "${YELLOW}This would modify files. Dry-run only for now.${NC}"
  echo ""

  # Find files that only use motion.div, motion.span, motion.button, AnimatePresence
  # These are safe to auto-migrate

  grep -l "from 'framer-motion'" src/pages/*.tsx src/components/**/*.tsx 2>/dev/null | while read file; do
    # Skip files that use complex features
    if grep -q "useDrag\|useMotion\|useAnimation\|useScroll\|useTransform\|Reorder\|LayoutGroup\|drag=" "$file" 2>/dev/null; then
      echo -e "  ${YELLOW}SKIP (complex):${NC} $file"
    else
      echo -e "  ${GREEN}CAN MIGRATE:${NC} $file"
    fi
  done

  echo ""
  echo "To actually migrate, edit the files manually or use sed:"
  echo ""
  echo "  # Replace import"
  echo "  sed -i '' \"s/import { motion } from 'framer-motion'/import { SafeMotion } from '@\\/utils\\/safeMotion'/g\" FILE"
  echo ""
  echo "  # Replace usage"
  echo "  sed -i '' 's/<motion\\./<SafeMotion./g' FILE"
  echo "  sed -i '' 's/<\\/motion\\./<\\/SafeMotion./g' FILE"
fi

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${GREEN}  For manual migration guidance, see:${NC}"
echo -e "${BLUE}  docs/CLAUDE.md -> iOS Lockdown Mode section${NC}"
echo -e "${CYAN}============================================${NC}"
