// HMR Force Reload
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  Search,
  Plus,
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
  Keyboard,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { FolderItem } from '../types';
import { CONTEXT_MENU_EVENT, type ContextMenuEventDetail } from '../utils/contextMenuEvents';
import { buildShortcutHints, hintWithHotkey, HUD_HINT_ORDER } from '../utils/shortcutHints';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import Tooltip from './Tooltip';
import { SearchHistoryMenu } from './SearchHistoryMenu';
import { TitleBarMenu } from './TitleBarMenu';
import { TitleBarUpdateButton } from './TitleBarUpdateButton';
import { useFolderFlash } from '../hooks/useFolderFlash';
import { useHoldToScroll } from '../hooks/useHoldToScroll';
import { TITLEBAR_HOTKEYS } from '../hooks/useKeyboard';
import { useClipboardMonitoring } from '../hooks/useClipboardMonitoring';
import { useRotatingIndex } from '../hooks/useRotatingIndex';
import {
  TITLEBAR_BTN_DANGER,
  TITLEBAR_BTN_IDLE,
  TITLEBAR_BTN_MODE_TOGGLE,
  TITLEBAR_BTN_ON_AMBER,
  TITLEBAR_BTN_ON_PRIMARY_STRONG,
  TITLEBAR_ICON_BUTTON,
} from './ui/titlebarButtons';
import { invoke } from '@tauri-apps/api/core';

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

/** Gap kept between the centered HUD pill and the titlebar button groups. */
const HUD_SIDE_GUTTER = 12;
/** Below this width a centered pill is unreadable, so it is hidden instead. */
const HUD_MIN_WIDTH = 120;

interface ControlBarProps {
  folders: FolderItem[];
  selectedFolder: string | null;
  onSelectFolder: (id: string | null) => void;
  showSearch: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchCommit: (query: string) => void;
  recentSearches: string[];
  searchHistoryToggleToken?: number;
  onSelectSearchHistory: (query: string) => void;
  onClearSearchHistory: () => void;
  onSearchClick: () => void;
  typeToSearch?: boolean;
  onAddClick: () => void;
  onMoreClick: () => void;
  onMoveClip: (clipId: string, folderId: string | null) => void;
  isDragging: boolean;
  dragTargetFolderId: string | null | undefined;
  onDragHover: (folderId: string | null) => void;
  onDragLeave: () => void;
  totalClipCount: number;
  onFolderContextMenu: (e: React.MouseEvent, folderId: string) => void;
  theme: 'light' | 'dark' | 'cyberpaste';
  onToggleMode: () => void;
  viewMode: 'full' | 'compact';
  isPinned: boolean;
  onTogglePin?: () => void;
  lockEnabled?: boolean;
  onLockNow?: () => void;
  onResetSize?: () => void;
  style?: React.CSSProperties;
  hotkey?: string;
  toggleModeHotkey?: string;
  showHud?: boolean;
  onReorderFolder?: (folderId: string, targetId: string, position: 'before' | 'after') => void;
  isWindowActive?: boolean;
  wheelFolderNavigation?: boolean;
  titleBarAnimationEnabled?: boolean;
  updateAvailable?: boolean;
  updateVersion?: string;
  onShowUpdate?: () => void;
  onRequestClose?: () => void;
  canUndo?: boolean;
  onUndo?: () => void;
  isEmojiMode?: boolean;
}

interface FolderTabButtonProps {
  folder: FolderItem;
  isSelected: boolean;
  isDragTarget: boolean;
  isMenuHighlighted: boolean;
  isDragging: boolean;
  draggingFolderId: string | null;
  dragTargetFolderId: string | null | undefined;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onMouseMove: (e: React.MouseEvent, id: string) => void;
  onMouseLeave: () => void;
  onClick: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onMouseEnter: (id: string) => void;
}

const FolderTabButton: React.FC<FolderTabButtonProps> = ({
  folder,
  isSelected,
  isDragTarget,
  isMenuHighlighted,
  draggingFolderId,
  dragTargetFolderId,
  onMouseDown,
  onMouseMove,
  onMouseLeave,
  onClick,
  onContextMenu,
  onMouseEnter,
}) => {
  const { t } = useTranslation();
  const isFlashing = useFolderFlash(folder.id);
  const Icon = IconMap[folder.icon || 'FolderIcon'] || FolderIcon;
  const folderColor = folder.color || undefined;

  return (
    <Tooltip
      label={t('common.tooltipWithHotkey', { label: folder.name, hotkey: 'Ctrl+←/→' })}
      placement="bottom"
    >
      <button
        data-folder-id={folder.id}
        onMouseDown={(e) => onMouseDown(e, folder.id)}
        onMouseMove={(e) => onMouseMove(e, folder.id)}
        onMouseLeave={onMouseLeave}
        onClick={() => onClick(folder.id)}
        onContextMenu={(e) => onContextMenu(e, folder.id)}
        onMouseEnter={() => onMouseEnter(folder.id)}
        data-selected={isSelected}
        className={clsx(
          'flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2.5 text-[12px] font-medium transition-all focus:outline-none focus-visible:ring-0',
          isFlashing && 'folder-double-flash',
          isSelected && dragTargetFolderId === undefined
            ? 'border-transparent bg-primary/15 font-semibold text-foreground'
            : isDragTarget
              ? 'border-transparent bg-primary/30 text-foreground'
              : isMenuHighlighted
                ? 'border-transparent bg-accent text-foreground'
                : 'border-transparent text-muted-foreground/80 hover:bg-accent hover:text-foreground',
          draggingFolderId === folder.id && 'pointer-events-none scale-95 opacity-40'
        )}
      >
        <Icon
          size={12}
          style={{ color: folderColor }}
          className={isSelected ? 'text-primary' : 'flex-shrink-0 text-muted-foreground/60'}
        />
        <span>{folder.name}</span>
        <span className={clsx('text-[10px] tabular-nums opacity-35', isSelected && 'opacity-70')}>
          ({folder.item_count || 0})
        </span>
      </button>
    </Tooltip>
  );
};

export const ControlBar: React.FC<ControlBarProps> = ({
  folders,
  selectedFolder,
  onSelectFolder,
  showSearch,
  searchQuery,
  onSearchChange,
  onSearchCommit,
  recentSearches,
  searchHistoryToggleToken,
  onSelectSearchHistory,
  onClearSearchHistory,
  onSearchClick,
  typeToSearch = true,
  onAddClick,
  onMoreClick,
  onDragHover,
  onDragLeave,
  dragTargetFolderId,
  totalClipCount,
  onFolderContextMenu,
  theme,
  onToggleMode,
  viewMode,
  isPinned,
  onTogglePin,
  lockEnabled = false,
  onLockNow,
  onResetSize,
  isDragging,
  style,
  hotkey,
  toggleModeHotkey = TITLEBAR_HOTKEYS.mode,
  showHud = true,
  onReorderFolder,
  isWindowActive = true,
  wheelFolderNavigation = false,
  titleBarAnimationEnabled = true,
  updateAvailable = false,
  updateVersion,
  onShowUpdate,
  onRequestClose,
  canUndo = false,
  onUndo,
  isEmojiMode = false,
}) => {
  const foldersRef = React.useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const { isPaused, toggleMonitoring } = useClipboardMonitoring();

  const currentFolderName = selectedFolder
    ? folders.find((f) => f.id === selectedFolder)?.name || t('detailPanel.folder')
    : t('folders.clipboard');

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

  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = React.useCallback(() => {
    const el = foldersRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + 2;
    setHasOverflow(overflow);
    setCanScrollLeft(overflow && scrollLeft > 2);
    setCanScrollRight(overflow && scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  const scrollLeftHandlers = useHoldToScroll({
    containerRef: foldersRef,
    direction: 'left',
    disabled: !canScrollLeft,
    onScrollChanged: updateScrollState,
    stepDistance: () => Math.max((foldersRef.current?.clientWidth || 300) * 0.65, 160),
  });

  const scrollRightHandlers = useHoldToScroll({
    containerRef: foldersRef,
    direction: 'right',
    disabled: !canScrollRight,
    onScrollChanged: updateScrollState,
    stepDistance: () => Math.max((foldersRef.current?.clientWidth || 300) * 0.65, 160),
  });

  useEffect(() => {
    const el = foldersRef.current;
    if (!el) return;

    updateScrollState();

    const ro = new ResizeObserver(() => {
      updateScrollState();
    });
    ro.observe(el);

    const handleResize = () => updateScrollState();
    window.addEventListener('resize', handleResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [updateScrollState, folders, totalClipCount, showSearch]);

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
          inline: 'nearest',
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
    let reorderScrollRaf: number | null = null;
    let reorderScrollSpeed = 0;

    const stopReorderScroll = () => {
      if (reorderScrollRaf !== null) {
        cancelAnimationFrame(reorderScrollRaf);
        reorderScrollRaf = null;
      }
      reorderScrollSpeed = 0;
    };

    const startReorderScroll = () => {
      if (reorderScrollRaf !== null) return;
      const step = () => {
        if (!wasFolderDraggingRef.current || !foldersRef.current) {
          stopReorderScroll();
          return;
        }
        if (reorderScrollSpeed !== 0) {
          foldersRef.current.scrollLeft += reorderScrollSpeed;
        }
        reorderScrollRaf = requestAnimationFrame(step);
      };
      reorderScrollRaf = requestAnimationFrame(step);
    };

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

      if (wasFolderDraggingRef.current && foldersRef.current) {
        const el = foldersRef.current;
        const rect = el.getBoundingClientRect();
        const EDGE_THRESHOLD = 50;
        const MAX_SPEED = 8;
        const MIN_SPEED = 2;

        if (e.clientX <= rect.left + EDGE_THRESHOLD && el.scrollLeft > 0) {
          const dist = Math.max(0, e.clientX - rect.left);
          const factor = Math.max(0, Math.min(1, (EDGE_THRESHOLD - dist) / EDGE_THRESHOLD));
          reorderScrollSpeed = -Math.max(MIN_SPEED, Math.round(MAX_SPEED * factor));
          startReorderScroll();
        } else if (
          e.clientX >= rect.right - EDGE_THRESHOLD &&
          el.scrollLeft + el.clientWidth < el.scrollWidth - 1
        ) {
          const dist = Math.max(0, rect.right - e.clientX);
          const factor = Math.max(0, Math.min(1, (EDGE_THRESHOLD - dist) / EDGE_THRESHOLD));
          reorderScrollSpeed = Math.max(MIN_SPEED, Math.round(MAX_SPEED * factor));
          startReorderScroll();
        } else {
          reorderScrollSpeed = 0;
        }
      }
    };

    const handleGlobalMouseUp = () => {
      stopReorderScroll();
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
      stopReorderScroll();
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
    const targetIdAttr = selectedFolder === null ? 'clipboard' : selectedFolder;
    const selectedBtn = foldersRef.current?.querySelector(`[data-folder-id="${targetIdAttr}"]`);
    if (selectedBtn) {
      selectedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [selectedFolder]);

  // ── Shortcut hint cycling (labels and hotkeys come from the shared hint source) ──
  const hints = buildShortcutHints(t, hotkey);
  const HINTS = HUD_HINT_ORDER.flatMap((key) => {
    const hint = hints[key];
    return hint ? [hint] : [];
  });
  const hintIndex = useRotatingIndex(HINTS.length, 4000, isWindowActive);

  const titleBarRef = useRef<HTMLDivElement>(null);
  const titleBarLeadingRef = useRef<HTMLDivElement>(null);
  const titleBarTrailingRef = useRef<HTMLDivElement>(null);
  const [hudMaxWidth, setHudMaxWidth] = useState<number | null>(null);

  // The pill is anchored to the real centre of the titlebar. A flex-1 slot
  // would centre it between the logo and the (much wider) button group, which
  // pushes it noticeably to the left. Cap its width to the narrowest side gap
  // so it never sits on top of either group on narrow windows.
  useLayoutEffect(() => {
    if (!showHud) return;
    const bar = titleBarRef.current;
    const leading = titleBarLeadingRef.current;
    const trailing = titleBarTrailingRef.current;
    if (!bar || !leading || !trailing) return;

    const measure = () => {
      const barRect = bar.getBoundingClientRect();
      const leadingRect = leading.getBoundingClientRect();
      const trailingRect = trailing.getBoundingClientRect();
      const center = barRect.left + barRect.width / 2;
      const halfRoom =
        Math.min(center - leadingRect.right, trailingRect.left - center) - HUD_SIDE_GUTTER;
      setHudMaxWidth(Math.max(0, Math.floor(halfRoom * 2)));
    };

    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    observer.observe(leading);
    observer.observe(trailing);
    return () => observer.disconnect();
  }, [showHud]);

  // Titlebar buttons share one hover language: background tint only, no
  // border outline and no glow shadow (see ui/titlebarButtons.ts).
  const headerBtnClass = clsx(TITLEBAR_ICON_BUTTON, 'h-8 w-8 rounded-lg', TITLEBAR_BTN_IDLE);

  return (
    <div
      className={clsx(
        'relative z-10 flex flex-col bg-card/65 backdrop-blur-sm',
        theme === 'light' ? 'text-slate-900' : 'text-white'
      )}
      style={{
        ...style,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* ═══ Header — logo, optional info, window actions ═══ */}
      <div
        ref={titleBarRef}
        className="relative flex h-11 shrink-0 select-none items-center justify-between overflow-hidden border-b border-border bg-card/65 px-3 backdrop-blur-sm"
      >
        <HudKeyframes />
        {titleBarAnimationEnabled && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-y-0 w-[25%]"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(var(--primary-rgb),0.025), transparent)',
                animation: isWindowActive ? 'hud-scan 10s ease-in-out infinite alternate' : 'none',
              }}
            />
          </div>
        )}

        <div ref={titleBarLeadingRef} className="z-10 flex shrink-0 items-center gap-2">
          <Tooltip label={t('common.openAbout')} placement="bottom">
            <button
              type="button"
              className="-ml-1.5 flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-accent/60"
              aria-label={t('common.openAbout')}
              onClick={() => invoke('open_about').catch(console.error)}
            >
              <img src="/logo.png" alt="" className="h-5 w-5 object-contain" />
              <span className="text-sm font-bold leading-5 tracking-tight text-foreground">
                CyberPaste
              </span>
            </button>
          </Tooltip>
        </div>

        {showHud && hudMaxWidth !== null && hudMaxWidth >= HUD_MIN_WIDTH && (
          <div className="absolute inset-y-0 left-1/2 z-10 hidden -translate-x-1/2 items-center sm:flex">
            <Tooltip label={t('common.keyboardShortcuts')} placement="bottom">
              {/* All hints stacked in one grid cell: the widest one sizes the pill,
                  so the width never jumps while rotating. The measured max width
                  keeps it centered and lets labels truncate on narrow windows. */}
              <div
                className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-center overflow-hidden rounded-lg border border-border/60 bg-secondary/20 px-2 py-1 text-[10px] text-muted-foreground/70"
                style={{ maxWidth: hudMaxWidth }}
              >
                {HINTS.map((hint, i) => {
                  const visible = i === hintIndex % HINTS.length;
                  return (
                    <div
                      key={`${hint.keys}-${hint.label}`}
                      className={clsx(
                        'flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap [grid-area:1/1]',
                        !visible && 'invisible'
                      )}
                      style={{ animation: visible ? 'hud-hint-fade 0.5s ease-out' : undefined }}
                    >
                      <Keyboard size={11} className="flex-shrink-0 text-muted-foreground/50" />
                      <kbd className="shrink-0 rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono font-bold leading-none text-primary">
                        {hint.keys}
                      </kbd>
                      <span className="min-w-0 truncate text-muted-foreground/80">
                        {hint.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Tooltip>
          </div>
        )}

        <div ref={titleBarTrailingRef} className="z-10 flex shrink-0 items-center gap-0.5">
          <TitleBarUpdateButton
            visible={updateAvailable}
            version={updateVersion}
            onClick={() => onShowUpdate?.()}
            iconSize={15}
          />
          {lockEnabled && onLockNow && (
            <Tooltip label={hintWithHotkey(t, hints.lockNow)} placement="bottom">
              <button
                type="button"
                onClick={onLockNow}
                className={clsx(headerBtnClass, 'focus:outline-none')}
              >
                <Lock size={15} />
              </button>
            </Tooltip>
          )}

          <Tooltip
            label={hintWithHotkey(t, isPaused ? hints.resumeMonitoring : hints.pauseMonitoring)}
            placement="bottom"
          >
            <button
              type="button"
              onClick={toggleMonitoring}
              aria-label={isPaused ? t('common.resumeMonitoring') : t('common.pauseMonitoring')}
              className={clsx(
                TITLEBAR_ICON_BUTTON,
                'h-8 w-8 rounded-lg',
                isPaused ? TITLEBAR_BTN_ON_AMBER : TITLEBAR_BTN_IDLE
              )}
            >
              {isPaused ? <Play size={15} className="fill-amber-500/30" /> : <Pause size={15} />}
            </button>
          </Tooltip>

          <Tooltip label={hintWithHotkey(t, hints.settings)} placement="bottom">
            <button onClick={onMoreClick} className={headerBtnClass}>
              <Settings size={15} />
            </button>
          </Tooltip>

          <TitleBarMenu
            iconSize={15}
            hotkey={TITLEBAR_HOTKEYS.more}
            onResetSize={onResetSize}
            onAddFolder={onAddClick}
            canUndo={canUndo}
            onUndo={onUndo}
          />

          {/* Divider between app actions and window controls */}
          <div className="mx-1 h-4 w-px shrink-0 bg-foreground/15" aria-hidden="true" />

          {onTogglePin && (
            <Tooltip
              label={hintWithHotkey(t, isPinned ? hints.unpinWindow : hints.pinWindow)}
              placement="bottom"
            >
              <button
                onClick={onTogglePin}
                className={clsx(
                  headerBtnClass,
                  'focus:outline-none',
                  isPinned && TITLEBAR_BTN_ON_PRIMARY_STRONG
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

          <Tooltip
            label={
              toggleModeHotkey
                ? t('common.tooltipWithHotkey', {
                    label:
                      viewMode === 'full' ? t('common.switchToCompact') : t('common.switchToFull'),
                    hotkey: toggleModeHotkey,
                  })
                : viewMode === 'full'
                  ? t('common.switchToCompact')
                  : t('common.switchToFull')
            }
            placement="bottom"
          >
            <button
              onClick={onToggleMode}
              className={clsx(TITLEBAR_ICON_BUTTON, 'h-8 w-8 rounded-lg', TITLEBAR_BTN_MODE_TOGGLE)}
            >
              {viewMode === 'full' ? (
                <ListIcon size={13} className="flex-shrink-0" />
              ) : (
                <LayoutGrid size={13} className="flex-shrink-0" />
              )}
            </button>
          </Tooltip>

          <Tooltip label={hintWithHotkey(t, hints.closeWindow)} placement="bottom">
            <button
              onClick={() => {
                if (onRequestClose) {
                  onRequestClose();
                } else {
                  (window as any).__TAURI_INTERNALS__.invoke('hide_window');
                }
              }}
              className={clsx(
                'ml-0.5',
                TITLEBAR_ICON_BUTTON,
                'h-8 w-8 rounded-lg',
                TITLEBAR_BTN_DANGER
              )}
            >
              <X size={15} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ── Main Toolbar ── */}
      <div className="flex min-w-0 flex-1 items-center gap-1 px-4">
        <Tooltip
          label={
            typeToSearch
              ? t('common.searchTooltipTyping', { hotkey: hints.search.keys })
              : hintWithHotkey(t, hints.search)
          }
          placement="top"
        >
          <button
            onClick={onSearchClick}
            className={clsx(
              TITLEBAR_ICON_BUTTON,
              'h-8 w-8 shrink-0 rounded-lg',
              showSearch
                ? 'border-primary bg-primary text-primary-foreground shadow-lg'
                : TITLEBAR_BTN_IDLE
            )}
          >
            <Search size={16} />
          </button>
        </Tooltip>

        <SearchHistoryMenu
          history={recentSearches}
          toggleToken={searchHistoryToggleToken}
          onSelect={(query) => {
            onSelectSearchHistory(query);
            if (!showSearch) onSearchClick();
          }}
          onClear={onClearSearchHistory}
        />

        <div className="mx-0.5 h-5 w-px shrink-0 bg-border/50" />

        <div className="relative flex h-full min-w-0 flex-1 items-center">
          {!showSearch && hasOverflow && (
            <div className="mr-1 flex-shrink-0">
              <Tooltip label={canScrollLeft ? t('folders.scrollBack') : ''} placement="bottom">
                <button
                  type="button"
                  disabled={!canScrollLeft}
                  aria-label={t('folders.scrollBack')}
                  {...scrollLeftHandlers}
                  className={clsx(
                    'flex h-8 w-5 items-center justify-center rounded-md border transition-all',
                    canScrollLeft
                      ? 'cursor-pointer border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                      : 'pointer-events-none cursor-default border-transparent bg-transparent text-muted-foreground/30 opacity-40'
                  )}
                >
                  <ChevronLeft size={14} strokeWidth={2.2} />
                </button>
              </Tooltip>
            </div>
          )}

          {/* Folders List - Cybernetic Transition */}
          <div
            ref={foldersRef}
            data-folder-container="horizontal"
            onScroll={updateScrollState}
            className={clsx(
              'no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto transition-all duration-500 ease-in-out',
              showSearch
                ? 'pointer-events-none invisible scale-95 opacity-0'
                : 'visible scale-100 opacity-100'
            )}
            onWheel={handleWheel}
          >
            {(() => {
              const isClipboardFlashing = useFolderFlash(null);
              return (
                <Tooltip label={t('common.folderNavHintFull')} placement="bottom">
                  <button
                    onClick={() => onSelectFolder(null)}
                    onMouseEnter={() => isDragging && onDragHover(null)}
                    onMouseLeave={onDragLeave}
                    data-folder-id="clipboard"
                    data-selected={highlightedFolderId === null}
                    className={clsx(
                      'flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2.5 text-[12px] font-medium transition-all focus:outline-none focus-visible:ring-0',
                      isClipboardFlashing && 'folder-double-flash',
                      highlightedFolderId === null && dragTargetFolderId === undefined
                        ? 'border-transparent bg-primary/15 font-semibold text-foreground'
                        : dragTargetFolderId === null && isDragging
                          ? 'border-transparent bg-primary/30 text-foreground'
                          : 'border-transparent text-muted-foreground/80 hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <Clock size={12} className="flex-shrink-0" />
                    <span>{t('folders.clipboard')}</span>
                    <span
                      className={clsx(
                        'text-[10px] tabular-nums opacity-35',
                        highlightedFolderId === null && 'opacity-70'
                      )}
                    >
                      ({totalClipCount})
                    </span>
                  </button>
                </Tooltip>
              );
            })()}

            {folders.map((folder) => {
              const isSelected = highlightedFolderId === folder.id;
              const isDragTarget = dragTargetFolderId === folder.id;
              const isMenuHighlighted = contextMenuFolderId === folder.id;

              return (
                <React.Fragment key={folder.id}>
                  {folderReorderTargetId === folder.id &&
                    folderReorderTargetPosition === 'before' && (
                      <div
                        className="mx-0.5 h-6 w-0.5 flex-shrink-0 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                        style={{ alignSelf: 'center' }}
                      />
                    )}
                  <FolderTabButton
                    folder={folder}
                    isSelected={isSelected}
                    isDragTarget={isDragTarget}
                    isMenuHighlighted={isMenuHighlighted}
                    isDragging={isDragging}
                    draggingFolderId={draggingFolderId}
                    dragTargetFolderId={dragTargetFolderId}
                    onMouseDown={handleFolderMouseDown}
                    onMouseMove={handleFolderMouseMove}
                    onMouseLeave={() => {
                      handleFolderMouseLeave();
                      onDragLeave();
                    }}
                    onClick={(id) => {
                      if (wasFolderDraggingRef.current) return;
                      onSelectFolder(id);
                    }}
                    onContextMenu={onFolderContextMenu}
                    onMouseEnter={(id) => isDragging && onDragHover(id)}
                  />
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
          </div>

          {!showSearch && hasOverflow && (
            <div className="ml-1 flex-shrink-0">
              <Tooltip label={canScrollRight ? t('folders.scrollForward') : ''} placement="bottom">
                <button
                  type="button"
                  disabled={!canScrollRight}
                  aria-label={t('folders.scrollForward')}
                  {...scrollRightHandlers}
                  className={clsx(
                    'flex h-8 w-5 items-center justify-center rounded-md border transition-all',
                    canScrollRight
                      ? 'cursor-pointer border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                      : 'pointer-events-none cursor-default border-transparent bg-transparent text-muted-foreground/30 opacity-40'
                  )}
                >
                  <ChevronRight size={14} strokeWidth={2.2} />
                </button>
              </Tooltip>
            </div>
          )}

          {!showSearch && (
            <div className="ml-1 flex-shrink-0">
              <Tooltip label={t('folders.addFolderBtn') || 'Add Folder'} placement="bottom">
                <button
                  onClick={onAddClick}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-transparent text-muted-foreground/70 transition-all hover:border-muted hover:text-foreground"
                >
                  <Plus size={16} />
                </button>
              </Tooltip>
            </div>
          )}

          {/* Search Bar Overlay */}
          {showSearch && (
            <div className="absolute inset-0 z-10 flex items-center duration-300 animate-in fade-in zoom-in-95">
              <div className="flex h-8 flex-1 items-center gap-3 rounded-lg border border-primary/30 bg-popover px-4 shadow-[0_0_25px_rgba(var(--primary-rgb),0.15)] backdrop-blur-md">
                <Search className="animate-pulse text-primary" size={18} />
                <div className="flex flex-1 items-center gap-2 overflow-hidden">
                  <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    {t('common.searchingIn')}{' '}
                    <span className="text-primary/80">
                      {isEmojiMode ? 'Emojis' : currentFolderName}
                    </span>
                  </span>
                  <div className="mx-1 h-4 w-px flex-shrink-0 bg-border" />
                  <input
                    autoFocus
                    type="text"
                    name="cyberpaste-search"
                    id="search-input"
                    placeholder={isEmojiMode ? t('emoji.searchPlaceholder') : '...'}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="min-w-0 flex-1 bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        if (isEmojiMode) {
                          e.preventDefault();
                          const hasEmojis = Boolean(document.querySelector('[data-emoji-index]'));
                          if (hasEmojis) {
                            const grid = document.querySelector(
                              '[data-emoji-grid="true"]'
                            ) as HTMLElement;
                            if (grid) {
                              grid.focus();
                            }
                          }
                          return;
                        }
                      }
                      if (e.key === 'Enter') {
                        onSearchCommit(searchQuery);
                        return;
                      }
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        onSearchClick();
                      }
                    }}
                  />
                </div>
                <Tooltip
                  label={`${t('common.clearSearch')} (${t('common.esc')})`}
                  placement="bottom"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSearchClick();
                    }}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Inject HUD keyframes (rendered once via React) ────────────────── */
const HudKeyframes = () => (
  <style>{`
    @keyframes hud-scan {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }
    @keyframes hud-hint-fade {
      0%   { opacity: 0; transform: translateY(4px); }
      100% { opacity: 1; transform: translateY(0); }
    }
  `}</style>
);
