/* global __dirname, process */
const { app, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { parseExternalHttpUrl, shouldOpenExternalUrl } = require('../../shared/external-url.cjs');
const {
  readAppStorageValue,
  writeAppStorageValue,
  removeAppStorageValue,
} = require('../storage/appStorage.cjs');

const clearAppCache = async () => {
  const session = require('electron').session;
  await session.defaultSession.clearCache();
  await session.defaultSession.clearStorageData({
    storages: ['cachestorage', 'indexdb', 'serviceworkers'],
  });
  return { ok: true };
};

const execFileAsync = promisify(execFile);

const resolveOfficialCatalogSyncScript = () => {
  const rootDir = path.resolve(__dirname, '..', '..', '..');
  const localScriptPath = path.join(rootDir, 'scripts', 'sync-official-model-catalogs.mjs');
  if (fs.existsSync(localScriptPath)) {
    return localScriptPath;
  }

  const resourcesScriptPath = path.join(
    process.resourcesPath,
    'scripts',
    'sync-official-model-catalogs.mjs'
  );
  if (fs.existsSync(resourcesScriptPath)) {
    return resourcesScriptPath;
  }

  return localScriptPath;
};

const resolveOfficialCatalogSyncCwd = () => {
  if (app.isPackaged) {
    return process.resourcesPath;
  }

  return path.resolve(__dirname, '..', '..', '..');
};

const buildSystemHandlers = ({
  setTrayLanguage,
  setTrayLabels,
  checkForUpdates,
  openUpdateDownload,
  getUpdaterState,
  setStaticProxyHttp2Enabled,
  setAllowHttpTargets,
  prepareForClearUserData,
}) => ({
  'storage:app:read': async (_event, key) => {
    return readAppStorageValue(key);
  },
  'storage:app:write': async (_event, payload) => {
    const record = payload && typeof payload === 'object' ? payload : {};
    writeAppStorageValue(record.key, record.value);
  },
  'storage:app:remove': async (_event, key) => {
    removeAppStorageValue(key);
  },
  'tray:set-language': (_event, language) => {
    setTrayLanguage(language);
  },
  'tray:set-labels': (_event, labels) => {
    setTrayLabels(labels);
  },
  'updater:check': async () => {
    await checkForUpdates();
  },
  'updater:open-download': () => {
    openUpdateDownload();
  },
  'updater:get-status': () => {
    return getUpdaterState();
  },
  'app:open-external': async (_event, url) => {
    const target = String(url ?? '').trim();
    if (!target) return;
    if (!shouldOpenExternalUrl(target, !app.isPackaged, process.env.VITE_DEV_SERVER_URL)) {
      throw new Error(
        'Blocked external URL: only http/https URLs outside the app origin are allowed'
      );
    }

    const parsed = parseExternalHttpUrl(target);
    await shell.openExternal(parsed.toString());
  },
  'proxy:set-static-http2': (_event, enabled) => {
    return setStaticProxyHttp2Enabled(enabled);
  },
  'proxy:set-allow-http-targets': (_event, enabled) => {
    return setAllowHttpTargets(enabled);
  },
  'app:clear-cache': async () => {
    if (typeof prepareForClearUserData === 'function') {
      await prepareForClearUserData();
    }
    return clearAppCache();
  },
  'models:sync-official-preview': async (_event, providerId) => {
    const normalizedProviderId = String(providerId ?? '').trim();
    if (!normalizedProviderId) return [];

    const scriptPath = resolveOfficialCatalogSyncScript();
    if (!fs.existsSync(scriptPath)) {
      throw new Error('Official model sync script is not available in this environment');
    }

    const { stdout } = await execFileAsync(
      process.execPath,
      [scriptPath, '--provider', normalizedProviderId, '--json'],
      {
        cwd: resolveOfficialCatalogSyncCwd(),
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
        },
        windowsHide: true,
        maxBuffer: 1024 * 1024,
        timeout: 30000,
      }
    );

    const payload = JSON.parse(stdout.trim());
    if (payload?.error) {
      throw new Error(payload.error);
    }

    const result = payload?.providers?.find?.((item) => item?.providerId === normalizedProviderId);
    if (!result) return [];
    if (result.error) {
      throw new Error(result.error);
    }

    return Array.isArray(result.models) ? result.models : [];
  },
});

module.exports = {
  buildSystemHandlers,
};
