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

function ContextMenuItem({
  option,
  onClose,
  subMenuPlacement = 'side',
}: {
  option: ContextMenuOption;
  onClose: () => void;
  subMenuPlacement?: 'side' | 'below';
}) {
  const SUBMENU_HOVER_DELAY = 140;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [subPos, setSubPos] = useState<{ left?: string; right?: string; top?: string }>({ left: '100%' });

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

    // Horizontal overflow check
    if (parentRect.right + subRect.width > window.innerWidth - pad) {
      newLeft = undefined;
      newRight = '100%';
    }

    // Vertical overflow check
    if (parentRect.top + subRect.height > window.innerHeight - pad) {
      const offset = (parentRect.top + subRect.height) - (window.innerHeight - pad);
      newTop = `-${offset}px`;
    }

    setSubPos({ left: newLeft, right: newRight, top: newTop });
  }, [isOpen]);

  const hasSubMenu = !!(option.subMenu && option.subMenu.length > 0);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => {
        if (!hasSubMenu) return;
        if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
        openTimeoutRef.current = setTimeout(() => setIsOpen(true), SUBMENU_HOVER_DELAY);
      }}
      onMouseLeave={() => {
        if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
        setIsOpen(false);
      }}
    >
      <button
        type="button"
        role="menuitem"
        disabled={option.disabled}
        onClick={(e) => {
          if (hasSubMenu) {
            e.stopPropagation();
            return;
          }
          e.stopPropagation();
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
            ? 'text-foreground/90 hover:bg-red-500/10'
            : 'text-foreground/90 hover:bg-accent hover:text-primary'
        )}
      >
        {option.icon && (
          <span className={clsx(
            "mr-2 flex items-center justify-center transition-colors shrink-0",
            option.danger ? "text-red-500" : "text-muted-foreground group-hover:text-primary"
          )}>
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

  // Position before paint — mutate DOM directly to avoid a second React render.
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

  // Close on outside pointer / Escape without a full-screen overlay
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const el = menuRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        onClose();
      }
    };
    const onClick = (e: MouseEvent) => {
      const el = menuRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onBlur = () => onClose();

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('blur', onBlur);
    };
  }, [onClose]);

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
          />
        ))}
      </div>
    </div>
  );
}
