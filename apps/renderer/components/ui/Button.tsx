import React from 'react';
import { cn } from './cn';

type ButtonVariant = 'primary' | 'ghost' | 'subtle';
type ButtonSize = 'sm' | 'md' | 'icon';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent)] text-[#1a1a1a] hover:bg-[var(--accent-strong)] disabled:opacity-50 disabled:cursor-not-allowed',
  ghost: 'text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:bg-[var(--bg-2)]',
  subtle: 'ring-1 ring-[var(--line-1)] text-[var(--ink-2)] hover:bg-[var(--bg-2)]',
};

const sizeClassMap: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-3.5 py-1.5 text-sm',
  icon: 'h-9 w-9',
};

const BASE_BUTTON_CLASS = 'rounded-lg font-medium transition-colors duration-[160ms] ease-out';

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', size = 'md', className = '', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(BASE_BUTTON_CLASS, variantClassMap[variant], sizeClassMap[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export default Button;
