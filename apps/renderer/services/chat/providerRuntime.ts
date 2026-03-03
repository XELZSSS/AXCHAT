import { ChatMessage, ProviderId } from '../../types';
import { ProviderSettings } from '../providers/defaults';
import { getProviderDefaultModel } from '../providers/registry';
import { ProviderRouter } from '../providers/router';
import { ProviderChat } from '../providers/types';

export class ProviderRuntime {
  private readonly router: ProviderRouter;
  private provider: ProviderChat;
  private searchEnabled = true;

  constructor(initialProviderId: ProviderId) {
    this.router = new ProviderRouter(initialProviderId);
    this.provider = this.router.getActiveProvider();
  }

  getProviderId(): ProviderId {
    return this.provider.getId();
  }

  getModelName(): string {
    return this.provider.getModelName();
  }

  getApiKey(): string | undefined {
    return this.provider.getApiKey();
  }

  setProvider(providerId: ProviderId): void {
    this.provider = this.router.setActiveProvider(providerId);
  }

  setSearchEnabled(enabled: boolean): void {
    this.searchEnabled = enabled;
  }

  applyProviderSettings(providerId: ProviderId, settings: ProviderSettings): void {
    this.provider.setApiKey(settings?.apiKey);
    this.provider.setModelName(settings?.modelName ?? getProviderDefaultModel(providerId));
    if (this.provider.setBaseUrl) {
      this.provider.setBaseUrl(settings?.baseUrl);
    }
    if (this.provider.setCustomHeaders) {
      this.provider.setCustomHeaders(settings?.customHeaders ?? []);
    }
    if (this.provider.setTavilyConfig) {
      this.provider.setTavilyConfig(this.searchEnabled ? settings?.tavily : undefined);
    }
  }

  resetChat(): void {
    this.provider.resetChat();
  }

  async startChatWithHistory(messages: ChatMessage[]): Promise<void> {
    await this.provider.startChatWithHistory(messages);
  }

  async *sendMessageStream(message: string): AsyncGenerator<string, void, unknown> {
    yield* this.provider.sendMessageStream(message);
  }
}
