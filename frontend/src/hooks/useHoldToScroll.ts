import { useCallback, useEffect, useRef } from 'react';

export interface UseHoldToScrollOptions {
  /** The scrollable element to scroll */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Direction to scroll */
  direction: 'left' | 'right';
  /** Whether the scroll action is currently disabled (e.g. at the boundary) */
  disabled?: boolean;
  /** Scrolling speed in pixels per second during continuous hold (default: 600) */
  speed?: number;
  /** Milliseconds to wait before continuous hold scrolling starts (default: 260) */
  holdDelay?: number;
  /** Distance in pixels for a single click/step, or a function returning it */
  stepDistance?: number | (() => number);
  /** Callback to notify when scrolling occurred (e.g. to update canScrollLeft/Right) */
  onScrollChanged?: () => void;
}

export function useHoldToScroll({
  containerRef,
  direction,
  disabled = false,
  speed = 600,
  holdDelay = 260,
  stepDistance,
  onScrollChanged,
}: UseHoldToScrollOptions) {
  const isHoldingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTimeRef = useRef<number>(0);
  const pointerHandledRef = useRef<boolean>(false);
  const activePointerIdRef = useRef<number | null>(null);
  const targetElementRef = useRef<HTMLElement | null>(null);

  const getStepDistance = useCallback(() => {
    if (typeof stepDistance === 'function') {
      return stepDistance();
    }
    if (typeof stepDistance === 'number') {
      return stepDistance;
    }
    const container = containerRef.current;
    return Math.max((container?.clientWidth || 300) * 0.65, 140);
  }, [containerRef, stepDistance]);

  const stepScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || disabled) return;
    const distance = getStepDistance();
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
    onScrollChanged?.();
  }, [containerRef, direction, disabled, getStepDistance, onScrollChanged]);

  const stopHolding = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    isHoldingRef.current = false;

    if (targetElementRef.current && activePointerIdRef.current !== null) {
      try {
        if (targetElementRef.current.hasPointerCapture(activePointerIdRef.current)) {
          targetElementRef.current.releasePointerCapture(activePointerIdRef.current);
        }
      } catch {
        // Pointer capture may have already been released
      }
      activePointerIdRef.current = null;
      targetElementRef.current = null;
    }

    onScrollChanged?.();
  }, [onScrollChanged]);

  const scrollLoop = useCallback(
    (timestamp: number) => {
      if (!isHoldingRef.current) return;
      const el = containerRef.current;
      if (!el) {
        stopHolding();
        return;
      }

      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      const delta = speed * dt;
      if (direction === 'left') {
        const next = Math.max(0, el.scrollLeft - delta);
        el.scrollLeft = next;
        if (next <= 2) {
          el.scrollLeft = 0;
          stopHolding();
          return;
        }
      } else {
        const maxScroll = el.scrollWidth - el.clientWidth;
        const next = Math.min(maxScroll, el.scrollLeft + delta);
        el.scrollLeft = next;
        if (next >= maxScroll - 2) {
          el.scrollLeft = maxScroll;
          stopHolding();
          return;
        }
      }

      rafIdRef.current = requestAnimationFrame(scrollLoop);
    },
    [containerRef, direction, speed, stopHolding]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || disabled) return;

      pointerHandledRef.current = true;
      isHoldingRef.current = true;
      targetElementRef.current = e.currentTarget;
      activePointerIdRef.current = e.pointerId;

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Safe to ignore if pointer capture is not supported
      }

      stepScroll();

      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      holdTimerRef.current = setTimeout(() => {
        if (!isHoldingRef.current) return;
        lastTimeRef.current = performance.now();
        rafIdRef.current = requestAnimationFrame(scrollLoop);
      }, holdDelay);
    },
    [disabled, holdDelay, scrollLoop, stepScroll]
  );

  const handlePointerUp = useCallback(() => {
    stopHolding();
  }, [stopHolding]);

  const handlePointerCancel = useCallback(() => {
    stopHolding();
  }, [stopHolding]);

  const handleLostPointerCapture = useCallback(() => {
    stopHolding();
  }, [stopHolding]);

  const handleClick = useCallback(() => {
    if (pointerHandledRef.current) {
      pointerHandledRef.current = false;
      return;
    }
    // Keyboard activation (Enter / Space)
    stepScroll();
  }, [stepScroll]);

  // If the button becomes disabled during hold, stop immediately
  useEffect(() => {
    if (disabled && isHoldingRef.current) {
      stopHolding();
    }
  }, [disabled, stopHolding]);

  // Global safety listeners in case pointer release happens outside or window blurs
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (isHoldingRef.current) {
        stopHolding();
      }
    };
    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    window.addEventListener('blur', handleGlobalRelease);
    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
      window.removeEventListener('blur', handleGlobalRelease);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, [stopHolding]);

  return {
    stepScroll,
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    onLostPointerCapture: handleLostPointerCapture,
    onClick: handleClick,
  };
}
