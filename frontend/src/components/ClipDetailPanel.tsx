import React, { useState } from 'react';
import {
  X,
  Copy,
  Image as ImageIcon,
  Trash2,
  Pin,
  PinOff,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  de as dfDe,
  enUS,
  es as dfEs,
  fr as dfFr,
  ja as dfJa,
  zhCN as dfZh,
} from 'date-fns/locale';
import { ClipboardItem, FolderItem, CLIP_TYPE_LABELS, type ClipType } from '../types';
import Tooltip from './Tooltip';

const localeMap: Record<string, any> = {
  de: dfDe,
  en: enUS,
  es: dfEs,
  fr: dfFr,
  ja: dfJa,
  zh: dfZh,
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

interface ClipDetailPanelProps {
  clip: ClipboardItem | null;
  folders: FolderItem[];
  pinDisabled?: boolean;
  onClose: () => void;
  onCopy: (id: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">
      {label}
    </span>
    {value}
  </div>
);

/** Collapsible right-edge clip detail panel: can narrow to a thin vertical tab. */
export const ClipDetailPanel: React.FC<ClipDetailPanelProps> = ({
  clip,
  folders,
  pinDisabled = false,
  onClose,
  onCopy,
  onPin,
  onDelete,
  onPreview,
}) => {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const locale = localeMap[(i18n.language || 'en').substring(0, 2)] || enUS;

  if (!clip) return null;

  return (
    <AnimatePresence mode="wait">
      {expanded ? (
        <motion.div
          key="expanded"
          data-el="clip-detail-panel"
          initial={{ x: 280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 280, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="absolute right-2 top-16 z-30 flex h-[calc(100%-4.5rem)] w-72 flex-col overflow-hidden rounded-xl border border-white/10 bg-card/95 shadow-2xl backdrop-blur-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 bg-black/25 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Tooltip label={t('detailPanel.collapse')} placement="left">
                <button
                  onClick={() => setExpanded(false)}
                  className="rounded-md p-0.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Collapse detail panel"
                >
                  <ChevronRight size={14} />
                </button>
              </Tooltip>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-300/90">
                {t('detailPanel.title')}
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close details panel"
            >
              <X size={14} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {/* Type */}
            <DetailRow
              label={t('detailPanel.type')}
              value={
                <span className="bg-white/8 inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white/80">
                  {CLIP_TYPE_LABELS[clip.clip_type as ClipType] || clip.clip_type.toUpperCase()}
                </span>
              }
            />
            {/* Source App */}
            {clip.source_app && (
              <DetailRow
                label={t('detailPanel.sourceApp')}
                value={
                  <span className="flex items-center gap-1.5">
                    {clip.source_icon && (
                      <img
                        src={`data:image/png;base64,${clip.source_icon}`}
                        alt=""
                        className="h-3.5 w-3.5 rounded-sm object-contain"
                      />
                    )}
                    <span className="text-xs text-white/90">{clip.source_app}</span>
                  </span>
                }
              />
            )}
            {/* Created */}
            <DetailRow
              label={t('detailPanel.created')}
              value={
                <span className="text-xs text-white/90">
                  {format(new Date(clip.created_at), 'PPpp', { locale })}
                </span>
              }
            />
            {/* Folder */}
            <DetailRow
              label={t('detailPanel.folder')}
              value={
                <span className="text-xs text-white/90">
                  {clip.folder_id
                    ? folders.find((f) => f.id === clip.folder_id)?.name || clip.folder_id
                    : t('folders.mainClipboard')}
                </span>
              }
            />
            {/* Size */}
            <DetailRow
              label={t('detailPanel.size')}
              value={
                <span className="font-mono text-xs text-white/90">
                  {formatBytes(clip.content_length)}
                </span>
              }
            />
            {/* Pinned */}
            {clip.is_pinned && (
              <DetailRow
                label={t('detailPanel.pinned')}
                value={<span className="text-xs text-cyan-300">{t('common.yes')}</span>}
              />
            )}
            {/* OCR preview for images */}
            {clip.clip_type === 'image' &&
              clip.metadata &&
              (() => {
                try {
                  const p = JSON.parse(clip.metadata) as { ocr_text?: string };
                  if (!p?.ocr_text) return null;
                  return (
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">
                        {t('detailPanel.extractedText')}
                      </div>
                      <div className="max-h-24 overflow-y-auto whitespace-pre-wrap rounded border border-white/5 bg-black/30 p-2 text-[10px] leading-snug text-white/70">
                        {p.ocr_text.substring(0, 250)}
                        {p.ocr_text.length > 250 && '…'}
                      </div>
                    </div>
                  );
                } catch {
                  return null;
                }
              })()}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-around border-t border-white/5 bg-black/25 px-2 py-2">
            <Tooltip label={t('contextMenu.copy')} placement="top">
              <button
                onClick={() => onCopy(clip.id)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Copy size={14} />
              </button>
            </Tooltip>
            {clip.clip_type === 'image' && (
              <Tooltip label={t('contextMenu.view')} placement="top">
                <button
                  onClick={() => onPreview(clip.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <ImageIcon size={14} />
                </button>
              </Tooltip>
            )}
            <Tooltip
              label={
                pinDisabled
                  ? t('toasts.cannotPinLatestClip')
                  : clip.is_pinned
                    ? t('contextMenu.unpin')
                    : t('contextMenu.pin')
              }
              placement="top"
            >
              <button
                onClick={() => onPin(clip.id)}
                disabled={pinDisabled}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white/10 ${
                  pinDisabled
                    ? 'cursor-not-allowed text-white/25'
                    : clip.is_pinned
                      ? 'text-cyan-400'
                      : 'text-white/50 hover:text-white'
                }`}
              >
                {clip.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
              </button>
            </Tooltip>
            <Tooltip label={t('contextMenu.delete')} placement="top">
              <button
                onClick={() => {
                  onDelete(clip.id);
                  onClose();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md text-rose-400/70 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
              >
                <Trash2 size={14} />
              </button>
            </Tooltip>
          </div>
        </motion.div>
      ) : (
        /* Collapsed state: thin tab on the right edge */
        <motion.div
          key="collapsed"
          initial={{ x: 32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 32, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        >
          <Tooltip label={t('detailPanel.expand')} placement="left">
            <button
              onClick={() => setExpanded(true)}
              className="absolute right-2 top-16 z-30 flex h-[calc(100%-4.5rem)] w-8 flex-col items-center justify-center gap-1.5 rounded-l-xl border border-r-0 border-white/10 bg-card/95 text-white/40 shadow-2xl backdrop-blur-md transition-colors hover:bg-white/5 hover:text-cyan-300"
              aria-label="Expand detail panel"
            >
              <ChevronLeft size={14} />
              <span
                className="select-none text-[9px] font-bold uppercase tracking-wider opacity-70"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                {t('detailPanel.title')}
              </span>
            </button>
          </Tooltip>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
