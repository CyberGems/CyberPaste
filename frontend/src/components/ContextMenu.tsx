import { useLayoutEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

interface ContextMenuOption {
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
  const [coords, setCoords] = useState({ x, y });

  useLayoutEffect(() => {
    if (!menuRef.current) return;

    const menuRect = menuRef.current.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let newX = x;
    let newY = y;

    // Flip horizontally if overflow
    if (x + menuRect.width > windowWidth) {
      newX = x - menuRect.width;
    }

    // Flip vertically if overflow
    if (y + menuRect.height > windowHeight) {
      newY = y - menuRect.height;
    }

    // Boundary check (never go off screen at all)
    newX = Math.max(5, Math.min(newX, windowWidth - menuRect.width - 5));
    newY = Math.max(5, Math.min(newY, windowHeight - menuRect.height - 5));

    setCoords({ x: newX, y: newY });
  }, [x, y]);

  return (
    <>
      <div
        className="fixed inset-0 z-[190] bg-transparent"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        ref={menuRef}
        className="animate-in fade-in zoom-in-95 fixed z-[200] min-w-[180px] overflow-hidden rounded-xl border border-white/10 bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl duration-150"
        style={{
          left: coords.x,
          top: coords.y,
          boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex flex-col gap-0.5">
          {options.map((option, index) => (
            <button
              key={index}
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
                'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-all duration-100',
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
    </>
  );
}
