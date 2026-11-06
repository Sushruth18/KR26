import { Link, type LinkProps } from 'react-router-dom';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'maroon' | 'ghost' | 'whatsapp';

interface Common {
  variant?: Variant;
  loading?: boolean;
  className?: string;
  children: ReactNode;
}

type ButtonProps = Common & ButtonHTMLAttributes<HTMLButtonElement>;
type LinkButtonProps = Common & Omit<LinkProps, 'className' | 'children'> & { disabled?: boolean };

// Full literal class names so Tailwind's content scan keeps them (dynamic `btn-${v}` gets purged).
const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'btn btn-primary',
  maroon: 'btn btn-maroon',
  ghost: 'btn btn-ghost',
  whatsapp: 'btn btn-whatsapp',
};
const cls = (variant: Variant, extra?: string) => `${VARIANT_CLASS[variant]}${extra ? ` ${extra}` : ''}`;

export function Button({ variant = 'primary', loading = false, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      type={rest.type ?? 'button'}
      className={cls(variant, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function LinkButton({ variant = 'primary', loading = false, className, children, disabled, ...rest }: LinkButtonProps) {
  return (
    <Link
      {...rest}
      className={cls(variant, className)}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      onClick={(e) => {
        if (disabled) e.preventDefault();
        rest.onClick?.(e);
      }}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </Link>
  );
}

/** A button-looking link to another site (opens in a new tab: pass target/rel yourself, with rel="noopener noreferrer"). */
export function AnchorButton({
  variant = 'primary',
  className,
  children,
  ...rest
}: { variant?: Variant; className?: string; children: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'>) {
  return (
    <a {...rest} className={cls(variant, className)}>
      {children}
    </a>
  );
}
