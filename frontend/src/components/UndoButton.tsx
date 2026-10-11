import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Undo2 } from 'lucide-react';
import { clsx } from 'clsx';
import Tooltip from './Tooltip';

interface UndoButtonProps {
  canUndo: boolean;
  onUndo?: () => void;
  className?: string;
  size?: 'compact' | 'full';
}

export function UndoButton({
  canUndo,
  onUndo,
  className,
  size = 'compact',
}: UndoButtonProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(canUndo);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (canUndo) {
      setMounted(true);
      setIsExiting(false);
    } else if (mounted) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setIsExiting(false);
      }, 190);
      return () => clearTimeout(timer);
    }
  }, [canUndo, mounted]);

  if (!mounted || !onUndo) return null;

  const buttonClass = clsx(
    size === 'compact'
      ? 'flex h-8 shrink-0 items-center gap-1 rounded-lg border border-amber-500/50 bg-amber-500/15 px-2.5 text-xs font-semibold text-amber-500 transition-colors hover:border-amber-500/80 hover:bg-amber-500/25 active:scale-95'
      : 'flex h-7 shrink-0 items-center gap-1 rounded-md border border-amber-500/50 bg-amber-500/15 px-2 text-[11px] font-semibold text-amber-500 transition-colors hover:border-amber-500/80 hover:bg-amber-500/25 active:scale-95',
    isExiting ? 'animate-undo-pop-out' : 'animate-undo-pop-in animate-undo-glow',
    className
  );

  return (
    <Tooltip
      label={t('common.undoDelete') || t('contextMenu.undo') || 'Undo'}
      placement="bottom"
      disabled={isExiting}
    >
      <button
        type="button"
        onClick={onUndo}
        className={buttonClass}
      >
        <Undo2 size={size === 'compact' ? 13 : 12} className="shrink-0" />
        <span className="hidden text-[11px] sm:inline">{t('contextMenu.undo')}</span>
      </button>
    </Tooltip>
  );
}
