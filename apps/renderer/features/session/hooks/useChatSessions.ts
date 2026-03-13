import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import type {
  Dispatch,
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  MutableRefObject,
  SetStateAction,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ChatService } from '../../../services/chatService';
import { ChatMessage, ChatSession, Role } from '../../../types';
import {
  deleteSession,
  getActiveSessionId,
  getSession,
  getSessionSummaries,
  saveSession,
  searchSessionSummaries,
  setActiveSessionId,
  updateSessionTitle,
} from '../../../services/sessionStore';
import { isDefaultSessionTitle } from '../../../utils/i18n';

type UseChatSessionsOptions = {
  chatService: ChatService;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  defaultSessionTitle: string;
  syncProviderState: () => void;
  isStreaming: boolean;
  isLoading: boolean;
  onCloseSidebar?: () => void;
};

type CommitSessionOptions = {
  force?: boolean;
};

type SessionContextActions = {
  setCurrentSessionId: Dispatch<SetStateAction<string>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  syncProviderState: () => void;
};

const SAVE_SESSION_DEBOUNCE_MS = 400;
const SESSION_DEBUG_PREFIX = '[session-debug]';

const toSessionSummary = (session: ChatSession): ChatSession => ({
  ...session,
  messages: [],
});

const resolveSessionTitle = (
  existingSessionTitle: string | undefined,
  messages: ChatMessage[],
  defaultSessionTitle: string
) => {
  const firstUserMessage = messages.find((message) => message.role === Role.User);
  if (!firstUserMessage) {
    return existingSessionTitle ?? defaultSessionTitle;
  }

  if (!existingSessionTitle || isDefaultSessionTitle(existingSessionTitle)) {
    return firstUserMessage.text.trim() || defaultSessionTitle;
  }

  return existingSessionTitle;
};

const buildSessionSnapshot = ({
  currentSessionId,
  existingSessionTitle,
  existingSessionCreatedAt,
  messages,
  defaultSessionTitle,
  providerId,
  modelName,
}: {
  currentSessionId: string;
  existingSessionTitle?: string;
  existingSessionCreatedAt?: number;
  messages: ChatMessage[];
  defaultSessionTitle: string;
  providerId: ChatSession['provider'];
  modelName: string;
}): ChatSession => {
  return {
    id: currentSessionId,
    title: resolveSessionTitle(existingSessionTitle, messages, defaultSessionTitle),
    messages,
    provider: providerId,
    model: modelName,
    createdAt: existingSessionCreatedAt ?? Date.now(),
    updatedAt: Date.now(),
  };
};

const upsertSessionList = (sessions: ChatSession[], session: ChatSession): ChatSession[] => {
  const summary = toSessionSummary(session);
  const next = [summary, ...sessions.filter((item) => item.id !== summary.id)];
  next.sort((a, b) => b.updatedAt - a.updatedAt);
  return next;
};

const hasSessionSummaryChanged = (prev: ChatSession | undefined, next: ChatSession): boolean => {
  if (!prev) return true;

  return (
    prev.title !== next.title ||
    prev.provider !== next.provider ||
    prev.model !== next.model ||
    prev.updatedAt !== next.updatedAt
  );
};

const hasSessionSnapshotChanged = (prev: ChatSession | undefined, next: ChatSession): boolean => {
  if (!prev) return true;

  return (
    prev.title !== next.title ||
    prev.provider !== next.provider ||
    prev.model !== next.model ||
    prev.messages !== next.messages
  );
};

const applySessionContext = async (
  chatService: ChatService,
  session: ChatSession,
  actions: SessionContextActions,
  activationToken: number,
  latestActivationTokenRef: MutableRefObject<number>
): Promise<void> => {
  const { setCurrentSessionId, setMessages, syncProviderState } = actions;

  setCurrentSessionId(session.id);
  setMessages(session.messages);
  chatService.setProvider(session.provider);
  chatService.setModelName(session.model);
  syncProviderState();
  await chatService.startChatWithHistory(session.messages);

  if (latestActivationTokenRef.current !== activationToken) {
    return;
  }

  setCurrentSessionId(session.id);
};

const activateSession = (
  chatService: ChatService,
  session: ChatSession,
  actions: SessionContextActions,
  latestActivationTokenRef: MutableRefObject<number>
): void => {
  const activationToken = latestActivationTokenRef.current + 1;
  latestActivationTokenRef.current = activationToken;

  void applySessionContext(
    chatService,
    session,
    actions,
    activationToken,
    latestActivationTokenRef
  ).catch((error) => {
    if (latestActivationTokenRef.current !== activationToken) {
      return;
    }
    console.error('Failed to sync session history:', error);
  });
};

const consumePendingSessionSave = (
  saveSessionTimerRef: MutableRefObject<number | null>,
  pendingSessionSaveRef: MutableRefObject<ChatSession | null>
): ChatSession | null => {
  if (saveSessionTimerRef.current !== null) {
    window.clearTimeout(saveSessionTimerRef.current);
    saveSessionTimerRef.current = null;
  }

  const pendingSession = pendingSessionSaveRef.current;
  pendingSessionSaveRef.current = null;
  return pendingSession;
};

const discardPendingSessionSave = (
  saveSessionTimerRef: MutableRefObject<number | null>,
  pendingSessionSaveRef: MutableRefObject<ChatSession | null>,
  sessionId?: string
): void => {
  if (sessionId && pendingSessionSaveRef.current?.id !== sessionId) {
    return;
  }

  if (saveSessionTimerRef.current !== null) {
    window.clearTimeout(saveSessionTimerRef.current);
    saveSessionTimerRef.current = null;
  }
  pendingSessionSaveRef.current = null;
};

export const useChatSessions = ({
  chatService,
  messages,
  setMessages,
  defaultSessionTitle,
  syncProviderState,
  isStreaming,
  isLoading,
  onCloseSidebar,
}: UseChatSessionsOptions) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => uuidv4());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');
  const [isSessionStateReady, setIsSessionStateReady] = useState(false);

  const saveSessionTimerRef = useRef<number | null>(null);
  const pendingSessionSaveRef = useRef<ChatSession | null>(null);
  const lastPersistedSessionRef = useRef<ChatSession | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const deletedSessionIdsRef = useRef<Set<string>>(new Set());
  const latestActivationTokenRef = useRef(0);

  const sessionContextActions = useMemo<SessionContextActions>(
    () => ({
      setCurrentSessionId,
      setMessages,
      syncProviderState,
    }),
    [setMessages, syncProviderState]
  );

  const persistSessionSnapshot = useCallback((session: ChatSession) => {
    const run = async () => {
      if (deletedSessionIdsRef.current.has(session.id)) {
        return;
      }

      try {
        await saveSession(session);
        if (!deletedSessionIdsRef.current.has(session.id)) {
          lastPersistedSessionRef.current = session;
        }
      } catch (error) {
        console.error('Failed to persist session:', error);
      }
    };

    const next = saveQueueRef.current.then(run, run);
    saveQueueRef.current = next;
    return next;
  }, []);

  const drainSaveQueue = useCallback(async () => {
    try {
      await saveQueueRef.current;
    } catch {
      // Errors are already reported by persistSessionSnapshot; draining only waits for completion.
    }
  }, []);

  const closeSidebar = useCallback(() => {
    onCloseSidebar?.();
  }, [onCloseSidebar]);

  const flushSessionSave = useCallback(async () => {
    const pendingSession = consumePendingSessionSave(saveSessionTimerRef, pendingSessionSaveRef);
    if (!pendingSession) {
      return;
    }

    await persistSessionSnapshot(pendingSession);
  }, [persistSessionSnapshot]);

  const discardSessionSave = useCallback((sessionId?: string) => {
    discardPendingSessionSave(saveSessionTimerRef, pendingSessionSaveRef, sessionId);
    if (sessionId && lastPersistedSessionRef.current?.id === sessionId) {
      lastPersistedSessionRef.current = null;
    }
  }, []);

  const flushSessionSaveOnPageExit = useEffectEvent(() => {
    void flushSessionSave();
  });

  useEffect(() => {
    const handlePageHide = () => {
      flushSessionSaveOnPageExit();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushSessionSaveOnPageExit();
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushSessionSaveOnPageExit();
    };
  }, []);

  const scheduleSessionSave = useCallback((session: ChatSession) => {
    pendingSessionSaveRef.current = session;

    if (saveSessionTimerRef.current !== null) {
      window.clearTimeout(saveSessionTimerRef.current);
    }

    saveSessionTimerRef.current = window.setTimeout(() => {
      const nextSession = pendingSessionSaveRef.current;
      pendingSessionSaveRef.current = null;

      if (nextSession) {
        void persistSessionSnapshot(nextSession);
      }
      saveSessionTimerRef.current = null;
    }, SAVE_SESSION_DEBOUNCE_MS);
  }, [persistSessionSnapshot]);

  const resetToDraftSession = useCallback(
    (nextSessionId: string) => {
      if (saveSessionTimerRef.current !== null) {
        window.clearTimeout(saveSessionTimerRef.current);
        saveSessionTimerRef.current = null;
      }

      pendingSessionSaveRef.current = null;
      lastPersistedSessionRef.current = null;
      chatService.resetChat();
      setMessages([]);
      setCurrentSessionId(nextSessionId);
      setSearchQuery('');
      closeSidebar();
    },
    [chatService, closeSidebar, setMessages]
  );

  useEffect(() => {
    let disposed = false;

    const loadSessionState = async () => {
      try {
        let loadedSessions = await getSessionSummaries();
        const activeId = await getActiveSessionId();
        if (disposed) {
          return;
        }

        setSessions(loadedSessions);

        let activeSessionSummary =
          (activeId && loadedSessions.find((session) => session.id === activeId)) ??
          loadedSessions[0];

        while (activeSessionSummary) {
          const activeSession = await getSession(activeSessionSummary.id);
          if (disposed) {
            return;
          }

          if (activeSession) {
            lastPersistedSessionRef.current = activeSession;
            activateSession(
              chatService,
              activeSession,
              sessionContextActions,
              latestActivationTokenRef
            );
            if (!disposed) {
              setIsSessionStateReady(true);
            }
            return;
          }

          loadedSessions = loadedSessions.filter((session) => session.id !== activeSessionSummary.id);
          setSessions(loadedSessions);
          activeSessionSummary = loadedSessions[0];
        }

        if (!activeSessionSummary) {
          const newId = uuidv4();
          console.warn(`${SESSION_DEBUG_PREFIX} initialized empty session id`, {
            sessionId: newId,
          });
          setCurrentSessionId(newId);
          await setActiveSessionId(newId);
          if (!disposed) {
            setIsSessionStateReady(true);
          }
          return;
        }
      } catch (error) {
        console.error('Failed to initialize session state:', error);
        if (!disposed) {
          setIsSessionStateReady(true);
        }
      }
    };

    void loadSessionState();

    return () => {
      disposed = true;
    };
  }, [
    chatService,
    sessionContextActions,
  ]);

  const currentSession = useMemo(() => {
    return sessions.find((session) => session.id === currentSessionId);
  }, [currentSessionId, sessions]);

  const activeProviderId = chatService.getProviderId();
  const activeModelName = chatService.getModelName();

  const activeSessionDraft = useMemo(() => {
    if (messages.length === 0) return null;

    return buildSessionSnapshot({
      currentSessionId,
      existingSessionTitle: currentSession?.title,
      existingSessionCreatedAt: currentSession?.createdAt,
      messages,
      defaultSessionTitle,
      providerId: activeProviderId,
      modelName: activeModelName,
    });
  }, [
    activeModelName,
    activeProviderId,
    currentSession?.createdAt,
    currentSession?.title,
    currentSessionId,
    defaultSessionTitle,
    messages,
  ]);

  const sessionSummaries = useMemo(() => {
    if (!activeSessionDraft) {
      return sessions;
    }

    return hasSessionSummaryChanged(currentSession, activeSessionDraft)
      ? upsertSessionList(sessions, activeSessionDraft)
      : sessions;
  }, [activeSessionDraft, currentSession, sessions]);

  useEffect(() => {
    if (!activeSessionDraft) {
      return;
    }

    if (deletedSessionIdsRef.current.has(activeSessionDraft.id)) {
      return;
    }

    pendingSessionSaveRef.current = activeSessionDraft;

    if (isStreaming || isLoading) {
      return;
    }

    if (
      !hasSessionSnapshotChanged(lastPersistedSessionRef.current ?? undefined, activeSessionDraft)
    ) {
      return;
    }

    scheduleSessionSave(activeSessionDraft);
  }, [activeSessionDraft, currentSession, isLoading, isStreaming, scheduleSessionSave]);

  const startNewChat = useCallback(() => {
    void (async () => {
      try {
        await flushSessionSave();
        const newId = uuidv4();
        console.warn(`${SESSION_DEBUG_PREFIX} generated new session id`, { sessionId: newId });
        // Clear the current transcript before switching ids so the old messages
        // cannot be snapshotted into a brand-new session during the async IPC write.
        resetToDraftSession(newId);
        await setActiveSessionId(newId);
      } catch (error) {
        console.error('Failed to start a new chat session:', error);
      }
    })();
  }, [flushSessionSave, resetToDraftSession]);

  const handleLoadSession = useCallback(
    (session: ChatSession) => {
      void (async () => {
        try {
          if (isStreaming || isLoading) return;
          if (editingSessionId === session.id) return;

          if (session.id === currentSessionId) {
            closeSidebar();
            return;
          }

          await flushSessionSave();
          const loadedSession = await getSession(session.id);
          if (!loadedSession) {
            setSessions(await getSessionSummaries());
            return;
          }

          await setActiveSessionId(loadedSession.id);
          activateSession(
            chatService,
            loadedSession,
            sessionContextActions,
            latestActivationTokenRef
          );
          closeSidebar();
        } catch (error) {
          console.error(`Failed to load session "${session.id}":`, error);
        }
      })();
    },
    [
      chatService,
      closeSidebar,
      currentSessionId,
      editingSessionId,
      isLoading,
      isStreaming,
      sessionContextActions,
      flushSessionSave,
      latestActivationTokenRef,
    ]
  );

  const handleDeleteSession = useCallback(
    (e: MouseEvent, sessionId: string) => {
      e.stopPropagation();
      void (async () => {
        try {
          discardSessionSave(sessionId);
          deletedSessionIdsRef.current.add(sessionId);
          console.warn(`${SESSION_DEBUG_PREFIX} deleting session id`, {
            sessionId,
            isCurrentSession: sessionId === currentSessionId,
          });
          await drainSaveQueue();

          if (sessionId === currentSessionId) {
            const nextSessionId = uuidv4();
            console.warn(`${SESSION_DEBUG_PREFIX} generated replacement session id after delete`, {
              deletedSessionId: sessionId,
              replacementSessionId: nextSessionId,
            });
            resetToDraftSession(nextSessionId);
            const updatedSessions = await deleteSession(sessionId);
            setSessions(updatedSessions);
            await setActiveSessionId(nextSessionId);
            console.warn(`${SESSION_DEBUG_PREFIX} delete completed in renderer`, {
              deletedSessionId: sessionId,
              replacementSessionId: nextSessionId,
              remainingSessions: updatedSessions.length,
            });
            return;
          }

          const updatedSessions = await deleteSession(sessionId);
          setSessions(updatedSessions);
          console.warn(`${SESSION_DEBUG_PREFIX} delete completed in renderer`, {
            deletedSessionId: sessionId,
            remainingSessions: updatedSessions.length,
          });
        } catch (error) {
          deletedSessionIdsRef.current.delete(sessionId);
          console.error(`Failed to delete session "${sessionId}":`, error);
        }
      })();
    },
    [currentSessionId, discardSessionSave, drainSaveQueue, resetToDraftSession]
  );

  const handleStartEdit = useCallback((e: MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleInput(session.title);
  }, []);

  const resetEditState = useCallback(() => {
    setEditingSessionId(null);
    setEditTitleInput('');
  }, []);

  const handleCancelEdit = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      resetEditState();
    },
    [resetEditState]
  );

  const commitTitleEdit = useCallback(() => {
    const nextTitle = editTitleInput.trim();
    if (!editingSessionId || !nextTitle) {
      return;
    }

    void (async () => {
      try {
        const updated = await updateSessionTitle(editingSessionId, nextTitle);
        setSessions(updated);
        resetEditState();
      } catch (error) {
        console.error(`Failed to rename session "${editingSessionId}":`, error);
      }
    })();
  }, [editTitleInput, editingSessionId, resetEditState]);

  const handleSaveEdit = useCallback(
    (e: FormEvent | MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      commitTitleEdit();
    },
    [commitTitleEdit]
  );

  const handleEditInputClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleEditKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        commitTitleEdit();
      } else if (e.key === 'Escape') {
        resetEditState();
      }
    },
    [commitTitleEdit, resetEditState]
  );

  const commitCurrentSession = useCallback(
    (options: CommitSessionOptions = {}) => {
      const { force = false } = options;
      const draft = pendingSessionSaveRef.current ?? activeSessionDraft;
      if (!draft) {
        return;
      }

      if (
        !force &&
        hasSessionSnapshotChanged(lastPersistedSessionRef.current ?? undefined, draft) === false
      ) {
        return;
      }

      void persistSessionSnapshot(draft);
      pendingSessionSaveRef.current = null;
      if (saveSessionTimerRef.current !== null) {
        window.clearTimeout(saveSessionTimerRef.current);
        saveSessionTimerRef.current = null;
      }
    },
    [activeSessionDraft, persistSessionSnapshot]
  );

  const normalizedSearchQuery = searchQuery.toLowerCase();
  const [searchResult, setSearchResult] = useState<{
    query: string;
    sessions: ChatSession[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const query = searchQuery.trim();

    if (!query) {
      return () => {
        cancelled = true;
      };
    }

    const fallbackByTitle = () =>
      sessionSummaries.filter((session) => session.title.toLowerCase().includes(query.toLowerCase()));

    void (async () => {
      try {
        const results = await searchSessionSummaries(query, 200);
        if (!cancelled) {
          setSearchResult({ query, sessions: results });
        }
      } catch (error) {
        console.error('Failed to search sessions:', error);
        if (!cancelled) {
          setSearchResult({ query, sessions: fallbackByTitle() });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchQuery, sessionSummaries]);

  const filteredSessions = useMemo(() => {
    if (!normalizedSearchQuery) {
      return sessionSummaries;
    }

    const matchingSearchResult =
      searchResult && searchResult.query.toLowerCase() === normalizedSearchQuery
        ? searchResult.sessions
        : null;

    if (!matchingSearchResult) {
      return sessionSummaries.filter((session) =>
        session.title.toLowerCase().includes(normalizedSearchQuery)
      );
    }

    const sessionsById = new Map(sessionSummaries.map((session) => [session.id, session] as const));
    return matchingSearchResult.map((session) => sessionsById.get(session.id) ?? session);
  }, [normalizedSearchQuery, searchResult, sessionSummaries]);

  return {
    sessions: sessionSummaries,
    filteredSessions,
    currentSessionId,
    searchQuery,
    editingSessionId,
    editTitleInput,
    setSearchQuery,
    setEditTitleInput,
    startNewChat,
    handleLoadSession,
    handleDeleteSession,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleEditInputClick,
    handleEditKeyDown,
    isSessionStateReady,
    commitCurrentSession,
  };
};
