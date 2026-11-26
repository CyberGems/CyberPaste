import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  X,
  Copy,
  Image as ImageIcon,
  Trash2,
  Pin,
  PinOff,
  ChevronRight,
  ChevronLeft,
  File as FileIcon,
  Loader2,
  Maximize2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
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
import { resolveImageSrc } from '../utils/image';
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
  selectedCount?: number;
  canNavigatePrevious?: boolean;
  canNavigateNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  pinDisabled?: boolean;
  onClose: () => void;
  onCopy: (id: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80 dark:text-white/40">
      {label}
    </span>
    {value}
  </div>
);

/** Full-mode clip details with preview and list navigation. */
export const ClipDetailPanel: React.FC<ClipDetailPanelProps> = ({
  clip,
  folders,
  selectedCount = 1,
  canNavigatePrevious = false,
  canNavigateNext = false,
  onPrevious,
  onNext,
  pinDisabled = false,
  onClose,
  onCopy,
  onPin,
  onDelete,
  onPreview,
}) => {
  const { t, i18n } = useTranslation();
  const [loadedClip, setLoadedClip] = useState<ClipboardItem | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const locale = localeMap[(i18n.language || 'en').substring(0, 2)] || enUS;
  const isMultiSelect = selectedCount > 1;

  useEffect(() => {
    setLoadedClip(null);
    if (!clip || clip.content) {
      setIsPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setIsPreviewLoading(true);
    invoke<ClipboardItem>('get_clip', { clipId: clip.id })
      .then((fullClip) => {
        if (!cancelled) setLoadedClip(fullClip);
      })
      .catch((error) => {
        if (!cancelled) console.warn('Clip detail preview unavailable:', error);
      })
      .finally(() => {
        if (!cancelled) setIsPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clip?.id, clip?.content]);

  if (!clip) return null;

  const previewClip = loadedClip?.id === clip.id ? loadedClip : clip;
  const previewSource = previewClip.content || previewClip.preview || '';
  const previewText = `${previewSource.substring(0, 4000)}${previewSource.length > 4000 ? '…' : ''}`;
  const imageSrc =
    previewClip.clip_type === 'image'
      ? resolveImageSrc(previewClip.content || previewClip.image_path || '')
      : '';
  const filePaths = (() => {
    if (previewClip.clip_type !== 'file') return [] as string[];
    if (previewClip.content) {
      try {
        const parsed = JSON.parse(previewClip.content);
        if (Array.isArray(parsed)) return parsed.filter((path) => typeof path === 'string');
      } catch {
        // Fall back to the list preview when the full file payload is unavailable.
      }
    }
    return previewClip.preview.split('\n').filter(Boolean);
  })();
  const clipTypeLabel = t(`clipType.${clip.clip_type}`, {
    defaultValue: CLIP_TYPE_LABELS[clip.clip_type as ClipType] || clip.clip_type.toUpperCase(),
  });
  const pinLabel = pinDisabled
    ? t('toasts.cannotPinLatestClip')
    : clip.is_pinned
      ? t('contextMenu.unpin')
      : t('contextMenu.pin');

  return (
    <motion.div
      data-el="clip-detail-panel"
      data-detail-clip-id={clip.id}
      data-selected-count={selectedCount}
      initial={{ x: 16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      onDragStartCapture={(event) => event.preventDefault()}
      className="my-2 mr-2 flex min-h-0 w-72 shrink-0 select-none flex-col overflow-hidden rounded-xl border border-border/80 bg-card/95 text-foreground shadow-2xl backdrop-blur-md dark:border-white/10"
    >
      {/* Header */}
      <div className="flex items-center gap-1 border-b border-border/60 bg-muted/40 px-2 py-2 dark:border-white/5 dark:bg-black/25">
        <span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-primary dark:text-cyan-300">
          {isMultiSelect
            ? t('compact.bulkCountPlural', { count: selectedCount })
            : t('detailPanel.title')}
        </span>
        <Tooltip
          label={t('detailPanel.previousClip')}
          placement="bottom"
          disabled={!canNavigatePrevious}
        >
          <button
            type="button"
            data-el="clip-detail-previous"
            onClick={onPrevious}
            disabled={!canNavigatePrevious}
            aria-label={t('detailPanel.previousClip')}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${
              canNavigatePrevious
                ? 'text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white'
                : 'cursor-not-allowed text-muted-foreground/25 dark:text-white/15'
            }`}
          >
            <ChevronLeft size={14} />
          </button>
        </Tooltip>
        <Tooltip label={t('detailPanel.nextClip')} placement="bottom" disabled={!canNavigateNext}>
          <button
            type="button"
            data-el="clip-detail-next"
            onClick={onNext}
            disabled={!canNavigateNext}
            aria-label={t('detailPanel.nextClip')}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${
              canNavigateNext
                ? 'text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white'
                : 'cursor-not-allowed text-muted-foreground/25 dark:text-white/15'
            }`}
          >
            <ChevronRight size={14} />
          </button>
        </Tooltip>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label={t('common.close')}
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <div
          data-el="clip-detail-preview"
          className="overflow-hidden rounded-lg border border-border/60 bg-muted/20 dark:border-white/5 dark:bg-black/20"
        >
          <div className="flex items-center justify-between border-b border-border/50 px-2 py-1 dark:border-white/5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80 dark:text-white/40">
              {t('detailPanel.preview')}
            </span>
            <Tooltip label={t('contextMenu.view')} placement="left">
              <button
                type="button"
                onClick={() => onPreview(clip.id)}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label={t('contextMenu.view')}
              >
                <Maximize2 size={12} />
              </button>
            </Tooltip>
          </div>
          <div className="relative h-40 overflow-hidden">
            {clip.clip_type === 'image' ? (
              <div className="flex h-full items-center justify-center p-2">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={t('detailPanel.preview')}
                    draggable={false}
                    className="max-h-full max-w-full rounded object-contain"
                  />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground/60">
                    <ImageIcon size={22} />
                    {t('detailPanel.noPreview')}
                  </span>
                )}
              </div>
            ) : clip.clip_type === 'file' ? (
              <div className="scrollbar-thin h-full space-y-1 overflow-y-auto p-2.5">
                {filePaths.length > 0 ? (
                  filePaths.map((path, index) => (
                    <div key={`${path}-${index}`} className="flex items-start gap-1.5">
                      <FileIcon size={12} className="mt-0.5 shrink-0 text-amber-500/80" />
                      <span className="break-all font-mono text-[10px] leading-snug text-foreground/80 dark:text-white/75">
                        {path}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground/60">
                    {t('detailPanel.noPreview')}
                  </span>
                )}
              </div>
            ) : (
              <div className="scrollbar-thin h-full overflow-y-auto p-2.5">
                {previewText ? (
                  <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-foreground/85 dark:text-white/80">
                    {previewText}
                  </pre>
                ) : (
                  <span className="text-xs text-muted-foreground/60">
                    {t('detailPanel.noPreview')}
                  </span>
                )}
              </div>
            )}
            {isPreviewLoading && (
              <span className="absolute right-2 top-2 rounded bg-card/90 p-1 text-primary shadow-sm">
                <Loader2 size={12} className="animate-spin" />
                <span className="sr-only">{t('common.loading')}</span>
              </span>
            )}
          </div>
        </div>
        {/* Type */}
        <DetailRow
          label={t('detailPanel.type')}
          value={
            <span className="inline-flex items-center gap-1.5 rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-semibold text-foreground/90 dark:bg-white/10 dark:text-white/80">
              {clipTypeLabel}
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
                <span className="text-xs font-medium text-foreground dark:text-white/90">
                  {clip.source_app}
                </span>
              </span>
            }
          />
        )}
        {/* Created */}
        <DetailRow
          label={t('detailPanel.created')}
          value={
            <span className="text-xs text-foreground/90 dark:text-white/90">
              {format(new Date(clip.created_at), 'PPpp', { locale })}
            </span>
          }
        />
        {/* Folder */}
        <DetailRow
          label={t('detailPanel.folder')}
          value={
            <span className="text-xs text-foreground/90 dark:text-white/90">
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
            <span className="font-mono text-xs text-foreground/90 dark:text-white/90">
              {formatBytes(clip.content_length)}
            </span>
          }
        />
        {/* Pinned */}
        {clip.is_pinned && (
          <DetailRow
            label={t('detailPanel.pinned')}
            value={
              <span className="text-xs font-semibold text-primary dark:text-cyan-300">
                {t('common.yes')}
              </span>
            }
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
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80 dark:text-white/40">
                    {t('detailPanel.extractedText')}
                  </div>
                  <div className="max-h-24 overflow-y-auto whitespace-pre-wrap rounded border border-border/60 bg-muted/40 p-2 text-[10px] leading-snug text-foreground/80 dark:border-white/5 dark:bg-black/30 dark:text-white/70">
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
      <div className="flex items-center justify-around border-t border-border/60 bg-muted/40 px-2 py-2 dark:border-white/5 dark:bg-black/25">
        <Tooltip
          label={isMultiSelect ? t('detailPanel.copySingleOnly') : t('contextMenu.copy')}
          placement="top"
        >
          <button
            type="button"
            data-el="clip-detail-copy"
            onClick={() => onCopy(clip.id)}
            disabled={isMultiSelect}
            aria-label={t('contextMenu.copy')}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              isMultiSelect
                ? 'cursor-not-allowed text-muted-foreground/30 dark:text-white/25'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white'
            }`}
          >
            <Copy size={14} />
          </button>
        </Tooltip>
        <Tooltip label={pinLabel} placement="top">
          <button
            type="button"
            onClick={() => onPin(clip.id)}
            disabled={pinDisabled}
            aria-label={pinLabel}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-accent dark:hover:bg-white/10 ${
              pinDisabled
                ? 'cursor-not-allowed text-muted-foreground/30 dark:text-white/25'
                : clip.is_pinned
                  ? 'text-primary dark:text-cyan-400'
                  : 'text-muted-foreground hover:text-foreground dark:text-white/50 dark:hover:text-white'
            }`}
          >
            {clip.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
        </Tooltip>
        <Tooltip label={t('contextMenu.delete')} placement="top">
          <button
            type="button"
            onClick={() => {
              onDelete(clip.id);
              onClose();
            }}
            aria-label={t('contextMenu.delete')}
            className="flex h-8 w-8 items-center justify-center rounded-md text-rose-500/80 transition-colors hover:bg-rose-500/15 hover:text-rose-600 dark:text-rose-400/70 dark:hover:text-rose-300"
          >
            <Trash2 size={14} />
          </button>
        </Tooltip>
      </div>
    </motion.div>
  );
};
