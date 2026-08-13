const { withDangerousMod } = require('@expo/config-plugins');

module.exports = function withIncomingSound(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      require('../scripts/generate-sound.js');
      return config;
    },
  ]);
};