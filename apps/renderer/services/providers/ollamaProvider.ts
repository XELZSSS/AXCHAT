import { ProviderId } from '../../types';
import { getDefaultOllamaBaseUrl, resolveBaseUrl } from './baseUrl';
import { OLLAMA_MODEL_CATALOG } from './models';
import { OpenAIProxyCompatibleProviderBase } from './openaiProxyCompatibleProviderBase';
import { buildProxyUrl } from './proxy';
import { buildProviderModelConfig } from './modelConfig';
import { ProviderChat, ProviderDefinition } from './types';
import { sanitizeApiKey } from './utils';

export const OLLAMA_PROVIDER_ID: ProviderId = 'ollama';
const OLLAMA_PROXY_BASE_URL = buildProxyUrl('/proxy/openai-compatible');

const FALLBACK_OLLAMA_MODEL = 'llama3.2';
const { defaultModel: DEFAULT_OLLAMA_MODEL, models: OLLAMA_MODELS } = buildProviderModelConfig({
  envModel: process.env.OLLAMA_MODEL,
  fallbackModel: FALLBACK_OLLAMA_MODEL,
  catalog: OLLAMA_MODEL_CATALOG,
});

const DEFAULT_OLLAMA_API_KEY = sanitizeApiKey(process.env.OLLAMA_API_KEY);

class OllamaProvider extends OpenAIProxyCompatibleProviderBase implements ProviderChat {
  constructor() {
    super({
      id: OLLAMA_PROVIDER_ID,
      defaultModel: DEFAULT_OLLAMA_MODEL,
      defaultApiKey: DEFAULT_OLLAMA_API_KEY,
      fallbackApiKey: 'ollama',
      proxyBaseUrl: OLLAMA_PROXY_BASE_URL,
      defaultTargetBaseUrl: getDefaultOllamaBaseUrl(),
      missingBaseUrlError: 'Missing Ollama base URL',
      logLabel: 'Ollama',
      supportsTavily: false,
    });
    this.customHeaders = [];
  }

  protected resolveTargetBaseUrl(baseUrl?: string): string | undefined {
    const nextUrl = baseUrl?.trim();
    if (!nextUrl) return this.targetBaseUrl;
    return resolveBaseUrl(nextUrl);
  }
}

export const ollamaProviderDefinition: ProviderDefinition = {
  id: OLLAMA_PROVIDER_ID,
  models: OLLAMA_MODELS,
  defaultModel: DEFAULT_OLLAMA_MODEL,
  create: () => new OllamaProvider(),
};
