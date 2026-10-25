import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Download,
  Loader2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';
import { openUrl } from '@tauri-apps/plugin-opener';
import { extractLocalizedReleaseNotes } from '../utils/releaseNotes';
import Tooltip from './Tooltip';

type UpdateType = Awaited<ReturnType<typeof check>>;

interface UpdateModalProps {
  isOpen: boolean;
  update: UpdateType;
  onClose: () => void;
  onSkipVersion: (version: string) => Promise<void>;
}

export function UpdateModal({ isOpen, update, onClose, onSkipVersion }: UpdateModalProps) {
  const { t } = useTranslation();
  const [currentVersion, setCurrentVersion] = useState<string>('...');
  const [status, setStatus] = useState<'prompt' | 'downloading' | 'error'>('prompt');
  const [progress, setProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [skipBusy, setSkipBusy] = useState(false);
  const [skipError, setSkipError] = useState(false);
  const [releaseBody, setReleaseBody] = useState<string>(
    update?.body || (update as any)?.rawJson?.notes || ''
  );
  const notesScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = useCallback(() => {
    const el = notesScrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setCanScrollUp(scrollTop > 4);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 4);
  }, []);

  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(console.error);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStatus('prompt');
      setProgress(0);
      setErrorMsg('');
      setSkipBusy(false);
      setSkipError(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !update?.version) return;
    const initialNotes = update.body || (update as any)?.rawJson?.notes || '';
    if (initialNotes) {
      setReleaseBody(initialNotes);
    }
    const cleanVersion = update.version.replace(/^v/, '');
    const ctrl = new AbortController();
    fetch(`https://api.github.com/repos/CyberGems/CyberPaste/releases/tags/v${cleanVersion}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/vnd.github.v3+json' },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data?.body && typeof data.body === 'string' && data.body.trim()) {
          setReleaseBody(data.body);
        }
      })
      .catch(() => {
        // Fallback to update.body / rawJson is already preserved
      });
    return () => ctrl.abort();
  }, [isOpen, update?.version, update?.body]);

  useEffect(() => {
    const timer = setTimeout(checkScroll, 60);
    return () => clearTimeout(timer);
  }, [releaseBody, checkScroll]);

  const handleScrollUp = () => {
    notesScrollRef.current?.scrollBy({ top: -120, behavior: 'smooth' });
  };

  const handleScrollDown = () => {
    notesScrollRef.current?.scrollBy({ top: 120, behavior: 'smooth' });
  };

  if (!isOpen || !update) return null;

  const handleUpdate = async () => {
    try {
      setStatus('downloading');
      setProgress(0);

      if ((update as any)?.isMock || typeof update.downloadAndInstall !== 'function') {
        for (let pct = 0; pct <= 100; pct += 25) {
          setProgress(pct);
          await new Promise((r) => setTimeout(r, 250));
        }
        await new Promise((r) => setTimeout(r, 500));
        setStatus('prompt');
        onClose();
        return;
      }

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
    openUrl(githubReleaseUrl(update.version)).catch(console.error);
  };

  const handleSkipVersion = async () => {
    if (!update || skipBusy) return;
    setSkipBusy(true);
    setSkipError(false);
    try {
      await onSkipVersion(update.version);
      onClose();
    } catch (err) {
      console.error('Failed to skip update version:', err);
      setSkipError(true);
    } finally {
      setSkipBusy(false);
    }
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-2 backdrop-blur-md duration-300 sm:p-4">
      <div className="animate-in zoom-in-95 relative my-auto flex max-h-[min(580px,calc(100vh-1.5rem))] w-[min(94vw,560px)] max-w-xl flex-col overflow-hidden rounded-xl border border-primary/20 bg-background/95 shadow-2xl shadow-primary/10 duration-300">
        <div className="absolute -left-16 -top-16 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute -bottom-16 -right-16 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl" />

        <div className="relative flex shrink-0 items-center justify-between px-5 pb-2.5 pt-4 sm:px-6">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles size={18} className="animate-pulse" />
            <h3 className="text-base font-bold tracking-wide sm:text-lg">
              {t('settings.updatesTitle')}
            </h3>
          </div>
          {status !== 'downloading' && (
            <Tooltip label={t('common.close')} placement="bottom">
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              >
                <X size={18} />
              </button>
            </Tooltip>
          )}
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          {status === 'prompt' && (
            <>
              <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-2 sm:px-6">
                {/* Version & Notice Banner */}
                <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2">
                  <p className="truncate text-xs font-medium text-foreground/90">
                    {t('settings.updatesNewVersionAvailable')}
                  </p>
                  <div className="flex shrink-0 items-center gap-2 font-mono text-xs">
                    <span className="rounded bg-white/5 px-2 py-0.5 text-muted-foreground">
                      v{currentVersion}
                    </span>
                    <ArrowRight size={12} className="text-muted-foreground/60" />
                    <span className="rounded border border-primary/30 bg-primary/15 px-2 py-0.5 font-bold text-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.15)]">
                      v{update.version}
                    </span>
                  </div>
                </div>

                {/* Changelog & Release Notes Hero Area */}
                <div className="mt-2.5 flex min-h-0 flex-1 flex-col">
                  <div className="mb-1.5 flex shrink-0 items-center justify-between px-0.5 text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground/90">
                      <FileText size={13} className="text-primary" />
                      {t('settings.updatesChangelog')}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleOpenReleasePage}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary/80 transition-colors hover:text-primary hover:underline"
                      >
                        <ExternalLink size={11} />
                        <span>{t('settings.updatesViewOnGithub')}</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <Tooltip label={t('settings.updatesScrollUp')} placement="top">
                          <button
                            type="button"
                            onClick={handleScrollUp}
                            disabled={!canScrollUp}
                            aria-label={t('settings.updatesScrollUp')}
                            className="flex h-6 w-6 items-center justify-center rounded border border-border/70 bg-secondary/50 text-foreground/80 transition-all hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
                          >
                            <ChevronUp size={13} strokeWidth={2.4} />
                          </button>
                        </Tooltip>
                        <Tooltip label={t('settings.updatesScrollDown')} placement="top">
                          <button
                            type="button"
                            onClick={handleScrollDown}
                            disabled={!canScrollDown}
                            aria-label={t('settings.updatesScrollDown')}
                            className="flex h-6 w-6 items-center justify-center rounded border border-border/70 bg-secondary/50 text-foreground/80 transition-all hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
                          >
                            <ChevronDown size={13} strokeWidth={2.4} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </div>

                  <div
                    ref={notesScrollRef}
                    onScroll={checkScroll}
                    className="custom-scrollbar max-h-[300px] min-h-[80px] flex-1 select-text overflow-y-auto rounded-lg border border-border/60 bg-black/25 px-4 py-2.5 text-[12.5px] leading-relaxed text-foreground/85"
                  >
                    {releaseBody ? (
                      <ReleaseNotes body={releaseBody} />
                    ) : (
                      <div className="flex h-full min-h-[100px] items-center justify-center text-xs text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                        <span>{t('common.loading')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-background/95 px-5 py-3 sm:px-6">
                {skipError && (
                  <p className="mr-auto self-center text-xs text-destructive">
                    {t('settings.updatesSkipError')}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleSkipVersion}
                  disabled={skipBusy}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white/5 px-4 py-2 text-sm font-medium text-foreground/85 transition-all hover:bg-accent hover:text-foreground disabled:cursor-wait disabled:opacity-60"
                >
                  {skipBusy && <Loader2 size={14} className="animate-spin" />}
                  {t('settings.updatesSkipVersion')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center rounded-md border border-border bg-white/5 px-4 py-2 text-sm font-medium text-foreground/85 transition-all hover:bg-accent hover:text-foreground"
                >
                  {t('settings.updatesLater')}
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/35"
                >
                  <Download size={16} strokeWidth={2.4} className="text-primary-foreground" />
                  {t('settings.updatesUpdateNow')}
                </button>
              </div>
            </>
          )}

          {status === 'downloading' && (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center space-y-5 px-6 py-8 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="w-full max-w-xs space-y-2.5">
                <p className="text-sm font-semibold text-foreground/90">
                  {progress < 100
                    ? t('settings.updatesDownloading')
                    : t('settings.updatesInstalling')}
                </p>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-muted-foreground">{progress}%</span>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex min-h-0 flex-1 flex-col justify-center space-y-4 px-6 pb-6">
              <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3.5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <h4 className="text-sm font-bold text-destructive">
                    {t('settings.updatesErrorTitle')}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t('settings.updatesErrorDesc')}
                  </p>
                  {errorMsg && (
                    <p className="mt-2 max-h-16 overflow-y-auto break-all rounded bg-destructive/10 p-1.5 font-mono text-[10px] text-destructive">
                      {errorMsg}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Tooltip label={t('common.close')} placement="top">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md border border-input bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
                  >
                    {t('common.close')}
                  </button>
                </Tooltip>
                <Tooltip label={t('settings.updatesOpenReleasePage')} placement="top">
                  <button
                    type="button"
                    onClick={handleOpenReleasePage}
                    className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/20 px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary/30"
                  >
                    <ExternalLink size={14} />
                    {t('settings.updatesOpenReleasePage')}
                  </button>
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function githubReleaseUrl(version: string) {
  const tag = version.startsWith('v') ? version : `v${version}`;
  return `https://github.com/CyberGems/CyberPaste/releases/tag/${tag}`;
}

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="rounded bg-white/10 px-1 py-px font-mono text-[11px] text-foreground/90"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function ReleaseNotes({ body }: { body: string }) {
  const { i18n } = useTranslation();
  const localized = extractLocalizedReleaseNotes(body, i18n.language);
  const lines = localized
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const nodes: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    const items = listItems;
    listItems = [];
    nodes.push(
      <ul
        key={`list-${nodes.length}`}
        className="my-1.5 list-disc space-y-1 pl-4 marker:text-primary/70"
      >
        {items.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  };

  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const quote = line.match(/^>\s*(.*)$/);
    if (heading) {
      flushList();
      nodes.push(
        <h4
          key={`h-${nodes.length}`}
          className="mb-1 mt-2.5 text-[13px] font-semibold text-foreground first:mt-0"
        >
          {renderInline(heading[1])}
        </h4>
      );
    } else if (bullet) {
      listItems.push(bullet[1]);
    } else if (quote) {
      flushList();
      nodes.push(
        <blockquote
          key={`q-${nodes.length}`}
          className="my-1.5 border-l-2 border-primary/50 py-0.5 pl-2.5 text-[12px] italic text-muted-foreground"
        >
          {renderInline(quote[1])}
        </blockquote>
      );
    } else if (!line.trim() || /^---+/.test(line.trim())) {
      flushList();
    } else {
      flushList();
      nodes.push(
        <p key={`p-${nodes.length}`} className="text-[12.5px] leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
  }
  flushList();
  return <div className="space-y-0.5">{nodes}</div>;
}
