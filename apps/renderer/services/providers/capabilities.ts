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
  openrouter: {
    supportsTavily: true,
    supportsBaseUrl: true,
    supportsCustomHeaders: true,
    supportsRegion: false,
  },
  ollama: {
    supportsTavily: false,
    supportsBaseUrl: true,
    supportsCustomHeaders: false,
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
  iflow: {
    supportsTavily: true,
    supportsBaseUrl: false,
    supportsCustomHeaders: false,
    supportsRegion: false,
  },
};

export const getProviderCapabilities = (providerId: ProviderId): ProviderCapabilities => {
  return PROVIDER_CAPABILITIES[providerId] ?? DEFAULT_CAPABILITIES;
};

export const supportsProviderTavily = (providerId: ProviderId): boolean => {
  return getProviderCapabilities(providerId).supportsTavily;
};
