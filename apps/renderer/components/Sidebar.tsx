import React, { useCallback, useMemo, useRef } from 'react';
import { ChatSession } from '../types';
import { Language, t } from '../utils/i18n';
import { Theme } from '../utils/theme';
import { Button, IconButton, Input } from './ui';
import {
  AddIcon,
  ChatBubbleOutlineIcon,
  CheckIcon,
  CloseIcon,
  DarkModeOutlinedIcon,
  DeleteOutlineIcon,
  EditOutlinedIcon,
  LanguageIcon,
  LightModeOutlinedIcon,
  SearchIcon,
  SettingsOutlinedIcon,
} from './icons';

type SidebarProps = {
  currentSessionId: string;
  sessions: ChatSession[];
  filteredSessions: ChatSession[];
  searchQuery: string;
  editingSessionId: string | null;
  editTitleInput: string;
  language: Language;
  theme: Theme;
  onNewChatClick: () => void;
  onSearchChange: (value: string) => void;
  onLoadSession: (session: ChatSession) => void;
  onStartEdit: (e: React.MouseEvent, session: ChatSession) => void;
  onDeleteSession: (e: React.MouseEvent, sessionId: string) => void;
  onEditTitleInputChange: (value: string) => void;
  onEditInputClick: (e: React.MouseEvent) => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  onSaveEdit: (e: React.FormEvent | React.MouseEvent) => void;
  onCancelEdit: (e: React.MouseEvent) => void;
  onThemeToggle: () => void;
  onLanguageChange: (nextLanguage: Language) => void;
  onOpenSettings: () => void;
};

const SidebarComponent: React.FC<SidebarProps> = ({
  currentSessionId,
  sessions,
  filteredSessions,
  searchQuery,
  editingSessionId,
  editTitleInput,
  language,
  theme,
  onNewChatClick,
  onSearchChange,
  onLoadSession,
  onStartEdit,
  onDeleteSession,
  onEditTitleInputChange,
  onEditInputClick,
  onEditKeyDown,
  onSaveEdit,
  onCancelEdit,
  onThemeToggle,
  onLanguageChange,
  onOpenSettings,
}) => {
  const listContainerRef = useRef<HTMLDivElement>(null);

  const handleSessionItemKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, session: ChatSession) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      onLoadSession(session);
    },
    [onLoadSession]
  );

  const isEnglish = language === 'en';
  const isDarkTheme = theme === 'dark';
  const languageLabel = useMemo(
    () => (isEnglish ? t('language.en') : t('language.zhCN')),
    [isEnglish]
  );
  const themeLabel = useMemo(
    () => (isDarkTheme ? t('theme.dark') : t('theme.light')),
    [isDarkTheme]
  );

  const handleLanguageToggle = useCallback(() => {
    onLanguageChange(isEnglish ? 'zh-CN' : 'en');
  }, [isEnglish, onLanguageChange]);

  return (
    <aside className="sidebar relative z-30 w-72 h-full bg-[var(--bg-1)] border-r border-[var(--line-1)]">
      <div className="flex flex-col h-full p-4">
        <Button
          onClick={onNewChatClick}
          variant="primary"
          size="md"
          className="w-full flex items-center justify-center gap-2 !py-2 mb-4"
        >
          <AddIcon sx={{ fontSize: 16 }} />
          <span>{t('sidebar.newChat')}</span>
        </Button>

        <div className="mb-3">
          <div className="relative group">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)] group-focus-within:text-[var(--ink-2)]"
              sx={{ fontSize: 14 }}
            />
            <Input
              type="text"
              placeholder={t('sidebar.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full !h-9 !pl-9 !pr-3 !py-0 text-sm"
            />
          </div>
        </div>

        <div ref={listContainerRef} className="flex-1 overflow-y-auto">
          <div className="text-[10px] font-medium text-[var(--ink-3)] uppercase tracking-wide mb-2 px-2">
            {t('sidebar.history')}
          </div>

          {sessions.length === 0 ? (
            <div className="px-2 py-2 text-sm text-[var(--ink-3)]">
              {t('sidebar.noConversations')}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="px-2 py-2 text-sm text-[var(--ink-3)]">{t('sidebar.noMatching')}</div>
          ) : (
            <div className="space-y-0.5">
              {filteredSessions.map((session) => {
                return (
                  <div key={session.id}>
                    <div
                      onClick={() => onLoadSession(session)}
                      onKeyDown={(event) => handleSessionItemKeyDown(event, session)}
                      role="button"
                      tabIndex={editingSessionId === session.id ? -1 : 0}
                      aria-current={
                        currentSessionId === session.id && editingSessionId !== session.id
                          ? 'page'
                          : undefined
                      }
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors duration-160 ease-out text-sm ${
                        currentSessionId === session.id && editingSessionId !== session.id
                          ? 'bg-[var(--bg-2)] text-[var(--ink-1)]'
                          : 'text-[var(--ink-2)] hover:bg-[var(--bg-2)] hover:text-[var(--ink-1)]'
                      }`}
                    >
                      {editingSessionId === session.id ? (
                        <div className="flex items-center gap-1 w-full" onClick={onEditInputClick}>
                          <Input
                            type="text"
                            autoFocus
                            value={editTitleInput}
                            onChange={(e) => onEditTitleInputChange(e.target.value)}
                            onKeyDown={onEditKeyDown}
                            className="flex-1 !text-xs !px-2 !py-1.5"
                            compact
                          />
                          <IconButton
                            onClick={onSaveEdit}
                            className="!h-6 !w-6 !ring-0 !bg-transparent hover:!bg-[var(--bg-2)]"
                            aria-label={t('settings.modal.save')}
                            title={t('settings.modal.save')}
                          >
                            <CheckIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                          <IconButton
                            onClick={onCancelEdit}
                            danger
                            className="!h-6 !w-6 !ring-0 !bg-transparent hover:!bg-[var(--bg-2)]"
                            aria-label={t('settings.modal.cancel')}
                            title={t('settings.modal.cancel')}
                          >
                            <CloseIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </div>
                      ) : (
                        <>
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <ChatBubbleOutlineIcon
                              className="flex-shrink-0 text-[var(--ink-3)]"
                              sx={{ fontSize: 14 }}
                            />
                            <span className="truncate font-medium">{session.title}</span>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                            <IconButton
                              onClick={(e) => onStartEdit(e, session)}
                              className="!h-7 !w-7 !ring-0 !bg-transparent hover:!bg-[var(--bg-2)]"
                              aria-label={t('sidebar.editTitle')}
                              title={t('sidebar.editTitle')}
                            >
                              <EditOutlinedIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                            <IconButton
                              onClick={(e) => onDeleteSession(e, session.id)}
                              danger
                              className="!h-7 !w-7 !ring-0 !bg-transparent hover:!bg-[var(--bg-2)]"
                              aria-label={t('sidebar.deleteTitle')}
                              title={t('sidebar.deleteTitle')}
                            >
                              <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-auto space-y-0.5">
          <Button
            onClick={handleLanguageToggle}
            variant="ghost"
            size="md"
            className="flex items-center gap-3 text-sm w-full justify-start !bg-transparent hover:!bg-[var(--bg-2)]"
          >
            <LanguageIcon sx={{ fontSize: 16 }} />
            <span>{languageLabel}</span>
          </Button>
          <Button
            onClick={onThemeToggle}
            variant="ghost"
            size="md"
            className="flex items-center gap-3 text-sm w-full justify-start !bg-transparent hover:!bg-[var(--bg-2)]"
            aria-label={t('sidebar.toggleTheme')}
            title={t('sidebar.toggleTheme')}
          >
            {isDarkTheme ? (
              <DarkModeOutlinedIcon sx={{ fontSize: 16 }} />
            ) : (
              <LightModeOutlinedIcon sx={{ fontSize: 16 }} />
            )}
            <span>{themeLabel}</span>
          </Button>
          <Button
            onClick={onOpenSettings}
            variant="ghost"
            size="md"
            className="flex items-center gap-3 text-sm w-full justify-start !bg-transparent hover:!bg-[var(--bg-2)]"
          >
            <SettingsOutlinedIcon sx={{ fontSize: 16 }} />
            <span>{t('sidebar.settings')}</span>
          </Button>
        </div>
      </div>
    </aside>
  );
};

const Sidebar = React.memo(SidebarComponent);
export default Sidebar;
