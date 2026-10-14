import React, { useRef, useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface MarqueeHintProps {
  text: string;
  className?: string;
  animKey?: string | number;
}

/**
 * Footer hint component that centers text when it fits within the available footer space,
 * but automatically applies optimal margins and a smooth marquee scroll animation when overflowing.
 */
export const MarqueeHint: React.FC<MarqueeHintProps> = ({ text, className, animKey }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowDistance, setOverflowDistance] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const cWidth = containerRef.current.clientWidth;
        const sWidth = textRef.current.scrollWidth;
        if (sWidth > cWidth + 2) {
          setOverflowDistance(sWidth - cWidth);
        } else {
          setOverflowDistance(0);
        }
      }
    };

    checkOverflow();
    const ro = new ResizeObserver(checkOverflow);
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    return () => ro.disconnect();
  }, [text]);

  const isOverflowing = overflowDistance > 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative mx-3 flex min-w-0 flex-1 items-center overflow-hidden',
        isOverflowing ? 'marquee-mask justify-start' : 'justify-center',
        className
      )}
    >
      <span
        key={animKey}
        ref={textRef}
        className={cn(
          'inline-block whitespace-nowrap text-[10px] font-medium tabular-nums text-muted-foreground/90 transition-transform'
        )}
        style={
          isOverflowing
            ? ({
                '--overflow-dist': `-${overflowDistance + 12}px`,
                animation: `marquee-ping-pong ${Math.max(5, Math.min(10, 3.5 + overflowDistance / 20))}s ease-in-out infinite alternate`,
              } as React.CSSProperties)
            : { animation: 'compact-hint-fade 0.8s ease-out' }
        }
      >
        {text}
      </span>
    </div>
  );
};
