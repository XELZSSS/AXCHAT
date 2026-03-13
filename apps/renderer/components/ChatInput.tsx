import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { t } from '../utils/i18n';
import { readAppStorage, removeAppStorage, writeAppStorage } from '../services/storageKeys';
import { PublicIcon, SendRoundedIcon, StopCircleOutlinedIcon } from './icons';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  isStreaming: boolean;
  onStop: () => void;
  containerClassName?: string;
  searchEnabled: boolean;
  searchAvailable: boolean;
  onToggleSearch: () => void;
}

const ChatInputComponent = ({
  onSend,
  disabled,
  isStreaming,
  onStop,
  containerClassName,
  searchEnabled,
  searchAvailable,
  onToggleSearch,
}: ChatInputProps) => {
  const [input, setInput] = useState(() => readAppStorage('inputDraft') ?? '');
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftSaveTimerRef = useRef<number | null>(null);
  const lastHeightRef = useRef<number | null>(null);
  const isInputDisabled = disabled && !isStreaming;
  const hasInput = input.trim().length > 0;

  const clearDraftTimer = useCallback(() => {
    if (draftSaveTimerRef.current !== null) {
      window.clearTimeout(draftSaveTimerRef.current);
      draftSaveTimerRef.current = null;
    }
  }, []);

  const persistDraft = useCallback(
    (value: string) => {
      clearDraftTimer();
      draftSaveTimerRef.current = window.setTimeout(() => {
        writeAppStorage('inputDraft', value);
        clearDraftTimer();
      }, 350);
    },
    [clearDraftTimer]
  );

  const clearDraft = useCallback(() => {
    clearDraftTimer();
    removeAppStorage('inputDraft');
  }, [clearDraftTimer]);

  const stopStreaming = useCallback(() => {
    onStop();
  }, [onStop]);

  useEffect(() => {
    return () => clearDraftTimer();
  }, [clearDraftTimer]);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, []);

  const updateChatInputHeight = useCallback(() => {
    if (!containerRef.current) return;
    const nextHeight = containerRef.current.offsetHeight;
    if (lastHeightRef.current === nextHeight) return;
    lastHeightRef.current = nextHeight;
    document.documentElement.style.setProperty('--chat-input-height', `${nextHeight}px`);
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight, input]);

  useEffect(() => {
    updateChatInputHeight();
    const observer = new ResizeObserver(() => updateChatInputHeight());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', updateChatInputHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateChatInputHeight);
    };
  }, [updateChatInputHeight]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setInput(newValue);
      persistDraft(newValue);
    },
    [persistDraft]
  );

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      if (!hasInput || isInputDisabled) return;

      if (isStreaming) {
        stopStreaming();
        return;
      }

      onSend(input);
      setInput('');
      clearDraft();
    },
    [clearDraft, hasInput, input, isInputDisabled, isStreaming, onSend, stopStreaming]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const searchToggleLabel = useMemo(
    () => (searchEnabled ? t('input.search.disable') : t('input.search.enable')),
    [searchEnabled]
  );
  const sendActionLabel = useMemo(
    () => (isStreaming ? t('input.stop') : t('input.send')),
    [isStreaming]
  );

  const handleSendClick = useCallback(() => {
    if (isStreaming) {
      stopStreaming();
      return;
    }
    handleSubmit();
  }, [handleSubmit, isStreaming, stopStreaming]);

  return (
    <div
      ref={containerRef}
      className={`mx-auto w-full max-w-[min(64rem,100%)] px-4 pb-6 ${containerClassName ?? ''}`}
    >
      <div className="relative flex items-center gap-1.5 bg-[var(--bg-2)] border border-[var(--line-1)] rounded-xl px-2 py-1.5">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-[var(--ink-1)] placeholder:text-[var(--ink-3)] text-sm leading-6 px-3 py-2 max-h-[150px] resize-none focus:outline-none scrollbar-hide"
          rows={1}
          disabled={isInputDisabled}
        />
        <div className="flex shrink-0 items-center gap-1 pr-0.5">
          <button
            type="button"
            onClick={onToggleSearch}
            disabled={!searchAvailable || isInputDisabled}
            aria-pressed={searchEnabled}
            aria-label={searchToggleLabel}
            title={searchToggleLabel}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-160 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-interactive)] ${
              searchEnabled
                ? 'text-[var(--action-interactive)]'
                : 'text-[var(--ink-3)] hover:text-[var(--action-interactive)]'
            } ${searchAvailable && !isInputDisabled ? '' : 'opacity-50 cursor-not-allowed'}`}
          >
            <PublicIcon sx={{ fontSize: 18 }} />
          </button>
          <button
            type="button"
            onClick={handleSendClick}
            disabled={(!hasInput && !isStreaming) || isInputDisabled}
            aria-label={sendActionLabel}
            title={sendActionLabel}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-160 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-interactive)] ${
              hasInput || isStreaming
                ? 'text-[var(--action-interactive)] hover:text-[var(--action-interactive)]'
                : 'text-[var(--ink-3)]'
            } ${
              (!hasInput && !isStreaming) || isInputDisabled
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {isStreaming ? (
              <StopCircleOutlinedIcon sx={{ fontSize: 18 }} />
            ) : (
              <SendRoundedIcon sx={{ fontSize: 18 }} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatInput = memo(ChatInputComponent);
export default ChatInput;
