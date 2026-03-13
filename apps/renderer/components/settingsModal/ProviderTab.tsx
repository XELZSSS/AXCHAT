import { memo, useCallback, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { GeminiEmbeddingConfig, ProviderId } from '../../types';
import { t } from '../../utils/i18n';
import Dropdown, { DropdownOption } from '../settings/Dropdown';
import {
  fullInputClass,
  getGeminiEmbeddingTaskOptions,
  resolveBaseUrlForRegion,
  smInputClass,
} from './constants';
import { Button, Field, Input } from '../ui';
import { DeleteOutlineIcon } from '../icons';
import SecretInput from './SecretInput';
import {
  DEFAULT_GEMINI_EMBEDDING_MODEL,
  DEFAULT_GEMINI_EMBEDDING_OUTPUT_DIMENSIONALITY,
  DEFAULT_GEMINI_EMBEDDING_TASK_TYPE,
} from '../../services/providers/geminiEmbeddings';

const SECTION_LABEL_CLASS = 'text-xs font-medium text-[var(--ink-2)]';
const SUB_LABEL_CLASS = 'text-xs text-[var(--ink-3)]';
const REGION_BUTTON_BASE =
  'flex-1 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ring-[var(--line-1)] transition-colors duration-160 ease-out';

type GeminiEmbeddingSectionProps = {
  embedding: GeminiEmbeddingConfig;
  portalContainer: HTMLElement | null;
  onSetEmbeddingField: <K extends keyof GeminiEmbeddingConfig>(
    key: K,
    value: GeminiEmbeddingConfig[K]
  ) => void;
};

type ProviderTabProps = {
  providerId: ProviderId;
  providerOptions: DropdownOption[];
  modelName: string;
  currentModelName: string;
  apiKey: string;
  baseUrl?: string;
  customHeaders: Array<{ key: string; value: string }>;
  embedding: GeminiEmbeddingConfig;
  showApiKey: boolean;
  supportsBaseUrl?: boolean;
  supportsCustomHeaders?: boolean;
  supportsRegion?: boolean;
  isOfficialProvider?: boolean;
  portalContainer: HTMLElement | null;
  onProviderChange: (providerId: ProviderId) => void;
  onModelNameChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onToggleApiKeyVisibility: () => void;
  onClearApiKey: () => void;
  onBaseUrlChange: (value: string) => void;
  onSetEmbeddingField: <K extends keyof GeminiEmbeddingConfig>(
    key: K,
    value: GeminiEmbeddingConfig[K]
  ) => void;
  onAddCustomHeader: () => void;
  onSetCustomHeaderKey: (index: number, value: string) => void;
  onSetCustomHeaderValue: (index: number, value: string) => void;
  onRemoveCustomHeader: (index: number) => void;
  onSetRegionBaseUrl: (region: 'intl' | 'cn') => void;
};

const GeminiEmbeddingSection = memo<GeminiEmbeddingSectionProps>(
  ({ embedding, portalContainer, onSetEmbeddingField }) => {
    const embeddingTaskOptions = useMemo(() => getGeminiEmbeddingTaskOptions(), []);

    const handleEmbeddingModelChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) =>
        onSetEmbeddingField('model', event.target.value || undefined),
      [onSetEmbeddingField]
    );
    const handleEmbeddingOutputDimensionalityChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        const normalized = event.target.value.replace(/[^\d]/g, '');
        onSetEmbeddingField('outputDimensionality', normalized ? Number(normalized) : undefined);
      },
      [onSetEmbeddingField]
    );
    const handleEmbeddingTitleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) =>
        onSetEmbeddingField('title', event.target.value || undefined),
      [onSetEmbeddingField]
    );
    const handleEmbeddingTaskTypeChange = useCallback(
      (value: string) =>
        onSetEmbeddingField('taskType', value as GeminiEmbeddingConfig['taskType']),
      [onSetEmbeddingField]
    );

    return (
      <Field label={t('settings.modal.embedding.title')}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className={SUB_LABEL_CLASS}>{t('settings.modal.embedding.model')}</label>
              <Input
                type="text"
                value={embedding.model ?? ''}
                onChange={handleEmbeddingModelChange}
                placeholder={DEFAULT_GEMINI_EMBEDDING_MODEL}
                className={fullInputClass}
                compact
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <label className={SUB_LABEL_CLASS}>
                {t('settings.modal.embedding.outputDimensionality')}
              </label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={embedding.outputDimensionality ?? ''}
                onChange={handleEmbeddingOutputDimensionalityChange}
                placeholder={String(DEFAULT_GEMINI_EMBEDDING_OUTPUT_DIMENSIONALITY)}
                className={fullInputClass}
                compact
                autoComplete="off"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className={SUB_LABEL_CLASS}>{t('settings.modal.embedding.taskType')}</label>
              <Dropdown
                value={embedding.taskType ?? DEFAULT_GEMINI_EMBEDDING_TASK_TYPE}
                options={embeddingTaskOptions}
                onChange={handleEmbeddingTaskTypeChange}
                widthClassName="w-full"
                portalContainer={portalContainer}
              />
            </div>

            <div className="space-y-2">
              <label className={SUB_LABEL_CLASS}>{t('settings.modal.embedding.titleField')}</label>
              <Input
                type="text"
                value={embedding.title ?? ''}
                onChange={handleEmbeddingTitleChange}
                placeholder={t('settings.modal.embedding.titleField.placeholder')}
                className={fullInputClass}
                compact
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      </Field>
    );
  }
);

GeminiEmbeddingSection.displayName = 'GeminiEmbeddingSection';

const ProviderTab = ({
  providerId,
  providerOptions,
  modelName,
  currentModelName,
  apiKey,
  baseUrl,
  customHeaders,
  embedding,
  showApiKey,
  supportsBaseUrl,
  supportsCustomHeaders,
  supportsRegion,
  isOfficialProvider,
  portalContainer,
  onProviderChange,
  onModelNameChange,
  onApiKeyChange,
  onToggleApiKeyVisibility,
  onClearApiKey,
  onBaseUrlChange,
  onSetEmbeddingField,
  onAddCustomHeader,
  onSetCustomHeaderKey,
  onSetCustomHeaderValue,
  onRemoveCustomHeader,
  onSetRegionBaseUrl,
}: ProviderTabProps) => {
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
    (event: ChangeEvent<HTMLInputElement>) => onModelNameChange(event.target.value),
    [onModelNameChange]
  );
  const handleApiKeyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onApiKeyChange(event.target.value),
    [onApiKeyChange]
  );
  const handleBaseUrlChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onBaseUrlChange(event.target.value),
    [onBaseUrlChange]
  );
  const isIntlRegion = baseUrl === resolveBaseUrlForRegion(providerId, 'intl');
  const isCnRegion = baseUrl === resolveBaseUrlForRegion(providerId, 'cn');
  const handleRegionIntl = useCallback(() => onSetRegionBaseUrl('intl'), [onSetRegionBaseUrl]);
  const handleRegionCn = useCallback(() => onSetRegionBaseUrl('cn'), [onSetRegionBaseUrl]);

  return (
    <div className="space-y-4">
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

      <SecretInput
        label={t('settings.modal.apiKey')}
        value={apiKey}
        onChange={handleApiKeyChange}
        showSecret={showApiKey}
        onToggleVisibility={onToggleApiKeyVisibility}
        onClear={onClearApiKey}
        visibilityLabel={apiKeyVisibilityLabel}
        inputClassName={`${fullInputClass} pr-20`}
      />

      {providerId === 'gemini' && (
        <GeminiEmbeddingSection
          embedding={embedding}
          portalContainer={portalContainer}
          onSetEmbeddingField={onSetEmbeddingField}
        />
      )}

      {(supportsBaseUrl || supportsCustomHeaders) && (
        <div className="space-y-3">
          {supportsBaseUrl && (
            <div className="space-y-2">
              <div className="space-y-2">
                <label className={SECTION_LABEL_CLASS}>{t('settings.modal.baseUrl')}</label>
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
                <label className={SECTION_LABEL_CLASS}>{t('settings.modal.customHeaders')}</label>
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
                      className="!px-1 !py-1 hover:text-[var(--status-error)]"
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
          <label className={SECTION_LABEL_CLASS}>{t('settings.modal.region')}</label>
          <div className="flex gap-2">
            <Button
              onClick={handleRegionIntl}
              size="sm"
              variant="ghost"
              className={`${REGION_BUTTON_BASE} ${
                isIntlRegion
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
              className={`${REGION_BUTTON_BASE} ${
                isCnRegion
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
