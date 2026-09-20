import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Folder as FolderIcon,
  Clipboard,
  Search,
  Zap,
  Flame,
  Star,
  Leaf,
  Droplets,
  Cloud,
  Moon,
  Music,
  Shield,
  Cpu,
  Database,
  Globe,
  Lock,
  Terminal,
  Code,
  Command,
  Compass,
  HardDrive,
  Ghost,
  Activity,
  FolderHeart,
  FolderSync,
  FolderOpen,
  FolderLock,
  Archive,
  Briefcase,
  Bookmark,
  Tag,
  Inbox,
  Layers,
  Layout,
  Library,
  Package,
  Paperclip,
  Puzzle,
  Settings,
  Share2,
  Smile,
  Sun,
} from 'lucide-react';
import { clsx } from 'clsx';
import { FolderItem } from '../types';
import { useTranslation } from 'react-i18next';
import Tooltip from './Tooltip';

const IconMap: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>> = {
  Zap,
  Flame,
  Star,
  Leaf,
  Droplets,
  Cloud,
  Moon,
  Music,
  Shield,
  Cpu,
  Database,
  Globe,
  Lock,
  Terminal,
  Code,
  Command,
  Compass,
  HardDrive,
  Ghost,
  Activity,
  Folder: FolderIcon,
  FolderHeart,
  FolderSync,
  FolderOpen,
  FolderLock,
  Archive,
  Briefcase,
  Bookmark,
  Tag,
  Inbox,
  Layers,
  Layout,
  Library,
  Package,
  Paperclip,
  Puzzle,
  Settings,
  Share2,
  Smile,
  Sun,
};

interface MoveToFolderModalProps {
  isOpen: boolean;
  folders: FolderItem[];
  onClose: () => void;
  onSelect: (folderId: string | null) => void;
}

type FolderChoice = {
  key: string;
  id: string | null;
  name: string;
  icon?: string | null;
  color?: string | null;
  count?: number;
  isMain?: boolean;
};

export const MoveToFolderModal: React.FC<MoveToFolderModalProps> = ({
  isOpen,
  folders,
  onClose,
  onSelect,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const filterRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const choices = useMemo<FolderChoice[]>(() => {
    const userFolders = folders.filter((f) => !f.is_system);
    return [
      {
        key: 'main',
        id: null,
        name: t('folders.mainClipboard'),
        isMain: true,
      },
      ...userFolders.map((folder) => ({
        key: folder.id,
        id: folder.id,
        name: folder.name,
        icon: folder.icon,
        color: folder.color,
        count: folder.item_count || 0,
      })),
    ];
  }, [folders, t]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return choices;
    return choices.filter((item) => item.name.toLowerCase().includes(needle));
  }, [choices, query]);

  const confirm = useCallback(
    (index: number) => {
      const item = filtered[index];
      if (!item) return;
      onSelect(item.id);
      onClose();
    },
    [filtered, onSelect, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setActiveIndex(0);
    const timer = window.setTimeout(() => filterRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex((prev) => {
      if (filtered.length === 0) return 0;
      return Math.min(prev, filtered.length - 1);
    });
  }, [filtered.length]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, filtered]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (filtered.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Home') {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex(filtered.length - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        confirm(activeIndex);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, filtered, activeIndex, confirm, onClose]);

  if (!isOpen) return null;

  const userFolderCount = folders.filter((f) => !f.is_system).length;
  const activeId = filtered[activeIndex] ? `copy-folder-${filtered[activeIndex].key}` : undefined;

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-folder-title"
        className="animate-in zoom-in-95 flex max-h-[min(85vh,520px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-[0_0_50px_rgba(var(--primary-rgb),0.15)] duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h3
            id="copy-folder-title"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight text-primary"
          >
            <FolderIcon size={16} />
            {t('folders.copyToFolder')}
          </h3>
          <Tooltip label={t('common.close')} placement="bottom">
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X size={16} />
            </button>
          </Tooltip>
        </div>

        <div className="flex-shrink-0 px-4 pb-2 pt-3">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60"
            />
            <input
              ref={filterRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder={t('folders.filterFolders')}
              aria-controls="copy-folder-list"
              aria-activedescendant={activeId}
              className="h-8 w-full rounded-[4px] border border-border bg-input py-1.5 pl-8 pr-2.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-0"
            />
          </div>
        </div>

        <div
          id="copy-folder-list"
          role="listbox"
          aria-label={t('folders.copyToFolder')}
          className="custom-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              {userFolderCount === 0 && !query.trim()
                ? t('folders.noFoldersCreated')
                : t('folders.noMatchingFolders')}
            </div>
          ) : (
            filtered.map((item, index) => {
              const Icon = item.isMain
                ? Clipboard
                : IconMap[item.icon || 'Folder'] || FolderIcon;
              const iconColor = item.color || undefined;
              const isActive = index === activeIndex;

              return (
                <button
                  key={item.key}
                  id={`copy-folder-${item.key}`}
                  ref={isActive ? activeRef : undefined}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => confirm(index)}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
                    isActive
                      ? 'border-primary/30 bg-primary/10 text-foreground'
                      : 'border-transparent text-foreground/90 hover:bg-white/[0.04]'
                  )}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: item.isMain
                        ? 'rgba(var(--primary-rgb), 0.12)'
                        : item.color
                          ? `${item.color}22`
                          : 'rgba(var(--primary-rgb), 0.1)',
                    }}
                  >
                    <Icon
                      size={16}
                      style={{ color: item.isMain ? undefined : iconColor }}
                      className={item.isMain ? 'text-primary' : undefined}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.name}</span>
                    {item.count != null && (
                      <span className="block text-[11px] text-muted-foreground/70">
                        {t('folders.itemCount', { count: item.count })}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex-shrink-0 border-t border-border px-4 py-2 text-center text-[10px] text-muted-foreground/70">
          {t('folders.copyToFolderHint')}
        </div>
      </div>
    </div>
  );
};
