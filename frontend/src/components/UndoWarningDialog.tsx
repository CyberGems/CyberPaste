import { useTranslation } from 'react-i18next';
import { EnterGlyph, EscGlyph, useModalKeys } from './ModalActions';
import Tooltip from './Tooltip';

interface UndoWarningDialogProps {
  isOpen: boolean;
  count: number;
  onKeepOpen: () => void;
  onContinue: () => void | Promise<void>;
}

export function UndoWarningDialog({
  isOpen,
  count,
  onKeepOpen,
  onContinue,
}: UndoWarningDialogProps) {
  const { t } = useTranslation();

  useModalKeys({
    enabled: isOpen,
    onEsc: onKeepOpen,
    onEnter: onContinue,
  });

  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-[115] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="undo-warning-dialog-title"
        className="animate-in zoom-in-95 w-full max-w-[650px] rounded-lg border border-border bg-background p-7 shadow-2xl duration-200"
      >
        <h2 id="undo-warning-dialog-title" className="text-xl font-semibold text-foreground">
          {t('undoWarning.title')}
        </h2>
        <p className="mt-3 max-w-[590px] text-base leading-relaxed text-muted-foreground">
          {t('undoWarning.message', { count })}
        </p>

        <div className="mt-6 flex justify-end gap-2.5">
          <Tooltip label={t('undoWarning.keepOpen')} placement="top">
            <button
              type="button"
              onClick={onKeepOpen}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-transparent px-4 py-2.5 text-base font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-foreground"
            >
              {t('undoWarning.keepOpen')}
              <EscGlyph />
            </button>
          </Tooltip>
          <Tooltip label={t('undoWarning.continue')} placement="top">
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-primary/60 bg-primary px-4 py-2.5 text-base font-semibold text-primary-foreground shadow-[0_0_10px_rgba(var(--primary-rgb),0.18)] transition-colors hover:bg-primary/90"
            >
              {t('undoWarning.continue')}
              <EnterGlyph />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
