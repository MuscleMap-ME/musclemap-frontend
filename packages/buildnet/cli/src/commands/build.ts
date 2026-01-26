/**
 * BuildNet CLI - Build Command
 *
 * Request and monitor builds.
 */

import type { BuildController, TaskPriority } from '@buildnet/core';

export interface BuildCommandOptions {
  task?: string;
  node?: string;
  bundler?: string;
  priority?: 'critical' | 'high' | 'normal' | 'low' | 'background';
  noCache?: boolean;
  staged?: boolean;
  wait?: boolean;
  verbose?: boolean;
}

/**
 * Map priority string to enum value.
 */
function mapPriority(priority?: string): number {
  const priorities: Record<string, number> = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
    background: 4,
  };
  return priorities[priority ?? 'normal'] ?? 2;
}

/**
 * Execute build command.
 */
export async function buildCommand(
  controller: BuildController,
  options: BuildCommandOptions,
): Promise<void> {
  const task = options.task ?? 'full';

  console.log(`\n🔨 Requesting build: ${task}`);
  if (options.node) console.log(`   Node: ${options.node}`);
  if (options.bundler) console.log(`   Bundler: ${options.bundler}`);
  if (options.noCache) console.log(`   Cache: disabled`);
  if (options.staged) console.log(`   Mode: staged`);
  console.log();

  // Request the build
  const buildId = await controller.requestBuild({
    task,
    triggeredBy: 'cli',
    priority: mapPriority(options.priority) as TaskPriority,
    options: {
      noCache: options.noCache,
      staged: options.staged,
      node: options.node,
      bundler: options.bundler,
    },
  });

  console.log(`Build queued: ${buildId}`);

  if (options.wait) {
    console.log('\nWaiting for build to complete...\n');
    await waitForBuild(controller, buildId, options.verbose ?? false);
  } else {
    console.log('\nUse --wait to wait for completion');
    console.log(`Check status: buildnet status ${buildId}`);
  }
}

/**
 * Wait for a build to complete and show progress.
 */
async function waitForBuild(
  controller: BuildController,
  buildId: string,
  verbose: boolean,
): Promise<void> {
  let lastPhase = '';
  let lastProgress = 0;

  // Poll for status
  while (true) {
    const status = await controller.getBuildStatus(buildId);

    if (!status) {
      console.error(`Build ${buildId} not found`);
      process.exit(1);
    }

    // Show progress update
    if (status.phase !== lastPhase || status.progress !== lastProgress) {
      const progressBar = createProgressBar(status.progress ?? 0);
      const phaseText = status.phase?.padEnd(12) ?? 'unknown';
      process.stdout.write(`\r[${progressBar}] ${status.progress ?? 0}% - ${phaseText}`);

      lastPhase = status.phase ?? '';
      lastProgress = status.progress ?? 0;
    }

    // Check if complete
    if (status.status === 'success') {
      console.log('\n');
      console.log('✅ Build completed successfully!');

      if (status.result) {
        console.log(`   Duration: ${status.result.duration_ms}ms`);
        console.log(`   Artifacts: ${status.result.artifacts?.length ?? 0}`);

        if (verbose && status.result.artifacts) {
          console.log('\n   Artifacts:');
          for (const artifact of status.result.artifacts) {
            const size = formatBytes(artifact.size_bytes);
            console.log(`     - ${artifact.path} (${size})`);
          }
        }
      }

      break;
    }

    if (status.status === 'failure') {
      console.log('\n');
      console.log('❌ Build failed!');

      if (status.error) {
        console.log(`   Error: ${status.error}`);
      }

      if (verbose && status.result?.errors) {
        console.log('\n   Errors:');
        for (const error of status.result.errors) {
          console.log(`     - ${error.message}`);
          if (error.file) {
            console.log(`       at ${error.file}:${error.line}:${error.column}`);
          }
        }
      }

      process.exit(1);
    }

    if (status.status === 'cancelled') {
      console.log('\n');
      console.log('⚠️  Build was cancelled');
      process.exit(1);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/**
 * Create a simple progress bar.
 */
function createProgressBar(progress: number, width = 30): string {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Format bytes to human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Show build status.
 */
export async function statusCommand(
  controller: BuildController,
  buildId?: string,
): Promise<void> {
  if (buildId) {
    const status = await controller.getBuildStatus(buildId);

    if (!status) {
      console.error(`Build ${buildId} not found`);
      process.exit(1);
    }

    console.log('\n📋 Build Status\n');
    console.log(`   ID:       ${status.buildId}`);
    console.log(`   Status:   ${formatStatus(status.status)}`);
    console.log(`   Phase:    ${status.phase ?? '-'}`);
    console.log(`   Progress: ${status.progress ?? 0}%`);

    if (status.startedAt) {
      console.log(`   Started:  ${status.startedAt.toISOString()}`);
    }
    if (status.completedAt) {
      console.log(`   Completed: ${status.completedAt.toISOString()}`);
    }
    if (status.result) {
      console.log(`   Duration: ${status.result.duration_ms}ms`);
    }
    if (status.error) {
      console.log(`   Error:    ${status.error}`);
    }

    console.log();
  } else {
    // Show recent builds
    const builds = await controller.getRecentBuilds(10);

    console.log('\n📋 Recent Builds\n');

    if (builds.length === 0) {
      console.log('   No recent builds');
    } else {
      console.log('   ID                           Status    Duration');
      console.log('   ─────────────────────────────────────────────────');

      for (const build of builds) {
        const duration = build.result?.duration_ms
          ? `${(build.result.duration_ms / 1000).toFixed(1)}s`
          : '-';
        console.log(
          `   ${build.buildId.padEnd(30)} ${formatStatus(build.status).padEnd(9)} ${duration}`,
        );
      }
    }

    console.log();
  }
}

/**
 * Format build status with emoji.
 */
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    queued: '⏳ queued',
    running: '🔄 running',
    success: '✅ success',
    failure: '❌ failure',
    cancelled: '⚠️  cancelled',
  };
  return statusMap[status] ?? status;
}

/**
 * Cancel a build.
 */
export async function cancelCommand(
  controller: BuildController,
  buildId: string,
): Promise<void> {
  console.log(`\nCancelling build: ${buildId}`);

  const success = await controller.cancelBuild(buildId);

  if (success) {
    console.log('✅ Build cancelled\n');
  } else {
    console.log('⚠️  Could not cancel build (may have already completed)\n');
  }
}
