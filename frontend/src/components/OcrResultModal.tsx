import React, { useState, useEffect } from 'react';
import { X, Copy, Save, Check, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { systemToast as toast } from '../utils/toast';

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
  const [autoCopy, setAutoCopy] = useState(() => {
    const saved = localStorage.getItem('cyberpaste_ocr_auto_copy');
    return saved !== null ? saved === 'true' : true;
  });

  // Track the persistent preference
  useEffect(() => {
    localStorage.setItem('cyberpaste_ocr_auto_copy', String(autoCopy));
  }, [autoCopy]);

  // Synchronize internal text state and trigger auto-copy if enabled
  useEffect(() => {
    if (isOpen) {
      setEditedText(content);
      
      const savedAutoCopy = localStorage.getItem('cyberpaste_ocr_auto_copy');
      const isAutoCopyActive = savedAutoCopy !== null ? savedAutoCopy === 'true' : true;
      setAutoCopy(isAutoCopyActive);

      if (isAutoCopyActive && content && content.trim().length > 0) {
        navigator.clipboard.writeText(content)
          .then(() => {
            const preview = content.length > 40 ? `${content.substring(0, 40)}...` : content;
            toast.success(`${t('common.copied') || 'Copiado'}: "${preview}"`);
          })
          .catch((err) => {
            console.error('OCR auto-copy failed:', err);
          });
      }
    }
  }, [isOpen, content, t]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedText);
      setCopied(true);
      const preview = editedText.length > 40 ? `${editedText.substring(0, 40)}...` : editedText;
      toast.success(`${t('common.copied') || 'Copiado'}: "${preview}"`);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
      toast.error('Failed to copy text');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-[0_0_50px_rgba(var(--primary-rgb),0.15)] duration-300 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Cyber Accent Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 via-primary to-purple-600" />

        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
          <div className="flex items-center gap-2 text-primary">
            <FileText size={18} />
            <h3 className="text-sm font-bold uppercase tracking-tight">
              {t('viewer.extractText') || 'Extract Text (OCR)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Textarea Area */}
        <div className="flex-1 overflow-y-auto bg-black/20 p-4">
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="scrollbar-thin h-64 w-full resize-none rounded-xl border border-border bg-background/50 p-3 font-mono text-xs leading-relaxed transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
            spellCheck={false}
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-3">
          {/* Left Side: Auto-copy toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoCopy((prev) => !prev)}
              className={`h-6 w-11 rounded-full transition-colors flex items-center px-0.5 ${autoCopy ? 'bg-primary' : 'bg-zinc-700'}`}
            >
              <div
                className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${autoCopy ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
            <span className="text-xs text-muted-foreground">
              {t('viewer.autoCopyOcr') || 'Auto-copy to clipboard immediately'}
            </span>
          </div>

          {/* Right Side: Action buttons */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white/5 transition-all"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {t('viewer.copyOcrText') || 'Copy'}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-white/5"
            >
              {t('common.cancel') || 'Cancel'}
            </button>
            <button
              onClick={() => onSave(editedText)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Save size={14} />
              {t('common.save') || 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
