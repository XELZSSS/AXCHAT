import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ChatService } from '../../../services/chatService';
import { ChatMessage, Citation, Role } from '../../../types';
import { t } from '../../../utils/i18n';
import {
  appendThinkStreamChunk,
  createThinkStreamParserState,
  finalizeThinkStreamParserState,
} from '../../../utils/streaming';
import { formatMessageTime } from '../../../utils/time';
import {
  debugLogRequestPolicy,
  decideRequestPolicyFromPrompt,
  downgradeRequestPolicy,
  type RequestPolicy,
} from '../../../services/providers/requestPolicy';

type UseStreamingMessagesOptions = {
  chatService: ChatService;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  commitCurrentSessionNow?: () => void;
};

type MessageOverrides = Omit<Partial<ChatMessage>, 'role' | 'text'>;

type CachedMessageIndex = {
  id: string;
  index: number;
};

type StreamAccumulator = {
  cleaned: string;
  reasoning: string;
  isFirstChunk: boolean;
  pendingBuffer: string;
  isFlushScheduled: boolean;
  flushTimer: number | null;
  flushIntervalMs: number;
  rateWindowStartedAt: number;
  rateChunkCount: number;
  parserState: ReturnType<typeof createThinkStreamParserState>;
};

const createStreamAccumulator = (): StreamAccumulator => ({
  cleaned: '',
  reasoning: '',
  isFirstChunk: true,
  pendingBuffer: '',
  isFlushScheduled: false,
  flushTimer: null,
  flushIntervalMs: STREAM_FLUSH_MAX_MS,
  rateWindowStartedAt: Date.now(),
  rateChunkCount: 0,
  parserState: createThinkStreamParserState(),
});

const resolveAdaptiveFlushInterval = (chunksPerSecond: number): number => {
  if (chunksPerSecond >= 40) return STREAM_FLUSH_MIN_MS;
  if (chunksPerSecond >= 20) return 60;
  if (chunksPerSecond >= 10) return 80;
  return STREAM_FLUSH_MAX_MS;
};

const updateAdaptiveFlushInterval = (accumulator: StreamAccumulator, now: number) => {
  accumulator.rateChunkCount += 1;
  const elapsed = now - accumulator.rateWindowStartedAt;
  if (elapsed < STREAM_RATE_WINDOW_MS) return;

  const chunksPerSecond = (accumulator.rateChunkCount * 1000) / Math.max(1, elapsed);
  accumulator.flushIntervalMs = resolveAdaptiveFlushInterval(chunksPerSecond);
  accumulator.rateWindowStartedAt = now;
  accumulator.rateChunkCount = 0;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const areValuesShallowEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((item, index) => areValuesShallowEqual(item, right[index]))
    );
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) =>
          Object.prototype.hasOwnProperty.call(right, key) &&
          areValuesShallowEqual(left[key], right[key])
      )
    );
  }

  return false;
};

const isAbortLikeError = (error: unknown, stopRequested: boolean): boolean => {
  const errorName = error instanceof DOMException ? error.name : '';
  const errorMessage = error instanceof Error ? error.message : String(error ?? '');

  return stopRequested || errorName === 'AbortError' || /aborted|abort/i.test(errorMessage);
};

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error ?? '');
};

const delayWithAbort = (ms: number, signal: AbortSignal): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);

    const handleAbort = () => {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', handleAbort);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    signal.addEventListener('abort', handleAbort, { once: true });
  });
};

const AUTO_SCROLL_NEAR_BOTTOM_THRESHOLD_PX = 96;
const STREAM_FLUSH_MIN_MS = 40;
const STREAM_FLUSH_MAX_MS = 120;
const STREAM_RATE_WINDOW_MS = 500;

const resolveNearBottomThreshold = (container: HTMLDivElement): number => {
  const style = window.getComputedStyle(container);
  const scrollPaddingBottom = Number.parseFloat(style.scrollPaddingBottom || '0');
  return Math.max(
    AUTO_SCROLL_NEAR_BOTTOM_THRESHOLD_PX,
    Number.isFinite(scrollPaddingBottom) ? scrollPaddingBottom + 16 : 0
  );
};

export const useStreamingMessages = ({
  chatService,
  messages,
  setMessages,
  commitCurrentSessionNow,
}: UseStreamingMessagesOptions) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const stopRequestedRef = useRef(false);
  const autoScrollEnabledRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const messagesRef = useRef(messages);
  const activeStreamAbortControllerRef = useRef<AbortController | null>(null);
  const lastUpdatedMessageIndexRef = useRef<CachedMessageIndex | null>(null);

  const messagesContentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const performScrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });

    window.requestAnimationFrame(() => {
      const latestContainer = messagesContainerRef.current;
      if (!latestContainer) {
        return;
      }
      latestContainer.scrollTop = latestContainer.scrollHeight;
    });

    isNearBottomRef.current = true;
    setShowScrollToBottom(false);
  }, []);

  const jumpToBottom = useCallback(() => {
    performScrollToBottom('auto');
  }, [performScrollToBottom]);

  const updateNearBottomState = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const distanceToBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight);
    const nextIsNearBottom = distanceToBottom <= resolveNearBottomThreshold(container);
    isNearBottomRef.current = nextIsNearBottom;
    setShowScrollToBottom(!nextIsNearBottom && messagesRef.current.length > 0);
    if (!nextIsNearBottom) {
      autoScrollEnabledRef.current = false;
    }
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    if (messages.length === 0) {
      setShowScrollToBottom(false);
      return;
    }

    window.requestAnimationFrame(() => {
      updateNearBottomState();
    });
  }, [messages, updateNearBottomState]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    updateNearBottomState();
    container.addEventListener('scroll', updateNearBottomState, { passive: true });

    return () => {
      container.removeEventListener('scroll', updateNearBottomState);
    };
  }, [updateNearBottomState]);

  const commitMessages = useCallback(
    (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      const next = updater(messagesRef.current);
      messagesRef.current = next;
      setMessages(next);
    },
    [setMessages]
  );

  const updateMessageById = useCallback(
    (messageId: string, updates: Partial<ChatMessage>) => {
      commitMessages((prev) => {
        const cached = lastUpdatedMessageIndexRef.current;
        const cachedIndex =
          cached?.id === messageId && prev[cached.index]?.id === messageId ? cached.index : -1;
        const index =
          cachedIndex >= 0 ? cachedIndex : prev.findIndex((message) => message.id === messageId);

        if (cachedIndex < 0 && index >= 0) {
          lastUpdatedMessageIndexRef.current = { id: messageId, index };
        }
        if (index === -1) return prev;

        const current = prev[index];
        const nextMessage = { ...current, ...updates };
        if (
          nextMessage.text === current.text &&
          nextMessage.reasoning === current.reasoning &&
          nextMessage.isError === current.isError &&
          areValuesShallowEqual(nextMessage.toolCalls ?? null, current.toolCalls ?? null) &&
          areValuesShallowEqual(nextMessage.toolResults ?? null, current.toolResults ?? null) &&
          areValuesShallowEqual(nextMessage.citations ?? null, current.citations ?? null)
        ) {
          return prev;
        }

        const next = [...prev];
        next[index] = nextMessage;
        return next;
      });
    },
    [commitMessages]
  );

  const buildMessage = useCallback(
    (role: Role, text: string, overrides: MessageOverrides = {}): ChatMessage => {
      const { id, timestamp, timeLabel, ...rest } = overrides;
      const resolvedTimestamp = timestamp ?? Date.now();

      return {
        id: id ?? uuidv4(),
        role,
        text,
        timestamp: resolvedTimestamp,
        timeLabel: timeLabel ?? formatMessageTime(resolvedTimestamp),
        ...rest,
      };
    },
    []
  );

  const startPendingModelResponse = useCallback(
    (prompt: string): string => {
      const modelMessageId = uuidv4();
      const userMessage = buildMessage(Role.User, prompt);
      const modelMessage = buildMessage(Role.Model, '', { id: modelMessageId });

      commitMessages((prev) => {
        const modelMessageIndex = prev.length + 1;
        lastUpdatedMessageIndexRef.current = { id: modelMessageId, index: modelMessageIndex };
        return [...prev, userMessage, modelMessage];
      });

      const shouldAutoScroll = isNearBottomRef.current;
      autoScrollEnabledRef.current = shouldAutoScroll;
      if (shouldAutoScroll) {
        performScrollToBottom('auto');
      }

      return modelMessageId;
    },
    [buildMessage, commitMessages, performScrollToBottom]
  );

  const buildFriendlyErrorMessage = useCallback((rawMessage: string): string => {
    const rawLower = rawMessage.toLowerCase();
    let friendlyError = t('error.generic');

    if (rawLower.includes('api key') || rawLower.includes('403')) {
      friendlyError = t('error.auth');
    } else if (rawLower.includes('quota') || rawLower.includes('429')) {
      friendlyError = t('error.quota');
    } else if (rawLower.includes('safety') || rawLower.includes('blocked')) {
      friendlyError = t('error.safety');
    } else if (
      rawLower.includes('fetch') ||
      rawLower.includes('network') ||
      rawLower.includes('failed to fetch')
    ) {
      friendlyError = t('error.network');
    } else if (rawLower.includes('503') || rawLower.includes('overloaded')) {
      friendlyError = t('error.overloaded');
    }

    return `${friendlyError}

${t('error.troubleshooting')}
1. ${t('error.step1')}
2. ${t('error.step2')}
3. ${t('error.step3')}

${t('error.technicalDetails')}
${rawMessage}`;
  }, []);

  const upsertModelErrorMessage = useCallback(
    (modelMessageId: string, finalMessageText: string) => {
      const fallbackErrorMessage = buildMessage(Role.Model, finalMessageText, { isError: true });

      commitMessages((prev) => {
        const cached = lastUpdatedMessageIndexRef.current;
        const cachedIndex =
          cached?.id === modelMessageId && prev[cached.index]?.id === modelMessageId
            ? cached.index
            : -1;
        const index =
          cachedIndex >= 0
            ? cachedIndex
            : prev.findIndex((message) => message.id === modelMessageId);

        if (index === -1) {
          return [...prev, fallbackErrorMessage];
        }

        lastUpdatedMessageIndexRef.current = { id: modelMessageId, index };
        const next = [...prev];
        next[index] = {
          ...next[index],
          text: finalMessageText,
          reasoning: undefined,
          isError: true,
        };
        return next;
      });
    },
    [buildMessage, commitMessages]
  );

  const syncHistory = useCallback(() => {
    void chatService.startChatWithHistory(messagesRef.current).catch((error) => {
      console.error('Failed to synchronize chat history:', error);
    });
  }, [chatService]);

  const flushBufferedStreamResponse = useCallback(
    (modelMessageId: string, accumulator: StreamAccumulator) => {
      accumulator.isFlushScheduled = false;
      if (accumulator.flushTimer !== null) {
        window.clearTimeout(accumulator.flushTimer);
        accumulator.flushTimer = null;
      }
      if (!accumulator.pendingBuffer) return;

      accumulator.parserState = appendThinkStreamChunk(
        accumulator.parserState,
        accumulator.pendingBuffer
      );
      const parsed = finalizeThinkStreamParserState(accumulator.parserState);
      accumulator.cleaned = parsed.cleaned;
      accumulator.reasoning = parsed.reasoning;
      accumulator.pendingBuffer = '';

      updateMessageById(modelMessageId, {
        text: accumulator.cleaned,
        reasoning: accumulator.reasoning || undefined,
      });

      if (autoScrollEnabledRef.current) {
        window.requestAnimationFrame(() => {
          if (!autoScrollEnabledRef.current) {
            return;
          }
          performScrollToBottom('auto');
        });
      }
    },
    [performScrollToBottom, updateMessageById]
  );

  const scheduleStreamFlush = useCallback(
    (modelMessageId: string, accumulator: StreamAccumulator) => {
      if (accumulator.isFlushScheduled) return;

      accumulator.isFlushScheduled = true;
      accumulator.flushTimer = window.setTimeout(() => {
        accumulator.flushTimer = null;
        flushBufferedStreamResponse(modelMessageId, accumulator);
      }, accumulator.flushIntervalMs);
    },
    [flushBufferedStreamResponse]
  );

  useEffect(() => {
    return () => {
      activeStreamAbortControllerRef.current?.abort();
      activeStreamAbortControllerRef.current = null;
    };
  }, []);

  const handleSendMessage = useCallback(
    async (text: string) => {
      stopRequestedRef.current = false;
      activeStreamAbortControllerRef.current?.abort();

      const abortController = new AbortController();
      activeStreamAbortControllerRef.current = abortController;

      const modelMessageId = startPendingModelResponse(text);
      setIsStreaming(true);
      setIsLoading(true);

      let requestPolicy: RequestPolicy = decideRequestPolicyFromPrompt(text);
      const outboundMessage = text;

      const streamAttempt = async (policy: RequestPolicy) => {
        const accumulator = createStreamAccumulator();
        debugLogRequestPolicy(chatService.getProviderId(), policy);

        for await (const chunk of chatService.sendMessageStream(
          outboundMessage,
          abortController.signal,
          policy
        )) {
          if (stopRequestedRef.current) {
            break;
          }

          if (accumulator.isFirstChunk) {
            setIsLoading(false);
            accumulator.isFirstChunk = false;
          }

          accumulator.pendingBuffer += chunk;
          updateAdaptiveFlushInterval(accumulator, Date.now());
          scheduleStreamFlush(modelMessageId, accumulator);
        }

        flushBufferedStreamResponse(modelMessageId, accumulator);
        const responseMetadata = chatService.consumePendingResponseMetadata();
        updateMessageById(modelMessageId, {
          text: accumulator.cleaned,
          reasoning: accumulator.reasoning || undefined,
          citations: responseMetadata?.citations,
        });
      };

      try {
        try {
          await streamAttempt(requestPolicy);
        } catch (error: unknown) {
          if (isAbortLikeError(error, stopRequestedRef.current)) {
            throw error;
          }

          console.error('Chat error, retrying once:', error);
          setIsLoading(false);
          updateMessageById(modelMessageId, {
            text: t('error.retrying'),
            reasoning: undefined,
            isError: false,
          });
          requestPolicy = downgradeRequestPolicy(requestPolicy);
          await delayWithAbort(3000, abortController.signal);
          await streamAttempt(requestPolicy);
        }
      } catch (error: unknown) {
        if (!isAbortLikeError(error, stopRequestedRef.current)) {
          console.error('Chat error:', error);
          const finalMessageText = buildFriendlyErrorMessage(getErrorMessage(error));
          upsertModelErrorMessage(modelMessageId, finalMessageText);
        }
      } finally {
        if (activeStreamAbortControllerRef.current === abortController) {
          activeStreamAbortControllerRef.current = null;
        }

        const shouldPersistPartialResponse = !stopRequestedRef.current;

        setIsStreaming(false);
        setIsLoading(false);
        autoScrollEnabledRef.current = false;
        if (shouldPersistPartialResponse) {
          syncHistory();
          commitCurrentSessionNow?.();
        }
      }
    },
    [
      buildFriendlyErrorMessage,
      chatService,
      commitCurrentSessionNow,
      flushBufferedStreamResponse,
      scheduleStreamFlush,
      startPendingModelResponse,
      syncHistory,
      updateMessageById,
      upsertModelErrorMessage,
    ]
  );

  const stopStreaming = useCallback(() => {
    stopRequestedRef.current = true;
    autoScrollEnabledRef.current = false;
    activeStreamAbortControllerRef.current?.abort();
    activeStreamAbortControllerRef.current = null;
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  return {
    messagesContentRef,
    messagesEndRef,
    messagesContainerRef,
    isStreaming,
    isLoading,
    showScrollToBottom,
    jumpToBottom,
    handleSendMessage,
    stopStreaming,
  };
};
