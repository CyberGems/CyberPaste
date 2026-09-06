import { useEffect, useState } from 'react';

/** Ignore sensor jitter; require a real pointer move after keyboard navigation. */
const ARM_DISTANCE_PX = 8;
const EVENT = 'cyberpaste:list-hover-lock';

let locked = false;
let origin: { x: number; y: number } | null = null;
let listening = false;

function dispatch() {
  window.dispatchEvent(new CustomEvent<boolean>(EVENT, { detail: locked }));
}

function unlockListHover() {
  if (!locked) return;
  locked = false;
  origin = null;
  dispatch();
}

function ensureListeners() {
  if (listening || typeof window === 'undefined') return;
  listening = true;

  window.addEventListener(
    'mousemove',
    (e: MouseEvent) => {
      if (!locked) return;
      if (origin == null) {
        origin = { x: e.screenX, y: e.screenY };
        return;
      }
      const dist = Math.hypot(e.screenX - origin.x, e.screenY - origin.y);
      if (dist > ARM_DISTANCE_PX) {
        unlockListHover();
      }
    },
    { capture: true, passive: true }
  );

  // A click is an intentional pointer action even if the cursor barely moved.
  window.addEventListener(
    'mousedown',
    () => {
      if (locked) unlockListHover();
    },
    { capture: true }
  );
}

/** Freeze clip hover/peek so a still cursor cannot steal keyboard navigation. */
export function lockListHover() {
  ensureListeners();
  locked = true;
  origin = null;
  dispatch();
}

export function isListHoverLocked() {
  return locked;
}

export function subscribeListHoverLock(cb: (locked: boolean) => void) {
  ensureListeners();
  const handler = (e: Event) => cb((e as CustomEvent<boolean>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export function useListHoverLocked() {
  const [isLocked, setIsLocked] = useState(isListHoverLocked);
  useEffect(() => subscribeListHoverLock(setIsLocked), []);
  return isLocked;
}
