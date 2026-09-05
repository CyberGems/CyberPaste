import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import { Pin, X } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import type { Settings } from '../types';

type TaskbarEdge = 'bottom' | 'top' | 'left' | 'right';

const CARD_WIDTH = 340;
const SHADOW_PAD = 20;
const TAIL = 10;

function parseEdge(value: string | undefined): TaskbarEdge {
  if (value === 'top' || value === 'left' || value === 'right' || value === 'bottom') {
    return value;
  }
  return 'bottom';
}

export function TrayPinTipWindow() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [edge, setEdge] = useState<TaskbarEdge>('bottom');
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const dontShowAgainRef = useRef(true);
  const closingRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useTheme(settings?.theme ?? 'cyberpaste');
  useLanguage(settings?.language);

  useEffect(() => {
    dontShowAgainRef.current = dontShowAgain;
  }, [dontShowAgain]);

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

    invoke<Settings>('get_settings')
      .then(setSettings)
      .catch(console.error);
    invoke<string>('get_tray_pin_tip_edge')
      .then((value) => setEdge(parseEdge(value)))
      .catch(console.error);
  }, []);

  const reportSize = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    if (width <= 0 || height <= 0) return;
    invoke('tray_pin_tip_ready', { width, height }).catch(console.error);
  }, []);

  const dismiss = useCallback((markSeen: boolean) => {
    if (closingRef.current) return;
    closingRef.current = true;
    invoke('dismiss_tray_pin_tip', { markSeen: markSeen && dontShowAgainRef.current }).catch(
      console.error
    );
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(reportSize);
    return () => cancelAnimationFrame(id);
  }, [edge, reportSize, settings, t]);

  useEffect(() => {
    const unlistenShow = listen<{ edge: string }>('tray-pin-tip-show', (event) => {
      setEdge(parseEdge(event.payload?.edge));
    });
    const unlistenSettings = listen<Settings>('settings-changed', (event) => {
      setSettings(event.payload);
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss(true);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      unlistenShow.then((f) => f());
      unlistenSettings.then((f) => f());
      window.removeEventListener('keydown', onKey);
    };
  }, [dismiss]);

  const openSettings = () => {
    invoke('open_tray_icon_settings').catch(console.error);
    dismiss(true);
  };

  const isRow = edge === 'left' || edge === 'right';
  const tailFirst = edge === 'top' || edge === 'left';

  return (
    <div
      ref={rootRef}
      className="inline-block bg-transparent"
      style={{ padding: SHADOW_PAD }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className={`flex items-center ${isRow ? 'flex-row' : 'flex-col'}`}
        style={{ width: isRow ? CARD_WIDTH + TAIL : CARD_WIDTH }}
      >
        {tailFirst ? <TipTail edge={edge} /> : null}
        <div
          className="rounded-xl border border-border bg-card p-4"
          style={{
            width: CARD_WIDTH,
            boxShadow:
              '0 6px 20px rgba(0,0,0,0.42), 0 1px 4px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Pin size={18} strokeWidth={2} className="shrink-0 text-foreground" />
              <h1 className="text-[14px] font-semibold leading-snug text-foreground">
                {t('trayPinTip.title')}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => dismiss(true)}
              title={t('trayPinTip.dismiss')}
              aria-label={t('trayPinTip.dismiss')}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>
          <p className="mt-2.5 text-[12.5px] leading-[18px] text-muted-foreground">
            {t('trayPinTip.body')}
          </p>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12px] text-muted-foreground">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="accent-primary"
            />
            {t('trayPinTip.dontShowAgain')}
          </label>
          <div className="mt-3.5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dismiss(true)}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-accent"
            >
              {t('trayPinTip.gotIt')}
            </button>
            <button
              type="button"
              onClick={openSettings}
              className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t('trayPinTip.openWindowsSettings')}
            </button>
          </div>
        </div>
        {!tailFirst ? <TipTail edge={edge} /> : null}
      </div>
    </div>
  );
}

function TipTail({ edge }: { edge: TaskbarEdge }) {
  const points =
    edge === 'top'
      ? '0,10 9,0 18,10'
      : edge === 'left'
        ? '10,0 0,9 10,18'
        : edge === 'right'
          ? '0,0 10,9 0,18'
          : '0,0 9,10 18,0';
  const size =
    edge === 'left' || edge === 'right'
      ? { width: TAIL, height: 18 }
      : { width: 18, height: TAIL };
  return (
    <svg
      width={size.width}
      height={size.height}
      viewBox={edge === 'left' || edge === 'right' ? '0 0 10 18' : '0 0 18 10'}
      className="shrink-0 text-card"
      aria-hidden
    >
      <polygon points={points} fill="currentColor" />
    </svg>
  );
}
