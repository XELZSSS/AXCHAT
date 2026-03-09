import { ProviderId } from '../../types';
import { PROVIDER_CAPABILITIES } from '../../services/providers/capabilities';
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

export const providerMeta: Record<
  ProviderId,
  {
    label: string;
    supportsTavily?: boolean;
    supportsBaseUrl?: boolean;
    supportsCustomHeaders?: boolean;
    supportsRegion?: boolean;
    isOfficialProvider?: boolean;
  }
> = {
  openai: {
    label: 'OpenAI',
    ...PROVIDER_CAPABILITIES.openai,
    isOfficialProvider: true,
  },
  'openai-compatible': {
    label: 'OpenAI-Compatible',
    ...PROVIDER_CAPABILITIES['openai-compatible'],
    isOfficialProvider: false,
  },
  xai: {
    label: 'xAI',
    ...PROVIDER_CAPABILITIES.xai,
    isOfficialProvider: true,
  },
  gemini: {
    label: 'Gemini',
    ...PROVIDER_CAPABILITIES.gemini,
    isOfficialProvider: true,
  },
  deepseek: {
    label: 'DeepSeek',
    ...PROVIDER_CAPABILITIES.deepseek,
    isOfficialProvider: true,
  },
  glm: {
    label: 'GLM',
    ...PROVIDER_CAPABILITIES.glm,
    isOfficialProvider: true,
  },
  minimax: {
    label: 'MiniMax',
    ...PROVIDER_CAPABILITIES.minimax,
    isOfficialProvider: true,
  },
  moonshot: {
    label: 'Kimi',
    ...PROVIDER_CAPABILITIES.moonshot,
    isOfficialProvider: true,
  },
};

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

const inputBaseClass =
  'rounded-lg bg-[var(--bg-2)] text-[var(--ink-1)] outline-none ring-1 ring-[var(--line-1)] focus:ring-[var(--line-1)] placeholder:text-[var(--ink-3)]';

export const fullInputClass = `w-full ${inputBaseClass}`;
export const smInputClass = `w-full sm:w-64 ${inputBaseClass}`;
