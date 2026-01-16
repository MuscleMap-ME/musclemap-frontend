/**
 * Rollback System
 * Monitor deployments and automatically rollback on issues
 */

import type { FixResult, DiagnosedBug } from './types.js';
import type { BugHunterConfig } from './config.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// ============================================================================
// ROLLBACK SYSTEM CLASS
// ============================================================================

export class RollbackSystem {
  private projectRoot: string;
  private config: BugHunterConfig;
  private rollbackLog: RollbackEntry[] = [];

  constructor(projectRoot: string, config: BugHunterConfig) {
    this.projectRoot = projectRoot;
    this.config = config;
  }

  // ============================================================================
  // DEPLOYMENT MONITORING
  // ============================================================================

  async monitorDeployment(fixId: string, duration?: number): Promise<MonitorResult> {
    const monitorDuration = duration || this.config.deploymentMonitorDuration;
    const startTime = Date.now();
    const checkInterval = 30000; // 30 seconds

    console.log(`   📊 Monitoring deployment for ${monitorDuration / 60000} minutes...`);

    // Get baseline metrics
    const baseline = await this.getProductionMetrics();

    while (Date.now() - startTime < monitorDuration) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`   📊 Health check at ${elapsed}s...`);

      // Check health endpoint
      const healthCheck = await this.checkHealth();
      if (!healthCheck.healthy) {
        console.log(`   ⚠️  Health check failed: ${healthCheck.reason}`);
        await this.rollback(fixId, healthCheck.reason || 'Health check failed');
        return {
          success: false,
          reason: healthCheck.reason || 'Health check failed',
          rolledBack: true,
        };
      }

      // Check error rate
      const currentMetrics = await this.getProductionMetrics();
      if (baseline.errorRate > 0 && currentMetrics.errorRate > baseline.errorRate * this.config.errorRateThreshold) {
        console.log(`   ⚠️  Error rate increased: ${baseline.errorRate} -> ${currentMetrics.errorRate}`);
        await this.rollback(fixId, 'Error rate increased');
        return {
          success: false,
          reason: 'Error rate increased above threshold',
          rolledBack: true,
        };
      }

      // Check response time
      if (baseline.responseTime > 0 && currentMetrics.responseTime > baseline.responseTime * 2) {
        console.log(`   ⚠️  Response time degraded: ${baseline.responseTime}ms -> ${currentMetrics.responseTime}ms`);
        // Don't rollback for response time, just warn
      }
    }

    console.log(`   ✅ Deployment stable for ${monitorDuration / 60000} minutes`);
    await this.markStable(fixId);

    return { success: true };
  }

  // ============================================================================
  // HEALTH CHECKS
  // ============================================================================

  private async checkHealth(): Promise<{ healthy: boolean; reason?: string }> {
    try {
      // Check main health endpoint
      const healthResponse = await fetch(`${this.config.productionUrl}/health`, {
        timeout: 10000,
      } as RequestInit);

      if (!healthResponse.ok) {
        return { healthy: false, reason: `Health endpoint returned ${healthResponse.status}` };
      }

      const healthData = await healthResponse.json();
      if (healthData.status !== 'ok' && healthData.status !== 'healthy') {
        return { healthy: false, reason: `Health status: ${healthData.status}` };
      }

      // Check ready endpoint
      const readyResponse = await fetch(`${this.config.productionUrl}/ready`, {
        timeout: 10000,
      } as RequestInit);

      if (!readyResponse.ok) {
        return { healthy: false, reason: `Ready endpoint returned ${readyResponse.status}` };
      }

      // Check frontend loads
      const frontendResponse = await fetch(this.config.productionUrl, {
        timeout: 15000,
      } as RequestInit);

      if (!frontendResponse.ok) {
        return { healthy: false, reason: `Frontend returned ${frontendResponse.status}` };
      }

      const html = await frontendResponse.text();
      if (!html.includes('<!DOCTYPE html>') && !html.includes('<html')) {
        return { healthy: false, reason: 'Frontend did not return valid HTML' };
      }

      return { healthy: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { healthy: false, reason: `Health check error: ${message}` };
    }
  }

  private async getProductionMetrics(): Promise<ProductionMetrics> {
    try {
      const response = await fetch(`${this.config.productionUrl}/metrics`, {
        timeout: 10000,
      } as RequestInit);

      if (!response.ok) {
        return this.getDefaultMetrics();
      }

      const text = await response.text();

      // Parse Prometheus-style metrics
      const errorRate = this.parseMetric(text, 'http_requests_error_rate') || 0;
      const responseTime = this.parseMetric(text, 'http_request_duration_ms_p99') || 0;
      const requestCount = this.parseMetric(text, 'http_requests_total') || 0;

      return { errorRate, responseTime, requestCount };
    } catch {
      return this.getDefaultMetrics();
    }
  }

  private parseMetric(text: string, name: string): number | null {
    const regex = new RegExp(`^${name}\\s+([\\d.]+)`, 'm');
    const match = text.match(regex);
    return match ? parseFloat(match[1]) : null;
  }

  private getDefaultMetrics(): ProductionMetrics {
    return { errorRate: 0, responseTime: 0, requestCount: 0 };
  }

  // ============================================================================
  // ROLLBACK OPERATIONS
  // ============================================================================

  async rollback(fixId: string, reason: string): Promise<void> {
    console.log(`\n   🔄 Rolling back fix ${fixId}...`);
    console.log(`   └─ Reason: ${reason}`);

    try {
      // Get current commit
      const { stdout: currentCommit } = await execAsync('git rev-parse HEAD', { cwd: this.projectRoot });

      // Revert the commit
      await execAsync('git revert --no-edit HEAD', { cwd: this.projectRoot });

      // Push the revert
      await execAsync('git push origin main', { cwd: this.projectRoot });

      // Deploy the revert
      const deployCommand = `ssh root@musclemap.me "cd /var/www/musclemap.me && git pull && pnpm install && pnpm build:all && pm2 restart musclemap"`;
      await execAsync(deployCommand, { cwd: this.projectRoot, timeout: 600000 });

      // Log the rollback
      const entry: RollbackEntry = {
        fixId,
        reason,
        revertedCommit: currentCommit.trim(),
        timestamp: new Date().toISOString(),
      };

      this.rollbackLog.push(entry);
      await this.saveRollbackLog();

      console.log(`   ✅ Rollback complete`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Rollback failed: ${message}`);
      throw error;
    }
  }

  async markStable(fixId: string): Promise<void> {
    // Record successful deployment
    const logPath = path.join(this.config.reportDir, 'stable-deploys.json');

    let deploys: StableDeployEntry[] = [];
    try {
      const content = await fs.readFile(logPath, 'utf-8');
      deploys = JSON.parse(content);
    } catch {
      // File doesn't exist
    }

    deploys.push({
      fixId,
      timestamp: new Date().toISOString(),
      monitorDuration: this.config.deploymentMonitorDuration,
    });

    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.writeFile(logPath, JSON.stringify(deploys, null, 2));
  }

  // ============================================================================
  // EMERGENCY ROLLBACK
  // ============================================================================

  async emergencyRollback(commitsBack: number = 1): Promise<void> {
    console.log(`\n   🚨 EMERGENCY ROLLBACK - ${commitsBack} commit(s) back`);

    try {
      // Hard reset to previous commit
      await execAsync(`git reset --hard HEAD~${commitsBack}`, { cwd: this.projectRoot });
      await execAsync('git push --force origin main', { cwd: this.projectRoot });

      // Deploy
      const deployCommand = `ssh root@musclemap.me "cd /var/www/musclemap.me && git fetch && git reset --hard origin/main && pnpm install && pnpm build:all && pm2 restart musclemap"`;
      await execAsync(deployCommand, { cwd: this.projectRoot, timeout: 600000 });

      console.log(`   ✅ Emergency rollback complete`);
    } catch (error) {
      console.error(`   ❌ Emergency rollback failed - MANUAL INTERVENTION REQUIRED`);
      throw error;
    }
  }

  async rollbackToCommit(commitHash: string): Promise<void> {
    console.log(`\n   🔄 Rolling back to commit ${commitHash}`);

    try {
      await execAsync(`git checkout ${commitHash}`, { cwd: this.projectRoot });
      await execAsync('git checkout -B main', { cwd: this.projectRoot });
      await execAsync('git push --force origin main', { cwd: this.projectRoot });

      // Deploy
      const deployCommand = `ssh root@musclemap.me "cd /var/www/musclemap.me && git fetch && git reset --hard origin/main && pnpm install && pnpm build:all && pm2 restart musclemap"`;
      await execAsync(deployCommand, { cwd: this.projectRoot, timeout: 600000 });

      console.log(`   ✅ Rollback to ${commitHash} complete`);
    } catch (error) {
      console.error(`   ❌ Rollback failed`);
      throw error;
    }
  }

  // ============================================================================
  // ROLLBACK LOG
  // ============================================================================

  private async saveRollbackLog(): Promise<void> {
    const logPath = path.join(this.config.reportDir, 'rollbacks.json');

    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.writeFile(logPath, JSON.stringify(this.rollbackLog, null, 2));
  }

  async loadRollbackLog(): Promise<RollbackEntry[]> {
    const logPath = path.join(this.config.reportDir, 'rollbacks.json');

    try {
      const content = await fs.readFile(logPath, 'utf-8');
      this.rollbackLog = JSON.parse(content);
      return this.rollbackLog;
    } catch {
      return [];
    }
  }

  getRecentRollbacks(hours: number = 24): RollbackEntry[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.rollbackLog.filter(entry =>
      new Date(entry.timestamp).getTime() > cutoff
    );
  }

  // ============================================================================
  // CIRCUIT BREAKER
  // ============================================================================

  async shouldPauseAutomation(): Promise<{ pause: boolean; reason?: string }> {
    const recentRollbacks = this.getRecentRollbacks(1); // Last hour

    // Pause if 3+ rollbacks in the last hour
    if (recentRollbacks.length >= 3) {
      return {
        pause: true,
        reason: `${recentRollbacks.length} rollbacks in the last hour - automation paused`,
      };
    }

    // Check if production is down
    const health = await this.checkHealth();
    if (!health.healthy) {
      return {
        pause: true,
        reason: `Production unhealthy: ${health.reason}`,
      };
    }

    return { pause: false };
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface RollbackEntry {
  fixId: string;
  reason: string;
  revertedCommit: string;
  timestamp: string;
}

interface StableDeployEntry {
  fixId: string;
  timestamp: string;
  monitorDuration: number;
}

interface ProductionMetrics {
  errorRate: number;
  responseTime: number;
  requestCount: number;
}

interface MonitorResult {
  success: boolean;
  reason?: string;
  rolledBack?: boolean;
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export function createRollbackSystem(projectRoot: string, config: BugHunterConfig): RollbackSystem {
  return new RollbackSystem(projectRoot, config);
}
