// Metro is the bundler that packages the app's code.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The admin website (admin/) is a separate app with its own node_modules.
// Keep Metro from looking inside it.
const adminDir = path.resolve(__dirname, 'admin').replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList) ? existingBlockList : existingBlockList ? [existingBlockList] : []),
  new RegExp(`^${adminDir}[\\\\/].*`),
];

// The rest is only needed for the web version: expo-sqlite runs on
// WebAssembly (.wasm) in the browser and needs these two headers to use
// shared memory. Android ignores them.

if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

const enhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, metroServer) => {
  const enhancedMiddleware = enhanceMiddleware
    ? enhanceMiddleware(middleware, metroServer)
    : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return enhancedMiddleware(req, res, next);
  };
};

module.exports = config;
