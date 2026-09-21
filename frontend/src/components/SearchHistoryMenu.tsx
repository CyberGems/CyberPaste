import { useEffect, useRef, useState } from 'react';
import { History, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SearchHistoryMenuProps {
  history: string[];
  onSelect: (query: string) => void;
  onClear: () => void;
}

export function SearchHistoryMenu({ history, onSelect, onClear }: SearchHistoryMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={t('common.searchHistory')}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
          open
            ? 'border-primary/50 bg-primary/10 text-primary'
            : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground'
        }`}
      >
        <History size={15} />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t('common.searchHistory')}
          className="absolute right-0 top-full z-[80] mt-1 w-72 overflow-hidden rounded-xl border border-border bg-popover/95 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-foreground">
              <Search size={13} className="text-primary" />
              {t('common.searchHistory')}
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onClear();
              }}
              disabled={history.length === 0}
              aria-label={t('common.clearSearchHistory')}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-35"
            >
              <Trash2 size={13} />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {history.length > 0 ? (
              history.map((query) => (
                <button
                  key={query}
                  type="button"
                  title={query}
                  onClick={() => {
                    setOpen(false);
                    onSelect(query);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
        </div>
      ) : null}
    </div>
  );
}
