import { ProviderId } from '../../types';

export type ProviderCapabilities = {
  supportsTavily: boolean;
  supportsBaseUrl: boolean;
  supportsCustomHeaders: boolean;
  supportsRegion: boolean;
};

const DEFAULT_CAPABILITIES: ProviderCapabilities = {
  supportsTavily: false,
  supportsBaseUrl: false,
  supportsCustomHeaders: false,
  supportsRegion: false,
};

export const PROVIDER_CAPABILITIES: Record<ProviderId, ProviderCapabilities> = {
  openai: {
    supportsTavily: true,
    supportsBaseUrl: false,
    supportsCustomHeaders: false,
    supportsRegion: false,
  },
  'openai-compatible': {
    supportsTavily: true,
    supportsBaseUrl: true,
    supportsCustomHeaders: true,
    supportsRegion: false,
  },
  xai: {
    supportsTavily: true,
    supportsBaseUrl: false,
    supportsCustomHeaders: false,
    supportsRegion: false,
  },
  gemini: {
    supportsTavily: true,
    supportsBaseUrl: false,
    supportsCustomHeaders: false,
    supportsRegion: false,
  },
  deepseek: {
    supportsTavily: true,
    supportsBaseUrl: false,
    supportsCustomHeaders: false,
    supportsRegion: false,
  },
  glm: {
    supportsTavily: true,
    supportsBaseUrl: false,
    supportsCustomHeaders: false,
    supportsRegion: true,
  },
  minimax: {
    supportsTavily: true,
    supportsBaseUrl: false,
    supportsCustomHeaders: false,
    supportsRegion: true,
  },
  moonshot: {
    supportsTavily: true,
    supportsBaseUrl: false,
    supportsCustomHeaders: false,
    supportsRegion: true,
  },
};

export const getProviderCapabilities = (providerId: ProviderId): ProviderCapabilities => {
  return PROVIDER_CAPABILITIES[providerId] ?? DEFAULT_CAPABILITIES;
};

export const supportsProviderTavily = (providerId: ProviderId): boolean => {
  return getProviderCapabilities(providerId).supportsTavily;
};
