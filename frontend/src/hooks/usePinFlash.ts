import { useEffect, useState } from 'react';

const FLASH_MS = 550;
const flashingUntil = new Map<string, number>();
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

/** Trigger a short pin flash that survives list virtualization remounts. */
export function triggerPinFlash(clipId: string) {
  flashingUntil.set(clipId, Date.now() + FLASH_MS);
  notify();
  window.setTimeout(() => {
    const until = flashingUntil.get(clipId);
    if (until && until <= Date.now()) {
      flashingUntil.delete(clipId);
      notify();
    }
  }, FLASH_MS + 16);
}

export function usePinFlash(clipId: string): boolean {
  const [, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    subscribers.add(bump);
    return () => {
      subscribers.delete(bump);
    };
  }, []);

  const until = flashingUntil.get(clipId) ?? 0;
  return until > Date.now();
}
