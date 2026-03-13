import { ProviderId } from '../../types';
import { PROVIDER_IDS } from '../../../shared/provider-ids';
import { PROVIDER_CONFIGS, type ProviderCapabilities } from './providerConfig';

const DEFAULT_CAPABILITIES: ProviderCapabilities = {
  supportsTavily: false,
  supportsBaseUrl: false,
  supportsCustomHeaders: false,
  supportsRegion: false,
};

export const PROVIDER_CAPABILITIES = PROVIDER_IDS.reduce(
  (acc, id) => {
    acc[id] = PROVIDER_CONFIGS[id].capabilities;
    return acc;
  },
  {} as Record<ProviderId, ProviderCapabilities>
);

const assertProviderMappingCompleteness = (mapping: Record<ProviderId, unknown>, label: string) => {
  const missing = PROVIDER_IDS.filter((id) => !(id in mapping));
  if (missing.length > 0) {
    throw new Error(`Provider mapping "${label}" is missing: ${missing.join(', ')}`);
  }
};

assertProviderMappingCompleteness(PROVIDER_CAPABILITIES, 'PROVIDER_CAPABILITIES');

export const getProviderCapabilities = (providerId: ProviderId): ProviderCapabilities => {
  return PROVIDER_CAPABILITIES[providerId] ?? DEFAULT_CAPABILITIES;
};

export const supportsProviderTavily = (providerId: ProviderId): boolean => {
  return getProviderCapabilities(providerId).supportsTavily;
};
