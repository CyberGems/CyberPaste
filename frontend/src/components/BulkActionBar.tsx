import React, { useState } from 'react';
import { Trash2, FolderOpen, X, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderItem } from '../types';
import Tooltip from './Tooltip';

interface BulkActionBarProps {
  count: number;
  folders: FolderItem[];
  onDelete: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  onClear: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  count,
  folders,
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
          key="bulk-bar"
          data-el="bulk-action-bar"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="absolute bottom-3 left-1/2 z-40 -translate-x-1/2"
        >
          <div className="flex items-center gap-2 rounded-xl border border-cyan-500/25 bg-black/90 py-2 pl-3 pr-2 shadow-[0_8px_24px_rgba(0,0,0,0.6),0_0_16px_rgba(6,182,212,0.25)] backdrop-blur-md">
            {/* Count badge */}
            <div className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-cyan-500/20 font-mono text-xs font-bold text-cyan-300">
                {count}
              </span>
              <span className="text-xs font-medium text-white/70">
                {count === 1 ? t('bulk.selectedSingle') : t('bulk.selectedPlural')}
              </span>
            </div>

            <div className="h-5 w-px bg-white/10" />

            {/* Move to folder (dropdown) */}
            <div className="relative">
              <Tooltip label={t('bulk.moveToFolder')} placement="top">
                <button
                  onClick={() => setShowFolderMenu(!showFolderMenu)}
                  className={clsx(
                    'flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-medium transition-all',
                    showFolderMenu
                      ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                      : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10'
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
                <div className="absolute bottom-full left-0 mb-1 max-h-48 w-56 overflow-y-auto rounded-lg border border-white/10 bg-black/95 shadow-2xl">
                  <button
                    onClick={() => {
                      onMoveToFolder(null);
                      setShowFolderMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/70 hover:bg-white/10"
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
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/70 hover:bg-white/10"
                    >
                      📁 {f.name} ({f.item_count})
                    </button>
                  ))}
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
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
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
