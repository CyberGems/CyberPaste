import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettingsSnapshot } from '../hooks/useSettingsSnapshot';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import {
  BookOpen,
  Copy,
  Github,
  Gem,
  Heart,
  Info,
  Loader2,
  Minus,
  RotateCcw,
  Tag,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Settings } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { toast } from '../utils/toast';
import { IS_PORTABLE_BUILD } from '../utils/build';
import {
  formatUpdaterError,
  isUpdaterNetworkError,
  type UpdateCheckResult,
} from '../utils/updater';
import Tooltip from '../components/Tooltip';
import { RECOMMENDED_SUITE_APPS, suiteLanguage } from '../data/suiteApps';

const REPO_URL = 'https://github.com/CyberGems/CyberPaste';
const WEBSITE_URL = 'https://cybergems.org';
const WIKI_URL = 'https://github.com/CyberGems/CyberPaste/wiki';
const DONATE_URL = 'https://github.com/CyberGems/CyberPaste#%EF%B8%8F-donate';
const SUITE_URL = 'https://cybergems.org/#apps';
const HEART_COLOR = '#F43F5E';

function pickRecommendedSuiteApps() {
  const apps = [...RECOMMENDED_SUITE_APPS];
  for (let index = apps.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [apps[index], apps[randomIndex]] = [apps[randomIndex], apps[index]];
  }
  return apps.slice(0, 5);
}

function BugIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m8 2 1.88 1.88" />
      <path d="M14.12 3.88 16 2" />
      <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
      <path d="M12 20v-9" />
      <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
      <path d="M6 13H2" />
      <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
      <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
      <path d="M22 13h-4" />
      <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
    </svg>
  );
}

export function AboutWindow() {
  const settings = useSettingsSnapshot();
  const checkInFlight = useRef(false);
  const handedOffUpdate = useRef(false);
  const [appVersion, setAppVersion] = useState('');
  const [checkStatus, setCheckStatus] = useState<
    'idle' | 'checking' | 'available' | 'upToDate' | 'networkError' | 'error'
  >('idle');
  const [recommendedSuiteApps] = useState(pickRecommendedSuiteApps);
  const { t } = useTranslation();

  useLanguage(settings?.language);
  useTheme(settings?.theme ?? 'cyberpaste');

  useEffect(() => {
    getVersion().then(setAppVersion).catch(console.error);
  }, []);

  const settingsReady = settings !== null;
  useEffect(() => {
    if (!settingsReady) return;
    const timer = setTimeout(() => {
      const win = getCurrentWindow();
      win
        .show()
        .then(() => {
          if (!handedOffUpdate.current) return win.setFocus();
        })
        .catch(console.error);
    }, 50);
    return () => clearTimeout(timer);
  }, [settingsReady]);

  const handleClose = async () => {
    const win = getCurrentWindow();
    try {
      if (!(await win.isMaximized()) && !(await win.isMinimized())) {
        const size = await win.innerSize();
        const pos = await win.innerPosition();
        const factor = await win.scaleFactor();
        const logicalSize = size.toLogical(factor);
        const logicalPos = pos.toLogical(factor);

        if (logicalSize.width > 100 && logicalSize.height > 100) {
          try {
            const currentSettings = await invoke<Settings>('get_settings');
            await invoke('save_settings', {
              settings: {
                ...currentSettings,
                about_window_width: logicalSize.width,
                about_window_height: logicalSize.height,
                about_window_x: logicalPos.x,
                about_window_y: logicalPos.y,
              },
            });
          } catch {
            const fallback = settings;
            if (fallback) {
              await invoke('save_settings', {
                settings: {
                  ...fallback,
                  about_window_width: logicalSize.width,
                  about_window_height: logicalSize.height,
                  about_window_x: logicalPos.x,
                  about_window_y: logicalPos.y,
                },
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to save about window size/position:', e);
    }

    try {
      await win.close();
    } catch (e) {
      console.error('Failed to close about window:', e);
    }
  };

  const handleCopyDiagnosticInfo = async () => {
    if (!settings) return;

    const diagnosticInfo = [
      `CyberPaste ${appVersion || 'unknown'}`,
      `Platform: ${navigator.platform || 'unknown'}`,
      `User agent: ${navigator.userAgent}`,
      `Language: ${settings.language || 'system'}`,
      `Theme: ${settings.theme || 'unknown'}`,
      `Portable build: ${IS_PORTABLE_BUILD ? 'yes' : 'no'}`,
      `Device pixel ratio: ${window.devicePixelRatio}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(diagnosticInfo);
      toast.success(t('settings.aboutDiagnosticCopied'));
    } catch (error) {
      console.error('Failed to copy diagnostic information:', error);
      toast.error(t('settings.aboutDiagnosticCopyFailed'));
    }
  };

  const checkForUpdates = useCallback(async () => {
    if (IS_PORTABLE_BUILD || checkInFlight.current) return;
    checkInFlight.current = true;
    setCheckStatus('checking');
    try {
      const { available } = await invoke<UpdateCheckResult>('check_for_updates', {
        background: false,
      });
      setCheckStatus(available ? 'available' : 'upToDate');
      if (available) {
        handedOffUpdate.current = true;
        await getCurrentWindow().show();
        await invoke('open_update_notice').catch(console.error);
      }
    } catch (error: unknown) {
      setCheckStatus(isUpdaterNetworkError(formatUpdaterError(error)) ? 'networkError' : 'error');
      console.error('Update check failed:', error);
    } finally {
      checkInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unlistenFn: (() => void) | null = null;
    const handlePendingCheck = async () => {
      if ((await invoke<boolean>('consume_about_update_check')) && !cancelled) {
        await checkForUpdates();
      }
    };
    getCurrentWindow()
      .listen('about-check-updates', () => {
        void handlePendingCheck().catch(console.error);
      })
      .then((unlisten) => {
        if (cancelled) {
          unlisten();
          return;
        }
        unlistenFn = unlisten;
        return handlePendingCheck();
      })
      .catch(console.error);
    return () => {
      cancelled = true;
      unlistenFn?.();
    };
  }, [checkForUpdates]);

  if (!settings) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        {t('common.loading')}
      </div>
    );
  }

  const suiteLang = suiteLanguage(settings.language);

  return (
    <div className="settings-window relative isolate h-screen overflow-hidden bg-background">
      <div className="relative z-10 flex h-full flex-col overflow-hidden bg-background text-foreground">
        <header className="flex cursor-default select-none items-center justify-between border-b border-border bg-transparent px-4 py-3">
          <div data-tauri-drag-region className="flex min-w-0 flex-1 items-center gap-2.5">
            <Info size={18} className="shrink-0 text-primary" />
            <h1 className="cursor-default select-none text-[16px] font-semibold tracking-tight">
              {t('settings.about')}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip label={t('common.minimize')} placement="bottom">
              <button
                type="button"
                onClick={() => getCurrentWindow().minimize().catch(console.error)}
                className="icon-button flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-accent/50"
              >
                <Minus size={14} />
              </button>
            </Tooltip>
            <button
              type="button"
              onClick={handleClose}
              aria-label={t('common.close')}
              className="icon-button flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-destructive/20 hover:text-destructive"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <main className="custom-scrollbar flex-1 overflow-y-auto px-[18px] py-3">
          <div className="mx-auto w-full max-w-3xl">
            <section className="grid cursor-default select-none grid-cols-[auto_minmax(200px,1fr)] items-center gap-9 py-1">
              <div className="flex items-center gap-5">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                  <img
                    src="/logo.png"
                    alt="CyberPaste"
                    className="h-14 w-14 select-none object-contain drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.4)]"
                  />
                </div>
                <div className="min-w-0 cursor-default select-none">
                  <h2 className="text-[32px] font-bold tracking-tight">CyberPaste</h2>
                  <p className="mt-1 text-[14px] text-muted-foreground">
                    {t('settings.versionLabel', { version: appVersion || '...' })}
                  </p>
                </div>
              </div>
              <div className="cursor-default select-none rounded-xl border border-primary/25 bg-card px-5 py-4">
                <p className="cursor-default select-none text-[13px] leading-6 text-foreground/80">
                  {t('settings.aboutDescription')}
                </p>
              </div>
            </section>

            {!IS_PORTABLE_BUILD && (
              <section className="mt-5 space-y-2">
                <h3 className="cursor-default select-none text-[13px] font-semibold text-primary">
                  {t('settings.aboutUpdatesSection')}
                </h3>
                <div className="grid min-h-[60px] grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-[4px] border border-border/80 bg-secondary px-4">
                  <RotateCcw size={23} aria-hidden="true" className="text-muted-foreground" />
                  <div className="min-w-0">
                    <span className="text-[13px] font-medium">{t('settings.checkForUpdates')}</span>
                    <p
                      role="status"
                      data-el="update-check-result"
                      className="mt-0.5 text-xs text-muted-foreground"
                    >
                      {
                        {
                          idle: t('settings.checkForUpdatesDesc'),
                          checking: t('settings.checkingUpdates'),
                          available: t('settings.updatesAvailableTitle'),
                          upToDate: t('settings.aboutUpdateSuccessDesc'),
                          networkError: t('settings.updateCheckFailed'),
                          error: t('settings.updateError'),
                        }[checkStatus]
                      }
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={checkForUpdates}
                    disabled={checkStatus === 'checking'}
                    className="btn inline-flex min-w-[108px] items-center justify-center gap-1.5 rounded-[4px] border border-primary/20 bg-input px-3 py-2 text-xs text-foreground hover:bg-accent disabled:opacity-60"
                  >
                    {checkStatus === 'checking' && (
                      <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                    )}
                    {t('settings.checkNow')}
                  </button>
                </div>
              </section>
            )}

            {(settings.show_app_recommendations ?? true) ? (
              <section className="mt-5 text-left">
                <div className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-primary">
                  <div className="h-px flex-1 bg-primary/20" />
                  <span className="cursor-default select-none">{t('settings.suiteTitle')}</span>
                  <div className="h-px flex-1 bg-primary/20" />
                </div>
                <div className="mx-auto flex w-full flex-nowrap items-center justify-center gap-2">
                  {recommendedSuiteApps.map((app) => (
                    <Tooltip
                      key={app.slug}
                      label={`${app.name}: ${app.tagline[suiteLang]}`}
                      placement="top"
                    >
                      <button
                        type="button"
                        onClick={() => openUrl(app.site).catch(console.error)}
                        aria-label={`${app.name}: ${app.tagline[suiteLang]}`}
                        className="group flex h-11 w-11 items-center justify-center rounded-lg border border-border/80 bg-card p-1 opacity-50 transition-all duration-200 hover:border-primary/50 hover:bg-accent hover:opacity-100"
                      >
                        <img
                          src={app.icon}
                          alt=""
                          className="h-8 w-8 rounded-md object-contain transition-transform group-hover:scale-105"
                        />
                      </button>
                    </Tooltip>
                  ))}
                  <Tooltip label={t('settings.suiteMoreTooltip')} placement="top">
                    <button
                      type="button"
                      onClick={() => openUrl(SUITE_URL).catch(console.error)}
                      aria-label={t('settings.suiteMoreTooltip')}
                      className="inline-flex h-11 items-center rounded-lg border border-transparent px-2 text-[11px] font-medium text-muted-foreground opacity-60 transition-all duration-200 hover:border-primary/35 hover:bg-primary/[0.06] hover:text-primary hover:opacity-100"
                    >
                      <span>{t('settings.suiteMore')}</span>
                    </button>
                  </Tooltip>
                </div>
              </section>
            ) : null}
          </div>
        </main>

        <footer className="flex items-center justify-between border-t border-border bg-black/5 px-[18px] py-2.5">
          <span className="text-[10px] font-semibold text-muted-foreground">
            © 2026{' '}
            <button
              type="button"
              onClick={() => openUrl(WEBSITE_URL).catch(console.error)}
              title={t('settings.aboutWebsiteTooltip')}
              aria-label={t('settings.aboutWebsiteTooltip')}
              className="transition-colors hover:text-foreground"
            >
              CyberGems
            </button>
          </span>
          <div className="flex items-center gap-1">
            <Tooltip label={t('settings.aboutWebsiteTooltip')} placement="top">
              <button
                type="button"
                aria-label={t('settings.aboutWebsiteTooltip')}
                onClick={() => openUrl(WEBSITE_URL).catch(console.error)}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Gem size={15} strokeWidth={1.5} />
              </button>
            </Tooltip>
            <Tooltip label={t('settings.aboutDocsTooltip')} placement="top">
              <button
                type="button"
                aria-label={t('settings.aboutDocsTooltip')}
                onClick={() => openUrl(WIKI_URL).catch(console.error)}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <BookOpen size={15} strokeWidth={1.5} />
              </button>
            </Tooltip>
            <Tooltip label={t('settings.aboutGithubTooltip')} placement="top">
              <button
                type="button"
                aria-label={t('settings.aboutGithubTooltip')}
                onClick={() => openUrl(REPO_URL).catch(console.error)}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Github size={15} strokeWidth={1.5} />
              </button>
            </Tooltip>
            <Tooltip label={t('settings.aboutIssuesTooltip')} placement="top">
              <button
                type="button"
                aria-label={t('settings.aboutIssuesTooltip')}
                onClick={() => openUrl(`${REPO_URL}/issues`).catch(console.error)}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <BugIcon size={15} />
              </button>
            </Tooltip>
            <Tooltip label={t('settings.aboutDiagnosticTooltip')} placement="top">
              <button
                type="button"
                aria-label={t('settings.aboutDiagnosticTooltip')}
                onClick={handleCopyDiagnosticInfo}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Copy size={15} strokeWidth={1.5} />
              </button>
            </Tooltip>
            <Tooltip label={t('settings.aboutReleasesTooltip')} placement="top">
              <button
                type="button"
                aria-label={t('settings.aboutReleasesTooltip')}
                onClick={() => openUrl(`${REPO_URL}/releases`).catch(console.error)}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Tag size={15} strokeWidth={1.5} />
              </button>
            </Tooltip>
            <Tooltip label={t('common.donate')} placement="top">
              <button
                type="button"
                aria-label={t('common.donate')}
                onClick={() => openUrl(DONATE_URL).catch(console.error)}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-md transition-colors hover:bg-accent"
              >
                <Heart size={15} strokeWidth={1.5} fill={HEART_COLOR} stroke={HEART_COLOR} />
              </button>
            </Tooltip>
          </div>
        </footer>
      </div>
    </div>
  );
}
