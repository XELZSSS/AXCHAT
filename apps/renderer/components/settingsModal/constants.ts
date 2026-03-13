import { GeminiEmbeddingTaskType, ProviderId } from '../../types';
import { PROVIDER_IDS } from '../../../shared/provider-ids';
import { PROVIDER_CAPABILITIES } from '../../services/providers/capabilities';
import { PROVIDER_CONFIGS } from '../../services/providers/providerConfig';
import {
  resolveBaseUrlForProvider as resolveProviderBaseUrl,
  resolveBaseUrlForRegion as resolveProviderRegionalBaseUrl,
} from '../../services/providers/baseUrl';
import { t } from '../../utils/i18n';
import { DropdownOption } from '../settings/Dropdown';

export const resolveBaseUrlForProvider = (
  providerId: ProviderId,
  override?: string
): string | undefined => {
  return resolveProviderBaseUrl(providerId, override);
};

export const resolveBaseUrlForRegion = (providerId: ProviderId, region: 'intl' | 'cn'): string => {
  return resolveProviderRegionalBaseUrl(providerId, region);
};

export const providerMeta = PROVIDER_IDS.reduce(
  (acc, id) => {
    acc[id] = {
      label: PROVIDER_CONFIGS[id].label,
      ...PROVIDER_CAPABILITIES[id],
      isOfficialProvider: PROVIDER_CONFIGS[id].isOfficialProvider,
    };
    return acc;
  },
  {} as Record<
    ProviderId,
    {
      label: string;
      supportsTavily?: boolean;
      supportsBaseUrl?: boolean;
      supportsCustomHeaders?: boolean;
      supportsRegion?: boolean;
      isOfficialProvider?: boolean;
    }
  >
);

const assertProviderMappingCompleteness = (mapping: Record<ProviderId, unknown>, label: string) => {
  const missing = PROVIDER_IDS.filter((id) => !(id in mapping));
  if (missing.length > 0) {
    throw new Error(`Provider mapping "${label}" is missing: ${missing.join(', ')}`);
  }
};

assertProviderMappingCompleteness(providerMeta, 'providerMeta');

export const getTavilySearchDepthOptions = (): DropdownOption[] => [
  { value: 'basic', label: t('settings.modal.tavily.searchDepth.basic') },
  { value: 'advanced', label: t('settings.modal.tavily.searchDepth.advanced') },
  { value: 'fast', label: t('settings.modal.tavily.searchDepth.fast') },
  { value: 'ultra-fast', label: t('settings.modal.tavily.searchDepth.ultraFast') },
];

export const getTavilyTopicOptions = (): DropdownOption[] => [
  { value: 'general', label: t('settings.modal.tavily.topic.general') },
  { value: 'news', label: t('settings.modal.tavily.topic.news') },
  { value: 'finance', label: t('settings.modal.tavily.topic.finance') },
];

export const getGeminiEmbeddingTaskOptions = (): Array<{
  value: GeminiEmbeddingTaskType;
  label: string;
}> => [
  {
    value: 'RETRIEVAL_DOCUMENT',
    label: t('settings.modal.embedding.taskType.retrievalDocument'),
  },
  {
    value: 'RETRIEVAL_QUERY',
    label: t('settings.modal.embedding.taskType.retrievalQuery'),
  },
  {
    value: 'SEMANTIC_SIMILARITY',
    label: t('settings.modal.embedding.taskType.semanticSimilarity'),
  },
  {
    value: 'CLASSIFICATION',
    label: t('settings.modal.embedding.taskType.classification'),
  },
  {
    value: 'CLUSTERING',
    label: t('settings.modal.embedding.taskType.clustering'),
  },
  {
    value: 'QUESTION_ANSWERING',
    label: t('settings.modal.embedding.taskType.questionAnswering'),
  },
  {
    value: 'FACT_VERIFICATION',
    label: t('settings.modal.embedding.taskType.factVerification'),
  },
];

const inputBaseClass =
  'rounded-lg bg-[var(--bg-2)] text-[var(--ink-1)] outline-none ring-1 ring-[var(--line-1)] focus:ring-[var(--action-interactive)] placeholder:text-[var(--ink-3)]';

export const fullInputClass = `w-full ${inputBaseClass}`;
export const smInputClass = `w-full sm:w-64 ${inputBaseClass}`;
