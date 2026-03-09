import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { t } from '../utils/i18n';

const WinIcon = ({ type }: { type: 'min' | 'max' | 'close' }) => {
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

const TitleBar: React.FC = () => {
  const [maximized, setMaximized] = useState(false);
  const maximizeLabel = useMemo(
    () => (maximized ? t('titlebar.restore') : t('titlebar.maximize')),
    [maximized]
  );

  const handleMinimize = useCallback(() => window.axchat?.minimize(), []);
  const handleToggleMaximize = useCallback(() => window.axchat?.toggleMaximize(), []);
  const handleClose = useCallback(() => window.axchat?.close(), []);

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
        <button
          className="titlebar-btn"
          onClick={handleMinimize}
          aria-label={t('titlebar.minimize')}
          title={t('titlebar.minimize')}
        >
          <WinIcon type="min" />
        </button>
        <button
          className="titlebar-btn"
          onClick={handleToggleMaximize}
          aria-label={maximizeLabel}
          title={maximizeLabel}
        >
          <WinIcon type="max" />
          <span className="sr-only">{maximizeLabel}</span>
        </button>
        <button
          className="titlebar-btn titlebar-btn-close"
          onClick={handleClose}
          aria-label={t('titlebar.close')}
          title={t('titlebar.close')}
        >
          <WinIcon type="close" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
