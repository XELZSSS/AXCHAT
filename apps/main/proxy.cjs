const { app } = require('electron');
const { getProxyScriptPath, loadProxyConfig } = require('./proxy/config.cjs');
const { startProxyProcess, stopProxyProcess } = require('./proxy/process-manager.cjs');

const { DEFAULT_PROXY_HOST, DEFAULT_PROXY_PORT, resolveProxyHost, resolveProxyPort } =
  loadProxyConfig();

const startProxy = (isDev) => {
  const scriptPath = getProxyScriptPath(app, isDev);
  startProxyProcess({
    scriptPath,
    isDev,
    resolveProxyPort,
    resolveProxyHost,
    defaults: {
      DEFAULT_PROXY_HOST,
      DEFAULT_PROXY_PORT,
    },
  });
};

const stopProxy = () => {
  stopProxyProcess();
};

module.exports = {
  startProxy,
  stopProxy,
};
