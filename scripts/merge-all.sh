#!/bin/bash
#
# merge-all.sh - Merge all worktree branches into main
#
# This script collects all changes from git worktrees and merges them into main.
# Use this after working on multiple features in different worktrees.
#
# PERFORMANCE OPTIMIZED:
#   - Parallel worktree scanning using background jobs
#   - Single git fetch instead of multiple
#   - Batched operations where possible
#
# Usage:
#   ./scripts/merge-all.sh              # Interactive mode - shows branches and asks for confirmation
#   ./scripts/merge-all.sh --auto       # Auto-merge all branches without prompts
#   ./scripts/merge-all.sh --list       # List all worktree branches without merging
#   ./scripts/merge-all.sh --dry-run    # Show what would be merged without doing it
#   ./scripts/merge-all.sh --parallel N # Use N parallel jobs for scanning (default: 4)
#

set -e

# Configuration
MAIN_REPO="/Users/jeanpaulniko/Public/musclemap.me"
WORKTREE_BASE="$HOME/.claude-worktrees/musclemap.me"
MAIN_BRANCH="main"
PARALLEL_JOBS=4
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

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
        --parallel|-p)
            PARALLEL_JOBS="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --auto, -a      Auto-merge all branches without prompts"
            echo "  --list, -l      List all worktree branches without merging"
            echo "  --dry-run, -n   Show what would be merged without doing it"
            echo "  --parallel, -p  Number of parallel jobs for scanning (default: 4)"
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
echo -e "${BLUE}  MuscleMap - Worktree Merge Tool (Optimized)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Change to main repo
cd "$MAIN_REPO"

# Fetch all remote branches (single fetch with quiet mode for speed)
echo -e "${CYAN}Fetching remote branches...${NC}"
git fetch origin --prune -q &
FETCH_PID=$!

# Function to scan a single worktree (called in parallel)
scan_worktree() {
    local worktree="$1"
    local output_file="$2"

    if [[ -d "$worktree/.git" || -f "$worktree/.git" ]]; then
        cd "$worktree" 2>/dev/null || return
        local BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

        # Skip if on main
        if [[ "$BRANCH" == "main" ]]; then
            return
        fi

        # Check if branch has commits ahead of main (use cached refs)
        local AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")
        local BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "0")

        # Check for uncommitted changes (fast porcelain check)
        local UNCOMMITTED=""
        if [[ -n $(git status --porcelain 2>/dev/null | head -1) ]]; then
            UNCOMMITTED=" (has uncommitted changes)"
        fi

        if [[ "$AHEAD" -gt 0 ]] || [[ -n "$UNCOMMITTED" ]]; then
            echo "$BRANCH|$AHEAD ahead, $BEHIND behind$UNCOMMITTED" >> "$output_file"
        fi
    fi
}
export -f scan_worktree

# Collect all worktree branches (PARALLEL)
declare -a BRANCHES_TO_MERGE
declare -a BRANCH_STATUS

if [[ -d "$WORKTREE_BASE" ]]; then
    WORKTREES=("$WORKTREE_BASE"/*)
    TOTAL_WORKTREES=${#WORKTREES[@]}

    if [[ $TOTAL_WORKTREES -gt 0 ]]; then
        echo -e "${CYAN}Scanning $TOTAL_WORKTREES worktrees in parallel...${NC}"

        # Use xargs for parallel execution if available, otherwise fall back to sequential
        if command -v xargs &>/dev/null && [[ $TOTAL_WORKTREES -gt 1 ]]; then
            # Create output file for parallel results
            RESULTS_FILE="$TEMP_DIR/results.txt"
            touch "$RESULTS_FILE"

            # Run scans in parallel using background jobs
            JOB_COUNT=0
            for worktree in "${WORKTREES[@]}"; do
                scan_worktree "$worktree" "$RESULTS_FILE" &
                ((JOB_COUNT++))

                # Limit parallel jobs
                if [[ $JOB_COUNT -ge $PARALLEL_JOBS ]]; then
                    wait -n 2>/dev/null || wait
                    ((JOB_COUNT--))
                fi
            done

            # Wait for all remaining jobs
            wait

            # Read results
            if [[ -s "$RESULTS_FILE" ]]; then
                while IFS='|' read -r branch status; do
                    BRANCHES_TO_MERGE+=("$branch")
                    BRANCH_STATUS+=("$status")
                done < "$RESULTS_FILE"
            fi
        else
            # Fallback to sequential for single worktree or no xargs
            for worktree in "${WORKTREES[@]}"; do
                RESULTS_FILE="$TEMP_DIR/results.txt"
                touch "$RESULTS_FILE"
                scan_worktree "$worktree" "$RESULTS_FILE"
                if [[ -s "$RESULTS_FILE" ]]; then
                    while IFS='|' read -r branch status; do
                        BRANCHES_TO_MERGE+=("$branch")
                        BRANCH_STATUS+=("$status")
                    done < "$RESULTS_FILE"
                    > "$RESULTS_FILE"  # Clear for next iteration
                fi
            done
        fi
    fi
fi

# Wait for fetch to complete
wait $FETCH_PID 2>/dev/null || true

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
