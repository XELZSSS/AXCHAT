/* global Buffer, fetch */
import { Readable } from 'node:stream';

const OPENAI_COMPATIBLE_PATH_HEADER = 'x-axchat-openai-compatible-path-mode';

const buildRequestBody = (request) => {
  return request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : typeof request.body === 'string' || Buffer.isBuffer(request.body)
      ? request.body
      : request.body !== undefined
        ? JSON.stringify(request.body)
        : undefined;
};

const sendProxyError = async (reply, statusCode, message) => {
  await reply.code(statusCode).send({ error: message });
};

const buildTargetUrl = ({ target, wildcardPath, queryString, pathMode }) => {
  const normalizedTarget = target.replace(/\/+$/, '');
  return pathMode === 'direct'
    ? `${normalizedTarget}/${wildcardPath}${queryString}`
    : `${normalizedTarget}/v1/${wildcardPath}${queryString}`;
};

const forwardUpstreamRequest = async ({ targetUrl, request, upstreamHeaders, body }) => {
  return fetch(targetUrl, {
    method: request.method,
    headers: upstreamHeaders,
    body,
    duplex: body ? 'half' : undefined,
  });
};

export const registerStaticProxyRoutes = async (
  app,
  { proxyPlugin, routes, verifyProxyAuth, buildForwardHeaders, proxyHttp2 }
) => {
  for (const route of routes) {
    await app.register(proxyPlugin, {
      prefix: route.path,
      upstream: route.target,
      rewritePrefix: route.rewrite,
      http2: proxyHttp2,
      preHandler: verifyProxyAuth,
      replyOptions: {
        rewriteRequestHeaders: (_request, headers) => {
          return buildForwardHeaders(headers, { removeBlockedHeaders: true });
        },
      },
    });
  }
};

export const registerOpenAICompatibleRoute = async (
  app,
  { verifyProxyAuth, normalizeTargetUrl, parseCustomHeaders, parseHeaderValue, buildForwardHeaders }
) => {
  const handler = async (request, reply) => {
    await verifyProxyAuth(request, reply);
    if (reply.sent) return;

    const target = normalizeTargetUrl(request.headers['x-openai-compatible-base-url']);
    if (!target) {
      await reply.code(400).send({ error: 'Missing or invalid OpenAI-Compatible base URL.' });
      return;
    }

    const wildcardPath = String(request.params['*'] ?? '').replace(/^\/+/, '');
    const queryIndex = request.raw.url?.indexOf('?') ?? -1;
    const queryString = queryIndex >= 0 ? request.raw.url.slice(queryIndex) : '';
    const pathMode = parseHeaderValue(request.headers[OPENAI_COMPATIBLE_PATH_HEADER]).trim();
    const targetUrl = buildTargetUrl({ target, wildcardPath, queryString, pathMode });
    const upstreamHeaders = buildForwardHeaders(request.headers, {
      removeBlockedHeaders: true,
      customHeaders: parseCustomHeaders(request.headers['x-openai-compatible-headers']),
    });
    const body = buildRequestBody(request);

    let upstreamResponse;
    try {
      upstreamResponse = await forwardUpstreamRequest({
        targetUrl,
        request,
        upstreamHeaders,
        body,
      });
    } catch (error) {
      await sendProxyError(
        reply,
        502,
        error instanceof Error ? error.message : 'Upstream request failed.'
      );
      return;
    }

    reply.code(upstreamResponse.status);
    for (const [key, value] of upstreamResponse.headers.entries()) {
      if (['connection', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        continue;
      }
      reply.header(key, value);
    }

    if (!upstreamResponse.body) {
      return reply.send(await upstreamResponse.text());
    }

    return reply.send(Readable.fromWeb(upstreamResponse.body));
  };

  for (const url of ['/proxy/openai-compatible/v1/*', '/proxy/openai-compatible/*']) {
    app.route({
      method: ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'],
      url,
      handler,
    });
  }
};
