/**
 * BuildNet Extension Installer
 *
 * Provides easy installation of build acceleration extensions using
 * the package managers available on the user's system.
 *
 * Supports:
 * - macOS: Homebrew, npm/pnpm, cargo
 * - Linux: apt, dnf/yum, pacman, npm/pnpm, pip/pipx, cargo
 * - Windows: npm/pnpm, cargo, winget, chocolatey
 */

import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import * as os from 'node:os';
import { EventEmitter } from 'eventemitter3';
import type {
  ExtensionDefinition,
  ExtensionCapabilities,
  ExtensionCategory,
  SystemInfo,
} from './types.js';
import { ALL_EXTENSIONS, getExtensionsByCategory } from './definitions.js';
import { createExtensionScanner } from './scanner.js';

const execAsync = promisify(exec);

// ============================================================================
// Package Manager Types
// ============================================================================

export type PackageManagerType =
  | 'brew'
  | 'apt'
  | 'dnf'
  | 'yum'
  | 'pacman'
  | 'apk'
  | 'npm'
  | 'pnpm'
  | 'yarn'
  | 'pip'
  | 'pipx'
  | 'cargo'
  | 'winget'
  | 'choco';

export interface PackageManager {
  /** Type of package manager */
  type: PackageManagerType;

  /** Display name */
  name: string;

  /** Path to executable */
  path: string;

  /** Version */
  version: string;

  /** Whether it requires sudo */
  requiresSudo: boolean;

  /** Install command template */
  installCommand: string;

  /** Priority (higher = prefer this manager) */
  priority: number;
}

// ============================================================================
// Installation Types
// ============================================================================

export interface InstallationPlan {
  /** Extensions to install */
  extensions: PlannedInstallation[];

  /** Total expected time */
  estimatedTimeMinutes: number;

  /** Total expected benefits */
  expectedBenefits: ExpectedBenefit[];

  /** Package managers that will be used */
  packageManagers: PackageManager[];

  /** Prerequisites that need to be installed first */
  prerequisites: Prerequisite[];

  /** Warnings */
  warnings: string[];
}

export interface PlannedInstallation {
  /** Extension to install */
  extension: ExtensionDefinition;

  /** Which package manager to use */
  packageManager: PackageManager;

  /** The installation command */
  command: string;

  /** Whether sudo is required */
  requiresSudo: boolean;

  /** Expected benefit from installing */
  benefit: ExpectedBenefit;

  /** Dependencies that will be installed first */
  dependencies: string[];
}

export interface ExpectedBenefit {
  /** Operation that benefits */
  operation: string;

  /** Speed improvement (e.g., "100x faster") */
  speedup: string;

  /** What this replaces or improves */
  replaces?: string;

  /** Description */
  description: string;
}

export interface Prerequisite {
  /** What needs to be installed */
  name: string;

  /** Why it's needed */
  reason: string;

  /** How to install */
  installCommand: string;
}

export interface InstallationResult {
  /** Extension that was installed */
  extension: ExtensionDefinition;

  /** Whether installation succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Time taken */
  durationMs: number;

  /** Output from installation */
  output?: string;
}

export interface InstallerEvents {
  'install:started': { plan: InstallationPlan };
  'install:progress': { current: number; total: number; extension: string; status: string };
  'install:extension:started': { extension: ExtensionDefinition; command: string };
  'install:extension:completed': InstallationResult;
  'install:extension:failed': InstallationResult;
  'install:completed': { results: InstallationResult[]; successCount: number; failCount: number };
  'install:cancelled': { reason: string };
}

// ============================================================================
// Extension Installer
// ============================================================================

export class ExtensionInstaller extends EventEmitter {
  private availableManagers: PackageManager[] = [];
  private systemInfo: SystemInfo | null = null;
  private initialized: boolean = false;

  /**
   * Initialize the installer by detecting available package managers.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Get system info
    const scanner = createExtensionScanner();
    this.systemInfo = await scanner.getSystemInfo();

    // Detect available package managers
    this.availableManagers = await this.detectPackageManagers();

    this.initialized = true;
  }

  /**
   * Detect available package managers on the system.
   */
  private async detectPackageManagers(): Promise<PackageManager[]> {
    const managers: PackageManager[] = [];
    const platform = os.platform();

    const checks: Array<{
      type: PackageManagerType;
      name: string;
      command: string;
      versionPattern: RegExp;
      requiresSudo: boolean;
      installCommand: string;
      priority: number;
      platforms: string[];
    }> = [
      // macOS
      {
        type: 'brew',
        name: 'Homebrew',
        command: 'brew --version',
        versionPattern: /Homebrew (\d+\.\d+\.\d+)/,
        requiresSudo: false,
        installCommand: 'brew install {package}',
        priority: 10,
        platforms: ['darwin'],
      },
      // Linux - apt (Debian/Ubuntu)
      {
        type: 'apt',
        name: 'APT',
        command: 'apt --version',
        versionPattern: /apt (\d+\.\d+\.\d+)/,
        requiresSudo: true,
        installCommand: 'apt-get install -y {package}',
        priority: 10,
        platforms: ['linux'],
      },
      // Linux - dnf (Fedora/RHEL)
      {
        type: 'dnf',
        name: 'DNF',
        command: 'dnf --version',
        versionPattern: /(\d+\.\d+\.\d+)/,
        requiresSudo: true,
        installCommand: 'dnf install -y {package}',
        priority: 10,
        platforms: ['linux'],
      },
      // Linux - yum (older RHEL/CentOS)
      {
        type: 'yum',
        name: 'YUM',
        command: 'yum --version',
        versionPattern: /(\d+\.\d+\.\d+)/,
        requiresSudo: true,
        installCommand: 'yum install -y {package}',
        priority: 9,
        platforms: ['linux'],
      },
      // Linux - pacman (Arch)
      {
        type: 'pacman',
        name: 'Pacman',
        command: 'pacman --version',
        versionPattern: /pacman.*v(\d+\.\d+\.\d+)/,
        requiresSudo: true,
        installCommand: 'pacman -S --noconfirm {package}',
        priority: 10,
        platforms: ['linux'],
      },
      // Linux - apk (Alpine)
      {
        type: 'apk',
        name: 'APK',
        command: 'apk --version',
        versionPattern: /apk-tools (\d+\.\d+\.\d+)/,
        requiresSudo: true,
        installCommand: 'apk add {package}',
        priority: 10,
        platforms: ['linux'],
      },
      // Windows - winget
      {
        type: 'winget',
        name: 'WinGet',
        command: 'winget --version',
        versionPattern: /v(\d+\.\d+\.\d+)/,
        requiresSudo: false,
        installCommand: 'winget install --silent {package}',
        priority: 10,
        platforms: ['win32'],
      },
      // Windows - chocolatey
      {
        type: 'choco',
        name: 'Chocolatey',
        command: 'choco --version',
        versionPattern: /(\d+\.\d+\.\d+)/,
        requiresSudo: true,
        installCommand: 'choco install -y {package}',
        priority: 9,
        platforms: ['win32'],
      },
      // Cross-platform - pnpm
      {
        type: 'pnpm',
        name: 'pnpm',
        command: 'pnpm --version',
        versionPattern: /(\d+\.\d+\.\d+)/,
        requiresSudo: false,
        installCommand: 'pnpm add -g {package}',
        priority: 8,
        platforms: ['darwin', 'linux', 'win32'],
      },
      // Cross-platform - npm
      {
        type: 'npm',
        name: 'npm',
        command: 'npm --version',
        versionPattern: /(\d+\.\d+\.\d+)/,
        requiresSudo: false,
        installCommand: 'npm install -g {package}',
        priority: 7,
        platforms: ['darwin', 'linux', 'win32'],
      },
      // Cross-platform - yarn
      {
        type: 'yarn',
        name: 'Yarn',
        command: 'yarn --version',
        versionPattern: /(\d+\.\d+\.\d+)/,
        requiresSudo: false,
        installCommand: 'yarn global add {package}',
        priority: 6,
        platforms: ['darwin', 'linux', 'win32'],
      },
      // Cross-platform - cargo (Rust)
      {
        type: 'cargo',
        name: 'Cargo',
        command: 'cargo --version',
        versionPattern: /cargo (\d+\.\d+\.\d+)/,
        requiresSudo: false,
        installCommand: 'cargo install {package}',
        priority: 5,
        platforms: ['darwin', 'linux', 'win32'],
      },
      // Cross-platform - pipx (Python)
      {
        type: 'pipx',
        name: 'pipx',
        command: 'pipx --version',
        versionPattern: /(\d+\.\d+\.\d+)/,
        requiresSudo: false,
        installCommand: 'pipx install {package}',
        priority: 4,
        platforms: ['darwin', 'linux', 'win32'],
      },
      // Cross-platform - pip (Python)
      {
        type: 'pip',
        name: 'pip',
        command: 'pip3 --version',
        versionPattern: /pip (\d+\.\d+)/,
        requiresSudo: false,
        installCommand: 'pip3 install --user {package}',
        priority: 3,
        platforms: ['darwin', 'linux', 'win32'],
      },
    ];

    // Check each package manager
    for (const check of checks) {
      if (!check.platforms.includes(platform)) continue;

      try {
        const { stdout } = await execAsync(check.command, { timeout: 5000 });
        const match = stdout.match(check.versionPattern);
        const version = match ? match[1] : 'unknown';

        // Get path
        let execPath: string = check.type;
        try {
          const { stdout: whichOut } = await execAsync(`which ${check.type}`, { timeout: 2000 });
          execPath = whichOut.trim();
        } catch {
          // Use default
        }

        managers.push({
          type: check.type as PackageManagerType,
          name: check.name,
          path: execPath,
          version,
          requiresSudo: check.requiresSudo,
          installCommand: check.installCommand,
          priority: check.priority,
        });
      } catch {
        // Package manager not available
      }
    }

    // Sort by priority
    return managers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get available package managers.
   */
  getAvailableManagers(): PackageManager[] {
    return [...this.availableManagers];
  }

  /**
   * Create an installation plan for missing extensions.
   */
  async createInstallationPlan(
    missing: ExtensionDefinition[],
    options: {
      preferredManager?: PackageManagerType;
      skipNpmDevDeps?: boolean;
    } = {}
  ): Promise<InstallationPlan> {
    await this.initialize();

    const extensions: PlannedInstallation[] = [];
    const prerequisites: Prerequisite[] = [];
    const warnings: string[] = [];
    const usedManagers = new Set<PackageManager>();

    for (const ext of missing) {
      const installation = this.planExtensionInstallation(ext, options);
      if (installation) {
        extensions.push(installation);
        usedManagers.add(installation.packageManager);
      } else {
        warnings.push(`No installation method available for ${ext.name}`);
      }
    }

    // Calculate expected benefits
    const expectedBenefits = extensions.map(e => e.benefit);

    // Estimate time (rough: 30s per npm package, 1min per brew/apt package)
    const estimatedTimeMinutes = extensions.reduce((total, e) => {
      if (e.packageManager.type === 'npm' || e.packageManager.type === 'pnpm') {
        return total + 0.5;
      }
      return total + 1;
    }, 0);

    // Check for Homebrew on macOS if not available but needed
    if (os.platform() === 'darwin' && !this.availableManagers.some(m => m.type === 'brew')) {
      const needsBrew = extensions.some(e => e.extension.installation?.brew);
      if (needsBrew) {
        prerequisites.push({
          name: 'Homebrew',
          reason: 'Required to install system tools on macOS',
          installCommand: '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
        });
      }
    }

    return {
      extensions,
      estimatedTimeMinutes,
      expectedBenefits,
      packageManagers: Array.from(usedManagers),
      prerequisites,
      warnings,
    };
  }

  /**
   * Plan installation for a single extension.
   */
  private planExtensionInstallation(
    ext: ExtensionDefinition,
    options: { preferredManager?: PackageManagerType; skipNpmDevDeps?: boolean }
  ): PlannedInstallation | null {
    const { installation } = ext;
    if (!installation) return null;

    // Try to find the best package manager
    let selectedManager: PackageManager | null = null;
    let command: string | null = null;

    // Check preferred manager first
    if (options.preferredManager) {
      const preferred = this.availableManagers.find(m => m.type === options.preferredManager);
      if (preferred && installation[options.preferredManager]) {
        selectedManager = preferred;
        command = installation[options.preferredManager]!;
      }
    }

    // Otherwise try in priority order
    if (!selectedManager) {
      for (const manager of this.availableManagers) {
        const installCmd = installation[manager.type as keyof typeof installation];
        if (installCmd) {
          selectedManager = manager;
          command = installCmd;
          break;
        }
      }
    }

    // Check for npm as fallback
    if (!selectedManager && installation.npm) {
      const npmManager = this.availableManagers.find(m => m.type === 'npm' || m.type === 'pnpm');
      if (npmManager) {
        selectedManager = npmManager;
        command = installation.npm;
      }
    }

    if (!selectedManager || !command) return null;

    // Calculate benefit
    const speedup = ext.performanceMultiplier ?? 1;
    const operations = ext.accelerates.map(op => op.replace(/_/g, ' ')).join(', ');

    return {
      extension: ext,
      packageManager: selectedManager,
      command,
      requiresSudo: selectedManager.requiresSudo,
      benefit: {
        operation: operations,
        speedup: speedup > 1 ? `${speedup}x faster` : 'improved',
        description: ext.description,
      },
      dependencies: ext.dependencies ?? [],
    };
  }

  /**
   * Execute the installation plan.
   */
  async executeInstallation(
    plan: InstallationPlan,
    options: {
      interactive?: boolean;
      dryRun?: boolean;
      continueOnError?: boolean;
    } = {}
  ): Promise<InstallationResult[]> {
    const results: InstallationResult[] = [];

    this.emit('install:started', { plan });

    let current = 0;
    const total = plan.extensions.length;

    for (const planned of plan.extensions) {
      current++;
      this.emit('install:progress', {
        current,
        total,
        extension: planned.extension.name,
        status: 'installing',
      });

      this.emit('install:extension:started', {
        extension: planned.extension,
        command: planned.command,
      });

      const startTime = Date.now();

      if (options.dryRun) {
        results.push({
          extension: planned.extension,
          success: true,
          durationMs: 0,
          output: `[DRY RUN] Would execute: ${planned.command}`,
        });
        continue;
      }

      try {
        const cmd = planned.requiresSudo ? `sudo ${planned.command}` : planned.command;
        const { stdout, stderr } = await execAsync(cmd, {
          timeout: 300000, // 5 minute timeout per package
        });

        const result: InstallationResult = {
          extension: planned.extension,
          success: true,
          durationMs: Date.now() - startTime,
          output: stdout || stderr,
        };

        results.push(result);
        this.emit('install:extension:completed', result);
      } catch (err) {
        const result: InstallationResult = {
          extension: planned.extension,
          success: false,
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - startTime,
        };

        results.push(result);
        this.emit('install:extension:failed', result);

        if (!options.continueOnError) {
          this.emit('install:cancelled', { reason: `Failed to install ${planned.extension.name}` });
          break;
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    this.emit('install:completed', { results, successCount, failCount });

    return results;
  }

  /**
   * Generate a human-readable installation summary.
   */
  generateInstallationSummary(plan: InstallationPlan): string {
    const lines: string[] = [
      '',
      '╔══════════════════════════════════════════════════════════════════════════════╗',
      '║                    BuildNet Extension Installation Plan                       ║',
      '╚══════════════════════════════════════════════════════════════════════════════╝',
      '',
    ];

    if (plan.prerequisites.length > 0) {
      lines.push('📋 Prerequisites Required:');
      lines.push('─'.repeat(78));
      for (const prereq of plan.prerequisites) {
        lines.push(`  ⚠️  ${prereq.name}: ${prereq.reason}`);
        lines.push(`      Install: ${prereq.installCommand}`);
      }
      lines.push('');
    }

    lines.push(`📦 Extensions to Install (${plan.extensions.length}):`, '─'.repeat(78));

    // Group by category
    const byCategory = new Map<string, PlannedInstallation[]>();
    for (const ext of plan.extensions) {
      const cat = ext.extension.category;
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(ext);
    }

    for (const [category, exts] of byCategory) {
      lines.push(`\n  ${this.categoryEmoji(category as ExtensionCategory)} ${this.formatCategory(category)}:`);
      for (const ext of exts) {
        const sudo = ext.requiresSudo ? ' (sudo)' : '';
        lines.push(`    • ${ext.extension.name.padEnd(20)} → ${ext.benefit.speedup}`);
        lines.push(`      ${ext.command}${sudo}`);
      }
    }

    lines.push('');
    lines.push('🚀 Expected Benefits:');
    lines.push('─'.repeat(78));

    // Aggregate benefits by operation
    const benefitsByOp = new Map<string, number>();
    for (const ext of plan.extensions) {
      const multiplier = ext.extension.performanceMultiplier ?? 1;
      for (const op of ext.extension.accelerates) {
        const existing = benefitsByOp.get(op) ?? 1;
        benefitsByOp.set(op, Math.max(existing, multiplier));
      }
    }

    const sortedBenefits = Array.from(benefitsByOp.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [op, multiplier] of sortedBenefits) {
      const opName = op.replace(/_/g, ' ');
      lines.push(`  ⚡ ${opName.padEnd(25)} → ${multiplier}x faster`);
    }

    lines.push('');
    lines.push(`⏱️  Estimated Installation Time: ~${Math.ceil(plan.estimatedTimeMinutes)} minutes`);
    lines.push(`📦 Package Managers: ${plan.packageManagers.map(m => m.name).join(', ')}`);

    if (plan.warnings.length > 0) {
      lines.push('');
      lines.push('⚠️  Warnings:');
      for (const warning of plan.warnings) {
        lines.push(`    • ${warning}`);
      }
    }

    lines.push('');
    lines.push('═'.repeat(78));

    return lines.join('\n');
  }

  /**
   * Get recommended extensions by category with benefits.
   */
  getRecommendedByCategory(): Map<ExtensionCategory, { extensions: ExtensionDefinition[]; totalSpeedup: string }> {
    const result = new Map<ExtensionCategory, { extensions: ExtensionDefinition[]; totalSpeedup: string }>();

    const categories: ExtensionCategory[] = [
      'bundler', 'transpiler', 'minifier', 'compressor',
      'image_optimizer', 'css_processor', 'linter', 'cache',
    ];

    for (const category of categories) {
      const exts = getExtensionsByCategory(category);
      const bestMultiplier = Math.max(...exts.map(e => e.performanceMultiplier ?? 1));

      result.set(category, {
        extensions: exts,
        totalSpeedup: bestMultiplier > 1 ? `Up to ${bestMultiplier}x faster` : 'Improved',
      });
    }

    return result;
  }

  /**
   * Generate quick install commands for different scenarios.
   */
  generateQuickInstallCommands(): Record<string, string[]> {
    const platform = os.platform();

    if (platform === 'darwin') {
      return {
        'Essential (Recommended)': [
          '# Install build acceleration essentials',
          'brew install esbuild brotli zstd',
          'pnpm add -D @swc/core @biomejs/biome lightningcss-cli',
        ],
        'Image Optimization': [
          '# Install image optimization tools',
          'brew install vips pngquant optipng jpegoptim',
          'pnpm add -D sharp svgo',
        ],
        'Full Stack': [
          '# Install all recommended tools',
          'brew install esbuild brotli zstd vips pngquant optipng jpegoptim ccache',
          'pnpm add -D @swc/core @biomejs/biome lightningcss-cli sharp svgo',
        ],
      };
    } else if (platform === 'linux') {
      return {
        'Essential (Recommended)': [
          '# Install build acceleration essentials',
          'sudo apt-get install -y brotli zstd',
          'pnpm add -D esbuild @swc/core @biomejs/biome lightningcss-cli',
        ],
        'Image Optimization': [
          '# Install image optimization tools',
          'sudo apt-get install -y libvips-tools pngquant optipng jpegoptim',
          'pnpm add -D sharp svgo',
        ],
        'Full Stack': [
          '# Install all recommended tools',
          'sudo apt-get install -y brotli zstd libvips-tools pngquant optipng jpegoptim ccache',
          'pnpm add -D esbuild @swc/core @biomejs/biome lightningcss-cli sharp svgo',
        ],
      };
    }

    // Windows
    return {
      'Essential (Recommended)': [
        '# Install build acceleration essentials (Run as Administrator)',
        'pnpm add -D esbuild @swc/core @biomejs/biome lightningcss-cli',
      ],
      'Image Optimization': [
        '# Install image optimization tools',
        'pnpm add -D sharp svgo',
      ],
      'Full Stack': [
        '# Install all recommended tools',
        'pnpm add -D esbuild @swc/core @biomejs/biome lightningcss-cli sharp svgo',
      ],
    };
  }

  private categoryEmoji(category: ExtensionCategory): string {
    const emojis: Record<ExtensionCategory, string> = {
      bundler: '📦',
      transpiler: '🔄',
      minifier: '🗜️',
      compressor: '📁',
      image_optimizer: '🖼️',
      image_processor: '🎨',
      css_processor: '🎨',
      linter: '🔍',
      formatter: '✨',
      cache: '💾',
      compiler: '🔧',
      wasm: '⚡',
      video: '🎬',
      native: '🔩',
      utility: '🛠️',
    };
    return emojis[category] ?? '📦';
  }

  private formatCategory(category: string): string {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an extension installer.
 */
export function createExtensionInstaller(): ExtensionInstaller {
  return new ExtensionInstaller();
}

/**
 * Quick install of essential extensions.
 */
export async function quickInstall(dryRun: boolean = false): Promise<InstallationResult[]> {
  const scanner = createExtensionScanner();
  const capabilities = await scanner.scan();

  const missing = capabilities.extensions
    .filter(e => !e.available)
    .filter(e => e.definition.performanceMultiplier && e.definition.performanceMultiplier >= 5)
    .map(e => e.definition);

  const installer = createExtensionInstaller();
  await installer.initialize();

  const plan = await installer.createInstallationPlan(missing);
  console.log(installer.generateInstallationSummary(plan));

  if (!dryRun) {
    return installer.executeInstallation(plan, { continueOnError: true });
  }

  return installer.executeInstallation(plan, { dryRun: true });
}
