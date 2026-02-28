import OpenAI from 'openai';
import { ProviderId } from '../../types';
import { XAI_MODEL_CATALOG } from './models';
import { OpenAIStandardProviderBase } from './openaiStandardProviderBase';
import { buildProviderModelConfig } from './modelConfig';
import { ProviderChat, ProviderDefinition } from './types';
import { sanitizeApiKey } from './utils';

export const XAI_PROVIDER_ID: ProviderId = 'xai';
const XAI_BASE_URL = process.env.XAI_BASE_URL ?? 'https://api.x.ai/v1';
const FALLBACK_XAI_MODEL = 'grok-4';
const { defaultModel: DEFAULT_XAI_MODEL, models: XAI_MODELS } = buildProviderModelConfig({
  envModel: process.env.XAI_MODEL,
  fallbackModel: FALLBACK_XAI_MODEL,
  catalog: XAI_MODEL_CATALOG,
});

const DEFAULT_XAI_API_KEY = sanitizeApiKey(process.env.XAI_API_KEY);

class XAIProvider extends OpenAIStandardProviderBase implements ProviderChat {
  constructor() {
    super({
      id: XAI_PROVIDER_ID,
      defaultModel: DEFAULT_XAI_MODEL,
      defaultApiKey: DEFAULT_XAI_API_KEY,
      missingApiKeyError: 'Missing XAI_API_KEY',
      logLabel: 'xAI',
    });
  }

  protected createClient(apiKey: string): OpenAI {
    return new OpenAI({
      apiKey,
      baseURL: XAI_BASE_URL,
      dangerouslyAllowBrowser: true,
    });
  }
}

export const xaiProviderDefinition: ProviderDefinition = {
  id: XAI_PROVIDER_ID,
  models: XAI_MODELS,
  defaultModel: DEFAULT_XAI_MODEL,
  create: () => new XAIProvider(),
};
