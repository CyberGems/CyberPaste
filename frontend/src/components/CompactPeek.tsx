import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardItem } from '../types';

interface CompactPeekProps {
  clip: ClipboardItem | null;
  anchorRect: { x: number; y: number; width: number; height: number } | null;
  sidebarWidth: number;
  resolveImageSrc: (content: string) => string;
  onCopy?: (id: string) => void;
  onPin?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const PEEK_MAX_HEIGHT = 280;
const VIEWPORT_MARGIN = 12;

export const CompactPeek: React.FC<CompactPeekProps> = ({
  clip,
  anchorRect,
  sidebarWidth,
  resolveImageSrc,
  onClose,
}) => {
  const { t } = useTranslation();
  const visible = Boolean(clip && anchorRect);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    if (visible) {
      window.addEventListener('keydown', handleEsc, true);
      return () => window.removeEventListener('keydown', handleEsc, true);
    }
  }, [visible, onClose]);

  if (!clip || !anchorRect) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Horizontal: Align with the list area (right of the sidebar), clamp to max 380px
  const width = Math.min(380, vw - sidebarWidth - 16);
  const left = sidebarWidth + 8;

  // Vertical: Try to show above the row; if not enough space, show below
  const spaceAbove = anchorRect.y;
  const spaceBelow = vh - (anchorRect.y + anchorRect.height);
  const showAbove = spaceAbove >= PEEK_MAX_HEIGHT + VIEWPORT_MARGIN || spaceAbove > spaceBelow;

  const style: React.CSSProperties = {
    left,
    width,
  };

  const sourceRowPadding = 2;
  const sourceRowTop = Math.max(0, anchorRect.y - sourceRowPadding);
  const sourceRowBottom = Math.min(vh, anchorRect.y + anchorRect.height + sourceRowPadding);
  const compactHeaderHeight = 48;
  const topBlurHeight = Math.max(0, sourceRowTop - compactHeaderHeight);

  let calculatedMaxHeight = PEEK_MAX_HEIGHT;
  if (showAbove) {
    style.bottom = vh - anchorRect.y + 4;
    calculatedMaxHeight = Math.min(PEEK_MAX_HEIGHT, anchorRect.y - VIEWPORT_MARGIN - 4);
  } else {
    style.top = anchorRect.y + anchorRect.height + 4;
    calculatedMaxHeight = Math.min(
      PEEK_MAX_HEIGHT,
      vh - (anchorRect.y + anchorRect.height) - VIEWPORT_MARGIN - 4
    );
  }

  const isImage = clip.clip_type === 'image';
  const textToShow = (clip.preview || clip.content || '').slice(0, 2000);
  const imageSrc = isImage ? resolveImageSrc(clip.content || clip.image_path || '') : '';

  // Parse image metadata
  const imageMeta = (() => {
    if (clip.clip_type !== 'image' || !clip.metadata) return null;
    try {
      return JSON.parse(clip.metadata) as {
        size_bytes?: number;
        width?: number;
        height?: number;
      };
    } catch {
      return null;
    }
  })();

  const infoLabel = (() => {
    if (clip.clip_type === 'image') {
      if (imageMeta) {
        const sizeKB = imageMeta.size_bytes ? (imageMeta.size_bytes / 1024).toFixed(1) : '0';
        return t('clipList.imageSize', {
          width: imageMeta.width || 0,
          height: imageMeta.height || 0,
          size: sizeKB,
        });
      }
      return t('common.image');
    }
    const len = clip.content_length || clip.content?.length || 0;
    return t('clipList.textLength', { count: len });
  })();

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            key="peek-backdrop-top"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="pointer-events-none fixed inset-x-0 top-12 z-[90] bg-background/[0.24] backdrop-blur-[20px]"
            style={{ height: topBlurHeight }}
          />
          <motion.div
            key="peek-backdrop-bottom"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] bg-background/[0.24] backdrop-blur-[20px]"
            style={{ top: sourceRowBottom }}
          />
          <motion.div
            key={`peek-${clip.id}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.08, ease: 'easeOut' }}
            className="fixed z-[100]"
            style={style}
            onMouseLeave={onClose}
          >
            <div
              className="flex w-full flex-col overflow-hidden rounded-xl border border-primary/40 bg-popover shadow-[0_0_20px_rgba(var(--primary-rgb),0.18),0_12px_32px_rgba(0,0,0,0.5)]"
              style={{ maxHeight: calculatedMaxHeight }}
            >
              {/* Header info bar */}
              <div className="flex h-8 flex-shrink-0 items-center justify-between border-b border-primary/20 bg-muted/60 px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="rounded-md border border-primary/30 bg-background/50 px-1.5 py-0.5 text-[9px] font-semibold tracking-widest text-primary/90">
                    {t(`clipType.${clip.clip_type}`)}
                  </span>
                  <span className="truncate font-mono text-[9px] text-muted-foreground/90">
                    {infoLabel}
                  </span>
                </div>
              </div>

              {/* Content */}
              {isImage ? (
                imageSrc ? (
                  <div
                    className="checkerboard-bg relative flex w-full items-center justify-center overflow-hidden"
                    style={{ maxHeight: calculatedMaxHeight - 32 }}
                  >
                    <img
                      src={imageSrc}
                      alt="preview"
                      className="block max-h-full max-w-full object-contain"
                      style={{ maxHeight: calculatedMaxHeight - 32 }}
                    />
                  </div>
                ) : (
                  <div className="p-3">
                    <p className="text-[11px] italic text-muted-foreground">{t('common.image')}</p>
                  </div>
                )
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {textToShow ? (
                    <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground/90">
                      {textToShow}
                    </pre>
                  ) : (
                    <p className="text-[11px] italic text-muted-foreground">
                      {t('common.loading')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
