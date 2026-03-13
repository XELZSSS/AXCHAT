import { useCallback, useEffect, useRef, useState } from 'react';
import type { UpdaterStatus } from '../../../services/updaterClient';
import { ChatMessage } from '../../../types';
import { chatService } from '../../../services/chatService';
import { t, getLanguage, Language } from '../../../utils/i18n';
import { useChatSessions } from '../../session/hooks/useChatSessions';
import { useStreamingMessages } from '../../chat/hooks/useStreamingMessages';
import { useSearchToggle } from '../../search/hooks/useSearchToggle';
import {
  cleanupLegacyAppStorage,
  readAppStorage,
  writeAppStorage,
} from '../../../services/storageKeys';
import { useAppSettings } from '../../settings/hooks/useAppSettings';
import { Theme, getTheme, setTheme as persistTheme } from '../../../utils/theme';
import {
  useBootstrapReadyNotification,
  useDocumentAppearance,
  useElectronBodyClass,
  useUpdaterDownloadPrompt,
} from './appControllerEffects';
import {
  DEFAULT_UPDATER_STATUS,
  getUpdaterStatus,
  subscribeUpdaterStatus,
} from '../../../services/updaterClient';
import {
  useChatMainProps,
  useSettingsModalProps,
  useSidebarProps,
} from './appControllerViewModels';

export const useAppController = () => {
  const initialProviderId = chatService.getProviderId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [providerState, setProviderState] = useState(() => ({
    providerSettings: chatService.getAllProviderSettings(),
    currentProviderId: initialProviderId,
  }));
  const [language, setLanguageState] = useState<Language>(() => getLanguage());
  const [theme, setThemeState] = useState<Theme>(() => getTheme());
  const [appVersion, setAppVersion] = useState<string>(() => readAppStorage('appVersion') ?? '');
  const [updaterStatus, setUpdaterStatus] = useState<UpdaterStatus>(() => {
    const cached = readAppStorage('updaterStatus');
    if (!cached) return DEFAULT_UPDATER_STATUS;
    try {
      const parsed = JSON.parse(cached) as UpdaterStatus;
      return parsed.status ? parsed : DEFAULT_UPDATER_STATUS;
    } catch {
      return DEFAULT_UPDATER_STATUS;
    }
  });

  const syncProviderState = useCallback(() => {
    setProviderState({
      providerSettings: chatService.getAllProviderSettings(),
      currentProviderId: chatService.getProviderId(),
    });
  }, []);

  const { providerSettings, currentProviderId } = providerState;
  const currentProviderSettings = providerSettings[currentProviderId];
  const currentModelName = currentProviderSettings?.modelName ?? chatService.getModelName();
  const currentApiKey = currentProviderSettings?.apiKey ?? '';
  const defaultSessionTitle = t('sidebar.newChat');
  const tavilyAvailable = Boolean(providerSettings[currentProviderId]?.tavily?.apiKey);

  useEffect(() => {
    cleanupLegacyAppStorage();
  }, []);

  useEffect(() => {
    let active = true;
    const loadUpdaterStatus = async () => {
      const status = await getUpdaterStatus();
      if (!active) return;
      setUpdaterStatus(status);
      writeAppStorage('updaterStatus', JSON.stringify(status));
    };
    const loadAppVersion = async () => {
      const version = await window.axchat?.getAppVersion?.();
      if (!active || !version) return;
      setAppVersion(version);
      writeAppStorage('appVersion', version);
    };

    void loadUpdaterStatus();
    void loadAppVersion();
    const unsubscribe = subscribeUpdaterStatus((status) => {
      if (!active) return;
      setUpdaterStatus(status);
      writeAppStorage('updaterStatus', JSON.stringify(status));
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useElectronBodyClass();
  useUpdaterDownloadPrompt();
  useDocumentAppearance(language, theme);

  const commitCurrentSessionNowRef = useRef<(() => void) | null>(null);
  const commitCurrentSessionNow = useCallback(() => {
    commitCurrentSessionNowRef.current?.();
  }, []);

  const streaming = useStreamingMessages({
    chatService,
    messages,
    setMessages,
    commitCurrentSessionNow,
  });

  const chatSessions = useChatSessions({
    chatService,
    messages,
    setMessages,
    defaultSessionTitle,
    syncProviderState,
    isStreaming: streaming.isStreaming,
    isLoading: streaming.isLoading,
  });

  const { startNewChat, isSessionStateReady, commitCurrentSession } = chatSessions;

  useBootstrapReadyNotification(isSessionStateReady);

  useEffect(() => {
    commitCurrentSessionNowRef.current = () => commitCurrentSession({ force: true });
  }, [commitCurrentSession]);

  const { searchEnabled, setSearchEnabled } = useSearchToggle({
    chatService,
    tavilyAvailable,
    currentProviderId,
  });

  const handleNewChatClick = useCallback(() => {
    if (streaming.isStreaming || streaming.isLoading) return;
    startNewChat();
  }, [startNewChat, streaming.isLoading, streaming.isStreaming]);

  const handleToggleSearch = useCallback(() => {
    setSearchEnabled((prev) => !prev);
  }, [setSearchEnabled]);

  const handleThemeToggle = useCallback(() => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    persistTheme(nextTheme);
    setThemeState(nextTheme);
  }, [theme]);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const syncCurrentConversation = useCallback(() => {
    void chatService.startChatWithHistory(messages).catch((error) => {
      console.error('Failed to sync current conversation after settings change:', error);
    });
  }, [messages]);

  const { syncTrayLabels, handleSaveSettings, handleLanguageChange } = useAppSettings({
    chatService,
    providerSettings,
    currentProviderId,
    syncProviderState,
    setLanguageState,
    syncCurrentConversation,
  });

  useEffect(() => {
    syncTrayLabels(language);
  }, [language, syncTrayLabels]);

  const settingsModalProps = useSettingsModalProps({
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
  });

  const sidebarProps = useSidebarProps({
    chatSessions,
    language,
    theme,
    handleNewChatClick,
    handleThemeToggle,
    handleLanguageChange,
    handleOpenSettings,
  });

  const chatMainProps = useChatMainProps({
    messages,
    streaming,
    searchEnabled,
    tavilyAvailable,
    handleToggleSearch,
  });

  return {
    settingsModalProps,
    sidebarProps,
    chatMainProps,
  };
};
