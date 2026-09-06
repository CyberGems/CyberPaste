import { useCallback, useEffect, useRef, useState } from 'react';
import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { check } from '@tauri-apps/plugin-updater';
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronDown,
  ExternalLink,
  Github,
  Globe,
  Heart,
  Info,
  Loader2,
  Minus,
  RotateCcw,
  Tag,
  WifiOff,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Settings } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { systemToast as toast } from '../utils/toast';
import { formatUpdaterError, isUpdaterNetworkError } from '../utils/updater';
import { UpdateModal } from '../components/UpdateModal';
import Tooltip from '../components/Tooltip';

type UpdateType = Awaited<ReturnType<typeof check>>;

const REPO_URL = 'https://github.com/CyberGems/CyberPaste';
const WEBSITE_URL = 'https://cybergems.org';
const WIKI_URL = 'https://github.com/CyberGems/CyberPaste/wiki';
const DONATE_URL = 'https://github.com/CyberGems/CyberPaste#%EF%B8%8F-donate';
const HEART_COLOR = '#F43F5E';

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
  const [settings, setSettings] = useState<Settings | null>(null);
  const settingsRef = useRef<Settings | null>(null);
  const [appVersion, setAppVersion] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState<UpdateType>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateCheckError, setUpdateCheckError] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'upToDate'>('idle');
  const { t } = useTranslation();

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useLanguage(settings?.language);
  useTheme(settings?.theme ?? 'cyberpaste');

  useEffect(() => {
    getVersion().then(setAppVersion).catch(console.error);
    invoke<Settings>('get_settings').then(setSettings).catch(console.error);

    const unlistenSettings = listen<Settings>('settings-changed', (event) => {
      setSettings(event.payload);
    });

    return () => {
      unlistenSettings.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    invoke<any>('get_tray_menu_state')
      .then((state: any) => {
        if (state?.update_available && !updateAvailable) {
          check({ timeout: 15000 })
            .then((u) => {
              if (!cancelled && u) {
                setUpdateAvailable(u);
                invoke('set_update_available', { available: true }).catch(console.error);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settings) return;
    const timer = setTimeout(() => {
      const win = getCurrentWindow();
      win.show().then(() => win.setFocus()).catch(console.error);
    }, 50);
    return () => clearTimeout(timer);
  }, [settings]);

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
            const fallback = settingsRef.current;
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

  const updateAutoCheck = async () => {
    if (!settings) return;
    const next = { ...settings, auto_check_updates: !(settings.auto_check_updates ?? false) };
    setSettings(next);
    try {
      await invoke('save_settings', { settings: next });
      await emit('settings-changed', next);
      toast.success(
        `${t('settings.autoCheckUpdates')}: ${
          next.auto_check_updates ? t('common.enabled') : t('common.disabled')
        }`
      );
    } catch (error) {
      console.error('Failed to save update settings:', error);
      setSettings(settings);
      toast.error(t('settings.failedToSave'));
    }
  };

  const checkForUpdates = useCallback(async () => {
    setCheckStatus('checking');
    setUpdateCheckError(null);
    setShowTechnicalDetails(false);
    try {
      const update = await check({ timeout: 15000 });
      if (update) {
        setCheckStatus('idle');
        setUpdateAvailable(update);
        setShowUpdateModal(true);
        invoke('set_update_available', { available: true }).catch(console.error);
      } else {
        invoke('set_update_available', { available: false }).catch(console.error);
        setCheckStatus('upToDate');
      }
    } catch (error: unknown) {
      const raw = formatUpdaterError(error);
      setCheckStatus('idle');
      setUpdateCheckError(raw);
      console.error('Update check failed:', error);
    }
  }, []);

  useEffect(() => {
    const unlisten = listen('about-check-updates', () => {
      void checkForUpdates();
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [checkForUpdates]);

  if (!settings) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="settings-window h-screen">
      <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
        <header className="flex items-center justify-between border-b border-border bg-transparent px-4 py-3 select-none cursor-default">
          <div data-tauri-drag-region className="flex min-w-0 flex-1 items-center gap-2.5">
            <Info size={18} className="text-primary shrink-0" />
            <h1 className="text-[16px] font-semibold tracking-tight select-none cursor-default">{t('settings.about')}</h1>
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
            <section className="grid grid-cols-[auto_minmax(200px,1fr)] items-center gap-9 py-1 select-none cursor-default">
              <div className="flex items-center gap-5">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                  {/* Subtle ambient glow behind logo */}
                  <div className="pointer-events-none absolute h-12 w-12 rounded-full bg-primary/25 blur-xl animate-pulse" />
                  <img
                    src="/logo.png"
                    alt="CyberPaste"
                    className="relative z-10 h-14 w-14 select-none object-contain drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.4)]"
                  />
                </div>
                <div className="min-w-0 select-none cursor-default">
                  <h2 className="text-[32px] font-bold tracking-tight">CyberPaste</h2>
                  <p className="mt-1 text-[14px] text-muted-foreground">
                    {t('settings.versionLabel', { version: appVersion || '...' })}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-primary/20 bg-card px-5 py-4 select-none cursor-default">
                <p className="text-[13px] leading-6 text-foreground/80 select-none cursor-default">
                  {t('settings.aboutDescription')}
                </p>
              </div>
            </section>

            <section className="mt-5 space-y-2">
              <h3 className="px-0 text-[13px] font-semibold text-primary select-none cursor-default">
                {t('settings.aboutUpdatesSection')}
              </h3>
              <div className="rounded-[4px] border border-border bg-secondary px-4">
                <div className="grid min-h-[60px] grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3">
                  <RotateCcw size={23} className="text-muted-foreground" />
                  <div className="min-w-0">
                    <span className="text-[13px] font-medium">
                      {t('settings.autoCheckUpdates')}
                    </span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t('settings.autoCheckUpdatesDesc')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={updateAutoCheck}
                    aria-label={t('settings.autoCheckUpdates')}
                    className={`h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                      settings.auto_check_updates ?? false ? 'bg-primary' : 'bg-white/10'
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        settings.auto_check_updates ?? false
                          ? 'translate-x-5'
                          : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="h-px bg-border" />

                <div className="grid min-h-[60px] grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3">
                  <ExternalLink size={23} className="text-muted-foreground" />
                  <div className="min-w-0">
                    <span className="text-[13px] font-medium">
                      {t('settings.checkForUpdates')}
                    </span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {checkStatus === 'checking' ? (
                        <span className="inline-flex items-center gap-1.5 text-foreground">
                          <Loader2 size={12} className="animate-spin text-primary" />
                          {t('settings.checkingUpdates')}
                        </span>
                      ) : checkStatus === 'upToDate' ? (
                        <span className="inline-flex items-center gap-1.5 text-foreground">
                          <Check size={12} className="text-primary" />
                          {t('settings.noUpdates')}
                        </span>
                      ) : (
                        t('settings.checkForUpdatesDesc')
                      )}
                    </p>
                  </div>
                  {updateAvailable ? (
                    <button
                      type="button"
                      onClick={() => setShowUpdateModal(true)}
                      className="btn min-w-[108px] rounded-[4px] border border-primary/20 bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      {t('settings.updatesUpdateNow')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={checkForUpdates}
                      disabled={checkStatus === 'checking'}
                      className="btn min-w-[108px] rounded-[4px] border border-primary/20 bg-input px-3 py-2 text-xs text-foreground hover:bg-accent disabled:opacity-60 disabled:pointer-events-none"
                    >
                      {checkStatus === 'checking' ? (
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <Loader2 size={12} className="animate-spin" />
                          {t('settings.checkNow')}
                        </span>
                      ) : (
                        t('settings.checkNow')
                      )}
                    </button>
                  )}
                </div>

                {updateCheckError && (
                  <div className="mb-3 space-y-2.5 rounded-[6px] border border-border/80 bg-card/60 p-3.5 shadow-sm">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        {isUpdaterNetworkError(updateCheckError) ? (
                          <WifiOff size={12} />
                        ) : (
                          <AlertCircle size={12} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-[13px] font-medium leading-snug text-foreground">
                          {isUpdaterNetworkError(updateCheckError)
                            ? t('settings.updateCheckFailed')
                            : t('settings.updateError')}
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          {isUpdaterNetworkError(updateCheckError)
                            ? t('settings.checkInternetConnection')
                            : t('settings.updateErrorHint')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                      <button
                        type="button"
                        onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronDown
                          size={13}
                          className={`transition-transform duration-200 ${
                            showTechnicalDetails ? 'rotate-180' : ''
                          }`}
                        />
                        <span>
                          {showTechnicalDetails
                            ? t('settings.hideTechnicalDetails')
                            : t('settings.showTechnicalDetails')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openUrl(`${REPO_URL}/releases/latest`).catch(console.error)
                        }
                        className="btn inline-flex items-center rounded-[4px] border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                      >
                        <ExternalLink size={12} className="mr-1.5" />
                        {t('settings.updatesOpenReleasePage')}
                      </button>
                    </div>

                    {showTechnicalDetails && (
                      <div className="space-y-2 pt-1">
                        <pre className="max-h-24 overflow-y-auto whitespace-pre-wrap break-all rounded bg-black/25 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground/90 border border-border/40">
                          {updateCheckError}
                        </pre>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              navigator.clipboard
                                .writeText(updateCheckError)
                                .then(() => toast.success(t('settings.updateErrorCopied')))
                                .catch(console.error)
                            }
                            className="btn rounded-[4px] border border-border bg-secondary/80 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          >
                            {t('settings.updateErrorCopy')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
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
                <Globe size={15} strokeWidth={1.5} />
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

      <UpdateModal
        isOpen={showUpdateModal}
        update={updateAvailable}
        onClose={() => setShowUpdateModal(false)}
      />
    </div>
  );
}
