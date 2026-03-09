import React, { useCallback, useId, useMemo, useRef } from 'react';
import { cn } from './cn';

type TabItem<T extends string> = {
  id: T;
  label: string;
};

type TabsProps<T extends string> = {
  items: Array<TabItem<T>>;
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
  idPrefix?: string;
};

const TAB_BASE =
  'rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors duration-160 ease-out';

const TAB_STYLES = {
  active: 'bg-[var(--bg-2)] text-[var(--ink-1)] ring-1 ring-[var(--line-1)]',
  inactive: 'text-[var(--ink-3)] hover:bg-[var(--bg-2)] hover:text-[var(--ink-1)]',
} as const;

const getWrappedIndex = (index: number, length: number) => {
  if (length === 0) return -1;
  return (index + length) % length;
};

const Tabs = <T extends string>({
  items,
  activeId,
  onChange,
  className,
  idPrefix,
}: TabsProps<T>) => {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const autoId = useId().replace(/:/g, '');
  const prefix = useMemo(() => idPrefix ?? `tabs-${autoId}`, [autoId, idPrefix]);

  const focusAndSelect = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) return;

      onChange(item.id);
      tabRefs.current[index]?.focus();
    },
    [items, onChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const { key } = event;
      const len = items.length;
      if (len === 0) return;

      const actions: Record<string, () => void> = {
        ArrowRight: () => focusAndSelect(getWrappedIndex(index + 1, len)),
        ArrowDown: () => focusAndSelect(getWrappedIndex(index + 1, len)),
        ArrowLeft: () => focusAndSelect(getWrappedIndex(index - 1, len)),
        ArrowUp: () => focusAndSelect(getWrappedIndex(index - 1, len)),
        Home: () => focusAndSelect(0),
        End: () => focusAndSelect(len - 1),
      };

      const action = actions[key];
      if (action) {
        event.preventDefault();
        action();
      }
    },
    [focusAndSelect, items.length]
  );

  return (
    <div
      role="tablist"
      className={cn(
        'flex w-full flex-none gap-1 overflow-x-auto pb-1 sm:w-40 sm:flex-col sm:overflow-visible',
        className
      )}
    >
      {items.map((item, index) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            id={`${prefix}-tab-${item.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${prefix}-panel-${item.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            className={cn(TAB_BASE, isActive ? TAB_STYLES.active : TAB_STYLES.inactive)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
