import React, { useState, useRef, useEffect } from 'react';
import { Trash2, FolderOpen, X, Clock, Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderItem } from '../types';
import Tooltip from './Tooltip';
import { IconMap } from './CompactView';

interface CompactBulkBarProps {
  count: number;
  folders: FolderItem[];
  currentFolderId?: string | null;
  onDelete: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  onClear: () => void;
}

export const CompactBulkBar: React.FC<CompactBulkBarProps> = ({
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
          key="compact-bulk-bar"
          data-el="compact-bulk-bar"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className="absolute bottom-10 left-1/2 z-50 -translate-x-1/2"
        >
          <div className="flex items-center gap-1.5 rounded-lg border border-primary/25 bg-popover py-1 pl-2 pr-1 shadow-2xl backdrop-blur-md">
            {/* Count badge with informative tooltip */}
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
              <span className="flex h-5 min-w-[20px] cursor-default items-center justify-center rounded bg-primary/20 px-1 font-mono text-[10px] font-bold text-primary">
                {count}
              </span>
            </Tooltip>

            <div className="h-4 w-px bg-border" />

            {/* Move to folder (dropdown) */}
            <div className="relative">
              <Tooltip label={t('compact.bulkMove')} placement="top">
                <button
                  onClick={() => setShowFolderMenu((prev) => !prev)}
                  className={clsx(
                    'flex h-6 w-6 items-center justify-center rounded border transition-all',
                    showFolderMenu
                      ? 'border-primary/45 bg-primary/20 text-primary'
                      : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <FolderOpen size={12} />
                </button>
              </Tooltip>

              {showFolderMenu && (
                <div
                  ref={folderMenuRef}
                  className="absolute bottom-full left-1/2 z-50 mb-1.5 max-h-48 w-52 -translate-x-1/2 overflow-y-auto rounded-lg border border-border bg-popover/95 p-1 shadow-2xl backdrop-blur-md"
                >
                  {showMainClipboard && (
                    <button
                      onClick={() => {
                        onMoveToFolder(null);
                        setShowFolderMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Clock size={12} className="flex-shrink-0 text-muted-foreground" />
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
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <Icon
                          size={12}
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
                    <div className="px-2 py-2 text-center text-[10px] text-muted-foreground/60">
                      {t('folders.noOtherFolders', { defaultValue: 'No other folders' })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Delete */}
            <Tooltip label={t('compact.bulkDelete')} placement="top">
              <button
                onClick={onDelete}
                className="flex h-6 w-6 items-center justify-center rounded border border-transparent text-destructive transition-colors hover:border-destructive/30 hover:bg-destructive/15 hover:text-destructive"
              >
                <Trash2 size={12} />
              </button>
            </Tooltip>

            {/* Clear selection */}
            <Tooltip label={t('compact.bulkClear')} placement="top">
              <button
                onClick={onClear}
                className="flex h-6 w-6 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground"
              >
                <X size={12} />
              </button>
            </Tooltip>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
