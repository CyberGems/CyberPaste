// HMR Force Reload
import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Maximize2,
  Minimize2,
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
  PinOff,
  RotateCcw,
  FileText,
  Image as ImageIcon,
  FileCode,
  Files,
  Keyboard,
  HardDrive as StorageIcon,
} from 'lucide-react';
import { FolderItem } from '../types';
import { clsx } from 'clsx';

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
  dragTargetFolderId: string | null;
  onDragHover: (folderId: string | null) => void;
  onDragLeave: () => void;
  totalClipCount: number;
  imageCount: number;
  textCount: number;
  fileCount?: number;
  htmlCount?: number;
  rtfCount?: number;
  onFolderContextMenu: (e: React.MouseEvent, folderId: string) => void;
  theme: 'light' | 'dark';
  onToggleMode: () => void;
  viewMode: 'full' | 'compact';
  isPinned: boolean;
  onTogglePin?: () => void;
  onResetSize?: () => void;
  style?: React.CSSProperties;
  hotkey?: string;
  lastClipTime?: string | null;
  dbSizeBytes?: number;
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
  fileCount,
  htmlCount,
  rtfCount,
  onFolderContextMenu,
  theme,
  onToggleMode,
  viewMode,
  isPinned,
  onTogglePin,
  onResetSize,
  isDragging,
  style,
  hotkey,
  lastClipTime,
  dbSizeBytes,
}) => {
  const foldersRef = React.useRef<HTMLDivElement>(null);

  const currentFolderName = selectedFolder
    ? folders.find((f) => f.id === selectedFolder)?.name || 'Folder'
    : 'Clipboard';

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
    { keys: 'P', action: 'Pin' },
    { keys: 'Esc', action: 'Close' },
  ];
  const [hintIndex, setHintIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setHintIndex((i) => (i + 1) % HINTS.length), 4000);
    return () => clearInterval(timer);
  }, []);

  // ── Last clip age (live-updating) ──
  const [lastClipAge, setLastClipAge] = useState('');
  useEffect(() => {
    if (!lastClipTime) {
      setLastClipAge('');
      return;
    }
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
  }, [lastClipTime]);

  // ── DB size formatting ──
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={clsx(
        'relative z-10 flex flex-col bg-card/50 backdrop-blur-md',
        theme === 'dark' ? 'text-white' : 'text-slate-900'
      )}
      style={{
        ...style,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* ═══ HUD Status Strip — matches compact header style ═══ */}
      <div
        className="relative flex shrink-0 select-none items-center justify-between overflow-hidden border-b-[4px] border-[#0A0A0B] bg-white/5 px-3 backdrop-blur-md"
        style={{ height: '34px' }}
      >
        <HudKeyframes />
        {/* Scan-line sweep (CSS-only, GPU-composited) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-y-0 w-[25%]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.05), transparent)',
              animation: 'hud-scan 4s ease-in-out infinite alternate',
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
          <path d="M0 8V0h8" stroke="rgba(6,182,212,0.6)" strokeWidth="1" />
        </svg>
        {/* Corner brackets — top-right */}
        <svg
          className="pointer-events-none absolute right-0 top-0 opacity-30"
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
        >
          <path d="M8 8V0H0" stroke="rgba(6,182,212,0.6)" strokeWidth="1" />
        </svg>
        {/* Corner brackets — bottom-left */}
        <svg
          className="pointer-events-none absolute bottom-0 left-0 opacity-20"
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
        >
          <path d="M0 0v8h8" stroke="rgba(99,102,241,0.5)" strokeWidth="1" />
        </svg>
        {/* Corner brackets — bottom-right */}
        <svg
          className="pointer-events-none absolute bottom-0 right-0 opacity-20"
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
        >
          <path d="M8 0v8H0" stroke="rgba(99,102,241,0.5)" strokeWidth="1" />
        </svg>

        {/* ── LEFT: Logo + App Name (no badge — only compact has one) ── */}
        <div className="z-10 flex flex-shrink-0 items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Logo" className="h-5 w-5 object-contain" />
          </div>
          <span className="text-sm font-bold tracking-tight">CyberPaste</span>
        </div>

        {/* ── CENTER: Stat Chips ── */}
        <div className="z-10 flex items-center gap-1.5">
          {/* Clipboard stat uses breathing LED instead of Clock icon */}
          <HudChip
            icon={
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className="absolute inset-0 rounded-full bg-cyan-400"
                  style={{ animation: 'hud-breathe 3s ease-in-out infinite' }}
                />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-500" />
              </span>
            }
            value={totalClipCount}
            color="#22d3ee"
            label="Clipboard"
          />
          <div className="bg-white/8 h-3 w-px" />
          <HudChip icon={<FileText size={11} />} value={textCount} color="#a78bfa" label="Text" />
          <div className="bg-white/8 h-3 w-px" />
          <HudChip
            icon={<ImageIcon size={11} />}
            value={imageCount}
            color="#fbbf24"
            label="Images"
          />
          <div className="bg-white/8 h-3 w-px" />
          <HudChip
            icon={<Files size={11} />}
            value={fileCount ?? 0}
            color="#4ade80"
            label="Files"
          />
          <div className="bg-white/8 h-3 w-px" />
          <HudChip
            icon={<FileCode size={11} />}
            value={(htmlCount ?? 0) + (rtfCount ?? 0)}
            color="#38bdf8"
            label="Rich"
          />
          <div className="bg-white/8 h-3 w-px" />
          <HudChip
            icon={<FolderIcon size={11} />}
            value={folders.length}
            color="#fb923c"
            label="Folders"
          />
          {selectedFolder && (
            <>
              <div className="mx-1 h-3 w-px bg-cyan-500/20" />
              <span className="flex items-center gap-1 text-[8px] font-medium tracking-wide text-cyan-400/60">
                <span className="rounded border border-cyan-500/15 bg-cyan-500/10 px-1 py-px font-bold text-cyan-400">
                  {currentFolderName}
                </span>
                <span className="text-white/30">
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
            className="flex w-[100px] items-center gap-1 text-[8px] text-white/25"
            title="Keyboard shortcuts"
          >
            <Keyboard size={8} className="flex-shrink-0 text-white/20" />
            <div
              key={hintIndex}
              className="flex items-center gap-1"
              style={{ animation: 'hud-hint-fade 0.5s ease-out' }}
            >
              <span className="font-mono font-bold text-cyan-400/70">{HINTS[hintIndex].keys}</span>
              <span className="text-white/35">{HINTS[hintIndex].action}</span>
            </div>
          </div>

          {/* Hotkey badge */}
          {hotkey && (
            <>
              <div className="bg-white/8 h-3 w-px" />
              <span
                className="rounded border border-indigo-500/15 bg-indigo-500/10 px-1 py-px font-mono text-[8px] font-bold text-indigo-400/60"
                title="Global hotkey"
              >
                {hotkey}
              </span>
            </>
          )}

          {/* Last clip age */}
          {lastClipAge && (
            <>
              <div className="bg-white/8 h-3 w-px" />
              <div
                className="flex items-center gap-0.5 text-[8px] text-white/20"
                title={`Last clip: ${lastClipAge} ago`}
              >
                <Clock size={8} className="text-cyan-400/40" />
                <span className="font-mono text-cyan-400/50">{lastClipAge}</span>
              </div>
            </>
          )}

          {/* DB size */}
          {dbSizeBytes != null && dbSizeBytes > 0 && (
            <>
              <div className="bg-white/8 h-3 w-px" />
              <div
                className="flex items-center gap-0.5 text-[8px] text-white/20"
                title={`Database: ${formatBytes(dbSizeBytes)}`}
              >
                <StorageIcon size={8} className="text-amber-400/40" />
                <span className="font-mono text-amber-400/50">{formatBytes(dbSizeBytes)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Main Toolbar ── */}
      <div className="flex min-w-0 flex-1 items-center gap-1 px-4">
        <button
          onClick={onSearchClick}
          className={clsx(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all',
            showSearch ? 'bg-primary text-white shadow-lg' : 'hover:bg-secondary/50'
          )}
        >
          <Search size={16} />
        </button>

        <div className="mx-0.5 h-5 w-px shrink-0 bg-border/50" />

        <div className="relative flex h-full min-w-0 flex-1 items-center">
          {/* Folders List - Cybernetic Transition */}
          <div
            ref={foldersRef}
            className={clsx(
              'no-scrollbar flex flex-1 items-center gap-4 overflow-x-auto transition-all duration-500 ease-in-out',
              showSearch
                ? 'pointer-events-none invisible scale-95 opacity-0'
                : 'visible scale-100 opacity-100'
            )}
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
          >
            <button
              onClick={() => onSelectFolder(null)}
              onMouseEnter={() => isDragging && onDragHover(null)}
              onMouseLeave={onDragLeave}
              data-selected={selectedFolder === null}
              className={clsx(
                'group relative flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1 text-sm font-bold transition-all',
                selectedFolder === null && !dragTargetFolderId
                  ? 'border border-indigo-500/60 bg-indigo-500/30 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.5)] ring-1 ring-indigo-500/40'
                  : 'border border-transparent bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
              )}
            >
              <div
                className={clsx(
                  'flex h-5 w-5 items-center justify-center rounded-lg transition-colors',
                  selectedFolder === null
                    ? 'bg-indigo-500/20'
                    : 'bg-white/5 group-hover:bg-indigo-500/10'
                )}
              >
                <Clock
                  size={14}
                  className={
                    selectedFolder === null
                      ? 'text-indigo-400'
                      : 'text-white/30 group-hover:text-indigo-400'
                  }
                />
              </div>
              <span
                className={
                  selectedFolder === null
                    ? 'text-indigo-300'
                    : 'text-white/50 group-hover:text-indigo-300'
                }
              >
                Clipboard
              </span>
              <span
                className={clsx(
                  'ml-1 text-[10px] font-medium transition-opacity',
                  selectedFolder === null ? 'opacity-80' : 'opacity-30 group-hover:opacity-80'
                )}
              >
                {totalClipCount}
              </span>
            </button>

            {folders.map((folder) => {
              const isSelected = selectedFolder === folder.id;
              const isDragTarget = dragTargetFolderId === folder.id;
              const Icon = IconMap[folder.icon || 'FolderIcon'] || FolderIcon;

              return (
                <button
                  key={folder.id}
                  onClick={() => onSelectFolder(folder.id)}
                  onContextMenu={(e) => onFolderContextMenu(e, folder.id)}
                  onMouseEnter={() => isDragging && onDragHover(folder.id)}
                  onMouseLeave={onDragLeave}
                  data-selected={isSelected}
                  className={clsx(
                    'flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1 text-sm font-bold transition-all',
                    isSelected && !isDragTarget
                      ? 'border border-primary/60 bg-white/5 text-white/40 shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] ring-1 ring-primary/40'
                      : isDragTarget
                        ? 'border-transparent bg-primary/40 ring-2 ring-primary'
                        : 'border border-transparent bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                  )}
                >
                  <div
                    className={clsx(
                      'flex h-5 w-5 items-center justify-center rounded-lg transition-colors',
                      isSelected ? 'bg-primary/20' : 'bg-white/5'
                    )}
                  >
                    <Icon
                      size={14}
                      style={{ color: folder.color || undefined }}
                      className={isSelected ? 'text-primary' : 'text-white/30'}
                    />
                  </div>
                  <span className={isSelected ? 'text-white/80' : 'text-white/50'}>
                    {folder.name}
                  </span>
                  <span
                    className={clsx(
                      'ml-1 text-[10px] font-medium transition-opacity',
                      isSelected ? 'opacity-80' : 'opacity-30'
                    )}
                  >
                    {folder.item_count}
                  </span>
                </button>
              );
            })}

            <button
              onClick={onAddClick}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 text-white/40 transition-all hover:bg-white/10 hover:text-white"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Search Bar Overlay */}
          {showSearch && (
            <div className="animate-in fade-in zoom-in-95 absolute inset-0 z-10 flex items-center duration-300">
              <div className="flex h-8 flex-1 items-center gap-3 rounded-lg border border-cyan-500/30 bg-zinc-950/80 px-4 shadow-[0_0_25px_rgba(6,182,212,0.15)] backdrop-blur-md">
                <Search className="animate-pulse text-cyan-400" size={18} />
                <div className="flex flex-1 items-center gap-2 overflow-hidden">
                  <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-white/20">
                    Searching in{' '}
                    <span className="text-cyan-400/60">
                      {selectedFolder
                        ? folders.find((f) => f.id === selectedFolder)?.name || 'Folder'
                        : 'Clipboard'}
                    </span>
                  </span>
                  <div className="mx-1 h-4 w-px flex-shrink-0 bg-white/10" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="..."
                    className="min-w-0 flex-1 bg-transparent py-1 text-sm text-white outline-none placeholder:text-white/10"
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
                  className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                  title="Cancel Search (Esc)"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 pl-2">
          {onResetSize && (
            <button
              onClick={onResetSize}
              className="hover:bg-white/8 flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-all hover:text-white/70"
              title="Reset Window Size"
            >
              <RotateCcw size={15} />
            </button>
          )}

          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
                isPinned
                  ? 'border border-indigo-500/30 bg-indigo-500/15 text-indigo-400'
                  : 'hover:bg-white/8 text-white/30 hover:text-white/70'
              )}
              title={isPinned ? 'Unpin Window' : 'Pin Window'}
            >
              {isPinned ? <PinOff size={15} /> : <Pin size={15} />}
            </button>
          )}

          <button
            onClick={onMoreClick}
            className="hover:bg-white/8 flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-all hover:text-white/70"
            title="Settings"
          >
            <Settings size={15} />
          </button>

          {/* View-toggle — compact pill */}
          <button
            onClick={onToggleMode}
            className="group relative ml-1 flex h-7 items-center gap-1 overflow-hidden rounded-lg border border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 px-2 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)] transition-all duration-200 hover:border-cyan-400/70 hover:from-cyan-500/30 hover:to-indigo-500/30 hover:shadow-[0_0_16px_rgba(6,182,212,0.4)]"
            title={viewMode === 'full' ? 'Switch to Compact Mode' : 'Switch to Full Mode'}
          >
            {/* shimmer sweep */}
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
            {viewMode === 'full' ? (
              <Minimize2 size={13} className="relative z-10 flex-shrink-0" />
            ) : (
              <Maximize2 size={13} className="relative z-10 flex-shrink-0" />
            )}
          </button>

          <button
            onClick={() => (window as any).__TAURI_INTERNALS__.invoke('hide_window')}
            className="hover:bg-rose-500/12 ml-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-white/25 transition-all hover:text-rose-400"
            title="Close Window"
          >
            <X size={15} />
          </button>
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
