const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Allow bundling of .db / .sqlite files
config.resolver.assetExts.push('db', 'sqlite');

module.exports = config;