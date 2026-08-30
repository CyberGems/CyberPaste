import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import {
  X,
  ExternalLink,
  Copy,
  Maximize,
  Minimize2,
  Minus,
  ScanText,
  Loader2,
  Check,
  Scan,
  Expand,
  Pin,
  PinOff,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  Info,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { de, enUS, es, fr, ja, zhCN } from 'date-fns/locale';
import type { ClipboardItem, Settings } from '../types';
import { ContextMenu } from '../components/ContextMenu';
import Tooltip from '../components/Tooltip';

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.15;
const OCR_DRAWER_MIN = 220;
const OCR_DRAWER_MAX = 560;
const OCR_DRAWER_DEFAULT = 320;

const localeMap: Record<string, typeof enUS> = {
  de,
  en: enUS,
  es,
  fr,
  ja,
  zh: zhCN,
};

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

function base64ToBlob(base64: string, mimeType: string = 'image/png'): Blob {
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteCharacters = atob(cleanBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

function detectMimeFromBase64(b64: string): string {
  try {
    const binary = atob(b64.slice(0, 32));
    const b0 = binary.charCodeAt(0);
    const b1 = binary.charCodeAt(1);
    const b2 = binary.charCodeAt(2);
    const b3 = binary.charCodeAt(3);
    if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) return 'image/png';
    if (b0 === 0xff && b1 === 0xd8) return 'image/jpeg';
    if (b0 === 0x47 && b1 === 0x49 && b2 === 0x46) return 'image/gif';
    if (b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46) return 'image/webp';
    if (b0 === 0x42 && b1 === 0x4d) return 'image/bmp';
  } catch {
    // fall through
  }
  return 'image/png';
}

function mimeFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'bmp':
      return 'image/bmp';
    default:
      return null;
  }
}

function getImageSrc(clip: ClipboardItem): string {
  if (clip.image_path) {
    const isAbsolute = clip.image_path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(clip.image_path);
    if (isAbsolute) {
      try {
        return convertFileSrc(clip.image_path);
      } catch {
        // fall through to base64
      }
    }
  }
  if (!clip.content) return '';
  if (clip.content.startsWith('data:') || clip.content.startsWith('asset:')) {
    return clip.content;
  }
  const mime = mimeFromPath(clip.image_path) || detectMimeFromBase64(clip.content);
  return `data:${mime};base64,${clip.content}`;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getRelativeTime(dateStr: string, lang: string) {
  const code = lang?.substring(0, 2) || 'en';
  const locale = localeMap[code] || enUS;
  try {
    let formatted = formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale });
    formatted = formatted.replace(/\b(alrededor de|about|environ|ca\.?|etwa|almost|casi)\b/gi, '~');
    formatted = formatted.replace(/~\s+/g, '~');
    formatted = formatted.replace('menos de un minuto', 'segundos');
    formatted = formatted.replace('less than a minute', 'seconds');
    return formatted;
  } catch {
    return '';
  }
}

export function ImageViewerWindow() {
  const { t, i18n } = useTranslation();
  const [clip, setClip] = useState<ClipboardItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showOcrDrawer, setShowOcrDrawer] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrTextCopied, setOcrTextCopied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editHint, setEditHint] = useState<string | null>(null);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [ocrDrawerWidth, setOcrDrawerWidth] = useState(OCR_DRAWER_DEFAULT);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const appWindow = getCurrentWebviewWindow();
  const settingsRef = useRef<Settings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const resizeOcrRef = useRef<{ startX: number; startW: number } | null>(null);
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);
  const clipRef = useRef(clip);
  const showOcrDrawerRef = useRef(showOcrDrawer);
  const imageIdsRef = useRef(imageIds);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFitRef = useRef(true);

  scaleRef.current = scale;
  panRef.current = pan;
  clipRef.current = clip;
  showOcrDrawerRef.current = showOcrDrawer;
  imageIdsRef.current = imageIds;

  const showStatus = useCallback((msg: string, ms = 1800) => {
    setStatusMessage(msg);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => {
      setStatusMessage(null);
      setEditHint(null);
    }, ms);
  }, []);

  const applyTheme = useCallback((theme: string) => {
    let dark = true;
    if (theme === 'dark' || theme === 'cyberpaste') {
      document.documentElement.classList.add('dark');
      dark = true;
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      dark = false;
    } else {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (dark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    setIsDark(dark);
  }, []);

  const fitScale = useMemo(() => {
    if (!naturalSize.w || !naturalSize.h || !containerSize.w || !containerSize.h) return 1;
    const pad = 32;
    return Math.min(
      (containerSize.w - pad) / naturalSize.w,
      (containerSize.h - pad) / naturalSize.h
    );
  }, [naturalSize, containerSize]);

  const resetViewToFit = useCallback(() => {
    if (!naturalSize.w || !containerSize.w) return;
    const pad = 32;
    const next = Math.min(
      (containerSize.w - pad) / naturalSize.w,
      (containerSize.h - pad) / naturalSize.h
    );
    setScale(next > 0 ? next : 1);
    setPan({ x: 0, y: 0 });
  }, [naturalSize, containerSize]);

  const setOriginalSize = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomBy = useCallback((factor: number, originX?: number, originY?: number) => {
    setScale((prev) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev * factor));
      if (originX != null && originY != null && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const cx = originX - rect.left - rect.width / 2;
        const cy = originY - rect.top - rect.height / 2;
        setPan((p) => ({
          x: cx - ((cx - p.x) * next) / prev,
          y: cy - ((cy - p.y) * next) / prev,
        }));
      }
      return next;
    });
  }, []);

  const loadClip = useCallback((id: string) => {
    const hasExisting = !!clipRef.current;
    if (hasExisting) {
      setSwitching(true);
    } else {
      setLoading(true);
    }
    invoke<ClipboardItem>('get_clip', { clipId: id })
      .then((clipData) => {
        pendingFitRef.current = true;
        setClip(clipData);
        setScale(1);
        setPan({ x: 0, y: 0 });
        setNaturalSize({ w: 0, h: 0 });
        setOcrError(null);
        setEditHint(null);
        setLoading(false);
        setSwitching(false);
      })
      .catch((err) => {
        console.error('Failed to load viewer data:', err);
        setLoading(false);
        setSwitching(false);
      });
  }, []);

  const loadImageIds = useCallback(async (current: ClipboardItem) => {
    try {
      const filterId = current.folder_id ?? null;
      const data = await invoke<ClipboardItem[]>('get_clips', {
        filterId,
        limit: 500,
        offset: 0,
        previewOnly: true,
      });
      setImageIds(data.filter((c) => c.clip_type === 'image').map((c) => c.id));
    } catch (err) {
      console.error('Failed to load image list:', err);
      setImageIds([current.id]);
    }
  }, []);

  useEffect(() => {
    if (clip) {
      loadImageIds(clip);
    }
  }, [clip?.id, clip?.folder_id, loadImageIds]);

  // Fit once when both natural size and container are ready for a new clip
  useEffect(() => {
    if (!pendingFitRef.current) return;
    if (naturalSize.w > 0 && containerSize.w > 0) {
      pendingFitRef.current = false;
      resetViewToFit();
    }
  }, [naturalSize.w, naturalSize.h, containerSize.w, containerSize.h, clip?.id, resetViewToFit]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerSize({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, clip]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const clipId = urlParams.get('clip_id');

    if (clipId) {
      loadClip(clipId);
    }

    appWindow.isMaximized().then(setIsMaximized);
    appWindow
      .isAlwaysOnTop()
      .then(setAlwaysOnTop)
      .catch(() => {});

    invoke<Settings>('get_settings')
      .then((s) => {
        settingsRef.current = s;
        applyTheme(s.theme);
      })
      .catch(console.error);

    const unlistenSettings = listen<Settings>('settings-changed', (event) => {
      settingsRef.current = event.payload;
      applyTheme(event.payload.theme);
    });

    const unlistenUpdate = listen<string>('update-viewer-clip', (event) => {
      loadClip(event.payload);
    });

    const persistWindow = debounce(async () => {
      const currentSettings = settingsRef.current;
      if (!currentSettings) return;

      try {
        const isMax = await appWindow.isMaximized();
        if (isMax) {
          if (currentSettings.viewer_window_maximized !== true) {
            invoke('save_settings', {
              settings: {
                ...currentSettings,
                viewer_window_maximized: true,
              },
            }).catch(() => {});
          }
          return;
        }

        const size = await appWindow.innerSize();
        const pos = await appWindow.innerPosition();
        const factor = await appWindow.scaleFactor();

        const logicalSize = size.toLogical(factor);
        const logicalPos = pos.toLogical(factor);

        if (logicalSize.width > 100 && logicalSize.height > 100) {
          invoke('save_settings', {
            settings: {
              ...currentSettings,
              viewer_window_maximized: false,
              viewer_window_width: logicalSize.width,
              viewer_window_height: logicalSize.height,
              viewer_window_x: logicalPos.x,
              viewer_window_y: logicalPos.y,
            },
          }).catch(() => {});
        }
      } catch {
        // Window might have closed during debounce
      }
    }, 1000);

    const unlistenResize = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
      persistWindow();
    });
    const unlistenMoved = appWindow.onMoved(() => persistWindow());

    return () => {
      unlistenSettings.then((f) => f());
      unlistenUpdate.then((f) => f());
      unlistenResize.then((f) => f());
      unlistenMoved.then((f) => f());
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, [loadClip, applyTheme]);

  // Reveal window smoothly after clip & theme paint to prevent white flash
  useEffect(() => {
    if (clip) {
      const timer = setTimeout(() => {
        appWindow
          .show()
          .then(() => {
            appWindow.setFocus().catch(() => {});
          })
          .catch(() => {});
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [clip?.id, appWindow]);

  const canEdit = !!clip;

  const handleClose = useCallback(() => {
    appWindow.close();
  }, [appWindow]);

  const handleMinimize = useCallback(() => {
    appWindow.minimize().catch((err) => {
      console.error('Failed to minimize viewer:', err);
    });
  }, [appWindow]);

  const handleMaximize = useCallback(async () => {
    try {
      await appWindow.toggleMaximize();
      const max = await appWindow.isMaximized();
      setIsMaximized(max);
      const currentSettings = settingsRef.current;
      if (currentSettings) {
        invoke('save_settings', {
          settings: {
            ...currentSettings,
            viewer_window_maximized: max,
          },
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to toggle maximize:', err);
    }
  }, [appWindow]);

  const handleToggleAlwaysOnTop = useCallback(async () => {
    let next = !alwaysOnTop;
    try {
      const current = await appWindow.isAlwaysOnTop();
      next = !current;
      await appWindow.setAlwaysOnTop(next);
      setAlwaysOnTop(next);
      showStatus(next ? t('viewer.pinnedOnTop') : t('viewer.unpinnedOnTop'));
      // Confirm asynchronously; some platforms lag on isAlwaysOnTop()
      appWindow
        .isAlwaysOnTop()
        .then(setAlwaysOnTop)
        .catch(() => {});
    } catch (err) {
      console.error('Failed to toggle always-on-top:', err);
      showStatus(t('viewer.pinFailed'));
    }
  }, [alwaysOnTop, appWindow, showStatus, t]);

  const handleEdit = useCallback(async () => {
    const current = clipRef.current;
    if (!current) return;
    try {
      await invoke('open_image_in_system_viewer', { clipId: current.id });
    } catch (err) {
      console.error('Failed to open image in system viewer:', err);
      setEditHint(t('viewer.noImagePath'));
      showStatus(t('viewer.noImagePath'), 2800);
    }
  }, [showStatus, t]);

  const handleCopy = useCallback(async () => {
    const current = clipRef.current;
    if (!current) return;
    try {
      if (current.content) {
        try {
          const mime = mimeFromPath(current.image_path) || 'image/png';
          const blob = base64ToBlob(current.content, mime.includes('png') ? 'image/png' : mime);
          // Standard browser ClipboardItem prefers image/png for image writes
          const pngBlob = blob.type === 'image/png' ? blob : base64ToBlob(current.content, 'image/png');
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
        } catch (e) {
          console.warn('Frontend navigator.clipboard.write fallback:', e);
        }
      }
      await invoke('copy_clip', { clipId: current.id });
      setCopied(true);
      showStatus(t('viewer.copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy clip:', err);
    }
  }, [showStatus, t]);

  const ocrText = useMemo(() => {
    if (!clip || !clip.metadata) return null;
    try {
      const parsed = JSON.parse(clip.metadata);
      return parsed.ocr_text || null;
    } catch {
      return null;
    }
  }, [clip]);

  const imageMeta = useMemo(() => {
    let width = naturalSize.w;
    let height = naturalSize.h;
    let sizeBytes = 0;
    if (clip?.metadata) {
      try {
        const parsed = JSON.parse(clip.metadata) as {
          width?: number;
          height?: number;
          size_bytes?: number;
        };
        if (!width && parsed.width) width = parsed.width;
        if (!height && parsed.height) height = parsed.height;
        sizeBytes = parsed.size_bytes || 0;
      } catch {
        // ignore
      }
    }
    return { width, height, sizeBytes };
  }, [clip, naturalSize]);

  const handleRunOcr = useCallback(() => {
    const current = clipRef.current;
    if (!current) return;
    if (ocrText) {
      setShowOcrDrawer((v) => !v);
      return;
    }
    setShowOcrDrawer(true);
    setOcrLoading(true);
    setOcrError(null);
    invoke<string>('run_ocr_for_clip', { clipId: current.id })
      .then(() => {
        setOcrLoading(false);
        loadClip(current.id);
      })
      .catch((err) => {
        setOcrError(err.toString());
        setOcrLoading(false);
      });
  }, [ocrText, loadClip]);

  const handleCopyOcrText = () => {
    if (ocrText) {
      navigator.clipboard
        .writeText(ocrText)
        .then(() => {
          setOcrTextCopied(true);
          setTimeout(() => setOcrTextCopied(false), 2000);
        })
        .catch(console.error);
    }
  };

  const currentImageIndex = clip ? imageIds.indexOf(clip.id) : -1;
  const hasPrev = currentImageIndex > 0;
  const hasNext = currentImageIndex >= 0 && currentImageIndex < imageIds.length - 1;

  const navigateImage = useCallback(
    (dir: -1 | 1) => {
      const ids = imageIdsRef.current;
      const current = clipRef.current;
      if (!current || ids.length === 0) return;
      const idx = ids.indexOf(current.id);
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= ids.length) return;
      loadClip(ids[nextIdx]);
    },
    [loadClip]
  );

  const isFitMode =
    naturalSize.w > 0 && Math.abs(scale - fitScale) / Math.max(fitScale, 0.0001) < 0.02;
  const isOriginalMode = Math.abs(scale - 1) < 0.02;

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (showOcrDrawerRef.current) {
          setShowOcrDrawer(false);
        } else {
          handleClose();
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateImage(-1);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateImage(1);
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomBy(ZOOM_STEP);
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomBy(1 / ZOOM_STEP);
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        resetViewToFit();
        return;
      }
      if (e.key === '1') {
        e.preventDefault();
        setOriginalSize();
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'c' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleCopy();
      } else if (key === 'f') {
        e.preventDefault();
        if (isFitMode) setOriginalSize();
        else resetViewToFit();
      } else if (key === 'o') {
        e.preventDefault();
        handleRunOcr();
      } else if (key === 'e') {
        e.preventDefault();
        handleEdit();
      } else if (key === 'p') {
        e.preventDefault();
        handleToggleAlwaysOnTop();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleClose,
    handleCopy,
    handleEdit,
    handleRunOcr,
    handleToggleAlwaysOnTop,
    navigateImage,
    zoomBy,
    resetViewToFit,
    setOriginalSize,
    isFitMode,
  ]);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      zoomBy(factor, e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomBy, clip, loading]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!panStartRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPan({
      x: panStartRef.current.panX + dx,
      y: panStartRef.current.panY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    panStartRef.current = null;
    setIsPanning(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleOcrResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeOcrRef.current = { startX: e.clientX, startW: ocrDrawerWidth };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleOcrResizeMove = (e: React.PointerEvent) => {
    if (!resizeOcrRef.current) return;
    const dx = resizeOcrRef.current.startX - e.clientX;
    const next = Math.min(
      OCR_DRAWER_MAX,
      Math.max(OCR_DRAWER_MIN, resizeOcrRef.current.startW + dx)
    );
    setOcrDrawerWidth(next);
  };

  const handleOcrResizeEnd = (e: React.PointerEvent) => {
    resizeOcrRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const shellBg = isDark ? 'bg-zinc-950/95' : 'bg-zinc-100/95';
  const shellBorder = isDark ? 'border-[#7A00FF]/30' : 'border-indigo-300/50';
  const headerBg = isDark ? 'bg-zinc-900/90 border-white/5' : 'bg-white/90 border-zinc-200';
  const textPrimary = isDark ? 'text-white/90' : 'text-zinc-900';
  const textMuted = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const canvasBg = isDark
    ? 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950'
    : 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-50 to-zinc-200';
  const btnHover = isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-900/5';
  const groupBg = isDark ? 'border-white/5 bg-white/5' : 'border-zinc-200 bg-zinc-200/40';
  const accentCyan = isDark ? 'text-cyan-400/80' : 'text-cyan-700';
  const accentIndigo = isDark ? 'text-indigo-400/80' : 'text-indigo-600';
  const footerBg = isDark
    ? 'border-white/5 bg-zinc-900/80 text-zinc-400'
    : 'border-zinc-200 bg-white/80 text-zinc-500';
  const drawerBg = isDark ? 'border-white/10 bg-zinc-900/95' : 'border-zinc-200 bg-white/95';

  if (loading && !clip) {
    return (
      <div
        className={`flex h-screen w-screen animate-pulse items-center justify-center font-mono ${isDark ? 'bg-zinc-950 text-[#00F2FF]' : 'bg-zinc-100 text-cyan-700'}`}
        role="status"
        aria-label={t('viewer.loadingImageAria')}
      >
        {t('viewer.loadingImage')}
      </div>
    );
  }

  if (!clip) {
    return (
      <div
        className={`flex h-screen w-screen items-center justify-center border font-mono ${isDark ? 'border-[#FF00D0]/30 bg-zinc-950 text-[#FF00D0]' : 'border-rose-300 bg-zinc-100 text-rose-600'}`}
      >
        {t('viewer.clipNotFound')}
      </div>
    );
  }

  const fileName = clip.image_path
    ? clip.image_path.split(/[\\/]/).pop()
    : clip.metadata
      ? (() => {
          try {
            const m = JSON.parse(clip.metadata);
            return m.file_name || 'ClipboardImage.png';
          } catch {
            return 'ClipboardImage.png';
          }
        })()
      : 'ClipboardImage.png';

  const friendlyDate = getRelativeTime(clip.created_at, i18n.language);
  const imageSrc = getImageSrc(clip);
  const zoomPercent = Math.round(scale * 100);
  const sizeLabel = formatBytes(imageMeta.sizeBytes);
  const dimsLabel =
    imageMeta.width && imageMeta.height ? `${imageMeta.width}×${imageMeta.height}` : '';

  return (
    <div
      className={`flex h-screen w-screen flex-col overflow-hidden ${isMaximized ? 'rounded-none border-0' : 'rounded-lg border'} shadow-2xl ${shellBg} ${shellBorder}`}
      onContextMenu={handleContextMenu}
    >
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          options={[
            {
              label: isFitMode ? t('viewer.originalSize') : t('viewer.fitToWindow'),
              icon: isFitMode ? <Expand size={14} /> : <Scan size={14} />,
              onClick: () => (isFitMode ? setOriginalSize() : resetViewToFit()),
            },
            {
              label: t('viewer.zoomIn'),
              icon: <ZoomIn size={14} />,
              onClick: () => zoomBy(ZOOM_STEP),
            },
            {
              label: t('viewer.zoomOut'),
              icon: <ZoomOut size={14} />,
              onClick: () => zoomBy(1 / ZOOM_STEP),
            },
            {
              label: t('viewer.extractText'),
              icon: <ScanText size={14} />,
              onClick: handleRunOcr,
            },
            {
              label: t('viewer.edit'),
              icon: <ExternalLink size={14} />,
              onClick: handleEdit,
            },
            {
              label: t('viewer.copy'),
              icon: <Copy size={14} />,
              onClick: handleCopy,
            },
            {
              label: alwaysOnTop ? t('viewer.unpinOnTop') : t('viewer.pinOnTop'),
              icon: alwaysOnTop ? <Pin size={14} /> : <PinOff size={14} />,
              onClick: handleToggleAlwaysOnTop,
            },
            {
              label: t('settings.about', 'About...'),
              icon: <Info size={14} />,
              onClick: () => {
                invoke('open_about').catch(console.error);
              },
            },
            {
              label: t('common.close', 'Close'),
              icon: <X size={14} />,
              onClick: handleClose,
              danger: true,
            },
          ]}
        />
      )}

      {/* Header — drag region only on the title side so toolbar clicks aren't swallowed */}
      <div
        className={`z-10 flex select-none cursor-default items-center justify-between border-b px-3 py-2 ${headerBg}`}
      >
        <div
          className="flex min-w-0 flex-1 select-none cursor-default items-center gap-2 pr-2"
          data-tauri-drag-region
        >
          <div
            data-tauri-drag-region
            className="flex h-6 w-6 shrink-0 select-none cursor-default items-center justify-center overflow-hidden"
          >
            <img
              src="/logo.png"
              alt="Logo"
              className="h-5 w-5 select-none cursor-default object-contain"
              draggable={false}
              data-tauri-drag-region
            />
          </div>

          <div
            data-tauri-drag-region
            className="flex min-w-0 select-none cursor-default items-baseline gap-1.5"
          >
            <span
              className={`shrink-0 select-none cursor-default text-sm font-bold tracking-tight ${textPrimary}`}
              data-tauri-drag-region
            >
              CyberPaste
            </span>
            <span
              data-tauri-drag-region
              className="rounded border border-primary/20 bg-primary/10 px-1 py-px text-[8.5px] font-medium uppercase tracking-wider text-primary"
            >
              {t('viewer.badge', 'VISOR')}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Nav */}
          <div className={`flex items-center gap-0.5 rounded-lg border p-0.5 ${groupBg}`}>
            <Tooltip label={t('viewer.previousImage')} placement="bottom">
              <button
                type="button"
                onClick={() => navigateImage(-1)}
                disabled={!hasPrev}
                className={`rounded-md p-1.5 transition-colors ${btnHover} ${hasPrev ? textMuted + ' hover:text-cyan-500' : 'cursor-not-allowed opacity-30'}`}
              >
                <ChevronLeft size={15} />
              </button>
            </Tooltip>
            <Tooltip label={t('viewer.nextImage')} placement="bottom">
              <button
                type="button"
                onClick={() => navigateImage(1)}
                disabled={!hasNext}
                className={`rounded-md p-1.5 transition-colors ${btnHover} ${hasNext ? textMuted + ' hover:text-cyan-500' : 'cursor-not-allowed opacity-30'}`}
              >
                <ChevronRight size={15} />
              </button>
            </Tooltip>
          </div>

          {/* Image actions */}
          <div className={`flex items-center gap-0.5 rounded-lg border p-0.5 ${groupBg}`}>
            <Tooltip label={t('viewer.zoomOut')} placement="bottom">
              <button
                type="button"
                onClick={() => zoomBy(1 / ZOOM_STEP)}
                className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover} hover:text-cyan-500`}
              >
                <ZoomOut size={15} />
              </button>
            </Tooltip>
            <Tooltip
              label={isFitMode ? t('viewer.originalSize') : t('viewer.fitToWindow')}
              placement="bottom"
            >
              <button
                type="button"
                onClick={() => (isFitMode ? setOriginalSize() : resetViewToFit())}
                className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover} hover:text-cyan-500`}
              >
                {isFitMode ? <Expand size={15} /> : <Scan size={15} />}
              </button>
            </Tooltip>
            <Tooltip label={t('viewer.zoomIn')} placement="bottom">
              <button
                type="button"
                onClick={() => zoomBy(ZOOM_STEP)}
                className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover} hover:text-cyan-500`}
              >
                <ZoomIn size={15} />
              </button>
            </Tooltip>

            <Tooltip
              label={
                canEdit
                  ? t('viewer.openExternalViewer')
                  : t('viewer.noImagePath')
              }
              placement="bottom"
            >
              <button
                type="button"
                onClick={handleEdit}
                className={`rounded-md p-1.5 transition-colors ${btnHover} ${
                  canEdit ? `${textMuted} hover:text-indigo-500` : 'cursor-not-allowed opacity-35'
                }`}
                aria-disabled={!canEdit}
              >
                <ExternalLink size={15} />
              </button>
            </Tooltip>

            <Tooltip label={t('viewer.copy')} placement="bottom">
              <button
                type="button"
                onClick={handleCopy}
                className={`rounded-md p-1.5 transition-colors ${btnHover} ${
                  copied ? 'text-emerald-500' : `${textMuted} hover:text-emerald-500`
                }`}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </Tooltip>

            <Tooltip label={t('viewer.extractText')} placement="bottom">
              <button
                type="button"
                onClick={handleRunOcr}
                className={`rounded-md p-1.5 transition-colors ${btnHover} ${
                  showOcrDrawer
                    ? isDark
                      ? 'bg-white/5 text-[#00F2FF]'
                      : 'bg-cyan-50 text-cyan-700'
                    : `${textMuted} hover:text-cyan-500`
                }`}
              >
                <ScanText size={15} />
              </button>
            </Tooltip>

            <Tooltip
              label={alwaysOnTop ? t('viewer.unpinOnTop') : t('viewer.pinOnTop')}
              placement="bottom"
            >
              <button
                type="button"
                onClick={handleToggleAlwaysOnTop}
                className={`rounded-md p-1.5 transition-colors ${btnHover} ${
                  alwaysOnTop
                    ? isDark
                      ? 'text-[#00F2FF]'
                      : 'text-cyan-700'
                    : `${textMuted} hover:text-cyan-500`
                }`}
              >
                {alwaysOnTop ? <Pin size={15} /> : <PinOff size={15} />}
              </button>
            </Tooltip>
          </div>

          {/* Window controls */}
          <div className="flex items-center gap-0.5">
            <Tooltip label={t('common.minimize')} placement="bottom">
              <button
                type="button"
                onClick={handleMinimize}
                className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover} hover:text-current`}
              >
                <Minus size={16} />
              </button>
            </Tooltip>

            <Tooltip
              label={isMaximized ? t('common.restore') : t('common.maximize')}
              placement="bottom"
            >
              <button
                type="button"
                onClick={handleMaximize}
                className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover} hover:text-cyan-500`}
              >
                {isMaximized ? <Minimize2 size={16} /> : <Maximize size={16} />}
              </button>
            </Tooltip>

            <Tooltip label={t('viewer.close')} placement="bottom">
              <button
                type="button"
                onClick={handleClose}
                className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover} hover:text-rose-500`}
              >
                <X size={18} />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className={`relative flex flex-1 items-center justify-center overflow-hidden ${canvasBg}`}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: isDark
                ? 'radial-gradient(#fff 1px, transparent 0)'
                : 'radial-gradient(#000 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />

          {imageSrc && (
            <img
              src={imageSrc}
              alt=""
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onDoubleClick={() => {
                if (isFitMode) setOriginalSize();
                else resetViewToFit();
              }}
              className={`block max-w-none select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'} ${
                switching ? 'opacity-40' : 'opacity-100'
              } transition-opacity duration-200`}
              style={{
                // Keep aspect ratio exact: only set width; height follows intrinsically.
                // Scaling via transform avoids sub-pixel width/height drift at high zoom.
                width: naturalSize.w || undefined,
                height: naturalSize.h || undefined,
                maxWidth: naturalSize.w ? 'none' : '100%',
                maxHeight: naturalSize.h ? 'none' : '100%',
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                filter: isDark
                  ? 'drop-shadow(0 0 20px rgba(0,0,0,0.8))'
                  : 'drop-shadow(0 8px 24px rgba(0,0,0,0.18))',
              }}
            />
          )}

          {switching && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Loader2
                size={28}
                className={`animate-spin ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}
              />
            </div>
          )}

          {statusMessage && (
            <div
              className={`absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-md px-3 py-1.5 font-mono text-[11px] shadow-lg ${
                isDark
                  ? 'border border-white/10 bg-zinc-900/90 text-cyan-300'
                  : 'border border-zinc-200 bg-white/95 text-zinc-700'
              }`}
            >
              {statusMessage}
            </div>
          )}
        </div>

        {/* OCR Drawer — overlay, resizable */}
        {showOcrDrawer && (
          <div
            className={`absolute right-0 top-0 z-20 flex h-full flex-col border-l shadow-2xl backdrop-blur-md ${drawerBg}`}
            style={{ width: ocrDrawerWidth }}
          >
            <div
              className={`absolute left-0 top-0 z-30 h-full w-1 cursor-col-resize ${isDark ? 'hover:bg-cyan-400/40' : 'hover:bg-cyan-500/30'}`}
              onPointerDown={handleOcrResizeStart}
              onPointerMove={handleOcrResizeMove}
              onPointerUp={handleOcrResizeEnd}
              onPointerCancel={handleOcrResizeEnd}
              title={t('viewer.resizeDrawer')}
            />

            <div
              className={`flex items-center justify-between border-b px-4 py-3 ${isDark ? 'border-white/5 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50/80'}`}
            >
              <span
                className={`font-mono text-xs font-bold uppercase tracking-wider ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}
              >
                {t('viewer.ocrText')}
              </span>
              <div className="flex items-center gap-1">
                {ocrText && (
                  <Tooltip label={t('viewer.copyOcrText')} placement="bottom">
                    <button
                      type="button"
                      onClick={handleCopyOcrText}
                      className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover} hover:text-emerald-500`}
                    >
                      {ocrTextCopied ? (
                        <Check size={14} className="text-emerald-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </Tooltip>
                )}
                <Tooltip label={t('viewer.closeDrawer')} placement="bottom">
                  <button
                    type="button"
                    onClick={() => setShowOcrDrawer(false)}
                    className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover}`}
                  >
                    <X size={14} />
                  </button>
                </Tooltip>
              </div>
            </div>

            <div
              className={`flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}
            >
              {ocrLoading ? (
                <div
                  className={`flex h-full flex-col items-center justify-center gap-2 ${isDark ? 'text-cyan-400/80' : 'text-cyan-700'}`}
                >
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-[10px] uppercase tracking-wider">
                    {t('viewer.extractingText')}
                  </span>
                </div>
              ) : ocrError ? (
                <div
                  className={`rounded border p-2 ${isDark ? 'border-[#FF00D0]/20 bg-[#FF00D0]/5 text-[#FF00D0]/80' : 'border-rose-200 bg-rose-50 text-rose-600'}`}
                >
                  ERROR: {ocrError}
                </div>
              ) : ocrText ? (
                <pre
                  className={`select-text whitespace-pre-wrap break-all font-mono ${isDark ? 'selection:bg-[#7A00FF]/30 selection:text-white' : 'selection:bg-indigo-200'}`}
                >
                  {ocrText}
                </pre>
              ) : (
                <div className={`flex h-full flex-col items-center justify-center ${textMuted}`}>
                  <span>{t('viewer.noTextDetected')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div
        className={`flex items-center justify-between gap-3 border-t px-3 py-1.5 font-mono text-[11px] ${footerBg}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <Tooltip label={fileName} placement="top">
            <span
              className={`flex shrink-0 cursor-default items-center transition-colors hover:text-cyan-400 ${accentCyan}`}
            >
              <ImageIcon size={13} className="shrink-0" />
            </span>
          </Tooltip>

          {friendlyDate && (
            <span className={`truncate font-mono text-[11px] font-medium ${accentIndigo}`}>
              {friendlyDate}
            </span>
          )}

          {(dimsLabel || sizeLabel) && (
            <span className={`shrink-0 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`}>·</span>
          )}
          {dimsLabel && <span className="shrink-0">{dimsLabel}</span>}
          {dimsLabel && sizeLabel && (
            <span className={`shrink-0 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`}>·</span>
          )}
          {sizeLabel && <span className="shrink-0">{sizeLabel}</span>}
          <span className={`shrink-0 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`}>·</span>
          <span className={`shrink-0 ${isDark ? 'text-cyan-400/70' : 'text-cyan-700'}`}>
            {zoomPercent}%
            {isFitMode
              ? ` · ${t('viewer.fitShort')}`
              : isOriginalMode
                ? ` · ${t('viewer.originalShort')}`
                : ''}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {imageIds.length > 0 && currentImageIndex >= 0 && (
            <span>
              {currentImageIndex + 1}/{imageIds.length}
            </span>
          )}
          {editHint && <span className="max-w-[200px] truncate text-rose-400">{editHint}</span>}
        </div>
      </div>

      <div
        className={`h-0.5 w-full bg-gradient-to-r from-transparent to-transparent ${isDark ? 'via-[#7A00FF]/50' : 'via-indigo-400/50'}`}
      />
    </div>
  );
}
