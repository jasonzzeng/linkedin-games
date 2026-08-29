import { ChevronDown } from 'lucide-react';

interface SelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  label: string;
  disabled?: boolean;
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  disabled,
}: SelectProps<T>) {
  return (
    <div className="relative inline-flex">
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-9 appearance-none rounded-full border border-line bg-surface
          pl-3.5 pr-8 text-[13px] font-semibold text-ink shadow-sm transition-colors
          hover:border-line-strong disabled:opacity-40 cursor-pointer"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint"
      />
    </div>
  );
}
