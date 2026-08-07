import React, { useState } from 'react';
import { Trash2, FolderOpen, X, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderItem } from '../types';
import Tooltip from './Tooltip';

interface CompactBulkBarProps {
  count: number;
  folders: FolderItem[];
  onCopy: () => void;
  onDelete: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  onClear: () => void;
}

export const CompactBulkBar: React.FC<CompactBulkBarProps> = ({
  count,
  folders,
  onCopy,
  onDelete,
  onMoveToFolder,
  onClear,
}) => {
  const { t } = useTranslation();
  const [showFolderMenu, setShowFolderMenu] = useState(false);

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
          className="absolute bottom-2 left-1/2 z-50 -translate-x-1/2"
        >
          <div className="flex items-center gap-1.5 rounded-lg border border-primary/25 bg-popover py-1 pl-2 pr-1 shadow-2xl backdrop-blur-md">
            {/* Count badge */}
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded bg-primary/20 px-1 font-mono text-[10px] font-bold text-primary">
              {count}
            </span>

            <div className="h-4 w-px bg-border" />

            {/* Copy */}
            <Tooltip label={t('compact.bulkCopy')} placement="top">
              <button
                onClick={onCopy}
                className="flex h-6 w-6 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground"
              >
                <Copy size={12} />
              </button>
            </Tooltip>

            {/* Move to folder (dropdown) */}
            <div className="relative">
              <Tooltip label={t('compact.bulkMove')} placement="top">
                <button
                  onClick={() => setShowFolderMenu(!showFolderMenu)}
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
                <div className="absolute bottom-full left-0 z-50 mb-1 max-h-40 w-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-2xl">
                  <button
                    onClick={() => {
                      onMoveToFolder(null);
                      setShowFolderMenu(false);
                    }}
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[10px] text-foreground/75 hover:bg-accent hover:text-foreground"
                  >
                    📋 {t('folders.mainClipboard')}
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        onMoveToFolder(f.id);
                        setShowFolderMenu(false);
                      }}
                      className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[10px] text-foreground/75 hover:bg-accent hover:text-foreground"
                    >
                      📁 {f.name} ({f.item_count})
                    </button>
                  ))}
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

            {/* Clear */}
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
