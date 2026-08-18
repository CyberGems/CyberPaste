// HMR Force Reload
import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Maximize2,
  Minimize2,
  LayoutGrid,
  List as ListIcon,
  X,
  Folder as FolderIcon,
  Zap,
  Flame,
  Star,
  Leaf,
  Droplets,
  Clock,
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
  Pin,
  RotateCcw,
  FileText,
  ZoomIn,
  ZoomOut,
  PanelTop,
  PanelTopClose,
  Image as ImageIcon,
  FileCode,
  Files,
  Keyboard,
  HardDrive as StorageIcon,
} from 'lucide-react';
import { FolderItem } from '../types';
import { CONTEXT_MENU_EVENT, type ContextMenuEventDetail } from '../utils/contextMenuEvents';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import Tooltip from './Tooltip';

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
  FolderIcon,
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

interface ControlBarProps {
  folders: FolderItem[];
  selectedFolder: string | null;
  onSelectFolder: (id: string | null) => void;
  showSearch: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchClick: () => void;
  onAddClick: () => void;
  onMoreClick: () => void;
  onMoveClip: (clipId: string, folderId: string | null) => void;
  isDragging: boolean;
  dragTargetFolderId: string | null | undefined;
  onDragHover: (folderId: string | null) => void;
  onDragLeave: () => void;
  totalClipCount: number;
  imageCount: number;
  textCount: number;
  codeCount?: number;
  fileCount?: number;
  htmlCount?: number;
  rtfCount?: number;
  onFolderContextMenu: (e: React.MouseEvent, folderId: string) => void;
  theme: 'light' | 'dark' | 'cyberpaste';
  onToggleMode: () => void;
  viewMode: 'full' | 'compact';
  isMaximized: boolean;
  onToggleMaximize: () => void;
  isPinned: boolean;
  onTogglePin?: () => void;
  onResetSize?: () => void;
  style?: React.CSSProperties;
  hotkey?: string;
  showHud?: boolean;
  onToggleHud?: () => void;
  lastClipTime?: string | null;
  dbSizeBytes?: number;
  onReorderFolder?: (folderId: string, targetId: string, position: 'before' | 'after') => void;
  isWindowActive?: boolean;
  gridScale?: number;
  onGridScaleChange?: (next: number) => void;
  wheelFolderNavigation?: boolean;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  folders,
  selectedFolder,
  onSelectFolder,
  showSearch,
  searchQuery,
  onSearchChange,
  onSearchClick,
  onAddClick,
  onMoreClick,
  onDragHover,
  onDragLeave,
  dragTargetFolderId,
  totalClipCount,
  imageCount,
  textCount,
  codeCount,
  fileCount,
  htmlCount,
  rtfCount,
  onFolderContextMenu,
  theme,
  onToggleMode,
  viewMode,
  isMaximized,
  onToggleMaximize,
  isPinned,
  onTogglePin,
  onResetSize,
  isDragging,
  style,
  hotkey,
  showHud = true,
  onToggleHud,
  lastClipTime,
  dbSizeBytes,
  onReorderFolder,
  isWindowActive = true,
  gridScale = 1,
  onGridScaleChange,
  wheelFolderNavigation = false,
}) => {
  const foldersRef = React.useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const currentFolderName = selectedFolder
    ? folders.find((f) => f.id === selectedFolder)?.name || 'Folder'
    : 'Clipboard';

  // Folder Reorder Drag State (Simulated)
  const [draggingFolderId, setDraggingFolderId] = React.useState<string | null>(null);
  const [folderReorderTargetId, setFolderReorderTargetId] = React.useState<string | null>(null);
  const [folderReorderTargetPosition, setFolderReorderTargetPosition] = React.useState<
    'before' | 'after' | null
  >(null);

  const pendingFolderDragRef = useRef<{ id: string; startX: number; startY: number } | null>(null);
  const wasFolderDraggingRef = useRef<boolean>(false);

  // Highlighted folder for smooth wheel navigation
  const [highlightedFolderId, setHighlightedFolderId] = React.useState<string | null>(
    selectedFolder
  );
  const isWheelNavigatingRef = useRef(false);
  const wheelTimeoutRef = useRef<any>(null);
  const wheelCooldownRef = useRef(false);
  const wheelAccumulatorRef = useRef(0);
  const wheelResetTimeoutRef = useRef<any>(null);

  const [contextMenuFolderId, setContextMenuFolderId] = useState<string | null>(null);

  useEffect(() => {
    const onMenu = (e: Event) => {
      const detail = (e as CustomEvent<ContextMenuEventDetail>).detail;
      if (detail && detail.open && detail.highlightId) {
        setContextMenuFolderId(detail.highlightId);
      } else {
        setContextMenuFolderId(null);
      }
    };
    window.addEventListener(CONTEXT_MENU_EVENT, onMenu);
    return () => window.removeEventListener(CONTEXT_MENU_EVENT, onMenu);
  }, []);

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
    if (!wheelFolderNavigation) {
      if (foldersRef.current) {
        foldersRef.current.scrollLeft += e.deltaY;
      }
      return;
    }

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
      const activeBtn = foldersRef.current?.querySelector(`[data-folder-id="${targetIdAttr}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
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

  const handleFolderMouseMove = (e: React.MouseEvent, folderId: string) => {
    if (
      !wasFolderDraggingRef.current ||
      !pendingFolderDragRef.current ||
      pendingFolderDragRef.current.id === folderId
    )
      return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const position = e.clientX < midX ? 'before' : 'after';

    setFolderReorderTargetId(folderId);
    setFolderReorderTargetPosition(position);
  };

  const handleFolderMouseLeave = () => {
    if (!wasFolderDraggingRef.current || !pendingFolderDragRef.current) return;
    setFolderReorderTargetId(null);
    setFolderReorderTargetPosition(null);
  };

  // Auto-scroll selected folder into view
  React.useEffect(() => {
    const selectedBtn = foldersRef.current?.querySelector('[data-selected="true"]');
    if (selectedBtn) {
      selectedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedFolder]);

  // ── Shortcut hint cycling ──
  const HINTS = [
    { keys: 'Ctrl+F', action: 'Search' },
    { keys: 'Enter', action: 'Paste' },
    { keys: 'Del', action: 'Delete' },
    { keys: 'Ctrl+P', action: 'Pin' },
    { keys: 'Esc', action: 'Close' },
  ];
  const [hintIndex, setHintIndex] = useState(0);
  useEffect(() => {
    if (!isWindowActive) return;
    const timer = setInterval(() => setHintIndex((i) => (i + 1) % HINTS.length), 4000);
    return () => clearInterval(timer);
  }, [isWindowActive]);

  // ── Last clip age (live-updating) ──
  const [lastClipAge, setLastClipAge] = useState('');
  useEffect(() => {
    if (!lastClipTime) {
      setLastClipAge('');
      return;
    }
    if (!isWindowActive) return;
    const update = () => {
      const diffMs = Date.now() - new Date(lastClipTime).getTime();
      if (diffMs < 0) {
        setLastClipAge('now');
        return;
      }
      const secs = Math.floor(diffMs / 1000);
      if (secs < 60) setLastClipAge(`${secs}s`);
      else if (secs < 3600) setLastClipAge(`${Math.floor(secs / 60)}m`);
      else if (secs < 86400) setLastClipAge(`${Math.floor(secs / 3600)}h`);
      else setLastClipAge(`${Math.floor(secs / 86400)}d`);
    };
    update();
    const timer = setInterval(update, 5000);
    return () => clearInterval(timer);
  }, [lastClipTime, isWindowActive]);

  // ── DB size formatting ──
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getContrastColor = (color: string) => {
    if (theme !== 'light') return color;
    switch (color) {
      case '#22d3ee': return '#0891b2'; // Cyan
      case '#a78bfa': return '#6d28d9'; // Purple
      case '#f472b6': return '#db2777'; // Pink
      case '#fbbf24': return '#b45309'; // Amber/brownish
      case '#4ade80': return '#15803d'; // Green
      case '#38bdf8': return '#0369a1'; // Sky
      case '#fb923c': return '#c2410c'; // Orange
      default: return color;
    }
  };

  return (
    <div
      className={clsx(
        'relative z-10 flex flex-col bg-card/50 backdrop-blur-md',
        theme === 'light' ? 'text-slate-900' : 'text-white'
      )}
      style={{
        ...style,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* ═══ HUD Status Strip — matches compact header style ═══ */}
      {showHud && (
        <div
          className="relative flex shrink-0 select-none items-center justify-between overflow-hidden border-b border-t border-border bg-muted/65 px-3 backdrop-blur-md"
          style={{ height: '34px' }}
        >
          <HudKeyframes />
          {/* Scan-line sweep (CSS-only, GPU-composited) */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-y-0 w-[25%]"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(var(--primary-rgb),0.025), transparent)',
                animation: isWindowActive ? 'hud-scan 4s ease-in-out infinite alternate' : 'none',
              }}
            />
          </div>

          {/* Corner brackets — top-left */}
          <svg
            className="pointer-events-none absolute left-0 top-0 opacity-30"
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
          >
            <path d="M0 8V0h8" stroke="rgba(var(--primary-rgb),0.6)" strokeWidth="1" />
          </svg>
          {/* Corner brackets — top-right */}
          <svg
            className="pointer-events-none absolute right-0 top-0 opacity-30"
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
          >
            <path d="M8 8V0H0" stroke="rgba(var(--primary-rgb),0.6)" strokeWidth="1" />
          </svg>
          {/* Corner brackets — bottom-left */}
          <svg
            className="pointer-events-none absolute bottom-0 left-0 opacity-20"
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
          >
            <path d="M0 0v8h8" stroke="rgba(var(--primary-rgb),0.5)" strokeWidth="1" />
          </svg>
          {/* Corner brackets — bottom-right */}
          <svg
            className="pointer-events-none absolute bottom-0 right-0 opacity-20"
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
          >
            <path d="M8 0v8H0" stroke="rgba(var(--primary-rgb),0.5)" strokeWidth="1" />
          </svg>

          {/* ── LEFT: Logo + App Name (no badge — only compact has one) ── */}
          <div className="z-10 flex flex-shrink-0 items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="Logo" className="h-5 w-5 object-contain" />
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground">CyberPaste</span>
          </div>

          {/* ── CENTER: Stat Chips ── */}
          <div className="z-10 flex items-center gap-1.5">
            {/* Clipboard stat uses breathing LED instead of Clock icon */}
            <HudChip
              icon={
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className={clsx(
                      "absolute inset-0 rounded-full",
                      theme === 'light' ? 'bg-cyan-600' : 'bg-cyan-400'
                    )}
                    style={{
                      animation: isWindowActive ? 'hud-breathe 3s ease-in-out infinite' : 'none',
                    }}
                  />
                  <span className={clsx(
                    "relative inline-flex h-1.5 w-1.5 rounded-full",
                    theme === 'light' ? 'bg-cyan-700' : 'bg-cyan-500'
                  )} />
                </span>
              }
              value={totalClipCount}
              color={getContrastColor('#22d3ee')}
              label="Clipboard"
            />
            <div className="bg-border h-3 w-px" />
            <HudChip icon={<FileText size={11} />} value={textCount} color={getContrastColor('#a78bfa')} label="Text" />
            <div className="bg-border h-3 w-px" />
            <HudChip
              icon={<Code size={11} />}
              value={codeCount ?? 0}
              color={getContrastColor('#f472b6')}
              label="Code"
            />
            <div className="bg-border h-3 w-px" />
            <HudChip
              icon={<ImageIcon size={11} />}
              value={imageCount}
              color={getContrastColor('#fbbf24')}
              label="Images"
            />
            <div className="bg-border h-3 w-px" />
            <HudChip
              icon={<Files size={11} />}
              value={fileCount ?? 0}
              color={getContrastColor('#4ade80')}
              label="Files"
            />
            <div className="bg-border h-3 w-px" />
            <HudChip
              icon={<FileCode size={11} />}
              value={(htmlCount ?? 0) + (rtfCount ?? 0)}
              color={getContrastColor('#38bdf8')}
              label="Rich"
            />
            <div className="bg-border h-3 w-px" />
            <HudChip
              icon={<FolderIcon size={11} />}
              value={folders.length}
              color={getContrastColor('#fb923c')}
              label="Folders"
            />
            {selectedFolder && (
              <>
                <div className="mx-1 h-3 w-px bg-cyan-500/20" />
                <span className="flex items-center gap-1 text-[8px] font-medium tracking-wide text-cyan-500/80">
                  <span className="rounded border border-primary/20 bg-primary/10 px-1 py-px font-bold text-primary">
                    {currentFolderName}
                  </span>
                  <span className="text-muted-foreground/60">
                    {folders.find((f) => f.id === selectedFolder)?.item_count || 0}
                  </span>
                </span>
              </>
            )}
          </div>

          {/* ── RIGHT: Status Info ── */}
          <div className="z-10 flex flex-shrink-0 items-center gap-2">
            {/* Shortcut hint (cycling, fixed width to prevent layout shift) */}
            <div
              className="flex w-[100px] items-center gap-1 text-[8px] text-muted-foreground/60"
              title="Keyboard shortcuts"
            >
              <Keyboard size={8} className="flex-shrink-0 text-muted-foreground/40" />
              <div
                key={hintIndex}
                className="flex items-center gap-1"
                style={{ animation: 'hud-hint-fade 0.5s ease-out' }}
              >
                <span className="font-mono font-bold text-primary opacity-80">
                  {HINTS[hintIndex].keys}
                </span>
                <span className="text-muted-foreground/80">{HINTS[hintIndex].action}</span>
              </div>
            </div>

            {/* Hotkey badge */}
            {hotkey && (
              <>
                <div className="bg-border h-3 w-px" />
                <span
                  className="rounded border border-primary/20 bg-primary/10 px-1 py-px font-mono text-[8px] font-bold text-primary"
                  title="Global hotkey"
                >
                  {hotkey}
                </span>
              </>
            )}

            {/* Last clip age */}
            {lastClipAge && (
              <>
                <div className="bg-border h-3 w-px" />
                <div
                  className="flex items-center gap-0.5 text-[8px] text-muted-foreground/60"
                  title={`Last clip: ${lastClipAge} ago`}
                >
                  <Clock size={8} className="text-primary/60" />
                  <span className="font-mono text-primary/75">{lastClipAge}</span>
                </div>
              </>
            )}

            {/* DB size */}
            {dbSizeBytes != null && dbSizeBytes > 0 && (
              <>
                <div className="bg-border h-3 w-px" />
                <div
                  className="flex items-center gap-0.5 text-[8px] text-muted-foreground/60"
                  title={`Database: ${formatBytes(dbSizeBytes)}`}
                >
                  <StorageIcon size={8} className="text-amber-500/60" />
                  <span className="font-mono text-amber-600/90 dark:text-amber-400/75">{formatBytes(dbSizeBytes)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Main Toolbar ── */}
      <div className="flex min-w-0 flex-1 items-center gap-1 px-4">
        <Tooltip
          label={t('common.searchPlaceholder')?.replace('... (Ctrl+F)', '') || 'Search'}
          placement="top"
        >
          <button
            onClick={onSearchClick}
            className={clsx(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all',
              showSearch
                ? 'border-primary bg-primary text-primary-foreground shadow-lg'
                : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground active:bg-accent/80'
            )}
          >
            <Search size={16} />
          </button>
        </Tooltip>

        <div className="mx-0.5 h-5 w-px shrink-0 bg-border/50" />

        <div className="relative flex h-full min-w-0 flex-1 items-center">
          {/* Folders List - Cybernetic Transition */}
          <div
            ref={foldersRef}
            className={clsx(
              'no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto transition-all duration-500 ease-in-out',
              showSearch
                ? 'pointer-events-none invisible scale-95 opacity-0'
                : 'visible scale-100 opacity-100'
            )}
            onWheel={handleWheel}
          >
            <button
              onClick={() => onSelectFolder(null)}
              onMouseEnter={() => isDragging && onDragHover(null)}
              onMouseLeave={onDragLeave}
              data-folder-id="clipboard"
              data-selected={highlightedFolderId === null}
              className={clsx(
                'flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-[12px] font-medium transition-all',
                highlightedFolderId === null && dragTargetFolderId === undefined
                  ? 'border-primary/30 bg-primary/15 font-semibold text-foreground shadow-[0_0_8px_rgba(var(--primary-rgb),0.12)]'
                  : dragTargetFolderId === null && isDragging
                    ? 'border-primary bg-primary/30 text-foreground'
                    : 'border-transparent text-muted-foreground/80 hover:bg-accent hover:text-foreground'
              )}
            >
              <Clock size={12} className="flex-shrink-0" />
              <span>Clipboard</span>
              <span
                className={clsx(
                  'text-[10px] tabular-nums opacity-35',
                  highlightedFolderId === null && 'opacity-70'
                )}
              >
                ({totalClipCount})
              </span>
            </button>

            {folders.map((folder) => {
              const isSelected = highlightedFolderId === folder.id;
              const isDragTarget = dragTargetFolderId === folder.id;
              const isMenuHighlighted = contextMenuFolderId === folder.id;
              const Icon = IconMap[folder.icon || 'FolderIcon'] || FolderIcon;
              const folderColor = folder.color || undefined;

              return (
                <React.Fragment key={folder.id}>
                  {folderReorderTargetId === folder.id &&
                    folderReorderTargetPosition === 'before' && (
                      <div
                        className="mx-0.5 h-6 w-0.5 flex-shrink-0 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                        style={{ alignSelf: 'center' }}
                      />
                    )}
                  <button
                    data-folder-id={folder.id}
                    onMouseDown={(e) => handleFolderMouseDown(e, folder.id)}
                    onMouseMove={(e) => handleFolderMouseMove(e, folder.id)}
                    onMouseLeave={() => {
                      handleFolderMouseLeave();
                      onDragLeave();
                    }}
                    onClick={() => {
                      if (wasFolderDraggingRef.current) return;
                      onSelectFolder(folder.id);
                    }}
                    onContextMenu={(e) => onFolderContextMenu(e, folder.id)}
                    onMouseEnter={() => isDragging && onDragHover(folder.id)}
                    data-selected={isSelected}
                    className={clsx(
                      'flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-[12px] font-medium transition-all',
                      isSelected && dragTargetFolderId === undefined
                        ? 'border-primary/30 bg-primary/15 font-semibold text-foreground shadow-[0_0_8px_rgba(var(--primary-rgb),0.12)]'
                        : isDragTarget
                          ? 'border-primary bg-primary/30 text-foreground'
                          : isMenuHighlighted
                            ? 'border-transparent bg-accent text-foreground'
                            : 'border-transparent text-muted-foreground/80 hover:bg-accent hover:text-foreground',
                      draggingFolderId === folder.id && 'pointer-events-none scale-95 opacity-40'
                    )}
                  >
                    <Icon
                      size={12}
                      style={{ color: folderColor }}
                      className={
                        isSelected ? 'text-primary' : 'flex-shrink-0 text-muted-foreground/60'
                      }
                    />
                    <span>{folder.name}</span>
                    <span
                      className={clsx(
                        'text-[10px] tabular-nums opacity-35',
                        isSelected && 'opacity-70'
                      )}
                    >
                      ({folder.item_count || 0})
                    </span>
                  </button>
                  {folderReorderTargetId === folder.id &&
                    folderReorderTargetPosition === 'after' && (
                      <div
                        className="mx-0.5 h-6 w-0.5 flex-shrink-0 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                        style={{ alignSelf: 'center' }}
                      />
                    )}
                </React.Fragment>
              );
            })}

            <Tooltip label={t('folders.addFolderBtn') || 'Add Folder'} placement="bottom">
              <button
                onClick={onAddClick}
                className="flex h-8 flex-shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-transparent px-2 text-muted-foreground/70 transition-all hover:border-muted hover:text-foreground"
              >
                <Plus size={18} />
              </button>
            </Tooltip>
          </div>

          {/* Search Bar Overlay */}
          {showSearch && (
            <div className="animate-in fade-in zoom-in-95 absolute inset-0 z-10 flex items-center duration-300">
              <div className="flex h-8 flex-1 items-center gap-3 rounded-lg border border-primary/30 bg-popover px-4 shadow-[0_0_25px_rgba(var(--primary-rgb),0.15)] backdrop-blur-md">
                <Search className="animate-pulse text-primary" size={18} />
                <div className="flex flex-1 items-center gap-2 overflow-hidden">
                  <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Searching in{' '}
                    <span className="text-primary/80">
                      {selectedFolder
                        ? folders.find((f) => f.id === selectedFolder)?.name || 'Folder'
                        : 'Clipboard'}
                    </span>
                  </span>
                  <div className="mx-1 h-4 w-px flex-shrink-0 bg-border" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="..."
                    className="min-w-0 flex-1 bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') onSearchClick();
                    }}
                  />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSearchClick();
                  }}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Cancel Search (Esc)"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 pl-2">
          {/* Grid zoom controls (Full mode) */}
          {viewMode === 'full' && onGridScaleChange && gridScale !== undefined && (
            <div className="flex items-center gap-0 rounded-md border border-border bg-secondary/40 px-0.5">
              <Tooltip label={t('common.zoomOut')} placement="top">
                <button
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
                placement="top"
              >
                <button
                  onClick={() => onGridScaleChange(1)}
                  className="min-w-[38px] cursor-pointer text-center font-mono text-[10px] font-bold tabular-nums text-primary/80 hover:text-primary"
                >
                  {Math.round(gridScale * 100)}%
                </button>
              </Tooltip>
              <Tooltip label={t('common.zoomIn')} placement="top">
                <button
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

          {onResetSize && (
            <Tooltip label={t('common.resetWindowSize')} placement="top">
              <button
                onClick={onResetSize}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-accent hover:text-foreground active:bg-accent/80"
              >
                <RotateCcw size={15} />
              </button>
            </Tooltip>
          )}

          {/* HUD strip toggle */}
          {onToggleHud && (
            <Tooltip label={showHud ? t('common.hideHud') : t('common.showHud')} placement="top">
              <button
                onClick={onToggleHud}
                className={clsx(
                  'flex h-8 w-8 items-center justify-center rounded-lg border transition-all',
                  showHud
                    ? 'border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground active:bg-accent/80'
                    : 'border-primary/30 bg-primary/15 text-primary'
                )}
              >
                {showHud ? <PanelTopClose size={15} /> : <PanelTop size={15} />}
              </button>
            </Tooltip>
          )}

          {onTogglePin && (
            <Tooltip
              label={isPinned ? t('common.unpinWindow') : t('common.pinWindow')}
              placement="top"
            >
              <button
                onClick={onTogglePin}
                className={clsx(
                  'flex h-8 w-8 items-center justify-center rounded-lg border transition-all focus:outline-none',
                  isPinned
                    ? 'border-primary/30 bg-primary/20 text-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]'
                    : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground active:bg-accent/80'
                )}
              >
                <Pin
                  size={15}
                  className={clsx(
                    'transition-transform duration-300',
                    isPinned ? 'fill-primary text-primary' : 'rotate-45'
                  )}
                />
              </button>
            </Tooltip>
          )}

          <Tooltip label={t('settings.title')} placement="top">
            <button
              onClick={onMoreClick}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-accent hover:text-foreground active:bg-accent/80"
            >
              <Settings size={15} />
            </button>
          </Tooltip>

          <Tooltip label={isMaximized ? t('common.restore') : t('common.maximize')} placement="top">
            <button
              onClick={onToggleMaximize}
              aria-label={isMaximized ? t('common.restore') : t('common.maximize')}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-accent hover:text-foreground active:bg-accent/80"
            >
              {isMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </Tooltip>

          {/* View-toggle — compact pill */}
          <Tooltip
            label={viewMode === 'full' ? t('common.switchToCompact') : t('common.switchToFull')}
            placement="top"
          >
            <button
              onClick={onToggleMode}
              className="group relative ml-1 flex h-8 items-center gap-1.5 overflow-hidden rounded-lg border border-primary/40 bg-gradient-to-r from-primary/20 to-primary/10 px-2 text-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.15)] transition-all duration-200 hover:border-primary/70 hover:from-primary/30 hover:to-primary/20 hover:shadow-[0_0_16px_rgba(var(--primary-rgb),0.4)] active:scale-[0.98]"
            >
              {/* shimmer sweep */}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
              {viewMode === 'full' ? (
                <ListIcon size={13} className="relative z-10 flex-shrink-0" />
              ) : (
                <LayoutGrid size={13} className="relative z-10 flex-shrink-0" />
              )}
            </button>
          </Tooltip>

          <Tooltip label={t('common.closeWindow')} placement="top">
            <button
              onClick={() => (window as any).__TAURI_INTERNALS__.invoke('hide_window')}
              className="ml-0.5 flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-rose-500/20 hover:bg-rose-500/15 hover:text-rose-400 active:bg-rose-500/25"
            >
              <X size={15} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

/* ── HUD Stat Chip (icon + label + value) ──────────────────────────── */
const HudChip: React.FC<{ icon: React.ReactNode; value: number; color: string; label?: string }> =
  React.memo(({ icon, value, color, label }) => (
    <div
      className="flex items-center gap-1.5 px-1"
      title={label ? `${value} ${label}` : String(value)}
    >
      <span style={{ color: `${color}88` }}>{icon}</span>
      {label && (
        <span
          className="text-[10px] font-medium uppercase tracking-wide"
          style={{ color: `${color}99` }}
        >
          {label}
        </span>
      )}
      <span className="font-mono text-[12px] font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  ));
HudChip.displayName = 'HudChip';

/* ── Inject HUD keyframes (rendered once via React) ────────────────── */
const HudKeyframes = () => (
  <style>{`
    @keyframes hud-scan {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }
    @keyframes hud-breathe {
      0%, 100% { opacity: .3; transform: scale(1); }
      50%      { opacity: .8; transform: scale(1.8); }
    }
    @keyframes hud-hint-fade {
      0%   { opacity: 0; transform: translateY(4px); }
      100% { opacity: 1; transform: translateY(0); }
    }
  `}</style>
);
