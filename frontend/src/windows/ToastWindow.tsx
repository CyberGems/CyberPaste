import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useLanguage } from '../hooks/useLanguage';
import { getClipIcon } from './toastIcons';
import { X } from 'lucide-react';
import { Settings } from '../types';

interface ToastPayload {
  message: string;
  toast_type: 'success' | 'error' | 'info';
  clip_type?: string | null;
  image_preview?: string | null; // base64 thumbnail
  clip_uuid?: string | null;
  source_app?: string | null;
  source_icon?: string | null;
}

function getClipTitle(clipType: string | null | undefined, toastType: string | undefined, t: any): string {
  if (!clipType) {
    if (toastType === 'success') return t('toasts.titles.success');
    if (toastType === 'error') return t('toasts.titles.error');
    if (toastType === 'cut') return t('toasts.titles.cut');
    return t('toasts.titles.info');
  }
  if (toastType === 'cut') {
    switch (clipType) {
      case 'welcome':
        return t('toasts.titles.welcome');
      case 'image':
        return t('toasts.titles.image_cut');
      case 'text':
        return t('toasts.titles.text_cut');
      case 'code':
        return t('toasts.titles.code_cut');
      case 'html':
        return t('toasts.titles.html_cut');
      case 'rtf':
        return t('toasts.titles.rtf_cut');
      case 'file':
        return t('toasts.titles.file_cut');
      case 'url':
        return t('toasts.titles.url_cut');
      default:
        return t('toasts.titles.fallback_cut');
    }
  }
  switch (clipType) {
    case 'welcome':
      return t('toasts.titles.welcome');
    case 'image':
      return t('toasts.titles.image_copied');
    case 'text':
      return t('toasts.titles.text_copied');
    case 'code':
      return t('toasts.titles.code_copied');
    case 'html':
      return t('toasts.titles.html_copied');
    case 'rtf':
      return t('toasts.titles.rtf_copied');
    case 'file':
      return t('toasts.titles.file_copied');
    case 'url':
      return t('toasts.titles.url_copied');
    default:
      return t('toasts.titles.fallback_copied');
  }
}

function resolveToastTheme(settings: Settings | null): 'cyberpaste' | 'dark' | 'light' {
  const t = settings?.theme || 'cyberpaste';
  if (t === 'dark' || t === 'light') return t;
  // system follows OS; cyberpaste is the signature (dark) look.
  if (t === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'cyberpaste' : 'light';
  }
  return 'cyberpaste';
}

interface ToastThemeVars {
  container: string;
  title: string;
  body: string;
  closeBtn: string;
  track: string;
  progressColor: string; // CSS color (hex/gradient), used via style for the gradient
  iconColor: string;
  previewBg: string;
  previewBorder: string;
}

function toastThemeVars(theme: 'cyberpaste' | 'dark' | 'light', gradient: string): ToastThemeVars {
  if (theme === 'light') {
    return {
      container:
        'bg-white/95 border border-black/10 text-neutral-900 shadow-[0_3px_18px_rgba(0,0,0,0.18)]',
      title: 'text-neutral-900',
      body: 'text-neutral-700',
      closeBtn: 'text-neutral-400 hover:bg-black/10 hover:text-neutral-700',
      track: 'bg-black/10',
      progressColor: gradient,
      iconColor: '#0078D7',
      previewBg: 'bg-neutral-100/80',
      previewBorder: 'border-neutral-200',
    };
  }
  if (theme === 'dark') {
    return {
      container:
        'bg-[#0D0F17]/90 border border-[#00FFFF33] text-neutral-100 shadow-[0_3px_18px_rgba(0,0,0,0.4)]',
      title: 'text-neutral-100',
      body: 'text-neutral-300',
      closeBtn: 'text-neutral-500 hover:bg-white/10 hover:text-white',
      track: 'bg-white/5',
      progressColor: gradient,
      iconColor: '#00F2FF',
      previewBg: 'bg-black/35',
      previewBorder: 'border-white/5',
    };
  }
  // cyberpaste — current signature look
  return {
    container:
      'bg-[#1A1B1F]/95 border border-[rgba(0,200,215,0.627)] text-white shadow-[0_3px_18px_rgba(0,0,0,0.32)]',
    title: 'text-white',
    body: 'text-neutral-300',
    closeBtn: 'text-neutral-500 hover:bg-white/10 hover:text-white',
    track: 'bg-white/5',
    progressColor: gradient,
    iconColor: '#00F2FF',
    previewBg: 'bg-black/35',
    previewBorder: 'border-white/5',
  };
}

export function ToastWindow() {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { t } = useLanguage(settings?.language);

  const closeToast = () => {
    setIsClosing(true);
    setTimeout(() => {
      invoke('hide_toast').catch(console.error);
    }, 300);
  };

  const handleToastUpdate = async (payload: ToastPayload) => {
    const freshSettings = await invoke<Settings>('get_settings').catch(() => null);
    if (freshSettings) setSettings(freshSettings);

    setToast(payload);
    setIsClosing(false);

    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    const duration = freshSettings?.toast_duration || settings?.toast_duration || 3000;

    requestAnimationFrame(() => {
      const bar = document.getElementById('toast-progress-bar');
      if (bar) {
        bar.style.animation = 'none';
        void bar.offsetWidth;
        bar.style.animation = `toast-shrink ${duration}ms linear forwards`;
        bar.style.transition = 'none';
        bar.style.transform = '';
      }
    });

    hideTimeoutRef.current = setTimeout(() => {
      closeToast();
    }, duration);
  };

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    const bar = document.getElementById('toast-progress-bar');
    if (bar) {
      const duration = settings?.toast_duration || 3000;
      const refillDuration = duration / 3;
      bar.style.animation = 'none';
      bar.style.transition = `transform ${refillDuration}ms linear`;
      bar.style.transform = 'scaleX(1)';
    }
  };

  const handleMouseLeave = () => {
    const duration = settings?.toast_duration || 3000;
    const bar = document.getElementById('toast-progress-bar');
    if (bar) {
      bar.style.transition = 'none';
      bar.style.transform = '';
      bar.style.animation = 'none';
      void bar.offsetWidth;
      bar.style.animation = `toast-shrink ${duration}ms linear forwards`;
    }

    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      closeToast();
    }, duration);
  };

  useEffect(() => {
    document.documentElement.classList.add('toast-window');

    invoke<Settings>('get_settings').then(setSettings).catch(console.error);

    const unlisten = listen<ToastPayload>('update-toast', (event) => {
      handleToastUpdate(event.payload);
      // Reposition on subsequent events
      invoke('set_toast_position', { width: window.innerWidth, height: window.innerHeight }).catch(
        console.error
      );
    });

    // Re-theme the toast live when settings change from another window
    const unlistenSettings = listen<Settings>('settings-changed', (event) => {
      setSettings(event.payload);
    });

    // Re-evaluate "system" theme live when the OS dark/light preference flips
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onOsTheme = () => setSettings((s) => (s ? { ...s } : s));
    media.addEventListener('change', onOsTheme);

    // Notify backend that toast window is ready, and request any pending toast payload
    invoke<ToastPayload | null>('toast_ready', {
      width: window.innerWidth,
      height: window.innerHeight,
    })
      .then((pending) => {
        if (pending) {
          handleToastUpdate(pending);
        }
      })
      .catch(console.error);

    return () => {
      unlisten.then((f) => f());
      unlistenSettings.then((f) => f());
      media.removeEventListener('change', onOsTheme);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  if (!toast) return null;

  const hasImagePreview = toast.clip_type === 'image' && toast.image_preview;
  const title = getClipTitle(toast.clip_type, toast.toast_type, t);
  const isMinimal = settings?.toast_style === 'minimal';
  const themeId = resolveToastTheme(settings);
  // Cyan-leaning half of the CyberGems ramp: keeps the suite palette while staying
  // distinguishable from CyberSnap's toast, which owns the purple->magenta half.
  const gradient = 'linear-gradient(90deg, #00F2FF, #00A8FF, #7A00FF)';
  const tv = toastThemeVars(themeId, gradient);

  const containerClasses = isMinimal
    ? 'bg-zinc-900/95 border border-zinc-700/50 text-white shadow-xl'
    : tv.container;

  const icon = getClipIcon(toast.clip_type, toast.toast_type, isMinimal ? '#A1A1AA' : tv.iconColor);

  const clickAction = settings?.toast_click_action || 'close';
  const isClickable = clickAction !== 'none';

  const handleToastClick = () => {
    if (clickAction === 'none') {
      return;
    }
    if (clickAction === 'close') {
      closeToast();
      return;
    }
    if (clickAction === 'open' && toast && toast.clip_uuid) {
      invoke('click_toast', { clipUuid: toast.clip_uuid }).catch(console.error);
    }
  };

  const getTooltip = () => {
    if (clickAction === 'none') {
      return t('toasts.tooltipNone');
    }
    if (clickAction === 'close') {
      return t('toasts.tooltipClose');
    }
    return t('toasts.tooltipOpen');
  };

  const isTopEdge = settings?.toast_position?.startsWith('top-') ?? false;
  const isCentered =
    settings?.toast_position === 'top-center' || settings?.toast_position === 'bottom-center';
  const originClass = isCentered ? 'origin-center' : 'origin-left';

  return (
    <div
      onClick={handleToastClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`flex h-full w-full items-center ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
      title={getTooltip()}
      data-tauri-drag-region
    >
      <div
        className={`relative w-full overflow-hidden rounded-xl transition-all duration-300 ${containerClasses} ${isClosing ? 'translate-y-2 scale-95 opacity-0' : 'translate-y-0 scale-100 opacity-100'}`}
      >
        <div className="flex flex-col p-3 pb-3.5">
          {/* Header Row: Source Program info or general Title */}
          {toast.source_app ? (
            <div className={`flex items-center gap-1.5 border-b pb-1.5 mb-2.5 text-xs font-semibold pr-7 ${isMinimal ? 'border-zinc-800 text-zinc-400' : 'border-white/5 text-neutral-400'}`}>
              {toast.source_icon ? (
                <img
                  src={`data:image/png;base64,${toast.source_icon}`}
                  alt=""
                  className="w-3.5 h-3.5 object-contain rounded-sm"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : null}
              <span className={`truncate max-w-[140px] ${isMinimal ? 'text-zinc-200' : 'text-neutral-200'}`}>{toast.source_app}</span>
              <span>•</span>
              <span className="truncate font-medium">{title}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-2 pr-7">
              <h4 className={`text-sm font-semibold truncate ${tv.title}`}>{title}</h4>
            </div>
          )}

          {/* Content Row: Preview & Details */}
          <div className="flex items-start gap-3">
            {/* Icon or image thumbnail */}
            <div className="mt-0.5 shrink-0">
              {hasImagePreview ? (
                <img
                  src={`data:image/png;base64,${toast.image_preview}`}
                  alt=""
                  className="h-12 w-12 rounded-md border border-white/10 object-cover shadow-sm"
                />
              ) : (
                icon
              )}
            </div>

            <div className="min-w-0 flex-1">
              {toast.source_app ? (
                // When we have a source app, the message is the actual copied content.
                // We style it as a preview card to separate it clearly from the header info.
                toast.clip_type !== 'image' && toast.message && (
                  <div className={`rounded-lg border px-2.5 py-1.5 text-xs line-clamp-2 break-all font-mono whitespace-pre-wrap ${tv.previewBg} ${tv.previewBorder} ${tv.body}`}>
                    {toast.message}
                  </div>
                )
              ) : (
                // When there is no source app, just render the message normally (e.g. system notification)
                toast.message && (
                  <p
                    className={`mt-0.5 line-clamp-2 break-words text-sm font-medium leading-snug ${tv.body}`}
                  >
                    {toast.message}
                  </p>
                )
              )}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              closeToast();
            }}
            className={`absolute right-2.5 top-2.5 rounded-md p-1 transition-colors ${tv.closeBtn}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div
          className={`absolute ${isTopEdge ? 'top-0' : 'bottom-0'} left-0 h-[3px] w-full ${tv.track}`}
        >
          <div
            id="toast-progress-bar"
            className={`h-full w-full ${originClass}`}
            style={{
              background: isMinimal ? '#52525B' : tv.progressColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}
