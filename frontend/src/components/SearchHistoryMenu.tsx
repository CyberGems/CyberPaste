import {
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { History, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Tooltip from './Tooltip';

export const SEARCH_HISTORY_EVENT = 'cyberpaste:search-history';

interface SearchHistoryMenuProps {
  history: string[];
  onSelect: (query: string) => void;
  onClear: () => void;
  toggleToken?: number;
  focusRef: RefObject<HTMLInputElement | null>;
  anchorRef?: RefObject<HTMLElement | null>;
  enabled?: boolean;
}

export function SearchHistoryMenu({
  history,
  onSelect,
  onClear,
  toggleToken = 0,
  focusRef,
  anchorRef,
  enabled = true,
}: SearchHistoryMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lastToggleTokenRef = useRef(toggleToken);
  const focusMenuOnOpenRef = useRef(false);
  const suppressFocusOpenRef = useRef(false);
  const [menuPosition, setMenuPosition] = useState({ left: 8, top: 8, width: 288, maxHeight: 296 });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [pointerMovedSinceOpen, setPointerMovedSinceOpen] = useState(false);

  const focusFirstItem = () => {
    const firstItem = itemRefs.current.find((item) => item !== null);
    (firstItem ?? menuRef.current)?.focus();
  };

  const closeMenu = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) {
      suppressFocusOpenRef.current = true;
      window.requestAnimationFrame(() => {
        focusRef.current?.focus();
        suppressFocusOpenRef.current = false;
      });
    }
  };

  useEffect(() => {
    if (!enabled || toggleToken === lastToggleTokenRef.current) return;
    lastToggleTokenRef.current = toggleToken;
    setOpen((value) => {
      if (!value) focusMenuOnOpenRef.current = true;
      return !value;
    });
  }, [toggleToken, enabled]);

  useEffect(() => {
    const input = focusRef.current;
    if (!enabled || !input) return;

    const handleFocus = () => {
      if (suppressFocusOpenRef.current) return;
      focusMenuOnOpenRef.current = false;
      setOpen(true);
    };

    input.addEventListener('focus', handleFocus);
    if (document.activeElement === input) handleFocus();

    return () => input.removeEventListener('focus', handleFocus);
  }, [enabled, focusRef]);

  useEffect(() => {
    if (enabled) return;
    setOpen(false);
  }, [enabled]);

  useEffect(() => {
    const input = focusRef.current;
    if (!enabled || !input) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        return;
      }

      if (event.key === 'Enter') {
        closeMenu(false);
        return;
      }

      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && history.length > 0) {
        event.preventDefault();
        event.stopPropagation();
        const nextIndex = event.key === 'ArrowDown' ? 0 : history.length - 1;
        setActiveIndex(nextIndex);
        itemRefs.current[nextIndex]?.focus();
      }
    };

    input.addEventListener('keydown', handleKeyDown, true);
    return () => input.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, focusRef, open, history.length]);

  useLayoutEffect(() => {
    if (!open) {
      setActiveIndex(null);
      return;
    }
    setPointerMovedSinceOpen(false);
    if (focusMenuOnOpenRef.current) {
      setActiveIndex(history.length > 0 ? 0 : null);
      focusFirstItem();
    } else {
      setActiveIndex(null);
    }
  }, [open]);

  useEffect(() => {
    document.body.dataset.searchHistoryOpen = open ? 'true' : 'false';
    window.dispatchEvent(new CustomEvent(SEARCH_HISTORY_EVENT, { detail: { open } }));
    return () => {
      delete document.body.dataset.searchHistoryOpen;
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const anchor = anchorRef?.current ?? focusRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(288, Math.max(0, window.innerWidth - 16));
      const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
      const top = rect.bottom + 4;
      const maxHeight = Math.max(0, window.innerHeight - top - 8);
      setMenuPosition({ left, top, width, maxHeight });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, anchorRef, focusRef]);

  useEffect(() => {
    if (!open) return;

    const isInsideMenu = (target: Node) =>
      focusRef.current?.contains(target) || menuRef.current?.contains(target);

    const handlePointerDown = (event: PointerEvent) => {
      if (!isInsideMenu(event.target as Node)) closeMenu(false);
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isInsideMenu(event.target as Node)) closeMenu(false);
    };

    const handleContextMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) closeMenu(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('contextmenu', handleContextMenu, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [open, focusRef]);

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null);
    const active = document.activeElement;
    const currentIndex = items.indexOf(active as HTMLButtonElement);
    const clearIndex = clearButtonRef.current === active ? items.length : -1;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      return;
    }

    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      event.preventDefault();
      event.stopPropagation();

      if (items.length === 0) {
        clearButtonRef.current?.focus();
        return;
      }

      let nextIndex = currentIndex >= 0 ? currentIndex : clearIndex;
      if (event.key === 'ArrowDown') {
        nextIndex = nextIndex >= items.length - 1 ? 0 : nextIndex + 1;
      } else if (event.key === 'ArrowUp') {
        nextIndex = nextIndex <= 0 ? items.length - 1 : nextIndex - 1;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else {
        nextIndex = items.length - 1;
      }
      setActiveIndex(nextIndex);
      items[nextIndex]?.focus();
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && active instanceof HTMLButtonElement) {
      event.preventDefault();
      event.stopPropagation();
      active.click();
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={menuPosition}
      role="menu"
      tabIndex={-1}
      aria-label={t('common.searchHistory')}
      onKeyDown={handleMenuKeyDown}
      onPointerMove={() => {
        if (!pointerMovedSinceOpen) setPointerMovedSinceOpen(true);
      }}
      className="fixed z-[240] flex flex-col overflow-hidden rounded-xl border border-border bg-popover/95 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-foreground">
          <Search size={13} className="text-primary" />
          {t('common.searchHistory')}
        </div>
        <Tooltip label={t('common.clearSearchHistory')} placement="left">
          <button
            type="button"
            ref={clearButtonRef}
            onClick={() => {
              closeMenu();
              onClear();
            }}
            disabled={history.length === 0}
            aria-label={t('common.clearSearchHistory')}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-35"
          >
            <Trash2 size={13} />
          </button>
        </Tooltip>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        {history.length > 0 ? (
          history.map((query, index) => (
            <button
              key={`${query}-${index}`}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              type="button"
              role="menuitem"
              aria-selected={activeIndex === index}
              onFocus={() => setActiveIndex(index)}
              onClick={() => {
                closeMenu();
                onSelect(query);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs outline-none transition-colors ${
                activeIndex === index
                  ? 'bg-accent text-foreground ring-1 ring-primary/50'
                  : 'text-muted-foreground'
              } ${
                pointerMovedSinceOpen ? 'hover:bg-accent hover:text-foreground' : ''
              } focus-visible:bg-accent focus-visible:text-foreground`}
            >
              <History size={12} className="shrink-0 text-primary/70" />
              <span className="min-w-0 flex-1 truncate">{query}</span>
            </button>
          ))
        ) : (
          <p className="px-2.5 py-3 text-center text-[11px] text-muted-foreground">
            {t('common.searchHistoryEmpty')}
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}
