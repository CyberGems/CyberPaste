import { useCallback, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';

/** Ignore sensor jitter; require a real pointer move after the window appears. */
const ARM_DISTANCE_PX = 8;

/**
 * Peek must not fire just because the window opened under the cursor.
 * Stay disarmed until the pointer actually moves on screen, and reset on each show/hide.
 * Screen coordinates are used so a show animation under a still cursor does not count.
 */
export function usePeekPointerArm(closePeek: () => void) {
  const armedRef = useRef(false);
  const originRef = useRef<{ x: number; y: number } | null>(null);

  const notePointer = useCallback((screenX: number, screenY: number) => {
    if (!armedRef.current && originRef.current == null) {
      originRef.current = { x: screenX, y: screenY };
    }
  }, []);

  useEffect(() => {
    const disarm = () => {
      armedRef.current = false;
      originRef.current = null;
      closePeek();
    };

    const onMove = (e: MouseEvent) => {
      if (armedRef.current) return;
      if (originRef.current == null) {
        originRef.current = { x: e.screenX, y: e.screenY };
        return;
      }
      const dist = Math.hypot(e.screenX - originRef.current.x, e.screenY - originRef.current.y);
      if (dist > ARM_DISTANCE_PX) {
        armedRef.current = true;
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    const unlisten = listen<boolean>('window-visibility', () => {
      disarm();
    });

    return () => {
      window.removeEventListener('mousemove', onMove);
      unlisten.then((u) => {
        if (typeof u === 'function') u();
      });
    };
  }, [closePeek]);

  return { armedRef, notePointer };
}
