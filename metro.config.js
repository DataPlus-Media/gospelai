const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('sqlite', 'db', 'wasm');

module.exports = config;
