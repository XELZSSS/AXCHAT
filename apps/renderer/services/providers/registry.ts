import { ChatMessage, GeminiEmbeddingConfig, ProviderId, TavilyConfig } from '../../types';
import { PROVIDER_CONFIGS } from './providerConfig';
import { ProviderChat, ProviderDefinition } from './types';
import { buildProviderModelConfig } from './modelConfig';
import { PROVIDER_IDS as RAW_PROVIDER_IDS } from '../../../shared/provider-ids';
import type { RequestPolicy } from './requestPolicy';

type ProviderMeta = {
  defaultModel: string;
  models: string[];
};

type ProviderModelSpec = (typeof PROVIDER_CONFIGS)[ProviderId]['modelSpec'];

type ProviderDefinitionLoader = () => Promise<ProviderDefinition>;

type ProviderCustomHeader = { key: string; value: string };

const PROVIDER_IDS = RAW_PROVIDER_IDS as unknown as ProviderId[];

const providerModelSpecs: Record<ProviderId, ProviderModelSpec> = PROVIDER_IDS.reduce(
  (acc, id) => {
    acc[id] = PROVIDER_CONFIGS[id].modelSpec;
    return acc;
  },
  {} as Record<ProviderId, ProviderModelSpec>
);

const assertProviderMappingCompleteness = (mapping: Record<ProviderId, unknown>, label: string) => {
  const missing = PROVIDER_IDS.filter((id) => !(id in mapping));
  if (missing.length > 0) {
    throw new Error(`Provider mapping "${label}" is missing: ${missing.join(', ')}`);
  }
};

assertProviderMappingCompleteness(providerModelSpecs, 'providerModelSpecs');

const providerMeta: Record<ProviderId, ProviderMeta> = PROVIDER_IDS.reduce(
  (acc, id) => {
    const config = buildProviderModelConfig(providerModelSpecs[id]);
    acc[id] = {
      defaultModel: config.defaultModel,
      models: config.models,
    };
    return acc;
  },
  {} as Record<ProviderId, ProviderMeta>
);

const providerDefinitionLoaders = {
  gemini: async () => (await import('./geminiProvider')).geminiProviderDefinition,
  openai: async () => (await import('./openaiProvider')).openaiProviderDefinition,
  'openai-compatible': async () =>
    (await import('./openaiCompatibleProvider')).openaiCompatibleProviderDefinition,
  xai: async () => (await import('./xaiProvider')).xaiProviderDefinition,
  deepseek: async () => (await import('./deepseekProvider')).deepseekProviderDefinition,
  glm: async () => (await import('./glmProvider')).glmProviderDefinition,
  minimax: async () => (await import('./minimaxProvider')).minimaxProviderDefinition,
  moonshot: async () => (await import('./moonshotProvider')).moonshotProviderDefinition,
} as const satisfies Record<ProviderId, ProviderDefinitionLoader>;

assertProviderMappingCompleteness(providerDefinitionLoaders, 'providerDefinitionLoaders');

class DeferredProvider implements ProviderChat {
  private providerPromise: Promise<ProviderChat> | null = null;
  private loadedProvider: ProviderChat | null = null;

  private modelName: string;
  private apiKey?: string;
  private baseUrl?: string;
  private customHeaders?: ProviderCustomHeader[];
  private tavilyConfig?: TavilyConfig;
  private embeddingConfig?: GeminiEmbeddingConfig;

  constructor(
    private readonly id: ProviderId,
    defaultModel: string,
    private readonly loader: ProviderDefinitionLoader
  ) {
    this.modelName = defaultModel;
  }

  private async ensureLoaded(): Promise<ProviderChat> {
    if (this.loadedProvider) {
      return this.loadedProvider;
    }
    if (!this.providerPromise) {
      this.providerPromise = this.loader().then((definition) => {
        const provider = definition.create();
        provider.setModelName(this.modelName);
        provider.setApiKey(this.apiKey);

        if (provider.setBaseUrl && this.baseUrl !== undefined) {
          provider.setBaseUrl(this.baseUrl);
        }
        if (provider.setCustomHeaders && this.customHeaders !== undefined) {
          provider.setCustomHeaders(this.customHeaders);
        }
        if (provider.setTavilyConfig && this.tavilyConfig !== undefined) {
          provider.setTavilyConfig(this.tavilyConfig);
        }
        if (provider.setEmbeddingConfig && this.embeddingConfig !== undefined) {
          provider.setEmbeddingConfig(this.embeddingConfig);
        }

        this.loadedProvider = provider;
        return provider;
      });
    }
    return this.providerPromise;
  }

  getId(): ProviderId {
    return this.id;
  }

  getModelName(): string {
    return this.loadedProvider?.getModelName() ?? this.modelName;
  }

  setModelName(model: string): void {
    this.modelName = model;
    this.loadedProvider?.setModelName(model);
  }

  getApiKey(): string | undefined {
    return this.loadedProvider?.getApiKey() ?? this.apiKey;
  }

  setApiKey(apiKey?: string): void {
    this.apiKey = apiKey;
    this.loadedProvider?.setApiKey(apiKey);
  }

  getBaseUrl?(): string | undefined {
    if (this.loadedProvider?.getBaseUrl) {
      return this.loadedProvider.getBaseUrl();
    }
    return this.baseUrl;
  }

  setBaseUrl?(baseUrl?: string): void {
    this.baseUrl = baseUrl;
    this.loadedProvider?.setBaseUrl?.(baseUrl);
  }

  getCustomHeaders?(): ProviderCustomHeader[] | undefined {
    if (this.loadedProvider?.getCustomHeaders) {
      return this.loadedProvider.getCustomHeaders();
    }
    return this.customHeaders;
  }

  setCustomHeaders?(headers: ProviderCustomHeader[]): void {
    this.customHeaders = headers;
    this.loadedProvider?.setCustomHeaders?.(headers);
  }

  getTavilyConfig?(): TavilyConfig | undefined {
    if (this.loadedProvider?.getTavilyConfig) {
      return this.loadedProvider.getTavilyConfig();
    }
    return this.tavilyConfig;
  }

  setTavilyConfig?(config: TavilyConfig | undefined): void {
    this.tavilyConfig = config;
    this.loadedProvider?.setTavilyConfig?.(config);
  }

  getEmbeddingConfig?(): GeminiEmbeddingConfig | undefined {
    if (this.loadedProvider?.getEmbeddingConfig) {
      return this.loadedProvider.getEmbeddingConfig();
    }
    return this.embeddingConfig;
  }

  setEmbeddingConfig?(config: GeminiEmbeddingConfig | undefined): void {
    this.embeddingConfig = config;
    this.loadedProvider?.setEmbeddingConfig?.(config);
  }

  consumePendingResponseMetadata?() {
    return this.loadedProvider?.consumePendingResponseMetadata?.();
  }

  resetChat(): void {
    this.loadedProvider?.resetChat();
  }

  async startChatWithHistory(messages: ChatMessage[]): Promise<void> {
    const provider = await this.ensureLoaded();
    await provider.startChatWithHistory(messages);
  }

  async *sendMessageStream(
    message: string,
    signal?: AbortSignal,
    requestPolicy?: RequestPolicy
  ): AsyncGenerator<string, void, unknown> {
    const provider = await this.ensureLoaded();
    yield* provider.sendMessageStream(message, signal, requestPolicy);
  }
}

const definitions: Record<ProviderId, ProviderDefinition> = PROVIDER_IDS.reduce(
  (acc, id) => {
    acc[id] = {
      id,
      models: providerMeta[id].models,
      defaultModel: providerMeta[id].defaultModel,
      create: () =>
        new DeferredProvider(id, providerMeta[id].defaultModel, providerDefinitionLoaders[id]),
    };
    return acc;
  },
  {} as Record<ProviderId, ProviderDefinition>
);

export const getProviderDefinition = (id: ProviderId): ProviderDefinition => definitions[id];

export const createProvider = (id: ProviderId): ProviderChat => getProviderDefinition(id).create();

export const listProviderIds = (): ProviderId[] => [...PROVIDER_IDS];
