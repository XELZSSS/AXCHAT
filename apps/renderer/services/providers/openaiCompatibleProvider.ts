import { ProviderId } from '../../types';
import { t } from '../../utils/i18n';
import { getDefaultOpenAICompatibleBaseUrl, resolveBaseUrl } from './baseUrl';
import { OPENAI_COMPATIBLE_MODEL_CATALOG } from './models';
import { OpenAIProxyCompatibleProviderBase } from './openaiProxyCompatibleProviderBase';
import { buildProxyUrl } from './proxy';
import { buildProviderModelConfig } from './modelConfig';
import { ProviderChat, ProviderDefinition } from './types';
import { sanitizeApiKey } from './utils';

export const OPENAI_COMPATIBLE_PROVIDER_ID: ProviderId = 'openai-compatible';
const OPENAI_COMPATIBLE_PROXY_BASE_URL = buildProxyUrl('/proxy/openai-compatible/v1');

const FALLBACK_OPENAI_COMPATIBLE_MODEL = 'gpt-4.1-mini';
const { defaultModel: DEFAULT_OPENAI_COMPATIBLE_MODEL, models: OPENAI_COMPATIBLE_MODELS } =
  buildProviderModelConfig({
    envModel: process.env.OPENAI_COMPATIBLE_MODEL,
    fallbackModel: FALLBACK_OPENAI_COMPATIBLE_MODEL,
    catalog: OPENAI_COMPATIBLE_MODEL_CATALOG,
  });

const DEFAULT_OPENAI_COMPATIBLE_API_KEY = sanitizeApiKey(process.env.OPENAI_COMPATIBLE_API_KEY);

class OpenAICompatibleProvider extends OpenAIProxyCompatibleProviderBase implements ProviderChat {
  constructor() {
    super({
      id: OPENAI_COMPATIBLE_PROVIDER_ID,
      defaultModel: DEFAULT_OPENAI_COMPATIBLE_MODEL,
      defaultApiKey: DEFAULT_OPENAI_COMPATIBLE_API_KEY,
      proxyBaseUrl: OPENAI_COMPATIBLE_PROXY_BASE_URL,
      defaultTargetBaseUrl: getDefaultOpenAICompatibleBaseUrl(),
      missingApiKeyError: t('settings.provider.error.openaiCompatible.missingApiKey'),
      missingBaseUrlError: t('settings.provider.error.openaiCompatible.missingBaseUrl'),
      logLabel: 'OpenAI-Compatible',
      supportsTavily: true,
    });
  }

  protected resolveTargetBaseUrl(baseUrl?: string): string | undefined {
    const raw = baseUrl?.trim() || getDefaultOpenAICompatibleBaseUrl();
    if (!raw) return undefined;

    const normalized = resolveBaseUrl(raw);
    try {
      const parsed = new URL(normalized);
      const pathname = parsed.pathname.replace(/\/+$/, '');
      if (pathname === '/v1') {
        parsed.pathname = '';
      }
      return parsed.toString().replace(/\/+$/, '');
    } catch {
      return normalized;
    }
  }

  async generateTitle(message: string): Promise<string> {
    try {
      const client = this.getClient();
      const response = await client.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: t('settings.titlePrompt.system') },
          {
            role: 'user',
            content: t('settings.titlePrompt.user').replace('{message}', message),
          },
        ],
        stream: false,
      });
      return response.choices[0]?.message?.content?.trim() ?? '';
    } catch (error) {
      console.error('OpenAI-Compatible title generation error:', error);
      return '';
    }
  }
}

export const openaiCompatibleProviderDefinition: ProviderDefinition = {
  id: OPENAI_COMPATIBLE_PROVIDER_ID,
  models: OPENAI_COMPATIBLE_MODELS,
  defaultModel: DEFAULT_OPENAI_COMPATIBLE_MODEL,
  create: () => new OpenAICompatibleProvider(),
};
