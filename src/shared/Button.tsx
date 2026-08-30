import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** React 19 takes ref as an ordinary prop — no forwardRef needed. */
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold ' +
  'transition-colors select-none disabled:opacity-40 disabled:pointer-events-none ' +
  'whitespace-nowrap';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:brightness-110 active:brightness-95 shadow-sm',
  secondary:
    'bg-surface text-ink border border-line hover:bg-hover hover:border-line-strong shadow-sm',
  ghost: 'text-muted hover:text-ink hover:bg-hover',
  danger: 'bg-danger text-white hover:brightness-110 active:brightness-95 shadow-sm',
};

/*
 * Touch first: 32px controls are well under the ~44px a finger needs, and the
 * toolbars were entirely 32px. These start finger-sized and tighten up from
 * the small breakpoint, where there is a pointer.
 */
const sizes: Record<Size, string> = {
  sm: 'h-11 px-4 text-sm sm:h-8 sm:px-3 sm:text-[13px]',
  md: 'h-11 px-4 text-sm sm:h-10',
  lg: 'h-12 px-6 text-base w-full',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({ label, className = '', children, ...rest }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex size-11 items-center justify-center rounded-full text-muted sm:size-9
        transition-colors hover:bg-hover hover:text-ink
        disabled:opacity-30 disabled:pointer-events-none ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
