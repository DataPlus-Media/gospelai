const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('sqlite', 'db', 'wasm');
// Browser profiles contain short-lived directories that can disappear mid-watch.
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList) ? existingBlockList : existingBlockList ? [existingBlockList] : []),
  /[/\\]\.(config|local|cache|agents)[/\\]/,
  /[/\\]generated-artifacts[/\\]/,
];
// expo-sqlite's web worker requires cross-origin isolation.
const enhanceMiddleware = config.server.enhanceMiddleware;

const libraryMiddleware = require('./scripts/library-dev-middleware.cjs');
config.server.enhanceMiddleware = (middleware, server) => {
  const handler = enhanceMiddleware ? enhanceMiddleware(middleware, server) : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    libraryMiddleware(req, res, () => handler(req, res, next));
  };
};

module.exports = config;
