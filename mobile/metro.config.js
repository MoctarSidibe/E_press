const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Limit workers to avoid OOM on low memory systems
config.maxWorkers = 2;

module.exports = config;
