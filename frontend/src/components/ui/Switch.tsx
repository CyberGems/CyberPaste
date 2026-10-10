import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
  ariaLabel?: string;
  title?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked = false,
  onChange,
  onCheckedChange,
  disabled = false,
  className,
  id,
  'aria-label': ariaLabelProp,
  ariaLabel,
  title,
}) => {
  const isChecked = Boolean(checked);
  const handleToggle = () => {
    if (disabled) return;
    const next = !isChecked;
    onChange?.(next);
    onCheckedChange?.(next);
  };
  const label = ariaLabel ?? ariaLabelProp;

  return (
    <button
      type="button"
      role="switch"
      id={id}
      title={title}
      aria-checked={isChecked}
      aria-label={label}
      disabled={disabled}
      onClick={handleToggle}
      className={twMerge(
        clsx(
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          disabled && 'cursor-not-allowed opacity-50',
          isChecked
            ? 'border-primary bg-primary shadow-[0_0_12px_rgba(var(--primary-rgb),0.4)]'
            : 'border-white/20 bg-white/10 hover:border-white/30 hover:bg-white/15'
        ),
        className
      )}
    >
      <div
        className={clsx(
          'flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-all duration-200',
          isChecked ? 'translate-x-[23px] text-[#0F141C]' : 'translate-x-[3px] text-transparent'
        )}
      >
        <svg
          className={clsx(
            'h-2.5 w-2.5 transition-all duration-150',
            isChecked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          )}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3.2 8.35 6.45 11.45 12.8 4.7" />
        </svg>
      </div>
    </button>
  );
};
