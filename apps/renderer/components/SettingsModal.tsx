import React, { useEffect, useId, useState } from 'react';
import { Save, X } from 'lucide-react';
import { ProviderId, TavilyConfig } from '../types';
import { t } from '../utils/i18n';
import ProviderTab from './settingsModal/ProviderTab';
import SearchTab from './settingsModal/SearchTab';
import ShortcutsTab from './settingsModal/ShortcutsTab';
import { useSettingsController } from './settingsModal/useSettingsController';
import { ProviderSettingsMap, SaveSettingsPayload } from './settingsModal/types';
import { Button, Modal, Tabs } from './ui';

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
}

type UpdaterStatus = {
  status: 'idle' | 'disabled' | 'checking' | 'available' | 'not-available' | 'error';
  message: string;
  version: string;
  availableVersion: string;
  progress: number;
  error: string;
  downloadUrl?: string;
};

const DEFAULT_UPDATER_STATUS: UpdaterStatus = {
  status: 'idle',
  message: '',
  version: '',
  availableVersion: '',
  progress: 0,
  error: '',
  downloadUrl: '',
};

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
}) => {
  const modalTitleId = useId();
  const tabsIdPrefix = useId();
  const [appVersion, setAppVersion] = useState<string>('');
  const [updaterStatus, setUpdaterStatus] = useState<UpdaterStatus>(DEFAULT_UPDATER_STATUS);

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

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const loadVersion = async () => {
      const version = await window.gero?.getAppVersion?.();
      if (active && version) {
        setAppVersion(version);
      }
    };
    const loadUpdaterStatus = async () => {
      const status = await window.gero?.getUpdaterStatus?.();
      if (active && status) {
        setUpdaterStatus(status);
      }
    };
    void loadVersion();
    void loadUpdaterStatus();
    const unsubscribe = window.gero?.onUpdaterStatus?.((status) => {
      if (!active) return;
      setUpdaterStatus(status);
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [isOpen]);

  const handleCheckForUpdates = async () => {
    await window.gero?.checkForUpdates?.();
  };

  const handleOpenUpdateDownload = async () => {
    await window.gero?.quitAndInstallUpdate?.();
  };

  const getUpdateStatusText = (): string => {
    if (updaterStatus.status === 'checking') return '正在检查更新...';
    if (updaterStatus.status === 'available') {
      return updaterStatus.availableVersion
        ? `发现新版本 v${updaterStatus.availableVersion}，可下载安装包`
        : '发现新版本，可下载安装包';
    }
    if (updaterStatus.status === 'not-available') return '已是最新版本';
    if (updaterStatus.status === 'error') return '更新失败，请重试';
    if (updaterStatus.status === 'disabled') return '开发模式下不启用自动更新';
    return '';
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      className="max-w-2xl"
      overlayRef={overlayRef}
      onClose={onClose}
      ariaLabelledBy={modalTitleId}
    >
      <div className="w-full">
        <div className="flex items-center justify-between p-3 pb-1.5">
          <h2 id={modalTitleId} className="text-sm font-semibold text-[var(--ink-1)]">
            {t('settings.modal.title')}
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="!px-1.5 !py-1 !bg-transparent hover:!bg-transparent text-[var(--ink-3)] hover:text-[var(--ink-1)]"
            aria-label={t('settings.modal.cancel')}
          >
            <X size={18} />
          </Button>
        </div>

        <div className="flex h-[72vh] flex-col gap-4 overflow-hidden p-4 sm:flex-row">
          <Tabs
            items={tabs}
            activeId={state.activeTab}
            onChange={onTabChange}
            idPrefix={tabsIdPrefix}
          />

          <div
            className="flex-1 overflow-y-auto pl-2 pr-4 pt-2 sm:pl-4 sm:pr-6 sm:pt-3"
            role="tabpanel"
            id={`${tabsIdPrefix}-panel-${state.activeTab}`}
            aria-labelledby={`${tabsIdPrefix}-tab-${state.activeTab}`}
          >
            {state.activeTab === 'provider' && (
              <ProviderTab
                providerId={state.providerId}
                providerOptions={providerOptions}
                modelName={state.modelName}
                apiKey={state.apiKey}
                baseUrl={state.baseUrl}
                customHeaders={state.customHeaders}
                showApiKey={state.showApiKey}
                toolCallMaxRounds={state.toolCallMaxRounds}
                supportsBaseUrl={activeMeta?.supportsBaseUrl}
                supportsCustomHeaders={activeMeta?.supportsCustomHeaders}
                supportsRegion={activeMeta?.supportsRegion}
                portalContainer={portalContainer}
                onProviderChange={providerActions.onProviderChange}
                onModelNameChange={providerActions.onModelNameChange}
                onApiKeyChange={providerActions.onApiKeyChange}
                onToggleApiKeyVisibility={providerActions.onToggleApiKeyVisibility}
                onClearApiKey={providerActions.onClearApiKey}
                onToolCallMaxRoundsChange={providerActions.onToolCallMaxRoundsChange}
                onToolCallMaxRoundsBlur={providerActions.onToolCallMaxRoundsBlur}
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
                portalContainer={portalContainer}
                onSetTavilyField={searchActions.onSetTavilyField}
                onToggleTavilyKeyVisibility={searchActions.onToggleTavilyKeyVisibility}
              />
            )}

            {state.activeTab === 'shortcuts' && <ShortcutsTab />}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-3 pt-1.5">
          <div className="mr-auto text-xs text-[var(--ink-3)]">{getUpdateStatusText()}</div>
          <Button
            onClick={handleCheckForUpdates}
            variant="ghost"
            size="md"
            disabled={updaterStatus.status === 'checking'}
          >
            检查更新
          </Button>
          {updaterStatus.status === 'available' && (
            <Button onClick={handleOpenUpdateDownload} variant="ghost" size="md">
              下载更新
            </Button>
          )}
          <div className="flex h-8 items-center text-sm leading-none text-[var(--ink-3)]">
            {appVersion ? `v${appVersion}` : ''}
          </div>
          <Button onClick={onClose} variant="ghost" size="md">
            {t('settings.modal.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            variant="primary"
            size="md"
            className="flex items-center gap-2"
          >
            <Save size={14} />
            {t('settings.modal.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
