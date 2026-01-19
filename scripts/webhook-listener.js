#!/usr/bin/env node
/**
 * MuscleMap GitHub Webhook Listener
 *
 * A lightweight HTTP server that listens for GitHub webhook events
 * and triggers deployments when pushes to main are detected.
 *
 * Usage:
 *   node scripts/webhook-listener.js
 *
 * Environment:
 *   WEBHOOK_SECRET - GitHub webhook secret (required)
 *   WEBHOOK_PORT   - Port to listen on (default: 9000)
 *
 * The listener runs on localhost only - Caddy proxies to it.
 */

const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = process.env.WEBHOOK_PORT || 9000;
const SECRET = process.env.WEBHOOK_SECRET;
const SCRIPT_DIR = __dirname;
const PROJECT_DIR = path.dirname(SCRIPT_DIR);
const LOG_FILE = '/var/log/musclemap/webhook-listener.log';

// Ensure log directory exists
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function verifySignature(payload, signature) {
  if (!SECRET) {
    log('WARNING: WEBHOOK_SECRET not set - skipping signature verification');
    return true;
  }

  if (!signature) {
    log('ERROR: No signature provided');
    return false;
  }

  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(payload);
  const expected = 'sha256=' + hmac.digest('hex');

  const valid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );

  if (!valid) {
    log('ERROR: Invalid signature');
    log(`  Received: ${signature}`);
    log(`  Expected: ${expected}`);
  }

  return valid;
}

function triggerDeploy(payload) {
  log('Triggering deploy...');

  const deployScript = path.join(SCRIPT_DIR, 'webhook-deploy.sh');

  // Run deploy in background
  const child = spawn(deployScript, [], {
    cwd: PROJECT_DIR,
    env: { ...process.env, WEBHOOK_SECRET: SECRET },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (data) => {
    log(`[deploy] ${data.toString().trim()}`);
  });

  child.stderr.on('data', (data) => {
    log(`[deploy:err] ${data.toString().trim()}`);
  });

  child.on('close', (code) => {
    log(`Deploy process exited with code ${code}`);
  });

  // Don't wait for child
  child.unref();
}

const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'webhook-listener' }));
    return;
  }

  // Only accept POST to /webhook/deploy
  if (req.method !== 'POST' || !req.url.startsWith('/webhook/deploy')) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  log(`Received ${req.method} ${req.url}`);

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
    // Limit body size to 1MB
    if (body.length > 1024 * 1024) {
      res.writeHead(413);
      res.end('Payload too large');
      req.destroy();
    }
  });

  req.on('end', () => {
    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'];

    log(`GitHub event: ${event}`);

    // Verify signature
    if (!verifySignature(body, signature)) {
      res.writeHead(401);
      res.end('Invalid signature');
      return;
    }

    // Only process push events
    if (event !== 'push') {
      log(`Ignoring event type: ${event}`);
      res.writeHead(200);
      res.end('Event ignored');
      return;
    }

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      log(`ERROR: Failed to parse payload: ${e.message}`);
      res.writeHead(400);
      res.end('Invalid JSON');
      return;
    }

    // Check branch
    const ref = payload.ref || '';
    const branch = ref.replace('refs/heads/', '');
    log(`Push to branch: ${branch}`);

    if (branch !== 'main') {
      log(`Ignoring push to non-main branch: ${branch}`);
      res.writeHead(200);
      res.end('Branch ignored');
      return;
    }

    // Get commit info
    const commits = payload.commits || [];
    const headCommit = payload.head_commit || {};
    log(`Commits: ${commits.length}, Head: ${headCommit.id?.substring(0, 7)} - ${headCommit.message?.split('\n')[0]}`);

    // Trigger deploy
    triggerDeploy(payload);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Deploy triggered',
      branch: branch,
      commit: headCommit.id?.substring(0, 7)
    }));
  });
});

server.listen(PORT, '127.0.0.1', () => {
  log(`========================================`);
  log(`Webhook listener started on 127.0.0.1:${PORT}`);
  log(`Waiting for GitHub webhooks...`);
  log(`========================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down...');
  server.close(() => {
    log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down...');
  server.close(() => {
    log('Server closed');
    process.exit(0);
  });
});
