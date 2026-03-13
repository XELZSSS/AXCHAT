import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
  height: number;
  openUp: boolean;
};

type UseDropdownPositionOptions = {
  open: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  onRequestClose: () => void;
};

type ScheduledPositionUpdater = (() => void) & {
  cancel: () => void;
};

export const useDropdownPosition = ({
  open,
  containerRef,
  triggerRef,
  menuRef,
  onRequestClose,
}: UseDropdownPositionOptions) => {
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const [menuHeight, setMenuHeight] = useState<number | null>(null);
  const [menuReady, setMenuReady] = useState(false);
  const requestClose = useEffectEvent(onRequestClose);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const maxMenuHeight = 224;
    const spaceBelow = window.innerHeight - rect.bottom;
    const effectiveMenuHeight = menuHeight ?? maxMenuHeight;
    const openUp = spaceBelow < effectiveMenuHeight + 12 && rect.top > effectiveMenuHeight + 12;
    setPosition((prev) => {
      if (
        prev &&
        prev.top === rect.top &&
        prev.left === rect.left &&
        prev.width === rect.width &&
        prev.height === rect.height &&
        prev.openUp === openUp
      ) {
        return prev;
      }
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        openUp,
      };
    });
  }, [menuHeight, triggerRef]);

  const createScheduledPositionUpdater = useCallback((): ScheduledPositionUpdater => {
    let frameId = 0;

    const run = () => {
      frameId = 0;
      updatePosition();
    };

    const schedule = () => {
      if (frameId !== 0) return;
      frameId = window.requestAnimationFrame(run);
    };

    schedule.cancel = () => {
      if (frameId === 0) return;
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    };

    return schedule as ScheduledPositionUpdater;
  }, [updatePosition]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      setMenuHeight(null);
      setMenuReady(false);
      return;
    }

    const requestPositionUpdate = createScheduledPositionUpdater();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      if (containerRef.current?.contains(target)) return;
      requestClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };

    requestPositionUpdate();
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', requestPositionUpdate);
    window.addEventListener('scroll', requestPositionUpdate, { capture: true, passive: true });

    return () => {
      requestPositionUpdate.cancel();
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', requestPositionUpdate);
      window.removeEventListener('scroll', requestPositionUpdate, true);
    };
  }, [containerRef, createScheduledPositionUpdater, menuRef, open, triggerRef]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Menu height and readiness come from committed DOM layout, so this stays in a layout effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (!open) return;
    const rawHeight = menuRef.current?.getBoundingClientRect().height ?? null;
    const height = rawHeight ? Math.round(rawHeight) : null;
    if (!height) return;
    if (height !== menuHeight) {
      setMenuHeight(height);
      return;
    }
    if (!menuReady) {
      updatePosition();
      setMenuReady(true);
    }
  }, [menuHeight, menuReady, menuRef, open, updatePosition]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    position,
    menuReady,
    updatePosition,
  };
};
