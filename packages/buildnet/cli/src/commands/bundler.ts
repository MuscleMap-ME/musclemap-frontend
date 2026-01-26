/**
 * BuildNet CLI - Bundler Command
 *
 * Manage bundlers (hot-swappable).
 */

import type { BuildController, BundlerName } from '@buildnet/core';

/**
 * List all bundlers.
 */
export async function listBundlersCommand(
  controller: BuildController,
): Promise<void> {
  const bundlerManager = controller.getBundlerManager();
  const bundlers = bundlerManager.getInfo();

  console.log('\n📦 Bundlers\n');
  console.log('   Name            Version     Status     Active');
  console.log('   ─────────────────────────────────────────────');

  for (const bundler of bundlers) {
    const status = bundler.available
      ? '✅ available'
      : '❌ unavailable';
    const active = bundler.active ? '●' : ' ';

    console.log(
      `   ${bundler.name.padEnd(15)} ${bundler.version.padEnd(11)} ${status.padEnd(14)} ${active}`,
    );
  }

  console.log();
  console.log('   Use `buildnet bundler switch <name>` to change the active bundler');
  console.log();
}

/**
 * Switch active bundler.
 */
export async function switchBundlerCommand(
  controller: BuildController,
  bundlerName: string,
): Promise<void> {
  const bundlerManager = controller.getBundlerManager();

  console.log(`\n🔄 Switching bundler to: ${bundlerName}`);

  const success = await bundlerManager.switchTo(bundlerName as BundlerName);

  if (success) {
    const active = bundlerManager.getActive();
    console.log(`✅ Now using: ${active.name} v${active.version}`);
  } else {
    console.error(`❌ Failed to switch to ${bundlerName}`);
    console.log('\nAvailable bundlers:');

    const available = bundlerManager.listAvailable();
    for (const name of available) {
      console.log(`   - ${name}`);
    }

    process.exit(1);
  }

  console.log();
}

/**
 * Show active bundler info.
 */
export async function activeBundlerCommand(
  controller: BuildController,
): Promise<void> {
  const bundlerManager = controller.getBundlerManager();

  try {
    const active = bundlerManager.getActive();

    console.log('\n📦 Active Bundler\n');
    console.log(`   Name:    ${active.name}`);
    console.log(`   Version: ${active.version}`);

    const config = await active.getConfig();
    if (config) {
      console.log('\n   Configuration:');
      console.log(JSON.stringify(config, null, 4).split('\n').map(l => `     ${l}`).join('\n'));
    }
  } catch {
    console.log('\n📦 No active bundler');
    console.log('   Run `buildnet bundler list` to see available bundlers');
  }

  console.log();
}
