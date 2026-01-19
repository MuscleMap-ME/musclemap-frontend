# GitHub Webhook Auto-Deploy Setup

This guide explains how to set up automatic deployments triggered by GitHub webhooks.

## Overview

When you push to `main`, GitHub sends a webhook to the production server, which automatically:
1. Pulls the latest code
2. Installs dependencies
3. Runs the memory-safe build
4. Restarts PM2

## Architecture

```
┌─────────────┐     push      ┌─────────────┐
│   Dev/CI    │ ───────────▶  │   GitHub    │
└─────────────┘               └──────┬──────┘
                                     │ webhook POST
                                     ▼
┌─────────────────────────────────────────────────────┐
│                  Production Server                   │
│  ┌─────────┐      ┌──────────────┐      ┌────────┐  │
│  │  Caddy  │ ───▶ │   Webhook    │ ───▶ │ Deploy │  │
│  │ :443    │      │   Listener   │      │ Script │  │
│  └─────────┘      │   :9000      │      └────────┘  │
└─────────────────────────────────────────────────────┘
```

## Server Setup (Run Once)

### 1. Generate a Webhook Secret

```bash
# Generate a random secret
openssl rand -hex 32
```

Save this - you'll need it for both the server and GitHub.

### 2. Create Environment File

```bash
# On production server
cat > /var/www/musclemap.me/.env.webhook << 'EOF'
WEBHOOK_SECRET=your-secret-from-step-1
WEBHOOK_PORT=9000
EOF

chmod 600 /var/www/musclemap.me/.env.webhook
```

### 3. Create Log Directory

```bash
mkdir -p /var/log/musclemap
chmod 755 /var/log/musclemap
```

### 4. Install Systemd Service

```bash
# Copy service file
cp /var/www/musclemap.me/scripts/systemd/musclemap-webhook.service /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

# Enable and start
systemctl enable musclemap-webhook
systemctl start musclemap-webhook

# Check status
systemctl status musclemap-webhook
```

### 5. Update Caddy Configuration

Add to your Caddyfile (usually `/etc/caddy/Caddyfile`):

```caddy
musclemap.me {
    # ... existing config ...

    # GitHub Webhook endpoint
    handle /webhook/deploy {
        reverse_proxy 127.0.0.1:9000
    }

    handle /webhook/health {
        reverse_proxy 127.0.0.1:9000 {
            rewrite * /health
        }
    }
}
```

Then reload Caddy:

```bash
systemctl reload caddy
```

### 6. Test the Endpoint

```bash
# Health check
curl https://musclemap.me/webhook/health

# Should return: {"status":"ok","service":"webhook-listener"}
```

## GitHub Setup

### 1. Go to Repository Settings

Navigate to: `https://github.com/jeanpaulniko/musclemap/settings/hooks`

### 2. Add Webhook

Click **"Add webhook"** and configure:

| Field | Value |
|-------|-------|
| Payload URL | `https://musclemap.me/webhook/deploy` |
| Content type | `application/json` |
| Secret | (the secret from step 1) |
| SSL verification | Enable |
| Events | Just the push event |
| Active | ✓ |

### 3. Test the Webhook

1. Click **"Add webhook"** to save
2. GitHub will send a `ping` event
3. Check "Recent Deliveries" tab - should show a green checkmark
4. Make a small commit and push to `main`
5. Watch the deploy happen!

## Monitoring

### View Logs

```bash
# Webhook listener logs
tail -f /var/log/musclemap/webhook-listener.log

# Deploy logs
tail -f /var/log/musclemap/webhook-deploy.log

# Or use journalctl
journalctl -u musclemap-webhook -f
```

### Check Service Status

```bash
# Webhook listener
systemctl status musclemap-webhook

# Verify it's listening
ss -tlnp | grep 9000
```

### Manual Deploy Trigger

If you need to manually trigger a deploy:

```bash
# On the server
cd /var/www/musclemap.me
./scripts/webhook-deploy.sh
```

## Troubleshooting

### Webhook Not Receiving

1. Check Caddy is proxying correctly:
   ```bash
   curl -X POST https://musclemap.me/webhook/deploy
   # Should return 401 (invalid signature) not 404
   ```

2. Check webhook listener is running:
   ```bash
   systemctl status musclemap-webhook
   ss -tlnp | grep 9000
   ```

### Invalid Signature Errors

1. Verify the secret matches:
   ```bash
   cat /var/www/musclemap.me/.env.webhook
   ```

2. Check GitHub webhook settings - secret must match exactly

### Deploy Fails

1. Check deploy logs:
   ```bash
   tail -100 /var/log/musclemap/webhook-deploy.log
   ```

2. Run deploy manually to see errors:
   ```bash
   cd /var/www/musclemap.me
   ./scripts/webhook-deploy.sh
   ```

### Service Won't Start

1. Check for syntax errors:
   ```bash
   node /var/www/musclemap.me/scripts/webhook-listener.js
   ```

2. Check environment file exists:
   ```bash
   ls -la /var/www/musclemap.me/.env.webhook
   ```

## Security Notes

- The webhook listener only binds to `127.0.0.1` - not accessible from outside
- Caddy handles TLS termination and rate limiting
- All requests are validated with HMAC-SHA256 signatures
- The webhook secret should be at least 32 characters
- Deploy runs as root (required for PM2 and pnpm operations)

## Files

| File | Purpose |
|------|---------|
| `scripts/webhook-listener.js` | HTTP server that receives webhooks |
| `scripts/webhook-deploy.sh` | Shell script that runs the deploy |
| `scripts/systemd/musclemap-webhook.service` | Systemd service definition |
| `scripts/caddy/webhook.caddy` | Caddy config snippet |
| `.env.webhook` | Environment file with secret (not in git) |
