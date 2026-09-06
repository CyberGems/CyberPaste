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

  const tooltip = version
    ? t('titleBar.updateAvailable', { version })
    : t('tray.updateAvailable');

  return (
    <Tooltip label={tooltip} placement="bottom">
      <button
        type="button"
        onClick={onClick}
        aria-label={tooltip}
        className={clsx(
          'group mr-1 flex h-8 items-center overflow-hidden rounded-full border',
          'border-primary/40 bg-primary/10 text-primary',
          'shadow-[0_0_10px_rgba(var(--primary-rgb),0.22)]',
          'transition-colors duration-200',
          'hover:border-primary/70 hover:bg-primary/20',
          'focus:outline-none focus-visible:ring-0'
        )}
      >
        <span className="grid grid-cols-[0fr] overflow-hidden opacity-0 transition-[grid-template-columns,opacity] duration-200 ease-out group-hover:grid-cols-[1fr] group-hover:opacity-100">
          <span className="min-w-0 overflow-hidden">
            <span className="whitespace-nowrap pl-3 pr-1 text-xs font-semibold text-primary">
              {t('titleBar.update')}
            </span>
          </span>
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center">
          <ArrowDown size={iconSize} strokeWidth={2.4} className="text-primary" />
        </span>
      </button>
    </Tooltip>
  );
}
