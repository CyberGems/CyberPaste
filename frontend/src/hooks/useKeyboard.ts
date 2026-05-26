import { useEffect } from 'react';

interface KeyboardOptions {
  onClose?: () => void;
  onSearch?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  onFolderPrev?: () => void;
  onFolderNext?: () => void;
  onPaste?: () => void;
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
        e.preventDefault();
        options.onClose();
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

      // Type-to-search: activate search when user types a printable character
      if (
        options.onStartTypingSearch &&
        !isTyping &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        e.key !== 'p'
      ) {
        e.preventDefault();
        options.onStartTypingSearch(e.key);
      }

      if (e.key === 'p' && !e.metaKey && !e.ctrlKey && options.onPin) {
        if (isTyping) {
          return;
        }
        e.preventDefault();
        options.onPin();
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

      if (e.key === 'ArrowLeft' && options.onFolderPrev && !isTyping) {
        e.preventDefault();
        e.stopPropagation();
        options.onFolderPrev();
      }

      if (e.key === 'ArrowRight' && options.onFolderNext && !isTyping) {
        e.preventDefault();
        e.stopPropagation();
        options.onFolderNext();
      }

      if (e.key === 'Enter' && options.onPaste) {
        if (isTyping && !isSearchInput) {
          return;
        }
        e.preventDefault();
        options.onPaste();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [options]);
}
