import { useEffect, useLayoutEffect, useRef } from 'react';
import { clsx } from 'clsx';

export interface ContextMenuOption {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  options: ContextMenuOption[];
  onClose: () => void;
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
  // (overlay steals hover from the clip and makes the menu feel laggy).
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
      className="fixed z-[200] min-w-[180px] overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 p-1.5 shadow-2xl"
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
          <button
            key={index}
            type="button"
            role="menuitem"
            disabled={option.disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (!option.disabled) {
                option.onClick();
                onClose();
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!option.disabled) {
                option.onClick();
                onClose();
              }
            }}
            className={clsx(
              'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium',
              option.disabled ? 'pointer-events-none opacity-40' : '',
              option.danger
                ? 'text-red-500 hover:bg-red-500/10'
                : 'text-foreground/90 hover:bg-white/10 hover:text-primary'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
