import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GeminiEmbeddingConfig, ProviderId, TavilyConfig } from '../../types';
import { ActiveSettingsTab, SettingsModalState } from './reducer';
import { resolveBaseUrlForRegion } from './constants';
import { useSettingsForm } from './useSettingsForm';
import { ProviderSettingsMap, SaveSettingsPayload } from './types';
import {
  buildSettingsSavePayload,
  normalizeToolCallRounds,
  persistProxyAllowHttpTargets,
  persistProxyStaticHttp2Enabled,
  persistToolCallRounds,
} from './controllerHelpers';

type UseSettingsControllerOptions = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: SaveSettingsPayload) => void;
  providerSettings: ProviderSettingsMap;
} & Omit<Parameters<typeof useSettingsForm>[0], 'isOpen'>;

export const useSettingsController = ({
  isOpen,
  onClose,
  onSave,
  providerId: currentProviderId,
  modelName: currentModelName,
  ...formOptions
}: UseSettingsControllerOptions) => {
  const { state, dispatch, providerOptions, activeMeta, tabs, handleProviderChange } =
    useSettingsForm({
      isOpen,
      providerId: currentProviderId,
      modelName: currentModelName,
      ...formOptions,
    });

  const patchState = useCallback(
    (payload: Partial<SettingsModalState>) => dispatch({ type: 'patch', payload }),
    [dispatch]
  );

  const setField = useCallback(
    <K extends keyof SettingsModalState>(key: K, value: SettingsModalState[K]) => {
      patchState({ [key]: value } as Pick<SettingsModalState, K>);
    },
    [patchState]
  );

  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const overlayRef = useCallback((node: HTMLDivElement | null) => {
    setPortalContainer(node);
  }, []);

  const lastSyncedProviderIdRef = useRef<ProviderId | null>(null);

  useEffect(() => {
    if (!isOpen) {
      lastSyncedProviderIdRef.current = null;
      return;
    }
    if (state.providerId !== currentProviderId) return;
    if (lastSyncedProviderIdRef.current === currentProviderId) return;

    const nextModelName = currentModelName?.trim() ?? '';
    if (state.modelName.trim().length === 0 && nextModelName) {
      setField('modelName', nextModelName);
    }
    lastSyncedProviderIdRef.current = currentProviderId;
  }, [currentModelName, currentProviderId, isOpen, setField, state.modelName, state.providerId]);

  const handleSave = useCallback(() => {
    persistToolCallRounds(state.toolCallMaxRounds);
    persistProxyStaticHttp2Enabled(state.staticProxyHttp2Enabled);
    persistProxyAllowHttpTargets(state.allowHttpTargets);

    onSave(buildSettingsSavePayload(state));
    onClose();
  }, [onClose, onSave, state]);

  const providerActions = useMemo(
    () => ({
      onProviderChange: handleProviderChange,
      onModelNameChange: (value: string) => setField('modelName', value),
      onApiKeyChange: (value: string) => setField('apiKey', value),
      onToggleApiKeyVisibility: () => setField('showApiKey', !state.showApiKey),
      onClearApiKey: () => setField('apiKey', ''),
      onToolCallMaxRoundsChange: (value: string) => setField('toolCallMaxRounds', value),
      onToolCallMaxRoundsBlur: () =>
        setField('toolCallMaxRounds', normalizeToolCallRounds(state.toolCallMaxRounds)),
      onBaseUrlChange: (value: string) => setField('baseUrl', value),
      onSetEmbeddingField: (
        key: keyof GeminiEmbeddingConfig,
        value: GeminiEmbeddingConfig[keyof GeminiEmbeddingConfig]
      ) =>
        dispatch({
          type: 'set_embedding',
          payload: { key, value },
        }),
      onAddCustomHeader: () => dispatch({ type: 'add_custom_header' }),
      onSetCustomHeaderKey: (index: number, value: string) =>
        dispatch({ type: 'set_custom_header_key', payload: { index, value } }),
      onSetCustomHeaderValue: (index: number, value: string) =>
        dispatch({ type: 'set_custom_header_value', payload: { index, value } }),
      onRemoveCustomHeader: (index: number) =>
        dispatch({ type: 'remove_custom_header', payload: { index } }),
      onSetRegionBaseUrl: (region: 'intl' | 'cn') =>
        setField('baseUrl', resolveBaseUrlForRegion(state.providerId, region)),
    }),
    [
      dispatch,
      handleProviderChange,
      setField,
      state.showApiKey,
      state.toolCallMaxRounds,
      state.providerId,
    ]
  );

  const searchActions = useMemo(
    () => ({
      onSetTavilyField: (key: keyof TavilyConfig, value: TavilyConfig[keyof TavilyConfig]) =>
        dispatch({
          type: 'set_tavily',
          payload: { key, value },
        }),
      onToggleTavilyKeyVisibility: () => setField('showTavilyKey', !state.showTavilyKey),
    }),
    [dispatch, setField, state.showTavilyKey]
  );

  const handleTabChange = useCallback(
    (id: ActiveSettingsTab) => setField('activeTab', id),
    [setField]
  );

  const versionActions = useMemo(
    () => ({
      onSetStaticProxyHttp2Enabled: (enabled: boolean) =>
        setField('staticProxyHttp2Enabled', enabled),
      onSetAllowHttpTargets: (enabled: boolean) => setField('allowHttpTargets', enabled),
    }),
    [setField]
  );

  return {
    state,
    tabs,
    overlayRef,
    portalContainer,
    providerOptions,
    activeMeta,
    handleSave,
    onTabChange: handleTabChange,
    providerActions,
    searchActions,
    versionActions,
  };
};
