import OpenAI from 'openai';
import { ProviderId } from '../../types';
import { OpenAIStandardProviderBase } from './openaiStandardProviderBase';
import { PreflightMessage, ToolLoopOverrides } from './openaiChatHelpers';
import { XAI_MODEL_CATALOG } from './models';
import { buildProviderModelConfig } from './modelConfig';
import { ProviderChat, ProviderDefinition } from './types';
import { sanitizeApiKey } from './utils';

export const XAI_PROVIDER_ID: ProviderId = 'xai';
const XAI_BASE_URL = process.env.XAI_BASE_URL ?? 'https://api.x.ai/v1';
const FALLBACK_XAI_MODEL = 'grok-4-1-fast-reasoning';
const { defaultModel: DEFAULT_XAI_MODEL, models: XAI_MODELS } = buildProviderModelConfig({
  envModel: process.env.XAI_MODEL,
  fallbackModel: FALLBACK_XAI_MODEL,
  catalog: XAI_MODEL_CATALOG,
});

const DEFAULT_XAI_API_KEY = sanitizeApiKey(process.env.XAI_API_KEY);

const supportsReasoningSummary = (modelName: string): boolean => {
  const lower = modelName.toLowerCase();
  return lower.includes('reasoning') || lower.startsWith('grok-4') || lower.startsWith('grok-3');
};

const extractXaiReasoningContent = (message: PreflightMessage): string | undefined => {
  return message.reasoning_content ?? message.reasoning ?? undefined;
};

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

  protected getToolLoopOverrides(): ToolLoopOverrides {
    if (!supportsReasoningSummary(this.modelName)) {
      return {};
    }

    return {
      getAssistantMessageExtras: (message: PreflightMessage) => {
        const reasoningContent = extractXaiReasoningContent(message);
        return reasoningContent ? { reasoning_content: reasoningContent } : null;
      },
    };
  }
}

export const xaiProviderDefinition: ProviderDefinition = {
  id: XAI_PROVIDER_ID,
  models: XAI_MODELS,
  defaultModel: DEFAULT_XAI_MODEL,
  create: () => new XAIProvider(),
};
