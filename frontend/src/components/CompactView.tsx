import React, { useRef, useEffect } from 'react';
import { ClipboardItem as AppClip, FolderItem } from '../types';
import {
  Search,
  Maximize2,
  Clock,
  Trash2,
  Folder as FolderIcon,
  X,
  Pin,
  PinOff,
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
  RotateCcw,
  MoveHorizontal,
  MoveVertical,
  PanelLeftClose,
  PanelLeftOpen,
  PanelTop,
  Plus,
  FileText,
  Link,
  File as LucideFile,
  Image as ImageIcon,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { convertFileSrc } from '@tauri-apps/api/core';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const IconMap: Record<string, any> = {
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

interface CompactViewProps {
  clips: AppClip[];
  folders: FolderItem[];
  selectedFolder: string | null;
  selectedClipId: string | null;
  onSelectFolder: (id: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onPaste: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleMode: () => void;
  onOpenSettings: () => void;
  isLoading: boolean;
  theme: 'light' | 'dark';
  totalClipCount: number;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onFolderContextMenu?: (e: React.MouseEvent, id: string) => void;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
  onDragStart: (clipId: string, startX: number, startY: number) => void;
  onDragHover: (folderId: string | null) => void;
  onDragLeave: () => void;
  isDragging: boolean;
  draggingClipId?: string | null;
  reorderTargetClipId?: string | null;
  reorderTargetPosition?: 'before' | 'after' | null;
  reorderEnabled?: boolean;
  dragTargetFolderId: string | null;
  compactFolderLayout?: 'horizontal' | 'vertical';
  compactSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onToggleLayout?: () => void;
  onAddFolder?: () => void;
  onLoadMore?: () => void;
}

export const CompactView: React.FC<CompactViewProps> = ({
  clips,
  folders,
  selectedFolder,
  selectedClipId,
  onSelectFolder,
  searchQuery,
  onSearchChange,
  onPaste,
  onDelete,
  onToggleMode,
  onOpenSettings,
  isLoading,
  theme,
  totalClipCount,
  isPinned = false,
  onTogglePin,
  onFolderContextMenu,
  onContextMenu,
  onDragStart,
  onDragHover,
  onDragLeave,
  isDragging,
  draggingClipId,
  reorderTargetClipId,
  reorderTargetPosition,
  reorderEnabled,
  dragTargetFolderId,
  compactFolderLayout = 'horizontal',
  compactSidebarCollapsed = false,
  onToggleSidebar,
  onToggleLayout,
  onAddFolder,
  onLoadMore,
}) => {
  const { t } = useTranslation();
  const folderScrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isVertical = compactFolderLayout === 'vertical';

  // Auto-scroll selected folder into view
  useEffect(() => {
    const selectedBtn = folderScrollRef.current?.querySelector('[data-selected="true"]');
    if (selectedBtn) {
      selectedBtn.scrollIntoView({
        behavior: 'smooth',
        block: isVertical ? 'nearest' : 'center',
        inline: isVertical ? 'center' : 'center',
      });
    }
  }, [selectedFolder, isVertical]);

  const getClipImageSrc = (content: string) => {
    if (!content) return '';
    const isAbsolutePath = content.startsWith('/') || /^[A-Za-z]:[\\/]/.test(content);
    if (
      content.startsWith('data:') ||
      content.startsWith('http://') ||
      content.startsWith('https://') ||
      content.startsWith('asset:') ||
      content.startsWith('tauri://')
    ) {
      return content;
    }
    if (isAbsolutePath) {
      return convertFileSrc(content);
    }
    return `data:image/png;base64,${content}`;
  };

  const handleResetSize = async () => {
    try {
      await invoke('reset_window_size');
    } catch (error) {
      console.error('Failed to reset window size:', error);
    }
  };

  // Auto-scroll to selected clip
  useEffect(() => {
    if (selectedClipId && listRef.current) {
      const el = listRef.current.querySelector(`[data-clip-id="${selectedClipId}"]`);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedClipId]);

  // Load more clips when scrolling near the bottom
  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!onLoadMore) return;
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      onLoadMore();
    }
  };

  const folderPillClass = (_folderId: string | null, isSelected: boolean, isDragTarget: boolean) =>
    cn(
      'px-3 py-1 rounded-full text-[10px] font-medium transition-all whitespace-nowrap flex items-center gap-1.5 border',
      isSelected && !dragTargetFolderId
        ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
        : isDragTarget && isDragging
          ? 'bg-cyan-500/30 border-cyan-400 text-white'
          : 'bg-white/5 hover:bg-white/10 border-transparent opacity-60 hover:opacity-100'
    );

  const folderPillClassNamed = (
    _folderId: string,
    isSelected: boolean,
    isDragTarget: boolean,
    _color?: string | null
  ) =>
    cn(
      'px-3 py-1 rounded-full text-[10px] font-medium transition-all whitespace-nowrap flex items-center gap-1.5 border',
      isSelected && !dragTargetFolderId
        ? 'bg-primary/10 text-white/80 border-primary/60 shadow-[0_0_12px_rgba(99,102,241,0.3)] ring-1 ring-primary/40'
        : isDragTarget && isDragging
          ? 'bg-cyan-500/30 border-cyan-400 text-white'
          : 'bg-white/5 hover:bg-white/10 border-transparent opacity-60 hover:opacity-100'
    );

  const sidebarWidth = isVertical ? (compactSidebarCollapsed ? 0 : 140) : 0;

  return (
    <div
      className={cn(
        "relative flex h-full w-full select-none flex-col overflow-hidden font-['Segoe_UI',system-ui,sans-serif]",
        theme === 'dark' ? 'text-white/90' : 'text-slate-800'
      )}
      style={{ border: '1px solid rgba(34, 211, 238, 0.1)' }}
    >
      <style>{`
        @keyframes compact-scan {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
      {/* Header */}
      <div
        data-tauri-drag-region
        className="relative flex flex-shrink-0 cursor-move items-center justify-between overflow-hidden border-b border-white/10 bg-white/5 p-3 backdrop-blur-md"
      >
        {/* Scan-line sweep (CSS-only, GPU-composited) - 50% opacity of full view */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-y-0 w-[25%]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.025), transparent)',
              animation: 'compact-scan 6.5s ease-in-out infinite alternate',
            }}
          />
        </div>
        <div data-tauri-drag-region className="flex items-center gap-2">
          {isVertical && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              title={compactSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {compactSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          )}
          <div
            data-tauri-drag-region
            className="flex h-6 w-6 items-center justify-center overflow-hidden"
          >
            <img src="/logo.png" alt="Logo" className="h-5 w-5 object-contain" />
          </div>
          <div data-tauri-drag-region className="flex items-baseline gap-1.5">
            <span data-tauri-drag-region className="text-sm font-bold tracking-tight">
              CyberPaste
            </span>
            <span
              data-tauri-drag-region
              className="rounded-sm border border-cyan-400/20 bg-cyan-400/10 px-1.5 text-[10px] font-medium uppercase tracking-widest text-cyan-400/80"
            >
              Compact
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md transition-all',
                isPinned
                  ? 'border border-indigo-500/30 bg-indigo-500/15 text-indigo-400'
                  : 'hover:bg-white/8 text-white/30 hover:text-white/70'
              )}
              title={isPinned ? 'Unpin Window' : 'Pin Window'}
            >
              {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
          )}
          {onToggleLayout && (
            <button
              onClick={onToggleLayout}
              className="hover:bg-white/8 flex h-7 w-7 items-center justify-center rounded-md text-white/30 transition-all hover:text-white/70"
              title={isVertical ? t('compact.switchHorizontal') : t('compact.switchVertical')}
            >
              {isVertical ? <PanelTop size={14} /> : <PanelLeftOpen size={14} />}
            </button>
          )}
          <button
            onClick={handleResetSize}
            className="hover:bg-white/8 flex h-7 w-7 items-center justify-center rounded-md text-white/30 transition-all hover:text-white/70"
            title="Reset Default Size"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={onOpenSettings}
            className="hover:bg-white/8 flex h-7 w-7 items-center justify-center rounded-md text-white/30 transition-all hover:text-white/70"
            title="Settings"
          >
            <Settings size={14} />
          </button>

          {/* View-toggle — primary action pill */}
          <button
            onClick={onToggleMode}
            className="group relative ml-1 flex h-7 items-center gap-1.5 overflow-hidden rounded-lg border border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 px-2.5 text-[10px] font-bold uppercase tracking-widest text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)] transition-all duration-200 hover:border-cyan-400/70 hover:from-cyan-500/30 hover:to-indigo-500/30 hover:shadow-[0_0_18px_rgba(6,182,212,0.45)]"
            title="Compact View"
          >
            {/* shimmer sweep */}
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
            <Maximize2 size={13} className="relative z-10 flex-shrink-0" />
          </button>

          <button
            onClick={() => (window as any).__TAURI_INTERNALS__.invoke('hide_window')}
            className="hover:bg-rose-500/12 ml-0.5 flex h-7 w-7 items-center justify-center rounded-md text-white/25 transition-all hover:text-rose-400"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {isVertical ? (
        /* === VERTICAL LAYOUT === */
        <div className="flex flex-1 flex-row overflow-hidden">
          {/* Sidebar */}
          <div
            className="flex-shrink-0 overflow-hidden border-r border-white/10 bg-black/10 transition-all duration-200"
            style={{ width: sidebarWidth }}
          >
            <div
              ref={folderScrollRef}
              onWheel={(e) => {
                // Cycle through folders with mouse wheel
                const allFolderIds = [null, ...folders.map((f) => f.id)];
                const currentIndex = allFolderIds.indexOf(selectedFolder);

                if (e.deltaY > 0) {
                  // Wheel down -> Next folder
                  if (currentIndex < allFolderIds.length - 1) {
                    onSelectFolder(allFolderIds[currentIndex + 1]);
                  }
                } else if (e.deltaY < 0) {
                  // Wheel up -> Previous folder
                  if (currentIndex > 0) {
                    onSelectFolder(allFolderIds[currentIndex - 1]);
                  }
                }
              }}
              className="no-scrollbar flex h-full w-[140px] flex-col gap-1 overflow-y-auto py-2"
            >
              <button
                onClick={() => onSelectFolder(null)}
                data-selected={selectedFolder === null}
                className={cn(
                  'mx-1.5 flex flex-row items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-2 text-[10px] font-medium transition-all',
                  selectedFolder === null && !dragTargetFolderId
                    ? 'border-indigo-500/40 bg-indigo-500/20 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                    : dragTargetFolderId === null && isDragging
                      ? 'border-cyan-400 bg-cyan-500/30 text-white'
                      : 'border-transparent bg-white/5 opacity-60 hover:bg-white/10 hover:opacity-100'
                )}
                onMouseEnter={() => isDragging && onDragHover(null)}
                onMouseLeave={onDragLeave}
              >
                <Clock size={10} className="flex-shrink-0" />
                <span className="flex-1 truncate text-left">[Clipboard]</span>
                <span
                  className={cn(
                    'flex-shrink-0 text-[9px] opacity-40',
                    selectedFolder === null && 'opacity-80'
                  )}
                >
                  ({totalClipCount})
                </span>
              </button>
              {folders.map((folder) => {
                const Icon = IconMap[folder.icon || 'Folder'] || FolderIcon;
                const isSelected = selectedFolder === folder.id;
                return (
                  <button
                    key={folder.id}
                    onClick={() => onSelectFolder(folder.id)}
                    data-selected={isSelected}
                    onContextMenu={(e) => onFolderContextMenu?.(e, folder.id)}
                    className={cn(
                      'mx-1.5 flex flex-row items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-2 text-[10px] font-medium transition-all',
                      isSelected && !dragTargetFolderId
                        ? 'border-primary/60 bg-primary/10 text-white/80 shadow-[0_0_12px_rgba(99,102,241,0.3)] ring-1 ring-primary/40'
                        : dragTargetFolderId === folder.id && isDragging
                          ? 'border-cyan-400 bg-cyan-500/30 text-white'
                          : 'border-transparent bg-white/5 opacity-60 hover:bg-white/10 hover:opacity-100'
                    )}
                    onMouseEnter={() => isDragging && onDragHover(folder.id)}
                    onMouseLeave={onDragLeave}
                  >
                    <Icon
                      size={10}
                      style={{ color: folder.color || undefined }}
                      className={isSelected ? 'text-primary' : 'flex-shrink-0 text-white/30'}
                    />
                    <span className="flex-1 truncate text-left">{folder.name}</span>
                    <span
                      className={cn(
                        'flex-shrink-0 text-[9px] opacity-40',
                        isSelected && 'opacity-80'
                      )}
                    >
                      ({folder.item_count || 0})
                    </span>
                  </button>
                );
              })}
              {onAddFolder && (
                <button
                  onClick={onAddFolder}
                  className="mx-1.5 flex flex-row items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-dashed border-white/20 bg-white/5 px-2 py-2 text-[10px] font-medium text-white/40 transition-all hover:bg-white/10 hover:text-white/80"
                  title="Add Folder"
                >
                  <Plus size={10} />
                  <span className="flex-1 truncate text-left">New Folder</span>
                </button>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Search */}
            <div className="flex-shrink-0 p-2">
              <div className="group relative">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 transition-all group-focus-within:text-cyan-400 group-focus-within:opacity-100"
                  size={14}
                />
                <input
                  type="text"
                  placeholder={t('common.search')}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full rounded-lg border border-white/5 bg-black/20 py-1.5 pl-8 pr-8 text-sm transition-all focus:border-cyan-500/50 focus:bg-black/40 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div
              ref={listRef}
              className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-2 pb-2"
              onScroll={handleListScroll}
            >
              {clips.length === 0 && !isLoading ? (
                <div className="flex h-full flex-col items-center justify-center text-sm italic opacity-30">
                  <p>{t('clipList.empty')}</p>
                </div>
              ) : (
                clips.map((clip, index) => (
                  <ClipRow
                    key={clip.id}
                    clip={clip}
                    index={index}
                    clips={clips}
                    selectedClipId={selectedClipId}
                    selectedFolder={selectedFolder}
                    onPaste={onPaste}
                    onDelete={onDelete}
                    onContextMenu={onContextMenu}
                    onDragStart={onDragStart}
                    reorderEnabled={reorderEnabled}
                    reorderTargetClipId={reorderTargetClipId}
                    reorderTargetPosition={reorderTargetPosition}
                    getClipImageSrc={getClipImageSrc}
                    t={t}
                    formatDistanceToNow={formatDistanceToNow}
                    isDragging={clip.id === draggingClipId}
                  />
                ))
              )}
              {isLoading && (
                <div className="flex justify-center p-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-500" />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-shrink-0 items-center justify-between border-t border-white/5 bg-black/10 p-2 font-mono text-[9px] tracking-tighter opacity-40">
              <span>{t('compact.enterToPaste')}</span>
              <span>{t('compact.arrowsFolders')}</span>
              <span>{t('compact.escToHide')}</span>
            </div>
          </div>
        </div>
      ) : (
        /* === HORIZONTAL LAYOUT (existing) === */
        <>
          <div className="flex-shrink-0 space-y-2 p-2">
            <div className="group relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 transition-all group-focus-within:text-cyan-400 group-focus-within:opacity-100"
                size={14}
              />
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full rounded-lg border border-white/5 bg-black/20 py-1.5 pl-8 pr-8 text-sm transition-all focus:border-cyan-500/50 focus:bg-black/40 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div
              ref={folderScrollRef}
              onWheel={(e) => {
                // Cycle through folders with mouse wheel
                const allFolderIds = [null, ...folders.map((f) => f.id)];
                const currentIndex = allFolderIds.indexOf(selectedFolder);

                if (e.deltaY > 0) {
                  // Wheel down -> Next folder
                  if (currentIndex < allFolderIds.length - 1) {
                    onSelectFolder(allFolderIds[currentIndex + 1]);
                  }
                } else if (e.deltaY < 0) {
                  // Wheel up -> Previous folder
                  if (currentIndex > 0) {
                    onSelectFolder(allFolderIds[currentIndex - 1]);
                  }
                }
              }}
              className="no-scrollbar flex gap-1 overflow-x-auto scroll-smooth pb-1"
            >
              <button
                onClick={() => onSelectFolder(null)}
                data-selected={selectedFolder === null}
                className={folderPillClass(
                  null,
                  selectedFolder === null,
                  dragTargetFolderId === null
                )}
                onMouseEnter={() => isDragging && onDragHover(null)}
                onMouseLeave={onDragLeave}
              >
                <Clock size={10} />
                [Clipboard]
                <span
                  className={cn('text-[9px] opacity-40', selectedFolder === null && 'opacity-80')}
                >
                  ({totalClipCount})
                </span>
              </button>
              {folders.map((folder) => {
                const isSelected = selectedFolder === folder.id;
                const Icon = IconMap[folder.icon || 'Folder'] || FolderIcon;
                return (
                  <button
                    key={folder.id}
                    onClick={() => onSelectFolder(folder.id)}
                    data-selected={isSelected}
                    onContextMenu={(e) => onFolderContextMenu?.(e, folder.id)}
                    className={folderPillClassNamed(
                      folder.id,
                      isSelected,
                      dragTargetFolderId === folder.id,
                      folder.color
                    )}
                    onMouseEnter={() => isDragging && onDragHover(folder.id)}
                    onMouseLeave={onDragLeave}
                  >
                    <Icon
                      size={10}
                      style={{ color: folder.color || undefined }}
                      className={isSelected ? 'text-primary' : 'text-white/30'}
                    />
                    {folder.name}
                    <span className={cn('text-[9px] opacity-40', isSelected && 'opacity-80')}>
                      ({folder.item_count || 0})
                    </span>
                  </button>
                );
              })}
              {onAddFolder && (
                <button
                  onClick={onAddFolder}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-white/20 bg-white/5 px-2 py-1 text-[10px] font-medium text-white/40 transition-all hover:bg-white/10 hover:text-white/80"
                  title="Add Folder"
                >
                  <Plus size={10} />
                  New
                </button>
              )}
            </div>
          </div>

          <div
            ref={listRef}
            className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-2 pb-2"
            onScroll={handleListScroll}
          >
            {clips.length === 0 && !isLoading ? (
              <div className="flex h-full flex-col items-center justify-center text-sm italic opacity-30">
                <p>{t('clipList.empty')}</p>
              </div>
            ) : (
              clips.map((clip, index) => (
                <ClipRow
                  key={clip.id}
                  clip={clip}
                  index={index}
                  clips={clips}
                  selectedClipId={selectedClipId}
                  selectedFolder={selectedFolder}
                  onPaste={onPaste}
                  onDelete={onDelete}
                  onContextMenu={onContextMenu}
                  onDragStart={onDragStart}
                  reorderEnabled={reorderEnabled}
                  reorderTargetClipId={reorderTargetClipId}
                  reorderTargetPosition={reorderTargetPosition}
                  getClipImageSrc={getClipImageSrc}
                  t={t}
                  formatDistanceToNow={formatDistanceToNow}
                  isDragging={clip.id === draggingClipId}
                />
              ))
            )}
            {isLoading && (
              <div className="flex justify-center p-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-500" />
              </div>
            )}
          </div>

          <div className="flex flex-shrink-0 items-center justify-between border-t border-white/5 bg-black/10 p-2 font-mono text-[9px] tracking-tighter opacity-40">
            <span>{t('compact.enterToPaste')}</span>
            <span>{t('compact.arrowsFolders')}</span>
            <span>{t('compact.escToHide')}</span>
          </div>
        </>
      )}
    </div>
  );
};

// Extracted clip row component to avoid duplication between horizontal and vertical layouts
const ClipRow: React.FC<{
  clip: AppClip;
  index: number;
  clips: AppClip[];
  selectedClipId: string | null;
  selectedFolder: string | null;
  onPaste: (id: string) => void;
  onDelete: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
  onDragStart: (clipId: string, startX: number, startY: number) => void;
  reorderEnabled?: boolean;
  reorderTargetClipId?: string | null;
  reorderTargetPosition?: 'before' | 'after' | null;
  getClipImageSrc: (content: string) => string;
  t: (key: string) => string;
  formatDistanceToNow: (date: Date, opts: { addSuffix: boolean }) => string;
  isDragging?: boolean;
}> = ({
  clip,
  index,
  clips,
  selectedClipId,
  selectedFolder,
  onPaste,
  onDelete,
  onContextMenu,
  onDragStart,
  reorderEnabled,
  reorderTargetClipId,
  reorderTargetPosition,
  getClipImageSrc,
  t,
  formatDistanceToNow,
  isDragging,
}) => {
  return (
    <React.Fragment>
      {reorderEnabled && reorderTargetClipId === clip.id && reorderTargetPosition === 'before' && (
        <div className="mx-2 h-0.5 flex-shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
      )}
      <div
        data-clip-id={clip.id}
        onClick={() => onPaste(clip.id)}
        onContextMenu={(e) => onContextMenu?.(e, clip.id)}
        onMouseDown={(e) => {
          if (e.button === 0) {
            onDragStart(clip.id, e.clientX, e.clientY);
          }
        }}
        draggable="false"
        className={clsx(
          'group relative flex h-10 flex-shrink-0 cursor-pointer items-center gap-3 overflow-hidden rounded-lg border px-2 py-1.5 transition-all',
          selectedClipId === clip.id
            ? 'border-indigo-500/40 bg-indigo-500/15 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
            : 'border-white/5 bg-white/5 hover:border-cyan-500/30 hover:bg-white/10',
          reorderEnabled && 'cursor-grab active:cursor-grabbing',
          isDragging && 'opacity-40 scale-95 pointer-events-none'
        )}
      >
        <div className="flex w-8 flex-shrink-0 items-center justify-center">
          <span className="font-mono text-[10px] opacity-30">#{clips.length - index}</span>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {clip.clip_type === 'image' ? (
            <>
              <div className="flex h-8 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-white/10 bg-black/20">
                {clip.content ? (
                  <img
                    src={getClipImageSrc(clip.content)}
                    alt="clip"
                    draggable="false"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] opacity-40">IMG</span>
                )}
              </div>
              {(() => {
                try {
                  const parsed = clip.metadata
                    ? (JSON.parse(clip.metadata) as {
                        size_bytes?: number;
                        width?: number;
                        height?: number;
                      })
                    : null;
                  const w = parsed?.width || 0;
                  const h = parsed?.height || 0;
                  const kb = parsed?.size_bytes ? Math.round(parsed.size_bytes / 1024) : 0;
                  if (w && h && kb) {
                    return (
                      <span className="flex items-center gap-1.5 whitespace-nowrap text-[10px] opacity-40">
                        <span className="flex items-center gap-0.5">
                          <MoveHorizontal size={9} />
                          {w}
                        </span>
                        <span className="opacity-50">×</span>
                        <span className="flex items-center gap-0.5">
                          <MoveVertical size={9} />
                          {h}
                        </span>
                        <span className="opacity-50">•</span>
                        <span>{kb}KB</span>
                      </span>
                    );
                  }
                } catch {
                  /* empty */
                }
                return null;
              })()}
            </>
          ) : clip.clip_type === 'file' ? (
            <span className="flex items-center gap-2 truncate">
              <span className="flex-shrink-0 text-[10px] font-bold uppercase text-yellow-400/70">
                FILE
              </span>
              <span className="truncate text-xs leading-none text-muted-foreground/80">
                {clip.preview}
              </span>
            </span>
          ) : (
            <span className="truncate text-xs font-medium leading-none">
              {clip.preview.replace(/[\n\r\t]+/g, ' ')}
            </span>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-3 pr-2">
          <span className="flex items-center gap-2 whitespace-nowrap text-[10px] opacity-40">
            {index === 0 && !selectedFolder && (
              <span className="text-[8px] font-bold uppercase tracking-widest text-cyan-400/90">
                Latest
              </span>
            )}
            {clip.is_pinned && (
              <Pin
                size={10}
                className="text-cyan-400 opacity-90 fill-cyan-400/20 -rotate-45"
              />
            )}
            {(() => {
              const TypeIcon =
                clip.clip_type === 'image'
                  ? ImageIcon
                  : clip.clip_type === 'html' || clip.clip_type === 'rtf'
                    ? Code
                    : clip.clip_type === 'url'
                      ? Link
                      : clip.clip_type === 'file'
                        ? LucideFile
                        : FileText;
              return (
                <TypeIcon
                  size={11}
                  className="text-cyan-400/90 opacity-70 shadow-[0_0_8px_rgba(34,211,238,0.4)] transition-opacity group-hover:opacity-100"
                />
              );
            })()}
            {clip.source_icon && (
              <img
                src={`data:image/png;base64,${clip.source_icon}`}
                alt=""
                draggable="false"
                className="h-3.5 w-3.5 object-contain opacity-80 transition-opacity group-hover:opacity-100"
              />
            )}
            <Clock size={10} className="text-current" />
            {formatDistanceToNow(new Date(clip.created_at), { addSuffix: false })}
          </span>

          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(clip.id);
              }}
              className="rounded bg-red-500/20 p-1 text-red-400 transition-colors hover:bg-red-500/40"
              title={t('common.delete')}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
      {reorderEnabled && reorderTargetClipId === clip.id && reorderTargetPosition === 'after' && (
        <div className="mx-2 h-0.5 flex-shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
      )}
    </React.Fragment>
  );
};
