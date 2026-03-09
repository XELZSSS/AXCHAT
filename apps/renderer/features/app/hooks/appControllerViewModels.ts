import { useMemo } from 'react';
import type { ChatMessage } from '../../../types';
import type { Language } from '../../../utils/i18n';
import type { Theme } from '../../../utils/theme';
import type { ProviderSettingsMap } from '../../../services/settingsTypes';
import type { useStreamingMessages } from '../../chat/hooks/useStreamingMessages';
import type { useChatSessions } from '../../session/hooks/useChatSessions';
import type { useAppSettings } from '../../settings/hooks/useAppSettings';

type StreamingState = ReturnType<typeof useStreamingMessages>;
type ChatSessionsState = ReturnType<typeof useChatSessions>;
type AppSettingsState = ReturnType<typeof useAppSettings>;

type UseSettingsModalPropsOptions = {
  isSettingsOpen: boolean;
  providerSettings: ProviderSettingsMap;
  currentProviderId: keyof ProviderSettingsMap;
  currentModelName: string;
  currentApiKey: string;
  currentProviderSettings: ProviderSettingsMap[keyof ProviderSettingsMap] | undefined;
  handleCloseSettings: () => void;
  handleSaveSettings: AppSettingsState['handleSaveSettings'];
  appVersion: string;
  updaterStatus: import('../../../services/updaterClient').UpdaterStatus;
  secretStorageInfo: { mode: 'secure' | 'plain'; backend: string };
};

export const useSettingsModalProps = ({
  isSettingsOpen,
  providerSettings,
  currentProviderId,
  currentModelName,
  currentApiKey,
  currentProviderSettings,
  handleCloseSettings,
  handleSaveSettings,
  appVersion,
  updaterStatus,
  secretStorageInfo,
}: UseSettingsModalPropsOptions) => {
  return useMemo(
    () => ({
      isOpen: isSettingsOpen,
      onClose: handleCloseSettings,
      providerSettings,
      providerId: currentProviderId,
      modelName: currentModelName,
      apiKey: currentApiKey,
      baseUrl: currentProviderSettings?.baseUrl,
      customHeaders: currentProviderSettings?.customHeaders,
      tavily: currentProviderSettings?.tavily,
      onSave: handleSaveSettings,
      appVersion,
      updaterStatus,
      secretStorageInfo,
    }),
    [
      appVersion,
      currentApiKey,
      currentModelName,
      currentProviderId,
      currentProviderSettings,
      handleCloseSettings,
      handleSaveSettings,
      isSettingsOpen,
      providerSettings,
      secretStorageInfo,
      updaterStatus,
    ]
  );
};

type UseSidebarPropsOptions = {
  chatSessions: ChatSessionsState;
  language: Language;
  theme: Theme;
  handleNewChatClick: () => void;
  handleThemeToggle: () => void;
  handleLanguageChange: AppSettingsState['handleLanguageChange'];
  handleOpenSettings: () => void;
};

export const useSidebarProps = ({
  chatSessions,
  language,
  theme,
  handleNewChatClick,
  handleThemeToggle,
  handleLanguageChange,
  handleOpenSettings,
}: UseSidebarPropsOptions) => {
  const {
    currentSessionId,
    sessions,
    filteredSessions,
    searchQuery,
    editingSessionId,
    editTitleInput,
    setSearchQuery,
    setEditTitleInput,
    handleLoadSession,
    handleStartEdit,
    handleDeleteSession,
    handleEditInputClick,
    handleEditKeyDown,
    handleSaveEdit,
    handleCancelEdit,
  } = chatSessions;

  return useMemo(
    () => ({
      currentSessionId,
      sessions,
      filteredSessions,
      searchQuery,
      editingSessionId,
      editTitleInput,
      language,
      theme,
      onNewChatClick: handleNewChatClick,
      onSearchChange: setSearchQuery,
      onLoadSession: handleLoadSession,
      onStartEdit: handleStartEdit,
      onDeleteSession: handleDeleteSession,
      onEditTitleInputChange: setEditTitleInput,
      onEditInputClick: handleEditInputClick,
      onEditKeyDown: handleEditKeyDown,
      onSaveEdit: handleSaveEdit,
      onCancelEdit: handleCancelEdit,
      onThemeToggle: handleThemeToggle,
      onLanguageChange: handleLanguageChange,
      onOpenSettings: handleOpenSettings,
    }),
    [
      currentSessionId,
      editTitleInput,
      editingSessionId,
      filteredSessions,
      handleCancelEdit,
      handleDeleteSession,
      handleEditInputClick,
      handleEditKeyDown,
      handleLanguageChange,
      handleLoadSession,
      handleNewChatClick,
      handleOpenSettings,
      handleSaveEdit,
      handleStartEdit,
      handleThemeToggle,
      language,
      searchQuery,
      sessions,
      setEditTitleInput,
      setSearchQuery,
      theme,
    ]
  );
};

type UseChatMainPropsOptions = {
  messages: ChatMessage[];
  streaming: StreamingState;
  searchEnabled: boolean;
  tavilyAvailable: boolean;
  handleToggleSearch: () => void;
};

export const useChatMainProps = ({
  messages,
  streaming,
  searchEnabled,
  tavilyAvailable,
  handleToggleSearch,
}: UseChatMainPropsOptions) => {
  return useMemo(
    () => ({
      messages,
      isStreaming: streaming.isStreaming,
      isLoading: streaming.isLoading,
      messagesContentRef: streaming.messagesContentRef,
      messagesContainerRef: streaming.messagesContainerRef,
      messagesEndRef: streaming.messagesEndRef,
      showScrollToBottom: streaming.showScrollToBottom,
      onJumpToBottom: streaming.jumpToBottom,
      onSendMessage: streaming.handleSendMessage,
      onStopStreaming: streaming.stopStreaming,
      searchEnabled,
      searchAvailable: tavilyAvailable,
      onToggleSearch: handleToggleSearch,
    }),
    [
      handleToggleSearch,
      messages,
      searchEnabled,
      streaming.handleSendMessage,
      streaming.isLoading,
      streaming.isStreaming,
      streaming.jumpToBottom,
      streaming.messagesContainerRef,
      streaming.messagesContentRef,
      streaming.messagesEndRef,
      streaming.showScrollToBottom,
      streaming.stopStreaming,
      tavilyAvailable,
    ]
  );
};
