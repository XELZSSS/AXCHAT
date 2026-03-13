/* global __dirname, setTimeout, console, process */
const { app, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { installConsoleStyle } = require('./consoleStyle.cjs');

installConsoleStyle('main');

const resolveMainModule = (name) => {
  const localPath = path.join(__dirname, `${name}.cjs`);
  if (fs.existsSync(localPath)) return localPath;
  return path.join(__dirname, 'apps', 'main', `${name}.cjs`);
};

const { createMainWindow, getMainWindow, registerWindowIpcHandlers, showWindow } = require(
  resolveMainModule('window')
);
const { createTray, setTrayLanguage, setTrayLabels } = require(resolveMainModule('tray'));
const {
  startProxy,
  stopProxy,
  setStaticProxyHttp2Enabled,
  setAllowHttpTargets,
  installProxyAuthHeaderInjection,
} = require(resolveMainModule('proxy'));
const { registerAppIpcHandlers } = require(resolveMainModule('ipc'));
const { ensureDatabase, closeDatabase } = require(resolveMainModule('storage/db'));
const { initUpdater, checkForUpdates, openUpdateDownload, getUpdaterState } = require(
  resolveMainModule('updater')
);

const isDev = !app.isPackaged;

let isQuitting = false;

const allowSecondInstance = isDev && process.env.AXCHAT_ALLOW_SECOND_INSTANCE === '1';
if (!allowSecondInstance) {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      showWindow();
    });
  }
}

app.on('before-quit', () => {
  isQuitting = true;
  stopProxy();
  closeDatabase();
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (isQuitting || process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (getMainWindow()) {
    showWindow();
  } else {
    void createMainWindow({
      isDev,
      shouldPreventClose: () => !isQuitting && process.platform === 'win32',
    }).catch((error) => {
      console.error('Failed to recreate main window on activate:', error);
    });
  }
});

app.whenReady().then(async () => {
  ensureDatabase();
  Menu.setApplicationMenu(null);
  registerAppIpcHandlers({
    registerWindowIpcHandlers,
    setTrayLanguage,
    setTrayLabels,
    checkForUpdates,
    openUpdateDownload,
    getUpdaterState,
    setStaticProxyHttp2Enabled,
    setAllowHttpTargets,
    prepareForClearUserData: async () => {
      stopProxy();
      closeDatabase();
      await new Promise((resolve) => setTimeout(resolve, 200));
    },
  });
  void (async () => {
    try {
      await startProxy(isDev);
    } catch (error) {
      console.error('Failed to start local proxy:', error);
    }

    try {
      await createMainWindow({
        isDev,
        shouldPreventClose: () => !isQuitting && process.platform === 'win32',
      });
    } catch (error) {
      console.error('Failed to create main window:', error);
    }

    installProxyAuthHeaderInjection();

    createTray({
      isDev,
      getMainWindow,
      showWindow,
      onQuit: () => {
        isQuitting = true;
      },
    });
    initUpdater({ getMainWindow });
  })();
  setTimeout(() => {
    void checkForUpdates();
  }, 15000);
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    const window = getMainWindow();
    if (!window) return;
    if (window.webContents.isDevToolsOpened()) {
      window.webContents.closeDevTools();
    } else {
      window.webContents.openDevTools({ mode: 'detach' });
    }
  });
});
