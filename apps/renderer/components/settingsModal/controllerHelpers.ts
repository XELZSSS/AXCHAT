import { MAX_TOOL_CALL_ROUNDS, MIN_TOOL_CALL_ROUNDS } from '../../services/providers/utils';
import { removeAppStorage, writeAppStorage } from '../../services/storageKeys';
import type { SaveSettingsPayload } from './types';
import type { SettingsModalState } from './reducer';

const clampToolCallRounds = (value: number): number =>
  Math.min(Math.max(value, MIN_TOOL_CALL_ROUNDS), MAX_TOOL_CALL_ROUNDS);

const persistBooleanFlag = (
  key: 'proxyStaticHttp2' | 'proxyAllowHttpTargets',
  enabled: boolean
): void => {
  writeAppStorage(key, enabled ? '1' : '0');
};

export const normalizeToolCallRounds = (value: string): string => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return '';
  return String(clampToolCallRounds(parsed));
};

export const persistToolCallRounds = (value: string): void => {
  const parsed = Number.parseInt(value, 10);
  const normalized = Number.isNaN(parsed) ? null : clampToolCallRounds(parsed);

  if (typeof window === 'undefined') return;
  if (normalized === null) {
    removeAppStorage('toolCallMaxRounds');
    return;
  }

  writeAppStorage('toolCallMaxRounds', String(normalized));
};

export const persistProxyStaticHttp2Enabled = (enabled: boolean): void => {
  persistBooleanFlag('proxyStaticHttp2', enabled);
};

export const persistProxyAllowHttpTargets = (enabled: boolean): void => {
  persistBooleanFlag('proxyAllowHttpTargets', enabled);
};

export const buildSettingsSavePayload = (state: SettingsModalState): SaveSettingsPayload => ({
  providerId: state.providerId,
  modelName: state.modelName,
  apiKey: state.apiKey,
  baseUrl: state.baseUrl,
  customHeaders: state.customHeaders,
  tavily: state.tavily,
  embedding: state.embedding,
  staticProxyHttp2Enabled: state.staticProxyHttp2Enabled,
  allowHttpTargets: state.allowHttpTargets,
});
