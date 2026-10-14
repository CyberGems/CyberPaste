import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import {
  Clock,
  Smile,
  ThumbsUp,
  Laptop,
  Sparkles,
  ArrowRight,
  Search,
  type LucideIcon,
} from 'lucide-react';
import {
  EMOJI_CATEGORIES,
  EMOJI_LIST,
  getRecentEmojis,
  saveRecentEmoji,
  searchEmojis,
  type EmojiItem,
} from '../data/emojis';

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Clock,
  Smile,
  ThumbsUp,
  Laptop,
  Sparkles,
  ArrowRight,
};

interface EmojiPickerViewProps {
  mode: 'compact' | 'full';
  searchQuery?: string;
  selectedCategory?: string;
  onSelectCategory?: (categoryId: string) => void;
  onPasteEmoji: (emoji: string) => void;
  showCategoryTabs?: boolean;
}

export const EmojiPickerView: React.FC<EmojiPickerViewProps> = ({
  mode,
  searchQuery = '',
  selectedCategory: propCategory,
  onSelectCategory: propOnSelectCategory,
  onPasteEmoji,
  showCategoryTabs = true,
}) => {
  const { t, i18n } = useTranslation();
  const isSpanish = (i18n.language || 'en').startsWith('es');

  const [internalCategory, setInternalCategory] = useState<string>('recent');
  const activeCategory = propCategory !== undefined ? propCategory : internalCategory;
  const setActiveCategory = useCallback(
    (cat: string) => {
      if (propOnSelectCategory) {
        propOnSelectCategory(cat);
      } else {
        setInternalCategory(cat);
      }
    },
    [propOnSelectCategory]
  );

  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [hoveredEmoji, setHoveredEmoji] = useState<EmojiItem | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Load recents on mount and listen to changes
  useEffect(() => {
    setRecentEmojis(getRecentEmojis());

    const handleRecentsChange = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      if (customEvent.detail) {
        setRecentEmojis(customEvent.detail);
      } else {
        setRecentEmojis(getRecentEmojis());
      }
    };

    window.addEventListener('cyberpaste-recent-emojis-changed', handleRecentsChange);
    return () => {
      window.removeEventListener('cyberpaste-recent-emojis-changed', handleRecentsChange);
    };
  }, []);

  // Reset internal category on view reset
  useEffect(() => {
    const handleReset = () => {
      setInternalCategory('recent');
    };
    window.addEventListener('cyberpaste-reset-view', handleReset);
    return () => window.removeEventListener('cyberpaste-reset-view', handleReset);
  }, []);

  // Compute displayed emojis
  const displayedEmojis = useMemo(() => {
    const query = searchQuery.trim();
    if (query) {
      return searchEmojis(query);
    }

    if (activeCategory === 'recent') {
      const recentsSet = new Set(recentEmojis);
      const matched = EMOJI_LIST.filter((item) => recentsSet.has(item.char));
      // Sort in order of recentEmojis array
      matched.sort((a, b) => recentEmojis.indexOf(a.char) - recentEmojis.indexOf(b.char));
      // If no recents recorded yet, return a starter selection
      if (matched.length === 0) {
        return EMOJI_LIST.slice(0, 24);
      }
      return matched;
    }

    return searchEmojis('', activeCategory);
  }, [searchQuery, activeCategory, recentEmojis]);

  // Reset keyboard selected index when list changes
  useEffect(() => {
    setSelectedIndex(0);
    setHoveredEmoji(displayedEmojis[0] || null);
  }, [displayedEmojis]);

  // Handle keyboard navigation inside emoji grid
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (displayedEmojis.length === 0) return;

      const cols = mode === 'full' ? 10 : 6;
      let nextIndex = selectedIndex;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextIndex = (selectedIndex + 1) % displayedEmojis.length;
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nextIndex = (selectedIndex - 1 + displayedEmojis.length) % displayedEmojis.length;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        nextIndex = Math.min(selectedIndex + cols, displayedEmojis.length - 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        nextIndex = Math.max(selectedIndex - cols, 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = displayedEmojis[selectedIndex];
        if (item) {
          handleSelectEmoji(item.char);
        }
        return;
      } else {
        return;
      }

      setSelectedIndex(nextIndex);
      setHoveredEmoji(displayedEmojis[nextIndex] || null);

      // Scroll into view
      const targetEl = gridContainerRef.current?.querySelector(`[data-emoji-index="${nextIndex}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    },
    [displayedEmojis, selectedIndex, mode, onPasteEmoji]
  );

  const handleSelectEmoji = useCallback(
    (char: string) => {
      const updated = saveRecentEmoji(char);
      setRecentEmojis(updated);
      onPasteEmoji(char);
    },
    [onPasteEmoji]
  );

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex h-full w-full flex-col overflow-hidden bg-background/50 focus:outline-none"
    >
      {/* Category Pills Bar (Horizontal) */}
      {showCategoryTabs && !searchQuery.trim() && (
        <div className="no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border/40 px-3 py-1.5 backdrop-blur-md">
          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICON_MAP[cat.icon] || Smile;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={clsx(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all',
                  isSelected
                    ? 'border border-primary/40 bg-primary/15 text-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)]'
                    : 'border border-transparent text-muted-foreground hover:border-border/60 hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon size={12} className={isSelected ? 'text-primary' : 'opacity-70'} />
                <span>{t(cat.labelKey)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Emoji Grid */}
      <div
        ref={gridContainerRef}
        className={clsx(
          'flex-1 overflow-y-auto overflow-x-hidden p-2',
          mode === 'full'
            ? 'grid grid-cols-7 sm:grid-cols-9 md:grid-cols-11 lg:grid-cols-13 gap-2 p-4'
            : 'grid grid-cols-6 gap-1 p-2'
        )}
      >
        {displayedEmojis.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
            <Search size={24} className="opacity-40" />
            <p className="text-xs font-medium">{t('emoji.noResults')}</p>
          </div>
        ) : (
          displayedEmojis.map((item, index) => {
            const isSelected = index === selectedIndex;
            const title = isSpanish ? item.nameEs : item.name;

            return (
              <button
                key={`${item.char}-${index}`}
                data-emoji-index={index}
                type="button"
                title={title}
                style={{ fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif' }}
                onClick={() => handleSelectEmoji(item.char)}
                onMouseEnter={() => {
                  setSelectedIndex(index);
                  setHoveredEmoji(item);
                }}
                className={clsx(
                  'group relative flex items-center justify-center rounded-xl transition-all duration-150 select-none active:scale-90',
                  mode === 'full'
                    ? 'h-12 w-12 text-2xl hover:scale-115'
                    : 'h-10 w-10 text-xl hover:scale-110',
                  isSelected
                    ? 'border border-primary/50 bg-primary/20 shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)] ring-1 ring-primary/40'
                    : 'border border-transparent hover:border-border/60 hover:bg-accent/60'
                )}
              >
                <span>{item.char}</span>
              </button>
            );
          })
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="flex shrink-0 items-center justify-between border-t border-border/40 bg-secondary/30 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur-md">
        <div className="flex items-center gap-2 truncate">
          {hoveredEmoji ? (
            <>
              <span className="text-base leading-none">{hoveredEmoji.char}</span>
              <span className="font-medium text-foreground truncate">
                {isSpanish ? hoveredEmoji.nameEs : hoveredEmoji.name}
              </span>
            </>
          ) : (
            <span className="opacity-70">{t('emoji.hint')}</span>
          )}
        </div>
        <span className="shrink-0 text-[10px] tabular-nums opacity-60">
          {displayedEmojis.length} emojis
        </span>
      </div>
    </div>
  );
};
