import OpenAI from 'openai';
import { ProviderId } from '../../types';
import { PROVIDER_CONFIGS } from './providerConfig';
import { PreflightMessage, ToolLoopOverrides } from './openaiChatHelpers';
import { OpenAIStandardProviderBase } from './openaiStandardProviderBase';
import { buildProviderModelConfig } from './modelConfig';
import { ProviderChat, ProviderDefinition } from './types';

export const DEEPSEEK_PROVIDER_ID: ProviderId = 'deepseek';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
const { defaultModel: DEFAULT_DEEPSEEK_MODEL, models: DEEPSEEK_MODELS } = buildProviderModelConfig(
  PROVIDER_CONFIGS[DEEPSEEK_PROVIDER_ID].modelSpec
);

const DEFAULT_DEEPSEEK_API_KEY = PROVIDER_CONFIGS[DEEPSEEK_PROVIDER_ID].envApiKeyResolver();

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
