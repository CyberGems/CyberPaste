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
          'group flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-300',
          'border-primary/50 bg-primary/10 text-primary',
          'shadow-[0_0_8px_rgba(var(--primary-rgb),0.25)]',
          'hover:border-primary hover:bg-primary/25 hover:text-primary hover:shadow-[0_0_12px_rgba(var(--primary-rgb),0.45)]',
          'active:scale-95 active:bg-primary/30',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-primary',
          'motion-safe:animate-[pulse_3.5s_ease-in-out_infinite]'
        )}
      >
        <ArrowDown
          size={size}
          strokeWidth={2.4}
          className="transition-transform duration-200 group-hover:translate-y-0.5"
        />
      </button>
    </Tooltip>
  );
}
