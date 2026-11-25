import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject, WheelEvent } from 'react';

interface UseSmoothWheelScrollOptions {
  containerRef: RefObject<HTMLElement | null>;
  axis?: 'x' | 'y';
  speed?: number;
  enabled?: boolean;
}

const HOVER_SETTLE_MS = 360;

export function useSmoothWheelScroll({
  containerRef,
  axis = 'x',
  speed = 1,
  enabled = true,
}: UseSmoothWheelScrollOptions) {
  const targetRef = useRef<number | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollingRef = useRef(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const reset = useCallback(() => {
    targetRef.current = null;
    scrollingRef.current = false;
    setIsScrolling(false);
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const scheduleSettle = useCallback(() => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      scrollingRef.current = false;
      settleTimerRef.current = null;
      setIsScrolling(false);
    }, HOVER_SETTLE_MS);
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent<Element>) => {
      const element = containerRef.current;
      if (!element || !enabled || event.deltaY === 0) return;

      event.preventDefault();
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? axis === 'x'
              ? element.clientWidth
              : element.clientHeight
            : 1;
      const delta = event.deltaY * unit * speed;
      const current = axis === 'x' ? element.scrollLeft : element.scrollTop;
      const max =
        axis === 'x'
          ? element.scrollWidth - element.clientWidth
          : element.scrollHeight - element.clientHeight;
      const previousTarget = targetRef.current ?? current;
      const nextTarget = Math.max(0, Math.min(max, previousTarget + delta));

      if (Math.abs(nextTarget - previousTarget) < 0.01) return;

      targetRef.current = nextTarget;
      if (axis === 'x') {
        element.scrollTo({ left: nextTarget, behavior: 'smooth' });
      } else {
        element.scrollTo({ top: nextTarget, behavior: 'smooth' });
      }

      if (!scrollingRef.current) {
        scrollingRef.current = true;
        setIsScrolling(true);
      }
      scheduleSettle();
    },
    [axis, containerRef, enabled, scheduleSettle, speed]
  );

  useEffect(() => {
    const element = containerRef.current;
    const handleScroll = () => {
      if (scrollingRef.current) scheduleSettle();
    };
    const handlePointerDown = () => reset();

    element?.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      element?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [containerRef, reset, scheduleSettle]);

  useEffect(() => {
    reset();
  }, [axis, enabled, reset]);

  useEffect(
    () => () => {
      targetRef.current = null;
      scrollingRef.current = false;
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    },
    []
  );

  return { handleWheel, isScrolling, reset };
}
