/**
 * Bug Hunter Daemon
 * Self-healing autonomous loop that continuously monitors and fixes bugs
 */

import type { DiagnosedBug, FixResult, CycleResult, DaemonState, Severity } from './types.js';
import type { BugHunterConfig } from './config.js';
import { BugHunterAgent, createBugHunterAgent } from './agent.js';
import { AutoFixer, createAutoFixer } from './auto-fixer.js';
import { ClaudeIntegration, createClaudeIntegration, needsClaudeAnalysis } from './claude-integration.js';
import { RollbackSystem, createRollbackSystem } from './rollback.js';
import { LearningSystem, createLearningSystem } from './learning.js';
import { BugReporter, createBugReporter } from './bug-reporter.js';
import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// BUG HUNTER DAEMON CLASS
// ============================================================================

export class BugHunterDaemon {
  private projectRoot: string;
  private config: BugHunterConfig;
  private state: DaemonState;

  // Components
  private agent: BugHunterAgent | null = null;
  private autoFixer: AutoFixer;
  private claudeIntegration: ClaudeIntegration;
  private rollbackSystem: RollbackSystem;
  private learningSystem: LearningSystem;
  private bugReporter: BugReporter;

  // Cycle tracking
  private cycleResults: CycleResult[] = [];
  private pendingBugs: DiagnosedBug[] = [];
  private fixQueue: DiagnosedBug[] = [];

  // Control
  private running: boolean = false;
  private pauseRequested: boolean = false;

  constructor(projectRoot: string, config: BugHunterConfig) {
    this.projectRoot = projectRoot;
    this.config = config;

    // Initialize state
    this.state = {
      running: false,
      currentCycle: 0,
      currentPhase: 'cooldown',
      lastCycleStart: '',
      lastCycleEnd: '',
      bugsInQueue: 0,
      fixesInProgress: 0,
      errors: [],
    };

    // Initialize components
    this.autoFixer = createAutoFixer(projectRoot, config);
    this.claudeIntegration = createClaudeIntegration(projectRoot, config);
    this.rollbackSystem = createRollbackSystem(projectRoot, config);
    this.learningSystem = createLearningSystem(projectRoot, config);
    this.bugReporter = createBugReporter(config.reportDir, projectRoot);
  }

  // ============================================================================
  // MAIN LOOP
  // ============================================================================

  async start(options?: { verbose?: boolean; headed?: boolean }): Promise<void> {
    if (this.running) {
      console.log('⚠️  Daemon is already running');
      return;
    }

    this.running = true;
    this.state.running = true;
    this.pauseRequested = false;

    console.log('\n═══════════════════════════════════════════════════');
    console.log('🤖 Bug Hunter Daemon Starting');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   Automation Level: ${this.config.automationLevel}`);
    console.log(`   Cycle Duration: ${this.config.cycleDuration / 60000} minutes`);
    console.log(`   Cooldown: ${this.config.cooldownPeriod / 60000} minutes`);
    console.log('═══════════════════════════════════════════════════\n');

    // Initialize agent
    this.agent = createBugHunterAgent(this.projectRoot, this.config);
    await this.agent.start(options);

    // Load existing patterns
    await this.learningSystem.loadPatterns();

    // Main loop
    while (this.running && !this.pauseRequested) {
      try {
        await this.runCycle(options);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Cycle error: ${message}`);
        this.state.errors.push(message);

        // Check if we should pause
        const pauseCheck = await this.rollbackSystem.shouldPauseAutomation();
        if (pauseCheck.pause) {
          console.log(`\n⚠️  ${pauseCheck.reason}`);
          console.log('   Pausing automation for manual review...');
          this.pauseRequested = true;
        }
      }

      // Cooldown between cycles
      if (this.running && !this.pauseRequested) {
        console.log(`\n😴 Cooldown: ${this.config.cooldownPeriod / 60000} minutes`);
        await this.countdown(this.config.cooldownPeriod);
      }
    }

    await this.stop();
  }

  async stop(): Promise<void> {
    console.log('\n🛑 Stopping Bug Hunter Daemon...');
    this.running = false;
    this.state.running = false;

    if (this.agent) {
      await this.agent.stop();
      this.agent = null;
    }

    // Generate final report
    await this.generateSessionReport();

    console.log('✅ Bug Hunter Daemon stopped');
  }

  async pause(): Promise<void> {
    console.log('\n⏸️  Pausing Bug Hunter Daemon...');
    this.pauseRequested = true;
  }

  // ============================================================================
  // CYCLE EXECUTION
  // ============================================================================

  private async runCycle(options?: { verbose?: boolean }): Promise<CycleResult> {
    this.state.currentCycle++;
    this.state.lastCycleStart = new Date().toISOString();

    const cycleNumber = this.state.currentCycle;
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`🔄 CYCLE ${cycleNumber} - ${new Date().toLocaleString()}`);
    console.log(`${'═'.repeat(55)}`);

    const result: CycleResult = {
      cycleNumber,
      startedAt: this.state.lastCycleStart,
      completedAt: '',
      duration: 0,
      routesTested: 0,
      interactionsTested: 0,
      bugsFound: [],
      bugsAttempted: 0,
      bugsFixed: 0,
      bugsFailed: 0,
      bugsSkipped: 0,
      rollbacks: 0,
      productionHealthy: true,
      humanInterventionsRequired: 0,
    };

    try {
      // Phase 1: Discovery
      this.state.currentPhase = 'discovery';
      console.log('\n📡 Phase 1: Discovery');
      const bugs = await this.runDiscoveryPhase(options);
      result.bugsFound = bugs;
      result.routesTested = this.agent?.getRoutesTested().length || 0;

      // Phase 2: Diagnosis (already done during discovery)
      this.state.currentPhase = 'diagnosis';
      console.log(`\n🔬 Phase 2: Diagnosis - ${bugs.length} bugs to analyze`);

      // Phase 3: Fixing
      if (this.shouldAutoFix() && bugs.length > 0) {
        this.state.currentPhase = 'fixing';
        console.log('\n🔧 Phase 3: Auto-Fixing');
        const fixResults = await this.runFixingPhase(bugs);

        result.bugsAttempted = fixResults.length;
        result.bugsFixed = fixResults.filter(r => r.success).length;
        result.bugsFailed = fixResults.filter(r => !r.success && r.status !== 'skipped').length;
        result.bugsSkipped = fixResults.filter(r => r.status === 'skipped').length;
        result.rollbacks = fixResults.filter(r => r.status === 'rolled_back').length;
      }

      // Phase 4: Verification
      this.state.currentPhase = 'verification';
      console.log('\n✅ Phase 4: Verification');
      result.productionHealthy = await this.verifyProductionHealth();

      // Phase 5: Reporting
      this.state.currentPhase = 'reporting';
      console.log('\n📊 Phase 5: Reporting');
      await this.runReportingPhase(result);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Cycle ${cycleNumber} error: ${message}`);
      this.state.errors.push(message);
    }

    result.completedAt = new Date().toISOString();
    result.duration = new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime();
    this.state.lastCycleEnd = result.completedAt;
    this.state.currentPhase = 'cooldown';

    this.cycleResults.push(result);
    this.bugReporter.logCycleSummary(
      result.bugsFound.length,
      result.bugsFixed,
      result.rollbacks
    );

    return result;
  }

  // ============================================================================
  // DISCOVERY PHASE
  // ============================================================================

  private async runDiscoveryPhase(options?: { verbose?: boolean }): Promise<DiagnosedBug[]> {
    if (!this.agent) {
      throw new Error('Agent not initialized');
    }

    const bugs = await this.agent.explore({
      duration: this.config.cycleDuration,
      depth: this.config.automationLevel === 'aggressive' ? 'quick' : 'comprehensive',
    });

    // Filter duplicates with existing bugs
    const newBugs = bugs.filter(bug => !this.pendingBugs.some(p => p.hash === bug.hash));

    // Add to pending
    this.pendingBugs.push(...newBugs);
    this.state.bugsInQueue = this.pendingBugs.length;

    // Log findings
    for (const bug of newBugs) {
      this.bugReporter.logBugFound(bug);
    }

    return newBugs;
  }

  // ============================================================================
  // FIXING PHASE
  // ============================================================================

  private async runFixingPhase(bugs: DiagnosedBug[]): Promise<FixResult[]> {
    const results: FixResult[] = [];

    // Sort by severity (critical first)
    const sortedBugs = this.sortByPriority(bugs);

    for (const bug of sortedBugs) {
      // Check confidence threshold
      if (bug.rootCause.confidence < this.config.confidenceThreshold) {
        console.log(`   ⏭️  Skipping ${bug.id}: Low confidence (${(bug.rootCause.confidence * 100).toFixed(0)}%)`);

        if (this.config.claudeEnabled) {
          // Queue for Claude analysis
          await this.claudeIntegration.queueForClaude(bug);
          results.push(this.createSkippedResult(bug, 'Low confidence - queued for Claude'));
        } else {
          results.push(this.createSkippedResult(bug, 'Low confidence'));
        }
        continue;
      }

      // Check if needs Claude
      if (await needsClaudeAnalysis(bug)) {
        if (this.config.claudeEnabled) {
          console.log(`   🤖 Bug ${bug.id} needs Claude analysis`);
          const claudeResult = await this.claudeIntegration.spawnClaudeForFix(bug);
          results.push(claudeResult);

          if (claudeResult.success) {
            await this.learningSystem.learnFromSuccess(bug, claudeResult);
          }
        } else {
          results.push(this.createSkippedResult(bug, 'Needs Claude - disabled'));
        }
        continue;
      }

      // Try auto-fix
      console.log(`   🔧 Fixing: ${bug.title.slice(0, 60)}...`);
      this.state.fixesInProgress++;

      const result = await this.autoFixer.fix(bug);
      results.push(result);

      this.state.fixesInProgress--;
      this.bugReporter.logFixResult(result);

      // Monitor deployment if fix was successful
      if (result.success && result.deployedAt) {
        console.log(`   📊 Monitoring deployment...`);
        const monitorResult = await this.rollbackSystem.monitorDeployment(result.bugId);

        if (!monitorResult.success) {
          result.success = false;
          result.status = 'rolled_back';
          result.rollbackReason = monitorResult.reason;
          await this.learningSystem.learnFromFailure(bug, result);
        } else {
          await this.learningSystem.learnFromSuccess(bug, result);
        }
      }

      // Update bug status
      if (result.success) {
        bug.fixStatus = 'fixed';
        bug.fixedAt = new Date().toISOString();
        this.removeBugFromPending(bug.id);
      } else {
        bug.fixAttempts++;
        if (bug.fixAttempts >= this.config.maxFixAttempts) {
          console.log(`   ⚠️  Max attempts reached for ${bug.id}`);
          if (this.config.claudeEnabled) {
            await this.claudeIntegration.queueForClaude(bug);
          }
        }
      }

      // Save bug report
      await this.bugReporter.saveBugReport(bug);
      await this.bugReporter.saveFixResult(result);
    }

    return results;
  }

  private sortByPriority(bugs: DiagnosedBug[]): DiagnosedBug[] {
    const severityOrder: Record<Severity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    return [...bugs].sort((a, b) => {
      // First by severity
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      // Then by confidence (higher first)
      return b.rootCause.confidence - a.rootCause.confidence;
    });
  }

  private createSkippedResult(bug: DiagnosedBug, reason: string): FixResult {
    return {
      bugId: bug.id,
      success: false,
      status: 'skipped',
      branch: '',
      filesChanged: [],
      linesAdded: 0,
      linesRemoved: 0,
      typecheckPassed: false,
      testsPassed: false,
      buildPassed: false,
      productionVerified: false,
      errors: [reason],
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      duration: 0,
    };
  }

  private removeBugFromPending(bugId: string): void {
    this.pendingBugs = this.pendingBugs.filter(b => b.id !== bugId);
    this.state.bugsInQueue = this.pendingBugs.length;
  }

  // ============================================================================
  // VERIFICATION PHASE
  // ============================================================================

  private async verifyProductionHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.productionUrl}/health`, {
        timeout: 10000,
      } as RequestInit);

      if (!response.ok) {
        console.log(`   ⚠️  Health check failed: ${response.status}`);
        return false;
      }

      const data = await response.json();
      const healthy = data.status === 'ok' || data.status === 'healthy';

      if (healthy) {
        console.log('   ✅ Production is healthy');
      } else {
        console.log(`   ⚠️  Production status: ${data.status}`);
      }

      return healthy;
    } catch (error) {
      console.log(`   ⚠️  Health check error: ${error}`);
      return false;
    }
  }

  // ============================================================================
  // REPORTING PHASE
  // ============================================================================

  private async runReportingPhase(result: CycleResult): Promise<void> {
    // Update metrics
    await this.bugReporter.updateMetrics({
      totalBugsFound: result.bugsFound.length,
      totalBugsFixed: result.bugsFixed,
      totalRollbacks: result.rollbacks,
      cyclesCompleted: this.state.currentCycle,
      lastCycleAt: result.completedAt,
    });

    // Generate daily report
    const fixResults = result.bugsFound.map(bug => ({
      bugId: bug.id,
      success: bug.fixStatus === 'fixed',
      status: bug.fixStatus,
      branch: '',
      filesChanged: bug.affectedFiles,
      linesAdded: 0,
      linesRemoved: 0,
      typecheckPassed: bug.fixStatus === 'fixed',
      testsPassed: bug.fixStatus === 'fixed',
      buildPassed: bug.fixStatus === 'fixed',
      productionVerified: bug.fixStatus === 'fixed',
      errors: [],
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      duration: result.duration,
    }));

    await this.bugReporter.generateDailyReport(result.bugsFound, fixResults, {
      cyclesCompleted: this.state.currentCycle,
    });

    // Update known bugs documentation
    await this.bugReporter.updateKnownBugsDocs(this.pendingBugs);

    // Sync bugs to database API
    await this.syncBugsToDatabase(result.bugsFound);

    // Create GitHub issues for critical bugs
    for (const bug of result.bugsFound) {
      if (bug.severity === 'critical' && !bug.githubIssue) {
        const issueUrl = await this.bugReporter.createGitHubIssue(bug);
        if (issueUrl) {
          bug.githubIssue = issueUrl;
          console.log(`   📝 Created GitHub issue: ${issueUrl}`);
        }
      }
    }
  }

  /**
   * Sync discovered bugs to the database via the admin API
   */
  private async syncBugsToDatabase(bugs: DiagnosedBug[]): Promise<void> {
    if (bugs.length === 0) {
      console.log('   ℹ️  No bugs to sync to database');
      return;
    }

    console.log(`   📤 Syncing ${bugs.length} bugs to database...`);

    try {
      // Format bugs for the API
      const bugsForApi = bugs.map(bug => ({
        id: bug.id,
        title: bug.title,
        description: bug.description,
        severity: bug.severity,
        url: bug.url,
        status: bug.fixStatus,
        category: bug.category,
        rootCause: {
          type: bug.rootCause.type,
          file: bug.rootCause.file,
          hypothesis: bug.rootCause.hypothesis,
          evidence: bug.rootCause.evidence,
        },
        suggestedFix: bug.suggestedFix ? {
          description: bug.suggestedFix.description,
          codeChanges: bug.suggestedFix.codeChanges,
        } : undefined,
        consoleErrors: bug.consoleErrors,
        networkErrors: bug.networkErrors.map(e => `${e.method} ${e.url}: ${e.status} ${e.statusText}`),
        hash: bug.hash,
      }));

      // Make API request to sync bugs
      const response = await fetch(`${this.config.productionUrl}/api/admin/bugs/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Use API key for automated sync (no user auth needed)
          'X-Bug-Hunter-Key': process.env.BUG_HUNTER_API_KEY || 'bug-hunter-internal-key-12345',
        },
        body: JSON.stringify(bugsForApi),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`   ✅ Synced to database: ${result.created} created, ${result.updated} updated`);
        if (result.errors && result.errors.length > 0) {
          console.log(`   ⚠️  Sync errors: ${result.errors.length}`);
        }
      } else {
        const errorText = await response.text();
        console.log(`   ⚠️  Database sync failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`   ⚠️  Database sync error: ${message}`);
    }
  }

  // ============================================================================
  // SESSION REPORT
  // ============================================================================

  private async generateSessionReport(): Promise<void> {
    const totalBugsFound = this.cycleResults.reduce((sum, r) => sum + r.bugsFound.length, 0);
    const totalBugsFixed = this.cycleResults.reduce((sum, r) => sum + r.bugsFixed, 0);
    const totalRollbacks = this.cycleResults.reduce((sum, r) => sum + r.rollbacks, 0);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 SESSION SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   Cycles Completed: ${this.cycleResults.length}`);
    console.log(`   Total Bugs Found: ${totalBugsFound}`);
    console.log(`   Total Bugs Fixed: ${totalBugsFixed}`);
    console.log(`   Total Rollbacks: ${totalRollbacks}`);
    console.log(`   Bugs Pending: ${this.pendingBugs.length}`);
    console.log(`   Success Rate: ${totalBugsFound > 0 ? ((totalBugsFixed / totalBugsFound) * 100).toFixed(1) : 0}%`);
    console.log('═══════════════════════════════════════════════════\n');

    // Save session report
    const sessionReport = {
      startedAt: this.cycleResults[0]?.startedAt,
      endedAt: new Date().toISOString(),
      cycles: this.cycleResults.length,
      totalBugsFound,
      totalBugsFixed,
      totalRollbacks,
      pendingBugs: this.pendingBugs.length,
      errors: this.state.errors,
    };

    const reportPath = path.join(this.config.reportDir, 'session-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(sessionReport, null, 2));
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private shouldAutoFix(): boolean {
    const level = this.config.automationLevel;
    return level === 'auto-fix-simple' ||
           level === 'auto-fix-all' ||
           level === 'autonomous' ||
           level === 'aggressive';
  }

  private async countdown(duration: number): Promise<void> {
    const interval = 60000; // 1 minute
    let remaining = duration;

    while (remaining > 0 && this.running && !this.pauseRequested) {
      await new Promise(resolve => setTimeout(resolve, Math.min(interval, remaining)));
      remaining -= interval;

      if (remaining > 0) {
        console.log(`   ⏱️  ${Math.ceil(remaining / 60000)} minutes remaining...`);
      }
    }
  }

  // ============================================================================
  // STATE ACCESS
  // ============================================================================

  getState(): DaemonState {
    return { ...this.state };
  }

  getPendingBugs(): DiagnosedBug[] {
    return [...this.pendingBugs];
  }

  getCycleResults(): CycleResult[] {
    return [...this.cycleResults];
  }
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export function createBugHunterDaemon(projectRoot: string, config: BugHunterConfig): BugHunterDaemon {
  return new BugHunterDaemon(projectRoot, config);
}
