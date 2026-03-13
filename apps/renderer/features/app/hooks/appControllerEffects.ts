import { useEffect, useRef } from 'react';
import { t, applyLanguageToDocument, type Language } from '../../../utils/i18n';
import { applyThemeToDocument, type Theme } from '../../../utils/theme';
import { getUpdaterStatus, subscribeUpdaterStatus } from '../../../services/updaterClient';
import type { UpdaterStatus } from '../../../services/updaterClient';

let hasNotifiedBootstrapReady = false;

const notifyBootstrapReadyOnce = () => {
  if (hasNotifiedBootstrapReady) return;
  hasNotifiedBootstrapReady = true;
  if (typeof window === 'undefined' || !window.axchat?.notifyBootstrapReady) return;
  window.axchat?.notifyBootstrapReady();
};

export const useElectronBodyClass = () => {
  useEffect(() => {
    const isElectron = typeof window !== 'undefined' && !!window.axchat;
    document.body.classList.toggle('electron', isElectron);
  }, []);
};

export const useDocumentAppearance = (language: Language, theme: Theme) => {
  useEffect(() => {
    applyLanguageToDocument();
    document.title = t('app.title');
  }, [language]);

  useEffect(() => {
    applyThemeToDocument();
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = window.requestAnimationFrame(() => {
      notifyBootstrapReadyOnce();
    });
    return () => {
      window.cancelAnimationFrame(timer);
    };
  }, [language, theme]);
};

export const useUpdaterDownloadPrompt = () => {
  const hasPromptedAvailableUpdateRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.axchat) return;

    const resetPromptFlagIfNeeded = (status: UpdaterStatus['status']) => {
      if (status !== 'available') {
        hasPromptedAvailableUpdateRef.current = false;
      }
    };

    const promptDownloadIfNeeded = (status: UpdaterStatus) => {
      resetPromptFlagIfNeeded(status.status);
      if (status.status !== 'available' || hasPromptedAvailableUpdateRef.current) {
        return;
      }

      hasPromptedAvailableUpdateRef.current = true;
      const shouldOpenDownload = window.confirm(t('settings.update.prompt.downloadNow'));
      if (shouldOpenDownload) {
        void window.axchat?.openUpdateDownload?.();
      }
    };

    void getUpdaterStatus().then((status) => {
      if (status) {
        promptDownloadIfNeeded(status);
      }
    });

    const unsubscribe = subscribeUpdaterStatus((status) => {
      promptDownloadIfNeeded(status);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);
};

export const useBootstrapReadyNotification = (isSessionStateReady: boolean) => {
  useEffect(() => {
    if (!isSessionStateReady) return;
    notifyBootstrapReadyOnce();
  }, [isSessionStateReady]);
};
