import React, { useRef, useEffect, useMemo, useState } from 'react';
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
  ChevronDown,
  Check,
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
import type { LucideIcon } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { convertFileSrc } from '@tauri-apps/api/core';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CompactTypeFilter = 'all' | 'text' | 'code' | 'image' | 'url' | 'file';

const TYPE_FILTER_OPTIONS: {
  value: CompactTypeFilter;
  labelKey: string;
  fallback: string;
  icon: LucideIcon;
}[] = [
  { value: 'all',   labelKey: 'compact.filterAll',   fallback: 'All',   icon: Layers },
  { value: 'text',  labelKey: 'compact.filterText',  fallback: 'Text',  icon: FileText },
  { value: 'code',  labelKey: 'compact.filterCode',  fallback: 'Code',  icon: Code },
  { value: 'image', labelKey: 'compact.filterImage', fallback: 'Image', icon: ImageIcon },
  { value: 'url',   labelKey: 'compact.filterUrl',   fallback: 'URL',   icon: Link },
  { value: 'file',  labelKey: 'compact.filterFile',  fallback: 'File',  icon: LucideFile },
];

const TypeFilterDropdown: React.FC<{
  value: CompactTypeFilter;
  onChange: (v: CompactTypeFilter) => void;
  t: (k: string, opts?: any) => string;
  counts: Record<CompactTypeFilter, number>;
}> = ({ value, onChange, t, counts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 170,
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      const menuEl = document.getElementById('compact-type-filter-menu');
      if (menuEl?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const openMenu = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = 170;
    const viewportRight = window.innerWidth - 6;
    let left = rect.right - width;
    if (left + width > viewportRight) left = viewportRight - width;
    if (left < 6) left = 6;
    setMenuPos({ top: rect.bottom + 4, left, width });
    setIsOpen(true);
  };

  const selected =
    TYPE_FILTER_OPTIONS.find((o) => o.value === value) ?? TYPE_FILTER_OPTIONS[0];
  const SelectedIcon = selected.icon;
  const isActive = value !== 'all';
  const label = t(selected.labelKey) === selected.labelKey ? selected.fallback : t(selected.labelKey);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        className={cn(
          'flex h-[30px] flex-shrink-0 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium transition-all',
          isActive
            ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.18)]'
            : 'border-white/5 bg-black/20 text-white/55 hover:border-white/15 hover:bg-black/30 hover:text-white/85',
          isOpen && 'border-cyan-400/60 bg-cyan-500/15 text-cyan-300'
        )}
        title={`${t('compact.filterTitle') === 'compact.filterTitle' ? 'Filter by type' : t('compact.filterTitle')}: ${label}`}
      >
        <SelectedIcon size={12} />
        <ChevronDown
          size={11}
          className={cn('opacity-70 transition-transform', isOpen && 'rotate-180')}
        />
      </button>
      {isOpen && (
        <div
          id="compact-type-filter-menu"
          className="fixed z-[200] overflow-hidden rounded-lg border border-cyan-500/25 bg-black/95 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.55)] backdrop-blur-md"
          style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
        >
          {TYPE_FILTER_OPTIONS.map((opt) => {
            const OptIcon = opt.icon;
            const isSel = opt.value === value;
            const optLabel =
              t(opt.labelKey) === opt.labelKey ? opt.fallback : t(opt.labelKey);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-2.5 py-1.5 text-[11px] transition-colors',
                  isSel
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <OptIcon size={12} className={cn(isSel ? 'text-cyan-300' : 'text-white/60')} />
                <span className="flex-1 text-left">{optLabel}</span>
                <span className={cn(
                  'text-[9px] font-mono opacity-40 px-1',
                  isSel && 'opacity-85 text-cyan-300'
                )}>
                  ({counts[opt.value]})
                </span>
                {isSel && <Check size={11} className="text-cyan-400" />}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};

const matchesTypeFilter = (clipType: string, filter: CompactTypeFilter): boolean => {
  if (filter === 'all') return true;
  if (filter === 'code') return clipType === 'code' || clipType === 'html' || clipType === 'rtf';
  if (filter === 'text') return clipType === 'text';
  return clipType === filter;
};

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
  dragTargetFolderId: string | null | undefined;
  compactFolderLayout?: 'horizontal' | 'vertical';
  compactSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onToggleLayout?: () => void;
  onAddFolder?: () => void;
  onLoadMore?: () => void;
  onReorderFolder?: (folderId: string, targetId: string, position: 'before' | 'after') => void;
  typeFilter?: CompactTypeFilter;
  onTypeFilterChange?: (v: CompactTypeFilter) => void;
  searchFocusToken?: number;
  clipNumbering?: 'positional' | 'countdown';
  isWindowActive?: boolean;
}

export const CompactView: React.FC<CompactViewProps> = ({
  isWindowActive = true,
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
  onReorderFolder,
  typeFilter = 'all',
  onTypeFilterChange,
  searchFocusToken,
  clipNumbering = 'positional',
}) => {
  const { t } = useTranslation();
  const folderScrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isVertical = compactFolderLayout === 'vertical';
  const searchInputRef = useRef<HTMLInputElement>(null);
  const didFocusRef = useRef(false);

  useEffect(() => {
    if (!didFocusRef.current) {
      didFocusRef.current = true;
      return;
    }
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.setSelectionRange(
        searchInputRef.current.value.length,
        searchInputRef.current.value.length
      );
    }
  }, [searchFocusToken]);

  useEffect(() => {
    if (!searchQuery && document.activeElement === searchInputRef.current) {
      searchInputRef.current?.blur();
    }
  }, [searchQuery]);

  const filteredClips = useMemo(
    () => (typeFilter === 'all' ? clips : clips.filter((c) => matchesTypeFilter(c.clip_type, typeFilter))),
    [clips, typeFilter]
  );
  const isFiltering = typeFilter !== 'all';

  const filterCounts = useMemo(() => {
    let all = clips.length;
    let text = 0;
    let code = 0;
    let image = 0;
    let url = 0;
    let file = 0;
    clips.forEach((c) => {
      if (c.clip_type === 'text') text++;
      else if (c.clip_type === 'code' || c.clip_type === 'html' || c.clip_type === 'rtf') code++;
      else if (c.clip_type === 'image') image++;
      else if (c.clip_type === 'url') url++;
      else if (c.clip_type === 'file') file++;
    });
    return { all, text, code, image, url, file };
  }, [clips]);

  // Folder Reorder Drag State (Simulated)
  const [draggingFolderId, setDraggingFolderId] = React.useState<string | null>(null);
  const [folderReorderTargetId, setFolderReorderTargetId] = React.useState<string | null>(null);
  const [folderReorderTargetPosition, setFolderReorderTargetPosition] = React.useState<'before' | 'after' | null>(null);

  const pendingFolderDragRef = useRef<{ id: string; startX: number; startY: number } | null>(null);
  const wasFolderDraggingRef = useRef<boolean>(false);

  // Highlighted folder for smooth wheel navigation
  const [highlightedFolderId, setHighlightedFolderId] = React.useState<string | null>(selectedFolder);
  const isWheelNavigatingRef = useRef(false);
  const wheelTimeoutRef = useRef<any>(null);
  const wheelCooldownRef = useRef(false);
  const wheelAccumulatorRef = useRef(0);
  const wheelResetTimeoutRef = useRef<any>(null);

  // Sync highlightedFolderId with selectedFolder when not wheel scrolling
  useEffect(() => {
    if (!isWheelNavigatingRef.current) {
      setHighlightedFolderId(selectedFolder);
    }
  }, [selectedFolder]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      if (wheelResetTimeoutRef.current) clearTimeout(wheelResetTimeoutRef.current);
    };
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    if (wheelCooldownRef.current) return;

    // Accumulate delta
    wheelAccumulatorRef.current += e.deltaY;

    // Reset accumulator after 150ms of inactivity
    if (wheelResetTimeoutRef.current) clearTimeout(wheelResetTimeoutRef.current);
    wheelResetTimeoutRef.current = setTimeout(() => {
      wheelAccumulatorRef.current = 0;
    }, 150);

    // If accumulated delta is less than threshold (40), wait for more scroll
    if (Math.abs(wheelAccumulatorRef.current) < 40) return;

    const direction = wheelAccumulatorRef.current > 0 ? 1 : -1;
    wheelAccumulatorRef.current = 0; // Reset accumulator immediately upon step
    if (wheelResetTimeoutRef.current) clearTimeout(wheelResetTimeoutRef.current);
    
    const allFolderIds = [null, ...folders.map((f) => f.id)];
    const currentIndex = allFolderIds.indexOf(highlightedFolderId);
    
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex > allFolderIds.length - 1) nextIndex = allFolderIds.length - 1;
    
    if (nextIndex === currentIndex) return;
    
    isWheelNavigatingRef.current = true;
    const targetFolderId = allFolderIds[nextIndex];
    setHighlightedFolderId(targetFolderId);
    
    // Auto-scroll folder button into view
    setTimeout(() => {
      const targetIdAttr = targetFolderId === null ? 'clipboard' : targetFolderId;
      const activeBtn = folderScrollRef.current?.querySelector(`[data-folder-id="${targetIdAttr}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({
          behavior: 'smooth',
          block: isVertical ? 'nearest' : 'center',
          inline: isVertical ? 'center' : 'center',
        });
      }
    }, 0);
    
    // Cooldown spacing (100ms) to prevent too fast successive transitions
    wheelCooldownRef.current = true;
    setTimeout(() => {
      wheelCooldownRef.current = false;
    }, 100);
    
    // Debounce the actual selectedFolder transition (300ms)
    if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    wheelTimeoutRef.current = setTimeout(() => {
      isWheelNavigatingRef.current = false;
      onSelectFolder(targetFolderId);
    }, 300);
  };

  const handleFolderMouseDown = (e: React.MouseEvent, folderId: string) => {
    if (e.button !== 0) return; // Left click only
    pendingFolderDragRef.current = {
      id: folderId,
      startX: e.clientX,
      startY: e.clientY,
    };
    wasFolderDraggingRef.current = false;
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const pending = pendingFolderDragRef.current;
      if (!pending) return;

      if (!wasFolderDraggingRef.current) {
        const dx = e.clientX - pending.startX;
        const dy = e.clientY - pending.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          wasFolderDraggingRef.current = true;
          setDraggingFolderId(pending.id);
          document.body.classList.add('is-dragging-folder');
        }
      }
    };

    const handleGlobalMouseUp = () => {
      const pending = pendingFolderDragRef.current;
      if (pending) {
        const isDragging = wasFolderDraggingRef.current;
        pendingFolderDragRef.current = null;

        if (isDragging) {
          if (draggingFolderId && folderReorderTargetId && folderReorderTargetPosition) {
            if (onReorderFolder) {
              onReorderFolder(draggingFolderId, folderReorderTargetId, folderReorderTargetPosition);
            }
          }
          setDraggingFolderId(null);
          setFolderReorderTargetId(null);
          setFolderReorderTargetPosition(null);
          document.body.classList.remove('is-dragging-folder');
          setTimeout(() => {
            wasFolderDraggingRef.current = false;
          }, 50);
        }
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingFolderId, folderReorderTargetId, folderReorderTargetPosition, onReorderFolder]);

  const handleFolderMouseMove = (e: React.MouseEvent, folderId: string, isVerticalLayout: boolean) => {
    if (!wasFolderDraggingRef.current || !pendingFolderDragRef.current || pendingFolderDragRef.current.id === folderId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    let position: 'before' | 'after';
    if (isVerticalLayout) {
      const midY = rect.top + rect.height / 2;
      position = e.clientY < midY ? 'before' : 'after';
    } else {
      const midX = rect.left + rect.width / 2;
      position = e.clientX < midX ? 'before' : 'after';
    }

    setFolderReorderTargetId(folderId);
    setFolderReorderTargetPosition(position);
  };

  const handleFolderMouseLeave = () => {
    if (!wasFolderDraggingRef.current || !pendingFolderDragRef.current) return;
    setFolderReorderTargetId(null);
    setFolderReorderTargetPosition(null);
  };

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
      isSelected && dragTargetFolderId === undefined
        ? 'border-indigo-500/40 bg-indigo-500/15 shadow-[0_0_12px_rgba(99,102,241,0.2)] text-white/90'
        : isDragTarget && isDragging
          ? 'bg-cyan-500/30 border-cyan-400 text-white'
          : 'bg-white/5 hover:bg-white/10 border-transparent opacity-75 hover:opacity-100'
    );

  const folderPillClassNamed = (
    _folderId: string,
    isSelected: boolean,
    isDragTarget: boolean,
    _color?: string | null
  ) =>
    cn(
      'px-3 py-1 rounded-full text-[10px] font-medium transition-all whitespace-nowrap flex items-center gap-1.5 border',
      isSelected && dragTargetFolderId === undefined
        ? 'border-indigo-500/40 bg-indigo-500/15 shadow-[0_0_12px_rgba(99,102,241,0.2)] text-white/90'
        : isDragTarget && isDragging
          ? 'bg-cyan-500/30 border-cyan-400 text-white'
          : 'bg-white/5 hover:bg-white/10 border-transparent opacity-75 hover:opacity-100'
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
              animation: isWindowActive ? 'compact-scan 6.5s ease-in-out infinite alternate' : 'none',
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
            title="Full Mode"
          >
            {/* shimmer sweep */}
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
            <Maximize2 size={13} className="relative z-10 flex-shrink-0" />
          </button>

          <button
            onClick={() => invoke('hide_window').catch(() => (window as any).__TAURI_INTERNALS__?.invoke('hide_window'))}
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
              onWheel={handleWheel}
              className="no-scrollbar flex h-full w-[140px] flex-col gap-1 overflow-y-auto py-2"
            >
              <button
                onClick={() => onSelectFolder(null)}
                data-folder-id="clipboard"
                data-selected={highlightedFolderId === null}
                className={cn(
                  'mx-1.5 flex flex-row items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-all',
                  highlightedFolderId === null && dragTargetFolderId === undefined
                    ? 'border-indigo-500/40 bg-indigo-500/15 shadow-[0_0_12px_rgba(99,102,241,0.2)] text-white/90'
                    : dragTargetFolderId === null && isDragging
                      ? 'border-cyan-400 bg-cyan-500/30 text-white'
                      : 'border-transparent bg-white/5 opacity-75 hover:bg-white/10 hover:opacity-100'
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
                const isSelected = highlightedFolderId === folder.id;
                return (
                  <React.Fragment key={folder.id}>
                    {folderReorderTargetId === folder.id && folderReorderTargetPosition === 'before' && (
                      <div className="mx-2 h-0.5 flex-shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-pulse" />
                    )}
                    <button
                      data-folder-id={folder.id}
                      onMouseDown={(e) => handleFolderMouseDown(e, folder.id)}
                      onMouseMove={(e) => handleFolderMouseMove(e, folder.id, true)}
                      onMouseLeave={() => {
                        handleFolderMouseLeave();
                        onDragLeave();
                      }}
                      onClick={() => {
                        if (wasFolderDraggingRef.current) return;
                        onSelectFolder(folder.id);
                      }}
                      data-selected={isSelected}
                      onContextMenu={(e) => onFolderContextMenu?.(e, folder.id)}
                      className={cn(
                        'mx-1.5 flex flex-row items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-all',
                        isSelected && dragTargetFolderId === undefined
                          ? 'border-indigo-500/40 bg-indigo-500/15 shadow-[0_0_12px_rgba(99,102,241,0.2)] text-white/90'
                          : dragTargetFolderId === folder.id && isDragging
                            ? 'border-cyan-400 bg-cyan-500/30 text-white'
                            : 'border-transparent bg-white/5 opacity-75 hover:bg-white/10 hover:opacity-100',
                        draggingFolderId === folder.id && 'opacity-40 scale-95 pointer-events-none'
                      )}
                      onMouseEnter={() => isDragging && onDragHover(folder.id)}
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
                    {folderReorderTargetId === folder.id && folderReorderTargetPosition === 'after' && (
                      <div className="mx-2 h-0.5 flex-shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-pulse" />
                    )}
                  </React.Fragment>
                );
              })}
              {onAddFolder && (
                <button
                  onClick={onAddFolder}
                  className="mx-1.5 flex flex-row items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-dashed border-white/20 bg-white/5 px-2 py-1.5 text-[10px] font-medium text-white/40 transition-all hover:bg-white/10 hover:text-white/80"
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
              <div className="flex items-center gap-1.5">
                <div className="group relative flex-1 min-w-0">
                  <Search
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 transition-all group-focus-within:text-cyan-400 group-focus-within:opacity-100"
                    size={14}
                  />
                  <input
                    type="text"
                    id="search-input"
                    ref={searchInputRef}
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
                {onTypeFilterChange && (
                  <TypeFilterDropdown
                    value={typeFilter}
                    onChange={onTypeFilterChange}
                    t={t}
                    counts={filterCounts}
                  />
                )}
              </div>
            </div>

            {/* List */}
            <div
              ref={listRef}
              data-clip-list="true"
              className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-2 pb-2"
              onScroll={handleListScroll}
            >
              {filteredClips.length === 0 && !isLoading ? (
                <div className="flex h-full flex-col items-center justify-center text-sm italic opacity-30">
                  <p>
                    {isFiltering && clips.length > 0
                      ? t('compact.noMatchFilter') === 'compact.noMatchFilter'
                        ? 'No clips match this filter'
                        : t('compact.noMatchFilter')
                      : t('clipList.empty')}
                  </p>
                </div>
              ) : (
                filteredClips.map((clip, index) => (
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
                    clipNumbering={clipNumbering}
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
            <div className="flex items-center gap-1.5">
              <div className="group relative flex-1 min-w-0">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 transition-all group-focus-within:text-cyan-400 group-focus-within:opacity-100"
                  size={14}
                />
                <input
                  type="text"
                  id="search-input"
                  ref={searchInputRef}
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
              {onTypeFilterChange && (
                <TypeFilterDropdown
                  value={typeFilter}
                  onChange={onTypeFilterChange}
                  t={t}
                  counts={filterCounts}
                />
              )}
            </div>

            <div
              ref={folderScrollRef}
              onWheel={handleWheel}
              className="no-scrollbar flex gap-1 overflow-x-auto scroll-smooth pb-1"
            >
              <button
                onClick={() => onSelectFolder(null)}
                data-folder-id="clipboard"
                data-selected={highlightedFolderId === null}
                className={folderPillClass(
                  null,
                  highlightedFolderId === null,
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
                const isSelected = highlightedFolderId === folder.id;
                const Icon = IconMap[folder.icon || 'Folder'] || FolderIcon;
                return (
                  <React.Fragment key={folder.id}>
                    {folderReorderTargetId === folder.id && folderReorderTargetPosition === 'before' && (
                      <div className="mx-0.5 w-0.5 h-6 flex-shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-pulse" style={{ alignSelf: 'center' }} />
                    )}
                    <button
                      data-folder-id={folder.id}
                      onMouseDown={(e) => handleFolderMouseDown(e, folder.id)}
                      onMouseMove={(e) => handleFolderMouseMove(e, folder.id, false)}
                      onMouseLeave={() => {
                        handleFolderMouseLeave();
                        onDragLeave();
                      }}
                      onClick={() => {
                        if (wasFolderDraggingRef.current) return;
                        onSelectFolder(folder.id);
                      }}
                      data-selected={isSelected}
                      onContextMenu={(e) => onFolderContextMenu?.(e, folder.id)}
                      className={cn(
                        folderPillClassNamed(
                          folder.id,
                          isSelected,
                          dragTargetFolderId === folder.id,
                          folder.color
                        ),
                        draggingFolderId === folder.id && 'opacity-40 scale-95 pointer-events-none'
                      )}
                      onMouseEnter={() => isDragging && onDragHover(folder.id)}
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
                    {folderReorderTargetId === folder.id && folderReorderTargetPosition === 'after' && (
                      <div className="mx-0.5 w-0.5 h-6 flex-shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-pulse" style={{ alignSelf: 'center' }} />
                    )}
                  </React.Fragment>
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
            data-clip-list="true"
            className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-2 pb-2"
            onScroll={handleListScroll}
          >
            {filteredClips.length === 0 && !isLoading ? (
              <div className="flex h-full flex-col items-center justify-center text-sm italic opacity-30">
                <p>
                  {isFiltering && clips.length > 0
                    ? t('compact.noMatchFilter') === 'compact.noMatchFilter'
                      ? 'No clips match this filter'
                      : t('compact.noMatchFilter')
                    : t('clipList.empty')}
                </p>
              </div>
            ) : (
              filteredClips.map((clip, index) => (
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
                  clipNumbering={clipNumbering}
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
  clipNumbering?: 'positional' | 'countdown';
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
  clipNumbering,
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
          <span className="font-mono text-[10px] opacity-30">#{clipNumbering === 'positional' ? index + 1 : clips.length - index}</span>
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
                  : clip.clip_type === 'html' || clip.clip_type === 'rtf' || clip.clip_type === 'code'
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
