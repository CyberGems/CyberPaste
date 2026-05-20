import { useEffect, useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { EditClipModal } from './components/EditClipModal';
import { MoveToFolderModal } from './components/MoveToFolderModal';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { ClipboardItem as AppClipboardItem, FolderItem, Settings } from './types';
import { ClipList } from './components/ClipList';
import { ControlBar } from './components/ControlBar';
import { CompactView } from './components/CompactView';
import { ContextMenu } from './components/ContextMenu';
import { FolderModal } from './components/FolderModal';
import { AiResultDialog } from './components/AiResultDialog';
import { useKeyboard } from './hooks/useKeyboard';
import { useTheme } from './hooks/useTheme';
import { useLanguage } from './hooks/useLanguage';
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
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [clipListResetToken, setClipListResetToken] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [theme, setTheme] = useState('system');
  const [settings, setSettings] = useState<Settings | null>(null);
  const settingsRef = useRef<Settings | null>(null);
  const isTogglingRef = useRef(false);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // DB size for HUD status strip
  const [dbSizeBytes, setDbSizeBytes] = useState(0);
  useEffect(() => {
    const fetchSize = () =>
      invoke<number>('get_db_size')
        .then(setDbSizeBytes)
        .catch(() => {});
    fetchSize();
    const timer = setInterval(fetchSize, 30000); // refresh every 30s
    return () => clearInterval(timer);
  }, []);

  // Simulated Drag State
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [dragTargetFolderId, setDragTargetFolderId] = useState<string | null>(null);

  // Reorder state
  const [reorderTargetClipId, setReorderTargetClipId] = useState<string | null>(null);
  const [reorderTargetPosition, setReorderTargetPosition] = useState<'before' | 'after' | null>(
    null
  );

  // Add Folder Modal State
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Using refs for event handlers to access latest state without re-attaching listeners
  const dragStateRef = useRef({
    isDragging: false,
    clipId: null as string | null,
    targetFolderId: undefined as string | null | undefined,
    pendingDrag: null as { clipId: string; startX: number; startY: number } | null,
    reorderTargetClipId: null as string | null,
    reorderTargetPosition: null as 'before' | 'after' | null,
  });

  const dragIndicatorRef = useRef<HTMLDivElement>(null);
  const lastReorderCheckRef = useRef<number>(0);
  const wasDraggingRef = useRef<boolean>(false);

  const effectiveTheme = useTheme(theme);
  useLanguage(settings?.language);
  const { t } = useTranslation();

  const appWindow = getCurrentWindow();
  const selectedFolderRef = useRef(selectedFolder);
  selectedFolderRef.current = selectedFolder;
  const loadPerfIdRef = useRef(0);
  const perfLogEnabled =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    console.log('App: Initializing...');

    // Safety timeout for loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    invoke<Settings>('get_settings')
      .then((s) => {
        setTheme(s.theme);
        setSettings(s);
        clearTimeout(timer);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to get settings:', err);
        setIsLoading(false);
      });

    // Listen for setting changes from the settings window
    const unlisten = listen<Settings>('settings-changed', (event) => {
      setTheme(event.payload.theme);
      setSettings(event.payload);
    });

    // Listen for open-settings from tray
    const unlistenOpenSettings = listen('open-settings', () => {
      openSettings();
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

    const unlistenResize = appWindow.onResized(() => persistWindow());

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
      unlistenReset.then((f) => f());
      unlistenResize.then((f) => f());
      unlistenDemo.then((fs) => fs.forEach((f) => f()));
    };
  }, []);

  const openSettings = useCallback(async () => {
    // Hide main window (with animation)
    try {
      await invoke('hide_window');
    } catch (e) {
      console.error('Failed to hide main window:', e);
    }

    // Check if settings window already exists
    const existingWin = await WebviewWindow.getByLabel('settings');
    if (existingWin) {
      try {
        await invoke('focus_window', { label: 'settings' });
      } catch (e) {
        console.error('Failed to focus settings window:', e);
        // Fallback to JS API if command fails (though command is preferred)
        await existingWin.unminimize();
        await existingWin.show();
        await existingWin.setFocus();
      }
      return;
    }

    const settingsWin = new WebviewWindow('settings', {
      url: 'index.html?window=settings',
      title: 'Settings',
      width: 800,
      height: 700,
      resizable: true,
      maximizable: true,
      decorations: false, // We have our own title bar in SettingsPanel
      transparent: false,
      center: true,
    });

    settingsWin.once('tauri://created', function () {});

    settingsWin.once('tauri://error', function (e) {
      console.error('Error creating settings window', e);
    });
  }, []);

  const loadClips = useCallback(
    async (
      folderId: string | null,
      append: boolean = false,
      searchQuery: string = '',
      limit: number = 20
    ) => {
      const perfId = ++loadPerfIdRef.current;
      const loadStart = perfLogEnabled ? performance.now() : 0;
      let invokeStart = 0;
      let invokeEnd = 0;

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
          });
          if (perfLogEnabled) invokeEnd = performance.now();
        } else {
          if (perfLogEnabled) invokeStart = performance.now();
          data = await invoke<AppClipboardItem[]>('get_clips', {
            filterId: folderId,
            limit,
            offset: currentOffset,
            previewOnly: true,
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
          // Always select the first (latest) clip on fresh load
          if (data.length > 0) {
            setSelectedClipId(data[0].id);
          }
        }

        // If we got fewer than limit, no more clips
        setHasMore(data.length === 20);

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
    loadClips(selectedFolderRef.current, false, searchQuery, clipLimit);
  }, [loadClips, searchQuery]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSelectFolder = useCallback((folderId: string | null) => {
    // Reset view-level selection state whenever user switches/re-clicks folders.
    setSelectedClipId(null);
    setClipListResetToken((prev) => prev + 1);
    setSelectedFolder(folderId);
  }, []);

  useEffect(() => {
    loadFolders();
    // Load all clips for compact view, paginate for full view
    const clipLimit = settings?.view_mode === 'compact' ? 9999 : 20;
    if (searchQuery.trim()) {
      loadClips(selectedFolder, false, searchQuery, clipLimit);
    } else {
      loadClips(selectedFolder, false, '', clipLimit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolder, searchQuery, clipListResetToken, settings?.view_mode]);

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

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;

      // SAFETY: If no buttons are pressed but we think we are dragging/pending, we missed a mouseup
      if (e.buttons === 0 && (state.isDragging || state.pendingDrag)) {
        finishDrag();
        return;
      }

      // If we are already dragging, update position and detect reorder target
      if (state.isDragging) {
        updateDragIndicatorPosition(e.clientX, e.clientY);

        // Detect reorder target using clips state for reliable lookup
        if (selectedFolderRef.current && clipsRef.current.length > 0) {
          const now = Date.now();
          if (now - lastReorderCheckRef.current > 50) {
            lastReorderCheckRef.current = now;

            let closestId: string | null = null;
            let closestDist = Infinity;
            let closestRect: DOMRect | null = null;

            const cards = document.querySelectorAll('[data-clip-id]');
            for (let i = 0; i < cards.length; i++) {
              const card = cards[i] as HTMLElement;
              const clipId = card.getAttribute('data-clip-id');
              if (!clipId || clipId === state.clipId) continue;

              const rect = card.getBoundingClientRect();
              const cardCenterY = rect.top + rect.height / 2;
              const dist = Math.abs(e.clientY - cardCenterY);
              if (dist < closestDist) {
                closestDist = dist;
                closestId = clipId;
                closestRect = rect;
              }
            }

            if (closestId && closestDist < 300 && closestRect) {
              const midY = closestRect.top + closestRect.height / 2;
              const position = e.clientY < midY ? 'before' : 'after';
              if (
                dragStateRef.current.reorderTargetClipId !== closestId ||
                dragStateRef.current.reorderTargetPosition !== position
              ) {
                setReorderTargetClipId(closestId);
                setReorderTargetPosition(position);
                dragStateRef.current.reorderTargetClipId = closestId;
                dragStateRef.current.reorderTargetPosition = position;
              }
            }
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
            const matchingIcon = dragIndicatorRef.current.querySelector(`[data-drag-icon="${clipType}"]`);
            if (matchingIcon) {
              matchingIcon.classList.remove('hidden');
            } else {
              dragIndicatorRef.current.querySelector('[data-drag-icon="text"]')?.classList.remove('hidden');
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
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
    };
  }, []);

  const startDrag = (clipId: string, startX: number, startY: number) => {
    // Instead of starting immediately, set pending
    dragStateRef.current.pendingDrag = { clipId, startX, startY };
    dragStateRef.current.clipId = clipId;
    // We don't set state yet, avoiding re-render until threshold passed
    document.body.classList.add('is-dragging');
  };

  const finishDrag = async (isCancelled = false) => {
    const { clipId, targetFolderId, reorderTargetClipId, reorderTargetPosition } =
      dragStateRef.current;

    // Save reorder targets before clearing state
    const reorderClipId = reorderTargetClipId;
    const reorderPos = reorderTargetPosition;

    // Clear all state immediately
    setDraggingClipId(null);
    setDragTargetFolderId(null);
    setReorderTargetClipId(null);
    setReorderTargetPosition(null);
    if (dragIndicatorRef.current) {
      dragIndicatorRef.current.classList.add('hidden');
      dragIndicatorRef.current.classList.remove('flex');
    }
    dragStateRef.current = {
      isDragging: false,
      clipId: null,
      targetFolderId: undefined,
      pendingDrag: null,
      reorderTargetClipId: null,
      reorderTargetPosition: null,
    };
    document.body.classList.remove('is-dragging');

    if (isCancelled) {
      return;
    }

    // Handle reorder drop (priority over folder move)
    if (clipId && reorderClipId && reorderPos && selectedFolderRef.current) {
      try {
        await invoke('reorder_clip', {
          clipUuid: clipId,
          targetUuid: reorderClipId,
          position: reorderPos,
        });
        await loadClips(selectedFolderRef.current);
        await loadFolders();
        refreshTotalCount();
      } catch (e) {
        console.error('[finishDrag] Failed to reorder clip:', e);
      }
    } else if (clipId && targetFolderId !== undefined) {
      handleMoveClip(clipId, targetFolderId);
    }
  };

  const handleDragHover = (folderId: string | null) => {
    setDragTargetFolderId(folderId);
    dragStateRef.current.targetFolderId = folderId;
  };

  const handleDragLeave = () => {
    setDragTargetFolderId(null);
    dragStateRef.current.targetFolderId = undefined;
  };

  // Total History Count
  const [totalClipCount, setTotalClipCount] = useState(0);
  const [imageCount, setImageCount] = useState(0);
  const [textCount, setTextCount] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [htmlCount, setHtmlCount] = useState(0);
  const [rtfCount, setRtfCount] = useState(0);

  const refreshTotalCount = useCallback(async () => {
    try {
      const stats = await invoke<{
        total: number;
        images: number;
        text: number;
        files: number;
        html: number;
        rtf: number;
      }>('get_clip_stats');
      setTotalClipCount(stats.total);
      setImageCount(stats.images);
      setTextCount(stats.text);
      setFileCount(stats.files || 0);
      setHtmlCount(stats.html || 0);
      setRtfCount(stats.rtf || 0);
    } catch (e) {
      console.error('Failed to get clip stats', e);
    }
  }, []);

  useEffect(() => {
    refreshTotalCount();
  }, [refreshTotalCount]);

  // Auto-select first clip when clip list resets (folder change, clipboard change, window reopen)
  useEffect(() => {
    if (clipsRef.current.length > 0) {
      setSelectedClipId(clipsRef.current[0].id);
    }
  }, [clipListResetToken]);

  // Auto-select first clip when window gains focus (reopened via hotkey)
  useEffect(() => {
    const unlisten = listen('tauri://focus', () => {
      setClipListResetToken((prev) => prev + 1);
      if (clipsRef.current.length > 0) {
        setSelectedClipId(clipsRef.current[0].id);
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
      setClipListResetToken((prev) => prev + 1);
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

  const handleDelete = async (clipId: string | null) => {
    if (!clipId) return;
    try {
      await invoke('delete_clip', { id: clipId, hardDelete: false });
      setClips(clips.filter((c) => c.id !== clipId));
      setSelectedClipId(null);
      // Refresh counts
      loadFolders();
      refreshTotalCount();
      toast.success(t('notifications.clipDeleted'));
    } catch (error) {
      console.error('Failed to delete clip:', error);
      toast.error(t('notifications.clipDeleteFailed'));
    }
  };

  const handleToggleClipPin = useCallback(async (clipId: string | null) => {
    if (!clipId) return;
    try {
      const newPinnedState = await invoke<boolean>('toggle_clip_pin', { uuid: clipId });
      setClips((prevClips) =>
        prevClips.map((c) => (c.id === clipId ? { ...c, is_pinned: newPinnedState } : c))
      );
      // Since changing pin status changes order, refresh the current folder/clipboard list to get correct new sorting!
      refreshCurrentFolder();
      toast.success(newPinnedState ? 'Clip pinned' : 'Clip unpinned');
    } catch (error) {
      console.error('Failed to toggle clip pin:', error);
      toast.error('Failed to toggle pin');
    }
  }, [refreshCurrentFolder]);

  const getFullImageBlob = useCallback(
    async (clipId: string, fallbackClip: AppClipboardItem): Promise<Blob> => {
      const detail = await invoke<AppClipboardItem>('get_clip_detail', { id: clipId });
      const mimeType = getImageMimeType(detail.metadata ?? fallbackClip.metadata);
      return base64ToBlob(detail.content, mimeType);
    },
    []
  );

  const handlePaste = async (clipId: string) => {
    if (wasDraggingRef.current) {
      return;
    }
    try {
      const clip = clips.find((c) => c.id === clipId);
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
      if (settings?.reset_view_on_paste) {
        setSelectedFolder(null);
      } else {
        refreshCurrentFolder();
      }
      refreshTotalCount();

      // Close window after paste unless pinned
      if (!settings?.pinned) {
        setTimeout(() => {
          appWindow.hide().catch((err) => console.error('Failed to hide window:', err));
        }, 150);
      }
    } catch (error) {
      console.error('Failed to paste clip:', error);
    }
  };

  const handleCopy = async (clipId: string) => {
    try {
      const clip = clips.find((c) => c.id === clipId);
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

  // Keyboard navigation handlers
  const handleNavigatePrev = useCallback(() => {
    if (clips.length === 0) return;

    if (!selectedClipId) {
      setSelectedClipId(clips[0].id);
      return;
    }

    const currentIndex = clips.findIndex((c) => c.id === selectedClipId);
    if (currentIndex > 0) {
      setSelectedClipId(clips[currentIndex - 1].id);
    } else {
      // Wrap to last
      setSelectedClipId(clips[clips.length - 1].id);
    }
  }, [clips, selectedClipId]);

  const handleNavigateNext = useCallback(() => {
    if (clips.length === 0) return;

    if (!selectedClipId) {
      setSelectedClipId(clips[0].id);
      return;
    }

    const currentIndex = clips.findIndex((c) => c.id === selectedClipId);
    if (currentIndex < clips.length - 1) {
      setSelectedClipId(clips[currentIndex + 1].id);
    } else {
      // Wrap to first
      setSelectedClipId(clips[0].id);
    }
  }, [clips, selectedClipId]);

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
      loadClips(selectedFolder, true, searchQuery);
    }
  }, [hasMore, isLoading, selectedFolder, loadClips, searchQuery]);

  const handleMoveClip = async (clipId: string, folderId: string | null) => {
    try {
      await invoke('move_to_folder', { clipId, folderId });

      // Refresh current view from DB to ensure consistency
      refreshCurrentFolder();
      loadFolders();
      refreshTotalCount();

      toast.success(t('notifications.clipMoved'));
    } catch (error) {
      console.error('Failed to move clip:', error);
      toast.error(t('notifications.clipMoveFailed'));
    }
  };

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    type: 'card' | 'folder';
    x: number;
    y: number;
    itemId: string;
  } | null>(null);

  // New Folder Modal Rename Mode
  const [folderModalMode, setFolderModalMode] = useState<'create' | 'rename'>('create');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

  // AI Result State
  const [aiResult, setAiResult] = useState({
    isOpen: false,
    title: '',
    content: '',
  });
  const [editClip, setEditClip] = useState<{ isOpen: boolean; clipId: string; content: string }>({
    isOpen: false,
    clipId: '',
    content: '',
  });
  const [moveToFolderClipId, setMoveToFolderClipId] = useState<string | null>(null);

  const toggleViewMode = useCallback(async () => {
    isTogglingRef.current = true;
    try {
      await invoke('toggle_view_mode');
    } catch (e) {
      console.error('Failed to toggle view mode:', e);
    } finally {
      setTimeout(() => {
        isTogglingRef.current = false;
      }, 2500);
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

  const handleAiAction = async (clipId: string, action: string, title: string) => {
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
      toast.error(t('ai.error', { error: String(error) }));
    }
  };

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, type: 'card' | 'folder', itemId: string) => {
      e.preventDefault();
      setContextMenu({
        type,
        x: e.clientX,
        y: e.clientY,
        itemId,
      });
    },
    []
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

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
      // Force a full list reset via token to ensure data is fresh
      setClipListResetToken((prev) => prev + 1);
      refreshTotalCount();
      toast.success('Clip content updated');
    } catch (e) {
      console.error('Failed to update clip content:', e);
      toast.error('Failed to update clip');
    }
  };

  const handleMoveToFolder = async (clipId: string, folderId: string | null) => {
    try {
      await invoke('move_to_folder', { clipId, folderId });
      await loadClips(selectedFolderRef.current);
      await loadFolders();
      refreshTotalCount();
      toast.success(folderId ? 'Moved to folder' : 'Moved to main clipboard');
    } catch (e) {
      console.error('Failed to move clip:', e);
      toast.error('Failed to move clip');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!folderId) return;
    try {
      await invoke('delete_folder', { id: folderId });
      if (selectedFolder === folderId) {
        setSelectedFolder(null);
      }
      await loadFolders();
      refreshTotalCount();
      toast.success(t('folders.folderDeleted'));
    } catch (error) {
      console.error('Failed to delete folder:', error);
      toast.error(t('notifications.folderDeleteFailed'));
    }
  };

  const handleTogglePin = async () => {
    if (!settings) return;
    const newPinned = !settings.pinned;
    try {
      const newSettings = { ...settings, pinned: newPinned };
      await invoke('save_settings', { settings: newSettings });
      setSettings(newSettings);
      toast.success(newPinned ? 'Window Pinned' : 'Window Unpinned');
    } catch (e) {
      console.error('Failed to toggle pin:', e);
    }
  };

  useKeyboard({
    onClose: () => appWindow.hide(),
    onSearch: () => setShowSearch(true),
    onDelete: () => handleDelete(selectedClipId),
    onPin: () => handleToggleClipPin(selectedClipId),
    onNavigatePrev: handleNavigatePrev,
    onNavigateNext: handleNavigateNext,
    onFolderPrev: settings?.view_mode === 'compact' ? handleFolderPrev : undefined,
    onFolderNext: settings?.view_mode === 'compact' ? handleFolderNext : undefined,
    onPaste: handlePasteSelected,
    onToggleMode: toggleViewMode,
    toggleModeHotkey: settings?.view_mode_hotkey,
  });

  return (
    <div
      data-el="app-root"
      className="relative h-dvh w-full overflow-hidden"
      style={{ border: '1px solid rgba(34, 211, 238, 0.25)' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Content Container */}
      <div
        data-el="app-window"
        className={`relative h-full w-full overflow-hidden ${settings?.mica_effect === 'clear' ? 'bg-background/95' : ''}`}
      >
        {settings?.view_mode === 'compact' ? (
          <CompactView
            clips={clips}
            folders={folders}
            selectedFolder={selectedFolder}
            selectedClipId={selectedClipId}
            onSelectFolder={handleSelectFolder}
            searchQuery={searchQuery}
            onSearchChange={handleSearch}
            onPaste={handlePaste}
            onDelete={handleDelete}
            onToggleMode={toggleViewMode}
            onOpenSettings={openSettings}
            isLoading={isLoading}
            theme={effectiveTheme}
            isPinned={settings?.pinned}
            onTogglePin={handleTogglePin}
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
            reorderEnabled={!!selectedFolder}
            compactFolderLayout={settings?.compact_folder_layout || 'horizontal'}
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
          />
        ) : (
          <div
            data-el="app-frame"
            className="flex h-full w-full flex-col pt-1.5 font-sans text-foreground"
          >
            <ControlBar
              style={{ height: LAYOUT.CONTROL_BAR_HEIGHT, flexShrink: 0 }}
              folders={folders}
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
              imageCount={imageCount}
              textCount={textCount}
              fileCount={fileCount}
              htmlCount={htmlCount}
              rtfCount={rtfCount}
              onFolderContextMenu={(e, folderId) => {
                if (folderId) handleContextMenu(e, 'folder', folderId);
              }}
              theme={effectiveTheme}
              // Add toggle button to ControlBar
              onToggleMode={toggleViewMode}
              viewMode={settings?.view_mode || 'full'}
              isPinned={settings?.pinned ?? false}
              onTogglePin={handleTogglePin}
              onResetSize={handleResetSize}
              hotkey={settings?.hotkey}
              lastClipTime={clips[0]?.created_at ?? null}
              dbSizeBytes={dbSizeBytes}
            />

            <main data-el="clip-list-area" className="no-scrollbar relative flex-1 overflow-hidden">
              <ClipList
                clips={clips}
                isLoading={isLoading}
                hasMore={hasMore}
                resetToken={clipListResetToken}
                selectedClipId={selectedClipId}
                selectedFolder={selectedFolder}
                onPaste={handlePaste}
                onCopy={handleCopy}
                onLoadMore={loadMore}
                onDragStart={startDrag}
                onCardContextMenu={(e, clipId) => handleContextMenu(e, 'card', clipId)}
                scrollDirection={settings?.scroll_direction || 'horizontal'}
                reorderTargetClipId={reorderTargetClipId}
                reorderTargetPosition={reorderTargetPosition}
                reorderEnabled={!!selectedFolder}
                draggingClipId={draggingClipId}
              />
            </main>
          </div>
        )}

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={handleCloseContextMenu}
            options={
              contextMenu.type === 'card'
                ? (() => {
                    const clip = clips.find((c) => c.id === contextMenu.itemId);
                    const opts = [];

                    if (clip?.clip_type === 'image') {
                      opts.push({
                        label: t('contextMenu.view'),
                        onClick: () => {
                          if (settings?.show_action_messages) {
                            toast.info('Opening Viewer...');
                          }
                          invoke('open_image_viewer', { clipId: clip.id }).catch(console.error);
                        },
                      });
                    }

                    opts.push({
                      label: 'Edit',
                      onClick: () => {
                        if (clip) {
                          if (clip.clip_type === 'image') {
                            if (settings?.image_editor_path) {
                              invoke('open_with', {
                                appPath: settings.image_editor_path,
                                filePath: clip.image_path || clip.content,
                              })
                                .then(() => {
                                  // Auto-hide after successful launch
                                  invoke('hide_window');
                                  toast.success('Image editor launched');
                                })
                                .catch((e) => toast.error(`Failed to open editor: ${e}`));
                            } else {
                              toast.info(
                                'Please configure an External Image Editor (like CyberViewer) in Settings to use this feature.'
                              );
                            }
                          } else {
                            // Fetch full content before editing since get_clips uses preview_only
                            invoke<AppClipboardItem>('get_clip', { clipId: clip.id })
                              .then((fullClip) => {
                                setEditClip({
                                  isOpen: true,
                                  clipId: (fullClip as any).id || (fullClip as any).uuid,
                                  content: (fullClip as any).content,
                                });
                              })
                              .catch((err) => {
                                console.error('Failed to fetch clip content:', err);
                                // Fallback to preview if fetch fails
                                setEditClip({
                                  isOpen: true,
                                  clipId: clip.id,
                                  content: clip.content || clip.preview,
                                });
                              });
                          }
                        }
                      },
                    });

                    opts.push({
                      label: t('contextMenu.copy') || 'Copy',
                      onClick: () => handlePaste(contextMenu.itemId),
                    });

                    opts.push({
                      label: clip?.is_pinned ? (t('contextMenu.unpin') || 'Unpin Clip') : (t('contextMenu.pin') || 'Pin Clip'),
                      onClick: () => handleToggleClipPin(contextMenu.itemId),
                    });

                    opts.push({
                      label: t('contextMenu.moveToFolder') || 'Move to Folder...',
                      onClick: () => setMoveToFolderClipId(contextMenu.itemId),
                    });

                    opts.push({
                      label: `${settings?.ai_title_summarize || t('contextMenu.summarize')}`,
                      onClick: () =>
                        handleAiAction(contextMenu.itemId, 'summarize', t('ai.summary')),
                    });

                    opts.push({
                      label: `${settings?.ai_title_translate || t('contextMenu.translate')}`,
                      onClick: () =>
                        handleAiAction(contextMenu.itemId, 'translate', t('ai.translation')),
                    });

                    opts.push({
                      label: `${settings?.ai_title_explain_code || t('contextMenu.explainCode')}`,
                      onClick: () =>
                        handleAiAction(contextMenu.itemId, 'explain_code', t('ai.codeExplanation')),
                    });

                    opts.push({
                      label: `${settings?.ai_title_fix_grammar || t('contextMenu.fixGrammar')}`,
                      onClick: () =>
                        handleAiAction(contextMenu.itemId, 'fix_grammar', t('ai.grammarCheck')),
                    });

                    opts.push({
                      label: t('contextMenu.delete') || 'Delete',
                      danger: true,
                      onClick: () => handleDelete(contextMenu.itemId),
                    });

                    return opts;
                  })()
                : [
                    {
                      label: 'Edit',
                      onClick: () => {
                        setFolderModalMode('rename');
                        setEditingFolderId(contextMenu.itemId);
                        const folder = folders.find((f) => f.id === contextMenu.itemId);
                        setNewFolderName(folder ? folder.name : '');
                        setShowAddFolderModal(true);
                      },
                    },
                    {
                      label: t('contextMenu.delete') || 'Delete',
                      danger: true,
                      onClick: () => handleDeleteFolder(contextMenu.itemId),
                    },
                  ]
            }
          />
        )}

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
          onClose={() => setEditClip((prev) => ({ ...prev, isOpen: false }))}
          onSave={(newContent) => handleUpdateClipContent(editClip.clipId, newContent)}
        />

        <MoveToFolderModal
          isOpen={!!moveToFolderClipId}
          folders={folders}
          onClose={() => setMoveToFolderClipId(null)}
          onSelect={(folderId) => {
            if (moveToFolderClipId) handleMoveToFolder(moveToFolderClipId, folderId);
          }}
        />

        <div
          ref={dragIndicatorRef}
          className="pointer-events-none fixed left-0 top-0 z-[9999] hidden h-7 w-7 flex items-center justify-center rounded-full border border-cyan-500/30 bg-black/85 shadow-[0_0_12px_rgba(34,211,238,0.5)] backdrop-blur-md"
          style={{
            transform: 'translate3d(calc(var(--mouse-x, 0px) + 16px), calc(var(--mouse-y, 0px) + 16px), 0)',
            willChange: 'transform',
          }}
        >
          <ImageIcon data-drag-icon="image" size={13} className="hidden text-cyan-400" />
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
