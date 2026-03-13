/* global process, URL */
import proxyConfig from '../../shared/proxy-config.cjs';

const { resolveProxyPort, resolveProxyHost } = proxyConfig;

export const PORT = Number(resolveProxyPort(process.env.MINIMAX_PROXY_PORT));
export const HOST = resolveProxyHost(process.env.MINIMAX_PROXY_HOST);
export const AUTH_HEADER = 'x-axchat-proxy-token';
export const PROXY_AUTH_TOKEN = (process.env.AXCHAT_PROXY_TOKEN ?? '').trim();
export const proxyAuthEnabled = PROXY_AUTH_TOKEN.length > 0;
export const staticProxyHttp2Enabled = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.AXCHAT_PROXY_STATIC_HTTP2 ?? '')
    .trim()
    .toLowerCase()
);
export const allowHttpTargets = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.AXCHAT_PROXY_ALLOW_HTTP_TARGETS ?? '')
    .trim()
    .toLowerCase()
);

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

export const parseHeaderValue = (value) => {
  if (!value) return '';
  if (Array.isArray(value)) return value[0] ?? '';
  return String(value);
};

const normalizeHeaderString = (value) => parseHeaderValue(value).trim();

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const allowedOrigins = new Set(DEFAULT_ALLOWED_ORIGINS);
const additionalAllowedOrigins = (process.env.MINIMAX_PROXY_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
for (const origin of additionalAllowedOrigins) {
  allowedOrigins.add(origin);
}

export const isAllowedOrigin = (origin) => {
  if (!origin || origin === 'null') return true;
  return allowedOrigins.has(origin);
};

export const blockedHeaders = new Set([
  'host',
  'connection',
  'content-length',
  'accept-encoding',
  'origin',
  'referer',
  AUTH_HEADER,
  'x-minimax-api-key',
  'x-openai-compatible-base-url',
  'x-openai-compatible-headers',
  'x-axchat-openai-compatible-auth-mode',
  'x-axchat-openai-compatible-path-mode',
]);

export const normalizeTargetUrl = (value) => {
  const raw = normalizeHeaderString(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.protocol === 'http:' && !allowHttpTargets) return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
};

export const parseCustomHeaders = (value) => {
  const raw = normalizeHeaderString(value);
  if (!raw) return [];
  const parsed = safeJsonParse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((header) => ({
      key: String(header?.key ?? '').trim(),
      value: String(header?.value ?? '').trim(),
    }))
    .filter((header) => header.key && header.value);
};

export const buildForwardHeaders = (
  headers,
  { removeBlockedHeaders = false, customHeaders = [] } = {}
) => {
  const next = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (value === undefined) continue;
    if (removeBlockedHeaders && blockedHeaders.has(key.toLowerCase())) continue;
    next[key] = value;
  }

  const key = normalizeHeaderString((headers ?? {})['x-minimax-api-key']);
  if (key) {
    next.authorization = `Bearer ${key}`;
    for (const existingHeaderKey of Object.keys(next)) {
      if (existingHeaderKey.toLowerCase() === 'x-minimax-api-key') {
        delete next[existingHeaderKey];
      }
    }
  }

  for (const header of customHeaders) {
    const headerKey = String(header.key ?? '').trim();
    const headerValue = String(header.value ?? '').trim();
    if (!headerKey || !headerValue) continue;
    if (blockedHeaders.has(headerKey.toLowerCase())) continue;
    next[headerKey] = headerValue;
  }

  return next;
};

export const staticRoutes = proxyConfig.STATIC_PROXY_ROUTES;
