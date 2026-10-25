import { Check, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EnterGlyph, SpaceGlyph, useModalKeys } from './ModalActions';
import Tooltip from './Tooltip';

interface CloseWindowDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onAction: (action: 'minimize' | 'quit', remember: boolean) => void | Promise<void>;
}

export function CloseWindowDialog({ isOpen, onCancel, onAction }: CloseWindowDialogProps) {
  const { t } = useTranslation();
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    if (isOpen) setRemember(false);
  }, [isOpen]);

  const handleMinimize = useCallback(() => {
    void onAction('minimize', remember);
  }, [onAction, remember]);

  const handleQuit = useCallback(() => {
    void onAction('quit', remember);
  }, [onAction, remember]);

  useModalKeys({
    enabled: isOpen,
    onEsc: onCancel,
    onEnter: handleMinimize,
    onSpace: handleQuit,
  });

  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-window-dialog-title"
        className="animate-in zoom-in-95 relative w-full max-w-[650px] select-none rounded-lg border border-border bg-background p-7 shadow-2xl duration-200"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="close-window-dialog-title" className="text-xl font-semibold text-foreground">
            {t('closeDialog.title')}
          </h2>
          <Tooltip label={`${t('common.close')} (${t('common.escape')})`} placement="bottom">
            <button
              type="button"
              onClick={onCancel}
              className="-mr-1.5 -mt-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t('common.close')}
            >
              <X size={18} />
            </button>
          </Tooltip>
        </div>

        <p className="mt-3 max-w-[590px] text-base leading-relaxed text-muted-foreground">
          {t('closeDialog.message')}
        </p>

        <label className="mt-5 inline-flex cursor-pointer items-center gap-2.5 text-base font-semibold text-foreground/90">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="sr-only"
          />
          <span
            aria-hidden="true"
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
              remember
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted-foreground/50 bg-transparent'
            }`}
          >
            <Check
              size={14}
              strokeWidth={3}
              className={`transition-opacity duration-150 ${remember ? 'opacity-100' : 'opacity-0'}`}
            />
          </span>
          <span className="leading-none">{t('closeDialog.remember')}</span>
        </label>

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={handleQuit}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-transparent px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
          >
            {t('closeDialog.quit')}
            <SpaceGlyph compact label={t('common.space')} />
          </button>
          <button
            type="button"
            onClick={handleMinimize}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-primary/60 bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_10px_rgba(var(--primary-rgb),0.18)] transition-colors hover:bg-primary/90"
          >
            {t('closeDialog.minimize')}
            <EnterGlyph compact />
          </button>
        </div>
      </div>
    </div>
  );
}
