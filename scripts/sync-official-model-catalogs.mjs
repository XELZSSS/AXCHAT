/* global URL, console, fetch, process */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_FILE);
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
const MODELS_FILE = path.join(ROOT_DIR, 'apps', 'renderer', 'services', 'providers', 'models.ts');

const providerConfigs = [
  {
    providerId: 'glm',
    exportName: 'GLM_MODEL_CATALOG',
    sourceUrl: 'https://open.bigmodel.cn/dev-api#language-model',
    patterns: [/glm-[A-Za-z0-9.-]+/g],
    filter: (value) => /^glm-\d/.test(value),
    assetSourcePatterns: [/<script[^>]+src="([^"]+)"/g],
    assetUrlFilter: (url) => url.includes('/js/app.'),
    manualModels: ['glm-4.7-flash'],
  },
  {
    providerId: 'minimax',
    exportName: 'MINIMAX_MODEL_CATALOG',
    sourceUrl:
      'https://platform.minimaxi.com/document/ChatCompletion_v2?key=66701c8da7703f6d387f9879',
    patterns: [/MiniMax-[A-Za-z0-9.-]+/g],
    filter: (value) => /^MiniMax-/.test(value) && !value.includes('AI'),
  },
  {
    providerId: 'moonshot',
    exportName: 'MOONSHOT_MODEL_CATALOG',
    sourceUrl: 'https://platform.moonshot.cn/docs/guide/start-using-kimi-api',
    patterns: [/kimi-[A-Za-z0-9.-]+/g],
    filter: (value) =>
      /^kimi-/.test(value) &&
      !value.endsWith('.js') &&
      !value.endsWith('.mdx') &&
      !value.includes('quickstart') &&
      !value.includes('setup-agent') &&
      !value.includes('vision-model') &&
      !value.includes('tool-calls') &&
      !value.includes('file-based-qa') &&
      value !== 'kimi-api' &&
      value !== 'kimi-k2' &&
      value !== 'kimi-api-for-file-based-qa' &&
      value !== 'kimi-api-to-complete-tool-calls' &&
      value !== 'kimi-cli-support' &&
      value !== 'kimi-in-openclaw',
    assetSourcePatterns: [/<script[^>]+src="([^"]+)"/g],
    assetUrlFilter: (url) => url.includes('/_next/static/chunks/'),
  },
];

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const shouldWrite = args.has('--write');
const jsonOutput = args.has('--json');
const providerFilterValues = rawArgs.reduce((acc, arg, index) => {
  if (arg !== '--provider') return acc;
  const value = rawArgs[index + 1]?.trim();
  if (value) acc.push(value);
  return acc;
}, []);
const providerFilter = new Set(providerFilterValues);

const log = (...values) => {
  if (!jsonOutput) {
    console.log(...values);
  }
};

const diagnosticLog = (...values) => {
  if (jsonOutput) {
    console.error(...values);
    return;
  }

  console.log(...values);
};

const fetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; AXCHATModelSync/1.0)',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
};

const resolveAssetUrls = (html, baseUrl, config) => {
  if (!config.assetSourcePatterns?.length) return [];

  const assetUrls = new Set();
  for (const pattern of config.assetSourcePatterns) {
    for (const match of html.matchAll(pattern)) {
      const rawUrl = match[1]?.trim();
      if (!rawUrl) continue;
      const resolvedUrl = rawUrl.startsWith('http') ? rawUrl : new URL(rawUrl, baseUrl).toString();
      if (config.assetUrlFilter && !config.assetUrlFilter(resolvedUrl)) continue;
      assetUrls.add(resolvedUrl);
    }
  }

  return [...assetUrls];
};

const sortModels = (models) => {
  return [...models].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
  );
};

const extractModelsFromText = (text, config) => {
  const matches = new Set();

  for (const pattern of config.patterns) {
    for (const value of text.match(pattern) ?? []) {
      const normalized = value.trim();
      if (normalized && config.filter(normalized)) {
        matches.add(normalized);
      }
    }
  }

  return sortModels([...matches]);
};

const renderCatalog = (exportName, models) => {
  const entries = models.map((model) => `  '${model}',`).join('\n');
  return `export const ${exportName} = [\n${entries}\n];`;
};

const replaceCatalog = (source, exportName, models) => {
  const pattern = new RegExp(`export const ${exportName} = \\[(.|\\r|\\n)*?\\];`);
  return source.replace(pattern, renderCatalog(exportName, models));
};

const readExistingCatalog = (source, exportName) => {
  const pattern = new RegExp(`export const ${exportName} = \\[(.|\\r|\\n)*?\\];`);
  const match = source.match(pattern);
  if (!match) return [];

  const models = [];
  for (const entry of match[0].matchAll(/'([^']+)'/g)) {
    const model = entry[1]?.trim();
    if (model) {
      models.push(model);
    }
  }

  return sortModels(models);
};

const loadExistingCatalogSource = async () => {
  try {
    return await fs.readFile(MODELS_FILE, 'utf8');
  } catch (error) {
    if (shouldWrite) {
      throw error;
    }
    return '';
  }
};

const main = async () => {
  const selectedConfigs =
    providerFilter.size > 0
      ? providerConfigs.filter((config) => providerFilter.has(config.providerId))
      : providerConfigs;

  if (providerFilter.size > 0 && selectedConfigs.length === 0) {
    const message = `No matching providers for: ${[...providerFilter].join(', ')}. Available: ${providerConfigs
      .map((config) => config.providerId)
      .join(', ')}`;
    if (jsonOutput) {
      console.log(
        JSON.stringify({
          providers: [],
          updatedCount: 0,
          wrote: false,
          error: message,
        })
      );
      return;
    }
    console.log(message);
    return;
  }

  const currentSource = await loadExistingCatalogSource();
  let nextSource = currentSource;
  let updatedCount = 0;
  const results = [];

  for (const config of selectedConfigs) {
    try {
      const html = await fetchPage(config.sourceUrl);
      const matches = new Set(extractModelsFromText(html, config));
      const assetUrls = resolveAssetUrls(html, config.sourceUrl, config);

      for (const assetUrl of assetUrls) {
        try {
          const assetText = await fetchPage(assetUrl);
          for (const model of extractModelsFromText(assetText, config)) {
            matches.add(model);
          }
        } catch (error) {
          diagnosticLog(
            `[${config.providerId}] failed to inspect asset ${assetUrl}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      for (const model of config.manualModels ?? []) {
        matches.add(model);
      }

      for (const model of readExistingCatalog(currentSource, config.exportName)) {
        matches.add(model);
      }

      const models = sortModels([...matches]);

      if (models.length === 0) {
        log(`[${config.providerId}] no model ids discovered from ${config.sourceUrl}`);
        log(`[${config.providerId}] manual review required`);
        results.push({
          providerId: config.providerId,
          sourceUrl: config.sourceUrl,
          models: [],
          error: 'manual review required',
        });
        continue;
      }

      log(`[${config.providerId}] discovered ${models.length} model(s)`);
      log(models.join(', '));
      results.push({
        providerId: config.providerId,
        sourceUrl: config.sourceUrl,
        models,
      });

      if (!shouldWrite) continue;

      const candidateSource = replaceCatalog(nextSource, config.exportName, models);
      if (candidateSource !== nextSource) {
        nextSource = candidateSource;
        updatedCount += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[${config.providerId}] failed to fetch ${config.sourceUrl}: ${message}`);
      results.push({
        providerId: config.providerId,
        sourceUrl: config.sourceUrl,
        models: [],
        error: message,
      });
    }
  }

  if (jsonOutput) {
    console.log(
      JSON.stringify({
        providers: results,
        updatedCount,
        wrote: shouldWrite && updatedCount > 0,
      })
    );
    if (!shouldWrite || updatedCount === 0) {
      return;
    }
  }

  if (!shouldWrite) {
    log('Dry run only. Re-run with --write to update apps/renderer/services/providers/models.ts');
    return;
  }

  if (updatedCount === 0) {
    log('No catalogs were updated.');
    return;
  }

  await fs.writeFile(MODELS_FILE, nextSource, 'utf8');
  log(`Updated ${updatedCount} catalog(s) in ${MODELS_FILE}`);
};

await main();
