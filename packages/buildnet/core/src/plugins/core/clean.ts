/**
 * Clean Plugin
 *
 * Removes build artifacts before builds.
 */

import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { Plugin, BuildContext } from '../../types/index.js';

const cleanPlugin: Plugin = {
  name: 'clean',
  version: '1.0.0',
  hotSwappable: true,

  hooks: {
    'pre-build': async (context: BuildContext) => {
      context.logger.info('[clean] Cleaning build artifacts...');
      const startTime = Date.now();

      const pathsToClean = [
        join(context.workDir, 'dist'),
        join(context.workDir, '.buildnet-cache'),
      ];

      let cleanedCount = 0;

      for (const path of pathsToClean) {
        try {
          await rm(path, { recursive: true, force: true });
          cleanedCount++;
          context.logger.debug(`[clean] Removed: ${path}`);
        } catch (error) {
          // Ignore errors - directory might not exist
          context.logger.debug(`[clean] Could not remove ${path}: ${error}`);
        }
      }

      const duration = Date.now() - startTime;
      context.logger.info(`[clean] Completed in ${duration}ms (${cleanedCount} paths cleaned)`);

      context.metrics.timing('clean_duration_ms', duration);
      context.metrics.gauge('clean_paths_removed', cleanedCount);
    },
  },
};

export default cleanPlugin;
