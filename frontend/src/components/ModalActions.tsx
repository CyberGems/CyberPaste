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

export function useModalKeys({
  enabled,
  onEsc,
  onEnter,
}: {
  enabled: boolean;
  onEsc?: () => void;
  onEnter?: () => void;
}) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEsc?.();
        return;
      }

      if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
      if ((event.target as HTMLElement | null)?.tagName === 'BUTTON') return;
      if ((event.target as HTMLElement | null)?.tagName === 'TEXTAREA') return;

      event.preventDefault();
      onEnter?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onEnter, onEsc]);
}
