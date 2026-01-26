/**
 * TypeCheck Plugin
 *
 * Runs TypeScript type checking before builds.
 */

import type { Plugin, BuildContext } from '../../types/index.js';

const typecheckPlugin: Plugin = {
  name: 'typecheck',
  version: '1.0.0',
  hotSwappable: true,

  hooks: {
    'pre-build': async (context: BuildContext) => {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);

      context.logger.info('[typecheck] Running TypeScript type check...');
      const startTime = Date.now();

      try {
        const { stdout, stderr } = await execAsync('pnpm typecheck', {
          cwd: context.workDir,
          env: { ...process.env, ...context.env },
          maxBuffer: 50 * 1024 * 1024,
        });

        const duration = Date.now() - startTime;

        if (stdout && stdout.trim()) {
          context.logger.debug(`[typecheck] ${stdout.trim()}`);
        }

        // TypeScript outputs to stderr, but that doesn't mean error
        if (stderr && stderr.trim()) {
          // Check for actual errors in the output
          const hasErrors =
            stderr.includes('error TS') ||
            stderr.includes('Error:') ||
            stderr.includes('error:');

          if (hasErrors) {
            context.logger.error(`[typecheck] TypeScript errors found:\n${stderr}`);
            throw new Error('TypeScript type check failed');
          } else {
            context.logger.debug(`[typecheck] ${stderr.trim()}`);
          }
        }

        context.logger.info(`[typecheck] Completed in ${duration}ms (0 errors)`);

        context.metrics.timing('typecheck_duration_ms', duration);
        context.metrics.gauge('typecheck_errors', 0);
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        context.metrics.timing('typecheck_duration_ms', duration);

        // Parse error count from TypeScript output if available
        const errorOutput = error instanceof Error ? error.message : String(error);
        const errorMatch = errorOutput.match(/Found (\d+) error/);
        const errorCount = errorMatch ? parseInt(errorMatch[1], 10) : 1;

        context.metrics.gauge('typecheck_errors', errorCount);
        context.logger.error(`[typecheck] Failed with ${errorCount} error(s)`);

        throw error;
      }
    },
  },
};

export default typecheckPlugin;
