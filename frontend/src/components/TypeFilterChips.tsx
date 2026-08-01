import React from 'react';
import {
  Layers,
  FileText,
  Code,
  Image as ImageIcon,
  Link,
  File as LucideFile,
  X,
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
}

export const TypeFilterChipRow: React.FC<TypeFilterChipRowProps> = ({
  value,
  onChange,
  counts,
}) => {
  const { t } = useTranslation();
  const isActive = value !== 'all';

  return (
    <div
      data-el="type-filter-row"
      className="no-scrollbar flex w-full items-center gap-1 overflow-x-auto px-4 pb-1 pt-0.5"
    >
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
                'flex h-[26px] flex-shrink-0 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium transition-all',
                selected
                  ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.18)]'
                  : 'border-white/5 bg-black/20 text-white/55 hover:border-white/15 hover:bg-black/30 hover:text-white/85'
              )}
            >
              <Icon size={12} />
              <span className="whitespace-nowrap">{label}</span>
              {typeof count === 'number' && (
                <span className="font-mono text-[9px] opacity-40">({count})</span>
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
            className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-lg border border-transparent text-white/30 transition-all hover:border-white/10 hover:bg-white/10 hover:text-white/80"
            aria-label="Clear type filter"
          >
            <X size={12} />
          </button>
        </Tooltip>
      )}
    </div>
  );
};
