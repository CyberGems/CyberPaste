import React, { useEffect, useRef, useState, useCallback } from 'react';
// @ts-ignore
import { Grid, GridImperativeAPI, CellComponentProps } from 'react-window';
import { listen } from '@tauri-apps/api/event';
import { ClipCard } from './ClipCard';
import { FullPeek } from './FullPeek';
import { resolveImageSrc } from '../utils/image';
import { ClipboardItem, type ClipFilterCategory } from '../types';
import { LAYOUT } from '../constants';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { usePeekPointerArm } from '../hooks/usePeekPointerArm';
import { isListHoverLocked, subscribeListHoverLock } from '../hooks/useListHoverLock';
import { SEARCH_HISTORY_EVENT } from './SearchHistoryMenu';

interface ClipListProps {
  clips: ClipboardItem[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onPaste: (id: string, forcePaste?: boolean) => void;
  onCopy?: (id: string) => void;
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
  emptyLabel?: string;
  emptyDescription?: string;
  actionTooltip?: string;
  singleClickPaste?: boolean;
  onRequestPreview?: (id: string) => void;
  bulkSelectedIds?: Set<string>;
  onBulkSelectChange?: (ids: Set<string>) => void;
  onClipClick?: (id: string, e: React.MouseEvent) => void;
  onToggleBulkSelect?: (id: string) => void;
  onRequestOcr?: (id: string) => void;
  onColumnsChange?: (columns: number) => void;
  onFilterByApp?: (app: string) => void;
  onFilterByType?: (type: ClipFilterCategory) => void;
  typeFilter?: string;
  cardFormat?: 'square' | 'panoramic';
}

const BASE_CARD_WIDTH = 230;
const BASE_CARD_WIDTH_PANORAMIC = 250;
const BASE_ROW_HEIGHT = 230;
const MIN_COLUMNS = 2;
const MAX_COLUMNS = 12;

export const ClipList: React.FC<ClipListProps> = ({
  clips,
  isLoading,
  onLoadMore,
  onPaste,
  onCopy,
  onDragStart,
  selectedClipId,
  onCardContextMenu,
  onFilterByApp,
  onFilterByType,
  typeFilter,
  cardFormat = 'square',
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
  emptyLabel,
  emptyDescription,
  actionTooltip,
  singleClickPaste = true,
  onRequestPreview,
  bulkSelectedIds,
  onBulkSelectChange,
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
  const searchHistoryOpenRef = useRef(false);

  // Marquee Selection State for dead-zone dragging
  const onBulkSelectChangeRef = useRef(onBulkSelectChange);
  useEffect(() => {
    onBulkSelectChangeRef.current = onBulkSelectChange;
  }, [onBulkSelectChange]);

  const bulkSelectedIdsRef = useRef(bulkSelectedIds);
  useEffect(() => {
    bulkSelectedIdsRef.current = bulkSelectedIds;
  }, [bulkSelectedIds]);

  const marqueeStateRef = useRef<{
    active: boolean;
    hasDragged: boolean;
    startX: number;
    startY: number;
    initialSelectedIds: Set<string>;
    isAdditive: boolean;
  }>({
    active: false,
    hasDragged: false,
    startX: 0,
    startY: 0,
    initialSelectedIds: new Set(),
    isAdditive: false,
  });

  const [marqueeBox, setMarqueeBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const closePeek = useCallback(() => {
    setPeekClip(null);
    setPeekAnchor(null);
    peekOriginMousePosRef.current = null;
    if (peekTimerRef.current) {
      clearTimeout(peekTimerRef.current);
      peekTimerRef.current = null;
    }
  }, []);
  const { armedRef: peekArmedRef, notePointer: notePeekPointer } = usePeekPointerArm(closePeek);

  useEffect(
    () =>
      subscribeListHoverLock((locked) => {
        if (locked) closePeek();
      }),
    [closePeek]
  );

  useEffect(() => {
    const handleSearchHistory = (event: Event) => {
      const isOpen = (event as CustomEvent<{ open?: boolean }>).detail?.open;
      searchHistoryOpenRef.current = Boolean(isOpen);
      if (isOpen) closePeek();
    };

    window.addEventListener(SEARCH_HISTORY_EVENT, handleSearchHistory);
    return () => window.removeEventListener(SEARCH_HISTORY_EVENT, handleSearchHistory);
  }, [closePeek]);

  const handleCancelPeek = useCallback(() => {
    if (peekTimerRef.current) {
      clearTimeout(peekTimerRef.current);
      peekTimerRef.current = null;
    }
    closePeek();
  }, [closePeek]);

  const handleCardMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[data-el="clip-card-hover-actions"]')) {
        handleCancelPeek();
      }
    },
    [handleCancelPeek]
  );

  const handleCardMouseEnter = useCallback(
    (e: React.MouseEvent, clip: ClipboardItem) => {
      if (isListHoverLocked()) return;
      if (searchHistoryOpenRef.current) return;
      if (!fullPeekEnabled || !!draggingClipId) return;

      notePeekPointer(e.screenX, e.screenY);
      if (!peekArmedRef.current) return;

      // Cerrar peek si cambiamos a otro clip
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      setPeekClip((prev) => {
        if (prev && prev.id !== clip.id) {
          setPeekAnchor(null);
          return null;
        }
        return prev;
      });

      // No iniciar peek si el cursor está sobre un botón de acción o los botones flotantes
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[data-el="clip-card-hover-actions"]')) return;

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
        // Evitar activar peek si el cursor terminó posicionándose sobre un botón o los botones de acción
        const elUnderCursor = document.querySelector(':hover');
        if (
          elUnderCursor &&
          (elUnderCursor.closest('button') ||
            elUnderCursor.closest('[data-el="clip-card-hover-actions"]'))
        ) {
          return;
        }
        setPeekClip(clip);
        setPeekAnchor({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
        peekOriginMousePosRef.current = { x: startX, y: startY };
      }, 750);
    },
    [fullPeekEnabled, draggingClipId, notePeekPointer, peekArmedRef]
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

  // Global mousemove and mouseup listeners for marquee drag selection
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const state = marqueeStateRef.current;
      if (!state.active) return;

      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      const dist = Math.hypot(dx, dy);

      if (!state.hasDragged && dist < 5) {
        return;
      }

      if (!state.hasDragged) {
        state.hasDragged = true;
        closePeek();
      }

      const left = Math.min(state.startX, e.clientX);
      const top = Math.min(state.startY, e.clientY);
      const width = Math.abs(dx);
      const height = Math.abs(dy);

      setMarqueeBox({ left, top, width, height });

      const container = containerRef.current;
      if (!container) return;

      const boxRect = {
        left,
        top,
        right: left + width,
        bottom: top + height,
      };

      const cardElements = container.querySelectorAll<HTMLElement>('[data-clip-id]');
      const nextSelected = new Set<string>(state.initialSelectedIds);

      cardElements.forEach((cardEl) => {
        const clipId = cardEl.getAttribute('data-clip-id');
        if (!clipId) return;

        const cardRect = cardEl.getBoundingClientRect();
        const intersects = !(
          boxRect.left > cardRect.right ||
          boxRect.right < cardRect.left ||
          boxRect.top > cardRect.bottom ||
          boxRect.bottom < cardRect.top
        );

        if (intersects) {
          nextSelected.add(clipId);
        } else if (!state.isAdditive) {
          nextSelected.delete(clipId);
        }
      });

      onBulkSelectChangeRef.current?.(nextSelected);

      // Auto-scroll when dragging near top/bottom edges of the grid
      const scrollable = container.querySelector<HTMLElement>('.no-scrollbar');
      if (scrollable) {
        const cRect = container.getBoundingClientRect();
        if (e.clientY > cRect.bottom - 20) {
          scrollable.scrollTop += 10;
        } else if (e.clientY < cRect.top + 20) {
          scrollable.scrollTop -= 10;
        }
      }
    };

    const handleGlobalMouseUp = () => {
      const state = marqueeStateRef.current;
      if (!state.active) return;

      if (!state.hasDragged) {
        // Single click in dead-zone without dragging -> clear bulk selection
        if (!state.isAdditive) {
          onBulkSelectChangeRef.current?.(new Set());
        }
      }

      state.active = false;
      state.hasDragged = false;
      state.initialSelectedIds = new Set();
      setMarqueeBox(null);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [closePeek]);

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const container = containerRef.current;
    if (!container) return;

    // If click is inside an actual card face, only allow marquee if Shift key is pressed
    const cardInner = target.closest('[data-el="clip-card-inner"]');
    if (cardInner && !e.shiftKey) {
      return;
    }

    // Ignore scrollbar track clicks at the right edge
    const containerRect = container.getBoundingClientRect();
    if (e.clientX >= containerRect.right - 14) {
      return;
    }

    // Ignore interactive elements
    if (target.closest('input, textarea, button, select, [role="menu"]')) {
      return;
    }

    const isAdditive = e.ctrlKey || e.metaKey || e.shiftKey;
    const currentSelected = bulkSelectedIdsRef.current;
    marqueeStateRef.current = {
      active: true,
      hasDragged: false,
      startX: e.clientX,
      startY: e.clientY,
      initialSelectedIds: isAdditive && currentSelected ? new Set(currentSelected) : new Set(),
      isAdditive,
    };
    closePeek();
  };

  const isVertical = scrollDirection === 'vertical';

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let raf1 = 0;
    let raf2 = 0;
    let raf3 = 0;
    let visTimer: ReturnType<typeof setTimeout> | undefined;

    const updateSize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      // Tauri hide/show often reports 0 on a transient frame; keep the last good size.
      if (w <= 0 || h <= 0) return;
      cancelAnimationFrame(raf3);
      raf3 = requestAnimationFrame(() => {
        setContainerWidth((prev) => (prev === w ? prev : w));
        setContainerHeight((prev) => (prev === h ? prev : h));
      });
    };

    updateSize();
    raf1 = requestAnimationFrame(() => {
      updateSize();
      raf2 = requestAnimationFrame(updateSize);
    });

    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    window.addEventListener('resize', updateSize);

    const unlistenVis = listen<boolean>('window-visibility', (event) => {
      if (!event.payload) return;
      updateSize();
      requestAnimationFrame(() => {
        requestAnimationFrame(updateSize);
      });
      // Layout can settle a frame or two after the webview is shown again.
      clearTimeout(visTimer);
      visTimer = setTimeout(updateSize, 50);
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      cancelAnimationFrame(raf3);
      clearTimeout(visTimer);
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
      unlistenVis.then((f) => f());
    };
  }, [isLoading, clips.length]);

  // Adaptive column count: fit as many columns as the container allows.
  // In horizontal mode, every clip is its own column (single scrollable row).
  const isPanoramic = cardFormat === 'panoramic';
  const effectiveCardWidth =
    (isPanoramic ? BASE_CARD_WIDTH_PANORAMIC : BASE_CARD_WIDTH) * gridScale;
  const columnCount = isVertical
    ? gridColumns > 0
      ? Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, gridColumns))
      : Math.min(
          MAX_COLUMNS,
          Math.max(MIN_COLUMNS, Math.floor(containerWidth / effectiveCardWidth))
        )
    : clips.length;

  const SIDE_PADDING = 16; // Align with search and close buttons
  const usableWidth = containerWidth - SIDE_PADDING;

  const rowCount = isVertical ? Math.ceil(clips.length / columnCount) : 1;
  const calculatedColumnWidth = isVertical ? usableWidth / columnCount : effectiveCardWidth;
  const effectiveRowHeight = isVertical
    ? isPanoramic
      ? Math.max(120, Math.min(420, Math.round(calculatedColumnWidth * (9 / 16))))
      : Math.round(BASE_ROW_HEIGHT * gridScale)
    : Math.round((isPanoramic ? 145 : 180) * gridScale);

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
          behavior: 'smooth',
        });
      } else {
        gridRef.current.scrollToCell({
          columnIndex: selectedClipIndex,
          rowIndex: 0,
          columnAlign: 'smart',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedClipIndex, isVertical, columnCount]);

  // Reset scroll position on view change or data refresh
  useEffect(() => {
    if (containerRef.current) {
      const scrollable = containerRef.current.querySelector<HTMLElement>('.no-scrollbar');
      if (scrollable) {
        scrollable.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    }
    if (gridRef.current?.element) {
      gridRef.current.element.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [resetToken, isVertical, cardFormat]);

  const handleCellsRendered = (visibleCells: any) => {
    const lastIndex = isVertical
      ? visibleCells.rowStopIndex * columnCount
      : visibleCells.columnStopIndex;
    if (lastIndex >= clips.length - (isVertical ? columnCount * 2 : 2)) {
      onLoadMore();
    }
  };

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
          cardFormat={cardFormat}
          clipIndex={clipNumbering === 'positional' ? index + 1 : clips.length - index}
          isSelected={selectedClipId === clip.id}
          isBulkSelected={bulkSelectedIds?.has(clip.id)}
          onToggleBulkSelect={onToggleBulkSelect ? () => onToggleBulkSelect(clip.id) : undefined}
          onCardClick={(e) => onClipClick?.(clip.id, e)}
          onPaste={(forcePaste) => onPaste(clip.id, forcePaste)}
          onCopy={onCopy ? () => onCopy(clip.id) : undefined}
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
          singleClickPaste={singleClickPaste}
          onCardMouseEnter={handleCardMouseEnter}
          onCardMouseMove={handleCardMouseMove}
          onCardMouseLeave={handleCardMouseLeave}
          onCancelPeek={handleCancelPeek}
          onFilterByApp={onFilterByApp}
          onFilterByType={onFilterByType}
          typeFilter={typeFilter}
        />
      </div>
    );
  };

  const showLoading = isLoading && clips.length === 0;
  const showEmpty = !showLoading && clips.length === 0;

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
      className="h-full w-full flex-1 select-none overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleContainerMouseDown}
    >
      {showLoading ? (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            <p className="text-sm text-muted-foreground">{t('clipList.loadingClips')}</p>
          </div>
        </div>
      ) : showEmpty ? (
        <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
          <h3 className="mb-2 text-lg font-semibold text-gray-400">
            {emptyLabel ?? t('clipList.empty')}
          </h3>
          <p className="max-w-xs text-sm text-gray-500">
            {emptyDescription ??
              (emptyLabel ? t('clipList.noResultsDesc') : t('clipList.emptyDesc'))}
          </p>
        </div>
      ) : (
        <Grid
          data-el="clip-list"
          cellComponent={Cell}
          cellProps={{}}
          className={clsx('no-scrollbar', showScrollbar && 'full-mode-scrollbar')}
          style={{
            height: gridHeight,
            width: containerWidth,
            position: 'relative',
            overflowX: isVertical ? 'hidden' : 'auto',
          }}
          defaultHeight={gridHeight}
          defaultWidth={containerWidth}
          gridRef={gridRef}
          rowCount={rowCount}
          rowHeight={effectiveRowHeight}
          columnCount={columnCount}
          columnWidth={calculatedColumnWidth}
          overscanCount={4}
          onCellsRendered={handleCellsRendered}
        />
      )}

      {/* Full Mode Expanded Hover Peek Popover */}
      <FullPeek
        clip={peekClip}
        anchorRect={peekAnchor}
        resolveImageSrc={resolveImageSrc}
        onClose={closePeek}
      />

      {/* Marquee Selection Rectangle Overlay */}
      {marqueeBox && (
        <div
          data-el="marquee-selection-box"
          style={{
            position: 'fixed',
            left: marqueeBox.left,
            top: marqueeBox.top,
            width: marqueeBox.width,
            height: marqueeBox.height,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          className="rounded-[4px] border border-cyan-400/80 bg-cyan-500/15 shadow-[0_0_14px_rgba(34,211,238,0.3)] backdrop-blur-[0.5px]"
        />
      )}
    </div>
  );
};
