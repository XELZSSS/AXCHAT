import { memo, useMemo } from 'react';
import type { RefObject } from 'react';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import WelcomeScreen from './WelcomeScreen';
import { ChatMessage, Role } from '../types';
import { t } from '../utils/i18n';
import { KeyboardArrowDownIcon } from './icons';

type ChatMainProps = {
  messages: ChatMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  messagesContentRef: RefObject<HTMLDivElement>;
  messagesContainerRef: RefObject<HTMLDivElement>;
  messagesEndRef: RefObject<HTMLDivElement>;
  showScrollToBottom: boolean;
  onJumpToBottom: () => void;
  onSendMessage: (text: string) => void;
  onStopStreaming: () => void;
  searchEnabled: boolean;
  searchAvailable: boolean;
  onToggleSearch: () => void;
};

const ChatMainComponent = ({
  messages,
  isStreaming,
  isLoading,
  messagesContentRef,
  messagesContainerRef,
  messagesEndRef,
  showScrollToBottom,
  onJumpToBottom,
  onSendMessage,
  onStopStreaming,
  searchEnabled,
  searchAvailable,
  onToggleSearch,
}: ChatMainProps) => {
  const chatInputProps = useMemo(
    () => ({
      onSend: onSendMessage,
      disabled: isLoading,
      isStreaming,
      onStop: onStopStreaming,
      searchEnabled,
      searchAvailable,
      onToggleSearch,
    }),
    [
      isLoading,
      isStreaming,
      onSendMessage,
      onStopStreaming,
      onToggleSearch,
      searchAvailable,
      searchEnabled,
    ]
  );

  const hasMessages = messages.length > 0;
  const welcomeInput = (
    <ChatInput {...chatInputProps} containerClassName="px-0 pb-0 max-w-[min(80rem,100%)]" />
  );

  return (
    <main className="chat-main flex-1 flex flex-col h-full relative bg-transparent pt-0">
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pt-0"
        style={{ scrollPaddingBottom: 'calc(var(--chat-input-height, 120px) + 8px)' }}
      >
        <div
          ref={messagesContentRef}
          className="mx-auto w-full max-w-[min(64rem,100%)] px-4 py-6 min-h-full flex flex-col"
          style={{ paddingBottom: 'calc(var(--chat-input-height, 120px) + 8px)' }}
        >
          {!hasMessages ? (
            <WelcomeScreen input={welcomeInput} />
          ) : (
            <>
              {messages.map((msg, index) => (
                <div key={msg.id}>
                  <ChatBubble
                    message={msg}
                    isStreaming={isStreaming && index === messages.length - 1 && msg.role === Role.Model}
                  />
                </div>
              ))}
              {isStreaming && <div className="flex justify-start mb-6"></div>}
              <div ref={messagesEndRef} className="h-4" />
            </>
          )}
        </div>
      </div>

      {hasMessages && showScrollToBottom && (
        <div
          className="absolute left-0 right-0 z-20 pointer-events-none"
          style={{ bottom: 'calc(var(--chat-input-height, 120px) + 16px)' }}
        >
          <div className="mx-auto flex w-full max-w-[min(64rem,100%)] justify-end px-4">
            <button
              type="button"
              onClick={onJumpToBottom}
              className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line-1)] bg-[var(--bg-2)] text-[var(--ink-2)] transition-colors duration-160 ease-out hover:text-[var(--action-interactive)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-interactive)]"
              aria-label={t('chat.scrollToBottom')}
              title={t('chat.scrollToBottom')}
            >
              <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
            </button>
          </div>
        </div>
      )}
      {hasMessages && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <ChatInput {...chatInputProps} />
        </div>
      )}
    </main>
  );
};

const ChatMain = memo(ChatMainComponent);
export default ChatMain;
