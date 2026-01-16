/**
 * Bug Hunter Configuration
 * Default configuration and environment-based overrides
 */

import type { BugHunterConfig, AutomationLevel } from './types.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default configuration
export const DEFAULT_CONFIG: BugHunterConfig = {
  automationLevel: 'autonomous',
  baseUrl: 'http://localhost:5173',
  productionUrl: 'https://musclemap.me',

  // Timing
  cycleDuration: 30 * 60 * 1000,  // 30 minutes for discovery
  cooldownPeriod: 15 * 60 * 1000,  // 15 minutes between cycles
  maxFixAttempts: 3,
  deploymentMonitorDuration: 10 * 60 * 1000,  // 10 minutes monitoring

  // Thresholds
  confidenceThreshold: 0.7,
  errorRateThreshold: 1.5,  // 50% increase triggers rollback

  // Safety - only these categories require human intervention
  skipCategories: [],  // We auto-fix everything except security
  skipPatterns: [
    'security',
    'authentication.*bypass',
    'sql.*injection',
    'xss',
    'csrf',
    'payment',
    'credit.*transaction',
    'delete.*all',
  ],
  dryRun: false,

  // Output directories
  screenshotDir: path.join(__dirname, 'screenshots'),
  reportDir: path.join(__dirname, 'reports'),
  dataDir: path.join(__dirname, 'data'),

  // Claude integration
  claudeEnabled: true,
  claudeModel: 'claude-sonnet-4-20250514',
  fixQueueDir: path.join(__dirname, 'fix-queue'),
};

// Environment-based configuration
export function getConfig(overrides?: Partial<BugHunterConfig>): BugHunterConfig {
  const env = process.env.NODE_ENV || 'development';
  const automationLevel = (process.env.AUTOMATION_LEVEL || DEFAULT_CONFIG.automationLevel) as AutomationLevel;

  let config: BugHunterConfig = { ...DEFAULT_CONFIG };

  // Environment-specific overrides
  if (env === 'production') {
    config = {
      ...config,
      baseUrl: 'https://musclemap.me',
      productionUrl: 'https://musclemap.me',
    };
  }

  // Automation level adjustments
  if (automationLevel === 'aggressive') {
    config = {
      ...config,
      cycleDuration: 15 * 60 * 1000,  // 15 minutes
      cooldownPeriod: 5 * 60 * 1000,   // 5 minutes
      confidenceThreshold: 0.6,        // Lower threshold
      deploymentMonitorDuration: 5 * 60 * 1000,  // 5 minutes
    };
  }

  if (automationLevel === 'discover' || automationLevel === 'diagnose') {
    config = {
      ...config,
      dryRun: true,
    };
  }

  // Apply user overrides
  if (overrides) {
    config = { ...config, ...overrides };
  }

  return config;
}

// CLI argument parsing
export interface CLIOptions {
  automationLevel?: AutomationLevel;
  section?: string;
  production?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  headed?: boolean;  // Show browser
  aggressive?: boolean;
  daemon?: boolean;
  fixBugId?: string;  // Fix specific bug
}

export function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--level':
      case '-l':
        options.automationLevel = args[++i] as AutomationLevel;
        break;
      case '--section':
      case '-s':
        options.section = args[++i];
        break;
      case '--production':
      case '--prod':
      case '-p':
        options.production = true;
        break;
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--headed':
      case '-h':
        options.headed = true;
        break;
      case '--aggressive':
      case '-a':
        options.aggressive = true;
        options.automationLevel = 'aggressive';
        break;
      case '--daemon':
        options.daemon = true;
        break;
      case '--fix':
      case '-f':
        options.fixBugId = args[++i];
        break;
    }
  }

  return options;
}

// Validate configuration
export function validateConfig(config: BugHunterConfig): string[] {
  const errors: string[] = [];

  if (config.confidenceThreshold < 0 || config.confidenceThreshold > 1) {
    errors.push('confidenceThreshold must be between 0 and 1');
  }

  if (config.cycleDuration < 60000) {
    errors.push('cycleDuration must be at least 60 seconds');
  }

  if (config.maxFixAttempts < 1) {
    errors.push('maxFixAttempts must be at least 1');
  }

  return errors;
}

// Pretty print config
export function printConfig(config: BugHunterConfig): void {
  console.log('\n📋 Bug Hunter Configuration:');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Automation Level: ${config.automationLevel}`);
  console.log(`  Base URL: ${config.baseUrl}`);
  console.log(`  Production URL: ${config.productionUrl}`);
  console.log(`  Cycle Duration: ${config.cycleDuration / 60000} minutes`);
  console.log(`  Cooldown Period: ${config.cooldownPeriod / 60000} minutes`);
  console.log(`  Confidence Threshold: ${config.confidenceThreshold}`);
  console.log(`  Max Fix Attempts: ${config.maxFixAttempts}`);
  console.log(`  Dry Run: ${config.dryRun}`);
  console.log(`  Claude Enabled: ${config.claudeEnabled}`);
  console.log('═══════════════════════════════════════════════════\n');
}
