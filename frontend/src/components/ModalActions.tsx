import { useEffect } from 'react';

export function EnterGlyph() {
  return (
    <svg
      className="h-3.5 w-3.5 flex-none opacity-85"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 10.5 L7 5.2 L4.8 9 L14.6 9 L14.6 2.5 L17.4 2.5 L17.4 9 A2.8 2.8 0 0 1 14.6 11.8 L4.8 11.8 L7 15.8 Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function EscGlyph() {
  return (
    <span className="rounded-[4px] border border-current px-1.5 py-px text-[10px] font-bold leading-tight tracking-wide opacity-85">
      Esc
    </span>
  );
}

export function SpaceGlyph({ label = 'Space' }: { label?: string }) {
  return (
    <span className="min-w-[2.75rem] rounded-[4px] border border-current px-1.5 py-px text-center text-[10px] font-bold leading-tight tracking-wide opacity-85">
      {label}
    </span>
  );
}

export function useModalKeys({
  enabled,
  onEsc,
  onEnter,
  onSpace,
}: {
  enabled: boolean;
  onEsc?: () => void;
  onEnter?: () => void;
  onSpace?: () => void;
}) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isButton = target?.tagName === 'BUTTON';

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        onEsc?.();
        return;
      }

      if (onEnter && event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        if (isButton) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        onEnter?.();
        return;
      }

      if (
        onSpace &&
        (event.key === ' ' || event.code === 'Space') &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isButton &&
        target?.tagName !== 'INPUT' &&
        target?.tagName !== 'TEXTAREA' &&
        target?.tagName !== 'SELECT'
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        onSpace();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, onEnter, onEsc, onSpace]);
}
