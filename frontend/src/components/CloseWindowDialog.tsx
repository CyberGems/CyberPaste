import { Check } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EnterGlyph, EscGlyph, SpaceGlyph, useModalKeys } from './ModalActions';
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
        className="animate-in zoom-in-95 w-full max-w-[650px] rounded-lg border border-border bg-background p-7 shadow-2xl duration-200"
      >
        <h2 id="close-window-dialog-title" className="text-xl font-semibold text-foreground">
          {t('closeDialog.title')}
        </h2>
        <p className="mt-3 max-w-[590px] text-base leading-relaxed text-muted-foreground">
          {t('closeDialog.message')}
        </p>

        <Tooltip label={t('closeDialog.remember')} placement="bottom">
          <label className="mt-5 inline-flex cursor-pointer items-center gap-2.5 text-base font-semibold text-foreground/90">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 items-center justify-center rounded-[5px] border transition-colors ${
                remember
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/50 bg-transparent'
              }`}
            >
              {remember && <Check size={14} strokeWidth={3} />}
            </span>
            <span>{t('closeDialog.remember')}</span>
          </label>
        </Tooltip>

        <div className="mt-6 flex justify-end gap-2.5">
          <Tooltip label={`${t('closeDialog.cancel')} (${t('common.escape')})`} placement="top">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-transparent px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {t('closeDialog.cancel')}
              <EscGlyph compact />
            </button>
          </Tooltip>
          <Tooltip label={`${t('closeDialog.quit')} (${t('common.space')})`} placement="top">
            <button
              type="button"
              onClick={handleQuit}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-transparent px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
            >
              {t('closeDialog.quit')}
              <SpaceGlyph compact label={t('common.space')} />
            </button>
          </Tooltip>
          <Tooltip label={`${t('closeDialog.minimize')} (${t('common.enter')})`} placement="top">
            <button
              type="button"
              onClick={handleMinimize}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-primary/60 bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_10px_rgba(var(--primary-rgb),0.18)] transition-colors hover:bg-primary/90"
            >
              {t('closeDialog.minimize')}
              <EnterGlyph compact />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
