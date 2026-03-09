import React, { useCallback, useEffect, useRef } from 'react';
import { cn } from './cn';

type ModalProps = {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
  overlayRef?: React.RefObject<HTMLDivElement>;
  onClose?: () => void;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
};

const FOCUSABLE_SELECTOR =
  'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const getFocusableElements = (container: HTMLElement | null): HTMLElement[] => {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getAttribute('aria-hidden') !== 'true'
  );
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  children,
  className,
  overlayRef,
  onClose,
  ariaLabelledBy,
  ariaDescribedBy,
}) => {
  const fallbackOverlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const resolvedOverlayRef = overlayRef ?? fallbackOverlayRef;
  useEffect(() => {
    if (!isOpen) return;

    const previousActive =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const frame = requestAnimationFrame(() => {
      const focusable = getFocusableElements(dialogRef.current);
      (focusable[0] ?? dialogRef.current)?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      previousActive?.focus();
    };
  }, [isOpen]);

  const handleOverlayMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      if (event.target === event.currentTarget) onClose?.();
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (event.shiftKey) {
        if (!active || active === first || !dialogRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (!active || active === last || !dialogRef.current?.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      ref={resolvedOverlayRef}
      aria-hidden={!isOpen}
      className={cn(
        'fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-4 titlebar-no-drag'
      )}
      onMouseDown={handleOverlayMouseDown}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className={cn(
          'w-full max-h-[92vh] overflow-hidden rounded-xl bg-[var(--bg-1)] ring-1 ring-[var(--line-1)]',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
