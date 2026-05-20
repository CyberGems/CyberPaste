import { X, Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { systemToast as toast } from '../utils/toast';
import { useTranslation } from 'react-i18next';

interface AiResultDialogProps {
  isOpen: boolean;
  title: string;
  content: string;
  onClose: () => void;
}

export function AiResultDialog({ isOpen, title, content, onClose }: AiResultDialogProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

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
      // Use the clipboard plugin via existing command or direct plugin usage?
      // Since we want to just write text, we can use navigator.clipboard if available,
      // but in Tauri it's better to use the backend command or plugin.
      // We'll use navigator for simplicity here as it works in Tauri webview usually,
      // OR re-use the `paste_clip` logic if we had a clip ID.
      // But this is new content.
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success(t('common.copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
      toast.error(t('notifications.copyFailed'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex h-[80vh] w-[90vw] max-w-2xl flex-col rounded-2xl border border-primary/30 bg-background/95 shadow-[0_0_30px_rgba(109,40,217,0.15)] backdrop-blur-md overflow-hidden">
        {/* Top Cyber Accent Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 via-primary to-purple-600" />
        
        <div className="flex items-center justify-between border-b border-primary/10 p-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="rounded-md p-2 hover:bg-accent hover:text-accent-foreground"
              title={t('settings.copyContent')}
            >
              {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-2 hover:bg-accent hover:text-accent-foreground"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
