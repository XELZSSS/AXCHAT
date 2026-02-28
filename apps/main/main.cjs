/* global __dirname, setTimeout */
const { app, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

const resolveMainModule = (name) => {
  const localPath = path.join(__dirname, `${name}.cjs`);
  if (fs.existsSync(localPath)) return localPath;
  return path.join(__dirname, 'apps', 'main', `${name}.cjs`);
};

const { createMainWindow, getMainWindow, registerWindowIpcHandlers, showWindow } = require(
  resolveMainModule('window')
);
const { createTray, setTrayLanguage, setTrayLabels } = require(resolveMainModule('tray'));
const { startProxy, stopProxy } = require(resolveMainModule('proxy'));
const { registerAppIpcHandlers } = require(resolveMainModule('ipc'));
const { initUpdater, checkForUpdates, quitAndInstall, getUpdaterState } = require(
  resolveMainModule('updater')
);

const isDev = !app.isPackaged;
let isQuitting = false;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showWindow();
  });
}

app.on('before-quit', () => {
  isQuitting = true;
  stopProxy();
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

app.on('activate', () => {
  if (getMainWindow()) {
    showWindow();
  } else {
    createMainWindow({ isDev, shouldPreventClose: () => !isQuitting });
  }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerAppIpcHandlers({
    registerWindowIpcHandlers,
    setTrayLanguage,
    setTrayLabels,
    checkForUpdates,
    quitAndInstall,
    getUpdaterState,
  });
  initUpdater({ getMainWindow });
  startProxy(isDev);
  createTray({
    isDev,
    getMainWindow,
    showWindow,
    onQuit: () => {
      isQuitting = true;
    },
  });
  createMainWindow({ isDev, shouldPreventClose: () => !isQuitting });
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
