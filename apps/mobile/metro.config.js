/**
 * Metro configuration for pnpm monorepo
 *
 * This configuration is critical for Metro to correctly resolve
 * packages from the monorepo workspace.
 */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all monorepo packages
config.watchFolders = [monorepoRoot];

// Resolve from monorepo root for pnpm
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Ensure we can resolve workspace packages
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
