/* global console, process */
const { app, safeStorage } = require('electron');
const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');

const SECRET_STORE_FILENAME = 'app-secrets.json';
const SECRET_STORE_VERSION = 1;
let hasLoggedPlainStorageWarning = false;

const getSecretStorePath = () => path.join(app.getPath('userData'), SECRET_STORE_FILENAME);

const canUseSecureStorage = () => {
  return Boolean(
    safeStorage &&
      typeof safeStorage.isEncryptionAvailable === 'function' &&
      safeStorage.isEncryptionAvailable() &&
      typeof safeStorage.encryptString === 'function' &&
      typeof safeStorage.decryptString === 'function'
  );
};

const resolveSecureStorageBackend = () => {
  if (process.platform === 'win32') {
    return 'dpapi';
  }

  if (process.platform === 'darwin') {
    return 'keychain';
  }

  if (
    process.platform === 'linux' &&
    safeStorage &&
    typeof safeStorage.getSelectedStorageBackend === 'function'
  ) {
    try {
      return String(safeStorage.getSelectedStorageBackend() ?? 'unknown');
    } catch {
      return 'unknown';
    }
  }

  return 'unknown';
};

const getSecretStorageInfo = () => {
  if (canUseSecureStorage()) {
    return {
      mode: 'secure',
      backend: resolveSecureStorageBackend(),
    };
  }

  return {
    mode: 'plain',
    backend: 'plain-file',
  };
};

const normalizeSecretRecord = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [String(key), typeof item === 'string' ? item : String(item ?? '')])
      .filter(([, item]) => item.length > 0)
  );
};

const readRawSecretStoreFile = () => {
  try {
    return fs.readFileSync(getSecretStorePath(), 'utf-8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const writeRawSecretStoreFile = (rawText) => {
  fs.mkdirSync(path.dirname(getSecretStorePath()), { recursive: true });
  fs.writeFileSync(getSecretStorePath(), rawText, 'utf-8');
};

const parseSecretStore = (rawText) => {
  if (!rawText) {
    return {};
  }

  const parsed = JSON.parse(rawText);
  if (parsed?.format === 'safeStorage' && typeof parsed.payload === 'string') {
    if (!canUseSecureStorage()) {
      throw new Error('Secure storage is unavailable');
    }

    const decrypted = safeStorage.decryptString(Buffer.from(parsed.payload, 'base64'));
    return normalizeSecretRecord(JSON.parse(decrypted));
  }

  if (parsed?.format === 'plain' && parsed?.values) {
    return normalizeSecretRecord(parsed.values);
  }

  return normalizeSecretRecord(parsed);
};

const serializeSecretStore = (values) => {
  const normalized = normalizeSecretRecord(values);

  if (canUseSecureStorage()) {
    const encryptedPayload = safeStorage
      .encryptString(JSON.stringify(normalized))
      .toString('base64');

    return JSON.stringify(
      {
        version: SECRET_STORE_VERSION,
        format: 'safeStorage',
        payload: encryptedPayload,
      },
      null,
      2
    );
  }

  return JSON.stringify(
    {
      version: SECRET_STORE_VERSION,
      format: 'plain',
      values: normalized,
    },
    null,
    2
  );
};

const loadSecrets = () => {
  return parseSecretStore(readRawSecretStoreFile());
};

const saveSecrets = (values) => {
  const normalized = normalizeSecretRecord(values);
  const storageInfo = getSecretStorageInfo();

  if (
    storageInfo.mode === 'plain' &&
    Object.keys(normalized).length > 0 &&
    hasLoggedPlainStorageWarning === false
  ) {
    hasLoggedPlainStorageWarning = true;
    console.warn(
      '[secrets] Secure system storage is unavailable. Secrets will be stored in plain text on disk.'
    );
  }

  writeRawSecretStoreFile(`${serializeSecretStore(values)}\n`);
};

const listSecrets = () => {
  return { ...loadSecrets() };
};

const replaceSecrets = (values) => {
  saveSecrets(values);
};

const getSecret = (key) => {
  return loadSecrets()[String(key)] ?? null;
};

const setSecret = (key, value) => {
  const secrets = loadSecrets();
  const normalizedKey = String(key);
  const normalizedValue = typeof value === 'string' ? value.trim() : String(value ?? '').trim();

  if (!normalizedValue) {
    delete secrets[normalizedKey];
  } else {
    secrets[normalizedKey] = normalizedValue;
  }

  saveSecrets(secrets);
};

const removeSecret = (key) => {
  const secrets = loadSecrets();
  delete secrets[String(key)];
  saveSecrets(secrets);
};

module.exports = {
  getSecret,
  getSecretStorageInfo,
  listSecrets,
  removeSecret,
  replaceSecrets,
  setSecret,
};
