import { useCallback, useEffect, useState } from 'react';
import type { ChatService } from '../../../services/chatService';
import { readAppStorage, writeAppStorage } from '../../../services/storageKeys';

type UseSearchToggleOptions = {
  chatService: ChatService;
  tavilyAvailable: boolean;
  currentProviderId: string;
};

const SEARCH_ENABLED_STORAGE_KEY = 'searchEnabled';

const readPersistedSearchEnabled = (): boolean => {
  return readAppStorage(SEARCH_ENABLED_STORAGE_KEY) !== 'false';
};

const persistSearchEnabled = (enabled: boolean): void => {
  writeAppStorage(SEARCH_ENABLED_STORAGE_KEY, String(enabled));
};

const resolveRuntimeSearchEnabled = (searchEnabled: boolean, tavilyAvailable: boolean): boolean => {
  return tavilyAvailable ? searchEnabled : false;
};

export const useSearchToggle = ({
  chatService,
  tavilyAvailable,
  currentProviderId,
}: UseSearchToggleOptions) => {
  const [searchEnabled, setSearchEnabledState] = useState(readPersistedSearchEnabled);

  const setSearchEnabled = useCallback((value: React.SetStateAction<boolean>) => {
    setSearchEnabledState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      persistSearchEnabled(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!tavilyAvailable && searchEnabled) {
      setSearchEnabled(false);
    }
  }, [searchEnabled, setSearchEnabled, tavilyAvailable]);

  useEffect(() => {
    const nextEnabled = resolveRuntimeSearchEnabled(searchEnabled, tavilyAvailable);
    chatService.setSearchEnabled(nextEnabled);
  }, [chatService, currentProviderId, searchEnabled, tavilyAvailable]);

  return { searchEnabled, setSearchEnabled };
};
