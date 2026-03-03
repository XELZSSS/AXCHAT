import React from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { t } from '../../utils/i18n';
import { Button, Field, Input } from '../ui';
import { fullInputClass } from './constants';

type MemoryExportTabProps = {
  mem0ApiKey: string;
  mem0UserId: string;
  showMem0ApiKey: boolean;
  isExporting: boolean;
  statusText: string;
  onMem0ApiKeyChange: (value: string) => void;
  onMem0UserIdChange: (value: string) => void;
  onToggleMem0ApiKeyVisibility: () => void;
  onExport: () => void;
};

const MemoryExportTab: React.FC<MemoryExportTabProps> = ({
  mem0ApiKey,
  mem0UserId,
  showMem0ApiKey,
  isExporting,
  statusText,
  onMem0ApiKeyChange,
  onMem0UserIdChange,
  onToggleMem0ApiKeyVisibility,
  onExport,
}) => {
  return (
    <div className="space-y-4">
      <Field label={t('settings.memoryExport.title')}>
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs text-[var(--ink-3)]">
              {t('settings.memoryExport.apiKey')}
            </label>
            <div className="relative">
              <Input
                type={showMem0ApiKey ? 'text' : 'password'}
                value={mem0ApiKey}
                onChange={(event) => onMem0ApiKeyChange(event.target.value)}
                className={`${fullInputClass} pr-20`}
                compact
                autoComplete="off"
              />
              <div className="absolute inset-y-0 right-2 flex items-center gap-1.5">
                <Button
                  onClick={onToggleMem0ApiKeyVisibility}
                  variant="ghost"
                  size="sm"
                  className="!px-0 !py-0 h-auto"
                  aria-label={
                    showMem0ApiKey ? t('settings.apiKey.hide') : t('settings.apiKey.show')
                  }
                >
                  {showMem0ApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
                <Button
                  onClick={() => onMem0ApiKeyChange('')}
                  variant="ghost"
                  size="sm"
                  className="!px-0 !py-0 h-auto hover:text-red-400"
                  aria-label={t('settings.apiKey.clear')}
                  title={t('settings.apiKey.clear')}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[var(--ink-3)]">
              {t('settings.memoryExport.userId')}
            </label>
            <Input
              type="text"
              value={mem0UserId}
              onChange={(event) => onMem0UserIdChange(event.target.value)}
              className={fullInputClass}
              compact
              autoComplete="off"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs text-[var(--ink-3)]">{statusText}</div>
            <Button onClick={onExport} variant="ghost" size="sm" disabled={isExporting}>
              {isExporting
                ? t('settings.memoryExport.exporting')
                : t('settings.memoryExport.action')}
            </Button>
          </div>
        </div>
      </Field>
    </div>
  );
};

export default MemoryExportTab;
