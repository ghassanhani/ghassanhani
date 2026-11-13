// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Bundled SQLite content packs (assets/packs/*.db) are shipped as assets.
config.resolver.assetExts.push('db', 'bin', 'gz'); // gz: the hadith packs (hosted/hadith)

module.exports = config;
