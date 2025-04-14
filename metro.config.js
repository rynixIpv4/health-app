// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for importing SVG files
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

// Suppress warnings from react-native-country-picker-modal
config.resolver.logger = {
  ...config.resolver.logger,
  warn: (message) => {
    if (
      message.includes('Support for defaultProps will be removed from function components') &&
      (message.includes('CountryItem') || message.includes('Flag'))
    ) {
      return; // Suppress these specific warnings
    }
    console.warn(message);
  },
};

module.exports = config; 