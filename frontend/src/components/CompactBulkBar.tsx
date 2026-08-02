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
          <div className="flex items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-black/90 py-1 pl-2 pr-1 shadow-[0_4px_16px_rgba(0,0,0,0.5),0_0_8px_rgba(6,182,212,0.2)] backdrop-blur-md">
            {/* Count badge */}
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded bg-cyan-500/20 px-1 font-mono text-[10px] font-bold text-cyan-300">
              {count}
            </span>

            <div className="h-4 w-px bg-white/10" />

            {/* Copy */}
            <Tooltip label={t('compact.bulkCopy')} placement="top">
              <button
                onClick={onCopy}
                className="flex h-6 w-6 items-center justify-center rounded border border-transparent text-white/60 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white/90"
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
                      ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                      : 'border-transparent text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white/90'
                  )}
                >
                  <FolderOpen size={12} />
                </button>
              </Tooltip>

              {showFolderMenu && (
                <div className="absolute bottom-full left-0 z-50 mb-1 max-h-40 w-48 overflow-y-auto rounded-lg border border-white/10 bg-black/95 shadow-2xl">
                  <button
                    onClick={() => {
                      onMoveToFolder(null);
                      setShowFolderMenu(false);
                    }}
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[10px] text-white/70 hover:bg-white/10"
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
                      className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[10px] text-white/70 hover:bg-white/10"
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
                className="flex h-6 w-6 items-center justify-center rounded border border-transparent text-rose-400/70 transition-colors hover:border-rose-500/30 hover:bg-rose-500/15 hover:text-rose-300"
              >
                <Trash2 size={12} />
              </button>
            </Tooltip>

            {/* Clear */}
            <Tooltip label={t('compact.bulkClear')} placement="top">
              <button
                onClick={onClear}
                className="flex h-6 w-6 items-center justify-center rounded border border-transparent text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
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
