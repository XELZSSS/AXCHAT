type KeyDefinition = {
  current: string;
  legacy: readonly string[];
};

const STORAGE_KEYS = {
  sessions: {
    current: 'axchat_session_index_v1',
    legacy: [],
  },
  activeSessionId: {
    current: 'axchat_active_session_id_v1',
    legacy: [],
  },
  providerSettings: {
    current: 'axchat_provider_settings',
    legacy: [],
  },
  activeProvider: {
    current: 'axchat_active_provider',
    legacy: [],
  },
  language: {
    current: 'axchat_language',
    legacy: [],
  },
  theme: {
    current: 'axchat_theme',
    legacy: [],
  },
  searchEnabled: {
    current: 'axchat_search_enabled',
    legacy: [],
  },
  inputDraft: {
    current: 'axchat_input_draft',
    legacy: [],
  },
  toolCallMaxRounds: {
    current: 'axchat_tool_call_max_rounds',
    legacy: [],
  },
  proxyStaticHttp2: {
    current: 'axchat_proxy_static_http2',
    legacy: [],
  },
  appVersion: {
    current: 'axchat_app_version',
    legacy: [],
  },
  updaterStatus: {
    current: 'axchat_updater_status',
    legacy: [],
  },
  secretStorageInfo: {
    current: 'axchat_secret_storage_info',
    legacy: [],
  },
} as const satisfies Record<string, KeyDefinition>;

export type AppStorageKey = keyof typeof STORAGE_KEYS;

const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const hasNativeAppStorage = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.axchat?.readStoredAppValue) &&
    Boolean(window.axchat?.writeStoredAppValue) &&
    Boolean(window.axchat?.removeStoredAppValue)
  );
};

const safeGetItem = (storage: Storage, key: string): string | null => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (storage: Storage, key: string, value: string): void => {
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore persistence failures.
  }
};

const safeRemoveItem = (storage: Storage, key: string): void => {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore persistence failures.
  }
};

export const getAppStorageKey = (key: AppStorageKey): string => STORAGE_KEYS[key].current;

export const readAppStorage = (key: AppStorageKey): string | null => {
  const storage = getLocalStorage();
  const { current, legacy } = STORAGE_KEYS[key];
  if (storage) {
    const currentValue = safeGetItem(storage, current);
    if (currentValue !== null) {
      return currentValue;
    }

    for (const legacyKey of legacy) {
      const legacyValue = safeGetItem(storage, legacyKey);
      if (legacyValue === null) continue;
      safeSetItem(storage, current, legacyValue);
      safeRemoveItem(storage, legacyKey);
      if (hasNativeAppStorage()) {
        try {
          window.axchat?.writeStoredAppValue(key, legacyValue);
        } catch {
          // ignore migration failures
        }
      }
      return legacyValue;
    }
  }

  if (hasNativeAppStorage()) {
    try {
      const nativeValue = window.axchat?.readStoredAppValue(key);
      if (nativeValue !== null && nativeValue !== undefined) {
        if (storage) {
          safeSetItem(storage, current, nativeValue);
          for (const legacyKey of legacy) {
            safeRemoveItem(storage, legacyKey);
          }
        }
        return nativeValue;
      }
    } catch {
      // fall back to renderer storage below
    }
  }

  return null;
};

export const writeAppStorage = (key: AppStorageKey, value: string): void => {
  const storage = getLocalStorage();
  const { current, legacy } = STORAGE_KEYS[key];

  if (storage) {
    safeSetItem(storage, current, value);
    for (const legacyKey of legacy) {
      safeRemoveItem(storage, legacyKey);
    }
  }

  if (hasNativeAppStorage()) {
    try {
      window.axchat?.writeStoredAppValue(key, value);
    } catch {
      // keep local mirror even if native persistence fails
    }
  }
};

export const removeAppStorage = (key: AppStorageKey): void => {
  const storage = getLocalStorage();
  const { current, legacy } = STORAGE_KEYS[key];

  if (storage) {
    safeRemoveItem(storage, current);
    for (const legacyKey of legacy) {
      safeRemoveItem(storage, legacyKey);
    }
  }

  if (hasNativeAppStorage()) {
    try {
      window.axchat?.removeStoredAppValue(key);
    } catch {
      // keep local removal even if native persistence fails
    }
  }
};

export const cleanupLegacyAppStorage = (): void => {};
