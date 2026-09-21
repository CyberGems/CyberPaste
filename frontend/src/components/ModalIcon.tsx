import type { ReactNode } from 'react';
import { clsx } from 'clsx';

interface ModalIconProps {
  children: ReactNode;
  className?: string;
}

export function ModalIcon({ children, className }: ModalIconProps) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/[0.08] text-primary shadow-[0_0_16px_rgba(var(--primary-rgb),0.14)]',
        className
      )}
    >
      <span className="absolute inset-[2px] rounded-full border border-primary/15" />
      <span className="relative flex items-center justify-center">{children}</span>
    </span>
  );
}
