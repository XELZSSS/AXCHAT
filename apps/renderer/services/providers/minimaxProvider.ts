import OpenAI from 'openai';
import { ChatMessage, ProviderId, Role } from '../../types';
import type { RequestPolicy } from './requestPolicy';
import { streamWithToolCallLoop } from './openaiChatHelpers';
import { getDefaultMinimaxBaseUrl, resolveBaseUrl } from './baseUrl';
import { PROVIDER_CONFIGS } from './providerConfig';
import { OpenAIStandardProviderBase } from './openaiStandardProviderBase';
import { getProxyAuthHeadersForTarget } from './proxy';
import { buildOpenAITavilyTools } from './tavily';
import { buildProviderModelConfig } from './modelConfig';
import { ProviderChat, ProviderDefinition } from './types';

export const MINIMAX_PROVIDER_ID: ProviderId = 'minimax';

const { defaultModel: DEFAULT_MINIMAX_MODEL, models: MINIMAX_MODELS } = buildProviderModelConfig(
  PROVIDER_CONFIGS[MINIMAX_PROVIDER_ID].modelSpec
);

const DEFAULT_MINIMAX_API_KEY = PROVIDER_CONFIGS[MINIMAX_PROVIDER_ID].envApiKeyResolver();

class MiniMaxProvider extends OpenAIStandardProviderBase implements ProviderChat {
  private baseUrl: string;

  constructor() {
    super({
      id: MINIMAX_PROVIDER_ID,
      defaultModel: DEFAULT_MINIMAX_MODEL,
      defaultApiKey: DEFAULT_MINIMAX_API_KEY,
      missingApiKeyError: 'Missing MINIMAX_API_KEY',
      logLabel: 'MiniMax',
    });
    this.baseUrl = getDefaultMinimaxBaseUrl();
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
    const nextUrl = baseUrl?.trim() ? resolveBaseUrl(baseUrl.trim()) : getDefaultMinimaxBaseUrl();
    if (nextUrl !== this.baseUrl) {
      this.baseUrl = nextUrl;
      this.client = null;
    }
  }

  async *sendMessageStream(
    message: string,
    signal?: AbortSignal,
    requestPolicy?: RequestPolicy
  ): AsyncGenerator<string, void, unknown> {
    const client = this.getClient();

    const userMessage: ChatMessage = {
      id: `${this.id}-user-${Date.now()}`,
      role: Role.User,
      text: message,
      timestamp: Date.now(),
    };

    const nextHistory = [...this.history, userMessage];
    const messages = this.buildMessages(nextHistory, this.id, this.modelName);

    let fullResponse = '';
    let fullReasoning = '';

    try {
      const tools = buildOpenAITavilyTools(this.getTavilyConfig());
      for await (const chunk of streamWithToolCallLoop({
        client,
        model: this.modelName,
        messages,
        tools,
        tavilyConfig: this.getTavilyConfig(),
        signal,
        requestPolicy,
        extraBody: { reasoning_split: true },
        buildToolMessages: this.buildToolMessages.bind(this),
        getAssistantMessageExtras: (preflightMessage) =>
          preflightMessage?.reasoning_details?.length
            ? { reasoning_details: preflightMessage.reasoning_details }
            : null,
      })) {
        if (chunk.reasoning) {
          fullReasoning += chunk.reasoning;
          yield `<think>${chunk.reasoning}</think>`;
        }
        if (chunk.content) {
          fullResponse += chunk.content;
          yield chunk.content;
        }
      }

      const modelMessage: ChatMessage = {
        id: `${this.id}-model-${Date.now()}`,
        role: Role.Model,
        text: fullResponse,
        reasoning: fullReasoning || undefined,
        timestamp: Date.now(),
      };

      this.history = [...nextHistory, modelMessage];
    } catch (error) {
      console.error('Error in MiniMax stream:', error);
      throw error;
    }
  }
}

export const minimaxProviderDefinition: ProviderDefinition = {
  id: MINIMAX_PROVIDER_ID,
  models: MINIMAX_MODELS,
  defaultModel: DEFAULT_MINIMAX_MODEL,
  create: () => new MiniMaxProvider(),
};
