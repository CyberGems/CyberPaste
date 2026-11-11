import { useEffect, useState } from 'react';

/**
 * Cycles an index through `length` entries every `intervalMs` while `active`.
 * The index holds still while inactive and wraps via modulo, so consumers can
 * keep rendering `items[index % length]`. Resets to 0 whenever `resetKey`
 * changes, e.g. when the compact footer switches to its emoji hint set.
 */
export function useRotatingIndex(
  length: number,
  intervalMs: number,
  active: boolean,
  resetKey?: unknown
): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [resetKey]);

  useEffect(() => {
    if (!active || length === 0) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % length), intervalMs);
    return () => clearInterval(timer);
  }, [active, length, intervalMs]);

  return index;
}
