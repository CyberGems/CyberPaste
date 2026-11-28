import { githubStarLabels } from '../useGitHubStar';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MoreHorizontal,
  Heart,
  Star,
  Gem,
  Tag,
  Github,
  Info,
  Power,
  Book,
  Trash2,
  Settings,
  RotateCcw,
  FolderPlus,
  Undo2,
  Trophy,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { openUrl } from '@tauri-apps/plugin-opener';
import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { clsx } from 'clsx';
import {
  TITLEBAR_BTN_IDLE,
  TITLEBAR_BTN_ON_PRIMARY_STRONG,
  TITLEBAR_ICON_BUTTON,
} from './ui/titlebarButtons';
import Tooltip, { dismissAllTooltips } from './Tooltip';
import { ConfirmDialog } from './ConfirmDialog';
import { toast } from '../utils/toast';

const DONATE_URL = 'https://github.com/CyberGems/CyberPaste#%EF%B8%8F-donate';
const WIKI_URL = 'https://github.com/CyberGems/CyberPaste/wiki';
const WEBSITE_URL = 'https://cybergems.org';
const CHANGELOG_URL = 'https://github.com/CyberGems/CyberPaste/releases';
const GITHUB_URL = 'https://github.com/CyberGems/CyberPaste';
export const TITLE_BAR_MENU_TOGGLE_EVENT = 'cyberpaste:toggle-titlebar-menu';
export const TITLE_BAR_MENU_OPEN_EVENT = 'cyberpaste:titlebar-menu-open';

export type TitleBarMenuVariant = 'main' | 'settings' | 'viewer';

export function TitleBarMenu({
  iconSize = 14,
  variant = 'main',
  hotkey,
  onResetSize,
  onAddFolder,
  onUndo,
  canUndo = false,
}: {
  iconSize?: number;
  variant?: TitleBarMenuVariant;
  hotkey?: string;
  onResetSize?: () => void | Promise<void>;
  onAddFolder?: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [menuPointerActive, setMenuPointerActive] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0, maxHeight: 800 });
  const [helpPos, setHelpPos] = useState({ top: 0, left: 0, maxHeight: 800 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const helpTriggerRef = useRef<HTMLButtonElement>(null);
  const helpMenuRef = useRef<HTMLDivElement>(null);
  const helpId = useId();
  const helpMenuId = `${helpId}-menu`;

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;
    const updatePosition = () => {
      const anchor = wrapRef.current;
      const menu = menuRef.current;
      if (!anchor) return;

      const anchorRect = anchor.getBoundingClientRect();
      const gap = 6;
      const viewportMargin = 8;
      const naturalHeight = menu?.scrollHeight ?? 0;
      const spaceBelow = Math.max(0, window.innerHeight - anchorRect.bottom - gap - viewportMargin);
      const spaceAbove = Math.max(0, anchorRect.top - gap - viewportMargin);
      const opensAbove = naturalHeight > spaceBelow && spaceAbove > spaceBelow;
      const availableHeight = Math.max(120, opensAbove ? spaceAbove : spaceBelow);
      const effectiveHeight =
        naturalHeight > 0 ? Math.min(naturalHeight, availableHeight) : availableHeight;
      const top = opensAbove ? anchorRect.top - gap - effectiveHeight : anchorRect.bottom + gap;

      setPos({
        top,
        right: Math.max(8, window.innerWidth - anchorRect.right),
        maxHeight: availableHeight,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !helpOpen || !helpTriggerRef.current || !helpMenuRef.current) return;
    const updateHelpPosition = () => {
      const triggerRect = helpTriggerRef.current?.getBoundingClientRect();
      const menuRect = helpMenuRef.current?.getBoundingClientRect();
      if (!triggerRect || !menuRect) return;

      const padding = 6;
      const gap = 4;
      const width = menuRect.width || 224;
      const height = menuRect.height || 160;
      let left = triggerRect.right + gap;
      if (left + width > window.innerWidth - padding) {
        left = triggerRect.left - width - gap;
      }
      left = Math.max(padding, Math.min(left, window.innerWidth - width - padding));

      let top = triggerRect.top - 5;
      if (top + height > window.innerHeight - padding) {
        top = window.innerHeight - height - padding;
      }
      top = Math.max(padding, Math.min(top, window.innerHeight - height - padding));

      setHelpPos({ top, left, maxHeight: window.innerHeight - padding * 2 });
    };

    updateHelpPosition();
    window.addEventListener('resize', updateHelpPosition);
    return () => window.removeEventListener('resize', updateHelpPosition);
  }, [helpOpen, open]);

  useEffect(() => {
    const onToggleMenu = () => setOpen((value) => !value);
    window.addEventListener(TITLE_BAR_MENU_TOGGLE_EVENT, onToggleMenu);
    return () => window.removeEventListener(TITLE_BAR_MENU_TOGGLE_EVENT, onToggleMenu);
  }, []);

  useEffect(() => {
    setMenuPointerActive(false);
    setHelpOpen(false);
    if (!open) {
      if (document.body.dataset.titlebarMenuOpen === 'true') {
        delete document.body.dataset.titlebarMenuOpen;
      }
      return;
    }

    dismissAllTooltips();
    document.body.dataset.titlebarMenuOpen = 'true';
    window.dispatchEvent(new Event(TITLE_BAR_MENU_OPEN_EVENT));
    const frame = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<boolean>('window-visibility', (event) => {
      if (!event.payload) {
        setOpen(false);
      }
    })
      .then((cleanup) => {
        unlisten = cleanup;
      })
      .catch((error) => {
        console.error('Failed to listen for window visibility:', error);
      });
    return () => {
      unlisten?.();
      if (document.body.dataset.titlebarMenuOpen === 'true') {
        delete document.body.dataset.titlebarMenuOpen;
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const isInside = (target: EventTarget | null) => {
      if (!target || !(target instanceof Node)) return false;
      return !!(
        wrapRef.current?.contains(target) ||
        menuRef.current?.contains(target) ||
        helpMenuRef.current?.contains(target)
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      if (isInside(e.target)) return;
      if (e.button === 0) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const eatClick = (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation();
        };
        window.addEventListener('click', eatClick, true);
        const pointerId = e.pointerId;
        const onUp = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          window.removeEventListener('pointerup', onUp, true);
          window.setTimeout(() => window.removeEventListener('click', eatClick, true), 0);
        };
        window.addEventListener('pointerup', onUp, true);
      }
      setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (helpOpen) {
          setHelpOpen(false);
          helpTriggerRef.current?.focus();
          return;
        }
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [helpOpen, open]);

  const closeAnd = (fn: () => void) => {
    setHelpOpen(false);
    setOpen(false);
    fn();
  };

  const confirmClearHistory = () => {
    setOpen(false);
    setConfirmClear(true);
  };

  const handleClearHistory = async () => {
    setConfirmClear(false);
    try {
      await invoke('clear_all_clips');
      await emit('clipboard-change');
      toast.success(t('settings.clearHistorySuccess'));
    } catch (error) {
      console.error('Failed to clear history:', error);
      toast.error(t('settings.failedToClearHistory', { error }));
    }
  };

  const handleResetWindowSize = () => {
    if (onResetSize) {
      void onResetSize();
      return;
    }
    invoke('reset_window_size').catch(console.error);
  };

  const showHelp = (focusFirstItem: boolean) => {
    setHelpOpen(true);
    if (focusFirstItem) {
      requestAnimationFrame(() => {
        helpMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
      });
    }
  };

  const itemClass = clsx(
    'group flex w-full items-center gap-2.5 rounded-md px-2.5 py-[5px] text-left text-[13px] font-medium text-foreground/90 transition-colors focus:outline-none focus-visible:bg-accent focus-visible:text-foreground focus-visible:ring-1 focus-visible:ring-primary/50',
    menuPointerActive && 'hover:bg-accent hover:text-foreground'
  );
  const iconClass = clsx(
    'shrink-0 text-muted-foreground transition-colors',
    menuPointerActive && 'group-hover:text-primary'
  );
  const moreLabel = hotkey
    ? t('common.tooltipWithHotkey', { label: t('common.moreActions'), hotkey })
    : t('common.moreActions');

  const showClearHistory = variant === 'main';
  const showOpenSettings = variant === 'viewer';
  const hasMiddleItems = Boolean(onAddFolder || variant === 'main' || showOpenSettings);

  return (
    <div ref={wrapRef} className="no-drag relative flex items-center">
      <Tooltip label={moreLabel} placement="bottom" disabled={open}>
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={open}
          aria-label={moreLabel}
          aria-keyshortcuts={hotkey}
          onClick={() => {
            dismissAllTooltips();
            setOpen((v) => !v);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            dismissAllTooltips();
          }}
          className={clsx(
            TITLEBAR_ICON_BUTTON,
            'h-8 w-8 rounded-lg',
            open ? TITLEBAR_BTN_ON_PRIMARY_STRONG : TITLEBAR_BTN_IDLE
          )}
        >
          <MoreHorizontal size={iconSize} className="pointer-events-none" />
        </button>
      </Tooltip>

      {open &&
        createPortal(
          <>
            <div
              ref={menuRef}
              role="menu"
              onPointerMove={() => setMenuPointerActive(true)}
              onPointerOver={(event) => {
                if (!(event.target as Element).closest('[data-titlebar-help]')) setHelpOpen(false);
              }}
              onFocusCapture={(event) => {
                if (!(event.target as Element).closest('[data-titlebar-help]')) setHelpOpen(false);
              }}
              onScroll={() => setHelpOpen(false)}
              onKeyDown={(event) => {
                if (
                  event.key === 'ArrowRight' &&
                  document.activeElement === helpTriggerRef.current
                ) {
                  event.preventDefault();
                  event.stopPropagation();
                  showHelp(true);
                  return;
                }

                const items = Array.from(
                  menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
                );
                if (items.length === 0) return;

                if (event.key === 'Escape') {
                  event.preventDefault();
                  if (!helpOpen) setOpen(false);
                  return;
                }

                if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                event.stopPropagation();
                const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
                const nextIndex =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? items.length - 1
                      : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) %
                        items.length;
                items[nextIndex]?.focus();
              }}
              className="custom-scrollbar fixed z-[300] flex max-h-[calc(100vh-16px)] w-56 flex-col gap-0.5 overflow-y-auto rounded-lg border border-border bg-popover p-[5px] shadow-[0_10px_30px_rgba(0,0,0,0.5),0_1px_3px_rgba(0,0,0,0.3)]"
              style={{
                top: pos.top,
                right: pos.right,
                maxHeight: pos.maxHeight,
                animation: 'titlebarMenuFade 0.12s ease-out',
              }}
            >
              <style>{`
              @keyframes titlebarMenuFade {
                from { opacity: 0; transform: translateY(-4px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
              <button
                type="button"
                role="menuitem"
                className={itemClass}
                onClick={() =>
                  closeAnd(() => {
                    openUrl(DONATE_URL).catch(console.error);
                  })
                }
              >
                <Heart
                  size={14}
                  className="shrink-0 text-[#00D8F1] group-hover:drop-shadow-[0_0_4px_rgba(0,216,241,0.6)]"
                />
                <span>{t('common.donate')}</span>
              </button>

              {hasMiddleItems && (
                <div role="separator" className="mx-2 my-1 h-px shrink-0 bg-foreground/15" />
              )}

              {onAddFolder && (
                <button
                  type="button"
                  role="menuitem"
                  className={itemClass}
                  onClick={() => closeAnd(onAddFolder)}
                >
                  <FolderPlus size={14} className={iconClass} />
                  <span>{t('folders.newFolder')}</span>
                </button>
              )}

              {variant === 'main' && (
                <button
                  type="button"
                  role="menuitem"
                  disabled={!canUndo}
                  className={clsx(
                    itemClass,
                    !canUndo &&
                      'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-foreground/90'
                  )}
                  onClick={() => {
                    if (!canUndo || !onUndo) return;
                    closeAnd(onUndo);
                  }}
                >
                  <Undo2 size={14} className={iconClass} />
                  <span className="flex-1">{t('contextMenu.undo')}</span>
                  <span className="text-[11px] text-muted-foreground/70">Ctrl+Z</span>
                </button>
              )}

              {showClearHistory && (
                <button
                  type="button"
                  role="menuitem"
                  className={itemClass}
                  onClick={() => closeAnd(handleResetWindowSize)}
                >
                  <RotateCcw size={14} className={iconClass} />
                  <span>{t('common.resetWindowSize')}</span>
                </button>
              )}

              {showClearHistory && (
                <button
                  type="button"
                  role="menuitem"
                  className={itemClass}
                  onClick={confirmClearHistory}
                >
                  <Trash2 size={14} className="shrink-0 text-destructive" />
                  <span>{t('settings.clearHistory')}</span>
                </button>
              )}

              {showOpenSettings && (
                <button
                  type="button"
                  role="menuitem"
                  className={itemClass}
                  onClick={() =>
                    closeAnd(() => {
                      invoke('open_settings').catch(console.error);
                    })
                  }
                >
                  <Settings size={14} className={iconClass} />
                  <span>{t('common.settings')}</span>
                </button>
              )}

              <div role="separator" className="mx-2 my-1 h-px shrink-0 bg-foreground/15" />

              <button
                ref={helpTriggerRef}
                id={`${helpId}-trigger`}
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={helpOpen}
                aria-controls={helpOpen ? helpMenuId : undefined}
                data-titlebar-help
                className={itemClass}
                onPointerEnter={() => showHelp(false)}
                onClick={(event) => showHelp(event.detail === 0)}
              >
                <HelpCircle size={14} className={iconClass} />
                <span className="flex-1">{t('common.help')}</span>
                <ChevronRight
                  size={14}
                  className={clsx('shrink-0 transition-transform', helpOpen && 'rotate-90')}
                />
              </button>

              {variant === 'main' && (
                <>
                  <div role="separator" className="mx-2 my-1 h-px shrink-0 bg-foreground/15" />
                  <button
                    type="button"
                    role="menuitem"
                    className={itemClass}
                    onClick={() =>
                      closeAnd(async () => {
                        try {
                          await invoke('hide_window', { skipLock: true });
                        } catch {}
                        try {
                          await invoke('open_settings', { tab: 'achievements' });
                        } catch (e) {
                          console.error('Failed to open achievements:', e);
                        }
                      })
                    }
                  >
                    <Trophy
                      size={14}
                      className="shrink-0 text-amber-400 group-hover:drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]"
                    />
                    <span>
                      {t('titleBar.moreMenu.achievements', { defaultValue: 'Logros...' })}
                    </span>
                  </button>
                </>
              )}

              <div role="separator" className="mx-2 my-1 h-px shrink-0 bg-foreground/15" />

              <button
                type="button"
                role="menuitem"
                className={itemClass}
                onClick={() =>
                  closeAnd(() => {
                    invoke('handle_close_choice', { action: 'quit', remember: false }).catch(
                      console.error
                    );
                  })
                }
              >
                <Power size={14} className="shrink-0 text-rose-400" />
                <span>{t('titleBar.moreMenu.exit')}</span>
              </button>
            </div>

            {helpOpen && (
              <div
                ref={helpMenuRef}
                id={helpMenuId}
                role="menu"
                aria-labelledby={`${helpId}-trigger`}
                data-titlebar-help
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    event.stopPropagation();
                    setHelpOpen(false);
                    helpTriggerRef.current?.focus();
                    return;
                  }

                  const items = Array.from(
                    helpMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ??
                      []
                  );
                  if (items.length === 0) return;
                  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  event.stopPropagation();
                  const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
                  const nextIndex =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? items.length - 1
                        : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) %
                          items.length;
                  items[nextIndex]?.focus();
                }}
                className="custom-scrollbar fixed z-[310] flex max-h-[calc(100vh-16px)] w-56 flex-col gap-0.5 overflow-y-auto rounded-lg border border-border bg-popover p-[5px] shadow-[0_10px_30px_rgba(0,0,0,0.5),0_1px_3px_rgba(0,0,0,0.3)]"
                style={{
                  top: helpPos.top,
                  left: helpPos.left,
                  maxHeight: helpPos.maxHeight,
                  animation: 'titlebarMenuFade 0.12s ease-out',
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  className={itemClass}
                  onClick={() =>
                    closeAnd(() => {
                      invoke('star_repository').catch(console.error);
                    })
                  }
                >
                  <Star size={14} className={iconClass} />
                  <span>{githubStarLabels[i18n.language.startsWith('es') ? 'es' : 'en'].idle}</span>
                </button>
                <div role="separator" className="my-1 border-t border-border" />
                <button
                  type="button"
                  role="menuitem"
                  className={itemClass}
                  onClick={() =>
                    closeAnd(() => {
                      openUrl(WIKI_URL).catch(console.error);
                    })
                  }
                >
                  <Book size={14} className={iconClass} />
                  <span>{t('titleBar.moreMenu.docs')}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={itemClass}
                  onClick={() =>
                    closeAnd(() => {
                      openUrl(WEBSITE_URL).catch(console.error);
                    })
                  }
                >
                  <Gem size={14} className={iconClass} />
                  <span>{t('titleBar.moreMenu.website')}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={itemClass}
                  onClick={() =>
                    closeAnd(() => {
                      openUrl(CHANGELOG_URL).catch(console.error);
                    })
                  }
                >
                  <Tag size={14} className={iconClass} />
                  <span>{t('titleBar.moreMenu.changelog')}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={itemClass}
                  onClick={() =>
                    closeAnd(() => {
                      openUrl(GITHUB_URL).catch(console.error);
                    })
                  }
                >
                  <Github size={14} className={iconClass} />
                  <span>{t('titleBar.moreMenu.github')}</span>
                </button>
                <div role="separator" className="mx-2 my-1 h-px shrink-0 bg-foreground/15" />
                <button
                  type="button"
                  role="menuitem"
                  className={itemClass}
                  onClick={() =>
                    closeAnd(() => {
                      invoke('open_about').catch(console.error);
                    })
                  }
                >
                  <Info size={14} className={iconClass} />
                  <span>{t('titleBar.moreMenu.about')}</span>
                </button>
              </div>
            )}
          </>,
          document.body
        )}

      {showClearHistory &&
        confirmClear &&
        createPortal(
          <div className="relative z-[400]">
            <ConfirmDialog
              isOpen={confirmClear}
              title={t('settings.clearHistoryTitle')}
              message={t('settings.clearHistoryMessage')}
              confirmText={t('settings.clearHistory')}
              cancelText={t('common.cancel')}
              onConfirm={() => {
                void handleClearHistory();
              }}
              onCancel={() => setConfirmClear(false)}
              variant="danger"
            />
          </div>,
          document.body
        )}
    </div>
  );
}
