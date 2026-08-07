import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, Loader2, AlertTriangle, Sparkles, ExternalLink } from 'lucide-react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';
import { openUrl } from '@tauri-apps/plugin-opener';

type UpdateType = Awaited<ReturnType<typeof check>>;

interface UpdateModalProps {
  isOpen: boolean;
  update: UpdateType;
  onClose: () => void;
}

export function UpdateModal({ isOpen, update, onClose }: UpdateModalProps) {
  const { t } = useTranslation();
  const [currentVersion, setCurrentVersion] = useState<string>('...');
  const [status, setStatus] = useState<'prompt' | 'downloading' | 'error'>('prompt');
  const [progress, setProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(console.error);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStatus('prompt');
      setProgress(0);
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen || !update) return null;

  const handleUpdate = async () => {
    try {
      setStatus('downloading');
      setProgress(0);

      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              const pct = Math.round((downloaded / contentLength) * 100);
              setProgress(pct);
            } else {
              setProgress((prev) => Math.min(prev + 5, 95));
            }
            break;
          case 'Finished':
            setProgress(100);
            break;
          default:
            break;
        }
      });

      await relaunch();
    } catch (err: any) {
      console.error('Update download/install failed:', err);
      setErrorMsg(typeof err === 'string' ? err : err?.message || String(err));
      setStatus('error');
    }
  };

  const handleOpenReleasePage = () => {
    openUrl('https://github.com/CyberGems/CyberPaste/releases/latest').catch(console.error);
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md duration-300">
      <div className="animate-in zoom-in-95 relative w-full max-w-md overflow-hidden rounded-xl border border-primary/20 bg-background/90 p-6 shadow-2xl shadow-primary/10 duration-300">
        
        <div className="absolute -left-16 -top-16 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute -right-16 -bottom-16 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl" />

        <div className="relative mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles size={20} className="animate-pulse" />
            <h3 className="text-lg font-bold tracking-wide uppercase">
              {t('settings.updatesTitle')}
            </h3>
          </div>
          {status !== 'downloading' && (
            <button 
              onClick={onClose} 
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="relative z-10 min-h-[120px] flex flex-col justify-center">
          {status === 'prompt' && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground/90">
                {t('settings.updatesNewVersionAvailable')}
              </p>
              
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-secondary/50 p-3.5 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground block mb-0.5">
                    {t('settings.updatesCurrentVersion', { version: '' }).replace(':', '')}
                  </span>
                  <span className="text-foreground/80 font-bold bg-white/5 px-2 py-0.5 rounded">
                    v{currentVersion}
                  </span>
                </div>
                <div>
                  <span className="text-primary block mb-0.5">
                    {t('settings.updatesLatestVersion', { version: '' }).replace(':', '')}
                  </span>
                  <span className="text-primary font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                    v{update.version}
                  </span>
                </div>
              </div>
              
              {update.body && (
                <div className="max-h-24 overflow-y-auto rounded border border-border/50 bg-black/10 p-2 text-xs text-muted-foreground scrollbar-thin">
                  {update.body}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="rounded-md border border-input bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
                >
                  {t('settings.updatesLater')}
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/95 hover:shadow-primary/35"
                >
                  <Download size={16} />
                  {t('settings.updatesUpdateNow')}
                </button>
              </div>
            </div>
          )}

          {status === 'downloading' && (
            <div className="space-y-5 py-4 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground/90">
                  {progress < 100 ? t('settings.updatesDownloading') : t('settings.updatesInstalling')}
                </p>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground">{progress}%</span>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3.5">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-destructive">
                    {t('settings.updatesErrorTitle')}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {t('settings.updatesErrorDesc')}
                  </p>
                  {errorMsg && (
                    <p className="mt-2 font-mono text-[10px] text-destructive bg-destructive/10 p-1.5 rounded break-all max-h-16 overflow-y-auto">
                      {errorMsg}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="rounded-md border border-input bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
                >
                  {t('common.close')}
                </button>
                <button
                  onClick={handleOpenReleasePage}
                  className="flex items-center gap-1.5 rounded-md bg-primary/20 border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary/30"
                >
                  <ExternalLink size={14} />
                  {t('settings.updatesOpenReleasePage')}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
