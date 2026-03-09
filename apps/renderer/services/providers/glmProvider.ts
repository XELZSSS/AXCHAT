import OpenAI from 'openai';
import { ProviderId } from '../../types';
import { t } from '../../utils/i18n';
import { ProviderChat, ProviderDefinition } from './types';
import { getDefaultGlmBaseUrl, normalizeBaseUrlForProvider } from './baseUrl';
import { PreflightMessage, ToolLoopOverrides } from './openaiChatHelpers';
import { GLM_MODEL_CATALOG } from './models';
import { sanitizeApiKey } from './utils';
import { getProxyAuthHeadersForTarget } from './proxy';
import { buildProviderModelConfig } from './modelConfig';
import { OpenAIStandardProviderBase } from './openaiStandardProviderBase';

export const GLM_PROVIDER_ID: ProviderId = 'glm';

const FALLBACK_GLM_MODEL = 'glm-5';
const { defaultModel: DEFAULT_GLM_MODEL, models: GLM_MODELS } = buildProviderModelConfig({
  envModel: process.env.GLM_MODEL,
  fallbackModel: FALLBACK_GLM_MODEL,
  catalog: GLM_MODEL_CATALOG,
});

const DEFAULT_GLM_API_KEY = sanitizeApiKey(process.env.GLM_API_KEY);

const shouldEnableGlmThinking = (modelName: string): boolean => {
  const model = modelName.trim().toLowerCase();
  return model.startsWith('glm-5') || model.startsWith('glm-4.7') || model.startsWith('glm-4.6');
};

const buildGlmThinkingExtraBody = (modelName: string): Record<string, unknown> | undefined => {
  if (!shouldEnableGlmThinking(modelName)) {
    return undefined;
  }

  return {
    thinking: {
      type: 'enabled',
      clear_thinking: false,
    },
  };
};

const extractGlmReasoningContent = (message: PreflightMessage): string | undefined => {
  const directReasoning = message.reasoning_content ?? message.reasoning;
  if (directReasoning?.trim()) {
    return directReasoning;
  }

  const detailReasoning =
    message.reasoning_details
      ?.map((detail) => detail?.text?.trim())
      .filter((detail): detail is string => Boolean(detail)) ?? [];
  return detailReasoning.length ? detailReasoning.join('\n') : undefined;
};

class GlmProvider extends OpenAIStandardProviderBase implements ProviderChat {
  private baseUrl: string;

  constructor() {
    super({
      id: GLM_PROVIDER_ID,
      defaultModel: DEFAULT_GLM_MODEL,
      defaultApiKey: DEFAULT_GLM_API_KEY,
      missingApiKeyError: t('settings.provider.error.glm.missingApiKey'),
      logLabel: 'GLM',
    });
    this.baseUrl = getDefaultGlmBaseUrl();
  }

  protected createClient(apiKey: string): OpenAI {
    return new OpenAI({
      apiKey,
      baseURL: this.baseUrl,
      dangerouslyAllowBrowser: true,
      defaultHeaders: getProxyAuthHeadersForTarget(this.baseUrl),
    });
  }

  protected getToolLoopOverrides(): ToolLoopOverrides {
    const extraBody = buildGlmThinkingExtraBody(this.modelName);
    return {
      ...(extraBody ? { extraBody } : {}),
      getAssistantMessageExtras: (message: PreflightMessage) => {
        const reasoningContent = extractGlmReasoningContent(message);
        return reasoningContent ? { reasoning_content: reasoningContent } : null;
      },
    };
  }

  getBaseUrl(): string | undefined {
    return this.baseUrl;
  }

  setBaseUrl(baseUrl?: string): void {
    const nextUrl = baseUrl?.trim()
      ? normalizeBaseUrlForProvider(this.id, baseUrl.trim())
      : getDefaultGlmBaseUrl();
    if (nextUrl !== this.baseUrl) {
      this.baseUrl = nextUrl;
      this.client = null;
    }
  }
}

export const glmProviderDefinition: ProviderDefinition = {
  id: GLM_PROVIDER_ID,
  models: GLM_MODELS,
  defaultModel: DEFAULT_GLM_MODEL,
  create: () => new GlmProvider(),
};
