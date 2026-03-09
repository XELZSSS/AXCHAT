import { ProviderId } from '../../types';
import { buildProxyUrl } from './proxy';

export type ProviderRegion = 'intl' | 'cn';

const MINIMAX_BASE_URLS = {
  intl: buildProxyUrl('/proxy/minimax-intl'),
  cn: buildProxyUrl('/proxy/minimax-cn'),
} as const;

const MOONSHOT_BASE_URLS = {
  intl: buildProxyUrl('/proxy/moonshot-intl'),
  cn: buildProxyUrl('/proxy/moonshot-cn'),
} as const;

const GLM_BASE_URLS = {
  intl: buildProxyUrl('/proxy/glm-intl'),
  cn: buildProxyUrl('/proxy/glm-cn'),
} as const;

const normalizeGlmBaseUrl = (value: string): string => {
  return resolveBaseUrl(value).replace(/\/responses\/?$/i, '');
};

export const normalizeBaseUrlForProvider = (providerId: ProviderId, value: string): string => {
  if (providerId === 'glm') {
    return normalizeGlmBaseUrl(value);
  }
  return resolveBaseUrl(value);
};

const normalizeEnvBaseUrl = (
  providerId: ProviderId | undefined,
  value?: string
): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === 'undefined') return undefined;
  if (!providerId) return resolveBaseUrl(trimmed);
  return normalizeBaseUrlForProvider(providerId, trimmed);
};

const prefersChinaEndpoint = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const lang = navigator.language?.toLowerCase() ?? '';
  return lang.startsWith('zh');
};

export const resolveBaseUrl = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (typeof window !== 'undefined') {
    return new URL(trimmed, window.location.origin).toString();
  }
  return trimmed;
};

const resolveRegionalDefaultBaseUrl = (
  providerId: ProviderId,
  envOverride: string | undefined,
  urls: { intl: string; cn: string }
): string => {
  const resolvedOverride = normalizeEnvBaseUrl(providerId, envOverride);
  if (resolvedOverride) return resolvedOverride;
  if (prefersChinaEndpoint()) return normalizeBaseUrlForProvider(providerId, urls.cn);
  return normalizeBaseUrlForProvider(providerId, urls.intl);
};

export const getMinimaxBaseUrlForRegion = (region: ProviderRegion): string => {
  return resolveBaseUrl(region === 'cn' ? MINIMAX_BASE_URLS.cn : MINIMAX_BASE_URLS.intl);
};

export const getDefaultMinimaxBaseUrl = (): string => {
  return resolveRegionalDefaultBaseUrl('minimax', process.env.MINIMAX_BASE_URL, MINIMAX_BASE_URLS);
};

export const getMoonshotBaseUrlForRegion = (region: ProviderRegion): string => {
  return resolveBaseUrl(region === 'cn' ? MOONSHOT_BASE_URLS.cn : MOONSHOT_BASE_URLS.intl);
};

export const getDefaultMoonshotBaseUrl = (): string => {
  return resolveRegionalDefaultBaseUrl('moonshot', process.env.MOONSHOT_BASE_URL, MOONSHOT_BASE_URLS);
};

export const getGlmBaseUrlForRegion = (region: ProviderRegion): string => {
  return normalizeBaseUrlForProvider('glm', region === 'cn' ? GLM_BASE_URLS.cn : GLM_BASE_URLS.intl);
};

export const getDefaultGlmBaseUrl = (): string => {
  return resolveRegionalDefaultBaseUrl('glm', process.env.GLM_BASE_URL, GLM_BASE_URLS);
};

export const getDefaultOpenAICompatibleBaseUrl = (): string | undefined => {
  return normalizeEnvBaseUrl('openai-compatible', process.env.OPENAI_COMPATIBLE_BASE_URL);
};

const providerDefaultBaseUrlResolvers: Partial<Record<ProviderId, () => string | undefined>> = {
  minimax: getDefaultMinimaxBaseUrl,
  moonshot: getDefaultMoonshotBaseUrl,
  glm: getDefaultGlmBaseUrl,
  'openai-compatible': getDefaultOpenAICompatibleBaseUrl,
};

const providerRegionalBaseUrlResolvers: Partial<Record<ProviderId, (r: ProviderRegion) => string>> =
  {
    moonshot: getMoonshotBaseUrlForRegion,
    glm: getGlmBaseUrlForRegion,
    minimax: getMinimaxBaseUrlForRegion,
  };

export const resolveDefaultBaseUrlForProvider = (providerId: ProviderId): string | undefined => {
  return providerDefaultBaseUrlResolvers[providerId]?.();
};

export const resolveBaseUrlForProvider = (
  providerId: ProviderId,
  override?: string
): string | undefined => {
  const nextUrl = override?.trim();
  if (nextUrl) return normalizeBaseUrlForProvider(providerId, nextUrl);
  return resolveDefaultBaseUrlForProvider(providerId);
};

export const resolveBaseUrlForRegion = (providerId: ProviderId, region: ProviderRegion): string => {
  return (providerRegionalBaseUrlResolvers[providerId] ?? getMinimaxBaseUrlForRegion)(region);
};
