/* global document, window */
(function () {
  var DEFAULT_THEME = 'dark';
  var THEME_KEY = 'axchat_theme';
  var DARK_BG = '#09090b';
  var LIGHT_BG = '#f5f7fb';

  var applyTheme = function (theme) {
    var resolved = theme === 'light' ? 'light' : 'dark';
    var background = resolved === 'light' ? LIGHT_BG : DARK_BG;
    var root = document.documentElement;

    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
    root.style.backgroundColor = background;
  };

  try {
    var readNativeValue =
      window.axchat && typeof window.axchat.readStoredAppValue === 'function'
        ? function (key) {
            try {
              return window.axchat.readStoredAppValue(key);
            } catch {
              return null;
            }
          }
        : function () {
            return null;
          };
    var storage = window.localStorage;
    var theme = storage.getItem(THEME_KEY);

    if (theme !== 'light' && theme !== 'dark') {
      theme = readNativeValue('theme');
      if (theme === 'light' || theme === 'dark') {
        storage.setItem(THEME_KEY, theme);
      }
    }

    applyTheme(theme || DEFAULT_THEME);
  } catch {
    applyTheme(DEFAULT_THEME);
  }
})();
