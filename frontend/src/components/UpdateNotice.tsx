import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, RotateCw, Sparkles, X } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { clsx } from 'clsx';
import Tooltip from './Tooltip';
import { peekReleaseNotes } from '../utils/releaseNotes';
import type { UpdatePhase, UpdateStatus } from '../utils/updater';

interface UpdateNoticeProps {
  status: UpdateStatus;
  visible: boolean;
  compact: boolean;
  preview: boolean;
  onDismiss: (version: string, phase: UpdatePhase) => Promise<void>;
  onSkip: (version: string) => Promise<void>;
  onDownload: (version: string) => Promise<void>;
  onCancel: (version: string) => Promise<void>;
  onInstall: (version: string) => Promise<void>;
}

const buttonClass =
  'min-h-8 rounded-md border border-border px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-50';
const primaryClass = clsx(
  buttonClass,
  'border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90'
);

export function UpdateNotice({
  status,
  visible,
  compact,
  preview,
  onDismiss,
  onSkip,
  onDownload,
  onCancel,
  onInstall,
}: UpdateNoticeProps) {
  const { t, i18n } = useTranslation();
  const { state, version, releaseNotes, transferred, total, cancelling, failed, openRequest } =
    status;
  const tag = version.startsWith('v') ? version : 'v' + version;
  const [fetched, setFetched] = useState<{ version: string; notes: string } | null>(null);
  const [error, setError] = useState<{ state: UpdatePhase; key: string } | null>(null);
  const [acting, setActing] = useState(false);
  const actionActive = useRef(false);
  const notice = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const focusedRequest = useRef(0);

  useEffect(() => {
    if (preview || /<details\b|<!--\s*lang:es\s*-->/i.test(releaseNotes ?? '')) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 10_000);
    void fetch(
      'https://api.github.com/repos/CyberGems/CyberPaste/releases/tags/' + encodeURIComponent(tag),
      {
        signal: controller.signal,
        headers: { Accept: 'application/vnd.github+json' },
      }
    )
      .then(async (response) => {
        if (!response.ok) return '';
        const data = await response.json();
        return typeof data?.body === 'string' ? data.body.trim() : '';
      })
      .catch((cause) => {
        if (active && !controller.signal.aborted)
          console.warn('Could not load release notes:', cause);
        return '';
      })
      .then((notes) => {
        if (active) setFetched({ version, notes });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [version, tag, preview, releaseNotes]);

  useEffect(() => {
    if (!visible || openRequest === focusedRequest.current) return;
    focusedRequest.current = openRequest;
    if (
      document.activeElement instanceof HTMLElement &&
      !notice.current?.contains(document.activeElement)
    ) {
      opener.current = document.activeElement;
    }
    notice.current?.focus({ preventScroll: true });
  }, [openRequest, visible]);

  const notes = useMemo(
    () =>
      peekReleaseNotes(
        (fetched?.version === version && fetched.notes) || releaseNotes || '',
        i18n.resolvedLanguage ?? i18n.language
      ),
    [fetched, version, releaseNotes, i18n.resolvedLanguage, i18n.language]
  );

  if (!visible) return null;
  const available = state === 'available';
  const downloading = state === 'downloading';
  const installing = state === 'installing';
  const title = {
    available: t('settings.updatesAvailableTitle'),
    downloading: cancelling ? t('settings.updatesCancelling') : t('settings.updatesDownloading'),
    downloaded: t('settings.updatesReady'),
    installing: t('settings.updatesInstalling'),
  }[state];
  const closeLabel = downloading ? t('settings.updatesBackground') : t('settings.updatesLater');
  const feedback =
    error?.state === state
      ? t(error.key)
      : failed
        ? available
          ? t('settings.updatesErrorTitle')
          : t('settings.updatesInstallError')
        : '';
  const format = new Intl.NumberFormat(i18n.language, {
    style: 'unit',
    unit: 'megabyte',
    maximumFractionDigits: 1,
  });
  const size = (bytes: number) => format.format(bytes / 1_000_000);
  const progress = total && total > 0 ? Math.min(100, (transferred / total) * 100) : undefined;

  const runAction = async (action: () => Promise<void>, errorKey: string) => {
    if (actionActive.current) return;
    actionActive.current = true;
    setActing(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      console.error('Update action failed:', cause);
      setError({ state, key: errorKey });
    } finally {
      actionActive.current = false;
      setActing(false);
    }
  };

  const dismiss = () => {
    if (installing) return;
    void runAction(async () => {
      await onDismiss(version, state);
      opener.current?.focus({ preventScroll: true });
      opener.current = null;
    }, 'settings.updatesActionError');
  };

  return (
    <section
      ref={notice}
      data-el="update-notice"
      role="dialog"
      aria-labelledby="update-notice-title update-notice-version"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (
          (event.ctrlKey || event.metaKey) &&
          !event.shiftKey &&
          !event.altKey &&
          event.key.toLowerCase() === 'm'
        )
          return;
        // Let native button activation work without sending the same key to the clipboard shortcuts.
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          dismiss();
        }
      }}
      className={clsx(
        'custom-scrollbar fixed z-[100] flex max-h-[calc(100%-1.5rem)] w-[min(29rem,calc(100%-1.5rem))] flex-col gap-2.5 overflow-y-auto rounded-lg border border-primary/30 bg-card p-3 text-foreground shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        compact ? 'bottom-3 right-3' : 'bottom-5 right-5'
      )}
    >
      <header className="flex items-center gap-2.5">
        <div
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"
        >
          {downloading ? (
            <Download size={16} />
          ) : installing ? (
            <RotateCw size={16} />
          ) : (
            <Sparkles size={16} />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 id="update-notice-title" className="text-sm font-bold">
            {title}
          </h2>
          <span
            id="update-notice-version"
            className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary"
          >
            {tag}
          </span>
        </div>
        <Tooltip label={closeLabel} placement="left">
          <button
            type="button"
            aria-label={closeLabel}
            onClick={dismiss}
            disabled={installing || acting}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </Tooltip>
      </header>

      <section className="rounded-md border border-border bg-background px-2.5 py-2">
        <h3 className="text-xs font-semibold">{t('settings.updatesChangelog')}</h3>
        {notes.length ? (
          <ul
            className={clsx(
              'custom-scrollbar mt-1 list-disc space-y-0.5 overflow-y-auto pl-4 text-xs text-muted-foreground marker:text-primary',
              compact ? 'max-h-12' : 'max-h-28'
            )}
          >
            {notes.map((note, index) => (
              <li key={index} className="break-words">
                {note}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            {t('settings.updatesNotesUnavailable')}
          </p>
        )}
      </section>

      {downloading && (
        <div className="space-y-1">
          <div className="flex flex-wrap justify-between gap-x-2 text-xs text-muted-foreground">
            <span id="update-progress-label">{t('settings.updatesProgress')}</span>
            <span className="font-mono">
              {size(transferred)}
              {total ? ' / ' + size(total) : ''}
            </span>
          </div>
          <progress
            max={100}
            value={progress}
            aria-labelledby="update-progress-label"
            className={clsx(
              'block h-2 w-full appearance-none overflow-hidden rounded-full [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary',
              progress === undefined
                ? 'motion-safe:animate-pulse [&::-webkit-progress-bar]:bg-primary/30'
                : '[&::-webkit-progress-bar]:bg-muted'
            )}
          />
        </div>
      )}
      {feedback && (
        <p role="alert" className="text-xs text-destructive">
          {feedback}
        </p>
      )}

      <footer className="flex flex-wrap justify-end gap-1.5">
        {available && (
          <>
            <button
              type="button"
              className={buttonClass}
              disabled={acting}
              onClick={() =>
                void runAction(
                  () => openUrl('https://github.com/CyberGems/CyberPaste/releases/tag/' + tag),
                  'settings.updatesActionError'
                )
              }
            >
              {t('settings.updatesViewOnGithub')}
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={acting}
              onClick={() => void runAction(() => onSkip(version), 'settings.updatesSkipError')}
            >
              {t('settings.updatesSkipVersion')}
            </button>
          </>
        )}
        <button
          type="button"
          className={buttonClass}
          onClick={dismiss}
          disabled={installing || acting}
        >
          {closeLabel}
        </button>
        {available ? (
          <button
            type="button"
            className={primaryClass}
            disabled={acting}
            onClick={() => void runAction(() => onDownload(version), 'settings.updatesErrorTitle')}
          >
            {t('settings.updatesUpdateNow')}
          </button>
        ) : downloading ? (
          <button
            type="button"
            className={buttonClass}
            disabled={acting || cancelling}
            onClick={() => void runAction(() => onCancel(version), 'settings.updatesActionError')}
          >
            {t('settings.updatesCancel')}
          </button>
        ) : (
          <button
            type="button"
            className={primaryClass}
            disabled={installing || acting}
            onClick={() => void runAction(() => onInstall(version), 'settings.updatesInstallError')}
          >
            {t('settings.updatesRestart')}
          </button>
        )}
      </footer>
    </section>
  );
}
