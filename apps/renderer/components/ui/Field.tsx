import { memo } from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn';

type FieldProps = {
  label: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
};

const Field = ({ label, actions, children, className, id }: FieldProps) => {
  const LabelTag = id ? 'label' : 'div';

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <LabelTag
          {...(id ? { htmlFor: id } : {})}
          className="text-xs font-medium text-[var(--ink-2)]"
        >
          {label}
        </LabelTag>
        {actions}
      </div>
      {children}
    </div>
  );
};

const MemoizedField = memo(Field);
export default MemoizedField;
