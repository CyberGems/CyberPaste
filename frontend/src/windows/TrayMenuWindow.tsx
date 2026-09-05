import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from 'react-i18next';
import { AppWindow, Book, ChevronRight, CircleHelp, Globe, Heart, Info, Pause, Play, Power, RefreshCw, Settings, Tag } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { resolveLanguage, useLanguage } from '../hooks/useLanguage';
import type { Settings as AppSettings } from '../types';

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
}

type TrayAction = 'show' | 'toggle_pause' | 'settings' | 'about' | 'check_updates' | 'quit';

const DONATE_URL = 'https://github.com/CyberGems/CyberPaste#%EF%B8%8F-donate';
const WIKI_URL = 'https://github.com/CyberGems/CyberPaste/wiki';
const FAQ_URL = 'https://github.com/CyberGems/CyberPaste/wiki/FAQ';
const CHANGELOG_URL = 'https://github.com/CyberGems/CyberPaste/releases';
const WEBSITE_URL = 'https://cybergems.org';

/** Card width — room for label + Ctrl+Shift+V without clipping */
const MENU_WIDTH = 268;
/** Transparent bleed around the card for the CSS box-shadow — must be >= shadow extent
 *  (offset-y + blur = 6+20 = 26px bottom). Must match TRAY_MENU_SHADOW_PAD in commands.rs */
const SHADOW_PAD = 26;

export function TrayMenuWindow() {
  const { t, i18n } = useTranslation();
  useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<TrayMenuState | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const closingRef = useRef(false);
  const openRef = useRef(false);

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

    // Apply the global theme to this window and keep it in sync
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
    setHelpOpen(false);
    try {
      await invoke('tray_menu_action', { action });
    } catch (e) {
      console.error('tray_menu_action failed:', e);
    }
  }, []);

  const hideThenOpen = useCallback(async (url: string) => {
    openRef.current = false;
    setHelpOpen(false);
    try {
      await invoke('hide_tray_menu');
    } catch (e) {
      console.error('hide_tray_menu failed:', e);
    }
    openUrl(url).catch(console.error);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(reportSize);
    });
  }, [helpOpen, reportSize]);

  useEffect(() => {
    const unlistenState = listen<TrayMenuState>('tray-menu-state', (event) => {
      // Update labels only — never remasure/re-show (that caused the "refresh" bug)
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
      setHelpOpen(false);
      // Double rAF: wait for React to paint updated labels, then measure outer shell
      requestAnimationFrame(() => {
        requestAnimationFrame(reportSize);
      });
    });

    const unlistenHide = listen('tray-menu-hide', () => {
      openRef.current = false;
      setHelpOpen(false);
    });

    // Re-theme live when settings change elsewhere
    const unlistenSettings = listen<AppSettings>('settings-changed', (event) => {
      applyTrayTheme(event.payload.theme);
      const target = resolveLanguage(event.payload.language);
      if (target && target !== i18n.language) i18n.changeLanguage(target);
      setState((prev) => (prev ? { ...prev, language: event.payload.language ?? prev.language } : prev));
    });

    // First open: window is created after the tray-menu-show emit, so that event
    // is often missed. On mount we always measure+show (this window only exists to pop up).
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
        // Short delay so menu item pointerdown can invoke the action first
        window.setTimeout(() => {
          hide();
        }, 80);
      }
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
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
  }, [hide, i18n, reportSize]);

  const showLabel = state?.is_visible
    ? t('tray.hide', { defaultValue: 'Hide' })
    : t('tray.show', { defaultValue: 'Show' });

  const pauseLabel = state?.is_paused
    ? t('tray.resumeMonitoring', { defaultValue: 'Resume Monitoring' })
    : t('tray.pauseMonitoring', { defaultValue: 'Pause Monitoring' });

  return (
    // Outer shell includes shadow bleed — THIS is what we measure for window size
    <div
      ref={rootRef}
      className="inline-block bg-transparent"
      style={{ padding: SHADOW_PAD }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="overflow-hidden rounded-2xl border border-border bg-card"
        style={{
          width: MENU_WIDTH,
          // Compact non-clipped shadow, tuned to fit within SHADOW_PAD
          boxShadow:
            '0 6px 20px rgba(0,0,0,0.42), 0 1px 4px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
        role="menu"
      >
        <button
          type="button"
          onClick={() => runAction('about')}
          title={t('tray.about', { defaultValue: 'About...' })}
          aria-label={t('tray.about', { defaultValue: 'About...' })}
          className="flex w-full select-none items-center justify-center gap-1.5 rounded-t-2xl px-3.5 pb-2.5 pt-3.5 text-center text-[12px] font-medium tracking-wide text-muted-foreground/70 transition-colors hover:bg-accent/40 hover:text-foreground"
        >
          <img src="/logo.png" alt="" className="h-4 w-4 shrink-0 object-contain" />
          <span>CyberPaste v{state?.version ?? '…'}</span>
          {state?.update_available ? (
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]"
              title={t('tray.updateAvailable', { defaultValue: 'Update available' })}
              aria-label={t('tray.updateAvailable', { defaultValue: 'Update available' })}
            />
          ) : null}
        </button>

        <div className="mx-2.5 h-px bg-accent" />

        <div className="flex flex-col gap-0.5 p-1.5">
          <TrayItem
            icon={<AppWindow size={15} strokeWidth={1.75} />}
            label={showLabel}
            shortcut={state?.hotkey}
            onClick={() => runAction('show')}
          />
          <TrayItem
            icon={
              state?.is_paused ? (
                <Play size={15} strokeWidth={1.75} />
              ) : (
                <Pause size={15} strokeWidth={1.75} />
              )
            }
            label={pauseLabel}
            onClick={() => runAction('toggle_pause')}
          />
          <TrayItem
            icon={<Settings size={15} strokeWidth={1.75} />}
            label={t('tray.settings', { defaultValue: 'Settings...' })}
            onClick={() => runAction('settings')}
          />
          <TrayItem
            icon={<CircleHelp size={15} strokeWidth={1.75} />}
            label={t('tray.help', { defaultValue: 'Help' })}
            trailing={
              <ChevronRight
                size={14}
                strokeWidth={2}
                className={`text-muted-foreground transition-transform duration-150 ${helpOpen ? 'rotate-90' : ''}`}
              />
            }
            onClick={() => setHelpOpen((v) => !v)}
          />
          {helpOpen && (
            <div className="ml-2 flex flex-col gap-0.5 border-l border-border/70 pl-1.5">
              <TrayItem
                icon={<Book size={15} strokeWidth={1.75} />}
                label={t('tray.docs', { defaultValue: 'Documentation & Wiki' })}
                onClick={() => hideThenOpen(WIKI_URL)}
              />
              <TrayItem
                icon={<CircleHelp size={15} strokeWidth={1.75} />}
                label={t('tray.faq', { defaultValue: 'Frequently Asked Questions' })}
                onClick={() => hideThenOpen(FAQ_URL)}
              />
              <TrayItem
                icon={<Tag size={15} strokeWidth={1.75} />}
                label={t('tray.changelog', { defaultValue: 'Changelog' })}
                onClick={() => hideThenOpen(CHANGELOG_URL)}
              />
              <TrayItem
                icon={<Globe size={15} strokeWidth={1.75} />}
                label={t('tray.website', { defaultValue: 'Website' })}
                onClick={() => hideThenOpen(WEBSITE_URL)}
              />
              <TrayItem
                icon={<Heart size={15} strokeWidth={1.75} className="text-[#00D8F1]" />}
                label={t('tray.donate', { defaultValue: 'Donate' })}
                onClick={() => hideThenOpen(DONATE_URL)}
              />
              <div className="mx-1 my-0.5 h-px bg-accent" />
              <TrayItem
                icon={<Info size={15} strokeWidth={1.75} />}
                label={t('tray.about', { defaultValue: 'About...' })}
                onClick={() => runAction('about')}
              />
              <TrayItem
                icon={<RefreshCw size={15} strokeWidth={1.75} />}
                label={t('tray.checkUpdates', { defaultValue: 'Check for Update...' })}
                onClick={() => runAction('check_updates')}
              />
            </div>
          )}
        </div>

        <div className="mx-2.5 h-px bg-accent" />

        <div className="p-1.5 pb-2">
          <TrayItem
            icon={<Power size={15} strokeWidth={1.75} className="text-[#e8796a]" />}
            label={t('tray.quit', { defaultValue: 'Exit' })}
            onClick={() => runAction('quit')}
          />
        </div>
      </div>
    </div>
  );
}

function TrayItem({
  icon,
  label,
  shortcut,
  trailing,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  shortcut?: string;
  trailing?: ReactNode;
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
      className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-accent active:bg-accent/70"
    >
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-foreground/85 group-hover:text-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground/90 group-hover:text-foreground">
        {label}
      </span>
      {trailing ??
        (shortcut ? (
          <span className="flex-shrink-0 pl-3 text-[11px] font-medium tabular-nums text-muted-foreground">
            {shortcut}
          </span>
        ) : null)}
    </button>
  );
}
