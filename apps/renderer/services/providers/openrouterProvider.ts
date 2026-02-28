import { ProviderId } from '../../types';
import { getDefaultOpenRouterBaseUrl, resolveBaseUrl } from './baseUrl';
import { OPENROUTER_MODEL_CATALOG } from './models';
import { OpenAIProxyCompatibleProviderBase } from './openaiProxyCompatibleProviderBase';
import { buildProxyUrl } from './proxy';
import { ProviderChat, ProviderDefinition } from './types';
import { buildProviderModelConfig } from './modelConfig';
import { sanitizeApiKey } from './utils';

export const OPENROUTER_PROVIDER_ID: ProviderId = 'openrouter';
const OPENROUTER_PROXY_BASE_URL = buildProxyUrl('/proxy/openai-compatible');

const FALLBACK_OPENROUTER_MODEL = 'openrouter/auto';
const { defaultModel: DEFAULT_OPENROUTER_MODEL, models: OPENROUTER_MODELS } =
  buildProviderModelConfig({
    envModel: process.env.OPENROUTER_MODEL,
    fallbackModel: FALLBACK_OPENROUTER_MODEL,
    catalog: OPENROUTER_MODEL_CATALOG,
  });

const DEFAULT_OPENROUTER_API_KEY = sanitizeApiKey(process.env.OPENROUTER_API_KEY);

class OpenRouterProvider extends OpenAIProxyCompatibleProviderBase implements ProviderChat {
  constructor() {
    super({
      id: OPENROUTER_PROVIDER_ID,
      defaultModel: DEFAULT_OPENROUTER_MODEL,
      defaultApiKey: DEFAULT_OPENROUTER_API_KEY,
      proxyBaseUrl: OPENROUTER_PROXY_BASE_URL,
      defaultTargetBaseUrl: getDefaultOpenRouterBaseUrl(),
      missingApiKeyError: 'Missing OPENROUTER_API_KEY',
      missingBaseUrlError: 'Missing OpenRouter base URL',
      logLabel: 'OpenRouter',
      supportsTavily: true,
    });
  }

  protected resolveTargetBaseUrl(baseUrl?: string): string | undefined {
    return baseUrl?.trim() ? resolveBaseUrl(baseUrl.trim()) : getDefaultOpenRouterBaseUrl();
  }
}

export const openrouterProviderDefinition: ProviderDefinition = {
  id: OPENROUTER_PROVIDER_ID,
  models: OPENROUTER_MODELS,
  defaultModel: DEFAULT_OPENROUTER_MODEL,
  create: () => new OpenRouterProvider(),
};
