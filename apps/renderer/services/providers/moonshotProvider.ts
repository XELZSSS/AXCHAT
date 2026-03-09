import OpenAI from 'openai';
import { ProviderId } from '../../types';
import { getDefaultMoonshotBaseUrl, resolveBaseUrl } from './baseUrl';
import { MOONSHOT_MODEL_CATALOG } from './models';
import { OpenAIStandardProviderBase } from './openaiStandardProviderBase';
import { ToolLoopOverrides } from './openaiChatHelpers';
import { getProxyAuthHeadersForTarget } from './proxy';
import { buildProviderModelConfig } from './modelConfig';
import { ProviderChat, ProviderDefinition } from './types';
import { sanitizeApiKey } from './utils';

export const MOONSHOT_PROVIDER_ID: ProviderId = 'moonshot';

const FALLBACK_MOONSHOT_MODEL = 'kimi-k2.5';
const { defaultModel: DEFAULT_MOONSHOT_MODEL, models: MOONSHOT_MODELS } = buildProviderModelConfig({
  envModel: process.env.MOONSHOT_MODEL,
  fallbackModel: FALLBACK_MOONSHOT_MODEL,
  catalog: MOONSHOT_MODEL_CATALOG,
  includeFallbackModel: false,
});

const DEFAULT_MOONSHOT_API_KEY = sanitizeApiKey(process.env.MOONSHOT_API_KEY);

class MoonshotProvider extends OpenAIStandardProviderBase implements ProviderChat {
  private baseUrl: string;

  constructor() {
    super({
      id: MOONSHOT_PROVIDER_ID,
      defaultModel: DEFAULT_MOONSHOT_MODEL,
      defaultApiKey: DEFAULT_MOONSHOT_API_KEY,
      missingApiKeyError: 'Missing MOONSHOT_API_KEY',
      logLabel: 'Kimi',
    });
    this.baseUrl = getDefaultMoonshotBaseUrl();
  }

  protected getToolLoopOverrides(): ToolLoopOverrides {
    return {
      getAssistantMessageExtras: (message) => {
        // Kimi thinking models require reasoning_content to be preserved between tool rounds.
        if (!message.reasoning_content) return null;
        return { reasoning_content: message.reasoning_content };
      },
    };
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
    const nextUrl = baseUrl?.trim()
      ? resolveBaseUrl(baseUrl.trim())
      : getDefaultMoonshotBaseUrl();
    if (nextUrl !== this.baseUrl) {
      this.baseUrl = nextUrl;
      this.client = null;
    }
  }
}

export const moonshotProviderDefinition: ProviderDefinition = {
  id: MOONSHOT_PROVIDER_ID,
  models: MOONSHOT_MODELS,
  defaultModel: DEFAULT_MOONSHOT_MODEL,
  create: () => new MoonshotProvider(),
};
