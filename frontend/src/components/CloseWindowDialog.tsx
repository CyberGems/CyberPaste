import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Tooltip from './Tooltip';

interface CloseWindowDialogProps {
  isOpen: boolean;
  onAction: (action: 'minimize' | 'quit', remember: boolean) => void | Promise<void>;
}

export function CloseWindowDialog({ isOpen, onAction }: CloseWindowDialogProps) {
  const { t } = useTranslation();
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    if (isOpen) setRemember(false);
  }, [isOpen]);

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

        <div className="mt-6 flex justify-end gap-3">
          <Tooltip label={t('closeDialog.minimize')} placement="top">
            <button
              type="button"
              onClick={() => onAction('minimize', remember)}
              className="rounded-md border border-border bg-white/5 px-4 py-2.5 text-base font-semibold text-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {t('closeDialog.minimize')}
            </button>
          </Tooltip>
          <Tooltip label={t('closeDialog.quit')} placement="top">
            <button
              type="button"
              onClick={() => onAction('quit', remember)}
              className="rounded-md bg-destructive/15 px-4 py-2.5 text-base font-semibold text-destructive transition-colors hover:bg-destructive/25"
            >
              {t('closeDialog.quit')}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
