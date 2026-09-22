import { X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EnterGlyph, EscGlyph, useModalKeys } from './ModalActions';
import Tooltip from './Tooltip';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  useModalKeys({
    enabled: isOpen,
    onEsc: onCancel,
    onEnter: onConfirm,
  });

  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm duration-200">
      <div className="animate-in zoom-in-95 w-full max-w-md scale-100 rounded-lg border border-border bg-background p-6 shadow-lg duration-200">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                variant === 'danger'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-yellow-500/10 text-yellow-500'
              }`}
            >
              <AlertTriangle size={18} />
            </div>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <Tooltip label={t('common.close')} placement="bottom">
            <button
              type="button"
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
          </Tooltip>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">{message}</p>

        <div className="flex justify-end gap-3">
          <Tooltip
            label={
              <>
                {cancelText || t('common.cancel')} <EscGlyph />
              </>
            }
            placement="top"
          >
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 rounded-md border border-input bg-transparent px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              {cancelText || t('common.cancel')}
              <EscGlyph />
            </button>
          </Tooltip>
          <Tooltip
            label={
              <>
                {confirmText || t('common.confirm')} <EnterGlyph />
              </>
            }
            placement="top"
          >
            <button
              type="button"
              onClick={onConfirm}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${
                variant === 'danger'
                  ? 'bg-destructive hover:bg-destructive/90'
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {confirmText || t('common.confirm')}
              <EnterGlyph />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
