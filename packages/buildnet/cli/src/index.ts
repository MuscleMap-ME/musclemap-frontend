#!/usr/bin/env node
/**
 * BuildNet CLI
 *
 * Distributed build system command-line interface.
 *
 * Usage:
 *   buildnet controller start       # Start the controller
 *   buildnet build [task]           # Request a build
 *   buildnet status [buildId]       # Check build status
 *   buildnet nodes                  # List worker nodes
 *   buildnet bundler list           # List available bundlers
 *   buildnet plugin list            # List plugins
 */

import {
  startControllerCommand,
  listNodesCommand,
  listBundlersCommand,
  switchBundlerCommand,
  listPluginsCommand,
  enablePluginCommand,
  disablePluginCommand,
} from './commands/index.js';

/**
 * Parse command-line arguments.
 */
function parseArgs(args: string[]): {
  command: string;
  subcommand: string;
  positional: string[];
  flags: Record<string, string | boolean>;
} {
  const result = {
    command: '',
    subcommand: '',
    positional: [] as string[],
    flags: {} as Record<string, string | boolean>,
  };

  let i = 0;

  // First positional is command
  if (args[i] && !args[i].startsWith('-')) {
    result.command = args[i];
    i++;
  }

  // Second positional is subcommand
  if (args[i] && !args[i].startsWith('-')) {
    result.subcommand = args[i];
    i++;
  }

  // Parse remaining args
  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith('-')) {
        result.flags[key] = nextArg;
        i += 2;
      } else {
        result.flags[key] = true;
        i++;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      result.flags[key] = true;
      i++;
    } else {
      result.positional.push(arg);
      i++;
    }
  }

  return result;
}

/**
 * Show help message.
 */
function showHelp(): void {
  console.log(`
BuildNet CLI - Distributed Build System

Usage:
  buildnet <command> [subcommand] [options]

Commands:
  controller              Controller management
    start                 Start the build controller
    status                Show controller status

  build [task]            Request a build
    --node <id>           Force specific node
    --bundler <name>      Override bundler
    --priority <level>    Set priority (critical/high/normal/low)
    --no-cache            Skip cache

  status [buildId]        Show build status
    --all                 Show all recent builds
    --watch               Watch for updates

  cancel <buildId>        Cancel a build

  nodes                   Node management
    list                  List all nodes
    show <id>             Show node details

  bundler                 Bundler management
    list                  List available bundlers
    active                Show active bundler
    switch <name>         Switch to different bundler

  plugin                  Plugin management
    list                  List all plugins
    enable <name>         Enable a plugin
    disable <name>        Disable a plugin
    show <name>           Show plugin details

  config                  Configuration
    show                  Show current config
    validate              Validate config file
    reload                Hot-reload configuration

Global Options:
  --config <path>         Config file path (default: build-network.yaml)
  --verbose, -v           Verbose output
  --help, -h              Show this help message
  --version               Show version

Examples:
  buildnet controller start
  buildnet build frontend --node dev-macbook
  buildnet status
  buildnet bundler switch rspack
  buildnet plugin enable lighthouse

Documentation: https://github.com/musclemap/buildnet
`);
}

/**
 * Show version.
 */
function showVersion(): void {
  console.log('buildnet v1.0.0');
}

/**
 * Main CLI entry point.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  if (args.includes('--version')) {
    showVersion();
    return;
  }

  const { command, subcommand, positional, flags } = parseArgs(args);
  const verbose = flags.verbose === true || flags.v === true;

  try {
    switch (command) {
      case 'controller':
        await handleControllerCommand(subcommand, flags);
        break;

      case 'build':
        await handleBuildCommand(subcommand || positional[0], flags);
        break;

      case 'status':
        await handleStatusCommand(subcommand || positional[0], flags);
        break;

      case 'cancel':
        await handleCancelCommand(subcommand || positional[0]);
        break;

      case 'nodes':
      case 'node':
        await handleNodeCommand(subcommand, positional, flags);
        break;

      case 'bundler':
        await handleBundlerCommand(subcommand, positional, flags);
        break;

      case 'plugin':
        await handlePluginCommand(subcommand, positional, flags);
        break;

      case 'config':
        await handleConfigCommand(subcommand, flags);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.error('Run "buildnet --help" for usage information.');
        process.exit(1);
    }
  } catch (error) {
    if (verbose) {
      console.error(error);
    } else {
      console.error(`Error: ${(error as Error).message}`);
    }
    process.exit(1);
  }
}

/**
 * Handle controller commands.
 */
async function handleControllerCommand(
  subcommand: string,
  flags: Record<string, string | boolean>,
): Promise<void> {
  switch (subcommand) {
    case 'start':
      await startControllerCommand({
        config: flags.config as string | undefined,
        port: flags.port ? parseInt(flags.port as string, 10) : undefined,
        host: flags.host as string | undefined,
        stateBackend: flags['state-backend'] as 'dragonfly' | 'redis' | 'file' | 'memory' | 'auto' | undefined,
        stateUrl: flags['state-url'] as string | undefined,
        verbose: flags.verbose === true || flags.v === true,
      });
      break;

    case 'status':
      console.log('Controller status command - requires running controller');
      break;

    case 'stop':
      console.log('Sending stop signal to controller...');
      // Would send signal via HTTP/gRPC to running controller
      break;

    default:
      console.error('Usage: buildnet controller <start|status|stop>');
      process.exit(1);
  }
}

/**
 * Handle build commands.
 */
async function handleBuildCommand(
  task: string | undefined,
  flags: Record<string, string | boolean>,
): Promise<void> {
  if (!task) {
    console.error('Usage: buildnet build <task> [options]');
    process.exit(1);
  }

  console.log(`\nRequesting build: ${task}`);

  const options: Record<string, unknown> = {};

  if (flags.node) {
    options.node = flags.node;
    console.log(`  Node: ${flags.node}`);
  }

  if (flags.bundler) {
    options.bundler = flags.bundler;
    console.log(`  Bundler: ${flags.bundler}`);
  }

  if (flags.priority) {
    options.priority = flags.priority;
    console.log(`  Priority: ${flags.priority}`);
  }

  if (flags['no-cache']) {
    options.noCache = true;
    console.log('  Cache: disabled');
  }

  console.log('\nConnecting to controller...');
  console.log('Build request would be sent via gRPC/HTTP to running controller');
  console.log('\nTo start a controller: buildnet controller start');
}

/**
 * Handle status commands.
 */
async function handleStatusCommand(
  buildId: string | undefined,
  flags: Record<string, string | boolean>,
): Promise<void> {
  if (flags.all) {
    console.log('\nRecent builds:');
    console.log('  (Requires running controller)');
    return;
  }

  if (!buildId) {
    console.log('\nBuild queue status:');
    console.log('  (Requires running controller)');
    return;
  }

  console.log(`\nBuild status for: ${buildId}`);
  console.log('  (Requires running controller)');
}

/**
 * Handle cancel commands.
 */
async function handleCancelCommand(buildId: string | undefined): Promise<void> {
  if (!buildId) {
    console.error('Usage: buildnet cancel <buildId>');
    process.exit(1);
  }

  console.log(`\nCancelling build: ${buildId}`);
  console.log('  (Requires running controller)');
}

/**
 * Handle node commands.
 */
async function handleNodeCommand(
  subcommand: string,
  positional: string[],
  _flags: Record<string, string | boolean>,
): Promise<void> {
  switch (subcommand) {
    case 'list':
    case '':
    case undefined:
      console.log('\nWorker nodes:');
      console.log('  (Requires running controller)');
      break;

    case 'show':
      const nodeId = positional[0];
      if (!nodeId) {
        console.error('Usage: buildnet node show <nodeId>');
        process.exit(1);
      }
      console.log(`\nNode details for: ${nodeId}`);
      console.log('  (Requires running controller)');
      break;

    default:
      console.error('Usage: buildnet node <list|show>');
      process.exit(1);
  }
}

/**
 * Handle bundler commands.
 */
async function handleBundlerCommand(
  subcommand: string,
  positional: string[],
  _flags: Record<string, string | boolean>,
): Promise<void> {
  switch (subcommand) {
    case 'list':
      console.log('\nAvailable bundlers:');
      console.log('  vite-rolldown  (default)');
      console.log('  rspack');
      console.log('  esbuild');
      console.log('  turbopack      (experimental)');
      console.log('  webpack        (legacy)');
      break;

    case 'active':
      console.log('\nActive bundler:');
      console.log('  (Requires running controller)');
      break;

    case 'switch':
      const bundlerName = positional[0];
      if (!bundlerName) {
        console.error('Usage: buildnet bundler switch <name>');
        process.exit(1);
      }
      console.log(`\nSwitching to bundler: ${bundlerName}`);
      console.log('  (Requires running controller)');
      break;

    default:
      console.error('Usage: buildnet bundler <list|active|switch>');
      process.exit(1);
  }
}

/**
 * Handle plugin commands.
 */
async function handlePluginCommand(
  subcommand: string,
  positional: string[],
  _flags: Record<string, string | boolean>,
): Promise<void> {
  switch (subcommand) {
    case 'list':
      console.log('\nAvailable plugins:');
      console.log('  typecheck   pre-build    enabled');
      console.log('  lint        pre-build    enabled');
      console.log('  clean       pre-build    disabled');
      console.log('  compress    post-build   enabled');
      console.log('  sourcemaps  post-build   disabled');
      console.log('  notify      deploy       enabled');
      break;

    case 'enable':
      const enableName = positional[0];
      if (!enableName) {
        console.error('Usage: buildnet plugin enable <name>');
        process.exit(1);
      }
      console.log(`\nEnabling plugin: ${enableName}`);
      console.log('  (Requires running controller)');
      break;

    case 'disable':
      const disableName = positional[0];
      if (!disableName) {
        console.error('Usage: buildnet plugin disable <name>');
        process.exit(1);
      }
      console.log(`\nDisabling plugin: ${disableName}`);
      console.log('  (Requires running controller)');
      break;

    case 'show':
      const showName = positional[0];
      if (!showName) {
        console.error('Usage: buildnet plugin show <name>');
        process.exit(1);
      }
      console.log(`\nPlugin details for: ${showName}`);
      console.log('  (Requires running controller)');
      break;

    default:
      console.error('Usage: buildnet plugin <list|enable|disable|show>');
      process.exit(1);
  }
}

/**
 * Handle config commands.
 */
async function handleConfigCommand(
  subcommand: string,
  _flags: Record<string, string | boolean>,
): Promise<void> {
  switch (subcommand) {
    case 'show':
      console.log('\nConfiguration:');
      console.log('  (Would read from build-network.yaml)');
      break;

    case 'validate':
      console.log('\nValidating configuration...');
      console.log('  (Would validate build-network.yaml)');
      break;

    case 'reload':
      console.log('\nReloading configuration...');
      console.log('  (Requires running controller)');
      break;

    default:
      console.error('Usage: buildnet config <show|validate|reload>');
      process.exit(1);
  }
}

// Run CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
