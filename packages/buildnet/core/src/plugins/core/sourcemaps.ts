/**
 * Sourcemaps Plugin
 *
 * Uploads sourcemaps to error tracking services (Sentry, etc.).
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import type { Plugin, BuildContext, BuildResult } from '../../types/index.js';

interface SourcemapsConfig {
  upload_to?: 'sentry' | 'rollbar' | 'bugsnag';
  sentry_dsn?: string;
  sentry_org?: string;
  sentry_project?: string;
  sentry_auth_token?: string;
  release_version?: string;
  delete_after_upload?: boolean;
}

const sourcemapsPlugin: Plugin = {
  name: 'sourcemaps',
  version: '1.0.0',
  hotSwappable: true,

  hooks: {
    'post-build': async (context: BuildContext, result?: BuildResult) => {
      if (!result?.success) {
        context.logger.debug('[sourcemaps] Skipping for failed build');
        return;
      }

      const config = (context.config?.plugins?.core?.sourcemaps?.config ?? {}) as SourcemapsConfig;

      if (!config.upload_to) {
        context.logger.debug('[sourcemaps] No upload destination configured');
        return;
      }

      context.logger.info(`[sourcemaps] Uploading to ${config.upload_to}...`);
      const startTime = Date.now();

      const distPath = join(context.workDir, 'dist');
      const sourcemapFiles = await findSourcemaps(distPath);

      if (sourcemapFiles.length === 0) {
        context.logger.info('[sourcemaps] No sourcemap files found');
        return;
      }

      context.logger.debug(`[sourcemaps] Found ${sourcemapFiles.length} sourcemap files`);

      try {
        switch (config.upload_to) {
          case 'sentry':
            await uploadToSentry(sourcemapFiles, config, context);
            break;
          case 'rollbar':
            await uploadToRollbar(sourcemapFiles, config, context);
            break;
          case 'bugsnag':
            await uploadToBugsnag(sourcemapFiles, config, context);
            break;
        }

        const duration = Date.now() - startTime;
        context.logger.info(
          `[sourcemaps] Uploaded ${sourcemapFiles.length} files in ${duration}ms`,
        );

        context.metrics.timing('sourcemaps_upload_duration_ms', duration);
        context.metrics.gauge('sourcemaps_files_uploaded', sourcemapFiles.length);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        context.logger.warn(`[sourcemaps] Upload failed: ${message}`);
        // Don't throw - sourcemap upload is optional
      }
    },
  },
};

async function findSourcemaps(dirPath: string): Promise<string[]> {
  const sourcemaps: string[] = [];

  async function scanDir(dir: string): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.map')) {
          sourcemaps.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist or not readable
    }
  }

  await scanDir(dirPath);
  return sourcemaps;
}

async function uploadToSentry(
  files: string[],
  config: SourcemapsConfig,
  context: BuildContext,
): Promise<void> {
  if (!config.sentry_auth_token || !config.sentry_org || !config.sentry_project) {
    throw new Error('Sentry configuration incomplete (need auth_token, org, project)');
  }

  const version = config.release_version ?? context.buildId;
  const baseUrl = 'https://sentry.io/api/0';

  // Create release
  const releaseUrl = `${baseUrl}/organizations/${config.sentry_org}/releases/`;
  const releaseResponse = await fetch(releaseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.sentry_auth_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version,
      projects: [config.sentry_project],
    }),
  });

  if (!releaseResponse.ok && releaseResponse.status !== 409) {
    // 409 = release already exists, which is OK
    throw new Error(`Failed to create Sentry release: ${releaseResponse.status}`);
  }

  // Upload each sourcemap
  for (const filePath of files) {
    const content = await readFile(filePath);
    const fileName = basename(filePath);
    const jsFileName = fileName.replace('.map', '');

    // Find corresponding JS file
    const jsFilePath = filePath.replace('.map', '');
    let jsContent: Buffer | null = null;
    try {
      const jsStat = await stat(jsFilePath);
      if (jsStat.isFile()) {
        jsContent = await readFile(jsFilePath);
      }
    } catch {
      // JS file not found
    }

    // Upload the sourcemap
    const uploadUrl = `${baseUrl}/organizations/${config.sentry_org}/releases/${version}/files/`;

    const formData = new FormData();
    formData.append('file', new Blob([content]), fileName);
    formData.append('name', `~/dist/assets/${fileName}`);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.sentry_auth_token}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      context.logger.warn(`[sourcemaps] Failed to upload ${fileName}: ${uploadResponse.status}`);
    } else {
      context.logger.debug(`[sourcemaps] Uploaded ${fileName}`);
    }
  }

  context.logger.info(`[sourcemaps] Sentry release ${version} created with ${files.length} files`);
}

async function uploadToRollbar(
  files: string[],
  config: SourcemapsConfig,
  context: BuildContext,
): Promise<void> {
  // Rollbar upload implementation
  context.logger.warn('[sourcemaps] Rollbar upload not yet implemented');
}

async function uploadToBugsnag(
  files: string[],
  config: SourcemapsConfig,
  context: BuildContext,
): Promise<void> {
  // Bugsnag upload implementation
  context.logger.warn('[sourcemaps] Bugsnag upload not yet implemented');
}

export default sourcemapsPlugin;
