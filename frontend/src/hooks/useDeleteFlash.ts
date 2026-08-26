import { useEffect, useState } from 'react';

const DEFAULT_DELETE_MS = 320;
const deletingUntil = new Map<string, number>();
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

/** Trigger inline deletion feedback for one or more clip IDs. */
export function triggerDeleteFlash(
  clipIdOrIds: string | string[],
  durationMs: number = DEFAULT_DELETE_MS
) {
  const ids = Array.isArray(clipIdOrIds) ? clipIdOrIds : [clipIdOrIds];
  const expireAt = Date.now() + durationMs;
  ids.forEach((id) => deletingUntil.set(id, expireAt));
  notify();
  window.setTimeout(() => {
    let changed = false;
    ids.forEach((id) => {
      const until = deletingUntil.get(id);
      if (until && until <= Date.now()) {
        deletingUntil.delete(id);
        changed = true;
      }
    });
    if (changed) notify();
  }, durationMs + 16);
}

/** Cancel inline deletion feedback if an error occurs. */
export function cancelDeleteFlash(clipIdOrIds: string | string[]) {
  const ids = Array.isArray(clipIdOrIds) ? clipIdOrIds : [clipIdOrIds];
  let changed = false;
  ids.forEach((id) => {
    if (deletingUntil.delete(id)) changed = true;
  });
  if (changed) notify();
}

/** Hook to check if a clip is currently in the inline deleting animation state. */
export function useDeleteFlash(clipId: string): boolean {
  const [, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    subscribers.add(bump);
    return () => {
      subscribers.delete(bump);
    };
  }, []);

  const until = deletingUntil.get(clipId) ?? 0;
  return until > Date.now();
}
