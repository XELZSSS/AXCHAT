export const registerCoreMiddlewares = async (
  app,
  { corsPlugin, isAllowedOrigin, proxyAuthEnabled, authToken, authHeader, parseHeaderValue }
) => {
  await app.register(corsPlugin, {
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
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
