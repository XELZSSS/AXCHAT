import { Dispatch, SetStateAction, useCallback } from 'react';
import { ChatService } from '../../../services/chatService';
import { ProviderId } from '../../../types';
import { ProviderSettingsMap, SaveSettingsPayload } from '../../../services/settingsTypes';
import { Language, setLanguage, t } from '../../../utils/i18n';

type UseAppSettingsOptions = {
  chatService: ChatService;
  providerSettings: ProviderSettingsMap;
  currentProviderId: ProviderId;
  syncProviderState: () => void;
  setLanguageState: Dispatch<SetStateAction<Language>>;
  syncCurrentConversation: () => void;
};

export const useAppSettings = ({
  chatService,
  providerSettings,
  currentProviderId,
  syncProviderState,
  setLanguageState,
  syncCurrentConversation,
}: UseAppSettingsOptions) => {
  const syncTrayLabels = useCallback((language: Language) => {
    window.axchat?.setTrayLanguage?.(language);
    window.axchat?.setTrayLabels?.({
      open: t('tray.open'),
      hide: t('tray.hide'),
      toggleDevTools: t('tray.toggleDevTools'),
      quit: t('tray.quit'),
    });
  }, []);

  const handleSaveSettings = useCallback(
    (value: SaveSettingsPayload) => {
      const prev = providerSettings[value.providerId];
      const updatedSettings = chatService.updateProviderSettings(value.providerId, {
        apiKey: value.apiKey,
        modelName: value.modelName,
        baseUrl: value.baseUrl,
        customHeaders: value.customHeaders,
        tavily: value.tavily,
        embedding: value.embedding,
      });
      const shouldSyncConversation =
        value.providerId !== currentProviderId ||
        !prev ||
        prev.modelName !== updatedSettings.modelName ||
        (prev.apiKey ?? '') !== (updatedSettings.apiKey ?? '') ||
        (prev.baseUrl ?? '') !== (updatedSettings.baseUrl ?? '') ||
        JSON.stringify(prev.customHeaders ?? []) !==
          JSON.stringify(updatedSettings.customHeaders ?? []) ||
        JSON.stringify(prev.tavily ?? {}) !== JSON.stringify(updatedSettings.tavily ?? {}) ||
        JSON.stringify(prev.embedding ?? {}) !== JSON.stringify(updatedSettings.embedding ?? {});

      if (shouldSyncConversation) {
        chatService.setProvider(value.providerId);
        syncCurrentConversation();
      } else if (value.providerId !== currentProviderId) {
        chatService.setProvider(value.providerId);
      }

      syncProviderState();
      void window.axchat?.setProxyStaticHttp2?.(value.staticProxyHttp2Enabled);
      void window.axchat?.setProxyAllowHttpTargets?.(value.allowHttpTargets);
    },
    [chatService, currentProviderId, providerSettings, syncCurrentConversation, syncProviderState]
  );

  const handleLanguageChange = useCallback(
    (nextLanguage: Language) => {
      setLanguage(nextLanguage);
      setLanguageState(nextLanguage);
      syncTrayLabels(nextLanguage);
    },
    [setLanguageState, syncTrayLabels]
  );

  return {
    syncTrayLabels,
    handleSaveSettings,
    handleLanguageChange,
  };
};
