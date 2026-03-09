import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDropdownKeyboard } from './useDropdownKeyboard';
import { useDropdownPosition } from './useDropdownPosition';

type DropdownOption = {
  value: string;
  label: string;
  group?: string;
};

type DropdownProps = {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  widthClassName?: string;
  portalContainer?: HTMLElement | null;
};

const Dropdown: React.FC<DropdownProps> = ({
  value,
  options,
  onChange,
  widthClassName,
  portalContainer,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selectedIndex = useMemo(
    () =>
      Math.max(
        0,
        options.findIndex((option) => option.value === value)
      ),
    [options, value]
  );

  const current = useMemo(
    () => options.find((option) => option.value === value)?.label ?? value,
    [options, value]
  );
  const lastIndex = useMemo(() => Math.max(0, options.length - 1), [options.length]);

  const handleRequestClose = useCallback(() => setOpen(false), []);
  const { position, menuReady, updatePosition } = useDropdownPosition({
    open,
    containerRef,
    triggerRef,
    menuRef,
    onRequestClose: handleRequestClose,
  });

  const { focusedIndex, setFocusedIndex, closeMenu, handleTriggerKeyDown, handleMenuKeyDown } =
    useDropdownKeyboard({
      open,
      setOpen,
      selectedIndex,
      lastIndex,
      triggerRef,
      updatePosition,
      onSelectIndex: (index) => {
        const option = options[index];
        if (!option) return;
        onChange(option.value);
        closeMenu();
      },
    });

  useEffect(() => {
    if (!open || !menuReady) return;
    menuRef.current?.focus();
    const target = optionRefs.current[focusedIndex];
    target?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex, menuReady, open]);

  return (
    <div ref={containerRef} className={`relative w-full ${widthClassName ?? 'sm:w-56'}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          updatePosition();
          setOpen((prev) => !prev);
        }}
        onKeyDown={handleTriggerKeyDown}
        className="flex w-full items-center justify-between rounded-lg bg-[var(--bg-2)] px-2.5 py-1.5 text-xs text-[var(--ink-2)] outline-none ring-1 ring-[var(--line-1)] focus:ring-[var(--line-1)]"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
      >
        <span>{current}</span>
      </button>

      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              id={listboxId}
              className={`fixed z-[80] max-h-56 overflow-auto scrollbar-hide rounded-lg border border-[var(--line-1)] bg-[var(--bg-2)] p-1 transition-opacity duration-90 ease-out motion-reduce:transition-none ${
                menuReady ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              style={{
                left: position.left,
                width: position.width,
                top: position.openUp ? position.top - 8 : position.top + position.height + 8,
                transform: position.openUp ? 'translateY(-100%)' : undefined,
              }}
              role="listbox"
              tabIndex={-1}
              onKeyDown={handleMenuKeyDown}
            >
              {options.map((option, index) => (
                <div key={option.value}>
                  {option.group && option.group !== options[index - 1]?.group ? (
                    <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--ink-3)] first:pt-1">
                      {option.group}
                    </div>
                  ) : null}
                  <div className="px-1 py-0.5">
                    <button
                      ref={(node) => {
                        optionRefs.current[index] = node;
                      }}
                      type="button"
                      onClick={() => {
                        const option = options[index];
                        if (!option) return;
                        onChange(option.value);
                        closeMenu();
                      }}
                      onMouseEnter={() => setFocusedIndex(index)}
                      className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-xs transition-colors duration-90 ease-out ${
                        focusedIndex === index
                          ? 'bg-[var(--bg-1)] text-[var(--ink-1)]'
                          : option.value === value
                            ? 'bg-[var(--bg-1)] text-[var(--ink-1)]'
                            : 'text-[var(--ink-2)] hover:bg-[var(--bg-1)] hover:text-[var(--ink-1)]'
                      }`}
                      role="option"
                      aria-selected={option.value === value}
                    >
                      {option.label}
                    </button>
                  </div>
                </div>
              ))}
            </div>,
            portalContainer ?? document.body
          )
        : null}
    </div>
  );
};

export type { DropdownOption };
export default Dropdown;
