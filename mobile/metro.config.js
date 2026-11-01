// Lets the app import the shared logic in ../shared (pricing, recommendations, QR rules).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "../shared")];
config.resolver.extraNodeModules = { "@link/shared": path.resolve(__dirname, "../shared/src") };
module.exports = config;
