import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { openUrl } from '@tauri-apps/plugin-opener';
import {
  X,
  ExternalLink,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
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
  Code,
  FileText,
  Globe,
  FolderOpen,
  File as LucideFile,
  WrapText,
  Eye,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { de, enUS, es, fr, ja, zhCN } from 'date-fns/locale';
import { clsx } from 'clsx';
import type { ClipboardItem, Settings } from '../types';
import { ContextMenu } from '../components/ContextMenu';
import Tooltip from '../components/Tooltip';
import { TitleBarMenu } from '../components/TitleBarMenu';
import { exportClip, isExportCancelled } from '../utils/export';

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.15;
const DRAWER_MIN = 240;
const DRAWER_MAX = 560;
const DRAWER_DEFAULT = 340;

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

  // Drawer & OCR
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(DRAWER_DEFAULT);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrTextCopied, setOcrTextCopied] = useState(false);

  // Common UI states
  const [copied, setCopied] = useState(false);
  const [editHint, setEditHint] = useState<string | null>(null);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [clipIds, setClipIds] = useState<string[]>([]);

  // Image Canvas states
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Text / Code / HTML states
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [showRawText, setShowRawText] = useState(false);
  const [viewModeHtml, setViewModeHtml] = useState<'rendered' | 'source'>('rendered');

  const appWindow = getCurrentWebviewWindow();
  const settingsRef = useRef<Settings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const resizeDrawerRef = useRef<{ startX: number; startW: number } | null>(null);
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);
  const clipRef = useRef(clip);
  const showDrawerRef = useRef(showDrawer);
  const clipIdsRef = useRef(clipIds);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFitRef = useRef(true);

  scaleRef.current = scale;
  panRef.current = pan;
  clipRef.current = clip;
  showDrawerRef.current = showDrawer;
  clipIdsRef.current = clipIds;

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

        // Fetch syntax highlighting for text/code clips
        const isTextual = !['image', 'file'].includes(clipData.clip_type);
        if (isTextual && (clipData.content || clipData.preview)) {
          setIsHighlighting(true);
          invoke<{ content_html: string; detected_language: string }>('get_highlighted_clip', {
            clipId: clipData.id,
          })
            .then((res) => {
              setHighlightedHtml(res.content_html);
              setDetectedLang(res.detected_language);
            })
            .catch((err) => {
              console.warn('Highlight unavailable, raw view used:', err);
              setHighlightedHtml(null);
              setDetectedLang(null);
            })
            .finally(() => setIsHighlighting(false));
        } else {
          setHighlightedHtml(null);
          setDetectedLang(null);
          setIsHighlighting(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load viewer clip:', err);
        setLoading(false);
        setSwitching(false);
      });
  }, []);

  // Load all clips in the current folder / list for carousel navigation
  const loadClipIds = useCallback(async (current: ClipboardItem) => {
    try {
      const filterId = current.folder_id ?? null;
      const data = await invoke<ClipboardItem[]>('get_clips', {
        filterId,
        limit: 500,
        offset: 0,
        previewOnly: true,
      });
      setClipIds(data.map((c) => c.id));
    } catch (err) {
      console.error('Failed to load clips list:', err);
      setClipIds([current.id]);
    }
  }, []);

  useEffect(() => {
    if (clip) {
      loadClipIds(clip);
    }
  }, [clip?.id, clip?.folder_id, loadClipIds]);

  // Fit once when natural size & container are ready for an image clip
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

    const unlistenLock = listen<{ locked: boolean }>('app-lock-changed', (event) => {
      if (event.payload.locked) {
        appWindow.close().catch(console.error);
      }
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
        // Window closed during debounce
      }
    }, 1000);

    const unlistenResize = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
      persistWindow();
    });
    const unlistenMoved = appWindow.onMoved(() => persistWindow());

    return () => {
      unlistenSettings.then((f) => f());
      unlistenLock.then((f) => f());
      unlistenUpdate.then((f) => f());
      unlistenResize.then((f) => f());
      unlistenMoved.then((f) => f());
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, [loadClip, applyTheme]);

  // Reveal window smoothly after clip & theme paint
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

  const handleClose = useCallback(() => {
    appWindow.close();
  }, [appWindow]);

  const handleMinimize = useCallback(() => {
    appWindow.minimize().catch(console.error);
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
      appWindow
        .isAlwaysOnTop()
        .then(setAlwaysOnTop)
        .catch(() => {});
    } catch (err) {
      console.error('Failed to toggle always-on-top:', err);
      showStatus(t('viewer.pinFailed'));
    }
  }, [alwaysOnTop, appWindow, showStatus, t]);

  const handleCopy = useCallback(async () => {
    const current = clipRef.current;
    if (!current) return;
    try {
      if (current.clip_type === 'image') {
        if (current.content) {
          try {
            const mime = mimeFromPath(current.image_path) || 'image/png';
            const blob = base64ToBlob(current.content, mime.includes('png') ? 'image/png' : mime);
            const pngBlob =
              blob.type === 'image/png' ? blob : base64ToBlob(current.content, 'image/png');
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
          } catch (e) {
            console.warn('Frontend navigator.clipboard.write fallback:', e);
          }
        }
      } else {
        const textToCopy = current.content || current.preview || '';
        await navigator.clipboard.writeText(textToCopy);
      }
      await invoke('copy_clip', { clipId: current.id });
      setCopied(true);
      showStatus(t('viewer.copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy clip:', err);
    }
  }, [showStatus, t]);

  const handleExport = useCallback(async () => {
    const current = clipRef.current;
    if (!current) return;
    try {
      await exportClip(current.id, t('export.dialogTitle'));
      showStatus(t('export.saved'));
    } catch (err) {
      if (!isExportCancelled(err)) {
        console.error('Failed to export clip:', err);
        showStatus(t('export.failed'), 2800);
      }
    }
  }, [showStatus, t]);

  // Contextual actions
  const handleOpenExternal = useCallback(async () => {
    const current = clipRef.current;
    if (!current) return;
    try {
      if (current.clip_type === 'image') {
        await invoke('open_image_in_system_viewer', { clipId: current.id });
      } else if (current.clip_type === 'url' && current.content) {
        await openUrl(current.content.trim());
      } else if (current.clip_type === 'file' && (current.image_path || current.content)) {
        const targetPath = (current.image_path || current.content).split('\n')[0].trim();
        await invoke('open_with', { appPath: '', filePath: targetPath });
      } else {
        await invoke('open_text_in_system_viewer', { text: current.content || current.preview });
      }
    } catch (err) {
      console.error('Failed to open external item:', err);
      showStatus(String(err), 2800);
    }
  }, [showStatus]);

  const handleShowInFolder = useCallback(async () => {
    const current = clipRef.current;
    if (!current) return;
    const targetPath = (current.image_path || current.content || current.preview || '')
      .split('\n')[0]
      .trim();
    if (!targetPath) return;
    try {
      await invoke('show_item_in_folder', { path: targetPath });
    } catch (err) {
      console.error('Failed to show in folder:', err);
      showStatus(String(err), 2800);
    }
  }, [showStatus]);

  const handleCopyPath = useCallback(async () => {
    const current = clipRef.current;
    if (!current) return;
    const targetPath = (current.image_path || current.content || current.preview || '').trim();
    if (!targetPath) return;
    try {
      await navigator.clipboard.writeText(targetPath);
      showStatus(t('viewer.copiedPath'));
    } catch (err) {
      console.error('Failed to copy path:', err);
    }
  }, [showStatus, t]);

  // OCR Drawer controls
  const ocrText = useMemo(() => {
    if (!clip || !clip.metadata) return null;
    try {
      const parsed = JSON.parse(clip.metadata);
      return parsed.ocr_text || null;
    } catch {
      return null;
    }
  }, [clip]);

  const handleRunOcr = useCallback(() => {
    const current = clipRef.current;
    if (!current || current.clip_type !== 'image') return;
    if (ocrText) {
      setShowDrawer((v) => !v);
      return;
    }
    setShowDrawer(true);
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

  // Carousel navigation
  const currentClipIndex = clip ? clipIds.indexOf(clip.id) : -1;
  const hasPrev = currentClipIndex > 0;
  const hasNext = currentClipIndex >= 0 && currentClipIndex < clipIds.length - 1;

  const navigateClip = useCallback(
    (dir: -1 | 1) => {
      const ids = clipIdsRef.current;
      const current = clipRef.current;
      if (!current || ids.length === 0) return;
      const idx = ids.indexOf(current.id);
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= ids.length) return;
      loadClip(ids[nextIdx]);
    },
    [loadClip]
  );

  // Metadata and stats
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

  // Color detection helper
  const colorInfo = useMemo(() => {
    if (!clip || clip.clip_type === 'image') return null;
    const str = (clip.content || clip.preview || '').trim();
    const hexMatch = str.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
    const rgbMatch = str.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i);
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) {
        hex = hex
          .split('')
          .map((c) => c + c)
          .join('');
      }
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { hex: `#${hex}`, rgb: `rgb(${r}, ${g}, ${b})`, r, g, b };
    }
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10);
      const g = parseInt(rgbMatch[2], 10);
      const b = parseInt(rgbMatch[3], 10);
      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      return { hex, rgb: `rgb(${r}, ${g}, ${b})`, r, g, b };
    }
    return null;
  }, [clip]);

  // URL parsing helper
  const urlObj = useMemo(() => {
    if (!clip || (clip.clip_type !== 'url' && !clip.content?.startsWith('http'))) return null;
    try {
      return new URL(clip.content.trim());
    } catch {
      return null;
    }
  }, [clip]);

  // Text statistics
  const textStats = useMemo(() => {
    if (!clip || clip.clip_type === 'image') return { lines: 0, words: 0, chars: 0 };
    const text = clip.content || clip.preview || '';
    const chars = text.length;
    const lines = text ? text.split('\n').length : 0;
    const words = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    return { lines, words, chars };
  }, [clip]);

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
        if (showDrawerRef.current) {
          setShowDrawer(false);
        } else {
          handleClose();
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateClip(-1);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateClip(1);
        return;
      }

      const isImg = clipRef.current?.clip_type === 'image';

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        if (isImg) {
          zoomBy(ZOOM_STEP);
        } else {
          setFontSize((prev) => Math.min(24, prev + 1));
        }
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        if (isImg) {
          zoomBy(1 / ZOOM_STEP);
        } else {
          setFontSize((prev) => Math.max(10, prev - 1));
        }
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        if (isImg) {
          resetViewToFit();
        } else {
          setFontSize(13);
        }
        return;
      }
      if (e.key === '1') {
        e.preventDefault();
        if (isImg) setOriginalSize();
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'c' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleCopy();
      } else if (key === 'f' && isImg) {
        e.preventDefault();
        if (isFitMode) setOriginalSize();
        else resetViewToFit();
      } else if (key === 'w' && !isImg) {
        e.preventDefault();
        setWrapLines((prev) => !prev);
      } else if (key === 'o') {
        e.preventDefault();
        if (isImg) handleRunOcr();
        else setShowDrawer((v) => !v);
      } else if (key === 's') {
        e.preventDefault();
        handleExport();
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
    handleExport,
    handleRunOcr,
    handleToggleAlwaysOnTop,
    navigateClip,
    zoomBy,
    resetViewToFit,
    setOriginalSize,
    isFitMode,
  ]);

  // Wheel zoom for images
  useEffect(() => {
    const el = containerRef.current;
    if (!el || clip?.clip_type !== 'image') return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      zoomBy(factor, e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomBy, clip, loading]);

  // Pointer panning for images
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || clip?.clip_type !== 'image') return;
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
    if (!panStartRef.current || clip?.clip_type !== 'image') return;
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

  // Drawer resize
  const handleDrawerResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeDrawerRef.current = { startX: e.clientX, startW: drawerWidth };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleDrawerResizeMove = (e: React.PointerEvent) => {
    if (!resizeDrawerRef.current) return;
    const dx = resizeDrawerRef.current.startX - e.clientX;
    const next = Math.min(DRAWER_MAX, Math.max(DRAWER_MIN, resizeDrawerRef.current.startW + dx));
    setDrawerWidth(next);
  };

  const handleDrawerResizeEnd = (e: React.PointerEvent) => {
    resizeDrawerRef.current = null;
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

  // Styling tokens
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

  const friendlyDate = getRelativeTime(clip.created_at, i18n.language);
  const imageSrc = clip.clip_type === 'image' ? getImageSrc(clip) : '';
  const zoomPercent = Math.round(scale * 100);
  const sizeLabel = formatBytes(imageMeta.sizeBytes || clip.content_length);
  const dimsLabel =
    imageMeta.width && imageMeta.height ? `${imageMeta.width}×${imageMeta.height}` : '';

  const isImageClip = clip.clip_type === 'image';
  const isCodeClip = clip.clip_type === 'code';
  const isUrlClip = clip.clip_type === 'url' || Boolean(urlObj);
  const isFileClip = clip.clip_type === 'file';
  const isHtmlClip = clip.clip_type === 'html' || clip.clip_type === 'rtf';

  return (
    <div
      className={`flex h-screen w-screen flex-col overflow-hidden ${isMaximized ? 'rounded-none border-0' : 'rounded-lg border'} shadow-2xl ${shellBg} ${shellBorder}`}
      onContextMenu={handleContextMenu}
    >
      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          options={[
            ...(isImageClip
              ? [
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
                    label: t('viewer.openExternalViewer'),
                    icon: <ExternalLink size={14} />,
                    onClick: handleOpenExternal,
                  },
                ]
              : [
                  {
                    label: t('viewer.toggleWrap'),
                    icon: <WrapText size={14} />,
                    onClick: () => setWrapLines((prev) => !prev),
                  },
                  {
                    label: t('viewer.increaseFontSize'),
                    icon: <Plus size={14} />,
                    onClick: () => setFontSize((prev) => Math.min(24, prev + 1)),
                  },
                  {
                    label: t('viewer.decreaseFontSize'),
                    icon: <Minus size={14} />,
                    onClick: () => setFontSize((prev) => Math.max(10, prev - 1)),
                  },
                  {
                    label: t('viewer.clipInfo'),
                    icon: <Info size={14} />,
                    onClick: () => setShowDrawer((v) => !v),
                  },
                ]),
            {
              label: t('viewer.copy'),
              icon: <Copy size={14} />,
              onClick: handleCopy,
            },
            {
              label: t('export.saveAs'),
              icon: <Download size={14} />,
              onClick: handleExport,
            },
            {
              label: alwaysOnTop ? t('viewer.unpinOnTop') : t('viewer.pinOnTop'),
              icon: alwaysOnTop ? <Pin size={14} /> : <PinOff size={14} />,
              onClick: handleToggleAlwaysOnTop,
            },
            {
              label: t('settings.about', 'About...'),
              icon: <Info size={14} />,
              onClick: () => invoke('open_about').catch(console.error),
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

      {/* Header Bar */}
      <div
        data-tauri-drag-region
        className={`relative z-10 flex cursor-default select-none items-center gap-2 border-b px-3.5 py-2 ${headerBg}`}
      >
        {/* Left: Branding & Fixed Universal Navigation (pinned to left so buttons never jump) */}
        <div className="z-10 flex min-w-0 shrink-0 cursor-default select-none items-center gap-2">
          <Tooltip label={t('common.openAbout')} placement="bottom">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg p-1 text-left transition-opacity hover:opacity-80"
              onClick={(e) => {
                e.stopPropagation();
                invoke('open_about').catch(console.error);
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <img
                src="/logo.png"
                alt=""
                className="h-5 w-5 shrink-0 select-none object-contain"
                draggable={false}
              />
              <span
                className={`hidden shrink-0 select-none text-[16px] font-bold tracking-tight sm:inline ${textPrimary}`}
              >
                CyberPaste
              </span>
              <span className="inline-flex shrink-0 items-center justify-center rounded border border-cyan-500/30 bg-cyan-500/10 px-1 py-px text-[8px] font-semibold uppercase leading-none tracking-wide text-cyan-400 shadow-[0_0_8px_rgba(0,242,255,0.15)]">
                {t('viewer.badge', 'VISOR')}
              </span>
            </button>
          </Tooltip>

          <div className={`h-4 w-px ${isDark ? 'bg-white/10' : 'bg-zinc-300'}`} />

          {/* Fixed-Position Navigation Buttons — stable anchor prevents any shifting on clip switch */}
          <div className={`flex items-center gap-0.5 rounded-lg border p-0.5 ${groupBg}`}>
            <Tooltip label={t('viewer.previousClip')} placement="bottom">
              <button
                type="button"
                onClick={() => navigateClip(-1)}
                disabled={!hasPrev}
                className={`rounded-md p-1.5 transition-colors ${btnHover} ${hasPrev ? textMuted + ' hover:text-cyan-500' : 'cursor-not-allowed opacity-30'}`}
              >
                <ChevronLeft size={15} />
              </button>
            </Tooltip>
            <Tooltip label={t('viewer.nextClip')} placement="bottom">
              <button
                type="button"
                onClick={() => navigateClip(1)}
                disabled={!hasNext}
                className={`rounded-md p-1.5 transition-colors ${btnHover} ${hasNext ? textMuted + ' hover:text-cyan-500' : 'cursor-not-allowed opacity-30'}`}
              >
                <ChevronRight size={15} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Spacious, unobstructed draggable titlebar region */}
        <div data-tauri-drag-region className="min-h-full min-w-0 flex-1 self-stretch" />

        {/* Actions Toolbar */}
        <div className="no-drag z-10 flex shrink-0 items-center gap-2">
          {/* Contextual Action Group */}
          <div className={`flex items-center gap-0.5 rounded-lg border p-0.5 ${groupBg}`}>
            {isImageClip ? (
              <>
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
                <Tooltip label={t('viewer.openExternalViewer')} placement="bottom">
                  <button
                    type="button"
                    onClick={handleOpenExternal}
                    className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover} hover:text-indigo-500`}
                  >
                    <ExternalLink size={15} />
                  </button>
                </Tooltip>
              </>
            ) : isCodeClip || (!isImageClip && !isFileClip && !isUrlClip && !isHtmlClip) ? (
              <>
                <Tooltip label={t('viewer.toggleWrap')} placement="bottom">
                  <button
                    type="button"
                    onClick={() => setWrapLines((prev) => !prev)}
                    className={`rounded-md p-1.5 transition-colors ${btnHover} ${wrapLines ? (isDark ? 'bg-white/10 text-cyan-400' : 'bg-cyan-50 text-cyan-700') : textMuted + ' hover:text-cyan-500'}`}
                  >
                    <WrapText size={15} />
                  </button>
                </Tooltip>
                <Tooltip label={t('viewer.decreaseFontSize')} placement="bottom">
                  <button
                    type="button"
                    onClick={() => setFontSize((prev) => Math.max(10, prev - 1))}
                    className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover} hover:text-cyan-500`}
                  >
                    <Minus size={15} />
                  </button>
                </Tooltip>
                <Tooltip label={`${t('viewer.resetFontSize')} (${fontSize}px)`} placement="bottom">
                  <button
                    type="button"
                    onClick={() => setFontSize(13)}
                    className={`rounded-md px-1.5 py-1 font-mono text-[11px] ${textMuted} transition-colors ${btnHover} hover:text-cyan-500`}
                  >
                    {fontSize}px
                  </button>
                </Tooltip>
                <Tooltip label={t('viewer.increaseFontSize')} placement="bottom">
                  <button
                    type="button"
                    onClick={() => setFontSize((prev) => Math.min(24, prev + 1))}
                    className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover} hover:text-cyan-500`}
                  >
                    <Plus size={15} />
                  </button>
                </Tooltip>
                {highlightedHtml && (
                  <Tooltip label={t('viewer.toggleSyntax')} placement="bottom">
                    <button
                      type="button"
                      onClick={() => setShowRawText((prev) => !prev)}
                      className={`rounded-md p-1.5 transition-colors ${btnHover} ${!showRawText ? (isDark ? 'bg-white/10 text-cyan-400' : 'bg-cyan-50 text-cyan-700') : textMuted + ' hover:text-cyan-500'}`}
                    >
                      {showRawText ? <FileText size={15} /> : <Code size={15} />}
                    </button>
                  </Tooltip>
                )}
              </>
            ) : isHtmlClip ? (
              <>
                <Tooltip
                  label={
                    viewModeHtml === 'rendered' ? t('viewer.sourceView') : t('viewer.renderedView')
                  }
                  placement="bottom"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setViewModeHtml((prev) => (prev === 'rendered' ? 'source' : 'rendered'))
                    }
                    className={`rounded-md p-1.5 transition-colors ${btnHover} ${isDark ? 'text-[#00F2FF]' : 'text-cyan-700'}`}
                  >
                    {viewModeHtml === 'rendered' ? <Code size={15} /> : <Eye size={15} />}
                  </button>
                </Tooltip>
                <Tooltip label={t('viewer.decreaseFontSize')} placement="bottom">
                  <button
                    type="button"
                    onClick={() => setFontSize((prev) => Math.max(10, prev - 1))}
                    className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover} hover:text-cyan-500`}
                  >
                    <Minus size={15} />
                  </button>
                </Tooltip>
                <Tooltip label={t('viewer.increaseFontSize')} placement="bottom">
                  <button
                    type="button"
                    onClick={() => setFontSize((prev) => Math.min(24, prev + 1))}
                    className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover} hover:text-cyan-500`}
                  >
                    <Plus size={15} />
                  </button>
                </Tooltip>
              </>
            ) : isUrlClip ? (
              <>
                <Tooltip label={t('viewer.openInBrowser')} placement="bottom">
                  <button
                    type="button"
                    onClick={handleOpenExternal}
                    className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover} hover:text-emerald-500`}
                  >
                    <Globe size={15} />
                  </button>
                </Tooltip>
              </>
            ) : isFileClip ? (
              <>
                <Tooltip label={t('viewer.openFile')} placement="bottom">
                  <button
                    type="button"
                    onClick={handleOpenExternal}
                    className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover} hover:text-amber-500`}
                  >
                    <ExternalLink size={15} />
                  </button>
                </Tooltip>
                <Tooltip label={t('viewer.showInExplorer')} placement="bottom">
                  <button
                    type="button"
                    onClick={handleShowInFolder}
                    className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover} hover:text-amber-500`}
                  >
                    <FolderOpen size={15} />
                  </button>
                </Tooltip>
                <Tooltip label={t('viewer.copyPath')} placement="bottom">
                  <button
                    type="button"
                    onClick={handleCopyPath}
                    className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover} hover:text-cyan-500`}
                  >
                    <Copy size={15} />
                  </button>
                </Tooltip>
              </>
            ) : null}

            {/* Standard actions: Copy & Export */}
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

            <Tooltip label={t('export.saveAs')} placement="bottom">
              <button
                type="button"
                onClick={handleExport}
                className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover} hover:text-cyan-500`}
              >
                <Download size={15} />
              </button>
            </Tooltip>

            {/* Drawer toggle button: OCR for images, Details for text/code/file */}
            <Tooltip
              label={isImageClip ? t('viewer.extractText') : t('viewer.clipInfo')}
              placement="bottom"
            >
              <button
                type="button"
                onClick={isImageClip ? handleRunOcr : () => setShowDrawer((v) => !v)}
                className={`rounded-md p-1.5 transition-colors ${btnHover} ${
                  showDrawer
                    ? isDark
                      ? 'bg-white/10 text-cyan-400'
                      : 'bg-cyan-50 text-cyan-700'
                    : `${textMuted} hover:text-cyan-500`
                }`}
              >
                {isImageClip ? <ScanText size={15} /> : <Info size={15} />}
              </button>
            </Tooltip>

            {/* Pin on top */}
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

          <TitleBarMenu iconSize={15} variant="viewer" />

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
                {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
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

      {/* Main Content Area */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className={`relative flex flex-1 overflow-hidden ${canvasBg} ${
            isImageClip ? 'items-center justify-center' : 'items-stretch justify-stretch'
          }`}
        >
          {/* Sutil dot background pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: isDark
                ? 'radial-gradient(#fff 1px, transparent 0)'
                : 'radial-gradient(#000 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* RENDERER: Image */}
          {isImageClip && imageSrc && (
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

          {/* RENDERER: Code & Syntax Highlighting */}
          {isCodeClip && (
            <div className="scrollbar-thin relative flex h-full w-full overflow-auto p-6">
              {isHighlighting && (
                <div className="absolute right-6 top-6 z-10 flex items-center gap-2 rounded border border-cyan-500/30 bg-zinc-950/80 px-2.5 py-1 font-mono text-[11px] text-cyan-400 backdrop-blur-md">
                  <Loader2 size={13} className="animate-spin" />
                  <span>{t('common.loading')}</span>
                </div>
              )}
              {highlightedHtml && !showRawText ? (
                <div
                  className={clsx(
                    'w-full select-text font-mono leading-relaxed',
                    wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre',
                    '[&_span]:!bg-transparent'
                  )}
                  style={{ fontSize: `${fontSize}px` }}
                  dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />
              ) : (
                <pre
                  className={clsx(
                    'w-full select-text font-mono leading-relaxed',
                    isDark ? 'text-zinc-200' : 'text-zinc-800',
                    wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                  )}
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {clip.content || clip.preview}
                </pre>
              )}
            </div>
          )}

          {/* RENDERER: HTML / RTF with preview toggle */}
          {isHtmlClip && (
            <div className="relative flex h-full w-full flex-col">
              {viewModeHtml === 'rendered' ? (
                <iframe
                  title="Rendered Preview"
                  sandbox="allow-same-origin"
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:24px;font-family:sans-serif;color:${isDark ? '#e4e4e7' : '#18181b'};background:transparent;line-height:1.6;}</style></head><body>${clip.content || clip.preview}</body></html>`}
                  className="h-full w-full border-0 bg-transparent"
                />
              ) : (
                <pre
                  className={clsx(
                    'scrollbar-thin h-full w-full select-text overflow-auto p-6 font-mono leading-relaxed',
                    isDark ? 'text-zinc-200' : 'text-zinc-800',
                    wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                  )}
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {clip.content || clip.preview}
                </pre>
              )}
            </div>
          )}

          {/* RENDERER: URL Card */}
          {isUrlClip && (
            <div className="flex h-full w-full flex-col items-center justify-center p-8">
              <div
                className={`flex max-w-xl flex-col items-center gap-6 rounded-2xl border p-8 shadow-2xl backdrop-blur-md ${
                  isDark ? 'border-white/10 bg-zinc-900/60' : 'border-zinc-200 bg-white/80'
                }`}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <Globe size={32} />
                </div>

                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-emerald-400">
                      {urlObj?.protocol?.replace(':', '') || 'HTTP'}
                    </span>
                    <span className="text-lg font-bold tracking-tight text-foreground">
                      {urlObj?.hostname || 'URL'}
                    </span>
                  </div>

                  <a
                    href={clip.content?.trim()}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      handleOpenExternal();
                    }}
                    className="max-w-md break-all text-sm font-medium text-cyan-400 underline decoration-cyan-400/40 underline-offset-4 transition-colors hover:text-cyan-300 hover:decoration-cyan-400"
                  >
                    {clip.content?.trim()}
                  </a>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleOpenExternal}
                    className="flex items-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-400 transition-all hover:bg-cyan-500/30 active:scale-95"
                  >
                    <ExternalLink size={14} />
                    <span>{t('viewer.openInBrowser')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted active:scale-95"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    <span>{copied ? t('common.copied') : t('contextMenu.copy')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* RENDERER: File / Files Card */}
          {isFileClip && (
            <div className="flex h-full w-full flex-col items-center justify-center p-8">
              <div
                className={`flex max-w-xl flex-col items-center gap-6 rounded-2xl border p-8 shadow-2xl backdrop-blur-md ${
                  isDark ? 'border-white/10 bg-zinc-900/60' : 'border-zinc-200 bg-white/80'
                }`}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  <LucideFile size={32} />
                </div>

                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="text-base font-bold tracking-tight text-foreground">
                    {(clip.preview || clip.content || '').split(/[\\/]/).pop() ||
                      t('clipType.file')}
                  </span>
                  <span className="max-w-md break-all font-mono text-xs text-muted-foreground/80">
                    {clip.preview || clip.content}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleOpenExternal}
                    className="flex items-center gap-2 rounded-xl bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-400 transition-all hover:bg-amber-500/30 active:scale-95"
                  >
                    <ExternalLink size={14} />
                    <span>{t('viewer.openFile')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShowInFolder}
                    className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted active:scale-95"
                  >
                    <FolderOpen size={14} />
                    <span>{t('viewer.showInExplorer')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPath}
                    className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted active:scale-95"
                  >
                    <Copy size={14} />
                    <span>{t('viewer.copyPath')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* RENDERER: Plain Text (with Color swatch support) */}
          {!isImageClip && !isCodeClip && !isHtmlClip && !isUrlClip && !isFileClip && (
            <div className="relative flex h-full w-full flex-col">
              {colorInfo && (
                <div className="flex items-center justify-between border-b px-6 py-3 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-7 w-7 rounded-lg border border-white/20 shadow-md"
                      style={{ backgroundColor: colorInfo.hex }}
                    />
                    <div className="flex items-center gap-2 font-mono text-xs font-semibold text-foreground">
                      <span>{colorInfo.hex}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{colorInfo.rgb}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(colorInfo.hex);
                      showStatus(t('viewer.colorCopied'));
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1 font-mono text-xs text-foreground transition-colors hover:bg-muted"
                  >
                    <Copy size={12} />
                    <span>HEX</span>
                  </button>
                </div>
              )}
              <pre
                className={clsx(
                  'scrollbar-thin h-full w-full select-text overflow-auto p-6 font-mono leading-relaxed',
                  isDark ? 'text-zinc-200' : 'text-zinc-800',
                  wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                )}
                style={{ fontSize: `${fontSize}px` }}
              >
                {clip.content || clip.preview}
              </pre>
            </div>
          )}

          {/* Switching spinner overlay */}
          {switching && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
              <Loader2
                size={28}
                className={`animate-spin ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}
              />
            </div>
          )}

          {/* Status notification toast */}
          {statusMessage && (
            <div
              className={`absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-md px-3 py-1.5 font-mono text-[11px] shadow-lg backdrop-blur-md ${
                isDark
                  ? 'border border-white/10 bg-zinc-900/95 text-cyan-300'
                  : 'border border-zinc-200 bg-white/95 text-zinc-700'
              }`}
            >
              {statusMessage}
            </div>
          )}
        </div>

        {/* Dynamic Drawer: OCR for Images / Details & Stats for other types */}
        {showDrawer && (
          <div
            className={`absolute right-0 top-0 z-20 flex h-full flex-col border-l shadow-2xl backdrop-blur-md ${drawerBg}`}
            style={{ width: drawerWidth }}
          >
            {/* Drag resize handle */}
            <div
              className={`absolute left-0 top-0 z-30 h-full w-1 cursor-col-resize ${isDark ? 'hover:bg-cyan-400/40' : 'hover:bg-cyan-500/30'}`}
              onPointerDown={handleDrawerResizeStart}
              onPointerMove={handleDrawerResizeMove}
              onPointerUp={handleDrawerResizeEnd}
              onPointerCancel={handleDrawerResizeEnd}
              title={t('viewer.resizeDrawer')}
            />

            {/* Drawer Header */}
            <div
              className={`flex items-center justify-between border-b px-4 py-3 ${isDark ? 'border-white/5 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50/80'}`}
            >
              <div className="flex items-center gap-2">
                {isImageClip ? (
                  <ScanText size={15} className="text-cyan-400" />
                ) : (
                  <Info size={15} className="text-cyan-400" />
                )}
                <span
                  className={`font-mono text-xs font-bold uppercase tracking-wider ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}
                >
                  {isImageClip ? t('viewer.ocrText') : t('viewer.clipInfo')}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {isImageClip && ocrText && (
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
                    onClick={() => setShowDrawer(false)}
                    className={`rounded-md p-1.5 ${textMuted} transition-colors ${btnHover}`}
                  >
                    <X size={14} />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Drawer Content */}
            <div
              className={`scrollbar-thin flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}
            >
              {isImageClip ? (
                ocrLoading ? (
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
                )
              ) : (
                /* Metadata details for non-image clips */
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/30 p-3">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t('folders.type', 'Tipo')}
                    </span>
                    <span className="font-bold text-foreground">
                      {clip.clip_type.toUpperCase()}
                      {detectedLang ? ` (${detectedLang})` : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/30 p-3">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {t('viewer.linesLabel', 'Líneas')}
                      </span>
                      <span className="font-bold text-foreground">{textStats.lines}</span>
                    </div>
                    <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/30 p-3">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {t('viewer.wordsLabel', 'Palabras')}
                      </span>
                      <span className="font-bold text-foreground">{textStats.words}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/30 p-3">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {t('viewer.charsLabel', 'Caracteres')}
                      </span>
                      <span className="font-bold text-foreground">{textStats.chars}</span>
                    </div>
                    <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/30 p-3">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {t('viewer.sizeLabel', 'Tamaño')}
                      </span>
                      <span className="font-bold text-foreground">
                        {sizeLabel || `${textStats.chars} B`}
                      </span>
                    </div>
                  </div>

                  {clip.source_app && (
                    <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/30 p-3">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {t('filters.allApps', 'App')}
                      </span>
                      <span className="font-medium text-foreground">{clip.source_app}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/30 p-3">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      ID
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-[11px] text-muted-foreground">
                        {clip.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(clip.id);
                          showStatus(t('common.copied'));
                        }}
                        className="rounded p-1 hover:bg-muted"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info & Metrics — styled with Compact mode typography */}
      <div
        className={`flex select-none items-center justify-between gap-3 border-t px-3 py-1.5 text-[10px] font-medium tracking-normal text-muted-foreground/80 backdrop-blur-md ${
          isDark ? 'border-white/5 bg-black/25' : 'border-border/60 bg-secondary/40'
        }`}
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {/* Tipo de captura */}
          <div className="flex shrink-0 items-center gap-1.5 font-medium text-foreground">
            {isImageClip ? (
              <ImageIcon size={13} className="shrink-0 text-cyan-400" />
            ) : isCodeClip ? (
              <Code size={13} className="shrink-0 text-indigo-400" />
            ) : isUrlClip ? (
              <Globe size={13} className="shrink-0 text-emerald-400" />
            ) : isFileClip ? (
              <LucideFile size={13} className="shrink-0 text-amber-400" />
            ) : colorInfo ? (
              <span
                className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                style={{ backgroundColor: colorInfo.hex }}
              />
            ) : (
              <FileText size={13} className="shrink-0 text-cyan-400" />
            )}
            <span className="truncate">
              {detectedLang
                ? `${t('clipType.code', 'Código')} (${detectedLang})`
                : t(`clipType.${clip.clip_type}`, { defaultValue: t('clipType.text') })}
            </span>
          </div>

          <span className="shrink-0 text-muted-foreground/40">·</span>

          {/* Origen de la captura (source_app + source_icon) */}
          {clip.source_app && (
            <>
              <div className="flex shrink-0 items-center gap-1.5 text-foreground/85">
                {clip.source_icon && (
                  <img
                    src={
                      clip.source_icon.startsWith('data:')
                        ? clip.source_icon
                        : `data:image/png;base64,${clip.source_icon}`
                    }
                    alt=""
                    className="h-3.5 w-3.5 shrink-0 object-contain"
                  />
                )}
                <span className="max-w-[160px] truncate">{clip.source_app}</span>
              </div>
              <span className="shrink-0 text-muted-foreground/40">·</span>
            </>
          )}

          {/* Fecha relativa */}
          {friendlyDate && (
            <span className="shrink-0 text-muted-foreground/90">{friendlyDate}</span>
          )}

          {/* Métricas contextuales */}
          {isImageClip ? (
            <>
              {(dimsLabel || sizeLabel) && (
                <span className="shrink-0 text-muted-foreground/40">·</span>
              )}
              {dimsLabel && <span className="shrink-0 tabular-nums">{dimsLabel}</span>}
              {dimsLabel && sizeLabel && (
                <span className="shrink-0 text-muted-foreground/40">·</span>
              )}
              {sizeLabel && <span className="shrink-0 tabular-nums">{sizeLabel}</span>}
              <span className="shrink-0 text-muted-foreground/40">·</span>
              <span className="shrink-0 tabular-nums text-cyan-400">
                {zoomPercent}%
                {isFitMode
                  ? ` · ${t('viewer.fitShort')}`
                  : isOriginalMode
                    ? ` · ${t('viewer.originalShort')}`
                    : ''}
              </span>
            </>
          ) : isCodeClip || (!isImageClip && !isFileClip && !isUrlClip && !isHtmlClip) ? (
            <>
              <span className="shrink-0 text-muted-foreground/40">·</span>
              <span className="shrink-0 tabular-nums">
                {t('viewer.linesCount', { count: textStats.lines })}
              </span>
              <span className="shrink-0 text-muted-foreground/40">·</span>
              <span className="shrink-0 tabular-nums">
                {t('viewer.wordsCount', { count: textStats.words })}
              </span>
              <span className="shrink-0 text-muted-foreground/40">·</span>
              <span className="shrink-0 tabular-nums">{sizeLabel || `${textStats.chars} B`}</span>
              <span className="shrink-0 text-muted-foreground/40">·</span>
              <span className="shrink-0 tabular-nums text-cyan-400">
                {fontSize}px{wrapLines ? ` · ${t('viewer.toggleWrap')}` : ''}
              </span>
            </>
          ) : isUrlClip ? (
            <>
              {urlObj && (
                <>
                  <span className="shrink-0 text-muted-foreground/40">·</span>
                  <span className="max-w-[180px] truncate text-cyan-400">{urlObj.hostname}</span>
                </>
              )}
              <span className="shrink-0 text-muted-foreground/40">·</span>
              <span className="shrink-0 tabular-nums">
                {t('viewer.charsCount', { count: (clip.content || '').length })}
              </span>
            </>
          ) : isFileClip ? (
            <>
              <span className="shrink-0 text-muted-foreground/40">·</span>
              <span className="max-w-[200px] truncate">
                {(clip.preview || clip.content || '').split(/[\\/]/).pop()}
              </span>
              {sizeLabel && (
                <>
                  <span className="shrink-0 text-muted-foreground/40">·</span>
                  <span className="shrink-0 tabular-nums">{sizeLabel}</span>
                </>
              )}
            </>
          ) : null}
        </div>

        {/* Global Position Counter */}
        <div className="flex shrink-0 items-center gap-2">
          {clipIds.length > 0 && currentClipIndex >= 0 && (
            <span className="rounded bg-muted/40 px-2 py-0.5 text-[10px] font-medium tabular-nums text-foreground/80">
              {currentClipIndex + 1}/{clipIds.length}
            </span>
          )}
          {editHint && <span className="max-w-[200px] truncate text-rose-400">{editHint}</span>}
        </div>
      </div>

      {/* Decorative gradient stripe */}
      <div
        className={`h-0.5 w-full bg-gradient-to-r from-transparent to-transparent ${isDark ? 'via-[#7A00FF]/50' : 'via-indigo-400/50'}`}
      />
    </div>
  );
}
