import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronRight } from 'lucide-react';

export interface ContextMenuOption {
  label: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  subMenu?: ContextMenuOption[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  options: ContextMenuOption[];
  onClose: () => void;
}

function ContextMenuItem({ option, onClose }: { option: ContextMenuOption; onClose: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);
  const [subPos, setSubPos] = useState<{ left?: string; right?: string; top?: string }>({ left: '100%' });

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
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
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
          'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
          option.disabled ? 'pointer-events-none opacity-40' : '',
          option.danger
            ? 'text-red-500 hover:bg-red-500/10'
            : 'text-foreground/90 hover:bg-white/10 hover:text-primary'
        )}
      >
        <span className="flex-1 text-left">{option.label}</span>
        {hasSubMenu && <ChevronRight size={14} className="ml-2 opacity-60" />}
      </button>

      {hasSubMenu && isOpen && (
        <div
          ref={subMenuRef}
          className="absolute z-[210] min-w-[180px] rounded-xl border border-white/10 bg-zinc-900/95 p-1.5 shadow-2xl"
          style={{
            left: subPos.left,
            right: subPos.right,
            top: subPos.top,
            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
          }}
          role="menu"
        >
          <div className="flex flex-col gap-0.5">
            {option.subMenu!.map((subOpt, index) => (
              <ContextMenuItem key={index} option={subOpt} onClose={onClose} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ContextMenu({ x, y, options, onClose }: ContextMenuProps) {
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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onBlur = () => onClose();

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('blur', onBlur);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] min-w-[180px] rounded-xl border border-white/10 bg-zinc-900/95 p-1.5 shadow-2xl"
      style={{
        left: x,
        top: y,
        visibility: 'hidden',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
      }}
      role="menu"
    >
      <div className="flex flex-col gap-0.5">
        {options.map((option, index) => (
          <ContextMenuItem key={index} option={option} onClose={onClose} />
        ))}
      </div>
    </div>
  );
}
