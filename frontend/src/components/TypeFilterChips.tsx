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
  Eye,
  Square,
  RectangleHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import Tooltip from './Tooltip';
import { UndoButton } from './UndoButton';
import { TITLEBAR_HOTKEYS } from '../hooks/useKeyboard';
import { AppFilterDropdown } from './AppFilterDropdown';
import type { SourceAppItem } from '../types';

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
  appFilter?: string | null;
  onAppFilterChange?: (app: string | null) => void;
  sourceApps?: SourceAppItem[];
  gridScale?: number;
  onGridScaleChange?: (next: number) => void;
  detailPanelOpen?: boolean;
  onToggleDetailPanel?: () => void;
  fullPeekEnabled?: boolean;
  onTogglePeek?: () => void;
  peekHotkey?: string;
  canUndo?: boolean;
  onUndo?: () => void;
  cardFormat?: 'square' | 'panoramic';
  onToggleCardFormat?: () => void;
}

export const TypeFilterChipRow: React.FC<TypeFilterChipRowProps> = ({
  value,
  onChange,
  counts,
  appFilter,
  onAppFilterChange,
  sourceApps,
  gridScale,
  onGridScaleChange,
  detailPanelOpen = false,
  onToggleDetailPanel,
  fullPeekEnabled = true,
  onTogglePeek,
  peekHotkey = TITLEBAR_HOTKEYS.peek,
  canUndo = false,
  onUndo,
  cardFormat = 'square',
  onToggleCardFormat,
}) => {
  const { t } = useTranslation();
  const isActive = value !== 'all';

  return (
    <div data-el="type-filter-row" className="flex w-full items-center gap-2 px-4 pb-1.5 pt-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {onAppFilterChange && sourceApps && sourceApps.length > 0 && (
          <AppFilterDropdown
            value={appFilter ?? null}
            onChange={onAppFilterChange}
            apps={sourceApps}
            variant="full"
          />
        )}
      </div>

      <div className="no-scrollbar flex min-w-0 max-w-[60%] items-center justify-center gap-0.5 overflow-x-auto">
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
                  'flex h-7 flex-shrink-0 items-center gap-1.5 px-2.5 text-[11px] font-medium leading-normal transition-colors focus:outline-none focus-visible:ring-0',
                  selected
                    ? 'rounded-full bg-primary/15 text-primary'
                    : 'rounded-full text-muted-foreground/75 hover:text-foreground'
                )}
              >
                <Icon size={12} className="shrink-0" />
                <span className="whitespace-nowrap leading-normal">{label}</span>
                {typeof count === 'number' && (
                  <span
                    className={clsx(
                      'font-mono text-[10px] tabular-nums leading-normal',
                      selected ? 'opacity-70' : 'opacity-40'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            </Tooltip>
          );
        })}
        <Tooltip label={t('common.clearFilter')} placement="bottom" disabled={!isActive}>
          <button
            type="button"
            onClick={() => onChange('all')}
            disabled={!isActive}
            tabIndex={isActive ? 0 : -1}
            aria-hidden={!isActive}
            aria-label={t('common.clearFilter')}
            className={clsx(
              'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors',
              isActive
                ? 'text-muted-foreground/70 hover:text-foreground'
                : 'pointer-events-none invisible'
            )}
          >
            <X size={12} />
          </button>
        </Tooltip>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <UndoButton canUndo={canUndo} onUndo={onUndo} size="full" />

        {onTogglePeek && (
          <Tooltip
            label={t(fullPeekEnabled ? 'settings.disablePeek' : 'settings.enablePeek', {
              hotkey: peekHotkey,
            })}
            placement="bottom"
          >
            <button
              type="button"
              onClick={onTogglePeek}
              aria-label={t(fullPeekEnabled ? 'settings.disablePeek' : 'settings.enablePeek', {
                hotkey: peekHotkey,
              })}
              aria-pressed={fullPeekEnabled}
              className={clsx(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-all',
                fullPeekEnabled
                  ? 'border-primary/40 bg-primary/15 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)] hover:border-primary/60 hover:bg-primary/25'
                  : 'border-transparent text-muted-foreground/70 hover:border-border hover:bg-accent hover:text-foreground'
              )}
            >
              <Eye size={13} />
            </button>
          </Tooltip>
        )}

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

        {onToggleCardFormat && cardFormat && (
          <Tooltip
            label={
              cardFormat === 'panoramic'
                ? `${t('settings.fullCardFormat')}: ${t('settings.fullCardFormatPanoramic')}`
                : `${t('settings.fullCardFormat')}: ${t('settings.fullCardFormatSquare')}`
            }
            placement="bottom"
          >
            <button
              type="button"
              onClick={onToggleCardFormat}
              aria-label={`${t('settings.fullCardFormat')}: ${cardFormat === 'panoramic' ? t('settings.fullCardFormatPanoramic') : t('settings.fullCardFormatSquare')}`}
              className={clsx(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors',
                cardFormat === 'panoramic'
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-primary'
              )}
            >
              {cardFormat === 'panoramic' ? (
                <RectangleHorizontal size={13} />
              ) : (
                <Square size={12} />
              )}
            </button>
          </Tooltip>
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
    </div>
  );
};
