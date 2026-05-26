import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (newValue: string) => {
    onChange(newValue);
    setIsOpen(false);
  };

  return (
    <div className={twMerge('relative w-full', className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          'flex w-full items-center justify-between rounded-[4px] border border-white/[0.08] bg-[#1E1E1E] px-2.5 py-1.5 text-[12px] text-foreground transition-all duration-200 focus:outline-none focus:ring-0',
          disabled && 'cursor-not-allowed opacity-50',
          isOpen && 'border-white/20'
        )}
      >
        <span className={clsx(!selectedOption && 'text-muted-foreground')}>
          {selectedOption ? selectedOption.label : placeholder || 'Select...'}
        </span>
        <ChevronDown
          size={12}
          className={clsx(
            'ml-2 opacity-50 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="animate-in fade-in-0 zoom-in-95 absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#2D2D2D] text-popover-foreground shadow-lg duration-100">
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={clsx(
                  'relative flex w-full cursor-default select-none items-center py-1.5 pl-3 pr-8 text-[12px] outline-none transition-colors hover:bg-white/10 hover:text-white',
                  option.value === value && 'bg-white/[0.05] font-medium text-white'
                )}
              >
                <span className="truncate">{option.label}</span>
                {option.value === value && (
                  <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Check size={14} className="text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
