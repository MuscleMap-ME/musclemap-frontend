/**
 * Compress Plugin
 *
 * Compresses build artifacts with gzip and brotli.
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { gzip, brotliCompress } from 'node:zlib';
import { promisify } from 'node:util';
import type { Plugin, BuildContext, BuildResult } from '../../types/index.js';

const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);

// File extensions to compress
const COMPRESSIBLE_EXTENSIONS = new Set([
  '.js',
  '.css',
  '.html',
  '.json',
  '.svg',
  '.xml',
  '.txt',
  '.map',
  '.mjs',
  '.cjs',
]);

// Minimum size to compress (10KB)
const MIN_SIZE_BYTES = 10 * 1024;

interface CompressStats {
  filesProcessed: number;
  totalOriginalSize: number;
  totalGzipSize: number;
  totalBrotliSize: number;
}

const compressPlugin: Plugin = {
  name: 'compress',
  version: '1.0.0',
  hotSwappable: true,

  hooks: {
    'post-build': async (context: BuildContext, result?: BuildResult) => {
      if (!result?.success) {
        context.logger.debug('[compress] Skipping compression for failed build');
        return;
      }

      context.logger.info('[compress] Compressing build artifacts...');
      const startTime = Date.now();

      const distPath = join(context.workDir, 'dist');
      const stats: CompressStats = {
        filesProcessed: 0,
        totalOriginalSize: 0,
        totalGzipSize: 0,
        totalBrotliSize: 0,
      };

      try {
        await compressDirectory(distPath, stats, context);

        const duration = Date.now() - startTime;
        const gzipRatio = stats.totalOriginalSize
          ? ((stats.totalGzipSize / stats.totalOriginalSize) * 100).toFixed(1)
          : 0;
        const brotliRatio = stats.totalOriginalSize
          ? ((stats.totalBrotliSize / stats.totalOriginalSize) * 100).toFixed(1)
          : 0;

        context.logger.info(
          `[compress] Completed in ${duration}ms: ${stats.filesProcessed} files ` +
            `(gzip: ${gzipRatio}%, brotli: ${brotliRatio}%)`,
        );

        // Update artifact info in result
        if (result.artifacts) {
          for (const artifact of result.artifacts) {
            // Find matching compressed stats
            artifact.compressed = {
              gzip_size: Math.round(artifact.size_bytes * (Number(gzipRatio) / 100)),
              brotli_size: Math.round(artifact.size_bytes * (Number(brotliRatio) / 100)),
            };
          }
        }

        context.metrics.timing('compress_duration_ms', duration);
        context.metrics.gauge('compress_files_count', stats.filesProcessed);
        context.metrics.gauge('compress_original_bytes', stats.totalOriginalSize);
        context.metrics.gauge('compress_gzip_bytes', stats.totalGzipSize);
        context.metrics.gauge('compress_brotli_bytes', stats.totalBrotliSize);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        context.logger.warn(`[compress] Failed: ${message}`);
        // Don't throw - compression is optional
      }
    },
  },
};

async function compressDirectory(
  dirPath: string,
  stats: CompressStats,
  context: BuildContext,
): Promise<void> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await compressDirectory(fullPath, stats, context);
      } else if (entry.isFile()) {
        await compressFile(fullPath, stats, context);
      }
    }
  } catch (error) {
    // Directory doesn't exist or not readable
    context.logger.debug(`[compress] Cannot read directory: ${dirPath}`);
  }
}

async function compressFile(
  filePath: string,
  stats: CompressStats,
  context: BuildContext,
): Promise<void> {
  const ext = extname(filePath).toLowerCase();

  // Skip non-compressible extensions
  if (!COMPRESSIBLE_EXTENSIONS.has(ext)) {
    return;
  }

  // Skip already compressed files
  if (filePath.endsWith('.gz') || filePath.endsWith('.br')) {
    return;
  }

  try {
    const fileStat = await stat(filePath);

    // Skip small files
    if (fileStat.size < MIN_SIZE_BYTES) {
      return;
    }

    const content = await readFile(filePath);
    stats.totalOriginalSize += content.length;

    // Gzip compression
    const gzipped = await gzipAsync(content, { level: 9 });
    await writeFile(`${filePath}.gz`, gzipped);
    stats.totalGzipSize += gzipped.length;

    // Brotli compression
    const brotlied = await brotliAsync(content);
    await writeFile(`${filePath}.br`, brotlied);
    stats.totalBrotliSize += brotlied.length;

    stats.filesProcessed++;

    context.logger.debug(
      `[compress] ${filePath}: ${formatBytes(content.length)} → ` +
        `gzip: ${formatBytes(gzipped.length)}, brotli: ${formatBytes(brotlied.length)}`,
    );
  } catch (error) {
    context.logger.debug(`[compress] Failed to compress ${filePath}: ${error}`);
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default compressPlugin;
