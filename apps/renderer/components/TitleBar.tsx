import { useCallback, useEffect, useMemo, useState } from 'react';
import { t } from '../utils/i18n';

type WindowControlType = 'min' | 'max' | 'close';

const WinIcon = ({ type }: { type: WindowControlType }) => {
  switch (type) {
    case 'min':
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <rect x="1" y="5" width="8" height="1" fill="currentColor" />
        </svg>
      );
    case 'max':
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <rect
            x="1.5"
            y="1.5"
            width="7"
            height="7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </svg>
      );
    default:
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 2 L8 8 M8 2 L2 8" stroke="currentColor" strokeWidth="1" />
        </svg>
      );
  }
};

const isElectron = typeof window !== 'undefined' && !!window.axchat;
const BUTTON_CLASS =
  'titlebar-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-interactive)]';

const TitleBar = () => {
  const [maximized, setMaximized] = useState(false);
  const maximizeLabel = useMemo(
    () => (maximized ? t('titlebar.restore') : t('titlebar.maximize')),
    [maximized]
  );

  const handleMinimize = useCallback(() => window.axchat?.minimize(), []);
  const handleToggleMaximize = useCallback(() => window.axchat?.toggleMaximize(), []);
  const handleClose = useCallback(() => window.axchat?.close(), []);
  const controls = useMemo(
    () => [
      {
        key: 'min',
        label: t('titlebar.minimize'),
        className: BUTTON_CLASS,
        onClick: handleMinimize,
      },
      {
        key: 'max',
        label: maximizeLabel,
        className: BUTTON_CLASS,
        onClick: handleToggleMaximize,
      },
      {
        key: 'close',
        label: t('titlebar.close'),
        className: `${BUTTON_CLASS} titlebar-btn-close`,
        onClick: handleClose,
      },
    ] as const,
    [handleClose, handleMinimize, handleToggleMaximize, maximizeLabel]
  );

  useEffect(() => {
    if (!isElectron || !window.axchat) return;
    let cleanup: (() => void) | undefined;
    window.axchat.isMaximized().then((value) => setMaximized(value));
    cleanup = window.axchat.onMaximizeChanged((value) => setMaximized(value));
    return () => cleanup?.();
  }, []);

  if (!isElectron) return null;

  return (
    <div className="titlebar">
      <div className="titlebar-drag" />
      <div className="titlebar-controls">
        {controls.map((control) => (
          <button
            key={control.key}
            className={control.className}
            onClick={control.onClick}
            aria-label={control.label}
            title={control.label}
          >
            <WinIcon type={control.key} />
            {control.key === 'max' && <span className="sr-only">{control.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TitleBar;
