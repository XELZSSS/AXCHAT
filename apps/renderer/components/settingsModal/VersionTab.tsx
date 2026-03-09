import React, { useCallback, useMemo } from 'react';
import { Button, Field, Toggle } from '../ui';
import { t } from '../../utils/i18n';

type VersionTabProps = {
  appVersion: string;
  updateStatusText: string;
  updaterStatus:
    | 'idle'
    | 'checking'
    | 'available'
    | 'downloaded'
    | 'not-available'
    | 'error'
    | 'disabled';
  staticProxyHttp2Enabled: boolean;
  onCheckForUpdates: () => Promise<void>;
  onOpenUpdateDownload: () => Promise<void>;
  onSetStaticProxyHttp2Enabled: (enabled: boolean) => void;
};

const VersionTab: React.FC<VersionTabProps> = ({
  appVersion,
  updateStatusText,
  updaterStatus,
  staticProxyHttp2Enabled,
  onCheckForUpdates,
  onOpenUpdateDownload,
  onSetStaticProxyHttp2Enabled,
}) => {
  const currentVersionLabel = useMemo(
    () => `${t('settings.version.current')}: ${appVersion ? `v${appVersion}` : '-'}`,
    [appVersion]
  );
  const handleCheckUpdates = useCallback(() => {
    void onCheckForUpdates();
  }, [onCheckForUpdates]);
  const handleOpenDownload = useCallback(() => {
    void onOpenUpdateDownload();
  }, [onOpenUpdateDownload]);
  const handleStaticHttp2Change = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      onSetStaticProxyHttp2Enabled(event.target.checked),
    [onSetStaticProxyHttp2Enabled]
  );

  return (
    <div className="space-y-5">
      <Field label={t('settings.version.title')}>
        <div className="rounded-xl border border-[var(--line-1)] bg-[var(--bg-2)]/40 p-4 space-y-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-[var(--ink-2)]">{currentVersionLabel}</div>
            <div className="text-xs text-[var(--ink-3)]">{updateStatusText}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleCheckUpdates}
              variant="ghost"
              size="sm"
              disabled={updaterStatus === 'checking'}
            >
              {t('settings.update.check')}
            </Button>
            {updaterStatus === 'available' && (
              <Button onClick={handleOpenDownload} variant="ghost" size="sm">
                {t('settings.update.download')}
              </Button>
            )}
          </div>
        </div>
      </Field>

      <Field label={t('settings.proxy.title')}>
        <div className="rounded-xl border border-[var(--line-1)] bg-[var(--bg-2)]/40 p-4 space-y-4">
          <label className="flex items-start gap-3 text-xs text-[var(--ink-3)]">
            <Toggle checked={staticProxyHttp2Enabled} onChange={handleStaticHttp2Change} />
            <span className="space-y-1">
              <span className="block text-xs font-medium text-[var(--ink-2)]">
                {t('settings.proxy.staticHttp2')}
              </span>
              <span className="block text-[11px] leading-5 text-[var(--ink-3)]">
                {t('settings.proxy.staticHttp2.help')}
              </span>
            </span>
          </label>
        </div>
      </Field>
    </div>
  );
};

export default VersionTab;
