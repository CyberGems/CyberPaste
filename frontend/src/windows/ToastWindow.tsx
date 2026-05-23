import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  X,
  Image,
  Type,
  FileText,
  Code,
  FolderOpen,
  Link,
} from 'lucide-react';
import { Settings } from '../types';

interface ToastPayload {
  message: string;
  toast_type: 'success' | 'error' | 'info';
  clip_type?: string | null;
  image_preview?: string | null; // base64 thumbnail
}

function getClipTitle(clipType?: string | null, toastType?: string): string {
  if (!clipType) {
    if (toastType === 'success') return 'Éxito';
    if (toastType === 'error') return 'Error';
    return 'Aviso';
  }
  switch (clipType) {
    case 'welcome':
      return 'CyberPaste listo';
    case 'image':
      return 'Imagen copiada';
    case 'text':
      return 'Texto copiado';
    case 'code':
      return 'Código copiado';
    case 'html':
      return 'HTML copiado';
    case 'rtf':
      return 'Texto enriquecido copiado';
    case 'file':
      return 'Archivo copiado';
    case 'url':
      return 'URL copiada';
    default:
      return 'Copiado';
  }
}

function getClipIcon(clipType?: string | null, toastType?: string) {
  if (!clipType) {
    if (toastType === 'success') return <CheckCircle2 className="h-5 w-5 text-[#00F2FF]" />;
    if (toastType === 'error') return <AlertTriangle className="h-5 w-5 text-[#FF00D0]" />;
    return <Info className="h-5 w-5 text-[#00F2FF]" />;
  }
  const cls = 'h-5 w-5 text-[#00F2FF]';
  switch (clipType) {
    case 'welcome':
      return <CheckCircle2 className={cls} />;
    case 'image':
      return <Image className={cls} />;
    case 'text':
      return <Type className={cls} />;
    case 'code':
      return <Code className={cls} />;
    case 'html':
      return <Code className={cls} />;
    case 'rtf':
      return <FileText className={cls} />;
    case 'file':
      return <FolderOpen className={cls} />;
    case 'url':
      return <Link className={cls} />;
    default:
      return <CheckCircle2 className={cls} />;
  }
}

export function ToastWindow() {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      }
    });

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

    // Notify backend that toast window is ready, and request any pending toast payload
    invoke<ToastPayload | null>('toast_ready', { width: window.innerWidth, height: window.innerHeight })
      .then((pending) => {
        if (pending) {
          handleToastUpdate(pending);
        }
      })
      .catch(console.error);

    return () => {
      unlisten.then((f) => f());
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  if (!toast) return null;

  const hasImagePreview = toast.clip_type === 'image' && toast.image_preview;
  const title = getClipTitle(toast.clip_type, toast.toast_type);
  const icon = getClipIcon(toast.clip_type, toast.toast_type);

  const isMinimal = settings?.toast_style === 'minimal';
  const isDark = settings?.toast_style === 'dark';
  const cyberGradient = 'bg-gradient-to-r from-[#00F2FF] via-[#7A00FF] to-[#FF00D0]';

  const containerClasses = isMinimal
    ? 'bg-zinc-900/95 border border-zinc-700/50 text-white shadow-xl'
    : isDark
      ? 'bg-zinc-950/95 border border-zinc-800 text-white shadow-2xl'
      : 'bg-zinc-900/85 backdrop-blur-xl border border-[#7A00FF]/20 text-white shadow-[0_8px_30px_rgb(0,0,0,0.6),0_0_15px_rgba(0,242,255,0.1)]';

  return (
    <div className="flex h-full w-full items-center" data-tauri-drag-region>
      <div
        className={`relative w-full overflow-hidden rounded-xl transition-all duration-300 ${containerClasses} ${isClosing ? 'translate-y-2 scale-95 opacity-0' : 'translate-y-0 scale-100 opacity-100'}`}
      >
        <div className="flex items-start gap-3 p-3 pb-4">
          {/* Icon or image thumbnail */}
          <div className="mt-0.5 shrink-0">
            {hasImagePreview ? (
              <img
                src={`data:image/png;base64,${toast.image_preview}`}
                alt=""
                className="h-10 w-10 rounded-md border border-white/10 object-cover"
              />
            ) : (
              icon
            )}
          </div>

          <div className="min-w-0 flex-1 pr-5">
            <h4 className="text-sm font-semibold text-zinc-100">{title}</h4>
            {toast.message && (
              <p className="mt-0.5 line-clamp-2 break-words text-sm font-medium leading-snug text-zinc-300">
                {toast.message}
              </p>
            )}
          </div>

          <button
            onClick={closeToast}
            className="absolute right-2.5 top-2.5 rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 h-[3px] w-full bg-white/5">
          <div
            id="toast-progress-bar"
            className={`h-full w-full origin-left ${!isMinimal && !isDark ? cyberGradient : 'bg-zinc-600'}`}
            style={{
              boxShadow: !isMinimal && !isDark ? '0 0 8px rgba(122, 0, 255, 0.8)' : 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}
