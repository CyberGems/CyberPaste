import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronRight } from 'lucide-react';

export interface ContextMenuOption {
  label: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  subMenu?: ContextMenuOption[];
  icon?: React.ReactNode;
}

interface ContextMenuProps {
  x: number;
  y: number;
  options: ContextMenuOption[];
  onClose: () => void;
  subMenuPlacement?: 'side' | 'below';
  header?: {
    icon?: string | React.ReactNode;
    title?: string;
  };
}

function firstEnabledIndex(options: ContextMenuOption[]): number {
  const i = options.findIndex((o) => !o.disabled);
  return i >= 0 ? i : 0;
}

function nextEnabledIndex(options: ContextMenuOption[], from: number, dir: 1 | -1): number {
  if (options.length === 0) return 0;
  let i = from;
  for (let n = 0; n < options.length; n++) {
    i = (i + dir + options.length) % options.length;
    if (!options[i]?.disabled) return i;
  }
  return from;
}

function activateOption(option: ContextMenuOption | undefined, onClose: () => void) {
  if (!option || option.disabled) return;
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
  const [subPos, setSubPos] = useState<{ left?: string; right?: string; top?: string }>({
    left: '100%',
  });

  const hasSubMenu = !!(option.subMenu && option.subMenu.length > 0);
  const isOpen = hoverOpen || forceSubOpen;

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !subMenuRef.current || !containerRef.current) return;
    const subEl = subMenuRef.current;
    const parentRect = containerRef.current.getBoundingClientRect();
    const subRect = subEl.getBoundingClientRect();
    const pad = 5;

    let newLeft: string | undefined = '100%';
    let newRight: string | undefined = undefined;
    let newTop: string | undefined = '0px';

    if (parentRect.right + subRect.width > window.innerWidth - pad) {
      newLeft = undefined;
      newRight = '100%';
    }

    if (parentRect.top + subRect.height > window.innerHeight - pad) {
      const offset = parentRect.top + subRect.height - (window.innerHeight - pad);
      newTop = `-${offset}px`;
    }

    setSubPos({ left: newLeft, right: newRight, top: newTop });
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => {
        onHover?.();
        if (!hasSubMenu) return;
        if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
        openTimeoutRef.current = setTimeout(() => setHoverOpen(true), SUBMENU_HOVER_DELAY);
      }}
      onMouseLeave={() => {
        if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
        setHoverOpen(false);
      }}
    >
      <button
        type="button"
        role="menuitem"
        disabled={option.disabled}
        aria-expanded={hasSubMenu ? isOpen : undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (hasSubMenu) return;
          if (!option.disabled && option.onClick) {
            option.onClick();
            onClose();
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (hasSubMenu) return;
          if (!option.disabled && option.onClick) {
            option.onClick();
            onClose();
          }
        }}
        className={clsx(
          'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors group',
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

      {hasSubMenu && isOpen && (
        <div
          ref={subMenuRef}
          className="absolute z-[210] min-w-[180px] rounded-xl border border-border bg-popover/95 p-1.5 shadow-2xl backdrop-blur-md"
          style={
            subMenuPlacement === 'below'
              ? {
                  left: 0,
                  top: '100%',
                  boxShadow: '0 10px 30px -10px rgba(0,0,0,0.25)',
                }
              : {
                  left: subPos.left,
                  right: subPos.right,
                  top: subPos.top,
                  boxShadow: '0 10px 30px -10px rgba(0,0,0,0.25)',
                }
          }
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
        </div>
      )}
    </div>
  );
}

export function ContextMenu({
  x,
  y,
  options,
  onClose,
  subMenuPlacement = 'side',
  header,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(() => firstEnabledIndex(options));
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
    const el = menuRef.current;
    if (!el) return;

    const { width, height } = el.getBoundingClientRect();
    const pad = 5;
    let left = x;
    let top = y;

    if (left + width > window.innerWidth - pad) left = x - width;
    if (top + height > window.innerHeight - pad) top = y - height;

    left = Math.max(pad, Math.min(left, window.innerWidth - width - pad));
    top = Math.max(pad, Math.min(top, window.innerHeight - height - pad));

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.visibility = 'visible';
  }, [x, y, options.length]);

  useEffect(() => {
    const isInsideMenu = (target: EventTarget | null) => {
      const el = menuRef.current;
      return !!(el && target && el.contains(target as Node));
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
        const next = nextEnabledIndex(list, current, 1);
        if (inSub) setSubActiveIndex(next);
        else {
          setActiveIndex(next);
          setOpenSubIndex(null);
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        const next = nextEnabledIndex(list, current, -1);
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
        if (inSub) return;
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
      className="fixed z-[200] min-w-[180px] rounded-xl border border-border bg-popover/95 p-1.5 shadow-2xl backdrop-blur-md"
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

      <div className="flex flex-col gap-0.5">
        {options.map((option, index) => (
          <ContextMenuItem
            key={index}
            option={option}
            onClose={onClose}
            subMenuPlacement={subMenuPlacement}
            focused={activeIndex === index}
            forceSubOpen={openSubIndex === index}
            subFocusedIndex={openSubIndex === index ? subActiveIndex : -1}
            onHover={() => {
              setActiveIndex(index);
              if (!option.subMenu?.length) setOpenSubIndex(null);
            }}
          />
        ))}
      </div>
    </div>
  );
}
