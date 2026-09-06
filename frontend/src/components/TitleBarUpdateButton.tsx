import { ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import Tooltip from './Tooltip';

export function TitleBarUpdateButton({
  visible,
  version,
  onClick,
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
          'group mr-1 inline-flex h-7 shrink-0 items-center self-center overflow-hidden rounded-full border',
          'border-primary/50 bg-primary/10 text-primary',
          'shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)]',
          'transition-colors duration-200',
          'hover:border-primary/80 hover:bg-primary/20',
          'focus:outline-none focus-visible:ring-0'
        )}
      >
        <span className="grid h-7 grid-cols-[0fr] items-center overflow-hidden opacity-0 transition-[grid-template-columns,opacity] duration-200 ease-out group-hover:grid-cols-[1fr] group-hover:opacity-100">
          <span className="flex h-7 min-w-0 items-center overflow-hidden">
            <span className="whitespace-nowrap pl-2.5 pr-1 text-[11px] font-semibold leading-none tracking-wide text-primary">
              {t('titleBar.update')}
            </span>
          </span>
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center">
          <ArrowDown size={12} strokeWidth={2.6} className="-translate-y-px text-primary" />
        </span>
      </button>
    </Tooltip>
  );
}
