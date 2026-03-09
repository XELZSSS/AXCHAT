const { ensureDatabase } = require('./db.cjs');
const { listSecrets, replaceSecrets } = require('./secrets.cjs');

const PROVIDER_IDS = [
  'gemini',
  'openai',
  'openai-compatible',
  'xai',
  'deepseek',
  'glm',
  'minimax',
  'moonshot',
];

const PROVIDER_ID_SET = new Set(PROVIDER_IDS);
const PROVIDER_API_KEY_SECRET_PREFIX = 'provider-api-key:';

const isProviderId = (value) => PROVIDER_ID_SET.has(String(value));

const normalizeString = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const normalizeOptionalString = (value) => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
};

const normalizeCustomHeaders = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error('Invalid provider settings payload: "customHeaders" must be an array');
  }

  return value
    .map((header, index) => {
      if (!header || typeof header !== 'object' || Array.isArray(header)) {
        throw new Error(
          `Invalid provider settings payload: "customHeaders[${index}]" must be an object`
        );
      }

      const key = typeof header.key === 'string' ? header.key.trim() : '';
      const headerValue = typeof header.value === 'string' ? header.value.trim() : '';
      if (!key || !headerValue) {
        return null;
      }

      return { key, value: headerValue };
    })
    .filter(Boolean);
};

const normalizeTavilyConfig = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid provider settings payload: "tavily" must be an object');
  }

  const apiKey =
    typeof value.apiKey === 'string' && value.apiKey.trim().length > 0
      ? value.apiKey.trim()
      : undefined;
  const projectId =
    typeof value.projectId === 'string' && value.projectId.trim().length > 0
      ? value.projectId.trim()
      : undefined;
  const searchDepth =
    value.searchDepth === 'basic' ||
    value.searchDepth === 'advanced' ||
    value.searchDepth === 'fast' ||
    value.searchDepth === 'ultra-fast'
      ? value.searchDepth
      : undefined;
  const maxResults =
    typeof value.maxResults === 'number' && Number.isFinite(value.maxResults)
      ? Math.min(Math.max(Math.round(value.maxResults), 1), 20)
      : undefined;
  const topic =
    value.topic === 'general' || value.topic === 'news' || value.topic === 'finance'
      ? value.topic
      : undefined;
  const includeAnswer = typeof value.includeAnswer === 'boolean' ? value.includeAnswer : undefined;

  if (
    !apiKey &&
    !projectId &&
    !searchDepth &&
    !maxResults &&
    !topic &&
    includeAnswer === undefined
  ) {
    return undefined;
  }

  return {
    apiKey,
    projectId,
    searchDepth,
    maxResults,
    topic,
    includeAnswer,
  };
};

const parseJsonField = (value) => {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const toNullableJson = (value) => {
  return value === undefined ? null : JSON.stringify(value);
};

const getProviderApiKeySecretKey = (providerId) => {
  return `${PROVIDER_API_KEY_SECRET_PREFIX}${providerId}`;
};

const cleanupUnsupportedProviderSecrets = () => {
  const secrets = listSecrets();
  let changed = false;

  for (const key of Object.keys(secrets)) {
    if (!key.startsWith(PROVIDER_API_KEY_SECRET_PREFIX)) {
      continue;
    }

    const providerId = key.slice(PROVIDER_API_KEY_SECRET_PREFIX.length);
    if (isProviderId(providerId)) {
      continue;
    }

    delete secrets[key];
    changed = true;
  }

  if (changed) {
    replaceSecrets(secrets);
  }
};

const listProviderSettingsRows = () => {
  const db = ensureDatabase();
  return db
    .prepare(
      `SELECT provider_id, model_name, base_url, custom_headers_json, tavily_json
       FROM provider_settings`
    )
    .all();
};

const normalizeProviderRecord = (providerId, value) => {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  return {
    apiKey:
      typeof record.apiKey === 'string' && record.apiKey.trim().length > 0
        ? record.apiKey.trim()
        : undefined,
    modelName: normalizeString(record.modelName),
    baseUrl: normalizeOptionalString(record.baseUrl),
    customHeaders: normalizeCustomHeaders(record.customHeaders),
    tavily: normalizeTavilyConfig(record.tavily),
  };
};

const normalizeProviderEntries = (value) => {
  return Object.entries(value).map(([providerId, record]) => {
    if (!isProviderId(providerId)) {
      throw new Error(`Invalid provider settings payload: unsupported provider "${providerId}"`);
    }

    return [providerId, normalizeProviderRecord(providerId, record)];
  });
};

const snapshotProviderSettingsEntries = () => {
  return listProviderSettingsRows()
    .map((row) => {
      const providerId = String(row.provider_id);
      if (!isProviderId(providerId)) {
        return null;
      }

      return [
        providerId,
        {
          modelName: String(row.model_name),
          baseUrl:
            typeof row.base_url === 'string' && row.base_url.length > 0 ? row.base_url : undefined,
          customHeaders: parseJsonField(row.custom_headers_json),
          tavily: parseJsonField(row.tavily_json),
        },
      ];
    })
    .filter(Boolean);
};

const snapshotProviderSecrets = () => {
  cleanupUnsupportedProviderSecrets();
  const secrets = listSecrets();
  const snapshot = {};

  for (const providerId of PROVIDER_IDS) {
    const secret = secrets[getProviderApiKeySecretKey(providerId)];
    if (typeof secret === 'string' && secret.trim().length > 0) {
      snapshot[providerId] = secret.trim();
    }
  }

  return snapshot;
};

const applyProviderSecretSnapshot = (snapshot) => {
  const nextSecrets = listSecrets();

  for (const key of Object.keys(nextSecrets)) {
    if (key.startsWith(PROVIDER_API_KEY_SECRET_PREFIX)) {
      delete nextSecrets[key];
    }
  }

  for (const [providerId, apiKey] of Object.entries(snapshot)) {
    if (!isProviderId(providerId)) {
      continue;
    }

    const normalizedApiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
    if (!normalizedApiKey) {
      continue;
    }

    nextSecrets[getProviderApiKeySecretKey(providerId)] = normalizedApiKey;
  }

  replaceSecrets(nextSecrets);
};

const writeProviderSettingsRows = (entries) => {
  const db = ensureDatabase();
  const persist = db.transaction((nextEntries) => {
    db.prepare(`DELETE FROM provider_settings`).run();

    if (nextEntries.length === 0) {
      return;
    }

    const insert = db.prepare(
      `INSERT INTO provider_settings (
         provider_id, model_name, base_url, custom_headers_json, tavily_json, updated_at
       ) VALUES (
         @provider_id, @model_name, @base_url, @custom_headers_json, @tavily_json, @updated_at
       )`
    );

    const updatedAt = Date.now();
    for (const [providerId, record] of nextEntries) {
      insert.run({
        provider_id: providerId,
        model_name: record.modelName,
        base_url: record.baseUrl ?? null,
        custom_headers_json: toNullableJson(record.customHeaders),
        tavily_json: toNullableJson(record.tavily),
        updated_at: updatedAt,
      });
    }
  });

  persist(entries);
};

const withProviderSettingsRollback = (writeOperation) => {
  const previousEntries = snapshotProviderSettingsEntries();
  const previousSecrets = snapshotProviderSecrets();

  try {
    return writeOperation();
  } catch (error) {
    try {
      writeProviderSettingsRows(previousEntries);
      applyProviderSecretSnapshot(previousSecrets);
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }

    throw error;
  }
};

const listStoredProviderSettings = () => {
  cleanupUnsupportedProviderSecrets();
  const rows = listProviderSettingsRows();
  const secrets = listSecrets();

  const settings = {};
  for (const row of rows) {
    const providerId = String(row.provider_id);
    if (!isProviderId(providerId)) {
      continue;
    }

    const apiKey = secrets[getProviderApiKeySecretKey(providerId)] ?? undefined;
    settings[providerId] = {
      apiKey,
      modelName: String(row.model_name),
      baseUrl:
        typeof row.base_url === 'string' && row.base_url.length > 0 ? row.base_url : undefined,
      customHeaders: parseJsonField(row.custom_headers_json),
      tavily: parseJsonField(row.tavily_json),
    };
  }

  return settings;
};

const readProviderSettingsValue = () => {
  const settings = listStoredProviderSettings();
  return Object.keys(settings).length > 0 ? JSON.stringify(settings) : null;
};

const writeProviderSettingsValue = (rawText) => {
  const parsed = JSON.parse(String(rawText ?? '{}'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid provider settings payload');
  }

  const entries = normalizeProviderEntries(parsed);

  withProviderSettingsRollback(() => {
    writeProviderSettingsRows(entries);
    applyProviderSecretSnapshot(
      Object.fromEntries(
        entries.flatMap(([providerId, record]) =>
          record.apiKey ? [[providerId, record.apiKey]] : []
        )
      )
    );
  });
};

const clearProviderSettingsValue = () => {
  withProviderSettingsRollback(() => {
    writeProviderSettingsRows([]);
    applyProviderSecretSnapshot({});
  });
};

module.exports = {
  clearProviderSettingsValue,
  readProviderSettingsValue,
  writeProviderSettingsValue,
};
