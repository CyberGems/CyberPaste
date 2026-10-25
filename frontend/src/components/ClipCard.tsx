import { ClipboardItem, getFilterForClipType, type ClipFilterCategory } from '../types';
import { clsx } from 'clsx';
import { useMemo, memo, useState, forwardRef, useEffect, useRef, useCallback } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { LAYOUT, PREVIEW_CHAR_LIMIT } from '../constants';
import {
  Check,
  MoveHorizontal,
  MoveVertical,
  FileText,
  Code,
  Link,
  File as LucideFile,
  Image as ImageIcon,
  ScanText,
  Pin,
  Zap,
  Copy,
  ClipboardPaste,
} from 'lucide-react';
import Tooltip, { dismissAllTooltips } from './Tooltip';
import { formatDistanceToNow } from 'date-fns';
import { de, enUS, es, fr, ja, zhCN } from 'date-fns/locale';
import { CONTEXT_MENU_EVENT, type ContextMenuEventDetail } from '../utils/contextMenuEvents';
import { usePinFlash } from '../hooks/usePinFlash';
import { useDeleteFlash } from '../hooks/useDeleteFlash';
import { isListHoverLocked, useListHoverLocked } from '../hooks/useListHoverLock';

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
  onPaste: (clipId: string, forcePaste?: boolean) => void;
  onCopy?: (clipId: string) => void;
  onCancelPeek?: () => void;
  onDragStart: (clipId: string, startX: number, startY: number) => void;
  onContextMenu?: (e: React.MouseEvent, clipId: string) => void;
  reorderDropIndicator?: 'before' | 'after' | null;
  reorderEnabled?: boolean;
  clipIndex?: number;
  isDragging?: boolean;
  onPreview?: (clipId: string) => void;
  isBulkSelected?: boolean;
  onToggleBulkSelect?: (clipId: string) => void;
  onCardClick?: (clipId: string, e: React.MouseEvent) => void;
  onRunOcr?: (clipId: string) => void;
  showSourceIcon?: boolean;
  showTime?: boolean;
  showTypeIcon?: boolean;
  showNumber?: boolean;
  actionTooltip?: string;
  singleClickPaste?: boolean;
  onCardMouseEnter?: (e: React.MouseEvent, clip: ClipboardItem) => void;
  onCardMouseMove?: (e: React.MouseEvent, clip: ClipboardItem) => void;
  onCardMouseLeave?: () => void;
  onFilterByApp?: (app: string) => void;
  onFilterByType?: (type: ClipFilterCategory) => void;
  typeFilter?: string;
  cardFormat?: 'square' | 'panoramic';
}

export const ClipCard = memo(
  forwardRef<HTMLDivElement, ClipCardProps>(function ClipCard(
    {
      clip,
      isSelected,
      onPaste,
      onCopy,
      onCancelPeek,
      onDragStart,
      onContextMenu,
      reorderDropIndicator,
      reorderEnabled,
      clipIndex,
      isDragging,
      isBulkSelected = false,
      onToggleBulkSelect,
      onCardClick,
      onRunOcr,
      showSourceIcon = true,
      showTime = true,
      showTypeIcon = true,
      showNumber = true,
      actionTooltip,
      singleClickPaste = true,
      onCardMouseEnter,
      onCardMouseMove,
      onCardMouseLeave,
      onFilterByApp,
      onFilterByType,
      typeFilter,
      cardFormat = 'square',
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
    const [hovered, setHovered] = useState(false);
    const hoverLocked = useListHoverLocked();
    const title = clip.source_app || clip.clip_type.toUpperCase();

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
          <div
            className={clsx(
              'flex h-full w-full select-none items-center justify-center',
              cardFormat === 'panoramic' ? 'pb-6' : 'pb-7'
            )}
          >
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
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
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

    const [menuHighlight, setMenuHighlight] = useState(false);
    const menuHighlightRef = useRef(false);
    const leftWhileMenuRef = useRef(false);
    menuHighlightRef.current = menuHighlight;
    const pinFlash = usePinFlash(clip.id);
    const isDeleting = useDeleteFlash(clip.id);
    const foreignMenuOpenRef = useRef(false);
    const [isOverActions, setIsOverActions] = useState(false);
    const showHover = menuHighlight || (hovered && !hoverLocked && !foreignMenuOpenRef.current);
    const showQuickActions =
      hovered &&
      !hoverLocked &&
      !foreignMenuOpenRef.current &&
      !menuHighlight &&
      !isDragging &&
      !isDeleting;

    const titleContainerRef = useRef<HTMLDivElement>(null);
    const titleTextRef = useRef<HTMLSpanElement>(null);
    const [titleOverflow, setTitleOverflow] = useState(0);

    const checkTitleOverflow = useCallback(() => {
      if (titleContainerRef.current && titleTextRef.current) {
        const cWidth = titleContainerRef.current.clientWidth;
        const sWidth = titleTextRef.current.scrollWidth;
        if (sWidth > cWidth + 1) {
          setTitleOverflow(sWidth - cWidth);
        } else {
          setTitleOverflow(0);
        }
      }
    }, []);

    useEffect(() => {
      checkTitleOverflow();
      if (titleContainerRef.current) {
        const ro = new ResizeObserver(checkTitleOverflow);
        ro.observe(titleContainerRef.current);
        return () => ro.disconnect();
      }
    }, [title, checkTitleOverflow]);

    useEffect(() => {
      if (hoverLocked) setHovered(false);
    }, [hoverLocked]);

    useEffect(() => {
      const onMenu = (e: Event) => {
        const detail = (e as CustomEvent<ContextMenuEventDetail>).detail;
        if (!detail) return;
        if (detail.open && detail.highlightId === clip.id) {
          foreignMenuOpenRef.current = false;
          leftWhileMenuRef.current = false;
          setMenuHighlight(true);
          setHovered(true);
        } else if (detail.open) {
          foreignMenuOpenRef.current = true;
          setMenuHighlight(false);
          setHovered(false);
        } else {
          foreignMenuOpenRef.current = false;
          setMenuHighlight(false);
          if (leftWhileMenuRef.current) setHovered(false);
        }
      };
      window.addEventListener(CONTEXT_MENU_EVENT, onMenu);
      return () => window.removeEventListener(CONTEXT_MENU_EVENT, onMenu);
    }, [clip.id]);

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      dismissAllTooltips();
      setMenuHighlight(true);
      setHovered(true);
      onContextMenu?.(e, clip.id);
    };

    return (
      <Tooltip
        label={actionTooltip ? <span>{actionTooltip}</span> : undefined}
        placement="top"
        disabled={!actionTooltip || isOverActions}
      >
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
        >
          {/* Drop indicator - before (left edge vertical bar in grid) */}
          {reorderEnabled && reorderDropIndicator === 'before' && (
            <div className="pointer-events-none absolute -left-1 bottom-0 top-0 z-40 w-1.5 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,1)] ring-2 ring-cyan-300/50" />
          )}
          {/* Drop indicator - after (right edge vertical bar in grid) */}
          {reorderEnabled && reorderDropIndicator === 'after' && (
            <div className="pointer-events-none absolute -right-1 bottom-0 top-0 z-40 w-1.5 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,1)] ring-2 ring-cyan-300/50" />
          )}
          <div
            data-el="clip-card-inner"
            onMouseDown={(e) => {
              // Left button only — right-click and shift-drag must not arm card reorder
              if (e.button === 0 && !e.shiftKey) {
                onDragStart(clip.id, e.clientX, e.clientY);
              }
            }}
            draggable="false"
            onMouseEnter={(e) => {
              if (hoverLocked || isListHoverLocked() || foreignMenuOpenRef.current) return;
              leftWhileMenuRef.current = false;
              setHovered(true);
              onCardMouseEnter?.(e, clip);
            }}
            onMouseMove={(e) => {
              if (hoverLocked || isListHoverLocked() || foreignMenuOpenRef.current) return;
              setHovered(true);
              const target = e.target as HTMLElement;
              const over = Boolean(
                target.closest('[data-el="clip-card-hover-actions"]') || target.closest('button')
              );
              if (over) {
                if (!isOverActions) setIsOverActions(true);
                dismissAllTooltips();
              } else if (isOverActions) {
                setIsOverActions(false);
              }
              onCardMouseMove?.(e, clip);
            }}
            onMouseLeave={() => {
              setIsOverActions(false);
              if (menuHighlightRef.current) leftWhileMenuRef.current = true;
              else setHovered(false);
              onCardMouseLeave?.();
            }}
            onClick={(e) => {
              if (onCardClick && (e.ctrlKey || e.metaKey || e.shiftKey)) {
                onCardClick(clip.id, e);
                return;
              }
              if (!singleClickPaste && onCardClick) {
                onCardClick(clip.id, e);
              } else {
                onPaste(clip.id);
              }
            }}
            onDoubleClick={!singleClickPaste ? () => onPaste(clip.id) : undefined}
            onContextMenu={handleContextMenu}
            className={clsx(
              'relative isolate flex h-full w-full cursor-pointer select-none flex-col overflow-hidden rounded-2xl border bg-card/85 transition-[border-color,box-shadow,opacity,transform] duration-150',
              isDeleting &&
                'clip-deleting-card pointer-events-none border-destructive/70 bg-destructive/10 shadow-[0_0_20px_rgba(239,68,68,0.25)]',
              isSelected || isBulkSelected
                ? 'z-10 border-primary bg-primary/5 shadow-[0_0_14px_rgba(var(--primary-rgb),0.25)] ring-1 ring-primary/40'
                : showHover
                  ? 'border-primary/50'
                  : 'border-border',
              isDragging && 'pointer-events-none scale-95 cursor-grabbing opacity-40',
              !hoverLocked && 'group'
            )}
          >
            {pinFlash && (
              <div className="clip-pin-flash pointer-events-none absolute inset-0 z-30 rounded-2xl bg-primary/30 shadow-[inset_0_0_0_2px_rgba(var(--primary-rgb),0.7),0_0_22px_rgba(var(--primary-rgb),0.4)]" />
            )}

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
                    onToggleBulkSelect(clip.id);
                  }}
                  className="absolute left-0 top-0 z-20 flex h-8 w-8 items-center justify-center transition-all"
                  aria-label={isBulkSelected ? 'Deselect clip' : 'Select clip'}
                >
                  <div
                    className={clsx(
                      'flex h-4 w-4 items-center justify-center rounded border transition-all',
                      isBulkSelected
                        ? 'border-primary bg-primary text-primary-foreground opacity-100'
                        : showHover
                          ? 'border-border bg-popover/85 text-muted-foreground opacity-75 hover:border-primary'
                          : 'opacity-0'
                    )}
                  >
                    {isBulkSelected && <Check size={10} strokeWidth={3} />}
                  </div>
                </button>
              </Tooltip>
            )}

            <div
              data-el="clip-card-header"
              onMouseEnter={() => {
                onCancelPeek?.();
              }}
              onMouseMove={() => {
                onCancelPeek?.();
              }}
              className={clsx(
                'relative z-10 flex flex-shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-2.5 backdrop-blur-sm',
                cardFormat === 'panoramic' ? 'py-1.5' : 'py-2'
              )}
            >
              {clipIndex === 1 && (
                <div
                  className={clsx(
                    'transition-opacity duration-150',
                    onToggleBulkSelect && (showHover || isBulkSelected)
                      ? 'pointer-events-none opacity-0'
                      : 'opacity-100'
                  )}
                >
                  <Tooltip label={t('common.latest')} placement="top">
                    <span className="flex items-center text-cyan-400 opacity-90">
                      <Zap size={11} className="fill-cyan-400/20" />
                    </span>
                  </Tooltip>
                </div>
              )}
              {showSourceIcon && clip.source_icon && (
                <div
                  className={clsx(
                    'transition-opacity duration-150',
                    onToggleBulkSelect && clipIndex !== 1 && (showHover || isBulkSelected)
                      ? 'pointer-events-none opacity-0'
                      : 'opacity-100'
                  )}
                >
                  <Tooltip
                    label={
                      clip.source_app
                        ? t('compact.filterByApp', {
                            app: clip.source_app,
                            defaultValue: `Filter by app: ${clip.source_app}`,
                          })
                        : 'App'
                    }
                    placement="top"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        if (clip.source_app && onFilterByApp) {
                          e.stopPropagation();
                          onFilterByApp(clip.source_app);
                        }
                      }}
                      className={clsx(
                        'flex items-center justify-center rounded-sm border border-border bg-muted/40 p-0.5 transition-colors focus:outline-none',
                        clip.source_app &&
                          onFilterByApp &&
                          'cursor-pointer hover:border-primary/50 hover:bg-primary/10'
                      )}
                    >
                      <img
                        src={`data:image/png;base64,${clip.source_icon}`}
                        alt=""
                        draggable="false"
                        className="h-3.5 w-3.5 object-contain"
                      />
                    </button>
                  </Tooltip>
                </div>
              )}
              {clip.is_pinned && (
                <Tooltip label={t('common.pinnedClip')} placement="top">
                  <span className="flex items-center text-cyan-400 opacity-80">
                    <Pin size={10} className="-rotate-45 fill-cyan-400/20" />
                  </span>
                </Tooltip>
              )}
              {showNumber && clipIndex !== undefined && (
                <span className="select-none font-mono text-[9px] opacity-45 transition-opacity group-hover:opacity-70">
                  #{clipIndex}
                </span>
              )}
              <div className="relative flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                <div
                  ref={titleContainerRef}
                  className={clsx(
                    'relative flex min-w-0 flex-1 items-center overflow-hidden',
                    showHover && titleOverflow > 0 && 'title-marquee-mask'
                  )}
                >
                  <span
                    ref={titleTextRef}
                    onClick={(e) => {
                      if (clip.source_app && onFilterByApp) {
                        e.stopPropagation();
                        onFilterByApp(clip.source_app);
                      }
                    }}
                    style={
                      showHover && titleOverflow > 0
                        ? ({
                            '--overflow-dist': `-${titleOverflow + 8}px`,
                            animation: `marquee-ping-pong ${Math.max(4, Math.min(8, 2.5 + titleOverflow / 20))}s ease-in-out infinite alternate`,
                          } as React.CSSProperties)
                        : undefined
                    }
                    className={clsx(
                      'whitespace-nowrap text-[10px] font-bold uppercase tracking-normal transition-colors duration-150',
                      showHover ? 'text-primary' : 'text-secondary-foreground',
                      showHover && titleOverflow > 0
                        ? 'inline-block will-change-transform'
                        : 'min-w-0 flex-1 truncate',
                      clip.source_app && onFilterByApp && 'cursor-pointer'
                    )}
                  >
                    {title}
                  </span>
                </div>
                {showTime && (
                  <Tooltip
                    label={new Date(clip.created_at).toLocaleString(i18n.language || undefined, {
                      dateStyle: 'full',
                      timeStyle: 'medium',
                    })}
                    placement="top"
                  >
                    <span className="flex-shrink-0 whitespace-nowrap text-[9px] font-medium text-muted-foreground/50 transition-colors hover:text-cyan-300">
                      • {getRelativeTime(clip.created_at, i18n.language)}
                    </span>
                  </Tooltip>
                )}
              </div>
            </div>

            <div
              data-el="clip-card-content"
              className={clsx(
                'relative z-10 flex-1 overflow-hidden p-2',
                clip.clip_type === 'image' ? 'bg-card/45' : 'bg-card/90'
              )}
            >
              {renderedContent}
              {clip.clip_type !== 'image' && (
                <div
                  className={clsx(
                    'pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-card/100 to-card/30',
                    cardFormat === 'panoramic' ? 'h-7' : 'h-12'
                  )}
                />
              )}
            </div>

            <div
              data-el="clip-card-footer"
              onMouseEnter={() => {
                onCancelPeek?.();
              }}
              onMouseMove={() => {
                onCancelPeek?.();
              }}
              className={clsx(
                'absolute bottom-0 left-0 right-0 z-10 flex h-8 items-center justify-center px-2.5 py-1',
                clip.clip_type === 'image'
                  ? 'bg-gradient-to-t from-card/95 via-card/80 to-transparent'
                  : 'bg-gradient-to-t from-card via-card/95 to-transparent'
              )}
            >
              {/* Content area: Metadata in rest, Quick Actions centered in hover */}
              {showQuickActions && onCopy ? (
                <div
                  data-el="clip-card-hover-actions"
                  className="animate-in fade-in flex w-full items-center justify-center gap-2 duration-150"
                >
                  {/* OCR button on the left if present, so Copy & Paste stay dead-center */}
                  {clip.clip_type === 'image' && hasOcr && onRunOcr && (
                    <div className="absolute bottom-[4px] left-2.5">
                      <Tooltip label={t('viewer.openOcrText')} placement="top">
                        <button
                          type="button"
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            setIsOverActions(true);
                            onCancelPeek?.();
                          }}
                          onMouseLeave={() => setIsOverActions(false)}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onRunOcr(clip.id);
                          }}
                          className="flex h-[24px] w-[24px] items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary transition-colors hover:bg-primary/25 active:scale-95"
                          aria-label="Open OCR text"
                        >
                          <ScanText size={11} />
                        </button>
                      </Tooltip>
                    </div>
                  )}

                  <button
                    type="button"
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      setIsOverActions(true);
                      dismissAllTooltips();
                      onCancelPeek?.();
                    }}
                    onMouseMove={(e) => {
                      e.stopPropagation();
                      setIsOverActions(true);
                      dismissAllTooltips();
                      onCancelPeek?.();
                    }}
                    onMouseLeave={() => {
                      setIsOverActions(false);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onCopy?.(clip.id);
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="flex h-[26px] items-center gap-1.5 rounded-lg border border-border/60 bg-muted/50 px-2.5 text-[11px] font-medium text-foreground/85 shadow-sm backdrop-blur-md transition-all hover:border-primary/60 hover:bg-primary/15 hover:text-primary active:scale-95 dark:border-white/10 dark:bg-muted/40"
                    aria-label={t('common.copy')}
                  >
                    <Copy size={12} className="opacity-80" />
                    <span>{t('common.copy')}</span>
                  </button>
                  <button
                    type="button"
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      setIsOverActions(true);
                      dismissAllTooltips();
                      onCancelPeek?.();
                    }}
                    onMouseMove={(e) => {
                      e.stopPropagation();
                      setIsOverActions(true);
                      dismissAllTooltips();
                      onCancelPeek?.();
                    }}
                    onMouseLeave={() => {
                      setIsOverActions(false);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onPaste(clip.id, true);
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="flex h-[26px] items-center gap-1.5 rounded-lg border border-border/60 bg-muted/50 px-2.5 text-[11px] font-medium text-foreground/85 shadow-sm backdrop-blur-md transition-all hover:border-primary/60 hover:bg-primary/15 hover:text-primary active:scale-95 dark:border-white/10 dark:bg-muted/40"
                    aria-label={t('common.paste')}
                  >
                    <ClipboardPaste size={12} className="opacity-80" />
                    <span>{t('common.paste')}</span>
                  </button>
                </div>
              ) : (
                <span
                  className={clsx(
                    'animate-in fade-in flex min-w-0 flex-1 items-center text-[11px] font-medium transition-colors duration-150',
                    clip.clip_type === 'image'
                      ? 'font-semibold text-muted-foreground/90'
                      : 'text-muted-foreground/50'
                  )}
                >
                  {clip.clip_type === 'image' ? (
                    <div className="flex w-full items-center justify-between pr-7">
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
                      {/* Quick OCR shortcut in rest state */}
                      {hasOcr && onRunOcr && (
                        <Tooltip label={t('viewer.openOcrText')} placement="top">
                          <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              onRunOcr(clip.id);
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
                    <span className="truncate pr-7">{clip.preview || t('common.file')}</span>
                  ) : (
                    <span className="truncate pr-7">
                      {t('clipList.textLength', { count: clip.content_length })}
                    </span>
                  )}
                </span>
              )}

              {showTypeIcon && (
                <div
                  className={clsx(
                    'absolute bottom-[6px] right-2.5 flex items-center transition-opacity',
                    showHover ? 'opacity-100' : 'opacity-70'
                  )}
                >
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
                    const filterCategory = getFilterForClipType(clip.clip_type);
                    const isFilterActive = typeFilter === filterCategory;
                    const tooltipText = isFilterActive
                      ? t('compact.clearTypeFilter', { defaultValue: 'Quitar filtro de tipo' })
                      : t('compact.filterByType', {
                          type: typeLabel,
                          defaultValue: `Filtrar por ${typeLabel}`,
                        });
                    return (
                      <Tooltip label={tooltipText} placement="top">
                        <button
                          type="button"
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            setIsOverActions(true);
                            onCancelPeek?.();
                          }}
                          onMouseMove={(e) => {
                            e.stopPropagation();
                            setIsOverActions(true);
                            onCancelPeek?.();
                          }}
                          onMouseLeave={() => {
                            setIsOverActions(false);
                          }}
                          onClick={(e) => {
                            if (onFilterByType) {
                              e.stopPropagation();
                              onFilterByType(filterCategory);
                            }
                          }}
                          className={clsx(
                            'flex items-center justify-center rounded p-0.5 transition-all focus:outline-none',
                            onFilterByType &&
                              'cursor-pointer hover:scale-110 hover:text-foreground active:scale-95',
                            isFilterActive
                              ? 'bg-primary/20 text-primary ring-1 ring-primary/40'
                              : 'text-muted-foreground/60 hover:text-foreground'
                          )}
                          aria-label={tooltipText}
                        >
                          <TypeIcon size={12} />
                        </button>
                      </Tooltip>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </Tooltip>
    );
  })
);
