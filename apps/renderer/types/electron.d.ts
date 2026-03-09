import type { UpdaterStatus } from '../services/updaterClient';
import type { ChatSession } from '../types';

export {};

type ElectronSecretStorageInfo = {
  mode: 'secure' | 'plain';
  backend: string;
};

declare global {
  interface Window {
    axchat?: {
      readStoredAppValue: (key: string) => string | null;
      writeStoredAppValue: (key: string, value: string) => void;
      removeStoredAppValue: (key: string) => void;
      getSecretStorageInfo: () => Promise<ElectronSecretStorageInfo>;
      minimize: () => Promise<void>;
      toggleMaximize: () => Promise<void>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      getAppVersion: () => Promise<string>;
      setTheme: (theme: 'dark' | 'light') => Promise<void>;
      checkForUpdates: () => Promise<void>;
      openUpdateDownload: () => Promise<void>;
      getUpdaterStatus: () => Promise<UpdaterStatus>;
      onUpdaterStatus: (callback: (status: UpdaterStatus) => void) => () => void;
      openExternal: (url: string) => Promise<void>;
      setProxyStaticHttp2: (enabled: boolean) => Promise<{
        changed: boolean;
        enabled: boolean;
      }>;
      listStoredSessions: () => Promise<ChatSession[]>;
      getStoredSession: (sessionId: string) => Promise<ChatSession | null>;
      getStoredActiveSessionId: () => Promise<string | null>;
      setStoredActiveSessionId: (sessionId: string) => Promise<void>;
      clearStoredActiveSessionId: () => Promise<void>;
      saveStoredSession: (session: ChatSession) => Promise<void>;
      renameStoredSession: (payload: { sessionId: string; title: string }) => Promise<void>;
      deleteStoredSession: (sessionId: string) => Promise<void>;
      searchStoredSessions: (payload: { query: string; limit?: number }) => Promise<ChatSession[]>;
      getProxyToken: () => string | undefined;
      getProxyPort: () => string;
      getProxyHost: () => string;
      onMaximizeChanged: (callback: (isMaximized: boolean) => void) => () => void;
      setTrayLanguage: (language: 'en' | 'zh-CN') => Promise<void>;
      setTrayLabels: (labels: {
        open: string;
        hide: string;
        toggleDevTools: string;
        quit: string;
      }) => Promise<void>;
      notifyBootstrapReady: () => void;
    };
  }
}
