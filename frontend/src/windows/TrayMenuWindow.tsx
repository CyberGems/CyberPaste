import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from 'react-i18next';
import {
  AppWindow,
  Book,
  ChevronLeft,
  ChevronRight,
  Globe,
  Heart,
  HelpCircle,
  Info,
  Gem,
  Lock,
  Pause,
  Pin,
  Play,
  Power,
  RefreshCw,
  Settings,
  Tag,
} from 'lucide-react';
import { clsx } from 'clsx';
import { openUrl } from '@tauri-apps/plugin-opener';
import { resolveLanguage, useLanguage } from '../hooks/useLanguage';
import type { Settings as AppSettings } from '../types';
import { RECOMMENDED_SUITE_APPS } from '../data/suiteApps';

/** Resolve the effective palette class for the tray menu (mirrors useTheme). */
function trayThemeClass(theme: string | undefined): 'cyberpaste' | 'dark' | 'light' {
  const t = theme || 'cyberpaste';
  if (t === 'dark' || t === 'light') return t;
  if (t === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'cyberpaste' : 'light';
  }
  return 'cyberpaste';
}

function applyTrayTheme(theme: string | undefined) {
  const cls = trayThemeClass(theme);
  const root = window.document.documentElement;
  root.classList.remove('cyberpaste', 'dark', 'light', 'toast-window');
  root.classList.add(cls);
}

export interface TrayMenuState {
  version: string;
  hotkey: string;
  is_visible: boolean;
  is_paused: boolean;
  update_available: boolean;
  language: string;
  show_app_recommendations?: boolean;
  lock_enabled?: boolean;
  locked?: boolean;
}

type TrayAction = 'show' | 'toggle_pause' | 'settings' | 'about' | 'check_updates' | 'quit' | 'lock';
type TrayView = 'main' | 'help' | 'suite';

const DONATE_URL = 'https://github.com/CyberGems/CyberPaste#%EF%B8%8F-donate';
const WIKI_URL = 'https://github.com/CyberGems/CyberPaste/wiki';
const FAQ_URL = 'https://github.com/CyberGems/CyberPaste/wiki/FAQ';
const CHANGELOG_URL = 'https://github.com/CyberGems/CyberPaste/releases';
const WEBSITE_URL = 'https://cybergems.org';
const SUITE_URL = 'https://cybergems.org/#apps';

/** Card width: room for label + Ctrl+Shift+V without clipping */
const MENU_WIDTH = 268;
/** Transparent bleed around the card for the CSS box-shadow. Must match TRAY_MENU_SHADOW_PAD. */
const SHADOW_PAD = 26;

export function TrayMenuWindow() {
  const { t, i18n } = useTranslation();
  useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<TrayMenuState | null>(null);
  const [view, setView] = useState<TrayView>('main');
  const viewRef = useRef<TrayView>('main');
  const closingRef = useRef(false);
  const openRef = useRef(false);

  const goView = useCallback((next: TrayView) => {
    viewRef.current = next;
    setView(next);
  }, []);

  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    const root = document.getElementById('root');
    if (root) {
      (root as HTMLElement).style.background = 'transparent';
      (root as HTMLElement).style.overflow = 'hidden';
    }

    invoke<AppSettings>('get_settings')
      .then((s) => applyTrayTheme(s.theme))
      .catch(console.error);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onOsTheme = () =>
      invoke<AppSettings>('get_settings')
        .then((s) => applyTrayTheme(s.theme))
        .catch(console.error);
    media.addEventListener('change', onOsTheme);

    return () => {
      media.removeEventListener('change', onOsTheme);
    };
  }, []);

  const reportSize = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (width < 8 || height < 8) return;
    invoke('tray_menu_ready', { width, height }).catch(console.error);
  }, []);

  const hide = useCallback(async () => {
    if (closingRef.current || !openRef.current) return;
    closingRef.current = true;
    openRef.current = false;
    viewRef.current = 'main';
    setView('main');
    try {
      await invoke('hide_tray_menu');
    } catch (e) {
      console.error('hide_tray_menu failed:', e);
    } finally {
      closingRef.current = false;
    }
  }, []);

  const runAction = useCallback(async (action: TrayAction) => {
    openRef.current = false;
    viewRef.current = 'main';
    setView('main');
    try {
      await invoke('tray_menu_action', { action });
    } catch (e) {
      console.error('tray_menu_action failed:', e);
    }
  }, []);

  const hideThenOpen = useCallback(async (url: string) => {
    openRef.current = false;
    viewRef.current = 'main';
    setView('main');
    try {
      await invoke('hide_tray_menu');
    } catch (e) {
      console.error('hide_tray_menu failed:', e);
    }
    openUrl(url).catch(console.error);
  }, []);

  const hideThenInvoke = useCallback(async (cmd: string) => {
    openRef.current = false;
    viewRef.current = 'main';
    setView('main');
    try {
      await invoke('hide_tray_menu');
    } catch (e) {
      console.error('hide_tray_menu failed:', e);
    }
    invoke(cmd).catch(console.error);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(reportSize);
    });
  }, [view, reportSize]);

  useEffect(() => {
    const unlistenState = listen<TrayMenuState>('tray-menu-state', (event) => {
      setState(event.payload);
      const targetRaw = event.payload.language;
      const target = resolveLanguage(targetRaw);
      if (target && target !== i18n.language) {
        i18n.changeLanguage(target);
      }
    });

    const unlistenShow = listen('tray-menu-show', () => {
      openRef.current = true;
      closingRef.current = false;
      viewRef.current = 'main';
      setView('main');
      requestAnimationFrame(() => {
        requestAnimationFrame(reportSize);
      });
    });

    const unlistenHide = listen('tray-menu-hide', () => {
      openRef.current = false;
      viewRef.current = 'main';
      setView('main');
    });

    const unlistenSettings = listen<AppSettings>('settings-changed', (event) => {
      applyTrayTheme(event.payload.theme);
      const target = resolveLanguage(event.payload.language);
      if (target && target !== i18n.language) i18n.changeLanguage(target);
      setState((prev) =>
        prev
          ? {
              ...prev,
              language: event.payload.language ?? prev.language,
              show_app_recommendations:
                event.payload.show_app_recommendations ?? prev.show_app_recommendations,
            }
          : prev
      );
    });

    invoke<TrayMenuState>('get_tray_menu_state')
      .then((s) => {
        setState(s);
        if (s.language) {
          const target = resolveLanguage(s.language);
          if (target !== i18n.language) i18n.changeLanguage(target);
        }
        openRef.current = true;
        closingRef.current = false;
        requestAnimationFrame(() => {
          requestAnimationFrame(reportSize);
        });
      })
      .catch(console.error);

    const win = getCurrentWindow();
    const unlistenBlur = win.onFocusChanged(({ payload: focused }) => {
      if (!focused) {
        window.setTimeout(() => {
          hide();
        }, 80);
      }
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (viewRef.current !== 'main') {
        e.preventDefault();
        goView('main');
        return;
      }
      hide();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      unlistenState.then((f) => f());
      unlistenShow.then((f) => f());
      unlistenHide.then((f) => f());
      unlistenSettings.then((f) => f());
      unlistenBlur.then((f) => f());
      window.removeEventListener('keydown', onKey);
    };
  }, [hide, i18n, reportSize, goView]);

  const showLabel = state?.is_visible
    ? t('tray.hide', { defaultValue: 'Hide' })
    : t('tray.show', { defaultValue: 'Show' });

  const pauseLabel = state?.is_paused
    ? t('tray.resumeMonitoring', { defaultValue: 'Resume Monitoring' })
    : t('tray.pauseMonitoring', { defaultValue: 'Pause Monitoring' });
  const suiteEnabled = state?.show_app_recommendations ?? true;

  return (
    <div
      ref={rootRef}
      className="inline-block bg-transparent"
      style={{ padding: SHADOW_PAD }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="relative select-none overflow-hidden rounded-2xl border border-border bg-card/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        style={{
          width: MENU_WIDTH,
          boxShadow:
            '0 8px 32px rgba(0,0,0,0.55), 0 0 20px rgba(var(--primary-rgb),0.12), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
        role="menu"
      >
        {view === 'main' ? (
          <div key="main" className="animate-in fade-in slide-in-from-left-2 duration-150">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                runAction('about');
              }}
              title={t('tray.about', { defaultValue: 'About...' })}
              aria-label={t('tray.about', { defaultValue: 'About...' })}
              className="group flex w-full select-none items-center justify-center gap-1.5 px-3 pb-2.5 pt-3.5 text-[12px] font-medium tracking-wide text-muted-foreground transition-colors hover:text-foreground"
            >
              <img
                src="/logo.png"
                alt=""
                className="h-3.5 w-3.5 shrink-0 object-contain grayscale transition-[filter] duration-150 group-hover:grayscale-0"
              />
              <span>
                Cyber<span className="text-primary">Paste</span>{' '}
                <span className="text-[11px] tracking-wide text-muted-foreground/70 group-hover:text-muted-foreground">
                  v{state?.version ?? '…'}
                </span>
              </span>
              {state?.update_available ? (
                <span
                  className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]"
                  title={t('tray.updateAvailable', { defaultValue: 'Update available' })}
                  aria-label={t('tray.updateAvailable', { defaultValue: 'Update available' })}
                />
              ) : null}
            </button>

            <TrayDivider />

            <div className="flex flex-col gap-0.5 px-1.5 py-1">
              <TrayItem
                icon={<AppWindow size={16} strokeWidth={1.75} />}
                label={showLabel}
                shortcut={state?.hotkey}
                onClick={() => runAction('show')}
              />
              <TrayItem
                icon={
                  state?.is_paused ? (
                    <Play size={16} strokeWidth={1.75} />
                  ) : (
                    <Pause size={16} strokeWidth={1.75} />
                  )
                }
                label={pauseLabel}
                onClick={() => runAction('toggle_pause')}
              />
              {state?.lock_enabled && !state?.locked ? (
                <TrayItem
                  icon={<Lock size={16} strokeWidth={1.75} />}
                  label={t('tray.lock', { defaultValue: 'Lock now' })}
                  onClick={() => runAction('lock')}
                />
              ) : null}
              <TrayItem
                icon={<Settings size={16} strokeWidth={1.75} />}
                label={t('tray.settings', { defaultValue: 'Settings...' })}
                onClick={() => runAction('settings')}
              />
            </div>

            <TrayDivider />

            <div className="flex flex-col gap-0.5 px-1.5 py-1">
              <TrayItem
                icon={<HelpCircle size={16} strokeWidth={1.75} />}
                label={t('tray.help', { defaultValue: 'Help' })}
                nav
                onClick={() => goView('help')}
              />
              {suiteEnabled ? (
                <TrayItem
                  icon={<Gem size={16} strokeWidth={1.75} />}
                  label={t('tray.suite', { defaultValue: 'More from CyberGems' })}
                  nav
                  onClick={() => goView('suite')}
                />
              ) : null}
            </div>

            <TrayDivider />

            <div className="px-1.5 pb-1.5 pt-1">
              <TrayItem
                icon={<Power size={16} strokeWidth={1.75} />}
                label={t('tray.quit', { defaultValue: 'Exit' })}
                danger
                onClick={() => runAction('quit')}
              />
            </div>
          </div>
        ) : null}

        {view === 'help' ? (
          <div key="help" className="animate-in fade-in slide-in-from-right-4 duration-200">
            <SubHeader
              title={t('tray.help', { defaultValue: 'Help' })}
              backLabel={t('tray.back', { defaultValue: 'Back' })}
              onBack={() => goView('main')}
            />
            <TrayDivider />
            <div className="flex max-h-[360px] flex-col gap-0.5 overflow-y-auto px-1.5 py-1">
              <TrayItem
                compact
                icon={<Pin size={14} strokeWidth={1.75} />}
                label={t('tray.pinTrayIcon', { defaultValue: 'Pin icon to taskbar...' })}
                onClick={() => hideThenInvoke('open_tray_icon_settings')}
              />
              <div className="mx-2 my-1 h-px bg-border/70" />
              <TrayItem
                compact
                icon={<Book size={14} strokeWidth={1.75} />}
                label={t('tray.docs', { defaultValue: 'Online Documentation' })}
                onClick={() => hideThenOpen(WIKI_URL)}
              />
              <TrayItem
                compact
                icon={<HelpCircle size={14} strokeWidth={1.75} />}
                label={t('tray.faq', { defaultValue: 'FAQ' })}
                onClick={() => hideThenOpen(FAQ_URL)}
              />
              <TrayItem
                compact
                icon={<Tag size={14} strokeWidth={1.75} />}
                label={t('tray.changelog', { defaultValue: 'Changelog' })}
                onClick={() => hideThenOpen(CHANGELOG_URL)}
              />
              <TrayItem
                compact
                icon={<Globe size={14} strokeWidth={1.75} />}
                label={t('tray.website', { defaultValue: 'Website' })}
                onClick={() => hideThenOpen(WEBSITE_URL)}
              />
              <TrayItem
                compact
                icon={<Heart size={14} strokeWidth={1.75} className="text-rose-400" />}
                label={t('tray.donate', { defaultValue: 'Donate' })}
                onClick={() => hideThenOpen(DONATE_URL)}
              />
              <div className="mx-2 my-1 h-px bg-border/70" />
              <TrayItem
                compact
                icon={<Info size={14} strokeWidth={1.75} />}
                label={t('tray.about', { defaultValue: 'About...' })}
                onClick={() => runAction('about')}
              />
              <TrayItem
                compact
                icon={<RefreshCw size={14} strokeWidth={1.75} />}
                label={t('tray.checkUpdates', { defaultValue: 'Check for Update...' })}
                onClick={() => runAction('check_updates')}
              />
            </div>
          </div>
        ) : null}

        {view === 'suite' ? (
          <div key="suite" className="animate-in fade-in slide-in-from-right-4 duration-200">
            <SubHeader
              title={t('tray.suiteTitle', { defaultValue: 'CyberGems' })}
              backLabel={t('tray.back', { defaultValue: 'Back' })}
              onBack={() => goView('main')}
            />
            <TrayDivider />
            <div className="flex max-h-[310px] flex-col gap-0.5 overflow-y-auto px-1.5 py-1">
              {RECOMMENDED_SUITE_APPS.map((app) => (
                <TrayItem
                  key={app.slug}
                  compact
                  icon={<img src={app.icon} alt="" className="h-4 w-4 rounded-[4px] object-contain" />}
                  label={app.name}
                  onClick={() => hideThenOpen(app.site)}
                />
              ))}
            </div>
            <TrayDivider />
            <div className="px-1.5 py-1.5">
              <button
                type="button"
                role="menuitem"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  hideThenOpen(SUITE_URL);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/15 hover:text-foreground"
              >
                <Globe size={13} strokeWidth={1.75} />
                {t('tray.suiteAll', { defaultValue: 'View all at cybergems.org' })}
                <span aria-hidden>→</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TrayDivider() {
  return (
    <div
      className="mx-2.5 h-px"
      style={{
        background: 'linear-gradient(90deg, transparent, hsl(var(--border)), transparent)',
      }}
    />
  );
}

function SubHeader({
  title,
  backLabel,
  onBack,
}: {
  title: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-2 pb-1 pt-2">
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onBack();
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/[0.08] px-2.5 py-1 text-[11.5px] font-semibold text-primary transition-all hover:-translate-x-0.5 hover:border-primary hover:bg-primary/20 hover:text-foreground"
      >
        <ChevronLeft size={13} strokeWidth={2.25} />
        {backLabel}
      </button>
      <span className="pr-1 text-[12px] font-semibold tracking-wide text-muted-foreground">
        {title}
      </span>
    </div>
  );
}

function TrayItem({
  icon,
  label,
  shortcut,
  compact,
  nav,
  danger,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  shortcut?: string;
  compact?: boolean;
  nav?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        'group flex w-full items-center gap-2.5 rounded-[10px] text-left transition-all duration-150',
        compact ? 'min-h-[26px] px-2.5 py-1' : 'min-h-[30px] px-2.5 py-1.5',
        danger
          ? 'text-foreground/90 hover:bg-rose-500/12 hover:text-foreground'
          : compact
            ? 'text-foreground/90 hover:bg-primary/10 hover:text-foreground'
            : 'text-foreground/90 hover:translate-x-0.5 hover:bg-primary/10 hover:text-foreground',
        'active:scale-[0.98]'
      )}
    >
      <span
        className={clsx(
          'flex h-4 w-4 flex-shrink-0 items-center justify-center transition-transform duration-150 group-hover:scale-110',
          danger
            ? 'text-rose-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)] group-hover:text-rose-300'
            : 'text-primary drop-shadow-[0_0_4px_rgba(var(--primary-rgb),0.45)]'
        )}
      >
        {icon}
      </span>
      <span
        className={clsx(
          'min-w-0 flex-1 truncate font-medium',
          compact ? 'text-[11.5px]' : 'text-[12.5px]'
        )}
      >
        {label}
      </span>
      {nav ? (
        <ChevronRight
          size={14}
          strokeWidth={2}
          className="ml-auto text-muted-foreground/70 transition-all duration-150 group-hover:-translate-x-0.5 group-hover:text-primary"
        />
      ) : shortcut ? (
        <span className="ml-auto flex-shrink-0 rounded border border-border bg-primary/10 px-1.5 py-px font-mono text-[9px] font-semibold tracking-wide text-primary group-hover:border-primary/40">
          {shortcut}
        </span>
      ) : null}
    </button>
  );
}
