import OpenAI from 'openai';
import { ChatMessage, ProviderId, Role, TavilyConfig } from '../../types';
import type { RequestPolicy } from './requestPolicy';
import { t } from '../../utils/i18n';
import { OpenAIStyleProviderBase } from './openaiBase';
import { ProviderChat, ProviderDefinition } from './types';
import { buildSystemInstruction } from './prompts';
import { OPENAI_MODEL_CATALOG } from './models';
import { callTavilySearch, getDefaultTavilyConfig, normalizeTavilyConfig } from './tavily';
import {
  ResponseFunctionCallItem,
  ResponseFunctionTool,
  ResponseInputMessage,
  ResponseStreamEvent,
  createResponseTools,
  toResponseInputMessages,
} from './responsesShared';
import { buildProviderModelConfig } from './modelConfig';
import { getMaxToolCallRounds, sanitizeApiKey } from './utils';

export const OPENAI_PROVIDER_ID: ProviderId = 'openai';
const FALLBACK_OPENAI_MODEL = 'gpt-5.4';
const { defaultModel: DEFAULT_OPENAI_MODEL, models: OPENAI_MODELS } = buildProviderModelConfig({
  envModel: process.env.OPENAI_MODEL,
  fallbackModel: FALLBACK_OPENAI_MODEL,
  catalog: OPENAI_MODEL_CATALOG,
});

const DEFAULT_OPENAI_API_KEY = sanitizeApiKey(process.env.OPENAI_API_KEY);
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;

const supportsReasoningSummary = (modelName: string): boolean => {
  const lower = modelName.toLowerCase();
  return lower.startsWith('gpt-5') || lower.startsWith('o');
};

const isAssistantRole = (role: Role): role is Role.Model => role !== Role.User;

class OpenAIProvider extends OpenAIStyleProviderBase implements ProviderChat {
  private readonly id: ProviderId = OPENAI_PROVIDER_ID;
  private apiKey?: string;

  private client: OpenAI | null = null;
  private modelName: string;
  private tavilyConfig?: TavilyConfig;

  constructor() {
    super();
    this.apiKey = DEFAULT_OPENAI_API_KEY;
    this.modelName = openaiProviderDefinition.defaultModel;
    this.tavilyConfig = getDefaultTavilyConfig();
  }

  private getClient(): OpenAI {
    const keyToUse = this.apiKey ?? DEFAULT_OPENAI_API_KEY;
    if (!keyToUse) {
      throw new Error(t('settings.provider.error.openai.missingApiKey'));
    }
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: keyToUse,
        baseURL: OPENAI_BASE_URL,
        dangerouslyAllowBrowser: true,
      });
    }
    return this.client;
  }

  private toInputMessages(messages: ChatMessage[]): ResponseInputMessage[] {
    return toResponseInputMessages(
      messages.map((msg) => ({
        role: msg.role === Role.User ? 'user' : 'model',
        text: msg.text,
        isError: msg.isError,
      }))
    );
  }

  private buildTools(): ResponseFunctionTool[] | undefined {
    if (!this.tavilyConfig?.apiKey) return undefined;
    return createResponseTools();
  }

  private async runToolCall(call: ResponseFunctionCallItem): Promise<string> {
    if (call.name !== 'tavily_search') {
      return JSON.stringify({
        error: `${t('settings.provider.error.tool.unsupported')}: ${call.name}`,
      });
    }

    let args: {
      query?: string;
      search_depth?: 'basic' | 'advanced' | 'fast' | 'ultra-fast';
      max_results?: number;
      topic?: 'general' | 'news' | 'finance';
      include_answer?: boolean;
    } = {};

    try {
      args = call.arguments ? (JSON.parse(call.arguments) as typeof args) : {};
    } catch {
      args = {};
    }

    if (!args.query) {
      return JSON.stringify({ error: t('settings.provider.error.tool.missingQuery') });
    }

    try {
      const result = await callTavilySearch(this.tavilyConfig, {
        query: args.query,
        search_depth: args.search_depth,
        max_results: args.max_results,
        topic: args.topic,
        include_answer: args.include_answer,
      });
      return JSON.stringify(result);
    } catch (error) {
      return JSON.stringify({
        error: error instanceof Error ? error.message : 'Tavily search failed',
      });
    }
  }

  private async *streamResponsesTurn(
    client: OpenAI,
    request: {
      model: string;
      instructions: string;
      input?:
        | string
        | Array<
            ResponseInputMessage | { type: 'function_call_output'; call_id: string; output: string }
          >;
      previous_response_id?: string;
      tools?: ResponseFunctionTool[];
      parallel_tool_calls?: boolean;
      reasoning?: { summary: 'auto' };
      stream: true;
    },
    signal?: AbortSignal
  ): AsyncGenerator<
    | { kind: 'text'; value: string }
    | {
        kind: 'response';
        id?: string;
        functionCalls: ResponseFunctionCallItem[];
        usage?: ResponseStreamEvent['response']['usage'];
      },
    void,
    unknown
  > {
    const createResponse = client.responses.create.bind(client.responses) as unknown as (
      body: typeof request,
      options?: { signal?: AbortSignal }
    ) => Promise<AsyncIterable<ResponseStreamEvent>>;

    const stream = await createResponse(request, signal ? { signal } : undefined);
    const functionCalls = new Map<string, ResponseFunctionCallItem>();
    let responseId: string | undefined;
    let usage: ResponseStreamEvent['response']['usage'];

    for await (const event of stream) {
      if (event.response?.id) {
        responseId = event.response.id;
      }
      if (event.response?.usage) {
        usage = event.response.usage;
      }

      if (event.type === 'response.output_text.delta' && event.delta) {
        yield { kind: 'text', value: event.delta };
      } else if (event.type === 'response.reasoning_summary_text.delta' && event.delta) {
        yield { kind: 'text', value: `<think>${event.delta}</think>` };
      } else if (event.type === 'response.reasoning_text.delta' && event.delta) {
        yield { kind: 'text', value: `<think>${event.delta}</think>` };
      } else if (event.type === 'response.reasoning_summary_text.done' && event.text) {
        yield { kind: 'text', value: `<think>${event.text}</think>` };
      } else if (event.type === 'response.reasoning_text.done' && event.text) {
        yield { kind: 'text', value: `<think>${event.text}</think>` };
      } else if (
        event.type === 'response.output_item.done' &&
        event.item?.type === 'function_call'
      ) {
        const callId = event.item.call_id;
        const name = event.item.name;
        const args = event.item.arguments;
        if (callId && name) {
          functionCalls.set(callId, {
            type: 'function_call',
            call_id: callId,
            name,
            arguments: args ?? '{}',
          });
        }
      } else if (event.type === 'response.failed') {
        throw new Error('OpenAI response stream failed');
      }
    }

    yield {
      kind: 'response',
      id: responseId,
      functionCalls: Array.from(functionCalls.values()),
      usage,
    };
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
    const nextKey = sanitizeApiKey(apiKey) ?? DEFAULT_OPENAI_API_KEY;
    if (nextKey !== this.apiKey) {
      this.apiKey = nextKey;
      this.client = null;
    }
  }

  getTavilyConfig(): TavilyConfig | undefined {
    return this.tavilyConfig;
  }

  setTavilyConfig(config?: TavilyConfig): void {
    this.tavilyConfig = normalizeTavilyConfig(config);
  }

  async *sendMessageStream(
    message: string,
    signal?: AbortSignal,
    requestPolicy?: RequestPolicy
  ): AsyncGenerator<string, void, unknown> {
    const client = this.getClient();

    const userMessage: ChatMessage = {
      id: `openai-user-${Date.now()}`,
      role: Role.User,
      text: message,
      timestamp: Date.now(),
    };

    const nextHistory = [...this.history, userMessage];
    const input = this.toInputMessages(nextHistory);
    const tools = this.buildTools();
    const enableReasoningSummary = supportsReasoningSummary(this.modelName);
    const maxToolRounds = getMaxToolCallRounds();

    let fullResponse = '';
    let previousResponseId: string | undefined;
    let requestInput:
      | string
      | Array<
          ResponseInputMessage | { type: 'function_call_output'; call_id: string; output: string }
        >
      | undefined = input;

    try {
      for (let round = 0; round <= maxToolRounds; round += 1) {
        let turnResult:
          | {
              kind: 'response';
              id?: string;
              functionCalls: ResponseFunctionCallItem[];
              usage?: ResponseStreamEvent['response']['usage'];
            }
          | undefined;

        for await (const chunk of this.streamResponsesTurn(
          client,
          {
            model: this.modelName,
            instructions: buildSystemInstruction(this.id, this.modelName),
            input: requestInput,
            previous_response_id: previousResponseId,
            tools,
            parallel_tool_calls: (requestPolicy?.toolParallelism ?? 1) > 1,
            reasoning: enableReasoningSummary ? { summary: 'auto' } : undefined,
            stream: true,
          },
          signal
        )) {
          if (chunk.kind === 'text') {
            fullResponse += chunk.value.startsWith('<think>') ? '' : chunk.value;
            yield chunk.value;
          } else {
            turnResult = chunk;
          }
        }

        if (!turnResult?.functionCalls.length) {
          break;
        }

        if (!turnResult.id) {
          throw new Error('Missing OpenAI response id for function-call follow-up.');
        }

        if (round >= maxToolRounds) {
          throw new Error(`Exceeded maximum OpenAI tool call rounds: ${maxToolRounds}`);
        }

        previousResponseId = turnResult.id;
        requestInput = await Promise.all(
          turnResult.functionCalls.map(async (call) => ({
            type: 'function_call_output' as const,
            call_id: call.call_id,
            output: await this.runToolCall(call),
          }))
        );
      }

      const modelMessage: ChatMessage = {
        id: `openai-model-${Date.now()}`,
        role: Role.Model,
        text: fullResponse,
        timestamp: Date.now(),
      };

      this.history = [...nextHistory, modelMessage].filter((item) =>
        item.role === Role.User ? true : isAssistantRole(item.role)
      );
    } catch (error) {
      console.error('Error in OpenAI stream:', error);
      throw error;
    }
  }
}

export const openaiProviderDefinition: ProviderDefinition = {
  id: OPENAI_PROVIDER_ID,
  models: OPENAI_MODELS,
  defaultModel: DEFAULT_OPENAI_MODEL,
  create: () => new OpenAIProvider(),
};
