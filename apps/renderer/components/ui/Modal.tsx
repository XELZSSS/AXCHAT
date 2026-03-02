import React, { useEffect, useRef, useState } from 'react';
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
const ENTER_DURATION_MS = 220;
const EXIT_DURATION_MS = 160;

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
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  const getFocusableElements = () => {
    const dialog = dialogRef.current;
    if (!dialog) return [] as HTMLElement[];
    return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (element) => element.getAttribute('aria-hidden') !== 'true'
    );
  };

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const frame = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    setIsVisible(false);
    const timer = window.setTimeout(() => {
      setIsMounted(false);
    }, EXIT_DURATION_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen]);

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

  if (!isMounted) return null;
  return (
    <div
      ref={resolvedOverlayRef}
      className={cn(
        'fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-4 titlebar-no-drag transition-opacity',
        isVisible ? 'opacity-100' : 'opacity-0'
      )}
      style={{
        pointerEvents: isVisible ? 'auto' : 'none',
        transitionDuration: `${isVisible ? ENTER_DURATION_MS : EXIT_DURATION_MS}ms`,
        transitionTimingFunction: 'var(--motion-ease-standard)',
      }}
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
          'w-full max-h-[92vh] overflow-hidden rounded-xl bg-[var(--bg-1)] ring-1 ring-[var(--line-1)] shadow-none transition-opacity transition-transform motion-reduce:transition-none',
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          className
        )}
        style={{
          transitionDuration: `${isVisible ? ENTER_DURATION_MS : EXIT_DURATION_MS}ms`,
          transitionTimingFunction: isVisible
            ? 'var(--motion-ease-emphasized)'
            : 'var(--motion-ease-standard)',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
