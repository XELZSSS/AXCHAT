import React, { useEffect, useRef } from 'react';

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

const Modal: React.FC<ModalProps> = ({
  isOpen,
  children,
  className = '',
  overlayRef,
  onClose,
  ariaLabelledBy,
  ariaDescribedBy,
}) => {
  const fallbackOverlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const resolvedOverlayRef = overlayRef ?? fallbackOverlayRef;

  const getFocusableElements = () => {
    const dialog = dialogRef.current;
    if (!dialog) return [] as HTMLElement[];
    return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (element) => element.getAttribute('aria-hidden') !== 'true'
    );
  };

  useEffect(() => {
    if (!isOpen) return;
    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      const focusable = getFocusableElements();
      (focusable[0] ?? dialogRef.current)?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      previousActiveElement?.focus();
    };
  }, [isOpen]);

  const handleOverlayMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    onClose?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose?.();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (event.shiftKey) {
      if (
        !activeElement ||
        activeElement === first ||
        !dialogRef.current?.contains(activeElement)
      ) {
        event.preventDefault();
        last.focus();
      }
      return;
    }

    if (!activeElement || activeElement === last || !dialogRef.current?.contains(activeElement)) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!isOpen) return null;
  return (
    <div
      ref={resolvedOverlayRef}
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-4 titlebar-no-drag"
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
        className={`w-full max-h-[92vh] overflow-hidden rounded-xl bg-[var(--bg-1)] ring-1 ring-[var(--line-1)] shadow-none fx-soft-rise ${className}`}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
