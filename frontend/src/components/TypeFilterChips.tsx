import React from 'react';
import {
  Layers,
  FileText,
  Code,
  Image as ImageIcon,
  Link,
  File as LucideFile,
  X,
  ZoomIn,
  ZoomOut,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import Tooltip from './Tooltip';

export type FullTypeFilter = 'all' | 'text' | 'code' | 'image' | 'url' | 'file';

export const FULL_TYPE_FILTER_OPTIONS: {
  value: FullTypeFilter;
  labelKey: string;
  icon: LucideIcon;
}[] = [
  { value: 'all', labelKey: 'compact.filterAll', icon: Layers },
  { value: 'text', labelKey: 'clipType.text', icon: FileText },
  { value: 'code', labelKey: 'clipType.code', icon: Code },
  { value: 'image', labelKey: 'clipType.image', icon: ImageIcon },
  { value: 'url', labelKey: 'clipType.url', icon: Link },
  { value: 'file', labelKey: 'clipType.file', icon: LucideFile },
];

interface TypeFilterChipRowProps {
  value: FullTypeFilter;
  onChange: (v: FullTypeFilter) => void;
  counts: Partial<Record<FullTypeFilter, number>>;
  gridScale?: number;
  onGridScaleChange?: (next: number) => void;
  detailPanelOpen?: boolean;
  onToggleDetailPanel?: () => void;
}

export const TypeFilterChipRow: React.FC<TypeFilterChipRowProps> = ({
  value,
  onChange,
  counts,
  gridScale,
  onGridScaleChange,
  detailPanelOpen = false,
  onToggleDetailPanel,
}) => {
  const { t } = useTranslation();
  const isActive = value !== 'all';

  return (
    <div
      data-el="type-filter-row"
      className="flex w-full items-center gap-2 px-4 pb-1.5 pt-2.5"
    >
      <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {FULL_TYPE_FILTER_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = opt.value === value;
          const labelRaw = t(opt.labelKey);
          const label = labelRaw === opt.labelKey ? opt.value : labelRaw;
          const count = counts[opt.value];
          return (
            <Tooltip key={opt.value} label={label} placement="bottom">
              <button
                type="button"
                onClick={() => onChange(opt.value)}
                className={clsx(
                  'flex h-7 flex-shrink-0 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-medium leading-none transition-all',
                  selected
                    ? 'border-primary/40 bg-primary/15 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.18)]'
                    : 'border-border bg-secondary/40 text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground'
                )}
              >
                <Icon size={12} className="shrink-0" />
                <span className="whitespace-nowrap leading-none">{label}</span>
                {typeof count === 'number' && (
                  <span className="font-mono text-[10px] leading-none tabular-nums opacity-70">
                    ({count})
                  </span>
                )}
              </button>
            </Tooltip>
          );
        })}
        {isActive && (
          <Tooltip label={t('common.clearSearch') || 'Clear filter'} placement="bottom">
            <button
              type="button"
              onClick={() => onChange('all')}
              className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-accent hover:text-foreground"
              aria-label="Clear type filter"
            >
              <X size={12} />
            </button>
          </Tooltip>
        )}
      </div>

      {onGridScaleChange && gridScale !== undefined && (
        <div className="flex shrink-0 items-center gap-0 rounded-md border border-border bg-secondary/40 px-0.5">
          <Tooltip label={t('common.zoomOut')} placement="bottom">
            <button
              type="button"
              onClick={() =>
                onGridScaleChange(Math.max(0.6, Number((gridScale - 0.25).toFixed(2))))
              }
              disabled={gridScale <= 0.6}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-primary disabled:opacity-20"
            >
              <ZoomOut size={12} />
            </button>
          </Tooltip>
          <Tooltip
            label={`${t('common.zoom')}: ${Math.round(gridScale * 100)}%`}
            placement="bottom"
          >
            <button
              type="button"
              onClick={() => onGridScaleChange(1)}
              className="min-w-[38px] cursor-pointer text-center font-mono text-[10px] font-bold tabular-nums text-primary/80 hover:text-primary"
            >
              {Math.round(gridScale * 100)}%
            </button>
          </Tooltip>
          <Tooltip label={t('common.zoomIn')} placement="bottom">
            <button
              type="button"
              onClick={() =>
                onGridScaleChange(Math.min(1.75, Number((gridScale + 0.25).toFixed(2))))
              }
              disabled={gridScale >= 1.75}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-primary disabled:opacity-20"
            >
              <ZoomIn size={12} />
            </button>
          </Tooltip>
        </div>
      )}

      {onToggleDetailPanel && (
        <Tooltip
          label={detailPanelOpen ? t('detailPanel.collapse') : t('detailPanel.expand')}
          placement="bottom"
        >
          <button
            type="button"
            onClick={onToggleDetailPanel}
            aria-label={detailPanelOpen ? t('detailPanel.collapse') : t('detailPanel.expand')}
            className={clsx(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors',
              detailPanelOpen
                ? 'border-primary/40 bg-primary/15 text-primary'
                : 'border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-primary'
            )}
          >
            {detailPanelOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
          </button>
        </Tooltip>
      )}
    </div>
  );
};
