import { ClipboardItem } from '../types';
import { clsx } from 'clsx';
import { useMemo, memo, useState, forwardRef, useEffect, useRef } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { LAYOUT, PREVIEW_CHAR_LIMIT } from '../constants';
import {
  Copy,
  Check,
  MoveHorizontal,
  MoveVertical,
  Maximize2,
  FileText,
  Code,
  Link,
  File as LucideFile,
  Image as ImageIcon,
  ScanText,
  Pin,
} from 'lucide-react';
import { useMotionValue, useMotionTemplate, motion } from 'framer-motion';
import Tooltip from './Tooltip';
import { formatDistanceToNow } from 'date-fns';
import { de, enUS, es, fr, ja, zhCN } from 'date-fns/locale';
import { CONTEXT_MENU_EVENT, type ContextMenuEventDetail } from '../utils/contextMenuEvents';

const localeMap: Record<string, any> = {
  de,
  en: enUS,
  es,
  fr,
  ja,
  zh: zhCN,
};

const getRelativeTime = (dateStr: string, lang: string) => {
  const code = lang?.substring(0, 2) || 'en';
  const locale = localeMap[code] || enUS;
  try {
    let formatted = formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale });
    formatted = formatted.replace(/\b(alrededor de|about|environ|ca\.?|etwa|almost|casi)\b/gi, '~');
    formatted = formatted.replace(/~\s+/g, '~');
    formatted = formatted.replace('menos de un minuto', 'segundos');
    formatted = formatted.replace('less than a minute', 'seconds');
    return formatted;
  } catch (err) {
    console.error(err);
    return '';
  }
};

interface ClipCardProps {
  clip: ClipboardItem;
  isSelected: boolean;
  onPaste: () => void;
  onCopy: () => void;
  onDragStart: (clipId: string, startX: number, startY: number) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  reorderDropIndicator?: 'before' | 'after' | null;
  reorderEnabled?: boolean;
  clipIndex?: number;
  isLatest?: boolean;
  isDragging?: boolean;
  onPreview?: () => void;
  isBulkSelected?: boolean;
  onToggleBulkSelect?: () => void;
  onCardClick?: (e: React.MouseEvent) => void;
  onRunOcr?: () => void;
}

export const ClipCard = memo(
  forwardRef<HTMLDivElement, ClipCardProps>(function ClipCard(
    {
      clip,
      isSelected,
      onPaste,
      onCopy,
      onDragStart,
      onContextMenu,
      reorderDropIndicator,
      reorderEnabled,
      clipIndex,
      isLatest,
      isDragging,
      onPreview,
      isBulkSelected = false,
      onToggleBulkSelect,
      onCardClick,
      onRunOcr,
    }: ClipCardProps,
    ref
  ) {
    const { t, i18n } = useTranslation();
    const typeLabel = useMemo(() => {
      if (clip.clip_type === 'image') return t('clipType.image') || 'Image';
      if (clip.clip_type === 'file') return t('clipType.file') || 'File';
      if (clip.clip_type === 'url')
        return t('clipType.url') === 'clipType.url' ? 'URL' : t('clipType.url');
      if (clip.clip_type === 'code')
        return t('clipType.code') === 'clipType.code' ? 'Code' : t('clipType.code');
      if (clip.clip_type === 'html')
        return t('clipType.html') === 'clipType.html' ? 'HTML' : t('clipType.html');
      if (clip.clip_type === 'rtf')
        return t('clipType.rtf') === 'clipType.rtf' ? 'Rich Text' : t('clipType.rtf');
      return t('clipType.text') === 'clipType.text' ? 'Text' : t('clipType.text');
    }, [clip.clip_type, t]);
    const [copied, setCopied] = useState(false);
    const [hovered, setHovered] = useState(false);
    const title = clip.source_app || clip.clip_type.toUpperCase();

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const filePaths = useMemo(() => {
      if (clip.clip_type !== 'file' || !clip.content) return [] as string[];
      try {
        const parsed = JSON.parse(clip.content);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }, [clip.clip_type, clip.content]);

    const imageSrc = useMemo(() => {
      if (clip.clip_type !== 'image' || !clip.content) return null;
      const value = clip.content;
      const isAbsolutePath = value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value);
      if (
        value.startsWith('data:') ||
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('asset:') ||
        value.startsWith('tauri://')
      ) {
        return value;
      }
      if (isAbsolutePath) {
        return convertFileSrc(value);
      }
      return `data:image/png;base64,${value}`;
    }, [clip.clip_type, clip.content]);

    const imageMetadata = useMemo(() => {
      if (clip.clip_type !== 'image') return { sizeKb: 0, width: 0, height: 0 };
      try {
        const parsed = clip.metadata
          ? (JSON.parse(clip.metadata) as { size_bytes?: number; width?: number; height?: number })
          : null;
        return {
          sizeKb: parsed?.size_bytes ? Math.round(parsed.size_bytes / 1024) : 0,
          width: parsed?.width || 0,
          height: parsed?.height || 0,
        };
      } catch {
        return { sizeKb: 0, width: 0, height: 0 };
      }
    }, [clip.clip_type, clip.metadata]);

    const ocrTooltip = useMemo(() => {
      if (clip.clip_type !== 'image' || !clip.metadata) return null;
      try {
        const parsed = JSON.parse(clip.metadata) as { ocr_text?: string };
        if (parsed && parsed.ocr_text) {
          const ocrText = parsed.ocr_text.trim();
          if (ocrText) {
            const firstLine = ocrText.split('\n')[0] || '';
            const hasMoreLines = ocrText.includes('\n');
            if (firstLine.length > 80) {
              return firstLine.substring(0, 80) + '...';
            }
            if (hasMoreLines) {
              return firstLine + '...';
            }
            return firstLine;
          }
        }
      } catch {
        // Ignore
      }
      return null;
    }, [clip.clip_type, clip.metadata]);

    // OCR is available when the clip has a cached ocr_text in metadata
    const hasOcr = useMemo(() => {
      if (clip.clip_type !== 'image' || !clip.metadata) return false;
      try {
        const parsed = JSON.parse(clip.metadata) as { ocr_text?: string };
        return Boolean(parsed?.ocr_text?.trim());
      } catch {
        return false;
      }
    }, [clip.clip_type, clip.metadata]);

    // Memoize the content rendering
    const renderedContent = useMemo(() => {
      if (clip.clip_type === 'image') {
        return (
          <div className="flex h-full w-full select-none items-center justify-center">
            {clip.content ? (
              <img
                src={imageSrc ?? undefined}
                alt="Clipboard Image"
                draggable="false"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground/70">{t('common.image')}</span>
            )}
          </div>
        );
      } else if (clip.clip_type === 'file') {
        return (
          <div className="flex h-full w-full select-none flex-col items-center justify-center gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-400/70">
              {t('common.files')}
            </span>
            <span className="max-w-full truncate px-3 text-center text-xs text-muted-foreground/60">
              {clip.preview || filePaths[0] || ''}
            </span>
            {filePaths.length > 1 && (
              <span className="text-[10px] text-muted-foreground/40">
                {t('common.more', { count: filePaths.length - 1 })}
              </span>
            )}
          </div>
        );
      } else if (clip.clip_type === 'html' || clip.clip_type === 'rtf') {
        return (
          <pre className="whitespace-pre-wrap break-all font-mono text-[13px] leading-tight text-foreground/80">
            <span>{(clip.preview || clip.content).substring(0, PREVIEW_CHAR_LIMIT)}</span>
          </pre>
        );
      } else {
        return (
          <pre className="whitespace-pre-wrap break-all font-mono text-[13px] leading-tight text-foreground">
            <span>{(clip.content || clip.preview).substring(0, PREVIEW_CHAR_LIMIT)}</span>
          </pre>
        );
      }
    }, [clip.clip_type, clip.content, clip.preview, imageSrc, filePaths]);

    // Generate stable color index based on source app name
    const getAppColorIndex = (name: string) => {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return Math.abs(hash) % 15;
    };

    const appHue = useMemo(() => {
      const index = getAppColorIndex(title);
      const hueStep = 360 / 15;
      return Math.round(index * hueStep);
    }, [title]);

    const glowBackground = useMotionTemplate`radial-gradient(180px circle at ${mouseX}px ${mouseY}px, hsl(${appHue} 65% 55% / 0.7), transparent 65%)`;

    const [menuHighlight, setMenuHighlight] = useState(false);
    const menuHighlightRef = useRef(false);
    const leftWhileMenuRef = useRef(false);
    menuHighlightRef.current = menuHighlight;

    useEffect(() => {
      const onMenu = (e: Event) => {
        const detail = (e as CustomEvent<ContextMenuEventDetail>).detail;
        if (!detail) return;
        if (detail.open && detail.highlightId === clip.id) {
          leftWhileMenuRef.current = false;
          setMenuHighlight(true);
          setHovered(true);
        } else {
          setMenuHighlight(false);
          if (leftWhileMenuRef.current) setHovered(false);
        }
      };
      window.addEventListener(CONTEXT_MENU_EVENT, onMenu);
      return () => window.removeEventListener(CONTEXT_MENU_EVENT, onMenu);
    }, [clip.id]);

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      setMenuHighlight(true);
      setHovered(true);
      onContextMenu?.(e);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    };

    return (
      <div
        ref={ref}
        data-el="clip-card"
        data-clip-id={clip.id}
        style={{
          width: '100%',
          maxWidth: 600,
          height: `calc(100% - ${LAYOUT.CARD_VERTICAL_PADDING * 2}px)`,
          position: 'relative',
        }}
        className="flex-shrink-0"
        title={ocrTooltip || undefined}
      >
        {/* Drop indicator - before */}
        {reorderEnabled && reorderDropIndicator === 'before' && (
          <div className="absolute -top-1.5 left-0 right-0 z-30 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
        )}
        {/* Drop indicator - after */}
        {reorderEnabled && reorderDropIndicator === 'after' && (
          <div className="absolute -bottom-1.5 left-0 right-0 z-30 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
        )}
        <div
          data-el="clip-card-inner"
          onMouseDown={(e) => {
            // Left button only — right-click must not arm drag / grabbing cursor
            if (e.button === 0) {
              onDragStart(clip.id, e.clientX, e.clientY);
            }
          }}
          draggable="false"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => {
            leftWhileMenuRef.current = false;
            setHovered(true);
          }}
          onMouseLeave={() => {
            if (menuHighlightRef.current) leftWhileMenuRef.current = true;
            else setHovered(false);
          }}
          onClick={(e) => {
            if (onCardClick && (e.ctrlKey || e.metaKey || e.shiftKey)) {
              onCardClick(e);
              return;
            }
            onPaste();
          }}
          onContextMenu={handleContextMenu}
          style={
            {
              '--app-hue': `${appHue}`,
              borderColor: isSelected ? `hsl(${appHue} 60% 55%)` : undefined,
              borderWidth: isSelected ? '2px' : '1px',
              boxShadow: isSelected
                ? `0 0 25px hsl(${appHue} 60% 45% / 0.35), inset 0 0 15px hsl(${appHue} 60% 45% / 0.15), 0 0 0 3px hsl(${appHue} 60% 55% / 0.25)`
                : 'none',
            } as React.CSSProperties
          }
          className={clsx(
            'relative flex h-full w-full cursor-pointer select-none flex-col overflow-hidden rounded-2xl bg-card/85 shadow-lg transition-[border-color,box-shadow,opacity,transform] duration-150 border-border',
            isSelected
              ? 'z-10 border'
              : isBulkSelected
                ? 'border-2 border-primary bg-primary/5'
                : 'border hover:border-primary/40',
            isDragging && 'pointer-events-none scale-95 cursor-grabbing opacity-40',
            'group'
          )}
        >
          {/* Keyboard focus indicator (left edge cyan bar) */}
          {isSelected && (
            <div
              data-el="clip-card-kb-focus"
              className="pointer-events-none absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
            />
          )}
          {/* Bulk selection checkbox (top-left, visible on hover or when selected) */}
          {onToggleBulkSelect && (
            <Tooltip
              label={isBulkSelected ? t('common.deselect') : t('common.select')}
              placement="top"
            >
              <button
                data-el="clip-card-bulk-check"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleBulkSelect();
                }}
                className={clsx(
                  'absolute left-2 top-2 z-20 flex h-4 w-4 items-center justify-center rounded border transition-all',
                  isBulkSelected
                    ? 'border-primary bg-primary text-primary-foreground opacity-100'
                    : hovered
                      ? 'border-border bg-popover/85 text-muted-foreground opacity-75 hover:border-primary'
                      : 'opacity-0'
                )}
                aria-label={isBulkSelected ? 'Deselect clip' : 'Select clip'}
              >
                {isBulkSelected && <Check size={10} strokeWidth={3} />}
              </button>
            </Tooltip>
          )}

          {/* Framer-motion spotlight border glow */}
          {!isSelected && (
            <motion.div
              data-el="clip-card-glow"
              className="pointer-events-none absolute -inset-px z-20 rounded-[17px] p-[2px]"
              style={{
                background: glowBackground,
                WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
                opacity: hovered || menuHighlight ? 1 : 0,
                transition: 'opacity 200ms',
              }}
            />
          )}

          <div
            data-el="clip-card-header"
            className="relative z-10 flex flex-shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-2.5 py-2 backdrop-blur-sm"
          >
            {clip.source_icon && (
              <div
                className={clsx(
                  'transition-opacity duration-150',
                  hovered || isBulkSelected ? 'opacity-0 pointer-events-none' : 'opacity-100'
                )}
              >
                <Tooltip label={clip.source_app || 'App'} placement="top">
                  <div className="flex items-center justify-center rounded-sm border border-border bg-muted/40 p-0.5">
                    <img
                      src={`data:image/png;base64,${clip.source_icon}`}
                      alt=""
                      draggable="false"
                      className="h-3.5 w-3.5 object-contain"
                    />
                  </div>
                </Tooltip>
              </div>
            )}
            {clip.is_pinned && (
              <span
                className="flex items-center text-cyan-400 opacity-80"
                title={t('common.pinnedClip')}
              >
                <Pin size={10} className="-rotate-45 fill-cyan-400/20" />
              </span>
            )}
            {clipIndex !== undefined && (
              <span className="select-none font-mono text-[9px] opacity-20">#{clipIndex}</span>
            )}
            <div className="relative flex flex-1 items-center gap-1.5 overflow-hidden">
              <span
                className="inline-block whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.1em] text-secondary-foreground"
                style={{
                  animation: isLatest ? 'marquee 3s linear infinite' : 'none',
                }}
              >
                {title}
                {isLatest && (
                  <>
                    <span className="mx-3 opacity-30">•</span>
                    {title}
                    <span className="mx-3 opacity-30">•</span>
                  </>
                )}
              </span>
              <Tooltip
                label={new Date(clip.created_at).toLocaleString(i18n.language || undefined, {
                  dateStyle: 'full',
                  timeStyle: 'medium',
                })}
                placement="top"
              >
                <span className="whitespace-nowrap text-[9px] font-medium text-muted-foreground/50 transition-colors hover:text-cyan-300">
                  • {getRelativeTime(clip.created_at, i18n.language)}
                </span>
              </Tooltip>
            </div>
            <div className="relative flex h-full min-w-[40px] items-center justify-end">
              {/* LATEST badge + LED - slide together and fade out on hover */}
              <motion.div
                className="absolute right-2 flex items-center gap-1"
                animate={{
                  x: hovered ? -24 : 0,
                  opacity: hovered ? 0 : 1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                {isLatest && (
                  <span className="select-none rounded bg-black/80 px-1 text-[8px] font-bold uppercase tracking-widest text-cyan-400/90">
                    {t('common.latest')}
                  </span>
                )}
                <div
                  className="pointer-events-none h-1.5 w-1.5 rounded-full shadow-lg"
                  style={{
                    backgroundColor: `hsl(${appHue} 85% 75%)`,
                    boxShadow: `0 0 10px 1px hsl(${appHue} 85% 75% / 0.5)`,
                  }}
                />
              </motion.div>

              {/* Preview + Copy buttons - slide in on hover */}
              {hovered && onPreview && clip.clip_type === 'image' && (
                <motion.button
                  data-el="clip-card-preview-btn"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onPreview();
                  }}
                  className="relative z-10 mr-0.5 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  title={t('contextMenu.view')}
                >
                  <Maximize2 size={12} />
                </motion.button>
              )}
              <motion.button
                data-el="clip-card-copy-btn"
                initial={{ opacity: 0, x: 20 }}
                animate={{
                  opacity: hovered ? 1 : 0,
                  x: hovered ? 0 : 20,
                }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCopy();
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="relative z-10 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                title={t('common.copyToClipboard')}
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </motion.button>
            </div>
          </div>

          <div
            data-el="clip-card-content"
            className="relative z-10 flex-1 overflow-hidden bg-card/90 p-2"
          >
            {renderedContent}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card/100 to-card/30" />
          </div>

          <div
            data-el="clip-card-footer"
            className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-card via-card/100 to-transparent/0 px-3 py-1.5"
          >
            <span className="text-[11px] font-medium text-muted-foreground/50">
              {clip.clip_type === 'image' ? (
                <div className="flex w-full items-center justify-between pr-6">
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-0.5">
                      <MoveHorizontal size={10} className="text-muted-foreground/60" />
                      <span>{imageMetadata.width}</span>
                    </span>
                    <span className="text-[8px] opacity-40">×</span>
                    <span className="flex items-center gap-0.5">
                      <MoveVertical size={10} className="text-muted-foreground/60" />
                      <span>{imageMetadata.height}</span>
                    </span>
                    <span className="ml-1 opacity-40">•</span>
                    <span>{imageMetadata.sizeKb}KB</span>
                  </div>
                  {/* Quick OCR shortcut — pre-cached results open instantly */}
                  {hasOcr && onRunOcr && (
                    <Tooltip label={t('viewer.openOcrText')} placement="top">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRunOcr();
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary transition-colors hover:bg-primary/25"
                        aria-label="Open OCR text"
                      >
                        <ScanText size={10} />
                      </button>
                    </Tooltip>
                  )}
                </div>
              ) : clip.clip_type === 'file' ? (
                `${clip.preview || t('common.file')}`
              ) : (
                t('clipList.textLength', { count: clip.content_length })
              )}
            </span>
            <div className="absolute bottom-1.5 right-3 flex items-center text-primary opacity-65 transition-opacity group-hover:opacity-100">
              {(() => {
                const TypeIcon =
                  clip.clip_type === 'image'
                    ? ImageIcon
                    : clip.clip_type === 'html' ||
                        clip.clip_type === 'rtf' ||
                        clip.clip_type === 'code'
                      ? Code
                      : clip.clip_type === 'url'
                        ? Link
                        : clip.clip_type === 'file'
                          ? LucideFile
                          : FileText;
                return (
                  <Tooltip label={typeLabel} placement="top">
                    <span className="flex items-center justify-center">
                      <TypeIcon size={12} />
                    </span>
                  </Tooltip>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  })
);
