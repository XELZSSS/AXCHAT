import { useCallback, useEffect, useState } from 'react';
import type { SetStateAction } from 'react';
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
  const [preferredSearchEnabled, setSearchEnabledState] = useState(readPersistedSearchEnabled);

  const setSearchEnabled = useCallback((value: SetStateAction<boolean>) => {
    setSearchEnabledState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      persistSearchEnabled(next);
      return next;
    });
  }, []);

  const searchEnabled = resolveRuntimeSearchEnabled(preferredSearchEnabled, tavilyAvailable);

  useEffect(() => {
    chatService.setSearchEnabled(searchEnabled);
  }, [chatService, currentProviderId, searchEnabled]);

  return { searchEnabled, setSearchEnabled };
};
