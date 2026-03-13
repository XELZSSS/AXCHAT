import { useCallback, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { TavilyConfig } from '../../types';
import { t } from '../../utils/i18n';
import Dropdown from '../settings/Dropdown';
import { fullInputClass, getTavilySearchDepthOptions, getTavilyTopicOptions } from './constants';
import { Field, Input, Toggle } from '../ui';
import { DEFAULT_MAX_TOOL_CALL_ROUNDS } from '../../services/providers/utils';
import SecretInput from './SecretInput';

const LABEL_CLASS = 'text-xs text-[var(--ink-3)]';

type SearchTabProps = {
  tavily: TavilyConfig;
  showTavilyKey: boolean;
  toolCallMaxRounds: string;
  portalContainer: HTMLElement | null;
  onSetTavilyField: <K extends keyof TavilyConfig>(key: K, value: TavilyConfig[K]) => void;
  onToggleTavilyKeyVisibility: () => void;
  onToolCallMaxRoundsChange: (value: string) => void;
  onToolCallMaxRoundsBlur: () => void;
};

const SearchTab = ({
  tavily,
  showTavilyKey,
  toolCallMaxRounds,
  portalContainer,
  onSetTavilyField,
  onToggleTavilyKeyVisibility,
  onToolCallMaxRoundsChange,
  onToolCallMaxRoundsBlur,
}: SearchTabProps) => {
  const searchDepthOptions = useMemo(() => getTavilySearchDepthOptions(), []);
  const topicOptions = useMemo(() => getTavilyTopicOptions(), []);
  const tavilyKeyLabel = useMemo(
    () => (showTavilyKey ? t('settings.apiKey.hide') : t('settings.apiKey.show')),
    [showTavilyKey]
  );

  const handleApiKeyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onSetTavilyField('apiKey', event.target.value),
    [onSetTavilyField]
  );
  const handleProjectIdChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      onSetTavilyField('projectId', event.target.value),
    [onSetTavilyField]
  );
  const handleMaxResultsChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      onSetTavilyField('maxResults', event.target.value ? Number(event.target.value) : undefined),
    [onSetTavilyField]
  );
  const handleIncludeAnswerChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      onSetTavilyField('includeAnswer', event.target.checked),
    [onSetTavilyField]
  );
  const handleClearApiKey = useCallback(() => onSetTavilyField('apiKey', ''), [onSetTavilyField]);
  const handleSearchDepthChange = useCallback(
    (value: string) =>
      onSetTavilyField('searchDepth', value as import('../../types').TavilySearchDepth),
    [onSetTavilyField]
  );
  const handleTopicChange = useCallback(
    (value: string) => onSetTavilyField('topic', value as import('../../types').TavilyTopic),
    [onSetTavilyField]
  );

  return (
    <div className="space-y-4">
      <Field label={t('settings.modal.tavily.title')}>
        <div className="space-y-3">
          <SecretInput
            label={t('settings.modal.tavily.apiKey')}
            labelClassName="text-xs text-[var(--ink-3)]"
            value={tavily.apiKey ?? ''}
            onChange={handleApiKeyChange}
            showSecret={showTavilyKey}
            onToggleVisibility={onToggleTavilyKeyVisibility}
            onClear={handleClearApiKey}
            visibilityLabel={tavilyKeyLabel}
            inputClassName={`${fullInputClass} pr-20`}
            compact
          />

          <div className="space-y-2">
            <label className={LABEL_CLASS}>{t('settings.modal.tavily.projectId')}</label>
            <Input
              type="text"
              value={tavily.projectId ?? ''}
              onChange={handleProjectIdChange}
              className={fullInputClass}
              compact
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="space-y-2">
              <label className={LABEL_CLASS}>{t('settings.modal.tavily.searchDepth')}</label>
              <Dropdown
                value={tavily.searchDepth ?? 'basic'}
                options={searchDepthOptions}
                onChange={handleSearchDepthChange}
                widthClassName="w-full"
                portalContainer={portalContainer}
              />
            </div>

            <div className="space-y-2">
              <label className={LABEL_CLASS}>{t('settings.modal.toolCallRounds')}</label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={toolCallMaxRounds}
                onChange={(event) =>
                  onToolCallMaxRoundsChange(event.target.value.replace(/[^\d]/g, ''))
                }
                onBlur={onToolCallMaxRoundsBlur}
                placeholder={String(DEFAULT_MAX_TOOL_CALL_ROUNDS)}
                className={`${fullInputClass} text-xs`}
                compact
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <label className={LABEL_CLASS}>{t('settings.modal.tavily.maxResults')}</label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={tavily.maxResults ?? 5}
                onChange={handleMaxResultsChange}
                className={`${fullInputClass} text-xs`}
                compact
              />
            </div>

            <div className="space-y-2">
              <label className={LABEL_CLASS}>{t('settings.modal.tavily.topic')}</label>
              <Dropdown
                value={tavily.topic ?? 'general'}
                options={topicOptions}
                onChange={handleTopicChange}
                widthClassName="w-full"
                portalContainer={portalContainer}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-[var(--ink-3)]">
            <Toggle checked={tavily.includeAnswer ?? true} onChange={handleIncludeAnswerChange} />
            {t('settings.modal.tavily.includeAnswer')}
          </label>
        </div>
      </Field>
    </div>
  );
};

export default SearchTab;
