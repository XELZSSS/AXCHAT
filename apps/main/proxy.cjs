/* global process */
const { app, session } = require('electron');
const { URL } = require('node:url');
const {
  getProxyScriptPath,
  loadProxyConfig,
  loadProxyState,
  persistProxyState,
} = require('./proxy/config.cjs');
const { startProxyProcess, stopProxyProcess } = require('./proxy/process-manager.cjs');

const {
  DEFAULT_PROXY_HOST,
  DEFAULT_PROXY_PORT,
  resolveProxyHost,
  resolveProxyPort,
  PROXY_PATH_PREFIX,
} = loadProxyConfig();
const AUTH_HEADER = 'x-axchat-proxy-token';
let isDevMode = false;
let proxyState = loadProxyState(app);
let proxyAuthInjectionInstalled = false;

const startProxy = async (isDev) => {
  isDevMode = isDev;
  const scriptPath = getProxyScriptPath(app, isDev);
  process.env.AXCHAT_PROXY_STATIC_HTTP2 = proxyState.staticHttp2Enabled ? '1' : '0';
  process.env.AXCHAT_PROXY_ALLOW_HTTP_TARGETS = proxyState.allowHttpTargets ? '1' : '0';
  return startProxyProcess({
    scriptPath,
    isDev,
    resolveProxyPort,
    resolveProxyHost,
    staticProxyHttp2Enabled: proxyState.staticHttp2Enabled,
    defaults: {
      DEFAULT_PROXY_HOST,
      DEFAULT_PROXY_PORT,
    },
  });
};

const stopProxy = () => {
  void stopProxyProcess();
};

const shouldInjectProxyAuthForUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const currentProxyHost = resolveProxyHost(process.env.MINIMAX_PROXY_HOST);
    const isLoopback =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === currentProxyHost;
    if (!isLoopback) return false;
    return url.pathname.startsWith(PROXY_PATH_PREFIX);
  } catch {
    return false;
  }
};

const installProxyAuthHeaderInjection = () => {
  if (proxyAuthInjectionInstalled) return;
  proxyAuthInjectionInstalled = true;
  const targetSession = session.defaultSession;
  if (!targetSession) return;

  const handler = (details, callback) => {
    const token = String(process.env.AXCHAT_PROXY_TOKEN ?? '').trim();
    if (token && shouldInjectProxyAuthForUrl(details.url)) {
      if (!details.requestHeaders[AUTH_HEADER]) {
        details.requestHeaders[AUTH_HEADER] = token;
      }
    }
    callback({ requestHeaders: details.requestHeaders });
  };

  targetSession.webRequest.onBeforeSendHeaders(handler);
};

const setStaticProxyHttp2Enabled = async (enabled) => {
  const nextEnabled = enabled === true;
  if (proxyState.staticHttp2Enabled === nextEnabled) {
    return { changed: false, enabled: nextEnabled };
  }

  proxyState = { ...proxyState, staticHttp2Enabled: nextEnabled };
  persistProxyState(app, proxyState);
  process.env.AXCHAT_PROXY_STATIC_HTTP2 = nextEnabled ? '1' : '0';

  await stopProxyProcess();
  await startProxy(isDevMode);
  return { changed: true, enabled: nextEnabled };
};

const setAllowHttpTargets = async (enabled) => {
  const nextEnabled = enabled === true;
  if (proxyState.allowHttpTargets === nextEnabled) {
    return { changed: false, enabled: nextEnabled };
  }

  proxyState = { ...proxyState, allowHttpTargets: nextEnabled };
  persistProxyState(app, proxyState);
  process.env.AXCHAT_PROXY_ALLOW_HTTP_TARGETS = nextEnabled ? '1' : '0';

  await stopProxyProcess();
  await startProxy(isDevMode);
  return { changed: true, enabled: nextEnabled };
};

module.exports = {
  startProxy,
  stopProxy,
  setStaticProxyHttp2Enabled,
  setAllowHttpTargets,
  installProxyAuthHeaderInjection,
};
