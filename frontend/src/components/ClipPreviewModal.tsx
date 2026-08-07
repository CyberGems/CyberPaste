import React, { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { X, Code, Copy, Check, Loader2, File as LucideFile } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import Tooltip from './Tooltip';
import type { ClipboardItem } from '../types';

interface ClipPreviewModalProps {
  isOpen: boolean;
  clip: ClipboardItem | null;
  onClose: () => void;
  onCopy: (id: string) => void;
  onEdit?: (id: string) => void;
}

/** Escape helper to safely render plain-text fallbacks inside the HTML block. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const ClipPreviewModal: React.FC<ClipPreviewModalProps> = ({
  isOpen,
  clip,
  onClose,
  onCopy,
  onEdit,
}) => {
  const { t } = useTranslation();
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isTextual = useMemo(() => clip && !['image', 'file'].includes(clip.clip_type), [clip]);
  const content = clip?.content ?? clip?.preview ?? '';

  // Fetch syntax-highlighted HTML only for code-like clips
  useEffect(() => {
    if (!isOpen || !clip || !isTextual || !content) {
      setHighlightedHtml(null);
      setDetectedLang(null);
      return;
    }
    setIsHighlighting(true);
    invoke<{ content_html: string; detected_language: string }>('get_highlighted_clip', {
      clipId: clip.id,
    })
      .then((res) => {
        setHighlightedHtml(res.content_html);
        setDetectedLang(res.detected_language);
      })
      .catch((err) => {
        console.warn('Highlight unavailable, showing raw text:', err);
        setHighlightedHtml(null);
        setDetectedLang(null);
      })
      .finally(() => setIsHighlighting(false));
  }, [isOpen, clip, isTextual, content]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !clip) return null;

  const imageSrc = (() => {
    if (clip.clip_type !== 'image' || !clip.content) return null;
    const v = clip.content;
    if (/^(data:|https?:|asset:|tauri:)/.test(v)) return v;
    if (/^([A-Za-z]:[\\/]|\/)/.test(v)) return convertFileSrc(v);
    return `data:image/png;base64,${v}`;
  })();

  const handleCopyClick = () => {
    onCopy(clip.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-[150] flex items-center justify-center bg-black/45 p-6 backdrop-blur-sm duration-200"
      onClick={onClose}
    >
      <div
        className="animate-in zoom-in-95 flex h-full max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_0_50px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/65 px-4 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate text-sm font-bold text-foreground">
              {clip.source_app || clip.clip_type.toUpperCase()}
            </span>
            {detectedLang && (
              <span className="rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-primary">
                {detectedLang}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground/80">
              {t('clipList.textLength', { count: clip.content_length })}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {onEdit && isTextual && (
              <Tooltip label={t('contextMenu.edit')} placement="bottom">
                <button
                  onClick={() => {
                    onEdit(clip.id);
                    onClose();
                  }}
                  className="h-7 rounded-md px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Code size={13} />
                </button>
              </Tooltip>
            )}
            <Tooltip label={copied ? t('common.copied') : t('contextMenu.copy')} placement="bottom">
              <button
                onClick={handleCopyClick}
                className="h-7 rounded-md px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            </Tooltip>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="scrollbar-thin relative flex-1 overflow-auto bg-muted/20 p-4">
          {clip.clip_type === 'image' ? (
            <div className="flex h-full items-center justify-center">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt="Clipboard preview"
                  className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
                />
              ) : (
                <span className="text-sm text-muted-foreground/60">{t('common.image')}</span>
              )}
            </div>
          ) : clip.clip_type === 'file' ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <LucideFile size={36} className="text-muted-foreground/30" />
              <div className="max-w-md break-all px-4 text-sm text-foreground/80">
                {(clip.preview || '').split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative h-full">
              {isHighlighting && (
                <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5 text-[10px] text-primary/80">
                  <Loader2 size={12} className="animate-spin" />
                  <span>{t('common.loading')}</span>
                </div>
              )}
              {highlightedHtml ? (
                <pre
                  className={clsx(
                    'whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/40 p-3',
                    'font-mono text-[12px] leading-relaxed',
                    '[&_span]:!bg-transparent' // syntect inline background defeated
                  )}
                  dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />
              ) : (
                <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-foreground">
                  {escapeHtml(content)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-shrink-0 items-center justify-between border-t border-border bg-muted/65 px-4 py-2">
          <span className="text-[11px] text-muted-foreground/60">
            {clip.folder_id ? t('folders.itemCount', { count: 1 }) : t('folders.mainClipboard')}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {t('common.close')}
            </button>
            {onEdit && isTextual && (
              <button
                onClick={() => {
                  onEdit(clip.id);
                  onClose();
                }}
                className="rounded-lg bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/30"
              >
                {t('contextMenu.edit')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
