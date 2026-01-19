#!/usr/bin/env npx tsx
/**
 * Deployment Tracker
 *
 * Tracks deployment history and status for rollback support.
 * Maintains a JSON file of recent deployments with their validation results.
 *
 * Usage:
 *   npx tsx scripts/deployment/deployment-tracker.ts <command> [options]
 *
 * Commands:
 *   record      Record a new deployment
 *   update      Update deployment status
 *   list        List recent deployments
 *   last-good   Get last successful deployment
 *   rollback-to Get commit hash to rollback to
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';

// ============================================
// CONFIGURATION
// ============================================

const DEPLOYMENTS_FILE = '.deployments/history.json';
const MAX_DEPLOYMENTS = 50;

// ============================================
// TYPES
// ============================================

interface ValidationResults {
  passed: number;
  failed: number;
  criticalFailed: number;
  duration: number;
}

interface Deployment {
  id: string;
  timestamp: string;
  commitHash: string;
  commitMessage: string;
  branch: string;
  deployer: string;
  status: 'pending' | 'deploying' | 'validating' | 'success' | 'failed' | 'rolled_back';
  validation?: ValidationResults;
  rollbackReason?: string;
  duration?: number;
}

// ============================================
// DATA MANAGEMENT
// ============================================

function getDeploymentsDir(): string {
  return dirname(DEPLOYMENTS_FILE);
}

function ensureDir(): void {
  const dir = getDeploymentsDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function getDeployments(): Deployment[] {
  if (!existsSync(DEPLOYMENTS_FILE)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(DEPLOYMENTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveDeployments(deployments: Deployment[]): void {
  ensureDir();
  writeFileSync(DEPLOYMENTS_FILE, JSON.stringify(deployments, null, 2));
}

// ============================================
// GIT UTILITIES
// ============================================

function getGitInfo(): { hash: string; message: string; branch: string } {
  try {
    const hash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    const message = execSync('git log -1 --format=%s', { encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    return { hash, message, branch };
  } catch {
    return { hash: 'unknown', message: '', branch: 'unknown' };
  }
}

function getDeployer(): string {
  // Try to get from environment (CI/CD) or git config
  return (
    process.env.GITHUB_ACTOR ||
    process.env.USER ||
    process.env.DEPLOYER ||
    execSync('git config user.name 2>/dev/null || echo "unknown"', {
      encoding: 'utf-8',
    }).trim()
  );
}

// ============================================
// COMMANDS
// ============================================

function recordDeployment(): string {
  const deployments = getDeployments();
  const gitInfo = getGitInfo();

  const id = `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  const newDeployment: Deployment = {
    id,
    timestamp: new Date().toISOString(),
    commitHash: gitInfo.hash,
    commitMessage: gitInfo.message.substring(0, 200),
    branch: gitInfo.branch,
    deployer: getDeployer(),
    status: 'pending',
  };

  deployments.unshift(newDeployment);

  // Trim to max
  const trimmed = deployments.slice(0, MAX_DEPLOYMENTS);
  saveDeployments(trimmed);

  console.log(JSON.stringify({ id, status: 'recorded' }));
  return id;
}

function updateStatus(
  id: string,
  status: Deployment['status'],
  validation?: ValidationResults,
  rollbackReason?: string
): void {
  const deployments = getDeployments();
  const deployment = deployments.find((d) => d.id === id);

  if (!deployment) {
    console.error(`Deployment not found: ${id}`);
    process.exit(1);
  }

  deployment.status = status;

  if (validation) {
    deployment.validation = validation;
  }

  if (rollbackReason) {
    deployment.rollbackReason = rollbackReason;
  }

  if (status === 'success' || status === 'failed' || status === 'rolled_back') {
    const startTime = new Date(deployment.timestamp).getTime();
    deployment.duration = Date.now() - startTime;
  }

  saveDeployments(deployments);

  console.log(JSON.stringify({ id, status: 'updated', newStatus: status }));
}

function listDeployments(limit = 10): void {
  const deployments = getDeployments().slice(0, limit);

  if (deployments.length === 0) {
    console.log('No deployments recorded');
    return;
  }

  console.log('\nRecent Deployments:');
  console.log('═'.repeat(80));

  for (const d of deployments) {
    const statusIcon =
      d.status === 'success'
        ? '✅'
        : d.status === 'failed'
        ? '❌'
        : d.status === 'rolled_back'
        ? '🔄'
        : d.status === 'deploying'
        ? '🚀'
        : '⏳';

    const date = new Date(d.timestamp).toLocaleString();
    const hash = d.commitHash.substring(0, 7);

    console.log(`${statusIcon} ${d.id}`);
    console.log(`   ${date} | ${hash} | ${d.branch} | ${d.deployer}`);
    console.log(`   ${d.commitMessage.substring(0, 60)}${d.commitMessage.length > 60 ? '...' : ''}`);

    if (d.validation) {
      console.log(
        `   Validation: ${d.validation.passed}/${d.validation.passed + d.validation.failed} passed`
      );
    }

    if (d.rollbackReason) {
      console.log(`   Rollback reason: ${d.rollbackReason}`);
    }

    console.log();
  }
}

function getLastSuccessful(): Deployment | null {
  const deployments = getDeployments();
  return deployments.find((d) => d.status === 'success') || null;
}

function getRollbackTarget(): string | null {
  const lastGood = getLastSuccessful();

  if (!lastGood) {
    console.error('No successful deployment found to rollback to');
    return null;
  }

  return lastGood.commitHash;
}

function getStats(): void {
  const deployments = getDeployments();

  const stats = {
    total: deployments.length,
    success: deployments.filter((d) => d.status === 'success').length,
    failed: deployments.filter((d) => d.status === 'failed').length,
    rolledBack: deployments.filter((d) => d.status === 'rolled_back').length,
    successRate: 0,
    avgDuration: 0,
  };

  if (stats.total > 0) {
    stats.successRate = Math.round((stats.success / stats.total) * 100);
  }

  const withDuration = deployments.filter((d) => d.duration);
  if (withDuration.length > 0) {
    const totalDuration = withDuration.reduce((sum, d) => sum + (d.duration || 0), 0);
    stats.avgDuration = Math.round(totalDuration / withDuration.length / 1000);
  }

  console.log('\nDeployment Statistics:');
  console.log('═'.repeat(40));
  console.log(`Total deployments: ${stats.total}`);
  console.log(`Successful: ${stats.success} (${stats.successRate}%)`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Rolled back: ${stats.rolledBack}`);
  console.log(`Avg duration: ${stats.avgDuration}s`);
}

// ============================================
// MAIN
// ============================================

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'record':
      recordDeployment();
      break;

    case 'update':
      const id = args[1];
      const status = args[2] as Deployment['status'];

      if (!id || !status) {
        console.error('Usage: update <id> <status> [validation-json]');
        process.exit(1);
      }

      let validation: ValidationResults | undefined;
      if (args[3]) {
        try {
          validation = JSON.parse(args[3]);
        } catch {
          console.error('Invalid validation JSON');
        }
      }

      const rollbackReason = args[4];
      updateStatus(id, status, validation, rollbackReason);
      break;

    case 'list':
      const limit = parseInt(args[1]) || 10;
      listDeployments(limit);
      break;

    case 'last-good':
      const lastGood = getLastSuccessful();
      if (lastGood) {
        console.log(JSON.stringify(lastGood));
      } else {
        console.log('null');
      }
      break;

    case 'rollback-to':
      const target = getRollbackTarget();
      if (target) {
        console.log(target);
      } else {
        process.exit(1);
      }
      break;

    case 'stats':
      getStats();
      break;

    default:
      console.log(`
Deployment Tracker

Usage:
  npx tsx scripts/deployment/deployment-tracker.ts <command> [options]

Commands:
  record                    Record a new deployment (returns ID)
  update <id> <status>      Update deployment status
  list [limit]              List recent deployments
  last-good                 Get last successful deployment
  rollback-to               Get commit hash to rollback to
  stats                     Show deployment statistics

Statuses:
  pending, deploying, validating, success, failed, rolled_back
      `);
  }
}

main();
