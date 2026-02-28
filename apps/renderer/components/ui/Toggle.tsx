import React from 'react';

type ToggleProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

const Toggle: React.FC<ToggleProps> = ({ className = '', ...props }) => {
  return (
    <input
      type="checkbox"
      className={`relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full border border-[var(--line-1)] bg-[var(--bg-1)] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-3.5 after:w-3.5 after:rounded-full after:bg-[var(--ink-3)] after:transition-transform after:duration-200 checked:border-[var(--ink-2)] checked:bg-[var(--bg-2)] checked:after:translate-x-4 checked:after:bg-[var(--ink-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--line-1)] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
};

export default Toggle;
