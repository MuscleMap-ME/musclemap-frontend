#!/bin/bash
# MuscleMap Deploy Script
# Usage: ./deploy.sh ["commit message"]
#
# Syncs code across all three locations:
# 1. Main repository (/Users/jeanpaulniko/Public/musclemap.me)
# 2. Git worktrees (~/.claude-worktrees/musclemap.me/*)
# 3. VPS (root@musclemap.me:/var/www/musclemap.me)

set -e

# Determine script location and main repo path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAIN_REPO="/Users/jeanpaulniko/Public/musclemap.me"
WORKTREE_BASE="$HOME/.claude-worktrees/musclemap.me"
MESSAGE="${1:-Update}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 MuscleMap Deploy${NC}"
echo "================================"

# Step 1: Handle worktree if running from one
CURRENT_DIR="$(pwd)"
if [[ "$CURRENT_DIR" == "$WORKTREE_BASE"* ]]; then
    WORKTREE_NAME=$(basename "$CURRENT_DIR")
    echo -e "${YELLOW}📂 Detected worktree: $WORKTREE_NAME${NC}"

    # Check for uncommitted changes in worktree
    if [[ -n $(git status --porcelain) ]]; then
        echo -e "${YELLOW}📦 Committing worktree changes...${NC}"
        git add .
        git commit -m "$MESSAGE" || echo "Nothing to commit in worktree"
    fi

    # Push worktree branch
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo -e "${BLUE}🔄 Pushing worktree branch '$BRANCH' to origin...${NC}"
    git push origin "$BRANCH" 2>/dev/null || git push -u origin "$BRANCH"

    # Switch to main repo for merge
    cd "$MAIN_REPO"
    echo -e "${BLUE}📂 Switched to main repo${NC}"

    # Fetch and merge worktree branch
    echo -e "${BLUE}🔀 Merging '$BRANCH' into main...${NC}"
    git fetch origin
    git checkout main
    git pull origin main
    git merge "origin/$BRANCH" -m "Merge $BRANCH: $MESSAGE" || {
        echo -e "${RED}⚠️  Merge conflict detected. Please resolve manually.${NC}"
        exit 1
    }
fi

# Step 2: Main repo - commit any remaining changes
cd "$MAIN_REPO"
echo -e "${BLUE}📂 Working in main repo: $MAIN_REPO${NC}"

if [[ -n $(git status --porcelain) ]]; then
    echo -e "${YELLOW}📦 Committing main repo changes...${NC}"
    git add .
    git commit -m "$MESSAGE" || echo "Nothing to commit"
fi

# Step 3: Push to GitHub
echo -e "${BLUE}🚀 Pushing to GitHub...${NC}"
git push origin main

# Step 4: Update all worktrees
echo -e "${BLUE}🔄 Updating worktrees...${NC}"
if [[ -d "$WORKTREE_BASE" ]]; then
    for worktree in "$WORKTREE_BASE"/*; do
        if [[ -d "$worktree/.git" || -f "$worktree/.git" ]]; then
            WORKTREE_NAME=$(basename "$worktree")
            echo -e "  ${YELLOW}→ Updating worktree: $WORKTREE_NAME${NC}"
            cd "$worktree"
            git fetch origin
            # Only update if on main or if branch is behind
            BRANCH=$(git rev-parse --abbrev-ref HEAD)
            if [[ "$BRANCH" == "main" ]]; then
                git pull origin main 2>/dev/null || echo "    (has local changes, skipping pull)"
            else
                git fetch origin main:main 2>/dev/null || true
            fi
        fi
    done
fi

# Step 5: Deploy to VPS
cd "$MAIN_REPO"
echo -e "${BLUE}🔄 Deploying to VPS...${NC}"
ssh root@musclemap.me "cd /var/www/musclemap.me && \
  git fetch origin && \
  git reset --hard origin/main && \
  pnpm install && \
  echo '📦 Building workspace packages...' && \
  pnpm -C packages/shared build && \
  pnpm -C packages/core build && \
  pnpm -C packages/plugin-sdk build && \
  pnpm -C packages/client build && \
  echo '🏗️ Building API...' && \
  pnpm -C apps/api build && \
  echo '🏗️ Building frontend...' && \
  pnpm build && \
  echo '🔄 Restarting API...' && \
  pm2 restart musclemap-api"

echo ""
echo -e "${GREEN}✅ Deployed successfully!${NC}"
echo -e "${GREEN}   → GitHub: https://github.com/jeanpaulniko/musclemap${NC}"
echo -e "${GREEN}   → Live:   https://musclemap.me${NC}"
