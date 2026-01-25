/**
 * Public Plain Text Documentation Routes
 *
 * Provides public endpoints for serving documentation as plain text:
 * - /api/docs/plain - Combined documentation as plain text (for AI chatbots and screen readers)
 * - /api/docs/plain/index - Table of contents (JSON)
 * - /api/docs/plain/index.txt - Table of contents (plain text)
 * - /api/docs/plain/:file - Individual document as plain text
 *
 * NO AUTHENTICATION REQUIRED - these are public endpoints
 * Designed to be accessible by:
 * - AI assistants (Claude Chat, ChatGPT, etc.)
 * - Screen readers for accessibility
 * - Web crawlers for indexing
 * - Anyone who wants raw documentation
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { loggers } from '../../lib/logger';

const log = loggers.http;

// ============================================
// CONFIGURATION
// ============================================

const PROJECT_ROOT = process.env.PROJECT_ROOT || '/var/www/musclemap.me';
const DOCS_PUBLIC_DIR = path.join(PROJECT_ROOT, 'docs', 'public');

// Cache git info at startup (doesn't change during runtime)
let cachedGitInfo: { commitHash: string; commitDate: string } | null = null;

/**
 * Get git commit info for traceability
 */
function getGitInfo(): { commitHash: string; commitDate: string } {
  if (cachedGitInfo) return cachedGitInfo;

  try {
    const commitHash = execSync('git rev-parse --short HEAD', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
    }).trim();

    const commitDate = execSync('git log -1 --format=%ci', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
    }).trim();

    cachedGitInfo = { commitHash, commitDate };
    return cachedGitInfo;
  } catch {
    return { commitHash: 'unknown', commitDate: 'unknown' };
  }
}

/**
 * Format date with both UTC and a friendly timezone indicator
 */
function formatTimestamp(): string {
  const now = new Date();
  const utc = now.toISOString();
  // Also show Unix timestamp for unambiguous reference
  const unix = Math.floor(now.getTime() / 1000);
  return `${utc} (Unix: ${unix})`;
}
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');

// Documents to include in the combined output, in order
const CORE_DOCS = [
  // Public docs (user-facing)
  'public/index.md',
  'public/getting-started/README.md',
  'public/getting-started/onboarding-flow.md',
  'public/features/README.md',
  'public/features/muscle-system.md',
  'public/community/README.md',
  'public/guides/README.md',
  'public/api/README.md',

  // Core architecture (helpful for AI understanding)
  'ARCHITECTURE.md',
  'API_REFERENCE.md',
  'FEATURES.md',
  'SYSTEM-ARCHITECTURE.md',
  'DATA_MODEL.md',
  'STATE-MANAGEMENT.md',

  // User guides
  'USER_GUIDE.md',
  'PRIVACY_POLICY.md',
  'CONTRIBUTING.md',

  // Features documentation
  'CREDITS_ECONOMY.md',
  'SPIRIT-ANIMAL-SYSTEM.md',
  'EXTENSIBILITY.md',
  'PLUGINS.md',
];

// ============================================
// TYPES
// ============================================

interface DocFile {
  name: string;
  path: string;
  relativePath: string;
  title: string;
}

interface TableOfContents {
  title: string;
  generatedAt: string;
  gitCommit: string;
  gitCommitDate: string;
  totalDocs: number;
  sections: {
    name: string;
    docs: { title: string; path: string }[];
  }[];
}

// ============================================
// HELPERS
// ============================================

/**
 * Extract title from markdown content (first # heading)
 */
function extractTitle(content: string, filename: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) {
    return match[1].trim();
  }
  // Fallback to filename without extension
  return filename.replace(/\.md$/, '').replace(/[-_]/g, ' ');
}

/**
 * Strip markdown formatting for plain text output
 */
function stripMarkdown(content: string): string {
  return content
    // Remove code blocks but keep content
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/g, '').replace(/```/g, '');
      return '\n[Code]\n' + code + '\n[/Code]\n';
    })
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, '$1')
    // Convert headers to plain text with markers
    .replace(/^#{1,6}\s+(.+)$/gm, '\n=== $1 ===\n')
    // Remove bold/italic
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Convert links to plain text with URL
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[Image: $1]')
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Get all markdown files in a directory recursively
 */
async function getMarkdownFiles(dir: string, basePath: string = ''): Promise<DocFile[]> {
  const files: DocFile[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden and archive directories
        if (entry.name.startsWith('.') || entry.name === 'archive' || entry.name === 'legacy-system') {
          continue;
        }
        const subFiles = await getMarkdownFiles(fullPath, relativePath);
        files.push(...subFiles);
      } else if (entry.name.endsWith('.md')) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({
            name: entry.name,
            path: fullPath,
            relativePath,
            title: extractTitle(content, entry.name),
          });
        } catch {
          // Skip files we can't read
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return files;
}

/**
 * Build combined documentation string
 */
async function buildCombinedDocs(): Promise<string> {
  const sections: string[] = [];

  // Header
  const gitInfo = getGitInfo();

  sections.push('=' .repeat(60));
  sections.push('MUSCLEMAP DOCUMENTATION');
  sections.push('Plain Text Version for AI Assistants & Screen Readers');
  sections.push('=' .repeat(60));
  sections.push('');
  sections.push(`Generated: ${formatTimestamp()}`);
  sections.push(`Git Commit: ${gitInfo.commitHash} (${gitInfo.commitDate})`);
  sections.push(`Website: https://musclemap.me`);
  sections.push(`GitHub: https://github.com/jeanpaulniko/musclemap`);
  sections.push('');
  sections.push('-'.repeat(60));
  sections.push('');

  // Read core docs in order
  for (const docPath of CORE_DOCS) {
    const fullPath = path.join(DOCS_DIR, docPath);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const title = extractTitle(content, path.basename(docPath));

      sections.push('');
      sections.push('='.repeat(60));
      sections.push(`DOCUMENT: ${title}`);
      sections.push(`Path: ${docPath}`);
      sections.push('='.repeat(60));
      sections.push('');
      sections.push(stripMarkdown(content));
      sections.push('');
      sections.push('-'.repeat(60));
    } catch {
      // Skip files that don't exist
    }
  }

  // Footer
  sections.push('');
  sections.push('='.repeat(60));
  sections.push('END OF DOCUMENTATION');
  sections.push('='.repeat(60));
  sections.push('');
  sections.push('For the latest documentation, visit: https://musclemap.me/api/docs/plain');
  sections.push('For individual documents, use: https://musclemap.me/api/docs/plain<filename>');
  sections.push('');

  return sections.join('\n');
}

/**
 * Build table of contents
 */
async function buildTableOfContents(): Promise<TableOfContents> {
  const allFiles = await getMarkdownFiles(DOCS_DIR);

  // Group by directory
  const groups: Record<string, DocFile[]> = {};

  for (const file of allFiles) {
    const dir = path.dirname(file.relativePath);
    const groupName = dir === '.' ? 'Root' : dir.replace(/\//g, ' > ');
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(file);
  }

  // Sort groups and files
  const sections = Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, docs]) => ({
      name,
      docs: docs
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((d) => ({
          title: d.title,
          path: `/api/docs/plain/${d.relativePath.replace(/\.md$/, '')}`,
        })),
    }));

  const gitInfo = getGitInfo();

  return {
    title: 'MuscleMap Documentation Index',
    generatedAt: formatTimestamp(),
    gitCommit: gitInfo.commitHash,
    gitCommitDate: gitInfo.commitDate,
    totalDocs: allFiles.length,
    sections,
  };
}

// ============================================
// ROUTES
// ============================================

export function registerDocsPlainRoutes(fastify: FastifyInstance): void {
  /**
   * GET /api/docs/plain
   * Combined documentation as plain text
   * This is the main endpoint for AI assistants
   *
   * Also available at: https://musclemap.me/api/docs/plain (static HTML version)
   */
  fastify.get('/docs/plain', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const combinedDocs = await buildCombinedDocs();

      return reply
        .header('Content-Type', 'text/plain; charset=utf-8')
        .header('Cache-Control', 'public, max-age=3600') // Cache for 1 hour
        .header('X-Robots-Tag', 'noindex') // Don't index this in search engines
        .send(combinedDocs);
    } catch (err) {
      log.error({ error: err }, 'Failed to build combined docs');
      return reply
        .status(500)
        .header('Content-Type', 'text/plain')
        .send('Error generating documentation');
    }
  });

  /**
   * GET /api/docs/plain/index
   * Table of contents as JSON (for programmatic access)
   */
  fastify.get('/docs/plain/index', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const toc = await buildTableOfContents();
      return reply.send(toc);
    } catch (err) {
      log.error({ error: err }, 'Failed to build table of contents');
      return reply.status(500).send({ error: 'Failed to generate index' });
    }
  });

  /**
   * GET /api/docs/plain/index.txt
   * Table of contents as plain text
   */
  fastify.get('/api/docs/plain/index.txt', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const toc = await buildTableOfContents();

      const lines: string[] = [];
      lines.push('='.repeat(60));
      lines.push('MUSCLEMAP DOCUMENTATION INDEX');
      lines.push('='.repeat(60));
      lines.push('');
      lines.push(`Total documents: ${toc.totalDocs}`);
      lines.push(`Generated: ${toc.generatedAt}`);
      lines.push(`Git Commit: ${toc.gitCommit} (${toc.gitCommitDate})`);
      lines.push('');

      for (const section of toc.sections) {
        lines.push('');
        lines.push(`--- ${section.name} ---`);
        for (const doc of section.docs) {
          lines.push(`  • ${doc.title}`);
          lines.push(`    URL: https://musclemap.me${doc.path}`);
        }
      }

      lines.push('');
      lines.push('='.repeat(60));
      lines.push('For combined docs: https://musclemap.me/api/docs/plain');
      lines.push('='.repeat(60));

      return reply
        .header('Content-Type', 'text/plain; charset=utf-8')
        .header('Cache-Control', 'public, max-age=3600')
        .send(lines.join('\n'));
    } catch (err) {
      log.error({ error: err }, 'Failed to build table of contents');
      return reply
        .status(500)
        .header('Content-Type', 'text/plain')
        .send('Error generating index');
    }
  });

  /**
   * GET /api/docs/plain/:path
   * Individual document as plain text
   */
  fastify.get('/docs/plain/*', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as { '*': string };
      const requestedPath = params['*'];

      // Skip if it's one of our special routes
      if (requestedPath === 'index' || requestedPath === 'index.txt' || requestedPath === '') {
        return reply.callNotFound();
      }

      // Sanitize path - prevent directory traversal
      const sanitized = requestedPath.replace(/\.\./g, '').replace(/\/+/g, '/');

      // Try with .md extension
      let filePath = path.join(DOCS_DIR, sanitized);
      if (!filePath.endsWith('.md')) {
        filePath += '.md';
      }

      // Security check - ensure path is within docs directory
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(DOCS_DIR)) {
        return reply
          .status(403)
          .header('Content-Type', 'text/plain')
          .send('Access denied: Invalid path');
      }

      // Read file
      const content = await fs.readFile(resolved, 'utf-8');
      const title = extractTitle(content, path.basename(sanitized));

      // Build plain text output
      const lines: string[] = [];
      lines.push('='.repeat(60));
      lines.push(`DOCUMENT: ${title}`);
      lines.push('='.repeat(60));
      lines.push('');
      lines.push(`Source: https://musclemap.me/api/docs/plain${sanitized}`);
      lines.push(`Full docs: https://musclemap.me/api/docs/plain`);
      lines.push('');
      lines.push('-'.repeat(60));
      lines.push('');
      lines.push(stripMarkdown(content));
      lines.push('');
      lines.push('-'.repeat(60));
      lines.push('');

      return reply
        .header('Content-Type', 'text/plain; charset=utf-8')
        .header('Cache-Control', 'public, max-age=3600')
        .send(lines.join('\n'));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return reply
          .status(404)
          .header('Content-Type', 'text/plain')
          .send('Document not found');
      }
      log.error({ error: err }, 'Failed to read document');
      return reply
        .status(500)
        .header('Content-Type', 'text/plain')
        .send('Error reading document');
    }
  });
}
