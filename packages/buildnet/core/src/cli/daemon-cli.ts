#!/usr/bin/env node
/**
 * BuildNet Daemon CLI
 *
 * Command-line interface for managing the BuildNet daemon system.
 *
 * Usage:
 *   buildnet daemon start [--config path] [--port number]
 *   buildnet daemon stop
 *   buildnet daemon status
 *   buildnet server add --name <name> --address <addr> [options]
 *   buildnet server remove <name> [--force]
 *   buildnet server list
 *   buildnet session list
 *   buildnet build [targets...]
 *   buildnet dashboard
 *   buildnet ledger query [options]
 *   buildnet ledger verify
 */

import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import pc from 'picocolors';
import {
  createDaemonSystem,
  getDefaultDaemonConfig,
  type MasterDaemonConfig,
  type ActorIdentity,
} from '../daemon/index.js';
import { createStateBackend, type StateBackend } from '../state/index.js';

// ============================================================================
// CLI Types
// ============================================================================

interface CliContext {
  config: MasterDaemonConfig;
  state: StateBackend;
  rootDir: string;
}

type CommandHandler = (args: string[], ctx: CliContext) => Promise<void>;

// API response types
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code?: string };
}

interface DashboardState {
  cluster: {
    name: string;
    status: string;
    uptime_seconds: number;
    version: string;
  };
  resources: {
    active_workers: number;
    total_workers: number;
    used_cpu_cores: number;
    total_cpu_cores: number;
    used_memory_gb: number;
    total_memory_gb: number;
  };
  builds: {
    queued: number;
    in_progress: number;
    completed_last_hour: number;
    failed_last_hour: number;
    avg_build_time_ms: number;
  };
  sessions: {
    users: unknown[];
    agents: unknown[];
    services: unknown[];
  };
}

interface ResourceItem {
  id: string;
  name: string;
  type: string;
  status: string;
  address?: string;
  cpu_cores?: number;
  memory_gb?: number;
  capabilities?: unknown;
}

interface SessionItem {
  id: string;
  type: string;
  name: string;
  state: string;
  created_at: string;
  expires_at: string;
}

interface LedgerEntry {
  entry_id: string;
  entry_type: string;
  account_type: string;
  entity_type: string;
  entity_id: string;
  timestamp: string;
  actor: { name: string };
  reason: string;
}

interface LedgerVerification {
  valid: boolean;
  total_entries: number;
  errors: string[];
}

interface ActiveSession {
  id: string;
  actor_type: string;
  actor: { name: string };
  connection_type: string;
  current_activity?: { activity_type: string };
  connected_at: string;
}

interface BuildResult {
  status: string;
  duration_ms: number;
  bundles_completed: number;
  bundles_failed?: number;
  errors?: Array<{ message: string }>;
}

interface LedgerStats {
  total_entries: number;
  total_transactions: number;
  oldest_entry?: string;
  newest_entry?: string;
  entries_by_type: Record<string, number>;
}

interface LedgerVerifyReport {
  verified: boolean;
  entries_checked: number;
  errors: Array<{ type: string; sequence: number }>;
}

// ============================================================================
// CLI Commands
// ============================================================================

const commands: Record<string, CommandHandler> = {
  'daemon:start': daemonStart,
  'daemon:stop': daemonStop,
  'daemon:status': daemonStatus,
  'server:add': serverAdd,
  'server:remove': serverRemove,
  'server:list': serverList,
  'server:drain': serverDrain,
  'server:resume': serverResume,
  'session:list': sessionList,
  'build': buildCommand,
  'dashboard': dashboardCommand,
  'ledger:query': ledgerQuery,
  'ledger:verify': ledgerVerify,
  'ledger:stats': ledgerStats,
  'help': helpCommand,
};

// ============================================================================
// Command Implementations
// ============================================================================

async function daemonStart(args: string[], ctx: CliContext): Promise<void> {
  console.log(pc.blue('Starting BuildNet daemon...'));

  const port = getArgValue(args, '--port', '7890');

  const system = await createDaemonSystem({
    config: ctx.config,
    state: ctx.state,
    root_dir: ctx.rootDir,
    http_port: parseInt(port, 10),
  });

  // Handle shutdown signals
  const shutdown = async () => {
    console.log(pc.yellow('\nShutting down daemon...'));
    await system.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await system.start();

  console.log(pc.green(`✓ Daemon started`));
  console.log(`  Cluster: ${ctx.config.cluster_name}`);
  console.log(`  API: http://localhost:${port}`);
  console.log(`  Watching: ${ctx.config.watch.directories.join(', ')}`);
  console.log(pc.dim('\nPress Ctrl+C to stop'));

  // Keep process running
  await new Promise(() => {});
}

async function daemonStop(args: string[], ctx: CliContext): Promise<void> {
  console.log(pc.yellow('Stopping daemon...'));

  // Send stop signal via API
  const port = getArgValue(args, '--port', '7890');

  try {
    const response = await fetch(`http://localhost:${port}/api/daemon/stop`, {
      method: 'POST',
    });

    if (response.ok) {
      console.log(pc.green('✓ Daemon stopped'));
    } else {
      console.log(pc.red('✗ Failed to stop daemon'));
    }
  } catch {
    console.log(pc.dim('Daemon is not running'));
  }
}

async function daemonStatus(args: string[], ctx: CliContext): Promise<void> {
  const port = getArgValue(args, '--port', '7890');

  try {
    const response = await fetch(`http://localhost:${port}/api/dashboard`);
    const data = (await response.json()) as ApiResponse<DashboardState>;

    if (data.success && data.data) {
      const state = data.data;

      console.log(pc.bold('\nBuildNet Cluster Status\n'));
      console.log(`  Name:    ${state.cluster.name}`);
      console.log(`  Status:  ${statusColor(state.cluster.status)}`);
      console.log(`  Uptime:  ${formatUptime(state.cluster.uptime_seconds)}`);
      console.log(`  Version: ${state.cluster.version}`);

      console.log(pc.bold('\nResources\n'));
      console.log(`  Workers: ${state.resources.active_workers}/${state.resources.total_workers} active`);
      console.log(`  CPU:     ${state.resources.used_cpu_cores}/${state.resources.total_cpu_cores} cores`);
      console.log(`  Memory:  ${state.resources.used_memory_gb}/${state.resources.total_memory_gb} GB`);

      console.log(pc.bold('\nBuilds (last hour)\n'));
      console.log(`  Queued:      ${state.builds.queued}`);
      console.log(`  In Progress: ${state.builds.in_progress}`);
      console.log(`  Completed:   ${state.builds.completed_last_hour}`);
      console.log(`  Failed:      ${state.builds.failed_last_hour}`);
      console.log(`  Avg Time:    ${(state.builds.avg_build_time_ms / 1000).toFixed(1)}s`);

      console.log(pc.bold('\nSessions\n'));
      console.log(`  Users:    ${state.sessions.users.length}`);
      console.log(`  Agents:   ${state.sessions.agents.length}`);
      console.log(`  Services: ${state.sessions.services.length}`);

      console.log();
    }
  } catch {
    console.log(pc.red('✗ Daemon is not running'));
  }
}

async function serverAdd(args: string[], ctx: CliContext): Promise<void> {
  const name = getArgValue(args, '--name');
  const address = getArgValue(args, '--address');

  if (!name || !address) {
    console.log(pc.red('Error: --name and --address are required'));
    return;
  }

  const cpuCores = parseInt(getArgValue(args, '--cpu-cores', '4'), 10);
  const memoryGb = parseInt(getArgValue(args, '--memory-gb', '8'), 10);
  const capabilities = getArgValue(args, '--capabilities', 'vite,esbuild').split(',');
  const labels = parseLabels(getArgValue(args, '--labels', ''));

  const port = getArgValue(args, '--port', '7890');

  try {
    const response = await fetch(`http://localhost:${port}/api/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type: 'worker',
        address,
        cpu_cores: cpuCores,
        memory_gb: memoryGb,
        capabilities: { bundlers: capabilities },
        labels,
      }),
    });

    const data = (await response.json()) as ApiResponse;

    if (data.success) {
      console.log(pc.green(`✓ Added server: ${name}`));
      console.log(`  Address: ${address}`);
      console.log(`  CPU:     ${cpuCores} cores`);
      console.log(`  Memory:  ${memoryGb} GB`);
    } else {
      console.log(pc.red(`✗ Failed to add server: ${data.error?.message}`));
    }
  } catch (error) {
    console.log(pc.red(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}

async function serverRemove(args: string[], ctx: CliContext): Promise<void> {
  const name = args[0];
  const force = args.includes('--force');

  if (!name) {
    console.log(pc.red('Error: server name is required'));
    return;
  }

  const port = getArgValue(args, '--port', '7890');

  try {
    // First get the resource ID by name
    const listResponse = await fetch(`http://localhost:${port}/api/resources`);
    const listData = (await listResponse.json()) as ApiResponse<ResourceItem[]>;

    const resource = listData.data?.find((r) => r.name === name);
    if (!resource) {
      console.log(pc.red(`✗ Server not found: ${name}`));
      return;
    }

    const response = await fetch(
      `http://localhost:${port}/api/resources/${resource.id}?force=${force}`,
      { method: 'DELETE' }
    );

    const data = (await response.json()) as ApiResponse;

    if (data.success) {
      console.log(pc.green(`✓ Removed server: ${name}`));
    } else {
      console.log(pc.red(`✗ Failed to remove server: ${data.error?.message}`));
    }
  } catch (error) {
    console.log(pc.red(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}

async function serverList(args: string[], ctx: CliContext): Promise<void> {
  const port = getArgValue(args, '--port', '7890');

  try {
    const response = await fetch(`http://localhost:${port}/api/resources`);
    const data = (await response.json()) as ApiResponse<ResourceItem[]>;

    if (data.success && data.data) {
      const resources = data.data;

      if (resources.length === 0) {
        console.log(pc.dim('No servers registered'));
        return;
      }

      console.log(pc.bold('\nRegistered Servers\n'));
      console.log('  ' + pc.dim('NAME'.padEnd(20) + 'ADDRESS'.padEnd(25) + 'STATUS'.padEnd(12) + 'CPU'.padEnd(8) + 'MEM'));
      console.log('  ' + pc.dim('-'.repeat(75)));

      for (const resource of resources) {
        const status = statusColor(resource.status);
        console.log(
          '  ' +
          resource.name.padEnd(20) +
          resource.address.padEnd(25) +
          status.padEnd(22) +
          `${resource.cpu_cores ?? 0}`.padEnd(8) +
          `${resource.memory_gb ?? 0} GB`
        );
      }
      console.log();
    }
  } catch {
    console.log(pc.red('✗ Daemon is not running'));
  }
}

async function serverDrain(args: string[], ctx: CliContext): Promise<void> {
  const name = args[0];
  if (!name) {
    console.log(pc.red('Error: server name is required'));
    return;
  }

  const port = getArgValue(args, '--port', '7890');

  try {
    const listResponse = await fetch(`http://localhost:${port}/api/resources`);
    const listData = (await listResponse.json()) as ApiResponse<ResourceItem[]>;
    const resource = listData.data?.find((r) => r.name === name);

    if (!resource) {
      console.log(pc.red(`✗ Server not found: ${name}`));
      return;
    }

    const response = await fetch(
      `http://localhost:${port}/api/resources/${resource.id}/drain`,
      { method: 'POST' }
    );

    const data = (await response.json()) as ApiResponse;

    if (data.success) {
      console.log(pc.yellow(`○ Server draining: ${name}`));
    } else {
      console.log(pc.red(`✗ Failed to drain: ${data.error?.message}`));
    }
  } catch (error) {
    console.log(pc.red(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}

async function serverResume(args: string[], ctx: CliContext): Promise<void> {
  const name = args[0];
  if (!name) {
    console.log(pc.red('Error: server name is required'));
    return;
  }

  const port = getArgValue(args, '--port', '7890');

  try {
    const listResponse = await fetch(`http://localhost:${port}/api/resources`);
    const listData = (await listResponse.json()) as ApiResponse<ResourceItem[]>;
    const resource = listData.data?.find((r) => r.name === name);

    if (!resource) {
      console.log(pc.red(`✗ Server not found: ${name}`));
      return;
    }

    const response = await fetch(
      `http://localhost:${port}/api/resources/${resource.id}/resume`,
      { method: 'POST' }
    );

    const data = (await response.json()) as ApiResponse;

    if (data.success) {
      console.log(pc.green(`✓ Server resumed: ${name}`));
    } else {
      console.log(pc.red(`✗ Failed to resume: ${data.error?.message}`));
    }
  } catch (error) {
    console.log(pc.red(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}

async function sessionList(args: string[], ctx: CliContext): Promise<void> {
  const port = getArgValue(args, '--port', '7890');

  try {
    const response = await fetch(`http://localhost:${port}/api/sessions`);
    const data = (await response.json()) as ApiResponse<ActiveSession[]>;

    if (data.success && data.data) {
      const sessions = data.data;

      if (sessions.length === 0) {
        console.log(pc.dim('No active sessions'));
        return;
      }

      console.log(pc.bold('\nActive Sessions\n'));

      for (const session of sessions) {
        const icon = session.actor_type === 'user' ? '👤' :
                     session.actor_type === 'agent' ? '🤖' : '⚙️';
        const activity = session.current_activity?.activity_type ?? 'idle';
        const duration = formatDuration(
          Date.now() - new Date(session.connected_at).getTime()
        );

        console.log(
          `  ${icon} ${session.actor.name.padEnd(20)} ` +
          pc.dim(`${session.connection_type.padEnd(6)}`) +
          `  ${activity.padEnd(12)}  ` +
          pc.dim(duration)
        );
      }
      console.log();
    }
  } catch {
    console.log(pc.red('✗ Daemon is not running'));
  }
}

async function buildCommand(args: string[], ctx: CliContext): Promise<void> {
  const targets = args.filter(a => !a.startsWith('--'));

  if (targets.length === 0) {
    console.log(pc.red('Error: at least one target is required'));
    return;
  }

  const port = getArgValue(args, '--port', '7890');

  console.log(pc.blue(`Building: ${targets.join(', ')}...`));

  try {
    const response = await fetch(`http://localhost:${port}/api/builds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targets,
        options: {
          incremental: !args.includes('--clean'),
          verbose: args.includes('--verbose'),
        },
      }),
    });

    const data = (await response.json()) as ApiResponse<BuildResult>;

    if (data.success && data.data) {
      const result = data.data;

      if (result.status === 'success') {
        console.log(pc.green(`\n✓ Build completed in ${(result.duration_ms / 1000).toFixed(1)}s`));
        console.log(`  Bundles: ${result.bundles_completed} completed`);
      } else {
        console.log(pc.red(`\n✗ Build failed`));
        console.log(`  Bundles: ${result.bundles_completed} completed, ${result.bundles_failed ?? 0} failed`);

        if (result.errors && result.errors.length > 0) {
          console.log(pc.red('\nErrors:'));
          for (const error of result.errors) {
            console.log(`  - ${error.message}`);
          }
        }
      }
    } else {
      console.log(pc.red(`✗ Build request failed: ${data.error?.message}`));
    }
  } catch (error) {
    console.log(pc.red(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}

async function dashboardCommand(args: string[], ctx: CliContext): Promise<void> {
  const port = getArgValue(args, '--port', '7890');

  console.log(pc.blue('Connecting to dashboard...'));
  console.log(pc.dim(`Press Ctrl+C to exit\n`));

  // Use EventSource for SSE
  const eventSource = new EventSource(`http://localhost:${port}/api/events`);

  eventSource.onmessage = (event) => {
    const state = JSON.parse(event.data);
    renderDashboard(state);
  };

  eventSource.onerror = () => {
    console.log(pc.red('\n✗ Connection lost'));
    eventSource.close();
    process.exit(1);
  };

  // Keep running until Ctrl+C
  await new Promise(() => {});
}

async function ledgerQuery(args: string[], ctx: CliContext): Promise<void> {
  const port = getArgValue(args, '--port', '7890');
  const entityType = getArgValue(args, '--entity-type');
  const limit = getArgValue(args, '--limit', '50');

  try {
    let url = `http://localhost:${port}/api/ledger/entries?limit=${limit}`;
    if (entityType) url += `&entity_type=${entityType}`;

    const response = await fetch(url);
    const data = (await response.json()) as ApiResponse<LedgerEntry[]>;

    if (data.success && data.data) {
      const entries = data.data;

      if (entries.length === 0) {
        console.log(pc.dim('No ledger entries found'));
        return;
      }

      console.log(pc.bold('\nLedger Entries\n'));

      for (const entry of entries) {
        const type = entry.entry_type === 'DEBIT' ? pc.red('DEBIT ') : pc.green('CREDIT');
        const time = new Date(entry.timestamp).toLocaleTimeString();

        console.log(
          `  ${type} ${pc.dim(time)} ` +
          `${entry.entity_type}:${entry.entity_id.slice(0, 8)}... ` +
          pc.dim(entry.reason.slice(0, 40))
        );
      }
      console.log();
    }
  } catch {
    console.log(pc.red('✗ Daemon is not running'));
  }
}

async function ledgerVerify(args: string[], ctx: CliContext): Promise<void> {
  const port = getArgValue(args, '--port', '7890');

  console.log(pc.blue('Verifying ledger integrity...'));

  try {
    const response = await fetch(`http://localhost:${port}/api/ledger/verify`, {
      method: 'POST',
    });

    const data = (await response.json()) as ApiResponse<LedgerVerifyReport>;

    if (data.success && data.data) {
      const report = data.data;

      if (report.verified) {
        console.log(pc.green(`\n✓ Ledger integrity verified`));
        console.log(`  Entries checked: ${report.entries_checked}`);
      } else {
        console.log(pc.red(`\n✗ Ledger integrity check failed`));
        console.log(`  Errors found: ${report.errors.length}`);

        for (const error of report.errors) {
          console.log(pc.red(`  - ${error.type} at sequence ${error.sequence}`));
        }
      }
    }
  } catch {
    console.log(pc.red('✗ Daemon is not running'));
  }
}

async function ledgerStats(args: string[], ctx: CliContext): Promise<void> {
  const port = getArgValue(args, '--port', '7890');

  try {
    const response = await fetch(`http://localhost:${port}/api/ledger/stats`);
    const data = (await response.json()) as ApiResponse<LedgerStats>;

    if (data.success && data.data) {
      const stats = data.data;

      console.log(pc.bold('\nLedger Statistics\n'));
      console.log(`  Total Entries:      ${stats.total_entries}`);
      console.log(`  Total Transactions: ${stats.total_transactions}`);

      if (stats.oldest_entry && stats.newest_entry) {
        console.log(`  Date Range:         ${new Date(stats.oldest_entry).toLocaleDateString()} - ${new Date(stats.newest_entry).toLocaleDateString()}`);
      }

      console.log(pc.bold('\nBy Entity Type:'));
      for (const [type, count] of Object.entries(stats.entries_by_type)) {
        console.log(`  ${type.padEnd(20)} ${count}`);
      }

      console.log();
    }
  } catch {
    console.log(pc.red('✗ Daemon is not running'));
  }
}

async function helpCommand(args: string[], ctx: CliContext): Promise<void> {
  console.log(`
${pc.bold('BuildNet CLI')}

${pc.bold('Usage:')}
  buildnet <command> [options]

${pc.bold('Daemon Commands:')}
  daemon start [--config path] [--port number]  Start the daemon
  daemon stop                                   Stop the daemon
  daemon status                                 Show daemon status

${pc.bold('Server Commands:')}
  server add --name <name> --address <addr>    Add a build server
    --cpu-cores <n>                            CPU cores
    --memory-gb <n>                            Memory in GB
    --capabilities <list>                      Comma-separated bundlers
    --labels <key=val,...>                     Labels
  server remove <name> [--force]               Remove a server
  server list                                  List all servers
  server drain <name>                          Drain a server
  server resume <name>                         Resume a drained server

${pc.bold('Session Commands:')}
  session list                                 List active sessions

${pc.bold('Build Commands:')}
  build <targets...> [--clean] [--verbose]     Request a build

${pc.bold('Dashboard Commands:')}
  dashboard                                    Interactive dashboard

${pc.bold('Ledger Commands:')}
  ledger query [--entity-type <type>]          Query ledger entries
  ledger verify                                Verify ledger integrity
  ledger stats                                 Show ledger statistics

${pc.bold('Options:')}
  --port <number>                              API port (default: 7890)
  --config <path>                              Config file path
  --help                                       Show help
`);
}

// ============================================================================
// Helper Functions
// ============================================================================

function getArgValue(args: string[], flag: string, defaultValue?: string): string {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith('--')) {
    return args[index + 1];
  }
  return defaultValue ?? '';
}

function parseLabels(str: string): Record<string, string> {
  const labels: Record<string, string> = {};
  if (!str) return labels;

  for (const pair of str.split(',')) {
    const [key, value] = pair.split('=');
    if (key && value) {
      labels[key.trim()] = value.trim();
    }
  }

  return labels;
}

function statusColor(status: string): string {
  switch (status) {
    case 'healthy':
    case 'online':
      return pc.green(status);
    case 'degraded':
    case 'draining':
      return pc.yellow(status);
    case 'critical':
    case 'offline':
    case 'unhealthy':
      return pc.red(status);
    default:
      return pc.dim(status);
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function renderDashboard(state: any): void {
  // Clear screen and move cursor to top
  process.stdout.write('\x1B[2J\x1B[H');

  console.log(pc.bold('═'.repeat(70)));
  console.log(pc.bold(`  BUILDNET CLUSTER: ${state.cluster.name}`.padEnd(50) + `Status: ${statusColor(state.cluster.status)}`));
  console.log(pc.bold('═'.repeat(70)));
  console.log();

  // Resources and builds side by side
  console.log(`  ${pc.bold('RESOURCES')}                      │  ${pc.bold('BUILDS')}`);
  console.log('  ─────────────────────────────────│────────────────────────────');
  console.log(`  Workers: ${state.resources.active_workers}/${state.resources.total_workers} active            │  Queued:      ${state.builds.queued}`);
  console.log(`  CPU:     ${state.resources.used_cpu_cores}/${state.resources.total_cpu_cores} cores             │  In Progress: ${state.builds.in_progress}`);
  console.log(`  Memory:  ${state.resources.used_memory_gb}/${state.resources.total_memory_gb} GB               │  Completed:   ${state.builds.completed_last_hour} (last hour)`);
  console.log(`                                   │  Failed:      ${state.builds.failed_last_hour} (last hour)`);
  console.log();

  // Sessions
  console.log(pc.bold('  ACTIVE SESSIONS'));
  console.log('  ─────────────────────────────────────────────────────────────────');

  const allSessions = [
    ...state.sessions.users.map((s: any) => ({ ...s, icon: '👤' })),
    ...state.sessions.agents.map((s: any) => ({ ...s, icon: '🤖' })),
    ...state.sessions.services.map((s: any) => ({ ...s, icon: '⚙️' })),
  ];

  if (allSessions.length === 0) {
    console.log(pc.dim('  No active sessions'));
  } else {
    for (const session of allSessions.slice(0, 5)) {
      console.log(`  ${session.icon} ${session.actor_name.padEnd(20)} ${(session.current_activity || 'idle').padEnd(15)}`);
    }
  }

  console.log();

  // Recent events
  console.log(pc.bold('  RECENT EVENTS'));
  console.log('  ─────────────────────────────────────────────────────────────────');

  if (state.events.recent.length === 0) {
    console.log(pc.dim('  No recent events'));
  } else {
    for (const event of state.events.recent.slice(0, 5)) {
      const icon = event.severity === 'error' ? '✗' :
                   event.severity === 'warn' ? '⚠' : '✓';
      const time = new Date(event.timestamp).toLocaleTimeString();
      console.log(`  ${pc.dim(time)} ${statusColor(event.severity === 'error' ? 'critical' : event.severity)} ${event.message.slice(0, 50)}`);
    }
  }

  console.log();
  console.log(pc.dim('  [q] Quit  [b] Builds  [w] Workers  [s] Sessions  [l] Logs  [?] Help'));
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse command
  let command = args[0] ?? 'help';
  let subcommand = args[1];
  let commandArgs = args.slice(1);

  // Handle compound commands
  if (subcommand && !subcommand.startsWith('-')) {
    command = `${command}:${subcommand}`;
    commandArgs = args.slice(2);
  }

  // Handle --help
  if (args.includes('--help') || args.includes('-h')) {
    command = 'help';
  }

  // Load config
  const configPath = getArgValue(args, '--config', './build-daemon.yaml');
  let config: MasterDaemonConfig;

  if (existsSync(configPath)) {
    const configContent = await readFile(configPath, 'utf-8');
    const parsed = parseYaml(configContent);
    config = getDefaultDaemonConfig(parsed.master ?? parsed);
  } else {
    config = getDefaultDaemonConfig();
  }

  // Create state backend
  const state = await createStateBackend({
    backend: 'memory',
    memory: { max_entries: 100000 },
  });

  const ctx: CliContext = {
    config,
    state,
    rootDir: process.cwd(),
  };

  // Run command
  const handler = commands[command];
  if (handler) {
    await handler(commandArgs, ctx);
  } else {
    console.log(pc.red(`Unknown command: ${command}`));
    console.log(`Run 'buildnet help' for usage`);
    process.exit(1);
  }
}

// Run CLI
main().catch(error => {
  console.error(pc.red(`Error: ${error.message}`));
  process.exit(1);
});
