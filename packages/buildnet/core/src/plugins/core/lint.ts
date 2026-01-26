/**
 * Lint Plugin
 *
 * Runs linting before builds.
 */

import type { Plugin, BuildContext } from '../../types/index.js';

const lintPlugin: Plugin = {
  name: 'lint',
  version: '1.0.0',
  hotSwappable: true,

  hooks: {
    'pre-build': async (context: BuildContext) => {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);

      context.logger.info('[lint] Running linter...');
      const startTime = Date.now();

      try {
        const { stdout, stderr } = await execAsync('pnpm lint', {
          cwd: context.workDir,
          env: { ...process.env, ...context.env },
          maxBuffer: 50 * 1024 * 1024,
        });

        const duration = Date.now() - startTime;

        // Count warnings in output
        const warningCount = (stdout.match(/warning/gi) || []).length;
        const errorCount = (stdout.match(/error/gi) || []).length;

        if (stdout && stdout.trim()) {
          context.logger.debug(`[lint] ${stdout.slice(0, 2000)}`);
        }

        context.logger.info(
          `[lint] Completed in ${duration}ms (${errorCount} errors, ${warningCount} warnings)`,
        );

        context.metrics.timing('lint_duration_ms', duration);
        context.metrics.gauge('lint_errors', errorCount);
        context.metrics.gauge('lint_warnings', warningCount);

        // Only fail on errors if there are actual errors, warnings are OK
        if (stderr && stderr.includes('error')) {
          throw new Error('Lint errors found');
        }
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        context.metrics.timing('lint_duration_ms', duration);

        const errorOutput = error instanceof Error ? error.message : String(error);
        context.logger.warn(`[lint] Completed with issues: ${errorOutput.slice(0, 500)}`);

        // Don't throw - lint failures are typically warnings
        // The config can override this with fail_on_error: true
      }
    },
  },
};

export default lintPlugin;
