import * as proxyConfig from '../../../shared/proxy-config';

const AUTH_HEADER = 'x-axchat-proxy-token';

const normalizeString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 && normalized !== 'undefined' ? normalized : undefined;
};

const resolveProxyPort = (value: unknown): string => proxyConfig.resolveProxyPort(value);

const resolveProxyHost = (value: unknown): string =>
  normalizeString(value) ?? proxyConfig.DEFAULT_PROXY_HOST;

const buildProxyOrigin = ({ host, port }: { host: string; port: string }): string =>
  proxyConfig.buildProxyOrigin({ host, port });

const readProxyPort = (): string => {
  const fromBridge = typeof window !== 'undefined' ? window.axchat?.getProxyPort?.() : undefined;
  const fromEnv = process.env.MINIMAX_PROXY_PORT;
  return resolveProxyPort(fromBridge ?? fromEnv);
};

const readProxyHost = (): string => {
  const fromBridge = typeof window !== 'undefined' ? window.axchat?.getProxyHost?.() : undefined;
  const fromEnv = process.env.MINIMAX_PROXY_HOST;
  return resolveProxyHost(fromBridge ?? fromEnv);
};

export const getProxyBaseUrl = (): string => {
  return buildProxyOrigin({
    host: readProxyHost(),
    port: readProxyPort(),
  });
};

export const buildProxyUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getProxyBaseUrl()}${normalizedPath}`;
};

export const getProxyAuthHeaders = (): Record<string, string> => {
  return {};
};

const isLocalProxyTarget = (target?: string): boolean => {
  if (!target) return false;
  try {
    const url = new URL(target);
    const currentProxyHost = readProxyHost();
    const isLoopback =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === currentProxyHost;
    if (!isLoopback) return false;
    return url.pathname.startsWith(proxyConfig.PROXY_PATH_PREFIX);
  } catch {
    return false;
  }
};

export const getProxyAuthHeadersForTarget = (target?: string): Record<string, string> => {
  if (!isLocalProxyTarget(target)) return {};
  return getProxyAuthHeaders();
};
