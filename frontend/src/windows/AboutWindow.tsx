import { useEffect, useState } from 'react';
import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { check } from '@tauri-apps/plugin-updater';
import {
  ExternalLink,
  Heart,
  Info,
  Maximize2,
  Minus,
  RotateCcw,
  Square,
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
            <div data-tauri-drag-region>
              <h1 className="text-[18px] font-bold tracking-tight">CyberPaste</h1>
              <p className="text-[11px] text-muted-foreground">{t('settings.about')}</p>
            </div>
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

        <main className="custom-scrollbar flex-1 overflow-y-auto p-6">
          <div className="mx-auto w-full max-w-3xl space-y-6">
            <section className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-primary/20 bg-card shadow-[0_0_24px_rgba(var(--primary-rgb),0.12)]">
                <img src="/logo.png" alt="CyberPaste" className="h-16 w-16 object-contain" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">CyberPaste</h2>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {t('settings.versionLabel', { version: appVersion || '...' })}
                </p>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                {t('settings.aboutDescription')}
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
                <RotateCcw size={14} /> {t('settings.updates')}
              </h3>
              <div className="space-y-4 rounded-[4px] border border-border bg-secondary p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium">{t('settings.autoCheckUpdates')}</span>
                    <p className="text-xs text-muted-foreground">
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
                <button
                  type="button"
                  onClick={checkForUpdates}
                  className="btn w-full rounded-[4px] border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20"
                >
                  <RotateCcw size={16} className="mr-2" />
                  {t('settings.checkForUpdates')}
                </button>
                {updateCheckError && (
                  <div className="space-y-2 rounded-[4px] border border-destructive/25 bg-destructive/5 p-3">
                    <p className="text-[12px] font-semibold text-destructive">
                      {t('settings.updateErrorDetails')}
                    </p>
                    <pre className="max-h-36 overflow-y-auto whitespace-pre-wrap break-all rounded bg-black/20 p-2 font-mono text-[11px] leading-relaxed text-destructive/90">
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
                          openUrl('https://github.com/CyberGems/CyberPaste/releases/latest').catch(
                            console.error
                          )
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

            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
                <Heart size={16} /> {t('settings.openSource')}
              </h3>
              <div className="rounded-[4px] border border-border bg-secondary p-4">
                <p className="text-sm leading-relaxed text-muted-foreground/80">
                  {t('settings.openSourceDesc')}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      openUrl('https://github.com/CyberGems/CyberPaste').catch(console.error)
                    }
                    className="flex items-center gap-2 rounded-[4px] border border-border bg-input px-4 py-2 text-sm font-medium transition-all hover:bg-white/10"
                  >
                    <ExternalLink size={16} />
                    {t('settings.gitHubRepository')}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openUrl('https://github.com/CyberGems/CyberPaste/blob/main/LICENSE').catch(
                        console.error
                      )
                    }
                    className="flex items-center gap-2 rounded-[4px] border border-border bg-input px-4 py-2 text-sm font-medium transition-all hover:bg-white/10"
                  >
                    <Info size={16} />
                    {t('settings.licenseGpl')}
                  </button>
                </div>
              </div>
            </section>

            <footer className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
              © 2026 CyberGems
            </footer>
          </div>
        </main>
      </div>

      <UpdateModal
        isOpen={showUpdateModal}
        update={updateAvailable}
        onClose={() => setShowUpdateModal(false)}
      />
    </div>
  );
}
