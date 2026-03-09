import type { ChatSession } from '../types';
import { listProviderIds } from './providers/registry';
import { formatMessageTime } from '../utils/time';

const DEFAULT_PROVIDER_ID = 'gemini' as const;
const DEFAULT_MODEL_NAME = 'gemini-3.1-pro-preview';
const VALID_PROVIDER_IDS = new Set(listProviderIds());

export type StoredSession = Partial<ChatSession> &
  Pick<ChatSession, 'id' | 'title' | 'createdAt' | 'updatedAt'>;
export type StoredSessionIndexEntry = Pick<
  ChatSession,
  'id' | 'title' | 'provider' | 'model' | 'createdAt' | 'updatedAt'
>;
export type StoredSessionIndex = {
  version: 1;
  sessions: StoredSessionIndexEntry[];
};
export type StoredSessionPayload = {
  messages: ChatSession['messages'];
};

export const loadSessionPayloadFromRaw = (raw: string | null): ChatSession['messages'] => {
  try {
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredSessionPayload;
    const messages = Array.isArray(parsed?.messages) ? parsed.messages : [];
    return messages.map((message) => ({
      ...message,
      timeLabel: message.timeLabel ?? formatMessageTime(message.timestamp),
    }));
  } catch {
    return [];
  }
};

export const normalizeSession = (session: StoredSession): ChatSession => {
  const provider =
    typeof session.provider === 'string' && VALID_PROVIDER_IDS.has(session.provider)
      ? session.provider
      : DEFAULT_PROVIDER_ID;

  return {
    ...session,
    provider,
    model: session.model ?? DEFAULT_MODEL_NAME,
    messages: (session.messages ?? []).map((message) => ({
      ...message,
      timeLabel: message.timeLabel ?? formatMessageTime(message.timestamp),
    })),
  };
};

export const cloneSessions = (sessions: ChatSession[]): ChatSession[] =>
  sessions.map((session) => ({
    ...session,
    messages: session.messages.map((message) => ({ ...message })),
  }));

export const toSessionIndex = (sessions: ChatSession[]): StoredSessionIndex => ({
  version: 1,
  sessions: sessions.map((session) => ({
    id: session.id,
    title: session.title,
    provider: session.provider,
    model: session.model,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  })),
});

export const isStoredSessionIndex = (value: unknown): value is StoredSessionIndex => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredSessionIndex>;
  return candidate.version === 1 && Array.isArray(candidate.sessions);
};
