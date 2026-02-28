const { ipcMain } = require('electron');

const registerIpcHandlers = (handlers) => {
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, handler);
  }
};

const registerAppIpcHandlers = ({
  registerWindowIpcHandlers,
  setTrayLanguage,
  setTrayLabels,
  checkForUpdates,
  quitAndInstall,
  getUpdaterState,
}) => {
  registerWindowIpcHandlers();
  registerIpcHandlers({
    'tray:set-language': (_event, language) => {
      setTrayLanguage(language);
    },
    'tray:set-labels': (_event, labels) => {
      setTrayLabels(labels);
    },
    'updater:check': async () => {
      await checkForUpdates();
    },
    'updater:quit-and-install': () => {
      quitAndInstall();
    },
    'updater:get-status': () => {
      return getUpdaterState();
    },
  });
};

module.exports = {
  registerAppIpcHandlers,
};
