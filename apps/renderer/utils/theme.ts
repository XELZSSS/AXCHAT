import { readAppStorage, writeAppStorage } from '../services/storageKeys';

export type Theme = 'dark' | 'light';

const DEFAULT_THEME: Theme = 'dark';

const getStoredTheme = (): Theme | null => {
  const stored = readAppStorage('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return null;
};

let currentTheme: Theme = getStoredTheme() ?? DEFAULT_THEME;

export const getTheme = (): Theme => currentTheme;

const syncThemeToElectron = (): void => {
  if (typeof window === 'undefined') return;
  const syncTask = window.gero?.setTheme?.(currentTheme);
  if (syncTask && typeof syncTask.catch === 'function') {
    void syncTask.catch(() => {
      // Ignore Electron IPC errors so web previews continue to work.
    });
  }
};

export const applyThemeToDocument = (): void => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = currentTheme;
  document.documentElement.style.colorScheme = currentTheme;
  syncThemeToElectron();
};

export const setTheme = (theme: Theme): void => {
  currentTheme = theme;
  writeAppStorage('theme', theme);
  applyThemeToDocument();
};
