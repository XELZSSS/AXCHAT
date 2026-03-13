import { forwardRef, memo } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type ButtonVariant = 'primary' | 'ghost' | 'subtle' | 'danger';
type ButtonSize = 'sm' | 'md' | 'icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--action-interactive)] text-[var(--text-on-interactive)] hover:bg-[var(--action-interactive)]',
  ghost: 'text-[var(--ink-2)] hover:text-[var(--ink-1)] hover:bg-[var(--bg-2)]',
  subtle: 'ring-1 ring-[var(--line-1)] text-[var(--ink-1)] hover:bg-[var(--bg-2)]',
  danger:
    'bg-[#ff3b30] text-white hover:bg-[#ff2015] ring-1 ring-[#ff3b30] shadow-[0_8px_20px_rgba(255,59,48,0.25)]',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-1.5 text-sm',
  icon: 'h-8 w-8 flex items-center justify-center',
};

const BASE = [
  'rounded-lg font-medium transition-colors duration-160 ease-out',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-interactive)]',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const Button = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'ghost', size = 'md', className, type = 'button', ...props }, ref) => {
      return (
        <button
          ref={ref}
          type={type}
          className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
          {...props}
        />
      );
    }
  )
);

Button.displayName = 'Button';

export default Button;
