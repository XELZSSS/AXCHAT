import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const ChatInputComponent: React.FC<ChatInputProps> = ({
  onSend,
  disabled,
  isStreaming,
  onStop,
  containerClassName,
  searchEnabled,
  searchAvailable,
  onToggleSearch,
}) => {
  const [input, setInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftSaveTimerRef = useRef<number | null>(null);
  const lastHeightRef = useRef<number | null>(null);
  const isInputDisabled = disabled && !isStreaming;

  const clearDraftTimer = useCallback(() => {
    if (draftSaveTimerRef.current !== null) {
      window.clearTimeout(draftSaveTimerRef.current);
      draftSaveTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const savedDraft = readAppStorage('inputDraft');
    if (savedDraft) {
      setInput(savedDraft);
    }
  }, []);

  useEffect(() => {
    return () => clearDraftTimer();
  }, []);

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
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setInput(newValue);
      clearDraftTimer();
      draftSaveTimerRef.current = window.setTimeout(() => {
        writeAppStorage('inputDraft', newValue);
        clearDraftTimer();
      }, 350);
    },
    [clearDraftTimer]
  );

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!input.trim() || isInputDisabled) return;

      if (isStreaming) {
        onStop();
        return;
      }

      onSend(input);
      setInput('');
      clearDraftTimer();
      removeAppStorage('inputDraft');
    },
    [clearDraftTimer, input, isInputDisabled, isStreaming, onSend, onStop]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      onStop();
      return;
    }
    handleSubmit();
  }, [handleSubmit, isStreaming, onStop]);

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
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-160 ease-out ${
              searchEnabled ? 'text-[#3b82f6]' : 'text-[var(--ink-3)] hover:text-[#3b82f6]'
            } ${searchAvailable && !isInputDisabled ? '' : 'opacity-50 cursor-not-allowed'}`}
          >
            <PublicIcon sx={{ fontSize: 18 }} />
          </button>
          <button
            type="button"
            onClick={handleSendClick}
            disabled={(!input.trim() && !isStreaming) || isInputDisabled}
            aria-label={sendActionLabel}
            title={sendActionLabel}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-160 ease-out ${
              input.trim() || isStreaming
                ? 'text-[#3b82f6] hover:text-[#2563eb]'
                : 'text-[var(--ink-3)]'
            } ${
              (!input.trim() && !isStreaming) || isInputDisabled
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

const ChatInput = React.memo(ChatInputComponent);
export default ChatInput;
