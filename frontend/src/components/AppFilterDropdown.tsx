import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Boxes, ChevronDown, Check, X, Search, Layers, HelpCircle } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import Tooltip from './Tooltip';
import type { SourceAppItem } from '../types';

export interface AppFilterDropdownProps {
  value: string | null;
  onChange: (app: string | null) => void;
  apps: SourceAppItem[];
  variant?: 'compact' | 'full';
}

export const AppFilterDropdown: React.FC<AppFilterDropdownProps> = ({
  value,
  onChange,
  apps,
  variant = 'compact',
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 210,
  });

  const selectedAppItem = useMemo(
    () => (value ? apps.find((a) => a.app.toLowerCase() === value.toLowerCase()) : null),
    [apps, value]
  );

  const totalAppClips = useMemo(() => apps.reduce((sum, item) => sum + item.count, 0), [apps]);

  const filteredApps = useMemo(() => {
    if (!searchFilter.trim()) return apps;
    const q = searchFilter.trim().toLowerCase();
    return apps.filter((a) => {
      const appName =
        a.app === '__unknown__'
          ? t('compact.unknownApp', { defaultValue: 'Sin aplicación detectada' })
          : a.app;
      return appName.toLowerCase().includes(q) || a.app.toLowerCase().includes(q);
    });
  }, [apps, searchFilter, t]);

  // Close dropdown on window hide
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<boolean>('window-visibility', (event) => {
      if (!event.payload) {
        setIsOpen(false);
      }
    })
      .then((cleanup) => {
        unlisten = cleanup;
      })
      .catch(console.error);

    return () => {
      unlisten?.();
    };
  }, []);

  // Close dropdown on reset view trigger
  useEffect(() => {
    const handleReset = () => setIsOpen(false);
    window.addEventListener('cyberpaste-reset-view', handleReset);
    return () => window.removeEventListener('cyberpaste-reset-view', handleReset);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchFilter('');
      return;
    }
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      const menuEl = document.getElementById('app-filter-menu-popover');
      if (menuEl?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && apps.length > 5) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, apps.length]);

  const openMenu = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = 210;
    const viewportRight = window.innerWidth - 6;
    let left = rect.right - width;
    if (left + width > viewportRight) left = viewportRight - width;
    if (left < 6) left = 6;
    setMenuPos({ top: rect.bottom + 4, left, width });
    setIsOpen(true);
  };

  const isActive = Boolean(value);
  const displayLabel = value
    ? value === '__unknown__'
      ? t('compact.unknownApp', { defaultValue: 'Sin aplicación detectada' })
      : selectedAppItem?.app || value
    : t('compact.filterAppTitle', { defaultValue: 'Filter by app' });

  // Tooltip
  const tooltipLabel = isActive
    ? `${t('compact.filterAppActive', { app: displayLabel, defaultValue: `Filtering by ${displayLabel}` })}`
    : t('compact.filterAppTitle', { defaultValue: 'Filter by app' });

  return (
    <>
      <Tooltip label={tooltipLabel} placement="bottom">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
          className={clsx(
            'flex flex-shrink-0 items-center gap-1.5 font-medium transition-all focus:outline-none focus-visible:ring-0',
            variant === 'compact'
              ? 'h-[30px] rounded-lg border px-2 text-[11px]'
              : 'h-7 rounded-full px-2.5 text-[11px] leading-normal',
            isActive
              ? 'border-primary/40 bg-primary/15 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.18)]'
              : variant === 'compact'
                ? 'border-border bg-secondary/40 text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground'
                : 'text-muted-foreground/75 hover:text-foreground',
            isOpen && 'border-primary/60 bg-primary/15 text-primary'
          )}
        >
          {isActive && value === '__unknown__' ? (
            <HelpCircle size={12} className="shrink-0 text-primary" />
          ) : isActive && selectedAppItem?.icon ? (
            <img
              src={`data:image/png;base64,${selectedAppItem.icon}`}
              alt=""
              draggable="false"
              className="h-3.5 w-3.5 object-contain"
            />
          ) : (
            <Boxes size={12} className="shrink-0" />
          )}

          {isActive ? (
            <span className="max-w-[80px] truncate whitespace-nowrap">{displayLabel}</span>
          ) : variant === 'full' ? (
            <span className="whitespace-nowrap">
              {t('compact.allApps', { defaultValue: 'Apps' })}
            </span>
          ) : null}

          {isActive ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
                setIsOpen(false);
              }}
              className="ml-0.5 rounded-full p-0.5 opacity-70 hover:bg-primary/20 hover:opacity-100"
              title={t('compact.clearAppFilter', { defaultValue: 'Clear app filter' })}
            >
              <X size={10} />
            </span>
          ) : (
            <ChevronDown
              size={11}
              className={clsx('opacity-70 transition-transform', isOpen && 'rotate-180')}
            />
          )}
        </button>
      </Tooltip>

      {isOpen && (
        <div
          id="app-filter-menu-popover"
          className="fixed z-[200] flex max-h-[300px] flex-col overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-[0_8px_24px_rgba(0,0,0,0.25)] backdrop-blur-md"
          style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
        >
          {apps.length > 5 && (
            <div className="border-b border-border/50 px-2 pb-1.5 pt-1">
              <div className="relative flex items-center">
                <Search size={11} className="absolute left-2 text-muted-foreground/60" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder={t('compact.searchApps', { defaultValue: 'Search apps...' })}
                  className="h-6 w-full rounded border border-border/60 bg-background/50 pl-6 pr-2 text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="no-scrollbar max-h-[230px] overflow-y-auto py-0.5">
            {/* All Apps option */}
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className={clsx(
                'flex w-full items-center gap-2 px-2.5 py-1.5 text-[11px] transition-colors',
                !value
                  ? 'bg-primary/15 text-primary'
                  : 'text-foreground/75 hover:bg-accent hover:text-foreground'
              )}
            >
              <Layers
                size={12}
                className={clsx(!value ? 'text-primary' : 'text-muted-foreground/80')}
              />
              <span className="flex-1 truncate text-left">
                {t('compact.allApps', { defaultValue: 'All applications' })}
              </span>
              {totalAppClips > 0 && (
                <span
                  className={clsx(
                    'px-1 font-mono text-[9px] opacity-40',
                    !value && 'text-primary opacity-85'
                  )}
                >
                  ({totalAppClips})
                </span>
              )}
              {!value && <Check size={11} className="text-primary" />}
            </button>

            {/* List of individual apps */}
            {filteredApps.map((item) => {
              const isSel = value?.toLowerCase() === item.app.toLowerCase();
              return (
                <button
                  key={item.app}
                  type="button"
                  onClick={() => {
                    onChange(isSel ? null : item.app);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    'flex w-full items-center gap-2 px-2.5 py-1.5 text-[11px] transition-colors',
                    isSel
                      ? 'bg-primary/15 text-primary'
                      : 'text-foreground/75 hover:bg-accent hover:text-foreground'
                  )}
                >
                  {item.app === '__unknown__' ? (
                    <HelpCircle
                      size={13}
                      className={clsx(isSel ? 'text-primary' : 'text-muted-foreground/80')}
                    />
                  ) : item.icon ? (
                    <img
                      src={`data:image/png;base64,${item.icon}`}
                      alt=""
                      draggable="false"
                      className="h-3.5 w-3.5 shrink-0 object-contain"
                    />
                  ) : (
                    <Boxes
                      size={12}
                      className={clsx(isSel ? 'text-primary' : 'text-muted-foreground/80')}
                    />
                  )}
                  <span
                    className="flex-1 truncate text-left"
                    title={
                      item.app === '__unknown__'
                        ? t('compact.unknownApp', { defaultValue: 'Sin aplicación detectada' })
                        : item.app
                    }
                  >
                    {item.app === '__unknown__'
                      ? t('compact.unknownApp', { defaultValue: 'Sin aplicación detectada' })
                      : item.app}
                  </span>
                  <span
                    className={clsx(
                      'px-1 font-mono text-[9px] opacity-40',
                      isSel && 'text-primary opacity-85'
                    )}
                  >
                    ({item.count})
                  </span>
                  {isSel && <Check size={11} className="text-primary" />}
                </button>
              );
            })}

            {filteredApps.length === 0 && (
              <div className="px-3 py-2 text-center text-[10px] text-muted-foreground">
                {t('compact.noMatchFilter', { defaultValue: 'No apps found' })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
