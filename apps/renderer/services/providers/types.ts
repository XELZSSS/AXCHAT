import { ChatMessage, Citation, GeminiEmbeddingConfig, ProviderId } from '../../types';
import type { RequestPolicy } from './requestPolicy';

export type ProviderResponseMetadata = {
  citations?: Citation[];
};

export interface ProviderChat {
  getId(): ProviderId;
  getModelName(): string;
  setModelName(model: string): void;
  getApiKey(): string | undefined;
  setApiKey(apiKey?: string): void;
  getBaseUrl?(): string | undefined;
  setBaseUrl?(baseUrl?: string): void;
  getCustomHeaders?(): Array<{ key: string; value: string }> | undefined;
  setCustomHeaders?(headers: Array<{ key: string; value: string }>): void;
  getTavilyConfig?(): import('../../types').TavilyConfig | undefined;
  setTavilyConfig?(config: import('../../types').TavilyConfig | undefined): void;
  getEmbeddingConfig?(): GeminiEmbeddingConfig | undefined;
  setEmbeddingConfig?(config: GeminiEmbeddingConfig | undefined): void;
  consumePendingResponseMetadata?(): ProviderResponseMetadata | undefined;
  resetChat(): void;
  startChatWithHistory(messages: ChatMessage[]): Promise<void>;
  sendMessageStream(
    message: string,
    signal?: AbortSignal,
    requestPolicy?: RequestPolicy
  ): AsyncGenerator<string, void, unknown>;
}

export interface ProviderDefinition {
  id: ProviderId;
  models: string[];
  defaultModel: string;
  create(): ProviderChat;
}
