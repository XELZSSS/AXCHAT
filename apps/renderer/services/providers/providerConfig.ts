import { ProviderId } from '../../types';
import {
  DEEPSEEK_MODEL_CATALOG,
  GEMINI_MODEL_CATALOG,
  GLM_MODEL_CATALOG,
  MINIMAX_MODEL_CATALOG,
  MOONSHOT_MODEL_CATALOG,
  OPENAI_COMPATIBLE_MODEL_CATALOG,
  OPENAI_MODEL_CATALOG,
  XAI_MODEL_CATALOG,
} from './models';
import { sanitizeApiKey } from './utils';

export type ProviderCapabilities = {
  supportsTavily: boolean;
  supportsBaseUrl: boolean;
  supportsCustomHeaders: boolean;
  supportsRegion: boolean;
};

export type ProviderModelSpec = {
  envModel?: string;
  fallbackModel: string;
  catalog: string[];
  includeFallbackModel?: boolean;
};

export type ProviderConfig = {
  label: string;
  isOfficialProvider: boolean;
  capabilities: ProviderCapabilities;
  modelSpec: ProviderModelSpec;
  envApiKeyResolver: () => string | undefined;
};

export const PROVIDER_CONFIGS = {
  openai: {
    label: 'OpenAI',
    isOfficialProvider: true,
    capabilities: {
      supportsTavily: true,
      supportsBaseUrl: false,
      supportsCustomHeaders: false,
      supportsRegion: false,
    },
    modelSpec: {
      envModel: process.env.OPENAI_MODEL,
      fallbackModel: 'gpt-5.4',
      catalog: OPENAI_MODEL_CATALOG,
    },
    envApiKeyResolver: () => sanitizeApiKey(process.env.OPENAI_API_KEY),
  },
  'openai-compatible': {
    label: 'OpenAI-Compatible',
    isOfficialProvider: false,
    capabilities: {
      supportsTavily: true,
      supportsBaseUrl: true,
      supportsCustomHeaders: true,
      supportsRegion: false,
    },
    modelSpec: {
      envModel: process.env.OPENAI_COMPATIBLE_MODEL,
      fallbackModel: 'gpt-4.1-mini',
      catalog: OPENAI_COMPATIBLE_MODEL_CATALOG,
    },
    envApiKeyResolver: () => sanitizeApiKey(process.env.OPENAI_COMPATIBLE_API_KEY),
  },
  xai: {
    label: 'xAI',
    isOfficialProvider: true,
    capabilities: {
      supportsTavily: true,
      supportsBaseUrl: false,
      supportsCustomHeaders: false,
      supportsRegion: false,
    },
    modelSpec: {
      envModel: process.env.XAI_MODEL,
      fallbackModel: 'grok-4-1-fast-reasoning',
      catalog: XAI_MODEL_CATALOG,
    },
    envApiKeyResolver: () => sanitizeApiKey(process.env.XAI_API_KEY),
  },
  gemini: {
    label: 'Gemini',
    isOfficialProvider: true,
    capabilities: {
      supportsTavily: true,
      supportsBaseUrl: false,
      supportsCustomHeaders: false,
      supportsRegion: false,
    },
    modelSpec: {
      fallbackModel: 'gemini-3.1-flash-lite-preview',
      catalog: GEMINI_MODEL_CATALOG,
    },
    envApiKeyResolver: () => sanitizeApiKey(process.env.GEMINI_API_KEY ?? process.env.API_KEY),
  },
  deepseek: {
    label: 'DeepSeek',
    isOfficialProvider: true,
    capabilities: {
      supportsTavily: true,
      supportsBaseUrl: false,
      supportsCustomHeaders: false,
      supportsRegion: false,
    },
    modelSpec: {
      envModel: process.env.DEEPSEEK_MODEL,
      fallbackModel: 'deepseek-reasoner',
      catalog: DEEPSEEK_MODEL_CATALOG,
    },
    envApiKeyResolver: () => sanitizeApiKey(process.env.DEEPSEEK_API_KEY),
  },
  glm: {
    label: 'GLM',
    isOfficialProvider: true,
    capabilities: {
      supportsTavily: true,
      supportsBaseUrl: false,
      supportsCustomHeaders: false,
      supportsRegion: true,
    },
    modelSpec: {
      envModel: process.env.GLM_MODEL,
      fallbackModel: 'glm-5',
      catalog: GLM_MODEL_CATALOG,
    },
    envApiKeyResolver: () => sanitizeApiKey(process.env.GLM_API_KEY),
  },
  minimax: {
    label: 'MiniMax',
    isOfficialProvider: true,
    capabilities: {
      supportsTavily: true,
      supportsBaseUrl: false,
      supportsCustomHeaders: false,
      supportsRegion: true,
    },
    modelSpec: {
      envModel: process.env.MINIMAX_MODEL,
      fallbackModel: 'MiniMax-M2.5',
      catalog: MINIMAX_MODEL_CATALOG,
      includeFallbackModel: false,
    },
    envApiKeyResolver: () => sanitizeApiKey(process.env.MINIMAX_API_KEY),
  },
  moonshot: {
    label: 'Kimi',
    isOfficialProvider: true,
    capabilities: {
      supportsTavily: true,
      supportsBaseUrl: false,
      supportsCustomHeaders: false,
      supportsRegion: true,
    },
    modelSpec: {
      envModel: process.env.MOONSHOT_MODEL,
      fallbackModel: 'kimi-k2.5',
      catalog: MOONSHOT_MODEL_CATALOG,
      includeFallbackModel: false,
    },
    envApiKeyResolver: () => sanitizeApiKey(process.env.MOONSHOT_API_KEY),
  },
} as const satisfies Record<ProviderId, ProviderConfig>;
