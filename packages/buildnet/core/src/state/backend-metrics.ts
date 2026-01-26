/**
 * Backend Metrics & Benchmarking System
 *
 * Provides unified performance metrics, benchmarking, and comparison
 * across all state backends.
 */

import type { StateBackend, Logger } from '../types/index.js';

export interface BackendBenchmarkResult {
  backend: string;
  timestamp: Date;
  iterations: number;
  read: {
    avgLatencyMs: number;
    minLatencyMs: number;
    maxLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    throughputOpsPerSec: number;
  };
  write: {
    avgLatencyMs: number;
    minLatencyMs: number;
    maxLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    throughputOpsPerSec: number;
  };
  lock: {
    avgAcquireLatencyMs: number;
    successRate: number;
    throughputOpsPerSec: number;
  };
  overall: {
    score: number; // 0-100 performance score
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    recommendation: string;
  };
}

export interface BackendMetricsSnapshot {
  backend: string;
  timestamp: Date;
  reads: number;
  writes: number;
  avgReadLatencyMs: number;
  avgWriteLatencyMs: number;
  lockAcquisitions: number;
  lockFailures: number;
  lockSuccessRate: number;
  errorCount: number;
  uptime: number;
}

export interface BackendComparison {
  backends: string[];
  timestamp: Date;
  results: BackendBenchmarkResult[];
  winner: string;
  ranking: Array<{ backend: string; score: number; grade: string }>;
  recommendation: string;
}

/**
 * Backend Metrics Collector
 *
 * Collects and aggregates performance metrics across backends.
 */
export class BackendMetricsCollector {
  private snapshots: Map<string, BackendMetricsSnapshot[]> = new Map();
  private maxSnapshots = 1000;
  private logger?: Logger;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  /**
   * Record a metric snapshot for a backend.
   */
  recordSnapshot(snapshot: BackendMetricsSnapshot): void {
    let history = this.snapshots.get(snapshot.backend);
    if (!history) {
      history = [];
      this.snapshots.set(snapshot.backend, history);
    }

    history.push(snapshot);

    // Trim old snapshots
    if (history.length > this.maxSnapshots) {
      history.shift();
    }
  }

  /**
   * Get the latest snapshot for a backend.
   */
  getLatestSnapshot(backend: string): BackendMetricsSnapshot | undefined {
    const history = this.snapshots.get(backend);
    return history?.[history.length - 1];
  }

  /**
   * Get historical snapshots for a backend.
   */
  getHistory(backend: string, limit = 100): BackendMetricsSnapshot[] {
    const history = this.snapshots.get(backend) ?? [];
    return history.slice(-limit);
  }

  /**
   * Calculate average metrics over a time window.
   */
  getAverageMetrics(
    backend: string,
    windowMs = 60000,
  ): Partial<BackendMetricsSnapshot> | undefined {
    const history = this.snapshots.get(backend);
    if (!history || history.length === 0) return undefined;

    const cutoff = Date.now() - windowMs;
    const recent = history.filter((s) => s.timestamp.getTime() > cutoff);

    if (recent.length === 0) return undefined;

    return {
      backend,
      timestamp: new Date(),
      reads: recent.reduce((sum, s) => sum + s.reads, 0),
      writes: recent.reduce((sum, s) => sum + s.writes, 0),
      avgReadLatencyMs:
        recent.reduce((sum, s) => sum + s.avgReadLatencyMs, 0) / recent.length,
      avgWriteLatencyMs:
        recent.reduce((sum, s) => sum + s.avgWriteLatencyMs, 0) / recent.length,
      lockAcquisitions: recent.reduce((sum, s) => sum + s.lockAcquisitions, 0),
      lockFailures: recent.reduce((sum, s) => sum + s.lockFailures, 0),
      lockSuccessRate:
        recent.reduce((sum, s) => sum + s.lockSuccessRate, 0) / recent.length,
      errorCount: recent.reduce((sum, s) => sum + s.errorCount, 0),
      uptime: recent[recent.length - 1]?.uptime ?? 0,
    };
  }

  /**
   * Clear all collected metrics.
   */
  clear(): void {
    this.snapshots.clear();
  }
}

/**
 * Backend Benchmarker
 *
 * Runs standardized benchmarks against state backends.
 */
export class BackendBenchmarker {
  private logger?: Logger;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  /**
   * Run a comprehensive benchmark on a backend.
   */
  async benchmark(
    backend: StateBackend,
    iterations = 1000,
  ): Promise<BackendBenchmarkResult> {
    this.logger?.info(`Starting benchmark for ${backend.name}`, { iterations });

    const readLatencies: number[] = [];
    const writeLatencies: number[] = [];
    const lockLatencies: number[] = [];
    let lockSuccesses = 0;
    let lockFailures = 0;

    // Warm up
    for (let i = 0; i < 10; i++) {
      await backend.set(`warmup:${i}`, 'warmup', 1000);
      await backend.get(`warmup:${i}`);
      await backend.del(`warmup:${i}`);
    }

    // Write benchmark
    const writeStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await backend.set(`bench:${i}`, `value-${i}-${'x'.repeat(100)}`, 60000);
      writeLatencies.push(performance.now() - start);
    }
    const writeTotalMs = performance.now() - writeStart;

    // Read benchmark
    const readStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await backend.get(`bench:${i}`);
      readLatencies.push(performance.now() - start);
    }
    const readTotalMs = performance.now() - readStart;

    // Lock benchmark (fewer iterations as it's more expensive)
    const lockIterations = Math.min(iterations / 10, 100);
    for (let i = 0; i < lockIterations; i++) {
      const start = performance.now();
      const lock = await backend.acquireLock(`bench-lock-${i}`, 5000);
      lockLatencies.push(performance.now() - start);

      if (lock) {
        lockSuccesses++;
        await backend.releaseLock(lock);
      } else {
        lockFailures++;
      }
    }

    // Cleanup
    for (let i = 0; i < iterations; i++) {
      await backend.del(`bench:${i}`);
    }

    // Calculate statistics
    const calcPercentile = (arr: number[], p: number): number => {
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.floor(sorted.length * p);
      return sorted[idx] ?? 0;
    };

    const readStats = {
      avgLatencyMs: readLatencies.reduce((a, b) => a + b, 0) / readLatencies.length,
      minLatencyMs: Math.min(...readLatencies),
      maxLatencyMs: Math.max(...readLatencies),
      p50LatencyMs: calcPercentile(readLatencies, 0.5),
      p95LatencyMs: calcPercentile(readLatencies, 0.95),
      p99LatencyMs: calcPercentile(readLatencies, 0.99),
      throughputOpsPerSec: (iterations / readTotalMs) * 1000,
    };

    const writeStats = {
      avgLatencyMs: writeLatencies.reduce((a, b) => a + b, 0) / writeLatencies.length,
      minLatencyMs: Math.min(...writeLatencies),
      maxLatencyMs: Math.max(...writeLatencies),
      p50LatencyMs: calcPercentile(writeLatencies, 0.5),
      p95LatencyMs: calcPercentile(writeLatencies, 0.95),
      p99LatencyMs: calcPercentile(writeLatencies, 0.99),
      throughputOpsPerSec: (iterations / writeTotalMs) * 1000,
    };

    const lockTotalMs = lockLatencies.reduce((a, b) => a + b, 0);
    const lockStats = {
      avgAcquireLatencyMs:
        lockLatencies.length > 0 ? lockTotalMs / lockLatencies.length : 0,
      successRate:
        lockSuccesses + lockFailures > 0
          ? lockSuccesses / (lockSuccesses + lockFailures)
          : 1,
      throughputOpsPerSec:
        lockTotalMs > 0 ? (lockIterations / lockTotalMs) * 1000 : 0,
    };

    // Calculate overall score (0-100)
    const score = this.calculateScore(readStats, writeStats, lockStats);
    const grade = this.scoreToGrade(score);
    const recommendation = this.generateRecommendation(
      backend.name,
      score,
      readStats,
      writeStats,
      lockStats,
    );

    const result: BackendBenchmarkResult = {
      backend: backend.name,
      timestamp: new Date(),
      iterations,
      read: readStats,
      write: writeStats,
      lock: lockStats,
      overall: { score, grade, recommendation },
    };

    this.logger?.info(`Benchmark complete for ${backend.name}`, {
      score,
      grade,
      readAvgMs: readStats.avgLatencyMs.toFixed(3),
      writeAvgMs: writeStats.avgLatencyMs.toFixed(3),
    });

    return result;
  }

  /**
   * Compare multiple backends.
   */
  async compareBackends(
    backends: StateBackend[],
    iterations = 1000,
  ): Promise<BackendComparison> {
    const results: BackendBenchmarkResult[] = [];

    for (const backend of backends) {
      if (!backend.isConnected()) {
        this.logger?.warn(`Skipping ${backend.name}: not connected`);
        continue;
      }

      try {
        const result = await this.benchmark(backend, iterations);
        results.push(result);
      } catch (error) {
        this.logger?.error(`Benchmark failed for ${backend.name}`, {
          error: String(error),
        });
      }
    }

    // Sort by score
    results.sort((a, b) => b.overall.score - a.overall.score);

    const ranking = results.map((r) => ({
      backend: r.backend,
      score: r.overall.score,
      grade: r.overall.grade,
    }));

    const winner = results[0]?.backend ?? 'none';
    const recommendation = this.generateComparisonRecommendation(results);

    return {
      backends: backends.map((b) => b.name),
      timestamp: new Date(),
      results,
      winner,
      ranking,
      recommendation,
    };
  }

  private calculateScore(
    read: { avgLatencyMs: number; p99LatencyMs: number; throughputOpsPerSec: number },
    write: { avgLatencyMs: number; p99LatencyMs: number; throughputOpsPerSec: number },
    lock: { avgAcquireLatencyMs: number; successRate: number },
  ): number {
    // Weighted scoring based on latency and throughput
    // Lower latency = higher score, higher throughput = higher score

    // Read score (40% weight)
    const readLatencyScore = Math.max(0, 100 - read.avgLatencyMs * 10);
    const readThroughputScore = Math.min(100, read.throughputOpsPerSec / 100);
    const readScore = readLatencyScore * 0.6 + readThroughputScore * 0.4;

    // Write score (40% weight)
    const writeLatencyScore = Math.max(0, 100 - write.avgLatencyMs * 5);
    const writeThroughputScore = Math.min(100, write.throughputOpsPerSec / 50);
    const writeScore = writeLatencyScore * 0.6 + writeThroughputScore * 0.4;

    // Lock score (20% weight)
    const lockLatencyScore = Math.max(0, 100 - lock.avgAcquireLatencyMs * 2);
    const lockSuccessScore = lock.successRate * 100;
    const lockScore = lockLatencyScore * 0.5 + lockSuccessScore * 0.5;

    return Math.round(readScore * 0.4 + writeScore * 0.4 + lockScore * 0.2);
  }

  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private generateRecommendation(
    backend: string,
    score: number,
    read: { avgLatencyMs: number; p99LatencyMs: number },
    write: { avgLatencyMs: number; p99LatencyMs: number },
    lock: { avgAcquireLatencyMs: number; successRate: number },
  ): string {
    const issues: string[] = [];

    if (read.avgLatencyMs > 5) {
      issues.push('high read latency');
    }
    if (write.avgLatencyMs > 10) {
      issues.push('high write latency');
    }
    if (read.p99LatencyMs > read.avgLatencyMs * 10) {
      issues.push('inconsistent read performance');
    }
    if (write.p99LatencyMs > write.avgLatencyMs * 10) {
      issues.push('inconsistent write performance');
    }
    if (lock.successRate < 0.95) {
      issues.push('lock contention issues');
    }

    if (issues.length === 0) {
      return `${backend} is performing well (score: ${score})`;
    }

    return `${backend} has ${issues.join(', ')} (score: ${score})`;
  }

  private generateComparisonRecommendation(
    results: BackendBenchmarkResult[],
  ): string {
    if (results.length === 0) {
      return 'No backends available for comparison';
    }

    if (results.length === 1) {
      return `Only ${results[0].backend} available (score: ${results[0].overall.score})`;
    }

    const winner = results[0];
    const runnerUp = results[1];

    const scoreDiff = winner.overall.score - runnerUp.overall.score;

    if (scoreDiff > 20) {
      return `${winner.backend} is significantly faster than alternatives (+${scoreDiff} points)`;
    }

    if (scoreDiff > 10) {
      return `${winner.backend} is the best choice (+${scoreDiff} points over ${runnerUp.backend})`;
    }

    return `${winner.backend} and ${runnerUp.backend} perform similarly (${scoreDiff} point difference)`;
  }
}

/**
 * Format benchmark results for display.
 */
export function formatBenchmarkResult(result: BackendBenchmarkResult): string {
  const lines: string[] = [];

  lines.push(`Backend: ${result.backend}`);
  lines.push(`Score: ${result.overall.score}/100 (Grade: ${result.overall.grade})`);
  lines.push(`Iterations: ${result.iterations}`);
  lines.push('');
  lines.push('Read Performance:');
  lines.push(`  Avg Latency: ${result.read.avgLatencyMs.toFixed(3)}ms`);
  lines.push(`  P99 Latency: ${result.read.p99LatencyMs.toFixed(3)}ms`);
  lines.push(`  Throughput: ${result.read.throughputOpsPerSec.toFixed(0)} ops/sec`);
  lines.push('');
  lines.push('Write Performance:');
  lines.push(`  Avg Latency: ${result.write.avgLatencyMs.toFixed(3)}ms`);
  lines.push(`  P99 Latency: ${result.write.p99LatencyMs.toFixed(3)}ms`);
  lines.push(`  Throughput: ${result.write.throughputOpsPerSec.toFixed(0)} ops/sec`);
  lines.push('');
  lines.push('Lock Performance:');
  lines.push(`  Avg Acquire: ${result.lock.avgAcquireLatencyMs.toFixed(3)}ms`);
  lines.push(`  Success Rate: ${(result.lock.successRate * 100).toFixed(1)}%`);
  lines.push('');
  lines.push(`Recommendation: ${result.overall.recommendation}`);

  return lines.join('\n');
}

/**
 * Format comparison results for display.
 */
export function formatBackendComparison(comparison: BackendComparison): string {
  const lines: string[] = [];

  lines.push('Backend Comparison Results');
  lines.push('='.repeat(50));
  lines.push('');
  lines.push('Ranking:');

  for (let i = 0; i < comparison.ranking.length; i++) {
    const r = comparison.ranking[i];
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    lines.push(`  ${medal} ${i + 1}. ${r.backend} - Score: ${r.score} (${r.grade})`);
  }

  lines.push('');
  lines.push(`Winner: ${comparison.winner}`);
  lines.push(`Recommendation: ${comparison.recommendation}`);
  lines.push('');
  lines.push('Detailed Results:');
  lines.push('-'.repeat(50));

  for (const result of comparison.results) {
    lines.push('');
    lines.push(formatBenchmarkResult(result));
    lines.push('-'.repeat(50));
  }

  return lines.join('\n');
}
