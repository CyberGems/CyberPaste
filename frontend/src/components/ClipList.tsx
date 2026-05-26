import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import { Grid, GridImperativeAPI, CellComponentProps } from 'react-window';
import { ClipCard } from './ClipCard';
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
  onCopy: (id: string) => void;
  onDragStart: (clipId: string, startX: number, startY: number) => void;
  selectedClipId: string | null;
  selectedFolder?: string | null;
  onCardContextMenu?: (e: React.MouseEvent, id: string) => void;
  resetToken?: number;
  viewMode?: 'full' | 'compact';
  scrollDirection?: 'horizontal' | 'vertical';
  reorderTargetClipId?: string | null;
  reorderTargetPosition?: 'before' | 'after' | null;
  reorderEnabled?: boolean;
  draggingClipId?: string | null;
  clipNumbering?: 'positional' | 'countdown';
}

export const ClipList: React.FC<ClipListProps> = ({
  clips,
  isLoading,
  onLoadMore,
  onPaste,
  onCopy,
  onDragStart,
  selectedClipId,
  selectedFolder,
  onCardContextMenu,
  resetToken = 0,
  scrollDirection = 'vertical',
  reorderTargetClipId,
  reorderTargetPosition,
  reorderEnabled,
  draggingClipId,
  clipNumbering = 'positional',
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1000);
  const [containerHeight, setContainerHeight] = useState(
    LAYOUT.FULL_HEIGHT - LAYOUT.CONTROL_BAR_HEIGHT
  );
  const gridRef = useRef<GridImperativeAPI>(null);

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

  // Force 6 columns in vertical mode if enough space, or calculate precisely
  const columnCount = isVertical ? 6 : clips.length;

  const rowCount = isVertical ? Math.ceil(clips.length / columnCount) : 1;

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

  const Cell = ({ columnIndex, rowIndex, style }: CellComponentProps) => {
    const index = isVertical ? rowIndex * columnCount + columnIndex : columnIndex;
    const clip = clips[index];
    if (!clip) return null;

    // Calculate dynamic padding/width to ensure 6 columns fit perfectly with side padding
    const usableWidth = containerWidth - SIDE_PADDING;
    const cellWidth = isVertical ? usableWidth / columnCount : style.width;

    const calculatedStyle = {
      ...style,
      left: isVertical ? (style.left as number) + SIDE_PADDING / 2 : style.left,
      width: cellWidth,
    };

    return (
      <div
        data-el="clip-cell"
        data-clip-id={clip.id}
        style={calculatedStyle}
        className={clsx('flex items-center justify-center px-2', isVertical ? 'py-3' : 'h-full')}
      >
        <ClipCard
          clip={clip}
          clipIndex={clipNumbering === 'positional' ? index + 1 : clips.length - index}
          isLatest={index === 0 && !selectedFolder}
          isSelected={selectedClipId === clip.id}
          onPaste={() => onPaste(clip.id)}
          onCopy={() => onCopy(clip.id)}
          onDragStart={onDragStart}
          onContextMenu={(e: React.MouseEvent) => onCardContextMenu?.(e, clip.id)}
          reorderDropIndicator={reorderTargetClipId === clip.id ? reorderTargetPosition : null}
          reorderEnabled={reorderEnabled}
          isDragging={draggingClipId === clip.id}
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
    <div ref={containerRef} className="h-full w-full flex-1 overflow-hidden" onWheel={handleWheel}>
      <Grid
        data-el="clip-list"
        cellComponent={Cell}
        cellProps={{}}
        className="no-scrollbar"
        style={{
          height: gridHeight,
          width: containerWidth,
          scrollBehavior: 'smooth',
          position: 'relative',
        }}
        defaultHeight={gridHeight}
        defaultWidth={containerWidth}
        gridRef={gridRef}
        rowCount={rowCount}
        rowHeight={isVertical ? 230 : 180}
        columnCount={columnCount}
        columnWidth={isVertical ? (containerWidth - SIDE_PADDING) / columnCount : (containerWidth - SIDE_PADDING) / 6}
        overscanCount={4}
        onCellsRendered={handleCellsRendered}
      />
    </div>
  );
};
