import * as proxyRoutes from './proxy-routes';

export type StaticProxyRoute = (typeof proxyRoutes.STATIC_PROXY_ROUTES)[number];
export type ProxyRouteId = keyof typeof proxyRoutes.PROXY_ROUTES;

export const DEFAULT_PROXY_PORT = '4010';
export const DEFAULT_PROXY_HOST = '127.0.0.1';

export const normalizeString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 && normalized !== 'undefined' ? normalized : undefined;
};

export const resolveProxyPort = (value: unknown): string => {
  const parsed = Number.parseInt(normalizeString(value) ?? DEFAULT_PROXY_PORT, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 65535) {
    return DEFAULT_PROXY_PORT;
  }
  return String(parsed);
};

export const resolveProxyHost = (value: unknown): string =>
  normalizeString(value) ?? DEFAULT_PROXY_HOST;

export const buildProxyOrigin = ({ host, port }: { host: string; port: string }): string =>
  `http://${host}:${port}`;

export const {
  PROXY_PATH_PREFIX,
  PROXY_ROUTES,
  OPENAI_COMPATIBLE_ROUTE_PATTERNS,
  STATIC_PROXY_ROUTES,
} = proxyRoutes;

export const resolveProxyPath = (routeId: ProxyRouteId): string => PROXY_ROUTES[routeId];
