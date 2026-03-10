import React from 'react';
import { t } from '../../utils/i18n';
import { Button, Input } from '../ui';
import { DeleteOutlineIcon, VisibilityIcon, VisibilityOffIcon } from '../icons';

type SecretInputProps = {
  label: string;
  labelClassName?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  showSecret: boolean;
  onToggleVisibility: () => void;
  onClear: () => void;
  visibilityLabel: string;
  clearLabel?: string;
  inputClassName?: string;
  compact?: boolean;
  autoComplete?: string;
};

const SecretInput: React.FC<SecretInputProps> = ({
  label,
  labelClassName,
  value,
  onChange,
  showSecret,
  onToggleVisibility,
  onClear,
  visibilityLabel,
  clearLabel,
  inputClassName,
  compact,
  autoComplete = 'off',
}) => {
  const resolvedClearLabel = clearLabel ?? t('settings.apiKey.clear');

  return (
    <div className="space-y-2">
      <label className={labelClassName ?? 'text-xs font-medium text-[var(--ink-2)]'}>{label}</label>
      <div className="relative">
        <Input
          type={showSecret ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className={inputClassName}
          compact={compact}
          autoComplete={autoComplete}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          <Button
            onClick={onToggleVisibility}
            variant="ghost"
            size="sm"
            className="!h-6 !w-6 !min-w-0 !p-0 flex items-center justify-center"
            aria-label={visibilityLabel}
          >
            {showSecret ? (
              <VisibilityOffIcon sx={{ fontSize: 16 }} />
            ) : (
              <VisibilityIcon sx={{ fontSize: 16 }} />
            )}
          </Button>
          <Button
            onClick={onClear}
            variant="ghost"
            size="sm"
            className="!h-6 !w-6 !min-w-0 !p-0 flex items-center justify-center hover:text-red-400"
            aria-label={resolvedClearLabel}
            title={resolvedClearLabel}
          >
            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SecretInput;
