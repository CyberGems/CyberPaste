import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { ChevronRight } from 'lucide-react';
import Tooltip, { dismissAllTooltips } from './Tooltip';

export interface ContextMenuHeaderAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
  active?: boolean;
}

export interface ContextMenuOption {
  label: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  subMenu?: ContextMenuOption[];
  icon?: React.ReactNode;
}

interface ContextMenuProps {
  x: number;
  y: number;
  headerActions?: ContextMenuHeaderAction[];
  options: ContextMenuOption[];
  onClose: () => void;
  subMenuPlacement?: 'side' | 'below';
  header?: {
    icon?: string | React.ReactNode;
    title?: string;
  };
}

function isSelectable(o: ContextMenuOption | undefined): boolean {
  return !!o && !o.disabled && !o.divider;
}

function firstEnabledIndex(options: ContextMenuOption[]): number {
  const i = options.findIndex((o) => isSelectable(o));
  return i >= 0 ? i : 0;
}

function nextEnabledIndex(options: ContextMenuOption[], from: number, dir: 1 | -1): number {
  if (options.length === 0) return 0;
  let i = from;
  for (let n = 0; n < options.length; n++) {
    i = (i + dir + options.length) % options.length;
    if (isSelectable(options[i])) return i;
  }
  return from;
}

function activateOption(option: ContextMenuOption | undefined, onClose: () => void) {
  if (!option || option.disabled || option.divider) return;
  if (option.subMenu && option.subMenu.length > 0) return;
  option.onClick?.();
  onClose();
}

function ContextMenuItem({
  option,
  onClose,
  subMenuPlacement = 'side',
  focused = false,
  forceSubOpen = false,
  subFocusedIndex = -1,
  onHover,
}: {
  option: ContextMenuOption;
  onClose: () => void;
  subMenuPlacement?: 'side' | 'below';
  focused?: boolean;
  forceSubOpen?: boolean;
  subFocusedIndex?: number;
  onHover?: () => void;
}) {
  const SUBMENU_HOVER_DELAY = 140;
  const [hoverOpen, setHoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [subCoords, setSubCoords] = useState<{ left: number; top: number; ready: boolean }>({
    left: 0,
    top: 0,
    ready: false,
  });

  const hasSubMenu = !!(option.subMenu && option.subMenu.length > 0);
  const isOpen = hoverOpen || forceSubOpen;

  const clearTimers = () => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  };

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !subMenuRef.current || !containerRef.current) {
      setSubCoords((prev) => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }
    const subEl = subMenuRef.current;
    const parentRect = containerRef.current.getBoundingClientRect();
    const subRect = subEl.getBoundingClientRect();
    const pad = 6;

    let left: number;
    if (subMenuPlacement === 'below') {
      left = parentRect.left;
      if (left + subRect.width > window.innerWidth - pad) {
        left = window.innerWidth - subRect.width - pad;
      }
      left = Math.max(pad, left);
      let top = parentRect.bottom + 2;
      if (top + subRect.height > window.innerHeight - pad) {
        top = parentRect.top - subRect.height - 2;
      }
      setSubCoords({ left, top, ready: true });
      return;
    }

    // Default 'side': check if fits to the right, otherwise flip to the left
    if (parentRect.right + subRect.width <= window.innerWidth - pad) {
      left = parentRect.right + 2;
    } else if (parentRect.left - subRect.width >= pad) {
      left = parentRect.left - subRect.width - 2;
    } else {
      left = Math.max(pad, window.innerWidth - subRect.width - pad);
    }

    let top = parentRect.top - 4;
    if (top + subRect.height > window.innerHeight - pad) {
      top = window.innerHeight - subRect.height - pad;
    }
    top = Math.max(pad, top);

    setSubCoords({ left, top, ready: true });
  }, [isOpen, subMenuPlacement]);

  useEffect(() => {
    if (focused && containerRef.current) {
      containerRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [focused]);

  // When scrolling the parent context menu, close hover-opened submenus to prevent floating detaches
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => {
      if (hoverOpen) setHoverOpen(false);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen, hoverOpen]);

  const handleMouseEnter = () => {
    clearTimers();
    onHover?.();
    if (!hasSubMenu) return;
    openTimeoutRef.current = setTimeout(() => {
      setHoverOpen(true);
    }, SUBMENU_HOVER_DELAY);
  };

  const handleMouseLeave = () => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setHoverOpen(false);
    }, 200);
  };

  const handleSubMouseEnter = () => {
    clearTimers();
    setHoverOpen(true);
  };

  const handleSubMouseLeave = () => {
    clearTimers();
    closeTimeoutRef.current = setTimeout(() => {
      setHoverOpen(false);
    }, 150);
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        role="menuitem"
        disabled={option.disabled}
        aria-expanded={hasSubMenu ? isOpen : undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (hasSubMenu) {
            clearTimers();
            setHoverOpen((prev) => !prev);
            return;
          }
          if (!option.disabled && option.onClick) {
            option.onClick();
            onClose();
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (hasSubMenu) {
            clearTimers();
            setHoverOpen(true);
            return;
          }
          if (!option.disabled && option.onClick) {
            option.onClick();
            onClose();
          }
        }}
        className={clsx(
          'group flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors',
          option.disabled ? 'pointer-events-none opacity-40' : '',
          option.danger
            ? clsx('text-foreground/90 hover:bg-red-500/10', focused && 'bg-red-500/10')
            : clsx(
                'text-foreground/90 hover:bg-accent hover:text-primary',
                focused && 'bg-accent text-primary'
              )
        )}
      >
        {option.icon && (
          <span
            className={clsx(
              'mr-2 flex shrink-0 items-center justify-center transition-colors',
              option.danger
                ? 'text-red-500'
                : clsx('text-muted-foreground group-hover:text-primary', focused && 'text-primary')
            )}
          >
            {option.icon}
          </span>
        )}
        <span className="flex-1 text-left">{option.label}</span>
        {hasSubMenu && <ChevronRight size={14} className="ml-2 opacity-60" />}
      </button>

      {hasSubMenu &&
        isOpen &&
        createPortal(
          <div
            ref={subMenuRef}
            data-context-submenu="true"
            onMouseEnter={handleSubMouseEnter}
            onMouseLeave={handleSubMouseLeave}
            className="custom-scrollbar fixed z-[250] max-h-[calc(100vh-16px)] min-w-[190px] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-popover/95 p-1 shadow-2xl backdrop-blur-md"
            style={{
              left: `${subCoords.left}px`,
              top: `${subCoords.top}px`,
              visibility: subCoords.ready ? 'visible' : 'hidden',
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
            }}
            role="menu"
          >
            <div className="flex flex-col gap-0.5">
              {option.subMenu!.map((subOpt, index) => (
                <ContextMenuItem
                  key={index}
                  option={subOpt}
                  onClose={onClose}
                  subMenuPlacement={subMenuPlacement}
                  focused={forceSubOpen && subFocusedIndex === index}
                />
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export function ContextMenu({
  x,
  y,
  headerActions,
  options,
  onClose,
  subMenuPlacement = 'side',
  header,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [openSubIndex, setOpenSubIndex] = useState<number | null>(null);
  const [subActiveIndex, setSubActiveIndex] = useState(0);
  const activeIndexRef = useRef(activeIndex);
  const openSubIndexRef = useRef(openSubIndex);
  const subActiveIndexRef = useRef(subActiveIndex);
  const optionsRef = useRef(options);
  const onCloseRef = useRef(onClose);
  activeIndexRef.current = activeIndex;
  openSubIndexRef.current = openSubIndex;
  subActiveIndexRef.current = subActiveIndex;
  optionsRef.current = options;
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    dismissAllTooltips();
  }, [openSubIndex]);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    const { width, height } = el.getBoundingClientRect();
    const pad = 8;
    let left = x;
    let top = y;

    if (left + width > window.innerWidth - pad) left = x - width;
    if (top + height > window.innerHeight - pad) {
      if (y - height >= pad) {
        top = y - height;
      } else {
        top = window.innerHeight - height - pad;
      }
    }

    left = Math.max(pad, Math.min(left, window.innerWidth - width - pad));
    top = Math.max(pad, Math.min(top, window.innerHeight - height - pad));

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.visibility = 'visible';
  }, [x, y, options.length, headerActions]);

  useEffect(() => {
    const isInsideMenu = (target: EventTarget | null) => {
      const el = menuRef.current;
      if (!target || !(target instanceof Element)) return false;
      return !!(
        (el && el.contains(target)) ||
        target.closest('[data-context-menu]') ||
        target.closest('[data-context-submenu]')
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      if (isInsideMenu(e.target)) return;
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
      onCloseRef.current();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const navKeys = [
        'Escape',
        'ArrowDown',
        'ArrowUp',
        'ArrowLeft',
        'ArrowRight',
        'Enter',
        ' ',
        'Home',
        'End',
      ];
      if (!navKeys.includes(e.key)) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const opts = optionsRef.current;
      const close = onCloseRef.current;
      const subIdx = openSubIndexRef.current;
      const inSub = subIdx !== null && !!opts[subIdx]?.subMenu?.length;
      const list = inSub ? opts[subIdx]!.subMenu! : opts;
      const current = inSub ? subActiveIndexRef.current : activeIndexRef.current;

      if (e.key === 'Escape') {
        if (inSub) {
          setOpenSubIndex(null);
          return;
        }
        close();
        return;
      }

      if (e.key === 'ArrowDown') {
        const next =
          !inSub && current < 0 ? firstEnabledIndex(list) : nextEnabledIndex(list, current, 1);
        if (inSub) setSubActiveIndex(next);
        else {
          setActiveIndex(next);
          setOpenSubIndex(null);
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        const next =
          !inSub && current < 0
            ? nextEnabledIndex(list, firstEnabledIndex(list), -1)
            : nextEnabledIndex(list, current, -1);
        if (inSub) setSubActiveIndex(next);
        else {
          setActiveIndex(next);
          setOpenSubIndex(null);
        }
        return;
      }

      if (e.key === 'Home') {
        const next = firstEnabledIndex(list);
        if (inSub) setSubActiveIndex(next);
        else {
          setActiveIndex(next);
          setOpenSubIndex(null);
        }
        return;
      }

      if (e.key === 'End') {
        const next = nextEnabledIndex(list, firstEnabledIndex(list), -1);
        if (inSub) setSubActiveIndex(next);
        else {
          setActiveIndex(next);
          setOpenSubIndex(null);
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        if (inSub || activeIndexRef.current < 0) return;
        const option = opts[activeIndexRef.current];
        if (option?.subMenu && option.subMenu.length > 0 && !option.disabled) {
          setOpenSubIndex(activeIndexRef.current);
          setSubActiveIndex(firstEnabledIndex(option.subMenu));
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (inSub) setOpenSubIndex(null);
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        if (inSub) {
          activateOption(list[current], close);
          return;
        }
        if (activeIndexRef.current < 0) return;
        const option = opts[activeIndexRef.current];
        if (option?.subMenu && option.subMenu.length > 0 && !option.disabled) {
          setOpenSubIndex(activeIndexRef.current);
          setSubActiveIndex(firstEnabledIndex(option.subMenu));
          return;
        }
        activateOption(option, close);
      }
    };

    const onBlur = () => onCloseRef.current();

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return (
    <div
      ref={menuRef}
      data-context-menu="true"
      className="custom-scrollbar fixed z-[200] max-h-[calc(100vh-16px)] min-w-[200px] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-popover/95 p-1 shadow-2xl backdrop-blur-md"
      style={{
        left: x,
        top: y,
        visibility: 'hidden',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.25)',
      }}
      role="menu"
    >
      {header && (
        <div className="flex select-none items-center justify-center gap-2 px-3 py-2 text-center">
          {typeof header.icon === 'string' ? (
            <img src={header.icon} alt="" className="h-4 w-4 shrink-0 object-contain" />
          ) : (
            header.icon
          )}
          <span className="font-mono text-xs font-semibold tracking-tight text-muted-foreground/80">
            {header.title || 'CyberPaste'}
          </span>
        </div>
      )}
      {header && <div className="mx-1.5 my-1 h-px bg-border/60" />}

      {headerActions && headerActions.length > 0 && (
        <>
          <div className="mb-1 flex items-center justify-between gap-1 rounded-lg border border-border/40 bg-muted/25 p-1">
            {headerActions.map((action) => {
              const tooltipLabel = action.shortcut
                ? `${action.label} (${action.shortcut})`
                : action.label;
              return (
                <Tooltip key={action.id} label={tooltipLabel} placement="top" delay={180}>
                  <button
                    type="button"
                    disabled={action.disabled}
                    onClick={() => {
                      action.onClick();
                      dismissAllTooltips();
                      onClose();
                    }}
                    aria-label={action.label}
                    className={clsx(
                      'flex h-8 min-w-[32px] flex-1 items-center justify-center rounded-md transition-all duration-150',
                      action.disabled
                        ? 'pointer-events-none cursor-default text-muted-foreground opacity-25'
                        : action.danger
                          ? 'text-muted-foreground hover:bg-destructive/15 hover:text-destructive active:scale-95'
                          : action.active
                            ? 'bg-primary/20 text-primary hover:bg-primary/30 active:scale-95'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground active:scale-95'
                    )}
                  >
                    {action.icon}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </>
      )}

      <div className="flex flex-col gap-0.5">
        {options.map((option, index) => {
          if (option.divider) {
            return (
              <div
                key={`divider-${index}`}
                className="mx-1.5 my-1 h-px bg-border/40"
                role="separator"
              />
            );
          }
          return (
            <ContextMenuItem
              key={index}
              option={option}
              onClose={onClose}
              subMenuPlacement={subMenuPlacement}
              focused={activeIndex === index}
              forceSubOpen={openSubIndex === index}
              subFocusedIndex={openSubIndex === index ? subActiveIndex : -1}
              onHover={() => {
                dismissAllTooltips();
                setActiveIndex(index);
                if (!option.subMenu?.length) setOpenSubIndex(null);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
