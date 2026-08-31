import React, { useEffect, useRef, useState, useCallback } from 'react';
// @ts-ignore
import { Grid, GridImperativeAPI, CellComponentProps } from 'react-window';
import { ClipCard } from './ClipCard';
import { FullPeek } from './FullPeek';
import { resolveImageSrc } from '../utils/image';
import { ClipboardItem } from '../types';
import { LAYOUT } from '../constants';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

interface ClipListProps {
  clips: ClipboardItem[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onPaste: (id: string) => void;
  onDragStart: (clipId: string, startX: number, startY: number) => void;
  selectedClipId: string | null;
  onCardContextMenu?: (e: React.MouseEvent, id: string) => void;
  resetToken?: number;
  viewMode?: 'full' | 'compact';
  scrollDirection?: 'horizontal' | 'vertical';
  reorderTargetClipId?: string | null;
  reorderTargetPosition?: 'before' | 'after' | null;
  reorderEnabled?: boolean;
  draggingClipId?: string | null;
  clipNumbering?: 'positional' | 'countdown';
  gridScale?: number;
  gridColumns?: number;
  showSourceIcon?: boolean;
  showTime?: boolean;
  showTypeIcon?: boolean;
  showNumber?: boolean;
  showScrollbar?: boolean;
  fullPeekEnabled?: boolean;
  actionTooltip?: string;
  onRequestPreview?: (id: string) => void;
  bulkSelectedIds?: Set<string>;
  onClipClick?: (id: string, e: React.MouseEvent) => void;
  onToggleBulkSelect?: (id: string) => void;
  onRequestOcr?: (id: string) => void;
  onColumnsChange?: (columns: number) => void;
}

const BASE_CARD_WIDTH = 230;
const BASE_ROW_HEIGHT = 230;
const MIN_COLUMNS = 2;
const MAX_COLUMNS = 12;

export const ClipList: React.FC<ClipListProps> = ({
  clips,
  isLoading,
  onLoadMore,
  onPaste,
  onDragStart,
  selectedClipId,
  onCardContextMenu,
  resetToken = 0,
  scrollDirection = 'vertical',
  reorderTargetClipId,
  reorderTargetPosition,
  reorderEnabled,
  draggingClipId,
  clipNumbering = 'positional',
  gridScale = 1,
  gridColumns = 0,
  showSourceIcon = true,
  showTime = true,
  showTypeIcon = true,
  showNumber = true,
  showScrollbar = true,
  fullPeekEnabled = true,
  actionTooltip,
  onRequestPreview,
  bulkSelectedIds,
  onClipClick,
  onToggleBulkSelect,
  onRequestOcr,
  onColumnsChange,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1000);
  const [containerHeight, setContainerHeight] = useState(
    LAYOUT.FULL_HEIGHT - LAYOUT.CONTROL_BAR_HEIGHT
  );
  const gridRef = useRef<GridImperativeAPI>(null);

  // Full Mode Peek State
  const [peekClip, setPeekClip] = useState<ClipboardItem | null>(null);
  const [peekAnchor, setPeekAnchor] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekOriginMousePosRef = useRef<{ x: number; y: number } | null>(null);

  const closePeek = useCallback(() => {
    setPeekClip(null);
    setPeekAnchor(null);
    peekOriginMousePosRef.current = null;
    if (peekTimerRef.current) {
      clearTimeout(peekTimerRef.current);
      peekTimerRef.current = null;
    }
  }, []);

  const handleCardMouseEnter = useCallback(
    (e: React.MouseEvent, clip: ClipboardItem) => {
      if (!fullPeekEnabled || !!draggingClipId) return;

      // Cerrar peek si cambiamos a otro clip
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      setPeekClip((prev) => {
        if (prev && prev.id !== clip.id) {
          setPeekAnchor(null);
          return null;
        }
        return prev;
      });

      // No iniciar peek si el cursor está sobre un botón de acción
      const target = e.target as HTMLElement;
      if (target.closest('button')) return;

      // Evitar peek en textos, URLs o archivos individuales que caben perfectamente en la tarjeta
      const isTextOrFileType =
        clip.clip_type === 'text' ||
        clip.clip_type === 'code' ||
        clip.clip_type === 'url' ||
        clip.clip_type === 'html' ||
        clip.clip_type === 'rtf' ||
        clip.clip_type === 'file';
      const previewText = (clip.preview || clip.content || '').trim();
      const isShortContent =
        isTextOrFileType &&
        !previewText.includes('\n') &&
        !previewText.includes('\r') &&
        previewText.length <= 50;
      if (isShortContent) return;

      const cardEl =
        (e.currentTarget as HTMLElement).closest('[data-clip-id]') ||
        (e.currentTarget as HTMLElement);
      const rect = cardEl.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      peekOriginMousePosRef.current = { x: startX, y: startY };

      peekTimerRef.current = setTimeout(() => {
        setPeekClip(clip);
        setPeekAnchor({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
        peekOriginMousePosRef.current = { x: startX, y: startY };
      }, 750);
    },
    [fullPeekEnabled, draggingClipId]
  );

  const handleCardMouseLeave = useCallback(() => {
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
  }, []);

  // Al aparecer el peek en vista full, desaparece suavemente al mover el cursor o hacer scroll
  useEffect(() => {
    if (!peekClip) return;

    const origin = peekOriginMousePosRef.current;

    const onWindowMouseMove = (e: MouseEvent) => {
      if (origin) {
        const dist = Math.hypot(e.clientX - origin.x, e.clientY - origin.y);
        // Umbral de 6px para evitar jitter del sensor
        if (dist > 6) {
          closePeek();
        }
      } else {
        closePeek();
      }
    };

    const onWindowWheel = () => {
      closePeek();
    };

    const onWindowMouseDown = () => {
      closePeek();
    };

    window.addEventListener('mousemove', onWindowMouseMove, { passive: true });
    window.addEventListener('wheel', onWindowWheel, { passive: true });
    window.addEventListener('mousedown', onWindowMouseDown, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('wheel', onWindowWheel);
      window.removeEventListener('mousedown', onWindowMouseDown);
    };
  }, [peekClip, closePeek]);

  const isVertical = scrollDirection === 'vertical';

  useEffect(() => {
    let rafId: number;
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        const h = containerRef.current.offsetHeight;
        if (w > 0 && h > 0) {
          // Batch updates with requestAnimationFrame for smooth resizing
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
            setContainerWidth(w);
            setContainerHeight(h);
          });
        }
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateSize);
      observer.disconnect();
    };
  }, []);

  // Adaptive column count: fit as many ~CARD_WIDTH columns as the container allows.
  // In horizontal mode, every clip is its own column (single scrollable row).
  const effectiveCardWidth = BASE_CARD_WIDTH * gridScale;
  const effectiveRowHeight = Math.round(BASE_ROW_HEIGHT * gridScale);
  const columnCount = isVertical
    ? gridColumns > 0
      ? Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, gridColumns))
      : Math.min(
          MAX_COLUMNS,
          Math.max(MIN_COLUMNS, Math.floor(containerWidth / effectiveCardWidth))
        )
    : clips.length;

  const rowCount = isVertical ? Math.ceil(clips.length / columnCount) : 1;

  useEffect(() => {
    onColumnsChange?.(columnCount);
  }, [columnCount, onColumnsChange]);

  const selectedClipIndex = clips.findIndex((c) => c.id === selectedClipId);

  useEffect(() => {
    if (gridRef.current && selectedClipIndex >= 0) {
      if (isVertical) {
        const rowIndex = Math.floor(selectedClipIndex / columnCount);
        gridRef.current.scrollToCell({
          rowIndex,
          columnIndex: selectedClipIndex % columnCount,
          rowAlign: 'smart',
        });
      } else {
        gridRef.current.scrollToCell({
          columnIndex: selectedClipIndex,
          rowIndex: 0,
          columnAlign: 'smart',
        });
      }
    }
  }, [selectedClipIndex, isVertical, columnCount]);

  // Reset scroll position on view change or data refresh
  useEffect(() => {
    if (containerRef.current) {
      const scrollable = containerRef.current.querySelector('.no-scrollbar');
      if (scrollable) {
        scrollable.scrollTop = 0;
        scrollable.scrollLeft = 0;
      }
    }
    if (gridRef.current?.element) {
      gridRef.current.element.scrollTop = 0;
      gridRef.current.element.scrollLeft = 0;
    }
  }, [resetToken, isVertical]);

  const handleCellsRendered = (visibleCells: any) => {
    const lastIndex = isVertical
      ? visibleCells.rowStopIndex * columnCount
      : visibleCells.columnStopIndex;
    if (lastIndex >= clips.length - (isVertical ? columnCount * 2 : 2)) {
      onLoadMore();
    }
  };

  const SIDE_PADDING = 16; // Align with search and close buttons
  const usableWidth = containerWidth - SIDE_PADDING;

  const Cell = ({ columnIndex, rowIndex, style }: CellComponentProps) => {
    const index = isVertical ? rowIndex * columnCount + columnIndex : columnIndex;
    const clip = clips[index];
    if (!clip) return null;

    // Width is derived from the actual column layout (see Grid columnWidth below)
    const cellWidth = style.width;

    const calculatedStyle = {
      ...style,
      left: isVertical ? (style.left as number) + SIDE_PADDING / 2 : style.left,
      width: cellWidth,
    };

    return (
      <div
        data-el="clip-cell"
        data-clip-cell-id={clip.id}
        style={calculatedStyle}
        className={clsx('flex items-center justify-center px-2', isVertical ? 'py-3' : 'h-full')}
      >
        <ClipCard
          clip={clip}
          clipIndex={clipNumbering === 'positional' ? index + 1 : clips.length - index}
          isSelected={selectedClipId === clip.id}
          isBulkSelected={bulkSelectedIds?.has(clip.id)}
          onToggleBulkSelect={onToggleBulkSelect ? () => onToggleBulkSelect(clip.id) : undefined}
          onCardClick={(e) => onClipClick?.(clip.id, e)}
          onPaste={() => onPaste(clip.id)}
          onDragStart={onDragStart}
          onContextMenu={(e: React.MouseEvent) => onCardContextMenu?.(e, clip.id)}
          reorderDropIndicator={reorderTargetClipId === clip.id ? reorderTargetPosition : null}
          reorderEnabled={reorderEnabled}
          isDragging={draggingClipId === clip.id}
          onPreview={onRequestPreview ? () => onRequestPreview(clip.id) : undefined}
          onRunOcr={onRequestOcr ? () => onRequestOcr(clip.id) : undefined}
          showSourceIcon={showSourceIcon}
          showTime={showTime}
          showTypeIcon={showTypeIcon}
          showNumber={showNumber}
          actionTooltip={peekClip ? undefined : actionTooltip}
          onCardMouseEnter={handleCardMouseEnter}
          onCardMouseLeave={handleCardMouseLeave}
        />
      </div>
    );
  };

  if (isLoading && clips.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-sm text-muted-foreground">{t('clipList.loadingClips')}</p>
        </div>
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <h3 className="mb-2 text-lg font-semibold text-gray-400">{t('clipList.empty')}</h3>
        <p className="max-w-xs text-sm text-gray-500">{t('clipList.emptyDesc')}</p>
      </div>
    );
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (!isVertical && containerRef.current) {
      const scrollable = containerRef.current.querySelector('.no-scrollbar');
      if (scrollable && e.deltaY !== 0) {
        if (typeof scrollable.scrollBy === 'function') {
          scrollable.scrollBy({ left: e.deltaY, behavior: 'auto' });
        } else {
          scrollable.scrollLeft += e.deltaY;
        }
      }
    }
  };

  const gridHeight = containerHeight;

  return (
    <div
      ref={containerRef}
      data-clip-list="true"
      className="h-full w-full flex-1 overflow-hidden"
      onWheel={handleWheel}
    >
      <Grid
        data-el="clip-list"
        cellComponent={Cell}
        cellProps={{}}
        className={clsx('no-scrollbar', showScrollbar && 'full-mode-scrollbar')}
        style={{
          height: gridHeight,
          width: containerWidth,
          scrollBehavior: 'smooth',
          position: 'relative',
          overflowX: isVertical ? 'hidden' : 'auto',
        }}
        defaultHeight={gridHeight}
        defaultWidth={containerWidth}
        gridRef={gridRef}
        rowCount={rowCount}
        rowHeight={isVertical ? effectiveRowHeight : Math.round(180 * gridScale)}
        columnCount={columnCount}
        columnWidth={isVertical ? usableWidth / columnCount : effectiveCardWidth}
        overscanCount={4}
        onCellsRendered={handleCellsRendered}
      />

      {/* Full Mode Expanded Hover Peek Popover */}
      <FullPeek
        clip={peekClip}
        anchorRect={peekAnchor}
        resolveImageSrc={resolveImageSrc}
        onClose={closePeek}
      />
    </div>
  );
};
