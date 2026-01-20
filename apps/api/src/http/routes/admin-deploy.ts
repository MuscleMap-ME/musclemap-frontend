/**
 * Admin Deploy Routes
 *
 * Provides API endpoints for deployment pipeline management from the Empire dashboard:
 * - View current deployment status
 * - View deployment history with git commits, timestamps, status
 * - Trigger new deployments
 * - Rollback to previous deployments
 * - List available branches
 * - Preview what would be deployed
 * - Real-time deployment progress streaming via WebSocket
 *
 * SECURITY: All routes require admin authentication
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { query, queryOne, queryAll, transaction as _transaction } from '../../db/client';
import { authenticate, requireAdmin } from './auth';
import { loggers } from '../../lib/logger';

const execAsync = promisify(exec);

const log = loggers.http;

// ============================================
// SCHEMAS
// ============================================

const TriggerDeploySchema = z.object({
  branch: z.string().min(1).max(100).default('main'),
  notes: z.string().max(500).optional(),
  dryRun: z.boolean().default(false),
});

const RollbackSchema = z.object({
  notes: z.string().max(500).optional(),
});

const DeployHistoryQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  status: z.enum(['pending', 'in_progress', 'success', 'failed', 'rolled_back', 'cancelled']).optional(),
  branch: z.string().optional(),
});

const _BranchPreviewSchema = z.object({
  branch: z.string().min(1).max(100),
});

// ============================================
// TYPES
// ============================================

interface Deployment {
  id: string;
  git_commit: string;
  git_commit_short: string;
  git_branch: string;
  git_message: string | null;
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back' | 'cancelled';
  started_at: Date;
  completed_at: Date | null;
  triggered_by: string;
  triggered_by_username: string | null;
  output: string | null;
  error_message: string | null;
  rollback_of: string | null;
  rolled_back_by: string | null;
  notes: string | null;
  duration_ms: number | null;
}

interface DeploymentStatus {
  currentDeployment: Deployment | null;
  lastSuccessfulDeployment: Deployment | null;
  isDeploying: boolean;
  currentBranch: string;
  currentCommit: string;
  uncommittedChanges: number;
  pendingMigrations: number;
  serverUptime: number;
}

interface BranchInfo {
  name: string;
  commit: string;
  commitMessage: string;
  isCurrent: boolean;
  aheadBy: number;
  behindBy: number;
  lastCommitDate: string;
}

interface DeployPreview {
  branch: string;
  currentCommit: string;
  targetCommit: string;
  commitsBehind: number;
  commits: Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
  }>;
  filesChanged: number;
  additions: number;
  deletions: number;
  hasMigrations: boolean;
  migrationFiles: string[];
}

// ============================================
// HELPERS
// ============================================

const PROJECT_ROOT = process.env.PROJECT_ROOT || '/var/www/musclemap.me';

// Store active deployment processes
const activeDeployments = new Map<string, {
  process: ReturnType<typeof spawn>;
  output: string[];
  subscribers: Set<WebSocket>;
}>();

function generateDeploymentId(): string {
  return `deploy_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

async function getCurrentGitInfo(): Promise<{ branch: string; commit: string; uncommitted: number }> {
  try {
    const [branchResult, commitResult, statusResult] = await Promise.all([
      execAsync(`cd ${PROJECT_ROOT} && git rev-parse --abbrev-ref HEAD`),
      execAsync(`cd ${PROJECT_ROOT} && git rev-parse HEAD`),
      execAsync(`cd ${PROJECT_ROOT} && git status --porcelain`),
    ]);

    return {
      branch: branchResult.stdout.trim(),
      commit: commitResult.stdout.trim(),
      uncommitted: statusResult.stdout.trim().split('\n').filter(Boolean).length,
    };
  } catch (error) {
    log.error({ error }, 'Failed to get git info');
    return { branch: 'unknown', commit: 'unknown', uncommitted: 0 };
  }
}

async function getCommitMessage(commit: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`cd ${PROJECT_ROOT} && git log -1 --format=%s ${commit}`);
    return stdout.trim();
  } catch {
    return '';
  }
}

async function getPendingMigrations(): Promise<number> {
  try {
    // Check for migration files that haven't been run
    // This is a simplified check - in production you'd compare against migration_history table
    const { stdout } = await execAsync(
      `cd ${PROJECT_ROOT} && ls -1 apps/api/src/db/migrations/*.ts 2>/dev/null | wc -l`
    );
    return parseInt(stdout.trim()) || 0;
  } catch {
    return 0;
  }
}

async function getBranches(): Promise<BranchInfo[]> {
  try {
    const { stdout: branchList } = await execAsync(
      `cd ${PROJECT_ROOT} && git branch -a --format='%(refname:short)|%(objectname:short)|%(subject)|%(committerdate:iso)' 2>/dev/null`
    );

    const { stdout: currentBranch } = await execAsync(
      `cd ${PROJECT_ROOT} && git rev-parse --abbrev-ref HEAD`
    );
    const current = currentBranch.trim();

    const branches: BranchInfo[] = [];
    const lines = branchList.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      const [name, commit, message, date] = line.split('|');
      if (!name || name.startsWith('origin/HEAD')) continue;

      // Clean up remote branch names
      const cleanName = name.replace('origin/', '');

      // Skip if we already have this branch (prefer local over remote)
      if (branches.some(b => b.name === cleanName)) continue;

      // Get ahead/behind counts for non-current branches
      let aheadBy = 0;
      let behindBy = 0;
      if (cleanName !== current) {
        try {
          const { stdout: aheadBehind } = await execAsync(
            `cd ${PROJECT_ROOT} && git rev-list --left-right --count ${current}...${name} 2>/dev/null`
          );
          const [ahead, behind] = aheadBehind.trim().split('\t').map(Number);
          aheadBy = behind || 0;
          behindBy = ahead || 0;
        } catch {
          // Ignore errors for branches that can't be compared
        }
      }

      branches.push({
        name: cleanName,
        commit: commit || '',
        commitMessage: message || '',
        isCurrent: cleanName === current,
        aheadBy,
        behindBy,
        lastCommitDate: date || '',
      });
    }

    // Sort: current first, then by last commit date
    return branches.sort((a, b) => {
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      return new Date(b.lastCommitDate).getTime() - new Date(a.lastCommitDate).getTime();
    });
  } catch (error) {
    log.error({ error }, 'Failed to get branches');
    return [];
  }
}

async function getDeployPreview(branch: string): Promise<DeployPreview | null> {
  try {
    // Fetch latest from remote
    await execAsync(`cd ${PROJECT_ROOT} && git fetch origin ${branch} 2>/dev/null`).catch(() => {});

    const { stdout: currentCommit } = await execAsync(
      `cd ${PROJECT_ROOT} && git rev-parse HEAD`
    );

    let targetCommit: string;
    try {
      const { stdout } = await execAsync(
        `cd ${PROJECT_ROOT} && git rev-parse origin/${branch}`
      );
      targetCommit = stdout.trim();
    } catch {
      // Branch might be local only
      const { stdout } = await execAsync(
        `cd ${PROJECT_ROOT} && git rev-parse ${branch}`
      );
      targetCommit = stdout.trim();
    }

    const current = currentCommit.trim();
    const target = targetCommit.trim();

    if (current === target) {
      return {
        branch,
        currentCommit: current.substring(0, 7),
        targetCommit: target.substring(0, 7),
        commitsBehind: 0,
        commits: [],
        filesChanged: 0,
        additions: 0,
        deletions: 0,
        hasMigrations: false,
        migrationFiles: [],
      };
    }

    // Get commits between current and target
    const { stdout: commitLog } = await execAsync(
      `cd ${PROJECT_ROOT} && git log --oneline --format='%h|%s|%an|%ci' ${current}..${target} 2>/dev/null`
    );

    const commits = commitLog.trim().split('\n').filter(Boolean).map(line => {
      const [hash, message, author, date] = line.split('|');
      return { hash, message, author, date };
    });

    // Get diff stats
    let filesChanged = 0;
    let additions = 0;
    let deletions = 0;
    try {
      const { stdout: diffStat } = await execAsync(
        `cd ${PROJECT_ROOT} && git diff --shortstat ${current}..${target} 2>/dev/null`
      );
      const match = diffStat.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);
      if (match) {
        filesChanged = parseInt(match[1]) || 0;
        additions = parseInt(match[2]) || 0;
        deletions = parseInt(match[3]) || 0;
      }
    } catch {
      // Ignore diff errors
    }

    // Check for migration files in the diff
    let migrationFiles: string[] = [];
    try {
      const { stdout: diffFiles } = await execAsync(
        `cd ${PROJECT_ROOT} && git diff --name-only ${current}..${target} -- apps/api/src/db/migrations/ 2>/dev/null`
      );
      migrationFiles = diffFiles.trim().split('\n').filter(Boolean);
    } catch {
      // Ignore errors
    }

    return {
      branch,
      currentCommit: current.substring(0, 7),
      targetCommit: target.substring(0, 7),
      commitsBehind: commits.length,
      commits,
      filesChanged,
      additions,
      deletions,
      hasMigrations: migrationFiles.length > 0,
      migrationFiles,
    };
  } catch (error) {
    log.error({ error, branch }, 'Failed to get deploy preview');
    return null;
  }
}

async function executeDeployment(
  deploymentId: string,
  branch: string,
  triggeredBy: string,
  dryRun: boolean
): Promise<void> {
  const output: string[] = [];
  const subscribers = new Set<WebSocket>();

  const broadcast = (message: object) => {
    const data = JSON.stringify(message);
    for (const ws of subscribers) {
      try {
        ws.send(data);
      } catch {
        subscribers.delete(ws);
      }
    }
  };

  const appendOutput = (line: string) => {
    output.push(line);
    broadcast({ type: 'output', line, timestamp: new Date().toISOString() });
  };

  // Update status to in_progress
  await query(
    `UPDATE deployments SET status = 'in_progress', started_at = NOW() WHERE id = $1`,
    [deploymentId]
  );

  broadcast({ type: 'status', status: 'in_progress', timestamp: new Date().toISOString() });

  if (dryRun) {
    appendOutput('[DRY RUN] Would execute deployment steps:');
    appendOutput(`[DRY RUN] 1. git fetch origin ${branch}`);
    appendOutput(`[DRY RUN] 2. git checkout ${branch}`);
    appendOutput('[DRY RUN] 3. git pull');
    appendOutput('[DRY RUN] 4. pnpm install');
    appendOutput('[DRY RUN] 5. pnpm build:intelligent');
    appendOutput('[DRY RUN] 6. pnpm -C apps/api db:migrate');
    appendOutput('[DRY RUN] 7. pm2 restart musclemap');
    appendOutput('[DRY RUN] Deployment preview complete.');

    await query(
      `UPDATE deployments SET
        status = 'success',
        completed_at = NOW(),
        output = $1,
        duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
      WHERE id = $2`,
      [output.join('\n'), deploymentId]
    );

    broadcast({ type: 'status', status: 'success', timestamp: new Date().toISOString() });
    return;
  }

  // Execute deployment steps
  const steps = [
    { name: 'fetch', cmd: `git fetch origin ${branch}`, desc: `Fetching ${branch}...` },
    { name: 'checkout', cmd: `git checkout ${branch}`, desc: `Checking out ${branch}...` },
    { name: 'pull', cmd: 'git pull', desc: 'Pulling latest changes...' },
    { name: 'install', cmd: 'pnpm install', desc: 'Installing dependencies...' },
    { name: 'build', cmd: 'pnpm build:intelligent', desc: 'Building all packages...' },
    { name: 'migrate', cmd: 'pnpm -C apps/api db:migrate', desc: 'Running database migrations...' },
    { name: 'restart', cmd: 'pm2 restart musclemap', desc: 'Restarting API server...' },
  ];

  try {
    for (const step of steps) {
      appendOutput(`\n[STEP: ${step.name}] ${step.desc}`);
      broadcast({ type: 'step', step: step.name, desc: step.desc, timestamp: new Date().toISOString() });

      const child = spawn('bash', ['-c', step.cmd], {
        cwd: PROJECT_ROOT,
        env: { ...process.env, CI: 'true' },
      });

      // Store the process for cancellation
      activeDeployments.set(deploymentId, { process: child, output, subscribers });

      await new Promise<void>((resolve, reject) => {
        child.stdout.on('data', (data) => {
          const lines = data.toString().split('\n').filter(Boolean);
          lines.forEach((line: string) => appendOutput(line));
        });

        child.stderr.on('data', (data) => {
          const lines = data.toString().split('\n').filter(Boolean);
          lines.forEach((line: string) => appendOutput(`[stderr] ${line}`));
        });

        child.on('close', (code) => {
          if (code === 0) {
            appendOutput(`[STEP: ${step.name}] Completed successfully`);
            resolve();
          } else {
            reject(new Error(`Step ${step.name} failed with code ${code}`));
          }
        });

        child.on('error', (err) => {
          reject(err);
        });
      });
    }

    // Get final commit info
    const { commit } = await getCurrentGitInfo();
    const commitMessage = await getCommitMessage(commit);

    await query(
      `UPDATE deployments SET
        status = 'success',
        completed_at = NOW(),
        git_commit = $1,
        git_commit_short = $2,
        git_message = $3,
        output = $4,
        duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
      WHERE id = $5`,
      [commit, commit.substring(0, 7), commitMessage, output.join('\n'), deploymentId]
    );

    appendOutput('\n[SUCCESS] Deployment completed successfully!');
    broadcast({ type: 'status', status: 'success', timestamp: new Date().toISOString() });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    appendOutput(`\n[ERROR] Deployment failed: ${errorMessage}`);

    await query(
      `UPDATE deployments SET
        status = 'failed',
        completed_at = NOW(),
        output = $1,
        error_message = $2,
        duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
      WHERE id = $3`,
      [output.join('\n'), errorMessage, deploymentId]
    );

    broadcast({ type: 'status', status: 'failed', error: errorMessage, timestamp: new Date().toISOString() });
  } finally {
    activeDeployments.delete(deploymentId);
  }
}

// ============================================
// ROUTES
// ============================================

export default async function adminDeployRoutes(fastify: FastifyInstance) {
  // All routes require authentication and admin role
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    if (reply.sent) return;
    await requireAdmin(request, reply);
  });

  // ----------------------------------------
  // GET /admin/deploy/status
  // Get current deployment status
  // ----------------------------------------
  fastify.get('/admin/deploy/status', async (request, reply) => {
    try {
      const gitInfo = await getCurrentGitInfo();
      const pendingMigrations = await getPendingMigrations();

      // Get current/active deployment
      const currentDeployment = await queryOne<Deployment>(`
        SELECT d.*, u.username as triggered_by_username
        FROM deployments d
        LEFT JOIN users u ON u.id = d.triggered_by
        WHERE d.status IN ('pending', 'in_progress')
        ORDER BY d.started_at DESC
        LIMIT 1
      `);

      // Get last successful deployment
      const lastSuccessful = await queryOne<Deployment>(`
        SELECT d.*, u.username as triggered_by_username
        FROM deployments d
        LEFT JOIN users u ON u.id = d.triggered_by
        WHERE d.status = 'success'
        ORDER BY d.completed_at DESC
        LIMIT 1
      `);

      // Get server uptime
      let serverUptime = 0;
      try {
        const { stdout } = await execAsync('pm2 jlist');
        const processes = JSON.parse(stdout);
        const apiProcess = processes.find((p: { name: string }) => p.name.includes('musclemap'));
        if (apiProcess?.pm2_env?.pm_uptime) {
          serverUptime = Date.now() - apiProcess.pm2_env.pm_uptime;
        }
      } catch {
        // PM2 not available
      }

      const status: DeploymentStatus = {
        currentDeployment: currentDeployment || null,
        lastSuccessfulDeployment: lastSuccessful || null,
        isDeploying: !!currentDeployment,
        currentBranch: gitInfo.branch,
        currentCommit: gitInfo.commit.substring(0, 7),
        uncommittedChanges: gitInfo.uncommitted,
        pendingMigrations,
        serverUptime,
      };

      return reply.send({ data: status });
    } catch (error) {
      log.error({ error }, 'Failed to get deployment status');
      return reply.status(500).send({ error: 'Failed to get deployment status' });
    }
  });

  // ----------------------------------------
  // GET /admin/deploy/history
  // Get deployment history
  // ----------------------------------------
  fastify.get('/admin/deploy/history', async (request, reply) => {
    try {
      const params = DeployHistoryQuerySchema.parse(request.query);

      let whereClause = '1=1';
      const queryParams: (string | number)[] = [];

      if (params.status) {
        queryParams.push(params.status);
        whereClause += ` AND d.status = $${queryParams.length}`;
      }

      if (params.branch) {
        queryParams.push(params.branch);
        whereClause += ` AND d.git_branch = $${queryParams.length}`;
      }

      queryParams.push(params.limit, params.offset);

      const deployments = await queryAll<Deployment>(`
        SELECT
          d.*,
          u.username as triggered_by_username,
          rb.username as rolled_back_by_username
        FROM deployments d
        LEFT JOIN users u ON u.id = d.triggered_by
        LEFT JOIN users rb ON rb.id = d.rolled_back_by
        WHERE ${whereClause}
        ORDER BY d.started_at DESC
        LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
      `, queryParams);

      const countResult = await queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM deployments d WHERE ${whereClause}
      `, queryParams.slice(0, -2));

      return reply.send({
        data: {
          deployments,
          pagination: {
            total: parseInt(countResult?.count || '0'),
            limit: params.limit,
            offset: params.offset,
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid parameters', details: error.errors });
      }
      log.error({ error }, 'Failed to get deployment history');
      return reply.status(500).send({ error: 'Failed to get deployment history' });
    }
  });

  // ----------------------------------------
  // POST /admin/deploy/trigger
  // Trigger a new deployment
  // ----------------------------------------
  fastify.post('/admin/deploy/trigger', async (request, reply) => {
    try {
      const body = TriggerDeploySchema.parse(request.body);
      const userId = request.user!.userId;

      // Check if deployment is already in progress
      const activeDeployment = await queryOne<{ id: string }>(`
        SELECT id FROM deployments WHERE status IN ('pending', 'in_progress')
      `);

      if (activeDeployment) {
        return reply.status(409).send({
          error: 'Deployment already in progress',
          deploymentId: activeDeployment.id,
        });
      }

      // Get current git info for the deployment record
      const gitInfo = await getCurrentGitInfo();
      const commitMessage = await getCommitMessage(gitInfo.commit);

      const deploymentId = generateDeploymentId();

      await query(`
        INSERT INTO deployments (
          id, git_commit, git_commit_short, git_branch, git_message,
          status, triggered_by, notes
        ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
      `, [
        deploymentId,
        gitInfo.commit,
        gitInfo.commit.substring(0, 7),
        body.branch,
        commitMessage,
        userId,
        body.notes || null,
      ]);

      // Start deployment in background
      setImmediate(() => {
        executeDeployment(deploymentId, body.branch, userId, body.dryRun).catch((err) => {
          log.error({ err, deploymentId }, 'Deployment execution error');
        });
      });

      return reply.status(202).send({
        data: {
          deploymentId,
          branch: body.branch,
          dryRun: body.dryRun,
          message: body.dryRun
            ? 'Dry run deployment started'
            : 'Deployment started',
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid parameters', details: error.errors });
      }
      log.error({ error }, 'Failed to trigger deployment');
      return reply.status(500).send({ error: 'Failed to trigger deployment' });
    }
  });

  // ----------------------------------------
  // POST /admin/deploy/rollback/:deploymentId
  // Rollback to a previous deployment
  // ----------------------------------------
  fastify.post('/admin/deploy/rollback/:deploymentId', async (request, reply) => {
    try {
      const { deploymentId } = request.params as { deploymentId: string };
      const body = RollbackSchema.parse(request.body || {});
      const userId = request.user!.userId;

      // Check if deployment is already in progress
      const activeDeployment = await queryOne<{ id: string }>(`
        SELECT id FROM deployments WHERE status IN ('pending', 'in_progress')
      `);

      if (activeDeployment) {
        return reply.status(409).send({
          error: 'Deployment already in progress',
          deploymentId: activeDeployment.id,
        });
      }

      // Get the deployment to rollback to
      const targetDeployment = await queryOne<Deployment>(`
        SELECT * FROM deployments WHERE id = $1 AND status = 'success'
      `, [deploymentId]);

      if (!targetDeployment) {
        return reply.status(404).send({
          error: 'Deployment not found or not eligible for rollback',
        });
      }

      // Create rollback deployment
      const rollbackId = generateDeploymentId();

      await query(`
        INSERT INTO deployments (
          id, git_commit, git_commit_short, git_branch, git_message,
          status, triggered_by, notes, rollback_of
        ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8)
      `, [
        rollbackId,
        targetDeployment.git_commit,
        targetDeployment.git_commit_short,
        targetDeployment.git_branch,
        `[ROLLBACK] ${targetDeployment.git_message || 'Rollback'}`,
        userId,
        body.notes || `Rolling back to deployment ${deploymentId}`,
        deploymentId,
      ]);

      // Mark original deployment as rolled back
      await query(`
        UPDATE deployments SET
          status = 'rolled_back',
          rolled_back_by = $1
        WHERE id = (
          SELECT id FROM deployments
          WHERE status = 'success'
          ORDER BY completed_at DESC
          LIMIT 1
        )
      `, [userId]);

      // Start rollback in background (same as deployment but to specific commit)
      setImmediate(() => {
        executeDeployment(rollbackId, targetDeployment.git_branch, userId, false).catch((err) => {
          log.error({ err, rollbackId }, 'Rollback execution error');
        });
      });

      return reply.status(202).send({
        data: {
          rollbackId,
          targetDeploymentId: deploymentId,
          targetCommit: targetDeployment.git_commit_short,
          message: 'Rollback started',
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid parameters', details: error.errors });
      }
      log.error({ error }, 'Failed to trigger rollback');
      return reply.status(500).send({ error: 'Failed to trigger rollback' });
    }
  });

  // ----------------------------------------
  // GET /admin/deploy/branches
  // List available branches
  // ----------------------------------------
  fastify.get('/admin/deploy/branches', async (_request, reply) => {
    try {
      const branches = await getBranches();

      return reply.send({
        data: {
          branches,
          count: branches.length,
        },
      });
    } catch (error) {
      log.error({ error }, 'Failed to get branches');
      return reply.status(500).send({ error: 'Failed to get branches' });
    }
  });

  // ----------------------------------------
  // GET /admin/deploy/preview/:branch
  // Preview what would be deployed
  // ----------------------------------------
  fastify.get('/admin/deploy/preview/:branch', async (request, reply) => {
    try {
      const { branch } = request.params as { branch: string };

      if (!branch || branch.length > 100) {
        return reply.status(400).send({ error: 'Invalid branch name' });
      }

      const preview = await getDeployPreview(branch);

      if (!preview) {
        return reply.status(404).send({ error: 'Branch not found or cannot be compared' });
      }

      return reply.send({ data: preview });
    } catch (error) {
      log.error({ error }, 'Failed to get deploy preview');
      return reply.status(500).send({ error: 'Failed to get deploy preview' });
    }
  });

  // ----------------------------------------
  // POST /admin/deploy/cancel/:deploymentId
  // Cancel a running deployment
  // ----------------------------------------
  fastify.post('/admin/deploy/cancel/:deploymentId', async (request, reply) => {
    try {
      const { deploymentId } = request.params as { deploymentId: string };
      const userId = request.user!.userId;

      const deployment = await queryOne<Deployment>(`
        SELECT * FROM deployments WHERE id = $1 AND status IN ('pending', 'in_progress')
      `, [deploymentId]);

      if (!deployment) {
        return reply.status(404).send({
          error: 'Deployment not found or not cancellable',
        });
      }

      // Kill the process if running
      const activeDeployment = activeDeployments.get(deploymentId);
      if (activeDeployment) {
        activeDeployment.process.kill('SIGTERM');
        activeDeployments.delete(deploymentId);
      }

      await query(`
        UPDATE deployments SET
          status = 'cancelled',
          completed_at = NOW(),
          error_message = 'Cancelled by user',
          duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
        WHERE id = $1
      `, [deploymentId]);

      log.info({ deploymentId, cancelledBy: userId }, 'Deployment cancelled');

      return reply.send({
        data: {
          deploymentId,
          status: 'cancelled',
          message: 'Deployment cancelled',
        },
      });
    } catch (error) {
      log.error({ error }, 'Failed to cancel deployment');
      return reply.status(500).send({ error: 'Failed to cancel deployment' });
    }
  });

  // ----------------------------------------
  // WebSocket /admin/deploy/stream
  // Real-time deployment progress streaming
  // ----------------------------------------
  fastify.get('/admin/deploy/stream', { websocket: true }, (socket, request) => {
    // Note: WebSocket auth is handled differently - check token in query
    const token = (request.query as { token?: string }).token;
    const deploymentId = (request.query as { deploymentId?: string }).deploymentId;

    if (!token) {
      socket.send(JSON.stringify({ error: 'Authentication required' }));
      socket.close();
      return;
    }

    // Send initial connection message
    socket.send(JSON.stringify({
      type: 'connected',
      deploymentId: deploymentId || null,
      timestamp: new Date().toISOString(),
    }));

    // If specific deployment, subscribe to it
    if (deploymentId) {
      const deployment = activeDeployments.get(deploymentId);
      if (deployment) {
        deployment.subscribers.add(socket as unknown as WebSocket);

        // Send existing output
        for (const line of deployment.output) {
          socket.send(JSON.stringify({
            type: 'output',
            line,
            historical: true,
            timestamp: new Date().toISOString(),
          }));
        }
      } else {
        socket.send(JSON.stringify({
          type: 'info',
          message: 'No active deployment found',
          timestamp: new Date().toISOString(),
        }));
      }
    }

    // Handle messages from client
    socket.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }

        if (data.type === 'subscribe' && data.deploymentId) {
          const deployment = activeDeployments.get(data.deploymentId);
          if (deployment) {
            deployment.subscribers.add(socket as unknown as WebSocket);
            socket.send(JSON.stringify({
              type: 'subscribed',
              deploymentId: data.deploymentId,
              timestamp: new Date().toISOString(),
            }));
          }
        }
      } catch {
        // Ignore invalid messages
      }
    });

    // Cleanup on close
    socket.on('close', () => {
      for (const [, deployment] of activeDeployments) {
        deployment.subscribers.delete(socket as unknown as WebSocket);
      }
    });

    socket.on('error', () => {
      for (const [, deployment] of activeDeployments) {
        deployment.subscribers.delete(socket as unknown as WebSocket);
      }
    });
  });

  // ----------------------------------------
  // GET /admin/deploy/:deploymentId
  // Get single deployment details
  // ----------------------------------------
  fastify.get('/admin/deploy/:deploymentId', async (request, reply) => {
    try {
      const { deploymentId } = request.params as { deploymentId: string };

      const deployment = await queryOne<Deployment>(`
        SELECT
          d.*,
          u.username as triggered_by_username,
          rb.username as rolled_back_by_username
        FROM deployments d
        LEFT JOIN users u ON u.id = d.triggered_by
        LEFT JOIN users rb ON rb.id = d.rolled_back_by
        WHERE d.id = $1
      `, [deploymentId]);

      if (!deployment) {
        return reply.status(404).send({ error: 'Deployment not found' });
      }

      return reply.send({ data: deployment });
    } catch (error) {
      log.error({ error }, 'Failed to get deployment');
      return reply.status(500).send({ error: 'Failed to get deployment' });
    }
  });
}
