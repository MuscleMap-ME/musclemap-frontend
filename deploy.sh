#!/bin/bash
# MuscleMap Deploy Script
# Usage: ./deploy.sh "commit message"

set -e

MESSAGE="${1:-Update}"

echo "🔃 Pulling latest changes..."
git pull origin main

echo "📦 Committing changes..."
git add .
git commit -m "$MESSAGE" || echo "Nothing to commit"

echo "🚀 Pushing to GitHub..."
git push origin main

echo "🔄 Deploying to VPS..."
ssh root@musclemap.me "cd /var/www/musclemap.me && \
  git fetch origin && \
  git reset --hard origin/main && \
  pnpm install && \
  echo '📦 Building workspace packages...' && \
  pnpm -C packages/shared build && \
  pnpm -C packages/core build && \
  pnpm -C packages/plugin-sdk build && \
  pnpm -C packages/client build && \
  echo '🏗️ Building app...' && \
  pnpm build"

echo "✅ Deployed! https://musclemap.me"
