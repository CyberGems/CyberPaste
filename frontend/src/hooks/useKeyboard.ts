import { useEffect } from 'react';
import { lockListHover } from './useListHoverLock';

export const TITLEBAR_HOTKEYS = {
  pin: 'Ctrl+P',
  peek: 'Ctrl+E',
  resetSize: 'Ctrl+R',
  settings: 'Ctrl+,',
  more: 'Ctrl+.',
  maximize: 'Ctrl+F11',
  mode: 'Ctrl+M',
  compactLayout: 'Ctrl+L',
  searchHistory: 'Ctrl+H',
} as const;

interface KeyboardOptions {
  onClose?: () => void;
  onSearch?: () => void;
  onToggleSearchHistory?: () => void;
  searchHistoryHotkey?: string;
  onDelete?: () => void;
  onPin?: () => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  onNavigateFirst?: () => void;
  onNavigateLast?: () => void;
  onNavigatePageUp?: () => void;
  onNavigatePageDown?: () => void;
  onNavigateLeft?: () => void;
  onNavigateRight?: () => void;
  onFolderPrev?: () => void;
  onFolderNext?: () => void;
  onPaste?: () => void;
  /** Enter with Ctrl/Cmd — copies selected clip as plain text without pasting */
  onCopyPlainText?: () => void;
  /** Enter with Shift — opens the full-screen preview for the selected clip */
  onPreviewSelected?: () => void;
  /** "i" — toggles the clip detail sidebar */
  onToggleDetailPanel?: () => void;
  /** Shift+F10 / Context Menu key — opens the selected clip's context menu */
  onOpenContextMenu?: () => void;
  /** Ctrl/Cmd+A — select all clips (bulk selection) */
  onSelectAll?: () => void;
  /** Ctrl/Cmd+1..9 — paste clip #N directly (Compact) */
  onPasteByIndex?: (n: number) => void;
  /** Esc pressed while search input is focused and has text */
  onClearSearch?: () => void;
  /** True while the full-mode search overlay is open or a query is active. */
  searchActive?: boolean;
  onToggleMode?: () => void;
  toggleModeHotkey?: string; // e.g. "Ctrl+M"
  onStartTypingSearch?: (char: string) => void;
  onUndo?: () => void;
  onTogglePeek?: () => void;
  peekHotkey?: string;
  onOpenSettings?: () => void;
  settingsHotkey?: string;
  onToggleMore?: () => void;
  moreHotkey?: string;
  onResetSize?: () => void;
  resetSizeHotkey?: string;
  onToggleMaximize?: () => void;
  maximizeHotkey?: string;
  onToggleLayout?: () => void;
  layoutHotkey?: string;
}

export function useKeyboard(options: KeyboardOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore all keyboard shortcuts when dragging
      if (document.body.classList.contains('is-dragging')) {
        return;
      }

      const isTyping =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable);

      const isSearchInput = e.target instanceof HTMLInputElement && e.target.id === 'search-input';
      const isMenuItem =
        e.target instanceof HTMLElement && Boolean(e.target.closest('[role="menu"]'));
      if (isMenuItem) {
        return;
      }

      // Helper to check if event matches a hotkey string like "Ctrl+Shift+V"
      const matchesHotkey = (hotkey: string) => {
        const parts = hotkey.split('+');
        const key = parts.pop()?.toLowerCase();
        const hasCtrl = parts.includes('Ctrl');
        const hasShift = parts.includes('Shift');
        const hasAlt = parts.includes('Alt');
        const hasCmd = parts.includes('Cmd');

        const eventKey = e.key.toLowerCase();
        // Handle physical key names like 'm' vs 'M'
        const keyMatches =
          eventKey === key || (e.code.startsWith('Key') && e.code.slice(3).toLowerCase() === key);

        return (
          keyMatches &&
          e.ctrlKey === hasCtrl &&
          e.shiftKey === hasShift &&
          e.altKey === hasAlt &&
          e.metaKey === hasCmd
        );
      };

      if (e.key === 'Escape' && options.onClose) {
        if (isTyping && !isSearchInput) {
          return;
        }
        // First Escape dismisses search (even after leaving the field with arrows).
        // A second Escape hides the window.
        const searchFieldHasText =
          isSearchInput && (e.target as HTMLInputElement).value.length > 0;
        if (options.onClearSearch && (options.searchActive || searchFieldHasText)) {
          e.preventDefault();
          options.onClearSearch();
          return;
        }
        e.preventDefault();
        options.onClose();
      }

      // Ctrl/Cmd+1..9 — paste clip #N directly (sin importar el foco)
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        e.stopPropagation();
        const n = parseInt(e.key, 10);
        options.onPasteByIndex?.(n);
        return;
      }

      // Ctrl/Cmd+Backspace — clear search (si está enfocado)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === 'Backspace' &&
        isSearchInput &&
        options.onClearSearch
      ) {
        e.preventDefault();
        options.onClearSearch();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && options.onSearch) {
        e.preventDefault();
        options.onSearch();
      }

      if (
        options.onToggleSearchHistory &&
        options.searchHistoryHotkey &&
        matchesHotkey(options.searchHistoryHotkey)
      ) {
        e.preventDefault();
        e.stopPropagation();
        options.onToggleSearchHistory();
        return;
      }

      // Dynamic Toggle Mode Hotkey
      if (options.onToggleMode && options.toggleModeHotkey) {
        if (matchesHotkey(options.toggleModeHotkey)) {
          e.preventDefault();
          e.stopPropagation();
          options.onToggleMode();
          return;
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'm' && options.onToggleMode) {
        // Fallback to Ctrl+M
        e.preventDefault();
        e.stopPropagation();
        options.onToggleMode();
        return;
      }

      if (options.onTogglePeek && options.peekHotkey && matchesHotkey(options.peekHotkey)) {
        e.preventDefault();
        e.stopPropagation();
        options.onTogglePeek();
        return;
      }

      if (
        options.onOpenSettings &&
        options.settingsHotkey &&
        matchesHotkey(options.settingsHotkey)
      ) {
        e.preventDefault();
        e.stopPropagation();
        options.onOpenSettings();
        return;
      }

      if (options.onToggleMore && options.moreHotkey && matchesHotkey(options.moreHotkey)) {
        e.preventDefault();
        e.stopPropagation();
        options.onToggleMore();
        return;
      }

      if (options.onResetSize && options.resetSizeHotkey && matchesHotkey(options.resetSizeHotkey)) {
        e.preventDefault();
        e.stopPropagation();
        options.onResetSize();
        return;
      }

      if (
        options.onToggleMaximize &&
        options.maximizeHotkey &&
        matchesHotkey(options.maximizeHotkey)
      ) {
        e.preventDefault();
        e.stopPropagation();
        options.onToggleMaximize();
        return;
      }

      if (options.onToggleLayout && options.layoutHotkey && matchesHotkey(options.layoutHotkey)) {
        e.preventDefault();
        e.stopPropagation();
        options.onToggleLayout();
        return;
      }

      if (e.key === 'Delete' && options.onDelete) {
        if (isTyping) {
          return;
        }
        e.preventDefault();
        lockListHover();
        options.onDelete();
      }

      // Standard keyboard context-menu shortcut.
      if (
        options.onOpenContextMenu &&
        !isTyping &&
        (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey))
      ) {
        e.preventDefault();
        e.stopPropagation();
        options.onOpenContextMenu();
        return;
      }

      // 'i' toggles the detail panel (plain key, not while typing).
      // Runs BEFORE type-to-search so it doesn't get swallowed by search activation.
      if (e.key.toLowerCase() === 'i' && !isTyping && options.onToggleDetailPanel) {
        if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          options.onToggleDetailPanel();
          return;
        }
      }

      // Space — open the selected clip's action menu (arrows + Enter to choose).
      if (e.key === ' ' && options.onOpenContextMenu && !isTyping) {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          options.onOpenContextMenu();
          return;
        }
      }

      // Type-to-search: activate search when user types a printable character
      if (
        options.onStartTypingSearch &&
        !isTyping &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        lockListHover();
        options.onStartTypingSearch(e.key);
      }

      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === 'p' &&
        !e.shiftKey &&
        !e.altKey &&
        options.onPin
      ) {
        e.preventDefault();
        options.onPin();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && options.onUndo) {
        if (!isTyping || isSearchInput) {
          e.preventDefault();
          e.stopPropagation();
          options.onUndo();
        }
      }

      // Ctrl/Cmd+A — select all for bulk actions
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a' && options.onSelectAll) {
        if (!isTyping) {
          e.preventDefault();
          e.stopPropagation();
          options.onSelectAll();
        }
      }

      // In full mode, the first arrow from search should land in the clip grid
      // (blur the field) so left/right work like the unfiltered view.
      const leaveSearchForGrid = () => {
        if (isSearchInput && options.onNavigateLeft && e.target instanceof HTMLElement) {
          e.target.blur();
        }
      };

      if (e.key === 'ArrowUp' && options.onNavigatePrev) {
        if (isTyping && !isSearchInput) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        leaveSearchForGrid();
        lockListHover();
        options.onNavigatePrev();
      }

      if (e.key === 'ArrowDown' && options.onNavigateNext) {
        if (isTyping && !isSearchInput) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        leaveSearchForGrid();
        lockListHover();
        options.onNavigateNext();
      }

      if ((e.key === 'Home' || e.key === 'Start') && options.onNavigateFirst) {
        if (isTyping && !isSearchInput) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        leaveSearchForGrid();
        lockListHover();
        options.onNavigateFirst();
      }

      if (e.key === 'End' && options.onNavigateLast) {
        if (isTyping && !isSearchInput) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        leaveSearchForGrid();
        lockListHover();
        options.onNavigateLast();
      }

      if (e.key === 'PageUp' && options.onNavigatePageUp) {
        if (isTyping && !isSearchInput) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        leaveSearchForGrid();
        lockListHover();
        options.onNavigatePageUp();
      }

      if (e.key === 'PageDown' && options.onNavigatePageDown) {
        if (isTyping && !isSearchInput) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        leaveSearchForGrid();
        lockListHover();
        options.onNavigatePageDown();
      }

      // Left/Right: with Ctrl (or Cmd) → switch folders; plain → move between cards.
      // Full mode passes onNavigateLeft/Right (grid navigation) and uses Ctrl for folders.
      // Compact mode passes onFolderPrev/Next directly (single-row strip).
      if (e.key === 'ArrowLeft' && (!isTyping || isSearchInput)) {
        if (e.ctrlKey || e.metaKey) {
          if (options.onFolderPrev) {
            e.preventDefault();
            e.stopPropagation();
            leaveSearchForGrid();
            lockListHover();
            options.onFolderPrev();
          }
        } else if (options.onNavigateLeft) {
          e.preventDefault();
          e.stopPropagation();
          leaveSearchForGrid();
          lockListHover();
          options.onNavigateLeft();
        } else if (options.onFolderPrev && !isSearchInput) {
          e.preventDefault();
          e.stopPropagation();
          lockListHover();
          options.onFolderPrev();
        }
      }

      if (e.key === 'ArrowRight' && (!isTyping || isSearchInput)) {
        if (e.ctrlKey || e.metaKey) {
          if (options.onFolderNext) {
            e.preventDefault();
            e.stopPropagation();
            leaveSearchForGrid();
            lockListHover();
            options.onFolderNext();
          }
        } else if (options.onNavigateRight) {
          e.preventDefault();
          e.stopPropagation();
          leaveSearchForGrid();
          lockListHover();
          options.onNavigateRight();
        } else if (options.onFolderNext && !isSearchInput) {
          e.preventDefault();
          e.stopPropagation();
          lockListHover();
          options.onFolderNext();
        }
      }

      if (e.key === 'Enter' && options.onPaste) {
        if (isTyping && !isSearchInput) {
          return;
        }
        e.preventDefault();
        if ((e.ctrlKey || e.metaKey) && options.onCopyPlainText) {
          options.onCopyPlainText();
        } else if (e.shiftKey && options.onPreviewSelected) {
          options.onPreviewSelected();
        } else {
          options.onPaste();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [options]);
}
