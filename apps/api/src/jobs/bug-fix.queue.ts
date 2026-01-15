/**
 * Bug Fix Queue
 *
 * BullMQ queue for processing confirmed bug reports
 * with automated Claude agent fixes
 */

import { Queue, Worker, Job } from 'bullmq';
import { spawn } from 'child_process';
import path from 'path';
import { db } from '../db/client';
import { loggers } from '../lib/logger';
import { EmailService } from '../services/email.service';
import { NotificationService } from '../services/notification.service';

const log = loggers.api;

// Redis connection for BullMQ
const connection = process.env.REDIS_URL
  ? {
      host: new URL(process.env.REDIS_URL).hostname,
      port: parseInt(new URL(process.env.REDIS_URL).port || '6379'),
      password: new URL(process.env.REDIS_URL).password || undefined,
    }
  : { host: 'localhost', port: 6379 };

// Job data interface
export interface BugFixJobData {
  feedbackId: string;
  title: string;
  description: string;
  stepsToReproduce: string | null;
  expectedBehavior: string | null;
  actualBehavior: string | null;
}

// Job result interface
export interface BugFixJobResult {
  success: boolean;
  filesModified?: string[];
  testsPassed?: boolean;
  deployed?: boolean;
  deployCommit?: string;
  errorMessage?: string;
  agentOutput?: string;
}

// Create the queue
export const bugFixQueue = new Queue<BugFixJobData, BugFixJobResult>('bug-fix', {
  connection,
  defaultJobOptions: {
    attempts: 1, // Don't retry - manual review needed on failure
    removeOnComplete: { count: 100 }, // Keep last 100 completed jobs
    removeOnFail: { count: 100 }, // Keep last 100 failed jobs
  },
});

/**
 * Process a bug fix job
 */
async function processBugFix(job: Job<BugFixJobData, BugFixJobResult>): Promise<BugFixJobResult> {
  const { feedbackId, title, description, stepsToReproduce, expectedBehavior, actualBehavior } = job.data;

  log.info({ feedbackId, jobId: job.id }, 'Starting bug fix job');

  // Create agent job record
  const agentJob = await db.queryOne<{ id: string }>(`
    INSERT INTO feedback_agent_jobs (feedback_id, status, started_at)
    VALUES ($1, 'running', NOW())
    RETURNING id
  `, [feedbackId]);

  // Update feedback status
  await db.query(`
    UPDATE user_feedback SET
      auto_fix_status = 'in_progress',
      auto_fix_started_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `, [feedbackId]);

  try {
    // Build the prompt for Claude
    const prompt = buildBugFixPrompt({
      title,
      description,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
    });

    // Execute Claude agent
    const result = await executeClaude(prompt);

    // Parse the result
    const success = result.exitCode === 0 && result.output.includes('deployed successfully');
    const filesModified = extractFilesModified(result.output);
    const testsPassed = result.output.includes('tests passed') || result.output.includes('All tests passed');
    const deployed = result.output.includes('deployed successfully') || result.output.includes('Deploy completed');
    const deployCommit = extractCommitHash(result.output);

    // Update agent job record
    await db.query(`
      UPDATE feedback_agent_jobs SET
        status = $1,
        completed_at = NOW(),
        agent_output = $2,
        files_modified = $3,
        tests_passed = $4,
        deployed = $5,
        deploy_commit = $6,
        updated_at = NOW()
      WHERE id = $7
    `, [
      success ? 'completed' : 'failed',
      result.output.substring(0, 50000), // Limit output size
      JSON.stringify(filesModified),
      testsPassed,
      deployed,
      deployCommit,
      agentJob?.id,
    ]);

    // Update feedback status
    if (success && deployed) {
      await db.query(`
        UPDATE user_feedback SET
          auto_fix_status = 'completed',
          auto_fix_completed_at = NOW(),
          auto_fix_result = $1,
          status = 'resolved',
          resolved_at = NOW(),
          updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify({ filesModified, deployCommit }), feedbackId]);

      // Get user info for notification
      const feedback = await db.queryOne<{ user_id: string; title: string }>(`
        SELECT user_id, title FROM user_feedback WHERE id = $1
      `, [feedbackId]);

      if (feedback) {
        // Notify user that their bug was fixed
        await NotificationService.create({
          userId: feedback.user_id,
          type: 'SYSTEM_ANNOUNCEMENT',
          category: 'system',
          title: 'Your bug report was fixed! 🎉',
          body: `Good news! The bug you reported ("${feedback.title}") has been fixed and deployed.`,
          actionUrl: `/feedback/${feedbackId}`,
          actionLabel: 'View Details',
        });

        // Get user email for notification
        const user = await db.queryOne<{ email: string; username: string }>(`
          SELECT email, username FROM users WHERE id = $1
        `, [feedback.user_id]);

        if (user) {
          await EmailService.sendResolutionNotification({
            feedbackId,
            feedbackType: 'bug_report',
            title: feedback.title,
            status: 'resolved',
            resolutionMessage: 'Your bug has been automatically fixed and deployed. Thank you for reporting it!',
            userEmail: user.email,
            username: user.username,
          });

          await db.query(`UPDATE user_feedback SET resolution_notified_at = NOW() WHERE id = $1`, [feedbackId]);
        }
      }
    } else {
      await db.query(`
        UPDATE user_feedback SET
          auto_fix_status = 'failed',
          auto_fix_completed_at = NOW(),
          auto_fix_result = $1,
          status = 'in_progress',
          updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify({ error: result.error || 'Auto-fix failed' }), feedbackId]);
    }

    // Notify admin
    await EmailService.sendBugFixNotification({
      feedbackId,
      title,
      success,
      filesModified,
      deployCommit,
      errorMessage: success ? undefined : result.error,
    });

    log.info({
      feedbackId,
      jobId: job.id,
      success,
      filesModified,
      deployed,
    }, 'Bug fix job completed');

    return {
      success,
      filesModified,
      testsPassed,
      deployed,
      deployCommit,
      errorMessage: success ? undefined : result.error,
      agentOutput: result.output,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    log.error({ feedbackId, jobId: job.id, error }, 'Bug fix job failed');

    // Update records
    await db.query(`
      UPDATE feedback_agent_jobs SET
        status = 'failed',
        completed_at = NOW(),
        error_message = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [errorMessage, agentJob?.id]);

    await db.query(`
      UPDATE user_feedback SET
        auto_fix_status = 'failed',
        auto_fix_completed_at = NOW(),
        auto_fix_result = $1,
        status = 'in_progress',
        updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify({ error: errorMessage }), feedbackId]);

    // Notify admin of failure
    await EmailService.sendBugFixNotification({
      feedbackId,
      title,
      success: false,
      errorMessage,
    });

    throw error;
  }
}

/**
 * Build the prompt for Claude to fix the bug
 */
function buildBugFixPrompt(bug: {
  title: string;
  description: string;
  stepsToReproduce: string | null;
  expectedBehavior: string | null;
  actualBehavior: string | null;
}): string {
  return `You are fixing a confirmed bug in the MuscleMap codebase.

## Bug Report

**Title:** ${bug.title}

**Description:**
${bug.description}

${bug.stepsToReproduce ? `**Steps to Reproduce:**\n${bug.stepsToReproduce}` : ''}

${bug.expectedBehavior ? `**Expected Behavior:**\n${bug.expectedBehavior}` : ''}

${bug.actualBehavior ? `**Actual Behavior:**\n${bug.actualBehavior}` : ''}

## Instructions

1. First, analyze the bug report and search the codebase to find the relevant code
2. Identify the root cause of the bug
3. Implement a minimal fix that addresses the bug without introducing new issues
4. Run \`pnpm typecheck\` to ensure no type errors
5. Run \`pnpm test\` to ensure all tests pass
6. If tests pass, run \`./deploy.sh "Fix: ${bug.title.replace(/"/g, '\\"')}"\` to deploy the fix

When you're done, output either:
- "Bug fix deployed successfully" if the fix was deployed
- "Bug fix failed: <reason>" if something went wrong

Be minimal and focused - only fix the specific bug, don't refactor or improve other code.`;
}

/**
 * Execute Claude CLI with the given prompt
 */
async function executeClaude(prompt: string): Promise<{ exitCode: number; output: string; error?: string }> {
  return new Promise((resolve) => {
    const projectRoot = path.resolve(__dirname, '../../../../..');

    // Use claude CLI in non-interactive mode
    const claude = spawn('claude', ['-p', prompt, '--dangerously-skip-permissions'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        CLAUDE_CODE_ENTRYPOINT: 'api-bugfix',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    claude.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    claude.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    // Timeout after 10 minutes
    const timeout = setTimeout(() => {
      claude.kill('SIGTERM');
      resolve({
        exitCode: 1,
        output: stdout,
        error: 'Bug fix timed out after 10 minutes',
      });
    }, 10 * 60 * 1000);

    claude.on('close', (code) => {
      clearTimeout(timeout);
      resolve({
        exitCode: code ?? 1,
        output: stdout + (stderr ? `\n\nSTDERR:\n${stderr}` : ''),
        error: code !== 0 ? stderr || 'Process exited with non-zero code' : undefined,
      });
    });

    claude.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        exitCode: 1,
        output: stdout,
        error: err.message,
      });
    });
  });
}

/**
 * Extract file paths from agent output
 */
function extractFilesModified(output: string): string[] {
  const files: string[] = [];

  // Look for common patterns in Claude output
  const patterns = [
    /(?:Modified|Edited|Updated|Created|Changed)\s+[`"']?([^\s`"'\n]+\.[a-zA-Z]+)[`"']?/gi,
    /Writing to\s+([^\s\n]+)/gi,
    /File:\s+([^\s\n]+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(output)) !== null) {
      const file = match[1];
      if (file && !files.includes(file) && !file.startsWith('http')) {
        files.push(file);
      }
    }
  }

  return files;
}

/**
 * Extract commit hash from deploy output
 */
function extractCommitHash(output: string): string | undefined {
  const match = output.match(/\[([a-f0-9]{7,40})\]/i) ||
                output.match(/commit\s+([a-f0-9]{7,40})/i) ||
                output.match(/Deployed:\s+([a-f0-9]{7,40})/i);
  return match?.[1];
}

// Create and start the worker
let worker: Worker<BugFixJobData, BugFixJobResult> | null = null;

export function startBugFixWorker(): void {
  if (worker) {
    log.warn('Bug fix worker already running');
    return;
  }

  worker = new Worker<BugFixJobData, BugFixJobResult>('bug-fix', processBugFix, {
    connection,
    concurrency: 1, // Only one bug fix at a time
  });

  worker.on('completed', (job, result) => {
    log.info({ jobId: job.id, feedbackId: job.data.feedbackId, success: result.success }, 'Bug fix job completed');
  });

  worker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, feedbackId: job?.data.feedbackId, error: err.message }, 'Bug fix job failed');
  });

  log.info('Bug fix worker started');
}

export function stopBugFixWorker(): Promise<void> {
  if (!worker) {
    return Promise.resolve();
  }

  return worker.close().then(() => {
    worker = null;
    log.info('Bug fix worker stopped');
  });
}
