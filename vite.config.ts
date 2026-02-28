import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const PROCESS_ENV_KEYS = [
  'API_KEY',
  'GEMINI_API_KEY',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'OPENAI_BASE_URL',
  'OPENAI_COMPATIBLE_API_KEY',
  'OPENAI_COMPATIBLE_MODEL',
  'OPENAI_COMPATIBLE_BASE_URL',
  'OPENROUTER_API_KEY',
  'OPENROUTER_MODEL',
  'OPENROUTER_BASE_URL',
  'OPENROUTER_SITE_URL',
  'OPENROUTER_APP_NAME',
  'TAVILY_API_KEY',
  'TAVILY_PROJECT_ID',
  'TAVILY_SEARCH_DEPTH',
  'TAVILY_MAX_RESULTS',
  'TAVILY_TOPIC',
  'TAVILY_INCLUDE_ANSWER',
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_MODEL',
  'DEEPSEEK_BASE_URL',
  'GLM_API_KEY',
  'GLM_MODEL',
  'GLM_BASE_URL',
  'MOONSHOT_API_KEY',
  'MOONSHOT_MODEL',
  'MOONSHOT_BASE_URL',
  'IFLOW_API_KEY',
  'IFLOW_MODEL',
  'IFLOW_BASE_URL',
  'MINIMAX_API_KEY',
  'MINIMAX_MODEL',
  'MINIMAX_BASE_URL',
  'MINIMAX_PROXY_PORT',
  'ACHATX_PROXY_TOKEN',
] as const;

const buildProcessEnvDefines = (
  env: Record<string, string | undefined>
): Record<string, string> => {
  const defines: Record<string, string> = {};
  for (const key of PROCESS_ENV_KEYS) {
    defines[`process.env.${key}`] = JSON.stringify(env[key]);
  }
  return defines;
};

const buildV1Proxy = (target: string, prefix: string) => ({
  target,
  changeOrigin: true,
  secure: true,
  rewrite: (requestPath: string) => requestPath.replace(new RegExp(`^/${prefix}`), '/v1'),
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const devServerHost = env.VITE_DEV_HOST || '127.0.0.1';
  return {
    root: path.resolve(__dirname, 'apps/renderer'),
    base: './',
    server: {
      port: 3000,
      host: devServerHost,
      proxy: {
        '/minimax-intl': buildV1Proxy('https://api.minimax.io', 'minimax-intl'),
        '/minimax-cn': buildV1Proxy('https://api.minimaxi.com', 'minimax-cn'),
      },
    },
    plugins: [react()],
    define: {
      __APP_ENV__: JSON.stringify(mode),
      ...buildProcessEnvDefines({ ...env, API_KEY: env.GEMINI_API_KEY }),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'apps/renderer'),
      },
    },
    build: {
      target: 'es2022',
      modulePreload: {
        polyfill: false,
      },
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            genai: ['@google/genai'],
            icons: ['lucide-react'],
            utils: ['uuid'],
          },
        },
      },
    },
  };
});
