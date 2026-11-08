import React, { useState, useRef, useEffect } from 'react';
import { Trash2, FolderOpen, X, ChevronDown, Clock, Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderItem } from '../types';
import Tooltip from './Tooltip';
import { IconMap } from './CompactView';

interface BulkActionBarProps {
  count: number;
  folders: FolderItem[];
  currentFolderId?: string | null;
  onDelete: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  onClear: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  count,
  folders,
  currentFolderId,
  onDelete,
  onMoveToFolder,
  onClear,
}) => {
  const { t } = useTranslation();
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const folderMenuRef = useRef<HTMLDivElement>(null);

  // Close folder menu on click outside
  useEffect(() => {
    if (!showFolderMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) {
        setShowFolderMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFolderMenu]);

  const showMainClipboard = currentFolderId !== null && currentFolderId !== undefined;
  const availableFolders = folders.filter((f) => f.id !== currentFolderId);

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="bulk-bar"
          data-el="bulk-action-bar"
          initial={{ x: '-50%', y: 25, opacity: 0 }}
          animate={{ x: '-50%', y: 0, opacity: 1 }}
          exit={{ x: '-50%', y: 25, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="absolute bottom-4 left-1/2 z-40"
        >
          <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-popover/90 py-2 pl-3 pr-2 shadow-[0_8px_24px_rgba(0,0,0,0.6),0_0_16px_rgba(6,182,212,0.25)] backdrop-blur-md">
            {/* Count badge */}
            <Tooltip
              label={
                count === 1
                  ? t('compact.bulkCountSingle', { count, defaultValue: '1 clip seleccionado' })
                  : t('compact.bulkCountPlural', {
                      count,
                      defaultValue: `${count} clips seleccionados`,
                    })
              }
              placement="top"
            >
              <div className="flex cursor-default items-center gap-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/20 font-mono text-xs font-bold text-primary">
                  {count}
                </span>
                <span className="text-xs font-medium text-foreground/70">
                  {count === 1 ? t('bulk.selectedSingle') : t('bulk.selectedPlural')}
                </span>
              </div>
            </Tooltip>

            <div className="h-5 w-px bg-border" />

            {/* Move to folder (dropdown) */}
            <div className="relative">
              <Tooltip label={t('bulk.moveToFolder')} placement="top">
                <button
                  onClick={() => setShowFolderMenu((prev) => !prev)}
                  className={clsx(
                    'flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-medium transition-all',
                    showFolderMenu
                      ? 'border-primary/40 bg-primary/20 text-primary'
                      : 'border-border bg-accent/20 text-muted-foreground hover:border-border/80 hover:bg-accent hover:text-foreground'
                  )}
                >
                  <FolderOpen size={13} />
                  <ChevronDown
                    size={11}
                    className={clsx('transition-transform', showFolderMenu && 'rotate-180')}
                  />
                </button>
              </Tooltip>

              {showFolderMenu && (
                <div
                  ref={folderMenuRef}
                  className="custom-scrollbar absolute bottom-full left-1/2 z-50 mb-1 max-h-48 w-56 -translate-x-1/2 overflow-y-auto rounded-lg border border-border bg-popover/95 p-1 shadow-2xl backdrop-blur-md"
                >
                  {showMainClipboard && (
                    <button
                      onClick={() => {
                        onMoveToFolder(null);
                        setShowFolderMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Clock size={13} className="flex-shrink-0 text-muted-foreground" />
                      <span className="truncate">{t('folders.mainClipboard')}</span>
                    </button>
                  )}
                  {availableFolders.map((f) => {
                    const Icon = IconMap[f.icon || 'Folder'] || Folder;
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          onMoveToFolder(f.id);
                          setShowFolderMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <Icon
                          size={13}
                          style={{ color: f.color || undefined }}
                          className={clsx('flex-shrink-0', !f.color && 'text-muted-foreground')}
                        />
                        <span className="flex-1 truncate">{f.name}</span>
                        <span className="flex-shrink-0 text-[10px] tabular-nums text-muted-foreground/60">
                          ({f.item_count})
                        </span>
                      </button>
                    );
                  })}
                  {!showMainClipboard && availableFolders.length === 0 && (
                    <div className="px-3 py-2 text-center text-xs text-muted-foreground/60">
                      {t('folders.noOtherFolders', { defaultValue: 'No other folders' })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Delete */}
            <Tooltip label={t('bulk.delete')} placement="top">
              <button
                onClick={onDelete}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-rose-400/70 transition-colors hover:border-rose-500/30 hover:bg-rose-500/15 hover:text-rose-300"
              >
                <Trash2 size={14} />
              </button>
            </Tooltip>

            {/* Clear */}
            <Tooltip label={t('common.cancel')} placement="top">
              <button
                onClick={onClear}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X size={14} />
              </button>
            </Tooltip>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
