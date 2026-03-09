import React, { useCallback, useMemo } from 'react';
import { ProviderId } from '../../types';
import { t } from '../../utils/i18n';
import Dropdown, { DropdownOption } from '../settings/Dropdown';
import { fullInputClass, smInputClass, resolveBaseUrlForRegion } from './constants';
import { Button, Field, Input } from '../ui';
import { DeleteOutlineIcon, VisibilityIcon, VisibilityOffIcon } from '../icons';

type ProviderTabProps = {
  providerId: ProviderId;
  providerOptions: DropdownOption[];
  modelName: string;
  currentModelName: string;
  apiKey: string;
  baseUrl?: string;
  customHeaders: Array<{ key: string; value: string }>;
  showApiKey: boolean;
  supportsBaseUrl?: boolean;
  supportsCustomHeaders?: boolean;
  supportsRegion?: boolean;
  isOfficialProvider?: boolean;
  secretStorageInfo: {
    mode: 'secure' | 'plain';
    backend: string;
  };
  portalContainer: HTMLElement | null;
  onProviderChange: (providerId: ProviderId) => void;
  onModelNameChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onToggleApiKeyVisibility: () => void;
  onClearApiKey: () => void;
  onBaseUrlChange: (value: string) => void;
  onAddCustomHeader: () => void;
  onSetCustomHeaderKey: (index: number, value: string) => void;
  onSetCustomHeaderValue: (index: number, value: string) => void;
  onRemoveCustomHeader: (index: number) => void;
  onSetRegionBaseUrl: (region: 'intl' | 'cn') => void;
};

const ProviderTab: React.FC<ProviderTabProps> = ({
  providerId,
  providerOptions,
  modelName,
  currentModelName,
  apiKey,
  baseUrl,
  customHeaders,
  showApiKey,
  supportsBaseUrl,
  supportsCustomHeaders,
  supportsRegion,
  isOfficialProvider,
  secretStorageInfo,
  portalContainer,
  onProviderChange,
  onModelNameChange,
  onApiKeyChange,
  onToggleApiKeyVisibility,
  onClearApiKey,
  onBaseUrlChange,
  onAddCustomHeader,
  onSetCustomHeaderKey,
  onSetCustomHeaderValue,
  onRemoveCustomHeader,
  onSetRegionBaseUrl,
}) => {
  const modelLabel = useMemo(
    () => `${t('settings.modal.model.current')}: ${currentModelName || '-'}`,
    [currentModelName]
  );
  const apiKeyVisibilityLabel = useMemo(
    () => (showApiKey ? t('settings.apiKey.hide') : t('settings.apiKey.show')),
    [showApiKey]
  );

  const handleProviderChange = useCallback(
    (value: string) => onProviderChange(value as ProviderId),
    [onProviderChange]
  );
  const handleModelNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => onModelNameChange(event.target.value),
    [onModelNameChange]
  );
  const handleApiKeyChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => onApiKeyChange(event.target.value),
    [onApiKeyChange]
  );
  const handleBaseUrlChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => onBaseUrlChange(event.target.value),
    [onBaseUrlChange]
  );
  const handleRegionIntl = useCallback(() => onSetRegionBaseUrl('intl'), [onSetRegionBaseUrl]);
  const handleRegionCn = useCallback(() => onSetRegionBaseUrl('cn'), [onSetRegionBaseUrl]);

  return (
    <div className="space-y-4">
      {secretStorageInfo.mode === 'plain' ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {t('settings.secrets.warning.plain')}
        </div>
      ) : null}

      <Field label={t('settings.modal.provider')}>
        <Dropdown
          value={providerId}
          options={providerOptions}
          onChange={handleProviderChange}
          portalContainer={portalContainer}
        />
      </Field>

      <Field label={t('settings.modal.model')}>
        <div className="space-y-2">
          <div className="text-xs text-[var(--ink-3)]">{modelLabel}</div>
          <Input
            type="text"
            value={modelName}
            onChange={handleModelNameChange}
            className={smInputClass}
            compact
            autoComplete="off"
          />
        </div>
      </Field>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--ink-2)]">
          {t('settings.modal.apiKey')}
        </label>
        <div className="relative">
          <Input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={handleApiKeyChange}
            className={`${fullInputClass} pr-20`}
            autoComplete="off"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            <Button
              onClick={onToggleApiKeyVisibility}
              variant="ghost"
              size="sm"
              className="!h-6 !w-6 !min-w-0 !p-0 flex items-center justify-center"
              aria-label={apiKeyVisibilityLabel}
            >
              {showApiKey ? (
                <VisibilityOffIcon sx={{ fontSize: 16 }} />
              ) : (
                <VisibilityIcon sx={{ fontSize: 16 }} />
              )}
            </Button>
            <Button
              onClick={onClearApiKey}
              variant="ghost"
              size="sm"
              className="!h-6 !w-6 !min-w-0 !p-0 flex items-center justify-center hover:text-red-400"
              aria-label={t('settings.apiKey.clear')}
              title={t('settings.apiKey.clear')}
            >
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </Button>
          </div>
        </div>
      </div>

      {(supportsBaseUrl || supportsCustomHeaders) && (
        <div className="space-y-3">
          {supportsBaseUrl && (
            <div className="space-y-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--ink-2)]">
                  {t('settings.modal.baseUrl')}
                </label>
                <Input
                  type="text"
                  value={baseUrl ?? ''}
                  onChange={handleBaseUrlChange}
                  placeholder={t('settings.modal.baseUrl.placeholder')}
                  className={fullInputClass}
                  compact
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          {supportsCustomHeaders && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--ink-2)]">
                  {t('settings.modal.customHeaders')}
                </label>
                <Button
                  onClick={onAddCustomHeader}
                  variant="ghost"
                  size="sm"
                  className="!p-0 text-xs !bg-transparent hover:!bg-transparent"
                >
                  {t('settings.modal.customHeaders.add')}
                </Button>
              </div>

              <div className="space-y-1.5">
                {customHeaders.length === 0 && (
                  <div className="text-xs text-[var(--ink-3)]">
                    {t('settings.modal.customHeaders.empty')}
                  </div>
                )}
                {customHeaders.map((header, index) => (
                  <div
                    key={`${header.key}-${index}`}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center"
                  >
                    <Input
                      type="text"
                      value={header.key}
                      onChange={(event) => onSetCustomHeaderKey(index, event.target.value)}
                      placeholder={t('settings.modal.customHeaders.key')}
                      className={fullInputClass}
                      compact
                      autoComplete="off"
                    />
                    <Input
                      type="text"
                      value={header.value}
                      onChange={(event) => onSetCustomHeaderValue(index, event.target.value)}
                      placeholder={t('settings.modal.customHeaders.value')}
                      className={fullInputClass}
                      compact
                      autoComplete="off"
                    />
                    <Button
                      onClick={() => onRemoveCustomHeader(index)}
                      variant="ghost"
                      size="sm"
                      className="!px-1 !py-1 hover:text-red-400"
                      aria-label={t('settings.modal.customHeaders.remove')}
                      title={t('settings.modal.customHeaders.remove')}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {supportsRegion && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--ink-2)]">
            {t('settings.modal.region')}
          </label>
          <div className="flex gap-2">
            <Button
              onClick={handleRegionIntl}
              size="sm"
              variant="ghost"
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ring-[var(--line-1)] transition-colors duration-160 ease-out ${
                baseUrl === resolveBaseUrlForRegion(providerId, 'intl')
                  ? 'bg-[var(--bg-2)] text-[var(--ink-1)]'
                  : 'text-[var(--ink-3)] hover:bg-[var(--bg-2)] hover:text-[var(--ink-1)]'
              }`}
            >
              {t('settings.modal.region.international')}
            </Button>
            <Button
              onClick={handleRegionCn}
              size="sm"
              variant="ghost"
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ring-[var(--line-1)] transition-colors duration-160 ease-out ${
                baseUrl === resolveBaseUrlForRegion(providerId, 'cn')
                  ? 'bg-[var(--bg-2)] text-[var(--ink-1)]'
                  : 'text-[var(--ink-3)] hover:bg-[var(--bg-2)] hover:text-[var(--ink-1)]'
              }`}
            >
              {t('settings.modal.region.china')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderTab;
