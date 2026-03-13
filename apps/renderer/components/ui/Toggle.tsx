import { forwardRef, memo } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from './cn';

type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

const BASE = [
  'relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full',
  'border border-[var(--line-1)] bg-[var(--bg-1)] transition-colors duration-160 ease-out',
  'after:absolute after:left-0.5 after:top-0.5 after:h-3.5 after:w-3.5 after:rounded-full',
  'after:bg-[var(--ink-3)] after:transition-transform after:duration-160',
  'checked:border-[var(--line-1)] checked:bg-[var(--action-interactive)]',
  'checked:after:translate-x-4 checked:after:bg-[var(--text-on-interactive)]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-interactive)]',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const Toggle = memo(
  forwardRef<HTMLInputElement, ToggleProps>(
    ({ className, checked, defaultChecked, ...props }, ref) => {
      const resolvedChecked = checked ?? false;
      return (
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          checked={resolvedChecked}
          defaultChecked={defaultChecked}
          className={cn(BASE, className)}
          {...props}
        />
      );
    }
  )
);

Toggle.displayName = 'Toggle';

export default Toggle;
