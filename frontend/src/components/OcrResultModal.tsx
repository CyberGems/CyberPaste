import React, { useCallback, useState, useEffect, useRef } from 'react';
import { X, Copy, Download, Check, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '../utils/toast';
import { ContextMenu } from './ContextMenu';
import { useTextFieldContextMenu } from '../hooks/useTextFieldContextMenu';
import { isExportCancelled, saveTextToFile } from '../utils/export';
import { EnterGlyph, EscGlyph, useModalKeys } from './ModalActions';
import Tooltip from './Tooltip';
import { Switch } from './ui/Switch';

interface OcrResultModalProps {
  isOpen: boolean;
  content: string;
  onClose: () => void;
  onSave: (newText: string) => void;
}

export const OcrResultModal: React.FC<OcrResultModalProps> = ({
  isOpen,
  content,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const [editedText, setEditedText] = useState(content);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { menuPos, options, closeMenu, onContextMenu, handleChange, resetHistory } =
    useTextFieldContextMenu(textareaRef, editedText, setEditedText);
  const [autoCopy, setAutoCopy] = useState(() => {
    const saved = localStorage.getItem('cyberpaste_ocr_auto_copy');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('cyberpaste_ocr_auto_copy', String(autoCopy));
  }, [autoCopy]);

  useEffect(() => {
    if (isOpen) {
      setEditedText(content);
      resetHistory(content);

      const savedAutoCopy = localStorage.getItem('cyberpaste_ocr_auto_copy');
      const isAutoCopyActive = savedAutoCopy !== null ? savedAutoCopy === 'true' : true;
      setAutoCopy(isAutoCopyActive);

      if (isAutoCopyActive && content && content.trim().length > 0) {
        navigator.clipboard
          .writeText(content)
          .then(() => {
            const preview = content.length > 40 ? `${content.substring(0, 40)}...` : content;
            toast.success(`${t('common.copied') || 'Copiado'}: "${preview}"`);
          })
          .catch((err) => {
            console.error('OCR auto-copy failed:', err);
          });
      }
    }
  }, [isOpen, content, t, resetHistory]);

  const handleModalEscape = useCallback(() => {
    if (menuPos) {
      closeMenu();
    } else {
      onClose();
    }
  }, [closeMenu, menuPos, onClose]);

  useModalKeys({
    enabled: isOpen,
    onEsc: handleModalEscape,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedText);
      setCopied(true);
      const preview = editedText.length > 40 ? `${editedText.substring(0, 40)}...` : editedText;
      toast.success(`${t('common.copied') || 'Copiado'}: "${preview}"`);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
      toast.error(t('toasts.failedToCopyText'));
    }
  };

  const handleExport = async () => {
    try {
      await saveTextToFile(editedText, t('export.dialogTitle'), 'CyberPaste_OCR.txt');
      toast.success(t('export.saved'));
    } catch (err) {
      if (!isExportCancelled(err)) {
        console.error('Failed to export OCR text:', err);
        toast.error(t('export.failed'));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in xs:p-2 fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-1.5 backdrop-blur-sm duration-200 sm:p-4">
      <div
        className="animate-in zoom-in-95 flex max-h-[calc(100vh-12px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-primary/20 bg-card shadow-[0_0_50px_rgba(var(--primary-rgb),0.15)] duration-300 sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 via-primary to-purple-600" />

        <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-muted/30 px-3 py-2 sm:px-5 sm:py-3">
          <div className="flex items-center gap-2 text-primary">
            <FileText size={16} className="sm:size-[18px]" />
            <h3 className="truncate text-xs font-bold tracking-tight sm:text-sm">
              {t('viewer.extractText') || 'Extract Text (OCR)'}
            </h3>
          </div>
          <Tooltip label={t('common.close')} placement="bottom">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/10 sm:p-1.5"
            >
              <X size={16} className="sm:size-[18px]" />
            </button>
          </Tooltip>
        </div>

        <div className="flex-1 overflow-y-auto bg-black/20 p-2.5 sm:p-4">
          <textarea
            ref={textareaRef}
            value={editedText}
            onChange={handleChange}
            onContextMenu={onContextMenu}
            className="scrollbar-thin h-40 w-full resize-none rounded-lg border border-border bg-background/50 p-2.5 font-mono text-xs leading-relaxed transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 sm:h-64 sm:rounded-xl sm:p-3"
            spellCheck={false}
            autoFocus
          />
        </div>

        <div className="flex flex-shrink-0 flex-col items-stretch justify-between gap-2.5 border-t border-border bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:px-5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Switch
              checked={autoCopy}
              onChange={setAutoCopy}
              aria-label={t('viewer.autoCopyOcr') || 'Auto-copy to clipboard immediately'}
            />
            <span className="truncate text-[11px] text-muted-foreground sm:text-xs">
              {t('viewer.autoCopyOcr') || 'Auto-copy to clipboard immediately'}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <button
              onClick={handleCopy}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2.5 py-1 text-xs font-medium text-foreground transition-all hover:bg-white/5 sm:px-3 sm:py-1.5"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span className="text-xs">{t('viewer.copyOcrText') || 'Copy'}</span>
            </button>
            <button
              onClick={handleExport}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2.5 py-1 text-xs font-medium text-foreground transition-all hover:bg-white/5 sm:px-3 sm:py-1.5"
            >
              <Download size={13} />
              <span className="text-xs">{t('export.saveAs')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-transparent px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-white/5 sm:gap-2 sm:px-3 sm:py-1.5"
            >
              {t('common.cancel') || 'Cancel'}
              <EscGlyph />
            </button>
            <button
              type="button"
              onClick={() => onSave(editedText)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] sm:gap-2 sm:px-4 sm:py-1.5"
            >
              {t('common.save') || 'Save'}
              <EnterGlyph />
            </button>
          </div>
        </div>
      </div>

      {menuPos && <ContextMenu x={menuPos.x} y={menuPos.y} options={options} onClose={closeMenu} />}
    </div>
  );
};
