import React, { useMemo } from 'react';
import { cn } from './cn';

type FieldProps = {
  label: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
};

const Field: React.FC<FieldProps> = ({ label, actions, children, className, id }) => {
  const LabelTag = useMemo(() => (id ? 'label' : 'div'), [id]);

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

const MemoizedField = React.memo(Field);
export default MemoizedField;
