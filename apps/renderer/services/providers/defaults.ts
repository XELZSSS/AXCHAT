import { GeminiEmbeddingConfig, ProviderId, TavilyConfig } from '../../types';
import { PROVIDER_IDS } from '../../../shared/provider-ids';
import { resolveDefaultBaseUrlForProvider } from './baseUrl';
import { supportsProviderTavily } from './capabilities';
import { listProviderIds } from './registry';
import { getDefaultTavilyConfig } from './tavily';
import { PROVIDER_CONFIGS } from './providerConfig';

export interface ProviderSettings {
  apiKey?: string;
  modelName: string;
  baseUrl?: string;
  customHeaders?: Array<{ key: string; value: string }>;
  tavily?: TavilyConfig;
  embedding?: GeminiEmbeddingConfig;
}

const envApiKeyResolvers = PROVIDER_IDS.reduce(
  (acc, id) => {
    acc[id] = PROVIDER_CONFIGS[id].envApiKeyResolver;
    return acc;
  },
  {} as Record<ProviderId, () => string | undefined>
);

export const getEnvApiKey = (providerId: ProviderId): string | undefined => {
  return envApiKeyResolvers[providerId]();
};

export const getDefaultProviderSettings = (providerId: ProviderId): ProviderSettings => {
  return {
    apiKey: getEnvApiKey(providerId),
    modelName: '',
    baseUrl: resolveDefaultBaseUrlForProvider(providerId),
    customHeaders: [],
    tavily: supportsProviderTavily(providerId) ? getDefaultTavilyConfig() : undefined,
    embedding: providerId === 'gemini' ? {} : undefined,
  };
};

export const buildDefaultProviderSettings = (): Record<ProviderId, ProviderSettings> => {
  const defaults = {} as Record<ProviderId, ProviderSettings>;
  for (const id of listProviderIds()) {
    defaults[id] = getDefaultProviderSettings(id);
  }
  return defaults;
};
