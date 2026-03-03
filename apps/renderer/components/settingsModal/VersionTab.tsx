import React from 'react';
import { Button, Field } from '../ui';
import { t } from '../../utils/i18n';

type VersionTabProps = {
  appVersion: string;
  updateStatusText: string;
  updaterStatus: 'checking' | 'available' | 'downloaded' | 'not-available' | 'error' | 'disabled';
  onCheckForUpdates: () => Promise<void>;
  onOpenUpdateDownload: () => Promise<void>;
};

const VersionTab: React.FC<VersionTabProps> = ({
  appVersion,
  updateStatusText,
  updaterStatus,
  onCheckForUpdates,
  onOpenUpdateDownload,
}) => {
  return (
    <div className="space-y-4">
      <Field label={t('settings.version.title')}>
        <div className="space-y-3">
          <div className="text-xs text-[var(--ink-2)]">
            {t('settings.version.current')}: {appVersion ? `v${appVersion}` : '-'}
          </div>
          <div className="text-xs text-[var(--ink-3)]">{updateStatusText}</div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => void onCheckForUpdates()}
              variant="ghost"
              size="sm"
              disabled={updaterStatus === 'checking'}
            >
              {t('settings.update.check')}
            </Button>
            {updaterStatus === 'available' && (
              <Button onClick={() => void onOpenUpdateDownload()} variant="ghost" size="sm">
                {t('settings.update.download')}
              </Button>
            )}
          </div>
        </div>
      </Field>
    </div>
  );
};

export default VersionTab;
