import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from 'react-i18next';
import { AppWindow, Info, LogOut, Pause, Play, Settings } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
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
  language: string;
}

type TrayAction = 'show' | 'toggle_pause' | 'settings' | 'about' | 'quit';

/** Card width — room for label + Ctrl+Shift+V without clipping */
const MENU_WIDTH = 268;
/** Transparent bleed around the card for the CSS box-shadow — must be >= shadow extent
 *  (offset-y + blur = 6+20 = 26px bottom). Must match TRAY_MENU_SHADOW_PAD in commands.rs */
const SHADOW_PAD = 26;

export function TrayMenuWindow() {
  useLanguage();
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<TrayMenuState | null>(null);
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
    try {
      await invoke('tray_menu_action', { action });
    } catch (e) {
      console.error('tray_menu_action failed:', e);
    }
  }, []);

  useEffect(() => {
    const unlistenState = listen<TrayMenuState>('tray-menu-state', (event) => {
      // Update labels only — never remasure/re-show (that caused the "refresh" bug)
      setState(event.payload);
      if (event.payload.language && event.payload.language !== i18n.language) {
        i18n.changeLanguage(event.payload.language);
      }
    });

    const unlistenShow = listen('tray-menu-show', () => {
      openRef.current = true;
      closingRef.current = false;
      // Double rAF: wait for React to paint updated labels, then measure outer shell
      requestAnimationFrame(() => {
        requestAnimationFrame(reportSize);
      });
    });

    const unlistenHide = listen('tray-menu-hide', () => {
      openRef.current = false;
    });

    // Re-theme live when settings change elsewhere
    const unlistenSettings = listen<AppSettings>('settings-changed', (event) => {
      applyTrayTheme(event.payload.theme);
    });

    // First open: window is created after the tray-menu-show emit, so that event
    // is often missed. On mount we always measure+show (this window only exists to pop up).
    invoke<TrayMenuState>('get_tray_menu_state')
      .then((s) => {
        setState(s);
        if (s.language) i18n.changeLanguage(s.language);
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
        <div className="px-3.5 pb-2.5 pt-3.5 text-center text-[12px] font-medium tracking-wide text-muted-foreground/70">
          CyberPaste v{state?.version ?? '…'}
        </div>

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
            icon={<Info size={15} strokeWidth={1.75} />}
            label={t('tray.about', { defaultValue: 'About...' })}
            onClick={() => runAction('about')}
          />
        </div>

        <div className="mx-2.5 h-px bg-accent" />

        <div className="p-1.5 pb-2">
          <TrayItem
            icon={<LogOut size={15} strokeWidth={1.75} className="-scale-x-100 text-[#e8796a]" />}
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
  onClick,
}: {
  icon: ReactNode;
  label: string;
  shortcut?: string;
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
      {shortcut ? (
        <span className="flex-shrink-0 pl-3 text-[11px] font-medium tabular-nums text-muted-foreground">
          {shortcut}
        </span>
      ) : null}
    </button>
  );
}
