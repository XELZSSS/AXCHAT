import { MAX_TOOL_CALL_ROUNDS, MIN_TOOL_CALL_ROUNDS } from '../../services/providers/utils';
import { removeAppStorage, writeAppStorage } from '../../services/storageKeys';
import type { SaveSettingsPayload } from './types';
import type { SettingsModalState } from './reducer';

export const normalizeToolCallRounds = (value: string): string => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return '';
  return String(Math.min(Math.max(parsed, MIN_TOOL_CALL_ROUNDS), MAX_TOOL_CALL_ROUNDS));
};

export const persistToolCallRounds = (value: string): void => {
  const parsed = Number.parseInt(value, 10);
  const normalized = Number.isNaN(parsed)
    ? null
    : Math.min(Math.max(parsed, MIN_TOOL_CALL_ROUNDS), MAX_TOOL_CALL_ROUNDS);

  if (typeof window === 'undefined') return;
  if (normalized === null) {
    removeAppStorage('toolCallMaxRounds');
    return;
  }

  writeAppStorage('toolCallMaxRounds', String(normalized));
};

export const persistProxyStaticHttp2Enabled = (enabled: boolean): void => {
  writeAppStorage('proxyStaticHttp2', enabled ? '1' : '0');
};

export const buildSettingsSavePayload = (state: SettingsModalState): SaveSettingsPayload => ({
  providerId: state.providerId,
  modelName: state.modelName,
  apiKey: state.apiKey,
  baseUrl: state.baseUrl,
  customHeaders: state.customHeaders,
  tavily: state.tavily,
  staticProxyHttp2Enabled: state.staticProxyHttp2Enabled,
});
