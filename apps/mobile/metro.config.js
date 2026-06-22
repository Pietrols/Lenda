const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.disableHierarchicalLookup = true;

// Force expo-router subpath imports to resolve from the root symlink.
// Without this, Metro resolves entry.js from one .pnpm variant but then
// can't find entry-classic from that same deep path under
// disableHierarchicalLookup — producing "Cannot resolve expo-router/entry-classic".
config.resolver.extraNodeModules = {
  "expo-router": path.resolve(workspaceRoot, "node_modules/expo-router"),
};

module.exports = config;
