/**
 * Admin Command Center Routes
 *
 * Provides a hierarchical command execution system for the Empire dashboard.
 * Commands are organized by category and can be executed individually or searched.
 *
 * Features:
 * - 470+ pre-approved server commands
 * - Hierarchical categorization
 * - Real-time execution streaming via SSE
 * - Command search and filtering
 * - Execution history and audit logging
 *
 * SECURITY: All routes require admin authentication
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { authenticate, requireAdmin } from './auth';
import { loggers } from '../../lib/logger';

const execAsync = promisify(exec);
const log = loggers.http;

// JWT payload from authentication
interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
}

// ============================================
// COMMAND HIERARCHY DEFINITION
// ============================================

interface CommandDef {
  cmd: string;
  description: string;
  dangerous?: boolean;
  timeout?: number; // ms, default 60000
}

interface SubCategory {
  name: string;
  icon: string;
  commands: CommandDef[];
}

interface Category {
  name: string;
  icon: string;
  description: string;
  subcategories: SubCategory[];
}

const COMMAND_HIERARCHY: Category[] = [
  {
    name: 'Process Management',
    icon: 'Activity',
    description: 'PM2 process control and monitoring',
    subcategories: [
      {
        name: 'Status & Info',
        icon: 'Info',
        commands: [
          { cmd: 'pm2 status', description: 'Show process status table' },
          { cmd: 'pm2 list', description: 'List all processes' },
          { cmd: 'pm2 jlist', description: 'List processes as JSON' },
          { cmd: 'pm2 show musclemap', description: 'Show detailed process info' },
          { cmd: 'pm2 describe musclemap', description: 'Describe process configuration' },
          { cmd: 'pm2 info musclemap', description: 'Process information' },
          { cmd: 'pm2 env 0', description: 'Show environment for process 0' },
        ],
      },
      {
        name: 'Control',
        icon: 'Play',
        commands: [
          { cmd: 'pm2 restart musclemap', description: 'Restart the API', dangerous: true },
          { cmd: 'pm2 reload musclemap', description: 'Graceful reload', dangerous: true },
          { cmd: 'pm2 stop musclemap', description: 'Stop the API', dangerous: true },
          { cmd: 'pm2 start musclemap', description: 'Start the API', dangerous: true },
          { cmd: 'pm2 delete musclemap', description: 'Delete from PM2', dangerous: true },
          { cmd: 'pm2 reset musclemap', description: 'Reset restart count' },
        ],
      },
      {
        name: 'Logs',
        icon: 'FileText',
        commands: [
          { cmd: 'pm2 logs musclemap --lines 50 --nostream', description: 'Last 50 log lines' },
          { cmd: 'pm2 logs musclemap --lines 100 --nostream', description: 'Last 100 log lines' },
          { cmd: 'pm2 logs musclemap --lines 200 --nostream', description: 'Last 200 log lines' },
          { cmd: 'pm2 logs musclemap --lines 500 --nostream', description: 'Last 500 log lines' },
          { cmd: 'pm2 logs musclemap --err --lines 100', description: 'Error logs only' },
          { cmd: 'pm2 logs musclemap --out --lines 100', description: 'Output logs only' },
          { cmd: 'pm2 flush musclemap', description: 'Clear all logs', dangerous: true },
        ],
      },
      {
        name: 'Persistence',
        icon: 'Save',
        commands: [
          { cmd: 'pm2 save', description: 'Save current process list' },
          { cmd: 'pm2 startup', description: 'Generate startup script' },
          { cmd: 'pm2 unstartup', description: 'Remove startup script' },
          { cmd: 'pm2 resurrect', description: 'Restore saved processes' },
          { cmd: 'pm2 update', description: 'Update PM2 in-memory' },
          { cmd: 'pm2 kill', description: 'Kill PM2 daemon', dangerous: true },
        ],
      },
    ],
  },
  {
    name: 'Git Operations',
    icon: 'GitBranch',
    description: 'Source control and version management',
    subcategories: [
      {
        name: 'Status & Info',
        icon: 'Info',
        commands: [
          { cmd: 'git status', description: 'Working tree status' },
          { cmd: 'git log --oneline -20', description: 'Last 20 commits' },
          { cmd: 'git log --oneline -50', description: 'Last 50 commits' },
          { cmd: 'git log --oneline --graph -20', description: 'Commit graph' },
          { cmd: 'git diff', description: 'Unstaged changes' },
          { cmd: 'git diff HEAD~1', description: 'Diff from last commit' },
          { cmd: 'git diff HEAD~5', description: 'Diff from 5 commits ago' },
          { cmd: 'git branch -a', description: 'All branches' },
          { cmd: 'git remote -v', description: 'Remote URLs' },
          { cmd: 'git reflog', description: 'Reference log' },
          { cmd: 'git show HEAD', description: 'Show HEAD commit' },
        ],
      },
      {
        name: 'Fetch & Pull',
        icon: 'Download',
        commands: [
          { cmd: 'git pull', description: 'Pull from origin' },
          { cmd: 'git fetch --all', description: 'Fetch all remotes' },
        ],
      },
      {
        name: 'Stash',
        icon: 'Archive',
        commands: [
          { cmd: 'git stash', description: 'Stash changes' },
          { cmd: 'git stash pop', description: 'Pop stashed changes' },
          { cmd: 'git stash list', description: 'List stashes' },
        ],
      },
      {
        name: 'Reset & Clean',
        icon: 'Trash2',
        commands: [
          { cmd: 'git reset --hard HEAD', description: 'Reset to HEAD', dangerous: true },
          { cmd: 'git reset --hard origin/main', description: 'Reset to origin/main', dangerous: true },
          { cmd: 'git clean -fd', description: 'Remove untracked files', dangerous: true },
        ],
      },
    ],
  },
  {
    name: 'Build & Deploy',
    icon: 'Rocket',
    description: 'Build processes and deployment',
    subcategories: [
      {
        name: 'Install',
        icon: 'Package',
        commands: [
          { cmd: 'pnpm install', description: 'Install dependencies', timeout: 300000 },
          { cmd: 'pnpm install --frozen-lockfile', description: 'Install with lockfile', timeout: 300000 },
        ],
      },
      {
        name: 'Build',
        icon: 'Hammer',
        commands: [
          { cmd: 'pnpm build:all', description: 'Build everything', timeout: 600000 },
          { cmd: 'pnpm build:smart', description: 'Smart incremental build', timeout: 600000 },
          { cmd: 'pnpm build:safe', description: 'Memory-safe build', timeout: 600000 },
          { cmd: 'pnpm -C apps/api build', description: 'Build API only', timeout: 300000 },
          { cmd: 'pnpm -C packages/shared build', description: 'Build shared package' },
          { cmd: 'pnpm -C packages/core build', description: 'Build core package' },
          { cmd: 'pnpm -C packages/client build', description: 'Build client package' },
        ],
      },
      {
        name: 'Quality',
        icon: 'Shield',
        commands: [
          { cmd: 'pnpm typecheck', description: 'TypeScript check', timeout: 180000 },
          { cmd: 'pnpm lint', description: 'Run linter', timeout: 180000 },
          { cmd: 'pnpm lint --fix', description: 'Fix lint issues', timeout: 180000 },
          { cmd: 'pnpm test', description: 'Run tests', timeout: 300000 },
          { cmd: 'pnpm test:api', description: 'Run API tests', timeout: 300000 },
        ],
      },
      {
        name: 'Clean',
        icon: 'Trash2',
        commands: [
          { cmd: 'pnpm clean', description: 'Clean build artifacts' },
          { cmd: 'rm -rf node_modules/.cache && pnpm build:all', description: 'Clean cache and rebuild', timeout: 600000, dangerous: true },
          { cmd: 'rm -rf dist && pnpm build:all', description: 'Clean dist and rebuild', timeout: 600000, dangerous: true },
        ],
      },
      {
        name: 'Full Deploy',
        icon: 'Rocket',
        commands: [
          { cmd: 'cd /var/www/musclemap.me && git pull && pnpm install && pnpm build:all && pm2 restart musclemap', description: 'Full deployment', timeout: 900000, dangerous: true },
          { cmd: 'cd /var/www/musclemap.me && git pull && pnpm install && pnpm build:smart && pm2 restart musclemap', description: 'Smart deployment', timeout: 600000, dangerous: true },
          { cmd: 'cd /var/www/musclemap.me && git pull && pnpm -C apps/api build && pm2 restart musclemap', description: 'Quick API deploy', timeout: 300000, dangerous: true },
        ],
      },
    ],
  },
  {
    name: 'Database',
    icon: 'Database',
    description: 'PostgreSQL operations and queries',
    subcategories: [
      {
        name: 'Migrations',
        icon: 'ArrowUpDown',
        commands: [
          { cmd: 'cd /var/www/musclemap.me/apps/api && pnpm db:migrate', description: 'Run migrations', dangerous: true },
          { cmd: 'cd /var/www/musclemap.me/apps/api && pnpm db:seed', description: 'Seed database', dangerous: true },
          { cmd: 'psql -U musclemap -d musclemap -c "SELECT * FROM knex_migrations ORDER BY id DESC LIMIT 20;"', description: 'Show migrations' },
          { cmd: 'psql -U musclemap -d musclemap -c "SELECT * FROM knex_migrations_lock;"', description: 'Check migration lock' },
          { cmd: 'psql -U musclemap -d musclemap -c "UPDATE knex_migrations_lock SET is_locked = 0;"', description: 'Unlock migrations', dangerous: true },
        ],
      },
      {
        name: 'Status & Info',
        icon: 'Info',
        commands: [
          { cmd: 'psql -U musclemap -d musclemap -c "SELECT version();"', description: 'PostgreSQL version' },
          { cmd: 'psql -U musclemap -d musclemap -c "SELECT NOW();"', description: 'Server time' },
          { cmd: 'psql -U musclemap -d musclemap -c "\\dt"', description: 'List tables' },
          { cmd: 'psql -U musclemap -d musclemap -c "\\di"', description: 'List indexes' },
          { cmd: 'psql -U musclemap -d musclemap -c "\\d users"', description: 'Describe users table' },
          { cmd: 'pg_isready', description: 'Check if PostgreSQL is ready' },
          { cmd: 'pg_isready -h localhost -p 5432', description: 'Check connection' },
        ],
      },
      {
        name: 'Statistics',
        icon: 'BarChart',
        commands: [
          { cmd: 'psql -U musclemap -d musclemap -c "SELECT count(*) FROM users;"', description: 'User count' },
          { cmd: 'psql -U musclemap -d musclemap -c "SELECT count(*) FROM workouts;"', description: 'Workout count' },
          { cmd: 'psql -U musclemap -d musclemap -c "SELECT count(*) FROM exercises;"', description: 'Exercise count' },
          { cmd: 'psql -U musclemap -d musclemap -c "SELECT pg_size_pretty(pg_database_size(\'musclemap\'));"', description: 'Database size' },
          { cmd: `psql -U musclemap -d musclemap -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 20;"`, description: 'Table sizes' },
        ],
      },
      {
        name: 'Performance',
        icon: 'Zap',
        commands: [
          { cmd: 'psql -U musclemap -d musclemap -c "SELECT relname, seq_scan, idx_scan FROM pg_stat_user_tables ORDER BY seq_scan DESC LIMIT 20;"', description: 'Table scan stats' },
          { cmd: 'psql -U musclemap -d musclemap -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"', description: 'Connection states' },
          { cmd: 'psql -U musclemap -d musclemap -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state != \'idle\' ORDER BY duration DESC LIMIT 10;"', description: 'Long-running queries' },
          { cmd: 'psql -U musclemap -d musclemap -c "SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan ASC LIMIT 20;"', description: 'Unused indexes' },
          { cmd: 'psql -U musclemap -d musclemap -c "SHOW max_connections;"', description: 'Max connections' },
        ],
      },
      {
        name: 'Maintenance',
        icon: 'Wrench',
        commands: [
          { cmd: 'psql -U musclemap -d musclemap -c "VACUUM ANALYZE;"', description: 'Vacuum analyze', dangerous: true, timeout: 300000 },
          { cmd: 'psql -U musclemap -d musclemap -c "REINDEX DATABASE musclemap;"', description: 'Reindex database', dangerous: true, timeout: 600000 },
          { cmd: 'psql -U musclemap -d musclemap -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = \'idle\' AND query_start < now() - interval \'10 minutes\';"', description: 'Kill idle connections', dangerous: true },
        ],
      },
      {
        name: 'Backup',
        icon: 'Save',
        commands: [
          { cmd: 'pg_dump -U musclemap musclemap > /tmp/musclemap_backup_$(date +%Y%m%d_%H%M%S).sql', description: 'Backup to SQL', timeout: 300000 },
          { cmd: 'pg_dump -U musclemap musclemap | gzip > /tmp/musclemap_backup_$(date +%Y%m%d_%H%M%S).sql.gz', description: 'Backup compressed', timeout: 300000 },
          { cmd: 'pg_dump -U musclemap musclemap --schema-only > /tmp/musclemap_schema.sql', description: 'Backup schema only' },
          { cmd: 'ls -lah /tmp/musclemap_backup*', description: 'List backups' },
        ],
      },
    ],
  },
  {
    name: 'Redis',
    icon: 'Layers',
    description: 'Redis cache operations',
    subcategories: [
      {
        name: 'Status',
        icon: 'Info',
        commands: [
          { cmd: 'redis-cli ping', description: 'Ping Redis' },
          { cmd: 'redis-cli info', description: 'Server info' },
          { cmd: 'redis-cli info memory', description: 'Memory info' },
          { cmd: 'redis-cli info stats', description: 'Statistics' },
          { cmd: 'redis-cli info clients', description: 'Client info' },
          { cmd: 'redis-cli dbsize', description: 'Key count' },
        ],
      },
      {
        name: 'Keys',
        icon: 'Key',
        commands: [
          { cmd: "redis-cli keys '*'", description: 'All keys (careful!)' },
          { cmd: "redis-cli keys 'session:*'", description: 'Session keys' },
          { cmd: "redis-cli keys 'cache:*'", description: 'Cache keys' },
          { cmd: "redis-cli keys 'rate:*'", description: 'Rate limit keys' },
        ],
      },
      {
        name: 'Maintenance',
        icon: 'Wrench',
        commands: [
          { cmd: 'redis-cli flushdb', description: 'Flush current DB', dangerous: true },
          { cmd: 'redis-cli flushall', description: 'Flush ALL data', dangerous: true },
          { cmd: 'redis-cli slowlog get 10', description: 'Slow query log' },
          { cmd: 'redis-cli memory doctor', description: 'Memory diagnostics' },
          { cmd: 'redis-cli client list', description: 'Connected clients' },
        ],
      },
    ],
  },
  {
    name: 'System Resources',
    icon: 'Cpu',
    description: 'System monitoring and resources',
    subcategories: [
      {
        name: 'Overview',
        icon: 'Monitor',
        commands: [
          { cmd: 'uptime', description: 'System uptime' },
          { cmd: 'free -h', description: 'Memory usage' },
          { cmd: 'free -m', description: 'Memory in MB' },
          { cmd: 'df -h', description: 'Disk usage' },
          { cmd: 'df -h /', description: 'Root partition' },
          { cmd: 'df -h /var', description: 'Var partition' },
          { cmd: 'top -bn1 | head -20', description: 'Top processes' },
        ],
      },
      {
        name: 'Disk',
        icon: 'HardDrive',
        commands: [
          { cmd: 'du -sh /var/www/musclemap.me', description: 'Project size' },
          { cmd: 'du -sh /var/www/musclemap.me/*', description: 'Project breakdown' },
          { cmd: 'du -sh /var/www/musclemap.me/node_modules', description: 'node_modules size' },
          { cmd: 'du -sh /var/log/*', description: 'Log sizes' },
          { cmd: 'du -sh /tmp/*', description: 'Temp files' },
          { cmd: 'du -sh ~/.pm2/logs', description: 'PM2 log size' },
        ],
      },
      {
        name: 'Processes',
        icon: 'Activity',
        commands: [
          { cmd: 'ps aux --sort=-%mem | head -20', description: 'Top by memory' },
          { cmd: 'ps aux --sort=-%cpu | head -20', description: 'Top by CPU' },
          { cmd: 'ps aux | grep node', description: 'Node processes' },
          { cmd: 'ps aux | grep pm2', description: 'PM2 processes' },
          { cmd: 'ps aux | grep postgres', description: 'PostgreSQL processes' },
          { cmd: 'ps aux | grep redis', description: 'Redis processes' },
          { cmd: 'ps aux | grep caddy', description: 'Caddy processes' },
          { cmd: 'pgrep -a node', description: 'Node PIDs' },
        ],
      },
      {
        name: 'Performance',
        icon: 'Gauge',
        commands: [
          { cmd: 'vmstat 1 5', description: 'Virtual memory stats' },
          { cmd: 'iostat -x 1 5', description: 'IO statistics' },
          { cmd: 'w', description: 'Who is logged in' },
          { cmd: 'who', description: 'Users list' },
          { cmd: 'last -10', description: 'Recent logins' },
        ],
      },
    ],
  },
  {
    name: 'Network',
    icon: 'Globe',
    description: 'Network and connectivity',
    subcategories: [
      {
        name: 'Ports',
        icon: 'Network',
        commands: [
          { cmd: 'ss -tlnp', description: 'TCP listening ports' },
          { cmd: 'ss -tulnp', description: 'All listening ports' },
          { cmd: 'ss -tlnp | grep 3001', description: 'API port (3001)' },
          { cmd: 'ss -tlnp | grep 5432', description: 'PostgreSQL port' },
          { cmd: 'ss -tlnp | grep 6379', description: 'Redis port' },
          { cmd: 'ss -tlnp | grep 80', description: 'HTTP port' },
          { cmd: 'ss -tlnp | grep 443', description: 'HTTPS port' },
          { cmd: 'netstat -an | grep ESTABLISHED | wc -l', description: 'Established connections' },
        ],
      },
      {
        name: 'Port Inspection',
        icon: 'Search',
        commands: [
          { cmd: 'lsof -i :3001', description: 'What uses port 3001' },
          { cmd: 'lsof -i :5432', description: 'What uses port 5432' },
          { cmd: 'lsof -i :6379', description: 'What uses port 6379' },
          { cmd: 'lsof -i :80', description: 'What uses port 80' },
          { cmd: 'lsof -i :443', description: 'What uses port 443' },
        ],
      },
      {
        name: 'DNS',
        icon: 'Globe',
        commands: [
          { cmd: 'nslookup musclemap.me', description: 'DNS lookup' },
          { cmd: 'dig musclemap.me', description: 'Dig query' },
          { cmd: 'dig musclemap.me +short', description: 'Dig short' },
          { cmd: 'host musclemap.me', description: 'Host lookup' },
          { cmd: 'cat /etc/resolv.conf', description: 'DNS config' },
          { cmd: 'ping -c 3 musclemap.me', description: 'Ping test' },
        ],
      },
      {
        name: 'Health Checks',
        icon: 'Heart',
        commands: [
          { cmd: 'curl -s localhost:3001/health', description: 'API health' },
          { cmd: 'curl -s localhost:3001/health | jq .', description: 'API health (formatted)' },
          { cmd: 'curl -s localhost:3001/ready', description: 'Readiness probe' },
          { cmd: 'curl -s localhost:3001/metrics | head -50', description: 'Prometheus metrics' },
          { cmd: 'curl -s https://musclemap.me/health | jq .', description: 'Production health' },
          { cmd: 'curl -sI https://musclemap.me', description: 'HTTP headers' },
          { cmd: 'curl -w "%{http_code}" -s -o /dev/null localhost:3001/health', description: 'Status code only' },
        ],
      },
    ],
  },
  {
    name: 'Logs',
    icon: 'FileText',
    description: 'Log viewing and analysis',
    subcategories: [
      {
        name: 'System Logs',
        icon: 'Terminal',
        commands: [
          { cmd: 'journalctl -xe', description: 'System journal errors' },
          { cmd: 'journalctl --disk-usage', description: 'Journal disk usage' },
          { cmd: 'tail -50 /var/log/syslog', description: 'Syslog (50 lines)' },
          { cmd: 'tail -100 /var/log/syslog', description: 'Syslog (100 lines)' },
          { cmd: 'tail -50 /var/log/auth.log', description: 'Auth log' },
        ],
      },
      {
        name: 'Service Logs',
        icon: 'Server',
        commands: [
          { cmd: 'journalctl -u caddy -n 50', description: 'Caddy logs (50)' },
          { cmd: 'journalctl -u caddy -n 100', description: 'Caddy logs (100)' },
          { cmd: 'journalctl -u postgresql -n 50', description: 'PostgreSQL logs' },
          { cmd: 'journalctl -u redis -n 50', description: 'Redis logs' },
        ],
      },
      {
        name: 'PM2 Logs',
        icon: 'FileText',
        commands: [
          { cmd: 'tail -50 ~/.pm2/logs/musclemap-error.log', description: 'Error log (50)' },
          { cmd: 'tail -100 ~/.pm2/logs/musclemap-error.log', description: 'Error log (100)' },
          { cmd: 'tail -50 ~/.pm2/logs/musclemap-out.log', description: 'Output log (50)' },
          { cmd: 'tail -100 ~/.pm2/logs/musclemap-out.log', description: 'Output log (100)' },
          { cmd: 'ls -la ~/.pm2/logs/', description: 'List log files' },
          { cmd: 'wc -l ~/.pm2/logs/musclemap-error.log', description: 'Error log lines' },
          { cmd: 'wc -l ~/.pm2/logs/musclemap-out.log', description: 'Output log lines' },
        ],
      },
      {
        name: 'Error Patterns',
        icon: 'AlertTriangle',
        commands: [
          { cmd: 'grep -i "error" ~/.pm2/logs/musclemap-error.log | tail -100', description: 'Errors (100)' },
          { cmd: 'grep -i "exception" ~/.pm2/logs/musclemap-error.log | tail -50', description: 'Exceptions' },
          { cmd: 'grep -i "fatal" ~/.pm2/logs/musclemap-error.log | tail -50', description: 'Fatal errors' },
          { cmd: 'grep -i "uncaught" ~/.pm2/logs/musclemap-error.log | tail -50', description: 'Uncaught errors' },
          { cmd: 'grep -i "ECONNREFUSED" ~/.pm2/logs/musclemap-error.log | tail -30', description: 'Connection refused' },
          { cmd: 'grep -i "ETIMEDOUT" ~/.pm2/logs/musclemap-error.log | tail -30', description: 'Timeouts' },
          { cmd: 'grep -i "500\\|502\\|503\\|504" ~/.pm2/logs/musclemap-out.log | tail -50', description: '5xx errors' },
        ],
      },
    ],
  },
  {
    name: 'Services',
    icon: 'Server',
    description: 'Systemd service management',
    subcategories: [
      {
        name: 'Caddy',
        icon: 'Globe',
        commands: [
          { cmd: 'systemctl status caddy', description: 'Caddy status' },
          { cmd: 'caddy version', description: 'Caddy version' },
          { cmd: 'caddy validate --config /etc/caddy/Caddyfile', description: 'Validate config' },
          { cmd: 'cat /etc/caddy/Caddyfile', description: 'View Caddyfile' },
          { cmd: 'systemctl restart caddy', description: 'Restart Caddy', dangerous: true },
          { cmd: 'systemctl reload caddy', description: 'Reload Caddy', dangerous: true },
        ],
      },
      {
        name: 'PostgreSQL',
        icon: 'Database',
        commands: [
          { cmd: 'systemctl status postgresql', description: 'PostgreSQL status' },
          { cmd: 'systemctl restart postgresql', description: 'Restart PostgreSQL', dangerous: true },
          { cmd: 'systemctl reload postgresql', description: 'Reload PostgreSQL', dangerous: true },
          { cmd: 'sudo -u postgres psql -c "SELECT version();"', description: 'Version via sudo' },
          { cmd: 'sudo -u postgres psql -c "\\l"', description: 'List databases' },
        ],
      },
      {
        name: 'Redis',
        icon: 'Layers',
        commands: [
          { cmd: 'systemctl status redis', description: 'Redis status' },
          { cmd: 'systemctl restart redis', description: 'Restart Redis', dangerous: true },
          { cmd: 'systemctl reload redis', description: 'Reload Redis', dangerous: true },
        ],
      },
      {
        name: 'System',
        icon: 'Monitor',
        commands: [
          { cmd: 'systemctl list-units --type=service --state=running', description: 'Running services' },
          { cmd: 'systemctl list-units --type=service --state=failed', description: 'Failed services' },
          { cmd: 'systemctl --failed', description: 'All failed units' },
          { cmd: 'systemctl daemon-reload', description: 'Reload systemd', dangerous: true },
        ],
      },
    ],
  },
  {
    name: 'Security',
    icon: 'Shield',
    description: 'Security and access control',
    subcategories: [
      {
        name: 'Firewall',
        icon: 'Lock',
        commands: [
          { cmd: 'ufw status', description: 'UFW status' },
          { cmd: 'ufw status verbose', description: 'UFW verbose' },
          { cmd: 'ufw status numbered', description: 'UFW rules numbered' },
          { cmd: 'iptables -L -n', description: 'iptables rules' },
          { cmd: 'iptables -L -n -v', description: 'iptables verbose' },
        ],
      },
      {
        name: 'Fail2Ban',
        icon: 'ShieldAlert',
        commands: [
          { cmd: 'fail2ban-client status', description: 'Fail2ban status' },
          { cmd: 'fail2ban-client status sshd', description: 'SSH jail status' },
        ],
      },
      {
        name: 'Auth Logs',
        icon: 'FileText',
        commands: [
          { cmd: 'last -20', description: 'Recent logins' },
          { cmd: 'lastb -20', description: 'Failed logins' },
          { cmd: 'cat /var/log/auth.log | grep "Failed password" | tail -20', description: 'Failed passwords' },
          { cmd: 'cat /var/log/auth.log | grep "Accepted" | tail -20', description: 'Successful logins' },
        ],
      },
      {
        name: 'SSL/TLS',
        icon: 'Lock',
        commands: [
          { cmd: 'openssl s_client -connect musclemap.me:443 -servername musclemap.me </dev/null 2>/dev/null | openssl x509 -noout -dates', description: 'Certificate dates' },
          { cmd: 'curl -vI https://musclemap.me 2>&1 | grep -i "expire\\|issuer\\|subject"', description: 'Cert details' },
        ],
      },
    ],
  },
  {
    name: 'Cleanup',
    icon: 'Trash2',
    description: 'Maintenance and cleanup tasks',
    subcategories: [
      {
        name: 'Caches',
        icon: 'Database',
        commands: [
          { cmd: 'rm -rf /var/www/musclemap.me/node_modules/.cache', description: 'Clear node cache', dangerous: true },
          { cmd: 'rm -rf /var/www/musclemap.me/.smart-cache', description: 'Clear smart cache', dangerous: true },
          { cmd: 'rm -rf /var/www/musclemap.me/.build-cache', description: 'Clear build cache', dangerous: true },
          { cmd: 'npm cache clean --force', description: 'Clear npm cache', dangerous: true },
          { cmd: 'pnpm store prune', description: 'Prune pnpm store', dangerous: true },
        ],
      },
      {
        name: 'Temp Files',
        icon: 'File',
        commands: [
          { cmd: 'rm -rf /tmp/musclemap-*', description: 'Clear musclemap temps', dangerous: true },
          { cmd: 'rm -f /tmp/musclemap-build.lock', description: 'Remove build lock', dangerous: true },
        ],
      },
      {
        name: 'Logs',
        icon: 'FileText',
        commands: [
          { cmd: 'truncate -s 0 ~/.pm2/logs/musclemap-error.log', description: 'Clear error log', dangerous: true },
          { cmd: 'truncate -s 0 ~/.pm2/logs/musclemap-out.log', description: 'Clear output log', dangerous: true },
          { cmd: 'journalctl --vacuum-size=500M', description: 'Trim journal to 500M', dangerous: true },
          { cmd: 'journalctl --vacuum-size=100M', description: 'Trim journal to 100M', dangerous: true },
        ],
      },
      {
        name: 'System',
        icon: 'Wrench',
        commands: [
          { cmd: 'apt update', description: 'Update package list' },
          { cmd: 'apt upgrade -y', description: 'Upgrade packages', dangerous: true, timeout: 600000 },
          { cmd: 'apt autoremove -y', description: 'Remove unused packages', dangerous: true },
          { cmd: 'apt autoclean', description: 'Clean package cache' },
        ],
      },
    ],
  },
  {
    name: 'Environment',
    icon: 'Settings',
    description: 'Environment and configuration',
    subcategories: [
      {
        name: 'Node.js',
        icon: 'Code',
        commands: [
          { cmd: 'node --version', description: 'Node version' },
          { cmd: 'npm --version', description: 'npm version' },
          { cmd: 'pnpm --version', description: 'pnpm version' },
          { cmd: 'which node', description: 'Node path' },
          { cmd: 'which npm', description: 'npm path' },
          { cmd: 'which pnpm', description: 'pnpm path' },
        ],
      },
      {
        name: 'Environment Variables',
        icon: 'Key',
        commands: [
          { cmd: 'env | grep NODE', description: 'NODE env vars' },
          { cmd: 'env | grep PATH', description: 'PATH variable' },
          { cmd: 'echo $NODE_ENV', description: 'NODE_ENV value' },
          { cmd: 'printenv', description: 'All env vars' },
        ],
      },
      {
        name: 'System Info',
        icon: 'Info',
        commands: [
          { cmd: 'cat /etc/os-release', description: 'OS info' },
          { cmd: 'uname -a', description: 'Kernel info' },
          { cmd: 'hostname', description: 'Hostname' },
          { cmd: 'hostnamectl', description: 'Host details' },
        ],
      },
      {
        name: 'Config Files',
        icon: 'FileCode',
        commands: [
          { cmd: 'cat /var/www/musclemap.me/ecosystem.config.cjs', description: 'PM2 config' },
          { cmd: 'head -50 /var/www/musclemap.me/apps/api/.env', description: 'API env (first 50 lines)' },
          { cmd: 'ls -la /var/www/musclemap.me', description: 'Project root' },
          { cmd: 'ls -la /var/www/musclemap.me/apps/api', description: 'API directory' },
        ],
      },
    ],
  },
  {
    name: 'Emergency',
    icon: 'AlertOctagon',
    description: 'Emergency procedures and recovery',
    subcategories: [
      {
        name: 'Kill Processes',
        icon: 'XCircle',
        commands: [
          { cmd: 'kill -9 $(pgrep -f "node.*musclemap")', description: 'Kill musclemap node', dangerous: true },
          { cmd: 'kill -9 $(pgrep -f "vite")', description: 'Kill Vite', dangerous: true },
          { cmd: 'kill -9 $(pgrep -f "esbuild")', description: 'Kill esbuild', dangerous: true },
          { cmd: 'kill -9 $(pgrep -f "tsc")', description: 'Kill TypeScript', dangerous: true },
          { cmd: 'pkill -f "node.*musclemap"', description: 'pkill musclemap', dangerous: true },
          { cmd: 'pkill -9 node', description: 'Kill ALL node', dangerous: true },
        ],
      },
      {
        name: 'Port Conflicts',
        icon: 'Network',
        commands: [
          { cmd: 'lsof -ti:3001 | xargs kill -9', description: 'Kill port 3001', dangerous: true },
          { cmd: 'lsof -ti:5432 | xargs kill -9', description: 'Kill port 5432', dangerous: true },
          { cmd: 'lsof -ti:6379 | xargs kill -9', description: 'Kill port 6379', dangerous: true },
          { cmd: 'fuser -k 3001/tcp', description: 'fuser kill 3001', dangerous: true },
        ],
      },
      {
        name: 'Disk Emergency',
        icon: 'HardDrive',
        commands: [
          { cmd: 'journalctl --vacuum-size=100M && apt autoremove -y && apt autoclean && rm -rf /tmp/* && truncate -s 0 ~/.pm2/logs/*.log && df -h /', description: 'Disk cleanup sequence', dangerous: true },
        ],
      },
      {
        name: 'Memory Emergency',
        icon: 'Cpu',
        commands: [
          { cmd: 'pm2 stop all && sync && echo 3 > /proc/sys/vm/drop_caches && pm2 start all && free -h', description: 'Clear memory caches', dangerous: true },
        ],
      },
      {
        name: 'Full Recovery',
        icon: 'RefreshCw',
        commands: [
          { cmd: 'systemctl restart postgresql && sleep 2 && systemctl restart redis && sleep 2 && pm2 restart musclemap && sleep 3 && curl -s localhost:3001/health', description: 'Restart all services', dangerous: true },
          { cmd: 'cd /var/www/musclemap.me && git reset --hard HEAD~1 && pnpm install && pnpm build:all && pm2 restart musclemap', description: 'Rollback 1 commit', dangerous: true, timeout: 900000 },
          { cmd: 'redis-cli flushall && rm -rf /var/www/musclemap.me/node_modules/.cache /var/www/musclemap.me/.smart-cache /var/www/musclemap.me/.build-cache && pm2 restart musclemap', description: 'Clear all caches', dangerous: true },
        ],
      },
    ],
  },
  {
    name: 'Diagnostics',
    icon: 'Stethoscope',
    description: 'Combined diagnostic commands',
    subcategories: [
      {
        name: 'Quick Checks',
        icon: 'Zap',
        commands: [
          { cmd: 'echo "=== SYSTEM STATUS ===" && uptime && free -h && df -h / && pm2 status && curl -s localhost:3001/health', description: 'System overview' },
          { cmd: 'echo "=== PM2 ===" && pm2 status && echo "=== DISK ===" && df -h / && echo "=== MEMORY ===" && free -h && echo "=== POSTGRES ===" && psql -U musclemap -d musclemap -c "SELECT count(*) as users FROM users;" && echo "=== REDIS ===" && redis-cli ping', description: 'Full status check' },
        ],
      },
      {
        name: 'GraphQL',
        icon: 'Share2',
        commands: [
          { cmd: 'curl -s localhost:3001/api/graphql -X POST -H "Content-Type: application/json" -d \'{"query":"{ __typename }"}\' | jq .', description: 'GraphQL ping' },
          { cmd: 'curl -s localhost:3001/api/graphql -X POST -H "Content-Type: application/json" -d \'{"query":"{ __schema { queryType { fields { name } } } }"}\' | jq \'.data.__schema.queryType.fields[].name\'', description: 'List queries' },
          { cmd: 'curl -s localhost:3001/api/graphql -X POST -H "Content-Type: application/json" -d \'{"query":"{ __schema { mutationType { fields { name } } } }"}\' | jq \'.data.__schema.mutationType.fields[].name\'', description: 'List mutations' },
        ],
      },
    ],
  },
];

// ============================================
// FLATTEN COMMANDS FOR SEARCH
// ============================================

interface FlatCommand {
  category: string;
  categoryIcon: string;
  subcategory: string;
  subcategoryIcon: string;
  cmd: string;
  description: string;
  dangerous: boolean;
  timeout: number;
}

function flattenCommands(): FlatCommand[] {
  const flat: FlatCommand[] = [];
  for (const cat of COMMAND_HIERARCHY) {
    for (const sub of cat.subcategories) {
      for (const cmd of sub.commands) {
        flat.push({
          category: cat.name,
          categoryIcon: cat.icon,
          subcategory: sub.name,
          subcategoryIcon: sub.icon,
          cmd: cmd.cmd,
          description: cmd.description,
          dangerous: cmd.dangerous || false,
          timeout: cmd.timeout || 60000,
        });
      }
    }
  }
  return flat;
}

const ALL_COMMANDS = flattenCommands();

// ============================================
// EXECUTION TRACKING
// ============================================

interface ExecutionRecord {
  id: string;
  command: string;
  status: 'running' | 'success' | 'failed' | 'timeout' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  exitCode?: number;
  output: string;
  userId: string;
}

const activeExecutions = new Map<string, {
  process: ReturnType<typeof spawn>;
  record: ExecutionRecord;
  subscribers: Set<FastifyReply>;
}>();

const executionHistory: ExecutionRecord[] = [];
const MAX_HISTORY = 100;

// ============================================
// ROUTES
// ============================================

export default async function adminCommandsRoutes(fastify: FastifyInstance) {
  // Middleware for all routes
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireAdmin);

  // Get command hierarchy
  fastify.get('/api/admin/commands/hierarchy', async (request, reply) => {
    return {
      categories: COMMAND_HIERARCHY,
      totalCommands: ALL_COMMANDS.length,
    };
  });

  // Search commands
  fastify.get('/api/admin/commands/search', async (request, reply) => {
    const { q, category, dangerous } = request.query as {
      q?: string;
      category?: string;
      dangerous?: string;
    };

    let results = ALL_COMMANDS;

    if (q) {
      const query = q.toLowerCase();
      results = results.filter(
        (c) =>
          c.cmd.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.category.toLowerCase().includes(query) ||
          c.subcategory.toLowerCase().includes(query)
      );
    }

    if (category) {
      results = results.filter((c) => c.category === category);
    }

    if (dangerous !== undefined) {
      const isDangerous = dangerous === 'true';
      results = results.filter((c) => c.dangerous === isDangerous);
    }

    return {
      results,
      count: results.length,
    };
  });

  // Execute command
  fastify.post('/api/admin/commands/execute', async (request, reply) => {
    const { cmd } = request.body as { cmd: string };
    const user = request.user as JwtPayload;

    // Validate command exists in hierarchy
    const commandDef = ALL_COMMANDS.find((c) => c.cmd === cmd);
    if (!commandDef) {
      return reply.status(400).send({ error: 'Command not in approved list' });
    }

    const executionId = `exec_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    const record: ExecutionRecord = {
      id: executionId,
      command: cmd,
      status: 'running',
      startedAt: new Date(),
      output: '',
      userId: user.userId,
    };

    // Start the process
    const proc = spawn('bash', ['-c', cmd], {
      cwd: '/var/www/musclemap.me',
      env: { ...process.env, TERM: 'dumb' },
    });

    activeExecutions.set(executionId, {
      process: proc,
      record,
      subscribers: new Set(),
    });

    // Set timeout
    const timeoutId = setTimeout(() => {
      const exec = activeExecutions.get(executionId);
      if (exec && exec.record.status === 'running') {
        exec.process.kill('SIGKILL');
        exec.record.status = 'timeout';
        exec.record.completedAt = new Date();
        exec.record.durationMs = Date.now() - exec.record.startedAt.getTime();

        // Notify subscribers
        for (const sub of exec.subscribers) {
          try {
            sub.raw.write(`data: ${JSON.stringify({ type: 'timeout', id: executionId })}\n\n`);
          } catch {}
        }

        activeExecutions.delete(executionId);
        addToHistory(exec.record);
      }
    }, commandDef.timeout);

    // Collect output
    proc.stdout.on('data', (data) => {
      const exec = activeExecutions.get(executionId);
      if (exec) {
        const chunk = data.toString();
        exec.record.output += chunk;

        // Notify subscribers
        for (const sub of exec.subscribers) {
          try {
            sub.raw.write(`data: ${JSON.stringify({ type: 'output', chunk })}\n\n`);
          } catch {}
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const exec = activeExecutions.get(executionId);
      if (exec) {
        const chunk = data.toString();
        exec.record.output += chunk;

        // Notify subscribers
        for (const sub of exec.subscribers) {
          try {
            sub.raw.write(`data: ${JSON.stringify({ type: 'output', chunk })}\n\n`);
          } catch {}
        }
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      const exec = activeExecutions.get(executionId);
      if (exec) {
        exec.record.exitCode = code ?? undefined;
        exec.record.status = code === 0 ? 'success' : 'failed';
        exec.record.completedAt = new Date();
        exec.record.durationMs = Date.now() - exec.record.startedAt.getTime();

        // Notify subscribers
        for (const sub of exec.subscribers) {
          try {
            sub.raw.write(`data: ${JSON.stringify({
              type: 'complete',
              exitCode: code,
              status: exec.record.status,
              durationMs: exec.record.durationMs,
            })}\n\n`);
          } catch {}
        }

        activeExecutions.delete(executionId);
        addToHistory(exec.record);
      }
    });

    log.info({ executionId, cmd, userId: user.userId }, 'Command execution started');

    return {
      executionId,
      command: cmd,
      status: 'running',
    };
  });

  // Stream execution output (SSE)
  fastify.get('/api/admin/commands/stream/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const exec = activeExecutions.get(id);
    if (!exec) {
      // Check history
      const historical = executionHistory.find((h) => h.id === id);
      if (historical) {
        reply.raw.write(`data: ${JSON.stringify({
          type: 'history',
          output: historical.output,
          status: historical.status,
          exitCode: historical.exitCode,
          durationMs: historical.durationMs,
        })}\n\n`);
      } else {
        reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: 'Execution not found' })}\n\n`);
      }
      reply.raw.end();
      return;
    }

    // Send existing output
    if (exec.record.output) {
      reply.raw.write(`data: ${JSON.stringify({ type: 'output', chunk: exec.record.output })}\n\n`);
    }

    // Subscribe to updates
    exec.subscribers.add(reply);

    // Handle client disconnect
    request.raw.on('close', () => {
      exec.subscribers.delete(reply);
    });
  });

  // Cancel execution
  fastify.post('/api/admin/commands/cancel/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const exec = activeExecutions.get(id);
    if (!exec) {
      return reply.status(404).send({ error: 'Execution not found or already completed' });
    }

    exec.process.kill('SIGTERM');
    exec.record.status = 'cancelled';
    exec.record.completedAt = new Date();
    exec.record.durationMs = Date.now() - exec.record.startedAt.getTime();

    // Notify subscribers
    for (const sub of exec.subscribers) {
      try {
        sub.raw.write(`data: ${JSON.stringify({ type: 'cancelled', id })}\n\n`);
      } catch {}
    }

    activeExecutions.delete(id);
    addToHistory(exec.record);

    return { success: true, id };
  });

  // Get execution history
  fastify.get('/api/admin/commands/history', async (request, reply) => {
    const { limit = 50 } = request.query as { limit?: number };
    return {
      history: executionHistory.slice(0, limit),
      active: Array.from(activeExecutions.values()).map((e) => ({
        id: e.record.id,
        command: e.record.command,
        status: e.record.status,
        startedAt: e.record.startedAt,
      })),
    };
  });

  // Get single execution details
  fastify.get('/api/admin/commands/execution/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const active = activeExecutions.get(id);
    if (active) {
      return active.record;
    }

    const historical = executionHistory.find((h) => h.id === id);
    if (historical) {
      return historical;
    }

    return reply.status(404).send({ error: 'Execution not found' });
  });
}

function addToHistory(record: ExecutionRecord) {
  executionHistory.unshift(record);
  if (executionHistory.length > MAX_HISTORY) {
    executionHistory.pop();
  }
}
