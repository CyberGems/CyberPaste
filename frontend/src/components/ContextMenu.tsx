import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  /** Overrides the tooltip when the disabled state needs to explain why. */
  tooltip?: string;
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

function isHeaderSelectable(action: ContextMenuHeaderAction | undefined): boolean {
  return !!action && !action.disabled;
}

function firstEnabledHeaderIndex(actions: ContextMenuHeaderAction[]): number {
  const i = actions.findIndex((a) => isHeaderSelectable(a));
  return i >= 0 ? i : 0;
}

function lastEnabledHeaderIndex(actions: ContextMenuHeaderAction[]): number {
  for (let i = actions.length - 1; i >= 0; i--) {
    if (isHeaderSelectable(actions[i])) return i;
  }
  return 0;
}

function nextEnabledHeaderIndex(
  actions: ContextMenuHeaderAction[],
  from: number,
  dir: 1 | -1
): number {
  if (actions.length === 0) return 0;
  let i = from;
  for (let n = 0; n < actions.length; n++) {
    i = (i + dir + actions.length) % actions.length;
    if (isHeaderSelectable(actions[i])) return i;
  }
  return from;
}

function isSelectable(o: ContextMenuOption | undefined): boolean {
  return !!o && !o.disabled && !o.divider;
}

function firstEnabledIndex(options: ContextMenuOption[]): number {
  const i = options.findIndex((o) => isSelectable(o));
  return i >= 0 ? i : 0;
}

function lastEnabledIndex(options: ContextMenuOption[]): number {
  for (let i = options.length - 1; i >= 0; i--) {
    if (isSelectable(options[i])) return i;
  }
  return 0;
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
  mouseActive = false,
}: {
  option: ContextMenuOption;
  onClose: () => void;
  subMenuPlacement?: 'side' | 'below';
  focused?: boolean;
  forceSubOpen?: boolean;
  subFocusedIndex?: number;
  onHover?: () => void;
  mouseActive?: boolean;
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
    if (!mouseActive) return;
    onHover?.();
    if (!hasSubMenu) return;
    openTimeoutRef.current = setTimeout(() => {
      setHoverOpen(true);
    }, SUBMENU_HOVER_DELAY);
  };

  const handleMouseMove = () => {
    if (!mouseActive) return;
    if (!focused) {
      onHover?.();
    }
    if (hasSubMenu && !isOpen && !openTimeoutRef.current) {
      openTimeoutRef.current = setTimeout(() => {
        setHoverOpen(true);
      }, SUBMENU_HOVER_DELAY);
    }
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
      onMouseMove={handleMouseMove}
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
            className={clsx(
              'custom-scrollbar fixed z-[250] max-h-[calc(100vh-16px)] min-w-[190px] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-popover/95 p-1 shadow-2xl backdrop-blur-md',
              !mouseActive && '[&_*]:pointer-events-none'
            )}
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
                  mouseActive={mouseActive}
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

  const hasSelectableHeaders = Boolean(
    headerActions && headerActions.length > 0 && headerActions.some(isHeaderSelectable)
  );

  const [focusSection, setFocusSection] = useState<'header' | 'options'>(
    hasSelectableHeaders ? 'header' : 'options'
  );
  const [headerIndex, setHeaderIndex] = useState<number>(() =>
    hasSelectableHeaders ? firstEnabledHeaderIndex(headerActions!) : -1
  );
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    hasSelectableHeaders ? -1 : firstEnabledIndex(options)
  );
  const [openSubIndex, setOpenSubIndex] = useState<number | null>(null);
  const [subActiveIndex, setSubActiveIndex] = useState(0);

  const focusSectionRef = useRef(focusSection);
  const headerIndexRef = useRef(headerIndex);
  const lastHeaderIndexRef = useRef(headerIndex >= 0 ? headerIndex : 0);
  const headerActionsRef = useRef(headerActions);
  const activeIndexRef = useRef(activeIndex);
  const openSubIndexRef = useRef(openSubIndex);
  const subActiveIndexRef = useRef(subActiveIndex);
  const optionsRef = useRef(options);
  const onCloseRef = useRef(onClose);
  const [mouseActive, setMouseActive] = useState(false);
  const mouseActiveRef = useRef(false);
  const initialPointerPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setMouseActive(false);
    mouseActiveRef.current = false;
    initialPointerPosRef.current = null;

    const onWindowMouseMove = (e: MouseEvent) => {
      if (!initialPointerPosRef.current) {
        initialPointerPosRef.current = { x: e.clientX, y: e.clientY };
        return;
      }
      const dx = Math.abs(e.clientX - initialPointerPosRef.current.x);
      const dy = Math.abs(e.clientY - initialPointerPosRef.current.y);
      if (dx > 3 || dy > 3) {
        mouseActiveRef.current = true;
        setMouseActive(true);
      }
    };

    window.addEventListener('mousemove', onWindowMouseMove, { capture: true, passive: true });
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove, true);
    };
  }, [x, y]);

  focusSectionRef.current = focusSection;
  headerIndexRef.current = headerIndex;
  if (headerIndex >= 0) {
    lastHeaderIndexRef.current = headerIndex;
  }
  headerActionsRef.current = headerActions;
  activeIndexRef.current = activeIndex;
  openSubIndexRef.current = openSubIndex;
  subActiveIndexRef.current = subActiveIndex;
  optionsRef.current = options;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (focusSection === 'header' && menuRef.current) {
      menuRef.current.scrollTop = 0;
    }
  }, [focusSection, headerIndex]);

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
    const isInsideMenu = (e: PointerEvent) => {
      const el = menuRef.current;
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const pad = 2;
      const insideMain =
        e.clientX >= rect.left - pad &&
        e.clientX <= rect.right + pad &&
        e.clientY >= rect.top - pad &&
        e.clientY <= rect.bottom + pad;
      if (insideMain) return true;

      const subEl = document.querySelector<HTMLElement>('[data-context-submenu="true"]');
      if (subEl) {
        const subRect = subEl.getBoundingClientRect();
        return (
          e.clientX >= subRect.left - pad &&
          e.clientX <= subRect.right + pad &&
          e.clientY >= subRect.top - pad &&
          e.clientY <= subRect.bottom + pad
        );
      }
      return false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (isInsideMenu(e)) {
        if (!mouseActiveRef.current) {
          mouseActiveRef.current = true;
          setMouseActive(true);
        }
        return;
      }
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
        'Tab',
      ];
      if (!navKeys.includes(e.key)) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const opts = optionsRef.current;
      const headers = headerActionsRef.current ?? [];
      const hasHeaders = headers.some(isHeaderSelectable);
      const hasOpts = opts.some(isSelectable);
      const close = onCloseRef.current;
      const subIdx = openSubIndexRef.current;
      const inSub = subIdx !== null && !!opts[subIdx]?.subMenu?.length;
      const subList = inSub ? opts[subIdx]!.subMenu! : [];
      const section = focusSectionRef.current;
      const currentOpt = activeIndexRef.current;
      const currentHeader = headerIndexRef.current;

      if (e.key === 'Escape') {
        if (inSub) {
          setOpenSubIndex(null);
          return;
        }
        close();
        return;
      }

      // ---------------- Submenu Navigation ----------------
      if (inSub) {
        if (e.key === 'ArrowDown') {
          setSubActiveIndex((prev) => nextEnabledIndex(subList, prev, 1));
          return;
        }
        if (e.key === 'ArrowUp') {
          setSubActiveIndex((prev) => nextEnabledIndex(subList, prev, -1));
          return;
        }
        if (e.key === 'Home') {
          setSubActiveIndex(firstEnabledIndex(subList));
          return;
        }
        if (e.key === 'End') {
          setSubActiveIndex(lastEnabledIndex(subList));
          return;
        }
        if (e.key === 'ArrowLeft') {
          setOpenSubIndex(null);
          return;
        }
        if (e.key === 'Tab') {
          const dir = e.shiftKey ? -1 : 1;
          setSubActiveIndex((prev) => nextEnabledIndex(subList, prev, dir));
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          activateOption(subList[subActiveIndexRef.current], close);
          return;
        }
        return;
      }

      // ---------------- Header Actions Navigation ----------------
      if (section === 'header') {
        if (e.key === 'ArrowRight') {
          const next = nextEnabledHeaderIndex(headers, currentHeader, 1);
          setHeaderIndex(next);
          return;
        }

        if (e.key === 'ArrowLeft') {
          const prev = nextEnabledHeaderIndex(headers, currentHeader, -1);
          setHeaderIndex(prev);
          return;
        }

        if (e.key === 'ArrowDown') {
          if (hasOpts) {
            setFocusSection('options');
            setActiveIndex(firstEnabledIndex(opts));
          }
          return;
        }

        if (e.key === 'ArrowUp') {
          if (hasOpts) {
            setFocusSection('options');
            setActiveIndex(lastEnabledIndex(opts));
          }
          return;
        }

        if (e.key === 'Home') {
          setHeaderIndex(firstEnabledHeaderIndex(headers));
          return;
        }

        if (e.key === 'End') {
          if (hasOpts) {
            setFocusSection('options');
            setActiveIndex(lastEnabledIndex(opts));
          } else {
            setHeaderIndex(lastEnabledHeaderIndex(headers));
          }
          return;
        }

        if (e.key === 'Tab') {
          if (e.shiftKey) {
            const firstH = firstEnabledHeaderIndex(headers);
            if (currentHeader === firstH) {
              if (hasOpts) {
                setFocusSection('options');
                setActiveIndex(lastEnabledIndex(opts));
              } else {
                setHeaderIndex(lastEnabledHeaderIndex(headers));
              }
            } else {
              setHeaderIndex(nextEnabledHeaderIndex(headers, currentHeader, -1));
            }
          } else {
            const lastH = lastEnabledHeaderIndex(headers);
            if (currentHeader === lastH) {
              if (hasOpts) {
                setFocusSection('options');
                setActiveIndex(firstEnabledIndex(opts));
              } else {
                setHeaderIndex(firstEnabledHeaderIndex(headers));
              }
            } else {
              setHeaderIndex(nextEnabledHeaderIndex(headers, currentHeader, 1));
            }
          }
          return;
        }

        if (e.key === 'Enter' || e.key === ' ') {
          const action = headers[currentHeader];
          if (action && !action.disabled) {
            action.onClick();
            dismissAllTooltips();
            close();
          }
          return;
        }

        return;
      }

      // ---------------- Options List Navigation ----------------
      if (section === 'options') {
        const firstOpt = firstEnabledIndex(opts);
        const lastOpt = lastEnabledIndex(opts);

        if (e.key === 'ArrowDown') {
          if (currentOpt === lastOpt && hasHeaders) {
            setFocusSection('header');
            const targetHeader =
              lastHeaderIndexRef.current >= 0
                ? lastHeaderIndexRef.current
                : firstEnabledHeaderIndex(headers);
            setHeaderIndex(targetHeader);
            setActiveIndex(-1);
            setOpenSubIndex(null);
          } else {
            const next = currentOpt < 0 ? firstOpt : nextEnabledIndex(opts, currentOpt, 1);
            setActiveIndex(next);
            setOpenSubIndex(null);
          }
          return;
        }

        if (e.key === 'ArrowUp') {
          if (currentOpt === firstOpt && hasHeaders) {
            setFocusSection('header');
            const targetHeader =
              lastHeaderIndexRef.current >= 0
                ? lastHeaderIndexRef.current
                : firstEnabledHeaderIndex(headers);
            setHeaderIndex(targetHeader);
            setActiveIndex(-1);
            setOpenSubIndex(null);
          } else {
            const prev = currentOpt < 0 ? lastOpt : nextEnabledIndex(opts, currentOpt, -1);
            setActiveIndex(prev);
            setOpenSubIndex(null);
          }
          return;
        }

        if (e.key === 'ArrowRight') {
          if (currentOpt < 0) return;
          const option = opts[currentOpt];
          if (option?.subMenu && option.subMenu.length > 0 && !option.disabled) {
            setOpenSubIndex(currentOpt);
            setSubActiveIndex(firstEnabledIndex(option.subMenu));
          }
          return;
        }

        if (e.key === 'ArrowLeft') {
          return;
        }

        if (e.key === 'Home') {
          if (hasHeaders) {
            setFocusSection('header');
            setHeaderIndex(firstEnabledHeaderIndex(headers));
            setActiveIndex(-1);
            setOpenSubIndex(null);
          } else {
            setActiveIndex(firstOpt);
            setOpenSubIndex(null);
          }
          return;
        }

        if (e.key === 'End') {
          setActiveIndex(lastOpt);
          setOpenSubIndex(null);
          return;
        }

        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (currentOpt === firstOpt && hasHeaders) {
              setFocusSection('header');
              setHeaderIndex(lastEnabledHeaderIndex(headers));
              setActiveIndex(-1);
            } else {
              setActiveIndex(nextEnabledIndex(opts, currentOpt, -1));
            }
          } else {
            if (currentOpt === lastOpt && hasHeaders) {
              setFocusSection('header');
              setHeaderIndex(firstEnabledHeaderIndex(headers));
              setActiveIndex(-1);
            } else {
              setActiveIndex(nextEnabledIndex(opts, currentOpt, 1));
            }
          }
          setOpenSubIndex(null);
          return;
        }

        if (e.key === 'Enter' || e.key === ' ') {
          if (currentOpt < 0) return;
          const option = opts[currentOpt];
          if (option?.subMenu && option.subMenu.length > 0 && !option.disabled) {
            setOpenSubIndex(currentOpt);
            setSubActiveIndex(firstEnabledIndex(option.subMenu));
            return;
          }
          activateOption(option, close);
          return;
        }
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
      onPointerDownCapture={() => {
        if (!mouseActiveRef.current) {
          mouseActiveRef.current = true;
          setMouseActive(true);
        }
      }}
      className={clsx(
        'custom-scrollbar [.has-header]:min-w-[300px] fixed z-[200] max-h-[calc(100vh-16px)] min-w-[200px] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-popover/95 p-1 shadow-2xl backdrop-blur-md',
        !mouseActive && '[&_*]:pointer-events-none'
      )}
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
        <div className="mb-1 flex min-w-[330px] items-stretch justify-between rounded-lg border border-border/40 bg-muted/25 p-1">
          {headerActions.map((action, hIndex) => {
            const tooltipLabel = action.disabled ? action.tooltip : undefined;
            const isFocused = focusSection === 'header' && headerIndex === hIndex;
            return (
              <Fragment key={action.id}>
                {hIndex > 0 && (
                  <div
                    className="my-1.5 w-px shrink-0 self-stretch bg-border/60"
                    aria-hidden="true"
                  />
                )}
                <Tooltip
                  label={tooltipLabel ?? ''}
                  disabled={!tooltipLabel}
                  placement="top"
                  delay={180}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={action.disabled && !action.tooltip}
                    onClick={() => {
                      if (action.disabled) return;
                      action.onClick();
                      dismissAllTooltips();
                      onClose();
                    }}
                    onMouseEnter={() => {
                      if (!mouseActive) return;
                      dismissAllTooltips();
                      setFocusSection('header');
                      setHeaderIndex(hIndex);
                      setActiveIndex(-1);
                      setOpenSubIndex(null);
                    }}
                    onMouseMove={() => {
                      if (!mouseActive) return;
                      if (
                        focusSectionRef.current !== 'header' ||
                        headerIndexRef.current !== hIndex
                      ) {
                        dismissAllTooltips();
                        setFocusSection('header');
                        setHeaderIndex(hIndex);
                        setActiveIndex(-1);
                        setOpenSubIndex(null);
                      }
                    }}
                    aria-label={action.label}
                    className={clsx(
                      'flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 transition-all duration-150',
                      action.disabled && !action.tooltip
                        ? 'pointer-events-none cursor-default text-muted-foreground opacity-25'
                        : action.disabled
                          ? 'cursor-default text-muted-foreground opacity-60 hover:bg-accent hover:text-foreground'
                          : action.danger
                            ? clsx(
                                'text-foreground/90 hover:bg-destructive/15 hover:text-destructive active:scale-95',
                                isFocused && 'bg-destructive/15 text-destructive'
                              )
                            : action.active
                              ? clsx(
                                  'bg-primary/20 text-primary hover:bg-primary/30 active:scale-95',
                                  isFocused && 'bg-primary/30'
                                )
                              : clsx(
                                  'text-foreground/90 hover:bg-accent hover:text-primary active:scale-95',
                                  isFocused && 'bg-accent text-primary'
                                )
                    )}
                  >
                    {action.icon}
                    <span className="w-full truncate text-center text-[13px] font-medium leading-snug">
                      {action.label}
                    </span>
                  </button>
                </Tooltip>
              </Fragment>
            );
          })}
        </div>
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
              focused={focusSection === 'options' && activeIndex === index}
              forceSubOpen={openSubIndex === index}
              subFocusedIndex={openSubIndex === index ? subActiveIndex : -1}
              mouseActive={mouseActive}
              onHover={() => {
                dismissAllTooltips();
                setFocusSection('options');
                setActiveIndex(index);
                setHeaderIndex(-1);
                if (!option.subMenu?.length) setOpenSubIndex(null);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
