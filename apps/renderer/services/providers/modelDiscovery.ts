import { GoogleGenAI, type Model as GeminiModel } from '@google/genai';
import OpenAI from 'openai';
import { ProviderId } from '../../types';
import { PROVIDER_IDS } from '../../../shared/provider-ids';
import { t } from '../../utils/i18n';

type DiscoverProviderModelsOptions = {
  providerId: ProviderId;
  apiKey?: string;
  baseUrl?: string;
};

const OPENAI_MODELS_BASE_URL = process.env.OPENAI_BASE_URL;
const XAI_MODELS_BASE_URL = process.env.XAI_BASE_URL ?? 'https://api.x.ai/v1';
const DEEPSEEK_MODELS_BASE_URL = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
const MODEL_DISCOVERY_PROVIDERS: ProviderId[] = ['openai', 'gemini', 'xai', 'deepseek'];

const assertProviderSubset = (subset: ProviderId[], label: string) => {
  const invalid = subset.filter((id) => !PROVIDER_IDS.includes(id));
  if (invalid.length > 0) {
    throw new Error(`Provider list "${label}" has unknown ids: ${invalid.join(', ')}`);
  }
};

assertProviderSubset(MODEL_DISCOVERY_PROVIDERS, 'MODEL_DISCOVERY_PROVIDERS');

const sortModels = (models: string[]): string[] => {
  return [...models].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
  );
};

const dedupeModels = (models: string[]): string[] => {
  return sortModels(Array.from(new Set(models.map((model) => model.trim()).filter(Boolean))));
};

const fetchOpenAICompatibleModels = async (
  apiKey: string,
  baseURL: string | undefined,
  filter: (modelId: string) => boolean
): Promise<string[]> => {
  const client = new OpenAI({
    apiKey,
    baseURL,
    dangerouslyAllowBrowser: true,
  });
  const response = await client.models.list();
  return dedupeModels(response.data.map((model) => model.id).filter(filter));
};

const isOpenAIChatModel = (modelId: string): boolean => {
  return /^(gpt|chatgpt|o\d|o1|o3|o4|codex|computer-use)/i.test(modelId);
};

const isGrokModel = (modelId: string): boolean => modelId.toLowerCase().startsWith('grok');

const isDeepSeekModel = (modelId: string): boolean => modelId.toLowerCase().startsWith('deepseek');

const isGeminiGenerateModel = (model: GeminiModel): boolean => {
  const modelName = model.name?.replace(/^models\//, '') ?? '';
  if (!modelName.startsWith('gemini')) return false;

  const supportedActions = model.supportedActions ?? [];
  return supportedActions.includes('generateContent');
};

const fetchGeminiModels = async (apiKey: string): Promise<string[]> => {
  const client = new GoogleGenAI({ apiKey });
  const pager = await client.models.list();
  const models: string[] = [];

  for await (const model of pager) {
    if (!isGeminiGenerateModel(model)) continue;
    if (!model.name) continue;
    models.push(model.name.replace(/^models\//, ''));
  }

  return dedupeModels(models);
};

export const supportsProviderModelDiscovery = (providerId: ProviderId): boolean => {
  return MODEL_DISCOVERY_PROVIDERS.includes(providerId);
};

export const isModelDiscoveryApiKeyRequired = (providerId: ProviderId): boolean => {
  return supportsProviderModelDiscovery(providerId);
};

export const discoverProviderModels = async ({
  providerId,
  apiKey,
  baseUrl,
}: DiscoverProviderModelsOptions): Promise<string[]> => {
  const normalizedApiKey = apiKey?.trim() ?? '';

  if (isModelDiscoveryApiKeyRequired(providerId) && !normalizedApiKey) {
    throw new Error(t('settings.modelDiscovery.error.missingApiKey'));
  }

  switch (providerId) {
    case 'openai':
      return fetchOpenAICompatibleModels(
        normalizedApiKey,
        OPENAI_MODELS_BASE_URL,
        isOpenAIChatModel
      );
    case 'xai':
      return fetchOpenAICompatibleModels(normalizedApiKey, XAI_MODELS_BASE_URL, isGrokModel);
    case 'deepseek':
      return fetchOpenAICompatibleModels(
        normalizedApiKey,
        DEEPSEEK_MODELS_BASE_URL,
        isDeepSeekModel
      );
    case 'gemini':
      return fetchGeminiModels(normalizedApiKey);
    default:
      throw new Error(t('settings.modelDiscovery.error.unsupportedProvider'));
  }
};
