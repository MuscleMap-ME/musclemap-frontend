/**
 * Learning System
 * Learn from successful fixes to improve future auto-fixing
 */

import type { DiagnosedBug, FixResult, FixPattern, CodeChange, CapturedError } from './types.js';
import type { BugHunterConfig } from './config.js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// ============================================================================
// LEARNING SYSTEM CLASS
// ============================================================================

export class LearningSystem {
  private projectRoot: string;
  private config: BugHunterConfig;
  private patterns: FixPattern[] = [];
  private patternsLoaded: boolean = false;

  constructor(projectRoot: string, config: BugHunterConfig) {
    this.projectRoot = projectRoot;
    this.config = config;
  }

  // ============================================================================
  // PATTERN MANAGEMENT
  // ============================================================================

  async loadPatterns(): Promise<void> {
    if (this.patternsLoaded) return;

    const patternsPath = path.join(this.config.dataDir, 'patterns.json');

    try {
      const content = await fs.readFile(patternsPath, 'utf-8');
      this.patterns = JSON.parse(content);
      this.patternsLoaded = true;
      console.log(`   📚 Loaded ${this.patterns.length} fix patterns`);
    } catch {
      // No patterns file yet
      this.patterns = [...DEFAULT_PATTERNS];
      this.patternsLoaded = true;
    }
  }

  async savePatterns(): Promise<void> {
    const patternsPath = path.join(this.config.dataDir, 'patterns.json');

    await fs.mkdir(path.dirname(patternsPath), { recursive: true });
    await fs.writeFile(patternsPath, JSON.stringify(this.patterns, null, 2));
  }

  // ============================================================================
  // PATTERN LEARNING
  // ============================================================================

  async learnFromSuccess(bug: DiagnosedBug, result: FixResult): Promise<void> {
    await this.loadPatterns();

    // Extract pattern from the successful fix
    const pattern = await this.extractPattern(bug, result);
    if (!pattern) return;

    // Check if similar pattern exists
    const existingIndex = this.patterns.findIndex(p =>
      p.errorPattern === pattern.errorPattern && p.errorType === pattern.errorType
    );

    if (existingIndex >= 0) {
      // Update existing pattern
      const existing = this.patterns[existingIndex];
      existing.successRate = (existing.successRate * existing.timesUsed + 1) / (existing.timesUsed + 1);
      existing.timesUsed++;
      existing.lastUsed = new Date().toISOString();
    } else {
      // Add new pattern
      this.patterns.push(pattern);
      console.log(`   📚 Learned new fix pattern: ${pattern.id}`);
    }

    await this.savePatterns();
  }

  async learnFromFailure(bug: DiagnosedBug, result: FixResult): Promise<void> {
    await this.loadPatterns();

    // Find pattern that was used
    const usedPattern = this.findMatchingPattern(bug);
    if (!usedPattern) return;

    // Decrease success rate
    usedPattern.successRate = (usedPattern.successRate * usedPattern.timesUsed) / (usedPattern.timesUsed + 1);
    usedPattern.timesUsed++;
    usedPattern.lastUsed = new Date().toISOString();

    await this.savePatterns();
  }

  // ============================================================================
  // PATTERN EXTRACTION
  // ============================================================================

  private async extractPattern(bug: DiagnosedBug, result: FixResult): Promise<FixPattern | null> {
    if (result.filesChanged.length === 0) return null;

    // Generate error pattern regex from the error message
    const errorPattern = this.generateErrorPattern(bug.actualBehavior);
    if (!errorPattern) return null;

    // Determine fix template
    const fixTemplate = await this.extractFixTemplate(bug, result);
    if (!fixTemplate) return null;

    return {
      id: crypto.randomUUID().slice(0, 8),
      errorPattern,
      errorType: this.mapErrorType(bug),
      fixTemplate,
      successRate: 1.0,
      timesUsed: 1,
      lastUsed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  private generateErrorPattern(message: string): string | null {
    // Remove specific values to create generalizable pattern
    let pattern = message
      // Remove specific strings/values
      .replace(/'[^']+'/g, "'([^']+)'")
      .replace(/"[^"]+"/g, '"([^"]+)"')
      // Remove specific numbers
      .replace(/\b\d+\b/g, '\\d+')
      // Remove specific file paths
      .replace(/\/[\w/.]+\.(tsx?|jsx?)/g, '/[\\w/.]+\\.\\w+')
      // Escape regex special chars
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Make sure it's a valid regex
    try {
      new RegExp(pattern);
      return pattern;
    } catch {
      return null;
    }
  }

  private async extractFixTemplate(bug: DiagnosedBug, result: FixResult): Promise<FixPattern['fixTemplate'] | null> {
    // Get the diff of the fix
    const codeChanges = bug.suggestedFix.codeChanges;

    if (codeChanges.length === 0) {
      return {
        description: bug.suggestedFix.description,
        filePatterns: result.filesChanged.map(f => this.generalizeFilePath(f)),
        codeTransform: {
          type: 'replace',
          searchPattern: '',
          replacement: '',
        },
      };
    }

    const firstChange = codeChanges[0];

    return {
      description: firstChange.description,
      filePatterns: [this.generalizeFilePath(firstChange.file)],
      codeTransform: {
        type: 'replace',
        searchPattern: this.generalizeCodePattern(firstChange.oldCode),
        replacement: firstChange.newCode,
      },
    };
  }

  private generalizeFilePath(filePath: string): string {
    // Convert specific file paths to glob patterns
    return filePath
      .replace(/\/\w+\.tsx?$/, '/**/*.ts*')
      .replace(/\/\w+\.jsx?$/, '/**/*.js*');
  }

  private generalizeCodePattern(code: string): string {
    // Generalize code pattern for matching
    return code
      .replace(/\w+(?=\s*[=:])/g, '\\w+')  // Variable names
      .replace(/['"][^'"]+['"]/g, '[\'"][^\'"]+[\'"]');  // String literals
  }

  private mapErrorType(bug: DiagnosedBug): CapturedError['type'] {
    switch (bug.category) {
      case 'crash':
        return 'react';
      case 'network':
        return 'network';
      case 'ui':
        return 'blank_page';
      default:
        return 'console';
    }
  }

  // ============================================================================
  // PATTERN MATCHING
  // ============================================================================

  async suggestFix(error: CapturedError): Promise<CodeChange[] | null> {
    await this.loadPatterns();

    const matchingPattern = this.findMatchingPatternForError(error);
    if (!matchingPattern) return null;

    // Only use patterns with >50% success rate
    if (matchingPattern.successRate < 0.5) return null;

    return this.applyFixTemplate(matchingPattern.fixTemplate, error);
  }

  findMatchingPattern(bug: DiagnosedBug): FixPattern | undefined {
    return this.patterns
      .filter(p => this.patternMatches(p, bug.actualBehavior, bug))
      .sort((a, b) => b.successRate - a.successRate)[0];
  }

  private findMatchingPatternForError(error: CapturedError): FixPattern | undefined {
    return this.patterns
      .filter(p => this.patternMatchesError(p, error))
      .sort((a, b) => b.successRate - a.successRate)[0];
  }

  private patternMatches(pattern: FixPattern, message: string, bug: DiagnosedBug): boolean {
    try {
      const regex = new RegExp(pattern.errorPattern, 'i');
      if (!regex.test(message)) return false;

      // Also check error type matches
      const bugType = this.mapErrorType(bug);
      return pattern.errorType === bugType;
    } catch {
      return false;
    }
  }

  private patternMatchesError(pattern: FixPattern, error: CapturedError): boolean {
    try {
      const regex = new RegExp(pattern.errorPattern, 'i');
      if (!regex.test(error.message)) return false;

      return pattern.errorType === error.type;
    } catch {
      return false;
    }
  }

  private applyFixTemplate(template: FixPattern['fixTemplate'], error: CapturedError): CodeChange[] | null {
    // This is a simplified implementation
    // A real implementation would need more sophisticated code analysis

    if (!template.codeTransform.searchPattern) return null;

    // We can't know the exact file without more analysis
    // Return a generic change that the auto-fixer will need to locate
    return [{
      file: template.filePatterns[0] || 'unknown',
      oldCode: template.codeTransform.searchPattern,
      newCode: template.codeTransform.replacement,
      description: template.description,
    }];
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  getPatternStats(): PatternStats {
    return {
      totalPatterns: this.patterns.length,
      totalUsages: this.patterns.reduce((sum, p) => sum + p.timesUsed, 0),
      avgSuccessRate: this.patterns.length > 0
        ? this.patterns.reduce((sum, p) => sum + p.successRate, 0) / this.patterns.length
        : 0,
      mostUsedPatterns: [...this.patterns]
        .sort((a, b) => b.timesUsed - a.timesUsed)
        .slice(0, 5)
        .map(p => ({ id: p.id, timesUsed: p.timesUsed, successRate: p.successRate })),
      mostSuccessfulPatterns: [...this.patterns]
        .filter(p => p.timesUsed >= 3)  // Only patterns with enough data
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 5)
        .map(p => ({ id: p.id, timesUsed: p.timesUsed, successRate: p.successRate })),
    };
  }

  // ============================================================================
  // PATTERN CLEANUP
  // ============================================================================

  async pruneUnusedPatterns(maxAgeDays: number = 30): Promise<number> {
    await this.loadPatterns();

    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const originalCount = this.patterns.length;

    this.patterns = this.patterns.filter(p => {
      const lastUsed = new Date(p.lastUsed).getTime();
      return lastUsed > cutoff || p.timesUsed >= 5;  // Keep frequently used patterns
    });

    const prunedCount = originalCount - this.patterns.length;

    if (prunedCount > 0) {
      await this.savePatterns();
      console.log(`   📚 Pruned ${prunedCount} unused patterns`);
    }

    return prunedCount;
  }

  async pruneLowSuccessPatterns(minSuccessRate: number = 0.3, minUsages: number = 5): Promise<number> {
    await this.loadPatterns();

    const originalCount = this.patterns.length;

    this.patterns = this.patterns.filter(p => {
      // Keep patterns that haven't been used enough to judge
      if (p.timesUsed < minUsages) return true;
      // Keep patterns with acceptable success rate
      return p.successRate >= minSuccessRate;
    });

    const prunedCount = originalCount - this.patterns.length;

    if (prunedCount > 0) {
      await this.savePatterns();
      console.log(`   📚 Pruned ${prunedCount} low-success patterns`);
    }

    return prunedCount;
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface PatternStats {
  totalPatterns: number;
  totalUsages: number;
  avgSuccessRate: number;
  mostUsedPatterns: Array<{ id: string; timesUsed: number; successRate: number }>;
  mostSuccessfulPatterns: Array<{ id: string; timesUsed: number; successRate: number }>;
}

// ============================================================================
// DEFAULT PATTERNS
// ============================================================================

const DEFAULT_PATTERNS: FixPattern[] = [
  {
    id: 'null-check-1',
    errorPattern: "Cannot read propert(y|ies) of (undefined|null)",
    errorType: 'console',
    fixTemplate: {
      description: 'Add optional chaining operator',
      filePatterns: ['src/**/*.tsx', 'src/**/*.ts'],
      codeTransform: {
        type: 'replace',
        searchPattern: '(\\w+)\\.(\\w+)',
        replacement: '$1?.$2',
      },
    },
    successRate: 0.8,
    timesUsed: 0,
    lastUsed: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'array-map-check',
    errorPattern: "(map|filter|reduce|forEach) is not a function",
    errorType: 'console',
    fixTemplate: {
      description: 'Add array check before iteration',
      filePatterns: ['src/**/*.tsx', 'src/**/*.ts'],
      codeTransform: {
        type: 'replace',
        searchPattern: '(\\w+)\\.(map|filter|reduce|forEach)',
        replacement: '($1 || []).$2',
      },
    },
    successRate: 0.75,
    timesUsed: 0,
    lastUsed: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'async-await-missing',
    errorPattern: "Cannot read propert(y|ies).*Promise",
    errorType: 'console',
    fixTemplate: {
      description: 'Add await to async function call',
      filePatterns: ['src/**/*.tsx', 'src/**/*.ts'],
      codeTransform: {
        type: 'insert_before',
        searchPattern: '(\\w+)\\((.*?)\\)',
        replacement: 'await $1($2)',
      },
    },
    successRate: 0.7,
    timesUsed: 0,
    lastUsed: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usestate-undefined',
    errorPattern: "useState.*undefined",
    errorType: 'react',
    fixTemplate: {
      description: 'Add default value to useState',
      filePatterns: ['src/**/*.tsx'],
      codeTransform: {
        type: 'replace',
        searchPattern: 'useState\\(\\)',
        replacement: 'useState([])',
      },
    },
    successRate: 0.65,
    timesUsed: 0,
    lastUsed: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export function createLearningSystem(projectRoot: string, config: BugHunterConfig): LearningSystem {
  return new LearningSystem(projectRoot, config);
}
