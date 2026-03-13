import { forwardRef, memo } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import Button from './Button';
import { cn } from './cn';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  danger?: boolean;
};

const TONES = {
  default: 'text-[var(--ink-3)] hover:text-[var(--ink-1)]',
  active: 'bg-[var(--bg-2)] text-[var(--ink-1)]',
  danger: 'text-[var(--ink-3)] hover:text-[var(--status-error)]',
} as const;

const getToneClassName = (active: boolean, danger: boolean) => {
  if (danger) return TONES.danger;
  if (active) return TONES.active;
  return TONES.default;
};

const IconButton = memo(
  forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ active = false, danger = false, className, ...props }, ref) => {
      return (
        <Button
          ref={ref}
          size="icon"
          variant="subtle"
          className={cn(getToneClassName(active, danger), className)}
          {...props}
        />
      );
    }
  )
);

IconButton.displayName = 'IconButton';

export default IconButton;
