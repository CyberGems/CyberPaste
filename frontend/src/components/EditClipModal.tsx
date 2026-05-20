import React, { useState, useEffect } from 'react';
import { X, Save, Edit3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EditClipModalProps {
  isOpen: boolean;
  content: string;
  onClose: () => void;
  onSave: (newContent: string) => void;
}

export const EditClipModal: React.FC<EditClipModalProps> = ({
  isOpen,
  content,
  onClose,
  onSave,
}) => {
  const [editedContent, setEditedContent] = useState(content);
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      setEditedContent(content);
    }
  }, [isOpen, content]);

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

  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div
        className="animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-[0_0_50px_rgba(var(--primary-rgb),0.15)] duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
          <div className="flex items-center gap-2 text-primary">
            <Edit3 size={18} />
            <h3 className="text-sm font-bold uppercase tracking-tight">{t('settings.editClip')}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Editor Area */}
        <div className="scrollbar-thin flex-1 overflow-y-auto bg-black/20 p-4">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="scrollbar-thin h-40 w-full resize-none rounded-xl border border-border bg-background/50 p-3 font-mono text-xs leading-relaxed transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
            spellCheck={false}
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-white/5"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onSave(editedContent)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Save size={14} />
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
