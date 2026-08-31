import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardItem } from '../types';

interface FullPeekProps {
  clip: ClipboardItem | null;
  anchorRect: { x: number; y: number; width: number; height: number } | null;
  resolveImageSrc: (content: string) => string;
  onClose: () => void;
}

const VIEWPORT_MARGIN = 16;

export const FullPeek: React.FC<FullPeekProps> = ({
  clip,
  anchorRect,
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

  const isImage = clip.clip_type === 'image';
  const textToShow = (clip.content || clip.preview || '').slice(0, 4000);
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

  const maxAvailableW = Math.min(1080, vw - VIEWPORT_MARGIN * 2);
  const maxAvailableH = Math.min(680, vh - VIEWPORT_MARGIN * 2);

  let width = Math.min(680, maxAvailableW);
  let calculatedMaxHeight = Math.min(460, maxAvailableH);

  if (isImage && imageMeta?.width && imageMeta?.height) {
    const rawW = imageMeta.width;
    const rawH = imageMeta.height;
    const headerHeight = 36;
    const padding = 16;
    const maxImgW = maxAvailableW - padding;
    const maxImgH = maxAvailableH - headerHeight - padding;

    // Calculate proportional fit without massive empty letterboxing
    const scale = Math.min(maxImgW / rawW, maxImgH / rawH, 1.0);
    const fitW = Math.round(rawW * scale);
    const fitH = Math.round(rawH * scale);

    // Expand width to fit the image naturally
    width = Math.max(340, Math.min(maxAvailableW, fitW + padding));
    calculatedMaxHeight = Math.max(220, Math.min(maxAvailableH, fitH + headerHeight + padding));
  }

  // Centering on card with viewport clamping
  const cardCenterX = anchorRect.x + anchorRect.width / 2;
  let left = cardCenterX - width / 2;
  if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
  if (left + width > vw - VIEWPORT_MARGIN) left = vw - VIEWPORT_MARGIN - width;

  // Space above vs space below
  const spaceAbove = anchorRect.y;
  const spaceBelow = vh - (anchorRect.y + anchorRect.height);
  const showAbove =
    spaceAbove >= calculatedMaxHeight + VIEWPORT_MARGIN ||
    (spaceAbove > spaceBelow && spaceBelow < calculatedMaxHeight);

  const style: React.CSSProperties = {
    left,
    width,
  };

  if (showAbove) {
    style.bottom = vh - anchorRect.y + 8;
  } else {
    style.top = anchorRect.y + anchorRect.height + 8;
  }

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
          {/* Subtle dimming backdrop overlay */}
          <motion.div
            key="full-peek-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className="pointer-events-none fixed inset-0 z-[90] bg-background/30 backdrop-blur-[3px]"
          />

          {/* Peek Popover Container */}
          <motion.div
            key={`full-peek-${clip.id}`}
            initial={{ opacity: 0, scale: 0.96, y: showAbove ? 8 : -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: showAbove ? 8 : -8 }}
            transition={{ duration: 0.09, ease: 'easeOut' }}
            className="fixed z-[100]"
            style={style}
          >
            <div
              className="flex w-full flex-col overflow-hidden rounded-2xl border border-primary/45 bg-popover shadow-[0_0_35px_rgba(var(--primary-rgb),0.25),0_20px_50px_rgba(0,0,0,0.7)]"
              style={{ maxHeight: calculatedMaxHeight }}
            >
              {/* Header Info Bar */}
              <div className="flex h-9 flex-shrink-0 items-center justify-between border-b border-primary/20 bg-muted/70 px-4 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="rounded-md border border-primary/35 bg-primary/10 px-2 py-0.5 text-[9.5px] font-semibold tracking-widest text-primary">
                    {t(`clipType.${clip.clip_type}`)}
                  </span>
                  <span className="truncate font-mono text-[10px] text-foreground/80">
                    {infoLabel}
                  </span>
                  {clip.source_app && (
                    <span className="truncate text-[9.5px] text-muted-foreground/75 opacity-90">
                      • {clip.source_app}
                    </span>
                  )}
                </div>
              </div>

              {/* Content Preview */}
              {isImage ? (
                imageSrc ? (
                  <div
                    className="checkerboard-bg relative flex w-full items-center justify-center overflow-hidden p-2"
                    style={{ maxHeight: calculatedMaxHeight - 36 }}
                  >
                    <img
                      src={imageSrc}
                      alt="preview"
                      className="block max-h-full max-w-full rounded-lg object-contain shadow-md"
                      style={{ maxHeight: calculatedMaxHeight - 52 }}
                    />
                  </div>
                ) : (
                  <div className="p-4">
                    <p className="text-[12px] italic text-muted-foreground">{t('common.image')}</p>
                  </div>
                )
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {textToShow ? (
                    <pre className="whitespace-pre-wrap break-words font-mono text-[11.5px] leading-relaxed text-foreground/95 select-text">
                      {textToShow}
                    </pre>
                  ) : (
                    <p className="text-[12px] italic text-muted-foreground">
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
