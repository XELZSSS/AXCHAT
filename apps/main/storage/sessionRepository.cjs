/* global console */
const { ensureDatabase } = require('./db.cjs');
const { randomUUID } = require('crypto');

const ACTIVE_SESSION_ID_KEY = 'activeSessionId';
const { PROVIDER_IDS } = require('../../shared/provider-ids.cjs');
const VALID_PROVIDER_IDS = new Set(PROVIDER_IDS);
const VALID_MESSAGE_ROLES = new Set(['user', 'model']);
const DEFAULT_PROVIDER_ID = 'gemini';

const parseJsonField = (value, fallback) => {
  if (typeof value !== 'string' || value.length === 0) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeTimestamp = (value, fallback = Date.now()) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const assertNonEmptyString = (value, fieldName) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid session payload: "${fieldName}" must be a non-empty string`);
  }

  return value.trim();
};

const assertProviderId = (value) => {
  const providerId = assertNonEmptyString(value, 'provider');
  if (!VALID_PROVIDER_IDS.has(providerId)) {
    throw new Error(`Invalid session payload: unsupported provider "${providerId}"`);
  }
  return providerId;
};

const normalizeStoredProviderId = (value) => {
  return typeof value === 'string' && VALID_PROVIDER_IDS.has(value) ? value : DEFAULT_PROVIDER_ID;
};

const normalizeToolCall = (value, index) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid session payload: "toolCalls[${index}]" must be an object`);
  }

  return {
    id: assertNonEmptyString(value.id, `toolCalls[${index}].id`),
    name: assertNonEmptyString(value.name, `toolCalls[${index}].name`),
    argumentsText: typeof value.argumentsText === 'string' ? value.argumentsText : '',
    source: value.source === 'native' ? 'native' : value.source === 'custom' ? 'custom' : undefined,
    provider:
      typeof value.provider === 'string' && VALID_PROVIDER_IDS.has(value.provider)
        ? value.provider
        : undefined,
  };
};

const normalizeToolResult = (value, index) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid session payload: "toolResults[${index}]" must be an object`);
  }

  return {
    id: assertNonEmptyString(value.id, `toolResults[${index}].id`),
    name: assertNonEmptyString(value.name, `toolResults[${index}].name`),
    outputText: typeof value.outputText === 'string' ? value.outputText : '',
    isError: Boolean(value.isError),
    source: value.source === 'native' ? 'native' : value.source === 'custom' ? 'custom' : undefined,
    provider:
      typeof value.provider === 'string' && VALID_PROVIDER_IDS.has(value.provider)
        ? value.provider
        : undefined,
  };
};

const normalizeTokenUsage = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid session payload: "tokenUsage" must be an object');
  }

  const normalized = {};
  const numericFields = [
    'totalTokensIn',
    'totalTokensOut',
    'totalCacheWrites',
    'totalCacheReads',
    'totalCost',
    'contextTokens',
  ];

  for (const field of numericFields) {
    const candidate = value[field];
    if (candidate === undefined) {
      continue;
    }
    if (typeof candidate !== 'number' || Number.isFinite(candidate) === false) {
      throw new Error(`Invalid session payload: "tokenUsage.${field}" must be a finite number`);
    }
    normalized[field] = candidate;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const normalizeMessage = (value, index) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid session payload: "messages[${index}]" must be an object`);
  }

  const role = assertNonEmptyString(value.role, `messages[${index}].role`);
  if (!VALID_MESSAGE_ROLES.has(role)) {
    throw new Error(`Invalid session payload: unsupported role "${role}"`);
  }

  return {
    id: normalizeMessageId(value.id),
    role,
    text: typeof value.text === 'string' ? value.text : '',
    timestamp: normalizeTimestamp(value.timestamp),
    reasoning:
      typeof value.reasoning === 'string' && value.reasoning.length > 0
        ? value.reasoning
        : undefined,
    isError: Boolean(value.isError),
    tokenUsage: normalizeTokenUsage(value.tokenUsage),
    toolCalls: Array.isArray(value.toolCalls)
      ? value.toolCalls.map((toolCall, toolCallIndex) => normalizeToolCall(toolCall, toolCallIndex))
      : undefined,
    toolResults: Array.isArray(value.toolResults)
      ? value.toolResults.map((toolResult, toolResultIndex) =>
          normalizeToolResult(toolResult, toolResultIndex)
        )
      : undefined,
    citations: Array.isArray(value.citations) ? value.citations : undefined,
  };
};

const normalizeSessionPayload = (session) => {
  if (!session || typeof session !== 'object' || Array.isArray(session)) {
    throw new Error('Invalid session payload: expected an object');
  }

  return {
    id: assertNonEmptyString(session.id, 'id'),
    title: assertNonEmptyString(session.title, 'title'),
    provider: assertProviderId(session.provider),
    model: assertNonEmptyString(session.model, 'model'),
    createdAt: normalizeTimestamp(session.createdAt),
    updatedAt: normalizeTimestamp(session.updatedAt),
    messages: Array.isArray(session.messages)
      ? session.messages.map((message, index) => normalizeMessage(message, index))
      : [],
  };
};

const normalizeMessageRow = (row) => ({
  id: row.id,
  role: row.role,
  text: row.text,
  timestamp: normalizeTimestamp(row.timestamp, row.created_at),
  reasoning:
    typeof row.reasoning === 'string' && row.reasoning.length > 0 ? row.reasoning : undefined,
  isError: Boolean(row.is_error),
  tokenUsage: parseJsonField(row.token_usage_json, undefined),
  toolCalls: parseJsonField(row.tool_calls_json, undefined),
  toolResults: parseJsonField(row.tool_results_json, undefined),
  citations: parseJsonField(row.citations_json, undefined),
});

const normalizeSessionRow = (row, messages) => ({
  id: row.id,
  title: row.title,
  provider: normalizeStoredProviderId(row.provider_id),
  model: row.model_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  messages,
});

const getSessionRow = (sessionId) => {
  const db = ensureDatabase();
  return db
    .prepare(
      `SELECT id, title, provider_id, model_name, created_at, updated_at
       FROM sessions
       WHERE id = ?`
    )
    .get(String(sessionId));
};

const listSessionMessages = (sessionId) => {
  const db = ensureDatabase();
  const rows = db
    .prepare(
      `SELECT id, session_id, seq, role, text, timestamp, reasoning, is_error,
              token_usage_json, tool_calls_json, tool_results_json, citations_json, created_at
       FROM messages
       WHERE session_id = ?
       ORDER BY seq ASC`
    )
    .all(String(sessionId));

  return rows.map((row) => normalizeMessageRow(row));
};

const listSessions = () => {
  const db = ensureDatabase();
  const sessionRows = db
    .prepare(
      `SELECT id, title, provider_id, model_name, created_at, updated_at
       FROM sessions
      ORDER BY updated_at DESC`
    )
    .all();

  return sessionRows.map((row) => normalizeSessionRow(row, []));
};

const searchSessions = (query, limit = 200) => {
  const normalizedQuery = typeof query === 'string' ? query.trim() : '';
  if (!normalizedQuery) {
    return listSessions().slice(0, Math.max(1, Math.min(500, Number(limit) || 200)));
  }

  const db = ensureDatabase();
  const maxLimit = Math.max(1, Math.min(500, Number(limit) || 200));
  const keyword = `%${normalizedQuery}%`;

  const rows = db
    .prepare(
      `SELECT DISTINCT s.id, s.title, s.provider_id, s.model_name, s.created_at, s.updated_at
       FROM sessions s
       LEFT JOIN messages m ON m.session_id = s.id
       WHERE s.title LIKE @keyword COLLATE NOCASE
          OR m.text LIKE @keyword COLLATE NOCASE
       ORDER BY s.updated_at DESC
       LIMIT @limit`
    )
    .all({
      keyword,
      limit: maxLimit,
    });

  return rows.map((row) => normalizeSessionRow(row, []));
};

const getSession = (sessionId) => {
  const row = getSessionRow(sessionId);
  if (!row) {
    return null;
  }

  return normalizeSessionRow(row, listSessionMessages(sessionId));
};

const getActiveSessionId = () => {
  const db = ensureDatabase();
  const row = db
    .prepare(`SELECT value_json FROM app_settings WHERE key = ?`)
    .get(ACTIVE_SESSION_ID_KEY);

  if (!row) {
    return null;
  }

  const parsed = parseJsonField(row.value_json, null);
  return typeof parsed === 'string' && parsed.trim().length > 0 ? parsed : null;
};

const saveActiveSessionId = (sessionId) => {
  const db = ensureDatabase();
  const now = Date.now();
  const normalizedSessionId = assertNonEmptyString(sessionId, 'activeSessionId');

  db.prepare(
    `INSERT INTO app_settings (key, value_json, updated_at)
     VALUES (@key, @value_json, @updated_at)
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_at = excluded.updated_at`
  ).run({
    key: ACTIVE_SESSION_ID_KEY,
    value_json: JSON.stringify(normalizedSessionId),
    updated_at: now,
  });
};

const clearActiveSessionId = () => {
  const db = ensureDatabase();
  db.prepare(`DELETE FROM app_settings WHERE key = ?`).run(ACTIVE_SESSION_ID_KEY);
};

const serializeJsonField = (value) => {
  if (value === undefined) {
    return null;
  }
  return JSON.stringify(value);
};

const normalizeMessageId = (value) => {
  if (typeof value !== 'string') {
    return `message-${randomUUID()}`;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : `message-${randomUUID()}`;
};

const ensureUniqueMessageIds = (messages) => {
  const usedIds = new Set();

  return messages.map((message) => {
    const baseId = normalizeMessageId(message?.id);
    let nextId = baseId;
    let duplicateCounter = 1;

    while (usedIds.has(nextId)) {
      nextId = `${baseId}__${duplicateCounter}`;
      duplicateCounter += 1;
    }

    usedIds.add(nextId);
    return {
      ...message,
      id: nextId,
    };
  });
};

const saveSession = (session) => {
  const db = ensureDatabase();
  const normalizedSession = normalizeSessionPayload(session);
  const messages = ensureUniqueMessageIds(normalizedSession.messages);

  const persistSession = db.transaction((payload) => {
    db.prepare(
      `INSERT INTO sessions (
         id, title, provider_id, model_name, created_at, updated_at
       ) VALUES (
         @id, @title, @provider_id, @model_name, @created_at, @updated_at
       )
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         provider_id = excluded.provider_id,
         model_name = excluded.model_name,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at`
    ).run({
      id: payload.id,
      title: payload.title,
      provider_id: payload.provider,
      model_name: payload.model,
      created_at: normalizeTimestamp(payload.createdAt),
      updated_at: normalizeTimestamp(payload.updatedAt),
    });

    const normalizedSessionId = payload.id;
    const incomingMessageIds = payload.messages.map((message) => message.id);

    if (incomingMessageIds.length === 0) {
      db.prepare(`DELETE FROM messages WHERE session_id = ?`).run(normalizedSessionId);
      return;
    }

    const stalePlaceholders = incomingMessageIds.map(() => '?').join(', ');
    db.prepare(
      `DELETE FROM messages
       WHERE session_id = ?
         AND id NOT IN (${stalePlaceholders})`
    ).run(normalizedSessionId, ...incomingMessageIds);

    db.prepare(`UPDATE messages SET seq = -seq - 1 WHERE session_id = ?`).run(normalizedSessionId);

    const upsertMessage = db.prepare(
      `INSERT INTO messages (
         id, session_id, seq, role, text, timestamp, reasoning, is_error,
         token_usage_json, tool_calls_json, tool_results_json, citations_json, created_at
       ) VALUES (
         @id, @session_id, @seq, @role, @text, @timestamp, @reasoning, @is_error,
         @token_usage_json, @tool_calls_json, @tool_results_json, @citations_json, @created_at
       )
       ON CONFLICT(session_id, id) DO UPDATE SET
         seq = excluded.seq,
         role = excluded.role,
         text = excluded.text,
         timestamp = excluded.timestamp,
         reasoning = excluded.reasoning,
         is_error = excluded.is_error,
         token_usage_json = excluded.token_usage_json,
         tool_calls_json = excluded.tool_calls_json,
         tool_results_json = excluded.tool_results_json,
         citations_json = excluded.citations_json,
         created_at = excluded.created_at`
    );

    payload.messages.forEach((message, index) => {
      const timestamp = normalizeTimestamp(message.timestamp);
      upsertMessage.run({
        id: message.id,
        session_id: normalizedSessionId,
        seq: index,
        role: message.role,
        text: message.text,
        timestamp,
        reasoning:
          typeof message.reasoning === 'string' && message.reasoning.length > 0
            ? message.reasoning
            : null,
        is_error: message.isError ? 1 : 0,
        token_usage_json: serializeJsonField(message.tokenUsage),
        tool_calls_json: serializeJsonField(message.toolCalls),
        tool_results_json: serializeJsonField(message.toolResults),
        citations_json: serializeJsonField(message.citations),
        created_at: timestamp,
      });
    });
  });

  persistSession({
    ...normalizedSession,
    messages,
  });
};

const renameSession = (sessionId, title) => {
  const db = ensureDatabase();
  const normalizedSessionId = assertNonEmptyString(sessionId, 'sessionId');
  const normalizedTitle = assertNonEmptyString(title, 'title');
  db.prepare(
    `UPDATE sessions
     SET title = @title
     WHERE id = @id`
  ).run({
    id: normalizedSessionId,
    title: normalizedTitle,
  });
};

const deleteSession = (sessionId) => {
  const db = ensureDatabase();
  const normalizedSessionId = assertNonEmptyString(sessionId, 'sessionId');

  const removeSession = db.transaction((id) => {
    const deletedMessages = db.prepare(`DELETE FROM messages WHERE session_id = ?`).run(id);
    const deletedSessions = db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id);

    const activeSessionId = getActiveSessionId();
    if (activeSessionId === id) {
      clearActiveSessionId();
    }

    const remainingSessionRow = db
      .prepare(`SELECT COUNT(*) AS count FROM sessions WHERE id = ?`)
      .get(id);
    const remainingMessageRow = db
      .prepare(`SELECT COUNT(*) AS count FROM messages WHERE session_id = ?`)
      .get(id);

    if ((remainingSessionRow?.count ?? 0) > 0 || (remainingMessageRow?.count ?? 0) > 0) {
      throw new Error(`Failed to fully delete session "${id}" from local storage`);
    }

    return {
      sessionId: id,
      deletedSessionCount: deletedSessions.changes,
      deletedMessageCount: deletedMessages.changes,
      clearedActiveSession: activeSessionId === id,
      verifiedDeleted: true,
    };
  });

  const result = removeSession(normalizedSessionId);
  console.warn('[session-store] verified session deletion', result);
  return result;
};

module.exports = {
  clearActiveSessionId,
  deleteSession,
  getActiveSessionId,
  getSession,
  listSessions,
  searchSessions,
  renameSession,
  saveActiveSessionId,
  saveSession,
};
