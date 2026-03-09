import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Role, ChatMessage } from '../types';
import { t } from '../utils/i18n';
import { formatMessageTime } from '../utils/time';

interface ChatBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  animateOnMount?: boolean;
}

const TypingIndicator = () => (
  <div className="flex items-center gap-1.5 h-6 px-1" aria-hidden="true">
    <div className="w-1.5 h-1.5 bg-[var(--ink-3)] rounded-full animate-pulse [animation-delay:-0.24s]"></div>
    <div className="w-1.5 h-1.5 bg-[var(--ink-3)] rounded-full animate-pulse [animation-delay:-0.12s]"></div>
    <div className="w-1.5 h-1.5 bg-[var(--ink-3)] rounded-full animate-pulse"></div>
  </div>
);

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isStreaming = false }) => {
  const isUser = message.role === Role.User;
  const isError = message.isError;
  const hasText = message.text && message.text.length > 0;
  const toolCalls = !isUser ? (message.toolCalls ?? []) : [];
  const toolResults = !isUser ? (message.toolResults ?? []) : [];
  const citations = !isUser ? (message.citations ?? []) : [];

  const reasoningText = !isUser ? (message.reasoning?.trim() ?? '') : '';
  const hasReasoning = reasoningText.length > 0;
  const hasToolCalls = toolCalls.length > 0;
  const hasToolResults = toolResults.length > 0;
  const hasCitations = citations.length > 0;

  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const prevStreamingRef = useRef(isStreaming);
  const reasoningSeenRef = useRef(false);
  const collapseTimerRef = useRef<number | null>(null);

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }, []);

  const toolLabels = useMemo(
    () => ({
      custom: t('chat.tool.custom'),
      nativeOpenAI: t('chat.tool.native.openai'),
      nativeGemini: t('chat.tool.native.gemini'),
      nativeGeneric: t('chat.tool.native.generic'),
    }),
    [t]
  );
  const citationLabels = useMemo(
    () => ({
      chunk: t('chat.citations.chunk'),
      score: t('chat.citations.score'),
      webSource: t('chat.citations.webSource'),
    }),
    [t]
  );
  const reasoningLabels = useMemo(
    () => ({
      streaming: t('reasoning.streaming'),
      title: t('reasoning.title'),
      collapse: t('reasoning.collapse'),
      expand: t('reasoning.expand'),
    }),
    [t]
  );

  const getToolLabel = useCallback(
    (source?: 'custom' | 'native', provider?: string) => {
      if (source !== 'native') return toolLabels.custom;
      if (provider === 'openai') return toolLabels.nativeOpenAI;
      if (provider === 'gemini') return toolLabels.nativeGemini;
      return toolLabels.nativeGeneric;
    },
    [toolLabels]
  );
  const formatCitationChunkLabel = useCallback(
    (chunkIndex: number) => `${citationLabels.chunk} ${chunkIndex + 1}`,
    [citationLabels]
  );
  const formatCitationScoreLabel = useCallback(
    (score: number) => `${citationLabels.score} ${score.toFixed(3)}`,
    [citationLabels]
  );
  const formatWebCitationLabel = useCallback(
    (index: number, title?: string, url?: string) => {
      if (typeof title === 'string' && title.trim().length > 0) {
        return title;
      }
      if (typeof url === 'string' && url.trim().length > 0) {
        return url;
      }
      return `${citationLabels.webSource} ${index + 1}`;
    },
    [citationLabels]
  );
  const reasoningToggleLabel = useMemo(
    () =>
      `${isStreaming ? reasoningLabels.streaming : reasoningLabels.title} ${isReasoningOpen ? reasoningLabels.collapse : reasoningLabels.expand}`,
    [isReasoningOpen, isStreaming, reasoningLabels]
  );

  useEffect(() => {
    return () => {
      clearCollapseTimer();
    };
  }, [clearCollapseTimer]);

  useEffect(() => {
    if (isStreaming && hasReasoning && !reasoningSeenRef.current) {
      clearCollapseTimer();
      setIsReasoningOpen(true);
      reasoningSeenRef.current = true;
    }

    if (prevStreamingRef.current && !isStreaming) {
      clearCollapseTimer();
      if (hasReasoning) {
        collapseTimerRef.current = window.setTimeout(() => {
          setIsReasoningOpen(false);
          collapseTimerRef.current = null;
        }, 220);
      } else {
        setIsReasoningOpen(false);
      }
      reasoningSeenRef.current = false;
    }

    prevStreamingRef.current = isStreaming;
  }, [clearCollapseTimer, hasReasoning, isStreaming]);

  return (
    <div className="flex w-full mb-6 justify-center">
      <div
        className={`flex min-w-0 w-full max-w-[min(64rem,100%)] gap-4 ${
          isUser ? 'justify-end flex-row pr-3' : 'justify-start flex-row'
        }`}
      >
        <div
          className={`flex min-w-0 flex-col w-full max-w-[min(52rem,100%)] ${
            isUser ? 'items-end max-w-[min(38rem,100%)]' : 'items-start'
          }`}
        >
          <div
            className={`py-1 ${
              isUser
                ? 'text-[var(--ink-1)]'
                : isError
                  ? 'px-4 py-3 rounded-xl bg-red-900/10 border border-red-900/30 text-red-100 rounded-tl-sm'
                  : 'text-[var(--ink-2)]'
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap break-words leading-relaxed text-sm">
                {message.text}
              </p>
            ) : (
              <div className="min-w-0">
                {hasReasoning && (
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearCollapseTimer();
                        setIsReasoningOpen((prev) => !prev);
                      }}
                      className="text-[11px] text-[var(--ink-3)] hover:text-[var(--ink-2)] transition-colors"
                    >
                      {reasoningToggleLabel}
                    </button>
                  </div>
                )}

                {hasReasoning && (
                  <div
                    className={`grid w-fit max-w-[min(40rem,100%)] transition-[grid-template-rows,opacity,transform,margin] duration-200 ease-out motion-reduce:transition-none ${
                      isReasoningOpen
                        ? 'mb-3 grid-rows-[1fr] opacity-100 translate-y-0'
                        : 'mb-0 grid-rows-[0fr] opacity-0 -translate-y-0.5 pointer-events-none'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="rounded-lg border border-[var(--line-1)] bg-[var(--bg-2)] px-3 py-2 text-xs text-[var(--ink-3)]">
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {reasoningText}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {hasToolCalls && (
                  <div className="mb-3 space-y-2">
                    {toolCalls.map((toolCall) => (
                      <div
                        key={toolCall.id}
                        className={`w-fit max-w-[min(40rem,100%)] rounded-lg border px-3 py-2 text-xs ${
                          toolCall.source === 'native'
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                            : 'border-[var(--line-1)] bg-[var(--bg-2)] text-[var(--ink-3)]'
                        }`}
                      >
                        <div className="mb-1 font-medium text-[var(--ink-2)]">
                          {getToolLabel(toolCall.source, toolCall.provider)}: {toolCall.name}
                        </div>
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {toolCall.argumentsText}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {hasToolResults && (
                  <div className="mb-3 space-y-2">
                    {toolResults.map((toolResult) => (
                      <div
                        key={toolResult.id}
                        className={`w-fit max-w-[min(40rem,100%)] rounded-lg border px-3 py-2 text-xs ${
                          toolResult.isError
                            ? 'border-red-900/30 bg-red-900/10 text-red-100'
                            : toolResult.source === 'native'
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                              : 'border-[var(--line-1)] bg-[var(--bg-2)] text-[var(--ink-3)]'
                        }`}
                      >
                        <div className="mb-1 font-medium text-[var(--ink-2)]">
                          {getToolLabel(toolResult.source, toolResult.provider)}{' '}
                          {t('chat.tool.result')}: {toolResult.name}
                        </div>
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {toolResult.outputText}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {!hasText && isStreaming && <TypingIndicator />}
                {hasText && (
                  <p className="whitespace-pre-wrap break-words leading-relaxed text-sm text-[var(--ink-2)]">
                    {message.text}
                  </p>
                )}

                {hasCitations && (
                  <div className="mt-3 w-full max-w-[min(44rem,100%)] rounded-xl border border-[var(--line-1)] bg-[var(--bg-2)]/50 px-3 py-3">
                    <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--ink-3)]">
                      {t('chat.citations.title')}
                    </div>
                    <div className="space-y-2">
                      {citations.map((citation, index) => {
                        const citationKey =
                          citation.chunkId ??
                          citation.url ??
                          `${citation.sourceKind ?? 'local'}-${index}`;

                        if (citation.sourceKind === 'web') {
                          const label = formatWebCitationLabel(index, citation.title, citation.url);
                          return (
                            <div
                              key={citationKey}
                              className="rounded-lg border border-[var(--line-1)] bg-[var(--bg-1)]/70 px-3 py-2"
                            >
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ink-2)]">
                                <span className="font-medium">{label}</span>
                                {typeof citation.score === 'number' && (
                                  <span className="text-[var(--ink-3)]">
                                    {formatCitationScoreLabel(citation.score)}
                                  </span>
                                )}
                              </div>
                              {citation.url && (
                                <a
                                  href={citation.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 block text-[11px] text-[#60a5fa] underline break-all"
                                >
                                  {citation.url}
                                </a>
                              )}
                              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--ink-3)]">
                                {citation.snippet}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={citationKey}
                            className="rounded-lg border border-[var(--line-1)] bg-[var(--bg-1)]/70 px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ink-2)]">
                              <span className="font-medium">{citation.documentName}</span>
                              {typeof citation.chunkIndex === 'number' && (
                                <span className="text-[var(--ink-3)]">
                                  {formatCitationChunkLabel(citation.chunkIndex)}
                                </span>
                              )}
                              {typeof citation.score === 'number' && (
                                <span className="text-[var(--ink-3)]">
                                  {formatCitationScoreLabel(citation.score)}
                                </span>
                              )}
                            </div>
                            {citation.sourcePath && (
                              <div className="mt-1 text-[11px] text-[var(--ink-3)] break-all">
                                {citation.sourcePath}
                              </div>
                            )}
                            <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--ink-3)]">
                              {citation.snippet}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 px-1">
            <span className="text-[10px] text-[var(--ink-3)]">
              {message.timeLabel ?? formatMessageTime(message.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const areChatBubbleEqual = (prev: ChatBubbleProps, next: ChatBubbleProps): boolean => {
  if (prev.isStreaming !== next.isStreaming) return false;

  const prevMessage = prev.message;
  const nextMessage = next.message;

  return (
    prevMessage.id === nextMessage.id &&
    prevMessage.role === nextMessage.role &&
    prevMessage.text === nextMessage.text &&
    prevMessage.reasoning === nextMessage.reasoning &&
    prevMessage.isError === nextMessage.isError &&
    prevMessage.timeLabel === nextMessage.timeLabel &&
    prevMessage.timestamp === nextMessage.timestamp &&
    prevMessage.toolCalls === nextMessage.toolCalls &&
    prevMessage.toolResults === nextMessage.toolResults &&
    prevMessage.citations === nextMessage.citations
  );
};

export default React.memo(ChatBubble, areChatBubbleEqual);
