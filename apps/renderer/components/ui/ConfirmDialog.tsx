import { useId } from 'react';
import Modal from './Modal';
import Button from './Button';
import { WarningAmberOutlinedIcon } from '../icons';

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
};

const ConfirmDialog = ({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmDialogProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const describedBy = description ? descriptionId : undefined;

  return (
    <Modal
      isOpen={isOpen}
      className="max-w-md !bg-[var(--bg-2)] ring-0 shadow-none"
      overlayClassName="bg-transparent"
      onClose={onCancel}
      ariaLabelledBy={titleId}
      ariaDescribedBy={describedBy}
    >
      <div className="px-5 py-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {danger && (
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#3a120f] text-[#ff6b63] ring-1 ring-[#ff3b30]">
                <WarningAmberOutlinedIcon sx={{ fontSize: 16 }} />
              </span>
            )}
            <h3 id={titleId} className="text-sm font-semibold text-[var(--ink-1)]">
              {title}
            </h3>
          </div>
          {description && (
            <p id={descriptionId} className="text-xs text-[var(--ink-2)]">
              {description}
            </p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
