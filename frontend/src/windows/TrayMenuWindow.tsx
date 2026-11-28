import { githubStarLabels } from '../useGitHubStar';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import {
  AppWindow,
  ArrowRight,
  Bell,
  BellOff,
  Book,
  ChevronRight,
  Clock,
  Heart,
  Star,
  HelpCircle,
  Info,
  Infinity as InfinityIcon,
  Gem,
  Lock,
  Unlock,
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
import Tooltip from '../components/Tooltip';
import { resolveLanguage, useLanguage } from '../hooks/useLanguage';
import type { Settings as AppSettings } from '../types';
import { RECOMMENDED_SUITE_APPS, suiteLanguage } from '../data/suiteApps';

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
  notifications_paused?: boolean;
  notifications_pause_until?: string | null;
  notifications_pause_permanent?: boolean;
  flyout_side?: 'left' | 'right';
  vertical_align?: 'bottom' | 'top';
}

type TrayAction =
  | 'show'
  | 'toggle_pause'
  | 'settings'
  | 'about'
  | 'check_updates'
  | 'quit'
  | 'lock'
  | 'unlock'
  | 'pause_notifications'
  | 'resume_notifications';
type TrayFlyoutId = 'help' | 'suite' | 'pauseNotifications';

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
  const mainCardRef = useRef<HTMLDivElement>(null);
  const pauseFlyoutRef = useRef<HTMLDivElement>(null);
  const helpFlyoutRef = useRef<HTMLDivElement>(null);
  const suiteFlyoutRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<TrayMenuState | null>(null);
  const [stageVisible, setStageVisible] = useState(false);
  const [activeFlyout, setActiveFlyout] = useState<TrayFlyoutId | null>(null);
  const activeFlyoutRef = useRef<TrayFlyoutId | null>(null);
  activeFlyoutRef.current = activeFlyout;
  const flyoutTimersRef = useRef<{ open: number | null; close: number | null }>({
    open: null,
    close: null,
  });
  const closingRef = useRef(false);
  const openRef = useRef(false);
  const reportSeqRef = useRef(0);
  const reportTimersRef = useRef<{
    raf1: number | null;
    raf2: number | null;
    fallback: number | null;
  }>({
    raf1: null,
    raf2: null,
    fallback: null,
  });

  const cancelFlyoutTimers = useCallback(() => {
    if (flyoutTimersRef.current.open !== null) window.clearTimeout(flyoutTimersRef.current.open);
    if (flyoutTimersRef.current.close !== null) window.clearTimeout(flyoutTimersRef.current.close);
    flyoutTimersRef.current = { open: null, close: null };
  }, []);

  const scheduleFlyoutOpen = useCallback(
    (target: TrayFlyoutId) => {
      cancelFlyoutTimers();
      if (activeFlyoutRef.current === target) return;
      const delay = activeFlyoutRef.current !== null ? 60 : 120;
      flyoutTimersRef.current.open = window.setTimeout(() => {
        flyoutTimersRef.current.open = null;
        setActiveFlyout(target);
      }, delay);
    },
    [cancelFlyoutTimers]
  );

  const scheduleFlyoutClose = useCallback(() => {
    cancelFlyoutTimers();
    if (activeFlyoutRef.current === null) return;
    flyoutTimersRef.current.close = window.setTimeout(() => {
      flyoutTimersRef.current.close = null;
      setActiveFlyout(null);
    }, 220);
  }, [cancelFlyoutTimers]);

  const getFlyoutElement = (target: TrayFlyoutId | null) => {
    if (target === 'pauseNotifications') return pauseFlyoutRef.current;
    if (target === 'help') return helpFlyoutRef.current;
    if (target === 'suite') return suiteFlyoutRef.current;
    return null;
  };

  const openFlyoutAndFocusFirst = useCallback(
    (target: TrayFlyoutId) => {
      cancelFlyoutTimers();
      setActiveFlyout(target);
      window.requestAnimationFrame(() => {
        getFlyoutElement(target)
          ?.querySelector<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)')
          ?.focus();
      });
    },
    [cancelFlyoutTimers]
  );

  const closeFlyoutAndReturnFocus = useCallback(() => {
    const previous = activeFlyoutRef.current;
    cancelFlyoutTimers();
    setActiveFlyout(null);
    if (previous && mainCardRef.current) {
      mainCardRef.current
        .querySelector<HTMLButtonElement>(`[data-flyout-trigger="${previous}"]`)
        ?.focus();
    }
  }, [cancelFlyoutTimers]);

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
    const card = mainCardRef.current;
    if (!card) return;
    const cardRect = card.getBoundingClientRect();
    if (cardRect.width < 8 || cardRect.height < 8) return;
    const mainWidth = Math.ceil(cardRect.width + 2 * SHADOW_PAD);
    const mainHeight = Math.ceil(cardRect.height + 2 * SHADOW_PAD);

    const flyouts = [pauseFlyoutRef.current, helpFlyoutRef.current, suiteFlyoutRef.current];
    let maxFlyoutH = 0;
    for (const el of flyouts) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      maxFlyoutH = Math.max(maxFlyoutH, Math.ceil(r.height + 2 * SHADOW_PAD));
    }
    const canvasHeight = Math.max(mainHeight, maxFlyoutH);
    invoke('tray_menu_ready', {
      width: mainWidth,
      height: mainHeight,
      canvasHeight,
    }).catch(console.error);
  }, []);

  const hide = useCallback(async () => {
    if (closingRef.current || !openRef.current) return;
    closingRef.current = true;
    openRef.current = false;
    cancelFlyoutTimers();
    setActiveFlyout(null);
    try {
      await invoke('hide_tray_menu');
    } catch (e) {
      console.error('hide_tray_menu failed:', e);
    } finally {
      closingRef.current = false;
    }
  }, [cancelFlyoutTimers]);

  const runAction = useCallback(
    async (action: TrayAction, durationMinutes?: number) => {
      openRef.current = false;
      cancelFlyoutTimers();
      setActiveFlyout(null);
      try {
        await invoke('tray_menu_action', { action, durationMinutes: durationMinutes ?? null });
      } catch (e) {
        console.error('tray_menu_action failed:', e);
      }
    },
    [cancelFlyoutTimers]
  );

  const hideThenOpen = useCallback(
    async (url: string) => {
      openRef.current = false;
      cancelFlyoutTimers();
      setActiveFlyout(null);
      try {
        await invoke('hide_tray_menu');
      } catch (e) {
        console.error('hide_tray_menu failed:', e);
      }
      openUrl(url).catch(console.error);
    },
    [cancelFlyoutTimers]
  );

  const hideThenInvoke = useCallback(
    async (cmd: string) => {
      openRef.current = false;
      cancelFlyoutTimers();
      setActiveFlyout(null);
      try {
        await invoke('hide_tray_menu');
      } catch (e) {
        console.error('hide_tray_menu failed:', e);
      }
      invoke(cmd).catch(console.error);
    },
    [cancelFlyoutTimers]
  );

  const cancelPendingReport = useCallback(() => {
    const t = reportTimersRef.current;
    if (t.raf1 !== null) window.cancelAnimationFrame(t.raf1);
    if (t.raf2 !== null) window.cancelAnimationFrame(t.raf2);
    if (t.fallback !== null) window.clearTimeout(t.fallback);
    reportTimersRef.current = { raf1: null, raf2: null, fallback: null };
  }, []);

  const schedulePaintedReport = useCallback(() => {
    cancelPendingReport();
    const seq = ++reportSeqRef.current;
    let sent = false;
    const fire = () => {
      if (sent || seq !== reportSeqRef.current) return;
      sent = true;
      cancelPendingReport();
      reportSize();
    };
    if (rootRef.current) void rootRef.current.offsetWidth;
    reportTimersRef.current.fallback = window.setTimeout(fire, 60);
    reportTimersRef.current.raf1 = window.requestAnimationFrame(() => {
      reportTimersRef.current.raf1 = null;
      reportTimersRef.current.raf2 = window.requestAnimationFrame(() => {
        reportTimersRef.current.raf2 = null;
        fire();
      });
    });
  }, [cancelPendingReport, reportSize]);

  const flyoutSide = state?.flyout_side === 'right' ? 'right' : 'left';
  const verticalAlign = state?.vertical_align === 'top' ? 'top' : 'bottom';
  const suiteEnabled = state?.show_app_recommendations ?? true;

  useEffect(() => {
    if (!stageVisible) return;
    schedulePaintedReport();
  }, [
    stageVisible,
    state?.flyout_side,
    state?.vertical_align,
    state?.notifications_paused,
    state?.lock_enabled,
    state?.locked,
    state?.show_app_recommendations,
    i18n.language,
    schedulePaintedReport,
  ]);

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
      cancelFlyoutTimers();
      setActiveFlyout(null);
      setStageVisible(true);
      schedulePaintedReport();
    });

    const unlistenHide = listen('tray-menu-hide', () => {
      openRef.current = false;
      reportSeqRef.current += 1;
      cancelPendingReport();
      cancelFlyoutTimers();
      setActiveFlyout(null);
      setStageVisible(false);
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
        setStageVisible(true);
        schedulePaintedReport();
      })
      .catch(console.error);

    let dprMedia: MediaQueryList | null = null;
    const onDprChange = () => {
      if (openRef.current) schedulePaintedReport();
      watchDpr();
    };
    const watchDpr = () => {
      if (dprMedia) dprMedia.removeEventListener('change', onDprChange);
      dprMedia = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      dprMedia.addEventListener('change', onDprChange, { once: true });
    };
    watchDpr();

    const onKey = (e: KeyboardEvent) => {
      const openFlyoutEl = getFlyoutElement(activeFlyoutRef.current);
      const activeEl = document.activeElement as HTMLElement | null;
      const inFlyout = Boolean(openFlyoutEl && activeEl && openFlyoutEl.contains(activeEl));
      const side = flyoutSide;
      const openKey = side === 'left' ? 'ArrowLeft' : 'ArrowRight';
      const closeKey = side === 'left' ? 'ArrowRight' : 'ArrowLeft';

      if (e.key === 'Escape') {
        e.preventDefault();
        if (activeFlyoutRef.current !== null) {
          closeFlyoutAndReturnFocus();
        } else {
          hide();
        }
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const scope = inFlyout && openFlyoutEl ? openFlyoutEl : mainCardRef.current;
        if (!scope) return;
        const buttons = Array.from(
          scope.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)')
        );
        if (buttons.length === 0) return;
        e.preventDefault();
        const idx = activeEl ? buttons.indexOf(activeEl as HTMLButtonElement) : -1;
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const nextIdx =
          idx === -1
            ? delta > 0
              ? 0
              : buttons.length - 1
            : (idx + delta + buttons.length) % buttons.length;
        buttons[nextIdx]?.focus();
        return;
      }

      if (e.key === openKey || (!inFlyout && e.key === closeKey)) {
        const triggerTarget = activeEl?.dataset?.flyoutTrigger as TrayFlyoutId | undefined;
        if (!inFlyout && triggerTarget) {
          e.preventDefault();
          openFlyoutAndFocusFirst(triggerTarget);
          return;
        }
      }

      if (e.key === closeKey && activeFlyoutRef.current !== null) {
        e.preventDefault();
        closeFlyoutAndReturnFocus();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      cancelPendingReport();
      cancelFlyoutTimers();
      if (dprMedia) dprMedia.removeEventListener('change', onDprChange);
      unlistenState.then((f) => f());
      unlistenShow.then((f) => f());
      unlistenHide.then((f) => f());
      unlistenSettings.then((f) => f());
      window.removeEventListener('keydown', onKey);
    };
  }, [
    cancelPendingReport,
    cancelFlyoutTimers,
    closeFlyoutAndReturnFocus,
    flyoutSide,
    hide,
    i18n,
    openFlyoutAndFocusFirst,
    schedulePaintedReport,
  ]);

  const showLabel = state?.is_visible
    ? t('tray.hide', { defaultValue: 'Hide' })
    : t('tray.show', { defaultValue: 'Show' });

  const pauseLabel = state?.is_paused
    ? t('tray.resumeMonitoring', { defaultValue: 'Resume Monitoring' })
    : t('tray.pauseMonitoring', { defaultValue: 'Pause Monitoring' });
  const suiteLocale = suiteLanguage(i18n.language);

  const notificationsPausedLabel = (() => {
    if (state?.notifications_pause_permanent) {
      return t('tray.pausedPermanently', { defaultValue: 'Paused permanently' });
    }
    if (state?.notifications_pause_until) {
      const until = new Date(state.notifications_pause_until);
      if (!Number.isNaN(until.getTime())) {
        return t('tray.pausedUntil', {
          time: until.toLocaleTimeString(i18n.language || 'en', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
      }
    }
    return undefined;
  })();

  const cardShellStyle = {
    width: MENU_WIDTH,
    boxShadow:
      '0 8px 32px rgba(0,0,0,0.38), 0 0 14px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
  };

  const flyoutVisibleClass = (id: TrayFlyoutId) =>
    activeFlyout === id
      ? 'opacity-100 pointer-events-auto translate-x-0 scale-100'
      : flyoutSide === 'right'
        ? 'opacity-0 pointer-events-none -translate-x-1.5 scale-[0.985]'
        : 'opacity-0 pointer-events-none translate-x-1.5 scale-[0.985]';

  return (
    <div
      ref={rootRef}
      className="h-screen w-screen overflow-hidden bg-transparent"
      style={{ padding: SHADOW_PAD }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        const target = e.target as Node;
        if (mainCardRef.current?.contains(target)) return;
        if (getFlyoutElement(activeFlyout)?.contains(target)) return;
        void hide();
      }}
    >
      <div
        className={clsx(
          'flex h-full w-full gap-1',
          !stageVisible && 'invisible',
          flyoutSide === 'left' ? 'flex-row-reverse' : 'flex-row',
          verticalAlign === 'top' ? 'items-start' : 'items-end'
        )}
      >
        {/* Main Tray Card */}
        <div
          ref={mainCardRef}
          className="relative shrink-0 select-none overflow-hidden rounded-2xl border border-border bg-card"
          style={cardShellStyle}
          role="menu"
          onMouseLeave={() => scheduleFlyoutClose()}
        >
          <Tooltip label={t('tray.about', { defaultValue: 'About...' })} placement="bottom">
            <button
              type="button"
              onMouseEnter={() => scheduleFlyoutClose()}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                runAction('about');
              }}
              aria-label={t('tray.about', { defaultValue: 'About...' })}
              className="group flex w-full select-none items-center justify-center gap-1.5 px-3 pb-2.5 pt-3.5 text-[12px] font-medium tracking-wide text-muted-foreground"
            >
              <span className="flex items-center gap-1.5 opacity-60 transition-opacity duration-150 group-hover:opacity-100">
                <img
                  src="/logo.png"
                  alt=""
                  className="h-3.5 w-3.5 shrink-0 object-contain transition-transform duration-150 ease-out group-hover:scale-105"
                />
                <span>
                  Cyber<span className="text-primary">Paste</span>{' '}
                  <span className="text-[11px] tracking-wide text-muted-foreground">
                    v{state?.version ?? '…'}
                  </span>
                </span>
              </span>
              {state?.update_available ? (
                <span
                  className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                  aria-label={t('tray.updateAvailable', { defaultValue: 'Update available' })}
                />
              ) : null}
            </button>
          </Tooltip>

          <TrayDivider />

          <div className="flex flex-col gap-0.5 px-1.5 py-1">
            <TrayItem
              icon={<AppWindow size={16} strokeWidth={1.75} />}
              label={showLabel}
              shortcut={state?.hotkey}
              onMouseEnter={() => scheduleFlyoutClose()}
              onClick={() => runAction('show')}
            />
            <TrayItem
              icon={
                state?.is_paused ? (
                  <Play size={16} strokeWidth={1.75} className="fill-amber-500/20" />
                ) : (
                  <Pause size={16} strokeWidth={1.75} />
                )
              }
              label={pauseLabel}
              warning={Boolean(state?.is_paused)}
              onMouseEnter={() => scheduleFlyoutClose()}
              onClick={() => runAction('toggle_pause')}
            />
            {state?.notifications_paused ? (
              <TrayItem
                icon={<BellOff size={16} strokeWidth={1.75} />}
                label={t('tray.resumeNotifications', { defaultValue: 'Resume notifications' })}
                description={notificationsPausedLabel}
                warning
                onMouseEnter={() => scheduleFlyoutClose()}
                onClick={() => runAction('resume_notifications')}
              />
            ) : (
              <TrayItem
                icon={<Bell size={16} strokeWidth={1.75} />}
                label={t('tray.pauseNotifications', { defaultValue: 'Pause notifications' })}
                nav
                flyoutTrigger="pauseNotifications"
                flyoutActive={activeFlyout === 'pauseNotifications'}
                onMouseEnter={() => scheduleFlyoutOpen('pauseNotifications')}
                onClick={() => {
                  cancelFlyoutTimers();
                  setActiveFlyout((prev) =>
                    prev === 'pauseNotifications' ? null : 'pauseNotifications'
                  );
                }}
              />
            )}
            {state?.lock_enabled ? (
              state?.locked ? (
                <TrayItem
                  icon={<Unlock size={16} strokeWidth={1.75} />}
                  label={t('tray.unlock', { defaultValue: 'Unlock...' })}
                  onMouseEnter={() => scheduleFlyoutClose()}
                  onClick={() => runAction('unlock')}
                />
              ) : (
                <TrayItem
                  icon={<Lock size={16} strokeWidth={1.75} />}
                  label={t('tray.lock', { defaultValue: 'Lock now' })}
                  onMouseEnter={() => scheduleFlyoutClose()}
                  onClick={() => runAction('lock')}
                />
              )
            ) : null}
            <TrayItem
              icon={<Settings size={16} strokeWidth={1.75} />}
              label={t('tray.settings', { defaultValue: 'Settings...' })}
              onMouseEnter={() => scheduleFlyoutClose()}
              onClick={() => runAction('settings')}
            />
          </div>

          <TrayDivider />

          <div className="flex flex-col gap-0.5 px-1.5 py-1">
            <TrayItem
              icon={<HelpCircle size={16} strokeWidth={1.75} />}
              label={t('tray.help', { defaultValue: 'Help' })}
              nav
              flyoutTrigger="help"
              flyoutActive={activeFlyout === 'help'}
              onMouseEnter={() => scheduleFlyoutOpen('help')}
              onClick={() => {
                cancelFlyoutTimers();
                setActiveFlyout((prev) => (prev === 'help' ? null : 'help'));
              }}
            />
            {suiteEnabled ? (
              <TrayItem
                icon={<Gem size={16} strokeWidth={1.75} />}
                label={t('tray.suite', { defaultValue: 'More from CyberGems' })}
                nav
                flyoutTrigger="suite"
                flyoutActive={activeFlyout === 'suite'}
                onMouseEnter={() => scheduleFlyoutOpen('suite')}
                onClick={() => {
                  cancelFlyoutTimers();
                  setActiveFlyout((prev) => (prev === 'suite' ? null : 'suite'));
                }}
              />
            ) : null}
          </div>

          <TrayDivider />

          <div className="px-1.5 pb-1.5 pt-1">
            <TrayItem
              icon={<Power size={16} strokeWidth={1.75} />}
              label={t('tray.quit', { defaultValue: 'Exit' })}
              danger
              onMouseEnter={() => scheduleFlyoutClose()}
              onClick={() => runAction('quit')}
            />
          </div>
        </div>

        {/* Side-by-side Flyout Slot */}
        <div className="pointer-events-none relative h-full shrink-0" style={{ width: MENU_WIDTH }}>
          {/* Pause Notifications Flyout */}
          <div
            ref={pauseFlyoutRef}
            role="menu"
            aria-hidden={activeFlyout !== 'pauseNotifications'}
            style={cardShellStyle}
            onMouseEnter={() => cancelFlyoutTimers()}
            onMouseLeave={() => scheduleFlyoutClose()}
            className={clsx(
              'absolute left-0 right-0 select-none overflow-hidden rounded-2xl border border-border bg-card transition-[opacity,transform] duration-150',
              verticalAlign === 'top' ? 'top-0' : 'bottom-0',
              flyoutVisibleClass('pauseNotifications')
            )}
          >
            <FlyoutHeader
              icon={<Bell size={13} strokeWidth={1.9} />}
              title={t('tray.pauseNotifications', { defaultValue: 'Pause notifications' })}
            />
            <TrayDivider />
            <div className="flex flex-col gap-0.5 px-1.5 py-1">
              <TrayItem
                compact
                icon={<Clock size={14} strokeWidth={1.75} />}
                label={t('tray.pause1h', { defaultValue: 'For 1 hour' })}
                onClick={() => runAction('pause_notifications', 60)}
              />
              <TrayItem
                compact
                icon={<Clock size={14} strokeWidth={1.75} />}
                label={t('tray.pause6h', { defaultValue: 'For 6 hours' })}
                onClick={() => runAction('pause_notifications', 360)}
              />
              <TrayItem
                compact
                icon={<Clock size={14} strokeWidth={1.75} />}
                label={t('tray.pause12h', { defaultValue: 'For 12 hours' })}
                onClick={() => runAction('pause_notifications', 720)}
              />
              <TrayItem
                compact
                icon={<Clock size={14} strokeWidth={1.75} />}
                label={t('tray.pause24h', { defaultValue: 'For 24 hours' })}
                description={t('tray.pause24hSuggested', { defaultValue: 'Suggested' })}
                onClick={() => runAction('pause_notifications', 1440)}
              />
              <div className="mx-2 my-1 h-px bg-border/70" />
              <TrayItem
                compact
                icon={<InfinityIcon size={14} strokeWidth={1.75} />}
                label={t('tray.pausePermanent', { defaultValue: 'Until I turn them back on' })}
                onClick={() => runAction('pause_notifications')}
              />
            </div>
          </div>

          {/* Help Flyout */}
          <div
            ref={helpFlyoutRef}
            role="menu"
            aria-hidden={activeFlyout !== 'help'}
            style={cardShellStyle}
            onMouseEnter={() => cancelFlyoutTimers()}
            onMouseLeave={() => scheduleFlyoutClose()}
            className={clsx(
              'absolute left-0 right-0 select-none overflow-hidden rounded-2xl border border-border bg-card transition-[opacity,transform] duration-150',
              verticalAlign === 'top' ? 'top-0' : 'bottom-0',
              flyoutVisibleClass('help')
            )}
          >
            <FlyoutHeader
              icon={<HelpCircle size={13} strokeWidth={1.9} />}
              title={t('tray.help', { defaultValue: 'Help' })}
            />
            <TrayDivider />
            <div className="tray-scrollbar flex max-h-[360px] flex-col gap-0.5 overflow-y-auto px-1.5 py-1">
              <TrayItem compact icon={<Star size={14} strokeWidth={1.75} />}
                label={githubStarLabels[i18n.language.startsWith('es') ? 'es' : 'en'].idle}
                onClick={() => { void invoke('hide_tray_menu').then(() => invoke('star_repository')).catch(console.error); }} />
              <div role="separator" className="mx-2 my-1 h-px bg-border/70" />
              <TrayItem
                compact
                icon={<Pin size={14} strokeWidth={1.75} />}
                label={t('tray.pinTrayIcon', { defaultValue: 'Pin icon to taskbar...' })}
                onClick={() => hideThenInvoke('show_tray_pin_tip')}
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
                icon={<Gem size={14} strokeWidth={1.75} />}
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

          {/* Suite Flyout */}
          {suiteEnabled ? (
            <div
              ref={suiteFlyoutRef}
              role="menu"
              aria-hidden={activeFlyout !== 'suite'}
              style={cardShellStyle}
              onMouseEnter={() => cancelFlyoutTimers()}
              onMouseLeave={() => scheduleFlyoutClose()}
              className={clsx(
                'absolute left-0 right-0 select-none overflow-hidden rounded-2xl border border-border bg-card transition-[opacity,transform] duration-150',
                verticalAlign === 'top' ? 'top-0' : 'bottom-0',
                flyoutVisibleClass('suite')
              )}
            >
              <FlyoutHeader
                icon={<Gem size={13} strokeWidth={1.9} />}
                title={t('tray.suite', { defaultValue: 'More from CyberGems' })}
                brandAction={() => hideThenOpen(WEBSITE_URL)}
                brandLabel={t('tray.website', { defaultValue: 'Website' })}
              />
              <TrayDivider />
              <div className="tray-scrollbar flex max-h-[310px] flex-col gap-0.5 overflow-y-auto px-1.5 py-1">
                {RECOMMENDED_SUITE_APPS.map((app) => (
                  <TrayItem
                    key={app.slug}
                    compact
                    icon={
                      <img src={app.icon} alt="" className="h-4 w-4 rounded-[4px] object-contain" />
                    }
                    label={app.name}
                    description={app.short[suiteLocale]}
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
                  <ArrowRight size={13} strokeWidth={1.75} />
                  {t('tray.suiteMore', { defaultValue: 'More details online...' })}
                </button>
              </div>
            </div>
          ) : null}
        </div>
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

function FlyoutHeader({
  icon,
  title,
  brandAction,
  brandLabel,
}: {
  icon: ReactNode;
  title: string;
  brandAction?: () => void;
  brandLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 pb-1.5 pt-2.5">
      <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] font-semibold tracking-wide text-foreground/90">
        <span className="text-primary drop-shadow-[0_0_4px_rgba(var(--primary-rgb),0.32)]">
          {icon}
        </span>
        <span className="truncate">{title}</span>
      </span>
      {brandAction ? (
        <button
          type="button"
          aria-label={brandLabel ?? 'CyberGems'}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            brandAction();
          }}
          className="group flex shrink-0 items-center gap-1.5 rounded-md text-[11px] font-semibold tracking-wide text-muted-foreground transition-colors hover:text-foreground"
        >
          <picture className="inline-flex h-3.5 w-3.5">
            <source srcSet="/cybergems-logo.svg" type="image/svg+xml" />
            <img
              src="/cybergems-logo.png"
              alt=""
              className="h-full w-full object-contain transition-transform duration-150 ease-out group-hover:scale-105"
            />
          </picture>
          <span>CyberGems</span>
        </button>
      ) : null}
    </div>
  );
}

function TrayItem({
  icon,
  label,
  description,
  shortcut,
  compact,
  nav,
  danger,
  warning,
  flyoutTrigger,
  flyoutActive,
  onMouseEnter,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  description?: string;
  shortcut?: string;
  compact?: boolean;
  nav?: boolean;
  danger?: boolean;
  warning?: boolean;
  flyoutTrigger?: TrayFlyoutId;
  flyoutActive?: boolean;
  onMouseEnter?: () => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-flyout-trigger={flyoutTrigger}
      aria-haspopup={nav ? 'menu' : undefined}
      aria-expanded={nav ? Boolean(flyoutActive) : undefined}
      onMouseEnter={onMouseEnter}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        'group flex w-full items-center gap-2.5 rounded-[10px] text-left transition-all duration-150',
        compact && description
          ? 'min-h-[42px] px-2.5 py-1.5'
          : compact
            ? 'min-h-[26px] px-2.5 py-1'
            : 'min-h-[30px] px-2.5 py-1.5',
        warning
          ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/15 hover:text-amber-400'
          : flyoutActive
            ? 'bg-primary/15 text-foreground'
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
            : warning
              ? 'text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)] group-hover:text-amber-400'
              : 'text-primary drop-shadow-[0_0_4px_rgba(var(--primary-rgb),0.32)]'
        )}
      >
        {icon}
      </span>
      <span
        className={clsx(
          'min-w-0 flex-1 font-medium',
          warning && 'font-semibold text-amber-500',
          compact ? 'text-[11.5px]' : 'text-[12.5px]'
        )}
      >
        <span className={description ? 'block truncate' : undefined}>{label}</span>
        {description ? (
          <span className="mt-0.5 block truncate text-[9.5px] font-medium leading-tight text-muted-foreground/75">
            {description}
          </span>
        ) : null}
      </span>
      {nav ? (
        <ChevronRight
          size={14}
          strokeWidth={2}
          className={clsx(
            'ml-auto transition-all duration-150',
            flyoutActive
              ? '-translate-x-0.5 text-primary'
              : 'text-muted-foreground/70 group-hover:-translate-x-0.5 group-hover:text-primary'
          )}
        />
      ) : shortcut ? (
        <span className="ml-auto flex-shrink-0 rounded border border-border bg-primary/10 px-1.5 py-px font-mono text-[9px] font-semibold tracking-wide text-primary group-hover:border-primary/40">
          {shortcut}
        </span>
      ) : null}
    </button>
  );
}
