const { app, shell } = require('electron');
const https = require('https');

let initialized = false;
let getMainWindowRef = null;
const RELEASE_API_URL = 'https://api.github.com/repos/XELZSSS/AXCHAT/releases/latest';
const UPDATE_REQUEST_TIMEOUT_MS = 10000;

const updaterState = {
  status: 'idle',
  message: '',
  version: app.getVersion(),
  availableVersion: '',
  error: '',
  downloadUrl: '',
};

const cloneState = () => ({ ...updaterState });

const emitStatus = () => {
  const win = getMainWindowRef?.();
  if (!win || win.isDestroyed()) return;
  win.webContents.send('updater:status', cloneState());
};

const setState = (patch) => {
  Object.assign(updaterState, patch);
  emitStatus();
};

const normalizeVersion = (value) =>
  String(value ?? '')
    .trim()
    .replace(/^v/i, '');

const compareVersions = (a, b) => {
  const pa = normalizeVersion(a)
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0);
  const pb = normalizeVersion(b)
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0);
  const max = Math.max(pa.length, pb.length);
  for (let i = 0; i < max; i += 1) {
    const av = pa[i] ?? 0;
    const bv = pb[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
};

const requestJson = (url) =>
  new Promise((resolve, reject) => {
    let settled = false;

    const finalizeResolve = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const finalizeReject = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const req = https.request(
      url,
      {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'AXCHAT-Updater',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('error', finalizeReject);
        res.on('end', () => {
          if ((res.statusCode ?? 500) >= 400) {
            finalizeReject(new Error(`GitHub API error: ${res.statusCode}`));
            return;
          }
          try {
            finalizeResolve(JSON.parse(data));
          } catch (error) {
            finalizeReject(error);
          }
        });
      }
    );

    req.on('error', finalizeReject);
    req.setTimeout(UPDATE_REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`GitHub API request timed out after ${UPDATE_REQUEST_TIMEOUT_MS}ms`));
    });
    req.end();
  });

const resolveWindowsInstallerUrl = (release) => {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const setupAsset = assets.find((asset) => {
    const name = String(asset?.name ?? '').toLowerCase();
    return name.endsWith('.exe') && (name.includes('setup') || name.includes('installer'));
  });
  if (setupAsset?.browser_download_url) return String(setupAsset.browser_download_url);
  const anyExeAsset = assets.find((asset) =>
    String(asset?.name ?? '')
      .toLowerCase()
      .endsWith('.exe')
  );
  return anyExeAsset?.browser_download_url ? String(anyExeAsset.browser_download_url) : '';
};

const initUpdater = ({ getMainWindow }) => {
  if (initialized) return;
  initialized = true;
  getMainWindowRef = getMainWindow;

  if (!app.isPackaged) {
    setState({
      status: 'disabled',
      message: 'Auto update is disabled in development mode.',
      error: '',
      downloadUrl: '',
    });
  }
};

const checkForUpdates = async () => {
  if (!app.isPackaged) return;

  setState({
    status: 'checking',
    message: 'Checking for updates...',
    availableVersion: '',
    downloadUrl: '',
    error: '',
  });

  try {
    const release = await requestJson(RELEASE_API_URL);
    const latestVersion = normalizeVersion(release?.tag_name ?? release?.name ?? '');
    const currentVersion = normalizeVersion(updaterState.version);
    const downloadUrl = resolveWindowsInstallerUrl(release);

    if (!latestVersion) {
      throw new Error('Missing latest release version tag.');
    }

    if (compareVersions(latestVersion, currentVersion) <= 0) {
      setState({
        status: 'not-available',
        message: 'You are using the latest version.',
        availableVersion: '',
        downloadUrl: '',
        error: '',
      });
      return;
    }

    if (!downloadUrl) {
      throw new Error('No Windows installer (.exe) asset found in latest release.');
    }

    setState({
      status: 'available',
      message: 'Update found. Click to download installer.',
      availableVersion: latestVersion,
      downloadUrl,
      error: '',
    });
  } catch (error) {
    setState({
      status: 'error',
      message: 'Failed to check updates.',
      availableVersion: '',
      downloadUrl: '',
      error: error instanceof Error ? error.message : String(error ?? 'Unknown error'),
    });
  }
};

const openUpdateDownload = () => {
  const url = updaterState.downloadUrl?.trim();
  if (!url) return;
  void shell.openExternal(url);
};

const getUpdaterState = () => cloneState();

module.exports = {
  initUpdater,
  checkForUpdates,
  openUpdateDownload,
  getUpdaterState,
};
