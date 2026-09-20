const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');
const config = getDefaultConfig(__dirname);

// The library lives outside the example's project root. Watch it as well so
// newly added exports and source edits invalidate Metro's cached modules.
config.watchFolders = [...new Set([...config.watchFolders, path.resolve(__dirname, '..')])];

// npm links this example's parent package back to the workspace root. Resolve
// its source directly to avoid Metro collapsing that root-pointing symlink.
config.resolver.resolveRequest = (context, name, platform) =>
  context.resolveRequest(context, name === 'react-native-foldable'
    ? path.resolve(__dirname, '../src/index.ts')
    : name, platform);

module.exports = config;
