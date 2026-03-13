import { useCallback, useId, useState } from 'react';
import { GeminiEmbeddingConfig, ProviderId, TavilyConfig } from '../types';
import { t } from '../utils/i18n';
import ProviderTab from './settingsModal/ProviderTab';
import SearchTab from './settingsModal/SearchTab';
import VersionTab from './settingsModal/VersionTab';
import ShortcutsTab from './settingsModal/ShortcutsTab';
import { useSettingsController } from './settingsModal/useSettingsController';
import { ProviderSettingsMap, SaveSettingsPayload } from './settingsModal/types';
import { Button, Modal, Tabs } from './ui';
import { checkForUpdates, openUpdateDownload } from '../services/updaterClient';
import { CloseIcon, SaveOutlinedIcon } from './icons';

const AUTHOR_NAME = 'XELZSSS';
const AUTHOR_URL = 'https://github.com/XELZSSS';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerSettings: ProviderSettingsMap;
  providerId: ProviderId;
  modelName: string;
  apiKey: string;
  baseUrl?: string;
  customHeaders?: Array<{ key: string; value: string }>;
  tavily?: TavilyConfig;
  embedding?: GeminiEmbeddingConfig;
  onSave: (value: SaveSettingsPayload) => void;
  appVersion: string;
  updaterStatus: import('../services/updaterClient').UpdaterStatus;
}

const SettingsModal = ({
  isOpen,
  onClose,
  providerSettings,
  providerId,
  modelName,
  apiKey,
  baseUrl,
  customHeaders,
  tavily,
  embedding,
  onSave,
  appVersion,
  updaterStatus,
}: SettingsModalProps) => {
  const modalTitleId = useId();
  const tabsIdPrefix = useId();
  const updaterStatusTextMap = {
    checking: t('settings.update.status.checking'),
    'not-available': t('settings.update.status.latest'),
    error: t('settings.update.status.failed'),
    disabled: t('settings.update.status.disabled'),
  };

  const {
    state,
    tabs,
    overlayRef,
    portalContainer,
    providerOptions,
    activeMeta,
    handleSave,
    onTabChange,
    providerActions,
    searchActions,
    versionActions,
  } = useSettingsController({
    isOpen,
    onClose,
    onSave,
    providerSettings,
    providerId,
    modelName,
    apiKey,
    baseUrl,
    customHeaders,
    tavily,
    embedding,
  });

  const handleCheckForUpdates = useCallback(async () => {
    await checkForUpdates();
  }, []);

  const handleOpenUpdateDownload = useCallback(async () => {
    await openUpdateDownload();
  }, []);

  const handleOpenAuthorPage = useCallback(async () => {
    if (typeof window !== 'undefined' && window.axchat?.openExternal) {
      await window.axchat.openExternal(AUTHOR_URL);
      return;
    }
    window.open(AUTHOR_URL, '_blank', 'noopener,noreferrer');
  }, []);

  const [clearCacheNotice, setClearCacheNotice] = useState<string | null>(null);
  const [clearCacheStatus, setClearCacheStatus] = useState<'success' | 'error' | null>(null);

  const resetClearCacheNotice = useCallback(() => {
    setTimeout(() => {
      setClearCacheNotice(null);
      setClearCacheStatus(null);
    }, 2500);
  }, []);

  const handleClearCache = useCallback(async () => {
    try {
      const result = await window.axchat?.clearCache?.();
      if (result?.ok) {
        setClearCacheNotice(t('settings.clearCache.success'));
        setClearCacheStatus('success');
        resetClearCacheNotice();
      }
    } catch (error) {
      console.error('Failed to clear user data:', error);
      setClearCacheNotice(t('settings.clearCache.failed'));
      setClearCacheStatus('error');
      resetClearCacheNotice();
    }
  }, [resetClearCacheNotice]);

  const updateStatusText = (() => {
    if (updaterStatus.status === 'available') {
      return updaterStatus.availableVersion
        ? `${t('settings.update.status.availableVersionPrefix')} v${updaterStatus.availableVersion}${t('settings.update.status.availableVersionSuffix')}`
        : t('settings.update.status.available');
    }
    return updaterStatusTextMap[updaterStatus.status] ?? '';
  })();

  return (
    <Modal
      isOpen={isOpen}
      className="max-w-3xl"
      overlayRef={overlayRef}
      onClose={onClose}
      ariaLabelledBy={modalTitleId}
    >
      <div className="w-full">
        <div className="flex items-center justify-between p-3 pb-2">
          <h2 id={modalTitleId} className="text-sm font-semibold text-[var(--ink-1)]">
            {t('settings.modal.title')}
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-full !bg-transparent !p-0 text-[var(--ink-3)] hover:!bg-[var(--bg-2)] hover:text-[var(--ink-1)]"
            aria-label={t('settings.modal.cancel')}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </Button>
        </div>

        <div className="flex h-[76vh] min-h-0 flex-col gap-4 overflow-hidden p-4 sm:flex-row">
          <Tabs
            items={tabs}
            activeId={state.activeTab}
            onChange={onTabChange}
            idPrefix={tabsIdPrefix}
          />

          <div
            className="settings-modal-scroll-panel settings-modal-scrollbar-hide min-h-0 min-w-0 flex-1 overflow-y-auto pl-2 pr-4 pt-1 sm:pl-4 sm:pr-6 sm:pt-2"
            role="tabpanel"
            id={`${tabsIdPrefix}-panel-${state.activeTab}`}
            aria-labelledby={`${tabsIdPrefix}-tab-${state.activeTab}`}
          >
            {state.activeTab === 'provider' && (
              <ProviderTab
                providerId={state.providerId}
                providerOptions={providerOptions}
                modelName={state.modelName}
                currentModelName={modelName}
                apiKey={state.apiKey}
                baseUrl={state.baseUrl}
                customHeaders={state.customHeaders}
                embedding={state.embedding}
                showApiKey={state.showApiKey}
                supportsBaseUrl={activeMeta?.supportsBaseUrl}
                supportsCustomHeaders={activeMeta?.supportsCustomHeaders}
                supportsRegion={activeMeta?.supportsRegion}
                isOfficialProvider={activeMeta?.isOfficialProvider}
                portalContainer={portalContainer}
                onProviderChange={providerActions.onProviderChange}
                onModelNameChange={providerActions.onModelNameChange}
                onApiKeyChange={providerActions.onApiKeyChange}
                onToggleApiKeyVisibility={providerActions.onToggleApiKeyVisibility}
                onClearApiKey={providerActions.onClearApiKey}
                onBaseUrlChange={providerActions.onBaseUrlChange}
                onSetEmbeddingField={providerActions.onSetEmbeddingField}
                onAddCustomHeader={providerActions.onAddCustomHeader}
                onSetCustomHeaderKey={providerActions.onSetCustomHeaderKey}
                onSetCustomHeaderValue={providerActions.onSetCustomHeaderValue}
                onRemoveCustomHeader={providerActions.onRemoveCustomHeader}
                onSetRegionBaseUrl={providerActions.onSetRegionBaseUrl}
              />
            )}

            {state.activeTab === 'search' && activeMeta?.supportsTavily && (
              <SearchTab
                tavily={state.tavily}
                showTavilyKey={state.showTavilyKey}
                toolCallMaxRounds={state.toolCallMaxRounds}
                portalContainer={portalContainer}
                onSetTavilyField={searchActions.onSetTavilyField}
                onToggleTavilyKeyVisibility={searchActions.onToggleTavilyKeyVisibility}
                onToolCallMaxRoundsChange={providerActions.onToolCallMaxRoundsChange}
                onToolCallMaxRoundsBlur={providerActions.onToolCallMaxRoundsBlur}
              />
            )}

            {state.activeTab === 'version' && (
              <VersionTab
                appVersion={appVersion}
                updateStatusText={updateStatusText}
                updaterStatus={updaterStatus.status}
                staticProxyHttp2Enabled={state.staticProxyHttp2Enabled}
                allowHttpTargets={state.allowHttpTargets}
                onCheckForUpdates={handleCheckForUpdates}
                onOpenUpdateDownload={handleOpenUpdateDownload}
                onSetStaticProxyHttp2Enabled={versionActions.onSetStaticProxyHttp2Enabled}
                onSetAllowHttpTargets={versionActions.onSetAllowHttpTargets}
                onOpenClearCache={handleClearCache}
                clearCacheNotice={clearCacheNotice}
                clearCacheStatus={clearCacheStatus}
              />
            )}

            {state.activeTab === 'shortcuts' && <ShortcutsTab />}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-3 pt-2">
          <div className="mr-auto text-xs text-[var(--ink-3)]" />
          <Button
            onClick={handleOpenAuthorPage}
            variant="ghost"
            size="sm"
            className="inline-flex items-center justify-center"
          >
            {AUTHOR_NAME}
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="inline-flex items-center justify-center"
          >
            {t('settings.modal.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            variant="primary"
            size="sm"
            className="inline-flex items-center justify-center gap-2"
          >
            <SaveOutlinedIcon sx={{ fontSize: 14 }} />
            {t('settings.modal.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
