import {
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { History, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Tooltip from './Tooltip';
import { TITLEBAR_HOTKEYS } from '../hooks/useKeyboard';

export const SEARCH_HISTORY_EVENT = 'cyberpaste:search-history';

interface SearchHistoryMenuProps {
  history: string[];
  onSelect: (query: string) => void;
  onClear: () => void;
  toggleToken?: number;
  /** Sit inside the search field, flush to its right edge. */
  embedded?: boolean;
}

export function SearchHistoryMenu({
  history,
  onSelect,
  onClear,
  toggleToken = 0,
  embedded = false,
}: SearchHistoryMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lastToggleTokenRef = useRef(toggleToken);
  const [menuPosition, setMenuPosition] = useState({ left: 8, top: 8 });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [pointerMovedSinceOpen, setPointerMovedSinceOpen] = useState(false);

  const focusFirstItem = () => {
    const firstItem = itemRefs.current.find((item) => item !== null);
    (firstItem ?? menuRef.current)?.focus();
  };

  const closeMenu = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => buttonRef.current?.focus());
    }
  };

  const openMenu = () => {
    setOpen(true);
  };

  useEffect(() => {
    if (toggleToken === lastToggleTokenRef.current) return;
    lastToggleTokenRef.current = toggleToken;
    setOpen((value) => !value);
  }, [toggleToken]);

  useLayoutEffect(() => {
    if (!open) {
      setActiveIndex(null);
      return;
    }
    setPointerMovedSinceOpen(false);
    setActiveIndex(history.length > 0 ? 0 : null);
    focusFirstItem();
  }, [open, history.length]);

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
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const menuWidth = 288;
      const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - menuWidth - 8));
      const menuHeight = menuRef.current?.offsetHeight ?? 296;
      const belowTop = rect.bottom + 4;
      const top =
        belowTop + menuHeight > window.innerHeight - 8
          ? Math.max(8, rect.top - menuHeight - 4)
          : belowTop;
      setMenuPosition({ left, top });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        closeMenu(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open]);

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

  return (
    <div
      ref={rootRef}
      className={
        embedded ? 'absolute right-1 top-1/2 z-10 -translate-y-1/2' : 'relative shrink-0'
      }
    >
      <Tooltip
        label={t('common.tooltipWithHotkey', {
          label: t('common.searchHistory'),
          hotkey: TITLEBAR_HOTKEYS.searchHistory,
        })}
        placement="bottom"
      >
        <button
          type="button"
          ref={buttonRef}
          aria-label={t('common.searchHistory')}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-keyshortcuts="Control+H"
          onClick={() => (open ? closeMenu() : openMenu())}
          className={`flex items-center justify-center transition-all ${
            embedded ? 'h-6 w-6 rounded-md' : 'h-8 w-8 rounded-lg border'
          } ${
            open
              ? 'border-primary/50 bg-primary/10 text-primary'
              : embedded
                ? 'text-muted-foreground/80 hover:bg-accent hover:text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground'
          }`}
        >
          <History size={embedded ? 13 : 15} />
        </button>
      </Tooltip>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              style={{ left: menuPosition.left, top: menuPosition.top }}
              role="menu"
              tabIndex={-1}
              aria-label={t('common.searchHistory')}
              onKeyDown={handleMenuKeyDown}
              onPointerMove={() => {
                if (!pointerMovedSinceOpen) setPointerMovedSinceOpen(true);
              }}
              className="fixed z-[240] w-72 overflow-hidden rounded-xl border border-border bg-popover/95 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
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

              <div className="max-h-64 overflow-y-auto p-1">
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
                        pointerMovedSinceOpen
                          ? 'hover:bg-accent hover:text-foreground'
                          : ''
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
          )
        : null}
    </div>
  );
}
