import { useEffect, useLayoutEffect, useMemo, useReducer } from 'react';
import { listProviderIds } from '../../services/providers/registry';
import { DEFAULT_MAX_TOOL_CALL_ROUNDS } from '../../services/providers/utils';
import { GeminiEmbeddingConfig, ProviderId, TavilyConfig } from '../../types';
import { t } from '../../utils/i18n';
import { providerMeta, resolveBaseUrlForProvider } from './constants';
import { ActiveSettingsTab, settingsModalReducer, SettingsModalState } from './reducer';
import { ProviderSettingsMap } from './types';
import { readAppStorage } from '../../services/storageKeys';

const readStoredString = (key: Parameters<typeof readAppStorage>[0]): string | null => {
  if (typeof window === 'undefined') return null;
  return readAppStorage(key);
};

const getStoredToolRounds = () => {
  return readStoredString('toolCallMaxRounds') ?? String(DEFAULT_MAX_TOOL_CALL_ROUNDS);
};

const getStoredProxyStaticHttp2 = (): boolean => {
  const stored = (readStoredString('proxyStaticHttp2') ?? '').trim().toLowerCase();
  return stored === '1' || stored === 'true' || stored === 'yes' || stored === 'on';
};

const getStoredProxyAllowHttpTargets = (): boolean => {
  const stored = (readStoredString('proxyAllowHttpTargets') ?? '').trim().toLowerCase();
  return stored === '1' || stored === 'true' || stored === 'yes' || stored === 'on';
};

type BuildStateInput = {
  providerId: ProviderId;
  modelName: string;
  apiKey: string;
  baseUrl?: string;
  customHeaders?: Array<{ key: string; value: string }>;
  tavily?: TavilyConfig;
  embedding?: GeminiEmbeddingConfig;
};

const buildStateFromInput = (input: BuildStateInput): SettingsModalState => {
  const resolvedBaseUrl = resolveBaseUrlForProvider(input.providerId, input.baseUrl);

  return {
    providerId: input.providerId,
    modelName: input.modelName,
    apiKey: input.apiKey,
    baseUrl: resolvedBaseUrl,
    customHeaders: input.customHeaders ?? [],
    tavily: input.tavily ?? {},
    embedding: input.embedding ?? {},
    showApiKey: false,
    showTavilyKey: false,
    staticProxyHttp2Enabled: getStoredProxyStaticHttp2(),
    allowHttpTargets: getStoredProxyAllowHttpTargets(),
    toolCallMaxRounds: getStoredToolRounds(),
    activeTab: 'provider',
  };
};

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
  embedding,
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
        embedding: embedding ?? {},
      }),
    [providerId, modelName, apiKey, baseUrl, customHeaders, tavily, embedding]
  );

  const [state, dispatch] = useReducer(settingsModalReducer, stateSeed);

  useLayoutEffect(() => {
    if (!isOpen) return;
    dispatch({ type: 'replace', payload: stateSeed });
  }, [isOpen, stateSeed]);

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
  const versionTabLabel = t('settings.modal.tab.version');
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
          id: 'version' as const,
          label: versionTabLabel,
          visible: true,
        },
        {
          id: 'shortcuts' as const,
          label: shortcutsTabLabel,
          visible: true,
        },
      ].filter((tab) => tab.visible),
    [activeMeta, providerTabLabel, searchTabLabel, shortcutsTabLabel, versionTabLabel]
  );

  useEffect(() => {
    if (tabs.some((tab) => tab.id === state.activeTab)) return;
    dispatch({ type: 'patch', payload: { activeTab: 'provider' } });
  }, [state.activeTab, tabs]);

  const handleProviderChange = (nextProviderId: ProviderId) => {
    const nextSettings = providerSettings[nextProviderId];
    const nextBaseUrl = resolveBaseUrlForProvider(nextProviderId, nextSettings?.baseUrl);

    dispatch({
      type: 'patch',
      payload: {
        providerId: nextProviderId,
        modelName: nextSettings?.modelName ?? '',
        apiKey: nextSettings?.apiKey ?? '',
        baseUrl: nextBaseUrl,
        customHeaders: nextSettings?.customHeaders ?? [],
        tavily: nextSettings?.tavily ?? {},
        embedding: nextSettings?.embedding ?? {},
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
