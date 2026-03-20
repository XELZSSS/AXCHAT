const { app, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const { getDistributionMode } = require('./distribution.cjs');
const { resolveLatestRelease, resolveWindowsInstallerUrl } = require('./updaterReleaseApi.cjs');

let initialized = false;
let installerListenersBound = false;
let getMainWindowRef = null;

const updaterState = {
  status: 'idle',
  distribution: getDistributionMode(),
  message: '',
  version: app.getVersion(),
  availableVersion: '',
  error: '',
  downloadUrl: '',
};

const cloneState = () => ({ ...updaterState });

const emitStatus = () => {
  const win = getMainWindowRef?.();
  if (!win || win.isDestroyed()) {
    return;
  }

  win.webContents.send('updater:status', cloneState());
};

const setState = (patch) => {
  Object.assign(updaterState, patch, {
    distribution: getDistributionMode(),
  });
  emitStatus();
};

const getErrorMessage = (error) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'number' || typeof error === 'boolean' || typeof error === 'bigint') {
    return `${error}`;
  }

  try {
    return JSON.stringify(error) ?? 'Unknown error';
  } catch {
    return 'Unknown error';
  }
};

const normalizeVersion = (value) =>
  String(value ?? '')
    .trim()
    .replace(/^v/i, '');

const compareVersions = (a, b) => {
  const pa = normalizeVersion(a)
    .split('.')
    .map((item) => Number.parseInt(item, 10) || 0);
  const pb = normalizeVersion(b)
    .split('.')
    .map((item) => Number.parseInt(item, 10) || 0);
  const maxLength = Math.max(pa.length, pb.length);

  for (let index = 0; index < maxLength; index += 1) {
    const av = pa[index] ?? 0;
    const bv = pb[index] ?? 0;
    if (av !== bv) {
      return av > bv ? 1 : -1;
    }
  }

  return 0;
};

const configureInstallerUpdater = () => {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.disableWebInstaller = false;
};

const bindInstallerUpdaterListeners = () => {
  if (installerListenersBound) {
    return;
  }

  installerListenersBound = true;
  autoUpdater.on('checking-for-update', () => {
    setState({
      status: 'checking',
      message: 'Checking for updates...',
      availableVersion: '',
      downloadUrl: '',
      error: '',
    });
  });
  autoUpdater.on('update-available', (info) => {
    setState({
      status: 'available',
      message: 'Update found.',
      availableVersion: normalizeVersion(info?.version),
      downloadUrl: '',
      error: '',
    });
  });
  autoUpdater.on('update-not-available', () => {
    setState({
      status: 'not-available',
      message: 'You are using the latest version.',
      availableVersion: '',
      downloadUrl: '',
      error: '',
    });
  });
  autoUpdater.on('download-progress', () => {
    setState({
      status: 'downloading',
      message: 'Downloading update...',
      error: '',
    });
  });
  autoUpdater.on('update-downloaded', (info) => {
    setState({
      status: 'downloaded',
      message: 'Update downloaded. It will be installed after you quit the app.',
      availableVersion: normalizeVersion(info?.version),
      error: '',
    });
  });
  autoUpdater.on('error', (error) => {
    setState({
      status: 'error',
      message: 'Failed to check updates.',
      availableVersion: '',
      downloadUrl: '',
      error: getErrorMessage(error),
    });
  });
};

const initializePortableUpdater = () => {
  setState({
    status: 'idle',
    message: '',
    availableVersion: '',
    downloadUrl: '',
    error: '',
  });
};

const initializeDevelopmentUpdater = () => {
  setState({
    status: 'disabled',
    message: 'Auto update is disabled in development mode.',
    availableVersion: '',
    downloadUrl: '',
    error: '',
  });
};

const runPortableUpdateCheck = async () => {
  setState({
    status: 'checking',
    message: 'Checking for updates...',
    availableVersion: '',
    downloadUrl: '',
    error: '',
  });

  try {
    const release = await resolveLatestRelease();
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
      message: 'Update found. Open the download page.',
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
      error: getErrorMessage(error),
    });
  }
};

const initUpdater = ({ getMainWindow }) => {
  if (initialized) {
    return;
  }

  initialized = true;
  getMainWindowRef = getMainWindow;

  if (!app.isPackaged) {
    initializeDevelopmentUpdater();
    return;
  }

  if (getDistributionMode() === 'portable') {
    initializePortableUpdater();
    return;
  }

  configureInstallerUpdater();
  bindInstallerUpdaterListeners();
};

const checkForUpdates = async () => {
  if (!app.isPackaged) {
    return;
  }

  if (getDistributionMode() === 'portable') {
    await runPortableUpdateCheck();
    return;
  }

  await autoUpdater.checkForUpdates();
};

const openUpdateDownload = async () => {
  if (!app.isPackaged) {
    return;
  }

  if (getDistributionMode() === 'portable') {
    const url = updaterState.downloadUrl?.trim();
    if (!url) {
      return;
    }

    setState({
      status: 'redirecting',
      message: 'Redirecting to the download page...',
      error: '',
    });
    await shell.openExternal(url);
    return;
  }

  if (updaterState.status === 'available') {
    await autoUpdater.downloadUpdate();
  }
};

const getUpdaterState = () => cloneState();

module.exports = {
  initUpdater,
  checkForUpdates,
  openUpdateDownload,
  getUpdaterState,
};
