import OpenAI from 'openai';
import { ChatMessage, ProviderId, Role, TavilyConfig } from '../../types';
import type { RequestPolicy } from './requestPolicy';
import { OpenAIStyleProviderBase } from './openaiBase';
import { ToolLoopOverrides, streamWithToolCallLoopAndAccumulate } from './openaiChatHelpers';
import { getProxyAuthHeadersForTarget } from './proxy';
import { buildOpenAITavilyTools, getDefaultTavilyConfig, normalizeTavilyConfig } from './tavily';
import { normalizeCustomHeaders } from './headerUtils';
import { sanitizeApiKey } from './utils';

type OpenAIProxyCompatibleProviderBaseOptions = {
  id: ProviderId;
  defaultModel: string;
  defaultApiKey?: string;
  fallbackApiKey?: string;
  proxyBaseUrl: string;
  defaultTargetBaseUrl?: string;
  missingApiKeyError?: string;
  missingBaseUrlError: string;
  logLabel: string;
  supportsTavily?: boolean;
};

export abstract class OpenAIProxyCompatibleProviderBase extends OpenAIStyleProviderBase {
  protected readonly id: ProviderId;
  protected apiKey?: string;
  protected client: OpenAI | null = null;
  protected modelName: string;
  protected targetBaseUrl?: string;
  protected customHeaders: Array<{ key: string; value: string }> = [];
  protected tavilyConfig?: TavilyConfig;

  private readonly defaultModel: string;
  private readonly defaultApiKey?: string;
  private readonly fallbackApiKey?: string;
  private readonly proxyBaseUrl: string;
  private readonly missingApiKeyError?: string;
  private readonly missingBaseUrlError: string;
  private readonly logLabel: string;
  private readonly supportsTavily: boolean;

  constructor(options: OpenAIProxyCompatibleProviderBaseOptions) {
    super();
    this.id = options.id;
    this.defaultModel = options.defaultModel;
    this.defaultApiKey = options.defaultApiKey;
    this.fallbackApiKey = options.fallbackApiKey;
    this.proxyBaseUrl = options.proxyBaseUrl;
    this.missingApiKeyError = options.missingApiKeyError;
    this.missingBaseUrlError = options.missingBaseUrlError;
    this.logLabel = options.logLabel;
    this.supportsTavily = options.supportsTavily ?? false;

    this.apiKey = options.defaultApiKey;
    this.modelName = options.defaultModel;
    this.targetBaseUrl = options.defaultTargetBaseUrl;
    this.tavilyConfig = this.supportsTavily ? getDefaultTavilyConfig() : undefined;
  }

  protected resolveTargetBaseUrl(baseUrl?: string): string | undefined {
    return baseUrl;
  }

  protected getToolLoopOverrides(): ToolLoopOverrides {
    return {};
  }

  protected getProxyRequestHeaders(): Record<string, string> {
    return {};
  }

  private resolveApiKey(): string | undefined {
    return this.apiKey ?? this.defaultApiKey ?? this.fallbackApiKey;
  }

  protected getClient(): OpenAI {
    const keyToUse = this.resolveApiKey();
    if (!keyToUse && this.missingApiKeyError) {
      throw new Error(this.missingApiKeyError);
    }
    if (!this.targetBaseUrl) {
      throw new Error(this.missingBaseUrlError);
    }
    if (!this.client) {
      const headersPayload = normalizeCustomHeaders(this.customHeaders);
      this.client = new OpenAI({
        apiKey: keyToUse ?? 'placeholder',
        baseURL: this.proxyBaseUrl,
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
          'x-openai-compatible-base-url': this.targetBaseUrl,
          'x-openai-compatible-headers': JSON.stringify(headersPayload),
          ...this.getProxyRequestHeaders(),
          ...getProxyAuthHeadersForTarget(this.proxyBaseUrl),
        },
      });
    }
    return this.client;
  }

  private buildTools(): OpenAI.Chat.Completions.ChatCompletionTool[] | undefined {
    if (!this.supportsTavily) return undefined;
    return buildOpenAITavilyTools(this.tavilyConfig);
  }

  getId(): ProviderId {
    return this.id;
  }

  getModelName(): string {
    return this.modelName;
  }

  setModelName(model: string): void {
    const nextModel = model.trim();
    if (nextModel !== this.modelName) {
      this.modelName = nextModel;
    }
  }

  getApiKey(): string | undefined {
    return this.apiKey;
  }

  setApiKey(apiKey?: string): void {
    const nextKey = sanitizeApiKey(apiKey) ?? this.defaultApiKey;
    if (nextKey !== this.apiKey) {
      this.apiKey = nextKey;
      this.client = null;
    }
  }

  getBaseUrl(): string | undefined {
    return this.targetBaseUrl;
  }

  setBaseUrl(baseUrl?: string): void {
    const nextUrl = this.resolveTargetBaseUrl(baseUrl);
    if (nextUrl !== this.targetBaseUrl) {
      this.targetBaseUrl = nextUrl;
      this.client = null;
    }
  }

  getCustomHeaders(): Array<{ key: string; value: string }> | undefined {
    return this.customHeaders;
  }

  setCustomHeaders(headers: Array<{ key: string; value: string }>): void {
    const normalized = normalizeCustomHeaders(headers);
    this.customHeaders = normalized;
    this.client = null;
  }

  getTavilyConfig(): TavilyConfig | undefined {
    return this.tavilyConfig;
  }

  setTavilyConfig(config?: TavilyConfig): void {
    if (!this.supportsTavily) return;
    this.tavilyConfig = normalizeTavilyConfig(config);
  }

  protected createUserMessage(message: string): ChatMessage {
    return {
      id: `${this.id}-user-${Date.now()}`,
      role: Role.User,
      text: message,
      timestamp: Date.now(),
    };
  }

  protected createModelMessage(fullResponse: string): ChatMessage {
    return {
      id: `${this.id}-model-${Date.now()}`,
      role: Role.Model,
      text: fullResponse,
      timestamp: Date.now(),
    };
  }

  async *sendMessageStream(
    message: string,
    signal?: AbortSignal,
    requestPolicy?: RequestPolicy
  ): AsyncGenerator<string, void, unknown> {
    const client = this.getClient();

    const userMessage = this.createUserMessage(message);
    const nextHistory = [...this.history, userMessage];
    const messages = this.buildMessages(nextHistory, this.id, this.modelName);

    try {
      const tools = this.buildTools();
      const fullResponse = yield* streamWithToolCallLoopAndAccumulate({
        client,
        model: this.modelName,
        messages,
        tools,
        tavilyConfig: this.tavilyConfig,
        signal,
        requestPolicy,
        buildToolMessages: this.buildToolMessages.bind(this),
        emitPreflightMessageWhenNoToolCalls: true,
        ...this.getToolLoopOverrides(),
      });

      const modelMessage = this.createModelMessage(fullResponse ?? '');
      this.history = [...nextHistory, modelMessage];
    } catch (error) {
      console.error(`Error in ${this.logLabel} stream:`, error);
      throw error;
    }
  }
}
