import React, { useState, useEffect, useRef } from 'react';
import { Copy, Pin, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardItem } from '../types';
import Tooltip from './Tooltip';

interface CompactPeekProps {
  clip: ClipboardItem | null;
  anchorRect: { x: number; y: number; width: number; height: number } | null;
  sidebarWidth: number;
  resolveImageSrc: (content: string) => string;
  onCopy: (id: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const PEEK_MAX_HEIGHT = 280;
const VIEWPORT_MARGIN = 8;

export const CompactPeek: React.FC<CompactPeekProps> = ({
  clip,
  anchorRect,
  sidebarWidth,
  resolveImageSrc,
  onCopy,
  onPin,
  onDelete,
  onClose,
}) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (clip && anchorRect) {
      timerRef.current = setTimeout(() => setVisible(true), 400);
    } else {
      setVisible(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setVisible(false);
    };
  }, [clip?.id, anchorRect?.x, anchorRect?.y]);

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
  const top = showAbove ? anchorRect.y - 4 : anchorRect.y + anchorRect.height + 4;
  const translateY = showAbove ? '-100%' : '0';

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
        <motion.div
          key={`peek-${clip.id}`}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.08, ease: 'easeOut' }}
          className="fixed z-[100]"
          style={{
            left,
            top,
            width,
            transform: `translateY(${translateY})`,
          }}
          onMouseLeave={onClose}
        >
          <div
            className="flex w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-popover/90 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.65)]"
            style={{ maxHeight: PEEK_MAX_HEIGHT }}
          >
            {/* Header info bar */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-white/5 bg-white/5 px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase text-white/50">
              <span className="text-cyan-400 font-bold">{t(`clipType.${clip.clip_type}`)}</span>
              <span className="font-mono text-[9px] opacity-80">{infoLabel}</span>
            </div>

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {isImage ? (
                imageSrc ? (
                  <div className="flex h-44 items-center justify-center overflow-hidden rounded-lg bg-white/5 border border-white/5 p-1">
                    <img
                      src={imageSrc}
                      alt="preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <p className="text-[11px] italic text-white/40">{t('common.image')}</p>
                )
              ) : textToShow ? (
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-white/85">
                  {textToShow}
                </pre>
              ) : (
                <p className="text-[11px] italic text-white/40">{t('common.loading')}</p>
              )}
            </div>

            {/* Action bar */}
            <div className="flex flex-shrink-0 items-center justify-between border-t border-white/5 bg-black/60 px-2 py-1">
              <div className="flex items-center gap-0.5">
                <Tooltip label={t('compact.peekCopy')} placement="top">
                  <button
                    onClick={() => {
                      onCopy(clip.id);
                      onClose();
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <Copy size={13} />
                  </button>
                </Tooltip>
                <Tooltip
                  label={clip.is_pinned ? t('compact.peekUnpin') : t('compact.peekPin')}
                  placement="top"
                >
                  <button
                    onClick={() => {
                      onPin(clip.id);
                      onClose();
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <Pin size={13} className={clip.is_pinned ? 'fill-current text-cyan-400' : ''} />
                  </button>
                </Tooltip>
              </div>
              <Tooltip label={t('compact.peekDelete')} placement="top">
                <button
                  onClick={() => {
                    onDelete(clip.id);
                    onClose();
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded text-rose-400/60 hover:bg-rose-500/15 hover:text-rose-300"
                >
                  <Trash2 size={13} />
                </button>
              </Tooltip>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
