import type { ReactNode } from 'react';
import * as Dialog from '@/shared/ui/primitives/dialog';
import { cn } from '@/shared/ui/cn';

export type ModalProps = {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
  showOverlay?: boolean;
  onClose?: () => void;
  ariaDescribedBy?: string;
};

const DIALOG_OVERLAY_CLASS =
  'fixed inset-0 z-70 flex items-center justify-center bg-[var(--overlay-bg)] p-4 titlebar-no-drag';

const handleOpenChange = (open: boolean, onClose?: () => void) => {
  if (!open) onClose?.();
};

const Modal = ({
  isOpen,
  title,
  children,
  className,
  overlayClassName,
  showOverlay = true,
  onClose,
  ariaDescribedBy,
}: ModalProps) => (
  <Dialog.Root open={isOpen} onOpenChange={(open) => handleOpenChange(open, onClose)}>
    <Dialog.Portal>
      {showOverlay ? (
        <Dialog.Overlay className={cn(DIALOG_OVERLAY_CLASS, overlayClassName)} />
      ) : null}
      <Dialog.Content
        aria-describedby={ariaDescribedBy}
        className={cn(
          'fixed left-1/2 top-1/2 z-[71] max-h-[92vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg bg-[var(--bg-1)] ring-1 ring-[var(--line-1)] focus:outline-none',
          className
        )}
      >
        <Dialog.Title className="sr-only">{title}</Dialog.Title>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export default Modal;
