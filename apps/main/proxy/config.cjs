/* global process */
const path = require('path');

const loadProxyConfig = () => {
  try {
    return require('../../shared/proxy-config.cjs');
  } catch {
    const fallback = path.join(process.resourcesPath, 'shared', 'proxy-config.cjs');
    return require(fallback);
  }
};

const getProxyScriptPath = (app, isDev) => {
  if (isDev) {
    return path.join(app.getAppPath(), 'apps', 'server', 'llm-proxy.mjs');
  }
  return path.join(process.resourcesPath, 'server', 'llm-proxy.mjs');
};

module.exports = {
  loadProxyConfig,
  getProxyScriptPath,
};
