import OpenAI from 'openai';
import type { TavilyConfig } from '../../types';
import type { RequestPolicy } from './requestPolicy';
import { getMaxToolCallRounds } from './utils';

type ToolCall = {
  id: string;
  function?: { name?: string; arguments?: string };
};

type ToolMessage = {
  role: 'tool';
  tool_call_id: string;
  content: string;
};

export type PreflightMessage = OpenAI.Chat.Completions.ChatCompletionMessage & {
  tool_calls?: ToolCall[];
  reasoning_content?: string;
  reasoning?: string;
  reasoning_details?: Array<{ text?: string }>;
};

type RunToolLoopOptions = {
  client: OpenAI;
  model: string;
  messages: OpenAIChatMessages;
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
  tavilyConfig?: TavilyConfig;
  maxRounds?: number;
  extraBody?: Record<string, unknown>;
  signal?: AbortSignal;
  requestPolicy?: RequestPolicy;
  buildToolMessages: (
    toolCalls: ToolCall[],
    tavilyConfig?: TavilyConfig,
    requestPolicy?: RequestPolicy
  ) => Promise<ToolMessage[]>;
  getAssistantMessageExtras?: (message: PreflightMessage) => Record<string, unknown> | null;
};

export type ToolLoopOverrides = Pick<RunToolLoopOptions, 'extraBody' | 'getAssistantMessageExtras'>;

export type OpenAIChatMessages = Array<{
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
}>;

export type OpenAIChatCreateNonStreaming =
  OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
    extra_body?: Record<string, unknown>;
  };

export type OpenAIChatCreateStreaming =
  OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming & {
    extra_body?: Record<string, unknown>;
  };

type OpenAIChatUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
  };
  total_cost?: number;
};

export type OpenAIStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
      reasoning_content?: string;
      reasoning_text?: string;
      reasoning?: string;
      reasoning_details?: Array<{ text?: string }>;
    };
    message?: {
      content?: string;
      reasoning_content?: string;
      reasoning_text?: string;
      reasoning?: string;
      reasoning_details?: Array<{ text?: string }>;
    };
  }>;
  usage?: OpenAIChatUsage;
};

export type TavilyToolArgs = {
  query?: string;
  search_depth?: 'basic' | 'advanced' | 'fast' | 'ultra-fast';
  max_results?: number;
  topic?: 'general' | 'news' | 'finance';
  include_answer?: boolean;
};

type LegacyLoopMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
};

type RunToolLoopResult = {
  messages: OpenAIChatMessages;
  preflightMessage: PreflightMessage | null;
  hadToolCalls: boolean;
};

const createChatCompletion = async (
  client: OpenAI,
  params: OpenAIChatCreateNonStreaming | OpenAIChatCreateStreaming,
  signal?: AbortSignal
) => {
  const create = client.chat.completions.create.bind(client.chat.completions) as unknown as (
    request: OpenAIChatCreateNonStreaming | OpenAIChatCreateStreaming,
    options?: { signal?: AbortSignal }
  ) => Promise<unknown>;

  if (signal) {
    return create(params, { signal });
  }
  return create(params as OpenAIChatCreateNonStreaming);
};

export const runToolCallLoop = async ({
  client,
  model,
  messages,
  tools,
  tavilyConfig,
  maxRounds = getMaxToolCallRounds(),
  extraBody,
  signal,
  requestPolicy,
  buildToolMessages,
  getAssistantMessageExtras,
}: RunToolLoopOptions): Promise<RunToolLoopResult> => {
  if (!tools) {
    return { messages, preflightMessage: null, hadToolCalls: false };
  }

  let workingMessages = messages;
  let preflightMessage: PreflightMessage | null = null;
  let hadToolCalls = false;

  for (let round = 0; round < maxRounds; round += 1) {
    const initialResponse = (await createChatCompletion(
      client,
      {
        model,
        messages: workingMessages,
        tools,
        tool_choice: 'auto',
        stream: false,
        ...(extraBody ? { extra_body: extraBody } : {}),
      } as OpenAIChatCreateNonStreaming,
      signal
    )) as OpenAI.Chat.Completions.ChatCompletion;

    preflightMessage = (initialResponse?.choices?.[0]?.message as PreflightMessage) ?? null;
    const toolCalls = (preflightMessage?.tool_calls as ToolCall[]) ?? [];

    if (!toolCalls.length) {
      break;
    }

    hadToolCalls = true;
    const toolMessages = await buildToolMessages(toolCalls, tavilyConfig, requestPolicy);
    const extras = getAssistantMessageExtras?.(preflightMessage) ?? {};
    workingMessages = [
      ...workingMessages,
      {
        role: 'assistant' as const,
        content: preflightMessage?.content ?? null,
        tool_calls: toolCalls,
        ...extras,
      } as LegacyLoopMessage,
      ...toolMessages,
    ];
  }

  return { messages: workingMessages, preflightMessage, hadToolCalls };
};

type StreamChunkOutput = { content?: string; reasoning?: string };

type StreamOptions = {
  client: OpenAI;
  model: string;
  messages: OpenAIChatMessages;
  extraBody?: Record<string, unknown>;
  signal?: AbortSignal;
};

const extractReasoning = (chunk: OpenAIStreamChunk): string | undefined => {
  return (
    chunk.choices?.[0]?.delta?.reasoning_content ??
    chunk.choices?.[0]?.delta?.reasoning_text ??
    chunk.choices?.[0]?.delta?.reasoning ??
    chunk.choices?.[0]?.message?.reasoning_content ??
    chunk.choices?.[0]?.message?.reasoning_text ??
    chunk.choices?.[0]?.message?.reasoning
  );
};

const extractContent = (chunk: OpenAIStreamChunk): string | undefined => {
  return chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content;
};

export async function* streamStandardChatCompletions({
  client,
  model,
  messages,
  extraBody,
  signal,
}: StreamOptions): AsyncGenerator<StreamChunkOutput, void, unknown> {
  const stream = (await createChatCompletion(
    client,
    {
      model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
      ...(extraBody ? { extra_body: extraBody } : {}),
    } as OpenAIChatCreateStreaming,
    signal
  )) as AsyncIterable<OpenAIStreamChunk>;

  for await (const chunk of stream) {
    const reasoningDetails =
      chunk.choices?.[0]?.delta?.reasoning_details ??
      chunk.choices?.[0]?.message?.reasoning_details;
    if (reasoningDetails?.length) {
      for (const detail of reasoningDetails) {
        if (detail?.text) {
          yield { reasoning: detail.text };
        }
      }
    }

    const reasoningDelta = extractReasoning(chunk);
    if (reasoningDelta) {
      yield { reasoning: reasoningDelta };
    }

    const contentDelta = extractContent(chunk);
    if (contentDelta) {
      yield { content: contentDelta };
    }
  }
}

export type StreamWithToolCallLoopOptions = {
  client: OpenAI;
  model: string;
  messages: OpenAIChatMessages;
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
  tavilyConfig?: TavilyConfig;
  extraBody?: Record<string, unknown>;
  signal?: AbortSignal;
  requestPolicy?: RequestPolicy;
  buildToolMessages: (
    toolCalls: ToolCall[],
    tavilyConfig?: TavilyConfig,
    requestPolicy?: RequestPolicy
  ) => Promise<ToolMessage[]>;
  getAssistantMessageExtras?: (message: PreflightMessage) => Record<string, unknown> | null;
  emitPreflightMessageWhenNoToolCalls?: boolean;
};

export async function* streamWithToolCallLoop({
  client,
  model,
  messages,
  tools,
  tavilyConfig,
  extraBody,
  signal,
  requestPolicy,
  buildToolMessages,
  getAssistantMessageExtras,
  emitPreflightMessageWhenNoToolCalls = false,
}: StreamWithToolCallLoopOptions): AsyncGenerator<StreamChunkOutput, void, unknown> {
  let messagesToStream = messages;
  let preflightMessage: PreflightMessage | null = null;
  let hadToolCalls = false;

  if (tools) {
    const toolResult = await runToolCallLoop({
      client,
      model,
      messages,
      tools,
      tavilyConfig,
      extraBody,
      signal,
      requestPolicy,
      buildToolMessages,
      getAssistantMessageExtras,
    });
    messagesToStream = toolResult.messages;
    preflightMessage = toolResult.preflightMessage;
    hadToolCalls = toolResult.hadToolCalls;
  }

  if (emitPreflightMessageWhenNoToolCalls && tools && !hadToolCalls && preflightMessage?.content) {
    yield { content: preflightMessage.content };
    return;
  }

  for await (const chunk of streamStandardChatCompletions({
    client,
    model,
    messages: messagesToStream,
    extraBody,
    signal,
  })) {
    yield chunk;
  }
}

type StreamWithToolCallLoopAndAccumulateOptions = StreamWithToolCallLoopOptions & {
  wrapReasoning?: (reasoning: string) => string;
};

export async function* streamWithToolCallLoopAndAccumulate({
  wrapReasoning = (reasoning: string) => `<think>${reasoning}</think>`,
  ...options
}: StreamWithToolCallLoopAndAccumulateOptions): AsyncGenerator<string, string, unknown> {
  let fullResponse = '';
  for await (const chunk of streamWithToolCallLoop(options)) {
    if (chunk.reasoning) {
      yield wrapReasoning(chunk.reasoning);
    }
    if (chunk.content) {
      fullResponse += chunk.content;
      yield chunk.content;
    }
  }
  return fullResponse;
}
