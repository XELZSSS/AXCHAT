import { ChatMessage, ProviderId, TavilyConfig } from '../../types';
import { ProviderSettings } from '../providers/defaults';
import type { RequestPolicy } from '../providers/requestPolicy';
import { ProviderRouter } from '../providers/router';
import { ProviderChat } from '../providers/types';

export class ProviderRuntime {
  private readonly router: ProviderRouter;
  private provider: ProviderChat;
  private searchEnabled = true;
  private historySyncGeneration = 0;
  private latestHistorySyncRequest: { provider: ProviderChat; messages: ChatMessage[] } | null =
    null;
  private historyReconcilePromise: Promise<void> | null = null;

  constructor(initialProviderId: ProviderId) {
    this.router = new ProviderRouter(initialProviderId);
    this.provider = this.router.getActiveProvider();
  }

  getProviderId(): ProviderId {
    return this.provider.getId();
  }

  setProvider(providerId: ProviderId): void {
    this.historySyncGeneration += 1;
    this.latestHistorySyncRequest = null;
    this.provider = this.router.setActiveProvider(providerId);
  }

  getModelName(): string {
    return this.provider.getModelName();
  }

  getApiKey(): string | undefined {
    return this.provider.getApiKey();
  }

  setSearchEnabled(enabled: boolean): boolean {
    if (this.searchEnabled === enabled) {
      return false;
    }
    this.searchEnabled = enabled;
    return true;
  }

  private areHeadersEqual(
    a: Array<{ key: string; value: string }> | undefined,
    b: Array<{ key: string; value: string }> | undefined
  ): boolean {
    const left = a ?? [];
    const right = b ?? [];
    if (left.length !== right.length) return false;
    return left.every((header, index) => {
      const next = right[index];
      return !!next && header.key === next.key && header.value === next.value;
    });
  }

  private isTavilyEqual(a: TavilyConfig | undefined, b: TavilyConfig | undefined): boolean {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  }

  applyProviderSettings(providerId: ProviderId, settings: ProviderSettings): void {
    if (this.provider.getId() !== providerId) {
      this.provider = this.router.setActiveProvider(providerId);
    }

    const nextApiKey = settings?.apiKey;
    if (this.provider.getApiKey() !== nextApiKey) {
      this.provider.setApiKey(nextApiKey);
    }

    const nextModel = settings?.modelName ?? '';
    if (this.provider.getModelName() !== nextModel) {
      this.provider.setModelName(nextModel);
    }

    if (this.provider.setBaseUrl) {
      const currentBaseUrl = this.provider.getBaseUrl?.();
      const nextBaseUrl = settings?.baseUrl;
      if (currentBaseUrl !== nextBaseUrl) {
        this.provider.setBaseUrl(nextBaseUrl);
      }
    }

    if (this.provider.setCustomHeaders) {
      const currentHeaders = this.provider.getCustomHeaders?.();
      const nextHeaders = settings?.customHeaders ?? [];
      if (!this.areHeadersEqual(currentHeaders, nextHeaders)) {
        this.provider.setCustomHeaders(nextHeaders);
      }
    }

    if (this.provider.setTavilyConfig) {
      const currentTavily = this.provider.getTavilyConfig?.();
      const nextTavily = this.searchEnabled ? settings?.tavily : undefined;
      if (!this.isTavilyEqual(currentTavily, nextTavily)) {
        this.provider.setTavilyConfig(nextTavily);
      }
    }
  }

  resetChat(): void {
    this.historySyncGeneration += 1;
    this.latestHistorySyncRequest = null;
    this.provider.resetChat();
  }

  private async reconcileLatestHistorySync(): Promise<void> {
    if (this.historyReconcilePromise) {
      await this.historyReconcilePromise;
      return;
    }

    const latestRequest = this.latestHistorySyncRequest;
    if (!latestRequest) {
      return;
    }

    this.historyReconcilePromise = (async () => {
      const snapshot = this.latestHistorySyncRequest;
      if (!snapshot) {
        return;
      }

      await snapshot.provider.startChatWithHistory(snapshot.messages);
    })().finally(() => {
      this.historyReconcilePromise = null;
    });

    await this.historyReconcilePromise;
  }

  async startChatWithHistory(messages: ChatMessage[]): Promise<void> {
    const provider = this.provider;
    this.latestHistorySyncRequest = { provider, messages };
    const generation = ++this.historySyncGeneration;

    await provider.startChatWithHistory(messages);

    if (
      generation !== this.historySyncGeneration ||
      this.latestHistorySyncRequest?.provider !== provider ||
      this.latestHistorySyncRequest?.messages !== messages
    ) {
      await this.reconcileLatestHistorySync();
    }
  }

  async *sendMessageStream(
    message: string,
    signal?: AbortSignal,
    requestPolicy?: RequestPolicy
  ): AsyncGenerator<string, void, unknown> {
    yield* this.provider.sendMessageStream(message, signal, requestPolicy);
  }
}
