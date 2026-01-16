/**
 * Admin Documentation Management Routes
 *
 * Provides API endpoints for browsing and editing markdown files:
 * - List files in docs/ and docs-plain/ directories
 * - Read file contents
 * - Create, update, and delete markdown files
 * - Search across documentation
 * - File metadata (size, modified date)
 *
 * SECURITY: All routes require admin authentication
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { loggers } from '../../lib/logger';

const log = loggers.http;

// ============================================
// SCHEMAS
// ============================================

const FilePathSchema = z.object({
  filePath: z.string().min(1).refine(
    (p) => !p.includes('..') && !p.startsWith('/'),
    { message: 'Invalid file path - no directory traversal allowed' }
  ),
});

const CreateFileSchema = z.object({
  filePath: z.string().min(1).refine(
    (p) => !p.includes('..') && !p.startsWith('/') && p.endsWith('.md'),
    { message: 'Invalid file path - must be a .md file without directory traversal' }
  ),
  content: z.string(),
});

const UpdateFileSchema = z.object({
  filePath: z.string().min(1).refine(
    (p) => !p.includes('..') && !p.startsWith('/'),
    { message: 'Invalid file path' }
  ),
  content: z.string(),
});

const SearchSchema = z.object({
  query: z.string().min(1).max(200),
  directory: z.enum(['docs', 'docs-plain', 'all']).default('all'),
});

const ListFilesSchema = z.object({
  directory: z.enum(['docs', 'docs-plain']).default('docs'),
  recursive: z.coerce.boolean().default(true),
});

// ============================================
// TYPES
// ============================================

interface FileInfo {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: string;
  children?: FileInfo[];
}

interface SearchResult {
  file: string;
  relativePath: string;
  directory: string;
  matches: {
    line: number;
    content: string;
    highlight: string;
  }[];
}

// ============================================
// HELPERS
// ============================================

const PROJECT_ROOT = process.env.PROJECT_ROOT || '/var/www/musclemap.me';
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const DOCS_PLAIN_DIR = path.join(PROJECT_ROOT, 'docs-plain');

const ALLOWED_DIRECTORIES = ['docs', 'docs-plain'];

function getBaseDir(directory: string): string {
  if (directory === 'docs') return DOCS_DIR;
  if (directory === 'docs-plain') return DOCS_PLAIN_DIR;
  throw new Error('Invalid directory');
}

async function getFileTree(dirPath: string, basePath: string, relativePath: string = ''): Promise<FileInfo[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files: FileInfo[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      // Skip hidden directories and node_modules
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

      const children = await getFileTree(fullPath, basePath, relPath);
      files.push({
        name: entry.name,
        path: fullPath,
        relativePath: relPath,
        isDirectory: true,
        children,
      });
    } else if (entry.name.endsWith('.md')) {
      const stats = await fs.stat(fullPath);
      files.push({
        name: entry.name,
        path: fullPath,
        relativePath: relPath,
        isDirectory: false,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      });
    }
  }

  // Sort: directories first, then files, both alphabetically
  return files.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

async function searchInFile(filePath: string, query: string, maxMatches = 10): Promise<SearchResult['matches']> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const matches: SearchResult['matches'] = [];
    const queryLower = query.toLowerCase();

    for (let i = 0; i < lines.length && matches.length < maxMatches; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      const index = lineLower.indexOf(queryLower);

      if (index !== -1) {
        // Create highlighted version
        const before = line.substring(0, index);
        const match = line.substring(index, index + query.length);
        const after = line.substring(index + query.length);

        matches.push({
          line: i + 1,
          content: line.substring(0, 200), // Truncate long lines
          highlight: `${before}**${match}**${after}`.substring(0, 200),
        });
      }
    }

    return matches;
  } catch {
    return [];
  }
}

async function searchDirectory(dirPath: string, query: string, dirName: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  async function scanDir(currentPath: string, relativePath: string = '') {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanDir(fullPath, relPath);
          }
        } else if (entry.name.endsWith('.md')) {
          const matches = await searchInFile(fullPath, query);
          if (matches.length > 0) {
            results.push({
              file: entry.name,
              relativePath: relPath,
              directory: dirName,
              matches,
            });
          }
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  await scanDir(dirPath);
  return results;
}

function validateFilePath(filePath: string, baseDir: string): string {
  // Resolve the path and ensure it's within the allowed directory
  const resolved = path.resolve(baseDir, filePath);
  if (!resolved.startsWith(baseDir)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

// ============================================
// ROUTES
// ============================================

export default async function adminDocsRoutes(fastify: FastifyInstance) {
  // All routes require admin authentication
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as unknown as { user?: { role?: string } }).user;
    if (!user || user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }
  });

  // ----------------------------------------
  // GET /admin/docs/list
  // List files in a documentation directory
  // ----------------------------------------
  fastify.get('/admin/docs/list', async (request, reply) => {
    try {
      const query = ListFilesSchema.parse(request.query);
      const baseDir = getBaseDir(query.directory);

      // Check if directory exists
      try {
        await fs.access(baseDir);
      } catch {
        return reply.send({
          files: [],
          directory: query.directory,
          basePath: baseDir,
        });
      }

      const files = await getFileTree(baseDir, baseDir);

      return reply.send({
        files,
        directory: query.directory,
        basePath: baseDir,
        totalFiles: countFiles(files),
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: err.errors });
      }
      log.error({ error: err }, 'Failed to list docs');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // GET /admin/docs/file
  // Read a specific file
  // ----------------------------------------
  fastify.get('/admin/docs/file', async (request, reply) => {
    try {
      const query = request.query as { filePath?: string; directory?: string };
      const filePath = z.string().min(1).parse(query.filePath);
      const directory = z.enum(['docs', 'docs-plain']).default('docs').parse(query.directory);

      const baseDir = getBaseDir(directory);
      const fullPath = validateFilePath(filePath, baseDir);

      // Read file
      const content = await fs.readFile(fullPath, 'utf-8');
      const stats = await fs.stat(fullPath);

      return reply.send({
        content,
        filePath,
        directory,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        createdAt: stats.birthtime.toISOString(),
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: err.errors });
      }
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return reply.status(404).send({ error: 'File not found' });
      }
      log.error({ error: err }, 'Failed to read file');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // POST /admin/docs/file
  // Create a new file
  // ----------------------------------------
  fastify.post('/admin/docs/file', async (request, reply) => {
    try {
      const body = CreateFileSchema.parse(request.body);
      const query = request.query as { directory?: string };
      const directory = z.enum(['docs', 'docs-plain']).default('docs').parse(query.directory);

      const baseDir = getBaseDir(directory);
      const fullPath = validateFilePath(body.filePath, baseDir);

      // Check if file already exists
      try {
        await fs.access(fullPath);
        return reply.status(409).send({ error: 'File already exists' });
      } catch {
        // File doesn't exist, good to create
      }

      // Ensure directory exists
      const dirPath = path.dirname(fullPath);
      await fs.mkdir(dirPath, { recursive: true });

      // Write file
      await fs.writeFile(fullPath, body.content, 'utf-8');

      log.info({ filePath: body.filePath, directory }, 'Doc file created');

      return reply.status(201).send({
        success: true,
        filePath: body.filePath,
        directory,
        message: 'File created successfully',
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: err.errors });
      }
      log.error({ error: err }, 'Failed to create file');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // PUT /admin/docs/file
  // Update an existing file
  // ----------------------------------------
  fastify.put('/admin/docs/file', async (request, reply) => {
    try {
      const body = UpdateFileSchema.parse(request.body);
      const query = request.query as { directory?: string };
      const directory = z.enum(['docs', 'docs-plain']).default('docs').parse(query.directory);

      const baseDir = getBaseDir(directory);
      const fullPath = validateFilePath(body.filePath, baseDir);

      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch {
        return reply.status(404).send({ error: 'File not found' });
      }

      // Write file
      await fs.writeFile(fullPath, body.content, 'utf-8');
      const stats = await fs.stat(fullPath);

      log.info({ filePath: body.filePath, directory }, 'Doc file updated');

      return reply.send({
        success: true,
        filePath: body.filePath,
        directory,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        message: 'File updated successfully',
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: err.errors });
      }
      log.error({ error: err }, 'Failed to update file');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // DELETE /admin/docs/file
  // Delete a file
  // ----------------------------------------
  fastify.delete('/admin/docs/file', async (request, reply) => {
    try {
      const query = request.query as { filePath?: string; directory?: string };
      const filePath = z.string().min(1).parse(query.filePath);
      const directory = z.enum(['docs', 'docs-plain']).default('docs').parse(query.directory);

      const baseDir = getBaseDir(directory);
      const fullPath = validateFilePath(filePath, baseDir);

      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch {
        return reply.status(404).send({ error: 'File not found' });
      }

      // Delete file
      await fs.unlink(fullPath);

      log.info({ filePath, directory }, 'Doc file deleted');

      return reply.send({
        success: true,
        filePath,
        directory,
        message: 'File deleted successfully',
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: err.errors });
      }
      log.error({ error: err }, 'Failed to delete file');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // GET /admin/docs/search
  // Search across documentation
  // ----------------------------------------
  fastify.get('/admin/docs/search', async (request, reply) => {
    try {
      const query = SearchSchema.parse(request.query);
      let results: SearchResult[] = [];

      if (query.directory === 'all' || query.directory === 'docs') {
        try {
          const docsResults = await searchDirectory(DOCS_DIR, query.query, 'docs');
          results = results.concat(docsResults);
        } catch {
          // Skip if directory doesn't exist
        }
      }

      if (query.directory === 'all' || query.directory === 'docs-plain') {
        try {
          const plainResults = await searchDirectory(DOCS_PLAIN_DIR, query.query, 'docs-plain');
          results = results.concat(plainResults);
        } catch {
          // Skip if directory doesn't exist
        }
      }

      // Sort by number of matches (most relevant first)
      results.sort((a, b) => b.matches.length - a.matches.length);

      return reply.send({
        query: query.query,
        directory: query.directory,
        results,
        totalMatches: results.reduce((acc, r) => acc + r.matches.length, 0),
        totalFiles: results.length,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: err.errors });
      }
      log.error({ error: err }, 'Search failed');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // GET /admin/docs/stats
  // Get documentation statistics
  // ----------------------------------------
  fastify.get('/admin/docs/stats', async (_request, reply) => {
    try {
      const stats = {
        docs: { files: 0, totalSize: 0, lastModified: null as string | null },
        docsPlain: { files: 0, totalSize: 0, lastModified: null as string | null },
      };

      // Count docs directory
      try {
        const docsFiles = await getFileTree(DOCS_DIR, DOCS_DIR);
        const docsStats = calculateStats(docsFiles);
        stats.docs = docsStats;
      } catch {
        // Directory doesn't exist
      }

      // Count docs-plain directory
      try {
        const plainFiles = await getFileTree(DOCS_PLAIN_DIR, DOCS_PLAIN_DIR);
        const plainStats = calculateStats(plainFiles);
        stats.docsPlain = plainStats;
      } catch {
        // Directory doesn't exist
      }

      return reply.send(stats);
    } catch (err) {
      log.error({ error: err }, 'Failed to get stats');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // POST /admin/docs/folder
  // Create a new folder
  // ----------------------------------------
  fastify.post('/admin/docs/folder', async (request, reply) => {
    try {
      const body = z.object({
        folderPath: z.string().min(1).refine(
          (p) => !p.includes('..') && !p.startsWith('/'),
          { message: 'Invalid folder path' }
        ),
      }).parse(request.body);
      const query = request.query as { directory?: string };
      const directory = z.enum(['docs', 'docs-plain']).default('docs').parse(query.directory);

      const baseDir = getBaseDir(directory);
      const fullPath = validateFilePath(body.folderPath, baseDir);

      // Create directory
      await fs.mkdir(fullPath, { recursive: true });

      log.info({ folderPath: body.folderPath, directory }, 'Doc folder created');

      return reply.status(201).send({
        success: true,
        folderPath: body.folderPath,
        directory,
        message: 'Folder created successfully',
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: err.errors });
      }
      log.error({ error: err }, 'Failed to create folder');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });
}

// Helper to count total files in tree
function countFiles(files: FileInfo[]): number {
  let count = 0;
  for (const file of files) {
    if (file.isDirectory && file.children) {
      count += countFiles(file.children);
    } else if (!file.isDirectory) {
      count++;
    }
  }
  return count;
}

// Helper to calculate stats from file tree
function calculateStats(files: FileInfo[]): { files: number; totalSize: number; lastModified: string | null } {
  let fileCount = 0;
  let totalSize = 0;
  let lastModified: Date | null = null;

  function traverse(items: FileInfo[]) {
    for (const item of items) {
      if (item.isDirectory && item.children) {
        traverse(item.children);
      } else if (!item.isDirectory) {
        fileCount++;
        totalSize += item.size || 0;
        if (item.modifiedAt) {
          const mod = new Date(item.modifiedAt);
          if (!lastModified || mod > lastModified) {
            lastModified = mod;
          }
        }
      }
    }
  }

  traverse(files);

  return {
    files: fileCount,
    totalSize,
    lastModified: lastModified ? lastModified.toISOString() : null,
  };
}
