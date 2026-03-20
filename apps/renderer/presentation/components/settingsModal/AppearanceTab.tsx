import { useMemo } from 'react';
import type { Language, LanguagePreference } from '@/shared/utils/i18n';
import type { AccentPreference, Theme, ThemePreference } from '@/shared/utils/theme';
import { t } from '@/shared/utils/i18n';
import { Dropdown, Field } from '@/shared/ui';
import { settingsSectionLabelClass } from '@/presentation/components/settingsModal/constants';
import {
  SettingsCard,
  SettingsControlGroup,
} from '@/presentation/components/settingsModal/formParts';

const ACCENT_OPTIONS: Array<{
  value: AccentPreference;
  swatchClassName: string;
  textClassName?: string;
}> = [
  { value: 'neutral', swatchClassName: 'bg-[var(--ink-1)]' },
  { value: 'blue', swatchClassName: 'bg-[#2563eb]' },
  { value: 'sky', swatchClassName: 'bg-[#0284c7]' },
  { value: 'cyan', swatchClassName: 'bg-[#0891b2]' },
  { value: 'teal', swatchClassName: 'bg-[#0f766e]' },
  { value: 'green', swatchClassName: 'bg-[#16a34a]' },
  { value: 'lime', swatchClassName: 'bg-[#65a30d]' },
  { value: 'amber', swatchClassName: 'bg-[#d97706]' },
  { value: 'orange', swatchClassName: 'bg-[#ea580c]' },
  { value: 'rose', swatchClassName: 'bg-[#ec4899]' },
  { value: 'red', swatchClassName: 'bg-[#dc2626]' },
  { value: 'violet', swatchClassName: 'bg-[#7c3aed]' },
];

type AppearanceTabProps = {
  language: Language;
  languagePreference: LanguagePreference;
  theme: Theme;
  themePreference: ThemePreference;
  accentPreference: AccentPreference;
  onLanguagePreferenceChange: (value: LanguagePreference) => void;
  onThemePreferenceChange: (value: ThemePreference) => void;
  onAccentPreferenceChange: (value: AccentPreference) => void;
};

const AppearanceTab = ({
  language,
  languagePreference,
  theme,
  themePreference,
  accentPreference,
  onLanguagePreferenceChange,
  onThemePreferenceChange,
  onAccentPreferenceChange,
}: AppearanceTabProps) => {
  const languageOptions = useMemo(
    () => [
      {
        value: 'system',
        label: `${t('language.system')} (${language === 'en' ? t('language.en') : t('language.zhCN')})`,
      },
      { value: 'en', label: t('language.en') },
      { value: 'zh-CN', label: t('language.zhCN') },
    ],
    [language]
  );

  const themeOptions = useMemo(
    () => [
      {
        value: 'system',
        label: `${t('theme.system')} (${theme === 'dark' ? t('theme.dark') : t('theme.light')})`,
      },
      { value: 'light', label: t('theme.light') },
      { value: 'dark', label: t('theme.dark') },
    ],
    [theme]
  );

  return (
    <div className="space-y-5">
      <Field label={null}>
        <SettingsCard className="space-y-4">
          <SettingsControlGroup
            label={t('settings.appearance.language.label')}
            labelClassName={settingsSectionLabelClass}
          >
            <Dropdown
              value={languagePreference}
              options={languageOptions}
              onChange={(value) => onLanguagePreferenceChange(value as LanguagePreference)}
              widthClassName="w-full"
            />
          </SettingsControlGroup>

          <SettingsControlGroup
            label={t('settings.appearance.theme.label')}
            labelClassName={settingsSectionLabelClass}
          >
            <Dropdown
              value={themePreference}
              options={themeOptions}
              onChange={(value) => onThemePreferenceChange(value as ThemePreference)}
              widthClassName="w-full"
            />
          </SettingsControlGroup>

          <SettingsControlGroup
            label={t('settings.appearance.accent.label')}
            labelClassName={settingsSectionLabelClass}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ACCENT_OPTIONS.map((option) => {
                const isActive = accentPreference === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onAccentPreferenceChange(option.value)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors duration-160 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-interactive)] ${
                      isActive
                        ? 'border-[var(--ink-1)] bg-[var(--bg-2)] text-[var(--ink-1)]'
                        : 'border-[var(--line-1)] text-[var(--ink-2)] hover:bg-[var(--bg-2)] hover:text-[var(--ink-1)]'
                    }`}
                    aria-pressed={isActive}
                  >
                    <span
                      className={`inline-flex h-3 w-3 rounded-full ${option.swatchClassName} ${option.textClassName ?? ''}`}
                    />
                    <span>{t(`settings.appearance.accent.${option.value}`)}</span>
                  </button>
                );
              })}
            </div>
          </SettingsControlGroup>
        </SettingsCard>
      </Field>
    </div>
  );
};

export default AppearanceTab;
