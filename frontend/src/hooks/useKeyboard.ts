import { useEffect } from 'react';

interface KeyboardOptions {
  onClose?: () => void;
  onSearch?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
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
  onToggleMode?: () => void;
  toggleModeHotkey?: string; // e.g. "Ctrl+M"
  onStartTypingSearch?: (char: string) => void;
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
        // Si el search input está enfocado y tiene texto, limpiar primero
        if (isSearchInput && options.onClearSearch) {
          const input = e.target as HTMLInputElement;
          if (input.value.length > 0) {
            e.preventDefault();
            options.onClearSearch();
            return;
          }
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

      // Dynamic Toggle Mode Hotkey
      if (options.onToggleMode && options.toggleModeHotkey) {
        if (matchesHotkey(options.toggleModeHotkey)) {
          e.preventDefault();
          options.onToggleMode();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'm' && options.onToggleMode) {
        // Fallback to Ctrl+M
        e.preventDefault();
        options.onToggleMode();
      }

      if (e.key === 'Delete' && options.onDelete) {
        if (isTyping) {
          return;
        }
        e.preventDefault();
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
        options.onStartTypingSearch(e.key);
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p' && options.onPin) {
        e.preventDefault();
        options.onPin();
      }

      // Ctrl/Cmd+A — select all for bulk actions
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a' && options.onSelectAll) {
        if (!isTyping) {
          e.preventDefault();
          e.stopPropagation();
          options.onSelectAll();
        }
      }

      if (e.key === 'ArrowUp' && options.onNavigatePrev) {
        if (isTyping && !isSearchInput) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        options.onNavigatePrev();
      }

      if (e.key === 'ArrowDown' && options.onNavigateNext) {
        if (isTyping && !isSearchInput) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        options.onNavigateNext();
      }

      // Left/Right: with Ctrl (or Cmd) → switch folders; plain → move between cards.
      // Full mode passes onNavigateLeft/Right (grid navigation) and uses Ctrl for folders.
      // Compact mode passes onFolderPrev/Next directly (single-row strip).
      if (e.key === 'ArrowLeft' && !isTyping) {
        if (e.ctrlKey || e.metaKey) {
          if (options.onFolderPrev) {
            e.preventDefault();
            e.stopPropagation();
            options.onFolderPrev();
          }
        } else if (options.onNavigateLeft) {
          e.preventDefault();
          e.stopPropagation();
          options.onNavigateLeft();
        } else if (options.onFolderPrev) {
          e.preventDefault();
          e.stopPropagation();
          options.onFolderPrev();
        }
      }

      if (e.key === 'ArrowRight' && !isTyping) {
        if (e.ctrlKey || e.metaKey) {
          if (options.onFolderNext) {
            e.preventDefault();
            e.stopPropagation();
            options.onFolderNext();
          }
        } else if (options.onNavigateRight) {
          e.preventDefault();
          e.stopPropagation();
          options.onNavigateRight();
        } else if (options.onFolderNext) {
          e.preventDefault();
          e.stopPropagation();
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
