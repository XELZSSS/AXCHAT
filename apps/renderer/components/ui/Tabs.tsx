import React, { useRef } from 'react';

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

const Tabs = <T extends string>({
  items,
  activeId,
  onChange,
  className = '',
  idPrefix = 'tabs',
}: TabsProps<T>) => {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusAndSelectTab = (index: number) => {
    const next = items[index];
    if (!next) return;
    onChange(next.id);
    window.requestAnimationFrame(() => {
      tabRefs.current[index]?.focus();
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (items.length === 0) return;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        focusAndSelectTab((index + 1) % items.length);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        focusAndSelectTab((index - 1 + items.length) % items.length);
        break;
      case 'Home':
        event.preventDefault();
        focusAndSelectTab(0);
        break;
      case 'End':
        event.preventDefault();
        focusAndSelectTab(items.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="tablist"
      className={`flex w-full flex-none gap-2 overflow-x-auto pb-1 sm:w-44 sm:flex-col sm:overflow-visible ${className}`}
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          id={`${idPrefix}-tab-${item.id}`}
          role="tab"
          aria-selected={activeId === item.id}
          aria-controls={`${idPrefix}-panel-${item.id}`}
          tabIndex={activeId === item.id ? 0 : -1}
          onClick={() => onChange(item.id)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          ref={(node) => {
            tabRefs.current[index] = node;
          }}
          className={`rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
            activeId === item.id
              ? 'bg-[var(--bg-2)] text-[var(--ink-1)] ring-1 ring-[var(--line-1)]'
              : 'text-[var(--ink-3)] hover:bg-[var(--bg-2)] hover:text-[var(--ink-1)]'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
