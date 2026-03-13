type KeyDefinition = {
  current: string;
  legacy: readonly string[];
};

type NativeAppStorage = Pick<
  NonNullable<Window['axchat']>,
  'readStoredAppValue' | 'writeStoredAppValue' | 'removeStoredAppValue'
>;

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
  proxyAllowHttpTargets: {
    current: 'axchat_proxy_allow_http_targets',
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

const getNativeAppStorage = (): NativeAppStorage | null => {
  if (
    typeof window === 'undefined' ||
    !window.axchat?.readStoredAppValue ||
    !window.axchat?.writeStoredAppValue ||
    !window.axchat?.removeStoredAppValue
  ) {
    return null;
  }

  return window.axchat;
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

const clearLegacyKeys = (storage: Storage, legacyKeys: readonly string[]): void => {
  for (const legacyKey of legacyKeys) {
    safeRemoveItem(storage, legacyKey);
  }
};

const readCurrentOrLegacyLocalValue = (
  key: AppStorageKey,
  storage: Storage
): string | null => {
  const { current, legacy } = STORAGE_KEYS[key];
  const currentValue = safeGetItem(storage, current);
  if (currentValue !== null) {
    syncCurrentValueToNative(key, currentValue);
    return currentValue;
  }

  for (const legacyKey of legacy) {
    const legacyValue = safeGetItem(storage, legacyKey);
    if (legacyValue === null) {
      continue;
    }

    safeSetItem(storage, current, legacyValue);
    clearLegacyKeys(storage, legacy);
    writeNativeAppStorage(key, legacyValue);
    return legacyValue;
  }

  return null;
};

const mirrorNativeValueToLocal = (
  storage: Storage | null,
  key: AppStorageKey,
  value: string
): void => {
  if (!storage) {
    return;
  }

  const { current, legacy } = STORAGE_KEYS[key];
  safeSetItem(storage, current, value);
  clearLegacyKeys(storage, legacy);
};

const syncCurrentValueToNative = (key: AppStorageKey, value: string): void => {
  const nativeAppStorage = getNativeAppStorage();
  if (!nativeAppStorage) {
    return;
  }

  try {
    const nativeValue = nativeAppStorage.readStoredAppValue(key);
    if (nativeValue === value) {
      return;
    }
    nativeAppStorage.writeStoredAppValue(key, value);
  } catch {
    // ignore backfill failures
  }
};

const writeNativeAppStorage = (key: AppStorageKey, value: string): void => {
  const nativeAppStorage = getNativeAppStorage();
  if (!nativeAppStorage) {
    return;
  }

  try {
    nativeAppStorage.writeStoredAppValue(key, value);
  } catch {
    // keep local mirror even if native persistence fails
  }
};

const removeNativeAppStorage = (key: AppStorageKey): void => {
  const nativeAppStorage = getNativeAppStorage();
  if (!nativeAppStorage) {
    return;
  }

  try {
    nativeAppStorage.removeStoredAppValue(key);
  } catch {
    // keep local removal even if native persistence fails
  }
};

export const getAppStorageKey = (key: AppStorageKey): string => STORAGE_KEYS[key].current;

export const readAppStorage = (key: AppStorageKey): string | null => {
  const storage = getLocalStorage();
  if (storage) {
    const localValue = readCurrentOrLegacyLocalValue(key, storage);
    if (localValue !== null) {
      return localValue;
    }
  }

  const nativeAppStorage = getNativeAppStorage();
  if (nativeAppStorage) {
    try {
      const nativeValue = nativeAppStorage.readStoredAppValue(key);
      if (nativeValue !== null && nativeValue !== undefined) {
        mirrorNativeValueToLocal(storage, key, nativeValue);
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
  mirrorNativeValueToLocal(storage, key, value);

  writeNativeAppStorage(key, value);
};

export const removeAppStorage = (key: AppStorageKey): void => {
  const storage = getLocalStorage();
  const { current, legacy } = STORAGE_KEYS[key];
  if (storage) {
    safeRemoveItem(storage, current);
    clearLegacyKeys(storage, legacy);
  }

  removeNativeAppStorage(key);
};

export const cleanupLegacyAppStorage = (): void => {};
