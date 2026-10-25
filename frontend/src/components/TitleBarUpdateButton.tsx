import { ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import Tooltip from './Tooltip';

export function TitleBarUpdateButton({
  visible,
  version,
  onClick,
  iconSize = 14,
}: {
  visible: boolean;
  version?: string;
  onClick: () => void;
  iconSize?: number;
}) {
  const { t } = useTranslation();
  if (!visible) return null;

  const tooltip = version ? t('titleBar.updateAvailable', { version }) : t('tray.updateAvailable');
  const size = Math.max(12, Math.min(iconSize || 14, 16));

  return (
    <Tooltip label={tooltip} placement="bottom">
      <button
        type="button"
        onClick={onClick}
        aria-label={tooltip}
        className={clsx(
          'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-200',
          'border-primary/40 bg-primary/10 text-primary',
          'hover:border-primary hover:bg-primary/25 hover:text-primary hover:shadow-[0_0_10px_rgba(var(--primary-rgb),0.35)]',
          'active:scale-95 active:bg-primary/30',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-primary'
        )}
      >
        <ArrowDown
          size={size}
          strokeWidth={2.4}
          className="transition-transform group-hover:translate-y-0.5"
        />
        <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_rgba(var(--primary-rgb),0.9)]" />
        </span>
      </button>
    </Tooltip>
  );
}
