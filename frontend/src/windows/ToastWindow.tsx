import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getVersion } from '@tauri-apps/api/app';
import { useLanguage } from '../hooks/useLanguage';
import Tooltip from '../components/Tooltip';


function getWelcomeTitle(version: string, lang?: string): string {
  const vStr = version ? ` v${version}` : '';
  if (lang === 'es') {
    return `CyberPaste${vStr} está listo`;
  }
  return `CyberPaste${vStr} is ready`;
}

import {
  X,
  Image as ImageIcon,
  Type as TypeIcon,
  Code as CodeIcon,
  FileText as FileTextIcon,
  FolderOpen as FolderOpenIcon,
  Link as LinkIcon,
  Scissors as ScissorsIcon,
  CheckCircle2 as CheckIcon,
  CopyCheck as DuplicateIcon,
  Settings as SettingsIcon,
  AlertTriangle as AlertIcon,
  Info as InfoIcon,
} from 'lucide-react';
import { Settings } from '../types';

interface ToastPayload {
  message: string;
  toast_type: 'success' | 'error' | 'info' | 'duplicate' | 'cut';
  clip_type?: string | null;
  image_preview?: string | null; // base64 thumbnail
  clip_uuid?: string | null;
  source_app?: string | null;
  source_icon?: string | null;
}

function getClipTitle(clipType: string | null | undefined, toastType: string | undefined, t: any): string {
  if (!clipType) {
    if (toastType === 'duplicate') return t('toasts.titles.duplicate');
    if (toastType === 'success') return t('toasts.titles.success');
    if (toastType === 'error') return t('toasts.titles.error');
    if (toastType === 'cut') return t('toasts.titles.cut');
    return t('toasts.titles.info');
  }
  if (toastType === 'duplicate') {
    switch (clipType) {
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

function getHeaderClipIcon(
  clipType: string | null | undefined,
  toastType: string | undefined,
  color: string
): React.ReactNode {
  const cls = 'h-3.5 w-3.5';
  const pink = '#FF00D0';

  if (toastType === 'duplicate') {
    return <DuplicateIcon className={cls} style={{ color: '#F6C453' }} />;
  }
  if (toastType === 'cut') {
    return <ScissorsIcon className={cls} style={{ color: pink }} />;
  }
  if (!clipType) {
    if (toastType === 'success') return <CheckIcon className={cls} style={{ color }} />;
    if (toastType === 'error') return <AlertIcon className={cls} style={{ color: pink }} />;
    return <InfoIcon className={cls} style={{ color }} />;
  }
  switch (clipType) {
    case 'welcome':
      return <CheckIcon className={cls} style={{ color }} />;
    case 'image':
      return <ImageIcon className={cls} style={{ color }} />;
    case 'text':
      return <TypeIcon className={cls} style={{ color }} />;
    case 'code':
    case 'html':
      return <CodeIcon className={cls} style={{ color }} />;
    case 'rtf':
      return <FileTextIcon className={cls} style={{ color }} />;
    case 'file':
      return <FolderOpenIcon className={cls} style={{ color }} />;
    case 'url':
      return <LinkIcon className={cls} style={{ color }} />;
    default:
      return <CheckIcon className={cls} style={{ color }} />;
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
  headerBorder: string;
  headerText: string;
  sourceAppText: string;
  imageBorder: string;
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
      progressColor: 'linear-gradient(90deg, #0078D7, #00A8FF, #7A00FF)',
      iconColor: '#0078D7',
      previewBg: 'bg-neutral-100/80',
      previewBorder: 'border-neutral-200',
      headerBorder: 'border-black/5',
      headerText: 'text-neutral-500',
      sourceAppText: 'text-neutral-800',
      imageBorder: 'border-black/10',
    };
  }
  if (theme === 'dark') {
    return {
      container:
        'bg-[#16181B]/95 border border-white/10 text-neutral-100 shadow-[0_3px_18px_rgba(0,0,0,0.4)]',
      title: 'text-neutral-100',
      body: 'text-neutral-300',
      closeBtn: 'text-neutral-500 hover:bg-white/10 hover:text-white',
      track: 'bg-white/5',
      progressColor: '#B8BEC6',
      iconColor: '#B8BEC6',
      previewBg: 'bg-black/35',
      previewBorder: 'border-white/5',
      headerBorder: 'border-white/5',
      headerText: 'text-neutral-400',
      sourceAppText: 'text-neutral-200',
      imageBorder: 'border-white/10',
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
    headerBorder: 'border-white/5',
    headerText: 'text-neutral-400',
    sourceAppText: 'text-neutral-200',
    imageBorder: 'border-white/10',
  };
}

export function ToastWindow() {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [version, setVersion] = useState<string>('');
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { t } = useLanguage(settings?.language);

  const closeToast = () => {
    setIsClosing(true);
    setTimeout(() => {
      invoke('hide_toast').catch(console.error);
    }, 300);
  };

  const openNotificationSettings = () => {
    invoke('open_settings', { tab: 'notifications' }).catch(console.error);
    closeToast();
  };

  const handleToastUpdate = async (payload: ToastPayload) => {
    const freshSettings = await invoke<Settings>('get_settings').catch(() => null);
    if (freshSettings) setSettings(freshSettings);

    const isWelcome = payload.clip_type === 'welcome';
    const width = isWelcome ? 340 : 300;
    const height = isWelcome ? 80 : 110;
    await invoke('set_toast_position', { width, height }).catch(console.error);

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

    getVersion().then(setVersion).catch(console.error);
    invoke<Settings>('get_settings').then(setSettings).catch(console.error);

    const unlisten = listen<ToastPayload>('update-toast', (event) => {
      handleToastUpdate(event.payload);
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
  const isWelcome = toast.clip_type === 'welcome';
  const title = getClipTitle(toast.clip_type, toast.toast_type, t);
  const themeId = resolveToastTheme(settings);
  // Cyan-leaning half of the CyberGems ramp: keeps the suite palette while staying
  // distinguishable from CyberSnap's toast, which owns the purple->magenta half.
  const gradient =
    toast.toast_type === 'duplicate'
      ? 'linear-gradient(90deg, #F6C453, #FF9F43, #00C2C7)'
      : 'linear-gradient(90deg, #00F2FF, #00A8FF, #7A00FF)';
  const tv = toastThemeVars(themeId, gradient);

  const containerClasses = tv.container;

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
    <Tooltip label={getTooltip()} disabled={!isClickable} placement="top">
      <div
        onClick={handleToastClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`flex h-full w-full items-center ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
        data-tauri-drag-region
      >
      <div
        className={`relative w-full overflow-hidden rounded-xl transition-all duration-300 ${containerClasses} ${isClosing ? 'translate-y-2 scale-95 opacity-0' : 'translate-y-0 scale-100 opacity-100'}`}
      >
        {isWelcome ? (
          <div className="flex items-center px-3.5 py-2.5 h-full w-full select-none">
            {/* CyberSnap-like layout with the app logo on the left */}
            <div className="shrink-0 flex items-center justify-center w-11 h-11 rounded-lg bg-white/5 border border-white/10 p-1 mr-3">
              <img src="/logo.png" alt="CyberPaste Logo" className="w-8 h-8 object-contain" />
            </div>

            <div className="flex flex-col flex-1 min-w-0 pr-6 justify-center">
              <h4
                className={`text-[12.75px] font-semibold leading-tight truncate ${tv.title}`}
                style={{ fontFamily: "'Segoe UI Variable Text', -apple-system, sans-serif" }}
              >
                {getWelcomeTitle(version, settings?.language)}
              </h4>
              <p
                className={`text-[11.5px] font-normal leading-normal mt-0.5 ${tv.body}`}
                style={{
                  fontFamily: "'Segoe UI Variable Text', -apple-system, sans-serif",
                  opacity: 0.72
                }}
              >
                {toast.message}
              </p>
            </div>

            <div className="absolute right-2 top-2 flex items-center gap-0.5">
              <Tooltip label={t('toasts.configureNotifications')} placement="bottom">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openNotificationSettings();
                  }}
                  className={`flex h-5 w-5 items-center justify-center rounded-md p-0 transition-colors ${tv.closeBtn}`}
                  aria-label={t('toasts.configureNotifications')}
                >
                  <SettingsIcon className="h-3 w-3" />
                </button>
              </Tooltip>
              <Tooltip label={t('toasts.tooltipClose')} placement="bottom">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeToast();
                  }}
                  className={`flex h-5 w-5 items-center justify-center rounded-md p-0 transition-colors ${tv.closeBtn}`}
                  aria-label={t('toasts.tooltipClose')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>
        ) : (
          <div className="flex flex-col p-2.5 pb-3">
            {/* Header Row: Source Program info or general Title */}
            {toast.source_app ? (
              <div className={`flex min-w-0 items-center gap-1.5 border-b pb-1.5 mb-2 text-xs font-semibold pr-12 ${tv.headerBorder} ${tv.headerText}`}>
                <div className="shrink-0 flex items-center">
                  {getHeaderClipIcon(toast.clip_type, toast.toast_type, tv.iconColor)}
                </div>
                <span className="truncate font-medium text-[11px]">{title}</span>
                <span className="text-[10px] font-normal text-neutral-500 lowercase px-0.5 shrink-0">{t('toasts.fromApp')}</span>
                {toast.source_icon ? (
                  <img
                    src={`data:image/png;base64,${toast.source_icon}`}
                    alt=""
                    className="w-3.5 h-3.5 object-contain rounded-sm shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : null}
                <span className={`min-w-0 max-w-[110px] truncate text-[11px] ${tv.sourceAppText}`}>{toast.source_app}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mb-2 pr-12">
                <div className="shrink-0 flex items-center">
                  {getHeaderClipIcon(toast.clip_type, toast.toast_type, tv.iconColor)}
                </div>
                <h4 className={`text-sm font-semibold truncate ${tv.title}`}>{title}</h4>
              </div>
            )}

            {/* Content Row: Preview & Details */}
            {toast.toast_type === 'duplicate' && (
              <p className={`mb-1.5 text-[11px] font-medium ${themeId === 'light' ? 'text-amber-700' : 'text-amber-300'}`}>
                {t('toasts.duplicateStatus')}
              </p>
            )}
            {hasImagePreview ? (
              <div className="flex justify-center w-full">
                <img
                  src={`data:image/png;base64,${toast.image_preview}`}
                  alt=""
                  className={`max-h-12 max-w-[180px] rounded-md border object-contain shadow-md transition-transform duration-200 hover:scale-105 ${tv.imageBorder}`}
                />
              </div>
            ) : (
              <div className="min-w-0 w-full">
                {toast.source_app ? (
                  // When we have a source app, the message is the actual copied content.
                  // We style it as a preview card to separate it clearly from the header info.
                  toast.message && (
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
            )}

            <div className="absolute right-2.5 top-2.5 flex items-center gap-0.5">
              <Tooltip label={t('toasts.configureNotifications')} placement="bottom">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openNotificationSettings();
                  }}
                  className={`flex h-5 w-5 items-center justify-center rounded-md p-0 transition-colors ${tv.closeBtn}`}
                  aria-label={t('toasts.configureNotifications')}
                >
                  <SettingsIcon className="h-3 w-3" />
                </button>
              </Tooltip>
              <Tooltip label={t('toasts.tooltipClose')} placement="bottom">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeToast();
                  }}
                  className={`flex h-5 w-5 items-center justify-center rounded-md p-0 transition-colors ${tv.closeBtn}`}
                  aria-label={t('toasts.tooltipClose')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div
          className={`absolute ${isTopEdge ? 'top-0' : 'bottom-0'} left-0 h-[3px] w-full ${tv.track}`}
        >
          <div
            id="toast-progress-bar"
            className={`h-full w-full ${originClass}`}
            style={{
              background: tv.progressColor,
            }}
          />
        </div>
      </div>
    </div>
    </Tooltip>
  );
}
