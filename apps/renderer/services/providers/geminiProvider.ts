import {
  FunctionCallingConfigMode,
  type FunctionCall,
  GoogleGenAI,
  type Content,
  type FunctionDeclaration,
  type GenerateContentResponse,
  type Part,
  type ThinkingConfig,
  type ThinkingLevel,
  type ToolListUnion,
} from '@google/genai';
import { ChatMessage, GeminiEmbeddingConfig, ProviderId, Role, TavilyConfig } from '../../types';
import type { RequestPolicy } from './requestPolicy';
import { t } from '../../utils/i18n';
import { ProviderChat, ProviderDefinition, ProviderResponseMetadata } from './types';
import { buildSystemInstruction } from './prompts';
import { decideAdaptiveToolParallelism, runWithConcurrency } from './requestPolicy';
import { buildProviderModelConfig } from './modelConfig';
import { PROVIDER_CONFIGS } from './providerConfig';
import { sanitizeApiKey } from './utils';
import { GEMINI_MODEL_CATALOG } from './models';
import { normalizeGeminiEmbeddingConfig } from './geminiEmbeddings';
import { retrieveGeminiSemanticContext } from './geminiSemanticSearch';
import { callTavilySearch, getDefaultTavilyConfig, normalizeTavilyConfig } from './tavily';
import { TavilyToolArgs } from './openaiChatHelpers';

export const GEMINI_PROVIDER_ID: ProviderId = 'gemini';
const GEMINI_THINKING_CONFIG: ThinkingConfig = {
  includeThoughts: true,
  thinkingLevel: 'HIGH' as ThinkingLevel,
};

type GeminiChunkPayload = {
  content: string;
  reasoning: string;
};

const TAVILY_SEARCH_PARAMETERS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    query: { type: 'string', description: 'Search query' },
    search_depth: {
      type: 'string',
      enum: ['basic', 'advanced', 'fast', 'ultra-fast'],
      description: 'Search depth',
    },
    max_results: {
      type: 'integer',
      minimum: 1,
      maximum: 20,
      description: 'Number of results to return',
    },
    topic: {
      type: 'string',
      enum: ['general', 'news', 'finance'],
      description: 'Search topic',
    },
    include_answer: {
      type: 'boolean',
      description: 'Include answer summary',
    },
  },
  required: ['query'],
} as const;

const extractGeminiChunkPayload = (response: GenerateContentResponse): GeminiChunkPayload => {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  let content = '';
  let reasoning = '';

  for (const part of parts) {
    const text = part.text ?? '';
    if (!text) continue;
    if (part.thought) {
      reasoning += text;
      continue;
    }
    content += text;
  }

  if (!content && response.text) {
    content = response.text;
  }

  return { content, reasoning };
};

const { defaultModel: DEFAULT_GEMINI_MODEL, models: GEMINI_MODELS } = buildProviderModelConfig(
  PROVIDER_CONFIGS[GEMINI_PROVIDER_ID].modelSpec
);
const DEFAULT_GEMINI_API_KEY = PROVIDER_CONFIGS[GEMINI_PROVIDER_ID].envApiKeyResolver();

const createGeminiModelMessage = (text: string, reasoning: string): ChatMessage => ({
  id: `gemini-model-${Date.now()}`,
  role: Role.Model,
  text,
  reasoning: reasoning || undefined,
  timestamp: Date.now(),
});

class GeminiProvider implements ProviderChat {
  private readonly id: ProviderId = GEMINI_PROVIDER_ID;
  private modelName: string;
  private apiKey?: string;
  private client: GoogleGenAI | null = null;
  private tavilyConfig?: TavilyConfig;
  private embeddingConfig?: GeminiEmbeddingConfig;
  private history: ChatMessage[] = [];
  private pendingResponseMetadata?: ProviderResponseMetadata;

  constructor() {
    this.modelName = DEFAULT_GEMINI_MODEL;
    this.apiKey = DEFAULT_GEMINI_API_KEY;
    this.tavilyConfig = getDefaultTavilyConfig();
    this.embeddingConfig = undefined;
  }

  private async getClient(): Promise<GoogleGenAI> {
    if (!this.apiKey) {
      throw new Error(t('settings.provider.error.gemini.missingApiKey'));
    }
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
    return this.client;
  }

  private buildContents(history: ChatMessage[]): Content[] {
    return history
      .filter((msg) => !msg.isError)
      .map((msg) => ({
        role: msg.role === Role.User ? 'user' : 'model',
        parts: [{ text: msg.text }] as Part[],
      }));
  }

  private buildTools(): ToolListUnion | undefined {
    if (!this.tavilyConfig?.apiKey) return undefined;

    const tavilySearchDeclaration: FunctionDeclaration = {
      name: 'tavily_search',
      description:
        'Search the web for up-to-date information and return a concise summary with sources.',
      parametersJsonSchema: TAVILY_SEARCH_PARAMETERS_JSON_SCHEMA,
    };

    return [
      {
        functionDeclarations: [tavilySearchDeclaration],
      },
    ];
  }

  private buildConfig(tools?: ToolListUnion, signal?: AbortSignal) {
    return {
      ...(signal ? { abortSignal: signal } : {}),
      systemInstruction: buildSystemInstruction(this.id, this.modelName),
      thinkingConfig: GEMINI_THINKING_CONFIG,
      ...(tools
        ? {
            tools,
            toolConfig: {
              functionCallingConfig: {
                mode: FunctionCallingConfigMode.AUTO,
                allowedFunctionNames: ['tavily_search'],
              },
            },
          }
        : {}),
    };
  }

  private createChatSession(client: GoogleGenAI, tools?: ToolListUnion, signal?: AbortSignal) {
    return client.chats.create({
      model: this.modelName,
      config: this.buildConfig(tools, signal),
      history: this.buildContents(this.history),
    });
  }

  private async buildToolResponseParts(
    functionCalls: FunctionCall[],
    requestPolicy?: RequestPolicy
  ): Promise<Part[]> {
    return runWithConcurrency(
      functionCalls,
      Math.max(
        1,
        Math.min(
          requestPolicy?.toolParallelism ?? Number.MAX_SAFE_INTEGER,
          decideAdaptiveToolParallelism(
            functionCalls.map((call) => ((call.args ?? {}) as TavilyToolArgs) ?? {})
          )
        )
      ),
      async (call) => {
        if (call.name !== 'tavily_search') {
          return {
            functionResponse: {
              id: call.id,
              name: call.name,
              response: {
                error: `${t('settings.provider.error.tool.unsupported')}: ${call.name}`,
              },
            },
          } satisfies Part;
        }

        const args = (call.args ?? {}) as TavilyToolArgs;
        if (!args.query) {
          return {
            functionResponse: {
              id: call.id,
              name: call.name,
              response: { error: t('settings.provider.error.tool.missingQuery') },
            },
          } satisfies Part;
        }

        try {
          const result = await callTavilySearch(this.tavilyConfig, {
            query: args.query,
            search_depth: args.search_depth,
            max_results: args.max_results,
            topic: args.topic,
            include_answer: args.include_answer,
          });
          return {
            functionResponse: {
              id: call.id,
              name: call.name,
              response: result as Record<string, unknown>,
            },
          } satisfies Part;
        } catch (error) {
          return {
            functionResponse: {
              id: call.id,
              name: call.name,
              response: {
                error:
                  error instanceof Error ? error.message : t('settings.tavily.error.requestFailed'),
              },
            },
          } satisfies Part;
        }
      }
    );
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
      this.resetChat();
    }
  }

  getApiKey(): string | undefined {
    return this.apiKey;
  }

  setApiKey(apiKey?: string): void {
    const nextKey = sanitizeApiKey(apiKey) ?? DEFAULT_GEMINI_API_KEY;
    if (nextKey !== this.apiKey) {
      this.apiKey = nextKey;
      this.client = null;
      this.resetChat();
    }
  }

  getTavilyConfig(): TavilyConfig | undefined {
    return this.tavilyConfig;
  }

  setTavilyConfig(config?: TavilyConfig): void {
    this.tavilyConfig = normalizeTavilyConfig(config);
  }

  getEmbeddingConfig(): GeminiEmbeddingConfig | undefined {
    return this.embeddingConfig;
  }

  setEmbeddingConfig(config?: GeminiEmbeddingConfig): void {
    this.embeddingConfig = normalizeGeminiEmbeddingConfig(config);
  }

  consumePendingResponseMetadata(): ProviderResponseMetadata | undefined {
    const metadata = this.pendingResponseMetadata;
    this.pendingResponseMetadata = undefined;
    return metadata;
  }

  resetChat(): void {
    this.history = [];
    this.pendingResponseMetadata = undefined;
  }

  async startChatWithHistory(messages: ChatMessage[]): Promise<void> {
    this.history = messages.filter((msg) => !msg.isError);
    this.pendingResponseMetadata = undefined;
  }

  async *sendMessageStream(
    message: string,
    signal?: AbortSignal,
    requestPolicy?: RequestPolicy
  ): AsyncGenerator<string, void, unknown> {
    try {
      if (signal?.aborted) return;

      const client = await this.getClient();
      this.pendingResponseMetadata = undefined;
      let fullResponse = '';
      let fullReasoning = '';
      const userMessage: ChatMessage = {
        id: `gemini-user-${Date.now()}`,
        role: Role.User,
        text: message,
        timestamp: Date.now(),
      };
      const semanticContext = await retrieveGeminiSemanticContext({
        apiKey: this.apiKey ?? '',
        query: message,
        embeddingConfig: this.embeddingConfig,
        signal,
      }).catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }
        console.warn('Gemini semantic retrieval skipped:', error);
        return undefined;
      });
      const outboundMessage = semanticContext?.prompt ?? message;

      const tools = this.buildTools();
      const chat = this.createChatSession(client, tools, signal);

      if (!tools) {
        const stream = await chat.sendMessageStream({ message: outboundMessage });

        for await (const chunk of stream) {
          if (signal?.aborted) return;
          const responseChunk = chunk as GenerateContentResponse;
          const payload = extractGeminiChunkPayload(responseChunk);
          if (payload.reasoning) {
            fullReasoning += payload.reasoning;
            yield `<think>${payload.reasoning}</think>`;
          }
          if (payload.content) {
            fullResponse += payload.content;
            yield payload.content;
          }
        }

        if (fullResponse) {
          const modelMessage = createGeminiModelMessage(fullResponse, fullReasoning);
          this.pendingResponseMetadata = semanticContext
            ? { citations: semanticContext.citations }
            : undefined;
          this.history = [...this.history, userMessage, modelMessage];
        }
        return;
      }

      const response = await chat.sendMessage({ message: outboundMessage });

      const functionCalls = response.functionCalls ?? [];
      if (!functionCalls.length) {
        if (signal?.aborted) return;
        const payload = extractGeminiChunkPayload(response);
        if (payload.reasoning) {
          fullReasoning += payload.reasoning;
          yield `<think>${payload.reasoning}</think>`;
        }
        if (payload.content) {
          fullResponse = payload.content;
          yield payload.content;
          const modelMessage = createGeminiModelMessage(payload.content, fullReasoning);
          this.pendingResponseMetadata = semanticContext
            ? { citations: semanticContext.citations }
            : undefined;
          this.history = [...this.history, userMessage, modelMessage];
        }
        return;
      }

      const toolParts = await this.buildToolResponseParts(functionCalls, requestPolicy);
      const stream = await chat.sendMessageStream({ message: toolParts });

      for await (const chunk of stream) {
        if (signal?.aborted) return;
        const responseChunk = chunk as GenerateContentResponse;
        const payload = extractGeminiChunkPayload(responseChunk);
        if (payload.reasoning) {
          fullReasoning += payload.reasoning;
          yield `<think>${payload.reasoning}</think>`;
        }
        if (payload.content) {
          fullResponse += payload.content;
          yield payload.content;
        }
      }

      if (fullResponse) {
        const modelMessage = createGeminiModelMessage(fullResponse, fullReasoning);
        this.pendingResponseMetadata = semanticContext
          ? { citations: semanticContext.citations }
          : undefined;
        this.history = [...this.history, userMessage, modelMessage];
      }
    } catch (error) {
      console.error('Error in Gemini stream:', error);
      throw error;
    }
  }
}

export const geminiProviderDefinition: ProviderDefinition = {
  id: GEMINI_PROVIDER_ID,
  models: GEMINI_MODELS,
  defaultModel: DEFAULT_GEMINI_MODEL,
  create: () => new GeminiProvider(),
};
