/* global document, window */
(function () {
  var DEFAULT_THEME = 'dark';
  var THEME_KEY = 'achatx_theme';
  var LEGACY_THEME_KEY = 'gemini_chat_theme';
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
    var storage = window.localStorage;
    var theme = storage.getItem(THEME_KEY);

    if (theme !== 'light' && theme !== 'dark') {
      var legacyTheme = storage.getItem(LEGACY_THEME_KEY);
      if (legacyTheme === 'light' || legacyTheme === 'dark') {
        theme = legacyTheme;
        storage.setItem(THEME_KEY, legacyTheme);
        storage.removeItem(LEGACY_THEME_KEY);
      } else {
        theme = null;
      }
    }

    applyTheme(theme || DEFAULT_THEME);
  } catch {
    applyTheme(DEFAULT_THEME);
  }
})();
