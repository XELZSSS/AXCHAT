import { ChatMessage, ProviderId, Role, TavilyConfig } from '../../types';
import { t } from '../../utils/i18n';
import type { RequestPolicy } from './requestPolicy';
import { buildSystemInstruction } from './prompts';
import { decideAdaptiveToolParallelism, runWithConcurrency } from './requestPolicy';
import { callTavilySearch } from './tavily';
import { TavilyToolArgs } from './openaiChatHelpers';

type ToolCall = {
  id: string;
  function?: { name?: string; arguments?: string };
};

type ToolMessage = {
  role: 'tool';
  tool_call_id: string;
  content: string;
};

const createToolMessage = (toolCallId: string, content: string): ToolMessage => ({
  role: 'tool',
  tool_call_id: toolCallId,
  content,
});

const createToolErrorContent = (message: string): string => JSON.stringify({ error: message });

const resolveToolConcurrency = (
  parsedCalls: Array<{ args: TavilyToolArgs }>,
  requestPolicy?: RequestPolicy
): number =>
  Math.max(
    1,
    Math.min(
      requestPolicy?.toolParallelism ?? Number.MAX_SAFE_INTEGER,
      decideAdaptiveToolParallelism(parsedCalls.map(({ args }) => args))
    )
  );

export abstract class OpenAIStyleProviderBase {
  protected history: ChatMessage[] = [];

  protected buildMessages(
    nextHistory: ChatMessage[],
    providerId: ProviderId,
    modelName: string
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const systemInstruction = buildSystemInstruction(providerId, modelName);
    return [
      { role: 'system', content: systemInstruction },
      ...nextHistory
        .filter((msg) => !msg.isError)
        .map((msg) => ({
          role: msg.role === Role.User ? ('user' as const) : ('assistant' as const),
          content: msg.text,
        })),
    ];
  }

  resetChat(): void {
    this.history = [];
  }

  async startChatWithHistory(messages: ChatMessage[]): Promise<void> {
    this.history = messages.filter((msg) => !msg.isError);
  }

  protected async buildToolMessages(
    toolCalls: ToolCall[],
    tavilyConfig?: TavilyConfig,
    requestPolicy?: RequestPolicy
  ): Promise<ToolMessage[]> {
    const parsedCalls = toolCalls.map((call) => {
      let args: TavilyToolArgs;
      try {
        args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = {};
      }

      return { call, args };
    });

    const toolResults = await runWithConcurrency(
      parsedCalls,
      resolveToolConcurrency(parsedCalls, requestPolicy),
      async ({ call, args }) => {
        if (call.function?.name !== 'tavily_search') {
          return createToolMessage(
            call.id,
            createToolErrorContent(
              `${t('settings.provider.error.tool.unsupported')}: ${call.function?.name ?? 'unknown'}`
            )
          );
        }
        if (!args.query) {
          return createToolMessage(
            call.id,
            createToolErrorContent(t('settings.provider.error.tool.missingQuery'))
          );
        }
        try {
          const result = await callTavilySearch(tavilyConfig, {
            query: args.query,
            search_depth: args.search_depth,
            max_results: args.max_results,
            topic: args.topic,
            include_answer: args.include_answer,
          });
          return createToolMessage(call.id, JSON.stringify(result));
        } catch (error) {
          return createToolMessage(
            call.id,
            createToolErrorContent(
              error instanceof Error ? error.message : 'Tavily search failed'
            )
          );
        }
      }
    );

    return toolResults;
  }
}
