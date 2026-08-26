import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { EditClipModal } from './components/EditClipModal';
import { MoveToFolderModal } from './components/MoveToFolderModal';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ClipboardItem as AppClipboardItem, FolderItem, Settings } from './types';
import { ClipList } from './components/ClipList';
import { ControlBar } from './components/ControlBar';
import { TypeFilterChipRow, type FullTypeFilter } from './components/TypeFilterChips';
import { ClipPreviewModal } from './components/ClipPreviewModal';
import { BulkActionBar } from './components/BulkActionBar';
import { ClipDetailPanel } from './components/ClipDetailPanel';
import { CompactView } from './components/CompactView';
import { ContextMenuHost, ContextMenuHostHandle } from './components/ContextMenuHost';
import type { ContextMenuOption } from './components/ContextMenu';
import { FolderModal } from './components/FolderModal';
import { AiResultDialog } from './components/AiResultDialog';
import { OcrResultModal } from './components/OcrResultModal';
import { check } from '@tauri-apps/plugin-updater';
import { UpdateModal } from './components/UpdateModal';
import { useKeyboard } from './hooks/useKeyboard';
import { useTheme } from './hooks/useTheme';
import { useLanguage } from './hooks/useLanguage';
import { triggerPinFlash } from './hooks/usePinFlash';
import { triggerFolderFlash } from './hooks/useFolderFlash';
import { triggerDeleteFlash, cancelDeleteFlash } from './hooks/useDeleteFlash';
import { useTranslation } from 'react-i18next';
import { systemToast as toast } from './utils/toast';
import { LAYOUT } from './constants';
import { generateDemoClips } from './debug/demoData';
import {
  FileText,
  Code,
  Link,
  File as LucideFile,
  Image as ImageIcon,
  Eye,
  Maximize2,
  ScanText,
  ExternalLink,
  Pencil,
  Copy,
  ClipboardCopy,
  Pin,
  PinOff,
  FolderInput,
  Sparkles,
  AlignLeft,
  Languages,
  Code2,
  CheckSquare,
  Trash2,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';

const base64ToBlob = (base64: string, mimeType: string = 'image/png'): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

const getImageMimeType = (metadata: string | null): string => {
  if (!metadata) return 'image/png';
  try {
    const parsed = JSON.parse(metadata) as { format?: string };
    const format = parsed.format?.toLowerCase();
    if (format === 'jpeg' || format === 'jpg') return 'image/jpeg';
    if (format === 'webp') return 'image/webp';
  } catch {
    // Ignore metadata parse errors and fall back.
  }
  return 'image/png';
};

/** Main list slot 1 is the live capture; unpinned drops skip it and frozen pinned slots. */
function firstUnpinnedDropTarget<T extends { is_pinned?: boolean }>(
  clips: T[],
  isMainList: boolean
): T | undefined {
  return clips.find((c, i) => {
    if (c.is_pinned) return false;
    if (isMainList && i === 0) return false;
    return true;
  });
}

function isLiveMainListClip(
  clipId: string | null | undefined,
  clips: { id: string }[],
  selectedFolder: string | null
): boolean {
  return selectedFolder === null && !!clipId && clips[0]?.id === clipId;
}

// Debounce utility for window persistence
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeoutId: any;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

function App() {
  const [clips, setClips] = useState<AppClipboardItem[]>([]);
  const clipsRef = useRef(clips);
  clipsRef.current = clips;
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const foldersRef = useRef(folders);
  foldersRef.current = folders;
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [compactTypeFilter, setCompactTypeFilter] = useState<
    'all' | 'text' | 'code' | 'image' | 'url' | 'file'
  >('all');
  const [fullTypeFilter, setFullTypeFilter] = useState<FullTypeFilter>('all');
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(new Set());
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [clipListResetToken, setClipListResetToken] = useState(0);
  const [gridColumns, setGridColumns] = useState(3);
  const [searchFocusToken, setSearchFocusToken] = useState(0);
  const [previewClip, setPreviewClip] = useState<AppClipboardItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [theme, setTheme] = useState('system');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState<any>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const settingsRef = useRef<Settings | null>(null);
  const isTogglingRef = useRef(false);
  const [viewModeFading, setViewModeFading] = useState(false);

  const [isWindowActive, setIsWindowActive] = useState(true);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const updateVisibility = () => {
      setIsWindowActive(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', updateVisibility);

    const focusPromise = listen('tauri://focus', () => {
      setIsWindowActive(true);
    });

    const blurPromise = listen('tauri://blur', () => {
      const isPinned = settingsRef.current?.pinned;
      if (!isPinned || document.visibilityState === 'hidden') {
        setIsWindowActive(false);
      }
    });

    const visibilityPromise = listen<boolean>('window-visibility', (event) => {
      setIsWindowActive(event.payload);
    });

    updateVisibility();

    return () => {
      document.removeEventListener('visibilitychange', updateVisibility);
      focusPromise.then((f) => f());
      blurPromise.then((f) => f());
      visibilityPromise.then((f) => f());
    };
  }, [settings?.pinned]);

  // DB size for HUD status strip
  const [dbSizeBytes, setDbSizeBytes] = useState(0);
  useEffect(() => {
    if (!isWindowActive) return;
    const fetchSize = () =>
      invoke<number>('get_db_size')
        .then(setDbSizeBytes)
        .catch(() => {});
    fetchSize();
    const timer = setInterval(fetchSize, 30000); // refresh every 30s
    return () => clearInterval(timer);
  }, [isWindowActive]);

  // Simulated Drag State
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [dragTargetFolderId, setDragTargetFolderId] = useState<string | null | undefined>(
    undefined
  );

  // Reorder state
  const [reorderTargetClipId, setReorderTargetClipId] = useState<string | null>(null);
  const [reorderTargetPosition, setReorderTargetPosition] = useState<'before' | 'after' | null>(
    null
  );

  // Add Folder Modal State
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // OCR Modal State
  const [ocrModal, setOcrModal] = useState({
    isOpen: false,
    content: '',
    clipId: '',
  });

  const dragStateRef = useRef({
    isDragging: false,
    clipId: null as string | null,
    targetFolderId: undefined as string | null | undefined,
    pendingDrag: null as { clipId: string; startX: number; startY: number } | null,
    reorderTargetClipId: null as string | null,
    reorderTargetPosition: null as 'before' | 'after' | null,
    cachedRects: null as { id: string; rect: DOMRect; centerY: number }[] | null,
    sourceFolderId: null as string | null,
  });

  const dragIndicatorRef = useRef<HTMLDivElement>(null);
  const wasDraggingRef = useRef<boolean>(false);
  const dragHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScrollRef = useRef<{
    rafId: number | null;
    vx: number;
    vy: number;
    lastClientX: number;
    lastClientY: number;
  }>({
    rafId: null,
    vx: 0,
    vy: 0,
    lastClientX: 0,
    lastClientY: 0,
  });

  const effectiveTheme = useTheme(theme);
  useLanguage(settings?.language);
  const { t } = useTranslation();
  const fullActionTooltip =
    settings?.auto_paste && settings?.auto_inject_paste
      ? t('full.actionAutoInject')
      : settings?.auto_paste
        ? t('full.actionPaste')
        : t('full.actionCopy');

  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = useState(false);
  const selectedFolderRef = useRef(selectedFolder);
  selectedFolderRef.current = selectedFolder;
  const loadPerfIdRef = useRef(0);
  const perfLogEnabled =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const handleToggleMaximize = useCallback(async () => {
    try {
      await appWindow.toggleMaximize();
      setIsMaximized(await appWindow.isMaximized());
    } catch (error) {
      console.error('Failed to toggle window maximization:', error);
    }
  }, [appWindow]);

  useEffect(() => {
    console.log('App: Initializing...');

    appWindow.isMaximized().then(setIsMaximized).catch(console.error);

    // Safety timeout for loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    invoke<Settings>('get_settings')
      .then((s) => {
        setTheme(s.theme);
        setSettings(s);
        // Cargar preferencias compact persistidas
        if (s.compact_type_filter && s.compact_type_filter !== 'all') {
          setCompactTypeFilter(s.compact_type_filter as any);
        }
        if (s.full_type_filter) {
          setFullTypeFilter(s.full_type_filter as FullTypeFilter);
        }
        clearTimeout(timer);
        setIsLoading(false);

        // Check for updates after the welcome banner completes if auto_check_updates is enabled
        if (s.auto_check_updates) {
          const welcomeWillShow = (s.toast_enabled ?? true) && (s.show_action_messages ?? true);
          const welcomeDelay = welcomeWillShow ? 1500 + (s.toast_duration || 3000) + 600 : 2000;

          setTimeout(() => {
            check({ timeout: 15000 })
              .then((update) => {
                if (update) {
                  setUpdateAvailable(update);
                  setShowUpdateModal(true);
                  toast.update(t('settings.updateAvailable', { version: update.version }));
                  invoke('set_update_available', { available: true }).catch(console.error);
                } else {
                  invoke('set_update_available', { available: false }).catch(console.error);
                }
              })
              .catch((err) => {
                console.warn('Auto-update check failed (silent):', err);
              });
          }, welcomeDelay);
        }
      })
      .catch((err) => {
        console.error('Failed to get settings:', err);
        setIsLoading(false);
      });

    // Listen for setting changes from the settings window
    const unlisten = listen<Settings>('settings-changed', (event) => {
      setTheme(event.payload.theme);
      setSettings(event.payload);
      if (event.payload.full_type_filter) {
        setFullTypeFilter(event.payload.full_type_filter as FullTypeFilter);
      }
    });

    // Listen for open-settings from tray
    const unlistenOpenSettings = listen<string>('open-settings', (event) => {
      openSettings(event.payload);
    });

    // Listen for select-clip from toast click
    const unlistenSelectClip = listen<string>('select-clip', (event) => {
      const clipId = event.payload;
      console.log('[App] Selecting clip from toast:', clipId);
      setSelectedFolder(null);
      setSearchQuery('');
      setShowSearch(false);
      setCompactTypeFilter('all');
      setSelectedClipId(clipId);
      setClipListResetToken((prev) => prev + 1);
      getCurrentWindow().setFocus().catch(console.error);
    });

    // Listen for edit-clip from toast context menu
    const unlistenEditClip = listen<string>('edit-clip', (event) => {
      const clipId = event.payload;
      console.log('[App] Editing clip from toast:', clipId);
      invoke('show_window').catch(console.error);
      invoke<AppClipboardItem>('get_clip', { clipId })
        .then((fullClip) => {
          setEditClip({
            isOpen: true,
            clipId: (fullClip as any).id || (fullClip as any).uuid,
            content: (fullClip as any).content,
            clipType: (fullClip as any).clip_type,
          });
        })
        .catch((err) => {
          console.error('Failed to fetch clip content for edit:', err);
        });
    });

    // Listen for reset-window-layout from settings
    const unlistenReset = listen('reset-window-layout', () => {
      handleResetSize();
    });

    // Persist window size on change
    const persistWindow = debounce(async () => {
      if (isTogglingRef.current) return;

      const currentSettings = settingsRef.current;
      if (!currentSettings) return;

      const size = await appWindow.innerSize();
      const scaleFactor = await appWindow.scaleFactor();
      const logicalSize = size.toLogical(scaleFactor);

      // Only save if visible
      if (await appWindow.isVisible()) {
        // Keep maximized dimensions out of the user's restored window size.
        if (await appWindow.isMaximized()) {
          return;
        }

        // Guard: don't let full-width "leak" into compact mode saved width
        if (currentSettings.view_mode === 'compact' && logicalSize.width > 1000) {
          return;
        }

        // Guard: reject corrupted heights from animation/resize events
        if (logicalSize.height < 100 || logicalSize.height > 2000) {
          return;
        }

        await invoke('save_settings', {
          settings: {
            ...currentSettings,
            window_width: logicalSize.width,
            window_height: logicalSize.height,
          },
        });
      }
    }, 1000);

    const unlistenResize = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized).catch(console.error);
      persistWindow();
    });

    // Debug only: load demo clips / restore actual data when triggered from settings
    const unlistenDemo = import.meta.env.DEV
      ? Promise.all([
          listen('load-demo-data', () => {
            setClips(generateDemoClips());
            setHasMore(false);
          }),
          listen('restore-actual-data', () => {
            loadClips(selectedFolderRef.current, false, '');
          }),
        ])
      : Promise.resolve([() => {}, () => {}]);

    return () => {
      unlisten.then((f) => f());
      unlistenOpenSettings.then((f) => f());
      unlistenSelectClip.then((f) => f());
      unlistenEditClip.then((f) => f());
      unlistenReset.then((f) => f());
      unlistenResize.then((f) => f());
      unlistenDemo.then((fs) => fs.forEach((f) => f()));
    };
  }, []);

  const openSettings = useCallback(async (tab?: any) => {
    // Hide main window (with animation)
    try {
      await invoke('hide_window');
    } catch (e) {
      console.error('Failed to hide main window:', e);
    }

    const tabStr = typeof tab === 'string' ? tab : null;
    try {
      await invoke('open_settings', { tab: tabStr });
    } catch (e) {
      console.error('Failed to open settings window:', e);
    }
  }, []);

  const loadClips = useCallback(
    async (
      folderId: string | null,
      append: boolean = false,
      searchQuery: string = '',
      limit: number = 20,
      typeFilter: FullTypeFilter = 'all'
    ) => {
      const perfId = ++loadPerfIdRef.current;
      const loadStart = perfLogEnabled ? performance.now() : 0;
      let invokeStart = 0;
      let invokeEnd = 0;

      // Type filter only applies server-side in full mode; compact filters client-side
      const effectiveTypeFilter = settingsRef.current?.view_mode === 'compact' ? 'all' : typeFilter;
      const typeFilterParam = effectiveTypeFilter === 'all' ? null : effectiveTypeFilter;

      try {
        setIsLoading(true);

        const currentOffset = append ? clips.length : 0;

        let data: AppClipboardItem[];

        if (searchQuery.trim()) {
          if (perfLogEnabled) invokeStart = performance.now();
          data = await invoke<AppClipboardItem[]>('search_clips', {
            query: searchQuery,
            filterId: folderId,
            limit,
            offset: currentOffset,
            typeFilter: typeFilterParam,
          });
          if (perfLogEnabled) invokeEnd = performance.now();
        } else {
          if (perfLogEnabled) invokeStart = performance.now();
          data = await invoke<AppClipboardItem[]>('get_clips', {
            filterId: folderId,
            limit,
            offset: currentOffset,
            previewOnly: true,
            typeFilter: typeFilterParam,
          });
          if (perfLogEnabled) invokeEnd = performance.now();
        }

        const imageCount = perfLogEnabled
          ? data.filter((item) => item.clip_type === 'image').length
          : 0;
        const totalContentChars = perfLogEnabled
          ? data.reduce((sum, item) => sum + (item.content?.length ?? 0), 0)
          : 0;
        const imageContentChars = perfLogEnabled
          ? data
              .filter((item) => item.clip_type === 'image')
              .reduce((sum, item) => sum + (item.content?.length ?? 0), 0)
          : 0;

        if (append) {
          setClips((prev) => {
            return [...prev, ...data];
          });
        } else {
          setClips(data);
          // Keep current selection if it's still present, otherwise select the first clip
          if (data.length > 0) {
            setSelectedClipId((prev) => {
              if (prev && data.some((item) => item.id === prev)) {
                return prev;
              }
              return data[0].id;
            });
          }
        }

        // If we got fewer than limit, no more clips
        setHasMore(data.length === limit);

        if (perfLogEnabled) {
          const stateQueuedAt = performance.now();
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const paintedAt = performance.now();
              console.info('[perf][loadClips]', {
                id: perfId,
                folderId: folderId ?? 'all',
                append,
                hasSearch: Boolean(searchQuery.trim()),
                offset: currentOffset,
                itemCount: data.length,
                imageCount,
                totalContentChars,
                imageContentChars,
                invokeMs: Number((invokeEnd - invokeStart).toFixed(1)),
                queueToPaintMs: Number((paintedAt - stateQueuedAt).toFixed(1)),
                totalMs: Number((paintedAt - loadStart).toFixed(1)),
              });
            });
          });
        }
      } catch (error) {
        console.error('Failed to load clips:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [clips.length]
  );

  const loadFolders = useCallback(async () => {
    try {
      const data = await invoke<FolderItem[]>('get_folders');

      setFolders(data);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  }, []);

  const refreshCurrentFolder = useCallback(() => {
    const clipLimit = settingsRef.current?.view_mode === 'compact' ? 9999 : 20;
    loadClips(selectedFolderRef.current, false, searchQuery, clipLimit, fullTypeFilter);
  }, [loadClips, searchQuery, fullTypeFilter]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleStartTypingSearch = useCallback(
    (char: string) => {
      if (settings?.type_to_search === false) return;
      if (settings?.view_mode === 'compact') {
        setSearchQuery(char);
        setSearchFocusToken((prev) => prev + 1);
      } else {
        setShowSearch(true);
        setSearchQuery(char);
      }
    },
    [settings?.view_mode, settings?.type_to_search]
  );

  const handleSelectFolder = useCallback((folderId: string | null) => {
    // Reset view-level selection state whenever user switches/re-clicks folders.
    setSelectedClipId(null);
    setSelectedClipIds(new Set());
    setClipListResetToken((prev) => prev + 1);
    setSelectedFolder(folderId);
  }, []);

  useEffect(() => {
    loadFolders();
    // Load all clips for compact view, paginate for full view
    const clipLimit = settings?.view_mode === 'compact' ? 9999 : 20;
    if (searchQuery.trim()) {
      loadClips(selectedFolder, false, searchQuery, clipLimit, fullTypeFilter);
    } else {
      loadClips(selectedFolder, false, '', clipLimit, fullTypeFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolder, searchQuery, clipListResetToken, settings?.view_mode, fullTypeFilter]);

  // Handle global mouse events for simulated drag
  useEffect(() => {
    const updateDragIndicatorPosition = (x: number, y: number) => {
      if (dragIndicatorRef.current) {
        dragIndicatorRef.current.style.setProperty('--mouse-x', `${x}px`);
        dragIndicatorRef.current.style.setProperty('--mouse-y', `${y}px`);
      } else {
        document.documentElement.style.setProperty('--mouse-x', `${x}px`);
        document.documentElement.style.setProperty('--mouse-y', `${y}px`);
      }
    };

    const findScrollContainer = (clipList: HTMLElement): HTMLElement | null => {
      const candidates = clipList.querySelectorAll<HTMLElement>(
        '.no-scrollbar, [data-el="clip-list"], [style*="overflow"]'
      );
      for (let i = 0; i < candidates.length; i++) {
        const el = candidates[i];
        if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
          return el;
        }
      }
      if (clipList.firstElementChild instanceof HTMLElement) {
        return clipList.firstElementChild;
      }
      return clipList;
    };

    const updateReorderTarget = (clientX: number, clientY: number) => {
      const elem = document.elementFromPoint(clientX, clientY);
      const folderBtn = elem?.closest('[data-folder-id]');
      if (folderBtn) {
        if (dragStateRef.current.reorderTargetClipId !== null) {
          setReorderTargetClipId(null);
          setReorderTargetPosition(null);
          dragStateRef.current.reorderTargetClipId = null;
          dragStateRef.current.reorderTargetPosition = null;
        }
        return;
      }

      const isOverClipList = elem?.closest('[data-clip-list="true"]');
      if (!isOverClipList || clipsRef.current.length === 0) {
        if (dragStateRef.current.reorderTargetClipId !== null) {
          setReorderTargetClipId(null);
          setReorderTargetPosition(null);
          dragStateRef.current.reorderTargetClipId = null;
          dragStateRef.current.reorderTargetPosition = null;
        }
        return;
      }

      const cards = document.querySelectorAll('[data-clip-id]');
      let closestId: string | null = null;
      let closestDist = Infinity;
      let closestCenterY = 0;

      const currentClipId = dragStateRef.current.clipId;
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i] as HTMLElement;
        const cardId = card.getAttribute('data-clip-id');
        if (cardId && cardId !== currentClipId) {
          const rect = card.getBoundingClientRect();
          const centerY = rect.top + rect.height / 2;
          const centerX = rect.left + rect.width / 2;
          const dist = Math.hypot(clientX - centerX, clientY - centerY);
          if (dist < closestDist) {
            closestDist = dist;
            closestId = cardId;
            closestCenterY = centerY;
          }
        }
      }

      if (closestId && closestDist < 350) {
        const position: 'before' | 'after' = clientY < closestCenterY ? 'before' : 'after';

        let finalTargetId = closestId;
        let finalPosition: 'before' | 'after' | null = position;

        const draggedClip = clipsRef.current.find((c) => c.id === dragStateRef.current.clipId);
        const targetClip = clipsRef.current.find((c) => c.id === closestId);

        const isFirstPosMain =
          selectedFolderRef.current === null &&
          clipsRef.current.length > 0 &&
          closestId === clipsRef.current[0].id &&
          position === 'before';

        if (
          !isFirstPosMain &&
          draggedClip &&
          !draggedClip.is_pinned &&
          targetClip &&
          targetClip.is_pinned
        ) {
          const isMainList = selectedFolderRef.current === null;
          const firstUnpinned = firstUnpinnedDropTarget(clipsRef.current, isMainList);
          if (firstUnpinned) {
            finalTargetId = firstUnpinned.id;
            finalPosition = 'before';
          } else {
            const lastClip = clipsRef.current[clipsRef.current.length - 1];
            finalTargetId = lastClip.id;
            finalPosition = 'after';
          }
        }

        if (
          dragStateRef.current.reorderTargetClipId !== finalTargetId ||
          dragStateRef.current.reorderTargetPosition !== finalPosition
        ) {
          setReorderTargetClipId(finalTargetId);
          setReorderTargetPosition(finalPosition);
          dragStateRef.current.reorderTargetClipId = finalTargetId;
          dragStateRef.current.reorderTargetPosition = finalPosition;
        }
      }
    };

    const stopAutoScroll = () => {
      if (autoScrollRef.current.rafId !== null) {
        cancelAnimationFrame(autoScrollRef.current.rafId);
        autoScrollRef.current.rafId = null;
      }
      autoScrollRef.current.vx = 0;
      autoScrollRef.current.vy = 0;
    };

    const startAutoScrollLoop = () => {
      if (autoScrollRef.current.rafId !== null) return;

      const step = () => {
        if (!dragStateRef.current.isDragging) {
          stopAutoScroll();
          return;
        }

        const { vx, vy, lastClientX, lastClientY } = autoScrollRef.current;
        if (vx !== 0 || vy !== 0) {
          const clipList = document.querySelector('[data-clip-list="true"]') as HTMLElement | null;
          if (clipList) {
            const scrollContainer = findScrollContainer(clipList);
            if (scrollContainer) {
              if (vy !== 0) scrollContainer.scrollTop += vy;
              if (vx !== 0) scrollContainer.scrollLeft += vx;
              updateReorderTarget(lastClientX, lastClientY);
            }
          }
        }

        autoScrollRef.current.rafId = requestAnimationFrame(step);
      };

      autoScrollRef.current.rafId = requestAnimationFrame(step);
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;

      // SAFETY: If no buttons are pressed but we think we are dragging/pending, we missed a mouseup
      if (e.buttons === 0 && (state.isDragging || state.pendingDrag)) {
        finishDrag();
        return;
      }

      // If we are already dragging, update position and detect reorder target / folder hover
      if (state.isDragging) {
        updateDragIndicatorPosition(e.clientX, e.clientY);
        autoScrollRef.current.lastClientX = e.clientX;
        autoScrollRef.current.lastClientY = e.clientY;

        // Detect folder hover (for moving clips from main clipboard to regular folders)
        const elem = document.elementFromPoint(e.clientX, e.clientY);
        const folderBtn = elem?.closest('[data-folder-id]');
        if (folderBtn) {
          // Stop auto-scroll when hovering over folders
          autoScrollRef.current.vx = 0;
          autoScrollRef.current.vy = 0;

          const folderId = folderBtn.getAttribute('data-folder-id');
          const targetId = folderId === 'clipboard' ? null : folderId;

          // Allow dropping to any folder as long as it's different from the currently viewed folder
          if (targetId !== selectedFolderRef.current) {
            if (dragStateRef.current.targetFolderId !== targetId) {
              handleDragHover(targetId);
            }
            // Clear reorder target visual indicators when hovering over a folder
            if (dragStateRef.current.reorderTargetClipId !== null) {
              setReorderTargetClipId(null);
              setReorderTargetPosition(null);
              dragStateRef.current.reorderTargetClipId = null;
              dragStateRef.current.reorderTargetPosition = null;
            }
          } else {
            if (dragStateRef.current.targetFolderId !== undefined) {
              handleDragLeave();
            }
          }
          return;
        } else {
          if (dragStateRef.current.targetFolderId !== undefined) {
            handleDragLeave();
          }
        }

        // Calculate auto-scroll velocity and update reorder target
        const clipList = document.querySelector('[data-clip-list="true"]') as HTMLElement | null;
        if (clipList && clipsRef.current.length > 0) {
          const rect = clipList.getBoundingClientRect();
          const EDGE_THRESHOLD = 60;
          const MAX_SPEED = 16;

          let vy = 0;
          let vx = 0;

          const isInsideHorizontal = e.clientX >= rect.left - 20 && e.clientX <= rect.right + 20;
          const isInsideVertical = e.clientY >= rect.top - 20 && e.clientY <= rect.bottom + 20;

          if (isInsideHorizontal && isInsideVertical) {
            // Top edge scroll zone
            if (e.clientY <= rect.top + EDGE_THRESHOLD && e.clientY >= rect.top - 15) {
              const dist = Math.max(0, e.clientY - rect.top);
              const factor = (EDGE_THRESHOLD - dist) / EDGE_THRESHOLD;
              vy = -Math.max(3, Math.round(MAX_SPEED * factor));
            }
            // Bottom edge scroll zone
            else if (e.clientY >= rect.bottom - EDGE_THRESHOLD && e.clientY <= rect.bottom + 15) {
              const dist = Math.max(0, rect.bottom - e.clientY);
              const factor = (EDGE_THRESHOLD - dist) / EDGE_THRESHOLD;
              vy = Math.max(3, Math.round(MAX_SPEED * factor));
            }

            // Left edge horizontal scroll zone
            if (e.clientX <= rect.left + EDGE_THRESHOLD && e.clientX >= rect.left - 15) {
              const dist = Math.max(0, e.clientX - rect.left);
              const factor = (EDGE_THRESHOLD - dist) / EDGE_THRESHOLD;
              vx = -Math.max(3, Math.round(MAX_SPEED * factor));
            }
            // Right edge horizontal scroll zone
            else if (e.clientX >= rect.right - EDGE_THRESHOLD && e.clientX <= rect.right + 15) {
              const dist = Math.max(0, rect.right - e.clientX);
              const factor = (EDGE_THRESHOLD - dist) / EDGE_THRESHOLD;
              vx = Math.max(3, Math.round(MAX_SPEED * factor));
            }
          }

          autoScrollRef.current.vx = vx;
          autoScrollRef.current.vy = vy;
          if (vx !== 0 || vy !== 0) {
            startAutoScrollLoop();
          }

          updateReorderTarget(e.clientX, e.clientY);
        } else {
          autoScrollRef.current.vx = 0;
          autoScrollRef.current.vy = 0;
          if (dragStateRef.current.reorderTargetClipId !== null) {
            setReorderTargetClipId(null);
            setReorderTargetPosition(null);
            dragStateRef.current.reorderTargetClipId = null;
            dragStateRef.current.reorderTargetPosition = null;
          }
        }
        return;
      }

      // If we have a pending drag, check threshold
      if (state.pendingDrag) {
        const dx = e.clientX - state.pendingDrag.startX;
        const dy = e.clientY - state.pendingDrag.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
          const clipId = state.pendingDrag.clipId;
          // Start actual drag
          setDraggingClipId(clipId);

          if (dragIndicatorRef.current) {
            const draggingClip = clipsRef.current.find((c) => c.id === clipId);
            const clipType = draggingClip?.clip_type || 'text';

            // Hide all sub-icons
            const icons = dragIndicatorRef.current.querySelectorAll('[data-drag-icon]');
            icons.forEach((el) => el.classList.add('hidden'));

            // Show matching sub-icon
            const matchingIcon = dragIndicatorRef.current.querySelector(
              `[data-drag-icon="${clipType}"]`
            );
            if (matchingIcon) {
              matchingIcon.classList.remove('hidden');
            } else {
              dragIndicatorRef.current
                .querySelector('[data-drag-icon="text"]')
                ?.classList.remove('hidden');
            }

            // Show indicator
            dragIndicatorRef.current.classList.remove('hidden');
            dragIndicatorRef.current.classList.add('flex');
          }

          updateDragIndicatorPosition(e.clientX, e.clientY);
          dragStateRef.current.isDragging = true;
          dragStateRef.current.clipId = state.pendingDrag.clipId;
          dragStateRef.current.pendingDrag = null;
        }
      }
    };

    const handleGlobalMouseUp = (_: MouseEvent) => {
      // Always clear pending drag on mouse up
      if (dragStateRef.current.pendingDrag) {
        dragStateRef.current.pendingDrag = null;
        // Click without drag — remove is-dragging class added by startDrag
        document.body.classList.remove('is-dragging');
      }

      if (dragStateRef.current.isDragging) {
        wasDraggingRef.current = true;
        setTimeout(() => {
          wasDraggingRef.current = false;
        }, 100);
        finishDrag();
      }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragStateRef.current.isDragging) {
        e.preventDefault();
        e.stopPropagation();
        wasDraggingRef.current = true;
        setTimeout(() => {
          wasDraggingRef.current = false;
        }, 100);
        finishDrag(true);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });

    return () => {
      stopAutoScroll();
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
    };
  }, []);

  const startDrag = (clipId: string, startX: number, startY: number) => {
    // Instead of starting immediately, set pending
    dragStateRef.current.pendingDrag = { clipId, startX, startY };
    dragStateRef.current.clipId = clipId;
    dragStateRef.current.sourceFolderId = selectedFolder;
    // We don't set state yet, avoiding re-render until threshold passed
    document.body.classList.add('is-dragging');
  };

  const finishDrag = async (isCancelled = false) => {
    if (autoScrollRef.current.rafId !== null) {
      cancelAnimationFrame(autoScrollRef.current.rafId);
      autoScrollRef.current.rafId = null;
    }
    autoScrollRef.current.vx = 0;
    autoScrollRef.current.vy = 0;

    const { clipId, targetFolderId, reorderTargetClipId, reorderTargetPosition } =
      dragStateRef.current;

    if (dragHoverTimerRef.current) {
      clearTimeout(dragHoverTimerRef.current);
      dragHoverTimerRef.current = null;
    }

    // Save reorder targets before clearing state (override reordering if dropping to a folder)
    const reorderClipId = targetFolderId !== undefined ? null : reorderTargetClipId;
    const reorderPos = targetFolderId !== undefined ? null : reorderTargetPosition;

    // Clear all state immediately
    setDraggingClipId(null);
    setDragTargetFolderId(undefined);
    setReorderTargetClipId(null);
    setReorderTargetPosition(null);
    if (dragIndicatorRef.current) {
      dragIndicatorRef.current.classList.add('hidden');
      dragIndicatorRef.current.classList.remove('flex');
    }
    const sourceFolderId = dragStateRef.current.sourceFolderId;
    dragStateRef.current = {
      isDragging: false,
      clipId: null,
      targetFolderId: undefined,
      pendingDrag: null,
      reorderTargetClipId: null,
      reorderTargetPosition: null,
      cachedRects: null,
      sourceFolderId: null,
    };
    document.body.classList.remove('is-dragging');

    if (isCancelled) {
      return;
    }

    const currentClips = clipsRef.current;

    // Handle reorder drop (priority over folder move)
    if (clipId && reorderClipId && reorderPos) {
      // Check if this is the first position in the main list (copy to clipboard)
      const isMainList = selectedFolderRef.current === null;
      const isFirstPos =
        currentClips.length > 0 && reorderClipId === currentClips[0].id && reorderPos === 'before';

      if (isMainList && isFirstPos && sourceFolderId === null) {
        handleCopy(clipId);
      } else {
        // Detect cross-folder drag (folder was switched during drag via hover)
        const isCrossFolderDrag = sourceFolderId !== selectedFolderRef.current;

        if (isCrossFolderDrag) {
          // Copy clip to the destination folder first, then reorder
          try {
            await invoke('copy_to_folder', { clipId, folderId: selectedFolderRef.current });
            triggerFolderFlash(selectedFolderRef.current);
            await loadClips(selectedFolderRef.current);
            await loadFolders();
            // Now reorder within the new folder
            await invoke('reorder_clip', {
              clipUuid: clipId,
              targetUuid: reorderClipId,
              position: reorderPos,
            });
            await loadClips(selectedFolderRef.current);
            refreshTotalCount();
            toast.success(t('toasts.copiedToFolder'));
          } catch (e) {
            const errMsg = typeof e === 'string' ? e : t('toasts.clipCopyFailed');
            console.error('[finishDrag] Cross-folder drag failed:', e);
            if (
              typeof e === 'string' &&
              (e.toLowerCase().includes('existe') || e.toLowerCase().includes('exist'))
            ) {
              toast.duplicate(errMsg);
            } else {
              toast.error(errMsg);
            }
          }
        } else {
          // Same-folder reorder
          const draggedClip = currentClips.find((c) => c.id === clipId);
          const targetClip = currentClips.find((c) => c.id === reorderClipId);

          let finalReorderClipId = reorderClipId;
          let finalReorderPos = reorderPos;

          // Redirect if target is pinned and dragged is not pinned
          if (draggedClip && !draggedClip.is_pinned && targetClip && targetClip.is_pinned) {
            const firstUnpinned = firstUnpinnedDropTarget(currentClips, isMainList);
            if (firstUnpinned) {
              finalReorderClipId = firstUnpinned.id;
              finalReorderPos = 'before';
            } else {
              const lastClip = currentClips[currentClips.length - 1];
              finalReorderClipId = lastClip.id;
              finalReorderPos = 'after';
            }
          }

          try {
            await invoke('reorder_clip', {
              clipUuid: clipId,
              targetUuid: finalReorderClipId,
              position: finalReorderPos,
            });
            await loadClips(selectedFolderRef.current);
            await loadFolders();
            refreshTotalCount();
          } catch (e) {
            console.error('[finishDrag] Failed to reorder clip:', e);
          }
        }
      }
    } else if (clipId && targetFolderId !== undefined) {
      handleMoveClip(clipId, targetFolderId);
    }
  };

  const recalculateCachedRects = useCallback(() => {
    if (!dragStateRef.current.isDragging) return;
    const currentClipId = dragStateRef.current.clipId;
    const cards = document.querySelectorAll('[data-clip-id]');
    const rects: { id: string; rect: DOMRect; centerY: number }[] = [];
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i] as HTMLElement;
      const cardId = card.getAttribute('data-clip-id');
      if (cardId && cardId !== currentClipId) {
        const rect = card.getBoundingClientRect();
        rects.push({
          id: cardId,
          rect,
          centerY: rect.top + rect.height / 2,
        });
      }
    }
    dragStateRef.current.cachedRects = rects;
  }, []);

  useEffect(() => {
    if (dragStateRef.current.isDragging) {
      // Use requestAnimationFrame + small delay to ensure DOM has rendered the new clips
      const raf = requestAnimationFrame(() => {
        setTimeout(() => {
          recalculateCachedRects();
        }, 100);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [clips, recalculateCachedRects]);

  const handleDragHover = (folderId: string | null) => {
    setDragTargetFolderId(folderId);
    dragStateRef.current.targetFolderId = folderId;

    if (dragHoverTimerRef.current) {
      clearTimeout(dragHoverTimerRef.current);
      dragHoverTimerRef.current = null;
    }

    if (folderId !== undefined) {
      dragHoverTimerRef.current = setTimeout(() => {
        if (dragStateRef.current.targetFolderId === folderId) {
          handleSelectFolder(folderId);
        }
      }, 1200); // 1.2s hover to open folder
    }
  };

  const handleDragLeave = () => {
    setDragTargetFolderId(undefined);
    dragStateRef.current.targetFolderId = undefined;

    if (dragHoverTimerRef.current) {
      clearTimeout(dragHoverTimerRef.current);
      dragHoverTimerRef.current = null;
    }
  };

  // Total History Count
  const [totalClipCount, setTotalClipCount] = useState(0);
  const [imageCount, setImageCount] = useState(0);
  const [textCount, setTextCount] = useState(0);
  const [codeCount, setCodeCount] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [htmlCount, setHtmlCount] = useState(0);
  const [rtfCount, setRtfCount] = useState(0);
  const [urlCount, setUrlCount] = useState(0);

  const refreshTotalCount = useCallback(async () => {
    try {
      const stats = await invoke<{
        total: number;
        images: number;
        text: number;
        code: number;
        files: number;
        html: number;
        rtf: number;
        urls: number;
      }>('get_clip_stats');
      setTotalClipCount(stats.total);
      setImageCount(stats.images);
      setTextCount(stats.text);
      setCodeCount(stats.code || 0);
      setFileCount(stats.files || 0);
      setHtmlCount(stats.html || 0);
      setRtfCount(stats.rtf || 0);
      setUrlCount(stats.urls || 0);
    } catch (e) {
      console.error('Failed to get clip stats', e);
    }
  }, []);

  // Counts for the Full-mode type filter chips
  const typeFilterCounts = useMemo(() => {
    const codeTotal = (codeCount || 0) + (htmlCount || 0) + (rtfCount || 0);
    const perType: Record<Exclude<FullTypeFilter, 'all'>, number> = {
      text: textCount,
      code: codeTotal,
      image: imageCount,
      url: urlCount,
      file: fileCount,
    };
    return {
      ...perType,
      all: perType.text + perType.code + perType.image + perType.url + perType.file,
    };
  }, [textCount, codeCount, htmlCount, rtfCount, imageCount, fileCount, urlCount]);

  useEffect(() => {
    refreshTotalCount();
  }, [refreshTotalCount]);

  // Auto-select first clip when clip list resets (folder change, clipboard change, window reopen)
  useEffect(() => {
    if (clipsRef.current.length > 0) {
      setSelectedClipId(clipsRef.current[0].id);
    }
  }, [clipListResetToken]);

  // Auto-select first clip and reset view (if enabled) when window is reopened (visibility becomes true)
  useEffect(() => {
    const unlisten = listen<boolean>('window-visibility', (event) => {
      if (event.payload && settingsRef.current?.reset_view_on_paste) {
        setSearchQuery('');
        setShowSearch(false);
        setSelectedFolder(null);
        setCompactTypeFilter('all');
        setFullTypeFilter('all');
        setClipListResetToken((prev) => prev + 1);
        if (clipsRef.current.length > 0) {
          setSelectedClipId(clipsRef.current[0].id);
        }
      }
    });
    return () => {
      unlisten.then((u) => {
        if (typeof u === 'function') u();
      });
    };
  }, []);

  useEffect(() => {
    const unlistenClipboard = listen('clipboard-change', () => {
      console.log('[App] Clipboard change detected, refreshing...');
      loadFolders();
      refreshCurrentFolder();
      refreshTotalCount();
    });

    return () => {
      unlistenClipboard.then((unlisten) => {
        if (typeof unlisten === 'function') unlisten();
      });
    };
  }, [refreshCurrentFolder, loadFolders, refreshTotalCount]);

  const handleDelete = useCallback(
    async (clipId: string | null) => {
      if (!clipId) return;
      triggerDeleteFlash(clipId, 320);
      try {
        const deletePromise = invoke('delete_clip', { id: clipId, hardDelete: false });
        const animPromise = new Promise((resolve) => setTimeout(resolve, 320));
        await Promise.all([deletePromise, animPromise]);

        setClips((prevClips) => prevClips.filter((c) => c.id !== clipId));
        setSelectedClipId((prevSelected) => (prevSelected === clipId ? null : prevSelected));
        setSelectedClipIds((prevSelected) => {
          if (!prevSelected.has(clipId)) return prevSelected;
          const next = new Set(prevSelected);
          next.delete(clipId);
          return next;
        });
        // Refresh counts
        loadFolders();
        refreshTotalCount();
      } catch (error) {
        cancelDeleteFlash(clipId);
        console.error('Failed to delete clip:', error);
        toast.error(t('notifications.clipDeleteFailed'));
      }
    },
    [loadFolders, refreshTotalCount, t]
  );

  const handleToggleClipPin = useCallback(
    async (clipId: string | null) => {
      if (!clipId) return;
      const current = clipsRef.current.find((c) => c.id === clipId);
      if (
        isLiveMainListClip(clipId, clipsRef.current, selectedFolderRef.current) &&
        !current?.is_pinned
      ) {
        toast.info(t('toasts.cannotPinLatestClip'));
        return;
      }
      try {
        const newPinnedState = await invoke<boolean>('toggle_clip_pin', { uuid: clipId });
        setClips((prevClips) =>
          prevClips.map((c) => (c.id === clipId ? { ...c, is_pinned: newPinnedState } : c))
        );
        triggerPinFlash(clipId);
        toast.success(newPinnedState ? t('toasts.clipPinned') : t('toasts.clipUnpinned'));
      } catch (error) {
        console.error('Failed to toggle clip pin:', error);
        toast.error(t('toasts.togglePinFailed'));
      }
    },
    [t]
  );

  const getFullImageBlob = useCallback(
    async (clipId: string, fallbackClip: AppClipboardItem): Promise<Blob> => {
      const detail = await invoke<AppClipboardItem>('get_clip_detail', { id: clipId });
      const mimeType = getImageMimeType(detail.metadata ?? fallbackClip.metadata);
      return base64ToBlob(detail.content, mimeType);
    },
    []
  );

  const handlePaste = useCallback(
    async (clipId: string) => {
      if (wasDraggingRef.current) {
        return;
      }
      try {
        const clip = clipsRef.current.find((c) => c.id === clipId);
        if (clip && clip.clip_type === 'image') {
          try {
            const blob = await getFullImageBlob(clipId, clip);
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          } catch (e) {
            console.error('Frontend clipboard write failed', e);
          }
        }

        await invoke('paste_clip', { id: clipId });
        // Force immediate refresh
        if (settingsRef.current?.reset_view_on_paste) {
          setSearchQuery('');
          setShowSearch(false);
          setCompactTypeFilter('all');
          setFullTypeFilter('all');
          handleSelectFolder(null);
        } else {
          refreshCurrentFolder();
        }
        refreshTotalCount();

        // Close window after paste unless pinned
        if (!settingsRef.current?.pinned) {
          setTimeout(() => {
            appWindow.hide().catch((err) => console.error('Failed to hide window:', err));
          }, 150);
        }
      } catch (error) {
        console.error('Failed to paste clip:', error);
      }
    },
    [getFullImageBlob, handleSelectFolder, refreshCurrentFolder, refreshTotalCount]
  );

  const handleCopy = async (clipId: string) => {
    try {
      const clip = clipsRef.current.find((c) => c.id === clipId);
      if (clip && clip.clip_type === 'image') {
        const blob = await getFullImageBlob(clipId, clip);
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      }

      await invoke('paste_clip', { id: clipId });
      // Force immediate refresh
      refreshCurrentFolder();
      refreshTotalCount();

      toast.success(t('common.copied'));
    } catch (error) {
      console.error('Failed to copy clip:', error);
      toast.error(t('notifications.copyFailed'));
    }
  };

  // Ctrl + wheel adjusts the Full-mode grid zoom (0.6x – 1.75x), persisted in settings
  const GRID_SCALE_MIN = 0.6;
  const GRID_SCALE_MAX = 1.75;
  const GRID_SCALE_STEP = 0.1;

  const [zoomIndicator, setZoomIndicator] = useState<string | null>(null);
  const zoomIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showZoomIndicator = useCallback((scale: number) => {
    setZoomIndicator(`${Math.round(scale * 100)}%`);
    if (zoomIndicatorTimerRef.current) clearTimeout(zoomIndicatorTimerRef.current);
    zoomIndicatorTimerRef.current = setTimeout(() => setZoomIndicator(null), 1200);
  }, []);

  useEffect(() => {
    const handleZoomWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (settingsRef.current?.view_mode !== 'full') return;
      const target = e.target as HTMLElement;
      if (!target.closest('[data-el="clip-list-area"]')) return;
      e.preventDefault();
      const current = settingsRef.current?.full_grid_scale ?? 1;
      const direction = e.deltaY < 0 ? 1 : -1;
      const next = Math.min(
        GRID_SCALE_MAX,
        Math.max(GRID_SCALE_MIN, Number((current + direction * GRID_SCALE_STEP).toFixed(2)))
      );
      if (next === current || !settingsRef.current) return;
      const newSettings = { ...settingsRef.current, full_grid_scale: next };
      setSettings(newSettings);
      invoke('save_settings', { settings: newSettings }).catch(console.error);
      showZoomIndicator(next);
    };
    document.addEventListener('wheel', handleZoomWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleZoomWheel);
  }, [showZoomIndicator]);

  // Ctrl + wheel en área de clips del modo Compact: cambia densidad (36/44/52px)
  useEffect(() => {
    const ROW_HEIGHTS = [36, 44, 52];
    const handleCompactZoom = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (settingsRef.current?.view_mode !== 'compact') return;
      const target = e.target as HTMLElement;
      // Solo si estamos sobre el área de clips (cualquier elemento dentro del div de la lista)
      if (!target.closest('[data-clip-list="true"]')) return;
      e.preventDefault();
      const current = settingsRef.current?.compact_row_height ?? 44;
      const idx = ROW_HEIGHTS.indexOf(current);
      const direction = e.deltaY < 0 ? 1 : -1;
      const nextIdx = Math.min(ROW_HEIGHTS.length - 1, Math.max(0, idx + direction));
      const next = ROW_HEIGHTS[nextIdx];
      if (next === current || !settingsRef.current) return;
      const newSettings = { ...settingsRef.current, compact_row_height: next };
      setSettings(newSettings);
      invoke('save_settings', { settings: newSettings }).catch(console.error);
      // Micro-toast de feedback
      toast.info(
        t('settings.compactDensity') +
          ': ' +
          (next === 36
            ? t('compact.densitySmall')
            : next === 44
              ? t('compact.densityMedium')
              : t('compact.densityLarge'))
      );
    };
    document.addEventListener('wheel', handleCompactZoom, { passive: false });
    return () => document.removeEventListener('wheel', handleCompactZoom);
  }, [t]);

  // Keyboard navigation handlers
  const handleNavigatePrev = useCallback(() => {
    if (clips.length === 0) return;

    if (!selectedClipId) {
      setSelectedClipId(clips[0].id);
      return;
    }

    const currentIndex = clips.findIndex((c) => c.id === selectedClipId);
    if (settings?.view_mode === 'full') {
      const cols = gridColumns || 1;
      if (currentIndex >= cols) {
        setSelectedClipId(clips[currentIndex - cols].id);
      } else {
        // Wrap around to bottom
        const target = clips.length - 1;
        setSelectedClipId(clips[target].id);
      }
    } else {
      if (currentIndex > 0) {
        setSelectedClipId(clips[currentIndex - 1].id);
      } else {
        setSelectedClipId(clips[clips.length - 1].id);
      }
    }
  }, [clips, selectedClipId, settings?.view_mode, gridColumns]);

  const handleNavigateNext = useCallback(() => {
    if (clips.length === 0) return;

    if (!selectedClipId) {
      setSelectedClipId(clips[0].id);
      return;
    }

    const currentIndex = clips.findIndex((c) => c.id === selectedClipId);
    if (settings?.view_mode === 'full') {
      const cols = gridColumns || 1;
      if (currentIndex + cols < clips.length) {
        setSelectedClipId(clips[currentIndex + cols].id);
      } else {
        // Wrap around to top
        setSelectedClipId(clips[0].id);
      }
    } else {
      if (currentIndex < clips.length - 1) {
        setSelectedClipId(clips[currentIndex + 1].id);
      } else {
        setSelectedClipId(clips[0].id);
      }
    }
  }, [clips, selectedClipId, settings?.view_mode, gridColumns]);

  const handleNavigateFirst = useCallback(() => {
    if (clips.length === 0) return;
    setSelectedClipId(clips[0].id);
  }, [clips]);

  const handleNavigateLast = useCallback(() => {
    if (clips.length === 0) return;
    setSelectedClipId(clips[clips.length - 1].id);
  }, [clips]);

  const handleNavigatePageUp = useCallback(() => {
    if (clips.length === 0) return;
    if (!selectedClipId) {
      setSelectedClipId(clips[0].id);
      return;
    }
    const currentIndex = clips.findIndex((c) => c.id === selectedClipId);
    if (currentIndex <= 0) {
      setSelectedClipId(clips[0].id);
      return;
    }
    const cols = settings?.view_mode === 'full' ? gridColumns || 1 : 1;
    const pageSize = settings?.view_mode === 'full' ? Math.max(cols * 2, 6) : 8;
    const targetIndex = Math.max(0, currentIndex - pageSize);
    setSelectedClipId(clips[targetIndex].id);
  }, [clips, selectedClipId, settings?.view_mode, gridColumns]);

  const handleNavigatePageDown = useCallback(() => {
    if (clips.length === 0) return;
    const cols = settings?.view_mode === 'full' ? gridColumns || 1 : 1;
    const pageSize = settings?.view_mode === 'full' ? Math.max(cols * 2, 6) : 8;
    if (!selectedClipId) {
      const targetIndex = Math.min(clips.length - 1, pageSize);
      setSelectedClipId(clips[targetIndex].id);
      return;
    }
    const currentIndex = clips.findIndex((c) => c.id === selectedClipId);
    if (currentIndex >= clips.length - 1) {
      setSelectedClipId(clips[clips.length - 1].id);
      return;
    }
    const targetIndex = Math.min(clips.length - 1, currentIndex + pageSize);
    setSelectedClipId(clips[targetIndex].id);
  }, [clips, selectedClipId, settings?.view_mode, gridColumns]);

  // Folder navigation handlers (Left/Right arrows in compact mode)
  const handleFolderPrev = useCallback(() => {
    // Build ordered list: [null (clipboard), ...folder ids]
    const folderIds: (string | null)[] = [null, ...folders.map((f) => f.id)];
    const currentIdx = folderIds.indexOf(selectedFolder);
    if (currentIdx <= 0) {
      // Wrap to last folder
      handleSelectFolder(folderIds[folderIds.length - 1]);
    } else {
      handleSelectFolder(folderIds[currentIdx - 1]);
    }
  }, [folders, selectedFolder, handleSelectFolder]);

  const handleFolderNext = useCallback(() => {
    const folderIds: (string | null)[] = [null, ...folders.map((f) => f.id)];
    const currentIdx = folderIds.indexOf(selectedFolder);
    if (currentIdx >= folderIds.length - 1) {
      // Wrap to clipboard
      handleSelectFolder(folderIds[0]);
    } else {
      handleSelectFolder(folderIds[currentIdx + 1]);
    }
  }, [folders, selectedFolder, handleSelectFolder]);

  const handlePasteSelected = useCallback(() => {
    if (selectedClipId) {
      handlePaste(selectedClipId);
    }
  }, [selectedClipId, handlePaste]);

  // Toggle single-clip membership in the bulk selection (Ctrl+Click)
  const handleClipToggleSelect = useCallback((id: string) => {
    setSelectedClipIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Range selection up to `id` using the current `clips` ordering (Shift+Click)
  const handleClipRangeSelect = useCallback(
    (id: string) => {
      const idx = clipsRef.current.findIndex((c) => c.id === id);
      if (idx < 0) return;
      const anchorIdx = selectedClipId
        ? clipsRef.current.findIndex((c) => c.id === selectedClipId)
        : 0;
      const [start, end] = anchorIdx <= idx ? [anchorIdx, idx] : [idx, anchorIdx];
      setSelectedClipIds(new Set(clipsRef.current.slice(start, end + 1).map((c) => c.id)));
      setSelectedClipId(id);
    },
    [selectedClipId]
  );

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedClipIds);
    if (ids.length === 0) return;
    triggerDeleteFlash(ids, 320);
    try {
      const deletePromise = invoke('delete_clips', { ids });
      const animPromise = new Promise((resolve) => setTimeout(resolve, 320));
      await Promise.all([deletePromise, animPromise]);

      const idsSet = new Set(ids);
      setClips((prev) => prev.filter((c) => !idsSet.has(c.id)));
      setSelectedClipIds(new Set());
      loadFolders();
      refreshTotalCount();
    } catch (e) {
      cancelDeleteFlash(ids);
      console.error('Bulk delete failed:', e);
      toast.error(t('notifications.deleteFailed'));
    }
  }, [selectedClipIds, loadFolders, refreshTotalCount, t]);

  const handleBulkMove = useCallback(
    async (folderId: string | null) => {
      const ids = Array.from(selectedClipIds);
      if (ids.length === 0) return;
      try {
        const copied = await invoke<number>('copy_clips_to_folder', { ids, folderId });
        triggerFolderFlash(folderId);
        refreshCurrentFolder();
        loadFolders();
        refreshTotalCount();
        setSelectedClipIds(new Set());
        toast.success(
          folderId
            ? t('toasts.clipsCopiedToFolder', { count: copied })
            : t('toasts.clipsCopiedToMain', { count: copied })
        );
      } catch (e) {
        console.error('Bulk copy failed:', e);
        const errMsg = typeof e === 'string' ? e : t('toasts.clipCopyFailed');
        if (
          typeof e === 'string' &&
          (e.toLowerCase().includes('existe') || e.toLowerCase().includes('exist'))
        ) {
          toast.duplicate(errMsg);
        } else {
          toast.error(errMsg);
        }
      }
    },
    [selectedClipIds, refreshCurrentFolder, loadFolders, refreshTotalCount, t]
  );

  const handleClipClick = useCallback(
    (id: string, event: React.MouseEvent) => {
      if (event.ctrlKey || event.metaKey) {
        handleClipToggleSelect(id);
      } else if (event.shiftKey) {
        handleClipRangeSelect(id);
      } else {
        setSelectedClipIds(new Set());
        setSelectedClipId(id);
      }
    },
    [handleClipToggleSelect, handleClipRangeSelect]
  );

  const handleClearBulkSelection = useCallback(() => setSelectedClipIds(new Set()), []);

  // Ctrl+A — select every clip currently rendered (Full grid) or filtered list (Compact)
  const handleSelectAllClips = useCallback(() => {
    setSelectedClipIds(new Set(clipsRef.current.map((c) => c.id)));
    toast.info(t('bulk.selectedAll', { count: clipsRef.current.length }));
  }, [t]);

  const handleToggleClipSelect = useCallback((id: string, multi: boolean) => {
    setSelectedClipIds((prev) => {
      const next = new Set(multi ? prev : []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkCopy = useCallback(async () => {
    const ids = Array.from(selectedClipIds);
    if (ids.length === 0) return;
    // Copiar todos los clips seleccionados concatenados
    const texts: string[] = [];
    for (const id of ids) {
      const clip = clipsRef.current.find((c) => c.id === id);
      if (clip && clip.clip_type !== 'image' && clip.clip_type !== 'file') {
        texts.push(clip.content);
      }
    }
    if (texts.length === 0) {
      toast.info(t('contextMenu.noPlainText'));
      return;
    }
    try {
      await invoke('write_clipboard_text', { text: texts.join('\n\n') });
      toast.success(t('common.copied'));
      handleClearBulkSelection();
    } catch (err) {
      toast.error(t('notifications.copyFailed'));
    }
  }, [selectedClipIds, t, handleClearBulkSelection]);

  // Ctrl+1 a Ctrl+9 → pegar clip #N usando clipNumbering actual
  const handlePasteByIndex = useCallback(
    (n: number) => {
      const filtered = clipsRef.current;
      if (filtered.length === 0) return;
      // Positional: Ctrl+1 = index 0 (clip #1)
      // Countdown: mostrar #N donde N = totalCount - index, entonces Ctrl+1 corresponde al último visualmente.
      //    Para countdown Ctrl+1 debe pegar el clip con número #1, que es el último en la lista (index length-1).
      const targetIndex = settings?.clip_numbering === 'countdown' ? filtered.length - n : n - 1;
      if (targetIndex < 0 || targetIndex >= filtered.length) return;
      const clip = filtered[targetIndex];
      if (clip) handlePaste(clip.id);
    },
    [settings?.clip_numbering]
  );

  // Left/Right move between cards (identical wrap-around semantics as Up/Down)
  const handleCardPrev = useCallback(() => {
    if (clips.length === 0) return;
    if (!selectedClipId) {
      setSelectedClipId(clips[0].id);
      return;
    }
    const currentIndex = clips.findIndex((c) => c.id === selectedClipId);
    if (currentIndex > 0) {
      setSelectedClipId(clips[currentIndex - 1].id);
    } else {
      setSelectedClipId(clips[clips.length - 1].id);
    }
  }, [clips, selectedClipId]);

  const handleCardNext = useCallback(() => {
    if (clips.length === 0) return;
    if (!selectedClipId) {
      setSelectedClipId(clips[0].id);
      return;
    }
    const currentIndex = clips.findIndex((c) => c.id === selectedClipId);
    if (currentIndex < clips.length - 1) {
      setSelectedClipId(clips[currentIndex + 1].id);
    } else {
      setSelectedClipId(clips[0].id);
    }
  }, [clips, selectedClipId]);

  // Ctrl+Enter — copy the selected clip as plain text, without pasting
  const handleCopyPlainTextSelected = useCallback(async () => {
    if (!selectedClipId) return;
    const clip = clipsRef.current.find((c) => c.id === selectedClipId);
    if (!clip || clip.clip_type === 'image' || clip.clip_type === 'file') {
      toast.info(t('contextMenu.noPlainText'));
      return;
    }
    try {
      await invoke('copy_clip_text', { clipId: selectedClipId });
      toast.success(t('common.copied'));
    } catch (err) {
      console.error('Failed to copy plain text:', err);
      toast.error(t('notifications.copyFailed'));
    }
  }, [selectedClipId, t]);

  // Full-mode card OCR shortcut: runs OCR on demand and shows the result inline
  const handleOcrRequest = useCallback(
    async (clipId: string) => {
      const toastId = toast.loading(t('viewer.extractingText'));
      try {
        const text = await invoke<string>('run_ocr_for_clip', { clipId });
        toast.dismiss(toastId);
        if (text && text.trim()) {
          setOcrModal({ isOpen: true, content: text, clipId });
        } else {
          toast.info(t('viewer.noTextDetected'));
        }
      } catch (err) {
        toast.dismiss(toastId);
        toast.error(t('toasts.ocrError', { error: String(err) }));
      }
    },
    [t]
  );

  const handleCreateFolder = async (name: string, icon?: string, color?: string) => {
    try {
      await invoke('create_folder', { name, icon, color });
      await loadFolders();
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  };

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      loadClips(selectedFolder, true, searchQuery, 20, fullTypeFilter);
    }
  }, [hasMore, isLoading, selectedFolder, loadClips, searchQuery, fullTypeFilter]);

  const handleGridScaleChange = useCallback((next: number) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const newSettings = { ...prev, full_grid_scale: next };
      invoke('save_settings', { settings: newSettings }).catch(console.error);
      return newSettings;
    });
  }, []);

  // Toggle the HUD strip (persisted so it survives restarts)
  // Removed: HUD toggle is now controlled only from the Settings panel.

  // Toggle the right-side detail panel (state only, not persisted)
  const handleToggleDetailPanel = useCallback(() => {
    setDetailPanelOpen((prev) => !prev);
  }, []);

  const handleMoveClip = async (clipId: string, folderId: string | null) => {
    try {
      await invoke('copy_to_folder', { clipId, folderId });
      triggerFolderFlash(folderId);

      // Refresh current view from DB to ensure consistency
      refreshCurrentFolder();
      loadFolders();
      refreshTotalCount();

      toast.success(t('toasts.copiedToFolder'));
    } catch (error) {
      console.error('Failed to copy clip:', error);
      const errMsg = typeof error === 'string' ? error : t('toasts.clipCopyFailed');
      if (
        typeof error === 'string' &&
        (error.toLowerCase().includes('existe') || error.toLowerCase().includes('exist'))
      ) {
        toast.duplicate(errMsg);
      } else {
        toast.error(errMsg);
      }
    }
  };

  const handleReorderFolder = async (
    folderId: string,
    targetId: string,
    position: 'before' | 'after'
  ) => {
    try {
      await invoke('reorder_folder', { folderId, targetId, position });
      loadFolders();
    } catch (error) {
      console.error('Failed to reorder folder:', error);
      toast.error(t('toasts.folderReorderFailed'));
    }
  };

  // Context menu lives in an isolated host so opening it doesn't re-render App/Compact list
  const contextMenuRef = useRef<ContextMenuHostHandle>(null);

  // New Folder Modal Rename Mode
  const [folderModalMode, setFolderModalMode] = useState<'create' | 'rename'>('create');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

  // AI Result State
  const [aiResult, setAiResult] = useState({
    isOpen: false,
    title: '',
    content: '',
  });
  const [editClip, setEditClip] = useState<{
    isOpen: boolean;
    clipId: string;
    content: string;
    clipType: string;
  }>({
    isOpen: false,
    clipId: '',
    content: '',
    clipType: 'text',
  });
  const [moveToFolderClipId, setMoveToFolderClipId] = useState<string | null>(null);

  const toggleViewMode = useCallback(async () => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;

    // Fade out current UI before the window morph
    setViewModeFading(true);
    await new Promise<void>((r) => setTimeout(r, 90));

    try {
      await invoke('toggle_view_mode');
      // Morph done + settings emitted — wait two frames for React to paint the new view
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      setViewModeFading(false);
    } catch (e) {
      console.error('Failed to toggle view mode:', e);
      setViewModeFading(false);
    } finally {
      setTimeout(() => {
        isTogglingRef.current = false;
      }, 800);
    }
  }, []);

  const handleResetSize = useCallback(async () => {
    if (!settings) return;
    isTogglingRef.current = true;
    try {
      await invoke('reset_window_size');

      const isFull = settings.view_mode === 'full';
      const updatedSettings = {
        ...settings,
        window_width: isFull ? 0 : LAYOUT.COMPACT_WIDTH,
        window_height: isFull ? LAYOUT.FULL_HEIGHT : LAYOUT.COMPACT_HEIGHT,
      };
      setSettings(updatedSettings);
    } catch (e) {
      console.error('Failed to reset size:', e);
    } finally {
      setTimeout(() => {
        isTogglingRef.current = false;
      }, 2500);
    }
  }, [settings]);

  const handleOpenPreview = useCallback((id: string) => {
    const found = clipsRef.current.find((c) => c.id === id);
    setPreviewClip(found || null);
  }, []);

  const handleClosePreview = useCallback(() => setPreviewClip(null), []);

  const handleEditFromPreview = useCallback((clipId: string) => {
    invoke<AppClipboardItem>('get_clip', { clipId })
      .then((fullClip) => {
        setEditClip({
          isOpen: true,
          clipId: (fullClip as any).id || (fullClip as any).uuid,
          content: (fullClip as any).content,
          clipType: (fullClip as any).clip_type,
        });
      })
      .catch((err) => {
        console.error('Failed to fetch clip content:', err);
      });
  }, []);

  // Shift+Enter opens the full preview for the currently selected card
  const handlePreviewSelected = useCallback(() => {
    if (selectedClipId) handleOpenPreview(selectedClipId);
  }, [selectedClipId, handleOpenPreview]);

  const handleAiAction = useCallback(
    async (clipId: string, action: string, title: string) => {
      try {
        const toastId = toast.loading(t('ai.processing'));
        const result = await invoke<string>('ai_process_clip', { clipId, action });
        toast.dismiss(toastId);
        setAiResult({
          isOpen: true,
          title,
          content: result,
        });
      } catch (error) {
        toast.dismiss();
        console.error('AI Processing Failed:', error);
        const errorMessage = String(error);
        const detail = /AI API Key is missing in settings/i.test(errorMessage)
          ? t('ai.apiKeyMissing')
          : errorMessage;
        toast.error(t('ai.error', { error: detail }));
      }
    },
    [t]
  );

  useEffect(() => {
    const unlisten = listen<{
      clipId: string;
      action: string;
      title: string;
    }>('ai-action-from-toast', (event) => {
      invoke('show_window').catch(console.error);
      handleAiAction(event.payload.clipId, event.payload.action, event.payload.title);
    });

    return () => {
      unlisten.then((cleanup) => cleanup());
    };
  }, []);

  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      if (!folderId) return;
      try {
        await invoke('delete_folder', { id: folderId });
        setSelectedFolder((prev) => (prev === folderId ? null : prev));
        await loadFolders();
        refreshTotalCount();
        toast.success(t('folders.folderDeleted'));
      } catch (error) {
        console.error('Failed to delete folder:', error);
        toast.error(t('notifications.folderDeleteFailed'));
      }
    },
    [t, loadFolders, refreshTotalCount]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, type: 'card' | 'folder', itemId: string) => {
      e.preventDefault();
      e.stopPropagation();
      // Abort pending/active drag so the grabbing cursor doesn't flash on right-click
      if (dragStateRef.current.pendingDrag || dragStateRef.current.isDragging) {
        finishDrag(true);
      } else {
        document.body.classList.remove('is-dragging');
        dragStateRef.current.pendingDrag = null;
      }

      const settings = settingsRef.current;
      const aiLabel = (custom: string | undefined, englishDefault: string, key: string) =>
        custom && custom.trim() && custom.trim() !== englishDefault ? custom.trim() : t(key);

      let options: ContextMenuOption[] = [];

      if (type === 'card') {
        const clip = clipsRef.current.find((c) => c.id === itemId);
        const opts: ContextMenuOption[] = [];

        // Universal preview — replaces the old image-only "View Image" flow
        if (clip?.clip_type === 'image') {
          opts.push({
            label: t('contextMenu.view'),
            icon: <Eye size={14} />,
            onClick: () => handleOpenPreview(itemId),
          });

          opts.push({
            label: t('contextMenu.openFullViewer'),
            icon: <Maximize2 size={14} />,
            onClick: () => {
              if (settings?.show_action_messages) {
                toast.info(t('toasts.openingViewer'));
              }
              invoke('open_image_viewer', { clipId: clip.id }).catch(console.error);
            },
          });

          opts.push({
            label: t('contextMenu.extractText'),
            icon: <ScanText size={14} />,
            onClick: async () => {
              const loadingToast = toast.loading(t('viewer.extractingText'));
              try {
                const text = await invoke<string>('run_ocr_for_clip', { clipId: clip.id });
                toast.dismiss(loadingToast);
                if (text && text.trim().length > 0) {
                  setOcrModal({
                    isOpen: true,
                    content: text,
                    clipId: clip.id,
                  });
                } else {
                  toast.info(t('viewer.noTextDetected'));
                }
              } catch (err) {
                toast.dismiss(loadingToast);
                toast.error(t('toasts.ocrError', { error: err }));
              }
            },
          });

          opts.push({
            label: t('contextMenu.openExternalViewer'),
            icon: <ExternalLink size={14} />,
            onClick: () => {
              if (!clip) return;
              invoke('open_with', {
                appPath: settings?.image_editor_path || '',
                filePath: clip.image_path || clip.content,
              })
                .then(() => {
                  invoke('hide_window');
                  toast.success(t('toasts.externalViewerLaunched'));
                })
                .catch((err) => toast.error(t('toasts.viewerOpenFailed', { error: err })));
            },
          });
        } else {
          opts.push({
            label: clip
              ? t('contextMenu.editType', {
                  type: t(`clipType.${clip.clip_type}`, { defaultValue: t('clipType.text') }),
                })
              : t('contextMenu.edit'),
            icon: <Pencil size={14} />,
            onClick: () => {
              if (!clip) return;
              invoke<AppClipboardItem>('get_clip', { clipId: clip.id })
                .then((fullClip) => {
                  setEditClip({
                    isOpen: true,
                    clipId: (fullClip as any).id || (fullClip as any).uuid,
                    content: (fullClip as any).content,
                    clipType: (fullClip as any).clip_type,
                  });
                })
                .catch((err) => {
                  console.error('Failed to fetch clip content:', err);
                  setEditClip({
                    isOpen: true,
                    clipId: clip.id,
                    content: clip.content || clip.preview,
                    clipType: clip.clip_type,
                  });
                });
            },
          });
        }

        opts.push({
          label: t('contextMenu.copy'),
          icon: <Copy size={14} />,
          onClick: () => handlePaste(itemId),
        });

        // Copy as plain text — only meaningful for formatted types
        if (clip && clip.clip_type !== 'image' && clip.clip_type !== 'file') {
          opts.push({
            label: t('contextMenu.copyPlainText'),
            icon: <ClipboardCopy size={14} />,
            onClick: async () => {
              try {
                await invoke('copy_clip_text', { clipId: itemId });
                toast.success(t('common.copied'));
              } catch (err) {
                console.error('Failed to copy plain text:', err);
                toast.error(t('notifications.copyFailed'));
              }
            },
          });
        }

        const pinLatestDisabled =
          isLiveMainListClip(itemId, clipsRef.current, selectedFolderRef.current) &&
          !clip?.is_pinned;
        opts.push({
          label: pinLatestDisabled
            ? t('contextMenu.pinLatestDisabled')
            : clip?.is_pinned
              ? t('contextMenu.unpin')
              : t('contextMenu.pin'),
          icon: clip?.is_pinned ? <PinOff size={14} /> : <Pin size={14} />,
          disabled: pinLatestDisabled,
          onClick: () => handleToggleClipPin(itemId),
        });

        opts.push({
          label: t('contextMenu.copyToFolder') || t('contextMenu.moveToFolder'),
          icon: <FolderInput size={14} />,
          onClick: () => setMoveToFolderClipId(itemId),
        });

        if (settings?.view_mode !== 'compact') {
          opts.push({
            label: detailPanelOpen ? t('detailPanel.collapse') : t('detailPanel.expand'),
            icon: detailPanelOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />,
            onClick: () => setDetailPanelOpen((prev) => !prev),
          });
        }

        // AI actions — only meaningful for textual clips
        if (clip && clip.clip_type !== 'image' && clip.clip_type !== 'file') {
          opts.push({
            label: t('contextMenu.aiActions'),
            icon: <Sparkles size={14} />,
            subMenu: [
              {
                label: aiLabel(settings?.ai_title_summarize, 'Summarize', 'contextMenu.summarize'),
                icon: <AlignLeft size={14} />,
                onClick: () => handleAiAction(itemId, 'summarize', t('ai.summary')),
              },
              {
                label: aiLabel(settings?.ai_title_translate, 'Translate', 'contextMenu.translate'),
                icon: <Languages size={14} />,
                onClick: () => handleAiAction(itemId, 'translate', t('ai.translation')),
              },
              {
                label: aiLabel(
                  settings?.ai_title_explain_code,
                  'Explain Code',
                  'contextMenu.explainCode'
                ),
                icon: <Code2 size={14} />,
                onClick: () => handleAiAction(itemId, 'explain_code', t('ai.codeExplanation')),
              },
              {
                label: aiLabel(
                  settings?.ai_title_fix_grammar,
                  'Fix Grammar',
                  'contextMenu.fixGrammar'
                ),
                icon: <CheckSquare size={14} />,
                onClick: () => handleAiAction(itemId, 'fix_grammar', t('ai.grammarCheck')),
              },
            ],
          });
        }

        opts.push({
          label: t('contextMenu.delete'),
          icon: <Trash2 size={14} />,
          danger: true,
          onClick: () => handleDelete(itemId),
        });

        options = opts;
      } else {
        options = [
          {
            label: t('common.edit'),
            icon: <Pencil size={14} />,
            onClick: () => {
              setFolderModalMode('rename');
              setEditingFolderId(itemId);
              const folder = foldersRef.current.find((f) => f.id === itemId);
              setNewFolderName(folder ? folder.name : '');
              setShowAddFolderModal(true);
            },
          },
          {
            label: t('contextMenu.delete'),
            icon: <Trash2 size={14} />,
            danger: true,
            onClick: () => handleDeleteFolder(itemId),
          },
        ];
      }

      // Isolated host update — does not re-render App / Compact clip list
      contextMenuRef.current?.open({
        x: e.clientX,
        y: e.clientY,
        options,
        highlightId: itemId,
      });
    },
    [
      t,
      handleOpenPreview,
      handleAiAction,
      handlePaste,
      handleToggleClipPin,
      handleDelete,
      handleDeleteFolder,
      detailPanelOpen,
    ]
  );

  const handleOpenSelectedContextMenu = useCallback(() => {
    if (!selectedClipId) return;

    const selectedElement = document.querySelector<HTMLElement>(
      `[data-clip-id="${selectedClipId}"]`
    );
    const rect = selectedElement?.getBoundingClientRect();
    const syntheticEvent = {
      clientX: rect ? rect.right - 8 : window.innerWidth - 16,
      clientY: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
      preventDefault: () => {},
      stopPropagation: () => {},
    } as ReactMouseEvent;

    handleContextMenu(syntheticEvent, 'card', selectedClipId);
  }, [handleContextMenu, selectedClipId]);

  // Updated Create Folder to handle Rename
  const handleCreateOrRenameFolder = async (name: string, icon?: string, color?: string) => {
    if (folderModalMode === 'create') {
      try {
        await handleCreateFolder(name, icon, color);
        toast.success(t('folders.folderCreated', { name }));
        setShowAddFolderModal(false);
        setNewFolderName('');
      } catch (error) {
        toast.error(t('notifications.folderCreateFailed'));
      }
    } else if (folderModalMode === 'rename' && editingFolderId) {
      try {
        await invoke('rename_folder', { id: editingFolderId, name, icon, color });
        await loadFolders();
        toast.success(t('folders.folderRenamed', { name }));
        setShowAddFolderModal(false);
        setNewFolderName('');
      } catch (error) {
        console.error('Failed to rename folder:', error);
        toast.error(t('notifications.folderRenameFailed'));
      }
    }
  };

  const handleUpdateClipContent = async (clipId: string, newContent: string) => {
    try {
      await invoke('update_clip_content', { clipId, newContent });
      setEditClip((prev) => ({ ...prev, isOpen: false }));
      // Refresh clips in place to preserve scroll position and selection
      refreshCurrentFolder();
      refreshTotalCount();
      toast.success(t('toasts.clipContentUpdated'));
    } catch (e) {
      console.error('Failed to update clip content:', e);
      toast.error(t('toasts.clipUpdateFailed'));
    }
  };

  const handleMoveToFolder = useCallback(
    async (clipId: string, folderId: string | null) => {
      try {
        await invoke('copy_to_folder', { clipId, folderId });
        triggerFolderFlash(folderId);
        await loadClips(selectedFolderRef.current);
        await loadFolders();
        refreshTotalCount();
        toast.success(folderId ? t('toasts.copiedToFolder') : t('toasts.copiedToMainClipboard'));
      } catch (e) {
        console.error('Failed to copy clip to folder:', e);
        const errMsg = typeof e === 'string' ? e : t('toasts.clipCopyFailed');
        if (
          typeof e === 'string' &&
          (e.toLowerCase().includes('existe') || e.toLowerCase().includes('exist'))
        ) {
          toast.duplicate(errMsg);
        } else {
          toast.error(errMsg);
        }
      }
    },
    [loadClips, loadFolders, refreshTotalCount, t]
  );

  const handleTogglePin = async () => {
    if (!settings) return;
    const newPinned = !settings.pinned;
    try {
      const newSettings = { ...settings, pinned: newPinned };
      await invoke('save_settings', { settings: newSettings });
      setSettings(newSettings);
      toast.success(newPinned ? t('toasts.windowPinned') : t('toasts.windowUnpinned'));
    } catch (e) {
      console.error('Failed to toggle pin:', e);
    }
  };

  useKeyboard({
    onClose: () => {
      appWindow.hide().catch((err) => {
        console.error('hide() failed, trying close():', err);
        appWindow.close().catch(() => {});
      });
    },
    onSearch: () => {
      if (settings?.view_mode === 'compact') {
        setSearchFocusToken((prev) => prev + 1);
      } else {
        setShowSearch(true);
      }
    },
    onDelete: () => handleDelete(selectedClipId),
    onPin: () => handleToggleClipPin(selectedClipId),
    onNavigatePrev: handleNavigatePrev,
    onNavigateNext: handleNavigateNext,
    onNavigateFirst: handleNavigateFirst,
    onNavigateLast: handleNavigateLast,
    onNavigatePageUp: handleNavigatePageUp,
    onNavigatePageDown: handleNavigatePageDown,
    // Full mode: plain Left/Right moves between cards, Ctrl+Left/Right switches folders.
    // Compact mode: plain Left/Right switches folders (useKeyboard falls back when
    // onNavigateLeft/Right are undefined). Ctrl+Left/Right stays consistent in both modes.
    onNavigateLeft: settings?.view_mode === 'full' ? handleCardPrev : undefined,
    onNavigateRight: settings?.view_mode === 'full' ? handleCardNext : undefined,
    onFolderPrev: handleFolderPrev,
    onFolderNext: handleFolderNext,
    onPaste: handlePasteSelected,
    onCopyPlainText: handleCopyPlainTextSelected,
    onPreviewSelected: handlePreviewSelected,
    onToggleDetailPanel: handleToggleDetailPanel,
    onOpenContextMenu: handleOpenSelectedContextMenu,
    onSelectAll: handleSelectAllClips,
    onPasteByIndex: handlePasteByIndex,
    onClearSearch: () => handleSearch(''),
    onToggleMode: toggleViewMode,
    toggleModeHotkey: settings?.view_mode_hotkey,
    onStartTypingSearch: handleStartTypingSearch,
  });

  return (
    <div
      data-el="app-root"
      className={`relative h-dvh w-full overflow-hidden ${!isWindowActive ? 'pause-all-animations' : ''}`}
      style={{ border: '1px solid rgba(34, 211, 238, 0.25)' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Content Container */}
      <div
        data-el="app-window"
        className={`relative h-full w-full overflow-hidden ${settings?.theme === 'dark' ? '' : 'bg-background/95'}`}
      >
        {/* View layer fades during compact ↔ full morph (keeps window chrome opaque) */}
        <div
          className="h-full w-full"
          style={{
            opacity: viewModeFading ? 0 : 1,
            transform: viewModeFading ? 'scale(0.985) translateY(2px)' : 'scale(1) translateY(0)',
            transition: viewModeFading
              ? 'opacity 90ms cubic-bezier(0.4, 0, 1, 1), transform 90ms cubic-bezier(0.4, 0, 1, 1)'
              : 'opacity 160ms cubic-bezier(0.16, 1, 0.3, 1), transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'opacity, transform',
            pointerEvents: viewModeFading ? 'none' : undefined,
          }}
        >
          {settings?.view_mode === 'compact' ? (
            <CompactView
              isWindowActive={isWindowActive}
              clips={clips}
              folders={folders}
              wheelFolderNavigation={settings?.wheel_folder_navigation ?? false}
              selectedFolder={selectedFolder}
              selectedClipId={selectedClipId}
              onSelectFolder={handleSelectFolder}
              searchQuery={searchQuery}
              onSearchChange={handleSearch}
              onPaste={handlePaste}
              onDelete={handleDelete}
              onToggleMode={toggleViewMode}
              isMaximized={isMaximized}
              onToggleMaximize={handleToggleMaximize}
              onOpenSettings={openSettings}
              isLoading={isLoading}
              theme={effectiveTheme}
              isPinned={settings?.pinned}
              onTogglePin={handleTogglePin}
              compactPeekEnabled={settings?.compact_peek_enabled ?? true}
              compactShowSourceIcon={settings?.compact_show_source_icon ?? true}
              compactShowTime={settings?.compact_show_time ?? true}
              compactShowTypeIcon={settings?.compact_show_type_icon ?? true}
              compactShowNumber={settings?.compact_show_number ?? true}
              compactShowScrollbar={settings?.compact_show_scrollbar ?? true}
              totalClipCount={totalClipCount}
              onFolderContextMenu={(e, folderId) => {
                if (folderId) handleContextMenu(e, 'folder', folderId);
              }}
              onContextMenu={(e, clipId) => {
                if (clipId) handleContextMenu(e, 'card', clipId);
              }}
              onDragStart={startDrag}
              onDragHover={handleDragHover}
              onDragLeave={handleDragLeave}
              isDragging={!!draggingClipId}
              draggingClipId={draggingClipId}
              dragTargetFolderId={dragTargetFolderId}
              reorderTargetClipId={reorderTargetClipId}
              reorderTargetPosition={reorderTargetPosition}
              reorderEnabled={true}
              compactFolderLayout={settings?.compact_folder_layout || 'vertical'}
              compactSidebarCollapsed={settings?.compact_sidebar_collapsed ?? false}
              onToggleSidebar={async () => {
                if (!settings) return;
                const newCollapsed = !settings.compact_sidebar_collapsed;
                const newSettings = { ...settings, compact_sidebar_collapsed: newCollapsed };
                await invoke('save_settings', { settings: newSettings });
                setSettings(newSettings);
              }}
              onToggleLayout={async () => {
                if (!settings) return;
                const newLayout: 'horizontal' | 'vertical' =
                  settings.compact_folder_layout === 'vertical' ? 'horizontal' : 'vertical';
                const newSettings = { ...settings, compact_folder_layout: newLayout };
                await invoke('save_settings', { settings: newSettings });
                setSettings(newSettings);
              }}
              onAddFolder={() => {
                setShowAddFolderModal(true);
              }}
              onLoadMore={loadMore}
              onReorderFolder={handleReorderFolder}
              typeFilter={compactTypeFilter}
              onTypeFilterChange={async (v) => {
                setCompactTypeFilter(v);
                if (settings) {
                  const newSettings = { ...settings, compact_type_filter: v };
                  await invoke('save_settings', { settings: newSettings });
                  setSettings(newSettings);
                }
              }}
              searchFocusToken={searchFocusToken}
              clipNumbering={settings?.clip_numbering || 'positional'}
              rowHeight={settings?.compact_row_height ?? 44}
              selectedClipIds={selectedClipIds}
              onToggleClipSelect={handleToggleClipSelect}
              onClearSelection={handleClearBulkSelection}
              onBulkCopy={handleBulkCopy}
              onBulkDelete={handleBulkDelete}
              onBulkMove={handleBulkMove}
              onPinClip={handleToggleClipPin}
            />
          ) : (
            <div
              data-el="app-frame"
              className="flex h-full w-full flex-col font-sans text-foreground"
            >
              <ControlBar
                isWindowActive={isWindowActive}
                style={{ height: LAYOUT.CONTROL_BAR_HEIGHT, flexShrink: 0 }}
                folders={folders}
                wheelFolderNavigation={settings?.wheel_folder_navigation ?? false}
                selectedFolder={selectedFolder}
                onSelectFolder={handleSelectFolder}
                showSearch={showSearch}
                searchQuery={searchQuery}
                onSearchChange={handleSearch}
                onSearchClick={() => {
                  if (showSearch) {
                    handleSearch(''); // Clear search when closing
                  }
                  setShowSearch(!showSearch);
                }}
                onAddClick={() => {
                  setFolderModalMode('create');
                  setNewFolderName('');
                  setShowAddFolderModal(true);
                }}
                onMoreClick={openSettings}
                onMoveClip={handleMoveClip} // Legacy, but kept for interface
                // Simulated Drag Props
                isDragging={!!draggingClipId}
                dragTargetFolderId={dragTargetFolderId}
                onDragHover={handleDragHover}
                onDragLeave={handleDragLeave}
                totalClipCount={totalClipCount}
                onFolderContextMenu={(e, folderId) => {
                  if (folderId) handleContextMenu(e, 'folder', folderId);
                }}
                theme={effectiveTheme}
                // Add toggle button to ControlBar
                onToggleMode={toggleViewMode}
                viewMode={settings?.view_mode || 'compact'}
                isMaximized={isMaximized}
                onToggleMaximize={handleToggleMaximize}
                isPinned={settings?.pinned ?? false}
                onTogglePin={handleTogglePin}
                onResetSize={handleResetSize}
                hotkey={settings?.hotkey}
                dbSizeBytes={dbSizeBytes}
                onReorderFolder={handleReorderFolder}
                showHud={settings?.full_show_hud ?? true}
              />

              {/* Type filter chips (Full mode) */}
              <TypeFilterChipRow
                value={fullTypeFilter}
                onChange={(value) => {
                  setFullTypeFilter(value);
                  setSettings((prev) => {
                    if (!prev) return prev;
                    const next = { ...prev, full_type_filter: value };
                    invoke('save_settings', { settings: next }).catch(console.error);
                    return next;
                  });
                }}
                counts={typeFilterCounts}
                gridScale={settings?.full_grid_scale ?? 1}
                onGridScaleChange={handleGridScaleChange}
                detailPanelOpen={detailPanelOpen}
                onToggleDetailPanel={() => setDetailPanelOpen((prev) => !prev)}
              />

              <main
                data-el="clip-list-area"
                className="no-scrollbar relative flex-1 overflow-hidden"
              >
                <ClipList
                  clips={clips}
                  isLoading={isLoading}
                  hasMore={hasMore}
                  resetToken={clipListResetToken}
                  selectedClipId={selectedClipId}
                  onPaste={handlePaste}
                  onLoadMore={loadMore}
                  onDragStart={startDrag}
                  onCardContextMenu={(e, clipId) => handleContextMenu(e, 'card', clipId)}
                  scrollDirection="vertical"
                  reorderTargetClipId={reorderTargetClipId}
                  reorderTargetPosition={reorderTargetPosition}
                  reorderEnabled={true}
                  draggingClipId={draggingClipId}
                  clipNumbering={settings?.clip_numbering || 'positional'}
                  gridScale={settings?.full_grid_scale ?? 1}
                  gridColumns={settings?.full_grid_columns ?? 0}
                  showSourceIcon={settings?.full_show_source_icon ?? true}
                  showTime={settings?.full_show_time ?? true}
                  showTypeIcon={settings?.full_show_type_icon ?? true}
                  showNumber={settings?.full_show_number ?? true}
                  showScrollbar={settings?.full_show_scrollbar ?? true}
                  actionTooltip={fullActionTooltip}
                  onRequestPreview={handleOpenPreview}
                  bulkSelectedIds={selectedClipIds}
                  onClipClick={handleClipClick}
                  onToggleBulkSelect={handleClipToggleSelect}
                  onRequestOcr={handleOcrRequest}
                  onColumnsChange={setGridColumns}
                />
                <BulkActionBar
                  count={selectedClipIds.size}
                  folders={folders}
                  onDelete={handleBulkDelete}
                  onMoveToFolder={handleBulkMove}
                  onClear={handleClearBulkSelection}
                />
                {/* Zoom indicator + keyframes injected once */}
                {zoomIndicator && (
                  <>
                    <style>{`
                      @keyframes zoom-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                      @keyframes zoom-fade-out { from { opacity: 1; } to { opacity: 0; transform: translateY(-4px); } }
                    `}</style>
                    <div
                      className="pointer-events-none absolute bottom-4 left-4 z-40 rounded-md border border-cyan-500/30 bg-black/85 px-2.5 py-1 font-mono text-xs font-bold text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                      style={{
                        animation:
                          'zoom-fade-in 120ms ease-out, zoom-fade-out 300ms ease-in 900ms forwards',
                      }}
                    >
                      {zoomIndicator}
                    </div>
                  </>
                )}
                {detailPanelOpen && (
                  <ClipDetailPanel
                    clip={clips.find((c) => c.id === selectedClipId) || null}
                    folders={folders}
                    pinDisabled={
                      isLiveMainListClip(selectedClipId, clips, selectedFolder) &&
                      !clips.find((c) => c.id === selectedClipId)?.is_pinned
                    }
                    onClose={() => setDetailPanelOpen(false)}
                    onCopy={handleCopy}
                    onPin={handleToggleClipPin}
                    onDelete={handleDelete}
                    onPreview={handleOpenPreview}
                  />
                )}
              </main>
            </div>
          )}
        </div>

        <ContextMenuHost ref={contextMenuRef} />

        {/* Add/Rename Folder Modal Overlay */}
        <FolderModal
          isOpen={showAddFolderModal}
          mode={folderModalMode}
          initialName={newFolderName}
          initialIcon={
            editingFolderId
              ? folders.find((f) => f.id === editingFolderId)?.icon || undefined
              : undefined
          }
          initialColor={
            editingFolderId
              ? folders.find((f) => f.id === editingFolderId)?.color || undefined
              : undefined
          }
          onClose={() => {
            setShowAddFolderModal(false);
            setNewFolderName('');
            setEditingFolderId(null);
          }}
          onSave={handleCreateOrRenameFolder}
        />

        <AiResultDialog
          isOpen={aiResult.isOpen}
          title={aiResult.title}
          content={aiResult.content}
          onClose={() => setAiResult((prev) => ({ ...prev, isOpen: false }))}
        />

        <EditClipModal
          isOpen={editClip.isOpen}
          content={editClip.content}
          clipType={editClip.clipType}
          onClose={() => setEditClip((prev) => ({ ...prev, isOpen: false }))}
          onSave={(newContent) => handleUpdateClipContent(editClip.clipId, newContent)}
        />

        <ClipPreviewModal
          isOpen={!!previewClip}
          clip={previewClip}
          onClose={handleClosePreview}
          onCopy={handleCopy}
          onEdit={handleEditFromPreview}
        />

        <OcrResultModal
          isOpen={ocrModal.isOpen}
          content={ocrModal.content}
          onClose={() => setOcrModal((prev) => ({ ...prev, isOpen: false }))}
          onSave={async (newText) => {
            try {
              await invoke('update_ocr_text', {
                clipId: ocrModal.clipId,
                newText,
              });
              setOcrModal((prev) => ({ ...prev, isOpen: false }));
              refreshCurrentFolder();
              refreshTotalCount();
              toast.success(t('toasts.ocrTextUpdated'));
            } catch (err) {
              console.error('Failed to update OCR text:', err);
              toast.error(t('toasts.ocrTextUpdateFailed'));
            }
          }}
        />

        <MoveToFolderModal
          isOpen={!!moveToFolderClipId}
          folders={folders}
          onClose={() => setMoveToFolderClipId(null)}
          onSelect={(folderId) => {
            if (moveToFolderClipId) handleMoveToFolder(moveToFolderClipId, folderId);
          }}
        />

        <UpdateModal
          isOpen={showUpdateModal}
          update={updateAvailable}
          onClose={() => setShowUpdateModal(false)}
        />

        <div
          ref={dragIndicatorRef}
          className="pointer-events-none fixed left-0 top-0 z-[9999] flex hidden h-7 w-7 items-center justify-center rounded-full border border-cyan-500/30 bg-black/85 shadow-[0_0_12px_rgba(34,211,238,0.5)] backdrop-blur-md"
          style={{
            transform:
              'translate3d(calc(var(--mouse-x, 0px) + 16px), calc(var(--mouse-y, 0px) + 16px), 0)',
            willChange: 'transform',
          }}
        >
          <ImageIcon data-drag-icon="image" size={13} className="hidden text-cyan-400" />
          <Code data-drag-icon="code" size={13} className="hidden text-cyan-400" />
          <Code data-drag-icon="html" size={13} className="hidden text-cyan-400" />
          <Code data-drag-icon="rtf" size={13} className="hidden text-cyan-400" />
          <Link data-drag-icon="url" size={13} className="hidden text-cyan-400" />
          <LucideFile data-drag-icon="file" size={13} className="hidden text-cyan-400" />
          <FileText data-drag-icon="text" size={13} className="hidden text-cyan-400" />
        </div>
      </div>
    </div>
  );
}

export default App;
