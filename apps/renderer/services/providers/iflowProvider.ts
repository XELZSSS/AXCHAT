import OpenAI from 'openai';
import { ProviderId } from '../../types';
import { getDefaultIflowBaseUrl, resolveBaseUrl } from './baseUrl';
import { IFLOW_MODEL_CATALOG } from './models';
import { OpenAIStandardProviderBase } from './openaiStandardProviderBase';
import { getProxyAuthHeadersForTarget } from './proxy';
import { buildProviderModelConfig } from './modelConfig';
import { ProviderChat, ProviderDefinition } from './types';
import { sanitizeApiKey } from './utils';

export const IFLOW_PROVIDER_ID: ProviderId = 'iflow';

const FALLBACK_IFLOW_MODEL = 'TBStars2-200B-A13B';
const { defaultModel: DEFAULT_IFLOW_MODEL, models: IFLOW_MODELS } = buildProviderModelConfig({
  envModel: process.env.IFLOW_MODEL,
  fallbackModel: FALLBACK_IFLOW_MODEL,
  catalog: IFLOW_MODEL_CATALOG,
});

const DEFAULT_IFLOW_API_KEY = sanitizeApiKey(process.env.IFLOW_API_KEY);

class IflowProvider extends OpenAIStandardProviderBase implements ProviderChat {
  private baseUrl: string;

  constructor() {
    super({
      id: IFLOW_PROVIDER_ID,
      defaultModel: DEFAULT_IFLOW_MODEL,
      defaultApiKey: DEFAULT_IFLOW_API_KEY,
      missingApiKeyError: 'Missing IFLOW_API_KEY',
      logLabel: 'iFlow',
    });
    this.baseUrl = getDefaultIflowBaseUrl();
  }

  protected createClient(apiKey: string): OpenAI {
    return new OpenAI({
      apiKey,
      baseURL: this.baseUrl,
      dangerouslyAllowBrowser: true,
      defaultHeaders: {
        ...getProxyAuthHeadersForTarget(this.baseUrl),
      },
    });
  }

  getBaseUrl(): string | undefined {
    return this.baseUrl;
  }

  setBaseUrl(baseUrl?: string): void {
    const nextUrl = baseUrl?.trim();
    if (nextUrl && nextUrl !== this.baseUrl) {
      this.baseUrl = resolveBaseUrl(nextUrl);
      this.client = null;
    }
  }
}

export const iflowProviderDefinition: ProviderDefinition = {
  id: IFLOW_PROVIDER_ID,
  models: IFLOW_MODELS,
  defaultModel: DEFAULT_IFLOW_MODEL,
  create: () => new IflowProvider(),
};
