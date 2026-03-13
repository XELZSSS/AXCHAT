/* global console, process, Buffer */
const { contextBridge, ipcRenderer } = require('electron');

const PRELOAD_CONSOLE_INSTALL_MARK = '__axchat_preload_console_style_installed__';
const PRELOAD_BADGE_STYLE =
  'background:#1f2937;color:#f8fafc;padding:2px 8px;border-radius:999px;font-weight:700;';
const PRELOAD_SCOPE_STYLE = 'color:#94a3b8;font-weight:600;';
const PRELOAD_BODY_STYLE = 'color:inherit;';
const PRELOAD_LEVEL_THEME = {
  log: { label: 'LOG', color: '#7dd3fc' },
  info: { label: 'INFO', color: '#60a5fa' },
  warn: { label: 'WARN', color: '#fbbf24' },
  error: { label: 'ERROR', color: '#f87171' },
  debug: { label: 'DEBUG', color: '#c084fc' },
};

const installPreloadConsoleStyle = () => {
  const target = console;
  if (target[PRELOAD_CONSOLE_INSTALL_MARK]) return;

  Object.defineProperty(target, PRELOAD_CONSOLE_INSTALL_MARK, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  for (const method of ['log', 'info', 'warn', 'error', 'debug']) {
    const fallback = typeof target.log === 'function' ? target.log.bind(target) : () => {};
    const original = typeof target[method] === 'function' ? target[method].bind(target) : fallback;
    const theme = PRELOAD_LEVEL_THEME[method] ?? PRELOAD_LEVEL_THEME.log;

    target[method] = (...args) => {
      const template = `%c AXCHAT %c preload %c ${theme.label} %c`;

      if (args.length === 0) {
        original(
          template,
          PRELOAD_BADGE_STYLE,
          PRELOAD_SCOPE_STYLE,
          `color:${theme.color};font-weight:700;`,
          PRELOAD_BODY_STYLE
        );
        return;
      }

      if (typeof args[0] === 'string') {
        original(
          `${template}${args[0]}`,
          PRELOAD_BADGE_STYLE,
          PRELOAD_SCOPE_STYLE,
          `color:${theme.color};font-weight:700;`,
          PRELOAD_BODY_STYLE,
          ...args.slice(1)
        );
        return;
      }

      original(
        template,
        PRELOAD_BADGE_STYLE,
        PRELOAD_SCOPE_STYLE,
        `color:${theme.color};font-weight:700;`,
        PRELOAD_BODY_STYLE,
        ...args
      );
    };
  }
};

installPreloadConsoleStyle();

const DEFAULT_PROXY_PORT = '4010';
const DEFAULT_PROXY_HOST = '127.0.0.1';
const APP_STORAGE_BOOTSTRAP_PREFIX = '--axchat-app-storage-bootstrap=';

const normalizeString = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 && normalized !== 'undefined' ? normalized : undefined;
};

const resolveProxyPort = (value) => {
  const parsed = Number.parseInt(normalizeString(value) ?? DEFAULT_PROXY_PORT, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 65535) {
    return DEFAULT_PROXY_PORT;
  }
  return String(parsed);
};

const resolveProxyHost = (value) => normalizeString(value) ?? DEFAULT_PROXY_HOST;

const appStorageCache = new Map();

const hydrateAppStorageCache = () => {
  try {
    const bootstrapArg = process.argv.find(
      (entry) => typeof entry === 'string' && entry.startsWith(APP_STORAGE_BOOTSTRAP_PREFIX)
    );
    if (!bootstrapArg) {
      return;
    }

    const encodedPayload = bootstrapArg.slice(APP_STORAGE_BOOTSTRAP_PREFIX.length).trim();
    if (!encodedPayload) {
      return;
    }

    const snapshot = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (!snapshot || typeof snapshot !== 'object') {
      return;
    }

    for (const [key, value] of Object.entries(snapshot)) {
      if (value === null || value === undefined) {
        continue;
      }
      appStorageCache.set(key, String(value));
    }
  } catch {
    // Ignore bootstrap storage failures so the renderer can still start.
  }
};

hydrateAppStorageCache();

const readStoredAppValue = (key) => {
  const normalizedKey = String(key ?? '');
  return appStorageCache.has(normalizedKey) ? appStorageCache.get(normalizedKey) : null;
};

const writeStoredAppValue = (key, value) => {
  const normalizedKey = String(key ?? '');
  const normalizedValue = String(value ?? '');
  const hadPreviousValue = appStorageCache.has(normalizedKey);
  const previousValue = hadPreviousValue ? appStorageCache.get(normalizedKey) : null;

  appStorageCache.set(normalizedKey, normalizedValue);
  void ipcRenderer
    .invoke('storage:app:write', {
      key: normalizedKey,
      value: normalizedValue,
    })
    .catch((error) => {
      if (hadPreviousValue) {
        appStorageCache.set(normalizedKey, previousValue);
      } else {
        appStorageCache.delete(normalizedKey);
      }
      console.error(`Failed to persist app storage key "${normalizedKey}":`, error);
    });
};

const removeStoredAppValue = (key) => {
  const normalizedKey = String(key ?? '');
  const hadPreviousValue = appStorageCache.has(normalizedKey);
  const previousValue = hadPreviousValue ? appStorageCache.get(normalizedKey) : null;

  appStorageCache.delete(normalizedKey);
  void ipcRenderer.invoke('storage:app:remove', normalizedKey).catch((error) => {
    if (hadPreviousValue) {
      appStorageCache.set(normalizedKey, previousValue);
    }
    console.error(`Failed to remove app storage key "${normalizedKey}":`, error);
  });
};

contextBridge.exposeInMainWorld('axchat', {
  readStoredAppValue,
  writeStoredAppValue,
  removeStoredAppValue,
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  getAppVersion: () => ipcRenderer.invoke('window:get-app-version'),
  setTheme: (theme) => ipcRenderer.invoke('window:set-theme', theme),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  openUpdateDownload: () => ipcRenderer.invoke('updater:open-download'),
  getUpdaterStatus: () => ipcRenderer.invoke('updater:get-status'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  setProxyStaticHttp2: (enabled) => ipcRenderer.invoke('proxy:set-static-http2', enabled),
  setProxyAllowHttpTargets: (enabled) =>
    ipcRenderer.invoke('proxy:set-allow-http-targets', enabled),
  syncOfficialProviderCatalog: (providerId) =>
    ipcRenderer.invoke('models:sync-official-preview', providerId),
  listStoredSessions: () => ipcRenderer.invoke('storage:sessions:list'),
  getStoredSession: (sessionId) => ipcRenderer.invoke('storage:sessions:get', sessionId),
  getStoredActiveSessionId: () => ipcRenderer.invoke('storage:sessions:get-active-id'),
  setStoredActiveSessionId: (sessionId) =>
    ipcRenderer.invoke('storage:sessions:set-active-id', sessionId),
  clearStoredActiveSessionId: () => ipcRenderer.invoke('storage:sessions:clear-active-id'),
  saveStoredSession: (session) => ipcRenderer.invoke('storage:sessions:save', session),
  renameStoredSession: (payload) => ipcRenderer.invoke('storage:sessions:rename', payload),
  deleteStoredSession: (sessionId) => ipcRenderer.invoke('storage:sessions:delete', sessionId),
  searchStoredSessions: (payload) => ipcRenderer.invoke('storage:sessions:search', payload),
  getProxyPort: () => resolveProxyPort(process.env.MINIMAX_PROXY_PORT),
  getProxyHost: () => resolveProxyHost(process.env.MINIMAX_PROXY_HOST),
  onMaximizeChanged: (callback) => {
    const onMax = () => callback(true);
    const onUnmax = () => callback(false);
    ipcRenderer.on('window:maximize', onMax);
    ipcRenderer.on('window:unmaximize', onUnmax);
    return () => {
      ipcRenderer.removeListener('window:maximize', onMax);
      ipcRenderer.removeListener('window:unmaximize', onUnmax);
    };
  },
  onUpdaterStatus: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('updater:status', handler);
    return () => {
      ipcRenderer.removeListener('updater:status', handler);
    };
  },
  setTrayLanguage: (language) => ipcRenderer.invoke('tray:set-language', language),
  setTrayLabels: (labels) => ipcRenderer.invoke('tray:set-labels', labels),
  clearCache: () => ipcRenderer.invoke('app:clear-cache'),
  notifyBootstrapReady: () => ipcRenderer.send('app:bootstrap-ready'),
});
