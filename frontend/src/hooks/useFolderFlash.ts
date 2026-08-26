import { useEffect, useState } from 'react';

const FLASH_MS = 650;
const flashingUntil = new Map<string, number>();
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

/** Normalize folder id (null or 'null' => 'clipboard') */
function normalizeKey(folderId: string | null | undefined): string {
  if (
    folderId === null ||
    folderId === undefined ||
    folderId === 'null' ||
    folderId === 'clipboard'
  ) {
    return 'clipboard';
  }
  return folderId;
}

/** Trigger a double-flash on a folder button/tab that survives re-renders. */
export function triggerFolderFlash(folderId: string | null | undefined) {
  const key = normalizeKey(folderId);
  flashingUntil.set(key, Date.now() + FLASH_MS);
  notify();
  window.setTimeout(() => {
    const until = flashingUntil.get(key);
    if (until && until <= Date.now()) {
      flashingUntil.delete(key);
      notify();
    }
  }, FLASH_MS + 16);
}

export function useFolderFlash(folderId: string | null | undefined): boolean {
  const [, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    subscribers.add(bump);
    return () => {
      subscribers.delete(bump);
    };
  }, []);

  const key = normalizeKey(folderId);
  const until = flashingUntil.get(key) ?? 0;
  return until > Date.now();
}
