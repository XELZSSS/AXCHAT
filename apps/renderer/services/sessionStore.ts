import { ChatSession } from '../types';
import { cloneSessions, normalizeSession } from './sessionStoreSerialization';
import * as localSessionStore from './sessionStoreLocal';

const hasNativeSessionStorage = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.axchat?.listStoredSessions);
};

const normalizeSessions = (sessions: ChatSession[]): ChatSession[] => {
  return cloneSessions(sessions.map((session) => normalizeSession(session)));
};

export const getSessionSummaries = async (): Promise<ChatSession[]> => {
  if (!hasNativeSessionStorage()) {
    return localSessionStore.getSessionSummaries();
  }

  const sessions = await window.axchat!.listStoredSessions();
  return normalizeSessions(sessions);
};

export const getSession = async (sessionId: string): Promise<ChatSession | null> => {
  if (!hasNativeSessionStorage()) {
    return localSessionStore.getSession(sessionId);
  }

  const session = await window.axchat!.getStoredSession(sessionId);
  return session ? normalizeSession(session) : null;
};

export const getActiveSessionId = async (): Promise<string | null> => {
  if (!hasNativeSessionStorage()) {
    return localSessionStore.getActiveSessionId();
  }

  return window.axchat!.getStoredActiveSessionId();
};

export const setActiveSessionId = async (sessionId: string): Promise<void> => {
  if (!hasNativeSessionStorage()) {
    localSessionStore.setActiveSessionId(sessionId);
    return;
  }

  await window.axchat!.setStoredActiveSessionId(sessionId);
};

export const clearActiveSessionId = async (): Promise<void> => {
  if (!hasNativeSessionStorage()) {
    localSessionStore.clearActiveSessionId();
    return;
  }

  await window.axchat!.clearStoredActiveSessionId();
};

export const saveSession = async (session: ChatSession): Promise<void> => {
  if (!hasNativeSessionStorage()) {
    localSessionStore.saveSession(session);
    return;
  }

  await window.axchat!.saveStoredSession(session);
};

export const updateSessionTitle = async (
  sessionId: string,
  newTitle: string
): Promise<ChatSession[]> => {
  if (!hasNativeSessionStorage()) {
    return localSessionStore.updateSessionTitle(sessionId, newTitle);
  }

  await window.axchat!.renameStoredSession({ sessionId, title: newTitle });
  return getSessionSummaries();
};

export const deleteSession = async (sessionId: string): Promise<ChatSession[]> => {
  if (!hasNativeSessionStorage()) {
    return localSessionStore.deleteSession(sessionId);
  }

  await window.axchat!.deleteStoredSession(sessionId);
  return getSessionSummaries();
};

export const searchSessionSummaries = async (
  query: string,
  limit = 200
): Promise<ChatSession[]> => {
  if (!hasNativeSessionStorage()) {
    return localSessionStore.searchSessionSummaries(query, limit);
  }

  const sessions = await window.axchat!.searchStoredSessions({ query, limit });
  return normalizeSessions(sessions);
};
