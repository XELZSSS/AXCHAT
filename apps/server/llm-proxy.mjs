/* global console */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import corsPlugin from '@fastify/cors';
import proxyPlugin from '@fastify/http-proxy';
import {
  AUTH_HEADER,
  allowedOrigins,
  HOST,
  PORT,
  PROXY_AUTH_TOKEN,
  buildForwardHeaders,
  parseHeaderValue,
  isAllowedOrigin,
  normalizeTargetUrl,
  parseCustomHeaders,
  proxyAuthEnabled,
  staticProxyHttp2Enabled,
  staticRoutes,
} from './proxy/config.mjs';
import { registerCoreMiddlewares } from './proxy/middlewares.mjs';
import { registerOpenAICompatibleRoute, registerStaticProxyRoutes } from './proxy/routes.mjs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const loadConsoleStyleModule = () => {
  const candidates = [
    path.join(__dirname, '..', 'main', 'consoleStyle.cjs'),
    path.join(__dirname, '..', 'app.asar', 'apps', 'main', 'consoleStyle.cjs'),
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      if (error?.code !== 'MODULE_NOT_FOUND' && error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  throw new Error(
    `Unable to locate consoleStyle.cjs for the local proxy. Checked: ${candidates.join(', ')}`
  );
};

const { installConsoleStyle } = loadConsoleStyleModule();

installConsoleStyle('proxy');

const app = Fastify({ logger: false });

const verifyProxyAuth = await registerCoreMiddlewares(app, {
  corsPlugin,
  isAllowedOrigin,
  proxyAuthEnabled,
  authToken: PROXY_AUTH_TOKEN,
  authHeader: AUTH_HEADER,
  parseHeaderValue,
  host: HOST,
  port: PORT,
  staticProxyHttp2Enabled,
  staticRoutes,
  allowedOrigins: Array.from(allowedOrigins),
});

await registerStaticProxyRoutes(app, {
  proxyPlugin,
  routes: staticRoutes,
  verifyProxyAuth,
  buildForwardHeaders,
  proxyHttp2: staticProxyHttp2Enabled,
});

await registerOpenAICompatibleRoute(app, {
  verifyProxyAuth,
  normalizeTargetUrl,
  parseCustomHeaders,
  parseHeaderValue,
  buildForwardHeaders,
});

await app.listen({ port: PORT, host: HOST });
console.log(`LLM proxy listening on http://${HOST}:${PORT}`);
