/**
 * Deployment Management API
 *
 * Secure API endpoints for remote deployment operations.
 * Designed for Claude Code to trigger deployments via HTTPS.
 *
 * Features:
 * - Token-based authentication (DEPLOY_SECRET env var)
 * - HMAC signature verification for requests
 * - Comprehensive audit logging
 * - Rate limiting (5 deploys per hour)
 * - Real-time output streaming via SSE
 * - Command whitelisting (no arbitrary execution)
 *
 * Endpoints:
 * - POST /api/deploy/execute - Execute a deployment command
 * - GET  /api/deploy/status - Get current deployment status
 * - GET  /api/deploy/logs - Get deployment audit logs
 * - GET  /api/deploy/stream/:id - Stream deployment output (SSE)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { spawn, ChildProcess } from 'child_process';
import crypto from 'crypto';
import { z } from 'zod';
import { query, queryOne, queryAll } from '../../db/client';
import { authenticate, requireAdmin } from './auth';
import { loggers } from '../../lib/logger';
import { getRedis, isRedisAvailable } from '../../lib/redis';

const log = loggers.http.child({ module: 'deployment' });

// ============================================
// CONFIGURATION
// ============================================

const DEPLOY_SECRET = process.env.DEPLOY_SECRET || '';
const DEPLOY_RATE_LIMIT = 5; // Max deploys per hour
const DEPLOY_RATE_WINDOW = 60 * 60 * 1000; // 1 hour in ms
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB max output per command
const COMMAND_TIMEOUT = 10 * 60 * 1000; // 10 minutes max

// Whitelisted commands - ONLY these can be executed
const ALLOWED_COMMANDS: Record<string, { cmd: string; args: string[]; description: string; dangerous?: boolean }> = {
  'git-pull': {
    cmd: 'git',
    args: ['pull', 'origin', 'main'],
    description: 'Pull latest changes from GitHub',
  },
  'git-status': {
    cmd: 'git',
    args: ['status', '--short'],
    description: 'Check git status',
  },
  'git-log': {
    cmd: 'git',
    args: ['log', '--oneline', '-10'],
    description: 'Show last 10 commits',
  },
  'pnpm-install': {
    cmd: 'pnpm',
    args: ['install', '--frozen-lockfile'],
    description: 'Install dependencies',
  },
  'build-packages': {
    cmd: 'pnpm',
    args: ['run', 'build:packages'],
    description: 'Build workspace packages',
  },
  'build-api': {
    cmd: 'pnpm',
    args: ['-C', 'apps/api', 'build'],
    description: 'Build API server',
  },
  'build-frontend': {
    cmd: 'pnpm',
    args: ['run', 'build'],
    description: 'Build frontend (Vite)',
  },
  'build-all': {
    cmd: 'pnpm',
    args: ['run', 'build:all'],
    description: 'Build everything',
  },
  'pm2-restart': {
    cmd: 'pm2',
    args: ['restart', 'musclemap'],
    description: 'Restart PM2 process',
    dangerous: true,
  },
  'pm2-status': {
    cmd: 'pm2',
    args: ['jlist'],
    description: 'Get PM2 process status (JSON)',
  },
  'pm2-logs': {
    cmd: 'pm2',
    args: ['logs', 'musclemap', '--lines', '50', '--nostream'],
    description: 'Get last 50 lines of PM2 logs',
  },
  'db-migrate': {
    cmd: 'pnpm',
    args: ['-C', 'apps/api', 'db:migrate'],
    description: 'Run database migrations',
    dangerous: true,
  },
  'health-check': {
    cmd: 'curl',
    args: ['-s', 'http://localhost:3001/health'],
    description: 'Check API health',
  },
  'disk-usage': {
    cmd: 'df',
    args: ['-h', '/'],
    description: 'Check disk usage',
  },
  'memory-usage': {
    cmd: 'free',
    args: ['-h'],
    description: 'Check memory usage',
  },
  'typecheck': {
    cmd: 'pnpm',
    args: ['typecheck'],
    description: 'Run TypeScript type checking',
  },
  'lint': {
    cmd: 'pnpm',
    args: ['lint'],
    description: 'Run ESLint',
  },
};

// Predefined deployment sequences
const DEPLOY_SEQUENCES: Record<string, { name: string; steps: string[]; description: string }> = {
  'full-deploy': {
    name: 'Full Deployment',
    steps: ['git-pull', 'pnpm-install', 'build-all', 'pm2-restart', 'health-check'],
    description: 'Complete deployment: pull, install, build, restart',
  },
  'quick-deploy': {
    name: 'Quick Deploy (API only)',
    steps: ['git-pull', 'build-api', 'pm2-restart', 'health-check'],
    description: 'Fast API-only deployment',
  },
  'frontend-deploy': {
    name: 'Frontend Deploy',
    steps: ['git-pull', 'build-frontend'],
    description: 'Build frontend only (static files)',
  },
  'safe-check': {
    name: 'Pre-deploy Check',
    steps: ['git-status', 'typecheck', 'lint'],
    description: 'Check code quality before deploying',
  },
  'system-status': {
    name: 'System Status',
    steps: ['pm2-status', 'health-check', 'disk-usage', 'memory-usage'],
    description: 'Check overall system health',
  },
};

// ============================================
// TYPES
// ============================================

interface DeploymentLog {
  id: string;
  command_key: string;
  sequence_key: string | null;
  initiated_by: 'api' | 'web' | 'webhook';
  initiator_ip: string;
  initiator_user_id: string | null;
  status: 'pending' | 'running' | 'success' | 'failed' | 'timeout';
  output: string;
  error: string | null;
  exit_code: number | null;
  started_at: Date;
  completed_at: Date | null;
  duration_ms: number | null;
}

// Active deployments (in-memory for streaming)
const activeDeployments = new Map<string, {
  process: ChildProcess | null;
  output: string[];
  status: 'running' | 'success' | 'failed' | 'timeout';
  subscribers: Set<FastifyReply>;
}>();

// ============================================
// SCHEMAS
// ============================================

const ExecuteCommandSchema = z.object({
  command: z.string().optional(),
  sequence: z.string().optional(),
  signature: z.string().optional(), // HMAC signature for API calls
  timestamp: z.number().optional(), // Request timestamp for replay protection
}).refine(data => data.command || data.sequence, {
  message: 'Either command or sequence must be provided',
});

// ============================================
// HELPERS
// ============================================

function generateDeploymentId(): string {
  return `deploy_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function verifySignature(payload: string, signature: string, timestamp: number): boolean {
  if (!DEPLOY_SECRET) {
    log.warn('DEPLOY_SECRET not configured - signature verification disabled');
    return false;
  }

  // Check timestamp is within 5 minutes
  const now = Date.now();
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
    log.warn({ timestamp, now }, 'Request timestamp too old');
    return false;
  }

  // Compute expected signature
  const expectedSignature = crypto
    .createHmac('sha256', DEPLOY_SECRET)
    .update(`${timestamp}:${payload}`)
    .digest('hex');

  // Constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `deploy:ratelimit:${ip}`;
  const resetAt = Date.now() + DEPLOY_RATE_WINDOW;

  if (isRedisAvailable()) {
    const redis = getRedis();
    if (redis) {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, DEPLOY_RATE_WINDOW);
      }
      const ttl = await redis.pttl(key);
      return {
        allowed: count <= DEPLOY_RATE_LIMIT,
        remaining: Math.max(0, DEPLOY_RATE_LIMIT - count),
        resetAt: Date.now() + (ttl > 0 ? ttl : DEPLOY_RATE_WINDOW),
      };
    }
  }

  // Fallback: allow if Redis not available (less secure)
  return { allowed: true, remaining: DEPLOY_RATE_LIMIT, resetAt };
}

async function logDeployment(deployment: Partial<DeploymentLog>): Promise<string> {
  const id = deployment.id || generateDeploymentId();

  await query(
    `INSERT INTO deployment_logs (
      id, command_key, sequence_key, initiated_by, initiator_ip,
      initiator_user_id, status, output, error, exit_code,
      started_at, completed_at, duration_ms
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      id,
      deployment.command_key || null,
      deployment.sequence_key || null,
      deployment.initiated_by || 'api',
      deployment.initiator_ip || 'unknown',
      deployment.initiator_user_id || null,
      deployment.status || 'pending',
      deployment.output || '',
      deployment.error || null,
      deployment.exit_code ?? null,
      deployment.started_at || new Date(),
      deployment.completed_at || null,
      deployment.duration_ms || null,
    ]
  );

  return id;
}

async function updateDeployment(id: string, updates: Partial<DeploymentLog>): Promise<void> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.output !== undefined) {
    setClauses.push(`output = $${paramIndex++}`);
    values.push(updates.output);
  }
  if (updates.error !== undefined) {
    setClauses.push(`error = $${paramIndex++}`);
    values.push(updates.error);
  }
  if (updates.exit_code !== undefined) {
    setClauses.push(`exit_code = $${paramIndex++}`);
    values.push(updates.exit_code);
  }
  if (updates.completed_at !== undefined) {
    setClauses.push(`completed_at = $${paramIndex++}`);
    values.push(updates.completed_at);
  }
  if (updates.duration_ms !== undefined) {
    setClauses.push(`duration_ms = $${paramIndex++}`);
    values.push(updates.duration_ms);
  }

  if (setClauses.length > 0) {
    values.push(id);
    await query(
      `UPDATE deployment_logs SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
  }
}

function broadcastToSubscribers(deploymentId: string, data: object): void {
  const deployment = activeDeployments.get(deploymentId);
  if (!deployment) return;

  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const reply of deployment.subscribers) {
    try {
      reply.raw.write(message);
    } catch {
      deployment.subscribers.delete(reply);
    }
  }
}

async function executeCommand(
  commandKey: string,
  deploymentId: string,
  cwd: string
): Promise<{ success: boolean; output: string; exitCode: number }> {
  const commandDef = ALLOWED_COMMANDS[commandKey];
  if (!commandDef) {
    throw new Error(`Unknown command: ${commandKey}`);
  }

  return new Promise((resolve) => {
    const startTime = Date.now();
    let output = '';
    let timedOut = false;

    const proc = spawn(commandDef.cmd, commandDef.args, {
      cwd,
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Store process reference for potential cancellation
    const deployment = activeDeployments.get(deploymentId);
    if (deployment) {
      deployment.process = proc;
    }

    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      setTimeout(() => proc.kill('SIGKILL'), 5000);
    }, COMMAND_TIMEOUT);

    const appendOutput = (data: Buffer) => {
      const chunk = data.toString();
      output += chunk;

      // Truncate if too large
      if (output.length > MAX_OUTPUT_SIZE) {
        output = output.slice(-MAX_OUTPUT_SIZE) + '\n[Output truncated...]';
      }

      // Store and broadcast
      if (deployment) {
        deployment.output.push(chunk);
        broadcastToSubscribers(deploymentId, {
          type: 'output',
          command: commandKey,
          chunk,
          timestamp: Date.now(),
        });
      }
    };

    proc.stdout?.on('data', appendOutput);
    proc.stderr?.on('data', appendOutput);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      if (deployment) {
        deployment.process = null;
      }

      broadcastToSubscribers(deploymentId, {
        type: 'complete',
        command: commandKey,
        exitCode: timedOut ? -1 : (code ?? 0),
        duration,
        timedOut,
      });

      resolve({
        success: !timedOut && code === 0,
        output,
        exitCode: timedOut ? -1 : (code ?? 0),
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      output += `\nProcess error: ${err.message}`;
      resolve({
        success: false,
        output,
        exitCode: -1,
      });
    });
  });
}

async function executeSequence(
  sequenceKey: string,
  deploymentId: string,
  cwd: string,
  initiatedBy: 'api' | 'web' | 'webhook',
  ip: string,
  userId: string | null
): Promise<{ success: boolean; output: string; results: Array<{ command: string; success: boolean; output: string; exitCode: number }> }> {
  const sequence = DEPLOY_SEQUENCES[sequenceKey];
  if (!sequence) {
    throw new Error(`Unknown sequence: ${sequenceKey}`);
  }

  const startTime = Date.now();
  const results: Array<{ command: string; success: boolean; output: string; exitCode: number }> = [];
  let fullOutput = `=== Starting ${sequence.name} ===\n`;
  let allSuccess = true;

  // Initialize active deployment
  activeDeployments.set(deploymentId, {
    process: null,
    output: [],
    status: 'running',
    subscribers: new Set(),
  });

  // Log deployment start
  await logDeployment({
    id: deploymentId,
    sequence_key: sequenceKey,
    initiated_by: initiatedBy,
    initiator_ip: ip,
    initiator_user_id: userId,
    status: 'running',
    started_at: new Date(),
  });

  broadcastToSubscribers(deploymentId, {
    type: 'start',
    sequence: sequenceKey,
    steps: sequence.steps,
    timestamp: Date.now(),
  });

  for (const commandKey of sequence.steps) {
    const commandDef = ALLOWED_COMMANDS[commandKey];
    fullOutput += `\n--- ${commandKey}: ${commandDef?.description || 'Unknown'} ---\n`;

    broadcastToSubscribers(deploymentId, {
      type: 'step-start',
      command: commandKey,
      description: commandDef?.description,
      timestamp: Date.now(),
    });

    try {
      const result = await executeCommand(commandKey, deploymentId, cwd);
      results.push({ command: commandKey, ...result });
      fullOutput += result.output + '\n';

      if (!result.success) {
        allSuccess = false;
        fullOutput += `\n!!! Command failed with exit code ${result.exitCode} !!!\n`;
        break; // Stop sequence on failure
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      results.push({ command: commandKey, success: false, output: errorMsg, exitCode: -1 });
      fullOutput += `Error: ${errorMsg}\n`;
      allSuccess = false;
      break;
    }
  }

  const duration = Date.now() - startTime;
  fullOutput += `\n=== ${allSuccess ? 'SUCCESS' : 'FAILED'} (${duration}ms) ===\n`;

  // Update deployment log
  await updateDeployment(deploymentId, {
    status: allSuccess ? 'success' : 'failed',
    output: fullOutput,
    completed_at: new Date(),
    duration_ms: duration,
  });

  // Update active deployment status
  const deployment = activeDeployments.get(deploymentId);
  if (deployment) {
    deployment.status = allSuccess ? 'success' : 'failed';
  }

  broadcastToSubscribers(deploymentId, {
    type: 'sequence-complete',
    success: allSuccess,
    duration,
    timestamp: Date.now(),
  });

  // Clean up after 5 minutes
  setTimeout(() => {
    activeDeployments.delete(deploymentId);
  }, 5 * 60 * 1000);

  return { success: allSuccess, output: fullOutput, results };
}

// ============================================
// ROUTES
// ============================================

export async function registerDeploymentRoutes(app: FastifyInstance): Promise<void> {
  const DEPLOY_CWD = process.env.DEPLOY_CWD || '/var/www/musclemap.me';

  // ----------------------------------------
  // POST /deploy/execute - Execute command or sequence
  // ----------------------------------------
  app.post('/deploy/execute', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = ExecuteCommandSchema.parse(request.body);
    const ip = request.ip;

    // Authentication: either admin user OR valid signature
    let userId: string | null = null;
    let initiatedBy: 'api' | 'web' = 'api';

    // Try admin auth first
    try {
      await authenticate(request, reply);
      if (reply.sent) return;

      // Check if admin
      const user = request.user;
      if (!user?.roles?.includes('admin')) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Admin access required', statusCode: 403 },
        });
      }
      userId = user.userId;
      initiatedBy = 'web';
    } catch {
      // Fall back to signature auth for API calls
      if (!body.signature || !body.timestamp) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 },
        });
      }

      const payload = JSON.stringify({ command: body.command, sequence: body.sequence });
      if (!verifySignature(payload, body.signature, body.timestamp)) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Invalid signature', statusCode: 401 },
        });
      }
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(ip);
    reply.header('X-RateLimit-Remaining', rateLimit.remaining.toString());
    reply.header('X-RateLimit-Reset', rateLimit.resetAt.toString());

    if (!rateLimit.allowed) {
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many deployments. Please wait.',
          statusCode: 429,
          resetAt: rateLimit.resetAt,
        },
      });
    }

    const deploymentId = generateDeploymentId();

    // Execute sequence or single command
    if (body.sequence) {
      if (!DEPLOY_SEQUENCES[body.sequence]) {
        return reply.status(400).send({
          error: { code: 'INVALID_SEQUENCE', message: `Unknown sequence: ${body.sequence}`, statusCode: 400 },
        });
      }

      // Start async execution
      const _resultPromise = executeSequence(body.sequence, deploymentId, DEPLOY_CWD, initiatedBy, ip, userId);

      // Return immediately with deployment ID for streaming
      return reply.status(202).send({
        data: {
          deploymentId,
          sequence: body.sequence,
          status: 'started',
          streamUrl: `/api/deploy/stream/${deploymentId}`,
          message: `Deployment ${deploymentId} started. Use streamUrl for real-time updates.`,
        },
      });
    }

    // Single command execution
    if (body.command) {
      if (!ALLOWED_COMMANDS[body.command]) {
        return reply.status(400).send({
          error: { code: 'INVALID_COMMAND', message: `Unknown command: ${body.command}`, statusCode: 400 },
        });
      }

      const commandDef = ALLOWED_COMMANDS[body.command];
      if (commandDef.dangerous) {
        log.warn({ command: body.command, ip, userId }, 'Executing dangerous command');
      }

      // Initialize tracking
      activeDeployments.set(deploymentId, {
        process: null,
        output: [],
        status: 'running',
        subscribers: new Set(),
      });

      await logDeployment({
        id: deploymentId,
        command_key: body.command,
        initiated_by: initiatedBy,
        initiator_ip: ip,
        initiator_user_id: userId,
        status: 'running',
        started_at: new Date(),
      });

      const startTime = Date.now();
      const result = await executeCommand(body.command, deploymentId, DEPLOY_CWD);
      const duration = Date.now() - startTime;

      await updateDeployment(deploymentId, {
        status: result.success ? 'success' : 'failed',
        output: result.output,
        exit_code: result.exitCode,
        completed_at: new Date(),
        duration_ms: duration,
      });

      // Clean up
      setTimeout(() => activeDeployments.delete(deploymentId), 60000);

      return reply.send({
        data: {
          deploymentId,
          command: body.command,
          success: result.success,
          exitCode: result.exitCode,
          output: result.output,
          duration,
        },
      });
    }
  });

  // ----------------------------------------
  // GET /deploy/status - Get deployment status
  // ----------------------------------------
  app.get('/deploy/status', { preHandler: [authenticate, requireAdmin] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.query as { id?: string };

    if (id) {
      // Get specific deployment
      const deployment = await queryOne<DeploymentLog>(
        'SELECT * FROM deployment_logs WHERE id = $1',
        [id]
      );

      if (!deployment) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Deployment not found', statusCode: 404 },
        });
      }

      // Check if still active (for live status)
      const active = activeDeployments.get(id);

      return reply.send({
        data: {
          ...deployment,
          isActive: !!active,
          liveStatus: active?.status,
        },
      });
    }

    // Get latest deployment status
    const latest = await queryOne<DeploymentLog>(
      'SELECT * FROM deployment_logs ORDER BY started_at DESC LIMIT 1',
      []
    );

    const activeCount = activeDeployments.size;

    return reply.send({
      data: {
        latest,
        activeDeployments: activeCount,
        availableCommands: Object.keys(ALLOWED_COMMANDS),
        availableSequences: Object.keys(DEPLOY_SEQUENCES),
      },
    });
  });

  // ----------------------------------------
  // GET /deploy/logs - Get deployment audit logs
  // ----------------------------------------
  app.get('/deploy/logs', { preHandler: [authenticate, requireAdmin] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit = '50', offset = '0', status, sequence } = request.query as {
      limit?: string;
      offset?: string;
      status?: string;
      sequence?: string;
    };

    let whereClause = '';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` WHERE status = $${paramIndex++}`;
      params.push(status);
    }

    if (sequence) {
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ` sequence_key = $${paramIndex++}`;
      params.push(sequence);
    }

    params.push(parseInt(limit));
    params.push(parseInt(offset));

    const logs = await queryAll<DeploymentLog>(
      `SELECT id, command_key, sequence_key, initiated_by, initiator_ip,
              initiator_user_id, status, exit_code, started_at, completed_at, duration_ms
       FROM deployment_logs
       ${whereClause}
       ORDER BY started_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM deployment_logs ${whereClause}`,
      params.slice(0, -2)
    );

    return reply.send({
      data: {
        logs,
        total: parseInt(countResult?.count || '0'),
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  });

  // ----------------------------------------
  // GET /deploy/logs/:id - Get specific deployment log with full output
  // ----------------------------------------
  app.get('/deploy/logs/:id', { preHandler: [authenticate, requireAdmin] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const deployment = await queryOne<DeploymentLog>(
      'SELECT * FROM deployment_logs WHERE id = $1',
      [id]
    );

    if (!deployment) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Deployment log not found', statusCode: 404 },
      });
    }

    return reply.send({ data: deployment });
  });

  // ----------------------------------------
  // GET /deploy/stream/:id - SSE stream for deployment output
  // ----------------------------------------
  app.get('/deploy/stream/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { token } = request.query as { token?: string };

    // Authentication check - support both header and query param (for EventSource)
    // EventSource doesn't support custom headers, so we accept token as query param
    if (token) {
      // Set the authorization header from query param for authenticate() to work
      request.headers.authorization = `Bearer ${token}`;
    }

    try {
      await authenticate(request, reply);
      if (reply.sent) return;

      const user = request.user;
      if (!user?.roles?.includes('admin')) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Admin access required', statusCode: 403 },
        });
      }
    } catch {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 },
      });
    }

    const deployment = activeDeployments.get(id);
    if (!deployment) {
      // Check if completed
      const logged = await queryOne<DeploymentLog>(
        'SELECT status, output FROM deployment_logs WHERE id = $1',
        [id]
      );

      if (logged) {
        // Send completed deployment as single event
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        reply.raw.write(`data: ${JSON.stringify({ type: 'complete', status: logged.status, output: logged.output })}\n\n`);
        reply.raw.end();
        return;
      }

      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Deployment not found', statusCode: 404 },
      });
    }

    // Set up SSE
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Send existing output
    if (deployment.output.length > 0) {
      reply.raw.write(`data: ${JSON.stringify({ type: 'history', output: deployment.output.join('') })}\n\n`);
    }

    // Register subscriber
    deployment.subscribers.add(reply);

    // Handle disconnect
    request.raw.on('close', () => {
      deployment.subscribers.delete(reply);
    });
  });

  // ----------------------------------------
  // GET /deploy/commands - List available commands
  // ----------------------------------------
  app.get('/deploy/commands', { preHandler: [authenticate, requireAdmin] }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      data: {
        commands: Object.entries(ALLOWED_COMMANDS).map(([key, def]) => ({
          key,
          description: def.description,
          dangerous: def.dangerous || false,
        })),
        sequences: Object.entries(DEPLOY_SEQUENCES).map(([key, def]) => ({
          key,
          name: def.name,
          description: def.description,
          steps: def.steps,
        })),
      },
    });
  });

  // ----------------------------------------
  // POST /deploy/cancel/:id - Cancel running deployment
  // ----------------------------------------
  app.post('/deploy/cancel/:id', { preHandler: [authenticate, requireAdmin] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const deployment = activeDeployments.get(id);
    if (!deployment) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Active deployment not found', statusCode: 404 },
      });
    }

    if (deployment.process) {
      deployment.process.kill('SIGTERM');
      setTimeout(() => deployment.process?.kill('SIGKILL'), 5000);
    }

    deployment.status = 'failed';

    await updateDeployment(id, {
      status: 'failed',
      error: 'Cancelled by user',
      completed_at: new Date(),
    });

    broadcastToSubscribers(id, {
      type: 'cancelled',
      timestamp: Date.now(),
    });

    return reply.send({
      data: { message: 'Deployment cancelled', deploymentId: id },
    });
  });

  log.info('Deployment routes registered');
}

export { ALLOWED_COMMANDS, DEPLOY_SEQUENCES };
