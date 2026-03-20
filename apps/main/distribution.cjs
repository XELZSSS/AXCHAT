/* global process */
const { app } = require('electron');

const isPortableDistribution = () =>
  app.isPackaged && typeof process.env.PORTABLE_EXECUTABLE_FILE === 'string';

const getDistributionMode = () => {
  if (!app.isPackaged) {
    return 'development';
  }

  return isPortableDistribution() ? 'portable' : 'installer';
};

module.exports = {
  getDistributionMode,
  isPortableDistribution,
};
