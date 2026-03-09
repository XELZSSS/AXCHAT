import React, { useMemo } from 'react';
import { cn } from './cn';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  compact?: boolean;
};

const BASE = [
  'rounded-lg bg-[var(--bg-2)] text-[var(--ink-1)] outline-none',
  'ring-1 ring-[var(--line-1)] focus:ring-[var(--line-1)]',
  'placeholder:text-[var(--ink-3)]',
].join(' ');

const SIZES = {
  compact: 'px-2.5 py-1.5 text-sm',
  default: 'px-3 py-2 text-sm',
} as const;

const Input = React.memo(
  React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, compact = false, ...props }, ref) => {
      const sizeClass = useMemo(() => (compact ? SIZES.compact : SIZES.default), [compact]);
      return <input ref={ref} className={cn(BASE, sizeClass, className)} {...props} />;
    }
  )
);

Input.displayName = 'Input';

export default Input;
