#!/bin/bash
# Preview Environment Deployment Script
#
# Deploys a preview environment for a pull request on the production server.
# Uses Docker or separate processes with port mapping.
#
# Usage:
#   ./scripts/deployment/deploy-preview.sh <pr-number> [options]
#
# Options:
#   --destroy       Destroy the preview environment
#   --logs          Show logs for the preview environment
#   --status        Show status of preview environment
#
# Environment Variables:
#   PREVIEW_DB_PASSWORD   Password for preview database (default: auto-generated)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
PR_NUMBER="$1"
ACTION="${2:-deploy}"

if [ -z "$PR_NUMBER" ]; then
    echo "Usage: $0 <pr-number> [--destroy|--logs|--status]"
    exit 1
fi

# Configuration
PREVIEW_BASE_PORT=4000
PREVIEW_PORT=$((PREVIEW_BASE_PORT + PR_NUMBER))
PREVIEW_DIR="/var/www/musclemap-preview-$PR_NUMBER"
PREVIEW_DB="musclemap_preview_$PR_NUMBER"
PREVIEW_DOMAIN="pr-$PR_NUMBER.preview.musclemap.me"
PM2_NAME="musclemap-preview-$PR_NUMBER"

# Generate preview database password if not set
if [ -z "$PREVIEW_DB_PASSWORD" ]; then
    PREVIEW_DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || echo "preview$PR_NUMBER")
fi

echo ""
echo -e "${BLUE}🚀 MuscleMap Preview Deployment${NC}"
echo "═══════════════════════════════════════════════════════════"
echo "PR Number: $PR_NUMBER"
echo "Port: $PREVIEW_PORT"
echo "Domain: $PREVIEW_DOMAIN"
echo ""

# =====================================================
# DESTROY PREVIEW
# =====================================================
if [ "$ACTION" = "--destroy" ]; then
    echo -e "${YELLOW}Destroying preview environment...${NC}"

    # Stop PM2 process
    echo "  Stopping PM2 process..."
    pm2 delete "$PM2_NAME" 2>/dev/null || true

    # Drop database
    echo "  Dropping database..."
    psql -U postgres -c "DROP DATABASE IF EXISTS $PREVIEW_DB;" 2>/dev/null || true
    psql -U postgres -c "DROP USER IF EXISTS preview_$PR_NUMBER;" 2>/dev/null || true

    # Remove directory
    echo "  Removing files..."
    rm -rf "$PREVIEW_DIR"

    # Remove Caddy config
    echo "  Removing reverse proxy config..."
    rm -f "/etc/caddy/sites-enabled/preview-$PR_NUMBER.caddy" 2>/dev/null || true
    systemctl reload caddy 2>/dev/null || true

    echo -e "${GREEN}✅ Preview environment destroyed${NC}"
    exit 0
fi

# =====================================================
# SHOW LOGS
# =====================================================
if [ "$ACTION" = "--logs" ]; then
    pm2 logs "$PM2_NAME" --lines 50 --nostream
    exit 0
fi

# =====================================================
# SHOW STATUS
# =====================================================
if [ "$ACTION" = "--status" ]; then
    echo "Status of preview-$PR_NUMBER:"
    echo ""

    # PM2 status
    pm2 show "$PM2_NAME" 2>/dev/null || echo "PM2 process not running"
    echo ""

    # Health check
    echo "Health check:"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PREVIEW_PORT/health" 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        echo -e "  ${GREEN}✅ API is healthy${NC}"
    else
        echo -e "  ${RED}❌ API returned HTTP $HTTP_STATUS${NC}"
    fi

    # Database
    echo ""
    echo "Database:"
    psql -U postgres -c "SELECT 'Connected' FROM pg_database WHERE datname='$PREVIEW_DB';" 2>/dev/null || echo "  Database not found"

    exit 0
fi

# =====================================================
# DEPLOY PREVIEW
# =====================================================

echo -e "${BLUE}[1/6] Setting up database...${NC}"

# Create database user and database
psql -U postgres <<EOF 2>/dev/null || true
CREATE USER preview_$PR_NUMBER WITH PASSWORD '$PREVIEW_DB_PASSWORD';
CREATE DATABASE $PREVIEW_DB OWNER preview_$PR_NUMBER;
GRANT ALL PRIVILEGES ON DATABASE $PREVIEW_DB TO preview_$PR_NUMBER;
EOF

echo "  Database: $PREVIEW_DB"

echo -e "\n${BLUE}[2/6] Setting up directory...${NC}"

# Create or update preview directory
if [ -d "$PREVIEW_DIR" ]; then
    echo "  Updating existing directory..."
    cd "$PREVIEW_DIR"
    git fetch origin
else
    echo "  Cloning repository..."
    git clone --depth 1 /var/www/musclemap.me "$PREVIEW_DIR"
    cd "$PREVIEW_DIR"
fi

# Fetch and checkout the PR
echo "  Checking out PR #$PR_NUMBER..."
git fetch origin "pull/$PR_NUMBER/head:pr-$PR_NUMBER" 2>/dev/null || {
    # If direct PR fetch fails, try fetching the branch
    PR_BRANCH=$(curl -s "https://api.github.com/repos/jeanpaulniko/musclemap/pulls/$PR_NUMBER" | jq -r '.head.ref // empty')
    if [ -n "$PR_BRANCH" ]; then
        git fetch origin "$PR_BRANCH"
        git checkout "origin/$PR_BRANCH"
    else
        echo -e "${RED}Could not fetch PR branch${NC}"
        exit 1
    fi
}
git checkout "pr-$PR_NUMBER" 2>/dev/null || true

echo -e "\n${BLUE}[3/6] Installing dependencies...${NC}"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo -e "\n${BLUE}[4/6] Building application...${NC}"
NODE_OPTIONS="--max-old-space-size=2048" pnpm build:all

echo -e "\n${BLUE}[5/6] Configuring environment...${NC}"

# Create .env file for preview
cat > "$PREVIEW_DIR/apps/api/.env" <<EOF
NODE_ENV=preview
PORT=$PREVIEW_PORT
DATABASE_URL=postgresql://preview_$PR_NUMBER:$PREVIEW_DB_PASSWORD@localhost:5432/$PREVIEW_DB
JWT_SECRET=preview-jwt-secret-$PR_NUMBER-$(openssl rand -hex 8 2>/dev/null || echo "preview")
REDIS_URL=redis://localhost:6379/$PR_NUMBER
BASE_URL=https://$PREVIEW_DOMAIN
CORS_ORIGIN=https://$PREVIEW_DOMAIN
EOF

echo "  Environment configured"

# Run migrations
echo "  Running migrations..."
cd "$PREVIEW_DIR/apps/api"
pnpm db:migrate 2>/dev/null || true

echo -e "\n${BLUE}[6/6] Starting preview server...${NC}"

# Stop existing process if running
pm2 delete "$PM2_NAME" 2>/dev/null || true

# Start new process
cd "$PREVIEW_DIR"
pm2 start apps/api/dist/index.js \
    --name "$PM2_NAME" \
    --env production \
    --time \
    -- --port "$PREVIEW_PORT"

pm2 save

# Configure Caddy reverse proxy
echo "  Configuring reverse proxy..."
mkdir -p /etc/caddy/sites-enabled

cat > "/etc/caddy/sites-enabled/preview-$PR_NUMBER.caddy" <<EOF
$PREVIEW_DOMAIN {
    reverse_proxy localhost:$PREVIEW_PORT

    header {
        X-Preview-PR "$PR_NUMBER"
    }

    log {
        output file /var/log/caddy/preview-$PR_NUMBER.log
    }
}
EOF

# Reload Caddy
systemctl reload caddy 2>/dev/null || caddy reload --config /etc/caddy/Caddyfile

# Wait for server to start
echo "  Waiting for server..."
sleep 5

# Verify deployment
MAX_RETRIES=5
RETRY_COUNT=0
HEALTH_OK=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PREVIEW_PORT/health" 2>/dev/null || echo "000")

    if [ "$HTTP_STATUS" = "200" ]; then
        HEALTH_OK=true
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  Health check attempt $RETRY_COUNT: HTTP $HTTP_STATUS"
    sleep 3
done

echo ""
echo "═══════════════════════════════════════════════════════════"
if [ "$HEALTH_OK" = true ]; then
    echo -e "${GREEN}✅ Preview deployment successful!${NC}"
    echo ""
    echo "  URL:      https://$PREVIEW_DOMAIN"
    echo "  Port:     $PREVIEW_PORT"
    echo "  PM2:      $PM2_NAME"
    echo "  Database: $PREVIEW_DB"
    echo ""
    echo "Commands:"
    echo "  Logs:     $0 $PR_NUMBER --logs"
    echo "  Status:   $0 $PR_NUMBER --status"
    echo "  Destroy:  $0 $PR_NUMBER --destroy"
else
    echo -e "${RED}❌ Preview deployment failed!${NC}"
    echo ""
    echo "Health check returned HTTP $HTTP_STATUS after $MAX_RETRIES attempts"
    echo ""
    echo "Debug commands:"
    echo "  pm2 logs $PM2_NAME --lines 50"
    echo "  curl http://localhost:$PREVIEW_PORT/health"
    exit 1
fi
