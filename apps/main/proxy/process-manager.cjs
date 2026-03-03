/* global process */
const crypto = require('crypto');
const { spawn } = require('child_process');

let proxyProcess = null;

const ensureProxyToken = () => {
  const existing = process.env.ACHATX_PROXY_TOKEN;
  if (existing && existing.trim()) return existing;
  const generated = crypto.randomBytes(24).toString('hex');
  process.env.ACHATX_PROXY_TOKEN = generated;
  return generated;
};

const startProxyProcess = ({ scriptPath, isDev, resolveProxyPort, resolveProxyHost, defaults }) => {
  if (proxyProcess) return;

  const proxyToken = ensureProxyToken();
  const proxyPort = resolveProxyPort(process.env.MINIMAX_PROXY_PORT);
  const proxyHost = resolveProxyHost(process.env.MINIMAX_PROXY_HOST);
  process.env.MINIMAX_PROXY_PORT = proxyPort;
  process.env.MINIMAX_PROXY_HOST = proxyHost;

  proxyProcess = spawn(process.execPath, [scriptPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      MINIMAX_PROXY_PORT: proxyPort ?? defaults.DEFAULT_PROXY_PORT,
      MINIMAX_PROXY_HOST: proxyHost ?? defaults.DEFAULT_PROXY_HOST,
      ACHATX_PROXY_TOKEN: proxyToken,
    },
    stdio: isDev ? 'inherit' : 'ignore',
  });

  proxyProcess.on('exit', () => {
    proxyProcess = null;
  });
};

const stopProxyProcess = () => {
  if (!proxyProcess) return;
  proxyProcess.kill();
  proxyProcess = null;
};

module.exports = {
  startProxyProcess,
  stopProxyProcess,
};
