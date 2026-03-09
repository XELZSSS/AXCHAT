import React, { useMemo } from 'react';
import Button from './Button';
import { cn } from './cn';

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  danger?: boolean;
};

const TONES = {
  default: 'text-[var(--ink-3)] hover:text-[var(--ink-1)]',
  active: 'bg-[var(--bg-2)] text-[var(--ink-1)]',
  danger: 'text-[var(--ink-3)] hover:text-red-400',
} as const;

const getToneClassName = (active: boolean, danger: boolean) => {
  if (danger) return TONES.danger;
  if (active) return TONES.active;
  return TONES.default;
};

const IconButton = React.memo(
  React.forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ active = false, danger = false, className, ...props }, ref) => {
      const toneClass = useMemo(() => getToneClassName(active, danger), [active, danger]);
      return (
        <Button
          ref={ref}
          size="icon"
          variant="subtle"
          className={cn(toneClass, className)}
          {...props}
        />
      );
    }
  )
);

IconButton.displayName = 'IconButton';

export default IconButton;
