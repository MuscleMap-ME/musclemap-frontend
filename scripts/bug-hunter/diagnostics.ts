/**
 * Diagnostics Engine
 * Analyze errors to determine root causes and suggest fixes
 */

import type {
  CapturedError,
  DiagnosedBug,
  RootCause,
  SuggestedFix,
  CodeChange,
  TestCase,
  Severity,
  BugCategory,
} from './types.js';
import { categorizeBug } from './error-collector.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// DIAGNOSTICS ENGINE
// ============================================================================

export class DiagnosticsEngine {
  private projectRoot: string;
  private patterns: DiagnosticPattern[];

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.patterns = DIAGNOSTIC_PATTERNS;
  }

  // ============================================================================
  // MAIN ANALYSIS
  // ============================================================================

  async analyze(error: CapturedError): Promise<DiagnosedBug> {
    const rootCause = await this.determineRootCause(error);
    const suggestedFix = await this.generateSuggestedFix(error, rootCause);
    const relatedBugs = this.findRelatedBugs(error);

    return {
      ...this.errorToBugReport(error),
      rootCause,
      suggestedFix,
      relatedBugs,
      affectedFiles: rootCause.file ? [rootCause.file] : [],
      affectedEndpoints: this.extractAffectedEndpoints(error),
    };
  }

  // ============================================================================
  // ROOT CAUSE ANALYSIS
  // ============================================================================

  private async determineRootCause(error: CapturedError): Promise<RootCause> {
    // Try pattern matching first
    for (const pattern of this.patterns) {
      if (pattern.matches(error)) {
        const result = await pattern.analyze(error, this.projectRoot);
        if (result.confidence > 0.5) {
          return result;
        }
      }
    }

    // Fallback to generic analysis
    return this.genericRootCauseAnalysis(error);
  }

  private async genericRootCauseAnalysis(error: CapturedError): Promise<RootCause> {
    const stackInfo = this.parseStackTrace(error.stack);
    const type = this.inferRootCauseType(error);

    return {
      type,
      file: stackInfo?.file || 'unknown',
      line: stackInfo?.line,
      column: stackInfo?.column,
      hypothesis: this.generateHypothesis(error),
      confidence: stackInfo ? 0.6 : 0.3,
      evidence: this.gatherEvidence(error),
      codeContext: stackInfo ? await this.getCodeContext(stackInfo.file, stackInfo.line) : undefined,
    };
  }

  private parseStackTrace(stack?: string): { file: string; line: number; column?: number } | null {
    if (!stack) return null;

    // Match patterns like:
    // at Component (src/components/Foo.tsx:42:15)
    // at src/pages/Dashboard.tsx:123:8
    const patterns = [
      /at\s+\w+\s+\((.+):(\d+):(\d+)\)/,
      /at\s+(.+):(\d+):(\d+)/,
      /\((.+\.(?:tsx?|jsx?)):(\d+):(\d+)\)/,
    ];

    for (const line of stack.split('\n')) {
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const file = match[1];
          // Skip node_modules
          if (file.includes('node_modules')) continue;
          return {
            file: file.replace(/^.*?(src\/)/, '$1'),
            line: parseInt(match[2], 10),
            column: match[3] ? parseInt(match[3], 10) : undefined,
          };
        }
      }
    }

    return null;
  }

  private inferRootCauseType(error: CapturedError): RootCause['type'] {
    if (error.type === 'network') {
      if (error.networkErrors.some((e) => e.url.includes('/api/'))) {
        return 'backend';
      }
      return 'integration';
    }

    if (error.type === 'graphql') {
      return 'backend';
    }

    if (error.message.includes('database') || error.message.includes('SQL')) {
      return 'database';
    }

    if (error.type === 'react' || error.type === 'console') {
      return 'frontend';
    }

    return 'frontend';
  }

  private generateHypothesis(error: CapturedError): string {
    const message = error.message.toLowerCase();

    // Null/undefined errors
    if (message.includes('cannot read property') || message.includes('undefined')) {
      return 'Variable is undefined when accessed. Likely missing null check or data not loaded yet.';
    }

    // Type errors
    if (message.includes('is not a function')) {
      return 'Method called on wrong type. Check that the object is initialized before calling methods.';
    }

    // Network errors
    if (error.type === 'network') {
      const status = error.networkErrors[0]?.status;
      if (status === 500) {
        return 'Server-side error. Check API logs and database queries.';
      }
      if (status === 404) {
        return 'Resource not found. Check if the endpoint exists and the ID is valid.';
      }
      if (status === 401 || status === 403) {
        return 'Authentication/authorization failure. Check token validity and permissions.';
      }
    }

    // React errors
    if (message.includes('react') || error.type === 'react') {
      if (message.includes('hook')) {
        return 'React hook usage violation. Ensure hooks are called at the top level of components.';
      }
      if (message.includes('render')) {
        return 'Render error. Check for infinite loops or invalid JSX.';
      }
    }

    return 'Unknown error. Manual investigation required.';
  }

  private gatherEvidence(error: CapturedError): string[] {
    const evidence: string[] = [];

    // Add console errors
    for (const consoleError of error.consoleErrors) {
      evidence.push(`Console ${consoleError.level}: ${consoleError.message}`);
    }

    // Add network errors
    for (const networkError of error.networkErrors) {
      evidence.push(`${networkError.method} ${networkError.url} - ${networkError.status} ${networkError.statusText}`);
    }

    // Add URL context
    evidence.push(`URL: ${error.url}`);

    return evidence;
  }

  private async getCodeContext(file: string, line?: number): Promise<string | undefined> {
    if (!line) return undefined;

    try {
      const fullPath = path.join(this.projectRoot, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      const start = Math.max(0, line - 5);
      const end = Math.min(lines.length, line + 5);

      return lines.slice(start, end).map((l, i) => {
        const lineNum = start + i + 1;
        const marker = lineNum === line ? '>>>' : '   ';
        return `${marker} ${lineNum}: ${l}`;
      }).join('\n');
    } catch {
      return undefined;
    }
  }

  // ============================================================================
  // FIX SUGGESTION
  // ============================================================================

  private async generateSuggestedFix(error: CapturedError, rootCause: RootCause): Promise<SuggestedFix> {
    // Try pattern-based fix first
    for (const pattern of this.patterns) {
      if (pattern.matches(error) && pattern.generateFix) {
        const fix = await pattern.generateFix(error, rootCause, this.projectRoot);
        if (fix.codeChanges.length > 0) {
          return fix;
        }
      }
    }

    // Generate generic fix
    return this.generateGenericFix(error, rootCause);
  }

  private async generateGenericFix(error: CapturedError, rootCause: RootCause): Promise<SuggestedFix> {
    const codeChanges: CodeChange[] = [];
    const message = error.message.toLowerCase();

    // Null check fix
    if (message.includes('cannot read property') || message.includes('undefined')) {
      if (rootCause.codeContext) {
        codeChanges.push({
          file: rootCause.file,
          oldCode: '', // Will be filled by auto-fixer
          newCode: '',
          description: 'Add null/undefined check before accessing property',
        });
      }
    }

    return {
      description: this.generateFixDescription(error, rootCause),
      codeChanges,
      testCase: this.generateTestCase(error),
      estimatedEffort: codeChanges.length > 0 ? 'simple' : 'moderate',
      riskLevel: rootCause.type === 'database' ? 'high' : 'low',
    };
  }

  private generateFixDescription(error: CapturedError, rootCause: RootCause): string {
    const message = error.message.toLowerCase();

    if (message.includes('cannot read property')) {
      return `Add null check in ${rootCause.file} before accessing the undefined property.`;
    }

    if (message.includes('is not a function')) {
      return `Verify the object type in ${rootCause.file} before calling the method.`;
    }

    if (error.type === 'network' && error.networkErrors[0]?.status === 500) {
      return `Fix server-side error in the API handler. Check ${rootCause.file} for database queries or business logic errors.`;
    }

    return `Investigate and fix the error in ${rootCause.file}. ${rootCause.hypothesis}`;
  }

  private generateTestCase(error: CapturedError): TestCase {
    return {
      name: `test_${error.id.slice(0, 8)}`,
      description: `Regression test for: ${error.message.slice(0, 100)}`,
      steps: [
        { action: 'navigate', target: error.url },
        { action: 'wait', timeout: 2000 },
      ],
      assertions: [
        { type: 'console_clean' },
        { type: 'visible', target: 'body' },
      ],
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private errorToBugReport(error: CapturedError): Omit<DiagnosedBug, 'rootCause' | 'suggestedFix' | 'relatedBugs' | 'affectedFiles' | 'affectedEndpoints'> {
    return {
      id: error.id,
      severity: error.severity,
      category: categorizeBug(error),
      title: this.generateTitle(error),
      description: this.generateDescription(error),
      stepsToReproduce: this.generateSteps(error),
      expectedBehavior: 'Page should load without errors',
      actualBehavior: error.message,
      screenshot: error.screenshot,
      consoleErrors: error.consoleErrors.map((e) => e.message),
      networkErrors: error.networkErrors.map((e) => `${e.method} ${e.url} - ${e.status}`),
      url: error.url,
      timestamp: error.timestamp,
      userAgent: error.userAgent,
      hash: error.hash || uuidv4(),
      occurrences: 1,
      firstSeen: error.timestamp,
      lastSeen: error.timestamp,
      fixStatus: 'pending',
      fixAttempts: 0,
    };
  }

  private generateTitle(error: CapturedError): string {
    const message = error.message.slice(0, 100);
    const urlPath = new URL(error.url).pathname;

    switch (error.type) {
      case 'blank_page':
        return `Blank page on ${urlPath}`;
      case 'network':
        return `${error.networkErrors[0]?.status || 'Network'} error on ${urlPath}`;
      case 'react':
        return `React error on ${urlPath}: ${message}`;
      case 'graphql':
        return `GraphQL error: ${message}`;
      default:
        return `Error on ${urlPath}: ${message}`;
    }
  }

  private generateDescription(error: CapturedError): string {
    let description = `**Error Type:** ${error.type}\n`;
    description += `**Severity:** ${error.severity}\n`;
    description += `**URL:** ${error.url}\n\n`;
    description += `**Error Message:**\n\`\`\`\n${error.message}\n\`\`\`\n\n`;

    if (error.stack) {
      description += `**Stack Trace:**\n\`\`\`\n${error.stack.slice(0, 1000)}\n\`\`\`\n`;
    }

    return description;
  }

  private generateSteps(error: CapturedError): string[] {
    return [
      `Navigate to ${error.url}`,
      'Wait for page to load',
      'Observe the error in console or on screen',
    ];
  }

  private findRelatedBugs(_error: CapturedError): string[] {
    // In a real implementation, this would search existing bugs
    return [];
  }

  private extractAffectedEndpoints(error: CapturedError): string[] {
    const endpoints: string[] = [];

    for (const networkError of error.networkErrors) {
      try {
        const url = new URL(networkError.url);
        if (url.pathname.startsWith('/api/')) {
          endpoints.push(url.pathname);
        }
      } catch {
        // Invalid URL
      }
    }

    return [...new Set(endpoints)];
  }
}

// ============================================================================
// DIAGNOSTIC PATTERNS
// ============================================================================

interface DiagnosticPattern {
  name: string;
  matches: (error: CapturedError) => boolean;
  analyze: (error: CapturedError, projectRoot: string) => Promise<RootCause>;
  generateFix?: (error: CapturedError, rootCause: RootCause, projectRoot: string) => Promise<SuggestedFix>;
}

const DIAGNOSTIC_PATTERNS: DiagnosticPattern[] = [
  // Pattern: Undefined property access
  {
    name: 'undefined_property',
    matches: (error) =>
      error.message.includes('Cannot read property') ||
      error.message.includes("Cannot read properties of undefined") ||
      error.message.includes("Cannot read properties of null"),
    analyze: async (error, projectRoot) => {
      const stackInfo = parseStack(error.stack);
      return {
        type: 'frontend',
        file: stackInfo?.file || 'unknown',
        line: stackInfo?.line,
        hypothesis: 'Attempting to access property on undefined/null value. Add optional chaining (?.) or null check.',
        confidence: 0.85,
        evidence: [error.message],
        codeContext: stackInfo ? await readCodeContext(projectRoot, stackInfo.file, stackInfo.line) : undefined,
      };
    },
    generateFix: async (error, rootCause) => {
      // Extract the property being accessed
      const match = error.message.match(/property '(\w+)'/);
      const property = match?.[1];

      return {
        description: `Add optional chaining (?.) before accessing '${property}' property`,
        codeChanges: rootCause.file ? [{
          file: rootCause.file,
          oldCode: '',
          newCode: '',
          description: `Add ?.${property} or null check`,
        }] : [],
        testCase: {
          name: `test_null_check_${property}`,
          description: 'Verify null check prevents crash',
          steps: [
            { action: 'navigate', target: error.url },
          ],
          assertions: [
            { type: 'console_clean' },
          ],
        },
        estimatedEffort: 'trivial',
        riskLevel: 'low',
      };
    },
  },

  // Pattern: 500 Server Error
  {
    name: 'server_error',
    matches: (error) =>
      error.networkErrors.some((e) => e.status >= 500),
    analyze: async (error) => {
      const serverError = error.networkErrors.find((e) => e.status >= 500);
      const endpoint = serverError ? new URL(serverError.url).pathname : 'unknown';

      return {
        type: 'backend',
        file: `apps/api/src/http/routes/${endpoint.split('/')[2] || 'unknown'}.ts`,
        hypothesis: 'Server-side error. Check API route handler, database queries, and error handling.',
        confidence: 0.7,
        evidence: [`${serverError?.status} ${serverError?.statusText}`, serverError?.responseBody || ''],
      };
    },
  },

  // Pattern: 404 Not Found
  {
    name: 'not_found',
    matches: (error) =>
      error.networkErrors.some((e) => e.status === 404),
    analyze: async (error) => {
      const notFoundError = error.networkErrors.find((e) => e.status === 404);
      const endpoint = notFoundError ? new URL(notFoundError.url).pathname : 'unknown';

      return {
        type: 'backend',
        file: `apps/api/src/http/routes/${endpoint.split('/')[2] || 'unknown'}.ts`,
        hypothesis: `Endpoint ${endpoint} not found. Check if route is registered or if resource exists.`,
        confidence: 0.8,
        evidence: [notFoundError?.url || endpoint],
      };
    },
  },

  // Pattern: React Hook violation
  {
    name: 'react_hook',
    matches: (error) =>
      error.message.includes('hook') && (
        error.message.includes('React') ||
        error.message.includes('rendered more hooks') ||
        error.message.includes('rendered fewer hooks')
      ),
    analyze: async (error, projectRoot) => {
      const stackInfo = parseStack(error.stack);
      return {
        type: 'frontend',
        file: stackInfo?.file || 'unknown',
        line: stackInfo?.line,
        hypothesis: 'React hook called conditionally or in wrong order. Move hooks to top level of component.',
        confidence: 0.9,
        evidence: [error.message],
        codeContext: stackInfo ? await readCodeContext(projectRoot, stackInfo.file, stackInfo.line) : undefined,
      };
    },
  },

  // Pattern: Chunk load failure
  {
    name: 'chunk_load',
    matches: (error) =>
      error.message.includes('ChunkLoadError') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('failed to fetch dynamically imported module'),
    analyze: async () => {
      return {
        type: 'configuration',
        file: 'vite.config.ts',
        hypothesis: 'Code splitting chunk failed to load. May be cache issue, network error, or deployment timing.',
        confidence: 0.75,
        evidence: ['Dynamic import failed', 'Possible stale cache'],
      };
    },
    generateFix: async () => ({
      description: 'Add error boundary with retry logic for lazy-loaded components',
      codeChanges: [],
      testCase: {
        name: 'test_chunk_retry',
        description: 'Verify chunk load retry',
        steps: [],
        assertions: [],
      },
      estimatedEffort: 'moderate',
      riskLevel: 'low',
    }),
  },

  // Pattern: GraphQL Error
  {
    name: 'graphql_error',
    matches: (error) =>
      error.type === 'graphql' ||
      error.message.includes('GraphQL'),
    analyze: async (error) => {
      return {
        type: 'backend',
        file: 'apps/api/src/graphql/resolvers.ts',
        hypothesis: 'GraphQL resolver error. Check resolver logic and data access.',
        confidence: 0.7,
        evidence: [error.message],
      };
    },
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseStack(stack?: string): { file: string; line: number; column?: number } | null {
  if (!stack) return null;

  const patterns = [
    /at\s+\w+\s+\((.+):(\d+):(\d+)\)/,
    /at\s+(.+):(\d+):(\d+)/,
    /\((.+\.(?:tsx?|jsx?)):(\d+):(\d+)\)/,
  ];

  for (const line of stack.split('\n')) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const file = match[1];
        if (file.includes('node_modules')) continue;
        return {
          file: file.replace(/^.*?(src\/)/, '$1').replace(/^.*?(apps\/)/, '$1'),
          line: parseInt(match[2], 10),
          column: match[3] ? parseInt(match[3], 10) : undefined,
        };
      }
    }
  }

  return null;
}

async function readCodeContext(projectRoot: string, file: string, line?: number): Promise<string | undefined> {
  if (!line) return undefined;

  try {
    const fullPath = path.join(projectRoot, file);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');

    const start = Math.max(0, line - 5);
    const end = Math.min(lines.length, line + 5);

    return lines.slice(start, end).map((l, i) => {
      const lineNum = start + i + 1;
      const marker = lineNum === line ? '>>>' : '   ';
      return `${marker} ${lineNum}: ${l}`;
    }).join('\n');
  } catch {
    return undefined;
  }
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export async function diagnoseError(error: CapturedError, projectRoot: string): Promise<DiagnosedBug> {
  const engine = new DiagnosticsEngine(projectRoot);
  return engine.analyze(error);
}

export async function diagnoseBatch(errors: CapturedError[], projectRoot: string): Promise<DiagnosedBug[]> {
  const engine = new DiagnosticsEngine(projectRoot);
  return Promise.all(errors.map((error) => engine.analyze(error)));
}
