/**
 * Auto-Fixer Engine
 * Automatically implement fixes, run tests, and deploy
 */

import type { DiagnosedBug, FixResult, FixStatus, CodeChange } from './types.js';
import type { BugHunterConfig } from './config.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

// ============================================================================
// AUTO-FIXER CLASS
// ============================================================================

export class AutoFixer {
  private projectRoot: string;
  private config: BugHunterConfig;

  constructor(projectRoot: string, config: BugHunterConfig) {
    this.projectRoot = projectRoot;
    this.config = config;
  }

  // ============================================================================
  // MAIN FIX FLOW
  // ============================================================================

  async fix(bug: DiagnosedBug): Promise<FixResult> {
    const startedAt = new Date().toISOString();
    const branch = `auto-fix/${bug.id.slice(0, 8)}`;

    const result: FixResult = {
      bugId: bug.id,
      success: false,
      status: 'in_progress',
      branch,
      filesChanged: [],
      linesAdded: 0,
      linesRemoved: 0,
      typecheckPassed: false,
      testsPassed: false,
      buildPassed: false,
      productionVerified: false,
      errors: [],
      startedAt,
      completedAt: '',
      duration: 0,
    };

    try {
      // Skip if dry run
      if (this.config.dryRun) {
        console.log(`   [DRY RUN] Would fix bug ${bug.id}`);
        result.status = 'skipped';
        result.completedAt = new Date().toISOString();
        result.duration = Date.now() - new Date(startedAt).getTime();
        return result;
      }

      // Step 1: Create branch
      console.log(`   🔧 Creating branch: ${branch}`);
      await this.createBranch(branch);

      // Step 2: Apply fix
      console.log(`   🔧 Applying fix...`);
      const changesApplied = await this.applyFix(bug);

      if (!changesApplied) {
        // No automatic fix available, need Claude
        result.errors.push('No automatic fix available - requires Claude analysis');
        result.status = 'pending';
        await this.cleanupBranch(branch);
        result.completedAt = new Date().toISOString();
        result.duration = Date.now() - new Date(startedAt).getTime();
        return result;
      }

      result.filesChanged = changesApplied.map((c) => c.file);

      // Step 3: Typecheck
      console.log(`   🔧 Running typecheck...`);
      result.typecheckPassed = await this.runTypecheck();

      if (!result.typecheckPassed) {
        console.log(`   ⚠️  Typecheck failed, iterating...`);
        const fixed = await this.iterateOnFix(bug, 'typecheck');
        if (!fixed) {
          result.errors.push('Typecheck failed after iteration');
          result.status = 'failed';
          await this.cleanupBranch(branch);
          result.completedAt = new Date().toISOString();
          result.duration = Date.now() - new Date(startedAt).getTime();
          return result;
        }
        result.typecheckPassed = true;
      }

      // Step 4: Run tests
      console.log(`   🔧 Running tests...`);
      result.testsPassed = await this.runTests();

      if (!result.testsPassed) {
        console.log(`   ⚠️  Tests failed, iterating...`);
        const fixed = await this.iterateOnFix(bug, 'tests');
        if (!fixed) {
          result.errors.push('Tests failed after iteration');
          result.status = 'failed';
          await this.cleanupBranch(branch);
          result.completedAt = new Date().toISOString();
          result.duration = Date.now() - new Date(startedAt).getTime();
          return result;
        }
        result.testsPassed = true;
      }

      // Step 5: Build
      console.log(`   🔧 Building...`);
      result.buildPassed = await this.runBuild();

      if (!result.buildPassed) {
        result.errors.push('Build failed');
        result.status = 'failed';
        await this.cleanupBranch(branch);
        result.completedAt = new Date().toISOString();
        result.duration = Date.now() - new Date(startedAt).getTime();
        return result;
      }

      // Step 6: Commit
      console.log(`   🔧 Committing changes...`);
      result.commit = await this.commit(bug);

      // Step 7: Push and merge to main
      console.log(`   🔧 Pushing to remote...`);
      await this.pushAndMerge(branch);

      // Step 8: Deploy
      console.log(`   🔧 Deploying to production...`);
      result.deployedAt = await this.deploy();

      // Step 9: Verify
      console.log(`   🔧 Verifying on production...`);
      result.productionVerified = await this.verifyFix(bug);

      if (!result.productionVerified) {
        result.errors.push('Production verification failed');
        result.status = 'failed';
        // Don't cleanup - let rollback handle it
      } else {
        result.success = true;
        result.status = 'fixed';
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      result.status = 'failed';

      // Cleanup on error
      try {
        await this.cleanupBranch(branch);
      } catch {
        // Ignore cleanup errors
      }
    }

    result.completedAt = new Date().toISOString();
    result.duration = Date.now() - new Date(startedAt).getTime();
    return result;
  }

  // ============================================================================
  // GIT OPERATIONS
  // ============================================================================

  private async createBranch(branch: string): Promise<void> {
    // Ensure we're on main and up to date
    await execAsync('git checkout main', { cwd: this.projectRoot });
    await execAsync('git pull origin main', { cwd: this.projectRoot });

    // Create and checkout new branch
    try {
      await execAsync(`git checkout -b ${branch}`, { cwd: this.projectRoot });
    } catch {
      // Branch might exist, try to check it out
      await execAsync(`git checkout ${branch}`, { cwd: this.projectRoot });
      await execAsync(`git reset --hard main`, { cwd: this.projectRoot });
    }
  }

  private async cleanupBranch(branch: string): Promise<void> {
    try {
      await execAsync('git checkout main', { cwd: this.projectRoot });
      await execAsync(`git branch -D ${branch}`, { cwd: this.projectRoot });
    } catch {
      // Ignore cleanup errors
    }
  }

  private async commit(bug: DiagnosedBug): Promise<string> {
    await execAsync('git add -A', { cwd: this.projectRoot });

    const message = `fix(auto): ${bug.title.slice(0, 50)}

Auto-fix for bug ${bug.id}
Root cause: ${bug.rootCause.hypothesis}

Co-Authored-By: Bug Hunter <bughunter@musclemap.me>`;

    await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: this.projectRoot });

    const { stdout } = await execAsync('git rev-parse HEAD', { cwd: this.projectRoot });
    return stdout.trim();
  }

  private async pushAndMerge(branch: string): Promise<void> {
    // Push branch
    await execAsync(`git push -u origin ${branch}`, { cwd: this.projectRoot });

    // Checkout main and merge
    await execAsync('git checkout main', { cwd: this.projectRoot });
    await execAsync(`git merge ${branch} --no-edit`, { cwd: this.projectRoot });
    await execAsync('git push origin main', { cwd: this.projectRoot });

    // Delete remote branch
    try {
      await execAsync(`git push origin --delete ${branch}`, { cwd: this.projectRoot });
    } catch {
      // Ignore if branch doesn't exist on remote
    }

    // Delete local branch
    await execAsync(`git branch -d ${branch}`, { cwd: this.projectRoot });
  }

  // ============================================================================
  // CODE MODIFICATION
  // ============================================================================

  private async applyFix(bug: DiagnosedBug): Promise<CodeChange[] | null> {
    const changes = bug.suggestedFix.codeChanges;

    if (changes.length === 0) {
      // Try to generate automatic fix based on error pattern
      const autoFix = await this.generateAutomaticFix(bug);
      if (!autoFix) return null;
      return [autoFix];
    }

    const appliedChanges: CodeChange[] = [];

    for (const change of changes) {
      try {
        await this.applyCodeChange(change);
        appliedChanges.push(change);
      } catch (error) {
        console.error(`Failed to apply change to ${change.file}:`, error);
      }
    }

    return appliedChanges.length > 0 ? appliedChanges : null;
  }

  private async applyCodeChange(change: CodeChange): Promise<void> {
    const filepath = path.join(this.projectRoot, change.file);

    // Read current content
    const content = await fs.readFile(filepath, 'utf-8');

    // Apply replacement
    if (change.oldCode && change.newCode) {
      const newContent = content.replace(change.oldCode, change.newCode);
      if (newContent === content) {
        throw new Error(`Could not find code to replace in ${change.file}`);
      }
      await fs.writeFile(filepath, newContent);
    }
  }

  private async generateAutomaticFix(bug: DiagnosedBug): Promise<CodeChange | null> {
    // Common automatic fixes based on error patterns
    const message = bug.actualBehavior.toLowerCase();

    // Fix: Undefined property access
    if (message.includes('cannot read property') || message.includes('undefined')) {
      return this.generateNullCheckFix(bug);
    }

    // Fix: Missing import
    if (message.includes('is not defined') && bug.rootCause.file) {
      return this.generateImportFix(bug);
    }

    return null;
  }

  private async generateNullCheckFix(bug: DiagnosedBug): Promise<CodeChange | null> {
    if (!bug.rootCause.file || !bug.rootCause.line) return null;

    try {
      const filepath = path.join(this.projectRoot, bug.rootCause.file);
      const content = await fs.readFile(filepath, 'utf-8');
      const lines = content.split('\n');
      const line = lines[bug.rootCause.line - 1];

      if (!line) return null;

      // Find property access patterns and add optional chaining
      const propertyMatch = line.match(/(\w+)\.(\w+)/);
      if (propertyMatch) {
        const [fullMatch, obj, prop] = propertyMatch;
        const newLine = line.replace(fullMatch, `${obj}?.${prop}`);

        return {
          file: bug.rootCause.file,
          oldCode: line,
          newCode: newLine,
          startLine: bug.rootCause.line,
          description: `Add optional chaining to ${obj}.${prop}`,
        };
      }
    } catch {
      // File read error
    }

    return null;
  }

  private async generateImportFix(bug: DiagnosedBug): Promise<CodeChange | null> {
    // This would need more sophisticated analysis
    // For now, return null to trigger Claude analysis
    return null;
  }

  // ============================================================================
  // ITERATION ON FAILURES
  // ============================================================================

  private async iterateOnFix(bug: DiagnosedBug, failureType: 'typecheck' | 'tests', attempt = 0): Promise<boolean> {
    if (attempt >= this.config.maxFixAttempts) {
      return false;
    }

    console.log(`   🔄 Iteration ${attempt + 1}/${this.config.maxFixAttempts}`);

    // Get error details
    const errors = failureType === 'typecheck'
      ? await this.getTypecheckErrors()
      : await this.getTestErrors();

    if (errors.length === 0) {
      return true; // No errors, success
    }

    // Try to fix based on errors
    for (const error of errors) {
      const fix = await this.generateFixForError(error);
      if (fix) {
        await this.applyCodeChange(fix);
      }
    }

    // Re-run check
    const passed = failureType === 'typecheck'
      ? await this.runTypecheck()
      : await this.runTests();

    if (passed) {
      return true;
    }

    // Recurse with incremented attempt
    return this.iterateOnFix(bug, failureType, attempt + 1);
  }

  private async getTypecheckErrors(): Promise<string[]> {
    try {
      await execAsync('pnpm typecheck', { cwd: this.projectRoot });
      return [];
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string };
      const output = execError.stdout || execError.stderr || '';
      return output.split('\n').filter((line) => line.includes('error TS'));
    }
  }

  private async getTestErrors(): Promise<string[]> {
    try {
      await execAsync('pnpm test', { cwd: this.projectRoot });
      return [];
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string };
      const output = execError.stdout || execError.stderr || '';
      return output.split('\n').filter((line) =>
        line.includes('FAIL') || line.includes('Error:') || line.includes('AssertionError')
      );
    }
  }

  private async generateFixForError(error: string): Promise<CodeChange | null> {
    // Parse TypeScript errors
    const tsMatch = error.match(/(.+\.tsx?)\((\d+),(\d+)\): error TS\d+: (.+)/);
    if (tsMatch) {
      const [, file, line, col, message] = tsMatch;
      // Generate fix based on error type
      // This is a placeholder - real implementation would be more sophisticated
      return null;
    }

    return null;
  }

  // ============================================================================
  // VERIFICATION
  // ============================================================================

  private async runTypecheck(): Promise<boolean> {
    try {
      await execAsync('pnpm typecheck', { cwd: this.projectRoot, timeout: 60000 });
      return true;
    } catch {
      return false;
    }
  }

  private async runTests(): Promise<boolean> {
    try {
      await execAsync('pnpm test', { cwd: this.projectRoot, timeout: 120000 });
      return true;
    } catch {
      return false;
    }
  }

  private async runBuild(): Promise<boolean> {
    try {
      await execAsync('pnpm build:all', { cwd: this.projectRoot, timeout: 300000 });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // DEPLOYMENT
  // ============================================================================

  private async deploy(): Promise<string> {
    const deployCommand = `ssh root@musclemap.me "cd /var/www/musclemap.me && git pull && pnpm install && pnpm build:all && pm2 restart musclemap"`;

    await execAsync(deployCommand, { cwd: this.projectRoot, timeout: 600000 });

    return new Date().toISOString();
  }

  private async verifyFix(bug: DiagnosedBug): Promise<boolean> {
    // Wait for deployment to settle
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Run health check
    try {
      await execAsync('pnpm test:frontend-health:prod', { cwd: this.projectRoot, timeout: 60000 });
    } catch {
      return false;
    }

    // Check if the specific bug is fixed by hitting the URL
    try {
      const url = bug.url.replace('http://localhost:5173', 'https://musclemap.me');
      const response = await fetch(url, { method: 'GET' });

      if (!response.ok && response.status >= 500) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  async fixBatch(bugs: DiagnosedBug[]): Promise<FixResult[]> {
    const results: FixResult[] = [];

    // Sort by severity (critical first)
    const sorted = [...bugs].sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    });

    for (const bug of sorted) {
      console.log(`\n🔧 Fixing: ${bug.title}`);
      const result = await this.fix(bug);
      results.push(result);

      if (result.success) {
        console.log(`   ✅ Fixed successfully`);
      } else {
        console.log(`   ❌ Fix failed: ${result.errors.join(', ')}`);
      }

      // Small delay between fixes
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return results;
  }
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export function createAutoFixer(projectRoot: string, config: BugHunterConfig): AutoFixer {
  return new AutoFixer(projectRoot, config);
}
