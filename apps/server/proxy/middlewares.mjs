export const registerCoreMiddlewares = async (
  app,
  { corsPlugin, isAllowedOrigin, proxyAuthEnabled, authToken, authHeader, parseHeaderValue }
) => {
  await app.register(corsPlugin, {
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
  });

  app.addHook('onSend', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    reply.header('X-Content-Type-Options', 'nosniff');
  });

  app.get('/health', async () => {
    return { ok: true, auth: proxyAuthEnabled };
  });

  return async (request, reply) => {
    if (!proxyAuthEnabled || request.method === 'OPTIONS') {
      return;
    }

    const token = parseHeaderValue(request.headers[authHeader]).trim();
    if (!token || token !== authToken) {
      await reply.code(401).send({ error: 'Unauthorized proxy request.' });
    }
  };
};
