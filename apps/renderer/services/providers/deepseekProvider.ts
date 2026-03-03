import OpenAI from 'openai';
import { ProviderId } from '../../types';
import { DEEPSEEK_MODEL_CATALOG } from './models';
import { PreflightMessage, ToolLoopOverrides } from './openaiChatHelpers';
import { OpenAIStandardProviderBase } from './openaiStandardProviderBase';
import { buildProviderModelConfig } from './modelConfig';
import { ProviderChat, ProviderDefinition } from './types';
import { sanitizeApiKey } from './utils';

export const DEEPSEEK_PROVIDER_ID: ProviderId = 'deepseek';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
const FALLBACK_DEEPSEEK_MODEL = 'deepseek-reasoner';
const { defaultModel: DEFAULT_DEEPSEEK_MODEL, models: DEEPSEEK_MODELS } = buildProviderModelConfig({
  envModel: process.env.DEEPSEEK_MODEL,
  fallbackModel: FALLBACK_DEEPSEEK_MODEL,
  catalog: DEEPSEEK_MODEL_CATALOG,
});

const DEFAULT_DEEPSEEK_API_KEY = sanitizeApiKey(process.env.DEEPSEEK_API_KEY);

class DeepSeekProvider extends OpenAIStandardProviderBase implements ProviderChat {
  constructor() {
    super({
      id: DEEPSEEK_PROVIDER_ID,
      defaultModel: DEFAULT_DEEPSEEK_MODEL,
      defaultApiKey: DEFAULT_DEEPSEEK_API_KEY,
      missingApiKeyError: 'Missing DEEPSEEK_API_KEY',
      logLabel: 'DeepSeek',
    });
  }

  protected createClient(apiKey: string): OpenAI {
    return new OpenAI({
      apiKey,
      baseURL: DEEPSEEK_BASE_URL,
      dangerouslyAllowBrowser: true,
    });
  }

  protected getToolLoopOverrides(): ToolLoopOverrides {
    return {
      getAssistantMessageExtras: (preflightMessage: PreflightMessage) => {
        const reasoning =
          preflightMessage?.reasoning_content ?? preflightMessage?.reasoning ?? undefined;
        return reasoning ? { reasoning_content: reasoning } : null;
      },
    };
  }
}

export const deepseekProviderDefinition: ProviderDefinition = {
  id: DEEPSEEK_PROVIDER_ID,
  models: DEEPSEEK_MODELS,
  defaultModel: DEFAULT_DEEPSEEK_MODEL,
  create: () => new DeepSeekProvider(),
};
