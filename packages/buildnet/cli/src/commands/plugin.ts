/**
 * BuildNet CLI - Plugin Command
 *
 * Manage plugins (hot-swappable).
 */

import type { BuildController } from '@buildnet/core';

/**
 * List all plugins.
 */
export async function listPluginsCommand(
  controller: BuildController,
): Promise<void> {
  const pluginLoader = controller.getPluginLoader();
  const plugins = pluginLoader.list();

  console.log('\n🔌 Plugins\n');

  if (plugins.length === 0) {
    console.log('   No plugins loaded');
  } else {
    console.log('   Name            Version  Hook         Enabled');
    console.log('   ─────────────────────────────────────────────');

    for (const plugin of plugins) {
      const hooks = Object.keys(plugin.plugin.hooks).join(', ');
      const enabled = plugin.enabled ? '✅' : '❌';

      console.log(
        `   ${plugin.name.padEnd(15)} ${plugin.plugin.version.padEnd(8)} ${hooks.padEnd(12)} ${enabled}`,
      );
    }
  }

  console.log();
  console.log('   Use `buildnet plugin enable <name>` or `buildnet plugin disable <name>`');
  console.log();
}

/**
 * Enable a plugin.
 */
export async function enablePluginCommand(
  controller: BuildController,
  pluginName: string,
): Promise<void> {
  const pluginLoader = controller.getPluginLoader();

  console.log(`\n🔌 Enabling plugin: ${pluginName}`);

  const success = pluginLoader.enable(pluginName);

  if (success) {
    console.log(`✅ Plugin ${pluginName} enabled`);
  } else {
    console.error(`❌ Plugin ${pluginName} not found`);

    console.log('\nAvailable plugins:');
    for (const plugin of pluginLoader.list()) {
      console.log(`   - ${plugin.name}`);
    }

    process.exit(1);
  }

  console.log();
}

/**
 * Disable a plugin.
 */
export async function disablePluginCommand(
  controller: BuildController,
  pluginName: string,
): Promise<void> {
  const pluginLoader = controller.getPluginLoader();

  console.log(`\n🔌 Disabling plugin: ${pluginName}`);

  const success = pluginLoader.disable(pluginName);

  if (success) {
    console.log(`✅ Plugin ${pluginName} disabled`);
  } else {
    console.error(`❌ Plugin ${pluginName} not found or cannot be disabled`);
    process.exit(1);
  }

  console.log();
}

/**
 * Show plugin details.
 */
export async function showPluginCommand(
  controller: BuildController,
  pluginName: string,
): Promise<void> {
  const pluginLoader = controller.getPluginLoader();
  const loaded = pluginLoader.get(pluginName);

  if (!loaded) {
    console.error(`Plugin ${pluginName} not found`);
    process.exit(1);
  }

  console.log('\n🔌 Plugin Details\n');
  console.log(`   Name:        ${loaded.name}`);
  console.log(`   Version:     ${loaded.plugin.version}`);
  console.log(`   Enabled:     ${loaded.enabled ? 'Yes' : 'No'}`);
  console.log(`   Hot-swap:    ${loaded.plugin.hotSwappable ? 'Yes' : 'No'}`);

  const hooks = Object.keys(loaded.plugin.hooks);
  console.log(`   Hooks:       ${hooks.join(', ') || 'none'}`);

  if (loaded.plugin.dependencies?.length) {
    console.log(`   Dependencies: ${loaded.plugin.dependencies.join(', ')}`);
  }

  console.log();
}
