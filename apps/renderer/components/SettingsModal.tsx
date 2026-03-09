import React, { useCallback, useId, useMemo } from 'react';
import { ProviderId, TavilyConfig } from '../types';
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
  onSave: (value: SaveSettingsPayload) => void;
  appVersion: string;
  updaterStatus: import('../services/updaterClient').UpdaterStatus;
  secretStorageInfo: { mode: 'secure' | 'plain'; backend: string };
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  providerSettings,
  providerId,
  modelName,
  apiKey,
  baseUrl,
  customHeaders,
  tavily,
  onSave,
  appVersion,
  updaterStatus,
  secretStorageInfo,
}) => {
  const AUTHOR_NAME = 'XELZSSS';
  const AUTHOR_URL = 'https://github.com/XELZSSS';
  const modalTitleId = useId();
  const tabsIdPrefix = useId();
  const updaterStatusTextMap = useMemo(
    () => ({
      checking: t('settings.update.status.checking'),
      'not-available': t('settings.update.status.latest'),
      error: t('settings.update.status.failed'),
      disabled: t('settings.update.status.disabled'),
    }),
    [t]
  );

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

  const updateStatusText = useMemo((): string => {
    if (updaterStatus.status === 'available') {
      return updaterStatus.availableVersion
        ? `${t('settings.update.status.availableVersionPrefix')} v${updaterStatus.availableVersion}${t('settings.update.status.availableVersionSuffix')}`
        : t('settings.update.status.available');
    }
    return updaterStatusTextMap[updaterStatus.status] ?? '';
  }, [t, updaterStatus.availableVersion, updaterStatus.status, updaterStatusTextMap]);

  return (
    <Modal
      isOpen={isOpen}
      className="max-w-5xl"
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
            size="sm"
            className="!px-1.5 !py-1 !bg-transparent hover:!bg-[var(--bg-2)] text-[var(--ink-3)] hover:text-[var(--ink-1)]"
            aria-label={t('settings.modal.cancel')}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </Button>
        </div>

        <div className="flex h-[76vh] flex-col gap-4 overflow-hidden p-4 sm:flex-row">
          <Tabs
            items={tabs}
            activeId={state.activeTab}
            onChange={onTabChange}
            idPrefix={tabsIdPrefix}
          />

          <div
            className="settings-modal-scrollbar-hide flex-1 overflow-y-auto pl-2 pr-4 pt-1 sm:pl-4 sm:pr-6 sm:pt-2"
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
                showApiKey={state.showApiKey}
                supportsBaseUrl={activeMeta?.supportsBaseUrl}
                supportsCustomHeaders={activeMeta?.supportsCustomHeaders}
                supportsRegion={activeMeta?.supportsRegion}
                isOfficialProvider={activeMeta?.isOfficialProvider}
                secretStorageInfo={secretStorageInfo}
                portalContainer={portalContainer}
                onProviderChange={providerActions.onProviderChange}
                onModelNameChange={providerActions.onModelNameChange}
                onApiKeyChange={providerActions.onApiKeyChange}
                onToggleApiKeyVisibility={providerActions.onToggleApiKeyVisibility}
                onClearApiKey={providerActions.onClearApiKey}
                onBaseUrlChange={providerActions.onBaseUrlChange}
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
                onCheckForUpdates={handleCheckForUpdates}
                onOpenUpdateDownload={handleOpenUpdateDownload}
                onSetStaticProxyHttp2Enabled={versionActions.onSetStaticProxyHttp2Enabled}
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
