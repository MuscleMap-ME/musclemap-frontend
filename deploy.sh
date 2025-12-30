#!/bin/bash
# MuscleMap Deploy Script
# Usage: ./deploy.sh "commit message"

set -e

MESSAGE="${1:-Update}"

echo "📦 Committing changes..."
git add .
git commit -m "$MESSAGE" || echo "Nothing to commit"

echo "🚀 Pushing to GitHub..."
git push origin main

echo "🔄 Deploying to VPS..."
ssh root@musclemap.me "cd /var/www/musclemap.me && git reset --hard && git pull && pnpm install --ignore-scripts && cd packages/shared && pnpm build && cd ../.. && pnpm build"

echo "✅ Deployed! https://musclemap.me"
