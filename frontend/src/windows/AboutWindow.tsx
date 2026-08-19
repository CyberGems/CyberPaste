import { useEffect, useState } from 'react';
import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { check } from '@tauri-apps/plugin-updater';
import {
  ExternalLink,
  Github,
  HelpCircle,
  Info,
  Maximize2,
  Minus,
  RotateCcw,
  Square,
  Tag,
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

export function AboutWindow() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [appVersion, setAppVersion] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<UpdateType>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateCheckError, setUpdateCheckError] = useState<string | null>(null);
  const { t } = useTranslation();

  useLanguage(settings?.language);
  useTheme(settings?.theme ?? 'cyberpaste');

  useEffect(() => {
    getVersion().then(setAppVersion).catch(console.error);
    invoke<Settings>('get_settings').then(setSettings).catch(console.error);

    const win = getCurrentWindow();
    win.isMaximized().then(setIsMaximized).catch(console.error);

    const unlistenSettings = listen<Settings>('settings-changed', (event) => {
      setSettings(event.payload);
    });

    return () => {
      unlistenSettings.then((unlisten) => unlisten());
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

  const close = () => {
    getCurrentWindow().close().catch(console.error);
  };

  const toggleMaximize = async () => {
    const win = getCurrentWindow();
    await win.toggleMaximize();
    setIsMaximized(await win.isMaximized());
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

  const checkForUpdates = async () => {
    const loadingToast = toast.loading(t('settings.checkingUpdates'));
    setUpdateCheckError(null);
    try {
      const update = await check({ timeout: 15000 });
      toast.dismiss(loadingToast);
      if (update) {
        setUpdateAvailable(update);
        setShowUpdateModal(true);
        toast.update(t('settings.updateAvailable', { version: update.version }));
        invoke('set_update_available', { available: true }).catch(console.error);
      } else {
        invoke('set_update_available', { available: false }).catch(console.error);
        toast.info(t('settings.noUpdates'));
      }
    } catch (error: unknown) {
      toast.dismiss(loadingToast);
      const raw = formatUpdaterError(error);
      setUpdateCheckError(raw);
      console.error('Update check failed:', error);
      const prefix = isUpdaterNetworkError(raw)
        ? t('settings.updateNotReachable')
        : t('settings.updateError');
      toast.error(`${prefix}: ${raw}`);
    }
  };

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
        <header className="flex items-center justify-between border-b border-border bg-transparent px-4 py-3">
          <div data-tauri-drag-region className="flex min-w-0 flex-1 items-center gap-3">
            <img src="/logo.png" alt="CyberPaste" className="h-6 w-6 object-contain" />
            <h1 className="text-[16px] font-semibold tracking-tight">{t('settings.about')}</h1>
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
            <Tooltip label={isMaximized ? t('common.restore') : t('common.maximize')} placement="bottom">
              <button
                type="button"
                onClick={toggleMaximize}
                className="icon-button flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-accent/50"
              >
                {isMaximized ? <Square size={14} /> : <Maximize2 size={14} />}
              </button>
            </Tooltip>
            <button
              type="button"
              onClick={close}
              aria-label={t('common.close')}
              className="icon-button flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-destructive/20 hover:text-destructive"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <main className="custom-scrollbar flex-1 overflow-y-auto px-[18px] py-3">
          <div className="mx-auto w-full max-w-3xl">
            <section className="grid grid-cols-[auto_minmax(200px,1fr)] items-center gap-9 py-1">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-[18px] border border-primary/20 bg-card shadow-[0_0_20px_rgba(var(--primary-rgb),0.12)]">
                  <img src="/logo.png" alt="CyberPaste" className="h-[52px] w-[52px] object-contain" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[32px] font-bold tracking-tight">CyberPaste</h2>
                  <p className="mt-1 text-[14px] text-muted-foreground">
                    {t('settings.versionLabel', { version: appVersion || '...' })}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-primary/20 bg-card px-5 py-4">
                <p className="text-[13px] leading-6 text-foreground/80">
                  {t('settings.aboutDescription')}
                </p>
              </div>
            </section>

            <section className="mt-5 space-y-2">
              <h3 className="px-0 text-[13px] font-semibold text-primary">
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
                      {t('settings.checkForUpdatesDesc')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={checkForUpdates}
                    className="btn min-w-[108px] rounded-[4px] border border-primary/20 bg-input px-3 py-2 text-xs text-foreground hover:bg-accent"
                  >
                    {t('settings.checkNow')}
                  </button>
                </div>

                {updateCheckError && (
                  <div className="mb-3 space-y-2 rounded-[4px] border border-destructive/25 bg-destructive/5 p-3">
                    <p className="text-[12px] font-semibold text-destructive">
                      {t('settings.updateErrorDetails')}
                    </p>
                    <pre className="max-h-28 overflow-y-auto whitespace-pre-wrap break-all rounded bg-black/20 p-2 font-mono text-[11px] leading-relaxed text-destructive/90">
                      {updateCheckError}
                    </pre>
                    <p className="text-[11px] text-muted-foreground">
                      {t('settings.updateErrorHint')}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          navigator.clipboard
                            .writeText(updateCheckError)
                            .then(() => toast.success(t('settings.updateErrorCopied')))
                            .catch(console.error)
                        }
                        className="btn rounded-[4px] border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-foreground hover:bg-white/10"
                      >
                        {t('settings.updateErrorCopy')}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          openUrl(`${REPO_URL}/releases/latest`).catch(console.error)
                        }
                        className="btn rounded-[4px] border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] text-primary hover:bg-primary/20"
                      >
                        <ExternalLink size={12} className="mr-1.5" />
                        {t('settings.updatesOpenReleasePage')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>

        <footer className="flex items-center justify-between border-t border-border bg-black/5 px-[18px] py-2.5">
          <span className="text-[10px] font-semibold text-muted-foreground">
            © 2026 CyberGems
          </span>
          <div className="flex items-center gap-1">
            <Tooltip label={t('settings.aboutWebsiteTooltip')} placement="top">
              <button
                type="button"
                aria-label={t('settings.aboutWebsiteTooltip')}
                onClick={() => openUrl(WEBSITE_URL).catch(console.error)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ExternalLink size={15} />
              </button>
            </Tooltip>
            <Tooltip label={t('settings.aboutGithubTooltip')} placement="top">
              <button
                type="button"
                aria-label={t('settings.aboutGithubTooltip')}
                onClick={() => openUrl(REPO_URL).catch(console.error)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Github size={15} />
              </button>
            </Tooltip>
            <Tooltip label={t('settings.aboutIssuesTooltip')} placement="top">
              <button
                type="button"
                aria-label={t('settings.aboutIssuesTooltip')}
                onClick={() => openUrl(`${REPO_URL}/issues`).catch(console.error)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <HelpCircle size={15} />
              </button>
            </Tooltip>
            <Tooltip label={t('settings.aboutReleasesTooltip')} placement="top">
              <button
                type="button"
                aria-label={t('settings.aboutReleasesTooltip')}
                onClick={() => openUrl(`${REPO_URL}/releases`).catch(console.error)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Tag size={15} />
              </button>
            </Tooltip>
            <Tooltip label={t('settings.aboutLicenseTooltip')} placement="top">
              <button
                type="button"
                aria-label={t('settings.aboutLicenseTooltip')}
                onClick={() => openUrl(`${REPO_URL}/blob/main/LICENSE`).catch(console.error)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Info size={15} />
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
