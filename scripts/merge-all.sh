#!/bin/bash
#
# merge-all.sh - Merge all worktree branches into main
#
# This script collects all changes from git worktrees and merges them into main.
# Use this after working on multiple features in different worktrees.
#
# Usage:
#   ./scripts/merge-all.sh              # Interactive mode - shows branches and asks for confirmation
#   ./scripts/merge-all.sh --auto       # Auto-merge all branches without prompts
#   ./scripts/merge-all.sh --list       # List all worktree branches without merging
#   ./scripts/merge-all.sh --dry-run    # Show what would be merged without doing it
#

set -e

# Configuration
MAIN_REPO="/Users/jeanpaulniko/Public/musclemap.me"
WORKTREE_BASE="$HOME/.claude-worktrees/musclemap.me"
MAIN_BRANCH="main"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parse arguments
AUTO_MODE=false
LIST_ONLY=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --auto|-a)
            AUTO_MODE=true
            shift
            ;;
        --list|-l)
            LIST_ONLY=true
            shift
            ;;
        --dry-run|-n)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --auto, -a      Auto-merge all branches without prompts"
            echo "  --list, -l      List all worktree branches without merging"
            echo "  --dry-run, -n   Show what would be merged without doing it"
            echo "  --help, -h      Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  MuscleMap - Worktree Merge Tool${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Change to main repo
cd "$MAIN_REPO"

# Fetch all remote branches
echo -e "${CYAN}Fetching remote branches...${NC}"
git fetch origin --prune

# Collect all worktree branches
declare -a BRANCHES_TO_MERGE
declare -a BRANCH_STATUS

if [[ -d "$WORKTREE_BASE" ]]; then
    for worktree in "$WORKTREE_BASE"/*; do
        if [[ -d "$worktree/.git" || -f "$worktree/.git" ]]; then
            cd "$worktree"
            BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

            # Skip if on main
            if [[ "$BRANCH" == "main" ]]; then
                continue
            fi

            # Check if branch has commits ahead of main
            AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")
            BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "0")

            # Check for uncommitted changes
            UNCOMMITTED=""
            if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
                UNCOMMITTED=" (has uncommitted changes)"
            fi

            if [[ "$AHEAD" -gt 0 ]] || [[ -n "$UNCOMMITTED" ]]; then
                BRANCHES_TO_MERGE+=("$BRANCH")
                BRANCH_STATUS+=("$AHEAD ahead, $BEHIND behind$UNCOMMITTED")
            fi
        fi
    done
fi

cd "$MAIN_REPO"

# Display branches
echo -e "${YELLOW}Worktree branches with changes:${NC}"
echo ""

if [[ ${#BRANCHES_TO_MERGE[@]} -eq 0 ]]; then
    echo -e "${GREEN}No worktree branches with pending changes.${NC}"
    exit 0
fi

for i in "${!BRANCHES_TO_MERGE[@]}"; do
    echo -e "  ${CYAN}$((i+1)).${NC} ${BRANCHES_TO_MERGE[$i]} - ${BRANCH_STATUS[$i]}"
done
echo ""

if [[ "$LIST_ONLY" == true ]]; then
    exit 0
fi

if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}Dry run - would merge the following branches:${NC}"
    for branch in "${BRANCHES_TO_MERGE[@]}"; do
        echo "  - $branch"
    done
    exit 0
fi

# Confirm if not auto mode
if [[ "$AUTO_MODE" != true ]]; then
    echo -e "${YELLOW}Merge all branches into main? (y/N)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${RED}Aborted.${NC}"
        exit 1
    fi
fi

# Ensure we're on main and up to date
echo -e "${BLUE}Switching to main branch...${NC}"
git checkout main
git pull origin main

# Merge each branch
MERGED=0
FAILED=0

for branch in "${BRANCHES_TO_MERGE[@]}"; do
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Merging: $branch${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

    # First, commit any uncommitted changes in the worktree
    WORKTREE_PATH="$WORKTREE_BASE/$branch"
    if [[ -d "$WORKTREE_PATH" ]]; then
        cd "$WORKTREE_PATH"
        if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
            echo -e "${YELLOW}Committing uncommitted changes in worktree...${NC}"
            git add .
            git commit -m "WIP: Auto-commit before merge" || true
        fi

        # Push the branch
        echo -e "${CYAN}Pushing $branch to origin...${NC}"
        git push origin "$branch" 2>/dev/null || git push -u origin "$branch"
    fi

    # Switch back to main repo and merge
    cd "$MAIN_REPO"
    git fetch origin

    if git merge "origin/$branch" -m "Merge $branch into main"; then
        echo -e "${GREEN}Successfully merged $branch${NC}"
        ((MERGED++))
    else
        echo -e "${RED}Failed to merge $branch - conflicts detected${NC}"
        echo -e "${YELLOW}Aborting merge for this branch...${NC}"
        git merge --abort 2>/dev/null || true
        ((FAILED++))
    fi
done

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Merge Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Merged: $MERGED branches${NC}"
if [[ $FAILED -gt 0 ]]; then
    echo -e "${RED}Failed: $FAILED branches (resolve conflicts manually)${NC}"
fi

# Push main if any merges succeeded
if [[ $MERGED -gt 0 ]]; then
    echo ""
    echo -e "${BLUE}Pushing main to origin...${NC}"
    git push origin main
    echo -e "${GREEN}Done! Main branch updated on GitHub.${NC}"
fi

echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Run ./scripts/deploy.sh to deploy to VPS"
echo "  2. Or run ./deploy.sh to do full deploy with frontend build"
