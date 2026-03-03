import { buildProxyUrl, getProxyAuthHeaders } from './providers/proxy';

const MEM0_EXPORT_POLL_INTERVAL_MS = 1500;
const MEM0_EXPORT_MAX_POLLS = 40;

const DEFAULT_EXPORT_SCHEMA = {
  title: 'AchatXMemoryExport',
  type: 'object',
  properties: {
    memory: { type: 'string' },
    user_id: { type: 'string' },
    app_id: { type: 'string' },
    run_id: { type: 'string' },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
    metadata: { type: 'object' },
  },
  required: ['memory'],
};

type CreateMemoryExportResponse = {
  id?: string;
  memory_export_id?: string;
};

type MemoryExportStatusResponse = {
  status?: string;
  error?: string;
  [key: string]: unknown;
};

type ExportOptions = {
  apiKey: string;
  userId: string;
};

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const getMem0Headers = (apiKey: string): HeadersInit => {
  return {
    ...getProxyAuthHeaders(),
    Authorization: `Token ${apiKey}`,
    'Content-Type': 'application/json',
  };
};

const parseJsonResponse = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const readResponseErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  const parsed = await parseJsonResponse(response);
  const message =
    (parsed as { error?: string; message?: string })?.error ??
    (parsed as { error?: string; message?: string })?.message;
  if (message) return message;
  return `${fallback} (${response.status})`;
};

const normalizeStatus = (value: unknown): string => String(value ?? '').toLowerCase();

const isPendingStatus = (status: string): boolean => {
  return ['queued', 'pending', 'processing', 'running', 'in_progress', 'created'].includes(status);
};

const isFailedStatus = (status: string): boolean => {
  return ['failed', 'error', 'cancelled'].includes(status);
};

const resolveExportId = (response: CreateMemoryExportResponse): string | null => {
  const raw = response.id ?? response.memory_export_id;
  if (!raw) return null;
  const normalized = String(raw).trim();
  return normalized.length > 0 ? normalized : null;
};

const hasExportPayload = (payload: MemoryExportStatusResponse): boolean => {
  return (
    payload.data !== undefined || payload.memories !== undefined || payload.items !== undefined
  );
};

export const exportMem0Memories = async ({ apiKey, userId }: ExportOptions): Promise<unknown> => {
  const createResponse = await fetch(buildProxyUrl('/proxy/mem0/exports'), {
    method: 'POST',
    headers: getMem0Headers(apiKey),
    body: JSON.stringify({
      schema: DEFAULT_EXPORT_SCHEMA,
      filters: {
        user_id: userId,
      },
    }),
  });

  if (!createResponse.ok) {
    throw new Error(
      await readResponseErrorMessage(createResponse, 'Failed to create memory export.')
    );
  }

  const createData = (await parseJsonResponse(createResponse)) as CreateMemoryExportResponse;
  const exportId = resolveExportId(createData);
  if (!exportId) {
    throw new Error('Failed to create memory export: missing export id.');
  }

  for (let attempt = 0; attempt < MEM0_EXPORT_MAX_POLLS; attempt += 1) {
    if (attempt > 0) {
      await delay(MEM0_EXPORT_POLL_INTERVAL_MS);
    }

    const statusResponse = await fetch(buildProxyUrl('/proxy/mem0/exports/get'), {
      method: 'POST',
      headers: getMem0Headers(apiKey),
      body: JSON.stringify({
        memory_export_id: exportId,
      }),
    });

    if (!statusResponse.ok) {
      throw new Error(
        await readResponseErrorMessage(statusResponse, 'Failed to fetch export status.')
      );
    }

    const statusData = (await parseJsonResponse(statusResponse)) as MemoryExportStatusResponse;
    const status = normalizeStatus(statusData.status);

    if (isFailedStatus(status)) {
      throw new Error(statusData.error || 'Memory export failed.');
    }

    if (
      status === 'completed' ||
      (status && !isPendingStatus(status) && hasExportPayload(statusData))
    ) {
      return {
        exportId,
        ...statusData,
      };
    }

    if (!status && hasExportPayload(statusData)) {
      return {
        exportId,
        ...statusData,
      };
    }
  }

  throw new Error('Memory export timed out. Please try again.');
};

export const downloadMemoryExport = (payload: unknown, userId: string): void => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `achatx-mem0-${userId || 'user'}-${timestamp}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};
