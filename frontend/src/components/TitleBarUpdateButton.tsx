import { ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import Tooltip from './Tooltip';

export function TitleBarUpdateButton({
  visible,
  version,
  onClick,
  iconSize = 13,
}: {
  visible: boolean;
  version?: string;
  onClick: () => void;
  iconSize?: number;
}) {
  const { t } = useTranslation();
  if (!visible) return null;

  const tooltip = version ? t('titleBar.updateAvailable', { version }) : t('tray.updateAvailable');
  const arrowSize = Math.max(12, Math.min(iconSize || 13, 14));

  return (
    <Tooltip label={tooltip} placement="bottom">
      <button
        type="button"
        onClick={onClick}
        aria-label={tooltip}
        className={clsx(
          'group mr-1 inline-flex h-7 shrink-0 items-center self-center overflow-hidden rounded-full border',
          'border-primary/40 bg-primary text-primary-foreground',
          'shadow-sm',
          'transition-all duration-200 ease-out',
          'hover:shadow-md hover:brightness-105 active:scale-95',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-primary'
        )}
      >
        <span className="grid h-7 grid-cols-[0fr] items-center overflow-hidden opacity-0 transition-[grid-template-columns,opacity] duration-200 ease-out group-hover:grid-cols-[1fr] group-hover:opacity-100">
          <span className="flex h-7 min-w-0 items-center overflow-hidden">
            <span className="whitespace-nowrap pl-2.5 pr-1 text-[11px] font-bold leading-none tracking-wide text-primary-foreground">
              {t('titleBar.update')}
            </span>
          </span>
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center">
          <ArrowDown size={arrowSize} strokeWidth={2.5} className="block text-primary-foreground" />
        </span>
      </button>
    </Tooltip>
  );
}
