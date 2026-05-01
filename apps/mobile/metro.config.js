const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the entire monorepo so Metro can see all packages
config.watchFolders = [monorepoRoot];

// 2. Resolve modules from both local and monorepo root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Force a single copy of React to prevent "Invalid hook call" errors
//    or "React is undefined" errors from resolution mismatches.
config.resolver.extraNodeModules = {
  react: path.resolve(monorepoRoot, 'node_modules/react'),
  'react-native': path.resolve(monorepoRoot, 'node_modules/react-native'),
  'react/jsx-runtime': path.resolve(monorepoRoot, 'node_modules/react/jsx-runtime'),
};

module.exports = config;
