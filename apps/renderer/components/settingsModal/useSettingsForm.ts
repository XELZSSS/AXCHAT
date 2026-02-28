import { useEffect, useMemo, useReducer } from 'react';
import { getProviderDefaultModel, listProviderIds } from '../../services/providers/registry';
import { DEFAULT_MAX_TOOL_CALL_ROUNDS } from '../../services/providers/utils';
import { ProviderId, TavilyConfig } from '../../types';
import { t } from '../../utils/i18n';
import { providerMeta, resolveBaseUrlForProvider } from './constants';
import { ActiveSettingsTab, settingsModalReducer, SettingsModalState } from './reducer';
import { ProviderSettingsMap } from './types';
import { readAppStorage, writeAppStorage } from '../../services/storageKeys';

const getStoredToolRounds = () => {
  if (typeof window === 'undefined') return String(DEFAULT_MAX_TOOL_CALL_ROUNDS);
  return readAppStorage('toolCallMaxRounds') ?? String(DEFAULT_MAX_TOOL_CALL_ROUNDS);
};

const getStoredActiveTab = (): ActiveSettingsTab => {
  if (typeof window === 'undefined') return 'provider';
  const stored = readAppStorage('settingsActiveTab');
  if (stored === 'provider' || stored === 'search' || stored === 'shortcuts') return stored;
  return 'provider';
};

type BuildStateInput = {
  providerId: ProviderId;
  modelName: string;
  apiKey: string;
  baseUrl?: string;
  customHeaders?: Array<{ key: string; value: string }>;
  tavily?: TavilyConfig;
};

const buildStateFromInput = (input: BuildStateInput): SettingsModalState => ({
  providerId: input.providerId,
  modelName: input.modelName,
  apiKey: input.apiKey,
  baseUrl: resolveBaseUrlForProvider(input.providerId, input.baseUrl),
  customHeaders: input.customHeaders ?? [],
  tavily: input.tavily ?? {},
  showApiKey: false,
  showTavilyKey: false,
  toolCallMaxRounds: getStoredToolRounds(),
  activeTab: getStoredActiveTab(),
});

type UseSettingsFormOptions = BuildStateInput & {
  isOpen: boolean;
  providerSettings: ProviderSettingsMap;
};

export const useSettingsForm = ({
  isOpen,
  providerSettings,
  providerId,
  modelName,
  apiKey,
  baseUrl,
  customHeaders,
  tavily,
}: UseSettingsFormOptions) => {
  const stateSeed = useMemo(
    () =>
      buildStateFromInput({
        providerId,
        modelName,
        apiKey,
        baseUrl,
        customHeaders: customHeaders ?? [],
        tavily: tavily ?? {},
      }),
    [providerId, modelName, apiKey, baseUrl, customHeaders, tavily]
  );

  const [state, dispatch] = useReducer(settingsModalReducer, stateSeed);

  useEffect(() => {
    if (!isOpen) return;
    dispatch({ type: 'replace', payload: stateSeed });
  }, [isOpen, stateSeed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    writeAppStorage('settingsActiveTab', state.activeTab);
  }, [state.activeTab]);

  const providerOptions = useMemo(
    () =>
      listProviderIds().map((id) => ({
        value: id,
        label: providerMeta[id]?.label ?? id.charAt(0).toUpperCase() + id.slice(1),
      })),
    []
  );

  const activeMeta = providerMeta[state.providerId];
  const providerTabLabel = t('settings.modal.tab.model');
  const searchTabLabel = t('settings.modal.tab.search');
  const shortcutsTabLabel = t('settings.modal.tab.shortcuts');
  const tabs = useMemo(
    () =>
      [
        { id: 'provider' as const, label: providerTabLabel, visible: true },
        {
          id: 'search' as const,
          label: searchTabLabel,
          visible: !!activeMeta?.supportsTavily,
        },
        {
          id: 'shortcuts' as const,
          label: shortcutsTabLabel,
          visible: true,
        },
      ].filter((tab) => tab.visible),
    [activeMeta, providerTabLabel, searchTabLabel, shortcutsTabLabel]
  );

  useEffect(() => {
    if (tabs.some((tab) => tab.id === state.activeTab)) return;
    dispatch({ type: 'patch', payload: { activeTab: 'provider' } });
  }, [state.activeTab, tabs]);

  const handleProviderChange = (nextProviderId: ProviderId) => {
    const nextSettings = providerSettings[nextProviderId];
    dispatch({
      type: 'patch',
      payload: {
        providerId: nextProviderId,
        modelName: nextSettings?.modelName ?? getProviderDefaultModel(nextProviderId),
        apiKey: nextSettings?.apiKey ?? '',
        baseUrl: resolveBaseUrlForProvider(nextProviderId, nextSettings?.baseUrl),
        customHeaders: nextSettings?.customHeaders ?? [],
        tavily: nextSettings?.tavily ?? {},
      },
    });
  };

  return {
    state,
    dispatch,
    providerOptions,
    activeMeta,
    tabs,
    handleProviderChange,
  };
};
