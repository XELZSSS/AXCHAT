/* global setTimeout, clearTimeout, process, Buffer */
const { app, BrowserWindow, ipcMain, nativeTheme, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { listAppStorageValues } = require('./storage/appStorage.cjs');
const { shouldOpenExternalUrl } = require('../shared/external-url.cjs');

const WINDOW_STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');
const THEME_STATE_FILE = path.join(app.getPath('userData'), 'theme-state.json');
const DEFAULT_WINDOW_STATE = { width: 1200, height: 760 };
const MIN_WINDOW_SIZE = { width: 1024, height: 700 };
const DEFAULT_THEME = 'dark';
const WINDOW_BG_BY_THEME = {
  dark: '#09090b',
  light: '#f5f7fb',
};
const BOOTSTRAP_SHOW_TIMEOUT_MS = 3000;
const APP_STORAGE_BOOTSTRAP_KEYS = [
  'providerSettings',
  'activeProvider',
  'language',
  'theme',
  'searchEnabled',
  'researchEnabled',
  'inputDraft',
  'settingsActiveTab',
  'toolCallMaxRounds',
  'proxyStaticHttp2',
  'proxyAllowHttpTargets',
];

let mainWindow = null;
let saveTimer = null;
let currentTheme = DEFAULT_THEME;

const persistJsonFile = (filePath, payload) => {
  void fs.promises.writeFile(filePath, JSON.stringify(payload)).catch(() => {
    // ignore persistence errors
  });
};

const isTheme = (value) => value === 'dark' || value === 'light';

const getWindowBackgroundColor = (theme) =>
  theme === 'light' ? WINDOW_BG_BY_THEME.light : WINDOW_BG_BY_THEME.dark;

const loadThemeState = async () => {
  try {
    const raw = await fs.promises.readFile(THEME_STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return isTheme(parsed?.theme) ? parsed.theme : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

const persistThemeState = (theme) => {
  const resolved = isTheme(theme) ? theme : DEFAULT_THEME;
  persistJsonFile(THEME_STATE_FILE, { theme: resolved });
};

const applyWindowTheme = (theme, { persist = false } = {}) => {
  const resolved = isTheme(theme) ? theme : DEFAULT_THEME;
  currentTheme = resolved;
  nativeTheme.themeSource = resolved;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setBackgroundColor(getWindowBackgroundColor(resolved));
  }
  if (persist) {
    persistThemeState(resolved);
  }
  return resolved;
};

const loadWindowState = async () => {
  try {
    const raw = await fs.promises.readFile(WINDOW_STATE_FILE, 'utf-8');
    return { ...DEFAULT_WINDOW_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_WINDOW_STATE };
  }
};

const scheduleWindowStateSave = (win) => {
  if (!win) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      if (!win || win.isDestroyed()) return;
      const bounds = win.getBounds();
      const state = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: win.isMaximized(),
      };
      persistJsonFile(WINDOW_STATE_FILE, state);
    } catch {
      // ignore destroyed window or persistence errors
    }
  }, 250);
};

const getWindowIcon = () => {
  const root = app.getAppPath();
  return path.join(root, 'assets', 'icons', 'app.png');
};

const showWindow = () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
};

const getMainWindow = () => mainWindow;

const emitWindowStateEvent = (channel) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(channel);
};

const withMainWindow =
  (handler, fallback) =>
  (_event, ...args) => {
    if (!mainWindow) return fallback;
    return handler(mainWindow, ...args);
  };

const loadWindowContent = async (win, isDev) => {
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:3000';
    try {
      await win.loadURL(devUrl);
    } catch {
      setTimeout(() => win?.loadURL(devUrl), 500);
    }
    return;
  }

  await win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
};

const encodeAppStorageBootstrap = () => {
  const snapshot = listAppStorageValues(APP_STORAGE_BOOTSTRAP_KEYS);
  return Buffer.from(JSON.stringify(snapshot), 'utf8').toString('base64url');
};

const registerExternalNavigationGuards = (win, isDev) => {
  // Route all external window.open requests to the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (shouldOpenExternalUrl(url, isDev, process.env.VITE_DEV_SERVER_URL)) {
      void shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Keep the app shell locked and route external navigations out of process.
  win.webContents.on('will-navigate', (event, url) => {
    if (!shouldOpenExternalUrl(url, isDev, process.env.VITE_DEV_SERVER_URL)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });
};

const createMainWindow = async ({ isDev, shouldPreventClose }) => {
  const [state, theme] = await Promise.all([loadWindowState(), loadThemeState()]);
  const initialTheme = applyWindowTheme(theme);

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    minWidth: MIN_WINDOW_SIZE.width,
    minHeight: MIN_WINDOW_SIZE.height,
    x: state.x,
    y: state.y,
    show: isDev,
    backgroundColor: getWindowBackgroundColor(initialTheme),
    transparent: false,
    autoHideMenuBar: true,
    frame: false,
    icon: getWindowIcon(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(app.getAppPath(), 'apps', 'main', 'preload.cjs'),
      additionalArguments: [`--axchat-app-storage-bootstrap=${encodeAppStorageBootstrap()}`],
    },
  });
  mainWindow.setBackgroundColor(getWindowBackgroundColor(initialTheme));
  mainWindow.setAutoHideMenuBar(true);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.removeMenu();
  registerExternalNavigationGuards(mainWindow, isDev);

  if (state.isMaximized) {
    mainWindow.maximize();
  }

  let hasShownWindow = false;

  const showMainWindowOnce = () => {
    if (!mainWindow || mainWindow.isDestroyed() || hasShownWindow) return;
    hasShownWindow = true;
    showWindow();
  };

  const onBootstrapReady = (event) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (event.sender !== mainWindow.webContents) return;
    showMainWindowOnce();
  };

  ipcMain.on('app:bootstrap-ready', onBootstrapReady);

  const bootstrapTimeout = setTimeout(
    () => {
      if (!mainWindow || mainWindow.isDestroyed() || hasShownWindow) return;
      showMainWindowOnce();
    },
    isDev ? BOOTSTRAP_SHOW_TIMEOUT_MS : Math.max(1500, BOOTSTRAP_SHOW_TIMEOUT_MS)
  );

  if (isDev) {
    mainWindow.once('ready-to-show', () => {
      showMainWindowOnce();
    });

    mainWindow.webContents.once('did-finish-load', () => {
      showMainWindowOnce();
    });
  }

  mainWindow.on('close', (event) => {
    if (shouldPreventClose?.()) {
      event.preventDefault();
      mainWindow.hide();
      return;
    }
    scheduleWindowStateSave(mainWindow);
  });
  mainWindow.on('closed', () => {
    clearTimeout(bootstrapTimeout);
    ipcMain.removeListener('app:bootstrap-ready', onBootstrapReady);
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    mainWindow = null;
  });

  mainWindow.on('resize', () => scheduleWindowStateSave(mainWindow));
  mainWindow.on('move', () => scheduleWindowStateSave(mainWindow));
  mainWindow.on('resize', () =>
    mainWindow.setBackgroundColor(getWindowBackgroundColor(currentTheme))
  );

  mainWindow.on('maximize', () => emitWindowStateEvent('window:maximize'));
  mainWindow.on('unmaximize', () => emitWindowStateEvent('window:unmaximize'));

  await loadWindowContent(mainWindow, isDev);
};

const registerWindowIpcHandlers = () => {
  ipcMain.handle(
    'window:minimize',
    withMainWindow((win) => {
      win.minimize();
    })
  );
  ipcMain.handle(
    'window:toggle-maximize',
    withMainWindow((win) => {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    })
  );
  ipcMain.handle(
    'window:close',
    withMainWindow((win) => {
      win.hide();
    })
  );
  ipcMain.handle(
    'window:is-maximized',
    withMainWindow((win) => win.isMaximized(), false)
  );
  ipcMain.handle('window:get-app-version', () => app.getVersion());
  ipcMain.handle('window:set-theme', (_event, theme) => {
    applyWindowTheme(theme, { persist: true });
  });
};

module.exports = {
  createMainWindow,
  getMainWindow,
  registerWindowIpcHandlers,
  showWindow,
};
