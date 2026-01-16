/**
 * Admin Server Control Routes
 *
 * Provides API endpoints for server management from the Empire dashboard:
 * - Execute scripts (start, stop, deploy, etc.)
 * - View and stream logs
 * - Manage PM2 processes
 * - Run builds and tests
 * - System status and health checks
 *
 * SECURITY: All routes require admin authentication
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// ============================================
// SCHEMAS
// ============================================

const ScriptExecuteSchema = z.object({
  script: z.enum([
    'start',
    'stop',
    'status',
    'deploy',
    'build',
    'test',
    'typecheck',
    'lint',
    'migrate',
    'logs',
    'restart-api',
    'pre-deploy-check',
    'generate-docs',
  ]),
  args: z.array(z.string()).optional().default([]),
  env: z.record(z.string()).optional(),
});

const LogsQuerySchema = z.object({
  lines: z.coerce.number().min(1).max(1000).default(100),
  process: z.string().optional().default('musclemap'),
  filter: z.string().optional(),
});

const ProcessActionSchema = z.object({
  action: z.enum(['start', 'stop', 'restart', 'delete', 'reload']),
  process: z.string(),
});

// ============================================
// TYPES
// ============================================

interface ScriptResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  duration: number;
}

interface ProcessInfo {
  name: string;
  pid: number;
  status: 'online' | 'stopped' | 'errored' | 'launching';
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
}

interface SystemStatus {
  services: {
    postgres: boolean;
    redis: boolean;
    api: boolean;
    vite: boolean;
  };
  processes: ProcessInfo[];
  disk: {
    total: string;
    used: string;
    available: string;
    percent: number;
  };
  memory: {
    total: string;
    used: string;
    available: string;
    percent: number;
  };
  uptime: number;
}

// ============================================
// HELPERS
// ============================================

const PROJECT_ROOT = process.env.PROJECT_ROOT || '/var/www/musclemap.me';
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');

// Map script names to actual commands
const SCRIPT_MAP: Record<string, { cmd: string; args: string[]; cwd?: string }> = {
  start: { cmd: 'bash', args: ['musclemap-start.sh', '--all'] },
  stop: { cmd: 'bash', args: ['musclemap-stop.sh', '--quiet'] },
  status: { cmd: 'bash', args: ['musclemap-start.sh', '--status'] },
  deploy: { cmd: 'bash', args: ['deploy-branch.sh', '--deploy'] },
  build: { cmd: 'pnpm', args: ['build:all'], cwd: PROJECT_ROOT },
  test: { cmd: 'pnpm', args: ['test'], cwd: PROJECT_ROOT },
  typecheck: { cmd: 'pnpm', args: ['typecheck'], cwd: PROJECT_ROOT },
  lint: { cmd: 'pnpm', args: ['lint'], cwd: PROJECT_ROOT },
  migrate: { cmd: 'pnpm', args: ['-C', 'apps/api', 'db:migrate'], cwd: PROJECT_ROOT },
  logs: { cmd: 'pm2', args: ['logs', 'musclemap', '--lines', '100', '--nostream'] },
  'restart-api': { cmd: 'pm2', args: ['restart', 'musclemap'] },
  'pre-deploy-check': { cmd: 'bash', args: ['pre-deploy-check.sh', '--fast'] },
  'generate-docs': { cmd: 'node', args: ['generate-docs.cjs', '--fast'] },
};

async function executeScript(
  scriptName: string,
  extraArgs: string[] = [],
  env?: Record<string, string>
): Promise<ScriptResult> {
  const startTime = Date.now();
  const scriptConfig = SCRIPT_MAP[scriptName];

  if (!scriptConfig) {
    return {
      success: false,
      output: '',
      error: `Unknown script: ${scriptName}`,
      exitCode: 1,
      duration: 0,
    };
  }

  const cwd = scriptConfig.cwd || SCRIPTS_DIR;
  const args = [...scriptConfig.args, ...extraArgs];

  return new Promise((resolve) => {
    let output = '';
    let errorOutput = '';

    const child = spawn(scriptConfig.cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: true,
    });

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      resolve({
        success: code === 0,
        output: output || errorOutput,
        error: code !== 0 ? errorOutput : undefined,
        exitCode: code || 0,
        duration,
      });
    });

    child.on('error', (err) => {
      const duration = Date.now() - startTime;
      resolve({
        success: false,
        output: '',
        error: err.message,
        exitCode: 1,
        duration,
      });
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        success: false,
        output,
        error: 'Script execution timed out after 5 minutes',
        exitCode: 124,
        duration: 300000,
      });
    }, 300000);
  });
}

async function getSystemStatus(): Promise<SystemStatus> {
  // Check services
  const [pgCheck, redisCheck, apiCheck, viteCheck] = await Promise.all([
    execAsync('pgrep -x postgres || pgrep -f "postgres.*5432"').then(() => true).catch(() => false),
    execAsync('pgrep -x redis-server || lsof -i:6379').then(() => true).catch(() => false),
    execAsync('pm2 jlist').then(({ stdout }) => {
      const processes = JSON.parse(stdout);
      return processes.some((p: { name: string; pm2_env: { status: string } }) =>
        p.name.includes('musclemap') && p.pm2_env.status === 'online'
      );
    }).catch(() => false),
    execAsync('pgrep -f vite || lsof -i:5173').then(() => true).catch(() => false),
  ]);

  // Get PM2 processes
  let processes: ProcessInfo[] = [];
  try {
    const { stdout } = await execAsync('pm2 jlist');
    const pm2List = JSON.parse(stdout);
    processes = pm2List.map((p: {
      name: string;
      pid: number;
      pm2_env: { status: string; pm_uptime: number; restart_time: number };
      monit: { cpu: number; memory: number };
    }) => ({
      name: p.name,
      pid: p.pid,
      status: p.pm2_env.status,
      cpu: p.monit?.cpu || 0,
      memory: p.monit?.memory || 0,
      uptime: p.pm2_env.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : 0,
      restarts: p.pm2_env.restart_time || 0,
    }));
  } catch {
    // PM2 not available
  }

  // Get disk usage
  let disk = { total: '0', used: '0', available: '0', percent: 0 };
  try {
    const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $2,$3,$4,$5}'");
    const [total, used, available, percentStr] = stdout.trim().split(' ');
    disk = { total, used, available, percent: parseInt(percentStr) || 0 };
  } catch {
    // df not available
  }

  // Get memory usage
  let memory = { total: '0', used: '0', available: '0', percent: 0 };
  try {
    // macOS uses vm_stat, Linux uses free
    if (process.platform === 'darwin') {
      const { stdout } = await execAsync('vm_stat');
      const pageSize = 4096;
      const freeMatch = stdout.match(/Pages free:\s+(\d+)/);
      const activeMatch = stdout.match(/Pages active:\s+(\d+)/);
      const inactiveMatch = stdout.match(/Pages inactive:\s+(\d+)/);
      const wiredMatch = stdout.match(/Pages wired down:\s+(\d+)/);

      if (freeMatch && activeMatch && inactiveMatch && wiredMatch) {
        const free = parseInt(freeMatch[1]) * pageSize;
        const active = parseInt(activeMatch[1]) * pageSize;
        const inactive = parseInt(inactiveMatch[1]) * pageSize;
        const wired = parseInt(wiredMatch[1]) * pageSize;
        const used = active + wired;
        const total = free + active + inactive + wired;
        memory = {
          total: formatBytes(total),
          used: formatBytes(used),
          available: formatBytes(free + inactive),
          percent: Math.round((used / total) * 100),
        };
      }
    } else {
      const { stdout } = await execAsync("free -h | grep Mem | awk '{print $2,$3,$7}'");
      const [total, used, available] = stdout.trim().split(' ');
      const usedNum = parseFloat(used);
      const totalNum = parseFloat(total);
      memory = {
        total,
        used,
        available,
        percent: Math.round((usedNum / totalNum) * 100) || 0,
      };
    }
  } catch {
    // memory check not available
  }

  // Get system uptime
  let uptime = 0;
  try {
    const { stdout } = await execAsync('uptime -s 2>/dev/null || uptime');
    if (stdout.includes(':')) {
      // Parse uptime output
      const match = stdout.match(/up\s+(\d+)\s+days?/);
      if (match) {
        uptime = parseInt(match[1]) * 86400000;
      }
    }
  } catch {
    // uptime not available
  }

  return {
    services: {
      postgres: pgCheck,
      redis: redisCheck,
      api: apiCheck,
      vite: viteCheck,
    },
    processes,
    disk,
    memory,
    uptime,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

async function getPM2Logs(
  processName: string,
  lines: number,
  filter?: string
): Promise<string> {
  try {
    let cmd = `pm2 logs ${processName} --lines ${lines} --nostream`;
    if (filter) {
      cmd += ` | grep -i "${filter}"`;
    }
    const { stdout, stderr } = await execAsync(cmd);
    return stdout || stderr || 'No logs available';
  } catch (err) {
    return `Error fetching logs: ${(err as Error).message}`;
  }
}

async function pm2Action(action: string, processName: string): Promise<ScriptResult> {
  const startTime = Date.now();
  try {
    const { stdout, stderr } = await execAsync(`pm2 ${action} ${processName}`);
    return {
      success: true,
      output: stdout || stderr,
      exitCode: 0,
      duration: Date.now() - startTime,
    };
  } catch (err) {
    return {
      success: false,
      output: '',
      error: (err as Error).message,
      exitCode: 1,
      duration: Date.now() - startTime,
    };
  }
}

// ============================================
// ROUTES
// ============================================

export default async function adminServerRoutes(fastify: FastifyInstance) {
  // All routes require admin authentication
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Check if user is authenticated and is admin
    const user = (request as { user?: { role?: string } }).user;
    if (!user || user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }
  });

  // ----------------------------------------
  // GET /admin/server/status
  // Get comprehensive system status
  // ----------------------------------------
  fastify.get('/admin/server/status', async (_request, reply) => {
    try {
      const status = await getSystemStatus();
      return reply.send(status);
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // POST /admin/server/script
  // Execute a predefined script
  // ----------------------------------------
  fastify.post('/admin/server/script', async (request, reply) => {
    try {
      const body = ScriptExecuteSchema.parse(request.body);
      const result = await executeScript(body.script, body.args, body.env);
      return reply.send(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: err.errors });
      }
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // GET /admin/server/logs
  // Get PM2 logs
  // ----------------------------------------
  fastify.get('/admin/server/logs', async (request, reply) => {
    try {
      const query = LogsQuerySchema.parse(request.query);
      const logs = await getPM2Logs(query.process, query.lines, query.filter);
      return reply.send({ logs });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: err.errors });
      }
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // POST /admin/server/process
  // Manage PM2 processes
  // ----------------------------------------
  fastify.post('/admin/server/process', async (request, reply) => {
    try {
      const body = ProcessActionSchema.parse(request.body);
      const result = await pm2Action(body.action, body.process);
      return reply.send(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: err.errors });
      }
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // GET /admin/server/scripts
  // List available scripts
  // ----------------------------------------
  fastify.get('/admin/server/scripts', async (_request, reply) => {
    const scripts = Object.keys(SCRIPT_MAP).map((name) => ({
      name,
      description: getScriptDescription(name),
      dangerous: isDangerousScript(name),
    }));
    return reply.send({ scripts });
  });

  // ----------------------------------------
  // GET /admin/server/git
  // Get git status and recent commits
  // ----------------------------------------
  fastify.get('/admin/server/git', async (_request, reply) => {
    try {
      const [statusResult, logResult, branchResult] = await Promise.all([
        execAsync(`cd ${PROJECT_ROOT} && git status --porcelain`),
        execAsync(`cd ${PROJECT_ROOT} && git log --oneline -10`),
        execAsync(`cd ${PROJECT_ROOT} && git rev-parse --abbrev-ref HEAD`),
      ]);

      return reply.send({
        branch: branchResult.stdout.trim(),
        status: statusResult.stdout.trim().split('\n').filter(Boolean),
        recentCommits: logResult.stdout.trim().split('\n').filter(Boolean),
      });
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // POST /admin/server/git/pull
  // Pull latest changes
  // ----------------------------------------
  fastify.post('/admin/server/git/pull', async (_request, reply) => {
    try {
      const { stdout, stderr } = await execAsync(`cd ${PROJECT_ROOT} && git pull`);
      return reply.send({
        success: true,
        output: stdout || stderr,
      });
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // GET /admin/server/logs/stream (WebSocket)
  // Real-time log streaming
  // ----------------------------------------
  fastify.get('/admin/server/logs/stream', { websocket: true }, (socket, request) => {
    // Verify admin access (token in query string for WebSocket)
    const token = (request.query as { token?: string }).token;
    if (!token) {
      socket.send(JSON.stringify({ error: 'Authentication required' }));
      socket.close();
      return;
    }

    const processName = (request.query as { process?: string }).process || 'musclemap';
    let logProcess: ReturnType<typeof spawn> | null = null;
    let isAlive = true;

    // Send initial connection message
    socket.send(JSON.stringify({
      type: 'connected',
      message: `Connected to ${processName} log stream`,
      timestamp: new Date().toISOString(),
    }));

    // Start tailing logs
    const startLogStream = () => {
      logProcess = spawn('pm2', ['logs', processName, '--raw', '--lines', '50'], {
        shell: true,
      });

      logProcess.stdout?.on('data', (data: Buffer) => {
        if (isAlive) {
          const lines = data.toString().split('\n').filter(Boolean);
          lines.forEach((line: string) => {
            socket.send(JSON.stringify({
              type: 'log',
              data: line,
              timestamp: new Date().toISOString(),
            }));
          });
        }
      });

      logProcess.stderr?.on('data', (data: Buffer) => {
        if (isAlive) {
          const lines = data.toString().split('\n').filter(Boolean);
          lines.forEach((line: string) => {
            socket.send(JSON.stringify({
              type: 'error',
              data: line,
              timestamp: new Date().toISOString(),
            }));
          });
        }
      });

      logProcess.on('close', (code: number | null) => {
        if (isAlive) {
          socket.send(JSON.stringify({
            type: 'closed',
            message: `Log stream closed with code ${code}`,
            timestamp: new Date().toISOString(),
          }));
        }
      });
    };

    startLogStream();

    // Handle incoming messages (commands)
    socket.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        } else if (data.type === 'restart') {
          // Restart the log stream
          if (logProcess) {
            logProcess.kill();
          }
          startLogStream();
          socket.send(JSON.stringify({
            type: 'restarted',
            message: 'Log stream restarted',
            timestamp: new Date().toISOString(),
          }));
        }
      } catch {
        // Ignore invalid messages
      }
    });

    // Cleanup on close
    socket.on('close', () => {
      isAlive = false;
      if (logProcess) {
        logProcess.kill();
        logProcess = null;
      }
    });

    socket.on('error', () => {
      isAlive = false;
      if (logProcess) {
        logProcess.kill();
        logProcess = null;
      }
    });
  });
}

function getScriptDescription(name: string): string {
  const descriptions: Record<string, string> = {
    start: 'Start all MuscleMap services (PostgreSQL, Redis, API, Vite)',
    stop: 'Stop all MuscleMap services',
    status: 'Check status of all services',
    deploy: 'Deploy to production (full deploy cycle)',
    build: 'Build all packages and frontend',
    test: 'Run test suite',
    typecheck: 'Run TypeScript type checking',
    lint: 'Run ESLint linting',
    migrate: 'Run database migrations',
    logs: 'View PM2 logs',
    'restart-api': 'Restart the API server',
    'pre-deploy-check': 'Run pre-deployment validation checks',
    'generate-docs': 'Regenerate documentation',
  };
  return descriptions[name] || 'No description available';
}

function isDangerousScript(name: string): boolean {
  const dangerous = ['deploy', 'migrate', 'stop'];
  return dangerous.includes(name);
}
