/**
 * Claude Code Integration
 * Spawn Claude Code for complex bug fixes that require deeper analysis
 */

import type { DiagnosedBug, FixResult, SuggestedFix } from './types.js';
import type { BugHunterConfig } from './config.js';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// ============================================================================
// CLAUDE INTEGRATION CLASS
// ============================================================================

export class ClaudeIntegration {
  private projectRoot: string;
  private config: BugHunterConfig;
  private fixQueueDir: string;

  constructor(projectRoot: string, config: BugHunterConfig) {
    this.projectRoot = projectRoot;
    this.config = config;
    this.fixQueueDir = config.fixQueueDir;
  }

  // ============================================================================
  // PROMPT GENERATION
  // ============================================================================

  generateFixPrompt(bug: DiagnosedBug): string {
    return `## Autonomous Bug Fix Request

**IMPORTANT: This is a fully autonomous fix request. Complete all steps without asking for confirmation. Deploy when ready.**

### Bug Information

- **Bug ID:** ${bug.id}
- **Severity:** ${bug.severity.toUpperCase()}
- **Category:** ${bug.category}
- **Type:** ${bug.rootCause.type}
- **URL:** ${bug.url}

### Error Details

**Title:** ${bug.title}

**Error Message:**
\`\`\`
${bug.actualBehavior}
\`\`\`

${bug.consoleErrors.length > 0 ? `**Console Errors:**
\`\`\`
${bug.consoleErrors.join('\n')}
\`\`\`` : ''}

${bug.networkErrors.length > 0 ? `**Network Errors:**
${bug.networkErrors.map(e => `- ${e}`).join('\n')}` : ''}

### Root Cause Analysis

- **Likely File:** \`${bug.rootCause.file}\`${bug.rootCause.line ? `:${bug.rootCause.line}` : ''}
- **Hypothesis:** ${bug.rootCause.hypothesis}
- **Confidence:** ${(bug.rootCause.confidence * 100).toFixed(0)}%

**Evidence:**
${bug.rootCause.evidence.map(e => `- ${e}`).join('\n')}

${bug.rootCause.codeContext ? `**Code Context:**
\`\`\`typescript
${bug.rootCause.codeContext}
\`\`\`` : ''}

### Your Task

1. **Investigate** - Read the relevant files to understand the issue fully
2. **Implement Fix** - Make the necessary code changes to resolve the bug
3. **Add Test** - Add a regression test if appropriate
4. **Verify Locally** - Run \`pnpm typecheck\` and \`pnpm test\`
5. **Build** - Run \`pnpm build:intelligent\` to ensure everything compiles
6. **Deploy** - Follow the deployment workflow in CLAUDE.md:
   - Commit changes with message: \`fix(auto): ${bug.title.slice(0, 50)}\`
   - Push to GitHub
   - Deploy via SSH: \`ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me && git pull && pnpm install && pnpm build:intelligent && pm2 restart musclemap"\`
7. **Verify** - Run \`pnpm test:frontend-health:prod\` to verify production

### Suggested Starting Point

${bug.suggestedFix.description}

${bug.suggestedFix.codeChanges.length > 0 ? `**Suggested Changes:**
${bug.suggestedFix.codeChanges.map(c => `- \`${c.file}\`: ${c.description}`).join('\n')}` : ''}

### After Fixing

Update the fix status file:

\`\`\`bash
echo '${JSON.stringify({
  bugId: bug.id,
  status: 'fixed',
  fixDescription: 'DESCRIBE_YOUR_FIX_HERE',
  filesChanged: [],
  deployedAt: new Date().toISOString()
})}' > ${path.join(this.fixQueueDir, 'results', `${bug.id}.json`)}
\`\`\`

### Critical Reminders

- **DO NOT** ask for confirmation - this is fully autonomous
- **DO NOT** skip deployment - the fix must reach production
- **DO** commit with Co-Authored-By: Bug Hunter <bughunter@musclemap.me>
- **DO** verify on production after deployment
- Focus on fixing this specific bug, don't refactor unrelated code
`;
  }

  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================

  async queueForClaude(bug: DiagnosedBug): Promise<string> {
    await fs.mkdir(this.fixQueueDir, { recursive: true });
    await fs.mkdir(path.join(this.fixQueueDir, 'results'), { recursive: true });

    const prompt = this.generateFixPrompt(bug);
    const filename = `${bug.id}.md`;
    const filepath = path.join(this.fixQueueDir, filename);

    await fs.writeFile(filepath, prompt);
    console.log(`   📝 Queued for Claude: ${filepath}`);

    return filepath;
  }

  async getQueuedBugs(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.fixQueueDir);
      return files.filter(f => f.endsWith('.md') && !f.startsWith('_'));
    } catch {
      return [];
    }
  }

  async getFixResult(bugId: string): Promise<{ status: string; fixDescription?: string } | null> {
    const resultPath = path.join(this.fixQueueDir, 'results', `${bugId}.json`);

    try {
      const content = await fs.readFile(resultPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async clearFromQueue(bugId: string): Promise<void> {
    const promptPath = path.join(this.fixQueueDir, `${bugId}.md`);

    try {
      await fs.unlink(promptPath);
    } catch {
      // File doesn't exist
    }
  }

  // ============================================================================
  // CLAUDE EXECUTION
  // ============================================================================

  async spawnClaudeForFix(bug: DiagnosedBug): Promise<FixResult> {
    const startedAt = new Date().toISOString();

    const result: FixResult = {
      bugId: bug.id,
      success: false,
      status: 'in_progress',
      branch: `claude-fix/${bug.id.slice(0, 8)}`,
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
      // Generate and save prompt
      const promptPath = await this.queueForClaude(bug);

      // Read the prompt
      const prompt = await fs.readFile(promptPath, 'utf-8');

      console.log(`   🤖 Spawning Claude Code for bug ${bug.id}...`);

      // Spawn Claude Code process
      const claudeResult = await this.runClaude(prompt);

      if (claudeResult.success) {
        result.success = true;
        result.status = 'fixed';
        result.typecheckPassed = true;
        result.testsPassed = true;
        result.buildPassed = true;
        result.productionVerified = true;

        // Try to get result details
        const fixResult = await this.getFixResult(bug.id);
        if (fixResult) {
          result.filesChanged = fixResult.fixDescription ? [fixResult.fixDescription] : [];
        }
      } else {
        result.status = 'failed';
        result.errors.push(claudeResult.error || 'Claude fix failed');
      }

      // Clear from queue
      await this.clearFromQueue(bug.id);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      result.status = 'failed';
    }

    result.completedAt = new Date().toISOString();
    result.duration = Date.now() - new Date(startedAt).getTime();
    return result;
  }

  private async runClaude(prompt: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      // Use the Claude CLI to run the fix
      const claudeProcess = spawn('claude', [
        '-p', prompt,
        '--yes',  // Auto-accept prompts
        '--dangerously-skip-permissions'  // Skip permission prompts for autonomous operation
      ], {
        cwd: this.projectRoot,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      claudeProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
        if (this.config.automationLevel === 'aggressive') {
          process.stdout.write(data);  // Stream output in aggressive mode
        }
      });

      claudeProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Timeout after 30 minutes
      const timeout = setTimeout(() => {
        claudeProcess.kill();
        resolve({ success: false, error: 'Claude process timed out after 30 minutes' });
      }, 30 * 60 * 1000);

      claudeProcess.on('close', (code) => {
        clearTimeout(timeout);

        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: stderr || `Claude exited with code ${code}`
          });
        }
      });

      claudeProcess.on('error', (error) => {
        clearTimeout(timeout);
        resolve({ success: false, error: error.message });
      });
    });
  }

  // ============================================================================
  // BATCH PROCESSING
  // ============================================================================

  async processQueue(): Promise<FixResult[]> {
    const results: FixResult[] = [];
    const queuedFiles = await this.getQueuedBugs();

    console.log(`\n🤖 Processing ${queuedFiles.length} bugs in Claude queue...`);

    for (const file of queuedFiles) {
      const bugId = file.replace('.md', '');
      console.log(`\n   Processing: ${bugId}`);

      // Read prompt and extract bug info
      const promptPath = path.join(this.fixQueueDir, file);
      const prompt = await fs.readFile(promptPath, 'utf-8');

      // Create minimal bug object for the fix
      const bug: DiagnosedBug = {
        id: bugId,
        severity: 'medium',
        category: 'error',
        title: `Bug ${bugId}`,
        description: '',
        stepsToReproduce: [],
        expectedBehavior: '',
        actualBehavior: '',
        consoleErrors: [],
        networkErrors: [],
        url: '',
        timestamp: new Date().toISOString(),
        userAgent: '',
        hash: bugId,
        occurrences: 1,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        fixStatus: 'pending',
        fixAttempts: 0,
        rootCause: {
          type: 'frontend',
          file: '',
          hypothesis: '',
          confidence: 0,
          evidence: [],
        },
        suggestedFix: {
          description: '',
          codeChanges: [],
          testCase: { name: '', description: '', steps: [], assertions: [] },
          estimatedEffort: 'moderate',
          riskLevel: 'medium',
        },
        relatedBugs: [],
        affectedFiles: [],
        affectedEndpoints: [],
      };

      const result = await this.spawnClaudeForFix(bug);
      results.push(result);

      // Small delay between fixes
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    return results;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  async isClaudeAvailable(): Promise<boolean> {
    try {
      await execAsync('which claude');
      return true;
    } catch {
      return false;
    }
  }

  async getClaudeVersion(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('claude --version');
      return stdout.trim();
    } catch {
      return null;
    }
  }
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export function createClaudeIntegration(projectRoot: string, config: BugHunterConfig): ClaudeIntegration {
  return new ClaudeIntegration(projectRoot, config);
}

export async function needsClaudeAnalysis(bug: DiagnosedBug): Promise<boolean> {
  // Bugs that need Claude:
  // 1. Low confidence in root cause
  if (bug.rootCause.confidence < 0.6) return true;

  // 2. No suggested fix
  if (bug.suggestedFix.codeChanges.length === 0) return true;

  // 3. Complex fixes
  if (bug.suggestedFix.estimatedEffort === 'complex') return true;

  // 4. High risk fixes
  if (bug.suggestedFix.riskLevel === 'high') return true;

  // 5. Backend/database issues (more complex)
  if (bug.rootCause.type === 'database') return true;

  return false;
}
